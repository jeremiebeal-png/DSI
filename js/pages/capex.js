// ===== Page « capex » — condition dans App : page === "capex" && (isAdmin || multiHotel) =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_capex({...}) de app.js.
function Page_capex(ctx) {
  let content = ctx.content;
  const {
    CAPEX_CATS, CAPEX_PRIOS, CAPEX_PRIO_COUL, CAPEX_STATUTS, CAPEX_STATUT_COUL, cxAnnee, cxAuteur, cxErr,
    cxForm, cxHotel, cxLoading, cxMaj, cxModal, cxNewFiles, cxRows, cxSaving, cxStatut, hotels, isAdmin,
    isMobile, loadCapex, mesHotels, session, setCxAnnee, setCxForm, setCxHotel, setCxModal, setCxNewFiles,
    setCxRows, setCxSaving, setCxStatut, cxOuverts, setCxOuverts, cxAuto, setCxAuto, loadCxAuto, callSophosApi
  } = ctx;
    const hotelsCx = isAdmin ? hotels : mesHotels;
    const nomHotelCx = (id) => { const h = hotelsCx.find(x => x.id === id) || hotels.find(x => x.id === id); return h ? h.name : "?"; };
    const eur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v) || 0);
    const totalLigne = (r) => (Number(r.montant_ht) || 0);
    const annees = [...new Set(cxRows.map(r => r.annee).filter(Boolean))].sort();
    let lignes = cxRows;
    if (cxHotel !== "all") lignes = lignes.filter(r => r.hotel_id === cxHotel);
    if (cxAnnee !== "all") lignes = lignes.filter(r => String(r.annee) === String(cxAnnee));
    if (cxStatut !== "all") lignes = lignes.filter(r => r.statut === cxStatut);
    lignes = lignes.slice().sort((a, b) => (a.annee || 0) - (b.annee || 0) || nomHotelCx(a.hotel_id).localeCompare(nomHotelCx(b.hotel_id), "fr") || String(a.equipement).localeCompare(String(b.equipement), "fr"));
    const actives = lignes.filter(r => r.statut !== "Refusé");
    const somme = (arr) => arr.reduce((n, r) => n + totalLigne(r), 0);
    const parHotel = {};
    actives.forEach(r => { parHotel[r.hotel_id] = (parHotel[r.hotel_id] || 0) + totalLigne(r); });

    const ouvrirNouveau = () => {
      setCxForm({ hotel_id: cxHotel !== "all" ? cxHotel : (hotelsCx[0] ? hotelsCx[0].id : ""), annee: new Date().getFullYear() + 1, trimestre: "", categorie: CAPEX_CATS[0], equipement: "", description: "", quantite: 1, montant_ht: "", priorite: "Recommandé", justification: "", statut: "Proposé", commentaire: "", pieces_jointes: [] });
      setCxNewFiles([]); setCxModal("new");
    };
    const ouvrirEdition = (r) => {
      setCxForm({ ...r, montant_ht: r.montant_ht == null ? "" : String(r.montant_ht), trimestre: r.trimestre || "", description: r.description || "", justification: r.justification || "", commentaire: r.commentaire || "", pieces_jointes: Array.isArray(r.pieces_jointes) ? r.pieces_jointes : [] });
      setCxNewFiles([]); setCxModal(r);
    };
    const enregistrer = async () => {
      const f = cxForm;
      if (!f.hotel_id) { alert("Choisissez un établissement."); return; }
      if (!String(f.equipement || "").trim()) { alert("Indiquez l'équipement / le projet."); return; }
      setCxSaving(true);
      try {
        const pj = [...(f.pieces_jointes || [])];
        for (const file of cxNewFiles) { const url = await uploadToStorage(file, "capex"); pj.push({ name: file.name, url }); }
        const payload = {
          hotel_id: f.hotel_id, annee: parseInt(f.annee, 10) || null, trimestre: f.trimestre || null,
          categorie: f.categorie, equipement: String(f.equipement).trim(), description: f.description || null,
          quantite: parseInt(f.quantite, 10) || 1, montant_ht: f.montant_ht === "" ? null : Number(String(f.montant_ht).replace(",", ".")),
          priorite: f.priorite, justification: f.justification || null, statut: f.statut, commentaire: f.commentaire || null,
          pieces_jointes: pj, updated_at: new Date().toISOString(), updated_by: session?.user?.id || null, updated_by_nom: cxAuteur(),
        };
        if (cxModal === "new") {
          const { error } = await sb.from("capex").insert({ ...payload, created_by: session?.user?.id || null, created_by_nom: cxAuteur() });
          if (error) throw error;
        } else {
          const { error } = await sb.from("capex").update(payload).eq("id", cxModal.id);
          if (error) throw error;
        }
        setCxModal(null); await loadCapex();
      } catch (e) { alert("Erreur : " + (e.message || e)); }
      finally { setCxSaving(false); }
    };
    const supprimer = async (r) => {
      if (!confirm("Supprimer la ligne « " + r.equipement + " » (" + nomHotelCx(r.hotel_id) + ") ?")) return;
      const { error } = await sb.from("capex").delete().eq("id", r.id);
      if (error) { alert("Erreur : " + error.message); return; }
      setCxModal(null); setCxRows(prev => prev.filter(x => x.id !== r.id));
    };
    const exporterCsv = () => {
      const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const ent = ["Hôtel", "Année", "Trimestre", "Catégorie", "Équipement / projet", "Description", "Quantité", "Montant HT (€)", "Priorité", "Justification", "Statut", "Commentaire", "Dernière modif. par", "Le", "Machines (inventaire NinjaOne)"];
      const rows = lignes.map(r => [nomHotelCx(r.hotel_id), r.annee, r.trimestre, r.categorie, r.equipement, r.description, r.quantite, (Number(r.montant_ht) || 0).toFixed(2).replace(".", ","), r.priorite, r.justification, r.statut, r.commentaire, r.updated_by_nom, r.updated_at ? new Date(r.updated_at).toLocaleDateString("fr-FR") : "", Array.isArray(r.machines) ? r.machines.map(m => m.nom + " (" + m.type + (m.modele ? ", " + m.modele : "") + (m.age != null ? ", " + String(m.age).replace(".", ",") + " ans" : "") + ")").join(" | ") : ""].map(esc).join(";"));
      const blob = new Blob(["﻿" + [ent.map(esc).join(";"), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "CAPEX_" + (cxHotel !== "all" ? nomHotelCx(cxHotel).replace(/[^\w]+/g, "_") : "groupe") + "_" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const selS = { padding: "7px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12.5, background: "white" };
    const inpS = { width: "100%", padding: "8px 10px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" };
    const lblS = { display: "block", fontSize: 11.5, fontWeight: 600, color: "#555", margin: "10px 0 4px" };
    const tuile = (l, v, c) => React.createElement('div', { style: { flex: "1 1 150px", background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 15px" } },
      React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 4 } }, l),
      React.createElement('div', { style: { fontSize: 20, fontWeight: 700, color: c } }, v));
    const pastille = (txt, c) => React.createElement('span', { style: { fontSize: 10.5, fontWeight: 700, color: c, background: c + "18", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" } }, txt);
    const th = (t, ex) => React.createElement('th', { style: Object.assign({ textAlign: "left", padding: "9px 10px", fontSize: 11, fontWeight: 600, color: "#666", borderBottom: "2px solid #E8E8F0", whiteSpace: "nowrap" }, ex || {}) }, t);
    const td = (c, ex) => React.createElement('td', { style: Object.assign({ padding: "9px 10px", fontSize: 12.5, color: "#333", borderBottom: "1px solid #F2F2F6", verticalAlign: "top" }, ex || {}) }, c);
    const f = cxForm;
    const setF = (k, v) => setCxForm(prev => ({ ...prev, [k]: v }));

    // ---------- Lignes automatiques : inventaire NinjaOne (machines de 3 à 5 ans / plus de 5 ans) ----------
    const TYPE_LIB = { poste: "Poste fixe", portable: "Portable", serveur: "Serveur" };
    const tableMachines = (liste) => React.createElement('div', { style: { overflowX: "auto" } },
      React.createElement('table', { style: { width: "100%", borderCollapse: "collapse", fontSize: 11.5 } },
        React.createElement('thead', null, React.createElement('tr', null,
          ["Machine", "Type", "Modèle", "N° de série", "Date d'achat estimée", "Âge", "Dernier utilisateur"].map(x => React.createElement('th', { key: x, style: { textAlign: "left", padding: "5px 8px", color: "#777", fontWeight: 600, borderBottom: "1px solid #E8E8F0", whiteSpace: "nowrap" } }, x)))),
        React.createElement('tbody', null, liste.map((m, k) => React.createElement('tr', { key: m.id || k },
          React.createElement('td', { style: { padding: "4px 8px", fontWeight: 600, whiteSpace: "nowrap" } }, isAdmin && m.lien ? React.createElement('a', { href: m.lien, target: "_blank", rel: "noreferrer", style: { color: G2, textDecoration: "none" } }, m.nom + " ↗") : m.nom),
          React.createElement('td', { style: { padding: "4px 8px" } }, TYPE_LIB[m.type] || m.type),
          React.createElement('td', { style: { padding: "4px 8px", color: "#555" } }, m.modele || "—"),
          React.createElement('td', { style: { padding: "4px 8px", color: "#555" } }, m.serie || "—"),
          React.createElement('td', { style: { padding: "4px 8px", whiteSpace: "nowrap" } }, m.date ? new Date(m.date).toLocaleDateString("fr-FR") : "—", m.source ? React.createElement('span', { style: { color: "#AAA" } }, " · " + m.source) : null),
          React.createElement('td', { style: { padding: "4px 8px", fontWeight: 700, color: m.age >= 5 ? "#C53030" : "#DD6B20", whiteSpace: "nowrap" } }, m.age != null ? String(m.age).replace(".", ",") + " ans" : "—"),
          React.createElement('td', { style: { padding: "4px 8px", color: "#555" } }, m.utilisateur || "—")
        )))
      ));
    const cxa = cxAuto || {};
    const cfg = cxa.config || {};
    const setCfg = (k, v) => setCxAuto(prev => ({ ...prev, config: { ...(prev.config || {}), [k]: v } }));
    const etatDe = (hid) => (cxa.etats || []).find(e => e.hotel_id === hid);
    const hotelsNinja = hotels.filter(h => h.ninjaone_nom).sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"));
    const ouvrirAuto = () => { const v = !cxa.ouvert; setCxAuto(prev => ({ ...prev, ouvert: v, msg: "" })); if (v) loadCxAuto(); };
    const enregistrerPrix = async () => {
      const maj = { id: 1, actif: cfg.actif !== false, prix_poste: Number(String(cfg.prix_poste).replace(",", ".")) || 0, prix_portable: Number(String(cfg.prix_portable).replace(",", ".")) || 0, prix_serveur: Number(String(cfg.prix_serveur).replace(",", ".")) || 0, updated_at: new Date().toISOString(), updated_by_nom: cxAuteur() };
      const { error } = await sb.from("capex_auto_config").upsert(maj);
      setCxAuto(prev => ({ ...prev, msg: error ? "❌ " + error.message : "✅ Réglages enregistrés — appliqués au prochain inventaire." }));
    };
    const lancerInventaire = async (simulation) => {
      const cibles = cxHotel !== "all" ? hotels.filter(h => h.id === cxHotel) : hotelsNinja;
      if (!cibles.length) { alert("Aucun établissement avec un « Nom NinjaOne »."); return; }
      if (simulation && cibles.length > 1) { alert("Choisissez un hôtel dans la liste pour l'aperçu."); return; }
      if (!simulation && cibles.length > 1 && !confirm("Lancer l'inventaire NinjaOne et mettre à jour les lignes CAPEX automatiques de " + cibles.length + " établissements ?")) return;
      const erreurs = []; let faits = 0;
      for (const h of cibles) {
        setCxAuto(prev => ({ ...prev, busy: h.name, msg: "⏳ " + h.name + " (" + (faits + 1) + "/" + cibles.length + ")…" }));
        try {
          const r = await callSophosApi("/capex-inventaire", { hotelId: h.id, simulation: !!simulation });
          if (simulation) setCxAuto(prev => ({ ...prev, apercu: r }));
          faits++;
        } catch (e) { erreurs.push(h.name + " : " + (e.message || e)); }
      }
      setCxAuto(prev => ({ ...prev, busy: "", msg: (erreurs.length ? "⚠ " + erreurs.join(" | ") : "✅ " + (simulation ? "Aperçu prêt (rien n'a été modifié)." : faits + " établissement(s) mis à jour.")) }));
      if (!simulation) { await loadCapex(); await loadCxAuto(); }
    };
    const panneauAuto = isAdmin && cxa.ouvert && React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 } },
      React.createElement('div', { style: { fontSize: 13.5, fontWeight: 600, color: "#1a1a3e", marginBottom: 4 } }, "🤖 Inventaire automatique NinjaOne"),
      React.createElement('div', { style: { fontSize: 12, color: "#777", lineHeight: 1.6, marginBottom: 10 } },
        "Chaque mois (du 1er au 7), le portail lit les postes et serveurs physiques de chaque hôtel dans NinjaOne et tient à jour deux lignes CAPEX : « plus de 5 ans » (Obligatoire) et « 3 à 5 ans » (Recommandé). Quantité, montant et liste des machines sont recalculés à chaque fois ; le statut, l'année, la priorité et le commentaire restent ceux choisis ici. Âge estimé d'après la date de garantie NinjaOne, sinon la date du BIOS, sinon l'installation du système."),
      React.createElement('div', { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 } },
        [["prix_poste", "Poste fixe (€ HT)"], ["prix_portable", "Portable (€ HT)"], ["prix_serveur", "Serveur (€ HT)"]].map(([k, l]) => React.createElement('div', { key: k },
          React.createElement('label', { style: lblS }, l),
          React.createElement('input', { value: cfg[k] == null ? "" : cfg[k], onChange: e => setCfg(k, e.target.value), inputMode: "decimal", style: { ...inpS, width: 120 } }))),
        React.createElement('label', { style: { fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 5, paddingBottom: 8 } },
          React.createElement('input', { type: "checkbox", checked: cfg.actif !== false, onChange: e => setCfg("actif", e.target.checked) }), "Mise à jour mensuelle active"),
        React.createElement('button', { onClick: enregistrerPrix, style: { ...selS, cursor: "pointer", fontWeight: 600 } }, "Enregistrer")
      ),
      React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 } },
        React.createElement('button', { onClick: () => lancerInventaire(true), disabled: !!cxa.busy || cxHotel === "all", title: cxHotel === "all" ? "Choisissez d'abord un hôtel" : "", style: { ...selS, cursor: "pointer", opacity: cxHotel === "all" ? 0.5 : 1 } }, "👁 Aperçu pour " + (cxHotel !== "all" ? nomHotelCx(cxHotel) : "l'hôtel choisi")),
        React.createElement('button', { onClick: () => lancerInventaire(false), disabled: !!cxa.busy, style: { ...selS, cursor: "pointer", background: G, border: "none", fontWeight: 600 } }, "↻ Mettre à jour maintenant — " + (cxHotel !== "all" ? nomHotelCx(cxHotel) : "tous les hôtels (" + hotelsNinja.length + ")")),
        cxa.msg && React.createElement('span', { style: { fontSize: 12, color: "#555" } }, cxa.msg)
      ),
      cxa.apercu && React.createElement('div', { style: { background: "#F8F8FC", borderRadius: 8, padding: "10px 12px", marginBottom: 10 } },
        React.createElement('div', { style: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, fontWeight: 600, color: "#1a1a3e", marginBottom: 6 } },
          "Aperçu — " + cxa.apercu.hotel + " (organisation NinjaOne : " + (cxa.apercu.organisation || "?") + ")",
          React.createElement('button', { onClick: () => setCxAuto(prev => ({ ...prev, apercu: null })), style: { background: "none", border: "none", cursor: "pointer", color: "#888" } }, "✕")),
        React.createElement('div', { style: { fontSize: 12, color: "#555", marginBottom: 6 } },
          cxa.apercu.nb_machines + " machine(s) physique(s) · " + cxa.apercu.nb_5 + " de plus de 5 ans · " + cxa.apercu.nb_3_5 + " de 3 à 5 ans · " + cxa.apercu.nb_inconnu + " sans date — sources : " +
          Object.entries(cxa.apercu.sources || {}).map(([k, v]) => k + " " + v).join(", ")),
        (cxa.apercu.lignes || []).map((l, k) => React.createElement('div', { key: k, style: { marginTop: 8 } },
          React.createElement('div', { style: { fontSize: 12, fontWeight: 600 } }, l.tranche + " : " + l.quantite + " machine(s) · " + eur(l.montant_ht)),
          (l.machines || []).length > 0 && tableMachines(l.machines))),
        (cxa.apercu.inconnus || []).length > 0 && React.createElement('div', { style: { fontSize: 11.5, color: "#B7791F", marginTop: 8 } }, "Sans date connue (non comptées) : " + cxa.apercu.inconnus.map(m => m.nom).join(", ")),
        cxa.apercu.diagnostic && React.createElement('details', { style: { marginTop: 8 } },
          React.createElement('summary', { style: { fontSize: 11.5, color: "#888", cursor: "pointer" } }, "Diagnostic (champs NinjaOne de la 1re machine)"),
          React.createElement('pre', { style: { fontSize: 10.5, whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" } }, JSON.stringify(cxa.apercu.diagnostic, null, 2)))
      ),
      React.createElement('details', null,
        React.createElement('summary', { style: { fontSize: 12, color: "#555", cursor: "pointer" } }, "Dernier passage par établissement (" + (cxa.etats || []).length + "/" + hotelsNinja.length + ")"),
        React.createElement('table', { style: { width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginTop: 6 } },
          React.createElement('tbody', null, hotelsNinja.map(h => { const e = etatDe(h.id); return React.createElement('tr', { key: h.id, style: { borderBottom: "1px solid #F2F2F6" } },
            React.createElement('td', { style: { padding: "4px 8px", fontWeight: 600 } }, h.name),
            React.createElement('td', { style: { padding: "4px 8px", color: "#777", whiteSpace: "nowrap" } }, e && e.dernier_passage ? new Date(e.dernier_passage).toLocaleDateString("fr-FR") : "jamais"),
            React.createElement('td', { style: { padding: "4px 8px", color: e && e.erreur ? "#C53030" : "#555" } }, !e ? "" : e.erreur ? "⚠ " + e.erreur : (e.nb_machines + " machines · " + e.nb_5 + " > 5 ans · " + e.nb_3_5 + " de 3 à 5 ans" + (e.nb_inconnu ? " · " + e.nb_inconnu + " sans date" : "")))
          ); }))))
    );

    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 16, lineHeight: 1.6 } },
        isAdmin ? "Plan d'investissement informatique (CAPEX) par établissement. Les lignes saisies ici sont visibles et modifiables par les comptes de groupe rattachés à ces hôtels."
                : "Plan d'investissement informatique de vos établissements, préparé par DSI Hotel. Vous pouvez valider, refuser ou ajuster chaque ligne ; chaque modification est tracée."),
      React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 } },
        React.createElement('select', { value: cxHotel, onChange: e => setCxHotel(e.target.value), style: { ...selS, maxWidth: 240 } },
          React.createElement('option', { value: "all" }, isAdmin ? "Tous les hôtels" : "Tous mes hôtels"),
          hotelsCx.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "fr")).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
        React.createElement('select', { value: cxAnnee, onChange: e => setCxAnnee(e.target.value), style: selS },
          React.createElement('option', { value: "all" }, "Toutes les années"),
          annees.map(a => React.createElement('option', { key: a, value: a }, a))),
        React.createElement('select', { value: cxStatut, onChange: e => setCxStatut(e.target.value), style: selS },
          React.createElement('option', { value: "all" }, "Tous les statuts"),
          CAPEX_STATUTS.map(x => React.createElement('option', { key: x, value: x }, x))),
        React.createElement('button', { onClick: loadCapex, style: { ...selS, cursor: "pointer" } }, cxLoading ? "…" : "↻"),
        React.createElement('button', { onClick: exporterCsv, disabled: !lignes.length, style: { ...selS, cursor: "pointer" } }, "⬇ Export Excel (CSV)"),
        isAdmin && React.createElement('button', { onClick: ouvrirAuto, style: { ...selS, cursor: "pointer", marginLeft: "auto", background: cxa.ouvert ? "#F3EEDD" : "white" } }, "🤖 Inventaire NinjaOne"),
        React.createElement('button', { onClick: ouvrirNouveau, style: { marginLeft: isAdmin ? 0 : "auto", padding: "8px 16px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" } }, "+ Nouvelle ligne")
      ),
      panneauAuto,
      cxErr && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 } }, cxErr),
      React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 } },
        tuile("Budget total (hors refusés)", eur(somme(actives)), "#0F0F24"),
        tuile("À valider", eur(somme(actives.filter(r => r.statut === "Proposé"))), "#B7791F"),
        tuile("Validé / commandé", eur(somme(actives.filter(r => r.statut === "Validé" || r.statut === "Commandé"))), "#2B6CB0"),
        tuile("Réalisé", eur(somme(actives.filter(r => r.statut === "Réalisé"))), "#2F855A")
      ),
      cxHotel === "all" && Object.keys(parHotel).length > 1 && React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 } },
        Object.keys(parHotel).sort((a, b) => nomHotelCx(a).localeCompare(nomHotelCx(b), "fr")).map(hid => React.createElement('button', { key: hid, onClick: () => setCxHotel(hid), style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 20, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#333" } },
          "🏨 " + nomHotelCx(hid) + " · ", React.createElement('b', null, eur(parHotel[hid]))))
      ),
      cxLoading && !cxRows.length && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      !cxLoading && !cxErr && lignes.length === 0 && React.createElement('div', { style: { padding: 30, textAlign: "center", color: "#999", fontSize: 13, background: "white", border: "1px solid #E8E8F0", borderRadius: 10 } }, cxRows.length ? "Aucune ligne ne correspond aux filtres." : "Aucune ligne CAPEX pour le moment."),
      lignes.length > 0 && React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, overflow: "auto" } },
        React.createElement('table', { style: { width: "100%", borderCollapse: "collapse", minWidth: 900 } },
          React.createElement('thead', null, React.createElement('tr', null,
            th("Hôtel"), th("Année"), th("Catégorie"), th("Équipement / projet"), th("Qté", { textAlign: "center" }), th("Montant HT", { textAlign: "right" }), th("Priorité"), th("Statut"), th(""))),
          React.createElement('tbody', null, lignes.map(r => React.createElement(React.Fragment, { key: r.id }, React.createElement('tr', { style: { opacity: r.statut === "Refusé" ? 0.55 : 1 } },
            td(nomHotelCx(r.hotel_id), { fontWeight: 600, color: "#1a1a3e", whiteSpace: "nowrap" }),
            td((r.annee || "—") + (r.trimestre ? " · " + r.trimestre : ""), { whiteSpace: "nowrap" }),
            td(r.categorie || "—", { fontSize: 11.5, color: "#666" }),
            td(React.createElement('div', null,
              React.createElement('div', { style: { fontWeight: 600 } }, r.equipement,
                r.auto_cle && React.createElement('span', { title: "Ligne tenue à jour chaque mois depuis l'inventaire NinjaOne", style: { marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#2B6CB0", background: "#EBF4FF", padding: "1px 7px", borderRadius: 20, whiteSpace: "nowrap" } }, "🤖 auto NinjaOne")),
              r.auto_cle && r.description && React.createElement('div', { style: { fontSize: 11.5, color: "#555", marginTop: 2 } }, r.description),
              Array.isArray(r.machines) && r.machines.length > 0 && React.createElement('button', { onClick: () => setCxOuverts(prev => ({ ...prev, [r.id]: !prev[r.id] })), style: { marginTop: 4, padding: 0, background: "none", border: "none", color: G2, fontSize: 11.5, fontWeight: 600, cursor: "pointer" } },
                (cxOuverts[r.id] ? "▾ Masquer" : "▸ Voir") + " les " + r.machines.length + " machine" + (r.machines.length > 1 ? "s" : "")),
              r.justification && React.createElement('div', { style: { fontSize: 11.5, color: "#888", marginTop: 2 } }, r.justification),
              r.commentaire && React.createElement('div', { style: { fontSize: 11.5, color: "#8A6D1F", marginTop: 3 } }, "💬 " + r.commentaire),
              Array.isArray(r.pieces_jointes) && r.pieces_jointes.length > 0 && React.createElement('div', { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 } },
                r.pieces_jointes.map((pj, k) => React.createElement('a', { key: k, href: pj.url, target: "_blank", rel: "noreferrer", style: { fontSize: 11, color: G2, textDecoration: "none" } }, "📎 " + pj.name))),
              r.updated_by_nom && React.createElement('div', { style: { fontSize: 10.5, color: "#AAA", marginTop: 3 } }, "Modifié par " + r.updated_by_nom + (r.updated_at ? " le " + new Date(r.updated_at).toLocaleDateString("fr-FR") : ""))
            )),
            td(String(r.quantite || 1), { textAlign: "center" }),
            td(eur(r.montant_ht), { textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }),
            td(pastille(r.priorite || "—", CAPEX_PRIO_COUL[r.priorite] || "#718096")),
            td(React.createElement('select', { value: r.statut, onChange: e => cxMaj(r, { statut: e.target.value }), style: { padding: "4px 6px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, border: "1px solid " + (CAPEX_STATUT_COUL[r.statut] || "#DDD") + "66", color: CAPEX_STATUT_COUL[r.statut] || "#333", background: (CAPEX_STATUT_COUL[r.statut] || "#888") + "12", cursor: "pointer" } },
              CAPEX_STATUTS.map(x => React.createElement('option', { key: x, value: x, style: { color: "#111" } }, x)))),
            td(React.createElement('button', { onClick: () => ouvrirEdition(r), style: { padding: "5px 10px", background: "none", border: "1px solid #DDD", borderRadius: 6, fontSize: 11.5, cursor: "pointer", color: "#555", whiteSpace: "nowrap" } }, "✏️ Modifier"))
          ),
          cxOuverts[r.id] && Array.isArray(r.machines) && r.machines.length > 0 && React.createElement('tr', null,
            React.createElement('td', { colSpan: 9, style: { padding: "4px 10px 12px 30px", background: "#FAFAFD", borderBottom: "1px solid #F2F2F6" } }, tableMachines(r.machines)))
          ))),
          React.createElement('tfoot', null, React.createElement('tr', null,
            td(React.createElement('b', null, "Total (hors refusés)"), { borderBottom: "none" }), td("", { borderBottom: "none" }), td("", { borderBottom: "none" }), td("", { borderBottom: "none" }), td("", { borderBottom: "none" }),
            td(React.createElement('b', null, eur(somme(actives))), { textAlign: "right", borderBottom: "none", whiteSpace: "nowrap" }), td("", { borderBottom: "none" }), td("", { borderBottom: "none" }), td("", { borderBottom: "none" })))
        )
      ),

      cxModal && f && React.createElement('div', { onClick: e => { if (e.target === e.currentTarget && !cxSaving) setCxModal(null); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? 12 : "40px 20px", zIndex: 1000, overflowY: "auto" } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: isMobile ? 18 : 24, width: "100%", maxWidth: 620, boxShadow: "0 12px 40px rgba(0,0,0,.25)", marginBottom: 30 } },
          React.createElement('div', { style: { fontSize: 16, fontWeight: 600, color: "#1a1a3e", marginBottom: 6 } }, cxModal === "new" ? "Nouvelle ligne CAPEX" : "Modifier la ligne CAPEX"),
          cxModal !== "new" && cxModal.auto_cle && React.createElement('div', { style: { background: "#EBF4FF", color: "#2B6CB0", borderRadius: 7, padding: "8px 10px", fontSize: 11.5, lineHeight: 1.5, marginBottom: 6 } },
            "🤖 Ligne automatique (inventaire NinjaOne) : la quantité, le montant, la description et la liste des machines sont recalculés chaque mois. Le statut, l'année, la priorité et le commentaire sont conservés."),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr", gap: 10 } },
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Établissement *"),
              React.createElement('select', { value: f.hotel_id, onChange: e => setF("hotel_id", e.target.value), style: inpS },
                hotelsCx.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "fr")).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name)))),
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Année"),
              React.createElement('input', { type: "number", value: f.annee, onChange: e => setF("annee", e.target.value), style: inpS })),
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Trimestre"),
              React.createElement('select', { value: f.trimestre, onChange: e => setF("trimestre", e.target.value), style: inpS },
                ["", "T1", "T2", "T3", "T4"].map(x => React.createElement('option', { key: x, value: x }, x || "—"))))
          ),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: 10 } },
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Catégorie"),
              React.createElement('select', { value: f.categorie, onChange: e => setF("categorie", e.target.value), style: inpS }, CAPEX_CATS.map(x => React.createElement('option', { key: x, value: x }, x)))),
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Équipement / projet *"),
              React.createElement('input', { value: f.equipement, onChange: e => setF("equipement", e.target.value), placeholder: "Ex. : Remplacement firewall, 12 postes réception…", style: inpS }))
          ),
          React.createElement('label', { style: lblS }, "Description"),
          React.createElement('textarea', { value: f.description, onChange: e => setF("description", e.target.value), rows: 2, style: { ...inpS, resize: "vertical" } }),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10 } },
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Quantité"),
              React.createElement('input', { type: "number", min: 1, value: f.quantite, onChange: e => setF("quantite", e.target.value), style: inpS })),
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Montant HT total (€)"),
              React.createElement('input', { value: f.montant_ht, onChange: e => setF("montant_ht", e.target.value), placeholder: "0", inputMode: "decimal", style: inpS })),
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Priorité"),
              React.createElement('select', { value: f.priorite, onChange: e => setF("priorite", e.target.value), style: inpS }, CAPEX_PRIOS.map(x => React.createElement('option', { key: x, value: x }, x)))),
            React.createElement('div', null, React.createElement('label', { style: lblS }, "Statut"),
              React.createElement('select', { value: f.statut, onChange: e => setF("statut", e.target.value), style: inpS }, CAPEX_STATUTS.map(x => React.createElement('option', { key: x, value: x }, x))))
          ),
          React.createElement('label', { style: lblS }, "Justification (fin de garantie, fin de support, sécurité…)"),
          React.createElement('input', { value: f.justification, onChange: e => setF("justification", e.target.value), style: inpS }),
          React.createElement('label', { style: lblS }, "Commentaire"),
          React.createElement('textarea', { value: f.commentaire, onChange: e => setF("commentaire", e.target.value), rows: 2, placeholder: isAdmin ? "Note visible par le client" : "Votre remarque pour DSI Hotel", style: { ...inpS, resize: "vertical" } }),
          React.createElement('label', { style: lblS }, "📎 Devis / pièces jointes"),
          (f.pieces_jointes || []).map((pj, k) => React.createElement('div', { key: k, style: { display: "flex", alignItems: "center", gap: 7, background: "#F8F8FC", borderRadius: 6, padding: "5px 9px", fontSize: 11.5, marginBottom: 4 } },
            React.createElement('a', { href: pj.url, target: "_blank", rel: "noreferrer", style: { flex: 1, color: "#333", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "📄 " + pj.name),
            React.createElement('button', { onClick: () => setF("pieces_jointes", f.pieces_jointes.filter((_, j) => j !== k)), style: { background: "none", border: "none", color: "#E53E3E", cursor: "pointer" } }, "✕"))),
          React.createElement('input', { type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg", onChange: e => setCxNewFiles(prev => [...prev, ...Array.from(e.target.files)]), style: { fontSize: 12 } }),
          cxNewFiles.map((fl, k) => React.createElement('div', { key: k, style: { fontSize: 11.5, color: "#555", marginTop: 4 } }, "🆕 " + fl.name)),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18, flexWrap: "wrap" } },
            isAdmin && cxModal !== "new" && React.createElement('button', { onClick: () => supprimer(cxModal), style: { marginRight: "auto", padding: "8px 14px", background: "none", border: "1px solid #FFCDD2", color: "#E53E3E", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "🗑 Supprimer"),
            React.createElement('button', { onClick: () => setCxModal(null), disabled: cxSaving, style: { padding: "8px 14px", background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler"),
            React.createElement('button', { onClick: enregistrer, disabled: cxSaving, style: { padding: "8px 18px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: cxSaving ? 0.6 : 1 } }, cxSaving ? "Enregistrement…" : "Enregistrer")
          )
        )
      )
    );
  return content;
}
