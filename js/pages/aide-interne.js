// ===== Page « aide-interne » — condition dans App : page === "aide-interne" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_aide_interne({...}) de app.js.
function Page_aide_interne(ctx) {
  let content = ctx.content;
  const {
    AIDE_CATS, aideCatFilter, aideErr, aideExistingFiles, aideFiles, aideForm, aideLoading, aideModal,
    aideNewFiles, aideOpenId, aideProcs, aideSaving, aideSearch, deleteAide, isMobile, loadAideProcs,
    openEditAide, openNewAide, openViewer, removeExistingAideFile, setAideCatFilter, setAideForm,
    setAideModal, setAideNewFiles, setAideOpenId, setAideSearch, submitAideForm
  } = ctx;
    const inp = { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 5 };
    const usedCats = [...new Set(aideProcs.map(p => p.categorie).filter(Boolean))];
    let visibles = aideCatFilter === "all" ? aideProcs : aideProcs.filter(p => p.categorie === aideCatFilter);
    if (aideSearch.trim()) {
      const s = aideSearch.trim().toLowerCase();
      visibles = visibles.filter(p => (p.titre || "").toLowerCase().includes(s) || (p.contenu || "").toLowerCase().includes(s));
    }
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Procédures et documentation à usage interne pour les équipes DSI Hotel (onboarding, mémos techniques, bonnes pratiques…). Visibles uniquement par les administrateurs."
      ),
      // Barre : recherche + nouveau
      React.createElement('div', { style: { display: "flex", gap: 9, marginBottom: 14, flexWrap: "wrap", alignItems: "center" } },
        React.createElement('input', { value: aideSearch, onChange: e => setAideSearch(e.target.value), placeholder: "🔍 Rechercher une procédure interne…", style: { flex: "1 1 240px", padding: "8px 13px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, outline: "none" } }),
        React.createElement('button', { onClick: loadAideProcs, style: { padding: "8px 12px", border: "1px solid #DDD", background: "white", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🔄 Actualiser"),
        React.createElement('button', { onClick: openNewAide, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "9px 16px" } }, "+ Nouvelle procédure")
      ),
      // Filtres catégories
      usedCats.length > 0 && React.createElement('div', { style: { display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" } },
        ["all", ...usedCats].map(c => React.createElement('button', { key: c, onClick: () => setAideCatFilter(c), style: { padding: "5px 12px", border: `1px solid ${aideCatFilter === c ? G : "#DDD"}`, background: aideCatFilter === c ? G + "18" : "white", color: aideCatFilter === c ? G2 : "#555", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: aideCatFilter === c ? 500 : 400 } }, c === "all" ? "Toutes" : c))
      ),
      aideLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      !aideLoading && aideProcs.length === 0 && React.createElement('div', { style: { textAlign: "center", padding: 42, background: "#FAFAFC", border: "1px dashed #DDD", borderRadius: 10, color: "#999", fontSize: 13 } }, "Aucune procédure interne pour le moment. Créez-en une !"),
      !aideLoading && aideProcs.length > 0 && visibles.length === 0 && React.createElement('div', { style: { textAlign: "center", padding: 28, background: "white", border: "1px solid #E8E8F0", borderRadius: 10, color: "#999", fontSize: 13 } }, "Aucun résultat pour cette recherche."),
      // Liste
      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
        visibles.map(p => {
          const open = aideOpenId === p.id;
          const fl = aideFiles[p.id] || [];
          const imgs = fl.filter(f => isImageFile(f.file_name));
          const docs = fl.filter(f => !isImageFile(f.file_name));
          return React.createElement('div', { key: p.id, style: { background: "#FFF", border: "1px solid #ECECF2", borderRadius: 10, overflow: "hidden" } },
            React.createElement('div', { onClick: () => setAideOpenId(open ? null : p.id), style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 16px", cursor: "pointer" } },
              React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 } },
                React.createElement('span', { style: { color: "#999", fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" } }, "▶"),
                p.epingle && React.createElement('span', { style: { fontSize: 13 } }, "⭐"),
                React.createElement('span', { style: { fontSize: 14, fontWeight: 700, color: SB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.titre),
                p.categorie && React.createElement('span', { style: { fontSize: 10, color: "#888", background: "#F0F0F8", padding: "2px 8px", borderRadius: 20, flexShrink: 0 } }, p.categorie),
                fl.length > 0 && React.createElement('span', { style: { fontSize: 10.5, color: "#AAA", flexShrink: 0 } }, "📎 " + fl.length),
                p.video_url && (() => { const n = videosInternesLire(p.video_url).length; return React.createElement('span', { title: n > 1 ? n + " vidéos" : "Contient une vidéo", style: { fontSize: 11, color: "#888", flexShrink: 0 } }, "🎬" + (n > 1 ? " " + n : "")); })()
              ),
              React.createElement('button', { onClick: e => { e.stopPropagation(); openEditAide(p); }, style: { flexShrink: 0, padding: "6px 12px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "✏️ Modifier")
            ),
            open && React.createElement('div', { style: { padding: "0 16px 16px", borderTop: "1px solid #F2F2F6" } },
              p.contenu && React.createElement('div', { style: { fontSize: 13, color: "#444", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: "12px 0" } }, p.contenu),
              (() => {
                const liste = videosInternesLire(p.video_url).map(x => ({ ...x, info: videoInterneInfo(x.url) })).filter(x => x.info);
                if (!liste.length) return null;
                return React.createElement('div', { style: { margin: "12px 0", display: "flex", flexDirection: "column", gap: 14 } },
                  liste.map((x, k) => React.createElement('div', { key: k },
                    React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600, color: SB, marginBottom: 6 } }, "🎬 " + (x.titre || (liste.length > 1 ? "Vidéo " + (k + 1) : "Vidéo"))),
                    x.info.embed && React.createElement('div', { style: { position: "relative", width: "100%", maxWidth: 760, paddingTop: "min(56.25%, 428px)", borderRadius: 8, overflow: "hidden", background: "#000", marginBottom: 6 } },
                      React.createElement('iframe', { src: x.info.embed, title: x.titre || "Vidéo", allow: "autoplay; encrypted-media; fullscreen; picture-in-picture", allowFullScreen: true, frameBorder: "0", style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 } })
                    ),
                    React.createElement('a', { href: x.info.lien, target: "_blank", rel: "noopener noreferrer", style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#fff", background: SB, textDecoration: "none", padding: "7px 14px", borderRadius: 7 } }, x.info.embed ? "↗ Ouvrir dans un nouvel onglet" : "▶ Voir la vidéo (SharePoint)")
                  ))
                );
              })(),
              imgs.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: docs.length ? 10 : 0 } },
                imgs.map((f, i) => React.createElement('img', { key: f.id, src: f.file_url, alt: f.file_name, title: f.file_name, onClick: () => openViewer(imgs, i), style: { width: 80, height: 80, objectFit: "cover", borderRadius: 7, border: "1px solid #E2E2E8", cursor: "zoom-in" } }))
              ),
              docs.length > 0 && React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 6 } },
                docs.map((f, i) => React.createElement(DocApercu, { key: f.id || i, f }))
              )
            )
          );
        })
      ),

      // ---- MODALE création / édition ----
      aideModal && aideForm && React.createElement('div', { onClick: (e) => { if (e.target === e.currentTarget) setAideModal(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "12px" : "40px 20px", zIndex: 1000, overflowY: "auto" } },
        React.createElement('div', { onClick: e => e.stopPropagation(), style: { background: "#FFF", borderRadius: 12, padding: isMobile ? 18 : 26, width: "100%", maxWidth: 640, boxShadow: "0 12px 40px rgba(0,0,0,.25)", marginBottom: 30 } },
          React.createElement('h3', { style: { margin: "0 0 18px", fontSize: 18, color: SB } }, aideModal === "new" ? "Nouvelle procédure interne" : "Modifier la procédure interne"),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 12, marginBottom: 12 } },
            React.createElement('div', null,
              React.createElement('label', { style: lbl }, "Titre *"),
              React.createElement('input', { value: aideForm.titre, onChange: e => setAideForm({ ...aideForm, titre: e.target.value }), placeholder: "Ex. : Procédure d'onboarding d'un nouveau technicien", style: inp })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl }, "Catégorie"),
              React.createElement('select', { value: aideForm.categorie, onChange: e => setAideForm({ ...aideForm, categorie: e.target.value }), style: inp },
                AIDE_CATS.map(c => React.createElement('option', { key: c, value: c }, c))
              )
            )
          ),
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('label', { style: lbl }, "Contenu de la procédure"),
            React.createElement('textarea', { value: aideForm.contenu, onChange: e => setAideForm({ ...aideForm, contenu: e.target.value }), placeholder: "Rédigez les étapes, notes, bonnes pratiques…", style: { ...inp, minHeight: 160, resize: "vertical" } })
          ),
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('label', { style: lbl }, "🎬 Vidéos (liens SharePoint, Stream, YouTube ou Vimeo)"),
            (aideForm.videos || []).map((v, k) => {
              const info = videoInterneInfo(v.url);
              const setV = (champ, val) => setAideForm(prev => ({ ...prev, videos: (prev.videos || []).map((x, j) => j === k ? { ...x, [champ]: val } : x) }));
              return React.createElement('div', { key: k, style: { border: "1px solid #ECECF2", borderRadius: 8, padding: 8, marginBottom: 6, background: "#FBFBFE" } },
                React.createElement('div', { style: { display: "flex", gap: 6 } },
                  React.createElement('input', { value: v.titre, onChange: e => setV("titre", e.target.value), placeholder: "Titre (ex. : Restauration d'une VM)", style: { ...inp, flex: "0 0 36%" } }),
                  React.createElement('input', { value: v.url, onChange: e => setV("url", e.target.value), placeholder: "Lien de la vidéo ou code « Intégrer » (<iframe…>)", style: { ...inp, flex: 1 } }),
                  React.createElement('button', { type: "button", title: "Retirer cette vidéo", onClick: () => setAideForm(prev => { const l = (prev.videos || []).filter((_, j) => j !== k); return { ...prev, videos: l.length ? l : [{ titre: "", url: "" }] }; }), style: { flexShrink: 0, border: "1px solid #F5B5B5", background: "white", color: "#C53030", borderRadius: 7, cursor: "pointer", padding: "0 10px", fontSize: 13 } }, "✕")
                ),
                String(v.url || "").trim() && React.createElement('div', { style: { fontSize: 11, marginTop: 4, color: info ? (info.embed ? "#2F855A" : "#B7791F") : "#C53030" } },
                  info ? (info.embed ? "✓ Lue dans le portail." : "↗ S'ouvrira dans un nouvel onglet (SharePoint).") : "Lien non reconnu : il doit commencer par https://")
              );
            }),
            React.createElement('button', { type: "button", onClick: () => setAideForm(prev => ({ ...prev, videos: [...(prev.videos || []), { titre: "", url: "" }] })), style: { marginTop: 2, border: "1px dashed " + G, background: "#FFFDF5", color: G2, borderRadius: 7, cursor: "pointer", padding: "6px 12px", fontSize: 12, fontWeight: 600 } }, "＋ Ajouter une vidéo"),
            React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 6, lineHeight: 1.5 } },
              "Pour lire une vidéo directement dans le portail : dans SharePoint, ouvrez la vidéo › « … » › Intégrer, puis collez le code. Un simple lien de partage s'ouvrira dans un nouvel onglet.")
          ),
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#444", cursor: "pointer" } },
              React.createElement('input', { type: "checkbox", checked: aideForm.epingle, onChange: e => setAideForm({ ...aideForm, epingle: e.target.checked }) }),
              "⭐ Épingler en haut de la liste"
            )
          ),
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('label', { style: lbl }, "📎 Pièces jointes (PDF, Word, Excel, images)"),
            aideExistingFiles.length > 0 && React.createElement('div', { style: { marginBottom: 7, display: "flex", flexDirection: "column", gap: 5 } },
              aideExistingFiles.map(f => React.createElement('div', { key: f.id, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
                isImageFile(f.file_name) ? React.createElement('img', { src: f.file_url, style: { width: 24, height: 24, objectFit: "cover", borderRadius: 4 } }) : React.createElement('span', null, FILE_ICONS[fileExt(f.file_name)] || "📄"),
                React.createElement('a', { href: f.file_url, target: "_blank", rel: "noreferrer", style: { flex: 1, color: "#333", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.file_name),
                React.createElement('button', { onClick: () => removeExistingAideFile(f.id), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
              ))
            ),
            React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => setAideNewFiles(prev => [...prev, ...Array.from(e.target.files)]), style: { fontSize: 12 } }),
            aideNewFiles.length > 0 && React.createElement('div', { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 5 } },
              aideNewFiles.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
                React.createElement('span', null, "🆕"),
                React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
                React.createElement('button', { onClick: () => setAideNewFiles(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
              ))
            )
          ),
          aideErr && React.createElement('div', { style: { background: "#FFF5F5", border: "1px solid #FEB2B2", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#C53030", marginBottom: 12 } }, aideErr),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" } },
            aideModal !== "new" && React.createElement('button', { onClick: () => deleteAide(aideModal), style: { marginRight: "auto", padding: "8px 14px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🗑 Supprimer"),
            React.createElement('button', { onClick: () => setAideModal(null), style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: submitAideForm, disabled: aideSaving, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: aideSaving ? "default" : "pointer", opacity: aideSaving ? 0.6 : 1 } }, aideSaving ? "Enregistrement…" : (aideModal === "new" ? "Créer" : "Enregistrer"))
          )
        )
      )
    );
  return content;
}
