# Jim Bros

App de muscu entre potes : séances collectives avec photo, stats par participant,
presets, supersets et dropsets, suivi par exercice, calendrier, PR.

React + Vite côté front, Supabase (Postgres, Auth, Storage, Realtime) côté back,
déployé sur Vercel.

## Architecture

```
src/
  App.jsx               routage entre écrans, câblage des callbacks
  lib/
    supabaseClient.js   client Supabase (une seule instance partagée)
    constants.js        couleurs, tags d'exercices, types de séance, feelings
    styles.js           objets de style partagés entre composants
    utils.js            fonctions pures (dates, supersets, dropsets, volume, streak...)
    cache.js            dernier état connu gardé en localStorage (ouverture instantanée)
    drafts.js           brouillons de saisie (séance en cours, mes stats) en localStorage
    lazyScreen.js       écrans chargés à la demande (+ rechargement après un déploiement)
    api/                toutes les requêtes Supabase, un fichier par domaine
      auth.js  profiles.js  exercises.js  presets.js  sessions.js  storage.js
  hooks/
    useAppData.js       charge les données partagées (cache puis réseau), les tient à
                        jour via Supabase Realtime, pagine le fil des séances
  components/
    Home, CalendarView, Friends, ProfileScreen, ExercisesLibrary   écrans
    NewSession          création d'une séance
    SessionModal        détail d'une séance ; SessionEntryForm (mes stats) et
                        SessionEditForm (modifier la séance) sont ses deux formulaires
    ExercisesEditor     saisie des exercices/séries (supersets, dropsets, ordre)
    PresetsEditor       presets de séance
    EntryFields         champs communs aux deux saisies de stats
    Modal, PhotoInput, MiniLineChart, Avatar, ...   briques réutilisées partout
supabase/
  sql-historique/       anciens scripts SQL, gardés pour mémoire (voir plus bas)
```

Chaque appel réseau passe par `lib/api/*` : aucun composant ne parle directement à
Supabase.

## Commandes

Le projet utilise **pnpm** (c'est `pnpm-lock.yaml` que Vercel installe : ne pas
utiliser `npm install`, qui laisserait ce fichier désynchronisé et casserait le déploiement).

```bash
pnpm install
cp .env.example .env.local   # puis renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
pnpm dev                     # serveur local
pnpm test                    # tests unitaires (vitest)
pnpm lint                    # code mort, variables non définies, erreurs de hooks
pnpm build                   # build de production dans dist/
```

## Supabase

- **Schéma** : la source de vérité est l'historique des migrations du projet Supabase
  (Dashboard > Database > Migrations). Les fichiers de `supabase/sql-historique/` sont
  d'anciens scripts appliqués à la main au début du projet ; ils ne sont plus à jour.
- **Auth** : identifiant + mot de passe. Supabase exige un email, donc l'app en
  fabrique un à partir du pseudo (`pseudo@ironsquad.app`). "Confirm email" doit rester
  désactivé (Authentication > Providers > Email).
- **Realtime** : tables suivies `sessions`, `session_participants`, `session_entries`,
  `profiles`, `exercises`, `personal_records`. Les exercices/séries d'une entrée ne
  sont pas suivis : `writeEntry` termine par une mise à jour de `session_entries`, qui
  sert de signal.
- **Storage** : bucket public `photos` (séances, avatars, exercices). Les photos sont
  compressées dans le navigateur avant l'envoi et mises en cache un an.
- **Connecteur Claude (MCP)** : edge function `mcp-training`, lecture seule, un token
  personnel par utilisateur (table `mcp_access_tokens`, tokens stockés hashés).

## Déploiement

Vercel déploie automatiquement chaque push sur `main`. Variables d'environnement à
définir dans le projet Vercel : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
`vercel.json` met les fichiers de `/assets` (noms hashés) en cache longue durée.

## Limites connues

- **Auth par faux email** : très bien pour une squad fermée, mais pas de lien de
  réinitialisation par email. Chacun change son mot de passe depuis son profil, et
  les admins (`ADMIN_USERNAMES`) réinitialisent celui d'un membre depuis sa fiche
  dans Amis (fonction SQL `admin_reset_password`). Pour ouvrir l'app plus largement,
  passer à un vrai email ou à un fournisseur OAuth.
- **Écritures non atomiques** : publier une séance enchaîne plusieurs requêtes
  (séance, participants, entrée, exercices, séries). Un échec en cours de route est
  rattrapé à la création (la séance est supprimée), mais modifier ses stats repart de
  zéro sur les exercices/séries : une coupure réseau au mauvais moment peut laisser
  une entrée incomplète. Une fonction Postgres unique réglerait ça.
- **Photos orphelines** : une photo remplacée ou une séance supprimée laisse son
  fichier dans le bucket (personne n'a le droit de supprimer dans Storage).
