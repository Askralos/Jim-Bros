import { useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { ExercisePicker } from "./ExercisePicker";

const emptyPresetExercise = () => ({ name: "", setCount: 3 });

// Sous-onglet "Presets" de l'onglet Exercices : squelettes de séance réutilisables
// (liste d'exercices + nombre de séries, sans reps/poids) proposés au bouton "+".
export function PresetsEditor({ exerciseList, currentUserId, presets, onCreate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null); // null = fermé, "new" = création, sinon id du preset
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState([emptyPresetExercise()]);
  const [pickerFor, setPickerFor] = useState(null);

  const openCreate = () => { setEditing("new"); setName(""); setExercises([emptyPresetExercise()]); };
  const openEdit = (preset) => {
    setEditing(preset.id);
    setName(preset.name);
    setExercises(preset.exercises.length ? preset.exercises.map((e) => ({ ...e })) : [emptyPresetExercise()]);
  };
  const close = () => setEditing(null);

  const updateExAt = (i, patch) => setExercises((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeExAt = (i) => setExercises((xs) => xs.filter((_, idx) => idx !== i));
  const addEx = () => setExercises((xs) => [...xs, emptyPresetExercise()]);

  const valid = !!name.trim() && exercises.some((e) => e.name);

  const submit = async () => {
    if (!valid) return;
    const clean = exercises.filter((e) => e.name).map((e) => ({ name: e.name, setCount: Math.max(1, Number(e.setCount) || 1) }));
    if (editing === "new") await onCreate(name.trim(), clean);
    else await onUpdate(editing, name.trim(), clean);
    close();
  };

  const remove = async (preset) => {
    if (!confirm(`Supprimer le preset "${preset.name}" ?`)) return;
    await onDelete(preset.id);
  };

  if (editing !== null) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>{editing === "new" ? "Nouveau preset" : "Modifier le preset"}</span>
          <button style={styles.iconBtn} onClick={close}><X size={16} /></button>
        </div>
        <input style={styles.input} placeholder="Nom du preset (ex: Push day)" value={name} onChange={(e) => setName(e.target.value)} />

        {exercises.map((ex, i) => (
          <div key={i} style={styles.exCard}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              {ex.name ? (
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</span>
              ) : (
                <button style={{ ...styles.secondaryBtn, flex: 1, margin: 0 }} onClick={() => setPickerFor(i)}>Choisir un exercice</button>
              )}
              {ex.name && <button style={styles.linkBtn} onClick={() => setPickerFor(i)}>Changer</button>}
              {exercises.length > 1 && <button style={styles.iconBtn} onClick={() => removeExAt(i)}><X size={15} /></button>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.muted }}>Nombre de séries</span>
              <button style={styles.iconBtn} onClick={() => updateExAt(i, { setCount: Math.max(1, ex.setCount - 1) })}>−</button>
              <span style={{ fontSize: 14, fontWeight: 700, minWidth: 16, textAlign: "center" }}>{ex.setCount}</span>
              <button style={styles.iconBtn} onClick={() => updateExAt(i, { setCount: ex.setCount + 1 })}>+</button>
            </div>
          </div>
        ))}
        <button style={styles.secondaryBtn} onClick={addEx}>+ Ajouter un exercice</button>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={close}>Annuler</button>
          <button style={{ ...styles.primaryBtn, flex: 1 }} disabled={!valid} onClick={submit}>Enregistrer</button>
        </div>

        {pickerFor !== null && (
          <ExercisePicker
            exerciseList={exerciseList}
            onClose={() => setPickerFor(null)}
            onSelect={(ex) => { updateExAt(pickerFor, { name: ex.name }); setPickerFor(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Presets de séance ({presets.length})</h2>
      <button style={styles.secondaryBtn} onClick={openCreate}>+ Créer un preset</button>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {presets.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucun preset pour l'instant.</p>}
        {presets.map((p) => {
          const owned = p.creatorId === currentUserId;
          return (
            <div key={p.id} style={styles.friendRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, display: "block" }}>{p.name}</span>
                <span style={{ fontSize: 11, color: COLORS.muted }}>{p.exercises.map((e) => e.name).join(", ") || "Vide"}</span>
              </div>
              {owned && (
                <div style={{ display: "flex", gap: 2 }}>
                  <button style={styles.iconBtn} onClick={() => openEdit(p)} aria-label="Modifier"><Pencil size={15} /></button>
                  <button style={styles.iconBtn} onClick={() => remove(p)} aria-label="Supprimer"><Trash2 size={15} color={COLORS.flame} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
