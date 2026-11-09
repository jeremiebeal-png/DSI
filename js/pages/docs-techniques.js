// ===== Page « docs-techniques » — condition dans App : page === "docs-techniques" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_docs_techniques({...}) de app.js.
function Page_docs_techniques(ctx) {
  let content = ctx.content;
  const {
    deleteDoc, docCatFilter, docErr, docExistingFiles, docFiles, docFocusId, docForm, docHotelId,
    docHotelPick, docHotelSearch, docNewFiles, docs, docsLoading, editingDocId, hotels, isAdmin, isMobile,
    openEditDocForm, openNewDocForm, openViewer, removeExistingDocFile, savingDoc, setDocCatFilter,
    setDocFocusId, setDocForm, setDocHotelId, setDocHotelPick, setDocHotelSearch, setDocNewFiles,
    setShowDocForm, showDocForm, submitDocForm, toggleDocVisible
  } = ctx;
    const inputD = { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, fontFamily: "inherit", outline: "none" };
    const labelD = { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 };
    const visibles = docFocusId ? docs.filter(d => d.id === docFocusId) : (docCatFilter === "all" ? docs : docs.filter(d => d.categorie === docCatFilter));
    const usedCats = [...new Set(docs.map(d => d.categorie))];
    const choisirHotelDoc = (h) => { setDocHotelId(h.id); setShowDocForm(false); setDocCatFilter("all"); setDocHotelSearch(""); setDocHotelPick(false); setDocFocusId(null); };

    content = React.createElement('div', null,
      // ===== BARRE UNIQUE : recherche hôtels + fiches (même principe que « Gérer les procédures ») =====
      React.createElement('div', { style: { position: "relative", marginBottom: 14 } },
        React.createElement('div', { style: { display: "flex", gap: isMobile ? 8 : 12, alignItems: "stretch", flexWrap: isMobile ? "wrap" : "nowrap" } },
          React.createElement('div', { style: { flex: isMobile ? "1 1 100%" : 1, position: "relative", minWidth: 0 } },
            React.createElement('span', { style: { position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#b3b3c4", pointerEvents: "none" } }, "🔍"),
            React.createElement('input', { type: "text", autoComplete: "off", value: docHotelSearch, onChange: e => setDocHotelSearch(e.target.value), onKeyDown: e => { if (e.key === "Escape") setDocHotelSearch(""); }, placeholder: "Rechercher un hôtel ou une fiche…", style: { width: "100%", padding: "13px 42px", border: `1.5px solid ${docHotelSearch ? G : "#dcdce6"}`, borderRadius: 13, fontSize: 14.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "white" } }),
            docHotelSearch && React.createElement('button', { onClick: () => setDocHotelSearch(""), title: "Effacer", style: { position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#aaa", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 2 } }, "✕")
          ),
          React.createElement('button', { onClick: () => { setDocFocusId(null); openNewDocForm(); }, style: { display: "flex", alignItems: "center", gap: 6, background: G, border: "none", color: "#1c1c1c", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: isMobile ? "11px 20px" : "0 20px", whiteSpace: "nowrap", justifyContent: "center", flex: isMobile ? "1 1 100%" : "none" } }, "＋ Nouvelle fiche")
        ),
        docHotelSearch.trim() && (() => {
          const nq = docHotelSearch.trim().toLowerCase();
          const mots = nq.split(/\s+/);
          const hres = hotels.filter(h => { const c = [h.name, h.city, h.account_email, h.standard_email, h.phone, h.ninjaone_nom].filter(Boolean).join(" ").toLowerCase(); return mots.every(m => c.includes(m)); }).slice(0, 6);
          const dres = docs.filter(d => { const c = [d.titre, d.categorie, String(d.description || "").replace(/<[^>]+>/g, " ")].filter(Boolean).join(" ").toLowerCase(); return mots.every(m => c.includes(m)); }).slice(0, 8);
          const curNom = hotels.find(h => h.id === docHotelId)?.name || "";
          const secStyle = { fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#a0a0b5", padding: "10px 12px 6px" };
          const resStyle = { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer" };
          const icStyle = { width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, background: G + "24", overflow: "hidden" };
          const items = [];
          if (hres.length) {
            items.push(React.createElement('div', { key: "hsec", style: secStyle }, "🏨 Hôtels"));
            hres.forEach(h => items.push(React.createElement('div', { key: "h" + h.id, onClick: () => choisirHotelDoc(h), onMouseDown: e => e.preventDefault(), style: resStyle, onMouseEnter: e => e.currentTarget.style.background = "#f5f5fb", onMouseLeave: e => e.currentTarget.style.background = "transparent" },
              React.createElement('div', { style: icStyle }, h.logo_url ? React.createElement('img', { src: h.logo_url, alt: "", style: { width: "100%", height: "100%", objectFit: "contain", background: "white" } }) : "🏨"),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, h.name),
                React.createElement('div', { style: { fontSize: 11.5, color: "#8a8aa0" } }, "Voir les fiches de cet établissement")
              ),
              React.createElement('span', { style: { fontSize: 11, color: G2, fontWeight: 600, whiteSpace: "nowrap" } }, "changer →")
            )));
          }
          if (dres.length) {
            items.push(React.createElement('div', { key: "dsec", style: secStyle }, "📁 Fiches" + (curNom ? " — " + curNom : "")));
            dres.forEach(d => items.push(React.createElement('div', { key: "d" + d.id, onClick: () => { setDocFocusId(d.id); setShowDocForm(false); setDocHotelSearch(""); }, onMouseDown: e => e.preventDefault(), style: resStyle, onMouseEnter: e => e.currentTarget.style.background = "#f5f5fb", onMouseLeave: e => e.currentTarget.style.background = "transparent" },
              React.createElement('div', { style: icStyle }, DOC_CAT_ICONS[d.categorie] || "📁"),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, d.titre),
                React.createElement('div', { style: { fontSize: 11.5, color: "#8a8aa0" } }, d.categorie)
              ),
              React.createElement('span', { style: { fontSize: 11, color: G2, fontWeight: 600, whiteSpace: "nowrap" } }, "ouvrir →")
            )));
          }
          if (!hres.length && !dres.length) items.push(React.createElement('div', { key: "empty", style: { padding: "16px 12px", color: "#999", fontSize: 13 } }, "Aucun hôtel ni fiche pour « " + docHotelSearch.trim() + " »."));
          return React.createElement('div', { style: { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "white", border: "1px solid #E8E8F0", borderRadius: 14, boxShadow: "0 18px 50px rgba(20,20,50,.16)", padding: 8, zIndex: 40, maxHeight: "60vh", overflowY: "auto" } }, items);
        })()
      ),
      // Bouton retour quand une fiche est ouverte depuis la recherche
      docFocusId && React.createElement('button', { onClick: () => setDocFocusId(null), style: { display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "8px 15px", background: "white", border: "1px solid #DDE0EA", color: "#444", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" } }, "← Retour aux fiches"),
      // Ligne de contexte : hôtel courant (« changer ») + compteur
      !docFocusId && React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap", fontSize: 13, color: "#555" } },
        React.createElement('span', null, "Fiches de :"),
        React.createElement('span', { style: { display: "inline-flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #E8E8F0", borderRadius: 20, padding: "6px 8px 6px 12px", fontWeight: 600, color: "#1a1a3e", position: "relative" } },
          hotels.find(h => h.id === docHotelId)?.name || "—",
          React.createElement('button', { onClick: () => setDocHotelPick(v => !v), style: { border: "none", background: G + "26", color: G2, borderRadius: 14, fontSize: 11, padding: "3px 9px", cursor: "pointer", fontWeight: 600 } }, docHotelPick ? "fermer ✕" : "changer"),
          docHotelPick && React.createElement('div', { style: { position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 260, maxHeight: "50vh", overflowY: "auto", background: "white", border: "1px solid #E8E8F0", borderRadius: 12, boxShadow: "0 18px 50px rgba(20,20,50,.16)", padding: 6, zIndex: 50 } },
            hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(h => React.createElement('div', { key: h.id, onClick: () => choisirHotelDoc(h), style: { display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: h.id === docHotelId ? 700 : 500, color: h.id === docHotelId ? G2 : "#333", background: h.id === docHotelId ? G + "14" : "transparent" }, onMouseEnter: e => { if (h.id !== docHotelId) e.currentTarget.style.background = "#f5f5fb"; }, onMouseLeave: e => { if (h.id !== docHotelId) e.currentTarget.style.background = "transparent"; } },
              React.createElement('span', { style: { fontSize: 15 } }, "🏨"),
              React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, h.name),
              h.id === docHotelId && React.createElement('span', { style: { fontSize: 12, color: G2 } }, "✓")
            ))
          )
        ),
        React.createElement('span', { style: { marginLeft: "auto", fontSize: 12, color: "#666", background: "#F0F0F8", padding: "6px 12px", borderRadius: 20, fontWeight: 500 } }, docs.length + (docs.length > 1 ? " fiches" : " fiche"))
      ),

      showDocForm && React.createElement('div', { style: { background: "white", borderRadius: 10, border: `1px solid ${G}35`, padding: 18, marginBottom: 14 } },
        React.createElement('div', { style: { fontWeight: 500, fontSize: 13, color: "#1a1a3e", marginBottom: 12 } }, (editingDocId ? "Modifier la fiche — " : "Nouvelle fiche — ") + (hotels.find(h => h.id === docHotelId)?.name || "")),
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 } },
          React.createElement('div', null,
            React.createElement('label', { style: labelD }, "Titre *"),
            React.createElement('input', { value: docForm.titre, onChange: e => setDocForm({ ...docForm, titre: e.target.value }), placeholder: "ex : Baie de brassage RDC", style: inputD })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: labelD }, "Catégorie"),
            React.createElement('select', { value: docForm.categorie, onChange: e => setDocForm({ ...docForm, categorie: e.target.value }), style: inputD },
              DOC_CATS.map(c => React.createElement('option', { key: c, value: c }, (DOC_CAT_ICONS[c] || "") + " " + c))
            )
          )
        ),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: labelD }, "Description / notes"),
          React.createElement('textarea', { value: docForm.description, onChange: e => setDocForm({ ...docForm, description: e.target.value }), placeholder: "Emplacement, références matériel, remarques...", style: { ...inputD, minHeight: 70, resize: "vertical" } })
        ),
        React.createElement('div', { style: { marginBottom: 12, background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 8, padding: "10px 12px" } },
          React.createElement('label', { style: { ...labelD, display: "flex", alignItems: "center", gap: 6 } }, "⏰ Rappel (optionnel)"),
          React.createElement('div', { style: { fontSize: 11, color: "#8A6D1F", marginBottom: 8 } }, "Une alerte apparaîtra sur l'accueil à l'approche de cette date (ex. renouvellement Care Pack, contrat, licence)."),
          React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            React.createElement('input', { type: "date", value: docForm.rappel_date || "", onChange: e => setDocForm({ ...docForm, rappel_date: e.target.value }), style: { ...inputD, maxWidth: 170 } }),
            React.createElement('input', { value: docForm.rappel_note || "", onChange: e => setDocForm({ ...docForm, rappel_note: e.target.value }), placeholder: "Motif du rappel (ex. renouveler Care Pack)", style: { ...inputD, flex: 1, minWidth: 180 } })
          ),
          docForm.rappel_date && React.createElement('button', { onClick: () => setDocForm({ ...docForm, rappel_date: "", rappel_note: "" }), style: { marginTop: 8, background: "none", border: "1px solid #E0C87A", color: "#8A6D1F", borderRadius: 6, fontSize: 11, cursor: "pointer", padding: "4px 10px" } }, "Retirer le rappel")
        ),
        React.createElement('div', { style: { marginBottom: 12 } },
          React.createElement('label', { style: labelD }, "🎬 Lien vidéo (optionnel)"),
          React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 6 } }, "Collez un lien YouTube ou Vimeo (non répertorié conseillé). La vidéo sera lisible directement dans la fiche."),
          React.createElement('input', { value: docForm.video_url || "", onChange: e => setDocForm({ ...docForm, video_url: e.target.value }), placeholder: "https://youtu.be/... ou https://vimeo.com/...", style: inputD }),
          docForm.video_url && !videoEmbedUrl(docForm.video_url) && React.createElement('div', { style: { fontSize: 11, color: "#C05621", marginTop: 5 } }, "⚠️ Lien non reconnu (seuls YouTube et Vimeo sont pris en charge). Il sera affiché comme lien cliquable.")
        ),
        React.createElement('div', { style: { marginBottom: 12, background: docForm.visible_client ? "#F0FFF4" : "#FAFAFC", border: `1px solid ${docForm.visible_client ? "#C6F6D5" : "#E8E8F0"}`, borderRadius: 8, padding: "10px 12px" } },
          React.createElement('label', { style: { display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12.5, color: "#333", cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: docForm.visible_client, onChange: e => setDocForm({ ...docForm, visible_client: e.target.checked }), style: { marginTop: 2, cursor: "pointer" } }),
            React.createElement('span', null,
              React.createElement('span', { style: { fontWeight: 600 } }, docForm.visible_client ? "👁️ Visible par le client" : "🔒 Fiche interne"),
              React.createElement('span', { style: { display: "block", fontSize: 11, color: "#888", marginTop: 2 } },
                docForm.visible_client
                  ? "Le client verra cette fiche et ses fichiers dans son espace « Infrastructure »."
                  : "Réservée à DSI Hotel. Cochez la case pour la partager avec le client."
              )
            )
          )
        ),
        React.createElement('div', { style: { marginBottom: 14 } },
          React.createElement('label', { style: labelD }, "📎 Photos, plans et documents"),
          docExistingFiles.length > 0 && React.createElement('div', { style: { marginBottom: 7, display: "flex", flexDirection: "column", gap: 5 } },
            docExistingFiles.map(f => React.createElement('div', { key: f.id, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
              isImageFile(f.file_name) ? React.createElement('img', { src: f.file_url, style: { width: 26, height: 26, objectFit: "cover", borderRadius: 4 } }) : React.createElement('span', null, FILE_ICONS[fileExt(f.file_name)] || "📄"),
              React.createElement('a', { href: f.file_url, target: "_blank", rel: "noreferrer", style: { flex: 1, color: "#333", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.file_name),
              React.createElement('button', { onClick: () => removeExistingDocFile(f.id), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
            ))
          ),
          React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => setDocNewFiles(prev => [...prev, ...Array.from(e.target.files)]), style: { fontSize: 12 } }),
          docNewFiles.length > 0 && React.createElement('div', { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 5 } },
            docNewFiles.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
              React.createElement('span', null, "🆕"),
              React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
              React.createElement('span', { style: { color: "#AAA" } }, f.size ? Math.round(f.size / 1024) + " Ko" : ""),
              React.createElement('button', { onClick: () => setDocNewFiles(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
            ))
          )
        ),
        docErr && React.createElement('div', { style: { color: "#E53E3E", fontSize: 12, marginBottom: 10 } }, docErr),
        React.createElement('div', { style: { display: "flex", gap: 7, justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => setShowDocForm(false), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "7px 13px" } }, "Annuler"),
          React.createElement('button', { onClick: submitDocForm, disabled: savingDoc, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: savingDoc ? "default" : "pointer", padding: "7px 15px", opacity: savingDoc ? 0.6 : 1 } }, savingDoc ? "Enregistrement..." : (editingDocId ? "Enregistrer" : "Créer la fiche"))
        )
      ),

      usedCats.length > 0 && React.createElement('div', { style: { display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" } },
        ["all", ...usedCats].map(c => React.createElement('button', { key: c, onClick: () => { setDocFocusId(null); setDocCatFilter(c); }, style: { padding: "5px 12px", border: `1px solid ${docCatFilter === c ? G : "#DDD"}`, background: docCatFilter === c ? G + "18" : "white", color: docCatFilter === c ? G2 : "#555", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: docCatFilter === c ? 500 : 400 } }, c === "all" ? "Toutes" : (DOC_CAT_ICONS[c] || "") + " " + c))
      ),

      docsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement..."),
      !docsLoading && docs.length === 0 && !showDocForm && React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 28, textAlign: "center", color: "#999", fontSize: 13 } }, "Aucune fiche technique pour cet hôtel. Créez-en une !"),

      React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 14 } },
        visibles.map(d => {
          const fl = docFiles[d.id] || [];
          const imgs = fl.filter(f => isImageFile(f.file_name));
          return React.createElement('div', { key: d.id, style: { background: "white", borderRadius: 10, border: `1px solid ${d.visible_client ? "#C6F6D5" : "#E8E8F0"}`, padding: 15 } },
            React.createElement('div', { style: { display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 8 } },
              React.createElement('div', { style: { width: 32, height: 32, background: G + "18", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 } }, DOC_CAT_ICONS[d.categorie] || "📁"),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontWeight: 600, fontSize: 13, color: "#1a1a3e", marginBottom: 3 } }, d.titre),
                React.createElement('span', { style: { fontSize: 10, color: "#888", background: "#F0F0F8", padding: "2px 7px", borderRadius: 20 } }, d.categorie)
              )
            ),
            React.createElement('button', { onClick: () => toggleDocVisible(d), title: "Cliquez pour changer la visibilité", style: { display: "block", width: "100%", textAlign: "left", marginBottom: 9, padding: "5px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${d.visible_client ? "#9AE6B4" : "#E2E2E8"}`, background: d.visible_client ? "#F0FFF4" : "#FAFAFC", color: d.visible_client ? "#276749" : "#888" } }, d.visible_client ? "👁️ Visible par le client" : "🔒 Fiche interne"),
            d.description && renderDocDescription(d.description, { fontSize: 11.5, color: "#666", marginBottom: 9, lineHeight: 1.5 }),
            isAdmin && rappelBadge(d),
            d.video_url && (videoEmbedUrl(d.video_url)
              ? React.createElement('div', { style: { position: "relative", width: "100%", paddingBottom: "56.25%", height: 0, marginBottom: 10, borderRadius: 8, overflow: "hidden", background: "#000" } },
                  React.createElement('iframe', { src: videoEmbedUrl(d.video_url), title: "Vidéo", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen", allowFullScreen: true, frameBorder: "0", style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 } })
                )
              : React.createElement('a', { href: d.video_url, target: "_blank", rel: "noopener noreferrer", style: { display: "inline-block", marginBottom: 10, fontSize: 12.5, color: "#3182CE", textDecoration: "underline" } }, "🎬 Voir la vidéo")),
            imgs.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 } },
              imgs.slice(0, 4).map((f, i) => React.createElement('img', { key: f.id, src: f.file_url, alt: f.file_name, title: f.file_name, onClick: () => openViewer(imgs, i), style: { width: 62, height: 62, objectFit: "cover", borderRadius: 6, border: "1px solid #E2E2E8", cursor: "zoom-in" } })),
              imgs.length > 4 && React.createElement('div', { onClick: () => openViewer(imgs, 4), style: { width: 62, height: 62, borderRadius: 6, background: "#F0F0F8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#888", fontWeight: 600, cursor: "zoom-in" } }, "+" + (imgs.length - 4))
            ),
            React.createElement(FileList, { files: fl.filter(f => !isImageFile(f.file_name)) }),
            React.createElement('div', { style: { display: "flex", gap: 7, marginTop: 10, paddingTop: 10, borderTop: "1px solid #F0F0F8" } },
              React.createElement('button', { onClick: () => openEditDocForm(d), style: { flex: 1, padding: 6, background: "none", border: `1px solid ${G}55`, color: G2, borderRadius: 6, fontSize: 11.5, cursor: "pointer", fontWeight: 500 } }, "Modifier"),
              React.createElement('button', { onClick: () => deleteDoc(d), style: { padding: "6px 10px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 6, fontSize: 11.5, cursor: "pointer" } }, "🗑")
            ),
            React.createElement('div', { style: { fontSize: 10, color: "#BBB", marginTop: 7 } }, fl.length + " fichier(s)")
          );
        })
      )
    );
  return content;
}
