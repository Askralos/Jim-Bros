-- Suite de la migration précédente (supabase_migration_2026_08.sql).
-- À exécuter dans Supabase > SQL Editor.

-- Nettoyage d'un exercice de test laissé par mes vérifications pendant le dev.
delete from public.exercises where name = '__smoke_test_exo__';

-- Seuls les pseudos "ludo" et "siweil" peuvent modifier ou supprimer un exercice de la
-- bibliothèque partagée (tout le monde peut toujours en ajouter et les consulter).
-- Les policies "restrictive" s'ajoutent en ET logique à la policy existante (qui autorisait
-- tout le monde) sans qu'on ait besoin de connaître/supprimer son nom exact.
drop policy if exists "exercises_admin_only_update" on public.exercises;
create policy "exercises_admin_only_update" on public.exercises
  as restrictive
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.username in ('ludo', 'siweil')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.username in ('ludo', 'siweil')));

drop policy if exists "exercises_admin_only_delete" on public.exercises;
create policy "exercises_admin_only_delete" on public.exercises
  as restrictive
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.username in ('ludo', 'siweil')));
