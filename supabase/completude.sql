-- =====================================================================
-- Tableau de bord des hôtels : scores de COMPLÉTUDE et de CONFORMITÉ
-- À exécuter une fois dans Supabase (SQL Editor). Ne modifie aucune table existante.
--
--   hotel_completude   infos saisies à la main (n'existaient nulle part)
--   score_criteres     barème (points, libellés) — modifiable par les admins
--   score_historique   photo mensuelle des deux scores (pg_cron, le 1er à 6 h)
--   score_mesures()    pour chaque hôtel et chaque critère : ratio 0..1, NULL = sans objet
--   scores_resume()    score global complétude / conformité par hôtel
-- =====================================================================

-- ---------- 1) Infos saisies à la main ----------
create table if not exists public.hotel_completude (
  hotel_id uuid primary key references public.hotels(id) on delete cascade,
  sans_serveur boolean not null default false,      -- pas de serveur sur site : serveurs, sauvegardes, check-list = sans objet
  m365_non_gere boolean not null default false,     -- messagerie non gérée par DSI Hotel : Microsoft 365 = sans objet
  supervision_raid boolean,                         -- supervision RAID / matériel des hôtes : null = non renseigné
  retention_hors_site text,                         -- rétention Veeam et copie hors site
  av_console text,                                  -- console de l'éditeur antivirus (accès, compte) si pas Sophos
  av_contact_escalade text,                         -- qui prévenir en cas d'alerte antivirus
  blocage_consentement boolean,                     -- consentement « Bloquer expéditeur » donné
  maj_le timestamptz default now(),
  maj_par text
);
alter table public.hotel_completude add column if not exists serveurs_externes text;                         -- ex. « Serveurs hébergés sur le réseau Hilton » (avec sans_serveur = true)
alter table public.hotel_completude add column if not exists av_non_gere boolean not null default false;    -- antivirus géré par la chaîne (ex. Hilton) : domaine Antivirus = sans objet
alter table public.hotel_completude add column if not exists exclu boolean not null default false;          -- hôtel non suivi par le tableau de bord
alter table public.hotel_completude enable row level security;
drop policy if exists hotel_completude_admin on public.hotel_completude;
create policy hotel_completude_admin on public.hotel_completude for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- 2) Barème ----------
create table if not exists public.score_criteres (
  code text primary key,
  score text not null check (score in ('comp','conf')),
  domaine text not null,
  libelle text not null,
  points integer not null check (points >= 0),
  source text not null default 'A',                 -- A = automatique, M = saisie manuelle, V = visite sur site
  attribution text,
  ordre integer not null default 0,
  actif boolean not null default true
);
alter table public.score_criteres enable row level security;
drop policy if exists score_criteres_admin on public.score_criteres;
create policy score_criteres_admin on public.score_criteres for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.score_criteres (code, score, domaine, libelle, points, source, attribution, ordre) values
 -- COMPLÉTUDE (100)
 ('F_COORD',   'comp','fiche','Adresse et téléphone de l''hôtel',                    2,'M','moitié par info',          10),
 ('F_CONTACTS','comp','fiche','Contacts directeur et technique, nom NinjaOne',        3,'M','au prorata (x / 3)',       11),
 ('S_INV',     'comp','srv',  'Inventaire serveurs importé depuis NinjaOne',          4,'A','oui / non',                20),
 ('S_OS',      'comp','srv',  'OS et version renseignés',                             4,'A','au prorata des serveurs',  21),
 ('S_ROLE',    'comp','srv',  'Rôle de chaque serveur / VM renseigné',                3,'M','au prorata des serveurs',  22),
 ('S_CP',      'comp','srv',  'Care Pack / garantie renseigné (machines physiques)',  4,'M','au prorata des physiques', 23),
 ('S_RAID',    'comp','srv',  'Supervision RAID / matériel renseignée',               2,'M','oui / non',                24),
 ('S_DOC',     'comp','srv',  'Documentation infra (notes ou documents)',             3,'M','oui / non',                25),
 ('B_JOBS',    'comp','bkp',  'Jobs Veeam rattachés au portail',                      6,'A','oui / non',                30),
 ('B_PLANIF',  'comp','bkp',  'Planification des jobs remontée',                      5,'A','au prorata des jobs',      31),
 ('B_LIC',     'comp','bkp',  'Licence Veeam + échéance renseignées',                 5,'M','oui / non',                32),
 ('B_RET',     'comp','bkp',  'Rétention / copie hors site décrite',                  4,'M','oui / non',                33),
 ('A_PROD',    'comp','av',   'Antivirus de l''hôtel renseigné',                      5,'M','oui / non',                40),
 ('A_DETECT',  'comp','av',   'Détection NinjaOne de moins de 30 jours',              5,'A','oui / non',                41),
 ('A_CONSOLE', 'comp','av',   'Console de l''éditeur rattachée ou renseignée',        5,'M','oui / non',                42),
 ('A_ESC',     'comp','av',   'Contact d''escalade (ou SOC) renseigné',               5,'M','oui / non',                43),
 ('M_TENANT',  'comp','m365', 'Tenant rattaché au portail',                           5,'A','oui / non',                50),
 ('M_LIC',     'comp','m365', 'Rapport de licences actif',                            3,'A','oui / non',                51),
 ('M_DOM',     'comp','m365', 'Domaines mail renseignés',                             3,'M','oui / non',                52),
 ('M_BLOC',    'comp','m365', 'Consentement « Bloquer expéditeur » renseigné',        4,'M','oui / non',                53),
 ('C_REMPLI',  'comp','chk',  'Points de la check-list renseignés',                  10,'V','au prorata des points',    60),
 ('P_PROJ',    'comp','prj',  'Projets en cours suivis par des tâches',               6,'M','au prorata des projets',   70),
 ('P_CAPEX',   'comp','prj',  'CAPEX de l''hôtel calculé ou saisi',                   4,'A','oui / non',                71),
 -- CONFORMITÉ (100)
 ('X_MAJ',     'conf','srv',  'Serveurs à jour (Windows Update)',                     8,'A','au prorata des serveurs',  120),
 ('X_OSSUP',   'conf','srv',  'Windows Server encore supporté par Microsoft',         6,'A','au prorata des serveurs',  121),
 ('X_GAR',     'conf','srv',  'Garantie / Care Pack en cours',                        6,'A','au prorata des physiques', 122),
 ('X_AVSRV',   'conf','srv',  'Antivirus actif sur les serveurs',                     5,'A','au prorata des serveurs',  123),
 ('X_BOK',     'conf','bkp',  'Dernier passage Veeam réussi',                        10,'A','au prorata des jobs',      130),
 ('X_BINC',    'conf','bkp',  'Aucun incident de sauvegarde en cours',                5,'A','oui / non',                131),
 ('X_BLIC',    'conf','bkp',  'Licence Veeam valide',                                 5,'A','oui / non',                132),
 ('X_COUV',    'conf','av',   'Postes protégés par un antivirus actif (tout éditeur)',8,'A','au prorata des postes',    140),
 ('X_PRINC',   'conf','av',   'Postes équipés de l''antivirus prévu pour l''hôtel',   4,'A','au prorata des postes',    141),
 ('X_DEF',     'conf','av',   'Définitions antivirus à jour (tout éditeur)',          4,'A','au prorata des postes',    142),
 ('X_MENACE',  'conf','av',   'Aucune menace active / alerte de plus de 7 j',         4,'A','oui / non',                143),
 ('X_MALERT',  'conf','m365', 'Aucune alerte sécurité Microsoft ouverte',             5,'A','oui / non',                150),
 ('X_MFA',     'conf','m365', 'MFA sur tous les comptes (pas encore collecté)',       6,'A','au prorata des comptes',   151),
 ('X_MBLOC',   'conf','m365', 'Blocage des expéditeurs actif',                        4,'M','oui / non',                152),
 ('X_CHK',     'conf','chk',  'Points de la check-list conformes',                   10,'V','OK ÷ (OK + KO)',           160),
 ('X_MAT',     'conf','mat',  'Machines de moins de 5 ans',                          10,'A','au prorata des machines',  170)
on conflict (code) do nothing;

-- ---------- 3) Historique mensuel ----------
create table if not exists public.score_historique (
  mois text not null,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  completude integer,
  conformite integer,
  cree_le timestamptz default now(),
  primary key (mois, hotel_id)
);
alter table public.score_historique enable row level security;
drop policy if exists score_historique_admin on public.score_historique;
create policy score_historique_admin on public.score_historique for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- 4) Mesures (interne, sans contrôle d'accès) ----------
create or replace function public._score_mesures()
returns table (hotel_id uuid, code text, ratio numeric, detail text)
language sql stable security definer set search_path to 'public'
as $$
with h as (
  select h.*, coalesce(hc.sans_serveur, false) ss, coalesce(hc.m365_non_gere, false) mng, coalesce(hc.av_non_gere, false) avng,
         hc.supervision_raid, hc.retention_hors_site, hc.av_console, hc.av_contact_escalade, hc.blocage_consentement
  from hotels h left join hotel_completude hc on hc.hotel_id = h.id
  where h.name !~* '(d[ée]mo|client test)' and not coalesce(hc.exclu, false)
),
inv as (
  select s.hotel_id,
    count(*) n,
    count(*) filter (where s.ninja_id is not null) n_ninja,
    count(*) filter (where coalesce(s.os,'') <> '') n_os,
    count(*) filter (where coalesce(s.role,'') <> '') n_role,
    count(*) filter (where s.type = 'Physique') n_phys,
    count(*) filter (where s.type = 'Physique' and (s.care_pack in ('Oui','Non','N/A') or s.care_pack_fin is not null)) n_phys_cp,
    count(*) filter (where s.a_jour is not null) n_aj,
    count(*) filter (where s.a_jour = 'Oui') n_aj_ok,
    count(*) filter (where s.os ~* 'windows server') n_win,
    count(*) filter (where s.os ~* 'windows server' and s.os !~* '(2003|2008|2012)' and (s.os !~* '2016' or current_date < date '2027-01-12')) n_win_ok,
    count(*) filter (where s.type = 'Physique' and (s.care_pack in ('Oui','Non') or s.care_pack_fin is not null)) n_gar,
    count(*) filter (where s.type = 'Physique' and (s.care_pack_fin >= current_date or (s.care_pack = 'Oui' and s.care_pack_fin is null))) n_gar_ok,
    count(*) filter (where s.antivirus is not null) n_av,
    count(*) filter (where s.antivirus = 'Oui') n_av_ok,
    count(*) filter (where s.licence_fin is not null) n_lic,
    count(*) filter (where s.licence_fin >= current_date) n_lic_ok
  from inventaire_serveurs s group by s.hotel_id
),
vj as (
  select j.hotel_id, count(*) filter (where j.actif) n, count(*) filter (where j.actif and j.planifie) n_planif,
         count(*) filter (where j.actif and j.dernier_statut = 'Success') n_ok
  from veeam_jobs j group by j.hotel_id
),
binc as (select b.hotel_id, count(*) n from backup_incidents b where b.last_seen_at > now() - interval '2 days' group by b.hotel_id),
docs as (
  select h.id hotel_id,
    (exists (select 1 from hotel_docs d where d.hotel_id = h.id)
     or exists (select 1 from inventaire_notes n where n.hotel_id = h.id and coalesce(trim(n.notes),'') <> '')) ok
  from h
),
chk as (
  select p.hotel_id, count(*) n, count(*) filter (where p.statut is not null) n_rempli,
         count(*) filter (where p.statut = 'OK') n_ok, count(*) filter (where p.statut = 'KO') n_ko
  from checklist_points p group by p.hotel_id
),
soph as (
  select h.id hotel_id,
    exists (select 1 from sophos_comptes c where c.hotel_id = h.id and c.actif) actif,
    (select count(*) from sophos_alertes a where a.hotel_id = h.id and a.statut = 'ouverte' and a.raised_at < now() - interval '7 days') vieilles
  from h
),
m365 as (
  select h.id hotel_id,
    (exists (select 1 from m365_tenants t where t.hotel_id = h.id) or exists (select 1 from m365_tenant_hotels th where th.hotel_id = h.id)) tenant,
    exists (select 1 from m365_tenants t where t.licences is not null
            and (t.hotel_id = h.id or t.tenant_id in (select th.tenant_id from m365_tenant_hotels th where th.hotel_id = h.id))) lic,
    (exists (select 1 from m365_tenant_hotels th where th.hotel_id = h.id and coalesce(array_length(th.domaines,1),0) > 0)
      or exists (select 1 from m365_tenants t where t.hotel_id = h.id)) dom,
    (select count(*) from m365_alertes a where a.resolu_le is null and coalesce(a.statut,'') !~* 'resol'
       and (a.hotel_id = h.id or (a.hotel_id is null and a.tenant_id in (select t.tenant_id from m365_tenants t where t.hotel_id = h.id)))) alertes
  from h
),
prj as (
  select p.hotel_id, count(*) filter (where p.statut <> 'done') n_ouverts,
    count(*) filter (where p.statut <> 'done' and exists (select 1 from projet_taches t where t.projet_id = p.id)) n_suivis
  from projets p group by p.hotel_id
),
capx as (
  select distinct on (e.hotel_id) e.hotel_id, e.nb_machines, e.nb_5, e.nb_inconnu
  from capex_auto_etat e order by e.hotel_id, e.mois desc
),
-- Dernier import NinjaOne de l'inventaire serveurs (Worker dsi-hotel-inventaire, route /importer)
imp as (
  select distinct on (a.hotel_id) a.hotel_id, a.recu_le
  from inventaire_ninja_apercu a where a.donnees ? 'import' order by a.hotel_id, a.recu_le desc
),
base as (
  select h.id, h.ss, h.mng, h.avng, h.supervision_raid, h.retention_hors_site, h.av_console, h.av_contact_escalade, h.blocage_consentement,
    h.adresse_rue, h.phone, h.gm_email, h.tech_email, h.ninjaone_nom, h.soc,
    -- Antivirus en vigueur : le « futur » dès que sa date de bascule est passée (même règle que la page Sécurité Anti Virus)
    lower(case when coalesce(h.antivirus_futur,'') <> '' and h.antivirus_bascule <= current_date then h.antivirus_futur else coalesce(h.antivirus,'') end) av_prevu,
    -- Bascule programmée pas encore faite : pendant la transition, l'ancien ET le nouvel antivirus sont acceptés
    lower(case when coalesce(h.antivirus_futur,'') <> '' and (h.antivirus_bascule is null or h.antivirus_bascule > current_date) then h.antivirus_futur else '' end) av_futur,
    h.antivirus_detecte ad,
    coalesce(i.n,0) n, coalesce(i.n_ninja,0) n_ninja, coalesce(i.n_os,0) n_os, coalesce(i.n_role,0) n_role,
    coalesce(i.n_phys,0) n_phys, coalesce(i.n_phys_cp,0) n_phys_cp, coalesce(i.n_aj,0) n_aj, coalesce(i.n_aj_ok,0) n_aj_ok,
    coalesce(i.n_win,0) n_win, coalesce(i.n_win_ok,0) n_win_ok, coalesce(i.n_gar,0) n_gar, coalesce(i.n_gar_ok,0) n_gar_ok,
    coalesce(i.n_av,0) n_av, coalesce(i.n_av_ok,0) n_av_ok, coalesce(i.n_lic,0) n_lic, coalesce(i.n_lic_ok,0) n_lic_ok,
    coalesce(v.n,0) vj_n, coalesce(v.n_planif,0) vj_planif, coalesce(v.n_ok,0) vj_ok, coalesce(b.n,0) binc,
    d.ok doc_ok, coalesce(c.n,0) ck_n, coalesce(c.n_rempli,0) ck_rempli, coalesce(c.n_ok,0) ck_ok, coalesce(c.n_ko,0) ck_ko,
    so.actif so_actif, so.vieilles so_vieilles, m.tenant m_tenant, m.lic m_lic, m.dom m_dom, m.alertes m_alertes,
    coalesce(p.n_ouverts,0) pj_n, coalesce(p.n_suivis,0) pj_suivis,
    (x.hotel_id is not null or exists (select 1 from capex k where k.hotel_id = h.id)) capex_ok,
    x.nb_machines, x.nb_5, x.nb_inconnu,
    nullif((h.antivirus_detecte->>'postes')::int, 0) av_postes,
    -- Import NinjaOne fait et aucun serveur trouvé : l'hôtel n'a pas de serveur supervisé (serveurs = sans objet)
    (coalesce(i.n,0) = 0 and ip.hotel_id is not null) vide_ninja
  from h
  left join inv i on i.hotel_id = h.id
  left join vj v on v.hotel_id = h.id::text
  left join binc b on b.hotel_id = h.id::text
  left join docs d on d.hotel_id = h.id
  left join chk c on c.hotel_id = h.id
  left join soph so on so.hotel_id = h.id
  left join m365 m on m.hotel_id = h.id
  left join prj p on p.hotel_id = h.id
  left join capx x on x.hotel_id = h.id
  left join imp ip on ip.hotel_id = h.id
)
select b.id, r.code, round(r.ratio::numeric, 4) as ratio, r.detail
from base b
cross join lateral (
  select (select coalesce(sum(value::int),0) from jsonb_each_text(coalesce(b.ad->'produits','{}'::jsonb))) av_couverts
) av
cross join lateral (values
  -- Fiche établissement
  ('F_COORD',   ((coalesce(b.adresse_rue,'') <> '')::int + (coalesce(b.phone,'') <> '')::int) / 2.0, null::text),
  ('F_CONTACTS',((coalesce(b.gm_email,'') <> '')::int + (coalesce(b.tech_email,'') <> '')::int + (coalesce(b.ninjaone_nom,'') <> '')::int) / 3.0, null),
  -- Serveurs
  ('S_INV',   case when b.ss or b.vide_ninja then null else (b.n_ninja > 0)::int end, b.n_ninja || ' / ' || b.n || ' lignes liées à NinjaOne'),
  ('S_OS',    case when b.ss or b.vide_ninja then null when b.n = 0 then 0 else b.n_os::numeric / b.n end, b.n_os || ' / ' || b.n),
  ('S_ROLE',  case when b.ss or b.vide_ninja then null when b.n = 0 then 0 else b.n_role::numeric / b.n end, b.n_role || ' / ' || b.n),
  ('S_CP',    case when b.ss or b.vide_ninja then null when b.n_phys = 0 then (case when b.n = 0 then 0 end) else b.n_phys_cp::numeric / b.n_phys end, b.n_phys_cp || ' / ' || b.n_phys || ' physiques'),
  ('S_RAID',  case when b.ss or b.vide_ninja then null else (b.supervision_raid is not null)::int end, null),
  ('S_DOC',   case when b.ss or b.vide_ninja then null else coalesce(b.doc_ok, false)::int end, null),
  -- Sauvegardes
  ('B_JOBS',  case when b.ss or (b.vide_ninja and b.vj_n = 0) then null else (b.vj_n > 0)::int end, b.vj_n || ' job(s) actif(s)'),
  ('B_PLANIF',case when b.ss or (b.vide_ninja and b.vj_n = 0) then null when b.vj_n > 0 and b.vj_ok = b.vj_n then 1 when b.vj_n = 0 then 0 else b.vj_planif::numeric / b.vj_n end, b.vj_planif || ' / ' || b.vj_n),
  ('B_LIC',   case when b.ss or (b.vide_ninja and b.vj_n = 0) then null when b.vj_n > 0 and b.vj_ok = b.vj_n then 1 else (b.n_lic > 0)::int end, null),
  ('B_RET',   case when b.ss or (b.vide_ninja and b.vj_n = 0) then null when b.vj_n > 0 and b.vj_ok = b.vj_n then 1 else (coalesce(trim(b.retention_hors_site),'') <> '')::int end, null),
  -- Antivirus (tous éditeurs)
  ('A_PROD',   case when b.avng then null else (b.av_prevu <> '')::int end, nullif(b.av_prevu,'')),
  ('A_DETECT', case when b.avng then null else (coalesce((b.ad->>'le')::timestamptz > now() - interval '30 days', false))::int end, b.ad->>'le'),
  -- Console : Sophos Central rattaché pour un hôtel Sophos ; sinon console renseignée OU SOC externe (ex. Stoïk) qui l'exploite
  ('A_CONSOLE',case when b.avng then null else case when b.so_actif then 1 when b.av_prevu = 'sophos' then 0
                    else (coalesce(trim(b.av_console),'') <> '' or coalesce(trim(b.soc),'') <> '')::int end end, nullif(b.soc,'')),
  ('A_ESC',    case when b.avng then null else (coalesce(trim(b.av_contact_escalade),'') <> '' or coalesce(trim(b.soc),'') <> '')::int end, null),
  -- Microsoft 365
  ('M_TENANT', case when b.mng then null else b.m_tenant::int end, null),
  ('M_LIC',    case when b.mng then null else b.m_lic::int end, null),
  ('M_DOM',    case when b.mng then null else b.m_dom::int end, null),
  ('M_BLOC',   case when b.mng then null else (b.blocage_consentement is not null)::int end, null),
  -- Check-list
  ('C_REMPLI', case when b.ss then null when b.ck_n = 0 then 0 else b.ck_rempli::numeric / b.ck_n end, b.ck_rempli || ' / ' || b.ck_n),
  -- Projets
  ('P_PROJ',   case when b.pj_n = 0 then null else b.pj_suivis::numeric / b.pj_n end, b.pj_suivis || ' / ' || b.pj_n || ' projet(s) en cours'),
  ('P_CAPEX',  b.capex_ok::int, null),
  -- ===== Conformité =====
  ('X_MAJ',   case when b.ss or b.vide_ninja or b.n_aj = 0 then null else b.n_aj_ok::numeric / b.n_aj end, b.n_aj_ok || ' / ' || b.n_aj),
  ('X_OSSUP', case when b.ss or b.vide_ninja or b.n_win = 0 then null else b.n_win_ok::numeric / b.n_win end, b.n_win_ok || ' / ' || b.n_win),
  ('X_GAR',   case when b.ss or b.vide_ninja or b.n_gar = 0 then null else b.n_gar_ok::numeric / b.n_gar end, b.n_gar_ok || ' / ' || b.n_gar),
  ('X_AVSRV', case when b.ss or b.vide_ninja or b.n_av = 0 then null else b.n_av_ok::numeric / b.n_av end, b.n_av_ok || ' / ' || b.n_av),
  ('X_BOK',   case when b.ss or b.vj_n = 0 then null else b.vj_ok::numeric / b.vj_n end, b.vj_ok || ' / ' || b.vj_n),
  ('X_BINC',  case when b.ss or b.vj_n = 0 then null else (b.binc = 0)::int end, b.binc || ' incident(s)'),
  ('X_BLIC',  case when b.ss or b.n_lic = 0 then null else b.n_lic_ok::numeric / b.n_lic end, null),
  ('X_COUV',  case when b.avng then null else case when b.av_postes is null then null else least(1, av.av_couverts::numeric / b.av_postes) end end, av.av_couverts || ' / ' || b.av_postes || ' postes'),
  ('X_PRINC', case when b.avng then null else case when b.av_postes is null or b.av_prevu = '' then null
                   else least(1, (coalesce((b.ad->'produits'->>b.av_prevu)::numeric, 0)
                                + case when b.av_futur <> '' then coalesce((b.ad->'produits'->>b.av_futur)::numeric, 0) else 0 end) / b.av_postes) end end,
              coalesce(b.ad->'produits'->>b.av_prevu, '0') || ' / ' || b.av_postes || ' postes (' || b.av_prevu || ')'),
  ('X_DEF',   case when b.avng then null else case when b.av_postes is null or not (b.ad ? 'a_jour') then null else least(1, (b.ad->>'a_jour')::numeric / b.av_postes) end end, b.ad->>'a_jour'),
  ('X_MENACE',case when b.avng then null else case when b.ad ? 'menaces' then ((b.ad->>'menaces')::int = 0 and b.so_vieilles = 0)::int
                   when b.so_actif then (b.so_vieilles = 0)::int else null end end, b.ad->>'menaces'),
  ('X_MALERT',case when b.mng or not b.m_tenant then null else (b.m_alertes = 0)::int end, b.m_alertes || ' alerte(s)'),
  ('X_MFA',   null::numeric, 'pas encore collecté'),
  ('X_MBLOC', case when b.mng or b.blocage_consentement is null then null else b.blocage_consentement::int end, null),
  ('X_CHK',   case when b.ss or (b.ck_ok + b.ck_ko) = 0 then null else b.ck_ok::numeric / (b.ck_ok + b.ck_ko) end, b.ck_ok || ' OK / ' || b.ck_ko || ' KO'),
  ('X_MAT',   case when b.nb_machines is null or (b.nb_machines - coalesce(b.nb_inconnu,0)) <= 0 then null
                   else (b.nb_machines - coalesce(b.nb_inconnu,0) - coalesce(b.nb_5,0))::numeric / (b.nb_machines - coalesce(b.nb_inconnu,0)) end,
              coalesce(b.nb_5,0) || ' machine(s) de plus de 5 ans')
) as r(code, ratio, detail);
$$;
revoke all on function public._score_mesures() from public, anon, authenticated;

-- ---------- 5) Accès pour le portail (administrateurs DSI uniquement) ----------
create or replace function public.score_mesures()
returns table (hotel_id uuid, code text, ratio numeric, detail text)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs DSI Hotel'; end if;
  return query select * from public._score_mesures();
end $$;
revoke all on function public.score_mesures() from public, anon;
grant execute on function public.score_mesures() to authenticated;

-- Score global par hôtel (critères actifs, sans objet exclus du dénominateur)
drop function if exists public._scores_resume();
create or replace function public._scores_resume()
returns table (hotel_id uuid, completude integer, conformite integer, conf_points integer)
language sql stable security definer set search_path to 'public'
as $$
  -- La conformité n'est donnée que si au moins 30 points de critères sont mesurables (sinon NULL : « pas assez d'infos »)
  select m.hotel_id,
    round(100 * sum(c.points * m.ratio) filter (where c.score = 'comp' and m.ratio is not null)
              / nullif(sum(c.points) filter (where c.score = 'comp' and m.ratio is not null), 0))::int,
    case when coalesce(sum(c.points) filter (where c.score = 'conf' and m.ratio is not null), 0) >= 30 then
    round(100 * sum(c.points * m.ratio) filter (where c.score = 'conf' and m.ratio is not null)
              / nullif(sum(c.points) filter (where c.score = 'conf' and m.ratio is not null), 0))::int end,
    coalesce(sum(c.points) filter (where c.score = 'conf' and m.ratio is not null), 0)::int
  from public._score_mesures() m join public.score_criteres c on c.code = m.code and c.actif
  group by m.hotel_id;
$$;
revoke all on function public._scores_resume() from public, anon, authenticated;

-- Photo mensuelle (appelée par pg_cron)
create or replace function public.score_photo_mensuelle()
returns void language sql security definer set search_path to 'public'
as $$
  insert into public.score_historique (mois, hotel_id, completude, conformite)
  select to_char(now() at time zone 'Europe/Paris', 'YYYY-MM'), r.hotel_id, r.completude, r.conformite from public._scores_resume() r
  on conflict (mois, hotel_id) do update set completude = excluded.completude, conformite = excluded.conformite, cree_le = now();
$$;
revoke all on function public.score_photo_mensuelle() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'score-photo-mensuelle';
select cron.schedule('score-photo-mensuelle', '0 6 1 * *', 'select public.score_photo_mensuelle()');
-- Première photo tout de suite (mois en cours)
select public.score_photo_mensuelle();

-- 23/11/2026 : domaine Projets retiré du tableau de bord (critères désactivés, pas supprimés)
update public.score_criteres set actif = false where domaine = 'prj';

-- 23/11/2026 : antivirus géré par la chaîne (av_non_gere) ; sauvegardes toutes au vert = domaine Sauvegardes complet
