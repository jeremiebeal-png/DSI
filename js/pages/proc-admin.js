// ===== Page « proc-admin » — condition dans App : page === "proc-admin" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_proc_admin({...}) de app.js.
function Page_proc_admin(ctx) {
  let content = ctx.content;
  const {
    deleteProc, editCid, editingId, hotels, isMobile, kbCat, loadFilesFor, openEditProcForm, openNewProcForm,
    openViewer, procFiles, procForm, procFormExistingFiles, procFormFiles, procFormHotels, procedures, procq,
    procsLoading, removeExistingProcFile, savingProc, selId, setEditCid, setKbCat, setProcForm,
    setProcFormFiles, setProcFormHotels, setProcq, setSelId, setShowHotelPick, setShowProcForm,
    showHotelPick, showProcForm, submitProcForm
  } = ctx;
    const cats = [...new Set(procedures.map(p => p.category))];
    content = React.createElement('div', null,
      // ===== BARRE UNIQUE : recherche hôtels + procédures (remplace le menu déroulant) =====
      !selId && React.createElement('div', { style: { position: "relative", marginBottom: 14 } },
        React.createElement('div', { style: { display: "flex", gap: isMobile ? 8 : 12, alignItems: "stretch", flexWrap: isMobile ? "wrap" : "nowrap" } },
          React.createElement('div', { style: { flex: isMobile ? "1 1 100%" : 1, position: "relative", minWidth: 0 } },
            React.createElement('span', { style: { position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#b3b3c4", pointerEvents: "none" } }, "🔍"),
            React.createElement('input', { id: "procUniSearch", type: "text", autoComplete: "off", value: procq, onChange: e => setProcq(e.target.value), placeholder: "Rechercher un hôtel ou une procédure…", style: { width: "100%", padding: "13px 42px", border: `1.5px solid ${procq ? G : "#dcdce6"}`, borderRadius: 13, fontSize: 14.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "white" } }),
            procq && React.createElement('button', { onClick: () => setProcq(""), title: "Effacer", style: { position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#aaa", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 2 } }, "✕")
          ),
          React.createElement('button', { onClick: openNewProcForm, style: { display: "flex", alignItems: "center", gap: 6, background: G, border: "none", color: "#1c1c1c", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: isMobile ? "11px 20px" : "0 20px", whiteSpace: "nowrap", justifyContent: "center", flex: isMobile ? "1 1 100%" : "none" } }, "＋ Ajouter une procédure")
        ),
        procq.trim() && (() => {
          const nq = procq.trim().toLowerCase();
          const inc = (v) => (v || "").toLowerCase().includes(nq);
          const hres = hotels.filter(h => inc(h.name)).slice(0, 6);
          const pres = procedures.filter(p => inc(p.title) || inc(p.content) || inc(p.mots_cles)).slice(0, 8);
          const curNom = hotels.find(h => h.id === editCid)?.name || "";
          const secStyle = { fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#a0a0b5", padding: "10px 12px 6px" };
          const resStyle = { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer" };
          const icStyle = { width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, background: G + "24" };
          const items = [];
          if (hres.length) {
            items.push(React.createElement('div', { key: "hsec", style: secStyle }, "🏨 Hôtels"));
            hres.forEach(h => items.push(React.createElement('div', { key: "h" + h.id, onClick: () => { setEditCid(h.id); setSelId(null); setKbCat("all"); setProcq(""); }, onMouseDown: e => e.preventDefault(), style: resStyle, onMouseEnter: e => e.currentTarget.style.background = "#f5f5fb", onMouseLeave: e => e.currentTarget.style.background = "transparent" },
              React.createElement('div', { style: icStyle }, "🏨"),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, h.name),
                React.createElement('div', { style: { fontSize: 11.5, color: "#8a8aa0" } }, "Voir les procédures de cet établissement")
              ),
              React.createElement('span', { style: { fontSize: 11, color: G2, fontWeight: 600, whiteSpace: "nowrap" } }, "changer →")
            )));
          }
          if (pres.length) {
            items.push(React.createElement('div', { key: "psec", style: secStyle }, "📄 Procédures" + (curNom ? " — " + curNom : "")));
            pres.forEach(p => items.push(React.createElement('div', { key: "p" + p.id, onClick: () => { setSelId(p.id); loadFilesFor(p.id); setProcq(""); }, onMouseDown: e => e.preventDefault(), style: resStyle, onMouseEnter: e => e.currentTarget.style.background = "#f5f5fb", onMouseLeave: e => e.currentTarget.style.background = "transparent" },
              React.createElement('div', { style: icStyle }, CAT_ICONS[p.category] || "📄"),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.title),
                React.createElement('div', { style: { fontSize: 11.5, color: "#8a8aa0" } }, p.category)
              ),
              React.createElement('span', { style: { fontSize: 11, color: G2, fontWeight: 600, whiteSpace: "nowrap" } }, "ouvrir →")
            )));
          }
          if (!hres.length && !pres.length) items.push(React.createElement('div', { key: "empty", style: { padding: "16px 12px", color: "#999", fontSize: 13 } }, "Aucun hôtel ni procédure pour « " + procq.trim() + " »."));
          return React.createElement('div', { style: { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "white", border: "1px solid #E8E8F0", borderRadius: 14, boxShadow: "0 18px 50px rgba(20,20,50,.16)", padding: 8, zIndex: 40, maxHeight: "60vh", overflowY: "auto" } }, items);
        })()
      ),
      showProcForm && React.createElement('div', { style: { background: "white", borderRadius: 10, border: `1px solid ${G}35`, padding: 18, marginBottom: 14 } },
        React.createElement('div', { style: { fontWeight: 500, fontSize: 13, color: "#1a1a3e", marginBottom: 12 } }, (editingId ? "Modifier — " : "Nouvelle procédure — ") + (hotels.find(h => h.id === editCid)?.name || "")),
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 } },
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Titre"),
            React.createElement('input', { value: procForm.title, onChange: e => setProcForm({ ...procForm, title: e.target.value }), placeholder: "Titre de la procédure", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Catégorie"),
            React.createElement('select', { value: procForm.cat, onChange: e => setProcForm({ ...procForm, cat: e.target.value }), style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } },
              CATS.map(c => React.createElement('option', { key: c, value: c }, c))
            )
          )
        ),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Contenu"),
          React.createElement('textarea', { value: procForm.content, onChange: e => setProcForm({ ...procForm, content: e.target.value }), placeholder: "Rédigez les étapes...", style: { width: "100%", minHeight: 100, padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, resize: "vertical", fontFamily: "inherit" } })
        ),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Mots-clés (séparés par des virgules)"),
          React.createElement('input', { value: procForm.mots_cles, onChange: e => setProcForm({ ...procForm, mots_cles: e.target.value }), placeholder: "Ex. : imprimante, impression, bourrage, hors ligne", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } }),
          React.createElement('div', { style: { fontSize: 10.5, color: "#999", marginTop: 3 } }, "Ces mots aident les clients à trouver cette procédure depuis le formulaire de contact.")
        ),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 } },
            React.createElement('label', { style: { fontSize: 11, fontWeight: 500, color: "#555" } }, "Établissements concernés (" + procFormHotels.length + "/" + hotels.length + ")"),
            React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: G2, cursor: "pointer", fontWeight: 500 } },
              React.createElement('input', { type: "checkbox", checked: hotels.length > 0 && procFormHotels.length === hotels.length, onChange: e => setProcFormHotels(e.target.checked ? hotels.map(h => h.id) : []) }),
              "Tous les établissements"
            )
          ),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6, maxHeight: 190, overflowY: "auto", border: "1px solid #E8E8F0", borderRadius: 8, padding: 10, background: "#FBFBFE" } },
            hotels.map(h => {
              const checked = procFormHotels.includes(h.id);
              return React.createElement('label', { key: h.id, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#333", cursor: "pointer", padding: "4px 6px", borderRadius: 6, background: checked ? G + "14" : "transparent" } },
                React.createElement('input', { type: "checkbox", checked: checked, onChange: e => {
                  setProcFormHotels(prev => e.target.checked ? [...prev, h.id] : prev.filter(x => x !== h.id));
                } }),
                React.createElement('span', { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, h.name)
              );
            })
          ),
          procFormHotels.length === 0 && React.createElement('div', { style: { fontSize: 10.5, color: "#E53E3E", marginTop: 4 } }, "Sélectionnez au moins un établissement.")
        ),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#444", cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: procForm.pinned, onChange: e => setProcForm({ ...procForm, pinned: e.target.checked }) }),
            "⭐ Mettre en avant (procédure épinglée)"
          )
        ),
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "📎 Pièces jointes & images (PDF, Word, Excel, PNG, JPG) — réservé admin"),
          procFormExistingFiles.length > 0 && React.createElement('div', { style: { marginBottom: 6, display: "flex", flexDirection: "column", gap: 5 } },
            procFormExistingFiles.map(f => React.createElement('div', { key: f.id, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
              isImageFile(f.file_name) ? React.createElement('img', { src: f.file_url, style: { width: 24, height: 24, objectFit: "cover", borderRadius: 4 } }) : React.createElement('span', null, FILE_ICONS[fileExt(f.file_name)] || "📄"),
              React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.file_name),
              React.createElement('button', { onClick: () => removeExistingProcFile(f.id), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
            ))
          ),
          React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => setProcFormFiles(prev => [...prev, ...Array.from(e.target.files)]), style: { fontSize: 12 } }),
          procFormFiles.length > 0 && React.createElement('div', { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 5 } },
            procFormFiles.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
              React.createElement('span', null, "🆕"),
              React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
              React.createElement('button', { onClick: () => setProcFormFiles(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
            ))
          )
        ),
        React.createElement('div', { style: { display: "flex", gap: 7, justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => setShowProcForm(false), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "6px 12px" } }, "Annuler"),
          React.createElement('button', { onClick: submitProcForm, disabled: savingProc, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "6px 12px", opacity: savingProc ? 0.6 : 1 } }, savingProc ? "Enregistrement..." : (editingId ? "Enregistrer" : "Publier"))
        )
      ),
      // Bouton retour quand une procédure est ouverte (comme les tickets)
      selId && React.createElement('button', { onClick: () => setSelId(null), style: { display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "8px 15px", background: "white", border: "1px solid #DDE0EA", color: "#444", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" } }, "← Retour aux procédures"),
      // Ligne de contexte : hôtel courant + compteur (masquée quand une procédure est ouverte)
      !selId && React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap", fontSize: 13, color: "#555" } },
        React.createElement('span', null, "Procédures de :"),
        React.createElement('span', { style: { display: "inline-flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #E8E8F0", borderRadius: 20, padding: "6px 8px 6px 12px", fontWeight: 600, color: "#1a1a3e", position: "relative" } },
          hotels.find(h => h.id === editCid)?.name || "—",
          React.createElement('button', { onClick: () => setShowHotelPick(v => !v), style: { border: "none", background: G + "26", color: G2, borderRadius: 14, fontSize: 11, padding: "3px 9px", cursor: "pointer", fontWeight: 600 } }, showHotelPick ? "fermer ✕" : "changer"),
          showHotelPick && React.createElement('div', { style: { position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 260, maxHeight: "50vh", overflowY: "auto", background: "white", border: "1px solid #E8E8F0", borderRadius: 12, boxShadow: "0 18px 50px rgba(20,20,50,.16)", padding: 6, zIndex: 50 } },
            hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(h => React.createElement('div', { key: h.id, onClick: () => { setEditCid(h.id); setSelId(null); setKbCat("all"); setProcq(""); setShowHotelPick(false); }, style: { display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: h.id === editCid ? 700 : 500, color: h.id === editCid ? G2 : "#333", background: h.id === editCid ? G + "14" : "transparent" }, onMouseEnter: e => { if (h.id !== editCid) e.currentTarget.style.background = "#f5f5fb"; }, onMouseLeave: e => { if (h.id !== editCid) e.currentTarget.style.background = "transparent"; } },
              React.createElement('span', { style: { fontSize: 15 } }, "🏨"),
              React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, h.name),
              h.id === editCid && React.createElement('span', { style: { fontSize: 12, color: G2 } }, "✓")
            ))
          )
        ),
        React.createElement('span', { style: { marginLeft: "auto", fontSize: 12, color: "#666", background: "#F0F0F8", padding: "6px 12px", borderRadius: 20, fontWeight: 500 } }, procedures.length + (procedures.length > 1 ? " procédures" : " procédure"))
      ),
      // Chips de filtre par catégorie (masqués quand une procédure est ouverte)
      !selId && React.createElement('div', { style: { display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" } },
        ["all", ...cats].map(c => React.createElement('button', { key: c, onClick: () => setKbCat(c), style: { padding: "5px 12px", border: `1px solid ${kbCat === c ? G : "#DDD"}`, background: kbCat === c ? G + "18" : "white", color: kbCat === c ? G2 : "#555", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: kbCat === c ? 500 : 400 } }, c === "all" ? "Toutes" : c))
      ),
      procsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement des procédures..."),
      // Liste type ticket : au clic, la liste se réduit à la procédure ouverte (affichée en plein)
      (() => {
        let liste = kbCat === "all" ? procedures : procedures.filter(p => p.category === kbCat);
        liste = liste.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(a.title).localeCompare(String(b.title)));
        if (selId) liste = procedures.filter(p => p.id === selId);
        if (!procsLoading && liste.length === 0) {
          return React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 28, textAlign: "center", color: "#999", fontSize: 13 } }, procedures.length === 0 ? "Aucune procédure pour ce client. Ajoutez-en une !" : "Aucune procédure ne correspond à votre recherche.");
        }
        return React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
          liste.map(p => {
            const isOpen = selId === p.id;
            const files = procFiles[p.id] || [];
            const imgs = files.filter(f => isImageFile(f.file_name));
            const docs = files.filter(f => !isImageFile(f.file_name));
            return React.createElement('div', { key: p.id, style: { background: "white", borderRadius: 10, border: `1px solid ${isOpen ? G + "55" : "#E8E8F0"}`, overflow: "hidden" } },
              React.createElement('div', { onClick: () => { const willOpen = selId !== p.id; setSelId(willOpen ? p.id : null); if (willOpen) loadFilesFor(p.id); }, style: { padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, minHeight: 60, boxSizing: "border-box" } },
                React.createElement('div', { style: { width: 38, height: 38, background: G + "18", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 } }, CAT_ICONS[p.category] || "📄"),
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                  React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                    React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5, color: "#1a1a3e" } }, p.title),
                    React.createElement('span', { style: { fontSize: 10, color: "#888", background: "#F0F0F8", padding: "2px 7px", borderRadius: 20 } }, p.category),
                    p.pinned && React.createElement('span', { style: { fontSize: 12 } }, "⭐")
                  )
                ),
                React.createElement('span', { style: { fontSize: 12, color: "#AAA", flexShrink: 0 } }, isOpen ? "▲" : "▼")
              ),
              isOpen && React.createElement('div', { style: { borderTop: "1px solid #F0F0F8", padding: 20, background: "#FAFAFC" } },
                React.createElement('div', { style: { fontSize: 13.5, color: "#444", lineHeight: 1.7, marginBottom: (imgs.length || docs.length) ? 16 : 4 } },
                  (p.content || "").split("\n").map((line, i) => {
                    if (!line) return React.createElement('div', { key: i, style: { height: 6 } });
                    if (/^\d+\./.test(line)) { const num = line.match(/^\d+/)[0]; return React.createElement('div', { key: i, style: { display: "flex", gap: 7, margin: "4px 0" } }, React.createElement('span', { style: { color: G, fontWeight: 500, minWidth: 16 } }, num + "."), React.createElement('span', null, line.replace(/^\d+\.\s*/, ""))); }
                    if (line.startsWith("⚠️") || line.startsWith("🔒")) return React.createElement('div', { key: i, style: { background: "#FFFDF0", border: "1px solid #F0E0A0", borderRadius: 6, padding: "7px 11px", margin: "8px 0", fontSize: 12, color: "#744" } }, line);
                    return React.createElement('p', { key: i, style: { margin: "3px 0" } }, line);
                  })
                ),
                imgs.length > 0 && React.createElement('div', { style: { marginBottom: docs.length ? 14 : 0 } },
                  React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8 } }, "🖼️ IMAGES"),
                  React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
                    imgs.map((f, i) => React.createElement('img', { key: f.id, src: f.file_url, alt: f.file_name, title: f.file_name, onClick: () => openViewer(imgs, i), style: { width: 110, height: 110, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E2E8", cursor: "zoom-in" } }))
                  )
                ),
                docs.length > 0 && React.createElement('div', null, React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8 } }, "📎 PIÈCES JOINTES"), React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } }, docs.map((f, i) => React.createElement(DocApercu, { key: f.id || i, f })))),
                React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 14, borderTop: "1px solid #F0F0F8" } },
                  React.createElement('button', { onClick: (e) => { e.stopPropagation(); openEditProcForm(p); }, style: { padding: "8px 15px", background: "none", border: `1px solid ${G}55`, color: G2, borderRadius: 7, fontSize: 12.5, cursor: "pointer", fontWeight: 500 } }, "✏️ Modifier"),
                  React.createElement('button', { onClick: (e) => { e.stopPropagation(); if (window.confirm("Supprimer la procédure « " + (p.title || "") + " » ?")) deleteProc(p.id); }, style: { padding: "8px 15px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12.5, cursor: "pointer", fontWeight: 500 } }, "🗑 Supprimer")
                )
              )
            );
          })
        );
      })()
    );
  return content;
}
