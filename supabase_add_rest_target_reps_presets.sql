-- A executer dans Supabase > SQL Editor.
-- Meme principe que sur entry_sets : temps de repos et objectif de repetitions,
-- mais ici au niveau de l'exercice du preset (applique a toutes ses series une
-- fois le preset utilise), pas serie par serie puisqu'un preset ne detaille pas
-- les series individuellement.

alter table public.preset_exercises
  add column if not exists rest_seconds integer,
  add column if not exists target_reps_min integer,
  add column if not exists target_reps_max integer;

alter table public.preset_exercises drop constraint if exists preset_exercises_rest_seconds_check;
alter table public.preset_exercises
  add constraint preset_exercises_rest_seconds_check
  check (rest_seconds is null or rest_seconds >= 0);

alter table public.preset_exercises drop constraint if exists preset_exercises_target_reps_check;
alter table public.preset_exercises
  add constraint preset_exercises_target_reps_check
  check (
    (target_reps_min is null and target_reps_max is null)
    or (target_reps_min is not null and target_reps_max is not null and target_reps_min <= target_reps_max)
  );

-- Important : forcer PostgREST a recharger son schema tout de suite (sinon les
-- inserts/select referencant ces nouvelles colonnes echouent en 400 jusqu'au
-- prochain reload automatique, cf. le bug de la derniere fois).
NOTIFY pgrst, 'reload schema';
