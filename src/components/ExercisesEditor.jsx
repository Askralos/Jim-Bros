import { useState } from "react";
import { X, Clock, Target, Link2 } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, WEIGHT_TYPES } from "../lib/constants";
import { groupSupersets, normalizeSupersets } from "../lib/utils";
import { ExercisePicker, ExerciseRowThumb } from "./ExercisePicker";

export const EMPTY_SET = { reps: "", weight: "", weightType: "external", mode: "reps", seconds: "", restSeconds: "", targetMin: "", targetMax: "" };
export const emptyExercise = () => ({ name: "", supersetGroup: null, sets: [{ ...EMPTY_SET }] });

export function cleanExercises(exercises) {
  return normalizeSupersets(
    exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        supersetGroup: ex.supersetGroup ?? null,
        sets: ex.sets.filter((s) => (s.mode === "time" ? s.seconds : s.reps)),
      }))
      .filter((ex) => ex.sets.length)
  );
}

const isBlankExercise = (ex) => !ex.name && ex.sets.every((s) => !s.reps && !s.seconds && !s.weight);

export function ExercisesEditor({ exercises, onChange, exerciseList }) {
  const [pickerFor, setPickerFor] = useState(null); // index de la carte en cours de sélection, ou "superset"
  // "i-j" révélés manuellement (les champs remplis via duplication de série restent
  // visibles sans passer par ici, voir showRest/showTarget ci-dessous).
  const [revealRest, setRevealRest] = useState(() => new Set());
  const [revealTarget, setRevealTarget] = useState(() => new Set());

  const updateEx = (i, patch) => {
    const next = [...exercises];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const addExercise = () => onChange([...exercises, emptyExercise()]);
  const addSuperset = (picked) => {
    const group = Date.now();
    const kept = exercises.filter((ex) => !isBlankExercise(ex));
    onChange([...kept, ...picked.map((e) => ({ name: e.name, supersetGroup: group, sets: [{ ...EMPTY_SET }] }))]);
  };
  // Un superset réduit à un seul exercice redevient un exercice classique.
  const removeExercise = (i) => onChange(normalizeSupersets(exercises.filter((_, idx) => idx !== i)));
  const ungroup = (group) => onChange(exercises.map((ex) => (ex.supersetGroup === group ? { ...ex, supersetGroup: null } : ex)));
  const duplicateLastSet = (ex) => {
    const last = ex.sets[ex.sets.length - 1];
    return { ...ex, sets: [...ex.sets, last ? { ...last } : { ...EMPTY_SET }] };
  };
  const addSet = (i) => {
    const next = [...exercises];
    next[i] = duplicateLastSet(next[i]);
    onChange(next);
  };
  // "+ tour" : une série de plus pour chaque exercice du superset.
  const addRound = (group) => onChange(exercises.map((ex) => (ex.supersetGroup === group ? duplicateLastSet(ex) : ex)));
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

  const toggleReveal = (setter, key) => setter((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const clearRest = (i, j, key) => { updateSet(i, j, "restSeconds", ""); toggleReveal(setRevealRest, key); };
  const clearTarget = (i, j, key) => {
    const next = [...exercises];
    next[i].sets[j] = { ...next[i].sets[j], targetMin: "", targetMax: "" };
    onChange(next);
    toggleReveal(setRevealTarget, key);
  };

  const renderExercise = (ex, i, inSuperset) => {
    const mode = ex.sets[0]?.mode || "reps";
    return (
      <div key={i} style={{ ...styles.exCard, ...(inSuperset ? { marginBottom: 8 } : {}) }}>
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

        {ex.sets.map((s, j) => {
          const key = `${i}-${j}`;
          const showRest = revealRest.has(key) || s.restSeconds !== "";
          const showTarget = revealTarget.has(key) || s.targetMin !== "" || s.targetMax !== "";
          return (
            <div key={j} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4, marginLeft: 20 }}>
                {showRest ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} color={COLORS.muted} />
                    <input
                      style={{ ...styles.setInput, width: 60, padding: "6px 8px" }}
                      placeholder="Repos (s)" type="number" value={s.restSeconds}
                      onChange={(e) => updateSet(i, j, "restSeconds", e.target.value)}
                    />
                    <button style={styles.iconBtn} onClick={() => clearRest(i, j, key)}><X size={12} /></button>
                  </div>
                ) : (
                  <button style={styles.linkBtn} onClick={() => toggleReveal(setRevealRest, key)}>+ Temps de repos</button>
                )}

                {showTarget ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Target size={12} color={COLORS.muted} />
                    <input
                      style={{ ...styles.setInput, width: 44, padding: "6px 8px" }}
                      placeholder="Min" type="number" value={s.targetMin}
                      onChange={(e) => updateSet(i, j, "targetMin", e.target.value)}
                    />
                    <span style={{ fontSize: 11, color: COLORS.muted }}>-</span>
                    <input
                      style={{ ...styles.setInput, width: 44, padding: "6px 8px" }}
                      placeholder="Max" type="number" value={s.targetMax}
                      onChange={(e) => updateSet(i, j, "targetMax", e.target.value)}
                    />
                    <span style={{ fontSize: 10, color: COLORS.muted }}>{mode === "time" ? "sec" : "reps"}</span>
                    <button style={styles.iconBtn} onClick={() => clearTarget(i, j, key)}><X size={12} /></button>
                  </div>
                ) : (
                  <button style={styles.linkBtn} onClick={() => toggleReveal(setRevealTarget, key)}>
                    + Objectif de {mode === "time" ? "temps" : "reps"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button style={styles.linkBtn} onClick={() => addSet(i)}>+ série</button>
      </div>
    );
  };

  return (
    <div>
      {groupSupersets(exercises).map((block) => {
        if (block.group == null || block.items.length < 2) return renderExercise(block.items[0].ex, block.items[0].index, false);
        return (
          <div
            key={`superset-${block.items[0].index}`}
            style={{ border: `1px solid ${COLORS.lime}55`, background: "rgba(201,245,66,0.04)", borderRadius: 12, padding: "10px 8px 2px", marginBottom: 10 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingLeft: 2 }}>
              <Link2 size={14} color={COLORS.lime} />
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.lime, flex: 1 }}>Superset · {block.items.length} exercices</span>
              <button style={styles.linkBtn} onClick={() => addRound(block.group)}>+ tour</button>
              <button style={{ ...styles.linkBtn, color: COLORS.muted, marginLeft: 8 }} onClick={() => ungroup(block.group)}>Dissocier</button>
            </div>
            {block.items.map(({ ex, index }) => renderExercise(ex, index, true))}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={styles.secondaryBtn} onClick={addExercise}>+ Exercice</button>
        <button style={styles.secondaryBtn} onClick={() => setPickerFor("superset")}><Link2 size={14} style={{ marginRight: 6 }} />Superset</button>
      </div>

      {pickerFor === "superset" && (
        <ExercisePicker
          multi
          exerciseList={exerciseList}
          onClose={() => setPickerFor(null)}
          onConfirmMulti={(picked) => { addSuperset(picked); setPickerFor(null); }}
        />
      )}
      {pickerFor !== null && pickerFor !== "superset" && (
        <ExercisePicker
          exerciseList={exerciseList}
          onClose={() => setPickerFor(null)}
          onSelect={(ex) => { updateEx(pickerFor, { name: ex.name }); setPickerFor(null); }}
        />
      )}
    </div>
  );
}
