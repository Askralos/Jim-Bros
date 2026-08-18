-- Migration additive pour la refonte multi-fonctionnalités (août 2026).
-- À exécuter dans Supabase > SQL Editor. Ne supprime ni ne casse aucune donnée existante.
-- Après exécution, active le Realtime (Database > Replication) sur :
--   measurement_entries, session_presets, preset_exercises

-- 1. Tags sur les exercices (filtre par groupe musculaire) -------------------------------

alter table public.exercises
  add column if not exists tags text[] not null default '{}';

alter table public.exercises drop constraint if exists exercises_tags_check;
alter table public.exercises
  add constraint exercises_tags_check
  check (tags <@ array['dos','biceps','triceps','epaules','pecs','jambes']::text[]);

-- 2. Type de charge (4 options) + mode reps/temps sur les séries ------------------------

alter table public.entry_sets
  add column if not exists weight_type text not null default 'external',
  add column if not exists mode text not null default 'reps',
  add column if not exists seconds integer;

alter table public.entry_sets drop constraint if exists entry_sets_weight_type_check;
alter table public.entry_sets
  add constraint entry_sets_weight_type_check
  check (weight_type in ('external', 'bodyweight', 'bodyweight_plus', 'assisted'));

alter table public.entry_sets drop constraint if exists entry_sets_mode_check;
alter table public.entry_sets
  add constraint entry_sets_mode_check
  check (mode in ('reps', 'time'));

-- Backfill : l'ancien booléen "bodyweight" devient le nouveau type "bodyweight".
-- La colonne "bodyweight" est conservée (dépréciée) pour ne rien casser rétroactivement.
update public.entry_sets
set weight_type = 'bodyweight'
where bodyweight = true and weight_type = 'external';

-- 3. Snapshot du poids du corps par entrée de séance -------------------------------------

alter table public.session_entries
  add column if not exists bodyweight_kg numeric;

update public.session_entries se
set bodyweight_kg = p.weight_kg
from public.profiles p
where se.user_id = p.id and se.bodyweight_kg is null;

-- 4. Historique des mesures corporelles (bras/poitrine/taille/cuisse), même pattern que
--    weight_entries qui existe déjà pour le poids ---------------------------------------

create table if not exists public.measurement_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('arm', 'chest', 'waist', 'thigh')),
  value_cm numeric not null,
  logged_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, type, logged_on)
);

alter table public.measurement_entries enable row level security;

drop policy if exists "measurement_entries_select" on public.measurement_entries;
create policy "measurement_entries_select" on public.measurement_entries
  for select to authenticated using (true);

drop policy if exists "measurement_entries_write" on public.measurement_entries;
create policy "measurement_entries_write" on public.measurement_entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Presets de séance --------------------------------------------------------------------

create table if not exists public.session_presets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.preset_exercises (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.session_presets(id) on delete cascade,
  exercise_name text not null,
  position integer not null default 0,
  set_count integer not null default 3
);

alter table public.session_presets enable row level security;
alter table public.preset_exercises enable row level security;

drop policy if exists "session_presets_select" on public.session_presets;
create policy "session_presets_select" on public.session_presets
  for select to authenticated using (true);

drop policy if exists "session_presets_write" on public.session_presets;
create policy "session_presets_write" on public.session_presets
  for all to authenticated using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

drop policy if exists "preset_exercises_select" on public.preset_exercises;
create policy "preset_exercises_select" on public.preset_exercises
  for select to authenticated using (true);

drop policy if exists "preset_exercises_write" on public.preset_exercises;
create policy "preset_exercises_write" on public.preset_exercises
  for all to authenticated using (
    exists (select 1 from public.session_presets sp where sp.id = preset_id and sp.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.session_presets sp where sp.id = preset_id and sp.creator_id = auth.uid())
  );
