// DSI Hotel — portail — core.js : constantes, utilitaires, Supabase, composants partagés
// Script classique (pas de module) : les déclarations de haut niveau sont partagées entre fichiers.
const { useState, useEffect, useRef } = React;

const G = "#C9A84C", G2 = "#A8872E", SB = "#0F0F24";
// ====== ANTIVIRUS (inventaire serveurs) : liste fermée + logo ======
// logo : URL d'un fichier officiel de l'éditeur (PNG/SVG, fond transparent), à héberger dans Supabase Storage.
// Laisser "" tant qu'aucun fichier n'est fourni : une pastille neutre avec les initiales s'affiche à la place.
const AV_LISTE = [
  { k: "sophos", l: "Sophos", logo: "", re: /sophos|intercept/i },
  { k: "crowdstrike", l: "CrowdStrike", logo: "", re: /crowd|falcon/i },
  { k: "defender", l: "Microsoft Defender", logo: "", re: /defender|windows\s*def|\bmde\b/i },
  { k: "sentinelone", l: "SentinelOne", logo: "", re: /sentinel/i },
  { k: "eset", l: "ESET", logo: "", re: /\beset\b|nod32/i },
  { k: "bitdefender", l: "Bitdefender", logo: "", re: /bitdef|gravityzone/i },
  { k: "withsecure", l: "WithSecure", logo: "", re: /withsecure|f-?secure/i },
];
const avReconnaitre = (nom) => { const n = String(nom || "").trim(); return n ? (AV_LISTE.find(x => x.re.test(n)) || null) : null; };
// Logo (ou pastille d'initiales) d'un antivirus, à partir du nom enregistré
const avLogo = (nom, taille) => {
  const n = String(nom || "").trim(); if (!n) return null;
  const av = avReconnaitre(n), t = taille || 20, lib = av ? av.l : n;
  if (av && av.logo) return React.createElement('img', { src: av.logo, alt: lib, title: lib, style: { width: t, height: t, objectFit: "contain", flexShrink: 0 } });
  const ini = lib.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return React.createElement('span', { title: lib, style: { width: t, height: t, borderRadius: 5, background: "#EEF0F4", color: "#4A5568", fontSize: Math.round(t * 0.42), fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, letterSpacing: "-.02em" } }, ini);
};
const PRESTATAIRES = ["Axians","Bartech","CK Print","Colt","Dormakaba","FreedomPay","Hoist","Hospitality","ITM","Medialog","Micros","Novicom","Oracle","Shiji","Support Hilton","Support IHG","Techotels","Wifirst"];
const PRESTA_COLOR = { "Oracle":"#185FA5","Micros":"#0F6E56","Support Hilton":"#BA7517","Dormakaba":"#534AB7","Support IHG":"#3B6D11","Hospitality":"#993C1D","FreedomPay":"#993556","Shiji":"#0C447C","Bartech":"#5F5E5A","Axians":"#A32D2D" };
const prestaColor = (p) => "#534AB7"; // couleur unique pour tous les prestataires
// Alerte Microsoft Defender reçue par email (expéditeur defender-noreply@microsoft.com)
const estAlerteDefender = (t) => /defender-noreply@/i.test(String((t && t.contact_email) || ""));
// Alertes automatiques Sophos Central et sauvegardes (CheckCentral) : onglets dédiés dans Tickets
// Points de contrôle standards appliqués aux check-lists non remplies (et aux nouveaux serveurs)
const CK_POINTS_STANDARD = [
  "Machine en Workgroup (hors domaine AD)",
  "Windows 11 installé + toutes les mises à jour Windows appliquées",
  "Version Windows prise en charge par Microsoft + toutes les mises à jour appliquées",
  "Antivirus (Sophos) installé, actif et signatures à jour",
  "Antivirus installé, actif et signatures à jour",
  "Pare-feu Windows activé (tous profils)",
  "Agent NinjaOne présent et en ligne",
  "Espace disque libre > 20 % sur tous les volumes",
  "Compte Administrateur local : mot de passe changé et rangé dans le gestionnaire de mots de passe",
  "Bureau à distance : NLA activée, aucun accès RDP exposé sur Internet",
  "Sauvegarde Veeam de cette VM OK (dernier job réussi)",
].map((tache, i) => ({ ordre: i + 1, categorie: "Système", tache }));
// Points ajoutés en plus sur les serveurs de sauvegarde Veeam (nom contenant « VEEAM »)
const CK_POINTS_VEEAM = [
  "Security & Compliance Analyzer (console Veeam) : analyse relancée, tous les points en Passed ou exceptions notées en commentaire",
].map((tache, i) => ({ ordre: CK_POINTS_STANDARD.length + i + 1, categorie: "Veeam", tache }));
const ckEstVeeam = (nom) => /veeam/i.test(String(nom || ""));
const ckPointsAttendus = (srv) => ckEstVeeam(srv && srv.nom) ? CK_POINTS_STANDARD.concat(CK_POINTS_VEEAM) : CK_POINTS_STANDARD;
const estAlerteSophos = (t) => !!t && t.source === "sophos";
const estAlerteBackup = (t) => !!t && t.source === "checkcentral";
// Onglet « Alerte Microsoft » : mails Defender + tickets créés par le Worker Microsoft 365
const estAlerteMicrosoft = (t) => estAlerteDefender(t) || (!!t && t.source === "m365");
// Ticket ouvert par le support suite à un appel téléphonique
const estTicketTelephone = (t) => !!t && t.source === "telephone";
// Libellé d'un technicien : « Prénom Nom », jamais l'adresse email.
// Si le nom complet n'est pas renseigné, on le déduit de l'email (jeremie.beal@… -> Jeremie Beal).
const nomTechDepuis = (t) => {
  const n = String((t && t.full_name) || "").trim();
  if (n && n.indexOf("@") < 0) return n;
  const local = String((n || (t && t.email) || "")).split("@")[0];
  const mots = local.split(/[._-]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return mots.join(" ") || "?";
};
const ROLES_CONTACT = ["Front Office", "Réservation", "Room Service", "Économat", "Directeur Général", "Directeur des opérations", "Finance", "Technique", "Sales", "Revenue", "HK", "Autre"];
const estAlerteAuto = (t) => estAlerteMicrosoft(t) || estAlerteSophos(t) || estAlerteBackup(t);
const RDV_CRENEAUX = ["09h30 - 10h30", "10h30 - 11h30", "12h30 - 13h30", "14h30 - 15h30", "15h30 - 16h30", "16h30 - 17h30"];
const semaineOuvree = (dateStr) => { const d = new Date(dateStr + "T00:00:00"); if (isNaN(d.getTime())) return []; const dow = (d.getDay() + 6) % 7; const monday = new Date(d); monday.setDate(d.getDate() - dow); const noms = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]; const out = []; for (let i = 0; i < 5; i++) { const x = new Date(monday); x.setDate(monday.getDate() + i); const iso = x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); out.push({ iso: iso, label: noms[i] + " " + String(x.getDate()).padStart(2, "0") + "/" + String(x.getMonth() + 1).padStart(2, "0") }); } return out; };
const formatJourRdv = (iso) => { if (!iso) return ""; const d = new Date(iso + "T00:00:00"); return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" }); };
// ====== MODE NUIT : preference par utilisateur ======
function dsiGetTheme() { try { return localStorage.getItem("dsi-theme") === "dark" ? "dark" : "light"; } catch (e) { return "light"; } }
function dsiApplyTheme(mode) {
  const html = document.documentElement;
  if (mode === "dark") html.classList.add("dsi-dark"); else html.classList.remove("dsi-dark");
  try { localStorage.setItem("dsi-theme", mode); } catch (e) {}
}
dsiApplyTheme(dsiGetTheme());
// Préférence : notifications audio des nouveaux tickets/réponses. ON par défaut.
function dsiGetSound() { try { return localStorage.getItem("dsi-sound") === "off" ? false : true; } catch (e) { return true; } }
function dsiSetSound(on) { try { localStorage.setItem("dsi-sound", on ? "on" : "off"); } catch (e) {} }
const SUPPORT_EMAIL = "support@dsihotel.com";
const TEAM_EMAIL = "team@dsihotel.fr";
const EMAIL_API_URL = "https://dsi-hotel-api-v2.jeremie-beal.workers.dev/send";
// Worker dédié CheckCentral (statuts de backup). Ajuster l'URL après déploiement
// du Worker "dsi-hotel-checkcentral" si le sous-domaine diffère.
const CHECKCENTRAL_API_URL = "https://dsi-hotel-checkcentral.jeremie-beal.workers.dev/status";
// Worker de supervision Sophos Central (ajuster l'URL après déploiement si le sous-domaine diffère).
const SOPHOS_API_URL = "https://dsi-hotel-sophos.jeremie-beal.workers.dev";
// Worker de blocage d'expéditeurs frauduleux (Tenant Allow/Block List Microsoft 365).
const BLOCAGE_API_URL = "https://dsi-hotel-blocage.jeremie-beal.workers.dev";
// Worker de l'agent Claude des tickets (brouillons de réponse + état du PC via NinjaOne, compte « agent »).
const AGENT_API_URL = "https://dsi-hotel-agent.jeremie-beal.workers.dev";
// Worker de création des boîtes Microsoft 365 (provisioning). Ajuster l'URL après déploiement si le sous-domaine diffère.
const PROVISIONING_API_URL = "https://dsi-hotel-provisioning.jeremie-beal.workers.dev";
// Worker d'inventaire serveurs depuis NinjaOne (lecture seule côté NinjaOne, client API « monitoring »).
const INVENTAIRE_API_URL = "https://dsi-hotel-inventaire.jeremie-beal.workers.dev";
// Console NinjaOne (liens vers la fiche d'un appareil) et portail de support HPE.
const NINJA_CONSOLE_URL = "https://dsihotel.rmmservice.eu";
const HPE_SUPPORT_URL = "https://support.hpe.com/connect/s/?language=fr";
// ID d'application (client) de l'app Entra multi-tenant « DSI Hotel Provisioning » — à renseigner après sa création.
const M365_PROV_APP_ID = "81d69908-c061-4f97-aa17-5bb4a6028a37";

// ====== SIGNATURE EMAIL DSI HOTEL ======
const SIGN_LOGO_URL = "https://www.dsihotel.com/dsi-logo-gold.png";
const SIGN_ADDRESS = "60 Rue François 1er, 75008 Paris";
const SIGN_PHONE = "+33 1 84 18 02 23";
const SIGN_PHONE_TEL = "+33184180223";

// Signature au format texte brut (repli si le client mail n'affiche pas le HTML)
const SIGNATURE_TEXT =
  "\n\n--\n" +
  "DSI Hotel\n" +
  SIGN_ADDRESS + "\n" +
  "Vous pouvez maintenant nous joindre au " + SIGN_PHONE + "\n" +
  SUPPORT_EMAIL;

// Signature au format HTML (styles inline : obligatoire pour les clients mail)
const SIGNATURE_HTML =
  '<table cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;border-top:1px solid #E2E2E8;padding-top:16px;font-family:Arial,Helvetica,sans-serif;">' +
    '<tr><td style="font-size:15px;font-weight:bold;color:#1a1a3e;padding-bottom:5px;">DSI Hotel</td></tr>' +
    '<tr><td style="font-size:13px;color:#555555;padding-bottom:4px;">' + SIGN_ADDRESS + '</td></tr>' +
    '<tr><td style="font-size:13px;color:#555555;padding-bottom:4px;">' +
      'Vous pouvez maintenant nous joindre au ' +
      '<a href="tel:' + SIGN_PHONE_TEL + '" style="color:#1155CC;text-decoration:none;">' + SIGN_PHONE + '</a>' +
    '</td></tr>' +
    '<tr><td style="font-size:13px;">' +
      '<a href="mailto:' + SUPPORT_EMAIL + '" style="color:#1155CC;text-decoration:none;">' + SUPPORT_EMAIL + '</a>' +
      '<span style="color:#999999;"> &nbsp;·&nbsp; </span>' +
      '<a href="https://www.dsihotel.com" style="color:#1155CC;text-decoration:none;">www.dsihotel.com</a>' +
    '</td></tr>' +
  '</table>';

// Échappe le HTML et convertit les retours à la ligne en <br> pour insérer du texte utilisateur
const escapeHtml = (s) => String(s || "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const textToHtml = (s) => escapeHtml(s).replace(/\n/g, "<br>");
// Version texte d'un HTML d'éditeur riche (images retirées, sauts de ligne conservés)
const htmlVersTexteSimple = (html) => String(html || "")
  .replace(/<img\b[^>]*>/gi, " ")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, "&")
  .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

// Assemble un email complet : corps + signature (+ historique optionnel sous la signature)
const buildSignedEmail = (bodyText, history, bodyHtmlOverride) => {
  const histText = history && history.text ? history.text : "";
  const histHtml = history && history.html ? history.html : "";
  // Si un HTML riche est fourni (réponse type avec images), on l'utilise pour le corps
  const corpsHtml = bodyHtmlOverride ? bodyHtmlOverride : textToHtml(bodyText);
  return {
    text: bodyText + SIGNATURE_TEXT + histText,
    html: '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;line-height:1.6;">' +
          corpsHtml + SIGNATURE_HTML + histHtml + '</div>'
  };
};

// Construit le bloc "historique de la conversation" (messages antérieurs)
// placé SOUS la signature, façon citation d'email.
const buildHistory = (messages) => {
  const msgs = (messages || []).filter(m => m && m.body);
  if (msgs.length === 0) return { text: "", html: "" };
  const fmt = (m) => {
    const who = m.sender_role === "admin" ? "Support DSI Hotel" : (m.sender_name || "Client");
    let when = "";
    try { when = new Date(m.created_at).toLocaleString("fr-FR"); } catch (e) { when = ""; }
    return { who, when, body: m.body };
  };
  const items = msgs.map(fmt);
  const text = "\n\n----- Historique de la conversation -----\n\n" +
    items.map(i => "Le " + i.when + ", " + i.who + " a écrit :\n" + i.body).join("\n\n---\n\n");
  const html =
    '<div style="margin-top:24px;border-top:2px solid #E2E2E8;padding-top:14px;">' +
    '<div style="font-size:12px;color:#999999;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Historique de la conversation</div>' +
    items.map(i =>
      '<div style="border-left:3px solid #E2E2E8;padding:2px 0 2px 12px;margin-bottom:14px;">' +
        '<div style="font-size:12px;color:#888888;margin-bottom:4px;">Le ' + escapeHtml(i.when) + ', <strong>' + escapeHtml(i.who) + '</strong> a écrit :</div>' +
        '<div style="font-size:13px;color:#555555;line-height:1.5;">' + textToHtml(i.body) + '</div>' +
      '</div>'
    ).join("") +
    '</div>';
  return { text, html };
};

// Retire une éventuelle signature DSI Hotel déjà présente dans un texte tapé,
// pour éviter une signature en double quand buildSignedEmail ajoute la sienne.
const stripSignature = (s) => {
  let out = String(s || "");
  // Coupe à partir du séparateur "--" placé par SIGNATURE_TEXT
  out = out.replace(/\n?\s*--\s*\n[\s\S]*$/, "");
  // Repli : coupe à partir d'une ligne "DSI Hotel" suivie de l'adresse
  out = out.replace(/\n?\s*DSI Hotel\s*\n\s*60 Rue Fran[cç]ois 1er[\s\S]*$/i, "");
  // Nettoie d'éventuelles lignes de signature résiduelles collées seules
  out = out.replace(/\n?\s*(60 Rue Fran[cç]ois 1er[^\n]*|Vous pouvez maintenant nous joindre[^\n]*|support@dsihotel\.com[^\n]*|www\.dsihotel\.com[^\n]*)\s*$/gi, "");
  return out.replace(/\s+$/, "");
};

// Bloc signature DSI Hotel affiché sous chaque message du support dans le fil du ticket.
const SignatureBlock = () => React.createElement('div', {
  style: { marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,.08)", fontSize: 11.5, color: "#555", lineHeight: 1.5 }
},
  React.createElement('div', { style: { fontWeight: 700, color: "#1a1a3e", marginBottom: 2 } }, "DSI Hotel"),
  React.createElement('div', null, SIGN_ADDRESS),
  React.createElement('div', null, "Vous pouvez maintenant nous joindre au " + SIGN_PHONE),
  React.createElement('div', null,
    React.createElement('a', { href: "mailto:" + SUPPORT_EMAIL, style: { color: "#1155CC", textDecoration: "none" } }, SUPPORT_EMAIL),
    " · ",
    React.createElement('a', { href: "https://www.dsihotel.com", target: "_blank", rel: "noreferrer", style: { color: "#1155CC", textDecoration: "none" } }, "www.dsihotel.com")
  )
);
const ADMIN_API_URL = "https://dsi-hotel-api-v2.jeremie-beal.workers.dev";

// Nettoyage minimal du HTML des réponses types avant affichage/envoi :
// on ne garde que des balises sûres (mise en forme + images + liens).
function sanitizeRichHtml(html) {
  if (!html) return "";
  // Les images d'email intégrées en "cid:" (Content-ID) ne sont pas affichables
  // dans un navigateur (elles n'existent que dans le mail). On retire ces <img>
  // pour éviter des images cassées dans le portail. Les vraies images (URLs http)
  // sont conservées.
  html = String(html).replace(/<img[^>]*\ssrc=["']cid:[^"']*["'][^>]*>/gi, "");
  // Assainissement par DOMPurify (bibliothèque éprouvée). On autorise le HTML
  // d'email courant, sans scripts, iframes ni gestionnaires d'événements.
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
    return window.DOMPurify.sanitize(String(html), {
      ALLOWED_TAGS: ['p','br','b','i','u','s','strong','em','ul','ol','li','a',
                     'span','div','h1','h2','h3','h4','blockquote','pre','code',
                     'img','table','thead','tbody','tr','td','th','hr','sub','sup'],
      ALLOWED_ATTR: ['href','src','alt','title','style','target','rel','width','height','colspan','rowspan'],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target'],
    });
  }
  // Repli défensif si le CDN DOMPurify n'a pas chargé : liste noire regex.
  let h = String(html);
  h = h.replace(/<!--[\s\S]*?-->/g, "");
  h = h.replace(/<(script|style|iframe|object|embed|form|input|textarea|link|meta)[\s\S]*?<\/\1>/gi, "");
  h = h.replace(/<(script|style|iframe|object|embed|form|input|textarea|link|meta)\b[^>]*>/gi, "");
  h = h.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  h = h.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  h = h.replace(/(href|src)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"');
  h = h.replace(/(href|src)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");
  return h;
}

// Détecte si une description de fiche contient du HTML (au moins une balise).
// Les fiches existantes sont en texte brut : on garde alors l'affichage pre-wrap.
// Si du HTML est présent (ex. tableau collé), on le rend proprement via RichHtml
// avec un style de tableau lisible. baseStyle = style du conteneur texte d'origine.
function renderDocDescription(desc, baseStyle) {
  if (!desc) return null;
  const looksHtml = /<(table|thead|tbody|tr|td|th|ul|ol|li|p|br|b|strong|h[1-4]|div|span|hr)\b/i.test(desc);
  if (!looksHtml) {
    return React.createElement('div', { style: { ...baseStyle, whiteSpace: "pre-wrap" } }, desc);
  }
  const wrap = '<div class="dsi-desc-html">' + desc + '</div>';
  // maxWidth + overflow hidden sur le conteneur : la fiche ne déborde jamais,
  // et le scroll horizontal éventuel est géré en interne par .dsi-desc-html.
  return React.createElement(RichHtml, { html: wrap, style: { ...baseStyle, maxWidth: "100%", overflow: "hidden" } });
}

// Badge d'échéance de rappel pour une fiche. Renvoie null si pas de rappel.
// Échu ou aujourd'hui -> rouge ; dans <= 30 jours -> orange ; sinon -> gris.
function rappelBadge(d) {
  if (!d || !d.rappel_date) return null;
  const j = new Date(d.rappel_date + "T00:00:00");
  if (isNaN(j.getTime())) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const diffJours = Math.round((j.getTime() - today.getTime()) / 86400000);
  let coul, bg, bord, prefixe;
  if (diffJours < 0) { coul = "#C53030"; bg = "#FDECEC"; bord = "#F5B5B5"; prefixe = "⏰ Rappel dépassé"; }
  else if (diffJours === 0) { coul = "#C53030"; bg = "#FDECEC"; bord = "#F5B5B5"; prefixe = "⏰ Rappel aujourd'hui"; }
  else if (diffJours <= 30) { coul = "#B7791F"; bg = "#FFFBEB"; bord = "#F0D98A"; prefixe = "⏰ Rappel dans " + diffJours + " j"; }
  else { coul = "#666"; bg = "#F4F4F9"; bord = "#E2E2E8"; prefixe = "⏰ Rappel"; }
  const dateFr = j.toLocaleDateString("fr-FR");
  const txt = prefixe + " · " + dateFr + (d.rappel_note ? " — " + d.rappel_note : "");
  return React.createElement('div', { style: { display: "inline-block", marginBottom: 9, fontSize: 11, fontWeight: 600, color: coul, background: bg, border: "1px solid " + bord, borderRadius: 20, padding: "3px 10px" } }, txt);
}

// Rend du HTML d'email assaini et masque proprement les images externes qui
// n'ont pas pu se charger (logos/pixels de signature Salesforce, etc.),
// au lieu d'afficher une icône "image cassée". Les vraies captures ré-hébergées
// sur Supabase Storage s'affichent normalement.
function RichHtml(props) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const imgs = ref.current.querySelectorAll('img');
    imgs.forEach((img) => {
      // On ne masque une image QUE si son chargement échoue réellement (événement
      // error). On ne masque plus au montage sur la seule base de naturalWidth===0,
      // car une image encore en cours de chargement passait à tort pour cassée
      // (cas des captures Supabase dans les réponses types).
      img.addEventListener('error', () => { img.style.display = 'none'; }, { once: true });
    });
  }, [props.html]);
  return React.createElement('div', {
    ref: ref,
    style: props.style || null,
    dangerouslySetInnerHTML: { __html: sanitizeRichHtml(props.html) }
  });
}

// Éditeur de texte riche (WYSIWYG) basé sur contentEditable, sans dépendance externe.
// props : value (html), onChange(html), onInsertImage() -> déclenche l'upload,
//         placeholder. La ref interne évite de réécrire le HTML à chaque frappe.
function RichEditor(props) {
  const ref = useRef(null);
  const lastValue = useRef("");
  const fileRef = useRef(null);
  const [busyImg, setBusyImg] = useState(false);
  // Au montage : injecte le contenu initial (nécessaire pour afficher les images
  // d'une réponse type qu'on ouvre en modification).
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = props.value || "";
      lastValue.current = props.value || "";
    }
  }, []);
  useEffect(() => {
    // Ne réécrit le contenu que si la valeur externe diffère vraiment
    if (ref.current && props.value !== lastValue.current && props.value !== ref.current.innerHTML) {
      ref.current.innerHTML = props.value || "";
      lastValue.current = props.value || "";
    }
  }, [props.value]);
  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastValue.current = html;
    props.onChange && props.onChange(html);
  };
  const cmd = (command) => { document.execCommand(command, false, null); emit(); if (ref.current) ref.current.focus(); };
  // Insère une image À L'EMPLACEMENT DU CURSEUR (sinon en fin de contenu).
  const insertImgAtCaret = (url) => {
    if (!url) return;
    if (ref.current) ref.current.focus();
    const imgHtml = '<img src="' + url + '" style="max-width:100%;height:auto;border-radius:6px;margin:6px 0;" />';
    let ok = false;
    try { ok = document.execCommand("insertHTML", false, imgHtml); } catch (e) { ok = false; }
    if (!ok && ref.current) ref.current.innerHTML = ref.current.innerHTML + imgHtml; // repli
    emit();
  };
  const uploadAndInsert = async (list) => {
    if (!props.onUploadImage) return;
    const files = Array.from(list || []).filter(f => f && f.type && f.type.indexOf("image") === 0);
    if (!files.length) return;
    setBusyImg(true);
    for (const f of files) { try { const url = await props.onUploadImage(f); insertImgAtCaret(url); } catch (e) {} }
    setBusyImg(false);
  };
  const onPaste = props.onUploadImage ? (e) => {
    const items = (e.clipboardData && e.clipboardData.items) || [];
    const imgs = [];
    for (let i = 0; i < items.length; i++) { const it = items[i]; if (it.kind === "file" && it.type.indexOf("image") === 0) { const b = it.getAsFile(); if (b) imgs.push(b); } }
    if (imgs.length) { e.preventDefault(); uploadAndInsert(imgs); }
  } : undefined;
  const btn = (label, command, title) => React.createElement('button', {
    type: "button", title: title, onMouseDown: e => { e.preventDefault(); cmd(command); },
    style: { padding: "4px 9px", border: "1px solid #DDD", background: "#FFF", borderRadius: 5, fontSize: 12, cursor: "pointer", fontWeight: command === "bold" ? 700 : 400, fontStyle: command === "italic" ? "italic" : "normal" }
  }, label);
  return React.createElement('div', { style: { border: "1px solid #DDD", borderRadius: 7, overflow: "hidden" } },
    React.createElement('div', { style: { display: "flex", gap: 5, padding: 7, background: "#FAFAFC", borderBottom: "1px solid #EEE", flexWrap: "wrap", alignItems: "center" } },
      btn("G", "bold", "Gras"),
      btn("I", "italic", "Italique"),
      btn("• Liste", "insertUnorderedList", "Liste à puces"),
      React.createElement('button', { type: "button", onMouseDown: e => { e.preventDefault(); if (props.onInsertImage) props.onInsertImage(); else if (props.onUploadImage && fileRef.current) fileRef.current.click(); }, style: { padding: "4px 9px", border: "1px solid #C9A84C", background: "#FFFDF5", color: "#8A6D1F", borderRadius: 5, fontSize: 12, cursor: "pointer", fontWeight: 600 } }, "🖼 Insérer une image"),
      (props.busy || busyImg) && React.createElement('span', { style: { fontSize: 11, color: "#999" } }, "Envoi de l'image…"),
      props.onUploadImage && React.createElement('input', { ref: fileRef, type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: e => { uploadAndInsert(e.target.files); e.target.value = ""; } })
    ),
    React.createElement('div', {
      ref: ref, contentEditable: true, onInput: emit, onPaste: onPaste, "data-ph": props.placeholder || "",
      style: { minHeight: 160, maxHeight: 340, overflowY: "auto", padding: "10px 12px", fontSize: 13, lineHeight: 1.6, outline: "none", background: "#FFF" }
    })
  );
}

// ====== CONFIGURATION SUPABASE ======
const SUPABASE_URL = "https://vkamubvlbezhpbunvdai.supabase.co";
const SUPABASE_KEY = "sb_publishable_0bUT3AjMaWBI9qQa9ZKmrA_3BRqNvbL";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Appel de la route /send du Worker AVEC la session de l'utilisateur connecté.
// Le Worker refuse désormais tout envoi sans session valide (anti-relais de spam/phishing).
async function fetchEmailApi(options) {
  const { data } = await sb.auth.getSession();
  const token = (data && data.session && data.session.access_token) || "";
  return fetch(EMAIL_API_URL, { ...options, headers: { ...((options && options.headers) || {}), Authorization: "Bearer " + token } });
}
const STORAGE_BUCKET = "uploads";

const CATS = ["Cyber Sécurité", "Logiciel Marriott", "Logiciel Hilton", "Logiciel Radisson", "Logiciel IHG", "Adobe PDF", "Création de compte", "Problème Opera", "Problème Office", "Problème Mot de Passe", "Problème Réseau", "Problème Matériel", "Installation logiciel", "Email entrant", "Sauvegarde", "Autre"];
const CAT_ICONS = { "Cyber Sécurité": "🛡️", "Logiciel Marriott": "🏨", "Logiciel Hilton": "🏨", "Logiciel Radisson": "🏨", "Logiciel IHG": "🏨", "Adobe PDF": "📕", "Création de compte": "👤", "Problème Opera": "🖥️", "Problème Office": "📧", "Problème Mot de Passe": "🔒", "Problème Réseau": "📶", "Problème Matériel": "🖨️", "Installation logiciel": "💿", "Email entrant": "📨", "Sauvegarde": "💾", "Autre": "❓" };
const FILE_ICONS = { pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗" };

// Catégories de la documentation technique (fiches par hôtel)
const DOC_CATS = ["Infrastructure", "Plan caméras", "Schéma réseau", "Téléphonie", "Wi-Fi", "Matériel", "Accès et codes", "Care Pack", "Autre"];
const DOC_CAT_ICONS = { "Infrastructure": "🗄️", "Plan caméras": "📹", "Schéma réseau": "🌐", "Téléphonie": "☎️", "Wi-Fi": "📶", "Matériel": "🖥️", "Accès et codes": "🔑", "Care Pack": "📦", "Autre": "📁" };
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];
const isImageFile = (name) => IMAGE_EXTS.includes((name.split('.').pop() || '').toLowerCase());
const fileExt = (name) => (name.split('.').pop() || '').toLowerCase();

// ====== Aperçu intégré des documents (procédures) ======
// PDF : affiché directement par le navigateur. Word / Excel / PowerPoint : affichés
// via la visionneuse Microsoft Office Online (fichier public Supabase). Autres : lien.
const OFFICE_EXTS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
// ====== Planning : utilitaires de dates (en heure locale, format YYYY-MM-DD) ======
const plYmd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const plLundi = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return plYmd(x); };
const plAjout = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return plYmd(d); };
const PL_COULEURS = ["#3182CE", "#38A169", "#D69E2E", "#805AD5", "#DD6B20", "#319795", "#D53F8C", "#718096"];
const urlTelechargement = (f) => f.file_url + (f.file_url.includes("?") ? "&" : "?") + "download=" + encodeURIComponent(f.file_name || "fichier");
const urlApercu = (f) => {
  const ext = fileExt(f.file_name || "");
  if (ext === "pdf") return f.file_url + "#view=FitH";
  if (OFFICE_EXTS.includes(ext)) return "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(f.file_url);
  return null;
};
function DocApercu({ f }) {
  const apercu = urlApercu(f);
  const [ouvert, setOuvert] = React.useState(true);
  const lienS = { color: G2, fontSize: 11, textDecoration: "none", whiteSpace: "nowrap" };
  return React.createElement('div', { style: { border: "1px solid #E8E8F0", borderRadius: 8, overflow: "hidden", background: "#F8F8FC" } },
    React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 12, color: "#333", flexWrap: "wrap" } },
      React.createElement('span', { style: { fontSize: 16 } }, FILE_ICONS[fileExt(f.file_name || "")] || "📄"),
      React.createElement('span', { style: { flex: 1, minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.file_name),
      apercu && React.createElement('button', { onClick: () => setOuvert(!ouvert), style: { background: "none", border: "none", padding: 0, cursor: "pointer", ...lienS } }, ouvert ? "Masquer ▲" : "Afficher ▼"),
      apercu && React.createElement('a', { href: apercu, target: "_blank", rel: "noreferrer", style: lienS }, "Plein écran ↗"),
      React.createElement('a', { href: urlTelechargement(f), rel: "noreferrer", style: lienS }, "Télécharger ⬇")
    ),
    apercu && ouvert && React.createElement('iframe', { src: apercu, title: f.file_name, loading: "lazy", style: { display: "block", width: "100%", height: "75vh", minHeight: 420, border: 0, borderTop: "1px solid #E8E8F0", background: "#fff" } })
  );
}

const Badge = ({ label, color }) => (
  React.createElement('span', { style: { display: "inline-block", padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: color + "22", color, border: `1px solid ${color}44` } }, label)
);

// Liste de pièces jointes : vignettes pour les images, liens pour les documents
// onOpenImage(images, index) ouvre la visionneuse ; si absent, lien classique
const FileList = ({ files, title, onOpenImage }) => {
  if (!files || files.length === 0) return null;
  const imgs = files.filter(f => isImageFile(f.file_name));
  const docs = files.filter(f => !isImageFile(f.file_name));
  return React.createElement('div', { style: { marginBottom: 12 } },
    title && React.createElement('div', { style: { fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 6 } }, title),
    imgs.length > 0 && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: docs.length ? 8 : 0 } },
      imgs.map((f, i) => onOpenImage
        ? React.createElement('img', { key: f.id, src: f.file_url, alt: f.file_name, title: f.file_name, onClick: () => onOpenImage(imgs, i), style: { width: 78, height: 78, objectFit: "cover", borderRadius: 7, border: "1px solid #E2E2E8", cursor: "zoom-in" } })
        : React.createElement('a', { key: f.id, href: f.file_url, target: "_blank", rel: "noreferrer", title: f.file_name, style: { display: "block", lineHeight: 0 } },
            React.createElement('img', { src: f.file_url, alt: f.file_name, style: { width: 78, height: 78, objectFit: "cover", borderRadius: 7, border: "1px solid #E2E2E8" } })
          )
      )
    ),
    docs.length > 0 && React.createElement('div', { style: { display: "flex", flexDirection: "column", gap: 5 } },
      docs.map(f => React.createElement('a', { key: f.id, href: f.file_url, target: "_blank", rel: "noreferrer", style: { display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #E8E8F0", borderRadius: 7, padding: "7px 11px", fontSize: 12, color: "#333", textDecoration: "none" } },
        React.createElement('span', { style: { fontSize: 15 } }, FILE_ICONS[fileExt(f.file_name)] || "📄"),
        React.createElement('span', { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.file_name),
        React.createElement('span', { style: { color: G2, fontSize: 11, whiteSpace: "nowrap" } }, "Télécharger ⬇")
      ))
    )
  );
};

// Upload un fichier vers Supabase Storage, retourne son URL publique
async function uploadToStorage(file, pathPrefix) {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${pathPrefix}/${Date.now()}_${cleanName}`;
  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file);
  if (error) throw error;
  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Vidéo d'une procédure interne : renvoie { embed, lien } à partir de ce qui a été collé :
//  - un code d'intégration <iframe …> (SharePoint / Stream « Intégrer ») -> on extrait le src
//  - un lien SharePoint /_layouts/15/embed.aspx -> intégré directement
//  - un lien YouTube / Vimeo -> intégré
//  - tout autre lien (SharePoint partagé, Stream…) -> bouton « Ouvrir la vidéo » (nouvel onglet)
function videoInterneInfo(saisie) {
  let u = String(saisie || "").trim();
  if (!u) return null;
  const mIframe = u.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (mIframe) u = mIframe[1].replace(/&amp;/g, "&");
  if (!/^https:\/\//i.test(u)) return null;
  if (/\.sharepoint\.com\/.*\/_layouts\/15\/embed\.aspx/i.test(u)) return { embed: u, lien: u };
  const yt = videoEmbedUrl(u);
  if (yt) return { embed: yt, lien: u };
  return { embed: null, lien: u };
}

// Plusieurs vidéos par procédure interne, stockées dans la colonne texte video_url :
//  - ancien format : un seul lien (texte brut)
//  - nouveau format : JSON [{ titre, url }, …]
function videosInternesLire(val) {
  const t = String(val || "").trim();
  if (!t) return [];
  if (t.charAt(0) === "[") {
    try { const a = JSON.parse(t); if (Array.isArray(a)) return a.filter(v => v && v.url).map(v => ({ titre: String(v.titre || ""), url: String(v.url) })); } catch (e) {}
  }
  return [{ titre: "", url: t }];
}
function videosInternesEcrire(liste) {
  const a = (liste || []).map(v => ({ titre: String(v.titre || "").trim(), url: String(v.url || "").trim() })).filter(v => v.url);
  return a.length ? JSON.stringify(a) : null;
}

// Transforme un lien YouTube ou Vimeo (partagé/non répertorié) en URL d'intégration
// pour un <iframe>. Renvoie null si le lien n'est pas reconnu.
function videoEmbedUrl(url) {
  if (!url) return null;
  const u = String(url).trim();
  // YouTube : youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (m) return "https://www.youtube.com/embed/" + m[1];
  // Vimeo : vimeo.com/ID  ou player.vimeo.com/video/ID
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (m) return "https://player.vimeo.com/video/" + m[1];
  return null;
}

// ====== RAPPORT DE SUIVI DES TICKETS : SLA, heures ouvrées, type, dessin du PDF ======
// Cibles SLA en HEURES OUVRÉES (lundi-vendredi, de SLA_H_DEBUT à SLA_H_FIN, heure de Paris).
// Ces valeurs apparaissent dans le rapport envoyé aux clients : à valider avec la direction.
const SLA_H_DEBUT = 8, SLA_H_FIN = 19;
const SLA_JOUR_H = SLA_H_FIN - SLA_H_DEBUT;
const SLA_PRIORITES = [
  { p: "Urgent",  code: "P1", rep: 1, res: 4 },
  { p: "Haute",   code: "P2", rep: 2, res: SLA_JOUR_H },
  { p: "Moyenne", code: "P3", rep: 4, res: 2 * SLA_JOUR_H },
  { p: "Basse",   code: "P4", rep: 8, res: 5 * SLA_JOUR_H },
];
// Langue du rapport client : "fr" (défaut) ou "en". Positionnée par dessinerRapportTicketsPdf.
let RT_LANG = "fr";
const tr = (fr, en) => RT_LANG === "en" ? en : fr;
const PRIO_EN = { "Urgent": "Urgent", "Haute": "High", "Moyenne": "Medium", "Basse": "Low" };
const prioLbl = (p) => tr(p, PRIO_EN[p] || p);
const slaDe = (prio) => SLA_PRIORITES.find(x => x.p === prio) || SLA_PRIORITES[2];
const fmtCibleSla = (h) => { if (h >= SLA_JOUR_H && h % SLA_JOUR_H === 0) { const j = h / SLA_JOUR_H; return j + tr(" j ouvré" + (j > 1 ? "s" : ""), " business day" + (j > 1 ? "s" : "")); } return h + " h"; };

// Heures ouvrées écoulées entre deux dates (jours fériés non déduits).
const _fmtParis = (() => { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); } catch (e) { return null; } })();
function partiesParis(ms) {
  const p = {};
  if (_fmtParis) _fmtParis.formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
  else { const d = new Date(ms); p.year = d.getFullYear(); p.month = d.getMonth() + 1; p.day = d.getDate(); p.hour = d.getHours(); p.minute = d.getMinutes(); p.second = d.getSeconds(); }
  return { y: +p.year, m: +p.month - 1, d: +p.day, h: (+p.hour) % 24, mi: +p.minute, s: +p.second };
}
function parisVersUtc(y, m, d, h) {
  const approx = Date.UTC(y, m, d, h);
  const q = partiesParis(approx);
  return approx - (Date.UTC(q.y, q.m, q.d, q.h, q.mi, q.s) - approx);
}
function heuresOuvrees(debut, fin) {
  const a = new Date(debut).getTime(), b = new Date(fin).getTime();
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  const pa = partiesParis(a), pb = partiesParis(b);
  let jour = Date.UTC(pa.y, pa.m, pa.d);
  const dernier = Date.UTC(pb.y, pb.m, pb.d);
  let total = 0, garde = 0;
  while (jour <= dernier && garde++ < 1200) {
    const dt = new Date(jour), dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const y = dt.getUTCFullYear(), m = dt.getUTCMonth(), d = dt.getUTCDate();
      const lo = Math.max(a, parisVersUtc(y, m, d, SLA_H_DEBUT)), hi = Math.min(b, parisVersUtc(y, m, d, SLA_H_FIN));
      if (hi > lo) total += hi - lo;
    }
    jour += 86400000;
  }
  return total / 3600000;
}

// Incident ou demande : choix manuel du technicien (colonne type_ticket), sinon détection automatique.
const TYPE_DEMANDE_CATS = ["Création de compte", "Installation logiciel", "Problème Mot de Passe"];
const RE_INCIDENT = /probl[eè]me|panne|bloqu|erreur|ne (fonctionne|marche|s'allume|d[ée]marre|r[ée]pond)|n'arrive|impossible|bug|plant|lent(eur)?\b|coup[ée]|hors service|\bhs\b|souci|incident|ne re[çc]oi|plus d'acc[eè]s|plus de (connexion|r[ée]seau|wi-?fi|internet)|virus|phishing|hame[çc]on|frauduleu|piratage/i;
const RE_DEMANDE = /cr[ée]ation|cr[ée]er|nouve(l|lle|au|aux)\b|ajout|install|acc[eè]s|droits?\b|commande|devis|\brfq\b|demande|modifi|changement|mise en place|configur|param[eè]tr|besoin|d[ée]part|arriv[ée]e|transf[ée]r|r[ée]initialis|mot de passe|d[ée]m[ée]nagement|formation|mise [àa] jour|patch|planifi|reschedul|programm/i;
function typeTicket(t) {
  if (!t) return "incident";
  if (t.type_ticket === "incident" || t.type_ticket === "demande") return t.type_ticket;
  if (t.contact_role === "Demande interne" || /^\[Demande interne\]/i.test(t.subject || "")) return "demande";
  if (TYPE_DEMANDE_CATS.includes(t.category)) return "demande";
  if (t.category && t.category !== "Email entrant" && t.category !== "Autre") return "incident";
  const sujet = String(t.subject || "");
  const texte = sujet + " " + String(t.message || "").slice(0, 400);
  if (RE_INCIDENT.test(sujet)) return "incident";
  if (RE_DEMANDE.test(sujet)) return "demande";
  if (RE_INCIDENT.test(texte)) return "incident";
  if (RE_DEMANDE.test(texte)) return "demande";
  return "incident";
}

const medianeDe = (arr) => { const a = (arr || []).filter(v => v !== null && v !== undefined && !isNaN(v)).sort((x, y) => x - y); if (!a.length) return null; const k = Math.floor(a.length / 2); return a.length % 2 ? a[k] : (a[k - 1] + a[k]) / 2; };
const moyenneDe = (arr) => { const a = (arr || []).filter(v => v !== null && v !== undefined && !isNaN(v)); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; };

// Une ligne par ticket : délais en heures ouvrées, respect des SLA, appartenance à la période.
function calculerRapportTickets(tks, msgsByTicket, bDuMs, bAuMs) {
  const refFin = Math.min(Date.now(), bAuMs);
  return (tks || []).map(t => {
    const ms = msgsByTicket[t.id] || [];
    const cree = new Date(t.created_at).getTime();
    const ferme = t.status === "closed";
    const fermeMs = t.closed_at ? new Date(t.closed_at).getTime() : null;
    const sla = slaDe(t.priority);
    const premiere = ms.find(m => m.sender_role === "admin");
    let delaiH = null;
    if (premiere) { const pm = new Date(premiere.created_at).getTime(); if (pm >= cree) delaiH = heuresOuvrees(cree, pm); }
    let resolH = null;
    if (ferme && fermeMs && fermeMs >= cree) resolH = heuresOuvrees(cree, fermeMs);
    const ecouleH = (!ferme && refFin > cree) ? heuresOuvrees(cree, refFin) : 0;
    const slaRep = delaiH !== null ? (delaiH > sla.rep ? "ko" : "ok") : (!ferme && ecouleH > sla.rep ? "ko" : null);
    // Résolution dépendant d'un autre prestataire : pas de SLA de résolution (la 1re réponse reste mesurée)
    const presta = t.prestataire ? String(t.prestataire) : null;
    const slaRes = presta ? null : resolH !== null ? (resolH > sla.res ? "ko" : "ok") : (!ferme && ecouleH > sla.res ? "ko" : null);
    const creeDansPeriode = cree >= bDuMs && cree <= bAuMs;
    const fermeDansPeriode = ferme && (fermeMs ? (fermeMs >= bDuMs && fermeMs <= bAuMs) : creeDansPeriode);
    const ouvertFin = cree <= bAuMs && !(ferme && (!fermeMs || fermeMs <= bAuMs));
    return {
      id: t.id,
      reference: t.reference || "—",
      subject: t.subject || t.category || "(sans objet)",
      category: t.category || "—",
      priority: sla.p,
      type: typeTicket(t),
      status: t.status,
      created_at: t.created_at,
      closed_at: t.closed_at || null,
      nbMessages: ms.length,
      prestataire: presta,
      delaiH, resolH, slaRep, slaRes,
      creeDansPeriode, fermeDansPeriode, ouvertFin,
    };
  });
}

// Indicateurs du tableau de bord (calculés sur les tickets créés pendant la période,
// sauf « fermés » et « en cours en fin de période »).
function statsRapportTickets(rows) {
  rows = rows || [];
  const crees = rows.filter(r => r.creeDansPeriode);
  const fermes = rows.filter(r => r.fermeDansPeriode);
  const evalues = crees.filter(r => r.slaRep || r.slaRes);
  const hors = evalues.filter(r => r.slaRep === "ko" || r.slaRes === "ko");
  return {
    total: rows.length,
    crees: crees.length,
    fermes: fermes.length,
    enCoursFin: rows.filter(r => r.ouvertFin).length,
    enCoursPresta: rows.filter(r => r.ouvertFin && r.prestataire).length,
    ouverts: rows.filter(r => r.status !== "closed").length,
    delaiMed: medianeDe(crees.map(r => r.delaiH)),
    delaiMoy: moyenneDe(crees.map(r => r.delaiH)),
    resolMed: medianeDe(fermes.map(r => r.resolH)),
    resolMoy: moyenneDe(fermes.map(r => r.resolH)),
    slaPct: evalues.length ? Math.round(100 * (evalues.length - hors.length) / evalues.length) : null,
    horsSla: hors.length,
    slaEvalues: evalues.length,
    incidents: crees.filter(r => r.type === "incident").length,
    demandes: crees.filter(r => r.type === "demande").length,
    parPrio: SLA_PRIORITES.map(s => {
      const l = crees.filter(r => r.priority === s.p);
      return { ...s, n: l.length, horsRep: l.filter(r => r.slaRep === "ko").length, horsRes: l.filter(r => r.slaRes === "ko").length, resolMed: medianeDe(l.map(r => r.resolH)) };
    }),
  };
}

// Dessin du PDF (jsPDF). opts = { hotelName, logo, periode, finPeriode, rows, stats, genereLe?, timeZone? }
// Définitions affichées sur la page de garde du rapport (et à l'écran)
const PRIORITE_DEFS = {
  "Urgent":  { titre: "Arrêt de l'activité", txt: "L'hôtel ou un service critique est à l'arrêt, sans solution de contournement.", ex: "PMS Opera, Internet, caisses (POS), encodeur de clés" },
  "Haute":   { titre: "Service fortement dégradé", txt: "Un service important ou un poste clé est bloqué ; l'activité continue avec difficulté.", ex: "poste de réception en panne, Wi-Fi clients instable" },
  "Moyenne": { titre: "Gêne pour un utilisateur", txt: "Problème ou demande courante qui ne bloque pas l'activité de l'hôtel.", ex: "boîte mail d'un collaborateur, accès à un dossier, logiciel à installer" },
  "Basse":   { titre: "Demande planifiable", txt: "Évolution, information ou intervention à programmer.", ex: "nouveau matériel à commander, mise à jour planifiée, devis" },
};
const PRIORITE_DEFS_EN = {
  "Urgent":  { titre: "Business stopped", txt: "The hotel or a critical service is down, with no workaround.", ex: "Opera PMS, Internet, POS, key encoder" },
  "Haute":   { titre: "Severely degraded service", txt: "An important service or key workstation is blocked; operations continue with difficulty.", ex: "front desk PC down, unstable guest Wi-Fi" },
  "Moyenne": { titre: "Single-user issue", txt: "Common issue or request that does not block hotel operations.", ex: "a staff mailbox, access to a folder, software to install" },
  "Basse":   { titre: "Plannable request", txt: "Change, information request or work to be scheduled.", ex: "new hardware to order, scheduled update, quote" },
};
const COLONNES_DEFS_EN = [
  ["Created / closed", "Tickets opened by the hotel during the period / tickets closed during the period (including older ones)."],
  ["Open at ...", "Tickets still open at the end of the period, including those followed up with a third-party provider."],
  ["SLA compliance", "Share of tickets handled within the target times for their priority (first response and resolution)."],
  ["Median times", "Time of the \"middle\" ticket: more representative than the average, which one exceptional case can skew."],
  ["Type", "Incident: something has stopped working. Request: a new need (account, hardware, access, quote)."],
  ["Priority", "P1 to P4, set by our technicians according to the business impact (see opposite)."],
  ["Status", "Open, Closed, or Third party: resolution depends on another provider and we follow it up."],
  ["First response", "Time between ticket creation and the first reply from a DSI Hotel technician."],
  ["Resolution", "Time between ticket creation and closure. \"open\": ticket not yet closed."],
  ["Colours", "Green: within the SLA target. Red / \"overdue\": target exceeded."],
];
const COLONNES_DEFS = [
  ["Créés / fermés", "Tickets ouverts par l'hôtel pendant la période / tickets clôturés pendant la période (y compris ouverts avant)."],
  ["En cours au ...", "Tickets encore ouverts à la date de fin de la période, dont ceux suivis chez un prestataire."],
  ["Respect des SLA", "Part des tickets traités dans les délais cibles de leur priorité (1re réponse et résolution)."],
  ["Délais médians", "Délai du ticket « du milieu » : plus représentatif que la moyenne, qu'un cas exceptionnel fausse."],
  ["Type", "Incident : quelque chose ne fonctionne plus. Demande : un besoin nouveau (compte, matériel, accès, devis)."],
  ["Priorité", "P1 à P4, fixée par nos techniciens selon l'impact sur l'activité (voir ci-contre)."],
  ["Statut", "Ouvert, Fermé, ou Prestataire : la résolution dépend d'un autre prestataire et nous assurons le suivi."],
  ["1re réponse", "Délai entre l'ouverture du ticket et la première réponse d'un technicien DSI Hotel."],
  ["Résolution", "Délai entre l'ouverture et la clôture du ticket. « en cours » : ticket non clôturé."],
  ["Couleurs", "Vert : dans la cible SLA. Rouge / « en retard » : cible dépassée."],
];

function dessinerPageGarde(doc, opts, k) {
  const { NAVY, GOLD, GOLD2, GRIS, VIOLET, fill, ink, pale, PRIO_C } = k;
  const pageW = 297, mL = 12, mR = 12;
  const gris = (v) => doc.setTextColor(v, v, v + 12);
  // Bandeau
  fill(NAVY); doc.rect(0, 0, pageW, 24, "F");
  fill(GOLD); doc.rect(0, 24, pageW, 1.2, "F");
  ink(GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text("DSI HOTEL", mL, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(185, 185, 205);
  doc.text("60 Rue François 1er, 75008 Paris  •  +33 1 84 18 02 23  •  support@dsihotel.com", mL, 18.5);
  doc.setTextColor(255, 255, 255); doc.setFontSize(10);
  doc.text(tr("Rapport de suivi des tickets", "Support ticket report"), pageW - mR, 14, { align: "right" });

  // ---- Bloc identité (gauche) : logo, hôtel, période ----
  const gx = mL, gw = 112, gy = 32, gh = 70;
  fill([247, 247, 251]); doc.roundedRect(gx, gy, gw, gh, 3, 3, "F");
  let logoBas = gy + 8;
  if (opts.logo && opts.logo.data) {
    try {
      let lw = opts.logo.w, lh = opts.logo.h;
      if (!lw || !lh) { const pr = doc.getImageProperties(opts.logo.data); lw = pr.width; lh = pr.height; }
      const r = lw / lh; let w = 64, h = w / r; if (h > 30) { h = 30; w = h * r; }
      doc.addImage(opts.logo.data, opts.logo.format || "PNG", gx + (gw - w) / 2, gy + 6, w, h);
      logoBas = gy + 6 + h + 3;
    } catch (e) {}
  }
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  const nom = doc.splitTextToSize(opts.hotelName || "—", gw - 12).slice(0, 2);
  const yNom = Math.max(logoBas + 7, gy + 22);
  doc.text(nom, gx + gw / 2, yNom, { align: "center" });
  const yApres = yNom + (nom.length - 1) * 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); gris(90);
  doc.text(tr("Rapport de suivi des tickets de support", "Support ticket tracking report"), gx + gw / 2, yApres + 6.5, { align: "center" });
  const per = tr("Période : ", "Period: ") + (opts.periode || "—");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  const pw = doc.getTextWidth(per) + 10;
  fill(pale(GOLD, 0.2)); doc.roundedRect(gx + (gw - pw) / 2, yApres + 9.5, pw, 7.5, 3.7, 3.7, "F");
  ink(GOLD2); doc.text(per, gx + gw / 2, yApres + 14.4, { align: "center" });

  // ---- Bloc horaires / calcul (droite) ----
  const hx = gx + gw + 6, hw = pageW - mR - hx;
  fill(pale(NAVY, 0.06)); doc.roundedRect(hx, gy, hw, gh, 3, 3, "F");
  fill(GOLD); doc.rect(hx, gy + 4, 1.6, gh - 8, "F");
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(tr("Horaires du support et calcul des délais", "Support hours and how times are calculated"), hx + 7, gy + 8);
  const points = RT_LANG === "en" ? [
    ["Support open Monday to Friday, " + SLA_H_DEBUT + ":00 to " + SLA_H_FIN + ":00", " (Paris time)."],
    ["Business-hours timing: ", "nights, Saturdays and Sundays are not counted. A ticket opened on Friday at 18:00 and handled on Monday at 9:00 therefore has a 2 h response time. One business day = " + SLA_JOUR_H + " h."],
    ["Weekend emergencies: ", "we remain reachable at weekends for any P1 emergency (hotel operations stopped)."],
    ["Tickets followed up with a third party: ", "when resolution depends on another provider (software vendor, carrier, manufacturer...), we keep the ticket open and follow it up until it is fully resolved. As its resolution time is outside our control, it is not counted in the resolution SLA; the first response is still measured."],
  ] : [
    ["Support ouvert du lundi au vendredi, de " + SLA_H_DEBUT + " h à " + SLA_H_FIN + " h", " (heure de Paris)."],
    ["Délais en heures ouvrées : ", "les nuits, samedis et dimanches ne sont pas décomptés. Un ticket ouvert le vendredi à 18 h et traité le lundi à 9 h a ainsi un délai de 2 h. Un jour ouvré = " + SLA_JOUR_H + " h."],
    ["Urgences du week-end : ", "nous restons joignables le week-end pour toute urgence P1 (arrêt de l'activité de l'hôtel)."],
    ["Tickets suivis chez un prestataire : ", "quand la résolution dépend d'un autre prestataire (éditeur, opérateur, constructeur...), nous gardons le ticket ouvert pour en assurer le suivi jusqu'à la résolution complète. Son délai de résolution ne dépend pas de nous : il n'est pas compté dans le SLA de résolution, la 1re réponse reste mesurée."],
  ];
  let py = gy + 15.5;
  points.forEach(([gras, txt0]) => {
    let txt = txt0;
    doc.setFontSize(8.4);
    fill(GOLD); doc.circle(hx + 8.2, py - 1.1, 0.9, "F");
    doc.setFont("helvetica", "bold"); ink(NAVY);
    const gw2 = doc.getTextWidth(/\s$/.test(gras) ? gras : gras + " ");
    txt = txt.trim();
    // 1re ligne : début en gras, suite en normal ; lignes suivantes en normal
    doc.setFont("helvetica", "normal");
    const largeur = hw - 18;
    const premiere = doc.splitTextToSize(txt, largeur - gw2)[0] || "";
    const reste = txt.slice(premiere.length).trim();
    doc.setFont("helvetica", "bold"); ink(NAVY); doc.text(gras, hx + 11, py);
    doc.setFont("helvetica", "normal"); gris(60); doc.text(premiere, hx + 11 + gw2, py);
    const lignes = reste ? doc.splitTextToSize(reste, largeur) : [];
    if (lignes.length) doc.text(lignes, hx + 11, py + 4);
    py += 4 + lignes.length * 4 + 2.6;
  });

  // ---- Niveaux de priorité (bas gauche) ----
  const by = gy + gh + 6, bh = 210 - 14 - by, pxw = 163;
  fill([247, 247, 251]); doc.roundedRect(mL, by, pxw, bh, 3, 3, "F");
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(tr("Niveaux de priorité et délais cibles (SLA)", "Priority levels and target times (SLA)"), mL + 5, by + 7.5);
  doc.setFontSize(6.8); gris(120);
  doc.text(tr("1RE RÉPONSE", "1ST RESPONSE"), mL + pxw - 38, by + 7.5, { align: "center" });
  doc.text(tr("RÉSOLUTION", "RESOLUTION"), mL + pxw - 15, by + 7.5, { align: "center" });
  const rh = (bh - 12) / 4;
  SLA_PRIORITES.forEach((sp, i) => {
    const d = (RT_LANG === "en" ? PRIORITE_DEFS_EN : PRIORITE_DEFS)[sp.p] || {}, c = PRIO_C[sp.p] || GRIS;
    const yy = by + 11 + i * rh;
    if (i) { doc.setDrawColor(226, 226, 234); doc.setLineWidth(0.2); doc.line(mL + 4, yy - 1, mL + pxw - 4, yy - 1); }
    fill(pale(c, 0.16)); doc.roundedRect(mL + 5, yy + 1.2, 22, 7, 3.5, 3.5, "F");
    ink(c); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(sp.code + " " + prioLbl(sp.p), mL + 16, yy + 5.9, { align: "center" });
    const tx = mL + 31, tw = pxw - 31 - 52;
    ink(NAVY); doc.setFontSize(8.6); doc.text(d.titre || "", tx, yy + 4.2);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.6); gris(70);
    const l1 = doc.splitTextToSize(d.txt || "", tw).slice(0, 2);
    doc.text(l1, tx, yy + 8);
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); gris(125);
    doc.text(doc.splitTextToSize(tr("Ex. : ", "E.g.: ") + (d.ex || ""), tw).slice(0, 2), tx, yy + 8 + l1.length * 3.4);
    ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(fmtCibleSla(sp.rep), mL + pxw - 38, yy + 6.2, { align: "center" });
    doc.text(fmtCibleSla(sp.res), mL + pxw - 15, yy + 6.2, { align: "center" });
    if (sp.code === "P1") { doc.setFont("helvetica", "normal"); doc.setFontSize(6.4); ink(c); doc.text(tr("+ astreinte week-end", "+ weekend on-call"), mL + pxw - 26.5, yy + 10.5, { align: "center" }); }
  });

  // ---- Lecture du rapport (bas droite) ----
  const cx = mL + pxw + 6, cw = pageW - mR - cx;
  fill([247, 247, 251]); doc.roundedRect(cx, by, cw, bh, 3, 3, "F");
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(tr("Comment lire ce rapport", "How to read this report"), cx + 5, by + 7.5);
  let cy = by + 13.2;
  (RT_LANG === "en" ? COLONNES_DEFS_EN : COLONNES_DEFS).forEach(([t, d]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.3); ink(NAVY);
    doc.text(t, cx + 5, cy);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); gris(75);
    const l = doc.splitTextToSize(d, cw - 36);
    doc.text(l, cx + 31, cy);
    cy += Math.max(1, l.length) * 3.15 + 1.75;
  });
}

function fmtDelaiHM(h) {
  if (h === null || h === undefined || isNaN(h)) return "—";
  const totalMin = Math.max(0, Math.round(h * 60));
  const jourMin = SLA_JOUR_H * 60;
  const j = Math.floor(totalMin / jourMin);
  const hh = Math.floor((totalMin % jourMin) / 60);
  const mm = String(totalMin % 60).padStart(2, "0");
  return j ? j + tr(" j ouvré" + (j > 1 ? "s" : ""), " bus. day" + (j > 1 ? "s" : "")) + " " + hh + " h " + mm : hh + " h " + mm + " min";
}
function dessinerRapportTicketsPdf(jsPDF, opts) {
  const langPrec = RT_LANG;
  RT_LANG = opts.lang === "en" ? "en" : "fr";
  try { return _dessinerRapportTicketsPdf(jsPDF, opts); } finally { RT_LANG = langPrec; }
}
function _dessinerRapportTicketsPdf(jsPDF, opts) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = 297, pageH = 210, mL = 12, mR = 12, W = pageW - mL - mR;
  const NAVY = [15, 15, 36], GOLD = [201, 168, 76], GOLD2 = [168, 135, 46];
  const BLEU = [43, 108, 176], VERT = [47, 133, 90], ORANGE = [221, 107, 32], ROUGE = [197, 48, 48], GRIS = [113, 128, 150], VIOLET = [107, 70, 193];
  const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const pale = (c, a) => [Math.round(255 - (255 - c[0]) * a), Math.round(255 - (255 - c[1]) * a), Math.round(255 - (255 - c[2]) * a)];
  const tzo = opts.timeZone ? { timeZone: opts.timeZone } : {};
  const fmtD = (d) => { try { const x = new Date(d); return x.toLocaleDateString(tr("fr-FR", "en-GB"), tzo) + " " + x.toLocaleTimeString(tr("fr-FR", "en-GB"), { ...tzo, hour: "2-digit", minute: "2-digit" }); } catch (e) { return "—"; } };
  const PRIO_C = { "Urgent": ROUGE, "Haute": ORANGE, "Moyenne": BLEU, "Basse": GRIS };
  const rows = opts.rows || [], st = opts.stats || statsRapportTickets(rows);
  // jsPDF (police standard) ne sait pas afficher les emojis : on les retire des titres
  const propre = (t) => String(t || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\u0000-ÿ•€]/g, "").replace(/\s+/g, " ").trim();
  let y = 0;

  dessinerPageGarde(doc, opts, { NAVY, GOLD, GOLD2, BLEU, VERT, ORANGE, ROUGE, GRIS, VIOLET, fill, ink, pale, PRIO_C, propre });
  doc.addPage();

  // ---- En-tête : bandeau bleu nuit + liseré or ----
  fill(NAVY); doc.rect(0, 0, pageW, 32, "F");
  fill(GOLD); doc.rect(0, 32, pageW, 1.2, "F");
  ink(GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("DSI HOTEL", mL, 13);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(tr("Rapport de suivi des tickets", "Support ticket report"), mL, 20.5);
  doc.setFontSize(7.5); doc.setTextColor(185, 185, 205);
  doc.text("60 Rue François 1er, 75008 Paris  •  +33 1 84 18 02 23  •  support@dsihotel.com", mL, 26.5);

  // Logo de l'hôtel : cadre blanc ajusté au logo (ou nom de l'hôtel à défaut)
  const PAD = 1.8, maxLW = 60, maxLH = 22, bandeH = 32;
  let logoOk = false;
  if (opts.logo && opts.logo.data) {
    try {
      let lw = opts.logo.w, lh = opts.logo.h;
      if (!lw || !lh) { const pr = doc.getImageProperties(opts.logo.data); lw = pr.width; lh = pr.height; }
      const r = lw / lh;
      let w = maxLW, h = w / r; if (h > maxLH) { h = maxLH; w = h * r; }
      const boxW = w + PAD * 2, boxH = h + PAD * 2, boxX = pageW - mR - boxW, boxY = (bandeH - boxH) / 2;
      doc.setFillColor(255, 255, 255); doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, "F");
      doc.addImage(opts.logo.data, opts.logo.format || "PNG", boxX + PAD, boxY + PAD, w, h);
      logoOk = true;
    } catch (e) {}
  }
  if (!logoOk) {
    const boxW = 58, boxH = 20, boxX = pageW - mR - boxW, boxY = (bandeH - boxH) / 2;
    doc.setFillColor(255, 255, 255); doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, "F");
    ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    const l = doc.splitTextToSize(opts.hotelName || "—", boxW - 6).slice(0, 2);
    doc.text(l, boxX + boxW / 2, boxY + boxH / 2 + (l.length > 1 ? -1.2 : 1.5), { align: "center" });
  }

  // ---- Établissement + période ----
  y = 43;
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(opts.hotelName || "—", mL, y);
  const per = tr("Période : ", "Period: ") + (opts.periode || "—");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  const pw = doc.getTextWidth(per) + 10;
  fill(pale(GOLD, 0.18)); doc.roundedRect(pageW - mR - pw, y - 5.5, pw, 8, 4, 4, "F");
  ink(GOLD2); doc.text(per, pageW - mR - pw / 2, y - 0.3, { align: "center" });

  // ---- Tableau de bord, ligne 1 : 4 tuiles ----
  y = 49;
  const slaC = st.slaPct == null ? GRIS : st.slaPct >= 90 ? VERT : st.slaPct >= 75 ? ORANGE : ROUGE;
  const tuiles = [
    { l: tr("CRÉÉS SUR LA PÉRIODE", "CREATED IN PERIOD"), v: String(st.crees || 0), s: tr("nouvelles demandes de l'hôtel", "new tickets from the hotel"), c: NAVY },
    { l: tr("FERMÉS SUR LA PÉRIODE", "CLOSED IN PERIOD"), v: String(st.fermes || 0), s: tr("y compris tickets antérieurs", "including older tickets"), c: VERT },
    { l: tr("EN COURS AU ", "STILL OPEN AT ") + (opts.finPeriode || "").toUpperCase(), v: String(st.enCoursFin || 0), s: st.enCoursPresta ? tr("dont " + st.enCoursPresta + " suivi(s) chez un prestataire", "incl. " + st.enCoursPresta + " followed up with a third party") : tr("reste à traiter en fin de période", "remaining at the end of the period"), c: BLEU },
    { l: tr("RESPECT DES SLA", "SLA COMPLIANCE"), v: st.slaPct == null ? "—" : st.slaPct + " %", s: st.slaEvalues ? tr(st.horsSla + " ticket(s) hors SLA sur " + st.slaEvalues, st.horsSla + " ticket(s) outside SLA out of " + st.slaEvalues) : tr("aucun ticket évaluable", "no ticket to assess"), c: slaC },
  ];
  const gap = 5, tw = (W - gap * 3) / 4, th = 20;
  tuiles.forEach((t, i) => {
    const x = mL + i * (tw + gap);
    fill(pale(t.c, 0.09)); doc.roundedRect(x, y, tw, th, 2.5, 2.5, "F");
    fill(t.c); doc.rect(x, y + 2.5, 1.6, th - 5, "F");
    ink(t.c); doc.setFont("helvetica", "bold"); doc.setFontSize(7.3);
    doc.text(t.l, x + 6, y + 5.8);
    doc.setFontSize(16); doc.text(t.v, x + 6, y + 13.8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(110, 110, 125);
    doc.text(t.s, x + 6, y + 17.8);
  });
  y += th + 5;

  // ---- Ligne 2 à gauche : tableau par priorité ----
  const boxH = 36, Lw = 153, Rx = mL + Lw + gap, Rw = W - Lw - gap;
  fill([247, 247, 251]); doc.roundedRect(mL, y, Lw, boxH, 2.5, 2.5, "F");
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text(tr("PAR PRIORITÉ (tickets créés sur la période)", "BY PRIORITY (tickets created in the period)"), mL + 4, y + 5.3);
  const pc = [{ t: tr("Priorité", "Priority"), w: 30 }, { t: tr("Cible 1re rép.", "1st resp. target"), w: 22 }, { t: tr("Cible résolution", "Resolution target"), w: 26 }, { t: "Tickets", w: 16, a: "center" }, { t: tr("Hors SLA réponse", "Response SLA missed"), w: 29, a: "center" }, { t: tr("Hors SLA résolution", "Resolution SLA missed"), w: 30, a: "center" }];
  let px = mL;
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.6); doc.setTextColor(120, 120, 135);
  pc.forEach(c => { doc.text(c.t, c.a === "center" ? px + c.w / 2 : px + 4, y + 10.5, c.a === "center" ? { align: "center" } : undefined); px += c.w; });
  doc.setDrawColor(226, 226, 234); doc.setLineWidth(0.2); doc.line(mL + 3, y + 12, mL + Lw - 3, y + 12);
  const pctTxt = (n, tot) => n + (tot ? " (" + Math.round(100 * n / tot) + " %)" : "");
  (st.parPrio || []).forEach((p, i) => {
    const yy = y + 16.4 + i * 5;
    const c = PRIO_C[p.p] || GRIS;
    px = mL;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
    const lab = p.code + " " + prioLbl(p.p), lw = doc.getTextWidth(lab) + 5;
    fill(pale(c, 0.16)); doc.roundedRect(px + 3, yy - 3.2, lw, 4.4, 2.2, 2.2, "F");
    ink(c); doc.text(lab, px + 5.5, yy); px += pc[0].w;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.6); doc.setTextColor(70, 70, 85);
    doc.text(fmtCibleSla(p.rep), px + 4, yy); px += pc[1].w;
    doc.text(fmtCibleSla(p.res), px + 4, yy); px += pc[2].w;
    doc.setFont("helvetica", "bold"); ink(NAVY); doc.text(String(p.n), px + pc[3].w / 2, yy, { align: "center" }); px += pc[3].w;
    ink(p.horsRep ? ROUGE : VERT); doc.text(pctTxt(p.horsRep, p.n), px + pc[4].w / 2, yy, { align: "center" }); px += pc[4].w;
    ink(p.horsRes ? ROUGE : VERT); doc.text(pctTxt(p.horsRes, p.n), px + pc[5].w / 2, yy, { align: "center" });
  });

  // ---- Ligne 2 à droite : délais + incidents / demandes ----
  const hh = (boxH - 3) / 2;
  fill([247, 247, 251]); doc.roundedRect(Rx, y, Rw, hh, 2.5, 2.5, "F");
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(7.3);
  doc.text(tr("DÉLAIS MÉDIANS (heures ouvrées)", "MEDIAN TIMES (business hours)"), Rx + 4, y + 5.2);
  const demi = (Rw - 8) / 2;
  [[tr("1re réponse", "First response"), st.delaiMed, st.delaiMoy], [tr("Résolution", "Resolution"), st.resolMed, st.resolMoy]].forEach(([lbl, med, moy], i) => {
    const x = Rx + 4 + i * demi;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(110, 110, 125);
    doc.text(lbl + (moy != null ? tr("  (moy. ", "  (avg. ") + fmtDelaiHM(moy) + ")" : ""), x, y + 9.6);
    ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(fmtDelaiHM(med), x, y + 15);
  });
  const y2 = y + hh + 3;
  fill([247, 247, 251]); doc.roundedRect(Rx, y2, Rw, hh, 2.5, 2.5, "F");
  ink(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(7.3);
  doc.text(tr("INCIDENTS / DEMANDES", "INCIDENTS / REQUESTS"), Rx + 4, y2 + 5.2);
  const totT = (st.incidents || 0) + (st.demandes || 0);
  const bw = Rw - 8, bx = Rx + 4, by = y2 + 7.6;
  fill([226, 226, 234]); doc.roundedRect(bx, by, bw, 3.2, 1.6, 1.6, "F");
  if (totT) {
    const wi = bw * st.incidents / totT;
    if (st.incidents) { fill(ORANGE); doc.roundedRect(bx, by, Math.max(wi, 3.2), 3.2, 1.6, 1.6, "F"); }
    if (st.demandes) { fill(VIOLET); doc.roundedRect(bx + wi, by, Math.max(bw - wi, 3.2), 3.2, 1.6, 1.6, "F"); }
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.6);
  ink(ORANGE); doc.text(st.incidents + " incident(s)" + (totT ? " - " + Math.round(100 * st.incidents / totT) + " %" : ""), bx, y2 + 15);
  ink(VIOLET); doc.text(st.demandes + tr(" demande(s)", " request(s)") + (totT ? " - " + Math.round(100 * st.demandes / totT) + " %" : ""), bx + bw, y2 + 15, { align: "right" });
  y += boxH + 5;

  // ---- Tableau des tickets ----
  const cols = [
    { t: tr("Référence", "Reference"), w: 27 },
    { t: tr("Titre", "Subject"), w: 74 },
    { t: "Type", w: 20 },
    { t: tr("Priorité", "Priority"), w: 19 },
    { t: tr("Statut", "Status"), w: 20 },
    { t: tr("Ouvert le", "Opened"), w: 27 },
    { t: tr("Fermé le", "Closed"), w: 27 },
    { t: tr("1re réponse", "1st response"), w: 28 },
    { t: tr("Résolution", "Resolution"), w: 31 },
  ];
  const drawHeader = () => {
    fill(NAVY); doc.roundedRect(mL, y, W, 8.5, 1.5, 1.5, "F");
    ink(GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    let x = mL;
    cols.forEach(c => { doc.text(c.t, x + 2.5, y + 5.6); x += c.w; });
    y += 10;
  };
  drawHeader();

  if (!rows.length) {
    ink(GRIS); doc.setFont("helvetica", "italic"); doc.setFontSize(10);
    doc.text(tr("Aucun ticket sur cette période.", "No tickets in this period."), mL + 2.5, y + 6);
  }
  const pill = (txt, c, x, yy) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.3);
    const w = doc.getTextWidth(txt) + 5;
    fill(pale(c, 0.16)); doc.roundedRect(x, yy - 3.6, w, 5.2, 2.6, 2.6, "F");
    ink(c); doc.text(txt, x + 2.5, yy);
  };
  const cellDelai = (h, etat, x, yy, enCours) => {
    if (h === null || h === undefined) {
      if (etat === "ko") pill(tr("en retard", "overdue"), ROUGE, x, yy);
      else { ink(GRIS); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(enCours ? tr("en cours", "open") : "—", x + 0.5, yy); }
      return;
    }
    pill(fmtDelaiHM(h), etat === "ko" ? ROUGE : VERT, x, yy);
  };
  rows.forEach((r, i) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.3);
    const titreLines = doc.splitTextToSize(propre(r.subject) || tr("(sans objet)", "(no subject)"), cols[1].w - 4).slice(0, 3);
    const rowH = Math.max(8, titreLines.length * 3.7 + 4.2);
    if (y + rowH > pageH - 14) { doc.addPage(); y = 14; drawHeader(); }
    const ferme = r.status === "closed";
    if (i % 2 === 0) { doc.setFillColor(247, 247, 251); doc.rect(mL, y, W, rowH, "F"); }
    fill(ferme ? VERT : r.prestataire ? VIOLET : BLEU); doc.rect(mL, y, 1.2, rowH, "F");
    const yt = y + 5.2;
    let x = mL;
    ink(GOLD2); doc.setFont("helvetica", "bold"); doc.setFontSize(7.6);
    doc.text(String(r.reference || "—"), x + 3, yt); x += cols[0].w;
    ink([30, 30, 46]); doc.setFont("helvetica", "normal"); doc.setFontSize(8.3);
    doc.text(titreLines, x + 2, yt); x += cols[1].w;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.6);
    ink(r.type === "demande" ? VIOLET : ORANGE); doc.text(r.type === "demande" ? tr("Demande", "Request") : "Incident", x + 2.5, yt); x += cols[2].w;
    pill(r.priority ? prioLbl(r.priority) : "—", PRIO_C[r.priority] || GRIS, x + 1.5, yt); x += cols[3].w;
    if (!ferme && r.prestataire) pill(tr("Prestataire", "Third party"), VIOLET, x + 1.5, yt); else pill(ferme ? tr("Fermé", "Closed") : tr("Ouvert", "Open"), ferme ? VERT : BLEU, x + 1.5, yt); x += cols[4].w;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.6); doc.setTextColor(80, 80, 95);
    doc.text(r.created_at ? fmtD(r.created_at) : "—", x + 2, yt); x += cols[5].w;
    doc.text(r.closed_at ? fmtD(r.closed_at) : "—", x + 2, yt); x += cols[6].w;
    cellDelai(r.delaiH, r.slaRep, x + 1.5, yt, false); x += cols[7].w;
    if (r.prestataire) {
      if (r.resolH !== null) { ink(GRIS); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(fmtDelaiHM(r.resolH), x + 1.5, yt); }
      ink(VIOLET); doc.setFont("helvetica", "bold"); doc.setFontSize(6.6);
      doc.text(doc.splitTextToSize(tr("Suivi ", "Follow-up ") + propre(r.prestataire), cols[8].w - 3)[0], x + 1.5, r.resolH !== null ? yt + 3.4 : yt);
    } else cellDelai(r.resolH, r.slaRes, x + 1.5, yt, !ferme);
    y += rowH;
  });

  // Légende + pied de page sur chaque page
  const cibles = SLA_PRIORITES.map(s => s.code + " " + fmtCibleSla(s.rep) + " / " + fmtCibleSla(s.res)).join("  ·  ");
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 226, 234); doc.setLineWidth(0.3); doc.line(mL, pageH - 11, pageW - mR, pageH - 11);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(150, 150, 160);
    if (p > 1) doc.text(tr("Délais en heures ouvrées (lun.-ven. " + SLA_H_DEBUT + " h-" + SLA_H_FIN + " h, 1 j ouvré = " + SLA_JOUR_H + " h). Vert : dans la cible SLA, rouge : hors SLA. Cibles 1re réponse / résolution : " + cibles + ". Définitions en page 1.",
      "Business hours (Mon-Fri " + SLA_H_DEBUT + ":00-" + SLA_H_FIN + ":00, 1 bus. day = " + SLA_JOUR_H + " h). Green: within SLA, red: SLA missed. Targets (1st resp. / resolution): " + cibles + ". See page 1."), mL, pageH - 7.3);
    doc.text(tr("Document généré le ", "Generated on ") + (opts.genereLe || new Date().toLocaleString(tr("fr-FR", "en-GB"))) + " - DSI Hotel", mL, pageH - 3.8);
    doc.text("Page " + p + " / " + pages, pageW - mR, pageH - 3.8, { align: "right" });
  }
  return doc;
}

