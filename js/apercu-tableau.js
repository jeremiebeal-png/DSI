// Page d'aperçu tableau.html : affiche le Tableau de bord hôtels hors du portail.
// Réutilise la session du portail (même adresse) : il faut être connecté en administrateur.
function ApercuTableau() {
  const e = React.createElement;
  const [etat, setEtat] = React.useState({ charge: true });
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 760);
  React.useEffect(() => {
    const f = () => setIsMobile(window.innerWidth < 760);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  React.useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      const session = data && data.session;
      if (!session) { setEtat({ charge: false, erreur: "connexion" }); return; }
      const { data: prof } = await sb.from("profiles").select("role,full_name").eq("id", session.user.id).maybeSingle();
      // Phase d'essai : réservé à Jérémie Beal et Pascal Sanglier (même liste que dans le portail)
      const autorises = ["jeremie.beal@dsihotel.fr", "support@dsihotel.com", "pascal.sanglier@dsihotel.fr"];
      if (!prof || prof.role !== "admin" || !autorises.includes(String(session.user.email || "").toLowerCase())) { setEtat({ charge: false, erreur: "admin" }); return; }
      const { data: hotels, error } = await sb.from("hotels").select("*").order("name");
      if (error) { setEtat({ charge: false, erreur: error.message }); return; }
      setEtat({ charge: false, hotels: hotels || [], nom: prof.full_name || session.user.email });
    })();
  }, []);
  const entete = e("div", { style: { background: "#0F0F24", color: "white", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" } },
    e("div", { style: { fontWeight: 700, fontSize: 16 } }, "DSI Hotel — Tableau de bord hôtels"),
    e("span", { style: { fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "#C9A84C", color: "#111", fontWeight: 600 } }, "Aperçu"),
    e("a", { href: "/", style: { marginLeft: "auto", color: "#C9A84C", fontSize: 13 } }, "← Retour au portail"));
  const corps = (x) => e("div", null, entete, e("div", { style: { maxWidth: 1400, margin: "0 auto", padding: isMobile ? 12 : 24 } }, x));
  const boite = (...x) => e("div", { style: { background: "white", borderRadius: 12, padding: 20, fontSize: 14 } }, ...x);
  if (etat.charge) return corps(e("div", { style: { color: "#888" } }, "Chargement…"));
  if (etat.erreur === "connexion") return corps(boite("Connectez-vous d'abord au ", e("a", { href: "/" }, "portail"), " avec un compte administrateur, puis rouvrez cette page."));
  if (etat.erreur === "admin") return corps(boite("Page réservée pour l'instant à Jérémie Beal et Pascal Sanglier (phase d'essai)."));
  if (etat.erreur) return corps(boite("Erreur : " + etat.erreur));
  return corps(Page_completude({ hotels: etat.hotels, isMobile, setPage: () => { window.location.href = "/"; }, adminFromName: () => etat.nom }));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ApercuTableau));
