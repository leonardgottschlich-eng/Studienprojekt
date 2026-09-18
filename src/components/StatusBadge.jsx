import { STATUS_CONFIG } from "../data/mockData";

// Solange die KI einen Beleg liest, steht statt des Status ein Hinweis darauf
const KI_LAEUFT = { label: "KI analysiert…", color: "#6d28d9", bg: "#ede9fe", dot: "#8b5cf6" };

export default function StatusBadge({ status, kiLaeuft = false }) {
  const cfg = kiLaeuft ? KI_LAEUFT : STATUS_CONFIG[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, animation: kiLaeuft ? "pulse 1.4s infinite" : "none" }} />
      {cfg.label}
    </span>
  );
}
