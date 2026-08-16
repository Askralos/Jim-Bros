import { supabase } from "../supabaseClient";

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
