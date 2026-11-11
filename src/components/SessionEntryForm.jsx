import { useState, useEffect } from "react";
import { Check, Trash2 } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { presetToExercises } from "../lib/utils";
import { cleanExercises, emptyExercise } from "./ExercisesEditor";
import { ExercisesSection, FeelingCommentFields, SubmitButton } from "./EntryFields";
import { SessionTypePicker } from "./SessionTypes";
import { FloatingTimer } from "./FloatingTimer";
import { PresetsEditor } from "./PresetsEditor";
import { PhotoInput } from "./PhotoInput";
import { Modal } from "./Modal";
import { getLatestWeight } from "../lib/api/profiles";

// Brouillon du formulaire à partir des stats déjà enregistrées (ou vide). Les valeurs
// nulles de la base deviennent des champs vides.
export function entryDraftFrom(entry) {
  return {
    exercises: entry
      ? entry.exercises.map((e) => ({
          ...e,
          sets: e.sets.map((s) => ({
            ...s,
            reps: s.reps ?? "",
            seconds: s.seconds ?? "",
            weight: s.weight ?? "",
            restSeconds: s.restSeconds ?? "",
            targetMin: s.targetMin ?? "",
            targetMax: s.targetMax ?? "",
          })),
        }))
      : [emptyExercise()],
    bodyweightKg: entry?.bodyweightKg ?? "",
    feeling: entry?.feeling || null,
    comment: entry?.comment || "",
    title: entry?.title || "",
    sessionTypes: entry?.sessionTypes || [],
    photo: entry?.photo || null,
  };
}

// "Ajouter / Modifier mes stats" sur une séance existante. Le brouillon vit dans
// SessionModal (draft/onDraftChange), qui le garde aussi dans le navigateur : fermer
// le formulaire, quitter la séance ou recharger l'app ne perd pas la saisie.
export function SessionEntryForm({
  session, isNew, draft, onDraftChange, hasUnsaved, onDiscard, sessions, profiles, currentUserId, exerciseList,
  presets, onCreatePreset, onUpdatePreset, onDeletePreset,
  onSubmit, onDelete, onBack, onClose,
}) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const isCreator = currentUserId === session.creator;
  const patch = (partial) => onDraftChange((d) => ({ ...d, ...partial }));
  const clean = cleanExercises(draft.exercises);

  // Pré-remplit le poids du jour avec le dernier connu si rien n'est encore saisi.
  useEffect(() => {
    if (draft.bodyweightKg !== "") return;
    getLatestWeight(currentUserId).then((w) => { if (w != null) onDraftChange((d) => (d.bodyweightKg === "" ? { ...d, bodyweightKg: w } : d), { silent: true }); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (preset) => {
    if (clean.length > 0 && !confirm("Remplacer tes exercices actuels par ceux du preset ?")) return;
    patch({ exercises: presetToExercises(preset) });
    setShowPresetPicker(false);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(clean, {
        bodyweightKg: draft.bodyweightKg !== "" ? Number(draft.bodyweightKg) : null,
        feeling: draft.feeling,
        comment: draft.comment,
        sessionTypes: draft.sessionTypes,
        // Le créateur n'a pas de version perso : il modifie directement la séance.
        personal: isCreator ? undefined : { title: draft.title, photo: draft.photo },
      });
      onBack();
    } catch (e) {
      setError(e.message || "L'enregistrement a échoué. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isNew ? "Ajouter mes stats" : "Modifier mes stats"}
      onClose={onClose}
      onDismiss={onBack}
      actions={!isNew && (
        <button style={styles.iconBtn} onClick={() => { if (confirm("Supprimer tes stats de cette séance ?")) onDelete(); }} aria-label="Supprimer mes stats">
          <Trash2 size={16} color={COLORS.flame} />
        </button>
      )}
    >
      {hasUnsaved && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12, color: COLORS.muted, marginTop: -4, marginBottom: 12 }}>
          <span>Brouillon pas encore enregistré</span>
          <button style={{ ...styles.linkBtn, color: COLORS.muted }} onClick={() => { if (confirm("Annuler tes modifications non enregistrées ?")) onDiscard(); }}>
            Annuler mes modifs
          </button>
        </div>
      )}

      {!isCreator && (
        <div style={{ background: COLORS.surface2, borderRadius: 10, padding: "10px 10px 1px", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, display: "block" }}>Ta version de la séance (optionnel)</span>
          <span style={{ fontSize: 11, color: COLORS.muted, display: "block", marginBottom: 8 }}>
            Titre et photo visibles seulement par toi{session.sharedTitle ? ` : les autres voient toujours « ${session.sharedTitle} »` : ""}.
          </span>
          <input
            style={styles.input}
            placeholder={session.sharedTitle ? `Ton titre (ex: Legs au lieu de ${session.sharedTitle})` : "Ton titre (ex: Legs)"}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <PhotoInput
            value={draft.photo} onChange={(photo) => patch({ photo })} onUploadingChange={setUploading}
            folder="sessions" maxW={720} quality={0.7} placeholder="Ta photo (optionnel)" removable
          />
        </div>
      )}

      <label style={styles.label}>Type de séance (optionnel)</label>
      <SessionTypePicker value={draft.sessionTypes} onChange={(sessionTypes) => patch({ sessionTypes })} />

      <label style={styles.label}>Ton poids aujourd'hui (kg)</label>
      <input style={styles.input} type="number" placeholder="Poids du jour" value={draft.bodyweightKg} onChange={(e) => patch({ bodyweightKg: e.target.value })} />

      {presets.length > 0 && (
        <button style={styles.secondaryBtn} onClick={() => setShowPresetPicker(true)}>Depuis un preset</button>
      )}

      <ExercisesSection
        exercises={draft.exercises} onChange={(exercises) => patch({ exercises })} exerciseList={exerciseList}
        sessions={sessions} currentUserId={currentUserId} excludeSessionId={session.id}
      />

      <FeelingCommentFields
        feeling={draft.feeling} onFeelingChange={(feeling) => patch({ feeling })}
        comment={draft.comment} onCommentChange={(comment) => patch({ comment })}
      />

      <FloatingTimer />

      {error && <p style={{ color: COLORS.flame, fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <SubmitButton busy={submitting} disabled={!clean.length || uploading} onClick={submit} icon={Check} label="Enregistrer" busyLabel="Enregistrement..." />

      {showPresetPicker && (
        <Modal title="Choisir un preset" onClose={() => setShowPresetPicker(false)}>
          <PresetsEditor
            exerciseList={exerciseList}
            currentUserId={currentUserId}
            profiles={profiles}
            presets={presets}
            onCreate={onCreatePreset}
            onUpdate={onUpdatePreset}
            onDelete={onDeletePreset}
            onSelect={applyPreset}
          />
        </Modal>
      )}
    </Modal>
  );
}
