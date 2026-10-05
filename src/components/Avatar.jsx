import { COLORS } from "../lib/constants";

export function Avatar({ profile, size = 34 }) {
  const src = profile?.avatar_url;
  const initial = profile?.display_name?.[0]?.toUpperCase() || "?";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: COLORS.surface2, display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: size * 0.4, overflow: "hidden", border: `1px solid ${COLORS.line}`,
      }}
    >
      {src ? <img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
    </div>
  );
}

// Les invités (sans compte) apparaissent après les membres, en pastille à l'initiale
// avec un contour pointillé pour les distinguer.
export function AvatarStack({ userIds, profiles, guests = [], size = 28 }) {
  const people = [
    ...userIds.map((id) => ({ key: id, profile: profiles[id] })),
    ...guests.map((g, i) => ({ key: `guest-${i}`, profile: { display_name: g }, guest: true })),
  ].slice(0, 5);
  return (
    <div style={{ display: "flex" }}>
      {people.map((p, i) => (
        <div key={p.key} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i, ...(p.guest ? { borderRadius: "50%", outline: `1px dashed ${COLORS.muted}` } : {}) }}>
          <Avatar profile={p.profile} size={size} />
        </div>
      ))}
    </div>
  );
}
