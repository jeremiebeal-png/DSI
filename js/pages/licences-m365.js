// ===== Page « licences-m365 » — condition dans App : page === "licences-m365" && (isAdmin || isSupervisor) =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_licences_m365({...}) de app.js.
function Page_licences_m365(ctx) {
  let content = ctx.content;
  const {
    exporterLicencesCsv, exporterLicencesPdf, hotels, isAdmin, lmErr, lmHotel, lmLoading, lmRapport,
    lmRecherche, lmTenants, lmVue, loadLicencesM365, mesHotels, myHotelId, setLmErr, setLmHotel,
    setLmRapport, setLmRecherche, setLmVue
  } = ctx;
    const hidLm = isAdmin ? lmHotel : myHotelId;
    const hotelLm = hotels.find(h => h.id === hidLm) || mesHotels.find(h => h.id === hidLm);
    const nomHotelLm = hotelLm ? hotelLm.name : "";
    const dLm = (lmRapport && lmRapport.donnees) || null;
    const fmtDLm = (iso) => { try { return iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—"; } catch (e) { return "—"; } };
    const tuileLm = (lbl, val, coul, sous) => React.createElement('div', { style: { flex: "1 1 140px", background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 15px" } },
      React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 5 } }, lbl),
      React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: coul } }, String(val == null ? "—" : val)),
      sous && React.createElement('div', { style: { fontSize: 10.5, color: "#999", marginTop: 3 } }, sous));
    const btnLm = (lbl, onClick, principal, disabled) => React.createElement('button', { onClick, disabled, style: { padding: "7px 13px", background: principal ? G : "white", border: "1px solid " + (principal ? G : "#DDD"), color: principal ? "#111" : "#555", fontWeight: principal ? 600 : 400, borderRadius: 7, fontSize: 12, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap" } }, lbl);
    const pastLm = (txt, c, bg) => React.createElement('span', { style: { fontSize: 10.5, fontWeight: 700, color: c, background: bg, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", marginRight: 4 } }, txt);
    const th = { textAlign: "left", padding: "9px 10px", fontSize: 11, color: "#888", fontWeight: 600, borderBottom: "1px solid #EEE", whiteSpace: "nowrap" };
    const td = { padding: "9px 10px", fontSize: 12.5, color: "#333", borderBottom: "1px solid #F3F3F7", verticalAlign: "top" };
    const carte = (titre, ...enfants) => React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 } },
      React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#1a1a3e", marginBottom: 10 } }, titre), ...enfants);
    const tenantsParHotel = {};
    lmTenants.forEach(t => { if (t.hotel_id) tenantsParHotel[t.hotel_id] = t; });
    // App « DSI Hotel Licences M365 » (tenant DSI Hotel) : son ID est renvoyé par le Worker (variable M365_SUP_CLIENT_ID)
    const lienConsentLm = (tid) => "https://login.microsoftonline.com/" + encodeURIComponent(tid) + "/adminconsent?client_id=" + encodeURIComponent((lmErr && lmErr.appId) || "") + "&redirect_uri=" + encodeURIComponent("https://portail.dsihotel.com");

    // Utilisateurs filtrés
    let usersLm = (dLm && dLm.utilisateurs) || [];
    if (lmVue === "licencies") usersLm = usersLm.filter(u => u.nbPayantes > 0);
    else if (lmVue === "revoir") usersLm = usersLm.filter(u => u.alertes && u.alertes.length);
    const rq = lmRecherche.trim().toLowerCase();
    if (rq) usersLm = usersLm.filter(u => (u.nom + " " + u.upn + " " + (u.licences || []).join(" ") + " " + (u.service || "")).toLowerCase().includes(rq));
    const NIV = { haut: { c: "#C53030", bg: "#FDECEC", i: "⛔" }, moyen: { c: "#B7791F", bg: "#FFF6E5", i: "⚠️" }, info: { c: "#2B6CB0", bg: "#EBF4FF", i: "ℹ️" } };
    const payantesLm = dLm ? (dLm.licences || []).filter(l => !l.gratuite) : [];
    const gratuitesLm = dLm ? (dLm.licences || []).filter(l => l.gratuite) : [];
    const t = (dLm && dLm.totaux) || {};
    const sansActivite = dLm && dLm.sourceActivite === "aucune";

    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        isAdmin
          ? "État des licences Microsoft 365 d'un établissement, lu directement dans son tenant : licences achetées, attribuées et disponibles, et comptes à revoir (désactivés, inactifs depuis plus de 90 jours, invités). Le superviseur de l'établissement voit le même rapport dans son espace."
          : "État des licences Microsoft 365 de votre établissement : licences achetées, attribuées et disponibles, et comptes qui mériteraient d'être revus (désactivés, inactifs depuis plus de 90 jours…). Cliquez sur « Actualiser » pour relire les données à jour chez Microsoft."),

      // Barre d'outils
      React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 } },
        isAdmin && React.createElement('select', { value: lmHotel, onChange: e => { setLmHotel(e.target.value); setLmRapport(null); setLmErr(null); }, style: { padding: "7px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12.5, minWidth: 240, maxWidth: "100%" } },
          React.createElement('option', { value: "" }, "— Choisir un établissement —"),
          hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "fr")).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name + (tenantsParHotel[h.id] ? "" : " (pas de tenant M365)")))),
        hotelLm && hotelLm.logo_url && React.createElement('img', { src: hotelLm.logo_url, alt: nomHotelLm, style: { height: 36, maxWidth: 120, objectFit: "contain", background: "white", border: "1px solid #E8E8F0", borderRadius: 7, padding: 3 } }),
        !isAdmin && nomHotelLm && React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: "#1a1a3e" } }, (hotelLm && hotelLm.logo_url ? "" : "🏨 ") + nomHotelLm),
        lmRapport && lmRapport.genere_le && React.createElement('span', { style: { fontSize: 11.5, color: "#999" } }, "Données du " + new Date(lmRapport.genere_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })),
        React.createElement('div', { style: { marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" } },
          btnLm(lmLoading ? "⏳ Lecture Microsoft 365…" : "🔄 Actualiser", () => loadLicencesM365(true), false, lmLoading || !hidLm),
          btnLm("📊 Export Excel", () => exporterLicencesCsv(lmRapport, nomHotelLm), false, !dLm),
          btnLm("📄 Télécharger le PDF", () => exporterLicencesPdf(lmRapport, nomHotelLm, hotelLm && hotelLm.logo_url), true, !dLm))
      ),

      // Erreurs
      lmErr && React.createElement('div', { style: { fontSize: 12.5, marginBottom: 14, padding: "10px 13px", borderRadius: 8, background: lmErr.code === "PAS_DE_TENANT" ? "#FFF6E5" : "#FDECEC", border: "1px solid " + (lmErr.code === "PAS_DE_TENANT" ? "#F6D9A8" : "#F5B5B5"), color: lmErr.code === "PAS_DE_TENANT" ? "#8A5A00" : "#C53030", lineHeight: 1.55 } },
        isAdmin ? lmErr.msg : (lmErr.code === "PAS_DE_TENANT" ? "Le rapport des licences n'est pas encore disponible pour votre établissement. Contactez DSI Hotel pour l'activer." : "Les données Microsoft 365 n'ont pas pu être relues pour le moment" + (dLm ? " : le dernier rapport disponible est affiché." : ". Réessayez plus tard ou contactez DSI Hotel.")),
        isAdmin && lmErr.code === "CONSENTEMENT" && lmErr.tenantId && lmErr.appId && React.createElement('div', { style: { marginTop: 8 } },
          "Après ajout des nouvelles permissions à l'application, l'administrateur global du tenant doit refaire le consentement : ",
          React.createElement('a', { href: lienConsentLm(lmErr.tenantId), target: "_blank", rel: "noopener noreferrer", style: { color: "#2B6CB0", fontWeight: 600 } }, "lien de consentement ↗"),
          " ",
          React.createElement('button', { onClick: () => { try { navigator.clipboard.writeText(lienConsentLm(lmErr.tenantId)); } catch (e) { window.prompt("Copiez :", lienConsentLm(lmErr.tenantId)); } }, style: { border: "1px solid #DDD", background: "white", borderRadius: 6, fontSize: 11.5, padding: "3px 8px", cursor: "pointer", marginLeft: 4 } }, "Copier"))),

      isAdmin && !hidLm && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Choisissez un établissement pour afficher l'état de ses licences Microsoft 365."),
      hidLm && lmLoading && !dLm && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Lecture des licences dans Microsoft 365… (quelques secondes)"),

      dLm && React.createElement('div', null,
        React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 } },
          tuileLm("Licences achetées", t.achetees, "#0F0F24", payantesLm.length + " type" + (payantesLm.length > 1 ? "s" : "") + " de licence"),
          tuileLm("Attribuées", t.attribuees, "#0F0F24", t.utilisateursLicencies + " compte" + (t.utilisateursLicencies > 1 ? "s" : "") + " licencié" + (t.utilisateursLicencies > 1 ? "s" : "")),
          tuileLm("Disponibles", t.disponibles, t.disponibles > 0 ? "#2B6CB0" : "#2F855A", t.disponibles > 0 ? "payées, non attribuées" : "aucune licence libre"),
          tuileLm("Comptes à revoir", t.aRevoir, t.aRevoir > 0 ? "#DD6B20" : "#2F855A", t.aRevoir > 0 ? "désactivés / inactifs / invités" : "rien à signaler")),

        (dLm.avertissements || []).length > 0 && React.createElement('div', { style: { fontSize: 12, marginBottom: 14, padding: "9px 12px", borderRadius: 8, background: "#F7F7FA", border: "1px solid #E8E8F0", color: "#666", lineHeight: 1.55 } },
          (dLm.avertissements || []).map((a, i) => React.createElement('div', { key: i }, "ℹ️ " + a))),

        dLm.partage && React.createElement('div', { style: { fontSize: 12, marginBottom: 14, padding: "9px 12px", borderRadius: 8, background: "#EBF4FF", border: "1px solid #BEE3F8", color: "#2B6CB0", lineHeight: 1.55 } },
          "🏢 Abonnement Microsoft 365 partagé avec d'autres établissements : seuls les comptes " + (dLm.partage.domaines || []).map(d => "@" + d).join(", ") + " sont comptés ici. « Achetées » correspond aux licences attribuées à ces comptes ; les licences libres de l'abonnement sont communes à tous les établissements."),

        // Licences
        carte("📦 Licences de l'établissement",
          React.createElement('div', { style: { overflowX: "auto" } },
            React.createElement('table', { style: { width: "100%", borderCollapse: "collapse", minWidth: 560 } },
              React.createElement('thead', null, React.createElement('tr', null,
                React.createElement('th', { style: th }, "Licence"),
                React.createElement('th', { style: { ...th, textAlign: "right" } }, "Achetées"),
                React.createElement('th', { style: { ...th, textAlign: "right" } }, "Attribuées"),
                React.createElement('th', { style: { ...th, textAlign: "right" } }, "Disponibles"),
                React.createElement('th', { style: { ...th, width: 150 } }, "Utilisation"),
                React.createElement('th', { style: th }, "Échéance"))),
              React.createElement('tbody', null,
                payantesLm.map(l => {
                  const pct = l.total ? Math.min(100, Math.round(l.attribuees / l.total * 100)) : 0;
                  return React.createElement('tr', { key: l.skuId },
                    React.createElement('td', { style: td },
                      React.createElement('div', { style: { fontWeight: 600 } }, l.nom),
                      React.createElement('div', { style: { fontSize: 10.5, color: "#AAA" } }, l.code),
                      (l.essai || (l.statut && l.statut !== "Enabled") || l.depassement > 0) && React.createElement('div', { style: { marginTop: 3 } },
                        l.essai && pastLm("Essai", "#2B6CB0", "#EBF4FF"),
                        l.statut === "Warning" && pastLm("Expirée — période de grâce", "#C53030", "#FDECEC"),
                        l.statut === "Suspended" && pastLm("Suspendue", "#C53030", "#FDECEC"),
                        l.depassement > 0 && pastLm("+" + l.depassement + " au-delà de l'achat", "#C53030", "#FDECEC"))),
                    React.createElement('td', { style: { ...td, textAlign: "right" } }, l.total),
                    React.createElement('td', { style: { ...td, textAlign: "right" } }, l.attribuees),
                    React.createElement('td', { style: { ...td, textAlign: "right", fontWeight: 700, color: l.disponibles > 0 ? "#2B6CB0" : "#999" } }, l.disponibles,
                      l.tenant && l.tenant.disponibles > 0 && React.createElement('div', { style: { fontSize: 10.5, fontWeight: 400, color: "#2B6CB0" } }, "+" + l.tenant.disponibles + " libre" + (l.tenant.disponibles > 1 ? "s" : "") + " (partagé)")),
                    React.createElement('td', { style: td },
                      React.createElement('div', { style: { height: 7, background: "#F0F0F4", borderRadius: 4, overflow: "hidden", marginTop: 5 } },
                        React.createElement('div', { style: { width: pct + "%", height: "100%", background: pct >= 100 ? "#2F855A" : G } })),
                      React.createElement('div', { style: { fontSize: 10.5, color: "#999", marginTop: 3 } }, pct + " %")),
                    React.createElement('td', { style: { ...td, whiteSpace: "nowrap" } }, fmtDLm(l.prochaineEcheance)));
                }),
                payantesLm.length === 0 && React.createElement('tr', null, React.createElement('td', { colSpan: 6, style: { ...td, textAlign: "center", color: "#999" } }, "Aucune licence payante dans ce tenant.")))),
            gratuitesLm.length > 0 && React.createElement('div', { style: { fontSize: 11, color: "#AAA", marginTop: 8 } }, "Licences gratuites / d'essai Microsoft non comptées : " + gratuitesLm.map(l => l.nom).join(", ")))),

        // Points à vérifier
        (dLm.alertes || []).length > 0 && carte("🔎 Points à vérifier (" + dLm.alertes.length + ")",
          (dLm.alertes || []).map((a, i) => {
            const n = NIV[a.niveau] || NIV.info;
            return React.createElement('div', { key: i, style: { display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 10px", borderRadius: 7, background: n.bg, color: n.c, fontSize: 12.5, marginBottom: 5, lineHeight: 1.45 } },
              React.createElement('span', null, n.i), React.createElement('span', null, a.texte));
          })),

        // Comptes
        carte("👤 Comptes",
          React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 } },
            [["licencies", "Avec licence"], ["revoir", "À revoir" + (t.aRevoir ? " (" + t.aRevoir + ")" : "")], ["tous", "Tous les comptes"]].map(([k, l]) => React.createElement('button', { key: k, onClick: () => setLmVue(k), style: { padding: "6px 13px", border: "1px solid " + (lmVue === k ? G : "#DDD"), background: lmVue === k ? G + "18" : "white", color: lmVue === k ? G2 : "#555", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: lmVue === k ? 600 : 400 } }, l)),
            React.createElement('input', { value: lmRecherche, onChange: e => setLmRecherche(e.target.value), placeholder: "Rechercher un nom, une adresse, une licence…", style: { flex: "1 1 220px", padding: "7px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12.5, fontFamily: "inherit" } }),
            React.createElement('span', { style: { fontSize: 12, color: "#888" } }, usersLm.length + " compte" + (usersLm.length > 1 ? "s" : ""))),
          React.createElement('div', { style: { overflowX: "auto" } },
            React.createElement('table', { style: { width: "100%", borderCollapse: "collapse", minWidth: 640 } },
              React.createElement('thead', null, React.createElement('tr', null,
                React.createElement('th', { style: th }, "Utilisateur"),
                React.createElement('th', { style: th }, "Licence(s)"),
                React.createElement('th', { style: th }, "Compte"),
                React.createElement('th', { style: th }, "Dernière activité"))),
              React.createElement('tbody', null,
                usersLm.slice(0, 500).map(u => React.createElement('tr', { key: u.upn, style: { background: u.alertes && u.alertes.length ? "#FFFBF2" : "white" } },
                  React.createElement('td', { style: td },
                    React.createElement('div', { style: { fontWeight: 600 } }, u.nom || "—"),
                    React.createElement('div', { style: { fontSize: 11, color: "#999", wordBreak: "break-all" } }, u.upn),
                    (u.poste || u.service) && React.createElement('div', { style: { fontSize: 11, color: "#AAA" } }, [u.poste, u.service].filter(Boolean).join(" · "))),
                  React.createElement('td', { style: { ...td, fontSize: 12 } }, (u.licences || []).length ? u.licences.join(", ") : React.createElement('span', { style: { color: "#BBB" } }, "Aucune")),
                  React.createElement('td', { style: td },
                    u.actif ? pastLm("Actif", "#2F855A", "#E9F6EE") : pastLm("Désactivé", "#C53030", "#FDECEC"),
                    u.invite && pastLm("Invité", "#6B46C1", "#F3EEFF")),
                  React.createElement('td', { style: { ...td, whiteSpace: "nowrap" } },
                    sansActivite ? React.createElement('span', { style: { color: "#BBB" } }, "n.c.")
                      : u.derniereActivite ? React.createElement('span', { style: { color: u.joursInactif > 90 ? "#DD6B20" : "#333", fontWeight: u.joursInactif > 90 ? 600 : 400 } }, fmtDLm(u.derniereActivite) + (u.joursInactif > 90 ? " (" + u.joursInactif + " j)" : ""))
                      : React.createElement('span', { style: { color: u.nbPayantes > 0 ? "#DD6B20" : "#BBB" } }, "Jamais")))),
                usersLm.length === 0 && React.createElement('tr', null, React.createElement('td', { colSpan: 4, style: { ...td, textAlign: "center", color: "#999" } }, "Aucun compte.")))),
            usersLm.length > 500 && React.createElement('div', { style: { fontSize: 11.5, color: "#999", marginTop: 6 } }, "500 premiers comptes affichés — utilisez la recherche ou l'export Excel pour la liste complète.")))
      )
    );
  return content;
}
