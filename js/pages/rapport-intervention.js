// ===== Page « rapport-intervention » — condition dans App : page === "rapport-intervention" && isSupervisor =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_rapport_intervention({...}) de app.js.
function Page_rapport_intervention(ctx) {
  let content = ctx.content;
  const {
    downloadRapportPdf, rapLoading, rapports
  } = ctx;
    const fmtDI = (iso) => { try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }); } catch (e) { return String(iso || ""); } };
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Comptes rendus des interventions réalisées par les techniciens DSI Hotel dans votre établissement."
      ),
      rapLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      !rapLoading && rapports.map(r => React.createElement('div', { key: r.id, style: { display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 16px", marginBottom: 8 } },
        React.createElement('div', { style: { fontSize: 22 } }, "🔧"),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e" } }, "Intervention du " + fmtDI(r.date_intervention)),
          React.createElement('div', { style: { fontSize: 11.5, color: "#999", marginTop: 2 } }, "Technicien : " + (r.technicien || "—") + (r.serveurs_ok ? " · Serveurs OK" : ""))
        ),
        React.createElement('button', { onClick: () => downloadRapportPdf(r), style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px", whiteSpace: "nowrap" } }, "Télécharger le PDF")
      )),
      !rapLoading && rapports.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun rapport d'intervention pour le moment.")
    );
  return content;
}
