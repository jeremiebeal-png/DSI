// ===== Page « completude » — condition dans App : page === "completude" && isAdmin =====
// Tableau de bord des hôtels : score de COMPLÉTUDE (infos renseignées) et de CONFORMITÉ (ce qui est au vert).
//   - Classement (accueil de la page) : un hôtel par ligne, trait = hôtel le plus renseigné (référence) / objectif 90 %
//   - Fiche hôtel (clic sur un hôtel) : toutes les informations, critère par critère, et les infos à saisir
//   - Barème : points de chaque critère (modifiables)
// Calcul côté base : fonction score_mesures() (supabase/completude.sql). Les états sont internes au composant
// CompletudeTableau : app.js ne lui passe que hotels, isMobile, setPage et adminFromName.
function Page_completude(ctx) {
  const { hotels, isMobile, setPage, adminFromName, ouvrirPourHotel } = ctx;
  // Ouvre la page du portail correspondant à un domaine, directement sur l'hôtel.
  // Dans le portail : ouvrirPourHotel (app.js). Hors portail (aperçu tableau.html) : lien ?ouvrir=…&hotel=…
  const ouvrir = (pageCible, hotelId) => {
    if (ouvrirPourHotel) ouvrirPourHotel(pageCible, hotelId);
    else window.location.href = "/?ouvrir=" + encodeURIComponent(pageCible) + "&hotel=" + encodeURIComponent(hotelId || "");
  };
  return React.createElement(CompletudeTableau, { hotels, isMobile, setPage, adminFromName, ouvrir });
}
// Page du portail ouverte par un clic sur un domaine
const CPL_PAGE_DOMAINE = { fiche: "client-admin", srv: "inventaire", bkp: "backups", av: "sophos", m365: "m365", chk: "checklist", mat: "capex" };
const CPL_NOM_PAGE = { "client-admin": "Établissements", inventaire: "Inventaire serveurs", backups: "Sauvegardes", sophos: "Sécurité Anti Virus", m365: "Sécurité Microsoft", checklist: "Check-list", capex: "CAPEX" };

const CPL_DOMAINES = {
  comp: [["fiche", "Info Hotel"], ["srv", "Serveurs"], ["bkp", "Sauvegardes"], ["av", "Antivirus"], ["m365", "Microsoft 365"], ["chk", "Check-list"]],   // domaine « Projets » retiré le 23/11/2026
  conf: [["srv", "Serveurs"], ["bkp", "Sauvegardes"], ["av", "Antivirus"], ["m365", "Microsoft 365"], ["chk", "Check-list"], ["mat", "Matériel"]],
};
const CPL_OBJECTIF_CONF = 90;
// Libellés courts des domaines (en-têtes des petites cases du classement)
const CPL_COURT = { fiche: "Info", srv: "Srv", bkp: "Sauv", av: "AV", m365: "M365", chk: "Chk", prj: "Proj", mat: "Mat" };
const CPL_CASE = 40;
// SOC externes (même liste que la page Sécurité Anti Virus) — d'autres hôtels passeront chez Stoïk
const CPL_SOC_NOMS = { stoik: "Stoïk" };
const cplSocNom = (k) => k ? (CPL_SOC_NOMS[String(k).toLowerCase()] || String(k)) : null;
// Antivirus en vigueur : le « futur » dès que la date de bascule est passée (même règle que Sécurité Anti Virus)
function cplAvEnVigueur(h) {
  const jour = new Date().toISOString().slice(0, 10);
  const faite = !!(h.antivirus_futur && h.antivirus_bascule && h.antivirus_bascule <= jour);
  return { actuel: String((faite ? h.antivirus_futur : h.antivirus) || "").toLowerCase(), avant: faite ? String(h.antivirus || "").toLowerCase() : null,
           futur: !faite && h.antivirus_futur ? String(h.antivirus_futur).toLowerCase() : null, bascule: h.antivirus_bascule || null };
}
// Badge « serveurs hébergés ailleurs » (ex. réseau Hilton) : serveurs, sauvegardes et check-list hors score
// Badge « géré par la chaîne » / « serveurs hébergés ailleurs » (ex. Hilton, Marriott) : domaines concernés hors score
const cplChaine = (t) => { const m = String(t || "").match(/hilton|marriott|ihg|accor|hyatt|radisson|best ?western/i); return m ? m[0].replace(/^./, c => c.toUpperCase()) : null; };
const cplBadgeExt = (e, sa) => {
  if (!sa || !sa.sans_serveur) return null;
  const ch = cplChaine(sa.serveurs_externes);
  const txt = ch ? (sa.av_non_gere && sa.m365_non_gere ? "Géré par " + ch : "Serveurs " + ch) : sa.serveurs_externes ? "Serveurs hébergés" : "Sans serveur";
  return e('span', { title: (sa.serveurs_externes || "Pas de serveur sur site") + " : hors score", style: { fontSize: 10.5, padding: "1px 6px", borderRadius: 999, background: "#EEF0F4", color: "#2C3240", fontWeight: 600, marginLeft: 6, whiteSpace: "nowrap" } }, txt);
};
const cplBadgeSoc = (e, soc, grand) => soc ? e('span', { title: "SOC externe : " + cplSocNom(soc), style: { fontSize: grand ? 12 : 10.5, padding: grand ? "2px 9px" : "1px 6px", borderRadius: 999, background: "#EDE6F7", color: "#4B2A80", fontWeight: 600, marginLeft: 6, whiteSpace: "nowrap" } }, "SOC " + cplSocNom(soc)) : null;
// Hôtel de référence pour la complétude : VOCO - Clichy (choix du 23/11/2026). Si cet hôtel n'existe plus,
// la référence redevient automatiquement l'hôtel le plus renseigné.
const CPL_REFERENCE_ID = "c1e4b815-e842-41fc-ab8b-e57d00d7705b";
const CPL_CONF_MIN_POINTS = 30;
const CPL_AV_NOMS = { sophos: "Sophos", crowdstrike: "CrowdStrike", sentinelone: "SentinelOne", watchguard: "WatchGuard", defender: "Microsoft Defender", trendmicro: "Trend Micro", autre: "Autre" };

// Couleur de TEXTE du palier (version foncée, lisible sur fond blanc)
function cplTexte(p) { return p == null ? "#5A6172" : p >= 85 ? "#1E4FA8" : p >= 70 ? "#2D5BB0" : p >= 50 ? "#8A5A00" : "#A8401F"; }
// Couleur des tuiles de couverture (NinjaOne, antivirus, mises à jour, sauvegardes) :
// 100 % = vert, de 90 à 99 % = orange foncé, sous 90 % = rouge (choix du 24/11/2026)
function cplCouverture(p) { return p == null ? "#EEF0F4" : p >= 100 ? "#2E7D32" : p >= 90 ? "#B45309" : "#B42318"; }
// Statut Veeam → couleurs de la page Sauvegardes (vert OK, orange avertissement, rouge échec, gris autre)
function cplVeeam(st) {
  const s = String(st || "").toLowerCase();
  if (s === "success") return { c: "#38A169", bg: "#E9F6EE", fg: "#2F855A", lbl: "OK", rang: 3 };
  if (s === "warning") return { c: "#DD6B20", bg: "#FEF0E4", fg: "#B45309", lbl: "Avertissement", rang: 1 };
  if (s === "failure" || s === "failed" || s === "error") return { c: "#E53E3E", bg: "#FDECEC", fg: "#C53030", lbl: "Échec", rang: 0 };
  return { c: "#A0AEC0", bg: "#F0F0F4", fg: "#718096", lbl: st || "Pas de résultat", rang: 2 };
}
function cplBande(p) {
  if (p == null) return { c: "#C9CED8", bg: "#EEF0F4", fg: "#5A6172", tier: "—" };
  if (p >= 85) return { c: "#1E4FA8", bg: "#1E4FA8", fg: "#FFFFFF", tier: "Très bon" };
  if (p >= 70) return { c: "#5B8DEF", bg: "#CFDDF8", fg: "#0E2A5C", tier: "Avancé" };
  if (p >= 50) return { c: "#E0A030", bg: "#F6DFA8", fg: "#5A3B00", tier: "En cours" };
  return { c: "#C4532D", bg: "#F5C2AE", fg: "#5C1A06", tier: "À lancer" };
}

function CompletudeTableau({ hotels, isMobile, setPage, adminFromName, ouvrir }) {
  const e = React.createElement;
  const [vue, setVue] = React.useState("classement");      // classement | tournees | fiche | bareme
  const [mode, setMode] = React.useState("comp");           // comp | conf
  const [dom, setDom] = React.useState("all");
  const [hotelId, setHotelId] = React.useState("");
  const [socFiltre, setSocFiltre] = React.useState("");     // "" = tous, "_sans" = sans SOC, sinon code du SOC
  const [imp, setImp] = React.useState(null);               // import NinjaOne de tous les hôtels : { fait, total, ajoutes, majs, erreurs, fini }
  const [data, setData] = React.useState(null);              // { criteres, mesures, historique, saisies }
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const charger = async () => {
    setBusy(true); setErr("");
    try {
      // score_mesures renvoie ~40 lignes par hôtel : lecture par pages de 1000 (limite PostgREST)
      let mesures = [];
      for (let de = 0; de < 20000; de += 1000) {
        const { data: lot, error } = await sb.rpc("score_mesures").range(de, de + 999);
        if (error) throw error;
        mesures = mesures.concat(lot || []);
        if (!lot || lot.length < 1000) break;
      }
      const [{ data: criteres, error: e1 }, { data: historique, error: e2 }, { data: saisies, error: e3 }] = await Promise.all([
        sb.from("score_criteres").select("*").order("ordre"),
        sb.from("score_historique").select("*").order("mois"),
        sb.from("hotel_completude").select("*"),
      ]);
      if (e1 || e2 || e3) throw (e1 || e2 || e3);
      setData({ criteres: criteres || [], mesures, historique: historique || [], saisies: saisies || [] });
    } catch (x) {
      const m = (x && x.message) || String(x);
      setErr(/score_mesures|score_criteres|hotel_completude|does not exist|Could not find/i.test(m)
        ? "Le script supabase/completude.sql n'a pas encore été exécuté dans Supabase (" + m + ")."
        : "Erreur de chargement : " + m);
    }
    setBusy(false);
  };
  React.useEffect(() => { charger(); }, []);

  // Import NinjaOne de l'inventaire serveurs pour TOUS les hôtels (Worker dsi-hotel-inventaire, route /importer,
  // un hôtel par appel : limite de sous-requêtes du plan gratuit). Ne supprime jamais rien, n'écrase ni rôle ni Care Pack.
  const importerTout = async () => {
    const sansServeur = new Set((data ? data.saisies : []).filter(x => x.sans_serveur || x.exclu).map(x => x.hotel_id));
    const cibles = hotels.filter(h => !/d[ée]mo|client test/i.test(h.name || "") && !sansServeur.has(h.id)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!confirm("Importer l'inventaire serveurs depuis NinjaOne pour les " + cibles.length + " hôtels ?\n\nLes machines manquantes sont ajoutées, l'OS, les mises à jour et l'antivirus sont mis à jour. Rien n'est supprimé ; rôles, Care Pack et notes ne sont jamais modifiés.\n\nCompter 2 à 4 minutes.")) return;
    const { data: sd } = await sb.auth.getSession();
    const token = (sd.session && sd.session.access_token) || "";
    const r = { fait: 0, total: cibles.length, ajoutes: 0, majs: 0, sansServeur: [], erreurs: [], fini: false };
    setImp({ ...r });
    for (const h of cibles) {
      try {
        const res = await fetch(INVENTAIRE_API_URL + "/importer", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ hotelId: h.id }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) r.erreurs.push(h.name + " : " + (d.error || "erreur " + res.status));
        else {
          r.ajoutes += d.ajoutes || 0; r.majs += d.mis_a_jour || 0;
          if (!(d.ajoutes || 0) && !(d.mis_a_jour || 0) && !(d.absents_de_ninjaone || []).length && !(d.rapprochements || []).length) r.sansServeur.push(h.name);
        }
      } catch (x) { r.erreurs.push(h.name + " : " + ((x && x.message) || x)); }
      r.fait++;
      setImp({ ...r });
    }
    // Puis lecture de toutes les machines (postes compris) pour la note par machine
    try { await fetch(INVENTAIRE_API_URL + "/machines", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: "{}" }); } catch (x) { r.erreurs.push("Lecture des machines : " + ((x && x.message) || x)); }
    r.fini = true; setImp({ ...r });
    charger();
  };

  // ---------- Calcul des scores ----------
  const calc = React.useMemo(() => {
    if (!data) return null;
    const crit = {};
    data.criteres.filter(c => c.actif).forEach(c => { crit[c.code] = c; });
    const parHotel = {};
    data.mesures.forEach(m => {
      const c = crit[m.code];
      if (!c) return;
      const h = parHotel[m.hotel_id] = parHotel[m.hotel_id] || { lignes: [], comp: { o: 0, a: 0, dom: {} }, conf: { o: 0, a: 0, dom: {} } };
      const ratio = m.ratio == null ? null : Number(m.ratio);
      h.lignes.push({ ...c, ratio, detail: m.detail });
      if (ratio == null) return;
      const s = h[c.score];
      s.o += c.points * ratio; s.a += c.points;
      const d = s.dom[c.domaine] = s.dom[c.domaine] || { o: 0, a: 0 };
      d.o += c.points * ratio; d.a += c.points;
    });
    const pct = (x) => x && x.a > 0 ? Math.round(100 * x.o / x.a) : null;
    const liste = Object.keys(parHotel).map(id => {
      const h = parHotel[id];
      const hotel = hotels.find(x => x.id === id) || { id, name: "?" };
      const domC = {}, domF = {};
      CPL_DOMAINES.comp.forEach(([k]) => { domC[k] = pct(h.comp.dom[k]); });
      CPL_DOMAINES.conf.forEach(([k]) => { domF[k] = pct(h.conf.dom[k]); });
      return {
        id, hotel, nom: hotel.name, lignes: h.lignes,
        comp: pct(h.comp), conf: h.conf.a >= CPL_CONF_MIN_POINTS ? pct(h.conf) : null, confPoints: h.conf.a,
        domC, domF,
        aSaisir: h.lignes.filter(l => l.score === "comp" && l.ratio != null && l.ratio < 1).length,
        aCorriger: h.lignes.filter(l => l.score === "conf" && l.ratio != null && l.ratio < 1).length,
      };
    });
    // Référence = moyenne de tous les hôtels suivis (plus d'hôtel modèle depuis le 24/11/2026)
    const moyDe = (f) => { const v = liste.map(f).filter(n => n != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    const domMoy = {};
    CPL_DOMAINES.comp.forEach(([k]) => { domMoy[k] = moyDe(x => x.domC[k]); });
    const ref = { id: "__moyenne__", nom: "la moyenne de tous les hôtels", comp: moyDe(x => x.comp), domC: domMoy };
    return { liste, ref };
  }, [data, hotels]);

  // ---------- Petits éléments communs ----------
  const carte = (enfants, style) => e('div', { style: { background: "white", border: "1px solid #E1E4EA", borderRadius: 12, padding: "16px 18px", ...(style || {}) } }, enfants);
  const pastille = (v, style) => { const b = cplBande(v); return e('span', { style: { display: "inline-block", minWidth: 44, textAlign: "center", padding: "3px 8px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: b.bg, color: b.fg, ...(style || {}) } }, v == null ? "—" : v + " %"); };
  // Onglet souligné (même style que les tableaux de bord Claude : texte, trait sous l'onglet actif)
  const onglet = (lbl, on, onClick, petit) => e('button', { onClick, "aria-pressed": on, style: { background: "none", border: "none", borderBottom: "3px solid " + (on ? "#14171F" : "transparent"), padding: petit ? "8px 2px 9px" : "10px 2px 11px", marginBottom: -1, fontSize: petit ? 13.5 : 15, fontWeight: on ? 700 : 500, color: on ? "#14171F" : "#5A6172", cursor: "pointer", whiteSpace: "nowrap" } }, lbl);
  const bouton = (lbl, on, onClick, extra) => e('button', { onClick, style: { padding: "8px 14px", borderRadius: 999, border: "1px solid " + (on ? "#14171F" : "#C9CED8"), background: on ? "#14171F" : "white", color: on ? "white" : "#14171F", fontSize: 13, fontWeight: 600, cursor: "pointer", ...(extra || {}) } }, lbl);
  const bascule = () => e('div', { role: "group", "aria-label": "Score affiché", style: { display: "inline-flex", padding: 3, gap: 3, background: "#E6E9EF", borderRadius: 9 } },
    [["comp", "Complétude des infos"], ["conf", "Conformité"]].map(([k, l]) => e('button', { key: k, onClick: () => { setMode(k); setDom("all"); }, style: { padding: "8px 14px", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", background: mode === k ? "white" : "transparent", color: mode === k ? "#14171F" : "#4A5060", boxShadow: mode === k ? "0 1px 2px rgba(20,23,31,.15)" : "none" } }, l)));
  const ouvrirFiche = (id) => { setHotelId(id); setVue("fiche"); window.scrollTo && window.scrollTo(0, 0); };

  const onglets = e('div', { style: { display: "flex", gap: isMobile ? 18 : 32, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18, borderBottom: "1px solid #E1E4EA" } },
    onglet("Classement", vue === "classement", () => setVue("classement")),
    onglet("Fiche hôtel", vue === "fiche", () => { if (!hotelId && calc && calc.liste.length) setHotelId([...calc.liste].sort((a, b) => (b.comp || 0) - (a.comp || 0))[0].id); setVue("fiche"); }),
    onglet("Barème", vue === "bareme", () => setVue("bareme")),
    e('button', { onClick: importerTout, disabled: !!(imp && !imp.fini), title: "Remplit l'inventaire serveurs de tous les hôtels depuis NinjaOne", style: { marginLeft: "auto", marginBottom: 8, padding: "8px 14px", borderRadius: 8, border: "1px solid #1E4FA8", background: "white", color: "#1E4FA8", fontSize: 12.5, fontWeight: 600, cursor: "pointer" } },
      imp && !imp.fini ? "Import NinjaOne " + imp.fait + " / " + imp.total + "…" : "⇣ Importer NinjaOne (tous les hôtels)"),
    e('button', { onClick: charger, disabled: busy, style: { marginBottom: 8, padding: "8px 14px", borderRadius: 8, border: "1px solid #DDD", background: "white", color: "#555", fontSize: 12.5, cursor: "pointer" } }, busy ? "Calcul…" : "↻ Recalculer"));

  const bandeauImport = imp && e('div', { style: { background: imp.fini ? (imp.erreurs.length ? "#FFF8E6" : "#EAF3FF") : "#F0F4FC", border: "1px solid #D5DEEF", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14, lineHeight: 1.6 } },
    e('div', { style: { display: "flex", justifyContent: "space-between", gap: 10 } },
      e('b', null, imp.fini ? "Import NinjaOne terminé" : "Import NinjaOne en cours : " + imp.fait + " / " + imp.total + " hôtels…"),
      imp.fini && e('button', { onClick: () => setImp(null), "aria-label": "Fermer", style: { border: "none", background: "none", cursor: "pointer", color: "#666" } }, "✕")),
    e('div', null, imp.ajoutes + " machine(s) ajoutée(s), " + imp.majs + " ligne(s) mise(s) à jour."),
    imp.fini && imp.sansServeur.length > 0 && e('div', { style: { color: "#4A5060" } }, "Aucun serveur trouvé dans NinjaOne (domaine Serveurs = sans objet) : " + imp.sansServeur.join(", ")),
    imp.erreurs.length > 0 && e('div', { style: { color: "#8A2E10" } }, imp.erreurs.length + " hôtel(s) non importé(s) : " + imp.erreurs.join(" · ")));

  if (err) return e('div', null, onglets, e('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "12px 14px", fontSize: 13 } }, err));
  if (!calc) return e('div', null, onglets, e('div', { style: { color: "#888", fontSize: 13, padding: 20 } }, "Calcul des scores…"));

  const { liste, ref } = calc;
  const saisieDe = (id) => data.saisies.find(s => s.hotel_id === id);
  const refComp = ref ? ref.comp : null;
  const domaines = CPL_DOMAINES[mode];
  const scoreDe = (x) => mode === "comp" ? (dom === "all" ? x.comp : x.domC[dom]) : (dom === "all" ? x.conf : x.domF[dom]);
  const refVal = mode === "comp" ? (ref ? (dom === "all" ? ref.comp : ref.domC[dom]) : null) : CPL_OBJECTIF_CONF;

  // =================== VUE : CLASSEMENT ===================
  const socs = [...new Set(liste.map(x => String(x.hotel.soc || "").toLowerCase()).filter(Boolean))];
  const filtreSoc = (l) => !socFiltre ? l : l.filter(x => socFiltre === "_sans" ? !x.hotel.soc : String(x.hotel.soc || "").toLowerCase() === socFiltre);
  const choixSoc = () => e('select', { value: socFiltre, onChange: ev => setSocFiltre(ev.target.value), "aria-label": "Filtrer par SOC", style: { padding: "8px 10px", border: "1px solid #C9CED8", borderRadius: 8, fontSize: 13, background: "white" } },
    e('option', { value: "" }, "Tous les hôtels (" + liste.length + ")"),
    socs.map(k => e('option', { key: k, value: k }, "SOC " + cplSocNom(k) + " (" + liste.filter(x => String(x.hotel.soc || "").toLowerCase() === k).length + ")")),
    e('option', { value: "_sans" }, "Sans SOC externe (" + liste.filter(x => !x.hotel.soc).length + ")"));
  const vueClassement = () => {
    const tri = [...filtreSoc(liste)].sort((a, b) => (scoreDe(b) == null ? -1 : scoreDe(b)) - (scoreDe(a) == null ? -1 : scoreDe(a)));
    const vals = tri.map(scoreDe).filter(v => v != null);
    const moy = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    // palier : pourcentage qui donne la couleur (carré = couleur des barres, chiffre = même couleur en plus foncé)
    const tuile = (lbl, v, sub, palier) => carte([
      e('div', { key: 1, style: { fontSize: 12.5, color: "#5A6172", display: "flex", alignItems: "center", gap: 8 } }, palier != null && e('span', { style: { width: 10, height: 10, borderRadius: 3, background: cplBande(palier).c } }), lbl),
      e('div', { key: 2, style: { fontSize: 28, fontWeight: 700, color: palier != null ? cplTexte(palier) : "#14171F", margin: "4px 0" } }, v),
      e('div', { key: 3, style: { fontSize: 12.5, color: "#4A5060" } }, sub)]);
    const cols = isMobile ? "1fr 70px" : "36px minmax(160px, 240px) minmax(0, 1fr) 64px 92px 92px " + (domaines.length * (CPL_CASE + 4)) + "px";
    return e('div', null,
      e('div', { style: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 14 } },
        bascule(),
        e('div', { style: { fontSize: 12.5, color: "#5A6172", maxWidth: 640, lineHeight: 1.5 } }, mode === "comp"
          ? "Ce score indique si tout ce qu'on doit savoir sur l'hôtel est bien rempli dans le portail. Le trait noir sur chaque barre montre la moyenne de tous les hôtels."
          : "Ce score indique si ce qu'on surveille est en bon état : mises à jour, sauvegardes, antivirus, alertes… Le trait noir marque l'objectif de " + CPL_OBJECTIF_CONF + " %. « — » veut dire qu'on n'a pas encore assez d'informations sur l'hôtel pour le calculer.")),
      e('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2.2fr) minmax(280px, 1fr)", gap: 12, marginBottom: 14, alignItems: "stretch" } },
        carte([
          e('div', { key: "t", style: { fontSize: 14, fontWeight: 700, marginBottom: 8 } }, (mode === "comp" ? "Complétude" : "Conformité") + " par hôtel"),
          e(CplCarte, { key: "c", liste: filtreSoc(liste), valeur: scoreDe, onHotel: ouvrirFiche })], { padding: 12 }),
        carte([
          e('div', { key: "t", style: { fontSize: 14, fontWeight: 700 } }, "Vue hôtel"),
          e('div', { key: "s", style: { fontSize: 12.5, color: "#5A6172", margin: "4px 0 10px" } }, "Choisissez un hôtel pour ouvrir sa fiche, ou cliquez sur une pastille de la carte."),
          e('label', { key: "l", style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "#5A6172" } }, "Établissement",
            e('select', { value: "", onChange: ev => { if (ev.target.value) ouvrirFiche(ev.target.value); }, style: { padding: "10px 10px", border: "1px solid #C9CED8", borderRadius: 8, fontSize: 14, background: "white", color: "#14171F" } },
              e('option', { value: "" }, "— Choisir un hôtel —"),
              [...liste].sort((a, b) => String(a.nom).localeCompare(String(b.nom))).map(x => e('option', { key: x.id, value: x.id }, x.nom + (mode === "comp" ? (x.comp != null ? " · " + x.comp + " %" : "") : (x.conf != null ? " · " + x.conf + " %" : "")))))),
          e('div', { key: "r", style: { fontSize: 12.5, fontWeight: 700, color: "#2C3240", margin: "16px 0 6px" } }, "Les plus en retard"),
          [...filtreSoc(liste)].filter(x => scoreDe(x) != null).sort((a, b) => scoreDe(a) - scoreDe(b)).slice(0, 5).map(x => {
            const v = scoreDe(x), b = cplBande(v);
            return e('button', { key: x.id, onClick: () => ouvrirFiche(x.id), style: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 8, padding: "6px 0", border: "none", borderBottom: "1px solid #EEF0F4", background: "none", cursor: "pointer", fontSize: 13, color: "#14171F", textAlign: "left" } },
              e('span', null, x.nom), e('span', { style: { padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: b.bg, color: b.fg } }, v + " %"));
          })], { display: "flex", flexDirection: "column" })),
      e('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 14 } },
        tuile("Moyenne de tous les hôtels", moy == null ? "—" : moy + " %", (moy == null ? "" : cplBande(moy).tier + " · ") + "sur " + vals.length + " hôtels" + (mode === "conf" ? " mesurés · objectif " + CPL_OBJECTIF_CONF + " %" : " suivis"), moy),
        tuile("Hôtels à 70 % ou plus", String(vals.filter(v => v >= 70).length), "sur " + tri.length + " hôtels affichés", 70),
        tuile(mode === "comp" ? "Hôtels sous 50 %" : "Hôtels sans score", String(mode === "comp" ? vals.filter(v => v < 50).length : tri.length - vals.length), mode === "comp" ? "priorité des prochaines visites" : "pas assez d'infos pour mesurer", mode === "comp" ? 0 : null)),
      e('div', { style: { display: "flex", gap: isMobile ? 14 : 24, flexWrap: "wrap", marginBottom: 14, alignItems: "flex-end", borderBottom: "1px solid #E1E4EA" } },
        e('span', { style: { fontSize: 12.5, color: "#5A6172", paddingBottom: 11 } }, "Classer selon :"),
        onglet(mode === "comp" ? "Score global" : "Conformité globale", dom === "all", () => setDom("all"), true),
        domaines.map(([k, l]) => e('span', { key: k, style: { display: "inline-flex" } }, onglet(l, dom === k, () => setDom(k), true))),
        e('span', { style: { marginLeft: "auto", paddingBottom: 6 } }, choixSoc())),
      e('div', { style: { display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, color: "#4A5060", marginBottom: 10 } },
        e('span', { style: { fontWeight: 600, color: "#2C3240" } }, "Couleurs :"),
        [[90, "Très bon", "85 à 100 %"], [75, "Avancé", "70 à 84 %"], [60, "En cours", "50 à 69 %"], [30, "À lancer", "moins de 50 %"], [null, "Sans objet", "—"]].map(([v, t, r]) =>
          e('span', { key: t, style: { display: "inline-flex", gap: 6, alignItems: "center" } },
            e('span', { style: { width: 14, height: 14, borderRadius: 3, background: v == null ? "#EEF0F4" : cplBande(v).c, border: v == null ? "1px solid #C9CED8" : "none" } }),
            e('b', { style: { fontWeight: 600, color: "#2C3240" } }, t), e('span', null, "(" + r + ")")))),
      carte(e('div', { style: { overflowX: "auto" } },
        e('div', { style: { minWidth: isMobile ? 0 : 980 } },
          !isMobile && e('div', { style: { display: "grid", gridTemplateColumns: cols, gap: 12, padding: "4px 0 10px", borderBottom: "1px solid #E1E4EA", fontSize: 11.5, fontWeight: 600, color: "#5A6172", textTransform: "uppercase", letterSpacing: ".04em" } },
            e('div', null, "#"), e('div', null, "Établissement"), e('div', null, (mode === "comp" ? "Complétude" : "Conformité") + " · trait = " + (mode === "comp" ? "moyenne des hôtels" : "objectif 90 %")),
            e('div', { style: { textAlign: "right" } }, "Score"), e('div', { style: { textAlign: "right" } }, mode === "comp" ? "Écart / moy." : "Écart / obj."),
            e('div', { style: { textAlign: "center" } }, mode === "comp" ? "Conformité" : "Complétude"),
            e('div', { style: { display: "flex", gap: 4 } }, domaines.map(([k, l]) => e('div', { key: k, title: l, style: { width: CPL_CASE, textAlign: "center", fontSize: 10.5, letterSpacing: 0 } }, CPL_COURT[k] || l)))),
          tri.map((x, i) => {
            const v = scoreDe(x), b = cplBande(v), estRef = ref && x.id === ref.id && mode === "comp";
            const ecart = v == null || refVal == null ? null : v - refVal;
            return e('div', { key: x.id, style: { display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #EEF0F4", background: estRef ? "#F0F4FC" : "white" } },
              !isMobile && e('div', { style: { fontSize: 13, color: "#5A6172" } }, i + 1),
              e('div', { style: { minWidth: 0 } },
                e('button', { onClick: () => ouvrirFiche(x.id), style: { background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#14171F", textAlign: "left", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (estRef ? "★ " : "") + x.nom, cplBadgeSoc(e, x.hotel.soc), cplBadgeExt(e, saisieDe(x.id))),
                e('div', { style: { fontSize: 11.5, color: "#5A6172" } }, mode === "comp" ? x.aSaisir + " info(s) à compléter" : (x.conf == null ? "pas assez d'infos" : x.aCorriger + " point(s) à corriger"))),
              !isMobile && e('div', { style: { position: "relative", height: 12, background: "#EEF0F4", borderRadius: 6 } },
                e('div', { style: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 6, width: (v || 0) + "%", background: b.c } }),
                refVal != null && e('div', { style: { position: "absolute", top: -4, bottom: -4, width: 2, background: "#14171F", left: refVal + "%" } })),
              e('div', { style: { textAlign: "right", fontSize: 15, fontWeight: 700 } }, v == null ? "—" : v + " %"),
              !isMobile && e('div', { style: { textAlign: "right", fontSize: 13, fontWeight: 600, color: ecart == null ? "#999" : ecart >= 0 ? "#1E4FA8" : ecart > -20 ? "#8A5A00" : "#A8401F" } }, estRef ? "référence" : ecart == null ? "—" : (ecart > 0 ? "+" : "") + ecart + " pts"),
              !isMobile && e('div', { style: { textAlign: "center" } }, pastille(mode === "comp" ? x.conf : x.comp)),
              !isMobile && e('div', { style: { display: "flex", gap: 4 } }, domaines.map(([k, l]) => {
                const dv = mode === "comp" ? x.domC[k] : x.domF[k], db = cplBande(dv);
                const pg = CPL_PAGE_DOMAINE[k];
                return e('button', { key: k, onClick: () => ouvrir(pg, x.id), title: l + " : " + (dv == null ? "sans objet" : dv + " %") + " — ouvrir " + (CPL_NOM_PAGE[pg] || pg) + " pour " + x.nom,
                  style: { width: CPL_CASE, height: 24, padding: 0, border: "none", borderRadius: 4, background: db.bg, color: db.fg, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" } }, dv == null ? "—" : dv);
              })));
          })))));
  };

  // (Onglet « Tournées » retiré le 24/11/2026 : il faisait doublon avec le classement)

  // =================== VUE : BARÈME ===================
  const vueBareme = () => {
    const maj = async (c, champ, val) => {
      const { error } = await sb.from("score_criteres").update({ [champ]: val }).eq("code", c.code);
      if (error) { alert("Erreur : " + error.message); return; }
      charger();
    };
    const SRC = { A: ["Automatique", "#E3ECFB", "#163F86"], M: ["Saisie", "#FBEFD9", "#6B4500"], V: ["Visite", "#EDE6F7", "#4B2A80"] };
    return e('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" } },
      ["comp", "conf"].map(sc => {
        const cs = data.criteres.filter(c => c.score === sc);
        const total = cs.filter(c => c.actif).reduce((s, c) => s + c.points, 0);
        return carte([
          e('div', { key: "t", style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 } },
            e('div', { style: { fontSize: 16, fontWeight: 700, color: sc === "comp" ? "#1E4FA8" : "#8A5A00" } }, sc === "comp" ? "Complétude des informations" : "Conformité"),
            e('div', { style: { fontSize: 13, fontWeight: 600, color: "#1E4FA8" } }, total + " pts actifs")),
          CPL_DOMAINES[sc].map(([k, l]) => e('div', { key: k, style: { marginTop: 10 } },
            e('div', { style: { fontSize: 12, fontWeight: 700, color: "#5A6172", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 } }, l),
            cs.filter(c => c.domaine === k).map(c => e('div', { key: c.code, style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 82px 58px 40px", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid #EEF0F4", fontSize: 13, opacity: c.actif ? 1 : .45 } },
              e('div', null, c.libelle, e('div', { style: { fontSize: 11, color: "#888" } }, c.attribution)),
              e('span', { style: { fontSize: 11, padding: "2px 6px", borderRadius: 999, background: SRC[c.source][1], color: SRC[c.source][2], textAlign: "center" } }, SRC[c.source][0]),
              e('input', { type: "number", min: 0, max: 50, defaultValue: c.points, "aria-label": "Points " + c.libelle, onBlur: ev => { const n = parseInt(ev.target.value, 10); if (!isNaN(n) && n !== c.points) maj(c, "points", n); }, style: { width: 52, padding: "4px 6px", border: "1px solid #DDD", borderRadius: 6, fontSize: 13 } }),
              e('input', { type: "checkbox", checked: !!c.actif, title: "Critère actif", "aria-label": "Actif " + c.libelle, onChange: ev => maj(c, "actif", ev.target.checked) })))))
        ], {});
      }),
      (() => {
        const exclus = data.saisies.filter(x => x.exclu).map(x => ({ ...x, nom: (hotels.find(h => h.id === x.hotel_id) || {}).name || "?" })).sort((a, b) => a.nom.localeCompare(b.nom));
        const reintegrer = async (x) => {
          const { error } = await sb.from("hotel_completude").update({ exclu: false, maj_le: new Date().toISOString(), maj_par: adminFromName ? adminFromName() : null }).eq("hotel_id", x.hotel_id);
          if (error) { alert("Erreur : " + error.message); return; }
          charger();
        };
        return carte([
          e('div', { key: "t", style: { fontSize: 15, fontWeight: 700, marginBottom: 6 } }, "Hôtels non suivis par le tableau de bord (" + exclus.length + ")"),
          exclus.length === 0 ? e('div', { key: "v", style: { fontSize: 13, color: "#5A6172" } }, "Aucun.") :
            e('div', { key: "l", style: { display: "flex", gap: 8, flexWrap: "wrap" } }, exclus.map(x => e('span', { key: x.hotel_id, style: { display: "inline-flex", gap: 8, alignItems: "center", padding: "4px 6px 4px 12px", borderRadius: 999, background: "#EEF0F4", fontSize: 13 } },
              x.nom, e('button', { onClick: () => reintegrer(x), style: { border: "1px solid #C9CED8", background: "white", borderRadius: 999, padding: "3px 10px", fontSize: 12, cursor: "pointer" } }, "Réintégrer"))))
        ], { gridColumn: isMobile ? "auto" : "1 / -1" });
      })(),
      e('div', { style: { gridColumn: isMobile ? "auto" : "1 / -1", fontSize: 12.5, color: "#5A6172", lineHeight: 1.6 } },
        "Score = points obtenus ÷ points des critères applicables. Un critère « sans objet » (pas de serveur, messagerie non gérée, pas de projet…) sort du calcul. Modifier un poids recalcule tous les hôtels. Une photo des scores est enregistrée le 1er de chaque mois."));
  };

  // =================== VUE : FICHE HÔTEL ===================
  const vueFiche = () => {
    const x = liste.find(y => y.id === hotelId) || [...liste].sort((a, b) => (b.comp || 0) - (a.comp || 0))[0];
    if (!x) return e('div', null, "Aucun hôtel.");
    return e(CompletudeFiche, { key: x.id, x, ref, liste, data, hotels, isMobile, setPage: (pg) => ouvrir(pg, x.id), adminFromName, onChange: charger, onHotel: id => setHotelId(id), carte, pastille });
  };

  return e('div', null, onglets, bandeauImport,
    vue === "classement" ? vueClassement() : vue === "bareme" ? vueBareme() : vueFiche());
}


// ---------- Carte des hôtels (fond de carte clair, une pastille par hôtel colorée selon son score) ----------
// Même géocodage que la carte des clients (Nominatim, cache navigateur « geoCache » partagé).
function CplCarte({ liste, valeur, onHotel, hauteur }) {
  const e = React.createElement;
  const ref = React.useRef(null);
  const carteRef = React.useRef(null);
  const coucheRef = React.useRef(null);
  const [etat, setEtat] = React.useState("");
  React.useEffect(() => {
    if (!ref.current || !window.L) { setEtat("Carte indisponible (librairie non chargée)."); return; }
    const m = window.L.map(ref.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([47.5, 4], 5);
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 18, subdomains: "abcd", attribution: "© OpenStreetMap © CARTO" }).addTo(m);
    carteRef.current = m;
    coucheRef.current = window.L.layerGroup().addTo(m);
    return () => { try { m.remove(); } catch (x) {} carteRef.current = null; };
  }, []);
  // Ne redessine que si la liste ou les scores changent (pas à chaque rendu)
  const cle = liste.map(x => x.id + ":" + valeur(x)).join("|");
  const onHotelRef = React.useRef(onHotel); onHotelRef.current = onHotel;
  React.useEffect(() => {
    const m = carteRef.current, couche = coucheRef.current;
    if (!m || !couche) return;
    let annule = false;
    couche.clearLayers();
    let cache = {}; try { cache = JSON.parse(localStorage.getItem("geoCache") || "{}"); } catch (x) {}
    const avecAdresse = liste.filter(x => x.hotel && (x.hotel.adresse_ville || x.hotel.adresse_rue || x.hotel.city));
    const points = [];
    (async () => {
      let n = 0;
      for (const x of avecAdresse) {
        if (annule) return;
        const h = x.hotel;
        const q = [h.adresse_rue, h.adresse_cp, h.adresse_ville || h.city, h.adresse_pays || "France"].filter(Boolean).join(", ");
        let ll = cache[q];
        if (!ll) {
          setEtat("Localisation des hôtels… " + n + " / " + avecAdresse.length);
          try {
            const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q));
            const j = await r.json();
            if (j && j[0]) { ll = [parseFloat(j[0].lat), parseFloat(j[0].lon)]; cache[q] = ll; try { localStorage.setItem("geoCache", JSON.stringify(cache)); } catch (y) {} }
          } catch (y) {}
          await new Promise(res => setTimeout(res, 1100)); // limite Nominatim : 1 requête / seconde
        }
        n++;
        if (!ll || annule) continue;
        const v = valeur(x);
        const b = cplBande(v);
        const pt = window.L.circleMarker(ll, { radius: 9, color: "#FFFFFF", weight: 2, fillColor: v == null ? "#9AA3B2" : b.c, fillOpacity: 0.95 })
          .bindTooltip(x.nom + " — " + (v == null ? "—" : v + " %"), { direction: "top", offset: [0, -8], className: "htip" });
        pt.on("click", () => onHotelRef.current(x.id));
        pt.addTo(couche);
        points.push(ll);
      }
      if (annule) return;
      setEtat(points.length + " hôtel(s) sur la carte" + (points.length < liste.length ? " · " + (liste.length - points.length) + " sans adresse" : ""));
      if (points.length) { try { m.fitBounds(points, { padding: [30, 30], maxZoom: 7 }); } catch (y) {} }
    })();
    return () => { annule = true; };
  }, [cle]);
  return e('div', { style: { position: "relative" } },
    e('div', { ref, role: "img", "aria-label": "Carte des hôtels colorés selon leur score", style: { height: hauteur || 360, borderRadius: 10, background: "#E6E9EF" } }),
    etat && e('div', { style: { position: "absolute", left: 10, bottom: 10, zIndex: 500, background: "rgba(255,255,255,.92)", borderRadius: 6, padding: "3px 8px", fontSize: 11.5, color: "#4A5060" } }, etat));
}

// ---------- Fiche d'un hôtel : toutes les informations + ce qu'il reste à faire ----------
function CompletudeFiche({ x, ref, liste, data, hotels, isMobile, setPage, adminFromName, onChange, onHotel, carte, pastille }) {
  const e = React.createElement;
  const h = x.hotel || {};
  const saisie0 = data.saisies.find(s => s.hotel_id === x.id) || { hotel_id: x.id };
  const [saisie, setSaisie] = React.useState(saisie0);
  const [enreg, setEnreg] = React.useState("");
  const [det, setDet] = React.useState(null);   // détails chargés pour cet hôtel
  const [filtreM, setFiltreM] = React.useState("tous");   // filtre du tableau des machines
  const [voirTout, setVoirTout] = React.useState(false);
  const [lecture, setLecture] = React.useState("");       // relecture des machines NinjaOne

  React.useEffect(() => {
    let fini = false;
    (async () => {
      const [inv, jobs, ck, m365, mach, jours, soph, m365s, machMaj, vhist, cxm] = await Promise.all([
        sb.from("inventaire_serveurs").select("id,parent_id,ordre,nom,type,role,os,version,ip,a_jour,derniere_maj,antivirus,antivirus_nom,care_pack,care_pack_fin,licence_fin").eq("hotel_id", x.id).order("ordre"),
        sb.from("veeam_jobs").select("id,nom,libelle,actif,dernier_statut,dernier_run_at,planifie,planif_desc,serveur").eq("hotel_id", x.id).order("nom"),
        sb.from("checklist_points").select("statut,date_controle").eq("hotel_id", x.id).range(0, 999),
        sb.from("m365_tenant_hotels").select("tenant_id,domaines").eq("hotel_id", x.id),
        sb.rpc("machines_notes", { p_hotel: x.id }).range(0, 1999),
        sb.from("score_jour").select("jour,completude,conformite,machines").eq("hotel_id", x.id).order("jour", { ascending: false }).limit(15),
        sb.from("sophos_comptes").select("dernier_controle").eq("hotel_id", x.id),
        sb.from("m365_tenants").select("derniere_synchro").eq("hotel_id", x.id),
        sb.from("machines").select("maj_le").eq("hotel_id", x.id).order("maj_le", { ascending: false }).limit(1),
        sb.rpc("veeam_historique", { p_n: 10 }).then(r => r, () => ({ data: [] })),
        sb.from("capex").select("auto_cle,machines,auto_maj").eq("hotel_id", x.id).not("auto_cle", "is", null),
      ]);
      // Machines physiques par âge (inventaire CAPEX mensuel NinjaOne) : lignes « 5ans » et « 3ans »
      const ageMat = { plus5: [], de3a5: [], maj: null };
      (cxm.data || []).forEach(r => { const l = Array.isArray(r.machines) ? r.machines : [];
        if (/:5ans$/.test(r.auto_cle || "")) ageMat.plus5 = l; else if (/:3ans$/.test(r.auto_cle || "")) ageMat.de3a5 = l;
        if (r.auto_maj && (!ageMat.maj || r.auto_maj > ageMat.maj)) ageMat.maj = r.auto_maj; });
      const runsVeeam = {}; ((vhist && vhist.data) || []).forEach(h => { runsVeeam[String(h.job_id)] = h.runs || []; });
      if (!fini) setDet({ inv: inv.data || [], runsVeeam, ageMat, jobs: (jobs.data || []).filter(j => j.actif), ck: ck.data || [], m365: m365.data || [],
        machines: mach.data || [], machErr: mach.error ? mach.error.message : "", jours: jours.data || [],
        sophos: (soph.data || []).map(r => r.dernier_controle).filter(Boolean).sort().pop() || null,
        m365sync: (m365s.data || []).map(r => r.derniere_synchro).filter(Boolean).sort().pop() || null,
        machMaj: ((machMaj.data || [])[0] || {}).maj_le || null });
    })();
    return () => { fini = true; };
  }, [x.id, lecture === "✅"]);

  // Relit toutes les machines de tous les hôtels dans NinjaOne (Worker dsi-hotel-inventaire, route /machines)
  const relireMachines = async () => {
    setLecture("…");
    try {
      const { data: sd } = await sb.auth.getSession();
      const res = await fetch(INVENTAIRE_API_URL + "/machines", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + ((sd.session && sd.session.access_token) || "") }, body: "{}" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setLecture("❌ " + (d.error || "erreur " + res.status)); return; }
      setLecture("✅");
      onChange();
    } catch (err) { setLecture("❌ " + ((err && err.message) || err)); }
  };

  const enregistrer = async () => {
    setEnreg("…");
    const ext = (saisie.serveurs_externes || "").trim() || null;
    const ligne = { hotel_id: x.id, sans_serveur: !!saisie.sans_serveur || !!ext, serveurs_externes: ext, m365_non_gere: !!saisie.m365_non_gere, av_non_gere: !!saisie.av_non_gere,
      supervision_raid: saisie.supervision_raid == null ? null : !!saisie.supervision_raid,
      retention_hors_site: (saisie.retention_hors_site || "").trim() || null, av_console: (saisie.av_console || "").trim() || null,
      av_contact_escalade: (saisie.av_contact_escalade || "").trim() || null,
      blocage_consentement: saisie.blocage_consentement == null ? null : !!saisie.blocage_consentement,
      maj_le: new Date().toISOString(), maj_par: adminFromName ? adminFromName() : null };
    const { error } = await sb.from("hotel_completude").upsert(ligne, { onConflict: "hotel_id" });
    if (error) { setEnreg("❌ " + error.message); return; }
    setEnreg("✅ Enregistré");
    onChange();
  };

  const vide = (t) => e('span', { style: { padding: "1px 8px", borderRadius: 6, border: "1px dashed #B8862B", background: "#FFF9EC", color: "#6B4500", fontSize: 12 } }, t || "À renseigner");
  const val = (v, t) => v ? e('span', null, v) : vide(t);
  const titre = (t, extra) => e('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 } }, e('h3', { style: { margin: 0, fontSize: 16 } }, t), extra);
  const lienPage = (lbl, p) => e('button', { onClick: () => setPage(p), style: { background: "none", border: "none", color: "#1E4FA8", fontSize: 12.5, cursor: "pointer", padding: 0 } }, lbl + " →");
  const grille = (paires) => e('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "190px minmax(0, 1fr)", gap: "7px 14px", fontSize: 13.5 } },
    paires.map(([k, v], i) => [e('div', { key: "k" + i, style: { color: "#5A6172" } }, k), e('div', { key: "v" + i }, v)]));
  const badgesDom = (k) => e('div', { style: { display: "flex", gap: 6 } },
    x.domC[k] !== undefined && e('span', { style: { fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#E3ECFB", color: "#163F86", fontWeight: 600 } }, "Infos " + (x.domC[k] == null ? "—" : x.domC[k] + " %")),
    x.domF[k] !== undefined && e('span', { style: { fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#FBEFD9", color: "#6B4500", fontWeight: 600 } }, "Conformité " + (x.domF[k] == null ? "—" : x.domF[k] + " %")));
  const etatCritere = (l) => {
    const r = l.ratio;
    const [txt, bg, fg] = r == null ? ["Sans objet", "#EEF0F4", "#5A6172"] : r >= 1 ? ["Fait", "#E3ECFB", "#163F86"] : r > 0 ? [Math.round(r * 100) + " %", "#FBEFD9", "#6B4500"] : ["À faire", "#F9DDD2", "#8A2E10"];
    return e('div', { key: l.code, style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto 64px", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #EEF0F4", fontSize: 13 } },
      e('div', null, l.libelle, l.detail && e('span', { style: { color: "#888", fontSize: 12 } }, " · " + l.detail)),
      e('span', { style: { padding: "2px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: bg, color: fg, whiteSpace: "nowrap" } }, txt),
      e('div', { style: { textAlign: "right", fontSize: 12, color: "#5A6172", fontVariantNumeric: "tabular-nums" } }, r == null ? "—" : (Math.round(l.points * r * 10) / 10) + " / " + l.points));
  };
  const criteres = (score, domaine) => x.lignes.filter(l => l.score === score && l.domaine === domaine).sort((a, b) => a.ordre - b.ordre).map(etatCritere);
  const section = (k, t, contenu, lien) => carte([
    e('div', { key: "t" }, titre(t, e('div', { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, badgesDom(k), lien))),
    contenu && e('div', { key: "c", style: { marginBottom: 10 } }, contenu),
    e('div', { key: "cc" }, criteres("comp", k)),
    e('div', { key: "cf" }, criteres("conf", k))]);

  // Historique (photos mensuelles)
  const histo = data.historique.filter(r => r.hotel_id === x.id).slice(-6);
  const anneau = (v, objectif, lbl, sous) => {
    const C = 2 * Math.PI * 52, b = cplBande(v);
    return carte(e('div', { style: { display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" } },
      e('div', { style: { position: "relative", width: 124, height: 124 } },
        e('svg', { width: 124, height: 124, viewBox: "0 0 124 124", role: "img", "aria-label": lbl + " : " + (v == null ? "non mesurable" : v + " %") },
          e('circle', { cx: 62, cy: 62, r: 52, fill: "none", stroke: "#EEF0F4", strokeWidth: 13 }),
          v != null && e('circle', { cx: 62, cy: 62, r: 52, fill: "none", stroke: b.c, strokeWidth: 13, strokeLinecap: "round", strokeDasharray: (C * v / 100).toFixed(1) + " " + C.toFixed(1), transform: "rotate(-90 62 62)" }),
          objectif != null && e('line', { x1: 62, y1: 3, x2: 62, y2: 20, stroke: "#14171F", strokeWidth: 3, transform: "rotate(" + (objectif * 3.6) + " 62 62)" })),
        e('div', { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 } }, v == null ? "—" : v + " %")),
      e('div', { style: { flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 4 } },
        e('div', { style: { fontSize: 15, fontWeight: 700 } }, lbl),
        e('div', { style: { fontSize: 13, color: "#4A5060" } }, sous))));
  };

  const ecartRef = x.comp != null && ref ? x.comp - ref.comp : null;
  const ad = h.antivirus_detecte || null;
  const avV = cplAvEnVigueur(h);
  const avPrevu = avV.actuel;
  const fr = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "";
  const nbCk = det ? det.ck.length : 0, nbCkRempli = det ? det.ck.filter(p => p.statut).length : 0;
  const dernierCk = det ? det.ck.map(p => p.date_controle).filter(Boolean).sort().pop() : null;

  // Reste à faire
  const restes = (score) => x.lignes.filter(l => l.score === score && l.ratio != null && l.ratio < 1)
    .map(l => ({ ...l, gain: Math.round(l.points * (1 - l.ratio) * 10) / 10 })).sort((a, b) => b.gain - a.gain);
  const resteC = restes("comp"), resteF = restes("conf");


  // =================== Fiche v2 : note par machine (inspirée du tableau de bord Hilton) ===================
  const jour0 = new Date().toISOString().slice(0, 10);
  const ilYa = (d) => { if (!d) return null; const j = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return j <= 0 ? "aujourd'hui" : j === 1 ? "hier" : "il y a " + j + " j"; };
  const fraicheur = (d, joursMax) => !d ? "#C4532D" : (Date.now() - new Date(d).getTime()) / 86400000 > joursMax ? "#E0A030" : "#1E4FA8";
  const dateHeure = (d) => d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "jamais";
  const M = det ? det.machines : [];
  const actives = M.filter(m => m.active), inactives = M.filter(m => !m.active);
  const avNonGere = !!saisie0.av_non_gere;
  const moyM = actives.length ? Math.round(actives.reduce((t, m) => t + (m.note || 0), 0) / actives.length) : null;
  const aRaison = (m, k) => (m.raisons || []).some(r => r.k === k);
  // Tendance : écart avec la photo d'il y a 7 jours (ou la plus ancienne disponible)
  const photos = det ? [...det.jours].reverse() : [];
  const tendance = (champ, actuel) => {
    if (actuel == null || !photos.length) return null;
    const vieilles = photos.filter(p => p.jour <= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
    const base = vieilles.length ? vieilles[vieilles.length - 1] : (photos[0].jour < jour0 ? photos[0] : null);
    if (!base || base[champ] == null) return { txt: "nouveau", c: "#5A6172", info: "tendance disponible dans 7 jours" };
    const d = actuel - base[champ];
    return { txt: (d > 0 ? "↗ +" : d < 0 ? "↘ " : "→ ") + d, c: d > 0 ? "#1E4FA8" : d < 0 ? "#8A5A00" : "#5A6172", info: "depuis le " + new Date(base.jour).toLocaleDateString("fr-FR") };
  };
  const courbe = (champ, couleur) => {
    const pts = photos.map(p => p[champ]).filter(v => v != null);
    if (pts.length < 2) return null;
    const w = 300, hh = 34, pas = w / (pts.length - 1);
    return e('svg', { width: "100%", height: 34, viewBox: "0 0 300 34", preserveAspectRatio: "none", "aria-hidden": "true" },
      e('polyline', { points: pts.map((v, i) => (i * pas).toFixed(0) + "," + (hh - 3 - (v / 100) * (hh - 6)).toFixed(1)).join(" "), fill: "none", stroke: couleur, strokeWidth: 2.5 }));
  };
  const carteScore = (lbl, v, suffixe, champ, sous) => {
    const t = tendance(champ, v), b = cplBande(v);
    return carte([
      e('div', { key: "l", style: { fontSize: 13, color: "#5A6172", display: "flex", gap: 8, alignItems: "center" } }, v != null && e('span', { style: { width: 10, height: 10, borderRadius: 3, background: b.c } }), lbl),
      e('div', { key: "v", style: { display: "flex", alignItems: "baseline", gap: 10, margin: "4px 0" } },
        e('span', { style: { fontSize: 32, fontWeight: 700, color: cplTexte(v) } }, v == null ? "—" : v + suffixe),
        t && e('span', { style: { fontSize: 15, fontWeight: 700, color: t.c } }, t.txt),
        t && e('span', { style: { fontSize: 12, color: "#5A6172" } }, t.info)),
      e('div', { key: "c" }, courbe(champ, b.c)),
      e('div', { key: "s", style: { fontSize: 12.5, color: "#4A5060" } }, sous)]);
  };
  const pct = (n, d) => d ? Math.round(100 * n / d) : null;
  const nonHotes = actives.filter(m => m.type !== "Hôte");
  const nbAv = nonHotes.filter(m => !aRaison(m, "av")).length, nbMaj = nonHotes.filter(m => !aRaison(m, "maj")).length;
  const jobsOk = det ? det.jobs.filter(j => j.dernier_statut === "Success").length : 0, jobsN = det ? det.jobs.length : 0;
  const tuileAgent = (cle, lbl, p, sous, lien, page) => {
    return e('div', { key: cle, style: { display: "flex", flexDirection: "column", background: cplCouverture(p), color: p == null ? "#5A6172" : "#FFFFFF" } },
      e('button', { onClick: () => { if (cle === "bkp") setPage(page); else { setFiltreM(cle); setVoirTout(true); } }, title: cle === "bkp" ? "Ouvrir " + lien : "Afficher les machines concernées",
        style: { border: "none", background: "transparent", color: "inherit", font: "inherit", cursor: "pointer", padding: "14px 10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 } },
        e('span', { style: { fontSize: 13, fontWeight: 600 } }, lbl),
        e('span', { style: { fontSize: 38, fontWeight: 700, lineHeight: 1.1 } }, p == null ? "—" : p + " %"),
        e('span', { style: { fontSize: 12 } }, sous)),
      e('button', { onClick: () => setPage(page), style: { border: "none", background: "transparent", color: "inherit", font: "inherit", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: "0 10px 10px" } }, "Ouvrir " + lien + " →"));
  };
  // Problèmes les plus fréquents
  const LIB = { av: "Antivirus absent ou arrêté", def: "Définitions antivirus pas à jour", eol: "Système en fin de vie (ou bientôt)", maj: "Mises à jour en retard", gar: "Care Pack expiré", hl: "Hors ligne depuis 3 jours ou plus" };
  const freq = Object.keys(LIB).map(k => ({ k, l: LIB[k], n: actives.filter(m => aRaison(m, k)).length })).filter(f => f.n > 0).sort((a, b2) => b2.n - a.n);
  // Systèmes
  const osCourt = (m) => (m.os || "Inconnu").replace(/^Microsoft\s+/i, "").replace(/\s+(Standard|Datacenter|Edition)\b.*$/i, "") + (m.os_release && /windows 1[01]/i.test(m.os || "") ? " " + m.os_release : "");
  const parOs = {};
  actives.forEach(m => { const k = osCourt(m); parOs[k] = parOs[k] || { n: 0, fdv: m.fin_de_vie }; parOs[k].n++; });
  const listeOs = Object.entries(parOs).sort((a, b2) => b2[1].n - a[1].n);
  const maxOs = listeOs.length ? listeOs[0][1].n : 1;
  const finVie = actives.filter(m => m.fin_de_vie && m.fin_de_vie < new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)).sort((a, b2) => String(a.fin_de_vie).localeCompare(String(b2.fin_de_vie)));
  // Mises à jour : Windows (correctifs du système) et logiciels tiers (Java, Chrome, Adobe…) remontés par NinjaOne
  const winAFaire = (m) => m.type !== "Hôte" && (m.maj_attente || 0) > 0;
  const logAFaire = (m) => (m.log_attente || 0) + (m.log_echec || 0) > 0;
  const ligneMaj = (lbl, etat, n, liste, enEchec) => {
    const c = etat === "ok" ? "#2F855A" : etat === "ech" ? "#C53030" : etat === "att" ? "#B45309" : "#8A90A0";
    const noms = Array.isArray(liste) ? liste : [];
    return e('div', { title: noms.length ? noms.join("\n") : undefined, style: { marginBottom: 3 } },
      e('div', { style: { display: "flex", alignItems: "center", gap: 6, color: c, fontWeight: etat === "ok" || etat === "nd" ? 500 : 600 } },
        e('span', { style: { width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 } }),
        lbl + " : " + (etat === "ok" ? "à jour" : etat === "nd" ? "non suivi" : n + (enEchec ? " en échec" : " à installer"))),
      noms.length > 0 && etat !== "ok" && e('div', { style: { fontSize: 11.5, color: "#5A6172", paddingLeft: 14, lineHeight: 1.35 } },
        noms.slice(0, 2).map((t, i) => e('div', { key: i, style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t)),
        noms.length > 2 && e('div', null, "+ " + (noms.length - 2) + " autre(s)")));
  };
  const logSuivi = M.some(m => m.log_attente != null);
  const celluleMaj = (m) => {
    if (m.type === "Hôte") return e('span', { style: { color: "#8A90A0" } }, "—");
    const wEch = m.maj_echec || 0, wTot = m.maj_attente || 0;
    const lEch = m.log_echec || 0, lTot = (m.log_attente || 0) + lEch;
    return e('div', null,
      ligneMaj("Windows", wEch > 0 ? "ech" : wTot > 0 ? "att" : "ok", wEch > 0 ? wEch : wTot, m.maj_liste, wEch > 0),
      logSuivi && ligneMaj("Logiciels", m.log_attente == null ? "nd" : lEch > 0 ? "ech" : lTot > 0 ? "att" : "ok", lEch > 0 ? lEch : lTot, m.log_liste, lEch > 0));
  };
  // Tableau des machines
  const FILTRES = [["tous", "Toutes (" + actives.length + ")"], ["serv", "Serveurs (" + actives.filter(m => m.type !== "Poste").length + ")"], ["postes", "Postes (" + actives.filter(m => m.type === "Poste").length + ")"],
    ["bas", "Note sous 70"], ["av", "Sans antivirus"], ["maj", "Mises à jour en retard"],
    ["win", "Windows à mettre à jour (" + actives.filter(winAFaire).length + ")"],
    ...(actives.some(m => m.log_attente != null) ? [["log", "Logiciels à mettre à jour (" + actives.filter(logAFaire).length + ")"]] : []),
    ["eol", "Fin de vie"], ["inactives", "Non vues depuis 8 j (" + inactives.length + ")"]];
  const filtrees = (filtreM === "inactives" ? inactives : actives).filter(m => filtreM === "tous" || filtreM === "inactives" ? true : filtreM === "serv" ? m.type !== "Poste" : filtreM === "postes" ? m.type === "Poste" : filtreM === "bas" ? (m.note || 0) < 70 : filtreM === "win" ? winAFaire(m) : filtreM === "log" ? logAFaire(m) : aRaison(m, filtreM))
    .sort((a, b2) => (a.note == null ? 999 : a.note) - (b2.note == null ? 999 : b2.note) || String(a.nom).localeCompare(String(b2.nom)));
  const visibles = voirTout ? filtrees : filtrees.slice(0, 15);
  const colsM = "minmax(140px, 1.1fr) 70px 110px minmax(160px, 1.2fr) minmax(170px, 1.2fr) 90px 70px minmax(220px, 2fr)";
  const ongletM = (k, l) => e('button', { key: k, onClick: () => { setFiltreM(k); setVoirTout(false); }, style: { background: "none", border: "none", borderBottom: "3px solid " + (filtreM === k ? "#14171F" : "transparent"), padding: "8px 2px 9px", marginBottom: -1, fontSize: 13.5, fontWeight: filtreM === k ? 700 : 500, color: filtreM === k ? "#14171F" : "#5A6172", cursor: "pointer", whiteSpace: "nowrap" } }, l);

  const blocMachines = () => [
    // Trois scores avec tendance
    e('div', { key: "scores", style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 14 } },
      carteScore("Note moyenne des machines", moyM, " / 100", "machines", actives.length ? actives.length + " machines actives" + (inactives.length ? " · " + inactives.length + " hors calcul (non vues depuis 8 j)" : "") : "Machines pas encore lues dans NinjaOne"),
      carteScore("Complétude des infos", x.comp, " %", "completude", (ref && ref.comp != null && x.comp != null ? ((x.comp - ref.comp >= 0 ? "+" : "") + (x.comp - ref.comp) + " pts / moyenne des hôtels (" + ref.comp + " %) · ") : "") + resteC.length + " info(s) à compléter"),
      carteScore("Conformité", x.conf, " %", "conformite", x.conf == null ? "Pas assez d'informations pour mesurer" : "Objectif " + CPL_OBJECTIF_CONF + " % · " + resteF.length + " point(s) à corriger")),
    // Sources + règles
    e('div', { key: "sources", style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 14 } },
      carte([titre("Dernières mises à jour des données", e('button', { onClick: relireMachines, disabled: lecture === "…", style: { padding: "6px 12px", borderRadius: 8, border: "1px solid #1E4FA8", background: "white", color: "#1E4FA8", fontSize: 12.5, fontWeight: 600, cursor: "pointer" } }, lecture === "…" ? "Lecture NinjaOne…" : "⇣ Relire les machines NinjaOne")),
        lecture && lecture !== "…" && lecture !== "✅" && e('div', { key: "err", style: { fontSize: 12.5, color: "#A8401F", marginBottom: 6 } }, lecture),
        [["Machines NinjaOne (postes, serveurs, hôtes)", det && det.machMaj, 2], ["Détection antivirus (NinjaOne)", ad && ad.le, 7],
         ["Rapports Veeam", det && det.jobs.map(j => j.dernier_run_at).filter(Boolean).sort().pop(), 2],
         ["Sophos Central", (avPrevu === "sophos" || (det && det.sophos)) ? (det && det.sophos) : "—", 2],
         ["Microsoft 365", saisie0.m365_non_gere ? "—" : (det && det.m365sync), 2]].map(([l, d, max]) =>
          e('div', { key: l, style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "4px 0" } },
            e('span', { style: { display: "flex", gap: 8, alignItems: "center" } }, e('span', { style: { width: 9, height: 9, borderRadius: "50%", background: d === "—" ? "#C9CED8" : fraicheur(d, max) } }), l),
            e('span', { style: { color: d === "—" ? "#999" : fraicheur(d, max) === "#1E4FA8" ? "#14171F" : "#8A5A00", fontVariantNumeric: "tabular-nums" } }, d === "—" ? "sans objet" : d ? dateHeure(d) + " · " + ilYa(d) : "jamais lu")))]),
      carte([titre("Règles de calcul"),
        e('div', { key: "r", style: { fontSize: 13, color: "#2C3240", lineHeight: 1.6 } },
          e('div', null, "1. Seules les machines vues par NinjaOne dans les ", e('b', null, "8 derniers jours"), " comptent ; les autres sont listées à part."),
          e('div', null, "2. Chaque machine part de ", e('b', null, "100"), " et perd des points pour chaque problème (colonne « Raisons »)."),
          e('div', null, "3. Un clic sur une tuile de couleur affiche les machines concernées ; le lien dessous ouvre la page du portail."))])),
    // Tuiles par agent
    e('div', { key: "agents", style: { display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 2, borderRadius: 12, overflow: "hidden" } },
      tuileAgent("tous", "Vues par NinjaOne (8 j)", pct(actives.length, M.length), actives.length + " / " + M.length + " machines", "Inventaire serveurs", "inventaire"),
      tuileAgent("av", "Antivirus actif", avNonGere ? null : pct(nbAv, nonHotes.length), avNonGere ? "géré par la chaîne" : nbAv + " / " + nonHotes.length + (nonHotes.length - nbAv ? " · voir les " + (nonHotes.length - nbAv) : ""), "Sécurité Anti Virus", "sophos"),
      tuileAgent("maj", "Mises à jour à jour", pct(nbMaj, nonHotes.length), nbMaj + " / " + nonHotes.length + (nonHotes.length - nbMaj ? " · voir les " + (nonHotes.length - nbMaj) : ""), "Inventaire serveurs", "inventaire"),
      tuileAgent("bkp", "Sauvegardes OK", pct(jobsOk, jobsN), jobsN ? jobsOk + " / " + jobsN + " jobs Veeam" : "aucun job Veeam", "Sauvegardes", "backups")),
    // Fin de vie, systèmes, problèmes
    e('div', { key: "trois", style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 14, alignItems: "start" } },
      carte([titre("Systèmes en fin de vie (ou dans moins de 3 mois)"),
        finVie.length === 0 ? e('div', { key: "v", style: { fontSize: 13, color: "#5A6172" } }, "Aucun.") :
        finVie.map(m => e('div', { key: m.ninja_id, style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "5px 0", borderBottom: "1px solid #EEF0F4" } },
          e('span', null, e('b', null, m.nom), e('span', { style: { color: "#5A6172", fontSize: 12 } }, " · " + osCourt(m))),
          e('span', { style: { fontWeight: 600, whiteSpace: "nowrap", color: m.fin_de_vie < jour0 ? "#A8401F" : "#8A5A00" } }, (m.fin_de_vie < jour0 ? "fini le " : "fin le ") + new Date(m.fin_de_vie).toLocaleDateString("fr-FR"))))]),
      carte([titre("Machines par système"),
        listeOs.length === 0 ? e('div', { key: "v", style: { fontSize: 13, color: "#5A6172" } }, "—") :
        listeOs.map(([l, o]) => { const fin = o.fdv && o.fdv < new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
          return e('div', { key: l, style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 80px 28px", gap: 8, alignItems: "center", fontSize: 13, padding: "3px 0" } },
            e('span', null, l + (fin ? "  ⚠" : "")),
            e('span', { style: { height: 8, background: "#EEF0F4", borderRadius: 4, position: "relative" } }, e('span', { style: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 4, width: Math.round(100 * o.n / maxOs) + "%", background: fin ? "#C4532D" : "#5B8DEF" } })),
            e('span', { style: { textAlign: "right" } }, o.n)); })]),
      carte([titre("Problèmes les plus fréquents"),
        freq.length === 0 ? e('div', { key: "v", style: { fontSize: 13, color: "#5A6172" } }, actives.length ? "Aucun problème détecté." : "—") :
        freq.map(f => e('button', { key: f.k, onClick: () => { setFiltreM(f.k); setVoirTout(true); }, style: { display: "flex", justifyContent: "space-between", width: "100%", gap: 10, fontSize: 13, padding: "6px 0", border: "none", borderBottom: "1px solid #EEF0F4", background: "none", cursor: "pointer", textAlign: "left", color: "#14171F" } },
          e('span', null, f.l), e('b', { style: { color: "#A8401F" } }, f.n))),
        inactives.length > 0 && e('div', { key: "ina", style: { fontSize: 12, color: "#5A6172", marginTop: 8 } }, inactives.length + " machine(s) non vue(s) depuis plus de 8 jours : hors calcul")])),
    // Tableau des machines
    carte([
      e('div', { key: "o", style: { display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-end", borderBottom: "1px solid #E1E4EA" } },
        e('span', { style: { fontSize: 15, fontWeight: 700, padding: "8px 0 9px", marginRight: 6 } }, "Toutes les machines"),
        FILTRES.map(([k, l]) => ongletM(k, l))),
      det && det.machErr ? e('div', { key: "e", style: { fontSize: 13, color: "#A8401F", padding: "12px 0" } }, "Note par machine indisponible : " + det.machErr) :
      !det ? e('div', { key: "c", style: { fontSize: 13, color: "#888", padding: "12px 0" } }, "Chargement…") :
      M.length === 0 ? e('div', { key: "z", style: { fontSize: 13, color: "#5A6172", padding: "12px 0" } }, "Aucune machine lue pour cet hôtel. Cliquez sur « Relire les machines NinjaOne » (vérifiez aussi le « Nom NinjaOne » de l'hôtel).") :
      e('div', { key: "t", style: { overflowX: "auto" } }, e('div', { style: { minWidth: 1160 } },
        e('div', { style: { display: "grid", gridTemplateColumns: colsM, gap: 12, padding: "10px 0", fontSize: 11.5, fontWeight: 600, color: "#5A6172", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #E1E4EA" } },
          e('div', null, "Machine"), e('div', null, "Type"), e('div', null, "IP"), e('div', null, "Système"), e('div', null, "Mises à jour"), e('div', null, "Vue"), e('div', { style: { textAlign: "center" } }, "Note"), e('div', null, "Raisons")),
        visibles.map(m => { const b = cplBande(m.note);
          return e('div', { key: m.ninja_id, style: { display: "grid", gridTemplateColumns: colsM, gap: 12, padding: "9px 0", fontSize: 13, borderBottom: "1px solid #EEF0F4", alignItems: "start" } },
            e('div', { style: { fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" } }, m.nom),
            e('div', null, m.type),
            e('div', { style: { color: "#4A5060", fontVariantNumeric: "tabular-nums" } }, m.ip || "—"),
            e('div', null, osCourt(m), m.av_nom && e('div', { style: { fontSize: 11.5, color: "#5A6172" } }, m.av_nom)),
            celluleMaj(m),
            e('div', { style: { color: m.jours >= 3 ? "#8A5A00" : "#14171F" } }, ilYa(m.dernier_contact) || "—"),
            e('div', { style: { display: "flex", justifyContent: "center" } }, e('span', { style: { minWidth: 40, textAlign: "center", padding: "3px 8px", borderRadius: 999, fontWeight: 700, background: b.bg, color: b.fg } }, m.note == null ? "—" : m.note)),
            e('div', { style: { display: "flex", flexDirection: "column", gap: 2 } }, (m.raisons || []).length === 0 ? e('span', { style: { color: "#5A6172" } }, "Rien à signaler") :
              m.raisons.map((r, i) => e('span', { key: i }, r.t, " ", e('b', { style: { color: "#A8401F" } }, "(" + r.p + ")")))));
        }),
        filtrees.length > visibles.length && e('button', { onClick: () => setVoirTout(true), style: { marginTop: 10, border: "none", background: "none", color: "#1E4FA8", fontSize: 13, cursor: "pointer", padding: 0 } }, "Afficher les " + (filtrees.length - visibles.length) + " autres machines"),
        filtrees.length === 0 && e('div', { style: { fontSize: 13, color: "#5A6172", padding: "12px 0" } }, "Aucune machine dans ce filtre.")))]),
  ];

  // Liste des machines physiques trop anciennes (âge estimé : garantie, sinon BIOS, sinon processeur / installation)
  const tableAge = (a) => {
    if (!a || (!a.plus5.length && !a.de3a5.length)) return vide("Aucune machine de plus de 3 ans relevée (inventaire CAPEX NinjaOne du mois).");
    const bloc = (lbl, l, coul, ouvert) => l.length > 0 && e('details', { open: ouvert, style: { marginBottom: 10 } },
      e('summary', { style: { cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: coul, padding: "4px 0" } }, lbl + " (" + l.length + ")"),
      e('div', { style: { overflowX: "auto" } }, e('table', { style: { width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 12.5, marginTop: 4 } },
        e('thead', null, e('tr', { style: { textAlign: "left", color: "#5A6172", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".04em" } },
          ["Machine", "Type", "Modèle", "Âge", "Date estimée", "Utilisateur", "Vue"].map(t => e('th', { key: t, style: { padding: "6px 8px", borderBottom: "1px solid #E1E4EA", fontWeight: 600 } }, t)))),
        e('tbody', null, [...l].sort((p, q) => (q.age || 0) - (p.age || 0)).map((m, i) => e('tr', { key: m.id || i, style: { borderBottom: "1px solid #EEF0F4" } },
          e('td', { style: { padding: "6px 8px", fontWeight: 600 } }, m.lien ? e('a', { href: m.lien, target: "_blank", rel: "noopener noreferrer", style: { color: "#14171F" } }, m.nom) : m.nom),
          e('td', { style: { padding: "6px 8px" } }, m.type === "portable" ? "Portable" : m.type === "serveur" ? "Serveur" : "Poste fixe"),
          e('td', { style: { padding: "6px 8px", color: "#4A5060", maxWidth: 300 } }, String(m.modele || "—").replace(/^(\S+)\s+\1\b/i, "$1")),
          e('td', { style: { padding: "6px 8px", fontWeight: 700, color: coul, whiteSpace: "nowrap" } }, m.age != null ? String(m.age).replace(".", ",") + " ans" : "—"),
          e('td', { style: { padding: "6px 8px", whiteSpace: "nowrap" } }, m.date ? new Date(m.date).getFullYear() : "—", m.source && e('div', { style: { fontSize: 11, color: "#8A90A0" } }, m.source)),
          e('td', { style: { padding: "6px 8px", color: "#4A5060" } }, String(m.utilisateur || "—").replace(/^.*\\/, "")),
          e('td', { style: { padding: "6px 8px", whiteSpace: "nowrap", color: "#5A6172" } }, ilYa(m.dernier_contact) || "—")))))));
    return e('div', null,
      bloc("Plus de 5 ans — à remplacer", a.plus5, "#C53030", true),
      bloc("De 3 à 5 ans — à prévoir", a.de3a5, "#B45309", false),
      a.maj && e('div', { style: { fontSize: 11.5, color: "#8A90A0" } }, "Inventaire CAPEX NinjaOne du " + new Date(a.maj).toLocaleDateString("fr-FR") + " · cliquez sur un nom pour l'ouvrir dans NinjaOne"));
  };
  const champ = (lbl, cle, aide) => e('label', { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "#5A6172" } }, lbl,
    e('input', { value: saisie[cle] || "", onChange: ev => setSaisie({ ...saisie, [cle]: ev.target.value }), placeholder: aide, style: { padding: "8px 10px", border: "1px solid #D5D9E0", borderRadius: 7, fontSize: 13.5, color: "#14171F" } }));
  const triEtat = (lbl, cle, oui, non) => e('label', { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "#5A6172" } }, lbl,
    e('select', { value: saisie[cle] == null ? "" : saisie[cle] ? "1" : "0", onChange: ev => setSaisie({ ...saisie, [cle]: ev.target.value === "" ? null : ev.target.value === "1" }), style: { padding: "8px 10px", border: "1px solid #D5D9E0", borderRadius: 7, fontSize: 13.5, background: "white" } },
      e('option', { value: "" }, "— Non renseigné —"), e('option', { value: "1" }, oui), e('option', { value: "0" }, non)));
  const coche = (lbl, cle) => e('label', { style: { display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 } },
    e('input', { type: "checkbox", checked: !!saisie[cle], onChange: ev => setSaisie({ ...saisie, [cle]: ev.target.checked }), style: { width: 18, height: 18 } }), lbl);

  return e('div', { style: { display: "flex", flexDirection: "column", gap: 16 } },
    // En-tête
    e('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" } },
      e('div', null,
        e('div', { style: { fontSize: 24, fontWeight: 700 } }, x.nom),
        e('div', { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 } },
          h.groupe_hotelier && e('span', { style: { fontSize: 12, padding: "2px 9px", borderRadius: 999, background: "#E6E9EF" } }, h.groupe_hotelier),
          e('span', { style: { fontSize: 12, padding: "2px 9px", borderRadius: 999, background: "#E6E9EF" } }, "NinjaOne : " + (h.ninjaone_nom || "—")),
          cplBadgeSoc(e, h.soc, true),
          )),
      e('select', { value: x.id, onChange: ev => onHotel(ev.target.value), "aria-label": "Établissement", style: { padding: "9px 10px", border: "1px solid #D5D9E0", borderRadius: 8, fontSize: 13.5, fontWeight: 600, minWidth: 260, background: "white" } },
        [...liste].sort((a, b) => String(a.nom).localeCompare(String(b.nom))).map(y => e('option', { key: y.id, value: y.id }, y.nom)))),
    blocMachines(),

    // Reste à faire
    carte([titre("Reste à faire"),
      e('div', { key: "r", style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 } },
        [["Informations à saisir → complétude", resteC, "#1E4FA8"], ["Points à corriger → conformité", resteF, "#8A5A00"]].map(([t, l, c]) => e('div', { key: t },
          e('div', { style: { fontSize: 13.5, fontWeight: 700, color: c, marginBottom: 6 } }, t + " (" + l.length + ")"),
          l.length === 0 ? e('div', { style: { fontSize: 13, color: "#5A6172" } }, "Rien à faire ici.") :
          l.slice(0, 12).map(r => e('div', { key: r.code, style: { display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: "1px solid #EEF0F4", fontSize: 13 } },
            e('span', null, r.libelle, r.detail && e('span', { style: { color: "#888", fontSize: 12 } }, " · " + r.detail)),
            e('span', { style: { fontWeight: 700, color: c, whiteSpace: "nowrap" } }, "+" + r.gain + " pts"))))))]),

    // Infos à saisir (n'existaient pas ailleurs dans le portail)
    carte([titre("Informations à saisir pour cet hôtel", e('span', { style: { fontSize: 12, color: "#5A6172" } }, saisie0.maj_par ? "Mis à jour par " + saisie0.maj_par + (saisie0.maj_le ? " le " + new Date(saisie0.maj_le).toLocaleDateString("fr-FR") : "") : "")),
      e('div', { key: "f", style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 } },
        triEtat("Supervision RAID / matériel des hôtes", "supervision_raid", "En place", "Absente"),
        champ("Rétention Veeam / copie hors site", "retention_hors_site", "ex. 14 points, copie NAS + cloud"),
        champ("Console de l'éditeur antivirus (si autre que Sophos)", "av_console", "ex. console CrowdStrike du groupe, accès via …"),
        champ("Contact d'escalade des alertes antivirus", "av_contact_escalade", "ex. SOC du groupe, directeur technique…"),
        triEtat("Consentement « Bloquer expéditeur » (Microsoft 365)", "blocage_consentement", "Donné", "Refusé / pas encore"),
        e('div', { style: { display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" } },
          coche("Pas de serveur sur site (serveurs, sauvegardes, check-list = sans objet)", "sans_serveur"),
          champ("Serveurs hébergés ailleurs (rend aussi « sans serveur sur site »)", "serveurs_externes", "ex. Serveurs hébergés sur le réseau Hilton"),
          coche("Messagerie non gérée par DSI Hotel (Microsoft 365 = sans objet)", "m365_non_gere"),
          coche("Antivirus géré par la chaîne, ex. Hilton (Antivirus = sans objet)", "av_non_gere"))),
      e('div', { key: "b", style: { display: "flex", gap: 10, alignItems: "center", marginTop: 12 } },
        e('button', { onClick: async () => {
            if (!confirm("Ne plus suivre « " + x.nom + " » dans le tableau de bord ?\n(Réintégrable depuis l'onglet Barème.)")) return;
            const { error } = await sb.from("hotel_completude").upsert({ hotel_id: x.id, exclu: true, maj_le: new Date().toISOString(), maj_par: adminFromName ? adminFromName() : null }, { onConflict: "hotel_id" });
            if (error) { alert("Erreur : " + error.message); return; }
            onHotel(""); onChange();
          }, style: { order: 2, marginLeft: "auto", padding: "9px 14px", background: "white", border: "1px solid #DDD", color: "#8A2E10", borderRadius: 8, fontSize: 12.5, cursor: "pointer" } }, "Ne plus suivre cet hôtel"),
        e('button', { onClick: enregistrer, style: { padding: "9px 16px", background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "Enregistrer"),
        e('span', { style: { fontSize: 12.5 } }, enreg))]),

    // Fiche établissement
    section("fiche", "Info Hotel", grille([
      ["Adresse", val([h.adresse_rue, [h.adresse_cp, h.adresse_ville].filter(Boolean).join(" ")].filter(Boolean).join(", "))],
      ["Téléphone", val(h.phone)],
      ["Directeur", val([h.gm_prenom, h.gm_nom].filter(Boolean).join(" ") + (h.gm_email ? " · " + h.gm_email : ""), "Contact à renseigner")],
      ["Responsable technique", val([h.tech_prenom, h.tech_nom].filter(Boolean).join(" ") + (h.tech_email ? " · " + h.tech_email : ""), "Contact à renseigner")],
      ["RH", val([h.rh_prenom, h.rh_nom].filter(Boolean).join(" ") + (h.rh_email ? " · " + h.rh_email : ""), "—")],
      ["Nom NinjaOne", val(h.ninjaone_nom)],
    ]), lienPage("Modifier", "client-admin")),

    // Serveurs
    section("srv", "Serveurs & infrastructure", saisie0.sans_serveur ? e('div', { style: { fontSize: 13.5, padding: "8px 12px", borderRadius: 8, background: "#EEF0F4", color: "#2C3240" } },
        (saisie0.serveurs_externes || "Pas de serveur sur site") + " — serveurs, sauvegardes et check-list ne comptent pas dans le score de cet hôtel.") : !det ? e('div', { style: { fontSize: 13, color: "#888" } }, "Chargement…") : det.inv.length === 0 ? vide("Aucun serveur dans l'inventaire : lancer « Importer NinjaOne » (s'il n'y en a pas dans NinjaOne, le domaine passe en sans objet)") :
      e('div', { style: { overflowX: "auto" } }, e('table', { style: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 } },
        e('thead', null, e('tr', { style: { textAlign: "left", color: "#5A6172", fontSize: 11.5, textTransform: "uppercase" } },
          ["Machine", "Rôle", "Système", "IP", "MAJ", "Antivirus", "Garantie"].map(t => e('th', { key: t, style: { padding: "6px 8px", borderBottom: "1px solid #E1E4EA" } }, t)))),
        e('tbody', null, det.inv.map(r => e('tr', { key: r.id },
          e('td', { style: { padding: "6px 8px", borderBottom: "1px solid #EEF0F4", fontWeight: 600, paddingLeft: r.parent_id ? 22 : 8 } }, (r.parent_id ? "↳ " : "") + r.nom),
          e('td', { style: { padding: "6px 8px", borderBottom: "1px solid #EEF0F4" } }, r.role || vide()),
          e('td', { style: { padding: "6px 8px", borderBottom: "1px solid #EEF0F4" } }, r.os ? r.os + (r.version ? " · " + r.version : "") : vide()),
          e('td', { style: { padding: "6px 8px", borderBottom: "1px solid #EEF0F4", color: "#4A5060" } }, r.ip || "—"),
          e('td', { style: { padding: "6px 8px", borderBottom: "1px solid #EEF0F4", color: r.a_jour === "Non" ? "#A8401F" : "#14171F", fontWeight: r.a_jour === "Non" ? 600 : 400 } }, r.a_jour === "Oui" ? "À jour" : r.a_jour === "Non" ? "En retard" : "—"),
          e('td', { style: { padding: "6px 8px", borderBottom: "1px solid #EEF0F4", color: r.antivirus === "Non" ? "#A8401F" : "#14171F" } }, r.antivirus === "Oui" ? (r.antivirus_nom || "Actif") : r.antivirus === "Non" ? "Absent / inactif" : "—"),
          e('td', { style: { padding: "6px 8px", borderBottom: "1px solid #EEF0F4" } }, r.type !== "Physique" ? "—" : r.care_pack_fin ? new Date(r.care_pack_fin).toLocaleDateString("fr-FR") : r.care_pack === "N/A" ? "N/A" : r.care_pack === "Non" ? "Sans" : vide())))))),
      lienPage("Inventaire serveurs", "inventaire")),

    // Sauvegardes
    section("bkp", "Sauvegardes Veeam", !det ? null : det.jobs.length === 0 ? vide("Aucun job Veeam rattaché") :
      e('div', { style: { display: "flex", flexDirection: "column" } },
        // Échecs en premier, puis avertissements, puis OK (comme la page Sauvegardes)
        [...det.jobs].sort((a, b) => cplVeeam(a.dernier_statut).rang - cplVeeam(b.dernier_statut).rang || String(a.nom).localeCompare(String(b.nom))).map(j => {
          const st = cplVeeam(j.dernier_statut);
          const runs = (det.runsVeeam || {})[String(j.id)] || [];
          return e('div', { key: j.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #EEF0F4", fontSize: 13, flexWrap: "wrap" } },
            e('span', { title: st.lbl, style: { width: 10, height: 10, borderRadius: "50%", background: st.c, flexShrink: 0 } }),
            e('div', { style: { flex: 1, minWidth: 220 } },
              e('div', { style: { fontWeight: 600, color: "#14171F" } }, j.nom || j.libelle),
              e('div', { style: { fontSize: 12, color: "#6B7280", marginTop: 1 } }, (j.planifie ? (j.planif_desc || "planifié") : "planification non remontée") + (j.serveur ? " · " + j.serveur : ""))),
            runs.length > 0 && e('div', { style: { display: "flex", gap: 4, alignItems: "center" }, "aria-label": "10 dernières exécutions" },
              runs.map((r, k) => { const m = cplVeeam(r.s); return e('span', { key: r.id || k, title: (r.t ? new Date(r.t).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) + " — " : "") + m.lbl,
                style: { width: 12, height: 12, borderRadius: "50%", background: m.c, display: "inline-block" } }); })),
            e('span', { style: { minWidth: 150, textAlign: "right", fontWeight: 600, color: st.fg } },
              e('span', { style: { padding: "2px 8px", borderRadius: 999, background: st.bg, fontSize: 12 } }, st.lbl),
              j.dernier_run_at && e('span', { style: { color: "#6B7280", fontWeight: 400, marginLeft: 6 } }, new Date(j.dernier_run_at).toLocaleDateString("fr-FR"))));
        })),
      lienPage("Sauvegardes", "backups")),

    // Antivirus
    section("av", "Antivirus", saisie0.av_non_gere ? e('div', { style: { fontSize: 13.5, padding: "8px 12px", borderRadius: 8, background: "#EEF0F4", color: "#2C3240" } },
        "Antivirus géré par la chaîne (" + (saisie0.serveurs_externes || "hors DSI Hotel") + ") : ne compte pas dans le score.") : grille([
      ["Antivirus en vigueur", avPrevu ? e('span', null, CPL_AV_NOMS[avPrevu] || avPrevu,
        avV.avant && e('span', { style: { color: "#888", fontSize: 12 } }, " · depuis le " + fr(avV.bascule) + " (avant : " + (CPL_AV_NOMS[avV.avant] || avV.avant) + ")"),
        avV.futur && e('span', { style: { color: "#8A5A00", fontSize: 12 } }, " · passage à " + (CPL_AV_NOMS[avV.futur] || avV.futur) + (avV.bascule ? " prévu le " + fr(avV.bascule) : " prévu"))) : vide()],
      ["SOC externe", h.soc ? cplSocNom(h.soc) + " (surveillance et escalade des alertes)" : "Aucun"],
      ["Détecté par NinjaOne", !ad ? vide("Lancer la détection (page Sécurité Anti Virus)") :
        e('div', null, Object.entries(ad.produits || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => (CPL_AV_NOMS[k] || k) + " : " + n).join(" · ") + " — sur " + ad.postes + " postes" + (ad.sans_info ? " (" + ad.sans_info + " sans antivirus actif)" : ""),
          e('div', { style: { fontSize: 12, color: "#888" } }, "Lecture du " + new Date(ad.le).toLocaleDateString("fr-FR") + (ad.a_jour != null ? " · définitions à jour : " + ad.a_jour + " / " + ad.postes : "") + (ad.menaces != null ? " · menaces actives : " + ad.menaces : "")))],
      ["Console de l'éditeur", saisie0.av_console || (avPrevu === "sophos" ? "Sophos Central (supervisé dans le portail)" : h.soc ? "Exploitée par le SOC " + cplSocNom(h.soc) : vide())],
      ["Contact d'escalade", saisie0.av_contact_escalade || (h.soc ? "SOC " + cplSocNom(h.soc) : vide())],
    ]), lienPage("Sécurité Anti Virus", "sophos")),

    // Microsoft 365
    section("m365", "Microsoft 365", saisie0.m365_non_gere ? e('div', { style: { fontSize: 13, color: "#5A6172" } }, "Messagerie non gérée par DSI Hotel" + (cplChaine(saisie0.serveurs_externes) ? " (gérée par " + cplChaine(saisie0.serveurs_externes) + ")" : "") + " : ne compte pas dans le score.") : grille([
      ["Tenant(s) rattaché(s)", !det ? "…" : det.m365.length ? det.m365.map(t => (t.domaines || []).join(", ") || t.tenant_id).join(" · ") : vide("Aucun domaine rattaché")],
      ["Bloquer expéditeur", saisie0.blocage_consentement == null ? vide() : saisie0.blocage_consentement ? "Consentement donné" : "Pas encore donné"],
      ["MFA", "Pas encore collecté par le portail"],
    ]), lienPage("Sécurité Microsoft", "m365")),

    // Check-list
    section("chk", "Check-list sécurité sur site", !det ? null : grille([
      ["Points renseignés", nbCkRempli + " / " + nbCk],
      ["Dernier contrôle", dernierCk ? new Date(dernierCk).toLocaleDateString("fr-FR") : vide("Jamais vérifiée")],
    ]), lienPage("Check-list", "checklist")),

    // Matériel (conformité seulement)
    carte([titre("Matériel", e('span', { style: { display: "flex", gap: 10, alignItems: "center" } }, badgesDom("mat"), lienPage("CAPEX", "capex"))),
      e('div', { key: "m" }, criteres("conf", "mat")),
      det && e('div', { key: "l", style: { marginTop: 12 } }, tableAge(det.ageMat))])
  );
}
