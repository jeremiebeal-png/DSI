// Fonction Supabase « apercu-client » — bouton « Espace Client » de l'espace admin.
// Réservée aux administrateurs DSI connectés avec leur code MFA (session aal2).
//
// - Admin sans la permission « espace_client_multi » : compte Superviseur de démonstration
//   partagé (demo.client@dsihotel.fr), toujours sur « DSI - Hôtel Démo ».
// - Admin AVEC « espace_client_multi » : compte d'aperçu PERSONNEL (apercu.<prénom.nom>@dsihotel.fr),
//   Superviseur rattaché à TOUS les hôtels (table user_hotels). Le menu déroulant d'hôtels de
//   l'en-tête (mes_hotels / changer_hotel_actif) permet alors de se placer sur n'importe quel client.
//   Un compte par admin : deux admins en aperçu en même temps ne se gênent pas.
//
// Renvoie un jeton de connexion à usage unique. Aucun email n'est envoyé.
// Déploiement : Supabase > Edge Functions > « apercu-client », laisser « Verify JWT » activé.
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEMO_EMAIL = "demo.client@dsihotel.fr";
const DEMO_HOTEL_ID = "46d3a5d5-0fd9-483f-be0a-ab7155524975"; // DSI - Hôtel Démo
const PERM_MULTI = "espace_client_multi";
const CORS = {
  "Access-Control-Allow-Origin": "https://portail.dsihotel.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const rep = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// « jeremie.beal » -> « Jérémie Beal » n'est pas devinable : on garde le nom du profil s'il existe,
// sinon « Pascal Sanglier » à partir de « pascal.sanglier ».
const nomDepuisEmail = (email: string) =>
  email.split("@")[0].split(/[._-]+/).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" ");

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
    const { data: prof } = await admin.from("profiles").select("role, permissions, full_name").eq("id", u.user.id).single();
    if (!prof || prof.role !== "admin") return rep(403, { error: "Réservé aux administrateurs" });
    const multi = Array.isArray(prof.permissions) && prof.permissions.includes(PERM_MULTI);

    // 2. Compte d'aperçu : démo partagé, ou compte personnel pour les admins « multi »
    const emailAdmin = (u.user.email || "").toLowerCase();
    const local = emailAdmin.split("@")[0].replace(/[^a-z0-9._-]/g, "");
    if (multi && !local) return rep(500, { error: "Adresse de l'administrateur illisible" });
    const email = multi ? `apercu.${local}@dsihotel.fr` : DEMO_EMAIL;
    const nom = multi ? ((prof.full_name || nomDepuisEmail(emailAdmin)) + " (aperçu DSI)") : "Compte Démo";
    const meta = multi ? { apercu_admin_id: u.user.id } : {};

    let compteId: string | null = null;
    const { data: liste } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existant = (liste?.users || []).find((x) => (x.email || "").toLowerCase() === email);
    if (existant) {
      compteId = existant.id;
      if (multi && existant.app_metadata?.apercu_admin_id !== u.user.id) {
        await admin.auth.admin.updateUserById(compteId, { app_metadata: meta });
      }
    } else {
      const mdp = crypto.randomUUID() + "Aa1!"; // mot de passe aléatoire, jamais communiqué
      const { data: cr, error: ce } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true, app_metadata: meta });
      if (ce || !cr?.user) return rep(500, { error: "Création du compte d'aperçu : " + (ce?.message || "?") });
      compteId = cr.user.id;
    }

    // Hôtel actif : démo pour le compte partagé ; pour un compte personnel, le dernier hôtel choisi
    let hotelId = DEMO_HOTEL_ID;
    if (multi) {
      const { data: p } = await admin.from("profiles").select("hotel_id").eq("id", compteId).maybeSingle();
      if (p?.hotel_id) hotelId = p.hotel_id;
    }
    const { error: pe } = await admin.from("profiles")
      .upsert({ id: compteId, role: "supervisor", hotel_id: hotelId, full_name: nom });
    if (pe) return rep(500, { error: "Profil d'aperçu : " + pe.message });

    // 3. Compte personnel : rattaché à tous les hôtels (resynchronisé à chaque ouverture,
    //    pour inclure les nouveaux clients et retirer les hôtels supprimés)
    if (multi) {
      const { data: hs, error: he } = await admin.from("hotels").select("id");
      if (he) return rep(500, { error: "Liste des hôtels : " + he.message });
      const { error: de } = await admin.from("user_hotels").delete().eq("user_id", compteId);
      if (de) return rep(500, { error: "Rattachement des hôtels : " + de.message });
      const lignes = (hs || []).map((h) => ({ user_id: compteId, hotel_id: h.id }));
      if (lignes.length) {
        const { error: ie } = await admin.from("user_hotels").insert(lignes);
        if (ie) return rep(500, { error: "Rattachement des hôtels : " + ie.message });
      }
    }

    // 4. Jeton de connexion à usage unique (generateLink n'envoie aucun email)
    const { data: lk, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (le || !lk?.properties?.hashed_token) return rep(500, { error: "Jeton : " + (le?.message || "?") });
    return rep(200, { token_hash: lk.properties.hashed_token, multi });
  } catch (e) {
    return rep(500, { error: String((e as Error)?.message || e) });
  }
});
