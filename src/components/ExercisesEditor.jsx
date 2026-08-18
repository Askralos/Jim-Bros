import { useState } from "react";
import { X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, WEIGHT_TYPES } from "../lib/constants";
import { ExercisePicker, ExerciseRowThumb } from "./ExercisePicker";

export const EMPTY_SET = { reps: "", weight: "", weightType: "external", mode: "reps", seconds: "" };
export const emptyExercise = () => ({ name: "", sets: [{ ...EMPTY_SET }] });

export function cleanExercises(exercises) {
  return exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => ({
      name: ex.name.trim(),
      sets: ex.sets.filter((s) => (s.mode === "time" ? s.seconds : s.reps)),
    }))
    .filter((ex) => ex.sets.length);
}

export function ExercisesEditor({ exercises, onChange, exerciseList }) {
  const [pickerFor, setPickerFor] = useState(null); // index de la carte en cours de sélection

  const updateEx = (i, patch) => {
    const next = [...exercises];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const addExercise = () => onChange([...exercises, { name: "", sets: [{ ...EMPTY_SET }] }]);
  const removeExercise = (i) => onChange(exercises.filter((_, idx) => idx !== i));
  const addSet = (i) => {
    const next = [...exercises];
    const last = next[i].sets[next[i].sets.length - 1];
    next[i].sets = [...next[i].sets, last ? { ...last } : { ...EMPTY_SET }];
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
  const setMode = (i, mode) => {
    const next = [...exercises];
    next[i].sets = next[i].sets.map((s) => ({ ...s, mode }));
    onChange(next);
  };

  return (
    <div>
      {exercises.map((ex, i) => {
        const mode = ex.sets[0]?.mode || "reps";
        return (
          <div key={i} style={styles.exCard}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              {ex.name ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <ExerciseRowThumb exercise={exerciseList.find((e) => e.name === ex.name) || {}} size={30} />
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</span>
                  <button style={styles.linkBtn} onClick={() => setPickerFor(i)}>Changer</button>
                </div>
              ) : (
                <button style={{ ...styles.secondaryBtn, flex: 1, margin: 0 }} onClick={() => setPickerFor(i)}>Choisir un exercice</button>
              )}
              {exercises.length > 1 && <button style={styles.iconBtn} onClick={() => removeExercise(i)}><X size={15} /></button>}
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => setMode(i, "reps")} style={{ ...styles.tabPill, ...(mode === "reps" ? styles.tabPillActive : {}) }}>Reps</button>
              <button type="button" onClick={() => setMode(i, "time")} style={{ ...styles.tabPill, ...(mode === "time" ? styles.tabPillActive : {}) }}>Temps (sec)</button>
            </div>

            {ex.sets.map((s, j) => (
              <div key={j} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: COLORS.muted, width: 14, flexShrink: 0 }}>{j + 1}</span>
                {mode === "time" ? (
                  <input style={{ ...styles.setInput, minWidth: 56, flex: "1 1 56px" }} placeholder="Sec" type="number" value={s.seconds} onChange={(e) => updateSet(i, j, "seconds", e.target.value)} />
                ) : (
                  <input style={{ ...styles.setInput, minWidth: 56, flex: "1 1 56px" }} placeholder="Reps" type="number" value={s.reps} onChange={(e) => updateSet(i, j, "reps", e.target.value)} />
                )}
                {s.weightType !== "bodyweight" && (
                  <input
                    style={{ ...styles.setInput, minWidth: 56, flex: "1 1 56px" }}
                    placeholder={s.weightType === "assisted" ? "- Kg" : s.weightType === "bodyweight_plus" ? "+ Kg" : "Kg"}
                    type="number"
                    value={s.weight}
                    onChange={(e) => updateSet(i, j, "weight", e.target.value)}
                  />
                )}
                <select style={{ ...styles.setInput, flex: "1 1 128px", minWidth: 118 }} value={s.weightType} onChange={(e) => updateSet(i, j, "weightType", e.target.value)}>
                  {WEIGHT_TYPES.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
                </select>
                {ex.sets.length > 1 && (
                  <button style={{ ...styles.iconBtn, flexShrink: 0, marginLeft: "auto" }} onClick={() => removeSet(i, j)}><X size={13} /></button>
                )}
              </div>
            ))}
            <button style={styles.linkBtn} onClick={() => addSet(i)}>+ série</button>
          </div>
        );
      })}
      <button style={styles.secondaryBtn} onClick={addExercise}>+ Ajouter un exercice</button>

      {pickerFor !== null && (
        <ExercisePicker
          exerciseList={exerciseList}
          onClose={() => setPickerFor(null)}
          onSelect={(ex) => { updateEx(pickerFor, { name: ex.name }); setPickerFor(null); }}
        />
      )}
    </div>
  );
}
