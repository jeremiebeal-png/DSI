// ===== Page « rapports » — condition dans App : page === "rapports" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_rapports({...}) de app.js.
function Page_rapports(ctx) {
  let content = ctx.content;
  const {
    SERVICES_LIST, addLigne, addSrv, confirmSendRapport, deleteRapport, downloadRapportPdf, emptyLigne,
    emptySrv, fmtDateFr, hotels, isMobile, onSelectHotelRapport, openEditRapport, openNewRapport, openRapId,
    openSendRapport, rapDemandes, rapEnvois, rapErr, rapFilterHotel, rapForm, rapHotelsReplies, rapLignes,
    rapLoading, rapModal, rapMoisReplies, rapNote, rapSendModal, rapSendTo, rapSending, rapServeurs,
    rapSrvLignes, rapports, removeLigne, removeLignePJ, removeSrv, savingRap, setLigne, setOpenRapId,
    setRapFilterHotel, setRapForm, setRapHotelsReplies, setRapLignes, setRapModal, setRapMoisReplies,
    setRapNote, setRapSendModal, setRapSendTo, setRapSrvLignes, setSrv, submitRapForm, svcLabel,
    toggleService, uploadLignePJ, uploadingPJ
  } = ctx;
    const hotelName = (id) => { const h = hotels.find(x => x.id === id); return h ? h.name : "—"; };
    // Vrai si la modale contient une saisie non enregistrée (défini ici, après les
    // useState, pour éviter toute erreur d'ordre d'initialisation).
    const rapModalARempli = () => {
      if (!rapForm) return false;
      if ((rapForm.technicien || "").trim()) return true;
      if (rapForm.hotel_id) return true;
      if ((rapForm.observations || "").trim()) return true;
      if ((rapForm.serveurs_note || "").trim()) return true;
      if ((rapLignes || []).some(l => (l.description || "").trim() || (l.explication || "").trim())) return true;
      if ((rapSrvLignes || []).some(s => (s.libelle || "").trim() || (s.note || "").trim())) return true;
      return false;
    };
    // Fermeture sécurisée : avertit avant de perdre une saisie en cours.
    const fermerRapModal = () => {
      if (rapModalARempli() && !window.confirm(
        "ATTENTION : si vous quittez cette fenêtre, tout ce que vous avez saisi sera perdu.\n\n" +
        "Voulez-vous vraiment fermer sans enregistrer le rapport ?"
      )) return;
      setRapModal(null);
    };

    // ---- BROUILLON (sauvegarde locale sur ce poste, jamais en base) ----
    const RAP_DRAFT_KEY = "dsi-rapport-brouillon";
    const enregistrerBrouillon = () => {
      try {
        localStorage.setItem(RAP_DRAFT_KEY, JSON.stringify({ form: rapForm, lignes: rapLignes, srv: rapSrvLignes, savedAt: new Date().toISOString() }));
        setRapNote("💾 Brouillon enregistré sur ce poste. Rouvrez « + Nouveau rapport » pour le reprendre.");
      } catch (e) {
        setRapNote("⚠️ Impossible d'enregistrer le brouillon sur ce navigateur.");
      }
    };
    const brouillonExiste = () => { try { return !!localStorage.getItem(RAP_DRAFT_KEY); } catch (e) { return false; } };
    const reprendreBrouillon = () => {
      try {
        const d = JSON.parse(localStorage.getItem(RAP_DRAFT_KEY) || "null");
        if (!d || !d.form) { setRapNote("Aucun brouillon trouvé."); return; }
        setRapForm(d.form);
        setRapLignes(Array.isArray(d.lignes) && d.lignes.length ? d.lignes : [emptyLigne()]);
        setRapSrvLignes(Array.isArray(d.srv) && d.srv.length ? d.srv : [emptySrv()]);
        const quand = d.savedAt ? new Date(d.savedAt).toLocaleString("fr-FR") : "";
        setRapNote("Brouillon repris" + (quand ? " (du " + quand + ")" : "") + ". Cliquez sur « Créer le rapport » pour l'enregistrer.");
      } catch (e) { setRapNote("⚠️ Brouillon illisible."); }
    };
    const effacerBrouillon = () => {
      try { localStorage.removeItem(RAP_DRAFT_KEY); setRapNote("Brouillon supprimé."); } catch (e) {}
    };
    const visibles = rapports.filter(r => rapFilterHotel === "all" || r.hotel_id === rapFilterHotel);
    // Regroupement par mois (le plus récent en premier), et à l'intérieur de
    // chaque mois tri par nom d'hôtel (A→Z). Le regroupement est purement
    // visuel : il ne touche pas aux données.
    const moisLabel = (iso) => {
      try {
        const d = new Date(iso);
        if (isNaN(d)) return "Sans date";
        const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        return s.charAt(0).toUpperCase() + s.slice(1); // "Août 2026"
      } catch (e) { return "Sans date"; }
    };
    const moisCle = (iso) => {
      const d = new Date(iso);
      if (isNaN(d)) return "0000-00";
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    };
    const groupesRap = (() => {
      const map = {};
      visibles.forEach(r => {
        const k = moisCle(r.date_intervention);
        (map[k] = map[k] || { key: k, label: moisLabel(r.date_intervention), items: [] }).items.push(r);
      });
      const arr = Object.values(map);
      // mois décroissants (clé "AAAA-MM" triable en chaîne)
      arr.sort((a, b) => b.key.localeCompare(a.key));
      // à l'intérieur : par nom d'hôtel A→Z, puis date décroissante si même hôtel
      arr.forEach(g => g.items.sort((a, b) => {
        const na = hotelName(a.hotel_id).toLowerCase(), nb = hotelName(b.hotel_id).toLowerCase();
        if (na !== nb) return na.localeCompare(nb, "fr");
        return new Date(b.date_intervention) - new Date(a.date_intervention);
      }));
      return arr;
    })();
    // État replié/déplié des mois. Par défaut : seul le mois le plus récent
    // (premier groupe) est ouvert, les autres sont repliés. On initialise une
    // seule fois, la première fois qu'on a des groupes.
    const moisReplies = rapMoisReplies || new Set();
    const estReplie = (key) => {
      if (rapMoisReplies) return rapMoisReplies.has(key);
      // Pas encore initialisé : replié sauf le premier groupe (le plus récent).
      return groupesRap.length > 0 && key !== groupesRap[0].key;
    };
    const toggleMois = (key) => {
      const base = rapMoisReplies
        ? new Set(rapMoisReplies)
        : new Set(groupesRap.slice(1).map(g => g.key)); // état initial matérialisé
      if (base.has(key)) base.delete(key); else base.add(key);
      setRapMoisReplies(base);
    };
    const inp = { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 5 };

    content = React.createElement('div', null,
      React.createElement('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 } },
        React.createElement('p', { style: { margin: 0, fontSize: 13, color: "#777" } }, "Comptes rendus d'intervention chez les clients"),
        React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          React.createElement('select', { value: rapFilterHotel, onChange: e => setRapFilterHotel(e.target.value), style: { padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12 } },
            React.createElement('option', { value: "all" }, "Tous les hôtels"),
            hotels.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
          ),
          React.createElement('button', { onClick: openNewRapport, style: { padding: "9px 16px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "+ Nouveau rapport")
        )
      ),

      rapNote && React.createElement('div', { style: { background: "#F0F5FF", border: "1px solid #C3D4F7", borderRadius: 7, padding: "9px 12px", fontSize: 12.5, color: "#2A4A8A", marginBottom: 14 } }, rapNote),

      rapLoading
        ? React.createElement('div', { style: { textAlign: "center", padding: 40, color: "#999" } }, "Chargement…")
        : visibles.length === 0
          ? React.createElement('div', { style: { textAlign: "center", padding: 48, background: "#FAFAFC", border: "1px dashed #DDD", borderRadius: 10, color: "#999" } }, "Aucun rapport pour le moment.")
          : React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 22 } },
              groupesRap.map(grp => React.createElement('div', { key: grp.key },
                React.createElement('div', { onClick: () => toggleMois(grp.key), style: { display: "flex", alignItems: "center", gap: 10, margin: "0 2px 10px", cursor: "pointer", userSelect: "none" } },
                  React.createElement('span', { style: { fontSize: 11, color: "#AAA", width: 12, flexShrink: 0, transition: "transform .15s", transform: estReplie(grp.key) ? "rotate(-90deg)" : "none" } }, "▼"),
                  React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: SB, textTransform: "capitalize" } }, grp.label),
                  React.createElement('span', { style: { fontSize: 11, fontWeight: 600, color: "#999", background: "#F0F0F6", padding: "1px 8px", borderRadius: 20 } }, grp.items.length),
                  React.createElement('span', { style: { flex: 1, height: 1, background: "#ECECF2" } })
                ),
                !estReplie(grp.key) && (() => {
                  // Sous-groupement par hôtel dans le mois. En-tête hôtel dépliable
                  // UNIQUEMENT si l'hôtel a 2+ rapports ce mois-ci ; sinon carte directe.
                  const parHotel = [];
                  const idx = {};
                  grp.items.forEach(r => {
                    const hid = r.hotel_id || "_none";
                    if (idx[hid] == null) { idx[hid] = parHotel.length; parHotel.push({ hid: r.hotel_id, name: hotelName(r.hotel_id), items: [] }); }
                    parHotel[idx[hid]].items.push(r);
                  });
                  const hotelReplie = (hid) => rapHotelsReplies.has(grp.key + "|" + hid);
                  const toggleHotel = (hid) => {
                    const s = new Set(rapHotelsReplies); const k = grp.key + "|" + hid;
                    if (s.has(k)) s.delete(k); else s.add(k);
                    setRapHotelsReplies(s);
                  };
                  const renderRapCard = (r) => {
                const dems = rapDemandes[r.id] || [];
                const srv = rapServeurs[r.id] || [];
                const nbAttente = dems.filter(d => d.statut === "attente").length;
                const svcs = Array.isArray(r.services) ? r.services : [];
                const isOpenRap = openRapId === r.id;
                const envois = rapEnvois[r.id] || [];
                const fmtEnv = (iso) => { try { return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return String(iso || ""); } };
                return React.createElement('div', { key: r.id, style: { background: "#FFF", border: "1px solid #ECECF2", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" } },
                  // ---- LIGNE COMPACTE CLIQUABLE ----
                  React.createElement('div', { onClick: () => setOpenRapId(isOpenRap ? null : r.id), style: { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" } },
                    React.createElement('span', { style: { fontSize: 14, flexShrink: 0 } }, "🏨"),
                    React.createElement('div', { style: { minWidth: 0, flex: "1 1 auto" } },
                      React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: SB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, hotelName(r.hotel_id)),
                      React.createElement('div', { style: { fontSize: 11.5, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "📅 " + fmtDateFr(r.date_intervention) + "  •  👤 " + (r.technicien || "—"))
                    ),
                    nbAttente > 0 && React.createElement('span', { style: { flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FFF3E0", color: "#B26A00", whiteSpace: "nowrap" } }, "⏳ " + nbAttente),
                    React.createElement('span', { style: { flexShrink: 0, fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: r.serveurs_ok ? "#E6F7EC" : "#FDECEC", color: r.serveurs_ok ? "#1B7A3D" : "#C0392B", whiteSpace: "nowrap" } }, r.serveurs_ok ? "Serveurs OK" : "Serveurs ⚠️"),
                    envois.length > 0 && React.createElement('span', { title: envois.map(e => "• " + fmtEnv(e.envoye_le) + " → " + e.envoye_a + (e.envoye_par ? " (par " + e.envoye_par + ")" : "")).join("\n"), style: { flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#E6F7EC", color: "#1B7A3D", whiteSpace: "nowrap", cursor: "help" } }, "✓ Envoyé" + (envois.length > 1 ? " (" + envois.length + ")" : "")),
                    React.createElement('span', { style: { flexShrink: 0, fontSize: 12, color: "#AAA", marginLeft: 2 } }, isOpenRap ? "▲" : "▼")
                  ),
                  // ---- DÉTAIL DÉPLIÉ ----
                  isOpenRap && React.createElement('div', { style: { borderTop: "1px solid #F2F2F6", padding: 16, background: "#FAFAFC" } },
                    envois.length > 0 && React.createElement('div', { style: { fontSize: 11.5, color: "#1B7A3D", marginBottom: 10 } },
                      "✓ Dernier envoi le " + fmtEnv(envois[0].envoye_le) + " → " + envois[0].envoye_a + (envois[0].envoye_par ? " (par " + envois[0].envoye_par + ")" : "")
                    ),
                    svcs.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 } },
                      svcs.map(s => React.createElement('span', { key: s, style: { fontSize: 11, background: "#F0EFF7", color: "#4A4A6A", padding: "2px 8px", borderRadius: 5 } }, svcLabel(s)))
                    ),
                    dems.length > 0 && React.createElement('div', { style: { marginBottom: 10, display: "flex", flexDirection: "column", gap: 5 } },
                      dems.map(d => React.createElement('div', { key: d.id, style: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#333" } },
                        React.createElement('span', { style: { flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, marginTop: 1, background: d.statut === "attente" ? "#FFF3E0" : "#E8F5E9", color: d.statut === "attente" ? "#B26A00" : "#2E7D32" } }, d.statut === "attente" ? "EN ATTENTE" : "OK"),
                        React.createElement('div', null,
                          React.createElement('span', null, d.description),
                          d.demandeur && React.createElement('span', { style: { color: "#999" } }, "  — " + d.demandeur),
                          d.service && React.createElement('span', { style: { marginLeft: 6, fontSize: 10.5, background: "#F0EFF7", color: "#4A4A6A", padding: "1px 7px", borderRadius: 4 } }, svcLabel(d.service)),
                          d.statut === "attente" && d.motif && React.createElement('div', { style: { color: "#B26A00", fontSize: 11.5, marginTop: 1 } }, "↳ " + d.motif),
                          d.explication && React.createElement('div', { style: { color: "#555", fontSize: 11.5, marginTop: 3, whiteSpace: "pre-wrap", lineHeight: 1.5 } }, d.explication),
                          Array.isArray(d.pieces_jointes) && d.pieces_jointes.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 } },
                            d.pieces_jointes.map((pj, k) => React.createElement('a', { key: k, href: pj.url, target: "_blank", rel: "noopener noreferrer", style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: "#F7F5EE", border: "1px solid #E6DFC8", color: G2, padding: "2px 8px", borderRadius: 5, textDecoration: "none" } }, "📄 " + pj.name))
                          )
                        )
                      ))
                    ),
                    srv.length > 0 && React.createElement('div', { style: { marginBottom: 10, paddingTop: 8, borderTop: "1px dashed #EEE" } },
                      React.createElement('div', { style: { fontSize: 11, color: "#999", marginBottom: 4 } }, "Vérifications serveurs :"),
                      React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 3 } },
                        srv.map(s => React.createElement('div', { key: s.id, style: { display: "flex", flexDirection: "column", gap: 1 } },
                          React.createElement('div', { style: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#444" } },
                            React.createElement('span', null, "• " + s.libelle),
                            React.createElement('span', { style: { fontWeight: 600, color: s.ok ? "#2E7D32" : "#C0392B" } }, s.ok ? "OK" : "Anomalie")
                          ),
                          s.note && React.createElement('div', { style: { fontSize: 11, color: "#888", fontStyle: "italic", paddingLeft: 10 } }, "↳ " + s.note)
                        ))
                      )
                    ),
                    r.serveurs_note && React.createElement('div', { style: { fontSize: 12, color: "#666", marginBottom: 10, fontStyle: "italic" } }, r.serveurs_note),
                    r.observations && React.createElement('div', { style: { fontSize: 12.5, color: "#444", marginBottom: 10, whiteSpace: "pre-wrap", paddingTop: 8, borderTop: "1px dashed #EEE" } }, React.createElement('span', { style: { fontWeight: 600 } }, "Observations : "), r.observations),
                    React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, paddingTop: 10, borderTop: "1px solid #F2F2F6", flexWrap: "wrap" } },
                      React.createElement('button', { onClick: (e) => { e.stopPropagation(); downloadRapportPdf(r); }, style: { padding: "7px 13px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "📄 PDF"),
                      React.createElement('button', { onClick: (e) => { e.stopPropagation(); openSendRapport(r); }, style: { padding: "7px 13px", background: "none", border: "1px solid " + G, color: G2, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "✉️ Envoyer"),
                      React.createElement('button', { onClick: (e) => { e.stopPropagation(); openEditRapport(r); }, style: { padding: "7px 13px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "✏️ Modifier")
                    )
                  )
                );
                  };
                  return React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
                    parHotel.map(hg => {
                      // 1 seul rapport pour cet hôtel : carte directe, pas d'en-tête.
                      if (hg.items.length < 2) return renderRapCard(hg.items[0]);
                      // 2+ rapports : en-tête hôtel dépliable (déplié par défaut).
                      const replie = hotelReplie(hg.hid || "_none");
                      return React.createElement('div', { key: "h_" + (hg.hid || "none"), style: { border: "1px solid #ECECF2", borderRadius: 10, overflow: "hidden", background: "#FBFBFD" } },
                        React.createElement('div', { onClick: () => toggleHotel(hg.hid || "_none"), style: { display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", cursor: "pointer", userSelect: "none", background: "#F5F5FA" } },
                          React.createElement('span', { style: { fontSize: 10, color: "#AAA", width: 11, flexShrink: 0, transform: replie ? "rotate(-90deg)" : "none", transition: "transform .15s" } }, "▼"),
                          React.createElement('span', { style: { fontSize: 14, flexShrink: 0 } }, "🏨"),
                          React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: SB, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, hg.name),
                          React.createElement('span', { style: { fontSize: 10.5, fontWeight: 600, color: "#888", background: "#EDEDF3", padding: "1px 8px", borderRadius: 20, flexShrink: 0 } }, hg.items.length + " rapports")
                        ),
                        !replie && React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8, padding: 8 } },
                          hg.items.map(r => renderRapCard(r))
                        )
                      );
                    })
                  );
                })()
              ))
            ),

      // ---- MODALE : ENVOI EMAIL (saisie manuelle du destinataire) ----
      rapSendModal && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1100 }, onClick: () => !rapSending && setRapSendModal(null) },
        React.createElement('div', { onClick: e => e.stopPropagation(), style: { background: "#FFF", borderRadius: 12, padding: 24, width: "100%", maxWidth: 460, boxShadow: "0 12px 40px rgba(0,0,0,.25)" } },
          React.createElement('h3', { style: { margin: "0 0 6px", fontSize: 17, color: SB } }, "Envoyer le rapport par email"),
          React.createElement('p', { style: { margin: "0 0 16px", fontSize: 12.5, color: "#777" } }, "Le rapport sera joint au format PDF, avec la signature DSI Hotel."),
          React.createElement('label', { style: lbl }, "Adresse(s) du destinataire — séparez par une virgule pour plusieurs"),
          React.createElement('input', { type: "email", value: rapSendTo, onChange: e => setRapSendTo(e.target.value), placeholder: "client@exemple.com, autre@exemple.com", style: inp }),
          rapNote && React.createElement('div', { style: { marginTop: 10, fontSize: 12, color: rapNote.startsWith("✅") ? "#1B7A3D" : rapNote.startsWith("Envoi") ? "#2A4A8A" : "#C0392B" } }, rapNote),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 } },
            React.createElement('button', { onClick: () => setRapSendModal(null), disabled: rapSending, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: confirmSendRapport, disabled: rapSending, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: rapSending ? "default" : "pointer", opacity: rapSending ? 0.6 : 1 } }, rapSending ? "Envoi…" : "Envoyer")
          )
        )
      ),

      // ---- MODALE : création / édition ----
      rapModal && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "12px" : "40px 20px", zIndex: 1000, overflowY: "auto" }, onClick: (e) => { if (e.target === e.currentTarget) fermerRapModal(); } },
        React.createElement('div', { onClick: e => e.stopPropagation(), style: { background: "#FFF", borderRadius: 12, padding: isMobile ? 18 : 26, width: "100%", maxWidth: 620, boxShadow: "0 12px 40px rgba(0,0,0,.25)" } },
          React.createElement('h3', { style: { margin: "0 0 10px", fontSize: 18, color: SB } }, rapModal === "new" ? "Nouveau rapport d'activité" : "Modifier le rapport"),
          React.createElement('div', { style: { display: "flex", gap: 9, alignItems: "flex-start", background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 8, padding: "10px 12px", marginBottom: 18 } },
            React.createElement('span', { style: { fontSize: 16, flexShrink: 0, lineHeight: 1.2 } }, "⚠️"),
            React.createElement('div', { style: { fontSize: 12, color: "#8A6D1F", lineHeight: 1.5 } },
              React.createElement('strong', null, "ATTENTION : "),
              "ne cliquez pas en dehors de cette fenêtre avant d'avoir cliqué sur « Créer le rapport ». Toute saisie non enregistrée serait perdue."
            )
          ),
          brouillonExiste() && React.createElement('div', { style: { display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap", background: "#F7F5EE", border: "1px solid #E6DFC8", borderRadius: 8, padding: "9px 12px", marginBottom: 18 } },
            React.createElement('span', { style: { fontSize: 15, flexShrink: 0 } }, "💾"),
            React.createElement('span', { style: { fontSize: 12, color: "#6B5A1E", flex: 1, minWidth: 140 } }, "Un brouillon est enregistré sur ce poste."),
            React.createElement('button', { onClick: reprendreBrouillon, style: { padding: "6px 12px", background: G, border: "none", color: "#111", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Reprendre"),
            React.createElement('button', { onClick: effacerBrouillon, style: { padding: "6px 12px", background: "none", border: "1px solid #DDD", color: "#777", borderRadius: 6, fontSize: 12, cursor: "pointer" } }, "Supprimer")
          ),

          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", paddingBottom: 14, marginBottom: 18, borderBottom: "1px solid #EEE" } },
            React.createElement('button', { onClick: enregistrerBrouillon, title: "Sauvegarder la saisie sur ce poste pour la reprendre plus tard", style: { padding: "8px 14px", background: "none", border: "1px solid #C9A84C", color: G2, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "💾 Enregistrer le brouillon"),
            React.createElement('button', { onClick: fermerRapModal, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: submitRapForm, disabled: savingRap, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: savingRap ? "default" : "pointer", opacity: savingRap ? 0.6 : 1 } }, savingRap ? "Enregistrement…" : (rapModal === "new" ? "Créer le rapport" : "Enregistrer"))
          ),

          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 } },
            React.createElement('div', null,
              React.createElement('label', { style: lbl }, "Date d'intervention"),
              React.createElement('input', { type: "date", value: rapForm.date_intervention, onChange: e => setRapForm({ ...rapForm, date_intervention: e.target.value }), style: inp })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: lbl }, "Technicien présent"),
              React.createElement('input', { value: rapForm.technicien, onChange: e => setRapForm({ ...rapForm, technicien: e.target.value }), placeholder: "Nom du technicien", style: inp })
            )
          ),

          React.createElement('div', { style: { marginBottom: 12 } },
            React.createElement('label', { style: lbl }, "Établissement"),
            React.createElement('select', { value: rapForm.hotel_id, onChange: e => onSelectHotelRapport(e.target.value), style: inp },
              React.createElement('option', { value: "" }, "— Sélectionner un hôtel —"),
              hotels.map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))
            )
          ),

          // Services visités : cases à cocher
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('label', { style: lbl }, "Services visités"),
            React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 7 } },
              SERVICES_LIST.map(svc => {
                const on = rapForm.services.includes(svc);
                return React.createElement('button', { key: svc, type: "button", onClick: () => toggleService(svc), style: { padding: "6px 12px", borderRadius: 20, fontSize: 12.5, cursor: "pointer", border: on ? "1px solid " + G : "1px solid #DDD", background: on ? G : "#FFF", color: on ? "#111" : "#666", fontWeight: on ? 600 : 400 } }, (on ? "✓ " : "") + svc);
              })
            )
          ),

          // Demandes réalisées
          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('label', { style: { ...lbl, marginBottom: 8, fontSize: 13 } }, "Demandes réalisées"),
            React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 10 } },
              rapLignes.map((l, i) => React.createElement('div', { key: i, style: { border: "1px solid #ECECF2", borderRadius: 9, padding: 12, background: "#FAFAFC" } },
                React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "flex-start" } },
                  React.createElement('textarea', { value: l.description, onChange: e => setLigne(i, "description", e.target.value), placeholder: "Description de la demande", rows: 2, style: { ...inp, resize: "vertical", flex: 1 } }),
                  rapLignes.length > 1 && React.createElement('button', { onClick: () => removeLigne(i), title: "Retirer", style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 16, padding: "4px 2px" } }, "✕")
                ),
                React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8, marginTop: 8 } },
                  React.createElement('input', { value: l.demandeur, onChange: e => setLigne(i, "demandeur", e.target.value), placeholder: "Demandé par…", style: { ...inp, fontSize: 12 } }),
                  React.createElement('select', { value: l.service, onChange: e => setLigne(i, "service", e.target.value), style: { ...inp, fontSize: 12 } },
                    React.createElement('option', { value: "" }, "Service…"),
                    SERVICES_LIST.map(svc => React.createElement('option', { key: svc, value: svc }, svc))
                  ),
                  React.createElement('select', { value: l.statut, onChange: e => setLigne(i, "statut", e.target.value), style: { ...inp, fontSize: 12 } },
                    React.createElement('option', { value: "ok" }, "✅ OK / Réalisé"),
                    React.createElement('option', { value: "attente" }, "⏳ En attente")
                  )
                ),
                l.statut === "attente" && React.createElement('input', { value: l.motif, onChange: e => setLigne(i, "motif", e.target.value), placeholder: "Pourquoi en attente ?", style: { ...inp, fontSize: 12, marginTop: 8, borderColor: "#F0C98A", background: "#FFFDF8" } }),
                // Texte libre d'explication
                React.createElement('textarea', { value: l.explication || "", onChange: e => setLigne(i, "explication", e.target.value), placeholder: "Explication complémentaire (optionnel)…", rows: 2, style: { ...inp, fontSize: 12, marginTop: 8, resize: "vertical" } }),
                // Pièces jointes de la ligne
                React.createElement('div', { style: { marginTop: 8 } },
                  React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                    React.createElement('label', { style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", background: "none", border: "1px dashed #C9A84C", color: G2, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: uploadingPJ[i] ? "wait" : "pointer" } },
                      uploadingPJ[i] ? "⏳ Envoi…" : "📎 Ajouter une pièce jointe",
                      React.createElement('input', { type: "file", multiple: true, disabled: !!uploadingPJ[i], onChange: e => { uploadLignePJ(i, e.target.files); e.target.value = ""; }, style: { display: "none" } })
                    )
                  ),
                  (l.pieces_jointes || []).length > 0 && React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 6 } },
                    (l.pieces_jointes || []).map((pj, k) => React.createElement('div', { key: k, style: { display: "flex", alignItems: "center", gap: 8, padding: "5px 9px", background: "white", border: "1px solid #ECECF2", borderRadius: 6, fontSize: 12 } },
                      React.createElement('span', { style: { flexShrink: 0 } }, "📄"),
                      React.createElement('a', { href: pj.url, target: "_blank", rel: "noopener noreferrer", style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: SB, textDecoration: "none" } }, pj.name),
                      pj.size ? React.createElement('span', { style: { color: "#999", fontSize: 11, whiteSpace: "nowrap" } }, (pj.size / 1024 < 1024 ? Math.round(pj.size / 1024) + " Ko" : (pj.size / 1048576).toFixed(1) + " Mo")) : null,
                      React.createElement('button', { onClick: () => removeLignePJ(i, k), title: "Retirer", style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 14, padding: "0 2px", flexShrink: 0 } }, "✕")
                    ))
                  )
                )
              ))
            ),
            React.createElement('button', { onClick: addLigne, style: { marginTop: 10, padding: "7px 12px", background: "none", border: "1px dashed #C9A84C", color: G2, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "+ Ajouter une demande")
          ),

          // État serveurs : global + lignes détaillées
          React.createElement('div', { style: { marginBottom: 16, padding: 12, background: "#FAFAFC", borderRadius: 9, border: "1px solid #ECECF2" } },
            React.createElement('label', { style: { ...lbl, marginBottom: 8 } }, "État des serveurs de l'hôtel"),
            React.createElement('div', { style: { display: "flex", gap: 16, marginBottom: 10 } },
              React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" } },
                React.createElement('input', { type: "radio", name: "serveurs", checked: rapForm.serveurs_ok === true, onChange: () => setRapForm({ ...rapForm, serveurs_ok: true }) }),
                "✅ Fonctionnement normal"
              ),
              React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" } },
                React.createElement('input', { type: "radio", name: "serveurs", checked: rapForm.serveurs_ok === false, onChange: () => setRapForm({ ...rapForm, serveurs_ok: false }) }),
                "⚠️ Anomalie"
              )
            ),
            React.createElement('div', { style: { fontSize: 11.5, color: "#999", marginBottom: 6 } }, "Détail des vérifications (ex. Serveur AD, Interface Agilysis…) :"),
            React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 7 } },
              rapSrvLignes.map((s, i) => React.createElement('div', { key: i, style: { display: "flex", flexDirection: "column", gap: 6, padding: 8, border: "1px solid #EEE", borderRadius: 8 } },
                React.createElement('div', { style: { display: "flex", gap: 7, alignItems: "center" } },
                  React.createElement('input', { value: s.libelle, onChange: e => setSrv(i, "libelle", e.target.value), placeholder: "Nom du serveur / vérification", style: { ...inp, fontSize: 12, flex: 1 } }),
                  React.createElement('select', { value: s.ok ? "ok" : "ko", onChange: e => setSrv(i, "ok", e.target.value === "ok"), style: { ...inp, fontSize: 12, width: 120, flexShrink: 0 } },
                    React.createElement('option', { value: "ok" }, "✅ OK"),
                    React.createElement('option', { value: "ko" }, "⚠️ Anomalie")
                  ),
                  rapSrvLignes.length > 1 && React.createElement('button', { onClick: () => removeSrv(i), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer", fontSize: 15, padding: "2px 4px", flexShrink: 0 } }, "✕")
                ),
                React.createElement('input', { value: s.note || "", onChange: e => setSrv(i, "note", e.target.value), placeholder: "Remarque (optionnel, même si OK)", style: { ...inp, fontSize: 11.5 } })
              ))
            ),
            React.createElement('button', { onClick: addSrv, style: { marginTop: 8, padding: "6px 11px", background: "none", border: "1px dashed #C9A84C", color: G2, borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: "pointer" } }, "+ Ajouter une vérification"),
            React.createElement('input', { value: rapForm.serveurs_note, onChange: e => setRapForm({ ...rapForm, serveurs_note: e.target.value }), placeholder: "Commentaire global (optionnel)", style: { ...inp, fontSize: 12, marginTop: 10 } })
          ),

          React.createElement('div', { style: { marginBottom: 16 } },
            React.createElement('label', { style: lbl }, "Observations générales (optionnel)"),
            React.createElement('textarea', { value: rapForm.observations, onChange: e => setRapForm({ ...rapForm, observations: e.target.value }), rows: 3, placeholder: "Remarques, recommandations…", style: { ...inp, resize: "vertical" } })
          ),

          rapErr && React.createElement('div', { style: { background: "#FFF5F5", border: "1px solid #FEB2B2", borderRadius: 7, padding: "9px 12px", fontSize: 12, color: "#C53030", marginBottom: 12 } }, rapErr),

          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" } },
            rapModal !== "new" && React.createElement('button', { onClick: () => deleteRapport(rapModal), style: { marginRight: "auto", padding: "8px 14px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🗑 Supprimer"),
            React.createElement('button', { onClick: enregistrerBrouillon, title: "Sauvegarder la saisie sur ce poste pour la reprendre plus tard", style: { padding: "8px 14px", background: "none", border: "1px solid #C9A84C", color: G2, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "💾 Enregistrer le brouillon"),
            React.createElement('button', { onClick: fermerRapModal, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: submitRapForm, disabled: savingRap, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: savingRap ? "default" : "pointer", opacity: savingRap ? 0.6 : 1 } }, savingRap ? "Enregistrement…" : (rapModal === "new" ? "Créer le rapport" : "Enregistrer"))
          )
        )
      )
    );
  return content;
}
