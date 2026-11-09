// ===== Page « client-admin » — condition dans App : page === "client-admin" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_client_admin({...}) de app.js.
function Page_client_admin(ctx) {
  let content = ctx.content;
  const {
    addAccountErr, addAccountForm, addAccountHotel, ajouterRecoMail, clientErr, clientExistingFiles,
    clientForm, clientLogoFile, clientNewFiles, clientSearch, clientStats, deleteClient, editingClientId, go,
    hotels, hotelsLoading, isMobile, mapGeoStatus, openEditClientForm, openNewClientForm, recoMail, recoNew,
    removeExistingClientFile, resetPwBusy, resetPwTarget, resetPwValue, savingAccount, savingClient,
    setAddAccountErr, setAddAccountForm, setAddAccountHotel, setClientForm, setClientLogoFile,
    setClientNewFiles, setClientSearch, setEditCid, setRecoNew, setResetPwTarget, setResetPwValue,
    setShowClientForm, setShowClientMap, setTicketSearch, showClientForm, showClientMap, submitAddAccount,
    submitClientForm, submitResetPassword, supprimerRecoMail
  } = ctx;
    content = React.createElement('div', null,
      React.createElement('div', { style: { display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" } },
        React.createElement('div', { style: { flex: "1 1 260px", position: "relative", minWidth: 180 } },
          React.createElement('span', { style: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#AAA", pointerEvents: "none" } }, "🔍"),
          React.createElement('input', {
            type: "text", value: clientSearch, onChange: e => setClientSearch(e.target.value),
            placeholder: "Rechercher un client (nom, ville, email…)",
            style: { width: "100%", padding: "9px 32px 9px 32px", border: "1px solid #DDD", borderRadius: 20, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }
          }),
          clientSearch && React.createElement('button', { onClick: () => setClientSearch(""), title: "Effacer", style: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#999", fontSize: 15, cursor: "pointer", lineHeight: 1, padding: 2 } }, "✕")
        ),
        React.createElement('button', { onClick: () => setShowClientMap(true), title: "Voir les clients sur la carte", style: { display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #DDD", color: "#444", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "9px 15px", whiteSpace: "nowrap" } }, "🗺️ Carte"),
        React.createElement('button', { onClick: openNewClientForm, style: { display: "flex", alignItems: "center", gap: 5, background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "9px 14px", whiteSpace: "nowrap" } }, "+ Ajouter un client")
      ),
      showClientMap && React.createElement('div', { onClick: (e) => { if (e.target === e.currentTarget) setShowClientMap(false); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "10px" : "30px", zIndex: 90 } },
        React.createElement('div', { onClick: (e) => e.stopPropagation(), style: { background: "white", borderRadius: 16, width: "min(1100px,96vw)", height: "min(88vh,860px)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.4)" } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid #E8E8F0" } },
            React.createElement('div', null,
              React.createElement('b', { style: { fontSize: 16 } }, "🗺️ Carte des clients"),
              React.createElement('span', { style: { fontSize: 12, color: "#888", marginLeft: 10 } }, mapGeoStatus)
            ),
            React.createElement('button', { onClick: () => setShowClientMap(false), style: { border: "none", background: "#F0F0F5", width: 34, height: 34, borderRadius: "50%", fontSize: 16, cursor: "pointer", color: "#555" } }, "✕")
          ),
          React.createElement('div', { id: "clientMap", style: { flex: 1, width: "100%" } })
        )
      ),
      showClientForm && React.createElement('div', { onClick: (e) => { if (e.target === e.currentTarget) setShowClientForm(false); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "12px" : "40px 20px", zIndex: 80, overflowY: "auto" } },
        React.createElement('div', { onClick: (e) => e.stopPropagation(), style: { background: "white", borderRadius: 12, border: `1px solid ${G}35`, padding: isMobile ? 18 : 24, width: 640, maxWidth: "100%", boxShadow: "0 12px 44px rgba(0,0,0,.3)", marginBottom: 30 } },
        React.createElement('div', { style: { fontWeight: 500, fontSize: 15, color: "#1a1a3e", marginBottom: 12 } }, editingClientId ? "Modifier le client" : "Nouveau client"),
        editingClientId && React.createElement('div', { style: { background: "#F6F6FA", border: "1px solid #E8E8F0", borderRadius: 9, padding: "12px 14px", marginBottom: 16 } },
          React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 } }, "Informations du client"),
          (() => {
            const h = hotels.find(x => x.id === editingClientId) || {};
            const ligne = (label, val) => React.createElement('div', { style: { display: "flex", gap: 8, fontSize: 12, marginBottom: 4 } },
              React.createElement('span', { style: { color: "#888", minWidth: 130, flexShrink: 0 } }, label),
              React.createElement('span', { style: { color: "#333", fontWeight: 500, wordBreak: "break-all" } }, val || "—")
            );
            const dateCreation = h.created_at ? new Date(h.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
            return React.createElement(React.Fragment, null,
              ligne("Compte administrateur", h.account_email),
              ligne("Compte standard", h.standard_email),
              ligne("Client depuis", dateCreation),
              React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid #E8E8F0" } },
                [
                  { l: "Tickets", v: clientStats && clientStats !== "loading" ? clientStats.tickets : null, icon: "🎫", act: () => { setShowClientForm(false); setEditCid(h.id); setTicketSearch(h.name || ""); go("tickets-admin"); } },
                  { l: "Procédures", v: clientStats && clientStats !== "loading" ? clientStats.procedures : null, icon: "📚", act: () => { setShowClientForm(false); setEditCid(h.id); go("proc-admin"); } },
                  { l: "Fiches infra.", v: clientStats && clientStats !== "loading" ? clientStats.docs : null, icon: "🗂️", act: () => { setShowClientForm(false); setEditCid(h.id); go("docs-techniques"); } },
                ].map((s, i) => React.createElement('div', { key: i, onClick: s.act, title: "Ouvrir « " + s.l + " » de " + (h.name || "ce client"), style: { flex: "1 1 120px", background: "white", border: "1px solid #E8E8F0", borderRadius: 8, padding: "9px 12px", cursor: "pointer", transition: "border-color .12s, box-shadow .12s" }, onMouseEnter: e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.boxShadow = "0 2px 10px rgba(201,168,76,.18)"; }, onMouseLeave: e => { e.currentTarget.style.borderColor = "#E8E8F0"; e.currentTarget.style.boxShadow = "none"; } },
                  React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "space-between" } },
                    React.createElement('span', null, s.icon + " " + s.l),
                    React.createElement('span', { style: { color: G2, fontSize: 12, fontWeight: 700 } }, "→")
                  ),
                  React.createElement('div', { style: { fontSize: 19, fontWeight: 700, color: "#1a1a3e" } }, clientStats === "loading" ? "…" : String(s.v))
                ))
              )
            );
          })()
        ),
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 } },
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Nom de l'hôtel *"),
            React.createElement('input', { value: clientForm.name, onChange: e => setClientForm({ ...clientForm, name: e.target.value }), placeholder: "ex: Hôtel Le Grand Paris", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Ville"),
            React.createElement('input', { value: clientForm.city, onChange: e => setClientForm({ ...clientForm, city: e.target.value }), placeholder: "ex: Paris 8ème", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } })
          )
        ),
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 } },
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Étoiles"),
            React.createElement('select', { value: clientForm.stars, onChange: e => setClientForm({ ...clientForm, stars: parseInt(e.target.value, 10) }), style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } },
              [1, 2, 3, 4, 5].map(n => React.createElement('option', { key: n, value: n }, n + " ★"))
            )
          ),
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Téléphone"),
            React.createElement('input', { value: clientForm.phone, onChange: e => setClientForm({ ...clientForm, phone: e.target.value }), placeholder: "+33 1 XX XX XX XX", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } })
          )
        ),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Nom NinjaOne (pour rattachement automatique des rapports)"),
          React.createElement('input', { value: clientForm.ninjaoneNom, onChange: e => setClientForm({ ...clientForm, ninjaoneNom: e.target.value }), placeholder: "Nom exact de l\u0027organisation dans NinjaOne", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } }),
          React.createElement('div', { style: { fontSize: 10.5, color: "#999", marginTop: 3 } }, "Laissez vide pour utiliser le rapprochement automatique par nom d\u0027hôtel.")
        ),
        // ---- Reconnaissance des mails entrants (domaines + mots-clés) ----
        editingClientId && (() => {
          const regles = recoMail.filter(r => r.hotel_id === editingClientId);
          const puce = (r) => React.createElement('span', { key: r.id, style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 6px 3px 10px", background: r.type === "domaine" ? "#EBF4FF" : "#F7F1DE", border: "1px solid " + (r.type === "domaine" ? "#BEE3F8" : "#E8D89A"), borderRadius: 14, fontSize: 11.5, color: "#333" } },
            (r.type === "domaine" ? "@" : "« ") + r.valeur + (r.type === "domaine" ? "" : " »"),
            React.createElement('button', { type: "button", onClick: () => supprimerRecoMail(r), title: "Retirer", style: { border: "none", background: "none", color: "#999", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 2px" } }, "✕"));
          const ajouter = async () => { if (await ajouterRecoMail(editingClientId, recoNew.type, recoNew.valeur)) setRecoNew({ ...recoNew, valeur: "" }); };
          return React.createElement('div', { style: { marginBottom: 10, padding: "10px 12px", background: "#FAFBFD", border: "1px solid #E8E8F0", borderRadius: 8 } },
            React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Reconnaissance des mails entrants"),
            React.createElement('div', { style: { fontSize: 10.5, color: "#888", marginBottom: 8, lineHeight: 1.5 } }, "Les nouveaux tickets reçus par mail sont rattachés à cet établissement si l\u0027expéditeur écrit depuis un de ces domaines, ou si sa signature contient le téléphone, l\u0027adresse ou un mot-clé ci-dessous. N\u0027ajoutez pas un domaine partagé par plusieurs hôtels (hilton.com, gmail.com…) : utilisez plutôt un mot-clé."),
            React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 } },
              regles.length ? regles.map(puce) : React.createElement('span', { style: { fontSize: 11.5, color: "#AAA" } }, "Aucun domaine ni mot-clé (seuls le téléphone et l\u0027adresse de la fiche sont utilisés).")),
            React.createElement('div', { style: { display: "flex", gap: 6 } },
              React.createElement('select', { value: recoNew.type, onChange: e => setRecoNew({ ...recoNew, type: e.target.value }), style: { padding: "6px 8px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } },
                React.createElement('option', { value: "domaine" }, "Domaine"),
                React.createElement('option', { value: "mot_cle" }, "Mot-clé")),
              React.createElement('input', { value: recoNew.valeur, onChange: e => setRecoNew({ ...recoNew, valeur: e.target.value }), onKeyDown: e => { if (e.key === "Enter") { e.preventDefault(); ajouter(); } },
                placeholder: recoNew.type === "domaine" ? "ex : cp-paris.com" : "ex : Canopy Trocadéro", style: { flex: 1, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } }),
              React.createElement('button', { type: "button", onClick: ajouter, style: { padding: "6px 12px", background: SB, color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Ajouter"))
          );
        })(),
        // ---- Groupe hôtelier ----
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Groupe hôtelier"),
          React.createElement('input', { value: clientForm.groupe, onChange: e => setClientForm({ ...clientForm, groupe: e.target.value }), placeholder: "ex : Marriott, Accor, IHG…", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
        ),
        // ---- Contacts clés (GM / RH / Technique) ----
        React.createElement('div', { style: { marginBottom: 10, background: "#F8F8FC", border: "1px solid #E8E8F0", borderRadius: 8, padding: 12 } },
          React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 8 } }, "👤 Contacts clés"),
          [
            { role: "GM (Directeur général)", nom: "gmNom", prenom: "gmPrenom", email: "gmEmail" },
            { role: "RH", nom: "rhNom", prenom: "rhPrenom", email: "rhEmail" },
            { role: "Technique", nom: "techNom", prenom: "techPrenom", email: "techEmail" },
          ].map((c, i) => React.createElement('div', { key: i, style: { marginBottom: i < 2 ? 10 : 0 } },
            React.createElement('div', { style: { fontSize: 10.5, fontWeight: 600, color: "#888", marginBottom: 4 } }, c.role),
            React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1.4fr", gap: 8 } },
              React.createElement('input', { value: clientForm[c.prenom], onChange: e => setClientForm({ ...clientForm, [c.prenom]: e.target.value }), placeholder: "Prénom", style: { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } }),
              React.createElement('input', { value: clientForm[c.nom], onChange: e => setClientForm({ ...clientForm, [c.nom]: e.target.value }), placeholder: "Nom", style: { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } }),
              React.createElement('input', { value: clientForm[c.email], onChange: e => setClientForm({ ...clientForm, [c.email]: e.target.value }), placeholder: "Email", type: "email", style: { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
            )
          ))
        ),
        // ---- Adresse détaillée ----
        React.createElement('div', { style: { marginBottom: 10, background: "#F8F8FC", border: "1px solid #E8E8F0", borderRadius: 8, padding: 12 } },
          React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 8 } }, "📍 Adresse"),
          React.createElement('input', { value: clientForm.adrRue, onChange: e => setClientForm({ ...clientForm, adrRue: e.target.value }), placeholder: "Rue et numéro", style: { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box", marginBottom: 8 } }),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.8fr 1.4fr 1fr", gap: 8 } },
            React.createElement('input', { value: clientForm.adrCp, onChange: e => setClientForm({ ...clientForm, adrCp: e.target.value }), placeholder: "Code postal", style: { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } }),
            React.createElement('input', { value: clientForm.adrVille, onChange: e => setClientForm({ ...clientForm, adrVille: e.target.value }), placeholder: "Ville", style: { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } }),
            React.createElement('input', { value: clientForm.adrPays, onChange: e => setClientForm({ ...clientForm, adrPays: e.target.value }), placeholder: "Pays", style: { width: "100%", padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
          )
        ),
        // ---- Pièces jointes ----
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "📎 Pièces jointes (PDF, Word, Excel, images)"),
          clientExistingFiles.length > 0 && React.createElement('div', { style: { marginBottom: 6, display: "flex", flexDirection: "column", gap: 5 } },
            clientExistingFiles.map(f => React.createElement('div', { key: f.id, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
              isImageFile(f.file_name) ? React.createElement('img', { src: f.file_url, style: { width: 24, height: 24, objectFit: "cover", borderRadius: 4 } }) : React.createElement('span', null, FILE_ICONS[fileExt(f.file_name)] || "📄"),
              React.createElement('a', { href: f.file_url, target: "_blank", rel: "noreferrer", style: { flex: 1, color: "#333", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.file_name),
              React.createElement('button', { onClick: () => removeExistingClientFile(f.id), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
            ))
          ),
          React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => setClientNewFiles(prev => [...prev, ...Array.from(e.target.files)]), style: { fontSize: 12 } }),
          clientNewFiles.length > 0 && React.createElement('div', { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 5 } },
            clientNewFiles.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
              React.createElement('span', null, "🆕"),
              React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
              React.createElement('button', { onClick: () => setClientNewFiles(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
            ))
          )
        ),
        !editingClientId && React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 } },
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Email compte administrateur *"),
            React.createElement('input', { value: clientForm.email, onChange: e => setClientForm({ ...clientForm, email: e.target.value }), placeholder: "admin@hotel.com", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Mot de passe *"),
            React.createElement('input', { value: clientForm.pw, onChange: e => setClientForm({ ...clientForm, pw: e.target.value }), placeholder: "Mot de passe de connexion", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } })
          )
        ),
        !editingClientId && React.createElement('div', { style: { background: "#F8F8FC", border: "1px solid #E8E8F0", borderRadius: 8, padding: 12, marginBottom: 10 } },
          React.createElement('div', { style: { fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 8 } }, "👤 Compte standard (optionnel) — procédures, tickets et doc. technique, sans le suivi des dossiers"),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 } },
            React.createElement('div', null,
              React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Email compte standard"),
              React.createElement('input', { value: clientForm.stdEmail, onChange: e => setClientForm({ ...clientForm, stdEmail: e.target.value }), placeholder: "standard@hotel.com", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Mot de passe"),
              React.createElement('input', { value: clientForm.stdPw, onChange: e => setClientForm({ ...clientForm, stdPw: e.target.value }), placeholder: "Mot de passe standard", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
            )
          )
        ),
        editingClientId && React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 7, padding: "8px 12px", fontSize: 11, color: "#2B6CB0", marginBottom: 10 } }, "ℹ️ Pour changer l'email/mot de passe de connexion d'un client existant, utilisez Supabase → Authentication → Users."),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "🖼️ Logo de l'hôtel"),
          React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 12 } },
            clientLogoFile
              ? React.createElement('img', { src: URL.createObjectURL(clientLogoFile), alt: "Logo", style: { width: 48, height: 48, objectFit: "contain", borderRadius: 8, border: "1px solid #E8E8F0", background: "#FAFAFA" } })
              : (editingClientId && hotels.find(h => h.id === editingClientId)?.logo_url
                  ? React.createElement('img', { src: hotels.find(h => h.id === editingClientId).logo_url, alt: "Logo", style: { width: 48, height: 48, objectFit: "contain", borderRadius: 8, border: "1px solid #E8E8F0", background: "#FAFAFA" } })
                  : React.createElement('div', { style: { width: 48, height: 48, borderRadius: 8, background: "#F0F0F8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 } }, "🏨")),
            React.createElement('input', { type: "file", accept: ".png,.jpg,.jpeg,.svg,.webp", onChange: e => setClientLogoFile(e.target.files[0] || null), style: { fontSize: 12 } })
          )
        ),
        clientErr && React.createElement('div', { style: { color: "#E53E3E", fontSize: 12, marginBottom: 10 } }, clientErr),
        React.createElement('div', { style: { display: "flex", gap: 7, justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => setShowClientForm(false), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "6px 12px" } }, "Annuler"),
          React.createElement('button', { onClick: submitClientForm, disabled: savingClient, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "6px 12px", opacity: savingClient ? 0.6 : 1 } }, savingClient ? "Enregistrement..." : (editingClientId ? "Enregistrer" : "Créer le client"))
        )
        )
      ),
            addAccountHotel && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: "90%", maxWidth: 420 } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 4 } }, addAccountForm.mode === "edit" ? "Modifier le compte" : "Ajouter un compte"),
          React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 14 } }, addAccountHotel.name),
          React.createElement('div', { style: { marginBottom: 10 } },
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 6 } }, "Niveau du compte"),
            React.createElement('div', { style: { display: "flex", gap: 8 } },
              [{ v: "supervisor", l: "Administrateur", d: "Suivi + tickets + doc" }, { v: "client", l: "Standard", d: "Procédures + tickets + doc" }].map(opt => {
                const emailNiveau = opt.v === "supervisor" ? addAccountHotel.account_email : addAccountHotel.standard_email;
                const existe = !!emailNiveau;
                const active = addAccountForm.level === opt.v;
                // Clic : si le compte existe -> mode édition (pré-remplit l'email actuel) ; sinon -> mode ajout.
                const onPick = () => existe
                  ? setAddAccountForm({ email: emailNiveau, pw: "", level: opt.v, mode: "edit", oldEmail: emailNiveau })
                  : setAddAccountForm({ email: "", pw: "", level: opt.v, mode: "add", oldEmail: "" });
                return React.createElement('button', { key: opt.v, onClick: onPick, style: { flex: 1, padding: "8px 10px", background: active ? G + "18" : "#F8F8FC", border: "1px solid " + (active ? G + "66" : "#E8E8F0"), borderRadius: 8, cursor: "pointer", textAlign: "left" } },
                  React.createElement('div', { style: { fontSize: 12, fontWeight: 500, color: "#1a1a3e" } }, opt.l),
                  React.createElement('div', { style: { fontSize: 10, color: existe ? G2 : "#888", marginTop: 2 } }, existe ? "Existant — cliquer pour modifier" : opt.d)
                );
              })
            )
          ),
          React.createElement('div', { style: { marginBottom: 10 } },
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Email de connexion"),
            React.createElement('input', { value: addAccountForm.email, onChange: e => setAddAccountForm({ ...addAccountForm, email: e.target.value }), placeholder: "email@hotel.com", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
          ),
          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Mot de passe"),
            React.createElement('input', { type: "text", value: addAccountForm.pw, onChange: e => setAddAccountForm({ ...addAccountForm, pw: e.target.value }), placeholder: addAccountForm.mode === "edit" ? "Laisser vide pour ne pas changer" : "Mot de passe initial", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
          ),
          addAccountErr && React.createElement('div', { style: { color: "#E53E3E", fontSize: 12, marginBottom: 10 } }, addAccountErr),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            React.createElement('button', { onClick: () => setAddAccountHotel(null), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "7px 14px" } }, "Annuler"),
            React.createElement('button', { onClick: submitAddAccount, disabled: savingAccount, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "7px 14px", opacity: savingAccount ? 0.6 : 1 } }, savingAccount ? "..." : (addAccountForm.mode === "edit" ? "Enregistrer" : "Créer le compte"))
          )
        )
      ),
      resetPwTarget && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 360, maxWidth: "90%" } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 14, color: "#1a1a3e", marginBottom: 4 } }, "Réinitialiser le mot de passe"),
          React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 14 } }, resetPwTarget.name + " (" + resetPwTarget.account_email + ")"),
          React.createElement('input', { value: resetPwValue, onChange: e => setResetPwValue(e.target.value), placeholder: "Nouveau mot de passe", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 14 } }),
          React.createElement('div', { style: { display: "flex", gap: 7, justifyContent: "flex-end" } },
            React.createElement('button', { onClick: () => setResetPwTarget(null), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "7px 14px" } }, "Annuler"),
            React.createElement('button', { onClick: submitResetPassword, disabled: resetPwBusy, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "7px 14px", opacity: resetPwBusy ? 0.6 : 1 } }, resetPwBusy ? "..." : "Valider")
          )
        )
      ),
      hotelsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement des clients..."),
      React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: 14 } },
        hotels.filter(h => {
          const q = clientSearch.trim().toLowerCase();
          if (!q) return true;
          const champs = [h.name, h.city, h.account_email, h.standard_email, h.phone, h.ninjaone_nom].filter(Boolean).join(" ").toLowerCase();
          return q.split(/\s+/).every(mot => champs.includes(mot));
        }).map(h => React.createElement('div', { key: h.id, style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 16 } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 11, marginBottom: 12 } },
            h.logo_url
              ? React.createElement('img', { src: h.logo_url, alt: h.name, style: { width: 38, height: 38, objectFit: "contain", borderRadius: 9, border: "1px solid #E8E8F0", background: "#FAFAFA" } })
              : React.createElement('div', { style: { width: 38, height: 38, background: G + "20", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 } }, "🏨"),
            React.createElement('div', null,
              React.createElement('div', { style: { fontWeight: 500, fontSize: 13, color: "#1a1a3e" } }, h.name),
              React.createElement('div', { style: { fontSize: 11, color: "#888" } }, (h.city || "") + " · " + "★".repeat(h.stars || 0))
            )
          ),
          React.createElement('div', { style: { fontSize: 11, color: "#777", marginBottom: 11 } },
            React.createElement('div', { style: { marginBottom: 3, display: "flex", alignItems: "center", gap: 5 } },
              React.createElement('span', { style: { fontSize: 9, background: G + "22", color: G2, padding: "1px 6px", borderRadius: 10, fontWeight: 600 } }, "ADMIN"),
              React.createElement('span', null, h.account_email || "aucun")
            ),
            React.createElement('div', { style: { marginBottom: 3, display: "flex", alignItems: "center", gap: 5 } },
              React.createElement('span', { style: { fontSize: 9, background: "#EDEDF5", color: "#666", padding: "1px 6px", borderRadius: 10, fontWeight: 600 } }, "STD"),
              React.createElement('span', null, h.standard_email || "aucun")
            ),
            React.createElement('div', null, "📞 " + (h.phone || "-"))
          ),
          React.createElement('div', { style: { display: "flex", gap: 7, marginBottom: 7 } },
            React.createElement('button', { onClick: () => openEditClientForm(h), style: { flex: 1, padding: 7, background: "none", border: `1px solid ${G}55`, color: G2, borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 500 } }, "Modifier"),
            React.createElement('button', { onClick: () => { setEditCid(h.id); go("proc-admin"); }, style: { flex: 1, padding: 7, background: SB, border: "none", color: G, borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 500 } }, "Procédures →"),
            React.createElement('button', { onClick: () => deleteClient(h), style: { padding: "7px 10px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "✕")
          ),
          h.account_email && React.createElement('button', { onClick: () => { setResetPwTarget(h); setResetPwValue(""); }, style: { width: "100%", padding: 6, background: "none", border: "1px solid #E8E8F0", color: "#888", borderRadius: 7, fontSize: 11, cursor: "pointer" } }, "🔑 Réinitialiser le mot de passe"),
          React.createElement('button', { onClick: () => { setAddAccountHotel(h); const niveauInit = !h.account_email ? "supervisor" : (!h.standard_email ? "client" : "supervisor"); const existeInit = niveauInit === "supervisor" ? h.account_email : h.standard_email; setAddAccountForm(existeInit ? { email: existeInit, pw: "", level: niveauInit, mode: "edit", oldEmail: existeInit } : { email: "", pw: "", level: niveauInit, mode: "add", oldEmail: "" }); setAddAccountErr(""); }, style: { width: "100%", padding: 6, marginTop: 6, background: SB, border: "none", color: G, borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 500 } }, (h.account_email && h.standard_email) ? "Gérer les comptes" : "+ Ajouter / gérer un compte")
        )),
        hotels.length === 0 && !hotelsLoading && React.createElement('div', { style: { gridColumn: "1/-1", padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun client. Créez-en un !"),
        hotels.length > 0 && clientSearch.trim() && hotels.filter(h => { const q = clientSearch.trim().toLowerCase(); const champs = [h.name, h.city, h.account_email, h.standard_email, h.phone, h.ninjaone_nom].filter(Boolean).join(" ").toLowerCase(); return q.split(/\s+/).every(mot => champs.includes(mot)); }).length === 0 && React.createElement('div', { style: { gridColumn: "1/-1", padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun client ne correspond à « " + clientSearch.trim() + " ».")
      )
    );
  return content;
}
