// Fonction Supabase « apercu-client » — bouton « Espace Client » de l'espace admin.
// Réservée aux administrateurs DSI connectés avec leur code MFA (session aal2).
// Crée au premier usage le compte Superviseur de démonstration (hôtel « DSI - Hôtel Démo »)
// puis renvoie un jeton de connexion à usage unique pour ce compte. Aucun email n'est envoyé.
// Déploiement : Supabase > Edge Functions > Deploy a new function > nom « apercu-client »,
// coller ce fichier, laisser « Verify JWT » activé.
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEMO_EMAIL = "demo.client@dsihotel.fr";
const DEMO_HOTEL_ID = "46d3a5d5-0fd9-483f-be0a-ab7155524975"; // DSI - Hôtel Démo
const CORS = {
  "Access-Control-Allow-Origin": "https://portail.dsihotel.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const rep = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return rep(405, { error: "Méthode non autorisée" });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // 1. Appelant : session valide, élevée par MFA (aal2), rôle administrateur
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u?.user) return rep(401, { error: "Session invalide" });
    let aal = "";
    try {
      aal = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).aal || "";
    } catch (_) { /* jeton illisible */ }
    if (aal !== "aal2") return rep(403, { error: "Double authentification requise" });
    const { data: prof } = await admin.from("profiles").select("role").eq("id", u.user.id).single();
    if (!prof || prof.role !== "admin") return rep(403, { error: "Réservé aux administrateurs" });

    // 2. Compte de démonstration : créé au premier usage, toujours remis en Superviseur de l'hôtel démo
    let demoId: string | null = null;
    const { data: liste } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existant = (liste?.users || []).find((x) => (x.email || "").toLowerCase() === DEMO_EMAIL);
    if (existant) {
      demoId = existant.id;
    } else {
      const mdp = crypto.randomUUID() + "Aa1!"; // mot de passe aléatoire, jamais communiqué
      const { data: cr, error: ce } = await admin.auth.admin.createUser({ email: DEMO_EMAIL, password: mdp, email_confirm: true });
      if (ce || !cr?.user) return rep(500, { error: "Création du compte démo : " + (ce?.message || "?") });
      demoId = cr.user.id;
    }
    const { error: pe } = await admin.from("profiles")
      .upsert({ id: demoId, role: "supervisor", hotel_id: DEMO_HOTEL_ID, full_name: "Compte Démo" });
    if (pe) return rep(500, { error: "Profil démo : " + pe.message });

    // 3. Jeton de connexion à usage unique (generateLink n'envoie aucun email)
    const { data: lk, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
    if (le || !lk?.properties?.hashed_token) return rep(500, { error: "Jeton : " + (le?.message || "?") });
    return rep(200, { token_hash: lk.properties.hashed_token });
  } catch (e) {
    return rep(500, { error: String((e as Error)?.message || e) });
  }
});
