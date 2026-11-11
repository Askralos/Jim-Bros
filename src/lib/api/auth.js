import { supabase } from "../supabaseClient";
import { clearCache } from "../cache";

// Supabase Auth exige un email. On en fabrique un à partir du pseudo pour garder
// une expérience "identifiant + mot de passe" côté utilisateur — invisible pour eux.
// Pense à désactiver "Confirm email" dans Supabase > Authentication > Providers > Email,
// sinon chaque inscription restera bloquée en attente d'un email de confirmation que
// personne ne recevra jamais.
const emailFor = (username) => `${username.trim().toLowerCase()}@ironsquad.app`;

export async function signUp(username, password, displayName) {
  const clean = username.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: emailFor(clean),
    password,
    options: { data: { username: clean, display_name: displayName?.trim() || clean } },
  });
  if (error) {
    if (error.message?.toLowerCase().includes("already registered")) {
      throw new Error("Ce compte existe déjà.");
    }
    throw error;
  }
  return data;
}

export async function signIn(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailFor(username),
    password,
  });
  if (error) throw new Error("Identifiant ou mot de passe incorrect.");
  return data;
}

export async function signOut() {
  clearCache();
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

// Change le mot de passe du compte connecté.
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.code === "same_password") throw new Error("C'est déjà ton mot de passe actuel.");
    if (error.code === "weak_password") throw new Error("Mot de passe trop faible : 6 caractères minimum.");
    throw error;
  }
}

// Admins seulement (vérifié par la fonction SQL) : remplace le mot de passe d'un
// membre qui a oublié le sien. Il n'y a pas de vrai email pour un lien de
// réinitialisation (voir emailFor), d'où ce passage par un admin.
export async function adminResetPassword(userId, newPassword) {
  const { error } = await supabase.rpc("admin_reset_password", { target_user_id: userId, new_password: newPassword });
  if (error) throw error;
}

// Mot de passe temporaire lisible (pas de 0/O ni 1/l/I), à transmettre au pote.
export function generateTempPassword(length = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
