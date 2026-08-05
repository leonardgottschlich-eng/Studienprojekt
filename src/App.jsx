import 'bootstrap-icons/font/bootstrap-icons.css';
import { useState, useRef, useCallback, useEffect } from "react";

import { MANDANTEN, DOCS_BY_MANDANT } from "./data/mockData";
import { useUpload } from "./hooks/useUpload";
import MandantAvatar from "./components/MandantAvatar";
import FileIcon from "./components/FileIcon";
import StatusBadge from "./components/StatusBadge";
import Sidebar from "./components/Sidebar";
import MobileTopbar from "./components/MobileTopbar";
import BottomNav from "./components/BottomNav";
import DocumentScanModal from "./components/DocumentScanModal";
import DocDetailModal from "./components/DocDetailModal";

export default function App({ user, onLogout }) {
  const [allDocs, setAllDocs]         = useState({ ...DOCS_BY_MANDANT });
  const [currentMandant, setCurrentMandant] = useState(MANDANTEN[0]);
  const [dragging, setDragging]       = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 900);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("bs_token")}` },
      });
    } catch {
      // Server-Logout optional – Frontend meldet trotzdem ab
    }
    onLogout?.();
  };

  const { uploading, uploadProgress, uploadToLocal } = useUpload(currentMandant, setAllDocs, showNotification);

  // Belege vom Server laden
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/belege?mandantNr=${encodeURIComponent(currentMandant.nr)}&mandantName=${encodeURIComponent(currentMandant.name)}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("bs_token")}` },
        });
        if (!res.ok) return;
        const { files } = await res.json();
        if (!files?.length) return;
        const serverDocs = files.map((f, i) => ({
          id: `server_${currentMandant.id}_${i}_${f.name}`, name: f.name, size: f.size,
          type: f.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
          uploadedAt: f.createdAt, status: "ausstehend", category: "Nicht klassifiziert", amount: "---",
        }));
        setAllDocs((prev) => {
          const existing = prev[currentMandant.id] || [];
          const names = new Set(existing.map((d) => d.name));
          const newDocs = serverDocs.filter((d) => !names.has(d.name));
          if (!newDocs.length) return prev;
          return { ...prev, [currentMandant.id]: [...newDocs, ...existing] };
        });
      } catch {}
    };
    load();
  }, [currentMandant.id]);

  const selectMandant = (m) => {
    setCurrentMandant(m);
    setSearchQuery("");
    showNotification(`Mandant gewechselt: ${m.name}`);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    uploadToLocal(e.dataTransfer.files);
  }, [currentMandant]);

  const runKiAnalysis = () => {
    const pending = docs.filter((d) => d.status === "ausstehend");
    if (!pending.length) { showNotification("Keine ausstehenden Belege.", "error"); return; }
    setAllDocs((prev) => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map((d) => d.status === "ausstehend" ? { ...d, status: "in_bearbeitung" } : d) }));
    setTimeout(() => {
      setAllDocs((prev) => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map((d) => d.status === "in_bearbeitung" ? { ...d, status: "analysiert", category: d.category === "Nicht klassifiziert" ? "Sonstige Ausgaben" : d.category } : d) }));
      showNotification("KI-Analyse abgeschlossen ✓");
    }, 2800);
  };

  const handleConfirm = (docId, editedData) => {
    setAllDocs(prev => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map(d => d.id === docId ? { ...d, status: "analysiert", extractedData: editedData, amount: editedData.angerechnetBetrag ?? editedData.gesamtBetrag } : d) }));
    setSelectedDoc(null);
    showNotification("Beleg bestätigt und gespeichert ✓");
  };

  const handleDiscard = (docId) => {
    setAllDocs(prev => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).filter(d => d.id !== docId) }));
    setSelectedDoc(null);
    showNotification("Beleg verworfen", "error");
  };

  const docs = allDocs[currentMandant.id] || [];
  const filteredDocs = docs.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const stats = {
    total:      docs.length,
    analysiert: docs.filter((d) => d.status === "analysiert").length,
    ausstehend: docs.filter((d) => d.status === "ausstehend").length,
  };

  return (
      <div style={{ display: "flex", minHeight: "100vh", width: "100%", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#f8f7f4" }}>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; background: #f8f7f4; }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes slideIn  { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dropDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 199; }
        .mobile-topbar   { display: none; }
        .bottom-nav      { display: none; }
        @media (max-width: 900px) {
          .main-content  { margin-left: 0 !important; }
          .sidebar       { transform: translateX(-100%); transition: transform .25s ease !important; z-index: 200 !important; }
          .sidebar.open  { transform: translateX(0) !important; }
          .sidebar-overlay { display: block !important; }
          .mobile-topbar { display: flex !important; }
          .stats-grid    { grid-template-columns: 1fr 1fr 1fr !important; }
          .bottom-nav    { display: flex !important; }
        }
        @media (max-width: 600px) {
          .stats-grid    { grid-template-columns: 1fr 1fr !important; }
          .col-hide      { display: none !important; }
        }
      `}</style>

        {/* Modals */}
        {cameraOpen && <DocumentScanModal onClose={() => setCameraOpen(false)} onCapture={(file) => uploadToLocal([file])} />}
        {selectedDoc && <DocDetailModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} onConfirm={(ed) => handleConfirm(selectedDoc.id, ed)} onDiscard={() => handleDiscard(selectedDoc.id)} />}

        {/* Sidebar overlay */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Mobile Topbar */}
        <MobileTopbar onMenuClick={() => setSidebarOpen((v) => !v)} onCameraClick={() => setCameraOpen(true)} />

        {/* Sidebar */}
        <Sidebar currentMandant={currentMandant} sidebarOpen={sidebarOpen} onSelectMandant={selectMandant} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

        {/* Main */}
        <main className="main-content" style={{ marginLeft: 240, flex: 1, minWidth: 0, padding: isMobile ? "90px 16px 84px" : "30px 32px", animation: "fadeUp .4s ease", display: "flex", justifyContent: "center", background: "#f8f7f4" }}>
          <div style={{ width: "100%", maxWidth: 900 }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              {!isMobile && <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: "#0b2e44", fontWeight: 400, marginBottom: 3 }}>Belegverwaltung</h1>}
              <p style={{ color: "#6b7280", fontSize: 13 }}>Belege für <span style={{ fontWeight: 600, color: "#18537a" }}>{currentMandant.name}</span></p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
              {[
                { label: "Belege gesamt", value: stats.total,      icon: "bi-file-text",      accent: "#18537a" },
                { label: "Analysiert",    value: stats.analysiert, icon: "bi-check2",          accent: "#16a34a" },
                { label: "Ausstehend",    value: stats.ausstehend, icon: "bi-hourglass-split", accent: "#d97706" },
              ].map((s) => (
                  <div key={s.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e8e4dc" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: s.accent }}>{s.value}</div>
                    </div>
                    <i className={`bi ${s.icon}`} style={{ fontSize: 26, opacity: 0.5, color: s.accent }} />
                  </div>
              ))}
            </div>

            {/* Upload Zone */}
            <div onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                 onClick={() => !uploading && fileInputRef.current?.click()}
                 style={{ background: dragging ? "#fffbeb" : "#fff", border: `2px dashed ${dragging ? "#fd8f19" : "#d1d5db"}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: uploading ? "default" : "pointer", marginBottom: 20, transition: "all .2s" }}>
              {uploading ? (
                  <div>
                    <p style={{ color: "#374151", fontWeight: 600, marginBottom: 10 }}>Hochladen…</p>
                    <div style={{ height: 5, background: "#e5e7eb", borderRadius: 10, maxWidth: 300, margin: "0 auto", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(uploadProgress, 100)}%`, background: "linear-gradient(90deg,#18537a,#fd8f19)", borderRadius: 10, transition: "width .1s linear" }} />
                    </div>
                  </div>
              ) : (
                  <>
                    <i className={`bi ${dragging ? "bi-cloud-upload" : "bi-upload"}`} style={{ fontSize: 24, opacity: dragging ? 1 : 0.45 }} />
                    <p style={{ color: "#374151", fontWeight: 600, fontSize: 14, marginBottom: 3, marginTop: 8 }}>{dragging ? "Datei hier ablegen" : "Belege per Drag & Drop hochladen"}</p>
                    <p style={{ color: "#9ca3af", fontSize: 12 }}>PDF, JPG, PNG</p>
                  </>
              )}
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => uploadToLocal(e.target.files)} />

            {/* KI Banner */}
            <div style={{ background: "linear-gradient(135deg,#0b2e44 0%,#18537a 100%)", borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, border: "1px solid rgba(201,168,76,.2)" }}>
              <div>
                <p style={{ color: "#f0f8ff", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>KI-Analyse bereit</p>
                <p style={{ color: "#7ab8d0", fontSize: 11 }}>{stats.ausstehend} Beleg{stats.ausstehend !== 1 ? "e" : ""} warten auf Klassifizierung</p>
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
              <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 60px", padding: "8px 20px", background: "#fafaf8", borderBottom: "1px solid #f0ece4" }}>
                {["DATEI", "DATUM", "KATEGORIE", "BETRAG", "STATUS", "KI"].map((h) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em" }}>{h}</span>
                ))}
              </div>
              {filteredDocs.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Keine Belege gefunden.</div>
              ) : filteredDocs.map((doc, i) => {
                const conf = doc.confidence;
                const confColor = !conf ? "#d1d5db" : conf >= 85 ? "#16a34a" : conf >= 65 ? "#d97706" : "#dc2626";
                return (
                    <div key={doc.id} onClick={() => doc.extractedData && setSelectedDoc(doc)}
                         style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 60px", padding: "12px 20px", borderBottom: i < filteredDocs.length - 1 ? "1px solid #f9f7f3" : "none", alignItems: "center", cursor: doc.extractedData ? "pointer" : "default", transition: "background .12s" }}
                         onMouseEnter={e => (e.currentTarget.style.background = "#fafaf8")}
                         onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FileIcon type={doc.type} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827", marginBottom: 1 }}>{doc.name}</div>
                          <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{doc.size}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{doc.uploadedAt}</span>
                      <span style={{ fontSize: 11, color: "#374151", background: "#f3f4f6", padding: "3px 7px", borderRadius: 5, fontWeight: 500 }}>{doc.category}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{doc.amount}</span>
                      <StatusBadge status={doc.status} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {conf ? (<>
                          <div style={{ flex: 1, height: 4, background: "#f0ece4", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${conf}%`, background: confColor, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: confColor, minWidth: 24 }}>{conf}%</span>
                        </>) : <span style={{ fontSize: 10, color: "#d1d5db" }}>—</span>}
                      </div>
                    </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Bottom Nav */}
        <BottomNav/>

        {/* Toast */}
        {notification && (
            <div style={{ position: "fixed", bottom: 24, right: 24, background: notification.type === "error" ? "#fef2f2" : "#f0fdf4", border: `1px solid ${notification.type === "error" ? "#fca5a5" : "#86efac"}`, color: notification.type === "error" ? "#dc2626" : "#16a34a", padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.08)", animation: "slideIn .3s ease", zIndex: 1000, display: "flex", alignItems: "center", gap: 7 }}>
              {notification.type === "error" ? <i className="bi bi-exclamation-triangle-fill" /> : <i className="bi bi-check2" />} {notification.msg}
            </div>
        )}
      </div>
  );
}