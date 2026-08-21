import { useState, useRef } from "react";
import { X, Pencil, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { ExercisePicker } from "./ExercisePicker";

const emptyPresetExercise = () => ({ name: "", setCount: 3 });

function PresetRow({ preset, ownerLabel, owned, expanded, onToggle, onEdit, onDelete, onSelect }) {
  return (
    <div style={styles.friendRow}>
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preset.name}</span>
          <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0 }}>{ownerLabel}</span>
        </div>
        <span style={{ fontSize: 11, color: COLORS.muted }}>{preset.exercises.length} exercice{preset.exercises.length > 1 ? "s" : ""}</span>

        {expanded && (
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {preset.exercises.length === 0 && <li style={{ fontSize: 12, color: COLORS.muted }}>Vide</li>}
            {preset.exercises.map((e, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: COLORS.chalk, background: COLORS.surface2, borderRadius: 7, padding: "6px 8px" }}>
                <span>{e.name}</span>
                <span style={{ color: COLORS.muted }}>{e.setCount} série{e.setCount > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        )}

        {expanded && onSelect && (
          <button
            style={{ ...styles.primaryBtn, marginTop: 10 }}
            onClick={(e) => { e.stopPropagation(); onSelect(preset); }}
          >
            Utiliser ce preset
          </button>
        )}
      </div>

      <button style={styles.iconBtn} onClick={onToggle} aria-label={expanded ? "Réduire" : "Détails"}>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {owned && (
        <div style={{ display: "flex", gap: 2 }}>
          <button style={styles.iconBtn} onClick={(e) => { e.stopPropagation(); onEdit(preset); }} aria-label="Modifier"><Pencil size={15} /></button>
          <button style={styles.iconBtn} onClick={(e) => { e.stopPropagation(); onDelete(preset); }} aria-label="Supprimer"><Trash2 size={15} color={COLORS.flame} /></button>
        </div>
      )}
    </div>
  );
}

// Sous-onglet "Presets" de l'onglet Exercices : squelettes de séance réutilisables
// (liste d'exercices + nombre de séries, sans reps/poids) proposés au bouton "+".
// `profiles` sert à afficher le nom du créateur de chaque preset.
// `onSelect`, si fourni, transforme la liste en sélecteur (utilisé aussi dans la
// modale "Nouvelle séance > Depuis un preset", même composant que cet onglet).
export function PresetsEditor({ exerciseList, currentUserId, profiles = {}, presets, onCreate, onUpdate, onDelete, onSelect }) {
  const [editing, setEditing] = useState(null); // null = fermé, "new" = création, sinon id du preset
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState([emptyPresetExercise()]);
  const [pickerFor, setPickerFor] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartY = useRef(0);

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

  // Réordonne les exercices en glissant une carte (poignée) sur une autre : on
  // évite ainsi de devoir supprimer puis recréer les exercices suivants juste
  // pour corriger l'ordre.
  const startDrag = (i, e) => {
    dragStartY.current = e.clientY;
    setDragIndex(i);
    setDragOffsetY(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e) => {
    if (dragIndex === null) return;
    setDragOffsetY(e.clientY - dragStartY.current);
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-ex-row]");
    if (!el) return;
    const target = Number(el.dataset.exRow);
    if (target !== dragIndex) {
      setExercises((xs) => {
        const arr = [...xs];
        const [item] = arr.splice(dragIndex, 1);
        arr.splice(target, 0, item);
        return arr;
      });
      setDragIndex(target);
      dragStartY.current = e.clientY;
      setDragOffsetY(0);
    }
  };
  const endDrag = () => { setDragIndex(null); setDragOffsetY(0); };

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

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));
  const ownerLabel = (preset) => (preset.creatorId === currentUserId ? "Toi" : profiles[preset.creatorId]?.display_name || "?");

  if (editing !== null) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>{editing === "new" ? "Nouveau preset" : "Modifier le preset"}</span>
          <button style={styles.iconBtn} onClick={close}><X size={16} /></button>
        </div>
        <input style={styles.input} placeholder="Nom du preset (ex: Push day)" value={name} onChange={(e) => setName(e.target.value)} />

        {exercises.map((ex, i) => (
          <div
            key={i}
            data-ex-row={i}
            style={{
              ...styles.exCard,
              ...(dragIndex === i
                ? { position: "relative", zIndex: 2, boxShadow: "0 6px 16px rgba(0,0,0,0.4)", transform: `translateY(${dragOffsetY}px)` }
                : {}),
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              {exercises.length > 1 && (
                <button
                  style={{ ...styles.iconBtn, padding: "4px 2px", cursor: dragIndex === i ? "grabbing" : "grab", touchAction: "none" }}
                  onPointerDown={(e) => startDrag(i, e)}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  aria-label="Réordonner"
                >
                  <GripVertical size={16} color={COLORS.muted} />
                </button>
              )}
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

  const myPresets = presets.filter((p) => p.creatorId === currentUserId);
  const otherPresets = presets.filter((p) => p.creatorId !== currentUserId);

  const renderGroup = (label, list) => (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ ...styles.sectionTitle, margin: "0 0 8px" }}>{label} ({list.length})</h3>
      {list.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucun preset ici pour l'instant.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((p) => (
          <PresetRow
            key={p.id}
            preset={p}
            ownerLabel={ownerLabel(p)}
            owned={p.creatorId === currentUserId}
            expanded={expandedId === p.id}
            onToggle={() => toggle(p.id)}
            onEdit={openEdit}
            onDelete={remove}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={styles.sectionTitle}>Presets de séance ({presets.length})</h2>
      <button style={styles.secondaryBtn} onClick={openCreate}>+ Créer un preset</button>

      {renderGroup("Mes presets", myPresets)}
      {renderGroup("Presets de mes potes", otherPresets)}
    </div>
  );
}
