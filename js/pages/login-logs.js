// ===== Page « login-logs » — condition dans App : page === "login-logs" && isSuperAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_login_logs({...}) de app.js.
function Page_login_logs(ctx) {
  let content = ctx.content;
  const {
    isMobile, loadLoginLogs, loginLogFilter, loginLogs, loginLogsLoading, setLoginLogFilter
  } = ctx;
    const fmtLog = (iso) => {
      if (!iso) return "—";
      try { return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
      catch (e) { return String(iso); }
    };
    const roleLabel = (r) => r === "admin" ? "Administrateur" : (r === "supervisor" ? "Superviseur" : (r === "client" ? "Standard" : (r || "—")));
    const roleColor = (r) => r === "admin" ? { bg: "#FBF3DA", fg: "#8A6D1B" } : (r === "supervisor" ? { bg: "#E6F0FB", fg: "#2B6CB0" } : { bg: "#EDEDF2", fg: "#555" });

    content = React.createElement('div', null,
      React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#2B6CB0", marginBottom: 14, lineHeight: 1.6 } },
        "Journal des connexions au portail (tous comptes). Chaque connexion r\u00e9ussie est enregistr\u00e9e avec l'email, le r\u00f4le et l'horodatage."
      ),
      React.createElement('div', { style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" } },
        React.createElement('input', { value: loginLogFilter, onChange: e => setLoginLogFilter(e.target.value), onKeyDown: e => e.key === "Enter" && loadLoginLogs(loginLogFilter), placeholder: "Filtrer par email\u2026", style: { flex: 1, minWidth: 200, padding: "8px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13 } }),
        React.createElement('button', { onClick: () => loadLoginLogs(loginLogFilter), style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "8px 16px" } }, "Rechercher"),
        loginLogFilter && React.createElement('button', { onClick: () => { setLoginLogFilter(""); loadLoginLogs(""); }, style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 13, cursor: "pointer", padding: "8px 14px" } }, "R\u00e9initialiser")
      ),
      loginLogsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement du journal\u2026"),
      !loginLogsLoading && React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", overflow: "hidden" } },
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr auto" : "1fr 150px 170px", gap: isMobile ? 10 : 0, padding: "10px 14px", background: "#F7F7FB", borderBottom: "1px solid #E8E8F0", fontSize: 11, fontWeight: 600, color: "#777", textTransform: "uppercase", letterSpacing: ".4px" } },
          React.createElement('div', null, isMobile ? "Compte / r\u00f4le" : "Compte"),
          !isMobile && React.createElement('div', null, "R\u00f4le"),
          React.createElement('div', { style: { textAlign: "right" } }, "Date / heure")
        ),
        loginLogs.map((l, i) => {
          const rc = roleColor(l.role);
          return React.createElement('div', { key: l.id || i, style: { display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr) auto" : "1fr 150px 170px", gap: isMobile ? 10 : 0, padding: "11px 14px", borderBottom: i < loginLogs.length - 1 ? "1px solid #F0F0F4" : "none", fontSize: 13, alignItems: "center" } },
            React.createElement('div', { style: { minWidth: 0 } },
              React.createElement('div', { style: { color: "#1a1a3e", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, l.email || "\u2014"),
              isMobile && React.createElement('span', { style: { display: "inline-block", marginTop: 4, background: rc.bg, color: rc.fg, fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20 } }, roleLabel(l.role))
            ),
            !isMobile && React.createElement('div', null,
              React.createElement('span', { style: { display: "inline-block", background: rc.bg, color: rc.fg, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 } }, roleLabel(l.role))
            ),
            React.createElement('div', { style: { textAlign: "right", color: "#666", fontSize: 12 } }, fmtLog(l.logged_at))
          );
        }),
        !loginLogsLoading && loginLogs.length === 0 && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13 } }, "Aucune connexion enregistr\u00e9e.")
      )
    );
  return content;
}
