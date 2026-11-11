import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Ajoute <link rel="preconnect"> vers Supabase : le navigateur ouvre la connexion
// pendant que le JS se charge, ce qui gagne un aller-retour sur la 1re requête.
// (Fait ici plutôt qu'avec %VITE_SUPABASE_URL% dans index.html, qui casse le build
// quand la variable n'est pas définie.)
function preconnectSupabase(url) {
  return {
    name: "preconnect-supabase",
    transformIndexHtml: () =>
      url ? [{ tag: "link", attrs: { rel: "preconnect", href: new URL(url).origin, crossorigin: "" }, injectTo: "head-prepend" }] : [],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), preconnectSupabase(env.VITE_SUPABASE_URL)],
    build: {
      rollupOptions: {
        output: {
          // Librairies dans leurs propres fichiers : elles changent rarement, donc le
          // navigateur les garde en cache d'un déploiement à l'autre et ne retélécharge
          // que le code de l'app (petit) après une mise à jour.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/node_modules\/(\.pnpm\/)?(react|react-dom|scheduler)[@/]/.test(id)) return "react";
            if (id.includes("@supabase")) return "supabase";
          },
        },
      },
    },
  };
});
