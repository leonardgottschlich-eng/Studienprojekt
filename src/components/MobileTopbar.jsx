export default function MobileTopbar({ onMenuClick, onCameraClick, onLogoClick }) {
  return (
    <div className="mobile-topbar" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#0b2e44", zIndex: 150, alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <button onClick={onMenuClick} style={{ background: "none", border: "none", color: "#7ab8d0", fontSize: 22, cursor: "pointer", padding: 4 }}>
        <i className="bi bi-list" />
      </button>
      {/* Logo führt zur Startseite */}
      <button onClick={onLogoClick} title="Zur Startseite"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 1 }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 900, color: "#f0f8ff" }}>Bill</span>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 400, color: "transparent", WebkitTextStroke: "1.2px #fd8f19" }}>Squid</span>
      </button>
      <button onClick={onCameraClick} style={{ background: "none", border: "none", color: "#fd8f19", fontSize: 22, cursor: "pointer", padding: 4 }}>
        <i className="bi bi-camera" />
      </button>
    </div>
  );
}
