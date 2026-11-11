// Brouillons de saisie gardés dans le navigateur : si le téléphone recharge la page
// en pleine séance (iOS le fait souvent quand l'app passe en arrière-plan), rien
// n'est perdu. Un brouillon est lié à un compte et expire au bout de DRAFT_TTL_MS.
const PREFIX = "jimbros.draft.";
const DRAFT_TTL_MS = 3 * 24 * 3600 * 1000;

// Clés : la nouvelle séance en cours, ou mes stats sur une séance existante.
export const newSessionDraftKey = (userId) => `new.${userId}`;
export const entryDraftKey = (userId, sessionId) => `entry.${userId}.${sessionId}`;

export function loadDraft(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFIX + key));
    if (!raw?.data || Date.now() - raw.savedAt > DRAFT_TTL_MS) return null;
    return raw.data;
  } catch {
    return null;
  }
}

export function saveDraft(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Quota dépassé ou stockage bloqué : la saisie continue, sans filet.
  }
}

export function clearDraft(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* rien à nettoyer */ }
}
