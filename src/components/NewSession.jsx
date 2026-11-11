import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { todayKey } from "../lib/utils";
import { loadDraft, saveDraft, clearDraft } from "../lib/drafts";
import { cleanExercises, emptyExercise } from "./ExercisesEditor";
import { ExercisesSection, FeelingCommentFields, SubmitButton } from "./EntryFields";
import { DurationInput } from "./DurationInput";
import { CompanionsPicker } from "./GuestPicker";
import { SessionTypePicker } from "./SessionTypes";
import { FloatingTimer } from "./FloatingTimer";
import { PhotoInput } from "./PhotoInput";
import { getLatestWeight } from "../lib/api/profiles";

const emptyForm = (initial) => ({
  title: initial?.title || "",
  date: todayKey(),
  durationMin: "",
  feeling: null,
  comment: "",
  photo: null,
  participants: [],
  guests: [],
  sessionTypes: initial?.sessionTypes || [],
  exercises: initial?.exercises?.length ? initial.exercises : [emptyExercise()],
  bodyweightKg: "",
});

// Création d'une séance. La saisie est sauvegardée en continu (brouillon, voir
// lib/drafts.js) et reprise telle quelle si l'app est rechargée en pleine séance.
// initial : point de départ facultatif ({ title, sessionTypes, exercises }), depuis
// un preset ou une séance passée ; ignoré s'il y a déjà un brouillon à reprendre.
export function NewSession({ currentUserId, otherProfiles, exerciseList, sessions, draftKey, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => loadDraft(draftKey) || emptyForm(initial));
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const patch = (partial) => setForm((f) => ({ ...f, ...partial }));

  useEffect(() => {
    if (form.bodyweightKg !== "") return;
    getLatestWeight(currentUserId).then((w) => { if (w != null) setForm((f) => (f.bodyweightKg === "" ? { ...f, bodyweightKg: w } : f)); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // Sauvegarde du brouillon, regroupée sur 400 ms de saisie.
  useEffect(() => {
    const timer = setTimeout(() => saveDraft(draftKey, form), 400);
    return () => clearTimeout(timer);
  }, [draftKey, form]);

  const clean = cleanExercises(form.exercises);
  const valid = clean.length > 0 && !!form.title.trim() && !!form.photo && !uploading;

  const submit = async () => {
    setTouched(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit(
        {
          date: form.date,
          title: form.title.trim(),
          durationMin: form.durationMin ? Number(form.durationMin) : null,
          photo: form.photo,
          feeling: form.feeling,
          comment: form.comment.trim() || null,
          participantIds: form.participants,
          guestNames: form.guests,
          sessionTypes: form.sessionTypes,
          bodyweightKg: form.bodyweightKg !== "" ? Number(form.bodyweightKg) : null,
        },
        clean
      );
      // Le brouillon est effacé par le parent une fois la séance créée.
    } catch (e) {
      setSubmitError(e.message || "La publication a échoué. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (!confirm("Abandonner cette séance ? Ce que tu as saisi sera perdu.")) return;
    clearDraft(draftKey);
    onCancel();
  };

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Nouvelle séance</h2>
      <PhotoInput
        value={form.photo} onChange={(photo) => patch({ photo })} onUploadingChange={setUploading}
        folder="sessions" maxW={720} quality={0.7}
        aside={touched && !form.photo && <span style={{ fontSize: 11, color: COLORS.flame }}>Photo requise</span>}
      />

      <input style={styles.input} placeholder="Titre (ex: Push day)" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
      {touched && !form.title.trim() && <p style={{ color: COLORS.flame, fontSize: 12, marginTop: -6, marginBottom: 8 }}>Titre requis</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
        <DurationInput valueMin={form.durationMin} onChange={(durationMin) => patch({ durationMin })} />
      </div>

      <label style={styles.label}>Type de séance (optionnel)</label>
      <SessionTypePicker value={form.sessionTypes} onChange={(sessionTypes) => patch({ sessionTypes })} />

      <label style={styles.label}>Ton poids aujourd'hui (kg)</label>
      <input style={styles.input} type="number" placeholder="Poids du jour" value={form.bodyweightKg} onChange={(e) => patch({ bodyweightKg: e.target.value })} />

      <ExercisesSection
        exercises={form.exercises} onChange={(exercises) => patch({ exercises })} exerciseList={exerciseList}
        sessions={sessions} currentUserId={currentUserId}
      />
      {touched && clean.length === 0 && <p style={{ color: COLORS.flame, fontSize: 12, marginTop: 6 }}>Choisis au moins un exercice</p>}

      <FeelingCommentFields
        feeling={form.feeling} onFeelingChange={(feeling) => patch({ feeling })}
        comment={form.comment} onCommentChange={(comment) => patch({ comment })}
      />

      <label style={styles.label}>Fait avec (optionnel)</label>
      <CompanionsPicker
        profiles={otherProfiles}
        selectedIds={form.participants} onSelectedChange={(participants) => patch({ participants })}
        guests={form.guests} onGuestsChange={(guests) => patch({ guests })}
      />

      <FloatingTimer />

      {submitError && <p style={{ color: COLORS.flame, fontSize: 13, marginTop: 10, marginBottom: -8 }}>{submitError}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={cancel} disabled={submitting}>Abandonner</button>
        <SubmitButton busy={submitting} onClick={submit} icon={Check} label="Publier" busyLabel="Publication..." style={{ flex: 1 }} />
      </div>
    </div>
  );
}
