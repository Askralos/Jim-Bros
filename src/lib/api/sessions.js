import { supabase } from "../supabaseClient";

const SESSION_SELECT = `
  id, creator_id, title, date, duration_min, photo_url, created_at,
  session_participants ( user_id ),
  session_entries (
    id, user_id, photo_url, submitted_at,
    entry_exercises (
      id, exercise_name, position,
      entry_sets ( reps, weight_kg, bodyweight, position )
    )
  )
`;

// Transforme la réponse imbriquée de Supabase en la forme que les composants
// attendent : session.participants = [uuid...], session.entries = { [uuid]: {...} }.
function shapeSession(row) {
  const participants = [...new Set([row.creator_id, ...row.session_participants.map((p) => p.user_id)])];
  const entries = {};
  (row.session_entries || []).forEach((e) => {
    const exercises = [...e.entry_exercises]
      .sort((a, b) => a.position - b.position)
      .map((ex) => ({
        name: ex.exercise_name,
        sets: [...ex.entry_sets]
          .sort((a, b) => a.position - b.position)
          .map((s) => ({ reps: s.reps, weight: s.weight_kg, bodyweight: s.bodyweight })),
      }));
    entries[e.user_id] = { entryId: e.id, exercises, photo: e.photo_url, submittedAt: e.submitted_at };
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

export async function getSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(shapeSession);
}

// Crée la séance + ses stats du créateur en un mini-batch (2-3 requêtes, jamais N).
export async function createSession({ title, date, durationMin, photo, participantIds }, creatorId, ownExercises) {
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ creator_id: creatorId, title: title || null, date, duration_min: durationMin, photo_url: photo })
    .select()
    .single();
  if (error) throw error;

  if (participantIds.length) {
    const { error: pErr } = await supabase
      .from("session_participants")
      .insert(participantIds.map((uid) => ({ session_id: session.id, user_id: uid })));
    if (pErr) throw pErr;
  }

  await writeEntry(session.id, creatorId, ownExercises, photo);
  return session.id;
}

export async function editSession(sessionId, { title, date, durationMin, photo, participantIds, creatorId }) {
  const { error } = await supabase
    .from("sessions")
    .update({ title: title || null, date, duration_min: durationMin, photo_url: photo })
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

// Écrit (ou remplace) les stats d'un participant pour une séance donnée.
// Repart de zéro sur les exercices/séries à chaque sauvegarde : plus simple et plus
// fiable qu'un diff, et le volume de données par séance reste minime.
export async function writeEntry(sessionId, userId, exercises, photo) {
  const { data: entry, error } = await supabase
    .from("session_entries")
    .upsert(
      { session_id: sessionId, user_id: userId, photo_url: photo, submitted_at: new Date().toISOString() },
      { onConflict: "session_id,user_id" }
    )
    .select()
    .single();
  if (error) throw error;

  await supabase.from("entry_exercises").delete().eq("entry_id", entry.id);

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const { data: exRow, error: exErr } = await supabase
      .from("entry_exercises")
      .insert({ entry_id: entry.id, exercise_name: ex.name, position: i })
      .select()
      .single();
    if (exErr) throw exErr;

    const sets = ex.sets.map((s, j) => ({
      entry_exercise_id: exRow.id,
      reps: Number(s.reps) || 0,
      weight_kg: s.bodyweight ? null : s.weight !== "" && s.weight != null ? Number(s.weight) : null,
      bodyweight: !!s.bodyweight,
      position: j,
    }));
    if (sets.length) {
      const { error: setErr } = await supabase.from("entry_sets").insert(sets);
      if (setErr) throw setErr;
    }
  }
  return entry.id;
}

export async function deleteEntry(sessionId, userId) {
  const { error } = await supabase.from("session_entries").delete().eq("session_id", sessionId).eq("user_id", userId);
  if (error) throw error;
}
