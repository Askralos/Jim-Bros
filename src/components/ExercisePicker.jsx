import { useState } from "react";
import { Search, Dumbbell, X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, EXERCISE_TAGS, tagLabel, tagColor } from "../lib/constants";
import { norm } from "../lib/utils";

// Liste filtrable (recherche + un seul tag à la fois) réutilisée par ExercisePicker et
// ExercisesLibrary.
export function useExerciseFilter(exerciseList) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);

  const toggleTag = (key) => setActiveTag((t) => (t === key ? null : key));

  const filtered = [...exerciseList]
    .filter((e) => norm(e.name).includes(norm(query)))
    .filter((e) => !activeTag || (e.tags || []).includes(activeTag))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { query, setQuery, activeTag, toggleTag, filtered };
}

export function ExerciseFilterBar({ query, setQuery, activeTag, toggleTag }) {
  return (
    <>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input style={{ ...styles.input, paddingLeft: 34, marginBottom: 0 }} placeholder="Rechercher un exercice..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Search size={15} color={COLORS.muted} style={{ position: "absolute", left: 11, top: 12 }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {EXERCISE_TAGS.map((t) => (
          <button key={t.key} onClick={() => toggleTag(t.key)} style={{ ...styles.tabPill, ...(activeTag === t.key ? styles.tabPillActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function TagBadges({ tags, size = "sm" }) {
  if (!tags?.length) return null;
  const fontSize = size === "sm" ? 10 : 11;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {tags.map((t) => {
        const c = tagColor(t);
        return (
          <span
            key={t}
            style={{ background: `${c}22`, color: c, border: `1px solid ${c}55`, borderRadius: 6, padding: "1px 7px", fontSize, fontWeight: 600 }}
          >
            {tagLabel(t)}
          </span>
        );
      })}
    </div>
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
// En mode multi (superset), l'ordre des clics donne l'ordre d'enchaînement.
export function ExercisePicker({ exerciseList, onSelect, onClose, multi = false, onConfirmMulti }) {
  const { query, setQuery, activeTag, toggleTag, filtered } = useExerciseFilter(exerciseList);
  const [selected, setSelected] = useState([]);

  const toggleSelected = (ex) => setSelected((s) => (s.includes(ex.id) ? s.filter((id) => id !== ex.id) : [...s, ex.id]));

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>{multi ? "Exercices du superset" : "Choisir un exercice"}</span>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        {multi && <p style={{ fontSize: 12, color: COLORS.muted, marginTop: -4, marginBottom: 10 }}>Sélectionne au moins 2 exercices, dans l'ordre où tu les enchaînes.</p>}
        <ExerciseFilterBar query={query} setQuery={setQuery} activeTag={activeTag} toggleTag={toggleTag} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucun exercice ne correspond.</p>}
          {filtered.map((ex) => {
            const order = selected.indexOf(ex.id);
            const isSelected = order !== -1;
            return (
              <div
                key={ex.id}
                style={{ ...styles.friendRow, cursor: "pointer", ...(isSelected ? { borderColor: COLORS.lime } : {}) }}
                onClick={() => (multi ? toggleSelected(ex) : onSelect(ex))}
              >
                <ExerciseRowThumb exercise={ex} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 14, display: "block" }}>{ex.name}</span>
                  <TagBadges tags={ex.tags} />
                </div>
                {isSelected && (
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.lime, color: "#111214", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {order + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {multi && (
          <div style={{ position: "sticky", bottom: -18, background: COLORS.surface, paddingTop: 10, paddingBottom: 18, marginTop: 10 }}>
            <button
              style={{ ...styles.primaryBtn, ...(selected.length < 2 ? { opacity: 0.4, cursor: "default" } : {}) }}
              disabled={selected.length < 2}
              onClick={() => onConfirmMulti(selected.map((id) => exerciseList.find((e) => e.id === id)))}
            >
              Créer le superset{selected.length ? ` (${selected.length})` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
