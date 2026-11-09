// ===== Page « rapport-tickets » — condition dans App : page === "rapport-tickets" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_rapport_tickets({...}) de app.js.
function Page_rapport_tickets(ctx) {
  let content = ctx.content;
  const {
    adressesConnues, destinatairesEnvoi, envoyerRapportTicketsEmail, fmtDateFr, genererRapportTickets,
    hotels, ouvrirEnvoiRapport, rapTkAu, rapTkDu, rapTkEnvoi, rapTkGenere, rapTkHotel, rapTkLang,
    rapTkLoading, rapTkNote, rapTkRows, renderRapportTicketsTable, rtkEnvoiModal, setRapTkAu, setRapTkDu,
    setRapTkHotel, setRapTkLang, setRtkEnvoiModal
  } = ctx;
    const nomH = (id) => { const h = hotels.find(x => x.id === id); return h ? h.name : "?"; };
    const btnS = { padding: "5px 10px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 6, fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap" };
    const inpS = { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    const lblS = { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", margin: "10px 0 4px" };
    // Fenêtre d'envoi immédiat
    var renderFenetresRapport = () => React.createElement(React.Fragment, null,
      rtkEnvoiModal && (() => {
        const m = rtkEnvoiModal;
        const hotel = hotels.find(h => h.id === rapTkHotel);
        const dest = destinatairesEnvoi(m);
        return React.createElement('div', { onClick: e => { if (e.target === e.currentTarget && !rapTkEnvoi) setRtkEnvoiModal(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 } },
          React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" } },
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: "#1a1a3e" } }, "✉️ Envoyer le rapport par email"),
            React.createElement('div', { style: { fontSize: 12, color: "#888", margin: "3px 0 12px" } }, (hotel ? hotel.name : "") + " — " + (rapTkDu ? fmtDateFr(rapTkDu) : "début") + " au " + (rapTkAu ? fmtDateFr(rapTkAu) : "aujourd'hui") + " · PDF joint"),
            React.createElement('div', { style: lblS }, "Contacts de l'établissement"),
            m.choix.length === 0 && React.createElement('div', { style: { fontSize: 12, color: "#999" } }, "Aucun email enregistré sur la fiche de l'établissement."),
            m.choix.map((c, i) => React.createElement('label', { key: c.email, style: { display: "flex", alignItems: "center", gap: 8, padding: "5px 2px", fontSize: 13, cursor: "pointer" } },
              React.createElement('input', { type: "checkbox", checked: c.coche, onChange: e => setRtkEnvoiModal({ ...m, choix: m.choix.map((x, j) => j === i ? { ...x, coche: e.target.checked } : x) }) }),
              React.createElement('span', { style: { color: "#1a1a3e" } }, c.email),
              React.createElement('span', { style: { fontSize: 11, color: "#888", background: "#F0F0F8", padding: "1px 7px", borderRadius: 10 } }, c.label))),
            React.createElement('div', { style: lblS }, "Autres destinataires (externes)"),
            React.createElement('input', { value: m.manuel, onChange: e => setRtkEnvoiModal({ ...m, manuel: e.target.value }), list: "rtk-adresses", placeholder: "ex. direction@groupe.com, comptable@cabinet.fr", style: inpS }),
            React.createElement('datalist', { id: "rtk-adresses" }, adressesConnues().map(a => React.createElement('option', { key: a, value: a }))),
            React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 3 } }, "Séparez plusieurs adresses par une virgule."),
            React.createElement('div', { style: lblS }, "Langue du rapport et de l'email"),
            React.createElement('div', { style: { display: "flex", gap: 6 } },
              [["fr", "🇫🇷 Français"], ["en", "🇬🇧 English"]].map(([code, lbl]) => React.createElement('button', { key: code, type: "button", onClick: () => setRapTkLang(code), style: { padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid " + (rapTkLang === code ? "#0F0F24" : "#DDD"), background: rapTkLang === code ? "#0F0F24" : "white", color: rapTkLang === code ? "white" : "#555" } }, lbl))),
            React.createElement('div', { style: lblS }, rapTkLang === "en" ? "Message (facultatif, à écrire en anglais)" : "Message (facultatif)"),
            React.createElement('textarea', { value: m.message, onChange: e => setRtkEnvoiModal({ ...m, message: e.target.value }), rows: 3, placeholder: "Ajouté en tête de l'email", style: { ...inpS, resize: "vertical" } }),
            React.createElement('div', { style: { fontSize: 12, color: dest.length ? "#2B6CB0" : "#C53030", marginTop: 12 } }, dest.length ? "Sera envoyé à : " + dest.join(", ") : "Aucun destinataire sélectionné."),
            rapTkNote && /^(⚠️|❌)/.test(rapTkNote) && React.createElement('div', { style: { fontSize: 12, color: "#C53030", marginTop: 6 } }, rapTkNote),
            React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" } },
              React.createElement('button', { onClick: () => setRtkEnvoiModal(null), disabled: rapTkEnvoi, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
              React.createElement('button', { onClick: () => envoyerRapportTicketsEmail(dest, m.message), disabled: rapTkEnvoi || !dest.length, style: { padding: "8px 18px", background: "#0F0F24", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (rapTkEnvoi || !dest.length) ? 0.6 : 1 } }, rapTkEnvoi ? "Envoi…" : "Envoyer"))
          ));
      })()
    );
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Générez un rapport de suivi des tickets par établissement et par période. Vous pouvez l'exporter (PDF / Excel) ou l'envoyer au superviseur du client, qui pourra le consulter depuis son espace."
      ),
      // Filtres
      React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: 16, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" } },
        React.createElement('div', { style: { flex: "1 1 220px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Établissement"),
          React.createElement('select', { value: rapTkHotel, onChange: e => setRapTkHotel(e.target.value), style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13 } },
            React.createElement('option', { value: "" }, "— Choisir un établissement —"),
            hotels.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
          )
        ),
        React.createElement('div', { style: { flex: "0 1 150px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Du"),
          React.createElement('input', { type: "date", value: rapTkDu, onChange: e => setRapTkDu(e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13 } })
        ),
        React.createElement('div', { style: { flex: "0 1 150px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Au"),
          React.createElement('input', { type: "date", value: rapTkAu, onChange: e => setRapTkAu(e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13 } })
        ),
        React.createElement('button', { onClick: () => genererRapportTickets(), disabled: rapTkLoading, style: { padding: "9px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: rapTkLoading ? 0.6 : 1 } }, rapTkLoading ? "Génération..." : "Générer le rapport")
      ),
      rapTkNote && React.createElement('div', { style: { fontSize: 12, color: rapTkNote.startsWith("Erreur") ? "#C53030" : "#666", marginBottom: 14 } }, rapTkNote),
      // Envoi au superviseur (visible seulement après génération, si hôtel choisi)
      rapTkGenere && rapTkRows.length > 0 && React.createElement('div', { style: { background: "#FBFBFD", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 15px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
        React.createElement('span', { style: { fontSize: 12, color: "#555", flex: "1 1 auto" } }, "Le superviseur de cet établissement peut déjà consulter ce rapport depuis son espace (rubrique « Suivi des tickets »). Vous pouvez aussi l'envoyer par email avec le PDF joint, à lui et à d'autres destinataires (adresses externes acceptées)."),
        React.createElement('button', { onClick: ouvrirEnvoiRapport, disabled: rapTkEnvoi, style: { padding: "8px 15px", background: "#0F0F24", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: rapTkEnvoi ? 0.6 : 1 } }, rapTkEnvoi ? "Envoi..." : "✉️ Envoyer au client")
      ),
      renderRapportTicketsTable(),
      renderFenetresRapport()
    );
  return content;
}
