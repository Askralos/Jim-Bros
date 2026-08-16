import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";
import { signUp, signIn } from "../lib/api/auth";

export function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!username.trim() || !password) {
      setError("Renseigne un identifiant et un mot de passe.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(username, password, displayName);
      } else {
        await signIn(username, password);
      }
      // onAuthStateChange (écouté dans App.jsx) prend le relais automatiquement.
    } catch (e) {
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.authScreen}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Dumbbell size={30} color={COLORS.lime} />
        <span style={styles.brand}>JIM BROS</span>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 28 }}>La muscu entre potes.</p>
      <div style={styles.authCard}>
        <div style={styles.tabRow}>
          <button onClick={() => setMode("login")} style={{ ...styles.tabBtn, ...(mode === "login" ? styles.tabBtnActive : {}) }}>Connexion</button>
          <button onClick={() => setMode("signup")} style={{ ...styles.tabBtn, ...(mode === "signup" ? styles.tabBtnActive : {}) }}>Créer un compte</button>
        </div>
        {mode === "signup" && (
          <input style={styles.input} placeholder="Prénom affiché" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        )}
        <input style={styles.input} placeholder="Identifiant" value={username} autoCapitalize="none" onChange={(e) => setUsername(e.target.value)} />
        <input style={styles.input} placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {error && <p style={{ color: COLORS.flame, fontSize: 13, margin: "4px 2px" }}>{error}</p>}
        <button style={styles.primaryBtn} onClick={submit} disabled={busy}>{busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
      </div>
    </div>
  );
}
