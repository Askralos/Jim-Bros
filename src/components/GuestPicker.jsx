import { useState } from "react";
import { X } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";

// Invités sans compte : pastilles retirables + "+ Invité" qui ouvre un petit champ
// prénom (vide = "Invité"). À placer dans la même ligne que les potes du squad.
export function GuestPills({ guests, onChange }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const add = () => {
    onChange([...guests, name.trim() || "Invité"]);
    setName("");
    setAdding(false);
  };

  return (
    <>
      {guests.map((g, i) => (
        <button
          key={`${g}-${i}`}
          type="button"
          onClick={() => onChange(guests.filter((_, idx) => idx !== i))}
          style={{ ...styles.tabPill, background: "rgba(201,245,66,0.12)", color: COLORS.lime, border: `1px dashed ${COLORS.lime}`, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}
          aria-label={`Retirer ${g}`}
        >
          {g}<X size={11} />
        </button>
      ))}
      {adding ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <input
            autoFocus
            style={{ ...styles.setInput, width: 110, padding: "6px 8px" }}
            placeholder="Prénom (optionnel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
          />
          <button type="button" style={styles.linkBtn} onClick={add}>OK</button>
        </span>
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{ ...styles.tabPill, borderStyle: "dashed" }}>+ Invité</button>
      )}
    </>
  );
}
