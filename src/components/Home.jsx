import { useMemo } from "react";
import { Camera, ChevronRight, Dumbbell } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS, feelingLabel } from "../lib/constants";
import { todayKey, fmtDate, volumeOf } from "../lib/utils";
import { AvatarStack } from "./Avatar";

export function Home({ currentUserId, profiles, sessions, onOpenSession, onNewSession, onSeeCalendar }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(todayKey(d));
    }
    return arr;
  }, []);

  const sessionsByDay = useMemo(() => {
    const map = {};
    sessions.forEach((s) => { map[s.date] = map[s.date] || []; map[s.date].push(s); });
    return map;
  }, [sessions]);

  const postedToday = (sessionsByDay[todayKey()] || []).some((s) => s.entries[currentUserId]);

  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7; // lundi=0 ... dimanche=6
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - mondayOffset);
    const startOfWeekKey = todayKey(startOfWeek);
    const startOfPrevWeek = new Date(startOfWeek); startOfPrevWeek.setDate(startOfWeek.getDate() - 7);
    const startOfPrevWeekKey = todayKey(startOfPrevWeek);
    return {
      thisWeek: sessions.filter((s) => s.date >= startOfWeekKey),
      lastWeek: sessions.filter((s) => s.date >= startOfPrevWeekKey && s.date < startOfWeekKey),
    };
  }, [sessions]);

  return (
    <div style={styles.screen}>
      <div style={styles.weekRow}>
        {days.map((d) => {
          const list = sessionsByDay[d] || [];
          const isToday = d === todayKey();
          return (
            <div key={d} style={styles.dayCol}>
              <span style={{ fontSize: 10, color: isToday ? COLORS.blue : COLORS.muted, marginBottom: 6 }}>
                {new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3)}
              </span>
              <div style={{ ...styles.plate, background: list.length ? COLORS.lime : COLORS.surface2, border: isToday ? `2px solid ${COLORS.blue}` : `1px solid ${COLORS.line}` }}>
                {list.length > 0 && <span style={{ color: "#111214", fontWeight: 700, fontSize: 12 }}>{list.length}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!postedToday && (
        <button style={styles.ctaBanner} onClick={onNewSession}>
          <Camera size={16} /><span>Pas encore posté aujourd'hui — go séance</span><ChevronRight size={16} />
        </button>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ ...styles.sectionTitle, margin: "18px 0 10px" }}>Activité de la squad</h2>
        <button style={styles.linkBtn} onClick={onSeeCalendar}>Voir plus</button>
      </div>

      {sessions.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Personne n'a encore posté de séance. Sois le premier.</p>}

      {thisWeek.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Cette semaine</p>
          <SessionList sessions={thisWeek} profiles={profiles} onOpenSession={onOpenSession} />
        </>
      )}
      {lastWeek.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" }}>Semaine dernière</p>
          <SessionList sessions={lastWeek} profiles={profiles} onOpenSession={onOpenSession} />
        </>
      )}
    </div>
  );
}

function SessionList({ sessions, profiles, onOpenSession }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sessions.map((s) => (
        <SessionFeedCard key={s.id} session={s} profiles={profiles} onClick={() => onOpenSession(s.id)} />
      ))}
    </div>
  );
}

export function SessionFeedCard({ session, profiles, onClick }) {
  const participants = session.participants;
  const submittedVolume = Object.values(session.entries).reduce((t, e) => t + volumeOf(e.exercises, e.bodyweightKg), 0);
  return (
    <div style={styles.feedCard} onClick={onClick}>
      {session.photo ? (
        <img src={session.photo} alt="" style={styles.feedPhoto} />
      ) : (
        <div style={{ ...styles.feedPhoto, display: "flex", alignItems: "center", justifyContent: "center" }}><Dumbbell size={22} color={COLORS.muted} /></div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <AvatarStack userIds={participants} profiles={profiles} size={22} />
          <span style={{ fontSize: 11, color: COLORS.muted }}>{fmtDate(session.date)}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, display: "block", marginTop: 4 }}>{session.title || "Séance"}</span>
        <span style={{ fontSize: 12, color: COLORS.muted }}>
          {Object.keys(session.entries).length}/{participants.length} ont posté leurs stats · {submittedVolume.toLocaleString("fr-FR")} kg
          {session.durationMin ? ` · ${session.durationMin} min` : ""}
          {session.feeling ? ` · ${feelingLabel(session.feeling)}` : ""}
        </span>
      </div>
    </div>
  );
}
