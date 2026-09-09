import { useState, useRef, useEffect } from "react";
import { X, Check, Camera, Trash2, ChevronDown, Loader2, Calendar, Clock } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, SESSION_FEELINGS, feelingLabel } from "../lib/constants";
import { fmtDate, fmtTime, presetToExercises } from "../lib/utils";
import { Avatar } from "./Avatar";
import { ExercisesEditor, cleanExercises, emptyExercise } from "./ExercisesEditor";
import { PresetsEditor } from "./PresetsEditor";
import { uploadPhoto } from "../lib/api/storage";
import { getLatestWeight } from "../lib/api/profiles";

// Une seule photo par séance (la photo de couverture) — modifiable uniquement via
// "Modifier la séance" pour éviter la confusion avec un ancien système à 2 photos.
// object-fit: contain (plutôt que cover en 4/3 fixe) : chacun cadre sa photo comme
// il veut, on affiche donc la photo entière plutôt que d'en cacher des morceaux
// avec un recadrage forcé.
function SessionPhoto({ photo }) {
  if (!photo) return null;
  return (
    <div style={{ marginBottom: 10, background: COLORS.surface2, borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }}>
      <img src={photo} alt="" style={{ display: "block", width: "100%", maxHeight: "55vh", objectFit: "contain", borderRadius: 10 }} />
    </div>
  );
}

// Code couleur par rapport à l'objectif de reps (si renseigné) : en dessous de la
// fourchette = rouge, dedans = vert, au-dessus = jaune.
function targetTint(reps, min, max) {
  const r = Number(reps);
  if (r < min) return "rgba(255,107,74,0.28)";
  if (r > max) return "rgba(224,198,74,0.3)";
  return "rgba(201,245,66,0.25)";
}

// Carte à deux lignes plutôt qu'un seul pill compressé "10/10-12×50kg" : la valeur
// principale (reps × charge) se lit d'un coup d'œil, l'objectif (si renseigné) et le
// repos passent en sous-ligne secondaire. Le code couleur reste sur le fond de la carte.
function SetChip({ index, s }) {
  if (s.mode === "time") {
    return (
      <div style={{ background: COLORS.surface2, borderRadius: 8, padding: "5px 9px", minWidth: 56 }}>
        <div style={{ fontSize: 9.5, color: COLORS.muted, marginBottom: 2 }}>Série {index + 1}</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{s.seconds}s</div>
      </div>
    );
  }
  const loadLabel =
    s.weightType === "bodyweight" ? "PDC" :
    s.weightType === "bodyweight_plus" ? `PDC +${s.weight}kg` :
    s.weightType === "assisted" ? `PDC −${s.weight}kg` :
    `${s.weight}kg`;
  const hasTarget = s.targetMin != null && s.targetMax != null;
  const cardStyle = {
    borderRadius: 8, padding: "5px 9px", minWidth: 74,
    background: hasTarget ? targetTint(s.reps, s.targetMin, s.targetMax) : COLORS.surface2,
  };
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 9.5, color: COLORS.muted, marginBottom: 2 }}>Série {index + 1}</div>
      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
        {s.reps} reps <span style={{ fontWeight: 400, color: COLORS.muted }}>×</span> {loadLabel}
      </div>
      {hasTarget && <div style={{ fontSize: 10.5, marginTop: 2 }}>obj. {s.targetMin}-{s.targetMax}</div>}
      {s.restSeconds != null && (
        <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>repos {s.restSeconds}s</div>
      )}
    </div>
  );
}

export function SessionModal({
  session, profiles, currentUserId, exerciseList, otherProfiles,
  presets, onCreatePreset, onUpdatePreset, onDeletePreset,
  onClose, onSubmitEntry, onDeleteEntry, onEditSession, onDeleteSession,
}) {
  const [mode, setMode] = useState("view");
  const myEntry = session.entries[currentUserId];
  const [formExercises, setFormExercises] = useState(() =>
    myEntry
      ? myEntry.exercises.map((e) => ({
          ...e,
          sets: e.sets.map((s) => ({
            ...s,
            restSeconds: s.restSeconds ?? "",
            targetMin: s.targetMin ?? "",
            targetMax: s.targetMax ?? "",
          })),
        }))
      : [emptyExercise()]
  );
  const [formBodyweightKg, setFormBodyweightKg] = useState(myEntry?.bodyweightKg ?? "");
  const [formFeeling, setFormFeeling] = useState(myEntry?.feeling || null);
  const [formComment, setFormComment] = useState(myEntry?.comment || "");
  const [editMeta, setEditMeta] = useState({
    title: session.title || "", date: session.date, durationMin: session.durationMin || "",
    photo: session.photo || null,
    participants: session.participants.filter((u) => u !== session.creator),
  });
  const [uploadingSession, setUploadingSession] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set([currentUserId]));
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [submittingSession, setSubmittingSession] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [showPresetPicker, setShowPresetPicker] = useState(false);
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
      const url = await uploadPhoto(file, "sessions", { maxW: 720, quality: 0.7 });
      setEditMeta((m) => ({ ...m, photo: url }));
    } finally { setUploadingSession(false); }
  };
  const toggleEditParticipant = (id) => {
    setEditMeta((m) => ({ ...m, participants: m.participants.includes(id) ? m.participants.filter((x) => x !== id) : [...m.participants, id] }));
  };
  const toggleExpanded = (id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const applyPreset = (preset) => {
    if (cleanExercises(formExercises).length > 0 && !confirm("Remplacer tes exercices actuels par ceux du preset ?")) return;
    setFormExercises(presetToExercises(preset));
    setShowPresetPicker(false);
  };

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

          {presets.length > 0 && (
            <button style={styles.secondaryBtn} onClick={() => setShowPresetPicker(true)}>Depuis un preset</button>
          )}

          <div style={{ marginTop: 4 }}>
            <ExercisesEditor exercises={formExercises} onChange={setFormExercises} exerciseList={exerciseList} />
          </div>

          <label style={{ ...styles.label, marginTop: 4 }}>Ton feeling (optionnel)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {SESSION_FEELINGS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFormFeeling((cur) => (cur === f.key ? null : f.key))}
                style={{ ...styles.tabPill, ...(formFeeling === f.key ? styles.tabPillActive : {}) }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label style={styles.label}>Ton commentaire (optionnel)</label>
          <textarea
            style={{ ...styles.input, minHeight: 72, resize: "vertical", marginBottom: 14 }}
            placeholder="Comment as-tu vécu la séance ?"
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
          />

          {entryError && <p style={{ color: COLORS.flame, fontSize: 13, marginBottom: 8 }}>{entryError}</p>}

          <button
            style={styles.primaryBtn}
            disabled={!clean.length || submittingEntry}
            onClick={async () => {
              if (submittingEntry) return;
              setSubmittingEntry(true);
              setEntryError("");
              try {
                await onSubmitEntry(clean, formBodyweightKg !== "" ? Number(formBodyweightKg) : null, formFeeling, formComment);
                setMode("view");
              } catch (e) {
                setEntryError(e.message || "L'enregistrement a échoué. Réessaie.");
              } finally {
                setSubmittingEntry(false);
              }
            }}
          >
            {submittingEntry ? (
              <><Loader2 size={16} style={{ marginRight: 6, animation: "spin 0.7s linear infinite" }} />Enregistrement...</>
            ) : (
              <><Check size={16} style={{ marginRight: 6 }} />Enregistrer</>
            )}
          </button>
        </div>

        {showPresetPicker && (
          <div style={styles.modalBackdrop} onClick={(e) => { e.stopPropagation(); setShowPresetPicker(false); }}>
            <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontWeight: 700 }}>Choisir un preset</span>
                <button style={styles.iconBtn} onClick={() => setShowPresetPicker(false)}><X size={16} /></button>
              </div>
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
            </div>
          </div>
        )}
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

          {sessionError && <p style={{ color: COLORS.flame, fontSize: 13, marginBottom: 8 }}>{sessionError}</p>}

          <button
            style={styles.primaryBtn}
            disabled={uploadingSession || submittingSession}
            onClick={async () => {
              if (submittingSession) return;
              setSubmittingSession(true);
              setSessionError("");
              try {
                await onEditSession({
                  title: editMeta.title.trim(), date: editMeta.date,
                  durationMin: editMeta.durationMin ? Number(editMeta.durationMin) : null,
                  photo: editMeta.photo,
                  participantIds: editMeta.participants, creatorId: session.creator,
                });
                setMode("view");
              } catch (e) {
                setSessionError(e.message || "L'enregistrement a échoué. Réessaie.");
              } finally {
                setSubmittingSession(false);
              }
            }}
          >
            {submittingSession ? (
              <><Loader2 size={16} style={{ marginRight: 6, animation: "spin 0.7s linear infinite" }} />Enregistrement...</>
            ) : (
              <><Check size={16} style={{ marginRight: 6 }} />Enregistrer</>
            )}
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
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}>
            <Calendar size={13} />{fmtDate(session.date)}
          </span>
          {session.createdAt && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.muted }}>
              <Clock size={13} />
              Publiée à {fmtTime(session.createdAt)}{session.durationMin ? ` · ${session.durationMin} min` : ""}
            </span>
          )}
        </div>

        {participants.map((id) => {
          const entry = session.entries[id];
          const mine = id === currentUserId;
          const solo = participants.length === 1;
          const isOpen = solo || expanded.has(id);
          return (
            <div key={id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${COLORS.line}` }}>
              {!solo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }} onClick={() => toggleExpanded(id)}>
                  <Avatar profile={profiles[id]} size={26} />
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{profiles[id]?.display_name || "?"}</span>
                  {entry ? <span style={{ fontSize: 11, color: COLORS.lime }}>Fait</span> : <span style={{ fontSize: 11, color: COLORS.muted }}>En attente</span>}
                  <ChevronDown size={14} color={COLORS.muted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
                </div>
              )}
              {isOpen && (
                <>
                  {entry ? (
                    <>
                      {entry.exercises.map((ex, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.chalk, display: "block", marginBottom: 5 }}>{ex.name}</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {ex.sets.map((s, j) => <SetChip key={j} index={j} s={s} />)}
                          </div>
                        </div>
                      ))}
                      {entry.feeling && (
                        <span
                          style={{
                            display: "inline-block", fontSize: 11, fontWeight: 700, color: COLORS.lime,
                            background: "rgba(201,245,66,0.12)", border: "1px solid rgba(201,245,66,0.35)",
                            borderRadius: 20, padding: "3px 10px", marginTop: 4,
                          }}
                        >
                          {feelingLabel(entry.feeling)}
                        </span>
                      )}
                      {entry.comment && (
                        <p
                          style={{
                            fontSize: 13, color: COLORS.chalk, marginTop: 8, marginBottom: 0, lineHeight: 1.4, whiteSpace: "pre-wrap",
                            background: COLORS.surface2, borderRadius: 8, padding: "8px 10px",
                          }}
                        >
                          {entry.comment}
                        </p>
                      )}
                    </>
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
