import { useState, useRef, useEffect } from "react";
import { Camera, Check } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, SESSION_FEELINGS } from "../lib/constants";
import { todayKey } from "../lib/utils";
import { ExercisesEditor, cleanExercises, emptyExercise } from "./ExercisesEditor";
import { uploadPhoto } from "../lib/api/storage";
import { getLatestWeight } from "../lib/api/profiles";

export function NewSession({ currentUserId, otherProfiles, exerciseList, initialExercises, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [durationMin, setDurationMin] = useState("");
  const [feeling, setFeeling] = useState(null);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [exercises, setExercises] = useState(() => (initialExercises?.length ? initialExercises : [emptyExercise()]));
  const [bodyweightKg, setBodyweightKg] = useState("");
  const [touched, setTouched] = useState(false);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    getLatestWeight(currentUserId).then((w) => { if (w != null) setBodyweightKg(w); }).catch(() => {});
  }, [currentUserId]);

  const togglePart = (id) => setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setPhoto(await uploadPhoto(file, "sessions")); } finally { setUploading(false); }
  };
  const clean = cleanExercises(exercises);
  const valid = clean.length > 0 && !!title.trim() && !!photo && !uploading;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit(
      {
        date,
        title: title.trim(),
        durationMin: durationMin ? Number(durationMin) : null,
        photo,
        feeling,
        comment: comment.trim() || null,
        participantIds: participants,
        bodyweightKg: bodyweightKg !== "" ? Number(bodyweightKg) : null,
      },
      clean
    );
  };

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Nouvelle séance</h2>
      <div style={styles.photoZone} onClick={() => fileRef.current?.click()}>
        {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} /> : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: COLORS.muted }}>
            <Camera size={22} /><span style={{ fontSize: 12 }}>{uploading ? "Envoi..." : "Prendre une photo"}</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -6, marginBottom: 12 }}>
        <button style={styles.linkBtn} onClick={() => galleryRef.current?.click()}>ou choisir depuis la galerie</button>
        {touched && !photo && <span style={{ fontSize: 11, color: COLORS.flame }}>Photo requise</span>}
      </div>

      <input style={styles.input} placeholder="Titre (ex: Push day)" value={title} onChange={(e) => setTitle(e.target.value)} />
      {touched && !title.trim() && <p style={{ color: COLORS.flame, fontSize: 12, marginTop: -6, marginBottom: 8 }}>Titre requis</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="Durée (min)" type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
      </div>

      <label style={styles.label}>Ton poids aujourd'hui (kg)</label>
      <input style={styles.input} type="number" placeholder="Poids du jour" value={bodyweightKg} onChange={(e) => setBodyweightKg(e.target.value)} />

      <label style={styles.label}>Feeling de la séance (optionnel)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {SESSION_FEELINGS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFeeling((cur) => (cur === f.key ? null : f.key))}
            style={{ ...styles.tabPill, ...(feeling === f.key ? styles.tabPillActive : {}) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label style={styles.label}>Commentaire (optionnel)</label>
      <textarea
        style={{ ...styles.input, minHeight: 72, resize: "vertical", marginBottom: 14 }}
        placeholder="Comment s'est passée la séance ?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

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
        <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={submit}><Check size={16} style={{ marginRight: 6 }} />Publier</button>
      </div>
    </div>
  );
}
