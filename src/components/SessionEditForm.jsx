import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { DurationInput } from "./DurationInput";
import { CompanionsPicker } from "./GuestPicker";
import { SubmitButton } from "./EntryFields";
import { PhotoInput } from "./PhotoInput";
import { Modal } from "./Modal";

// Valeurs du formulaire à partir de la séance telle qu'elle est partagée (pas la
// version perso du lecteur : sharedTitle/sharedPhoto, voir personalizeSession).
export function sessionMetaFrom(session) {
  return {
    title: (session.sharedTitle ?? session.title) || "",
    date: session.date,
    durationMin: session.durationMin || "",
    photo: (session.sharedPhoto ?? session.photo) || null,
    participants: session.participants.filter((u) => u !== session.creator),
    guests: session.guests || [],
  };
}

// "Modifier la séance" (réservé au créateur) : photo, titre, date, durée, participants.
export function SessionEditForm({ session, meta, onMetaChange, otherProfiles, onSubmit, onDelete, onBack, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const patch = (partial) => onMetaChange((m) => ({ ...m, ...partial }));

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        title: meta.title.trim(), date: meta.date,
        durationMin: meta.durationMin ? Number(meta.durationMin) : null,
        photo: meta.photo,
        participantIds: meta.participants, guestNames: meta.guests, creatorId: session.creator,
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
      title="Modifier la séance"
      onClose={onClose}
      onDismiss={onBack}
      actions={
        <button style={styles.iconBtn} onClick={() => { if (confirm("Supprimer cette séance pour tout le monde ?")) onDelete(); }} aria-label="Supprimer la séance">
          <Trash2 size={16} color={COLORS.flame} />
        </button>
      }
    >
      <PhotoInput
        value={meta.photo} onChange={(photo) => patch({ photo })} onUploadingChange={setUploading}
        folder="sessions" maxW={720} quality={0.7} placeholder="Prendre une photo (optionnel)" removable
      />

      <input style={styles.input} placeholder="Titre" value={meta.title} onChange={(e) => patch({ title: e.target.value })} />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={meta.date} onChange={(e) => patch({ date: e.target.value })} />
        <DurationInput valueMin={meta.durationMin} onChange={(durationMin) => patch({ durationMin })} />
      </div>

      <label style={styles.label}>Fait avec</label>
      <CompanionsPicker
        profiles={otherProfiles}
        selectedIds={meta.participants} onSelectedChange={(participants) => patch({ participants })}
        guests={meta.guests} onGuestsChange={(guests) => patch({ guests })}
      />
      {otherProfiles.length > 0 && (
        <p style={{ fontSize: 11, color: COLORS.muted, marginTop: -8, marginBottom: 14 }}>
          Retirer quelqu'un supprime ses stats déjà enregistrées pour cette séance.
        </p>
      )}

      {error && <p style={{ color: COLORS.flame, fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <SubmitButton busy={submitting} disabled={uploading} onClick={submit} icon={Check} label="Enregistrer" busyLabel="Enregistrement..." />
    </Modal>
  );
}
