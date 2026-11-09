// ===== Page « knowledge » — condition dans App : page === "knowledge" && !isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_knowledge({...}) de app.js.
function Page_knowledge(ctx) {
  let content = ctx.content;
  const {
    go, kbCat, loadFilesFor, openViewer, procFiles, procedures, procq, procsLoading, selId, setKbCat,
    setProcq, setSelId
  } = ctx;
    const cats = [...new Set(procedures.map(p => p.category))];
    let liste = kbCat === "all" ? procedures : procedures.filter(p => p.category === kbCat);
    liste = liste.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(a.title).localeCompare(String(b.title)));
    if (selId) liste = procedures.filter(p => p.id === selId);
    content = React.createElement('div', null,
      procsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement..."),
      selId && React.createElement('button', { onClick: () => setSelId(null), style: { display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "8px 15px", background: "white", border: "1px solid #DDE0EA", color: "#444", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" } }, "← Retour aux procédures"),
      // ===== BARRE DE RECHERCHE (même style que l'admin) =====
      !selId && React.createElement('div', { style: { position: "relative", marginBottom: 16 } },
        React.createElement('div', { style: { position: "relative" } },
          React.createElement('span', { style: { position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#b3b3c4", pointerEvents: "none" } }, "🔍"),
          React.createElement('input', { id: "procUniSearchClient", type: "text", autoComplete: "off", value: procq, onChange: e => setProcq(e.target.value), placeholder: "Rechercher une procédure…", style: { width: "100%", padding: "13px 42px", border: `1.5px solid ${procq ? G : "#dcdce6"}`, borderRadius: 13, fontSize: 14.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "white" } }),
          procq && React.createElement('button', { onClick: () => setProcq(""), title: "Effacer", style: { position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#aaa", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 2 } }, "✕")
        ),
        procq.trim() && (() => {
          const nq = procq.trim().toLowerCase();
          const inc = (v) => (v || "").toLowerCase().includes(nq);
          const pres = procedures.filter(p => inc(p.title) || inc(p.content) || inc(p.mots_cles)).slice(0, 10);
          const resStyle = { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer" };
          const icStyle = { width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, background: G + "24" };
          const items = pres.length
            ? pres.map(p => React.createElement('div', { key: "p" + p.id, onClick: () => { setSelId(p.id); loadFilesFor(p.id); setProcq(""); }, onMouseDown: e => e.preventDefault(), style: resStyle, onMouseEnter: e => e.currentTarget.style.background = "#f5f5fb", onMouseLeave: e => e.currentTarget.style.background = "transparent" },
                React.createElement('div', { style: icStyle }, CAT_ICONS[p.category] || "📄"),
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                  React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.title),
                  React.createElement('div', { style: { fontSize: 11.5, color: "#8a8aa0" } }, p.category)
                ),
                React.createElement('span', { style: { fontSize: 11, color: G2, fontWeight: 600, whiteSpace: "nowrap" } }, "ouvrir →")
              ))
            : [React.createElement('div', { key: "empty", style: { padding: "16px 12px", color: "#999", fontSize: 13 } }, "Aucune procédure pour « " + procq.trim() + " ».")];
          return React.createElement('div', { style: { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "white", border: "1px solid #E8E8F0", borderRadius: 14, boxShadow: "0 18px 50px rgba(20,20,50,.16)", padding: 8, zIndex: 40, maxHeight: "60vh", overflowY: "auto" } }, items);
        })()
      ),
      !selId && React.createElement('div', { style: { display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" } },
        ["all", ...cats].map(c => React.createElement('button', { key: c, onClick: () => setKbCat(c), style: { padding: "5px 12px", border: `1px solid ${kbCat === c ? G : "#DDD"}`, background: kbCat === c ? G + "18" : "white", color: kbCat === c ? G2 : "#555", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: kbCat === c ? 500 : 400 } }, c === "all" ? "Toutes" : c))
      ),
      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
        liste.map(p => {
          const isOpen = selId === p.id;
          const files = procFiles[p.id] || [];
          const imgs = files.filter(f => isImageFile(f.file_name));
          const docs = files.filter(f => !isImageFile(f.file_name));
          return React.createElement('div', { key: p.id, style: { background: "white", borderRadius: 10, border: `1px solid ${isOpen ? G + "55" : "#E8E8F0"}`, overflow: "hidden" } },
            React.createElement('div', { onClick: () => { const willOpen = selId !== p.id; setSelId(willOpen ? p.id : null); if (willOpen) loadFilesFor(p.id); }, style: { padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, minHeight: 60, boxSizing: "border-box" } },
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
              React.createElement('div', { style: { marginTop: 16, paddingTop: 14, borderTop: "1px solid #F0F0F8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                React.createElement('span', { style: { fontSize: 11, color: "#999" } }, "Problème non résolu ?"),
                React.createElement('button', { onClick: (e) => { e.stopPropagation(); go("contact"); }, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "7px 14px" } }, "📧 Contacter le support →")
              )
            )
          );
        }),
        !procsLoading && liste.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucune procédure trouvée.")
      )
    );
  return content;
}
