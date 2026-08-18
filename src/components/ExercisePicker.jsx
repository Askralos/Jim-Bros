import { useState } from "react";
import { Search, Dumbbell, X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, EXERCISE_TAGS, tagLabel } from "../lib/constants";
import { norm } from "../lib/utils";

// Liste filtrable (recherche + tags) réutilisée par ExercisePicker et ExercisesLibrary.
export function useExerciseFilter(exerciseList) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState([]);

  const toggleTag = (key) => setActiveTags((t) => (t.includes(key) ? t.filter((x) => x !== key) : [...t, key]));

  const filtered = [...exerciseList]
    .filter((e) => norm(e.name).includes(norm(query)))
    .filter((e) => !activeTags.length || (e.tags || []).some((t) => activeTags.includes(t)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { query, setQuery, activeTags, toggleTag, filtered };
}

export function ExerciseFilterBar({ query, setQuery, activeTags, toggleTag }) {
  return (
    <>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input style={{ ...styles.input, paddingLeft: 34, marginBottom: 0 }} placeholder="Rechercher un exercice..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Search size={15} color={COLORS.muted} style={{ position: "absolute", left: 11, top: 12 }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {EXERCISE_TAGS.map((t) => (
          <button key={t.key} onClick={() => toggleTag(t.key)} style={{ ...styles.tabPill, ...(activeTags.includes(t.key) ? styles.tabPillActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function ExerciseRowThumb({ exercise, onClick, size = 38 }) {
  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      {exercise.photo_url ? (
        <img src={exercise.photo_url} alt="" style={{ width: size, height: size, borderRadius: 8, objectFit: "cover" }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: 8, background: COLORS.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Dumbbell size={size * 0.42} color={COLORS.muted} />
        </div>
      )}
    </div>
  );
}

// Modale de sélection d'exercice : recherche + filtre par tag + liste, remplace la saisie
// libre (datalist) pour garantir un exercice réellement répertorié.
export function ExercisePicker({ exerciseList, onSelect, onClose }) {
  const { query, setQuery, activeTags, toggleTag, filtered } = useExerciseFilter(exerciseList);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>Choisir un exercice</span>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <ExerciseFilterBar query={query} setQuery={setQuery} activeTags={activeTags} toggleTag={toggleTag} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucun exercice ne correspond.</p>}
          {filtered.map((ex) => (
            <div key={ex.id} style={{ ...styles.friendRow, cursor: "pointer" }} onClick={() => onSelect(ex)}>
              <ExerciseRowThumb exercise={ex} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, display: "block" }}>{ex.name}</span>
                {ex.tags?.length > 0 && (
                  <span style={{ fontSize: 11, color: COLORS.muted }}>{ex.tags.map(tagLabel).join(" · ")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
