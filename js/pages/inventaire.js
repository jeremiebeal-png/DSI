// ===== Page « inventaire » — condition dans App : page === "inventaire" && isAdmin =====
// Extrait de App (index.html). Les variables de App utilisées ici sont reçues dans ctx.
// Si vous utilisez une NOUVELLE variable de App dans cette page, ajoutez-la ici ET dans l'appel Page_inventaire({...}) de app.js.
function Page_inventaire(ctx) {
  let content = ctx.content;
  const {
    adminFromName, hotels, invAjouter, invCarePack, invChoisirHotel, invDetail, invEnregNotes, invErr,
    invEstWindows, invFiltre, invHotel, invImport, invImporterNinja, invLancerImport, invLoading, invMaj,
    invNinja, invNinjaFiltre, invNinjaOuvert, invNotes, invOuvert, invRows, invSupprimer, invSynth, invVue,
    isMobile, loadInv, setInvDetail, setInvFiltre, setInvImport, setInvNinja, setInvNinjaFiltre,
    setInvNinjaOuvert, setInvOuvert, setInvRows, techniciens
  } = ctx;
    const hotel = hotels.find(x => x.id === invHotel);
    const inS = { padding: "5px 7px", border: "1px solid #E2E2EA", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "white", width: "100%", boxSizing: "border-box" };
    const nomsTech = [...new Set(techniciens.map(t => String(t.nom || "").split(" ")[0]).filter(Boolean))];
    const fmtD = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "";
    const ouiNon = (v) => v === "Oui" ? { c: "#2F855A", bg: "#E6F6EA" } : v === "Non" ? { c: "#C53030", bg: "#FDE2E2" } : v === "N/A" ? { c: "#718096", bg: "#EEF0F4" } : { c: "#999", bg: "#FFFBEB" };
    // ----- Licence Veeam (bandeau sous chaque serveur Veeam) -----
    const invEstVeeam = (r) => /veeam/i.test((r.nom || "") + " " + (r.role || ""));
    const invMajLicence = async (r, champs) => {
      setInvRows(prev => prev.map(x => x.id === r.id ? { ...x, ...champs } : x));
      const { error } = await sb.from("inventaire_serveurs").update(champs).eq("id", r.id);
      if (error) { alert("Enregistrement impossible : " + error.message + (/licence_|care_pack_al/i.test(error.message) ? "\n\nLe script licence_veeam.sql a-t-il été exécuté ?" : "")); loadInv(r.hotel_id); }
    };
    // ----- Alerte email Care Pack (case sous la date de fin) -----
    const invAlerteCarePack = (r) => {
      if (!r.care_pack_fin || r.care_pack === "Non" || r.care_pack === "N/A") return null;
      const env = (r.care_pack_alertes_envoyees || []).slice().sort((a, b) => b - a);
      return React.createElement('label', { title: "Email automatique au support : J-60, J-30, J-15, J-5, J-1" + (env.length ? "\nDéjà envoyées : " + env.map(s => s === 0 ? "expiration" : "J-" + s).join(", ") : ""),
          style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: r.care_pack_alerte ? "#6B46C1" : "#999", cursor: "pointer", whiteSpace: "nowrap" } },
        React.createElement('input', { type: "checkbox", checked: !!r.care_pack_alerte, onChange: e => invMajLicence(r, { care_pack_alerte: e.target.checked }), style: { margin: 0 } }),
        "🔔 Alerte email" + (env.length ? " (" + env.length + " envoyée" + (env.length > 1 ? "s" : "") + ")" : ""));
    };
    const invLigneLicence = (r, fond) => {
      const j = r.licence_fin ? Math.round((new Date(r.licence_fin + "T12:00:00") - new Date(new Date().toISOString().slice(0, 10) + "T12:00:00")) / 86400000) : null;
      const st = j === null ? { l: "Date de fin à renseigner", c: "#B7791F", bg: "#FFFBEB" }
        : j < 0 ? { l: "Expirée depuis " + (-j) + " j", c: "#C53030", bg: "#FDE2E2" }
        : j <= 60 ? { l: j + " j restants", c: "#C05621", bg: "#FFF3E8" }
        : { l: j + " j restants", c: "#2F855A", bg: "#E6F6EA" };
      const envoyees = (r.licence_alertes_envoyees || []).slice().sort((a, b) => b - a);
      const champ = { padding: "4px 7px", border: "1px solid #BFD5F2", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "white" };
      return React.createElement('tr', { style: { background: fond } },
        React.createElement('td', { colSpan: 21, style: { padding: "0 6px 8px", borderBottom: "1px solid #F0F0F5" } },
          React.createElement('div', { style: { position: "sticky", left: 0, display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginLeft: 36, background: "#F3F7FD", border: "1px solid #BFD5F2", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, color: "#1F4E8C" } },
            React.createElement('b', null, "🔑 Licence Veeam"),
            React.createElement('input', { key: r.id + "li" + (r.licence_info || ""), defaultValue: r.licence_info || "", placeholder: "Type / n° de licence", onBlur: e => { const v = e.target.value.trim(); if (v !== (r.licence_info || "")) invMajLicence(r, { licence_info: v || null }); }, style: { ...champ, width: 190 } }),
            React.createElement('span', null, "Fin :"),
            React.createElement('input', { type: "date", value: r.licence_fin || "", onChange: e => invMajLicence(r, { licence_fin: e.target.value || null, licence_alertes_envoyees: [] }), style: champ }),
            React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700, color: st.c, background: st.bg, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" } }, st.l),
            React.createElement('label', { title: r.licence_fin ? "Email automatique au support" : "Renseignez d'abord la date de fin", style: { display: "inline-flex", alignItems: "center", gap: 6, cursor: r.licence_fin ? "pointer" : "default", fontWeight: 600, opacity: r.licence_fin ? 1 : .5 } },
              React.createElement('input', { type: "checkbox", disabled: !r.licence_fin, checked: !!r.licence_alerte, onChange: e => invMajLicence(r, { licence_alerte: e.target.checked }) }),
              "🔔 Alerte email au support : J-60, J-30, J-15, J-5, J-1"),
            envoyees.length > 0 && React.createElement('span', { style: { fontSize: 11, color: "#888" } }, "déjà envoyées : " + envoyees.map(s => s === 0 ? "expiration" : "J-" + s).join(", "))
          )));
    };
    const OS_LISTE = ["VMware ESXi", "Windows Server 2025", "Windows Server 2022", "Windows Server 2019", "Windows Server 2016", "Windows Server 2012 R2", "Windows 11", "Windows 10", "Linux", "Synology DSM", "Autre"];
    // Problèmes d'une ligne (utilisés par la synthèse et la mise en couleur)
    const problemes = (r) => {
      const p = [];
      if (r.a_jour === "Non") p.push("pas à jour");
      const cp = invCarePack(r);
      if (cp.l === "Expiré") p.push("Care Pack expiré");
      if (r.antivirus === "Non" || (invEstWindows(r) && !r.antivirus)) p.push("antivirus ?");
      if (r.antivirus === "Oui" && r.av_a_jour === "Non") p.push("AV pas à jour");
      if (invEstVeeam(r) && r.licence_fin && new Date(r.licence_fin + "T23:59:59") < new Date()) p.push("licence Veeam expirée");
      return p;
    };
    // ================= Présentation « file d'actions » =================
    const nomHotelInv = (id) => { const h = hotels.find(x => x.id === id); return h ? h.name : "?"; };
    const lienNinja = (r) => r && r.ninja_id ? NINJA_CONSOLE_URL + "/#/deviceDashboard/" + r.ninja_id + "/overview" : null;
    const pastille = (c) => React.createElement('span', { style: { display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0 } });
    const VERT = "#12B76A", ROUGE = "#D92D20", GRIS = "#D0D5DD";
    const btnC = (fonce) => ({ padding: "8px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap", border: fonce ? "none" : "1px solid #D0D5DD", background: fonce ? SB : "white", color: fonce ? "white" : "#1a1a3e", display: "inline-block" });
    const carte = { background: "white", border: "1px solid #E8E8F0", borderRadius: 12 };
    const dateFr = () => new Date().toLocaleDateString("fr-FR");
    const estVerifie = (r) => /vérifié le/i.test(r.commentaire || "");
    const ajouterCommentaire = (r, txt) => invMaj(r, { commentaire: ((r.commentaire || "").trim() ? (r.commentaire || "").trim() + " · " : "") + txt });

    // Ticket « Demande de devis Care Pack », créé directement dans le portail (pas d'email : évite le filtre anti-boucle)
    const invDemanderDevis = async (r, nbVm) => {
      const h = hotels.find(x => x.id === r.hotel_id);
      if (!window.confirm("Créer un ticket « Demande de devis Care Pack » pour " + r.nom + " (" + (h ? h.name : "") + ") ?")) return;
      const cp = invCarePack(r);
      const lignes = [
        "Demande de devis de renouvellement Care Pack",
        "Établissement : " + (h ? h.name : "?"),
        "Serveur : " + r.nom + (r.ip && r.ip !== r.nom ? " (" + r.ip + ")" : ""),
        "Système : " + [r.os, r.version].filter(Boolean).join(" "),
        "N° série / réf. : " + (r.care_pack_ref || "non renseigné"),
        "Fin du Care Pack : " + (r.care_pack_fin ? fmtD(r.care_pack_fin) : "non renseignée") + (cp.j != null ? (cp.j < 0 ? " (expiré depuis " + (-cp.j) + " j)" : " (dans " + cp.j + " j)") : ""),
        nbVm ? "VM hébergées : " + nbVm : "",
        "",
        "Ticket créé depuis Sécurité › Inventaire serveurs par " + adminFromName() + "."
      ].filter(x => x !== "").join("\n");
      try {
        const { data, error } = await sb.from("tickets").insert({
          hotel_id: r.hotel_id, contact_name: "Inventaire serveurs", contact_email: TEAM_EMAIL,
          category: "Problème Matériel", priority: "Moyenne", type_ticket: "demande",
          subject: "[Care Pack] Demande de devis — " + (h ? h.name : "") + " — " + r.nom,
          message: lignes, status: "open", source: "inventaire",
        }).select().single();
        if (error) throw error;
        await ajouterCommentaire(r, "Devis Care Pack demandé le " + dateFr() + (data && data.reference ? " (" + data.reference + ")" : ""));
        alert("Ticket créé" + (data && data.reference ? " : " + data.reference : "") + ".");
      } catch (e) { alert("Création du ticket impossible : " + (e.message || e)); }
    };
    const copier = (txt) => { try { navigator.clipboard.writeText(txt); } catch (_) {} };

    // ---------- Synthèse : file d'actions ----------
    const invVueActions = () => {
      if (invSynth.loading) return React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement de la synthèse…");
      const rows = invSynth.rows;
      const tri = (a, b) => String(a || "9999").localeCompare(String(b || "9999"));
      const it = (r, d, c) => ({ key: r.hotel_id + (r.nom || "") + d, hotelId: r.hotel_id, hotel: nomHotelInv(r.hotel_id), serveur: r.nom || "—", d, c });
      const cpExp = rows.filter(r => invCarePack(r).l === "Expiré").sort((a, b) => tri(a.care_pack_fin, b.care_pack_fin)).map(r => it(r, "depuis le " + fmtD(r.care_pack_fin), "#B42318"));
      const maj = rows.filter(r => r.a_jour === "Non").sort((a, b) => tri(a.derniere_maj, b.derniere_maj)).map(r => it(r, r.derniere_maj ? "dernière le " + fmtD(r.derniere_maj) : "date inconnue", r.derniere_maj ? "#B54708" : "#667085"));
      const cp90 = rows.filter(r => invCarePack(r).l === "Moins de 90 j").sort((a, b) => tri(a.care_pack_fin, b.care_pack_fin)).map(r => it(r, "le " + fmtD(r.care_pack_fin), "#B54708"));
      const avecInv = [...new Set(rows.map(r => r.hotel_id))];
      const jamais = avecInv.filter(id => !rows.some(r => r.hotel_id === id && r.date_controle)).map(id => {
        const rs = rows.filter(r => r.hotel_id === id);
        return { key: "j" + id, hotelId: id, hotel: nomHotelInv(id), serveur: rs.filter(r => r.type === "Physique").length + " phys. · " + rs.filter(r => r.type === "VM").length + " VM", d: "aucun contrôle", c: "#667085" };
      }).sort((a, b) => a.hotel.localeCompare(b.hotel));
      const sansInv = hotels.filter(h => !avecInv.includes(h.id)).length;
      const parHotelAv = {};
      rows.filter(r => r.antivirus === "Non" || (invEstWindows(r) && !r.antivirus)).forEach(r => { parHotelAv[r.hotel_id] = (parHotelAv[r.hotel_id] || 0) + 1; });
      const avListe = Object.entries(parHotelAv).sort((a, b) => b[1] - a[1]);
      const nbAv = avListe.reduce((s, x) => s + x[1], 0);

      const groupe = (key, titre, aide, items, c, bg) => {
        const ouvert = invOuvert === key;
        const vus = ouvert ? items : items.slice(0, 6);
        return React.createElement('section', { key, style: { ...carte, overflow: "hidden" } },
          React.createElement('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #EEF0F4" } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: "#1a1a3e" } }, titre),
              React.createElement('div', { style: { fontSize: 12, color: "#667085", marginTop: 2 } }, aide)),
            React.createElement('span', { style: { minWidth: 26, textAlign: "center", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: c, background: bg } }, items.length)),
          items.length === 0 && React.createElement('div', { style: { padding: "14px 16px", fontSize: 13, color: "#2F855A" } }, "✓ Rien à signaler"),
          vus.map(x => React.createElement('div', { key: x.key, onClick: () => invChoisirHotel(x.hotelId),
              style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr 0.9fr", gap: isMobile ? 2 : 10, padding: "9px 16px", borderTop: "1px solid #F2F4F7", fontSize: 13, alignItems: "center", cursor: "pointer" },
              onMouseEnter: ev => ev.currentTarget.style.background = "#FAFAFD", onMouseLeave: ev => ev.currentTarget.style.background = "white" },
            React.createElement('span', { style: { fontWeight: 600, color: "#1a1a3e" } }, x.hotel),
            React.createElement('span', { style: { fontFamily: "monospace", fontSize: 12, color: "#344054" } }, x.serveur),
            React.createElement('span', { style: { color: x.c, fontWeight: 600, fontSize: 12.5 } }, x.d))),
          items.length > 6 && React.createElement('button', { onClick: () => setInvOuvert(ouvert ? "" : key), style: { width: "100%", padding: "9px 16px", background: "white", border: "none", borderTop: "1px solid #F2F4F7", color: G2, fontWeight: 600, fontSize: 12.5, cursor: "pointer", textAlign: "left" } },
            ouvert ? "Réduire" : "Voir les " + items.length + " →"));
      };
      return React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 14 } },
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 14, alignItems: "start" } },
          groupe("cp", "Care Pack expirés", "Renouveler ou remplacer le matériel", cpExp, "#B42318", "#FEE4E2"),
          groupe("maj", "Mises à jour en retard", "Machines marquées « pas à jour »", maj, "#B54708", "#FEF0C7"),
          groupe("cp90", "Care Pack bientôt échus", "Moins de 90 jours", cp90, "#B54708", "#FEF0C7"),
          groupe("jamais", "Jamais contrôlés sur place", "Inventaire saisi, aucune date de contrôle" + (sansInv ? " · + " + sansInv + " établissement(s) sans inventaire" : ""), jamais, "#475467", "#F2F4F7")),
        React.createElement('section', { style: { ...carte, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 } },
          React.createElement('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: "#1a1a3e" } }, "Windows sans antivirus connu"),
              React.createElement('div', { style: { fontSize: 12, color: "#667085", marginTop: 2 } }, nbAv + " machine(s) — « Remplir depuis NinjaOne » complète l'antivirus quand NinjaOne le connaît")),
            React.createElement('span', { style: { minWidth: 26, textAlign: "center", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "#6B46C1", background: "#F3EEFC" } }, nbAv)),
          avListe.length > 0 && React.createElement('div', { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            avListe.map(([id, n]) => React.createElement('button', { key: id, onClick: () => invChoisirHotel(id), style: { padding: "5px 11px", borderRadius: 20, border: "1px solid #E2E2EA", background: "white", fontSize: 12.5, cursor: "pointer", color: "#344054" } },
              nomHotelInv(id) + " · ", React.createElement('b', null, n))))));
    };

    // ---------- Fiche hôtel : à traiter / à vérifier / tout le parc ----------
    const invVueHotel = (liste) => {
      const enfants = (id) => invRows.filter(x => x.parent_id === id);
      const actions = [];
      liste.forEach(({ r }) => {
        const cp = invCarePack(r);
        const sys = [r.os, r.version].filter(Boolean).join(" ");
        const nom = (r.type === "Physique" && /esxi/i.test(r.os || "") ? "ESXi " : "") + r.nom;
        if (cp.l === "Expiré" || cp.l === "Moins de 90 j") {
          const nbVm = enfants(r.id).length;
          const devis = /Devis Care Pack demandé/i.test(r.commentaire || "");
          actions.push({ rang: cp.l === "Expiré" ? 1 : 5, key: "cp" + r.id, type: "Care Pack", c: cp.l === "Expiré" ? "#B42318" : "#B54708", bg: cp.l === "Expiré" ? "#FEE4E2" : "#FEF0C7",
            titre: nom + " — Care Pack " + (cp.l === "Expiré" ? "expiré le " : "expire le ") + fmtD(r.care_pack_fin),
            detail: [sys, r.care_pack_ref ? "n° série " + r.care_pack_ref : "n° série non renseigné", nbVm ? nbVm + " VM" : ""].filter(Boolean).join(" · "),
            boutons: [
              r.care_pack_ref && React.createElement('button', { key: "cs", onClick: () => copier(r.care_pack_ref), title: "Copier le n° de série", style: btnC(false) }, "Copier le n° de série"),
              React.createElement('a', { key: "hpe", href: HPE_SUPPORT_URL, target: "_blank", rel: "noopener noreferrer", style: btnC(false) }, "Ouvrir un dossier HPE"),
              devis ? React.createElement('span', { key: "dv", style: { ...btnC(false), cursor: "default", color: "#B54708", borderColor: "#FEDF89", background: "#FFFAEB" } }, "Devis demandé")
                : React.createElement('button', { key: "dv", onClick: () => invDemanderDevis(r, nbVm), style: btnC(true) }, "Demander un devis")] });
        }
        if (r.a_jour === "Non") actions.push({ rang: 2, key: "maj" + r.id, type: "Mises à jour", c: "#B54708", bg: "#FEF0C7",
          titre: nom + " — pas à jour", detail: [r.ip, sys, r.derniere_maj ? "dernière installée le " + fmtD(r.derniere_maj) : "date de dernière MAJ inconnue"].filter(Boolean).join(" · "),
          boutons: [lienNinja(r) && React.createElement('a', { key: "nj", href: lienNinja(r), target: "_blank", rel: "noopener noreferrer", style: btnC(true) }, "Ouvrir dans NinjaOne")] });
        if (r.antivirus === "Non" || (invEstWindows(r) && !r.antivirus)) actions.push({ rang: 3, key: "av" + r.id, type: "Antivirus", c: "#6B46C1", bg: "#F3EEFC",
          titre: nom + " — " + (r.antivirus === "Non" ? "sans antivirus" : "antivirus non renseigné"), detail: [r.ip, sys].filter(Boolean).join(" · "),
          boutons: [lienNinja(r) && React.createElement('a', { key: "nj", href: lienNinja(r), target: "_blank", rel: "noopener noreferrer", style: btnC(true) }, "Ouvrir dans NinjaOne")] });
        if (invEstVeeam(r) && r.licence_fin) {
          const j = Math.round((new Date(r.licence_fin + "T12:00:00") - new Date()) / 86400000);
          if (j < 60) actions.push({ rang: 4, key: "vl" + r.id, type: "Licence Veeam", c: j < 0 ? "#B42318" : "#B54708", bg: j < 0 ? "#FEE4E2" : "#FEF0C7",
            titre: nom + " — licence Veeam " + (j < 0 ? "expirée le " : "expire le ") + fmtD(r.licence_fin), detail: r.licence_info || "", boutons: [] });
        }
      });
      actions.sort((a, b) => a.rang - b.rang);

      const verifs = [];
      liste.forEach(({ r }) => {
        if (estVerifie(r)) return;
        if (/à vérifier/i.test(r.commentaire || "")) { const p = invRows.find(x => x.id === r.parent_id); verifs.push({ r, t: r.nom + " : rangée sous " + (p ? p.nom : "un hôte") + " par déduction (hôte non supervisé dans NinjaOne)" }); }
        else if (r.type === "VM" && !r.os && !r.ip) verifs.push({ r, t: r.nom + " : ni IP ni OS connus (VMware Tools absents ?) — doublon possible" });
        else if (r.type === "Physique" && /esxi|vmware|hyper-v/i.test((r.os || "") + " " + (r.role || "")) && !r.ninja_id) verifs.push({ r, t: "Hôte " + r.nom + " : matériel non surveillé (absent de NinjaOne) — l'ajouter dans NinjaOne ou configurer les alertes de son iLO" });
      });

      const tops = liste.filter(x => !x.vm).map(x => x.r).filter(r => r.type !== "VM");
      const orphelines = invRows.filter(r => r.type === "VM" && !tops.some(t => t.id === r.parent_id));
      const dotMaj = (r) => r.a_jour === "Oui" ? VERT : r.a_jour === "Non" ? ROUGE : GRIS;
      const dotAv = (r) => r.antivirus === "Oui" && r.av_a_jour !== "Non" ? VERT : (r.antivirus === "Non" || r.av_a_jour === "Non" || (invEstWindows(r) && !r.antivirus)) ? ROUGE : GRIS;
      const ligneMachine = (r) => {
        const lien = lienNinja(r);
        const info = [r.ip && r.ip !== r.nom ? r.ip : "", [r.os, r.version].filter(Boolean).join(" "), r.role].filter(Boolean).join(" · ") || (r.type === "VM" ? "aucune information" : "");
        const corps = [
          React.createElement('div', { key: "n", style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontWeight: 600, fontSize: 13, color: "#1a1a3e" } }, r.nom, lien && React.createElement('span', { style: { fontWeight: 500, fontSize: 11, color: "#667085", marginLeft: 6 } }, "↗ NinjaOne")),
            React.createElement('div', { style: { fontSize: 11.5, color: "#667085", marginTop: 1 } }, info)),
          React.createElement('div', { key: "p", style: { display: "flex", gap: 5, alignItems: "center", fontSize: 11, color: "#475467", whiteSpace: "nowrap" } },
            pastille(dotMaj(r)), "MAJ", React.createElement('span', { style: { width: 6 } }), pastille(dotAv(r)), "AV")];
        const st = { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F2F4F7", textDecoration: "none", color: "inherit" };
        return lien ? React.createElement('a', { key: r.id, href: lien, target: "_blank", rel: "noopener noreferrer", title: "Ouvrir la fiche NinjaOne", style: st }, corps)
          : React.createElement('div', { key: r.id, style: st }, corps);
      };
      const blocHote = (t, vms) => {
        const cp = t ? invCarePack(t) : {};
        const lien = lienNinja(t);
        return React.createElement('div', { key: t ? t.id : "orph", style: { minWidth: 0 } },
          React.createElement('div', { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", paddingBottom: 8, borderBottom: "1px solid #E4E7EC", flexWrap: "wrap" } },
            t ? React.createElement(lien ? 'a' : 'span', lien ? { href: lien, target: "_blank", rel: "noopener noreferrer", style: { fontWeight: 700, fontSize: 14, color: "#1a1a3e", textDecoration: "none" } } : { style: { fontWeight: 700, fontSize: 14, color: "#1a1a3e" } },
                t.nom + " · " + [t.os, t.version].filter(Boolean).join(" "), lien ? " ↗" : "")
              : React.createElement('span', { style: { fontWeight: 700, fontSize: 14, color: "#1a1a3e" } }, "VM sans hôte"),
            t && cp.l && React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700, color: cp.c, background: cp.bg, padding: "2px 8px", borderRadius: 20 } }, "Care Pack : " + (cp.l === "OK" ? "jusqu'au " + fmtD(t.care_pack_fin) : cp.l))),
          vms.length ? vms.map(ligneMachine) : React.createElement('div', { style: { fontSize: 12.5, color: "#999", padding: "8px 0" } }, t && t.type === "Physique" ? "Aucune VM" : ""));
      };
      const titre = (t, n, c) => React.createElement('h3', { style: { margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#1a1a3e" } }, t, React.createElement('span', { style: { color: c } }, " · " + n));

      return React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 16, marginBottom: 14 } },
        React.createElement('div', null,
          titre("À traiter", actions.length, actions.length ? "#B42318" : "#2F855A"),
          actions.length === 0 && React.createElement('div', { style: { ...carte, padding: "14px 16px", fontSize: 13, color: "#2F855A" } }, "✓ Rien à traiter pour cet établissement."),
          React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 8 } },
            actions.map(a => React.createElement('div', { key: a.key, style: { ...carte, padding: "13px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" } },
              React.createElement('span', { style: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: a.c, background: a.bg, whiteSpace: "nowrap" } }, a.type),
              React.createElement('div', { style: { flex: "1 1 300px", minWidth: 0 } },
                React.createElement('div', { style: { fontWeight: 700, fontSize: 14, color: "#1a1a3e" } }, a.titre),
                a.detail && React.createElement('div', { style: { fontSize: 12.5, color: "#475467", marginTop: 2 } }, a.detail)),
              React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, a.boutons.filter(Boolean)))))),
        verifs.length > 0 && React.createElement('div', null,
          titre("À vérifier sur place", verifs.length, "#B54708"),
          React.createElement('div', { style: carte },
            verifs.map((v, i) => React.createElement('div', { key: v.r.id + i, style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i ? "1px solid #F2F4F7" : "none", fontSize: 13, flexWrap: "wrap" } },
              React.createElement('span', { style: { color: "#344054" } }, v.t),
              React.createElement('button', { onClick: () => ajouterCommentaire(v.r, "vérifié le " + dateFr() + " par " + adminFromName().split(" ")[0]), style: { background: "none", border: "none", color: "#475467", fontWeight: 600, fontSize: 12.5, cursor: "pointer" } }, "Marquer vérifié"))))),
        React.createElement('div', null,
          React.createElement('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 } },
            React.createElement('h3', { style: { margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a3e", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" } }, "Tout le parc",
              React.createElement('span', { style: { fontSize: 12, fontWeight: 500, color: "#475467", display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 8 } },
                pastille(VERT), "OK", React.createElement('span', { style: { width: 6 } }), pastille(ROUGE), "À corriger", React.createElement('span', { style: { width: 6 } }), pastille(GRIS), "Inconnu")),
            React.createElement('button', { onClick: () => setInvDetail(!invDetail), style: btnC(false) }, invDetail ? "Masquer le détail" : "Afficher le détail et modifier")),
          React.createElement('div', { style: { ...carte, padding: "14px 16px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 18 } },
            tops.map(t => blocHote(t, enfants(t.id).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)))),
            orphelines.length > 0 && blocHote(null, orphelines))));
    };

    content = React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: "#888", marginBottom: 14, lineHeight: 1.6 } },
        invHotel ? "Une ligne par serveur : hôtes physiques et, en dessous, leurs VM. Les jours restants et le statut du Care Pack sont calculés automatiquement. Une modification renseigne la date du contrôle et votre nom s'ils sont vides."
          : "Synthèse de tous les établissements : cliquez sur un hôtel pour ouvrir son inventaire."),
      React.createElement('div', { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 } },
        React.createElement('select', { id: "inv-hotel", value: invHotel, onChange: e => invChoisirHotel(e.target.value), style: { ...inS, width: isMobile ? "100%" : 320, padding: "9px 10px", fontSize: 13.5, fontWeight: 600 } },
          React.createElement('option', { value: "" }, "— Choisir un établissement —"),
          [...hotels].sort((a, b) => String(a.name).localeCompare(String(b.name))).map(h => React.createElement('option', { key: h.id, value: h.id }, h.name))),
        invHotel && React.createElement('button', { onClick: () => invAjouter(null), style: { padding: "8px 14px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" } }, "+ Ajouter un hôte physique"),
        invHotel && React.createElement('button', { onClick: () => invChoisirHotel(""), style: { padding: "8px 14px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12.5, cursor: "pointer" } }, "← Synthèse de tous les hôtels"),
        React.createElement('button', { onClick: () => invImporterNinja(invHotel || null), disabled: !!(invNinja && invNinja.busy),
          title: "Lire NinjaOne : met à jour OS, version, IP, n° de série, mises à jour et antivirus, et ajoute les machines manquantes. Ne touche jamais au Care Pack, à la licence Veeam, au rôle ni aux notes.",
          style: { padding: "8px 14px", background: "#1A1A3E", border: "none", color: "white", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: (invNinja && invNinja.busy) ? "wait" : "pointer", opacity: (invNinja && invNinja.busy) ? 0.7 : 1 } },
          (invNinja && invNinja.busy) ? "⏳ NinjaOne… " + invNinja.progression : (invHotel ? "🔄 Remplir depuis NinjaOne" : "🔄 Remplir tous les hôtels depuis NinjaOne"))
      ),
      invErr && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 } }, invErr),
      invNinja && !invNinja.busy && invNinja.resultats && invNinja.resultats.length > 0 && (() => {
        const rs = invNinja.resultats;
        const ok = rs.filter(r => r.ok), ko = rs.filter(r => !r.ok && !r.introuvable), introuvables = rs.filter(r => r.introuvable);
        const IND = [
          { k: "doublons", l: "doublons possibles", c: "#B42318", bg: "#FEE4E2", n: r => (r.doublons || []).length },
          { k: "ajoutes", l: "machines ajoutées", c: "#067647", bg: "#DCFAE6", n: r => r.ajoutes.length },
          { k: "maj", l: "lignes mises à jour", c: "#1a1a3e", bg: "#EEF0F6", n: r => r.mis_a_jour.length },
          { k: "ecarts", l: "rangées sous un autre hôte", c: "#B54708", bg: "#FEF0C7", n: r => r.ecarts.length },
          { k: "absents", l: "absentes de NinjaOne", c: "#475467", bg: "#F2F4F7", n: r => r.absents.length },
        ];
        const total = (ind) => ok.reduce((s, r) => s + ind.n(r), 0);
        const filtre = IND.find(i => i.k === invNinjaFiltre);
        const avecQqch = ok.filter(r => IND.some(i => i.n(r)) || r.erreurs.length);
        const lignesT = (filtre ? ok.filter(r => filtre.n(r)) : avecQqch)
          .sort((a, b) => IND[0].n(b) - IND[0].n(a) || (IND[1].n(b) + IND[2].n(b)) - (IND[1].n(a) + IND[2].n(a)) || a.hotel.localeCompare(b.hotel));
        const cols = isMobile ? "1fr" : "2fr repeat(5, minmax(0, 1fr)) 28px";
        const pastilleN = (n, i) => n ? React.createElement('span', { style: { display: "inline-block", minWidth: 22, padding: "2px 9px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, color: i.c, background: i.bg } }, n)
          : React.createElement('span', { style: { color: "#98A2B3", fontSize: 13 } }, "—");
        const bloc = (titre, c, items) => React.createElement('div', { key: titre },
          React.createElement('div', { style: { fontWeight: 700, color: c, marginBottom: 4 } }, titre + " · " + items.length),
          items.length ? React.createElement('div', { style: { color: "#344054", whiteSpace: "pre-line" } }, items.join("\n")) : React.createElement('div', { style: { color: "#98A2B3" } }, "—"));
        const quand = invNinja.fin ? invNinja.fin.toLocaleDateString("fr-FR") + " à " + invNinja.fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
        return React.createElement('div', { style: { background: "white", border: "1px solid #E4E7EC", borderRadius: 14, overflow: "hidden", marginBottom: 14 } },
          React.createElement('div', { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #E4E7EC", flexWrap: "wrap" } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: "#1a1a3e" } }, "Remplissage depuis NinjaOne" + (quand ? " — " + quand : "")),
              React.createElement('div', { style: { fontSize: 12.5, color: "#667085", marginTop: 3 } },
                ok.length + " établissement(s) traité(s)" + (introuvables.length ? " · " + introuvables.length + " sans organisation NinjaOne" : "") + (ko.length ? " · " + ko.length + " en erreur" : ""))),
            React.createElement('button', { onClick: () => setInvNinja(null), "aria-label": "Fermer", style: { background: "none", border: "none", color: "#475467", cursor: "pointer", fontSize: 20, padding: "2px 8px" } }, "×")),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))", borderBottom: "1px solid #E4E7EC" } },
            IND.map(i => React.createElement('button', { key: i.k, onClick: () => setInvNinjaFiltre(invNinjaFiltre === i.k ? "" : i.k), title: "Filtrer les établissements",
                style: { textAlign: "left", padding: "12px 18px", border: "none", borderRight: "1px solid #EEF0F4", cursor: "pointer", fontFamily: "inherit",
                  background: invNinjaFiltre === i.k ? "#F4F6FB" : "white", boxShadow: invNinjaFiltre === i.k ? "inset 0 -3px 0 " + SB : "none" } },
              React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: total(i) ? i.c : "#98A2B3" } }, total(i)),
              React.createElement('div', { style: { fontSize: 12, color: "#475467", fontWeight: 500, marginTop: 2 } }, i.l)))),
          React.createElement('div', { style: { overflowX: "auto" } },
            React.createElement('div', { style: { minWidth: isMobile ? 0 : 860 } },
              !isMobile && React.createElement('div', { style: { display: "grid", gridTemplateColumns: cols, gap: 10, padding: "9px 18px", fontSize: 11, fontWeight: 700, color: "#475467", textTransform: "uppercase", letterSpacing: ".04em", background: "#F9FAFB", borderBottom: "1px solid #E4E7EC" } },
                React.createElement('span', null, "Établissement"), IND.map(i => React.createElement('span', { key: i.k, style: { textAlign: "center" } }, i.l.replace("machines ", "").replace("lignes ", ""))), React.createElement('span', null)),
              lignesT.length === 0 && React.createElement('div', { style: { padding: "16px 18px", fontSize: 13, color: "#2F855A" } }, "✓ Rien à signaler : l'inventaire correspond déjà à NinjaOne."),
              lignesT.map(r => {
                const ouvert = invNinjaOuvert === r.hotel;
                return React.createElement('div', { key: r.hotel },
                  React.createElement('div', { onClick: () => setInvNinjaOuvert(ouvert ? "" : r.hotel),
                      style: { display: "grid", gridTemplateColumns: cols, gap: 10, padding: "10px 18px", alignItems: "center", fontSize: 13.5, borderBottom: "1px solid #F2F4F7", cursor: "pointer", background: ouvert ? "#F4F6FB" : "white" } },
                    React.createElement('span', { style: { fontWeight: 600, color: "#1a1a3e" } }, r.hotel),
                    IND.map(i => React.createElement('span', { key: i.k, style: { textAlign: isMobile ? "left" : "center" } }, isMobile && i.n(r) ? i.n(r) + " " + i.l : isMobile ? null : pastilleN(i.n(r), i))),
                    React.createElement('span', { style: { color: "#667085", fontSize: 12, textAlign: "right" } }, ouvert ? "▲" : "▼")),
                  ouvert && React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))", gap: 14, padding: "12px 18px 16px", background: "#FAFBFD", borderBottom: "1px solid #E4E7EC", fontSize: 12.5, lineHeight: 1.6 } },
                    bloc("Doublons possibles", "#B42318", r.doublons || []),
                    bloc("Ajoutées", "#067647", r.ajoutes),
                    bloc("Mises à jour", "#1a1a3e", r.mis_a_jour.map(m => m.nom).concat((r.rapprochements || []).map(x => "rapprochée : " + x))),
                    bloc("Autre hôte", "#B54708", r.ecarts),
                    bloc("Absentes de NinjaOne", "#475467", r.absents.concat(r.erreurs.map(e => "⚠ donnée partielle : " + e)))),
                  ouvert && r.hotelId && invHotel !== r.hotelId && React.createElement('div', { style: { padding: "0 18px 12px", background: "#FAFBFD" } },
                    React.createElement('button', { onClick: () => invChoisirHotel(r.hotelId), style: { background: "none", border: "none", color: G2, fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: 0 } }, "Ouvrir l'inventaire de " + r.hotel + " →")));
              }),
              !filtre && ok.length > avecQqch.length && React.createElement('div', { style: { padding: "10px 18px", fontSize: 12.5, color: "#475467" } }, "+ " + (ok.length - avecQqch.length) + " établissement(s) sans changement"),
              (ko.length > 0 || introuvables.length > 0) && React.createElement('div', { style: { padding: "10px 18px", fontSize: 12.5, borderTop: "1px solid #F2F4F7", lineHeight: 1.6 } },
                ko.map((r, i) => React.createElement('div', { key: "k" + i, style: { color: "#B42318" } }, "✗ " + r.hotel + " : " + r.erreur)),
                introuvables.length > 0 && React.createElement('div', { style: { color: "#667085" } }, "Sans organisation NinjaOne correspondante (renseignez « Nom NinjaOne » sur la fiche établissement) : " + introuvables.map(r => r.hotel).join(", "))))));
      })(),

      // ===== Synthèse de tous les hôtels =====
      !invHotel && invVue === "actions" && invVueActions(),
      !invHotel && invVue === "hotels" && (() => {
        const ETATS = {
          vide:     { l: "Non renseigné", c: "#718096", bg: "#EEF0F4", rang: 4 },
          corriger: { l: "À corriger", c: "#C53030", bg: "#FDE2E2", rang: 1 },
          echeance: { l: "Care Pack < 90 j", c: "#C05621", bg: "#FFF3E8", rang: 2 },
          ok:       { l: "OK", c: "#2F855A", bg: "#E6F6EA", rang: 3 },
        };
        const lignes = hotels.map(h => {
          const rs = invSynth.rows.filter(r => r.hotel_id === h.id);
          const phys = rs.filter(r => r.type === "Physique").length, vm = rs.filter(r => r.type === "VM").length;
          const pasAJour = rs.filter(r => r.a_jour === "Non").length;
          const cps = rs.map(invCarePack);
          const expires = cps.filter(c => c.l === "Expiré").length, bientot = cps.filter(c => c.l === "Moins de 90 j").length;
          const sansAv = rs.filter(r => r.antivirus === "Non" || (invEstWindows(r) && !r.antivirus)).length;
          const etat = !rs.length ? "vide" : (pasAJour || expires || sansAv) ? "corriger" : bientot ? "echeance" : "ok";
          const dates = rs.map(r => r.date_controle).filter(Boolean).sort();
          const note = (invSynth.notes.find(n => n.hotel_id === h.id) || {}).notes || "";
          return { h, n: rs.length, phys, vm, pasAJour, expires, bientot, sansAv, etat, dernier: dates.pop() || null, note };
        }).sort((a, b) => ETATS[a.etat].rang - ETATS[b.etat].rang || String(a.h.name).localeCompare(String(b.h.name)));
        const compte = (k) => lignes.filter(x => x.etat === k).length;
        const visibles = invFiltre === "tous" ? lignes : lignes.filter(x => x.etat === invFiltre);
        const chip = (k, lbl, nbv, c, bg) => React.createElement('button', { key: k, onClick: () => setInvFiltre(k),
          style: { padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "1px solid " + (invFiltre === k ? c : "#E2E2EA"), background: invFiltre === k ? bg : "white", color: c } }, lbl + " " + nbv);
        const badge = (txt, c, bg) => React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: c, background: bg, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" } }, txt);
        const cols = isMobile ? "1fr" : "minmax(0,1.2fr) 140px 130px minmax(0,1.3fr) 110px minmax(0,1fr)";
        return React.createElement('div', null,
          React.createElement('div', { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 } },
            chip("tous", "Tous", lignes.length, "#1a1a3e", "#F1F1F6"),
            chip("corriger", "À corriger", compte("corriger"), ETATS.corriger.c, ETATS.corriger.bg),
            chip("echeance", "Care Pack < 90 j", compte("echeance"), ETATS.echeance.c, ETATS.echeance.bg),
            chip("ok", "OK", compte("ok"), ETATS.ok.c, ETATS.ok.bg),
            chip("vide", "Non renseignés", compte("vide"), ETATS.vide.c, ETATS.vide.bg)),
          invSynth.loading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement de la synthèse…"),
          !invSynth.loading && React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, overflow: "hidden" } },
            !isMobile && React.createElement('div', { style: { display: "grid", gridTemplateColumns: cols, gap: 12, padding: "9px 14px", background: SB, color: "white", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" } },
              React.createElement('div', null, "Établissement"), React.createElement('div', null, "État"), React.createElement('div', null, "Serveurs"), React.createElement('div', null, "Points à traiter"), React.createElement('div', null, "Dernier contrôle"), React.createElement('div', null, "Notes / actions")),
            visibles.length === 0 && React.createElement('div', { style: { padding: 24, textAlign: "center", color: "#999", fontSize: 13 } }, "Aucun établissement dans ce filtre."),
            visibles.map(x => {
              const e = ETATS[x.etat];
              const pts = [];
              if (x.pasAJour) pts.push(badge(x.pasAJour + " pas à jour", "#C53030", "#FDE2E2"));
              if (x.expires) pts.push(badge(x.expires + " Care Pack expiré" + (x.expires > 1 ? "s" : ""), "#C53030", "#FDE2E2"));
              if (x.bientot) pts.push(badge(x.bientot + " Care Pack < 90 j", "#C05621", "#FFF3E8"));
              if (x.sansAv) pts.push(badge(x.sansAv + " sans antivirus", "#6B46C1", "#F3EEFC"));
              return React.createElement('div', { key: x.h.id, onClick: () => invChoisirHotel(x.h.id),
                style: { display: "grid", gridTemplateColumns: cols, gap: isMobile ? 6 : 12, padding: "10px 14px", borderTop: "1px solid #F0F0F5", alignItems: "center", cursor: "pointer", borderLeft: "4px solid " + e.c },
                onMouseEnter: ev => ev.currentTarget.style.background = "#FAFAFD", onMouseLeave: ev => ev.currentTarget.style.background = "white" },
                React.createElement('div', { style: { fontSize: 13.5, fontWeight: 700, color: "#1a1a3e" } }, x.h.name),
                React.createElement('div', null, badge(e.l, e.c, e.bg)),
                React.createElement('div', { style: { fontSize: 12.5, color: x.n ? "#333" : "#BBB" } }, x.n ? x.phys + " physique" + (x.phys > 1 ? "s" : "") + " · " + x.vm + " VM" : "—"),
                React.createElement('div', { style: { display: "flex", gap: 5, flexWrap: "wrap" } }, pts.length ? pts : React.createElement('span', { style: { fontSize: 12, color: "#BBB" } }, "—")),
                React.createElement('div', { style: { fontSize: 12.5, color: x.dernier ? "#333" : "#BBB" } }, x.dernier ? fmtD(x.dernier) : "jamais"),
                React.createElement('div', { style: { fontSize: 12, color: "#777", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: x.note }, x.note ? "📝 " + x.note.replace(/\n+/g, " · ") : "—")
              );
            })
          )
        );
      })(),

      // ===== Inventaire d'un hôtel =====
      invHotel && invLoading && React.createElement('div', { style: { padding: 20, color: "#999", fontSize: 13 } }, "Chargement…"),
      invHotel && !invLoading && !invErr && (() => {
        // Ordre d'affichage : chaque hôte physique puis ses VM ; VM sans hôte à la fin
        const tops = invRows.filter(r => !r.parent_id || !invRows.some(p => p.id === r.parent_id)).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
        const liste = [];
        tops.forEach(t => {
          liste.push({ r: t, vm: false });
          invRows.filter(r => r.parent_id === t.id).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).forEach(r => liste.push({ r, vm: true }));
        });
        const nPb = invRows.filter(r => problemes(r).length).length;
        const dernier = invRows.map(r => r.date_controle).filter(Boolean).sort().pop();
        const sel = (r, champ, options, w) => {
          const m = ouiNon(r[champ]);
          return React.createElement('select', { value: r[champ] || "", onChange: e => invMaj(r, { [champ]: e.target.value || null }),
            style: { ...inS, minWidth: w || 70, fontWeight: 700, color: m.c, background: r[champ] ? m.bg : "white" } },
            React.createElement('option', { value: "" }, "—"), options.map(o => React.createElement('option', { key: o, value: o }, o)));
        };
        const txt = (r, champ, ph, w, extra) => React.createElement('input', Object.assign({ key: r.id + champ + (r.maj_le || ""), defaultValue: r[champ] || "", placeholder: ph || "",
          onBlur: e => { const v = e.target.value.trim(); if (v !== (r[champ] || "")) invMaj(r, { [champ]: v || null }); }, style: { ...inS, minWidth: w || 90 } }, extra || {}));
        const date = (r, champ) => React.createElement('input', { type: "date", value: r[champ] || "", onChange: e => invMaj(r, { [champ]: e.target.value || null }), style: { ...inS, minWidth: 128 } });
        const th = (t, extra) => React.createElement('th', { style: Object.assign({ padding: "7px 8px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", textAlign: "left", whiteSpace: "nowrap", background: SB, color: "white", position: "sticky", top: 0 }, extra || {}) }, t);
        const grp = (t, n, c) => React.createElement('th', { colSpan: n, style: { padding: "5px 8px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textAlign: "left", background: c, color: "white", borderLeft: "2px solid white" } }, t);
        const td = (contenu, extra) => React.createElement('td', { style: Object.assign({ padding: "5px 6px", borderTop: "1px solid #F0F0F5", verticalAlign: "middle" }, extra || {}) }, contenu);
        return React.createElement('div', null,
          // Résumé
          React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" } },
            React.createElement('div', { style: { flex: 1, minWidth: 200 } },
              React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: "#1a1a3e" } }, (hotel ? hotel.name : "") + " — inventaire serveurs"),
              React.createElement('div', { style: { fontSize: 12, color: "#888", marginTop: 2 } },
                invRows.filter(r => r.type === "Physique").length + " hôte(s) physique(s) · " + invRows.filter(r => r.type === "VM").length + " VM" + (dernier ? " · dernier contrôle le " + fmtD(dernier) : " · jamais contrôlé"))),
            nPb > 0 ? React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: "#C53030", background: "#FDE2E2", padding: "5px 12px", borderRadius: 20 } }, "⚠️ " + nPb + " serveur" + (nPb > 1 ? "s" : "") + " à corriger")
              : invRows.length > 0 && React.createElement('span', { style: { fontSize: 12.5, fontWeight: 700, color: "#2F855A", background: "#E6F6EA", padding: "5px 12px", borderRadius: 20 } }, "✅ Rien à corriger")),
          invRows.length === 0 && React.createElement('div', { style: { padding: 32, textAlign: "center", color: "#888", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0", marginBottom: 12 } },
            "Aucun serveur inventorié pour " + (hotel ? hotel.name : "cet hôtel") + ". Cliquez sur « + Ajouter un hôte physique », puis « + VM » sur la ligne de l'hôte."),
          invRows.length > 0 && invVueHotel(liste),
          // Tableau (défilement horizontal, colonne Serveur figée) : affiché sur demande
          invDetail && invRows.length > 0 && React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, overflow: "auto", maxHeight: "70vh", marginBottom: 12 } },
            React.createElement('table', { style: { borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 12.5 } },
              React.createElement('thead', null,
                React.createElement('tr', null, grp("SERVEUR", 7, "#2D3748"), grp("MISES À JOUR", 2, "#2B6CB0"), grp("CARE PACK", 5, "#6B46C1"), grp("ANTIVIRUS", 3, "#C05621"), grp("CONTRÔLE", 4, "#2F855A")),
                React.createElement('tr', null,
                  th("Serveur", { left: 0, zIndex: 3, minWidth: 190 }), th("Adresse IP"), th("Physique / VM"), th("Rôle"), th("OS / Hyperviseur"), th("Version / Build"), th(""),
                  th("À jour ?"), th("Dernière MAJ"),
                  th("Care Pack ?"), th("N° série / Réf."), th("Fin Care Pack"), th("Jours"), th("Statut"),
                  th("Antivirus ?"), th("Nom"), th("À jour ?"),
                  th("Date contrôle"), th("Technicien"), th("Commentaire"), th(""))),
              React.createElement('tbody', null,
                liste.map(({ r, vm }) => {
                  const cp = invCarePack(r);
                  const pb = problemes(r);
                  const fond = vm ? "white" : "#F7F7FB";
                  return React.createElement(React.Fragment, { key: r.id }, React.createElement('tr', { style: { background: fond } },
                    td(React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 6, paddingLeft: vm ? 18 : 0 } },
                        React.createElement('span', { style: { color: "#BBB" } }, vm ? "└" : ""),
                        React.createElement('span', null, r.type === "Physique" ? "🖥️" : "▫️"),
                        txt(r, "nom", "Nom", 120, { style: { ...inS, minWidth: 120, fontWeight: 700, color: "#1a1a3e", background: fond } }),
                        pb.length > 0 && React.createElement('span', { title: pb.join(" · "), style: { color: "#C53030", fontSize: 13, cursor: "help" } }, "⚠")),
                      { position: "sticky", left: 0, zIndex: 1, background: fond, borderLeft: "4px solid " + (pb.length ? "#C53030" : r.type === "Physique" ? "#2D3748" : "transparent") }),
                    td(txt(r, "ip", "IP", 110, { style: { ...inS, minWidth: 110, fontFamily: "monospace", fontSize: 12 } })),
                    td(React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 3 } },
                      React.createElement('select', { value: r.type || "", onChange: e => invMaj(r, { type: e.target.value || null, ...(e.target.value === "Physique" ? { parent_id: null } : {}) }), style: { ...inS, minWidth: 92 } },
                        React.createElement('option', { value: "" }, "—"), ["Physique", "VM"].map(o => React.createElement('option', { key: o, value: o }, o))),
                      r.type === "VM" && React.createElement('select', { value: r.parent_id || "", title: "Hôte physique de cette VM", onChange: e => invMaj(r, { parent_id: e.target.value || null }), style: { ...inS, minWidth: 92, fontSize: 11, padding: "2px 4px", color: r.parent_id ? "#555" : "#B7791F" } },
                        React.createElement('option', { value: "" }, "Hôte ?"),
                        invRows.filter(x => x.type === "Physique" && x.id !== r.id).map(x => React.createElement('option', { key: x.id, value: x.id }, "sur " + x.nom))))),
                    td(txt(r, "role", "Rôle", 110)),
                    td(txt(r, "os", "OS", 160, { list: "inv-os" })),
                    td(txt(r, "version", "Version / build", 140)),
                    td(r.type === "Physique" ? React.createElement('button', { onClick: () => invAjouter(r), title: "Ajouter une VM sur cet hôte", style: { padding: "4px 8px", background: "white", border: "1px solid " + G, color: G2, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } }, "+ VM") : null),
                    td(sel(r, "a_jour", ["Oui", "Non"])), td(date(r, "derniere_maj")),
                    td(sel(r, "care_pack", ["Oui", "Non", "N/A"])), td(txt(r, "care_pack_ref", "N° série / réf.", 120)), td(React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 3 } }, date(r, "care_pack_fin"), invAlerteCarePack(r))),
                    td(React.createElement('span', { style: { fontWeight: 700, color: cp.c } }, cp.j === null ? "" : String(cp.j)), { textAlign: "right", background: "#F4F4F8" }),
                    td(cp.l ? React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: cp.c, background: cp.bg, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" } }, cp.l) : null, { background: "#F4F4F8" }),
                    td(sel(r, "antivirus", ["Oui", "Non"])), td((() => {
                      const av = avReconnaitre(r.antivirus_nom);
                      const autre = !!(r.antivirus_nom && !av);
                      const choisir = (v) => {
                        if (v === "__autre") { const n = (window.prompt("Nom de l'antivirus :", autre ? r.antivirus_nom : "") || "").trim(); if (n) invMaj(r, { antivirus_nom: n, ...(r.antivirus ? {} : { antivirus: "Oui" }) }); return; }
                        const it = AV_LISTE.find(x => x.k === v);
                        invMaj(r, it ? { antivirus_nom: it.l, ...(r.antivirus === "Oui" ? {} : { antivirus: "Oui" }) } : { antivirus_nom: null });
                      };
                      return React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 175 } },
                        avLogo(r.antivirus_nom, 22),
                        React.createElement('select', { value: av ? av.k : (autre ? "__autre" : ""), onChange: e => choisir(e.target.value), title: r.antivirus_nom || "", style: { ...inS, minWidth: 140, fontWeight: r.antivirus_nom ? 600 : 400 } },
                          React.createElement('option', { value: "" }, "—"),
                          AV_LISTE.map(x => React.createElement('option', { key: x.k, value: x.k }, x.l)),
                          React.createElement('option', { value: "__autre" }, autre ? "Autre : " + r.antivirus_nom : "Autre…")));
                    })()), td(sel(r, "av_a_jour", ["Oui", "Non"])),
                    td(date(r, "date_controle")), td(txt(r, "technicien", "Technicien", 90, { list: "inv-techs" })), td(txt(r, "commentaire", "Commentaire", 200)),
                    td(React.createElement('button', { onClick: () => invSupprimer(r), title: "Supprimer cette ligne", style: { padding: "3px 7px", background: "none", border: "1px solid #F5C6C6", color: "#C53030", borderRadius: 6, fontSize: 11, cursor: "pointer" } }, "🗑"))
                  ), invEstVeeam(r) && invLigneLicence(r, fond));
                }))
            )
          ),
          // Notes / actions
          React.createElement('div', { style: { background: "white", border: "1px solid #E8E8F0", borderRadius: 12, padding: "12px 16px" } },
            React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: "#1a1a3e", marginBottom: 6 } }, "📝 Notes / actions à mener"),
            React.createElement('textarea', { key: invHotel + ":" + (invNotes ? "1" : "0"), defaultValue: (invNotes && invNotes.notes) || "", onBlur: e => invEnregNotes(e.target.value),
              placeholder: "Ex. : NAS à inventorier, mettre à jour ESXi / Unifi / Veeam…", rows: 4, style: { ...inS, fontSize: 13, resize: "vertical", lineHeight: 1.5 } }),
            invNotes && invNotes.maj_par && React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 4 } }, "Modifié par " + invNotes.maj_par + (invNotes.maj_le ? " le " + new Date(invNotes.maj_le).toLocaleDateString("fr-FR") : ""))),
          React.createElement('datalist', { id: "inv-os" }, OS_LISTE.map(n => React.createElement('option', { key: n, value: n }))),
                    React.createElement('datalist', { id: "inv-techs" }, nomsTech.map(n => React.createElement('option', { key: n, value: n })))
        );
      })(),

      // ===== Aperçu de la reprise depuis les fiches Infrastructure =====
      invImport && (() => {
        const items = invImport.items || [];
        const maj = (key, champs) => setInvImport(prev => ({ ...prev, items: prev.items.map(x => x.key === key ? { ...x, ...champs } : x) }));
        const groupes = {};
        items.forEach(x => { (groupes[x.hotel_id] = groupes[x.hotel_id] || []).push(x); });
        const nbSel = items.filter(x => x.sel).length;
        const cellS = { padding: "4px 6px", borderTop: "1px solid #F0F0F5", fontSize: 12.5, verticalAlign: "middle" };
        const fermer = () => { if (!invImport.busy) setInvImport(null); };
        return React.createElement('div', { onClick: e => { if (e.target === e.currentTarget) fermer(); }, style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 } },
          React.createElement('div', { style: { background: "white", borderRadius: 12, width: 1100, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" } },
            React.createElement('div', { style: { padding: "16px 20px", borderBottom: "1px solid #EEE" } },
              React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: "#1a1a3e" } }, "📥 Reprise depuis les fiches Infrastructure"),
              React.createElement('div', { style: { fontSize: 12.5, color: "#777", marginTop: 4, lineHeight: 1.5 } },
                "Serveurs trouvés dans les tableaux des fiches (hôtes ESXi, serveurs / VM). Vérifiez, corrigez le type ou le nom si besoin, décochez ce qui n'est pas un serveur, puis importez. Les comptes et mots de passe ne sont jamais repris ; les lignes déjà présentes dans l'inventaire sont décochées.")),
            React.createElement('div', { style: { flex: 1, overflow: "auto", padding: "10px 20px" } },
              invImport.loading && React.createElement('div', { style: { padding: 20, color: "#999" } }, "Lecture des fiches Infrastructure…"),
              !invImport.loading && !items.length && !invImport.err && React.createElement('div', { style: { padding: "14px 4px", color: "#555", fontSize: 13, lineHeight: 1.6 } },
                !invImport.nbDocs
                  ? React.createElement('div', null, React.createElement('b', null, "Aucune fiche de catégorie « Infrastructure » " + (invImport.hotelId ? "pour cet établissement." : "trouvée.")),
                      React.createElement('div', { style: { color: "#888" } }, "Créez-la dans Clients → Infrastructure (catégorie « Infrastructure »), avec un tableau des hôtes ESXi et un tableau des serveurs / VM, puis relancez la reprise."))
                  : React.createElement('div', null,
                      React.createElement('b', null, invImport.nbDocs + " fiche(s) Infrastructure lue(s), mais aucun tableau de serveurs reconnu :"),
                      React.createElement('ul', { style: { margin: "6px 0", paddingLeft: 20, color: "#666" } }, (invImport.fiches || []).map((f, i) => React.createElement('li', { key: i }, (invImport.hotelId ? "" : ((hotels.find(h => h.id === f.hotel_id) || {}).name || "?") + " — ") + f.titre + " : " + (f.tableaux ? f.tableaux + " tableau(x)" : "aucun tableau (texte libre ou pièce jointe)")))),
                      React.createElement('div', { style: { color: "#888" } }, "La reprise lit les tableaux ayant une colonne « Hôte », « Serveur », « Nom » ou « Rôle ». Envoyez une capture de la fiche à l'équipe pour adapter la lecture."))),
              Object.keys(groupes).map(hid => {
                const lst = groupes[hid];
                const h = hotels.find(x => x.id === hid);
                const tous = lst.every(x => x.sel);
                return React.createElement('div', { key: hid, style: { marginBottom: 14, border: "1px solid #E8E8F0", borderRadius: 9, overflow: "hidden" } },
                  React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F7F7FB" } },
                    React.createElement('input', { type: "checkbox", checked: tous, onChange: e => setInvImport(prev => ({ ...prev, items: prev.items.map(x => x.hotel_id === hid ? { ...x, sel: e.target.checked } : x) })) }),
                    React.createElement('b', { style: { fontSize: 13.5, color: "#1a1a3e" } }, h ? h.name : "?"),
                    React.createElement('span', { style: { fontSize: 12, color: "#888" } }, lst.filter(x => x.sel).length + " / " + lst.length + " sélectionné(s)")),
                  React.createElement('table', { style: { width: "100%", borderCollapse: "collapse" } },
                    React.createElement('tbody', null, lst.map(x => React.createElement('tr', { key: x.key, style: { opacity: x.sel ? 1 : .5 } },
                      React.createElement('td', { style: { ...cellS, width: 26 } }, React.createElement('input', { type: "checkbox", checked: x.sel, onChange: e => maj(x.key, { sel: e.target.checked }) })),
                      React.createElement('td', { style: { ...cellS, width: 100 } }, React.createElement('select', { value: x.type, onChange: e => maj(x.key, { type: e.target.value }), style: { ...inS, padding: "3px 5px" } }, ["Physique", "VM"].map(o => React.createElement('option', { key: o, value: o }, o)))),
                      React.createElement('td', { style: { ...cellS, width: 170 } }, React.createElement('input', { value: x.nom, onChange: e => maj(x.key, { nom: e.target.value }), style: { ...inS, padding: "3px 6px", fontWeight: 700 } })),
                      React.createElement('td', { style: { ...cellS, color: "#555" } }, x.role || React.createElement('span', { style: { color: "#BBB" } }, "—")),
                      React.createElement('td', { style: { ...cellS, width: 120, fontFamily: "monospace", fontSize: 12, color: "#2B6CB0" } }, x.ip || ""),
                      React.createElement('td', { style: { ...cellS, width: 150, color: "#777", fontSize: 12 } }, x.type === "VM" && x.parentRef ? "sur " + x.parentRef : ""),
                      React.createElement('td', { style: { ...cellS, width: 170, color: "#999", fontSize: 11.5 } }, x.deja ? React.createElement('b', { style: { color: "#B7791F" } }, "déjà dans l'inventaire") : x.douteux ? React.createElement('span', { title: "Tableau qui ne parle pas explicitement de serveurs : cochez si c'en est un" }, "à vérifier · " + (x.section || x.source)) : (x.section || x.source))
                    ))))
                );
              })),
            React.createElement('div', { style: { padding: "12px 20px", borderTop: "1px solid #EEE", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
              invImport.err && React.createElement('div', { style: { flex: "1 1 100%", fontSize: 12.5, color: "#C53030" } }, "⚠️ " + invImport.err),
              invImport.fait != null && React.createElement('div', { style: { flex: "1 1 100%", fontSize: 12.5, color: "#2F855A", fontWeight: 600 } }, "✅ " + invImport.fait + " serveur(s) ajouté(s) à l'inventaire. Complétez maintenant les versions, mises à jour, Care Pack et antivirus."),
              React.createElement('span', { style: { fontSize: 12.5, color: "#555", marginRight: "auto" } }, nbSel + " serveur(s) à importer"),
              React.createElement('button', { onClick: fermer, style: { padding: "8px 14px", background: "white", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12.5, cursor: "pointer" } }, invImport.fait != null ? "Fermer" : "Annuler"),
              invImport.fait == null && React.createElement('button', { onClick: invLancerImport, disabled: !nbSel || invImport.busy, style: { padding: "8px 16px", background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: nbSel ? "pointer" : "default", opacity: nbSel && !invImport.busy ? 1 : .5 } }, invImport.busy ? "Import…" : "Importer la sélection"))
          ));
      })()
    );
  return content;
}
