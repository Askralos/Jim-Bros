import { useState } from "react";
import { Dumbbell, LogOut, Calendar, Plus, Users, BookOpen, User } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { signOut } from "../lib/api/auth";
import { PresetsEditor } from "./PresetsEditor";
import { Modal } from "./Modal";
import { ComparePicker } from "./CompareSession";
import { entryDraftFrom } from "./SessionEntryForm";
import { presetToExercises } from "../lib/utils";

export function TopBar({ profile }) {
  return (
    <div style={styles.topBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Dumbbell size={18} color={COLORS.lime} />
        <span style={{ fontWeight: 700, letterSpacing: 1, fontSize: 14 }}>JIM BROS</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: COLORS.muted }}>{profile?.display_name}</span>
        <button style={styles.iconBtn} onClick={() => { if (confirm("Se déconnecter ?")) signOut(); }} aria-label="Déconnexion"><LogOut size={16} /></button>
      </div>
    </div>
  );
}

export function BottomNav({ view, setView, onNewSession }) {
  const items = [
    { key: "home", label: "Feed", icon: Calendar },
    { key: "exercises", label: "Exos", icon: BookOpen },
    { key: "log", label: "Séance", icon: Plus, isCenter: true },
    { key: "friends", label: "Amis", icon: Users },
    { key: "profile", label: "Profil", icon: User },
  ];
  return (
    <div style={styles.bottomNav}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.key || (it.key === "home" && view === "calendar");
        if (it.isCenter) {
          return <button key={it.key} onClick={onNewSession} style={styles.centerNavBtn} aria-label="Créer une séance"><Icon size={22} color="#111214" /></button>;
        }
        return (
          <button key={it.key} onClick={() => setView(it.key)} style={{ ...styles.navBtn, color: active ? COLORS.lime : COLORS.muted }}>
            <Icon size={19} />
            <span style={{ fontSize: 10, marginTop: 2 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Menu du bouton "+" : reprendre la séance en cours (brouillon), ou en démarrer une
// nouvelle (vierge, depuis un preset, ou copiée d'une de mes séances passées).
// onStart(initial) : initial = null (vierge) ou { title?, sessionTypes?, exercises }.
export function NewSessionChooser({
  presets, exerciseList, currentUserId, profiles, sessions, hasDraft,
  onResume, onStart, onClose,
  onCreatePreset, onUpdatePreset, onDeletePreset,
}) {
  const [showPresets, setShowPresets] = useState(false);
  const [showPast, setShowPast] = useState(false);

  return (
    <Modal title="Nouvelle séance" onClose={onClose} onDismiss={false}>
      {hasDraft && (
        <>
          <button style={{ ...styles.primaryBtn, marginBottom: 6 }} onClick={onResume}>Reprendre la séance en cours</button>
          <p style={{ fontSize: 11, color: COLORS.muted, textAlign: "center", margin: "0 0 14px" }}>Pas encore publiée. Les choix ci-dessous la remplacent.</p>
        </>
      )}
      <button style={{ ...(hasDraft ? styles.secondaryBtn : styles.primaryBtn), marginBottom: 10 }} onClick={() => onStart(null)}>Séance vierge</button>
      <button style={{ ...styles.secondaryBtn, marginBottom: 10 }} onClick={() => setShowPresets(true)}>Depuis un preset</button>
      <button style={styles.secondaryBtn} onClick={() => setShowPast(true)}>Depuis une séance passée</button>
      <button style={{ ...styles.secondaryBtn, marginTop: 14 }} onClick={onClose}>Annuler</button>

      {showPast && (
        <ComparePicker
          title="Refaire une séance passée"
          sessions={sessions}
          currentUserId={currentUserId}
          onClose={() => setShowPast(false)}
          onSelect={(id) => {
            const session = sessions.find((s) => s.id === id);
            const entry = session.entries[currentUserId];
            onStart({ title: session.title || "", sessionTypes: entry.sessionTypes || [], exercises: entryDraftFrom(entry).exercises });
          }}
        />
      )}

      {showPresets && (
        <Modal title="Choisir un preset" onClose={() => setShowPresets(false)}>
          <PresetsEditor
            exerciseList={exerciseList}
            currentUserId={currentUserId}
            profiles={profiles}
            presets={presets}
            onCreate={onCreatePreset}
            onUpdate={onUpdatePreset}
            onDelete={onDeletePreset}
            onSelect={(p) => onStart({ exercises: presetToExercises(p) })}
          />
        </Modal>
      )}
    </Modal>
  );
}
