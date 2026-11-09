// ===== Page « reponses-types » — condition dans App : page === "reponses-types" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_reponses_types({...}) de app.js.
function Page_reponses_types(ctx) {
  let content = ctx.content;
  const {
    deleteReponse, isMobile, openEditReponse, openNewReponse, openRtId, reponsesTypes, rtEditorImgInput,
    rtErr, rtForm, rtInsertImageInEditor, rtLoading, rtModal, rtSaving, rtUploading, setOpenRtId, setRtForm,
    setRtModal, submitRtForm, triggerRtEditorImage
  } = ctx;
    const inp = { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 5 };
    content = React.createElement('div', null,
      React.createElement('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 } },
        React.createElement('p', { style: { margin: 0, fontSize: 13, color: "#777" } }, "Réponses pré-rédigées à insérer rapidement dans un ticket"),
        React.createElement('button', { onClick: openNewReponse, style: { padding: "9px 16px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "+ Nouvelle réponse")
      ),
      rtLoading
        ? React.createElement('div', { style: { textAlign: "center", padding: 40, color: "#999" } }, "Chargement…")
        : reponsesTypes.length === 0
          ? React.createElement('div', { style: { textAlign: "center", padding: 48, background: "#FAFAFC", border: "1px dashed #DDD", borderRadius: 10, color: "#999" } }, "Aucune réponse type. Créez-en une pour gagner du temps.")
          : React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
              reponsesTypes.map(r => {
                const open = openRtId === r.id;
                return React.createElement('div', { key: r.id, style: { background: "#FFF", border: "1px solid #ECECF2", borderRadius: 10, overflow: "hidden" } },
                  React.createElement('div', {
                    onClick: () => setOpenRtId(open ? null : r.id),
                    style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 16px", cursor: "pointer" }
                  },
                    React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 } },
                      React.createElement('span', { style: { color: "#999", fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" } }, "▶"),
                      React.createElement('span', { style: { fontSize: 14, fontWeight: 700, color: SB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "💬 " + r.titre)
                    ),
                    React.createElement('button', { onClick: e => { e.stopPropagation(); openEditReponse(r); }, style: { flexShrink: 0, padding: "6px 12px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "✏️ Modifier")
                  ),
                  open && (r.contenu_html || r.contenu) && React.createElement(RichHtml, { html: r.contenu_html || ("<p>" + String(r.contenu).replace(/</g, "&lt;").replace(/\n/g, "<br>") + "</p>"), style: { fontSize: 12.5, color: "#555", padding: "0 16px 14px", borderTop: "1px solid #F2F2F6" } })
                );
              })
            ),

      // ---- MODALE création / édition ----
      rtModal && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "12px" : "40px 20px", zIndex: 1000, overflowY: "auto" }, onClick: () => setRtModal(null) },
        React.createElement('div', { onClick: e => e.stopPropagation(), style: { background: "#FFF", borderRadius: 12, padding: isMobile ? 18 : 26, width: "100%", maxWidth: 580, boxShadow: "0 12px 40px rgba(0,0,0,.25)" } },
          React.createElement('h3', { style: { margin: "0 0 18px", fontSize: 18, color: SB } }, rtModal === "new" ? "Nouvelle réponse type" : "Modifier la réponse type"),
          React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement('label', { style: lbl }, "Titre"),
            React.createElement('input', { value: rtForm.titre, onChange: e => setRtForm({ ...rtForm, titre: e.target.value }), placeholder: "Ex. : Procédure réinitialisation mot de passe", style: inp })
          ),
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('label', { style: lbl }, "Contenu de la réponse (texte et images)"),
            React.createElement(RichEditor, {
              key: (rtModal && rtModal !== "new" && rtModal.id) ? rtModal.id : "new",
              value: rtForm.contenu_html,
              onChange: html => setRtForm(prev => ({ ...prev, contenu_html: html })),
              onInsertImage: triggerRtEditorImage,
              busy: rtUploading,
              placeholder: "Rédigez la réponse, insérez des images où vous voulez…"
            }),
            React.createElement('input', {
              ref: rtEditorImgInput, type: "file", accept: "image/*",
              onChange: e => { const f = (e.target.files || [])[0]; if (f) rtInsertImageInEditor(f); e.target.value = ""; },
              style: { display: "none" }
            }),
            React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 6 } }, "Astuce : placez le curseur à l'endroit voulu, puis cliquez « 🖼 Insérer une image ».")
          ),
          rtErr && React.createElement('div', { style: { background: "#FFF5F5", border: "1px solid #FEB2B2", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#C53030", marginBottom: 12 } }, rtErr),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" } },
            rtModal !== "new" && React.createElement('button', { onClick: () => deleteReponse(rtModal), style: { marginRight: "auto", padding: "8px 14px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🗑 Supprimer"),
            React.createElement('button', { onClick: () => setRtModal(null), style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: submitRtForm, disabled: rtSaving, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: rtSaving ? "default" : "pointer", opacity: rtSaving ? 0.6 : 1 } }, rtSaving ? "Enregistrement…" : (rtModal === "new" ? "Créer" : "Enregistrer"))
          )
        )
      )
    );
  return content;
}
