// Dernier état connu des données de l'app, gardé dans le navigateur : à l'ouverture,
// l'écran s'affiche tout de suite avec ces données pendant que les vraies sont
// rechargées en arrière-plan (au lieu d'un écran vide le temps des requêtes).
// La clé est versionnée : la changer si la forme des données évolue.
const KEY = "jimbros.cache.v1";

// { userId, data } ou null (rien en cache, stockage indisponible, cache illisible).
export function loadCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY));
    return cached?.userId && cached.data ? cached : null;
  } catch {
    return null;
  }
}

export function saveCache(userId, data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, data }));
  } catch {
    // Quota dépassé ou navigation privée : l'app marche sans cache.
  }
}

export function clearCache() {
  try { localStorage.removeItem(KEY); } catch { /* rien à nettoyer */ }
}
