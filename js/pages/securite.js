// ===== Page « securite » — condition dans App : page === "securite" && (isAdmin || isSupervisor) =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_securite({...}) de app.js.
function Page_securite(ctx) {
  let content = ctx.content;
  const {
    isSupervisor, secAddCode, secAddName, secAddQr, secAddSecret, secBusy, secCancelAdd, secConfirmAdd,
    secFactors, secLoading, secMsg, secRemove, secStartAdd, setSecAddCode, setSecAddName
  } = ctx;
    content = React.createElement('div', { style: { maxWidth: 640 } },
      React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#2B6CB0", marginBottom: 18, lineHeight: 1.6 } },
        isSupervisor
          ? "Ce compte superviseur est partagé par votre établissement. Chaque personne peut enregistrer son propre téléphone : ajoutez un appareil, donnez-lui un nom (ex : « iPhone Réception »), et chacun pourra se connecter avec ses propres codes. Vous pouvez retirer un téléphone à tout moment sans affecter les autres."
          : "Gérez les appareils autorisés à générer vos codes de double authentification (MFA). Vous pouvez ajouter un téléphone de secours ou celui d'un collègue, et retirer un appareil à tout moment."
      ),
      // Liste des appareils
      React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: "#1a1a3e", marginBottom: 10 } }, "Appareils enregistrés"),
      secLoading && React.createElement('div', { style: { padding: 14, color: "#999", fontSize: 13 } }, "Chargement…"),
      !secLoading && secFactors.map(f => React.createElement('div', { key: f.id, style: { display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 16px", marginBottom: 8 } },
        React.createElement('div', { style: { fontSize: 20 } }, "📱"),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e" } }, f.friendly_name || "Appareil sans nom"),
          React.createElement('div', { style: { fontSize: 11.5, color: "#999", marginTop: 2 } }, "Ajouté le " + (f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : "—"))
        ),
        React.createElement('button', { onClick: () => secRemove(f), style: { background: "none", border: "1px solid #E8B4B4", color: "#C53030", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "6px 12px" } }, "Retirer")
      )),
      !secLoading && secFactors.length === 0 && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0", marginBottom: 8 } }, "Aucun appareil enregistré."),

      // Zone d'ajout
      React.createElement('div', { style: { marginTop: 22, paddingTop: 18, borderTop: "1px solid #E8E8F0" } },
        !secAddQr
          ? React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: "#1a1a3e", marginBottom: 10 } }, "Ajouter un appareil"),
              React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
                React.createElement('input', { value: secAddName, onChange: e => setSecAddName(e.target.value), placeholder: "Nom (ex : iPhone de Jérémie)", style: { flex: 1, minWidth: 200, padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13 } }),
                React.createElement('button', { onClick: secStartAdd, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "9px 18px" } }, "Générer le QR code")
              )
            )
          : React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: "#1a1a3e", marginBottom: 10 } }, "Scannez ce QR code avec l'application d'authentification du nouvel appareil"),
              React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: 14, display: "flex", justifyContent: "center", marginBottom: 12 } },
                React.createElement('img', { src: secAddQr, alt: "QR code", style: { width: 190, height: 190, display: "block" } })
              ),
              secAddSecret && React.createElement('div', { style: { marginBottom: 14 } },
                React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 4 } }, "Ou saisissez cette clé manuellement :"),
                React.createElement('div', { style: { background: "#F4F4F8", borderRadius: 7, padding: "9px 11px", color: "#333", fontSize: 12.5, fontFamily: "monospace", wordBreak: "break-all", userSelect: "all" } }, secAddSecret)
              ),
              React.createElement('div', { style: { fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500 } }, "Entrez le code à 6 chiffres affiché sur le nouvel appareil :"),
              React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
                React.createElement('input', { value: secAddCode, onChange: e => setSecAddCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)), onKeyDown: e => e.key === "Enter" && secConfirmAdd(), placeholder: "123456", inputMode: "numeric", style: { width: 130, padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 15, letterSpacing: 3, textAlign: "center", fontFamily: "monospace" } }),
                React.createElement('button', { onClick: secConfirmAdd, disabled: secBusy, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "9px 18px", opacity: secBusy ? 0.6 : 1 } }, secBusy ? "Vérification…" : "Valider l'appareil"),
                React.createElement('button', { onClick: secCancelAdd, style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 13, cursor: "pointer", padding: "9px 14px" } }, "Annuler")
              )
            )
      ),
      secMsg && React.createElement('div', { style: { marginTop: 14, fontSize: 12.5, color: secMsg.startsWith("✓") ? "#2F855A" : "#C53030" } }, secMsg)
    );
  return content;
}
