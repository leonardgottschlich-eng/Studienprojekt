import 'bootstrap-icons/font/bootstrap-icons.css';
import { useState, useRef, useCallback, useEffect } from "react";

import { apiFetch, userToMandant, documentToDoc, updatePayload, dateiZuDataUrl, neuerBelegPayload, exportiereBelegeAlsZip, fehlerText } from "./api";
import { filterBelege, vorhandeneKategorien, datumFuer, iso, LEERER_FILTER } from "./utils/belegFilter";
import { bereinigeKategorien } from "./data/kategorien";
import { lokalFetch } from "./localServer";
import { analysiereBeleg } from "./lib/kiAnalyse";
import { speichereBlob } from "./lib/belegDatei";
import { bildZuPdfDatei, alsPdfName } from "./lib/jpegZuPdf";
import { ladeEinstellungen, speichereEinstellungen, ladeLetztenMandanten, merkeMandanten, ladeLetzteSeite, merkeSeite, ladeKiBelege, merkeKiBeleg } from "./settings";
import { useUpload } from "./hooks/useUpload";
import Sidebar from "./components/Sidebar";
import MobileTopbar from "./components/MobileTopbar";
import BottomNav from "./components/BottomNav";
import DocumentScanModal from "./components/DocumentScanModal";
import DocDetailModal from "./components/DocDetailModal";
import ScannerInbox from "./components/ScannerInbox";
import BelegSuche from "./components/BelegSuche";
import BelegListe, { SPALTEN } from "./components/BelegListe";
import SettingsPage from "./components/SettingsPage";
import DashboardBerater from "./components/DashboardBerater";
import DashboardMandant from "./components/DashboardMandant";
import MandantAnlegenModal from "./components/MandantAnlegenModal";
import StatTile from "./components/StatTile";

/**
 * Ist der angemeldete Benutzer ein Mandant? Das Backend liefert die Gruppen
 * admin, tax_advisor und client. "user" ist die ältere Bezeichnung für
 * Mandanten und wird genauso behandelt.
 */
const istMandantenRolle = (user) => {
  const gruppen = user?.groups ?? [];
  if (gruppen.includes("admin") || gruppen.includes("tax_advisor")) return false;
  return gruppen.includes("client") || gruppen.includes("user");
};

const SEITEN = ["dashboard", "belege", "einstellungen"];

// Nach dem Neuladen auf derselben Seite weitermachen
const startSeite = () => {
  const gemerkt = ladeLetzteSeite();
  return SEITEN.includes(gemerkt) ? gemerkt : "dashboard";
};

// "Beleg.png" wird zu "Beleg". So lassen sich Archivkopie und Datenbank-Beleg
// vergleichen, auch wenn aus einem Bild beim Hochladen ein PDF wurde.
const ohneEndung = (name = "") => name.replace(/\.[^.]+$/, "");

// "2026-09-22" wird zu "22.09.2026"
const deutschesDatum = (iso) => String(iso).split("-").reverse().join(".");

// Fehlermeldungen des Export-Endpunkts
const EXPORT_FEHLER = {
  403: () => "Für diesen Mandanten dürfen Sie nicht exportieren.",
  404: (spanne) => `Im Zeitraum ${spanne} liegen keine Belege.`,
  413: () => "Zu viele oder zu große Belege, erlaubt sind höchstens 500 PDFs und 100 MB. Bitte den Zeitraum verkleinern.",
};

// Warum die simulierte KI einen Beleg nicht erkannt hat
const KI_GRUND = {
  nicht_vorbereitet: "nicht erkannt. Erkannt werden nur Belege, die über Google Drive hereinkommen.",
};

// Aussehen der Kurzmeldungen unten rechts
const TOAST_STIL = {
  success: { icon: "bi-check2",                    stil: { background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a" } },
  error:   { icon: "bi-exclamation-triangle-fill", stil: { background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" } },
  info:    { icon: "bi-info-circle-fill",          stil: { background: "#eef4f8", border: "1px solid #a8c9dd", color: "#18537a" } },
};

export default function App({ user, onLogout }) {
  const istMandant = istMandantenRolle(user);

  const [seite, setSeite]             = useState(startSeite);
  const [zuordnungUnbekannt, setZuordnungUnbekannt] = useState(false);
  const [allDocs, setAllDocs]         = useState({});
  const [mandanten, setMandanten]     = useState([]);
  const [currentMandant, setCurrentMandant] = useState(null);
  const [laedtMandanten, setLaedtMandanten] = useState(true);
  const [backendFehler, setBackendFehler]   = useState(false);
  const [dragging, setDragging]       = useState(false);
  const [filter, setFilter]           = useState({ ...LEERER_FILTER });
  const [einstellungen, setEinstellungen] = useState(ladeEinstellungen);
  const [notification, setNotification] = useState(null);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 900);
  const [selectedDoc, setSelectedDoc] = useState(null);
  // Über den Stift geöffnete Belege starten gleich im Bearbeitungsmodus
  const [bearbeitenDirekt, setBearbeitenDirekt] = useState(false);
  const [scanInbox, setScanInbox]     = useState([]);
  // Wann der Eingang zuletzt abgefragt wurde und ob beide Quellen antworteten
  const [inboxStand, setInboxStand]   = useState(null);
  const [mandantAnlegenOffen, setMandantAnlegenOffen] = useState(false);
  const [exportLaeuft, setExportLaeuft] = useState(false);
  const fileInputRef = useRef(null);
  // IDs der Belege, die die KI gerade analysiert. Sonst würde das regelmäßige
  // Neuladen sie zwischendurch wieder als "ausstehend" anzeigen.
  const kiInArbeit = useRef(new Set());
  const [kiLaeuft, setKiLaeuft] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Einstellungen bei jeder Änderung sichern
  useEffect(() => { speichereEinstellungen(einstellungen); }, [einstellungen]);

  /*
   * Browser-Verlauf: Jeder Seitenwechsel und jeder geöffnete Dialog bekommt
   * einen eigenen Eintrag. Die Zurück-Taste schließt so zuerst den Dialog,
   * was am Handy wichtig ist, und springt dann zur vorigen Seite, statt die
   * App zu verlassen. Die URL bleibt dabei unverändert.
   */
  useEffect(() => {
    window.history.replaceState({ seite: startSeite() }, "");

    const onPopState = (e) => {
      // Wer vorwärts auf einen Dialog-Eintrag springt, findet den Dialog
      // bereits geschlossen vor. Dann geht es gleich weiter zurück.
      if (e.state?.dialog) { window.history.back(); return; }
      setSeite(SEITEN.includes(e.state?.seite) ? e.state.seite : "dashboard");
      setSelectedDoc(null);
      setBearbeitenDirekt(false);
      setCameraOpen(false);
      setSidebarOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigiere = (ziel) => {
    setSidebarOpen(false);
    if (ziel === seite) return;
    window.history.pushState({ seite: ziel }, "");
    setSeite(ziel);
  };

  // Dialoge wie Beleg und Kamera legen einen Verlaufseintrag an. Geschlossen
  // wird über "zurück", damit kein toter Schritt im Verlauf liegen bleibt.
  const oeffneDialog = () => {
    if (!window.history.state?.dialog) window.history.pushState({ seite, dialog: true }, "");
  };
  const schliesseDialog = () => {
    if (window.history.state?.dialog) {
      window.history.back();   // popstate schließt den Dialog
    } else {
      setSelectedDoc(null);
      setBearbeitenDirekt(false);
      setCameraOpen(false);
    }
  };

  const oeffneBeleg = (doc, bearbeiten = false) => {
    setBearbeitenDirekt(bearbeiten);
    setSelectedDoc(doc);
    oeffneDialog();
  };
  const oeffneKamera = () => {
    // Ohne Mandant wüsste der Scan nicht, wohin er gehört
    if (!currentMandant) {
      showNotification("Kein Mandant ausgewählt, dem der Scan zugeordnet werden könnte.", "info");
      return;
    }
    setCameraOpen(true);
    oeffneDialog();
  };

  // Aktuelle Seite merken, damit ein Neuladen hier bleibt
  useEffect(() => { merkeSeite(seite); }, [seite]);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogout = async () => {
    // Abmelden klappt auch dann, wenn einer der Server nicht antwortet
    try {
      await apiFetch("/logout", { method: "POST" });
    } catch { /* Backend nicht erreichbar */ }
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("bs_token")}` },
      });
    } catch { /* Scan-Server nicht erreichbar */ }
    onLogout?.();
  };

  const { uploading, uploadProgress, uploadToLocal } = useUpload(currentMandant, setAllDocs, showNotification);

  /*
   * Mandanten laden. Ein Mandant ist im Backend ein Benutzer der Gruppe
   * "client". Welche sichtbar sind, hängt von der Rolle ab:
   *   client:      nur man selbst
   *   tax_advisor: die zugewiesenen (Tabelle advisor_clients)
   *   admin:       alle
   */
  const ladeMandanten = useCallback(async () => {
    // Auf Wunsch beim zuletzt gewählten Mandanten weitermachen, sonst beim
    // ersten der Liste. So wechselt ein Neuladen nicht ungefragt den Mandanten.
    const starteBeiMandant = (liste) => {
      const gemerkt = einstellungen.mandantMerken ? ladeLetztenMandanten() : null;
      setCurrentMandant(liste.find((m) => m.id === gemerkt) ?? liste[0] ?? null);
    };

    try {
      const { data } = await apiFetch("/users");
      const alleClients = (data || [])
          .filter((u) => u.groups?.includes("client") || u.groups?.includes("user"))
          .map(userToMandant);

      // Ein Mandant sieht nur sich selbst. Fehlt er in /users, wird der
      // Datensatz aus dem angemeldeten Benutzer gebildet.
      if (istMandant) {
        const eigener = alleClients.filter((m) => m.id === user.id);
        const liste = eigener.length ? eigener : [userToMandant(user, 0)];
        setMandanten(liste);
        starteBeiMandant(liste);
        setAllDocs({});
        return;
      }

      if (!alleClients.length) { setMandanten([]); setCurrentMandant(null); return; }

      // Eine Steuerberaterin sieht nur ihre aktiv zugewiesenen Mandanten. Ist
      // ihr keiner zugewiesen, sieht sie keinen.
      //
      // Lässt sich die Zuordnung nicht abrufen, ist unklar, wer zu wem gehört.
      // Dann bleiben alle sichtbar und das Dashboard weist darauf hin. Das ist
      // besser, als jemanden versehentlich auszusperren.
      let liste = alleClients;
      if (user?.groups?.includes("tax_advisor")) {
        try {
          const { data: links } = await apiFetch("/advisor-clients");
          const zugewiesen = new Set(
              (links || [])
                  .filter((l) => l.status === "active" && l.advisor_user_id === user.id)
                  .map((l) => l.client_user_id)
          );
          liste = alleClients.filter((m) => zugewiesen.has(m.id));
          setZuordnungUnbekannt(false);
        } catch {
          console.warn("Zuordnungen nicht abrufbar, es werden alle Mandanten angezeigt.");
          setZuordnungUnbekannt(true);
        }
      }

      setMandanten(liste);
      starteBeiMandant(liste);
      setAllDocs({});
      setBackendFehler(false);

      // In Google Drive den Ordner _Unzugeordnet und je Mandant einen Ordner
      // anlegen. Ohne freigegebenen Drive-Ordner passiert hier nichts.
      lokalFetch("/api/drive/ordner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandanten: liste.map((m) => ({ nr: m.nr, name: m.name })) }),
      }).catch(() => { /* Drive ist optional */ });
    } catch {
      setBackendFehler(true);
    } finally {
      setLaedtMandanten(false);
    }
  }, [istMandant, user, einstellungen.mandantMerken]);

  // Alle sichtbaren Belege auf einmal laden und nach Mandant gruppieren. Die
  // Startseite der Kanzlei braucht die Zahlen aller Mandanten.
  const loadBackendDocs = useCallback(async () => {
    try {
      const { data } = await apiFetch("/documents");
      const gruppiert = {};
      (data || []).forEach((d) => {
        const mandantId = d.client_user_id ?? d.user_id;
        const doc = documentToDoc(d);
        (gruppiert[mandantId] ||= []).push(
            kiInArbeit.current.has(doc.id) ? { ...doc, status: "in_bearbeitung", kiLaeuft: true } : doc
        );
      });
      setAllDocs((prev) => {
        const next = { ...prev };
        // Dateien, die nur auf dem Scan-Server liegen, bleiben erhalten.
        for (const id of new Set([...Object.keys(prev), ...Object.keys(gruppiert)])) {
          // Zugeordnete Scans liegen zusätzlich als Archivkopie im
          // Mandantenordner. Bei gleichem Namen gewinnt der Beleg aus der
          // Datenbank. Verglichen wird ohne Endung, weil aus "Beleg.png" im
          // Backend "Beleg.pdf" wird.
          const namen = new Set((gruppiert[id] || []).map((d) => ohneEndung(d.name)));
          const andere = (prev[id] || []).filter((d) => !d.backendDoc && !namen.has(ohneEndung(d.name)));
          next[id] = [...(gruppiert[id] || []), ...andere];
        }
        return next;
      });
    } catch { /* Backend nicht erreichbar */ }
  }, []);

  // Dateien aus dem Mandantenordner des Scan-Servers laden
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
        const names = new Set(existing.map((d) => ohneEndung(d.name)));
        const newDocs = serverDocs.filter((d) => !names.has(ohneEndung(d.name)));
        if (!newDocs.length) return prev;
        return { ...prev, [mandant.id]: [...newDocs, ...existing] };
      });
    } catch { /* Scan-Server nicht erreichbar */ }
  }, []);

  // Erst die Mandanten, danach die Belege. Andersherum würde das Laden der
  // Mandanten die schon geladenen Belege wieder leeren.
  useEffect(() => {
    (async () => {
      await ladeMandanten();
      loadBackendDocs();
    })();
  }, [ladeMandanten, loadBackendDocs]);

  useEffect(() => {
    if (!currentMandant) return;
    loadBackendDocs();
    loadServerDocs(currentMandant);
  }, [currentMandant, loadBackendDocs, loadServerDocs]);

  /*
   * Scanner-Eingang abfragen. Er hat zwei Quellen: den Scan-Ordner auf dem
   * Rechner und den freigegebenen Ordner in Google Drive.
   *
   * Ein Mandant sieht nur seine eigenen Scans, der Server filtert danach. Der
   * Drive-Ordner gehört zum Scanner der Kanzlei und bleibt für ihn außen vor.
   */
  const fetchInbox = useCallback(async () => {
    // null heißt "Abruf gescheitert", eine leere Liste heißt "nichts Neues".
    // Die Unterscheidung wird im Eingang angezeigt.
    const holeListe = async (pfad) => {
      try {
        const res = await lokalFetch(pfad);
        if (!res.ok) return null;
        const { files } = await res.json();
        return files || [];
      } catch { return null; }
    };

    const nurEigene = istMandant ? `?mandantNr=${encodeURIComponent(currentMandant?.nr ?? "")}` : "";
    const [lokal, drive] = await Promise.all([
      holeListe(`/api/scan/inbox${nurEigene}`),
      istMandant ? [] : holeListe("/api/drive/inbox"),
    ]);
    setScanInbox([
      ...(lokal ?? []).map((f) => ({ ...f, quelle: "lokal" })),
      ...(drive ?? []),
    ]);
    setInboxStand({ zeit: new Date(), lokalFehler: lokal === null, driveFehler: drive === null });
  }, [istMandant, currentMandant?.nr]);

  // Eingang und Belegliste in regelmäßigen Abständen neu laden
  useEffect(() => {
    fetchInbox();
    if (!einstellungen.autoAktualisieren) return;
    const timer = setInterval(() => {
      fetchInbox();
      if (!currentMandant) return;
      loadServerDocs(currentMandant);
      loadBackendDocs();
    }, Math.max(5, einstellungen.intervallSekunden) * 1000);
    return () => clearInterval(timer);
  }, [currentMandant, fetchInbox, loadBackendDocs, loadServerDocs, einstellungen.autoAktualisieren, einstellungen.intervallSekunden]);

  /**
   * Handy-Scan in den Scanner-Eingang legen. Dort bekommt er wie jeder andere
   * Scan einen Namen und einen Mandanten. Erst beim Speichern geht er über
   * assignScan ins Backend.
   */
  const scanInEingang = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Der gewählte Mandant geht als Vorschlag mit und ist im Eingang
      // dadurch schon vorausgewählt
      const res = await lokalFetch(
          `/api/scan/upload?mandantNr=${encodeURIComponent(currentMandant.nr)}&mandantName=${encodeURIComponent(currentMandant.name)}`,
          { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error();
      await fetchInbox();
      // Der Eingang steht auf der Belegseite
      navigiere("belege");
      showNotification("Der Scan liegt im Scanner-Eingang. Bitte benennen und zuordnen.");
    } catch {
      showNotification("Scan-Server nicht erreichbar, der Scan wurde nicht gespeichert.", "error");
    }
  };

  /**
   * Scan aus dem Eingang entfernen. Er wird nicht gelöscht, sondern in den
   * Ordner _Verworfen verschoben, lokal wie in Google Drive. Von dort lässt
   * er sich bei Bedarf von Hand zurückholen.
   */
  const verwerfeScan = async (datei) => {
    const ausDrive = datei.quelle === "drive";
    try {
      const res = await lokalFetch(ausDrive ? "/api/drive/verwerfen" : "/api/scan/verwerfen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ausDrive ? { fileId: datei.id } : { fileName: datei.name }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      setScanInbox((prev) => prev.filter((f) => (ausDrive ? f.id !== datei.id : f.name !== datei.name)));
      showNotification(`${datei.name} wurde in den Ordner „_Verworfen" verschoben.`, "info");
    } catch (e) {
      showNotification(`Entfernen fehlgeschlagen: ${e.message}`, "error");
    }
  };

  /**
   * Scan benennen, einem Mandanten zuordnen und als Beleg ins Backend
   * übernehmen. Das Original kommt zusätzlich als Archivkopie in den
   * Mandantenordner.
   */
  const assignScan = async (datei, mandantNr, newName = null) => {
    const mandant = mandanten.find((m) => m.nr === mandantNr);
    if (!mandant) { showNotification("Unbekannter Mandant.", "error"); return; }

    const { name: fileName, quelle } = datei;
    const ausDrive = quelle === "drive";
    const endung   = fileName.slice(fileName.lastIndexOf("."));
    const zielName = newName ? `${newName}${endung}` : fileName;
    const istPdf   = /\.pdf$/i.test(fileName);

    // Je nach Quelle wird die Datei anders gelesen und einsortiert
    const lesePfad = ausDrive
        ? `/api/drive/file?id=${encodeURIComponent(datei.id)}`
        : `/api/scan/file?name=${encodeURIComponent(fileName)}`;

    try {
      // 1. Zuerst den Beleg in der Datenbank anlegen. Geht dabei etwas schief,
      //    ist noch nichts verschoben. Das Backend nimmt nur PDF an, ein Bild
      //    wird deshalb vorher in ein PDF verpackt.
      const inhalt = await lokalFetch(lesePfad);
      if (!inhalt.ok) throw new Error("Scan konnte nicht gelesen werden.");
      const original = await inhalt.blob();
      const pdf = istPdf ? original : await bildZuPdfDatei(original, alsPdfName(zielName));
      const { data: angelegt } = await apiFetch("/documents", {
        method: "POST",
        body: neuerBelegPayload({
          mandant,
          dateiName: istPdf ? zielName : alsPdfName(zielName),
          dataUrl: await dateiZuDataUrl(pdf),
        }),
      });

      // Belege aus Google Drive erkennt die simulierte KI (siehe lib/kiAnalyse.js)
      if (ausDrive && angelegt?.id) merkeKiBeleg(`api_${angelegt.id}`);

      // 2. Das Original einsortieren, in Drive oder im lokalen Ordner
      const res = ausDrive
          ? await lokalFetch("/api/drive/assign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileId: datei.id, mandantNr, mandantName: mandant.name, newName: zielName }),
            })
          : await lokalFetch("/api/scan/assign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileName, mandantNr, mandantName: mandant.name, newName }),
            });
      if (!res.ok) throw new Error(ausDrive
          ? "Verschieben in Google Drive fehlgeschlagen."
          : "Einsortieren auf dem Scan-Server fehlgeschlagen.");

      setScanInbox((prev) => prev.filter((f) => (ausDrive ? f.id !== datei.id : f.name !== fileName)));
      loadBackendDocs(mandant);
      loadServerDocs(mandant);
      showNotification(`Beleg zugeordnet: ${mandant.name}`);
    } catch (e) {
      showNotification(`Zuordnung fehlgeschlagen: ${e.message}`, "error");
    }
  };

  /**
   * Belegnamen ändern. Wohin die Änderung geht, hängt davon ab, wo der Beleg
   * liegt: in der Datenbank oder als Datei im Mandantenordner des
   * Scan-Servers. Die Dateiendung bleibt erhalten.
   */
  const renameDoc = async (doc, neuerBasisName) => {
    const endung = doc.name.includes(".") ? doc.name.slice(doc.name.lastIndexOf(".")) : "";
    const ziel   = neuerBasisName.trim().replace(/[\\/:*?"<>|]/g, "") + endung;
    if (ziel === endung || ziel === doc.name) return;

    try {
      if (doc.backendDoc) {
        await apiFetch(`/documents/${doc.apiId}`, {
          method: "PATCH",
          body: { original_file_name: ziel },
        });
      } else if (doc.serverFile) {
        const res = await lokalFetch("/api/belege/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mandantNr: currentMandant.nr, mandantName: currentMandant.name,
            fileName: doc.name, newName: ziel,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Scan-Server nicht erreichbar");
      }
      setAllDocs((prev) => ({
        ...prev,
        [currentMandant.id]: (prev[currentMandant.id] || []).map((d) => d.id === doc.id ? { ...d, name: ziel } : d),
      }));
      showNotification(`Umbenannt in ${ziel}`);
    } catch (e) {
      showNotification(`Umbenennen fehlgeschlagen: ${e.message}`, "error");
    }
  };

  const selectMandant = (m) => {
    setCurrentMandant(m);
    setFilter({ ...LEERER_FILTER });
    merkeMandanten(m.id);
    showNotification(`Mandant gewechselt: ${m.name}`);
  };

  // Klick auf einen Mandanten auf der Startseite der Kanzlei: wechseln und
  // gleich seine Belege öffnen
  const oeffneMandantenbelege = (m) => {
    selectMandant(m);
    navigiere("belege");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    uploadToLocal(e.dataTransfer.files);
  };

  const aendereBeleg = (mandantId, docId, aenderung) =>
      setAllDocs((prev) => ({
        ...prev,
        [mandantId]: (prev[mandantId] || []).map((d) => (d.id === docId ? { ...d, ...aenderung } : d)),
      }));

  /**
   * KI-Analyse, simuliert (siehe lib/kiAnalyse.js).
   *
   * Analysiert wird der zuletzt hochgeladene offene Beleg des Mandanten, also
   * der mit der höchsten Backend-ID, weil das Datum keine Uhrzeit kennt.
   * Erkannt wird er nur, wenn er über Google Drive hereinkam. Dann bekommt er
   * alle Daten eingetragen und steht auf "zu prüfen". Bestätigt wird er
   * anschließend im Beleg-Dialog.
   */
  const runKiAnalysis = async () => {
    const mandant = currentMandant;
    const pending = docs.filter((d) => d.status === "ausstehend");
    if (!pending.length) { showNotification("Keine ausstehenden Belege.", "error"); return; }
    const doc = pending.reduce((a, b) => ((b.apiId ?? -1) > (a.apiId ?? -1) ? b : a));

    setKiLaeuft(true);
    kiInArbeit.current.add(doc.id);
    aendereBeleg(mandant.id, doc.id, { status: "in_bearbeitung", kiLaeuft: true });

    try {
      const ergebnis = await analysiereBeleg(ladeKiBelege().includes(doc.id));

      // Ein nicht erkannter Beleg bleibt unverändert
      if (!ergebnis.erkannt) {
        aendereBeleg(mandant.id, doc.id, { status: "ausstehend", kiLaeuft: false });
        showNotification(`${doc.name}: ${KI_GRUND[ergebnis.grund] ?? "nicht erkannt"}`, "info");
        return;
      }

      const { extractedData, kategorien, confidence } = ergebnis;
      if (doc.backendDoc) {
        await apiFetch(`/documents/${doc.apiId}`, {
          method: "PATCH",
          body: updatePayload(extractedData, kategorien, { status: "in_bearbeitung", confidence }),
        });
      }
      aendereBeleg(mandant.id, doc.id, {
        status: "in_bearbeitung", kiLaeuft: false, extractedData, kategorien, confidence,
        amount: extractedData.angerechnetBetrag ?? extractedData.gesamtBetrag,
      });
      showNotification(`KI-Analyse abgeschlossen. Bitte ${doc.name} prüfen.`);
    } catch (e) {
      aendereBeleg(mandant.id, doc.id, { status: "ausstehend", kiLaeuft: false });
      showNotification(`KI-Analyse fehlgeschlagen: ${e.message}`, "error");
    } finally {
      kiInArbeit.current.delete(doc.id);
      setKiLaeuft(false);
    }
  };

  const handleConfirm = async (docId, editedData, kategorien = []) => {
    const doc = (allDocs[currentMandant.id] || []).find((d) => d.id === docId);

    // "Analysiert" heißt geprüft und setzt voraus, dass die KI schon Daten
    // geliefert hat. Bei einem Beleg, über den sie noch nicht gelaufen ist,
    // werden die Eingaben gespeichert, er bleibt aber ausstehend.
    const nochNichtAnalysiert = doc?.status === "ausstehend";
    const neuerStatus = nochNichtAnalysiert ? "ausstehend" : "analysiert";

    if (doc?.backendDoc) {
      try {
        await apiFetch(`/documents/${doc.apiId}`, {
          method: "PATCH",
          // Die Konfidenz der KI bleibt beim Bestätigen erhalten
          body: updatePayload(editedData, kategorien, { status: neuerStatus, confidence: doc.confidence }),
        });
      } catch (e) {
        showNotification(`Speichern im Backend fehlgeschlagen: ${e.message}`, "error");
        return;
      }
    }

    setAllDocs(prev => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).map(d => d.id === docId ? { ...d, status: neuerStatus, extractedData: editedData, kategorien: bereinigeKategorien(kategorien), amount: editedData.angerechnetBetrag ?? editedData.gesamtBetrag } : d) }));
    schliesseDialog();
    showNotification(nochNichtAnalysiert
        ? "Beleg gespeichert. Er bleibt ausstehend, bis die KI ihn analysiert hat."
        : "Beleg bestätigt und gespeichert", nochNichtAnalysiert ? "info" : "success");
  };

  /**
   * Zeitraum für den Export.
   *
   * Das Backend verlangt ein Von und ein Bis. Ist im Filter ein Zeitraum
   * gesetzt, gilt dieser. Sonst wird er aus den angezeigten Belegen
   * abgeleitet, damit das Archiv mindestens die Belege der Liste enthält.
   */
  const exportZeitraum = () => {
    const tage = filteredDocs.map((d) => datumFuer(d, filter.bezug)).filter(Boolean).sort((a, b) => a - b);
    if (!tage.length) return null;
    return {
      von: filter.von || iso(tage[0]),
      bis: filter.bis || iso(tage[tage.length - 1]),
    };
  };

  /**
   * Belege des Mandanten als ZIP herunterladen.
   *
   * Der Endpunkt filtert nur nach Mandant und Belegdatum. Suchbegriff, Status
   * und Klassifikation wirken nicht, das Archiv kann also mehr enthalten als
   * die Liste. Die Meldung nennt deshalb den Zeitraum.
   */
  const exportiereBelege = async () => {
    if (!currentMandant) return;
    const zeitraum = exportZeitraum();
    if (!zeitraum) { showNotification("Keine Belege zum Exportieren.", "error"); return; }

    const spanne = `${deutschesDatum(zeitraum.von)} bis ${deutschesDatum(zeitraum.bis)}`;
    setExportLaeuft(true);
    showNotification(`Export wird vorbereitet (${spanne})…`, "info");

    try {
      const { blob, dateiName } = await exportiereBelegeAlsZip({ mandantId: currentMandant.id, ...zeitraum });
      speichereBlob(blob, dateiName);
      showNotification(`Belege vom ${spanne} als ZIP gespeichert`);
    } catch (e) {
      showNotification(EXPORT_FEHLER[e.status]?.(spanne) ?? `Export fehlgeschlagen: ${fehlerText(e)}`, "error");
    }
    setExportLaeuft(false);
  };

  const handleDiscard = async (doc) => {
    // Im Backend wird der Beleg nur als gelöscht markiert
    if (doc.backendDoc) {
      try {
        await apiFetch(`/documents/${doc.apiId}`, { method: "DELETE" });
      } catch (e) {
        showNotification(`Löschen im Backend fehlgeschlagen: ${e.message}`, "error");
        return;
      }
    }
    // Dateien auf dem Scan-Server auch dort löschen, sonst tauchen sie beim
    // nächsten Neuladen wieder auf
    if (doc.serverFile) {
      try {
        const res = await lokalFetch(`/api/belege/file?mandantNr=${encodeURIComponent(currentMandant.nr)}&mandantName=${encodeURIComponent(currentMandant.name)}&name=${encodeURIComponent(doc.name)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
      } catch {
        showNotification("Löschen auf dem Server fehlgeschlagen.", "error");
        return;
      }
    }
    setAllDocs(prev => ({ ...prev, [currentMandant.id]: (prev[currentMandant.id] || []).filter(d => d.id !== doc.id) }));
    schliesseDialog();
    showNotification("Beleg gelöscht", "error");
  };

  const docs = (currentMandant && allDocs[currentMandant.id]) || [];
  const filteredDocs = filterBelege(docs, filter);
  const stats = {
    total:      docs.length,
    analysiert: docs.filter((d) => d.status === "analysiert").length,
    ausstehend: docs.filter((d) => d.status === "ausstehend").length,
  };

  // Der Scanner-Eingang lässt sich in den Einstellungen ausblenden. Dann geht
  // ein Handy-Scan direkt hoch, sonst wartet er dort auf Name und Zuordnung.
  const zeigeScannerEingang = einstellungen.scannerEingangAnzeigen;

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
        /* Mobile Browser zählen die Adressleiste zu 100vh dazu, der untere
           Rand der Seitenleiste läge dann außerhalb des Bildschirms. dvh ist
           die tatsächlich sichtbare Höhe, 100vh bleibt als Rückfall. */
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
          /* Am Telefon stehen die Kennzahlen untereinander, nebeneinander
             wäre es zu eng */
          .stats-grid    { grid-template-columns: 1fr !important; }
        }
      `}</style>

        {/* Modals */}
        {mandantAnlegenOffen && (
            <MandantAnlegenModal
                istBerater={user?.groups?.includes("tax_advisor")}
                beraterId={user?.id}
                isMobile={isMobile}
                showNotification={showNotification}
                onAngelegt={ladeMandanten}
                onClose={() => setMandantAnlegenOffen(false)} />
        )}
        {cameraOpen && <DocumentScanModal onClose={schliesseDialog}
                                          onCapture={(file) => zeigeScannerEingang ? scanInEingang(file) : uploadToLocal([file])} />}
        {selectedDoc && <DocDetailModal key={selectedDoc.id} doc={selectedDoc} mandant={currentMandant} isMobile={isMobile}
                                        startImBearbeiten={bearbeitenDirekt}
                                        onClose={schliesseDialog}
                                        onRename={renameDoc}
                                        showNotification={showNotification}
                                        onConfirm={(ed, kats) => handleConfirm(selectedDoc.id, ed, kats)}
                                        onDiscard={() => handleDiscard(selectedDoc)} />}

        {/* Sidebar overlay */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Mobile Topbar */}
        <MobileTopbar onMenuClick={() => setSidebarOpen((v) => !v)} onCameraClick={oeffneKamera} onLogoClick={() => navigiere("dashboard")} />

        {/* Sidebar */}
        <Sidebar currentMandant={currentMandant} mandanten={mandanten} sidebarOpen={sidebarOpen} onSelectMandant={selectMandant} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} activePage={seite} onNavigate={navigiere} zeigeMandantenwechsel={!istMandant}
                 onMandantAnlegen={istMandant ? undefined : () => { setSidebarOpen(false); setMandantAnlegenOffen(true); }}
                 laedt={laedtMandanten} />

        {/* Main */}
        <main className="main-content" style={{ marginLeft: 240, flex: 1, minWidth: 0, padding: isMobile ? "90px 16px 84px" : "30px 32px", animation: "fadeUp .4s ease", display: "flex", justifyContent: "center", background: "#f8f7f4" }}>
          {seite === "einstellungen" ? (
              <SettingsPage user={user} einstellungen={einstellungen} setEinstellungen={setEinstellungen}
                            showNotification={showNotification} isMobile={isMobile} />
          ) : laedtMandanten ? (
              <div style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 10, color: "#9ca3af", fontSize: 13, animation: "pulse 1.2s infinite" }}>
                <i className="bi bi-hourglass-split" style={{ fontSize: 16 }} />
                Mandanten werden geladen…
              </div>
          ) : backendFehler ? (
              <div style={{ width: "100%", maxWidth: 560, alignSelf: "center", background: "#fff", border: "1px solid #fecaca", borderRadius: 12, padding: "36px 28px", textAlign: "center" }}>
                <i className="bi bi-cloud-slash" style={{ fontSize: 30, color: "#dc2626", display: "block", marginBottom: 12 }} />
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0b2e44", marginBottom: 8 }}>Backend nicht erreichbar</h2>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                  Die Mandanten konnten nicht geladen werden. Bitte die Verbindung prüfen und es erneut versuchen.
                </p>
                <button onClick={() => { setLaedtMandanten(true); ladeMandanten().then(() => loadBackendDocs()); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 16, padding: "9px 18px", background: "#18537a", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="bi bi-arrow-clockwise" /> Erneut versuchen
                </button>
              </div>
          ) : !currentMandant ? (
              /* Ohne Mandant gibt es weder Belege noch ein Ziel für Uploads */
              <div style={{ width: "100%", maxWidth: 560, alignSelf: "center", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: "36px 28px", textAlign: "center" }}>
                <i className="bi bi-people" style={{ fontSize: 30, color: "#9ca3af", display: "block", marginBottom: 12 }} />
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0b2e44", marginBottom: 8 }}>Keine Mandanten zugewiesen</h2>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                  Ihnen ist derzeit kein Mandant zugeordnet, deshalb gibt es hier nichts anzuzeigen.
                  Legen Sie einen an oder lassen Sie sich von einem Administrator einen zuordnen.
                </p>
                <button onClick={() => setMandantAnlegenOffen(true)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 16, padding: "9px 18px", background: "#18537a", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="bi bi-person-plus" /> Mandant anlegen
                </button>
              </div>
          ) : (
          <div style={{ width: "100%", maxWidth: 900 }}>

            {/* Dateiauswahl für den Upload */}
            <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => uploadToLocal(e.target.files)} />

            {seite === "dashboard" ? (
              istMandant ? (
                <DashboardMandant
                    user={user}
                    mandant={currentMandant}
                    docs={docs}
                    isMobile={isMobile}
                    onOpenDoc={(doc) => oeffneBeleg(doc)}
                    onZurBelegliste={() => navigiere("belege")}
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
                    onScannerEingang={() => navigiere("belege")}
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

            {/* Scanner-Eingang: neue Scans benennen und zuordnen */}
            {zeigeScannerEingang && (
                <ScannerInbox files={scanInbox} mandanten={mandanten} onAssign={assignScan}
                              onVerwerfen={verwerfeScan}
                              stand={inboxStand} onAktualisieren={fetchInbox} />
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
                <p style={{ color: "#f0f8ff", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{kiLaeuft ? "KI-Analyse läuft…" : "KI-Analyse bereit"}</p>
                <p style={{ color: "#7ab8d0", fontSize: 11 }}>
                  {kiLaeuft ? "Beleg wird gelesen und Daten extrahiert"
                            : `${stats.ausstehend} Beleg${stats.ausstehend !== 1 ? "e" : ""} warten auf Klassifizierung`}
                </p>
              </div>
              <button onClick={runKiAnalysis} disabled={kiLaeuft}
                      style={{ padding: "8px 16px", background: "linear-gradient(135deg,#fd8f19,#ffb054)", border: "none", borderRadius: 7, color: "#0b2e44", fontSize: 12, fontWeight: 700, cursor: kiLaeuft ? "default" : "pointer", opacity: kiLaeuft ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {kiLaeuft ? "Analysiere…" : "Jetzt analysieren"}
              </button>
            </div>

            {/* Doc Table */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" }}>
              <BelegSuche filter={filter} onChange={setFilter} kategorien={vorhandeneKategorien(docs)} onExport={exportiereBelege}
                          exportLaeuft={exportLaeuft}
                          anzahl={filteredDocs.length} gesamt={docs.length} isMobile={isMobile} />
              {/* Spaltenköpfe nur am Schreibtisch. Am Handy stehen die Angaben
                  je Beleg untereinander. */}
              {!isMobile && (
                  <div style={{ display: "grid", gridTemplateColumns: SPALTEN, padding: "8px 20px", background: "#fafaf8", borderBottom: "1px solid #f0ece4" }}>
                    {["DATEI", "DATUM", "KATEGORIE", "BETRAG", "STATUS", "KI"].map((h) => (
                        <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em" }}>{h}</span>
                    ))}
                  </div>
              )}
              <BelegListe
                  docs={filteredDocs}
                  isMobile={isMobile}
                  query={filter.query}
                  datumBezug={filter.bezug}
                  onOpen={(doc) => oeffneBeleg(doc)}
                  onEdit={(doc) => oeffneBeleg(doc, true)}
                  leerAnzeige={
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
                  }
              />
            </div>
            </>)}
          </div>
          )}
        </main>

        {/* Bottom Nav */}
        <BottomNav activePage={seite} onNavigate={navigiere} />

        {/* Toast */}
        {notification && (
            <div style={{ position: "fixed", bottom: 24, right: 24, ...(TOAST_STIL[notification.type] ?? TOAST_STIL.success).stil, padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.08)", animation: "slideIn .3s ease", zIndex: 1000, display: "flex", alignItems: "center", gap: 7 }}>
              <i className={`bi ${(TOAST_STIL[notification.type] ?? TOAST_STIL.success).icon}`} /> {notification.msg}
            </div>
        )}
      </div>
  );
}