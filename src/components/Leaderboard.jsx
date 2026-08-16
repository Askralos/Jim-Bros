import { useState, useMemo } from "react";
import { Flame } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { todayKey, norm, volumeOf, computeStreak } from "../lib/utils";

export function Leaderboard({ profiles, entries, sessions, currentUserId, exerciseList, prsByUser }) {
  const [metric, setMetric] = useState("ratio");
  const [prQuery, setPrQuery] = useState("");
  const sessionById = useMemo(() => { const m = {}; sessions.forEach((s) => (m[s.id] = s)); return m; }, [sessions]);

  const now = new Date();
  const startOfMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const streakFor = (userId) => {
    const dates = [...new Set(entries.filter((e) => e.userId === userId).map((e) => sessionById[e.sessionId]?.date).filter(Boolean))].sort().reverse();
    return computeStreak(dates);
  };

  const rows = Object.values(profiles).map((p) => {
    const mine = entries.filter((e) => e.userId === p.id).map((e) => ({ ...e, session: sessionById[e.sessionId] })).filter((e) => e.session);
    const weeksSinceJoin = Math.max(1, (Date.now() - new Date(p.created_at).getTime()) / (7 * 24 * 3600 * 1000));
    return {
      userId: p.id, displayName: p.display_name,
      ratio: mine.length / weeksSinceJoin,
      volume: mine.filter((e) => e.session.date >= startOfMonthKey).reduce((t, e) => t + volumeOf(e.exercises), 0),
      streak: streakFor(p.id),
    };
  });

  const metrics = [
    { key: "ratio", label: "Séances/semaine", fmt: (v) => `${v.toFixed(1)}/sem` },
    { key: "volume", label: "Volume (mois)", fmt: (v) => `${v.toLocaleString("fr-FR")} kg` },
    { key: "streak", label: "Streak", fmt: (v) => `${v} j` },
  ];
  const activeMetric = metrics.find((m) => m.key === metric);
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);

  const allPrs = useMemo(() => {
    const list = [];
    Object.entries(prsByUser).forEach(([userId, prs]) => {
      prs.forEach((pr) => list.push({ userId, displayName: profiles[userId]?.display_name || "?", ...pr }));
    });
    return list;
  }, [prsByUser, profiles]);

  const q = norm(prQuery.trim());
  let prResults;
  if (!q) {
    const byExo = {};
    allPrs.forEach((pr) => {
      const k = norm(pr.exercise);
      if (!byExo[k] || pr.value > byExo[k].value) byExo[k] = pr;
    });
    prResults = Object.values(byExo).sort((a, b) => a.exercise.localeCompare(b.exercise)).slice(0, 8);
  } else {
    prResults = allPrs.filter((pr) => norm(pr.exercise).includes(q)).sort((a, b) => b.value - a.value);
  }

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Classement</h2>
      <p style={{ color: COLORS.muted, fontSize: 12, marginBottom: 14 }}>Pour le fun, pas pour la pression.</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {metrics.map((m) => (
          <button key={m.key} onClick={() => setMetric(m.key)} style={{ ...styles.tabPill, ...(metric === m.key ? styles.tabPillActive : {}) }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {sorted.map((r, i) => (
          <div key={r.userId} style={styles.rankRow}>
            <span style={{ width: 22, color: COLORS.muted, fontSize: 12 }}>#{i + 1}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: r.userId === currentUserId ? 700 : 400 }}>{r.displayName}{r.userId === currentUserId ? " (toi)" : ""}</span>
            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: i === 0 ? COLORS.lime : COLORS.chalk }}>{activeMetric.fmt(r[metric])}</span>
            {r.streak > 2 && metric !== "streak" && <span style={{ display: "flex", alignItems: "center", gap: 3, color: COLORS.flame, fontSize: 12, marginLeft: 6 }}><Flame size={13} />{r.streak}</span>}
          </div>
        ))}
      </div>

      <h2 style={styles.sectionTitle}>PR de la squad</h2>
      <datalist id="lb-exo-options">
        {exerciseList.map((e) => <option key={e.id} value={e.name} />)}
      </datalist>
      <input style={styles.input} list="lb-exo-options" placeholder="Rechercher un exercice..." value={prQuery} onChange={(e) => setPrQuery(e.target.value)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {prResults.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>{q ? "Personne n'a déclaré de PR sur cet exercice." : "Personne n'a encore déclaré de PR dans son profil."}</p>}
        {prResults.map((pr, i) => (
          <div key={`${pr.userId}-${pr.id}`} style={styles.rankRow}>
            {q && <span style={{ width: 22, color: COLORS.muted, fontSize: 12 }}>#{i + 1}</span>}
            <span style={{ flex: 1, fontSize: 14, fontWeight: pr.userId === currentUserId ? 700 : 400 }}>
              {pr.displayName}{pr.userId === currentUserId ? " (toi)" : ""}
              {!q && <span style={{ color: COLORS.muted, fontWeight: 400 }}> · {pr.exercise}</span>}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: !q || i === 0 ? COLORS.lime : COLORS.chalk }}>{pr.value}{pr.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
