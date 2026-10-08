import { useState } from "react";
import { X, Pencil, Trash2, ChevronDown, ChevronUp, Clock, Target, Link2, Copy, Check } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { groupSupersets, normalizeSupersets, chainExercises } from "../lib/utils";
import { ExercisePicker } from "./ExercisePicker";
import { Avatar } from "./Avatar";

const emptyPresetExercise = () => ({ name: "", setCount: 3, mode: "reps", restSeconds: "", targetMin: "", targetMax: "", supersetGroup: null });

const supersetBoxStyle = { border: `1px solid ${COLORS.lime}55`, background: "rgba(201,245,66,0.04)", borderRadius: 12, padding: "10px 8px 2px", marginBottom: 10 };

function PresetPreview({ preset, owned, copied, onEdit, onDelete, onSelect, onCopy }) {
  return (
    <div style={{ padding: "2px 10px 10px" }}>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {preset.exercises.length === 0 && <li style={{ fontSize: 12, color: COLORS.muted }}>Vide</li>}
        {preset.exercises.map((e, i) => {
          const hasTarget = e.targetMin != null && e.targetMax != null;
          const isTime = e.mode === "time";
          return (
            <li key={i} style={{ fontSize: 12.5, color: COLORS.chalk, background: COLORS.surface2, borderRadius: 7, padding: "6px 8px", ...(e.supersetGroup != null ? { borderLeft: `2px solid ${COLORS.lime}` } : {}) }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{e.name}</span>
                <span style={{ color: COLORS.muted, flexShrink: 0 }}>{e.setCount} série{e.setCount > 1 ? "s" : ""}{isTime ? " (temps)" : ""}</span>
              </div>
              {(hasTarget || e.restSeconds != null) && (
                <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 11, color: COLORS.muted }}>
                  {hasTarget && <span>obj. {e.targetMin}-{e.targetMax}{isTime ? "s" : " reps"}</span>}
                  {e.restSeconds != null && <span>repos {e.restSeconds}s</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {onSelect && (
          <button style={{ ...styles.primaryBtn, flex: 1, margin: 0 }} onClick={() => onSelect(preset)}>Utiliser</button>
        )}
        {!owned && (
          <button style={{ ...styles.secondaryBtn, flex: 1, margin: 0 }} disabled={copied} onClick={() => onCopy(preset)}>
            {copied ? <><Check size={14} style={{ marginRight: 6 }} />Copié dans tes presets</> : <><Copy size={14} style={{ marginRight: 6 }} />Copier</>}
          </button>
        )}
        {owned && (
          <>
            <button style={{ ...styles.secondaryBtn, flex: 1, margin: 0 }} onClick={() => onEdit(preset)}><Pencil size={14} style={{ marginRight: 6 }} />Modifier</button>
            <button style={styles.iconBtn} onClick={() => onDelete(preset)} aria-label="Supprimer"><Trash2 size={15} color={COLORS.flame} /></button>
          </>
        )}
      </div>
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
  const [openPeople, setOpenPeople] = useState(() => new Set([currentUserId]));
  const [copiedIds, setCopiedIds] = useState(() => new Set());
  const [revealRest, setRevealRest] = useState(() => new Set());
  const [revealTarget, setRevealTarget] = useState(() => new Set());

  const openCreate = () => { setEditing("new"); setName(""); setExercises([emptyPresetExercise()]); };
  const openEdit = (preset) => {
    setEditing(preset.id);
    setName(preset.name);
    setExercises(
      preset.exercises.length
        ? preset.exercises.map((e) => ({
            ...e,
            mode: e.mode === "time" ? "time" : "reps",
            restSeconds: e.restSeconds ?? "",
            targetMin: e.targetMin ?? "",
            targetMax: e.targetMax ?? "",
          }))
        : [emptyPresetExercise()]
    );
  };
  const close = () => setEditing(null);

  const updateExAt = (i, patch) => setExercises((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  // Un superset réduit à un seul exercice redevient un exercice classique.
  const removeExAt = (i) => setExercises((xs) => normalizeSupersets(xs.filter((_, idx) => idx !== i)));
  const addEx = () => setExercises((xs) => [...xs, emptyPresetExercise()]);
  const chainAt = (i, picked) =>
    setExercises((xs) => chainExercises(xs, i, picked.map((e) => ({ ...emptyPresetExercise(), name: e.name }))));
  const ungroup = (group) => setExercises((xs) => xs.map((x) => (x.supersetGroup === group ? { ...x, supersetGroup: null } : x)));

  // Réordonne sans supprimer/recréer. Dans un superset, on permute avec le voisin du
  // même superset ; sinon le bloc entier (exercice seul ou superset) passe devant/
  // derrière le bloc voisin, pour ne jamais casser un superset en deux.
  const moveExAt = (i, dir) => setExercises((xs) => {
    const j = i + dir;
    if (j < 0 || j >= xs.length) return xs;
    if (xs[i].supersetGroup != null && xs[i].supersetGroup === xs[j].supersetGroup) {
      const arr = [...xs];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    }
    const blocks = groupSupersets(xs);
    const b = blocks.findIndex((bl) => bl.items.some((it) => it.index === i));
    const c = b + dir;
    if (c < 0 || c >= blocks.length) return xs;
    [blocks[b], blocks[c]] = [blocks[c], blocks[b]];
    return blocks.flatMap((bl) => bl.items.map((it) => it.ex));
  });

  const toggleReveal = (setter, i) => setter((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const clearRest = (i) => { updateExAt(i, { restSeconds: "" }); toggleReveal(setRevealRest, i); };
  const clearTarget = (i) => { updateExAt(i, { targetMin: "", targetMax: "" }); toggleReveal(setRevealTarget, i); };

  const valid = !!name.trim() && exercises.some((e) => e.name);

  const submit = async () => {
    if (!valid) return;
    const clean = exercises
      .filter((e) => e.name)
      .map((e) => ({
        name: e.name, setCount: Math.max(1, Number(e.setCount) || 1), mode: e.mode,
        restSeconds: e.restSeconds, targetMin: e.targetMin, targetMax: e.targetMax,
        supersetGroup: e.supersetGroup ?? null,
      }));
    if (editing === "new") await onCreate(name.trim(), clean);
    else await onUpdate(editing, name.trim(), clean);
    close();
  };

  const remove = async (preset) => {
    if (!confirm(`Supprimer le preset "${preset.name}" ?`)) return;
    await onDelete(preset.id);
  };

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));
  const togglePerson = (id) => setOpenPeople((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Copie le preset d'un pote dans mes presets (suffixe "(copie)" si j'en ai déjà un du même nom).
  const copy = async (preset) => {
    const taken = presets.some((p) => p.creatorId === currentUserId && p.name === preset.name);
    await onCreate(taken ? `${preset.name} (copie)` : preset.name, preset.exercises);
    setCopiedIds((s) => new Set(s).add(preset.id));
  };

  const renderPresetEx = (ex, i, inSuperset = false) => (
    <div key={i} style={{ ...styles.exCard, ...(inSuperset ? { marginBottom: 8 } : {}) }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        {ex.name ? (
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</span>
        ) : (
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            <button style={{ ...styles.secondaryBtn, flex: 1, margin: 0 }} onClick={() => setPickerFor(i)}>Choisir un exercice</button>
            <button style={{ ...styles.secondaryBtn, flex: 1, margin: 0 }} onClick={() => setPickerFor({ chainAt: i })}>
              <Link2 size={14} style={{ marginRight: 6 }} />Superset
            </button>
          </div>
        )}
        {ex.name && <button style={styles.linkBtn} onClick={() => setPickerFor(i)}>Changer</button>}
        {ex.name && !inSuperset && (
          <button style={{ ...styles.linkBtn, display: "inline-flex", alignItems: "center", gap: 3 }} onClick={() => setPickerFor({ chainAt: i })}>
            <Link2 size={12} />Superset
          </button>
        )}
        {exercises.length > 1 && <button style={styles.iconBtn} onClick={() => removeExAt(i)}><X size={15} /></button>}
        {exercises.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <button style={{ ...styles.iconBtn, padding: 1 }} disabled={i === 0} onClick={() => moveExAt(i, -1)} aria-label="Monter">
              <ChevronUp size={15} color={i === 0 ? COLORS.line : COLORS.muted} />
            </button>
            <button style={{ ...styles.iconBtn, padding: 1 }} disabled={i === exercises.length - 1} onClick={() => moveExAt(i, 1)} aria-label="Descendre">
              <ChevronDown size={15} color={i === exercises.length - 1 ? COLORS.line : COLORS.muted} />
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={() => updateExAt(i, { mode: "reps" })} style={{ ...styles.tabPill, ...(ex.mode !== "time" ? styles.tabPillActive : {}) }}>Reps</button>
        <button type="button" onClick={() => updateExAt(i, { mode: "time" })} style={{ ...styles.tabPill, ...(ex.mode === "time" ? styles.tabPillActive : {}) }}>Temps</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>Nombre de séries</span>
        <button style={styles.iconBtn} onClick={() => updateExAt(i, { setCount: Math.max(1, ex.setCount - 1) })}>−</button>
        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 16, textAlign: "center" }}>{ex.setCount}</span>
        <button style={styles.iconBtn} onClick={() => updateExAt(i, { setCount: ex.setCount + 1 })}>+</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
        {revealRest.has(i) || ex.restSeconds !== "" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={12} color={COLORS.muted} />
            <input
              style={{ ...styles.setInput, width: 60, padding: "6px 8px" }}
              placeholder="Repos (s)" type="number" value={ex.restSeconds}
              onChange={(e) => updateExAt(i, { restSeconds: e.target.value })}
            />
            <button style={styles.iconBtn} onClick={() => clearRest(i)}><X size={12} /></button>
          </div>
        ) : (
          <button style={styles.linkBtn} onClick={() => toggleReveal(setRevealRest, i)}>+ Temps de repos</button>
        )}

        {revealTarget.has(i) || ex.targetMin !== "" || ex.targetMax !== "" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Target size={12} color={COLORS.muted} />
            <input
              style={{ ...styles.setInput, width: 44, padding: "6px 8px" }}
              placeholder="Min" type="number" value={ex.targetMin}
              onChange={(e) => updateExAt(i, { targetMin: e.target.value })}
            />
            <span style={{ fontSize: 11, color: COLORS.muted }}>-</span>
            <input
              style={{ ...styles.setInput, width: 44, padding: "6px 8px" }}
              placeholder="Max" type="number" value={ex.targetMax}
              onChange={(e) => updateExAt(i, { targetMax: e.target.value })}
            />
            <span style={{ fontSize: 10, color: COLORS.muted }}>{ex.mode === "time" ? "sec" : "reps"}</span>
            <button style={styles.iconBtn} onClick={() => clearTarget(i)}><X size={12} /></button>
          </div>
        ) : (
          <button style={styles.linkBtn} onClick={() => toggleReveal(setRevealTarget, i)}>
            + Objectif de {ex.mode === "time" ? "temps" : "reps"}
          </button>
        )}
      </div>
    </div>
  );

  if (editing !== null) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>{editing === "new" ? "Nouveau preset" : "Modifier le preset"}</span>
          <button style={styles.iconBtn} onClick={close}><X size={16} /></button>
        </div>
        <input style={styles.input} placeholder="Nom du preset (ex: Push day)" value={name} onChange={(e) => setName(e.target.value)} />

        {groupSupersets(exercises).map((block) => {
          if (block.group == null || block.items.length < 2) return renderPresetEx(block.items[0].ex, block.items[0].index);
          return (
            <div key={`superset-${block.items[0].index}`} style={supersetBoxStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingLeft: 2 }}>
                <Link2 size={14} color={COLORS.lime} />
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.lime, flex: 1 }}>Superset · {block.items.length} exercices</span>
                <button style={styles.linkBtn} onClick={() => setPickerFor({ chainAt: block.items[0].index })}>+ exo</button>
                <button style={{ ...styles.linkBtn, color: COLORS.muted, marginLeft: 8 }} onClick={() => ungroup(block.group)}>Dissocier</button>
              </div>
              {block.items.map(({ ex, index }) => renderPresetEx(ex, index, true))}
            </div>
          );
        })}
        <button style={styles.secondaryBtn} onClick={addEx}>+ Ajouter un exercice</button>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={close}>Annuler</button>
          <button style={{ ...styles.primaryBtn, flex: 1 }} disabled={!valid} onClick={submit}>Enregistrer</button>
        </div>

        {pickerFor?.chainAt != null && (
          <ExercisePicker
            multi
            minSelect={exercises[pickerFor.chainAt]?.name ? 1 : 2}
            title={exercises[pickerFor.chainAt]?.name ? `Enchaîner avec ${exercises[pickerFor.chainAt].name}` : undefined}
            exerciseList={exerciseList}
            onClose={() => setPickerFor(null)}
            onConfirmMulti={(picked) => { chainAt(pickerFor.chainAt, picked); setPickerFor(null); }}
          />
        )}
        {typeof pickerFor === "number" && (
          <ExercisePicker
            exerciseList={exerciseList}
            onClose={() => setPickerFor(null)}
            onSelect={(ex) => { updateExAt(pickerFor, { name: ex.name }); setPickerFor(null); }}
          />
        )}
      </div>
    );
  }

  // Presets regroupés par créateur : moi d'abord, puis les potes par ordre alphabétique
  // (seuls ceux qui ont au moins un preset apparaissent).
  const byCreator = new Map();
  presets.forEach((p) => {
    if (!byCreator.has(p.creatorId)) byCreator.set(p.creatorId, []);
    byCreator.get(p.creatorId).push(p);
  });
  const nameOf = (id) => profiles[id]?.display_name || "?";
  const people = [...byCreator.keys()].sort((a, b) =>
    a === currentUserId ? -1 : b === currentUserId ? 1 : nameOf(a).localeCompare(nameOf(b), "fr")
  );

  return (
    <div>
      <h2 style={styles.sectionTitle}>Presets de séance ({presets.length})</h2>
      <button style={styles.secondaryBtn} onClick={openCreate}>+ Créer un preset</button>

      {presets.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 14 }}>Aucun preset pour l'instant.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {people.map((creatorId) => {
          const list = byCreator.get(creatorId);
          const mine = creatorId === currentUserId;
          const open = openPeople.has(creatorId);
          return (
            <div key={creatorId} style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
              <button
                onClick={() => togglePerson(creatorId)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: 10, background: "none", border: "none", color: COLORS.chalk, cursor: "pointer", textAlign: "left" }}
              >
                <Avatar profile={profiles[creatorId]} size={32} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mine ? "Mes presets" : nameOf(creatorId)}
                </span>
                <span style={{ fontSize: 12, color: COLORS.muted }}>{list.length}</span>
                {open ? <ChevronUp size={16} color={COLORS.muted} /> : <ChevronDown size={16} color={COLORS.muted} />}
              </button>

              {open && (
                <div style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  {list.map((p) => {
                    const expanded = expandedId === p.id;
                    return (
                      <div key={p.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                        <button
                          onClick={() => toggle(p.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", background: expanded ? COLORS.surface2 : "none", border: "none", color: COLORS.chalk, cursor: "pointer", textAlign: "left" }}
                        >
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0 }}>{p.exercises.length} exo{p.exercises.length > 1 ? "s" : ""}</span>
                          {expanded ? <ChevronUp size={14} color={COLORS.muted} /> : <ChevronDown size={14} color={COLORS.muted} />}
                        </button>
                        {expanded && (
                          <PresetPreview
                            preset={p}
                            owned={mine}
                            copied={copiedIds.has(p.id)}
                            onEdit={openEdit}
                            onDelete={remove}
                            onSelect={onSelect}
                            onCopy={copy}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
