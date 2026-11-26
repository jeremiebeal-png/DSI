/**
 * Worker DSI Hotel — Création de boîtes Microsoft 365 depuis le portail (provisioning)
 *
 * Le technicien ouvre un ticket « Arrivée collaborateur » validé par le RH / la direction,
 * choisit la licence, et le Worker crée le compte dans le tenant Microsoft 365 de l'hôtel
 * via Microsoft Graph (app multi-tenant « DSI Hotel Provisioning », consentie dans chaque tenant).
 *
 * Depuis nov. 2026 : la carte « Création des accès » du portail enchaîne compte AD (Oscar, dsi-hotel-agent)
 * et boîte Microsoft 365 sur un seul « Oui ». Le mot de passe provisoire est alors généré par dsi-hotel-agent
 * et transmis ici (motDePasse) pour être identique sur Windows et la messagerie. La licence choisie est retenue
 * par hôtel (provisioning_memo, clé « licence ») et proposée la fois suivante.
 *
 * Routes (POST, réservées aux administrateurs du portail) :
 *   POST /provisioning/infos     { ticketId }            → données du formulaire, licences, domaines, groupes, contrôles,
 *                                                          OU synchronisées par Entra Connect (ousSynchro)
 *   POST /provisioning/verifier  { ticketId, adresse }   → l'adresse est-elle libre dans le tenant ?
 *   POST /provisioning/creer     { ticketId, local, domaine, prenom, nom, nomAffiche, poste, service,
 *                                  skuId, groupes: [id], telMfa, motDePasse? }   → crée le compte (session MFA exigée)
 *
 * VARIABLES CLOUDFLARE (Settings → Variables and Secrets) :
 *   - SUPABASE_URL               (Texte)  https://vkamubvlbezhpbunvdai.supabase.co
 *   - SUPABASE_SERVICE_ROLE_KEY  (Secret) clé service Supabase (sb_secret_… ou eyJ…)
 *   - PROV_CLIENT_ID             (Texte)  ID d'application de « DSI Hotel Provisioning »
 *   - PROV_CLIENT_SECRET         (Secret) secret client de cette app
 *
 * PERMISSIONS GRAPH (type Application, sur l'app « DSI Hotel Provisioning ») :
 *   User.ReadWrite.All, LicenseAssignment.ReadWrite.All, Organization.Read.All,
 *   GroupMember.ReadWrite.All, UserAuthenticationMethod.ReadWrite.All
 *
 * Limites (Graph) : les listes de distribution, groupes de sécurité à extension messagerie et
 * boîtes partagées se gèrent dans Exchange : ils sont signalés « à faire manuellement ».
 */

const ALLOWED_ORIGINS = ["https://jeremiebeal-png.github.io", "https://portail.dsihotel.com"];
const GRAPH = "https://graph.microsoft.com/v1.0";
let CURRENT_ORIGIN = ALLOWED_ORIGINS[0];

// ---------------------------------------------------------------------------
// Utilitaires HTTP / Supabase
// ---------------------------------------------------------------------------
function corsHeaders() {
  const allowed = ALLOWED_ORIGINS.includes(CURRENT_ORIGIN) ? CURRENT_ORIGIN : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders() } });
}
function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    ...(String(env.SUPABASE_SERVICE_ROLE_KEY || "").startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }),
  };
}
function sbJson(env) { return { ...sbHeaders(env), "Content-Type": "application/json" }; }
async function sbGet(env, chemin) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${chemin}`, { headers: sbHeaders(env) });
  const d = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data: d };
}
async function sbInsert(env, table, ligne) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...sbJson(env), Prefer: "return=minimal" }, body: JSON.stringify(ligne),
  });
  return r.ok ? null : (await r.text().catch(() => "")).slice(0, 300);
}
async function sbUpsert(env, table, conflit, ligne) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflit}`, {
    method: "POST", headers: { ...sbJson(env), Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(ligne),
  });
  return r.ok ? null : (await r.text().catch(() => "")).slice(0, 300);
}
const uuidValide = (v) => /^[0-9a-f-]{36}$/i.test(String(v || ""));

// Administrateur du portail connecté ; renvoie { user, nom, aal } ou null.
async function verifierAdmin(request, env) {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  const uRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!uRes.ok) return null;
  const user = await uRes.json();
  const p = await sbGet(env, `profiles?id=eq.${user.id}&select=role,full_name`);
  const prof = (Array.isArray(p.data) && p.data[0]) || {};
  if (prof.role !== "admin") return null;
  let aal = "";
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    aal = JSON.parse(atob(part + "=".repeat((4 - part.length % 4) % 4))).aal || "";
  } catch (e) {}
  return { user, nom: (prof.full_name || "").trim() || user.email || "Technicien DSI", aal };
}

// ---------------------------------------------------------------------------
// Microsoft Graph (jeton par tenant, mis en cache dans l'isolate)
// ---------------------------------------------------------------------------
const _jetons = new Map();
async function jetonTenant(env, tenantId) {
  const now = Math.floor(Date.now() / 1000);
  const c = _jetons.get(tenantId);
  if (c && c.exp > now + 60) return c.token;
  const r = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.PROV_CLIENT_ID, client_secret: env.PROV_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
    }).toString(),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) {
    const txt = String(d.error_description || d.error || r.status);
    // Tenant absent de la liste « Allowed tenants » de l'app (multilocataire limité à certains tenants)
    if (/AADSTS7000119/.test(txt)) {
      throw new Error("Ce tenant n'est pas autorisé à utiliser l'app « DSI Hotel Provisioning ». Dans Entra (tenant DSI Hotel) → Inscriptions d'applications → DSI Hotel Provisioning → Authentication → Supported accounts → Manage allowed tenants, ajoutez l'ID " + tenantId + ", enregistrez, puis faites le « Consentement création de comptes » de cet hôtel.");
    }
    if (/AADSTS700016|AADSTS7000229|AADSTS65001|consent/i.test(txt)) {
      throw new Error("Le tenant de l'hôtel n'a pas encore donné son consentement à l'app « DSI Hotel Provisioning ». Ouvrez le lien « Consentement création de comptes » dans Pilotage → Sécurité Microsoft → Établissements.");
    }
    throw new Error("Connexion au tenant Microsoft impossible : " + txt.split("\r\n")[0].slice(0, 220));
  }
  _jetons.set(tenantId, { token: d.access_token, exp: now + (d.expires_in || 3600) });
  return d.access_token;
}
async function graph(env, tenantId, method, chemin, body, entetes) {
  const token = await jetonTenant(env, tenantId);
  const r = await fetch(chemin.startsWith("http") ? chemin : GRAPH + chemin, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(entetes || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text().catch(() => "");
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
  const erreur = r.ok ? null : ((data && data.error && (data.error.message || data.error.code)) || ("statut " + r.status));
  return { ok: r.ok, status: r.status, data, erreur };
}
function erreurPermission(res, quoi) {
  if (res.status === 403 || res.status === 401) {
    return quoi + " : permission refusée par Microsoft (" + res.erreur + "). Vérifiez les permissions de l'app « DSI Hotel Provisioning » puis refaites le consentement dans ce tenant.";
  }
  return quoi + " : " + res.erreur;
}

// ---------------------------------------------------------------------------
// Données du formulaire « Arrivée collaborateur »
// ---------------------------------------------------------------------------
// Libellés du modèle (repli pour les tickets créés avant l'ajout de donnees_formulaire).
const LIBELLES_ARRIVEE = {
  "Type de demande": "typeDemande",
  "Nom et prénom du collaborateur": "nom",
  "Poste / service": "poste",
  "Date d'arrivée": "dateArrivee",
  "Créer une adresse mail": "creerMail",
  "Adresse mail à créer": "mailACreer",
  "Numéro de téléphone pour le MFA": "telMfa",
  "Groupes de distribution et boîtes partagées à inclure": "groupesMail",
  "Email du validateur (RH / direction)": "validateurEmail",
};
function lireFormulaire(ticket) {
  const j = ticket.donnees_formulaire;
  if (j && typeof j === "object" && Object.keys(j).length) return { source: "json", form: j };
  const form = {};
  String(ticket.message || "").split("\n").forEach(l => {
    const i = l.indexOf(" : ");
    if (i < 0) return;
    const cle = LIBELLES_ARRIVEE[l.slice(0, i).trim()];
    if (!cle || form[cle] !== undefined) return;
    const v = l.slice(i + 3).trim();
    form[cle] = cle === "creerMail" ? v === "Oui" : (v === "-" ? "" : v);
  });
  return { source: "texte", form };
}
function estArrivee(ticket, form) {
  return (form && form.template === "arrivee") || /Arrivée collaborateur/i.test(String(ticket.subject || ""));
}

// ---------------------------------------------------------------------------
// Normalisation des noms, adresses et téléphones
// ---------------------------------------------------------------------------
const sansAccents = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
function normaliserLocal(s) {
  return sansAccents(s).toLowerCase().trim()
    .replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "")
    .replace(/\.{2,}/g, ".").replace(/^[.\-_]+|[.\-_]+$/g, "");
}
const capitaliser = (mot) => String(mot || "").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// Devine prénom / nom à partir du champ « Nom et prénom » et de l'adresse demandée (prenom.nom).
function decouperNom(nomComplet, local) {
  const mots = String(nomComplet || "").trim().split(/\s+/).filter(Boolean);
  if (!mots.length) {
    const p = String(local || "").split(/[._-]/).filter(Boolean);
    return { prenom: capitaliser(p[0] || ""), nom: capitaliser(p.slice(1).join(" ")) };
  }
  if (mots.length === 1) return { prenom: "", nom: capitaliser(mots[0]) };
  // Mots tout en majuscules = nom de famille (« DUPONT Jean »)
  const majs = mots.filter(m => m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase());
  if (majs.length && majs.length < mots.length) {
    return { prenom: capitaliser(mots.filter(m => !majs.includes(m)).join(" ")), nom: capitaliser(majs.join(" ")) };
  }
  // Sinon on s'aide de l'adresse prenom.nom
  const p1 = String(local || "").split(/[._-]/)[0];
  if (p1) {
    const idx = mots.findIndex(m => normaliserLocal(m) === p1);
    if (idx >= 0) return { prenom: capitaliser(mots[idx]), nom: capitaliser(mots.filter((_, i) => i !== idx).join(" ")) };
  }
  return { prenom: capitaliser(mots[0]), nom: capitaliser(mots.slice(1).join(" ")) };
}

// Format attendu par Microsoft : « +33 612345678 »
const INDICATIFS = ["352", "377", "33", "34", "32", "41", "44", "49", "39", "31", "351", "212", "216", "213", "1"];
function normaliserTel(tel) {
  let t = String(tel || "").replace(/[^\d+]/g, "");
  if (!t) return "";
  if (t.startsWith("00")) t = "+" + t.slice(2);
  if (/^0[1-9]\d{8}$/.test(t)) return "+33 " + t.slice(1);
  // Numéro français saisi sans le 0 ni l'indicatif (ex. 654119420) : mobile 6/7, ou fixe 1-5/9
  if (/^[1-79]\d{8}$/.test(t)) return "+33 " + t;
  // Indicatif sans le + (ex. 33654119420)
  if (/^33[1-9]\d{8}$/.test(t)) return "+33 " + t.slice(2);
  if (t.startsWith("+")) {
    const chiffres = t.slice(1);
    const ind = INDICATIFS.find(i => chiffres.startsWith(i));
    if (ind) return "+" + ind + " " + chiffres.slice(ind.length).replace(/^0/, "");
  }
  return t;
}

function genererMotDePasse() {
  const maj = "ABCDEFGHJKLMNPQRSTUVWXYZ", min = "abcdefghijkmnopqrstuvwxyz", chi = "23456789", spe = "!@#$%*?-+";
  const tous = maj + min + chi + spe;
  const alea = (n) => { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] % n; };
  const car = [maj, min, chi, spe].map(s => s[alea(s.length)]);
  while (car.length < 14) car.push(tous[alea(tous.length)]);
  for (let i = car.length - 1; i > 0; i--) { const j = alea(i + 1); [car[i], car[j]] = [car[j], car[i]]; }
  return car.join("");
}
// Mot de passe fourni par le portail (le même que le compte Windows, généré par dsi-hotel-agent) :
// accepté seulement s'il respecte la politique Microsoft (12 à 64 caractères, 4 familles de caractères).
function motDePasseFourni(v) {
  const s = String(v || "");
  if (s.length < 12 || s.length > 64 || /\s/.test(s)) return null;
  if (!/[A-Z]/.test(s) || !/[a-z]/.test(s) || !/[0-9]/.test(s) || !/[^A-Za-z0-9]/.test(s)) return null;
  return s;
}

// ---------------------------------------------------------------------------
// Lectures dans le tenant
// ---------------------------------------------------------------------------
const NOMS_SKU = {
  O365_BUSINESS_ESSENTIALS: "Microsoft 365 Business Basic",
  O365_BUSINESS_PREMIUM: "Microsoft 365 Business Standard",
  SPB: "Microsoft 365 Business Premium",
  O365_BUSINESS: "Microsoft 365 Apps for business",
  EXCHANGESTANDARD: "Exchange Online (Plan 1)",
  EXCHANGEENTERPRISE: "Exchange Online (Plan 2)",
  EXCHANGEDESKLESS: "Exchange Online Kiosk",
  EXCHANGE_S_ESSENTIALS: "Exchange Online Essentials",
  SPE_F1: "Microsoft 365 F3",
  M365_F1_COMM: "Microsoft 365 F1",
  DESKLESSPACK: "Office 365 F3",
  STANDARDPACK: "Office 365 E1",
  ENTERPRISEPACK: "Office 365 E3",
  ENTERPRISEPREMIUM: "Office 365 E5",
  SPE_E3: "Microsoft 365 E3",
  SPE_E5: "Microsoft 365 E5",
  Microsoft_365_E3: "Microsoft 365 E3",
  Microsoft_365_E5: "Microsoft 365 E5",
  O365_w_o_Teams_Bundle_M3: "Microsoft 365 E3 (sans Teams)",
  "Microsoft_365_Business_Standard_EEA_(no_Teams)": "Microsoft 365 Business Standard (sans Teams)",
};
const SKU_GRATUIT = /FREE|VIRAL|TRIAL|_DEV|ADHOC|WINDOWS_STORE|STREAM|FLOW_FREE|POWER_BI_STANDARD|RMSBASIC|CCIBOTS|MICROSOFT_BUSINESS_CENTER|TEAMS_EXPLORATORY/i;

async function lireLicences(env, tid) {
  const r = await graph(env, tid, "GET", "/subscribedSkus?$select=skuId,skuPartNumber,capabilityStatus,prepaidUnits,consumedUnits");
  if (!r.ok) throw new Error(erreurPermission(r, "Lecture des licences"));
  return (r.data.value || [])
    .filter(s => s.capabilityStatus === "Enabled" || s.capabilityStatus === "Warning")
    .filter(s => !SKU_GRATUIT.test(s.skuPartNumber || "") && ((s.prepaidUnits && s.prepaidUnits.enabled) || 0) < 10000)
    .map(s => {
      const total = (s.prepaidUnits && s.prepaidUnits.enabled) || 0;
      const utilisees = s.consumedUnits || 0;
      return { skuId: s.skuId, part: s.skuPartNumber, nom: NOMS_SKU[s.skuPartNumber] || s.skuPartNumber, total, utilisees, dispo: Math.max(0, total - utilisees), connu: !!NOMS_SKU[s.skuPartNumber] };
    })
    .sort((a, b) => (b.connu - a.connu) || a.nom.localeCompare(b.nom));
}

async function lireOrganisation(env, tid) {
  const r = await graph(env, tid, "GET", "/organization?$select=id,displayName,verifiedDomains,onPremisesSyncEnabled");
  if (!r.ok) throw new Error(erreurPermission(r, "Lecture du tenant"));
  const org = (r.data.value || [])[0] || {};
  let domaines = (org.verifiedDomains || []).map(d => ({ nom: String(d.name || "").toLowerCase(), defaut: !!d.isDefault, initial: !!d.isInitial }));
  const publics = domaines.filter(d => !d.initial);
  if (publics.length) domaines = publics;
  domaines.sort((a, b) => (b.defaut - a.defaut) || a.nom.localeCompare(b.nom));
  return { nom: org.displayName || "", domaines, hybride: !!org.onPremisesSyncEnabled };
}

async function lireGroupes(env, tid) {
  const groupes = [];
  let suivant = "/groups?$select=id,displayName,mail,groupTypes,mailEnabled,securityEnabled,onPremisesSyncEnabled&$top=999";
  for (let i = 0; suivant && i < 5; i++) {
    const r = await graph(env, tid, "GET", suivant);
    if (!r.ok) throw new Error(erreurPermission(r, "Lecture des groupes"));
    for (const g of (r.data.value || [])) {
      const types = g.groupTypes || [];
      let type, ajoutable = false;
      if (types.includes("DynamicMembership")) type = "Groupe dynamique";
      else if (g.onPremisesSyncEnabled) type = "Synchronisé depuis l'AD";
      else if (types.includes("Unified")) { type = "Groupe Microsoft 365"; ajoutable = true; }
      else if (g.securityEnabled && !g.mailEnabled) { type = "Groupe de sécurité"; ajoutable = true; }
      else if (g.mailEnabled && g.securityEnabled) type = "Sécurité à extension messagerie (Exchange)";
      else type = "Liste de distribution (Exchange)";
      groupes.push({ id: g.id, nom: g.displayName || "(sans nom)", mail: g.mail || "", type, ajoutable });
    }
    suivant = r.data["@odata.nextLink"] || null;
  }
  return groupes.sort((a, b) => (b.ajoutable - a.ajoutable) || a.nom.localeCompare(b.nom, "fr"));
}

// Tenant synchronisé (Entra Connect) : OU de l'AD dont des comptes remontent dans Microsoft 365.
// Sert au portail à refuser une OU synchronisée pour le compte Windows (sinon doublon / fusion avec la boîte).
async function lireOusSynchro(env, tid) {
  const ous = new Set();
  let suivant = "/users?$filter=onPremisesSyncEnabled eq true&$select=onPremisesDistinguishedName&$count=true&$top=999";
  for (let i = 0; suivant && i < 5; i++) {
    const r = await graph(env, tid, "GET", suivant, null, { ConsistencyLevel: "eventual" });
    if (!r.ok) return null; // information facultative
    (r.data.value || []).forEach(u => {
      const dn = String(u.onPremisesDistinguishedName || "");
      const parent = dn.replace(/^CN=(?:\\,|[^,])+,/i, "");
      if (parent && parent !== dn) ous.add(parent);
    });
    suivant = r.data["@odata.nextLink"] || null;
  }
  return [...ous];
}

// L'adresse est-elle libre ? (UPN, alias d'un utilisateur ou d'un groupe)
async function verifierAdresse(env, tid, adresse) {
  const a = String(adresse || "").toLowerCase();
  const u = await graph(env, tid, "GET", `/users/${encodeURIComponent(a)}?$select=id,displayName,userPrincipalName`);
  if (u.ok) return { disponible: false, conflit: "Compte existant : " + (u.data.displayName || a) };
  if (u.status !== 404) throw new Error(erreurPermission(u, "Vérification de l'adresse"));
  const filtre = encodeURIComponent(`proxyAddresses/any(x:x eq 'smtp:${a.replace(/'/g, "''")}')`);
  const ev = { ConsistencyLevel: "eventual" };
  const pu = await graph(env, tid, "GET", `/users?$filter=${filtre}&$count=true&$select=displayName,userPrincipalName`, null, ev);
  if (pu.ok && (pu.data.value || []).length) return { disponible: false, conflit: "Alias de " + (pu.data.value[0].displayName || pu.data.value[0].userPrincipalName) };
  const pg = await graph(env, tid, "GET", `/groups?$filter=${filtre}&$count=true&$select=displayName`, null, ev);
  if (pg.ok && (pg.data.value || []).length) return { disponible: false, conflit: "Adresse du groupe « " + pg.data.value[0].displayName + " »" };
  return { disponible: true, conflit: null };
}

// ---------------------------------------------------------------------------
// Contexte d'un ticket : ticket, formulaire, tenant, validation, création déjà faite
// ---------------------------------------------------------------------------
async function contexteTicket(env, ticketId) {
  const id = encodeURIComponent(String(ticketId || ""));
  if (!id) throw new Error("ticketId manquant");
  let t = await sbGet(env, `tickets?id=eq.${id}&select=id,reference,hotel_id,subject,message,category,donnees_formulaire`);
  if (!t.ok) t = await sbGet(env, `tickets?id=eq.${id}&select=id,reference,hotel_id,subject,message,category`);
  const ticket = Array.isArray(t.data) && t.data[0];
  if (!ticket) throw new Error("Ticket introuvable");
  const { source, form } = lireFormulaire(ticket);

  let tenant = null;
  if (ticket.hotel_id) {
    const tn = await sbGet(env, `m365_tenants?hotel_id=eq.${encodeURIComponent(ticket.hotel_id)}&select=tenant_id,nom,actif,provisioning_actif`);
    const liste = Array.isArray(tn.data) ? tn.data : [];
    tenant = liste.find(x => x.provisioning_actif) || liste[0] || null;
  }
  const v = await sbGet(env, `ticket_validations?ticket_id=eq.${id}&select=status,validated_at,validateur_email&order=created_at.desc&limit=1`);
  const validation = (Array.isArray(v.data) && v.data[0]) || null;
  const p = await sbGet(env, `m365_provisionings?ticket_id=eq.${id}&statut=in.(ok,partiel)&select=upn,licence,statut,cree_par,cree_le&order=cree_le.desc&limit=1`);
  const existant = (Array.isArray(p.data) && p.data[0]) || null;

  const blocages = [];
  if (!estArrivee(ticket, form)) blocages.push("Ce ticket n'est pas une demande « Arrivée collaborateur ».");
  else if (form.typeDemande && form.typeDemande !== "Nouveau compte") blocages.push("Demande de modification : traitement manuel (non automatisé pour l'instant).");
  else if (form.creerMail !== true) blocages.push("Aucune création d'adresse mail n'est demandée dans ce formulaire.");
  if (!ticket.hotel_id) blocages.push("Le ticket n'est rattaché à aucun établissement.");
  else if (!tenant) blocages.push("Aucun tenant Microsoft 365 n'est rattaché à cet établissement (Pilotage → Sécurité Microsoft → Établissements).");
  else if (!tenant.provisioning_actif) blocages.push("La création de comptes n'est pas activée pour cet établissement (Pilotage → Sécurité Microsoft → Établissements).");

  return { ticket, form, source, tenant, validation, existant, blocages };
}

// Licence retenue pour cet hôtel lors d'une précédente création (provisioning_memo)
async function licenceMemorisee(env, hotelId) {
  if (!uuidValide(hotelId)) return null;
  const r = await sbGet(env, `provisioning_memo?hotel_id=eq.${hotelId}&cle=eq.licence&select=valeur`);
  const v = Array.isArray(r.data) && r.data[0] && r.data[0].valeur;
  return (v && v.valeur) || null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
async function routeInfos(env, body) {
  const ctx = await contexteTicket(env, body.ticketId);
  const { ticket, form, source, tenant, validation, existant, blocages } = ctx;
  const reponse = {
    success: true,
    ticket: { id: ticket.id, reference: ticket.reference, subject: ticket.subject },
    form, source, validation, existant, blocages,
    tenant: tenant ? { tenant_id: tenant.tenant_id, nom: tenant.nom, provisioning_actif: !!tenant.provisioning_actif } : null,
  };
  if (blocages.length || existant) return reponse;

  try {
    const tid = tenant.tenant_id;
    const [org, licences, groupes, licMemo] = await Promise.all([lireOrganisation(env, tid), lireLicences(env, tid), lireGroupes(env, tid), licenceMemorisee(env, ticket.hotel_id)]);
    reponse.domaines = org.domaines;
    reponse.hybride = org.hybride;
    reponse.licences = licences;
    reponse.groupes = groupes;
    if (org.hybride) reponse.ousSynchro = await lireOusSynchro(env, tid).catch(() => null);

    // Proposition d'adresse
    let local = "", domaine = "";
    const demande = String(form.mailACreer || "").trim().toLowerCase();
    if (demande.includes("@")) {
      local = normaliserLocal(demande.split("@")[0]);
      const d = demande.split("@")[1];
      domaine = org.domaines.some(x => x.nom === d) ? d : "";
      if (!domaine) reponse.avertissementDomaine = "Le domaine demandé « " + d + " » n'appartient pas à ce tenant : choisissez un domaine dans la liste.";
    } else if (demande) local = normaliserLocal(demande);
    const n = decouperNom(form.nom, local);
    if (!local) local = normaliserLocal([n.prenom, n.nom].filter(Boolean).join("."));
    if (!domaine) domaine = (org.domaines[0] && org.domaines[0].nom) || "";
    // Licence proposée : celle retenue pour l'hôtel la dernière fois, si elle existe encore (le technicien peut la changer)
    const licProposee = licMemorisee(licences, licMemo);
    reponse.proposition = {
      local, domaine, prenom: n.prenom, nom: n.nom,
      nomAffiche: [n.prenom, n.nom].filter(Boolean).join(" "),
      poste: form.poste || "", tel: normaliserTel(form.telMfa),
      skuId: licProposee ? licProposee.skuId : "",
      verification: (local && domaine) ? await verifierAdresse(env, tid, local + "@" + domaine) : null,
    };
  } catch (e) {
    reponse.erreurGraph = e.message || String(e);
  }
  return reponse;
}
function licMemorisee(licences, part) {
  return part ? (licences || []).find(l => l.part === part) || null : null;
}

async function routeVerifier(env, body) {
  const ctx = await contexteTicket(env, body.ticketId);
  if (!ctx.tenant) return json({ error: "Aucun tenant rattaché" }, 400);
  const adresse = String(body.adresse || "").toLowerCase().trim();
  if (!/^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(adresse)) return json({ success: true, disponible: false, conflit: "Adresse invalide" });
  const v = await verifierAdresse(env, ctx.tenant.tenant_id, adresse);
  return json({ success: true, ...v });
}

async function routeCreer(env, body, admin) {
  if (admin.aal !== "aal2") return json({ error: "Double authentification requise pour créer un compte." }, 403);
  const ctx = await contexteTicket(env, body.ticketId);
  const { ticket, form, tenant, validation, existant, blocages } = ctx;
  if (blocages.length) return json({ error: blocages.join(" ") }, 400);
  if (existant) return json({ error: "Une boîte a déjà été créée pour ce ticket : " + existant.upn }, 409);
  if (!validation || validation.status !== "validated") return json({ error: "La demande n'est pas encore validée par le RH / la direction." }, 400);

  const tid = tenant.tenant_id;
  const local = normaliserLocal(body.local);
  const domaine = String(body.domaine || "").toLowerCase().trim();
  const prenom = String(body.prenom || "").trim();
  const nom = String(body.nom || "").trim();
  const nomAffiche = String(body.nomAffiche || "").trim() || [prenom, nom].filter(Boolean).join(" ");
  if (!local || local.length > 64) return json({ error: "Partie avant @ invalide." }, 400);
  if (!nomAffiche) return json({ error: "Nom affiché obligatoire." }, 400);
  if (!body.skuId) return json({ error: "Choisissez une licence." }, 400);
  if (body.motDePasse && !motDePasseFourni(body.motDePasse)) return json({ error: "Mot de passe transmis non conforme à la politique Microsoft." }, 400);

  // Contrôles côté Microsoft avant toute écriture
  const org = await lireOrganisation(env, tid);
  if (!org.domaines.some(d => d.nom === domaine)) return json({ error: "Le domaine « " + domaine + " » n'appartient pas au tenant de l'hôtel." }, 400);
  const upn = local + "@" + domaine;
  const dispo = await verifierAdresse(env, tid, upn);
  if (!dispo.disponible) return json({ error: "Adresse déjà utilisée : " + dispo.conflit }, 409);
  const licences = await lireLicences(env, tid);
  const lic = licences.find(l => l.skuId === body.skuId);
  if (!lic) return json({ error: "Licence introuvable dans ce tenant." }, 400);
  if (lic.dispo < 1) return json({ error: "Plus aucune licence « " + lic.nom + " » disponible (" + lic.utilisees + "/" + lic.total + "). Achetez une licence puis réessayez." }, 409);

  // 1) Compte
  const motDePasse = motDePasseFourni(body.motDePasse) || genererMotDePasse();
  const nouvel = {
    accountEnabled: true,
    displayName: nomAffiche,
    mailNickname: local.replace(/[^a-z0-9._-]/g, "").slice(0, 64) || "user",
    userPrincipalName: upn,
    usageLocation: "FR",
    preferredLanguage: "fr-FR",
    // Compte Windows en OU synchronisée (body.synchro) : Entra Connect va fusionner ce compte avec le compte AD et le mot de passe
    // sera géré par l'AD. On n'impose donc pas de changement côté Microsoft (impossible sans réécriture du mot de passe vers l'AD) :
    // l'utilisateur le change à l'ouverture de session Windows, Microsoft 365 suit par la synchronisation.
    passwordProfile: { password: motDePasse, forceChangePasswordNextSignIn: body.synchro !== true },
  };
  if (prenom) nouvel.givenName = prenom;
  if (nom) nouvel.surname = nom;
  if (String(body.poste || "").trim()) nouvel.jobTitle = String(body.poste).trim().slice(0, 128);
  if (String(body.service || "").trim()) nouvel.department = String(body.service).trim().slice(0, 64);
  const cr = await graph(env, tid, "POST", "/users", nouvel);
  if (!cr.ok) return json({ error: erreurPermission(cr, "Création du compte") }, 502);
  const userId = cr.data.id;

  const etapes = [{ etape: "Compte créé", ok: true, detail: upn }];

  // 2) Licence (la boîte Exchange se crée ensuite automatiquement)
  const al = await graph(env, tid, "POST", `/users/${userId}/assignLicense`, { addLicenses: [{ skuId: lic.skuId, disabledPlans: [] }], removeLicenses: [] });
  etapes.push({ etape: "Licence " + lic.nom, ok: al.ok, detail: al.ok ? "" : erreurPermission(al, "Attribution de la licence") });

  // 3) Groupes (uniquement ceux gérables par Graph)
  const groupesNoms = [];
  const ids = Array.isArray(body.groupes) ? body.groupes.filter(x => /^[0-9a-f-]{36}$/i.test(String(x))).slice(0, 20) : [];
  for (const gid of ids) {
    const gm = await graph(env, tid, "POST", `/groups/${gid}/members/$ref`, { "@odata.id": `${GRAPH}/directoryObjects/${userId}` });
    const nomG = (body.groupesNoms && body.groupesNoms[gid]) || gid;
    groupesNoms.push(nomG);
    etapes.push({ etape: "Groupe " + nomG, ok: gm.ok, detail: gm.ok ? "" : erreurPermission(gm, "Ajout au groupe") });
  }

  // 4) Téléphone MFA (SMS) — l'annuaire peut mettre quelques secondes à voir le nouveau compte
  const tel = normaliserTel(body.telMfa);
  if (tel) {
    let mf = await graph(env, tid, "POST", `/users/${userId}/authentication/phoneMethods`, { phoneNumber: tel, phoneType: "mobile" });
    if (!mf.ok && (mf.status === 404 || mf.status === 400)) {
      await new Promise(r => setTimeout(r, 4000));
      mf = await graph(env, tid, "POST", `/users/${userId}/authentication/phoneMethods`, { phoneNumber: tel, phoneType: "mobile" });
    }
    etapes.push({ etape: "Téléphone MFA " + tel, ok: mf.ok, detail: mf.ok ? "" : erreurPermission(mf, "Enregistrement du téléphone MFA") });
  }

  const statut = etapes.every(e => e.ok) ? "ok" : "partiel";
  const aFaire = String(form.groupesMail || "").trim();

  // Journal + trace dans le ticket (jamais le mot de passe)
  const errJournal = await sbInsert(env, "m365_provisionings", {
    ticket_id: String(ticket.id), reference: ticket.reference || null, hotel_id: ticket.hotel_id ? String(ticket.hotel_id) : null,
    tenant_id: tid, upn, user_id_entra: userId, licence: lic.part, groupes: groupesNoms, mfa_tel: tel || null,
    statut, details: { etapes, nomAffiche, motDePasseCommun: !!motDePasseFourni(body.motDePasse), fusionEntraConnect: body.synchro === true }, cree_par: admin.nom,
  });
  // Licence retenue pour les prochaines demandes de cet hôtel
  if (uuidValide(ticket.hotel_id)) await sbUpsert(env, "provisioning_memo", "hotel_id,cle", { hotel_id: ticket.hotel_id, cle: "licence", valeur: { valeur: lic.part, nom: lic.nom }, maj_par: admin.nom, maj_le: new Date().toISOString() });
  const quand = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const lignes = [
    (statut === "ok" ? "✅" : "⚠️") + " BOÎTE MICROSOFT 365 CRÉÉE",
    "Adresse : " + upn,
    "Nom affiché : " + nomAffiche,
    "Licence : " + lic.nom + (al.ok ? "" : " (ÉCHEC — à attribuer à la main)"),
  ];
  if (groupesNoms.length) lignes.push("Groupes : " + groupesNoms.join(", "));
  if (tel) lignes.push("MFA par SMS : " + tel);
  etapes.filter(e => !e.ok).forEach(e => lignes.push("À reprendre : " + e.etape));
  if (aFaire) lignes.push("Demandé par l'hôtel (listes de distribution / boîtes partagées, à faire dans Exchange) : " + aFaire);
  lignes.push("Créée par " + admin.nom + " le " + quand + ".");
  lignes.push(body.synchro === true
    ? "Compte Windows en OU synchronisée : Entra Connect fusionnera ce compte avec le compte AD au prochain cycle (30 min max). Le mot de passe se change à l'ouverture de session Windows."
    : "La boîte sera disponible d'ici quelques minutes. Le mot de passe provisoire est communiqué séparément par le technicien ; il devra être changé à la première connexion.");
  await sbInsert(env, "ticket_messages", { ticket_id: ticket.id, sender_role: "admin", sender_name: "Création Microsoft 365", body: lignes.join("\n") });

  return json({
    success: true, statut, upn, motDePasse, licence: lic.nom, etapes,
    aFaireManuellement: aFaire || null,
    avertissement: errJournal ? "Compte créé, mais le journal n'a pas pu être enregistré (" + errJournal + ")." : null,
  });
}

const app = {
  async fetch(request, env) {
    const url = new URL(request.url);
    CURRENT_ORIGIN = request.headers.get("Origin") || ALLOWED_ORIGINS[0];
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
    if (request.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.PROV_CLIENT_ID || !env.PROV_CLIENT_SECRET) {
      return json({ error: "Configuration du Worker incomplète : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PROV_CLIENT_ID et PROV_CLIENT_SECRET sont requis." }, 500);
    }
    const admin = await verifierAdmin(request, env);
    if (!admin) return json({ error: "Réservé aux administrateurs du portail." }, 401);
    const body = await request.json().catch(() => ({}));
    try {
      if (url.pathname === "/provisioning/infos") return json(await routeInfos(env, body));
      if (url.pathname === "/provisioning/verifier") return await routeVerifier(env, body);
      if (url.pathname === "/provisioning/creer") return await routeCreer(env, body, admin);
      return json({ error: "Route inconnue" }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },
};

export default {
  async fetch(request, env, ctx) {
    const propre = { ...env };
    for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PROV_CLIENT_ID", "PROV_CLIENT_SECRET"]) {
      if (typeof propre[k] === "string") propre[k] = propre[k].trim();
    }
    try {
      return await app.fetch(request, propre, ctx);
    } catch (e) {
      CURRENT_ORIGIN = request.headers.get("Origin") || ALLOWED_ORIGINS[0];
      return json({ error: "Erreur interne du Worker : " + String((e && e.message) || e) }, 500);
    }
  },
};
