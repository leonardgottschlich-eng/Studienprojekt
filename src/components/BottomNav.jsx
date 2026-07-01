export default function BottomNav() {
  return (
    <nav className="bottom-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "#0b2e44", borderTop: "1px solid rgba(255,255,255,.08)", zIndex: 150, alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
      {[
        { icon: "bi-border-all",    label: "Dashboard" },
        { icon: "bi-folder-fill",   label: "Belege",    active: true },
        { icon: "bi-bar-chart-line",label: "Auswertung" },
      ].map((item) => (
        <button key={item.label} onClick={item.action || undefined}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, color: item.active ? "#fd8f19" : "#7ab8d0", minWidth: 56 }}>
          <i className={`bi ${item.icon}`} style={{ fontSize: 20 }} />
          <span style={{ fontSize: 10, fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
