import { styles } from "../lib/styles";

// Durée d'une séance saisie en heures + minutes plutôt qu'un nombre de minutes
// brut (moins intuitif à taper/lire). Stocke toujours le total en minutes en
// interne (valueMin), comme avant — seule la saisie change.
export function DurationInput({ valueMin, onChange }) {
  const total = Number(valueMin) || 0;
  const h = total === 0 ? "" : Math.floor(total / 60);
  const m = total === 0 ? "" : total % 60;

  const update = (hoursStr, minutesStr) => {
    if (hoursStr === "" && minutesStr === "") { onChange(""); return; }
    const hh = hoursStr === "" ? 0 : Number(hoursStr);
    const mm = minutesStr === "" ? 0 : Number(minutesStr);
    onChange(String(hh * 60 + mm));
  };

  return (
    <div style={{ display: "flex", gap: 6, flex: 1 }}>
      <input
        style={{ ...styles.input, marginBottom: 0, flex: 1 }}
        placeholder="Heures" type="number" min="0" inputMode="numeric"
        value={h} onChange={(e) => update(e.target.value, m === "" ? "" : String(m))}
      />
      <input
        style={{ ...styles.input, marginBottom: 0, flex: 1 }}
        placeholder="Minutes" type="number" min="0" max="59" inputMode="numeric"
        value={m} onChange={(e) => update(h === "" ? "" : String(h), e.target.value)}
      />
    </div>
  );
}
