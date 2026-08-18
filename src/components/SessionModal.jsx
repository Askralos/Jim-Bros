import { useState, useRef, useEffect } from "react";
import { X, Check, Camera, Trash2, ChevronDown } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, SESSION_FEELINGS, feelingLabel } from "../lib/constants";
import { fmtDate } from "../lib/utils";
import { Avatar } from "./Avatar";
import { ExercisesEditor, cleanExercises, emptyExercise } from "./ExercisesEditor";
import { uploadPhoto } from "../lib/api/storage";
import { getLatestWeight } from "../lib/api/profiles";

// Une seule photo par séance (la photo de couverture) — modifiable uniquement via
// "Modifier la séance" pour éviter la confusion avec un ancien système à 2 photos.
function SessionPhoto({ photo }) {
  if (!photo) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <img src={photo} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

function SetChip({ s }) {
  if (s.mode === "time") return <span style={styles.setChip}>{s.seconds}s</span>;
  const suffix =
    s.weightType === "bodyweight" ? " PDC" :
    s.weightType === "bodyweight_plus" ? ` PDC+${s.weight}kg` :
    s.weightType === "assisted" ? ` PDC-${s.weight}kg` :
    `×${s.weight}kg`;
  return <span style={styles.setChip}>{s.reps}{suffix}</span>;
}

export function SessionModal({
  session, profiles, currentUserId, exerciseList, otherProfiles,
  onClose, onSubmitEntry, onDeleteEntry, onEditSession, onDeleteSession,
}) {
  const [mode, setMode] = useState("view");
  const myEntry = session.entries[currentUserId];
  const [formExercises, setFormExercises] = useState(() =>
    myEntry ? myEntry.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) : [emptyExercise()]
  );
  const [formBodyweightKg, setFormBodyweightKg] = useState(myEntry?.bodyweightKg ?? "");
  const [editMeta, setEditMeta] = useState({
    title: session.title || "", date: session.date, durationMin: session.durationMin || "",
    photo: session.photo || null,
    feeling: session.feeling || null,
    comment: session.comment || "",
    participants: session.participants.filter((u) => u !== session.creator),
  });
  const [uploadingSession, setUploadingSession] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set([currentUserId]));
  const editFileRef = useRef(null);
  const editGalleryRef = useRef(null);

  useEffect(() => {
    if (myEntry?.bodyweightKg == null) {
      getLatestWeight(currentUserId).then((w) => { if (w != null) setFormBodyweightKg(w); }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const participants = session.participants;
  const isCreator = currentUserId === session.creator;

  const handleEditPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingSession(true);
    try {
      const url = await uploadPhoto(file, "sessions");
      setEditMeta((m) => ({ ...m, photo: url }));
    } finally { setUploadingSession(false); }
  };
  const toggleEditParticipant = (id) => {
    setEditMeta((m) => ({ ...m, participants: m.participants.includes(id) ? m.participants.filter((x) => x !== id) : [...m.participants, id] }));
  };
  const toggleExpanded = (id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (mode === "fillEntry" || mode === "editEntry") {
    const clean = cleanExercises(formExercises);
    return (
      <div style={styles.modalBackdrop} onClick={onClose}>
        <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 700 }}>{mode === "fillEntry" ? "Ajouter mes stats" : "Modifier mes stats"}</span>
            <div style={{ display: "flex", gap: 4 }}>
              {mode === "editEntry" && (
                <button style={styles.iconBtn} onClick={() => { if (confirm("Supprimer tes stats de cette séance ?")) { onDeleteEntry(); setMode("view"); } }} aria-label="Supprimer mes stats">
                  <Trash2 size={16} color={COLORS.flame} />
                </button>
              )}
              <button style={styles.iconBtn} onClick={() => setMode("view")}><X size={16} /></button>
            </div>
          </div>

          <label style={styles.label}>Ton poids aujourd'hui (kg)</label>
          <input style={styles.input} type="number" placeholder="Poids du jour" value={formBodyweightKg} onChange={(e) => setFormBodyweightKg(e.target.value)} />

          <div style={{ marginTop: 4 }}>
            <ExercisesEditor exercises={formExercises} onChange={setFormExercises} exerciseList={exerciseList} />
          </div>
          <button
            style={styles.primaryBtn}
            disabled={!clean.length}
            onClick={() => {
              onSubmitEntry(clean, formBodyweightKg !== "" ? Number(formBodyweightKg) : null);
              setMode("view");
            }}
          >
            <Check size={16} style={{ marginRight: 6 }} />Enregistrer
          </button>
        </div>
      </div>
    );
  }

  if (mode === "editSession") {
    return (
      <div style={styles.modalBackdrop} onClick={onClose}>
        <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 700 }}>Modifier la séance</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button style={styles.iconBtn} onClick={() => { if (confirm("Supprimer cette séance pour tout le monde ?")) onDeleteSession(); }} aria-label="Supprimer la séance">
                <Trash2 size={16} color={COLORS.flame} />
              </button>
              <button style={styles.iconBtn} onClick={() => setMode("view")}><X size={16} /></button>
            </div>
          </div>

          <div style={styles.photoZone} onClick={() => editFileRef.current?.click()}>
            {editMeta.photo ? (
              <img src={editMeta.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: COLORS.muted }}>
                <Camera size={22} /><span style={{ fontSize: 12 }}>{uploadingSession ? "Envoi..." : "Prendre une photo (optionnel)"}</span>
              </div>
            )}
          </div>
          <input ref={editFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleEditPhoto} />
          <input ref={editGalleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleEditPhoto} />
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <button style={styles.linkBtn} onClick={() => editGalleryRef.current?.click()}>ou galerie</button>
            {editMeta.photo && <button style={styles.linkBtn} onClick={() => setEditMeta((m) => ({ ...m, photo: null }))}>Retirer la photo</button>}
          </div>

          <input style={styles.input} placeholder="Titre" value={editMeta.title} onChange={(e) => setEditMeta({ ...editMeta, title: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={editMeta.date} onChange={(e) => setEditMeta({ ...editMeta, date: e.target.value })} />
            <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="Durée (min)" type="number" value={editMeta.durationMin} onChange={(e) => setEditMeta({ ...editMeta, durationMin: e.target.value })} />
          </div>

          <label style={styles.label}>Feeling de la séance (optionnel)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {SESSION_FEELINGS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setEditMeta((m) => ({ ...m, feeling: m.feeling === f.key ? null : f.key }))}
                style={{ ...styles.tabPill, ...(editMeta.feeling === f.key ? styles.tabPillActive : {}) }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label style={styles.label}>Commentaire (optionnel)</label>
          <textarea
            style={{ ...styles.input, minHeight: 72, resize: "vertical", marginBottom: 14 }}
            placeholder="Comment s'est passée la séance ?"
            value={editMeta.comment}
            onChange={(e) => setEditMeta({ ...editMeta, comment: e.target.value })}
          />

          {otherProfiles.length > 0 && (
            <>
              <label style={styles.label}>Fait avec</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {otherProfiles.map((p) => (
                  <button key={p.id} onClick={() => toggleEditParticipant(p.id)} style={{ ...styles.tabPill, ...(editMeta.participants.includes(p.id) ? styles.tabPillActive : {}) }}>
                    {p.display_name}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: COLORS.muted, marginTop: -8, marginBottom: 14 }}>
                Retirer quelqu'un supprime ses stats déjà enregistrées pour cette séance.
              </p>
            </>
          )}

          <button
            style={styles.primaryBtn}
            disabled={uploadingSession}
            onClick={() => {
              onEditSession({
                title: editMeta.title.trim(), date: editMeta.date,
                durationMin: editMeta.durationMin ? Number(editMeta.durationMin) : null,
                photo: editMeta.photo,
                feeling: editMeta.feeling,
                comment: editMeta.comment.trim() || null,
                participantIds: editMeta.participants, creatorId: session.creator,
              });
              setMode("view");
            }}
          >
            <Check size={16} style={{ marginRight: 6 }} />Enregistrer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>{session.title || "Séance"}</span>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <SessionPhoto photo={session.photo} />
        <p style={{ color: COLORS.muted, fontSize: 12, marginBottom: 12 }}>
          {fmtDate(session.date)}{session.durationMin ? ` · ${session.durationMin} min` : ""}
          {session.feeling ? ` · ${feelingLabel(session.feeling)}` : ""}
        </p>
        {session.comment && (
          <p style={{ fontSize: 13, color: COLORS.chalk, marginBottom: 12, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
            {session.comment}
          </p>
        )}

        {participants.map((id) => {
          const entry = session.entries[id];
          const mine = id === currentUserId;
          const solo = participants.length === 1;
          const isOpen = solo || expanded.has(id);
          return (
            <div key={id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${COLORS.line}` }}>
              {!solo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }} onClick={() => toggleExpanded(id)}>
                  <Avatar profile={profiles[id]} size={26} />
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{profiles[id]?.display_name || "?"}</span>
                  {entry ? <span style={{ fontSize: 11, color: COLORS.lime }}>Fait</span> : <span style={{ fontSize: 11, color: COLORS.muted }}>En attente</span>}
                  <ChevronDown size={14} color={COLORS.muted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
                </div>
              )}
              {isOpen && (
                <>
                  {entry ? (
                    entry.exercises.map((ex, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: COLORS.muted }}>{ex.name}</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
                          {ex.sets.map((s, j) => <SetChip key={j} s={s} />)}
                        </div>
                      </div>
                    ))
                  ) : mine ? (
                    <button style={styles.secondaryBtn} onClick={() => setMode("fillEntry")}>Ajouter mes stats</button>
                  ) : null}
                  {mine && entry && (
                    <button style={{ ...styles.linkBtn, marginTop: 6 }} onClick={() => setMode("editEntry")}>Modifier mes stats</button>
                  )}
                </>
              )}
            </div>
          );
        })}

        {isCreator && (
          <button style={styles.secondaryBtn} onClick={() => setMode("editSession")}>Modifier la séance</button>
        )}
      </div>
    </div>
  );
}
