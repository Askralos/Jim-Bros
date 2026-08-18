import { supabase } from "../supabaseClient";

export async function getAllProfiles() {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  const map = {};
  data.forEach((p) => (map[p.id] = p));
  return map;
}

// partial utilise les noms de colonnes Postgres (snake_case), ex:
// { objectif, height_cm, weight_kg, body_fat_pct, arm_cm, chest_cm, waist_cm, thigh_cm, avatar_url }
export async function updateProfile(userId, partial) {
  const { error } = await supabase.from("profiles").update(partial).eq("id", userId);
  if (error) throw error;
}

export async function getWeightHistory(userId) {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", userId)
    .order("logged_on", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addWeightEntry(userId, weightKg, loggedOn) {
  const { error } = await supabase
    .from("weight_entries")
    .upsert({ user_id: userId, weight_kg: weightKg, logged_on: loggedOn }, { onConflict: "user_id,logged_on" });
  if (error) throw error;
  await updateProfile(userId, { weight_kg: weightKg });
}

// Dernier poids connu (dernière pesée, sinon le poids courant du profil). Sert à pré-remplir
// le snapshot de poids du corps quand on renseigne les stats d'une séance.
export async function getLatestWeight(userId) {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("logged_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.weight_kg != null) return data.weight_kg;
  const { data: profile, error: pErr } = await supabase.from("profiles").select("weight_kg").eq("id", userId).single();
  if (pErr) throw pErr;
  return profile?.weight_kg ?? null;
}

const MEASUREMENT_PROFILE_FIELD = { arm: "arm_cm", chest: "chest_cm", waist: "waist_cm", thigh: "thigh_cm" };

export async function getMeasurementHistory(userId, type) {
  const { data, error } = await supabase
    .from("measurement_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("logged_on", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addMeasurementEntry(userId, type, valueCm, loggedOn) {
  const { error } = await supabase
    .from("measurement_entries")
    .upsert({ user_id: userId, type, value_cm: valueCm, logged_on: loggedOn }, { onConflict: "user_id,type,logged_on" });
  if (error) throw error;
  await updateProfile(userId, { [MEASUREMENT_PROFILE_FIELD[type]]: valueCm });
}

export async function getAllPRs() {
  const { data, error } = await supabase.from("personal_records").select("*").order("logged_on", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPR(userId, exercise, value, unit) {
  const { error } = await supabase.from("personal_records").insert({ user_id: userId, exercise, value, unit });
  if (error) throw error;
}

export async function deletePR(id) {
  const { error } = await supabase.from("personal_records").delete().eq("id", id);
  if (error) throw error;
}
