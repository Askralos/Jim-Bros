import { X, Copy } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";

export function cleanExercises(exercises) {
  return exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => ({ name: ex.name.trim(), sets: ex.sets.filter((s) => s.reps) }))
    .filter((ex) => ex.sets.length);
}

export function ExercisesEditor({ exercises, onChange, exerciseList }) {
  const updateEx = (i, patch) => {
    const next = [...exercises];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const addExercise = () => onChange([...exercises, { name: "", sets: [{ reps: "", weight: "", bodyweight: false }] }]);
  const removeExercise = (i) => onChange(exercises.filter((_, idx) => idx !== i));
  const addSet = (i) => {
    const next = [...exercises];
    const last = next[i].sets[next[i].sets.length - 1];
    next[i].sets.push(last ? { ...last } : { reps: "", weight: "", bodyweight: false });
    onChange(next);
  };
  const duplicateSet = (i, j) => {
    const next = [...exercises];
    next[i].sets.splice(j + 1, 0, { ...next[i].sets[j] });
    onChange(next);
  };
  const updateSet = (i, j, field, val) => {
    const next = [...exercises];
    next[i].sets[j] = { ...next[i].sets[j], [field]: val };
    onChange(next);
  };
  const removeSet = (i, j) => {
    const next = [...exercises];
    next[i].sets = next[i].sets.filter((_, idx) => idx !== j);
    onChange(next);
  };

  return (
    <div>
      <datalist id="exo-options">
        {exerciseList.map((e) => <option key={e.id} value={e.name} />)}
      </datalist>
      {exercises.map((ex, i) => (
        <div key={i} style={styles.exCard}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              placeholder="Exercice (recherche...)"
              list="exo-options"
              value={ex.name}
              onChange={(e) => updateEx(i, { name: e.target.value })}
            />
            {exercises.length > 1 && <button style={styles.iconBtn} onClick={() => removeExercise(i)}><X size={15} /></button>}
          </div>
          {ex.sets.map((s, j) => (
            <div key={j} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: COLORS.muted, width: 14, flexShrink: 0 }}>{j + 1}</span>
              <input style={{ ...styles.setInput, minWidth: 56, flex: "1 1 56px" }} placeholder="Reps" type="number" value={s.reps} onChange={(e) => updateSet(i, j, "reps", e.target.value)} />
              {!s.bodyweight && <input style={{ ...styles.setInput, minWidth: 56, flex: "1 1 56px" }} placeholder="Kg" type="number" value={s.weight} onChange={(e) => updateSet(i, j, "weight", e.target.value)} />}
              <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: COLORS.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
                <input type="checkbox" checked={!!s.bodyweight} onChange={(e) => updateSet(i, j, "bodyweight", e.target.checked)} />
                PDC
              </label>
              <div style={{ display: "flex", gap: 2, flexShrink: 0, marginLeft: "auto" }}>
                <button style={styles.iconBtn} onClick={() => duplicateSet(i, j)} aria-label="Dupliquer cette série"><Copy size={13} /></button>
                {ex.sets.length > 1 && <button style={styles.iconBtn} onClick={() => removeSet(i, j)}><X size={13} /></button>}
              </div>
            </div>
          ))}
          <button style={styles.linkBtn} onClick={() => addSet(i)}>+ série</button>
        </div>
      ))}
      <button style={styles.secondaryBtn} onClick={addExercise}>+ Ajouter un exercice</button>
    </div>
  );
}
