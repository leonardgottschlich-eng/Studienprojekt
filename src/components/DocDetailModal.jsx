import { useState, useEffect } from 'react';
import FileIcon from './FileIcon';
import StatusBadge from './StatusBadge';
import { KATEGORIEN, kategorienVon, bereinigeKategorien } from '../data/kategorien';
import { ladeBelegDatei, ladeBelegHerunter } from '../lib/belegDatei';
import { oeffnePdf } from '../lib/pdfjs';

/* Leeres Datengerüst für Belege, die die KI noch nicht ausgelesen hat.
   Die Ansicht bleibt dieselbe, nur ohne eingetragene Werte. */
const LEERE_DATEN = {
  aussteller: "", adresse: "", ustIdNr: "", datum: "", rechnungsnr: "",
  zahlungsart: "", positionen: [],
  nettoBetrag: "", mwstSatz: "", mwstBetrag: "", gesamtBetrag: "",
};

const NEUE_POSITION = {
  bezeichnung: "", menge: "", einzelpreis: "",
  netto: "", mwstSatz: 19, mwstBetrag: "", betrag: "", angerechnet: true,
};

function ConfidenceRing({ value }) {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value >= 85 ? "#16a34a" : value >= 65 ? "#d97706" : "#dc2626";
  const bg = value >= 85 ? "#dcfce7" : value >= 65 ? "#fef3c7" : "#fee2e2";
  const label = value >= 85 ? "Hoch" : value >= 65 ? "Mittel" : "Niedrig";
  return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ position: "relative", width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={r} fill="none" stroke="#f0ece4" strokeWidth="8" />
            <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 44 44)" style={{ transition: "stroke-dasharray .6s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}%</span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "3px 10px", borderRadius: 12 }}>
        KI-Konfidenz: {label}
      </span>
        <p style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", maxWidth: 160, lineHeight: 1.4 }}>
          Plausibilitätsscore der extrahierten Belegdaten
        </p>
      </div>
  );
}

/**
 * Zeichnet die Seiten eines PDFs als Bilder.
 *
 * Eingebaute PDF-Betrachter wählen Zoomstufe und Ausrichtung selbst, je nach
 * Browser steht der Beleg dann angeschnitten oder am Rand. Als Bild lässt sich
 * die Seite genau auf die Breite legen und zentrieren, auf jedem Gerät gleich.
 */
const MAX_SEITEN = 5;

async function pdfZuBildern(blob) {
  const ladevorgang = await oeffnePdf(blob);
  const datei = await ladevorgang.promise;
  const bilder = [];
  try {
    for (let nr = 1; nr <= Math.min(datei.numPages, MAX_SEITEN); nr++) {
      const seite = await datei.getPage(nr);
      // Doppelte Auflösung, damit die Schrift auf dem Beleg lesbar bleibt
      const ansicht = seite.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(ansicht.width);
      canvas.height = Math.round(ansicht.height);
      await seite.render({ canvas, viewport: ansicht }).promise;
      bilder.push(canvas.toDataURL("image/jpeg", 0.9));
    }
  } finally {
    // Ein Fehler beim Aufräumen darf fertige Seiten nicht verwerfen
    try { await ladevorgang.destroy(); } catch { /* nicht weiter schlimm */ }
  }
  return bilder;
}

/* Vorschau der hinterlegten Datei, aus dem Backend oder vom lokalen Server */
function ServerFilePreview({ doc, mandant, isMobile }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [seiten, setSeiten]   = useState(null);   // gezeichnete PDF-Seiten
  const [error, setError]     = useState(false);
  // Grund, falls das Zeichnen scheitert. Er steht unter der Ersatzansicht,
  // damit man nicht raten muss, woran es liegt.
  const [zeichenFehler, setZeichenFehler] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let abgebrochen = false;

    const load = async () => {
      try {
        // Nur die Felder, von denen die Datei abhängt. Das Beleg-Objekt selbst
        // wird beim regelmäßigen Neuladen ersetzt und soll keinen Neuaufbau auslösen.
        const blob = await ladeBelegDatei(
            { backendDoc: doc.backendDoc, apiId: doc.apiId, name: doc.name },
            { nr: mandant.nr, name: mandant.name },
        );
        objectUrl = URL.createObjectURL(blob);
        if (abgebrochen) return;
        setFileUrl(objectUrl);

        if (doc.type === "pdf") {
          try {
            const bilder = await pdfZuBildern(blob);
            if (abgebrochen) return;
            if (bilder.length) setSeiten(bilder);
            else setZeichenFehler("keine Seiten gefunden");
          } catch (e) {
            // Klappt das Zeichnen nicht, bleibt die eingebettete Ansicht
            console.warn("PDF konnte nicht gezeichnet werden:", e);
            if (!abgebrochen) setZeichenFehler(e?.message || String(e));
          }
        }
      } catch {
        if (!abgebrochen) setError(true);
      }
    };

    load();
    return () => {
      abgebrochen = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.name, doc.apiId, doc.backendDoc, doc.type, mandant.nr, mandant.name]);

  if (error) {
    return (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          <i className="bi bi-file-earmark-x" style={{ fontSize: 34, display: "block", marginBottom: 8 }} />
          Datei konnte nicht geladen werden.
        </div>
    );
  }
  if (!fileUrl) {
    return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13, animation: "pulse 1.2s infinite" }}>Lade Dokument…</div>;
  }

  const bildStil = {
    display: "block", width: "100%", maxWidth: 620, margin: "0 auto",
    borderRadius: 4, background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.08)",
  };

  if (doc.type === "pdf") {
    // Gezeichnete Seiten in voller Breite und mittig
    if (seiten) {
      return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {seiten.map((bild, i) => (
                <img key={i} src={bild} alt={`${doc.name}, Seite ${i + 1}`} style={bildStil} />
            ))}
          </div>
      );
    }

    // Noch am Zeichnen
    if (!zeichenFehler) {
      return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13, animation: "pulse 1.2s infinite" }}>Beleg wird aufbereitet…</div>;
    }

    // Ersatzweise die Direktanzeige des Browsers. Sie richtet die Seite nach
    // eigenen Regeln aus, deshalb steht darunter, woran das Zeichnen scheiterte.
    return (
        <>
          <iframe src={`${fileUrl}#view=FitH&pagemode=none`} title={doc.name}
                  style={{ display: "block", width: "100%", height: isMobile ? "65vh" : "100%", minHeight: isMobile ? 380 : 500, border: "none", borderRadius: 4, background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.08)" }} />
          <p style={{ fontSize: 10.5, color: "#b45309", marginTop: 8, lineHeight: 1.45 }}>
            Direktanzeige des Browsers, weil sich die Seite nicht zeichnen ließ ({zeichenFehler}).
          </p>
        </>
    );
  }

  return <img src={fileUrl} alt={doc.name} style={bildStil} />;
}

/* Einzelnes Datenfeld, im Bearbeitungsmodus als Eingabefeld */
function FieldRow({ label, fieldKey, wide, editMode, edited, setEdited, ed }) {
  const fieldStyle = {
    width: "100%", padding: "7px 10px", border: "1px solid #e5e7eb",
    borderRadius: 7, fontSize: 12.5, color: "#111827", background: "#f9fafb", outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 3, display: "block" };
  return (
      <div style={{ gridColumn: wide ? "1 / -1" : undefined }}>
        <span style={labelStyle}>{label.toUpperCase()}</span>
        {editMode ? (
            <input style={fieldStyle} value={edited[fieldKey] ?? ""} onChange={e => setEdited(p => ({ ...p, [fieldKey]: e.target.value }))} />
        ) : (
            <div style={{ fontSize: 12.5, color: "#111827", fontWeight: 500, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>{ed[fieldKey] || "-"}</div>
        )}
      </div>
  );
}

/* Wandelt "1.234,56 €" in 1234.56 um */
function parseBetrag(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function formatBetrag(n) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/**
 * Berechnet die steuerlich anrechenbaren Werte aus den angehakten Positionen.
 * Gruppiert nach Steuersatz, weil ein Beleg mehrere Sätze enthalten kann
 * (z. B. 7 % Übernachtung + 19 % Frühstück).
 */
function berechneAnrechnung(positionen, included) {
  const nachSatz = new Map();
  let netto = 0, vorsteuer = 0, brutto = 0, ausgenommenBrutto = 0;

  (positionen ?? []).forEach((p, i) => {
    const pNetto  = parseBetrag(p.netto);
    const pSteuer = parseBetrag(p.mwstBetrag);
    const pBrutto = parseBetrag(p.betrag);

    if (!included[i]) {
      ausgenommenBrutto += pBrutto;
      return;
    }
    netto     += pNetto;
    vorsteuer += pSteuer;
    brutto    += pBrutto;

    const satz = Number(p.mwstSatz) || 0;
    const eintrag = nachSatz.get(satz) ?? { satz, netto: 0, steuer: 0 };
    eintrag.netto  += pNetto;
    eintrag.steuer += pSteuer;
    nachSatz.set(satz, eintrag);
  });

  return {
    netto, vorsteuer, brutto, ausgenommenBrutto,
    saetze: [...nachSatz.values()].sort((a, b) => b.satz - a.satz),
  };
}

// Trennt den Dateinamen von der Endung: "Tankbeleg.pdf" wird zu ["Tankbeleg", ".pdf"]
const teileName = (name) => {
  const i = name.lastIndexOf(".");
  return i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ""];
};

export default function DocDetailModal({ doc, mandant, isMobile, startImBearbeiten, onClose, onRename, onConfirm, onDiscard, showNotification }) {
  const [editMode, setEditMode] = useState(!!startImBearbeiten);
  const [laedtDownload, setLaedtDownload] = useState(false);

  // Nur Belege mit hinterlegter Datei lassen sich anzeigen und herunterladen
  const hatDatei = !!(doc.backendDoc || (doc.serverFile && mandant));

  // Über diesen Beleg ist die KI noch nicht gelaufen
  const nochNichtAnalysiert = doc.status === "ausstehend";

  const herunterladen = async () => {
    setLaedtDownload(true);
    try {
      await ladeBelegHerunter(doc, mandant);
    } catch (e) {
      showNotification?.(`Herunterladen fehlgeschlagen: ${e.message}`, "error");
    }
    setLaedtDownload(false);
  };
  // Dateiname ohne Endung, die Endung bleibt beim Umbenennen unverändert
  const [nameEntwurf, setNameEntwurf] = useState(() => teileName(doc.name)[0]);
  const [edited, setEdited] = useState({ ...LEERE_DATEN, ...doc.extractedData });
  const [included, setIncluded] = useState(
      () => (doc.extractedData?.positionen ?? []).map(p => p.angerechnet !== false)
  );
  // Ein Beleg kann mehrere Klassifikationen tragen (1:n)
  const [kategorien, setKategorien] = useState(() => kategorienVon(doc));
  const [neueKategorie, setNeueKategorie] = useState("");
  const ed = doc.extractedData ?? LEERE_DATEN;

  const kategorieHinzufuegen = (wert) => {
    const name = String(wert ?? neueKategorie).trim();
    if (!name) return;
    setKategorien((prev) => bereinigeKategorien([...prev, name]));
    setNeueKategorie("");
  };
  const kategorieEntfernen = (name) => setKategorien((prev) => prev.filter((k) => k !== name));
  const vorschlaege = KATEGORIEN.filter((k) => !kategorien.includes(k));

  const positionen = editMode ? edited.positionen : ed.positionen;
  const calc = berechneAnrechnung(positionen, included);
  const ausgeschlossen = included.filter(v => !v).length;

  const toggleIncluded = (i) => setIncluded(prev => prev.map((v, ii) => ii === i ? !v : v));

  const addPosition = () => {
    setEdited(prev => ({ ...prev, positionen: [...(prev.positionen ?? []), { ...NEUE_POSITION }] }));
    setIncluded(prev => [...prev, true]);
  };

  // Ergänzt fehlende Zahlen einer von Hand angelegten Position. Aus Netto und
  // Steuersatz folgen MwSt und Brutto, aus Brutto und Steuersatz folgt Netto.
  const ergaenzePosition = (p) => {
    const satz = Number(p.mwstSatz) || 0;
    let netto  = parseBetrag(p.netto);
    let brutto = parseBetrag(p.betrag);
    let mwst   = parseBetrag(p.mwstBetrag);
    if (!netto && brutto) netto = brutto / (1 + satz / 100);
    if (!mwst)            mwst  = netto * (satz / 100);
    if (!brutto)          brutto = netto + mwst;
    return {
      ...p,
      netto:      p.netto      || formatBetrag(netto),
      mwstBetrag: p.mwstBetrag || formatBetrag(mwst),
      betrag:     p.betrag     || formatBetrag(brutto),
    };
  };

  // Beim Speichern werden die Haken übernommen und alle Summen aus den
  // Positionen neu berechnet. gesamtBetrag ist der ganze Beleg,
  // angerechnetBetrag das Brutto der angehakten Positionen.
  const withFlags = (data) => {
    const pos = (data.positionen ?? []).map(ergaenzePosition);
    const alle = berechneAnrechnung(pos, pos.map(() => true));
    const anrechenbar = berechneAnrechnung(pos, included);
    return {
      ...data,
      positionen: pos.map((p, i) => ({ ...p, angerechnet: included[i] })),
      nettoBetrag: formatBetrag(alle.netto),
      mwstBetrag: formatBetrag(alle.vorsteuer),
      gesamtBetrag: formatBetrag(alle.brutto),
      angerechnetBetrag: formatBetrag(anrechenbar.brutto),
    };
  };

  // Erst wird ein geänderter Name gespeichert, dann die Belegdaten. So bleibt
  // der neue Name erhalten, wenn das Bestätigen die Liste aktualisiert.
  const speichereAlles = async () => {
    const neu = nameEntwurf.trim();
    if (neu && neu !== teileName(doc.name)[0]) {
      await onRename?.(doc, neu);
    }
    setEditMode(false);
    onConfirm(withFlags(edited), kategorien);
  };

  const fieldStyle = {
    width: "100%", padding: "7px 10px", border: "1px solid #e5e7eb",
    borderRadius: 7, fontSize: 12.5, color: "#111827", background: "#f9fafb", outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 3, display: "block" };


  return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "stretch" }}
           onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        {/* Abgedunkelter Hintergrund */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(11,46,68,.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />

        {/* Am Telefon bildschirmfüllend, sonst als Karte in der Mitte */}
        <div style={isMobile
            ? { position: "relative", margin: 0, width: "100vw", height: "100dvh", maxHeight: "100dvh", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }
            : { position: "relative", margin: "auto", width: "min(92vw, 1080px)", maxHeight: "92vh", background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", animation: "fadeUp .25s ease", overflow: "hidden" }}>

          {/* Kopfzeile. Der Dateiname wird gekürzt, damit das Kreuz zum Schließen
              bei jeder Namenslänge sichtbar bleibt. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: isMobile ? "12px 16px" : "16px 24px", borderBottom: "1px solid #f0ece4", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
              <FileIcon type={doc.type} />
              <div style={{ minWidth: 0, flex: 1 }}>
                {/* Im Bearbeitungsmodus ist auch der Belegname änderbar */}
                {editMode ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <input value={nameEntwurf} onChange={(e) => setNameEntwurf(e.target.value)}
                             placeholder="Belegname…"
                             style={{ flex: 1, minWidth: 0, padding: "5px 9px", border: "1px solid #fd8f19", borderRadius: 7, fontSize: 14, fontWeight: 700, color: "#0b2e44", background: "#fff", outline: "none", fontFamily: "inherit" }} />
                      <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>{teileName(doc.name)[1]}</span>
                    </div>
                ) : (
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0b2e44", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                )}
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>Hochgeladen am {doc.uploadedAt} · {doc.size}</span>
                  {/* Am Telefon unter den Namen, oben ist kein Platz mehr */}
                  {isMobile && <StatusBadge status={doc.status} />}
                </div>
              </div>
              {!isMobile && <StatusBadge status={doc.status} />}
            </div>
            {/* Herunterladen gibt es nur, wenn eine Datei hinterlegt ist */}
            {hatDatei && (
                <button onClick={herunterladen} disabled={laedtDownload}
                        title={`${doc.name} herunterladen`}
                        style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, flexShrink: 0, cursor: laedtDownload ? "default" : "pointer", fontSize: 15, color: laedtDownload ? "#d1d5db" : "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={laedtDownload ? "bi bi-hourglass" : "bi bi-download"} />
                </button>
            )}
            <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, flexShrink: 0, cursor: "pointer", fontSize: 16, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-x" />
            </button>
          </div>

          {/* Am Telefon steht erst der Beleg und darunter die Daten. Gescrollt
              wird dann der ganze Bereich statt jeder Spalte einzeln. */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flex: 1, overflowY: isMobile ? "auto" : "hidden", overflowX: "hidden", minHeight: 0 }}>

            {/* Originaldokument. Am Telefon mit breitem Rand ringsum, damit
                man daneben bequem scrollen kann. */}
            <div style={{ width: isMobile ? "100%" : "42%", flexShrink: 0, background: "#f5f3ef", borderRight: isMobile ? "none" : "1px solid #ede9e0", borderBottom: isMobile ? "1px solid #ede9e0" : "none", overflowY: isMobile ? "visible" : "auto", padding: isMobile ? "16px 34px 28px" : 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 12 }}>ORIGINALDOKUMENT</div>
              {hatDatei ? <ServerFilePreview doc={doc} mandant={mandant} isMobile={isMobile} /> : (
                  <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    <i className="bi bi-file-earmark" style={{ fontSize: 34, display: "block", marginBottom: 8 }} />
                    Zu diesem Beleg ist keine Datei hinterlegt.
                  </div>
              )}
            </div>

            {/* Belegdaten */}
            <div style={{ flex: 1, minWidth: 0, overflowY: isMobile ? "visible" : "auto", padding: isMobile ? 16 : "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Überschrift und KI-Konfidenz */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 6 }}>{doc.confidence != null ? "KI-EXTRAHIERTE DATEN" : "BELEGDATEN"}</div>
                  <p style={{ fontSize: 12, color: "#6b7280", maxWidth: 320, lineHeight: 1.5 }}>
                    {doc.confidence != null
                        ? "Die folgenden Felder wurden automatisch aus dem Beleg extrahiert. Bitte prüfen und ggf. korrigieren."
                        : "Für diesen Beleg wurden keine Daten extrahiert. Über „Bearbeiten“ können die Felder manuell ausgefüllt werden."}
                  </p>
                </div>
                {doc.confidence != null && <ConfidenceRing value={doc.confidence} />}
              </div>

              {/* Datenfelder. Am Telefon einspaltig, sonst wird der rechte
                  Wert abgeschnitten. */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "12px" : "14px 20px", marginBottom: 20 }}>
                <FieldRow label="Aussteller" fieldKey="aussteller" wide editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="Adresse" fieldKey="adresse" wide editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="USt-IdNr." fieldKey="ustIdNr" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="Datum" fieldKey="datum" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                {ed.uhrzeit && <FieldRow label="Uhrzeit" fieldKey="uhrzeit" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />}
                <FieldRow label="Belegnummer" fieldKey="rechnungsnr" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="Zahlungsart" fieldKey="zahlungsart" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
              </div>

              {/* Klassifikation, ein Beleg kann mehreren Kategorien zugeordnet sein */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={labelStyle}>KLASSIFIKATION</span>
                  {!isMobile && <span style={{ fontSize: 10, color: "#9ca3af" }}>Mehrfachzuordnung möglich</span>}
                </div>
                <div style={{ background: "#fafaf8", borderRadius: 8, border: "1px solid #f0ece4", padding: "10px 12px" }}>
                  {/* Gewählte Klassifikationen */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: kategorien.length ? 10 : 0 }}>
                    {kategorien.length === 0 && (
                        <span style={{ fontSize: 11.5, color: "#9ca3af" }}>Noch nicht klassifiziert</span>
                    )}
                    {kategorien.map((k) => (
                        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eef2f6", color: "#18537a", fontSize: 11.5, fontWeight: 600, padding: "4px 6px 4px 10px", borderRadius: 14 }}>
                          {k}
                          <button onClick={() => kategorieEntfernen(k)} title={`"${k}" entfernen`}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#18537a", fontSize: 12, lineHeight: 1, padding: 0, display: "flex", opacity: 0.65 }}
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.65)}>
                            <i className="bi bi-x-circle-fill" />
                          </button>
                        </span>
                    ))}
                  </div>

                  {/* Hinzufügen: Auswahlliste oder eigener Text */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input list="bs-kategorien" value={neueKategorie} placeholder="Klassifikation wählen oder eintippen…"
                           onChange={(e) => setNeueKategorie(e.target.value)}
                           onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); kategorieHinzufuegen(); } }}
                           style={{ ...fieldStyle, flex: 1, background: "#fff" }} />
                    <datalist id="bs-kategorien">
                      {vorschlaege.map((k) => <option key={k} value={k} />)}
                    </datalist>
                    <button onClick={() => kategorieHinzufuegen()} disabled={!neueKategorie.trim()}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: neueKategorie.trim() ? "#18537a" : "#e5e7eb", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: neueKategorie.trim() ? "#fff" : "#9ca3af", cursor: neueKategorie.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                      <i className="bi bi-plus-lg" /> Hinzufügen
                    </button>
                  </div>

                  {/* Häufige Klassifikationen zum Antippen */}
                  {vorschlaege.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
                        {vorschlaege.slice(0, 5).map((k) => (
                            <button key={k} onClick={() => kategorieHinzufuegen(k)}
                                    style={{ padding: "3px 9px", border: "1px dashed #d6cfc4", borderRadius: 14, background: "transparent", color: "#6b7280", fontSize: 10.5, cursor: "pointer", fontFamily: "inherit" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#18537a"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; }}>
                              + {k}
                            </button>
                        ))}
                      </div>
                  )}
                </div>
              </div>

              {/* Positionen */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={labelStyle}>POSITIONEN</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>Haken entfernen, um eine Position von der Anrechnung auszunehmen</span>
                </div>
                <div style={{ background: "#fafaf8", borderRadius: 8, border: "1px solid #f0ece4", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "26px 2.2fr 1fr 46px 1fr", gap: 8, padding: "7px 12px", background: "#f5f3ef", borderBottom: "1px solid #ede9e0" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }} title="Steuerlich anrechnen"><i className="bi bi-check2" /></span>
                    {["Bezeichnung", "Netto", "MwSt", "Brutto"].map((h, hi) => (
                        <span key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: ".05em", textAlign: hi > 0 ? "right" : "left" }}>{h.toUpperCase()}</span>
                    ))}
                  </div>
                  {positionen?.map((p, i) => {
                    const on = included[i];
                    const strike = on ? "none" : "line-through";
                    return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 2.2fr 1fr 46px 1fr", gap: 8, padding: "8px 12px", borderBottom: i < positionen.length - 1 ? "1px solid #f0ece4" : "none", alignItems: "center", background: on ? "transparent" : "#faf7f4", opacity: on ? 1 : 0.5, transition: "all .15s" }}>
                          <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleIncluded(i)}
                              title={on ? "Position wird angerechnet" : "Position ist ausgenommen"}
                              style={{ width: 15, height: 15, accentColor: "#16a34a", cursor: "pointer", margin: 0 }}
                          />
                          {editMode ? (
                              <>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  <input style={{ ...fieldStyle, padding: "4px 6px", fontSize: 11.5 }}
                                         value={edited.positionen[i].bezeichnung}
                                         onChange={e => setEdited(prev => ({ ...prev, positionen: prev.positionen.map((pp, ii) => ii === i ? { ...pp, bezeichnung: e.target.value } : pp) }))} />
                                  <div style={{ display: "flex", gap: 3 }}>
                                    {["menge", "einzelpreis"].map(k => (
                                        <input key={k} placeholder={k} style={{ ...fieldStyle, padding: "3px 5px", fontSize: 10 }}
                                               value={edited.positionen[i][k]}
                                               onChange={e => setEdited(prev => ({ ...prev, positionen: prev.positionen.map((pp, ii) => ii === i ? { ...pp, [k]: e.target.value } : pp) }))} />
                                    ))}
                                  </div>
                                </div>
                                {["netto", "mwstSatz", "betrag"].map(k => (
                                    <input key={k} style={{ ...fieldStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
                                           value={edited.positionen[i][k]}
                                           onChange={e => setEdited(prev => ({ ...prev, positionen: prev.positionen.map((pp, ii) => ii === i ? { ...pp, [k]: k === "mwstSatz" ? e.target.value.replace(/\D/g, "") : e.target.value } : pp) }))} />
                                ))}
                              </>
                          ) : (
                              <>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, color: "#111827", fontWeight: 500, textDecoration: strike }}>{p.bezeichnung}</div>
                                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{p.menge} × {p.einzelpreis}</div>
                                </div>
                                <span style={{ fontSize: 11.5, color: "#374151", textAlign: "right", textDecoration: strike }}>{p.netto}</span>
                                <span style={{ fontSize: 10.5, color: "#9ca3af", textAlign: "right" }}>{p.mwstSatz} %</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: on ? "#0b2e44" : "#9ca3af", textAlign: "right", textDecoration: strike }}>{p.betrag}</span>
                              </>
                          )}
                        </div>
                    );
                  })}
                  {(positionen ?? []).length === 0 && !editMode && (
                      <div style={{ padding: "18px 12px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
                        Keine Positionen erfasst. Über „Bearbeiten“ hinzufügen.
                      </div>
                  )}
                  {editMode && (
                      <button onClick={addPosition}
                              style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", borderTop: (positionen ?? []).length > 0 ? "1px solid #f0ece4" : "none", fontSize: 12, fontWeight: 600, color: "#18537a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <i className="bi bi-plus-circle" /> Position hinzufügen
                      </button>
                  )}
                </div>
              </div>

              {/* Steuerliche Auswertung, laufend aus den angehakten Positionen berechnet */}
              <div style={{ background: "#f5f3ef", borderRadius: 8, padding: "14px 16px", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>STEUERLICHE AUSWERTUNG</span>
                  {ausgeschlossen > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#b45309", background: "#fef3c7", padding: "2px 8px", borderRadius: 10 }}>
                      {ausgeschlossen} Position{ausgeschlossen > 1 ? "en" : ""} ausgenommen
                    </span>
                  )}
                </div>

                {/* Aufteilung nach Steuersatz */}
                {calc.saetze.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 8, paddingBottom: 4, borderBottom: "1px solid #e0dbd2", marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af" }}>SATZ</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textAlign: "right" }}>NETTO</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textAlign: "right" }}>VORSTEUER</span>
                      </div>
                      {calc.saetze.map(s => (
                          <div key={s.satz} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 8, padding: "2px 0" }}>
                            <span style={{ fontSize: 11.5, color: "#374151", fontWeight: 600 }}>{s.satz} %</span>
                            <span style={{ fontSize: 11.5, color: "#374151", textAlign: "right" }}>{formatBetrag(s.netto)}</span>
                            <span style={{ fontSize: 11.5, color: "#374151", textAlign: "right" }}>{formatBetrag(s.steuer)}</span>
                          </div>
                      ))}
                    </div>
                )}

                {/* Die beiden Größen, die tatsächlich gebucht werden */}
                <div style={{ borderTop: "1px solid #e0dbd2", paddingTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 12, color: "#0b2e44", fontWeight: 600 }}>
                      Betriebsausgabe <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>(netto)</span>
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#0b2e44" }}>{formatBetrag(calc.netto)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                      Vorsteuer <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>(§ 15 UStG)</span>
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>{formatBetrag(calc.vorsteuer)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px dashed #d6cfc4", paddingTop: 7 }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Brutto (Kontrolle)</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280" }}>{formatBetrag(calc.brutto)}</span>
                  </div>
                </div>

                {/* Abgleich mit dem Beleg */}
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e0dbd2", display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#9ca3af" }}>
                  <span>Beleg gesamt: <strong style={{ color: "#6b7280" }}>{ed.gesamtBetrag || "-"}</strong></span>
                  {calc.ausgenommenBrutto > 0 && (
                      <span>davon ausgenommen: <strong style={{ color: "#b45309" }}>{formatBetrag(calc.ausgenommenBrutto)}</strong></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fußzeile mit den Aktionen. Am Telefon ohne Hinweistext, dafür
              füllen die Schaltflächen die Breite. */}
          <div style={{ flexShrink: 0, padding: isMobile ? "12px 16px" : "14px 24px", borderTop: "1px solid #f0ece4", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            {!isMobile && (
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {editMode ? "Bearbeitungsmodus aktiv, alle Felder können geändert werden" : "Über Bearbeiten lassen sich die Belegdaten ändern"}
                </div>
            )}
            <div style={{ display: "flex", gap: 10, width: isMobile ? "100%" : "auto" }}>
              {/* Löschen */}
              <button onClick={onDiscard}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: isMobile ? 1 : undefined, gap: 6, padding: "9px 18px", background: "#fff", border: "1px solid #fca5a5", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer", transition: "all .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <i className="bi bi-trash3" /> Löschen
              </button>

              {/* Bearbeiten / Speichern */}
              {editMode ? (
                  <button onClick={speichereAlles}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: isMobile ? 1 : undefined, gap: 6, padding: "9px 18px", background: "#18537a", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    <i className="bi bi-floppy" /> {isMobile ? "Speichern" : "Änderungen speichern"}
                  </button>
              ) : (
                  <button onClick={() => setEditMode(true)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: isMobile ? 1 : undefined, gap: 6, padding: "9px 18px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <i className="bi bi-pencil" /> Bearbeiten
                  </button>
              )}

              {/* Bestätigen. Solange die KI nicht über den Beleg gelaufen ist,
                  wird nur gespeichert und der Beleg bleibt ausstehend. Der Knopf
                  heißt dann auch Speichern. */}
              {!editMode && (
                  <button onClick={() => onConfirm(withFlags(ed), kategorien)}
                          title={nochNichtAnalysiert
                              ? "Eingaben speichern. Geprüft wird der Beleg erst nach der KI-Analyse."
                              : "Beleg als geprüft bestätigen"}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: isMobile ? 1 : undefined, gap: 6, padding: "9px 20px", background: nochNichtAnalysiert ? "#18537a" : "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: nochNichtAnalysiert ? "none" : "0 2px 8px rgba(22,163,74,.3)" }}>
                    <i className={nochNichtAnalysiert ? "bi bi-floppy" : "bi bi-check2-circle"} /> {nochNichtAnalysiert ? "Speichern" : "Bestätigen"}
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}