-- A executer dans Supabase > SQL Editor.
-- Les presets ne distinguaient pas reps/temps (contrairement aux series d'une seance),
-- donc l'objectif d'un exercice en temps (gainage, planche...) s'affichait toujours
-- comme un objectif de reps. Ajoute le mode par exercice, meme principe que
-- entry_sets.mode.

alter table public.preset_exercises
  add column if not exists mode text not null default 'reps';

alter table public.preset_exercises drop constraint if exists preset_exercises_mode_check;
alter table public.preset_exercises
  add constraint preset_exercises_mode_check
  check (mode in ('reps', 'time'));

NOTIFY pgrst, 'reload schema';
