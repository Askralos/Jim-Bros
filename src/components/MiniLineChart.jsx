import { useEffect, useRef, useState } from "react";
import { COLORS } from "../lib/constants";

const MARGIN = { top: 10, side: 8 };
const GRID_LINES = 3;

// Courbe SVG minimaliste (une série, points reliés, info-bulle au toucher). Remplace
// une librairie de graphiques complète, bien trop lourde pour trois petites courbes.
// points : [{ label, value, axisLabel? }] dans l'ordre d'affichage. label = texte de
// l'info-bulle ; axisLabel = texte court sous l'axe si showAxis (défaut : label). pad = marge ajoutée sous/au-dessus des valeurs extrêmes.
export function MiniLineChart({ points, height = 140, unit = "", name, pad = [0, 1], showAxis = false }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = points.length;
  const values = points.map((p) => Number(p.value) || 0);
  const min = Math.min(...values) - pad[0];
  const max = Math.max(...values) + pad[1];
  const span = max - min || 1;
  const bottom = showAxis ? 20 : 8;
  const innerW = Math.max(1, width - 2 * MARGIN.side);
  const innerH = height - MARGIN.top - bottom;
  const x = (i) => MARGIN.side + (n > 1 ? (i * innerW) / (n - 1) : innerW / 2);
  const y = (v) => MARGIN.top + innerH - ((v - min) / span) * innerH;

  const pick = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - MARGIN.side) / innerW;
    setActive(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  };

  // Repères sur l'axe : premier, milieu, dernier.
  const ticks = showAxis ? [...new Set([0, Math.round((n - 1) / 2), n - 1])] : [];
  const cur = active != null && active < n ? points[active] : null;

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: "100%", height, touchAction: "pan-y", userSelect: "none" }}
      onPointerDown={pick}
      onPointerMove={pick}
      onPointerLeave={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} style={{ display: "block" }}>
          {Array.from({ length: GRID_LINES }, (_, k) => {
            const gy = MARGIN.top + (k * innerH) / (GRID_LINES - 1);
            return <line key={k} x1={MARGIN.side} x2={width - MARGIN.side} y1={gy} y2={gy} stroke={COLORS.line} strokeDasharray="3 3" />;
          })}
          {cur && <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke={COLORS.muted} strokeWidth={1} />}
          <polyline
            fill="none" stroke={COLORS.lime} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          />
          {values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={i === active ? 4 : 2} fill={i === active ? COLORS.lime : COLORS.surface} stroke={COLORS.lime} strokeWidth={1.5} />
          ))}
          {ticks.map((i) => (
            <text
              key={i} x={x(i)} y={height - 5} fontSize={10} fill={COLORS.muted}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            >
              {points[i].axisLabel ?? points[i].label}
            </text>
          ))}
        </svg>
      )}
      {cur && (
        <div
          style={{
            position: "absolute", top: 0, pointerEvents: "none", whiteSpace: "nowrap",
            ...(x(active) > width / 2 ? { right: width - x(active) + 8 } : { left: x(active) + 8 }),
            background: COLORS.surface2, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "5px 8px", fontSize: 12,
          }}
        >
          <div style={{ color: COLORS.muted }}>{cur.label}</div>
          <div style={{ fontWeight: 700 }}>{name ? `${name} : ` : ""}{cur.value}{unit}</div>
        </div>
      )}
    </div>
  );
}
