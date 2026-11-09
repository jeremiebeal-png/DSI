// ===== Page « suppr-ticket » — condition dans App : page === "suppr-ticket" && isSuperAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_suppr_ticket({...}) de app.js.
function Page_suppr_ticket(ctx) {
  let content = ctx.content;
  const {
    chargerTicketsHotel, confirmationOK, hotels, motConfirmation, rechercherTicketASupprimer,
    setSupprConfirm, setSupprNote, setSupprRef, setSupprTicket, supprBusy, supprConfirm, supprHotel,
    supprListe, supprListeBusy, supprNote, supprRef, supprTicket, supprimerTicketDefinitif
  } = ctx;
    const hAssigne = supprTicket && hotels.find(h => h.id === supprTicket.hotel_id);
    content = React.createElement('div', null,
      React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", borderRadius: 10, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 12, alignItems: "flex-start" } },
        React.createElement('span', { style: { fontSize: 22 } }, "⚠️"),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#B02A2A", marginBottom: 3 } }, "Zone sensible — suppression irréversible"),
          React.createElement('div', { style: { fontSize: 12.5, color: "#8A4B4B", lineHeight: 1.6 } }, "Cette page supprime définitivement un ticket, tous ses messages et toutes ses pièces jointes (y compris les fichiers stockés). Le ticket ne réapparaîtra nulle part. Action réservée au super-administrateur.")
        )
      ),
      // Recherche par référence
      React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" } },
        React.createElement('div', { style: { flex: "1 1 260px" } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Référence du ticket à supprimer"),
          React.createElement('input', { type: "text", value: supprRef, onChange: e => setSupprRef(e.target.value), onKeyDown: e => { if (e.key === "Enter") rechercherTicketASupprimer(); }, placeholder: "Ex. DSI-2026-0224", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box" } })
        ),
        React.createElement('button', { onClick: rechercherTicketASupprimer, disabled: supprBusy || !supprRef.trim(), style: { padding: "9px 18px", background: SB, border: "none", color: "white", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: (supprBusy || !supprRef.trim()) ? "default" : "pointer", opacity: (supprBusy || !supprRef.trim()) ? 0.6 : 1 } }, supprBusy ? "…" : "🔍 Rechercher")
      ),
      // Séparateur OU
      React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 12, margin: "6px 0 16px" } },
        React.createElement('div', { style: { flex: 1, height: 1, background: "#E8E8F0" } }),
        React.createElement('span', { style: { fontSize: 11, color: "#AAA", fontWeight: 600 } }, "OU"),
        React.createElement('div', { style: { flex: 1, height: 1, background: "#E8E8F0" } })
      ),
      // Recherche par hôtel
      React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: 16, marginBottom: 16 } },
        React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 } }, "Rechercher par établissement"),
        React.createElement('select', { value: supprHotel, onChange: e => chargerTicketsHotel(e.target.value), style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box" } },
          React.createElement('option', { value: "" }, "— Choisir un établissement —"),
          hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
        ),
        supprListeBusy && React.createElement('div', { style: { fontSize: 12, color: "#999", marginTop: 10 } }, "Chargement…"),
        supprHotel && !supprListeBusy && React.createElement('div', { style: { marginTop: 12 } },
          supprListe.length === 0
            ? React.createElement('div', { style: { fontSize: 12.5, color: "#999", padding: "8px 0" } }, "Aucun ticket pour cet établissement.")
            : React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 11.5, color: "#888", marginBottom: 8 } }, supprListe.length + " ticket(s) — cliquez pour sélectionner :"),
                React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" } },
                  supprListe.map(t => React.createElement('div', { key: t.id, onClick: () => { setSupprTicket(t); setSupprConfirm(""); setSupprNote(""); }, style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "1px solid " + (supprTicket && supprTicket.id === t.id ? "#F5B5B5" : "#EEE"), background: supprTicket && supprTicket.id === t.id ? "#FDECEC" : "white", borderRadius: 8, cursor: "pointer" } },
                    React.createElement('span', { style: { width: 7, height: 7, borderRadius: "50%", background: t.status === "closed" ? "#A0AEC0" : "#3182CE", flexShrink: 0 } }),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (t.reference || "—") + " · " + (t.subject || "(sans objet)")),
                      React.createElement('div', { style: { fontSize: 11, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (t.contact_name || t.contact_email || "—") + " · " + (t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : ""))
                    ),
                    React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, color: t.status === "closed" ? "#718096" : "#3182CE", whiteSpace: "nowrap" } }, t.status === "closed" ? "Fermé" : "Ouvert")
                  ))
                )
              )
        )
      ),
      supprNote && React.createElement('div', { style: { fontSize: 12.5, color: supprNote.startsWith("❌") || supprNote.startsWith("⚠️") ? "#C53030" : (supprNote.startsWith("✅") ? "#2F855A" : "#666"), marginBottom: 16, background: "#F6F6FA", border: "1px solid #E8E8F0", borderRadius: 8, padding: "9px 12px" } }, supprNote),
      // Aperçu du ticket trouvé + confirmation
      supprTicket && React.createElement('div', { style: { background: "white", border: "2px solid #F5B5B5", borderRadius: 10, padding: 18 } },
        React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: "#1a1a3e", marginBottom: 10 } }, (supprTicket.reference || "—") + " — " + (supprTicket.subject || "(sans objet)")),
        React.createElement('div', { style: { fontSize: 12.5, color: "#555", lineHeight: 1.9, marginBottom: 14 } },
          React.createElement('div', null, "🏨 Hôtel : " + (hAssigne ? hAssigne.name : (supprTicket.hotel_id ? "Inconnu" : "Non assigné"))),
          React.createElement('div', null, "👤 Contact : " + (supprTicket.contact_name || "—") + (supprTicket.contact_email ? " · " + supprTicket.contact_email : "")),
          React.createElement('div', null, "📅 Ouvert le : " + (supprTicket.created_at ? new Date(supprTicket.created_at).toLocaleString("fr-FR") : "—")),
          React.createElement('div', null, "📌 Statut : " + (supprTicket.status === "closed" ? "Fermé" : "Ouvert"))
        ),
        React.createElement('div', { style: { borderTop: "1px solid #F0E0E0", paddingTop: 14 } },
          React.createElement('label', { style: { display: "block", fontSize: 12, fontWeight: 600, color: "#B02A2A", marginBottom: 6 } }, supprTicket.reference ? ("Pour confirmer, retapez la référence « " + supprTicket.reference + " » ci-dessous :") : "Ce ticket n'a pas de référence. Pour confirmer, tapez « SUPPRIMER » ci-dessous :"),
          React.createElement('div', { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
            React.createElement('input', { type: "text", value: supprConfirm, onChange: e => setSupprConfirm(e.target.value), placeholder: motConfirmation(supprTicket), style: { flex: "1 1 200px", padding: "9px 11px", border: "1px solid #F5B5B5", borderRadius: 7, fontSize: 13, boxSizing: "border-box" } }),
            React.createElement('button', { onClick: supprimerTicketDefinitif, disabled: supprBusy || !confirmationOK(), style: { padding: "9px 18px", background: "#C53030", border: "none", color: "white", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: (supprBusy || !confirmationOK()) ? "default" : "pointer", opacity: (supprBusy || !confirmationOK()) ? 0.5 : 1 } }, supprBusy ? "Suppression…" : "🗑️ Supprimer définitivement"),
            React.createElement('button', { onClick: () => { setSupprTicket(null); setSupprConfirm(""); setSupprNote(""); }, style: { padding: "9px 16px", background: "none", border: "1px solid #DDD", color: "#666", borderRadius: 7, fontSize: 13, cursor: "pointer" } }, "Annuler")
          )
        )
      )
    );
  return content;
}
