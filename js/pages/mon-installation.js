// ===== Page « mon-installation » — condition dans App : page === "mon-installation" && !isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_mon_installation({...}) de app.js.
function Page_mon_installation(ctx) {
  let content = ctx.content;
  const {
    docCatFilter, docFiles, docs, docsLoading, isAdmin, isMobile, openViewer, setDocCatFilter, setDocFocusId
  } = ctx;
    const usedCats = [...new Set(docs.map(d => d.categorie))];
    const visibles = docCatFilter === "all" ? docs : docs.filter(d => d.categorie === docCatFilter);

    const fmtDateNj = (iso) => { try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }); } catch (e) { return String(iso || ""); } };
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14, lineHeight: 1.6 } },
        "Retrouvez ici la documentation technique de votre établissement : photos des baies informatiques, plans, schémas réseau et fiches matériel préparés par DSI Hotel."
      ),
      usedCats.length > 0 && React.createElement('div', { style: { display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" } },
        ["all", ...usedCats].map(c => React.createElement('button', { key: c, onClick: () => { setDocFocusId(null); setDocCatFilter(c); }, style: { padding: "5px 12px", border: `1px solid ${docCatFilter === c ? G : "#DDD"}`, background: docCatFilter === c ? G + "18" : "white", color: docCatFilter === c ? G2 : "#555", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: docCatFilter === c ? 500 : 400 } }, c === "all" ? "Toutes" : (DOC_CAT_ICONS[c] || "") + " " + c))
      ),
      docsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement..."),
      !docsLoading && docs.length === 0 && React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 28, textAlign: "center", color: "#999", fontSize: 13 } }, "Aucun document disponible pour le moment."),
      React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 14 } },
        visibles.map(d => {
          const fl = docFiles[d.id] || [];
          const imgs = fl.filter(f => isImageFile(f.file_name));
          return React.createElement('div', { key: d.id, style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 15 } },
            React.createElement('div', { style: { display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 9 } },
              React.createElement('div', { style: { width: 32, height: 32, background: G + "18", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 } }, DOC_CAT_ICONS[d.categorie] || "📁"),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontWeight: 600, fontSize: 13, color: "#1a1a3e", marginBottom: 3 } }, d.titre),
                React.createElement('span', { style: { fontSize: 10, color: "#888", background: "#F0F0F8", padding: "2px 7px", borderRadius: 20 } }, d.categorie)
              )
            ),
            d.description && renderDocDescription(d.description, { fontSize: 11.5, color: "#666", marginBottom: 9, lineHeight: 1.5 }),
            isAdmin && rappelBadge(d),
            d.video_url && (videoEmbedUrl(d.video_url)
              ? React.createElement('div', { style: { position: "relative", width: "100%", paddingBottom: "56.25%", height: 0, marginBottom: 10, borderRadius: 8, overflow: "hidden", background: "#000" } },
                  React.createElement('iframe', { src: videoEmbedUrl(d.video_url), title: "Vidéo", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen", allowFullScreen: true, frameBorder: "0", style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 } })
                )
              : React.createElement('a', { href: d.video_url, target: "_blank", rel: "noopener noreferrer", style: { display: "inline-block", marginBottom: 10, fontSize: 12.5, color: "#3182CE", textDecoration: "underline" } }, "🎬 Voir la vidéo")),
            imgs.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 } },
              imgs.map((f, i) => React.createElement('img', { key: f.id, src: f.file_url, alt: f.file_name, title: f.file_name, onClick: () => openViewer(imgs, i), style: { width: 68, height: 68, objectFit: "cover", borderRadius: 6, border: "1px solid #E2E2E8", cursor: "zoom-in" } }))
            ),
            React.createElement(FileList, { files: fl.filter(f => !isImageFile(f.file_name)) })
          );
        })
      )
    );
  return content;
}
