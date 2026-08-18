import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Check, TrendingUp, ChevronRight, Pencil } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { styles } from "../lib/styles";
import { COLORS, MEASUREMENT_TYPES } from "../lib/constants";
import { fmtDate, todayKey, computeProfileInsights } from "../lib/utils";
import { Avatar } from "./Avatar";
import { uploadPhoto } from "../lib/api/storage";
import { addWeightEntry, getWeightHistory, addMeasurementEntry, getMeasurementHistory } from "../lib/api/profiles";

export function ProfileScreen({ currentUserId, profile, entries, sessions, prs, exerciseList, onSave, onAddPr, onDeletePr, onOpenSession, onRefresh }) {
  const [form, setForm] = useState(profile);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [openMeasurement, setOpenMeasurement] = useState(null); // clé du type ouvert (arm/chest/waist/thigh)
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [weightHistory, setWeightHistory] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.display_name);
  const fileRef = useRef(null);
  const avatarGalleryRef = useRef(null);

  const loadWeightHistory = useCallback(async () => {
    setWeightHistory(await getWeightHistory(currentUserId));
  }, [currentUserId]);

  useEffect(() => { loadWeightHistory(); }, [loadWeightHistory]);
  useEffect(() => { setForm(profile); }, [profile.weight_kg, profile.body_fat_pct, profile.objectif, profile.avatar_url, profile.arm_cm, profile.chest_cm, profile.waist_cm, profile.thigh_cm]);

  const { myEntries, bestProgress } = useMemo(() => computeProfileInsights(currentUserId, entries, sessions), [entries, sessions, currentUserId]);

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadPhoto(file, "avatars", { maxW: 200, quality: 0.7 });
      await onSave({ avatar_url: url });
    } finally { setUploadingAvatar(false); }
  };

  const saveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== profile.display_name) onSave({ display_name: trimmed });
    setEditingName(false);
  };

  const saveIdentityPhysique = () => {
    onSave({ objectif: form.objectif, height_cm: form.height_cm ? Number(form.height_cm) : null, body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : null });
  };

  const startWeight = weightHistory.length ? weightHistory[0].weight_kg : null;
  const currentWeight = weightHistory.length ? weightHistory[weightHistory.length - 1].weight_kg : profile.weight_kg;
  const activeMeasurement = MEASUREMENT_TYPES.find((m) => m.key === openMeasurement);

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Identité</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div onClick={() => fileRef.current?.click()} style={{ cursor: "pointer" }}>
          <Avatar profile={profile} size={60} />
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={handleAvatar} />
        <input ref={avatarGalleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
        <div style={{ flex: 1 }}>
          {editingName ? (
            <input
              style={{ ...styles.input, marginBottom: 4, padding: "5px 8px", fontSize: 15, fontWeight: 700 }}
              value={nameValue}
              autoFocus
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{profile.display_name}</p>
              <button style={{ ...styles.iconBtn, padding: 2 }} onClick={() => { setNameValue(profile.display_name); setEditingName(true); }} aria-label="Modifier le nom">
                <Pencil size={13} />
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={styles.linkBtn} onClick={() => fileRef.current?.click()}>{uploadingAvatar ? "Envoi..." : "Changer la photo"}</button>
            <button style={styles.linkBtn} onClick={() => avatarGalleryRef.current?.click()}>ou galerie</button>
          </div>
        </div>
      </div>
      <textarea
        style={{ ...styles.input, minHeight: 50, resize: "vertical" }}
        placeholder="Objectif (ex: prise de masse propre, 80kg au squat...)"
        value={form.objectif || ""} onChange={(e) => setForm({ ...form, objectif: e.target.value })}
        onBlur={saveIdentityPhysique}
      />

      <h2 style={styles.sectionTitle}>Physique</h2>
      <div style={styles.statsCard}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <FieldNum label="Taille (cm)" value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} />
          <FieldNum label="% masse grasse" value={form.body_fat_pct} onChange={(v) => setForm({ ...form, body_fat_pct: v })} />
        </div>
        <button style={styles.secondaryBtn} onClick={saveIdentityPhysique}>Enregistrer</button>

        <div onClick={() => setShowWeightModal(true)} style={{ ...styles.weightRow, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>Poids</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{currentWeight ? `${currentWeight} kg` : "Ajouter un poids"}</div>
          </div>
          <TrendingUp size={16} color={COLORS.lime} />
        </div>

        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {MEASUREMENT_TYPES.map((m) => (
            <div key={m.key} onClick={() => setOpenMeasurement(m.key)} style={styles.weightRow}>
              <div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{profile[m.field] ? `${profile[m.field]} cm` : "Ajouter"}</div>
              </div>
              <ChevronRight size={15} color={COLORS.muted} />
            </div>
          ))}
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Progression</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <MetricCard label="Poids" value={startWeight && currentWeight && startWeight !== currentWeight ? `${startWeight} → ${currentWeight} kg` : (currentWeight ? `${currentWeight} kg` : "—")} />
        <MetricCard label="Séances" value={myEntries.length} />
        <MetricCard label="Meilleure progression" value={bestProgress ? `${bestProgress.name} +${bestProgress.delta}kg` : "—"} />
      </div>

      <PrSection prs={prs} exerciseList={exerciseList} onAdd={onAddPr} onDelete={onDeletePr} />

      <h2 style={styles.sectionTitle}>Historique ({myEntries.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {myEntries.map((e) => (
          <div key={e.sessionId} style={styles.historyRow} onClick={() => onOpenSession(e.sessionId)}>
            <span style={{ fontSize: 13 }}>{e.session.title || e.exercises.map((x) => x.name).join(", ")}</span>
            <span style={{ fontSize: 11, color: COLORS.muted }}>{fmtDate(e.session.date)}</span>
          </div>
        ))}
      </div>

      {showWeightModal && (
        <WeightModal
          weightHistory={weightHistory}
          onClose={() => setShowWeightModal(false)}
          onAdd={async (w, date) => { await addWeightEntry(currentUserId, w, date); await loadWeightHistory(); await onRefresh(); }}
        />
      )}

      {activeMeasurement && (
        <MeasurementModal
          key={activeMeasurement.key}
          type={activeMeasurement}
          currentUserId={currentUserId}
          onClose={() => setOpenMeasurement(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

function WeightModal({ weightHistory, onClose, onAdd }) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayKey());
  const chartData = weightHistory.map((h) => ({ date: h.logged_on.slice(5), weight: h.weight_kg }));

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>Suivi du poids</span>
          <button style={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        {chartData.length > 1 ? (
          <div style={{ width: "100%", height: 160, marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.line}`, borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke={COLORS.lime} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 14 }}>Ajoute au moins deux pesées pour voir le graphique.</p>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="number" placeholder="Poids (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button style={styles.primaryBtn} disabled={!weight} onClick={() => { onAdd(Number(weight), date); setWeight(""); }}>
          <Check size={16} style={{ marginRight: 6 }} />Ajouter cette pesée
        </button>
        {weightHistory.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[...weightHistory].reverse().slice(0, 8).map((h) => (
              <div key={h.logged_on} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.muted }}>
                <span>{fmtDate(h.logged_on)}</span><span style={{ color: COLORS.chalk }}>{h.weight_kg} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Même principe que WeightModal, généralisé aux 4 mesures corporelles (bras/poitrine/
// taille/cuisse) désormais suivies dans le temps comme le poids.
function MeasurementModal({ type, currentUserId, onClose, onSaved }) {
  const [history, setHistory] = useState([]);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayKey());

  const load = useCallback(async () => { setHistory(await getMeasurementHistory(currentUserId, type.key)); }, [currentUserId, type.key]);
  useEffect(() => { load(); }, [load]);

  const chartData = history.map((h) => ({ date: h.logged_on.slice(5), value: h.value_cm }));

  const submit = async () => {
    if (!value) return;
    await addMeasurementEntry(currentUserId, type.key, Number(value), date);
    setValue("");
    await load();
    await onSaved();
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>{type.label}</span>
          <button style={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        {chartData.length > 1 ? (
          <div style={{ width: "100%", height: 160, marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ background: COLORS.surface2, border: `1px solid ${COLORS.line}`, borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke={COLORS.lime} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 14 }}>Ajoute au moins deux mesures pour voir le graphique.</p>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="number" placeholder="Valeur (cm)" value={value} onChange={(e) => setValue(e.target.value)} />
          <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button style={styles.primaryBtn} disabled={!value} onClick={submit}>
          <Check size={16} style={{ marginRight: 6 }} />Ajouter cette mesure
        </button>
        {history.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[...history].reverse().slice(0, 8).map((h) => (
              <div key={h.logged_on} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.muted }}>
                <span>{fmtDate(h.logged_on)}</span><span style={{ color: COLORS.chalk }}>{h.value_cm} cm</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldNum({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={styles.label}>{label}</label>
      <input style={{ ...styles.input, marginBottom: 0 }} type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function MetricCard({ label, value }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", flex: "1 1 100px" }}>
      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function PrSection({ prs, exerciseList, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [exo, setExo] = useState("");
  const [val, setVal] = useState("");
  const [unit, setUnit] = useState("kg");

  const submit = () => {
    if (!exo.trim() || !val) return;
    onAdd(exo.trim(), Number(val), unit);
    setExo(""); setVal(""); setAdding(false);
  };

  return (
    <>
      <h2 style={styles.sectionTitle}>Mes PR</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {prs.map((pr) => (
          <div key={pr.id} style={styles.prChip}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: COLORS.muted }}>{pr.exercise}</span>
              <button style={{ ...styles.iconBtn, padding: 0 }} onClick={() => onDelete(pr.id)}>✕</button>
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: COLORS.lime }}>{pr.value}{pr.unit}</span>
          </div>
        ))}
      </div>
      {adding ? (
        <div style={styles.exCard}>
          <datalist id="pr-exo-options">
            {exerciseList.map((e) => <option key={e.id} value={e.name} />)}
          </datalist>
          <input style={styles.input} placeholder="Exercice (recherche...)" list="pr-exo-options" value={exo} onChange={(e) => setExo(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input style={styles.setInput} placeholder="Valeur" type="number" value={val} onChange={(e) => setVal(e.target.value)} />
            <select style={styles.input} value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="kg">kg</option>
              <option value="reps">reps</option>
              <option value="sec">sec</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={() => setAdding(false)}>Annuler</button>
            <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={submit}>Ajouter</button>
          </div>
        </div>
      ) : (
        <button style={styles.secondaryBtn} onClick={() => setAdding(true)}>+ Ajouter un PR</button>
      )}
    </>
  );
}
