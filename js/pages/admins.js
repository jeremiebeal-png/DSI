// ===== Page « admins » — condition dans App : page === "admins" && isSuperAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_admins({...}) de app.js.
function Page_admins(ctx) {
  let content = ctx.content;
  const {
    ADMIN_SECTIONS, PERM_LABELS, adminErr, adminForm, adminMfa, admins, adminsLoading, deleteAdmin,
    editingAdminPerms, isMobile, openAdminMfa, removeAdminFactor, resetAdminMfa, saveAdminPerms, savingAdmin,
    setAdminErr, setAdminForm, setAdminMfa, setEditingAdminPerms, setShowAdminForm, showAdminForm,
    submitAdminForm, togglePerm
  } = ctx;
    // Dérivé de ADMIN_SECTIONS : tout nouvel onglet ajouté au menu apparaît
    // automatiquement dans la grille de permissions (pas de liste à maintenir en double).
    const permKeys = [...new Set(ADMIN_SECTIONS.map(s => s.key))].filter(k => PERM_LABELS[k]);
    const permLabels = PERM_LABELS;

    content = React.createElement('div', null,
      React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#2B6CB0", marginBottom: 14, lineHeight: 1.6 } },
        "Cr\u00e9ez des comptes administrateurs et choisissez \u00e0 quelles sections ils ont acc\u00e8s. Chaque admin configure sa propre double authentification (MFA) \u00e0 sa premi\u00e8re connexion."
      ),
      React.createElement('div', { style: { display: "flex", justifyContent: "flex-end", marginBottom: 14 } },
        React.createElement('button', { onClick: () => { setShowAdminForm(true); setAdminForm({ email: "", pw: "", permissions: [] }); setAdminErr(""); }, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "8px 14px" } }, "+ Ajouter un administrateur")
      ),

      showAdminForm && React.createElement('div', { style: { background: "white", borderRadius: 10, border: `1px solid ${G}35`, padding: 18, marginBottom: 14 } },
        React.createElement('div', { style: { fontWeight: 500, fontSize: 13, color: "#1a1a3e", marginBottom: 12 } }, "Nouvel administrateur"),
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 } },
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Nom complet"),
            React.createElement('input', { value: adminForm.fullName, onChange: e => setAdminForm({ ...adminForm, fullName: e.target.value }), placeholder: "Prénom Nom", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Email de connexion *"),
            React.createElement('input', { value: adminForm.email, onChange: e => setAdminForm({ ...adminForm, email: e.target.value }), placeholder: "prenom@dsihotel.com", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
          ),
          React.createElement('div', null,
            React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "Mot de passe *"),
            React.createElement('input', { value: adminForm.pw, onChange: e => setAdminForm({ ...adminForm, pw: e.target.value }), placeholder: "Mot de passe initial", style: { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, boxSizing: "border-box" } })
          )
        ),
        React.createElement('div', { style: { marginBottom: 12 } },
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 6 } }, "Acc\u00e8s autoris\u00e9s"),
          React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
            permKeys.map(k => React.createElement('label', { key: k, style: { display: "flex", alignItems: "center", gap: 6, background: adminForm.permissions.includes(k) ? G + "18" : "#F8F8FC", border: `1px solid ${adminForm.permissions.includes(k) ? G + "66" : "#E8E8F0"}`, borderRadius: 7, padding: "6px 11px", fontSize: 12, cursor: "pointer" } },
              React.createElement('input', { type: "checkbox", checked: adminForm.permissions.includes(k), onChange: () => setAdminForm({ ...adminForm, permissions: togglePerm(adminForm.permissions, k) }), style: { cursor: "pointer" } }),
              permLabels[k]
            ))
          )
        ),
        adminErr && React.createElement('div', { style: { color: "#E53E3E", fontSize: 12, marginBottom: 10 } }, adminErr),
        React.createElement('div', { style: { display: "flex", gap: 7, justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => setShowAdminForm(false), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "6px 12px" } }, "Annuler"),
          React.createElement('button', { onClick: submitAdminForm, disabled: savingAdmin, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "6px 12px", opacity: savingAdmin ? 0.6 : 1 } }, savingAdmin ? "Cr\u00e9ation..." : "Cr\u00e9er l'administrateur")
        )
      ),

      adminMfa && React.createElement('div', { onClick: e => { if (e.target === e.currentTarget && !adminMfa.busy) setAdminMfa(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16 } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 480, maxWidth: "100%" } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 3 } }, "📱 Téléphones de double authentification"),
          React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14 } }, adminMfa.admin.email),
          React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 8, padding: "9px 12px", fontSize: 11.5, color: "#2B6CB0", marginBottom: 14, lineHeight: 1.55 } },
            React.createElement('b', null, "Changement de téléphone : "),
            "cliquez sur « Réinitialiser la MFA ». À sa prochaine connexion, l'administrateur verra un nouveau QR code à scanner avec son nouveau téléphone. ",
            "S'il a encore l'ancien téléphone, il peut aussi ajouter lui-même le nouveau depuis « Mes téléphones (MFA) »."),
          adminMfa.loading
            ? React.createElement('div', { style: { padding: 12, color: "#999", fontSize: 13 } }, "Chargement…")
            : (adminMfa.factors.length === 0
                ? React.createElement('div', { style: { padding: "12px 14px", background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 8, fontSize: 12.5, color: "#8A6D1F", marginBottom: 6 } }, "Aucun téléphone enregistré : un QR code lui sera présenté à sa prochaine connexion.")
                : adminMfa.factors.map(f => React.createElement('div', { key: f.id, style: { display: "flex", alignItems: "center", gap: 10, border: "1px solid #E8E8F0", borderRadius: 9, padding: "10px 13px", marginBottom: 7 } },
                    React.createElement('span', { style: { fontSize: 18 } }, "📱"),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: "#1a1a3e" } }, f.friendly_name || "Appareil sans nom"),
                      React.createElement('div', { style: { fontSize: 11, color: "#999" } }, "Ajouté le " + (f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : "—"))
                    ),
                    React.createElement('button', { onClick: () => removeAdminFactor(f), disabled: adminMfa.busy, style: { background: "none", border: "1px solid #E8B4B4", color: "#C53030", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "5px 11px" } }, "Retirer")
                  ))),
          adminMfa.msg && React.createElement('div', { style: { fontSize: 12.5, marginTop: 8, color: adminMfa.msg.startsWith("✓") ? "#2F855A" : "#C53030" } }, adminMfa.msg),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" } },
            React.createElement('button', { onClick: resetAdminMfa, disabled: adminMfa.busy || adminMfa.loading, style: { marginRight: "auto", background: "#C53030", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px", opacity: (adminMfa.busy || adminMfa.loading) ? 0.6 : 1 } }, adminMfa.busy ? "…" : "🔄 Réinitialiser la MFA"),
            React.createElement('button', { onClick: () => setAdminMfa(null), disabled: adminMfa.busy, style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "8px 14px" } }, "Fermer")
          )
        )
      ),
      adminsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement..."),
      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
        admins.map(a => React.createElement('div', { key: a.id, style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 15 } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" } },
            React.createElement('div', { style: { width: 34, height: 34, background: a.is_superadmin ? G + "22" : "#F0F0F8", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 } }, a.is_superadmin ? "\u2b50" : "\ud83d\udc64"),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { style: { fontWeight: 500, fontSize: 13, color: "#1a1a3e" } }, a.email),
              React.createElement('div', { style: { fontSize: 11, color: "#888" } }, a.is_superadmin ? "Super-administrateur \u2014 acc\u00e8s complet" : "Administrateur")
            ),
            !a.is_superadmin && React.createElement('button', { onClick: () => openAdminMfa(a), title: "Gérer les téléphones de double authentification", style: { padding: "6px 10px", background: "none", border: `1px solid ${G}55`, color: G2, borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 500 } }, "📱 Téléphones (MFA)"),
            !a.is_superadmin && React.createElement('button', { onClick: () => deleteAdmin(a), style: { padding: "6px 10px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 11, cursor: "pointer" } }, "\u2715 Supprimer")
          ),
          a.is_superadmin
            ? React.createElement('div', { style: { fontSize: 11, color: "#999", fontStyle: "italic" } }, "Toutes les sections + gestion des administrateurs")
            : (editingAdminPerms && editingAdminPerms.id === a.id
                ? React.createElement('div', null,
                    React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 } },
                      permKeys.map(k => React.createElement('label', { key: k, style: { display: "flex", alignItems: "center", gap: 6, background: editingAdminPerms.permissions.includes(k) ? G + "18" : "#F8F8FC", border: `1px solid ${editingAdminPerms.permissions.includes(k) ? G + "66" : "#E8E8F0"}`, borderRadius: 7, padding: "6px 11px", fontSize: 12, cursor: "pointer" } },
                        React.createElement('input', { type: "checkbox", checked: editingAdminPerms.permissions.includes(k), onChange: () => setEditingAdminPerms({ ...editingAdminPerms, permissions: togglePerm(editingAdminPerms.permissions, k) }), style: { cursor: "pointer" } }),
                        permLabels[k]
                      ))
                    ),
                    React.createElement('div', { style: { display: "flex", gap: 7, justifyContent: "flex-end" } },
                      React.createElement('button', { onClick: () => setEditingAdminPerms(null), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 11, cursor: "pointer", padding: "5px 11px" } }, "Annuler"),
                      React.createElement('button', { onClick: saveAdminPerms, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", padding: "5px 11px" } }, "Enregistrer")
                    )
                  )
                : React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                    (a.permissions || []).length > 0
                      ? (a.permissions || []).map(k => React.createElement('span', { key: k, style: { fontSize: 10.5, color: "#555", background: "#F0F0F8", padding: "3px 9px", borderRadius: 20 } }, permLabels[k] || k))
                      : React.createElement('span', { style: { fontSize: 11, color: "#C05621", fontStyle: "italic" } }, "Aucun acc\u00e8s configur\u00e9"),
                    React.createElement('button', { onClick: () => setEditingAdminPerms({ id: a.id, email: a.email, permissions: [...(a.permissions || [])] }), style: { marginLeft: "auto", padding: "5px 11px", background: "none", border: `1px solid ${G}55`, color: G2, borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 500 } }, "Modifier les acc\u00e8s")
                  )
            )
        )),
        !adminsLoading && admins.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun administrateur.")
      )
    );
  return content;
}
