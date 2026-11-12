// DSI Hotel — portail — app.js : composant App (états, actions, navigation) — chargé en DERNIER
// Script classique (pas de module) : les déclarations de haut niveau sont partagées entre fichiers.
function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { role, hotel_id }
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("knowledge");
  // Lien direct vers un ticket : ?ticket=DSI-2026-0082 dans l'URL
  const [pendingTicketRef, setPendingTicketRef] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("ticket");
      return p ? p.toUpperCase() : null;
    } catch (e) { return null; }
  });

  // ---------- RESPONSIVE / MOBILE ----------
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(dsiGetTheme());
  const [soundOn, setSoundOn] = useState(dsiGetSound());
  const toggleSound = () => { const v = !soundOn; setSoundOn(v); dsiSetSound(v); };
  const [groupsOpen, setGroupsOpen] = useState({});
  // Menu : méga-menu ouvert (ordinateur) et panneau « Plus » (mobile)
  const [megaOpen, setMegaOpen] = useState(null);
  const [plusOpen, setPlusOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setMegaOpen(null); setPlusOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Config des menus deroulants de la sidebar (ordre = position du 1er sous-item)
  const NAV_GROUPS = { assist: { icon: "🎧", label: "Assistance" }, hotel: { icon: "🏨", label: "Mon établissement" }, cli: { icon: "🏨", label: "Clients" }, sup: { icon: "🎧", label: "Support" }, sec: { icon: "🛡️", label: "Sécurité" }, org: { icon: "📅", label: "Organisation" }, rap: { icon: "📁", label: "Rapports" }, adm: { icon: "🛡️", label: "Administration" } };
  const toggleTheme = () => { const m = theme === "dark" ? "light" : "dark"; dsiApplyTheme(m); setTheme(m); };
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- DÉCONNEXION AUTO PAR INACTIVITÉ ----------
  const [idleWarning, setIdleWarning] = useState(false); // affiche l'avertissement "1 min restante"
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);   // panneau "mot de passe oublié"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");        // message succès/erreur

  // ---------- Réinitialisation self-service (lien email Supabase) ----------
  // recoveryMode : l'utilisateur est arrivé via le lien de réinitialisation.
  // Cet état a priorité sur le routage normal (voir écran dédié plus bas).
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPw, setRecoveryPw] = useState("");
  const [recoveryPw2, setRecoveryPw2] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryErr, setRecoveryErr] = useState("");
  const [recoveryDone, setRecoveryDone] = useState(false);
  // Étape TOTP quand le compte a la MFA : "pw" (saisie mot de passe) -> "mfa" (code) -> validation.
  const [recoveryStep, setRecoveryStep] = useState("pw");
  const [recoveryMfaCode, setRecoveryMfaCode] = useState("");
  const [recoveryMfaFactorId, setRecoveryMfaFactorId] = useState(null);

  // ---------- MFA (double authentification, obligatoire pour l'admin) ----------
  const [mfaState, setMfaState] = useState("checking"); // checking | ok | enroll | challenge
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaQr, setMfaQr] = useState(null);       // QR code (data URI) lors de l'enrôlement
  const [mfaSecret, setMfaSecret] = useState(""); // clé en clair, saisie manuelle si le QR ne passe pas
  const [secFactors, setSecFactors] = useState([]);      // liste des appareils MFA (page Sécurité)
  const [secLoading, setSecLoading] = useState(false);
  const [secAddQr, setSecAddQr] = useState(null);        // QR d'un nouvel appareil en cours d'ajout
  const [secAddSecret, setSecAddSecret] = useState("");
  const [secAddFactorId, setSecAddFactorId] = useState(null);
  const [secAddName, setSecAddName] = useState("");
  const [secAddCode, setSecAddCode] = useState("");
  const [secBusy, setSecBusy] = useState(false);
  const [secMsg, setSecMsg] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaErr, setMfaErr] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  // ---------- VISIONNEUSE D'IMAGES ----------
  // { images: [{file_url, file_name}], index: n } ou null si fermée
  const [viewer, setViewer] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = React.useRef(null);   // position de départ d'un glisser
  const pinchRef = React.useRef(null);  // écart initial entre deux doigts

  const ZOOM_MIN = 1, ZOOM_MAX = 6;
  const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const openViewer = (images, startIndex) => { resetZoom(); setViewer({ images, index: startIndex }); };
  const closeViewer = () => { resetZoom(); setViewer(null); };
  const viewerNext = () => { resetZoom(); setViewer(v => v ? { ...v, index: (v.index + 1) % v.images.length } : v); };
  const viewerPrev = () => { resetZoom(); setViewer(v => v ? { ...v, index: (v.index - 1 + v.images.length) % v.images.length } : v); };
  const goToImage = (i) => { resetZoom(); setViewer(v => v ? { ...v, index: i } : v); };

  // Molette : zoom centré sur le curseur
  const onWheelZoom = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    setZoom(prevZ => {
      const nextZ = clampZoom(prevZ * factor);
      if (nextZ === 1) setPan({ x: 0, y: 0 });
      else {
        // Garde le point sous le curseur à peu près fixe
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const ratio = nextZ / prevZ;
        setPan(p => ({ x: cx - (cx - p.x) * ratio, y: cy - (cy - p.y) * ratio }));
      }
      return nextZ;
    });
  };

  // Glisser à la souris (uniquement si zoomé)
  const onDragStart = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onDragMove = (e) => {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onDragEnd = () => { dragRef.current = null; };

  // Tactile : pincement à deux doigts, glissement à un doigt si zoomé
  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: touchDist(e.touches), zoom };
    } else if (e.touches.length === 1 && zoom > 1) {
      dragRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const next = clampZoom(pinchRef.current.zoom * (touchDist(e.touches) / pinchRef.current.dist));
      setZoom(next);
      if (next === 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && dragRef.current) {
      e.preventDefault();
      setPan({ x: e.touches[0].clientX - dragRef.current.x, y: e.touches[0].clientY - dragRef.current.y });
    }
  };
  const onTouchEnd = () => { pinchRef.current = null; dragRef.current = null; };

  // Navigation au clavier : ← → images, + − zoom, 0 réinitialise, Échap ferme
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowRight") viewerNext();
      else if (e.key === "ArrowLeft") viewerPrev();
      else if (e.key === "+" || e.key === "=") setZoom(z => clampZoom(z * 1.25));
      else if (e.key === "-") setZoom(z => { const n = clampZoom(z / 1.25); if (n === 1) setPan({ x: 0, y: 0 }); return n; });
      else if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [procedures, setProcedures] = useState([]);
  const [procsLoading, setProcsLoading] = useState(false);
  const [procFiles, setProcFiles] = useState({}); // { procId: [{name, url}] }

  const [kbCat, setKbCat] = useState("all");
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState(null);
  const [editCid, setEditCid] = useState(null);
  const [procq, setProcq] = useState(""); // barre de recherche unifiée (hôtels + procédures)
  const [showHotelPick, setShowHotelPick] = useState(false); // menu "changer d'hôtel"

  const [showProcForm, setShowProcForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [procForm, setProcForm] = useState({ title: "", cat: CATS[0], content: "", pinned: false, mots_cles: "" });
  const [procFormHotels, setProcFormHotels] = useState([]); // hotel_id cochés pour la procédure en cours d'édition
  const [procFormFiles, setProcFormFiles] = useState([]); // pending File objects to upload on submit
  const [procFormExistingFiles, setProcFormExistingFiles] = useState([]); // already-saved files when editing
  const [savingProc, setSavingProc] = useState(false);

  const [showClientForm, setShowClientForm] = useState(false);
  const [clientSearch, setClientSearch] = useState(""); // recherche dans la page Gérer les clients
  const [docHotelSearch, setDocHotelSearch] = useState(""); // recherche (hôtels + fiches) dans la page Infrastructure (admin)
  const [docHotelPick, setDocHotelPick] = useState(false);   // sélecteur « changer » d'hôtel (Infrastructure)
  const [docFocusId, setDocFocusId] = useState(null);        // fiche ouverte depuis la recherche (Infrastructure)
  const [showClientMap, setShowClientMap] = useState(false); // modale carte des clients
  const [mapGeoStatus, setMapGeoStatus] = useState(""); // état du géocodage
  // Carte des clients (Leaflet) : géocodage des adresses via Nominatim, cache navigateur.
  useEffect(() => {
    if (!showClientMap) return;
    let cancelled = false, mapObj = null;
    const t = setTimeout(() => {
      const el = document.getElementById("clientMap");
      if (!el || !window.L) { setMapGeoStatus("Carte indisponible (librairie non chargée)."); return; }
      mapObj = window.L.map(el).setView([46.6, 2.4], 6);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapObj);
      const cluster = window.L.markerClusterGroup ? window.L.markerClusterGroup({ maxClusterRadius: 44, showCoverageOnHover: false }) : null;
      if (cluster) mapObj.addLayer(cluster);
      const icon = window.L.divIcon({ className: "", html: '<div class="pin-red"></div>', iconSize: [20, 20], iconAnchor: [10, 18] });
      let cache = {}; try { cache = JSON.parse(localStorage.getItem("geoCache") || "{}"); } catch (e) {}
      const avecAdresse = (hotels || []).filter(h => (h.adresse_ville || h.adresse_rue));
      setMapGeoStatus("Localisation des clients… (0/" + avecAdresse.length + ")");
      let done = 0, placed = 0;
      (async () => {
        for (const h of avecAdresse) {
          if (cancelled) break;
          const q = [h.adresse_rue, h.adresse_cp, h.adresse_ville, h.adresse_pays || "France"].filter(Boolean).join(", ");
          let ll = cache[q];
          if (!ll) {
            try {
              const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q));
              const j = await r.json();
              if (j && j[0]) { ll = [parseFloat(j[0].lat), parseFloat(j[0].lon)]; cache[q] = ll; try { localStorage.setItem("geoCache", JSON.stringify(cache)); } catch (e) {} }
            } catch (e) {}
            await new Promise(res => setTimeout(res, 1100)); // respecte la limite Nominatim (1 req/s)
          }
          done++;
          if (ll && !cancelled) {
            const mk = window.L.marker(ll, { icon }).bindTooltip(h.name, { direction: "top", offset: [0, -16], className: "htip" });
            mk.on("click", () => { setShowClientMap(false); openEditClientForm(h); });
            if (cluster) cluster.addLayer(mk); else mk.addTo(mapObj);
            placed++;
          }
          if (!cancelled) setMapGeoStatus("Localisation des clients… (" + done + "/" + avecAdresse.length + ")");
        }
        if (!cancelled) setMapGeoStatus(placed + " client(s) placé(s) / " + avecAdresse.length + " avec adresse.");
      })();
    }, 80);
    return () => { cancelled = true; clearTimeout(t); if (mapObj) { try { mapObj.remove(); } catch (e) {} } };
  }, [showClientMap]);
  const [clientStats, setClientStats] = useState(null); // { tickets, procedures, docs } | "loading" | null

  // Compteurs récap d'un hôtel (tickets, procédures liées, fiches infrastructure).
  // Requêtes "count" légères : on ne récupère que des nombres, pas les lignes.
  const chargerClientStats = async (hotelId) => {
    if (!hotelId) { setClientStats(null); return; }
    setClientStats("loading");
    try {
      const [tk, pr, dc] = await Promise.all([
        sb.from("tickets").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId),
        sb.from("procedure_hotels").select("procedure_id", { count: "exact", head: true }).eq("hotel_id", hotelId),
        sb.from("hotel_docs").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId),
      ]);
      setClientStats({
        tickets: tk.count ?? 0,
        procedures: pr.count ?? 0,
        docs: dc.count ?? 0,
      });
    } catch (e) {
      setClientStats(null); // en cas d'erreur, on n'affiche simplement pas les compteurs
    }
  };

  // ---------- GESTION DES ADMINS (super-admin uniquement) ----------
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: "", pw: "", fullName: "", permissions: [] });
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [loginLogFilter, setLoginLogFilter] = useState("");
  const [njRapports, setNjRapports] = useState([]);
  const [njLoading, setNjLoading] = useState(false);
  const [njHotelFilter, setNjHotelFilter] = useState("all");
  const [adminErr, setAdminErr] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [editingAdminPerms, setEditingAdminPerms] = useState(null);
  // Gestion des téléphones MFA d'un autre administrateur (super-admin) : { admin, factors, loading, busy, msg }
  const [adminMfa, setAdminMfa] = useState(null);
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientForm, setClientForm] = useState({ name: "", city: "", stars: 4, phone: "", email: "", pw: "", stdEmail: "", stdPw: "", ninjaoneNom: "" });
  // Reconnaissance de l'hôtel des mails entrants (table hotel_reconnaissance_mail : domaines + mots-clés de signature)
  const [recoMail, setRecoMail] = useState([]);
  const [recoNew, setRecoNew] = useState({ type: "domaine", valeur: "" });
  const [addAccountHotel, setAddAccountHotel] = useState(null);
  const [addAccountForm, setAddAccountForm] = useState({ email: "", pw: "", level: "supervisor", mode: "add", oldEmail: "" });
  const [addAccountErr, setAddAccountErr] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [clientLogoFile, setClientLogoFile] = useState(null);
  const [clientNewFiles, setClientNewFiles] = useState([]);       // pièces jointes à uploader
  const [clientExistingFiles, setClientExistingFiles] = useState([]); // pièces jointes déjà enregistrées
  const [clientErr, setClientErr] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  const [supportForm, setSupportForm] = useState({ name: "", role: "Front Office", contactEmail: "", phone: "", cat: CATS[0], prio: "Moyenne", message: "", messageHtml: "", files: [] });

  // ---------- TEMPLATES (demandes RH/IT prédéfinies) ----------
  // Chaque template génère un ticket au support (trace + email) ET un PDF récapitulatif.
  const TEMPLATES = [
    {
      key: "arrivee", icon: "\uD83D\uDC64", titre: "Arrivée collaborateur (codes réseau)",
      desc: "Demande d'accès réseau et de codes pour un nouvel arrivant.",
      cat: "Création de compte", prio: "Moyenne",
      champs: [
        { k: "typeDemande", label: "Type de demande", type: "radio", options: ["Nouveau compte", "Modification"], req: true },
        { k: "compteAModifier", label: "Compte à modifier (nom / identifiant concerné)", showIfEquals: { typeDemande: "Modification" }, req: true },
        { k: "nom", label: "Nom et prénom du collaborateur", req: true },
        { k: "poste", label: "Poste / service", req: true },
        { k: "dateArrivee", label: "Date d'arrivée", type: "date", req: true },
        { k: "services", label: "Accès souhaités au Réseau Admin", type: "checkboxes", options: ["FO", "CONCIERGERIE", "HK", "FINANCE", "RH", "COMMERCIAL", "MARKETING", "GC&E", "RESERVATION", "F&B", "CUISINE", "TECH", "DIRECTION"], req: true },
        { k: "apps", label: "Accès applicatifs (PMS / logiciels)", type: "checkboxes", options: ["Opera", "PEP", "ONQ", "Protel", "Micros", "Agilysys"] },
        // Nouveau compte : création d'adresse mail
        { k: "creerMail", label: "Créer une adresse mail", type: "checkbox", showIfNotEquals: { typeDemande: "Modification" } },
        { k: "mailACreer", label: "Adresse mail à créer", showIf: "creerMail", showIfNotEquals: { typeDemande: "Modification" }, req: true },
        { k: "telMfa", label: "Numéro de téléphone pour le MFA", type: "tel", showIf: "creerMail", showIfNotEquals: { typeDemande: "Modification" } },
        { k: "groupesMail", label: "Groupes de distribution et boîtes partagées à inclure", type: "textarea", showIf: "creerMail", showIfNotEquals: { typeDemande: "Modification" } },
        // Modification : changement d'adresse mail (ancienne -> nouvelle)
        { k: "modifMail", label: "Modification adresse mail", type: "checkbox", showIfEquals: { typeDemande: "Modification" } },
        { k: "ancienMail", label: "Ancienne adresse mail", showIf: "modifMail", showIfEquals: { typeDemande: "Modification" }, req: true },
        { k: "nouveauMail", label: "Nouvelle adresse mail", showIf: "modifMail", showIfEquals: { typeDemande: "Modification" }, req: true },
        { k: "creerVpn", label: "Créer un VPN", type: "checkbox" },
        { k: "materiel", label: "Autre remarque", type: "textarea" },
        { k: "validateurEmail", label: "Email du validateur (RH / direction)", type: "validation", req: true },
        { k: "rdvCreneau", label: "Créneau de rendez-vous (1 seul, selon disponibilité)", type: "creneau" },
      ],
    },
    {
      key: "suppression", icon: "\uD83D\uDDD1\uFE0F", titre: "Suppression de compte",
      desc: "Demande de désactivation / suppression d'un compte (départ).",
      cat: "Création de compte", prio: "Haute",
      champs: [
        { k: "nom", label: "Nom et prénom du collaborateur", req: true },
        { k: "poste", label: "Poste / service", },
        { k: "dateDepart", label: "Date de départ / d'effet", type: "date", req: true },
        { k: "comptes", label: "Comptes à supprimer (messagerie, PMS, VPN…)", type: "textarea", req: true },
        { k: "donnees", label: "Que faire des données / emails ?", type: "textarea" },
      ],
    },
    {
      key: "modifmail", icon: "\uD83D\uDCE7", titre: "Modification Password",
      desc: "Demande de modification de mot de passe : messagerie et/ou compte Windows.",
      cat: "Problème Mot de Passe", prio: "Moyenne",
      champs: [
        { k: "nom", label: "Nom et prénom du collaborateur concerné", req: true },
        { k: "compte", label: "Compte / adresse mail concerné(e)", req: true },
        { k: "actions", label: "Que souhaitez-vous modifier ?", type: "checkboxes", options: ["Mot de passe de la messagerie (mail)", "Mot de passe du compte Windows"], req: true },
        { k: "remarque", label: "Remarque / précision", type: "textarea" },
        { k: "validateurEmail", label: "Email du validateur (RH / direction)", type: "validation", req: true },
      ],
    },
    {
      key: "installation", icon: "\uD83D\uDCBF", titre: "Demande Installation Programme",
      desc: "Installation d'une application sur un ou plusieurs ordinateurs, à un créneau souhaité.",
      cat: "Installation logiciel", prio: "Moyenne",
      champs: [
        { k: "postes", label: "Nom(s) du ou des ordinateurs (un par ligne)", type: "textarea", req: true },
        { k: "application", label: "Nom de l'application à installer", req: true },
        { k: "version", label: "Version (si connue)" },
        { k: "emplacement", label: "Où se trouve l'exécutable ? (chemin réseau, dossier ou lien de téléchargement)", type: "textarea", req: true },
        { k: "licence", label: "Licence / clé d'activation (si nécessaire)" },
        { k: "dateSouhaitee", label: "Date souhaitée", type: "date", req: true },
        { k: "creneauSouhaite", label: "Créneau horaire souhaité", type: "select", options: [...RDV_CRENEAUX, "Avant 9h30", "Après 17h30", "Indifférent"], req: true },
        { k: "dateAlternative", label: "Date alternative (si le créneau n'est pas possible)", type: "date" },
        { k: "remarque", label: "Remarque / précision", type: "textarea" },
      ],
    },
  ];
  // Détermine si un champ doit être affiché, selon ses conditions :
  //  - showIf: "cle"            -> visible si la case "cle" est cochée (=== true)
  //  - showIfEquals: { cle: v } -> visible si la valeur de "cle" vaut v
  //  - showIfNotEquals: { cle: v } -> visible si la valeur de "cle" ne vaut PAS v
  const champVisible = (ch, values) => {
    if (ch.showIf && values[ch.showIf] !== true) return false;
    if (ch.showIfNotEquals) {
      for (const cle in ch.showIfNotEquals) {
        if (values[cle] === ch.showIfNotEquals[cle]) return false;
      }
    }
    if (ch.showIfEquals) {
      for (const cle in ch.showIfEquals) {
        if (values[cle] !== ch.showIfEquals[cle]) return false;
      }
    }
    return true;
  };
  const [tplActif, setTplActif] = useState(null);        // template en cours de remplissage
  const [tplValues, setTplValues] = useState({});        // valeurs saisies
  const [tplDemandeur, setTplDemandeur] = useState({ name: "", email: "" });
  const [tplSending, setTplSending] = useState(false);
  const [creneauxPris, setCreneauxPris] = useState([]); // créneaux déjà réservés pour la date d'arrivée
  useEffect(() => {
    const chC = tplActif && tplActif.champs.find(c => c.type === "creneau");
    const d = tplValues.rdvJour;
    if (chC && d) { sb.rpc("creneaux_pris", { p_date: d }).then(({ data, error }) => { setCreneauxPris((!error && Array.isArray(data)) ? data : []); }); }
    else { setCreneauxPris([]); }
  }, [tplActif, tplValues.rdvJour]);
  const [tplError, setTplError] = useState("");
  const [tplOk, setTplOk] = useState("");

  const ouvrirTemplate = (tpl) => {
    setTplActif(tpl); setTplValues({}); setTplError(""); setTplOk("");
    setTplDemandeur({ name: "", email: "" });
  };

  // Charge une image (URL) en dataURL base64 pour l'insérer dans le PDF.
  const chargerImageBase64 = (url) => new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    let fini = false;
    const done = (v) => { if (!fini) { fini = true; resolve(v); } };
    setTimeout(() => done(null), 2500); // ne jamais bloquer le PDF au-delà de 2,5 s
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          done({ data: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
        } catch (e) { done(null); }
      };
      img.onerror = () => done(null);
      img.src = url;
    } catch (e) { done(null); }
  });

  // Génère un PDF récapitulatif du template rempli et le télécharge.
  // Génère une ATTESTATION DE VALIDATION (PDF) pour un ticket validé.
  const genererAttestation = async (t) => {
    const v = t && t.reference && validations[t.reference];
    if (!v || v.status !== "validated") { alert("Cette demande n'est pas encore validée."); return; }
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const mL = 18; let y = 20;
      const h = hotels.find(x => x.id === t.hotel_id);
      const nomHotel = h ? h.name : (v.hotel_name || "—");
      doc.setFillColor(26, 26, 62); doc.rect(0, 0, 210, 26, "F");
      const logo = await chargerImageBase64(h && h.logo_url);
      if (logo) { try { const hMax = 17, wLogo = Math.min(hMax * (logo.w / logo.h), 42); doc.addImage(logo.data, "PNG", 210 - wLogo - 12, 4.5, wLogo, hMax); } catch (e) {} }
      doc.setFontSize(16); doc.setTextColor(255, 255, 255);
      doc.text("ATTESTATION DE VALIDATION", mL, 16);
      y = 40;
      doc.setFontSize(11); doc.setTextColor(40, 40, 40);
      const ligne = (label, val) => {
        doc.setFont(undefined, "bold"); doc.setTextColor(26, 26, 62); doc.text(label, mL, y);
        doc.setFont(undefined, "normal"); doc.setTextColor(40, 40, 40);
        const lignes = doc.splitTextToSize(String(val || "—"), 120);
        lignes.forEach((l, i) => { doc.text(l, mL + 55, y + i * 6); });
        y += Math.max(6, lignes.length * 6) + 2;
      };
      ligne("Établissement :", nomHotel);
      ligne("Référence du ticket :", v.reference);
      ligne("Demande :", v.titre);
      ligne("Validée par :", v.validateur_email);
      ligne("Date de validation :", v.validated_at ? new Date(v.validated_at).toLocaleString("fr-FR") : "—");
      y += 4; doc.setDrawColor(226, 226, 232); doc.line(mL, y, 192, y); y += 8;
      doc.setFont(undefined, "bold"); doc.setTextColor(26, 26, 62); doc.setFontSize(11);
      doc.text("Récapitulatif de la demande", mL, y); y += 7;
      doc.setFont(undefined, "normal"); doc.setTextColor(50, 50, 50); doc.setFontSize(10);
      const recap = doc.splitTextToSize(String(t.message || v.recap || "—"), 174);
      recap.forEach(l => { doc.text(l, mL, y); y += 5.5; if (y > 270) { doc.addPage(); y = 20; } });
      y += 6;
      doc.setFontSize(9); doc.setTextColor(120, 120, 120);
      doc.text("Document généré automatiquement par le portail DSI Hotel — cette attestation constitue une preuve de validation.", mL, 284, { maxWidth: 174 });
      doc.save("Attestation_validation_" + (v.reference || "demande") + ".pdf");
    } catch (e) { alert("Erreur lors de la génération de l'attestation."); }
  };

  const genererTemplatePdf = async (tpl, values, ref) => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const mL = 16; let y = 18;
      const nomHotel = client ? client.name : "—";
      // Bandeau avec le nom de l'hôtel bien en évidence
      doc.setFillColor(26, 26, 62); doc.rect(0, 0, 210, 24, "F");
      // Logo de l'hôtel (si disponible), à droite du bandeau
      const logo = await chargerImageBase64(client && client.logo_url);
      if (logo) {
        try {
          const hMax = 16, ratio = logo.w / logo.h;
          const wLogo = Math.min(hMax * ratio, 40);
          doc.addImage(logo.data, "PNG", 210 - wLogo - 12, 4, wLogo, hMax);
        } catch (e) {}
      }
      doc.setFontSize(15); doc.setTextColor(255, 255, 255);
      doc.text(nomHotel, mL, 15);
      if (!logo) { doc.setFontSize(9); doc.setTextColor(210, 200, 160); doc.text("DSI Hotel — Demande interne", 194, 15, { align: "right" }); }
      y = 34;
      doc.setFontSize(14); doc.setTextColor(168, 135, 46);
      doc.text(tpl.titre, mL, y); y += 10;
      doc.setFontSize(10); doc.setTextColor(80, 80, 80);
      doc.text("Demandé par : " + (tplDemandeur.name || "—") + "  (" + (tplDemandeur.email || "—") + ")", mL, y); y += 6;
      doc.text("Date : " + new Date().toLocaleString("fr-FR"), mL, y); y += 6;
      if (ref) { doc.text("Référence ticket : " + ref, mL, y); y += 6; }
      y += 4;
      doc.setDrawColor(226, 226, 232); doc.line(mL, y, 194, y); y += 8;
      doc.setFontSize(11); doc.setTextColor(30, 30, 30);
      const fmt = (ch) => {
        const v = values[ch.k];
        if (ch.type === "checkboxes") return (Array.isArray(v) && v.length) ? v.join(", ") : "—";
        if (ch.type === "creneau") return v ? ((values.rdvJour ? formatJourRdv(values.rdvJour) + " · " : "") + v) : "—";
        if (ch.type === "checkbox") return v === true ? "Oui" : "Non";
        return (v === undefined || v === null || String(v).trim() === "") ? "—" : String(v);
      };
      tpl.champs.filter(ch => champVisible(ch, values)).forEach((ch) => {
        doc.setTextColor(26, 26, 62); doc.setFont(undefined, "bold");
        doc.text(ch.label + " :", mL, y); y += 6;
        doc.setTextColor(40, 40, 40); doc.setFont(undefined, "normal");
        const lignes = doc.splitTextToSize(fmt(ch), 174);
        lignes.forEach(l => { doc.text(l, mL, y); y += 6; if (y > 275) { doc.addPage(); y = 20; } });
        y += 2;
      });
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text("Document confidentiel — DSI Hotel • www.dsihotel.com", mL, 288);
      const nomFichier = "Demande_" + tpl.key + "_" + (client ? client.name.replace(/[^a-zA-Z0-9]/g, "_") : "hotel") + ".pdf";
      const blob = doc.output("blob");
      return { blob, nom: nomFichier };
    } catch (e) { return null; /* le PDF est un bonus : ne bloque pas l'envoi du ticket */ }
  };

  const soumettreTemplate = async () => {
    if (!tplActif) return;
    setTplError(""); setTplOk("");
    // Formatage lisible d'une valeur (texte, liste de cases, ou oui/non).
    const formatVal = (ch) => {
      const v = tplValues[ch.k];
      if (ch.type === "checkboxes") return (Array.isArray(v) && v.length) ? v.join(", ") : "-";
      if (ch.type === "creneau") return v ? ((tplValues.rdvJour ? formatJourRdv(tplValues.rdvJour) + " · " : "") + v) : "-";
      if (ch.type === "checkbox") return v === true ? "Oui" : "Non";
      return (v === undefined || v === null || String(v).trim() === "") ? "-" : String(v);
    };
    // Champs réellement visibles (on ignore ceux masqués par showIf).
    const champsVisibles = tplActif.champs.filter(ch => champVisible(ch, tplValues));
    // Validation des champs requis
    for (const ch of champsVisibles) {
      if (!ch.req) continue;
      const v = tplValues[ch.k];
      const vide = ch.type === "checkboxes" ? !(Array.isArray(v) && v.length) : !String(v || "").trim();
      if (vide) { setTplError("Merci de renseigner : " + ch.label); return; }
    }
    if (!String(tplDemandeur.name || "").trim()) {
      setTplError("Merci d'indiquer votre nom."); return;
    }
    const emailClean = nettoyerEmail(tplDemandeur.email || "").trim();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setTplError("Merci d'indiquer un email valide : c'est à cette adresse que le support répondra."); return;
    }
    // Côté administrateur DSI (non rattaché à un hôtel) : on ne crée pas de ticket,
    // on génère seulement le PDF récapitulatif à télécharger.
    if (isAdmin && !isSupervisor) {
      setTplSending(true);
      try {
        const pdf = await genererTemplatePdf(tplActif, tplValues, null);
        if (pdf && pdf.blob) {
          const url = URL.createObjectURL(pdf.blob);
          const a = document.createElement("a");
          a.href = url; a.download = pdf.nom; document.body.appendChild(a); a.click();
          document.body.removeChild(a); URL.revokeObjectURL(url);
          setTplOk("\u2713 PDF récapitulatif généré et téléchargé.");
        } else {
          setTplError("Impossible de générer le PDF.");
        }
      } catch (e) {
        setTplError("Erreur lors de la génération du PDF : " + (e.message || e));
      } finally {
        setTplSending(false);
      }
      return;
    }
    setTplSending(true);
    try {
      // Corps du message reprenant tous les champs
      const lignes = champsVisibles.map(ch => `${ch.label} : ${formatVal(ch)}`).join("\n");
      const nomHotel = client ? client.name : "Établissement inconnu";
      const enTete =
        `\uD83C\uDFE8  ${nomHotel.toUpperCase()}\n` +
        `Demande interne : ${tplActif.titre}\n` +
        `Demandé par : ${tplDemandeur.name || emailClean} (${emailClean})\n` +
        `Date : ${new Date().toLocaleString("fr-FR")}\n`;
      const message = `${enTete}\n${lignes}`;
      const subject = `${nomHotel} — ${tplActif.titre} [${tplActif.prio}]`;

      // 0) Génère le PDF récapitulatif (en mémoire) pour le joindre au ticket.
      const pdf = await genererTemplatePdf(tplActif, tplValues, null);

      // 1) Enregistre le ticket (trace / backup)
      let reference = null, ticketId = null;
      try {
        const ligneTicket = {
          hotel_id: myHotelId,
          contact_name: tplDemandeur.name || emailClean,
          contact_role: "Demande interne",
          contact_email: emailClean,
          category: tplActif.cat,
          priority: tplActif.prio,
          subject: `[Demande interne] ${tplActif.titre}`,
          message,
          status: "open",
          // Réponses structurées (lues par la création automatique des boîtes Microsoft 365)
          donnees_formulaire: { template: tplActif.key, ...tplValues }
        };
        let { data, error } = await sb.from("tickets").insert(ligneTicket).select().single();
        if (error && /donnees_formulaire/i.test(error.message || "")) {
          // Colonne pas encore créée (script provisioning_m365.sql) : enregistrement sans les réponses structurées.
          delete ligneTicket.donnees_formulaire;
          ({ data, error } = await sb.from("tickets").insert(ligneTicket).select().single());
        }
        if (data) { reference = data.reference || null; ticketId = data.id || null; }
      } catch (e) {}

      // 1b) Joint le PDF récapitulatif au ticket (visible côté DSI et côté client).
      if (pdf && pdf.blob && ticketId) {
        try {
          const pdfFile = new File([pdf.blob], pdf.nom, { type: "application/pdf" });
          const urlPdf = await uploadToStorage(pdfFile, "tickets");
          await sb.from("ticket_fichiers").insert({
            ticket_id: ticketId,
            message_id: null,
            file_name: pdf.nom,
            file_url: urlPdf,
            uploaded_by: "client"
          });
        } catch (e) { /* si l'upload échoue, le ticket reste créé */ }
      }

      // 2) Notifie l'équipe DSI par email
      const refPrefix = reference ? `[${reference}] ` : "";
      const lienTicket = reference ? `https://portail.dsihotel.com/?ticket=${encodeURIComponent(reference)}` : "https://portail.dsihotel.com/";
      const bodyTeam = message +
        "\n\n—————————————————————\n" +
        (reference ? `\uD83D\uDC49 Accéder au ticket ${reference} : ${lienTicket}\n` : "") +
        `Répondre à cet email répond directement au demandeur (${emailClean}).`;
      try {
        await fetchEmailApi({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: TEAM_EMAIL, cc: [SUPPORT_EMAIL], subject: refPrefix + subject, text: bodyTeam, replyTo: emailClean || undefined, fromName: (client ? client.name : "Client") })
        });
      } catch (e) {}

      // 3bis) Réservation du créneau de RDV (1 seul par date d'arrivée).
      try {
        const chCr = tplActif.champs.find(c => c.type === "creneau");
        const creneauChoisi = chCr ? tplValues[chCr.k] : null;
        const dateCr = tplValues.rdvJour;
        if (creneauChoisi && dateCr) {
          const { data: okCr } = await sb.rpc("reserver_creneau", { p_date: dateCr, p_creneau: creneauChoisi, p_ticket_id: ticketId, p_reference: reference, p_hotel_id: myHotelId, p_hotel_name: nomHotel, p_demandeur_nom: tplDemandeur.name || emailClean, p_demandeur_email: emailClean, p_collaborateur: tplValues.nom || "" });
          if (okCr === false) { alert("Le créneau " + creneauChoisi + " vient d'être réservé par quelqu'un d'autre pour cette date. Votre demande est bien enregistrée ; nous vous recontacterons pour convenir d'un autre horaire."); }
          else {
            const quandSup = formatJourRdv(dateCr) + " · " + creneauChoisi;
            const lienT = window.location.origin + window.location.pathname + "?ticket=" + encodeURIComponent(reference);
            const htmlSup = '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;color:#333"><div style="background:#1a1a3e;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0"><b>Nouveau créneau de RDV à valider</b></div><div style="border:1px solid #E8E8F0;border-top:none;border-radius:0 0 10px 10px;padding:20px"><p><b>' + (nomHotel || "") + '</b>' + (reference ? ' — ' + reference : '') + '</p><p>Demandeur : ' + (tplDemandeur.name || emailClean) + ' (' + emailClean + ')<br>Collaborateur : ' + (tplValues.nom || "-") + '</p><p style="text-align:center;margin:20px 0"><span style="display:inline-block;background:#F3EFDA;border:1px solid #E8C34A;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:700;color:#1a1a3e">📅 ' + quandSup + '</span></p><p style="text-align:center"><a href="' + lienT + '" style="display:inline-block;background:#C9A84C;color:#111;text-decoration:none;border-radius:8px;padding:11px 22px;font-weight:700">Valider / refuser dans le portail</a></p></div></div>';
            try { await fetchEmailApi({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: TEAM_EMAIL, cc: [SUPPORT_EMAIL], subject: (reference ? "[" + reference + "] " : "") + "Créneau RDV à valider — " + quandSup, text: "Nouveau créneau de RDV à valider : " + quandSup + " — " + (nomHotel || "") + " " + (reference || "") + ". Ouvrez le portail pour valider ou refuser.", html: htmlSup, fromName: "DSI Hotel" }) }); } catch (e) {}
          }
        }
      } catch (e) {}

      // 3) Validation par email (optionnelle) : crée le lien à token et l'envoie au validateur.
      let validationEnvoyee = false;
      const validateur = nettoyerEmail(tplValues.validateurEmail || "").trim();
      if (validateur) {
        try {
          const { data: sessV } = await sb.auth.getSession();
          const rv = await fetch(ADMIN_API_URL + "/creer-validation", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + (sessV.session?.access_token || "") },
            body: JSON.stringify({
              ticketId, reference, hotelId: myHotelId, hotelName: nomHotel,
              titre: tplActif.titre, recap: message,
              demandeurEmail: emailClean, validateurEmail: validateur,
            }),
          });
          const rvData = await rv.json().catch(() => ({}));
          if (rvData && rvData.lien) {
            const htmlValid =
              `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;color:#333">` +
              `<div style="background:#1a1a3e;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0"><b>${nomHotel}</b> — Demande à valider</div>` +
              `<div style="border:1px solid #E8E8F0;border-top:none;border-radius:0 0 10px 10px;padding:20px">` +
              `<p>Bonjour,</p><p>Une demande interne <b>${tplActif.titre}</b> a été soumise` +
              (reference ? ` (référence <b>${reference}</b>)` : "") + ` et requiert votre validation.</p>` +
              `<pre style="background:#F7F7FB;border:1px solid #ECECF3;border-radius:8px;padding:12px;white-space:pre-wrap;font-family:inherit;font-size:13px">${message.replace(/</g, "&lt;")}</pre>` +
              `<p style="text-align:center;margin:24px 0">` +
              `<a href="${rvData.lien}" style="display:inline-block;background:#2E7D32;color:#fff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:8px;margin:0 6px">\u2705 Valider la demande</a>` +
              `<a href="${(rvData.lien || "").replace("/valider", "/refuser")}" style="display:inline-block;background:#B03A2E;color:#fff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:8px;margin:0 6px">\u26D4 Refuser</a></p>` +
              `<p style="font-size:12px;color:#888">Si les boutons ne fonctionnent pas, copiez ce lien pour valider :<br>${rvData.lien}<br>Ou pour refuser :<br>${(rvData.lien || "").replace("/valider", "/refuser")}</p>` +
              `</div></div>`;
            await fetchEmailApi({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: validateur,
                subject: (reference ? `[${reference}] ` : "") + `Demande à valider — ${nomHotel} — ${tplActif.titre}`,
                text: `Une demande interne (${tplActif.titre}) requiert votre validation. Ouvrez ce lien pour valider : ${rvData.lien}`,
                html: htmlValid,
                replyTo: emailClean || undefined,
                fromName: (client ? client.name : "Client"),
              }),
            });
            validationEnvoyee = true;
          }
        } catch (e) {}
      }

      setTplOk("\u2713 Demande envoyée au support" + (reference ? " (réf. " + reference + ")" : "") + ". Le PDF récapitulatif est joint à la demande." + (validationEnvoyee ? " Une demande de validation a été envoyée à " + validateur + "." : ""));
      setTplValues({});
    } catch (e) {
      setTplError("Erreur lors de l'envoi : " + (e.message || e));
    } finally {
      setTplSending(false);
    }
  };

  const [procSearch, setProcSearch] = useState("");
  // Procédures suggérées en temps réel selon les mots-clés (formulaire de contact)
  const suggestedProcs = (() => {
    const q = procSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    // Ignore les petits mots vides qui créent du bruit
    const STOP = new Set(["pas", "les", "des", "une", "mon", "ma", "mes", "sur", "avec", "que", "qui", "est", "the", "de", "du", "au", "aux", "et", "ou"]);
    const mots = q.split(/[\s,'.]+/).filter(w => w.length >= 3 && !STOP.has(w));
    if (mots.length === 0) return [];
    const scored = (procedures || []).map(p => {
      const clesList = (p.mots_cles || "").toLowerCase().split(/[\s,]+/).filter(Boolean);
      const titre = (p.title || "").toLowerCase();
      let score = 0;
      mots.forEach(w => {
        // Correspondance sur un mot-clé dédié (mot entier ou inclusion nette)
        if (clesList.some(c => c === w || (w.length >= 4 && c.includes(w)) || (c.length >= 4 && w.includes(c)))) score += 3;
        if (titre.includes(w)) score += 1;
      });
      return { p, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map(x => x.p);
  })();
  const [supportSent, setSupportSent] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState("");

  // ---------- TICKETS ----------
  const [tickets, setTickets] = useState([]);
  const [validations, setValidations] = useState({}); // { reference: {status, validated_at, validateur_email} }
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState("open"); // open | closed | all | waiting | sheraton
  const [tkSortPresta, setTkSortPresta] = useState(false);
  const [techniciens, setTechniciens] = useState([]); // [{ id, nom, email }] — comptes admin assignables
  const [openTicketId, setOpenTicketId] = useState(null);
  const [ticketMsgs, setTicketMsgs] = useState({}); // { ticketId: [messages] }
  const [hoverTk, setHoverTk] = useState(null);     // { id, x, y } ticket survolé (aperçu dernière réponse client)
  const [ticketState, setTicketState] = useState({}); // { ticketId: "new" | "reply" | null }
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSel, setMergeSel] = useState([]); // ids de tickets sélectionnés
  const [mergeBusy, setMergeBusy] = useState(false)
  const [closeMode, setCloseMode] = useState(false);
  const [closeSel, setCloseSel] = useState([]); // ids de tickets à fermer en masse
  const [closeBusy, setCloseBusy] = useState(false)
  const [ticketView, setTicketView] = useState("table"); // "cards" | "table" — tableau par défaut
  const [tkMenu, setTkMenu] = useState(false); // menu « … » de la barre des tickets
  const [tkActMenu, setTkActMenu] = useState(null); // menu « … » des actions d'un ticket ouvert ("haut-<id>" / "bas-<id>")
  // Bouton « … » + menu déroulant d'actions secondaires (écran d'un ticket)
  const menuActionsTicket = (cle, items, versLeHaut) => {
    const ouvert = tkActMenu === cle;
    const liste = items.filter(Boolean);
    if (!liste.length) return null;
    return React.createElement('div', { style: { position: "relative" } },
      React.createElement('button', { type: "button", onClick: () => setTkActMenu(ouvert ? null : cle), "aria-label": "Autres actions", title: "Autres actions",
        style: { width: 34, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid " + (ouvert ? G : "#DDE0EA"), background: "white", color: "#555", borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700, lineHeight: 1, paddingBottom: 6 } }, "…"),
      ouvert && React.createElement('div', { onClick: () => setTkActMenu(null), style: { position: "fixed", inset: 0, zIndex: 44 } }),
      ouvert && React.createElement('div', { style: { position: "absolute", right: 0, [versLeHaut ? "bottom" : "top"]: "calc(100% + 6px)", zIndex: 45, minWidth: 230, background: "white", border: "1px solid #E2E4EE", borderRadius: 10, boxShadow: "0 12px 32px rgba(15,15,36,.18)", padding: 5 } },
        liste.map((it, k) => it === "sep"
          ? React.createElement('div', { key: "s" + k, style: { height: 1, background: "#EEF0F5", margin: "4px 2px" } })
          : React.createElement('button', { key: it.lib, type: "button", disabled: it.disabled, title: it.title || "", onClick: () => { setTkActMenu(null); it.fn(); },
              onMouseEnter: e => { if (!it.disabled) e.currentTarget.style.background = "#F5F5FB"; }, onMouseLeave: e => { e.currentTarget.style.background = "transparent"; },
              style: { display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", borderRadius: 6, fontSize: 13, color: it.disabled ? "#BBB" : (it.rouge ? "#C53030" : "#333"), cursor: it.disabled ? "default" : "pointer", fontFamily: "inherit" } }, it.lib))
      )
    );
  };
  const [ticketSearch, setTicketSearch] = useState(""); // terme de recherche tickets
  const [ticketBodies, setTicketBodies] = useState({}); // { ticket_id: "corps concaténé des messages" }
  const [ticketBodiesLoaded, setTicketBodiesLoaded] = useState(false); // corps chargés au moins une fois
  // Remarque interne (admin only) : note unique par ticket, jamais visible du client
  const [noteOpenId, setNoteOpenId] = useState(null);   // ticket dont l'éditeur de note est ouvert
  const [noteText, setNoteText] = useState("");          // contenu en cours d'édition
  const [noteBusy, setNoteBusy] = useState(false);       // sauvegarde en cours
  const [noteSaved, setNoteSaved] = useState({});        // { ticketId: true } — a une note enregistrée (indicateur)
  // Liste explicite des colonnes de tickets à charger côté portail.
  // note_interne en est VOLONTAIREMENT exclue : elle n'est jamais transmise
  // au navigateur par les requêtes de liste, et reste protégée en base.
  const TICKET_COLS_BASE = "id,hotel_id,contact_name,contact_email,contact_phone,contact_role,subject,message,category,priority,status,source,reference,created_at,closed_at,prestataire,en_attente,date_attente,assigned_to";
  // type_ticket (incident / demande) : script tickets_type.sql. Sans lui, repli automatique sur TICKET_COLS_BASE.
  const TICKET_COLS_TYPE = TICKET_COLS_BASE + ",type_ticket";
  // classement_auto : motif du classement automatique (script classement_tickets.sql)
  const TICKET_COLS = TICKET_COLS_TYPE + ",classement_auto,hotel_auto";
  const [replyText, setReplyText] = useState("");
  const [replyHtml, setReplyHtml] = useState(""); // contenu riche (HTML) de la réponse admin — images inline au curseur
  const [replyBusy, setReplyBusy] = useState(false);
  const [fwdTicket, setFwdTicket] = useState(null);   // ticket en cours de transfert
  const [fwdEmail, setFwdEmail] = useState("");        // destinataire du transfert
  const [fwdNote, setFwdNote] = useState("");          // message optionnel ajouté
  const [fwdBusy, setFwdBusy] = useState(false);
  const [fwdMsg, setFwdMsg] = useState("");            // retour d'état (succès/erreur)
  const [replyNote, setReplyNote] = useState(""); // info/erreur d'envoi email
  const [ticketFiles, setTicketFiles] = useState({}); // { ticketId: [fichiers] }
  const [telModal, setTelModal] = useState(null); // formulaire « Ticket téléphone » (null = fermé)
  const [replyFiles, setReplyFiles] = useState([]);   // fichiers à joindre à la réponse en cours
  const [replyImageUrls, setReplyImageUrls] = useState([]); // images (URLs) issues d'une réponse type
  const [replyCcList, setReplyCcList] = useState([]);      // adresses CC cochées pour l'envoi
  const [replyCcManual, setReplyCcManual] = useState("");  // champ d'ajout manuel d'une adresse CC

  // ---------- DOCUMENTATION TECHNIQUE (admin uniquement) ----------
  const [docs, setDocs] = useState([]);
  const [rappelsDus, setRappelsDus] = useState([]); // fiches dont le rappel est échu ou proche (accueil admin)
  const [docsLoading, setDocsLoading] = useState(false);
  const [docFiles, setDocFiles] = useState({});       // { docId: [fichiers] }
  const [docHotelId, setDocHotelId] = useState(null); // hôtel sélectionné dans l'onglet
  const [docCatFilter, setDocCatFilter] = useState("all");
  const [showDocForm, setShowDocForm] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [docForm, setDocForm] = useState({ titre: "", categorie: DOC_CATS[0], description: "", visible_client: false, rappel_date: "", rappel_note: "", video_url: "" });
  const [docNewFiles, setDocNewFiles] = useState([]);
  const [docExistingFiles, setDocExistingFiles] = useState([]);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docErr, setDocErr] = useState("");

  const isAdmin = profile?.role === "admin";
  const [creneauTicket, setCreneauTicket] = useState(null);
  const [creneauCommentaire, setCreneauCommentaire] = useState("");
  const [creneauBusy, setCreneauBusy] = useState(false);
  useEffect(() => {
    if (!openTicketId || !isAdmin) { setCreneauTicket(null); setCreneauCommentaire(""); return; }
    sb.rpc("creneau_du_ticket", { p_ticket_id: openTicketId }).then(({ data, error }) => { setCreneauTicket((!error && data) ? data : null); });
  }, [openTicketId, isAdmin]);
  const statuerCreneauTicket = async (statut) => {
    if (!creneauTicket) return;
    setCreneauBusy(true);
    try {
      const { error } = await sb.rpc("statuer_creneau", { p_id: creneauTicket.id, p_statut: statut, p_commentaire: creneauCommentaire || null });
      if (error) throw error;
      const quand = formatJourRdv(creneauTicket.date_rdv) + " · " + creneauTicket.creneau;
      const valide = statut === "valide";
      const com = (creneauCommentaire || "").trim();
      const html = '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;color:#333"><div style="background:' + (valide ? "#1a1a3e" : "#7A2E2E") + ';color:#fff;padding:16px 20px;border-radius:10px 10px 0 0"><b>Rendez-vous ' + (valide ? "confirmé" : "à reprogrammer") + '</b></div><div style="border:1px solid #E8E8F0;border-top:none;border-radius:0 0 10px 10px;padding:20px"><p>Bonjour ' + (creneauTicket.demandeur_nom || "") + ',</p>' + (valide ? '<p>Votre créneau est confirmé :</p><p style="text-align:center;margin:18px 0"><span style="display:inline-block;background:#F3EFDA;border:1px solid #E8C34A;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:700;color:#1a1a3e">📅 ' + quand + '</span></p>' : '<p>Le créneau demandé (<b>' + quand + '</b>) ne peut pas être retenu. Merci de reprendre un autre créneau disponible.</p>') + (com ? '<p style="background:#F6F6FA;border-left:3px solid #C9A84C;padding:10px 12px;font-size:13px"><b>Commentaire DSI :</b><br>' + com + '</p>' : '') + '</div></div>';
      try { await fetchEmailApi({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: creneauTicket.demandeur_email, subject: (creneauTicket.reference ? "[" + creneauTicket.reference + "] " : "") + "Créneau RDV " + (valide ? "confirmé" : "à reprogrammer") + " — " + quand, text: (valide ? "Votre créneau est confirmé : " : "Créneau non retenu, merci de reprendre un créneau : ") + quand + (com ? " — " + com : ""), html: html, fromName: "DSI Hotel" }) }); } catch (e) {}
      setCreneauTicket(null); setCreneauCommentaire("");
    } catch (e) { alert("Erreur : " + (e.message || e)); }
    finally { setCreneauBusy(false); }
  };
  const isSupervisor = profile?.role === "supervisor";
  // Liste des techniciens assignables (comptes admin) — RPC SECURITY DEFINER réservée aux admins.
  useEffect(() => {
    if (!isAdmin) return;
    sb.rpc("liste_techniciens").then(({ data, error }) => {
      if (!error && Array.isArray(data)) setTechniciens(data.map(t => ({ id: t.id, nom: nomTechDepuis(t), email: t.email || "" })).sort((a, b) => a.nom.localeCompare(b.nom, "fr")));
    });
  }, [isAdmin]);
  // ---------- MULTI-HÔTELS (superviseur de groupe) ----------
  const [mesHotels, setMesHotels] = useState([]); // [{ id, name, city, logo_url }]
  const [hotelChoisi, setHotelChoisi] = useState(() => { try { return sessionStorage.getItem("dsi-hotel-choisi") === "1"; } catch (e) { return false; } });
  const [hotelSwitchBusy, setHotelSwitchBusy] = useState(false);
  useEffect(() => {
    if (!profile || profile.role !== "supervisor" || mfaState !== "ok") { setMesHotels([]); return; }
    sb.rpc("mes_hotels").then(({ data, error }) => { setMesHotels((!error && Array.isArray(data)) ? data : []); });
  }, [profile, mfaState]);
  const multiHotel = isSupervisor && mesHotels.length > 1;
  useEffect(() => { if (page === "capex" && (isAdmin || multiHotel)) loadCapex(); }, [page, profile, multiHotel]);
  const changerHotelActif = async (hid) => {
    if (!hid) return;
    setHotelSwitchBusy(true);
    try {
      if (hid !== profile?.hotel_id) {
        const { error } = await sb.rpc("changer_hotel_actif", { p_hotel_id: hid });
        if (error) throw error;
      }
      try { sessionStorage.setItem("dsi-hotel-choisi", "1"); } catch (e) {}
      // Rechargement complet : toutes les données (tickets, procédures, rapports…)
      // sont relues pour le nouvel hôtel. La session MFA (AAL2) est conservée.
      window.location.href = window.location.pathname;
    } catch (e) {
      alert("Impossible de changer d'établissement : " + (e.message || e));
      setHotelSwitchBusy(false);
    }
  };
  // ---------- CAPEX (plan d'investissement par hôtel) ----------
  const CAPEX_STATUTS = ["Proposé", "Validé", "Commandé", "Réalisé", "Refusé"];
  const CAPEX_STATUT_COUL = { "Proposé": "#B7791F", "Validé": "#2B6CB0", "Commandé": "#6B46C1", "Réalisé": "#2F855A", "Refusé": "#C53030" };
  const CAPEX_PRIOS = ["Obligatoire", "Recommandé", "Confort"];
  const CAPEX_PRIO_COUL = { "Obligatoire": "#C53030", "Recommandé": "#DD6B20", "Confort": "#718096" };
  const CAPEX_CATS = ["Postes de travail", "Serveurs / stockage", "Réseau / Wi-Fi", "Sécurité", "Téléphonie", "Vidéosurveillance", "Logiciels / licences", "Projet / migration", "Autre"];
  const [cxRows, setCxRows] = useState([]);
  const [cxLoading, setCxLoading] = useState(false);
  const [cxErr, setCxErr] = useState("");
  const [cxHotel, setCxHotel] = useState("all");
  const [cxAnnee, setCxAnnee] = useState("all");
  const [cxStatut, setCxStatut] = useState("all");
  const [cxModal, setCxModal] = useState(null);   // null | "new" | ligne
  const [cxForm, setCxForm] = useState(null);
  const [cxNewFiles, setCxNewFiles] = useState([]);
  const [cxSaving, setCxSaving] = useState(false);
  // Lignes automatiques (inventaire NinjaOne) : listes de machines dépliées + panneau de réglages admin
  const [cxOuverts, setCxOuverts] = useState({});
  const [cxAuto, setCxAuto] = useState({ ouvert: false, config: null, etats: [], busy: "", msg: "", apercu: null });
  const loadCxAuto = async () => {
    const [c, e] = await Promise.all([
      sb.from("capex_auto_config").select("*").eq("id", 1).maybeSingle(),
      sb.from("capex_auto_etat").select("*"),
    ]);
    if (c.error || e.error) { setCxAuto(prev => ({ ...prev, msg: "❌ " + ((c.error || e.error).message) + " (script capex_auto.sql exécuté ?)" })); return; }
    setCxAuto(prev => ({ ...prev, config: c.data || { prix_poste: 900, prix_portable: 1100, prix_serveur: 6500, actif: true }, etats: e.data || [] }));
  };
  const loadCapex = async () => {
    setCxLoading(true); setCxErr("");
    const { data, error } = await sb.from("capex").select("*").order("annee", { ascending: true }).order("created_at", { ascending: true });
    if (error) setCxErr("Erreur de chargement : " + error.message + " (le script capex.sql a-t-il été exécuté ?)");
    else setCxRows(data || []);
    setCxLoading(false);
  };
  const cxAuteur = () => { const n = (profile && profile.full_name ? String(profile.full_name).trim() : ""); return n || (session && session.user ? session.user.email : ""); };
  const cxMaj = async (row, patch) => {
    const maj = { ...patch, updated_at: new Date().toISOString(), updated_by: session?.user?.id || null, updated_by_nom: cxAuteur() };
    const { error } = await sb.from("capex").update(maj).eq("id", row.id);
    if (error) { alert("Erreur : " + error.message); return false; }
    setCxRows(prev => prev.map(x => x.id === row.id ? { ...x, ...maj } : x));
    return true;
  };
  // Menu « Technicien » : un seul compte par nom (deux comptes admin peuvent porter le même nom).
  // En cas de doublon, on garde le compte connecté, sinon le premier. Les doublons masqués
  // restent connus pour afficher le nom des tickets qui leur sont déjà assignés.
  const techniciensMenu = (() => {
    const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
    const moi = session && session.user ? session.user.id : null;
    const parNom = {};
    techniciens.forEach(t => { const k = norm(t.nom); if (!parNom[k] || t.id === moi) parNom[k] = t; });
    return techniciens.filter(t => parNom[norm(t.nom)] === t);
  })();
  const nomTechnicien = (id) => { if (!id) return ""; const t = techniciens.find(x => x.id === id); return t ? t.nom : "Technicien inconnu"; };
  const assignerTechnicien = async (ticket, techId) => {
    const val = techId || null;
    const { error } = await sb.from("tickets").update({ assigned_to: val }).eq("id", ticket.id);
    if (error) { alert("Erreur lors de l'assignation : " + error.message); return; }
    setTickets(prev => prev.map(x => x.id === ticket.id ? { ...x, assigned_to: val } : x));
  };
  const mfaRequired = isAdmin || isSupervisor; // MFA obligatoire pour admins et superviseurs
 const isSuperAdmin = isAdmin && ["support@dsihotel.com", "pascal.sanglier@dsihotel.fr"].includes((profile?.email || "").toLowerCase());
  // Le super-admin a tout ; les autres admins ont leur liste de permissions
  const hasPerm = (perm) => isSuperAdmin || (profile?.permissions || []).includes(perm);
  const ADMIN_SECTIONS = [
    { key: "clients",    page: "client-admin",       icon: "🏨", label: "Établissements", grp: "cli" },
    { key: "procedures", page: "proc-admin",         icon: "📚", label: "Procédures clients", grp: "cli" },
    { key: "docs",       page: "docs-techniques",    icon: "🗂️", label: "Infrastructure", grp: "cli" },
    { key: "tickets",    page: "historique-comptes", icon: "🗃️", label: "Historique des comptes", grp: "cli" },
    { key: "tickets",    page: "tickets-admin",      icon: "🎫", label: "Tickets", grp: "sup" },
    { key: "reponses",   page: "reponses-types",     icon: "💬", label: "Réponses types", grp: "sup" },
    { key: "tickets",    page: "aide-interne",       icon: "📖", label: "Base de connaissances interne", grp: "sup" },
    { key: "projets",    page: "projets",            icon: "📊", label: "Projets", grp: "org" },
    { key: "tickets",    page: "planning",           icon: "📅", label: "Planning équipe", grp: "org" },
    { key: "docs",       page: "backups",            icon: "💾", label: "Sauvegardes", grp: "sec" },
    { key: "docs",       page: "sophos",             icon: "🔒", label: "Sécurité Sophos", grp: "sec" },
    { key: "docs",       page: "m365",               icon: "🛡️", label: "Sécurité Microsoft", grp: "sec" },
    { key: "docs",       page: "licences-m365",      icon: "🪪", label: "Licences Microsoft 365", grp: "sec" },
    { key: "docs",       page: "checklist",          icon: "✅", label: "Check-list", grp: "sec" },
    { key: "docs",       page: "inventaire",         icon: "🗄️", label: "Inventaire serveurs", grp: "sec" },
    { key: "tickets",    page: "rapport-jour",       icon: "📄", label: "Rapport du jour", grp: "rap" },
    { key: "tickets",    page: "rapport-tickets",    icon: "📈", label: "Suivi des tickets", grp: "rap" },
    { key: "rapports",   page: "rapports",           icon: "📝", label: "Rapports d'intervention", grp: "rap" },
    { key: "rapports",   page: "capex",              icon: "💰", label: "CAPEX", grp: "rap" },
    { key: "ninjaone",   page: "ninjaone",           icon: "🖥️", label: "Rapports de sécurité", grp: "rap" },
  ];
  // Libellés des droits (page Administrateurs) : un droit par clé, sans doublon.
  const PERM_LABELS = {
    clients: "🏨 Établissements", procedures: "📚 Procédures clients",
    docs: "🗂️ Infrastructure, sauvegardes et rapports de sécurité",
    tickets: "🎫 Tickets, planning, rapports et historique des comptes",
    projets: "📊 Projets", rapports: "📝 Rapports d'intervention", reponses: "💬 Réponses types",
  };
  useEffect(() => {
    if (!isAdmin) return;
    const allowedPages = ADMIN_SECTIONS.filter(s => hasPerm(s.key === "ninjaone" ? "docs" : s.key)).map(s => s.page);
    if (isSuperAdmin) allowedPages.push("admins");
    if (isSuperAdmin) allowedPages.push("login-logs");
    allowedPages.push("securite");
    if (isSuperAdmin) allowedPages.push("suppr-ticket");
    const adminPages = [...ADMIN_SECTIONS.map(s => s.page), "admins", "login-logs", "securite", "suppr-ticket"];
    if (adminPages.includes(page) && !allowedPages.includes(page) && page !== "proc-detail") {
      if (allowedPages.length > 0) setPage(allowedPages[0]);
    }
  }, [page, profile]);
  // Un compte standard (client) ne peut pas rester sur "Mes demandes"
  useEffect(() => {
    if (profile && profile.role === "client" && page === "tickets-client") {
      setPage("knowledge");
    }
  }, [page, profile]);
  const myHotelId = profile?.hotel_id;

  // Lien direct vers un ticket (?ticket=DSI-XXXX) : on va sur la page Tickets…
  useEffect(() => {
    if (pendingTicketRef && isAdmin && page !== "tickets-admin") {
      setPage("tickets-admin");
    }
  }, [pendingTicketRef, profile]);

  // …puis, une fois les tickets chargés, on ouvre celui qui correspond à la référence.
  useEffect(() => {
    if (!pendingTicketRef || !isAdmin || tickets.length === 0) return;
    const cible = tickets.find(t => (t.reference || "").toUpperCase() === pendingTicketRef);
    if (cible) {
      setTicketFilter("all"); // s'assure qu'il est visible même s'il est fermé
      setOpenTicketId(cible.id);
      loadTicketMsgs(cible.id);
      loadTicketFiles(cible.id);
      setPendingTicketRef(null); // ne s'ouvre qu'une fois
      // Nettoie l'URL pour ne pas rouvrir au prochain rechargement
      try { window.history.replaceState({}, "", window.location.pathname); } catch (e) {}
    }
  }, [pendingTicketRef, tickets, profile]);

  const client = isAdmin ? hotels.find(h => h.id === editCid) : hotels.find(h => h.id === myHotelId);
  const selP = procedures.find(p => p.id === selId);

  // ---------- AUTH ----------
  useEffect(() => {
    // Détecte un retour via le lien de réinitialisation : Supabase place
    // type=recovery dans le hash de l'URL (#access_token=...&type=recovery).
    // On le repère tôt pour afficher l'écran dédié plutôt que router dans l'app.
    try {
      const h = window.location.hash || "";
      if (h.includes("type=recovery")) setRecoveryMode(true);
    } catch (e) {}
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = sb.auth.onAuthStateChange((event, sess) => {
      // PASSWORD_RECOVERY : session temporaire créée par le lien email.
      // Elle autorise updateUser mais ne doit PAS faire entrer dans l'app.
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (recoveryMode) return; // en réinitialisation : ne pas charger le profil ni router
    if (!session) {
      setProfile(null); setMfaState("checking");
      window.__dsiPageInit = false; // réinitialise pour la prochaine connexion
      return;
    }
sb.from("profiles").select("role, hotel_id, permissions, full_name").eq("id", session.user.id).single()
      .then(({ data, error }) => {
        if (!error && data) {
          setProfile({ ...data, email: session.user.email });
          // On ne fixe la page de départ QU'UNE FOIS (première connexion).
          // Sinon, au retour d'onglet, le rafraîchissement de session
          // (TOKEN_REFRESHED) ramènerait l'utilisateur sur la page par défaut.
          if (!window.__dsiPageInit) {
            window.__dsiPageInit = true;
            const refDirect = data.role === "admin" && pendingTicketRef;
            setPage(refDirect ? "tickets-admin" : "accueil");
          }
        }
      });
  }, [session, recoveryMode]);

  // ---------- JOURNAL DE CONNEXIONS ----------
  // Enregistre la connexion une fois la session pleinement authentifiée
  // (MFA validé pour les admins). Ne dépend PAS de `profile` (qui peut manquer
  // ou charger en retard) : l'email vient de la session, le rôle est optionnel.
  // Garde anti-doublon : id utilisateur + jour.
  useEffect(() => {
    if (!session || mfaState !== "ok") return;
    // On attend le profil pour enregistrer le bon rôle (admin/supervisor/client).
    // Ce log couvre TOUS les comptes.
    if (!profile) return;
    // Mode "dernière connexion" (upsert) : on met à jour la ligne du compte
    // dès que la session est authentifiée — y compris une session déjà active
    // (rechargement de page). Garde léger par session pour éviter de ré-upserter
    // à chaque re-render : on ne rejoue pas si c'est le même access_token.
    const marqueur = session.access_token || session.user.id;
    if (window.__dsiLoggedToken === marqueur) return;
    window.__dsiLoggedToken = marqueur;
    (async () => {
      try {
        // On passe par une fonction SQL SECURITY DEFINER (record_login) qui écrit
        // la ligne en forçant user_id = auth.uid() : évite le refus RLS de l'upsert.
        const { error } = await sb.rpc("record_login", {
          p_email: session.user.email,
          p_role: profile.role || null,
        });
        if (error) {
          window.__dsiLoggedToken = null;
          console.warn("record_login refusé :", error.message || error);
        }
      } catch (e) {
        window.__dsiLoggedToken = null;
        console.warn("record_login exception :", e && (e.message || e));
      }
    })();
  }, [session, profile, mfaState]);

  // ---------- MFA : contrôle d'accès obligatoire pour les admins ----------
  // Démarre l'enrôlement TOTP : génère le QR code à scanner
  const startEnroll = async (existingFactors) => {
    try {
      // Nettoie d'éventuels facteurs non vérifiés restés d'une tentative précédente
      const stale = (existingFactors?.totp || []).filter(f => f.status !== "verified");
      for (const f of stale) { try { await sb.auth.mfa.unenroll({ factorId: f.id }); } catch (e) {} }

      const { data, error } = await sb.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Premier appareil " + Date.now()
      });
      if (error) throw error;
      setMfaFactorId(data.id);
      setMfaQr(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaState("enroll");
    } catch (e) {
      setMfaErr("Impossible de démarrer l'enrôlement : " + (e.message || e));
      setMfaState("enroll");
    }
  };

  // aal1 = mot de passe seul ; aal2 = mot de passe + code TOTP validé
  // MFA obligatoire pour les administrateurs ET les superviseurs d'hôtel.
  useEffect(() => {
    if (!session || !profile) return;
    if (profile.role !== "admin" && profile.role !== "supervisor") { setMfaState("ok"); return; }

    let cancelled = false;
    (async () => {
      try {
        const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (cancelled) return;

        // Session déjà élevée en aal2 : rien à demander
        if (aal && aal.currentLevel === "aal2") { setMfaState("ok"); return; }

        // Un facteur TOTP vérifié existe-t-il déjà sur ce compte ?
        const { data: factors } = await sb.auth.mfa.listFactors();
        if (cancelled) return;
        const verified = (factors?.totp || []).filter(f => f.status === "verified");

        if (verified.length > 0) {
          // Facteur existant -> demander le code (challenge)
          setMfaFactorId(verified[0].id);
          setMfaState("challenge");
        } else {
          // Aucun facteur -> enrôlement forcé
          await startEnroll(factors);
        }
      } catch (e) {
        if (!cancelled) { setMfaErr("Erreur MFA : " + (e.message || e)); setMfaState("challenge"); }
      }
    })();
    return () => { cancelled = true; };
  }, [session, profile]);

  // Valide le code à 6 chiffres (enrôlement ou connexion)
  const submitMfaCode = async () => {
    const code = mfaCode.replace(/\s/g, "");
    if (code.length !== 6 || !mfaFactorId) { setMfaErr("Entrez le code à 6 chiffres."); return; }
    setMfaBusy(true);
    setMfaErr("");
    try {
      const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId: mfaFactorId });
      if (chErr) throw chErr;
      const { error: vErr } = await sb.auth.mfa.verify({
        factorId: mfaFactorId, challengeId: ch.id, code
      });
      if (vErr) throw vErr;
      setMfaCode("");
      setMfaQr(null);
      setMfaSecret("");
      setMfaState("ok");
    } catch (e) {
      setMfaErr("Code incorrect ou expiré. Vérifiez l'heure de votre téléphone et réessayez.");
    } finally {
      setMfaBusy(false);
    }
  };

  // ---------- LOAD HOTELS ----------
  useEffect(() => {
    if (!profile) return;
    setHotelsLoading(true);
    sb.from("hotels").select("*").order("name")
      .then(({ data, error }) => {
        if (!error && data) {
          setHotels(data);
          if (isAdmin && !editCid && data.length > 0) setEditCid(data[0].id);
        }
        setHotelsLoading(false);
      });
  }, [profile]);

  // ---------- LOAD PROCEDURES for relevant hotel ----------
  const activeHotelId = isAdmin ? editCid : myHotelId;
  useEffect(() => {
    if (!profile || !activeHotelId) return;
    setProcsLoading(true);
    // On passe par la table de liaison : toutes les procédures rattachées à cet hôtel
    sb.from("procedure_hotels").select("procedure_id").eq("hotel_id", activeHotelId)
      .then(({ data: liens, error: e1 }) => {
        if (e1) { setProcsLoading(false); return; }
        const ids = (liens || []).map(l => l.procedure_id);
        if (ids.length === 0) { setProcedures([]); setProcsLoading(false); return; }
        sb.from("procedures").select("*").in("id", ids).order("created_at")
          .then(({ data, error }) => {
            if (!error && data) setProcedures(data);
            setProcsLoading(false);
          });
      });
  }, [profile, activeHotelId]);

  const loadFilesFor = (procId) => {
    if (procFiles[procId]) return;
    sb.from("procedure_files").select("*").eq("procedure_id", procId)
      .then(({ data, error }) => {
        if (!error) setProcFiles(prev => ({ ...prev, [procId]: data || [] }));
      });
  };

  // Indique si un rapport d'activité est en cours de saisie non enregistrée.
  // On passe par une ref (et non par les états rapForm/rapLignes directement) car
  // go() est défini avant ces états : lire une ref est toujours sûr, la ref étant
  // tenue à jour par un effet placé plus bas, après les déclarations d'état.
  const rapDirtyRef = useRef(false);

  const go = (p, id = null) => {
    // Garde-fou : quitter la page Rapports avec une saisie en cours demande confirmation.
    if (p !== page && rapDirtyRef.current) {
      if (!window.confirm(
        "ATTENTION : un rapport est en cours de saisie.\n\n" +
        "Si vous changez de page, tout ce que vous avez saisi sera perdu.\n" +
        "(Vous pouvez d'abord cliquer sur « Enregistrer le brouillon » dans la fenêtre du rapport.)\n\n" +
        "Voulez-vous vraiment quitter cette page ?"
      )) return;
    }
    setPage(p);
    setSelId(id);
    setShowProcForm(false);
    setMenuOpen(false); // referme le menu mobile après navigation
    if (id && p === "proc-detail") loadFilesFor(id);
  };

  // ---------- LOGIN / LOGOUT ----------
  const doLogin = async () => {
    setLoggingIn(true);
    setLoginErr("");
    try { localStorage.setItem("dsi-last-activity", String(Date.now())); } catch (e) {}
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) setLoginErr("Email ou mot de passe incorrect.");
    setLoggingIn(false);
  };

  // Mot de passe oublié : réinitialisation self-service via l'email d'authentification
  // Supabase. L'utilisateur reçoit un lien qui le ramène sur le portail en mode
  // recovery (voir recoveryMode), où il définit lui-même son nouveau mot de passe.
  const submitForgot = async () => {
    const em = nettoyerEmail(forgotEmail || "").trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setForgotMsg("⚠️ Merci d'indiquer une adresse email valide.");
      return;
    }
    setForgotBusy(true);
    setForgotMsg("");
    try {
      const { error } = await sb.auth.resetPasswordForEmail(em, {
        redirectTo: "https://portail.dsihotel.com"
      });
      // Message volontairement générique : ne révèle pas si l'adresse existe.
      if (error) throw error;
      setForgotMsg("✅ Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.");
      setForgotEmail("");
    } catch (e) {
      setForgotMsg("❌ L'envoi a échoué (" + (e.message || e) + "). Réessayez ou contactez support@dsihotel.com.");
    } finally {
      setForgotBusy(false);
    }
  };

  // Contrôle de robustesse aligné sur la politique Supabase (niveau strict) :
  // minuscule + majuscule + chiffre + caractère spécial, 8 caractères minimum.
  // Renvoie un message d'erreur en français, ou null si le mot de passe est valide.
  const validerMotDePasse = (pw) => {
    if (!pw || pw.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (!/[a-z]/.test(pw)) return "Le mot de passe doit contenir au moins une minuscule.";
    if (!/[A-Z]/.test(pw)) return "Le mot de passe doit contenir au moins une majuscule.";
    if (!/[0-9]/.test(pw)) return "Le mot de passe doit contenir au moins un chiffre.";
    if (!/[^a-zA-Z0-9]/.test(pw)) return "Le mot de passe doit contenir au moins un caractère spécial (ex. ! @ # $ % & *).";
    return null;
  };

  // Applique réellement le nouveau mot de passe (session au bon niveau).
  const applyRecoveryPassword = async () => {
    const { error } = await sb.auth.updateUser({ password: recoveryPw.trim() });
    if (error) { setRecoveryErr("Erreur : " + error.message); return false; }
    setRecoveryDone(true);
    setRecoveryPw(""); setRecoveryPw2("");
    setRecoveryMfaCode(""); setRecoveryStep("pw");
    // Nettoie le hash de l'URL (retire les jetons du lien).
    try { window.history.replaceState(null, "", window.location.pathname); } catch (e) {}
    return true;
  };

  // Étape 1 : valide le mot de passe saisi. Si le compte a la MFA et que la
  // session n'est pas encore AAL2, on demande d'abord le code TOTP (Supabase
  // refuse updateUser sinon). Sinon, on applique directement.
  const submitRecovery = async () => {
    setRecoveryErr("");
    const p1 = recoveryPw.trim();
    const p2 = recoveryPw2.trim();
    const vErrPw = validerMotDePasse(p1);
    if (vErrPw) { setRecoveryErr(vErrPw); return; }
    if (p1 !== p2) { setRecoveryErr("Les deux mots de passe ne correspondent pas."); return; }
    setRecoveryBusy(true);
    try {
      let needMfa = false, factorId = null;
      try {
        const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.currentLevel !== "aal2") {
          const { data: factors } = await sb.auth.mfa.listFactors();
          const verified = (factors && factors.totp || []).filter(f => f.status === "verified");
          if (verified.length > 0) { needMfa = true; factorId = verified[0].id; }
        }
      } catch (e) {}
      if (needMfa) {
        setRecoveryMfaFactorId(factorId);
        setRecoveryStep("mfa");
        return; // on ne touche pas au mot de passe tant que l'AAL2 n'est pas atteint
      }
      await applyRecoveryPassword();
    } catch (e) {
      setRecoveryErr("Erreur : " + (e.message || e));
    } finally {
      setRecoveryBusy(false);
    }
  };

  // Étape 2 (comptes MFA) : valide le code TOTP -> élève la session en AAL2 ->
  // applique le nouveau mot de passe.
  const submitRecoveryMfa = async () => {
    setRecoveryErr("");
    const code = recoveryMfaCode.replace(/\s/g, "");
    if (code.length !== 6 || !recoveryMfaFactorId) { setRecoveryErr("Entrez le code à 6 chiffres."); return; }
    setRecoveryBusy(true);
    try {
      const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId: recoveryMfaFactorId });
      if (chErr) throw chErr;
      const { error: vErr } = await sb.auth.mfa.verify({ factorId: recoveryMfaFactorId, challengeId: ch.id, code });
      if (vErr) { setRecoveryErr("Code incorrect ou expiré. Vérifiez l'heure de votre téléphone et réessayez."); return; }
      await applyRecoveryPassword();
    } catch (e) {
      setRecoveryErr("Code incorrect ou expiré. Vérifiez l'heure de votre téléphone et réessayez.");
    } finally {
      setRecoveryBusy(false);
    }
  };
  // ---------- PAGE SÉCURITÉ : gestion des appareils MFA (super-admin) ----------
  const loadSecFactors = async () => {
    setSecLoading(true);
    try {
      const { data, error } = await sb.auth.mfa.listFactors();
      if (error) throw error;
      setSecFactors((data?.totp || []).filter(f => f.status === "verified"));
    } catch (e) {
      setSecFactors([]);
    } finally {
      setSecLoading(false);
    }
  };

  // Démarre l'ajout d'un NOUVEL appareil (sans toucher aux facteurs existants)
  const secStartAdd = async () => {
    setSecMsg("");
    setSecAddCode("");
    try {
      const nom = (secAddName || "").trim() || ("Appareil " + new Date().toLocaleDateString("fr-FR"));
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: nom });
      if (error) throw error;
      setSecAddFactorId(data.id);
      setSecAddQr(data.totp.qr_code);
      setSecAddSecret(data.totp.secret);
    } catch (e) {
      setSecMsg("Erreur : " + (e.message || e));
    }
  };

  // Valide le nouvel appareil avec le code à 6 chiffres
  const secConfirmAdd = async () => {
    const code = (secAddCode || "").replace(/\s/g, "");
    if (code.length !== 6 || !secAddFactorId) { setSecMsg("Entrez le code à 6 chiffres."); return; }
    setSecBusy(true); setSecMsg("");
    try {
      const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId: secAddFactorId });
      if (chErr) throw chErr;
      const { error: vErr } = await sb.auth.mfa.verify({ factorId: secAddFactorId, challengeId: ch.id, code });
      if (vErr) throw vErr;
      setSecAddQr(null); setSecAddSecret(""); setSecAddFactorId(null); setSecAddName(""); setSecAddCode("");
      setSecMsg("✓ Appareil ajouté.");
      await loadSecFactors();
    } catch (e) {
      setSecMsg("Code incorrect ou expiré. Vérifiez l'heure du téléphone et réessayez.");
    } finally {
      setSecBusy(false);
    }
  };

  const secCancelAdd = () => {
    // Annule : on désenrôle le facteur non vérifié créé pour l'ajout
    if (secAddFactorId) { sb.auth.mfa.unenroll({ factorId: secAddFactorId }).catch(() => {}); }
    setSecAddQr(null); setSecAddSecret(""); setSecAddFactorId(null); setSecAddName(""); setSecAddCode(""); setSecMsg("");
  };

  // Supprime un appareil. Sécurité : on refuse de retirer le DERNIER appareil
  // (sinon le compte se retrouverait sans MFA alors qu'il est obligatoire).
  const secRemove = async (factor) => {
    if (secFactors.length <= 1) {
      alert("Impossible de retirer le dernier appareil : votre compte doit conserver au moins une méthode MFA. Ajoutez un autre appareil avant de retirer celui-ci.");
      return;
    }
    if (!confirm("Retirer cet appareil (" + (factor.friendly_name || "sans nom") + ") ?\n\nIl ne pourra plus générer de codes pour ce compte.")) return;
    try {
      const { error } = await sb.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      await loadSecFactors();
    } catch (e) {
      alert("Erreur lors du retrait : " + (e.message || e));
    }
  };

  const doLogout = async (opts) => {
    window.__dsiLoggedToken = null;
    window.__dsiPageInit = false;
    try { localStorage.removeItem("dsi-last-activity"); } catch (e) {}
    try { sessionStorage.removeItem("dsi-hotel-choisi"); } catch (e) {}
    // Déconnexion automatique : on ne ferme QUE la session de ce navigateur
    // (scope "local"). Sinon, sur un compte hôtel partagé, l'inactivité d'un
    // poste déconnecterait tous les collègues connectés avec le même compte.
    try { await sb.auth.signOut(opts && opts.local ? { scope: "local" } : undefined); }
    catch (e) { try { await sb.auth.signOut({ scope: "local" }); } catch (e2) {} }
    setEmail(""); setPw(""); setHotels([]); setProcedures([]); setEditCid(null);
    setMfaState("checking"); setMfaFactorId(null); setMfaQr(null); setMfaSecret(""); setMfaCode(""); setMfaErr("");
  };

  // ---------- DÉCONNEXION AUTOMATIQUE APRÈS INACTIVITÉ ----------
  // Délai selon le rôle :
  //   - Admin : 6 h d'inactivité -> déconnexion (avertissement 2 min avant).
  //   - Superviseur / compte standard client : 15 min -> déconnexion
  //     (avertissement 1 min avant).
  // La dernière activité est mémorisée dans le navigateur (localStorage) :
  //   - le décompte continue quand l'onglet est en arrière-plan ou la fenêtre
  //     réduite (avant : il était suspendu, la session ne expirait jamais) ;
  //   - au retour sur l'onglet, ou à la réouverture du portail / du navigateur,
  //     une session inactive depuis trop longtemps est fermée immédiatement ;
  //   - plusieurs onglets ouverts partagent la même dernière activité.
  // Contrôle par intervalle (et non un seul setTimeout) : fiable même quand le
  // navigateur ralentit les minuteurs des onglets en arrière-plan.
  useEffect(() => {
    if (!session || recoveryMode) return; // uniquement quand l'utilisateur est connecté
    // On attend le profil (rôle) : sinon, pendant son chargement, un admin serait
    // contrôlé avec le délai court (15 min) et pourrait être déconnecté à tort.
    if (!profile) return;

    const KEY = "dsi-last-activity";
    const LOGOUT_AFTER = isAdmin ? 6 * 60 * 60 * 1000 : 15 * 60 * 1000;
    const WARN_BEFORE = isAdmin ? 2 * 60 * 1000 : 60 * 1000;
    let lastWrite = 0;
    let done = false;

    const lireDerniere = () => {
      try { const v = parseInt(localStorage.getItem(KEY) || "", 10); return isNaN(v) ? null : v; } catch (e) { return null; }
    };
    const ecrireMaintenant = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return; // limite les écritures (mousemove)
      lastWrite = now;
      try { localStorage.setItem(KEY, String(now)); } catch (e) {}
    };

    const verifier = () => {
      if (done) return;
      let derniere = lireDerniere();
      if (derniere === null) { ecrireMaintenant(); derniere = Date.now(); }
      const inactif = Date.now() - derniere;
      if (inactif >= LOGOUT_AFTER) {
        done = true;
        setIdleWarning(false);
        doLogout({ local: true });
        return;
      }
      setIdleWarning(inactif >= LOGOUT_AFTER - WARN_BEFORE);
    };

    // Toute activité de l'utilisateur met à jour l'horodatage
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    const onActivity = () => { if (!document.hidden) { ecrireMaintenant(); } };
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));

    // Retour sur l'onglet : on vérifie tout de suite (déconnexion si expiré)
    const onVisibility = () => { if (!document.hidden) verifier(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    verifier(); // au montage : ferme une session restée ouverte trop longtemps
    const timer = setInterval(verifier, 5000);

    return () => {
      clearInterval(timer);
      events.forEach(ev => window.removeEventListener(ev, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [session, isAdmin, recoveryMode, !!profile]);

  // Bouton "Je suis toujours là" : relance simplement l'activité
  const stayConnected = () => {
    setIdleWarning(false);
    try { localStorage.setItem("dsi-last-activity", String(Date.now())); } catch (e) {}
  };

  // ---------- HOTEL (CLIENT) CRUD ----------
  const openNewClientForm = () => {
    setEditingClientId(null);
    setClientForm({ name: "", city: "", stars: 4, phone: "", email: "", pw: "", stdEmail: "", stdPw: "", ninjaoneNom: "",
      groupe: "", gmNom: "", gmPrenom: "", gmEmail: "", rhNom: "", rhPrenom: "", rhEmail: "", techNom: "", techPrenom: "", techEmail: "",
      adrRue: "", adrCp: "", adrVille: "", adrPays: "" });
    setClientLogoFile(null);
    setClientNewFiles([]);
    setClientExistingFiles([]);
    setClientErr("");
    setClientStats(null); // pas de récap pour un nouveau client
    setShowClientForm(true);
  };
  const openEditClientForm = (h) => {
    setEditingClientId(h.id);
    setClientForm({ name: h.name, city: h.city || "", stars: h.stars || 4, phone: h.phone || "", email: h.account_email || "", pw: "", stdEmail: "", stdPw: "", ninjaoneNom: h.ninjaone_nom || "",
      groupe: h.groupe_hotelier || "", gmNom: h.gm_nom || "", gmPrenom: h.gm_prenom || "", gmEmail: h.gm_email || "",
      rhNom: h.rh_nom || "", rhPrenom: h.rh_prenom || "", rhEmail: h.rh_email || "",
      techNom: h.tech_nom || "", techPrenom: h.tech_prenom || "", techEmail: h.tech_email || "",
      adrRue: h.adresse_rue || "", adrCp: h.adresse_cp || "", adrVille: h.adresse_ville || "", adrPays: h.adresse_pays || "" });
    setClientLogoFile(null);
    setClientNewFiles([]);
    setClientExistingFiles([]);
    // Charge les pièces jointes existantes de l'hôtel
    sb.from("hotel_fichiers").select("*").eq("hotel_id", h.id).order("created_at")
      .then(({ data }) => setClientExistingFiles(data || [])).catch(() => {});
    setClientErr("");
    chargerClientStats(h.id); // récap tickets / procédures / fiches infra
    setShowClientForm(true);
  };

  const adminApiReady = ADMIN_API_URL && !ADMIN_API_URL.includes("VOTRE-WORKER");

  const callAdminApi = async (path, payload) => {
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(ADMIN_API_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text().catch(() => "");
      throw new Error(`Réponse invalide du serveur (statut ${res.status}). Vérifiez que le Worker est bien déployé et que ses variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY) sont configurées. ${text ? "Détail : " + text.slice(0, 200) : ""}`);
    }
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    return data;
  };

  const loadAdmins = async () => {
    setAdminsLoading(true);
    try {
      const res = await callAdminApi("/admin/list-admins", {});
      setAdmins(res.admins || []);
    } catch (e) {
      setAdminErr(e.message || "Erreur de chargement");
    } finally {
      setAdminsLoading(false);
    }
  };

  const togglePerm = (list, perm) =>
    list.includes(perm) ? list.filter(p => p !== perm) : [...list, perm];

  const submitAdminForm = async () => {
    setAdminErr("");
    if (!adminForm.email.trim() || !adminForm.pw.trim()) { setAdminErr("Email et mot de passe requis."); return; }
    setSavingAdmin(true);
    try {
      await callAdminApi("/admin/create-admin", {
        email: adminForm.email.trim(),
        password: adminForm.pw,
        fullName: adminForm.fullName.trim(),
        permissions: adminForm.permissions,
      });
      setShowAdminForm(false);
      setAdminForm({ email: "", pw: "", permissions: [] });
      await loadAdmins();
    } catch (e) {
      setAdminErr(e.message || "Erreur de création.");
    } finally {
      setSavingAdmin(false);
    }
  };

  const saveAdminPerms = async () => {
    if (!editingAdminPerms) return;
    try {
      await callAdminApi("/admin/update-admin-permissions", {
        adminId: editingAdminPerms.id,
        permissions: editingAdminPerms.permissions,
      });
      setEditingAdminPerms(null);
      await loadAdmins();
    } catch (e) {
      alert("Erreur : " + e.message);
    }
  };

  // ---------- MFA d'un autre administrateur (super-admin) ----------
  // Supabase ne permet pas d'enrôler un téléphone à la place d'un autre compte :
  // le QR code est lié à la session de la personne. Le super-admin retire donc
  // l'ancien téléphone (ou réinitialise la MFA) ; à sa prochaine connexion,
  // l'admin voit automatiquement un nouveau QR code à scanner.
  const openAdminMfa = async (a) => {
    setAdminMfa({ admin: a, factors: [], loading: true, busy: false, msg: "" });
    try {
      const res = await callAdminApi("/admin/list-admin-factors", { adminId: a.id });
      setAdminMfa({ admin: a, factors: (res.factors || []).filter(f => f.status === "verified"), loading: false, busy: false, msg: "" });
    } catch (e) {
      setAdminMfa({ admin: a, factors: [], loading: false, busy: false, msg: "❌ " + (e.message || e) });
    }
  };
  const removeAdminFactor = async (f) => {
    if (!adminMfa) return;
    const a = adminMfa.admin;
    const dernier = adminMfa.factors.length <= 1;
    if (!confirm("Retirer le téléphone « " + (f.friendly_name || "sans nom") + " » de " + a.email + " ?" +
      (dernier ? "\n\nC'est son dernier téléphone : à sa prochaine connexion, un nouveau QR code lui sera demandé." : ""))) return;
    setAdminMfa(m => ({ ...m, busy: true, msg: "" }));
    try {
      await callAdminApi("/admin/delete-admin-factor", { adminId: a.id, factorId: f.id });
      const res = await callAdminApi("/admin/list-admin-factors", { adminId: a.id });
      setAdminMfa(m => ({ ...m, busy: false, factors: (res.factors || []).filter(x => x.status === "verified"), msg: "✓ Téléphone retiré." }));
    } catch (e) {
      setAdminMfa(m => ({ ...m, busy: false, msg: "❌ " + (e.message || e) }));
    }
  };
  const resetAdminMfa = async () => {
    if (!adminMfa) return;
    const a = adminMfa.admin;
    if (!confirm("Réinitialiser la double authentification de " + a.email + " ?\n\nTous ses téléphones seront retirés. À sa prochaine connexion (email + mot de passe), un nouveau QR code s'affichera : il le scanne avec son nouveau téléphone.")) return;
    setAdminMfa(m => ({ ...m, busy: true, msg: "" }));
    try {
      await callAdminApi("/admin/reset-admin-mfa", { adminId: a.id });
      setAdminMfa(m => ({ ...m, busy: false, factors: [], msg: "✓ MFA réinitialisée. " + a.email + " scannera un nouveau QR code à sa prochaine connexion." }));
    } catch (e) {
      setAdminMfa(m => ({ ...m, busy: false, msg: "❌ " + (e.message || e) }));
    }
  };

  const deleteAdmin = async (a) => {
    if (!confirm(`Supprimer l'administrateur ${a.email} ? Cette action est irréversible.`)) return;
    try {
      await callAdminApi("/admin/delete-admin", { adminId: a.id, adminEmail: a.email });
      await loadAdmins();
    } catch (e) {
      alert("Erreur : " + e.message);
    }
  };

  const submitAddAccount = async () => {
    setAddAccountErr("");
    const estEdition = addAccountForm.mode === "edit";
    if (!addAccountForm.email.trim()) { setAddAccountErr("Email requis."); return; }
    if (!estEdition && !addAccountForm.pw.trim()) { setAddAccountErr("Email et mot de passe requis."); return; }
    setSavingAccount(true);
    try {
      if (estEdition) {
        // Modification d'un compte existant : change l'email (et le mot de passe si saisi).
        await callAdminApi("/admin/update-account-email", {
          hotelId: addAccountHotel.id,
          level: addAccountForm.level,
          oldEmail: addAccountForm.oldEmail,
          newEmail: addAccountForm.email.trim(),
          newPassword: addAccountForm.pw ? addAccountForm.pw : undefined,
        });
      } else {
        await callAdminApi("/admin/add-hotel-account", {
          hotelId: addAccountHotel.id,
          email: addAccountForm.email.trim(),
          password: addAccountForm.pw,
          level: addAccountForm.level,
        });
      }
      setAddAccountHotel(null);
      // Rafraîchit la liste des hôtels (loadHotels n'existait pas -> erreur après succès).
      const { data: hs } = await sb.from("hotels").select("*").order("name");
      if (hs) setHotels(hs);
    } catch (e) {
      setAddAccountErr(e.message || "Erreur lors de l'opération sur le compte.");
    } finally {
      setSavingAccount(false);
    }
  };

  const submitClientForm = async () => {
    setClientErr("");
    if (!clientForm.name.trim()) { setClientErr("Le nom de l'hôtel est obligatoire."); return; }
    setSavingClient(true);
    try {
      let logoUrl;
      if (clientLogoFile) {
        logoUrl = await uploadToStorage(clientLogoFile, "logos");
      }
      // Champs enrichis communs (groupe, contacts, adresse)
      const champsEnrichis = {
        groupe_hotelier: (clientForm.groupe || "").trim() || null,
        gm_nom: (clientForm.gmNom || "").trim() || null, gm_prenom: (clientForm.gmPrenom || "").trim() || null, gm_email: (clientForm.gmEmail || "").trim() || null,
        rh_nom: (clientForm.rhNom || "").trim() || null, rh_prenom: (clientForm.rhPrenom || "").trim() || null, rh_email: (clientForm.rhEmail || "").trim() || null,
        tech_nom: (clientForm.techNom || "").trim() || null, tech_prenom: (clientForm.techPrenom || "").trim() || null, tech_email: (clientForm.techEmail || "").trim() || null,
        adresse_rue: (clientForm.adrRue || "").trim() || null, adresse_cp: (clientForm.adrCp || "").trim() || null,
        adresse_ville: (clientForm.adrVille || "").trim() || null, adresse_pays: (clientForm.adrPays || "").trim() || null,
      };
      let hotelId = editingClientId;
      if (editingClientId) {
        const update = { name: clientForm.name, city: clientForm.city, stars: clientForm.stars, phone: clientForm.phone, ninjaone_nom: (clientForm.ninjaoneNom || "").trim() || null, ...champsEnrichis };
        if (logoUrl) update.logo_url = logoUrl;
        const { error } = await sb.from("hotels").update(update).eq("id", editingClientId);
        if (error) throw error;
        setHotels(prev => prev.map(h => h.id === editingClientId ? { ...h, ...update } : h));
      } else {
        if (!clientForm.email.trim() || !clientForm.pw.trim()) { setClientErr("Email et mot de passe sont obligatoires pour un nouveau client."); setSavingClient(false); return; }
        // Contrôles avant appel au Worker (Supabase refuse sinon, avec un message générique)
        {
          const supEmail = clientForm.email.trim().toLowerCase();
          const errPw = validerMotDePasse(clientForm.pw.trim());
          if (errPw) { setClientErr("Compte superviseur : " + errPw); setSavingClient(false); return; }
          const stdE = (clientForm.stdEmail || "").trim().toLowerCase();
          const stdP = (clientForm.stdPw || "").trim();
          if (stdE || stdP) {
            if (!stdE || !stdP) { setClientErr("Compte standard : renseignez l'email ET le mot de passe (ou laissez les deux vides)."); setSavingClient(false); return; }
            if (stdE === supEmail) { setClientErr("Le compte standard doit utiliser un email différent de celui du superviseur."); setSavingClient(false); return; }
            const errStd = validerMotDePasse(stdP);
            if (errStd) { setClientErr("Compte standard : " + errStd); setSavingClient(false); return; }
          }
        }
        if (!adminApiReady) { setClientErr("La création de clients nécessite le Worker admin (voir instructions de déploiement). En attendant, créez le compte manuellement dans Supabase → Authentication → Users."); setSavingClient(false); return; }
        const result = await callAdminApi("/admin/create-client", {
          email: clientForm.email, password: clientForm.pw, hotelName: clientForm.name,
          city: clientForm.city, stars: clientForm.stars, phone: clientForm.phone, logoUrl: logoUrl || null,
          standardEmail: (clientForm.stdEmail || "").trim() || null,
          standardPassword: (clientForm.stdPw || "").trim() || null
        });
        hotelId = result.hotel.id;
        // Les champs enrichis ne sont pas gérés par le worker : on les écrit ensuite.
        try {
          await sb.from("hotels").update(champsEnrichis).eq("id", hotelId);
        } catch (e) { /* non bloquant */ }
        setHotels(prev => [...prev, { ...result.hotel, ...champsEnrichis }]);
        setEditCid(hotelId);
      }
      // Upload des nouvelles pièces jointes de l'hôtel
      if (hotelId && clientNewFiles.length > 0) {
        for (const file of clientNewFiles) {
          try {
            const url = await uploadToStorage(file, "hotels");
            await sb.from("hotel_fichiers").insert({ hotel_id: hotelId, file_name: file.name, file_url: url });
          } catch (e) { /* un fichier en échec ne bloque pas les autres */ }
        }
      }
      setShowClientForm(false);
    } catch (e) {
      setClientErr(e.message || "Une erreur est survenue.");
    } finally {
      setSavingClient(false);
    }
  };

  // Supprimer une pièce jointe déjà enregistrée d'un hôtel
  const removeExistingClientFile = async (fileId) => {
    await sb.from("hotel_fichiers").delete().eq("id", fileId);
    setClientExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const deleteClient = async (h) => {
    if (!confirm(`Supprimer "${h.name}" ? Cette action est irréversible (procédures et compte de connexion inclus).`)) return;
    try {
      if (adminApiReady) {
        await callAdminApi("/admin/delete-client", { hotelId: h.id, userEmail: h.account_email });
      } else {
        await sb.from("hotels").delete().eq("id", h.id);
      }
      setHotels(prev => prev.filter(x => x.id !== h.id));
      if (editCid === h.id) setEditCid(hotels.find(x => x.id !== h.id)?.id || null);
    } catch (e) {
      alert("Erreur lors de la suppression : " + e.message);
    }
  };

  const [resetPwTarget, setResetPwTarget] = useState(null); // hotel object en cours de réinitialisation
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwBusy, setResetPwBusy] = useState(false);
  const submitResetPassword = async () => {
    if (!resetPwValue.trim() || !resetPwTarget) return;
    setResetPwBusy(true);
    try {
      await callAdminApi("/admin/reset-password", { userEmail: resetPwTarget.account_email, newPassword: resetPwValue });
      alert("Mot de passe mis à jour pour " + resetPwTarget.name);
      setResetPwTarget(null);
      setResetPwValue("");
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setResetPwBusy(false);
    }
  };

  // Changement de son propre mot de passe (réservé admin / superviseur).
  // Utilise directement la session Supabase de l'utilisateur connecté.
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [changePwValue, setChangePwValue] = useState("");
  const [changePwValue2, setChangePwValue2] = useState("");
  const [changePwBusy, setChangePwBusy] = useState(false);
  const [changePwErr, setChangePwErr] = useState("");
  const submitChangePassword = async () => {
    setChangePwErr("");
    const p1 = changePwValue.trim();
    const p2 = changePwValue2.trim();
    const vErrPw = validerMotDePasse(p1);
    if (vErrPw) { setChangePwErr(vErrPw); return; }
    if (p1 !== p2) { setChangePwErr("Les deux mots de passe ne correspondent pas."); return; }
    setChangePwBusy(true);
    try {
      const { error } = await sb.auth.updateUser({ password: p1 });
      if (error) { setChangePwErr("Erreur : " + error.message); return; }
      alert("Votre mot de passe a été mis à jour.");
      setChangePwOpen(false);
      setChangePwValue(""); setChangePwValue2("");
    } catch (e) {
      setChangePwErr("Erreur : " + (e.message || e));
    } finally {
      setChangePwBusy(false);
    }
  };


  // ---------- PROCEDURE CRUD ----------
  const openNewProcForm = () => {
    setEditingId(null);
    setProcForm({ title: "", cat: CATS[0], content: "", pinned: false, mots_cles: "" });
    setProcFormFiles([]);
    setProcFormExistingFiles([]);
    setProcFormHotels(activeHotelId ? [activeHotelId] : []); // précoche l'hôtel actif
    setShowProcForm(true);
  };
  const openEditProcForm = async (p) => {
    setEditingId(p.id);
    setProcForm({ title: p.title, cat: p.category, content: p.content, pinned: !!p.pinned, mots_cles: p.mots_cles || "" });
    setProcFormFiles([]);
    setProcFormExistingFiles(procFiles[p.id] || []);
    loadFilesFor(p.id);
    // Charge les hôtels déjà liés à cette procédure
    const { data: liens } = await sb.from("procedure_hotels").select("hotel_id").eq("procedure_id", p.id);
    const ids = (liens || []).map(l => l.hotel_id);
    setProcFormHotels(ids.length > 0 ? ids : (p.hotel_id ? [p.hotel_id] : []));
    setShowProcForm(true);
  };
  const removeExistingProcFile = async (fileId) => {
    await sb.from("procedure_files").delete().eq("id", fileId);
    setProcFormExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const submitProcForm = async () => {
    if (!procForm.title.trim() || !procForm.content.trim() || procFormHotels.length === 0) return;
    setSavingProc(true);
    try {
      const firstHotel = procFormHotels[0]; // hotel_id de compatibilité = 1er hôtel coché
      let procId = editingId;
      if (editingId) {
        const { error } = await sb.from("procedures").update({
          title: procForm.title, category: procForm.cat, content: procForm.content, pinned: procForm.pinned, mots_cles: procForm.mots_cles || "", updated_at: new Date().toISOString()
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("procedures").insert({
          hotel_id: firstHotel, title: procForm.title, category: procForm.cat, content: procForm.content, pinned: procForm.pinned, mots_cles: procForm.mots_cles || ""
        }).select().single();
        if (error) throw error;
        procId = data.id;
      }
      // Enregistre les hôtels liés via le Worker (remplace toutes les liaisons)
      await callAdminApi("/admin/set-procedure-hotels", { procedureId: procId, hotelIds: procFormHotels });
      // Upload des nouveaux fichiers
      for (const file of procFormFiles) {
        const url = await uploadToStorage(file, "procedures");
        await sb.from("procedure_files").insert({ procedure_id: procId, file_name: file.name, file_url: url });
      }
      // Recharge la liste (via la table de liaison)
      const { data: liens2 } = await sb.from("procedure_hotels").select("procedure_id").eq("hotel_id", activeHotelId);
      const ids2 = (liens2 || []).map(l => l.procedure_id);
      const { data: refreshed } = ids2.length > 0
        ? await sb.from("procedures").select("*").in("id", ids2).order("created_at")
        : { data: [] };
      if (refreshed) setProcedures(refreshed);
      setProcFiles(prev => { const copy = { ...prev }; delete copy[procId]; return copy; });
      setShowProcForm(false);
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setSavingProc(false);
    }
  };

  const deleteProc = async (id) => {
    await sb.from("procedures").delete().eq("id", id);
    setProcedures(prev => prev.filter(p => p.id !== id));
    if (selId === id) go("proc-admin");
  };

  // ---------- SUPPORT FORM ----------
  const handleSupportFilesAdd = (fileList) => {
    setSupportForm(prev => ({ ...prev, files: [...prev.files, ...Array.from(fileList)] }));
  };
  const removeSupportFile = (idx) => setSupportForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }));

  const buildSupportSubjectBody = () => {
    const subject = `[${supportForm.prio}] ${client ? client.name : ""} — ${supportForm.cat}`;
    const bodyText =
      `Hôtel : ${client ? client.name : ""}\n` +
      `Contact : ${supportForm.name} (${supportForm.role})\n` +
      `Email pro : ${supportForm.contactEmail || "-"}\n` +
      `Téléphone : ${supportForm.phone || "-"}\n` +
      `Catégorie : ${supportForm.cat}\n` +
      `Priorité : ${supportForm.prio}\n\n` +
      `Message :\n${supportForm.message}`;
    return { subject, bodyText };
  };

  // Enregistre le ticket en base et retourne { id, reference } (ou null en cas d'échec)
  const logTicketToDb = async () => {
    try {
      const { data, error } = await sb.from("tickets").insert({
        hotel_id: myHotelId,
        contact_name: supportForm.name,
        contact_role: supportForm.role,
        contact_email: nettoyerEmail(supportForm.contactEmail || "").trim(),
        contact_phone: supportForm.phone,
        category: supportForm.cat,
        priority: supportForm.prio,
        message: supportForm.message,
        status: "open"
      }).select().single();
      if (error) return null;
      return data; // { id, reference, ... }
    } catch (e) { return null; /* silencieux : l'email reste l'envoi prioritaire */ }
  };

  // Envoie les fichiers vers Storage puis les rattache au ticket (et éventuellement à un message)
  const uploadTicketFiles = async (files, ticketId, messageId, who) => {
    if (!ticketId || !files || files.length === 0) return;
    for (const file of files) {
      try {
        const url = await uploadToStorage(file, "tickets");
        await sb.from("ticket_fichiers").insert({
          ticket_id: ticketId,
          message_id: messageId || null,
          file_name: file.name,
          file_url: url,
          uploaded_by: who
        });
      } catch (e) { /* un fichier en échec ne doit pas bloquer les autres */ }
    }
  };

  const submitSupportForm = async () => {
    const supportHtmlBrut = supportForm.messageHtml || "";
    const supportAImages = /<img\b/i.test(supportHtmlBrut);
    if (!supportForm.name.trim() || (!supportForm.message.trim() && !supportAImages)) return;
    // L'email professionnel est obligatoire : sans lui, la réponse du support ne pourrait pas
    // revenir au client (l'envoi sortant se base sur contact_email).
    const emailClean = nettoyerEmail(supportForm.contactEmail || "").trim();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setSupportError("Merci d'indiquer un email professionnel valide : c'est à cette adresse que le support vous répondra.");
      return;
    }
    setSupportError("");
    const { subject, bodyText } = buildSupportSubjectBody();

    setSupportSending(true);
    try {
      // Enregistre le ticket puis archive les pièces jointes dans le portail
      const newTicket = await logTicketToDb();
      const newTicketId = newTicket ? newTicket.id : null;
      const reference = newTicket && newTicket.reference ? newTicket.reference : null;
      await uploadTicketFiles(supportForm.files, newTicketId, null, "client");
      // Images collées dans le message (éditeur riche) : on enregistre le message
      // en HTML dans le fil du ticket, images à leur place (même principe que les
      // tickets créés par email). Les images sont aussi rattachées au ticket.
      let supportHtml = "";
      if (supportAImages && newTicketId) {
        supportHtml = sanitizeRichHtml(supportHtmlBrut);
        const imgUrls = [];
        supportHtml.replace(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi, (m0, u) => { if (/^https?:\/\//.test(u)) imgUrls.push(u); return m0; });
        let msgId = null;
        try {
          const { data: msgRow, error: msgErr } = await sb.from("ticket_messages").insert({
            ticket_id: newTicketId, sender_role: "client", sender_name: supportForm.name,
            body: supportForm.message || "(capture d'écran)", body_html: supportHtml
          }).select().single();
          if (!msgErr && msgRow) msgId = msgRow.id;
        } catch (e) {}
        // Si le message HTML n'a pas pu être enregistré, les images restent
        // visibles en pièces jointes de la demande (message_id null).
        for (let k = 0; k < imgUrls.length; k++) {
          try {
            const u = imgUrls[k];
            const nom = decodeURIComponent((u.split("/").pop() || ("capture_" + (k + 1) + ".png")).split("?")[0]);
            await sb.from("ticket_fichiers").insert({ ticket_id: newTicketId, message_id: msgId, file_name: nom, file_url: u, uploaded_by: "client" });
          } catch (e) {}
        }
      }
      const attachments = await Promise.all(supportForm.files.map(f => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ filename: f.name, content: reader.result.split(",")[1] });
        reader.readAsDataURL(f);
      })));
      // Notification à l'équipe DSI (team@dsihotel.fr), avec la référence exacte du
      // ticket et un lien direct vers le portail. support@dsihotel.com est en copie.
      // On préfixe le sujet par la référence pour le suivi et le threading.
      const refPrefix = reference ? `[${reference}] ` : "";
      const lienTicket = reference
        ? `https://portail.dsihotel.com/?ticket=${encodeURIComponent(reference)}`
        : "https://portail.dsihotel.com/";
      const bodyTeam = bodyText +
        "\n\n—————————————————————\n" +
        (reference ? `👉 Accéder au ticket ${reference} : ${lienTicket}\n` : "") +
        `Répondre à cet email répond directement au client (${emailClean}).`;
      const res = await fetchEmailApi({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ to: TEAM_EMAIL, cc: [SUPPORT_EMAIL], subject: refPrefix + subject, text: bodyTeam, replyTo: emailClean || undefined, attachments, fromName: (String(supportForm.name || "").replace(/["<>\r\n]/g, "").trim() || adminFromName()) },
          supportHtml ? { html: textToHtml(bodyTeam.split("Message :\n")[0] + "Message :") + '<div style="margin:6px 0 12px;">' + supportHtml + '</div>' + textToHtml(bodyTeam.slice(bodyTeam.indexOf("\n\n—————————————————————"))) } : {}))
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error("Statut " + res.status + (detail ? " — " + detail.slice(0, 300) : ""));
      }

      // Accusé de réception au client (même format que le circuit email direct).
      // Envoyé uniquement si le ticket a bien été créé (référence disponible) et
      // si l'email client est valide. Un échec ici ne bloque pas la demande.
      if (reference && emailClean) {
        try {
          const accuseText =
            "Bonjour,\n\n" +
            "Nous avons bien reçu votre demande, enregistrée sous la référence " + reference + ".\n\n" +
            "Notre équipe la traitera dans les meilleurs délais. Pour toute information complémentaire, répondez directement à cet email en conservant la référence dans l'objet.\n\n" +
            "Cordialement,\n" +
            "Le support DSI Hotel\n" +
            "support@dsihotel.com — www.dsihotel.com";
          await fetchEmailApi({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: emailClean, subject: `[${reference}] ${subject}`, text: accuseText, replyTo: SUPPORT_EMAIL })
          });
        } catch (e) { /* l'accusé est secondaire : ne bloque pas la confirmation */ }
      }

      setSupportSent(true);
    } catch (e) {
      setSupportError("L'envoi automatique a échoué : " + (e.message || e) + ". Vérifiez que le Worker (route /send) est déployé et configuré (RESEND_API_KEY, CORS).");
    } finally {
      setSupportSending(false);
    }
  };

  // ---------- TICKETS : CHARGEMENT ----------
  const loadTickets = () => {
    if (!profile) return;
    setTicketsLoading(true);
    // Récupère TOUS les tickets par pages de 1000 (PostgREST plafonne chaque
    // requête à 1000 lignes ; sans pagination on n'en verrait qu'un millier).
    const PAGE = 1000;
    const fetchAll = async (cols) => {
      let rows = [];
      let from = 0;
      for (;;) {
        let q = sb.from("tickets").select(cols).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
        if (!isAdmin && myHotelId) q = q.eq("hotel_id", myHotelId);
        const { data, error } = await q;
        if (error) return { error };
        rows = rows.concat(data || []);
        if (!data || data.length < PAGE) break; // dernière page atteinte
        from += PAGE;
      }
      return { data: rows };
    };
    (async () => {
      let { data, error } = await fetchAll(TICKET_COLS);
      if (error) ({ data, error } = await fetchAll(TICKET_COLS_TYPE));
      if (error) ({ data, error } = await fetchAll(TICKET_COLS_BASE));
      if (error) {
        // Repli de sécurité : si la liste de colonnes explicite échoue (colonne
        // absente, etc.), on recharge avec select(*) pour ne jamais afficher 0 ticket.
        const r2 = await fetchAll("*");
        if (!r2.error && r2.data) { setTickets(r2.data); computeTicketStates(r2.data); }
        setTicketsLoading(false);
        return;
      }
      if (data) {
        setTickets(data);
        // Calcule l'état de chaque ticket (Nouveau / Nouvelle réponse) d'après le dernier message
        computeTicketStates(data);
      }
      setTicketsLoading(false);
      loadValidations();
    })();
  };

  // ---------- ALERTES MICROSOFT DEFENDER : rattachement automatique à l'hôtel ----------
  // 1) ID de tenant (GUID) présent dans le mail -> table m365_tenants (Sécurité Microsoft)
  // 2) « Organization name » (domaine, ex. hotelbowmann.com) -> domaine des emails de la fiche hôtel,
  //    puis nom de l'hôtel / du tenant contenu dans le domaine (uniquement si une seule correspondance).
  const defenderTentes = useRef(new Set());
  const rattacherAlertesDefender = async (liste) => {
    if (!isAdmin || !hotels.length) return;
    const cibles = (liste || []).filter(t => estAlerteDefender(t) && !t.hotel_id && !defenderTentes.current.has(t.id));
    if (!cibles.length) return;
    cibles.forEach(t => defenderTentes.current.add(t.id));
    try {
      let tenants = [];
      try { const r = await sb.from("m365_tenants").select("tenant_id,nom,hotel_id"); tenants = r.data || []; } catch (e) {}
      const texteDe = {};
      try {
        const { data: msgs } = await sb.from("ticket_messages").select("ticket_id,body,body_html").in("ticket_id", cibles.slice(0, 150).map(t => t.id));
        (msgs || []).forEach(m => { texteDe[m.ticket_id] = (texteDe[m.ticket_id] || "") + " " + (m.body || "") + " " + (m.body_html || ""); });
      } catch (e) {}
      const domaineDe = (e) => (String(e || "").toLowerCase().split("@")[1] || "").trim();
      const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      for (const t of cibles) {
        const brut = (t.subject || "") + " " + (t.message || "") + " " + (texteDe[t.id] || "");
        const txt = brut.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ");
        let hid = null;
        const guids = (brut.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []).map(g => g.toLowerCase());
        const tn = tenants.find(x => x.hotel_id && guids.includes(String(x.tenant_id || "").toLowerCase()));
        if (tn) hid = tn.hotel_id;
        if (!hid) {
          const m = txt.match(/Organization name\s*:?\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,})/i)
            || txt.match(/Nom de l['’]organisation\s*:?\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,})/i)
            || txt.match(/notification for\s+([A-Za-z0-9.-]+\.[A-Za-z]{2,})/i);
          const dom = m ? m[1].toLowerCase().replace(/\.+$/, "") : "";
          if (dom) {
            const parEmail = hotels.filter(h => [h.account_email, h.standard_email, h.gm_email, h.rh_email, h.tech_email].some(e => { const d = domaineDe(e); return d && (d === dom || d.endsWith("." + dom)); }));
            if (parEmail.length === 1) hid = parEmail[0].id;
            if (!hid) {
              const racine = norm(dom.split(".")[0]);
              const tnNom = tenants.filter(x => x.hotel_id && norm(x.nom).length >= 4 && (racine.includes(norm(x.nom)) || norm(x.nom).includes(racine)));
              if (tnNom.length === 1) hid = tnNom[0].hotel_id;
              if (!hid) {
                const motsHotel = (h) => String(h.name || "").split(/[^A-Za-zÀ-ÿ0-9]+/).map(norm).filter(w => w.length >= 5);
                const parNom = hotels.filter(h => motsHotel(h).some(w => racine.includes(w)));
                if (parNom.length === 1) hid = parNom[0].id;
              }
            }
          }
        }
        if (hid) {
          const { error } = await sb.from("tickets").update({ hotel_id: hid }).eq("id", t.id);
          if (!error) setTickets(prev => prev.map(x => x.id === t.id ? { ...x, hotel_id: hid } : x));
        }
      }
    } catch (e) { /* silencieux : le ticket reste « non assigné » */ }
  };
  useEffect(() => { if (isAdmin && hotels.length && tickets.length) rattacherAlertesDefender(tickets); }, [tickets, hotels, isAdmin]);

  // ---------- Reconnaissance automatique de l'hôtel des mails entrants ----------
  // Le rattachement est fait par la base (trigger trg_tickets_hotel_auto) : domaine propre à l'hôtel,
  // puis signature (téléphone / adresse de la fiche, mots-clés). Ici : gestion des règles + apprentissage.
  const DOMAINES_GENERIQUES = ["gmail.com", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.fr", "msn.com", "yahoo.com", "yahoo.fr", "icloud.com", "me.com", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "bbox.fr", "gmx.fr", "gmx.com", "dsihotel.fr", "dsihotel.com"];
  const loadRecoMail = async () => {
    try {
      const { data, error } = await sb.from("hotel_reconnaissance_mail").select("id,hotel_id,type,valeur").order("valeur");
      if (!error) setRecoMail(data || []);
    } catch (e) { /* table absente : rien */ }
  };
  useEffect(() => { if (isAdmin) loadRecoMail(); }, [isAdmin]);
  const ajouterRecoMail = async (hotelId, type, valeur) => {
    let v = String(valeur || "").trim().toLowerCase();
    if (type === "domaine") v = v.replace(/^.*@/, "").replace(/^www\./, "");
    if (!v) return false;
    if (type === "domaine" && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(v)) { alert("Domaine invalide : " + v + "\nExemple : cp-paris.com"); return false; }
    if (type === "mot_cle" && v.length < 4) { alert("Mot-clé trop court (4 caractères minimum)."); return false; }
    const deja = recoMail.find(r => r.type === type && r.valeur === v);
    if (deja) { const h = hotels.find(x => x.id === deja.hotel_id); alert("« " + v + " » est déjà associé à " + (h ? h.name : "un autre établissement") + "."); return false; }
    const { error } = await sb.from("hotel_reconnaissance_mail").insert({ hotel_id: hotelId, type, valeur: v });
    if (error) { alert("Enregistrement impossible : " + error.message); return false; }
    await loadRecoMail();
    return true;
  };
  const supprimerRecoMail = async (r) => {
    if (!confirm("Ne plus rattacher automatiquement « " + r.valeur + " » ?")) return;
    const { error } = await sb.from("hotel_reconnaissance_mail").delete().eq("id", r.id);
    if (error) { alert("Suppression impossible : " + error.message); return; }
    await loadRecoMail();
  };
  // Après un rattachement manuel : propose d'apprendre le domaine (ou de retirer une règle qui s'est trompée)
  const apprendreDomaineTicket = async (t, hid) => {
    try {
      const email = String(t.email_from || t.contact_email || "").toLowerCase();
      const dom = email.includes("@") ? email.split("@")[1].trim() : "";
      const nouveau = (hotels.find(hh => hh.id === hid) || {}).name || "cet établissement";
      const regleDom = dom ? recoMail.find(r => r.type === "domaine" && r.valeur === dom) : null;
      if (regleDom && regleDom.hotel_id !== hid) {
        const ancien = (hotels.find(hh => hh.id === regleDom.hotel_id) || {}).name || "un autre établissement";
        if (confirm("Les mails de @" + dom + " sont rattachés automatiquement à " + ancien + ".\n\nNe plus rattacher ce domaine automatiquement (domaine partagé par plusieurs hôtels) ?")) {
          await sb.from("hotel_reconnaissance_mail").delete().eq("id", regleDom.id);
          await loadRecoMail();
        }
        return;
      }
      if (!dom || regleDom || DOMAINES_GENERIQUES.includes(dom)) return;
      if (confirm("Rattacher aussi automatiquement les prochains mails de @" + dom + " à " + nouveau + " ?\n\n(Répondez Annuler si ce domaine est utilisé par plusieurs hôtels ou par un fournisseur.)"))
        await ajouterRecoMail(hid, "domaine", dom);
    } catch (e) { /* non bloquant */ }
  };

  // Charge le statut des demandes de validation (via le Worker) et l'indexe par référence.
  const loadValidations = async () => {
    try {
      const { data: sessV } = await sb.auth.getSession();
      const res = await fetch(ADMIN_API_URL + "/validations-hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (sessV.session?.access_token || "") },
        body: JSON.stringify(isAdmin ? { all: true } : { hotelId: myHotelId }),
      });
      const data = await res.json().catch(() => ({}));
      const map = {};
      (data.validations || []).forEach(v => { if (v.reference) map[v.reference] = v; });
      setValidations(map);
    } catch (e) { /* silencieux : l'absence de statut ne bloque pas l'affichage */ }
  };

  // Renvoie un badge de statut de validation pour une référence de ticket, ou null.
  const badgeValidation = (ref) => {
    const v = ref && validations[ref];
    if (!v) return null;
    if (v.status === "refused") {
      return React.createElement('span', {
        title: "Refusé par " + (v.validateur_email || "") + (v.validated_at ? " le " + new Date(v.validated_at).toLocaleString("fr-FR") : ""),
        style: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", color: "#B03A2E", background: "#FDECEC", border: "1px solid #F5B5B5" }
      }, "\u26D4 Refusé");
    }
    const valide = v.status === "validated";
    return React.createElement('span', {
      title: valide ? ("Validé par " + (v.validateur_email || "") + (v.validated_at ? " le " + new Date(v.validated_at).toLocaleString("fr-FR") : "")) : ("En attente de " + (v.validateur_email || "")),
      style: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", color: valide ? "#256029" : "#8A6D1F", background: valide ? "#EAF6EC" : "#FFF8E6", border: "1px solid " + (valide ? "#B5DBB9" : "#E8C34A") }
    }, valide ? "\u2705 Validé" : "\u23F3 À valider");
  };

  // ====== SUPPRESSION DÉFINITIVE D'UN TICKET (super-admin) ======
  // Recherche un ticket par sa référence (DSI-XXXX), puis suppression totale :
  // fichiers Storage + lignes ticket_fichiers/ticket_messages/tickets (via RPC).
  const normaliserRef = (r) => {
    let s = (r || "").toString().trim().toUpperCase().replace(/\s+/g, "");
    if (!s) return "";
    // Accepte "1234", "DSI-1234", "2026-0224", etc. On garde tel quel si déjà préfixé.
    if (!s.startsWith("DSI-")) s = "DSI-" + s.replace(/^DSI/, "");
    return s;
  };

  const rechercherTicketASupprimer = async () => {
    setSupprNote("");
    setSupprTicket(null);
    setSupprConfirm("");
    const ref = normaliserRef(supprRef);
    if (!ref) { setSupprNote("⚠️ Saisissez une référence (ex. DSI-2026-0224)."); return; }
    setSupprBusy(true);
    try {
      const { data, error } = await sb.from("tickets").select("*").eq("reference", ref).limit(1);
      if (error) { setSupprNote("❌ Erreur de recherche : " + error.message); return; }
      if (!data || data.length === 0) { setSupprNote("Aucun ticket trouvé pour la référence « " + ref + " »."); return; }
      setSupprTicket(data[0]);
    } catch (e) {
      setSupprNote("❌ Erreur : " + (e.message || e));
    } finally {
      setSupprBusy(false);
    }
  };

  // Charge tous les tickets (ouverts + fermés) d'un hôtel pour la sélection.
  const chargerTicketsHotel = async (hotelId) => {
    setSupprHotel(hotelId);
    setSupprTicket(null);
    setSupprConfirm("");
    setSupprNote("");
    setSupprListe([]);
    if (!hotelId) return;
    setSupprListeBusy(true);
    try {
      const { data, error } = await sb.from("tickets")
        .select("id,reference,subject,contact_name,contact_email,status,created_at,hotel_id")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false });
      if (error) { setSupprNote("❌ Erreur : " + error.message); return; }
      setSupprListe(data || []);
    } catch (e) {
      setSupprNote("❌ Erreur : " + (e.message || e));
    } finally {
      setSupprListeBusy(false);
    }
  };

  // Mot à retaper pour confirmer : la référence si elle existe, sinon "SUPPRIMER"
  // (certains anciens tickets de test n'ont pas de référence — sinon impossible à supprimer).
  const motConfirmation = (t) => {
    const r = (t && t.reference ? String(t.reference).trim() : "");
    return r ? r : "SUPPRIMER";
  };
  const confirmationOK = () => {
    const attendu = motConfirmation(supprTicket);
    return normaliserRef(supprConfirm) === normaliserRef(attendu) || (supprConfirm || "").trim().toUpperCase() === attendu.toUpperCase();
  };

  const supprimerTicketDefinitif = async () => {
    if (!supprTicket) return;
    const ref = supprTicket.reference || "";
    const attendu = motConfirmation(supprTicket);
    if (!confirmationOK()) {
      setSupprNote("⚠️ La confirmation ne correspond pas. Retapez « " + attendu + " » pour confirmer.");
      return;
    }
    if (!confirm("SUPPRESSION DÉFINITIVE\n\nLe ticket " + (ref || "(sans référence)") + " et TOUS ses messages et pièces jointes vont être supprimés définitivement.\n\nCette action est IRRÉVERSIBLE. Continuer ?")) return;
    setSupprBusy(true);
    setSupprNote("Suppression en cours…");
    try {
      // 1) Récupérer les fichiers pour les effacer du Storage
      const { data: fichiers } = await sb.from("ticket_fichiers").select("file_url").eq("ticket_id", supprTicket.id);
      const chemins = [];
      (fichiers || []).forEach(f => {
        const u = f.file_url || "";
        const marqueur = "/public/" + STORAGE_BUCKET + "/";
        const i = u.indexOf(marqueur);
        if (i !== -1) chemins.push(decodeURIComponent(u.slice(i + marqueur.length)));
      });
      if (chemins.length > 0) {
        try { await sb.storage.from(STORAGE_BUCKET).remove(chemins); }
        catch (e) { /* on continue : la suppression DB reste prioritaire */ }
      }
      // 2) Suppression atomique en base via RPC super-admin
      const { data, error } = await sb.rpc("supprimer_ticket_definitif", { p_ticket_id: supprTicket.id });
      if (error) { setSupprNote("❌ Suppression refusée : " + error.message); setSupprBusy(false); return; }
      // 3) Retirer de la liste locale si présent
      setTickets(prev => prev.filter(x => x.id !== supprTicket.id));
      setSupprListe(prev => prev.filter(x => x.id !== supprTicket.id));
      const info = data || {};
      setSupprNote("✅ Ticket " + ref + " supprimé définitivement (" + (info.messages_supprimes || 0) + " message(s), " + (chemins.length) + " fichier(s)).");
      setSupprTicket(null);
      setSupprRef("");
      setSupprConfirm("");
    } catch (e) {
      setSupprNote("❌ Échec de la suppression : " + (e.message || e));
    } finally {
      setSupprBusy(false);
    }
  };
  //  - kind "reply" : le dernier message vient du client (il attend une réponse)
  //  - kind null    : rien de neuf (on a déjà répondu en dernier)
  //  - since        : date du dernier message client resté sans réponse (sert au calcul du retard 4h)
  const computeTicketStates = async (ticketList) => {
    const ids = (ticketList || []).map(t => t.id);
    if (ids.length === 0) { setTicketState({}); return; }
    const createdMap = {};
    (ticketList || []).forEach(t => { createdMap[t.id] = t.created_at; });
    // Récupère les messages par lots d'IDs : un seul .in() avec des milliers
    // d'IDs produit une URL trop longue (erreur 414 URI Too Long).
    const CHUNK = 200;
    let allMsgs = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const lot = ids.slice(i, i + CHUNK);
      const { data, error } = await sb.from("ticket_messages")
        .select("ticket_id,sender_role,created_at")
        .in("ticket_id", lot)
        .order("created_at", { ascending: true });
      if (error || !data) continue; // on ignore un lot en échec plutôt que tout perdre
      allMsgs = allMsgs.concat(data);
    }
    const byTicket = {};
    allMsgs.forEach(m => { (byTicket[m.ticket_id] = byTicket[m.ticket_id] || []).push(m); });
    const map = {};
    ids.forEach(id => {
      const msgs = byTicket[id] || [];
      const hasAdmin = msgs.some(m => m.sender_role === "admin");
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      let kind = null;
      if (!hasAdmin) kind = "new";
      else if (last && last.sender_role === "client") kind = "reply";
      // "since" = date du dernier message client (celui qui attend une réponse),
      // sinon la création du ticket.
      let since = createdMap[id] || null;
      if (last && last.sender_role === "client") since = last.created_at;
      map[id] = { kind, since };
    });
    setTicketState(map);
  };

  // Charge le corps de tous les messages (une seule fois) pour permettre la
  // recherche dans le contenu des tickets, y compris les tickets fermés qui ne
  // sont pas dans la liste courante. Concatène par ticket.
  const loadTicketBodies = async () => {
    try {
      const { data, error } = await sb.from("ticket_messages")
        .select("ticket_id,body")
        .order("created_at", { ascending: true });
      if (error || !data) return;
      const map = {};
      data.forEach(m => {
        if (!m.ticket_id) return;
        const txt = (m.body || "").toString();
        map[m.ticket_id] = map[m.ticket_id] ? map[m.ticket_id] + " " + txt : txt;
      });
      setTicketBodies(map);
      setTicketBodiesLoaded(true);
    } catch (e) { /* silencieux : la recherche fonctionnera au moins sur objet/contact/hôtel */ }
  };
  // La note n'est jamais chargée dans la liste des tickets : on la lit à la
  // demande, uniquement quand l'admin ouvre l'éditeur de remarque.
  const ouvrirNote = async (ticket) => {
    if (!isAdmin) return;
    // Toggle : si déjà ouvert sur ce ticket, on referme
    if (noteOpenId === ticket.id) { setNoteOpenId(null); return; }
    setNoteOpenId(ticket.id);
    setNoteText("");
    try {
      const { data, error } = await sb.rpc("get_ticket_note", { p_ticket_id: ticket.id });
      if (!error && data != null) {
        setNoteText(data);
        setNoteSaved(prev => ({ ...prev, [ticket.id]: !!String(data).trim() }));
      }
    } catch (e) { /* silencieux : l'éditeur s'ouvre vide */ }
  };

  // ====== TICKET TÉLÉPHONE : le support enregistre un appel reçu ======
  // Même informations qu'un ticket client + durée de l'appel et résolution éventuelle.
  // source = "telephone" (pas de migration SQL : la colonne source existe déjà).
  const ouvrirTicketTelephone = () => setTelModal({
    hotel_id: "", contact_name: "", contact_role: "Front Office", contact_email: "", contact_phone: "",
    category: CATS[0], priority: "Moyenne", subject: "", message: "", duree: "",
    resolu: false, solution: "", recap: false, busy: false, err: ""
  });
  const creerTicketTelephone = async () => {
    const f = telModal;
    if (!f || f.busy) return;
    const erreur = (m) => setTelModal({ ...f, err: m });
    const email = nettoyerEmail(f.contact_email || "").trim();
    if (!f.hotel_id) return erreur("Choisissez l'établissement qui appelle.");
    if (!f.contact_name.trim()) return erreur("Indiquez le nom de la personne qui appelle.");
    if (!f.message.trim()) return erreur("Décrivez la demande.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erreur("Adresse email invalide.");
    if (f.resolu && !f.solution.trim()) return erreur("Indiquez la solution apportée pendant l'appel.");
    if (f.recap && !email) return erreur("Pour envoyer le récapitulatif, renseignez l'email du contact.");
    setTelModal({ ...f, busy: true, err: "" });
    const qui = adminFromName();
    const maintenant = new Date();
    const duree = parseInt(f.duree, 10);
    const sujet = f.subject.trim() || f.category;
    try {
      const ligne = {
        hotel_id: f.hotel_id,
        contact_name: f.contact_name.trim(),
        contact_role: f.contact_role,
        contact_email: email || null,
        contact_phone: f.contact_phone.trim() || null,
        category: f.category,
        priority: f.priority,
        subject: sujet,
        message: f.message.trim(),
        status: f.resolu ? "closed" : "open",
        closed_at: f.resolu ? maintenant.toISOString() : null,
        source: "telephone",
        assigned_to: (session && session.user && session.user.id) || null,
      };
      const { data: ticket, error } = await sb.from("tickets").insert(ligne).select().single();
      if (error) throw error;
      // Message « appel pris en charge » : trace dans le fil et compte comme 1re réponse (SLA)
      const quand = maintenant.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const esc = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const body = "📞 Appel reçu et pris en charge par " + qui + " le " + quand + (duree > 0 ? " — durée : " + duree + " min" : "") +
        (f.resolu ? "\nRésolu pendant l'appel : " + f.solution.trim() : "");
      const body_html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">' +
        '<div style="background:#2B6CB0;color:#fff;border-radius:8px;padding:11px 15px;">' +
          '<div style="font-size:15px;font-weight:bold;">📞 APPEL TÉLÉPHONIQUE</div>' +
          '<div style="font-size:13px;margin-top:3px;">Pris en charge par <b>' + esc(qui) + '</b> le ' + esc(quand) + (duree > 0 ? ' — durée : <b>' + duree + ' min</b>' : '') + '</div>' +
        '</div>' +
        (f.resolu ? '<div style="margin-top:8px;padding:8px 12px;background:#E9F6EE;border-left:3px solid #2F855A;font-size:13px;"><b>✅ Résolu pendant l\'appel :</b><br>' + esc(f.solution.trim()).replace(/\n/g, "<br>") + '</div>' : '') +
      '</div>';
      await sb.from("ticket_messages").insert({ ticket_id: ticket.id, sender_role: "admin", sender_name: qui, body, body_html });
      // Récapitulatif au client (optionnel) : il reçoit la référence et peut répondre par email
      let note = "";
      if (f.recap && email) {
        try {
          const texte = "Bonjour " + f.contact_name.trim() + ",\n\n" +
            "Suite à votre appel du " + quand + ", votre demande a été enregistrée sous la référence " + (ticket.reference || "") + ".\n\n" +
            "Votre demande :\n" + f.message.trim() + "\n\n" +
            (f.resolu ? "Solution apportée pendant l'appel :\n" + f.solution.trim() + "\n\nNous considérons cette demande comme résolue. Si le problème persiste, répondez simplement à cet email."
                      : "Notre équipe s'en occupe et revient vers vous rapidement. Pour toute précision, répondez directement à cet email en conservant la référence dans l'objet.");
          const mail = buildSignedEmail(texte);
          const res = await fetchEmailApi({ method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: email, subject: "[" + (ticket.reference || "DSI") + "] Votre appel au support — " + sujet, text: mail.text, html: mail.html, replyTo: SUPPORT_EMAIL, fromName: qui }) });
          if (!res.ok) note = " (le récapitulatif email n'a pas pu partir)";
        } catch (e) { note = " (le récapitulatif email n'a pas pu partir)"; }
      }
      setTickets(prev => [ticket, ...prev]);
      setTicketState(prev => ({ ...prev, [ticket.id]: { kind: null, since: null } }));
      setTelModal(null);
      setTicketFilter("telephone");
      if (note) alert("Ticket " + (ticket.reference || "") + " créé" + note + ".");
    } catch (e) {
      setTelModal({ ...f, busy: false, err: "Création impossible : " + (e.message || e) });
    }
  };

  // Alerte sauvegarde : le technicien indique qu'il a relancé la sauvegarde.
  // Ajoute un message daté et signé dans le fil du ticket (aucun email n'est envoyé).
  const [relanceBusy, setRelanceBusy] = useState(null);
  const marquerBackupRelance = async (t) => {
    if (!isAdmin || !t) return;
    const commentaire = window.prompt("Sauvegarde relancée — commentaire (facultatif) :\n(ex. espace libéré sur le datastore, job relancé manuellement)", "");
    if (commentaire === null) return; // annulé
    const qui = (profile && profile.full_name) || (session && session.user && session.user.email) || "Technicien DSI";
    const quand = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const esc = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const body = "Sauvegarde relancée par " + qui + " le " + quand + (commentaire.trim() ? " — " + commentaire.trim() : "");
    const body_html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">' +
      '<div style="background:#2B6CB0;color:#fff;border-radius:8px;padding:11px 15px;">' +
        '<div style="font-size:15px;font-weight:bold;">🔄 SAUVEGARDE RELANCÉE</div>' +
        '<div style="font-size:13px;margin-top:3px;">Par <b>' + esc(qui) + '</b> le ' + esc(quand) + '</div>' +
      '</div>' +
      (commentaire.trim() ? '<div style="margin-top:8px;padding:8px 12px;background:#EBF8FF;border-left:3px solid #2B6CB0;font-size:13px;">' + esc(commentaire.trim()) + '</div>' : '') +
      '<div style="font-size:12px;color:#666;margin-top:6px;">En attente de la prochaine remontée CheckCentral : un message « Sauvegarde rétablie » s\'ajoutera automatiquement si elle repasse OK.</div>' +
    '</div>';
    setRelanceBusy(t.id);
    try {
      const { error } = await sb.from("ticket_messages").insert({ ticket_id: t.id, sender_role: "admin", sender_name: qui, body, body_html });
      if (error) throw error;
      loadTicketMsgs(t.id);
    } catch (e) {
      alert("Impossible d'enregistrer la relance : " + (e.message || e));
    } finally {
      setRelanceBusy(null);
    }
  };

  // ====== CRÉATION DE BOÎTE MICROSOFT 365 (Worker dsi-hotel-provisioning) ======
  // Encadré affiché dans les tickets « Arrivée collaborateur » : le technicien choisit la licence,
  // vérifie l'adresse, puis crée le compte dans le tenant de l'hôtel (après validation RH / direction).
  const [prov, setProv] = useState({});                // { ticketId: { loading, err, data } }
  const [provForm, setProvForm] = useState(null);       // saisie du technicien pour le ticket ouvert
  const [provVerif, setProvVerif] = useState(null);     // { adresse, disponible, conflit, loading }
  const [provBusy, setProvBusy] = useState(false);
  const [provResultat, setProvResultat] = useState(null); // réponse de création (mot de passe affiché une seule fois)
  const [provFiltreGroupes, setProvFiltreGroupes] = useState("");
  const estTicketArrivee = (t) => !!t && /Arrivée collaborateur/i.test(String(t.subject || ""));

  const callProvisioning = async (route, payload) => {
    const { data: s } = await sb.auth.getSession();
    const res = await fetch(PROVISIONING_API_URL + route, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + ((s && s.session && s.session.access_token) || "") },
      body: JSON.stringify(payload || {}),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || ("Erreur " + res.status + " (le Worker dsi-hotel-provisioning est-il déployé ?)"));
    return d;
  };

  const chargerProvisioning = async (ticketId) => {
    setProv(prev => ({ ...prev, [ticketId]: { loading: true } }));
    setProvForm(null); setProvVerif(null); setProvFiltreGroupes("");
    try {
      const d = await callProvisioning("/provisioning/infos", { ticketId });
      setProv(prev => ({ ...prev, [ticketId]: { loading: false, data: d } }));
      if (d.proposition) {
        const p = d.proposition;
        setProvForm({ ticketId, local: p.local || "", domaine: p.domaine || "", prenom: p.prenom || "", nom: p.nom || "", nomAffiche: p.nomAffiche || "", poste: p.poste || "", service: "", telMfa: p.tel || "", skuId: "", groupes: [] });
        if (p.verification) setProvVerif({ adresse: p.local + "@" + p.domaine, ...p.verification });
      }
    } catch (e) {
      setProv(prev => ({ ...prev, [ticketId]: { loading: false, err: e.message || String(e) } }));
    }
  };

  const verifierAdresseProv = async () => {
    if (!provForm) return;
    const adresse = String(provForm.local || "").trim().toLowerCase() + "@" + provForm.domaine;
    setProvVerif({ adresse, loading: true });
    try {
      const d = await callProvisioning("/provisioning/verifier", { ticketId: provForm.ticketId, adresse });
      setProvVerif({ adresse, disponible: d.disponible, conflit: d.conflit });
    } catch (e) {
      setProvVerif({ adresse, disponible: null, conflit: e.message || String(e) });
    }
  };

  const creerBoiteProv = async (t) => {
    const f = provForm;
    const info = prov[t.id] && prov[t.id].data;
    if (!f || !info) return;
    const lic = (info.licences || []).find(l => l.skuId === f.skuId);
    if (!lic) { alert("Choisissez une licence."); return; }
    const adresse = String(f.local || "").trim().toLowerCase() + "@" + f.domaine;
    if (!confirm("Créer la boîte " + adresse + "\ndans le tenant « " + ((info.tenant && info.tenant.nom) || "") + " »\navec la licence « " + lic.nom + " » ?")) return;
    setProvBusy(true);
    try {
      const groupesNoms = {};
      (info.groupes || []).forEach(g => { if (f.groupes.includes(g.id)) groupesNoms[g.id] = g.nom; });
      const d = await callProvisioning("/provisioning/creer", {
        ticketId: t.id, local: f.local, domaine: f.domaine, prenom: f.prenom, nom: f.nom, nomAffiche: f.nomAffiche,
        poste: f.poste, service: f.service, skuId: f.skuId, groupes: f.groupes, groupesNoms, telMfa: f.telMfa,
      });
      setProvResultat({ ...d, ticketId: t.id });
      loadTicketMsgs(t.id);
      chargerProvisioning(t.id);
    } catch (e) {
      alert("Création impossible : " + (e.message || e));
    } finally {
      setProvBusy(false);
    }
  };

  // Chargement automatique à l'ouverture d'un ticket « Arrivée collaborateur »
  // (relu à chaque ouverture : licences, stock et validation peuvent avoir changé)
  const provDernierRef = useRef(null);
  useEffect(() => {
    if (!isAdmin || !openTicketId) { provDernierRef.current = null; return; }
    if (provDernierRef.current === openTicketId) return;
    const t = tickets.find(x => x.id === openTicketId);
    if (!t) return;
    provDernierRef.current = openTicketId;
    if (estTicketArrivee(t)) chargerProvisioning(openTicketId);
  }, [openTicketId, isAdmin, tickets.length]);

  const renderProvisioning = (t) => {
    const st = prov[t.id];
    const petitBtn = { padding: "4px 10px", background: "white", border: "1px solid #BFD5F2", color: "#1F4E8C", borderRadius: 6, fontSize: 11.5, cursor: "pointer" };
    const champ = { width: "100%", padding: "7px 9px", border: "1px solid #D5DCE8", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box", fontFamily: "inherit", background: "white" };
    const lbl = { display: "block", fontSize: 10.5, fontWeight: 700, color: "#5A6B85", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" };
    const note = (txt, c, bg) => React.createElement('div', { style: { fontSize: 12, color: c, background: bg, borderRadius: 6, padding: "7px 10px", marginBottom: 8, lineHeight: 1.5 } }, txt);
    const boite = (...contenu) => React.createElement('div', { style: { background: "#F3F7FD", border: "1px solid #BFD5F2", borderRadius: 8, padding: "12px 14px", marginBottom: 12 } },
      React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
        React.createElement('span', { style: { fontSize: 13.5, fontWeight: 700, color: "#1F4E8C" } }, "📧 Création Microsoft 365"),
        st && st.data && st.data.tenant && React.createElement('span', { style: { fontSize: 11.5, color: "#5A6B85" } }, "tenant « " + st.data.tenant.nom + " »"),
        React.createElement('button', { onClick: () => chargerProvisioning(t.id), disabled: provBusy, title: "Relire le tenant", style: { ...petitBtn, marginLeft: "auto" } }, "↻")
      ),
      ...contenu
    );

    // Fenêtre de résultat : mot de passe affiché une seule fois
    const modale = provResultat && provResultat.ticketId === t.id && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } },
      React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.3)" } },
        React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: provResultat.statut === "ok" ? "#256029" : "#B7791F", marginBottom: 10 } }, provResultat.statut === "ok" ? "✅ Boîte Microsoft 365 créée" : "⚠️ Boîte créée — étapes à reprendre"),
        React.createElement('div', { style: { fontSize: 13, color: "#333", marginBottom: 4 } }, "Adresse : ", React.createElement('b', null, provResultat.upn)),
        React.createElement('div', { style: { fontSize: 13, color: "#333", marginBottom: 12 } }, "Licence : " + (provResultat.licence || "")),
        React.createElement('div', { style: { background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 8, padding: "12px 14px", marginBottom: 12 } },
          React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: "#8A6D1F", textTransform: "uppercase", marginBottom: 6 } }, "Mot de passe provisoire"),
          React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10 } },
            React.createElement('code', { style: { fontSize: 18, fontWeight: 700, letterSpacing: 1, color: "#1a1a3e", userSelect: "all", flex: 1, wordBreak: "break-all" } }, provResultat.motDePasse),
            React.createElement('button', { onClick: () => { try { navigator.clipboard.writeText(provResultat.motDePasse); } catch (e) {} }, style: { padding: "6px 12px", background: G, border: "none", color: "#111", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Copier")
          ),
          React.createElement('div', { style: { fontSize: 11.5, color: "#8A6D1F", marginTop: 8, lineHeight: 1.5 } }, "Il ne sera plus affiché. Transmettez-le au collaborateur par un canal sûr (en main propre ou par téléphone, pas par email). Il devra le changer à sa première connexion.")
        ),
        React.createElement('div', { style: { marginBottom: 10 } },
          (provResultat.etapes || []).map((e, i) => React.createElement('div', { key: i, style: { fontSize: 12.5, color: e.ok ? "#256029" : "#C53030", marginBottom: 3 } }, (e.ok ? "✓ " : "✗ ") + e.etape + (e.detail && !e.ok ? " — " + e.detail : "")))
        ),
        provResultat.aFaireManuellement && note("À faire dans Exchange (listes de distribution / boîtes partagées demandées par l'hôtel) : " + provResultat.aFaireManuellement, "#5A4A00", "#FFF6D6"),
        provResultat.avertissement && note(provResultat.avertissement, "#C53030", "#FDECEC"),
        React.createElement('div', { style: { fontSize: 11.5, color: "#888", marginBottom: 14 } }, "La boîte mail sera active d'ici quelques minutes. Un résumé (sans mot de passe) a été ajouté au fil du ticket."),
        React.createElement('div', { style: { display: "flex", justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => setProvResultat(null), style: { padding: "9px 18px", background: "#1F4E8C", border: "none", color: "white", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer" } }, "J'ai noté le mot de passe")
        )
      )
    );

    if (!st || st.loading) return boite(React.createElement('div', { style: { fontSize: 12, color: "#777" } }, "Lecture du tenant Microsoft 365 de l'hôtel…"), modale);
    if (st.err) return boite(note("❌ " + st.err, "#C53030", "#FDECEC"), modale);
    const d = st.data || {};
    if (d.existant) {
      const e = d.existant;
      return boite(note((e.statut === "ok" ? "✅ " : "⚠️ ") + "Boîte déjà créée : " + e.upn + (e.licence ? " (" + e.licence + ")" : "") + (e.cree_par ? " par " + e.cree_par : "") + (e.cree_le ? " le " + new Date(e.cree_le).toLocaleString("fr-FR") : "") + (e.statut === "partiel" ? " — certaines étapes sont à reprendre (voir le fil du ticket)." : "."), e.statut === "ok" ? "#256029" : "#8A6D1F", e.statut === "ok" ? "#EAF6EC" : "#FFFBEB"), modale);
    }
    if ((d.blocages || []).length) return boite(...d.blocages.map((b, i) => React.createElement('div', { key: i, style: { fontSize: 12, color: "#5A6B85", marginBottom: 3 } }, "ℹ️ " + b)), modale);
    if (d.erreurGraph) return boite(note("❌ " + d.erreurGraph, "#C53030", "#FDECEC"), modale);
    const f = provForm && provForm.ticketId === t.id ? provForm : null;
    if (!f) return boite(React.createElement('div', { style: { fontSize: 12, color: "#777" } }, "Préparation…"), modale);

    const setF = (k, v) => setProvForm(prev => ({ ...prev, [k]: v }));
    const val = d.validation;
    const valide = !!(val && val.status === "validated");
    const lic = (d.licences || []).find(l => l.skuId === f.skuId);
    const adresse = String(f.local || "").trim().toLowerCase() + "@" + f.domaine;
    const verifCourante = provVerif && provVerif.adresse === adresse ? provVerif : null;
    const verifOk = !!(verifCourante && verifCourante.disponible === true);
    const manque = !valide ? "en attente de validation RH / direction" : !lic ? "choisissez une licence" : lic.dispo < 1 ? "plus de licence disponible" : !f.local || !f.domaine ? "adresse incomplète" : !f.nomAffiche.trim() ? "nom affiché obligatoire" : !verifOk ? "vérifiez que l'adresse est libre" : "";
    const ajoutables = (d.groupes || []).filter(g => g.ajoutable);
    const exchange = (d.groupes || []).filter(g => !g.ajoutable);
    const filtre = provFiltreGroupes.trim().toLowerCase();
    const groupesVus = ajoutables.filter(g => !filtre || (g.nom + " " + g.mail).toLowerCase().includes(filtre));

    return boite(
      !valide && note(val && val.status === "refused" ? "⛔ Demande refusée par " + (val.validateur_email || "le validateur") + " : création impossible." : "⏳ En attente de validation par " + ((val && val.validateur_email) || "le RH / la direction") + ". Vous pouvez préparer la saisie ; le bouton sera actif après validation.", val && val.status === "refused" ? "#C53030" : "#8A6D1F", val && val.status === "refused" ? "#FDECEC" : "#FFFBEB"),
      d.source === "texte" && note("Ticket créé avant l'enregistrement structuré du formulaire : les informations ont été relues dans le texte de la demande, vérifiez-les.", "#5A6B85", "#EEF2F8"),
      d.hybride && note("⚠️ Ce tenant est synchronisé avec un Active Directory local (Entra Connect). Vérifiez que le compte Windows du collaborateur sera créé dans une OU non synchronisée, sinon il fusionnera avec ce compte ou créera un doublon.", "#8A6D1F", "#FFFBEB"),
      d.avertissementDomaine && note("⚠️ " + d.avertissementDomaine, "#8A6D1F", "#FFFBEB"),
      // Adresse
      React.createElement('label', { style: lbl }, "Adresse mail"),
      React.createElement('div', { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 } },
        React.createElement('input', { value: f.local, onChange: e => setF("local", e.target.value), placeholder: "prenom.nom", style: { ...champ, width: "auto", flex: "1 1 160px" } }),
        React.createElement('span', { style: { fontSize: 13, color: "#555" } }, "@"),
        React.createElement('select', { value: f.domaine, onChange: e => setF("domaine", e.target.value), style: { ...champ, width: "auto", flex: "1 1 160px" } },
          (d.domaines || []).map(x => React.createElement('option', { key: x.nom, value: x.nom }, x.nom + (x.defaut ? " (par défaut)" : "")))),
        React.createElement('button', { onClick: verifierAdresseProv, disabled: provBusy || (verifCourante && verifCourante.loading), style: petitBtn }, verifCourante && verifCourante.loading ? "…" : "Vérifier")
      ),
      React.createElement('div', { style: { fontSize: 11.5, marginBottom: 10, color: verifOk ? "#256029" : (verifCourante && verifCourante.disponible === false ? "#C53030" : "#8A6D1F") } },
        verifCourante && !verifCourante.loading
          ? (verifCourante.disponible === true ? "✓ " + adresse + " est libre" : "✗ " + (verifCourante.conflit || "Adresse indisponible"))
          : (verifCourante ? "Vérification…" : "Cliquez sur « Vérifier » pour contrôler que l'adresse est libre.")),
      // Identité
      React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1.3fr", gap: 8, marginBottom: 10 } },
        React.createElement('div', null, React.createElement('label', { style: lbl }, "Prénom"), React.createElement('input', { value: f.prenom, onChange: e => setF("prenom", e.target.value), style: champ })),
        React.createElement('div', null, React.createElement('label', { style: lbl }, "Nom"), React.createElement('input', { value: f.nom, onChange: e => setF("nom", e.target.value), style: champ })),
        React.createElement('div', null, React.createElement('label', { style: lbl }, "Nom affiché"), React.createElement('input', { value: f.nomAffiche, onChange: e => setF("nomAffiche", e.target.value), style: champ }))
      ),
      React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8, marginBottom: 10 } },
        React.createElement('div', null, React.createElement('label', { style: lbl }, "Poste"), React.createElement('input', { value: f.poste, onChange: e => setF("poste", e.target.value), style: champ })),
        React.createElement('div', null, React.createElement('label', { style: lbl }, "Service (facultatif)"), React.createElement('input', { value: f.service, onChange: e => setF("service", e.target.value), placeholder: "Réception, Direction…", style: champ })),
        React.createElement('div', null, React.createElement('label', { style: lbl }, "Téléphone MFA (SMS)"), React.createElement('input', { value: f.telMfa, onChange: e => setF("telMfa", e.target.value), placeholder: "+33 612345678", style: champ }))
      ),
      // Licence (choix du technicien)
      React.createElement('label', { style: lbl }, "Licence *"),
      React.createElement('select', { value: f.skuId, onChange: e => setF("skuId", e.target.value), style: { ...champ, marginBottom: 10, borderColor: f.skuId ? "#D5DCE8" : "#F0B429" } },
        React.createElement('option', { value: "" }, (d.licences || []).length ? "— Choisir la licence —" : "Aucune licence payante dans ce tenant"),
        (d.licences || []).map(l => React.createElement('option', { key: l.skuId, value: l.skuId, disabled: l.dispo < 1 }, l.nom + " — " + (l.dispo < 1 ? "aucune disponible" : l.dispo + " disponible" + (l.dispo > 1 ? "s" : "")) + " (" + l.utilisees + "/" + l.total + ")"))),
      // Groupes
      React.createElement('label', { style: lbl }, "Groupes"),
      d.form && d.form.groupesMail && note("Demandé par l'hôtel : " + d.form.groupesMail, "#5A4A00", "#FFF6D6"),
      ajoutables.length > 0 && React.createElement('input', { value: provFiltreGroupes, onChange: e => setProvFiltreGroupes(e.target.value), placeholder: "Filtrer les groupes…", style: { ...champ, marginBottom: 6 } }),
      React.createElement('div', { style: { maxHeight: 150, overflowY: "auto", background: "white", border: "1px solid #D5DCE8", borderRadius: 6, padding: ajoutables.length ? 6 : 0, marginBottom: 4 } },
        groupesVus.map(g => React.createElement('label', { key: g.id, style: { display: "flex", alignItems: "center", gap: 7, fontSize: 12, padding: "3px 4px", cursor: "pointer" } },
          React.createElement('input', { type: "checkbox", checked: f.groupes.includes(g.id), onChange: e => setF("groupes", e.target.checked ? [...f.groupes, g.id] : f.groupes.filter(x => x !== g.id)) }),
          React.createElement('span', { style: { color: "#1a1a3e" } }, g.nom),
          React.createElement('span', { style: { color: "#999", fontSize: 11 } }, g.type + (g.mail ? " · " + g.mail : ""))
        ))
      ),
      React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 12 } },
        (ajoutables.length ? f.groupes.length + " groupe(s) sélectionné(s). " : "Aucun groupe Microsoft 365 ou de sécurité dans ce tenant. ") +
        (exchange.length ? exchange.length + " liste(s) de distribution / groupe(s) Exchange ou synchronisé(s) : à gérer à la main dans Exchange ou l'AD." : "")),
      // Action
      React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" } },
        manque && React.createElement('span', { style: { fontSize: 11.5, color: "#8A6D1F" } }, "Pour créer : " + manque),
        React.createElement('button', { onClick: () => creerBoiteProv(t), disabled: !!manque || provBusy, style: { padding: "9px 18px", background: manque ? "#B8C4D6" : "#1F4E8C", border: "none", color: "white", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: manque || provBusy ? "default" : "pointer", opacity: provBusy ? 0.6 : 1 } }, provBusy ? "Création en cours…" : "📧 Créer la boîte mail")
      ),
      modale
    );
  };

  // ====== DÉVERROUILLAGE D'UN COMPTE AD (Worker dsi-hotel-sophos → script NinjaOne sur le DC) ======
  const [adTicket, setAdTicket] = useState(null);     // ticket pour lequel la fenêtre est ouverte
  const [adCompte, setAdCompte] = useState("");
  const [adSugg, setAdSugg] = useState([]);           // identifiants proposés d'après le ticket
  const [adBusy, setAdBusy] = useState(false);
  const [adEtat, setAdEtat] = useState(null);         // { phase: "envoi"|"attente"|"fini"|"erreur", msg, dc, resultat }
  const [adTrace, setAdTrace] = useState(true);       // ajouter le résultat dans le fil du ticket (sans email)
  const adPollRef = useRef(0);                         // identifie la demande en cours (annule les anciennes)

  const ouvrirDeverrouillageAd = (t) => {
    if (!isAdmin || !t) return;
    adPollRef.current++;
    setAdTicket(t); setAdEtat(null); setAdBusy(false); setAdTrace(true);
    const sugg = [];
    const ajoute = (v) => { v = String(v || "").trim().toLowerCase().replace(/\s+/g, ""); if (/^[a-z0-9._-]{2,64}$/.test(v) && !sugg.includes(v)) sugg.push(v); };
    // 1) partie locale de l'email du demandeur (ex. guestrelation@gphotel.com -> guestrelation)
    const loc = String(t.contact_email || "").split("@")[0];
    if (loc && !/^(prvs|btv|bounce)/i.test(loc)) ajoute(loc);
    // 2) « session X », « compte X », « utilisateur X » dans la demande et le fil
    const txt = [t.subject || "", t.message || ""].concat((ticketMsgs[t.id] || []).map(m => m.body || "")).join(" ");
    const re = /\b(?:session|compte|utilisateur|login|identifiant)\s+(?:windows\s+|ad\s+|de\s+|du\s+|d['’]\s*)?["«]?\s*([A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+)?)/gi;
    let m;
    while ((m = re.exec(txt)) && sugg.length < 6) {
      const mots = m[1].split(/\s+/).filter(w => !/^(du|de|des|est|sur|qui|pour|bo|est|toujours|bloqu|verrou)/i.test(w));
      if (mots.length) { ajoute(mots.join("")); if (mots.length > 1) ajoute(mots[0]); }
    }
    setAdSugg(sugg);
    setAdCompte(sugg[0] || "");
  };

  const lancerDeverrouillageAd = async (mode) => {
    const t = adTicket;
    const compte = adCompte.trim();
    if (!t || adBusy) return;
    if (!t.hotel_id) { setAdEtat({ phase: "erreur", msg: "Ce ticket n'est rattaché à aucun établissement : rattachez-le d'abord à son hôtel." }); return; }
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(compte)) { setAdEtat({ phase: "erreur", msg: "Identifiant invalide : saisissez le nom de connexion Windows (ex. guestrelation), sans domaine ni espace." }); return; }
    const h = hotels.find(x => x.id === t.hotel_id);
    if (mode === "deverrouiller" && !window.confirm("Déverrouiller le compte « " + compte + " » dans l'Active Directory de " + (h ? h.name : "l'hôtel") + " ?")) return;
    const essai = ++adPollRef.current;
    setAdBusy(true);
    setAdEtat({ phase: "envoi", msg: "Recherche du contrôleur de domaine dans NinjaOne…" });
    try {
      const d = await callSophosApi("/ad-deverrouiller", { hotelId: t.hotel_id, compte, mode });
      setAdEtat({ phase: "attente", dc: d.dc, msg: "Script lancé sur " + d.dc + ", en attente du résultat…" });
      const debut = Date.now();
      let dernierDetail = "";
      while (Date.now() - debut < 120000) {
        await new Promise(res => setTimeout(res, 4000));
        if (adPollRef.current !== essai) return; // fenêtre fermée ou nouvelle demande
        const r = await callSophosApi("/ad-resultat", { deviceId: d.deviceId, jeton: d.jeton });
        if (r.detail) dernierDetail = r.detail;
        if (r.pret) {
          const res = r.resultat || {};
          setAdEtat({ phase: res.ok ? "fini" : "erreur", dc: d.dc, resultat: res, msg: res.message || "" });
          if (adTrace && res.ok) ajouterTraceAd(t, res, d.dc);
          return;
        }
        const s = Math.round((Date.now() - debut) / 1000);
        setAdEtat({ phase: "attente", dc: d.dc, msg: "Script lancé sur " + d.dc + ", en attente du résultat… (" + s + " s)" });
      }
      setAdEtat({ phase: "erreur", dc: d.dc, msg: "Pas de résultat après 2 minutes. Le script a peut-être été exécuté : vérifiez l'activité du serveur " + d.dc + " dans NinjaOne." + (dernierDetail ? " Détail : " + dernierDetail : "") });
    } catch (e) {
      if (adPollRef.current === essai) setAdEtat({ phase: "erreur", msg: (e && e.message) || String(e) });
    } finally {
      if (adPollRef.current === essai) setAdBusy(false);
    }
  };

  // Autorisation NinjaOne « technicien » (une fois) : nécessaire pour lancer des scripts
  const connecterNinja = async () => {
    try {
      const d = await callSophosApi("/ninja/lien", {});
      if (d.url) window.open(d.url, "_blank", "noopener");
      setAdEtat({ phase: "erreur", msg: "Connectez-vous à NinjaOne dans l'onglet qui vient de s'ouvrir et cliquez sur « Autoriser », puis revenez ici et relancez l'action." });
    } catch (e) { setAdEtat({ phase: "erreur", msg: (e && e.message) || String(e) }); }
  };

  const fmtAd = (iso) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso; } };

  const ajouterTraceAd = async (t, res, dc) => {
    const qui = (profile && profile.full_name) || (session && session.user && session.user.email) || "Technicien DSI";
    const quand = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const esc = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const titre = res.deverrouille ? "🔓 COMPTE AD DÉVERROUILLÉ" : (res.mode === "diagnostic" ? "🔎 DIAGNOSTIC COMPTE AD" : "ℹ️ COMPTE AD NON VERROUILLÉ");
    const sources = (res.source_verrouillage || []).map(x => (x.poste || "?") + " (" + fmtAd(x.heure) + ")").join(", ");
    const lignes = [
      "Compte : " + res.compte + (res.nom ? " (" + res.nom + ")" : ""),
      "Serveur : " + (dc || res.serveur || "?"),
      "Échecs de mot de passe : " + (res.echecs == null ? "—" : res.echecs) + (res.dernier_echec ? " — dernier le " + fmtAd(res.dernier_echec) : ""),
      sources ? "Verrouillé depuis le(s) poste(s) : " + sources : null,
      res.mdp_expire ? "⚠ Mot de passe expiré" : null,
    ].filter(Boolean);
    const body = titre + " — par " + qui + " le " + quand + "\n" + lignes.join("\n") + (res.message ? "\n" + res.message : "");
    const body_html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">' +
      '<div style="background:' + (res.deverrouille ? "#2F855A" : "#2B6CB0") + ';color:#fff;border-radius:8px;padding:11px 15px;">' +
        '<div style="font-size:15px;font-weight:bold;">' + esc(titre) + '</div>' +
        '<div style="font-size:13px;margin-top:3px;">Par <b>' + esc(qui) + '</b> le ' + esc(quand) + '</div>' +
      '</div>' +
      '<div style="margin-top:8px;padding:8px 12px;background:#F4F7FB;border-left:3px solid #2B6CB0;font-size:13px;line-height:1.6;">' + lignes.map(esc).join("<br>") +
        (res.message ? '<br><i>' + esc(res.message) + '</i>' : '') + '</div>' +
    '</div>';
    try {
      const { error } = await sb.from("ticket_messages").insert({ ticket_id: t.id, sender_role: "admin", sender_name: qui, body, body_html });
      if (!error) loadTicketMsgs(t.id);
    } catch (e) {}
  };

  const preparerReponseAd = () => {
    const res = adEtat && adEtat.resultat;
    const t = adTicket;
    if (!res || !t) return;
    const escE = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const prenom = String(t.contact_name || "").trim();
    const salut = "Bonjour" + (prenom ? " " + prenom : "") + ",";
    const src = (res.source_verrouillage || [])[0];
    let p1, p2 = "";
    if (res.deverrouille) {
      p1 = "La session « " + res.compte + " » est de nouveau déverrouillée, vous pouvez vous reconnecter.";
      p2 = "Elle s'était bloquée après plusieurs saisies d'un mot de passe incorrect" + (src && src.poste ? " (depuis le poste " + src.poste + ")" : "") +
        ". Si elle se bloque à nouveau, c'est généralement qu'un ancien mot de passe est encore enregistré sur un poste, un téléphone ou une imprimante : merci de nous l'indiquer et nous le corrigerons.";
    } else {
      p1 = "La session « " + res.compte + " » n'est pas verrouillée de notre côté.";
      p2 = res.mdp_expire ? "Son mot de passe a expiré : il doit être changé à la prochaine connexion. Nous pouvons vous aider si besoin."
        : "Si la connexion échoue toujours, vérifiez le mot de passe saisi (majuscules, clavier) ou envoyez-nous une capture du message affiché.";
    }
    const plain = salut + "\n\n" + p1 + "\n\n" + p2 + "\n\nCordialement,";
    const html = "<p>" + escE(salut) + "</p><p>" + escE(p1) + "</p><p>" + escE(p2) + "</p><p>Cordialement,</p>";
    setReplyHtmlOverride(null);
    setReplyHtml(prev => (prev && prev.trim()) ? (prev + "<br>" + html) : html);
    setReplyText(prev => { const q = (prev || "").trim(); return q ? (q + "\n\n" + plain) : plain; });
    adPollRef.current++;
    setAdTicket(null);
  };

  // ====== AGENT CLAUDE (Worker dsi-hotel-agent) : brouillon de réponse, relu par un technicien ======
  const [agTicket, setAgTicket] = useState(null);     // ticket pour lequel la fenêtre est ouverte
  const [agEtat, setAgEtat] = useState(null);         // { phase: "analyse"|"pret"|"verif"|"erreur", msg, data }
  const [agTexte, setAgTexte] = useState("");         // brouillon modifiable
  const [agDevice, setAgDevice] = useState("");       // PC choisi à la main (id NinjaOne)
  const [agScripts, setAgScripts] = useState([]);     // résultats de scripts de vérification [{ cle, deviceId, resultat }]
  const agRef = useRef(0);

  const callAgentApi = async (path, payload) => {
    const { data: sessionData } = await sb.auth.getSession();
    const token = (sessionData.session && sessionData.session.access_token) || "";
    const res = await fetch(AGENT_API_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ("Erreur " + res.status + " (le Worker dsi-hotel-agent est-il déployé ?)"));
    return data;
  };

  const lancerAgent = async (t, deviceId, resultatsScripts) => {
    const essai = ++agRef.current;
    setAgEtat(prev => ({ phase: "analyse", msg: resultatsScripts && resultatsScripts.length ? "L'agent relit le ticket avec les résultats des vérifications…" : "L'agent lit le ticket, identifie le PC et vérifie son état dans NinjaOne…", data: prev && prev.data }));
    try {
      const d = await callAgentApi("/proposer", { ticketId: t.id, deviceId: deviceId || undefined, resultatsScripts: resultatsScripts || [] });
      if (agRef.current !== essai) return;
      setAgTexte((d.proposition && d.proposition.reponse_client) || "");
      setAgDevice(d.ninja && d.ninja.identification && d.ninja.identification.deviceId ? String(d.ninja.identification.deviceId) : (deviceId || ""));
      setAgEtat({ phase: "pret", data: d });
    } catch (e) {
      if (agRef.current === essai) setAgEtat({ phase: "erreur", msg: (e && e.message) || String(e) });
    }
  };

  const ouvrirAgent = (t) => {
    if (!isAdmin || !t) return;
    setAgTicket(t); setAgTexte(""); setAgDevice(""); setAgScripts([]); setAgEtat(null);
    lancerAgent(t, null, []);
  };
  const fermerAgent = () => { agRef.current++; setAgTicket(null); setAgEtat(null); };

  // Scripts de vérification (lecture seule, liste fermée agent_scripts) — lancés seulement sur clic du technicien
  const lancerVerifsAgent = async () => {
    const t = agTicket, d = agEtat && agEtat.data;
    if (!t || !d) return;
    const pcId = agDevice || (d.ninja && d.ninja.identification && d.ninja.identification.deviceId);
    const cles = (d.scripts || []).map(x => x.cle);
    // Scripts réservés à un serveur de l'hôtel (ex. serveur d'impression, Opera) : pas besoin de choisir un PC
    const surServeur = (d.scripts || []).length > 0 && d.scripts.every(x => x.serveur);
    if ((!pcId && !surServeur) || !cles.length) return;
    const ou = surServeur ? "le serveur " + d.scripts[0].serveur : "le PC";
    const essai = ++agRef.current;
    setAgEtat({ phase: "verif", msg: "Lancement sur " + ou + "…", data: d });
    try {
      const r = await callAgentApi("/verifier", { ticketId: t.id, deviceId: surServeur ? null : pcId, scripts: cles });
      const deviceId = r.deviceId || pcId; // appareil réellement utilisé (le serveur pour un script serveur)
      const jetons = (r.lances || []).filter(x => x.ok).map(x => ({ cle: x.cle, jeton: x.jeton }));
      const echecs = (r.lances || []).filter(x => !x.ok);
      if (!jetons.length) throw new Error("Aucune vérification lancée" + (echecs.length ? " : " + echecs.map(x => x.cle + " — " + x.erreur).join(" ; ") : ""));
      const debut = Date.now();
      let res = null;
      while (Date.now() - debut < 150000) {
        await new Promise(ok => setTimeout(ok, 5000));
        if (agRef.current !== essai) return;
        setAgEtat({ phase: "verif", msg: "En cours sur " + ou + " (" + Math.round((Date.now() - debut) / 1000) + " s)…", data: d });
        res = await callAgentApi("/verifier-resultat", { deviceId, jetons }).catch(() => null);
        if (res && res.tous_prets) break;
      }
      const obtenus = ((res && res.resultats) || []).filter(x => x.pret).map(x => ({ cle: x.cle, deviceId, resultat: x.resultat }));
      if (!obtenus.length) throw new Error("Pas de résultat des scripts après 2 min 30 (" + ou + " lent ou script en échec : voir ses activités dans NinjaOne).");
      const tous = agScripts.filter(a => !obtenus.some(o => o.cle === a.cle)).concat(obtenus);
      setAgScripts(tous);
      await lancerAgent(t, pcId || null, tous);
    } catch (e) {
      if (agRef.current === essai) setAgEtat({ phase: "erreur", msg: (e && e.message) || String(e), data: d });
    }
  };

  const retourAgent = (statut) => {
    const d = agEtat && agEtat.data;
    if (d && d.propositionId) callAgentApi("/retour", { propositionId: d.propositionId, statut }).catch(() => {});
  };

  const utiliserReponseAgent = () => {
    const plain = String(agTexte || "").trim();
    if (!plain) return;
    const escE = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = plain.split(/\n{2,}/).map(par => "<p>" + escE(par).replace(/\n/g, "<br>") + "</p>").join("");
    setReplyHtmlOverride(null);
    setReplyHtml(prev => (prev && prev.trim()) ? (prev + "<br>" + html) : html);
    setReplyText(prev => { const q = (prev || "").trim(); return q ? (q + "\n\n" + plain) : plain; });
    retourAgent("utilisee");
    fermerAgent();
  };

  const connecterNinjaAgent = async () => {
    try {
      const d = await callAgentApi("/ninja/lien", {});
      if (d.url) window.open(d.url, "_blank", "noopener");
      setAgEtat(prev => ({ phase: "erreur", data: prev && prev.data, msg: "Dans l'onglet NinjaOne qui vient de s'ouvrir, connectez-vous avec le compte « agent » (pas votre compte technicien) et cliquez sur « Autoriser », puis relancez l'agent." }));
    } catch (e) { setAgEtat(prev => ({ phase: "erreur", data: prev && prev.data, msg: (e && e.message) || String(e) })); }
  };

  // ====== BLOCAGE D'EXPÉDITEUR FRAUDULEUX (Worker dsi-hotel-blocage → Defender M365) ======
  const [blqTicket, setBlqTicket] = useState(null);          // ticket pour lequel la fenêtre est ouverte
  const [blqTenants, setBlqTenants] = useState(null);        // [{ key, nom, domaines }] — null = pas encore chargé
  const [blqTenant, setBlqTenant] = useState("");
  const [blqAdresse, setBlqAdresse] = useState("");
  const [blqSuggestions, setBlqSuggestions] = useState([]);  // adresses externes trouvées dans le ticket
  const [blqTrace, setBlqTrace] = useState(false);           // ajouter un bandeau dans le fil du ticket (sans email)
  const [blqEmail, setBlqEmail] = useState(true);            // préparer l'email d'explication dans la zone de réponse
  const [blqBusy, setBlqBusy] = useState(false);
  const [blqMsg, setBlqMsg] = useState("");

  const callBlocageApi = async (method, path, payload) => {
    const { data: sessionData } = await sb.auth.getSession();
    const token = (sessionData.session && sessionData.session.access_token) || "";
    const res = await fetch(BLOCAGE_API_URL + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: method === "POST" ? JSON.stringify(payload || {}) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.statut) throw new Error(data.erreur || ("Erreur " + res.status + " (le Worker dsi-hotel-blocage est-il déployé ?)"));
    return data;
  };

  const ouvrirBlocage = async (t) => {
    if (!isAdmin || !t) return;
    setBlqTicket(t); setBlqMsg(""); setBlqBusy(false); setBlqTrace(false); setBlqEmail(true); setBlqAdresse(""); setBlqSuggestions([]); setBlqTenant("");
    let tenants = blqTenants;
    if (!tenants) {
      try { tenants = await callBlocageApi("GET", "/blocage/tenants"); setBlqTenants(tenants); }
      catch (e) { tenants = []; setBlqMsg("❌ " + (/non autoris/i.test(String((e && e.message) || e)) ? "Accès refusé par le Worker de blocage : votre compte n'est pas autorisé (variable ADMINS_AUTORISES). Contactez Jérémie." : (e.message || e))); }
    }
    // Établissement présélectionné d'après le domaine du demandeur
    const contact = String(t.contact_email || "").toLowerCase();
    const domContact = contact.split("@")[1] || "";
    const auto = (tenants || []).find(x => (x.domaines || []).includes(domContact));
    if (auto) setBlqTenant(auto.key);
    // Adresses externes citées dans la demande et le fil (hors hôtel, DSI Hotel et demandeur)
    const exclus = new Set(["dsihotel.fr", "dsihotel.com"].concat(...(tenants || []).map(x => x.domaines || [])));
    const textes = [t.message || ""].concat((ticketMsgs[t.id] || []).map(m => (m.body || "") + " " + (m.body_html || "")));
    const trouvees = new Set((textes.join(" ").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map(a => a.toLowerCase()));
    const sugg = [...trouvees].filter(a => a !== contact && !exclus.has(a.split("@")[1])).slice(0, 8);
    setBlqSuggestions(sugg);
    if (sugg.length === 1) setBlqAdresse(sugg[0]);
  };

  const executerBlocage = async () => {
    const t = blqTicket;
    if (!t || blqBusy) return;
    const adresse = blqAdresse.trim().toLowerCase();
    if (!blqTenant) { setBlqMsg("❌ Choisissez l'établissement (tenant Microsoft 365)."); return; }
    if (!/^[^@\s*]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(adresse)) { setBlqMsg("❌ Adresse email complète obligatoire (pas de domaine seul ni de *)."); return; }
    const nomTenant = ((blqTenants || []).find(x => x.key === blqTenant) || {}).nom || blqTenant;
    if (!window.confirm("Bloquer " + adresse + " pour toutes les boîtes du tenant « " + nomTenant + " » ?")) return;
    setBlqBusy(true); setBlqMsg("");
    try {
      const r = await callBlocageApi("POST", "/blocage", { action: "bloquer", tenant: blqTenant, expediteur: adresse, ticketRef: t.reference || "" });
      if (r.statut !== "ok") throw new Error(r.resultat || "Échec du blocage");
      setBlqMsg("✓ " + r.resultat + (blqEmail ? "\n\n✉️ L'email d'explication est prêt dans la zone de réponse du ticket : relisez-le puis cliquez sur « Répondre » (ou « Répondre et fermer »)." : ""));
      if (blqEmail) {
        const escE = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const prenom = String(t.contact_name || "").trim();
        const salut = "Bonjour" + (prenom ? " " + prenom : "") + ",";
        const p1 = "Merci pour votre vigilance. L'adresse " + adresse + " est désormais bloquée sur l'ensemble de votre messagerie : les prochains emails de cet expéditeur seront automatiquement mis en quarantaine.";
        const p2 = "Les fraudeurs changent régulièrement d'adresse : d'autres messages du même type peuvent arriver depuis une adresse différente. Ne modifiez jamais de coordonnées bancaires (RIB, virement, fournisseur) sur la base d'un email, et confirmez toujours la demande par un appel à la personne concernée, sur son numéro habituel.";
        const p3 = "N'hésitez pas à nous transmettre tout nouveau message suspect via le portail.";
        const plain = salut + "\n\n" + p1 + "\n\n" + p2 + "\n\n" + p3 + "\n\nCordialement,";
        const html = "<p>" + escE(salut) + "</p>" +
          "<p>Merci pour votre vigilance. L'adresse <b>" + escE(adresse) + "</b> est désormais bloquée sur l'ensemble de votre messagerie : les prochains emails de cet expéditeur seront automatiquement mis en quarantaine.</p>" +
          "<p>Les fraudeurs changent régulièrement d'adresse : d'autres messages du même type peuvent arriver depuis une adresse différente. <b>Ne modifiez jamais de coordonnées bancaires</b> (RIB, virement, fournisseur) sur la base d'un email, et confirmez toujours la demande par un appel à la personne concernée, sur son numéro habituel.</p>" +
          "<p>" + escE(p3) + "</p><p>Cordialement,</p>";
        setReplyHtmlOverride(null);
        setReplyHtml(prev => (prev && prev.trim()) ? (prev + "<br>" + html) : html);
        setReplyText(prev => { const q = (prev || "").trim(); return q ? (q + "\n\n" + plain) : plain; });
      }
      if (blqTrace) {
        const qui = (profile && profile.full_name) || (session && session.user && session.user.email) || "Technicien DSI";
        const quand = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const esc = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const body = "Expéditeur bloqué : " + adresse + " — par " + qui + " le " + quand + ". Les prochains emails de cette adresse seront mis en quarantaine.";
        const body_html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">' +
          '<div style="background:#B3261E;color:#fff;border-radius:8px;padding:11px 15px;">' +
            '<div style="font-size:15px;font-weight:bold;">🚫 EXPÉDITEUR BLOQUÉ</div>' +
            '<div style="font-size:13px;margin-top:3px;"><b>' + esc(adresse) + '</b> — par ' + esc(qui) + ' le ' + esc(quand) + '</div>' +
          '</div>' +
          '<div style="font-size:12.5px;color:#555;margin-top:6px;">Les prochains emails de cette adresse seront automatiquement mis en quarantaine sur l\'ensemble de votre messagerie. Rappel : ne modifiez jamais de coordonnées bancaires sur simple email, confirmez toujours par téléphone.</div>' +
        '</div>';
        const { error } = await sb.from("ticket_messages").insert({ ticket_id: t.id, sender_role: "admin", sender_name: qui, body, body_html });
        if (error) setBlqMsg("✓ " + r.resultat + " (trace dans le ticket impossible : " + error.message + ")");
        else loadTicketMsgs(t.id);
      }
    } catch (e) {
      setBlqMsg("❌ " + (e.message || e));
    } finally {
      setBlqBusy(false);
    }
  };

  const enregistrerNote = async (ticket) => {
    if (!isAdmin) return;
    setNoteBusy(true);
    try {
      const { error } = await sb.rpc("set_ticket_note", { p_ticket_id: ticket.id, p_note: noteText });
      if (error) { alert("Erreur lors de l'enregistrement de la remarque : " + error.message); return; }
      setNoteSaved(prev => ({ ...prev, [ticket.id]: !!noteText.trim() }));
      setNoteOpenId(null);
    } catch (e) {
      alert("Erreur lors de l'enregistrement de la remarque.");
    } finally {
      setNoteBusy(false);
    }
  };
  // Le son est généré à la volée via la Web Audio API : aucun fichier externe à héberger.
  // Les navigateurs bloquent l'audio tant que l'utilisateur n'a pas interagi avec la page :
  // on "débloque" donc le contexte audio au premier clic/touche.
  const audioCtxRef = useRef(null);
  const audioReadyRef = useRef(false);
  const [rtStatus, setRtStatus] = useState("…"); // état de l'abonnement Realtime (diagnostic)

  useEffect(() => {
    const debloquer = () => {
      try {
        if (!audioCtxRef.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) audioCtxRef.current = new AC();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
        audioReadyRef.current = true;
      } catch (e) {}
    };
    window.addEventListener("click", debloquer);
    window.addEventListener("keydown", debloquer);
    return () => {
      window.removeEventListener("click", debloquer);
      window.removeEventListener("keydown", debloquer);
    };
  }, []);

  // Joue un "bip-bip" à deux notes. Volume renforcé (gain crête ~0.55) pour être
  // bien audible en environnement de travail.
  // Si le paramètre force n'est pas true, on respecte la préférence utilisateur
  // (bouton ON/OFF de la barre latérale) : son coupé => on ne joue rien.
  const jouerSonAlerte = (force) => {
    if (!force && !dsiGetSound()) return; // notifications audio désactivées
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || !audioReadyRef.current) return;
      if (ctx.state === "suspended") ctx.resume();
      const notes = [880, 1174]; // La5 puis Ré6
      notes.forEach((freq, i) => {
        const t0 = ctx.currentTime + i * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.19);
      });
    } catch (e) {}
  };

  // ---------- POP-UPS (toasts) des nouveaux tickets / réponses ----------
  // Affichées 10 s en haut de l'écran ; clic = ouvre le ticket.
  const [toasts, setToasts] = useState([]);
  const toastTicketsRecentsRef = useRef({});
  const ticketsRef = useRef([]);
  const hotelsRef = useRef([]);
  ticketsRef.current = tickets;
  hotelsRef.current = hotels;
  const nomHotelToast = (hid) => { const h = (hotelsRef.current || []).find(x => x.id === hid); return h ? h.name : (hid ? "" : "Non assigné"); };
  const fermerToast = (id) => setToasts(prev => prev.filter(x => x.id !== id));
  const ajouterToast = (t) => {
    const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    setToasts(prev => [...prev.slice(-3), { ...t, id }]); // 4 pop-ups max à l'écran
    setTimeout(() => fermerToast(id), 10000);
  };
  const ouvrirTicketToast = (t) => {
    fermerToast(t.id);
    if (t.reference) {
      setTicketFilter("all");
      setPendingTicketRef(String(t.reference).toUpperCase());
      if (page !== "tickets-admin") go("tickets-admin");
    } else {
      setTicketFilter("all");
      go("tickets-admin");
      setOpenTicketId(t.ticketId);
      loadTicketMsgs(t.ticketId);
    }
  };

  // Abonnement Realtime : uniquement pour les admins (dont le super-admin).
  // Nécessite que la réplication Realtime soit activée sur les tables
  // "tickets" et "ticket_messages" dans Supabase (voir instructions).
  useEffect(() => {
    if (!isAdmin) return;

    const canal = sb
      .channel("alerte-tickets")
      // Nouveau ticket créé (portail client OU email entrant)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        (payload) => {
          jouerSonAlerte();
          if (page === "tickets-admin") loadTickets();
          const t = payload && payload.new;
          if (t && t.id) {
            toastTicketsRecentsRef.current[t.id] = Date.now();
            const auto = t.source === "checkcentral" || t.source === "sophos" || t.source === "m365" || estAlerteDefender(t);
            ajouterToast({
              kind: auto ? "alerte" : "nouveau",
              ticketId: t.id, reference: t.reference,
              qui: t.contact_name || t.contact_email || (auto ? "Alerte automatique" : "Inconnu"),
              email: t.contact_email || "",
              hotel: nomHotelToast(t.hotel_id),
              sujet: t.subject || t.category || "",
              extrait: t.message || "",
            });
          }
        }
      )
      // Nouvelle réponse — on ne sonne que si elle vient d'un client,
      // jamais pour les messages émis par le support lui-même.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        (payload) => {
          const role = payload && payload.new && payload.new.sender_role;
          if (role === "client") {
            const m = payload.new;
            // Premier message d'un ticket qui vient d'être créé : déjà annoncé par « Nouveau ticket ».
            const cree = toastTicketsRecentsRef.current[m.ticket_id];
            if (cree && Date.now() - cree < 60000) return;
            jouerSonAlerte();
            if (page === "tickets-admin") loadTickets();
            (async () => {
              let t = (ticketsRef.current || []).find(x => x.id === m.ticket_id);
              if (!t) {
                try { const r = await sb.from("tickets").select("id,reference,subject,hotel_id,contact_name,contact_email").eq("id", m.ticket_id).single(); t = r.data || null; } catch (e) {}
              }
              ajouterToast({
                kind: "reponse",
                ticketId: m.ticket_id, reference: t && t.reference,
                qui: m.sender_name || (t && (t.contact_name || t.contact_email)) || "Client",
                email: (t && t.contact_email) || "",
                hotel: nomHotelToast(t && t.hotel_id),
                sujet: (t && t.subject) || "",
                extrait: m.body || String(m.body_html || "").replace(/<[^>]+>/g, " "),
              });
            })();
          }
        }
      )
      .subscribe((status) => { setRtStatus(status); });

    return () => { sb.removeChannel(canal); };
  }, [isAdmin, page]);

  // ============================================================
  //  RAPPORT DE SUIVI DES TICKETS
  //  - Admin : choisit un hôtel + une période, visualise, exporte, envoie.
  //  - Superviseur : consulte le rapport de son propre hôtel (lecture seule).
  // ============================================================
  const [rapTkHotel, setRapTkHotel] = useState("");      // hôtel sélectionné (admin)
  const [rapTkDu, setRapTkDu] = useState("");             // date début (YYYY-MM-DD)
  const [rapTkAu, setRapTkAu] = useState("");             // date fin (YYYY-MM-DD)
  const [rapTkRows, setRapTkRows] = useState([]);         // lignes calculées
  const [rapTkLang, setRapTkLangState] = useState("fr");  // langue du PDF / email / CSV envoyés au client
  const setRapTkLang = (l) => { setRapTkLangState(l); try { const h = rapTkHotel || myHotelId; if (h) localStorage.setItem("dsi_rapport_lang_" + h, l); } catch (e) {} };
  useEffect(() => { try { const h = rapTkHotel || myHotelId; const l = h && localStorage.getItem("dsi_rapport_lang_" + h); setRapTkLangState(l === "en" ? "en" : "fr"); } catch (e) { setRapTkLangState("fr"); } }, [rapTkHotel, myHotelId]);
  const rapTkEn = rapTkLang === "en";
  const rapTkPeriode = () => rapTkEn
    ? (rapTkDu ? fmtDateFr(rapTkDu) : "start") + " to " + (rapTkAu ? fmtDateFr(rapTkAu) : "today")
    : (rapTkDu ? fmtDateFr(rapTkDu) : "début") + " au " + (rapTkAu ? fmtDateFr(rapTkAu) : "aujourd'hui");
  const [rapTkLoading, setRapTkLoading] = useState(false);
  const [rapTkNote, setRapTkNote] = useState("");
  const [rapTkGenere, setRapTkGenere] = useState(false);  // un rapport a été généré
  const [rapTkEnvoi, setRapTkEnvoi] = useState(false);     // envoi email en cours

  // ---- Rapport Jour (tickets ouverts d'un client, pour les techniciens) ----
  const [rjHotel, setRjHotel] = useState("");   // hôtel sélectionné
  const [rjPick, setRjPick] = useState(false);  // liste des établissements ouverte (sélecteur maison)
  const [rjQ, setRjQ] = useState("");            // filtre de recherche du sélecteur
  const [rjEmail, setRjEmail] = useState("");   // destinataire de l'envoi (technicien)
  const [rjEnvoi, setRjEnvoi] = useState(false); // envoi en cours
  const [rjNote, setRjNote] = useState("");      // message d'état

  // Par défaut : le mois en cours (du 1er à aujourd'hui)
  useEffect(() => {
    if (!rapTkDu && !rapTkAu) {
      const now = new Date();
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      const iso = (d) => d.toISOString().slice(0, 10);
      setRapTkDu(iso(debut));
      setRapTkAu(iso(now));
    }
  }, []);

  // Charge les tickets d'un hôtel sur la période et calcule les métriques.
  //  - hotelId : l'hôtel ciblé (pour le superviseur, c'est le sien, imposé)
  const genererRapportTickets = async (hotelIdForce) => {
    const hid = hotelIdForce || rapTkHotel;
    if (!hid) { setRapTkNote("Veuillez choisir un établissement."); return; }
    setRapTkLoading(true);
    setRapTkNote("");
    setRapTkGenere(false);
    try {
      // Bornes de période : on inclut toute la journée de fin.
      const bDuMs = rapTkDu ? new Date(rapTkDu + "T00:00:00").getTime() : 0;
      const bAuMs = rapTkAu ? new Date(rapTkAu + "T23:59:59").getTime() : Date.now();
      const isoDu = new Date(bDuMs).toISOString(), isoAu = new Date(bAuMs).toISOString();
      // Tickets concernés : créés sur la période, fermés sur la période, ou encore ouverts.
      const charger = async (cols) => {
        let tous = [];
        for (let from = 0; from < 10000; from += 1000) {
          const { data, error } = await sb.from("tickets").select(cols).eq("hotel_id", hid)
            .lte("created_at", isoAu)
            .or('created_at.gte."' + isoDu + '",closed_at.gte."' + isoDu + '",status.neq.closed')
            .order("created_at", { ascending: false }).range(from, from + 999);
          if (error) return { error };
          tous = tous.concat(data || []);
          if (!data || data.length < 1000) break;
        }
        return { data: tous };
      };
      let res = await charger(TICKET_COLS);
      if (res.error) res = await charger(TICKET_COLS_BASE);
      if (res.error) throw res.error;
      // Les alertes automatiques de sauvegarde (CheckCentral / Veeam, catégorie « Sauvegarde ») et les alertes Sophos / Microsoft 365 (Defender) ne figurent pas dans le rapport client
      const tks = (res.data || []).filter(t => !estAlerteAuto(t) && t.category !== "Sauvegarde" && !/\[Sophos\]/i.test(String(t.subject || "")));

      // Messages (1re réponse) : par lots de 100 tickets, pages de 1000 lignes.
      const ids = tks.map(t => t.id);
      const msgsByTicket = {};
      for (let i = 0; i < ids.length; i += 100) {
        const lot = ids.slice(i, i + 100);
        for (let from = 0; from < 20000; from += 1000) {
          const { data: msgs, error: eM } = await sb.from("ticket_messages")
            .select("ticket_id,sender_role,created_at")
            .in("ticket_id", lot)
            .order("created_at", { ascending: true })
            .range(from, from + 999);
          if (eM) throw eM;
          (msgs || []).forEach(m => { (msgsByTicket[m.ticket_id] = msgsByTicket[m.ticket_id] || []).push(m); });
          if (!msgs || msgs.length < 1000) break;
        }
      }

      const rows = calculerRapportTickets(tks, msgsByTicket, bDuMs, bAuMs);
      setRapTkRows(rows);
      setRapTkGenere(true);
      if (rows.length === 0) setRapTkNote("Aucun ticket sur cette période pour cet établissement.");
    } catch (e) {
      setRapTkNote("Erreur : " + (e.message || e));
    } finally {
      setRapTkLoading(false);
    }
  };

  // Indicateurs du tableau de bord (voir statsRapportTickets).
  const rapTkStats = statsRapportTickets(rapTkRows);

  // Formatage lisible d'un délai (ex. "4 h 12 min", "1 j 2 h 05 min").
  const fmtDelai = fmtDelaiHM;
  const fmtDateHeureFr = (d) => { try { return new Date(d).toLocaleString("fr-FR"); } catch (e) { return d || "—"; } };

  // ---- Export CSV (ouvre directement dans Excel) ----
  const exportRapportTicketsCsv = () => {
    const hotel = hotels.find(h => h.id === (rapTkHotel || myHotelId));
    const nomHotel = hotel ? hotel.name : "etablissement";
    const sep = ";"; // Excel FR attend le point-virgule
    const esc = (v) => {
      const s = String(v === null || v === undefined ? "" : v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const en = rapTkEn;
    const L = (fr, eng) => en ? eng : fr;
    const hNum = (h) => h == null ? "" : String(Math.round(h * 100) / 100).replace(".", ",");
    const slaTxt = (e) => e === "ok" ? L("Respecté", "Met") : e === "ko" ? L("Dépassé", "Missed") : "";
    const entete = en
      ? ["Reference", "Subject", "Type", "Priority", "Status", "Opened", "Closed", "Messages", "Third party",
         "1st response", "1st response (business h)", "1st response SLA", "Resolution", "Resolution (business h)", "Resolution SLA"]
      : ["Référence", "Titre", "Type", "Priorité", "Statut", "Ouvert le", "Fermé le", "Nb messages", "Prestataire",
         "Délai 1re réponse", "1re réponse (h ouvrées)", "SLA 1re réponse", "Résolution", "Résolution (h ouvrées)", "SLA résolution"];
    // Durées dans la langue choisie (RT_LANG est lu par fmtDelaiHM / prioLbl)
    const langPrec = RT_LANG; RT_LANG = en ? "en" : "fr";
    let lignes;
    try {
      lignes = rapTkRows.map(r => [
        r.reference, r.subject,
        r.type === "demande" ? L("Demande", "Request") : "Incident",
        prioLbl(r.priority),
        r.status === "closed" ? L("Fermé", "Closed") : (r.prestataire ? L("Prestataire", "Third party") : L("Ouvert", "Open")),
        fmtDateHeureFr(r.created_at),
        r.closed_at ? fmtDateHeureFr(r.closed_at) : "",
        r.nbMessages,
        r.prestataire || "",
        fmtDelaiHM(r.delaiH), hNum(r.delaiH), slaTxt(r.slaRep),
        fmtDelaiHM(r.resolH), hNum(r.resolH), r.prestataire ? L("Hors SLA (prestataire)", "Excluded (third party)") : slaTxt(r.slaRes),
      ]);
    } finally { RT_LANG = langPrec; }
    const contenu = [entete, ...lignes].map(row => row.map(esc).join(sep)).join("\r\n");
    // BOM UTF-8 pour que les accents s'affichent correctement dans Excel
    const blob = new Blob(["\uFEFF" + contenu], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (rapTkEn ? "Ticket_report_" : "Rapport_tickets_") + nomHotel.replace(/[^\w]+/g, "_") + "_" + (rapTkDu || "") + "_" + (rapTkAu || "") + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---- Export PDF (jsPDF) : logo de l'hôtel + mise en page couleur (dessinerRapportTicketsPdf) ----
  const buildRapportTicketsPdf = async () => {
    const hotel = hotels.find(h => h.id === (rapTkHotel || myHotelId));
    const logo = hotel && hotel.logo_url ? await chargerImageBase64(hotel.logo_url) : null;
    const doc = dessinerRapportTicketsPdf(window.jspdf.jsPDF, {
      hotelName: hotel ? hotel.name : "—",
      logo,
      periode: rapTkPeriode(),
      finPeriode: rapTkAu ? fmtDateFr(rapTkAu) : (rapTkEn ? "today" : "aujourd'hui"),
      lang: rapTkLang,
      rows: rapTkRows,
      stats: rapTkStats,
    });
    return { doc, hotel };
  };

  const exportRapportTicketsPdf = async () => {
    const { doc, hotel } = await buildRapportTicketsPdf();
    const nomHotel = hotel ? hotel.name.replace(/[^\w]+/g, "_") : "etablissement";
    doc.save((rapTkEn ? "Ticket_report_" : "Rapport_tickets_") + nomHotel + "_" + (rapTkDu || "") + "_" + (rapTkAu || "") + ".pdf");
  };

  // ---- Envoi du rapport par email (PDF joint) : superviseur, contacts de l'hôtel et adresses externes ----
  const [rtkEnvoiModal, setRtkEnvoiModal] = useState(null); // { choix: [{email, label, coche}], manuel, message }
  const emailValide = (a) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(a || "").trim());
  const contactsHotelRapport = (hotel) => {
    if (!hotel) return [];
    const liste = [
      [hotel.account_email, "Superviseur"], [hotel.gm_email, "Directeur général"], [hotel.rh_email, "RH"],
      [hotel.tech_email, "Technique"], [hotel.standard_email, "Compte standard"],
    ];
    const vus = new Set(), out = [];
    liste.forEach(([e, l]) => { const a = nettoyerEmail(e || "").trim().toLowerCase(); if (a && emailValide(a) && !vus.has(a)) { vus.add(a); out.push({ email: a, label: l }); } });
    return out;
  };
  const ouvrirEnvoiRapport = () => {
    const hotel = hotels.find(h => h.id === rapTkHotel);
    if (!hotel) { setRapTkNote("Veuillez d'abord choisir un établissement et générer le rapport."); return; }
    const contacts = contactsHotelRapport(hotel);
    setRtkEnvoiModal({ choix: contacts.map((c, i) => ({ ...c, coche: i === 0 })), manuel: "", message: "" });
  };
  const destinatairesEnvoi = (m) => {
    const set = new Set((m.choix || []).filter(c => c.coche).map(c => c.email));
    String(m.manuel || "").split(/[\s,;]+/).map(a => nettoyerEmail(a).trim().toLowerCase()).filter(Boolean).forEach(a => set.add(a));
    return Array.from(set);
  };
  const envoyerRapportTicketsEmail = async (destList, messagePerso) => {
    const hotel = hotels.find(h => h.id === rapTkHotel);
    if (!hotel) { setRapTkNote("Veuillez d'abord choisir un établissement et générer le rapport."); return; }
    const destinataires = (destList || []).filter(Boolean);
    const invalides = destinataires.filter(a => !emailValide(a));
    if (!destinataires.length) { setRapTkNote("⚠️ Choisissez au moins un destinataire."); return; }
    if (invalides.length) { setRapTkNote("⚠️ Adresse(s) invalide(s) : " + invalides.join(", ")); return; }
    const dest = destinataires.join(",");
    setRapTkEnvoi(true);
    setRapTkNote("Envoi en cours…");
    try {
      const { doc } = await buildRapportTicketsPdf();
      const pdfB64 = doc.output("datauristring").split(",")[1];
      const periode = rapTkPeriode();
      const en = rapTkEn;
      const subject = (en ? "Support ticket report — " : "Rapport de suivi des tickets — ") + hotel.name + " — " + periode;
      const salut = en ? "Hello,\n\n" : "Bonjour,\n\n";
      const langPrec = RT_LANG; RT_LANG = en ? "en" : "fr";
      const delaiTxt = rapTkStats.delaiMed != null ? fmtDelaiHM(rapTkStats.delaiMed) : null;
      RT_LANG = langPrec;
      const bodyText = en ?
        salut +
        "Please find attached the report on your support tickets for the period " + periode + ".\n\n" +
        "Summary: " + rapTkStats.crees + " ticket(s) created and " + rapTkStats.fermes + " closed during the period, " + rapTkStats.enCoursFin + " still open at " + (rapTkAu ? fmtDateFr(rapTkAu) : "today") + "." +
        (rapTkStats.slaPct != null ? " SLA compliance: " + rapTkStats.slaPct + " %." : "") +
        (delaiTxt ? " Median first response time: " + delaiTxt + " (business hours)." : "") + "\n\n" +
        "Please do not hesitate to contact us with any questions."
        :
        "Bonjour,\n\n" +
        "Veuillez trouver ci-joint le rapport de suivi de vos tickets de support pour la période du " + periode + ".\n\n" +
        "Synthèse : " + rapTkStats.crees + " ticket(s) créé(s) et " + rapTkStats.fermes + " fermé(s) sur la période, " + rapTkStats.enCoursFin + " en cours au " + (rapTkAu ? fmtDateFr(rapTkAu) : "jour") + "." +
        (rapTkStats.slaPct != null ? " Respect des SLA : " + rapTkStats.slaPct + " %." : "") +
        (rapTkStats.delaiMed != null ? " Délai médian de 1re réponse : " + fmtDelai(rapTkStats.delaiMed) + " (heures ouvrées)." : "") + "\n\n" +
        "Nous restons à votre disposition pour toute question.";
      const bodyFinal = (messagePerso && messagePerso.trim()) ? bodyText.replace(salut, salut + messagePerso.trim() + "\n\n") : bodyText;
      const mail = buildSignedEmail(bodyFinal);
      const nomFichier = (en ? "Ticket_report_" : "Rapport_tickets_") + hotel.name.replace(/[^\w]+/g, "_") + ".pdf";
      const res = await fetchEmailApi({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: dest, subject, text: mail.text, html: mail.html, replyTo: SUPPORT_EMAIL,
          fromName: adminFromName(),
          attachments: [{ filename: nomFichier, content: pdfB64 }]
        })
      });
      if (!res.ok) {
        const d = await res.text().catch(() => "");
        setRapTkNote("❌ L'email n'a pas pu partir (" + res.status + (d ? " — " + d.slice(0, 160) : "") + ").");
      } else {
        setRapTkNote("✅ Rapport envoyé à " + destinataires.join(", "));
        setRtkEnvoiModal(null);
      }
    } catch (e) {
      setRapTkNote("❌ Échec de l'envoi (" + (e.message || e) + ").");
    } finally {
      setRapTkEnvoi(false);
    }
  };

  // ============================================================
  //  RAPPORT JOUR — tickets ouverts d'un client, pour les techniciens
  //  PDF listant, par ticket ouvert : objet, contact, date, priorité et
  //  la demande initiale du client. Destiné à être envoyé au technicien
  //  avant son passage sur site.
  // ============================================================
  const rjTicketsOuverts = () => {
    return (tickets || [])
      .filter(t => t.status !== "closed" && t.hotel_id === rjHotel)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const buildRapportJourPdf = () => {
    const hotel = hotels.find(h => h.id === rjHotel);
    const rows = rjTicketsOuverts();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = 210, pageH = 297, mL = 14, mR = 14;
    const contentW = pageW - mL - mR;
    let y = 18;

    doc.setFillColor(15, 15, 36);
    doc.rect(0, 0, pageW, 26, "F");
    doc.setTextColor(201, 168, 76);
    doc.setFont("helvetica", "bold"); doc.setFontSize(17);
    doc.text("DSI HOTEL", mL, 12);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text("Rapport Jour — tickets ouverts", mL, 20);
    doc.setFontSize(7.5);
    doc.text("60 Rue François 1er, 75008 Paris  •  +33 1 84 18 02 23", pageW - mR, 11, { align: "right" });
    doc.text("support@dsihotel.com  •  www.dsihotel.com", pageW - mR, 16, { align: "right" });

    y = 36;
    doc.setTextColor(20, 20, 40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Établissement : " + (hotel ? hotel.name : "—"), mL, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90, 90, 100);
    doc.text("Édité le " + new Date().toLocaleString("fr-FR"), pageW - mR, y, { align: "right" });
    y += 7;
    doc.setFontSize(9.5); doc.setTextColor(60, 60, 70);
    doc.text(rows.length + " ticket(s) ouvert(s) à traiter.", mL, y);
    y += 6;
    doc.setDrawColor(210, 210, 220); doc.line(mL, y, pageW - mR, y);
    y += 6;

    const prioLabel = (p) => p || "—";
    if (rows.length === 0) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(11); doc.setTextColor(120, 120, 130);
      doc.text("Aucun ticket ouvert pour cet établissement.", mL, y + 6);
    }

    rows.forEach((t, i) => {
      const initial = (t.message || "").toString().trim() || "(pas de demande initiale enregistrée)";
      const demandeLines = doc.splitTextToSize(initial, contentW - 6);
      const objet = (t.subject || "(sans objet)").toString();
      const objetLines = doc.splitTextToSize(objet, contentW - 30);
      const blocH = 10 + objetLines.length * 5 + 6 + Math.min(demandeLines.length, 12) * 4.3 + 8;
      if (y + blocH > pageH - 14) { doc.addPage(); y = 18; }

      doc.setFillColor(245, 245, 250);
      doc.roundedRect(mL, y, contentW, blocH - 4, 2, 2, "F");
      const innerX = mL + 4;
      let yy = y + 7;

      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(20, 20, 40);
      doc.text((i + 1) + ". " + objetLines[0], innerX, yy);
      const pc = ({ "Urgent": [229, 62, 62], "Haute": [221, 107, 32], "Moyenne": [49, 130, 206], "Basse": [113, 128, 150] }[t.priority] || [113, 128, 150]);
      doc.setFillColor(pc[0], pc[1], pc[2]);
      const pLbl = prioLabel(t.priority);
      const pW = doc.getTextWidth(pLbl) + 8;
      doc.roundedRect(pageW - mR - pW - 4, yy - 4.5, pW, 6.5, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(pLbl, pageW - mR - pW - 4 + pW / 2, yy - 0.2, { align: "center" });
      doc.setTextColor(20, 20, 40); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
      for (let k = 1; k < objetLines.length; k++) { yy += 5; doc.text(objetLines[k], innerX, yy); }
      yy += 6;

      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(90, 90, 100);
      const contact = (t.contact_name || "—") + (t.contact_email ? "  <" + t.contact_email + ">" : "") + (t.contact_phone ? "  •  " + t.contact_phone : "");
      doc.text(doc.splitTextToSize(contact, contentW - 40)[0], innerX, yy);
      doc.text("Ouvert le " + (t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "—"), pageW - mR - 4, yy, { align: "right" });
      yy += 5.5;

      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(120, 120, 130);
      doc.text("DEMANDE INITIALE", innerX, yy);
      yy += 4.5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(45, 45, 55);
      const maxLines = 14;
      const shown = demandeLines.slice(0, maxLines);
      shown.forEach(line => { doc.text(line, innerX, yy); yy += 4.3; });
      if (demandeLines.length > maxLines) {
        doc.setFont("helvetica", "italic"); doc.setTextColor(140, 140, 150); doc.setFontSize(8);
        doc.text("… (message tronqué — voir le ticket complet dans le portail)", innerX, yy);
        yy += 4.3;
      }

      y += blocH;
    });

    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text("Rapport Jour — DSI Hotel — " + (hotel ? hotel.name : ""), mL, pageH - 6);
      doc.text("Page " + p + " / " + pages, pageW - mR, pageH - 6, { align: "right" });
    }
    return { doc, hotel, rows };
  };

  const exportRapportJourPdf = () => {
    const hotel = hotels.find(h => h.id === rjHotel);
    if (!hotel) { setRjNote("Veuillez d'abord choisir un établissement."); return; }
    const { doc } = buildRapportJourPdf();
    const nom = hotel.name.replace(/[^\w]+/g, "_");
    const jour = new Date().toISOString().slice(0, 10);
    doc.save("Rapport_Jour_" + nom + "_" + jour + ".pdf");
  };

  const envoyerRapportJourEmail = async () => {
    const hotel = hotels.find(h => h.id === rjHotel);
    if (!hotel) { setRjNote("Veuillez d'abord choisir un établissement."); return; }
    const dest = nettoyerEmail((rjEmail || "")).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) { setRjNote("⚠️ Adresse email du technicien invalide."); return; }
    setRjEnvoi(true);
    setRjNote("Envoi en cours…");
    try {
      const { doc, rows } = buildRapportJourPdf();
      const pdfB64 = doc.output("datauristring").split(",")[1];
      const jour = new Date().toLocaleDateString("fr-FR");
      const subject = "Rapport Jour — " + hotel.name + " — " + jour + " (" + rows.length + " ticket(s) ouvert(s))";
      const bodyText =
        "Bonjour,\n\n" +
        "Veuillez trouver ci-joint le rapport des tickets actuellement ouverts pour " + hotel.name + ", à consulter avant votre intervention sur site.\n\n" +
        rows.length + " ticket(s) ouvert(s) à ce jour.\n\n" +
        "Bonne intervention.";
      const mail = buildSignedEmail(bodyText);
      const nomFichier = "Rapport_Jour_" + hotel.name.replace(/[^\w]+/g, "_") + ".pdf";
      const res = await fetchEmailApi({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: dest, subject, text: mail.text, html: mail.html, replyTo: SUPPORT_EMAIL,
          fromName: adminFromName(),
          attachments: [{ filename: nomFichier, content: pdfB64 }]
        })
      });
      if (!res.ok) {
        const d = await res.text().catch(() => "");
        setRjNote("❌ L'email n'a pas pu partir (" + res.status + (d ? " — " + d.slice(0, 160) : "") + ").");
      } else {
        setRjNote("✅ Rapport envoyé à " + dest);
      }
    } catch (e) {
      setRjNote("❌ Échec de l'envoi (" + (e.message || e) + ").");
    } finally {
      setRjEnvoi(false);
    }
  };

  // ============================================================
  //  BACKUPS — intégration CheckCentral (admin uniquement)
  //  Le portail interroge le Worker dédié (relais serveur), qui appelle
  //  l'API CheckCentral (getChecks) et renvoie les statuts normalisés.
  //  Les checks sont regroupés par "groupe" CheckCentral. Un mapping
  //  optionnel (checkcentral_group_map) associe un groupe à un hôtel.
  // ============================================================
  const [bkChecks, setBkChecks] = useState([]);
  const [bkVeeamHist, setBkVeeamHist] = useState({}); // { job_id: "loading" | { erreur } | [runs] } — Veeam direct
  const [bkVeeamRuns, setBkVeeamRuns] = useState({}); // { job_id: [{ id, t, s }] } — 10 dernières exécutions (frise)
  const [bkRapport, setBkRapport] = useState(null);
  const [bkVue, setBkVue] = useState(() => { try { return localStorage.getItem("bkVue") || "tout"; } catch (e) { return "tout"; } }); // tout | checkcentral | veeam | comparaison
  const [bkCmpOpen, setBkCmpOpen] = useState({});
  const [bkFiltreSt, setBkFiltreSt] = useState([]); // rangs de statut affichés (vide = tous) : 3 OK, 1 avertissement, 0 échec, 2 pause/attente
  const choisirBkVue = (v) => { setBkVue(v); try { localStorage.setItem("bkVue", v); } catch (e) {} };   // rapport Veeam ouvert : { titre, chargement, html, texte, erreur, run }
  // ============================================================
  //  SÉCURITÉ SOPHOS — supervision de tous les comptes Sophos Central
  //  (un compte par hôtel). Données alimentées par le Worker dsi-hotel-sophos.
  // ============================================================
  const [soComptes, setSoComptes] = useState([]);
  const [soAlertes, setSoAlertes] = useState([]);
  const [soLoading, setSoLoading] = useState(false);
  const [soErr, setSoErr] = useState("");
  const [soMsg, setSoMsg] = useState("");
  const [soTab, setSoTab] = useState("hotels");
  const [soVoirResolues, setSoVoirResolues] = useState(false);
  const [soHotelFiltre, setSoHotelFiltre] = useState("");
  const [soOpenHotel, setSoOpenHotel] = useState(null);
  const [soPostes, setSoPostes] = useState({});
  const [soModal, setSoModal] = useState(null);
  const [soProtModal, setSoProtModal] = useState(null); // fenêtre « Protection » (antivirus / SOC / bascule)
  const [soBusy, setSoBusy] = useState("");
  const [soNoteEdit, setSoNoteEdit] = useState(null);

  const callSophosApi = async (path, payload) => {
    const { data: sessionData } = await sb.auth.getSession();
    const token = (sessionData.session && sessionData.session.access_token) || "";
    const res = await fetch(SOPHOS_API_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.erreur || ("Erreur " + res.status + " (le Worker dsi-hotel-sophos est-il déployé ?)"));
    return data;
  };

  const loadSophos = async (silencieux) => {
    if (!silencieux) setSoLoading(true);
    setSoErr("");
    try {
      const colsComptes = "id,hotel_id,client_id,tenant_id,actif,dernier_controle,dernier_statut,derniere_erreur,nb_postes,nb_postes_ko,nb_postes_suspects,nb_postes_muets,nb_alertes,nb_alertes_hautes";
      let [c, a] = await Promise.all([
        sb.from("sophos_comptes").select(colsComptes + ",nb_licences,regles,principal,libelle"),
        sb.from("sophos_alertes").select("*").order("raised_at", { ascending: false }).limit(1000),
      ]);
      // Replis si les migrations SQL (licences / compte partagé / suppression) ne sont pas encore passées
      if (c.error) c = await sb.from("sophos_comptes").select(colsComptes + ",nb_licences,regles,principal");
      if (c.error) c = await sb.from("sophos_comptes").select(colsComptes + ",nb_licences");
      if (c.error) c = await sb.from("sophos_comptes").select(colsComptes);
      if (c.error) throw c.error;
      if (a.error) throw a.error;
      setSoComptes(c.data || []);
      setSoAlertes(a.data || []);
      // PC des comptes Sophos partagés qui ne sont rattachés à aucun hôtel
      const parTenant = {};
      (c.data || []).forEach(x => { if (x.tenant_id) parTenant[x.tenant_id] = (parTenant[x.tenant_id] || 0) + 1; });
      const partages = Object.keys(parTenant).filter(t => parTenant[t] > 1);
      if (partages.length) {
        const na = await sb.from("sophos_postes")
          .select("*")
          .is("hotel_id", null).in("tenant_id", partages).order("hostname");
        setSoNonAffectes(na.error ? [] : (na.data || []));
      } else setSoNonAffectes([]);
      // PC marqués « à supprimer de Sophos Central »
      const sup = await sb.from("sophos_postes").select("*").eq("a_supprimer", true).order("hostname");
      setSoASupprimer(sup.error ? [] : (sup.data || []));
    } catch (e) {
      setSoErr("Erreur de chargement : " + (e.message || e) + " — le script SQL Sophos a-t-il été exécuté ?");
    } finally {
      if (!silencieux) setSoLoading(false);
    }
  };

  const loadSoPostes = async (hotelId) => {
    const { data, error } = await sb.from("sophos_postes")
      .select("*")
      .eq("hotel_id", hotelId).order("hostname");
    if (!error) {
      setSoPostes(prev => ({ ...prev, [hotelId]: data || [] }));
      // Postes à problème -> on interroge NinjaOne pour comprendre pourquoi
      const seuil = Date.now() - 7 * 86400000;
      const estPb = p => p.health !== "good" || (p.last_seen_at && new Date(p.last_seen_at).getTime() < seuil);
      const pbNoms = (data || []).filter(estPb).map(p => p.hostname);
      const okNoms = (data || []).filter(p => !estPb(p)).map(p => p.hostname);
      if (pbNoms.length || okNoms.length) soLoadNinja(hotelId, pbNoms, okNoms);
      soLoadNinjaOrg(hotelId);
    }
  };

  // NinjaOne : état des postes problématiques (muets / mauvaise santé), par hôtel
  // ============================================================
  //  CHECK-LIST — contrôle physique des serveurs, UN hôtel à la fois.
  //  Tables : checklist_modele (points types), checklist_serveurs (par hôtel),
  //  checklist_points (copie du modèle pour chaque serveur, remplie par les techniciens).
  // ============================================================
  const [ckHotel, setCkHotel] = useState("");
  const [ckServeurs, setCkServeurs] = useState([]);
  const [ckServeur, setCkServeur] = useState(null);
  const [ckPoints, setCkPoints] = useState([]);
  const [ckLoading, setCkLoading] = useState(false);
  const [ckErr, setCkErr] = useState("");
  const [ckInv, setCkInv] = useState([]);
  const CK_STATUTS = [
    { v: "OK", c: "#2F855A", bg: "#E6F6EA" },
    { v: "KO", c: "#C53030", bg: "#FDE2E2" },
    { v: "En cours", c: "#8A6D1F", bg: "#FFF3C4" },
    { v: "N/A", c: "#718096", bg: "#EEF0F4" },
  ];
  const ckMeta = (v) => CK_STATUTS.find(x => x.v === v) || { v: "", c: "#999", bg: "#FFFBEB" };
  // Synchronisation AUTOMATIQUE avec les points standards (CK_POINTS_STANDARD, déclarés plus bas) :
  //  - check-list pas encore remplie à laquelle il manque un point standard → remplacée par les points standards ;
  //  - check-list déjà commencée → les points standards manquants sont ajoutés, rien n'est retiré.
  // Une check-list qui contient déjà tous les points standards n'est pas touchée : les points ajoutés à la main restent.
  const ckSyncStandard = async (srvs) => {
    const cle = (t) => String(t || "").trim().toLowerCase();
    let modifies = 0;
    for (let i = 0; i < srvs.length; i += 50) {
      const lot = srvs.slice(i, i + 50);
      const { data: pts, error } = await sb.from("checklist_points").select("id,serveur_id,tache,statut,date_controle,technicien,commentaire").in("serveur_id", lot.map(x => x.id));
      if (error) throw error;
      const aSupprimer = [], aAjouter = [];
      lot.forEach(srv => {
        const sp = (pts || []).filter(p => p.serveur_id === srv.id);
        const presents = new Set(sp.map(p => cle(p.tache)));
        const attendus = ckPointsAttendus(srv);
        const manquants = attendus.filter(p => !presents.has(cle(p.tache)));
        if (!manquants.length) return;
        const rempli = sp.some(p => p.statut || p.date_controle || (p.technicien || "").trim() || (p.commentaire || "").trim());
        if (rempli) manquants.forEach(p => aAjouter.push({ serveur_id: srv.id, hotel_id: srv.hotel_id, ...p }));
        else {
          sp.forEach(p => aSupprimer.push(p.id));
          attendus.forEach(p => aAjouter.push({ serveur_id: srv.id, hotel_id: srv.hotel_id, ...p }));
        }
        modifies++;
      });
      if (aSupprimer.length) { const { error: e1 } = await sb.from("checklist_points").delete().in("id", aSupprimer); if (e1) throw e1; }
      if (aAjouter.length) { const { error: e2 } = await sb.from("checklist_points").insert(aAjouter); if (e2) throw e2; }
    }
    return modifies;
  };
  // Chaque VM de l'inventaire serveurs a sa check-list (même nom, mêmes points standards).
  // hotelId = un hôtel, ou null pour tous. Les points standards sont ensuite posés par ckSyncStandard.
  const ckCreerDepuisInventaire = async (hotelId) => {
    let qInv = sb.from("inventaire_serveurs").select("id,hotel_id,nom,type").eq("type", "VM");
    let qCk = sb.from("checklist_serveurs").select("id,hotel_id,nom");
    if (hotelId) { qInv = qInv.eq("hotel_id", hotelId); qCk = qCk.eq("hotel_id", hotelId); }
    const [{ data: vms, error: e1 }, { data: cks, error: e2 }] = await Promise.all([qInv, qCk]);
    if (e1 || e2) return [];
    const cle = (h, n) => h + "|" + String(n || "").trim().toUpperCase();
    const existants = new Set((cks || []).map(c => cle(c.hotel_id, c.nom)));
    const vus = new Set();
    const aCreer = (vms || []).filter(v => {
      const k = cle(v.hotel_id, v.nom);
      if (!String(v.nom || "").trim() || existants.has(k) || vus.has(k)) return false;
      vus.add(k); return true;
    });
    if (!aCreer.length) return [];
    let r = await sb.from("checklist_serveurs").insert(aCreer.map(v => ({ hotel_id: v.hotel_id, nom: String(v.nom).trim(), inventaire_id: v.id }))).select("id,hotel_id,nom");
    if (r.error && /inventaire_id/i.test(r.error.message || "")) // colonne absente : création sans le lien
      r = await sb.from("checklist_serveurs").insert(aCreer.map(v => ({ hotel_id: v.hotel_id, nom: String(v.nom).trim() }))).select("id,hotel_id,nom");
    if (r.error) throw r.error;
    if ((r.data || []).length) await ckSyncStandard(r.data);
    return r.data || [];
  };
  const loadCkServeurs = async (hotelId, garder) => {
    setCkErr(""); setCkLoading(true);
    try {
      try { await ckCreerDepuisInventaire(hotelId); } catch (e) { setCkErr("Création des check-lists des VM : " + (e.message || e)); }
      const { data, error } = await sb.from("checklist_serveurs").select("*").eq("hotel_id", hotelId).order("nom");
      if (error) throw error;
      const liste = data || [];
      try { await ckSyncStandard(liste); } catch (e) { setCkErr("Mise aux points standards : " + (e.message || e)); }
      setCkServeurs(liste);
      // Infos de l'inventaire serveurs (OS, rôle, IP, hôte) pour les serveurs reliés
      try {
        const { data: inv } = await sb.from("inventaire_serveurs").select("*").eq("hotel_id", hotelId);
        setCkInv(inv || []);
      } catch (e) { setCkInv([]); }
      const sel = (garder && liste.find(x => x.id === garder)) || liste[0] || null;
      setCkServeur(sel ? sel.id : null);
      if (sel) await loadCkPoints(sel.id); else setCkPoints([]);
    } catch (e) {
      setCkErr((e.message || String(e)) + (/checklist_/i.test(e.message || "") ? " — le script checklist.sql a-t-il été exécuté ?" : ""));
      setCkServeurs([]); setCkPoints([]);
    } finally { setCkLoading(false); }
  };
  const loadCkPoints = async (serveurId) => {
    const { data, error } = await sb.from("checklist_points").select("*").eq("serveur_id", serveurId).order("ordre");
    if (error) { setCkErr(error.message); return; }
    setCkPoints(data || []);
  };
  // Synthèse : état de la check-list de tous les hôtels (page d'accueil de l'onglet)
  const [ckSynth, setCkSynth] = useState({ loading: false, points: [], serveurs: [] });
  const [ckFiltre, setCkFiltre] = useState("tous");
  const loadCkSynthese = async () => {
    setCkSynth(prev => ({ ...prev, loading: true }));
    setCkErr("");
    try {
      try { await ckCreerDepuisInventaire(null); } catch (e) { setCkErr("Création des check-lists des VM : " + (e.message || e)); }
      try {
        const { data: tous } = await sb.from("checklist_serveurs").select("id,hotel_id");
        if (tous && tous.length) await ckSyncStandard(tous);
      } catch (e) { setCkErr("Mise aux points standards : " + (e.message || e)); }
      const points = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from("checklist_points").select("hotel_id,serveur_id,statut,date_controle,technicien").range(from, from + 999);
        if (error) throw error;
        (data || []).forEach(x => points.push(x));
        if (!data || data.length < 1000) break;
      }
      const { data: serveurs, error: e2 } = await sb.from("checklist_serveurs").select("id,hotel_id,nom");
      if (e2) throw e2;
      setCkSynth({ loading: false, points, serveurs: serveurs || [] });
    } catch (e) {
      setCkErr((e.message || String(e)) + (/checklist_/i.test(e.message || "") ? " — le script checklist.sql a-t-il été exécuté ?" : ""));
      setCkSynth({ loading: false, points: [], serveurs: [] });
    }
  };

  const [ckStdBusy, setCkStdBusy] = useState(false);
  // Remplace par les points standards la check-list de chaque serveur « non remplie » :
  // aucun point, ou aucun point avec statut, date, technicien ou commentaire. Rien de saisi n'est perdu.
  const ckAppliquerStandardPartout = async () => {
    if (!confirm("Appliquer les " + CK_POINTS_STANDARD.length + " points de contrôle standards à toutes les check-lists qui ne sont pas encore remplies ?\n\nSeuls les serveurs où AUCUN point n'a de statut, de date, de technicien ou de commentaire sont concernés : leurs points actuels sont remplacés par la liste standard. Les check-lists déjà commencées ne sont pas touchées.")) return;
    setCkStdBusy(true); setCkErr("");
    try {
      const pts = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from("checklist_points").select("serveur_id,statut,date_controle,technicien,commentaire").range(from, from + 999);
        if (error) throw error;
        (data || []).forEach(x => pts.push(x));
        if (!data || data.length < 1000) break;
      }
      const { data: srvs, error: e2 } = await sb.from("checklist_serveurs").select("id,hotel_id");
      if (e2) throw e2;
      const rempli = new Set(pts.filter(p => p.statut || p.date_controle || (p.technicien || "").trim() || (p.commentaire || "").trim()).map(p => p.serveur_id));
      const cibles = (srvs || []).filter(x => !rempli.has(x.id));
      for (let i = 0; i < cibles.length; i += 50) {
        const lot = cibles.slice(i, i + 50);
        const { error: eDel } = await sb.from("checklist_points").delete().in("serveur_id", lot.map(x => x.id));
        if (eDel) throw eDel;
        const lignes = [];
        lot.forEach(x => CK_POINTS_STANDARD.forEach(p => lignes.push({ serveur_id: x.id, hotel_id: x.hotel_id, ...p })));
        const { error: eIns } = await sb.from("checklist_points").insert(lignes);
        if (eIns) throw eIns;
      }
      alert("✅ " + cibles.length + " check-list(s) mises à jour avec les points standards." + (rempli.size ? "\n" + rempli.size + " check-list(s) déjà commencée(s) laissée(s) telle(s) quelle(s)." : ""));
      if (ckHotel) loadCkServeurs(ckHotel, ckServeur); else loadCkSynthese();
    } catch (e) { setCkErr("Application des points standards : " + (e.message || e)); }
    finally { setCkStdBusy(false); }
  };
  // Serveurs AD / contrôleurs de domaine (nom « AD », « DC », « CP-SRV-DC », « DC01 »…)
  const ckEstAD = (nom) => /(^|[^A-Z0-9])(AD|DC)([^A-Z]|$)/i.test(String(nom || ""));
  // Ne garde QUE les 8 points standards sur les serveurs donnés : retire les autres points
  // tant qu'ils ne sont pas remplis (un point déjà renseigné est conservé), ajoute les standards manquants.
  const ckStandardiserServeurs = async (srvs) => {
    const cle = (t) => String(t || "").trim().toLowerCase();
    const std = new Set(CK_POINTS_STANDARD.map(p => cle(p.tache)));
    let retires = 0, ajoutes = 0, gardes = 0;
    for (const srv of srvs) {
      const { data: pts, error } = await sb.from("checklist_points").select("id,tache,ordre,statut,date_controle,technicien,commentaire").eq("serveur_id", srv.id);
      if (error) throw error;
      const rempli = (p) => p.statut || p.date_controle || (p.technicien || "").trim() || (p.commentaire || "").trim();
      const aRetirer = (pts || []).filter(p => !std.has(cle(p.tache)) && !rempli(p));
      gardes += (pts || []).filter(p => !std.has(cle(p.tache)) && rempli(p)).length;
      if (aRetirer.length) {
        const { error: eDel } = await sb.from("checklist_points").delete().in("id", aRetirer.map(p => p.id));
        if (eDel) throw eDel;
        retires += aRetirer.length;
      }
      const presents = new Set((pts || []).map(p => cle(p.tache)));
      const manquants = CK_POINTS_STANDARD.filter(p => !presents.has(cle(p.tache)));
      if (manquants.length) {
        const { error: eIns } = await sb.from("checklist_points").insert(manquants.map(p => ({ serveur_id: srv.id, hotel_id: srv.hotel_id, ordre: p.ordre, categorie: p.categorie, tache: p.tache })));
        if (eIns) throw eIns;
        ajoutes += manquants.length;
      }
    }
    return { retires, ajoutes, gardes };
  };
  const ckStandardiserAD = async (unSeul) => {
    try {
      let srvs;
      if (unSeul) srvs = [unSeul];
      else {
        const { data, error } = await sb.from("checklist_serveurs").select("id,hotel_id,nom");
        if (error) throw error;
        srvs = (data || []).filter(x => ckEstAD(x.nom));
      }
      if (!srvs.length) { alert("Aucun serveur AD trouvé (nom contenant « AD » ou « DC »)."); return; }
      if (!confirm((unSeul ? "Serveur « " + unSeul.nom + " »" : srvs.length + " serveur(s) AD : " + srvs.map(x => x.nom).slice(0, 15).join(", ") + (srvs.length > 15 ? "…" : "")) +
        "\n\nNe garder que les " + CK_POINTS_STANDARD.length + " points standards ?\nLes autres points non remplis sont retirés ; un point déjà renseigné (statut, date, technicien ou commentaire) est conservé.")) return;
      setCkStdBusy(true); setCkErr("");
      const r = await ckStandardiserServeurs(srvs);
      alert("✅ " + srvs.length + " serveur(s) traité(s) : " + r.retires + " point(s) retiré(s), " + r.ajoutes + " point(s) standard(s) ajouté(s)." + (r.gardes ? "\n" + r.gardes + " point(s) déjà renseigné(s) conservé(s)." : ""));
      if (ckHotel) await loadCkServeurs(ckHotel, ckServeur); else loadCkSynthese();
    } catch (e) { setCkErr("Points standards AD : " + (e.message || e)); }
    finally { setCkStdBusy(false); }
  };
  const ckChoisirHotel = (hid) => { setCkHotel(hid); setCkServeur(null); setCkPoints([]); setCkServeurs([]); if (hid) loadCkServeurs(hid); };
  const ckAjouterServeur = async () => {
    if (!ckHotel) return;
    const nom = (window.prompt("Nom du serveur à contrôler (ex. DC, ESXi-01, OPERA) :\n\nLa check-list sera créée avec les " + CK_POINTS_STANDARD.length + " points de contrôle standards ; vous pourrez en ajouter ou en retirer ensuite.", "") || "").trim();
    if (!nom) return;
    try {
      const { data: srv, error } = await sb.from("checklist_serveurs").insert({ hotel_id: ckHotel, nom }).select().single();
      if (error) throw error;
      const { error: eStd } = await sb.from("checklist_points").insert(ckPointsAttendus(srv).map(p => ({ serveur_id: srv.id, hotel_id: ckHotel, ...p })));
      if (eStd) alert("Serveur créé, mais les points standards n'ont pas pu être ajoutés : " + eStd.message);
      await loadCkServeurs(ckHotel, srv.id);
    } catch (e) { alert("Erreur : " + (e.message || e)); }
  };
  // Points de contrôle libres : ajout, suppression, vidage
  const [ckNouveau, setCkNouveau] = useState({ categorie: "", tache: "" });
  const ckAjouterPoint = async () => {
    const tache = (ckNouveau.tache || "").trim();
    const categorie = (ckNouveau.categorie || "").trim() || "Général";
    if (!ckServeur || !tache) return;
    const ordre = (ckPoints.length ? Math.max(...ckPoints.map(p => p.ordre || 0)) : 0) + 1;
    const { data, error } = await sb.from("checklist_points").insert({ serveur_id: ckServeur, hotel_id: ckHotel, ordre, categorie, tache }).select().single();
    if (error) { alert("Erreur : " + error.message); return; }
    setCkPoints(prev => [...prev, data]);
    setCkNouveau({ categorie, tache: "" });
  };
  const ckSupprimerPoint = async (pt) => {
    if (!confirm("Supprimer le point « " + pt.tache + " » ?")) return;
    const { error } = await sb.from("checklist_points").delete().eq("id", pt.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setCkPoints(prev => prev.filter(x => x.id !== pt.id));
  };
  // Copie les intitulés (catégorie + tâche) d'un autre serveur ou du modèle VEEAM, statuts vides
  const ckCopierPoints = async (source) => {
    if (!ckServeur || !source) return;
    try {
      let pts = [];
      if (source === "__standard") {
        pts = CK_POINTS_STANDARD;
      } else if (String(source).startsWith("__modele:")) {
        const type = source.split(":")[1];
        let r = await sb.from("checklist_modele").select("ordre,categorie,tache").eq("type_serveur", type).order("ordre");
        if (r.error && type === "VEEAM") r = await sb.from("checklist_modele").select("ordre,categorie,tache").order("ordre"); // avant le script des modèles par type
        if (r.error) throw r.error; pts = r.data || [];
      } else {
        const { data, error } = await sb.from("checklist_points").select("ordre,categorie,tache").eq("serveur_id", source).order("ordre");
        if (error) throw error; pts = data || [];
      }
      if (!pts.length) { alert("Aucun point à copier."); return; }
      const existants = new Set(ckPoints.map(p => (p.categorie || "") + "|" + p.tache));
      const nouveaux = pts.filter(p => !existants.has((p.categorie || "") + "|" + p.tache));
      if (!nouveaux.length) { alert("Ces points sont déjà présents sur ce serveur."); return; }
      let ordre = ckPoints.length ? Math.max(...ckPoints.map(p => p.ordre || 0)) : 0;
      const { error } = await sb.from("checklist_points").insert(nouveaux.map(p => ({ serveur_id: ckServeur, hotel_id: ckHotel, ordre: ++ordre, categorie: p.categorie, tache: p.tache })));
      if (error) throw error;
      await loadCkPoints(ckServeur);
    } catch (e) { alert("Erreur : " + (e.message || e)); }
  };
  const ckViderServeur = async (srv) => {
    if (!srv || !confirm("Supprimer TOUS les points de contrôle du serveur « " + srv.nom + " » ?\n\nLe serveur reste dans la liste, avec une check-list vide.")) return;
    const { error } = await sb.from("checklist_points").delete().eq("serveur_id", srv.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setCkPoints([]);
  };
  const ckSupprimerServeur = async (srv) => {
    if (!srv || !confirm("Supprimer la check-list du serveur « " + srv.nom + " » et tous ses contrôles ?")) return;
    const { error } = await sb.from("checklist_serveurs").delete().eq("id", srv.id);
    if (error) { alert("Erreur : " + error.message); return; }
    loadCkServeurs(ckHotel);
  };
  // Mise à jour d'un point : affichage immédiat puis enregistrement.
  // Statut changé -> date du jour et technicien connecté pré-remplis s'ils sont vides.
  const ckMaj = async (pt, champs) => {
    const maj = { ...champs };
    if ("statut" in champs) {
      if (!pt.date_controle) maj.date_controle = new Date().toISOString().slice(0, 10);
      if (!pt.technicien) maj.technicien = adminFromName().split(" ")[0];
    }
    maj.maj_le = new Date().toISOString();
    maj.maj_par = adminFromName();
    setCkPoints(prev => prev.map(x => x.id === pt.id ? { ...x, ...maj } : x));
    const { error } = await sb.from("checklist_points").update(maj).eq("id", pt.id);
    if (error) { alert("Enregistrement impossible : " + error.message); loadCkPoints(pt.serveur_id); }
  };
  useEffect(() => { if (page === "checklist" && isAdmin && ckHotel && !ckServeurs.length) loadCkServeurs(ckHotel); }, [page]);
  useEffect(() => { if (page === "checklist" && isAdmin && !ckHotel) loadCkSynthese(); }, [page, ckHotel]);
  // ============================================================
  //  INVENTAIRE SERVEURS — versions, mises à jour, Care Pack, antivirus.
  //  Tables : inventaire_serveurs (hôtes physiques + VM via parent_id),
  //  inventaire_notes (notes / actions par hôtel). Un hôtel à la fois.
  // ============================================================
  const [invHotel, setInvHotel] = useState("");
  const [invRows, setInvRows] = useState([]);
  const [invNotes, setInvNotes] = useState(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invErr, setInvErr] = useState("");
  const [invSynth, setInvSynth] = useState({ loading: false, rows: [], notes: [] });
  const [invFiltre, setInvFiltre] = useState("tous");
  const invErrMsg = (e) => (e.message || String(e)) + (/inventaire_/i.test(e.message || "") ? " — le script inventaire_serveurs.sql a-t-il été exécuté ?" : "");
  const loadInv = async (hotelId) => {
    setInvErr(""); setInvLoading(true);
    try {
      const [r, n] = await Promise.all([
        sb.from("inventaire_serveurs").select("*").eq("hotel_id", hotelId).order("ordre"),
        sb.from("inventaire_notes").select("*").eq("hotel_id", hotelId),
      ]);
      if (r.error) throw r.error;
      setInvRows(r.data || []);
      setInvNotes((n.data && n.data[0]) || { hotel_id: hotelId, notes: "" });
    } catch (e) { setInvErr(invErrMsg(e)); setInvRows([]); }
    finally { setInvLoading(false); }
  };
  const loadInvSynthese = async () => {
    setInvSynth(prev => ({ ...prev, loading: true })); setInvErr("");
    try {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from("inventaire_serveurs").select("hotel_id,type,os,a_jour,care_pack,care_pack_fin,antivirus,date_controle,technicien,nom,derniere_maj,commentaire").range(from, from + 999);
        if (error) throw error;
        (data || []).forEach(x => rows.push(x));
        if (!data || data.length < 1000) break;
      }
      const { data: notes } = await sb.from("inventaire_notes").select("hotel_id,notes");
      setInvSynth({ loading: false, rows, notes: notes || [] });
    } catch (e) { setInvErr(invErrMsg(e)); setInvSynth({ loading: false, rows: [], notes: [] }); }
  };
  const invChoisirHotel = (hid) => { setInvHotel(hid); setInvRows([]); setInvNotes(null); setInvNinja(null); setInvDetail(false); setInvOuvert(""); if (hid) loadInv(hid); };
  // ---- Remplissage depuis NinjaOne (Worker dsi-hotel-inventaire, route /importer) ----
  // { busy, progression, resultats: [{ hotel, ok, erreur, mis_a_jour, ajoutes, ecarts, absents_de_ninjaone }] }
  const [invNinja, setInvNinja] = useState(null);
  const [invNinjaFiltre, setInvNinjaFiltre] = useState("");  // compte-rendu : filtre par indicateur
  const [invNinjaOuvert, setInvNinjaOuvert] = useState(""); // compte-rendu : établissement déplié
  // Présentation « file d'actions » : vue de la synthèse, détail éditable de la fiche, groupe déplié
  const [invVue, setInvVue] = useState("actions");
  const [invDetail, setInvDetail] = useState(false);
  const [invOuvert, setInvOuvert] = useState("");
  const invImporterNinja = async (hotelId) => {
    const cibles = hotelId ? hotels.filter(h => h.id === hotelId) : [...hotels].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!cibles.length) return;
    if (!hotelId && !window.confirm("Remplir l'inventaire des " + cibles.length + " établissements depuis NinjaOne ?\n\nMise à jour : OS, version, IP, n° de série (si vide), « À jour ? », dernière MAJ, antivirus. Les machines absentes sont ajoutées.\nJamais modifiés : nom, rôle, Care Pack, licence Veeam, notes, date de contrôle. Rien n'est supprimé.")) return;
    const { data: sessionData } = await sb.auth.getSession();
    const token = (sessionData.session && sessionData.session.access_token) || "";
    const resultats = [];
    setInvErr("");
    for (let i = 0; i < cibles.length; i++) {
      const h = cibles[i];
      setInvNinja({ busy: true, progression: (i + 1) + " / " + cibles.length + " — " + h.name, resultats: [...resultats] });
      try {
        const res = await fetch(INVENTAIRE_API_URL + "/importer", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ hotelId: h.id }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(d.error || ("Erreur " + res.status + " (le Worker dsi-hotel-inventaire est-il déployé ?)")), { introuvable: res.status === 404 });
        resultats.push({ hotel: h.name, hotelId: h.id, ok: true, mis_a_jour: d.mis_a_jour || [], ajoutes: d.ajoutes || [], ecarts: d.ecarts || [], absents: d.absents_de_ninjaone || [], erreurs: d.erreurs || [], doublons: d.doublons_possibles || [], rapprochements: d.rapprochements || [] });
      } catch (e) {
        resultats.push({ hotel: h.name, ok: false, introuvable: !!e.introuvable, erreur: e.message || String(e) });
        if (/401|403|Session|déployé/i.test(e.message || "")) break; // inutile de continuer
      }
    }
    setInvNinja({ busy: false, resultats, fin: new Date() });
    setInvNinjaFiltre(""); setInvNinjaOuvert(hotelId ? (cibles[0] && cibles[0].name) || "" : "");
    if (hotelId) loadInv(hotelId); else loadInvSynthese();
  };
  // Care Pack : jours restants + statut (même calcul que le fichier Excel)
  const invCarePack = (r) => {
    if (r.care_pack === "Non") return { j: null, l: "Aucun", c: "#718096", bg: "#EEF0F4" };
    if (r.care_pack === "N/A") return { j: null, l: "N/A", c: "#A0AEC0", bg: "#F6F6FA" };
    if (!r.care_pack_fin) return { j: null, l: r.care_pack === "Oui" ? "Date ?" : "", c: "#B7791F", bg: "#FFFBEB" };
    const j = Math.round((new Date(r.care_pack_fin + "T12:00:00") - new Date(new Date().toISOString().slice(0, 10) + "T12:00:00")) / 86400000);
    if (j < 0) return { j, l: "Expiré", c: "#C53030", bg: "#FDE2E2" };
    if (j < 90) return { j, l: "Moins de 90 j", c: "#C05621", bg: "#FFF3E8" };
    return { j, l: "OK", c: "#2F855A", bg: "#E6F6EA" };
  };
  const invEstWindows = (r) => /windows|win\s?1|win\s?serv/i.test(r.os || "");
  const invMaj = async (row, champs) => {
    const maj = { ...champs, maj_le: new Date().toISOString(), maj_par: adminFromName() };
    if (!row.date_controle && !("date_controle" in champs)) maj.date_controle = new Date().toISOString().slice(0, 10);
    if (!row.technicien && !("technicien" in champs)) maj.technicien = adminFromName().split(" ")[0];
    setInvRows(prev => prev.map(x => x.id === row.id ? { ...x, ...maj } : x));
    const { error } = await sb.from("inventaire_serveurs").update(maj).eq("id", row.id);
    if (error) { alert("Enregistrement impossible : " + error.message); loadInv(row.hotel_id); return; }
    // Une ligne qui devient VM (ou une VM renommée) reçoit sa check-list
    if ((champs.type === "VM") || ("nom" in champs && (champs.type || row.type) === "VM")) { try { await ckCreerDepuisInventaire(row.hotel_id); } catch (e) {} }
  };
  const invAjouter = async (parent) => {
    if (!invHotel) return;
    const nom = (window.prompt(parent ? "Nom de la VM sur " + parent.nom + " (ex. DC, OPERA, VEEAM) :" : "Nom ou adresse IP de l'hôte physique (ex. 10.53.160.5, ESXi-01, NAS) :", "") || "").trim();
    if (!nom) return;
    let ordre;
    if (parent) {
      const enfants = invRows.filter(x => x.parent_id === parent.id).map(x => x.ordre || 0);
      ordre = (enfants.length ? Math.max(...enfants) : (parent.ordre || 0)) + 1;
    } else {
      const tops = invRows.filter(x => !x.parent_id).map(x => x.ordre || 0);
      ordre = (tops.length ? Math.max(...tops) : 0) + 10;
    }
    const ligne = parent
      ? { hotel_id: invHotel, parent_id: parent.id, ordre, nom, type: "VM" }
      : { hotel_id: invHotel, ordre, nom, type: "Physique", role: "Hôte VMware", os: "VMware ESXi" };
    const { error } = await sb.from("inventaire_serveurs").insert(ligne);
    if (error) { alert("Erreur : " + invErrMsg(error)); return; }
    if (parent) { try { await ckCreerDepuisInventaire(invHotel); } catch (e) { alert("VM ajoutée, mais sa check-list n'a pas pu être créée : " + (e.message || e)); } }
    loadInv(invHotel);
  };
  const invSupprimer = async (row) => {
    const enfants = invRows.filter(x => x.parent_id === row.id);
    if (!confirm("Supprimer « " + row.nom + " » de l'inventaire ?" + (enfants.length ? "\n\nSes " + enfants.length + " VM resteront dans la liste, sans hôte." : ""))) return;
    const { error } = await sb.from("inventaire_serveurs").delete().eq("id", row.id);
    if (error) { alert("Erreur : " + error.message); return; }
    loadInv(invHotel);
  };
  const invEnregNotes = async (texte) => {
    if (!invHotel || (invNotes && (invNotes.notes || "") === texte)) return;
    const ligne = { hotel_id: invHotel, notes: texte, maj_le: new Date().toISOString(), maj_par: adminFromName() };
    setInvNotes(ligne);
    const { error } = await sb.from("inventaire_notes").upsert(ligne, { onConflict: "hotel_id" });
    if (error) alert("Notes non enregistrées : " + error.message);
  };
  useEffect(() => { if (page === "inventaire" && isAdmin && !invHotel) loadInvSynthese(); }, [page, invHotel]);
  // ----- Pré-remplissage de l'inventaire depuis les fiches « Infrastructure » -----
  // Lit les tableaux des fiches (hôtes ESXi, serveurs / VM), propose les lignes
  // trouvées (aperçu à valider) puis crée uniquement celles cochées.
  // Les colonnes de comptes / mots de passe ne sont JAMAIS reprises.
  const [invImport, setInvImport] = useState(null); // { loading, err, items, busy, fait }
  const invParseInfra = (html, hotelId, titre) => {
    const out = [];
    let doc;
    try { doc = new DOMParser().parseFromString(String(html || ""), "text/html"); } catch (e) { return out; }
    const txt = (el) => String((el && el.textContent) || "").replace(/\s+/g, " ").trim();
    const RE_SRV = /esxi|serveur|server|\bvm\b|virtuel|h[oô]te|hyperviseur|\bnas\b|vmware|hyper-v|proxmox/i;
    const RE_PHYS = /esxi|physique|hyperviseur|h[oô]tes?\b|\bnas\b|hyper-v|proxmox/i;
    const RE_VM = /\bvms?\b|virtuel/i;
    const RE_IP = /\b(\d{1,3}\.){3}\d{1,3}\b/;
    let titreCourant = "";
    doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,strong,b,table").forEach((el, ti) => {
      const tag = el.tagName.toLowerCase();
      if (tag !== "table") {
        if (el.closest("table")) return;
        const t = txt(el);
        if (t && t.length <= 90 && (/^h\d$/.test(tag) || el.querySelector("strong,b") || tag === "strong" || tag === "b")) titreCourant = t;
        return;
      }
      const rows = Array.from(el.rows || []);
      if (rows.length < 2) return;
      const entetes = Array.from(rows[0].cells).map(txt);
      const idx = (re, sauf) => entetes.findIndex((h, i) => re.test(h) && !(sauf || []).includes(i));
      const iNom = idx(/^(nom|h[oô]te|serveur|machine|vm|hostname|[ée]quipement|appareil)/i);
      const iRole = idx(/r[oô]le|fonction|usage|description|application/i, [iNom]);
      const iIp = idx(/\bip\b|adresse/i, [iNom, iRole]);
      const iParent = idx(/esxi|h[oô]te|hyperviseur|host/i, [iNom, iRole, iIp]);
      const iOs = idx(/\bos\b|syst[eè]me|windows/i, [iNom, iRole, iIp, iParent]);
      const iVer = idx(/version|build/i, [iNom, iRole, iIp, iParent, iOs]);
      if (iNom < 0 && iRole < 0) return;
      const contexte = titreCourant + " " + entetes.join(" ");
      const douteux = !RE_SRV.test(contexte);
      if (douteux && iIp < 0) return;
      const physique = RE_PHYS.test(titreCourant) && !RE_VM.test(titreCourant) && iParent < 0;
      rows.slice(1).forEach((tr, ri) => {
        const c = Array.from(tr.cells).map(txt);
        const val = (i) => (i >= 0 && c[i]) ? c[i] : "";
        let nom = val(iNom), role = val(iRole);
        if (!nom && role) {
          // « AD & FS (PARALDC01) » ou « Veeam / Backup (PARALMBK, paralmbk01) » -> nom = 1er nom de machine
          const m = role.match(/\(([^()]{2,80})\)\s*$/);
          const premier = m ? m[1].split(/[,;\/]/)[0].trim() : "";
          if (premier && /^[A-Za-z0-9_.-]{2,40}$/.test(premier)) { nom = premier; role = role.replace(m[0], "").trim(); }
          else { nom = role; role = ""; }
        }
        if (!nom) return;
        let ipBrut = val(iIp);
        let ip = "", parentDansIp = "";
        const mIp = ipBrut.match(RE_IP);
        // « sur ESXi 10.164.210.10 » : c'est l'IP de l'hôte, pas celle de la VM
        if (mIp && /\bsur\b|esxi|h[oô]te/i.test(ipBrut)) parentDansIp = mIp[0]; else ip = mIp ? mIp[0] : "";
        if (!ip) { const m2 = nom.match(RE_IP); if (m2) ip = m2[0]; }
        out.push({
          key: hotelId + ":" + ti + ":" + ri, hotel_id: hotelId, source: titre, section: titreCourant,
          sel: !douteux, douteux, type: physique ? "Physique" : "VM", nom: nom.slice(0, 80), role: role.slice(0, 80) || (physique ? "Hôte VMware" : ""),
          ip, os: val(iOs) || (physique && /esxi|vmware/i.test(contexte) ? "VMware ESXi" : ""), version: val(iVer), parentRef: val(iParent) || parentDansIp,
        });
      });
    });
    // Un seul hôte dans la fiche et des VM sans colonne « ESXi » : on les rattache à cet hôte
    const hotes = out.filter(x => x.type === "Physique");
    if (hotes.length === 1) out.forEach(x => { if (x.type === "VM" && !x.parentRef) x.parentRef = hotes[0].ip || hotes[0].nom; });
    return out;
  };
  const invOuvrirImport = async (hotelId) => {
    setInvImport({ loading: true, err: "", items: [], hotelId: hotelId || null });
    try {
      let q = sb.from("hotel_docs").select("hotel_id,titre,categorie,description").eq("categorie", "Infrastructure");
      if (hotelId) q = q.eq("hotel_id", hotelId);
      const { data: docs, error } = await q;
      if (error) throw error;
      let q2 = sb.from("inventaire_serveurs").select("hotel_id,nom,ip");
      if (hotelId) q2 = q2.eq("hotel_id", hotelId);
      let ex = await q2;
      if (ex.error) ex = await (hotelId ? sb.from("inventaire_serveurs").select("hotel_id,nom").eq("hotel_id", hotelId) : sb.from("inventaire_serveurs").select("hotel_id,nom"));
      if (ex.error) throw ex.error;
      const existants = ex.data || [];
      const items = [];
      (docs || []).forEach(d => invParseInfra(d.description, d.hotel_id, d.titre).forEach(x => {
        const deja = existants.some(e => e.hotel_id === x.hotel_id && ((x.ip && e.ip === x.ip) || String(e.nom || "").toLowerCase() === x.nom.toLowerCase() || (x.ip && String(e.nom || "") === x.ip)));
        items.push({ ...x, deja, sel: !deja && !x.douteux });
      }));
      const fiches = (docs || []).map(d => ({ hotel_id: d.hotel_id, titre: d.titre || "(sans titre)", tableaux: (String(d.description || "").match(/<table/gi) || []).length }));
      setInvImport({ loading: false, err: "", items, hotelId: hotelId || null, nbDocs: fiches.length, fiches });
    } catch (e) { setInvImport({ loading: false, err: invErrMsg(e), items: [], hotelId: hotelId || null }); }
  };
  const invLancerImport = async () => {
    const choisis = (invImport.items || []).filter(x => x.sel && x.nom.trim());
    if (!choisis.length) return;
    setInvImport(prev => ({ ...prev, busy: true, err: "" }));
    let crees = 0; const erreurs = [];
    const parHotel = {};
    choisis.forEach(x => { (parHotel[x.hotel_id] = parHotel[x.hotel_id] || []).push(x); });
    for (const hid of Object.keys(parHotel)) {
      try {
        const lot = parHotel[hid];
        const { data: ex } = await sb.from("inventaire_serveurs").select("id,nom,ip,ordre,parent_id,type").eq("hotel_id", hid);
        const existants = ex || [];
        let ordre = existants.filter(e => !e.parent_id).reduce((m, e) => Math.max(m, e.ordre || 0), 0);
        const champs = (x) => ({ hotel_id: hid, nom: x.nom.trim(), type: x.type, role: x.role || null, ip: x.ip || null, os: x.os || null, version: x.version || null,
          commentaire: "Repris de la fiche Infrastructure « " + x.source + " »", maj_le: new Date().toISOString(), maj_par: adminFromName() });
        // 1) hôtes physiques
        const hotes = lot.filter(x => x.type === "Physique");
        const refs = {}; // ip / nom -> id d'hôte
        existants.filter(e => e.type === "Physique").forEach(e => { if (e.ip) refs[e.ip] = e.id; refs[String(e.nom).toLowerCase()] = e.id; });
        if (hotes.length) {
          const lignes = hotes.map(x => { ordre += 10; return { ...champs(x), ordre }; });
          const { data, error } = await sb.from("inventaire_serveurs").insert(lignes).select("id,nom,ip");
          if (error) throw error;
          (data || []).forEach((d, i) => { if (d.ip) refs[d.ip] = d.id; refs[String(d.nom).toLowerCase()] = d.id; refs[String(hotes[i].nom).toLowerCase()] = d.id; });
          crees += (data || []).length;
        }
        // 2) VM, rattachées à leur hôte quand on le reconnaît
        const vms = lot.filter(x => x.type !== "Physique");
        if (vms.length) {
          const trouverHote = (ref) => {
            const r = String(ref || "").trim(); if (!r) return null;
            const mIp = r.match(/\b(\d{1,3}\.){3}\d{1,3}\b/);
            return (mIp && refs[mIp[0]]) || refs[r.toLowerCase()] || null;
          };
          const lignes = vms.map(x => { const p = trouverHote(x.parentRef); ordre += 1; return { ...champs(x), parent_id: p, ordre }; });
          const { data, error } = await sb.from("inventaire_serveurs").insert(lignes).select("id");
          if (error) throw error;
          crees += (data || []).length;
        }
      } catch (e) { erreurs.push((hotels.find(h => h.id === hid) || {}).name + " : " + invErrMsg(e)); }
    }
    for (const hid of Object.keys(parHotel)) { try { await ckCreerDepuisInventaire(hid); } catch (e) {} }
    setInvImport(prev => ({ ...prev, busy: false, fait: crees, err: erreurs.join(" | ") }));
    if (invHotel) loadInv(invHotel); else loadInvSynthese();
  };
  const [soNinja, setSoNinja] = useState({});
  // Inventaire NinjaOne complet de l'organisation de chaque hôtel (pour « Sophos manquant »)
  const [soNinjaOrg, setSoNinjaOrg] = useState({});
  const soLoadNinjaOrg = async (hotelId) => {
    setSoNinjaOrg(prev => ({ ...prev, [hotelId]: { ...(prev[hotelId] || {}), loading: true, err: "" } }));
    try {
      const r = await callSophosApi("/ninja-org", { hotelId });
      setSoNinjaOrg(prev => ({ ...prev, [hotelId]: { loading: false, err: "", ...r } }));
    } catch (e) {
      setSoNinjaOrg(prev => ({ ...prev, [hotelId]: { loading: false, err: e.message || String(e) } }));
    }
  };
  // Compte Sophos partagé : PC non affectés, suggestions NinjaOne, affichage des ignorés
  const [soNonAffectes, setSoNonAffectes] = useState([]);
  const [soSuggest, setSoSuggest] = useState({ loading: false, err: "", parPoste: {} });
  const [soVoirIgnores, setSoVoirIgnores] = useState(false);
  const [soNaOuvert, setSoNaOuvert] = useState({}); // bloc « PC non affectés » déplié (replié par défaut)
  const [soASupprimer, setSoASupprimer] = useState([]);
  // Coche / décoche « à supprimer de Sophos Central » (mémorisé dans sophos_postes)
  const soMarquerSuppression = async (p, val) => {
    const maj = { a_supprimer: !!val, a_supprimer_par: val ? adminFromName() : null, a_supprimer_le: val ? new Date().toISOString() : null };
    const { error } = await sb.from("sophos_postes").update(maj).eq("tenant_id", p.tenant_id).eq("sophos_id", p.sophos_id);
    if (error) { alert("Erreur : " + error.message + (/column|a_supprimer/i.test(error.message) ? "\n\nLe script sophos_suppression.sql a-t-il été exécuté ?" : "")); return; }
    const appliquer = (x) => (x.tenant_id === p.tenant_id && x.sophos_id === p.sophos_id) ? { ...x, ...maj } : x;
    setSoNonAffectes(prev => prev.map(appliquer));
    setSoPostes(prev => { const o = {}; Object.keys(prev).forEach(k => { o[k] = (prev[k] || []).map(appliquer); }); return o; });
    setSoASupprimer(prev => val
      ? [...prev.filter(x => !(x.tenant_id === p.tenant_id && x.sophos_id === p.sophos_id)), { ...p, ...maj }].sort((a, b) => String(a.hostname).localeCompare(String(b.hostname)))
      : prev.filter(x => !(x.tenant_id === p.tenant_id && x.sophos_id === p.sophos_id)));
  };
  const soAffecter = async (tenantId, items, msgOk) => {
    setSoMsg("");
    try {
      const r = await callSophosApi("/affecter", { tenantId, items });
      setSoMsg("✅ " + (msgOk || "Affectation enregistrée") + (r.non_affectes != null ? " — reste " + r.non_affectes + " PC non affecté(s) sur ce compte." : "."));
      await loadSophos(true);
      if (soOpenHotel) loadSoPostes(soOpenHotel);
    } catch (e) { setSoMsg("❌ " + (e.message || e)); }
  };
  // Interroge NinjaOne pour proposer l'hôtel de chaque PC non affecté
  // (organisation NinjaOne = champ « Nom NinjaOne » de la fiche établissement).
  const soSuggererNinja = async (postesNA) => {
    const noms = [...new Set(postesNA.map(p => p.hostname).filter(Boolean))];
    setSoSuggest({ loading: true, err: "", parPoste: {} });
    const parPoste = {};
    let err = "";
    for (let i = 0; i < noms.length; i += 20) {
      try {
        const r = await callSophosApi("/ninja-postes", { hostnames: noms.slice(i, i + 20), detail: false });
        (r.postes || []).forEach(x => { parPoste[String(x.hostname || "").toUpperCase()] = x; });
        setSoSuggest({ loading: true, err: "", parPoste: { ...parPoste } });
      } catch (e) { err = e.message || String(e); break; }
    }
    setSoSuggest({ loading: false, err, parPoste });
  };
  const [soSecOuvertes, setSoSecOuvertes] = useState({}); // sections repliées/dépliées par hôtel
  // Protection anti-altération : sélection de PC par hôtel { hotelId: { sophos_id: hostname } }
  const [soTpSel, setSoTpSel] = useState({});
  const [soTpBusy, setSoTpBusy] = useState("");
  const [soTpMsg, setSoTpMsg] = useState({});
  const soTpBasculer = (hotelId, liste, val) => setSoTpSel(prev => {
    const cur = { ...(prev[hotelId] || {}) };
    liste.forEach(p => { if (val) cur[p.sophos_id] = p.hostname; else delete cur[p.sophos_id]; });
    return { ...prev, [hotelId]: cur };
  });
  const soTamper = async (hotelId, action) => {
    const sel = soTpSel[hotelId] || {};
    const ids = Object.keys(sel);
    if (!ids.length) return;
    if (ids.length > 25) { alert("25 PC maximum par opération (" + ids.length + " sélectionnés)."); return; }
    const noms = Object.values(sel).join(", ");
    const q = action === "desactiver"
      ? "Désactiver la protection anti-altération sur " + ids.length + " PC ?\n\n" + noms + "\n\nLes PC restent protégés par Sophos, mais l'agent pourra être désinstallé. Pensez à la réactiver (ou réinstallez Sophos : la politique la réactive)."
      : "Réactiver la protection anti-altération sur " + ids.length + " PC ?\n\n" + noms;
    if (!window.confirm(q)) return;
    setSoTpBusy(hotelId); setSoTpMsg(prev => ({ ...prev, [hotelId]: null }));
    try {
      const r = await callSophosApi("/tamper", { hotelId, sophosIds: ids, action });
      const okIds = new Set((r.resultats || []).filter(x => x.ok).map(x => x.sophosId));
      const echecs = (r.resultats || []).filter(x => !x.ok);
      setSoPostes(prev => ({ ...prev, [hotelId]: (prev[hotelId] || []).map(p => okIds.has(String(p.sophos_id)) ? { ...p, tamper_protection: action === "activer" } : p) }));
      setSoTpSel(prev => ({ ...prev, [hotelId]: Object.fromEntries(Object.entries(prev[hotelId] || {}).filter(([k]) => !okIds.has(k))) }));
      setSoTpMsg(prev => ({ ...prev, [hotelId]: {
        ok: !echecs.length,
        txt: (okIds.size ? "✅ Anti-altération " + (action === "activer" ? "réactivée" : "désactivée") + " sur " + okIds.size + " PC. Le PC applique la consigne à son prochain contact avec Sophos Central (2 à 5 min)." : "")
          + (echecs.length ? (okIds.size ? "\n" : "") + "⚠️ " + echecs.length + " échec(s) : " + echecs.map(x => (x.hostname || x.sophosId) + " — " + x.erreur).join(" | ") : ""),
      } }));
    } catch (e) {
      setSoTpMsg(prev => ({ ...prev, [hotelId]: { ok: false, txt: "⚠️ " + (e.message || e) } }));
    }
    setSoTpBusy("");
  };
  // Analyse complète à la demande (scan Sophos). liste = PC précis ; sinon la sélection de l'hôtel.
  const soScanner = async (hotelId, liste) => {
    const sel = liste ? Object.fromEntries(liste.map(p => [p.sophos_id, p.hostname])) : (soTpSel[hotelId] || {});
    const ids = Object.keys(sel);
    if (!ids.length) return;
    if (ids.length > 25) { alert("25 PC maximum par opération (" + ids.length + " sélectionnés)."); return; }
    const noms = Object.values(sel).join(", ");
    if (!window.confirm("Lancer une analyse Sophos complète sur " + ids.length + " PC ?\n\n" + noms +
      "\n\nL'analyse tourne en arrière-plan sur le PC (de quelques minutes à plus d'une heure, le poste peut ralentir). Une menace trouvée remontera comme alerte Sophos.")) return;
    setSoTpBusy(liste ? hotelId + ":scan:" + ids[0] : hotelId); setSoTpMsg(prev => ({ ...prev, [hotelId]: null }));
    try {
      const r = await callSophosApi("/scan", { hotelId, sophosIds: ids });
      const echecs = (r.resultats || []).filter(x => !x.ok);
      const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setSoTpMsg(prev => ({ ...prev, [hotelId]: {
        ok: !echecs.length,
        txt: (r.reussis ? "🔍 Analyse demandée à " + heure + " sur " + r.reussis + " PC. Elle démarre au prochain contact du PC avec Sophos Central ; une menace trouvée apparaîtra dans les alertes et le statut se mettra à jour aux synchros suivantes." : "")
          + (echecs.length ? (r.reussis ? "\n" : "") + "⚠️ " + echecs.length + " échec(s) : " + echecs.map(x => (x.hostname || x.sophosId) + " — " + x.erreur).join(" | ") : ""),
      } }));
    } catch (e) {
      setSoTpMsg(prev => ({ ...prev, [hotelId]: { ok: false, txt: "⚠️ " + (e.message || e) } }));
    }
    setSoTpBusy("");
  };
  // Suppression définitive de PC dans Sophos Central (PC muets uniquement, contrôlé par le Worker).
  // postes = [{ sophos_id, hostname }] d'UN même compte Sophos ; hotelId = hôtel affiché (pour le message), ou null.
  const soSupprimerSophos = async (tenantId, postes, hotelId) => {
    const lst = (postes || []).filter(p => p && p.sophos_id);
    if (!tenantId || !lst.length) return;
    if (lst.length > 25) { alert("25 PC maximum par opération (" + lst.length + " sélectionnés)."); return; }
    if (!window.confirm("Supprimer définitivement " + lst.length + " PC de Sophos Central ?\n\n" + lst.map(p => p.hostname).join(", ") +
      "\n\nAction irréversible. Seuls les PC muets depuis plus de 7 jours seront supprimés. Si un de ces PC est rallumé avec l'agent encore installé, il faudra réinstaller Sophos dessus.")) return;
    const cle = hotelId || "__suppr";
    setSoTpBusy(cle + ":suppr"); setSoMsg("");
    try {
      const r = await callSophosApi("/supprimer-postes", { tenantId, sophosIds: lst.map(p => p.sophos_id) });
      const ok = new Set((r.resultats || []).filter(x => x.ok).map(x => String(x.sophosId)));
      const echecs = (r.resultats || []).filter(x => !x.ok);
      const garde = (x) => !(x.tenant_id === tenantId && ok.has(String(x.sophos_id)));
      setSoPostes(prev => { const o = {}; Object.keys(prev).forEach(k => { o[k] = (prev[k] || []).filter(garde); }); return o; });
      setSoNonAffectes(prev => prev.filter(garde));
      setSoASupprimer(prev => prev.filter(garde));
      setSoTpSel(prev => { const o = {}; Object.keys(prev).forEach(k => { o[k] = Object.fromEntries(Object.entries(prev[k] || {}).filter(([id]) => !ok.has(id))); }); return o; });
      const txt = (ok.size ? "🗑 " + ok.size + " PC supprimé" + (ok.size > 1 ? "s" : "") + " de Sophos Central." : "")
        + (echecs.length ? (ok.size ? "\n" : "") + "⚠️ " + echecs.length + " non supprimé(s) : " + echecs.map(x => (x.hostname || x.sophosId) + " — " + x.erreur).join(" | ") : "");
      if (hotelId) setSoTpMsg(prev => ({ ...prev, [hotelId]: { ok: !echecs.length, txt } }));
      else setSoMsg((echecs.length ? "❌ " : "✅ ") + txt);
      loadSophos(true);
    } catch (e) {
      if (hotelId) setSoTpMsg(prev => ({ ...prev, [hotelId]: { ok: false, txt: "⚠️ " + (e.message || e) } }));
      else setSoMsg("❌ " + (e.message || e));
    }
    setSoTpBusy("");
  };
  // Vide le dossier Téléchargements de tous les profils des PC (script NinjaOne, PC en ligne).
  const soViderTelechargements = async (hotelId, noms, unSeul) => {
    const lst = [...new Set((noms || []).filter(Boolean))];
    if (!lst.length) return;
    if (lst.length > 15) { alert("15 PC maximum par opération (" + lst.length + " sélectionnés)."); return; }
    if (!window.confirm("Vider ENTIÈREMENT le dossier Téléchargements sur " + lst.length + " PC ?\n\n" + lst.join(", ") +
      "\n\nTous les fichiers des dossiers Téléchargements de TOUS les utilisateurs de ces PC seront supprimés définitivement (pas de corbeille). Seuls les PC en ligne dans NinjaOne seront traités.")) return;
    setSoTpBusy(unSeul ? hotelId + ":dl:" + lst[0] : hotelId); setSoTpMsg(prev => ({ ...prev, [hotelId]: null }));
    try {
      const r = await callSophosApi("/vider-telechargements", { hostnames: lst });
      const echecs = (r.resultats || []).filter(x => !x.ok);
      setSoTpMsg(prev => ({ ...prev, [hotelId]: {
        ok: !echecs.length,
        txt: (r.reussis ? "🧹 Nettoyage des Téléchargements lancé sur " + r.reussis + " PC. Le détail (nombre de fichiers, Mo libérés) est visible dans NinjaOne → fiche du PC → Activités." : "")
          + (echecs.length ? (r.reussis ? "\n" : "") + "⚠️ " + echecs.length + " non traité(s) : " + echecs.map(x => x.hostname + " — " + x.erreur).join(" | ") : ""),
      } }));
    } catch (e) {
      setSoTpMsg(prev => ({ ...prev, [hotelId]: { ok: false, txt: "⚠️ " + (e.message || e) } }));
    }
    setSoTpBusy("");
  };
  const soTamperMdp = async (hotelId, p) => {
    setSoTpBusy(hotelId + ":" + p.sophos_id);
    try {
      const r = await callSophosApi("/tamper", { hotelId, sophosIds: [p.sophos_id], action: "motdepasse" });
      if (!r.motDePasse) alert("Aucun mot de passe renvoyé par Sophos pour " + p.hostname + (r.active ? "" : " (anti-altération désactivée)."));
      else window.prompt("Mot de passe anti-altération de " + p.hostname + (r.active ? "" : " (actuellement désactivée)") + " — à copier :", r.motDePasse);
    } catch (e) { alert(e.message || String(e)); }
    setSoTpBusy("");
  };
  // Postes à problème : fiche détaillée (10 par appel) ; postes OK : état +
  // dernier contact seulement (20 par appel). Affichage au fil des lots.
  const soLoadNinja = async (hotelId, pbNoms, okNoms) => {
    const lots = [];
    const pb = [...new Set((pbNoms || []).filter(Boolean))];
    const ok = [...new Set((okNoms || []).filter(Boolean))];
    for (let i = 0; i < pb.length; i += 10) lots.push({ hostnames: pb.slice(i, i + 10), detail: true });
    for (let i = 0; i < ok.length; i += 20) lots.push({ hostnames: ok.slice(i, i + 20), detail: false });
    if (!lots.length) return;
    const postes = {};
    setSoNinja(prev => ({ ...prev, [hotelId]: { loading: true, err: "", postes } }));
    let err = "";
    for (const lot of lots) {
      try {
        const r = await callSophosApi("/ninja-postes", lot);
        (r.postes || []).forEach(p => { postes[String(p.hostname || "").toUpperCase()] = p; });
        setSoNinja(prev => ({ ...prev, [hotelId]: { loading: true, err: "", postes: { ...postes } } }));
      } catch (e) { err = e.message || String(e); break; }
    }
    setSoNinja(prev => ({ ...prev, [hotelId]: { loading: false, err, postes: { ...postes } } }));
  };


  const soSynchroniser = async (hotelId) => {
    setSoBusy(hotelId); setSoMsg("");
    try {
      const r = await callSophosApi("/synchroniser", { hotelId });
      setSoMsg("✅ Synchronisé : " + (r.nb_postes || 0) + " poste(s), " + (r.nb_alertes || 0) + " alerte(s) de sécurité" + (r.nb_licences ? ", " + r.nb_licences + " licence(s)" : "") + ".");
      await loadSophos(true);
      if (soOpenHotel === hotelId) loadSoPostes(hotelId);
    } catch (e) {
      setSoMsg("❌ " + (e.message || e));
      await loadSophos(true);
    } finally { setSoBusy(""); }
  };

  const soEnregistrerCompte = async () => {
    const f = soModal;
    if (!f) return;
    if (!f.copierDe && !String(f.clientId || "").trim()) { setSoModal({ ...f, err: "L'ID client est obligatoire." }); return; }
    if (!f.copierDe && !f.existe && !String(f.clientSecret || "").trim()) { setSoModal({ ...f, err: "Le secret est obligatoire pour un nouveau compte." }); return; }
    setSoModal({ ...f, busy: true, err: "" });
    try {
      const decoupe = (v) => String(v || "").split(/[\n,;]/).map(x => x.trim()).filter(Boolean);
      const r = await callSophosApi("/compte", {
        hotelId: f.hotelId,
        clientId: (f.clientId || "").trim(), clientSecret: (f.clientSecret || "").trim(),
        copierDe: f.copierDe || undefined,
        actif: f.actif !== false,
        principal: !!f.principal,
        libelle: f.copierDe ? undefined : (f.libelle || "").trim(), // compte copié : on garde le nom existant
        regles: { groupes: decoupe(f.rGroupes), prefixes: decoupe(f.rPrefixes), domaines: decoupe(f.rDomaines), ips: decoupe(f.rIps) },
      });
      setSoModal(null);
      const s = r.synchro;
      setSoMsg(s && s.ok
        ? "✅ Compte Sophos enregistré et testé — " + (s.nb_postes || 0) + " poste(s), " + (s.nb_alertes || 0) + " alerte(s) de sécurité" + (s.nb_licences ? ", " + s.nb_licences + " alerte(s) de licence" : "") + "."
        : "✅ Compte Sophos enregistré." + (s && s.erreur ? " ⚠️ Première synchro : " + s.erreur : ""))
        + (s && s.partage ? " Compte partagé : " + (s.non_affectes || 0) + " PC non affecté(s) à répartir." : "");
      await loadSophos(true);
    } catch (e) {
      setSoModal({ ...f, busy: false, err: e.message || String(e) });
    }
  };

  // Protection d'un hôtel : antivirus, SOC externe, bascule programmée.
  // Une date de bascule crée / met à jour une fiche Infrastructure avec rappel (worker dsi-hotel-rappels : J-1 et J-0).
  const soEnregistrerProtection = async () => {
    const f = soProtModal;
    if (!f) return;
    if (!!f.antivirus_futur !== !!f.antivirus_bascule) { setSoProtModal({ ...f, err: "Pour un changement programmé, indiquez le nouvel antivirus ET la date." }); return; }
    setSoProtModal({ ...f, busy: true, err: "" });
    try {
      const upd = { antivirus: f.antivirus || null, soc: f.soc || null, antivirus_futur: f.antivirus_futur || null, antivirus_bascule: f.antivirus_bascule || null };
      const { error } = await sb.from("hotels").update(upd).eq("id", f.hotelId);
      if (error) throw error;
      const NOMS = { sophos: "Sophos", sentinelone: "SentinelOne", crowdstrike: "CrowdStrike" };
      const { data: ex } = await sb.from("hotel_docs").select("id, rappel_date").eq("hotel_id", f.hotelId).like("titre", "Bascule antivirus%");
      if (upd.antivirus_futur) {
        const titre = "Bascule antivirus → " + (NOMS[upd.antivirus_futur] || upd.antivirus_futur) + (upd.soc === "stoik" ? " (Stoïk SOC)" : "");
        const fiche = { titre, categorie: "Infrastructure", rappel_date: upd.antivirus_bascule, rappel_note: titre, rappel_jalons: [1, 0],
          description: "Passage de l'antivirus à " + (NOMS[upd.antivirus_futur] || upd.antivirus_futur) + ". Vérifier le déploiement sur tous les postes et retirer l'ancien antivirus." };
        if (ex && ex.length) {
          const chg = ex[0].rappel_date !== upd.antivirus_bascule;
          const { error: e2 } = await sb.from("hotel_docs").update({ ...fiche, ...(chg ? { rappel_jalons_envoyes: null } : {}), updated_at: new Date().toISOString() }).eq("id", ex[0].id);
          if (e2) throw e2;
        } else {
          const { error: e2 } = await sb.from("hotel_docs").insert({ hotel_id: f.hotelId, ...fiche });
          if (e2) throw e2;
        }
      } else if (ex && ex.length) {
        await sb.from("hotel_docs").update({ rappel_date: null }).eq("id", ex[0].id); // plus de bascule : on coupe le rappel
      }
      setHotels(prev => prev.map(h => h.id === f.hotelId ? { ...h, ...upd } : h));
      setSoProtModal(null);
      setSoMsg("✅ Protection enregistrée pour « " + f.nom + " »." + (upd.antivirus_futur ? " Rappel programmé la veille et le jour de la bascule." : ""));
    } catch (e) {
      setSoProtModal({ ...f, busy: false, err: e.message || String(e) });
    }
  };

  const soSupprimerCompte = async (hotelId, nom) => {
    if (!confirm("Retirer la supervision Sophos de « " + nom + " » ?\n\nL'identité API enregistrée, les alertes et l'état des postes de cet hôtel seront supprimés du portail (rien n'est modifié dans Sophos Central).")) return;
    try {
      await callSophosApi("/supprimer", { hotelId });
      setSoModal(null);
      setSoMsg("Supervision retirée pour « " + nom + " ».");
      await loadSophos(true);
    } catch (e) { alert("Erreur : " + (e.message || e)); }
  };

  // Même alerte répétée (même hôtel, même PC, même message, même statut) :
  // on n'affiche que la plus récente, avec le nombre d'occurrences. La prise en
  // charge et la note s'appliquent à tout le groupe.
  const soCleAlerte = (a) => [a.hotel_id, String(a.poste || "").trim().toUpperCase(), String(a.description || a.type || "").trim().toLowerCase(), a.statut].join("|");
  const soDedoublonner = (liste) => {
    const groupes = new Map();
    (liste || []).forEach(a => { const k = soCleAlerte(a); if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(a); });
    return [...groupes.values()].map(g => {
      g.sort((x, y) => new Date(y.raised_at || 0) - new Date(x.raised_at || 0));
      const rec = g[0];
      const pec = g.find(x => x.prise_en_charge_par);
      const not = g.find(x => x.note);
      return { ...rec,
        prise_en_charge_par: rec.prise_en_charge_par || (pec && pec.prise_en_charge_par) || null,
        prise_en_charge_le: rec.prise_en_charge_le || (pec && pec.prise_en_charge_le) || null,
        note: rec.note || (not && not.note) || null,
        _ids: g.map(x => x.id), _nb: g.length, _premiere: g[g.length - 1].raised_at };
    });
  };
  const soPrendreEnCharge = async (a) => {
    const ids = a._ids || [a.id];
    const maj = { prise_en_charge_par: adminFromName(), prise_en_charge_le: new Date().toISOString() };
    const { error } = await sb.from("sophos_alertes").update(maj).in("id", ids);
    if (error) { alert("Erreur : " + error.message); return; }
    setSoAlertes(prev => prev.map(x => ids.includes(x.id) ? { ...x, ...maj } : x));
  };

  const soEnregistrerNote = async () => {
    if (!soNoteEdit) return;
    const note = (soNoteEdit.note || "").trim() || null;
    const ids = soNoteEdit.ids || [soNoteEdit.id];
    const { error } = await sb.from("sophos_alertes").update({ note }).in("id", ids);
    if (error) { alert("Erreur : " + error.message); return; }
    setSoAlertes(prev => prev.map(x => ids.includes(x.id) ? { ...x, note } : x));
    setSoNoteEdit(null);
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (page === "sophos") loadSophos();
    else if (page === "accueil") loadSophos(true);
  }, [page, profile]);

  // ============================================================
  //  SÉCURITÉ MICROSOFT 365 — alertes Microsoft Defender de chaque tenant client.
  //  Données alimentées par le Worker dsi-hotel-m365 (tables m365_tenants / m365_alertes).
  // ============================================================
  // App Entra multilocataire « DSI Hotel – Supervision M365 », inscrite dans le tenant DSIHOTEL (remplace l'ancienne app c5e5581e… hébergée chez VOCO)
  const M365_APP_ID = "780892ba-9e53-4dd2-94df-3b9c90449217";
  // ============================================================
  //  LICENCES MICROSOFT 365 — état des licences d'un établissement
  //  (achetées / attribuées / disponibles, comptes à revoir).
  //  Généré à la demande par le Worker dsi-hotel-api-v2 (route /licences-m365),
  //  instantané conservé dans la table m365_licences_rapports.
  //  Admin : tous les hôtels. Superviseur : son établissement actif.
  // ============================================================
  const [lmHotel, setLmHotel] = useState("");
  const [lmRapport, setLmRapport] = useState(null); // ligne m365_licences_rapports
  const [lmLoading, setLmLoading] = useState(false);
  const [lmErr, setLmErr] = useState(null); // { msg, code, tenantId }
  const [lmRecherche, setLmRecherche] = useState("");
  const [lmVue, setLmVue] = useState("licencies"); // licencies | revoir | tous
  const [lmTenants, setLmTenants] = useState([]); // admin : hôtels ayant un tenant rattaché
  const loadLicencesM365 = async (forcer) => {
    const hid = isAdmin ? lmHotel : myHotelId;
    if (!hid) { setLmRapport(null); setLmErr(null); return; }
    setLmLoading(true); setLmErr(null);
    try {
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(ADMIN_API_URL + "/licences-m365", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hotelId: hid, forcer: !!forcer }),
      });
      const d = await res.json().catch(() => ({ error: "Réponse invalide du serveur (statut " + res.status + ")" }));
      if (!res.ok || d.error) {
        setLmErr({ msg: d.error || ("Erreur " + res.status), code: d.code || null, tenantId: d.tenantId || null, appId: d.appId || null });
        setLmRapport(d.rapport || (forcer ? lmRapport : null));
      } else {
        setLmRapport(d.rapport || null);
      }
    } catch (e) {
      setLmErr({ msg: String(e.message || e) });
    } finally {
      setLmLoading(false);
    }
  };
  useEffect(() => {
    if (page !== "licences-m365" || !profile) return;
    if (!(isAdmin || isSupervisor)) return;
    setLmRecherche("");
    loadLicencesM365(false);
  }, [page, profile, lmHotel]);
  useEffect(() => {
    if (page !== "licences-m365" || !isAdmin) return;
    sb.from("m365_tenants").select("tenant_id,hotel_id,actif,nom").then(({ data }) => setLmTenants(Array.isArray(data) ? data : []));
  }, [page, isAdmin]);

  // Export PDF du rapport de licences
  const exporterLicencesPdf = async (rap, nomHotel, logoUrl) => {
    const logo = logoUrl ? await chargerImageBase64(logoUrl) : null;
    const d = (rap && rap.donnees) || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = 210, pageH = 297, mL = 14, mR = 14, W = pageW - mL - mR;
    const fmtD = (iso) => { try { return iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—"; } catch (e) { return "—"; } };
    const propre = (s) => String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, "-").replace(/[^\x00-\xFF]/g, "");
    const entete = () => {
      doc.setFillColor(15, 15, 36); doc.rect(0, 0, pageW, 26, "F");
      doc.setTextColor(201, 168, 76); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
      doc.text("DSI HOTEL", mL, 12);
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text("État des licences Microsoft 365", mL, 20);
      doc.setFontSize(7.5);
      doc.text("60 Rue François 1er, 75008 Paris  •  +33 1 84 18 02 23", pageW - mR, 11, { align: "right" });
      doc.text("support@dsihotel.com  •  www.dsihotel.com", pageW - mR, 16, { align: "right" });
    };
    let y = 0;
    const saut = (h) => { if (y + h > pageH - 14) { doc.addPage(); entete(); y = 34; return true; } return false; };
    entete(); y = 36;
    // Logo de l'hôtel, à droite sous le bandeau (fond blanc : lisible quel que soit le logo)
    if (logo) {
      try {
        const hMax = 16, wLogo = Math.min(hMax * (logo.w / logo.h), 45), hLogo = Math.min(hMax, 45 * (logo.h / logo.w));
        doc.addImage(logo.data, "PNG", pageW - mR - wLogo, 30, wLogo, hLogo);
        y = 38;
      } catch (e) {}
    }
    doc.setTextColor(20, 20, 40); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(propre("Établissement : " + (nomHotel || "—")), mL, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110, 110, 120);
    doc.text(propre("Extraction du " + (rap && rap.genere_le ? new Date(rap.genere_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—") + " — source : Microsoft 365 (tenant " + ((rap && rap.tenant_id) || "?") + ")"), mL, y); y += 9;

    // Tuiles
    const t = d.totaux || {};
    const tuiles = [["Licences achetées", t.achetees], ["Attribuées", t.attribuees], ["Disponibles", t.disponibles], ["Comptes à revoir", t.aRevoir]];
    const tw = (W - 9) / 4;
    tuiles.forEach(([l, v], i) => {
      const x = mL + i * (tw + 3);
      doc.setDrawColor(225, 225, 235); doc.setFillColor(250, 250, 252); doc.roundedRect(x, y, tw, 16, 2, 2, "FD");
      doc.setFontSize(7.5); doc.setTextColor(120, 120, 130); doc.text(l, x + 3, y + 5);
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(i === 3 && v > 0 ? 197 : 15, i === 3 && v > 0 ? 48 : 15, i === 3 && v > 0 ? 48 : 36);
      doc.text(String(v == null ? "—" : v), x + 3, y + 13); doc.setFont("helvetica", "normal");
    });
    y += 24;

    // Tableau générique
    const tableau = (titre, cols, lignes) => {
      saut(18);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20, 20, 40);
      doc.text(propre(titre), mL, y); y += 5;
      const ligneEntete = () => {
        doc.setFillColor(15, 15, 36); doc.rect(mL, y, W, 6.5, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(7.8); doc.setFont("helvetica", "bold");
        let x = mL; cols.forEach(c => { doc.text(c.l, c.d ? x + c.w - 2 : x + 2, y + 4.5, c.d ? { align: "right" } : undefined); x += c.w; });
        y += 6.5; doc.setFont("helvetica", "normal");
      };
      ligneEntete();
      lignes.forEach((r, k) => {
        doc.setFontSize(7.8);
        const cellules = cols.map((c, i) => doc.splitTextToSize(propre(r[i]), c.w - 4));
        const h = Math.max(5.5, ...cellules.map(c => c.length * 3.4 + 2));
        if (saut(h + 2)) ligneEntete();
        if (k % 2) { doc.setFillColor(247, 247, 250); doc.rect(mL, y, W, h, "F"); }
        doc.setTextColor(40, 40, 55);
        let x = mL; cols.forEach((c, i) => { doc.text(cellules[i], c.d ? x + c.w - 2 : x + 2, y + 3.8, c.d ? { align: "right" } : undefined); x += c.w; });
        y += h;
      });
      y += 7;
    };

    const payantes = (d.licences || []).filter(l => !l.gratuite);
    tableau("Licences de l'établissement", [
      { l: "Licence", w: 76 }, { l: "Achetées", w: 20, d: 1 }, { l: "Attribuées", w: 21, d: 1 }, { l: "Disponibles", w: 22, d: 1 }, { l: "Échéance", w: W - 139 },
    ], payantes.map(l => [l.nom + (l.essai ? " (essai)" : "") + (l.statut && l.statut !== "Enabled" ? " — " + l.statut : ""), l.total, l.attribuees, l.disponibles, fmtD(l.prochaineEcheance)]));

    const alertes = (d.alertes || []).filter(a => a.niveau !== "info" || a.type === "dispo");
    if (alertes.length) tableau("Points à vérifier", [{ l: "Constat", w: W }], alertes.map(a => [a.texte]));

    const lic = (d.utilisateurs || []).filter(u => u.nbPayantes > 0);
    tableau("Comptes avec licence (" + lic.length + ")", [
      { l: "Utilisateur", w: 52 }, { l: "Licence(s)", w: 62 }, { l: "Compte", w: 18 }, { l: "Dernière activité", w: W - 132 },
    ], lic.map(u => [u.nom + "\n" + u.upn, u.licences.join(", "), u.actif ? "Actif" : "Désactivé", d.sourceActivite === "aucune" ? "n.c." : (u.derniereActivite ? fmtD(u.derniereActivite) + (u.joursInactif > 90 ? " (" + u.joursInactif + " j)" : "") : "Jamais")]));

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150, 150, 160); doc.text("DSI Hotel — état des licences Microsoft 365 — page " + i + " / " + n, pageW / 2, pageH - 7, { align: "center" }); }
    doc.save("Licences_M365_" + String(nomHotel || "etablissement").replace(/[^\w]+/g, "_") + "_" + new Date().toISOString().slice(0, 10) + ".pdf");
  };

  // Export CSV (Excel) de la liste des comptes
  const exporterLicencesCsv = (rap, nomHotel) => {
    const d = (rap && rap.donnees) || {};
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const fmtD = (iso) => { try { return iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : ""; } catch (e) { return ""; } };
    const MOTIFS = { desactive: "Compte désactivé avec licence", inactif: "Inactif > 90 jours / jamais connecté", invite: "Invité avec licence" };
    const lignes = [["Nom", "Identifiant", "Compte", "Type", "Poste", "Service", "Licences", "Dernière activité", "Jours sans activité", "Créé le", "À revoir"].map(q).join(";")];
    (d.utilisateurs || []).forEach(u => lignes.push([u.nom, u.upn, u.actif ? "Actif" : "Désactivé", u.invite ? "Invité" : "Membre", u.poste, u.service, u.licences.join(", "), fmtD(u.derniereActivite), u.joursInactif == null ? "" : u.joursInactif, fmtD(u.cree), u.alertes.map(a => MOTIFS[a] || a).join(", ")].map(q).join(";")));
    lignes.push("");
    lignes.push(["Licence", "Achetées", "Attribuées", "Disponibles", "Échéance"].map(q).join(";"));
    (d.licences || []).filter(l => !l.gratuite).forEach(l => lignes.push([l.nom, l.total, l.attribuees, l.disponibles, fmtD(l.prochaineEcheance)].map(q).join(";")));
    const blob = new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Licences_M365_" + String(nomHotel || "etablissement").replace(/[^\w]+/g, "_") + "_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const [msTenants, setMsTenants] = useState([]);
  const [msAlertes, setMsAlertes] = useState([]);
  const [msLoading, setMsLoading] = useState(false);
  const [msErr, setMsErr] = useState("");
  const [msMsg, setMsMsg] = useState("");
  const [msTab, setMsTab] = useState("alertes");
  const [msVoirResolues, setMsVoirResolues] = useState(false);
  const [msVoirInfo, setMsVoirInfo] = useState(true);
  const [msFiltre, setMsFiltre] = useState("");
  const [msNoteEdit, setMsNoteEdit] = useState(null);
  const [msDomaine, setMsDomaine] = useState("");
  // Retour du lien de consentement Microsoft (?admin_consent=True&tenant=...) : pré-remplit l'ajout
  const [msAjout, setMsAjout] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const t = q.get("tenant");
      if (t && /^true$/i.test(q.get("admin_consent") || "") && q.get("state") !== "provisioning") return { tenant_id: t, nom: "", hotel_id: "", retour: true };
    } catch (e) {}
    return { tenant_id: "", nom: "", hotel_id: "" };
  });

  const loadM365 = async (silencieux) => {
    if (!silencieux) setMsLoading(true);
    setMsErr("");
    try {
      const [t, a] = await Promise.all([
        sb.from("m365_tenants").select("*").order("nom"),
        sb.from("m365_alertes").select("*").order("cree_le", { ascending: false }).limit(1000),
      ]);
      if (t.error) throw t.error;
      if (a.error) throw a.error;
      setMsTenants(t.data || []);
      setMsAlertes(a.data || []);
    } catch (e) {
      setMsErr("Erreur de chargement : " + (e.message || e) + " — les scripts m365_schema.sql et m365_portail.sql ont-ils été exécutés ?");
    } finally {
      if (!silencieux) setMsLoading(false);
    }
  };

  const msPrendreEnCharge = async (a) => {
    const maj = { vu_par: adminFromName(), vu_le: new Date().toISOString() };
    const { error } = await sb.from("m365_alertes").update(maj).eq("id", a.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setMsAlertes(prev => prev.map(x => x.id === a.id ? { ...x, ...maj } : x));
  };

  const msEnregistrerNote = async () => {
    if (!msNoteEdit) return;
    const note = (msNoteEdit.note || "").trim() || null;
    const { error } = await sb.from("m365_alertes").update({ note }).eq("id", msNoteEdit.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setMsAlertes(prev => prev.map(x => x.id === msNoteEdit.id ? { ...x, note } : x));
    setMsNoteEdit(null);
  };

  const msMajTenant = async (tenantId, maj, libelle) => {
    const { error } = await sb.from("m365_tenants").update(maj).eq("tenant_id", tenantId);
    if (error) { setMsMsg("❌ " + error.message); return; }
    setMsTenants(prev => prev.map(x => x.tenant_id === tenantId ? { ...x, ...maj } : x));
    if (libelle) setMsMsg(libelle);
  };

  const msAjouterTenant = async () => {
    const tid = (msAjout.tenant_id || "").trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(tid)) { setMsMsg("❌ L'ID de locataire doit être un GUID (ex. ef92aaca-e1b1-440d-93b9-bec4f94f0223)."); return; }
    const h = hotels.find(x => x.id === msAjout.hotel_id);
    const nom = (msAjout.nom || "").trim() || (h ? h.name : "");
    if (!nom) { setMsMsg("❌ Indiquez un nom ou choisissez un établissement."); return; }
    const { error } = await sb.from("m365_tenants").insert({ tenant_id: tid, nom, hotel_id: msAjout.hotel_id || null, actif: true });
    if (error) { setMsMsg("❌ " + (/duplicate|unique/i.test(error.message) ? "Ce tenant est déjà suivi." : error.message)); return; }
    setMsAjout({ tenant_id: "", nom: "", hotel_id: "" });
    setMsDomaine("");
    setMsMsg("✅ « " + nom + " » ajouté : la première synchronisation (30 derniers jours d'alertes + licences) aura lieu dans les prochaines minutes.");
    await loadM365(true);
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (page === "m365") loadM365();
    else if (page === "accueil") loadM365(true);
    if (page !== "m365" && page !== "accueil") return;
    const it = setInterval(() => loadM365(true), 120000);
    return () => clearInterval(it);
  }, [page, profile]);

  // Retour du consentement Microsoft : on ouvre directement l'onglet Établissements de Sécurité Microsoft
  useEffect(() => {
    if (!isAdmin || !msAjout.retour) return;
    setMsTab("tenants");
    setPage("m365");
    setMsMsg("✅ Consentement Microsoft accordé pour le tenant " + msAjout.tenant_id + " : choisissez l'établissement puis cliquez sur « Ajouter ».");
    setMsAjout(prev => ({ ...prev, retour: false }));
    try { const u = new URL(window.location.href); ["admin_consent", "tenant", "state"].forEach(k => u.searchParams.delete(k)); window.history.replaceState(null, "", u.pathname + u.search + u.hash); } catch (e) {}
  }, [isAdmin, msAjout.retour]);

  // Retour du consentement de l'app « DSI Hotel Provisioning » (création de comptes)
  useEffect(() => {
    if (!isAdmin) return;
    let q; try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
    if (q.get("state") !== "provisioning") return;
    const ok = /^true$/i.test(q.get("admin_consent") || "");
    setMsTab("tenants");
    setPage("m365");
    setMsMsg(ok
      ? "✅ Consentement « création de comptes » accordé pour le tenant " + (q.get("tenant") || "") + ". Cochez « Création de comptes » sur la fiche du tenant pour l'activer."
      : "❌ Consentement « création de comptes » non accordé : " + (q.get("error_description") || q.get("error") || "annulé") + ".");
    try { const u = new URL(window.location.href); ["admin_consent", "tenant", "state", "error", "error_description", "error_uri", "error_subcode"].forEach(k => u.searchParams.delete(k)); window.history.replaceState(null, "", u.pathname + u.search + u.hash); } catch (e) {}
  }, [isAdmin]);

  // Temps réel : carillon à l'arrivée d'une nouvelle alerte haute (Realtime activé par m365_portail.sql)
  useEffect(() => {
    if (!isAdmin) return;
    const canal = sb
      .channel("alerte-m365")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "m365_alertes" }, (payload) => {
        const n = payload && payload.new;
        if (n && n.severite === "high" && n.statut !== "resolved") jouerSonAlerte();
        if (page === "m365" || page === "accueil") loadM365(true);
      })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [isAdmin, page]);

  // ----- Historique des demandes de comptes (création / modification / suppression / mot de passe) -----
  const [hcRows, setHcRows] = useState([]);
  const [hcFiles, setHcFiles] = useState({});      // { ticketId: [pdf] }
  const [hcLoading, setHcLoading] = useState(false);
  const [hcErr, setHcErr] = useState("");
  const [hcSearch, setHcSearch] = useState("");
  const [hcType, setHcType] = useState("");
  const [hcHotel, setHcHotel] = useState("");
  const [hcStatut, setHcStatut] = useState("");
  const [hcOpenId, setHcOpenId] = useState(null);
  // ----- Planning d'équipe (calendrier Outlook partagé) -----
  const [plSemaine, setPlSemaine] = useState(() => plLundi(new Date()));
  const [plData, setPlData] = useState({ equipe: [], evenements: [], boite: "" });
  const [plLoading, setPlLoading] = useState(false);
  const [plErr, setPlErr] = useState("");
  const [plWeekend, setPlWeekend] = useState(false);
  // Mobile : jour affiché dans la vue « jour par jour » (null = aujourd'hui / 1er jour)
  const [plJourM, setPlJourM] = useState(null);
  const [plModal, setPlModal] = useState(null);   // formulaire RDV (création / édition) ou null
  const [plSaving, setPlSaving] = useState(false);
  const [plModalErr, setPlModalErr] = useState("");
  const [bkLoading, setBkLoading] = useState(false);
  const [bkNote, setBkNote] = useState("");
  const [bkFetchedAt, setBkFetchedAt] = useState(null);
  const [bkGroupMap, setBkGroupMap] = useState({}); // { group_id: hotel_id }
  const [bkLicences, setBkLicences] = useState({}); // { hotel_id: [lignes Veeam de l'inventaire serveurs (licence_fin…)] }
  const [bkLicEdit, setBkLicEdit] = useState(null); // { hid, fin, info } — saisie de la licence Veeam depuis Sauvegardes
  const [bkMapBusy, setBkMapBusy] = useState("");
  // Rattache un groupe CheckCentral à un hôtel (et les tickets d'alerte déjà ouverts de ce groupe)
  const bkRattacherGroupe = async (g, hotelId) => {
    if (!g.group_id) return;
    setBkMapBusy(g.group_id);
    try {
      const { data: n, error } = await sb.rpc("rattacher_groupe_checkcentral", { p_group_id: String(g.group_id), p_group_name: g.group || null, p_hotel_id: hotelId || null });
      if (error) throw error;
      setBkGroupMap(prev => { const m = { ...prev }; if (hotelId) m[g.group_id] = hotelId; else delete m[g.group_id]; return m; });
      const h = hotels.find(x => x.id === hotelId);
      setBkNote(hotelId ? "✅ « " + (g.group || g.group_id) + " » rattaché à " + (h ? h.name : "l'hôtel") + (n ? " — " + n + " ticket(s) d'alerte mis à jour" : "") + "." : "Rattachement retiré pour « " + (g.group || g.group_id) + " ».");
      if (n) loadTickets();
    } catch (e) {
      setBkNote("❌ Rattachement impossible : " + (e.message || e) + (/function|rattacher_groupe/i.test(String(e.message || "")) ? " — le script checkcentral_rattachement.sql a-t-il été exécuté ?" : ""));
    } finally { setBkMapBusy(""); }
  };
  // Suggestion d'hôtel d'après le nom du groupe CheckCentral (ex. « IC-Bordeaux » → « IC - Bordeaux »)
  const bkNormNom = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const bkSuggererHotel = (nomGroupe) => {
    const n = bkNormNom(nomGroupe);
    if (!n) return null;
    const exacts = hotels.filter(h => bkNormNom(h.name) === n);
    if (exacts.length === 1) return exacts[0];
    const proches = hotels.filter(h => { const hn = bkNormNom(h.name); return hn.includes(n) || n.includes(hn) || hn.split(" ").filter(w => w.length > 3).some(w => n.split(" ").includes(w)); });
    return proches.length === 1 ? proches[0] : null;
  };
  const [bkOpenGroups, setBkOpenGroups] = useState({}); // { groupKey: bool }
  const [bkOldOpen, setBkOldOpen] = useState(false); // dépliage de l'alerte "backups > 7 jours"
  // Notes manuelles d'explication sur les backups en échec/muets (motif métier).
  const [bkFreq, setBkFreq] = useState({});         // { check_id: { frequence_heures, derniere_reussite, created_at } } — sauvegardes non quotidiennes
  const [freqBusy, setFreqBusy] = useState(null);
  const [bkNotes, setBkNotes] = useState({});        // { check_id: { note, updated_by, updated_at } }
  const [bkNoteEditId, setBkNoteEditId] = useState(null); // check_id dont l'éditeur est ouvert
  const [bkNoteDraft, setBkNoteDraft] = useState(""); // texte en cours de saisie
  const [bkNoteBusy, setBkNoteBusy] = useState(false);
  // Suppression définitive d'un ticket (super-admin)
  const [supprRef, setSupprRef] = useState("");        // référence saisie (DSI-XXXX)
  const [supprTicket, setSupprTicket] = useState(null); // ticket trouvé
  const [supprNote, setSupprNote] = useState("");       // message d'état
  const [supprBusy, setSupprBusy] = useState(false);    // recherche/suppression en cours
  const [supprConfirm, setSupprConfirm] = useState(""); // saisie de confirmation (la référence retapée)
  const [supprHotel, setSupprHotel] = useState("");     // hôtel sélectionné pour lister ses tickets
  const [supprListe, setSupprListe] = useState([]);      // tickets de l'hôtel (ouverts + fermés)
  const [supprListeBusy, setSupprListeBusy] = useState(false);

  // Charge toutes les notes d'explication de backup en un seul appel (RPC admin).
  const loadBackupNotes = async () => {
    try {
      const { data, error } = await sb.rpc("get_backup_notes");
      if (error) return; // silencieux : la table/RPC peut ne pas exister encore
      const map = {};
      const aujourdhui = new Date().toISOString().slice(0, 10);
      for (const n of (data || [])) {
        if (!n || !n.check_id) continue;
        // Silence expiré : on retire la note pour que les alertes reprennent.
        const fin = bkSilenceFin(n.note);
        if (fin && fin < aujourdhui) {
          try { await sb.rpc("set_backup_note", { p_check_id: n.check_id, p_note: "" }); } catch (e) {}
          continue;
        }
        map[n.check_id] = { note: n.note || "", updated_by: n.updated_by || "", updated_at: n.updated_at || null };
      }
      setBkNotes(map);
    } catch (e) { /* silencieux */ }
  };

  // ---------- Mise en silence d'une alerte sauvegarde (ex. backup mensuel) ----------
  // Le silence est une note d'explication commençant par « 🔕 Silence jusqu'au AAAA-MM-JJ » :
  // le Worker CheckCentral ignore déjà les sauvegardes justifiées par une note, et la note
  // est supprimée automatiquement à l'expiration (à l'ouverture du tableau de bord / Sauvegardes).
  const BK_SILENCE_JOURS = 21;
  function bkSilenceFin(note) {
    const m = String(note || "").match(/^🔕 Silence jusqu'au (\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  const [silenceBusy, setSilenceBusy] = useState(null);
  const nomSauvegardeTicket = (t) => {
    const prem = (ticketMsgs[t.id] || [])[0];
    if (prem && prem.body_html) {
      try {
        const doc = new DOMParser().parseFromString(prem.body_html, "text/html");
        const cellules = Array.from(doc.querySelectorAll("td,th"));
        for (const c of cellules) {
          if ((c.textContent || "").trim().toLowerCase() === "sauvegarde" && c.nextElementSibling) {
            const v = (c.nextElementSibling.textContent || "").trim();
            if (v) return v;
          }
        }
      } catch (e) {}
    }
    const txt = String(t.message || "") + "\n" + String(t.subject || "");
    const m = txt.match(/Sauvegarde\s*[:\-–—]\s*([^\n(]+)/i);
    return m ? m[1].trim() : "";
  };
  const silencerAlerteBackup = async (t) => {
    if (!isAdmin || !t) return;
    setSilenceBusy(t.id);
    try {
      const nom = nomSauvegardeTicket(t);
      let checks = bkChecks;
      if (!checks || !checks.length) {
        const { data: sess } = await sb.auth.getSession();
        const res = await fetch(CHECKCENTRAL_API_URL, { headers: { Authorization: "Bearer " + (sess.session?.access_token || "") } });
        const d = await res.json().catch(() => ({}));
        checks = d.checks || [];
        if (checks.length) setBkChecks(checks);
      }
      const norm = (x) => String(x || "").trim().toLowerCase();
      let check = nom && checks.find(c => norm(c.name) === norm(nom));
      if (!check) {
        const texte = norm((t.subject || "") + " " + (t.message || "") + " " + nom);
        const cand = checks.filter(c => c.name && texte.includes(norm(c.name))).sort((a, b) => String(b.name).length - String(a.name).length);
        check = cand[0];
      }
      if (!check || !check.id) { alert("Impossible de retrouver la sauvegarde « " + (nom || "?") + " » dans CheckCentral. Vous pouvez la mettre en silence depuis Pilotage → Sauvegardes (bouton « Ajouter une note »)."); return; }
      const finD = new Date(); finD.setDate(finD.getDate() + BK_SILENCE_JOURS);
      const finIso = finD.toISOString().slice(0, 10);
      const finFr = finD.toLocaleDateString("fr-FR");
      const motif = window.prompt("Mettre en silence les alertes de « " + check.name + " » pendant 3 semaines (jusqu'au " + finFr + ") ?\n\nAucun ticket ni relance ne sera créé pendant cette période ; les alertes reprennent automatiquement ensuite. Ce ticket sera fermé.\n\nMotif (facultatif) :", "Sauvegarde mensuelle");
      if (motif === null) return;
      const qui = (profile && profile.full_name) || (session && session.user && session.user.email) || "Technicien DSI";
      const note = "🔕 Silence jusqu'au " + finIso + " (" + finFr + ")" + (motif.trim() ? " — " + motif.trim() : "") + " — par " + qui;
      const { error } = await sb.rpc("set_backup_note", { p_check_id: check.id, p_note: note });
      if (error) throw error;
      setBkNotes(prev => ({ ...prev, [check.id]: { note, updated_by: (profile && profile.email) || "", updated_at: new Date().toISOString() } }));
      const esc = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const body = "Alerte mise en silence jusqu'au " + finFr + " par " + qui + (motif.trim() ? " — " + motif.trim() : "");
      const body_html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">' +
        '<div style="background:#4A5568;color:#fff;border-radius:8px;padding:11px 15px;">' +
          '<div style="font-size:15px;font-weight:bold;">🔕 ALERTE MISE EN SILENCE — 3 SEMAINES</div>' +
          '<div style="font-size:13px;margin-top:3px;">Sauvegarde <b>' + esc(check.name) + '</b> : pas de nouveau ticket ni de relance jusqu\'au <b>' + esc(finFr) + '</b>. Par ' + esc(qui) + '.</div>' +
        '</div>' +
        (motif.trim() ? '<div style="margin-top:8px;padding:8px 12px;background:#F4F4F8;border-left:3px solid #4A5568;font-size:13px;">' + esc(motif.trim()) + '</div>' : '') +
      '</div>';
      await sb.from("ticket_messages").insert({ ticket_id: t.id, sender_role: "admin", sender_name: qui, body, body_html });
      await sb.from("tickets").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", t.id);
      setTickets(prev => prev.map(x => x.id === t.id ? { ...x, status: "closed" } : x));
      loadTicketMsgs(t.id);
    } catch (e) {
      alert("Impossible de mettre l'alerte en silence : " + (e.message || e));
    } finally {
      setSilenceBusy(null);
    }
  };

  // ---------- Fréquence attendue d'une sauvegarde (hebdo, mensuelle…) ----------
  // Une sauvegarde déclarée non quotidienne n'alerte pas tant que sa dernière réussite
  // date de moins d'une période + 2 jours. Un vrai échec remonté par le job (source « Message »)
  // alerte toujours. Règle identique dans le Worker dsi-hotel-checkcentral.
  const trouverCheckTicket = async (t) => {
    const nom = nomSauvegardeTicket(t);
    let checks = bkChecks;
    if (!checks || !checks.length) {
      const { data: sess } = await sb.auth.getSession();
      const res = await fetch(CHECKCENTRAL_API_URL, { headers: { Authorization: "Bearer " + (sess.session?.access_token || "") } });
      const d = await res.json().catch(() => ({}));
      checks = d.checks || [];
      if (checks.length) setBkChecks(checks);
    }
    const norm = (x) => String(x || "").trim().toLowerCase();
    let check = nom && checks.find(c => norm(c.name) === norm(nom));
    if (!check) {
      const texte = norm((t.subject || "") + " " + (t.message || "") + " " + nom);
      const cand = checks.filter(c => c.name && texte.includes(norm(c.name))).sort((a, b) => String(b.name).length - String(a.name).length);
      check = cand[0];
    }
    return check && check.id != null ? check : null;
  };
  const definirFrequenceBackup = async (check, heures, ticketSource) => {
    if (!check || check.id == null) return "";
    const id = String(check.id);
    const qui = (profile && profile.full_name) || (session && session.user && session.user.email) || "Technicien DSI";
    const nowIso = new Date().toISOString();
    if (!heures || heures <= 24) {
      const { error } = await sb.from("backup_frequences").delete().eq("check_id", id);
      if (error) throw error;
      setBkFreq(prev => { const m = { ...prev }; delete m[id]; return m; });
      const msg = "« " + check.name + " » repasse en sauvegarde quotidienne : alerte après 24 h de défaut.";
      setBkNote(msg);
      return msg;
    }
    if (!confirm("Déclarer « " + check.name + " » comme sauvegarde " + bkLibFreq(heures).toLowerCase() + " ?\n\n" +
      "• Plus d'alerte tant que sa dernière réussite date de moins de " + Math.round((heures + BK_MARGE_H) / 24) + " jours (période + 2 jours de marge).\n" +
      "• Si elle échoue réellement, ou si elle ne tourne pas dans ce délai, l'alerte revient.\n" +
      "• Les tickets d'alerte ouverts pour cette sauvegarde seront fermés.")) return "";
    let derniere = null;
    try { const { data: ex } = await sb.from("backup_frequences").select("derniere_reussite").eq("check_id", id).maybeSingle(); derniere = ex ? ex.derniere_reussite : null; } catch (e) {}
    const st = String(check.status || "").toLowerCase();
    if (st === "success") derniere = check.updatedIso || nowIso;
    const ligne = { check_id: id, check_name: check.name || null, frequence_heures: heures, derniere_reussite: derniere, created_at: nowIso, updated_at: nowIso, updated_by: qui };
    const { error } = await sb.from("backup_frequences").upsert(ligne, { onConflict: "check_id" });
    if (error) throw new Error(error.message + (/backup_frequences/i.test(error.message || "") ? " — le script backup_frequences.sql a-t-il été exécuté ?" : ""));
    setBkFreq(prev => ({ ...prev, [id]: ligne }));
    const enDefaut = st === "failure" || st === "warning";
    const fin = bkMasquee(check, ligne);
    if (enDefaut && !fin) {
      const msg = "⚠️ « " + check.name + " » est déclarée " + bkLibFreq(heures).toLowerCase() + ", mais l'alerte continue : " +
        (String(check.source || "").toLowerCase() === "message" ? "son dernier passage a réellement échoué." : "aucune réussite connue dans la période.");
      setBkNote(msg);
      return msg;
    }
    // Ferme les tickets d'alerte encore ouverts pour cette sauvegarde
    const ids = new Set();
    try {
      const { data: tks } = await sb.from("tickets").select("id,subject").eq("source", "checkcentral").neq("status", "closed").like("subject", "%— " + check.name);
      (tks || []).filter(x => String(x.subject || "").endsWith("— " + check.name)).forEach(x => ids.add(x.id));
    } catch (e) {}
    if (ticketSource && ticketSource.status !== "closed") ids.add(ticketSource.id);
    if (ids.size) {
      const liste = [...ids];
      const finFr = fin ? new Date(fin).toLocaleDateString("fr-FR") : null;
      const esc = (x) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const body = "Sauvegarde déclarée « " + bkLibFreq(heures).toLowerCase() + " » par " + qui + " : fausse alerte, ticket fermé." + (finFr ? " Prochaine exécution attendue avant le " + finFr + "." : "");
      const body_html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;">' +
        '<div style="background:#2B6CB0;color:#fff;border-radius:8px;padding:11px 15px;">' +
          '<div style="font-size:15px;font-weight:bold;">📅 SAUVEGARDE ' + esc(bkLibFreq(heures).toUpperCase()) + ' — FAUSSE ALERTE</div>' +
          '<div style="font-size:13px;margin-top:3px;"><b>' + esc(check.name) + '</b> ne tourne pas tous les jours : ticket fermé par ' + esc(qui) + '.' + (finFr ? ' Prochaine exécution attendue avant le <b>' + esc(finFr) + '</b> ; sans réussite à cette date, l\'alerte reviendra.' : '') + '</div>' +
        '</div></div>';
      await sb.from("ticket_messages").insert(liste.map(tid => ({ ticket_id: tid, sender_role: "admin", sender_name: qui, body, body_html })));
      const { error: eU } = await sb.from("tickets").update({ status: "closed", closed_at: nowIso }).in("id", liste);
      if (eU) throw eU;
      setTickets(prev => prev.map(x => ids.has(x.id) ? { ...x, status: "closed", closed_at: nowIso } : x));
      if (ticketSource) loadTicketMsgs(ticketSource.id);
    }
    const msg = "✅ « " + check.name + " » déclarée " + bkLibFreq(heures).toLowerCase() + (ids.size ? " — " + ids.size + " ticket(s) d'alerte fermé(s)." : ".");
    setBkNote(msg);
    return msg;
  };
  const frequenceDepuisTicket = async (t, heures) => {
    if (!isAdmin || !t) return;
    setFreqBusy(t.id);
    try {
      const check = await trouverCheckTicket(t);
      if (!check) { alert("Impossible de retrouver cette sauvegarde dans CheckCentral. Réglez sa fréquence depuis Pilotage → Sauvegardes."); return; }
      const msg = await definirFrequenceBackup(check, heures, t);
      if (msg && msg.startsWith("⚠️")) alert(msg);
    } catch (e) {
      alert("Impossible d'enregistrer la fréquence : " + (e.message || e));
    } finally {
      setFreqBusy(null);
    }
  };

  // Enregistre (ou supprime si vide) la note d'un check, puis met à jour l'état local.
  const saveBackupNote = async (checkId) => {
    if (!checkId) return;
    setBkNoteBusy(true);
    try {
      const texte = (bkNoteDraft || "").trim();
      const { error } = await sb.rpc("set_backup_note", { p_check_id: checkId, p_note: texte });
      if (error) { alert("Erreur lors de l'enregistrement de la note : " + error.message); return; }
      setBkNotes(prev => {
        const copy = { ...prev };
        if (texte) copy[checkId] = { note: texte, updated_by: (profile && profile.email) || "", updated_at: new Date().toISOString() };
        else delete copy[checkId];
        return copy;
      });
      setBkNoteEditId(null);
      setBkNoteDraft("");
    } catch (e) {
      alert("Erreur lors de l'enregistrement de la note.");
    } finally {
      setBkNoteBusy(false);
    }
  };

  const ouvrirNoteBackup = (checkId) => {
    if (bkNoteEditId === checkId) { setBkNoteEditId(null); return; }
    setBkNoteEditId(checkId);
    setBkNoteDraft((bkNotes[checkId] && bkNotes[checkId].note) || "");
  };

  // Bloc réutilisable : affichage de la note existante + bouton/éditeur.
  // N'apparaît que pour les checks en échec ou muets (règle appliquée à l'appel).
  const renderBackupNote = (checkId) => {
    const existante = bkNotes[checkId];
    const enEdition = bkNoteEditId === checkId;
    return React.createElement('div', { style: { marginTop: 6 } },
      existante && !enEdition && React.createElement('div', { style: { display: "flex", alignItems: "flex-start", gap: 6, background: "#FFFBEB", border: "1px solid #F0D98A", borderRadius: 7, padding: "6px 9px", marginBottom: 4 } },
        React.createElement('span', { style: { fontSize: 12, flexShrink: 0 } }, "📝"),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 11.5, color: "#8A6D1F", lineHeight: 1.5, whiteSpace: "pre-wrap" } }, existante.note),
          existante.updated_by && React.createElement('div', { style: { fontSize: 10, color: "#B9A15A", marginTop: 2 } }, "— " + existante.updated_by)
        )
      ),
      enEdition
        ? React.createElement('div', { style: { marginTop: 4 } },
            React.createElement('textarea', { value: bkNoteDraft, onChange: e => setBkNoteDraft(e.target.value), placeholder: "Expliquez pourquoi ce backup ne passe pas (ex. NAS débranché, site fermé, migration en cours…)", autoFocus: true, style: { width: "100%", minHeight: 54, padding: "7px 9px", border: "1px solid #DDD", borderRadius: 6, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" } }),
            React.createElement('div', { style: { display: "flex", gap: 6, marginTop: 5 } },
              React.createElement('button', { onClick: () => saveBackupNote(checkId), disabled: bkNoteBusy, style: { padding: "5px 12px", background: G, border: "none", color: "#111", borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: bkNoteBusy ? "default" : "pointer", opacity: bkNoteBusy ? 0.6 : 1 } }, bkNoteBusy ? "…" : "Enregistrer"),
              React.createElement('button', { onClick: () => { setBkNoteEditId(null); setBkNoteDraft(""); }, style: { padding: "5px 12px", background: "none", border: "1px solid #DDD", color: "#666", borderRadius: 6, fontSize: 11.5, cursor: "pointer" } }, "Annuler")
            )
          )
        : React.createElement('button', { onClick: () => ouvrirNoteBackup(checkId), style: { padding: "3px 9px", background: "none", border: "1px solid #E8D89A", color: "#8A6D1F", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 500 } }, existante ? "✏️ Modifier la note" : "📝 Ajouter une note")
    );
  };

  // ---------- Alertes sauvegardes > 24 h (Worker CheckCentral, route /alertes) ----------
  // mode "test" = simulation (rien n'est créé) ; mode "run" = création des tickets.
  const [bkAlerte, setBkAlerte] = useState(null); // { loading, data, err, mode, heures }
  const lancerAlertesBackup = async (mode, heures) => {
    const h = heures == null ? 24 : heures;
    setBkAlerte(prev => ({ ...(prev || {}), loading: true, err: "", mode, heures: h }));
    try {
      const { data: sessA } = await sb.auth.getSession();
      const url = CHECKCENTRAL_API_URL.replace(/\/status$/, "/alertes") + "?mode=" + mode + "&heures=" + h;
      const res = await fetch(url, { method: "GET", headers: { Authorization: "Bearer " + (sessA.session?.access_token || "") } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error((d.error || ("Erreur " + res.status)) + (d.detail ? " — " + d.detail : ""));
      setBkAlerte({ loading: false, data: d, err: "", mode, heures: h });
      if (mode === "run") loadTickets();
    } catch (e) {
      setBkAlerte(prev => ({ ...(prev || {}), loading: false, err: e.message || String(e) }));
    }
  };

  // ---------- Licence Veeam par hôtel (lue / écrite dans inventaire_serveurs) ----------
  const bkEstVeeam = (r) => /veeam/i.test((r.nom || "") + " " + (r.role || ""));
  const bkChargerLicences = async () => {
    const tout = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await sb.from("inventaire_serveurs").select("id,hotel_id,nom,role,licence_fin,licence_info,licence_alerte").range(from, from + 999);
      if (error) throw error;
      tout.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const ml = {};
    tout.filter(bkEstVeeam).forEach(r => { (ml[r.hotel_id] = ml[r.hotel_id] || []).push(r); });
    setBkLicences(ml);
  };
  // Ligne Veeam qui porte la licence : celle qui a déjà une date, sinon la première
  const bkLigneLicence = (hid) => { const l = bkLicences[hid] || []; return l.find(r => r.licence_fin) || l[0] || null; };
  const bkJoursRestants = (fin) => fin ? Math.round((new Date(fin + "T12:00:00") - new Date(new Date().toISOString().slice(0, 10) + "T12:00:00")) / 86400000) : null;
  const bkEnregLicence = async () => {
    const ed = bkLicEdit; if (!ed || !ed.hid) return;
    const fin = ed.fin || null, info = (ed.info || "").trim() || null;
    let ligne = bkLigneLicence(ed.hid);
    try {
      if (ligne) {
        const champs = { licence_info: info };
        if ((ligne.licence_fin || null) !== fin) { champs.licence_fin = fin; champs.licence_alertes_envoyees = []; }
        if (fin && ligne.licence_alerte == null) champs.licence_alerte = true;
        const { error } = await sb.from("inventaire_serveurs").update(champs).eq("id", ligne.id);
        if (error) throw error;
      } else {
        const hotel = hotels.find(h => String(h.id) === String(ed.hid));
        if (!confirm("Aucun serveur Veeam dans l'inventaire serveurs de « " + (hotel ? hotel.name : "cet hôtel") + " ».\n\nCréer une ligne « VEEAM » dans son inventaire pour y enregistrer la licence ?")) return;
        const { error } = await sb.from("inventaire_serveurs").insert({ hotel_id: ed.hid, ordre: 9990, nom: "VEEAM", type: "VM", role: "Sauvegarde Veeam", licence_fin: fin, licence_info: info, licence_alerte: !!fin, licence_alertes_envoyees: [] });
        if (error) throw error;
      }
      setBkLicEdit(null);
      await bkChargerLicences();
    } catch (e) {
      alert("Enregistrement impossible : " + (e.message || e) + (/licence_/i.test(String(e.message || "")) ? "\n\nLe script licence_veeam.sql a-t-il été exécuté ?" : ""));
    }
  };

  const loadBackups = async () => {
    setBkLoading(true);
    setBkNote("");
    try {
      // Mapping groupe → hôtel (facultatif ; ne bloque pas l'affichage si absent)
      try {
        const { data: maps } = await sb.from("checkcentral_group_map").select("group_id,hotel_id");
        try {
          const { data: fr } = await sb.from("backup_frequences").select("*");
          const mf = {};
          (fr || []).forEach(x => { mf[String(x.check_id)] = x; });
          setBkFreq(mf);
        } catch (e) { /* table absente : tout est quotidien */ }
        const m = {};
        (maps || []).forEach(x => { if (x.group_id) m[x.group_id] = x.hotel_id; });
        setBkGroupMap(m);
      } catch (e) { /* table peut ne pas exister encore */ }
      // Licences Veeam (portées par les lignes « Veeam » de l'inventaire serveurs)
      try { await bkChargerLicences(); } catch (e) { /* colonnes licence_* absentes : pas d'affichage */ }

      const { data: sessBk } = await sb.auth.getSession();
      const res = await fetch(CHECKCENTRAL_API_URL, { method: "GET", headers: { Authorization: "Bearer " + (sessBk.session?.access_token || "") } });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setBkNote("Erreur Worker CheckCentral (" + res.status + ")" + (t ? " — " + t.slice(0, 200) : "") + ".");
        setBkChecks([]);
        return;
      }
      const data = await res.json();
      if (data.error) { setBkNote("Erreur : " + data.error + (data.detail ? " — " + data.detail : "")); setBkChecks([]); return; }
      // Jobs Veeam retirés du suivi (veeam_jobs.actif = false) : masqués du portail (ce ne sont pas des sauvegardes)
      setBkChecks((data.checks || []).filter(c => !(c.origine === "veeam" && c.message === "Retiré du suivi")));
      setBkFetchedAt(data.fetchedAt || new Date().toISOString());
      if (Array.isArray(data.erreurs) && data.erreurs.length) setBkNote("⚠ Lecture partielle : " + data.erreurs.join(" ; "));
      loadBackupNotes(); // charge les notes d'explication en parallèle
      if ((data.checks || []).some(c => c.origine === "veeam")) {
        sb.rpc("veeam_historique", { p_n: 10 }).then(({ data: hist, error }) => {
          if (error) { console.warn("veeam_historique :", error.message); return; }
          const m = {}; (hist || []).forEach(x => { m[x.job_id] = x.runs || []; });
          setBkVeeamRuns(m);
        });
      }
      if ((data.checks || []).length === 0) setBkNote("Aucun check retourné par CheckCentral.");
    } catch (e) {
      setBkNote("Erreur : " + (e.message || e) + " (le Worker CheckCentral est-il déployé et l'URL correcte ?)");
      setBkChecks([]);
    } finally {
      setBkLoading(false);
    }
  };

  // ---------- Rapport Veeam détaillé (HTML d'origine du mail, stocké compressé) ----------
  const bkGunzip = async (b64) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  };
  const bkOuvrirRapport = async (runId, titre) => {
    if (!runId) return;
    setBkRapport({ titre, chargement: true });
    const { data, error } = await sb.from("veeam_runs").select("id,recu_le,statut,objet,duree,taille_backup,transfere,message,texte,html_gz").eq("id", runId).single();
    if (error) { setBkRapport({ titre, erreur: error.message }); return; }
    let html = null;
    if (data.html_gz) {
      try {
        const brut = await bkGunzip(data.html_gz);
        html = window.DOMPurify ? window.DOMPurify.sanitize(brut, { WHOLE_DOCUMENT: true, FORBID_TAGS: ["script", "iframe", "object", "embed", "form"] }) : null;
      } catch (e) { console.warn("Rapport illisible :", e); }
    }
    setBkRapport({ titre, run: data, html, texte: data.texte || "" });
  };
  const bkImprimerRapport = () => {
    const f = document.getElementById("bk-rapport-frame");
    if (f && f.contentWindow) { f.contentWindow.focus(); f.contentWindow.print(); }
  };
  const bkTelechargerRapport = () => {
    if (!bkRapport) return;
    const r = bkRapport.run || {};
    const contenu = bkRapport.html || ("<pre>" + String(bkRapport.texte || "").replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</pre>");
    const blob = new Blob([contenu], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const d = r.recu_le ? new Date(r.recu_le).toISOString().slice(0, 16).replace(/[:T]/g, "-") : "rapport";
    a.download = String(bkRapport.titre || "veeam").replace(/[^\w.-]+/g, "_") + "_" + d + ".html";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const bkRenderRapport = () => {
    const r = bkRapport; if (!r) return null;
    const run = r.run || {};
    const btn = { fontSize: 12, padding: "6px 12px", borderRadius: 7, border: "1px solid #DDE3EE", background: "white", color: "#334", cursor: "pointer", fontWeight: 600 };
    return React.createElement('div', { onClick: () => setBkRapport(null), style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 } },
      React.createElement('div', { onClick: e => e.stopPropagation(), style: { background: "white", borderRadius: 12, width: "min(980px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.3)" } },
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #EEE", flexWrap: "wrap" } },
          React.createElement('div', { style: { flex: 1, minWidth: 200 } },
            React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: "#222" } }, "📄 " + (r.titre || "Rapport Veeam")),
            run.recu_le && React.createElement('div', { style: { fontSize: 11.5, color: "#888", marginTop: 2 } },
              new Date(run.recu_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) + " · " + (run.statut === "Success" ? "OK" : run.statut === "Warning" ? "Avertissement" : "Échec") +
              (run.duree ? " · durée " + run.duree : "") + (run.taille_backup ? " · " + run.taille_backup : ""))),
          (r.html || r.texte) && React.createElement('button', { onClick: bkImprimerRapport, disabled: !r.html, title: r.html ? "Ouvre l'impression : choisissez « Enregistrer au format PDF »" : "Rapport d'origine non disponible pour cette exécution", style: { ...btn, opacity: r.html ? 1 : .5 } }, "🖨 PDF / Imprimer"),
          (r.html || r.texte) && React.createElement('button', { onClick: bkTelechargerRapport, style: btn }, "⬇ Télécharger"),
          React.createElement('button', { onClick: () => setBkRapport(null), style: { ...btn, border: "none", fontSize: 16 } }, "✕")),
        React.createElement('div', { style: { flex: 1, overflow: "auto", background: "#F7F7FA" } },
          r.chargement ? React.createElement('div', { style: { padding: 30, textAlign: "center", color: "#999" } }, "Chargement du rapport…")
          : r.erreur ? React.createElement('div', { style: { padding: 20, color: "#C53030" } }, "Rapport illisible : " + r.erreur)
          : r.html ? React.createElement('iframe', { id: "bk-rapport-frame", srcDoc: r.html, sandbox: "allow-same-origin allow-modals", title: "Rapport Veeam", style: { width: "100%", height: "72vh", border: "none", background: "white" } })
          : React.createElement('div', { style: { padding: 16 } },
              React.createElement('div', { style: { fontSize: 11.5, color: "#B7791F", marginBottom: 8 } }, "Rapport d'origine non conservé pour cette exécution (reçue avant la mise à jour ou plus de 60 jours) — contenu texte :"),
              React.createElement('pre', { style: { whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "Consolas, monospace", color: "#333", margin: 0 } }, r.texte || "—")))
      ));
  };
  // Frise des 10 dernières exécutions (vert OK / orange avertissement / rouge échec), cliquable
  const bkRenderFrise = (c) => {
    const jobId = String(c.id || "").replace(/^veeam:/, "");
    const runs = bkVeeamRuns[jobId] || [];
    if (!runs.length) return null;
    const coul = (st) => st === "Success" ? "#38A169" : st === "Warning" ? "#ECC94B" : "#E53E3E";
    return React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 1 } },
      runs.map(r => React.createElement('span', { key: r.id, onClick: () => bkOuvrirRapport(r.id, c.name),
        title: new Date(r.t).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) + " — " + (r.s === "Success" ? "OK" : r.s === "Warning" ? "Avertissement" : "Échec") + " (cliquer pour le rapport)",
        style: { width: 14, height: 14, borderRadius: "50%", background: coul(r.s), cursor: "pointer", display: "inline-block" } })),
      React.createElement('button', { onClick: () => bkOuvrirRapport(runs[runs.length - 1].id, c.name), title: "Rapport de la dernière exécution (PDF / impression)",
        style: { marginLeft: 6, fontSize: 13, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer" } }, "📄"));
  };

  // Historique 30 jours d'un job Veeam reçu en direct (table veeam_runs, lecture admin)
  const bkToggleHistVeeam = async (c) => {
    const jobId = String(c.id || "").replace(/^veeam:/, "");
    if (!jobId) return;
    if (bkVeeamHist[jobId]) { setBkVeeamHist(prev => { const m = { ...prev }; delete m[jobId]; return m; }); return; }
    setBkVeeamHist(prev => ({ ...prev, [jobId]: "loading" }));
    const depuis = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await sb.from("veeam_runs").select("id,recu_le,statut,duree,taille_backup,transfere,message")
      .eq("job_id", jobId).gte("recu_le", depuis).order("recu_le", { ascending: false }).limit(300);
    setBkVeeamHist(prev => ({ ...prev, [jobId]: error ? { erreur: error.message + (/policy|permission/i.test(error.message) ? " — le script veeam_portail.sql a-t-il été exécuté ?" : "") } : (data || []) }));
  };
  const bkRenderHistVeeam = (c) => {
    const jobId = String(c.id || "").replace(/^veeam:/, "");
    const h = bkVeeamHist[jobId];
    if (!h) return null;
    if (h === "loading") return React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 6 } }, "Chargement de l'historique…");
    if (h.erreur) return React.createElement('div', { style: { fontSize: 11, color: "#C53030", marginTop: 6 } }, "Historique illisible : " + h.erreur);
    const jourFr = (d) => d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" });
    const rangSt = (st) => st === "Failure" ? 0 : st === "Warning" ? 1 : 2;
    const parJour = {};
    h.forEach(r => { const k = jourFr(new Date(r.recu_le)); if (!(k in parJour) || rangSt(r.statut) < rangSt(parJour[k])) parJour[k] = r.statut; });
    const cases = [];
    for (let i = 29; i >= 0; i--) { const k = jourFr(new Date(Date.now() - i * 86400000)); cases.push({ k, st: parJour[k] || null }); }
    const coul = (st) => st === "Success" ? "#38A169" : st === "Warning" ? "#DD6B20" : st === "Failure" ? "#E53E3E" : "#E2E2EA";
    return React.createElement('div', { style: { marginTop: 8, padding: "8px 10px", background: "#FAFAFC", border: "1px solid #EEEEF4", borderRadius: 8 } },
      React.createElement('div', { style: { display: "flex", gap: 2 } },
        cases.map(x => React.createElement('div', { key: x.k, title: x.k + " — " + (x.st === "Success" ? "OK" : x.st === "Warning" ? "Avertissement" : x.st === "Failure" ? "Échec" : "aucun mail reçu"),
          style: { flex: 1, height: 16, borderRadius: 3, background: coul(x.st), minWidth: 4 } }))),
      React.createElement('div', { style: { display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#AAA", marginTop: 3 } },
        React.createElement('span', null, cases[0].k), React.createElement('span', null, "30 derniers jours (gris = aucun mail)"), React.createElement('span', null, cases[29].k)),
      h.length === 0
        ? React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 6 } }, "Aucune exécution reçue sur 30 jours.")
        : React.createElement('div', { style: { marginTop: 6 } }, h.slice(0, 6).map((r, i) =>
            React.createElement('div', { key: i, onClick: () => bkOuvrirRapport(r.id, c.name), title: "Voir le rapport de cette exécution", style: { fontSize: 11, color: "#555", display: "flex", gap: 8, padding: "2px 0", flexWrap: "wrap", cursor: "pointer" } },
              React.createElement('span', { style: { color: coul(r.statut), fontWeight: 700, minWidth: 14 } }, r.statut === "Success" ? "✓" : r.statut === "Warning" ? "!" : "✖"),
              React.createElement('span', { style: { minWidth: 110 } }, new Date(r.recu_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })),
              r.duree && React.createElement('span', null, "⏱ " + r.duree),
              r.taille_backup && React.createElement('span', null, "💾 " + r.taille_backup),
              r.transfere && React.createElement('span', { style: { color: "#999" } }, "transféré " + r.transfere),
              r.message && r.statut !== "Success" && React.createElement('span', { style: { color: "#C53030", flexBasis: "100%", paddingLeft: 22 } }, r.message))))
    );
  };

  // Statut → couleur/priorité. Failure=rouge, Warning=orange, Success=vert,
  // le reste (Paused/Resumed/Override...) = gris neutre (états volontaires).
  const bkStatusMeta = (statut) => {
    const s = (statut || "").toLowerCase();
    if (s === "failure") return { color: "#E53E3E", bg: "#FDECEC", label: "Échec", rank: 0 };
    if (s === "warning") return { color: "#DD6B20", bg: "#FEF0E4", label: "Avertissement", rank: 1 };
    if (s === "success") return { color: "#2F855A", bg: "#E9F6EE", label: "OK", rank: 3 };
    if (s === "paused") return { color: "#718096", bg: "#F0F0F4", label: "En pause", rank: 2 };
    if (s === "pending") return { color: "#718096", bg: "#F0F0F4", label: "En attente", rank: 2 };
    return { color: "#718096", bg: "#F0F0F4", label: statut || "—", rank: 2 };
  };
  // Fréquences possibles (heures). Mensuelle = 31 jours.
  const BK_FREQS = [{ h: 24, l: "Quotidienne" }, { h: 168, l: "Hebdomadaire" }, { h: 336, l: "Toutes les 2 semaines" }, { h: 744, l: "Mensuelle" }];
  const BK_MARGE_H = 48;
  const bkLibFreq = (h) => { const f = BK_FREQS.find(x => x.h === h); return f ? f.l : ("Toutes les " + h + " h"); };
  // Renvoie la fin de la fenêtre (ISO) si le défaut est « normal » pour une sauvegarde non quotidienne, sinon null.
  const bkMasquee = (c, fForce) => {
    const f = fForce !== undefined ? fForce : (c && c.id != null ? bkFreq[String(c.id)] : null);
    if (!c || !f || !(f.frequence_heures > 24)) return null;
    const st = String(c.status || "").toLowerCase();
    if (st !== "failure" && st !== "warning") return null;
    if (String(c.source || "").toLowerCase() === "message") return null; // vrai échec remonté par le job
    const ref = new Date(f.derniere_reussite || f.created_at).getTime();
    if (isNaN(ref)) return null;
    const lim = ref + (f.frequence_heures + BK_MARGE_H) * 3600000;
    return Date.now() < lim ? new Date(lim).toISOString() : null;
  };
  const bkMetaCheck = (c) => {
    const fin = bkMasquee(c);
    if (fin) return { color: "#2F855A", bg: "#E9F6EE", label: "OK · " + bkLibFreq(bkFreq[String(c.id)].frequence_heures).toLowerCase(), rank: 3, masquee: fin };
    return bkStatusMeta(c.status);
  };

  const fmtDateHeureFr2 = (iso) => { try { return iso ? new Date(iso).toLocaleString("fr-FR") : "—"; } catch (e) { return "—"; } };

  // Sous-onglet de la page Sauvegardes : ne filtre que sur cette page (le tableau de bord garde le total)
  const bkChecksVue = (page === "backups" && (bkVue === "checkcentral" || bkVue === "veeam"))
    ? (bkChecks || []).filter(c => bkVue === "veeam" ? c.origine === "veeam" : c.origine !== "veeam")
    : (bkChecks || []);

  // Regroupe les checks par groupe et calcule le pire statut du groupe.
  const bkGroupes = (() => {
    const map = {};
    bkChecksVue.forEach(c => {
      const veeam = c.origine === "veeam";
      const key = veeam ? "veeam:" + (c.hotel_id || c.group || "") : (c.group_id || c.group || "(sans groupe)");
      if (!map[key]) map[key] = { key, group_id: veeam ? null : c.group_id, hotel_id: veeam ? (c.hotel_id || null) : null, origine: veeam ? "veeam" : "checkcentral", group: c.group || "(sans groupe)", checks: [] };
      map[key].checks.push(c);
    });
    const arr = Object.values(map).map(g => {
      // pire rang = statut le plus grave (rank 0 = échec)
      let pire = 3;
      g.checks.forEach(c => { pire = Math.min(pire, bkMetaCheck(c).rank); });
      g.pireRank = pire;
      g.nbEchec = g.checks.filter(c => bkMetaCheck(c).rank === 0).length;
      g.nbWarn = g.checks.filter(c => bkMetaCheck(c).rank === 1).length;
      g.nbOk = g.checks.filter(c => bkMetaCheck(c).rank === 3).length;
      // tri interne des checks par gravité puis nom
      g.checks.sort((a, b) => {
        const ra = bkMetaCheck(a).rank, rb = bkMetaCheck(b).rank;
        return ra !== rb ? ra - rb : String(a.name).localeCompare(String(b.name));
      });
      return g;
    });
    // groupes triés : ceux avec échec d'abord, puis warning, puis le reste
    arr.sort((a, b) => a.pireRank - b.pireRank || String(a.group).localeCompare(String(b.group)));
    return arr;
  })();

  // ---------- Comparaison CheckCentral (ancien) / Veeam direct (nouveau), par hôtel ----------
  const bkNormJob = (n) => String(n || "").toLowerCase().replace(/^dsihotel\+/, "").replace(/@.*$/, "").replace(/[^a-z0-9]/g, "");
  const bkSimilarite = (a, b) => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a))) return 0.9;
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return 1 - prev[n] / Math.max(m, n);
  };
  const bkComparaison = (() => {
    if (page !== "backups" || bkVue !== "comparaison") return [];
    const parHotel = {};
    const cle = (hid, nomGroupe) => hid ? "h:" + hid : "g:" + (nomGroupe || "(sans groupe)");
    (bkChecks || []).forEach(c => {
      const veeam = c.origine === "veeam";
      const hid = veeam ? c.hotel_id : (c.group_id && bkGroupMap[c.group_id]);
      const k = cle(hid, veeam ? c.group : c.group);
      if (!parHotel[k]) {
        const h = hid && hotels.find(x => String(x.id) === String(hid));
        parHotel[k] = { k, nom: h ? h.name : (c.group || "(sans groupe)"), cc: [], vd: [] };
      }
      (veeam ? parHotel[k].vd : parHotel[k].cc).push(c);
    });
    return Object.values(parHotel).map(h => {
      // Appariement glouton par similarité de nom (seuil 0,75)
      const cand = [];
      h.cc.forEach((a, i) => h.vd.forEach((b, j) => {
        const sc = bkSimilarite(bkNormJob(a.name), bkNormJob(b.name));
        if (sc >= 0.75) cand.push({ i, j, sc });
      }));
      cand.sort((x, y) => y.sc - x.sc);
      const pi = new Set(), pj = new Set(), paires = [];
      cand.forEach(x => { if (!pi.has(x.i) && !pj.has(x.j)) { pi.add(x.i); pj.add(x.j); paires.push({ cc: h.cc[x.i], vd: h.vd[x.j] }); } });
      const ccSeuls = h.cc.filter((_, i) => !pi.has(i));
      const vdSeuls = h.vd.filter((_, j) => !pj.has(j));
      const ecarts = paires.filter(p => (bkMetaCheck(p.cc).rank === 0) !== (bkMetaCheck(p.vd).rank === 0));
      let etat;
      if (!h.vd.length) etat = { r: 0, l: "Non migré", c: "#718096", bg: "#F0F0F4" };
      else if (!h.cc.length) etat = { r: 3, l: "Veeam seulement", c: "#2B6CB0", bg: "#EBF8FF" };
      else if (ccSeuls.length || ecarts.length) etat = { r: 1, l: (ccSeuls.length ? ccSeuls.length + " manquant(s)" : "") + (ccSeuls.length && ecarts.length ? " · " : "") + (ecarts.length ? ecarts.length + " écart(s) de statut" : ""), c: "#C05621", bg: "#FEF0E4" };
      else etat = { r: 2, l: "Complet", c: "#2F855A", bg: "#E9F6EE" };
      return { ...h, paires, ccSeuls, vdSeuls, ecarts, etat };
    }).sort((a, b) => a.etat.r - b.etat.r || a.nom.localeCompare(b.nom));
  })();

  const bkStats = (() => {
    let echec = 0, warn = 0, ok = 0, autre = 0;
    bkChecksVue.forEach(c => {
      const r = bkMetaCheck(c).rank;
      if (r === 0) echec++; else if (r === 1) warn++; else if (r === 3) ok++; else autre++;
    });
    const groupesEnEchec = bkGroupes.filter(g => g.pireRank === 0).length;
    return { total: bkChecksVue.length, echec, warn, ok, autre, groupesEnEchec, nbGroupes: bkGroupes.length };
  })();

  // Backups « obsolètes » : checks dont la dernière exécution (updatedIso)
  // remonte à plus de 7 jours — le backup n'a plus rien remonté depuis une semaine.
  const BK_SEUIL_JOURS = 7;
  const BK_FILTRES = [{ r: 3, l: "OK", c: "#22A45D" }, { r: 1, l: "Avertissement", c: "#F2B705" }, { r: 0, l: "Échec", c: "#E53E3E" }, { r: 2, l: "En pause / attente", c: "#A0AEC0" }];
  const bkAncienChecks = (() => {
    const now = Date.now();
    const limite = BK_SEUIL_JOURS * 24 * 60 * 60 * 1000;
    const arr = [];
    bkChecksVue.forEach(c => {
      if (!c.updatedIso) return;
      const t = new Date(c.updatedIso).getTime();
      if (isNaN(t)) return;
      const ageMs = now - t;
      const fq = c.id != null ? bkFreq[String(c.id)] : null;
      if (c.origine === "veeam" && (c.desactiveVeeam || c.planifie === false || String(c.status || "").toLowerCase() === "paused")) return;
      let limiteC = fq && fq.frequence_heures > 24 ? Math.max(limite, (fq.frequence_heures + BK_MARGE_H) * 3600000) : limite;
      if (c.origine === "veeam" && c.intervalleH) limiteC = Math.max(limite, (c.intervalleH + 12) * 3600000);
      if (ageMs > limiteC) {
        // Un muet est « justifié » s'il porte une note d'explication non vide.
        const justifie = !!(c.id && bkNotes[c.id] && String(bkNotes[c.id].note || "").trim());
        arr.push({ ...c, ageJours: Math.floor(ageMs / (24 * 60 * 60 * 1000)), justifie });
      }
    });
    // Non justifiés d'abord (à traiter), puis les justifiés ; à statut égal, le plus ancien en tête.
    arr.sort((a, b) => (a.justifie === b.justifie ? b.ageJours - a.ageJours : (a.justifie ? 1 : -1)));
    return arr;
  })();

  // Nombre de muets NON justifiés (sert au compteur du bandeau d'alerte).
  const bkMuetsNonJustifies = (bkAncienChecks || []).filter(c => !c.justifie).length;



  useEffect(() => {
    if (page === "tickets-admin" || page === "tickets-client" || page === "rapport-jour" || page === "accueil") loadTickets();
  }, [page, profile]);

  // Dès que l'admin saisit un terme de recherche, charge (une seule fois) le
  // corps des messages pour permettre la recherche plein texte.
  useEffect(() => {
    if (isAdmin && page === "tickets-admin" && ticketSearch.trim() && !ticketBodiesLoaded) {
      loadTicketBodies();
    }
  }, [ticketSearch, isAdmin, page, ticketBodiesLoaded]);

  useEffect(() => {
    if (page === "admins" && isSuperAdmin) loadAdmins();
    if (page === "login-logs" && isSuperAdmin) loadLoginLogs();
    if (page === "securite" && (isAdmin || isSupervisor)) loadSecFactors();
    if ((page === "ninjaone" || page === "rapport-securite") && profile) loadNjRapports();
    if (page === "rapport-intervention" && isSupervisor) loadRapportsClient();
    if (page === "rapport-tickets" && isSupervisor && myHotelId) genererRapportTickets(myHotelId);
  }, [page, profile]);

  // Rapports NinjaOne : lecture directe (RLS autorise admin=tout, superviseur=son hôtel).
  const loadNjRapports = async () => {
    setNjLoading(true);
    try {
      const { data, error } = await sb.from("ninjaone_rapports")
        .select("*")
        .order("received_at", { ascending: false });
      if (error) throw error;
      setNjRapports(data || []);
    } catch (e) {
      setNjRapports([]);
    } finally {
      setNjLoading(false);
    }
  };

  // Rattachement manuel d'un rapport à un hôtel (via Worker, car RLS bloque
  // l'UPDATE direct). Recharge la liste après succès.
  const rattacherRapport = async (rapportId, hotelId) => {
    try {
      await callAdminApi("/admin/rattacher-rapport", { rapportId, hotelId });
      await loadNjRapports();
    } catch (e) {
      alert("Erreur lors du rattachement : " + (e && e.message ? e.message : ""));
    }
  };

  const supprimerRapport = async (rapport) => {
    if (!confirm("Supprimer définitivement ce rapport ?\n\n" + (rapport.titre || rapport.file_name || "") + "\n\nLe fichier PDF sera aussi supprimé.")) return;
    try {
      await callAdminApi("/admin/supprimer-rapport", { rapportId: rapport.id });
      await loadNjRapports();
    } catch (e) {
      alert("Erreur lors de la suppression : " + (e && e.message ? e.message : ""));
    }
  };

  const loadLoginLogs = async (filtre) => {
    if (!isSuperAdmin) return;
    setLoginLogsLoading(true);
    try {
      const data = await callAdminApi("/admin/login-logs", { limit: 300, email: (filtre !== undefined ? filtre : loginLogFilter) || "" });
      setLoginLogs((data && data.logs) ? data.logs : []);
    } catch (e) {
      setLoginLogs([]);
    } finally {
      setLoginLogsLoading(false);
    }
  };

  const loadTicketMsgs = (ticketId) => {
    sb.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at")
      .then(({ data, error }) => {
        if (!error) setTicketMsgs(prev => ({ ...prev, [ticketId]: data || [] }));
      });
  };

  // --- Aperçu au survol : dernière réponse du CLIENT dans un ticket ---
  // On charge les messages du ticket à la demande (requête légère filtrée sur un
  // seul ticket_id — pas le gros .in() qui peut expirer), après un court délai
  // pour ne rien charger si la souris ne fait que passer. Mise en cache ensuite.
  const hoverTimer = useRef(null);
  const onRowEnter = (t, e) => {
    const x = e.clientX, y = e.clientY;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      if (!ticketMsgs[t.id]) loadTicketMsgs(t.id);
      setHoverTk({ id: t.id, x, y });
    }, 350);
  };
  const onRowMove = (e) => {
    setHoverTk(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
  };
  const onRowLeave = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    setHoverTk(null);
  };
  // Renvoie le dernier message dont l'auteur est le client, ou null.
  const derniereReponseClient = (ticketId) => {
    const msgs = ticketMsgs[ticketId];
    if (!msgs) return undefined; // undefined = pas encore chargé
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender_role === "client") return msgs[i];
    }
    return null; // chargé mais aucun message client
  };

  // Dernier message du fil, quel que soit l'expéditeur (client OU nous).
  const dernierMessageTicket = (ticketId) => {
    const msgs = ticketMsgs[ticketId];
    if (!msgs) return undefined; // pas encore chargé
    return msgs.length ? msgs[msgs.length - 1] : null;
  };

  const loadTicketFiles = (ticketId) => {
    sb.from("ticket_fichiers").select("*").eq("ticket_id", ticketId).order("created_at")
      .then(({ data, error }) => {
        if (!error) setTicketFiles(prev => ({ ...prev, [ticketId]: data || [] }));
      });
  };

  // Extrait les CC accumulés d'un fil de messages, dédupliqués,
  // en excluant le contact principal et nos adresses internes.
  const extraireCcDuFil = (msgs, ticket) => {
    const ccSet = new Set();
    (msgs || []).forEach(mm => {
      if (mm.cc) String(mm.cc).split(/[,;]/).forEach(a => {
        const adr = a.trim().replace(/^.*<|>.*$/g, "").toLowerCase();
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adr)) ccSet.add(adr);
      });
    });
    [ticket && ticket.contact_email, SUPPORT_EMAIL, "team@dsihotel.fr", "support@dsihotel.com"]
      .forEach(a => a && ccSet.delete(String(a).toLowerCase()));
    return Array.from(ccSet);
  };

  // Toutes les adresses connues (pour l'autocomplétion du champ Cc) :
  //  - les emails de contact de tous les tickets en mémoire,
  //  - toutes les adresses déjà mises en copie dans les messages chargés.
  // Nos adresses internes sont exclues. Résultat trié, dédupliqué.
  const adressesConnues = () => {
    const set = new Set();
    const ajoute = (raw) => {
      if (!raw) return;
      String(raw).split(/[,;]/).forEach(a => {
        const adr = a.trim().replace(/^.*<|>.*$/g, "").toLowerCase();
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adr)) set.add(adr);
      });
    };
    (tickets || []).forEach(t => ajoute(t.contact_email));
    Object.values(ticketMsgs || {}).forEach(msgs => (msgs || []).forEach(m => ajoute(m.cc)));
    ["support@dsihotel.com", "team@dsihotel.fr", SUPPORT_EMAIL].forEach(a => set.delete(String(a).toLowerCase()));
    return Array.from(set).sort();
  };

  const toggleTicket = (id) => {
    if (openTicketId === id) { setOpenTicketId(null); return; }
    setOpenTicketId(id);
    setReplyText("");
    setReplyHtml("");
    setReplyNote("");
    setReplyFiles([]);
    setReplyImageUrls([]);
    setReplyHtmlOverride(null);
    setReplyCcManual("");
    loadTicketMsgs(id);
    loadTicketFiles(id);
    // Préremplit immédiatement depuis le cache (rafraîchi ensuite par l'effet ci-dessous)
    const t = tickets.find(x => x.id === id);
    setReplyCcList(extraireCcDuFil(ticketMsgs[id] || [], t));
  };

  // Quand les messages d'un ticket ouvert arrivent (chargement async), on précoche
  // les CC détectés dans le fil. À la 1re détection on coche tout ; ensuite on
  // n'ajoute que les nouvelles adresses, sans réécraser un décochage manuel.
  useEffect(() => {
    if (!openTicketId) return;
    const t = tickets.find(x => x.id === openTicketId);
    const detectees = extraireCcDuFil(ticketMsgs[openTicketId] || [], t);
    if (detectees.length === 0) return;
    setReplyCcList(prev => {
      if (prev.length === 0) return detectees;
      const s = new Set(prev);
      detectees.forEach(a => s.add(a));
      return Array.from(s);
    });
  }, [ticketMsgs, openTicketId]);

  // ---------- TICKETS : CHANGER LE STATUT ----------
  const setTicketStatus = async (ticket, newStatus) => {
    const fermeLe = newStatus === "closed" ? new Date().toISOString() : null;
    const { error } = await sb.from("tickets").update({ status: newStatus, closed_at: fermeLe }).eq("id", ticket.id);
    if (!error) setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus, closed_at: fermeLe } : t));
  };

  const adminFromName = () => {
    const n = (profile && profile.full_name ? String(profile.full_name).trim() : "");
    if (n) return n;
    const mail = (profile && profile.email ? String(profile.email).trim() : "");
    return mail || "Support DSI Hotel";
  };

  // Libellé expéditeur d'une réponse de TICKET : nom du demandeur (contact qui a
  // ouvert le ticket), afin qu'il apparaisse dans le fil côté boîte support.
  // Repli sur le nom de l'admin si le contact est absent. Nettoie les caractères
  // qui casseraient l'en-tête From.
  const demandeurFromName = (t) => {
    const n = (t && t.contact_name ? String(t.contact_name).replace(/["<>\r\n]/g, "").trim() : "");
    return n || adminFromName();
  };

  // Nettoie l'affichage des messages/signatures reçus par email :
  // - retire les "<mailto:xxx>" collés après une adresse déjà visible
  // - retire les "<https://…>" / "<http://…>" en doublon après un libellé
  // - dégrade proprement une URL isolée entre chevrons en URL simple
  // N'altère pas les données : nettoyage uniquement à l'affichage.
  // Nettoie une adresse des préfixes techniques (BATV prvs=, btv1=, SRS, bounces...).
  // Extrait la vraie adresse email. Purement défensif : si rien à nettoyer, renvoie tel quel.
  const nettoyerEmail = (adresse) => {
    if (!adresse) return adresse;
    let a = String(adresse).trim();
    const chev = a.match(/<([^>]+)>/);
    if (chev) a = chev[1].trim();
    a = a.toLowerCase();
    if (/^(prvs|btv1?|msprvs1|bv1)=/.test(a) || /=[^@=]+@[^@=]+\.[^@=]+$/.test(a)) {
      const m = a.match(/([^=\s<>]+@[^=\s<>]+\.[^=\s<>]+)\s*$/);
      if (m) return m[1];
    }
    const bounce = a.match(/^bounce[s]?[+\-][^=]*=([^@\s]+@[^@\s]+\.[^@\s]+)$/);
    if (bounce) return bounce[1];
    return a;
  };

  // Convertit les balises de réaction Outlook/Teams en emojis lisibles.
  // Ex. : "[like] Marco reacted to your message:" -> "👍 Marco reacted…".
  // Outlook envoie ces réactions sous forme de texte entre crochets.
  const REACTIONS_EMOJI = {
    like: "👍", heart: "❤️", love: "❤️", laugh: "😂", smile: "😊",
    surprised: "😮", surprise: "😮", wow: "😮", sad: "😢", cry: "😢",
    angry: "😠", mad: "😠", thumbsup: "👍", thumbsdown: "👎",
    dislike: "👎", checkmark: "✅", check: "✅", question: "❓",
    fire: "🔥", clap: "👏", "100": "💯", celebrate: "🎉", party: "🎉"
  };
  const convertirReactions = (texte) => {
    if (!texte) return texte;
    return String(texte).replace(/\[([a-z0-9]+)\]/gi, (m, mot) => {
      const e = REACTIONS_EMOJI[mot.toLowerCase()];
      return e ? e : m; // on ne touche qu'aux balises reconnues
    });
  };

  const nettoyerSignature = (texte) => {
    if (!texte) return texte;
    let t = String(texte);
    // Réactions Outlook ([like], [heart]…) -> emoji
    t = convertirReactions(t);
    // email<mailto:email>  ->  email   (garde l'adresse déjà affichée)
    t = t.replace(/\s*<mailto:[^>]+>/gi, "");
    // "Libellé<https://url>" collé  ->  "Libellé"  (le libellé suffit)
    t = t.replace(/(\S)<https?:\/\/[^>]+>/gi, "$1");
    // "<https://url>" isolé entre chevrons  ->  "https://url"
    t = t.replace(/<(https?:\/\/[^>]+)>/gi, "$1");
    return t;
  };

  // Le message initial du client est affiché via le bloc "DEMANDE INITIALE"
  // (colonne ticket.message). La première ligne de ticket_messages est ce même
  // message : on la retire du fil pour éviter le doublon.
  const msgsSansDoublon = (msgs, t) => {
    if (!msgs || msgs.length === 0) return [];
    // Un message porteur d'images inline (capture d'écran dans le body_html)
    // ne doit JAMAIS être masqué comme doublon : sinon la capture disparaît.
    const porteImage = (m) => m && m.body_html && /<img\b/i.test(m.body_html);
    const initial = (t && t.message ? String(t.message) : "");
    if (!initial.trim()) return msgs;
    const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
    const ni = norm(initial);
    const idx = msgs.findIndex(m => {
      if (m.sender_role !== "client") return false;
      if (porteImage(m)) return false; // on garde les messages avec capture
      const nb = norm(m.body);
      if (!nb) return false;
      if (nb === ni) return true;
      const court = Math.min(nb.length, ni.length);
      if (court >= 40 && (nb.startsWith(ni.slice(0, court)) || ni.startsWith(nb.slice(0, court)))) return true;
      return false;
    });
    if (idx === -1) {
      // Repli : si le tout premier message est du client SANS image, c'est la
      // demande initiale ré-affichée -> on le retire. Avec image, on le garde.
      if (msgs[0] && msgs[0].sender_role === "client" && !porteImage(msgs[0])) return msgs.slice(1);
      return msgs;
    }
    return msgs.filter((_, i) => i !== idx);
  };

  // ---------- TICKETS : RÉPONDRE (enregistré + envoyé par email) ----------
  // Transfert ("Faire suivre") : envoie le fil complet du ticket à une adresse
  // externe, via le Worker /send. N'écrit rien dans le ticket (simple envoi).
  const transfererTicket = async (ticket) => {
    const dest = (fwdEmail || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) {
      setFwdMsg("Adresse email invalide.");
      return;
    }
    setFwdBusy(true);
    setFwdMsg("");
    try {
      const priorMsgs = [...(ticketMsgs[ticket.id] || [])];
      const initialMsg = ticket.message
        ? [{ sender_role: "client", sender_name: ticket.contact_name || "Client", body: ticket.message, created_at: ticket.created_at }]
        : [];
      const fil = buildHistory([...initialMsg, ...priorMsgs]);
      const note = (fwdNote || "").trim();
      const ref = ticket.reference ? ("[" + ticket.reference + "] ") : "";
      const sujet = "TR: " + ref + (ticket.subject || "Demande de support");

      const introTxt = note ? (note + "\n\n") : "";
      const enTete = "Bonjour,\n\nVeuillez trouver ci-dessous le suivi de la demande "
        + (ticket.reference ? (ticket.reference + " ") : "")
        + "concernant " + (ticket.contact_name || "un client") + " (" + (ticket.contact_email || "-") + ").\n";
      const text = introTxt + enTete + fil.text + "\n\n— Transféré depuis le portail DSI Hotel";
      const introHtml = note ? ("<p style=\"font-size:14px;color:#333;\">" + textToHtml(note) + "</p>") : "";
      const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6;">'
        + introHtml
        + '<p style="font-size:14px;color:#333;">Bonjour,<br>Veuillez trouver ci-dessous le suivi de la demande '
        + (ticket.reference ? (escapeHtml(ticket.reference) + " ") : "")
        + "concernant <strong>" + escapeHtml(ticket.contact_name || "un client") + "</strong> (" + escapeHtml(ticket.contact_email || "-") + ").</p>"
        + fil.html
        + '<p style="font-size:12px;color:#999;margin-top:18px;">Transféré depuis le portail DSI Hotel.</p>'
        + "</div>";

      const res = await fetchEmailApi({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: dest, subject: sujet, text, html, replyTo: SUPPORT_EMAIL, fromName: adminFromName() }),
      });
      if (!res.ok) {
        const d = await res.text().catch(() => "");
        setFwdMsg("Échec de l'envoi. " + (d ? d.slice(0, 150) : ""));
        setFwdBusy(false);
        return;
      }
      setFwdMsg("✓ Transfert envoyé à " + dest);
      setTimeout(() => { setFwdTicket(null); setFwdEmail(""); setFwdNote(""); setFwdMsg(""); }, 1400);
    } catch (e) {
      setFwdMsg("Erreur : " + (e && e.message ? e.message : "envoi impossible"));
    } finally {
      setFwdBusy(false);
    }
  };

  const sendReply = async (ticket) => {
    const richHasContent = /<img\b/i.test(replyHtml || "") || (replyHtml || "").replace(/<[^>]+>|&nbsp;|\s/gi, "").length > 0;
    if (!replyText.trim() && !richHasContent && !(replyImageUrls || []).length) return;
    setReplyBusy(true);
    setReplyNote("");
    const body = stripSignature(replyText).trim();
    if (!body && !richHasContent && !(replyImageUrls || []).length) { setReplyBusy(false); return; }
    const senderName = isAdmin ? "Support DSI Hotel" : (client ? client.name : "Client");
    const senderRole = isAdmin ? "admin" : "client";

    // Historique = demande initiale + tous les messages déjà présents (avant cette réponse),
    // dans l'ordre chronologique, placé sous la signature dans l'email.
    const priorMsgs = [...(ticketMsgs[ticket.id] || [])];
    const initialMsg = ticket.message
      ? [{ sender_role: "client", sender_name: ticket.contact_name || "Client", body: ticket.message, created_at: ticket.created_at }]
      : [];
    const historyForEmail = buildHistory([...initialMsg, ...priorMsgs]);

    // 1) Enregistrer le message dans le fil (toujours).
    //    Le HTML affiché dans le fil est reconstruit à partir du texte tapé + des
    //    VRAIES images (URLs Supabase dans replyImageUrls). On n'utilise jamais tel
    //    quel un HTML de réponse type qui contiendrait des références "cid:" (images
    //    d'email non affichables par un navigateur) : on les remplace par les URLs
    //    réelles, sinon on les retire. Résultat : le fil montre les mêmes images que
    //    le client, sans image cassée.
    let msgHtml = null;
    const imgsReponse = (replyImageUrls || []).filter(u => typeof u === "string" && /^https?:\/\//.test(u));
    if (replyHtmlOverride && replyHtmlOverride.html) {
      let h = replyHtmlOverride.html;
      // Remplace chaque <img src="cid:..."> par la vraie image Supabase (dans l'ordre)
      let i = 0;
      h = h.replace(/<img[^>]*\ssrc=["']cid:[^"']*["'][^>]*>/gi, () => {
        const u = imgsReponse[i++];
        return u ? '<img src="' + u + '" style="max-width:100%;height:auto;border-radius:4px;margin:6px 0;display:block;" />' : "";
      });
      // Filet de sécurité : supprime tout <img cid:...> résiduel non apparié
      h = h.replace(/<img[^>]*\ssrc=["']cid:[^"']*["'][^>]*>/gi, "");
      msgHtml = h;
    } else if (richHasContent) {
      // Éditeur riche : le HTML contient déjà le texte ET les images en ligne (au curseur).
      const safe = (typeof sanitizeRichHtml === "function") ? sanitizeRichHtml(replyHtml) : replyHtml;
      msgHtml = '<div style="font-size:13px;color:#333;line-height:1.6;">' + safe + '</div>';
    } else if (imgsReponse.length > 0) {
      const imgsHtml = imgsReponse
        .map(u => '<img src="' + u + '" style="max-width:100%;height:auto;border-radius:4px;margin:6px 0;display:block;" />')
        .join("");
      msgHtml = '<div style="font-size:13px;color:#333;line-height:1.6;">' + textToHtml(body) + '<div style="margin-top:8px;">' + imgsHtml + '</div></div>';
    }
    // Destinataire principal de notre réponse = le contact du ticket (à défaut,
    // l'email du compte hôtel). Enregistré pour l'afficher dans le fil ("À : …").
    const destPrincipal = (() => {
      const th = hotels.find(h => h.id === ticket.hotel_id);
      const d = nettoyerEmail(ticket.contact_email || (th && th.account_email) || "").trim();
      return d || null;
    })();
    const ccPourMessage = (isAdmin && (replyCcList || []).length) ? replyCcList.join(", ") : null;
    const { data: inserted, error: insErr } = await sb.from("ticket_messages")
      .insert({ ticket_id: ticket.id, sender_role: senderRole, sender_name: senderName, body, body_html: msgHtml, destinataires: destPrincipal, cc: ccPourMessage })
      .select().single();

    if (insErr) {
      setReplyNote("Erreur : impossible d'enregistrer la réponse (" + insErr.message + ").");
      setReplyBusy(false);
      return;
    }
    setTicketMsgs(prev => ({ ...prev, [ticket.id]: [...(prev[ticket.id] || []), inserted] }));
    setReplyText("");
    setReplyHtml("");
    setReplyHtmlOverride(null);
    // Le support vient de répondre : l'état "nouveau/réponse" est levé pour ce ticket
    if (isAdmin) setTicketState(prev => ({ ...prev, [ticket.id]: { kind: null, since: null } }));

    // 2) Archiver les pièces jointes de la réponse dans le portail
    const filesToSend = replyFiles;
    const imageUrlsToSend = replyImageUrls;
    if (filesToSend.length > 0) {
      await uploadTicketFiles(filesToSend, ticket.id, inserted.id, senderRole);
      loadTicketFiles(ticket.id);
      setReplyFiles([]);
    }
    // Images issues d'une réponse type (déjà uploadées) : on crée les lignes ticket_fichiers
    if (imageUrlsToSend.length > 0) {
      for (const url of imageUrlsToSend) {
        try {
          const nom = decodeURIComponent((url.split("/").pop() || "image").split("?")[0]);
          await sb.from("ticket_fichiers").insert({
            ticket_id: ticket.id, message_id: inserted.id,
            file_name: nom, file_url: url, uploaded_by: senderRole
          });
        } catch (e) {}
      }
      loadTicketFiles(ticket.id);
      setReplyImageUrls([]);
    }

    // 3) Envoyer par email — uniquement l'admin notifie le client.
    // Destinataire : l'email du contact du ticket ; à défaut (anciens tickets créés
    // sans email), on retombe sur l'email du compte de l'hôtel rattaché.
    const ticketHotel = hotels.find(h => h.id === ticket.hotel_id);
    const destClient = nettoyerEmail(ticket.contact_email || (ticketHotel && ticketHotel.account_email) || "").trim();
    if (isAdmin && destClient) {
      try {
        // Adresses en copie = celles cochées dans l'UI (détectées du fil + ajouts
        // manuels). On revalide et on ré-exclut le contact principal / nos adresses
        // par sécurité, au cas où l'une aurait été saisie à la main.
        const ccSet = new Set();
        (replyCcList || []).forEach(a => {
          const adr = String(a).trim().replace(/^.*<|>.*$/g, "").toLowerCase();
          if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adr)) ccSet.add(adr);
        });
        [ticket.contact_email, SUPPORT_EMAIL, "team@dsihotel.fr", "support@dsihotel.com"].forEach(a => a && ccSet.delete(String(a).toLowerCase()));
        const ccList = Array.from(ccSet);
        const subject = `[${ticket.reference || "DSI"}] Re: ${ticket.subject || ticket.category || "Votre demande"}`;
        const bodyText =
          `Bonjour ${ticket.contact_name || ""},\n\n` +
          `${body}`;
        // Si la réponse vient d'une réponse type riche (HTML + images) non modifiée,
        // on envoie ce HTML tel quel (il contient déjà sa propre formule de politesse).
        // Images collées / intégrées (URLs publiques) : on les met EN LIGNE dans le corps
        // de l'email (et non en pièce jointe), sauf si une réponse type riche pilote déjà le HTML.
        const inlineImgs = (imageUrlsToSend || []).filter(u => typeof u === "string" && /^https?:\/\//.test(u));
        let htmlOverride = replyHtmlOverride ? replyHtmlOverride.html : null;
        // Éditeur riche : on envoie son HTML tel quel (texte + images en ligne au bon endroit).
        if (!htmlOverride && richHasContent) {
          htmlOverride = (typeof sanitizeRichHtml === "function") ? sanitizeRichHtml(replyHtml) : replyHtml;
        }
        if (!htmlOverride && inlineImgs.length > 0) {
          htmlOverride = textToHtml(body) + '<div style="margin-top:8px;">' +
            inlineImgs.map(u => '<img src="' + u + '" style="max-width:100%;height:auto;border-radius:4px;margin:6px 0;display:block;" />').join("") +
            '</div>';
        }
        const mail = buildSignedEmail(bodyText, historyForEmail, htmlOverride);
        // Les fichiers joints partent aussi en pièces jointes de l'email
        const attachments = await Promise.all(filesToSend.map(f => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ filename: f.name, content: reader.result.split(",")[1] });
          reader.readAsDataURL(f);
        })));
        // Réponse type (images cid pilotées par le HTML) : on les joint aussi en pièces jointes.
        // Les images collées/intégrées, elles, sont déjà EN LIGNE dans le corps (ci-dessus) : on ne les joint pas.
        for (const url of (replyHtmlOverride ? imageUrlsToSend : [])) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const b64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result.split(",")[1]);
              reader.readAsDataURL(blob);
            });
            const nom = decodeURIComponent((url.split("/").pop() || "image").split("?")[0]);
            attachments.push({ filename: nom, content: b64 });
          } catch (e) {}
        }
        const res = await fetchEmailApi({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: destClient, subject, text: mail.text, html: mail.html, replyTo: SUPPORT_EMAIL, attachments, fromName: demandeurFromName(ticket), cc: ccList })
        });
        if (!res.ok) {
          const d = await res.text().catch(() => "");
          setReplyNote("Réponse enregistrée ✅ mais l'email n'a pas pu partir (" + res.status + (d ? " — " + d.slice(0, 160) : "") + "). Le client la verra dans son espace.");
        } else {
          setReplyNote("Réponse enregistrée et envoyée par email ✅");
        }
      } catch (e) {
        setReplyNote("Réponse enregistrée ✅ mais l'email a échoué (" + (e.message || e) + "). Le client la verra dans son espace.");
      }
    } else if (isAdmin && !destClient) {
      // Aucun email exploitable (ni contact du ticket, ni compte hôtel) :
      // on avertit clairement l'admin plutôt que d'échouer en silence.
      setReplyNote("⚠️ Réponse enregistrée mais AUCUN email envoyé : ce ticket n'a pas d'adresse client (ni email de contact, ni email de compte hôtel). Le client ne recevra rien par email. Ajoutez une adresse au contact du ticket pour lui répondre.");
    } else {
      setReplyNote("Message enregistré ✅");
    }
    setReplyBusy(false);
  };

  // ---------- TICKETS : FERMER (avec ou sans notification email) ----------
  const closeTicket = async (ticket, notify) => {
    // 1) Fermer le ticket en base (avec la date de fermeture)
    const fermeLe = new Date().toISOString();
    const { error } = await sb.from("tickets").update({ status: "closed", closed_at: fermeLe }).eq("id", ticket.id);
    if (error) { setReplyNote("Erreur : impossible de fermer le ticket (" + error.message + ")."); return; }
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "closed", closed_at: fermeLe } : t));

    // 2) Notification email au client (optionnelle)
    const closeHotel = hotels.find(h => h.id === ticket.hotel_id);
    const closeDest = nettoyerEmail(ticket.contact_email || (closeHotel && closeHotel.account_email) || "").trim();
    if (notify && closeDest) {
      try {
        const subject = `[${ticket.reference || "DSI"}] Re: ${ticket.subject || ticket.category || "Votre demande"} — Résolu`;
        const bodyText =
          `Bonjour ${ticket.contact_name || ""},\n\n` +
          `Votre demande de support a été traitée et est désormais marquée comme résolue.\n\n` +
          `Si le problème persiste ou si vous avez une nouvelle question, n'hésitez pas à nous recontacter via votre espace intranet ou à l'adresse ${SUPPORT_EMAIL}.\n\n` +
          `Nous vous remercions de votre confiance.`;
        const mail = buildSignedEmail(bodyText);
        const res = await fetchEmailApi({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: closeDest, subject, text: mail.text, html: mail.html, replyTo: SUPPORT_EMAIL, fromName: demandeurFromName(ticket) })
        });
        if (!res.ok) {
          const d = await res.text().catch(() => "");
          setReplyNote("Ticket fermé ✅ mais l'email de notification n'a pas pu partir (" + res.status + (d ? " — " + d.slice(0, 160) : "") + ").");
        } else {
          setReplyNote("Ticket fermé et client notifié par email ✅");
        }
      } catch (e) {
        setReplyNote("Ticket fermé ✅ mais l'email a échoué (" + (e.message || e) + ").");
      }
    } else if (notify && !closeDest) {
      setReplyNote("⚠️ Ticket fermé mais AUCUN email envoyé : pas d'adresse client (ni contact, ni compte hôtel).");
    } else {
      setReplyNote("Ticket fermé sans notification ✅");
    }
  };

  // ---------- TICKETS : RÉPONDRE PUIS FERMER (un seul geste) ----------
  const replyAndClose = async (ticket) => {
    if (!replyText.trim() && !/<img\b/i.test(replyHtml || "")) return;
    await sendReply(ticket);        // enregistre + envoie la réponse
    await closeTicket(ticket, false); // ferme sans 2e email (le client vient déjà de recevoir la réponse)
    setReplyNote("Réponse envoyée et ticket fermé ✅");
  };

  // ================= DOCUMENTATION TECHNIQUE (ADMIN UNIQUEMENT) =================
  // Charge les fiches d'un hôtel. La RLS filtre automatiquement :
  // l'admin reçoit tout, le client uniquement les fiches partagées de son hôtel.
  const loadDocs = async (hotelId) => {
    if (!hotelId) return;
    setDocsLoading(true);
    const { data, error } = await sb.from("hotel_docs").select("*")
      .eq("hotel_id", hotelId).order("categorie").order("created_at", { ascending: false });
    if (!error && data) {
      setDocs(data);
      const ids = data.map(d => d.id);
      if (ids.length) {
        const { data: fl } = await sb.from("hotel_doc_fichiers").select("*").in("doc_id", ids).order("created_at");
        const map = {};
        (fl || []).forEach(f => { (map[f.doc_id] = map[f.doc_id] || []).push(f); });
        setDocFiles(map);
      } else {
        setDocFiles({});
      }
    }
    setDocsLoading(false);
  };

  // À l'ouverture de l'onglet : sélectionne le premier hôtel si aucun choix
  useEffect(() => {
    if (page !== "docs-techniques" || !isAdmin) return;
    if (!docHotelId && hotels.length > 0) { setDocHotelId(hotels[0].id); return; }
    if (docHotelId) loadDocs(docHotelId);
  }, [page, profile, docHotelId, hotels.length]);

  // Côté client : charge les fiches partagées de son propre hôtel
  useEffect(() => {
    if (page !== "mon-installation" || isAdmin || !myHotelId) return;
    loadDocs(myHotelId);
  }, [page, profile, myHotelId]);

  const openNewDocForm = () => {
    setEditingDocId(null);
    setDocForm({ titre: "", categorie: DOC_CATS[0], description: "", visible_client: false, rappel_date: "", rappel_note: "", video_url: "" });
    setDocNewFiles([]);
    setDocExistingFiles([]);
    setDocErr("");
    setShowDocForm(true);
  };

  const openEditDocForm = (d) => {
    setEditingDocId(d.id);
    setDocForm({ titre: d.titre || "", categorie: d.categorie || DOC_CATS[0], description: d.description || "", visible_client: !!d.visible_client, rappel_date: d.rappel_date || "", rappel_note: d.rappel_note || "", video_url: d.video_url || "" });
    setDocNewFiles([]);
    setDocExistingFiles(docFiles[d.id] || []);
    setDocErr("");
    setShowDocForm(true);
  };

  const removeExistingDocFile = async (fileId) => {
    await sb.from("hotel_doc_fichiers").delete().eq("id", fileId);
    setDocExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Bascule rapide du partage depuis la liste, sans ouvrir le formulaire
  const toggleDocVisible = async (d) => {
    const next = !d.visible_client;
    const { error } = await sb.from("hotel_docs").update({ visible_client: next }).eq("id", d.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setDocs(prev => prev.map(x => x.id === d.id ? { ...x, visible_client: next } : x));
  };

  const submitDocForm = async () => {
    if (!docForm.titre.trim()) { setDocErr("Le titre est obligatoire."); return; }
    if (!docHotelId) { setDocErr("Sélectionnez un hôtel."); return; }
    setSavingDoc(true);
    setDocErr("");
    try {
      let docId = editingDocId;
      const payload = {
        titre: docForm.titre.trim(),
        categorie: docForm.categorie,
        description: docForm.description || null,
        visible_client: !!docForm.visible_client,
        rappel_date: docForm.rappel_date || null,
        rappel_note: docForm.rappel_note ? docForm.rappel_note.trim() : null,
        video_url: docForm.video_url ? docForm.video_url.trim() : null
      };
      if (editingDocId) {
        const { error } = await sb.from("hotel_docs").update(payload).eq("id", editingDocId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("hotel_docs")
          .insert({ ...payload, hotel_id: docHotelId }).select().single();
        if (error) throw error;
        docId = data.id;
      }
      for (const file of docNewFiles) {
        const url = await uploadToStorage(file, "docs-techniques");
        await sb.from("hotel_doc_fichiers").insert({ doc_id: docId, file_name: file.name, file_url: url });
      }
      setShowDocForm(false);
      await loadDocs(docHotelId);
    } catch (e) {
      setDocErr(e.message || "Une erreur est survenue.");
    } finally {
      setSavingDoc(false);
    }
  };

  const deleteDoc = async (d) => {
    if (!confirm(`Supprimer la fiche "${d.titre}" et tous ses fichiers ? Cette action est irréversible.`)) return;
    const { error } = await sb.from("hotel_docs").delete().eq("id", d.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setDocs(prev => prev.filter(x => x.id !== d.id));
  };

  // ================= PROJETS (ADMIN UNIQUEMENT) =================
  const [projets, setProjets] = useState([]);
  const [projetsLoading, setProjetsLoading] = useState(false);
  const [projTaches, setProjTaches] = useState({});   // { projetId: [taches] }
  const [projFichiers, setProjFichiers] = useState({}); // { projetId: [fichiers] }
  const [projModal, setProjModal] = useState(null);   // null | "new" | projet object
  const [projForm, setProjForm] = useState(null);
  const [projNewFiles, setProjNewFiles] = useState([]);
  const [projExistingFiles, setProjExistingFiles] = useState([]);
  const [projTacheList, setProjTacheList] = useState([]); // [{id?, libelle, done, _new?, _deleted?}]
  const [projNewTache, setProjNewTache] = useState("");
  const [savingProj, setSavingProj] = useState(false);
  const [projErr, setProjErr] = useState("");
  const [dragProjId, setDragProjId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [projFilterHotel, setProjFilterHotel] = useState("all");

  const emptyProjForm = () => ({
    titre: "", description: "", statut: "todo", priorite: "Moyenne",
    hotel_id: "", responsable: "", technicien: "", budget: "",
    date_debut: "", date_echeance: ""
  });

  const loadProjets = async () => {
    if (!isAdmin) return;
    setProjetsLoading(true);
    const { data, error } = await sb.from("projets").select("*")
      .order("statut").order("position").order("created_at");
    if (!error && data) {
      setProjets(data);
      const ids = data.map(p => p.id);
      if (ids.length) {
        const [{ data: tk }, { data: fl }] = await Promise.all([
          sb.from("projet_taches").select("*").in("projet_id", ids).order("position"),
          sb.from("projet_fichiers").select("*").in("projet_id", ids)
        ]);
        const tMap = {}, fMap = {};
        (tk || []).forEach(t => { (tMap[t.projet_id] = tMap[t.projet_id] || []).push(t); });
        (fl || []).forEach(f => { (fMap[f.projet_id] = fMap[f.projet_id] || []).push(f); });
        setProjTaches(tMap);
        setProjFichiers(fMap);
      } else {
        setProjTaches({}); setProjFichiers({});
      }
    }
    setProjetsLoading(false);
  };

  useEffect(() => {
    if (page === "projets" && isAdmin) loadProjets();
  }, [page, profile]);

  // ================= RAPPORTS D'ACTIVITÉ =================
  const SERVICES_LIST = ["FO", "CONCIERGERIE", "HK", "FINANCE", "RH", "COMMERCIAL", "MARKETING", "GC&E", "RESERVATION", "F&B", "CUISINE", "TECH", "DIRECTION"];
  const SERVICES_ALIAS = { "F/O": "FO", "FB": "F&B", "Cuisine": "CUISINE", "Finance": "FINANCE", "Technique": "TECH", "Direction": "DIRECTION", "Sales": "COMMERCIAL", "Revenue": "REVENUE" };
  const svcLabel = (s) => SERVICES_ALIAS[s] || s;
  const [rapports, setRapports] = useState([]);
  const [rapDemandes, setRapDemandes] = useState({});   // { rapportId: [demandes] }
  const [rapServeurs, setRapServeurs] = useState({});   // { rapportId: [verifs serveurs] }
  const [rapLoading, setRapLoading] = useState(false);
  const [rapModal, setRapModal] = useState(null);       // null | "new" | rapport object
  const [openRapId, setOpenRapId] = useState(null);     // rapport déplié dans la liste
  const [rapMoisReplies, setRapMoisReplies] = useState(null); // Set des clés de mois repliés (null = pas encore initialisé)
  const [rapHotelsReplies, setRapHotelsReplies] = useState(new Set()); // Set des clés "moisKey|hotelId" repliées (dépliés par défaut)
  const [rapForm, setRapForm] = useState(null);
  const [rapLignes, setRapLignes] = useState([]);       // demandes en cours d'édition
  const [uploadingPJ, setUploadingPJ] = useState({});   // { ligneIndex: true } pendant upload PJ
  const [rapSrvLignes, setRapSrvLignes] = useState([]); // verifs serveurs en cours d'édition
  const [savingRap, setSavingRap] = useState(false);
  const [rapErr, setRapErr] = useState("");
  const [rapNote, setRapNote] = useState("");           // info envoi email

  // Tient rapDirtyRef à jour : vrai si la modale rapport est ouverte avec une
  // saisie non enregistrée. Lu par go() pour avertir avant un changement de page.
  useEffect(() => {
    const rempli =
      !!rapModal && !!rapForm && (
        (rapForm.technicien || "").trim() !== "" ||
        !!rapForm.hotel_id ||
        (rapForm.observations || "").trim() !== "" ||
        (rapForm.serveurs_note || "").trim() !== "" ||
        (rapLignes || []).some(l => (l.description || "").trim() || (l.explication || "").trim()) ||
        (rapSrvLignes || []).some(s => (s.libelle || "").trim() || (s.note || "").trim())
      );
    rapDirtyRef.current = rempli;
  });
  const [rapFilterHotel, setRapFilterHotel] = useState("all");
  const [rapSendModal, setRapSendModal] = useState(null); // rapport en cours d'envoi (saisie email)
  const [rapSendTo, setRapSendTo] = useState("");
  const [rapEnvois, setRapEnvois] = useState({}); // { rapport_id: [ {envoye_a, envoye_par, envoye_le}, ... ] }
  const [rapSending, setRapSending] = useState(false);

  const emptyRapForm = () => ({
    date_intervention: new Date().toISOString().slice(0, 10),
    technicien: "", hotel_id: "", services: [],
    serveurs_ok: true, serveurs_note: "", observations: ""
  });
  const emptyLigne = () => ({ description: "", demandeur: "", service: "", statut: "ok", motif: "", explication: "", pieces_jointes: [] });
  const emptySrv = () => ({ libelle: "", ok: true, note: "" });

  const ticketVersLigne = (t) => ({
    description: (t.subject || t.category || "Demande").trim(),
    demandeur: (t.contact_name || "").trim(),
    service: "",
    statut: t.status === "closed" ? "ok" : "attente",
    motif: "",
  });

  const onSelectHotelRapport = async (hotelId) => {
    setRapForm({ ...rapForm, hotel_id: hotelId });
    if (!hotelId) return;
    let lignesTickets = [];
    try {
      const { data, error } = await sb.from("tickets")
        .select("subject,category,contact_name,status,hotel_id")
        .eq("hotel_id", hotelId)
        .neq("status", "closed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      lignesTickets = (data || []).map(ticketVersLigne);
    } catch (e) { return; }
    if (lignesTickets.length === 0) return;
    const dejaSaisi = rapLignes.some(l => (l.description || "").trim());
    if (dejaSaisi) {
      const ok = confirm(
        `${lignesTickets.length} ticket(s) ouvert(s) pour cet hôtel.\n\n` +
        "Des demandes sont déjà saisies. Ajouter les tickets à la suite ?\n" +
        "(Annuler = garder uniquement ce qui est déjà saisi.)"
      );
      if (!ok) return;
      const existantes = rapLignes.filter(l => (l.description || "").trim());
      setRapLignes([...existantes, ...lignesTickets]);
    } else {
      setRapLignes(lignesTickets);
    }
  };

  const loadRapports = async () => {
    if (!isAdmin) return;
    setRapLoading(true);
    const { data, error } = await sb.from("rapports").select("*")
      .order("date_intervention", { ascending: false }).order("created_at", { ascending: false });
    if (!error && data) {
      setRapports(data);
      const ids = data.map(r => r.id);
      if (ids.length) {
        const [{ data: dm }, { data: sv }] = await Promise.all([
          sb.from("rapport_demandes").select("*").in("rapport_id", ids).order("position"),
          sb.from("rapport_serveurs").select("*").in("rapport_id", ids).order("position")
        ]);
        const dMap = {}, sMap = {};
        (dm || []).forEach(d => { (dMap[d.rapport_id] = dMap[d.rapport_id] || []).push(d); });
        (sv || []).forEach(s => { (sMap[s.rapport_id] = sMap[s.rapport_id] || []).push(s); });
        setRapDemandes(dMap);
        setRapServeurs(sMap);
      } else {
        setRapDemandes({}); setRapServeurs({});
      }
    }
    setRapLoading(false);
  };

  // Chargement des rapports d'intervention pour le SUPERVISEUR (RLS = son hôtel).
  const loadRapportsClient = async () => {
    setRapLoading(true);
    const { data, error } = await sb.from("rapports").select("*")
      .order("date_intervention", { ascending: false }).order("created_at", { ascending: false });
    if (!error && data) {
      setRapports(data);
      const ids = data.map(r => r.id);
      if (ids.length) {
        const [{ data: dm }, { data: sv }] = await Promise.all([
          sb.from("rapport_demandes").select("*").in("rapport_id", ids).order("position"),
          sb.from("rapport_serveurs").select("*").in("rapport_id", ids).order("position")
        ]);
        const dMap = {}, sMap = {};
        (dm || []).forEach(d => { (dMap[d.rapport_id] = dMap[d.rapport_id] || []).push(d); });
        (sv || []).forEach(s => { (sMap[s.rapport_id] = sMap[s.rapport_id] || []).push(s); });
        setRapDemandes(dMap); setRapServeurs(sMap);
      } else { setRapDemandes({}); setRapServeurs({}); }
    }
    setRapLoading(false);
  };

  // Charge toutes les demandes liées aux comptes : formulaires "Demande interne"
  // (arrivée / modification, suppression, mot de passe) + tickets de catégorie "Création de compte".
  const loadHistoriqueComptes = async () => {
    if (!profile) return;
    setHcLoading(true); setHcErr("");
    try {
      let rows = [];
      let hcCols = TICKET_COLS;
      for (let from = 0; from < 10000; from += 1000) {
        let q = sb.from("tickets").select(hcCols)
          .or('contact_role.eq."Demande interne",category.eq."Création de compte"')
          .order("created_at", { ascending: false }).range(from, from + 999);
        if (!isAdmin) q = q.eq("hotel_id", myHotelId || "00000000-0000-0000-0000-000000000000");
        const { data, error } = await q;
        if (error && hcCols !== TICKET_COLS_BASE && /type_ticket/i.test(error.message || "")) { hcCols = TICKET_COLS_BASE; from -= 1000; continue; }
        if (error) throw error;
        rows = rows.concat(data || []);
        if (!data || data.length < 1000) break;
      }
      setHcRows(rows);
      // PDF récapitulatifs joints aux demandes (pièces jointes hors messages)
      const ids = rows.map(r => r.id); const fMap = {};
      for (let i = 0; i < ids.length; i += 100) {
        const { data: fs } = await sb.from("ticket_fichiers").select("id,ticket_id,file_name,file_url,message_id").in("ticket_id", ids.slice(i, i + 100));
        (fs || []).filter(f => !f.message_id).forEach(f => { (fMap[f.ticket_id] = fMap[f.ticket_id] || []).push(f); });
      }
      setHcFiles(fMap);
      loadValidations();
    } catch (e) { setHcErr("Erreur de chargement : " + (e.message || e)); }
    finally { setHcLoading(false); }
  };
  useEffect(() => { if (page === "historique-comptes" && (isAdmin || isSupervisor)) loadHistoriqueComptes(); }, [page, profile]);
  // Extrait les infos clés du message généré par le formulaire.
  const hcInfos = (t) => {
    const lignes = String(t.message || "").split("\n");
    const champ = (prefixe) => { const l = lignes.find(x => x.trim().startsWith(prefixe)); if (!l) return ""; const i = l.indexOf(" : "); const v = i >= 0 ? l.slice(i + 3).trim() : ""; return v === "-" ? "" : v; };
    const s = String(t.subject || "");
    let type = "Autre";
    if (s.includes("Arrivée collaborateur")) type = champ("Type de demande") === "Modification" ? "Modification" : "Création";
    else if (s.includes("Suppression de compte")) type = "Suppression";
    else if (s.includes("Modification Password")) type = "Mot de passe";
    else if (t.category === "Création de compte") type = "Autre demande";
    return {
      type,
      collaborateur: champ("Nom et prénom du collaborateur"),
      poste: champ("Poste / service"),
      compte: champ("Compte à modifier") || champ("Compte / adresse mail concerné"),
      dateEffet: (champ("Date d'arrivée") || champ("Date de départ / d'effet")).replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3/$2/$1"),
    };
  };
  const HC_TYPES = { "Création": ["#256029", "#EAF6EC"], "Modification": ["#2B6CB0", "#EBF4FF"], "Suppression": ["#B03A2E", "#FDECEC"], "Mot de passe": ["#6B46C1", "#F3EEFF"], "Autre demande": ["#555", "#F0F0F5"], "Autre": ["#555", "#F0F0F5"] };
  const hcVoirTicket = (t) => {
    if (isAdmin) setTicketFilter("all");
    setOpenTicketId(t.id);
    loadTicketMsgs(t.id);
    go(isAdmin ? "tickets-admin" : "tickets-client");
  };

  const loadPlanning = async () => {
    setPlLoading(true); setPlErr("");
    try {
      const d = await callAdminApi("/admin/planning-list", { start: plSemaine, end: plAjout(plSemaine, 6) });
      // Comptes admin masqués du planning (doublons) : nom affiché, comparé sans accents/casse.
      const PL_EXCLUS = ["jeremie beal"];
      const plNorm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
      const equipe = (d.equipe || []).filter(m => !(PL_EXCLUS.includes(plNorm(m.nom)) && /\s/.test(String(m.nom || "").trim())));
      setPlData({ equipe, evenements: d.evenements || [], boite: d.boite || "" });
    } catch (e) {
      setPlErr(e.message || "Erreur de chargement du planning.");
    } finally { setPlLoading(false); }
  };
  useEffect(() => { if (page === "planning" && isAdmin) loadPlanning(); }, [page, plSemaine]);

  // Techniciens affectés à un RDV : catégorie Outlook = nom, ou invité par email.
  // + initiales du technicien dans le titre (ex. "MP GDN", "PAROA - MP/SA" -> Marc Pratlong).
  // Initiales utilisées par l'équipe quand elles diffèrent du calcul automatique
  // (clé = début de l'email, avant @). Ajouter ici toute nouvelle exception.
  const PL_INITIALES_FORCEES = { "aftab.saifullah": ["SA"], "as": ["SA"] };
  const plInitialesDe = (m) => {
    const res = [...(PL_INITIALES_FORCEES[String(m.email || "").split("@")[0].toLowerCase()] || [])];
    const parts = String(m.nom || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) res.push((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
    const local = String(m.email || "").split("@")[0];
    if (/^[a-z]{2,3}$/i.test(local)) res.push(local.toUpperCase());          // ex. mp@dsihotel.fr
    const lp = local.split(/[._-]+/).filter(Boolean);
    if (lp.length >= 2) res.push((lp[0][0] + lp[lp.length - 1][0]).toUpperCase()); // ex. marc.pratlong@
    return [...new Set(res)];
  };
  const plTechsDe = (e) => {
    const cats = (e.categories || []).map(c => c.toLowerCase());
    // Initiales -> technicien, en ignorant celles partagées par plusieurs membres (ambiguës).
    const compte = {};
    plData.equipe.forEach(m => plInitialesDe(m).forEach(i => { compte[i] = (compte[i] || 0) + 1; }));
    // Jetons du titre écrits en MAJUSCULES (2-3 lettres) : "MP", "GJ", "SA"...
    const jetons = new Set(String(e.titre || "").split(/[^A-Za-z]+/).filter(t => t.length >= 2 && t.length <= 3 && t === t.toUpperCase()));
    return plData.equipe.filter(m =>
      cats.includes(m.nom.toLowerCase()) ||
      (e.participants || []).includes(m.email) ||
      plInitialesDe(m).some(i => compte[i] === 1 && jetons.has(i))
    );
  };
  const plJoursDe = (e) => {
    const d0 = (e.debut || "").slice(0, 10);
    let d1 = (e.fin || e.debut || "").slice(0, 10);
    if (e.journee || (e.fin || "").slice(11, 16) === "00:00") d1 = plAjout(d1, -1); // fin exclusive
    if (d1 < d0) d1 = d0;
    return { d0, d1 };
  };
  const plOuvrirNouveau = (date, tech) => {
    setPlModalErr("");
    setPlModal({ id: null, titre: "", lieu: "", date, dateFin: date, journee: false, heureDebut: "09:00", heureFin: "12:00",
      techs: tech ? [tech.email] : [], inviter: false, notes: "", notesModif: true, autresCategories: [], lien: null });
  };
  const plOuvrirEdition = (e) => {
    setPlModalErr("");
    const techs = plTechsDe(e);
    const noms = techs.map(m => m.nom.toLowerCase());
    const { d0, d1 } = plJoursDe(e);
    setPlModal({ id: e.id, titre: e.titre, lieu: e.lieu || "", date: d0, dateFin: d1, journee: !!e.journee,
      heureDebut: (e.debut || "").slice(11, 16) || "09:00", heureFin: (e.fin || "").slice(11, 16) || "10:00",
      techs: techs.map(m => m.email), inviter: false, notes: e.notes || "", notesModif: false,
      autresCategories: (e.categories || []).filter(c => !noms.includes(c.toLowerCase())), lien: e.lien });
  };
  const plEnregistrer = async () => {
    const f = plModal; setPlModalErr("");
    if (!f.titre.trim()) { setPlModalErr("Le titre est obligatoire."); return; }
    if (!f.date) { setPlModalErr("La date est obligatoire."); return; }
    setPlSaving(true);
    try {
      const payload = {
        id: f.id || undefined, titre: f.titre.trim(), lieu: f.lieu, date: f.date, dateFin: f.dateFin || f.date,
        journee: f.journee, heureDebut: f.heureDebut, heureFin: f.heureFin, inviter: f.inviter,
        techniciens: plData.equipe.filter(m => f.techs.includes(m.email)).map(m => ({ nom: m.nom, email: m.email })),
        autresCategories: f.autresCategories,
      };
      if (f.notesModif) payload.notes = f.notes;
      await callAdminApi(f.id ? "/admin/planning-update" : "/admin/planning-create", payload);
      setPlModal(null);
      loadPlanning();
    } catch (e) { setPlModalErr(e.message || "Erreur lors de l'enregistrement."); }
    finally { setPlSaving(false); }
  };
  const plSupprimer = async () => {
    if (!plModal || !plModal.id) return;
    if (!confirm("Supprimer ce RDV du calendrier " + (plData.boite || "Outlook") + " ?")) return;
    setPlSaving(true);
    try { await callAdminApi("/admin/planning-delete", { id: plModal.id }); setPlModal(null); loadPlanning(); }
    catch (e) { setPlModalErr(e.message || "Erreur lors de la suppression."); }
    finally { setPlSaving(false); }
  };

  const loadRappelsDus = async () => {
    // Fiches dont le rappel arrive à échéance (échu ou dans les 30 jours), tous hôtels.
    const limite = new Date(); limite.setHours(0,0,0,0); limite.setDate(limite.getDate() + 30);
    const limiteStr = limite.toISOString().slice(0, 10);
    const { data, error } = await sb.from("hotel_docs")
      .select("id, titre, hotel_id, rappel_date, rappel_note")
      .not("rappel_date", "is", null)
      .lte("rappel_date", limiteStr)
      .order("rappel_date", { ascending: true });
    if (!error && data) setRappelsDus(data);
  };

  useEffect(() => {
    if (page === "rapports" && isAdmin) { loadRapports(); loadRapportEnvois(); }
    if ((page === "backups" || page === "accueil") && isAdmin) loadBackups();
    if (page === "accueil" && isAdmin) loadRappelsDus();
  }, [page, profile]);

  const openNewRapport = () => {
    setRapForm(emptyRapForm());
    setRapLignes([emptyLigne()]);
    setRapSrvLignes([emptySrv()]);
    setRapErr(""); setRapNote("");
    setRapModal("new");
  };

  const openEditRapport = (r) => {
    setRapForm({
      date_intervention: r.date_intervention || new Date().toISOString().slice(0, 10),
      technicien: r.technicien || "", hotel_id: r.hotel_id || "",
      services: Array.isArray(r.services) ? r.services : [],
      serveurs_ok: r.serveurs_ok !== false,
      serveurs_note: r.serveurs_note || "", observations: r.observations || ""
    });
    const lignes = (rapDemandes[r.id] || []).map(d => ({
      description: d.description || "", demandeur: d.demandeur || "",
      service: d.service || "", statut: d.statut || "ok", motif: d.motif || "",
      explication: d.explication || "", pieces_jointes: Array.isArray(d.pieces_jointes) ? d.pieces_jointes : []
    }));
    setRapLignes(lignes.length ? lignes : [emptyLigne()]);
    const srv = (rapServeurs[r.id] || []).map(s => ({ libelle: s.libelle || "", ok: s.ok !== false, note: s.note || "" }));
    setRapSrvLignes(srv.length ? srv : [emptySrv()]);
    setRapErr(""); setRapNote("");
    setRapModal(r);
  };

  const toggleService = (svc) =>
    setRapForm(f => ({ ...f, services: f.services.includes(svc) ? f.services.filter(s => s !== svc) : [...f.services, svc] }));

  const setLigne = (i, field, val) =>
    setRapLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  const addLigne = () => setRapLignes(prev => [...prev, emptyLigne()]);
  const removeLigne = (i) => setRapLignes(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  // Upload d'une ou plusieurs pièces jointes sur une ligne de demande.
  // Réutilise uploadToStorage() (bucket "uploads"). Stocke { name, url, size, type }.
  const uploadLignePJ = async (i, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploadingPJ(prev => ({ ...prev, [i]: true }));
    try {
      const uploaded = [];
      for (const f of files) {
        const url = await uploadToStorage(f, "rapports-demandes");
        uploaded.push({ name: f.name, url, size: f.size, type: f.type || "" });
      }
      setRapLignes(prev => prev.map((l, idx) => idx === i
        ? { ...l, pieces_jointes: [...(l.pieces_jointes || []), ...uploaded] }
        : l));
    } catch (e) {
      setRapErr("Erreur d'upload : " + (e.message || e));
    } finally {
      setUploadingPJ(prev => ({ ...prev, [i]: false }));
    }
  };
  const removeLignePJ = (i, pjIdx) => setRapLignes(prev => prev.map((l, idx) => idx === i
    ? { ...l, pieces_jointes: (l.pieces_jointes || []).filter((_, k) => k !== pjIdx) }
    : l));

  const setSrv = (i, field, val) =>
    setRapSrvLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  const addSrv = () => setRapSrvLignes(prev => [...prev, emptySrv()]);
  const removeSrv = (i) => setRapSrvLignes(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const submitRapForm = async () => {
    if (!rapForm.technicien.trim()) { setRapErr("Le nom du technicien est obligatoire."); return; }
    if (!rapForm.hotel_id) { setRapErr("Veuillez sélectionner l'hôtel concerné."); return; }
    setSavingRap(true); setRapErr("");
    try {
      const payload = {
        hotel_id: rapForm.hotel_id,
        date_intervention: rapForm.date_intervention,
        technicien: rapForm.technicien.trim(),
        services: rapForm.services,
        serveurs_ok: !!rapForm.serveurs_ok,
        serveurs_note: rapForm.serveurs_note.trim() || null,
        observations: rapForm.observations.trim() || null,
      };
      let rapId;
      if (rapModal === "new") {
        payload.created_by = profile?.id || null;
        const { data, error } = await sb.from("rapports").insert(payload).select().single();
        if (error) throw error;
        rapId = data.id;
      } else {
        rapId = rapModal.id;
        const { error } = await sb.from("rapports").update(payload).eq("id", rapId);
        if (error) throw error;
        await sb.from("rapport_demandes").delete().eq("rapport_id", rapId);
        await sb.from("rapport_serveurs").delete().eq("rapport_id", rapId);
      }
      const lignes = rapLignes.filter(l => l.description.trim()).map((l, i) => ({
        rapport_id: rapId, description: l.description.trim(),
        demandeur: l.demandeur.trim() || null,
        service: l.service || null,
        statut: l.statut === "attente" ? "attente" : "ok",
        motif: l.statut === "attente" ? (l.motif.trim() || null) : null,
        explication: (l.explication || "").trim() || null,
        pieces_jointes: Array.isArray(l.pieces_jointes) ? l.pieces_jointes : [],
        position: i,
      }));
      if (lignes.length) {
        const { error } = await sb.from("rapport_demandes").insert(lignes);
        if (error) throw error;
      }
      const srv = rapSrvLignes.filter(s => s.libelle.trim()).map((s, i) => ({
        rapport_id: rapId, libelle: s.libelle.trim(), ok: !!s.ok, note: (s.note || "").trim() || null, position: i,
      }));
      if (srv.length) {
        const { error } = await sb.from("rapport_serveurs").insert(srv);
        if (error) throw error;
      }
      await loadRapports();
      try { localStorage.removeItem("dsi-rapport-brouillon"); } catch (e) {} // rapport en base : brouillon inutile
      setRapModal(null);
    } catch (e) {
      setRapErr("Erreur : " + (e.message || e));
    } finally {
      setSavingRap(false);
    }
  };

  const deleteRapport = async (r) => {
    if (!window.confirm("Supprimer définitivement ce rapport ?")) return;
    await sb.from("rapports").delete().eq("id", r.id);
    setRapModal(null);
    await loadRapports();
  };

  const fmtDateFr = (d) => { try { return new Date(d).toLocaleDateString("fr-FR"); } catch (e) { return d; } };

  // ---- Génère le PDF du rapport (jsPDF) et retourne l'objet doc ----
  const buildRapportPdf = (r) => {
    const hotel = hotels.find(h => h.id === r.hotel_id);
    const dems = rapDemandes[r.id] || [];
    const srv = rapServeurs[r.id] || [];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210, mL = 15, mR = 15, contentW = pageW - mL - mR;
    let y = 18;
    const line = (h) => { y += h; if (y > 275) { doc.addPage(); y = 20; } };

    // En-tête
    doc.setFillColor(15, 15, 36);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setTextColor(201, 168, 76);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("DSI HOTEL", mL, 14);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text("Rapport d'activité", mL, 22);
    doc.setFontSize(9);
    doc.text("60 Rue François 1er, 75008 Paris  •  +33 1 84 18 02 23", pageW - mR, 14, { align: "right" });
    doc.text("support@dsihotel.com  •  www.dsihotel.com", pageW - mR, 20, { align: "right" });

    y = 42;
    doc.setTextColor(20, 20, 40);
    const field = (label, val) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(label, mL, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(String(val || "—"), contentW - 45);
      doc.text(lines, mL + 45, y);
      line(Math.max(6, lines.length * 5));
    };
    field("Établissement :", hotel ? hotel.name : "—");
    field("Date d'intervention :", fmtDateFr(r.date_intervention));
    field("Technicien :", r.technicien);
    field("Services visités :", (r.services && r.services.length) ? r.services.map(svcLabel).join(", ") : "—");

    // Section demandes
    line(4);
    doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.5);
    doc.line(mL, y, pageW - mR, y); line(6);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.setTextColor(15, 15, 36);
    doc.text("Demandes réalisées", mL, y); line(7);
    doc.setTextColor(30, 30, 30);
    if (dems.length === 0) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(10);
      doc.text("Aucune demande enregistrée.", mL, y); line(6);
    } else {
      dems.forEach((d, i) => {
        const st = d.statut === "attente" ? "EN ATTENTE" : "OK";
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        if (d.statut === "attente") doc.setTextColor(178, 106, 0); else doc.setTextColor(46, 125, 50);
        doc.text("[" + st + "]", mL, y);
        doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal");
        const meta = [d.demandeur ? "demandé par " + d.demandeur : "", d.service ? "service " + d.service : ""].filter(Boolean).join(", ");
        const txt = doc.splitTextToSize((i + 1) + ". " + d.description + (meta ? "  (" + meta + ")" : ""), contentW - 28);
        doc.text(txt, mL + 28, y);
        line(Math.max(6, txt.length * 5));
        if (d.statut === "attente" && d.motif) {
          doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(178, 106, 0);
          const m = doc.splitTextToSize("Motif : " + d.motif, contentW - 30);
          doc.text(m, mL + 30, y); line(m.length * 4.5 + 1);
          doc.setTextColor(30, 30, 30);
        }
        if (d.explication) {
          doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
          const ex = doc.splitTextToSize(d.explication, contentW - 30);
          doc.text(ex, mL + 30, y); line(ex.length * 4.5 + 1);
          doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal");
        }
      });
    }

    // Section serveurs
    line(4);
    doc.setDrawColor(201, 168, 76); doc.line(mL, y, pageW - mR, y); line(6);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(15, 15, 36);
    doc.text("État des serveurs de l'hôtel", mL, y); line(7);
    doc.setFontSize(10);
    if (r.serveurs_ok) { doc.setTextColor(46, 125, 50); doc.text("Statut global : Fonctionnement normal", mL, y); }
    else { doc.setTextColor(192, 57, 43); doc.text("Statut global : Anomalie constatée", mL, y); }
    line(6); doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal");
    if (r.serveurs_note) {
      const n = doc.splitTextToSize(r.serveurs_note, contentW);
      doc.text(n, mL, y); line(n.length * 5);
    }
    srv.forEach(s => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text("• " + s.libelle, mL + 2, y);
      if (s.ok) doc.setTextColor(46, 125, 50); else doc.setTextColor(192, 57, 43);
      doc.setFont("helvetica", "bold");
      doc.text(s.ok ? "OK" : "Anomalie", pageW - mR, y, { align: "right" });
      line(5.5);
      if (s.note) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(90, 90, 90);
        const nn = doc.splitTextToSize("↳ " + s.note, contentW - 6);
        doc.text(nn, mL + 6, y); line(nn.length * 4.5 + 1);
      }
    });

    if (r.observations) {
      line(4);
      doc.setDrawColor(201, 168, 76); doc.line(mL, y, pageW - mR, y); line(6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(15, 15, 36);
      doc.text("Observations", mL, y); line(7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      const o = doc.splitTextToSize(r.observations, contentW);
      doc.text(o, mL, y); line(o.length * 5);
    }
    return { doc, hotel };
  };

  const pdfFileName = (r) => {
    const hotel = hotels.find(h => h.id === r.hotel_id);
    const hn = (hotel ? hotel.name : "hotel").replace(/[^a-zA-Z0-9]+/g, "_");
    return "Rapport_" + hn + "_" + (r.date_intervention || "") + ".pdf";
  };

  const downloadRapportPdf = (r) => {
    try {
      const { doc } = buildRapportPdf(r);
      doc.save(pdfFileName(r));
    } catch (e) {
      setRapNote("❌ Impossible de générer le PDF (" + (e.message || e) + ").");
    }
  };

  const openSendRapport = (r) => {
    const hotel = hotels.find(h => h.id === r.hotel_id);
    // Mémoire des destinataires : on cherche le dernier envoi effectué pour un
    // rapport DU MÊME HÔTEL et on pré-remplit avec ces adresses. Cela prime sur
    // l'email de contact de la fiche hôtel. Repli : contact de la fiche, sinon vide.
    let prefill = "";
    try {
      const idsHotel = new Set((rapports || []).filter(x => x.hotel_id === r.hotel_id).map(x => x.id));
      let dernier = null; // { envoye_le, adresses:Set }
      Object.keys(rapEnvois || {}).forEach(rid => {
        if (!idsHotel.has(rid)) return;
        (rapEnvois[rid] || []).forEach(e => {
          if (!e || !e.envoye_a) return;
          const t = e.envoye_le ? new Date(e.envoye_le).getTime() : 0;
          if (!dernier || t > dernier.t) dernier = { t, envoye_le: e.envoye_le, adresses: new Set([e.envoye_a]) };
          else if (t === dernier.t) dernier.adresses.add(e.envoye_a); // même envoi, plusieurs destinataires
        });
      });
      if (dernier && dernier.adresses.size) prefill = Array.from(dernier.adresses).join(", ");
    } catch (e) { /* silencieux : on retombe sur le contact de la fiche */ }
    setRapSendTo(prefill || hotel?.contact_email || hotel?.email || "");
    setRapNote("");
    setRapSendModal(r);
  };

  const confirmSendRapport = async () => {
    const r = rapSendModal;
    // Plusieurs destinataires possibles : séparés par virgule ou point-virgule.
    const destinataires = (rapSendTo || "").split(/[,;]/).map(a => a.trim()).filter(Boolean);
    const invalides = destinataires.filter(a => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a));
    if (destinataires.length === 0 || invalides.length > 0) {
      setRapNote("⚠️ Adresse(s) invalide(s)" + (invalides.length ? " : " + invalides.join(", ") : "") + ".");
      return;
    }
    const to = destinataires.join(",");
    setRapSending(true); setRapNote("Envoi en cours…");
    try {
      const { doc, hotel } = buildRapportPdf(r);
      const pdfB64 = doc.output("datauristring").split(",")[1];
      const subject = "Rapport d'activité DSI Hotel — " + (hotel ? hotel.name : "") + " — " + fmtDateFr(r.date_intervention);
      const bodyText =
        "Bonjour,\n\n" +
        "Veuillez trouver ci-joint le compte rendu de notre intervention du " + fmtDateFr(r.date_intervention) +
        (hotel ? " à l'établissement " + hotel.name : "") + ".\n\n" +
        "Nous restons à votre disposition pour toute question.";
      const mail = buildSignedEmail(bodyText);
      const res = await fetchEmailApi({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to, subject, text: mail.text, html: mail.html, replyTo: SUPPORT_EMAIL,
          fromName: adminFromName(),
          attachments: [{ filename: pdfFileName(r), content: pdfB64 }]
        })
      });
      if (!res.ok) {
        const d = await res.text().catch(() => "");
        setRapNote("❌ L'email n'a pas pu partir (" + res.status + (d ? " — " + d.slice(0, 160) : "") + ").");
      } else {
        // Enregistre l'envoi dans l'historique (cachet)
        try {
          await sb.from("rapport_envois").insert(
            destinataires.map(dest => ({
              rapport_id: r.id,
              envoye_a: dest,
              envoye_par: adminFromName(),
            }))
          );
          await loadRapportEnvois();
        } catch (e) { /* le cachet ne doit pas bloquer */ }
        setRapNote("✅ Rapport envoyé à " + destinataires.join(", "));
        setRapSendModal(null);
      }
    } catch (e) {
      setRapNote("❌ Échec de l'envoi (" + (e.message || e) + ").");
    } finally {
      setRapSending(false);
    }
  };

  // Charge l'historique d'envoi des rapports (pour le cachet "Envoyé le…")
  const loadRapportEnvois = async () => {
    try {
      const { data, error } = await sb.from("rapport_envois").select("*").order("envoye_le", { ascending: false });
      if (error) throw error;
      const map = {};
      (data || []).forEach(e => { (map[e.rapport_id] = map[e.rapport_id] || []).push(e); });
      setRapEnvois(map);
    } catch (e) { setRapEnvois({}); }
  };

  // ================= RÉPONSES TYPES (macros) =================
  const [reponsesTypes, setReponsesTypes] = useState([]);
  const [rtLoading, setRtLoading] = useState(false);
  const [rtModal, setRtModal] = useState(null);      // null | "new" | reponse object
  const [rtForm, setRtForm] = useState(null);        // { titre, contenu, images: [url] }
  const [rtUploading, setRtUploading] = useState(false);
  const [rtSaving, setRtSaving] = useState(false);
  const [rtErr, setRtErr] = useState("");
  const [openRtId, setOpenRtId] = useState(null);   // réponse type dépliée dans la liste

  // ---------- AIDE — PROCÉDURES INTERNES (admin) ----------
  const AIDE_CATS = ["Général", "Onboarding", "Cybersécurité", "Réseau", "Serveurs", "Sauvegardes", "M365 / Email", "Téléphonie", "Clients / Hôtels", "Outils internes", "Agent", "Autre"];
  const [aideProcs, setAideProcs] = useState([]);
  const [aideLoading, setAideLoading] = useState(false);
  const [aideFiles, setAideFiles] = useState({});     // { procId: [fichiers] }
  const [aideCatFilter, setAideCatFilter] = useState("all");
  const [aideSearch, setAideSearch] = useState("");
  const [aideOpenId, setAideOpenId] = useState(null); // procédure dépliée
  const [aideModal, setAideModal] = useState(null);   // null | "new" | proc object
  const [aideForm, setAideForm] = useState(null);     // { titre, categorie, contenu, epingle }
  const [aideNewFiles, setAideNewFiles] = useState([]);
  const [aideExistingFiles, setAideExistingFiles] = useState([]);
  const [aideSaving, setAideSaving] = useState(false);
  const [aideErr, setAideErr] = useState("");
  const emptyAideForm = () => ({ titre: "", categorie: AIDE_CATS[0], contenu: "", epingle: false, videos: [{ titre: "", url: "" }] });

  const emptyRtForm = () => ({ titre: "", contenu: "", contenu_html: "", images: [] });

  const loadReponsesTypes = async () => {
    if (!isAdmin) return;
    setRtLoading(true);
    const { data, error } = await sb.from("reponses_types").select("*")
      .order("position").order("created_at");
    if (!error && data) setReponsesTypes(data);
    setRtLoading(false);
  };

  useEffect(() => {
    if ((page === "reponses-types" || page === "tickets-admin") && isAdmin) loadReponsesTypes();
    if (page === "aide-interne" && isAdmin) loadAideProcs();
  }, [page, profile]);

  const openNewReponse = () => { setRtForm(emptyRtForm()); setRtErr(""); setRtModal("new"); };
  const openEditReponse = (r) => {
    // Repli : si pas de HTML enregistré, on convertit le texte simple existant
    const html = r.contenu_html && r.contenu_html.trim()
      ? r.contenu_html
      : (r.contenu ? "<p>" + String(r.contenu).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>") + "</p>" : "");
    setRtForm({ titre: r.titre || "", contenu: r.contenu || "", contenu_html: html, images: Array.isArray(r.images) ? [...r.images] : [] });
    setRtErr(""); setRtModal(r);
  };

  // Insertion d'une image DANS l'éditeur riche, à la position du curseur.
  const rtEditorImgInput = useRef(null);
  const triggerRtEditorImage = () => { if (rtEditorImgInput.current) rtEditorImgInput.current.click(); };
  const rtInsertImageInEditor = async (file) => {
    if (!file) return;
    setRtUploading(true);
    try {
      const url = await uploadToStorage(file, "reponses");
      // Insère l'image à la position courante du curseur dans l'éditeur
      const img = '<img src="' + url + '" style="max-width:100%;height:auto;border-radius:4px;margin:6px 0;" />';
      document.execCommand("insertHTML", false, img);
      // Mémorise aussi l'URL (utile pour l'affichage liste / nettoyage)
      setRtForm(prev => ({ ...prev, images: [...(prev.images || []), url] }));
    } catch (e) {
      setRtErr("L'image n'a pas pu être ajoutée (" + (e.message || e) + ").");
    } finally { setRtUploading(false); }
  };

  const submitRtForm = async () => {
    if (!rtForm.titre.trim()) { setRtErr("Le titre est obligatoire."); return; }
    setRtSaving(true); setRtErr("");
    try {
      const html = sanitizeRichHtml(rtForm.contenu_html || "");
      // Version texte simple dérivée du HTML (pour repli et recherche)
      const texte = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
        .replace(/\n{3,}/g, "\n\n").trim();
      const payload = {
        titre: rtForm.titre.trim(),
        contenu: texte,
        contenu_html: html,
        images: rtForm.images,
        updated_at: new Date().toISOString(),
      };
      if (rtModal === "new") {
        payload.created_by = profile?.id || null;
        payload.position = reponsesTypes.length;
        const { error } = await sb.from("reponses_types").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await sb.from("reponses_types").update(payload).eq("id", rtModal.id);
        if (error) throw error;
      }
      await loadReponsesTypes();
      setRtModal(null);
    } catch (e) {
      setRtErr("Erreur : " + (e.message || e));
    } finally { setRtSaving(false); }
  };

  const deleteReponse = async (r) => {
    if (!window.confirm("Supprimer cette réponse type ?")) return;
    await sb.from("reponses_types").delete().eq("id", r.id);
    setRtModal(null);
    await loadReponsesTypes();
  };

  // ---- AIDE : chargement + CRUD des procédures internes ----
  const loadAideProcs = async () => {
    if (!isAdmin) return;
    setAideLoading(true);
    try {
      const { data, error } = await sb.from("procedures_internes").select("*")
        .order("epingle", { ascending: false }).order("titre");
      if (!error && data) {
        setAideProcs(data);
        const ids = data.map(p => p.id);
        if (ids.length) {
          const { data: fl } = await sb.from("procedures_internes_fichiers").select("*").in("proc_id", ids).order("created_at");
          const map = {};
          (fl || []).forEach(f => { (map[f.proc_id] = map[f.proc_id] || []).push(f); });
          setAideFiles(map);
        } else { setAideFiles({}); }
      }
    } catch (e) { /* silencieux : la table n'existe peut-être pas encore */ }
    finally { setAideLoading(false); }
  };

  const openNewAide = () => {
    setAideForm(emptyAideForm());
    setAideNewFiles([]); setAideExistingFiles([]);
    setAideErr(""); setAideModal("new");
  };
  const openEditAide = (p) => {
    setAideForm({ titre: p.titre || "", categorie: p.categorie || AIDE_CATS[0], contenu: p.contenu || "", epingle: !!p.epingle, videos: (() => { const l = videosInternesLire(p.video_url); return l.length ? l : [{ titre: "", url: "" }]; })() });
    setAideNewFiles([]); setAideExistingFiles(aideFiles[p.id] || []);
    setAideErr(""); setAideModal(p);
  };
  const removeExistingAideFile = async (fileId) => {
    await sb.from("procedures_internes_fichiers").delete().eq("id", fileId);
    setAideExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const submitAideForm = async () => {
    if (!aideForm.titre.trim()) { setAideErr("Le titre est obligatoire."); return; }
    setAideSaving(true); setAideErr("");
    try {
      const payload = {
        titre: aideForm.titre.trim(),
        categorie: aideForm.categorie,
        contenu: aideForm.contenu || null,
        epingle: !!aideForm.epingle,
        video_url: videosInternesEcrire(aideForm.videos),
        updated_at: new Date().toISOString(),
      };
      let procId = (aideModal && aideModal !== "new") ? aideModal.id : null;
      if (aideModal === "new") {
        payload.created_by = profile?.id || null;
        const { data, error } = await sb.from("procedures_internes").insert(payload).select().single();
        if (error) throw error;
        procId = data.id;
      } else {
        const { error } = await sb.from("procedures_internes").update(payload).eq("id", procId);
        if (error) throw error;
      }
      for (const file of aideNewFiles) {
        const url = await uploadToStorage(file, "procedures-internes");
        await sb.from("procedures_internes_fichiers").insert({ proc_id: procId, file_name: file.name, file_url: url });
      }
      await loadAideProcs();
      setAideModal(null);
    } catch (e) {
      setAideErr("Erreur : " + (e.message || e) + " (la table 'procedures_internes' existe-t-elle bien dans Supabase ?)");
    } finally { setAideSaving(false); }
  };

  const deleteAide = async (p) => {
    if (!window.confirm("Supprimer définitivement cette procédure interne « " + (p.titre || "") + " » et ses fichiers ?")) return;
    const { error } = await sb.from("procedures_internes").delete().eq("id", p.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setAideModal(null);
    await loadAideProcs();
  };

  // Insère une réponse type dans la zone de réponse d'un ticket.
  // Texte : remplace si vide, sinon ajoute à la suite. Images : jointes au mail.
  const [replyHtmlOverride, setReplyHtmlOverride] = useState(null); // { html, plain } d'une réponse type
  const applyReponseType = (rid) => {
    const r = reponsesTypes.find(x => x.id === rid);
    if (!r) return;
    const plain = r.contenu || "";
    const imgs = Array.isArray(r.images) ? r.images.filter(u => typeof u === "string" && /^https?:\/\//.test(u)) : [];
    // On insère la réponse type DIRECTEMENT dans l'éditeur riche (texte + images en ligne),
    // avec les vraies URLs d'images (les cid: sont remplacés dans l'ordre).
    let html = (r.contenu_html && r.contenu_html.trim()) ? sanitizeRichHtml(r.contenu_html) : null;
    if (html) {
      let i = 0;
      html = html.replace(/<img[^>]*\ssrc=["']cid:[^"']*["'][^>]*>/gi, () => { const u = imgs[i++]; return u ? '<img src="' + u + '" style="max-width:100%;height:auto;border-radius:6px;margin:6px 0;" />' : ""; });
      html = html.replace(/<img[^>]*\ssrc=["']cid:[^"']*["'][^>]*>/gi, "");
    } else {
      html = textToHtml(plain) + (imgs.length ? ('<div style="margin-top:8px;">' + imgs.map(u => '<img src="' + u + '" style="max-width:100%;height:auto;border-radius:6px;margin:6px 0;" />').join("") + '</div>') : "");
    }
    setReplyHtmlOverride(null);
    setReplyHtml(prev => (prev && prev.trim()) ? (prev + "<br>" + html) : html);
    setReplyText(prev => { const p = (prev || "").trim(); return p ? (p + "\n\n" + plain) : plain; });
  };

  const openNewProjet = () => {
    setProjForm(emptyProjForm());
    setProjForm(emptyProjForm());
    setProjTacheList([]);
    setProjNewFiles([]);
    setProjExistingFiles([]);
    setProjNewTache("");
    setProjErr("");
    setProjModal("new");
  };

  const openEditProjet = (p) => {
    setProjForm({
      titre: p.titre || "", description: p.description || "", statut: p.statut || "todo",
      priorite: p.priorite || "Moyenne", hotel_id: p.hotel_id || "",
      responsable: p.responsable || "", technicien: p.technicien || "",
      budget: p.budget != null ? String(p.budget) : "",
      date_debut: p.date_debut || "", date_echeance: p.date_echeance || ""
    });
    setProjTacheList((projTaches[p.id] || []).map(t => ({ id: t.id, libelle: t.libelle, done: t.done })));
    setProjExistingFiles(projFichiers[p.id] || []);
    setProjNewFiles([]);
    setProjNewTache("");
    setProjErr("");
    setProjModal(p);
  };

  const addTacheToForm = () => {
    if (!projNewTache.trim()) return;
    setProjTacheList(prev => [...prev, { libelle: projNewTache.trim(), done: false, _new: true }]);
    setProjNewTache("");
  };

  const removeExistingProjFile = async (fileId) => {
    await sb.from("projet_fichiers").delete().eq("id", fileId);
    setProjExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const submitProjForm = async () => {
    if (!projForm.titre.trim()) { setProjErr("Le titre du projet est obligatoire."); return; }
    setSavingProj(true);
    setProjErr("");
    try {
      const payload = {
        titre: projForm.titre.trim(),
        description: projForm.description || null,
        statut: projForm.statut,
        priorite: projForm.priorite,
        hotel_id: projForm.hotel_id || null,
        responsable: projForm.responsable || null,
        technicien: projForm.technicien || null,
        budget: projForm.budget !== "" ? parseFloat(projForm.budget) : null,
        date_debut: projForm.date_debut || null,
        date_echeance: projForm.date_echeance || null
      };
      let projetId;
      if (projModal === "new") {
        const sameCol = projets.filter(x => x.statut === projForm.statut);
        payload.position = sameCol.length;
        const { data, error } = await sb.from("projets").insert(payload).select().single();
        if (error) throw error;
        projetId = data.id;
      } else {
        projetId = projModal.id;
        const { error } = await sb.from("projets").update(payload).eq("id", projetId);
        if (error) throw error;
      }

      // Checklist : on remplace intégralement
      await sb.from("projet_taches").delete().eq("projet_id", projetId);
      if (projTacheList.length) {
        const rows = projTacheList.map((t, i) => ({
          projet_id: projetId, libelle: t.libelle, done: !!t.done, position: i
        }));
        const { error: tErr } = await sb.from("projet_taches").insert(rows);
        if (tErr) throw tErr;
      }

      // Pièces jointes
      for (const file of projNewFiles) {
        const url = await uploadToStorage(file, "projets");
        await sb.from("projet_fichiers").insert({ projet_id: projetId, file_name: file.name, file_url: url });
      }

      // Notification automatique à team@dsihotel.fr — uniquement à la création.
      if (projModal === "new") {
        const hotelNom = payload.hotel_id
          ? (hotels.find(h => h.id === payload.hotel_id)?.name || null)
          : null;
        const sessionInfo = await sb.auth.getSession();
        const createurEmail = sessionInfo?.data?.session?.user?.email || null;
        callAdminApi("/notify-projet", {
          titre: payload.titre,
          description: payload.description,
          statut: payload.statut,
          priorite: payload.priorite,
          hotelName: hotelNom,
          responsable: payload.responsable,
          technicien: payload.technicien,
          budget: payload.budget,
          dateDebut: payload.date_debut,
          dateEcheance: payload.date_echeance,
          taches: projTacheList.map(t => ({ libelle: t.libelle, done: !!t.done })),
          createurEmail: createurEmail,
          createurNom: adminFromName(),
        }).catch(() => { /* email non-bloquant */ });
      }

      setProjModal(null);
      await loadProjets();
    } catch (e) {
      setProjErr(e.message || "Une erreur est survenue.");
    } finally {
      setSavingProj(false);
    }
  };

  const deleteProjet = async (p) => {
    if (!confirm(`Supprimer le projet "${p.titre}" ? Cette action est irréversible.`)) return;
    const { error } = await sb.from("projets").delete().eq("id", p.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setProjets(prev => prev.filter(x => x.id !== p.id));
    setProjModal(null);
  };

  const toggleTacheDone = async (projetId, tache) => {
    const { error } = await sb.from("projet_taches").update({ done: !tache.done }).eq("id", tache.id);
    if (!error) {
      setProjTaches(prev => ({
        ...prev,
        [projetId]: (prev[projetId] || []).map(t => t.id === tache.id ? { ...t, done: !t.done } : t)
      }));
    }
  };

  const moveProjetToStatut = async (projetId, newStatut) => {
    const p = projets.find(x => x.id === projetId);
    if (!p || p.statut === newStatut) return;
    const targetCount = projets.filter(x => x.statut === newStatut).length;
    setProjets(prev => prev.map(x => x.id === projetId ? { ...x, statut: newStatut, position: targetCount } : x));
    const { error } = await sb.from("projets").update({ statut: newStatut, position: targetCount }).eq("id", projetId);
    if (error) { alert("Erreur : " + error.message); loadProjets(); }
  };
  // ====================== RENDU ======================

  if (authLoading) {
    return React.createElement('div', { style: { minHeight: "100vh", background: SB, display: "flex", alignItems: "center", justifyContent: "center" } },
      React.createElement('div', { style: { color: "rgba(255,255,255,.5)", fontSize: 13 } }, "Chargement...")
    );
  }

  // Écran de réinitialisation : priorité sur tout le reste tant que recoveryMode est actif.
  if (recoveryMode) {
    return React.createElement('div', { style: { minHeight: "100vh", background: SB, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" } },
      React.createElement('div', { style: { width: 420, maxWidth: "100%" } },
        React.createElement('div', { style: { textAlign: "center", marginBottom: 28 } },
          React.createElement('div', { style: { display: "inline-flex", alignItems: "center", marginBottom: 10 } },
            React.createElement('img', { src: "https://www.dsihotel.com/dsi-logo-gold.png", alt: "DSI Hotel", style: { height: 64 } })
          ),
          React.createElement('div', { style: { color: "rgba(255,255,255,.45)", fontSize: 13 } }, "Réinitialisation du mot de passe")
        ),
        React.createElement('div', { style: { background: "rgba(255,255,255,.05)", borderRadius: 14, padding: 28, border: `1px solid ${G}30` } },
          recoveryDone
            ? React.createElement('div', null,
                React.createElement('div', { style: { color: "#9AE6B4", fontSize: 14, lineHeight: 1.5, marginBottom: 18, textAlign: "center" } }, "✅ Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter."),
                React.createElement('button', { onClick: () => { setRecoveryMode(false); setRecoveryDone(false); setRecoveryStep("pw"); }, style: { width: "100%", padding: 11, background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 15, fontWeight: 500, cursor: "pointer" } }, "Aller à la connexion")
              )
            : recoveryStep === "mfa"
            ? React.createElement('div', null,
                React.createElement('div', { style: { color: "rgba(255,255,255,.55)", fontSize: 12.5, lineHeight: 1.5, marginBottom: 16 } }, "Ce compte est protégé par la double authentification. Entrez le code à 6 chiffres de votre application d'authentification pour confirmer."),
                React.createElement('div', { style: { marginBottom: 14 } },
                  React.createElement('input', { value: recoveryMfaCode, onChange: e => { setRecoveryMfaCode(e.target.value); setRecoveryErr(""); }, onKeyDown: e => e.key === "Enter" && submitRecoveryMfa(), inputMode: "numeric", maxLength: 6, placeholder: "123456", style: { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.08)", border: `1px solid ${G}35`, borderRadius: 8, color: "white", fontSize: 18, letterSpacing: "4px", textAlign: "center", outline: "none", boxSizing: "border-box" } })
                ),
                recoveryErr && React.createElement('div', { style: { color: "#FC8181", fontSize: 13, marginBottom: 14 } }, recoveryErr),
                React.createElement('button', { onClick: submitRecoveryMfa, disabled: recoveryBusy, style: { width: "100%", padding: 11, background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 15, fontWeight: 500, cursor: recoveryBusy ? "default" : "pointer", opacity: recoveryBusy ? 0.6 : 1 } }, recoveryBusy ? "Vérification..." : "Confirmer et valider"),
                React.createElement('button', { onClick: () => { setRecoveryStep("pw"); setRecoveryMfaCode(""); setRecoveryErr(""); }, style: { width: "100%", marginTop: 10, padding: 9, background: "none", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.5)", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "← Retour")
              )
            : React.createElement('div', null,
                React.createElement('div', { style: { color: "rgba(255,255,255,.55)", fontSize: 12.5, lineHeight: 1.5, marginBottom: 16 } }, "Choisissez un nouveau mot de passe : 8 caractères minimum, avec au moins une minuscule, une majuscule, un chiffre et un caractère spécial."),
                React.createElement('div', { style: { marginBottom: 12 } },
                  React.createElement('input', { type: "password", value: recoveryPw, onChange: e => { setRecoveryPw(e.target.value); setRecoveryErr(""); }, placeholder: "Nouveau mot de passe", style: { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.08)", border: `1px solid ${G}35`, borderRadius: 8, color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" } })
                ),
                React.createElement('div', { style: { marginBottom: 14 } },
                  React.createElement('input', { type: "password", value: recoveryPw2, onChange: e => { setRecoveryPw2(e.target.value); setRecoveryErr(""); }, onKeyDown: e => e.key === "Enter" && submitRecovery(), placeholder: "Confirmer le mot de passe", style: { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.08)", border: `1px solid ${G}35`, borderRadius: 8, color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" } })
                ),
                recoveryErr && React.createElement('div', { style: { color: "#FC8181", fontSize: 13, marginBottom: 14 } }, recoveryErr),
                React.createElement('button', { onClick: submitRecovery, disabled: recoveryBusy, style: { width: "100%", padding: 11, background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 15, fontWeight: 500, cursor: recoveryBusy ? "default" : "pointer", opacity: recoveryBusy ? 0.6 : 1 } }, recoveryBusy ? "Enregistrement..." : "Valider le nouveau mot de passe")
              )
        )
      )
    );
  }

  if (!session || !profile) {
    return React.createElement('div', { style: { minHeight: "100vh", background: SB, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" } },
      React.createElement('div', { style: { width: 420, maxWidth: "100%" } },
        React.createElement('div', { style: { textAlign: "center", marginBottom: 28 } },
          React.createElement('div', { style: { display: "inline-flex", alignItems: "center", marginBottom: 10 } },
            React.createElement('img', { src: "https://www.dsihotel.com/dsi-logo-gold.png", alt: "DSI Hotel", style: { height: 64 } })
          ),
          React.createElement('div', { style: { color: "rgba(255,255,255,.45)", fontSize: 13 } }, "Intranet Procédures & Support"),
          React.createElement('a', { href: "https://www.dsihotel.com", target: "_blank", rel: "noopener noreferrer", style: { display: "inline-block", marginTop: 8, color: G, fontSize: 13, fontWeight: 600, textDecoration: "none" } }, "🌐 www.dsihotel.com")
        ),
        React.createElement('div', { style: { background: "rgba(255,255,255,.05)", borderRadius: 14, padding: 28, border: `1px solid ${G}30` } },
          React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement('label', { style: { display: "block", color: "rgba(255,255,255,.6)", fontSize: 11, letterSpacing: "1px", marginBottom: 5 } }, "ADRESSE EMAIL"),
            React.createElement('input', { value: email, onChange: e => { setEmail(e.target.value); setLoginErr(""); }, onKeyDown: e => e.key === "Enter" && doLogin(), placeholder: "votre@email.com", style: { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.08)", border: `1px solid ${G}35`, borderRadius: 8, color: "white", fontSize: 14, outline: "none" } })
          ),
          React.createElement('div', { style: { marginBottom: 18 } },
            React.createElement('label', { style: { display: "block", color: "rgba(255,255,255,.6)", fontSize: 11, letterSpacing: "1px", marginBottom: 5 } }, "MOT DE PASSE"),
            React.createElement('div', { style: { position: "relative" } },
              React.createElement('input', { type: showPw ? "text" : "password", value: pw, onChange: e => { setPw(e.target.value); setLoginErr(""); }, onKeyDown: e => e.key === "Enter" && doLogin(), placeholder: "••••••••", style: { width: "100%", padding: "10px 40px 10px 13px", background: "rgba(255,255,255,.08)", border: `1px solid ${G}35`, borderRadius: 8, color: "white", fontSize: 14, outline: "none" } }),
              React.createElement('button', { type: "button", onClick: () => setShowPw(!showPw), tabIndex: -1, style: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.45)", fontSize: 15, padding: 4 } }, showPw ? "🙈" : "👁️")
            )
          ),
          loginErr && React.createElement('div', { style: { color: "#FC8181", fontSize: 13, marginBottom: 14 } }, loginErr),
          React.createElement('button', { onClick: doLogin, disabled: loggingIn, style: { width: "100%", padding: 11, background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 15, fontWeight: 500, cursor: loggingIn ? "default" : "pointer", opacity: loggingIn ? 0.6 : 1 } }, loggingIn ? "Connexion..." : "Se connecter"),
          React.createElement('div', { style: { textAlign: "center", marginTop: 14 } },
            React.createElement('button', { type: "button", onClick: () => { setForgotOpen(!forgotOpen); setForgotMsg(""); setForgotEmail(email || ""); }, style: { background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline", padding: 4 } }, "Mot de passe oublié ?")
          ),
          forgotOpen && React.createElement('div', { style: { marginTop: 12, paddingTop: 16, borderTop: `1px solid ${G}25` } },
            React.createElement('div', { style: { color: "rgba(255,255,255,.55)", fontSize: 12, lineHeight: 1.5, marginBottom: 10 } },
              "Indiquez votre adresse email : vous recevrez un lien pour définir vous-même un nouveau mot de passe."
            ),
            React.createElement('input', { value: forgotEmail, onChange: e => { setForgotEmail(e.target.value); setForgotMsg(""); }, onKeyDown: e => e.key === "Enter" && submitForgot(), placeholder: "votre@email.com", style: { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.08)", border: `1px solid ${G}35`, borderRadius: 8, color: "white", fontSize: 14, outline: "none", marginBottom: 10 } }),
            forgotMsg && React.createElement('div', { style: { fontSize: 12.5, marginBottom: 10, color: forgotMsg.startsWith("✅") ? "#9AE6B4" : "#FC8181", lineHeight: 1.4 } }, forgotMsg),
            React.createElement('button', { onClick: submitForgot, disabled: forgotBusy, style: { width: "100%", padding: 10, background: "transparent", border: `1px solid ${G}`, color: G, borderRadius: 7, fontSize: 13.5, fontWeight: 500, cursor: forgotBusy ? "default" : "pointer", opacity: forgotBusy ? 0.6 : 1 } }, forgotBusy ? "Envoi..." : "Envoyer la demande")
          )
        )
      )
    );
  }

  // ---------- ÉCRAN MFA : bloque l'accès (admin + superviseur) tant que le code n'est pas validé ----------
  if (mfaRequired && mfaState !== "ok") {
    const inputMfa = { width: "100%", padding: "12px 14px", background: "rgba(255,255,255,.08)", border: `1px solid ${G}35`, borderRadius: 8, color: "white", fontSize: 22, letterSpacing: "6px", textAlign: "center", outline: "none", fontFamily: "monospace" };

    return React.createElement('div', { style: { minHeight: "100vh", background: SB, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" } },
      React.createElement('div', { style: { width: 440, maxWidth: "100%" } },
        React.createElement('div', { style: { textAlign: "center", marginBottom: 24 } },
          React.createElement('img', { src: "https://www.dsihotel.com/dsi-logo-gold.png", alt: "DSI Hotel", style: { height: 54 } }),
          React.createElement('div', { style: { color: "rgba(255,255,255,.45)", fontSize: 13, marginTop: 8 } }, "Vérification en deux étapes")
        ),

        mfaState === "checking" && React.createElement('div', { style: { background: "rgba(255,255,255,.05)", borderRadius: 14, padding: 28, border: `1px solid ${G}30`, textAlign: "center", color: "rgba(255,255,255,.5)", fontSize: 13 } }, "Vérification de la sécurité..."),

        mfaState === "enroll" && React.createElement('div', { style: { background: "rgba(255,255,255,.05)", borderRadius: 14, padding: 28, border: `1px solid ${G}30` } },
          React.createElement('div', { style: { color: G, fontSize: 15, fontWeight: 600, marginBottom: 6 } }, "🔐 Activation obligatoire"),
          React.createElement('div', { style: { color: "rgba(255,255,255,.6)", fontSize: 12.5, lineHeight: 1.6, marginBottom: 18 } },
            "Votre compte nécessite une double authentification. Scannez ce QR code avec une application d'authentification (Google Authenticator, Microsoft Authenticator, Authy…)."
          ),
          mfaQr && React.createElement('div', { style: { background: "white", borderRadius: 10, padding: 14, display: "flex", justifyContent: "center", marginBottom: 14 } },
            React.createElement('img', { src: mfaQr, alt: "QR code MFA", style: { width: 190, height: 190, display: "block" } })
          ),
          mfaSecret && React.createElement('div', { style: { marginBottom: 18 } },
            React.createElement('div', { style: { color: "rgba(255,255,255,.4)", fontSize: 10.5, marginBottom: 5 } }, "Ou saisissez cette clé manuellement :"),
            React.createElement('div', { style: { background: "rgba(255,255,255,.08)", borderRadius: 7, padding: "9px 11px", color: G, fontSize: 12.5, fontFamily: "monospace", wordBreak: "break-all", userSelect: "all" } }, mfaSecret)
          ),
          React.createElement('div', { style: { color: "rgba(255,255,255,.6)", fontSize: 12, marginBottom: 8 } }, "Entrez ensuite le code affiché par l'application :"),
          React.createElement('input', { value: mfaCode, onChange: e => { setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setMfaErr(""); }, onKeyDown: e => e.key === "Enter" && submitMfaCode(), placeholder: "000000", inputMode: "numeric", autoFocus: true, style: inputMfa }),
          mfaErr && React.createElement('div', { style: { color: "#FC8181", fontSize: 12.5, marginTop: 12 } }, mfaErr),
          React.createElement('button', { onClick: submitMfaCode, disabled: mfaBusy || mfaCode.length !== 6, style: { width: "100%", marginTop: 16, padding: 12, background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (mfaBusy || mfaCode.length !== 6) ? "default" : "pointer", opacity: (mfaBusy || mfaCode.length !== 6) ? 0.5 : 1 } }, mfaBusy ? "Vérification..." : "Activer et continuer"),
          React.createElement('div', { style: { background: "rgba(221,107,32,.12)", border: "1px solid rgba(221,107,32,.35)", borderRadius: 8, padding: "10px 12px", marginTop: 16, fontSize: 11.5, color: "#F6AD55", lineHeight: 1.6 } },
            "⚠️ Conservez précieusement l'accès à cette application. Sans elle, la connexion sera impossible."
          ),
          React.createElement('button', { onClick: doLogout, style: { width: "100%", marginTop: 12, padding: 9, background: "none", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.5)", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Annuler et se déconnecter")
        ),

        mfaState === "challenge" && React.createElement('div', { style: { background: "rgba(255,255,255,.05)", borderRadius: 14, padding: 28, border: `1px solid ${G}30` } },
          React.createElement('div', { style: { color: G, fontSize: 15, fontWeight: 600, marginBottom: 6 } }, "🔐 Code de vérification"),
          React.createElement('div', { style: { color: "rgba(255,255,255,.6)", fontSize: 12.5, lineHeight: 1.6, marginBottom: 18 } },
            "Ouvrez votre application d'authentification et saisissez le code à 6 chiffres affiché."
          ),
          React.createElement('input', { value: mfaCode, onChange: e => { setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setMfaErr(""); }, onKeyDown: e => e.key === "Enter" && submitMfaCode(), placeholder: "000000", inputMode: "numeric", autoFocus: true, style: inputMfa }),
          mfaErr && React.createElement('div', { style: { color: "#FC8181", fontSize: 12.5, marginTop: 12 } }, mfaErr),
          React.createElement('button', { onClick: submitMfaCode, disabled: mfaBusy || mfaCode.length !== 6, style: { width: "100%", marginTop: 16, padding: 12, background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (mfaBusy || mfaCode.length !== 6) ? "default" : "pointer", opacity: (mfaBusy || mfaCode.length !== 6) ? 0.5 : 1 } }, mfaBusy ? "Vérification..." : "Vérifier"),
          React.createElement('button', { onClick: doLogout, style: { width: "100%", marginTop: 12, padding: 9, background: "none", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.5)", borderRadius: 7, fontSize: 12, cursor: "pointer" } }, "Se déconnecter")
        )
      )
    );
  }

// ---------- SÉLECTEUR D'ÉTABLISSEMENT (superviseur multi-hôtels) ----------
  if (multiHotel && !hotelChoisi) {
    return React.createElement('div', { style: { minHeight: "100vh", background: SB, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui,-apple-system,sans-serif" } },
      React.createElement('div', { style: { width: 760, maxWidth: "100%" } },
        React.createElement('div', { style: { textAlign: "center", marginBottom: 26 } },
          React.createElement('img', { src: "https://www.dsihotel.com/dsi-logo-gold.png", alt: "DSI Hotel", style: { height: 54 } }),
          React.createElement('div', { style: { color: "white", fontSize: 18, fontWeight: 600, marginTop: 14 } }, "Bonjour" + (profile && profile.full_name ? " " + String(profile.full_name).split(/\s+/)[0] : "")),
          React.createElement('div', { style: { color: "rgba(255,255,255,.5)", fontSize: 13, marginTop: 4 } }, "Choisissez l'établissement à consulter")
        ),
        React.createElement('div', { style: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(220px,1fr))", gap: 14 } },
          mesHotels.map(h => React.createElement('button', { key: h.id, onClick: () => changerHotelActif(h.id), disabled: hotelSwitchBusy,
              style: { background: "rgba(255,255,255,.05)", border: "1px solid " + (h.id === profile?.hotel_id ? G : G + "30"), borderRadius: 14, padding: "20px 16px", cursor: hotelSwitchBusy ? "wait" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: hotelSwitchBusy ? 0.6 : 1 } },
            React.createElement('div', { style: { background: "white", borderRadius: 10, width: "100%", height: 74, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box" } },
              h.logo_url ? React.createElement('img', { src: h.logo_url, alt: h.name, style: { maxHeight: 58, maxWidth: "100%", objectFit: "contain" } }) : React.createElement('span', { style: { fontSize: 30 } }, "🏨")),
            React.createElement('div', { style: { color: "white", fontSize: 14, fontWeight: 600, textAlign: "center" } }, h.name),
            h.city && React.createElement('div', { style: { color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: -6 } }, h.city)
          ))
        ),
        React.createElement('div', { style: { textAlign: "center", marginTop: 22 } },
          React.createElement('button', { onClick: doLogout, style: { background: "none", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.5)", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "8px 16px" } }, "Se déconnecter"))
      )
    );
  }

  // Sélecteur compact pour changer d'hôtel depuis l'en-tête (superviseur multi-hôtels)
  const hotelSwitcher = (dark) => multiHotel && React.createElement('select', {
    value: profile?.hotel_id || "", disabled: hotelSwitchBusy, onChange: e => changerHotelActif(e.target.value),
    title: "Changer d'établissement",
    style: { padding: "6px 9px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", maxWidth: 230,
      border: "1px solid " + (dark ? G + "55" : G), background: dark ? "rgba(255,255,255,.08)" : "#FFFDF5", color: dark ? "white" : "#1a1a3e" } },
    mesHotels.map(h => React.createElement('option', { key: h.id, value: h.id, style: { color: "#111" } }, "🏨 " + h.name))
  );

const nav = isAdmin
    ? (() => {
        const items = ADMIN_SECTIONS.filter(s => hasPerm(s.key === "ninjaone" ? "docs" : s.key)).map(s => ({ p: s.page, icon: s.icon, label: s.label, grp: s.grp }));
        // Tableau de bord en tête de menu
        items.unshift({ p: "accueil", icon: "🏠", label: "Tableau de bord" });
        // Modèles de demande (demandes internes) — groupe Support
        items.push({ p: "templates", icon: "📋", label: "Modèles de demande", grp: "sup" });
        // Groupe Administration (super-admin uniquement), en fin de menu
        if (isSuperAdmin) {
          items.push(
            { p: "admins", icon: "👥", label: "Administrateurs", grp: "adm" },
            { p: "login-logs", icon: "🕓", label: "Journal des connexions", grp: "adm" },
            { p: "securite", icon: "🔐", label: "Double authentification", grp: "adm" },
            { p: "suppr-ticket", icon: "🗑️", label: "Suppression de ticket", grp: "adm" }
          );
        } else {
          items.push({ p: "securite", icon: "🔐", label: "Mes téléphones (MFA)" });
        }
        return items;
      })()
    : [
        { p: "accueil", icon: "🏠", label: "Accueil" },
        // Côté client : même présentation en groupes dépliables que l'espace admin
        { p: "contact", icon: "📧", label: "Nouvelle demande", grp: "assist" },
        ...(isSupervisor ? [{ p: "tickets-client", icon: "🎫", label: "Mes demandes", grp: "assist" }] : []),
        { p: "templates", icon: "📋", label: "Modèles de demande", grp: "assist" },
        { p: "knowledge", icon: "📖", label: "Procédures", grp: "assist" },
        { p: "mon-installation", icon: "🗂️", label: "Mon infrastructure", grp: "hotel" },
        ...(isSupervisor ? [{ p: "historique-comptes", icon: "🗃️", label: "Historique des comptes", grp: "hotel" }] : []),
        ...(isSupervisor ? [{ p: "securite", icon: "🔐", label: "Mes téléphones (MFA)", grp: "hotel" }] : []),
        ...(isSupervisor ? [{ p: "rapport-tickets", icon: "📈", label: "Suivi des tickets", grp: "rap" }] : []),
        ...(isSupervisor ? [{ p: "rapport-securite", icon: "🖥️", label: "Rapports de sécurité", grp: "rap" }] : []),
        ...(isSupervisor ? [{ p: "rapport-intervention", icon: "🔧", label: "Rapports d'intervention", grp: "rap" }] : []),
        ...(isSupervisor ? [{ p: "licences-m365", icon: "🪪", label: "Licences Microsoft 365", grp: "rap" }] : []),
        ...(multiHotel ? [{ p: "capex", icon: "💰", label: "CAPEX", grp: "rap" }] : [])
      ];
  let content = null;

  // ---------- CAPEX (admin : saisie ; compte de groupe : consultation + modification) ----------
  if (page === "capex" && (isAdmin || multiHotel)) content = Page_capex({
    content, CAPEX_CATS, CAPEX_PRIOS, CAPEX_PRIO_COUL, CAPEX_STATUTS, CAPEX_STATUT_COUL, cxAnnee, cxAuteur,
    cxErr, cxForm, cxHotel, cxLoading, cxMaj, cxModal, cxNewFiles, cxRows, cxSaving, cxStatut, hotels,
    isAdmin, isMobile, loadCapex, mesHotels, session, setCxAnnee, setCxForm, setCxHotel, setCxModal,
    setCxNewFiles, setCxRows, setCxSaving, setCxStatut,
    cxOuverts, setCxOuverts, cxAuto, setCxAuto, loadCxAuto, callSophosApi
  });

  // ---------- SUPPRESSION DÉFINITIVE D'UN TICKET (super-admin uniquement) ----------
  if (page === "suppr-ticket" && isSuperAdmin) content = Page_suppr_ticket({
    content, chargerTicketsHotel, confirmationOK, hotels, motConfirmation, rechercherTicketASupprimer,
    setSupprConfirm, setSupprNote, setSupprRef, setSupprTicket, supprBusy, supprConfirm, supprHotel,
    supprListe, supprListeBusy, supprNote, supprRef, supprTicket, supprimerTicketDefinitif
  });

  // ---------- PAGE D'ACCUEIL (admin = orienté action ; client = vitrine) ----------
  if (page === "accueil") content = Page_accueil({
    content, bkAncienChecks, bkGroupes, bkStats, go, hotels, isAdmin, isMobile, isSupervisor, msAlertes,
    msTenants, myHotelId, procedures, profile, rappelsDus, soAlertes, soComptes, soDedoublonner, ticketState,
    tickets
  });

  // ---------- ADMIN : GESTION CLIENTS ----------
  if (page === "client-admin" && isAdmin) content = Page_client_admin({
    content, addAccountErr, addAccountForm, addAccountHotel, ajouterRecoMail, clientErr, clientExistingFiles,
    clientForm, clientLogoFile, clientNewFiles, clientSearch, clientStats, deleteClient, editingClientId, go,
    hotels, hotelsLoading, isMobile, mapGeoStatus, openEditClientForm, openNewClientForm, recoMail, recoNew,
    removeExistingClientFile, resetPwBusy, resetPwTarget, resetPwValue, savingAccount, savingClient,
    setAddAccountErr, setAddAccountForm, setAddAccountHotel, setClientForm, setClientLogoFile,
    setClientNewFiles, setClientSearch, setEditCid, setRecoNew, setResetPwTarget, setResetPwValue,
    setShowClientForm, setShowClientMap, setTicketSearch, showClientForm, showClientMap, submitAddAccount,
    submitClientForm, submitResetPassword, supprimerRecoMail
  });

  // ---------- SUPER-ADMIN : GESTION DES ADMINS ----------
  if (page === "admins" && isSuperAdmin) content = Page_admins({
    content, ADMIN_SECTIONS, PERM_LABELS, adminErr, adminForm, adminMfa, admins, adminsLoading, deleteAdmin,
    editingAdminPerms, isMobile, openAdminMfa, removeAdminFactor, resetAdminMfa, saveAdminPerms, savingAdmin,
    setAdminErr, setAdminForm, setAdminMfa, setEditingAdminPerms, setShowAdminForm, showAdminForm,
    submitAdminForm, togglePerm
  });

  // ---------- SUPER-ADMIN : JOURNAL DE CONNEXIONS ----------
  if (page === "login-logs" && isSuperAdmin) content = Page_login_logs({
    content, isMobile, loadLoginLogs, loginLogFilter, loginLogs, loginLogsLoading, setLoginLogFilter
  });

  // ---------- SUPER-ADMIN : SÉCURITÉ (appareils MFA) ----------
  if (page === "securite" && (isAdmin || isSupervisor)) content = Page_securite({
    content, isSupervisor, secAddCode, secAddName, secAddQr, secAddSecret, secBusy, secCancelAdd,
    secConfirmAdd, secFactors, secLoading, secMsg, secRemove, secStartAdd, setSecAddCode, setSecAddName
  });

  // ---------- ADMIN : RAPPORTS NINJAONE ----------
  if (page === "ninjaone" && isAdmin) content = Page_ninjaone({
    content, hotels, isMobile, njHotelFilter, njLoading, njRapports, rattacherRapport, setNjHotelFilter,
    supprimerRapport
  });

  // ---------- ADMIN : GESTION PROCÉDURES ----------
  if (page === "proc-admin" && isAdmin) content = Page_proc_admin({
    content, deleteProc, editCid, editingId, hotels, isMobile, kbCat, loadFilesFor, openEditProcForm,
    openNewProcForm, openViewer, procFiles, procForm, procFormExistingFiles, procFormFiles, procFormHotels,
    procedures, procq, procsLoading, removeExistingProcFile, savingProc, selId, setEditCid, setKbCat,
    setProcForm, setProcFormFiles, setProcFormHotels, setProcq, setSelId, setShowHotelPick, setShowProcForm,
    showHotelPick, showProcForm, submitProcForm
  });

  // ---------- CLIENT : PROCÉDURES ----------
  if (page === "knowledge" && !isAdmin) content = Page_knowledge({
    content, go, kbCat, loadFilesFor, openViewer, procFiles, procedures, procq, procsLoading, selId,
    setKbCat, setProcq, setSelId
  });

  // ---------- DÉTAIL PROCÉDURE (client + admin preview) ----------
  if (page === "proc-detail" && selP) content = Page_proc_detail({
    content, go, isAdmin, openViewer, procFiles, selP
  });

  // ---------- CONTACT ----------
  if (page === "templates" && (isSupervisor || isAdmin || !!myHotelId)) content = Page_templates({
    content, TEMPLATES, champVisible, creneauxPris, isMobile, ouvrirTemplate, setTplActif, setTplDemandeur,
    setTplValues, soumettreTemplate, tplActif, tplDemandeur, tplError, tplOk, tplSending, tplValues
  });

  if (page === "contact" && !isAdmin) content = Page_contact({
    content, client, go, handleSupportFilesAdd, isMobile, loadFilesFor, procSearch, removeSupportFile,
    setProcSearch, setSupportForm, setSupportSent, submitSupportForm, suggestedProcs, supportError,
    supportForm, supportSending, supportSent
  });

  // ---------- ADMIN : TICKETS ----------
  const toggleMergeSel = (id) => {
    setMergeSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleCloseSel = (id) => {
    setCloseSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const doCloseTickets = async () => {
    if (closeSel.length < 1) return;
    if (!confirm(`Fermer ${closeSel.length} ticket${closeSel.length > 1 ? "s" : ""} ?`)) return;
    setCloseBusy(true);
    try {
      // Découpe en lots : une seule requête .in() avec trop d'IDs dépasse la
      // longueur d'URL autorisée et échoue silencieusement au-delà de ~100-1000 IDs.
      const CHUNK = 200;
      for (let i = 0; i < closeSel.length; i += CHUNK) {
        const lot = closeSel.slice(i, i + CHUNK);
        const { error } = await sb.from("tickets").update({ status: "closed", closed_at: new Date().toISOString() }).in("id", lot);
        if (error) throw error;
      }
      setCloseMode(false);
      setCloseSel([]);
      await loadTickets();
    } catch (e) {
      alert("Erreur lors de la fermeture : " + (e.message || e));
    } finally {
      setCloseBusy(false);
    }
  };

  const doMergeTickets = async () => {
    if (mergeSel.length < 2) return;
    // Ticket de destination = le plus ancien parmi les sélectionnés
    const selected = tickets.filter(t => mergeSel.includes(t.id));
    const dest = selected.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
    const others = selected.filter(t => t.id !== dest.id);
    if (!confirm(`Fusionner ${selected.length} tickets dans ${dest.reference || "le plus ancien"} ?\nLes autres seront fermés et vidés dans celui-ci.`)) return;
    setMergeBusy(true);
    try {
      for (const o of others) {
        // Déplace les messages
        await sb.from("ticket_messages").update({ ticket_id: dest.id }).eq("ticket_id", o.id);
        // Déplace les pièces jointes
        await sb.from("ticket_fichiers").update({ ticket_id: dest.id }).eq("ticket_id", o.id);
        // Message système marquant la fusion
        await sb.from("ticket_messages").insert({
          ticket_id: dest.id, sender_role: "admin", sender_name: "Système",
          body: `--- Ticket ${o.reference || o.id} (${o.subject || "sans objet"}) fusionné ici ---`
        });
        // Ferme le ticket source
        await sb.from("tickets").update({ status: "closed", closed_at: new Date().toISOString(), subject: "[Fusionné dans " + (dest.reference || dest.id) + "] " + (o.subject || "") }).eq("id", o.id);
      }
      // Rouvre le ticket de destination si besoin
      await sb.from("tickets").update({ status: "open" }).eq("id", dest.id);
      setMergeMode(false);
      setMergeSel([]);
      await loadTickets();
      loadTicketMsgs(dest.id);
      setOpenTicketId(dest.id);
    } catch (e) {
      alert("Erreur lors de la fusion : " + (e.message || e));
    } finally {
      setMergeBusy(false);
    }
  };

  if (page === "tickets-admin" && isAdmin) content = Page_tickets_admin({
    content, BK_FREQS, adressesConnues, applyReponseType, apprendreDomaineTicket, assignerTechnicien,
    audioCtxRef, audioReadyRef, badgeValidation, closeBusy, closeMode, closeSel, closeTicket,
    creerTicketTelephone, creneauBusy, creneauCommentaire, creneauTicket, dernierMessageTicket,
    doCloseTickets, doMergeTickets, enregistrerNote, estTicketArrivee, extraireCcDuFil, freqBusy,
    frequenceDepuisTicket, genererAttestation, hotels, hoverTk, isAdmin, isMobile, jouerSonAlerte,
    loadTickets, marquerBackupRelance, menuActionsTicket, mergeBusy, mergeMode, mergeSel, msgsSansDoublon,
    nettoyerEmail, nettoyerSignature, nomTechnicien, noteBusy, noteOpenId, noteSaved, noteText, onRowEnter,
    onRowLeave, onRowMove, openTicketId, openViewer, ouvrirAgent, ouvrirBlocage, ouvrirDeverrouillageAd,
    ouvrirNote, ouvrirTicketTelephone, relanceBusy, renderProvisioning, replyAndClose, replyBusy,
    replyCcList, replyCcManual, replyFiles, replyHtml, replyHtmlOverride, replyImageUrls, replyNote,
    replyText, reponsesTypes, rtStatus, sendReply, session, setCloseMode, setCloseSel, setCreneauCommentaire,
    setFwdEmail, setFwdMsg, setFwdNote, setFwdTicket, setMergeMode, setMergeSel, setNoteOpenId, setNoteText,
    setOpenTicketId, setReplyCcList, setReplyCcManual, setReplyFiles, setReplyHtml, setReplyHtmlOverride,
    setReplyImageUrls, setReplyNote, setReplyText, setTelModal, setTicketFilter, setTicketSearch,
    setTicketStatus, setTicketView, setTickets, setTkMenu, setTkSortPresta, silenceBusy,
    silencerAlerteBackup, statuerCreneauTicket, techniciens, techniciensMenu, telModal, ticketBodies,
    ticketFiles, ticketFilter, ticketMsgs, ticketSearch, ticketState, ticketView, tickets, ticketsLoading,
    tkMenu, tkSortPresta, toggleCloseSel, toggleMergeSel, toggleTicket, validations
  });

  // ---------- CLIENT : MES DEMANDES ----------
  if (page === "tickets-client" && isSupervisor) content = Page_tickets_client({
    content, badgeValidation, closeMode, closeSel, go, loadTickets, mergeMode, mergeSel, msgsSansDoublon,
    nettoyerSignature, openTicketId, openViewer, replyBusy, replyFiles, replyNote, replyText, sendReply,
    setReplyFiles, setReplyText, ticketFiles, ticketMsgs, tickets, ticketsLoading, toggleCloseSel,
    toggleMergeSel, toggleTicket
  });

  // ---------- ADMIN : DOCUMENTATION TECHNIQUE ----------
  if (page === "docs-techniques" && isAdmin) content = Page_docs_techniques({
    content, deleteDoc, docCatFilter, docErr, docExistingFiles, docFiles, docFocusId, docForm, docHotelId,
    docHotelPick, docHotelSearch, docNewFiles, docs, docsLoading, editingDocId, hotels, isAdmin, isMobile,
    openEditDocForm, openNewDocForm, openViewer, removeExistingDocFile, savingDoc, setDocCatFilter,
    setDocFocusId, setDocForm, setDocHotelId, setDocHotelPick, setDocHotelSearch, setDocNewFiles,
    setShowDocForm, showDocForm, submitDocForm, toggleDocVisible
  });

  // ---------- CLIENT : MON INSTALLATION (fiches partagées) ----------
  if (page === "mon-installation" && !isAdmin) content = Page_mon_installation({
    content, docCatFilter, docFiles, docs, docsLoading, isAdmin, isMobile, openViewer, setDocCatFilter,
    setDocFocusId
  });

  // ---------- CLIENT : RAPPORT SÉCURITÉ (NinjaOne) ----------
  if (page === "rapport-securite" && isSupervisor) content = Page_rapport_securite({
    content, njLoading, njRapports
  });

  // ---------- RAPPORT DE SUIVI DES TICKETS ----------
  // Tableau + barre de synthèse + boutons export, partagés admin/superviseur.
  const renderRapportTicketsTable = () => {
    const st = rapTkStats;
    const stColor = (s) => s === "closed" ? "#999" : "#2F855A";
    const PRIO_COUL = { "Urgent": "#C53030", "Haute": "#DD6B20", "Moyenne": "#2B6CB0", "Basse": "#718096" };
    const prColor = (p) => PRIO_COUL[p] || "#718096";
    const pastille = (txt, c, bg) => React.createElement('span', { style: { fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, color: c, background: bg, whiteSpace: "nowrap" } }, txt);
    const cellDelai = (h, etat, enCours) => {
      if (h === null || h === undefined) return etat === "ko" ? pastille("en retard", "#C53030", "#FDECEC") : React.createElement('span', { style: { color: "#AAA", fontSize: 11 } }, enCours ? "en cours" : "—");
      return etat === "ko" ? pastille(fmtDelai(h), "#C53030", "#FDECEC") : pastille(fmtDelai(h), "#2F855A", "#E9F6EE");
    };
    const finLbl = rapTkAu ? fmtDateFr(rapTkAu) : "aujourd'hui";
    const slaCoul = st.slaPct == null ? "#718096" : st.slaPct >= 90 ? "#2F855A" : st.slaPct >= 75 ? "#C05621" : "#C53030";
    const totType = (st.incidents || 0) + (st.demandes || 0);
    const pct = (n, tot) => tot ? Math.round(100 * n / tot) + " %" : "";
    const carte = { background: "white", border: "1px solid #E8E8F0", borderRadius: 10, padding: "12px 15px" };
    const tuile = (lbl, val, sous, coul) => React.createElement('div', { style: { ...carte, flex: "1 1 160px", borderLeft: "4px solid " + coul } },
      React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 4 } }, lbl),
      React.createElement('div', { style: { fontSize: 24, fontWeight: 700, color: coul, lineHeight: 1.15 } }, String(val)),
      sous && React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 3 } }, sous));
    const th = (txt, extra) => React.createElement('th', { style: Object.assign({ textAlign: "left", padding: "9px 10px", fontSize: 11, fontWeight: 600, color: "#666", borderBottom: "2px solid #E8E8F0", whiteSpace: "nowrap" }, extra || {}) }, txt);
    const td = (child, extra) => React.createElement('td', { style: Object.assign({ padding: "9px 10px", fontSize: 12, color: "#333", borderBottom: "1px solid #F2F2F6", verticalAlign: "top" }, extra || {}) }, child);
    const delaiBloc = (lbl, med, moy) => React.createElement('div', { style: { flex: 1 } },
      React.createElement('div', { style: { fontSize: 11, color: "#888" } }, lbl + " (médiane)"),
      React.createElement('div', { style: { fontSize: 19, fontWeight: 700, color: "#1a1a3e" } }, fmtDelai(med)),
      moy != null && React.createElement('div', { style: { fontSize: 11, color: "#999" } }, "moyenne " + fmtDelai(moy)));
    return React.createElement('div', null,
      React.createElement('details', { style: { ...carte, marginBottom: 12, fontSize: 12, color: "#444" } },
        React.createElement('summary', { style: { cursor: "pointer", fontWeight: 700, color: "#1a1a3e" } }, "ℹ️ Comment lire ce rapport : horaires, priorités, colonnes"),
        React.createElement('div', { style: { display: "flex", gap: 18, flexWrap: "wrap", marginTop: 10, lineHeight: 1.55 } },
          React.createElement('div', { style: { flex: "1 1 300px" } },
            React.createElement('div', { style: { fontWeight: 700, marginBottom: 4 } }, "Horaires et calcul des délais"),
            React.createElement('div', null, "Support ouvert du lundi au vendredi, de " + SLA_H_DEBUT + " h à " + SLA_H_FIN + " h. Les délais sont en heures ouvrées : nuits et week-ends ne sont pas décomptés (1 jour ouvré = " + SLA_JOUR_H + " h)."),
            React.createElement('div', null, "Le week-end, nous restons joignables pour toute urgence P1."),
            React.createElement('div', null, "Statut « Prestataire » : la résolution dépend d'un autre prestataire ; nous gardons le ticket ouvert pour le suivi. Il n'est pas compté dans le SLA de résolution.")),
          React.createElement('div', { style: { flex: "1 1 300px" } },
            React.createElement('div', { style: { fontWeight: 700, marginBottom: 4 } }, "Priorités"),
            SLA_PRIORITES.map(sp => React.createElement('div', { key: sp.p }, React.createElement('b', { style: { color: prColor(sp.p) } }, sp.code + " " + sp.p), " : " + ((PRIORITE_DEFS[sp.p] || {}).txt || "") + " Cibles : " + fmtCibleSla(sp.rep) + " / " + fmtCibleSla(sp.res) + "."))),
          React.createElement('div', { style: { flex: "1 1 300px" } },
            React.createElement('div', { style: { fontWeight: 700, marginBottom: 4 } }, "Colonnes"),
            COLONNES_DEFS.map(([t, d]) => React.createElement('div', { key: t }, React.createElement('b', null, t), " : " + d))))
      ),
      // ---- Tableau de bord : ligne 1 ----
      React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 } },
        tuile("Créés sur la période", st.crees, "nouvelles demandes de l'hôtel", "#0F0F24"),
        tuile("Fermés sur la période", st.fermes, "y compris tickets antérieurs", "#2F855A"),
        tuile("En cours au " + finLbl, st.enCoursFin, st.enCoursPresta ? "dont " + st.enCoursPresta + " suivi(s) chez un prestataire" : "reste à traiter en fin de période", "#2B6CB0"),
        tuile("Respect des SLA", st.slaPct == null ? "—" : st.slaPct + " %", st.slaEvalues ? st.horsSla + " ticket(s) hors SLA sur " + st.slaEvalues : "aucun ticket évaluable", slaCoul)
      ),
      // ---- Tableau de bord : ligne 2 ----
      React.createElement('div', { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "stretch" } },
        React.createElement('div', { style: { ...carte, flex: "3 1 420px", overflowX: "auto" } },
          React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: "#1a1a3e", marginBottom: 8 } }, "Par priorité ", React.createElement('span', { style: { fontWeight: 400, color: "#999" } }, "(tickets créés sur la période · délais en heures ouvrées, lun.-ven. " + SLA_H_DEBUT + " h-" + SLA_H_FIN + " h)")),
          React.createElement('table', { style: { width: "100%", borderCollapse: "collapse", minWidth: 480 } },
            React.createElement('thead', null, React.createElement('tr', null,
              th("Priorité"), th("Cible 1re réponse"), th("Cible résolution"), th("Tickets", { textAlign: "center" }), th("Hors SLA réponse", { textAlign: "center" }), th("Hors SLA résolution", { textAlign: "center" }), th("Résolution médiane"))),
            React.createElement('tbody', null, (st.parPrio || []).map(p => React.createElement('tr', { key: p.p },
              td(pastille(p.code + " " + p.p, prColor(p.p), prColor(p.p) + "1A")),
              td(fmtCibleSla(p.rep)), td(fmtCibleSla(p.res)),
              td(React.createElement('b', null, String(p.n)), { textAlign: "center" }),
              td(React.createElement('b', { style: { color: p.horsRep ? "#C53030" : "#2F855A" } }, p.horsRep + (p.n ? " (" + pct(p.horsRep, p.n) + ")" : "")), { textAlign: "center" }),
              td(React.createElement('b', { style: { color: p.horsRes ? "#C53030" : "#2F855A" } }, p.horsRes + (p.n ? " (" + pct(p.horsRes, p.n) + ")" : "")), { textAlign: "center" }),
              td(fmtDelai(p.resolMed))
            )))
          )
        ),
        React.createElement('div', { style: { flex: "2 1 280px", display: "flex", flexDirection: "column", gap: 12 } },
          React.createElement('div', { style: { ...carte, display: "flex", gap: 14 } },
            delaiBloc("1re réponse", st.delaiMed, st.delaiMoy),
            delaiBloc("Résolution", st.resolMed, st.resolMoy)),
          React.createElement('div', { style: carte },
            React.createElement('div', { style: { fontSize: 11, color: "#888", marginBottom: 7 } }, "Incidents / demandes (tickets créés)"),
            React.createElement('div', { style: { display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "#E2E2EA", marginBottom: 7 } },
              totType > 0 && React.createElement('div', { style: { width: (100 * st.incidents / totType) + "%", background: "#DD6B20" } }),
              totType > 0 && React.createElement('div', { style: { width: (100 * st.demandes / totType) + "%", background: "#6B46C1" } })),
            React.createElement('div', { style: { display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 } },
              React.createElement('span', { style: { color: "#DD6B20" } }, st.incidents + " incident(s) " + pct(st.incidents, totType)),
              React.createElement('span', { style: { color: "#6B46C1" } }, st.demandes + " demande(s) " + pct(st.demandes, totType))))
        )
      ),
      // Boutons d'export
      rapTkRows.length > 0 && React.createElement('div', { style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" } },
        React.createElement('button', { onClick: exportRapportTicketsPdf, style: { padding: "8px 15px", background: "#0F0F24", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "📄 Exporter en PDF"),
        React.createElement('button', { onClick: exportRapportTicketsCsv, style: { padding: "8px 15px", background: "white", border: "1px solid #2F855A", color: "#2F855A", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "📊 Exporter en Excel (CSV)"),
        React.createElement('div', { title: "Langue du PDF, de l'export Excel et de l'email envoyé au client (mémorisée pour cet établissement)", style: { display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: 12, color: "#555" } },
          "🌐 Langue du rapport :",
          [["fr", "Français"], ["en", "English"]].map(([code, lbl]) => React.createElement('button', { key: code, onClick: () => setRapTkLang(code), style: { padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid " + (rapTkLang === code ? "#0F0F24" : "#DDD"), background: rapTkLang === code ? "#0F0F24" : "white", color: rapTkLang === code ? "white" : "#555" } }, lbl))
        )
      ),
      // Tableau
      rapTkRows.length > 0
        ? React.createElement('div', { style: { background: "white", borderRadius: 10, border: "1px solid #E8E8F0", overflow: "auto" } },
            React.createElement('table', { style: { width: "100%", borderCollapse: "collapse", minWidth: 1020 } },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  th("Référence"), th("Titre"), th("Type"), th("Priorité"), th("Statut"),
                  th("Ouvert le"), th("Fermé le"), th("Msg", { textAlign: "center" }), th("1re réponse"), th("Résolution")
                )
              ),
              React.createElement('tbody', null,
                rapTkRows.map((r, i) => React.createElement('tr', { key: i },
                  td(React.createElement('span', { style: { fontWeight: 600, color: G2 } }, r.reference)),
                  td(r.subject, { minWidth: 220 }),
                  td(React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700, color: r.type === "demande" ? "#6B46C1" : "#DD6B20" } }, r.type === "demande" ? "Demande" : "Incident")),
                  td(pastille(r.priority, prColor(r.priority), prColor(r.priority) + "1A")),
                  td(r.status !== "closed" && r.prestataire
                    ? React.createElement('span', { title: "Résolution dépendant de " + r.prestataire + " : suivi par DSI Hotel", style: { fontSize: 11, fontWeight: 600, color: "#6B46C1", background: "#F3EEFF", padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" } }, "Prestataire")
                    : React.createElement('span', { style: { fontSize: 11, fontWeight: 600, color: stColor(r.status), background: stColor(r.status) + "18", padding: "2px 9px", borderRadius: 20 } }, r.status === "closed" ? "Fermé" : "Ouvert")),
                  td(fmtDateHeureFr(r.created_at), { whiteSpace: "nowrap", fontSize: 11 }),
                  td(r.closed_at ? fmtDateHeureFr(r.closed_at) : "—", { whiteSpace: "nowrap", fontSize: 11 }),
                  td(String(r.nbMessages), { textAlign: "center" }),
                  td(cellDelai(r.delaiH, r.slaRep, false), { whiteSpace: "nowrap" }),
                  td(r.prestataire
                    ? React.createElement('div', { title: "Hors SLA de résolution : la résolution dépend de " + r.prestataire },
                        r.resolH !== null && React.createElement('div', { style: { fontSize: 11, color: "#888" } }, fmtDelai(r.resolH)),
                        React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: "#6B46C1" } }, "Suivi " + r.prestataire))
                    : cellDelai(r.resolH, r.slaRes, r.status !== "closed"), { whiteSpace: "nowrap" })
                ))
              )
            )
          )
        : (rapTkGenere && React.createElement('div', { style: { padding: 28, textAlign: "center", color: "#999", fontSize: 13, background: "white", borderRadius: 10, border: "1px solid #E8E8F0" } }, "Aucun ticket sur cette période.")),
      rapTkRows.length > 0 && React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 8, lineHeight: 1.6 } },
        "Délais en heures ouvrées (lun.-ven. " + SLA_H_DEBUT + " h-" + SLA_H_FIN + " h, jours fériés non déduits). Vert : dans la cible SLA, rouge : hors SLA. Le type et la priorité se corrigent dans le ticket (barre Technicien / Prestataire).")
    );
  };

  // ---------- RAPPORT JOUR (tickets ouverts par client, pour techniciens) ----------
  if (page === "rapport-jour" && isAdmin) content = Page_rapport_jour({
    content, envoyerRapportJourEmail, exportRapportJourPdf, hotels, rjEmail, rjEnvoi, rjHotel, rjNote,
    rjPick, rjQ, rjTicketsOuverts, setRjEmail, setRjHotel, setRjNote, setRjPick, setRjQ
  });

  // --- Page ADMIN : sélection client + période + génération + envoi ---
  // ---------- BACKUPS (CheckCentral) — admin uniquement ----------
  if (page === "historique-comptes" && (isAdmin || isSupervisor)) content = Page_historique_comptes({
    content, HC_TYPES, badgeValidation, hcErr, hcFiles, hcHotel, hcInfos, hcLoading, hcOpenId, hcRows,
    hcSearch, hcStatut, hcType, hcVoirTicket, hotels, isAdmin, loadHistoriqueComptes, setHcHotel,
    setHcOpenId, setHcSearch, setHcStatut, setHcType, validations
  });

  if (page === "planning" && isAdmin) content = Page_planning({
    content, hotels, isMobile, loadPlanning, plData, plEnregistrer, plErr, plJourM, plJoursDe, plLoading,
    plModal, plModalErr, plOuvrirEdition, plOuvrirNouveau, plSaving, plSemaine, plSupprimer, plTechsDe,
    plWeekend, setPlJourM, setPlModal, setPlSemaine, setPlWeekend
  });

  if (page === "backups" && isAdmin) content = Page_backups({
    content, BK_FILTRES, BK_FREQS, BK_MARGE_H, BK_SEUIL_JOURS, bkAlerte, bkAncienChecks, bkChecks, bkCmpOpen,
    bkComparaison, bkEnregLicence, bkFetchedAt, bkFiltreSt, bkFreq, bkGroupMap, bkGroupes, bkJoursRestants,
    bkLibFreq, bkLicEdit, bkLigneLicence, bkLoading, bkMapBusy, bkMetaCheck, bkMuetsNonJustifies, bkNote,
    bkOldOpen, bkOpenGroups, bkRapport, bkRattacherGroupe, bkRenderFrise, bkRenderHistVeeam, bkRenderRapport,
    bkStats, bkStatusMeta, bkSuggererHotel, bkToggleHistVeeam, bkVeeamHist, bkVue, choisirBkVue,
    definirFrequenceBackup, fmtDateHeureFr2, hotels, isMobile, lancerAlertesBackup, loadBackups,
    renderBackupNote, setBkAlerte, setBkCmpOpen, setBkFiltreSt, setBkLicEdit, setBkOldOpen, setBkOpenGroups
  });

  // ---------- SÉCURITÉ SOPHOS (admin) ----------
  if (page === "checklist" && isAdmin) content = Page_checklist({
    content, CK_STATUTS, ckAjouterPoint, ckAjouterServeur, ckAppliquerStandardPartout, ckChoisirHotel,
    ckCopierPoints, ckErr, ckEstAD, ckFiltre, ckHotel, ckInv, ckLoading, ckMaj, ckMeta, ckNouveau, ckPoints,
    ckServeur, ckServeurs, ckStandardiserAD, ckStdBusy, ckSupprimerPoint, ckSupprimerServeur, ckSynth,
    ckViderServeur, hotels, isMobile, loadCkPoints, setCkFiltre, setCkNouveau, setCkServeur, techniciens
  });

  if (page === "inventaire" && isAdmin) content = Page_inventaire({
    content, adminFromName, hotels, invAjouter, invCarePack, invChoisirHotel, invDetail, invEnregNotes,
    invErr, invEstWindows, invFiltre, invHotel, invImport, invImporterNinja, invLancerImport, invLoading,
    invMaj, invNinja, invNinjaFiltre, invNinjaOuvert, invNotes, invOuvert, invRows, invSupprimer, invSynth,
    invVue, isMobile, loadInv, setInvDetail, setInvFiltre, setInvImport, setInvNinja, setInvNinjaFiltre,
    setInvNinjaOuvert, setInvOuvert, setInvRows, techniciens
  });

  if (page === "sophos" && isAdmin) content = Page_sophos({
    content, fmtDateHeureFr2, hotels, isMobile, loadSoPostes, loadSophos, setSoHotelFiltre, setSoModal,
    setSoNaOuvert, setSoNoteEdit, setSoOpenHotel, setSoSecOuvertes, setSoTab, setSoTpMsg, setSoTpSel,
    setSoVoirIgnores, setSoVoirResolues, soASupprimer, soAffecter, soAlertes, soBusy, soComptes,
    soDedoublonner, soEnregistrerCompte, soEnregistrerNote, soErr, soHotelFiltre, soLoading,
    soMarquerSuppression, soModal, soMsg, soNaOuvert, soNinja, soNinjaOrg, soNonAffectes, soNoteEdit,
    soOpenHotel, soPostes, soPrendreEnCharge, soScanner, soSecOuvertes, soSuggererNinja, soSuggest,
    soSupprimerCompte, soSupprimerSophos, soSynchroniser, soTab, soTamper, soTamperMdp, soTpBasculer,
    soTpBusy, soTpMsg, soTpSel, soViderTelechargements, soVoirIgnores, soVoirResolues,
    soProtModal, setSoProtModal, soEnregistrerProtection
  });

  if (page === "m365" && isAdmin) content = Page_m365({
    content, M365_APP_ID, fmtDateHeureFr2, hotels, loadM365, msAjout, msAjouterTenant, msAlertes, msDomaine,
    msEnregistrerNote, msErr, msFiltre, msLoading, msMajTenant, msMsg, msNoteEdit, msPrendreEnCharge, msTab,
    msTenants, msVoirInfo, msVoirResolues, setMsAjout, setMsDomaine, setMsFiltre, setMsMsg, setMsNoteEdit,
    setMsTab, setMsVoirInfo, setMsVoirResolues, setPendingTicketRef
  });

  if (page === "rapport-tickets" && isAdmin) content = Page_rapport_tickets({
    content, adressesConnues, destinatairesEnvoi, envoyerRapportTicketsEmail, fmtDateFr,
    genererRapportTickets, hotels, ouvrirEnvoiRapport, rapTkAu, rapTkDu, rapTkEnvoi, rapTkGenere, rapTkHotel,
    rapTkLang, rapTkLoading, rapTkNote, rapTkRows, renderRapportTicketsTable, rtkEnvoiModal, setRapTkAu,
    setRapTkDu, setRapTkHotel, setRapTkLang, setRtkEnvoiModal
  });

  // --- Page SUPERVISEUR : lecture seule de son propre hôtel ---
  if (page === "rapport-tickets" && isSupervisor) content = Page_rapport_tickets_superviseur({
    content, genererRapportTickets, hotels, myHotelId, rapTkAu, rapTkDu, rapTkLoading, rapTkNote,
    renderRapportTicketsTable, setRapTkAu, setRapTkDu
  });

  // ---------- CLIENT : RAPPORT INTERVENTION (rapports d'activité) ----------
  // ---------- LICENCES MICROSOFT 365 (admin : tous les hôtels ; superviseur : son établissement) ----------
  if (page === "licences-m365" && (isAdmin || isSupervisor)) content = Page_licences_m365({
    content, exporterLicencesCsv, exporterLicencesPdf, hotels, isAdmin, lmErr, lmHotel, lmLoading, lmRapport,
    lmRecherche, lmTenants, lmVue, loadLicencesM365, mesHotels, myHotelId, setLmErr, setLmHotel,
    setLmRapport, setLmRecherche, setLmVue
  });

  if (page === "rapport-intervention" && isSupervisor) content = Page_rapport_intervention({
    content, downloadRapportPdf, rapLoading, rapports
  });

  // ---------- ADMIN : PROJETS (KANBAN) ----------
  if (page === "projets" && isAdmin) content = Page_projets({
    content, addTacheToForm, deleteProjet, dragOverCol, dragProjId, hotels, isMobile, loadProjets,
    moveProjetToStatut, openEditProjet, openNewProjet, projErr, projExistingFiles, projFichiers,
    projFilterHotel, projForm, projModal, projNewFiles, projNewTache, projTacheList, projTaches, projets,
    projetsLoading, removeExistingProjFile, savingProj, setDragOverCol, setDragProjId, setProjFilterHotel,
    setProjForm, setProjModal, setProjNewFiles, setProjNewTache, setProjTacheList, submitProjForm
  });

  // ================= PAGE : RAPPORTS D'ACTIVITÉ =================
  if (page === "rapports" && isAdmin) content = Page_rapports({
    content, SERVICES_LIST, addLigne, addSrv, confirmSendRapport, deleteRapport, downloadRapportPdf,
    emptyLigne, emptySrv, fmtDateFr, hotels, isMobile, onSelectHotelRapport, openEditRapport, openNewRapport,
    openRapId, openSendRapport, rapDemandes, rapEnvois, rapErr, rapFilterHotel, rapForm, rapHotelsReplies,
    rapLignes, rapLoading, rapModal, rapMoisReplies, rapNote, rapSendModal, rapSendTo, rapSending,
    rapServeurs, rapSrvLignes, rapports, removeLigne, removeLignePJ, removeSrv, savingRap, setLigne,
    setOpenRapId, setRapFilterHotel, setRapForm, setRapHotelsReplies, setRapLignes, setRapModal,
    setRapMoisReplies, setRapNote, setRapSendModal, setRapSendTo, setRapSrvLignes, setSrv, submitRapForm,
    svcLabel, toggleService, uploadLignePJ, uploadingPJ
  });

  // ================= PAGE : RÉPONSES TYPES =================
  if (page === "reponses-types" && isAdmin) content = Page_reponses_types({
    content, deleteReponse, isMobile, openEditReponse, openNewReponse, openRtId, reponsesTypes,
    rtEditorImgInput, rtErr, rtForm, rtInsertImageInEditor, rtLoading, rtModal, rtSaving, rtUploading,
    setOpenRtId, setRtForm, setRtModal, submitRtForm, triggerRtEditorImage
  });

  // ================= AIDE — PROCÉDURES INTERNES (admin) =================
  if (page === "aide-interne" && isAdmin) content = Page_aide_interne({
    content, AIDE_CATS, aideCatFilter, aideErr, aideExistingFiles, aideFiles, aideForm, aideLoading,
    aideModal, aideNewFiles, aideOpenId, aideProcs, aideSaving, aideSearch, deleteAide, isMobile,
    loadAideProcs, openEditAide, openNewAide, openViewer, removeExistingAideFile, setAideCatFilter,
    setAideForm, setAideModal, setAideNewFiles, setAideOpenId, setAideSearch, submitAideForm
  });
  const nbAlertesDefenderMenu = isAdmin ? tickets.filter(t => estAlerteMicrosoft(t) && t.status !== "closed").length : 0;
  const nbAlertesSophosMenu = isAdmin ? tickets.filter(t => estAlerteSophos(t) && t.status !== "closed").length : 0;
  const nbAlertesBackupMenu = isAdmin ? tickets.filter(t => estAlerteBackup(t) && t.status !== "closed").length : 0;
  const pageTitle = isAdmin ? (page === "accueil" ? "Tableau de bord" : page === "aide-interne" ? "Base de connaissances interne" : page === "suppr-ticket" ? "Suppression de ticket" : page === "admins" ? "Administrateurs" : page === "login-logs" ? "Journal des connexions" : page === "securite" ? "Double authentification — Appareils" : page === "client-admin" ? "Établissements" : page === "proc-admin" ? "Procédures clients" : page === "docs-techniques" ? "Infrastructure" : page === "tickets-admin" ? "Tickets" : page === "rapport-jour" ? "Rapport du jour — tickets ouverts" : page === "rapport-tickets" ? "Suivi des tickets" : page === "projets" ? "Projets" : page === "rapports" ? "Rapports d'intervention" : page === "ninjaone" ? "Rapports de sécurité" : page === "reponses-types" ? "Réponses types" : page === "backups" ? "Sauvegardes" : page === "sophos" ? "Sécurité Sophos" : page === "m365" ? "Sécurité Microsoft 365" : page === "licences-m365" ? "Licences Microsoft 365" : page === "checklist" ? "Check-list sécurité serveurs" : page === "inventaire" ? "Inventaire serveurs — versions, Care Pack, antivirus" : page === "planning" ? "Planning équipe" : page === "historique-comptes" ? "Historique des comptes" : page === "templates" ? "Modèles de demande" : page === "capex" ? "CAPEX — Plan d'investissement" : "Procédures clients") : (page === "accueil" ? "Accueil" : page === "historique-comptes" ? "Historique des comptes" : page === "knowledge" ? "Procédures" : page === "mon-installation" ? "Mon infrastructure" : page === "contact" ? "Nouvelle demande" : page === "templates" ? "Modèles de demande" : page === "tickets-client" ? "Mes demandes" : page === "rapport-securite" ? "Rapports de sécurité" : page === "rapport-intervention" ? "Rapports d'intervention" : page === "licences-m365" ? "Licences Microsoft 365" : page === "rapport-tickets" ? "Suivi des tickets" : page === "securite" ? "Mes téléphones (MFA)" : page === "capex" ? "CAPEX — Plan d'investissement" : "Procédure");

  // Styles de la barre latérale : escamotable sur mobile, fixe au défilement sur desktop
  const sidebarStyle = isMobile
    ? { width: 230, maxWidth: "80%", background: SB, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, overflowY: "auto", zIndex: 60, transform: menuOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform .25s ease", boxShadow: menuOpen ? "0 0 30px rgba(0,0,0,.4)" : "none" }
    : { width: 230, background: SB, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" };

  const sidebar = React.createElement('div', { style: sidebarStyle },
    React.createElement('div', { style: { padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,.07)" } },
      React.createElement('div', { style: { display: "flex", alignItems: "center", justifyContent: isMobile ? "space-between" : "flex-start" } },
        React.createElement('a', { href: "https://www.dsihotel.com", target: "_blank", rel: "noopener noreferrer", title: "www.dsihotel.com", style: { display: "block" } },
          React.createElement('img', { src: "https://www.dsihotel.com/dsi-logo-gold.png", alt: "DSI Hotel", style: { height: 40, maxWidth: 180, objectFit: "contain", display: "block" } })
        ),
        isMobile && React.createElement('button', { onClick: () => setMenuOpen(false), style: { background: "none", border: "none", color: "rgba(255,255,255,.6)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 } }, "✕")
      ),
      React.createElement('div', { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 8 } },
        React.createElement('span', { style: { fontSize: 9.5, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: G, background: G + "14", border: "1px solid " + G + "33", borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" } }, isAdmin ? "Espace Admin" : "Intranet Client"),
        React.createElement('div', { style: { display: "flex", gap: 6 } },
          React.createElement('button', { onClick: toggleTheme, title: theme === "dark" ? "Passer en mode jour" : "Passer en mode nuit", "aria-label": theme === "dark" ? "Mode jour" : "Mode nuit",
            style: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", cursor: "pointer", fontSize: 14, lineHeight: 1 } },
            theme === "dark" ? "☀️" : "🌙"),
          isAdmin && React.createElement('button', { onClick: toggleSound, title: soundOn ? "Couper les notifications sonores" : "Activer les notifications sonores", "aria-label": soundOn ? "Son activé" : "Son coupé",
            style: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, background: soundOn ? "rgba(255,255,255,.06)" : "transparent", border: "1px solid " + (soundOn ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.08)"), cursor: "pointer", fontSize: 14, lineHeight: 1, opacity: soundOn ? 1 : 0.55 } },
            soundOn ? "🔔" : "🔕")
        )
      )
    ),
    !isAdmin && client?.logo_url && React.createElement('div', { style: { padding: "18px 16px", display: "flex", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,.06)" } },
      React.createElement('div', { style: { background: "#FFFFFF", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "center", width: "100%" } },
        React.createElement('img', { src: client.logo_url, alt: client.name, style: { maxHeight: 70, maxWidth: "100%", objectFit: "contain" } })
      )
    ),
    isMobile && multiHotel && React.createElement('div', { style: { padding: "10px 13px", borderBottom: "1px solid rgba(255,255,255,.06)" } },
      hotelSwitcher(true)
    ),
    React.createElement('nav', { style: { flex: 1, padding: "6px 0" } },
      (() => {
        const btnStyle = (p) => ({ width: "100%", textAlign: "left", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", fontSize: 13, background: page === p ? "rgba(201,168,76,.13)" : "transparent", color: page === p ? G : "rgba(255,255,255,.65)", borderLeft: `3px solid ${page === p ? G : "transparent"}` });
        const els = [];
        const groupDone = {};
        nav.forEach(({ p, icon, label, grp }) => {
          // Un groupe qui ne contient qu'une entrée s'affiche comme une entrée simple
          if (grp && NAV_GROUPS[grp] && nav.filter(i => i.grp === grp).length > 1) {
            if (groupDone[grp]) return; // sous-items deja rendus via l'en-tete
            groupDone[grp] = true;
            const cfg = NAV_GROUPS[grp];
            const gItems = nav.filter(i => i.grp === grp);
            const gPages = gItems.map(i => i.p);
            const onGPage = gPages.includes(page);
            const show = groupsOpen[grp] || onGPage;
            // En-tete du groupe deroulant
            els.push(React.createElement('button', {
              key: "grp-" + grp, onClick: () => setGroupsOpen(s => ({ ...s, [grp]: !(s[grp] || onGPage) })),
              style: { width: "100%", textAlign: "left", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", fontSize: 13, background: (onGPage && !show) ? "rgba(201,168,76,.13)" : "transparent", color: onGPage ? G : "rgba(255,255,255,.65)", borderLeft: `3px solid ${onGPage ? G : "transparent"}` }
            },
              React.createElement('span', { style: { fontSize: 16, flexShrink: 0 } }, cfg.icon),
              React.createElement('span', { style: { flex: 1 } }, cfg.label),
              React.createElement('span', { style: { fontSize: 11, flexShrink: 0, opacity: .7, transition: "transform .2s", transform: show ? "rotate(90deg)" : "rotate(0deg)" } }, "▶")
            ));
            if (show) {
              gItems.forEach(it => els.push(React.createElement('button', {
                key: it.p, onClick: () => go(it.p),
                style: { ...btnStyle(it.p), paddingLeft: 34, fontSize: 12.5 }
              },
                React.createElement('span', { style: { fontSize: 14, flexShrink: 0 } }, it.icon),
                React.createElement('span', { style: { flex: 1 } }, it.label),
                it.p === "tickets-admin" && nbAlertesDefenderMenu > 0 && React.createElement('span', { title: "Alertes Microsoft à traiter", style: { fontSize: 10.5, fontWeight: 800, color: "white", background: "#E53E3E", borderRadius: 20, padding: "1px 7px", animation: "dsiPulseRouge 1.4s ease-in-out infinite" } }, "🛡️ " + nbAlertesDefenderMenu),
                it.p === "tickets-admin" && nbAlertesSophosMenu > 0 && React.createElement('span', { title: "Alertes Sophos à traiter", style: { fontSize: 10.5, fontWeight: 800, color: "white", background: "#E53E3E", borderRadius: 20, padding: "1px 7px", marginLeft: 3, animation: "dsiPulseRouge 1.4s ease-in-out infinite" } }, "🔒 " + nbAlertesSophosMenu),
                it.p === "tickets-admin" && nbAlertesBackupMenu > 0 && React.createElement('span', { title: "Alertes de sauvegarde à traiter", style: { fontSize: 10.5, fontWeight: 800, color: "white", background: "#E53E3E", borderRadius: 20, padding: "1px 7px", marginLeft: 3, animation: "dsiPulseRouge 1.4s ease-in-out infinite" } }, "💾 " + nbAlertesBackupMenu)
              )));
            }
            return;
          }
          // Item normal (hors groupe)
          els.push(React.createElement('button', {
            key: p, onClick: () => go(p), style: btnStyle(p)
          },
            React.createElement('span', { style: { fontSize: 16, flexShrink: 0 } }, icon),
            React.createElement('span', { style: { flex: 1 } }, label)
          ));
        });
        return els;
      })()
    ),
    isMobile && React.createElement('div', { style: { padding: "6px 0 10px", borderTop: "1px solid rgba(255,255,255,.06)" } },
      (isAdmin || isSupervisor) && React.createElement('button', {
        onClick: () => { setChangePwErr(""); setChangePwValue(""); setChangePwValue2(""); setChangePwOpen(true); setMenuOpen(false); },
        style: { width: "100%", textAlign: "left", border: "none", borderLeft: "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", fontSize: 13, background: "transparent", color: "rgba(255,255,255,.65)" }
      }, React.createElement('span', { style: { fontSize: 16 } }, "🔑"), React.createElement('span', null, "Mot de passe")),
      React.createElement('button', {
        onClick: doLogout,
        style: { width: "100%", textAlign: "left", border: "none", borderLeft: "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", fontSize: 13, background: "transparent", color: "rgba(255,255,255,.65)" }
      }, React.createElement('span', { style: { fontSize: 16 } }, "🚪"), React.createElement('span', null, "Déconnexion"))
    )
  );

  // ================= MENU : barre horizontale + méga-menu (ordinateur), onglets en bas (mobile) =================
  const NAV_SVG = {
    accueil: "M3 11l9-8 9 8M5 10v10h14V10", "client-admin": "M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M2 21h20",
    "proc-admin": "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3", "docs-techniques": "M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01",
    "historique-comptes": "M3 4h18v4H3zM5 8v12h14V8M10 12h4", "tickets-admin": "M3 5h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6zM14 5v14",
    "reponses-types": "M4 4h16v12H8l-4 4z", "aide-interne": "M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z",
    templates: "M9 3h6v3H9zM7 4H5v17h14V4h-2M9 12h6M9 16h4", projets: "M4 20V10M10 20V4M16 20v-7M22 20H2", planning: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
    backups: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
    sophos: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4", m365: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    "licences-m365": "M3 5h18v14H3zM7 10h4M7 14h6M15 9h3v4h-3z", checklist: "M4 4h16v16H4zM8 12l3 3 5-6", inventaire: "M3 13h18v6H3zM5 13l2-8h10l2 8M7 16h.01",
    "rapport-jour": "M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h5", "rapport-tickets": "M3 17l6-6 4 4 8-8M15 7h6v6",
    rapports: "M15 4a5 5 0 0 0-5 6L3 17l4 4 7-7a5 5 0 0 0 6-5l-3 2-3-1-1-3z", capex: "M18 6a7 7 0 1 0 0 12M4 10h9M4 14h9",
    ninjaone: "M3 4h18v12H3zM8 20h8M12 16v4", admins: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6",
    "login-logs": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2", securite: "M7 2h10v20H7zM11 18h2", "suppr-ticket": "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
    contact: "M3 5h18v14H3zM3 6l9 7 9-7", "tickets-client": "M3 5h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6zM14 5v14",
    knowledge: "M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z", "mon-installation": "M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01",
    "rapport-securite": "M3 4h18v12H3zM8 20h8M12 16v4", "rapport-intervention": "M15 4a5 5 0 0 0-5 6L3 17l4 4 7-7a5 5 0 0 0 6-5l-3 2-3-1-1-3z",
    _sup: "M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H4zM17 14h3v6h-3z", _cli: "M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M2 21h20",
    _sec: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", _org: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4", _rap: "M3 6h6l2 2h10v11H3z",
    _plus: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
  };
  const NAV_DESC = {
    "client-admin": "Fiches hôtels et contacts", "proc-admin": "Procédures partagées avec les hôtels", "docs-techniques": "Réseau, serveurs et accès par hôtel",
    "historique-comptes": "Créations et suppressions de comptes", "tickets-admin": "Demandes clients, appels et alertes", "reponses-types": "Modèles de réponse aux tickets",
    "aide-interne": "Procédures internes de l'équipe", templates: "Demandes pré-remplies", projets: "Suivi des projets clients", planning: "Présences et interventions de l'équipe",
    backups: "État des sauvegardes par hôtel", sophos: "Alertes et postes dégradés", m365: "Alertes Defender et Microsoft 365", "licences-m365": "Licences par établissement",
    checklist: "Contrôles de sécurité des serveurs", inventaire: "Versions, Care Pack, antivirus", "rapport-jour": "Tickets ouverts du jour", "rapport-tickets": "Statistiques et délais",
    rapports: "Comptes rendus d'intervention", capex: "Plan d'investissement", ninjaone: "Rapports de sécurité des postes", admins: "Comptes et droits des administrateurs",
    "login-logs": "Historique des connexions", securite: "Appareils de double authentification", "suppr-ticket": "Supprimer définitivement un ticket",
    contact: "Envoyer une demande au support", "tickets-client": "Suivre vos demandes", knowledge: "Guides et procédures", "mon-installation": "Équipements et réseau de l'hôtel",
    "rapport-securite": "État de sécurité de vos postes", "rapport-intervention": "Comptes rendus de nos interventions"
  };
  const GROUP_ORDER = ["assist", "sup", "hotel", "cli", "sec", "org", "rap", "adm"];
  const GROUP_SVG = { assist: "_sup", sup: "_sup", hotel: "_cli", cli: "_cli", sec: "_sec", org: "_org", rap: "_rap", adm: "admins" };
  const navSvg = (key, size) => NAV_SVG[key] ? React.createElement('svg', { className: "dsi-ico", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    React.createElement('path', { d: NAV_SVG[key] })) : null;
  const navIco = (p, emoji, size) => navSvg(p, size) || React.createElement('span', { style: { fontSize: size - 2, lineHeight: 1 } }, emoji);
  const goNav = (p) => { setMegaOpen(null); setPlusOpen(false); setMenuOpen(false); go(p); };
  const nbAlertesMenu = nbAlertesDefenderMenu + nbAlertesSophosMenu + nbAlertesBackupMenu;
  const badgeDe = (p) => (p === "tickets-admin" && nbAlertesMenu > 0) ? nbAlertesMenu : 0;
  // Groupes dans l'ordre d'affichage ; un groupe d'une seule page devient une entrée simple
  const navGroupes = GROUP_ORDER.map(g => ({ id: g, cfg: NAV_GROUPS[g], items: nav.filter(i => i.grp === g) })).filter(g => g.cfg && g.items.length > 1);
  const enGroupe = (it) => it.grp && navGroupes.some(g => g.id === it.grp);
  const navSimples = nav.filter(it => !enGroupe(it));
  const groupeDePage = (navGroupes.find(g => g.items.some(i => i.p === page)) || {}).id || null;
  const badgeGroupe = (g) => g.items.reduce((n, i) => n + badgeDe(i.p), 0);
  const nbTicketsOuvertsMenu = isAdmin ? tickets.filter(t => t.status !== "closed").length : 0;
  const encartGroupe = (gid) => {
    if (!isAdmin) return null;
    if (gid === "sup" && nbTicketsOuvertsMenu > 0 && nav.some(i => i.p === "tickets-admin")) return { n: nbTicketsOuvertsMenu, txt: nbTicketsOuvertsMenu > 1 ? "tickets ouverts" + (nbAlertesMenu > 0 ? ", dont " + nbAlertesMenu + " alerte" + (nbAlertesMenu > 1 ? "s" : "") + " à traiter" : "") : "ticket ouvert", cta: "Voir les tickets", p: "tickets-admin" };
    if (gid === "sec" && nbAlertesMenu > 0 && nav.some(i => i.p === "tickets-admin")) return { n: nbAlertesMenu, txt: "alerte" + (nbAlertesMenu > 1 ? "s" : "") + " de sécurité ou de sauvegarde en attente dans les tickets", cta: "Traiter les alertes", p: "tickets-admin" };
    return null;
  };

  // ---------- Ordinateur : barre horizontale ----------
  const topNav = !isMobile && React.createElement('div', { style: { position: "sticky", top: 0, zIndex: 50 } },
    React.createElement('div', { style: { height: 64, background: SB, display: "flex", alignItems: "center", gap: 16, padding: "0 18px", boxShadow: "0 2px 14px rgba(15,15,36,.18)" } },
      React.createElement('button', { onClick: () => goNav("accueil"), title: "Accueil", style: { background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 } },
        React.createElement('img', { src: "https://www.dsihotel.com/dsi-logo-gold.png", alt: "DSI Hotel", style: { height: 34, maxWidth: 150, objectFit: "contain", display: "block" } })),
      React.createElement('nav', { className: "dsi-topnav", "aria-label": "Menu principal", style: { display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0, overflowX: "auto" } },
        navSimples.filter(it => it.p === "accueil").map(it => React.createElement('button', { key: it.p, className: "dsi-top" + (page === it.p ? " cur" : ""), onClick: () => goNav(it.p) }, it.label)),
        navGroupes.map(g => {
          const ouvert = megaOpen && megaOpen.id === g.id;
          const nb = badgeGroupe(g);
          return React.createElement('button', { key: g.id, "aria-expanded": !!ouvert,
            className: "dsi-top" + (groupeDePage === g.id ? " cur" : "") + (ouvert ? " open" : ""),
            onClick: (e) => { const r = e.currentTarget.getBoundingClientRect(); setMegaOpen(ouvert ? null : { id: g.id, left: r.left }); } },
            React.createElement('span', null, g.cfg.label),
            nb > 0 && React.createElement('span', { style: { width: 7, height: 7, borderRadius: 4, background: "#E53E3E", animation: "dsiPulseRouge 1.4s ease-in-out infinite" } }),
            React.createElement('span', { className: "dsi-chev" }, React.createElement('svg', { className: "dsi-ico", width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, React.createElement('path', { d: "M6 9l6 6 6-6" }))));
        }),
        navSimples.filter(it => it.p !== "accueil").map(it => React.createElement('button', { key: it.p, className: "dsi-top" + (page === it.p ? " cur" : ""), onClick: () => goNav(it.p) }, it.label))
      ),
      React.createElement('span', { style: { fontSize: 9.5, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: G, background: G + "14", border: "1px solid " + G + "33", borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap", flexShrink: 0 } }, isAdmin ? "Espace Admin" : "Intranet Client"),
      React.createElement('button', { className: "dsi-iconbtn", onClick: toggleTheme, title: theme === "dark" ? "Passer en mode jour" : "Passer en mode nuit", "aria-label": theme === "dark" ? "Mode jour" : "Mode nuit" }, theme === "dark" ? "☀️" : "🌙"),
      isAdmin && React.createElement('button', { className: "dsi-iconbtn", onClick: toggleSound, title: soundOn ? "Couper les notifications sonores" : "Activer les notifications sonores", "aria-label": soundOn ? "Son activé" : "Son coupé", style: { opacity: soundOn ? 1 : 0.55 } }, soundOn ? "🔔" : "🔕")
    ),
    // Méga-menu du groupe ouvert
    megaOpen && (() => {
      const g = navGroupes.find(x => x.id === megaOpen.id);
      if (!g) return null;
      const enc = encartGroupe(g.id);
      const deuxCol = g.items.length > 3;
      const larg = (deuxCol ? 600 : 330) + (enc ? 230 : 0);
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const left = Math.max(12, Math.min(megaOpen.left - 12, vw - larg - 16));
      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: "dsi-veil", onClick: () => setMegaOpen(null), style: { position: "fixed", left: 0, right: 0, top: 64, bottom: 0, background: "rgba(15,15,36,.32)" } }),
        React.createElement('div', { className: "dsi-mega", role: "menu", style: { position: "fixed", top: 72, left, width: larg, maxWidth: "calc(100vw - 24px)", background: "white", borderRadius: 18, boxShadow: "0 24px 60px rgba(15,15,36,.28)", display: "flex", overflow: "hidden", zIndex: 51 } },
          React.createElement('div', { style: { flex: 1, minWidth: 0, padding: "18px 16px 18px" } },
            React.createElement('div', { style: { fontSize: 11, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: "#6B7090", padding: "0 12px 8px" } }, g.cfg.label),
            React.createElement('div', { style: { display: "grid", gridTemplateColumns: deuxCol ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: 2 } },
              g.items.map(it => React.createElement('button', { key: it.p, role: "menuitem", className: "dsi-tile" + (page === it.p ? " on" : ""), onClick: () => goNav(it.p) },
                React.createElement('span', { className: "dsi-tico" }, navIco(it.p, it.icon, 18)),
                React.createElement('span', { style: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 } },
                  React.createElement('span', { style: { fontSize: 13.5, fontWeight: 600, color: "#1F2340", display: "flex", alignItems: "center", gap: 6 } }, it.label,
                    badgeDe(it.p) > 0 && React.createElement('span', { style: { minWidth: 20, height: 18, padding: "0 6px", borderRadius: 9, background: "#D63B3B", color: "white", fontSize: 10.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" } }, badgeDe(it.p))),
                  NAV_DESC[it.p] && React.createElement('span', { style: { fontSize: 12, color: "#5B6078", lineHeight: 1.4 } }, NAV_DESC[it.p])
                )
              ))
            )
          ),
          enc && React.createElement('div', { style: { width: 230, flexShrink: 0, background: SB, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 8 } },
            React.createElement('div', { style: { fontSize: 11, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: "rgba(255,255,255,.6)" } }, "À traiter"),
            React.createElement('div', { style: { fontSize: 30, fontWeight: 800, color: G } }, enc.n),
            React.createElement('div', { style: { fontSize: 13, color: "rgba(255,255,255,.82)", lineHeight: 1.5 } }, enc.txt),
            React.createElement('div', { style: { flex: 1, minHeight: 10 } }),
            React.createElement('button', { onClick: () => goNav(enc.p), style: { height: 40, border: "none", borderRadius: 10, background: G, color: "#111", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, enc.cta)
          )
        )
      );
    })()
  );

  // ---------- Mobile : onglets en bas + panneau « Plus » ----------
  const ongletsCandidats = isAdmin
    ? [{ p: "accueil", label: "Accueil" }, { p: "tickets-admin", label: "Tickets" }, { grp: "sec", label: "Sécurité" }, { grp: "rap", label: "Rapports" }, { grp: "cli", label: "Clients" }, { grp: "sup", label: "Support" }]
    : [{ p: "accueil", label: "Accueil" }, { p: "contact", label: "Demande" }, { p: "tickets-client", label: "Suivi" }, { p: "knowledge", label: "Procédures" }, { p: "mon-installation", label: "Infra" }];
  const onglets = ongletsCandidats.map(o => {
    if (o.p) { const it = nav.find(i => i.p === o.p); return it ? { key: o.p, label: o.label, svg: o.p, emoji: it.icon, cible: o.p, actif: page === o.p } : null; }
    const g = nav.filter(i => i.grp === o.grp);
    if (!g.length) return null;
    return { key: "g-" + o.grp, label: o.label, svg: "_" + o.grp, emoji: (NAV_GROUPS[o.grp] || {}).icon, cible: g[0].p, actif: g.some(i => i.p === page) };
  }).filter(Boolean).slice(0, 4);
  const dansOnglets = onglets.some(o => o.actif);
  const sectionsPlus = [
    ...navGroupes.map(g => ({ id: g.id, label: g.cfg.label, items: g.items })),
    ...(navSimples.filter(i => i.p !== "accueil").length ? [{ id: "autres", label: "Mon compte", items: navSimples.filter(i => i.p !== "accueil") }] : [])
  ];
  const btnCompte = { display: "flex", alignItems: "center", gap: 8, padding: "0 14px", height: 44, background: "#F4F5FA", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#1F2340", cursor: "pointer" };
  const mobileNav = isMobile && React.createElement(React.Fragment, null,
    React.createElement('nav', { "aria-label": "Menu principal", style: { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 56, background: SB, display: "flex", padding: "5px 4px calc(6px + env(safe-area-inset-bottom))", boxShadow: "0 -4px 18px rgba(15,15,36,.25)" } },
      onglets.map(o => React.createElement('button', { key: o.key, className: "dsi-tab" + (o.actif && !plusOpen ? " on" : ""), onClick: () => goNav(o.cible) },
        React.createElement('span', { className: "dsi-pill" }, navIco(o.svg, o.emoji, 21)),
        React.createElement('span', { className: "dsi-tl" }, o.label),
        o.cible === "tickets-admin" && nbAlertesMenu > 0 && React.createElement('span', { style: { position: "absolute", top: 3, left: "calc(50% + 6px)", minWidth: 18, height: 17, padding: "0 5px", borderRadius: 9, background: "#E53E3E", color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px " + SB } }, nbAlertesMenu)
      )),
      React.createElement('button', { className: "dsi-tab" + (plusOpen || !dansOnglets ? " on" : ""), onClick: () => setPlusOpen(v => !v), "aria-expanded": plusOpen },
        React.createElement('span', { className: "dsi-pill" }, navSvg("_plus", 21)),
        React.createElement('span', { className: "dsi-tl" }, "Plus"))
    ),
    plusOpen && React.createElement('div', { className: "dsi-veil", onClick: () => setPlusOpen(false), style: { position: "fixed", inset: 0, zIndex: 57, background: "rgba(15,15,36,.5)" } }),
    plusOpen && React.createElement('div', { className: "dsi-sheet", role: "dialog", "aria-label": "Toutes les pages", style: { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 58, maxHeight: "86vh", background: "white", borderRadius: "22px 22px 0 0", display: "flex", flexDirection: "column", boxShadow: "0 -12px 40px rgba(15,15,36,.3)" } },
      React.createElement('div', { style: { display: "flex", justifyContent: "center", padding: "9px 0 2px" } }, React.createElement('div', { style: { width: 40, height: 5, borderRadius: 3, background: "#D5D9E6" } })),
      React.createElement('div', { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 6px" } },
        React.createElement('div', { style: { fontSize: 18, fontWeight: 800, color: "#1A1A3E" } }, "Toutes les pages"),
        React.createElement('button', { onClick: () => setPlusOpen(false), "aria-label": "Fermer", style: { width: 44, height: 44, borderRadius: 22, border: "none", background: "#F3F4F9", color: "#1F2340", fontSize: 18, cursor: "pointer" } }, "✕")
      ),
      React.createElement('div', { style: { overflowY: "auto", padding: "0 14px calc(18px + env(safe-area-inset-bottom))", WebkitOverflowScrolling: "touch" } },
        multiHotel && React.createElement('div', { style: { padding: "6px 2px 4px" } }, hotelSwitcher(false)),
        sectionsPlus.map(sec => React.createElement('div', { key: sec.id },
          React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: "#6B7090", padding: "14px 2px 8px" } }, sec.label),
          React.createElement('div', { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 } },
            sec.items.map(it => React.createElement('button', { key: it.p, className: "dsi-mtile" + (page === it.p ? " on" : ""), onClick: () => goNav(it.p) },
              React.createElement('span', { className: "dsi-tico" }, navIco(it.p, it.icon, 17)),
              React.createElement('span', null, it.label),
              badgeDe(it.p) > 0 && React.createElement('span', { style: { position: "absolute", top: 7, right: 8, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#E53E3E", color: "white", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" } }, badgeDe(it.p))
            ))
          )
        )),
        React.createElement('div', { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: "#6B7090", padding: "16px 2px 8px" } }, "Réglages"),
        React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8 } },
          React.createElement('button', { onClick: toggleTheme, style: btnCompte }, theme === "dark" ? "☀️ Mode jour" : "🌙 Mode nuit"),
          isAdmin && React.createElement('button', { onClick: toggleSound, style: btnCompte }, soundOn ? "🔔 Son activé" : "🔕 Son coupé"),
          (isAdmin || isSupervisor) && React.createElement('button', { onClick: () => { setChangePwErr(""); setChangePwValue(""); setChangePwValue2(""); setChangePwOpen(true); setPlusOpen(false); }, style: btnCompte }, "🔑 Mot de passe"),
          React.createElement('button', { onClick: doLogout, style: { ...btnCompte, color: "#C53030" } }, "🚪 Déconnexion")
        )
      )
    )
  );

  return React.createElement('div', { style: { display: "flex", alignItems: "flex-start", minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", background: "#F0F2F8" } },
    // Changement de son propre mot de passe (admin / superviseur)
    changePwOpen && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 } },
      React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 360, maxWidth: "90%" } },
        React.createElement('div', { style: { fontWeight: 600, fontSize: 14, color: "#1a1a3e", marginBottom: 4 } }, "Changer mon mot de passe"),
        React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 14 } }, (profile && profile.email) || ""),
        React.createElement('input', { type: "password", value: changePwValue, onChange: e => { setChangePwValue(e.target.value); setChangePwErr(""); }, placeholder: "8 car. min. : min., MAJ., chiffre, spécial", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 10, boxSizing: "border-box" } }),
        React.createElement('input', { type: "password", value: changePwValue2, onChange: e => { setChangePwValue2(e.target.value); setChangePwErr(""); }, onKeyDown: e => e.key === "Enter" && submitChangePassword(), placeholder: "Confirmer le mot de passe", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 12, boxSizing: "border-box" } }),
        changePwErr && React.createElement('div', { style: { fontSize: 12, color: "#C53030", marginBottom: 12 } }, changePwErr),
        React.createElement('div', { style: { display: "flex", gap: 7, justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => { setChangePwOpen(false); setChangePwValue(""); setChangePwValue2(""); setChangePwErr(""); }, style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "7px 14px" } }, "Annuler"),
          React.createElement('button', { onClick: submitChangePassword, disabled: changePwBusy, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", padding: "7px 14px", opacity: changePwBusy ? 0.6 : 1 } }, changePwBusy ? "..." : "Valider")
        )
      )
    ),
    // Visionneuse d'images plein écran
    fwdTicket && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 } },
      React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 460, maxWidth: "100%" } },
        React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 4 } }, "↪ Faire suivre le ticket"),
        React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 16 } }, (fwdTicket.reference ? fwdTicket.reference + " · " : "") + (fwdTicket.subject || "Demande de support")),
        React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Destinataire *"),
        React.createElement('input', { value: fwdEmail, onChange: e => setFwdEmail(e.target.value), placeholder: "adresse@exemple.com", type: "email", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 12, boxSizing: "border-box" } }),
        React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Message d'accompagnement (optionnel)"),
        React.createElement('textarea', { value: fwdNote, onChange: e => setFwdNote(e.target.value), placeholder: "Ex : Bonjour, peux-tu prendre en charge cette demande ? Merci.", rows: 3, style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 8, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" } }),
        React.createElement('div', { style: { fontSize: 11, color: "#999", marginBottom: 14, lineHeight: 1.5 } }, "L'intégralité du fil (demande initiale + réponses) sera incluse dans l'email."),
        fwdMsg && React.createElement('div', { style: { fontSize: 12, color: fwdMsg.startsWith("✓") ? "#2F855A" : "#C53030", marginBottom: 12 } }, fwdMsg),
        React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => setFwdTicket(null), style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "8px 16px" } }, "Annuler"),
          React.createElement('button', { onClick: () => transfererTicket(fwdTicket), disabled: fwdBusy, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 16px", opacity: fwdBusy ? 0.6 : 1 } }, fwdBusy ? "Envoi..." : "Envoyer le transfert")
        )
      )
    ),
    // Fenêtre « Déverrouiller un compte AD » (script NinjaOne sur le contrôleur de domaine)
    adTicket && (() => {
      const t = adTicket;
      const h = hotels.find(x => x.id === t.hotel_id);
      const res = adEtat && adEtat.resultat;
      const enCours = adEtat && (adEtat.phase === "envoi" || adEtat.phase === "attente");
      const ligne = (lbl, val, coul) => React.createElement('div', { style: { display: "flex", gap: 8, fontSize: 12.5, padding: "3px 0" } },
        React.createElement('span', { style: { color: "#888", minWidth: 150 } }, lbl),
        React.createElement('span', { style: { color: coul || "#222", fontWeight: 600 } }, val));
      const fermer = () => { adPollRef.current++; setAdBusy(false); setAdTicket(null); };
      return React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 500, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto" } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 4 } }, "🔓 Déverrouiller un compte Active Directory"),
          React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 14 } }, (t.reference ? t.reference + " · " : "") + (h ? h.name : "⚠ Ticket non rattaché à un hôtel")),
          React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Identifiant Windows du compte *"),
          React.createElement('input', { value: adCompte, onChange: e => setAdCompte(e.target.value), disabled: adBusy, placeholder: "ex. guestrelation", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 8, boxSizing: "border-box", fontFamily: "monospace" } }),
          adSugg.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 } },
            React.createElement('span', { style: { fontSize: 11, color: "#888" } }, "Proposés d'après le ticket :"),
            adSugg.map(a => React.createElement('button', { key: a, onClick: () => setAdCompte(a), disabled: adBusy, style: { padding: "3px 9px", borderRadius: 20, fontSize: 11.5, cursor: "pointer", fontFamily: "monospace", border: "1px solid " + (adCompte === a ? "#2B6CB0" : "#DDD"), background: adCompte === a ? "#EBF4FF" : "#FAFAFC", color: adCompte === a ? "#2B6CB0" : "#555" } }, a))
          ),
          React.createElement('div', { style: { fontSize: 11, color: "#7a5600", background: "#FEF4DC", borderRadius: 7, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 } },
            "Vérifiez que la demande vient bien de l'hôtel. Les comptes administrateurs et les comptes désactivés sont refusés par le script. Si le compte se reverrouille souvent, regardez le poste à l'origine du verrouillage : un ancien mot de passe y est souvent enregistré."),
          React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555", marginBottom: 12, cursor: "pointer" } },
            React.createElement('input', { type: "checkbox", checked: adTrace, onChange: e => setAdTrace(e.target.checked), disabled: adBusy }),
            "Ajouter le résultat dans le fil du ticket (sans email au client)"),
          adEtat && React.createElement('div', { style: { borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12.5, lineHeight: 1.5,
              background: adEtat.phase === "erreur" ? "#FDECEC" : adEtat.phase === "fini" ? (res && res.deverrouille ? "#E9F6EE" : "#EBF4FF") : "#F4F4F8",
              color: adEtat.phase === "erreur" ? "#C53030" : "#333", border: "1px solid " + (adEtat.phase === "erreur" ? "#F5B5B5" : "#E2E2EA") } },
            enCours && React.createElement('div', null, "⏳ " + adEtat.msg),
            adEtat.phase === "erreur" && React.createElement('div', null, "❌ " + String(adEtat.msg || "").replace(/^NINJA_CONNEXION_REQUISE\s*:\s*/, "")),
            adEtat.phase === "erreur" && /NINJA_CONNEXION_REQUISE|user_context_required/.test(String(adEtat.msg || "")) && React.createElement('button', { onClick: connecterNinja, style: { marginTop: 8, padding: "7px 13px", background: "#1F4E8C", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "🔗 Connecter NinjaOne (une seule fois)"),
            adEtat.phase === "fini" && res && React.createElement('div', null,
              React.createElement('div', { style: { fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: res.deverrouille ? "#2F855A" : "#2B6CB0" } },
                res.deverrouille ? "✅ Compte déverrouillé" : (res.mode === "diagnostic" ? "🔎 Diagnostic" : "ℹ️ Le compte n'était pas verrouillé")),
              ligne("Compte", res.compte + (res.nom ? " — " + res.nom : "")),
              ligne("Serveur", adEtat.dc || res.serveur || "—"),
              ligne("Verrouillé", res.verrouille_avant ? ("oui" + (res.heure_verrouillage ? " depuis le " + fmtAd(res.heure_verrouillage) : "")) : "non", res.verrouille_avant ? "#C53030" : "#2F855A"),
              res.verrouille_apres != null && res.deverrouille && ligne("Après l'action", res.verrouille_apres ? "toujours verrouillé" : "déverrouillé", res.verrouille_apres ? "#C53030" : "#2F855A"),
              ligne("Échecs de mot de passe", (res.echecs == null ? "—" : String(res.echecs)) + (res.dernier_echec ? " (dernier le " + fmtAd(res.dernier_echec) + ")" : "")),
              (res.source_verrouillage || []).length > 0 && ligne("Verrouillé depuis", res.source_verrouillage.map(x => (x.poste || "?") + " à " + fmtAd(x.heure)).join(", "), "#B7791F"),
              res.mdp_expire && ligne("Mot de passe", "expiré", "#C53030"),
              res.desactive && ligne("Compte", "désactivé", "#C53030"),
              ligne("Mot de passe changé le", fmtAd(res.dernier_mdp)),
              res.message && React.createElement('div', { style: { marginTop: 6, fontStyle: "italic", color: "#555" } }, res.message)
            )
          ),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" } },
            React.createElement('button', { onClick: fermer, style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "8px 14px" } }, adEtat && adEtat.phase === "fini" ? "Fermer" : "Annuler"),
            adEtat && adEtat.phase === "fini" && React.createElement('button', { onClick: preparerReponseAd, style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px" } }, "✉️ Préparer la réponse au client"),
            !(adEtat && adEtat.phase === "fini") && React.createElement('button', { onClick: () => lancerDeverrouillageAd("diagnostic"), disabled: adBusy || !adCompte.trim(), style: { background: "white", border: "1px solid #2B6CB0", color: "#2B6CB0", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px", opacity: (adBusy || !adCompte.trim()) ? 0.55 : 1 } }, "🔎 Diagnostiquer"),
            !(adEtat && adEtat.phase === "fini") && React.createElement('button', { onClick: () => lancerDeverrouillageAd("deverrouiller"), disabled: adBusy || !adCompte.trim(), style: { background: "#2B6CB0", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px", opacity: (adBusy || !adCompte.trim()) ? 0.55 : 1 } }, adBusy ? "En cours…" : "🔓 Déverrouiller")
          )
        )
      );
    })(),
    // Fenêtre « Agent Claude » (Worker dsi-hotel-agent)
    agTicket && (() => {
      const t = agTicket;
      const h = hotels.find(x => x.id === t.hotel_id);
      const d = agEtat && agEtat.data;
      const p = d && d.proposition;
      const nj = d && d.ninja;
      const occupe = agEtat && (agEtat.phase === "analyse" || agEtat.phase === "verif");
      const besoinNinja = (agEtat && /NINJA_CONNEXION_REQUISE|user_context_required|pas encore connecté|reconnectez/i.test(String(agEtat.msg || ""))) || (nj && nj.connecte === false);
      const badge = (txt, bg, col) => React.createElement('span', { style: { display: "inline-block", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: col, marginRight: 6, marginBottom: 4 } }, txt);
      const titreBloc = (txt) => React.createElement('div', { style: { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: ".04em", margin: "12px 0 6px" } }, txt);
      const icone = { ok: "✅", probleme: "⚠️", inconnu: "❔", corrige: "🔧" };
      const libStatut = { resolu: ["✅ Résolu", "#E9F6EE", "#2F855A"], attente_client: ["⏳ Action du client attendue", "#EBF4FF", "#2B6CB0"], technicien: ["👤 À traiter par un technicien", "#FDECEC", "#C53030"], en_cours: ["🔎 Vérifications à lancer", "#F3EEFF", "#6B46C1"] };
      const fmt = (iso) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso; } };
      const diag = nj && nj.diagnostic;
      return React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 } },
        React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 640, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto" } },
          React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 4 } }, "✨ Agent — proposition de réponse"),
          React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 12 } }, (t.reference ? t.reference + " · " : "") + (h ? h.name : "⚠ Ticket non rattaché à un hôtel") + " · " + (t.subject || "")),
          occupe && React.createElement('div', { style: { background: "#F4F4F8", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#333", marginBottom: 12 } }, "⏳ " + agEtat.msg),
          agEtat && agEtat.phase === "erreur" && React.createElement('div', { style: { background: "#FDECEC", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 } },
            "❌ " + String(agEtat.msg || "").replace(/^NINJA_CONNEXION_REQUISE\s*:\s*/, "")),
          besoinNinja && React.createElement('button', { onClick: connecterNinjaAgent, style: { marginBottom: 12, padding: "7px 13px", background: "#1F4E8C", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "🔗 Connecter NinjaOne (compte agent, une seule fois)"),
          p && React.createElement('div', null,
            React.createElement('div', null,
              p.procedure_titre ? badge("📘 " + p.procedure_titre, "#EBF4FF", "#2B6CB0") : badge("Aucune procédure Agent", "#FEF4DC", "#7a5600"),
              badge("Confiance " + p.confiance, p.confiance === "haute" ? "#E9F6EE" : p.confiance === "moyenne" ? "#FEF4DC" : "#FDECEC", p.confiance === "haute" ? "#2F855A" : p.confiance === "moyenne" ? "#7a5600" : "#C53030"),
              libStatut[p.statut] && badge(libStatut[p.statut][0], libStatut[p.statut][1], libStatut[p.statut][2])),
            p.statut === "technicien" && p.raison_technicien && React.createElement('div', { style: { fontSize: 12, color: "#C53030", marginTop: 4 } }, p.raison_technicien),

            titreBloc("PC concerné"),
            nj && nj.erreur && React.createElement('div', { style: { fontSize: 12, color: "#7a5600", background: "#FEF4DC", borderRadius: 7, padding: "7px 10px", marginBottom: 6 } }, "NinjaOne : " + String(nj.erreur).replace(/^NINJA_CONNEXION_REQUISE\s*:\s*/, "")),
            nj && nj.identification && React.createElement('div', { style: { fontSize: 12.5, color: "#333", marginBottom: 6 } },
              nj.identification.hostname ? React.createElement('span', null, React.createElement('b', null, nj.identification.hostname), " — " + nj.identification.raison) : "Non identifié — " + nj.identification.raison,
              diag && diag.lien && React.createElement('a', { href: diag.lien, target: "_blank", rel: "noopener noreferrer", style: { marginLeft: 8, fontSize: 12, color: "#2B6CB0" } }, "Ouvrir dans NinjaOne ↗")),
            nj && (nj.postes || []).length > 0 && React.createElement('div', { style: { display: "flex", gap: 6, alignItems: "center", marginBottom: 6 } },
              React.createElement('select', { value: agDevice, onChange: e => setAgDevice(e.target.value), disabled: occupe, style: { flex: 1, padding: "7px 9px", border: "1px solid #DDD", borderRadius: 7, fontSize: 12, background: "white" } },
                React.createElement('option', { value: "" }, "— Choisir un autre PC —"),
                nj.postes.slice().sort((a, b) => String(a.hostname).localeCompare(String(b.hostname))).map(x => React.createElement('option', { key: x.id, value: String(x.id) }, x.hostname + (x.en_ligne ? " · en ligne" : " · hors ligne") + (x.utilisateur ? " · " + x.utilisateur : "")))),
              React.createElement('button', { onClick: () => { setAgScripts([]); lancerAgent(t, agDevice, []); }, disabled: occupe || !agDevice || (nj.identification && String(nj.identification.deviceId) === agDevice), style: { padding: "7px 12px", background: "white", border: "1px solid #6B46C1", color: "#6B46C1", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (occupe || !agDevice) ? 0.5 : 1 } }, "↻ Relancer avec ce PC")),
            diag && React.createElement('div', { style: { fontSize: 12, color: "#555", background: "#F8F8FB", borderRadius: 7, padding: "7px 10px", lineHeight: 1.6 } },
              (diag.en_ligne ? "🟢 En ligne" : "🔴 Hors ligne (dernier contact " + fmt(diag.dernier_contact) + ")") +
              (diag.dernier_demarrage ? " · démarré le " + fmt(diag.dernier_demarrage) : "") +
              (diag.utilisateur ? " · utilisateur " + diag.utilisateur : "") +
              ((diag.disques || []).length ? " · " + diag.disques.map(x => x.lecteur + " " + (x.libre_go == null ? "?" : x.libre_go) + " Go libres").join(", ") : "")),

            (p.verifications || []).length > 0 && titreBloc("Vérifications"),
            (p.verifications || []).map((v, i) => React.createElement('div', { key: i, style: { display: "flex", gap: 8, fontSize: 12.5, padding: "3px 0", lineHeight: 1.45 } },
              React.createElement('span', null, icone[v.statut] || "❔"),
              React.createElement('span', null, React.createElement('b', null, v.point), " — " + v.resultat))),

            (d.scripts || []).length > 0 && React.createElement('div', { style: { marginTop: 10, background: "#F3EEFF", borderRadius: 8, padding: "9px 12px", fontSize: 12.5 } },
              React.createElement('div', { style: { marginBottom: 6, color: "#44337A" } },
                "L'agent propose de lancer " + (d.scripts.every(x => x.serveur) ? "sur le serveur " + d.scripts[0].serveur : "sur le PC") +
                (d.scripts.some(x => x.modifie) ? " (modifie l'appareil)" : " (lecture seule)") + " : " + d.scripts.map(x => x.libelle).join(", ")),
              React.createElement('button', { onClick: lancerVerifsAgent, disabled: occupe || !(d.scripts.every(x => x.serveur) || agDevice || (nj && nj.identification && nj.identification.deviceId)), style: { padding: "7px 13px", background: "#6B46C1", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: occupe ? 0.6 : 1 } }, d.scripts.some(x => x.modifie) ? "▶ Lancer" : "▶ Lancer les vérifications")),
            agScripts.length > 0 && React.createElement('div', { style: { fontSize: 11.5, color: "#6B46C1", marginTop: 6 } }, "Résultats pris en compte : " + agScripts.map(x => x.cle).join(", ")),

            titreBloc("Analyse (interne, jamais envoyée)"),
            React.createElement('div', { style: { fontSize: 12.5, color: "#444", background: "#F8F8FB", borderLeft: "3px solid #6B46C1", borderRadius: 6, padding: "8px 11px", whiteSpace: "pre-wrap", lineHeight: 1.55 } }, p.analyse_interne || "—"),

            titreBloc("Réponse proposée au client (modifiable)"),
            React.createElement('textarea', { value: agTexte, onChange: e => setAgTexte(e.target.value), disabled: occupe, rows: 9, placeholder: "L'agent ne propose pas de réponse pour ce ticket.", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, lineHeight: 1.5, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" } }),
            React.createElement('div', { style: { fontSize: 11, color: "#999", marginTop: 4 } }, "Brouillon généré par l'IA à partir des procédures Agent : relisez-le. Il est placé dans la zone de réponse, rien n'est envoyé automatiquement." + (d.usage && d.usage.entree ? " · " + d.usage.modele + " · " + (d.usage.entree + d.usage.sortie) + " jetons" : ""))
          ),
          React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 14 } },
            React.createElement('button', { onClick: fermerAgent, style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "8px 14px" } }, "Fermer"),
            p && React.createElement('button', { onClick: () => { retourAgent("rejetee"); fermerAgent(); }, disabled: occupe, style: { background: "white", border: "1px solid #F5B5B5", color: "#C53030", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "8px 14px" } }, "👎 Proposition inutile"),
            agEtat && agEtat.phase === "erreur" && React.createElement('button', { onClick: () => lancerAgent(t, agDevice, agScripts), style: { background: "white", border: "1px solid #6B46C1", color: "#6B46C1", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px" } }, "↻ Relancer l'agent"),
            p && React.createElement('button', { onClick: utiliserReponseAgent, disabled: occupe || !agTexte.trim(), style: { background: G, border: "none", color: "#111", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 14px", opacity: (occupe || !agTexte.trim()) ? 0.55 : 1 } }, "✉️ Utiliser cette réponse")
          )
        )
      );
    })(),
    // Fenêtre « Bloquer un expéditeur » (Defender M365 via Worker dsi-hotel-blocage)
    blqTicket && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 } },
      React.createElement('div', { style: { background: "white", borderRadius: 12, padding: 22, width: 480, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto" } },
        React.createElement('div', { style: { fontWeight: 600, fontSize: 15, color: "#1a1a3e", marginBottom: 4 } }, "🚫 Bloquer un expéditeur frauduleux"),
        React.createElement('div', { style: { fontSize: 12, color: "#888", marginBottom: 16 } }, (blqTicket.reference ? blqTicket.reference + " · " : "") + (blqTicket.subject || "Demande de support")),
        React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Établissement (tenant Microsoft 365) *"),
        React.createElement('select', { value: blqTenant, onChange: e => setBlqTenant(e.target.value), disabled: blqBusy, style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 4, boxSizing: "border-box", background: "white" } },
          React.createElement('option', { value: "" }, (blqTenants && blqTenants.length) ? "— Choisir l'établissement —" : "Aucun établissement activé"),
          (blqTenants || []).map(x => React.createElement('option', { key: x.key, value: x.key }, x.nom + " (" + x.key + ")"))
        ),
        React.createElement('div', { style: { fontSize: 10.5, color: "#999", marginBottom: 12 } }, "Seuls les tenants configurés dans le Worker apparaissent. Le blocage s'applique à toutes les boîtes du tenant."),
        React.createElement('label', { style: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 4 } }, "Adresse de l'expéditeur frauduleux *"),
        React.createElement('input', { value: blqAdresse, onChange: e => setBlqAdresse(e.target.value), disabled: blqBusy, placeholder: "fraudeur@domaine.com", type: "email", style: { width: "100%", padding: "9px 11px", border: "1px solid #DDD", borderRadius: 7, fontSize: 13, marginBottom: 8, boxSizing: "border-box" } }),
        blqSuggestions.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 } },
          React.createElement('span', { style: { fontSize: 11, color: "#888" } }, "Trouvées dans le ticket :"),
          blqSuggestions.map(a => React.createElement('button', { key: a, onClick: () => setBlqAdresse(a), disabled: blqBusy, style: { padding: "3px 9px", borderRadius: 20, fontSize: 11.5, cursor: "pointer", border: "1px solid " + (blqAdresse === a ? "#B3261E" : "#DDD"), background: blqAdresse === a ? "#FDECEA" : "#FAFAFC", color: blqAdresse === a ? "#B3261E" : "#555" } }, a))
        ),
        React.createElement('div', { style: { fontSize: 11, color: "#7a5600", background: "#FEF4DC", borderRadius: 7, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 } },
          "Bloquez uniquement l'adresse exacte du fraudeur. Vérifiez-la sur la capture ou l'email d'origine : le nom affiché (« Manon … ») ne compte pas, seule l'adresse entre < > compte. Les domaines de l'hôtel, de DSI Hotel et des enseignes sont protégés."),
        React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555", marginBottom: 6, cursor: "pointer" } },
          React.createElement('input', { type: "checkbox", checked: blqEmail, onChange: e => setBlqEmail(e.target.checked), disabled: blqBusy }),
          "Préparer l'email d'explication au client (à relire puis envoyer avec « Répondre »)"
        ),
        React.createElement('label', { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555", marginBottom: 12, cursor: "pointer" } },
          React.createElement('input', { type: "checkbox", checked: blqTrace, onChange: e => setBlqTrace(e.target.checked), disabled: blqBusy }),
          "Ajouter aussi un bandeau « Expéditeur bloqué » dans le fil (sans email)"
        ),
        blqMsg && React.createElement('div', { style: { fontSize: 12, color: blqMsg.startsWith("✓") ? "#2F855A" : "#C53030", marginBottom: 12, whiteSpace: "pre-wrap" } }, blqMsg),
        React.createElement('div', { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
          React.createElement('button', { onClick: () => setBlqTicket(null), disabled: blqBusy, style: { background: "none", border: "1px solid #DDD", color: "#555", borderRadius: 7, fontSize: 12, cursor: "pointer", padding: "8px 16px" } }, blqMsg.startsWith("✓") ? "Fermer" : "Annuler"),
          !blqMsg.startsWith("✓") && React.createElement('button', { onClick: executerBlocage, disabled: blqBusy || !blqTenant || !blqAdresse.trim(), style: { background: "#B3261E", border: "none", color: "white", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 16px", opacity: (blqBusy || !blqTenant || !blqAdresse.trim()) ? 0.55 : 1 } }, blqBusy ? "Blocage en cours…" : "🚫 Bloquer")
        )
      )
    ),
    viewer && React.createElement('div', {
      onClick: (e) => { if (e.target === e.currentTarget) closeViewer(); },
      style: { position: "fixed", inset: 0, background: "rgba(10,10,20,.92)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 30 }
    },
      // Barre supérieure : nom du fichier, compteur, télécharger, fermer
      React.createElement('div', { style: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,0))", zIndex: 3 } },
        React.createElement('span', { style: { color: "rgba(255,255,255,.9)", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, viewer.images[viewer.index]?.file_name || ""),
        viewer.images.length > 1 && React.createElement('span', { style: { color: "rgba(255,255,255,.55)", fontSize: 12.5, whiteSpace: "nowrap" } }, (viewer.index + 1) + " / " + viewer.images.length),
        React.createElement('a', { href: viewer.images[viewer.index]?.file_url, download: viewer.images[viewer.index]?.file_name, target: "_blank", rel: "noreferrer", onClick: e => e.stopPropagation(), title: "Télécharger", style: { color: G, fontSize: 18, textDecoration: "none", padding: "2px 6px" } }, "⬇"),
        React.createElement('button', { onClick: closeViewer, title: "Fermer (Échap)", style: { background: "none", border: "none", color: "rgba(255,255,255,.75)", fontSize: 26, cursor: "pointer", lineHeight: 1, padding: "0 4px" } }, "✕")
      ),
      // Flèche précédente
      viewer.images.length > 1 && React.createElement('button', { onClick: (e) => { e.stopPropagation(); viewerPrev(); }, title: "Précédente (←)", style: { position: "absolute", left: isMobile ? 6 : 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.12)", border: "none", color: "white", fontSize: 26, cursor: "pointer", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 } }, "‹"),
      // Zone d'image : molette pour zoomer, glisser pour déplacer
      React.createElement('div', {
        onClick: (e) => { e.stopPropagation(); if (zoom === 1 && e.target === e.currentTarget) closeViewer(); },
        onWheel: onWheelZoom,
        onMouseDown: onDragStart,
        onMouseMove: onDragMove,
        onMouseUp: onDragEnd,
        onMouseLeave: onDragEnd,
        onDoubleClick: () => (zoom > 1 ? resetZoom() : setZoom(2.5)),
        onTouchStart: onTouchStart,
        onTouchMove: onTouchMove,
        onTouchEnd: onTouchEnd,
        style: { width: "100%", height: isMobile ? "78vh" : "84vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: zoom > 1 ? "grab" : "zoom-in", touchAction: "none" }
      },
        React.createElement('div', {
          style: {
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: "transform .1s ease-out",
            maxWidth: "100%", maxHeight: "100%", display: "flex"
          }
        },
          React.createElement('img', {
            src: viewer.images[viewer.index]?.file_url,
            alt: viewer.images[viewer.index]?.file_name || "",
            draggable: false,
            onClick: (e) => e.stopPropagation(),
            style: {
              maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
              borderRadius: 6, boxShadow: "0 8px 40px rgba(0,0,0,.5)",
              userSelect: "none"
            }
          })
        )
      ),
      // Flèche suivante
      viewer.images.length > 1 && React.createElement('button', { onClick: (e) => { e.stopPropagation(); viewerNext(); }, title: "Suivante (→)", style: { position: "absolute", right: isMobile ? 6 : 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.12)", border: "none", color: "white", fontSize: 26, cursor: "pointer", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 } }, "›"),
      // Contrôles de zoom
      React.createElement('div', { onClick: e => e.stopPropagation(), style: { position: "absolute", bottom: viewer.images.length > 1 ? 46 : 18, display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.1)", borderRadius: 24, padding: "4px 6px", zIndex: 3 } },
        React.createElement('button', { onClick: () => setZoom(z => { const n = clampZoom(z / 1.25); if (n === 1) setPan({ x: 0, y: 0 }); return n; }), disabled: zoom <= ZOOM_MIN, title: "Dézoomer (−)", style: { background: "none", border: "none", color: "white", fontSize: 20, cursor: zoom <= ZOOM_MIN ? "default" : "pointer", opacity: zoom <= ZOOM_MIN ? .35 : 1, width: 32, height: 32, lineHeight: 1, padding: 0 } }, "−"),
        React.createElement('button', { onClick: resetZoom, title: "Taille réelle (0)", style: { background: "none", border: "none", color: "rgba(255,255,255,.85)", fontSize: 12, cursor: "pointer", minWidth: 52, fontVariantNumeric: "tabular-nums" } }, Math.round(zoom * 100) + "%"),
        React.createElement('button', { onClick: () => setZoom(z => clampZoom(z * 1.25)), disabled: zoom >= ZOOM_MAX, title: "Zoomer (+)", style: { background: "none", border: "none", color: "white", fontSize: 20, cursor: zoom >= ZOOM_MAX ? "default" : "pointer", opacity: zoom >= ZOOM_MAX ? .35 : 1, width: 32, height: 32, lineHeight: 1, padding: 0 } }, "+")
      ),
      // Pastilles de navigation
      viewer.images.length > 1 && React.createElement('div', { onClick: e => e.stopPropagation(), style: { position: "absolute", bottom: 18, display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap", maxWidth: "90%", zIndex: 3 } },
        viewer.images.map((im, i) => React.createElement('button', { key: i, onClick: () => goToImage(i), style: { width: 9, height: 9, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: i === viewer.index ? G : "rgba(255,255,255,.3)" } }))
      )
    ),
    // Popup d'avertissement avant déconnexion automatique
    toasts.length > 0 && React.createElement('div', { style: { position: "fixed", top: isMobile ? 64 : 70, left: "50%", transform: "translateX(-50%)", zIndex: 150, display: "flex", flexDirection: "column", gap: 10, width: isMobile ? "calc(100% - 24px)" : 460, pointerEvents: "none" } },
      React.createElement('style', null, "@keyframes dsiToastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}@keyframes dsiToastBar{from{width:100%}to{width:0}}"),
      toasts.map(t => {
        const cfg = t.kind === "reponse" ? { c: "#DD6B20", l: "💬 Nouvelle réponse" } : t.kind === "alerte" ? { c: "#C53030", l: "🚨 Alerte automatique" } : { c: "#3182CE", l: "🆕 Nouveau ticket" };
        const extrait = String(t.extrait || "").replace(/\s+/g, " ").trim();
        return React.createElement('div', { key: t.id, onClick: () => ouvrirTicketToast(t),
          style: { pointerEvents: "auto", cursor: "pointer", background: "white", borderRadius: 12, boxShadow: "0 12px 36px rgba(15,15,36,.28)", borderLeft: "5px solid " + cfg.c, overflow: "hidden", animation: "dsiToastIn .25s ease-out" } },
          React.createElement('div', { style: { padding: "11px 14px 10px" } },
            React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 5 } },
              React.createElement('span', { style: { fontSize: 11, fontWeight: 800, color: "white", background: cfg.c, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" } }, cfg.l),
              t.reference && React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: G2, fontFamily: "monospace" } }, t.reference),
              React.createElement('button', { onClick: (e) => { e.stopPropagation(); fermerToast(t.id); }, title: "Fermer", style: { marginLeft: "auto", border: "none", background: "none", color: "#999", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 2 } }, "✕")
            ),
            React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: "#1a1a3e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
              t.qui + (t.hotel ? " — " + t.hotel : "")),
            t.email && t.email !== t.qui && React.createElement('div', { style: { fontSize: 11.5, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.email),
            t.sujet && React.createElement('div', { style: { fontSize: 12.5, color: "#333", fontWeight: 600, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.sujet),
            extrait && React.createElement('div', { style: { fontSize: 12, color: "#666", marginTop: 3, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } }, extrait.slice(0, 220)),
            React.createElement('div', { style: { fontSize: 10.5, color: cfg.c, fontWeight: 600, marginTop: 5 } }, "Cliquer pour ouvrir le ticket →")
          ),
          React.createElement('div', { style: { height: 3, background: cfg.c, opacity: .5, animation: "dsiToastBar 10s linear forwards" } })
        );
      })
    ),
    idleWarning && React.createElement('div', { style: { position: "fixed", inset: 0, background: "rgba(15,15,36,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 } },
      React.createElement('div', { style: { background: "white", borderRadius: 14, padding: 26, width: 380, maxWidth: "100%", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,.3)" } },
        React.createElement('div', { style: { fontSize: 34, marginBottom: 10 } }, "⏰"),
        React.createElement('div', { style: { fontSize: 16, fontWeight: 600, color: "#1a1a3e", marginBottom: 8 } }, "Toujours là ?"),
        React.createElement('div', { style: { fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.5 } }, "Vous allez être déconnecté dans " + (isAdmin ? "2 minutes" : "1 minute") + " pour cause d'inactivité."),
        React.createElement('div', { style: { display: "flex", gap: 10, justifyContent: "center" } },
          React.createElement('button', { onClick: doLogout, style: { padding: "10px 18px", background: "none", border: "1px solid #DDD", color: "#666", borderRadius: 8, fontSize: 13, cursor: "pointer" } }, "Se déconnecter"),
          React.createElement('button', { onClick: stayConnected, style: { padding: "10px 22px", background: G, border: "none", color: "#111", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "Rester connecté")
        )
      )
    ),
    // Menu : barre horizontale (ordinateur) / onglets en bas (mobile). L'ancienne barre latérale n'est plus affichée.
    mobileNav,
    React.createElement('div', { style: { flex: 1, padding: isMobile ? "0 0 calc(92px + env(safe-area-inset-bottom))" : "0 0 24px", overflowX: "clip", width: "100%", minWidth: 0 } },
      topNav,
      // Barre supérieure mobile : logo + profil
      isMobile && React.createElement('div', { style: { position: "sticky", top: 0, zIndex: 40, background: SB, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", marginBottom: 16 } },
        React.createElement('button', { onClick: () => goNav("accueil"), "aria-label": "Accueil", style: { background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" } },
          React.createElement('img', { src: "https://www.dsihotel.com/dsi-logo-gold.png", alt: "DSI Hotel", style: { height: 32 } })),
        React.createElement('span', { style: { fontSize: 9.5, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: G, background: G + "14", border: "1px solid " + G + "33", borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" } }, isAdmin ? "Espace Admin" : "Intranet Client")
      ),
      // Barre supérieure desktop : titre à gauche, compte et déconnexion à droite
      !isMobile && React.createElement('div', { style: { position: "sticky", top: 64, zIndex: 40, background: "rgba(240,242,248,.92)", backdropFilter: "blur(6px)", borderBottom: "1px solid #E2E4EE", display: "flex", alignItems: "center", gap: 16, padding: "13px 22px", marginBottom: 18 } },
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('h2', { style: { margin: 0, fontSize: 17, fontWeight: 500, color: "#1a1a3e" } }, pageTitle),
          page === "proc-detail" && React.createElement('button', { onClick: () => go(isAdmin ? "proc-admin" : "knowledge"), style: { background: "none", border: "none", color: "#888", fontSize: 11, cursor: "pointer", padding: 0, marginTop: 3 } }, "← Retour")
        ),
        React.createElement('div', { style: { textAlign: "right", lineHeight: 1.35 } },
          React.createElement('div', { style: { fontSize: 12, fontWeight: 600, color: "#1a1a3e" } }, isAdmin ? "Administrateur DSI Hotel" : (client ? client.name : "")),
          React.createElement('div', { style: { fontSize: 10.5, color: G2 } }, isAdmin ? "⚡ Administrateur" : "🏨 " + (client ? (client.city || "") : ""))
        ),
        hotelSwitcher(false),
        (isAdmin || isSupervisor) && React.createElement('button', {
          onClick: () => { setChangePwErr(""); setChangePwValue(""); setChangePwValue2(""); setChangePwOpen(true); },
          title: "Changer mon mot de passe",
          style: { display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "white", border: "1px solid #DDE0EA", color: "#555", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }
        }, React.createElement('span', null, "🔑"), React.createElement('span', null, "Mot de passe")),
        React.createElement('button', {
          onClick: doLogout,
          title: "Se déconnecter",
          style: { display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "white", border: "1px solid #DDE0EA", color: "#555", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }
        }, React.createElement('span', null, "🚪"), React.createElement('span', null, "Déconnexion"))
      ),
      React.createElement('div', { style: { padding: isMobile ? "0 16px" : "0 22px" } },
        // Titre : uniquement sur mobile (sur desktop il est dans la barre supérieure)
        isMobile && React.createElement('div', { style: { marginBottom: 16 } },
          React.createElement('h2', { style: { margin: 0, fontSize: 17, fontWeight: 500, color: "#1a1a3e" } }, pageTitle),
          page === "proc-detail" && React.createElement('button', { onClick: () => go(isAdmin ? "proc-admin" : "knowledge"), style: { background: "none", border: "none", color: "#888", fontSize: 11, cursor: "pointer", padding: 0, marginTop: 3 } }, "← Retour")
        ),
        content
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
