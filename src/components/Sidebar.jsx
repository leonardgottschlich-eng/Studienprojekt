import { useState } from "react";
import MandantAvatar from "./MandantAvatar";

export default function Sidebar({ currentMandant, mandanten, sidebarOpen, onSelectMandant, onClose, user, onLogout }) {
    const [search, setSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const filtered = (mandanten ?? []).filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.nr.toLowerCase().includes(search.toLowerCase())
    );

    const select = (m) => {
        onSelectMandant(m);
        setDropdownOpen(false);
        setSearch("");
        onClose();
    };

    return (
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}
               style={{ width: 240, background: "#0b2e44", display: "flex", flexDirection: "column", paddingTop: "calc(24px + env(safe-area-inset-top))", paddingBottom: "env(safe-area-inset-bottom)", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 200, transition: "transform .25s ease", boxSizing: "border-box" }}>

            {/* Logo */}
            <div style={{ padding: "0 16px 20px" }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, fontWeight: 900, color: "#f0f8ff" }}>Bill</span>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, fontWeight: 400, color: "transparent", WebkitTextStroke: "1.2px #fd8f19" }}>Squid</span>
            </div>

            {/* Mandant Switcher */}
            <div style={{ padding: "0 12px 16px", position: "relative" }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "#2b5f7a", letterSpacing: ".1em", marginBottom: 7, paddingLeft: 4 }}>MANDANT</div>
                <button onClick={() => setDropdownOpen((v) => !v)}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: dropdownOpen ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
                    <MandantAvatar m={currentMandant} size={26} />
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <div style={{ color: "#dff0fb", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentMandant.name}</div>
                        <div style={{ color: "#4a8aaa", fontSize: 10 }}>{currentMandant.nr}</div>
                    </div>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0, transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform .2s", color: "#4a8aaa" }}>
                        <path d="M1.5 3.5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {dropdownOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 12, right: 12, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 8px 28px rgba(0,0,0,.14)", zIndex: 300, overflow: "hidden" }}>
                        <div style={{ padding: "10px 12px 6px" }}>
                            <div style={{ position: "relative" }}>
                                <input autoFocus type="text" placeholder="Name oder Nummer…" value={search}
                                       onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()}
                                       style={{ width: "100%", padding: "6px 10px 6px 28px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, outline: "none" }} />
                            </div>
                        </div>
                        <div style={{ maxHeight: 220, overflowY: "scroll", padding: "3px 0 7px", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
                            {filtered.map((m) => (
                                <button key={m.id} onClick={() => select(m)}
                                        style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 12px", background: m.id === currentMandant.id ? "#f0f4f8" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                                    <MandantAvatar m={m} size={28} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: m.id === currentMandant.id ? 600 : 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                                        <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{m.nr}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "0 12px 16px" }} />

            {/* Nav */}
            <nav style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 10px" }}>
                {[
                    { icon: "bi-border-all",      label: "Dashboard" },
                    { icon: "bi-folder",          label: "Belege",        active: true },
                    { icon: "bi-bar-chart-line",  label: "Auswertungen" },
                    { icon: "bi-gear",            label: "Einstellungen" },
                ].map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 7, background: item.active ? "rgba(201,168,76,.12)" : "transparent", color: item.active ? "#fd8f19" : "#7ab8d0", fontSize: 13, fontWeight: item.active ? 600 : 400, cursor: "pointer", marginBottom: 2, borderLeft: item.active ? "2px solid #fd8f19" : "2px solid transparent" }}>
                        <i className={`bi ${item.icon}`} style={{ fontSize: 15 }} />
                        {item.label}
                    </div>
                ))}
            </nav>

            {/* User */}
            <div style={{ padding: "20px 40px", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#18537a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fd8f19", flexShrink: 0 }}>
                    {(user?.name || "??").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#dff0fb", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "Unbekannt"}</div>
                    <div style={{ color: "#4a8aaa", fontSize: 10 }}>{user?.rolle || ""}</div>
                </div>
                <button onClick={onLogout} title="Abmelden"
                        style={{ background: "none", border: "none", color: "#7ab8d0", cursor: "pointer", fontSize: 16, padding: 4, flexShrink: 0 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#fd8f19")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#7ab8d0")}>
                    <i className="bi bi-box-arrow-right" />
                </button>
            </div>
        </aside>
    );
}