// ===== Page « historique-comptes » — condition dans App : page === "historique-comptes" && (isAdmin || isSupervisor) =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_historique_comptes({...}) de app.js.
function Page_historique_comptes(ctx) {
  let content = ctx.content;
  const {
    HC_TYPES, badgeValidation, hcErr, hcFiles, hcHotel, hcInfos, hcLoading, hcOpenId, hcRows, hcSearch,
    hcStatut, hcType, hcVoirTicket, hotels, isAdmin, loadHistoriqueComptes, setHcHotel, setHcOpenId,
    setHcSearch, setHcStatut, setHcType, validations
  } = ctx;
    const q = hcSearch.trim().toLowerCase();
    const nomHotelDe = (id) => { const h = hotels.find(x => x.id === id); return h ? h.name : (id ? "?" : "Non assigné"); };
    const lignesHc = hcRows.map(t => ({ t, i: hcInfos(t) })).filter(({ t, i }) => {
      if (hcType && i.type !== hcType) return false;
      if (hcHotel && t.hotel_id !== hcHotel) return false;
      if (hcStatut === "open" && t.status === "closed") return false;
      if (hcStatut === "closed" && t.status !== "closed") return false;
      if (q) {
        const txt = [t.reference, i.collaborateur, i.poste, i.compte, t.contact_name, t.contact_email, isAdmin ? nomHotelDe(t.hotel_id) : ""].join(" ").toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
    const fmtD = (s) => s ? new Date(s).toLocaleDateString("fr-FR") : "";
    const exporterCsv = () => {
      const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const entetes = ["Date", "Référence", ...(isAdmin ? ["Hôtel"] : []), "Type", "Collaborateur", "Poste", "Compte concerné", "Date d'effet", "Demandé par", "Email demandeur", "Statut", "Validation"];
      const lignesCsv = lignesHc.map(({ t, i }) => {
        const v = t.reference && validations[t.reference];
        const val = v ? (v.status === "validated" ? "Validé" : v.status === "refused" ? "Refusé" : "En attente") : "";
        return [fmtD(t.created_at), t.reference || "", ...(isAdmin ? [nomHotelDe(t.hotel_id)] : []), i.type, i.collaborateur, i.poste, i.compte, i.dateEffet, t.contact_name, t.contact_email, t.status === "closed" ? "Fermé" : "Ouvert", val].map(esc).join(";");
      });
      const blob = new Blob(["\ufeff" + [entetes.map(esc).join(";"), ...lignesCsv].join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "Historique_comptes_" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };
    const selS = { padding: "7px 9px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12.5, background: "white", fontFamily: "inherit" };
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14, lineHeight: 1.6 } },
        isAdmin ? "Toutes les demandes de création, modification, suppression de compte et de mot de passe, pour tous les hôtels. Cliquez sur une ligne pour voir le détail."
                : "Toutes les demandes de création, modification, suppression de compte et de mot de passe de votre établissement. Cliquez sur une ligne pour voir le détail."),
      React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 } },
        React.createElement('input', { value: hcSearch, onChange: e => setHcSearch(e.target.value), placeholder: "Rechercher : collaborateur, référence, demandeur…", style: { ...selS, flex: "1 1 240px", minWidth: 0 } }),
        React.createElement('select', { value: hcType, onChange: e => setHcType(e.target.value), style: selS },
          React.createElement('option', { value: "" }, "Tous les types"),
          ["Création", "Modification", "Suppression", "Mot de passe", "Autre demande"].map(x => React.createElement('option', { key: x, value: x }, x))),
        isAdmin && React.createElement('select', { value: hcHotel, onChange: e => setHcHotel(e.target.value), style: { ...selS, maxWidth: 200 } },
          React.createElement('option', { value: "" }, "Tous les hôtels"),
          [...hotels].sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr")).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
        React.createElement('select', { value: hcStatut, onChange: e => setHcStatut(e.target.value), style: selS },
          React.createElement('option', { value: "" }, "Tous statuts"),
          React.createElement('option', { value: "open" }, "Ouvertes"),
          React.createElement('option', { value: "closed" }, "Fermées")),
        React.createElement('button', { onClick: loadHistoriqueComptes, disabled: hcLoading, style: { ...selS, cursor: "pointer" } }, hcLoading ? "…" : "↻"),
        React.createElement('button', { onClick: exporterCsv, disabled: !lignesHc.length, style: { ...selS, cursor: "pointer", background: G, border: "none", fontWeight: 600, color: "#111" } }, "⬇ Export Excel (CSV)")
      ),
      React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 8 } }, lignesHc.length + " demande" + (lignesHc.length > 1 ? "s" : "") + (lignesHc.length !== hcRows.length ? " sur " + hcRows.length : "")),
      hcErr && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 } }, hcErr),
      hcLoading && !hcRows.length && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      !hcLoading && !hcErr && lignesHc.length === 0 && React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 28, textAlign: "center", color: "#999", fontSize: 13 } }, hcRows.length ? "Aucune demande ne correspond aux filtres." : "Aucune demande de compte pour le moment."),
      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
        lignesHc.map(({ t, i }) => {
          const ouvert = hcOpenId === t.id;
          const [c, bg] = HC_TYPES[i.type] || HC_TYPES["Autre"];
          const pdfs = hcFiles[t.id] || [];
          return React.createElement('div', { key: t.id, style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, overflow: "hidden" } },
            React.createElement('div', { onClick: () => setHcOpenId(ouvert ? null : t.id), style: { padding: "11px 14px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } },
              React.createElement('div', { style: { fontSize: 11.5, color: "#888", minWidth: 78 } }, fmtD(t.created_at)),
              React.createElement('span', { style: { fontSize: 10.5, fontWeight: 700, color: c, background: bg, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" } }, i.type),
              React.createElement('div', { style: { flex: "1 1 200px", minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e" } }, i.collaborateur || i.compte || t.subject || "(sans nom)"),
                React.createElement('div', { style: { fontSize: 11.5, color: "#888", marginTop: 2 } },
                  [isAdmin ? nomHotelDe(t.hotel_id) : null, i.poste, i.dateEffet ? ((i.type === "Suppression" ? "Départ : " : "Effet : ") + i.dateEffet) : null, "Demandé par " + (t.contact_name || t.contact_email || "?")].filter(Boolean).join(" · "))
              ),
              badgeValidation(t.reference),
              React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, color: t.status === "closed" ? "#888" : "#2F855A", background: t.status === "closed" ? "#F0F0F5" : "#EAF6EC", padding: "3px 9px", borderRadius: 20 } }, t.status === "closed" ? "Fermée" : (t.en_attente ? "En cours" : "Ouverte")),
              React.createElement('span', { style: { fontSize: 10.5, color: "#999", fontFamily: "monospace" } }, t.reference || "")
            ),
            ouvert && React.createElement('div', { style: { borderTop: "1px solid #F0F0F8", padding: "12px 14px", background: "#FAFAFC" } },
              React.createElement('div', { style: { whiteSpace: "pre-wrap", fontSize: 12.5, color: "#444", lineHeight: 1.6 } }, t.message || ""),
              React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" } },
                pdfs.map(f => React.createElement('a', { key: f.id, href: f.file_url, target: "_blank", rel: "noreferrer", style: { fontSize: 12, color: G2, textDecoration: "none", border: "1px solid #E8D89A", borderRadius: 6, padding: "5px 10px", background: "white" } }, "📕 " + f.file_name)),
                React.createElement('button', { onClick: () => hcVoirTicket(t), style: { marginLeft: "auto", padding: "6px 14px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Voir le ticket →")
              )
            )
          );
        })
      )
    );
  return content;
}
