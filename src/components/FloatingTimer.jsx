import { useEffect, useRef, useState } from "react";
import { Timer, X, Play, Pause, RotateCcw } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";

// Chrono flottant pendant la saisie d'une séance : un chronomètre libre + un minuteur
// de repos, pour ne pas sortir de l'app. L'état est basé sur des horodatages et
// gardé en localStorage : il continue de tourner si on ferme le formulaire, change
// d'écran ou si le téléphone se verrouille.
const STORAGE_KEY = "jimbros.timer";
const REST_PRESETS = [45, 60, 90, 120, 180];
const EMPTY = { swStart: null, swAcc: 0, cdEnd: null, cdTotal: 0 };

function load() {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return EMPTY; }
}
function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* stockage indisponible : le chrono marche quand même */ }
}

export const fmtClock = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

// Petit bip de fin de repos (l'AudioContext doit être créé sur un geste de
// l'utilisateur, d'où le ref initialisé au lancement du minuteur).
function beep(ctx) {
  if (!ctx) return;
  [0, 0.25, 0.5].forEach((t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.2);
  });
}

export function FloatingTimer({ bottom = "calc(84px + env(safe-area-inset-bottom))" }) {
  const [state, setState] = useState(load);
  const [open, setOpen] = useState(false);
  const [restDone, setRestDone] = useState(false);
  const [now, setNow] = useState(Date.now());
  const audioRef = useRef(null);

  const update = (patch) => setState((s) => { const next = { ...s, ...patch }; save(next); return next; });

  const swRunning = state.swStart != null;
  const swElapsed = state.swAcc + (swRunning ? now - state.swStart : 0);
  const cdRunning = state.cdEnd != null;
  const cdLeft = cdRunning ? state.cdEnd - now : 0;

  useEffect(() => {
    if (!swRunning && !cdRunning) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [swRunning, cdRunning]);

  // Fin du repos : vibration + bip, et le bouton flotte en vert jusqu'au prochain tap.
  useEffect(() => {
    if (cdRunning && cdLeft <= 0) {
      update({ cdEnd: null });
      setRestDone(true);
      try { navigator.vibrate?.([300, 120, 300]); } catch { /* pas de vibreur */ }
      beep(audioRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdRunning, cdLeft]);

  const toggleStopwatch = () => {
    const t = Date.now();
    setNow(t);
    if (swRunning) update({ swStart: null, swAcc: state.swAcc + (t - state.swStart) });
    else update({ swStart: t });
  };
  const resetStopwatch = () => update({ swStart: null, swAcc: 0 });

  const startRest = (sec) => {
    try {
      audioRef.current = audioRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioRef.current.resume?.();
    } catch { /* pas de son possible : la vibration suffit */ }
    const t = Date.now();
    setNow(t);
    setRestDone(false);
    update({ cdEnd: t + sec * 1000, cdTotal: sec * 1000 });
  };
  const addRest = (sec) => update({ cdEnd: state.cdEnd + sec * 1000, cdTotal: state.cdTotal + sec * 1000 });

  const fabLabel = restDone ? "Go !" : cdRunning ? fmtClock(cdLeft) : swRunning || swElapsed ? fmtClock(swElapsed) : null;
  const fabActive = restDone || cdRunning || swRunning;

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setRestDone(false); }}
        aria-label="Chronomètre"
        style={{
          position: "fixed", right: 16, bottom, zIndex: 60,
          height: 48, minWidth: 48, padding: fabLabel ? "0 14px" : 0, borderRadius: 24,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: restDone ? COLORS.lime : fabActive ? COLORS.surface2 : COLORS.surface,
          color: restDone ? "#111214" : cdRunning ? COLORS.lime : COLORS.chalk,
          border: `1px solid ${fabActive ? COLORS.lime : COLORS.line}`,
          boxShadow: "0 6px 18px rgba(0,0,0,0.5)", cursor: "pointer",
          fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums",
        }}
      >
        <Timer size={18} />
        {fabLabel}
      </button>

      {open && (
        <div
          style={{
            position: "fixed", right: 16, left: 16, bottom: `calc(${bottom} + 58px)`, zIndex: 60, maxWidth: 360, marginLeft: "auto",
            background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: COLORS.muted }}>Chrono</span>
            <button style={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Fermer"><X size={15} /></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ flex: 1, fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtClock(swElapsed)}</span>
            <button style={{ ...styles.iconBtn, width: 40, height: 40, borderRadius: 20, background: COLORS.lime, color: "#111214", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={toggleStopwatch} aria-label={swRunning ? "Pause" : "Démarrer"}>
              {swRunning ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button style={{ ...styles.iconBtn, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={resetStopwatch} aria-label="Remettre à zéro">
              <RotateCcw size={17} />
            </button>
          </div>

          <span style={{ fontSize: 12, color: COLORS.muted, display: "block", marginBottom: 6 }}>Repos</span>
          {cdRunning ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 26, fontWeight: 700, color: COLORS.lime, fontVariantNumeric: "tabular-nums" }}>{fmtClock(cdLeft)}</span>
              <button style={styles.tabPill} onClick={() => addRest(15)}>+15s</button>
              <button style={styles.tabPill} onClick={() => update({ cdEnd: null })}>Stop</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REST_PRESETS.map((sec) => (
                <button key={sec} style={styles.tabPill} onClick={() => startRest(sec)}>{fmtClock(sec * 1000)}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
