-- À exécuter dans Supabase > SQL Editor si ta table sessions existe déjà sans ces colonnes.

alter table public.sessions
  add column if not exists feeling text,
  add column if not exists comment text;

alter table public.sessions drop constraint if exists sessions_feeling_check;

alter table public.sessions
  add constraint sessions_feeling_check
  check (feeling is null or feeling in ('excellent', 'good', 'normal', 'difficult', 'very_difficult'));
