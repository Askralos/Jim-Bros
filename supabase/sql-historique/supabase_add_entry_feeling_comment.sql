-- À exécuter dans Supabase > SQL Editor.
-- Déplace le feeling/commentaire de la séance (un seul, modifiable par le créateur
-- uniquement) vers les stats de chaque participant (un feeling + un commentaire par
-- personne, comme le reste de ses stats).

alter table public.session_entries
  add column if not exists feeling text,
  add column if not exists comment text;

alter table public.session_entries drop constraint if exists session_entries_feeling_check;

alter table public.session_entries
  add constraint session_entries_feeling_check
  check (feeling is null or feeling in ('excellent', 'good', 'normal', 'difficult', 'very_difficult'));

-- Les colonnes sessions.feeling / sessions.comment (ajoutées par
-- supabase_add_session_feeling_comment.sql) ne sont plus utilisées par l'app mais
-- restent en base pour ne pas perdre l'historique déjà saisi par les créateurs.
