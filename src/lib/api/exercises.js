import { supabase } from "../supabaseClient";
import { DEFAULT_EXERCISES } from "../constants";

export async function getExercises() {
  const { data, error } = await supabase.from("exercises").select("*").order("name");
  if (error) throw error;
  if (!data.length) {
    // Premier lancement : on peuple la base en UN seul appel groupé (pas de rafale
    // d'écritures qui pourrait se faire rate-limiter).
    const { error: seedError } = await supabase.from("exercises").insert(DEFAULT_EXERCISES.map((name) => ({ name })));
    if (seedError) throw seedError;
    return getExercises();
  }
  return data;
}

export async function addExercise(name, photoUrl, addedBy) {
  const { error } = await supabase.from("exercises").insert({ name: name.trim(), photo_url: photoUrl, added_by: addedBy });
  if (error) {
    if (error.code === "23505") throw new Error("Cet exercice existe déjà.");
    throw error;
  }
}

export async function updateExercisePhoto(id, photoUrl) {
  const { error } = await supabase.from("exercises").update({ photo_url: photoUrl }).eq("id", id);
  if (error) throw error;
}
