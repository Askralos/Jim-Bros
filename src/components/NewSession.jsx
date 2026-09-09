import { useState, useRef, useEffect, useMemo } from "react";
import { Camera, Check, Loader2, GitCompare, X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, SESSION_FEELINGS } from "../lib/constants";
import { todayKey, fmtDate, formatSet } from "../lib/utils";
import { ExercisesEditor, cleanExercises, emptyExercise } from "./ExercisesEditor";
import { uploadPhoto } from "../lib/api/storage";
import { getLatestWeight } from "../lib/api/profiles";

// Sélecteur d'une séance passée (où l'utilisateur a ses propres stats) à comparer
// pendant la création d'une nouvelle séance.
function ComparePicker({ sessions, currentUserId, onClose, onSelect }) {
  const past = useMemo(
    () => sessions.filter((s) => s.entries[currentUserId]).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [sessions, currentUserId]
  );
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>Comparer avec une séance</span>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        {past.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Pas encore de séance avec tes stats.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {past.map((s) => (
            <div key={s.id} style={{ ...styles.friendRow, cursor: "pointer" }} onClick={() => onSelect(s.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, display: "block" }}>{s.title || "Séance"}</span>
                <span style={{ fontSize: 11, color: COLORS.muted }}>{fmtDate(s.date)} · {s.entries[currentUserId].exercises.length} exercice{s.entries[currentUserId].exercises.length > 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Panneau repliable affichant les stats d'une séance passée choisie via ComparePicker,
// pour éviter les allers-retours en dehors de l'écran de création.
function CompareReference({ session, currentUserId, onChange, onRemove }) {
  const entry = session.entries[currentUserId];
  return (
    <div style={{ ...styles.exCard, background: COLORS.surface2, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <GitCompare size={14} color={COLORS.lime} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {session.title || "Séance"} · {fmtDate(session.date)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button style={styles.linkBtn} onClick={onChange}>Changer</button>
          <button style={styles.iconBtn} onClick={onRemove}><X size={14} /></button>
        </div>
      </div>
      {entry.exercises.map((ex, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: COLORS.muted }}>{ex.name}</span>
          <div style={{ fontSize: 12.5, color: COLORS.chalk }}>{ex.sets.map((s) => formatSet(s)).join(", ")}</div>
        </div>
      ))}
    </div>
  );
}

export function NewSession({ currentUserId, otherProfiles, exerciseList, sessions, initialExercises, onSubmit, onCancel }) {
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [compareSessionId, setCompareSessionId] = useState(null);
  const [showComparePicker, setShowComparePicker] = useState(false);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);
  const compareSession = sessions.find((s) => s.id === compareSessionId) || null;

  useEffect(() => {
    getLatestWeight(currentUserId).then((w) => { if (w != null) setBodyweightKg(w); }).catch(() => {});
  }, [currentUserId]);

  const togglePart = (id) => setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setPhoto(await uploadPhoto(file, "sessions", { maxW: 720, quality: 0.7 })); } finally { setUploading(false); }
  };
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

      <label style={styles.label}>Ton feeling (optionnel)</label>
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

      <label style={styles.label}>Ton commentaire (optionnel)</label>
      <textarea
        style={{ ...styles.input, minHeight: 72, resize: "vertical", marginBottom: 14 }}
        placeholder="Comment as-tu vécu la séance ?"
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 8 }}>
        <span style={styles.label}>Tes exercices</span>
        {!compareSession && (
          <button style={{ ...styles.linkBtn, display: "flex", alignItems: "center", gap: 4 }} onClick={() => setShowComparePicker(true)}>
            <GitCompare size={13} />Comparer
          </button>
        )}
      </div>

      {compareSession && (
        <CompareReference
          session={compareSession}
          currentUserId={currentUserId}
          onChange={() => setShowComparePicker(true)}
          onRemove={() => setCompareSessionId(null)}
        />
      )}

      <ExercisesEditor exercises={exercises} onChange={setExercises} exerciseList={exerciseList} />

      {showComparePicker && (
        <ComparePicker
          sessions={sessions}
          currentUserId={currentUserId}
          onClose={() => setShowComparePicker(false)}
          onSelect={(id) => { setCompareSessionId(id); setShowComparePicker(false); }}
        />
      )}

      {submitError && <p style={{ color: COLORS.flame, fontSize: 13, marginTop: 10, marginBottom: -8 }}>{submitError}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={onCancel} disabled={submitting}>Annuler</button>
        <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={submit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={16} style={{ marginRight: 6, animation: "spin 0.7s linear infinite" }} />
              Publication...
            </>
          ) : (
            <>
              <Check size={16} style={{ marginRight: 6 }} />Publier
            </>
          )}
        </button>
      </div>
    </div>
  );
}
