// @ts-nocheck
// =====================================================================
//  Supabase Edge Function « tableau-mails » — DSI Hotel
//  Mails du Tableau de bord hôtels, envoyés à team@dsihotel.fr :
//   - chaque jour : alerte si un hôtel perd 5 points ou plus en 7 jours
//     (complétude, conformité ou note des machines) ; une même alerte n'est pas renvoyée avant 7 jours ;
//   - chaque lundi : récapitulatif du plan d'action (par technicien) et de l'évolution de la semaine.
//  Déclenchée chaque matin par pg_cron (après la photo quotidienne des scores).
//  Secrets (mêmes que « rapport-mensuel ») : CRON_SECRET, MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET
//  Essais manuels : ?key=<CRON_SECRET>&test=alertes  ou  &test=recap  (envoi immédiat, marqué [ESSAI])
// =====================================================================
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const MS_TENANT_ID = Deno.env.get("MS_TENANT_ID");
const MS_CLIENT_ID = Deno.env.get("MS_CLIENT_ID");
const MS_CLIENT_SECRET = Deno.env.get("MS_CLIENT_SECRET");
const EXPEDITEUR = Deno.env.get("MAIL_FROM") || "support@dsihotel.fr";
const DESTINATAIRES = ["team@dsihotel.fr"];
const SEUIL_BAISSE = 5;          // points perdus en 7 jours pour déclencher une alerte
const PORTAIL = "https://portail.dsihotel.com/?ouvrir=completude";

const CHAMPS = [
  { k: "completude", avant: "c0", apres: "c1", lbl: "Complétude des infos", u: " %" },
  { k: "conformite", avant: "f0", apres: "f1", lbl: "Conformité", u: " %" },
  { k: "machines", avant: "m0", apres: "m1", lbl: "Note des machines", u: " / 100" },
];

async function sb(chemin, options = {}) {
  const r = await fetch(SB_URL + "/rest/v1/" + chemin, {
    ...options,
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!r.ok) throw new Error("Supabase " + r.status + " : " + (await r.text()).slice(0, 300));
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

async function jetonGraph() {
  const r = await fetch("https://login.microsoftonline.com/" + MS_TENANT_ID + "/oauth2/v2.0/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: MS_CLIENT_ID, client_secret: MS_CLIENT_SECRET, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("Jeton Microsoft refusé : " + (d.error_description || d.error || r.status));
  return d.access_token;
}
async function envoyerMail(sujet, html) {
  const jeton = await jetonGraph();
  const r = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(EXPEDITEUR) + "/sendMail", {
    method: "POST", headers: { Authorization: "Bearer " + jeton, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { subject: sujet, body: { contentType: "HTML", content: html }, toRecipients: DESTINATAIRES.map(a => ({ emailAddress: { address: a } })) },
      saveToSentItems: true,
    }),
  });
  if (!r.ok) throw new Error("Envoi Microsoft " + r.status + " : " + (await r.text()).slice(0, 300));
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const frDate = (d) => d ? new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "";
const aujourdHuiParis = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
const estLundi = () => new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date()) === "Mon";

function cadre(titre, sousTitre, contenu) {
  return '<div style="font-family:Segoe UI,Arial,sans-serif;color:#14171F;max-width:760px">' +
    '<div style="background:#0F0F24;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0"><div style="font-size:17px;font-weight:700">' + esc(titre) + '</div>' +
    '<div style="font-size:12.5px;color:#C9CED8;margin-top:2px">' + esc(sousTitre) + '</div></div>' +
    '<div style="border:1px solid #E1E4EA;border-top:none;border-radius:0 0 10px 10px;padding:16px 18px">' + contenu +
    '<p style="margin:18px 0 0"><a href="' + PORTAIL + '" style="background:#1E4FA8;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600">Ouvrir le tableau de bord</a></p>' +
    '<p style="font-size:11px;color:#8A90A0;margin-top:14px">Mail automatique du portail DSI Hotel (tableau de bord hôtels).</p></div></div>';
}
const th = (t, align) => '<th style="text-align:' + (align || "left") + ';font-size:11px;color:#5A6172;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid #E1E4EA">' + t + '</th>';
const td = (t, style) => '<td style="padding:6px 8px;border-bottom:1px solid #EEF0F4;font-size:13px;' + (style || "") + '">' + t + '</td>';
const ecart = (v) => '<b style="color:' + (v < 0 ? "#C53030" : v > 0 ? "#2F855A" : "#5A6172") + '">' + (v > 0 ? "+" : "") + v + '</b>';

// ---------- Alertes de baisse ----------
async function alertes(bilan, essai) {
  if (!bilan.jour_ref) return { envoye: false, raison: "pas encore de photo vieille de 7 jours" };
  const depuis = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const deja = essai ? [] : (await sb("score_alertes?select=hotel_id,champ&jour=gte." + depuis)) || [];
  const dejaSet = new Set(deja.map(a => a.hotel_id + "|" + a.champ));
  const baisses = [];
  for (const h of bilan.hotels) for (const c of CHAMPS) {
    const a = h[c.avant], b = h[c.apres];
    if (a == null || b == null || a - b < SEUIL_BAISSE) continue;
    if (dejaSet.has(h.id + "|" + c.k)) continue;
    baisses.push({ h, c, a, b });
  }
  if (!baisses.length) return { envoye: false, raison: "aucune baisse de " + SEUIL_BAISSE + " points ou plus" };
  baisses.sort((x, y) => (y.a - y.b) - (x.a - x.b));
  const lignes = baisses.map(x => '<tr>' + td('<b>' + esc(x.h.nom) + '</b>') + td(esc(x.c.lbl)) + td(x.a + x.c.u + ' → <b>' + x.b + x.c.u + '</b>') + td(ecart(x.b - x.a) + ' pts', "text-align:right") + '</tr>').join("");
  const html = cadre("⚠ " + baisses.length + " baisse(s) de score cette semaine",
    "Comparaison du " + frDate(bilan.jour) + " avec le " + frDate(bilan.jour_ref) + " — seuil : " + SEUIL_BAISSE + " points",
    '<p style="font-size:13.5px;margin:0 0 10px">Ces hôtels ont perdu ' + SEUIL_BAISSE + ' points ou plus en 7 jours. Ouvrez leur fiche pour voir ce qui a changé (sauvegarde en échec, antivirus, machines, check-list…).</p>' +
    '<table style="border-collapse:collapse;width:100%"><tr>' + th("Hôtel") + th("Score") + th("Évolution") + th("Écart", "right") + '</tr>' + lignes + '</table>');
  await envoyerMail((essai ? "[ESSAI] " : "") + "Tableau de bord hôtels : " + baisses.length + " baisse(s) de score", html);
  if (!essai) await sb("score_alertes", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(baisses.map(x => ({ hotel_id: x.h.id, champ: x.c.k, jour: bilan.jour, avant: x.a, apres: x.b }))) });
  return { envoye: true, baisses: baisses.length };
}

// ---------- Récapitulatif du lundi ----------
async function recap(bilan, essai) {
  const jour = aujourdHuiParis();
  const dans7 = new Date(Date.now() + 7 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const actions = bilan.actions || [];
  const etat = (a) => !a.echeance ? { t: "sans échéance", c: "#8A90A0", r: 3 } : a.echeance < jour ? { t: "en retard (" + frDate(a.echeance) + ")", c: "#C53030", r: 0 }
    : a.echeance <= dans7 ? { t: "cette semaine (" + frDate(a.echeance) + ")", c: "#B45309", r: 1 } : { t: frDate(a.echeance), c: "#5A6172", r: 2 };
  const enRetard = actions.filter(a => a.echeance && a.echeance < jour).length;
  const parResp = {};
  actions.filter(a => a.responsable).forEach(a => { (parResp[a.responsable] = parResp[a.responsable] || []).push(a); });
  const blocsResp = Object.keys(parResp).sort((a, b) => a.localeCompare(b, "fr")).map(nom => {
    const l = parResp[nom].sort((x, y) => etat(x).r - etat(y).r || String(x.echeance || "").localeCompare(String(y.echeance || "")));
    const nbR = l.filter(a => etat(a).r === 0).length;
    return '<h3 style="font-size:14.5px;margin:18px 0 4px">' + esc(nom) + ' <span style="font-weight:400;color:#5A6172;font-size:12.5px">— ' + l.length + ' point(s)' + (nbR ? ', <b style="color:#C53030">' + nbR + ' en retard</b>' : '') + '</span></h3>' +
      '<table style="border-collapse:collapse;width:100%"><tr>' + th("Hôtel") + th("Point") + th("Échéance") + '</tr>' +
      l.map(a => { const e = etat(a); return '<tr>' + td(esc(a.hotel)) + td(esc(a.libelle) + (a.detail ? ' <span style="color:#8A90A0;font-size:12px">· ' + esc(a.detail) + '</span>' : '')) + td('<span style="color:' + e.c + ';font-weight:600">' + e.t + '</span>', "white-space:nowrap") + '</tr>'; }).join("") + '</table>';
  }).join("");
  const sansResp = Math.max(0, (bilan.points_ouverts || 0) - (bilan.points_avec_responsable || 0));

  // Évolution de la semaine
  let evol = '<p style="font-size:13px;color:#5A6172">Évolution sur 7 jours disponible dès qu\'une photo des scores aura 7 jours.</p>';
  if (bilan.jour_ref) {
    const mouv = [];
    for (const h of bilan.hotels) for (const c of CHAMPS) { const a = h[c.avant], b = h[c.apres]; if (a != null && b != null && a !== b) mouv.push({ h, c, d: b - a, b }); }
    const baisses = mouv.filter(m => m.d < 0).sort((x, y) => x.d - y.d).slice(0, 8);
    const hausses = mouv.filter(m => m.d > 0).sort((x, y) => y.d - x.d).slice(0, 8);
    const tab = (titre, l) => '<h3 style="font-size:14px;margin:14px 0 4px">' + titre + '</h3>' + (l.length ? '<table style="border-collapse:collapse;width:100%">' +
      l.map(m => '<tr>' + td(esc(m.h.nom)) + td(esc(m.c.lbl)) + td(m.b + m.c.u) + td(ecart(m.d) + ' pts', "text-align:right") + '</tr>').join("") + '</table>' : '<p style="font-size:13px;color:#5A6172;margin:0">Aucune.</p>');
    evol = '<p style="font-size:12.5px;color:#5A6172;margin:0">Du ' + frDate(bilan.jour_ref) + ' au ' + frDate(bilan.jour) + '</p>' + tab("📉 Plus fortes baisses", baisses) + tab("📈 Plus fortes hausses", hausses);
  }

  const html = cadre("Tableau de bord hôtels — récapitulatif de la semaine", "Semaine du " + frDate(jour),
    '<table style="border-collapse:collapse;width:100%;margin-bottom:6px"><tr>' +
      [['Points ouverts', bilan.points_ouverts || 0, '#14171F'], ['Avec responsable', bilan.points_avec_responsable || 0, '#1E4FA8'], ['En retard', enRetard, enRetard ? '#C53030' : '#2F855A'], ['Sans responsable', sansResp, '#B45309']]
        .map(([l, v, c]) => '<td style="padding:10px;border:1px solid #E1E4EA;text-align:center"><div style="font-size:24px;font-weight:700;color:' + c + '">' + v + '</div><div style="font-size:12px;color:#5A6172">' + l + '</div></td>').join("") +
    '</tr></table>' +
    '<h2 style="font-size:16px;margin:18px 0 0">Plan d\'action par technicien</h2>' +
    (blocsResp || '<p style="font-size:13px;color:#5A6172">Aucun point n\'a encore de responsable : choisissez-en un dans la fiche de chaque hôtel (bloc « Plan d\'action »).</p>') +
    '<h2 style="font-size:16px;margin:22px 0 0">Évolution des scores</h2>' + evol);
  await envoyerMail((essai ? "[ESSAI] " : "") + "Tableau de bord hôtels — récapitulatif du " + frDate(jour) + (enRetard ? " · " + enRetard + " action(s) en retard" : ""), html);
  return { envoye: true, actions: actions.length, enRetard };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const cle = req.headers.get("x-cron-secret") || url.searchParams.get("key") || "";
  if (!CRON_SECRET || cle !== CRON_SECRET) return new Response("Non autorisé", { status: 401 });
  try {
    const test = url.searchParams.get("test") || "";
    const bilan = await sb("rpc/tableau_bilan", { method: "POST", body: "{}" });
    const res = {};
    if (!test || test === "alertes") res.alertes = await alertes(bilan, !!test);
    if (test === "recap" || (!test && estLundi())) res.recap = await recap(bilan, !!test);
    return new Response(JSON.stringify(res, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (e) {
    return new Response(JSON.stringify({ erreur: String(e && e.message || e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
