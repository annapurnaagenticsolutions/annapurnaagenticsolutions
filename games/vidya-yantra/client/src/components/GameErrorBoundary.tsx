// GameErrorBoundary — a React error boundary scoped to the Babylon game canvas.
// It must NOT wrap the landing page, so App mounts it only around <GameCanvas/>.
// On crash it preserves the player's run by writing the current chronicle to a
// backup localStorage slot before showing a graceful, on-brand recovery screen.
import { Component, ReactNode } from "react";
import { backupChronicle } from "@/game/Chronicle";

interface Props {
  children: ReactNode;
  onReturnToBeginning: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string | null }) {
    // Log for debugging so a crash is never silent.
    console.error("Vidya Yantra game crash captured:", error, info?.componentStack ?? "");
    // Best-effort backup of the current chronicle so the player does not lose
    // their run. We read the live save (the React tree may be torn down) and
    // copy it to a separate backup slot before showing recovery UI.
    try {
      const stored = window.localStorage.getItem("vidya-yantra-travellers-chronicle-v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        backupChronicle(parsed);
      }
    } catch {
      /* if localStorage is unavailable there is nothing more we can do */
    }
  }

  handleReturnToBeginning = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReturnToBeginning();
  };

  handleTryAgain = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="game-error-screen"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "2rem",
            background: "radial-gradient(circle at 50% 35%, #0b1430 0%, #050913 70%)",
            color: "#E8DCC4",
            textAlign: "center",
            zIndex: 9999,
          }}
        >
          <div style={{ maxWidth: "34rem" }}>
            <p style={{ letterSpacing: "0.3em", textTransform: "uppercase", fontSize: "0.7rem", opacity: 0.6, marginBottom: "0.75rem", fontFamily: "Manrope, system-ui, sans-serif" }}>
              The observatory stilled
            </p>
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                lineHeight: 1.15,
                margin: "0 0 1rem",
                color: "#F2C282",
              }}
            >
              The field instrument paused mid-reading.
            </h1>
            <p style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.82, margin: "0 0 0.5rem" }}>
              Your journey has been quietly copied to a backup before this screen appeared, so nothing you recorded is lost. You may return to the beginning or try the present reading again.
            </p>
            <p style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "0.78rem", opacity: 0.45, margin: "0 0 1.75rem" }}>
              A note has been left in the console for whoever tends the instrument.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={this.handleReturnToBeginning}
                style={{
                  fontFamily: "Manrope, system-ui, sans-serif",
                  fontSize: "0.9rem",
                  padding: "0.6rem 1.1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(232, 220, 196, 0.25)",
                  background: "rgba(232, 220, 196, 0.08)",
                  color: "#E8DCC4",
                  cursor: "pointer",
                }}
              >
                Return to the Beginning
              </button>
              <button
                onClick={this.handleTryAgain}
                style={{
                  fontFamily: "Manrope, system-ui, sans-serif",
                  fontSize: "0.9rem",
                  padding: "0.6rem 1.1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#F2C282",
                  color: "#0b1430",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
