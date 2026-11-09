// ===== Page « rapport-securite » — condition dans App : page === "rapport-securite" && isSupervisor =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_rapport_securite({...}) de app.js.
function Page_rapport_securite(ctx) {
  let content = ctx.content;
  const {
    njLoading, njRapports
  } = ctx;
    const fmtD = (iso) => { try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }); } catch (e) { return String(iso || ""); } };
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Rapports de supervision et de sécurité informatique de votre établissement, générés automatiquement par nos outils de surveillance."
      ),
      njLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      !njLoading && njRapports.map(r => React.createElement('a', { key: r.id, href: r.file_url, target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 16px", marginBottom: 8, textDecoration: "none" } },
        React.createElement('div', { style: { fontSize: 22 } }, "📄"),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, r.titre || r.file_name || "Rapport"),
          React.createElement('div', { style: { fontSize: 11.5, color: "#999", marginTop: 2 } }, fmtD(r.received_at))
        ),
        React.createElement('span', { style: { color: G2, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" } }, "Ouvrir ↗")
      )),
      !njLoading && njRapports.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun rapport de sécurité pour le moment.")
    );
  return content;
}
