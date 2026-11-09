// ===== Page « rapport-jour » — condition dans App : page === "rapport-jour" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_rapport_jour({...}) de app.js.
function Page_rapport_jour(ctx) {
  let content = ctx.content;
  const {
    envoyerRapportJourEmail, exportRapportJourPdf, hotels, rjEmail, rjEnvoi, rjHotel, rjNote, rjPick, rjQ,
    rjTicketsOuverts, setRjEmail, setRjHotel, setRjNote, setRjPick, setRjQ
  } = ctx;
    const rjRows = rjHotel ? rjTicketsOuverts() : [];
    const rjHotelObj = hotels.find(h => h.id === rjHotel);
    const prioColorRj = (p) => ({ "Urgent": "#E53E3E", "Haute": "#DD6B20", "Moyenne": "#3182CE", "Basse": "#718096" }[p] || "#718096");
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Générez un PDF des tickets actuellement ouverts pour un établissement, à transmettre à vos techniciens avant leur passage sur site pour qu'ils connaissent les problèmes en cours. Choisissez un client, puis téléchargez ou envoyez le rapport par email."
      ),
      React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: 16, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" } },
        React.createElement('div', { style: { flex: "1 1 260px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Établissement"),
          // Sélecteur maison (liste dans la page) : la liste déroulante native s'affichait mal
          // sur certains postes Windows (options invisibles, sélection impossible).
          (() => {
            const choisi = hotels.find(h => h.id === rjHotel);
            const q = rjQ.trim().toLowerCase();
            const liste = hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"))
              .filter(h => !q || String(h.name || "").toLowerCase().includes(q) || String(h.city || "").toLowerCase().includes(q));
            const choisir = (id) => { setRjHotel(id); setRjNote(""); setRjPick(false); setRjQ(""); };
            return React.createElement('div', { style: { position: "relative" } },
              React.createElement('button', { type: "button", onClick: () => { setRjPick(v => !v); setRjQ(""); },
                style: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", border: "1px solid " + (rjPick ? G : "#DDD"), borderRadius: 7, fontSize: 13, background: "white", color: choisi ? "#1a1a3e" : "#888", fontWeight: choisi ? 600 : 400, cursor: "pointer", textAlign: "left", fontFamily: "inherit" } },
                React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, choisi ? "🏨 " + choisi.name : "— Choisir un établissement —"),
                React.createElement('span', { style: { fontSize: 11, color: "#999" } }, rjPick ? "▲" : "▼")
              ),
              rjPick && React.createElement('div', { onClick: () => { setRjPick(false); setRjQ(""); }, style: { position: "fixed", inset: 0, zIndex: 44 } }),
              rjPick && React.createElement('div', { style: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 45, background: "white", border: "1px solid #E2E2EA", borderRadius: 9, boxShadow: "0 12px 32px rgba(15,15,36,.18)", padding: 6 } },
                React.createElement('input', { autoFocus: true, value: rjQ, onChange: e => setRjQ(e.target.value), placeholder: "Rechercher un établissement…",
                  onKeyDown: e => { if (e.key === "Escape") { setRjPick(false); setRjQ(""); } if (e.key === "Enter" && liste.length) choisir(liste[0].id); },
                  style: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 13, marginBottom: 6, fontFamily: "inherit", outline: "none" } }),
                React.createElement('div', { style: { maxHeight: 320, overflowY: "auto" } },
                  liste.length === 0 && React.createElement('div', { style: { padding: "10px 8px", fontSize: 12.5, color: "#999" } }, "Aucun établissement ne correspond."),
                  liste.map(h => React.createElement('div', { key: h.id, onClick: () => choisir(h.id),
                    onMouseEnter: e => { if (h.id !== rjHotel) e.currentTarget.style.background = "#F5F5FB"; },
                    onMouseLeave: e => { if (h.id !== rjHotel) e.currentTarget.style.background = "transparent"; },
                    style: { padding: "8px 10px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: h.id === rjHotel ? G2 : "#333", fontWeight: h.id === rjHotel ? 700 : 400, background: h.id === rjHotel ? G + "14" : "transparent" } },
                    h.name, h.city ? React.createElement('span', { style: { fontSize: 11.5, color: "#999", marginLeft: 6 } }, h.city) : null))
                )
              )
            );
          })()
        ),
        React.createElement('button', { onClick: exportRapportJourPdf, disabled: !rjHotel, style: { padding: "9px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: rjHotel ? "pointer" : "default", opacity: rjHotel ? 1 : 0.5 } }, "⬇️ Télécharger le PDF")
      ),
      rjHotel && React.createElement('div', { style: { background: "#FBFBFD", border: "1px solid #E8E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" } },
        React.createElement('div', { style: { flex: "1 1 260px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Envoyer au technicien (email)"),
          React.createElement('input', { type: "email", value: rjEmail, onChange: e => setRjEmail(e.target.value), placeholder: "technicien@exemple.com", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box" } })
        ),
        React.createElement('button', { onClick: envoyerRapportJourEmail, disabled: rjEnvoi || !rjEmail.trim(), style: { padding: "9px 18px", background: "#0F0F24", border: "none", color: "white", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: (rjEnvoi || !rjEmail.trim()) ? "default" : "pointer", opacity: (rjEnvoi || !rjEmail.trim()) ? 0.6 : 1 } }, rjEnvoi ? "Envoi…" : "✉️ Envoyer le rapport")
      ),
      rjNote && React.createElement('div', { style: { fontSize: 12.5, color: rjNote.startsWith("❌") || rjNote.startsWith("⚠️") ? "#C53030" : (rjNote.startsWith("✅") ? "#2F855A" : "#666"), marginBottom: 14, background: "#F6F6FA", border: "1px solid #E8E8F0", borderRadius: 8, padding: "9px 12px" } }, rjNote),
      !rjHotel && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Choisissez un établissement pour prévisualiser ses tickets ouverts."),
      rjHotel && React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: "#1a1a3e", marginBottom: 10 } }, (rjHotelObj ? rjHotelObj.name : "") + " — " + rjRows.length + " ticket(s) ouvert(s)"),
        rjRows.length === 0
          ? React.createElement('div', { style: { padding: 24, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun ticket ouvert pour cet établissement.")
          : React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
              rjRows.map((t, i) => React.createElement('div', { key: t.id, style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "13px 16px" } },
                React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } },
                  React.createElement('span', { style: { width: 4, height: 22, borderRadius: 3, background: prioColorRj(t.priority), flexShrink: 0 } }),
                  React.createElement('div', { style: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "#1a1a3e" } }, (i + 1) + ". " + (t.subject || "(sans objet)")),
                  React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: prioColorRj(t.priority) } }, t.priority || "—")
                ),
                React.createElement('div', { style: { fontSize: 11.5, color: "#999", marginBottom: 8 } }, (t.contact_name || "—") + (t.contact_email ? " · " + t.contact_email : "") + " · Ouvert le " + new Date(t.created_at).toLocaleString("fr-FR")),
                React.createElement('div', { style: { fontSize: 10, fontWeight: 700, color: "#B7B7C5", letterSpacing: "0.04em", marginBottom: 3 } }, "DEMANDE INITIALE"),
                React.createElement('div', { style: { fontSize: 12.5, color: "#444", whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: 140, overflow: "hidden" } }, (t.message || "(pas de demande initiale enregistrée)").toString())
              ))
            )
      )
    );
  return content;
}
