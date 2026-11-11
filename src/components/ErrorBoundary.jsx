import { Component } from "react";
import { styles } from "../lib/styles";
import { COLORS } from "../lib/constants";

// Filet de sécurité : une erreur d'affichage montre un message avec un bouton pour
// recharger, au lieu de laisser une page blanche.
export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ ...styles.bootScreen, flexDirection: "column", gap: 14, padding: 24, textAlign: "center" }}>
        <p style={{ color: COLORS.chalk, fontSize: 15, fontWeight: 700, margin: 0 }}>Oups, quelque chose a planté.</p>
        <p style={{ color: COLORS.muted, fontSize: 13, margin: 0 }}>Recharge l'app pour repartir.</p>
        <button style={{ ...styles.primaryBtn, width: "auto", padding: "10px 20px" }} onClick={() => window.location.reload()}>Recharger</button>
      </div>
    );
  }
}
