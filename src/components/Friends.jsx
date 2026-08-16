import { useState, useMemo } from "react";
import { ChevronRight, X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { fmtDate, computeProfileInsights } from "../lib/utils";
import { Avatar } from "./Avatar";
import { MetricCard } from "./ProfileScreen";

export function Friends({ currentUserId, profiles, entries, sessions, prsByUser, onOpenSession }) {
  const others = Object.values(profiles).filter((p) => p.id !== currentUserId);

  const together = (id) => sessions.filter((s) => s.entries?.[currentUserId] && s.entries?.[id]).length;
  const countFor = (id) => sessions.filter((s) => s.entries?.[id]).length;

  const sessionById = useMemo(() => { const m = {}; sessions.forEach((s) => (m[s.id] = s)); return m; }, [sessions]);
  const lastSeanceDate = (id) => {
    const mine = entries.filter((e) => e.userId === id).map((e) => sessionById[e.sessionId]?.date).filter(Boolean).sort();
    return mine.length ? mine[mine.length - 1] : null;
  };

  const [sortBy, setSortBy] = useState("together");
  const [asc, setAsc] = useState(false);
  const [openFriend, setOpenFriend] = useState(null);

  const rows = others.map((p) => ({ p, count: countFor(p.id), lastDate: lastSeanceDate(p.id), tog: together(p.id) }));

  const sortKey = { together: "tog", count: "count", last: "lastDate" }[sortBy];
  const sorted = [...rows].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === "lastDate") { av = av || ""; bv = bv || ""; }
    if (av < bv) return asc ? -1 : 1;
    if (av > bv) return asc ? 1 : -1;
    return 0;
  });

  const sortOptions = [
    { key: "together", label: "Séances ensemble" },
    { key: "count", label: "Nombre de séances" },
    { key: "last", label: "Dernière séance" },
  ];

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>La squad ({others.length})</h2>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        {sortOptions.map((o) => (
          <button key={o.key} onClick={() => setSortBy(o.key)} style={{ ...styles.tabPill, ...(sortBy === o.key ? styles.tabPillActive : {}) }}>{o.label}</button>
        ))}
        <button style={styles.iconBtn} onClick={() => setAsc((a) => !a)} aria-label="Inverser l'ordre">{asc ? "↑" : "↓"}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Vous êtes seul pour l'instant, invite tes potes à créer un compte.</p>}
        {sorted.map(({ p, count, lastDate, tog }) => (
          <div key={p.id} style={{ ...styles.friendRow, cursor: "pointer" }} onClick={() => setOpenFriend(p.id)}>
            <Avatar profile={p} size={38} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.display_name}</span>
              <div style={{ fontSize: 11, color: COLORS.muted }}>
                {count} séances · {tog} avec toi{lastDate ? ` · dernière ${fmtDate(lastDate)}` : ""}
              </div>
            </div>
            <ChevronRight size={16} color={COLORS.muted} />
          </div>
        ))}
      </div>

      {openFriend && (
        <FriendProfileModal
          userId={openFriend} profile={profiles[openFriend]}
          entries={entries} sessions={sessions} prs={prsByUser[openFriend] || []}
          onClose={() => setOpenFriend(null)}
          onOpenSession={(id) => { setOpenFriend(null); onOpenSession(id); }}
        />
      )}
    </div>
  );
}

function FriendProfileModal({ userId, profile, entries, sessions, prs, onClose, onOpenSession }) {
  const { myEntries, bestProgress } = useMemo(() => computeProfileInsights(userId, entries, sessions), [entries, sessions, userId]);
  const hasMeasurements = profile.arm_cm || profile.chest_cm || profile.waist_cm || profile.thigh_cm;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar profile={profile} size={44} />
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{profile.display_name}</p>
              {profile.objectif && <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>{profile.objectif}</p>}
            </div>
          </div>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <MetricCard label="Poids" value={profile.weight_kg ? `${profile.weight_kg} kg` : "—"} />
          <MetricCard label="Séances" value={myEntries.length} />
          <MetricCard label="Meilleure progression" value={bestProgress ? `${bestProgress.name} +${bestProgress.delta}kg` : "—"} />
        </div>

        {profile.height_cm && <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>Taille : {profile.height_cm} cm</p>}
        {hasMeasurements && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {profile.arm_cm && <span style={styles.setChip}>Bras {profile.arm_cm}cm</span>}
            {profile.chest_cm && <span style={styles.setChip}>Poitrine {profile.chest_cm}cm</span>}
            {profile.waist_cm && <span style={styles.setChip}>Taille {profile.waist_cm}cm</span>}
            {profile.thigh_cm && <span style={styles.setChip}>Cuisse {profile.thigh_cm}cm</span>}
          </div>
        )}

        {prs.length > 0 && (
          <>
            <h2 style={{ ...styles.sectionTitle, marginTop: 4 }}>PR</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {prs.map((pr) => (
                <div key={pr.id} style={styles.prChip}>
                  <span style={{ fontSize: 11, color: COLORS.muted }}>{pr.exercise}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: COLORS.lime }}>{pr.value}{pr.unit}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 style={styles.sectionTitle}>Historique ({myEntries.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {myEntries.slice(0, 15).map((e) => (
            <div key={e.sessionId} style={styles.historyRow} onClick={() => onOpenSession(e.sessionId)}>
              <span style={{ fontSize: 13 }}>{e.session.title || e.exercises.map((x) => x.name).join(", ")}</span>
              <span style={{ fontSize: 11, color: COLORS.muted }}>{fmtDate(e.session.date)}</span>
            </div>
          ))}
          {myEntries.length === 0 && <p style={{ color: COLORS.muted, fontSize: 13 }}>Pas encore de séance postée.</p>}
        </div>
      </div>
    </div>
  );
}
