import { useState, useRef } from "react";
import { Camera, Search, Dumbbell, X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { norm } from "../lib/utils";
import { uploadPhoto } from "../lib/api/storage";
import { addExercise, updateExercisePhoto } from "../lib/api/exercises";

export function ExercisesLibrary({ exerciseList, currentUserId, onRefresh }) {
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const newFileRef = useRef(null);
  const editFileRef = useRef(null);

  const filtered = [...exerciseList].filter((e) => norm(e.name).includes(norm(query))).sort((a, b) => a.name.localeCompare(b.name));

  const handleNewPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { setNewPhoto(await uploadPhoto(file, "exercises", { maxW: 400 })); } finally { setUploading(false); }
  };
  const handleEditPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file || !editingId) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file, "exercises", { maxW: 400 });
      await updateExercisePhoto(editingId, url);
      await onRefresh();
    } finally { setUploading(false); setEditingId(null); }
  };
  const submitNew = async () => {
    if (!newName.trim()) return;
    setError("");
    try {
      await addExercise(newName.trim(), newPhoto, currentUserId);
      await onRefresh();
      setNewName(""); setNewPhoto(null); setShowAdd(false);
    } catch (e) {
      setError(e.message || "Erreur lors de l'ajout.");
    }
  };

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Exercices ({exerciseList.length})</h2>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input style={{ ...styles.input, paddingLeft: 34 }} placeholder="Rechercher un exercice..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Search size={15} color={COLORS.muted} style={{ position: "absolute", left: 11, top: 12 }} />
      </div>

      {!showAdd ? (
        <button style={styles.secondaryBtn} onClick={() => setShowAdd(true)}>+ Ajouter un exercice</button>
      ) : (
        <div style={styles.exCard}>
          <div style={styles.photoZone} onClick={() => newFileRef.current?.click()}>
            {newPhoto ? (
              <img src={newPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: COLORS.muted }}>
                <Camera size={22} /><span style={{ fontSize: 12 }}>{uploading ? "Envoi..." : "Photo d'exécution (optionnel)"}</span>
              </div>
            )}
          </div>
          <input ref={newFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleNewPhoto} />
          <input style={styles.input} placeholder="Nom de l'exercice" value={newName} onChange={(e) => setNewName(e.target.value)} />
          {error && <p style={{ color: COLORS.flame, fontSize: 13, marginTop: -6, marginBottom: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={() => { setShowAdd(false); setNewName(""); setNewPhoto(null); setError(""); }}>Annuler</button>
            <button style={{ ...styles.primaryBtn, flex: 1 }} disabled={!newName.trim() || uploading} onClick={submitNew}>Ajouter</button>
          </div>
        </div>
      )}

      <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleEditPhoto} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {filtered.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucun exercice ne correspond à ta recherche.</p>}
        {filtered.map((ex) => (
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
            <span style={{ flex: 1, fontSize: 14 }}>{ex.name}</span>
            <button style={styles.linkBtn} onClick={() => { setEditingId(ex.id); editFileRef.current?.click(); }}>{ex.photo_url ? "Changer" : "+ Photo"}</button>
          </div>
        ))}
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
    </div>
  );
}
