// ===== Page « contact » — condition dans App : page === "contact" && !isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_contact({...}) de app.js.
function Page_contact(ctx) {
  let content = ctx.content;
  const {
    client, go, handleSupportFilesAdd, isMobile, loadFilesFor, procSearch, removeSupportFile, setProcSearch,
    setSupportForm, setSupportSent, submitSupportForm, suggestedProcs, supportError, supportForm,
    supportSending, supportSent
  } = ctx;
    const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit" };
    const labelStyle = { display: "block", fontSize: 12, fontWeight: 500, color: "#444", marginBottom: 5 };

    content = React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: 20, alignItems: "start" } },
      React.createElement('div', { style: { background: "white", borderRadius: 12, border: "1px solid #E8E8F0", padding: 26 } },
        React.createElement('div', { style: { fontSize: 11, color: G2, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 6 } }, "PARLONS DE VOTRE PROBLÈME"),
        React.createElement('h3', { style: { margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#1a1a3e" } }, "Contactez notre support technique"),
        React.createElement('div', { style: { fontSize: 13, color: "#777", marginBottom: 20, lineHeight: 1.6 } }, "Décrivez votre problème ci-dessous, un technicien DSI Hotel vous répond rapidement. Tous les champs marqués d'un * sont obligatoires."),

        React.createElement('div', { style: { marginBottom: 20, background: "#FBFAF5", border: "1px solid #EDE6CF", borderRadius: 10, padding: 14 } },
          React.createElement('label', { style: { display: "block", fontSize: 12.5, fontWeight: 600, color: "#8A6D1F", marginBottom: 6 } }, "🔎 Décrivez votre problème en quelques mots"),
          React.createElement('input', { value: procSearch, onChange: e => setProcSearch(e.target.value), placeholder: "Ex. : imprimante, mot de passe, wifi, écran noir…", style: { ...inputStyle, marginBottom: 0 } }),
          suggestedProcs.length > 0 && React.createElement('div', { style: { marginTop: 10 } },
            React.createElement('div', { style: { fontSize: 11, color: "#999", marginBottom: 6 } }, "Ces procédures peuvent peut-être vous aider tout de suite :"),
            React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 6 } },
              // Clic : ouvre la procédure complète (texte, images, pièces jointes) dans l'onglet Procédures
              suggestedProcs.map(p => React.createElement('div', {
                key: p.id, role: "button", tabIndex: 0,
                onClick: () => { loadFilesFor(p.id); go("knowledge", p.id); },
                onKeyDown: e => { if (e.key === "Enter") { loadFilesFor(p.id); go("knowledge", p.id); } },
                onMouseEnter: e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.background = "#FFFDF5"; },
                onMouseLeave: e => { e.currentTarget.style.borderColor = "#E8E8F0"; e.currentTarget.style.background = "#FFF"; },
                style: { display: "flex", alignItems: "center", gap: 8, background: "#FFF", border: "1px solid #E8E8F0", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }
              },
                React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: "#1a1a3e", flex: 1 } }, "📄 " + p.title),
                React.createElement('span', { style: { fontSize: 11.5, color: G2, fontWeight: 600, whiteSpace: "nowrap" } }, "Voir la procédure →")
              ))
            )
          ),
          procSearch.trim().length >= 2 && suggestedProcs.length === 0 && React.createElement('div', { style: { fontSize: 12, color: "#999", marginTop: 8 } }, "Aucune procédure trouvée — décrivez votre problème ci-dessous, on s'en occupe.")
        ),

        supportSent
          ? React.createElement('div', { style: { background: "#F0FFF4", border: "1px solid #C6F6D5", borderRadius: 10, padding: "20px", textAlign: "center" } },
              React.createElement('div', { style: { fontSize: 28, marginBottom: 8 } }, "✅"),
              React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: "#276749", marginBottom: 4 } }, "Votre demande a été envoyée"),
              React.createElement('div', { style: { fontSize: 12, color: "#2F855A" } }, "Notre équipe vous répond rapidement."),
              React.createElement('button', { onClick: () => setSupportSent(false), style: { marginTop: 14, background: "none", border: `1px solid ${G}`, color: G2, borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "7px 14px" } }, "← Envoyer une autre demande")
            )
          : React.createElement('div', null,
              React.createElement('div', { style: { marginBottom: 14 } },
                React.createElement('label', { style: labelStyle }, "Votre nom *"),
                React.createElement('input', { value: supportForm.name, onChange: e => setSupportForm({ ...supportForm, name: e.target.value }), placeholder: "Prénom et nom", style: inputStyle })
              ),
              React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 } },
                React.createElement('div', null,
                  React.createElement('label', { style: labelStyle }, "Services"),
                  React.createElement('select', { value: supportForm.role, onChange: e => setSupportForm({ ...supportForm, role: e.target.value }), style: inputStyle },
                    ["Front Office", "Réservation", "Room Service", "Économat", "Directeur Général", "Directeur des opérations", "Finance", "Technique", "Sales", "Revenue", "HK", "Autre"].map(r => React.createElement('option', { key: r, value: r }, r))
                  )
                ),
                React.createElement('div', null,
                  React.createElement('label', { style: labelStyle }, "Téléphone"),
                  React.createElement('input', { value: supportForm.phone, onChange: e => setSupportForm({ ...supportForm, phone: e.target.value }), placeholder: "+33 ...", style: inputStyle })
                )
              ),
              React.createElement('div', { style: { marginBottom: 14 } },
                React.createElement('label', { style: labelStyle }, "Email professionnel *"),
                React.createElement('input', { value: supportForm.contactEmail, onChange: e => setSupportForm({ ...supportForm, contactEmail: e.target.value }), placeholder: "vous@hotel.com", style: inputStyle })
              ),
              React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 } },
                React.createElement('div', null,
                  React.createElement('label', { style: labelStyle }, "Catégorie du problème *"),
                  React.createElement('select', { value: supportForm.cat, onChange: e => setSupportForm({ ...supportForm, cat: e.target.value }), style: inputStyle },
                    CATS.map(c => React.createElement('option', { key: c, value: c }, c))
                  )
                ),
                React.createElement('div', null,
                  React.createElement('label', { style: labelStyle }, "Urgence"),
                  React.createElement('select', { value: supportForm.prio, onChange: e => setSupportForm({ ...supportForm, prio: e.target.value }), style: inputStyle },
                    ["Urgent", "Haute", "Moyenne", "Basse"].map(p => React.createElement('option', { key: p, value: p }, p))
                  )
                )
              ),
              React.createElement('div', { style: { marginBottom: 20 } },
                React.createElement('label', { style: labelStyle }, "Message *"),
                React.createElement(RichEditor, {
                  value: supportForm.messageHtml,
                  onChange: (html) => setSupportForm(prev => ({ ...prev, messageHtml: html, message: htmlVersTexteSimple(html) })),
                  onUploadImage: async (file) => await uploadToStorage(file, "tickets"),
                  placeholder: "Décrivez le problème : quand, sur quel poste, message d'erreur éventuel... Vous pouvez coller une capture d'écran (Ctrl+V)."
                })
              ),
              React.createElement('div', { style: { marginBottom: 20 } },
                React.createElement('label', { style: labelStyle }, "📎 Pièces jointes (PDF, Word, Excel, images)"),
                React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => handleSupportFilesAdd(e.target.files), style: { fontSize: 12 } }),
                supportForm.files.length > 0 && React.createElement('div', { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 5 } },
                  supportForm.files.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
                    React.createElement('span', null, "📄"),
                    React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
                    React.createElement('span', { style: { color: "#AAA" } }, f.size ? Math.round(f.size / 1024) + " Ko" : ""),
                    React.createElement('button', { onClick: () => removeSupportFile(i), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
                  ))
                )
              ),
              supportError && React.createElement('div', { style: { background: "#FFF5F5", border: "1px solid #FEB2B2", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#C53030", marginBottom: 12 } }, supportError),
              React.createElement('button', { onClick: submitSupportForm, disabled: supportSending, style: { width: "100%", background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: supportSending ? "default" : "pointer", padding: "13px", opacity: supportSending ? 0.6 : 1 } }, supportSending ? "Envoi en cours..." : "Envoyer ma demande →")
            )
      ),
      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement('div', { style: { background: SB, borderRadius: 12, padding: 20 } },
          React.createElement('div', { style: { color: "rgba(255,255,255,.4)", fontSize: 10, letterSpacing: "0.5px", marginBottom: 12 } }, "NOS COORDONNÉES"),
          React.createElement('div', { style: { color: "white", fontSize: 13, marginBottom: 10, lineHeight: 1.6 } }, "60 Rue François 1er", React.createElement('br'), "75008 Paris"),
          React.createElement('div', { style: { color: G, fontSize: 13, marginBottom: 8, fontWeight: 500 } }, "📞 +33 1 84 18 02 23"),
          React.createElement('div', { style: { color: G, fontSize: 13, marginBottom: 10, fontWeight: 500 } }, "📧 " + SUPPORT_EMAIL),
          React.createElement('div', { style: { color: "rgba(255,255,255,.5)", fontSize: 11, lineHeight: 1.6 } }, "Lun–Ven 8h–19h", React.createElement('br'), "Support 24h/24 · 7j/7")
        ),
        React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, padding: 18 } },
          React.createElement('div', { style: { fontSize: 11, color: "#999", letterSpacing: "0.5px", marginBottom: 12, fontWeight: 600 } }, "CE QUI SE PASSE ENSUITE"),
          [["1", "Réponse rapide", "Un technicien qualifie votre demande"], ["2", "Diagnostic", "Analyse à distance ou intervention sur site"], ["3", "Résolution", "Suivi jusqu'à la résolution complète"]].map(([n, t, d]) => React.createElement('div', { key: n, style: { display: "flex", gap: 10, marginBottom: 12 } },
            React.createElement('div', { style: { width: 22, height: 22, borderRadius: "50%", background: G + "20", color: G2, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, n),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 12, fontWeight: 600, color: "#1a1a3e" } }, t),
              React.createElement('div', { style: { fontSize: 11, color: "#888", marginTop: 1 } }, d)
            )
          ))
        ),
        React.createElement('div', { style: { background: "#FFF8E8", border: `1px solid ${G}55`, borderRadius: 12, padding: 18 } },
          React.createElement('div', { style: { fontSize: 12, fontWeight: 600, color: G2, marginBottom: 6 } }, "⚡ Une urgence IT ?"),
          React.createElement('div', { style: { fontSize: 11, color: "#7A5C1E", marginBottom: 10, lineHeight: 1.6 } }, "Astreinte technique 24h/24 · 7j/7"),
          React.createElement('a', { href: client?.phone ? `tel:${client.phone.replace(/\s/g, "")}` : "tel:+33184180223", style: { display: "block", textAlign: "center", background: G2, color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, padding: "9px", textDecoration: "none" } }, "📞 Appeler maintenant")
        ),
        React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 10, padding: "12px 16px", fontSize: 11, color: "#2B6CB0", lineHeight: 1.6 } },
          React.createElement('strong', null, "Avant d'écrire, "), "consultez nos ", React.createElement('a', { onClick: () => go("knowledge"), style: { color: "#2B6CB0", textDecoration: "underline", cursor: "pointer" } }, "procédures"), " : la réponse y est peut-être déjà !"
        )
      )
    );
  return content;
}
