-- A executer dans Supabase > SQL Editor.
-- Ajoute deux champs facultatifs par serie : temps de repos, et objectif de repetitions
-- (fourchette min/max) utilise pour le code couleur dans la fiche seance.

alter table public.entry_sets
  add column if not exists rest_seconds integer,
  add column if not exists target_reps_min integer,
  add column if not exists target_reps_max integer;

alter table public.entry_sets drop constraint if exists entry_sets_rest_seconds_check;
alter table public.entry_sets
  add constraint entry_sets_rest_seconds_check
  check (rest_seconds is null or rest_seconds >= 0);

alter table public.entry_sets drop constraint if exists entry_sets_target_reps_check;
alter table public.entry_sets
  add constraint entry_sets_target_reps_check
  check (
    (target_reps_min is null and target_reps_max is null)
    or (target_reps_min is not null and target_reps_max is not null and target_reps_min <= target_reps_max)
  );
