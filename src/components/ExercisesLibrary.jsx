import { useState, useRef } from "react";
import { Camera, Dumbbell, X, Pencil, Trash2 } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, EXERCISE_TAGS, EXERCISE_ADMIN_USERNAMES } from "../lib/constants";
import { uploadPhoto } from "../lib/api/storage";
import { addExercise, updateExercise, deleteExercise } from "../lib/api/exercises";
import { useExerciseFilter, ExerciseFilterBar, TagBadges } from "./ExercisePicker";
import { PresetsEditor } from "./PresetsEditor";

const EMPTY_FORM = { name: "", photo: null, tags: [] };

function ExerciseFormModal({ editingExercise, currentUserId, onClose, onSaved }) {
  const [form, setForm] = useState(() => (editingExercise ? { name: editingExercise.name, photo: editingExercise.photo_url, tags: editingExercise.tags || [] } : EMPTY_FORM));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  const toggleFormTag = (key) => setForm((f) => ({ ...f, tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key] }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file, "exercises", { maxW: 400 });
      setForm((f) => ({ ...f, photo: url }));
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setError("");
    try {
      if (editingExercise) {
        await updateExercise(editingExercise.id, { name: form.name, tags: form.tags, photoUrl: form.photo });
      } else {
        await addExercise(form.name.trim(), form.photo, currentUserId, form.tags);
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Erreur lors de l'enregistrement.");
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>{editingExercise ? "Modifier l'exercice" : "Nouvel exercice"}</span>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={styles.photoZone} onClick={() => fileRef.current?.click()}>
          {form.photo ? (
            <img src={form.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: COLORS.muted }}>
              <Camera size={22} /><span style={{ fontSize: 12 }}>{uploading ? "Envoi..." : "Photo d'exécution (optionnel)"}</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
        <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
        <button style={{ ...styles.linkBtn, marginTop: -6, marginBottom: 10 }} onClick={() => galleryRef.current?.click()}>ou choisir depuis la galerie</button>
        <input style={styles.input} placeholder="Nom de l'exercice" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <label style={styles.label}>Groupes musculaires</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {EXERCISE_TAGS.map((t) => (
            <button key={t.key} type="button" onClick={() => toggleFormTag(t.key)} style={{ ...styles.tabPill, ...(form.tags.includes(t.key) ? styles.tabPillActive : {}) }}>{t.label}</button>
          ))}
        </div>
        {error && <p style={{ color: COLORS.flame, fontSize: 13, marginTop: -6, marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={onClose}>Annuler</button>
          <button style={{ ...styles.primaryBtn, flex: 1 }} disabled={!form.name.trim() || uploading} onClick={submit}>{editingExercise ? "Enregistrer" : "Ajouter"}</button>
        </div>
      </div>
    </div>
  );
}

export function ExercisesLibrary({ exerciseList, currentUserId, currentUsername, onRefresh, presets, onCreatePreset, onUpdatePreset, onDeletePreset }) {
  const [tab, setTab] = useState("library");
  const { query, setQuery, activeTag, toggleTag, filtered } = useExerciseFilter(exerciseList);
  const [formTarget, setFormTarget] = useState(null); // "new" = création, sinon l'exercice édité, null = fermé
  const [preview, setPreview] = useState(null);
  const canManage = EXERCISE_ADMIN_USERNAMES.includes(currentUsername);

  const removeExercise = async (ex) => {
    if (!confirm(`Supprimer "${ex.name}" de la bibliothèque ?`)) return;
    await deleteExercise(ex.id);
    await onRefresh();
  };

  return (
    <div style={styles.screen}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => setTab("library")} style={{ ...styles.tabPill, ...(tab === "library" ? styles.tabPillActive : {}) }}>Exercices</button>
        <button onClick={() => setTab("presets")} style={{ ...styles.tabPill, ...(tab === "presets" ? styles.tabPillActive : {}) }}>Presets</button>
      </div>

      {tab === "presets" ? (
        <PresetsEditor
          exerciseList={exerciseList} currentUserId={currentUserId} presets={presets}
          onCreate={onCreatePreset} onUpdate={onUpdatePreset} onDelete={onDeletePreset}
        />
      ) : (
        <>
          <h2 style={styles.sectionTitle}>Exercices ({exerciseList.length})</h2>
          <ExerciseFilterBar query={query} setQuery={setQuery} activeTag={activeTag} toggleTag={toggleTag} />

          <button style={styles.secondaryBtn} onClick={() => setFormTarget("new")}>+ Ajouter un exercice</button>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {filtered.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucun exercice ne correspond à ta recherche.</p>}
            {filtered.map((ex) => {
              return (
                <div key={ex.id} style={styles.friendRow}>
                  <div onClick={() => ex.photo_url && setPreview(ex)} style={{ cursor: ex.photo_url ? "pointer" : "default" }}>
                    {ex.photo_url ? (
                      <img src={ex.photo_url} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: COLORS.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Dumbbell size={16} color={COLORS.muted} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 14, display: "block" }}>{ex.name}</span>
                    <TagBadges tags={ex.tags} />
                  </div>
                  {canManage && (
                    <div style={{ display: "flex", gap: 2 }}>
                      <button style={styles.iconBtn} onClick={() => setFormTarget(ex)} aria-label="Modifier"><Pencil size={15} /></button>
                      <button style={styles.iconBtn} onClick={() => removeExercise(ex)} aria-label="Supprimer"><Trash2 size={15} color={COLORS.flame} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {preview && (
            <div style={styles.modalBackdrop} onClick={() => setPreview(null)}>
              <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700 }}>{preview.name}</span>
                  <button style={styles.iconBtn} onClick={() => setPreview(null)}><X size={16} /></button>
                </div>
                <img src={preview.photo_url} alt="" style={{ width: "100%", borderRadius: 10 }} />
              </div>
            </div>
          )}

          {formTarget && (
            <ExerciseFormModal
              editingExercise={formTarget === "new" ? null : formTarget}
              currentUserId={currentUserId}
              onClose={() => setFormTarget(null)}
              onSaved={onRefresh}
            />
          )}
        </>
      )}
    </div>
  );
}
