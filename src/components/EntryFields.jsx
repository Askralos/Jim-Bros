import { useState } from "react";
import { GitCompare, Loader2 } from "lucide-react";
import { styles } from "../lib/styles";
import { SESSION_FEELINGS } from "../lib/constants";
import { ExercisesEditor } from "./ExercisesEditor";
import { ComparePicker, CompareReference } from "./CompareSession";

// Champs communs à la saisie de ses stats, que ce soit en créant une séance
// (NewSession) ou en remplissant/modifiant les siennes (SessionEntryForm).

// "Tes exercices" : l'éditeur, avec le bouton Comparer et le panneau de la séance
// passée choisie comme référence. excludeSessionId : la séance en cours d'édition,
// qu'on ne propose pas dans la liste.
export function ExercisesSection({ exercises, onChange, exerciseList, sessions, currentUserId, excludeSessionId }) {
  const [compareSessionId, setCompareSessionId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const compareSession = sessions.find((s) => s.id === compareSessionId) || null;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 8 }}>
        <span style={styles.label}>Tes exercices</span>
        {!compareSession && (
          <button style={{ ...styles.linkBtn, display: "flex", alignItems: "center", gap: 4 }} onClick={() => setShowPicker(true)}>
            <GitCompare size={13} />Comparer
          </button>
        )}
      </div>

      {compareSession && (
        <CompareReference
          session={compareSession}
          currentUserId={currentUserId}
          onChange={() => setShowPicker(true)}
          onRemove={() => setCompareSessionId(null)}
        />
      )}

      <ExercisesEditor exercises={exercises} onChange={onChange} exerciseList={exerciseList} />

      {showPicker && (
        <ComparePicker
          sessions={sessions}
          currentUserId={currentUserId}
          excludeId={excludeSessionId}
          onClose={() => setShowPicker(false)}
          onSelect={(id) => { setCompareSessionId(id); setShowPicker(false); }}
        />
      )}
    </>
  );
}

export function FeelingCommentFields({ feeling, onFeelingChange, comment, onCommentChange }) {
  return (
    <>
      <label style={{ ...styles.label, marginTop: 18 }}>Ton feeling (optionnel)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {SESSION_FEELINGS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFeelingChange(feeling === f.key ? null : f.key)}
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
        onChange={(e) => onCommentChange(e.target.value)}
      />
    </>
  );
}

// Bouton d'envoi d'un formulaire, avec son état "en cours".
export function SubmitButton({ busy, disabled, onClick, icon: Icon, label, busyLabel, style }) {
  return (
    <button style={{ ...styles.primaryBtn, ...style }} disabled={disabled || busy} onClick={onClick}>
      {busy ? (
        <><Loader2 size={16} style={{ marginRight: 6, animation: "spin 0.7s linear infinite" }} />{busyLabel}</>
      ) : (
        <>{Icon && <Icon size={16} style={{ marginRight: 6 }} />}{label}</>
      )}
    </button>
  );
}
