-- =====================================================================
-- Tableau de bord hôtels : NOTE PAR MACHINE + photo quotidienne des scores
-- (à exécuter après completude.sql). Ne modifie aucune table existante.
--
--   machines            tous les ordinateurs NinjaOne (Worker dsi-hotel-inventaire, route /machines)
--   _fin_de_vie()       date de fin de support Microsoft / VMware d'un système
--   machines_notes()    note /100 de chaque machine + raisons (points perdus)
--   score_jour          photo quotidienne des scores (tendance sur 7 jours), pg_cron à 5 h 15 UTC
-- =====================================================================

create table if not exists public.machines (
  ninja_id bigint primary key,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  nom text not null,
  classe text,
  type text,                 -- Poste | Serveur | Hôte
  ip text,
  os text,
  os_build text,
  os_release text,
  fabricant text,
  modele text,
  serie text,
  dernier_contact timestamptz,
  en_ligne boolean,
  maj_attente integer default 0,
  maj_echec integer default 0,
  maj_30j boolean,           -- au moins une mise à jour installée ces 30 derniers jours
  maj_liste jsonb,           -- noms des mises à jour Windows en attente / en échec (15 max)
  log_attente integer,       -- mises à jour de logiciels (Java, Chrome, Adobe…) en attente — null si non suivi
  log_echec integer,
  log_liste jsonb,           -- noms des logiciels à mettre à jour (15 max)
  av_nom text,
  av_actif boolean,
  av_def_ok boolean,
  maj_le timestamptz default now()
);
create index if not exists machines_hotel_idx on public.machines(hotel_id);
alter table public.machines enable row level security;
drop policy if exists machines_admin on public.machines;
create policy machines_admin on public.machines for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Fin de support d'un système (null = inconnue ou lointaine)
create or replace function public._fin_de_vie(p_os text, p_release text)
returns date language sql immutable set search_path to 'public'
as $$
  select case
    when p_os ~* 'server 2025' then date '2034-10-10'
    when p_os ~* 'server 2022' then date '2031-10-14'
    when p_os ~* 'server 2019' then date '2029-01-09'
    when p_os ~* 'server 2016' then date '2027-01-12'
    when p_os ~* 'server (2012|2008|2003)' then date '2023-10-10'
    when p_os ~* 'windows 10' and p_os ~* 'iot' and p_os ~* '(ltsc|ltsb)' and (p_os ~* '2021' or p_release = '21H2') then date '2032-01-13'
    when p_os ~* 'windows 10' and p_os ~* '(ltsc|ltsb)' then
      case when p_os ~* '2021' or p_release = '21H2' then date '2027-01-12'
           when p_os ~* '2016' or p_release = '1607' then date '2026-10-13'
           else date '2029-01-09' end
    when p_os ~* 'windows 10' then date '2025-10-14'
    when p_os ~* 'windows 11' then
      case when p_os ~* '(enterprise|entreprise|education)' then
             case p_release when '21H2' then date '2024-10-08' when '22H2' then date '2025-10-14' when '23H2' then date '2026-11-10'
                            when '24H2' then date '2027-10-12' when '25H2' then date '2028-10-10' end
           else
             case p_release when '21H2' then date '2023-10-10' when '22H2' then date '2024-10-08' when '23H2' then date '2025-11-11'
                            when '24H2' then date '2026-10-13' when '25H2' then date '2027-10-12' end
      end
    when p_os ~* 'windows (7|8)' then date '2023-01-10'
    when p_os ~* 'esxi' and p_os ~* '(^|\s)6\.' then date '2022-10-15'
    when p_os ~* 'esxi' and p_os ~* '(^|\s)7\.' then date '2025-10-02'
    when p_os ~* 'esxi' and p_os ~* '(^|\s)8\.' then date '2027-10-11'
  end;
$$;

-- Note de chaque machine (interne)
alter table public.machines add column if not exists maj_liste jsonb, add column if not exists log_attente integer,
  add column if not exists log_echec integer, add column if not exists log_liste jsonb;

drop function if exists public.machines_notes(uuid);
drop function if exists public._machines_notes(uuid);
create or replace function public._machines_notes(p_hotel uuid default null)
returns table (hotel_id uuid, ninja_id bigint, nom text, type text, ip text, os text, os_release text,
               dernier_contact timestamptz, jours integer, active boolean, fin_de_vie date,
               av_nom text, av_actif boolean, maj_attente integer, maj_30j boolean, note integer, raisons jsonb,
               maj_echec integer, maj_liste jsonb, log_attente integer, log_echec integer, log_liste jsonb)
language sql stable security definer set search_path to 'public'
as $$
  with m as (
    select m.*, coalesce(hc.av_non_gere, false) avng,
      greatest(0, floor(extract(epoch from (now() - m.dernier_contact)) / 86400))::int jours,
      public._fin_de_vie(m.os, m.os_release) fdv,
      (select s.care_pack_fin from inventaire_serveurs s where s.ninja_id = m.ninja_id and s.care_pack_fin is not null limit 1) cp_fin
    from machines m
    join hotels h on h.id = m.hotel_id
    left join hotel_completude hc on hc.hotel_id = m.hotel_id
    where not coalesce(hc.exclu, false) and (p_hotel is null or m.hotel_id = p_hotel)
  ),
  r as (
    select m.ninja_id, jsonb_agg(jsonb_build_object('k', x.k, 't', x.t, 'p', x.p) order by x.p) raisons, sum(x.p)::int total
    from m
    cross join lateral (values
      ('av',  'Antivirus absent ou arrêté', -30, m.type <> 'Hôte' and not m.avng and not coalesce(m.av_actif, false)),
      ('def', 'Définitions antivirus pas à jour', -10, m.type <> 'Hôte' and not m.avng and coalesce(m.av_actif, false) and m.av_def_ok = false),
      ('eol', 'Système en fin de vie depuis le ' || to_char(m.fdv, 'DD/MM/YYYY'), -30, m.fdv < current_date),
      ('eol', 'Fin de vie le ' || to_char(m.fdv, 'DD/MM/YYYY'), -10, m.fdv >= current_date and m.fdv < current_date + 90),
      ('maj', 'Mises à jour en retard (' || (m.maj_attente + m.maj_echec) || ' en attente, aucune installée depuis 30 j)', -20,
              m.type <> 'Hôte' and (m.maj_attente + m.maj_echec) > 0 and m.maj_30j = false),
      ('gar', 'Care Pack expiré le ' || to_char(m.cp_fin, 'DD/MM/YYYY'), -10, m.cp_fin < current_date),
      ('hl',  'Hors ligne depuis ' || m.jours || ' jours', -5, m.jours >= 3)
    ) as x(k, t, p, ok)
    where x.ok
    group by m.ninja_id
  )
  select m.hotel_id, m.ninja_id, m.nom, m.type, m.ip, m.os, m.os_release, m.dernier_contact, m.jours,
         (m.jours <= 8) active, m.fdv, m.av_nom, m.av_actif, m.maj_attente + m.maj_echec, m.maj_30j,
         case when m.jours <= 8 then greatest(0, 100 + coalesce(r.total, 0)) end,
         coalesce(r.raisons, '[]'::jsonb),
         m.maj_echec, m.maj_liste, m.log_attente, m.log_echec, m.log_liste
  from m left join r on r.ninja_id = m.ninja_id;
$$;
revoke all on function public._machines_notes(uuid) from public, anon, authenticated;

create or replace function public.machines_notes(p_hotel uuid default null)
returns table (hotel_id uuid, ninja_id bigint, nom text, type text, ip text, os text, os_release text,
               dernier_contact timestamptz, jours integer, active boolean, fin_de_vie date,
               av_nom text, av_actif boolean, maj_attente integer, maj_30j boolean, note integer, raisons jsonb,
               maj_echec integer, maj_liste jsonb, log_attente integer, log_echec integer, log_liste jsonb)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs DSI Hotel'; end if;
  return query select * from public._machines_notes(p_hotel);
end $$;
revoke all on function public.machines_notes(uuid) from public, anon;
grant execute on function public.machines_notes(uuid) to authenticated;

-- Photo quotidienne des scores (tendance sur 7 jours)
create table if not exists public.score_jour (
  jour date not null,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  completude integer,
  conformite integer,
  machines integer,           -- note moyenne des machines actives
  primary key (jour, hotel_id)
);
alter table public.score_jour enable row level security;
drop policy if exists score_jour_admin on public.score_jour;
create policy score_jour_admin on public.score_jour for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.score_photo_jour()
returns void language sql security definer set search_path to 'public'
as $$
  insert into public.score_jour (jour, hotel_id, completude, conformite, machines)
  select (now() at time zone 'Europe/Paris')::date, r.hotel_id, r.completude, r.conformite,
         (select round(avg(n.note))::int from public._machines_notes(r.hotel_id) n where n.active)
  from public._scores_resume() r
  on conflict (jour, hotel_id) do update set completude = excluded.completude, conformite = excluded.conformite, machines = excluded.machines;
  delete from public.score_jour where jour < current_date - 400;
$$;
revoke all on function public.score_photo_jour() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'score-photo-jour';
select cron.schedule('score-photo-jour', '15 5 * * *', 'select public.score_photo_jour()');
select public.score_photo_jour();
