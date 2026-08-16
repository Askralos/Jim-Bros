import { useState, useRef } from "react";
import { Camera, Check } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { todayKey } from "../lib/utils";
import { ExercisesEditor, cleanExercises } from "./ExercisesEditor";
import { uploadPhoto } from "../lib/api/storage";

export function NewSession({ currentUserId, otherProfiles, exerciseList, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [durationMin, setDurationMin] = useState("");
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [exercises, setExercises] = useState([{ name: "", sets: [{ reps: "", weight: "", bodyweight: false }] }]);
  const fileRef = useRef(null);

  const togglePart = (id) => setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setPhoto(await uploadPhoto(file, "sessions")); } finally { setUploading(false); }
  };
  const clean = cleanExercises(exercises);
  const valid = clean.length > 0 && !uploading;

  const submit = () => {
    if (!valid) return;
    onSubmit(
      { date, title: title.trim(), durationMin: durationMin ? Number(durationMin) : null, photo, participantIds: participants },
      clean
    );
  };

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Nouvelle séance</h2>
      <div style={styles.photoZone} onClick={() => fileRef.current?.click()}>
        {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} /> : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: COLORS.muted }}>
            <Camera size={22} /><span style={{ fontSize: 12 }}>{uploading ? "Envoi..." : "Ajouter une photo (optionnel)"}</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />

      <input style={styles.input} placeholder="Titre (ex: Push day)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="Durée (min)" type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
      </div>

      {otherProfiles.length > 0 && (
        <>
          <label style={styles.label}>Fait avec (optionnel)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {otherProfiles.map((p) => (
              <button key={p.id} onClick={() => togglePart(p.id)} style={{ ...styles.tabPill, ...(participants.includes(p.id) ? styles.tabPillActive : {}) }}>
                {p.display_name}
              </button>
            ))}
          </div>
        </>
      )}

      <p style={{ ...styles.label, marginTop: 4 }}>Tes exercices</p>
      <ExercisesEditor exercises={exercises} onChange={setExercises} exerciseList={exerciseList} />

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={onCancel}>Annuler</button>
        <button style={{ ...styles.primaryBtn, flex: 1 }} disabled={!valid} onClick={submit}><Check size={16} style={{ marginRight: 6 }} />Publier</button>
      </div>
    </div>
  );
}
