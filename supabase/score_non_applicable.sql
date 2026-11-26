-- Critère « non applicable à cet hôtel » (coche N/A dans la fiche du tableau de bord) : sorti du calcul (ratio null)
-- Appliqué le 2026-11-26.
alter table public.score_actions add column if not exists non_applicable boolean not null default false;

alter function public._score_mesures() rename to _score_mesures_brut;
revoke all on function public._score_mesures_brut() from public, anon, authenticated;

create function public._score_mesures()
 returns table(hotel_id uuid, code text, ratio numeric, detail text)
 language sql stable security definer set search_path to 'public'
as $$
  select m.hotel_id, m.code,
         case when coalesce(a.non_applicable, false) then null else m.ratio end,
         case when coalesce(a.non_applicable, false) then 'non applicable à cet hôtel' else m.detail end
  from public._score_mesures_brut() m
  left join public.score_actions a on a.hotel_id = m.hotel_id and a.code = m.code
$$;
revoke all on function public._score_mesures() from public, anon, authenticated;
grant execute on function public._score_mesures() to service_role;
