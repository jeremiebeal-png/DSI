// ===== Page « checklist » — condition dans App : page === "checklist" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_checklist({...}) de app.js.
function Page_checklist(ctx) {
  let content = ctx.content;
  const {
    CK_STATUTS, ckAjouterPoint, ckAjouterServeur, ckAppliquerStandardPartout, ckChoisirHotel, ckCopierPoints,
    ckErr, ckEstAD, ckFiltre, ckHotel, ckInv, ckLoading, ckMaj, ckMeta, ckNouveau, ckPoints, ckServeur,
    ckServeurs, ckStandardiserAD, ckStdBusy, ckSupprimerPoint, ckSupprimerServeur, ckSynth, ckViderServeur,
    hotels, isMobile, loadCkPoints, setCkFiltre, setCkNouveau, setCkServeur, techniciens
  } = ctx;
    const hotel = hotels.find(x => x.id === ckHotel);
    const srv = ckServeurs.find(x => x.id === ckServeur);
    const nb = (v) => ckPoints.filter(p => (p.statut || "") === v).length;
    const total = ckPoints.length;
    const nOk = nb("OK"), nKo = nb("KO"), nEc = nb("En cours"), nNa = nb("N/A"), nVide = nb("");
    const pct = total ? Math.round(100 * (nOk + nNa) / total) : 0;
    const dernier = ckPoints.map(p => p.date_controle).filter(Boolean).sort().pop();
    const inS = { padding: "6px 8px", border: "1px solid #E2E2EA", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "white", width: "100%", boxSizing: "border-box" };
    const cats = [];
    ckPoints.forEach(p => { const c = p.categorie || "Autre"; if (!cats.includes(c)) cats.push(c); });
    const nomsTech = [...new Set(techniciens.map(t => String(t.nom || "").split(" ")[0]).filter(Boolean))];
    const tuile = (lbl, v, c, bg) => React.createElement('div', { style: { background: bg, borderRadius: 10, padding: "10px 14px", minWidth: 92 } },
      React.createElement('div', { style: { fontSize: 11, color: c, fontWeight: 600 } }, lbl),
      React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: c } }, v));
    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14, lineHeight: 1.6 } },
        ckHotel ? "Check-list de cet établissement uniquement. Un statut renseigné enregistre automatiquement la date du jour et votre nom." : "Synthèse de tous les établissements : cliquez sur un hôtel pour ouvrir sa check-list. Un point reste vide tant que personne ne l'a vérifié sur place."),
      // Sélection de l'hôtel (un seul à la fois)
      React.createElement('div', { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 } },
        React.createElement('select', { id: "ck-hotel", value: ckHotel, onChange: e => ckChoisirHotel(e.target.value), style: { ...inS, width: isMobile ? "100%" : 320, padding: "9px 10px", fontSize: 13.5, fontWeight: 600 } },
          React.createElement('option', { value: "" }, "— Choisir un établissement —"),
          [...hotels].sort((a, b) => String(a.name).localeCompare(String(b.name))).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
        ckHotel && React.createElement('button', { onClick: ckAjouterServeur, style: { padding: "8px 14px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" } }, "+ Ajouter un serveur"),
        ckHotel && React.createElement('button', { onClick: () => ckChoisirHotel(""), style: { padding: "8px 14px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12.5, cursor: "pointer" } }, "← Synthèse de tous les hôtels")
      ),
      ckErr && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 } }, ckErr),
      !ckHotel && (() => {
        // ===== Synthèse : un hôtel par ligne, état de sa check-list =====
        const ETATS = {
          nonverif: { l: "Non vérifié", c: "#718096", bg: "#EEF0F4", rang: 4 },
          ko:       { l: "KO à corriger", c: "#C53030", bg: "#FDE2E2", rang: 1 },
          encours:  { l: "En cours", c: "#8A6D1F", bg: "#FFF3C4", rang: 2 },
          ok:       { l: "Vérifié", c: "#2F855A", bg: "#E6F6EA", rang: 3 },
          aucune:   { l: "Pas de check-list", c: "#A0AEC0", bg: "#F6F6FA", rang: 5 },
        };
        const lignes = hotels.map(h => {
          const pts = ckSynth.points.filter(p => p.hotel_id === h.id);
          const srvs = ckSynth.serveurs.filter(x => x.hotel_id === h.id);
          const c = (v) => pts.filter(p => (p.statut || "") === v).length;
          const total = pts.length, ok = c("OK"), ko = c("KO"), ec = c("En cours"), na = c("N/A"), vide = c("");
          const etat = !total ? "aucune" : vide === total ? "nonverif" : ko > 0 ? "ko" : (vide > 0 || ec > 0) ? "encours" : "ok";
          const dates = pts.map(p => p.date_controle).filter(Boolean).sort();
          const techs = [...new Set(pts.map(p => p.technicien).filter(Boolean))];
          return { h, srvs, total, ok, ko, ec, na, vide, etat, dernier: dates.pop() || null, techs };
        }).sort((a, b) => ETATS[a.etat].rang - ETATS[b.etat].rang || String(a.h.name).localeCompare(String(b.h.name)));
        const compte = (k) => lignes.filter(x => x.etat === k).length;
        const visibles = ckFiltre === "tous" ? lignes : lignes.filter(x => x.etat === ckFiltre);
        const chip = (k, lbl, nbv, c, bg) => React.createElement('button', { key: k, onClick: () => setCkFiltre(k),
          style: { padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "1px solid " + (ckFiltre === k ? c : "#E2E2EA"), background: ckFiltre === k ? bg : "white", color: c } }, lbl + " " + nbv);
        const cols = isMobile ? "1fr" : "minmax(0,1.3fr) 150px minmax(0,1fr) 120px minmax(0,0.8fr)";
        return React.createElement('div', null,
          React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 } },
            chip("tous", "Tous", lignes.length, "#1a1a3e", "#F1F1F6"),
            chip("nonverif", "Non vérifiés", compte("nonverif"), ETATS.nonverif.c, ETATS.nonverif.bg),
            chip("ko", "KO à corriger", compte("ko"), ETATS.ko.c, ETATS.ko.bg),
            chip("encours", "En cours", compte("encours"), ETATS.encours.c, ETATS.encours.bg),
            chip("ok", "Vérifiés", compte("ok"), ETATS.ok.c, ETATS.ok.bg),
            compte("aucune") > 0 && chip("aucune", "Sans check-list", compte("aucune"), ETATS.aucune.c, ETATS.aucune.bg),
            React.createElement('button', { onClick: ckAppliquerStandardPartout, disabled: ckStdBusy, title: "Remplace les points des check-lists pas encore remplies par les " + CK_POINTS_STANDARD.length + " points standards",
              style: { marginLeft: "auto", padding: "6px 13px", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: ckStdBusy ? "default" : "pointer", border: "none", background: G, color: "#111", opacity: ckStdBusy ? 0.6 : 1 } },
              ckStdBusy ? "Application…" : "⭐ Appliquer les points standards aux check-lists non remplies"),
            React.createElement('button', { onClick: () => ckStandardiserAD(null), disabled: ckStdBusy, title: "Sur tous les serveurs AD / DC : ne garder que les " + CK_POINTS_STANDARD.length + " points standards",
              style: { padding: "6px 13px", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: ckStdBusy ? "default" : "pointer", border: "1px solid " + G, background: "white", color: G2, opacity: ckStdBusy ? 0.6 : 1 } },
              "🖥️ Serveurs AD : seulement les points standards")),
          ckSynth.loading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement de la synthèse…"),
          !ckSynth.loading && React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, overflow: "hidden" } },
            !isMobile && React.createElement('div', { style: { display: "grid", gridTemplateColumns: cols, gap: 12, padding: "9px 14px", background: SB, color: "white", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" } },
              React.createElement('div', null, "Établissement"), React.createElement('div', null, "État"), React.createElement('div', null, "Avancement"), React.createElement('div', null, "Dernier contrôle"), React.createElement('div', null, "Technicien(s)")),
            visibles.length === 0 && React.createElement('div', { style: { padding: 24, textAlign: "center", color: "#999", fontSize: 13 } }, "Aucun établissement dans ce filtre."),
            visibles.map(x => {
              const e = ETATS[x.etat];
              const fait = x.total - x.vide;
              return React.createElement('div', { key: x.h.id, onClick: () => ckChoisirHotel(x.h.id),
                style: { display: "grid", gridTemplateColumns: cols, gap: isMobile ? 6 : 12, padding: "10px 14px", borderTop: "1px solid #F0F0F5", alignItems: "center", cursor: "pointer", borderLeft: "4px solid " + e.c },
                onMouseEnter: ev => ev.currentTarget.style.background = "#FAFAFD", onMouseLeave: ev => ev.currentTarget.style.background = "white" },
                React.createElement('div', { style: { minWidth: 0 } },
                  React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#1a1a3e" } }, x.h.name),
                  React.createElement('div', { style: { fontSize: 11.5, color: "#999" } }, x.srvs.length ? x.srvs.map(v => v.nom).join(" · ") : "aucun serveur")),
                React.createElement('div', null, React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700, color: e.c, background: e.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" } }, e.l)),
                React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
                  React.createElement('div', { style: { flex: 1, height: 7, background: "#F0F0F5", borderRadius: 4, overflow: "hidden", display: "flex", minWidth: 60 } },
                    x.total > 0 && React.createElement('div', { style: { width: (100 * (x.ok + x.na) / x.total) + "%", background: "#2F855A" } }),
                    x.total > 0 && React.createElement('div', { style: { width: (100 * x.ec / x.total) + "%", background: "#E2B93B" } }),
                    x.total > 0 && React.createElement('div', { style: { width: (100 * x.ko / x.total) + "%", background: "#C53030" } })),
                  React.createElement('span', { style: { fontSize: 11.5, color: "#555", whiteSpace: "nowrap" } }, x.total ? fait + "/" + x.total + (x.ko ? " · " + x.ko + " KO" : "") : "—")),
                React.createElement('div', { style: { fontSize: 12.5, color: x.dernier ? "#333" : "#BBB" } }, x.dernier ? new Date(x.dernier + "T12:00:00").toLocaleDateString("fr-FR") : "jamais"),
                React.createElement('div', { style: { fontSize: 12.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, x.techs.join(", ") || "—")
              );
            })
          )
        );
      })(),
      ckHotel && ckLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      ckHotel && !ckLoading && !ckErr && ckServeurs.length === 0 && React.createElement('div', { style: { padding: 32, textAlign: "center", color: "#888", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } },
        "Aucun serveur suivi pour " + (hotel ? hotel.name : "cet hôtel") + ". Cliquez sur « + Ajouter un serveur » : les points de contrôle du modèle sont créés automatiquement."),
      // Onglets serveurs
      ckHotel && ckServeurs.length > 0 && React.createElement('div', { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 } },
        ckServeurs.map(s => React.createElement('button', { key: s.id, onClick: () => { setCkServeur(s.id); loadCkPoints(s.id); },
          style: { padding: "7px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1px solid " + (s.id === ckServeur ? G : "#DDD"), background: s.id === ckServeur ? "#FBF3DC" : "white", color: s.id === ckServeur ? "#7A5E12" : "#555" } }, "🖥️ " + s.nom))),
      // Synthèse
      srv && React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 12 } },
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 } },
          React.createElement('div', { style: { flex: 1, minWidth: 200 } },
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: "#1a1a3e" } }, (hotel ? hotel.name : "") + " — " + srv.nom),
            React.createElement('div', { style: { fontSize: 12, color: "#888", marginTop: 2 } }, total + " points de contrôle" + (dernier ? " · dernier contrôle le " + new Date(dernier + "T12:00:00").toLocaleDateString("fr-FR") : " · jamais contrôlé")),
            (() => {
              const iv = ckInv.find(x => x.id === srv.inventaire_id) || ckInv.find(x => x.type === "VM" && String(x.nom || "").trim().toUpperCase() === String(srv.nom || "").trim().toUpperCase());
              if (!iv) return null;
              const hote = iv.parent_id ? ckInv.find(x => x.id === iv.parent_id) : null;
              const bout = [iv.role, iv.os, iv.version, iv.ip, hote ? "sur " + hote.nom : null].filter(Boolean);
              const pastille = (t, ok) => React.createElement('span', { style: { fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 20, color: ok ? "#2F855A" : "#C53030", background: ok ? "#E6F6EA" : "#FDE2E2" } }, t);
              return React.createElement('div', { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6, fontSize: 12, color: "#555" } },
                React.createElement('span', { title: "Informations de l'onglet Inventaire serveurs" }, "🗄️ " + (bout.join(" · ") || "Inventaire")),
                iv.a_jour && pastille(iv.a_jour === "Oui" ? "À jour" : "Pas à jour", iv.a_jour === "Oui"),
                iv.antivirus && React.createElement('span', { style: { display: "inline-flex", alignItems: "center", gap: 5 } }, iv.antivirus === "Oui" && avLogo(iv.antivirus_nom, 16), pastille(iv.antivirus === "Oui" ? "AV " + ((avReconnaitre(iv.antivirus_nom) || {}).l || iv.antivirus_nom || "OK") : "Sans antivirus", iv.antivirus === "Oui")));
            })()),
          React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            tuile("OK", nOk, "#2F855A", "#E6F6EA"), tuile("KO", nKo, "#C53030", "#FDE2E2"), tuile("En cours", nEc, "#8A6D1F", "#FFF3C4"), tuile("À faire", nVide, "#555", "#F1F1F6"))
        ),
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: isMobile ? "8px 6px" : 10, flexWrap: isMobile ? "wrap" : "nowrap" } },
          React.createElement('div', { style: { flex: isMobile ? "1 1 60%" : 1, height: 8, background: "#F0F0F5", borderRadius: 4, overflow: "hidden", display: "flex" } },
            total > 0 && React.createElement('div', { style: { width: (100 * (nOk + nNa) / total) + "%", background: "#2F855A" } }),
            total > 0 && React.createElement('div', { style: { width: (100 * nEc / total) + "%", background: "#E2B93B" } }),
            total > 0 && React.createElement('div', { style: { width: (100 * nKo / total) + "%", background: "#C53030" } })),
          React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: "#1a1a3e", whiteSpace: "nowrap" } }, pct + " % conforme"),
          React.createElement('select', { value: "", title: "Copier les points de contrôle (sans les statuts) d'un autre serveur, puis les modifier si besoin", onChange: e => { const v = e.target.value; if (v) ckCopierPoints(v); },
              style: { marginLeft: 6, padding: "4px 6px", border: "1px solid " + G, color: G2, borderRadius: 6, fontSize: 11, fontWeight: 600, background: "white", cursor: "pointer", maxWidth: 200 } },
            React.createElement('option', { value: "" }, "📋 Copier les points de…"),
            React.createElement('option', { value: "__standard" }, "⭐ Points standards (" + CK_POINTS_STANDARD.length + ")"),
            ckServeurs.filter(x => x.id !== srv.id).map(x => React.createElement('option', { key: x.id, value: x.id }, x.nom)),
            React.createElement('optgroup', { label: "Modèles par type de serveur" },
              [["VEEAM", "Sauvegarde (VEEAM)"], ["AD", "Contrôleur de domaine (AD / DC)"], ["OPERA", "Opera / PMS"], ["INTERFACE", "Interface (IFC, OPI, clés, paiement…)"], ["COMPTA", "Comptabilité (Sage…)"], ["LINUX", "Linux (UniFi…)"], ["ESXI", "Hôte ESXi (physique)"], ["WINDOWS", "Autre serveur Windows"]]
                .map(([v, l]) => React.createElement('option', { key: v, value: "__modele:" + v }, "Modèle : " + l)))),
          ckEstAD(srv.nom) && React.createElement('button', { onClick: () => ckStandardiserAD({ id: srv.id, hotel_id: ckHotel, nom: srv.nom }), disabled: ckStdBusy, title: "Ne garder que les " + CK_POINTS_STANDARD.length + " points standards sur ce serveur AD", style: { marginLeft: 6, padding: "4px 9px", background: "white", border: "1px solid " + G, color: G2, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" } }, "⭐ Points standards"),
          total > 0 && React.createElement('button', { onClick: () => ckViderServeur(srv), title: "Retirer tous les points de ce serveur (check-list vide)", style: { marginLeft: 6, padding: "4px 9px", background: "none", border: "1px solid #E2E2EA", color: "#777", borderRadius: 6, fontSize: 11, cursor: "pointer" } }, "Vider"),
          React.createElement('button', { onClick: () => ckSupprimerServeur(srv), title: "Supprimer ce serveur de la check-list", style: { marginLeft: 6, padding: "4px 9px", background: "none", border: "1px solid #F5C6C6", color: "#C53030", borderRadius: 6, fontSize: 11, cursor: "pointer" } }, "Supprimer")
        )
      ),
      // Tableau des points
      srv && React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, overflow: "hidden" } },
        !isMobile && React.createElement('div', { style: { display: "grid", gridTemplateColumns: "40px minmax(0,1fr) 130px 140px 130px minmax(0,0.8fr) 30px", gap: 10, padding: "9px 14px", background: SB, color: "white", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" } },
          React.createElement('div', null, "N°"), React.createElement('div', null, "Tâche / point de contrôle"), React.createElement('div', null, "Statut"), React.createElement('div', null, "Date contrôle"), React.createElement('div', null, "Technicien"), React.createElement('div', null, "Commentaire"), React.createElement('div', null, "")),
        total === 0 && React.createElement('div', { style: { padding: "22px 14px", textAlign: "center", color: "#888", fontSize: 13 } }, "Check-list vide : ajoutez ci-dessous les points à contrôler sur ce serveur."),
        cats.map(cat => React.createElement(React.Fragment, { key: cat },
          React.createElement('div', { style: { padding: "7px 14px", background: "#F7F7FB", borderTop: "1px solid #ECECF2", fontSize: 11.5, fontWeight: 700, color: G2, textTransform: "uppercase", letterSpacing: ".05em" } }, cat),
          ckPoints.filter(p => (p.categorie || "Autre") === cat).map(p => {
            const m = ckMeta(p.statut || "");
            const champs = [
              React.createElement('select', { key: "s", value: p.statut || "", onChange: e => ckMaj(p, { statut: e.target.value || null }), style: { ...inS, background: m.bg, color: m.c, fontWeight: 700, borderColor: p.statut ? m.bg : "#F0D98A" } },
                React.createElement('option', { value: "" }, "À faire"), CK_STATUTS.map(s => React.createElement('option', { key: s.v, value: s.v }, s.v))),
              React.createElement('input', { key: "d", type: "date", value: p.date_controle || "", onChange: e => ckMaj(p, { date_controle: e.target.value || null }), style: inS }),
              React.createElement('input', { key: "t", list: "ck-techs", defaultValue: p.technicien || "", onBlur: e => { if ((e.target.value || "") !== (p.technicien || "")) ckMaj(p, { technicien: e.target.value.trim() || null }); }, placeholder: "Technicien", style: inS }),
              React.createElement('input', { key: "c", defaultValue: p.commentaire || "", onBlur: e => { if ((e.target.value || "") !== (p.commentaire || "")) ckMaj(p, { commentaire: e.target.value.trim() || null }); }, placeholder: "Commentaire", style: inS })
            ,
              React.createElement('button', { key: "x", onClick: () => ckSupprimerPoint(p), title: "Supprimer ce point", style: { padding: "3px 6px", background: "none", border: "1px solid #F5C6C6", color: "#C53030", borderRadius: 6, fontSize: 11, cursor: "pointer" } }, "🗑")
            ];
            const tacheEdit = React.createElement('input', { key: p.id + "t" + (p.maj_le || ""), defaultValue: p.tache, title: "Cliquez pour modifier l'intitulé",
              onBlur: e => { const v = e.target.value.trim(); if (v && v !== p.tache) ckMaj(p, { tache: v }); else e.target.value = p.tache; },
              style: { width: "100%", boxSizing: "border-box", border: "1px solid transparent", background: "transparent", fontSize: 13, color: "#1a1a3e", fontFamily: "inherit", padding: "4px 6px", borderRadius: 6 },
              onFocus: e => { e.target.style.borderColor = "#E2E2EA"; e.target.style.background = "white"; } });
            return isMobile
              ? React.createElement('div', { key: p.id, style: { padding: "10px 14px", borderTop: "1px solid #F0F0F5", borderLeft: "4px solid " + (p.statut ? m.c : "#E2B93B") } },
                  React.createElement('div', { style: { display: "flex", gap: 6, alignItems: "center", fontWeight: 600, marginBottom: 8 } }, tacheEdit, champs[4]),
                  React.createElement('div', { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, champs[0], champs[1], champs[2], champs[3]))
              : React.createElement('div', { key: p.id, style: { display: "grid", gridTemplateColumns: "40px minmax(0,1fr) 130px 140px 130px minmax(0,0.8fr) 30px", gap: 10, padding: "8px 14px", borderTop: "1px solid #F0F0F5", alignItems: "center", borderLeft: "4px solid " + (p.statut ? m.c : "transparent") } },
                  React.createElement('div', { style: { fontSize: 12.5, color: "#999", fontWeight: 700 } }, p.ordre),
                  tacheEdit,
                  champs[0], champs[1], champs[2], champs[3], champs[4]);
          })
        )),
        React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "10px 14px", borderTop: "1px solid #ECECF2", background: "#FBFBFD" } },
          React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: G2 } }, "+ Nouveau point"),
          React.createElement('input', { value: ckNouveau.categorie, onChange: e => setCkNouveau({ ...ckNouveau, categorie: e.target.value }), list: "ck-cats", placeholder: "Catégorie (ex. Système, Active Directory)", style: { ...inS, width: isMobile ? "100%" : 230 } }),
          React.createElement('input', { value: ckNouveau.tache, onChange: e => setCkNouveau({ ...ckNouveau, tache: e.target.value }), onKeyDown: e => { if (e.key === "Enter") ckAjouterPoint(); }, placeholder: "Point de contrôle à vérifier", style: { ...inS, flex: "1 1 260px", width: "auto" } }),
          React.createElement('button', { onClick: ckAjouterPoint, disabled: !(ckNouveau.tache || "").trim(), style: { padding: "7px 14px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: (ckNouveau.tache || "").trim() ? 1 : .5 } }, "Ajouter")),
        React.createElement('datalist', { id: "ck-cats" }, [...new Set(cats.concat(["Système", "Active Directory", "Sauvegarde", "Réseau", "Sécurité", "Veeam"]))].map(n => React.createElement('option', { key: n, value: n }))),
        React.createElement('datalist', { id: "ck-techs" }, nomsTech.map(n => React.createElement('option', { key: n, value: n })))
      )
    );
  return content;
}
