import { COLORS } from "../lib/constants";

export function MetricCard({ label, value }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", flex: "1 1 100px" }}>
      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
