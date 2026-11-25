-- ============================================================================
-- Création automatique des comptes (AD + Microsoft 365) depuis « Arrivée collaborateur »
-- Oscar prépare une fiche (lecture seule de l'AD via NinjaOne), le technicien répond Oui / Non.
-- Script additif : aucune donnée existante n'est modifiée.
-- ============================================================================

-- 1) Activation par hôtel (désactivé par défaut : Hilton PAROP / CDGTP, Sheraton, IC Bordeaux… restent exclus)
alter table public.hotels add column if not exists provisioning_ad boolean not null default false;

-- 2) Fiche préparée par Oscar, une par ticket
create table if not exists public.provisioning_fiches (
  ticket_id      uuid primary key references public.tickets(id) on delete cascade,
  hotel_id       uuid references public.hotels(id) on delete set null,
  statut         text not null default 'lecture',
    -- lecture | prete | sans_ad | erreur | en_creation | terminee | partielle | refusee
  ad_jeton       text,                 -- jeton du script de lecture en cours
  ad_lecture     jsonb,                -- résultat de la lecture AD (domaine, OU, groupes, homonymes…)
  ad_lu_le       timestamptz,
  proposition    jsonb,                -- compte proposé : identifiant, OU, groupes, nom affiché…
  decision       jsonb,                -- { choix: oui|non, par, le, motif, compte: … (valeurs validées) }
  ad_resultat    jsonb,                -- retour du script de création
  m365_resultat  jsonb,                -- { upn, statut, licence }
  client_prevenu boolean not null default false,
  erreur         text,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);
create index if not exists provisioning_fiches_hotel on public.provisioning_fiches(hotel_id);
alter table public.provisioning_fiches enable row level security;
drop policy if exists provisioning_fiches_admin_lecture on public.provisioning_fiches;
create policy provisioning_fiches_admin_lecture on public.provisioning_fiches for select
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Mot de passe provisoire chiffré (AES-GCM) le temps que le script de création le lise, puis effacé.
-- RLS sans aucune règle : illisible depuis le portail, seuls les Workers (clé service) y accèdent.
create table if not exists public.provisioning_secrets (
  ticket_id      uuid primary key references public.tickets(id) on delete cascade,
  secret_chiffre text not null,
  cree_le        timestamptz not null default now()
);
alter table public.provisioning_secrets enable row level security;

-- 3) Mémoire par hôtel : corrections du technicien réutilisées pour les demandes suivantes
--    cle = 'service:HK' (groupes AD), 'ou:HK' / 'ou' (OU), 'suffixe' (suffixe UPN), 'licence' (SKU M365)
create table if not exists public.provisioning_memo (
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  cle      text not null,
  valeur   jsonb not null,
  maj_par  text,
  maj_le   timestamptz not null default now(),
  primary key (hotel_id, cle)
);
alter table public.provisioning_memo enable row level security;
drop policy if exists provisioning_memo_admin on public.provisioning_memo;
create policy provisioning_memo_admin on public.provisioning_memo for select
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- 4) Scripts NinjaOne (ninja_script_id = 0 : retrouvé par son nom ; mettre l'ID réel après création dans NinjaOne)
-- utilisés UNIQUEMENT par ce circuit (auto_autorise = false : jamais par les procédures d'Oscar)
insert into public.agent_scripts (cle, libelle, description, ninja_script_id, ninja_script_nom, run_as, lecture_seule, auto_autorise, actif, convention, serveur_cible, attente_min)
values
  ('prov_ad_lire',  'Lire l''AD pour une création de compte', 'Lecture seule : domaine, OU, groupes, homonymes. Circuit « Arrivée collaborateur ».',
   0, 'DSI - AD Lire pour creation', 'system', true,  false, true, 'ia', '@DC', 5),
  ('prov_ad_creer', 'Créer le compte AD validé', 'Crée le compte validé par le technicien (Oui dans le portail). Refuse tout groupe protégé (adminCount=1).',
   0, 'DSI - AD Creer compte',       'system', false, false, true, 'ia', '@DC', 5)
on conflict (cle) do nothing;
