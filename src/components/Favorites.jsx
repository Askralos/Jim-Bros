import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { COLORS } from "../lib/constants";
import { updateProfile } from "../lib/api/profiles";

// Exercices favoris du user connecté (profiles.favorite_exercise_ids), partagés
// par tous les sélecteurs d'exercices sans avoir à les faire transiter en props.
const FavoritesContext = createContext({ ids: new Set(), toggle: () => {} });

export function FavoritesProvider({ userId, profile, children }) {
  const saved = profile?.favorite_exercise_ids;
  const [ids, setIds] = useState(() => new Set(saved || []));
  // Resynchronise quand le profil est rechargé (autre appareil, temps réel).
  useEffect(() => { setIds(new Set(saved || [])); }, [saved]);

  const value = useMemo(() => ({
    ids,
    toggle: (exerciseId) => {
      const next = new Set(ids);
      if (next.has(exerciseId)) next.delete(exerciseId); else next.add(exerciseId);
      setIds(next); // optimiste : l'étoile réagit tout de suite
      updateProfile(userId, { favorite_exercise_ids: [...next] }).catch(() => setIds(ids));
    },
  }), [ids, userId]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);

export function FavoriteStar({ exerciseId, size = 18 }) {
  const { ids, toggle } = useFavorites();
  const on = ids.has(exerciseId);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); toggle(exerciseId); }}
      aria-label={on ? "Retirer des favoris" : "Ajouter aux favoris"}
      style={{ background: "none", border: "none", padding: 6, cursor: "pointer", display: "flex", flexShrink: 0 }}
    >
      <Star size={size} color={on ? "#FFC53D" : COLORS.muted} fill={on ? "#FFC53D" : "none"} />
    </button>
  );
}
