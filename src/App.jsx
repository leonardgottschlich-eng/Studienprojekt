import 'bootstrap-icons/font/bootstrap-icons.css';
import { useState, useRef, useCallback, useEffect } from "react";

import { MANDANTEN, DOCS_BY_MANDANT } from "./data/mockData";
import { apiFetch, userToMandant, documentToDoc, updatePayload, dateiZuDataUrl, neuerBelegPayload } from "./api";
import { filterBelege, trefferFeld, vorhandeneKategorien, LEERER_FILTER } from "./utils/belegFilter";
import { kategorienVon, bereinigeKategorien } from "./data/kategorien";
import { lokalFetch } from "./localServer";
import { ladeEinstellungen, speichereEinstellungen, ladeLetztenMandanten, merkeMandanten } from "./settings";
import { useUpload } from "./hooks/useUpload";
import MandantAvatar from "./components/MandantAvatar";
import FileIcon from "./components/FileIcon";
import StatusBadge from "./components/StatusBadge";
import Sidebar from "./components/Sidebar";
import MobileTopbar from "./components/MobileTopbar";
import BottomNav from "./components/BottomNav";
import DocumentScanModal from "./components/DocumentScanModal";
import DocDetailModal from "./components/DocDetailModal";
import ScannerInbox from "./components/ScannerInbox";
import BelegSuche from "./components/BelegSuche";
import SettingsPage from "./components/SettingsPage";
import KategorieChips from "./components/KategorieChips";
import DashboardBerater from "./components/DashboardBerater";
import DashboardMandant from "./components/DashboardMandant";
import StatTile from "./components/StatTile";

/**
 * Rolle des angemeldeten Benutzers. Das Backend liefert die Gruppen
 * admin / tax_advisor / client ("user" ist die alte Mandanten-Gruppe).
 * Ohne Gruppen (Demo-Modus mit Mock-Daten) gilt die Kanzlei-Ansicht.
 */
const istMandantenRolle = (user) => {
  const gruppen = user?.groups ?? [];
  if (gruppen.includes("admin") || gruppen.includes("tax_advisor")) return false;
  return gruppen.includes("client") || gruppen.includes("user");
};

export default function App({ user, onLogout }) {
  const istMandant = istMandantenRolle(user);

  const [view, setView]               = useState("dashboard");
  const [zuordnungUnbekannt, setZuordnungUnbekannt] = useState(false);
  const [allDocs, setAllDocs]         = useState({ ...DOCS_BY_MANDANT });
  const [mandanten, setMandanten]     = useState(MANDANTEN);
  const [currentMandant, setCurrentMandant] = useState(MANDANTEN[0]);
  const [dragging, setDragging]       = useState(false);
  const [filter, setFilter]           = useState({ ...LEERER_FILTER });
  const [page, setPage]               = useState("belege");
  const [einstellungen, setEinstellungen] = useState(ladeEinstellungen);
  const [notification, setNotification] = useState(null);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 900);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [scanInbox, setScanInbox]     = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Einstellungen bei jeder Änderung sichern
  useEffect(() => { speichereEinstellungen(einstellungen); }, [einstellungen]);

  // "Einstellungen" ist eine eigene Seite; "Dashboard" und "Belege" sind die
  // beiden Ansichten der Belegseite.
  const navigiere = (seite) => {
    if (seite === "einstellungen") {
      setPage("einstellungen");
    } else {
      setPage("belege");
      setView(seite);
    }
    setSidebarOpen(false);
  };

  // Für die Markierung in Sidebar und Bottom-Nav
  const aktiveSeite = page === "einstellungen" ? "einstellungen" : view;

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogout = async () => {
    try {
      // Backend-Token widerrufen
      await apiFetch("/logout", { method: "POST" });
    } catch { /* Backend-Logout optional */ }
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

  useEffect(() => {
    const testConnection = async () => {
      try {
        const data = await apiFetch("/test-connection", { token: null });
        console.log("Backend-Verbindung:", data);
      } catch (err) {
        console.error("Fehler beim Abruf:", err.message);
      }
    };
    testConnection();
  }, []);

  // Mandanten aus der Datenbank laden (Benutzer der Gruppe "client").
  // Klappt das, fliegen die Mock-Daten raus; sonst bleibt der Demo-Modus.
  //
  // Welche Mandanten sichtbar sind, hängt von der Rolle ab:
  //   client       – nur man selbst
  //   tax_advisor  – die zugewiesenen (Tabelle advisor_clients)
  //   admin        – alle
  const ladeMandanten = useCallback(async () => {
    try {
      const { data } = await apiFetch("/users");
      const alleClients = (data || [])
          .filter((u) => u.groups?.includes("client") || u.groups?.includes("user"))
          .map(userToMandant);

      // Mandant: nur der eigene Datensatz. Steht er nicht in /users
      // (eingeschränkte Sicht), wird er aus dem Login-Benutzer gebaut.
      if (istMandant) {
        const eigener = alleClients.filter((m) => m.id === user.id);
        const liste = eigener.length ? eigener : [userToMandant(user, 0)];
        setMandanten(liste);
        // Auf Wunsch beim zuletzt gewählten Mandanten weitermachen
        const gemerkt = einstellungen.mandantMerken ? ladeLetztenMandanten() : null;
        setCurrentMandant(liste.find((m) => m.id === gemerkt) ?? liste[0]);
        setAllDocs({});
        return;
      }

      if (!alleClients.length) return;

      // Steuerberater:in – auf die aktiv zugewiesenen Mandanten einschränken.
      // Gibt es keine Zuordnung (oder liefert der Endpunkt nichts), bleiben
      // alle Mandanten sichtbar; das Dashboard weist darauf hin.
      let liste = alleClients;
      if (user?.groups?.includes("tax_advisor")) {
        let zugewiesen = null;
        try {
          const { data: links } = await apiFetch("/advisor-clients");
          zugewiesen = new Set(
              (links || [])
                  .filter((l) => l.status === "active" && l.advisor_user_id === user.id)
                  .map((l) => l.client_user_id)
          );
        } catch {
          console.warn("advisor-clients nicht abrufbar – es werden alle Mandanten angezeigt.");
        }
        if (zugewiesen?.size) liste = alleClients.filter((m) => zugewiesen.has(m.id));
        else setZuordnungUnbekannt(true);
      }

      setMandanten(liste);
      setCurrentMandant(liste[0]);
      setAllDocs({});
    } catch {
      console.warn("Backend nicht erreichbar – Demo-Modus mit Mock-Daten.");
    }
  }, [istMandant, user]);

  // Belege aus der Datenbank laden – alle sichtbaren auf einmal und nach
  // Mandant gruppiert. Die Kanzlei-Startseite braucht die Zahlen aller
  // Mandanten, nicht nur die des gerade ausgewählten.
  const loadBackendDocs = useCallback(async () => {
    try {
      const { data } = await apiFetch("/documents");
      const gruppiert = {};
      (data || []).forEach((d) => {
        const mandantId = d.client_user_id ?? d.user_id;
        (gruppiert[mandantId] ||= []).push(documentToDoc(d));
      });
      setAllDocs((prev) => {
        const next = { ...prev };
        // Lokal hochgeladene Bilder und Scanner-Dateien bleiben erhalten,
        // sie stehen nicht in der Datenbank.
        for (const id of new Set([...Object.keys(prev), ...Object.keys(gruppiert)])) {
          // Zugeordnete Scans liegen zusätzlich im lokalen Mandantenordner –
          // bei gleichem Dateinamen gewinnt der Beleg aus der Datenbank
          const namen = new Set((gruppiert[id] || []).map((d) => d.name));
          const andere = (prev[id] || []).filter((d) => !d.backendDoc && !namen.has(d.name));
          next[id] = [...(gruppiert[id] || []), ...andere];
        }
        return next;
      });
    } catch { /* Backend nicht erreichbar */ }
  }, []);

  // Belege vom Server laden
  const loadServerDocs = useCallback(async (mandant) => {
    try {
      const res = await lokalFetch(`/api/belege?mandantNr=${encodeURIComponent(mandant.nr)}&mandantName=${encodeURIComponent(mandant.name)}`);
      if (!res.ok) return;
      const { files } = await res.json();
      if (!files?.length) return;
      const serverDocs = files.map((f, i) => ({
        id: `server_${mandant.id}_${i}_${f.name}`, name: f.name, size: f.size,
        type: f.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
        uploadedAt: f.createdAt, status: "ausstehend", kategorien: [], amount: "---",
        serverFile: true,
      }));
      setAllDocs((prev) => {
        const existing = prev[mandant.id] || [];
        const names = new Set(existing.map((d) => d.name));
        const newDocs = serverDocs.filter((d) => !names.has(d.name));
        if (!newDocs.length) return prev;
        return { ...prev, [mandant.id]: [...newDocs, ...existing] };
      });
    } catch {}
  }, []);

  // Erst die Mandanten (leert die Demo-Daten), danach die Belege – sonst
  // würde das Leeren die schon geladenen Belege wieder verwerfen.
  useEffect(() => {
    (async () => {
      await ladeMandanten();
      loadBackendDocs();
    })();
  }, [ladeMandanten, loadBackendDocs]);

  // Abhängigkeit ist das Mandanten-Objekt selbst: nach dem Laden der echten
  // Mandanten kann sich der Mandant ändern, ohne dass die id wechselt
  // (Mock-Ids und Datenbank-Ids überschneiden sich)
  useEffect(() => {
    loadBackendDocs(currentMandant);
    loadServerDocs(currentMandant);
  }, [currentMandant]);

  // Scanner-Eingang abfragen (alle 10 s) – automatisch zugeordnete Scans
  // erscheinen dabei über loadServerDocs direkt in der Belegliste.
  // Der Scanner gehört zur Kanzlei, Mandanten fragen ihn nicht ab.
  useEffect(() => {
    if (istMandant) return;
    const fetchInbox = async () => {
      try {
        const res = await fetch("/api/scan/inbox", {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("bs_token")}` },
        });
        if (!res.ok) return;
        const { files } = await res.json();
        setScanInbox(files || []);
      } catch {}
    };
    fetchInbox();
    if (!einstellungen.autoAktualisieren) return;
    const timer = setInterval(() => {
      fetchInbox();
      loadServerDocs(currentMandant);
      loadBackendDocs(currentMandant);
    }, 10000);
    return () => clearInterval(timer);
  }, [currentMandant, istMandant,einstellungen.autoAktualisieren, einstellungen.intervallSekunden]);

  /**
   * Scan benennen, einem Mandanten zuordnen und als Beleg ins Backend übernehmen.
   * Das Original wandert zusätzlich in den Mandantenordner des Scan-Servers und
   * bleibt dort als lokales Archiv liegen.
   */
  const assignScan = async (fileName, mandantNr, newName = null) => {
    const mandant = mandanten.find((m) => m.nr === mandantNr);
    if (!mandant) { showNotification("Unbekannter Mandant.", "error"); return; }

    const endung   = fileName.slice(fileName.lastIndexOf("."));
    const zielName = newName ? `${newName}${endung}` : fileName;
    const istPdf   = /\.pdf$/i.test(fileName);

    try {
      // 1. Beleg in der Datenbank anlegen – zuerst, damit bei einem Fehler
      //    noch nichts verschoben wurde. Bilder kann das Backend nicht annehmen.
      if (istPdf) {
        const datei = await lokalFetch(`/api/scan/file?name=${encodeURIComponent(fileName)}`);
        if (!datei.ok) throw new Error("Scan konnte nicht gelesen werden.");
        await apiFetch("/documents", {
          method: "POST",
          body: neuerBelegPayload({
            mandant,
            dateiName: zielName,
            dataUrl: await dateiZuDataUrl(await datei.blob()),
          }),
        });
      }

      // 2. Original lokal einsortieren
      const res = await lokalFetch("/api/scan/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, mandantNr, mandantName: mandant.name, newName }),
      });
      if (!res.ok) throw new Error("Einsortieren auf dem Scan-Server fehlgeschlagen.");

      setScanInbox((prev) => prev.filter((f) => f.name !== fileName));
      loadBackendDocs(mandant);
      loadServerDocs(mandant);
      showNotification(istPdf
          ? `Beleg zugeordnet: ${mandant.name} ✓`
          : `Bild zugeordnet: ${mandant.name} – bleibt lokal, das Backend nimmt nur PDF`);
    } catch (e) {
      showNotification(`Zuordnung fehlgeschlagen: ${e.message}`, "error");
    }
  };

  const selectMandant = (m) => {
    setCurrentMandant(m);
    setFilter({ ...LEERER_FILTER });
    merkeMandanten(m.id);
    showNotification(`Mandant gewechselt: ${m.name}`);
  };

  // Klick auf einen Mandanten in der Kanzlei-Startseite: wechseln und
  // gleich dessen Belege öffnen.
  const oeffneMandantenbelege = (m) => {
    selectMandant(m);
    setView("belege");
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
      // Ohne Klassifikation vergibt die Analyse eine Startkategorie – vorhandene bleiben unberührt
      setAllDocs((prev) => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map((d) => d.status === "in_bearbeitung" ? { ...d, status: "analysiert", kategorien: kategorienVon(d).length ? kategorienVon(d) : ["Sonstige Ausgaben"] } : d) }));
      showNotification("KI-Analyse abgeschlossen ✓");
    }, 2800);
  };

  const handleConfirm = async (docId, editedData, kategorien = []) => {
    const doc = (allDocs[currentMandant.id] || []).find((d) => d.id === docId);

    // Backend-Belege: bestätigte Daten in die Datenbank schreiben
    if (doc?.backendDoc) {
      try {
        await apiFetch(`/documents/${doc.apiId}`, {
          method: "PATCH",
          body: updatePayload(editedData, kategorien),
        });
      } catch (e) {
        showNotification(`Speichern im Backend fehlgeschlagen: ${e.message}`, "error");
        return;
      }
    }

    setAllDocs(prev => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map(d => d.id === docId ? { ...d, status: "analysiert", extractedData: editedData, kategorien: bereinigeKategorien(kategorien), amount: editedData.angerechnetBetrag ?? editedData.gesamtBetrag } : d) }));
    setSelectedDoc(null);
    showNotification("Beleg bestätigt und gespeichert ✓");
  };

  const handleDiscard = async (doc) => {
    // Backend-Belege in der Datenbank löschen (Soft-Delete)
    if (doc.backendDoc) {
      try {
        await apiFetch(`/documents/${doc.apiId}`, { method: "DELETE" });
      } catch (e) {
        showNotification(`Löschen im Backend fehlgeschlagen: ${e.message}`, "error");
        return;
      }
    }
    // Dateien vom Server auch dort löschen – sonst tauchen sie beim
    // nächsten Abgleich (Polling) wieder in der Liste auf
    if (doc.serverFile) {
      try {
        const res = await lokalFetch(`/api/belege/file?mandantNr=${encodeURIComponent(currentMandant.nr)}&mandantName=${encodeURIComponent(currentMandant.name)}&name=${encodeURIComponent(doc.name)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("bs_token")}` },
        });
        if (!res.ok) throw new Error();
      } catch {
        showNotification("Löschen auf dem Server fehlgeschlagen.", "error");
        return;
      }
    }
    setAllDocs(prev => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).filter(d => d.id !== doc.id) }));
    setSelectedDoc(null);
    showNotification("Beleg gelöscht", "error");
  };

  const docs = allDocs[currentMandant.id] || [];
  const filteredDocs = filterBelege(docs, filter);
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
        /* Mobile Browser zählen die Adressleiste zu 100vh dazu – dadurch hing
           der Logout-Button unten in der Sidebar unter dem sichtbaren Rand.
           dvh = tatsächlich sichtbare Höhe; 100vh bleibt als Fallback. */
        @supports (height: 100dvh) {
          .sidebar { height: 100dvh !important; }
        }
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
        {selectedDoc && <DocDetailModal doc={selectedDoc} mandant={currentMandant} onClose={() => setSelectedDoc(null)} onConfirm={(ed, kats) => handleConfirm(selectedDoc.id, ed, kats)} onDiscard={() => handleDiscard(selectedDoc)} />}

        {/* Sidebar overlay */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Mobile Topbar */}
        <MobileTopbar onMenuClick={() => setSidebarOpen((v) => !v)} onCameraClick={() => setCameraOpen(true)} />

        {/* Sidebar */}
        <Sidebar currentMandant={currentMandant} mandanten={mandanten} sidebarOpen={sidebarOpen} onSelectMandant={selectMandant} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} activePage={aktiveSeite} onNavigate={navigiere} zeigeMandantenwechsel={!istMandant} />

        {/* Main */}
        <main className="main-content" style={{ marginLeft: 240, flex: 1, minWidth: 0, padding: isMobile ? "90px 16px 84px" : "30px 32px", animation: "fadeUp .4s ease", display: "flex", justifyContent: "center", background: "#f8f7f4" }}>
          {page === "einstellungen" ? (
              <SettingsPage user={user} einstellungen={einstellungen} setEinstellungen={setEinstellungen}
                            showNotification={showNotification} isMobile={isMobile} />
          ) : (
          <div style={{ width: "100%", maxWidth: 900 }}>

            {/* Dateiauswahl – wird von der Startseite und der Belegliste genutzt */}
            <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => uploadToLocal(e.target.files)} />

            {view === "dashboard" ? (
              istMandant ? (
                <DashboardMandant
                    user={user}
                    mandant={currentMandant}
                    docs={docs}
                    isMobile={isMobile}
                    onOpenDoc={setSelectedDoc}
                    onZurBelegliste={() => setView("belege")}
                    onUpload={() => fileInputRef.current?.click()}
                    onScan={() => setCameraOpen(true)}
                />
              ) : (
                <DashboardBerater
                    user={user}
                    mandanten={mandanten}
                    allDocs={allDocs}
                    scanInboxCount={scanInbox.length}
                    zuordnungUnbekannt={zuordnungUnbekannt}
                    isMobile={isMobile}
                    onSelectMandant={oeffneMandantenbelege}
                    onScannerEingang={() => setView("belege")}
                />
              )
            ) : (<>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              {!isMobile && <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: "#0b2e44", fontWeight: 400, marginBottom: 3 }}>Belegverwaltung</h1>}
              <p style={{ color: "#6b7280", fontSize: 13 }}>
                {istMandant ? "Ihre Belege" : <>Belege für <span style={{ fontWeight: 600, color: "#18537a" }}>{currentMandant.name}</span></>}
              </p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
              <StatTile label="Belege gesamt" value={stats.total}      icon="bi-file-text"      accent="#18537a" />
              <StatTile label="Analysiert"    value={stats.analysiert} icon="bi-check2"         accent="#16a34a" />
              <StatTile label="Ausstehend"    value={stats.ausstehend} icon="bi-hourglass-split" accent="#d97706" />
            </div>

            {/* Scanner-Eingang: unzugeordnete Scans benennen und zuordnen.
                Nur für Kanzlei-Rollen und nur, wenn in den Einstellungen gewünscht. */}
            {!istMandant && einstellungen.scannerEingangAnzeigen && (
                <ScannerInbox files={scanInbox} mandanten={mandanten} onAssign={assignScan} />
            )}

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
              <BelegSuche filter={filter} onChange={setFilter} kategorien={vorhandeneKategorien(docs)}
                          anzahl={filteredDocs.length} gesamt={docs.length} />
              <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 60px", padding: "8px 20px", background: "#fafaf8", borderBottom: "1px solid #f0ece4" }}>
                {["DATEI", "DATUM", "KATEGORIE", "BETRAG", "STATUS", "KI"].map((h) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em" }}>{h}</span>
                ))}
              </div>
              {filteredDocs.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    {docs.length === 0 ? "Noch keine Belege für diesen Mandanten." : (
                        <>
                          Kein Beleg passt zu Suche und Zeitraum.
                          <button onClick={() => setFilter({ ...LEERER_FILTER })}
                                  style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#18537a", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            Filter zurücksetzen
                          </button>
                        </>
                    )}
                  </div>
              ) : filteredDocs.map((doc, i) => {
                const conf = doc.confidence;
                const treffer = trefferFeld(doc, filter.query);
                const confColor = !conf ? "#d1d5db" : conf >= 85 ? "#16a34a" : conf >= 65 ? "#d97706" : "#dc2626";
                return (
                    <div key={doc.id} onClick={() => setSelectedDoc(doc)}
                         style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 60px", padding: "12px 20px", borderBottom: i < filteredDocs.length - 1 ? "1px solid #f9f7f3" : "none", alignItems: "center", cursor: "pointer", transition: "background .12s" }}
                         onMouseEnter={e => (e.currentTarget.style.background = "#fafaf8")}
                         onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <FileIcon type={doc.type} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827", marginBottom: 1 }}>{doc.name}</div>
                          <div style={{ fontSize: 10.5, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.size}
                            {/* Zeigt an, wo der Suchbegriff steckt, wenn nicht im Dateinamen */}
                            {treffer && <span style={{ color: "#b45309" }}> · {treffer.label}: {treffer.wert}</span>}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{doc.uploadedAt}</span>
                      <KategorieChips doc={doc} />
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
            </>)}
          </div>
          )}
        </main>

        {/* Bottom Nav */}
        <BottomNav activePage={aktiveSeite} onNavigate={navigiere} />

        {/* Toast */}
        {notification && (
            <div style={{ position: "fixed", bottom: 24, right: 24, background: notification.type === "error" ? "#fef2f2" : "#f0fdf4", border: `1px solid ${notification.type === "error" ? "#fca5a5" : "#86efac"}`, color: notification.type === "error" ? "#dc2626" : "#16a34a", padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.08)", animation: "slideIn .3s ease", zIndex: 1000, display: "flex", alignItems: "center", gap: 7 }}>
              {notification.type === "error" ? <i className="bi bi-exclamation-triangle-fill" /> : <i className="bi bi-check2" />} {notification.msg}
            </div>
        )}
      </div>
  );
}