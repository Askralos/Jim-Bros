import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { updatePassword, adminResetPassword, generateTempPassword } from "../lib/api/auth";
import { SubmitButton } from "./EntryFields";

// "Changer mon mot de passe", replié par défaut en bas du profil.
export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }

  const submit = async () => {
    if (password.length < 6) return setMessage({ ok: false, text: "6 caractères minimum." });
    if (password !== confirmation) return setMessage({ ok: false, text: "Les deux mots de passe ne correspondent pas." });
    setBusy(true);
    setMessage(null);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmation("");
      setMessage({ ok: true, text: "Mot de passe changé." });
      setOpen(false);
    } catch (e) {
      setMessage({ ok: false, text: e.message || "Le changement a échoué. Réessaie." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      {!open ? (
        <button style={{ ...styles.secondaryBtn, gap: 6 }} onClick={() => { setOpen(true); setMessage(null); }}>
          <KeyRound size={14} />Changer mon mot de passe
        </button>
      ) : (
        <div style={styles.exCard}>
          <input style={styles.input} type="password" autoComplete="new-password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input style={styles.input} type="password" autoComplete="new-password" placeholder="Confirmer" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.secondaryBtn, flex: 1 }} onClick={() => { setOpen(false); setMessage(null); }}>Annuler</button>
            <SubmitButton busy={busy} disabled={!password} onClick={submit} icon={Check} label="Enregistrer" busyLabel="..." style={{ flex: 1 }} />
          </div>
        </div>
      )}
      {message && <p style={{ fontSize: 12, color: message.ok ? COLORS.lime : COLORS.flame, margin: "8px 2px 0" }}>{message.text}</p>}
    </div>
  );
}

// Réservé aux admins, sur le profil d'un pote : lui génère un mot de passe
// temporaire, à lui transmettre (il pourra le changer ensuite depuis son profil).
export function AdminPasswordReset({ userId, displayName }) {
  const [temp, setTemp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const reset = async () => {
    if (!confirm(`Réinitialiser le mot de passe de ${displayName} ? L'ancien ne marchera plus.`)) return;
    const password = generateTempPassword();
    setBusy(true);
    setError("");
    try {
      await adminResetPassword(userId, password);
      setTemp(password);
    } catch (e) {
      setError(e.message || "La réinitialisation a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(temp); setCopied(true); } catch { /* copie manuelle */ }
  };

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${COLORS.line}` }}>
      {temp ? (
        <div style={{ ...styles.exCard, background: COLORS.surface2 }}>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 6px" }}>Nouveau mot de passe de {displayName}, à lui envoyer :</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: COLORS.lime, flex: 1, userSelect: "all" }}>{temp}</span>
            <button style={{ ...styles.linkBtn, display: "flex", alignItems: "center", gap: 4 }} onClick={copy}>
              <Copy size={13} />{copied ? "Copié" : "Copier"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, margin: "8px 0 0" }}>Il pourra le changer depuis son profil.</p>
        </div>
      ) : (
        <button style={{ ...styles.secondaryBtn, gap: 6 }} disabled={busy} onClick={reset}>
          <KeyRound size={14} />{busy ? "..." : "Réinitialiser son mot de passe"}
        </button>
      )}
      {error && <p style={{ fontSize: 12, color: COLORS.flame, margin: "8px 2px 0" }}>{error}</p>}
    </div>
  );
}
