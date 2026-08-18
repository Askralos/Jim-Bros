import { Dumbbell, LogOut, Calendar, Trophy, Plus, Users, BookOpen, User } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { signOut } from "../lib/api/auth";

export function TopBar({ profile }) {
  return (
    <div style={styles.topBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Dumbbell size={18} color={COLORS.lime} />
        <span style={{ fontWeight: 700, letterSpacing: 1, fontSize: 14 }}>JIM BROS</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: COLORS.muted }}>{profile?.display_name}</span>
        <button style={styles.iconBtn} onClick={signOut} aria-label="Déconnexion"><LogOut size={16} /></button>
      </div>
    </div>
  );
}

export function BottomNav({ view, setView, onNewSession }) {
  const items = [
    { key: "home", label: "Feed", icon: Calendar },
    { key: "leaderboard", label: "Classement", icon: Trophy },
    { key: "log", label: "Séance", icon: Plus, isCenter: true },
    { key: "friends", label: "Amis", icon: Users },
    { key: "exercises", label: "Exos", icon: BookOpen },
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

export function NewSessionChooser({ presets, onBlank, onPreset, onClose }) {
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>Nouvelle séance</span>
        </div>
        <button style={{ ...styles.primaryBtn, marginBottom: 10 }} onClick={onBlank}>Séance vierge</button>
        {presets.length > 0 && (
          <>
            <p style={{ ...styles.label, marginTop: 4 }}>Ou depuis un preset</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {presets.map((p) => (
                <div key={p.id} style={{ ...styles.friendRow, cursor: "pointer" }} onClick={() => onPreset(p)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, display: "block" }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: COLORS.muted }}>{p.exercises.map((e) => e.name).join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <button style={{ ...styles.secondaryBtn, marginTop: 14 }} onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}
