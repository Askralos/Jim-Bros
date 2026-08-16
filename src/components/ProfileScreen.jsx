import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Check, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { fmtDate, todayKey, computeProfileInsights } from "../lib/utils";
import { Avatar } from "./Avatar";
import { uploadPhoto } from "../lib/api/storage";
import { addWeightEntry, getWeightHistory } from "../lib/api/profiles";

export function ProfileScreen({ currentUserId, profile, entries, sessions, prs, exerciseList, onSave, onAddPr, onDeletePr, onOpenSession, onRefresh }) {
  const [form, setForm] = useState(profile);
  const [editingMeasurements, setEditingMeasurements] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [weightHistory, setWeightHistory] = useState([]);
  const fileRef = useRef(null);

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

  const saveIdentityPhysique = () => {
    onSave({ objectif: form.objectif, height_cm: form.height_cm ? Number(form.height_cm) : null, body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : null });
  };

  const saveMeasurements = () => {
    onSave({
      arm_cm: form.arm_cm ? Number(form.arm_cm) : null, chest_cm: form.chest_cm ? Number(form.chest_cm) : null,
      waist_cm: form.waist_cm ? Number(form.waist_cm) : null, thigh_cm: form.thigh_cm ? Number(form.thigh_cm) : null,
    });
    setEditingMeasurements(false);
  };

  const hasMeasurements = profile.arm_cm || profile.chest_cm || profile.waist_cm || profile.thigh_cm;
  const startWeight = weightHistory.length ? weightHistory[0].weight_kg : null;
  const currentWeight = weightHistory.length ? weightHistory[weightHistory.length - 1].weight_kg : profile.weight_kg;

  return (
    <div style={styles.screen}>
      <h2 style={styles.sectionTitle}>Identité</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div onClick={() => fileRef.current?.click()} style={{ cursor: "pointer" }}>
          <Avatar profile={profile} size={60} />
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{profile.display_name}</p>
          <button style={styles.linkBtn} onClick={() => fileRef.current?.click()}>{uploadingAvatar ? "Envoi..." : "Changer la photo"}</button>
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

        {!hasMeasurements && !editingMeasurements && (
          <button style={{ ...styles.secondaryBtn, marginTop: 10 }} onClick={() => setEditingMeasurements(true)}>+ Ajouter mes mesures</button>
        )}
        {hasMeasurements && !editingMeasurements && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              {profile.arm_cm && <span style={styles.setChip}>Bras {profile.arm_cm}cm</span>}
              {profile.chest_cm && <span style={styles.setChip}>Poitrine {profile.chest_cm}cm</span>}
              {profile.waist_cm && <span style={styles.setChip}>Taille {profile.waist_cm}cm</span>}
              {profile.thigh_cm && <span style={styles.setChip}>Cuisse {profile.thigh_cm}cm</span>}
            </div>
            <button style={styles.linkBtn} onClick={() => setEditingMeasurements(true)}>Modifier mes mesures</button>
          </div>
        )}
        {editingMeasurements && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <FieldNum label="Tour de bras (cm)" value={form.arm_cm} onChange={(v) => setForm({ ...form, arm_cm: v })} />
              <FieldNum label="Tour de poitrine" value={form.chest_cm} onChange={(v) => setForm({ ...form, chest_cm: v })} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <FieldNum label="Tour de taille" value={form.waist_cm} onChange={(v) => setForm({ ...form, waist_cm: v })} />
              <FieldNum label="Tour de cuisse" value={form.thigh_cm} onChange={(v) => setForm({ ...form, thigh_cm: v })} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={() => setEditingMeasurements(false)}>Annuler</button>
              <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={saveMeasurements}>Enregistrer</button>
            </div>
          </div>
        )}
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
