// ===== Page « sophos » — condition dans App : page === "sophos" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_sophos({...}) de app.js.
function Page_sophos(ctx) {
  let content = ctx.content;
  const {
    fmtDateHeureFr2, hotels, isMobile, loadSoPostes, loadSophos, setSoHotelFiltre, setSoModal, setSoNaOuvert,
    setSoNoteEdit, setSoOpenHotel, setSoSecOuvertes, setSoTab, setSoTpMsg, setSoTpSel, setSoVoirIgnores,
    setSoVoirResolues, soASupprimer, soAffecter, soAlertes, soBusy, soComptes, soDedoublonner,
    soEnregistrerCompte, soEnregistrerNote, soErr, soHotelFiltre, soLoading, soMarquerSuppression, soModal,
    soMsg, soNaOuvert, soNinja, soNinjaOrg, soNonAffectes, soNoteEdit, soOpenHotel, soPostes,
    soPrendreEnCharge, soScanner, soSecOuvertes, soSuggererNinja, soSuggest, soSupprimerCompte,
    soSupprimerSophos, soSynchroniser, soTab, soTamper, soTamperMdp, soTpBasculer, soTpBusy, soTpMsg,
    soTpSel, soViderTelechargements, soVoirIgnores, soVoirResolues,
    soProtModal, setSoProtModal, soEnregistrerProtection
  } = ctx;
    const SEV = { high: { l: "Haute", c: "#C53030", bg: "#FDECEC" }, medium: { l: "Moyenne", c: "#B7791F", bg: "#FFF6E5" }, low: { l: "Faible", c: "#718096", bg: "#F0F0F4" } };
    const sevMeta = (s) => SEV[s] || { l: s || "—", c: "#718096", bg: "#F0F0F4" };
    const HEALTH = { good: { l: "OK", c: "#2F855A", bg: "#E9F6EE" }, suspicious: { l: "Suspect", c: "#B7791F", bg: "#FFF6E5" }, bad: { l: "Mauvais", c: "#C53030", bg: "#FDECEC" }, unknown: { l: "Inconnu", c: "#718096", bg: "#F0F0F4" } };
    const healthMeta = (h) => HEALTH[h] || HEALTH.unknown;
    const nomHotel = (id) => { const h = hotels.find(x => x.id === id); return h ? h.name : "?"; };
    // Nom lisible d'un compte Sophos Central (tenant)
    const nomSophos = (tenantId) => {
      const cs = soComptes.filter(x => x.tenant_id === tenantId);
      const lib = (cs.find(x => x.libelle) || {}).libelle;
      if (lib) return lib;
      if (!cs.length) return "Sophos inconnu";
      const pr = cs.find(x => x.principal !== false) || cs[0];
      return "Sophos de " + nomHotel(pr.hotel_id) + (cs.length > 1 ? " (partagé, " + cs.length + " hôtels)" : "");
    };
    const caseSuppr = (p) => React.createElement('label', { title: "Mémorise qu'il faudra supprimer ce PC dans « " + nomSophos(p.tenant_id) + " »", onClick: e => e.stopPropagation(),
        style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", padding: "2px 7px", borderRadius: 6,
          color: p.a_supprimer ? "#C53030" : "#999", background: p.a_supprimer ? "#FDECEC" : "transparent", border: "1px solid " + (p.a_supprimer ? "#F5B5B5" : "#E8E8F0"), fontWeight: p.a_supprimer ? 700 : 400 } },
      React.createElement('input', { type: "checkbox", checked: !!p.a_supprimer, onChange: e => soMarquerSuppression(p, e.target.checked), style: { margin: 0 } }),
      "🗑 À supprimer de Sophos");
    const compteDe = (hid) => soComptes.find(c => c.hotel_id === hid);
    // Alerte de licence (expirée / à échéance) : rangée à part, ce n'est pas une menace.
    const estLicence = (a) => a.licence === true || /licen[cs]e|subscription|abonnement|\bexpir/i.test([a.type, a.description, a.category].filter(Boolean).join(" "));
    const alertesUniques = soDedoublonner(soAlertes);
    const alertesSecu = alertesUniques.filter(a => !estLicence(a));
    const alertesLic = alertesUniques.filter(a => estLicence(a) && a.statut === "ouverte");
    // Compteurs par hôtel recalculés côté portail (fiables même avant la migration SQL)
    const ouvSecu = (hid) => alertesSecu.filter(a => a.hotel_id === hid && a.statut === "ouverte");
    const nbAlertesH = (c) => ouvSecu(c.hotel_id).length;
    const nbHautesH = (c) => ouvSecu(c.hotel_id).filter(a => a.severity === "high").length;
    const nbLicH = (c) => alertesLic.filter(a => a.hotel_id === c.hotel_id).length;
    const seuilMuet = Date.now() - 7 * 86400000;
    const etatHotel = (c) => {
      if (!c) return { c: "#A0AEC0", l: "Non configuré", rank: 4 };
      if (!c.actif) return { c: "#A0AEC0", l: "Désactivé", rank: 4 };
      if (c.dernier_statut === "erreur") return { c: "#C53030", l: "Erreur de connexion", rank: 0 };
      if (!c.dernier_controle) return { c: "#A0AEC0", l: "En attente de synchro", rank: 3 };
      if (nbHautesH(c) > 0 || (c.nb_postes_ko || 0) > 0) return { c: "#C53030", l: "Critique", rank: 1 };
      if (nbAlertesH(c) > 0 || (c.nb_postes_suspects || 0) > 0 || (c.nb_postes_muets || 0) > 0) return { c: "#DD6B20", l: "À surveiller", rank: 2 };
      return { c: "#2F855A", l: "OK", rank: 3 };
    };
    const somme = (k) => soComptes.filter(c => c.actif).reduce((n, c) => n + (c[k] || 0), 0);
    const nbErreurs = soComptes.filter(c => c.actif && c.dernier_statut === "erreur").length;

    let alertesVues = (soTab === "licences" ? alertesLic : alertesSecu).filter(a => soVoirResolues ? true : a.statut === "ouverte");
    if (soHotelFiltre) alertesVues = alertesVues.filter(a => a.hotel_id === soHotelFiltre);
    const rankSev = { high: 0, medium: 1, low: 2 };
    alertesVues = alertesVues.slice().sort((a, b) =>
      (a.statut === "ouverte" ? 0 : 1) - (b.statut === "ouverte" ? 0 : 1) ||
      (rankSev[a.severity] ?? 3) - (rankSev[b.severity] ?? 3) ||
      new Date(b.raised_at || 0) - new Date(a.raised_at || 0));

    const hotelsTries = hotels.slice().sort((a, b) => {
      const ea = etatHotel(compteDe(a.id)), eb = etatHotel(compteDe(b.id));
      return ea.rank - eb.rank || String(a.name).localeCompare(String(b.name));
    });

    const tuile = (lbl, val, coul, onClick) => React.createElement('div', { onClick, title: onClick ? "Voir le détail" : undefined, style: { flex: "1 1 140px", background: "white", border: "1px solid " + (onClick && (soTab === "alertes" && lbl.startsWith("Alertes") || soTab === "licences" && lbl.startsWith("Licences")) ? G : "#E8E8F0"), borderRadius: 10, padding: "12px 15px", cursor: onClick ? "pointer" : "default" } },
      React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 5 } }, lbl),
      React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: coul } }, String(val)));
    const btn = (lbl, onClick, extra) => React.createElement('button', { onClick, disabled: extra && extra.disabled, style: Object.assign({ padding: "6px 12px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" }, (extra && extra.style) || {}) }, lbl);
    const inputS = { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    // ===== Protection de l'hôtel : antivirus + SOC externe (colonnes hotels.antivirus / soc / antivirus_futur / antivirus_bascule) =====
    const AV = { sophos: { l: "Sophos", img: "img/logos/sophos.png", url: "https://central.sophos.com" },
      sentinelone: { l: "SentinelOne", img: "img/logos/sentinelone.png", url: "https://www.sentinelone.com/" },
      crowdstrike: { l: "CrowdStrike", img: "img/logos/crowdstrike.png", url: "https://www.crowdstrike.com/fr-fr/login/" }, autre: { l: "Autre antivirus", img: null } };
    const SOC = { stoik: { l: "Stoïk SOC", img: "img/logos/stoik.png", url: "https://app.stoik.io/protect/2ea5ea8f-f559-4180-a17d-b3809d6d1f07" } };
    const GRILLE = "minmax(0, 2.2fr) 180px 64px minmax(0, 2fr) 112px";
    const jourIso = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();
    const dateCourte = (iso) => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "";
    const protectionDe = (h, c) => {
      const faite = !!(h.antivirus_futur && h.antivirus_bascule && h.antivirus_bascule <= jourIso);
      const actuel = faite ? h.antivirus_futur : (h.antivirus || (c ? "sophos" : null));
      const futur = !faite && h.antivirus_futur && h.antivirus_futur !== actuel ? h.antivirus_futur : null;
      return { actuel, futur, bascule: futur ? h.antivirus_bascule : null, soc: h.soc || null };
    };
    const logo = (m, key, opts) => {
      if (!m) return null;
      const o = opts || {};
      const el = !m.img
        ? React.createElement('span', { key: m.url ? undefined : key, title: o.title || m.l, style: { fontSize: 10.5, fontWeight: 600, color: "#555", background: "#F0F0F4", borderRadius: 4, padding: "2px 6px" } }, m.l)
        : React.createElement('img', { key: m.url ? undefined : key, src: m.img, alt: m.l, title: (o.title || m.l) + (m.url ? " — ouvrir la console" : ""),
            style: { height: 18, borderRadius: 3, verticalAlign: "middle", flexShrink: 0, display: "block", filter: o.gris ? "grayscale(1)" : "none", opacity: o.gris ? 0.45 : 1 } });
      if (!m.url) return el;
      return React.createElement('a', { key, href: m.url, target: "_blank", rel: "noopener noreferrer", onClick: e => e.stopPropagation(), style: { display: "inline-flex", flexShrink: 0 } }, el);
    };
    const logosProtection = (pr) => [
      pr.actuel && logo(AV[pr.actuel], "av", { title: "Antivirus : " + (AV[pr.actuel] || {}).l }),
      pr.futur && logo(AV[pr.futur], "avf", { gris: true, title: "Bascule vers " + (AV[pr.futur] || {}).l + " le " + dateCourte(pr.bascule) }),
      pr.soc && logo(SOC[pr.soc], "soc", { title: "Supervisé par " + (SOC[pr.soc] || {}).l })
    ].filter(Boolean);

    const actifs = soComptes.filter(c => c.actif);
    const hautes = actifs.reduce((n, c) => n + nbHautesH(c), 0);
    const ouvertes = actifs.reduce((n, c) => n + nbAlertesH(c), 0);
    const nbLic = actifs.reduce((n, c) => n + nbLicH(c), 0);
    const ko = somme("nb_postes_ko"), muets = somme("nb_postes_muets");

    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Supervision centralisée des comptes Sophos Central de chaque établissement : alertes de sécurité et santé des postes. Les données sont actualisées automatiquement environ toutes les 20 minutes ; les nouvelles alertes de sécurité de sévérité haute sont envoyées par email à l'équipe. Cliquez sur une tuile ou sur le badge d'un hôtel pour voir le détail des alertes ou des licences."),
      React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 } },
        tuile("Établissements suivis", soComptes.filter(c => c.actif).length + " / " + hotels.length, "#0F0F24"),
        tuile("Alertes hautes", hautes, hautes > 0 ? "#C53030" : "#2F855A"),
        tuile("Alertes ouvertes", ouvertes, ouvertes > 0 ? "#DD6B20" : "#2F855A", () => { setSoHotelFiltre(""); setSoTab("alertes"); }),
        tuile("Postes en mauvaise santé", ko, ko > 0 ? "#C53030" : "#2F855A"),
        tuile("Postes muets (+7 j)", muets, muets > 0 ? "#DD6B20" : "#2F855A"),
        tuile("Comptes en erreur", nbErreurs, nbErreurs > 0 ? "#C53030" : "#2F855A"),
        tuile("Licences à traiter", nbLic, nbLic > 0 ? "#B7791F" : "#2F855A", () => { setSoHotelFiltre(""); setSoTab("licences"); })
      ),
      React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 } },
        (soTab === "alertes" || soTab === "licences") && React.createElement('button', { onClick: () => { setSoHotelFiltre(""); setSoTab("hotels"); }, style: { padding: "7px 15px", border: "1px solid " + G, background: G + "18", color: G2, borderRadius: 20, fontSize: 12.5, cursor: "pointer", fontWeight: 600 } },
          "← " + (soTab === "alertes" ? "Alertes" : "Licences") + (soHotelFiltre ? " · " + nomHotel(soHotelFiltre) : "") + " — retour aux établissements"),
        [["hotels", "🏨 Établissements"], ["suppr", "🗑 À supprimer" + (soASupprimer.length ? " (" + soASupprimer.length + ")" : "")]].map(([k, l]) => React.createElement('button', { key: k, onClick: () => setSoTab(k), style: { padding: "7px 15px", border: "1px solid " + (soTab === k ? G : "#DDD"), background: soTab === k ? G + "18" : "white", color: soTab === k ? G2 : "#555", borderRadius: 20, fontSize: 12.5, cursor: "pointer", fontWeight: soTab === k ? 600 : 400 } }, l)),
        React.createElement('button', { onClick: () => loadSophos(), disabled: soLoading, style: { marginLeft: "auto", padding: "7px 13px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, soLoading ? "…" : "🔄 Actualiser")
      ),
      soMsg && React.createElement('div', { style: { fontSize: 12.5, marginBottom: 12, padding: "9px 12px", borderRadius: 8, background: soMsg.startsWith("❌") ? "#FDECEC" : "#F0F7F2", border: "1px solid " + (soMsg.startsWith("❌") ? "#F5B5B5" : "#C6E6D0"), color: soMsg.startsWith("❌") ? "#C53030" : "#2F855A" } }, soMsg),
      soErr && React.createElement('div', { style: { fontSize: 12.5, marginBottom: 12, padding: "9px 12px", borderRadius: 8, background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030" } }, soErr),

      // ----- Onglet ALERTES -----
      (soTab === "alertes" || soTab === "licences") && React.createElement('div', null,
        soTab === "licences" && React.createElement('div', { style: { fontSize: 12, color: "#8A6D1F", background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 8, padding: "9px 12px", marginBottom: 12, lineHeight: 1.55 } },
          "📜 Licences et abonnements Sophos expirés ou arrivant à échéance. Ce ne sont pas des menaces : pas d'email immédiat, un récapitulatif est envoyé chaque lundi matin. Produit plus utilisé → acquitter l'alerte dans Sophos Central (elle passera en « Résolue »). Produit à conserver → prévoir le renouvellement avec le client."),
        React.createElement('div', { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 } },
          React.createElement('select', { value: soHotelFiltre, onChange: e => setSoHotelFiltre(e.target.value), style: { padding: "7px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12.5, maxWidth: 260 } },
            React.createElement('option', { value: "" }, "Tous les établissements"),
            hotels.filter(h => compteDe(h.id)).sort((a, b) => String(a.name).localeCompare(String(b.name))).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
          soTab === "alertes" && React.createElement('label', { style: { fontSize: 12.5, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: soVoirResolues, onChange: e => setSoVoirResolues(e.target.checked) }), "Afficher les alertes résolues"),
          React.createElement('span', { style: { fontSize: 12, color: "#888" } }, alertesVues.length + " alerte" + (alertesVues.length > 1 ? "s" : ""))
        ),
        !soLoading && alertesVues.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", background: "#E9F6EE", border: "1px solid #B7E0C6", borderRadius: 10, color: "#2F855A", fontSize: 13.5, fontWeight: 600 } },
          soComptes.length === 0 ? "Aucun compte Sophos configuré : commencez par l'onglet « Établissements »." : soTab === "licences" ? "✅ Aucune licence expirée." : "✅ Aucune alerte de sécurité ouverte."),
        React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
          alertesVues.map(a => {
            const lic = estLicence(a);
            const sm = lic ? { l: "Licence", c: "#B7791F", bg: "#FFF6E5" } : sevMeta(a.severity);
            const ouverte = a.statut === "ouverte";
            return React.createElement('div', { key: a.id, style: { background: ouverte ? "white" : "#FAFAFC", border: "1px solid " + (ouverte && !lic && a.severity === "high" ? "#F5B5B5" : "#E8E8F0"), borderLeft: "5px solid " + (ouverte ? sm.c : "#CBD5E0"), borderRadius: 10, padding: "12px 15px", opacity: ouverte ? 1 : 0.75 } },
              React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 } },
                React.createElement('span', { style: { fontSize: 10.5, fontWeight: 700, color: sm.c, background: sm.bg, padding: "2px 9px", borderRadius: 20 } }, sm.l),
                React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: "#1a1a3e" } }, nomHotel(a.hotel_id)),
                a.poste && React.createElement('span', { style: { fontSize: 11.5, color: "#555", background: "#F0F0F8", padding: "2px 8px", borderRadius: 20 } }, "💻 " + a.poste),
                a.category && React.createElement('span', { style: { fontSize: 11, color: "#888" } }, a.category),
                a._nb > 1 && React.createElement('span', { title: "Même alerte remontée " + a._nb + " fois — seule la plus récente est affichée", style: { fontSize: 10.5, fontWeight: 700, color: "#6B46C1", background: "#F3EEFF", padding: "2px 9px", borderRadius: 20 } }, "🔁 ×" + a._nb + " · depuis le " + fmtDateHeureFr2(a._premiere)),
                React.createElement('span', { style: { marginLeft: "auto", fontSize: 11, color: "#999" } }, (a._nb > 1 ? "dernière : " : "") + fmtDateHeureFr2(a.raised_at)),
                !ouverte && React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, color: "#2F855A", background: "#E9F6EE", padding: "2px 9px", borderRadius: 20 } }, "✓ Résolue" + (a.resolue_le ? " le " + fmtDateHeureFr2(a.resolue_le) : ""))
              ),
              React.createElement('div', { style: { fontSize: 13, color: "#333", lineHeight: 1.5, wordBreak: "break-word" } }, (() => {
                // Sophos renvoie parfois les accents encodés (&eacute;) : décodage en texte brut (sans HTML)
                const t = a.description || a.type || "(sans description)";
                if (!/&[a-z#0-9]+;/i.test(t)) return t;
                const el = document.createElement("textarea"); el.innerHTML = t; return el.value;
              })()),
              a.note && soNoteEdit?.id !== a.id && React.createElement('div', { style: { marginTop: 7, fontSize: 12, color: "#8A6D1F", background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 7, padding: "6px 9px", whiteSpace: "pre-wrap" } }, "📝 " + a.note),
              soNoteEdit?.id === a.id && React.createElement('div', { style: { marginTop: 8 } },
                React.createElement('textarea', { value: soNoteEdit.note, onChange: e => setSoNoteEdit({ ...soNoteEdit, note: e.target.value }), rows: 2, autoFocus: true, placeholder: "Action menée, analyse, faux positif…", style: { ...inputS, resize: "vertical" } }),
                React.createElement('div', { style: { display: "flex", gap: 6, marginTop: 6 } },
                  btn("Enregistrer", soEnregistrerNote, { style: { background: G, border: "none", color: "#111", fontWeight: 600 } }),
                  btn("Annuler", () => setSoNoteEdit(null)))
              ),
              React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 9 } },
                a.prise_en_charge_par
                  ? React.createElement('span', { style: { fontSize: 11.5, color: "#2B6CB0", background: "#EBF4FF", padding: "3px 10px", borderRadius: 20 } }, "👤 Pris en charge par " + a.prise_en_charge_par + (a.prise_en_charge_le ? " — " + fmtDateHeureFr2(a.prise_en_charge_le) : ""))
                  : (ouverte && btn("✋ Prendre en charge", () => soPrendreEnCharge(a), { style: { border: "1px solid " + G, color: G2, fontWeight: 600 } })),
                soNoteEdit?.id !== a.id && btn(a.note ? "✏️ Modifier la note" : "📝 Ajouter une note", () => setSoNoteEdit({ id: a.id, ids: a._ids, note: a.note || "" }))
              )
            );
          })
        )
      ),

      // ----- Onglet À SUPPRIMER (par compte Sophos Central) -----
      soTab === "suppr" && React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 12, color: "#555", background: "#F4F4F8", border: "1px solid #E2E2EA", borderRadius: 8, padding: "9px 12px", marginBottom: 12, lineHeight: 1.55 } },
          "🗑 PC cochés « À supprimer de Sophos », regroupés par console Sophos Central. Connectez-vous à la console indiquée → Appareils → sélectionnez le PC → Supprimer. Une fois supprimé dans Sophos, il disparaît automatiquement de cette liste à la synchronisation suivante."),
        soASupprimer.length === 0
          ? React.createElement('div', { style: { padding: 28, textAlign: "center", background: "#E9F6EE", border: "1px solid #B7E0C6", borderRadius: 10, color: "#2F855A", fontSize: 13.5, fontWeight: 600 } }, "✅ Aucun PC en attente de suppression.")
          : Object.entries(soASupprimer.reduce((acc, p) => { (acc[p.tenant_id] = acc[p.tenant_id] || []).push(p); return acc; }, {})).map(([t, liste]) =>
              React.createElement('div', { key: t, style: { background: "white", border: "1px solid #F5B5B5", borderLeft: "5px solid #C53030", borderRadius: 10, overflow: "hidden", marginBottom: 10 } },
                React.createElement('div', { style: { padding: "10px 15px", background: "#FDECEC", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#C53030" } }, "🛡️ " + nomSophos(t) + " — " + liste.length + " PC à supprimer"),
                    React.createElement('div', { style: { fontSize: 11.5, color: "#9B2C2C", marginTop: 2 } }, "Hôtels de cette console : " + soComptes.filter(x => x.tenant_id === t).map(x => nomHotel(x.hotel_id)).join(" · "))),
                  btn(soTpBusy === "__suppr:suppr" ? "Suppression…" : "🗑 Supprimer " + (liste.length > 25 ? "les 25 premiers" : liste.length > 1 ? "ces " + liste.length + " PC" : "ce PC") + " de Sophos", () => soSupprimerSophos(t, liste.slice(0, 25), null), { disabled: !!soTpBusy, style: { background: "#C53030", border: "none", color: "white", fontWeight: 700 } }),
                  React.createElement('a', { href: "https://central.sophos.com", target: "_blank", rel: "noopener noreferrer", style: { fontSize: 12, fontWeight: 600, color: "#C53030", textDecoration: "none", border: "1px solid #F5B5B5", background: "white", borderRadius: 7, padding: "5px 10px" } }, "Ouvrir Sophos Central ↗")),
                liste.map(p => {
                  const j = p.last_seen_at ? Math.floor((Date.now() - new Date(p.last_seen_at).getTime()) / 86400000) : null;
                  return React.createElement('div', { key: p.sophos_id, style: { display: "flex", alignItems: "center", gap: 10, padding: "7px 15px", borderTop: "1px solid #F8E0E0", fontSize: 12.5, flexWrap: "wrap" } },
                    React.createElement('span', { style: { flex: "0 0 190px", fontWeight: 700, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (p.type === "server" ? "🖥️ " : "💻 ") + (p.hostname || "?")),
                    React.createElement('span', { style: { flex: "0 0 190px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.hotel_id ? "🏨 " + nomHotel(p.hotel_id) : "— non affecté"),
                    React.createElement('span', { style: { flex: "0 0 190px", color: "#777", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.dernier_utilisateur ? "👤 " + p.dernier_utilisateur : ""),
                    React.createElement('span', { style: { flex: "0 0 130px", color: "#C05621", fontSize: 11.5, whiteSpace: "nowrap" } }, j === null ? "" : j === 0 ? "vu aujourd'hui" : "muet depuis " + j + " j"),
                    React.createElement('span', { style: { color: "#999", fontSize: 11 } }, p.a_supprimer_par ? "coché par " + p.a_supprimer_par + (p.a_supprimer_le ? " le " + fmtDateHeureFr2(p.a_supprimer_le) : "") : ""),
                    React.createElement('div', { style: { marginLeft: "auto", display: "flex", gap: 6 } },
                      btn("🗑 Supprimer", () => soSupprimerSophos(t, [p], null), { disabled: !!soTpBusy, style: { padding: "4px 9px", border: "1px solid #F5B5B5", color: "#C53030", fontWeight: 600 } }),
                      btn("↩ Retirer de la liste", () => soMarquerSuppression(p, false), { style: { padding: "4px 9px" } }))
                  );
                })
              ))
      ),

      // ----- Onglet ÉTABLISSEMENTS -----
      soTab === "hotels" && React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
        // ===== Comptes Sophos partagés : PC non affectés =====
        (() => {
          const tenants = {};
          soComptes.forEach(x => { if (x.tenant_id) (tenants[x.tenant_id] = tenants[x.tenant_id] || []).push(x); });
          const partages = Object.keys(tenants).filter(t => tenants[t].length > 1);
          if (!partages.length) return null;
          const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          return partages.map(t => {
            const hotelsT = tenants[t].map(x => hotels.find(hh => hh.id === x.hotel_id)).filter(Boolean);
            const tous = soNonAffectes.filter(p => p.tenant_id === t);
            const ignores = tous.filter(p => p.affectation === "ignore");
            const liste = tous.filter(p => p.affectation !== "ignore");
            // Suggestion : organisation NinjaOne du PC = « Nom NinjaOne » (ou nom) d'un hôtel du compte
            const suggestion = (p) => {
              const n = soSuggest.parPoste[String(p.hostname || "").toUpperCase()];
              if (!n || !n.trouve || !n.organisation) return null;
              const o = norm(n.organisation);
              const hh = hotelsT.find(x => (x.ninjaone_nom && norm(x.ninjaone_nom) === o) || norm(x.name) === o)
                || hotelsT.find(x => o && (norm(x.name).includes(o) || o.includes(norm(x.name))));
              return { org: n.organisation, hotel: hh || null };
            };
            const avecSugg = liste.map(p => ({ p, sg: suggestion(p) })).filter(x => x.sg && x.sg.hotel);
            const selS = { padding: "4px 7px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, maxWidth: 210 };
            const ligne = (p, ignore) => {
              const sg = !ignore && suggestion(p);
              const j = p.last_seen_at ? Math.floor((Date.now() - new Date(p.last_seen_at).getTime()) / 86400000) : null;
              return React.createElement('div', { key: p.sophos_id, style: { display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderTop: "1px solid #F0F0F5", fontSize: 12.5, flexWrap: "wrap", background: "white" } },
                React.createElement('span', { style: { flex: "0 0 190px", fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: p.hostname }, "💻 " + (p.hostname || "?")),
                React.createElement('span', { style: { flex: "0 0 200px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: p.dernier_utilisateur || "" }, p.dernier_utilisateur ? "👤 " + p.dernier_utilisateur : "—"),
                React.createElement('span', { style: { flex: "0 0 120px", color: "#888", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: p.ips || "" }, p.ips || ""),
                React.createElement('span', { style: { flex: "0 0 90px", color: j !== null && j > 7 ? "#C05621" : "#888", fontSize: 11.5 } }, j === null ? "" : j === 0 ? "vu aujourd'hui" : "vu il y a " + j + " j"),
                sg && React.createElement('span', { style: { fontSize: 11.5, color: sg.hotel ? "#2F855A" : "#999" } }, "NinjaOne : " + sg.org + (sg.hotel ? "" : " (aucun hôtel correspondant)")),
                React.createElement('div', { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" } },
                  caseSuppr(p),
                  sg && sg.hotel && btn("✓ " + sg.hotel.name, () => soAffecter(t, [{ sophosId: p.sophos_id, hostname: p.hostname, hotelId: sg.hotel.id }], p.hostname + " → " + sg.hotel.name), { style: { border: "1px solid #9AE6B4", color: "#2F855A", fontWeight: 600, padding: "4px 9px" } }),
                  ignore
                    ? btn("↩ Ne plus ignorer", () => soAffecter(t, [{ sophosId: p.sophos_id, hostname: p.hostname, hotelId: null }], p.hostname + " remis dans les PC à affecter"), { style: { padding: "4px 9px" } })
                    : React.createElement('select', { value: "", onChange: e => {
                        const v = e.target.value; if (!v) return;
                        if (v === "__ignore") soAffecter(t, [{ sophosId: p.sophos_id, hostname: p.hostname, ignorer: true }], p.hostname + " ignoré");
                        else soAffecter(t, [{ sophosId: p.sophos_id, hostname: p.hostname, hotelId: v }], p.hostname + " → " + (hotelsT.find(x => x.id === v) || {}).name);
                      }, style: selS },
                        React.createElement('option', { value: "" }, "Affecter à…"),
                        hotelsT.map(x => React.createElement('option', { key: x.id, value: x.id }, x.name)),
                        React.createElement('option', { value: "__ignore" }, "🚫 Ignorer (pas un de nos hôtels)"))
                )
              );
            };
            const ouvertNa = !!soNaOuvert[t];
            return React.createElement('div', { key: t, style: { background: "white", border: "1px solid #F0D98A", borderLeft: "5px solid #B7791F", borderRadius: 10, overflow: "hidden", marginBottom: 6 } },
              React.createElement('div', { onClick: () => setSoNaOuvert(prev => ({ ...prev, [t]: !prev[t] })), title: ouvertNa ? "Replier" : "Déplier la liste des PC à affecter",
                  style: { padding: ouvertNa ? "11px 15px" : "8px 15px", background: "#FFFBEB", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer", userSelect: "none" } },
                React.createElement('div', { style: { flex: "1 1 260px" } },
                  React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#8A6D1F" } }, (ouvertNa ? "▼ " : "▶ ") + "🔗 " + nomSophos(t) + " — " + liste.length + " PC non affecté" + (liste.length > 1 ? "s" : "")),
                  ouvertNa && React.createElement('div', { style: { fontSize: 11.5, color: "#8A6D1F", marginTop: 2 } }, "Hôtels du compte : " + hotelsT.map(x => x.name).join(" · ") + ". Affinez les règles via « Configurer » ou affectez les PC ci-dessous (mémorisé).")),
                ouvertNa && React.createElement('div', { onClick: e => e.stopPropagation(), style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                liste.length > 0 && btn(soSuggest.loading ? "🔎 Recherche…" : "🔎 Suggérer via NinjaOne", () => soSuggererNinja(liste), { disabled: soSuggest.loading }),
                avecSugg.length > 0 && btn("✓ Appliquer " + avecSugg.length + " suggestion" + (avecSugg.length > 1 ? "s" : ""), () => soAffecter(t, avecSugg.map(x => ({ sophosId: x.p.sophos_id, hostname: x.p.hostname, hotelId: x.sg.hotel.id })), avecSugg.length + " PC affecté(s) selon NinjaOne"), { style: { background: "#2F855A", border: "none", color: "white", fontWeight: 600 } }))
              ),
              ouvertNa && soSuggest.err && React.createElement('div', { style: { fontSize: 11.5, color: "#B7791F", padding: "6px 15px" } }, "NinjaOne : " + soSuggest.err),
              !ouvertNa ? null : liste.length === 0
                ? React.createElement('div', { style: { padding: "10px 15px", fontSize: 12.5, color: "#2F855A" } }, "✅ Tous les PC de ce compte sont affectés.")
                : React.createElement('div', { style: { maxHeight: 420, overflowY: "auto" } }, liste.map(p => ligne(p, false))),
              ouvertNa && ignores.length > 0 && React.createElement('div', { style: { borderTop: "1px solid #F0E6C8" } },
                React.createElement('div', { onClick: () => setSoVoirIgnores(!soVoirIgnores), style: { padding: "7px 15px", fontSize: 12, color: "#888", cursor: "pointer" } }, (soVoirIgnores ? "▼ " : "▶ ") + "🚫 " + ignores.length + " PC ignoré" + (ignores.length > 1 ? "s" : "") + " (hors de nos hôtels)"),
                soVoirIgnores && ignores.map(p => ligne(p, true)))
            );
          });
        })(),
        React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, overflow: "hidden" } },
          !isMobile && React.createElement('div', { style: { display: "grid", gridTemplateColumns: GRILLE, gap: 12, padding: "8px 15px", fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: ".03em", background: "#FAFAFC", borderBottom: "1px solid #E8E8F0" } },
            React.createElement('span', null, "Hôtel"), React.createElement('span', null, "Antivirus"), React.createElement('span', null, "SOC"),
            React.createElement('span', null, "Postes et problèmes"), React.createElement('span', { style: { textAlign: "right" } }, "Actions")),
        hotelsTries.map(h => {
          const c = compteDe(h.id);
          const et = etatHotel(c);
          const ouvert = soOpenHotel === h.id;
          const postes = soPostes[h.id];
          const aProbleme = (p) => p.health !== "good" || (p.last_seen_at && new Date(p.last_seen_at).getTime() < seuilMuet);
          const pr = protectionDe(h, c);
          const horsSophos = !c && pr.actuel && pr.actuel !== "sophos";
          const pastille = (txt, bg, col, extra) => React.createElement('span', Object.assign({ style: Object.assign({ background: bg, color: col, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }, (extra && extra.style) || {}) }, extra && extra.props), txt);
          const iconeBtn = (ico, titre, onClick, extra) => React.createElement('button', { onClick, title: titre, "aria-label": titre, disabled: extra && extra.disabled,
            style: Object.assign({ width: 30, height: 28, padding: 0, background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 13, cursor: "pointer" }, (extra && extra.style) || {}) }, ico);
          const ouvrirConfig = () => {
            const rg = (c && c.regles) || {};
            const j = (k) => (Array.isArray(rg[k]) ? rg[k] : []).join(", ");
            setSoModal({ hotelId: h.id, nom: h.name, clientId: c ? c.client_id : "", clientSecret: "", actif: c ? c.actif : true, existe: !!c, err: "",
              copierDe: "", principal: c ? c.principal !== false : true, libelle: (c && c.libelle) || "",
              rGroupes: j("groupes"), rPrefixes: j("prefixes"), rDomaines: j("domaines"), rIps: j("ips"),
              partageOuvert: !!(c && c.tenant_id && soComptes.filter(x => x.tenant_id === c.tenant_id).length > 1) });
          };
          const coulPoint = horsSophos ? "#A0AEC0" : et.c;
          const voirAlertes = (tab) => (e) => { e.stopPropagation(); setSoHotelFiltre(h.id); setSoTab(tab); };
          const cellule = (style, ...kids) => React.createElement('div', { style: Object.assign({ minWidth: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, style || {}) }, ...kids);
          return React.createElement('div', { key: h.id, style: { borderTop: "1px solid #F0F0F5" } },
            React.createElement('div', { style: isMobile
                ? { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", flexWrap: "wrap" }
                : { display: "grid", gridTemplateColumns: GRILLE, gap: 12, alignItems: "center", padding: "9px 15px" } },
              // Hôtel
              React.createElement('div', { onClick: () => { if (!c) return; const v = ouvert ? null : h.id; setSoOpenHotel(v); if (v) loadSoPostes(h.id); }, style: { minWidth: 0, flex: isMobile ? "1 1 100%" : undefined, cursor: c ? "pointer" : "default" } },
                React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#1a1a3e", display: "flex", alignItems: "center", gap: 7 } },
                  React.createElement('span', { title: horsSophos ? "Hors supervision Sophos" : et.l, style: { width: 9, height: 9, borderRadius: "50%", background: coulPoint, flexShrink: 0 } }),
                  React.createElement('span', { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (c ? (ouvert ? "▼ " : "▶ ") : "") + h.name)),
                React.createElement('div', { style: { fontSize: 11, color: horsSophos ? "#718096" : et.c, fontWeight: 600, marginTop: 1, paddingLeft: 16 } },
                  horsSophos ? "Hors supervision Sophos" : et.l,
                  c && c.dernier_controle && React.createElement('span', { style: { color: "#999", fontWeight: 400 } }, " · " + fmtDateHeureFr2(c.dernier_controle)))
              ),
              // Antivirus (logo cliquable vers la console) + bascule programmée
              cellule({ flexWrap: "nowrap" },
                pr.actuel ? logo(AV[pr.actuel], "av", { title: "Antivirus : " + (AV[pr.actuel] || {}).l }) : React.createElement('span', { style: { fontSize: 11, color: "#BBB" } }, "Non renseigné"),
                pr.futur && React.createElement('span', { key: "fl", style: { color: "#999", fontSize: 12 } }, "→"),
                pr.futur && logo(AV[pr.futur], "avf", { gris: true, title: "Bascule vers " + (AV[pr.futur] || {}).l + " le " + dateCourte(pr.bascule) })),
              // SOC
              cellule(null, pr.soc ? logo(SOC[pr.soc], "soc", { title: "Supervisé par " + (SOC[pr.soc] || {}).l }) : React.createElement('span', { style: { color: "#CCC", fontSize: 12 } }, "—")),
              // Postes et problèmes
              cellule({ fontSize: 11 },
                pr.futur && pastille("bascule le " + dateCourte(pr.bascule).slice(0, 5), "#FFF6E5", "#C05621", { style: { fontWeight: 600 } }),
                c && c.actif && c.dernier_statut !== "erreur" && [
                  pastille("💻 " + (c.nb_postes || 0), "#F0F0F8", "#555", { props: { key: "np", title: (c.nb_postes || 0) + " postes" } }),
                  c.tenant_id && soComptes.filter(x => x.tenant_id === c.tenant_id).length > 1 && pastille("🔗", "#FFFBEB", "#8A6D1F", { props: { key: "pa", title: "Compte Sophos partagé avec : " + soComptes.filter(x => x.tenant_id === c.tenant_id && x.hotel_id !== c.hotel_id).map(x => nomHotel(x.hotel_id)).join(", ") + (c.principal ? " (principal)" : "") } }),
                  (c.nb_postes_ko || 0) > 0 && pastille(c.nb_postes_ko + " mauvais", "#FDECEC", "#C53030", { style: { fontWeight: 600 }, props: { key: "ko" } }),
                  (c.nb_postes_suspects || 0) > 0 && pastille(c.nb_postes_suspects + " suspects", "#FFF6E5", "#B7791F", { style: { fontWeight: 600 }, props: { key: "su" } }),
                  (c.nb_postes_muets || 0) > 0 && pastille(c.nb_postes_muets + " muets", "#FFF6E5", "#B7791F", { style: { fontWeight: 600 }, props: { key: "mu" } }),
                  nbAlertesH(c) > 0 && pastille("🚨 " + nbAlertesH(c) + " alerte" + (nbAlertesH(c) > 1 ? "s" : ""), nbHautesH(c) > 0 ? "#FDECEC" : "#FFF6E5", nbHautesH(c) > 0 ? "#C53030" : "#B7791F",
                    { style: { fontWeight: 600, cursor: "pointer", textDecoration: "underline dotted" }, props: { key: "al", onClick: voirAlertes("alertes"), title: "Voir les alertes de cet hôtel" } }),
                  nbLicH(c) > 0 && pastille("📜 " + nbLicH(c) + " licence" + (nbLicH(c) > 1 ? "s" : ""), "#FFFBEB", "#8A6D1F",
                    { style: { cursor: "pointer", textDecoration: "underline dotted" }, props: { key: "li", onClick: voirAlertes("licences"), title: "Voir les alertes de licence" } })
                ].filter(Boolean),
                c && c.dernier_statut === "erreur" && pastille("Erreur de connexion", "#FDECEC", "#C53030", { style: { fontWeight: 600 } })),
              // Actions
              React.createElement('div', { style: { display: "flex", gap: 5, justifyContent: "flex-end", marginLeft: isMobile ? "auto" : 0 } },
                iconeBtn("🛡", "Protection : antivirus, SOC, bascule", () => setSoProtModal({ hotelId: h.id, nom: h.name, antivirus: h.antivirus || (c ? "sophos" : ""), soc: h.soc || "",
                  antivirus_futur: h.antivirus_futur || "", antivirus_bascule: h.antivirus_bascule || "", err: "" })),
                c && iconeBtn(soBusy === h.id ? "…" : "🔄", "Synchroniser Sophos", () => soSynchroniser(h.id), { disabled: !!soBusy }),
                iconeBtn(c ? "⚙️" : "+", c ? "Configurer le compte Sophos" : "Configurer Sophos", ouvrirConfig,
                  c || horsSophos ? null : { style: { border: "1px solid " + G, color: G2, fontWeight: 700 } })
              )
            ),
            c && c.dernier_statut === "erreur" && c.derniere_erreur && React.createElement('div', { style: { margin: "0 15px 11px", fontSize: 12, color: "#C53030", background: "#FDECEC", borderRadius: 7, padding: "7px 10px" } }, "⚠️ " + c.derniere_erreur),
            ouvert && React.createElement('div', { style: { borderTop: "1px solid #F0F0F8", padding: "12px 15px", background: "#FAFAFC" } },
              !postes ? React.createElement('div', { style: { fontSize: 12, color: "#999" } }, "Chargement des postes…")
              : (() => {
                  // ===== Classement des postes par diagnostic (Sophos x NinjaOne) =====
                  const nj = soNinja[h.id];
                  const njPostes = (nj && nj.postes) || {};
                  const JOUR = 86400000;
                  const ilYa = (iso) => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / JOUR)) : null;
                  const depuisTxt = (iso) => { const j = ilYa(iso); return j === null ? "—" : j === 0 ? "aujourd'hui" : j === 1 ? "hier" : "il y a " + j + " j"; };
                  const CATS = [
                    { k: "menace",  ico: "🔴", t: "Menace ou protection dégradée", aide: "Sophos signale une menace, un service arrêté ou la protection anti-altération désactivée sur un PC actif. À traiter en priorité.", c: "#C53030", bg: "#FDECEC", bd: "#F5B5B5", ouvert: true },
                    { k: "casse",   ico: "🟠", t: "Agent Sophos à réparer", aide: "Le PC est actif (vu récemment par NinjaOne) mais Sophos ne remonte plus : il n'est probablement plus protégé. Réinstaller ou réparer l'agent Sophos.", c: "#C05621", bg: "#FFF3E8", bd: "#F6C9A0", ouvert: true },
                    { k: "sansSophos", ico: "🟣", t: "Sophos manquant", aide: "Présent dans NinjaOne (organisation de l'hôtel, vu ces 30 derniers jours) mais absent de Sophos : ce PC n'est probablement pas protégé. Installer l'agent Sophos.", c: "#6B46C1", bg: "#F3EEFC", bd: "#D6C8F5", ouvert: true },
                    { k: "sansNinja", ico: "🟡", t: "NinjaOne manquant", aide: "Actif dans Sophos mais introuvable dans NinjaOne : ce PC n'est pas supervisé. Installer l'agent NinjaOne, ou vérifier que le nom du PC est le même dans les deux outils.", c: "#B7791F", bg: "#FFFBEB", bd: "#F0D98A", ouvert: true },
                    { k: "analyse", ico: "⏳", t: "Analyse NinjaOne en cours", aide: "Recherche des PC dans NinjaOne…", c: "#718096", bg: "#F4F4F8", bd: "#E2E2EA", ouvert: true },
                    { k: "eteint",  ico: "🔵", t: "Éteints ou absents", aide: "Hors ligne dans Sophos ET dans NinjaOne depuis plus de 7 jours : PC éteint, rangé, en panne ou retiré. À vérifier sur place.", c: "#2B6CB0", bg: "#EBF4FF", bd: "#BEE3F8", ouvert: false },
                    { k: "fantome", ico: "👻", t: "Probablement retirés", aide: "Muets dans Sophos et introuvables dans NinjaOne : anciens PC, renommés ou réinstallés. À supprimer de Sophos Central pour garder un inventaire propre.", c: "#6B6B80", bg: "#F4F4F8", bd: "#E2E2EA", ouvert: false },
                    { k: "ok",      ico: "✅", t: "Sans problème", aide: "Protégés et à jour dans Sophos.", c: "#2F855A", bg: "#E9F6EE", bd: "#B7E0C6", ouvert: false },
                  ];
                  const classer = (p) => {
                    const n = njPostes[String(p.hostname || "").toUpperCase()];
                    const muet = !!(p.last_seen_at && new Date(p.last_seen_at).getTime() < seuilMuet);
                    const degrade = p.health === "bad" || p.health === "suspicious" || p.tamper_protection === false;
                    if (!muet) return degrade ? "menace" : (n && !n.erreur && n.trouve === false ? "sansNinja" : "ok");
                    if (!n || n.erreur) return (nj && nj.loading) ? "analyse" : "fantome";
                    if (!n.trouve) return "fantome";
                    const jNinja = ilYa(n.dernier_contact);
                    if (n.en_ligne || (jNinja !== null && jNinja <= 7)) return "casse";
                    return "eteint";
                  };
                  const groupes = {};
                  postes.forEach(p => { const k = classer(p); (groupes[k] = groupes[k] || []).push(p); });
                  // PC présents dans NinjaOne (organisation de l'hôtel) mais absents de Sophos
                  const no = soNinjaOrg[h.id];
                  const nomCourtPc = (v) => String(v || "").trim().split(".")[0].toUpperCase();
                  const nomsSophos = new Set(postes.map(p => nomCourtPc(p.hostname)));
                  const seuilNinja = Date.now() - 30 * JOUR;
                  const njOrgDevices = (no && no.trouve && no.devices) || [];
                  const absentsSophos = njOrgDevices.filter(d => !nomsSophos.has(nomCourtPc(d.hostname)));
                  const absentsRecents = absentsSophos.filter(d => d.en_ligne || (d.dernier_contact && new Date(d.dernier_contact).getTime() >= seuilNinja));
                  const absentsAnciens = absentsSophos.length - absentsRecents.length;
                  if (absentsRecents.length) groupes.sansSophos = absentsRecents;
                  // Tri interne : plus récemment vus par NinjaOne en premier, puis par nom
                  Object.values(groupes).forEach(arr => arr.sort((a, b) => String(a.hostname).localeCompare(String(b.hostname))));
                  const secKey = (k) => h.id + ":" + k;
                  const estOuverte = (cat) => soSecOuvertes[secKey(cat.k)] !== undefined ? soSecOuvertes[secKey(cat.k)] : cat.ouvert;
                  const basculer = (cat) => setSoSecOuvertes(prev => ({ ...prev, [secKey(cat.k)]: !estOuverte(cat) }));
                  const pastille = (txt, c, bg, extra) => React.createElement('span', { style: Object.assign({ fontSize: 10.5, fontWeight: 700, color: c, background: bg, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }, extra || {}) }, txt);
                  const cell = (w, contenu, extra) => React.createElement('div', { style: Object.assign({ flex: isMobile ? (w === "200px" ? "1 1 100%" : "0 1 auto") : (w.indexOf(" ") >= 0 ? w : "0 0 " + w), maxWidth: "100%", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, extra || {}) }, contenu);

                  // ----- Ligne d'un poste (format tableau) -----
                  const partageH = !!(c && c.tenant_id && soComptes.filter(x => x.tenant_id === c.tenant_id).length > 1);
                  const lignePoste = (p, cat) => {
                    const n = njPostes[String(p.hostname || "").toUpperCase()];
                    const hm = healthMeta(p.health);
                    const muet = !!(p.last_seen_at && new Date(p.last_seen_at).getTime() < seuilMuet);
                    const detailVisible = cat.k === "menace" || cat.k === "casse";
                    const sophosTxt = muet ? "muet " + depuisTxt(p.last_seen_at).replace("il y a ", "depuis ") : "vu " + depuisTxt(p.last_seen_at);
                    let njCell;
                    if (!n) njCell = React.createElement('span', { style: { color: "#AAA" } }, nj && nj.loading ? "…" : "—");
                    else if (n.erreur) njCell = React.createElement('span', { style: { color: "#B7791F" } }, "erreur");
                    else if (!n.trouve) njCell = React.createElement('span', { style: { color: "#999" } }, "introuvable");
                    else njCell = React.createElement('span', null,
                      React.createElement('span', { style: { color: n.en_ligne ? "#2F855A" : "#A0AEC0", marginRight: 5 } }, "●"),
                      n.en_ligne ? React.createElement('b', { style: { color: "#2F855A" } }, "En ligne") : React.createElement('span', null, "Vu ", React.createElement('b', null, depuisTxt(n.dernier_contact))));
                    const problemes = [];
                    if (p.threats_status && p.threats_status !== "good") problemes.push("menaces : " + p.threats_status);
                    if (p.services_status && p.services_status !== "good") problemes.push("services : " + p.services_status);
                    if (p.tamper_protection === false) problemes.push("anti-altération désactivée");
                    return React.createElement('div', { key: p.hostname, style: { borderTop: "1px solid #F0F0F5", padding: "7px 12px", background: "white" } },
                      React.createElement('div', { style: { display: "flex", alignItems: "center", gap: isMobile ? "4px 10px" : 10, fontSize: 12.5, flexWrap: isMobile ? "wrap" : "nowrap" } },
                        cell("200px", React.createElement('label', { style: { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", maxWidth: "100%" }, title: "Sélectionner (anti-altération ou analyse)" },
                          React.createElement('input', { type: "checkbox", checked: !!((soTpSel[h.id] || {})[p.sophos_id]), onChange: e => soTpBasculer(h.id, [p], e.target.checked), style: { margin: 0, flexShrink: 0 } }),
                          React.createElement('span', { style: { fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis" }, title: p.hostname }, (p.type === "server" ? "🖥️ " : "💻 ") + (p.hostname || "?")),
                          p.tamper_protection === false && React.createElement('span', { title: "Protection anti-altération désactivée", style: { fontSize: 11 } }, "🔓"))),
                        cell("78px", pastille(hm.l, hm.c, hm.bg)),
                        cell("150px", React.createElement('span', { style: { color: muet ? "#C05621" : "#666", fontWeight: muet ? 600 : 400 }, title: p.last_seen_at ? "Dernière remontée Sophos : " + fmtDateHeureFr2(p.last_seen_at) : "" }, sophosTxt.charAt(0).toUpperCase() + sophosTxt.slice(1))),
                        cell("150px", njCell),
                        (() => { const ips = (p.ips ? String(p.ips).split(/[,\s]+/).filter(Boolean) : []).concat((n && n.ip_locales) || []); const u = [...new Set(ips)]; return cell("120px", u.length ? React.createElement('span', { style: { fontFamily: "monospace", fontSize: 12, color: "#2B6CB0" }, title: u.join(", ") }, u[0] + (u.length > 1 ? " +" + (u.length - 1) : "")) : React.createElement('span', { style: { color: "#BBB" } }, "—")); })(),
                        cell("1 1 160px", (n && n.utilisateur) || p.dernier_utilisateur ? "👤 " + ((n && n.utilisateur) || p.dernier_utilisateur) : React.createElement('span', { style: { color: "#BBB" } }, problemes.join(" · ")), { color: "#555", fontSize: 12 }),
                        React.createElement('div', { style: { marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: isMobile ? 1 : 0, flexWrap: isMobile ? "wrap" : "nowrap" } },
                          n && n.doublons && pastille("doublon ×" + n.doublons, "#B7791F", "#FFF6E5"),
                          React.createElement('button', { onClick: () => soScanner(h.id, [p]), disabled: muet || soTpBusy === h.id + ":scan:" + p.sophos_id,
                            title: muet ? "PC muet dans Sophos : la demande d'analyse ne lui parviendrait pas" : "Lancer une analyse Sophos complète sur ce PC",
                            style: { border: "1px solid #E8E8F0", background: "white", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: muet ? "#CCC" : "#2B6CB0", cursor: muet ? "default" : "pointer" } }, soTpBusy === h.id + ":scan:" + p.sophos_id ? "…" : "🔍"),
                          (() => { const enLigne = !!(n && n.trouve && n.en_ligne); const occ = soTpBusy === h.id + ":dl:" + p.hostname;
                            return React.createElement('button', { onClick: () => soViderTelechargements(h.id, [p.hostname], true), disabled: !enLigne || occ,
                              title: enLigne ? "Vider entièrement le dossier Téléchargements de tous les utilisateurs de ce PC (NinjaOne)" : "PC hors ligne ou introuvable dans NinjaOne : nettoyage impossible",
                              style: { border: "1px solid #E8E8F0", background: "white", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: enLigne ? "#6B46C1" : "#CCC", cursor: enLigne ? "pointer" : "default", opacity: enLigne ? 1 : .5 } }, occ ? "…" : "🧹"); })(),
                          React.createElement('button', { onClick: () => soTamperMdp(h.id, p), disabled: soTpBusy === h.id + ":" + p.sophos_id, title: "Afficher le mot de passe anti-altération (pour désinstaller Sophos sur place ou via le script NinjaOne, utile si l'agent ne communique plus avec Sophos Central)",
                            style: { border: "1px solid #E8E8F0", background: "white", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: "#777", cursor: "pointer" } }, soTpBusy === h.id + ":" + p.sophos_id ? "…" : "🔑"),
                          caseSuppr(p),
                          partageH && React.createElement('select', { value: "", title: "Ce PC n'est pas de cet hôtel ? Déplacez-le (mémorisé)", onChange: e => {
                              const v = e.target.value; if (!v) return;
                              if (v === "__auto") soAffecter(c.tenant_id, [{ sophosId: p.sophos_id, hostname: p.hostname, hotelId: null }], p.hostname + " : retour aux règles automatiques");
                              else if (v === "__ignore") soAffecter(c.tenant_id, [{ sophosId: p.sophos_id, hostname: p.hostname, ignorer: true }], p.hostname + " ignoré");
                              else soAffecter(c.tenant_id, [{ sophosId: p.sophos_id, hostname: p.hostname, hotelId: v }], p.hostname + " → " + nomHotel(v));
                            }, style: { padding: "2px 4px", border: "1px solid #E2E2EA", borderRadius: 6, fontSize: 11, color: "#777", maxWidth: 110 } },
                              React.createElement('option', { value: "" }, "↔ Déplacer"),
                              soComptes.filter(x => x.tenant_id === c.tenant_id && x.hotel_id !== h.id).map(x => React.createElement('option', { key: x.hotel_id, value: x.hotel_id }, nomHotel(x.hotel_id))),
                              p.affectation === "manuel" && React.createElement('option', { value: "__auto" }, "↺ Règles automatiques"),
                              React.createElement('option', { value: "__ignore" }, "🚫 Ignorer")),
                          n && n.lien && React.createElement('a', { href: n.lien, target: "_blank", rel: "noopener noreferrer", title: "Ouvrir dans NinjaOne", style: { color: G2, fontWeight: 600, textDecoration: "none", fontSize: 12 } }, "NinjaOne ↗")
                        )
                      ),
                      detailVisible && (problemes.length > 0 || (n && n.trouve)) && React.createElement('div', { style: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "#777", marginTop: 4, paddingLeft: 22 } },
                        problemes.length > 0 && React.createElement('span', { style: { color: "#C53030", fontWeight: 600 } }, "⚠ " + problemes.join(" · ")),
                        n && n.dernier_contact && React.createElement('span', null, "Dernier contact NinjaOne : " + fmtDateHeureFr2(n.dernier_contact)),
                        n && n.dernier_demarrage && React.createElement('span', null, "Démarré le " + fmtDateHeureFr2(n.dernier_demarrage)),
                        n && n.ip_publique && React.createElement('span', null, "IP publique " + n.ip_publique),
                        n && n.modele && React.createElement('span', null, n.modele),
                        p.os && React.createElement('span', null, p.os)
                      )
                    );
                  };

                  const ligneNinja = (d) => React.createElement('div', { key: "nj-" + d.hostname, style: { borderTop: "1px solid #F0F0F5", padding: "7px 12px", background: "white" } },
                    React.createElement('div', { style: { display: "flex", alignItems: "center", gap: isMobile ? "4px 10px" : 10, fontSize: 12.5, flexWrap: isMobile ? "wrap" : "nowrap" } },
                      cell("200px", React.createElement('span', { style: { fontWeight: 600, color: "#1a1a3e" }, title: d.nom }, (d.serveur ? "🖥️ " : "💻 ") + d.hostname)),
                      cell("78px", pastille(d.serveur ? "Serveur" : "Poste", "#6B46C1", "#F3EEFC")),
                      cell("150px", React.createElement('b', { style: { color: "#C53030" } }, "Absent de Sophos")),
                      cell("150px", React.createElement('span', null,
                        React.createElement('span', { style: { color: d.en_ligne ? "#2F855A" : "#A0AEC0", marginRight: 5 } }, "●"),
                        d.en_ligne ? React.createElement('b', { style: { color: "#2F855A" } }, "En ligne") : React.createElement('span', null, "Vu ", React.createElement('b', null, depuisTxt(d.dernier_contact))))),
                      cell("120px", (d.ips || []).length ? React.createElement('span', { style: { fontFamily: "monospace", fontSize: 12, color: "#2B6CB0" }, title: d.ips.join(", ") }, d.ips[0] + (d.ips.length > 1 ? " +" + (d.ips.length - 1) : "")) : React.createElement('span', { style: { color: "#BBB" } }, "—")),
                      cell("1 1 160px", [d.nom !== d.hostname ? d.nom : "", d.utilisateur ? "👤 " + d.utilisateur : ""].filter(Boolean).join(" · "), { color: "#555", fontSize: 12 }),
                      React.createElement('div', { style: { marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: isMobile ? 1 : 0, flexWrap: isMobile ? "wrap" : "nowrap" } },
                        d.lien && React.createElement('a', { href: d.lien, target: "_blank", rel: "noopener noreferrer", title: "Ouvrir dans NinjaOne", style: { color: G2, fontWeight: 600, textDecoration: "none", fontSize: 12 } }, "NinjaOne ↗"))
                    )
                  );

                  const nbPb = postes.length - ((groupes.ok || []).length) + ((groupes.sansSophos || []).length);
                  return React.createElement('div', null,
                    // Synthèse cliquable
                    React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 } },
                      React.createElement('span', { style: { fontSize: 12.5, color: "#555", marginRight: 4 } }, React.createElement('b', null, postes.length + " postes"), nbPb ? " — " + nbPb + " à traiter" : " — tout est en ordre ✅"),
                      CATS.filter(cat => (groupes[cat.k] || []).length).map(cat =>
                        React.createElement('button', { key: cat.k, onClick: () => { setSoSecOuvertes(prev => ({ ...prev, [secKey(cat.k)]: true })); const el = document.getElementById("sec-" + h.id + "-" + cat.k); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); },
                          style: { border: "1px solid " + cat.bd, background: cat.bg, color: cat.c, borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" } },
                          cat.ico + " " + (groupes[cat.k] || []).length + " " + cat.t.toLowerCase()))
                    ),
                    (() => {
                      const sel = soTpSel[h.id] || {};
                      const nb = Object.keys(sel).length;
                      const msg = soTpMsg[h.id];
                      if (!nb && !msg) return null;
                      const busy = soTpBusy === h.id;
                      const btn = (txt, action, c) => React.createElement('button', { onClick: () => soTamper(h.id, action), disabled: busy || !nb,
                        style: { border: "none", background: c, color: "white", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: busy || !nb ? "default" : "pointer", opacity: busy || !nb ? .6 : 1 } }, txt);
                      return React.createElement('div', { style: { position: "sticky", top: 0, zIndex: 5, background: "#1a1a3e", color: "white", borderRadius: 9, padding: "9px 12px", marginBottom: 12 } },
                        nb > 0 && React.createElement('div', { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
                          React.createElement('b', { style: { fontSize: 12.5 } }, "🛡️ " + nb + " PC sélectionné" + (nb > 1 ? "s" : "")),
                          React.createElement('span', { style: { fontSize: 11.5, opacity: .75, flex: "1 1 200px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: Object.values(sel).join(", ") }, Object.values(sel).join(", ")),
                          btn(busy ? "Envoi…" : "🔓 Désactiver l'anti-altération", "desactiver", "#C05621"),
                          btn("🔒 Réactiver", "activer", "#2F855A"),
                          React.createElement('button', { onClick: () => soScanner(h.id), disabled: busy || !nb,
                            style: { border: "none", background: "#2B6CB0", color: "white", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: busy || !nb ? "default" : "pointer", opacity: busy || !nb ? .6 : 1 } }, "🔍 Lancer une analyse"),
                          React.createElement('button', { onClick: () => soViderTelechargements(h.id, Object.values(sel)), disabled: busy || !nb,
                            style: { border: "none", background: "#6B46C1", color: "white", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: busy || !nb ? "default" : "pointer", opacity: busy || !nb ? .6 : 1 } }, "🧹 Vider Téléchargements"),
                          c && c.tenant_id && React.createElement('button', { onClick: () => soSupprimerSophos(c.tenant_id, Object.entries(sel).map(([sophos_id, hostname]) => ({ sophos_id, hostname })), h.id), disabled: busy || !nb || soTpBusy === h.id + ":suppr",
                            title: "Supprimer les PC sélectionnés de Sophos Central (PC muets depuis plus de 7 jours uniquement)",
                            style: { border: "none", background: "#C53030", color: "white", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: busy || !nb ? "default" : "pointer", opacity: busy || !nb ? .6 : 1 } }, soTpBusy === h.id + ":suppr" ? "Suppression…" : "🗑 Supprimer de Sophos"),
                          React.createElement('button', { onClick: () => setSoTpSel(prev => ({ ...prev, [h.id]: {} })), style: { border: "1px solid rgba(255,255,255,.35)", background: "transparent", color: "white", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer" } }, "Désélectionner")),
                        nb > 0 && React.createElement('div', { style: { fontSize: 11, opacity: .7, marginTop: 5 } }, "Sophos Central transmet la consigne au PC à son prochain contact. Un agent qui ne communique plus (« à réparer ») ne la recevra pas : utilisez alors 🔑 pour obtenir son mot de passe."),
                        msg && React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "flex-start", marginTop: nb ? 8 : 0, fontSize: 12, whiteSpace: "pre-wrap", color: msg.ok ? "#9AE6B4" : "#FEB2B2" } },
                          React.createElement('span', { style: { flex: 1 } }, msg.txt),
                          React.createElement('button', { onClick: () => setSoTpMsg(prev => ({ ...prev, [h.id]: null })), style: { border: "none", background: "transparent", color: "white", cursor: "pointer", fontSize: 14, lineHeight: 1 } }, "×"))
                      );
                    })(),
                    nj && nj.err && React.createElement('div', { style: { fontSize: 11.5, color: "#B7791F", background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 7, padding: "6px 10px", marginBottom: 10 } }, "NinjaOne indisponible : " + nj.err),
                    no && (() => {
                      const box = (txt, warn) => React.createElement('div', { style: { fontSize: 11.5, color: warn ? "#B7791F" : "#777", background: warn ? "#FFFBEB" : "#F7F7FB", border: "1px solid " + (warn ? "#F0D98A" : "#E8E8F0"), borderRadius: 7, padding: "6px 10px", marginBottom: 10 } }, txt);
                      if (no.loading) return box("🔎 Comparaison avec l'inventaire NinjaOne en cours…");
                      if (no.err) return box("Inventaire NinjaOne indisponible : " + no.err, true);
                      if (no.trouve === false) return box("NinjaOne : aucune organisation nommée « " + (no.recherche || h.name) + " ». Renseignez le champ « Nom NinjaOne » de la fiche établissement" + ((no.suggestions || []).length ? " (organisations proches : " + no.suggestions.join(", ") + ")" : "") + " pour repérer les PC sans Sophos.", true);
                      return box("Comparé à NinjaOne « " + no.organisation + " » : " + njOrgDevices.length + " postes/serveurs, " + absentsRecents.length + " sans Sophos" + (absentsAnciens ? " (+ " + absentsAnciens + " non vus depuis plus de 30 jours, ignorés)" : "") + ", " + ((groupes.sansNinja || []).length) + " sans NinjaOne.");
                    })(),
                    // Sections
                    CATS.filter(cat => (groupes[cat.k] || []).length).map(cat => {
                      const liste = groupes[cat.k];
                      const open = estOuverte(cat);
                      return React.createElement('div', { key: cat.k, id: "sec-" + h.id + "-" + cat.k, style: { border: "1px solid " + cat.bd, borderLeft: "5px solid " + cat.c, borderRadius: 9, overflow: "hidden", marginBottom: 10, background: "white" } },
                        React.createElement('div', { onClick: () => basculer(cat), style: { display: "flex", alignItems: "center", gap: isMobile ? "6px 8px" : 10, flexWrap: isMobile ? "wrap" : "nowrap", padding: "9px 12px", background: cat.bg, cursor: "pointer", userSelect: "none" } },
                          React.createElement('span', { style: { fontSize: 11, color: cat.c, width: 10 } }, open ? "▼" : "▶"),
                          React.createElement('span', { style: { fontSize: 13.5, fontWeight: 700, color: cat.c, flex: isMobile ? "1 1 0" : undefined, minWidth: 0 } }, cat.ico + " " + cat.t),
                          React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: "white", background: cat.c, borderRadius: 20, padding: "1px 9px" } }, liste.length),
                          React.createElement('span', { style: { fontSize: 11.5, color: "#666", flex: isMobile ? "1 1 100%" : 1, order: isMobile ? 9 : 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: open ? "normal" : "nowrap", display: isMobile && !open ? "none" : undefined } }, cat.aide),
                          cat.k !== "sansSophos" && (() => {
                            const sel = soTpSel[h.id] || {};
                            const tous = liste.length > 0 && liste.every(p => sel[p.sophos_id]);
                            return React.createElement('button', { onClick: e => { e.stopPropagation(); soTpBasculer(h.id, liste, !tous); },
                              title: "Sélectionner tous les PC de cette section (protection anti-altération)",
                              style: { flexShrink: 0, border: "1px solid " + cat.bd, background: "white", color: cat.c, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" } }, tous ? "☐ Aucun" : "☑ Tous");
                          })()
                        ),
                        open && React.createElement('div', null,
                          // En-tête de colonnes
                          !isMobile && React.createElement('div', { style: { display: "flex", gap: 10, padding: "5px 12px", fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: ".03em", background: "#FAFAFC", borderTop: "1px solid #F0F0F5" } },
                            cell("200px", "Poste"), cell("78px", "Santé"), cell("150px", "Sophos"), cell("150px", "NinjaOne"), cell("120px", "Adresse IP"), cell("1 1 160px", "Utilisateur / détail")),
                          liste.map(p => cat.k === "sansSophos" ? ligneNinja(p) : lignePoste(p, cat))
                        )
                      );
                    })
                  );
                })()
            )
          );
        }))
      ),

      // ----- Fenêtre de configuration d'un compte Sophos -----
      soModal && React.createElement('div', { onClick: e => { if (e.target === e.currentTarget && !soModal.busy) setSoModal(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 480, maxWidth: "100%" } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 3 } }, "Compte Sophos Central"),
          React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14 } }, soModal.nom),
          React.createElement('div', { style: { fontSize: 11.5, color: "#2B6CB0", background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 7, padding: "8px 10px", marginBottom: 14, lineHeight: 1.5 } },
            "Dans le Sophos Central de l'hôtel : Paramètres généraux → Gestion des identifiants API → Ajouter, rôle « Service Principal ReadOnly ». Copiez l'ID client et le secret ici."),
          // Compte partagé : reprendre les identifiants d'un hôtel déjà configuré
          !soModal.existe && soComptes.length > 0 && React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('label', { style: { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Même compte Sophos qu'un autre hôtel ?"),
            React.createElement('select', { value: soModal.copierDe || "", onChange: e => setSoModal({ ...soModal, copierDe: e.target.value, partageOuvert: !!e.target.value || soModal.partageOuvert, principal: e.target.value ? false : soModal.principal, err: "" }), style: inputS },
              React.createElement('option', { value: "" }, "Non — nouveaux identifiants"),
              soComptes.map(x => React.createElement('option', { key: x.hotel_id, value: x.hotel_id }, "Oui — comme " + nomHotel(x.hotel_id))))
          ),
          !soModal.copierDe && React.createElement('label', { style: { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Nom du compte Sophos (facultatif)"),
          !soModal.copierDe && React.createElement('input', { value: soModal.libelle || "", onChange: e => setSoModal({ ...soModal, libelle: e.target.value }), placeholder: "ex. Sophos Groupe Holiday Inn — pour savoir dans quelle console aller", style: { ...inputS, marginBottom: 12 } }),
          !soModal.copierDe && React.createElement('label', { style: { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", marginBottom: 4 } }, "ID client *"),
          !soModal.copierDe && React.createElement('input', { value: soModal.clientId, onChange: e => setSoModal({ ...soModal, clientId: e.target.value, err: "" }), placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", style: { ...inputS, marginBottom: 12, fontFamily: "monospace" } }),
          !soModal.copierDe && React.createElement('label', { style: { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Secret client " + (soModal.existe ? "(laisser vide pour conserver l'actuel)" : "*")),
          !soModal.copierDe && React.createElement('input', { type: "password", autoComplete: "new-password", value: soModal.clientSecret, onChange: e => setSoModal({ ...soModal, clientSecret: e.target.value, err: "" }), placeholder: soModal.existe ? "•••••••• (inchangé)" : "Secret client", style: { ...inputS, marginBottom: 12 } }),
          React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#444", cursor: "pointer", marginBottom: 12 } },
            React.createElement('input', { type: "checkbox", checked: soModal.actif !== false, onChange: e => setSoModal({ ...soModal, actif: e.target.checked }) }), "Supervision active"),
          // Règles de reconnaissance des PC (compte Sophos partagé par plusieurs hôtels)
          React.createElement('div', { style: { border: "1px solid #E8E8F0", borderRadius: 8, marginBottom: 12, overflow: "hidden" } },
            React.createElement('div', { onClick: () => setSoModal({ ...soModal, partageOuvert: !soModal.partageOuvert }), style: { padding: "8px 10px", background: "#FAFAFC", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#1a1a3e" } },
              (soModal.partageOuvert ? "▼ " : "▶ ") + "🔗 Compte Sophos partagé avec d'autres hôtels"),
            soModal.partageOuvert && React.createElement('div', { style: { padding: "10px 10px 4px" } },
              React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 9, lineHeight: 1.5 } }, "Règles pour reconnaître les PC de cet hôtel (séparer par des virgules). La 1re règle qui correspond l'emporte ; les PC reconnus par aucun hôtel apparaissent dans « PC non affectés »."),
              [["rPrefixes", "Début du nom du PC", "ex. HEDIJON, HEDTDIJON"], ["rDomaines", "Domaine de l'utilisateur", "ex. DIJON (pour DIJON\\reception)"], ["rIps", "Début de l'adresse IP", "ex. 10.47.150."], ["rGroupes", "Groupe Sophos Central", "ex. Holiday Inn Dijon"]].map(([k, lbl, ph]) =>
                React.createElement('div', { key: k, style: { marginBottom: 8 } },
                  React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 3 } }, lbl),
                  React.createElement('input', { value: soModal[k] || "", onChange: e => setSoModal({ ...soModal, [k]: e.target.value }), placeholder: ph, style: { ...inputS, padding: "6px 9px", fontSize: 12.5 } }))),
              React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#444", cursor: "pointer", margin: "4px 0 8px" } },
                React.createElement('input', { type: "checkbox", checked: !!soModal.principal, onChange: e => setSoModal({ ...soModal, principal: e.target.checked }) }),
                "Hôtel principal du compte (reçoit les alertes générales : licences, PC non affectés…)")
            )
          ),
          React.createElement('div', { style: { fontSize: 11, color: "#999", marginBottom: 12, lineHeight: 1.5 } }, "🔒 Le secret est chiffré par le Worker et n'est jamais réaffiché. Les identifiants sont testés à l'enregistrement."),
          soModal.err && React.createElement('div', { style: { fontSize: 12.5, color: "#C53030", background: "#FDECEC", borderRadius: 7, padding: "8px 10px", marginBottom: 12 } }, soModal.err),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" } },
            soModal.existe && React.createElement('button', { onClick: () => soSupprimerCompte(soModal.hotelId, soModal.nom), disabled: soModal.busy, style: { marginRight: "auto", padding: "8px 13px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🗑 Retirer"),
            React.createElement('button', { onClick: () => setSoModal(null), disabled: soModal.busy, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: soEnregistrerCompte, disabled: soModal.busy, style: { padding: "8px 16px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: soModal.busy ? 0.6 : 1 } }, soModal.busy ? "Test en cours…" : "Tester et enregistrer")
          )
        )
      ),

      // ----- Fenêtre « Protection » : antivirus, SOC externe, bascule programmée -----
      soProtModal && React.createElement('div', { onClick: e => { if (e.target === e.currentTarget && !soProtModal.busy) setSoProtModal(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 440, maxWidth: "100%" } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 3 } }, "🛡 Protection des postes"),
          React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14 } }, soProtModal.nom),
          (() => {
            const lbl = (t) => React.createElement('label', { style: { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", marginBottom: 4 } }, t);
            const sel = (k, opts) => React.createElement('select', { value: soProtModal[k] || "", onChange: e => setSoProtModal({ ...soProtModal, [k]: e.target.value, err: "" }), style: { ...inputS, marginBottom: 12 } },
              opts.map(([v, t]) => React.createElement('option', { key: v, value: v }, t)));
            const avOpts = [["", "— Non renseigné —"], ...Object.keys(AV).map(k => [k, AV[k].l])];
            return React.createElement(React.Fragment, null,
              lbl("Antivirus actuel"), sel("antivirus", avOpts),
              lbl("SOC externe"), sel("soc", [["", "Aucun"], ...Object.keys(SOC).map(k => [k, SOC[k].l])]),
              React.createElement('div', { style: { border: "1px solid #F6E0B5", background: "#FFFBF2", borderRadius: 8, padding: "10px 10px 2px", marginBottom: 12 } },
                React.createElement('div', { style: { fontSize: 12, fontWeight: 600, color: "#8A6D1F", marginBottom: 8 } }, "Changement d'antivirus programmé (facultatif)"),
                lbl("Nouvel antivirus"), sel("antivirus_futur", [["", "— Aucun changement —"], ...Object.keys(AV).filter(k => k !== "autre").map(k => [k, AV[k].l])]),
                lbl("Date de bascule"),
                React.createElement('input', { type: "date", value: soProtModal.antivirus_bascule || "", onChange: e => setSoProtModal({ ...soProtModal, antivirus_bascule: e.target.value, err: "" }), style: { ...inputS, marginBottom: 6 } }),
                React.createElement('div', { style: { fontSize: 11, color: "#8A6D1F", marginBottom: 8, lineHeight: 1.5 } }, "Un rappel est envoyé à team@dsihotel.fr la veille et le jour même (fiche Infrastructure de l'hôtel). Le logo change automatiquement à cette date."))
            );
          })(),
          soProtModal.err && React.createElement('div', { style: { fontSize: 12.5, color: "#C53030", background: "#FDECEC", borderRadius: 7, padding: "8px 10px", marginBottom: 12 } }, soProtModal.err),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            React.createElement('button', { onClick: () => setSoProtModal(null), disabled: soProtModal.busy, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: soEnregistrerProtection, disabled: soProtModal.busy, style: { padding: "8px 16px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: soProtModal.busy ? 0.6 : 1 } }, soProtModal.busy ? "Enregistrement…" : "Enregistrer")
          )
        )
      )
    );
  return content;
}
