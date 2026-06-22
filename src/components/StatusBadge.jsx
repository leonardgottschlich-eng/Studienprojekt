import { STATUS_CONFIG } from "../data/mockData";

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, animation: status === "in_bearbeitung" ? "pulse 1.4s infinite" : "none" }} />
      {cfg.label}
    </span>
  );
}
