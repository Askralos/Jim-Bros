import { supabase } from "../supabaseClient";

const SESSION_SELECT = `
  id, creator_id, title, date, duration_min, photo_url, created_at,
  session_participants ( user_id ),
  session_entries (
    id, user_id, photo_url, submitted_at, bodyweight_kg, feeling, comment,
    entry_exercises (
      id, exercise_name, position,
      entry_sets ( reps, weight_kg, weight_type, mode, seconds, rest_seconds, target_reps_min, target_reps_max, position )
    )
  )
`;

// Un exercice + ses séries, dans la forme attendue par les composants (utilisé
// aussi bien pour une séance complète que pour l'historique d'un seul user).
function shapeExercises(entryExercisesRows) {
  return [...(entryExercisesRows || [])]
    .sort((a, b) => a.position - b.position)
    .map((ex) => ({
      name: ex.exercise_name,
      sets: [...ex.entry_sets]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          reps: s.reps, weight: s.weight_kg, weightType: s.weight_type, mode: s.mode, seconds: s.seconds,
          restSeconds: s.rest_seconds, targetMin: s.target_reps_min, targetMax: s.target_reps_max,
        })),
    }));
}

// Transforme la réponse imbriquée de Supabase en la forme que les composants
// attendent : session.participants = [uuid...], session.entries = { [uuid]: {...} }.
function shapeSession(row) {
  const participants = [...new Set([row.creator_id, ...row.session_participants.map((p) => p.user_id)])];
  const entries = {};
  (row.session_entries || []).forEach((e) => {
    entries[e.user_id] = {
      entryId: e.id, exercises: shapeExercises(e.entry_exercises), photo: e.photo_url, submittedAt: e.submitted_at, bodyweightKg: e.bodyweight_kg,
      feeling: e.feeling || null, comment: e.comment || null,
    };
  });
  return {
    id: row.id,
    creator: row.creator_id,
    title: row.title,
    date: row.date,
    durationMin: row.duration_min,
    photo: row.photo_url,
    createdAt: new Date(row.created_at).getTime(),
    participants,
    entries,
  };
}

export const SESSIONS_PAGE_SIZE = 60;

// Fil des séances, paginé (les plus récentes d'abord) : `before` reprend le
// curseur { date, createdAt } de la dernière séance déjà chargée pour aller
// chercher les suivantes. hasMore indique s'il reste des séances plus anciennes.
export async function getSessions({ limit = SESSIONS_PAGE_SIZE, before } = {}) {
  let query = supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) {
    query = query.or(`date.lt.${before.date},and(date.eq.${before.date},created_at.lt.${before.createdAt})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return { sessions: data.map(shapeSession), hasMore: data.length === limit };
}

// Version très légère (pas d'exercices/séries) de TOUTES les séances, pour les
// écrans qui n'ont besoin que de savoir qui a posté quand (classement, liste
// d'amis) sans payer le coût du détail complet sur tout l'historique.
export async function getSessionShells() {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, creator_id, date, session_participants ( user_id ), session_entries ( user_id )")
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    date: row.date,
    creator: row.creator_id,
    participants: [...new Set([row.creator_id, ...row.session_participants.map((p) => p.user_id)])],
    entryUserIds: row.session_entries.map((e) => e.user_id),
  }));
}

// Historique complet (toutes séances confondues) d'un seul user, pour les écrans
// qui ont besoin de tout son passif (progression, suivi par exercice) sans avoir
// à charger le détail de TOUT le monde sur TOUTES les séances comme getSessions().
export async function getUserHistory(userId) {
  const { data, error } = await supabase
    .from("session_entries")
    .select("id, session_id, bodyweight_kg, sessions ( id, date, title ), entry_exercises ( id, exercise_name, position, entry_sets ( reps, weight_kg, weight_type, mode, seconds, rest_seconds, target_reps_min, target_reps_max, position ) )")
    .eq("user_id", userId);
  if (error) throw error;
  const sessions = [];
  const entries = data
    .filter((row) => row.sessions)
    .map((row) => {
      sessions.push({ id: row.sessions.id, date: row.sessions.date, title: row.sessions.title });
      return { userId, sessionId: row.session_id, bodyweightKg: row.bodyweight_kg, exercises: shapeExercises(row.entry_exercises) };
    });
  return { entries, sessions };
}

// Séance unique, avec le détail complet de tous les participants (fallback pour
// ouvrir une séance qui n'est pas dans la page actuellement chargée par getSessions).
export async function getSessionById(sessionId) {
  const { data, error } = await supabase.from("sessions").select(SESSION_SELECT).eq("id", sessionId).single();
  if (error) throw error;
  return shapeSession(data);
}

// Nombre total de séances (toutes dates confondues) où chaque user a posté ses
// stats — sert au ratio "séances/semaine" du classement, sans charger le détail.
export async function getSessionCountsByUser() {
  const { data, error } = await supabase.from("session_entries").select("user_id");
  if (error) throw error;
  const counts = {};
  data.forEach((r) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
  return counts;
}

// Crée la séance + ses stats du créateur en un mini-batch (2-3 requêtes, jamais N).
// Le feeling/commentaire est propre au créateur (sa propre entrée), comme pour
// chaque autre participant.
export async function createSession({ title, date, durationMin, photo, feeling, comment, participantIds, bodyweightKg }, creatorId, ownExercises) {
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      creator_id: creatorId,
      title: title || null,
      date,
      duration_min: durationMin,
      photo_url: photo,
    })
    .select()
    .single();
  if (error) throw error;

  if (participantIds.length) {
    const { error: pErr } = await supabase
      .from("session_participants")
      .insert(participantIds.map((uid) => ({ session_id: session.id, user_id: uid })));
    if (pErr) throw pErr;
  }

  await writeEntry(session.id, creatorId, ownExercises, bodyweightKg, feeling, comment);
  return session.id;
}

export async function editSession(sessionId, { title, date, durationMin, photo, participantIds, creatorId }) {
  const { error } = await supabase
    .from("sessions")
    .update({
      title: title || null,
      date,
      duration_min: durationMin,
      photo_url: photo,
    })
    .eq("id", sessionId);
  if (error) throw error;

  // On remplace la liste de participants (le créateur n'y figure jamais explicitement).
  await supabase.from("session_participants").delete().eq("session_id", sessionId);
  if (participantIds.length) {
    await supabase
      .from("session_participants")
      .insert(participantIds.map((uid) => ({ session_id: sessionId, user_id: uid })));
  }

  // Retire les stats de ceux qui ne sont plus participants (cascade supprime
  // automatiquement leurs exercices/séries via ON DELETE CASCADE).
  const keep = new Set([creatorId, ...participantIds]);
  const { data: existingEntries } = await supabase
    .from("session_entries")
    .select("id, user_id")
    .eq("session_id", sessionId);
  const toRemove = (existingEntries || []).filter((e) => !keep.has(e.user_id)).map((e) => e.id);
  if (toRemove.length) await supabase.from("session_entries").delete().in("id", toRemove);
}

export async function deleteSession(sessionId) {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw error; // ON DELETE CASCADE nettoie participants/entrées/exercices/séries
}

// Écrit (ou remplace) les stats d'un participant pour une séance donnée, y compris
// son propre feeling/commentaire (chacun le sien, contrairement au titre/photo qui
// restent partagés au niveau de la séance).
// Repart de zéro sur les exercices/séries à chaque sauvegarde : plus simple et plus
// fiable qu'un diff, et le volume de données par séance reste minime.
export async function writeEntry(sessionId, userId, exercises, bodyweightKg, feeling, comment) {
  const { data: entry, error } = await supabase
    .from("session_entries")
    .upsert(
      {
        session_id: sessionId, user_id: userId, submitted_at: new Date().toISOString(),
        bodyweight_kg: bodyweightKg !== "" && bodyweightKg != null ? Number(bodyweightKg) : null,
        feeling: feeling || null,
        comment: comment?.trim() || null,
      },
      { onConflict: "session_id,user_id" }
    )
    .select()
    .single();
  if (error) throw error;

  const { error: delErr } = await supabase.from("entry_exercises").delete().eq("entry_id", entry.id);
  if (delErr) throw delErr;
  if (!exercises.length) return entry.id;

  // Deux inserts multi-lignes au lieu d'un aller-retour par exercice : sur une séance à
  // 5-6 exercices ça divise par ~5 le nombre de requêtes réseau (c'était la cause
  // principale de la lenteur ressentie à la publication).
  const exerciseRows = exercises.map((ex, i) => ({ entry_id: entry.id, exercise_name: ex.name, position: i }));
  const { data: insertedExercises, error: exErr } = await supabase.from("entry_exercises").insert(exerciseRows).select();
  if (exErr) throw exErr;

  const exerciseIdByPosition = new Map(insertedExercises.map((row) => [row.position, row.id]));

  const allSets = [];
  exercises.forEach((ex, i) => {
    const entryExerciseId = exerciseIdByPosition.get(i);
    ex.sets.forEach((s, j) => {
      const weightType = s.weightType || "external";
      const mode = s.mode === "time" ? "time" : "reps";
      // target_reps_min/max sert d'objectif reps en mode "reps" et d'objectif de temps
      // (secondes) en mode "time" (le nom de colonne date d'avant le support du temps).
      const hasTarget = s.targetMin !== "" && s.targetMin != null && s.targetMax !== "" && s.targetMax != null;
      allSets.push({
        entry_exercise_id: entryExerciseId,
        reps: mode === "time" ? 0 : Number(s.reps) || 0,
        seconds: mode === "time" ? Number(s.seconds) || 0 : null,
        mode,
        weight_type: weightType,
        weight_kg: weightType === "bodyweight" ? null : (s.weight !== "" && s.weight != null ? Number(s.weight) : null),
        bodyweight: weightType === "bodyweight",
        rest_seconds: s.restSeconds !== "" && s.restSeconds != null ? Number(s.restSeconds) : null,
        target_reps_min: hasTarget ? Number(s.targetMin) : null,
        target_reps_max: hasTarget ? Number(s.targetMax) : null,
        position: j,
      });
    });
  });
  if (allSets.length) {
    const { error: setErr } = await supabase.from("entry_sets").insert(allSets);
    if (setErr) throw setErr;
  }
  return entry.id;
}

export async function deleteEntry(sessionId, userId) {
  const { error } = await supabase.from("session_entries").delete().eq("session_id", sessionId).eq("user_id", userId);
  if (error) throw error;
}
