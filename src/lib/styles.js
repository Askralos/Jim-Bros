import { COLORS } from "./constants";

export const styles = {
  app: { display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bg, color: COLORS.chalk, fontFamily: "system-ui, -apple-system, sans-serif" },
  bootScreen: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${COLORS.line}`, background: COLORS.surface },
  content: { flex: 1, overflowY: "auto" },
  screen: { padding: "16px 16px 90px", maxWidth: 480, margin: "0 auto" },
  loadingBar: { height: 2, background: COLORS.lime, opacity: 0.6 },
  sectionTitle: { fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: COLORS.muted, margin: "18px 0 10px" },

  authScreen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.bg, color: COLORS.chalk, padding: 24 },
  brand: { fontSize: 22, fontWeight: 800, letterSpacing: 2 },
  authCard: { width: "100%", maxWidth: 320, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 18 },
  tabRow: { display: "flex", marginBottom: 14, background: COLORS.surface2, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, padding: "8px 0", background: "transparent", border: "none", color: COLORS.muted, fontSize: 13, borderRadius: 8, cursor: "pointer" },
  tabBtnActive: { background: COLORS.bg, color: COLORS.lime, fontWeight: 600 },

  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", marginBottom: 10, background: COLORS.surface2, border: `1px solid ${COLORS.line}`, borderRadius: 9, color: COLORS.chalk, fontSize: 14, outline: "none" },
  primaryBtn: { width: "100%", padding: "11px 0", background: COLORS.lime, color: "#111214", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  secondaryBtn: { padding: "9px 14px", background: COLORS.surface2, color: COLORS.chalk, border: `1px solid ${COLORS.line}`, borderRadius: 9, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", marginTop: 4 },
  linkBtn: { background: "none", border: "none", color: COLORS.lime, fontSize: 12, cursor: "pointer", padding: 0 },
  iconBtn: { background: "transparent", border: "none", color: COLORS.chalk, cursor: "pointer", display: "flex", alignItems: "center", padding: 4 },

  weekRow: { display: "flex", justifyContent: "space-between", marginBottom: 16, marginTop: 4 },
  dayCol: { display: "flex", flexDirection: "column", alignItems: "center", width: 38 },
  plate: { width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  ctaBanner: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: COLORS.surface2, border: `1px dashed ${COLORS.line}`, borderRadius: 10, color: COLORS.lime, fontSize: 13, cursor: "pointer", marginBottom: 6 },

  feedCard: { display: "flex", gap: 12, padding: 10, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, cursor: "pointer" },
  feedPhoto: { width: 56, height: 56, borderRadius: 9, objectFit: "cover", background: COLORS.surface2, flexShrink: 0 },

  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 },
  modalCard: { width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto", background: COLORS.surface, borderRadius: "16px 16px 0 0", padding: 18, color: COLORS.chalk },
  setChip: { background: COLORS.surface2, padding: "3px 8px", borderRadius: 6, fontSize: 12, fontFamily: "monospace" },
  sliderNavBtn: { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "rgba(17,18,20,0.7)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.chalk, cursor: "pointer" },

  photoZone: { width: "100%", height: 140, borderRadius: 10, background: COLORS.surface, border: `1px dashed ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, cursor: "pointer" },
  exCard: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 12, marginBottom: 10 },
  setInput: { flex: 1, padding: "8px 10px", background: COLORS.surface2, border: `1px solid ${COLORS.line}`, borderRadius: 8, color: COLORS.chalk, fontSize: 13 },

  statsCard: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 6 },
  weightRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface2, border: `1px solid ${COLORS.line}`, borderRadius: 9, padding: "10px 12px", cursor: "pointer" },
  label: { fontSize: 11, color: COLORS.muted, marginBottom: 4, display: "block" },
  prChip: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 100 },
  historyRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 10px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 9, cursor: "pointer" },

  friendRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10 },

  tabPill: { padding: "6px 12px", borderRadius: 20, background: COLORS.surface, border: `1px solid ${COLORS.line}`, color: COLORS.muted, fontSize: 12, cursor: "pointer" },
  tabPillActive: { background: COLORS.lime, color: "#111214", border: `1px solid ${COLORS.lime}`, fontWeight: 700 },
  rankRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10 },

  bottomNav: { display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 10px 10px", background: COLORS.surface, borderTop: `1px solid ${COLORS.line}` },
  navBtn: { display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer" },
  centerNavBtn: { width: 46, height: 46, borderRadius: "50%", background: COLORS.lime, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -18, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" },
};
