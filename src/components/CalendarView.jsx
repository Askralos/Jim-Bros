import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { todayKey, fmtDate } from "../lib/utils";
import { AvatarStack } from "./Avatar";

export function CalendarView({ sessions, profiles, onOpenSession, onBack }) {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const sessionsByDay = useMemo(() => {
    const map = {};
    sessions.forEach((s) => { map[s.date] = map[s.date] || []; map[s.date].push(s); });
    return map;
  }, [sessions]);

  const cells = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  const [selectedDay, setSelectedDay] = useState(null);
  const monthLabel = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div style={styles.screen}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button style={styles.iconBtn} onClick={onBack}><ChevronLeft size={18} /></button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Calendrier</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button style={styles.iconBtn} onClick={() => { const m = new Date(month); m.setMonth(m.getMonth() - 1); setMonth(m); }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{monthLabel}</span>
        <button style={styles.iconBtn} onClick={() => { const m = new Date(month); m.setMonth(m.getMonth() + 1); setMonth(m); }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 16 }}>
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, color: COLORS.muted }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const key = todayKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const list = sessionsByDay[key] || [];
          const isToday = key === todayKey();
          return (
            <div
              key={i}
              onClick={() => list.length && setSelectedDay(key)}
              style={{
                aspectRatio: "1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: list.length ? COLORS.lime : COLORS.surface, opacity: inMonth ? 1 : 0.35,
                border: isToday ? `2px solid ${COLORS.blue}` : `1px solid ${COLORS.line}`,
                cursor: list.length ? "pointer" : "default",
              }}
            >
              <span style={{ fontSize: 11, color: list.length ? "#111214" : COLORS.chalk, fontWeight: list.length ? 700 : 400 }}>{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div>
          <h2 style={styles.sectionTitle}>{fmtDate(selectedDay)}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(sessionsByDay[selectedDay] || []).map((s) => (
              <div key={s.id} style={styles.historyRow} onClick={() => onOpenSession(s.id)}>
                {s.photo && <img src={s.photo} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover" }} />}
                <AvatarStack userIds={s.participants} profiles={profiles} size={22} />
                <span style={{ fontSize: 13 }}>{s.title || "Séance"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
