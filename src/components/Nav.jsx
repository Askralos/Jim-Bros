import { useState } from "react";
import { Dumbbell, LogOut, Calendar, Trophy, Plus, Users, BookOpen, User } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { signOut } from "../lib/api/auth";
import { PresetsEditor } from "./PresetsEditor";
import { Modal } from "./Modal";

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
    // Masqué de la barre (peu utilisé) mais l'écran Classement est conservé :
    // passer hidden à false pour le réafficher.
    { key: "leaderboard", label: "Classement", icon: Trophy, hidden: true },
  ];
  return (
    <div style={styles.bottomNav}>
      {items.filter((it) => !it.hidden).map((it) => {
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

export function NewSessionChooser({
  presets, exerciseList, currentUserId, profiles,
  onBlank, onPreset, onClose,
  onCreatePreset, onUpdatePreset, onDeletePreset,
}) {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <Modal title="Nouvelle séance" onClose={onClose} onDismiss={false}>
      <button style={{ ...styles.primaryBtn, marginBottom: 10 }} onClick={onBlank}>Séance vierge</button>
      <button style={styles.secondaryBtn} onClick={() => setShowPresets(true)}>Depuis un preset</button>
      <button style={{ ...styles.secondaryBtn, marginTop: 14 }} onClick={onClose}>Annuler</button>

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
            onSelect={(p) => { onPreset(p); setShowPresets(false); }}
          />
        </Modal>
      )}
    </Modal>
  );
}
