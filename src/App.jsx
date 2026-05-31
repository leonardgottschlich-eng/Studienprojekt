import 'bootstrap-icons/font/bootstrap-icons.css';
import { useState, useRef, useCallback } from "react";

const MANDANTEN = [
  { id: 1, name: "Max Kirchner", nr: "MK-2024-001", typ: "Einzelunternehmen", initials: "MK", color: "#18537a" },
  { id: 2, name: "Sabine Hoffmann", nr: "SH-2024-002", typ: "Freiberuflerin", initials: "SH", color: "#5b3a8a" },
  { id: 3, name: "Baumann GmbH", nr: "BG-2023-015", typ: "GmbH", initials: "BG", color: "#0e6655" },
  { id: 4, name: "Rainer Schulz", nr: "RS-2024-008", typ: "Gewerbetreibender", initials: "RS", color: "#7d3c19" },
  { id: 5, name: "TechStart UG", nr: "TS-2024-022", typ: "UG (haftungsbeschränkt)", initials: "TS", color: "#18537a" },
  { id: 6, name: "Petra Winkel", nr: "PW-2023-044", typ: "Freiberuflerin", initials: "PW", color: "#6b1a5c" },
  { id: 7, name: "Markus Gruber", nr: "MG-2024-031", typ: "Einzelunternehmen", initials: "MG", color: "#1a5c3a" },
  { id: 8, name: "Bäckerei Meier OHG", nr: "BM-2022-007", typ: "OHG", initials: "BM", color: "#7a4a1a" },
];

const DOCS_BY_MANDANT = {
  1: [
    { id: 1, name: "Rechnung_Büromaterial_Jan2025.pdf", size: "1.2 MB", type: "pdf", uploadedAt: "15.01.2025", status: "analysiert", category: "Betriebsausgaben", amount: "342,50 €" },
    { id: 2, name: "Tankquittung_Feb2025.jpg", size: "485 KB", type: "image", uploadedAt: "03.02.2025", status: "ausstehend", category: "Fahrtkosten", amount: "87,20 €" },
    { id: 3, name: "Kontoauszug_Q1_2025.pdf", size: "2.8 MB", type: "pdf", uploadedAt: "01.03.2025", status: "in_bearbeitung", category: "Bankbelege", amount: "—" },
    { id: 4, name: "Hotelrechnung_Berlin.pdf", size: "890 KB", type: "pdf", uploadedAt: "18.02.2025", status: "analysiert", category: "Reisekosten", amount: "219,00 €" },
  ],
  2: [
    { id: 5, name: "Honorarrechnung_Q1.pdf", size: "620 KB", type: "pdf", uploadedAt: "31.03.2025", status: "analysiert", category: "Einnahmen", amount: "4.800,00 €" },
    { id: 6, name: "Bürokosten_März.pdf", size: "310 KB", type: "pdf", uploadedAt: "28.03.2025", status: "ausstehend", category: "Betriebsausgaben", amount: "156,00 €" },
  ],
  3: [
    { id: 7, name: "Lieferantenrechnung_April.pdf", size: "1.5 MB", type: "pdf", uploadedAt: "05.04.2025", status: "analysiert", category: "Einkauf", amount: "12.340,00 €" },
    { id: 8, name: "Lohnabrechnung_Q1.pdf", size: "980 KB", type: "pdf", uploadedAt: "01.04.2025", status: "analysiert", category: "Personalkosten", amount: "28.900,00 €" },
    { id: 9, name: "Miete_April.jpg", size: "240 KB", type: "image", uploadedAt: "02.04.2025", status: "ausstehend", category: "Miete", amount: "2.200,00 €" },
  ],
  4: [{ id: 10, name: "Kassenbon_Werkzeug.jpg", size: "180 KB", type: "image", uploadedAt: "12.02.2025", status: "ausstehend", category: "Betriebsausgaben", amount: "89,99 €" }],
  5: [
    { id: 11, name: "SaaS_Rechnung_Feb.pdf", size: "420 KB", type: "pdf", uploadedAt: "01.02.2025", status: "analysiert", category: "IT-Kosten", amount: "349,00 €" },
    { id: 12, name: "Serverkosten_Q1.pdf", size: "510 KB", type: "pdf", uploadedAt: "31.03.2025", status: "in_bearbeitung", category: "IT-Kosten", amount: "780,00 €" },
  ],
  6: [{ id: 13, name: "Praxiskosten_Jan.pdf", size: "340 KB", type: "pdf", uploadedAt: "31.01.2025", status: "analysiert", category: "Praxiskosten", amount: "1.250,00 €" }],
  7: [
    { id: 14, name: "Wareneingang_März.pdf", size: "760 KB", type: "pdf", uploadedAt: "25.03.2025", status: "analysiert", category: "Einkauf", amount: "3.450,00 €" },
    { id: 15, name: "Fahrzeugkosten.pdf", size: "290 KB", type: "pdf", uploadedAt: "10.03.2025", status: "ausstehend", category: "Fahrtkosten", amount: "430,00 €" },
  ],
  8: [
    { id: 16, name: "Zutaten_Rechnung_April.pdf", size: "850 KB", type: "pdf", uploadedAt: "03.04.2025", status: "analysiert", category: "Wareneinsatz", amount: "6.780,00 €" },
    { id: 17, name: "Stromrechnung_Q1.pdf", size: "210 KB", type: "pdf", uploadedAt: "01.04.2025", status: "in_bearbeitung", category: "Nebenkosten", amount: "1.120,00 €" },
  ],
};

const STATUS_CONFIG = {
  analysiert: { label: "Analysiert", color: "#16a34a", bg: "#dcfce7", dot: "#16a34a" },
  ausstehend: { label: "Ausstehend", color: "#b45309", bg: "#fef3c7", dot: "#d97706" },
  in_bearbeitung: { label: "In Bearbeitung", color: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
};

function MandantAvatar({ m, size = 32 }) {
  return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
        {m.initials}
      </div>
  );
}

function FileIcon({ type }) {
  const isPdf = type === "pdf";
  return (
      <div style={{ width: 34, height: 42, borderRadius: 5, background: isPdf ? "#fee2e2" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: isPdf ? "#dc2626" : "#1d4ed8", flexShrink: 0, position: "relative" }}>
        <span style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: isPdf ? "#dc2626" : "#1d4ed8", borderRadius: "0 5px 0 5px", opacity: 0.2 }} />
        {isPdf ? "PDF" : "IMG"}
      </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, animation: status === "in_bearbeitung" ? "pulse 1.4s infinite" : "none" }} />
        {cfg.label}
    </span>
  );
}

export default function App() {
  const [allDocs, setAllDocs] = useState({ ...DOCS_BY_MANDANT });
  const [currentMandant, setCurrentMandant] = useState(MANDANTEN[0]);
  const [mandantenSearch, setMandantenSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);

  const docs = allDocs[currentMandant.id] || [];

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const selectMandant = (m) => {
    setCurrentMandant(m);
    setDropdownOpen(false);
    setMandantenSearch("");
    setSearchQuery("");
    showNotification(`Mandant gewechselt: ${m.name}`);
  };

  const filteredMandanten = MANDANTEN.filter(
      (m) =>
          m.name.toLowerCase().includes(mandantenSearch.toLowerCase()) ||
          m.nr.toLowerCase().includes(mandantenSearch.toLowerCase()) ||
          m.typ.toLowerCase().includes(mandantenSearch.toLowerCase())
  );

  const simulateUpload = (files) => {
    const validFiles = Array.from(files).filter((f) => f.type === "application/pdf" || f.type.startsWith("image/"));
    if (!validFiles.length) { showNotification("Nur PDF oder Bilddateien erlaubt.", "error"); return; }
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          const newDocs = validFiles.map((f, i) => ({
            id: Date.now() + i, name: f.name, size: `${(f.size / 1024).toFixed(0)} KB`,
            type: f.type === "application/pdf" ? "pdf" : "image",
            uploadedAt: new Date().toLocaleDateString("de-DE"),
            status: "ausstehend", category: "Nicht klassifiziert", amount: "—",
          }));
          setAllDocs((prev) => ({ ...prev, [currentMandant.id]: [...newDocs, ...(prev[currentMandant.id] || [])] }));
          showNotification(`${validFiles.length} Beleg${validFiles.length > 1 ? "e" : ""} hochgeladen`);
          return 0;
        }
        return prev + Math.random() * 18;
      });
    }, 120);
  };

  const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); simulateUpload(e.dataTransfer.files); }, [currentMandant]);

  const runKiAnalysis = () => {
    const pending = docs.filter((d) => d.status === "ausstehend");
    if (!pending.length) { showNotification("Keine ausstehenden Belege.", "error"); return; }
    setAllDocs((prev) => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map((d) => d.status === "ausstehend" ? { ...d, status: "in_bearbeitung" } : d) }));
    setTimeout(() => {
      setAllDocs((prev) => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map((d) => d.status === "in_bearbeitung" ? { ...d, status: "analysiert", category: d.category === "Nicht klassifiziert" ? "Sonstige Ausgaben" : d.category } : d) }));
      showNotification("KI-Analyse abgeschlossen ✓");
    }, 2800);
  };

  const filteredDocs = docs.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.category.toLowerCase().includes(searchQuery.toLowerCase()));
  const stats = { total: docs.length, analysiert: docs.filter((d) => d.status === "analysiert").length, ausstehend: docs.filter((d) => d.status === "ausstehend").length };

  return (
      <div style={{ display: "flex", minHeight: "100vh", width: "100%", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#f8f7f4" }}>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; background: #f8f7f4; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes slideIn { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dropDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        @media (max-width: 768px) {
          .sidebar { width: 0 !important; overflow: hidden !important; }
          .main-content { margin-left: 0 !important; padding: 20px 16px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .header-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .col-hide { display: none !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

        {/* Sidebar */}
        <aside className="sidebar" style={{ width: 240, background: "#0b2e44", display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, transition: "width .2s" }}>
          <div style={{ padding: "0 16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* BillSquid wordmark */}
              <div style={{ lineHeight: 1 }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, fontWeight: 900, color: "#f0f8ff", letterSpacing: "-0.01em" }}>Bill</span>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, fontWeight: 400, color: "transparent", WebkitTextStroke: "1.2px #fd8f19", letterSpacing: "-0.01em" }}>Squid</span>
              </div>
            </div>
          </div>

          {/* Mandant Switcher */}
          <div style={{ padding: "0 12px 16px", position: "relative" }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#2b5f7a", letterSpacing: ".1em", marginBottom: 7, paddingLeft: 4 }}>MANDANT</div>
            <button
                onClick={() => setDropdownOpen((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: dropdownOpen ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", transition: "background .15s" }}
            >
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
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 12, right: 12, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 8px 28px rgba(0,0,0,.14)", zIndex: 300, animation: "dropDown .16s ease", overflow: "hidden" }}>
                  <div style={{ padding: "10px 12px 6px" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 7 }}>MANDANT WECHSELN</div>
                    <div style={{ position: "relative" }}>
                      <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      <input
                          autoFocus
                          type="text"
                          placeholder="Name oder Nummer…"
                          value={mandantenSearch}
                          onChange={(e) => setMandantenSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: "100%", padding: "6px 10px 6px 28px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#f9fafb", outline: "none" }}
                      />
                    </div>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto", padding: "3px 0 7px" }}>
                    {filteredMandanten.length === 0 ? (
                        <div style={{ padding: "14px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>Kein Mandant gefunden</div>
                    ) : filteredMandanten.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => selectMandant(m)}
                            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 12px", background: m.id === currentMandant.id ? "#f0f4f8" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .12s" }}
                        >
                          <MandantAvatar m={m} size={28} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: m.id === currentMandant.id ? 600 : 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                            <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{m.nr} · {m.typ}</div>
                          </div>
                          {m.id === currentMandant.id && (
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                        </button>
                    ))}
                  </div>
                </div>
            )}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "0 12px 16px" }} />

          <nav style={{ flex: 1, padding: "0 10px" }}>
            {[
              {icon: <i className="bi bi-border-all"></i>, label: "Dashboard"},
              {icon: <i className="bi bi-folder"></i>, label: "Belege", active: true},
              {icon: <i className="bi bi-bar-chart-line"></i>, label: "Auswertungen" },
              {icon: <i className="bi bi-gear"></i>, label: "Einstellungen"},
            ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 7, background: item.active ? "rgba(201,168,76,.12)" : "transparent", color: item.active ? "#fd8f19" : "#7ab8d0", fontSize: 13, fontWeight: item.active ? 600 : 400, cursor: "pointer", marginBottom: 2, borderLeft: item.active ? "2px solid #fd8f19" : "2px solid transparent" }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                  {item.badge && <span style={{ marginLeft: "auto", background: "#fd8f19", color: "#0b2e44", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 8 }}>{item.badge}</span>}
                </div>
            ))}
          </nav>

          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#18537a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fd8f19", flexShrink: 0 }}>DL</div>
            <div>
              <div style={{ color: "#dff0fb", fontSize: 12, fontWeight: 500 }}>Dörte Ludwig</div>
              <div style={{ color: "#4a8aaa", fontSize: 10 }}>Steuerberaterin</div>
            </div>
          </div>
        </aside>

        {dropdownOpen && <div onClick={() => setDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />}

        {/* Main */}
        <main className="main-content" style={{ marginLeft: 240, flex: 1, minWidth: 0, padding: "30px 32px", animation: "fadeUp .4s ease", display: "flex", justifyContent: "center", background: "#f8f7f4" }}>
          <div style={{ width: "100%", maxWidth: 900 }}>
            <div className="header-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: "#0b2e44", fontWeight: 400, marginBottom: 3 }}>Belegverwaltung</h1>
                <p style={{ color: "#6b7280", fontSize: 13 }}>
                  Belege für <span style={{ fontWeight: 600, color: "#18537a" }}>{currentMandant.name}</span>
                </p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#0b2e44", color: "#fd8f19", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Beleg hochladen
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => simulateUpload(e.target.files)} />
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
              {[
                {
                  label: "Belege gesamt",
                  value: stats.total,
                  icon: <i color={"#18537a"} className="bi bi-file-text"></i>,
                  accent: "#18537a"
                },
                {
                  label: "Analysiert",
                  value: stats.analysiert,
                  icon: <i color={"#16a34a"} className="bi bi-check2"></i>,
                  accent: "#16a34a"
                },
                {
                  label: "Ausstehend",
                  value: stats.ausstehend,
                  icon: <i color={"#d97706"} className="bi bi-hourglass-split" ></i>,
                  accent: "#d97706"
                },
              ].map((s) => (
                  <div key={s.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e8e4dc" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: s.accent }}>{s.value}</div>
                    </div>
                    <span style={{ fontSize: 26, opacity: 0.5, color: s.accent }}>{s.icon}</span>
                  </div>
              ))}
            </div>

            {/* Upload Zone */}
            <div onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onClick={() => !uploading && fileInputRef.current?.click()} style={{ background: dragging ? "#fffbeb" : "#fff", border: `2px dashed ${dragging ? "#fd8f19" : "#d1d5db"}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: uploading ? "default" : "pointer", marginBottom: 20, transition: "all .2s" }}>
              {uploading ? (
                  <div>
                    <div style={{fontSize: 24, marginBottom: 8}}><i className="bi bi-arrow-up"></i></div>
                    <p style={{ color: "#374151", fontWeight: 600, marginBottom: 10 }}>Hochladen…</p>
                    <div style={{ height: 5, background: "#e5e7eb", borderRadius: 10, maxWidth: 300, margin: "0 auto", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(uploadProgress, 100)}%`, background: "linear-gradient(90deg,#18537a,#fd8f19)", borderRadius: 10, transition: "width .1s linear" }} />
                    </div>
                    <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>{Math.min(Math.round(uploadProgress), 100)} %</p>
                  </div>
              ) : (
                  <>
                    <div style={{ opacity: dragging ? 1 : 0.45 }}>{dragging ? <i className="bi bi-cloud-upload"></i> : <i className="bi bi-upload"></i>}</div>
                    <p style={{ color: "#374151", fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{dragging ? "Datei hier ablegen" : "Belege per Drag & Drop hochladen"}</p>
                    <p style={{ color: "#9ca3af", fontSize: 12 }}>PDF, JPG, PNG</p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12, padding: "6px 14px", background: "#f3f4f6", borderRadius: 7, fontSize: 12, color: "#6b7280", fontWeight: 500 }}><i className="bi bi-folder"></i> Oder Dateien auswählen</div>
                  </>
              )}
            </div>

            {/* KI Banner */}
            <div style={{ background: "linear-gradient(135deg,#0b2e44 0%,#18537a 100%)", borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, border: "1px solid rgba(201,168,76,.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <p style={{ color: "#f0f8ff", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>KI-Analyse bereit</p>
                  <p style={{ color: "#7ab8d0", fontSize: 11 }}>{stats.ausstehend} Beleg{stats.ausstehend !== 1 ? "e" : ""} warten auf Klassifizierung</p>
                </div>
              </div>
              <button onClick={runKiAnalysis} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#fd8f19,#ffb054)", border: "none", borderRadius: 7, color: "#0b2e44", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Jetzt analysieren ▶</button>
            </div>

            {/* Doc Table */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f0ece4" }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0b2e44" }}>
                  Hochgeladene Belege
                  <span style={{ marginLeft: 6, background: "#f3f4f6", color: "#6b7280", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 9 }}>{filteredDocs.length}</span>
                </h2>
                <input type="text" placeholder="Belege suchen…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                       style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#f9fafb", width: 175, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr", padding: "8px 20px", background: "#fafaf8", borderBottom: "1px solid #f0ece4" }}>
                {["DATEI", "DATUM", "KATEGORIE", "BETRAG", "STATUS"].map((h) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em" }}>{h}</span>
                ))}
              </div>
              {filteredDocs.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Keine Belege gefunden.</div>
              ) : filteredDocs.map((doc, i) => (
                  <div key={doc.id}
                       style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr", padding: "12px 20px", borderBottom: i < filteredDocs.length - 1 ? "1px solid #f9f7f3" : "none", alignItems: "center", cursor: "pointer", transition: "background .12s" }}
                       onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf8")}
                       onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <FileIcon type={doc.type} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827", marginBottom: 1 }}>{doc.name}</div>
                        <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{doc.size}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{doc.uploadedAt}</span>
                    <span style={{ fontSize: 11, color: "#374151", background: "#f3f4f6", padding: "3px 7px", borderRadius: 5, fontWeight: 500, display: "inline-block" }}>{doc.category}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{doc.amount}</span>
                    <StatusBadge status={doc.status} />
                  </div>
              ))}
            </div>
          </div>
        </main>

        {notification && (
            <div style={{ position: "fixed", bottom: 24, right: 24, background: notification.type === "error" ? "#fef2f2" : "#f0fdf4", border: `1px solid ${notification.type === "error" ? "#fca5a5" : "#86efac"}`, color: notification.type === "error" ? "#dc2626" : "#16a34a", padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.08)", animation: "slideIn .3s ease", zIndex: 999, display: "flex", alignItems: "center", gap: 7 }}>
              <span>{notification.type === "error" ? "⚠️" : "✅"}</span>
              {notification.msg}
            </div>
        )}
      </div>
  );
}