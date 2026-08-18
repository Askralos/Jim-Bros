import { supabase } from "../supabaseClient";

const PRESET_SELECT = `
  id, creator_id, name, created_at,
  preset_exercises ( id, exercise_name, position, set_count )
`;

function shapePreset(row) {
  return {
    id: row.id,
    creatorId: row.creator_id,
    name: row.name,
    createdAt: row.created_at,
    exercises: [...row.preset_exercises]
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ name: e.exercise_name, setCount: e.set_count })),
  };
}

export async function getPresets() {
  const { data, error } = await supabase.from("session_presets").select(PRESET_SELECT).order("name");
  if (error) throw error;
  return data.map(shapePreset);
}

// exercises : [{ name, setCount }]
export async function createPreset(name, exercises, creatorId) {
  const { data: preset, error } = await supabase
    .from("session_presets")
    .insert({ name: name.trim(), creator_id: creatorId })
    .select()
    .single();
  if (error) throw error;
  await writePresetExercises(preset.id, exercises);
  return preset.id;
}

export async function updatePreset(presetId, name, exercises) {
  const { error } = await supabase.from("session_presets").update({ name: name.trim() }).eq("id", presetId);
  if (error) throw error;
  await supabase.from("preset_exercises").delete().eq("preset_id", presetId);
  await writePresetExercises(presetId, exercises);
}

async function writePresetExercises(presetId, exercises) {
  if (!exercises.length) return;
  const rows = exercises.map((ex, i) => ({
    preset_id: presetId, exercise_name: ex.name, position: i, set_count: Math.max(1, Number(ex.setCount) || 1),
  }));
  const { error } = await supabase.from("preset_exercises").insert(rows);
  if (error) throw error;
}

export async function deletePreset(presetId) {
  const { error } = await supabase.from("session_presets").delete().eq("id", presetId);
  if (error) throw error; // ON DELETE CASCADE nettoie preset_exercises
}
