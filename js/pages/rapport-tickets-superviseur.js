// ===== Page « rapport-tickets » — condition dans App : page === "rapport-tickets" && isSupervisor =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_rapport_tickets_superviseur({...}) de app.js.
function Page_rapport_tickets_superviseur(ctx) {
  let content = ctx.content;
  const {
    genererRapportTickets, hotels, myHotelId, rapTkAu, rapTkDu, rapTkLoading, rapTkNote,
    renderRapportTicketsTable, setRapTkAu, setRapTkDu
  } = ctx;
    const monHotel = hotels.find(h => h.id === myHotelId);
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Suivi de vos tickets de support" + (monHotel ? " — " + monHotel.name : "") + ". Choisissez une période puis exportez le rapport en PDF ou Excel si besoin."
      ),
      React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: 16, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" } },
        React.createElement('div', { style: { flex: "0 1 150px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Du"),
          React.createElement('input', { type: "date", value: rapTkDu, onChange: e => setRapTkDu(e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13 } })
        ),
        React.createElement('div', { style: { flex: "0 1 150px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Au"),
          React.createElement('input', { type: "date", value: rapTkAu, onChange: e => setRapTkAu(e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13 } })
        ),
        React.createElement('button', { onClick: () => genererRapportTickets(myHotelId), disabled: rapTkLoading, style: { padding: "9px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: rapTkLoading ? 0.6 : 1 } }, rapTkLoading ? "Chargement..." : "Actualiser")
      ),
      rapTkNote && React.createElement('div', { style: { fontSize: 12, color: rapTkNote.startsWith("Erreur") ? "#C53030" : "#666", marginBottom: 14 } }, rapTkNote),
      renderRapportTicketsTable()
    );
  return content;
}
