-- Le validateur (RH / direction) doit être une autre personne que le demandeur (appliqué le 2026-11-26).
-- NOT VALID : les anciennes validations où c'était la même adresse restent en l'état, la règle s'applique aux nouvelles.
alter table public.ticket_validations
  add constraint ticket_validations_validateur_different
  check (lower(trim(coalesce(validateur_email, ''))) <> lower(trim(coalesce(demandeur_email, '')))) not valid;
