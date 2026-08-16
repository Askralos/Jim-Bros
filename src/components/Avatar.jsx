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
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
    </div>
  );
}

export function AvatarStack({ userIds, profiles, size = 28 }) {
  return (
    <div style={{ display: "flex" }}>
      {userIds.slice(0, 5).map((id, i) => (
        <div key={id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i }}>
          <Avatar profile={profiles[id]} size={size} />
        </div>
      ))}
    </div>
  );
}
