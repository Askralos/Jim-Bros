import { useMemo } from "react";
import { GitCompare, X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { fmtDate, groupDrops, formatSetWithDrops } from "../lib/utils";

// Sélecteur d'une séance passée (où l'utilisateur a ses propres stats) à comparer
// pendant la saisie de ses stats (nouvelle séance ou "Modifier mes stats").
// excludeId : la séance en cours d'édition, qu'on ne propose pas.
export function ComparePicker({ sessions, currentUserId, excludeId, onClose, onSelect }) {
  const past = useMemo(
    () => sessions.filter((s) => s.id !== excludeId && s.entries[currentUserId]).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [sessions, currentUserId, excludeId]
  );
  return (
    <div style={styles.modalBackdrop} onClick={(e) => { e.stopPropagation(); onClose(); }}>
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
// pour éviter les allers-retours en dehors de l'écran de saisie.
export function CompareReference({ session, currentUserId, onChange, onRemove }) {
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
        <div key={i} style={{ marginBottom: 4, ...(ex.supersetGroup != null ? { borderLeft: `2px solid ${COLORS.lime}`, paddingLeft: 6 } : {}) }}>
          <span style={{ fontSize: 12, color: COLORS.muted }}>{ex.name}</span>
          <div style={{ fontSize: 12.5, color: COLORS.chalk }}>{groupDrops(ex.sets).map(formatSetWithDrops).join(", ")}</div>
        </div>
      ))}
    </div>
  );
}
