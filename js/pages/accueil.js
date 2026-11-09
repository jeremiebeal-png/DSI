// ===== Page « accueil » — condition dans App : page === "accueil" =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_accueil({...}) de app.js.
function Page_accueil(ctx) {
  let content = ctx.content;
  const {
    bkAncienChecks, bkGroupes, bkStats, go, hotels, isAdmin, isMobile, isSupervisor, msAlertes, msTenants,
    myHotelId, procedures, profile, rappelsDus, soAlertes, soComptes, soDedoublonner, ticketState, tickets
  } = ctx;
    const prenom = (() => {
      const n = (profile && profile.full_name ? String(profile.full_name).trim() : "");
      if (n) return n.split(/\s+/)[0];
      const mail = (profile && profile.email ? String(profile.email).trim() : "");
      return mail ? mail.split("@")[0] : "";
    })();
    const goTo = (p) => go(p);
    const SLA_MS_ACC = 4 * 60 * 60 * 1000;

    if (isAdmin) {
      // ---- Proposition 2 : accueil orienté action ----
      const ouverts = (tickets || []).filter(t => t.status !== "closed");
      const enRetard = ouverts.filter(t => {
        const st = ticketState[t.id];
        return st && st.kind && st.since && (Date.now() - new Date(st.since).getTime() > SLA_MS_ACC);
      });
      const nonAssignes = ouverts.filter(t => !t.hotel_id);
      const bkEchec = bkStats ? bkStats.echec : 0;
      const bkMuets = (bkAncienChecks || []).filter(c => !c.justifie).length;

      const alerte = (couleur, bg, bord, icone, titre, sousTitre, page) =>
        React.createElement('div', { onClick: () => goTo(page), style: { flex: "1 1 260px", cursor: "pointer", background: bg, border: "1px solid " + bord, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, transition: "transform .1s" } },
          React.createElement('span', { style: { fontSize: 26, flexShrink: 0 } }, icone),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontSize: 22, fontWeight: 800, color: couleur, lineHeight: 1.1 } }, titre),
            React.createElement('div', { style: { fontSize: 12.5, color: "#666", marginTop: 3 } }, sousTitre)
          ),
          React.createElement('span', { style: { fontSize: 16, color: couleur } }, "→")
        );

      const miniChiffre = (val, lbl, coul) => React.createElement('div', { style: { flex: "1 1 120px", background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 15px" } },
        React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 4 } }, lbl),
        React.createElement('div', { style: { fontSize: 21, fontWeight: 700, color: coul } }, String(val))
      );

      const raccourci = (icone, lbl, page) => React.createElement('button', { onClick: () => goTo(page), style: { flex: "1 1 150px", display: "flex", alignItems: "center", gap: 10, background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "13px 15px", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", textAlign: "left" } },
        React.createElement('span', { style: { fontSize: 20 } }, icone),
        React.createElement('span', null, lbl)
      );

      // ---- Tableau de bord par domaine (Support / Sauvegardes / Sécurité Sophos / Microsoft 365 & échéances) ----
      const nomHotelAcc = (id) => { if (!id) return "Non assigné"; const h = (hotels || []).find(x => String(x.id) === String(id)); return h ? h.name : "—"; };
      const ageAcc = (iso) => {
        if (!iso) return "";
        const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
        return h >= 48 ? Math.floor(h / 24) + " j" : h + " h";
      };
      const pluriel = (n, s) => n + " " + s + (n > 1 ? "s" : "");

      // Rappels de fiches (Care Pack, contrats, licences…) échus ou proches.
      const auj0 = new Date(); auj0.setHours(0, 0, 0, 0);
      const rappelsEchus = (rappelsDus || []).filter(r => new Date(r.rappel_date + "T00:00:00").getTime() <= auj0.getTime());
      const rappelsProches = (rappelsDus || []).filter(r => new Date(r.rappel_date + "T00:00:00").getTime() > auj0.getTime());

      // Sophos : alertes hautes de SÉCURITÉ uniquement (les licences expirées ne comptent pas)
      const soActifs = new Set((soComptes || []).filter(c => c.actif).map(c => c.hotel_id));
      const soHautesListe = soDedoublonner(soAlertes).filter(a => a.statut === "ouverte" && a.severity === "high" && soActifs.has(a.hotel_id)
        && !(a.licence === true || /licen[cs]e|subscription|abonnement|\bexpir/i.test([a.type, a.description, a.category].filter(Boolean).join(" "))));
      const soHautes = soHautesListe.length;
      const soComptesKo = (soComptes || []).filter(c => c.actif && (c.nb_postes_ko || 0) > 0).sort((a, b) => (b.nb_postes_ko || 0) - (a.nb_postes_ko || 0));
      const soKo = soComptesKo.reduce((n, c) => n + (c.nb_postes_ko || 0), 0);
      const soComptesErr = (soComptes || []).filter(c => c.actif && c.dernier_statut === "erreur");
      const soErrs = soComptesErr.length;

      // Microsoft 365 : alertes hautes ouvertes non prises en charge, tenants en erreur
      const msActifsAcc = new Set((msTenants || []).filter(t => t.actif).map(t => t.tenant_id));
      const msHautesAcc = (msAlertes || []).filter(a => a.statut !== "resolved" && a.severite === "high" && !a.vu_par && msActifsAcc.has(a.tenant_id)).length;
      const msTenantsErr = (msTenants || []).filter(t => t.actif && t.derniere_erreur && !/^Plus de/.test(t.derniere_erreur));
      const msErrsAcc = msTenantsErr.length;

      // Sauvegardes : sites en échec, du plus touché au moins touché
      const bkSitesEchec = (bkGroupes || []).filter(g => g.pireRank === 0).sort((a, b) => b.nbEchec - a.nbEchec);
      const nomSiteBk = (g) => g.hotel_id ? nomHotelAcc(g.hotel_id) : g.group;

      // Tickets en retard, les plus anciens d'abord
      const sinceAcc = (t) => { const st = ticketState[t.id]; return st && st.since ? new Date(st.since).getTime() : Date.now(); };
      const retardTries = enRetard.slice().sort((a, b) => sinceAcc(a) - sinceAcc(b));

      // Niveau d'un panneau : 2 = critique, 1 = attention, 0 = OK
      const NIV = [
        { l: "OK", fg: "#2F855A", bg: "#E9F6EE", bord: "#38A169" },
        { l: "Attention", fg: "#975A16", bg: "#FFFBEB", bord: "#D69E2E" },
        { l: "Critique", fg: "#C53030", bg: "#FDECEC", bord: "#E53E3E" }
      ];
      const chiffre = (v, lbl, niv) => React.createElement('div', { key: lbl, style: { minWidth: 90 } },
        React.createElement('div', { style: { fontSize: 26, fontWeight: 800, lineHeight: 1.1, color: v > 0 ? (niv === 2 ? "#C53030" : niv === 1 ? "#975A16" : "#0F0F24") : "#2F855A" } }, String(v)),
        React.createElement('div', { style: { fontSize: 11.5, color: "#777", marginTop: 3 } }, lbl)
      );
      const ligne = (k, gauche, droite, page) => React.createElement('button', { key: k, onClick: () => goTo(page), style: { display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 2 : 10, width: "100%", padding: "9px 2px", background: "none", border: "none", borderBottom: "1px solid #F0F0F5", cursor: "pointer", fontSize: 12.5, color: "#1a1a3e", textAlign: "left", fontFamily: "inherit" } },
        React.createElement('span', { style: { minWidth: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, gauche),
        React.createElement('span', { style: isMobile ? { color: "#888", fontSize: 11.5, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : { color: "#888", whiteSpace: "nowrap", flexShrink: 0 } }, droite)
      );
      const panneau = (titre, icone, niv, chiffres, lignes, vide, lien, page) => React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderTop: "4px solid " + NIV[niv].bord, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 } },
        React.createElement('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 } },
          React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#1a1a3e" } },
            React.createElement('span', { style: { fontSize: 18 } }, icone), titre),
          React.createElement('span', { style: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: NIV[niv].bg, color: NIV[niv].fg, whiteSpace: "nowrap" } }, (niv === 0 ? "✓ " : "! ") + NIV[niv].l)
        ),
        React.createElement('div', { style: { display: "flex", gap: 22, flexWrap: "wrap" } }, chiffres),
        React.createElement('div', { style: { borderTop: "1px solid #F0F0F5", flex: 1 } },
          lignes.length > 0 ? lignes : React.createElement('div', { style: { fontSize: 12.5, color: "#2F855A", padding: "10px 2px" } }, "✓ " + vide)
        ),
        React.createElement('button', { onClick: () => goTo(page), style: { alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: G2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } }, lien + " →")
      );

      const nivSupport = enRetard.length > 0 ? 2 : (nonAssignes.length > 0 ? 1 : 0);
      const nivBackup = bkEchec > 0 ? 2 : ((bkStats && bkStats.warn > 0) || bkMuets > 0 ? 1 : 0);
      const nivSophos = (soHautes > 0 || soKo > 0) ? 2 : (soErrs > 0 ? 1 : 0);
      const nivMs = (msHautesAcc > 0 || rappelsEchus.length > 0) ? 2 : ((msErrsAcc > 0 || rappelsProches.length > 0) ? 1 : 0);
      const nbDomainesAlerte = [nivSupport, nivBackup, nivSophos, nivMs].filter(n => n > 0).length;

      const lignesSupport = [
        ...retardTries.slice(0, 3).map(t => ligne("r" + t.id, (t.reference ? t.reference + " · " : "") + (t.subject || "(sans objet)"), nomHotelAcc(t.hotel_id) + " · " + ageAcc(ticketState[t.id] && ticketState[t.id].since), "tickets-admin")),
        ...(nonAssignes.length > 0 ? [ligne("na", pluriel(nonAssignes.length, "ticket") + " à rattacher à un établissement", "Non assigné", "tickets-admin")] : [])
      ];
      const lignesBackup = [
        ...bkSitesEchec.slice(0, 3).map(g => ligne("b" + g.key, nomSiteBk(g), pluriel(g.nbEchec, "échec"), "backups")),
        ...(bkMuets > 0 ? [ligne("muets", pluriel(bkMuets, "backup") + " sans exécution depuis 7 jours", "Muet", "backups")] : [])
      ];
      const lignesSophos = [
        ...soHautesListe.slice(0, 2).map(a => ligne("sa" + a.id, a.description || a.type || "Menace détectée", nomHotelAcc(a.hotel_id) + (a.poste ? " · " + a.poste : ""), "sophos")),
        ...soComptesKo.slice(0, 2).map(c => ligne("sk" + (c.id || c.hotel_id), nomHotelAcc(c.hotel_id), pluriel(c.nb_postes_ko, "poste") + " dégradé" + (c.nb_postes_ko > 1 ? "s" : ""), "sophos")),
        ...soComptesErr.slice(0, 1).map(c => ligne("se" + (c.id || c.hotel_id), "Connexion Sophos Central impossible", nomHotelAcc(c.hotel_id), "sophos"))
      ];
      const lignesMs = [
        ...(msHautesAcc > 0 ? [ligne("msh", pluriel(msHautesAcc, "alerte") + " haute" + (msHautesAcc > 1 ? "s" : "") + " à prendre en charge", "Microsoft 365", "m365")] : []),
        ...msTenantsErr.slice(0, 2).map(t => ligne("mt" + t.tenant_id, "Connexion impossible", t.nom || nomHotelAcc(t.hotel_id), "m365")),
        ...(rappelsDus || []).slice(0, 2).map(r => ligne("rp" + r.id, r.titre || r.rappel_note || "Fiche à revoir", nomHotelAcc(r.hotel_id) + " · " + new Date(r.rappel_date + "T00:00:00").toLocaleDateString("fr-FR"), "docs-techniques"))
      ];

      const bandeauChiffre = (v, lbl) => React.createElement('div', { key: lbl },
        React.createElement('div', { style: { fontSize: 24, fontWeight: 700, color: "white" } }, String(v)),
        React.createElement('div', { style: { fontSize: 12, color: "rgba(255,255,255,.65)" } }, lbl));

      content = React.createElement('div', null,
        // Bandeau de bienvenue + chiffres globaux
        React.createElement('div', { style: { background: SB, borderRadius: 14, padding: "22px 26px", marginBottom: 20, color: "white", display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end", justifyContent: "space-between" } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 20, fontWeight: 700, color: G } }, "Bonjour" + (prenom ? " " + prenom : "") + " 👋"),
            React.createElement('div', { style: { fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 6, lineHeight: 1.6 } },
              nbDomainesAlerte === 0 ? "Rien d'urgent pour le moment. Tout est sous contrôle." : (nbDomainesAlerte + " domaine" + (nbDomainesAlerte > 1 ? "s" : "") + " sur 4 demande" + (nbDomainesAlerte > 1 ? "nt" : "") + " votre attention."))
          ),
          React.createElement('div', { style: { display: "flex", gap: 26, flexWrap: "wrap" } },
            bandeauChiffre((hotels || []).length, "établissements"),
            bandeauChiffre(ouverts.length, "tickets ouverts"),
            bandeauChiffre((rappelsDus || []).length, "rappels à 30 jours")
          )
        ),
        // Quatre domaines
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 14, marginBottom: 22 } },
          panneau("Support", "🎫", nivSupport,
            [chiffre(ouverts.length, "ouverts", 0), chiffre(enRetard.length, "en retard > 4 h", 2), chiffre(nonAssignes.length, "non assigné" + (nonAssignes.length > 1 ? "s" : ""), 1)],
            lignesSupport, "Aucun ticket en retard", "Ouvrir les tickets", "tickets-admin"),
          panneau("Sauvegardes", "💾", nivBackup,
            [chiffre(bkEchec, "en échec", 2), chiffre(bkStats ? bkStats.groupesEnEchec : 0, "site" + (bkStats && bkStats.groupesEnEchec > 1 ? "s" : "") + " touché" + (bkStats && bkStats.groupesEnEchec > 1 ? "s" : "") + (bkStats ? " / " + bkStats.nbGroupes : ""), 2), chiffre(bkMuets, "muet" + (bkMuets > 1 ? "s" : ""), 1)],
            lignesBackup, "Toutes les sauvegardes sont OK", "Ouvrir les sauvegardes", "backups"),
          panneau("Sécurité Sophos", "🔒", nivSophos,
            [chiffre(soHautes, "alerte" + (soHautes > 1 ? "s" : "") + " haute" + (soHautes > 1 ? "s" : ""), 2), chiffre(soKo, "poste" + (soKo > 1 ? "s" : "") + " dégradé" + (soKo > 1 ? "s" : ""), 2), chiffre(soErrs, "compte" + (soErrs > 1 ? "s" : "") + " en erreur", 1)],
            lignesSophos, "Aucune menace ni poste dégradé", "Ouvrir Sécurité Sophos", "sophos"),
          panneau("Microsoft 365 & échéances", "🛡️", nivMs,
            [chiffre(msHautesAcc, "alerte" + (msHautesAcc > 1 ? "s" : "") + " haute" + (msHautesAcc > 1 ? "s" : ""), 2), chiffre(msErrsAcc, "tenant" + (msErrsAcc > 1 ? "s" : "") + " en erreur", 1), chiffre(rappelsEchus.length, "rappel" + (rappelsEchus.length > 1 ? "s" : "") + " échu" + (rappelsEchus.length > 1 ? "s" : ""), 2)],
            lignesMs, "Aucune alerte ni échéance proche", "Ouvrir Microsoft 365", "m365")
        ),
        // Raccourcis
        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 } }, "Accès rapide"),
        React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap" } },
          raccourci("🎫", "Tickets", "tickets-admin"),
          raccourci("📄", "Rapport du jour", "rapport-jour"),
          raccourci("💾", "Sauvegardes", "backups"),
          raccourci("🏨", "Établissements", "client-admin"),
          raccourci("📊", "Projets", "projets"),
          raccourci("📚", "Procédures clients", "proc-admin")
        )
      );
    } else {
      // ---- Proposition 3 : accueil vitrine + widgets (client / superviseur) ----
      const monHotel = hotels.find(h => h.id === myHotelId);
      const mesTickets = (tickets || []).filter(t => t.status !== "closed");
      const nbProc = (procedures || []).length;

      const widget = (titre, children) => React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, padding: "16px 18px" } },
        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 } }, titre),
        children
      );
      const raccourci = (icone, lbl, page) => React.createElement('button', { onClick: () => goTo(page), style: { flex: "1 1 160px", display: "flex", alignItems: "center", gap: 10, background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "14px 16px", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", textAlign: "left" } },
        React.createElement('span', { style: { fontSize: 20 } }, icone),
        React.createElement('span', null, lbl)
      );

      content = React.createElement('div', null,
        React.createElement('div', { style: { display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 22, alignItems: "stretch" } },
          // Bloc présentation (vitrine)
          React.createElement('div', { style: { flex: "2 1 340px", background: SB, borderRadius: 14, padding: "26px 28px", color: "white" } },
            React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: G, marginBottom: 4 } }, "Bienvenue" + (prenom ? ", " + prenom : "") + " 👋"),
            monHotel && React.createElement('div', { style: { fontSize: 13, color: "rgba(255,255,255,.6)", marginBottom: 14 } }, monHotel.name),
            React.createElement('div', { style: { fontSize: 13.5, color: "rgba(255,255,255,.8)", lineHeight: 1.7, marginBottom: 18 } },
              "Votre portail de support informatique DSI Hotel réunit en un seul endroit vos procédures, vos demandes de support, l'inventaire de votre Infrastructure et vos rapports. Sélectionnez une rubrique ci-dessous ou dans le menu de gauche."
            ),
            React.createElement('div', { style: { fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.8, borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 14 } },
              "Besoin d'aide ? ",
              React.createElement('a', { href: "mailto:" + SUPPORT_EMAIL, style: { color: G, textDecoration: "none" } }, SUPPORT_EMAIL),
              "  •  www.dsihotel.com"
            )
          ),
          // Widgets à droite
          React.createElement('div', { style: { flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 14 } },
            widget("Mes demandes en cours", React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 30, fontWeight: 800, color: mesTickets.length > 0 ? "#0F0F24" : "#2F855A" } }, String(mesTickets.length)),
              React.createElement('div', { style: { fontSize: 12, color: "#888", marginTop: 2 } }, mesTickets.length === 0 ? "Aucune demande ouverte" : "demande(s) de support ouverte(s)"),
              isSupervisor && React.createElement('button', { onClick: () => goTo("tickets-client"), style: { marginTop: 12, padding: "8px 14px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" } }, "Voir mes demandes →")
            )),
            widget("Procédures disponibles", React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 30, fontWeight: 800, color: "#0F0F24" } }, String(nbProc)),
              React.createElement('div', { style: { fontSize: 12, color: "#888", marginTop: 2 } }, "fiche(s) pratique(s) à consulter"),
              React.createElement('button', { onClick: () => goTo("knowledge"), style: { marginTop: 12, padding: "8px 14px", background: "white", border: "1px solid " + G, color: G2, borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" } }, "Parcourir →")
            ))
          )
        ),
        // Raccourcis
        React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 } }, "Accès rapide"),
        React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap" } },
          raccourci("📖", "Procédures", "knowledge"),
          raccourci("🗂️", "Mon infrastructure", "mon-installation"),
          raccourci("📧", "Nouvelle demande", "contact"),
          ...(isSupervisor ? [raccourci("🎫", "Mes demandes", "tickets-client")] : []),
          ...(isSupervisor ? [raccourci("🔧", "Rapports d'intervention", "rapport-intervention")] : [])
        )
      );
    }
  return content;
}
