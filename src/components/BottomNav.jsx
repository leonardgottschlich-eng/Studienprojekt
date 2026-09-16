export default function BottomNav({ activePage = "belege", onNavigate }) {
  return (
    <nav className="bottom-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "#0b2e44", borderTop: "1px solid rgba(255,255,255,.08)", zIndex: 150, alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
      {[
        { icon: "bi-border-all",  label: "Dashboard",     seite: "dashboard" },
        { icon: "bi-folder-fill", label: "Belege",        seite: "belege" },
        { icon: "bi-gear-fill",   label: "Einstellungen", seite: "einstellungen" },
      ].map((item) => {
        const active = item.seite === activePage;
        return (
          <button key={item.label} onClick={() => onNavigate?.(item.seite)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, color: active ? "#fd8f19" : "#7ab8d0", minWidth: 56 }}>
            <i className={`bi ${item.icon}`} style={{ fontSize: 20 }} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
