// ===== Page « templates » — condition dans App : page === "templates" && (isSupervisor || isAdmin || !!myHotelId) =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_templates({...}) de app.js.
function Page_templates(ctx) {
  let content = ctx.content;
  const {
    TEMPLATES, champVisible, creneauxPris, isMobile, ouvrirTemplate, setTplActif, setTplDemandeur,
    setTplValues, soumettreTemplate, tplActif, tplDemandeur, tplError, tplOk, tplSending, tplValues
  } = ctx;
    const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
    const labelStyle = { display: "block", fontSize: 12, fontWeight: 500, color: "#444", marginBottom: 5 };

    if (!tplActif) {
      content = React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 13, color: "#777", marginBottom: 18, lineHeight: 1.6 } },
          "Choisissez un modèle de demande. Une fois rempli, il est envoyé au support DSI Hotel (vous en gardez une trace dans vos demandes) et un PDF récapitulatif est téléchargé."),
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 } },
          TEMPLATES.map(tpl => React.createElement('button', {
            key: tpl.key, onClick: () => ouvrirTemplate(tpl),
            style: { textAlign: "left", background: "white", border: "1px solid #E8E8F0", borderRadius: 12, padding: 18, cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }
          },
            React.createElement('div', { style: { fontSize: 26 } }, tpl.icon),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 15, fontWeight: 600, color: "#1a1a3e", marginBottom: 4 } }, tpl.titre),
              React.createElement('div', { style: { fontSize: 12.5, color: "#888", lineHeight: 1.5 } }, tpl.desc)
            )
          ))
        )
      );
    } else {
      content = React.createElement('div', { style: { maxWidth: 720 } },
        React.createElement('button', { onClick: () => setTplActif(null), style: { background: "none", border: "none", color: G2, fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 } }, "\u2190 Retour aux modèles"),
        React.createElement('div', { style: { background: "white", borderRadius: 12, border: "1px solid #E8E8F0", padding: 26 } },
          React.createElement('div', { style: { display: "flex", gap: 12, alignItems: "center", marginBottom: 6 } },
            React.createElement('div', { style: { fontSize: 24 } }, tplActif.icon),
            React.createElement('h3', { style: { margin: 0, fontSize: 19, fontWeight: 600, color: "#1a1a3e" } }, tplActif.titre)
          ),
          React.createElement('div', { style: { fontSize: 13, color: "#777", marginBottom: 20, lineHeight: 1.6 } }, tplActif.desc),

          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 } },
            React.createElement('div', null,
              React.createElement('label', { style: labelStyle }, "Votre nom *"),
              React.createElement('input', { value: tplDemandeur.name, onChange: e => setTplDemandeur({ ...tplDemandeur, name: e.target.value }), placeholder: "Prénom NOM", style: inputStyle })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: labelStyle }, "Votre email *"),
              React.createElement('input', { value: tplDemandeur.email, onChange: e => setTplDemandeur({ ...tplDemandeur, email: e.target.value }), placeholder: "vous@hotel.com", style: inputStyle })
            )
          ),

          tplActif.champs.filter(ch => champVisible(ch, tplValues)).map(ch =>
            ch.type === "creneau"
            ? React.createElement('div', { key: ch.k, style: { marginBottom: 14, marginTop: 6, background: "#FBF7EA", border: "1px solid " + G, borderRadius: 10, padding: "14px 16px" } },
                React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
                  React.createElement('span', { style: { fontSize: 18 } }, "📅"),
                  React.createElement('span', { style: { fontSize: 14, fontWeight: 700, color: "#8A6D1F" } }, ch.label)
                ),
                !tplValues.dateArrivee
                ? React.createElement('div', { style: { fontSize: 12.5, color: "#9A7B2F" } }, "Renseignez d'abord la « Date d'arrivée » ci-dessus pour voir les créneaux disponibles.")
                : (() => {
                    const jours = semaineOuvree(tplValues.dateArrivee);
                    const jourOk = jours.some(j => j.iso === tplValues.rdvJour);
                    return React.createElement('div', null,
                      React.createElement('div', { style: { fontSize: 11.5, color: "#8A6D1F", marginBottom: 6 } }, "Jour (semaine de l'arrivée) :"),
                      React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 } },
                        jours.map(j =>
                          React.createElement('button', { key: j.iso, type: "button", onClick: () => setTplValues({ ...tplValues, rdvJour: j.iso, [ch.k]: "" }), style: { padding: "7px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: tplValues.rdvJour === j.iso ? "2px solid " + G2 : "1px solid #E0D6B0", background: tplValues.rdvJour === j.iso ? G : "white", color: tplValues.rdvJour === j.iso ? "#111" : "#6B5A1F" } }, j.label)
                        )
                      ),
                      !jourOk
                      ? React.createElement('div', { style: { fontSize: 12.5, color: "#9A7B2F" } }, "Choisissez un jour ci-dessus pour voir les créneaux.")
                      : React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
                          RDV_CRENEAUX.map(cr => {
                            const pris = creneauxPris.includes(cr);
                            const sel = tplValues[ch.k] === cr;
                            return React.createElement('button', { key: cr, type: "button", disabled: pris, onClick: () => setTplValues({ ...tplValues, [ch.k]: sel ? "" : cr }), style: { padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: pris ? "not-allowed" : "pointer", border: sel ? "2px solid " + G2 : "1px solid #E0D6B0", background: pris ? "#EEE" : (sel ? G : "white"), color: pris ? "#AAA" : (sel ? "#111" : "#6B5A1F"), textDecoration: pris ? "line-through" : "none" } }, pris ? (cr + " · complet") : cr);
                          })
                        )
                    );
                  })()
              )
            : ch.type === "validation"
            ? React.createElement('div', { key: ch.k, style: { marginBottom: 14, marginTop: 6, background: "#FFF8E6", border: "2px solid #E8C34A", borderRadius: 10, padding: "14px 16px" } },
                React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
                  React.createElement('span', { style: { fontSize: 18 } }, "\u2705"),
                  React.createElement('span', { style: { fontSize: 14, fontWeight: 700, color: "#8A6D1F" } }, "Validation requise")
                ),
                React.createElement('div', { style: { fontSize: 12.5, color: "#6B5A1F", marginBottom: 10, lineHeight: 1.5 } }, "Cette demande doit être validée. Indiquez l'adresse email du validateur : il recevra un email avec un bouton pour valider en un clic."),
                React.createElement('label', { style: { display: "block", fontSize: 12, fontWeight: 600, color: "#6B5A1F", marginBottom: 5 } }, ch.label + " *"),
                React.createElement('input', { type: "email", value: tplValues[ch.k] || "", onChange: e => setTplValues({ ...tplValues, [ch.k]: e.target.value }), placeholder: "validateur@hotel.com", style: { ...inputStyle, border: "1px solid #E8C34A", background: "white" } })
              )
            : ch.type === "checkbox"
            ? React.createElement('div', { key: ch.k, style: { marginBottom: 14 } },
                React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333", cursor: "pointer" } },
                  React.createElement('input', { type: "checkbox", checked: tplValues[ch.k] === true, onChange: e => setTplValues({ ...tplValues, [ch.k]: e.target.checked }) }),
                  React.createElement('span', null, ch.label)
                )
              )
            : React.createElement('div', { key: ch.k, style: { marginBottom: 14 } },
              React.createElement('label', { style: labelStyle }, ch.label + (ch.req ? " *" : "")),
              ch.type === "textarea"
                ? React.createElement('textarea', { value: tplValues[ch.k] || "", onChange: e => setTplValues({ ...tplValues, [ch.k]: e.target.value }), rows: 3, style: { ...inputStyle, resize: "vertical" } })
              : ch.type === "select"
                ? React.createElement('select', { value: tplValues[ch.k] || "", onChange: e => setTplValues({ ...tplValues, [ch.k]: e.target.value }), style: inputStyle },
                    React.createElement('option', { value: "" }, "— Choisir —"),
                    (ch.options || []).map(opt => React.createElement('option', { key: opt, value: opt }, opt))
                  )
              : ch.type === "radio"
                ? React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 } },
                    (ch.options || []).map(opt => React.createElement('label', { key: opt, style: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#333", background: tplValues[ch.k] === opt ? "#F3EFDA" : "#FAFAFC", border: "1px solid " + (tplValues[ch.k] === opt ? "#E8C34A" : "#E8E8F0"), borderRadius: 7, padding: "8px 14px", cursor: "pointer" } },
                      React.createElement('input', { type: "radio", name: ch.k, checked: tplValues[ch.k] === opt, onChange: () => setTplValues({ ...tplValues, [ch.k]: opt }) }),
                      React.createElement('span', null, opt)
                    ))
                  )
              : ch.type === "checkboxes"
                ? React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginTop: 4 } },
                    (ch.options || []).map(opt => {
                      const arr = Array.isArray(tplValues[ch.k]) ? tplValues[ch.k] : [];
                      const coche = arr.includes(opt);
                      return React.createElement('label', { key: opt, style: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#333", background: "#FAFAFC", border: "1px solid #E8E8F0", borderRadius: 7, padding: "7px 10px", cursor: "pointer" } },
                        React.createElement('input', { type: "checkbox", checked: coche, onChange: e => {
                          const next = e.target.checked ? [...arr, opt] : arr.filter(x => x !== opt);
                          setTplValues({ ...tplValues, [ch.k]: next });
                        } }),
                        React.createElement('span', null, opt)
                      );
                    })
                  )
                : React.createElement('input', { type: ch.type || "text", value: tplValues[ch.k] || "", onChange: e => setTplValues({ ...tplValues, [ch.k]: e.target.value }), style: inputStyle })
            )
          ),

          tplError && React.createElement('div', { style: { fontSize: 12.5, color: "#C53030", background: "#FDECEC", border: "1px solid #F5B5B5", borderRadius: 7, padding: "9px 12px", marginBottom: 12 } }, tplError),
          tplOk && React.createElement('div', { style: { fontSize: 12.5, color: "#256029", background: "#EAF6EC", border: "1px solid #B5DBB9", borderRadius: 7, padding: "9px 12px", marginBottom: 12 } }, tplOk),

          React.createElement('button', { onClick: soumettreTemplate, disabled: tplSending, style: { background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "10px 18px", opacity: tplSending ? 0.6 : 1 } }, tplSending ? "Envoi..." : "Envoyer la demande + PDF")
        )
      );
    }
  return content;
}
