/**
 * dsi-hotel-inventaire.js
 * ---------------------------------------------------------------------------
 * Worker Cloudflare : lecture de l'inventaire SERVEURS d'un hôtel dans NinjaOne,
 * pour remplir l'onglet « Inventaire serveurs » du portail DSI Hotel.
 *
 * ÉTAPE 1 (TEST) : POST /apercu { hotelId }
 *   Lit dans NinjaOne l'organisation de l'hôtel (champ « Nom NinjaOne » de la
 *   fiche établissement, sinon nom de l'hôtel) :
 *     - les serveurs et hôtes (Windows/Linux, VMware, Hyper-V…),
 *     - les mises à jour en attente / en échec et la dernière installée,
 *     - l'état de l'antivirus.
 *   Enregistre le résultat (brut + propositions de lignes) dans la table
 *   inventaire_ninja_apercu. N'ÉCRIT RIEN dans inventaire_serveurs.
 *
 * POST /machines : tous les ordinateurs (postes, serveurs, hôtes) de tous les hôtels, table « machines »
 *   (note par machine du Tableau de bord hôtels).
 *
 * POST /antivirus-postes : antivirus actif de tous les PC Windows (tous éditeurs), synthèse par hôtel
 *   (hotels.antivirus_detecte : produits, définitions à jour, menaces actives),
 *   via la fonction enregistrer_antivirus_detecte. Sert au Tableau de bord hôtels.
 *
 * LECTURE SEULE côté NinjaOne (client API « monitoring », client credentials).
 * Environ 10 sous-requêtes par appel (plan gratuit : 50 max).
 *
 * VARIABLES (Worker -> Settings -> Variables and Secrets)
 *   SUPABASE_URL              (Texte)  même valeur que les autres Workers
 *   SUPABASE_SERVICE_ROLE_KEY (Secret) même valeur que les autres Workers
 *   NINJA_CLIENT_ID           (Texte)  mêmes valeurs que sur dsi-hotel-sophos
 *   NINJA_CLIENT_SECRET       (Secret)
 *   NINJA_HOST                (Texte, optionnel) défaut : essaie eu.ninjarmm.com puis dsihotel.rmmservice.eu
 *   PORTAIL_ORIGIN            (Texte, optionnel) défaut https://portail.dsihotel.com
 */

const PORTAIL_ORIGIN_DEFAUT = "https://portail.dsihotel.com";
const NINJA_HOSTS_DEFAUT = ["https://eu.ninjarmm.com", "https://dsihotel.rmmservice.eu"];
// Tout ce qui n'est pas un poste de travail ou un équipement réseau
const CLASSES_EXCLUES = ["WINDOWS_WORKSTATION", "MAC", "LINUX_WORKSTATION", "ANDROID", "APPLE_IOS", "APPLE_IPADOS"];

/* ------------------------------- Utilitaires ------------------------------- */

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.PORTAIL_ORIGIN || PORTAIL_ORIGIN_DEFAUT,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
function json(body, env, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(env) } });
}
function uuidValide(v) { return /^[0-9a-f-]{36}$/i.test(String(v || "")); }
function normNom(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function nomCourt(v) { return String(v || "").trim().split(".")[0].toUpperCase(); }
function ninjaDate(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  const d = new Date(n < 1e12 ? n * 1000 : n);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function ipsLocales(d) {
  const brut = [].concat(d.ipAddresses || [], d.ipAddress || []);
  return [...new Set(brut.map(x => String(x || "").trim()).filter(ip => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !/^(127\.|169\.254\.)/.test(ip)))];
}

function sb(env, path, options = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      ...(String(env.SUPABASE_SERVICE_ROLE_KEY || "").startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}
async function sbJson(env, path, options) {
  const r = await sb(env, path, options);
  if (!r.ok) throw new Error(`Supabase ${r.status} (${path.split("?")[0]}) ${(await r.text().catch(() => "")).slice(0, 200)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

async function verifierAdmin(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Non authentifié" };
  const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY } });
  if (!u.ok) return { ok: false, status: 401, error: "Session invalide ou expirée" };
  const user = await u.json().catch(() => null);
  if (!user || !user.id) return { ok: false, status: 401, error: "Session invalide" };
  const p = await sbJson(env, `profiles?id=eq.${user.id}&select=role`).catch(() => []);
  if (!p || !p[0] || p[0].role !== "admin") return { ok: false, status: 403, error: "Réservé aux administrateurs DSI Hotel" };
  return { ok: true, user };
}

/* -------------------------------- NinjaOne -------------------------------- */

let ninjaCache = null;
async function ninjaToken(env) {
  if (ninjaCache && ninjaCache.expire > Date.now() + 60000) return ninjaCache;
  if (!env.NINJA_CLIENT_ID || !env.NINJA_CLIENT_SECRET) throw new Error("NINJA_CLIENT_ID / NINJA_CLIENT_SECRET non configurés sur le Worker.");
  const hosts = env.NINJA_HOST ? [String(env.NINJA_HOST).trim().replace(/\/+$/, "")] : NINJA_HOSTS_DEFAUT;
  let derniere = "";
  for (const host of hosts) {
    const res = await fetch(host + "/ws/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.NINJA_CLIENT_ID, client_secret: env.NINJA_CLIENT_SECRET, scope: "monitoring" }).toString(),
    }).catch(e => ({ ok: false, status: String(e) }));
    const data = res.json ? await res.json().catch(() => ({})) : {};
    if (res.ok && data.access_token) {
      ninjaCache = { host, token: data.access_token, expire: Date.now() + (data.expires_in || 3600) * 1000 };
      return ninjaCache;
    }
    derniere = host + " → " + res.status;
  }
  throw new Error("Connexion NinjaOne refusée (" + derniere + ")");
}
async function ninjaGet(env, chemin) {
  const t = await ninjaToken(env);
  const res = await fetch(t.host + chemin, { headers: { Authorization: "Bearer " + t.token, Accept: "application/json" } });
  if (!res.ok) throw new Error("NinjaOne " + res.status + " " + chemin.split("?")[0] + " " + (await res.text().catch(() => "")).slice(0, 150));
  return res.json();
}
// Les endpoints /v2/queries/* renvoient { results: [...] } (parfois directement un tableau)
async function ninjaRequete(env, chemin) {
  const r = await ninjaGet(env, chemin);
  return Array.isArray(r) ? r : (r.results || r.data || []);
}

/* --------------------------------- Aperçu --------------------------------- */

async function routeApercu(env, body, user) {
  if (!uuidValide(body.hotelId)) return { status: 400, body: { error: "hotelId invalide" } };
  const hs = await sbJson(env, `hotels?select=id,name,ninjaone_nom&id=eq.${body.hotelId}`);
  const h = hs && hs[0];
  if (!h) return { status: 404, body: { error: "Hôtel introuvable" } };

  // 1) Organisation NinjaOne
  const orgs = await ninjaGet(env, "/v2/organizations?pageSize=1000");
  const cibles = [h.ninjaone_nom, h.name].filter(Boolean).map(normNom);
  const org = (Array.isArray(orgs) ? orgs : []).find(o => cibles.includes(normNom(o.name)));
  if (!org) return { status: 404, body: { error: "Organisation NinjaOne introuvable pour « " + (h.ninjaone_nom || h.name) + " »" } };
  const df = encodeURIComponent("org=" + org.id);

  // 2) Appareils de l'organisation (sauf postes de travail)
  const page = await ninjaGet(env, `/v2/devices-detailed?df=${df}&pageSize=1000`);
  const tous = Array.isArray(page) ? page : (page.devices || []);
  const classes = {};
  tous.forEach(d => { const c = String(d.nodeClass || "?"); classes[c] = (classes[c] || 0) + 1; });
  const serveurs = tous.filter(d => !CLASSES_EXCLUES.includes(String(d.nodeClass || "").toUpperCase()));
  const ids = new Set(serveurs.map(d => d.id));

  // 3) Données complémentaires : chaque bloc est facultatif
  const erreurs = [];
  const essai = async (cle, fn) => { try { return await fn(); } catch (e) { erreurs.push(cle + " : " + String((e && e.message) || e).slice(0, 200)); return []; } };
  const [patchs, installes, antivirus, osInfos] = await Promise.all([
    essai("os-patches", () => ninjaRequete(env, `/v2/queries/os-patches?df=${df}&pageSize=1000`)),
    essai("os-patch-installs", () => ninjaRequete(env, `/v2/queries/os-patch-installs?df=${df}&pageSize=1000`)),
    essai("antivirus-status", () => ninjaRequete(env, `/v2/queries/antivirus-status?df=${df}&pageSize=1000`)),
    essai("operating-systems", () => ninjaRequete(env, `/v2/queries/operating-systems?df=${df}&pageSize=1000`)),
  ]);
  const parDevice = (liste) => {
    const m = {};
    liste.filter(x => ids.has(x.deviceId)).forEach(x => { (m[x.deviceId] = m[x.deviceId] || []).push(x); });
    return m;
  };
  const pP = parDevice(patchs), pI = parDevice(installes), pA = parDevice(antivirus), pO = parDevice(osInfos);

  // 4) Propositions de lignes pour inventaire_serveurs
  const parId = Object.fromEntries(serveurs.map(d => [d.id, d]));
  const lignes = serveurs.map(d => {
    const cls = String(d.nodeClass || "").toUpperCase();
    const os = d.os || {}, sys = d.system || {};
    const osq = (pO[d.id] || [])[0] || {};
    const enAttente = (pP[d.id] || []).filter(p => /PENDING|APPROVED|MANUAL/i.test(String(p.status || "")));
    const enEchec = (pP[d.id] || []).filter(p => /FAIL/i.test(String(p.status || "")));
    const derniere = (pI[d.id] || []).map(p => ninjaDate(p.installedAt || p.timestamp)).filter(Boolean).sort().pop() || null;
    const av = (pA[d.id] || [])[0] || null;
    const estVM = /VM_GUEST|VIRTUAL/.test(cls) || /vmware|virtual|hyper-v|kvm|qemu/i.test(String(sys.model || "") + " " + String(sys.manufacturer || ""));
    const parent = d.parentDeviceId && parId[d.parentDeviceId] ? nomCourt(parId[d.parentDeviceId].systemName || parId[d.parentDeviceId].displayName) : null;
    return {
      ninja_id: d.id,
      classe: cls,
      nom: nomCourt(d.systemName || d.dnsName || d.displayName) || d.displayName || null,
      ip: ipsLocales(d)[0] || null,
      type: /VM_HOST|HYPERV_VMM_HOST/.test(cls) ? "Physique" : (estVM ? "VM" : "Physique"),
      parent,
      os: os.name || osq.name || null,
      version: [os.buildNumber || osq.buildNumber, os.releaseId || osq.releaseId].filter(Boolean).join(" ") || null,
      fabricant: sys.manufacturer || null,
      modele: sys.model || null,
      numero_serie: sys.serialNumber || sys.biosSerialNumber || null,
      en_ligne: d.offline === false,
      dernier_contact: ninjaDate(d.lastContact),
      dernier_demarrage: ninjaDate(os.lastBootTime || osq.lastBootTime),
      maj_en_attente: enAttente.length,
      maj_en_echec: enEchec.length,
      derniere_maj: derniere,
      antivirus: av ? (av.productName || av.name || null) : null,
      antivirus_etat: av ? [av.productState, av.definitionStatus].filter(Boolean).join(" / ") || null : null,
      garantie: d.warranty || d.warrantyInfo || null,
    };
  });

  const donnees = {
    organisation: { id: org.id, nom: org.name },
    classes_trouvees: classes,
    lignes,
    erreurs,
    // Échantillon brut pour voir tous les champs que NinjaOne fournit (1er serveur + 1 de chaque classe)
    brut: Object.values(Object.fromEntries(serveurs.map(d => [d.nodeClass, d]))).slice(0, 6),
    brut_patch: patchs.slice(0, 3), brut_install: installes.slice(0, 3), brut_antivirus: antivirus.slice(0, 3),
  };
  await sbJson(env, "inventaire_ninja_apercu", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ hotel_id: h.id, organisation: org.name, donnees, par: (user && user.email) || null }),
  });
  return { status: 200, body: { success: true, hotel: h.name, organisation: org.name, serveurs: lignes.length, classes_trouvees: classes, erreurs } };
}

/* --------------------------------- Import --------------------------------- */
// POST /importer { hotelId }
//   Met à jour l'onglet Inventaire serveurs de l'hôtel depuis NinjaOne :
//   - lignes existantes (reconnues par IP, nom, n° de série) : OS, version, IP,
//     n° de série (si vide), « À jour ? », dernière MAJ, antivirus ;
//   - machines absentes : ajoutées sous leur hôte.
//   JAMAIS modifiés : nom, rôle, hôte parent des lignes existantes, Care Pack (fin),
//   licence Veeam et ses alertes, notes, date de contrôle, technicien.
//   Ne supprime jamais rien. ~16 sous-requêtes.

const CLASSES_HOTES = ["VMWARE_VM_HOST", "HYPERV_VMM_HOST"];
const VM_SYSTEME = /^(vCLS[-(]|OmniStackVC-)/i;
// Mots d'un nom (« VOCO-SRV-DC(OLD) » -> VOCO, SRV, DC, OLD ; chiffres finaux retirés : « SRV-OPERA23 » -> OPERA)
function mots(v) { return String(v || "").toUpperCase().split(/[^A-Z0-9]+/).map(t => t.replace(/\d+$/, "")).filter(t => t.length >= 2); }
const CLASSES_INVITES = ["VMWARE_VM_GUEST", "HYPERV_VMM_GUEST"];
const CLASSES_AGENTS = ["WINDOWS_SERVER", "LINUX_SERVER", "MAC_SERVER"];

// Clé de comparaison des NOMS (les IP sont comparées à part, jamais par cette clé)
function cle(v) {
  const s = String(v || "").trim();
  if (!s || /^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return "";
  return s.toUpperCase().split(".")[0].replace(/[^A-Z0-9]/g, "");
}
function ipv4(liste) { return [].concat(liste || []).map(x => String(x || "").trim()).filter(ip => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !/^(127\.|169\.254\.)/.test(ip)); }
function osCourt(nom) {
  const s = String(nom || "");
  const m = s.match(/Windows (Server \d{4}( R2)?|11|10|8\.1|7)/i);
  if (m) return "Windows " + m[1].replace(/^server/i, "Server");
  if (/linux|ubuntu|debian|centos|red ?hat/i.test(s)) return "Linux";
  return s.replace(/^Microsoft\s+/i, "").replace(/\s+Edition.*$/i, "").trim() || null;
}
function dateCourte(iso) { return iso ? String(iso).slice(0, 10) : null; }

async function collecter(env, h) {
  const orgs = await ninjaGet(env, "/v2/organizations?pageSize=1000");
  const cibles = [h.ninjaone_nom, h.name].filter(Boolean).map(normNom);
  const org = (Array.isArray(orgs) ? orgs : []).find(o => cibles.includes(normNom(o.name)));
  if (!org) throw Object.assign(new Error("Organisation NinjaOne introuvable pour « " + (h.ninjaone_nom || h.name) + " » (renseignez « Nom NinjaOne » sur la fiche établissement)"), { status: 404 });
  const df = encodeURIComponent("org=" + org.id);
  const page = await ninjaGet(env, `/v2/devices-detailed?df=${df}&pageSize=1000`);
  const devices = (Array.isArray(page) ? page : (page.devices || []))
    .filter(d => !CLASSES_EXCLUES.includes(String(d.nodeClass || "").toUpperCase()))
    // VM internes à vSphere / SimpliVity : jamais dans l'inventaire
    .filter(d => !VM_SYSTEME.test(String(d.fullName || d.systemName || d.displayName || d.name || "")));
  const erreurs = [];
  const essai = async (c, fn) => { try { return await fn(); } catch (e) { erreurs.push(c + " : " + String((e && e.message) || e).slice(0, 200)); return []; } };
  const [patchs, installes, antivirus] = await Promise.all([
    essai("os-patches", () => ninjaRequete(env, `/v2/queries/os-patches?df=${df}&pageSize=1000`)),
    essai("os-patch-installs", () => ninjaRequete(env, `/v2/queries/os-patch-installs?df=${df}&pageSize=1000`)),
    essai("antivirus-status", () => ninjaRequete(env, `/v2/queries/antivirus-status?df=${df}&pageSize=1000`)),
  ]);
  const grouper = l => { const m = {}; l.forEach(x => { (m[x.deviceId] = m[x.deviceId] || []).push(x); }); return m; };
  return { org, devices, patchs: grouper(patchs), installes: grouper(installes), antivirus: grouper(antivirus), erreurs };
}

// Infos « agent » (Windows/Linux) : OS, mises à jour, antivirus
function infosAgent(d, c) {
  const os = d.os || {};
  const p = c.patchs[d.id] || [];
  const nbAttente = p.filter(x => /PENDING|APPROVED|MANUAL/i.test(String(x.status || ""))).length;
  const nbEchec = p.filter(x => /FAIL/i.test(String(x.status || ""))).length;
  const derniere = (c.installes[d.id] || []).map(x => ninjaDate(x.installedAt || x.timestamp)).filter(Boolean).sort().pop() || null;
  const avs = c.antivirus[d.id] || [];
  const av = avs.find(a => /^ON$/i.test(String(a.productState || ""))) || avs[0] || null;
  const actif = av ? /^ON$/i.test(String(av.productState || "")) : null;
  return {
    os: osCourt(os.name),
    version: [os.buildNumber, os.releaseId].filter(Boolean).join(" ") || null,
    a_jour: (nbAttente + nbEchec) === 0 ? "Oui" : "Non",
    nb_maj: nbAttente, nb_echecs: nbEchec,
    derniere_maj: dateCourte(derniere),
    antivirus: av ? (actif ? "Oui" : "Non") : null,
    antivirus_nom: av ? (av.productName || null) : null,
    av_a_jour: av && av.definitionStatus ? (/up.?to.?date/i.test(av.definitionStatus) ? "Oui" : "Non") : null,
    nom_windows: nomCourt(d.systemName || d.dnsName || d.displayName),
    serie: d.system && d.system.serialNumber && !/^none$/i.test(d.system.serialNumber) ? d.system.serialNumber : null,
    virtuel: /vmware|virtual|hyper-v|kvm|qemu/i.test(String((d.system || {}).model || "") + " " + String((d.system || {}).manufacturer || "")),
  };
}

// Liste unifiée des machines NinjaOne : hôtes, VM (VMware + agent fusionnés), serveurs seuls
function construireMachines(c) {
  const hotes = c.devices.filter(d => CLASSES_HOTES.includes(String(d.nodeClass).toUpperCase()));
  const invites = c.devices.filter(d => CLASSES_INVITES.includes(String(d.nodeClass).toUpperCase()));
  const agents = c.devices.filter(d => CLASSES_AGENTS.includes(String(d.nodeClass).toUpperCase()));
  const utilises = new Set();
  const machines = [];

  hotes.forEach(d => {
    const ip = ipv4(d.ipAddresses)[0] || ipv4([d.dnsName])[0] || null;
    machines.push({
      genre: "hote", ninjaId: d.id, lienId: d.id, nom: ip || nomCourt(d.displayName || d.systemName), ip,
      cles: [cle(ip), cle(d.displayName), cle(d.systemName)].filter(Boolean),
      type: "Physique", role: /HYPERV/.test(d.nodeClass) ? "Hôte Hyper-V" : "Hôte VMware",
      os: /HYPERV/.test(d.nodeClass) ? "Hyper-V" : "VMware ESXi",
      version: d.version || null, serie: d.serviceTag || null,
      modele: [d.vendor, d.model].filter(Boolean).join(" ") || null, allume: d.offline === false,
    });
  });

  invites.forEach(g => {
    const ipsG = ipv4(g.ipAddresses);
    const nomG = g.fullName || g.systemName || g.name || g.displayName;
    const agent = agents.find(a => !utilises.has(a.id) && (cle(a.systemName) === cle(nomG) || cle(a.displayName) === cle(nomG) || ipv4(a.ipAddresses).some(ip => ipsG.includes(ip))));
    if (agent) utilises.add(agent.id);
    const inf = agent ? infosAgent(agent, c) : null;
    machines.push({
      genre: "vm", ninjaId: g.id, lienId: agent ? agent.id : g.id, hoteNinja: g.parentDeviceId, nom: String(nomG || "?").trim(),
      ip: ipsG[0] || (agent ? ipv4(agent.ipAddresses)[0] : null) || null,
      cles: [cle(nomG), inf && cle(inf.nom_windows), ...ipsG.map(cle), ...(agent ? ipv4(agent.ipAddresses).map(cle) : [])].filter(Boolean),
      type: "VM", allume: !/off/i.test(String(g.powerState || "")),
      os: inf ? inf.os : (osCourt(g.guestOSFullName) || null),
      ...(inf ? { version: inf.version, a_jour: inf.a_jour, derniere_maj: inf.derniere_maj, antivirus: inf.antivirus, antivirus_nom: inf.antivirus_nom, av_a_jour: inf.av_a_jour, nb_maj: inf.nb_maj, nom_windows: inf.nom_windows } : {}),
    });
  });

  // Serveurs avec agent mais sans fiche VMware (hôte non supervisé, ou serveur physique)
  agents.filter(a => !utilises.has(a.id)).forEach(a => {
    const inf = infosAgent(a, c);
    const ip = ipv4(a.ipAddresses)[0] || null;
    machines.push({
      genre: inf.virtuel ? "vm_orpheline" : "physique", ninjaId: a.id, lienId: a.id, nom: inf.nom_windows, ip,
      cles: [cle(inf.nom_windows), cle(a.displayName), ...ipv4(a.ipAddresses).map(cle)].filter(Boolean),
      type: inf.virtuel ? "VM" : "Physique", allume: a.offline === false,
      os: inf.os, version: inf.version, a_jour: inf.a_jour, derniere_maj: inf.derniere_maj,
      antivirus: inf.antivirus, antivirus_nom: inf.antivirus_nom, av_a_jour: inf.av_a_jour, nb_maj: inf.nb_maj,
      serie: inf.virtuel ? null : inf.serie, nom_windows: inf.nom_windows,
    });
  });
  return machines;
}

const COLONNES_INV = "id,ninja_id,hotel_id,parent_id,ordre,nom,type,role,os,version,a_jour,derniere_maj,care_pack,care_pack_ref,care_pack_fin,antivirus,antivirus_nom,av_a_jour,date_controle,technicien,commentaire,ip,maj_le,maj_par";
// Colonnes écrites par l'import (même jeu de clés pour toutes les lignes : exigence PostgREST)
const CHAMPS_MAJ = ["ninja_id", "os", "version", "ip", "care_pack_ref", "a_jour", "derniere_maj", "antivirus", "antivirus_nom", "av_a_jour", "type"];

async function routeImporter(env, body, user) {
  if (!uuidValide(body.hotelId)) return { status: 400, body: { error: "hotelId invalide" } };
  const hs = await sbJson(env, `hotels?select=id,name,ninjaone_nom&id=eq.${body.hotelId}`);
  const h = hs && hs[0];
  if (!h) return { status: 404, body: { error: "Hôtel introuvable" } };

  const c = await collecter(env, h);
  const machines = construireMachines(c);
  const inv = (await sbJson(env, `inventaire_serveurs?select=${COLONNES_INV}&hotel_id=eq.${h.id}&order=ordre.asc`)) || [];
  const maintenant = new Date().toISOString();
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

  // --- 1) Rapprochement machine NinjaOne <-> ligne de l'inventaire ---
  const prises = new Set();
  const trouver = (m) => {
    const libres = inv.filter(r => !prises.has(r.id));
    let r = libres.find(x => x.ninja_id && (Number(x.ninja_id) === Number(m.lienId) || Number(x.ninja_id) === Number(m.ninjaId))); // ID NinjaOne
    if (!r && m.ip) r = libres.find(x => (x.ip && x.ip.trim() === m.ip) || String(x.nom || "").trim() === m.ip); // IP (colonne IP ou nom = IP)
    if (!r) r = libres.find(x => m.cles.includes(cle(x.nom)));                                        // nom
    if (!r && m.serie) r = libres.find(x => x.care_pack_ref && cle(x.care_pack_ref) === cle(m.serie)); // n° de série
    // VM de sauvegarde saisie sans IP (ex. « Veeam ») <-> VM dont le nom évoque la sauvegarde
    if (!r && m.type === "VM" && /MBK|BACKUP|VEEAM|BCK|SAUV/i.test([m.nom, m.nom_windows].join(" ")))
      r = libres.find(x => x.type === "VM" && !x.ip && /sauvegarde|veeam|backup/i.test([x.role, x.nom].join(" ")));
    if (r) prises.add(r.id);
    return r || null;
  };
  machines.filter(m => m.genre === "hote").forEach(m => { m.ligne = trouver(m); });
  machines.filter(m => m.genre !== "hote").forEach(m => { m.ligne = trouver(m); });

  // 2e passe : nom court saisi à la main (« DC », « OPERA ») <-> nom complet NinjaOne (« VOCO-SRV-DC », « SRV-OPERA23 »).
  // Uniquement si le rapprochement est sans ambiguïté dans les deux sens ; sinon on le signale comme doublon possible.
  const rapprochements = [], doublonsPossibles = [];
  const sansLigne = machines.filter(m => !m.ligne);
  const motCle = (x) => { const k = String(x.nom || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/\d+$/, ""); return /^\d/.test(String(x.nom || "")) ? "" : k; };
  const candidats = (m) => inv.filter(x => !prises.has(x.id) && motCle(x).length >= 2 && (!x.type || !m.type || x.type === m.type)
    && [...mots(m.nom), ...mots(m.nom_windows)].includes(motCle(x)));
  sansLigne.forEach(m => {
    const cs = candidats(m);
    if (!cs.length) return;
    const concurrents = sansLigne.filter(o => o !== m && !o.ligne && candidats(o).some(x => cs.includes(x)));
    if (m.ligne) return; // déjà rapprochée comme « active » d'un groupe
    const ANCIEN = /^(OLD|RESTORE|COPY|COPIE|TEST|BAK|BACKUP|CLONE)$/;
    const groupe = [m, ...concurrents];
    const actives = groupe.filter(o => !mots(o.nom).some(t => ANCIEN.test(t)));
    if (cs.length === 1 && (!concurrents.length || actives.length === 1)) {
      const elue = concurrents.length ? actives[0] : m;
      elue.ligne = cs[0]; prises.add(cs[0].id);
      rapprochements.push(cs[0].nom + " ↔ " + elue.nom);
    } else {
      doublonsPossibles.push(cs.map(x => x.nom).sort().join(" / ") + " ↔ " + groupe.map(o => o.nom).filter((v, i, t) => t.indexOf(v) === i).sort().join(" / "));
    }
  });

  // Hôte inventaire de chaque hôte NinjaOne (pour rattacher les VM)
  const idLigneHote = {};
  const nouvelles = [];
  const prochainOrdre = (() => { let max = inv.reduce((a, r) => Math.max(a, r.ordre || 0), 0); return () => (max = (Math.floor(max / 10) + 1) * 10); })();
  machines.filter(m => m.genre === "hote").forEach(m => {
    if (m.ligne) { idLigneHote[m.ninjaId] = m.ligne.id; return; }
    const id = crypto.randomUUID();
    idLigneHote[m.ninjaId] = id;
    nouvelles.push({ id, parent_id: null, ordre: prochainOrdre(), m });
  });
  // Hôte(s) de l'inventaire que NinjaOne ne supervise pas : les VM « orphelines » y sont rattachées s'il n'y en a qu'un
  const hotesNonSupervises = inv.filter(r => !r.parent_id && r.type === "Physique" && /vmware|esxi|hyper-v/i.test([r.role, r.os].join(" ")) && !Object.values(idLigneHote).includes(r.id));
  const hoteParDefaut = hotesNonSupervises.length === 1 ? hotesNonSupervises[0] : null;

  const ecarts = [];
  const ordreEnfant = {};
  const ordreParent = id => { const p = inv.find(r => r.id === id) || (nouvelles.find(n => n.id === id) || {}); return p.ordre || 0; };
  const prochainEnfant = (parentId) => {
    if (ordreEnfant[parentId] == null) ordreEnfant[parentId] = inv.filter(r => r.parent_id === parentId).reduce((a, r) => Math.max(a, r.ordre || 0), ordreParent(parentId));
    return ++ordreEnfant[parentId];
  };
  machines.filter(m => m.genre !== "hote").forEach(m => {
    const parentNinja = m.genre === "vm" ? idLigneHote[m.hoteNinja] || null : null;
    if (m.ligne) {
      if (parentNinja && m.ligne.parent_id && m.ligne.parent_id !== parentNinja) {
        const p = inv.find(r => r.id === parentNinja) || {};
        ecarts.push(`« ${m.ligne.nom} » est rangée sous un autre hôte que celui indiqué par NinjaOne (${p.nom || m.ip || "?"}) — non déplacée`);
      }
      return;
    }
    let parent = parentNinja, deduit = false;
    if (!parent && m.genre === "vm_orpheline" && hoteParDefaut) { parent = hoteParDefaut.id; deduit = true; }
    nouvelles.push({ id: crypto.randomUUID(), parent_id: parent, ordre: parent ? prochainEnfant(parent) : prochainOrdre(), m, deduit });
  });

  // --- 2) Mises à jour des lignes existantes ---
  const valeurs = (m, r) => {
    const v = {
      ninja_id: m.lienId || r.ninja_id || null,
      os: m.os || r.os || null,
      version: m.version || r.version || null,
      ip: m.ip || r.ip || null,
      care_pack_ref: r.care_pack_ref || m.serie || null,
      a_jour: m.a_jour || r.a_jour || null,
      derniere_maj: m.derniere_maj || r.derniere_maj || null,
      antivirus: m.antivirus || r.antivirus || null,
      antivirus_nom: m.antivirus_nom || r.antivirus_nom || null,
      av_a_jour: m.av_a_jour || r.av_a_jour || null,
      type: r.type || m.type || null,
    };
    return v;
  };
  const majs = [], detailMaj = [];
  machines.filter(m => m.ligne).forEach(m => {
    const r = m.ligne;
    const v = valeurs(m, r);
    const changes = CHAMPS_MAJ.filter(k => String(v[k] == null ? "" : v[k]) !== String(r[k] == null ? "" : r[k]));
    if (!changes.length) return;
    // nom repris tel quel : colonne NOT NULL, exigée par l'upsert (jamais renommée)
    majs.push({ id: r.id, hotel_id: h.id, nom: r.nom, ...v, maj_le: maintenant, maj_par: "NinjaOne" });
    detailMaj.push({ nom: r.nom, champs: changes });
  });
  if (majs.length) {
    await sbJson(env, "inventaire_serveurs?on_conflict=id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(majs),
    });
  }

  // --- 3) Ajout des machines absentes ---
  const ajouts = nouvelles.map(n => {
    const m = n.m;
    const notes = ["Ajouté depuis NinjaOne le " + aujourdhui];
    if (m.allume === false) notes.push(m.genre === "hote" ? "hors ligne" : "VM éteinte ou hors ligne");
    if (m.nom_windows && cle(m.nom_windows) !== cle(m.nom)) notes.push("nom Windows : " + m.nom_windows);
    if (m.modele) notes.push(m.modele);
    if (n.deduit) notes.push("hôte déduit (non supervisé dans NinjaOne) — à vérifier");
    if (m.nb_maj) notes.push(m.nb_maj + " mise(s) à jour en attente");
    return {
      id: n.id, hotel_id: h.id, parent_id: n.parent_id, ordre: n.ordre,
      ninja_id: m.lienId || null, nom: m.nom, type: m.type, role: m.role || null, os: m.os || null, version: m.version || null, ip: m.ip || null,
      a_jour: m.a_jour || null, derniere_maj: m.derniere_maj || null,
      care_pack_ref: m.serie || null,
      antivirus: m.antivirus || null, antivirus_nom: m.antivirus_nom || null, av_a_jour: m.av_a_jour || null,
      commentaire: notes.join(" · "), maj_le: maintenant, maj_par: "NinjaOne",
    };
  });
  // Hôtes d'abord (les VM y font référence)
  ajouts.sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
  if (ajouts.length) {
    await sbJson(env, "inventaire_serveurs", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(ajouts) });
  }

  const nonVus = inv.filter(r => !prises.has(r.id)).map(r => r.nom);
  const rapport = {
    organisation: c.organisation || c.org.name,
    mis_a_jour: detailMaj, ajoutes: ajouts.map(a => a.nom),
    ecarts, absents_de_ninjaone: nonVus, erreurs: c.erreurs,
    rapprochements, doublons_possibles: [...new Set(doublonsPossibles)],
  };
  await sbJson(env, "inventaire_ninja_apercu", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ hotel_id: h.id, organisation: c.org.name, donnees: { import: rapport }, par: (user && user.email) || null }),
  }).catch(() => {});
  console.log(`Inventaire ${h.name} : ${detailMaj.length} ligne(s) mise(s) à jour, ${ajouts.length} ajoutée(s), par ${(user && user.email) || "?"}`);
  return { status: 200, body: { success: true, hotel: h.name, mis_a_jour: detailMaj.length, ajoutes: ajouts.length, ...rapport } };
}

/* ======================= AJOUT : antivirus de tous les PC ======================= */
// POST /antivirus-postes
//   Lit dans NinjaOne l'antivirus de tous les postes Windows (toutes organisations, TOUS ÉDITEURS :
//   Sophos, CrowdStrike, SentinelOne, WatchGuard, Defender…), en fait la synthèse par hôtel et
//   l'enregistre dans hotels.antivirus_detecte. Complète hotels.antivirus seulement s'il est vide.
//   Nouveau (tableau de bord complétude / conformité) :
//     - a_jour  : nombre de postes dont les définitions antivirus sont à jour (si NinjaOne le fournit)
//     - menaces : nombre de menaces encore actives sur les postes de l'hôtel (si NinjaOne le fournit)
//   ~15 sous-requêtes. Lecture seule côté NinjaOne.

function categorieAV(nom) {
  const s = String(nom || "");
  if (/sophos/i.test(s)) return "sophos";
  if (/sentinel/i.test(s)) return "sentinelone";
  if (/crowdstrike|falcon/i.test(s)) return "crowdstrike";
  if (/watchguard|panda|cytomic/i.test(s)) return "watchguard";
  if (/trend ?micro/i.test(s)) return "trendmicro";
  if (/defender|windows security/i.test(s)) return "defender";
  return "autre";
}

// Requête /v2/queries/* paginée par curseur
async function ninjaRequeteToutes(env, chemin, maxPages) {
  let lignes = [], curseur = null;
  for (let i = 0; i < (maxPages || 15); i++) {
    const r = await ninjaGet(env, chemin + (curseur ? "&cursor=" + encodeURIComponent(curseur) : ""));
    const res = Array.isArray(r) ? r : (r.results || []);
    lignes = lignes.concat(res);
    const c = r && r.cursor && r.cursor.name;
    if (!c || res.length < 1000) break;
    curseur = c;
  }
  return lignes;
}

async function routeAntivirusPostes(env) {
  const dfPostes = encodeURIComponent("class=WINDOWS_WORKSTATION");

  // 1) Organisations NinjaOne <-> hôtels du portail
  const orgs = await ninjaGet(env, "/v2/organizations?pageSize=1000");
  const hotels = (await sbJson(env, "hotels?select=id,name,ninjaone_nom")) || [];
  const hotelDeOrg = {};
  (Array.isArray(orgs) ? orgs : []).forEach(o => {
    const n = normNom(o.name);
    const h = hotels.find(x => normNom(x.ninjaone_nom) === n) || hotels.find(x => normNom(x.name) === n);
    if (h) hotelDeOrg[o.id] = h;
  });

  // 2) Postes Windows -> organisation (pagination par « after »)
  const orgDuPoste = {};
  let after = 0;
  for (let i = 0; i < 10; i++) {
    const p = await ninjaGet(env, `/v2/devices?df=${dfPostes}&pageSize=1000${after ? "&after=" + after : ""}`);
    const arr = Array.isArray(p) ? p : (p.devices || []);
    arr.forEach(d => { orgDuPoste[d.id] = d.organizationId; });
    if (arr.length < 1000) break;
    after = arr[arr.length - 1].id;
  }

  // 3) État antivirus des postes (tous éditeurs)
  const lignes = await ninjaRequeteToutes(env, `/v2/queries/antivirus-status?df=${dfPostes}&pageSize=1000`, 15);

  // 3 bis) Menaces détectées (facultatif : si NinjaOne refuse, on n'enregistre simplement pas « menaces »)
  let menacesParPoste = null;
  try {
    const menaces = await ninjaRequeteToutes(env, `/v2/queries/antivirus-threats?df=${dfPostes}&pageSize=1000`, 5);
    menacesParPoste = {};
    // Une menace est « traitée » si NinjaOne la dit mise en quarantaine, supprimée, nettoyée, résolue ou autorisée
    const traitee = (m) => /quarant|remov|delet|clean|resolv|allow|block|mitigat/i.test(String(m.status || m.threatStatus || m.state || ""));
    menaces.forEach(m => { if (!traitee(m)) menacesParPoste[m.deviceId] = (menacesParPoste[m.deviceId] || 0) + 1; });
  } catch (e) {
    console.log("antivirus-threats indisponible : " + String((e && e.message) || e).slice(0, 150));
  }

  // 4) Un antivirus « retenu » par poste : actif de préférence, autre que Defender de préférence
  const parPoste = {};
  lignes.forEach(l => { (parPoste[l.deviceId] = parPoste[l.deviceId] || []).push(l); });
  // « NONE » = NinjaOne n'a trouvé aucun antivirus : jamais compté comme une protection
  const actif = (l) => !/^\s*none\s*$/i.test(String(l.productName || "")) && (!l.productState || /^(ON|ENABLED|ACTIVE)$/i.test(String(l.productState)));
  const synthese = {};
  Object.keys(orgDuPoste).forEach(id => {
    const h = hotelDeOrg[orgDuPoste[id]];
    if (!h) return;
    const s = synthese[h.id] = synthese[h.id] || { postes: 0, sans_info: 0, produits: {}, noms: {}, a_jour: 0, def_connues: 0, menaces: 0 };
    s.postes++;
    if (menacesParPoste) s.menaces += menacesParPoste[id] || 0;
    const avs = parPoste[id] || [];
    const choix = avs.filter(actif).find(l => categorieAV(l.productName) !== "defender") || avs.find(actif) || null;
    if (!choix) { s.sans_info++; return; }
    const cat = categorieAV(choix.productName);
    s.produits[cat] = (s.produits[cat] || 0) + 1;
    const nom = String(choix.productName || "?").trim();
    s.noms[nom] = (s.noms[nom] || 0) + 1;
    if (choix.definitionStatus) {
      s.def_connues++;
      if (/up.?to.?date|current|a jour/i.test(String(choix.definitionStatus))) s.a_jour++;
    }
  });

  const maintenant = new Date().toISOString();
  const payload = Object.entries(synthese).map(([id, s]) => {
    const tries = Object.entries(s.produits).sort((a, b) => b[1] - a[1]);
    const horsDefender = tries.filter(([c]) => c !== "defender");
    const principal = (horsDefender[0] || tries[0] || [null])[0];
    const detecte = { le: maintenant, postes: s.postes, sans_info: s.sans_info, produits: s.produits, noms: s.noms, principal };
    if (s.def_connues > 0) detecte.a_jour = s.a_jour;          // seulement si NinjaOne fournit l'état des définitions
    if (menacesParPoste) detecte.menaces = s.menaces;          // seulement si la liste des menaces a pu être lue
    return { id, detecte };
  });

  // 5) Enregistrement en une seule requête
  if (payload.length) {
    await sbJson(env, "rpc/enregistrer_antivirus_detecte", { method: "POST", body: JSON.stringify({ p: payload }) });
  }
  const nomHotel = Object.fromEntries(hotels.map(h => [h.id, h.name]));
  return {
    status: 200,
    body: {
      success: true, postes: Object.keys(orgDuPoste).length, hotels: payload.length,
      menaces_lues: !!menacesParPoste,
      detail: payload.map(x => ({ hotel: nomHotel[x.id], principal: x.detecte.principal, postes: x.detecte.postes, produits: x.detecte.produits, a_jour: x.detecte.a_jour, menaces: x.detecte.menaces }))
        .sort((a, b) => String(a.hotel).localeCompare(String(b.hotel))),
      organisations_sans_hotel: (Array.isArray(orgs) ? orgs : []).filter(o => !hotelDeOrg[o.id]).map(o => o.name),
    },
  };
}
/* ===================== FIN AJOUT : antivirus de tous les PC ===================== */

/* ======================= AJOUT : toutes les machines (tableau de bord) ======================= */
// POST /machines
//   Lit dans NinjaOne TOUS les ordinateurs (postes, serveurs, hôtes VMware/Hyper-V) de toutes les organisations
//   rattachées à un hôtel, avec : dernier contact, OS, mises à jour en attente / en échec / installées sur 30 j,
//   antivirus (tous éditeurs) et état des définitions. Enregistre le tout dans la table « machines »
//   (une ligne par machine NinjaOne) ; les machines qui n'existent plus dans NinjaOne sont retirées.
//   Sert à la note par machine du Tableau de bord hôtels. ~20 sous-requêtes. Lecture seule côté NinjaOne.

const CLASSES_MACHINES = ["WINDOWS_WORKSTATION", "WINDOWS_SERVER", "MAC", "MAC_SERVER", "LINUX_WORKSTATION", "LINUX_SERVER", "VMWARE_VM_HOST", "HYPERV_VMM_HOST"];

async function routeMachines(env) {
  const debut = new Date().toISOString();
  const erreurs = [];
  const essai = async (cle, fn) => { try { return await fn(); } catch (e) { erreurs.push(cle + " : " + String((e && e.message) || e).slice(0, 200)); return null; } };

  // 1) Organisations NinjaOne <-> hôtels du portail
  const orgs = await ninjaGet(env, "/v2/organizations?pageSize=1000");
  const hotels = (await sbJson(env, "hotels?select=id,name,ninjaone_nom")) || [];
  const hotelDeOrg = {};
  (Array.isArray(orgs) ? orgs : []).forEach(o => {
    const n = normNom(o.name);
    const h = hotels.find(x => normNom(x.ninjaone_nom) === n) || hotels.find(x => normNom(x.name) === n);
    if (h) hotelDeOrg[o.id] = h;
  });

  // 2) Tous les appareils (pagination par « after »)
  const devices = [];
  let after = 0, complet = false;
  for (let i = 0; i < 8; i++) {
    const p = await ninjaGet(env, `/v2/devices-detailed?pageSize=1000${after ? "&after=" + after : ""}`);
    const arr = Array.isArray(p) ? p : (p.devices || []);
    arr.forEach(d => { if (CLASSES_MACHINES.includes(String(d.nodeClass || "").toUpperCase()) && hotelDeOrg[d.organizationId]) devices.push(d); });
    if (arr.length < 1000) { complet = true; break; }
    after = arr[arr.length - 1].id;
  }

  // 3) Antivirus, mises à jour en attente / en échec, mises à jour installées depuis 30 jours
  const il30j = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const av = (await essai("antivirus-status", () => ninjaRequeteToutes(env, `/v2/queries/antivirus-status?pageSize=1000`, 8))) || [];
  const enAttente = (await essai("os-patches (approuvés)", () => ninjaRequeteToutes(env, `/v2/queries/os-patches?status=APPROVED&pageSize=1000`, 5))) || [];
  const enEchec = (await essai("os-patches (échecs)", () => ninjaRequeteToutes(env, `/v2/queries/os-patches?status=FAILED&pageSize=1000`, 3))) || [];
  const installes = await essai("os-patch-installs", () => ninjaRequeteToutes(env, `/v2/queries/os-patch-installs?status=INSTALLED&installedAfter=${il30j}&pageSize=1000`, 6));
  // Logiciels tiers (Java, Chrome, Adobe, Zoom…) : nécessite la gestion des correctifs logiciels dans la stratégie NinjaOne.
  // null = requête refusée / non suivie → la colonne reste vide au lieu d'afficher « à jour ».
  const logAtt = await essai("software-patches (approuvés)", () => ninjaRequeteToutes(env, `/v2/queries/software-patches?status=APPROVED&pageSize=1000`, 3));
  const logMan = await essai("software-patches (manuels)", () => ninjaRequeteToutes(env, `/v2/queries/software-patches?status=MANUAL&pageSize=1000`, 2));
  const logEch = await essai("software-patches (échecs)", () => ninjaRequeteToutes(env, `/v2/queries/software-patches?status=FAILED&pageSize=1000`, 1));
  const logSuivi = logAtt !== null && logAtt !== undefined;

  const grouper = l => { const m = {}; l.forEach(x => { (m[x.deviceId] = m[x.deviceId] || []).push(x); }); return m; };
  const avPar = grouper(av);
  const utile = (p) => !/DRIVER|DEFINITION/i.test(String(p.type || ""));
  const attPar = grouper(enAttente.filter(p => /PENDING|APPROVED|MANUAL/i.test(String(p.status || "")) && utile(p)));
  const echPar = grouper(enEchec.filter(p => /FAIL/i.test(String(p.status || "")) && utile(p)));
  const logAttPar = grouper([...(logAtt || []), ...(logMan || [])]);
  const logEchPar = grouper(logEch || []);
  const nomPatch = (p) => String(p.title || p.name || p.productName || p.kbNumber || "").trim();
  const liste = (...ls) => { const v = [...new Set([].concat(...ls).map(nomPatch).filter(Boolean))]; return v.length ? v.slice(0, 15) : null; };
  const limite30 = Date.now() / 1000 - 30 * 86400;
  const majRecente = new Set((installes || []).filter(x => { const t = Number(x.installedAt || x.timestamp || 0); return !t || (t > 1e12 ? t / 1000 : t) >= limite30; }).map(x => x.deviceId));
  const actif = (l) => !/^\s*none\s*$/i.test(String(l.productName || "")) && (!l.productState || /^(ON|ENABLED|ACTIVE)$/i.test(String(l.productState)));

  // 4) Lignes de la table machines
  const lignes = devices.map(d => {
    const cls = String(d.nodeClass || "").toUpperCase();
    const os = d.os || {}, sys = d.system || {};
    const type = /VM_HOST|VMM_HOST/.test(cls) ? "Hôte" : /SERVER/.test(cls) ? "Serveur" : "Poste";
    const avs = avPar[d.id] || [];
    const choix = avs.filter(actif).find(l => categorieAV(l.productName) !== "defender") || avs.find(actif) || null;
    return {
      ninja_id: d.id,
      hotel_id: hotelDeOrg[d.organizationId].id,
      nom: nomCourt(d.systemName || d.dnsName || d.displayName) || String(d.displayName || d.id),
      classe: cls,
      type,
      ip: ipv4(d.ipAddresses)[0] || null,
      os: os.name || (type === "Hôte" ? (/HYPERV/.test(cls) ? "Hyper-V" : "VMware ESXi") + (d.version ? " " + d.version : "") : null),
      os_build: os.buildNumber ? String(os.buildNumber) : null,
      os_release: os.releaseId ? String(os.releaseId) : null,
      fabricant: sys.manufacturer || d.vendor || null,
      modele: sys.model || d.model || null,
      serie: (sys.serialNumber && !/^none$/i.test(sys.serialNumber) ? sys.serialNumber : null) || d.serviceTag || null,
      dernier_contact: ninjaDate(d.lastContact || d.lastUpdate),
      en_ligne: d.offline === false,
      maj_attente: (attPar[d.id] || []).length,
      maj_echec: (echPar[d.id] || []).length,
      maj_30j: installes ? majRecente.has(d.id) : null,
      maj_liste: liste(echPar[d.id] || [], attPar[d.id] || []),
      log_attente: logSuivi ? (logAttPar[d.id] || []).length : null,
      log_echec: logSuivi ? (logEchPar[d.id] || []).length : null,
      log_liste: logSuivi ? liste(logEchPar[d.id] || [], logAttPar[d.id] || []) : null,
      av_nom: choix ? String(choix.productName || "").trim() || null : null,
      av_actif: type === "Hôte" ? null : !!choix,
      av_def_ok: choix && choix.definitionStatus ? /up.?to.?date|current/i.test(String(choix.definitionStatus)) : null,
      maj_le: debut,
    };
  });

  // 5) Enregistrement par lots de 500, puis retrait des machines disparues de NinjaOne
  for (let i = 0; i < lignes.length; i += 500) {
    await sbJson(env, "machines?on_conflict=ninja_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(lignes.slice(i, i + 500)) });
  }
  if (complet && lignes.length > 0) {
    await sbJson(env, `machines?maj_le=lt.${encodeURIComponent(debut)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(e => erreurs.push("retrait des machines disparues : " + e.message));
  }
  const parHotel = {};
  lignes.forEach(l => { parHotel[l.hotel_id] = (parHotel[l.hotel_id] || 0) + 1; });
  return {
    status: 200,
    body: {
      success: true, machines: lignes.length, hotels: Object.keys(parHotel).length, lecture_complete: complet, erreurs,
      organisations_sans_hotel: (Array.isArray(orgs) ? orgs : []).filter(o => !hotelDeOrg[o.id]).map(o => o.name),
    },
  };
}
/* ===================== FIN AJOUT : toutes les machines ===================== */

/* --------------------------------- Entrée --------------------------------- */

export default {
  async fetch(request, rawEnv) {
    const env = { ...rawEnv };
    for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NINJA_CLIENT_ID", "NINJA_CLIENT_SECRET"]) if (typeof env[k] === "string") env[k] = env[k].trim();
    const url = new URL(request.url);
    try {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
      if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "dsi-hotel-inventaire" }, env);
      if (request.method !== "POST") return json({ error: "Méthode non autorisée" }, env, 405);
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurés." }, env, 500);
      const auth = await verifierAdmin(request, env);
      if (!auth.ok) return json({ error: auth.error }, env, auth.status);
      const body = await request.json().catch(() => ({}));
      if (url.pathname === "/apercu") { const r = await routeApercu(env, body, auth.user); return json(r.body, env, r.status); }
      if (url.pathname === "/importer") { const r = await routeImporter(env, body, auth.user); return json(r.body, env, r.status); }
      if (url.pathname === "/antivirus-postes") { const r = await routeAntivirusPostes(env); return json(r.body, env, r.status); }
      if (url.pathname === "/machines") { const r = await routeMachines(env); return json(r.body, env, r.status); }
      return json({ error: "Route inconnue" }, env, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, env, (e && e.status) || 502);
    }
  },
};