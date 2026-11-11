import { lazy } from "react";

const RELOAD_KEY = "jimbros.chunkReloadAt";

// Écran chargé à la demande. Après un déploiement, les anciens fichiers JS n'existent
// plus : une app restée ouverte échouerait à charger l'écran (page blanche). Dans ce
// cas on recharge la page une fois pour récupérer la nouvelle version.
export function lazyScreen(load, exportName) {
  return lazy(() =>
    load()
      .then((module) => ({ default: module[exportName] }))
      .catch((error) => {
        let lastReload = 0;
        try { lastReload = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* stockage indisponible */ }
        // Déjà rechargé il y a un instant : vrai problème (hors ligne...), on laisse remonter l'erreur.
        if (Date.now() - lastReload < 15000) throw error;
        try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* idem */ }
        window.location.reload();
        return new Promise(() => {}); // garde l'écran d'attente jusqu'au rechargement
      })
  );
}
