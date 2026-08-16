import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // On log plutôt que throw pour ne pas casser le build ; l'app affichera
  // un écran d'erreur clair côté UI si les clés manquent réellement.
  console.error(
    "Variables Supabase manquantes : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies (voir .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
