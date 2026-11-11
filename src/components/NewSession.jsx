import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { todayKey } from "../lib/utils";
import { cleanExercises, emptyExercise } from "./ExercisesEditor";
import { ExercisesSection, FeelingCommentFields, SubmitButton } from "./EntryFields";
import { DurationInput } from "./DurationInput";
import { CompanionsPicker } from "./GuestPicker";
import { SessionTypePicker } from "./SessionTypes";
import { FloatingTimer } from "./FloatingTimer";
import { PhotoInput } from "./PhotoInput";
import { getLatestWeight } from "../lib/api/profiles";

export function NewSession({ currentUserId, otherProfiles, exerciseList, sessions, initialExercises, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [durationMin, setDurationMin] = useState("");
  const [feeling, setFeeling] = useState(null);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [guests, setGuests] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [exercises, setExercises] = useState(() => (initialExercises?.length ? initialExercises : [emptyExercise()]));
  const [bodyweightKg, setBodyweightKg] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    getLatestWeight(currentUserId).then((w) => { if (w != null) setBodyweightKg(w); }).catch(() => {});
  }, [currentUserId]);

  const clean = cleanExercises(exercises);
  const valid = clean.length > 0 && !!title.trim() && !!photo && !uploading;

  const submit = async () => {
    setTouched(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit(
        {
          date,
          title: title.trim(),
          durationMin: durationMin ? Number(durationMin) : null,
          photo,
          feeling,
          comment: comment.trim() || null,
          participantIds: participants,
          guestNames: guests,
          sessionTypes,
          bodyweightKg: bodyweightKg !== "" ? Number(bodyweightKg) : null,
        },
        clean
      );
    } catch (e) {
      setSubmitError(e.message || "La publication a échoué. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Nouvelle séance</h2>
      <PhotoInput
        value={photo} onChange={setPhoto} onUploadingChange={setUploading}
        folder="sessions" maxW={720} quality={0.7}
        aside={touched && !photo && <span style={{ fontSize: 11, color: COLORS.flame }}>Photo requise</span>}
      />

      <input style={styles.input} placeholder="Titre (ex: Push day)" value={title} onChange={(e) => setTitle(e.target.value)} />
      {touched && !title.trim() && <p style={{ color: COLORS.flame, fontSize: 12, marginTop: -6, marginBottom: 8 }}>Titre requis</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <DurationInput valueMin={durationMin} onChange={setDurationMin} />
      </div>

      <label style={styles.label}>Type de séance (optionnel)</label>
      <SessionTypePicker value={sessionTypes} onChange={setSessionTypes} />

      <label style={styles.label}>Ton poids aujourd'hui (kg)</label>
      <input style={styles.input} type="number" placeholder="Poids du jour" value={bodyweightKg} onChange={(e) => setBodyweightKg(e.target.value)} />

      <ExercisesSection exercises={exercises} onChange={setExercises} exerciseList={exerciseList} sessions={sessions} currentUserId={currentUserId} />
      {touched && clean.length === 0 && <p style={{ color: COLORS.flame, fontSize: 12, marginTop: 6 }}>Choisis au moins un exercice</p>}

      <FeelingCommentFields feeling={feeling} onFeelingChange={setFeeling} comment={comment} onCommentChange={setComment} />

      <label style={styles.label}>Fait avec (optionnel)</label>
      <CompanionsPicker
        profiles={otherProfiles}
        selectedIds={participants} onSelectedChange={setParticipants}
        guests={guests} onGuestsChange={setGuests}
      />

      <FloatingTimer />

      {submitError && <p style={{ color: COLORS.flame, fontSize: 13, marginTop: 10, marginBottom: -8 }}>{submitError}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={onCancel} disabled={submitting}>Annuler</button>
        <SubmitButton busy={submitting} onClick={submit} icon={Check} label="Publier" busyLabel="Publication..." style={{ flex: 1 }} />
      </div>
    </div>
  );
}
