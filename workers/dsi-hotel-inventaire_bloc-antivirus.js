/* ======================= AJOUT : antivirus de tous les PC ======================= */
// À COLLER dans le Worker dsi-hotel-inventaire (éditeur Cloudflare) À LA PLACE de tout le bloc
// compris entre « AJOUT : antivirus de tous les PC » et « FIN AJOUT : antivirus de tous les PC ».
// Le reste du Worker ne change pas.
//
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
  const actif = (l) => !l.productState || /^(ON|ENABLED|ACTIVE)$/i.test(String(l.productState));
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
