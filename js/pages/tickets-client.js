// ===== Page « tickets-client » — condition dans App : page === "tickets-client" && isSupervisor =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_tickets_client({...}) de app.js.
function Page_tickets_client(ctx) {
  let content = ctx.content;
  const {
    badgeValidation, closeMode, closeSel, go, loadTickets, mergeMode, mergeSel, msgsSansDoublon,
    nettoyerSignature, openTicketId, openViewer, replyBusy, replyFiles, replyNote, replyText, sendReply,
    setReplyFiles, setReplyText, ticketFiles, ticketMsgs, tickets, ticketsLoading, toggleCloseSel,
    toggleMergeSel, toggleTicket
  } = ctx;
    const statusColor = (s) => s === "closed" ? "#999" : "#2F855A";
    const statusLabel = (s) => s === "closed" ? "Fermé" : "Ouvert";
    const prioColor = (p) => ({ "Urgent": "#E53E3E", "Haute": "#DD6B20", "Moyenne": "#3182CE", "Basse": "#718096" }[p] || "#718096");

    content = React.createElement('div', null,
      React.createElement('div', { style: { display: "flex", marginBottom: 14, alignItems: "center" } },
        React.createElement('div', { style: { fontSize: 12, color: "#888" } }, "Retrouvez ici toutes vos demandes envoyées au support et les réponses de notre équipe."),
        React.createElement('button', { onClick: loadTickets, style: { marginLeft: "auto", padding: "6px 12px", border: "1px solid #DDD", background: "white", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🔄 Actualiser")
      ),
      ticketsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement..."),
      !ticketsLoading && tickets.length === 0 && React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 28, textAlign: "center", color: "#999", fontSize: 13 } },
        "Vous n'avez pas encore de demande. ",
        React.createElement('a', { onClick: () => go("contact"), style: { color: G2, textDecoration: "underline", cursor: "pointer" } }, "Contacter le support →")
      ),
      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
        tickets.map(t => {
          const isOpen = openTicketId === t.id;
          const msgs = ticketMsgs[t.id] || [];
          return React.createElement('div', { key: t.id, style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", overflow: "hidden" } },
            React.createElement('div', { onClick: () => closeMode ? toggleCloseSel(t.id) : (mergeMode ? toggleMergeSel(t.id) : toggleTicket(t.id)), style: { padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, minHeight: 74, boxSizing: "border-box", background: (mergeMode && mergeSel.includes(t.id)) ? G + "10" : ((closeMode && closeSel.includes(t.id)) ? "#FFF5F5" : "transparent") } },
              mergeMode && React.createElement('input', { type: "checkbox", checked: mergeSel.includes(t.id), onChange: () => toggleMergeSel(t.id), onClick: (e) => e.stopPropagation(), style: { width: 18, height: 18, cursor: "pointer" } }),
              closeMode && React.createElement('input', { type: "checkbox", checked: closeSel.includes(t.id), onChange: () => toggleCloseSel(t.id), onClick: (e) => e.stopPropagation(), style: { width: 18, height: 18, cursor: "pointer", accentColor: "#E53E3E" } }),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" } },
                  React.createElement('span', { style: { fontSize: 10, color: "#888", background: "#F0F0F8", padding: "2px 8px", borderRadius: 20 } }, t.category),
                  React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: prioColor(t.priority), background: prioColor(t.priority) + "18", padding: "2px 8px", borderRadius: 20 } }, t.priority),
                  React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: statusColor(t.status), background: statusColor(t.status) + "18", padding: "2px 8px", borderRadius: 20 } }, statusLabel(t.status)),
                  badgeValidation(t.reference)
                ),
                React.createElement('div', { style: { fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.message || ""),
                React.createElement('div', { style: { fontSize: 10, color: "#AAA", marginTop: 3 } }, new Date(t.created_at).toLocaleString("fr-FR"))
              ),
              React.createElement('span', { style: { fontSize: 12, color: "#AAA" } }, isOpen ? "▲" : "▼")
            ),
            isOpen && React.createElement('div', { style: { borderTop: "1px solid #F0F0F8", padding: 16, background: "#FAFAFC" } },
              msgsSansDoublon(msgs, t).length > 0
                ? React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 } },
                    msgsSansDoublon(msgs, t).slice().reverse().map(m => React.createElement('div', { key: m.id, style: { alignSelf: m.sender_role === "admin" ? "flex-start" : "flex-end", maxWidth: "85%", background: m.sender_role === "admin" ? G + "22" : "#EAF2FB", border: `1px solid ${m.sender_role === "admin" ? G + "44" : "#B6D4F0"}`, borderRadius: 8, padding: "8px 12px" } },
                      React.createElement('div', { style: { fontSize: 10, fontWeight: 600, color: m.sender_role === "admin" ? G2 : "#666", marginBottom: 3 } }, (m.sender_role === "admin" ? "Support DSI Hotel" : "Vous") + " · " + new Date(m.created_at).toLocaleString("fr-FR")),
                      m.destinataires && React.createElement('div', { style: { fontSize: 10, color: "#999", marginBottom: 3 } }, "À : " + m.destinataires),
                      m.cc && React.createElement('div', { style: { fontSize: 10, color: "#999", marginBottom: 3 } }, "Cc : " + m.cc),
                      m.body_html ? React.createElement(RichHtml, { html: m.body_html, style: { fontSize: 13, color: "#333", lineHeight: 1.6 } }) : React.createElement('div', { style: { fontSize: 13, color: "#333", whiteSpace: "pre-wrap" } }, nettoyerSignature(m.body)),
                      React.createElement(FileList, { files: (ticketFiles[t.id] || []).filter(f => f.message_id === m.id && !(m.body_html && m.body_html.includes(f.file_url))), onOpenImage: openViewer }),
                      m.sender_role === "admin" && !/^(Sauvegarde relancée|📞 Appel reçu)/.test(String(m.body || "")) && React.createElement(SignatureBlock, { key: "sig" })
                    ))
                  )
                : React.createElement('div', { style: { fontSize: 12, color: "#999", fontStyle: "italic", marginBottom: 12 } }, "Pas encore de réponse. Notre équipe traite votre demande."),
              React.createElement('div', { style: { background: "white", border: "1px solid #EEE", borderRadius: 8, padding: 12, fontSize: 13, color: "#333", marginBottom: 12, whiteSpace: "pre-wrap" } },
                React.createElement('div', { style: { fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 5 } }, "VOTRE DEMANDE"),
                (() => {
                  const prem = (ticketMsgs[t.id] || [])[0];
                  if (!prem) return null;
                  return React.createElement(React.Fragment, null,
                    prem.destinataires && React.createElement('div', { style: { fontSize: 10, color: "#999", marginBottom: 2, whiteSpace: "normal" } }, "À : " + prem.destinataires),
                    prem.cc && React.createElement('div', { style: { fontSize: 10, color: "#999", marginBottom: 5, whiteSpace: "normal" } }, "Cc : " + prem.cc)
                  );
                })(),
                nettoyerSignature(t.message)
              ),
              React.createElement(FileList, { files: (ticketFiles[t.id] || []).filter(f => !f.message_id), title: "📎 VOS PIÈCES JOINTES", onOpenImage: openViewer }),
              t.status !== "closed" && React.createElement('div', null,
                React.createElement('textarea', { value: isOpen ? replyText : "", onChange: e => setReplyText(e.target.value), placeholder: "Ajouter un message...", style: { width: "100%", minHeight: 60, padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, resize: "vertical", fontFamily: "inherit", marginBottom: 8 } }),
                React.createElement('div', { style: { marginBottom: 8 } },
                  React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4 } }, "📎 Joindre des fichiers"),
                  React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => setReplyFiles(prev => [...prev, ...Array.from(e.target.files)]), style: { fontSize: 12 } }),
                  replyFiles.length > 0 && React.createElement('div', { style: { marginTop: 7, display: "flex", flexDirection: "column", gap: 5 } },
                    replyFiles.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "white", border: "1px solid #E8E8F0", borderRadius: 6, padding: "5px 9px", fontSize: 11 } },
                      React.createElement('span', null, "🆕"),
                      React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
                      React.createElement('span', { style: { color: "#AAA" } }, f.size ? Math.round(f.size / 1024) + " Ko" : ""),
                      React.createElement('button', { onClick: () => setReplyFiles(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
                    ))
                  )
                ),
                replyNote && React.createElement('div', { style: { fontSize: 11, color: replyNote.startsWith("Erreur") ? "#C53030" : "#2F855A", marginBottom: 8 } }, replyNote),
                React.createElement('div', { style: { display: "flex", justifyContent: "flex-end" } },
                  React.createElement('button', { onClick: () => sendReply(t), disabled: replyBusy, style: { padding: "8px 16px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: replyBusy ? 0.6 : 1 } }, replyBusy ? "..." : "Envoyer →")
                )
              ),
              t.status === "closed" && React.createElement('div', { style: { fontSize: 11, color: "#999", textAlign: "center", fontStyle: "italic" } }, "Ce ticket est fermé.")
            )
          );
        })
      )
    );
  return content;
}
