import { X } from "lucide-react";
import { styles } from "../lib/styles";

// Fenêtre en bas d'écran commune à toute l'app : fond assombri, carte, en-tête
// (titre + actions + croix).
// - onClose : toucher le fond ferme la fenêtre. confirmClose (texte) demande d'abord
//   confirmation, pour les formulaires où un toucher à côté ferait perdre la saisie.
// - onDismiss : action de la croix si elle diffère du fond (ex: revenir à la vue
//   précédente) ; false = pas de croix.
// - title absent : pas d'en-tête, le contenu gère le sien.
// Le clic ne remonte jamais au parent : une fenêtre peut s'ouvrir par-dessus une autre.
export function Modal({ title, onClose, onDismiss, actions, confirmClose, zIndex, children }) {
  const dismiss = onDismiss === undefined ? onClose : onDismiss;
  const closeFromBackdrop = (e) => {
    e.stopPropagation();
    if (!confirmClose || confirm(confirmClose)) onClose();
  };
  return (
    <div style={zIndex ? { ...styles.modalBackdrop, zIndex } : styles.modalBackdrop} onClick={closeFromBackdrop}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {title != null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, minWidth: 0 }}>{title}</div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {actions}
              {dismiss && <button style={styles.iconBtn} onClick={dismiss} aria-label="Fermer"><X size={16} /></button>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
