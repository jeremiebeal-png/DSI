// ===== Page « planning » — condition dans App : page === "planning" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_planning({...}) de app.js.
function Page_planning(ctx) {
  let content = ctx.content;
  const {
    hotels, isMobile, loadPlanning, plData, plEnregistrer, plErr, plJourM, plJoursDe, plLoading, plModal,
    plModalErr, plOuvrirEdition, plOuvrirNouveau, plSaving, plSemaine, plSupprimer, plTechsDe, plWeekend,
    setPlJourM, setPlModal, setPlSemaine, setPlWeekend
  } = ctx;
    const nbJours = plWeekend ? 7 : 5;
    const jours = Array.from({ length: nbJours }, (_, i) => plAjout(plSemaine, i));
    const auj = plYmd(new Date());
    const nomsJ = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
    const lignes = [...plData.equipe.map((m, i) => ({ ...m, couleur: PL_COULEURS[i % PL_COULEURS.length] })), { id: "_na", nom: "Non assigné", email: null, couleur: "#A0AEC0" }];
    const evtsDe = (ligne, jour) => plData.evenements.filter(e => {
      const { d0, d1 } = plJoursDe(e);
      if (jour < d0 || jour > d1) return false;
      const techs = plTechsDe(e);
      return ligne.email ? techs.some(m => m.email === ligne.email) : techs.length === 0;
    }).sort((a, b) => (b.journee ? 1 : 0) - (a.journee ? 1 : 0) || String(a.debut).localeCompare(String(b.debut)));
    const fmtJour = (s) => { const d = new Date(s + "T12:00:00"); return nomsJ[(d.getDay() + 6) % 7] + " " + String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
    const btnS = { padding: "6px 12px", background: "white", border: "1px solid #DDD", borderRadius: 7, fontSize: 12, cursor: "pointer", color: "#333" };
    const inputS = { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    const lblS = { fontSize: 11.5, fontWeight: 600, color: "#666", margin: "10px 0 4px", display: "block" };
    const f = plModal;
    const setF = (patch) => setPlModal(prev => ({ ...prev, ...patch }));
    // ---------- MOBILE : vue jour par jour (une carte par technicien) ----------
    let contenuMobile = null;
    if (isMobile) {
      const jourSel = plJourM && jours.includes(plJourM) ? plJourM : (jours.includes(auj) ? auj : jours[0]);
      const estWE = (d) => { const x = new Date(d + "T12:00:00").getDay(); return x === 0 || x === 6; };
      const allerJour = (delta) => {
        let d = plAjout(jourSel, delta);
        while (!plWeekend && estWE(d)) d = plAjout(d, delta);
        const lundi = plLundi(new Date(d + "T12:00:00"));
        if (lundi !== plSemaine) setPlSemaine(lundi);
        setPlJourM(d);
      };
      const nomsLongs = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      const dSel = new Date(jourSel + "T12:00:00");
      const titreJour = nomsLongs[(dSel.getDay() + 6) % 7] + " " + dSel.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      const nbRdvJour = lignes.reduce((n, l) => n + evtsDe(l, jourSel).length, 0);
      const btnRond = { width: 42, height: 42, borderRadius: 10, border: "1px solid #DDD", background: "white", fontSize: 15, cursor: "pointer", color: "#333", flexShrink: 0 };
      contenuMobile = React.createElement('div', null,
        // Navigation jour précédent / suivant
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
          React.createElement('button', { onClick: () => allerJour(-1), style: btnRond, "aria-label": "Jour précédent" }, "◀"),
          React.createElement('div', { style: { flex: 1, textAlign: "center", minWidth: 0 } },
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: jourSel === auj ? G2 : "#1a1a3e" } }, titreJour),
            React.createElement('div', { style: { fontSize: 11.5, color: "#888" } }, (jourSel === auj ? "Aujourd'hui · " : "") + nbRdvJour + " RDV")
          ),
          React.createElement('button', { onClick: () => allerJour(1), style: btnRond, "aria-label": "Jour suivant" }, "▶")
        ),
        // Bandeau des jours de la semaine (point = au moins un RDV)
        React.createElement('div', { style: { display: "flex", gap: 6, marginBottom: 12 } },
          jours.map(j => {
            const d = new Date(j + "T12:00:00");
            const sel = j === jourSel;
            const nb = lignes.reduce((n, l) => n + evtsDe(l, j).length, 0);
            return React.createElement('button', { key: j, onClick: () => setPlJourM(j),
              style: { flex: 1, minWidth: 0, padding: "7px 0", borderRadius: 10, cursor: "pointer", border: "1px solid " + (sel ? G : (j === auj ? G + "88" : "#E2E2EA")), background: sel ? G : "white", color: sel ? "#111" : "#444", lineHeight: 1.2 } },
              React.createElement('div', { style: { fontSize: 10.5, textTransform: "uppercase", opacity: .75 } }, nomsJ[(d.getDay() + 6) % 7].replace(".", "")),
              React.createElement('div', { style: { fontSize: 15, fontWeight: 700 } }, d.getDate()),
              React.createElement('div', { style: { height: 5, display: "flex", justifyContent: "center", marginTop: 2 } }, nb > 0 && React.createElement('span', { style: { width: 5, height: 5, borderRadius: 3, background: sel ? "#111" : G } }))
            );
          })
        ),
        // Actions
        React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 } },
          React.createElement('button', { onClick: () => { setPlSemaine(plLundi(new Date())); setPlJourM(auj); }, style: btnS }, "Aujourd'hui"),
          React.createElement('label', { style: { fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: plWeekend, onChange: e => setPlWeekend(e.target.checked) }), "Week-end"),
          React.createElement('button', { onClick: loadPlanning, style: btnS, disabled: plLoading, "aria-label": "Actualiser" }, plLoading ? "…" : "↻"),
          React.createElement('button', { onClick: () => plOuvrirNouveau(jourSel, null), style: { ...btnS, marginLeft: "auto", background: G, border: "none", color: "#111", fontWeight: 600 } }, "+ Nouveau RDV")
        ),
        plErr && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 } }, plErr),
        // Une carte par technicien
        React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8, opacity: plLoading ? 0.6 : 1 } },
          lignes.map(l => {
            const evts = evtsDe(l, jourSel);
            if (l.id === "_na" && evts.length === 0) return null; // « Non assigné » seulement s'il a des RDV
            return React.createElement('div', { key: l.id, style: { background: "white", border: "1px solid #E8E8F0", borderLeft: "4px solid " + l.couleur, borderRadius: 10, padding: "9px 12px" } },
              React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement('div', { style: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "#1a1a3e" } }, l.nom),
                evts.length === 0 && React.createElement('span', { style: { fontSize: 11.5, color: "#AAA" } }, "Disponible"),
                React.createElement('button', { onClick: () => plOuvrirNouveau(jourSel, l.email ? l : null), "aria-label": "Ajouter un RDV", style: { width: 32, height: 32, borderRadius: 8, border: "1px solid " + G + "66", background: "#FFFCF3", color: G2, fontSize: 18, lineHeight: 1, cursor: "pointer", flexShrink: 0 } }, "+")
              ),
              evts.map(e => React.createElement('div', { key: e.id, onClick: () => plOuvrirEdition(e),
                style: { display: "flex", gap: 10, background: l.couleur + "14", borderRadius: 7, padding: "7px 9px", marginTop: 6, cursor: "pointer" } },
                React.createElement('div', { style: { fontSize: 11.5, fontWeight: 700, color: l.couleur, width: 46, flexShrink: 0, lineHeight: 1.35 } },
                  e.journee ? "Journée" : [(e.debut || "").slice(11, 16), React.createElement('br', { key: "br" }), (e.fin || "").slice(11, 16)]),
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                  React.createElement('div', { style: { fontSize: 13, color: "#222", fontWeight: 500, overflowWrap: "anywhere" } }, e.titre),
                  e.lieu && React.createElement('div', { style: { fontSize: 11.5, color: "#777", marginTop: 2, overflowWrap: "anywhere" } }, "📍 " + e.lieu)
                )
              ))
            );
          })
        ),
        React.createElement('div', { style: { fontSize: 11, color: "#AAA", marginTop: 12, lineHeight: 1.5 } }, "Synchronisé avec le calendrier Outlook de " + (plData.boite || "info@dsihotel.fr") + ". Touchez un RDV pour le modifier.")
      );
    }
    const contenuBureau = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14, lineHeight: 1.6 } },
        "Planning de l'équipe, synchronisé en direct avec le calendrier Outlook de ", React.createElement('b', null, plData.boite || "info@dsihotel.fr"),
        ". Cliquez dans une case pour ajouter un RDV, sur un RDV pour le modifier. Les RDV saisis dans Outlook apparaissent ici ; un RDV est rattaché à un technicien par sa catégorie Outlook (= son nom), s'il est invité, ou si ses initiales figurent en majuscules dans le titre (ex. « MP GDN »)."
      ),
      React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 } },
        React.createElement('button', { onClick: () => setPlSemaine(plAjout(plSemaine, -7)), style: btnS }, "◀"),
        React.createElement('button', { onClick: () => setPlSemaine(plLundi(new Date())), style: btnS }, "Aujourd'hui"),
        React.createElement('button', { onClick: () => setPlSemaine(plAjout(plSemaine, 7)), style: btnS }, "▶"),
        React.createElement('span', { style: { fontSize: 14, fontWeight: 600, color: "#1a1a3e", marginLeft: 6 } }, "Semaine du " + fmtJour(plSemaine) + " au " + fmtJour(plAjout(plSemaine, nbJours - 1))),
        React.createElement('label', { style: { marginLeft: isMobile ? 0 : "auto", fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" } },
          React.createElement('input', { type: "checkbox", checked: plWeekend, onChange: e => setPlWeekend(e.target.checked) }), "Week-end"),
        React.createElement('button', { onClick: loadPlanning, style: btnS, disabled: plLoading }, plLoading ? "…" : "↻ Actualiser"),
        React.createElement('button', { onClick: () => plOuvrirNouveau(jours.includes(auj) ? auj : plSemaine, null), style: { ...btnS, background: G, border: "none", color: "#111", fontWeight: 600 } }, "+ Nouveau RDV")
      ),
      plErr && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 } }, plErr),
      React.createElement('div', { style: { overflowX: "auto", background: "white", border: "1px solid #E8E8F0", borderRadius: 10, opacity: plLoading ? 0.6 : 1 } },
        React.createElement('table', { style: { borderCollapse: "collapse", width: "100%", minWidth: 150 + nbJours * 150, tableLayout: "fixed" } },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement('th', { style: { width: 140, padding: "9px 10px", fontSize: 11.5, color: "#888", textAlign: "left", borderBottom: "1px solid #E8E8F0", background: "#FAFAFC" } }, "Technicien"),
            jours.map(j => React.createElement('th', { key: j, style: { padding: "9px 8px", fontSize: 11.5, textAlign: "left", borderBottom: "1px solid #E8E8F0", borderLeft: "1px solid #F0F0F5", background: j === auj ? "#FBF6E6" : "#FAFAFC", color: j === auj ? G2 : "#555", fontWeight: 600 } }, fmtJour(j)))
          )),
          React.createElement('tbody', null, lignes.map(l => React.createElement('tr', { key: l.id },
            React.createElement('td', { style: { padding: "8px 10px", fontSize: 12.5, fontWeight: 600, color: "#1a1a3e", borderBottom: "1px solid #F0F0F5", verticalAlign: "top", background: "#FCFCFE" } },
              React.createElement('span', { style: { display: "inline-block", width: 8, height: 8, borderRadius: 4, background: l.couleur, marginRight: 6 } }), l.nom),
            jours.map(j => React.createElement('td', { key: j, onClick: () => plOuvrirNouveau(j, l.email ? l : null), title: "Ajouter un RDV", style: { padding: 5, borderBottom: "1px solid #F0F0F5", borderLeft: "1px solid #F0F0F5", verticalAlign: "top", cursor: "copy", height: 64, background: j === auj ? "#FFFCF3" : "white" } },
              evtsDe(l, j).map(e => React.createElement('div', { key: e.id, onClick: (ev) => { ev.stopPropagation(); plOuvrirEdition(e); }, title: e.titre + (e.lieu ? " — " + e.lieu : ""),
                style: { background: l.couleur + "1A", borderLeft: "3px solid " + l.couleur, borderRadius: 5, padding: "4px 6px", marginBottom: 4, fontSize: 11.5, cursor: "pointer", color: "#222", overflow: "hidden" } },
                React.createElement('div', { style: { fontWeight: 600, color: l.couleur, fontSize: 10.5 } }, e.journee ? "Journée" : ((e.debut || "").slice(11, 16) + "–" + (e.fin || "").slice(11, 16))),
                React.createElement('div', { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, e.titre),
                e.lieu && React.createElement('div', { style: { fontSize: 10.5, color: "#777", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, "📍 " + e.lieu)
              ))
            ))
          )))
        )
      ),
      f && React.createElement('div', { onClick: () => !plSaving && setPlModal(null), style: { position: "fixed", inset: 0, background: "rgba(10,10,30,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } },
        React.createElement('div', { onClick: e => e.stopPropagation(), style: { background: "white", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 22, boxShadow: "0 10px 40px rgba(0,0,0,.25)" } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", marginBottom: 6 } },
            React.createElement('div', { style: { fontSize: 16, fontWeight: 600, color: "#1a1a3e", flex: 1 } }, f.id ? "Modifier le RDV" : "Nouveau RDV"),
            f.lien && React.createElement('a', { href: f.lien, target: "_blank", rel: "noreferrer", style: { fontSize: 11.5, color: G2, textDecoration: "none" } }, "Ouvrir dans Outlook ↗")
          ),
          React.createElement('label', { style: lblS }, "Titre *"),
          React.createElement('input', { value: f.titre, onChange: e => setF({ titre: e.target.value }), placeholder: "Ex. Intervention serveur, Astreinte, Congés…", style: inputS, autoFocus: true }),
          React.createElement('label', { style: lblS }, "Lieu / hôtel"),
          React.createElement('input', { value: f.lieu, onChange: e => setF({ lieu: e.target.value }), list: "pl-hotels", placeholder: "Choisir un hôtel ou saisir un lieu", style: inputS }),
          React.createElement('datalist', { id: "pl-hotels" }, hotels.map(h => React.createElement('option', { key: h.id, value: h.name }))),
          React.createElement('label', { style: { ...lblS, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: f.journee, onChange: e => setF({ journee: e.target.checked }) }), "Journée entière"),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", columnGap: 10 } },
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Du"), React.createElement('input', { type: "date", value: f.date, onChange: e => setF({ date: e.target.value, dateFin: (f.dateFin && f.dateFin >= e.target.value) ? f.dateFin : e.target.value }), style: inputS })),
            !f.journee && React.createElement('div', null, React.createElement('label', { style: lblS }, "à"), React.createElement('input', { type: "time", value: f.heureDebut, onChange: e => setF({ heureDebut: e.target.value }), style: inputS })),
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Au"), React.createElement('input', { type: "date", value: f.dateFin, min: f.date, onChange: e => setF({ dateFin: e.target.value }), style: inputS })),
            !f.journee && React.createElement('div', null, React.createElement('label', { style: lblS }, "à"), React.createElement('input', { type: "time", value: f.heureFin, onChange: e => setF({ heureFin: e.target.value }), style: inputS }))
          ),
          React.createElement('label', { style: lblS }, "Technicien(s)"),
          React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
            plData.equipe.map(m => {
              const on = f.techs.includes(m.email);
              return React.createElement('button', { key: m.email, type: "button", onClick: () => setF({ techs: on ? f.techs.filter(x => x !== m.email) : [...f.techs, m.email] }),
                style: { padding: "5px 10px", borderRadius: 16, fontSize: 12, cursor: "pointer", border: "1px solid " + (on ? G : "#DDD"), background: on ? "#FBF3DC" : "white", color: on ? "#7A5E12" : "#555", fontWeight: on ? 600 : 400 } }, (on ? "✓ " : "") + m.nom);
            })
          ),
          React.createElement('label', { style: { ...lblS, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 400 } },
            React.createElement('input', { type: "checkbox", checked: f.inviter, onChange: e => setF({ inviter: e.target.checked }) }), "Envoyer une invitation Outlook aux techniciens sélectionnés"),
          React.createElement('label', { style: lblS }, "Notes"),
          React.createElement('textarea', { value: f.notes, onChange: e => setF({ notes: e.target.value, notesModif: true }), rows: 3, style: { ...inputS, resize: "vertical" } }),
          f.id && !f.notesModif && f.notes && f.notes.length >= 250 && React.createElement('div', { style: { fontSize: 10.5, color: "#999", marginTop: 3 } }, "Aperçu des notes (tronqué). Elles ne sont pas modifiées si vous n'y touchez pas."),
          plModalErr && React.createElement('div', { style: { color: "#C53030", fontSize: 12.5, marginTop: 10 } }, plModalErr),
          React.createElement('div', { style: { display: "flex", gap: 8, marginTop: 18, alignItems: "center" } },
            f.id && React.createElement('button', { onClick: plSupprimer, disabled: plSaving, style: { padding: "8px 14px", background: "none", border: "1px solid #FFCDD2", color: "#C53030", borderRadius: 7, fontSize: 12, cursor: "pointer", marginRight: "auto" } }, "Supprimer"),
            React.createElement('button', { onClick: () => setPlModal(null), disabled: plSaving, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", marginLeft: f.id ? 0 : "auto" } }, "Annuler"),
            React.createElement('button', { onClick: plEnregistrer, disabled: plSaving, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: plSaving ? 0.6 : 1 } }, plSaving ? "Enregistrement…" : "Enregistrer")
          )
        )
      )
    );
    // Mobile : vue jour + la même fenêtre d'ajout / modification de RDV (dernier enfant du rendu bureau)
    if (isMobile) {
      const enfants = [].concat(contenuBureau.props.children);
      content = React.createElement('div', null, contenuMobile, enfants[enfants.length - 1] || null);
    } else {
      content = contenuBureau;
    }
  return content;
}
