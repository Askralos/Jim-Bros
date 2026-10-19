import { useState } from "react";
import { styles } from "../lib/styles";
import { COLORS, SESSION_SPLITS, EXERCISE_TAGS, sessionTypeLabel } from "../lib/constants";
import { fmtDate } from "../lib/utils";

// Choix du/des type(s) de séance : le split (push, pull...) puis les muscles.
export function SessionTypePicker({ value, onChange }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  const pill = (t) => (
    <button key={t.key} type="button" onClick={() => toggle(t.key)} style={{ ...styles.tabPill, ...(value.includes(t.key) ? styles.tabPillActive : {}) }}>
      {t.label}
    </button>
  );
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>{SESSION_SPLITS.map(pill)}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{EXERCISE_TAGS.map(pill)}</div>
    </div>
  );
}

export function SessionTypeBadges({ types }) {
  if (!types?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {types.map((t) => (
        <span key={t} style={{ fontSize: 10, fontWeight: 600, color: COLORS.chalk, background: COLORS.surface2, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "1px 7px" }}>
          {sessionTypeLabel(t)}
        </span>
      ))}
    </div>
  );
}

// Filtre d'historique : uniquement les types effectivement utilisés.
export function SessionTypeFilter({ entries, active, onChange }) {
  const used = new Set(entries.flatMap((e) => e.sessionTypes || []));
  const keys = [...SESSION_SPLITS, ...EXERCISE_TAGS].map((t) => t.key).filter((k) => used.has(k));
  if (!keys.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      {keys.map((k) => (
        <button key={k} type="button" onClick={() => onChange(active === k ? null : k)} style={{ ...styles.tabPill, ...(active === k ? styles.tabPillActive : {}) }}>
          {sessionTypeLabel(k)}
        </button>
      ))}
    </div>
  );
}

// Historique de séances d'un user, filtrable par type de séance.
export function SessionHistoryList({ entries, onOpenSession, limit, emptyText }) {
  const [active, setActive] = useState(null);
  const shown = entries.filter((e) => !active || (e.sessionTypes || []).includes(active));
  return (
    <>
      <SessionTypeFilter entries={entries} active={active} onChange={setActive} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(limit ? shown.slice(0, limit) : shown).map((e) => (
          <div key={e.sessionId} style={styles.historyRow} onClick={() => onOpenSession(e.sessionId)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 13 }}>{e.session.title || e.exercises.map((x) => x.name).join(", ")}</span>
              <SessionTypeBadges types={e.sessionTypes} />
            </div>
            <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0 }}>{fmtDate(e.session.date)}</span>
          </div>
        ))}
        {entries.length === 0 && emptyText && <p style={{ color: COLORS.muted, fontSize: 13 }}>{emptyText}</p>}
        {entries.length > 0 && shown.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Aucune séance de ce type.</p>}
      </div>
    </>
  );
}
