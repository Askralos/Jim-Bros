-- Suite des migrations précédentes. À exécuter dans Supabase > SQL Editor.
-- Ajoute 3 nouveaux tags d'exercice : abdo, skills, cardio.

alter table public.exercises drop constraint if exists exercises_tags_check;
alter table public.exercises
  add constraint exercises_tags_check
  check (tags <@ array['dos', 'biceps', 'triceps', 'epaules', 'pecs', 'jambes', 'abdo', 'skills', 'cardio']::text[]);
