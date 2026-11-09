// ===== Page « projets » — condition dans App : page === "projets" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_projets({...}) de app.js.
function Page_projets(ctx) {
  let content = ctx.content;
  const {
    addTacheToForm, deleteProjet, dragOverCol, dragProjId, hotels, isMobile, loadProjets, moveProjetToStatut,
    openEditProjet, openNewProjet, projErr, projExistingFiles, projFichiers, projFilterHotel, projForm,
    projModal, projNewFiles, projNewTache, projTacheList, projTaches, projets, projetsLoading,
    removeExistingProjFile, savingProj, setDragOverCol, setDragProjId, setProjFilterHotel, setProjForm,
    setProjModal, setProjNewFiles, setProjNewTache, setProjTacheList, submitProjForm
  } = ctx;
    const prioColorP = (p) => ({ "Urgent": "#E53E3E", "Haute": "#DD6B20", "Moyenne": "#3182CE", "Basse": "#718096" }[p] || "#718096");
    const visibles = projFilterHotel === "all" ? projets : projets.filter(p => p.hotel_id === projFilterHotel);
    const fmtBudget = (b) => b == null ? null : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(b);
    const isLate = (p) => p.date_echeance && p.statut !== "done" && new Date(p.date_echeance) < new Date(new Date().toDateString());

    const inputS = { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, fontFamily: "inherit", outline: "none" };
    const labelS = { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 };

    const card = (p) => {
      const taches = projTaches[p.id] || [];
      const fichiers = projFichiers[p.id] || [];
      const doneCount = taches.filter(t => t.done).length;
      const pct = taches.length ? Math.round(doneCount / taches.length * 100) : 0;
      const h = hotels.find(x => x.id === p.hotel_id);
      return React.createElement('div', {
        key: p.id,
        draggable: true,
        onDragStart: () => setDragProjId(p.id),
        onDragEnd: () => { setDragProjId(null); setDragOverCol(null); },
        onClick: () => openEditProjet(p),
        style: {
          background: "white", borderRadius: 9,
          border: `1px solid ${isLate(p) ? "#FEB2B2" : "#E8E8F0"}`,
          borderLeft: `3px solid ${prioColorP(p.priorite)}`,
          padding: 12, marginBottom: 9, cursor: "grab",
          opacity: dragProjId === p.id ? 0.45 : 1,
          boxShadow: "0 1px 2px rgba(15,15,36,.05)"
        }
      },
        React.createElement('div', { style: { display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7 } },
          React.createElement('span', { style: { flex: 1, fontSize: 12.5, fontWeight: 600, color: "#1a1a3e", lineHeight: 1.35 } }, p.titre),
          React.createElement('span', { style: { fontSize: 9, fontWeight: 700, color: prioColorP(p.priorite), background: prioColorP(p.priorite) + "18", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" } }, p.priorite)
        ),
        h && React.createElement('div', { style: { fontSize: 10.5, color: "#888", marginBottom: 5 } }, "🏨 " + h.name),
        (p.responsable || p.technicien) && React.createElement('div', { style: { fontSize: 10.5, color: "#777", marginBottom: 5, lineHeight: 1.6 } },
          p.responsable && React.createElement('div', null, "👤 Resp. : " + p.responsable),
          p.technicien && React.createElement('div', null, "🔧 Tech. : " + p.technicien)
        ),
        p.budget != null && React.createElement('div', { style: { fontSize: 10.5, color: G2, fontWeight: 600, marginBottom: 5 } }, "💰 " + fmtBudget(p.budget)),
        p.date_echeance && React.createElement('div', { style: { fontSize: 10.5, color: isLate(p) ? "#C53030" : "#888", fontWeight: isLate(p) ? 600 : 400, marginBottom: 5 } },
          (isLate(p) ? "⚠️ " : "📅 ") + new Date(p.date_echeance).toLocaleDateString("fr-FR")),
        taches.length > 0 && React.createElement('div', { style: { marginTop: 8, marginBottom: 4 } },
          React.createElement('div', { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginBottom: 3 } },
            React.createElement('span', null, "✓ " + doneCount + "/" + taches.length + " tâches"),
            React.createElement('span', null, pct + "%")
          ),
          React.createElement('div', { style: { height: 4, background: "#EEE", borderRadius: 4, overflow: "hidden" } },
            React.createElement('div', { style: { width: pct + "%", height: "100%", background: pct === 100 ? "#48BB78" : G, transition: "width .2s" } })
          )
        ),
        fichiers.length > 0 && React.createElement('div', { style: { fontSize: 10, color: "#AAA", marginTop: 6 } }, "📎 " + fichiers.length + " pièce(s) jointe(s)")
      );
    };

    const column = (key, label, emoji, accent) => {
      const items = visibles.filter(p => p.statut === key);
      const totalBudget = items.reduce((s, p) => s + (p.budget || 0), 0);
      return React.createElement('div', {
        key,
        onDragOver: (e) => { e.preventDefault(); setDragOverCol(key); },
        onDragLeave: () => setDragOverCol(prev => prev === key ? null : prev),
        onDrop: (e) => { e.preventDefault(); if (dragProjId) moveProjetToStatut(dragProjId, key); setDragProjId(null); setDragOverCol(null); },
        style: {
          background: dragOverCol === key ? accent + "14" : "#F6F7FB",
          border: `1.5px ${dragOverCol === key ? "dashed" : "solid"} ${dragOverCol === key ? accent : "#E4E6F0"}`,
          borderRadius: 11, padding: 11, minWidth: isMobile ? "100%" : 250,
          flex: isMobile ? "none" : "1 1 250px", minHeight: 140, transition: "background .15s"
        }
      },
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 7, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${accent}44` } },
          React.createElement('span', { style: { fontSize: 14 } }, emoji),
          React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: "#1a1a3e", flex: 1 } }, label),
          React.createElement('span', { style: { fontSize: 10, fontWeight: 700, color: accent, background: accent + "1E", padding: "2px 8px", borderRadius: 20 } }, items.length)
        ),
        totalBudget > 0 && React.createElement('div', { style: { fontSize: 10, color: "#999", marginBottom: 8, textAlign: "right" } }, "Σ " + fmtBudget(totalBudget)),
        items.map(card),
        items.length === 0 && React.createElement('div', { style: { padding: "18px 8px", textAlign: "center", fontSize: 11, color: "#BBB", fontStyle: "italic" } }, "Déposez un projet ici")
      );
    };

    content = React.createElement('div', null,
      React.createElement('div', { style: { display: "flex", gap: 9, marginBottom: 14, flexWrap: "wrap", alignItems: "center" } },
        React.createElement('select', { value: projFilterHotel, onChange: e => setProjFilterHotel(e.target.value), style: { padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 12, background: "white" } },
          React.createElement('option', { value: "all" }, "Tous les hôtels"),
          hotels.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
        ),
        React.createElement('button', { onClick: loadProjets, style: { padding: "7px 12px", border: "1px solid #DDD", background: "white", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🔄 Actualiser"),
        React.createElement('button', { onClick: openNewProjet, style: { marginLeft: isMobile ? 0 : "auto", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "8px 14px" } }, "+ Nouveau projet")
      ),
      projetsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement des projets..."),
      React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: isMobile ? "wrap" : "nowrap", alignItems: "flex-start", overflowX: isMobile ? "visible" : "auto", paddingBottom: 8 } },
        column("todo", "À faire", "📋", "#718096"),
        column("doing", "En cours", "⚙️", "#3182CE"),
        column("waiting", "En attente", "⏸️", "#DD6B20"),
        column("done", "Terminé", "✅", "#38A169")
      ),
      !projetsLoading && projets.length === 0 && React.createElement('div', { style: { marginTop: 16, background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 26, textAlign: "center", color: "#999", fontSize: 13 } }, "Aucun projet pour le moment. Créez-en un !"),

      // ---------- MODALE PROJET ----------
      projModal && projForm && React.createElement('div', {
        onClick: (e) => { if (e.target === e.currentTarget) setProjModal(null); },
        style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 80, padding: isMobile ? 12 : 30, overflowY: "auto" }
      },
        React.createElement('div', { style: { background: "white", borderRadius: 13, padding: isMobile ? 18 : 24, width: 640, maxWidth: "100%", boxShadow: "0 12px 44px rgba(0,0,0,.3)", marginBottom: 30 } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", marginBottom: 16 } },
            React.createElement('div', { style: { fontSize: 15, fontWeight: 600, color: "#1a1a3e", flex: 1 } }, projModal === "new" ? "Nouveau projet" : "Modifier le projet"),
            React.createElement('button', { onClick: () => setProjModal(null), style: { background: "none", border: "none", fontSize: 20, color: "#AAA", cursor: "pointer", lineHeight: 1, padding: 4 } }, "✕")
          ),

          React.createElement('div', { style: { marginBottom: 11 } },
            React.createElement('label', { style: labelS }, "Titre du projet *"),
            React.createElement('input', { value: projForm.titre, onChange: e => setProjForm({ ...projForm, titre: e.target.value }), placeholder: "ex : Migration Opera Cloud — Hôtel X", style: inputS })
          ),
          React.createElement('div', { style: { marginBottom: 11 } },
            React.createElement('label', { style: labelS }, "Description"),
            React.createElement('textarea', { value: projForm.description, onChange: e => setProjForm({ ...projForm, description: e.target.value }), placeholder: "Contexte, objectifs, livrables...", style: { ...inputS, minHeight: 76, resize: "vertical" } })
          ),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 11 } },
            React.createElement('div', null,
              React.createElement('label', { style: labelS }, "Hôtel concerné"),
              React.createElement('select', { value: projForm.hotel_id, onChange: e => setProjForm({ ...projForm, hotel_id: e.target.value }), style: inputS },
                React.createElement('option', { value: "" }, "— Aucun / interne —"),
                hotels.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { style: labelS }, "Statut"),
              React.createElement('select', { value: projForm.statut, onChange: e => setProjForm({ ...projForm, statut: e.target.value }), style: inputS },
                React.createElement('option', { value: "todo" }, "📋 À faire"),
                React.createElement('option', { value: "doing" }, "⚙️ En cours"),
                React.createElement('option', { value: "waiting" }, "⏸️ En attente"),
                React.createElement('option', { value: "done" }, "✅ Terminé")
              )
            )
          ),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 11 } },
            React.createElement('div', null,
              React.createElement('label', { style: labelS }, "Responsable"),
              React.createElement('input', { value: projForm.responsable, onChange: e => setProjForm({ ...projForm, responsable: e.target.value }), placeholder: "Nom du responsable", style: inputS })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: labelS }, "Technicien assigné"),
              React.createElement('input', { value: projForm.technicien, onChange: e => setProjForm({ ...projForm, technicien: e.target.value }), placeholder: "Nom du technicien", style: inputS })
            )
          ),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 11 } },
            React.createElement('div', null,
              React.createElement('label', { style: labelS }, "Priorité"),
              React.createElement('select', { value: projForm.priorite, onChange: e => setProjForm({ ...projForm, priorite: e.target.value }), style: inputS },
                ["Urgent", "Haute", "Moyenne", "Basse"].map(p => React.createElement('option', { key: p, value: p }, p))
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { style: labelS }, "Budget (€)"),
              React.createElement('input', { type: "number", step: "0.01", min: "0", value: projForm.budget, onChange: e => setProjForm({ ...projForm, budget: e.target.value }), placeholder: "0", style: inputS })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: labelS }, "Échéance"),
              React.createElement('input', { type: "date", value: projForm.date_echeance, onChange: e => setProjForm({ ...projForm, date_echeance: e.target.value }), style: inputS })
            )
          ),
          React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement('label', { style: labelS }, "Date de début"),
            React.createElement('input', { type: "date", value: projForm.date_debut, onChange: e => setProjForm({ ...projForm, date_debut: e.target.value }), style: { ...inputS, maxWidth: isMobile ? "100%" : 200 } })
          ),

          // Checklist
          React.createElement('div', { style: { marginBottom: 14, background: "#FAFAFC", border: "1px solid #EEE", borderRadius: 9, padding: 12 } },
            React.createElement('label', { style: { ...labelS, marginBottom: 8 } }, "✅ Checklist de tâches"),
            projTacheList.length > 0 && React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 9 } },
              projTacheList.map((t, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #EEE", borderRadius: 6, padding: "6px 9px" } },
                React.createElement('input', { type: "checkbox", checked: !!t.done, onChange: () => setProjTacheList(prev => prev.map((x, idx) => idx === i ? { ...x, done: !x.done } : x)), style: { cursor: "pointer" } }),
                React.createElement('span', { style: { flex: 1, fontSize: 12, color: t.done ? "#AAA" : "#333", textDecoration: t.done ? "line-through" : "none" } }, t.libelle),
                React.createElement('button', { onClick: () => setProjTacheList(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
              ))
            ),
            React.createElement('div', { style: { display: "flex", gap: 7 } },
              React.createElement('input', { value: projNewTache, onChange: e => setProjNewTache(e.target.value), onKeyDown: e => { if (e.key === "Enter") { e.preventDefault(); addTacheToForm(); } }, placeholder: "Ajouter une tâche puis Entrée...", style: { ...inputS, flex: 1 } }),
              React.createElement('button', { onClick: addTacheToForm, style: { padding: "8px 14px", background: SB, border: "none", color: G, borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" } }, "+ Ajouter")
            )
          ),

          // Pièces jointes
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('label', { style: labelS }, "📎 Pièces jointes (PDF, Word, Excel, images)"),
            projExistingFiles.length > 0 && React.createElement('div', { style: { marginBottom: 7, display: "flex", flexDirection: "column", gap: 5 } },
              projExistingFiles.map(f => React.createElement('div', { key: f.id, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
                isImageFile(f.file_name) ? React.createElement('img', { src: f.file_url, style: { width: 24, height: 24, objectFit: "cover", borderRadius: 4 } }) : React.createElement('span', null, FILE_ICONS[fileExt(f.file_name)] || "📄"),
                React.createElement('a', { href: f.file_url, target: "_blank", rel: "noreferrer", style: { flex: 1, color: "#333", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.file_name),
                React.createElement('button', { onClick: () => removeExistingProjFile(f.id), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
              ))
            ),
            React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => setProjNewFiles(prev => [...prev, ...Array.from(e.target.files)]), style: { fontSize: 12 } }),
            projNewFiles.length > 0 && React.createElement('div', { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 5 } },
              projNewFiles.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
                React.createElement('span', null, "🆕"),
                React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
                React.createElement('button', { onClick: () => setProjNewFiles(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
              ))
            )
          ),

          projErr && React.createElement('div', { style: { background: "#FFF5F5", border: "1px solid #FEB2B2", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#C53030", marginBottom: 12 } }, projErr),

          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" } },
            projModal !== "new" && React.createElement('button', { onClick: () => deleteProjet(projModal), style: { marginRight: "auto", padding: "8px 14px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🗑 Supprimer"),
            React.createElement('button', { onClick: () => setProjModal(null), style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: submitProjForm, disabled: savingProj, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: savingProj ? "default" : "pointer", opacity: savingProj ? 0.6 : 1 } }, savingProj ? "Enregistrement..." : (projModal === "new" ? "Créer le projet" : "Enregistrer"))
          )
        )
      )
    );
  return content;
}
