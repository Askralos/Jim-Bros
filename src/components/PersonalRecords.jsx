import { useMemo, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { fmtDate, computePersonalRecords, pickRecordNames } from "../lib/utils";
import { Modal } from "./Modal";

// Valeur affichée d'un record : la charge en gros, les reps en dessous.
function recordValue({ kind, set }) {
  if (kind === "time") return { main: `${set.seconds} s`, sub: null };
  if (kind === "reps") return { main: `${set.reps} reps`, sub: "poids du corps" };
  const load =
    set.weightType === "bodyweight_plus" ? `PDC +${set.weight} kg` :
    set.weightType === "assisted" ? `PDC −${set.weight} kg` :
    `${set.weight} kg`;
  return { main: load, sub: `× ${set.reps} rep${Number(set.reps) > 1 ? "s" : ""}` };
}

// Records perso calculés depuis l'historique (voir computePersonalRecords).
// history : { entries, sessions } (getUserHistory). chosen : exercices choisis par le
// user (profiles.pr_exercises), null = ses plus pratiqués. onChoose absent = lecture
// seule (profil d'un pote).
export function PersonalRecords({ history, chosen, onChoose, onOpenSession }) {
  const records = useMemo(() => computePersonalRecords(history.entries, history.sessions), [history]);
  const names = pickRecordNames(records, chosen);
  const [choosing, setChoosing] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={styles.sectionTitle}>Records</h2>
        {onChoose && Object.keys(records).length > 0 && (
          <button style={{ ...styles.linkBtn, display: "flex", alignItems: "center", gap: 4 }} onClick={() => setChoosing(true)}>
            <SlidersHorizontal size={13} />Choisir
          </button>
        )}
      </div>
      {names.length === 0 && (
        <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 14 }}>Les records apparaissent dès la première séance enregistrée.</p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
        {names.map((name) => {
          const rec = records[name];
          const { main, sub } = recordValue(rec);
          return (
            <div key={name} style={{ ...styles.prChip, cursor: "pointer" }} onClick={() => onOpenSession(rec.sessionId)}>
              <span style={{ fontSize: 11, color: COLORS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: COLORS.lime }}>{main}</span>
              <span style={{ fontSize: 10.5, color: COLORS.muted }}>{sub ? `${sub} · ` : ""}{fmtDate(rec.date)}</span>
            </div>
          );
        })}
      </div>

      {choosing && (
        <ChooseRecordsModal
          records={records}
          initial={names}
          onClose={() => setChoosing(false)}
          onSave={async (list) => { await onChoose(list); setChoosing(false); }}
        />
      )}
    </>
  );
}

// Choix des exercices affichés, dans l'ordre où on les coche. "Les plus pratiqués"
// revient au choix automatique (null).
function ChooseRecordsModal({ records, initial, onClose, onSave }) {
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  const all = Object.keys(records).sort((a, b) => records[b].sessionCount - records[a].sessionCount || a.localeCompare(b));
  const toggle = (name) => setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  const save = async (list) => {
    setSaving(true);
    try { await onSave(list); } finally { setSaving(false); }
  };

  return (
    <Modal title="Records affichés" onClose={onClose}>
      <p style={{ fontSize: 12, color: COLORS.muted, marginTop: -4, marginBottom: 10 }}>Coche les exercices à afficher, dans l'ordre voulu.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {all.map((name) => {
          const order = selected.indexOf(name);
          return (
            <div key={name} style={{ ...styles.friendRow, cursor: "pointer", ...(order !== -1 ? { border: `1px solid ${COLORS.lime}` } : {}) }} onClick={() => toggle(name)}>
              <span style={{ flex: 1, fontSize: 14 }}>{name}</span>
              <span style={{ fontSize: 11, color: COLORS.muted }}>{records[name].sessionCount} séance{records[name].sessionCount > 1 ? "s" : ""}</span>
              <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, ...(order !== -1 ? { background: COLORS.lime, color: "#111214" } : { border: `1px solid ${COLORS.line}` }) }}>
                {order !== -1 ? order + 1 : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "sticky", bottom: -18, background: COLORS.surface, padding: "10px 0 18px", display: "flex", gap: 8 }}>
        <button style={{ ...styles.secondaryBtn, flex: 1 }} disabled={saving} onClick={() => save(null)}>Les plus pratiqués</button>
        <button style={{ ...styles.primaryBtn, flex: 1 }} disabled={saving || !selected.length} onClick={() => save(selected)}>
          <Check size={16} style={{ marginRight: 6 }} />Valider ({selected.length})
        </button>
      </div>
    </Modal>
  );
}
