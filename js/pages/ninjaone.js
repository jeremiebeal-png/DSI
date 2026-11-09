// ===== Page « ninjaone » — condition dans App : page === "ninjaone" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_ninjaone({...}) de app.js.
function Page_ninjaone(ctx) {
  let content = ctx.content;
  const {
    hotels, isMobile, njHotelFilter, njLoading, njRapports, rattacherRapport, setNjHotelFilter,
    supprimerRapport
  } = ctx;
    const hotelsById = {};
    hotels.forEach(h => { hotelsById[h.id] = h.name; });
    const fmtDate = (iso) => { try { return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return String(iso || ""); } };
    const aRattacher = njRapports.filter(r => r.a_rattacher || !r.hotel_id);
    const rattaches = njRapports.filter(r => r.hotel_id && !r.a_rattacher);
    const filtres = njHotelFilter === "all" ? rattaches : rattaches.filter(r => r.hotel_id === njHotelFilter);
    const carte = (r, orphelin) => React.createElement('div', { key: r.id, style: { background: "white", border: "1px solid " + (orphelin ? "#F0C36D" : "#E8E8F0"), borderRadius: 10, padding: "12px 16px", display: "flex", flexWrap: isMobile ? "wrap" : "nowrap", alignItems: "center", gap: isMobile ? 10 : 14, marginBottom: 8 } },
      React.createElement('div', { style: { fontSize: 22 } }, "📄"),
      React.createElement('div', { style: { flex: isMobile ? "1 1 calc(100% - 40px)" : 1, minWidth: 0 } },
        React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, r.titre || r.file_name || "Rapport"),
        React.createElement('div', { style: { fontSize: 11.5, color: "#888", marginTop: 2 } },
          (orphelin ? ("⚠ Non rattaché" + (r.hotel_hint ? " · détecté : " + r.hotel_hint : "")) : ("🏨 " + (hotelsById[r.hotel_id] || "Hôtel"))) + " · " + fmtDate(r.received_at)
        )
      ),
      React.createElement('select', { value: r.hotel_id || "", onChange: e => e.target.value && rattacherRapport(r.id, e.target.value), title: "Affecter / changer d\u0027hôtel", style: { padding: "6px 10px", border: "1px solid " + (orphelin ? "#F0C36D" : "#DDD"), borderRadius: 7, fontSize: 12, maxWidth: 190 } },
        React.createElement('option', { value: "" }, orphelin ? "Rattacher à…" : "Changer d\u0027hôtel…"),
        hotels.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
      ),
      React.createElement('a', { href: r.file_url, target: "_blank", rel: "noopener", style: { color: G2, fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" } }, "Ouvrir ↗"),
      React.createElement('button', { onClick: () => supprimerRapport(r), title: "Supprimer", style: { background: "none", border: "1px solid #E8B4B4", color: "#C53030", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "6px 10px", whiteSpace: "nowrap" } }, "Supprimer")
    );
    content = React.createElement('div', null,
      React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#2B6CB0", marginBottom: 16, lineHeight: 1.6 } },
        "Rapports NinjaOne reçus automatiquement par email et rattachés à chaque hôtel. Les rapports non reconnus apparaissent en haut pour rattachement manuel."
      ),
      njLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      !njLoading && aRattacher.length > 0 && React.createElement('div', { style: { marginBottom: 22 } },
        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: "#B7791F", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 } }, "⚠ À rattacher (" + aRattacher.length + ")"),
        aRattacher.map(r => carte(r, true))
      ),
      !njLoading && React.createElement('div', { style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" } },
        React.createElement('span', { style: { fontSize: 12, color: "#777", fontWeight: 600 } }, "Hôtel :"),
        React.createElement('select', { value: njHotelFilter, onChange: e => setNjHotelFilter(e.target.value), style: { padding: "6px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12 } },
          React.createElement('option', { value: "all" }, "Tous les hôtels"),
          hotels.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
        )
      ),
      !njLoading && filtres.map(r => carte(r, false)),
      !njLoading && filtres.length === 0 && aRattacher.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun rapport NinjaOne pour le moment.")
    );
  return content;
}
