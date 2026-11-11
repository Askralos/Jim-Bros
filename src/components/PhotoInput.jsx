import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { uploadPhoto } from "../lib/api/storage";

// Zone photo : toucher = appareil photo, lien = galerie. Compresse et envoie la
// photo, puis remonte son URL via onChange (null si retirée).
// onUploadingChange permet au formulaire parent de bloquer l'envoi pendant l'upload.
// aside : contenu affiché à droite sous la zone (ex: "Photo requise").
export function PhotoInput({ value, onChange, folder, maxW, quality, placeholder = "Prendre une photo", removable = false, onUploadingChange, aside }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-choisir le même fichier après un échec
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    setError("");
    try {
      onChange(await uploadPhoto(file, folder, { maxW, quality }));
    } catch {
      setError("L'envoi de la photo a échoué. Réessaie.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...styles.photoZone, marginBottom: 6 }} onClick={() => cameraRef.current?.click()}>
        {value ? (
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: COLORS.muted }}>
            <Camera size={22} /><span style={{ fontSize: 12 }}>{uploading ? "Envoi..." : placeholder}</span>
          </div>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <button type="button" style={styles.linkBtn} onClick={() => galleryRef.current?.click()}>
          {uploading && value ? "Envoi..." : "ou choisir depuis la galerie"}
        </button>
        {removable && value ? <button type="button" style={styles.linkBtn} onClick={() => onChange(null)}>Retirer la photo</button> : aside}
      </div>
      {error && <p style={{ color: COLORS.flame, fontSize: 12, margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
