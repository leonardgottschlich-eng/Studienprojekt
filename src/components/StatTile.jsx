/** Kennzahlen-Kachel (Belege gesamt, Analysiert, Ausstehend …) */
export default function StatTile({ label, value, icon, accent = "#18537a", hinweis, onClick }) {
  return (
      <div onClick={onClick}
           style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e8e4dc", cursor: onClick ? "pointer" : "default", transition: "border-color .15s" }}
           onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = accent; }}
           onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = "#e8e4dc"; }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: accent }}>{value}</div>
          {hinweis && <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>{hinweis}</div>}
        </div>
        <i className={`bi ${icon}`} style={{ fontSize: 26, opacity: 0.5, color: accent }} />
      </div>
  );
}
