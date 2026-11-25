/**
 * dsi-hotel-sophos.js
 * ---------------------------------------------------------------------------
 * Worker Cloudflare : supervision Sophos Central de tous les hôtels
 * (UN compte Sophos Central par hôtel) — compatible plan GRATUIT.
 *
 * COMPTE SOPHOS PARTAGÉ (plusieurs hôtels dans un même Sophos Central)
 *   Chaque hôtel a sa ligne sophos_comptes (mêmes identifiants) + des règles
 *   (groupes Sophos, préfixes de nom, domaines utilisateur, plages IP). Le
 *   compte est synchronisé une seule fois et les PC sont répartis :
 *   affectation manuelle > groupe > préfixe > domaine > IP ; sinon « non affecté ».
 *   Les alertes suivent leur PC ; les alertes générales vont à l'hôtel principal.
 *
 * FONCTIONNEMENT
 *   - Cron toutes les 2 min : on prend les N hôtels contrôlés il y a le plus
 *     longtemps (N = HOTELS_PAR_PASSAGE, défaut 4) et on les synchronise.
 *     Pas d'état KV : la colonne sophos_comptes.dernier_controle sert de file
 *     d'attente. ~40 hôtels ≈ un tour complet toutes les 27 min avec N=3.
 *     (Limite du plan gratuit : 50 sous-requêtes par exécution ; un hôtel en
 *     consomme ~7 à 8, plus ~3 par ticket créé, d'où des lots de 3.)
 *   - Par hôtel : jeton OAuth Sophos, alertes ouvertes, état des postes,
 *     enregistrement dans Supabase (tables sophos_*).
 *   - Nouvelles alertes de SÉCURITÉ de sévérité ALERTE_SEVERITES (défaut "high") :
 *     UN ticket « Cyber Sécurité » (priorité Urgent) PAR HÔTEL dans le portail,
 *     rattaché au bon établissement (sophos_alertes.ticket_id évite les doublons),
 *     puis UN email récapitulatif à ALERTE_DEST (défaut team@dsihotel.fr).
 *     TICKETS_SOPHOS = "non" désactive les tickets (email seul).
 *   - Alertes de LICENCE (expirée / bientôt expirée) : classées à part
 *     (colonne licence = true), jamais d'email immédiat ; un récapitulatif
 *     hebdomadaire est envoyé le lundi vers 8h (heure de Paris).
 *     À la toute première synchronisation d'un hôtel, les alertes existantes
 *     sont enregistrées sans email (pas d'avalanche).
 *
 * SÉCURITÉ
 *   - Le secret API de chaque hôtel est chiffré (AES-GCM) avec SOPHOS_ENC_KEY
 *     avant d'être stocké dans Supabase ; il n'est jamais renvoyé au portail.
 *   - Les routes POST exigent une session ADMIN du portail (Bearer Supabase).
 *
 * VARIABLES (Cloudflare → Worker → Settings → Variables and Secrets)
 *   SUPABASE_URL              (Texte)
 *   SUPABASE_SERVICE_ROLE_KEY (Secret)
 *   SOPHOS_ENC_KEY            (Secret)  clé AES 256 bits en base64 (voir guide)
 *   MS_TENANT_ID              (Texte)   mêmes valeurs que dsi-hotel-api-v2
 *   MS_CLIENT_ID              (Texte)
 *   MS_CLIENT_SECRET          (Secret)
 *   MS_SENDER                 (Texte, optionnel) défaut support@dsihotel.fr
 *   ALERTE_DEST               (Texte, optionnel) défaut team@dsihotel.fr
 *   ALERTE_SEVERITES          (Texte, optionnel) défaut "high" (ex. "high,medium")
 *   HOTELS_PAR_PASSAGE        (Texte, optionnel) défaut 3 (4 sans les tickets automatiques)
 *   TICKETS_SOPHOS            (Texte, optionnel) défaut "oui" ; "non" = email seul
 *   SEUIL_MUET_JOURS          (Texte, optionnel) défaut 7
 *   NINJA_CLIENT_ID           (Texte)   NinjaOne : API Services, scope Monitoring, Client credentials
 *   NINJA_CLIENT_SECRET       (Secret)
 *   NINJA_HOST                (Texte, optionnel) défaut : essaie https://eu.ninjarmm.com puis https://dsihotel.rmmservice.eu
 *   NINJA_CONSOLE_URL         (Texte, optionnel) défaut https://dsihotel.rmmservice.eu (liens vers les fiches PC)
 *   PORTAIL_ORIGIN            (Texte, optionnel) défaut https://portail.dsihotel.com
 *   NINJA_USER_CLIENT_ID      (Texte)   NinjaOne : 2e application « Web » (Authorization code + Refresh token,
 *                             scopes Monitoring + Management), redirect URI <worker>/ninja/callback
 *   NINJA_USER_CLIENT_SECRET  (Secret)
 *   NINJA_SCRIPT_AD_UNLOCK    (Texte) ID du script NinjaOne « DSI - Deverrouiller compte AD » (bibliothèque
 *                             d'automatisation). Le script écrit son résultat dans le champ personnalisé
 *                             d'appareil NINJA_CHAMP_AD_UNLOCK (défaut « dsiAdUnlock »).
 *   NINJA_CHAMP_AD_UNLOCK     (Texte, optionnel) nom du champ personnalisé, défaut dsiAdUnlock
 *   NINJA_SCRIPT_AD_UNLOCK_NOM (Texte, optionnel) nom exact du script NinjaOne, défaut « DSI - Deverrouiller compte AD » :
 *                             le Worker refuse de lancer l'ID configuré s'il ne porte pas ce nom.
 *   NINJA_SCRIPT_TELECHARGEMENTS (Texte) ID du script NinjaOne « Vider Téléchargements » (bibliothèque
 *                             d'automatisation). Le client API NinjaOne doit aussi avoir le scope « Management ».
 *
 * CRON : "*\/2 * * * *"  (Settings → Triggers → Cron Triggers)
 *
 * ROUTES (session admin requise)
 *   POST /compte        { hotelId, clientId, clientSecret?, actif }  enregistre + teste + synchronise
 *   POST /supprimer     { hotelId }                                   supprime le compte et ses données
 *   POST /synchroniser  { hotelId }                                   synchronise un hôtel maintenant
 *   POST /affecter      { tenantId, items:[{sophosId,hostname,hotelId}] }  affectation manuelle (compte partagé)
 *   POST /run                                                         lance un lot (comme le cron)
 *   POST /recap-licences                                              envoie le récap licences maintenant
 *   POST /ninja-postes  { hostnames: [...], detail }                  état des postes dans NinjaOne
 *                       (10 postes max avec détail, 20 sans détail)
 *   POST /ninja-org     { hotelId }                                   tous les postes/serveurs NinjaOne de
 *                       l'organisation de l'hôtel (champ « Nom NinjaOne », sinon nom de l'hôtel),
 *                       pour repérer les PC où Sophos manque
 *   POST /tamper       { hotelId, sophosIds: [...], action }         protection anti-altération des PC :
 *                       action "desactiver" | "activer" (25 PC max) ou "motdepasse" (1 PC).
 *                       Exige des identifiants API Sophos avec le rôle « Service Principal
 *                       Management » (ou Super Admin) : le rôle Read-Only ne suffit pas.
 *   POST /scan         { hotelId, sophosIds: [...] }                 lance une analyse complète (scan à la
 *                       demande) sur les PC (25 max). Même rôle API requis que /tamper.
 *   POST /supprimer-postes { tenantId, sophosIds: [...] }            supprime les PC de Sophos Central
 *                       (25 max). Refusé pour un PC vu par Sophos depuis moins de SEUIL_MUET_JOURS.
 *                       Même rôle API requis que /tamper.
 *   POST /ad-deverrouiller { hotelId, compte, mode }                 lance sur le contrôleur de domaine de
 *                       l'hôtel (NinjaOne) le diagnostic du compte AD, et son déverrouillage si
 *                       mode = "deverrouiller" (mode "diagnostic" = lecture seule). Renvoie { deviceId, jeton }.
 *   POST /ad-resultat   { deviceId, jeton }                          lit le résultat écrit par le script
 *                       (à interroger toutes les quelques secondes : { pret:false } tant qu'il tourne).
 *   POST /vider-telechargements { hostnames: [...] }                 vide le dossier Téléchargements de
 *                       tous les profils des PC (15 max), via un script NinjaOne exécuté en SYSTEM.
 *   POST /capex-inventaire { hotelId, simulation }               inventaire NinjaOne de l'hôtel : machines
 *                       de 3 à 5 ans et de plus de 5 ans -> 2 lignes CAPEX (simulation:true = aperçu sans écrire).
 *                       Automatique du 1er au 7 de chaque mois (cron, 3 hôtels par passage, minute multiple de 4).
 *   GET  /health
 * ---------------------------------------------------------------------------
 */

// Clés Supabase : accepte l'ancienne clé service_role (JWT « eyJ… ») ET la nouvelle clé secrète « sb_secret_… ».
// Une clé sb_ n'est pas un JWT : elle passe seulement dans l'en-tête apikey, jamais en « Authorization: Bearer ».
const PORTAIL_ORIGIN_DEFAUT = "https://portail.dsihotel.com";
const SOPHOS_TOKEN_URL = "https://id.sophos.com/api/v2/oauth2/token";
const SOPHOS_WHOAMI_URL = "https://api.central.sophos.com/whoami/v1";
const MS_SENDER_DEFAUT = "support@dsihotel.fr";
const MS_REPLY_TO_DEFAUT = "support@dsihotel.com";
const ALERTE_DEST_DEFAUT = "team@dsihotel.fr";
const PORTAIL_URL = "https://portail.dsihotel.com";
const RETENTION_ALERTES_RESOLUES_JOURS = 90;
const TICKETS_HOTELS_MAX = 4; // tickets créés par passage au plus (le reste au passage suivant)

/* =============================== Utilitaires ================================ */

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": (env && env.PORTAIL_ORIGIN) || PORTAIL_ORIGIN_DEFAUT,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
function json(body, env, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}
function echapper(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function nombre(v, defaut) { const n = parseInt(v, 10); return isNaN(n) || n <= 0 ? defaut : n; }

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
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Supabase ${r.status} (${path.split("?")[0]}) ${t.slice(0, 200)}`);
  }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

/* ============================ Chiffrement AES-GCM ============================ */

function b64ToBytes(b64) {
  const bin = atob(String(b64 || "").trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
async function cleAes(env) {
  if (!env.SOPHOS_ENC_KEY) throw new Error("SOPHOS_ENC_KEY non configurée sur le Worker.");
  const raw = b64ToBytes(env.SOPHOS_ENC_KEY);
  if (raw.length !== 32) throw new Error("SOPHOS_ENC_KEY doit faire 32 octets (base64).");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function chiffrer(env, texte) {
  const cle = await cleAes(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, new TextEncoder().encode(texte)));
  return bytesToB64(iv) + ":" + bytesToB64(ct);
}
async function dechiffrer(env, valeur) {
  const [ivB64, ctB64] = String(valeur || "").split(":");
  if (!ivB64 || !ctB64) throw new Error("Secret chiffré invalide.");
  const cle = await cleAes(env);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(ivB64) }, cle, b64ToBytes(ctB64));
  return new TextDecoder().decode(pt);
}

/* ================================ API Sophos ================================= */

async function sophosToken(clientId, clientSecret) {
  const res = await fetch(SOPHOS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "token",
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error("Connexion Sophos refusée (" + res.status + ") : vérifiez l'ID client et le secret" +
      (data.message ? " — " + data.message : ""));
  }
  return data.access_token;
}

async function sophosWhoami(token) {
  const res = await fetch(SOPHOS_WHOAMI_URL, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("whoami Sophos (" + res.status + ")");
  if (data.idType !== "tenant") {
    throw new Error("Identité API de type « " + (data.idType || "?") + " » : créez-la dans le compte Sophos Central de l'hôtel (type tenant attendu).");
  }
  const host = data.apiHosts && data.apiHosts.dataRegion;
  if (!host) throw new Error("Région de données Sophos introuvable (whoami).");
  return { tenantId: data.id, apiHost: host };
}

async function sophosGet(token, compte, chemin) {
  const res = await fetch(compte.api_host + chemin, {
    headers: { Authorization: `Bearer ${token}`, "X-Tenant-ID": compte.tenant_id, Accept: "application/json" },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error("Sophos " + res.status + " " + chemin.split("?")[0] + " " + t.slice(0, 150));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function sophosEnvoyer(token, compte, chemin, corps) {
  const res = await fetch(compte.api_host + chemin, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Tenant-ID": compte.tenant_id, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(corps || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("Sophos " + res.status + " " + (data.message || data.error || ""));
    err.status = res.status;
    throw err;
  }
  return data;
}

// Liste paginée (pageFromKey / nextKey). maxPages limite les sous-requêtes.
async function sophosListe(token, compte, chemin, maxPages) {
  const items = [];
  let cle = null, complet = true;
  for (let p = 0; p < maxPages; p++) {
    const sep = chemin.includes("?") ? "&" : "?";
    const data = await sophosGet(token, compte, chemin + (cle ? sep + "pageFromKey=" + encodeURIComponent(cle) : ""));
    (data.items || []).forEach(i => items.push(i));
    cle = data.pages && data.pages.nextKey;
    if (!cle) return { items, complet: true };
    complet = false;
  }
  return { items, complet };
}

/* ============================ Synchronisation ============================ */

// Alerte de licence / abonnement (expirée, bientôt expirée, quota dépassé…) ?
// Ce ne sont pas des menaces : elles sont rangées à part dans le portail.
function estAlerteLicence(a) {
  const txt = [a.type, a.description, a.category].filter(Boolean).join(" ");
  return /licen[cs]e|subscription|abonnement|\bexpir/i.test(txt);
}

// ---------- Compte Sophos partagé par plusieurs hôtels : règles d'affectation ----------
// regles = { groupes: [], prefixes: [], domaines: [], ips: [] } (insensible à la casse)
function listeRegle(regles, cle) {
  const v = regles && regles[cle];
  return (Array.isArray(v) ? v : String(v || "").split(/[\n,;]/))
    .map(x => String(x).trim().toUpperCase()).filter(Boolean);
}
function infosPoste(p) {
  const user = (p.associatedPerson && (p.associatedPerson.viaLogin || p.associatedPerson.name)) || "";
  const domaine = user.includes("\\") ? user.split("\\")[0].trim().toUpperCase() : "";
  const ips = Array.isArray(p.ipv4Addresses) ? p.ipv4Addresses : [];
  return { user, domaine, ips, groupe: (p.group && p.group.name) || "" };
}
// Renvoie { hotelId, mode } ou { hotelId: null, mode: null }
function affecterPoste(p, comptes, manuel) {
  const id = String(p.id);
  if (manuel.has(id)) {
    const h = manuel.get(id);
    return h ? { hotelId: h, mode: "manuel" } : { hotelId: null, mode: "ignore" }; // null = ignoré volontairement
  }
  const nom = String(p.hostname || "").toUpperCase();
  const inf = infosPoste(p);
  const essais = [
    ["groupe",  c => inf.groupe && listeRegle(c.regles, "groupes").includes(inf.groupe.toUpperCase())],
    ["prefixe", c => nom && listeRegle(c.regles, "prefixes").some(x => nom.startsWith(x))],
    ["domaine", c => inf.domaine && listeRegle(c.regles, "domaines").some(x => x.replace(/\\+$/, "") === inf.domaine)],
    ["ip",      c => inf.ips.length && listeRegle(c.regles, "ips").some(x => inf.ips.some(ip => ip.startsWith(x)))],
  ];
  for (const [mode, test] of essais) {
    const c = comptes.find(test);
    if (c) return { hotelId: c.hotel_id, mode };
  }
  if (comptes.length === 1) return { hotelId: comptes[0].hotel_id, mode: "unique" };
  return { hotelId: null, mode: null };
}

// Synchronise UN compte Sophos (tenant) et répartit postes/alertes entre les
// hôtels qui le partagent. `comptes` = toutes les lignes sophos_comptes actives
// de ce tenant (une seule dans le cas habituel « 1 compte = 1 hôtel »).
async function synchroniserTenant(env, comptes) {
  const debut = new Date().toISOString();
  const ref = comptes[0];
  const premiere = comptes.every(c => !c.dernier_controle);
  const seuilMuet = Date.now() - nombre(env.SEUIL_MUET_JOURS, 7) * 86400000;
  const ids = comptes.map(c => c.id);
  try {
    const secret = await dechiffrer(env, ref.client_secret_chiffre);
    const token = await sophosToken(ref.client_id, secret);
    if (!ref.tenant_id || !ref.api_host) {
      const w = await sophosWhoami(token);
      comptes.forEach(c => { c.tenant_id = w.tenantId; c.api_host = w.apiHost; });
    }
    const tenant = ref.tenant_id;
    const T = encodeURIComponent(tenant);

    // --- Données Sophos ---
    const alertes = await sophosListe(token, ref, "/common/v1/alerts?pageSize=100", 3);
    let postes;
    try {
      postes = await sophosListe(token, ref,
        "/endpoint/v1/endpoints?pageSize=500&fields=id,hostname,type,os,health,lastSeenAt,tamperProtectionEnabled,group,associatedPerson,ipv4Addresses", 2);
    } catch (e) {
      if (e.status !== 400) throw e;
      postes = await sophosListe(token, ref, "/endpoint/v1/endpoints?pageSize=500", 2);
    }

    // --- Affectations manuelles (seulement si le compte est partagé) ---
    const manuel = new Map();
    if (comptes.length > 1) {
      const aff = await sbJson(env, `sophos_affectations?select=sophos_id,hotel_id&tenant_id=eq.${T}`).catch(() => []);
      (aff || []).forEach(a => manuel.set(String(a.sophos_id), a.hotel_id));
    }
    // L'hôtel principal reçoit les alertes générales (sans PC) du compte.
    const principal = (comptes.find(c => c.principal !== false) || ref).hotel_id;

    // --- Postes ---
    const hotelDuPoste = {};
    const lignesPostes = postes.items.map(p => {
      const os = p.os ? [p.os.name || p.os.platform, p.os.majorVersion != null ? p.os.majorVersion : ""].filter(Boolean).join(" ") : null;
      const inf = infosPoste(p);
      const aff = affecterPoste(p, comptes, manuel);
      hotelDuPoste[String(p.id)] = aff.hotelId;
      return {
        tenant_id: tenant,
        hotel_id: aff.hotelId,
        affectation: aff.mode,
        sophos_id: String(p.id),
        hostname: p.hostname || null,
        type: p.type || null,
        os: os || null,
        health: (p.health && p.health.overall) || "unknown",
        threats_status: (p.health && p.health.threats && p.health.threats.status) || null,
        services_status: (p.health && p.health.services && p.health.services.status) || null,
        tamper_protection: typeof p.tamperProtectionEnabled === "boolean" ? p.tamperProtectionEnabled : null,
        last_seen_at: p.lastSeenAt || null,
        groupe: inf.groupe || null,
        dernier_utilisateur: inf.user || null,
        ips: inf.ips.join(", ") || null,
        maj_le: debut,
      };
    });
    if (lignesPostes.length) {
      await sbJson(env, "sophos_postes?on_conflict=tenant_id,sophos_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(lignesPostes),
      });
    }
    if (postes.complet) {
      await sbJson(env, `sophos_postes?tenant_id=eq.${T}&maj_le=lt.${encodeURIComponent(debut)}`, {
        method: "DELETE", headers: { Prefer: "return=minimal" },
      });
    }

    // --- Alertes : suivent le PC concerné, sinon l'hôtel principal ---
    const lignesAlertes = alertes.items.map(a => {
      const agent = a.managedAgent && a.managedAgent.id ? String(a.managedAgent.id) : null;
      const l = {
        tenant_id: tenant,
        hotel_id: (agent && hotelDuPoste[agent]) || principal,
        sophos_id: String(a.id),
        severity: a.severity || null,
        category: a.category || null,
        type: a.type || null,
        description: a.description || null,
        product: a.product || null,
        poste: (a.managedAgent && a.managedAgent.name) || (a.person && a.person.name) || null,
        raised_at: a.raisedAt || null,
        statut: "ouverte",
        resolue_le: null,
        vue_le: debut,
        licence: estAlerteLicence(a),
      };
      if (premiere) l.notifiee = true; // 1re synchro : pas d'email pour l'existant
      return l;
    });
    if (lignesAlertes.length) {
      await sbJson(env, "sophos_alertes?on_conflict=tenant_id,sophos_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(lignesAlertes),
      });
    }
    if (alertes.complet) {
      await sbJson(env, `sophos_alertes?tenant_id=eq.${T}&statut=eq.ouverte&vue_le=lt.${encodeURIComponent(debut)}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ statut: "resolue", resolue_le: debut }),
      });
    }

    // --- Synthèse par hôtel ---
    const resultats = [];
    for (const c of comptes) {
      const lp = lignesPostes.filter(p => p.hotel_id === c.hotel_id);
      const la = lignesAlertes.filter(a => a.hotel_id === c.hotel_id);
      const stats = {
        nb_postes: lp.length,
        nb_postes_ko: lp.filter(p => p.health === "bad").length,
        nb_postes_suspects: lp.filter(p => p.health === "suspicious").length,
        nb_postes_muets: lp.filter(p => p.last_seen_at && new Date(p.last_seen_at).getTime() < seuilMuet).length,
        nb_alertes: la.filter(a => !a.licence).length,
        nb_alertes_hautes: la.filter(a => !a.licence && a.severity === "high").length,
        nb_licences: la.filter(a => a.licence).length,
      };
      await sbJson(env, `sophos_comptes?id=eq.${c.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          ...stats, tenant_id: c.tenant_id, api_host: c.api_host,
          dernier_controle: debut, dernier_statut: "ok", derniere_erreur: null, updated_at: debut,
        }),
      });
      resultats.push({ ok: true, hotel_id: c.hotel_id, ...stats });
    }
    const nonAffectes = lignesPostes.filter(p => !p.hotel_id).length;
    return { ok: true, tenant_id: tenant, resultats, non_affectes: nonAffectes };
  } catch (e) {
    const msg = String((e && e.message) || e).slice(0, 500);
    try {
      await sb(env, `sophos_comptes?id=in.(${ids.join(",")})`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ dernier_controle: debut, dernier_statut: "erreur", derniere_erreur: msg, updated_at: debut }),
      });
    } catch (_) {}
    return { ok: false, erreur: msg, resultats: comptes.map(c => ({ ok: false, hotel_id: c.hotel_id, erreur: msg })) };
  }
}

// Toutes les lignes actives qui partagent le compte Sophos de `compte`.
async function comptesDuTenant(env, compte) {
  if (!compte.tenant_id) return [compte];
  const liste = await sbJson(env,
    `sophos_comptes?select=${COLONNES_COMPTE}&tenant_id=eq.${encodeURIComponent(compte.tenant_id)}&actif=eq.true&order=created_at.asc`);
  const arr = Array.isArray(liste) && liste.length ? liste : [compte];
  if (!arr.some(c => c.id === compte.id)) arr.push(compte);
  return arr;
}

// Compatibilité : synchronise l'hôtel (et les autres hôtels de son compte Sophos).
async function synchroniserHotel(env, compte) {
  const comptes = await comptesDuTenant(env, compte);
  const r = await synchroniserTenant(env, comptes);
  const mien = (r.resultats || []).find(x => x.hotel_id === compte.hotel_id) || { ok: r.ok, hotel_id: compte.hotel_id, erreur: r.erreur };
  return { ...mien, partage: comptes.length > 1, hotels_du_compte: comptes.map(c => c.hotel_id), non_affectes: r.non_affectes };
}

/* ============================== Email (Graph) ============================== */

async function msToken(env) {
  const res = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MS_CLIENT_ID, client_secret: env.MS_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Token Graph : " + (data.error_description || res.status));
  return data.access_token;
}

async function envoyerEmail(env, sujet, html) {
  const sender = (env.MS_SENDER || MS_SENDER_DEFAUT).trim();
  const dest = String(env.ALERTE_DEST || ALERTE_DEST_DEFAUT).split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const token = await msToken(env);
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: sujet,
        body: { contentType: "HTML", content: html },
        toRecipients: dest.map(address => ({ emailAddress: { address } })),
        replyTo: [{ emailAddress: { address: MS_REPLY_TO_DEFAUT } }],
        from: { emailAddress: { name: "DSI Hotel — Sophos", address: sender } },
      },
      saveToSentItems: true,
    }),
  });
  if (res.status !== 202) {
    const t = await res.text().catch(() => "");
    throw new Error("Envoi Graph " + res.status + " " + t.slice(0, 200));
  }
}

// Ticket « Cyber Sécurité » urgent pour UN hôtel et ses nouvelles alertes hautes.
function libSev(s) { return s === "high" ? "Haute" : s === "medium" ? "Moyenne" : s === "low" ? "Faible" : (s || ""); }
function dateParis(iso) { return iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—"; }

async function creerTicketSophos(env, hotelId, nomHotel, alertes) {
  const n = alertes.length;
  const premiere = alertes[0];
  const sujet = n === 1
    ? `🔴 [Sophos] ${(premiere.description || premiere.category || "Alerte de sécurité").slice(0, 120)}${premiere.poste ? " — " + premiere.poste : ""}`
    : `🔴 [Sophos] ${n} nouvelles alertes de sécurité`;
  const message = `ALERTE SOPHOS — ${n} nouvelle${n > 1 ? "s" : ""} alerte${n > 1 ? "s" : ""} de sécurité` + (nomHotel ? ` — ${nomHotel}` : "") + "\n\n" +
    alertes.map(a => `• [${libSev(a.severity)}] ${a.description || a.category || "(sans description)"} — poste : ${a.poste || "—"} — ${dateParis(a.raised_at)}`).join("\n") +
    "\n\nTicket créé automatiquement par la supervision Sophos (Pilotage → Sécurité Sophos).";
  const td = 'style="padding:7px 10px;border:1px solid #F5B5B5;vertical-align:top;"';
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">` +
    `<div style="background:#C53030;color:#ffffff;border-radius:8px;padding:14px 16px;margin-bottom:14px;">` +
      `<div style="font-size:16px;font-weight:bold;">🔴 ALERTE SOPHOS — ${n} NOUVELLE${n > 1 ? "S" : ""} ALERTE${n > 1 ? "S" : ""} DE SÉCURITÉ</div>` +
      `<div style="font-size:13px;margin-top:4px;">${echapper(nomHotel || "")} — une intervention est nécessaire.</div>` +
    `</div>` +
    `<table style="border-collapse:collapse;width:100%;font-size:13px;">` +
      `<tr>` + ["Sévérité", "Alerte", "Poste", "Date"].map(h => `<th style="padding:7px 10px;border:1px solid #F5B5B5;background:#FDECEC;color:#9B2C2C;text-align:left;">${h}</th>`).join("") + `</tr>` +
      alertes.map(a => `<tr><td ${td}><b style="color:${a.severity === "high" ? "#C53030" : "#B7791F"}">${echapper(libSev(a.severity))}</b></td>` +
        `<td ${td}>${echapper(a.description || a.category || "")}</td><td ${td}>${echapper(a.poste || "—")}</td>` +
        `<td ${td} style="white-space:nowrap">${echapper(dateParis(a.raised_at))}</td></tr>`).join("") +
    `</table>` +
    `<div style="margin-top:14px;padding:10px 14px;border-left:4px solid #C53030;background:#FFF5F5;font-size:13px;line-height:1.6;">` +
      `<b>À faire :</b> analyser l'alerte dans Sophos Central, isoler ou nettoyer le poste si nécessaire, puis noter l'action dans l'onglet Sécurité Sophos du portail (« Prendre en charge » + note).` +
    `</div></div>`;
  const rows = await sbJson(env, "tickets", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({
    hotel_id: hotelId, contact_name: "Alerte Sophos", contact_email: ALERTE_DEST_DEFAUT,
    category: "Cyber Sécurité", priority: "Urgent", subject: sujet, message, status: "open", source: "sophos",
  }) });
  const ticket = Array.isArray(rows) ? rows[0] : rows;
  if (!ticket || !ticket.id) throw new Error("ticket non créé");
  await sb(env, "ticket_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
    ticket_id: ticket.id, sender_role: "client", sender_name: "Alerte Sophos", body: message, body_html: html,
  }) });
  await sbJson(env, `sophos_alertes?id=in.(${alertes.map(a => a.id).join(",")})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ticket_id: String(ticket.id), ticket_ref: ticket.reference || null }),
  });
  return ticket;
}

// Nouvelles alertes (non notifiées) des hôtels donnés : UN ticket par hôtel, puis UN email récapitulatif.
async function notifierNouvellesAlertes(env, hotelIds) {
  if (!hotelIds.length) return 0;
  const sev = String(env.ALERTE_SEVERITES || "high").split(",").map(s => s.trim()).filter(Boolean);
  const avecTickets = String(env.TICKETS_SOPHOS || "oui").trim().toLowerCase() !== "non";
  let nouvelles = await sbJson(env,
    `sophos_alertes?select=id,hotel_id,severity,category,description,poste,raised_at${avecTickets ? ",ticket_id,ticket_ref" : ""}` +
    `&notifiee=eq.false&statut=eq.ouverte&licence=eq.false&severity=in.(${sev.join(",")})` +
    `&hotel_id=in.(${hotelIds.join(",")})&order=raised_at.desc&limit=200`);
  if (!nouvelles || !nouvelles.length) return 0;

  const hotels = await sbJson(env, `hotels?select=id,name&id=in.(${[...new Set(nouvelles.map(a => a.hotel_id))].join(",")})`);
  const nom = {}; (hotels || []).forEach(h => { nom[h.id] = h.name; });

  // 1) Tickets : un par hôtel, au plus TICKETS_HOTELS_MAX par passage.
  //    Les hôtels au-delà sont laissés « non notifiés » et traités au passage suivant.
  const ticketDe = {}; // hotel_id -> référence du ticket
  if (avecTickets) {
    const parHotel = {};
    nouvelles.forEach(a => { (parHotel[a.hotel_id] = parHotel[a.hotel_id] || []).push(a); });
    const traites = new Set();
    let crees = 0;
    for (const hid of Object.keys(parHotel)) {
      const sans = parHotel[hid].filter(a => !a.ticket_id);
      const deja = parHotel[hid].find(a => a.ticket_id);
      if (!sans.length) { traites.add(hid); if (deja) ticketDe[hid] = deja.ticket_ref || deja.ticket_id; continue; }
      if (crees >= TICKETS_HOTELS_MAX) continue;
      try {
        const t = await creerTicketSophos(env, hid, nom[hid], sans);
        ticketDe[hid] = t.reference || t.id;
        crees++;
        traites.add(hid);
      } catch (e) {
        console.log("Ticket Sophos (" + (nom[hid] || hid) + ") : " + ((e && e.message) || e));
        traites.add(hid); // l'email part quand même ; pas de nouvel essai pour éviter les doublons
      }
    }
    nouvelles = nouvelles.filter(a => traites.has(String(a.hotel_id)));
    if (!nouvelles.length) return 0;
  }

  const lignes = nouvelles.map(a =>
    `<tr>` +
    `<td style="padding:6px 10px;border:1px solid #E2E2E8;font-weight:600;color:${a.severity === "high" ? "#C53030" : "#B7791F"}">${echapper(a.severity === "high" ? "Haute" : a.severity === "medium" ? "Moyenne" : a.severity)}</td>` +
    `<td style="padding:6px 10px;border:1px solid #E2E2E8"><b>${echapper(nom[a.hotel_id] || "?")}</b></td>` +
    `<td style="padding:6px 10px;border:1px solid #E2E2E8">${echapper(a.description || a.category || "")}</td>` +
    `<td style="padding:6px 10px;border:1px solid #E2E2E8">${echapper(a.poste || "—")}</td>` +
    `<td style="padding:6px 10px;border:1px solid #E2E2E8;white-space:nowrap">${a.raised_at ? new Date(a.raised_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—"}</td>` +
    (avecTickets ? `<td style="padding:6px 10px;border:1px solid #E2E2E8;white-space:nowrap">${echapper(ticketDe[a.hotel_id] || "—")}</td>` : "") +
    `</tr>`).join("");
  const nbHotels = new Set(nouvelles.map(a => a.hotel_id)).size;
  const sujet = `[Sophos] ${nouvelles.length} nouvelle${nouvelles.length > 1 ? "s" : ""} alerte${nouvelles.length > 1 ? "s" : ""}` +
    (nbHotels === 1 ? " — " + (nom[nouvelles[0].hotel_id] || "") : ` sur ${nbHotels} établissements`);
  const html =
    `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#222">` +
    `<p>Bonjour,</p><p>Sophos Central a remonté de <b>nouvelles alertes</b> :</p>` +
    `<table style="border-collapse:collapse;margin:10px 0;width:100%">` +
    `<thead><tr>` + ["Sévérité", "Établissement", "Alerte", "Poste", "Date"].concat(avecTickets ? ["Ticket"] : []).map(h =>
      `<th style="padding:6px 10px;border:1px solid #E2E2E8;background:#F4F4F9;text-align:left">${h}</th>`).join("") +
    `</tr></thead><tbody>${lignes}</tbody></table>` +
    `<p><a href="${PORTAIL_URL}" style="display:inline-block;background:#C9A84C;color:#111;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:6px">Ouvrir le portail → Pilotage → Sécurité Sophos</a></p>` +
    `<p style="color:#999;font-size:12px">Message automatique — supervision Sophos DSI Hotel.</p></div>`;

  await envoyerEmail(env, sujet, html);
  await sbJson(env, `sophos_alertes?id=in.(${nouvelles.map(a => a.id).join(",")})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ notifiee: true }),
  });
  return nouvelles.length;
}

/* ============================== NinjaOne (RMM) ============================== */
// Recherche à la demande des postes « muets » de Sophos dans NinjaOne, pour
// savoir si le PC est allumé (agent Sophos cassé) ou éteint / disparu.
// Un seul compte NinjaOne pour tous les hôtels -> une seule identité API
// (scope "monitoring", lecture seule, grant "client_credentials").

const NINJA_HOSTS_DEFAUT = ["https://eu.ninjarmm.com", "https://dsihotel.rmmservice.eu"];
const NINJA_CONSOLE_DEFAUT = "https://dsihotel.rmmservice.eu";
// Postes par appel (limite de 50 sous-requêtes du plan gratuit) :
// avec détail = 2 sous-requêtes/poste, sans détail = 1.
const NINJA_MAX_POSTES = 10;
const NINJA_MAX_POSTES_SIMPLE = 20;

let ninjaCache = null; // { host, token, expire } — réutilisé tant que le Worker reste chaud
let ninjaCacheGestion = null; // jeton avec le scope « management » (exécution de scripts)

// Jeton NinjaOne avec le scope « management » : séparé du jeton de lecture, pour qu'une
// absence de ce scope ne casse pas la supervision (le reste du Worker reste en « monitoring »).
// NinjaOne exige un CONTEXTE UTILISATEUR (technicien) pour lancer un script :
// un jeton « client credentials » est refusé (user_context_required).
// On utilise donc une 2e application NinjaOne (type Web, « Authorization code » +
// « Refresh token ») : un technicien l'autorise UNE fois depuis le portail
// (/ninja/lien -> NinjaOne -> /ninja/callback), le refresh token est chiffré
// (SOPHOS_ENC_KEY) dans Supabase (table ninja_jetons), puis renouvelé automatiquement.
//   NINJA_USER_CLIENT_ID     (Texte)  ID client de l'application NinjaOne « Web »
//   NINJA_USER_CLIENT_SECRET (Secret) son secret
const NINJA_CONNEXION_REQUISE = "NINJA_CONNEXION_REQUISE";
const NINJA_HOTE_AUTH_DEFAUT = "https://eu.ninjarmm.com";

function ninjaHoteAuth(env) { return String(env.NINJA_HOST || NINJA_HOTE_AUTH_DEFAUT).trim().replace(/\/+$/, ""); }

async function ninjaTokenGestion(env) {
  if (ninjaCacheGestion && ninjaCacheGestion.expire > Date.now() + 60000) return ninjaCacheGestion;
  if (!env.NINJA_USER_CLIENT_ID || !env.NINJA_USER_CLIENT_SECRET) {
    throw new Error(NINJA_CONNEXION_REQUISE + " : variables NINJA_USER_CLIENT_ID / NINJA_USER_CLIENT_SECRET non configurées sur le Worker (application NinjaOne « Web » nécessaire pour lancer des scripts).");
  }
  const rows = await sbJson(env, "ninja_jetons?select=cle,refresh_chiffre,host,technicien&cle=eq.gestion").catch(e => {
    throw new Error("Table ninja_jetons introuvable (script ninja_jetons.sql à exécuter dans Supabase) : " + ((e && e.message) || e));
  });
  const ligne = rows && rows[0];
  if (!ligne || !ligne.refresh_chiffre) {
    throw new Error(NINJA_CONNEXION_REQUISE + " : NinjaOne n'est pas encore connecté. Cliquez sur « Connecter NinjaOne » et autorisez avec votre compte technicien (une seule fois).");
  }
  const host = ligne.host || ninjaHoteAuth(env);
  const refresh = await dechiffrer(env, ligne.refresh_chiffre);
  const res = await fetch(host + "/ws/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: String(env.NINJA_USER_CLIENT_ID).trim(),
      client_secret: String(env.NINJA_USER_CLIENT_SECRET).trim(),
      refresh_token: refresh,
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(NINJA_CONNEXION_REQUISE + " : l'autorisation NinjaOne a expiré ou a été révoquée (" + res.status + " " + (data.error || "") +
      "). Cliquez sur « Connecter NinjaOne » pour l'autoriser à nouveau.");
  }
  // NinjaOne peut renvoyer un nouveau refresh token : on garde toujours le dernier.
  if (data.refresh_token && data.refresh_token !== refresh) {
    await sb(env, "ninja_jetons?cle=eq.gestion", {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ refresh_chiffre: await chiffrer(env, data.refresh_token), maj_le: new Date().toISOString() }),
    }).catch(() => {});
  }
  ninjaCacheGestion = { host, token: data.access_token, expire: Date.now() + ((data.expires_in || 3600) * 1000), technicien: ligne.technicien };
  return ninjaCacheGestion;
}

// ---- Connexion « technicien » à NinjaOne (une fois) ----
function b64url(bytes) { return bytesToB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function cleHmac(env) {
  const raw = b64ToBytes(env.SOPHOS_ENC_KEY);
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signerEtat(env, obj) {
  const corps = b64url(new TextEncoder().encode(JSON.stringify(obj)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await cleHmac(env), new TextEncoder().encode(corps)));
  return corps + "." + b64url(sig);
}
async function verifierEtat(env, etat) {
  const [corps, sig] = String(etat || "").split(".");
  if (!corps || !sig) return null;
  const attendu = new Uint8Array(await crypto.subtle.sign("HMAC", await cleHmac(env), new TextEncoder().encode(corps)));
  if (b64url(attendu) !== sig) return null;
  let obj;
  try { obj = JSON.parse(new TextDecoder().decode(b64ToBytes(corps.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((corps.length + 3) % 4)))); } catch (_) { return null; }
  return obj && obj.exp > Date.now() ? obj : null;
}
function urlCallbackNinja(request) { return new URL(request.url).origin + "/ninja/callback"; }

async function routeNinjaLien(env, request, user) {
  if (!env.NINJA_USER_CLIENT_ID) return { status: 400, body: { error: "Variable NINJA_USER_CLIENT_ID non configurée sur le Worker." } };
  const etat = await signerEtat(env, { exp: Date.now() + 10 * 60000, email: (user && user.email) || "" });
  const url = ninjaHoteAuth(env) + "/ws/oauth/authorize?" + new URLSearchParams({
    response_type: "code",
    client_id: String(env.NINJA_USER_CLIENT_ID).trim(),
    redirect_uri: urlCallbackNinja(request),
    scope: "monitoring management offline_access",
    state: etat,
  }).toString();
  return { status: 200, body: { url, redirect_uri: urlCallbackNinja(request) } };
}

function pageSimple(titre, texte, ok) {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${echapper(titre)}</title></head>` +
    `<body style="font-family:system-ui,Arial,sans-serif;background:#F0F2F8;margin:0;padding:40px 16px"><div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:26px;border-top:5px solid ${ok ? "#2F855A" : "#C53030"}">` +
    `<h2 style="margin:0 0 10px;color:${ok ? "#2F855A" : "#C53030"}">${echapper(titre)}</h2><p style="color:#333;line-height:1.6">${echapper(texte)}</p>` +
    `<p style="color:#888;font-size:13px">Vous pouvez fermer cet onglet et revenir au portail DSI Hotel.</p></div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function routeNinjaCallback(env, request) {
  const u = new URL(request.url);
  if (u.searchParams.get("error")) return pageSimple("Connexion NinjaOne refusée", u.searchParams.get("error_description") || u.searchParams.get("error"), false);
  const etat = await verifierEtat(env, u.searchParams.get("state"));
  if (!etat) return pageSimple("Lien expiré", "Le lien de connexion a expiré (10 minutes) ou est invalide. Relancez « Connecter NinjaOne » depuis le portail.", false);
  const code = u.searchParams.get("code");
  if (!code) return pageSimple("Code manquant", "NinjaOne n'a pas renvoyé de code d'autorisation.", false);
  const host = ninjaHoteAuth(env);
  const res = await fetch(host + "/ws/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code,
      redirect_uri: urlCallbackNinja(request),
      client_id: String(env.NINJA_USER_CLIENT_ID).trim(),
      client_secret: String(env.NINJA_USER_CLIENT_SECRET || "").trim(),
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) return pageSimple("Échec de la connexion", "NinjaOne a refusé l'échange du code (" + res.status + " " + (data.error_description || data.error || "") + ").", false);
  if (!data.refresh_token) return pageSimple("Autorisation incomplète", "NinjaOne n'a pas fourni de refresh token : cochez « Refresh token » dans les types d'autorisation de l'application NinjaOne, puis recommencez.", false);
  await sbJson(env, "ninja_jetons?on_conflict=cle", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ cle: "gestion", refresh_chiffre: await chiffrer(env, data.refresh_token), host, technicien: etat.email || null, maj_le: new Date().toISOString() }),
  });
  ninjaCacheGestion = { host, token: data.access_token, expire: Date.now() + ((data.expires_in || 3600) * 1000), technicien: etat.email };
  console.log("NinjaOne connecté (contexte technicien) par " + (etat.email || "?"));
  return pageSimple("NinjaOne connecté ✓", "Le portail peut maintenant lancer les scripts NinjaOne (déverrouillage AD, vider Téléchargements). Autorisation donnée depuis le compte portail " + (etat.email || "") + ".", true);
}

async function ninjaToken(env) {
  if (ninjaCache && ninjaCache.expire > Date.now() + 60000) return ninjaCache;
  if (!env.NINJA_CLIENT_ID || !env.NINJA_CLIENT_SECRET) {
    throw new Error("NINJA_CLIENT_ID / NINJA_CLIENT_SECRET non configurés sur le Worker.");
  }
  const hosts = env.NINJA_HOST ? [String(env.NINJA_HOST).trim().replace(/\/+$/, "")] : NINJA_HOSTS_DEFAUT;
  let derniere = "";
  for (const host of hosts) {
    try {
      const res = await fetch(host + "/ws/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: String(env.NINJA_CLIENT_ID).trim(),
          client_secret: String(env.NINJA_CLIENT_SECRET).trim(),
          scope: "monitoring",
        }).toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.access_token) {
        ninjaCache = { host, token: data.access_token, expire: Date.now() + ((data.expires_in || 3600) * 1000) };
        return ninjaCache;
      }
      derniere = host + " → " + res.status + (data.error_description ? " " + data.error_description : (data.error ? " " + data.error : ""));
    } catch (e) {
      derniere = host + " → " + ((e && e.message) || e);
    }
  }
  throw new Error("Connexion NinjaOne refusée (" + derniere + "). Vérifiez l'ID client, le secret et le type « Client credentials ».");
}

async function ninjaGet(env, chemin) {
  const t = await ninjaToken(env);
  const res = await fetch(t.host + chemin, { headers: { Authorization: "Bearer " + t.token, Accept: "application/json" } });
  if (res.status === 401) ninjaCache = null;
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error("NinjaOne " + res.status + " " + chemin.split("?")[0] + " " + txt.slice(0, 150));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Horodatage NinjaOne (secondes epoch, parfois décimales) -> ISO
function ninjaDate(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  const d = new Date(n < 1e12 ? n * 1000 : n);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

let ninjaOrgsCache = null; // { expire, noms: { id: nom } }
async function ninjaOrganisations(env) {
  if (ninjaOrgsCache && ninjaOrgsCache.expire > Date.now()) return ninjaOrgsCache.noms;
  const liste = await ninjaGet(env, "/v2/organizations?pageSize=1000");
  const noms = {};
  (Array.isArray(liste) ? liste : []).forEach(o => { noms[o.id] = o.name; });
  ninjaOrgsCache = { expire: Date.now() + 3600000, noms };
  return noms;
}

// Adresses IPv4 locales d'un appareil NinjaOne (sans 127.x ni 169.254.x)
function ipsLocales(d) {
  const brut = [].concat(d.ipAddresses || [], d.ipAddress || []);
  return [...new Set(brut.map(x => String(x || "").trim()).filter(ip => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !/^(127\.|169\.254\.)/.test(ip)))];
}

function nomCourt(v) { return String(v || "").trim().split(".")[0].toUpperCase(); }

async function ninjaPoste(env, hostname, detail) {
  const cible = nomCourt(hostname);
  if (!cible) return { hostname, trouve: false };
  const r = await ninjaGet(env, "/v2/devices/search?q=" + encodeURIComponent(cible) + "&limit=10");
  const liste = Array.isArray(r) ? r : (r.devices || r.results || []);
  const candidats = liste.filter(d => nomCourt(d.systemName) === cible || nomCourt(d.dnsName) === cible || nomCourt(d.displayName) === cible);
  if (!candidats.length) return { hostname, trouve: false };
  // Si plusieurs fiches portent le même nom, on garde la plus récente.
  candidats.sort((a, b) => (Number(b.lastContact) || 0) - (Number(a.lastContact) || 0));
  let d = candidats[0];
  // Détail complet (utilisateur, démarrage, IP, modèle) seulement si demandé :
  // 1 sous-requête de plus par poste.
  if (detail) { try { d = Object.assign({}, d, await ninjaGet(env, "/v2/device/" + d.id)); } catch (_) {} }
  const os = d.os || {};
  const sys = d.system || {};
  const console_ = String(env.NINJA_CONSOLE_URL || NINJA_CONSOLE_DEFAUT).trim().replace(/\/+$/, "");
  return {
    hostname,
    trouve: true,
    doublons: candidats.length > 1 ? candidats.length : undefined,
    id: d.id,
    nom: d.displayName || d.systemName || hostname,
    en_ligne: d.offline === false,
    dernier_contact: ninjaDate(d.lastContact),
    derniere_maj: ninjaDate(d.lastUpdate),
    dernier_demarrage: ninjaDate(os.lastBootTime),
    utilisateur: d.lastLoggedInUser || null,
    ip_publique: d.publicIP || null,
    ip_locales: ipsLocales(d),
    os: os.name || null,
    modele: [sys.manufacturer, sys.model].filter(Boolean).join(" ") || null,
    lien: d.id ? console_ + "/#/deviceDashboard/" + d.id + "/overview" : null,
    organisation_id: d.organizationId != null ? d.organizationId : null,
  };
}

async function routeNinjaPostes(env, body) {
  const detail = body.detail !== false;
  const noms = [...new Set((Array.isArray(body.hostnames) ? body.hostnames : []).map(h => String(h || "").trim()).filter(Boolean))]
    .slice(0, detail ? NINJA_MAX_POSTES : NINJA_MAX_POSTES_SIMPLE);
  if (!noms.length) return { status: 400, body: { error: "Aucun nom de poste fourni" } };
  await ninjaToken(env); // erreur de configuration -> message clair, une seule fois
  const postes = [];
  for (const h of noms) {
    try { postes.push(await ninjaPoste(env, h, detail)); }
    catch (e) { postes.push({ hostname: h, erreur: String((e && e.message) || e).slice(0, 200) }); }
  }
  // Nom de l'organisation NinjaOne (= client) de chaque PC trouvé
  if (postes.some(p => p.organisation_id != null)) {
    try {
      const orgs = await ninjaOrganisations(env);
      postes.forEach(p => { if (p.organisation_id != null) p.organisation = orgs[p.organisation_id] || null; });
    } catch (_) {}
  }
  return { status: 200, body: { postes } };
}

// Types d'appareils NinjaOne qui doivent avoir un agent Sophos
const NINJA_CLASSES_SOPHOS = ["WINDOWS_WORKSTATION", "WINDOWS_SERVER", "MAC", "MAC_SERVER"];

function normNom(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

// Tous les postes et serveurs NinjaOne de l'organisation d'un hôtel.
async function routeNinjaOrg(env, body) {
  if (!uuidValide(body.hotelId)) return { status: 400, body: { error: "hotelId invalide" } };
  const hs = await sbJson(env, `hotels?select=id,name,ninjaone_nom&id=eq.${body.hotelId}`);
  const h = hs && hs[0];
  if (!h) return { status: 404, body: { error: "Hôtel introuvable" } };

  const orgs = await ninjaOrganisations(env);
  const cibles = [h.ninjaone_nom, h.name].filter(Boolean).map(normNom).filter(Boolean);
  let orgId = null;
  for (const c of cibles) {
    const e = Object.entries(orgs).find(([, n]) => normNom(n) === c);
    if (e) { orgId = e[0]; break; }
  }
  if (!orgId) {
    // Suggestions : organisations dont le nom partage un mot significatif avec l'hôtel
    const mots = cibles.join(" ").split(" ").filter(m => m.length >= 4);
    const suggestions = Object.values(orgs).filter(n => mots.some(m => normNom(n).includes(m))).slice(0, 5);
    return { status: 200, body: { trouve: false, recherche: h.ninjaone_nom || h.name, suggestions } };
  }

  const console_ = String(env.NINJA_CONSOLE_URL || NINJA_CONSOLE_DEFAUT).trim().replace(/\/+$/, "");
  const bruts = [];
  let after = null;
  for (let p = 0; p < 5; p++) {
    // devices-detailed : inclut les adresses IP locales de chaque appareil
    const page = await ninjaGet(env, "/v2/devices-detailed?df=" + encodeURIComponent("org=" + orgId) + "&pageSize=500" + (after ? "&after=" + after : ""));
    const arr = Array.isArray(page) ? page : (page.devices || []);
    arr.forEach(d => bruts.push(d));
    if (arr.length < 500) break;
    after = arr[arr.length - 1].id;
  }
  const retenus = bruts.filter(d => NINJA_CLASSES_SOPHOS.includes(String(d.nodeClass || "").toUpperCase()));
  const devices = retenus.map(d => ({
    hostname: nomCourt(d.systemName || d.dnsName || d.displayName),
    nom: d.displayName || d.systemName || d.dnsName || "?",
    type: d.nodeClass || null,
    serveur: /SERVER/i.test(String(d.nodeClass || "")),
    en_ligne: d.offline === false,
    dernier_contact: ninjaDate(d.lastContact),
    ips: ipsLocales(d),
    utilisateur: d.lastLoggedInUser || null,
    lien: d.id ? console_ + "/#/deviceDashboard/" + d.id + "/overview" : null,
  })).filter(d => d.hostname);
  return { status: 200, body: { trouve: true, organisation: orgs[orgId], organisation_id: orgId, devices, autres_appareils: bruts.length - retenus.length } };
}

/* ===================== Récapitulatif hebdo des licences ===================== */

// Lundi 06:00–06:01 UTC (≈ 8h Paris l'été, 7h l'hiver) : le cron tourne toutes
// les 2 min, donc une seule exécution tombe dans cette fenêtre.
function estHeureRecapLicences(date) {
  return date.getUTCDay() === 1 && date.getUTCHours() === 6 && date.getUTCMinutes() < 2;
}

async function recapLicences(env) {
  const lic = await sbJson(env,
    "sophos_alertes?select=hotel_id,description,severity,raised_at&statut=eq.ouverte&licence=eq.true&order=raised_at.asc&limit=500");
  if (!lic || !lic.length) return 0;
  const ids = [...new Set(lic.map(a => a.hotel_id))];
  const hotels = await sbJson(env, `hotels?select=id,name&id=in.(${ids.join(",")})`);
  const nom = {}; (hotels || []).forEach(h => { nom[h.id] = h.name; });
  const parHotel = {};
  lic.forEach(a => { (parHotel[a.hotel_id] = parHotel[a.hotel_id] || []).push(a); });
  const blocs = Object.keys(parHotel)
    .sort((a, b) => String(nom[a] || "").localeCompare(String(nom[b] || "")))
    .map(hid =>
      `<h3 style="margin:16px 0 6px;font-size:14px;color:#1a1a3e">${echapper(nom[hid] || "?")}</h3><ul style="margin:0;padding-left:18px">` +
      parHotel[hid].map(a => `<li style="margin:3px 0">${echapper(a.description || "")}</li>`).join("") + `</ul>`).join("");
  const html =
    `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#222">` +
    `<p>Bonjour,</p><p>Récapitulatif hebdomadaire des <b>licences Sophos expirées ou arrivant à échéance</b> ` +
    `(${lic.length} alerte${lic.length > 1 ? "s" : ""} sur ${ids.length} établissement${ids.length > 1 ? "s" : ""}) :</p>` +
    blocs +
    `<p style="margin-top:18px">Produit plus utilisé : acquitter l'alerte dans Sophos Central. Produit à conserver : prévoir le renouvellement avec le client.</p>` +
    `<p><a href="${PORTAIL_URL}" style="display:inline-block;background:#C9A84C;color:#111;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:6px">Ouvrir le portail → Sécurité Sophos → Licences</a></p>` +
    `<p style="color:#999;font-size:12px">Message automatique — supervision Sophos DSI Hotel.</p></div>`;
  await envoyerEmail(env, `[Sophos] Licences : ${lic.length} alerte${lic.length > 1 ? "s" : ""} sur ${ids.length} établissement${ids.length > 1 ? "s" : ""}`, html);
  return lic.length;
}

/* ================================= Lots ================================= */

const COLONNES_COMPTE = "id,hotel_id,client_id,client_secret_chiffre,tenant_id,api_host,actif,dernier_controle,regles,principal";

async function traiterLot(env) {
  const n = nombre(env.HOTELS_PAR_PASSAGE, 3);
  const comptes = await sbJson(env,
    `sophos_comptes?select=${COLONNES_COMPTE}&actif=eq.true&order=dernier_controle.asc.nullsfirst&limit=${n}`);
  const resultats = [];
  const tenantsFaits = new Set();
  for (const c of (comptes || [])) {
    if (c.tenant_id && tenantsFaits.has(c.tenant_id)) continue; // déjà fait via un autre hôtel du même compte
    const freres = await comptesDuTenant(env, c);
    const r = await synchroniserTenant(env, freres);
    if (c.tenant_id) tenantsFaits.add(c.tenant_id);
    (r.resultats || []).forEach(x => resultats.push(x));
  }

  let notifiees = 0, erreurEmail = null;
  try { notifiees = await notifierNouvellesAlertes(env, resultats.filter(r => r.ok).map(r => r.hotel_id)); }
  catch (e) { erreurEmail = String((e && e.message) || e); }

  // Ménage occasionnel des alertes résolues anciennes (~1 passage sur 12).
  if (Math.random() < 0.08) {
    const limite = new Date(Date.now() - RETENTION_ALERTES_RESOLUES_JOURS * 86400000).toISOString();
    try {
      await sb(env, `sophos_alertes?statut=eq.resolue&resolue_le=lt.${encodeURIComponent(limite)}`, {
        method: "DELETE", headers: { Prefer: "return=minimal" },
      });
    } catch (_) {}
  }
  return { traites: resultats.length, resultats, notifiees, erreurEmail };
}

/* ================= CAPEX : inventaire mensuel des machines (NinjaOne) ================= */
// Pour chaque hôtel (champ « Nom NinjaOne »), on lit tous les postes et serveurs physiques
// NinjaOne, on estime leur date d'achat, puis on tient à jour DEUX lignes CAPEX par hôtel :
//   ninja:<hotel_id>:5ans  « Renouvellement matériel de plus de 5 ans »  (Obligatoire)
//   ninja:<hotel_id>:3ans  « Renouvellement matériel de 3 à 5 ans »      (Recommandé)
// Recalculées chaque mois (quantité, montant, liste des machines) quel que soit le statut ;
// le statut, l'année, la priorité et le commentaire choisis dans le portail sont conservés.
// Passage automatique : du 1er au 7 du mois, un passage du cron sur deux (minute multiple
// de 4) traite CAPEX_HOTELS_PAR_PASSAGE hôtels pas encore faits ce mois-ci (~6 sous-requêtes
// par hôtel, compatible plan gratuit).

const CAPEX_HOTELS_PAR_PASSAGE = 3;
const CAPEX_AUTEUR = "Inventaire automatique NinjaOne";
const CAPEX_CLASSES = ["WINDOWS_WORKSTATION", "WINDOWS_SERVER", "MAC", "MAC_SERVER", "LINUX_WORKSTATION", "LINUX_SERVER", "VMWARE_VM_HOST", "HYPERV_VMM_HOST"];
const CAPEX_RE_VM = /virtual|vmware|kvm|qemu|hyper-v|xen|virtualbox|parallels/i;
const CAPEX_RE_PORTABLE = /laptop|notebook|portable|book|latitude|thinkpad|surface|tablet|convertible|detachable/i;

function capexMois(d) { return d.toISOString().slice(0, 7); }

// Date (secondes / ms epoch ou texte) -> Date valide entre 2000 et aujourd'hui, sinon null
function capexDate(v) {
  if (v === null || v === undefined || v === "") return null;
  let d;
  if (typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v))) { const n = Number(v); d = new Date(n < 1e12 ? n * 1000 : n); }
  else d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() < 2000 || d.getTime() > Date.now() + 86400000) return null;
  return d;
}

// Date d'achat estimée, par ordre de fiabilité. Jamais la date d'ajout dans NinjaOne
// (NinjaOne est récent : toutes les machines paraîtraient neuves).
function capexDateAchat(d, dateScript) {
  const sys = d.system || {};
  const os = d.os || {};
  const w = d.warranty || (d.references && d.references.warranty) || sys.warranty || {};
  const essais = [
    [w.startDate, "garantie"],
    [w.manufacturerFulfillmentDate, "garantie"],
    [d.warrantyStartDate, "garantie"],
    [sys.warrantyStartDate, "garantie"],
  ];
  for (const [v, src] of essais) { const x = capexDate(v); if (x) return { date: x, source: src }; }
  const fin = capexDate(w.endDate || d.warrantyEndDate || sys.warrantyEndDate);
  if (fin) { const x = new Date(fin); x.setUTCFullYear(x.getUTCFullYear() - 3); if (x.getTime() <= Date.now()) return { date: x, source: "fin de garantie − 3 ans" }; }
  // Sans garantie : on garde la PLUS ANCIENNE des dates disponibles (une mise à jour du BIOS
  // ou une réinstallation de Windows rajeunit la machine, la génération du processeur non).
  const candidats = [];
  const bios = capexDate(sys.biosReleaseDate || (d.bios && (d.bios.releaseDate || d.bios.date)) || sys.biosDate);
  if (bios) candidats.push({ date: bios, source: "BIOS" });
  const inst = capexDate(os.installDate || os.installTime);
  if (inst) candidats.push({ date: inst, source: "installation du système" });
  if (dateScript) candidats.push(dateScript);
  const cpu = capexDateProcesseur(d);
  if (cpu) candidats.push(cpu);
  if (!candidats.length) return null;
  return candidats.sort((a, b) => a.date - b.date)[0];
}

// Champ personnalisé NinjaOne « dateMateriel » rempli par le script DSI (format « 2018-03-14|bios »)
function capexDateScript(v) {
  if (!v) return null;
  const [txt, src] = String(v).split("|");
  const x = capexDate(String(txt || "").trim());
  if (!x) return null;
  return { date: x, source: src && src.trim() === "install" ? "script (installation Windows)" : "script (BIOS)" };
}

// Année de sortie estimée d'après le nom du processeur -> date d'achat estimée au 1er janvier
// de l'année SUIVANTE (une machine s'achète en général dans l'année qui suit la sortie du CPU).
function capexAnneeProcesseur(nom) {
  const n = String(nom || "").replace(/\((R|TM)\)/gi, " ").replace(/\s+/g, " ");
  let m;
  const gen = { 2: 2011, 3: 2012, 4: 2013, 5: 2015, 6: 2015, 7: 2017, 8: 2017, 9: 2019, 10: 2020, 11: 2021, 12: 2022, 13: 2023, 14: 2024 };
  if (/Core Ultra/i.test(n)) return (m = n.match(/Ultra \d+ (\d)\d\d/i)) && m[1] === "2" ? 2024 : 2024;
  if ((m = n.match(/\bi[3579]-(\d{4,5})/i))) { const num = m[1]; const g = (num.length === 5 || num[0] === "1") ? Number(num.slice(0, 2)) : Number(num[0]); return gen[g] || null; }
  if ((m = n.match(/\bi[357]-?\s?(\d{3})\b/i))) return 2010;
  if ((m = n.match(/Xeon.*E[357]-\d{4}[A-Z]*\s*v(\d)/i))) return { 2: 2013, 3: 2014, 4: 2016, 5: 2015, 6: 2017 }[m[1]] || null;
  if ((m = n.match(/Xeon.*E[357]-\d{4}/i))) return 2012;
  if ((m = n.match(/Xeon.*E-2(\d)\d\d/i))) return { 1: 2018, 2: 2019, 3: 2021, 4: 2023 }[m[1]] || null;
  if ((m = n.match(/Xeon.*(?:Bronze|Silver|Gold|Platinum)\s*\d(\d)\d\d/i))) return { 1: 2017, 2: 2019, 3: 2021, 4: 2023, 5: 2023, 6: 2024 }[m[1]] || null;
  if ((m = n.match(/(?:Pentium|Celeron).*\bG(\d)\d{2,3}/i))) return { 1: 2013, 2: 2013, 3: 2014, 4: 2016, 5: 2018, 6: 2020, 7: 2022 }[m[1]] || null;
  if ((m = n.match(/Ryzen (?:AI|Z)/i))) return 2024;
  if ((m = n.match(/Ryzen (?:Threadripper )?(?:PRO )?\d? ?(?:PRO )?(\d)\d{3}/i))) return { 1: 2017, 2: 2018, 3: 2019, 4: 2020, 5: 2021, 6: 2022, 7: 2023, 8: 2024, 9: 2024 }[m[1]] || null;
  if ((m = n.match(/EPYC \d{3}(\d)/i))) return { 1: 2017, 2: 2019, 3: 2021, 4: 2022 }[m[1]] || null;
  return null;
}
function capexDateProcesseur(d) {
  const procs = Array.isArray(d.processors) ? d.processors : (d.processors ? [d.processors] : []);
  for (const p of procs) {
    const nom = (p && (p.name || p.model)) || "";
    const an = capexAnneeProcesseur(nom);
    if (an) {
      const x = new Date(Date.UTC(an + 1, 0, 1));
      if (x.getTime() > Date.now()) x.setTime(Date.UTC(an, 6, 1));
      return { date: x, source: "processeur (" + an + ")", cpu: String(nom).replace(/\((R|TM)\)/gi, "").replace(/\s+/g, " ").trim() };
    }
  }
  return null;
}

// Valeurs du champ « dateMateriel » de toutes les machines d'une organisation : { deviceId: valeur }
async function capexChampsScript(env, orgId) {
  const res = {};
  try {
    let cursor = null;
    for (let p = 0; p < 5; p++) {
      const page = await ninjaGet(env, "/v2/queries/custom-fields?df=" + encodeURIComponent("org=" + orgId) + "&fields=dateMateriel&pageSize=1000" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
      const arr = Array.isArray(page) ? page : (page.results || []);
      arr.forEach(x => { const f = x.fields || x.customFields || {}; const v = f.dateMateriel; if (x.deviceId && v) res[x.deviceId] = v; });
      cursor = page && page.cursor && page.cursor.name;
      if (!cursor || arr.length < 1000) break;
    }
  } catch (e) { console.log("CAPEX dateMateriel : " + ((e && e.message) || e)); }
  return res;
}

function capexMachine(d, console_, champsScript) {
  const classe = String(d.nodeClass || "").toUpperCase();
  if (!CAPEX_CLASSES.includes(classe)) return null;
  const sys = d.system || {};
  const modele = [sys.manufacturer, sys.model].filter(Boolean).join(" ");
  if (sys.virtualMachine === true || CAPEX_RE_VM.test(modele) || CAPEX_RE_VM.test(String(sys.manufacturer || ""))) return null;
  const serveur = /SERVER|VM_HOST|VMM_HOST/.test(classe);
  const portable = !serveur && (CAPEX_RE_PORTABLE.test(String(sys.chassisType || "")) || CAPEX_RE_PORTABLE.test(String(sys.model || "")));
  const achat = capexDateAchat(d, capexDateScript(champsScript && champsScript[d.id]));
  const cpu = capexDateProcesseur(d);
  const age = achat ? Math.round(((Date.now() - achat.date.getTime()) / (365.25 * 86400000)) * 10) / 10 : null;
  return {
    id: d.id,
    nom: d.displayName || d.systemName || d.dnsName || "?",
    type: serveur ? "serveur" : (portable ? "portable" : "poste"),
    modele: (modele || "") + (cpu && cpu.cpu ? (modele ? " · " : "") + cpu.cpu : "") || null,
    serie: sys.serialNumber || sys.biosSerialNumber || null,
    date: achat ? achat.date.toISOString().slice(0, 10) : null,
    source: achat ? achat.source : null,
    age,
    utilisateur: d.lastLoggedInUser || null,
    dernier_contact: ninjaDate(d.lastContact),
    lien: d.id ? console_ + "/#/deviceDashboard/" + d.id + "/overview" : null,
  };
}

async function capexOrgId(env, h) {
  const orgs = await ninjaOrganisations(env);
  const cibles = [h.ninjaone_nom, h.name].filter(Boolean).map(normNom).filter(Boolean);
  for (const c of cibles) {
    const e = Object.entries(orgs).find(([, n]) => normNom(n) === c);
    if (e) return e[0];
  }
  return null;
}

function capexResume(liste) {
  const n = { poste: 0, portable: 0, serveur: 0 };
  liste.forEach(m => { n[m.type] = (n[m.type] || 0) + 1; });
  const p = [];
  if (n.poste) p.push(n.poste + " poste" + (n.poste > 1 ? "s" : "") + " fixe" + (n.poste > 1 ? "s" : ""));
  if (n.portable) p.push(n.portable + " portable" + (n.portable > 1 ? "s" : ""));
  if (n.serveur) p.push(n.serveur + " serveur" + (n.serveur > 1 ? "s" : ""));
  return { n, texte: p.join(", ") };
}

// Inventaire d'un hôtel + mise à jour de ses 2 lignes CAPEX. simulation = rien n'est écrit.
async function capexInventaireHotel(env, h, config, opts) {
  const simulation = !!(opts && opts.simulation);
  const maintenant = new Date();
  const etat = { hotel_id: h.id, mois: capexMois(maintenant), dernier_passage: maintenant.toISOString(), erreur: null };
  try {
    const orgId = await capexOrgId(env, h);
    if (!orgId) throw new Error("Organisation NinjaOne introuvable (« " + (h.ninjaone_nom || h.name) + " »)");
    const console_ = String(env.NINJA_CONSOLE_URL || NINJA_CONSOLE_DEFAUT).trim().replace(/\/+$/, "");
    const bruts = [];
    let after = null;
    for (let p = 0; p < 4; p++) {
      const page = await ninjaGet(env, "/v2/devices-detailed?df=" + encodeURIComponent("org=" + orgId) + "&pageSize=500" + (after ? "&after=" + after : ""));
      const arr = Array.isArray(page) ? page : (page.devices || []);
      arr.forEach(d => bruts.push(d));
      if (arr.length < 500) break;
      after = arr[arr.length - 1].id;
    }
    const champsScript = await capexChampsScript(env, orgId);
    const machines = bruts.map(d => capexMachine(d, console_, champsScript)).filter(Boolean);
    const sources = {};
    machines.forEach(m => { const k = m.source || "inconnue"; sources[k] = (sources[k] || 0) + 1; });
    const tri = (a, b) => (b.age || 0) - (a.age || 0) || String(a.nom).localeCompare(String(b.nom));
    const plus5 = machines.filter(m => m.age !== null && m.age >= 5).sort(tri);
    const de3a5 = machines.filter(m => m.age !== null && m.age >= 3 && m.age < 5).sort(tri);
    const inconnus = machines.filter(m => m.age === null);
    Object.assign(etat, { nb_machines: machines.length, nb_3_5: de3a5.length, nb_5: plus5.length, nb_inconnu: inconnus.length, sources });

    const prix = { poste: Number(config.prix_poste) || 0, portable: Number(config.prix_portable) || 0, serveur: Number(config.prix_serveur) || 0 };
    const anneeSuivante = maintenant.getUTCFullYear() + 1;
    const anneePlus5 = maintenant.getUTCMonth() < 6 ? maintenant.getUTCFullYear() : anneeSuivante;
    const dateFr = maintenant.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
    const tranches = [
      { cle: "ninja:" + h.id + ":5ans", liste: plus5, equipement: "Renouvellement matériel de plus de 5 ans", priorite: "Obligatoire", annee: anneePlus5,
        justification: "Machines de plus de 5 ans : fin de vie, risque de panne et de sécurité (âge estimé d'après NinjaOne)" },
      { cle: "ninja:" + h.id + ":3ans", liste: de3a5, equipement: "Renouvellement matériel de 3 à 5 ans", priorite: "Recommandé", annee: anneeSuivante,
        justification: "Machines de 3 à 5 ans : renouvellement à planifier (âge estimé d'après NinjaOne)" },
    ];
    const resultat = { hotel: h.name, organisation: (await ninjaOrganisations(env))[orgId], ...etat, lignes: [] };

    const existantes = simulation ? [] : ((await sbJson(env, "capex?select=id,auto_cle,statut&auto_cle=in.(" + tranches.map(t => '"' + t.cle + '"').join(",") + ")")) || []);
    for (const t of tranches) {
      const r = capexResume(t.liste);
      const montant = t.liste.reduce((s, m) => s + (prix[m.type] || 0), 0);
      const description = t.liste.length
        ? r.texte + " — inventaire NinjaOne du " + dateFr + (inconnus.length ? " (" + inconnus.length + " machine(s) sans date connue non comptée(s))" : "")
        : "Plus aucune machine concernée — inventaire NinjaOne du " + dateFr;
      const champs = { quantite: t.liste.length, montant_ht: montant, description, justification: t.justification, machines: t.liste, auto_maj: maintenant.toISOString() };
      const ex = existantes.find(x => x.auto_cle === t.cle);
      let action = "aucune";
      if (simulation) action = t.liste.length ? "simulation" : "aucune";
      else if (ex && !t.liste.length && ex.statut === "Proposé") {
        await sbJson(env, "capex?id=eq." + ex.id, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        action = "supprimée";
      } else if (ex) {
        await sbJson(env, "capex?id=eq." + ex.id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(champs) });
        action = "mise à jour";
      } else if (t.liste.length) {
        await sbJson(env, "capex", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            ...champs, auto_cle: t.cle, hotel_id: h.id, annee: t.annee, trimestre: null,
            categorie: r.n.serveur && !r.n.poste && !r.n.portable ? "Serveurs / stockage" : "Postes de travail",
            equipement: t.equipement, priorite: t.priorite, statut: "Proposé", pieces_jointes: [],
            created_by_nom: CAPEX_AUTEUR, updated_by_nom: CAPEX_AUTEUR, updated_at: maintenant.toISOString(),
          }),
        });
        action = "créée";
      }
      resultat.lignes.push({ tranche: t.equipement, quantite: t.liste.length, montant_ht: montant, action, machines: simulation ? t.liste : undefined });
    }
    if (simulation) {
      resultat.inconnus = inconnus.map(m => ({ nom: m.nom, type: m.type, modele: m.modele }));
      // Diagnostic : champs disponibles sur la 1re machine (pour vérifier où NinjaOne met les dates)
      // 1re machine PHYSIQUE (les VM sont ignorées par l'inventaire)
      const idsPhys = new Set(machines.map(m => m.id));
      const ex = bruts.find(d => idsPhys.has(d.id)) || bruts.find(d => CAPEX_CLASSES.includes(String(d.nodeClass || "").toUpperCase()));
      if (ex) resultat.diagnostic = { nom: ex.displayName || ex.systemName, cles: Object.keys(ex), system: ex.system || null, os: ex.os || null, processors: ex.processors || null, warranty: ex.warranty || (ex.references && ex.references.warranty) || null, dateMateriel: champsScript[ex.id] || null, nb_champs_script: Object.keys(champsScript).length };
    } else {
      await sbJson(env, "capex_auto_etat?on_conflict=hotel_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(etat) });
    }
    return { ok: true, ...resultat };
  } catch (e) {
    etat.erreur = String((e && e.message) || e).slice(0, 300);
    if (!simulation) await sb(env, "capex_auto_etat?on_conflict=hotel_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(etat) }).catch(() => {});
    return { ok: false, hotel: h.name, hotel_id: h.id, erreur: etat.erreur };
  }
}

async function capexConfig(env) {
  const c = await sbJson(env, "capex_auto_config?select=*&id=eq.1").catch(() => null);
  return (c && c[0]) || { actif: true, prix_poste: 900, prix_portable: 1100, prix_serveur: 6500 };
}

// POST /capex-inventaire { hotelId, simulation }
async function routeCapexInventaire(env, body) {
  if (!uuidValide(body.hotelId)) return { status: 400, body: { error: "hotelId invalide" } };
  const hs = await sbJson(env, `hotels?select=id,name,ninjaone_nom&id=eq.${body.hotelId}`);
  if (!hs || !hs[0]) return { status: 404, body: { error: "Hôtel introuvable" } };
  const r = await capexInventaireHotel(env, hs[0], await capexConfig(env), { simulation: body.simulation === true });
  return { status: r.ok ? 200 : 502, body: r.ok ? r : { error: r.erreur, ...r } };
}

// Passage automatique (cron) : hôtels pas encore inventoriés ce mois-ci
async function capexLotMensuel(env) {
  const config = await capexConfig(env);
  if (config.actif === false) return { traites: 0, desactive: true };
  const mois = capexMois(new Date());
  const hotels = (await sbJson(env, "hotels?select=id,name,ninjaone_nom&ninjaone_nom=not.is.null&order=name.asc")) || [];
  const faits = new Set(((await sbJson(env, "capex_auto_etat?select=hotel_id&mois=eq." + mois)) || []).map(x => x.hotel_id));
  const aFaire = hotels.filter(h => !faits.has(h.id)).slice(0, CAPEX_HOTELS_PAR_PASSAGE);
  const res = [];
  for (const h of aFaire) res.push(await capexInventaireHotel(env, h, config));
  return { traites: res.length, restants: hotels.length - faits.size - res.length, res };
}

function estPeriodeCapex(date) {
  return date.getUTCDate() <= 7 && date.getUTCMinutes() % 4 === 0;
}

/* =========================== Contrôle d'accès =========================== */

// Utilisateur connecté (admin, superviseur ou client) : renvoie son rôle et son hôtel actif
async function verifierUtilisateur(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Non authentifié" };
  const uRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!uRes.ok) return { ok: false, status: 401, error: "Session invalide ou expirée" };
  const user = await uRes.json().catch(() => null);
  if (!user || !user.id) return { ok: false, status: 401, error: "Session invalide" };
  const profs = await sbJson(env, `profiles?id=eq.${user.id}&select=role,hotel_id`).catch(() => []);
  if (!Array.isArray(profs) || !profs[0]) return { ok: false, status: 403, error: "Profil introuvable" };
  return { ok: true, user, role: profs[0].role, hotel_id: profs[0].hotel_id || null };
}

// POST /capex-inventaire appelé par un SUPERVISEUR d'hôtel (bouton de la page CAPEX) :
// uniquement son hôtel actif, jamais en simulation, au plus une fois toutes les 15 minutes.
const CAPEX_DELAI_CLIENT_MIN = 15;
async function routeCapexInventaireClient(env, hotelId) {
  if (!uuidValide(hotelId)) return { status: 403, body: { error: "Aucun établissement rattaché à ce compte" } };
  const et = await sbJson(env, `capex_auto_etat?select=dernier_passage,erreur&hotel_id=eq.${hotelId}`).catch(() => []);
  const dernier = et && et[0] && !et[0].erreur && et[0].dernier_passage ? new Date(et[0].dernier_passage) : null;
  if (dernier) {
    const ecoule = (Date.now() - dernier.getTime()) / 60000;
    if (ecoule < CAPEX_DELAI_CLIENT_MIN) {
      const heure = dernier.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
      return { status: 429, body: { error: "Inventaire déjà actualisé à " + heure + ". Réessayez dans " + Math.ceil(CAPEX_DELAI_CLIENT_MIN - ecoule) + " min." } };
    }
  }
  const hs = await sbJson(env, `hotels?select=id,name,ninjaone_nom&id=eq.${hotelId}`);
  if (!hs || !hs[0]) return { status: 404, body: { error: "Hôtel introuvable" } };
  if (!hs[0].ninjaone_nom) return { status: 400, body: { error: "Cet établissement n'est pas relié à NinjaOne. Contactez le support DSI Hotel." } };
  const r = await capexInventaireHotel(env, hs[0], await capexConfig(env), { simulation: false });
  if (!r.ok) return { status: 502, body: { error: "Inventaire impossible pour le moment. Contactez le support DSI Hotel." } };
  return { status: 200, body: { ok: true, hotel: r.hotel, nb_machines: r.nb_machines, nb_3_5: r.nb_3_5, nb_5: r.nb_5, nb_inconnu: r.nb_inconnu,
    lignes: (r.lignes || []).map(l => ({ tranche: l.tranche, quantite: l.quantite, montant_ht: l.montant_ht, action: l.action })) } };
}

async function verifierAdmin(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Non authentifié" };
  const uRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!uRes.ok) return { ok: false, status: 401, error: "Session invalide ou expirée" };
  const user = await uRes.json().catch(() => null);
  if (!user || !user.id) return { ok: false, status: 401, error: "Session invalide" };
  const profs = await sbJson(env, `profiles?id=eq.${user.id}&select=role`).catch(() => []);
  if (!Array.isArray(profs) || !profs[0] || profs[0].role !== "admin") {
    return { ok: false, status: 403, error: "Réservé aux administrateurs DSI Hotel" };
  }
  return { ok: true, user };
}

function uuidValide(v) { return /^[0-9a-f-]{36}$/i.test(String(v || "")); }

/* ===================== Protection anti-altération ===================== */

const TAMPER_MAX = 25; // plan gratuit : ~8 sous-requêtes fixes + 1 par PC (limite 50)

function messageDroitsSophos(e) {
  if (e && (e.status === 401 || e.status === 403)) {
    return "Sophos refuse la modification (" + e.status + ") : les identifiants API de cet hôtel sont en lecture seule. " +
      "Dans Sophos Central de l'hôtel : Paramètres globaux → Identifiants API → créer des identifiants avec le rôle " +
      "« Service Principal Management », puis les enregistrer dans le portail (bouton ⚙️ du compte Sophos).";
  }
  return String((e && e.message) || e);
}

async function routeTamper(env, body, user) {
  const hotelId = body.hotelId;
  const action = String(body.action || "");
  if (!uuidValide(hotelId)) return { status: 400, body: { error: "hotelId invalide" } };
  if (!["desactiver", "activer", "motdepasse"].includes(action)) return { status: 400, body: { error: "action invalide" } };
  const ids = [...new Set((Array.isArray(body.sophosIds) ? body.sophosIds : []).map(x => String(x || "").trim()).filter(x => /^[0-9a-zA-Z-]{8,64}$/.test(x)))];
  if (!ids.length) return { status: 400, body: { error: "Aucun PC sélectionné" } };
  if (action === "motdepasse" && ids.length !== 1) return { status: 400, body: { error: "Un seul PC à la fois pour le mot de passe" } };
  if (ids.length > TAMPER_MAX) return { status: 400, body: { error: "25 PC maximum par opération (" + ids.length + " sélectionnés)" } };

  // Le compte Sophos de l'hôtel, puis les PC : ils doivent appartenir à cet hôtel ET à ce compte.
  const cs = await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&hotel_id=eq.${hotelId}`);
  const compte = cs && cs[0];
  if (!compte) return { status: 404, body: { error: "Aucun compte Sophos pour cet hôtel" } };
  const liste = ids.map(x => '"' + x + '"').join(",");
  const postes = (await sbJson(env,
    `sophos_postes?select=tenant_id,sophos_id,hostname&hotel_id=eq.${hotelId}&sophos_id=in.(${liste})`)) || [];
  const connus = new Map(postes.filter(p => !compte.tenant_id || p.tenant_id === compte.tenant_id).map(p => [String(p.sophos_id), p]));
  const inconnus = ids.filter(x => !connus.has(x));
  if (!connus.size) return { status: 404, body: { error: "PC introuvables pour cet hôtel (resynchronisez l'hôtel)" } };

  let token;
  try {
    token = await sophosToken(compte.client_id, await dechiffrer(env, compte.client_secret_chiffre));
    if (!compte.tenant_id || !compte.api_host) {
      const w = await sophosWhoami(token);
      compte.tenant_id = w.tenantId; compte.api_host = w.apiHost;
    }
  } catch (e) {
    return { status: 502, body: { error: String((e && e.message) || e) } };
  }

  if (action === "motdepasse") {
    const id = [...connus.keys()][0];
    try {
      const d = await sophosGet(token, compte, `/endpoint/v1/endpoints/${encodeURIComponent(id)}/tamper-protection`);
      console.log(`Anti-altération : mot de passe de ${connus.get(id).hostname} consulté par ${(user && user.email) || "?"}`);
      return { status: 200, body: { hostname: connus.get(id).hostname, active: !!d.enabled, motDePasse: d.password || null } };
    } catch (e) {
      return { status: (e && e.status === 403) ? 403 : 502, body: { error: messageDroitsSophos(e) } };
    }
  }

  const enabled = action === "activer";
  const resultats = [];
  for (const [id, p] of connus) {
    try {
      const d = await sophosEnvoyer(token, compte, `/endpoint/v1/endpoints/${encodeURIComponent(id)}/tamper-protection`, { enabled });
      resultats.push({ sophosId: id, hostname: p.hostname, ok: true, active: typeof d.enabled === "boolean" ? d.enabled : enabled });
    } catch (e) {
      resultats.push({ sophosId: id, hostname: p.hostname, ok: false, erreur: messageDroitsSophos(e) });
      if (e && (e.status === 401 || e.status === 403)) break; // inutile d'insister : droits insuffisants
    }
  }
  inconnus.forEach(id => resultats.push({ sophosId: id, ok: false, erreur: "PC inconnu pour cet hôtel" }));
  const reussis = resultats.filter(r => r.ok).map(r => r.sophosId);
  if (reussis.length) {
    await sb(env, `sophos_postes?tenant_id=eq.${encodeURIComponent(compte.tenant_id)}&sophos_id=in.(${reussis.map(x => '"' + x + '"').join(",")})`, {
      method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ tamper_protection: enabled }),
    }).catch(() => {});
  }
  console.log(`Anti-altération ${enabled ? "activée" : "désactivée"} sur ${reussis.length} PC par ${(user && user.email) || "?"}`);
  return { status: 200, body: { success: reussis.length > 0, action, reussis: reussis.length, resultats } };
}

/* ========================= Analyse à la demande ========================= */

const SCAN_MAX = 25; // plan gratuit : ~8 sous-requêtes fixes + 1 par PC (limite 50)

async function routeScan(env, body, user) {
  const hotelId = body.hotelId;
  if (!uuidValide(hotelId)) return { status: 400, body: { error: "hotelId invalide" } };
  const ids = [...new Set((Array.isArray(body.sophosIds) ? body.sophosIds : []).map(x => String(x || "").trim()).filter(x => /^[0-9a-zA-Z-]{8,64}$/.test(x)))];
  if (!ids.length) return { status: 400, body: { error: "Aucun PC sélectionné" } };
  if (ids.length > SCAN_MAX) return { status: 400, body: { error: "25 PC maximum par opération (" + ids.length + " sélectionnés)" } };

  // Le compte Sophos de l'hôtel, puis les PC : ils doivent appartenir à cet hôtel ET à ce compte.
  const cs = await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&hotel_id=eq.${hotelId}`);
  const compte = cs && cs[0];
  if (!compte) return { status: 404, body: { error: "Aucun compte Sophos pour cet hôtel" } };
  const liste = ids.map(x => '"' + x + '"').join(",");
  const postes = (await sbJson(env,
    `sophos_postes?select=tenant_id,sophos_id,hostname&hotel_id=eq.${hotelId}&sophos_id=in.(${liste})`)) || [];
  const connus = new Map(postes.filter(p => !compte.tenant_id || p.tenant_id === compte.tenant_id).map(p => [String(p.sophos_id), p]));
  const inconnus = ids.filter(x => !connus.has(x));
  if (!connus.size) return { status: 404, body: { error: "PC introuvables pour cet hôtel (resynchronisez l'hôtel)" } };

  let token;
  try {
    token = await sophosToken(compte.client_id, await dechiffrer(env, compte.client_secret_chiffre));
    if (!compte.tenant_id || !compte.api_host) {
      const w = await sophosWhoami(token);
      compte.tenant_id = w.tenantId; compte.api_host = w.apiHost;
    }
  } catch (e) {
    return { status: 502, body: { error: String((e && e.message) || e) } };
  }

  const resultats = [];
  for (const [id, p] of connus) {
    try {
      // Scan complet à la demande : asynchrone, l'appel ne fait que le déclencher.
      await sophosEnvoyer(token, compte, `/endpoint/v1/endpoints/${encodeURIComponent(id)}/scans`, {});
      resultats.push({ sophosId: id, hostname: p.hostname, ok: true });
    } catch (e) {
      resultats.push({ sophosId: id, hostname: p.hostname, ok: false, erreur: messageDroitsSophos(e) });
      if (e && (e.status === 401 || e.status === 403)) break; // droits insuffisants : inutile d'insister
    }
  }
  inconnus.forEach(id => resultats.push({ sophosId: id, ok: false, erreur: "PC inconnu pour cet hôtel" }));
  const reussis = resultats.filter(r => r.ok).length;
  console.log(`Analyse Sophos demandée sur ${reussis} PC par ${(user && user.email) || "?"}`);
  return { status: 200, body: { success: reussis > 0, reussis, resultats } };
}

/* ================= Vider le dossier Téléchargements (NinjaOne) ================= */

const VIDER_MAX = 15; // plan gratuit : ~6 sous-requêtes fixes + 2 par PC (limite 50)

async function routeViderTelechargements(env, body, user) {
  const scriptId = parseInt(env.NINJA_SCRIPT_TELECHARGEMENTS, 10);
  if (!scriptId) {
    return { status: 400, body: { error: "Variable NINJA_SCRIPT_TELECHARGEMENTS non configurée sur le Worker : indiquez l'ID du script NinjaOne « Vider Téléchargements »." } };
  }
  const noms = [...new Set((Array.isArray(body.hostnames) ? body.hostnames : []).map(h => String(h || "").trim()).filter(Boolean))];
  if (!noms.length) return { status: 400, body: { error: "Aucun PC sélectionné" } };
  if (noms.length > VIDER_MAX) return { status: 400, body: { error: VIDER_MAX + " PC maximum par opération (" + noms.length + " sélectionnés)" } };

  let g;
  try { g = await ninjaTokenGestion(env); }
  catch (e) { return { status: 502, body: { error: String((e && e.message) || e) } }; }

  const resultats = [];
  for (const h of noms) {
    try {
      const p = await ninjaPoste(env, h, false);
      if (!p.trouve) { resultats.push({ hostname: h, ok: false, erreur: "introuvable dans NinjaOne" }); continue; }
      if (!p.en_ligne) { resultats.push({ hostname: h, ok: false, erreur: "hors ligne dans NinjaOne" }); continue; }
      const res = await fetch(g.host + "/v2/device/" + encodeURIComponent(p.id) + "/script/run", {
        method: "POST",
        headers: { Authorization: "Bearer " + g.token, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: "SCRIPT", id: scriptId, runAs: "system" }),
      });
      if (res.status === 401) ninjaCacheGestion = null;
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        const err = new Error("NinjaOne " + res.status + (res.status === 403
          ? " : exécution refusée — " + (t.slice(0, 200) || "aucun détail renvoyé")
          : res.status === 404 ? " : script introuvable (vérifiez NINJA_SCRIPT_TELECHARGEMENTS)" : " " + t.slice(0, 150)));
        err.status = res.status;
        throw err;
      }
      resultats.push({ hostname: h, ok: true });
    } catch (e) {
      resultats.push({ hostname: h, ok: false, erreur: String((e && e.message) || e).slice(0, 220) });
      if (e && (e.status === 401 || e.status === 403 || e.status === 404)) break; // inutile d'insister
    }
  }
  const reussis = resultats.filter(r => r.ok);
  console.log(`Vider Téléchargements lancé sur ${reussis.length} PC par ${(user && user.email) || "?"} — ` + reussis.map(r => r.hostname).join(", "));
  return { status: 200, body: { success: reussis.length > 0, reussis: reussis.length, resultats } };
}

/* ============ Déverrouillage d'un compte Active Directory (NinjaOne) ============ */
// Le script NinjaOne s'exécute en SYSTEM sur le contrôleur de domaine de l'hôtel :
// il refuse les comptes à privilèges, lit l'état du compte (verrouillage, échecs,
// poste à l'origine du verrouillage) et, en mode "deverrouiller", le déverrouille.
// Son résultat (JSON) est écrit dans un champ personnalisé d'appareil NinjaOne,
// que le portail relit via /ad-resultat.

const AD_CHAMP_DEFAUT = "dsiAdUnlock";
const AD_SCRIPT_NOM_DEFAUT = "DSI - Deverrouiller compte AD"; // nom exact du script dans NinjaOne (NINJA_SCRIPT_AD_UNLOCK_NOM pour le changer)
const RE_COMPTE_AD = /^[A-Za-z0-9._-]{1,64}$/;
const RE_NOM_DC = /(^|[-_.\s])(DC|AD|ADDS|PDC)\d*($|[-_.\s])|^DC|DC\d*$/i;

async function trouverDC(env, hotelId) {
  const hs = await sbJson(env, `hotels?select=id,name,ninjaone_nom&id=eq.${hotelId}`);
  const h = hs && hs[0];
  if (!h) throw Object.assign(new Error("Hôtel introuvable"), { status: 404 });

  // Organisation NinjaOne de l'hôtel (champ « Nom NinjaOne », sinon nom de l'hôtel)
  const orgs = await ninjaOrganisations(env);
  const cibles = [h.ninjaone_nom, h.name].filter(Boolean).map(normNom).filter(Boolean);
  let orgId = null;
  for (const c of cibles) {
    const e = Object.entries(orgs).find(([, n]) => normNom(n) === c);
    if (e) { orgId = e[0]; break; }
  }
  if (!orgId) throw Object.assign(new Error("Organisation NinjaOne introuvable pour « " + (h.ninjaone_nom || h.name) +
    " » : renseignez le champ « Nom NinjaOne » de la fiche établissement."), { status: 404 });

  const page = await ninjaGet(env, "/v2/devices-detailed?df=" + encodeURIComponent("org=" + orgId) + "&pageSize=500");
  const serveurs = (Array.isArray(page) ? page : (page.devices || []))
    .filter(d => String(d.nodeClass || "").toUpperCase() === "WINDOWS_SERVER")
    .map(d => ({ id: d.id, nom: nomCourt(d.systemName || d.dnsName || d.displayName), en_ligne: d.offline === false }))
    .filter(d => d.nom);
  if (!serveurs.length) throw Object.assign(new Error("Aucun serveur Windows dans l'organisation NinjaOne « " + orgs[orgId] + " »."), { status: 404 });

  // 1) Serveurs AD déclarés dans l'onglet Inventaire serveurs (rôle ou nom)
  let declares = [];
  try {
    const inv = await sbJson(env, `inventaire_serveurs?select=nom,role&hotel_id=eq.${hotelId}`);
    declares = (inv || []).filter(x => /\b(AD|DC|active directory|contr[oô]leur de domaine|ADDS)\b/i.test(String(x.role || "")) || RE_NOM_DC.test(String(x.nom || "")))
      .map(x => nomCourt(x.nom));
  } catch (_) {}
  // 2) Sinon, nom du serveur dans NinjaOne
  let candidats = serveurs.filter(s => declares.includes(s.nom));
  if (!candidats.length) candidats = serveurs.filter(s => RE_NOM_DC.test(s.nom));
  if (!candidats.length) throw Object.assign(new Error("Contrôleur de domaine introuvable : aucun serveur nommé « DC » / « AD » dans NinjaOne (" +
    serveurs.map(s => s.nom).join(", ") + "). Indiquez son rôle « AD » dans Pilotage → Inventaire serveurs."), { status: 404 });
  const dc = candidats.find(s => s.en_ligne);
  if (!dc) throw Object.assign(new Error("Contrôleur de domaine hors ligne dans NinjaOne : " + candidats.map(s => s.nom).join(", ")), { status: 409 });
  return { dc, organisation: orgs[orgId], hotel: h.name };
}

async function routeAdDeverrouiller(env, body, user) {
  const scriptId = parseInt(env.NINJA_SCRIPT_AD_UNLOCK, 10);
  if (!scriptId) return { status: 400, body: { error: "Variable NINJA_SCRIPT_AD_UNLOCK non configurée sur le Worker : indiquez l'ID du script NinjaOne « DSI - Deverrouiller compte AD »." } };
  if (!uuidValide(body.hotelId)) return { status: 400, body: { error: "hotelId invalide" } };
  const compte = String(body.compte || "").trim().replace(/^.*\\/, "").replace(/@.*$/, "");
  if (!RE_COMPTE_AD.test(compte)) return { status: 400, body: { error: "Identifiant de compte invalide (lettres, chiffres, point, tiret, tiret bas ; ex. guestrelation)" } };
  const mode = body.mode === "diagnostic" ? "diagnostic" : "deverrouiller";

  let cible;
  try { cible = await trouverDC(env, body.hotelId); }
  catch (e) { return { status: e.status || 502, body: { error: String((e && e.message) || e) } }; }

  let g;
  try { g = await ninjaTokenGestion(env); }
  catch (e) { return { status: 502, body: { error: String((e && e.message) || e) } }; }

  // Garde-fou : l'ID configuré doit bien être le script de déverrouillage (vérifié par son NOM dans NinjaOne).
  // Un ID erroné ne peut ainsi jamais lancer un autre script sur le contrôleur de domaine.
  const nomAttendu = String(env.NINJA_SCRIPT_AD_UNLOCK_NOM || AD_SCRIPT_NOM_DEFAUT).trim();
  try {
    const rc = await fetch(g.host + "/v2/automation/scripts", { headers: { Authorization: "Bearer " + g.token, Accept: "application/json" } });
    const cat = await rc.json().catch(() => null);
    const liste = Array.isArray(cat) ? cat : ((cat && (cat.scripts || cat.results)) || []);
    if (!rc.ok || !liste.length) return { status: 502, body: { error: "Catalogue des scripts NinjaOne illisible (" + rc.status + ") : lancement refusé par sécurité." } };
    const sc = liste.find(x => Number(x.id) === scriptId);
    if (!sc || String(sc.name || "").trim().toLowerCase() !== nomAttendu.toLowerCase())
      return { status: 400, body: { error: "Le script NinjaOne #" + scriptId + (sc ? " s'appelle « " + sc.name + " »" : " est introuvable") + " et non « " + nomAttendu + " » : lancement refusé. Vérifiez NINJA_SCRIPT_AD_UNLOCK." } };
  } catch (e) { return { status: 502, body: { error: "Vérification du script NinjaOne impossible : " + ((e && e.message) || e) } }; }

  const jeton = bytesToB64(crypto.getRandomValues(new Uint8Array(9))).replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || String(Date.now());
  const res = await fetch(g.host + "/v2/device/" + encodeURIComponent(cible.dc.id) + "/script/run", {
    method: "POST",
    headers: { Authorization: "Bearer " + g.token, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      type: "SCRIPT", id: scriptId, runAs: "system",
      parameters: `-Compte ${compte} -Mode ${mode} -Jeton ${jeton} -Champ ${String(env.NINJA_CHAMP_AD_UNLOCK || AD_CHAMP_DEFAUT).replace(/[^A-Za-z0-9]/g, "")}`,
    }),
  });
  if (res.status === 401) ninjaCacheGestion = null;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.log("AD script/run refusé : " + res.status + " " + t.slice(0, 500));
    return { status: 502, body: { error: "NinjaOne " + res.status + " (serveur " + cible.dc.nom + " #" + cible.dc.id + ", script " + scriptId + ") : " + (t.slice(0, 300) || "aucun détail renvoyé") +
      (res.status === 404 ? " — script introuvable : vérifiez NINJA_SCRIPT_AD_UNLOCK" : "") } };
  }
  console.log(`AD ${mode} de « ${compte} » sur ${cible.dc.nom} (${cible.hotel}) demandé par ${(user && user.email) || "?"}`);
  return { status: 200, body: { success: true, deviceId: cible.dc.id, dc: cible.dc.nom, jeton, compte, mode } };
}

// Extrait l'objet JSON {"jeton":"X",...} d'un texte (sortie de script dans une activité)
function extraireResultatAd(texte, jeton) {
  if (typeof texte !== "string") return null;
  const i = texte.indexOf('{"jeton":"' + jeton + '"');
  if (i < 0) return null;
  let prof = 0, dansChaine = false, echap = false;
  for (let k = i; k < texte.length; k++) {
    const c = texte[k];
    if (dansChaine) { if (echap) echap = false; else if (c === "\\") echap = true; else if (c === '"') dansChaine = false; continue; }
    if (c === '"') dansChaine = true;
    else if (c === "{") prof++;
    else if (c === "}") { prof--; if (prof === 0) { try { return JSON.parse(texte.slice(i, k + 1).replace(/[\r\n]+/g, "")); } catch (_) { return null; } } }
  }
  return null;
}
function chercherResultatAd(obj, jeton, profondeur) {
  if (obj == null || (profondeur || 0) > 6) return null;
  if (typeof obj === "string") return extraireResultatAd(obj, jeton);
  if (typeof obj === "object") {
    if (obj.jeton === jeton && "compte" in obj) return obj;
    for (const v of Object.values(obj)) { const r = chercherResultatAd(v, jeton, (profondeur || 0) + 1); if (r) return r; }
  }
  return null;
}

async function routeAdResultat(env, body) {
  const deviceId = parseInt(body.deviceId, 10);
  const jeton = String(body.jeton || "").replace(/[^A-Za-z0-9]/g, "");
  if (!deviceId || !jeton) return { status: 400, body: { error: "deviceId et jeton requis" } };
  const champ = String(env.NINJA_CHAMP_AD_UNLOCK || AD_CHAMP_DEFAUT);
  const erreurs = [];

  // 1) Champ personnalisé de l'appareil (jeton API normal)
  try {
    const champs = await ninjaGet(env, "/v2/device/" + deviceId + "/custom-fields");
    const r = chercherResultatAd(champs, jeton);
    if (r) return { status: 200, body: { pret: true, resultat: r, source: "champ" } };
  } catch (e) { erreurs.push("champ : " + String((e && e.message) || e)); }

  // 2) Sortie du script dans les activités de l'appareil (jeton technicien)
  try {
    const g = await ninjaTokenGestion(env);
    const res = await fetch(g.host + "/v2/device/" + deviceId + "/activities?pageSize=40", {
      headers: { Authorization: "Bearer " + g.token, Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const r = chercherResultatAd(data, jeton);
      if (r) return { status: 200, body: { pret: true, resultat: r, source: "activite" } };
    } else {
      erreurs.push("activités : NinjaOne " + res.status + " " + (await res.text().catch(() => "")).slice(0, 150));
    }
  } catch (e) { erreurs.push("activités : " + String((e && e.message) || e)); }

  return { status: 200, body: { pret: false, detail: erreurs.join(" | ") } };
}

/* ===================== Suppression de PC de Sophos Central ===================== */

const SUPPR_MAX = 25; // plan gratuit : ~8 sous-requêtes fixes + 1 par PC (limite 50)

async function sophosSupprimer(token, compte, chemin) {
  const res = await fetch(compte.api_host + chemin, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "X-Tenant-ID": compte.tenant_id, Accept: "application/json" },
  });
  if (res.ok || res.status === 404) return true; // 404 = déjà supprimé dans Sophos
  const data = await res.json().catch(() => ({}));
  const err = new Error("Sophos " + res.status + " " + (data.message || data.error || ""));
  err.status = res.status;
  throw err;
}

async function routeSupprimerPostes(env, body, user) {
  const tenantId = String(body.tenantId || "").trim();
  if (!tenantId) return { status: 400, body: { error: "tenantId requis" } };
  const ids = [...new Set((Array.isArray(body.sophosIds) ? body.sophosIds : []).map(x => String(x || "").trim()).filter(x => /^[0-9a-zA-Z-]{8,64}$/.test(x)))];
  if (!ids.length) return { status: 400, body: { error: "Aucun PC sélectionné" } };
  if (ids.length > SUPPR_MAX) return { status: 400, body: { error: "25 PC maximum par opération (" + ids.length + " sélectionnés)" } };

  const T = encodeURIComponent(tenantId);
  const cs = (await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&tenant_id=eq.${T}&order=created_at.asc`)) || [];
  const compte = cs.find(c => c.principal !== false) || cs[0];
  if (!compte) return { status: 404, body: { error: "Compte Sophos inconnu" } };
  const liste = ids.map(x => '"' + x + '"').join(",");
  const postes = (await sbJson(env,
    `sophos_postes?select=sophos_id,hostname,last_seen_at&tenant_id=eq.${T}&sophos_id=in.(${liste})`)) || [];
  const connus = new Map(postes.map(p => [String(p.sophos_id), p]));
  if (!connus.size) return { status: 404, body: { error: "PC introuvables dans ce compte Sophos (resynchronisez)" } };

  let token;
  try {
    token = await sophosToken(compte.client_id, await dechiffrer(env, compte.client_secret_chiffre));
    compte.tenant_id = tenantId;
    if (!compte.api_host) compte.api_host = (await sophosWhoami(token)).apiHost;
  } catch (e) {
    return { status: 502, body: { error: String((e && e.message) || e) } };
  }

  // Garde-fou : on ne supprime pas un PC qui parle encore à Sophos.
  const jours = nombre(env.SEUIL_MUET_JOURS, 7);
  const seuil = Date.now() - jours * 86400000;
  const resultats = [];
  for (const [id, p] of connus) {
    if (!p.last_seen_at || new Date(p.last_seen_at).getTime() >= seuil) {
      resultats.push({ sophosId: id, hostname: p.hostname, ok: false, erreur: "vu par Sophos il y a moins de " + jours + " jours : PC encore actif, non supprimé" });
      continue;
    }
    try {
      await sophosSupprimer(token, compte, `/endpoint/v1/endpoints/${encodeURIComponent(id)}`);
      resultats.push({ sophosId: id, hostname: p.hostname, ok: true });
    } catch (e) {
      resultats.push({ sophosId: id, hostname: p.hostname, ok: false, erreur: messageDroitsSophos(e) });
      if (e && (e.status === 401 || e.status === 403)) break; // droits insuffisants : inutile d'insister
    }
  }
  ids.filter(x => !connus.has(x)).forEach(id => resultats.push({ sophosId: id, ok: false, erreur: "PC inconnu dans ce compte" }));

  const reussis = resultats.filter(r => r.ok).map(r => r.sophosId);
  if (reussis.length) {
    const lst = reussis.map(x => '"' + x + '"').join(",");
    await sb(env, `sophos_postes?tenant_id=eq.${T}&sophos_id=in.(${lst})`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
    await sb(env, `sophos_affectations?tenant_id=eq.${T}&sophos_id=in.(${lst})`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
  }
  console.log(`Suppression Sophos : ${reussis.length} PC supprimé(s) par ${(user && user.email) || "?"} — ` + resultats.filter(r => r.ok).map(r => r.hostname).join(", "));
  return { status: 200, body: { success: reussis.length > 0, reussis: reussis.length, resultats } };
}

/* ================================ Entrées ================================ */

async function routeCompte(env, body) {
  const hotelId = body.hotelId;
  let clientId = String(body.clientId || "").trim();
  const nouveauSecret = String(body.clientSecret || "").trim();
  if (!uuidValide(hotelId)) return { status: 400, body: { error: "hotelId invalide" } };

  const existants = await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&hotel_id=eq.${hotelId}`);
  const existant = existants && existants[0];

  // Compte partagé : reprendre les identifiants d'un hôtel déjà configuré
  let source = null;
  if (body.copierDe) {
    if (!uuidValide(body.copierDe)) return { status: 400, body: { error: "copierDe invalide" } };
    const src = await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&hotel_id=eq.${body.copierDe}`);
    source = src && src[0];
    if (!source) return { status: 400, body: { error: "Hôtel source sans compte Sophos" } };
    clientId = source.client_id;
  }
  if (!clientId) return { status: 400, body: { error: "ID client requis" } };

  let secret = nouveauSecret;
  if (!secret) {
    const base = source || existant;
    if (!base) return { status: 400, body: { error: "Secret requis pour un nouveau compte" } };
    secret = await dechiffrer(env, base.client_secret_chiffre);
  }

  // Test immédiat des identifiants (jeton + identification du tenant).
  let w;
  try {
    const token = await sophosToken(clientId, secret);
    w = await sophosWhoami(token);
  } catch (e) {
    return { status: 400, body: { error: String((e && e.message) || e) } };
  }

  const ligne = {
    hotel_id: hotelId,
    client_id: clientId,
    client_secret_chiffre: nouveauSecret ? await chiffrer(env, nouveauSecret) : (source || existant).client_secret_chiffre,
    tenant_id: w.tenantId,
    api_host: w.apiHost,
    actif: body.actif !== false,
    updated_at: new Date().toISOString(),
  };
  if (body.regles && typeof body.regles === "object") {
    const r = {};
    for (const k of ["groupes", "prefixes", "domaines", "ips"]) r[k] = listeRegle(body.regles, k);
    ligne.regles = r;
  }
  if (typeof body.principal === "boolean") ligne.principal = body.principal;
  const libelle = typeof body.libelle === "string" ? body.libelle.trim().slice(0, 120) : null;
  const enreg = await sbJson(env, "sophos_comptes?on_conflict=hotel_id&select=" + COLONNES_COMPTE, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(ligne),
  });
  const compte = enreg && enreg[0];
  // Un seul hôtel principal par compte Sophos partagé
  if (compte && compte.principal) {
    await sb(env, `sophos_comptes?tenant_id=eq.${encodeURIComponent(w.tenantId)}&id=neq.${compte.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ principal: false }),
    }).catch(() => {});
  }
  // Nom du compte Sophos : commun à tous les hôtels qui le partagent
  if (libelle !== null) {
    await sb(env, `sophos_comptes?tenant_id=eq.${encodeURIComponent(w.tenantId)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ libelle: libelle || null }),
    }).catch(() => {});
  }
  const synchro = compte && compte.actif ? await synchroniserHotel(env, compte) : null;
  return { status: 200, body: { success: true, tenantId: w.tenantId, apiHost: w.apiHost, synchro } };
}

const app = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "dsi-hotel-sophos" }, env);
    if (request.method === "GET" && url.pathname === "/ninja/callback") {
      try { return await routeNinjaCallback(env, request); }
      catch (e) { return pageSimple("Erreur", String((e && e.message) || e), false); }
    }
    if (request.method !== "POST") return json({ error: "Méthode non autorisée" }, env, 405);

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurés." }, env, 500);
    }
    // CAPEX : un superviseur peut actualiser l'inventaire NinjaOne de SON hôtel (bouton de la page CAPEX)
    if (url.pathname === "/capex-inventaire") {
      const u = await verifierUtilisateur(request, env);
      if (!u.ok) return json({ error: u.error }, env, u.status);
      if (u.role === "supervisor") {
        try {
          const r = await routeCapexInventaireClient(env, u.hotel_id);
          return json(r.body, env, r.status);
        } catch (e) {
          return json({ error: "Inventaire impossible pour le moment. Contactez le support DSI Hotel." }, env, 502);
        }
      }
      if (u.role !== "admin") return json({ error: "Réservé aux superviseurs et aux administrateurs" }, env, 403);
    }

    const auth = await verifierAdmin(request, env);
    if (!auth.ok) return json({ error: auth.error }, env, auth.status);
    const body = await request.json().catch(() => ({}));

    if (url.pathname === "/compte") {
      const r = await routeCompte(env, body);
      return json(r.body, env, r.status);
    }

    if (url.pathname === "/supprimer") {
      if (!uuidValide(body.hotelId)) return json({ error: "hotelId invalide" }, env, 400);
      const cs = await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&hotel_id=eq.${body.hotelId}`);
      const c = cs && cs[0];
      const freres = c && c.tenant_id
        ? (await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&tenant_id=eq.${encodeURIComponent(c.tenant_id)}&hotel_id=neq.${body.hotelId}`)) || []
        : [];
      if (c && freres.length) {
        // Compte partagé : les PC de cet hôtel redeviennent « non affectés »,
        // ses alertes seront réattribuées à la prochaine synchro.
        await sbJson(env, `sophos_comptes?id=eq.${c.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        await sbJson(env, `sophos_postes?tenant_id=eq.${encodeURIComponent(c.tenant_id)}&hotel_id=eq.${body.hotelId}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ hotel_id: null, affectation: null }),
        });
        if (c.principal && !freres.some(f => f.principal)) {
          await sb(env, `sophos_comptes?id=eq.${freres[0].id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ principal: true }) });
        }
        await synchroniserHotel(env, freres[0]).catch(() => {});
      } else {
        for (const t of ["sophos_alertes", "sophos_postes", "sophos_comptes"]) {
          await sbJson(env, `${t}?hotel_id=eq.${body.hotelId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        }
        if (c && c.tenant_id) {
          const T = encodeURIComponent(c.tenant_id);
          for (const t of ["sophos_postes", "sophos_alertes", "sophos_affectations"]) {
            await sb(env, `${t}?tenant_id=eq.${T}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
          }
        }
      }
      return json({ success: true }, env);
    }

    if (url.pathname === "/synchroniser") {
      if (!uuidValide(body.hotelId)) return json({ error: "hotelId invalide" }, env, 400);
      const cs = await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&hotel_id=eq.${body.hotelId}`);
      if (!cs || !cs[0]) return json({ error: "Aucun compte Sophos pour cet hôtel" }, env, 404);
      const r = await synchroniserHotel(env, cs[0]);
      let notifiees = 0;
      if (r.ok) { try { notifiees = await notifierNouvellesAlertes(env, r.hotels_du_compte || [body.hotelId]); } catch (_) {} }
      return json({ ...r, notifiees }, env, r.ok ? 200 : 502);
    }

    if (url.pathname === "/affecter") {
      // body = { tenantId, items: [{ sophosId, hostname, hotelId|null, ignorer }] }
      // hotelId null = revenir aux règles automatiques ; ignorer = PC hors de nos hôtels
      const tenantId = String(body.tenantId || "").trim();
      const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
      if (!tenantId || !items.length) return json({ error: "tenantId et items requis" }, env, 400);
      const freres = (await sbJson(env, `sophos_comptes?select=${COLONNES_COMPTE}&tenant_id=eq.${encodeURIComponent(tenantId)}`)) || [];
      if (!freres.length) return json({ error: "Compte Sophos inconnu" }, env, 404);
      const autorises = new Set(freres.map(f => f.hotel_id));
      const aPoser = items.filter(i => i.ignorer || (i.hotelId && autorises.has(i.hotelId))).map(i => ({
        tenant_id: tenantId, sophos_id: String(i.sophosId), hostname: i.hostname || null,
        hotel_id: i.ignorer ? null : i.hotelId, par: (auth.user && auth.user.email) || null, le: new Date().toISOString(),
      }));
      const aRetirer = items.filter(i => !i.hotelId && !i.ignorer).map(i => String(i.sophosId));
      if (aPoser.length) {
        await sbJson(env, "sophos_affectations?on_conflict=tenant_id,sophos_id", {
          method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(aPoser),
        });
      }
      if (aRetirer.length) {
        await sbJson(env, `sophos_affectations?tenant_id=eq.${encodeURIComponent(tenantId)}&sophos_id=in.(${aRetirer.map(x => '"' + x.replace(/"/g, "") + '"').join(",")})`, {
          method: "DELETE", headers: { Prefer: "return=minimal" },
        });
      }
      const actifs = freres.filter(f => f.actif);
      const r = actifs.length ? await synchroniserTenant(env, actifs) : { ok: true };
      return json({ success: true, affectes: aPoser.length, retires: aRetirer.length, non_affectes: r.non_affectes, erreur: r.ok ? undefined : r.erreur }, env);
    }

    if (url.pathname === "/ninja-postes") {
      try {
        const r = await routeNinjaPostes(env, body);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/ninja-org") {
      try {
        const r = await routeNinjaOrg(env, body);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/tamper") {
      try {
        const r = await routeTamper(env, body, auth.user);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/vider-telechargements") {
      try {
        const r = await routeViderTelechargements(env, body, auth.user);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/ninja/lien") {
      const r = await routeNinjaLien(env, request, auth.user);
      return json(r.body, env, r.status);
    }

    if (url.pathname === "/ad-deverrouiller") {
      try {
        const r = await routeAdDeverrouiller(env, body, auth.user);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/ad-resultat") {
      try {
        const r = await routeAdResultat(env, body);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/supprimer-postes") {
      try {
        const r = await routeSupprimerPostes(env, body, auth.user);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/scan") {
      try {
        const r = await routeScan(env, body, auth.user);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/capex-inventaire") {
      try {
        const r = await routeCapexInventaire(env, body);
        return json(r.body, env, r.status);
      } catch (e) {
        return json({ error: String((e && e.message) || e) }, env, 502);
      }
    }

    if (url.pathname === "/recap-licences") {
      return json({ envoyees: await recapLicences(env) }, env);
    }

    if (url.pathname === "/run") {
      return json(await traiterLot(env), env);
    }

    return json({ error: "Route inconnue" }, env, 404);
  },

  async scheduled(event, env, ctx) {
    const quand = new Date(event.scheduledTime || Date.now());
    // Le lundi matin, ce passage est consacré au récapitulatif des licences
    // (budget de sous-requêtes du plan gratuit) ; le lot reprend au suivant.
    if (estHeureRecapLicences(quand)) {
      ctx.waitUntil(recapLicences(env).catch(e => console.log("Récap licences : " + ((e && e.message) || e))));
      return;
    }
    // Du 1er au 7 du mois, un passage sur deux : inventaire CAPEX des hôtels pas encore faits.
    // S'il n'y a plus rien à faire, le passage reprend le lot Sophos normal.
    if (estPeriodeCapex(quand)) {
      ctx.waitUntil((async () => {
        try {
          const r = await capexLotMensuel(env);
          if (r.traites) { console.log("CAPEX : " + r.traites + " hôtel(s) inventorié(s), reste " + r.restants); return; }
        } catch (e) { console.log("CAPEX : " + ((e && e.message) || e)); }
        await traiterLot(env).catch(e => console.log("Lot Sophos : " + ((e && e.message) || e)));
      })());
      return;
    }
    ctx.waitUntil(traiterLot(env).catch(e => console.log("Lot Sophos : " + ((e && e.message) || e))));
  },
};

// Point d'entrée : nettoie les variables (espaces collés par erreur) et
// garantit une réponse JSON avec CORS même en cas d'erreur inattendue.
function envPropre(env) {
  const e = { ...env };
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SOPHOS_ENC_KEY", "MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "NINJA_CLIENT_ID", "NINJA_CLIENT_SECRET", "NINJA_USER_CLIENT_ID", "NINJA_USER_CLIENT_SECRET"]) {
    if (typeof e[k] === "string") e[k] = e[k].trim();
  }
  return e;
}

export default {
  async fetch(request, env, ctx) {
    const e = envPropre(env);
    try { return await app.fetch(request, e, ctx); }
    catch (err) { return json({ error: "Erreur interne du Worker : " + String((err && err.message) || err) }, e, 500); }
  },
  async scheduled(event, env, ctx) {
    return app.scheduled(event, envPropre(env), ctx);
  },
};
