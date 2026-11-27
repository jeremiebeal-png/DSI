// Fonction Supabase « comptes-superviseurs » — Établissements > « Gérer les comptes ».
// Permet d'avoir PLUSIEURS comptes Superviseur par hôtel, un par personne (ex. directeur,
// adjoint, responsable réception). Chacun a son identifiant, son mot de passe et enregistre
// son propre téléphone (QR code) à sa première connexion : plus besoin du téléphone d'un collègue.
//
// Réservée aux administrateurs DSI connectés avec leur code MFA (session aal2).
// Actions (POST JSON { action, hotelId, ... }) :
//   list       -> comptes Superviseur de l'hôtel (principal, nominatifs, comptes de groupe)
//   add        -> { email, fullName, password } crée un compte Superviseur nominatif
//   remove     -> { userId } supprime un compte nominatif (jamais le compte principal ni un compte de groupe)
//   reset-mfa  -> { userId } efface les téléphones du compte : il rescannera un QR à la prochaine connexion
//
// Le compte principal (hotels.account_email) reste géré par le Worker dsi-hotel-api-v2 comme avant.
// Déploiement : Supabase > Edge Functions > « comptes-superviseurs », laisser « Verify JWT » activé.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "https://portail.dsihotel.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const rep = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const EMAIL_OK = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const erreurMotDePasse = (pw: string) => {
  if (!pw || pw.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (!/[a-z]/.test(pw)) return "Le mot de passe doit contenir au moins une minuscule.";
  if (!/[A-Z]/.test(pw)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[0-9]/.test(pw)) return "Le mot de passe doit contenir au moins un chiffre.";
  if (!/[^a-zA-Z0-9]/.test(pw)) return "Le mot de passe doit contenir au moins un caractère spécial.";
  return null;
};
// Comptes techniques DSI (aperçu Espace Client, démo) : jamais affichés ni modifiables ici
const estCompteApercu = (u: { email?: string; app_metadata?: Record<string, unknown> }) => {
  const e = (u.email || "").toLowerCase();
  return !!u.app_metadata?.apercu_admin_id || e.startsWith("apercu.") || e === "demo.client@dsihotel.fr";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return rep(405, { error: "Méthode non autorisée" });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // 1. Appelant : session valide, élevée par MFA (aal2), rôle administrateur DSI
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u?.user) return rep(401, { error: "Session invalide" });
    let aal = "";
    try {
      aal = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).aal || "";
    } catch (_) { /* jeton illisible */ }
    if (aal !== "aal2") return rep(403, { error: "Double authentification requise" });
    const { data: prof } = await admin.from("profiles").select("role").eq("id", u.user.id).single();
    if (!prof || prof.role !== "admin") return rep(403, { error: "Réservé aux administrateurs DSI" });

    const body = await req.json().catch(() => ({}));
    const { action, hotelId } = body || {};
    if (!hotelId) return rep(400, { error: "hotelId manquant" });
    const { data: hotel } = await admin.from("hotels").select("id, name, account_email").eq("id", hotelId).maybeSingle();
    if (!hotel) return rep(404, { error: "Hôtel introuvable" });
    const principal = (hotel.account_email || "").trim().toLowerCase();

    // Compte cible : doit être un Superviseur de CET hôtel, ni principal, ni de groupe, ni technique
    const cible = async (userId: string) => {
      if (!userId) return { err: "userId manquant" };
      const { data: p } = await admin.from("profiles").select("id, role, hotel_id").eq("id", userId).maybeSingle();
      if (!p || p.role !== "supervisor" || p.hotel_id !== hotelId) return { err: "Ce compte n'est pas un Superviseur de cet hôtel." };
      const { data: au } = await admin.auth.admin.getUserById(userId);
      if (!au?.user) return { err: "Compte introuvable" };
      if (estCompteApercu(au.user)) return { err: "Compte technique DSI : non modifiable ici." };
      const { count } = await admin.from("user_hotels").select("hotel_id", { count: "exact", head: true }).eq("user_id", userId);
      return { user: au.user, groupe: (count || 0) > 1 };
    };

    if (action === "list") {
      const { data: profs, error: pe } = await admin.from("profiles")
        .select("id, full_name").eq("hotel_id", hotelId).eq("role", "supervisor");
      if (pe) return rep(500, { error: pe.message });
      const comptes = [];
      for (const p of profs || []) {
        const { data: au } = await admin.auth.admin.getUserById(p.id);
        if (!au?.user || estCompteApercu(au.user)) continue;
        const email = (au.user.email || "").toLowerCase();
        const { data: fs } = await admin.auth.admin.mfa.listFactors({ userId: p.id });
        const telephones = ((fs?.factors) || []).filter((f: { status: string }) => f.status === "verified").length;
        const { count } = await admin.from("user_hotels").select("hotel_id", { count: "exact", head: true }).eq("user_id", p.id);
        comptes.push({
          id: p.id, email, full_name: p.full_name || "",
          principal: email === principal, groupe: (count || 0) > 1,
          telephones, derniere_connexion: au.user.last_sign_in_at || null, cree_le: au.user.created_at,
        });
      }
      comptes.sort((a, b) => Number(b.principal) - Number(a.principal) || a.email.localeCompare(b.email));
      return rep(200, { comptes });
    }

    if (action === "add") {
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.fullName || "").trim();
      const password = String(body.password || "");
      if (!fullName) return rep(400, { error: "Indiquez le prénom et le nom de la personne." });
      if (!EMAIL_OK.test(email)) return rep(400, { error: "Adresse invalide : pas d'accents, d'espaces ni de caractères spéciaux." });
      const errPw = erreurMotDePasse(password);
      if (errPw) return rep(400, { error: errPw });
      const { data: cr, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (ce || !cr?.user) {
        const deja = /already|registered|exists/i.test(ce?.message || "");
        return rep(400, { error: deja ? "Cette adresse email est déjà utilisée par un autre compte." : "Création du compte : " + (ce?.message || "?") });
      }
      const { error: pie } = await admin.from("profiles")
        .upsert({ id: cr.user.id, role: "supervisor", hotel_id: hotelId, full_name: fullName });
      if (pie) {
        await admin.auth.admin.deleteUser(cr.user.id);
        return rep(500, { error: "Création du profil : " + pie.message });
      }
      return rep(200, { success: true, id: cr.user.id, email });
    }

    if (action === "remove" || action === "reset-mfa") {
      const c = await cible(String(body.userId || ""));
      if ("err" in c) return rep(400, { error: c.err });
      const email = (c.user.email || "").toLowerCase();

      if (action === "reset-mfa") {
        const { data: fs } = await admin.auth.admin.mfa.listFactors({ userId: c.user.id });
        for (const f of (fs?.factors || [])) {
          const { error: de } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: c.user.id });
          if (de) return rep(500, { error: "Suppression d'un téléphone : " + de.message });
        }
        return rep(200, { success: true });
      }

      if (email === principal) return rep(400, { error: "Le compte principal de l'hôtel ne se supprime pas ici." });
      if (c.groupe) return rep(400, { error: "Compte de groupe (plusieurs hôtels) : à retirer depuis la gestion des groupes." });
      const { error: de } = await admin.auth.admin.deleteUser(c.user.id);
      if (de) return rep(500, { error: "Suppression du compte : " + de.message });
      return rep(200, { success: true });
    }

    return rep(400, { error: "Action inconnue" });
  } catch (e) {
    return rep(500, { error: String((e as Error)?.message || e) });
  }
});
