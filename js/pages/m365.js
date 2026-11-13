// ===== Page « m365 » — condition dans App : page === "m365" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_m365({...}) de app.js.
function Page_m365(ctx) {
  let content = ctx.content;
  const {
    M365_APP_ID, fmtDateHeureFr2, hotels, loadM365, msAjout, msAjouterTenant, msAlertes, msDomaine,
    msEnregistrerNote, msErr, msFiltre, msLoading, msMajTenant, msMsg, msNoteEdit, msPrendreEnCharge, msTab,
    msTenants, msVoirInfo, msVoirResolues, setMsAjout, setMsDomaine, setMsFiltre, setMsMsg, setMsNoteEdit,
    setMsTab, setMsVoirInfo, setMsVoirResolues, setPendingTicketRef
  } = ctx;
    const SEVM = { high: { l: "Haute", c: "#C53030", bg: "#FDECEC" }, medium: { l: "Moyenne", c: "#B7791F", bg: "#FFF6E5" }, low: { l: "Faible", c: "#718096", bg: "#F0F0F4" }, informational: { l: "Info", c: "#2B6CB0", bg: "#EBF4FF" } };
    const sevM = (s) => SEVM[s] || { l: s || "—", c: "#718096", bg: "#F0F0F4" };
    const STATM = { new: "Nouvelle", inProgress: "En cours", resolved: "Résolue" };
    const SRCM = { microsoftDefenderForOffice365: "Defender pour Office 365", azureAdIdentityProtection: "Entra ID Protection", microsoftDefenderForCloudApps: "Defender for Cloud Apps", microsoftDefenderForEndpoint: "Defender for Endpoint", microsoftDefenderForIdentity: "Defender for Identity", microsoft365Defender: "Defender XDR", microsoftDataLossPrevention: "Protection contre la perte de données" };
    const tenantDe = (id) => msTenants.find(t => t.tenant_id === id);
    const nomHotelM = (id) => { const h = hotels.find(x => x.id === id); return h ? h.name : null; };
    const nomTenant = (id) => { const t = tenantDe(id); if (!t) return "Tenant inconnu"; return nomHotelM(t.hotel_id) || t.nom; };
    const estOuverte = (a) => a.statut !== "resolved";
    const enErreur = (t) => t.actif && t.derniere_erreur && !/^Plus de/.test(t.derniere_erreur);
    const actifsT = msTenants.filter(t => t.actif);
    const idsActifs = new Set(actifsT.map(t => t.tenant_id));
    const ouv = msAlertes.filter(a => estOuverte(a) && idsActifs.has(a.tenant_id));
    const nbHautes = ouv.filter(a => a.severite === "high").length;
    const nbNonPrises = ouv.filter(a => !a.vu_par && a.severite !== "informational").length;
    const nbErr = actifsT.filter(enErreur).length;
    const nbSansDef = actifsT.filter(t => t.defender === false).length;
    const rankSev = { high: 0, medium: 1, low: 2, informational: 3 };
    let vues = msAlertes.filter(a => (msVoirResolues || estOuverte(a)) && (msVoirInfo || a.severite !== "informational"));
    if (msFiltre) vues = vues.filter(a => a.tenant_id === msFiltre);
    vues = vues.slice().sort((a, b) =>
      (estOuverte(a) ? 0 : 1) - (estOuverte(b) ? 0 : 1) ||
      (rankSev[a.severite] ?? 4) - (rankSev[b.severite] ?? 4) ||
      new Date(b.cree_le || 0) - new Date(a.cree_le || 0));
    const tuile = (lbl, val, coul) => React.createElement('div', { style: { flex: "1 1 140px", background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 15px" } },
      React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 5 } }, lbl),
      React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: coul } }, String(val)));
    const btn = (lbl, onClick, extra) => React.createElement('button', { onClick, disabled: extra && extra.disabled, title: extra && extra.title, style: Object.assign({ padding: "6px 12px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" }, (extra && extra.style) || {}) }, lbl);
    const inputS = { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    const pastille = (txt, c, bg, title) => React.createElement('span', { title, style: { fontSize: 10.5, fontWeight: 700, color: c, background: bg, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" } }, txt);
    const badgeLic = (lbl, val) => val === true ? pastille("✓ " + lbl, "#2F855A", "#E9F6EE") : val === false ? pastille("✗ " + lbl, "#A0AEC0", "#F4F4F8") : pastille("? " + lbl, "#A0AEC0", "#F4F4F8", "Licences pas encore relues");
    const lienConsentProv = (tid) => "https://login.microsoftonline.com/" + encodeURIComponent(tid) + "/adminconsent?client_id=" + M365_PROV_APP_ID + "&state=provisioning&redirect_uri=" + encodeURIComponent("https://portail.dsihotel.com");
    const lienConsent = (dom) => "https://login.microsoftonline.com/" + encodeURIComponent((dom || "").trim()) + "/adminconsent?client_id=" + M365_APP_ID + "&redirect_uri=" + encodeURIComponent("https://portail.dsihotel.com");
    const copier = (txt, msg) => { try { navigator.clipboard.writeText(txt); setMsMsg("✅ " + msg); } catch (e) { window.prompt("Copiez :", txt); } };
    const ouvrirTicket = (ref) => { if (ref) setPendingTicketRef(String(ref).toUpperCase()); };
    const hotelsTries = hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));

    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        "Alertes de sécurité Microsoft 365 de chaque établissement (Microsoft Defender : hameçonnage, malwares, e-mails signalés, règles de transfert suspectes, connexions à risque…). Les tenants sont relus automatiquement environ toutes les 20 à 30 minutes. Une nouvelle alerte de gravité haute crée un ticket « Cyber Sécurité » urgent et envoie un e-mail à l'équipe."),
      React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 } },
        tuile("Tenants suivis", actifsT.length + " / " + hotels.length, "#0F0F24"),
        tuile("Alertes hautes ouvertes", nbHautes, nbHautes > 0 ? "#C53030" : "#2F855A"),
        tuile("À prendre en charge", nbNonPrises, nbNonPrises > 0 ? "#DD6B20" : "#2F855A"),
        tuile("Tenants en erreur", nbErr, nbErr > 0 ? "#C53030" : "#2F855A"),
        tuile("Sans Defender", nbSansDef, nbSansDef > 0 ? "#B7791F" : "#2F855A")
      ),
      React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 } },
        [["alertes", "🚨 Alertes" + (ouv.length ? " (" + ouv.length + ")" : "")], ["tenants", "🏨 Établissements" + (nbErr ? " (⚠ " + nbErr + ")" : "")]].map(([k, l]) => React.createElement('button', { key: k, onClick: () => setMsTab(k), style: { padding: "7px 15px", border: "1px solid " + (msTab === k ? G : "#DDD"), background: msTab === k ? G + "18" : "white", color: msTab === k ? G2 : "#555", borderRadius: 20, fontSize: 12.5, cursor: "pointer", fontWeight: msTab === k ? 600 : 400 } }, l)),
        React.createElement('a', { href: "https://security.microsoft.com/alerts", target: "_blank", rel: "noopener noreferrer", style: { marginLeft: "auto", fontSize: 12, color: "#2B6CB0", textDecoration: "none", border: "1px solid #BEE3F8", background: "white", borderRadius: 7, padding: "6px 11px" } }, "Microsoft Defender ↗"),
        React.createElement('button', { onClick: () => loadM365(), disabled: msLoading, style: { padding: "7px 13px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, msLoading ? "…" : "🔄 Actualiser")
      ),
      msMsg && React.createElement('div', { style: { fontSize: 12.5, marginBottom: 12, padding: "9px 12px", borderRadius: 8, background: msMsg.startsWith("❌") ? "#FDECEC" : "#F0F7F2", border: "1px solid " + (msMsg.startsWith("❌") ? "#F5B5B5" : "#C6E6D0"), color: msMsg.startsWith("❌") ? "#C53030" : "#2F855A", display: "flex", gap: 10, alignItems: "flex-start" } },
        React.createElement('span', { style: { flex: 1 } }, msMsg),
        React.createElement('button', { onClick: () => setMsMsg(""), style: { border: "none", background: "none", cursor: "pointer", color: "inherit", fontSize: 14 } }, "×")),
      msErr && React.createElement('div', { style: { fontSize: 12.5, marginBottom: 12, padding: "9px 12px", borderRadius: 8, background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030" } }, msErr),

      // ----- Onglet ALERTES -----
      msTab === "alertes" && React.createElement('div', null,
        React.createElement('div', { style: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 } },
          React.createElement('select', { value: msFiltre, onChange: e => setMsFiltre(e.target.value), style: { padding: "7px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12.5, maxWidth: 280 } },
            React.createElement('option', { value: "" }, "Tous les établissements"),
            msTenants.slice().sort((a, b) => nomTenant(a.tenant_id).localeCompare(nomTenant(b.tenant_id))).map(t => React.createElement('option', { key: t.tenant_id, value: t.tenant_id }, nomTenant(t.tenant_id)))),
          React.createElement('label', { style: { fontSize: 12.5, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: msVoirInfo, onChange: e => setMsVoirInfo(e.target.checked) }), "Alertes informatives (e-mails signalés…)"),
          React.createElement('label', { style: { fontSize: 12.5, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: msVoirResolues, onChange: e => setMsVoirResolues(e.target.checked) }), "Alertes résolues"),
          React.createElement('span', { style: { fontSize: 12, color: "#888" } }, vues.length + " alerte" + (vues.length > 1 ? "s" : ""))
        ),
        !msLoading && vues.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", background: "#E9F6EE", border: "1px solid #B7E0C6", borderRadius: 10, color: "#2F855A", fontSize: 13.5, fontWeight: 600 } },
          msTenants.length === 0 ? "Aucun tenant Microsoft 365 suivi : commencez par l'onglet « Établissements »." : "✅ Aucune alerte de sécurité Microsoft 365 ouverte."),
        React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
          vues.map(a => {
            const sm = sevM(a.severite);
            const ouverte = estOuverte(a);
            const msgs = Array.isArray(a.messages) ? a.messages : [];
            const users = Array.isArray(a.utilisateurs) ? a.utilisateurs : [];
            return React.createElement('div', { key: a.id, style: { background: ouverte ? "white" : "#FAFAFC", border: "1px solid " + (ouverte && a.severite === "high" ? "#F5B5B5" : "#E8E8F0"), borderLeft: "5px solid " + (ouverte ? sm.c : "#CBD5E0"), borderRadius: 10, padding: "12px 15px", opacity: ouverte ? 1 : 0.75 } },
              React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 } },
                pastille(sm.l, sm.c, sm.bg),
                React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: "#1a1a3e" } }, (a.hotel_id && nomHotelM(a.hotel_id)) || nomTenant(a.tenant_id)),
                a.service_source && React.createElement('span', { style: { fontSize: 11, color: "#888" } }, SRCM[a.service_source] || a.service_source),
                a.categorie && React.createElement('span', { style: { fontSize: 11, color: "#AAA" } }, "· " + a.categorie),
                React.createElement('span', { style: { marginLeft: "auto", fontSize: 11, color: "#999" } }, fmtDateHeureFr2(a.cree_le)),
                ouverte
                  ? (a.statut === "inProgress" && pastille("En cours (Microsoft)", "#2B6CB0", "#EBF4FF"))
                  : pastille("✓ Résolue" + (a.resolu_le ? " le " + fmtDateHeureFr2(a.resolu_le) : ""), "#2F855A", "#E9F6EE")
              ),
              React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", marginBottom: 3, wordBreak: "break-word" } }, a.titre || "(sans titre)"),
              a.description && React.createElement('div', { style: { fontSize: 12.5, color: "#444", lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap" } }, a.description.length > 600 ? a.description.slice(0, 600) + "…" : a.description),
              users.length > 0 && React.createElement('div', { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 } },
                users.map(u => React.createElement('span', { key: u, style: { fontSize: 11.5, color: "#555", background: "#F0F0F8", padding: "2px 8px", borderRadius: 20 } }, "👤 " + u))),
              msgs.length > 0 && React.createElement('div', { style: { marginTop: 7, display: "flex", flexDirection: "column", gap: 3 } },
                msgs.slice(0, 5).map((m, i) => React.createElement('div', { key: i, style: { fontSize: 12, color: "#555", wordBreak: "break-word" } },
                  "✉️ « " + (m.sujet || "?") + " » — de " + (m.expediteur || "?") + (m.ip_expediteur ? " (" + m.ip_expediteur + ")" : "") + " → " + (m.destinataire || "?"))),
                msgs.length > 5 && React.createElement('div', { style: { fontSize: 11.5, color: "#999" } }, "… et " + (msgs.length - 5) + " autre(s) e-mail(s)")),
              a.note && msNoteEdit?.id !== a.id && React.createElement('div', { style: { marginTop: 7, fontSize: 12, color: "#8A6D1F", background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 7, padding: "6px 9px", whiteSpace: "pre-wrap" } }, "📝 " + a.note),
              msNoteEdit?.id === a.id && React.createElement('div', { style: { marginTop: 8 } },
                React.createElement('textarea', { value: msNoteEdit.note, onChange: e => setMsNoteEdit({ ...msNoteEdit, note: e.target.value }), rows: 2, autoFocus: true, placeholder: "Action menée (mot de passe réinitialisé, règle supprimée, faux positif…)", style: { ...inputS, resize: "vertical" } }),
                React.createElement('div', { style: { display: "flex", gap: 6, marginTop: 6 } },
                  btn("Enregistrer", msEnregistrerNote, { style: { background: G, border: "none", color: "#111", fontWeight: 600 } }),
                  btn("Annuler", () => setMsNoteEdit(null)))),
              React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 9 } },
                a.vu_par
                  ? React.createElement('span', { style: { fontSize: 11.5, color: "#2B6CB0", background: "#EBF4FF", padding: "3px 10px", borderRadius: 20 } }, "👤 Pris en charge par " + a.vu_par + (a.vu_le ? " — " + fmtDateHeureFr2(a.vu_le) : ""))
                  : (ouverte && btn("✋ Prendre en charge", () => msPrendreEnCharge(a), { style: { border: "1px solid " + G, color: G2, fontWeight: 600 } })),
                msNoteEdit?.id !== a.id && btn(a.note ? "✏️ Modifier la note" : "📝 Ajouter une note", () => setMsNoteEdit({ id: a.id, note: a.note || "" })),
                a.ticket_ref && btn("🎫 " + a.ticket_ref, () => ouvrirTicket(a.ticket_ref), { title: "Ouvrir le ticket créé automatiquement", style: { border: "1px solid #F5B5B5", color: "#C53030", fontWeight: 600 } }),
                a.lien_microsoft && React.createElement('a', { href: a.lien_microsoft, target: "_blank", rel: "noopener noreferrer", style: { fontSize: 12, color: "#2B6CB0", textDecoration: "none", border: "1px solid #BEE3F8", borderRadius: 7, padding: "5px 10px" } }, "Ouvrir dans Defender ↗")
              )
            );
          })
        )
      ),

      // ----- Onglet ÉTABLISSEMENTS (tenants) -----
      msTab === "tenants" && React.createElement('div', null,
        React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 14 } },
          React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#1a1a3e", marginBottom: 8 } }, "➕ Ajouter un établissement"),
          React.createElement('div', { style: { fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 10 } },
            "1. Saisissez le domaine Microsoft 365 de l'hôtel et ouvrez le lien de consentement, connecté avec un compte administrateur global de ce tenant → « Accepter ». ",
            "2. De retour sur le portail, l'ID de locataire est rempli automatiquement (sinon : Entra → Vue d'ensemble → ID de locataire). ",
            "3. Choisissez l'établissement et cliquez sur « Ajouter »."),
          React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 } },
            React.createElement('input', { value: msDomaine, onChange: e => setMsDomaine(e.target.value), placeholder: "Domaine de l'hôtel (ex. ic-bordeaux.com)", style: { ...inputS, width: 280 } }),
            btn("🔗 Ouvrir le lien de consentement", () => { if (!msDomaine.trim()) { setMsMsg("❌ Saisissez d'abord le domaine."); return; } window.open(lienConsent(msDomaine), "_blank", "noopener"); }, { disabled: !msDomaine.trim() }),
            btn("📋 Copier le lien", () => copier(lienConsent(msDomaine), "Lien de consentement copié : envoyez-le à l'administrateur du tenant si ce n'est pas vous."), { disabled: !msDomaine.trim() })),
          React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
            React.createElement('input', { value: msAjout.tenant_id, onChange: e => setMsAjout({ ...msAjout, tenant_id: e.target.value }), placeholder: "ID de locataire (GUID)", style: { ...inputS, width: 320, fontFamily: "monospace", fontSize: 12 } }),
            React.createElement('select', { value: msAjout.hotel_id, onChange: e => setMsAjout({ ...msAjout, hotel_id: e.target.value }), style: { ...inputS, width: 240 } },
              React.createElement('option', { value: "" }, "— Établissement —"),
              hotelsTries.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
            React.createElement('input', { value: msAjout.nom, onChange: e => setMsAjout({ ...msAjout, nom: e.target.value }), placeholder: "Libellé (facultatif)", style: { ...inputS, width: 200 } }),
            btn("Ajouter", msAjouterTenant, { style: { background: G, border: "none", color: "#111", fontWeight: 600 } }))
        ),
        msTenants.length === 0 && React.createElement('div', { style: { padding: 24, textAlign: "center", color: "#888", fontSize: 13 } }, "Aucun tenant suivi pour l'instant."),
        React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
          msTenants.slice().sort((a, b) => (enErreur(b) ? 1 : 0) - (enErreur(a) ? 1 : 0) || nomTenant(a.tenant_id).localeCompare(nomTenant(b.tenant_id))).map(t => {
            const ouvT = ouv.filter(a => a.tenant_id === t.tenant_id);
            const hautesT = ouvT.filter(a => a.severite === "high").length;
            const err = enErreur(t);
            const lic = Array.isArray(t.licences) ? t.licences : [];
            return React.createElement('div', { key: t.tenant_id, style: { background: t.actif ? "white" : "#FAFAFC", border: "1px solid " + (err ? "#F5B5B5" : "#E8E8F0"), borderLeft: "5px solid " + (!t.actif ? "#CBD5E0" : err ? "#C53030" : hautesT ? "#C53030" : ouvT.length ? "#DD6B20" : "#2F855A"), borderRadius: 10, padding: "11px 15px", opacity: t.actif ? 1 : 0.7 } },
              React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                React.createElement('span', { style: { fontSize: 13.5, fontWeight: 700, color: "#1a1a3e" } }, nomTenant(t.tenant_id)),
                t.hotel_id && nomHotelM(t.hotel_id) !== t.nom && React.createElement('span', { style: { fontSize: 11.5, color: "#888" } }, "(" + t.nom + ")"),
                badgeLic("Defender", t.defender), badgeLic("Entra P1", t.entra_p1), badgeLic("Entra P2", t.entra_p2),
                ouvT.length > 0 && pastille(ouvT.length + " ouverte" + (ouvT.length > 1 ? "s" : "") + (hautesT ? " · " + hautesT + " haute" + (hautesT > 1 ? "s" : "") : ""), hautesT ? "#C53030" : "#B7791F", hautesT ? "#FDECEC" : "#FFF6E5"),
                React.createElement('span', { style: { marginLeft: "auto", fontSize: 11, color: "#999" } }, t.derniere_synchro ? "Synchro : " + fmtDateHeureFr2(t.derniere_synchro) : "En attente de première synchro")),
              React.createElement('div', { style: { fontSize: 11, color: "#AAA", marginTop: 4, fontFamily: "monospace", wordBreak: "break-all" } }, t.tenant_id + (lic.length ? "  ·  " + lic.join(", ") : "")),
              err && React.createElement('div', { style: { marginTop: 7, fontSize: 12, color: "#C53030", background: "#FDECEC", border: "1px solid #F5B5B5", borderRadius: 7, padding: "6px 9px", wordBreak: "break-word" } }, "⚠️ " + t.derniere_erreur),
              t.defender === false && React.createElement('div', { style: { marginTop: 7, fontSize: 12, color: "#8A6D1F", background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 7, padding: "6px 9px" } }, "Pas de licence Defender pour Office 365 (Business Premium ou Defender P1/P2) : seules les alertes de base remontent."),
              React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 } },
                React.createElement('select', { value: t.hotel_id || "", onChange: e => msMajTenant(t.tenant_id, { hotel_id: e.target.value || null }, "✅ Rattachement enregistré pour « " + t.nom + " »."), style: { padding: "5px 8px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12, maxWidth: 260 } },
                  React.createElement('option', { value: "" }, "— Non rattaché (pas de ticket auto) —"),
                  hotelsTries.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
                React.createElement('label', { style: { fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" } },
                  React.createElement('input', { type: "checkbox", checked: !!t.actif, onChange: e => msMajTenant(t.tenant_id, { actif: e.target.checked }, (e.target.checked ? "✅ Supervision réactivée" : "⏸ Supervision suspendue") + " pour « " + t.nom + " ».") }), "Supervision active"),
                React.createElement('label', { title: "Autorise la création des boîtes mail depuis les tickets « Arrivée collaborateur » (nécessite le consentement de l'app « DSI Hotel Provisioning » dans ce tenant)", style: { fontSize: 12, color: t.provisioning_actif ? "#1F4E8C" : "#555", fontWeight: t.provisioning_actif ? 600 : 400, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" } },
                  React.createElement('input', { type: "checkbox", checked: !!t.provisioning_actif, onChange: e => msMajTenant(t.tenant_id, { provisioning_actif: e.target.checked }, (e.target.checked ? "✅ Création de comptes activée" : "⏸ Création de comptes désactivée") + " pour « " + t.nom + " ».") }), "📧 Création de comptes"),
                M365_PROV_APP_ID && React.createElement('a', { href: lienConsentProv(t.tenant_id), target: "_blank", rel: "noopener noreferrer", title: "À ouvrir avec un compte administrateur global de ce tenant (une seule fois, puis après tout ajout de permission)", style: { fontSize: 12, color: "#1F4E8C", textDecoration: "none", border: "1px solid #BFD5F2", borderRadius: 7, padding: "4px 10px" } }, "🔑 Consentement création de comptes"),
                btn("Alertes", () => { setMsFiltre(t.tenant_id); setMsTab("alertes"); }, { style: { padding: "4px 10px" } }))
            );
          })
        )
      )
    );
  return content;
}
