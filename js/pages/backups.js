// ===== Page « backups » — condition dans App : page === "backups" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_backups({...}) de app.js.
function Page_backups(ctx) {
  let content = ctx.content;
  const {
    BK_FILTRES, BK_FREQS, BK_MARGE_H, BK_SEUIL_JOURS, bkAlerte, bkAncienChecks, bkChecks, bkCmpOpen,
    bkComparaison, bkEnregLicence, bkFetchedAt, bkFiltreSt, bkFreq, bkGroupMap, bkGroupes, bkJoursRestants,
    bkLibFreq, bkLicEdit, bkLigneLicence, bkLoading, bkMapBusy, bkMetaCheck, bkMuetsNonJustifies, bkNote,
    bkOldOpen, bkOpenGroups, bkRapport, bkRattacherGroupe, bkRenderFrise, bkRenderHistVeeam, bkRenderRapport,
    bkStats, bkStatusMeta, bkSuggererHotel, bkToggleHistVeeam, bkVeeamHist, bkVue, choisirBkVue,
    definirFrequenceBackup, fmtDateHeureFr2, hotels, isMobile, lancerAlertesBackup, loadBackups,
    renderBackupNote, setBkAlerte, setBkCmpOpen, setBkFiltreSt, setBkLicEdit, setBkOldOpen, setBkOpenGroups
  } = ctx;
    const nomGroupe = (g) => {
      const hid = g.hotel_id || (g.group_id && bkGroupMap[g.group_id]);
      const hotel = hid && hotels.find(h => String(h.id) === String(hid));
      if (g.origine === "veeam") return hotel ? hotel.name + " · Veeam direct" : g.group;
      return hotel ? hotel.name : g.group;
    };
    const toggleGroupe = (key) => setBkOpenGroups(prev => ({ ...prev, [key]: !(prev[key] !== undefined ? prev[key] : bkFiltreSt.length > 0) }));
    // Filtre par statut : on ne garde dans chaque groupe que les checks des statuts choisis (groupes vides masqués)
    const bkGroupesAff = bkFiltreSt.length === 0 ? bkGroupes
      : bkGroupes.map(g => ({ ...g, checks: g.checks.filter(c => bkFiltreSt.includes(bkMetaCheck(c).rank)) })).filter(g => g.checks.length > 0);
    // Licence Veeam de l'hôtel : date de fin + jours restants (cliquer pour modifier)
    const rendreLicenceVeeam = (hid) => {
      const stop = (e) => e.stopPropagation();
      const ligne = bkLigneLicence(hid);
      if (bkLicEdit && String(bkLicEdit.hid) === String(hid)) {
        const champ = { fontSize: 11.5, padding: "3px 7px", border: "1px solid #CBD5E0", borderRadius: 6 };
        return React.createElement('span', { onClick: stop, style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", background: "white", border: "1px solid #E2E8F0", borderRadius: 8, padding: "4px 8px", fontSize: 11.5, color: "#444" } },
          React.createElement('b', null, "🔑 Fin de licence"),
          React.createElement('input', { type: "date", value: bkLicEdit.fin || "", onChange: e => setBkLicEdit({ ...bkLicEdit, fin: e.target.value }), style: champ }),
          React.createElement('input', { value: bkLicEdit.info || "", placeholder: "Édition / instances (facultatif)", onChange: e => setBkLicEdit({ ...bkLicEdit, info: e.target.value }), style: { ...champ, width: 190 } }),
          React.createElement('button', { onClick: bkEnregLicence, style: { fontSize: 11.5, padding: "3px 10px", border: "none", background: "#2F855A", color: "white", borderRadius: 6, cursor: "pointer", fontWeight: 600 } }, "Enregistrer"),
          React.createElement('button', { onClick: () => setBkLicEdit(null), style: { fontSize: 11.5, padding: "3px 8px", border: "1px solid #DDD", background: "white", color: "#555", borderRadius: 6, cursor: "pointer" } }, "Annuler"));
      }
      const ouvrir = (e) => { e.stopPropagation(); setBkLicEdit({ hid, fin: (ligne && ligne.licence_fin) || "", info: (ligne && ligne.licence_info) || "" }); };
      if (!ligne || !ligne.licence_fin) {
        return React.createElement('span', { onClick: ouvrir, title: "Renseigner la date de fin de la licence Veeam", style: { fontSize: 11, fontWeight: 600, color: "#8A6D1F", background: "#FFFBEB", border: "1px dashed #E0C068", padding: "2px 9px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" } }, "🔑 Licence Veeam : à renseigner");
      }
      const j = bkJoursRestants(ligne.licence_fin);
      const c = j < 0 ? { c: "#C53030", bg: "#FDE2E2", b: "#F5B5B5" } : j <= 30 ? { c: "#C05621", bg: "#FFF3E8", b: "#F6C9A0" } : j <= 90 ? { c: "#B7791F", bg: "#FFFBEB", b: "#F0D98A" } : { c: "#2F855A", bg: "#E9F6EE", b: "#B5E0C3" };
      const dateFr = new Date(ligne.licence_fin + "T12:00:00").toLocaleDateString("fr-FR");
      const reste = j < 0 ? "expirée depuis " + (-j) + " j" : j === 0 ? "expire aujourd'hui" : j + " jour" + (j > 1 ? "s" : "") + " restant" + (j > 1 ? "s" : "");
      return React.createElement('span', { onClick: ouvrir, title: "Licence Veeam" + (ligne.licence_info ? " — " + ligne.licence_info : "") + (ligne.licence_alerte ? "\nAlerte email à l'équipe : activée" : "\nAlerte email à l'équipe : désactivée") + "\nCliquer pour modifier", style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: c.c, background: c.bg, border: "1px solid " + c.b, padding: "2px 10px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" } },
        "🔑 Licence Veeam : " + dateFr,
        React.createElement('span', { style: { fontWeight: 800 } }, "· " + reste),
        ligne.licence_info && React.createElement('span', { style: { fontWeight: 400, opacity: .8 } }, "· " + ligne.licence_info));
    };
    const pastille = (c) => { const m = bkMetaCheck(c); return React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, color: m.color, background: m.bg, padding: "1px 7px", borderRadius: 10, whiteSpace: "nowrap" } }, m.label); };
    const ligneCmp = (gauche, droite, fond, note) => React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 2 : 12, padding: "7px 16px", borderBottom: "1px solid #F3F3F8", background: fond || "white", fontSize: 12 } },
      React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } }, gauche ? [React.createElement('span', { key: "n", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#333" } }, gauche.name), React.createElement('span', { key: "p" }, pastille(gauche))] : React.createElement('span', { style: { color: "#C05621", fontStyle: "italic" } }, note || "—")),
      React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } }, droite ? [React.createElement('span', { key: "n", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#333" } }, droite.name), React.createElement('span', { key: "p" }, pastille(droite)), React.createElement('span', { key: "d", style: { fontSize: 10.5, color: "#AAA", whiteSpace: "nowrap" } }, fmtDateHeureFr2(droite.updatedIso))] : React.createElement('span', { style: { color: "#C05621", fontStyle: "italic" } }, note || "—")));
    const rendreComparaison = () => {
      const nb = (r) => bkComparaison.filter(h => h.etat.r === r).length;
      return React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 12, color: "#666", background: "#F7F9FC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", marginBottom: 12, lineHeight: 1.6 } },
          "Pour chaque hôtel : à gauche les checks CheckCentral (ancien), à droite les jobs Veeam reçus directement (nouveau). L'appariement se fait sur la ressemblance des noms. ",
          React.createElement('b', null, nb(2) + " complet(s)"), " · ",
          React.createElement('b', { style: { color: "#C05621" } }, nb(1) + " à vérifier"), " · ",
          React.createElement('b', { style: { color: "#718096" } }, nb(0) + " non migré(s)"),
          nb(3) ? " · " + nb(3) + " Veeam seulement" : ""),
        React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
          bkComparaison.map(h => {
            const ouvert = !!bkCmpOpen[h.k];
            return React.createElement('div', { key: h.k, style: { background: "white", border: "1px solid #E8E8F0", borderLeft: "5px solid " + h.etat.c, borderRadius: 10, overflow: "hidden" } },
              React.createElement('div', { onClick: () => setBkCmpOpen(p => ({ ...p, [h.k]: !p[h.k] })), style: { padding: "11px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flexWrap: "wrap" } },
                React.createElement('div', { style: { flex: 1, minWidth: 160, fontSize: 14, fontWeight: 600, color: "#222" } }, h.nom),
                React.createElement('span', { style: { fontSize: 11.5, color: "#666" } }, "CheckCentral : " + h.cc.length),
                React.createElement('span', { style: { fontSize: 11.5, color: "#666" } }, "Veeam direct : " + h.vd.length),
                React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: h.etat.c, background: h.etat.bg, padding: "3px 10px", borderRadius: 20 } }, h.etat.l),
                React.createElement('span', { style: { fontSize: 12, color: "#AAA" } }, ouvert ? "▲" : "▼")),
              ouvert && React.createElement('div', { style: { borderTop: "1px solid #EEE" } },
                React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, padding: "6px 16px", background: "#FAFAFC", fontSize: 10.5, fontWeight: 700, color: "#888", textTransform: "uppercase" } },
                  React.createElement('div', null, "CheckCentral (ancien)"), !isMobile && React.createElement('div', null, "Veeam direct (nouveau)")),
                h.paires.map((p, i) => ligneCmp(p.cc, p.vd, h.ecarts.includes(p) ? "#FFF5EB" : null)).concat(
                  h.ccSeuls.map((c, i) => ligneCmp(c, null, "#FFFAF0", h.vd.length ? "⚠ Aucun job Veeam correspondant reçu" : "Hôtel non encore branché sur backup@")),
                  h.vdSeuls.map((c, i) => ligneCmp(null, c, "#F5FAFF", "Non surveillé par CheckCentral (nouveau)")))
              ));
          })));
    };
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Statut des sauvegardes, regroupées par site. Les groupes présentant un échec apparaissent en premier. Sources : API CheckCentral et mails Veeam reçus directement sur backup@dsihotel.com (« Veeam direct »). Cliquez sur une pastille ou sur 📄 pour ouvrir le rapport Veeam (impression PDF possible)."
      ),
      bkRapport && bkRenderRapport(),
      // Alerte : backups sans exécution depuis plus de 7 jours.
      // Le compteur ne retient que les muets NON justifiés (sans note d'explication).
      // Si tous les muets sont justifiés, le bandeau passe au vert (informatif).
      bkAncienChecks.length > 0 && React.createElement('div', { style: { marginBottom: 16, background: bkMuetsNonJustifies > 0 ? "#FDECEC" : "#E9F6EE", border: "1px solid " + (bkMuetsNonJustifies > 0 ? "#F5B5B5" : "#B7E0C6"), borderRadius: 10, overflow: "hidden" } },
        React.createElement('div', { onClick: () => setBkOldOpen(v => !v), style: { padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 } },
          React.createElement('span', { style: { fontSize: 18, flexShrink: 0 } }, bkMuetsNonJustifies > 0 ? "⚠️" : "✅"),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: bkMuetsNonJustifies > 0 ? "#B02A2A" : "#2F855A" } },
              bkMuetsNonJustifies > 0
                ? (bkMuetsNonJustifies + " sauvegarde" + (bkMuetsNonJustifies > 1 ? "s" : "") + " sans exécution depuis plus de " + BK_SEUIL_JOURS + " jours")
                : ("Tous les backups muets sont justifiés (" + bkAncienChecks.length + ")")
            ),
            React.createElement('div', { style: { fontSize: 11.5, color: bkMuetsNonJustifies > 0 ? "#B45454" : "#5A9A73", marginTop: 2 } },
              bkMuetsNonJustifies > 0 && bkAncienChecks.length > bkMuetsNonJustifies
                ? ("Cliquez pour voir les backups concernés — " + (bkAncienChecks.length - bkMuetsNonJustifies) + " justifié(s) masqué(s) du compteur")
                : ("Cliquez pour voir " + (bkAncienChecks.length > 1 ? "les backups concernés" : "le backup concerné"))
            )
          ),
          React.createElement('span', { style: { fontSize: 12, color: bkMuetsNonJustifies > 0 ? "#B02A2A" : "#2F855A", marginLeft: 4 } }, bkOldOpen ? "▲" : "▼")
        ),
        bkOldOpen && React.createElement('div', { style: { borderTop: "1px solid " + (bkMuetsNonJustifies > 0 ? "#F5B5B5" : "#B7E0C6"), background: "white" } },
          bkAncienChecks.map((c, i) => {
            const hid = c.hotel_id || (c.group_id && bkGroupMap[c.group_id]);
            const hotel = hid && hotels.find(h => String(h.id) === String(hid));
            const site = hotel ? hotel.name : (c.group || "(sans groupe)");
            return React.createElement('div', { key: c.id || i, style: { display: "flex", alignItems: "flex-start", gap: isMobile ? 8 : 12, flexWrap: isMobile ? "wrap" : "nowrap", padding: isMobile ? "10px 12px" : "10px 16px", borderBottom: i < bkAncienChecks.length - 1 ? "1px solid #F6F6FA" : "none" } },
              React.createElement('span', { style: { width: 8, height: 8, borderRadius: "50%", background: c.justifie ? "#2F855A" : "#E53E3E", flexShrink: 0, marginTop: 4 } }),
              React.createElement('div', { style: { flex: isMobile ? "1 1 calc(100% - 20px)" : 1, minWidth: 0 } },
                React.createElement('div', { style: isMobile ? { fontSize: 13, color: "#333", fontWeight: 600, wordBreak: "break-word" } : { fontSize: 13, color: "#333", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, c.name),
                React.createElement('div', { style: { fontSize: 11, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, site + (c.description ? " · " + c.description : "")),
                c.id && renderBackupNote(c.id)
              ),
              isMobile && React.createElement('span', { style: { flexBasis: "100%", height: 0 } }),
              isMobile && React.createElement('span', { style: { width: 8, flexShrink: 0 } }),
              React.createElement('span', { style: { fontSize: 11, color: c.justifie ? "#2F855A" : "#B02A2A", fontWeight: 600, whiteSpace: "nowrap", alignSelf: "flex-start" } }, (c.justifie ? "✓ Justifié · " : "") + "Il y a " + c.ageJours + " j"),
              React.createElement('span', { style: { fontSize: 11, color: "#AAA", whiteSpace: "nowrap" } }, fmtDateHeureFr2(c.updatedIso))
            );
          })
        )
      ),
      // Vue d'ensemble façon CheckCentral : pastilles vert / jaune / rouge (cliquables = filtre)
      React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: isMobile ? "14px 12px" : "16px 22px", marginBottom: 14, display: "flex", alignItems: "center", gap: isMobile ? 14 : 34, flexWrap: "wrap" } },
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: isMobile ? 14 : 30, flexWrap: "wrap", flex: "1 1 auto", justifyContent: isMobile ? "center" : "flex-start" } },
          BK_FILTRES.filter(f => f.r !== 2 || bkStats.autre > 0).map(f => {
            const n = f.r === 3 ? bkStats.ok : f.r === 1 ? bkStats.warn : f.r === 0 ? bkStats.echec : bkStats.autre;
            const taille = f.r === 0 && n > 0 ? (isMobile ? 78 : 96) : f.r === 2 ? (isMobile ? 52 : 60) : (isMobile ? 66 : 80);
            const seul = bkFiltreSt.length === 1 && bkFiltreSt[0] === f.r;
            const estompe = bkFiltreSt.length > 0 && !bkFiltreSt.includes(f.r);
            return React.createElement('div', { key: f.r, onClick: () => setBkFiltreSt(seul ? [] : [f.r]), title: seul ? "Afficher tout" : "Afficher uniquement : " + f.l,
                style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", opacity: estompe ? .35 : 1, transition: "opacity .15s" } },
              React.createElement('div', { style: { width: taille, height: taille, borderRadius: "50%", background: f.c, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: taille > 70 ? 26 : 20, fontWeight: 800, boxShadow: seul ? "0 0 0 4px white, 0 0 0 7px " + f.c : "0 2px 8px rgba(0,0,0,.12)" } }, String(n)),
              React.createElement('div', { style: { fontSize: 11.5, fontWeight: 600, color: "#555" } }, f.l));
          })),
        React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#666", minWidth: 150 } },
          React.createElement('div', null, React.createElement('b', { style: { fontSize: 18, color: "#0F0F24" } }, String(bkStats.total)), " checks au total"),
          React.createElement('div', null, React.createElement('b', { style: { fontSize: 18, color: bkStats.groupesEnEchec > 0 ? "#E53E3E" : "#2F855A" } }, bkStats.groupesEnEchec + " / " + bkStats.nbGroupes), " sites en échec"))
      ),
      // Filtres par statut (plusieurs choix possibles)
      bkVue !== "comparaison" && React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(" + (bkStats.autre > 0 ? 5 : 4) + ", 1fr)", gap: 10, marginBottom: 16 } },
        [{ r: null, l: "Tout", c: "#0F0F24" }].concat(BK_FILTRES.filter(f => f.r !== 2 || bkStats.autre > 0)).map(f => {
          const actif = f.r === null ? bkFiltreSt.length === 0 : bkFiltreSt.includes(f.r);
          const n = f.r === null ? bkStats.total : f.r === 3 ? bkStats.ok : f.r === 1 ? bkStats.warn : f.r === 0 ? bkStats.echec : bkStats.autre;
          const clic = () => {
            if (f.r === null) { setBkFiltreSt([]); return; }
            setBkFiltreSt(prev => { const nx = prev.includes(f.r) ? prev.filter(x => x !== f.r) : prev.concat(f.r); return nx.length >= BK_FILTRES.filter(x => x.r !== 2 || bkStats.autre > 0).length ? [] : nx; });
          };
          return React.createElement('button', { key: String(f.r), onClick: clic, title: f.r === null ? "Tout afficher" : (actif ? "Retirer du filtre" : "Ajouter au filtre"),
              style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 10px", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", border: actif ? "1px solid #0B5CC2" : "1px solid #DDE3EE", background: actif ? "#0B5CC2" : "white", color: actif ? "white" : "#334" } },
            f.r !== null && React.createElement('span', { style: { width: 13, height: 13, borderRadius: "50%", background: f.c, border: actif ? "2px solid white" : "none", flexShrink: 0 } }),
            f.l, React.createElement('span', { style: { fontWeight: 400, opacity: .8 } }, "(" + n + ")"));
        })
      ),
      // Barre d'actions
      React.createElement('div', { style: { display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" } },
        React.createElement('button', { onClick: loadBackups, disabled: bkLoading, style: { padding: "8px 15px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: bkLoading ? 0.6 : 1 } }, bkLoading ? "Actualisation..." : "🔄 Actualiser"),
        React.createElement('button', { onClick: () => lancerAlertesBackup("run", 24), title: "Crée directement un ticket pour chaque sauvegarde en défaut depuis plus de 24 h (sans doublon)", style: { padding: "8px 15px", background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "🚨 Alertes + de 24 h"),
        bkFetchedAt && React.createElement('span', { style: { fontSize: 11, color: "#999" } }, "Dernière lecture : " + fmtDateHeureFr2(bkFetchedAt)),
        React.createElement('div', { style: { display: "flex", gap: 0, border: "1px solid #DDE3EE", borderRadius: 8, overflow: "hidden", marginLeft: isMobile ? 0 : "auto" } },
          [["tout", "Tout"], ["checkcentral", "CheckCentral"], ["veeam", "Veeam direct"], ["comparaison", "⇄ Comparaison"]].map(([v, l]) =>
            React.createElement('button', { key: v, onClick: () => choisirBkVue(v), style: { padding: "7px 13px", fontSize: 12, fontWeight: 600, border: "none", borderRight: v !== "comparaison" ? "1px solid #DDE3EE" : "none", cursor: "pointer", background: bkVue === v ? "#0F0F24" : "white", color: bkVue === v ? "white" : "#445" } }, l)))
      ),
      // Fenêtre de test / lancement des alertes sauvegardes
      bkAlerte && React.createElement('div', { onClick: e => { if (e.target === e.currentTarget && !bkAlerte.loading) setBkAlerte(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", zIndex: 90, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? 12 : "40px 20px", overflowY: "auto" } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, width: "100%", maxWidth: 760, padding: isMobile ? 16 : 22, boxShadow: "0 12px 40px rgba(0,0,0,.25)", marginBottom: 30 } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: "#C53030", flex: 1 } }, "🚨 Sauvegardes en défaut depuis plus de " + (bkAlerte.heures != null ? bkAlerte.heures : 24) + " h"),
            React.createElement('button', { onClick: () => !bkAlerte.loading && setBkAlerte(null), style: { border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#888" } }, "✕")
          ),
          React.createElement('div', { style: { fontSize: 12, color: "#777", marginBottom: 14, lineHeight: 1.5 } },
            bkAlerte.mode === "run"
              ? "Les tickets ci-dessous ont été créés directement dans Support → Tickets. La vérification tourne aussi automatiquement toutes les heures, sans clic : 1 seul ticket par incident, créé après 24 h de défaut. En échec : une relance est ajoutée à ce même ticket toutes les 12 h. En avertissement : pas de relance."
              : "Simulation : rien n'a été créé. Vérifiez la liste, puis cliquez sur « Créer les tickets ». Ensuite, la vérification tourne automatiquement toutes les heures."),
          bkAlerte.loading && React.createElement('div', { style: { padding: 20, textAlign: "center", color: "#999", fontSize: 13 } }, "Vérification des sauvegardes et création des tickets…"),
          bkAlerte.err && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 } }, "Erreur : " + bkAlerte.err),
          !bkAlerte.loading && bkAlerte.data && (() => {
            const d = bkAlerte.data;
            const section = (titre, couleur, lignes, rendu) => React.createElement('div', { style: { marginBottom: 14 } },
              React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: couleur, marginBottom: 6 } }, titre + " (" + lignes.length + ")"),
              lignes.length === 0
                ? React.createElement('div', { style: { fontSize: 12, color: "#AAA", fontStyle: "italic" } }, "Aucune")
                : React.createElement('div', { style: { border: "1px solid #EEE", borderRadius: 8, overflow: "hidden" } },
                    lignes.map((x, i) => React.createElement('div', { key: i, style: { display: "flex", gap: 10, alignItems: "center", padding: "8px 11px", borderTop: i ? "1px solid #F2F2F5" : "none", fontSize: 12.5, flexWrap: "wrap" } }, rendu(x)))
                  )
            );
            const badge = (st) => React.createElement('span', { style: { fontSize: 10.5, fontWeight: 700, color: "#fff", background: String(st).toLowerCase() === "failure" ? "#C53030" : "#DD6B20", padding: "2px 8px", borderRadius: 12, flexShrink: 0 } }, String(st).toLowerCase() === "failure" ? "Échec" : "Avertissement");
            const ligneStd = (x) => [badge(x.statut), React.createElement('b', { key: "n", style: { flex: 1, minWidth: 160 } }, x.sauvegarde), React.createElement('span', { key: "h", style: { color: "#555" } }, x.hotel), React.createElement('span', { key: "d", style: { color: "#C53030", fontWeight: 600, whiteSpace: "nowrap" } }, x.duree), x.ticket && React.createElement('span', { key: "t", style: { fontFamily: "monospace", color: G2, fontWeight: 700 } }, x.ticket)];
            const aCreer = d.ticketsCrees || [];
            const relances = d.relances || [];
            const recents = (d.enDefaut || []).filter(x => !aCreer.some(y => y.sauvegarde === x.sauvegarde) && !relances.some(y => y.sauvegarde === x.sauvegarde) && !(d.dejaSignalees || []).some(y => y.sauvegarde === x.sauvegarde));
            const ligneSuivi = (x) => ligneStd(x).concat(x.prochaineRelance ? [React.createElement('span', { key: "r", style: { fontSize: 11, color: "#888", whiteSpace: "nowrap" } }, (String(x.prochaineRelance).startsWith("aucune") ? "pas de relance (avertissement)" : "relance le " + x.prochaineRelance))] : []);
            return React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 12, color: "#666", marginBottom: 12 } }, d.verifiees + " sauvegardes vérifiées · " + (d.enDefaut || []).length + " en défaut"),
              section(bkAlerte.mode === "run" ? "Tickets créés" : "Tickets qui seront créés", "#C53030", aCreer, ligneStd),
              (relances.length > 0 || bkAlerte.mode === "run") && section(bkAlerte.mode === "run" ? "Relances (ajoutées au ticket existant)" : "Relances qui seront ajoutées", "#9B2C2C", relances, (x) => ligneStd(x).concat(x.precedent ? [React.createElement('span', { key: "p", style: { fontSize: 11, color: "#888" } }, "suite de " + x.precedent)] : [])),
              section("Déjà signalées — ticket ouvert en cours", "#DD6B20", d.dejaSignalees || [], ligneSuivi),
              section("En défaut depuis moins de " + bkAlerte.heures + " h (pas encore de ticket)", "#718096", recents, ligneStd),
              section("Ignorées (justifiées par une note)", "#718096", d.ignorees || [], (x) => [React.createElement('b', { key: "n", style: { flex: 1 } }, x.sauvegarde), React.createElement('span', { key: "h", style: { color: "#888" } }, x.hotel + " — " + x.raison)]),
              (d.retablies || []).length > 0 && section("Rétablies", "#2F855A", d.retablies, (x) => [React.createElement('b', { key: "n", style: { flex: 1 } }, x.sauvegarde), React.createElement('span', { key: "t", style: { fontFamily: "monospace", color: G2 } }, x.ticket)]),
              (d.erreurs || []).length > 0 && section("Erreurs", "#C53030", d.erreurs, (x) => [React.createElement('b', { key: "n" }, x.sauvegarde), React.createElement('span', { key: "e", style: { color: "#C53030" } }, x.erreur)]),
              React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 6 } },
                React.createElement('button', { onClick: () => setBkAlerte(null), style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Fermer"),
                bkAlerte.mode === "test" && aCreer.length > 0 && React.createElement('button', { onClick: () => { if (confirm("Créer " + aCreer.length + " ticket(s) d'alerte maintenant ?")) lancerAlertesBackup("run", bkAlerte.heures); }, style: { padding: "8px 16px", background: "#C53030", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" } }, "Créer les " + aCreer.length + " ticket(s)")
              )
            );
          })()
        )
      ),
      bkNote && React.createElement('div', { style: { fontSize: 12, color: bkNote.startsWith("Erreur") ? "#C53030" : "#666", marginBottom: 14, background: bkNote.startsWith("Erreur") ? "#FDECEC" : "#F6F6FA", border: "1px solid " + (bkNote.startsWith("Erreur") ? "#F5C6C6" : "#E8E8F0"), borderRadius: 8, padding: "9px 12px" } }, bkNote),
      // Liste des groupes
      bkVue === "comparaison" && !(bkLoading && bkChecks.length === 0) ? rendreComparaison() :
      bkLoading && bkChecks.length === 0
        ? React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Chargement des statuts...")
        : React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
            bkGroupesAff.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucune sauvegarde avec ce statut."),
            bkGroupesAff.map(g => {
              const meta = bkStatusMeta(g.pireRank === 0 ? "Failure" : g.pireRank === 1 ? "Warning" : g.pireRank === 3 ? "Success" : "Autre");
              const ouvert = bkOpenGroups[g.key] !== undefined ? !!bkOpenGroups[g.key] : bkFiltreSt.length > 0;
              const enEchec = g.nbEchec > 0;
              const enWarn = !enEchec && g.pireRank === 1;
              return React.createElement('div', { key: g.key, style: { background: enEchec ? "#FDECEC" : (enWarn ? "#FEF7EF" : "white"), borderRadius: 10, border: enEchec ? "1.5px solid #E53E3E" : (enWarn ? "1px solid #F3C89B" : "1px solid #E8E8F0"), borderLeft: enEchec ? "6px solid #E53E3E" : (enWarn ? "6px solid #DD6B20" : "1px solid #E8E8F0"), overflow: "hidden", boxShadow: enEchec ? "0 2px 12px rgba(229,62,62,.20)" : "none" } },
                // En-tête du groupe (cliquable)
                React.createElement('div', { onClick: () => toggleGroupe(g.key), style: { padding: isMobile ? "11px 12px" : "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexWrap: isMobile ? "wrap" : "nowrap" } },
                  React.createElement('span', { style: { width: enEchec ? 13 : 10, height: enEchec ? 13 : 10, borderRadius: "50%", background: meta.color, flexShrink: 0, boxShadow: enEchec ? "0 0 0 4px rgba(229,62,62,.20)" : "none" } }),
                  React.createElement('div', { style: { flex: isMobile ? "1 1 calc(100% - 30px)" : 1, minWidth: 0 } },
                    React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                      React.createElement('div', { style: { fontSize: 14, wordBreak: "break-word", fontWeight: enEchec ? 700 : 600, color: enEchec ? "#C53030" : "#222" } }, (enEchec ? "⛔ " : "") + nomGroupe(g)),
                      g.origine === "veeam" && g.hotel_id && rendreLicenceVeeam(g.hotel_id)),
                    React.createElement('div', { style: { fontSize: 11, color: enEchec ? "#B03030" : "#999", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                      g.checks.length + " check" + (g.checks.length > 1 ? "s" : ""),
                      g.group_id && (() => {
                        const hid = bkGroupMap[g.group_id] || "";
                        const sugg = !hid ? bkSuggererHotel(g.group) : null;
                        return React.createElement('span', { onClick: e => e.stopPropagation(), style: { display: "inline-flex", alignItems: "center", gap: 6 } },
                          React.createElement('select', { value: hid, disabled: bkMapBusy === g.group_id, onChange: e => bkRattacherGroupe(g, e.target.value),
                              title: "Hôtel des tickets d'alerte de ce groupe CheckCentral",
                              style: { fontSize: 11, padding: "2px 6px", border: "1px solid " + (hid ? "#DDD" : "#F0B429"), borderRadius: 6, background: hid ? "white" : "#FFFBEB", color: hid ? "#555" : "#B7791F", maxWidth: 210 } },
                            React.createElement('option', { value: "" }, "⚠ Hôtel non rattaché"),
                            hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
                          sugg && React.createElement('button', { onClick: () => bkRattacherGroupe(g, sugg.id), disabled: bkMapBusy === g.group_id, title: "Rattacher à l'hôtel suggéré d'après le nom du groupe",
                            style: { fontSize: 11, padding: "2px 8px", border: "1px solid #9AE6B4", background: "white", color: "#2F855A", borderRadius: 6, cursor: "pointer", fontWeight: 600 } }, "✓ " + sugg.name));
                      })())
                  ),
                  // Compteurs (sur mobile : ligne à part, sous le nom)
                  isMobile && React.createElement('span', { style: { flexBasis: "100%", height: 0 } }),
                  isMobile && React.createElement('span', { style: { width: 13, flexShrink: 0 } }),
                  g.nbEchec > 0 && React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700, color: "white", background: "#E53E3E", padding: "3px 11px", borderRadius: 20, boxShadow: "0 1px 3px rgba(229,62,62,.35)" } }, "⛔ " + g.nbEchec + " échec" + (g.nbEchec > 1 ? "s" : "")),
                  g.nbWarn > 0 && React.createElement('span', { style: { fontSize: 11, fontWeight: 600, color: "#DD6B20", background: "#FEF0E4", padding: "2px 9px", borderRadius: 20 } }, g.nbWarn),
                  g.nbOk > 0 && React.createElement('span', { style: { fontSize: 11, fontWeight: 600, color: "#2F855A", background: "#E9F6EE", padding: "2px 9px", borderRadius: 20 } }, g.nbOk + " OK"),
                  React.createElement('span', { style: { fontSize: 12, color: "#AAA", marginLeft: isMobile ? "auto" : 4 } }, ouvert ? "▲" : "▼")
                ),
                // Détail des checks du groupe
                ouvert && React.createElement('div', { style: { borderTop: "1px solid #F0F0F8" } },
                  g.checks.map((c, i) => {
                    const cm = bkMetaCheck(c);
                    const fq = c.id != null ? bkFreq[String(c.id)] : null;
                    // Éligible à une note = check en échec OU muet (dernière exécution > 7 jours).
                    const estEchec = cm.rank === 0;
                    let estMuet = false;
                    if (c.updatedIso) {
                      const t = new Date(c.updatedIso).getTime();
                      if (!isNaN(t)) estMuet = (Date.now() - t) > Math.max(BK_SEUIL_JOURS * 24 * 3600000, fq && fq.frequence_heures > 24 ? (fq.frequence_heures + BK_MARGE_H) * 3600000 : 0);
                    }
                    const noteEligible = !!c.id && (estEchec || estMuet);
                    return React.createElement('div', { key: c.id || i, style: { display: "flex", alignItems: "flex-start", gap: isMobile ? 8 : 12, flexWrap: isMobile ? "wrap" : "nowrap", padding: isMobile ? "10px 12px" : "10px 16px", borderBottom: i < g.checks.length - 1 ? "1px solid #F6F6FA" : "none" } },
                      React.createElement('span', { style: { width: 8, height: 8, borderRadius: "50%", background: cm.color, flexShrink: 0, marginTop: 4 } }),
                      React.createElement('div', { style: { flex: isMobile ? "1 1 calc(100% - 20px)" : 1, minWidth: 0 } },
                        React.createElement('div', { style: isMobile ? { fontSize: 13, color: "#333", fontWeight: 500, wordBreak: "break-word" } : { fontSize: 13, color: "#333", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, c.name),
                        c.description && React.createElement('div', { style: { fontSize: 11, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, c.description),
                        fq && fq.frequence_heures > 24 && React.createElement('div', { style: { fontSize: 11, color: "#2B6CB0", marginTop: 2 } },
                          "📅 Sauvegarde " + bkLibFreq(fq.frequence_heures).toLowerCase() +
                          (cm.masquee ? " — défaut CheckCentral ignoré, prochaine exécution attendue avant le " + new Date(cm.masquee).toLocaleDateString("fr-FR") : "") +
                          (fq.derniere_reussite ? " · dernière réussite le " + new Date(fq.derniere_reussite).toLocaleDateString("fr-FR") : "")),
                        c.origine === "veeam" && c.message && cm.rank <= 1 && React.createElement('div', { style: { fontSize: 11, color: "#C53030", marginTop: 2, fontFamily: "Consolas, monospace", wordBreak: "break-word" } }, c.message),
                        c.origine === "veeam" && c.message && cm.rank === 2 && React.createElement('div', { style: { fontSize: 11, color: "#718096", marginTop: 2 } }, "⏸ " + c.message),
                        c.origine === "veeam" && c.planifDesc && React.createElement('div', { style: { fontSize: 11, color: "#2B6CB0", marginTop: 2 } },
                          "📅 " + c.planifDesc + (c.prochaineExec ? " · prochaine : " + (isNaN(new Date(c.prochaineExec).getTime()) ? c.prochaineExec : new Date(c.prochaineExec).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })) : "")),
                        noteEligible && renderBackupNote(c.id),
                        c.origine === "veeam" && React.createElement('button', { onClick: () => bkToggleHistVeeam(c),
                          style: { marginTop: 5, fontSize: 11, padding: "2px 9px", border: "1px solid #DDE3EE", background: "white", color: "#4A5A78", borderRadius: 6, cursor: "pointer" } },
                          bkVeeamHist[String(c.id).replace(/^veeam:/, "")] ? "▲ Masquer l'historique" : "📊 Historique 30 jours"),
                        c.origine === "veeam" && bkRenderHistVeeam(c)
                      ),
                      isMobile && React.createElement('span', { style: { flexBasis: "100%", height: 0 } }),
                      isMobile && React.createElement('span', { style: { width: 8, flexShrink: 0 } }),
                      c.origine === "veeam" && bkRenderFrise(c),
                      React.createElement('span', { style: { fontSize: 11, color: "#AAA", whiteSpace: "nowrap", marginTop: 2 } }, fmtDateHeureFr2(c.updatedIso)),
                      (c.origine === "veeam" && c.planifDesc) ? React.createElement('span', { title: "Planification lue automatiquement dans Veeam (inventaire NinjaOne" + (c.inventaireIso ? " du " + new Date(c.inventaireIso).toLocaleString("fr-FR") : "") + ")",
                        style: { fontSize: 11, padding: "3px 8px", border: "1px solid #BEE3F8", borderRadius: 6, background: "#EBF8FF", color: "#2B6CB0", marginTop: 1, whiteSpace: "nowrap" } }, "🔄 Planif. Veeam") :
                      c.id != null && React.createElement('select', { value: String((fq && fq.frequence_heures) || 24), title: "Fréquence d'exécution attendue : une sauvegarde non quotidienne n'alerte pas entre deux passages",
                        onChange: e => { const h = parseInt(e.target.value, 10); definirFrequenceBackup(c, h).catch(err => alert("Impossible d'enregistrer la fréquence : " + (err.message || err))); },
                        style: { fontSize: 11, padding: "2px 5px", border: "1px solid " + (fq ? "#BEE3F8" : "#E2E2EA"), borderRadius: 6, background: fq ? "#EBF8FF" : "white", color: fq ? "#2B6CB0" : "#777", marginTop: 1 } },
                        BK_FREQS.map(f => React.createElement('option', { key: f.h, value: String(f.h) }, f.l))),
                      React.createElement('span', { style: { fontSize: 11, fontWeight: 600, color: cm.color, background: cm.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", marginTop: 1 } }, cm.label)
                    );
                  })
                )
              );
            })
          )
    );
  return content;
}
