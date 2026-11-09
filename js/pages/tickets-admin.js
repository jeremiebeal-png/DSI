// ===== Page « tickets-admin » — condition dans App : page === "tickets-admin" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_tickets_admin({...}) de app.js.
function Page_tickets_admin(ctx) {
  let content = ctx.content;
  const {
    BK_FREQS, adressesConnues, applyReponseType, apprendreDomaineTicket, assignerTechnicien, audioCtxRef,
    audioReadyRef, badgeValidation, closeBusy, closeMode, closeSel, closeTicket, creerTicketTelephone,
    creneauBusy, creneauCommentaire, creneauTicket, dernierMessageTicket, doCloseTickets, doMergeTickets,
    enregistrerNote, estTicketArrivee, extraireCcDuFil, freqBusy, frequenceDepuisTicket, genererAttestation,
    hotels, hoverTk, isAdmin, isMobile, jouerSonAlerte, loadTickets, marquerBackupRelance, menuActionsTicket,
    mergeBusy, mergeMode, mergeSel, msgsSansDoublon, nettoyerEmail, nettoyerSignature, nomTechnicien,
    noteBusy, noteOpenId, noteSaved, noteText, onRowEnter, onRowLeave, onRowMove, openTicketId, openViewer,
    ouvrirAgent, ouvrirBlocage, ouvrirDeverrouillageAd, ouvrirNote, ouvrirTicketTelephone, relanceBusy,
    renderProvisioning, replyAndClose, replyBusy, replyCcList, replyCcManual, replyFiles, replyHtml,
    replyHtmlOverride, replyImageUrls, replyNote, replyText, reponsesTypes, rtStatus, sendReply, session,
    setCloseMode, setCloseSel, setCreneauCommentaire, setFwdEmail, setFwdMsg, setFwdNote, setFwdTicket,
    setMergeMode, setMergeSel, setNoteOpenId, setNoteText, setOpenTicketId, setReplyCcList, setReplyCcManual,
    setReplyFiles, setReplyHtml, setReplyHtmlOverride, setReplyImageUrls, setReplyNote, setReplyText,
    setTelModal, setTicketFilter, setTicketSearch, setTicketStatus, setTicketView, setTickets, setTkMenu,
    setTkSortPresta, silenceBusy, silencerAlerteBackup, statuerCreneauTicket, techniciens, techniciensMenu,
    telModal, ticketBodies, ticketFiles, ticketFilter, ticketMsgs, ticketSearch, ticketState, ticketView,
    tickets, ticketsLoading, tkMenu, tkSortPresta, toggleCloseSel, toggleMergeSel, toggleTicket, validations
  } = ctx;
    // Sur mobile, la vue tableau (colonnes à largeur fixe) déborde de l'écran :
    // on force alors l'affichage en cartes, qui est responsive. L'état ticketView
    // est conservé, seul le rendu bascule.
    const tableView = ticketView === "table" && !isMobile;
    const statusColor = (s) => s === "closed" ? "#999" : "#2F855A";
    const statusLabel = (s) => s === "closed" ? "Fermé" : "Ouvert";
    const prioColor = (p) => ({ "Urgent": "#E53E3E", "Haute": "#DD6B20", "Moyenne": "#3182CE", "Basse": "#718096" }[p] || "#718096");
    // Badge d'état : "Nouveau" / "Réponse", et "En retard" si > 4h sans réponse de notre part.
    const SLA_MS = 4 * 60 * 60 * 1000; // 4 heures
    const ticketStateBadge = (st, ticketStatus) => {
      if (ticketStatus === "closed" || !st || !st.kind) return null;
      const enRetard = st.since && (Date.now() - new Date(st.since).getTime() > SLA_MS);
      const base = { fontSize: 9.5, fontWeight: 700, color: "#fff", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" };
      const label = st.kind === "new" ? "Nouveau" : "Réponse";
      const badge = React.createElement('span', { key: "k", style: { ...base, background: st.kind === "new" ? "#3182CE" : "#DD6B20" } }, "● " + label);
      if (!enRetard) return badge;
      // En retard : on affiche le badge + une pastille rouge "En retard"
      return React.createElement('span', { style: { display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap", justifyContent: "center" } },
        badge,
        React.createElement('span', { key: "r", style: { ...base, background: "#E53E3E" }, title: "Sans réponse depuis plus de 4h" }, "⏱ En retard")
      );
    };
    // Onglet dédié "Sheraton" : tous les tickets non fermés des hôtels dont le nom
    // contient "Sheraton" (ex. Sheraton - CDG). Ils sont retirés de "Ouverts".
    const sheratonHotelIds = new Set(hotels.filter(h => /sheraton/i.test(h.name || "")).map(h => h.id));
    const estSheraton = (t) => sheratonHotelIds.has(t.hotel_id);
    const nbSheraton = tickets.filter(t => estSheraton(t) && t.status !== "closed").length;
    const nbDefender = tickets.filter(t => estAlerteMicrosoft(t) && t.status !== "closed").length;
    const nbSophosTk = tickets.filter(t => estAlerteSophos(t) && t.status !== "closed").length;
    const nbBackupTk = tickets.filter(t => estAlerteBackup(t) && t.status !== "closed").length;
    const nbTelOuv = tickets.filter(t => estTicketTelephone(t) && t.status !== "closed").length;
    const ALERTE_ONGLETS = { defender: { nb: nbDefender, titre: "alerte(s) Microsoft à traiter" }, sophos: { nb: nbSophosTk, titre: "alerte(s) Sophos à traiter" }, backup: { nb: nbBackupTk, titre: "alerte(s) de sauvegarde à traiter" } };
    let list = tickets;
    if (ticketFilter === "open") list = tickets.filter(t => t.status !== "closed" && !t.en_attente && !estSheraton(t) && !estAlerteAuto(t));
    if (ticketFilter === "defender") list = tickets.filter(t => estAlerteMicrosoft(t) && t.status !== "closed");
    if (ticketFilter === "sophos") list = tickets.filter(t => estAlerteSophos(t) && t.status !== "closed");
    if (ticketFilter === "backup") list = tickets.filter(t => estAlerteBackup(t) && t.status !== "closed");
    if (ticketFilter === "sheraton") list = tickets.filter(t => estSheraton(t) && t.status !== "closed");
    if (ticketFilter === "closed") list = tickets.filter(t => t.status === "closed");
    if (ticketFilter === "waiting") list = tickets.filter(t => t.en_attente && t.status !== "closed");
    const monId = session && session.user ? session.user.id : null;
    if (ticketFilter === "mine") list = tickets.filter(t => t.assigned_to && t.assigned_to === monId && t.status !== "closed");
    if (ticketFilter === "unassigned") list = tickets.filter(t => !t.assigned_to && t.status !== "closed");
    // Onglet Téléphone : tous les appels (ouverts et fermés), pour les comptabiliser
    if (ticketFilter === "telephone") list = tickets.filter(t => estTicketTelephone(t));

    // Recherche : dès qu'un terme est saisi, on ignore le filtre Ouverts/Fermés/Tous
    // et on cherche dans TOUS les tickets (objet + contact + hôtel + corps des messages).
    const rechercheActive = ticketSearch.trim().length > 0;
    if (rechercheActive) {
      const termes = ticketSearch.toLowerCase().split(/\s+/).filter(Boolean);
      const stripHtml = (s) => (s || "").toString().replace(/<[^>]*>/g, " ");
      list = tickets.filter(t => {
        const h = hotels.find(x => x.id === t.hotel_id);
        const champs = [
          t.subject, t.message, t.contact_name, t.contact_email,
          t.reference, h ? h.name : "",
          stripHtml(ticketBodies[t.id])
        ].join(" ").toLowerCase();
        return termes.every(mot => champs.includes(mot));
      });
    }

    if (tkSortPresta) list = list.slice().sort((a, b) => (a.prestataire ? 0 : 1) - (b.prestataire ? 0 : 1) || String(a.prestataire || "").localeCompare(String(b.prestataire || "")));
    if (openTicketId) list = tickets.filter(t => t.id === openTicketId);

    content = React.createElement('div', null,
      openTicketId && React.createElement('button', { onClick: () => setOpenTicketId(null), style: { display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "8px 15px", background: "white", border: "1px solid #DDE0EA", color: "#444", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" } }, "← Retour aux tickets"),
      // Barre des tickets — proposition 3 : cartes d'alertes au-dessus, filtres sobres, actions secondaires dans « ⋯ »
      !openTicketId && (() => {
        const ico = (d) => React.createElement('svg', { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, React.createElement('path', { d }));
        const cartes = [
          { v: "backup", nb: nbBackupTk, lib: "Alertes sauvegarde", alerte: true, d: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" },
          { v: "sophos", nb: nbSophosTk, lib: "Alertes Sophos", alerte: true, d: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" },
          { v: "defender", nb: nbDefender, lib: "Alertes Microsoft", alerte: true, d: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" },
          { v: "sheraton", nb: nbSheraton, lib: "Sheraton", alerte: false, d: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" },
        ];
        const filtres = [["open", "Ouverts"], ["mine", "Mes tickets"], ["unassigned", "Non assignés"], ["waiting", "En cours"], ["telephone", "Téléphone" + (nbTelOuv ? " (" + nbTelOuv + ")" : "")], ["closed", "Fermés"], ["all", "Tous"]];
        const rtOk = rtStatus === "SUBSCRIBED";
        const itemMenu = (lib, fn, rouge) => React.createElement('button', { onClick: () => { setTkMenu(false); fn(); },
          onMouseEnter: e => { e.currentTarget.style.background = "#F5F5FB"; }, onMouseLeave: e => { e.currentTarget.style.background = "transparent"; },
          style: { display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", borderRadius: 6, fontSize: 13, color: rouge ? "#C53030" : "#333", cursor: "pointer", fontFamily: "inherit" } }, lib);
        const sepMenu = (k) => React.createElement('div', { key: k, style: { height: 1, background: "#EEF0F5", margin: "4px 2px" } });
        return React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 } },
          // Cartes d'alertes
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 12 } },
            cartes.map(c => {
              const rouge = c.alerte && c.nb > 0;
              const actif = ticketFilter === c.v;
              return React.createElement('button', { key: c.v, "data-no-invert": rouge ? "1" : undefined, onClick: () => setTicketFilter(actif ? "open" : c.v), title: actif ? "Revenir aux tickets ouverts" : "Afficher : " + c.lib,
                style: { textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: actif ? (rouge ? "#FFF5F5" : "#FBF7EA") : "white", border: "1px solid " + (actif ? (rouge ? "#C53030" : G) : (rouge ? "#F1B5B5" : "#E2E4EE")), boxShadow: actif ? "0 0 0 1px " + (rouge ? "#C53030" : G) : "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" } },
                React.createElement('span', { style: { width: 36, height: 36, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: rouge ? "#FDEDED" : (c.alerte ? "#EEF0F5" : "#F7F1DE"), color: rouge ? "#C53030" : (c.alerte ? "#555" : "#8A6D1F") } }, ico(c.d)),
                React.createElement('span', { style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } },
                  React.createElement('span', { style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: rouge ? "#C53030" : "#1A1A3E" } }, c.nb),
                  React.createElement('span', { style: { fontSize: 12.5, color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, c.lib)
                )
              );
            })
          ),
          // Filtres + recherche + actions
          React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
            filtres.map(([v, lbl]) => React.createElement('button', { key: v, onClick: () => setTicketFilter(v), style: { padding: "6px 14px", border: "1px solid " + (ticketFilter === v ? G : "#DDE0EA"), background: ticketFilter === v ? "#F7F1DE" : "white", color: ticketFilter === v ? "#6E5815" : "#444", borderRadius: 18, fontSize: 12.5, cursor: "pointer", fontWeight: ticketFilter === v ? 600 : 400, fontFamily: "inherit" } }, lbl)),
          React.createElement('div', { style: { flex: "1 1 260px", position: "relative", minWidth: 200 } },
            React.createElement('span', { style: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#AAA", pointerEvents: "none" } }, "🔍"),
            React.createElement('input', {
              type: "text",
              value: ticketSearch,
              onChange: e => setTicketSearch(e.target.value),
              placeholder: "Rechercher un ticket (objet, contact, hôtel, message)…",
              style: { width: "100%", padding: "7px 32px 7px 32px", border: "1px solid #DDD", borderRadius: 20, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }
            }),
            ticketSearch && React.createElement('button', { onClick: () => setTicketSearch(""), title: "Effacer", style: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#999", fontSize: 15, cursor: "pointer", lineHeight: 1, padding: 2 } }, "✕")
          ),
            React.createElement('span', { title: rtOk ? "Alertes temps réel actives (nouveaux tickets signalés en direct)" : "Connexion temps réel inactive : actualisez la page", style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555", whiteSpace: "nowrap" } },
              React.createElement('span', { style: { width: 7, height: 7, borderRadius: "50%", background: rtOk ? "#38A169" : "#DD6B20" } }),
              list.length + (list.length > 1 ? " tickets" : " ticket")
            ),
            mergeMode && React.createElement('button', { onClick: () => { setMergeMode(false); setMergeSel([]); }, style: { padding: "0 12px", height: 34, border: "1px solid " + G, background: "#F7F1DE", color: "#6E5815", borderRadius: 8, fontSize: 12.5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" } }, "✕ Annuler la fusion"),
            closeMode && React.createElement('button', { onClick: () => { setCloseMode(false); setCloseSel([]); }, style: { padding: "0 12px", height: 34, border: "1px solid #E53E3E", background: "#FFF5F5", color: "#C53030", borderRadius: 8, fontSize: 12.5, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" } }, "✕ Annuler la fermeture"),
            React.createElement('button', { onClick: ouvrirTicketTelephone, title: "Enregistrer un appel reçu au support", style: { padding: "0 14px", height: 34, border: "none", background: SB, color: "white", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" } }, "+ Ticket téléphone"),
            React.createElement('div', { style: { position: "relative" } },
              React.createElement('button', { onClick: () => setTkMenu(m => !m), "aria-label": "Autres actions", title: "Autres actions", style: { width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid " + (tkMenu ? G : "#DDE0EA"), background: "white", color: "#555", borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700, lineHeight: 1, paddingBottom: 6 } }, "…"),
              tkMenu && React.createElement('div', { onClick: () => setTkMenu(false), style: { position: "fixed", inset: 0, zIndex: 44 } }),
              tkMenu && React.createElement('div', { style: { position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 45, minWidth: 220, background: "white", border: "1px solid #E2E4EE", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,15,36,.18)", padding: 5 } },
                itemMenu("🔄 Actualiser", loadTickets),
                !isMobile && itemMenu(ticketView === "table" ? "☰ Afficher en liste" : "▦ Afficher en tableau", () => setTicketView(v => v === "table" ? "cards" : "table")),
                sepMenu("s1"),
                itemMenu(mergeMode ? "✕ Annuler la fusion" : "⧉ Fusionner des tickets", () => { setMergeMode(m => !m); setMergeSel([]); setCloseMode(false); setCloseSel([]); }),
                itemMenu(closeMode ? "✕ Annuler la fermeture" : "✓ Fermer plusieurs tickets", () => { setCloseMode(m => !m); setCloseSel([]); setMergeMode(false); setMergeSel([]); }),
                sepMenu("s2"),
                itemMenu("🔔 Tester le son d'alerte", () => {
            // Débloque le contexte audio (au cas où) puis joue le son de test
            try {
              if (!audioCtxRef.current) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtxRef.current = new AC(); }
              if (audioCtxRef.current && audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
              audioReadyRef.current = true;
            } catch (e) {}
            jouerSonAlerte(true);
          }),
                React.createElement('div', { style: { padding: "8px 12px 6px", fontSize: 11.5, color: rtOk ? "#2F855A" : "#C05621", display: "flex", alignItems: "center", gap: 6 } },
                  React.createElement('span', { style: { width: 7, height: 7, borderRadius: "50%", background: rtOk ? "#38A169" : "#DD6B20" } }),
                  rtOk ? "Alertes temps réel actives" : "Alertes temps réel inactives")
              )
            )
          )
        );
      })(),
      mergeMode && React.createElement('div', { style: { background: "#EBF8FF", border: "1px solid #BEE3F8", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
        React.createElement('span', { style: { fontSize: 12, color: "#2B6CB0", flex: 1 } }, mergeSel.length < 2 ? "Cochez au moins 2 tickets à fusionner. Le plus ancien deviendra le ticket principal." : (mergeSel.length + " tickets sélectionnés — ils seront fusionnés dans le plus ancien.")),
        React.createElement('button', { onClick: doMergeTickets, disabled: mergeSel.length < 2 || mergeBusy, style: { padding: "7px 14px", background: mergeSel.length >= 2 ? G : "#CCC", border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: mergeSel.length >= 2 ? "pointer" : "default", opacity: mergeBusy ? 0.6 : 1 } }, mergeBusy ? "Fusion..." : "Fusionner les tickets")
      ),
      !openTicketId && ticketFilter === "telephone" && !rechercheActive && (() => {
        const debut = new Date(); debut.setDate(1); debut.setHours(0, 0, 0, 0);
        const mois = tickets.filter(t => estTicketTelephone(t) && new Date(t.created_at) >= debut);
        const resolusDirect = mois.filter(t => t.status === "closed").length;
        const parHotel = {};
        mois.forEach(t => { const n = (hotels.find(h => h.id === t.hotel_id) || {}).name || "?"; parHotel[n] = (parHotel[n] || 0) + 1; });
        const top = Object.entries(parHotel).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const nomMois = debut.toLocaleDateString("fr-FR", { month: "long" });
        return React.createElement('div', { style: { background: "#EBF4FF", border: "1px solid #BEE3F8", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#2B6CB0" } },
          React.createElement('b', null, "📞 " + nomMois.charAt(0).toUpperCase() + nomMois.slice(1) + " : " + mois.length + " appel" + (mois.length > 1 ? "s" : "")),
          React.createElement('span', null, resolusDirect + " fermé(s) · " + (mois.length - resolusDirect) + " en cours"),
          top.length > 0 && React.createElement('span', { style: { color: "#4A6FA5" } }, top.map(([n, c]) => n + " (" + c + ")").join(" · "))
        );
      })(),
      closeMode && React.createElement('div', { style: { background: "#FFF5F5", border: "1px solid #FEB2B2", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
        React.createElement('span', { style: { fontSize: 12, color: "#C53030", flex: 1 } }, closeSel.length < 1 ? "Cochez les tickets à fermer." : (closeSel.length + " ticket" + (closeSel.length > 1 ? "s" : "") + " sélectionné" + (closeSel.length > 1 ? "s" : "") + " — ils seront marqués comme fermés.")),
        React.createElement('button', { onClick: () => setCloseSel(list.map(t => t.id)), style: { padding: "7px 12px", background: "white", border: "1px solid #FEB2B2", color: "#C53030", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" } }, "Tout cocher"),
        React.createElement('button', { onClick: doCloseTickets, disabled: closeSel.length < 1 || closeBusy, style: { padding: "7px 14px", background: closeSel.length >= 1 ? "#E53E3E" : "#CCC", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: closeSel.length >= 1 ? "pointer" : "default", opacity: closeBusy ? 0.6 : 1 } }, closeBusy ? "Fermeture..." : "Fermer les tickets sélectionnés")
      ),
      ticketsLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement des tickets..."),
      !ticketsLoading && list.length === 0 && React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", padding: 28, textAlign: "center", color: "#999", fontSize: 13 } }, rechercheActive ? ("Aucun ticket ne correspond à « " + ticketSearch.trim() + " ».") : "Aucun ticket dans cette catégorie."),
      !openTicketId && tableView && !ticketsLoading && list.length > 0 && React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 12, padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.03em" } },
        React.createElement('span', { style: { width: 4, flexShrink: 0 } }),
        React.createElement('span', { style: { width: 95, flexShrink: 0 } }, "N° ticket"),
        React.createElement('span', { style: { width: "17%" } }, "Hôtel"),
        React.createElement('span', { style: { width: "15%" } }, "Contact"),
        React.createElement('span', { style: { flex: 1 } }, "Objet"),
        React.createElement('span', { onClick: () => setTkSortPresta(v => !v), title: "Trier par prestataire", style: { width: 96, flexShrink: 0, cursor: "pointer", color: tkSortPresta ? G2 : "#999" } }, "Prestataire " + (tkSortPresta ? "▲" : "⇅")),
        React.createElement('span', { style: { width: 96, flexShrink: 0 } }, "Technicien"),
        React.createElement('span', { style: { width: 130, textAlign: "center", flexShrink: 0 } }, "État"),
        React.createElement('span', { style: { width: 25, flexShrink: 0 } }, ""),
        React.createElement('span', { style: { width: 70, textAlign: "center", flexShrink: 0 } }, "Priorité"),
        React.createElement('span', { style: { width: 100, textAlign: "right", flexShrink: 0 } }, "Date")
      ),
      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: tableView ? 3 : 10 } },
        hoverTk && (() => {
          const rep = dernierMessageTicket(hoverTk.id);
          // Position : à droite du curseur, en évitant de sortir de l'écran par le bas.
          const vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
          const W = 340;
          let left = hoverTk.x + 18; if (left + W > vw - 10) left = hoverTk.x - W - 18;
          let top = hoverTk.y + 12; if (top + 180 > vh) top = Math.max(10, vh - 190);
          let corps;
          if (rep === undefined) corps = React.createElement('div', { style: { color: "#999", fontStyle: "italic" } }, "Chargement du dernier message…");
          else if (rep === null) corps = React.createElement('div', { style: { color: "#999", fontStyle: "italic" } }, "Aucun message pour ce ticket.");
          else {
            const txt = nettoyerSignature(rep.body || rep.body_html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            const court = txt.length > 420 ? txt.slice(0, 420) + "…" : (txt || "(message vide)");
            corps = React.createElement(React.Fragment, null,
              React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, color: "#3182CE", marginBottom: 5 } },
                (rep.sender_name || (rep.sender_role === "client" ? "Client" : "DSI Hotel")) + " · " + new Date(rep.created_at).toLocaleString("fr-FR")),
              React.createElement('div', { style: { fontSize: 12, color: "#333", lineHeight: 1.5, whiteSpace: "pre-wrap" } }, court)
            );
          }
          return React.createElement('div', { style: { position: "fixed", left: left, top: top, width: W, maxHeight: 200, overflow: "hidden", background: "#FFF", border: "1px solid #D8D8E4", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,.16)", padding: "10px 12px", zIndex: 2000, pointerEvents: "none" } },
            React.createElement('div', { style: { fontSize: 9.5, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 } }, "Dernier message"),
            corps
          );
        })(),
        list.map(t => {
          const h = hotels.find(x => x.id === t.hotel_id);
          const hotelLabel = h ? h.name : (t.hotel_id ? "Hôtel inconnu" : "⚠️ Non assigné");
          const isOpen = openTicketId === t.id;
          const msgs = ticketMsgs[t.id] || [];
          // Ticket "à traiter" = le dernier message vient du client (nouveau ticket
          // jamais répondu, OU nouvelle réponse client). On teinte la ligne en orange
          // clair pour repérer d'un coup d'œil ce qui attend une action de notre part.
          // Dès qu'on répond (kind === null), la ligne redevient blanche.
          const _st = ticketState[t.id];
          const aTraiter = _st && (_st.kind === "new" || _st.kind === "reply") && t.status !== "closed";
          // Alertes automatiques (sauvegardes, Sophos, Microsoft 365) : ligne normale, repérées par le 🔴 en tête d'objet
          const bgLigne = t.prestataire ? prestaColor(t.prestataire) + "0E" : "white";
          const bordLigne = t.prestataire ? "1px solid " + prestaColor(t.prestataire) + "44" : "1px solid #E8E8F0";
          return React.createElement('div', { key: t.id, style: { background: bgLigne, borderRadius: 10, border: bordLigne, overflow: "hidden" } },
            React.createElement('div', { onClick: () => closeMode ? toggleCloseSel(t.id) : (mergeMode ? toggleMergeSel(t.id) : toggleTicket(t.id)), onMouseEnter: tableView ? (e) => onRowEnter(t, e) : undefined, onMouseMove: tableView ? onRowMove : undefined, onMouseLeave: tableView ? onRowLeave : undefined, style: { padding: tableView ? "9px 14px" : "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, minHeight: tableView ? 0 : 74, boxSizing: "border-box", background: (mergeMode && mergeSel.includes(t.id)) ? G + "10" : ((closeMode && closeSel.includes(t.id)) ? "#FFF5F5" : "transparent") } },
              mergeMode && React.createElement('input', { type: "checkbox", checked: mergeSel.includes(t.id), onChange: () => toggleMergeSel(t.id), onClick: (e) => e.stopPropagation(), style: { width: 18, height: 18, cursor: "pointer" } }),
              closeMode && React.createElement('input', { type: "checkbox", checked: closeSel.includes(t.id), onChange: () => toggleCloseSel(t.id), onClick: (e) => e.stopPropagation(), style: { width: 18, height: 18, cursor: "pointer", accentColor: "#E53E3E" } }),
              tableView
                ? React.createElement(React.Fragment, null,
                    React.createElement('span', { style: { width: 4, height: 28, borderRadius: 3, background: prioColor(t.priority), flexShrink: 0 } }),
                    React.createElement('span', { style: { width: 95, flexShrink: 0, fontSize: 11, fontWeight: 700, color: G2, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.reference || "—"),
                    React.createElement('span', { style: { width: "17%", minWidth: 0, display: "flex", alignItems: "center", gap: 7, overflow: "hidden" } },
                      (h && h.logo_url) ? React.createElement('img', { src: h.logo_url, alt: "", style: { width: 22, height: 22, borderRadius: 4, objectFit: "contain", background: "white", border: "1px solid #EEE", flexShrink: 0 } }) : null,
                      React.createElement('span', { style: { minWidth: 0, fontWeight: 600, fontSize: 12.5, color: t.hotel_id ? "#1a1a3e" : "#DD6B20", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, hotelLabel)
                    ),
                    React.createElement('span', { style: { width: "15%", minWidth: 0, fontSize: 12.5, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.contact_name || "—"),
                    React.createElement('span', { style: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7, overflow: "hidden" } },
                      React.createElement('span', { style: { minWidth: 0, fontSize: 12.5, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.subject || t.message || "(sans objet)"),
                      badgeValidation(t.reference)
                    ),
                    React.createElement('span', { style: { width: 96, flexShrink: 0, overflow: "hidden" } }, t.prestataire ? React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: prestaColor(t.prestataire), background: prestaColor(t.prestataire) + "1C", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: "100%", boxSizing: "border-box" } }, t.prestataire) : null),
                    React.createElement('span', { style: { width: 96, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11.5, color: t.assigned_to ? "#2B6CB0" : "#BBB", fontWeight: t.assigned_to ? 600 : 400 }, title: t.assigned_to ? "Assigné à " + nomTechnicien(t.assigned_to) : "Non assigné" }, t.assigned_to ? "👤 " + nomTechnicien(t.assigned_to) : "—"),
                    React.createElement('span', { style: { width: 130, textAlign: "center", flexShrink: 0 } }, ticketStateBadge(ticketState[t.id], t.status)),
                    React.createElement('span', { style: { fontSize: 15, flexShrink: 0 }, title: t.source === "email" ? "Email" : estTicketTelephone(t) ? "Téléphone" : "Formulaire" }, t.source === "email" ? "📧" : estTicketTelephone(t) ? "📞" : "📝"),
                    React.createElement('span', { style: { width: 70, textAlign: "center", fontSize: 10, fontWeight: 600, color: prioColor(t.priority), flexShrink: 0 } }, t.priority),
                    React.createElement('span', { style: { width: 100, textAlign: "right", fontSize: 10, color: "#AAA", flexShrink: 0 } }, new Date(t.created_at).toLocaleDateString("fr-FR") + " " + new Date(t.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }))
                  )
                : React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" } },
                      React.createElement('span', { style: { fontWeight: 600, fontSize: 13, color: t.hotel_id ? "#1a1a3e" : "#DD6B20" } }, hotelLabel),
                      React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: t.source === "email" ? "#3182CE" : estTicketTelephone(t) ? "#2B6CB0" : "#718096", background: (t.source === "email" ? "#3182CE" : estTicketTelephone(t) ? "#2B6CB0" : "#718096") + "18", padding: "2px 8px", borderRadius: 20 } }, t.source === "email" ? "📧 Email" : estTicketTelephone(t) ? "📞 Téléphone" : "📝 Formulaire"),
                      React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: prioColor(t.priority), background: prioColor(t.priority) + "18", padding: "2px 8px", borderRadius: 20 } }, t.priority),
                      React.createElement('span', { style: { fontSize: 10, color: "#888", background: "#F0F0F8", padding: "2px 8px", borderRadius: 20 } }, t.category),
                      React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: statusColor(t.status), background: statusColor(t.status) + "18", padding: "2px 8px", borderRadius: 20 } }, statusLabel(t.status)),
                      ticketStateBadge(ticketState[t.id], t.status),
                      t.prestataire && React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: prestaColor(t.prestataire), background: prestaColor(t.prestataire) + "1C", padding: "2px 8px", borderRadius: 20 } }, "🔗 " + t.prestataire),
                      t.assigned_to && React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: "#2B6CB0", background: "#EBF4FF", padding: "2px 8px", borderRadius: 20 } }, "👤 " + nomTechnicien(t.assigned_to)),
                      t.en_attente && React.createElement('span', { style: { fontSize: 10, fontWeight: 600, color: "#854F0B", background: "#FAEEDA", padding: "2px 8px", borderRadius: 20 } }, "⏸ En cours" + (t.date_attente ? " · " + new Date(t.date_attente).toLocaleDateString("fr-FR") : "")),
                    ),
                    t.subject && React.createElement('div', { style: { fontSize: 12, fontWeight: 500, color: "#444", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "Objet : " + t.subject),
                    React.createElement('div', { style: { fontSize: 12, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (t.contact_name || "?") + " — " + (t.message || "")),
                    React.createElement('div', { style: { fontSize: 10, color: "#AAA", marginTop: 3 } }, new Date(t.created_at).toLocaleString("fr-FR"))
                  ),
              !tableView && React.createElement('span', { style: { fontSize: 12, color: "#AAA" } }, isOpen ? "▲" : "▼")
            ),
            isOpen && React.createElement('div', { style: { borderTop: "1px solid #F0F0F8", padding: 16, background: "#FAFAFC" } },
              // Barre d'actions du ticket (option B) : hôtel à gauche, actions fréquentes à droite, le reste dans « … »
              (() => {
                const hAssigne = hotels.find(hh => hh.id === t.hotel_id);
                const onChangeHotel = async (e) => {
                  const hid = e.target.value;
                  if (!hid || hid === t.hotel_id) return;
                  const ancien = hAssigne ? hAssigne.name : "(non assigné)";
                  const nouveau = (hotels.find(hh => hh.id === hid) || {}).name || "";
                  if (t.hotel_id && !confirm("Réattribuer ce ticket ?\n\nDe : " + ancien + "\nÀ : " + nouveau)) { e.target.value = t.hotel_id; return; }
                  const maj = { hotel_id: hid, a_rattacher: false };
                  if ("hotel_auto" in t) maj.hotel_auto = null;
                  const { error } = await sb.from("tickets").update(maj).eq("id", t.id);
                  if (!error) { setTickets(prev => prev.map(x => x.id === t.id ? { ...x, ...maj } : x)); apprendreDomaineTicket(t, hid); }
                  else alert("Erreur lors de la réattribution : " + error.message);
                };
                const ferme = t.status === "closed";
                const peutRepFermer = isOpen && (replyText.trim() || /<img/i.test(replyHtml));
                const bt = (lib, onClick, extra) => React.createElement('button', { type: "button", onClick, disabled: extra && extra.disabled, title: (extra && extra.title) || "",
                  style: { padding: "0 12px", height: 32, background: (extra && extra.bg) || "white", border: "1px solid " + ((extra && extra.bord) || "#DDE0EA"), color: (extra && extra.col) || "#444", borderRadius: 8, fontSize: 12.5, cursor: "pointer", fontWeight: (extra && extra.gras) ? 600 : 400, whiteSpace: "nowrap", fontFamily: "inherit", opacity: (extra && extra.disabled) ? 0.6 : 1 } }, lib);
                return React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14, padding: "10px 12px", background: "white", border: "1px solid #E2E4EE", borderRadius: 10 } },
                  React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: hAssigne ? "#6B6B80" : "#C05621", fontWeight: hAssigne ? 400 : 600 } },
                    hAssigne ? "Hôtel" : "⚠️ Hôtel",
                    React.createElement('select', { value: t.hotel_id || "", onChange: onChangeHotel,
                      style: { padding: "0 9px", height: 32, border: "1px solid " + (hAssigne ? "#DDE0EA" : "#F6AD55"), background: hAssigne ? "white" : "#FFFAF0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: "#1a1a3e", minWidth: 170, maxWidth: 260, fontFamily: "inherit" } },
                      !t.hotel_id && React.createElement('option', { value: "" }, "Assigner à un hôtel…"),
                      (t.hotel_id && !hAssigne) && React.createElement('option', { value: t.hotel_id }, "Hôtel inconnu"),
                      hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(hh => React.createElement('option', { key: hh.id, value: hh.id }, hh.name))
                    )
                  ),
                  t.hotel_auto && React.createElement('span', { title: "Hôtel trouvé automatiquement à la réception du mail : " + t.hotel_auto, style: { fontSize: 10.5, fontWeight: 600, color: "#276749", background: "#E9F6EE", border: "1px solid #B7E0C6", padding: "1px 8px", borderRadius: 10 } }, "auto"),
                  React.createElement('span', { style: { flex: 1 } }),
                  bt(noteSaved[t.id] ? "📝 Remarque •" : "📝 Remarque", () => ouvrirNote(t), { title: "Note interne visible uniquement par les administrateurs", bg: noteOpenId === t.id ? "#FEF3C7" : "white", bord: noteSaved[t.id] ? "#F0B429" : "#DDE0EA", col: noteSaved[t.id] ? "#B7791F" : "#444" }),
                  !ferme && bt("↪ Faire suivre", () => { setFwdTicket(t); setFwdEmail(""); setFwdNote(""); setFwdMsg(""); }),
                  isAdmin && bt("✨ Agent", () => ouvrirAgent(t), { title: "L'agent Claude lit le ticket, vérifie l'état du PC dans NinjaOne et propose une réponse (rien n'est envoyé sans vous)", col: "#6B46C1", bord: "#D6BCFA" }),
                  (t.reference && validations[t.reference] && validations[t.reference].status === "validated") && bt("\uD83D\uDCC4 Attestation", () => genererAttestation(t), { title: "Télécharger l'attestation de validation (PDF)", bg: "#EAF6EC", bord: "#B5DBB9", col: "#256029", gras: true }),
                  ferme
                    ? bt("Rouvrir le ticket", () => setTicketStatus(t, "open"), { bord: G + "88", col: G2, gras: true })
                    : React.createElement(React.Fragment, null,
                        bt("✅ Fermer + notifier", () => closeTicket(t, true), { disabled: replyBusy, bg: "#F0FFF4", bord: "#9AE6B4", col: "#276749", gras: true }),
                        React.createElement('button', { type: "button", onClick: () => sendReply(t), disabled: replyBusy, style: { padding: "0 16px", height: 32, background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: replyBusy ? 0.6 : 1, whiteSpace: "nowrap", fontFamily: "inherit" } }, replyBusy ? "Envoi..." : "Répondre →")
                      ),
                  menuActionsTicket("haut-" + t.id, [
                    !ferme && { lib: "Répondre et fermer", fn: () => replyAndClose(t), disabled: replyBusy || !peutRepFermer, title: peutRepFermer ? "" : "Écrivez d'abord une réponse" },
                    !ferme && { lib: "Fermer sans notifier", fn: () => closeTicket(t, false), disabled: replyBusy },
                    isAdmin && "sep",
                    isAdmin && { lib: "🔓 Déverrouiller AD", fn: () => ouvrirDeverrouillageAd(t), title: "Déverrouiller (ou diagnostiquer) un compte Windows dans l'Active Directory de l'hôtel, via NinjaOne" },
                    isAdmin && { lib: "🚫 Bloquer l'expéditeur", fn: () => ouvrirBlocage(t), rouge: true, title: "Bloquer l'expéditeur d'un email frauduleux dans Microsoft 365 (Defender)" }
                  ], false)
                );
              })(),
              // Éditeur de remarque interne (admin only) — jamais visible du client
              noteOpenId === t.id && React.createElement('div', { style: { background: "#FFFDF3", border: "1px solid #F0D98A", borderRadius: 8, padding: "12px 14px", marginBottom: 14 } },
                React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
                  React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: "#B7791F" } }, "🔒 Remarque interne"),
                  React.createElement('span', { style: { fontSize: 11, color: "#B7791F99" } }, "Visible uniquement par les administrateurs — jamais envoyée au client.")
                ),
                React.createElement('textarea', { value: noteText, onChange: e => setNoteText(e.target.value), placeholder: "Ex. : mot de passe TeamViewer, contexte du dossier, personne à recontacter…", rows: 4, style: { width: "100%", padding: "9px 11px", border: "1px solid #E4D08A", borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none", background: "white" } }),
                React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 } },
                  React.createElement('button', { onClick: () => setNoteOpenId(null), style: { padding: "7px 13px", background: "none", border: "1px solid #DDD", color: "#666", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
                  React.createElement('button', { onClick: () => enregistrerNote(t), disabled: noteBusy, style: { padding: "7px 15px", background: "#F0B429", border: "none", color: "#3D2E00", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: noteBusy ? 0.6 : 1 } }, noteBusy ? "Enregistrement…" : "Enregistrer la remarque")
                )
              ),
              React.createElement('div', { style: { background: "#F6F6FA", border: "1px solid #E8E8F0", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                React.createElement('span', { style: { fontSize: 12, color: "#555" } }, "👤 Technicien :"),
                React.createElement('select', { value: t.assigned_to || "", onChange: e => assignerTechnicien(t, e.target.value), style: { padding: "5px 9px", border: "1px solid " + (t.assigned_to ? "#BEE3F8" : "#DDD"), borderRadius: 6, fontSize: 12, background: t.assigned_to ? "#EBF8FF" : "white" } },
                  React.createElement('option', { value: "" }, "Non assigné"),
                  techniciensMenu.concat(t.assigned_to && !techniciensMenu.some(x => x.id === t.assigned_to) ? techniciens.filter(x => x.id === t.assigned_to) : []).map(tc => React.createElement('option', { key: tc.id, value: tc.id }, tc.nom))
                ),
                (session && session.user && t.assigned_to !== session.user.id) && React.createElement('button', { onClick: () => assignerTechnicien(t, session.user.id), style: { padding: "4px 9px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 6, fontSize: 11.5, cursor: "pointer" } }, "M'assigner"),
                React.createElement('span', { style: { width: 1, height: 18, background: "#E0E0E8" } }),
                React.createElement('span', { style: { fontSize: 12, color: "#555" } }, "⚡ Priorité :"),
                React.createElement('select', { value: slaDe(t.priority).p, title: "Priorité utilisée pour les SLA du rapport client", onChange: async (e) => { const val = e.target.value; const maj = { priority: val }; if ("classement_auto" in t) maj.classement_auto = null; const { error } = await sb.from("tickets").update(maj).eq("id", t.id); if (!error) setTickets(prev => prev.map(x => x.id === t.id ? { ...x, ...maj } : x)); else alert("Erreur : " + error.message); }, style: { padding: "5px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } },
                  SLA_PRIORITES.map(sp => React.createElement('option', { key: sp.p, value: sp.p }, sp.code + " " + sp.p))
                ),
                t.classement_auto && React.createElement('span', { title: "Classement automatique : " + t.classement_auto + "\nModifiez la priorité pour la corriger.", style: { fontSize: 10.5, fontWeight: 600, color: "#6B46C1", background: "#F3EEFF", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", cursor: "help", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" } }, "🪄 auto · " + t.classement_auto),
                React.createElement('span', { style: { fontSize: 12, color: "#555" } }, "🏷️ Type :"),
                React.createElement('select', { value: t.type_ticket || "", title: "Incident ou demande (rapport client). « Auto » = détection d'après la catégorie et l'objet", onChange: async (e) => { const val = e.target.value || null; const { error } = await sb.from("tickets").update({ type_ticket: val }).eq("id", t.id); if (!error) setTickets(prev => prev.map(x => x.id === t.id ? { ...x, type_ticket: val } : x)); else alert("Erreur : " + error.message + (/type_ticket/i.test(error.message || "") ? "\n\nLe script tickets_type.sql a-t-il été exécuté dans Supabase ?" : "")); }, style: { padding: "5px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } },
                  React.createElement('option', { value: "" }, "Auto (" + (typeTicket({ ...t, type_ticket: null }) === "demande" ? "demande" : "incident") + ")"),
                  React.createElement('option', { value: "incident" }, "Incident"),
                  React.createElement('option', { value: "demande" }, "Demande")
                ),
                React.createElement('span', { style: { width: 1, height: 18, background: "#E0E0E8" } }),
                React.createElement('span', { style: { fontSize: 12, color: "#555" } }, "🔗 Prestataire :"),
                React.createElement('select', { value: t.prestataire || "", onChange: async (e) => { const val = e.target.value || null; const { error } = await sb.from("tickets").update({ prestataire: val }).eq("id", t.id); if (!error) setTickets(prev => prev.map(x => x.id === t.id ? { ...x, prestataire: val } : x)); else alert("Erreur : " + error.message); }, style: { padding: "5px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } },
                  React.createElement('option', { value: "" }, "Aucun"),
                  PRESTATAIRES.map(p => React.createElement('option', { key: p, value: p }, p))
                ),
                React.createElement('span', { style: { width: 1, height: 18, background: "#E0E0E8" } }),
                React.createElement('label', { style: { fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" } },
                  React.createElement('input', { type: "checkbox", checked: !!t.en_attente, onChange: async (e) => { const val = e.target.checked; const { error } = await sb.from("tickets").update({ en_attente: val }).eq("id", t.id); if (!error) setTickets(prev => prev.map(x => x.id === t.id ? { ...x, en_attente: val } : x)); else alert("Erreur : " + error.message); }, style: { width: 15, height: 15, cursor: "pointer" } }),
                  "⏸ En cours"
                ),
                t.en_attente && React.createElement('input', { type: "date", value: t.date_attente || "", onChange: async (e) => { const val = e.target.value || null; const { error } = await sb.from("tickets").update({ date_attente: val }).eq("id", t.id); if (!error) setTickets(prev => prev.map(x => x.id === t.id ? { ...x, date_attente: val } : x)); else alert("Erreur : " + error.message); }, style: { padding: "4px 8px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12 } })
              ),
              isAdmin && estTicketArrivee(t) && renderProvisioning(t),
              creneauTicket && creneauTicket.ticket_id === t.id && creneauTicket.statut === "en_attente" && React.createElement('div', { style: { background: "#FBF7EA", border: "1px solid " + G, borderRadius: 8, padding: "12px 14px", marginBottom: 12 } },
                React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: "#8A6D1F", marginBottom: 8 } }, "📅 Créneau demandé : " + formatJourRdv(creneauTicket.date_rdv) + " · " + creneauTicket.creneau),
                React.createElement('textarea', { value: creneauCommentaire, onChange: e => setCreneauCommentaire(e.target.value), placeholder: "Commentaire (optionnel) — envoyé au demandeur", rows: 2, style: { width: "100%", boxSizing: "border-box", border: "1px solid #E0D6B0", borderRadius: 6, padding: "8px 10px", fontSize: 12.5, marginBottom: 8, resize: "vertical" } }),
                React.createElement('div', { style: { display: "flex", gap: 8 } },
                  React.createElement('button', { onClick: () => statuerCreneauTicket("valide"), disabled: creneauBusy, style: { background: "#1F9D55", border: "none", color: "white", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: creneauBusy ? "default" : "pointer", padding: "9px 16px", opacity: creneauBusy ? 0.6 : 1 } }, "✓ Valider le créneau"),
                  React.createElement('button', { onClick: () => statuerCreneauTicket("refuse"), disabled: creneauBusy, style: { background: "white", border: "1px solid #D66", color: "#B03A2E", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: creneauBusy ? "default" : "pointer", padding: "9px 16px", opacity: creneauBusy ? 0.6 : 1 } }, "✕ Refuser")
                )
              ),
              t.subject && React.createElement('div', { style: { fontSize: 12, color: "#444", marginBottom: 10 } }, React.createElement('strong', null, "Objet : "), t.subject),
              React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 10, lineHeight: 1.7 } },
                React.createElement('div', null, "📧 " + (t.contact_email ? nettoyerEmail(t.contact_email) : "-") + "   📞 " + (t.contact_phone || "-")),
                React.createElement('div', null, "Fonction : " + (t.contact_role || "-")),
                (() => {
                  // Destinataires (To) détectés dans les messages du fil
                  const ms = ticketMsgs[t.id] || [];
                  const set = new Set();
                  ms.forEach(mm => { if (mm.destinataires) String(mm.destinataires).split(/[,;]/).forEach(a => { const adr = a.trim(); if (adr) set.add(adr); }); });
                  const liste = Array.from(set);
                  return liste.length > 0 ? React.createElement('div', { style: { marginTop: 2, color: "#5A7DA0" } }, "📩 À : " + liste.join(", ")) : null;
                })(),
                (() => {
                  // Personnes en copie détectées dans le fil du ticket
                  const ms = ticketMsgs[t.id] || [];
                  const set = new Set();
                  ms.forEach(mm => { if (mm.cc) String(mm.cc).split(/[,;]/).forEach(a => { const adr = a.trim(); if (adr) set.add(adr); }); });
                  const liste = Array.from(set);
                  return liste.length > 0 ? React.createElement('div', { style: { marginTop: 2, color: "#7A6" } }, "👥 En copie : " + liste.join(", ")) : null;
                })()
              ),
              t.status !== "closed" && React.createElement('div', null,
                React.createElement('div', { style: { marginBottom: 8 } },
                  React.createElement(RichEditor, {
                    key: "reply-" + t.id,
                    value: isOpen ? replyHtml : "",
                    onChange: html => { setReplyHtml(html); const tmp = document.createElement("div"); tmp.innerHTML = html; setReplyText((tmp.innerText || tmp.textContent || "").replace(/ /g, " ")); if (replyHtmlOverride) setReplyHtmlOverride(null); },
                    onUploadImage: async (file) => await uploadToStorage(file, "tickets"),
                    placeholder: "Votre réponse au client… (collez ou insérez une image où vous voulez, elle s'insère à l'endroit du curseur)"
                  })
                ),
                // ---- Personnes en copie (Cc) : cases à cocher + ajout manuel ----
                (() => {
                  const contactPrincipal = t.contact_email ? nettoyerEmail(t.contact_email) : "";
                  // Adresses candidates = celles cochées + celles détectées dans le fil,
                  // pour toujours afficher une case même si l'utilisateur en a décoché.
                  const detectees = extraireCcDuFil(ticketMsgs[t.id] || [], t);
                  const toutes = Array.from(new Set([...(replyCcList || []), ...detectees]));
                  const toggleCc = (adr) => setReplyCcList(prev => prev.includes(adr) ? prev.filter(x => x !== adr) : [...prev, adr]);
                  const ajouterManuel = () => {
                    const adr = (replyCcManual || "").trim().toLowerCase();
                    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adr)) { setReplyNote("Erreur : adresse Cc invalide."); return; }
                    if (adr === (contactPrincipal || "").toLowerCase()) { setReplyNote("Erreur : cette adresse est déjà le destinataire principal."); return; }
                    setReplyCcList(prev => prev.includes(adr) ? prev : [...prev, adr]);
                    setReplyCcManual("");
                  };
                  return React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", background: "white", border: "1px solid #E2E4EE", borderRadius: "10px 10px 0 0", padding: "9px 12px" } },
                    React.createElement('span', { title: "Personnes en copie", style: { fontSize: 12, fontWeight: 600, color: "#6B6B80", marginRight: 2 } }, "Cc"),
                    toutes.length > 0 && React.createElement(React.Fragment, null,
                      toutes.map(adr => {
                        const coche = (replyCcList || []).includes(adr);
                        return React.createElement('label', { key: adr, style: { display: "inline-flex", alignItems: "center", gap: 6, background: coche ? "#F7F1DE" : "white", border: "1px solid " + (coche ? "#E8D89A" : "#E2E2E8"), borderRadius: 14, padding: "3px 10px", fontSize: 12, color: coche ? "#333" : "#999", cursor: "pointer" } },
                          React.createElement('input', { type: "checkbox", checked: coche, onChange: () => toggleCc(adr), style: { cursor: "pointer", margin: 0 } }),
                          adr
                        );
                      })
                    ),
                    React.createElement('div', { style: { display: "flex", gap: 6, flex: "1 1 260px" } },
                      React.createElement('input', { value: replyCcManual, onChange: e => setReplyCcManual(e.target.value), onKeyDown: e => { if (e.key === "Enter") { e.preventDefault(); ajouterManuel(); } }, placeholder: toutes.length ? "+ ajouter une adresse (Entrée)" : "Aucune copie — ajouter une adresse (Entrée)", type: "email", list: "dsi-cc-suggestions", autoComplete: "off", style: { flex: 1, minWidth: 180, padding: "6px 10px", border: "1px solid #DDE0EA", borderRadius: 7, fontSize: 12.5, boxSizing: "border-box", fontFamily: "inherit" } }),
                      React.createElement('datalist', { id: "dsi-cc-suggestions" },
                        adressesConnues().map(a => React.createElement('option', { key: a, value: a }))
                      ),
                      React.createElement('button', { type: "button", onClick: ajouterManuel, style: { padding: "0 12px", background: SB, border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" } }, "+ Ajouter")
                    )
                  );
                })(),
                replyFiles.length > 0 && React.createElement('div', { style: { background: "white", borderLeft: "1px solid #E2E4EE", borderRight: "1px solid #E2E4EE", borderTop: "1px solid #EEF0F5", padding: "8px 12px" } },
                  React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
                    replyFiles.map((f, i) => React.createElement('div', { key: i, style: { display: "flex", alignItems: "center", gap: 7, background: "#F6F7FB", border: "1px solid #E2E4EE", borderRadius: 8, padding: "4px 9px", fontSize: 12, maxWidth: 360 } },
                      React.createElement('span', null, "📎"),
                      React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.name),
                      React.createElement('span', { style: { color: "#AAA" } }, f.size ? Math.round(f.size / 1024) + " Ko" : ""),
                      React.createElement('button', { onClick: () => setReplyFiles(prev => prev.filter((_, idx) => idx !== i)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 12 } }, "✕")
                    ))
                  )
                ),
                replyNote && React.createElement('div', { style: { fontSize: 11, color: replyNote.startsWith("Erreur") ? "#C53030" : "#2F855A", marginBottom: 8 } }, replyNote),
                replyImageUrls.length > 0 && React.createElement('div', { style: { marginBottom: 8 } },
                  React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 6 } }, "🖼 Images intégrées au message (dans le corps, pas en pièce jointe) :"),
                  React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
                    replyImageUrls.map((u, k) => React.createElement('div', { key: k, style: { position: "relative" } },
                      React.createElement('img', { src: u, alt: "image " + (k + 1), title: "image " + (k + 1), onClick: () => openViewer(replyImageUrls.map(x => ({ file_url: x, file_name: "image" })), k), style: { width: 74, height: 74, objectFit: "cover", borderRadius: 7, border: "1px solid #E2E2E8", cursor: "zoom-in" } }),
                      React.createElement('button', { onClick: () => setReplyImageUrls(prev => prev.filter(x => x !== u)), title: "Retirer", style: { position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%", background: "#E53E3E", border: "2px solid white", color: "white", cursor: "pointer", fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 } }, "✕")
                    ))
                  )
                ),
                // Barre du bas (option B) : réponse type, pièces jointes, envoi ; actions secondaires dans « … »
                (() => {
                  const peutRepFermer = isOpen && (replyText.trim() || /<img/i.test(replyHtml));
                  const bt = (lib, onClick, extra) => React.createElement('button', { type: "button", onClick, disabled: extra && extra.disabled, title: (extra && extra.title) || "",
                    style: { padding: "0 12px", height: 32, background: (extra && extra.bg) || "white", border: "1px solid " + ((extra && extra.bord) || "#DDE0EA"), color: (extra && extra.col) || "#444", borderRadius: 8, fontSize: 12.5, cursor: (extra && extra.disabled) ? "default" : "pointer", fontWeight: (extra && extra.gras) ? 600 : 400, whiteSpace: "nowrap", fontFamily: "inherit", opacity: (extra && extra.disabled) ? 0.5 : 1 } }, lib);
                  return React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#FAFBFD", border: "1px solid #E2E4EE", borderTop: "1px solid #EEF0F5", borderRadius: "0 0 10px 10px", padding: "10px 12px" } },
                    React.createElement('select', {
                      value: "",
                      onChange: e => { if (e.target.value) { applyReponseType(e.target.value); e.target.value = ""; } },
                      disabled: reponsesTypes.length === 0,
                      title: reponsesTypes.length === 0 ? "Aucune réponse type — créez-en dans l'onglet Réponses types" : "Insérer une réponse type",
                      style: { padding: "0 10px", height: 32, border: "1px solid #DDE0EA", borderRadius: 8, fontSize: 12.5, color: "#444", background: "white", cursor: reponsesTypes.length === 0 ? "default" : "pointer", maxWidth: 230, fontFamily: "inherit" }
                    },
                      React.createElement('option', { value: "" }, reponsesTypes.length === 0 ? "Réponses types (vide)" : "💬 Insérer une réponse type…"),
                      reponsesTypes.map(r => React.createElement('option', { key: r.id, value: r.id }, r.titre))
                    ),
                    React.createElement('label', { title: "Joindre des fichiers à la réponse", style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "0 12px", height: 32, background: "white", border: "1px solid #DDE0EA", color: "#444", borderRadius: 8, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap", boxSizing: "border-box" } },
                      "📎 Joindre des fichiers" + (replyFiles.length ? " (" + replyFiles.length + ")" : ""),
                      React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp", onChange: e => { setReplyFiles(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = ""; }, style: { display: "none" } })
                    ),
                    React.createElement('span', { style: { flex: 1 } }),
                    bt("✅ Fermer + notifier", () => closeTicket(t, true), { disabled: replyBusy, bg: "#F0FFF4", bord: "#9AE6B4", col: "#276749", gras: true }),
                    bt("Répondre et fermer", () => replyAndClose(t), { disabled: replyBusy || !peutRepFermer, title: peutRepFermer ? "" : "Écrivez d'abord une réponse", bord: G + "88", col: G2, gras: true }),
                    React.createElement('button', { type: "button", onClick: () => sendReply(t), disabled: replyBusy, style: { padding: "0 18px", height: 32, background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: replyBusy ? 0.6 : 1, whiteSpace: "nowrap", fontFamily: "inherit" } }, replyBusy ? "Envoi..." : "Répondre →"),
                    menuActionsTicket("bas-" + t.id, [
                      { lib: noteSaved[t.id] ? "📝 Remarque •" : "📝 Remarque", fn: () => ouvrirNote(t), title: "Note interne visible uniquement par les administrateurs" },
                      isAdmin && { lib: "✨ Agent", fn: () => ouvrirAgent(t) },
                      { lib: "Fermer sans notifier", fn: () => closeTicket(t, false), disabled: replyBusy },
                      isAdmin && "sep",
                      isAdmin && { lib: "🔓 Déverrouiller AD", fn: () => ouvrirDeverrouillageAd(t) },
                      isAdmin && { lib: "🚫 Bloquer l'expéditeur", fn: () => ouvrirBlocage(t), rouge: true }
                    ], true)
                  );
                })(),
                // Éditeur de remarque interne (admin only) — vue cartes, ticket ouvert
                noteOpenId === t.id && React.createElement('div', { style: { background: "#FFFDF3", border: "1px solid #F0D98A", borderRadius: 8, padding: "12px 14px", marginTop: 12 } },
                  React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
                    React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: "#B7791F" } }, "🔒 Remarque interne"),
                    React.createElement('span', { style: { fontSize: 11, color: "#B7791F99" } }, "Visible uniquement par les administrateurs — jamais envoyée au client.")
                  ),
                  React.createElement('textarea', { value: noteText, onChange: e => setNoteText(e.target.value), placeholder: "Ex. : mot de passe TeamViewer, contexte du dossier, personne à recontacter…", rows: 4, style: { width: "100%", padding: "9px 11px", border: "1px solid #E4D08A", borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none", background: "white" } }),
                  React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 } },
                    React.createElement('button', { onClick: () => setNoteOpenId(null), style: { padding: "7px 13px", background: "none", border: "1px solid #DDD", color: "#666", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
                    React.createElement('button', { onClick: () => enregistrerNote(t), disabled: noteBusy, style: { padding: "7px 15px", background: "#F0B429", border: "none", color: "#3D2E00", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: noteBusy ? 0.6 : 1 } }, noteBusy ? "Enregistrement…" : "Enregistrer la remarque")
                  )
                )
              ),
              msgsSansDoublon(msgs, t).length > 0 && React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 } },
                msgsSansDoublon(msgs, t).slice().reverse().map(m => React.createElement('div', { key: m.id, style: { alignSelf: m.sender_role === "admin" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.sender_role === "admin" ? G + "22" : "#EAF2FB", border: `1px solid ${m.sender_role === "admin" ? G + "44" : "#B6D4F0"}`, borderRadius: 8, padding: "8px 12px" } },
                  React.createElement('div', { style: { fontSize: 10, fontWeight: 600, color: m.sender_role === "admin" ? G2 : "#666", marginBottom: 3 } }, (m.sender_name || (m.sender_role === "admin" ? "Support" : "Client")) + " · " + new Date(m.created_at).toLocaleString("fr-FR")),
                  m.destinataires && React.createElement('div', { style: { fontSize: 10, color: "#999", marginBottom: 3 } }, "À : " + m.destinataires),
                  m.cc && React.createElement('div', { style: { fontSize: 10, color: "#999", marginBottom: 3 } }, "Cc : " + m.cc),
                  m.body_html ? React.createElement(RichHtml, { html: m.body_html, style: { fontSize: 13, color: "#333", lineHeight: 1.6 } }) : React.createElement('div', { style: { fontSize: 13, color: "#333", whiteSpace: "pre-wrap" } }, nettoyerSignature(m.body)),
                  React.createElement(FileList, { files: (ticketFiles[t.id] || []).filter(f => f.message_id === m.id && !(m.body_html && m.body_html.includes(f.file_url))), onOpenImage: openViewer }),
                  m.sender_role === "admin" && !/^(Sauvegarde relancée|Alerte mise en silence|📞 Appel reçu)/.test(String(m.body || "")) && React.createElement(SignatureBlock, { key: "sig" })
                ))
              ),
              React.createElement('div', { style: (t.source === "checkcentral" || t.source === "sophos")
                  ? { background: "#FFF5F5", border: "2px solid #E53E3E", borderRadius: 8, padding: 12, fontSize: 13, color: "#333", marginBottom: 12 }
                  : { background: "#EAF2FB", border: "1px solid #B6D4F0", borderRadius: 8, padding: 12, fontSize: 13, color: "#333", marginBottom: 12, whiteSpace: "pre-wrap" } },
                React.createElement('div', { style: { fontSize: 10, fontWeight: 600, color: (t.source === "checkcentral" || t.source === "sophos") ? "#C53030" : "#5A7DA0", marginBottom: 5 } }, t.source === "checkcentral" ? "ALERTE AUTOMATIQUE — SAUVEGARDE" : t.source === "sophos" ? "ALERTE AUTOMATIQUE — SOPHOS" : "DEMANDE INITIALE"),
                (() => {
                  // Le "À :" / "Cc :" de la demande initiale vient du 1er message du fil
                  // (retiré de l'affichage du fil pour éviter le doublon, mais il porte
                  // les destinataires stockés par le worker email).
                  const prem = (ticketMsgs[t.id] || [])[0];
                  if (!prem) return null;
                  return React.createElement(React.Fragment, null,
                    prem.destinataires && React.createElement('div', { style: { fontSize: 10, color: "#5A7DA0", marginBottom: 2, whiteSpace: "normal" } }, "À : " + prem.destinataires),
                    prem.cc && React.createElement('div', { style: { fontSize: 10, color: "#5A7DA0", marginBottom: 5, whiteSpace: "normal" } }, "Cc : " + prem.cc)
                  );
                })(),
                // Alerte sauvegarde / Sophos : le détail mis en forme (bandeau rouge) est dans le 1er message du fil
                ((t.source === "checkcentral" || t.source === "sophos") && (ticketMsgs[t.id] || [])[0] && (ticketMsgs[t.id] || [])[0].body_html)
                  ? React.createElement(RichHtml, { html: (ticketMsgs[t.id] || [])[0].body_html, style: { fontSize: 13, color: "#333", lineHeight: 1.6 } })
                  : nettoyerSignature(t.message),
                // Bouton « Sauvegarde relancée » (alertes sauvegarde, ticket ouvert)
                t.source === "checkcentral" && (() => {
                  const relances = (ticketMsgs[t.id] || []).filter(m => m.sender_role === "admin" && /^Sauvegarde relancée/.test(String(m.body || "")));
                  const derniere = relances[relances.length - 1];
                  const silence = (ticketMsgs[t.id] || []).filter(m => m.sender_role === "admin" && /^Alerte mise en silence/.test(String(m.body || ""))).pop();
                  return React.createElement('div', { style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" } },
                    silence && React.createElement('span', { style: { fontSize: 11.5, color: "#4A5568", fontWeight: 600, marginRight: "auto" } }, "🔕 " + silence.body),
                    t.status !== "closed" && React.createElement('button', { onClick: () => silencerAlerteBackup(t), disabled: silenceBusy === t.id, title: "Pas de nouveau ticket ni de relance pendant 3 semaines (ex. sauvegarde mensuelle). Reprise automatique ensuite.",
                      style: { padding: "9px 16px", background: "white", border: "1px solid #4A5568", color: "#4A5568", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: silenceBusy === t.id ? 0.6 : 1 } },
                      silenceBusy === t.id ? "Mise en silence…" : "🔕 Silence 3 semaines"),
                    t.status !== "closed" && React.createElement('select', { value: "", disabled: freqBusy === t.id, title: "Cette sauvegarde ne tourne pas tous les jours : plus d'alerte entre deux passages (un vrai échec continue d'alerter). Ferme les tickets d'alerte de cette sauvegarde.",
                      onChange: e => { const h = parseInt(e.target.value, 10); if (h) frequenceDepuisTicket(t, h); },
                      style: { padding: "9px 10px", background: "white", border: "1px solid #2B6CB0", color: "#2B6CB0", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: freqBusy === t.id ? 0.6 : 1 } },
                      React.createElement('option', { value: "" }, freqBusy === t.id ? "Enregistrement…" : "📅 Pas quotidienne…"),
                      BK_FREQS.filter(f => f.h > 24).map(f => React.createElement('option', { key: f.h, value: String(f.h) }, "Sauvegarde " + f.l.toLowerCase()))),
                    derniere && React.createElement('span', { style: { fontSize: 11.5, color: "#2B6CB0", fontWeight: 600 } },
                      "🔄 Relancée " + (relances.length > 1 ? relances.length + " fois — dernière : " : "") + new Date(derniere.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + (derniere.sender_name ? " par " + derniere.sender_name : "")),
                    t.status !== "closed" && React.createElement('button', { onClick: () => marquerBackupRelance(t), disabled: relanceBusy === t.id,
                      style: { padding: "9px 16px", background: "#2B6CB0", border: "none", color: "white", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: relanceBusy === t.id ? 0.6 : 1 } },
                      relanceBusy === t.id ? "Enregistrement…" : (derniere ? "🔄 Relancée à nouveau" : "🔄 J'ai relancé la sauvegarde"))
                  );
                })()
              ),
              React.createElement(FileList, { files: (ticketFiles[t.id] || []).filter(f => !f.message_id), title: "📎 PIÈCES JOINTES DE LA DEMANDE", onOpenImage: openViewer }),
              t.status === "closed" && React.createElement('div', { style: { display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", flexWrap: "wrap" } },
                React.createElement('button', { onClick: () => ouvrirNote(t), title: "Note interne visible uniquement par les administrateurs", style: { marginRight: "auto", padding: "8px 14px", background: noteOpenId === t.id ? "#FEF3C7" : "none", border: "1px solid " + (noteSaved[t.id] ? "#F0B429" : "#DDD"), color: noteSaved[t.id] ? "#B7791F" : "#666", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 500 } }, (noteSaved[t.id] ? "📝 Remarque •" : "📝 Remarque")),
                isAdmin && React.createElement('button', { onClick: () => ouvrirBlocage(t), title: "Bloquer l'expéditeur d'un email frauduleux dans Microsoft 365 (Defender)", style: { padding: "8px 14px", background: "none", border: "1px solid #F3B8B4", color: "#B3261E", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 500 } }, "🚫 Bloquer expéditeur"),
                isAdmin && React.createElement('button', { onClick: () => ouvrirDeverrouillageAd(t), title: "Déverrouiller (ou diagnostiquer) un compte Windows dans l'Active Directory de l'hôtel, via NinjaOne", style: { padding: "7px 13px", background: "none", border: "1px solid #B7D3F0", color: "#2B6CB0", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 500 } }, "🔓 Déverrouiller AD"),
                isAdmin && React.createElement('button', { onClick: () => ouvrirAgent(t), title: "L'agent Claude lit le ticket, vérifie l'état du PC dans NinjaOne et propose une réponse (rien n'est envoyé sans vous)", style: { padding: "7px 13px", background: "none", border: "1px solid #D6BCFA", color: "#6B46C1", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 500 } }, "✨ Agent"),
                React.createElement('button', { onClick: () => setTicketStatus(t, "open"), style: { padding: "8px 14px", background: "none", border: `1px solid ${G}55`, color: G2, borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Rouvrir le ticket")
              ),
              // Éditeur de remarque interne (admin only) — vue cartes, ticket fermé
              t.status === "closed" && noteOpenId === t.id && React.createElement('div', { style: { background: "#FFFDF3", border: "1px solid #F0D98A", borderRadius: 8, padding: "12px 14px", marginTop: 12 } },
                React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
                  React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: "#B7791F" } }, "🔒 Remarque interne"),
                  React.createElement('span', { style: { fontSize: 11, color: "#B7791F99" } }, "Visible uniquement par les administrateurs — jamais envoyée au client.")
                ),
                React.createElement('textarea', { value: noteText, onChange: e => setNoteText(e.target.value), placeholder: "Ex. : mot de passe TeamViewer, contexte du dossier, personne à recontacter…", rows: 4, style: { width: "100%", padding: "9px 11px", border: "1px solid #E4D08A", borderRadius: 7, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none", background: "white" } }),
                React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 } },
                  React.createElement('button', { onClick: () => setNoteOpenId(null), style: { padding: "7px 13px", background: "none", border: "1px solid #DDD", color: "#666", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
                  React.createElement('button', { onClick: () => enregistrerNote(t), disabled: noteBusy, style: { padding: "7px 15px", background: "#F0B429", border: "none", color: "#3D2E00", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: noteBusy ? 0.6 : 1 } }, noteBusy ? "Enregistrement…" : "Enregistrer la remarque")
                )
              )
            )
          );
        })
      ),
      telModal && (() => {
        const f = telModal;
        const setF = (patch) => setTelModal(prev => ({ ...prev, ...patch, err: "" }));
        const inp = { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
        const lbl = { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", margin: "10px 0 4px" };
        // Contacts déjà connus pour cet hôtel (tickets précédents) : remplissage automatique
        const contacts = {};
        tickets.filter(t => f.hotel_id && t.hotel_id === f.hotel_id && t.contact_name && !estAlerteAuto(t)).forEach(t => {
          const k = t.contact_name.trim();
          if (!contacts[k]) contacts[k] = t;
        });
        const choisirContact = (nom) => {
          const c = contacts[nom.trim()];
          if (c) setF({ contact_name: nom, contact_email: f.contact_email || (c.contact_email ? nettoyerEmail(c.contact_email) : ""), contact_phone: f.contact_phone || c.contact_phone || "", contact_role: ROLES_CONTACT.includes(c.contact_role) ? c.contact_role : f.contact_role });
          else setF({ contact_name: nom });
        };
        return React.createElement('div', { onClick: e => { if (e.target === e.currentTarget && !f.busy) setTelModal(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? 12 : "40px 20px", zIndex: 1000, overflowY: "auto" } },
          React.createElement('div', { style: { background: "white", borderRadius: 12, padding: isMobile ? 18 : 24, width: "100%", maxWidth: 620, boxShadow: "0 12px 40px rgba(0,0,0,.25)", marginBottom: 30 } },
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: "#1a1a3e" } }, "📞 Nouveau ticket téléphone"),
            React.createElement('div', { style: { fontSize: 12, color: "#888", margin: "3px 0 6px" } }, "Enregistrez l'appel reçu : il sera comptabilisé comme un ticket (canal Téléphone) et assigné à vous."),
            React.createElement('label', { style: lbl }, "Établissement *"),
            React.createElement('select', { value: f.hotel_id, onChange: e => setF({ hotel_id: e.target.value }), autoFocus: true, style: inp },
              React.createElement('option', { value: "" }, "— Choisir l'hôtel qui appelle —"),
              hotels.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "fr")).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
            React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 } },
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, "Nom de l'appelant *"),
                React.createElement('input', { value: f.contact_name, onChange: e => choisirContact(e.target.value), list: "tel-contacts", placeholder: "Prénom Nom", style: inp }),
                React.createElement('datalist', { id: "tel-contacts" }, Object.keys(contacts).sort().map(n => React.createElement('option', { key: n, value: n })))),
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, "Service"),
                React.createElement('select', { value: f.contact_role, onChange: e => setF({ contact_role: e.target.value }), style: inp }, ROLES_CONTACT.map(r => React.createElement('option', { key: r, value: r }, r)))),
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, "Téléphone"),
                React.createElement('input', { value: f.contact_phone, onChange: e => setF({ contact_phone: e.target.value }), placeholder: "+33 …", style: inp })),
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, "Email"),
                React.createElement('input', { type: "email", value: f.contact_email, onChange: e => setF({ contact_email: e.target.value }), placeholder: "contact@hotel.com", style: inp })),
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, "Catégorie"),
                React.createElement('select', { value: f.category, onChange: e => setF({ category: e.target.value }), style: inp }, CATS.map(c => React.createElement('option', { key: c, value: c }, c)))),
              React.createElement('div', null,
                React.createElement('label', { style: lbl }, "Priorité"),
                React.createElement('select', { value: f.priority, onChange: e => setF({ priority: e.target.value }), style: inp }, SLA_PRIORITES.map(sp => React.createElement('option', { key: sp.p, value: sp.p }, sp.code + " " + sp.p))))
            ),
            React.createElement('label', { style: lbl }, "Objet"),
            React.createElement('input', { value: f.subject, onChange: e => setF({ subject: e.target.value }), placeholder: "Ex. : Imprimante réception hors ligne (par défaut : la catégorie)", style: inp }),
            React.createElement('label', { style: lbl }, "Demande de l'appelant *"),
            React.createElement('textarea', { value: f.message, onChange: e => setF({ message: e.target.value }), rows: 4, placeholder: "Ce que la personne a décrit : poste, message d'erreur, depuis quand…", style: { ...inp, resize: "vertical" } }),
            React.createElement('div', { style: { display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginTop: 4 } },
              React.createElement('div', { style: { width: 140 } },
                React.createElement('label', { style: lbl }, "Durée de l'appel (min)"),
                React.createElement('input', { type: "number", min: 0, value: f.duree, onChange: e => setF({ duree: e.target.value }), placeholder: "ex. 10", style: inp })),
              React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#2F855A", fontWeight: 600, cursor: "pointer", paddingBottom: 9 } },
                React.createElement('input', { type: "checkbox", checked: f.resolu, onChange: e => setF({ resolu: e.target.checked }) }), "✅ Résolu pendant l'appel (ticket fermé directement)")
            ),
            f.resolu && React.createElement('div', null,
              React.createElement('label', { style: lbl }, "Solution apportée *"),
              React.createElement('textarea', { value: f.solution, onChange: e => setF({ solution: e.target.value }), rows: 3, placeholder: "Ce qui a été fait pendant l'appel", style: { ...inp, resize: "vertical", borderColor: "#B7E0C6" } })),
            React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#555", cursor: "pointer", marginTop: 12 } },
              React.createElement('input', { type: "checkbox", checked: f.recap, onChange: e => setF({ recap: e.target.checked }) }), "✉️ Envoyer un récapitulatif par email à l'appelant (avec la référence du ticket)"),
            f.err && React.createElement('div', { style: { fontSize: 12.5, color: "#C53030", background: "#FDECEC", borderRadius: 7, padding: "8px 10px", marginTop: 12 } }, f.err),
            React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 } },
              React.createElement('button', { onClick: () => setTelModal(null), disabled: f.busy, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
              React.createElement('button', { onClick: creerTicketTelephone, disabled: f.busy, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: f.busy ? "default" : "pointer", opacity: f.busy ? 0.6 : 1 } }, f.busy ? "Création…" : (f.resolu ? "Créer et fermer le ticket" : "Créer le ticket"))
            )
          )
        );
      })()
    );
  return content;
}
