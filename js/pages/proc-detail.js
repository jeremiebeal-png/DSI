// ===== Page « proc-detail » — condition dans App : page === "proc-detail" && selP =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_proc_detail({...}) de app.js.
function Page_proc_detail(ctx) {
  let content = ctx.content;
  const {
    go, isAdmin, openViewer, procFiles, selP
  } = ctx;
    const files = procFiles[selP.id] || [];
    content = React.createElement('div', { style: { maxWidth: 680 } },
      React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 22 } },
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
          React.createElement(Badge, { label: selP.category, color: G2 }),
          selP.pinned && React.createElement('span', { style: { fontSize: 13 } }, "⭐")
        ),
        React.createElement('h3', { style: { margin: "10px 0 16px", fontSize: 16, fontWeight: 500, color: "#1a1a3e" } }, selP.title),
        React.createElement('div', { style: { borderTop: "1px solid #F0F0F8", paddingTop: 14 } },
          selP.content.split("\n").map((line, i) => {
            if (!line) return React.createElement('div', { key: i, style: { height: 6 } });
            if (/^\d+\./.test(line)) {
              const num = line.match(/^\d+/)[0];
              return React.createElement('div', { key: i, style: { display: "flex", gap: 7, margin: "4px 0", fontSize: 13, color: "#444" } },
                React.createElement('span', { style: { color: G, fontWeight: 500, minWidth: 16 } }, num + "."),
                React.createElement('span', null, line.replace(/^\d+\.\s*/, ""))
              );
            }
            if (line.startsWith("⚠️") || line.startsWith("🔒")) return React.createElement('div', { key: i, style: { background: "#FFFDF0", border: "1px solid #F0E0A0", borderRadius: 6, padding: "7px 11px", margin: "8px 0", fontSize: 12, color: "#744" } }, line);
            return React.createElement('p', { key: i, style: { margin: "3px 0", fontSize: 13, color: "#555" } }, line);
          })
        ),
        files.filter(f => isImageFile(f.file_name)).length > 0 && React.createElement('div', { style: { marginTop: 16, paddingTop: 14, borderTop: "1px solid #F0F0F8" } },
          React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8 } }, "🖼️ IMAGES"),
          React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
            files.filter(f => isImageFile(f.file_name)).map((f, i, arr) => React.createElement('img', { key: i, src: f.file_url, alt: f.file_name, title: "Cliquez pour agrandir", onClick: () => openViewer(arr, i), style: { width: "100%", borderRadius: 8, border: "1px solid #EEE", cursor: "zoom-in" } }))
          )
        ),
        files.filter(f => !isImageFile(f.file_name)).length > 0 && React.createElement('div', { style: { marginTop: 16, paddingTop: 14, borderTop: "1px solid #F0F0F8" } },
          React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8 } }, "📎 PIÈCES JOINTES"),
          React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 6 } },
            files.filter(f => !isImageFile(f.file_name)).map((f, i) => React.createElement(DocApercu, { key: f.id || i, f }))
          )
        ),
        !isAdmin && React.createElement('div', { style: { marginTop: 18, paddingTop: 14, borderTop: "1px solid #F0F0F8", display: "flex", justifyContent: "space-between", alignItems: "center" } },
          React.createElement('span', { style: { fontSize: 11, color: "#999" } }, "Problème non résolu ?"),
          React.createElement('button', { onClick: () => go("contact"), style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", padding: "5px 12px" } }, "📧 Contacter le support →")
        )
      )
    );
  return content;
}
