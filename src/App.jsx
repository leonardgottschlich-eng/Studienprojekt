import 'bootstrap-icons/font/bootstrap-icons.css';
import { useState, useRef, useCallback, useEffect } from "react";

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
    {
      id: 1, name: "Rechnung_Büromaterial_Jan2025.pdf", size: "1.2 MB", type: "pdf",
      uploadedAt: "15.01.2025", status: "analysiert", category: "Betriebsausgaben", amount: "342,50 €",
      confidence: 94,
      extractedData: {
        aussteller: "Office Depot GmbH", adresse: "Lyoner Str. 15, 60528 Frankfurt", ustIdNr: "DE811207406",
        datum: "14.01.2025", rechnungsnr: "RE-2025-00441", zahlungsart: "Überweisung",
        positionen: [
          { bezeichnung: "Druckerpapier A4 (5× Ries)", menge: "5", einzelpreis: "28,99 €", betrag: "144,95 €" },
          { bezeichnung: "Toner HP LaserJet", menge: "2", einzelpreis: "64,90 €", betrag: "129,80 €" },
          { bezeichnung: "Ordner A4 breit (10er Pack)", menge: "1", einzelpreis: "38,50 €", betrag: "38,50 €" },
        ],
        nettoBetrag: "287,81 €", mwstSatz: "19 %", mwstBetrag: "54,69 €", gesamtBetrag: "342,50 €",
      },
    },
    {
      id: 2, name: "Tankquittung_Mai2026.pdf", size: "485 KB", type: "pdf",
      uploadedAt: "13.05.2026", status: "analysiert", category: "Fahrtkosten", amount: "72,72 €",
      confidence: 91,
      scanPreview: "totalenergies",
      extractedData: {
        aussteller: "TotalEnergies Mertert", adresse: "48, Route de Wasserbillig, L-6686 Mertert", ustIdNr: "LU18678765",
        datum: "01.05.2026", uhrzeit: "13:49:21", rechnungsnr: "0943120093", zahlungsart: "Mastercard (**** 2640)",
        positionen: [
          { bezeichnung: "Eurosuper", menge: "39,45 L", einzelpreis: "1,793 €/L", betrag: "70,73 €" },
          { bezeichnung: "Monster Juice Vik. B", menge: "1", einzelpreis: "1,99 €", betrag: "1,99 €" },
        ],
        nettoBetrag: "62,38 €", mwstSatz: "17 % / 3 %", mwstBetrag: "10,34 €", gesamtBetrag: "72,72 €",
      },
    },
    {
      id: 3, name: "Kontoauszug_Q1_2025.pdf", size: "2.8 MB", type: "pdf",
      uploadedAt: "01.03.2025", status: "in_bearbeitung", category: "Bankbelege", amount: "—",
      confidence: 62,
      extractedData: {
        aussteller: "Sparkasse Frankfurt", adresse: "Neue Mainzer Str. 47, 60311 Frankfurt", ustIdNr: "—",
        datum: "28.02.2025", rechnungsnr: "KTOAUSZUG-2025-Q1", zahlungsart: "—",
        positionen: [
          { bezeichnung: "Kontoführungsgebühr Feb.", menge: "1", einzelpreis: "8,90 €", betrag: "8,90 €" },
          { bezeichnung: "Lastschrift Miete", menge: "1", einzelpreis: "1.200,00 €", betrag: "1.200,00 €" },
        ],
        nettoBetrag: "—", mwstSatz: "—", mwstBetrag: "—", gesamtBetrag: "—",
      },
    },
    {
      id: 4, name: "Hotelrechnung_Berlin.pdf", size: "890 KB", type: "pdf",
      uploadedAt: "18.02.2025", status: "analysiert", category: "Reisekosten", amount: "219,00 €",
      confidence: 88,
      extractedData: {
        aussteller: "Motel One Berlin-Alexanderplatz", adresse: "Grunerstraße 11, 10179 Berlin", ustIdNr: "DE247557709",
        datum: "17.02.2025", rechnungsnr: "M1-2025-98341", zahlungsart: "Kreditkarte",
        positionen: [
          { bezeichnung: "Doppelzimmer (2 Nächte)", menge: "2", einzelpreis: "89,00 €", betrag: "178,00 €" },
          { bezeichnung: "Frühstück", menge: "2", einzelpreis: "12,50 €", betrag: "25,00 €" },
          { bezeichnung: "Parken", menge: "2", einzelpreis: "8,00 €", betrag: "16,00 €" },
        ],
        nettoBetrag: "184,03 €", mwstSatz: "7 % / 19 %", mwstBetrag: "34,97 €", gesamtBetrag: "219,00 €",
      },
    },
  ],
  2: [
    {
      id: 5, name: "Honorarrechnung_Q1.pdf", size: "620 KB", type: "pdf",
      uploadedAt: "31.03.2025", status: "analysiert", category: "Einnahmen", amount: "4.800,00 €",
      confidence: 97,
      extractedData: {
        aussteller: "Sabine Hoffmann – Freiberufliche Beraterin", adresse: "Musterstraße 12, 80331 München", ustIdNr: "DE334556778",
        datum: "31.03.2025", rechnungsnr: "SH-2025-003", zahlungsart: "Überweisung",
        positionen: [
          { bezeichnung: "Beratungsleistung März 2025 (40 h)", menge: "40 h", einzelpreis: "120,00 €/h", betrag: "4.800,00 €" },
        ],
        nettoBetrag: "4.800,00 €", mwstSatz: "0 % (Kleinunternehmen)", mwstBetrag: "0,00 €", gesamtBetrag: "4.800,00 €",
      },
    },
    {
      id: 6, name: "Bürokosten_März.pdf", size: "310 KB", type: "pdf",
      uploadedAt: "28.03.2025", status: "ausstehend", category: "Betriebsausgaben", amount: "156,00 €",
      confidence: 73,
      extractedData: {
        aussteller: "WeWork GmbH", adresse: "Friesenplatz 4, 50672 Köln", ustIdNr: "DE298771234",
        datum: "01.03.2025", rechnungsnr: "WW-MAR-2025-0812", zahlungsart: "SEPA-Lastschrift",
        positionen: [
          { bezeichnung: "Hot Desk – März 2025", menge: "1", einzelpreis: "131,09 €", betrag: "131,09 €" },
        ],
        nettoBetrag: "131,09 €", mwstSatz: "19 %", mwstBetrag: "24,91 €", gesamtBetrag: "156,00 €",
      },
    },
  ],
  3: [
    {
      id: 7, name: "Lieferantenrechnung_April.pdf", size: "1.5 MB", type: "pdf",
      uploadedAt: "05.04.2025", status: "analysiert", category: "Einkauf", amount: "12.340,00 €",
      confidence: 89,
      extractedData: {
        aussteller: "Metallbau Seifert KG", adresse: "Industriepark 3, 74172 Neckarsulm", ustIdNr: "DE199234561",
        datum: "03.04.2025", rechnungsnr: "MS-2025-1187", zahlungsart: "Überweisung 30 Tage",
        positionen: [
          { bezeichnung: "Stahlträger IPE 200 (20 Stk.)", menge: "20", einzelpreis: "342,00 €", betrag: "6.840,00 €" },
          { bezeichnung: "Schweißdraht MIG 15 kg", menge: "8", einzelpreis: "68,75 €", betrag: "550,00 €" },
          { bezeichnung: "Montagekosten", menge: "1", einzelpreis: "3.630,25 €", betrag: "3.630,25 €" },
        ],
        nettoBetrag: "10.369,75 €", mwstSatz: "19 %", mwstBetrag: "1.970,25 €", gesamtBetrag: "12.340,00 €",
      },
    },
    {
      id: 8, name: "Lohnabrechnung_Q1.pdf", size: "980 KB", type: "pdf",
      uploadedAt: "01.04.2025", status: "analysiert", category: "Personalkosten", amount: "28.900,00 €",
      confidence: 95,
      extractedData: {
        aussteller: "DATEV Lohnabrechnung", adresse: "Paumgartnerstr. 6-14, 90429 Nürnberg", ustIdNr: "—",
        datum: "31.03.2025", rechnungsnr: "LOHN-Q1-2025", zahlungsart: "Banküberweisung",
        positionen: [
          { bezeichnung: "Bruttogehälter (7 MA)", menge: "7", einzelpreis: "3.200,00 €", betrag: "22.400,00 €" },
          { bezeichnung: "Arbeitgeberanteil SV", menge: "1", einzelpreis: "4.700,00 €", betrag: "4.700,00 €" },
          { bezeichnung: "Berufsgenossenschaft", menge: "1", einzelpreis: "1.800,00 €", betrag: "1.800,00 €" },
        ],
        nettoBetrag: "—", mwstSatz: "—", mwstBetrag: "—", gesamtBetrag: "28.900,00 €",
      },
    },
    {
      id: 9, name: "Miete_April.jpg", size: "240 KB", type: "image",
      uploadedAt: "02.04.2025", status: "ausstehend", category: "Miete", amount: "2.200,00 €",
      confidence: 78,
      extractedData: {
        aussteller: "Immobilienverwaltung Brandt GmbH", adresse: "Hansaallee 201, 40549 Düsseldorf", ustIdNr: "DE178923456",
        datum: "01.04.2025", rechnungsnr: "IMM-APR-2025-44", zahlungsart: "Dauerauftrag",
        positionen: [
          { bezeichnung: "Kaltmiete April 2025", menge: "1", einzelpreis: "1.800,00 €", betrag: "1.800,00 €" },
          { bezeichnung: "Nebenkosten", menge: "1", einzelpreis: "400,00 €", betrag: "400,00 €" },
        ],
        nettoBetrag: "1.848,74 €", mwstSatz: "19 %", mwstBetrag: "351,26 €", gesamtBetrag: "2.200,00 €",
      },
    },
  ],
  4: [{
    id: 10, name: "Kassenbon_Werkzeug.jpg", size: "180 KB", type: "image",
    uploadedAt: "12.02.2025", status: "ausstehend", category: "Betriebsausgaben", amount: "89,99 €",
    confidence: 66,
    extractedData: {
      aussteller: "Bauhaus AG", adresse: "Gutenbergstr. 21, 68167 Mannheim", ustIdNr: "DE147258369",
      datum: "12.02.2025", rechnungsnr: "BH-KB-20250212-0934", zahlungsart: "EC-Karte",
      positionen: [
        { bezeichnung: "Akkuschrauber Bosch GSR 12V", menge: "1", einzelpreis: "89,99 €", betrag: "89,99 €" },
      ],
      nettoBetrag: "75,62 €", mwstSatz: "19 %", mwstBetrag: "14,37 €", gesamtBetrag: "89,99 €",
    },
  }],
  5: [
    {
      id: 11, name: "SaaS_Rechnung_Feb.pdf", size: "420 KB", type: "pdf",
      uploadedAt: "01.02.2025", status: "analysiert", category: "IT-Kosten", amount: "349,00 €",
      confidence: 99,
      extractedData: {
        aussteller: "Atlassian Pty Ltd", adresse: "Level 6, 341 George St, Sydney NSW 2000", ustIdNr: "AU88123456789",
        datum: "01.02.2025", rechnungsnr: "ATL-INV-2025-02-0044", zahlungsart: "Kreditkarte",
        positionen: [
          { bezeichnung: "Jira Software – 10 User (Feb)", menge: "10", einzelpreis: "20,50 €", betrag: "205,00 €" },
          { bezeichnung: "Confluence – 10 User (Feb)", menge: "10", einzelpreis: "14,40 €", betrag: "144,00 €" },
        ],
        nettoBetrag: "293,28 €", mwstSatz: "19 %", mwstBetrag: "55,72 €", gesamtBetrag: "349,00 €",
      },
    },
    {
      id: 12, name: "Serverkosten_Q1.pdf", size: "510 KB", type: "pdf",
      uploadedAt: "31.03.2025", status: "in_bearbeitung", category: "IT-Kosten", amount: "780,00 €",
      confidence: 83,
      extractedData: {
        aussteller: "Amazon Web Services EMEA SARL", adresse: "38 Avenue John F. Kennedy, L-1855 Luxemburg", ustIdNr: "LU26375245",
        datum: "31.03.2025", rechnungsnr: "AWS-EU-2025-Q1-88124", zahlungsart: "Kreditkarte",
        positionen: [
          { bezeichnung: "EC2 Instances (t3.medium × 3)", menge: "3", einzelpreis: "120,00 €", betrag: "360,00 €" },
          { bezeichnung: "S3 Storage (2 TB)", menge: "1", einzelpreis: "280,00 €", betrag: "280,00 €" },
          { bezeichnung: "CloudFront (CDN)", menge: "1", einzelpreis: "140,00 €", betrag: "140,00 €" },
        ],
        nettoBetrag: "655,46 €", mwstSatz: "19 %", mwstBetrag: "124,54 €", gesamtBetrag: "780,00 €",
      },
    },
  ],
  6: [{
    id: 13, name: "Praxiskosten_Jan.pdf", size: "340 KB", type: "pdf",
    uploadedAt: "31.01.2025", status: "analysiert", category: "Praxiskosten", amount: "1.250,00 €",
    confidence: 92,
    extractedData: {
      aussteller: "Medizintechnik Bauer GmbH", adresse: "Röntgenstraße 3, 50858 Köln", ustIdNr: "DE233445678",
      datum: "30.01.2025", rechnungsnr: "MTB-2025-0091", zahlungsart: "Überweisung",
      positionen: [
        { bezeichnung: "Wartung Ultraschallgerät", menge: "1", einzelpreis: "680,00 €", betrag: "680,00 €" },
        { bezeichnung: "Verbrauchsmaterial (Gel, Desinf.)", menge: "1", einzelpreis: "370,00 €", betrag: "370,00 €" },
        { bezeichnung: "Softwarelizenz Praxissystem", menge: "1", einzelpreis: "200,00 €", betrag: "200,00 €" },
      ],
      nettoBetrag: "1.050,42 €", mwstSatz: "19 %", mwstBetrag: "199,58 €", gesamtBetrag: "1.250,00 €",
    },
  }],
  7: [
    {
      id: 14, name: "Wareneingang_März.pdf", size: "760 KB", type: "pdf",
      uploadedAt: "25.03.2025", status: "analysiert", category: "Einkauf", amount: "3.450,00 €",
      confidence: 87,
      extractedData: {
        aussteller: "Großhandel Frisch & Co. KG", adresse: "Marktstraße 88, 50679 Köln", ustIdNr: "DE211334455",
        datum: "24.03.2025", rechnungsnr: "GF-2025-1034", zahlungsart: "Überweisung 14 Tage",
        positionen: [
          { bezeichnung: "Saisongemüse Mix (200 kg)", menge: "200 kg", einzelpreis: "3,80 €/kg", betrag: "760,00 €" },
          { bezeichnung: "Tiefkühlware Sortiment", menge: "1", einzelpreis: "1.440,00 €", betrag: "1.440,00 €" },
          { bezeichnung: "Trockenware / Gewürze", menge: "1", einzelpreis: "1.250,00 €", betrag: "1.250,00 €" },
        ],
        nettoBetrag: "2.899,16 €", mwstSatz: "7 % / 19 %", mwstBetrag: "550,84 €", gesamtBetrag: "3.450,00 €",
      },
    },
    {
      id: 15, name: "Fahrzeugkosten.pdf", size: "290 KB", type: "pdf",
      uploadedAt: "10.03.2025", status: "ausstehend", category: "Fahrtkosten", amount: "430,00 €",
      confidence: 71,
      extractedData: {
        aussteller: "Autohaus Gruber GmbH", adresse: "Hauptstraße 12, 86551 Aichach", ustIdNr: "DE178234567",
        datum: "08.03.2025", rechnungsnr: "AG-WS-2025-0345", zahlungsart: "EC-Karte",
        positionen: [
          { bezeichnung: "Ölwechsel + Filter", menge: "1", einzelpreis: "180,00 €", betrag: "180,00 €" },
          { bezeichnung: "Reifenwechsel (4 Reifen)", menge: "4", einzelpreis: "35,00 €", betrag: "140,00 €" },
          { bezeichnung: "HU/AU", menge: "1", einzelpreis: "110,00 €", betrag: "110,00 €" },
        ],
        nettoBetrag: "361,34 €", mwstSatz: "19 %", mwstBetrag: "68,66 €", gesamtBetrag: "430,00 €",
      },
    },
  ],
  8: [
    {
      id: 16, name: "Zutaten_Rechnung_April.pdf", size: "850 KB", type: "pdf",
      uploadedAt: "03.04.2025", status: "analysiert", category: "Wareneinsatz", amount: "6.780,00 €",
      confidence: 96,
      extractedData: {
        aussteller: "Bäckereigroßhandel Süd GmbH", adresse: "Gewerbepark 1, 86368 Gersthofen", ustIdNr: "DE289123445",
        datum: "02.04.2025", rechnungsnr: "BGS-2025-APR-0071", zahlungsart: "SEPA-Lastschrift",
        positionen: [
          { bezeichnung: "Weizenmehl Typ 550 (100 × 25 kg)", menge: "100", einzelpreis: "18,90 €", betrag: "1.890,00 €" },
          { bezeichnung: "Butter (200 kg)", menge: "200 kg", einzelpreis: "8,40 €/kg", betrag: "1.680,00 €" },
          { bezeichnung: "Zucker (50 × 25 kg)", menge: "50", einzelpreis: "16,20 €", betrag: "810,00 €" },
          { bezeichnung: "Backmischungen Sortiment", menge: "1", einzelpreis: "2.400,00 €", betrag: "2.400,00 €" },
        ],
        nettoBetrag: "5.700,00 €", mwstSatz: "7 %", mwstBetrag: "399,00 €", gesamtBetrag: "6.099,00 €",
      },
    },
    {
      id: 17, name: "Stromrechnung_Q1.pdf", size: "210 KB", type: "pdf",
      uploadedAt: "01.04.2025", status: "in_bearbeitung", category: "Nebenkosten", amount: "1.120,00 €",
      confidence: 85,
      extractedData: {
        aussteller: "Stadtwerke Augsburg Energie GmbH", adresse: "Hoher Weg 1, 86152 Augsburg", ustIdNr: "DE129834567",
        datum: "31.03.2025", rechnungsnr: "SWA-2025-Q1-009981", zahlungsart: "Bankeinzug",
        positionen: [
          { bezeichnung: "Stromverbrauch Q1 (8.400 kWh)", menge: "8.400 kWh", einzelpreis: "0,118 €/kWh", betrag: "991,20 €" },
          { bezeichnung: "Grundpreis (3 Monate)", menge: "3", einzelpreis: "42,93 €", betrag: "128,80 €" },
        ],
        nettoBetrag: "941,18 €", mwstSatz: "19 %", mwstBetrag: "178,82 €", gesamtBetrag: "1.120,00 €",
      },
    },
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

// ── DocumentScanModal ─────────────────────────────────────────────
// Performance: Video direkt sichtbar + OpenCV nur auf 50%-Canvas (4x schneller)
// Nach Foto: Eckpunkte per Drag verschiebbar bevor zugeschnitten wird
function DocumentScanModal({ onClose, onCapture }) {
  const videoRef      = useRef(null);
  const smallCanvas   = useRef(null); // 50%-Canvas für OpenCV-Erkennung
  const svgOverlayRef = useRef(null); // SVG-Overlay für Rahmen-Zeichnung
  const frozenCanvas  = useRef(null); // Eingefriertes Foto für adjust-Phase
  const streamRef     = useRef(null);
  const intervalRef   = useRef(null);
  const scannerRef    = useRef(null);
  const containerRef  = useRef(null);

  // phase: loading | scanning | adjust | preview
  const [phase, setPhase]       = useState("loading");
  const [corners, setCorners]   = useState(null);   // {tl,tr,bl,br} in Bild-px
  const [dragging, setDragging] = useState(null);   // welche Ecke wird gezogen
  const [finalImg, setFinalImg] = useState(null);   // base64 nach Zuschnitt
  const [imgDims, setImgDims]   = useState({ w: 1, h: 1 }); // Bilddimensionen als State

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    const tryInit = () => {
      if (window.jscanify && window.cv && typeof window.cv.Mat === "function") {
        scannerRef.current = new window.jscanify();
        startCamera();
        return true;
      }
      return false;
    };
    if (tryInit()) return;
    const poll = setInterval(() => { if (tryInit()) clearInterval(poll); }, 250);
    return () => clearInterval(poll);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        setPhase("scanning");
        startDetection();
      };
    } catch {
      alert("Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.");
      onClose();
    }
  };

  // ── Live-Erkennung ────────────────────────────────────────────
  // OpenCV läuft auf 50%-Canvas → 4x weniger Pixel → deutlich flüssiger
  // Video selbst wird nativ angezeigt ohne Canvas-Kopie
  const startDetection = () => {
    const video = videoRef.current;
    const small = smallCanvas.current;
    const svg   = svgOverlayRef.current;
    const sc    = scannerRef.current;
    if (!video || !small || !svg || !sc) return;

    intervalRef.current = setInterval(() => {
      if (video.readyState < 2) return;
      const vw = video.videoWidth, vh = video.videoHeight;
      // Halbe Auflösung für OpenCV
      small.width  = Math.round(vw / 2);
      small.height = Math.round(vh / 2);
      small.getContext("2d").drawImage(video, 0, 0, small.width, small.height);

      let mat = null;
      try {
        mat = window.cv.imread(small);
        const contour = sc.findPaperContour(mat);
        if (!contour) { clearSvg(svg); return; }
        const pts = sc.getCornerPoints(contour, mat);
        if (!pts?.topLeftCorner) { clearSvg(svg); return; }

        // Koordinaten auf 100% hochskalieren
        const scale = 2;
        const tl = { x: pts.topLeftCorner.x    * scale, y: pts.topLeftCorner.y    * scale };
        const tr = { x: pts.topRightCorner.x   * scale, y: pts.topRightCorner.y   * scale };
        const br = { x: pts.bottomRightCorner.x * scale, y: pts.bottomRightCorner.y * scale };
        const bl = { x: pts.bottomLeftCorner.x  * scale, y: pts.bottomLeftCorner.y  * scale };

        // SVG-Overlay aktualisieren (kein Canvas-drawImage nötig → flüssig)
        drawSvgFrame(svg, tl, tr, br, bl, vw, vh);
      } catch { clearSvg(svg); }
      finally  { try { mat?.delete(); } catch {} }
    }, 80); // ~12 fps reicht für Erkennung
  };

  const clearSvg = (svg) => { if (svg) svg.innerHTML = ""; };

  const drawSvgFrame = (svg, tl, tr, br, bl, vw, vh) => {
    const pts = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
    svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    svg.innerHTML = `
      <polygon points="${pts}" fill="rgba(253,143,25,0.15)" stroke="#fd8f19" stroke-width="3" stroke-linejoin="round"/>
      ${[tl,tr,br,bl].map(p => `<circle cx="${p.x}" cy="${p.y}" r="14" fill="#fd8f19" opacity="0.7"/>`).join("")}
    `;
  };

  const stopDetection = () => clearInterval(intervalRef.current);
  const stopAll = () => {
    stopDetection();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  // ── Foto aufnehmen → adjust-Phase ────────────────────────────
  const capture = () => {
    stopDetection();
    clearSvg(svgOverlayRef.current);

    const video = videoRef.current;
    const fc    = frozenCanvas.current;
    const sc    = scannerRef.current;
    if (!video || !fc || !sc) return;

    // Foto einfrieren
    fc.width  = video.videoWidth;
    fc.height = video.videoHeight;
    fc.getContext("2d").drawImage(video, 0, 0);
    streamRef.current?.getTracks().forEach((t) => (t.enabled = false));
    setImgDims({ w: fc.width, h: fc.height }); // State triggert Re-render

    // Ecken mit halber Auflösung erkennen, dann hochskalieren
    const small = smallCanvas.current;
    small.width  = Math.round(fc.width / 2);
    small.height = Math.round(fc.height / 2);
    small.getContext("2d").drawImage(fc, 0, 0, small.width, small.height);

    let detectedCorners = null;
    let mat = null;
    try {
      mat = window.cv.imread(small);
      const contour = sc.findPaperContour(mat);
      if (contour) {
        const pts = sc.getCornerPoints(contour, mat);
        if (pts?.topLeftCorner) {
          const s = 2;
          detectedCorners = {
            tl: { x: pts.topLeftCorner.x    * s, y: pts.topLeftCorner.y    * s },
            tr: { x: pts.topRightCorner.x   * s, y: pts.topRightCorner.y   * s },
            br: { x: pts.bottomRightCorner.x * s, y: pts.bottomRightCorner.y * s },
            bl: { x: pts.bottomLeftCorner.x  * s, y: pts.bottomLeftCorner.y  * s },
          };
        }
      }
    } catch (e) { console.warn("Eckerkennung:", e); }
    finally { try { mat?.delete(); } catch {} }

    // Fallback: Ecken = Bildecken mit 5% Inset
    if (!detectedCorners) {
      const w = fc.width, h = fc.height, m = Math.min(w, h) * 0.05;
      detectedCorners = { tl:{x:m,y:m}, tr:{x:w-m,y:m}, br:{x:w-m,y:h-m}, bl:{x:m,y:h-m} };
    }

    setCorners(detectedCorners);
    setPhase("adjust");
  };

  // ── Drag-Logik für Eckpunkte ──────────────────────────────────
  const KEYS = ["tl", "tr", "br", "bl"];
  const HANDLE = 28; // Griff-Radius in px

  const getEventPos = (e, rect, imgW, imgH, dispW, dispH) => {
    const raw = e.touches ? e.touches[0] : e;
    const rx = (raw.clientX - rect.left) / dispW;
    const ry = (raw.clientY - rect.top)  / dispH;
    return { x: rx * imgW, y: ry * imgH };
  };

  const onPointerDown = (key) => (e) => {
    e.preventDefault();
    setDragging(key);
  };

  const onPointerMove = (e) => {
    if (!dragging || !containerRef.current || !frozenCanvas.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const pos  = getEventPos(e, rect, frozenCanvas.current.width, frozenCanvas.current.height, rect.width, rect.height);
    setCorners((prev) => ({ ...prev, [dragging]: pos }));
  };

  const onPointerUp = () => setDragging(null);

  // ── Zuschnitt anwenden ────────────────────────────────────────
  const applyExtract = () => {
    const fc  = frozenCanvas.current;
    const sc  = scannerRef.current;
    if (!fc || !sc || !corners) return;

    const ratio = calcRatio(corners);
    const outW  = 900;
    const outH  = ratio > 0 ? Math.round(outW / ratio) : 1200;

    const jsCorners = {
      topLeftCorner:     { x: corners.tl.x, y: corners.tl.y },
      topRightCorner:    { x: corners.tr.x, y: corners.tr.y },
      bottomRightCorner: { x: corners.br.x, y: corners.br.y },
      bottomLeftCorner:  { x: corners.bl.x, y: corners.bl.y },
    };

    try {
      const extracted = sc.extractPaper(fc, outW, outH, jsCorners);
      if (extracted) {
        setFinalImg(extracted.toDataURL("image/jpeg", 0.93));
        setPhase("preview");
        return;
      }
    } catch (e) { console.warn("extractPaper:", e); }

    // Fallback: Foto ohne Zuschnitt
    setFinalImg(fc.toDataURL("image/jpeg", 0.93));
    setPhase("preview");
  };

  const calcRatio = ({ tl, tr, br, bl }) => {
    const avgW = (Math.hypot(tr.x-tl.x, tr.y-tl.y) + Math.hypot(br.x-bl.x, br.y-bl.y)) / 2;
    const avgH = (Math.hypot(bl.x-tl.x, bl.y-tl.y) + Math.hypot(br.x-tr.x, br.y-tr.y)) / 2;
    return avgH > 0 ? avgW / avgH : 0;
  };

  const retake = () => {
    setFinalImg(null);
    setCorners(null);
    setPhase("scanning");
    streamRef.current?.getTracks().forEach((t) => (t.enabled = true));
    startDetection();
  };

  const confirm = () => {
    const src = finalImg;
    const byteString = atob(src.split(",")[1]);
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const file = new File([ia], `Scan_${Date.now()}.jpg`, { type: "image/jpeg" });
    stopAll();
    onCapture(file);
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────
  const imgW = imgDims.w;
  const imgH = imgDims.h;

  return (
      <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 999, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0b2e44", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bi bi-file-earmark-text" style={{ color: "#fd8f19", fontSize: 18 }} />
            <span style={{ color: "#f0f8ff", fontWeight: 600, fontSize: 15 }}>
            {phase === "loading"  && "Wird geladen…"}
              {phase === "scanning" && "Dokument ausrichten"}
              {phase === "adjust"   && "Ecken anpassen"}
              {phase === "preview"  && "Vorschau"}
          </span>
          </div>
          <button onClick={() => { stopAll(); onClose(); }} style={{ background: "none", border: "none", color: "#7ab8d0", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Kamera / Inhalt */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden", background: "#111" }}
             onMouseMove={phase === "adjust" ? onPointerMove : undefined}
             onMouseUp={phase === "adjust" ? onPointerUp : undefined}
             onTouchMove={phase === "adjust" ? onPointerMove : undefined}
             onTouchEnd={phase === "adjust" ? onPointerUp : undefined}>

          {/* Ladescreen */}
          {phase === "loading" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <div style={{ width: 36, height: 36, border: "3px solid #fd8f19", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ color: "#7ab8d0", fontSize: 13 }}>OpenCV wird geladen…</p>
                <p style={{ color: "#4a8aaa", fontSize: 11, opacity: 0.7 }}>Kann beim ersten Mal 10–20 Sek. dauern</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
          )}

          {/* Live-Video – nativ, kein Canvas-Copy → flüssig */}
          <video ref={videoRef} autoPlay playsInline muted
                 style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: phase === "scanning" ? "block" : "none" }} />

          {/* SVG-Overlay: Dokumentrahmen live */}
          <svg ref={svgOverlayRef} preserveAspectRatio="xMidYMid meet"
               style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: phase === "scanning" ? "block" : "none", pointerEvents: "none" }} />

          {/* Hinweis */}
          {phase === "scanning" && (
              <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 12, padding: "5px 14px", borderRadius: 20 }}>
              Beleg vor die Kamera halten
            </span>
              </div>
          )}

          {/* Versteckte Canvases */}
          <canvas ref={smallCanvas}   style={{ display: "none" }} />
          <canvas ref={frozenCanvas}  style={{ display: "none" }} />

          {/* ── Adjust-Phase: Foto + verschiebbare Ecken ── */}
          {phase === "adjust" && corners && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                      src={frozenCanvas.current?.toDataURL()}
                      alt="Foto"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                  />
                  {/* SVG-Overlay mit ziehbaren Ecken */}
                  <svg
                      viewBox={`0 0 ${imgW} ${imgH}`}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: dragging ? "grabbing" : "default" }}
                  >
                    {/* Polygon-Fläche */}
                    <polygon
                        points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                        fill="rgba(253,143,25,0.12)"
                        stroke="#fd8f19"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                    {/* Kantenlinien extra dick für Sichtbarkeit */}
                    {[[corners.tl,corners.tr],[corners.tr,corners.br],[corners.br,corners.bl],[corners.bl,corners.tl]].map(([a,b],i) => (
                        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fd8f19" strokeWidth="3" strokeDasharray="10 6" />
                    ))}
                    {/* Ziehbare Griffe */}
                    {KEYS.map((key) => (
                        <g key={key}
                           onMouseDown={onPointerDown(key)}
                           onTouchStart={onPointerDown(key)}
                           style={{ cursor: "grab" }}>
                          <circle cx={corners[key].x} cy={corners[key].y} r={HANDLE + 10} fill="transparent" />
                          <circle cx={corners[key].x} cy={corners[key].y} r={HANDLE} fill="#fd8f19" stroke="#fff" strokeWidth="3" />
                          <text x={corners[key].x} y={corners[key].y + 5} textAnchor="middle" fontSize={HANDLE * 0.8} fill="#0b2e44" fontWeight="bold" style={{userSelect:"none"}}>
                          </text>
                        </g>
                    ))}
                  </svg>
                </div>
              </div>
          )}

          {/* Vorschau */}
          {phase === "preview" && finalImg && (
              <img src={finalImg} alt="Scan-Vorschau" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          )}
        </div>

        {/* Steuerleiste */}
        <div style={{ padding: "16px 20px", background: "#0b2e44", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexShrink: 0 }}>
          {phase === "scanning" && (
              <button onClick={capture}
                      style={{ width: 68, height: 68, borderRadius: "50%", background: "#fd8f19", border: "4px solid rgba(255,255,255,.25)", color: "#fff", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(253,143,25,.5)" }}>
                <i className="bi bi-camera" />
              </button>
          )}
          {phase === "adjust" && (
              <>
                <button onClick={retake}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 20px", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#dff0fb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <i className="bi bi-arrow-counterclockwise" /> Neu scannen
                </button>
                <button onClick={applyExtract}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 26px", background: "#fd8f19", border: "none", color: "#0b2e44", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <i className="bi bi-crop" /> Zuschneiden
                </button>
              </>
          )}
          {phase === "preview" && (
              <>
                <button onClick={() => setPhase("adjust")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 20px", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#dff0fb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <i className="bi bi-pencil" /> Ecken anpassen
                </button>
                <button onClick={confirm}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 26px", background: "#fd8f19", border: "none", color: "#0b2e44", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <i className="bi bi-check-lg" /> Verwenden
                </button>
              </>
          )}
        </div>
      </div>
  );
}

/* ── Confidence Ring ─────────────────────────────────────────── */
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

/* ── Scan Preview ────────────────────────────────────────────── */
function ScanPreview({ doc }) {
  if (doc.scanPreview === "totalenergies") {
    return (
      <div style={{ background: "#fff", borderRadius: 4, padding: "28px 24px", fontFamily: "'Courier New', monospace", fontSize: 11.5, lineHeight: 1.7, color: "#1a1a1a", boxShadow: "0 2px 12px rgba(0,0,0,.08)", minHeight: "100%", filter: "contrast(1.05)", position: "relative" }}>
        <div style={{ position: "absolute", top: 10, left: 10, width: 30, height: 3, background: "#888", borderRadius: 2, transform: "rotate(-10deg)" }} />
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>TotalEnergies Mertert</div>
          <div>48, Route de Wasserbillig</div>
          <div>L-6686 Mertert</div>
          <div>Tel: 00352-748478</div>
          <div style={{ fontSize: 10, color: "#555" }}>Öffnung: Montag bis Sonntag 6h00–22h00</div>
          <div>MwSt-Nr: LU18678765</div>
        </div>
        <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, letterSpacing: 1, marginBottom: 4 }}>KUNDENBELEG</div>
        <div style={{ textAlign: "center", marginBottom: 12, fontSize: 10 }}>Genehmigt</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 8px", borderTop: "1px solid #ccc", paddingTop: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700 }}>ARTIKEL</span><span style={{ fontSize: 10, fontWeight: 700 }}>MWST</span><span style={{ fontSize: 10, fontWeight: 700 }}>BETRAG</span>
          <span>*Eurosuper</span><span>4</span><span>€ 70,73</span>
          <span style={{ fontSize: 9, color: "#555", gridColumn: "1/4" }}>(ZP 5; 39,45 l × € 1,793/l)</span>
          <span>MONSTER JUICE VIK. B</span><span>1</span><span>€ 1,99</span>
        </div>
        <div style={{ borderTop: "1px dashed #aaa", marginBottom: 6 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
          <span>SUMME</span><span>€ 72,72</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span>Mastercard</span><span>€ 72,72</span>
        </div>
        <div style={{ fontSize: 9.5, color: "#444", borderTop: "1px solid #ccc", paddingTop: 8, marginBottom: 8 }}>
          <div>MASTERCARD: 537428******2640 OT</div>
          <div>PAN Folgenummer: 00</div>
          <div>Rest.: Kontaktlos bearbeitet</div>
          <div>Autorisierung: On-line</div>
          <div>PIN geprüft</div>
          <div>STAN: 147965 | Autor.-code: 134908</div>
          <div>Händler ID: ***77187</div>
          <div>VERKAUF – Genehmigt</div>
        </div>
        <div style={{ borderTop: "1px solid #ccc", paddingTop: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>MASTERCARD</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", fontSize: 9.5, gap: 2 }}>
            <span style={{ fontWeight: 600 }}>MwSt.</span><span style={{ fontWeight: 600 }}>Art %</span><span style={{ fontWeight: 600 }}>Netto</span><span style={{ fontWeight: 600 }}>Betrag</span>
            <span>4</span><span>17,00</span><span>€ 60,45</span><span>€ 10,28</span>
            <span>1</span><span>3,00</span><span>€ 1,93</span><span>€ 0,06</span>
          </div>
        </div>
        <div style={{ fontSize: 9.5, color: "#555", borderTop: "1px solid #ccc", paddingTop: 8 }}>
          <div>01-05-2026 13:49:21 – T4 0943120093</div>
          <div>12-342944-65469427 / 1882</div>
        </div>
        <div style={{ marginTop: 14, fontSize: 9, color: "#777", borderTop: "1px dashed #ccc", paddingTop: 8, textAlign: "center" }}>
          <div>Keine Rückerstattung</div>
          <div>Umtausch innerhalb von 15 Tagen</div>
          <div style={{ marginTop: 6 }}>Dieser Beleg gilt als Rechnung</div>
          <div>Merci et bonne route 🚗</div>
        </div>
      </div>
    );
  }

  // Generische Scan-Vorschau für alle anderen Belege
  const lines = [
    { w: "60%", bold: true }, { w: "40%" }, { w: "50%" }, { w: "30%" }, { w: "0%", h: 10 },
    { w: "55%", bold: true, center: true }, { w: "0%", h: 8 },
    { w: "100%", thin: true }, { w: "90%" }, { w: "75%" }, { w: "85%" }, { w: "70%" },
    { w: "100%", thin: true }, { w: "0%", h: 8 },
    { w: "50%", bold: true }, { w: "0%", h: 12 },
    { w: "95%" }, { w: "80%" }, { w: "88%" }, { w: "72%" }, { w: "0%", h: 8 },
    { w: "100%", thin: true },
    { w: "40%", bold: true }, { w: "55%" }, { w: "45%" },
    { w: "0%", h: 10 }, { w: "60%", thin: true }, { w: "35%", bold: true, right: true },
    { w: "0%", h: 16 }, { w: "70%", thin: true },
    { w: "55%" }, { w: "48%" }, { w: "62%" },
  ];
  return (
    <div style={{ background: "#fff", borderRadius: 4, padding: "28px 24px", boxShadow: "0 2px 12px rgba(0,0,0,.08)", minHeight: "100%", position: "relative" }}>
      <div style={{ position: "absolute", top: 10, left: 10, width: 26, height: 3, background: "#aaa", borderRadius: 2, transform: "rotate(-8deg)" }} />
      {lines.map((l, i) => l.w === "0%" ? (
        <div key={i} style={{ height: l.h }} />
      ) : (
        <div key={i} style={{
          height: l.bold ? 9 : l.thin ? 1 : 7, width: l.w,
          background: l.thin ? "#ddd" : l.bold ? "#2a2a2a" : "#888",
          borderRadius: 3, marginBottom: l.bold ? 7 : 5,
          marginLeft: l.right ? "auto" : l.center ? "auto" : 0,
          marginRight: l.right ? 0 : l.center ? "auto" : 0,
          opacity: l.thin ? 1 : undefined,
        }} />
      ))}
    </div>
  );
}

/* ── Beleg Detail Modal ──────────────────────────────────────── */
function DocDetailModal({ doc, onClose, onConfirm, onDiscard }) {
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState({ ...doc.extractedData });
  const ed = doc.extractedData;

  const fieldStyle = {
    width: "100%", padding: "7px 10px", border: "1px solid #e5e7eb",
    borderRadius: 7, fontSize: 12.5, color: "#111827", background: "#f9fafb", outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 3, display: "block" };

  const Field = ({ label, fieldKey, wide }) => (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined }}>
      <span style={labelStyle}>{label.toUpperCase()}</span>
      {editMode ? (
        <input style={fieldStyle} value={edited[fieldKey] ?? ""} onChange={e => setEdited(p => ({ ...p, [fieldKey]: e.target.value }))} />
      ) : (
        <div style={{ fontSize: 12.5, color: "#111827", fontWeight: 500, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>{ed[fieldKey] || "—"}</div>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "stretch" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(11,46,68,.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />

      {/* Modal panel */}
      <div style={{ position: "relative", margin: "auto", width: "min(92vw, 1080px)", maxHeight: "92vh", background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", animation: "fadeUp .25s ease", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f0ece4", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FileIcon type={doc.type} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0b2e44" }}>{doc.name}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Hochgeladen am {doc.uploadedAt} · {doc.size}</div>
            </div>
            <StatusBadge status={doc.status} />
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Left: Scan */}
          <div style={{ width: "42%", flexShrink: 0, background: "#f5f3ef", borderRight: "1px solid #ede9e0", overflowY: "auto", padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 12 }}>ORIGINALDOKUMENT</div>
            <ScanPreview doc={doc} />
          </div>

          {/* Right: Extracted data */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Confidence + header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 6 }}>KI-EXTRAHIERTE DATEN</div>
                <p style={{ fontSize: 12, color: "#6b7280", maxWidth: 320, lineHeight: 1.5 }}>
                  Die folgenden Felder wurden automatisch aus dem Beleg extrahiert. Bitte prüfen und ggf. korrigieren.
                </p>
              </div>
              <ConfidenceRing value={doc.confidence} />
            </div>

            {/* Fields grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", marginBottom: 20 }}>
              <Field label="Aussteller" fieldKey="aussteller" wide />
              <Field label="Adresse" fieldKey="adresse" wide />
              <Field label="USt-IdNr." fieldKey="ustIdNr" />
              <Field label="Datum" fieldKey="datum" />
              {ed.uhrzeit && <Field label="Uhrzeit" fieldKey="uhrzeit" />}
              <Field label="Belegnummer" fieldKey="rechnungsnr" />
              <Field label="Zahlungsart" fieldKey="zahlungsart" />
            </div>

            {/* Positionen */}
            <div style={{ marginBottom: 20 }}>
              <span style={labelStyle}>POSITIONEN</span>
              <div style={{ background: "#fafaf8", borderRadius: 8, border: "1px solid #f0ece4", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "7px 12px", background: "#f5f3ef", borderBottom: "1px solid #ede9e0" }}>
                  {["Bezeichnung", "Menge", "Einzelpreis", "Betrag"].map(h => (
                    <span key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: ".05em" }}>{h.toUpperCase()}</span>
                  ))}
                </div>
                {(editMode ? edited.positionen : ed.positionen)?.map((p, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 12px", borderBottom: i < ed.positionen.length - 1 ? "1px solid #f0ece4" : "none", alignItems: "center" }}>
                    {editMode ? (
                      ["bezeichnung", "menge", "einzelpreis", "betrag"].map(k => (
                        <input key={k} style={{ ...fieldStyle, padding: "4px 6px", fontSize: 11.5 }}
                          value={edited.positionen[i][k]}
                          onChange={e => setEdited(prev => {
                            const pos = prev.positionen.map((pp, ii) => ii === i ? { ...pp, [k]: e.target.value } : pp);
                            return { ...prev, positionen: pos };
                          })} />
                      ))
                    ) : (
                      <>
                        <span style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{p.bezeichnung}</span>
                        <span style={{ fontSize: 11.5, color: "#6b7280" }}>{p.menge}</span>
                        <span style={{ fontSize: 11.5, color: "#6b7280" }}>{p.einzelpreis}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#0b2e44" }}>{p.betrag}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Beträge */}
            <div style={{ background: "#f5f3ef", borderRadius: 8, padding: "12px 16px", marginBottom: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 20px" }}>
                <Field label="Nettobetrag" fieldKey="nettoBetrag" />
                <Field label="MwSt-Satz" fieldKey="mwstSatz" />
                <Field label="MwSt-Betrag" fieldKey="mwstBetrag" />
              </div>
              <div style={{ borderTop: "1px solid #e0dbd2", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0b2e44" }}>GESAMTBETRAG</span>
                {editMode ? (
                  <input style={{ ...fieldStyle, width: 140, textAlign: "right", fontWeight: 700, fontSize: 16 }}
                    value={edited.gesamtBetrag}
                    onChange={e => setEdited(p => ({ ...p, gesamtBetrag: e.target.value }))} />
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#0b2e44" }}>{ed.gesamtBetrag}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Action buttons */}
        <div style={{ flexShrink: 0, padding: "14px 24px", borderTop: "1px solid #f0ece4", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            {editMode ? "✏️ Bearbeitungsmodus aktiv — Felder können geändert werden" : "Klicke auf einen Eintrag um Details anzuzeigen"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {/* Verwerfen */}
            <button onClick={onDiscard}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#fff", border: "1px solid #fca5a5", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <i className="bi bi-trash3" /> Verwerfen
            </button>

            {/* Bearbeiten / Speichern */}
            {editMode ? (
              <button onClick={() => { setEditMode(false); onConfirm(edited); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#18537a", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                <i className="bi bi-floppy" /> Änderungen speichern
              </button>
            ) : (
              <button onClick={() => setEditMode(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <i className="bi bi-pencil" /> Bearbeiten
              </button>
            )}

            {/* Bestätigen */}
            {!editMode && (
              <button onClick={() => onConfirm(ed)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,.3)" }}>
                <i className="bi bi-check2-circle" /> Bestätigen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
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

  const docs = allDocs[currentMandant.id] || [];

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Belege vom Server laden wenn Mandant gewechselt wird
  const loadBelegeFromServer = async (mandant) => {
    try {
      const res = await fetch(
          `/api/belege?mandantNr=${encodeURIComponent(mandant.nr)}&mandantName=${encodeURIComponent(mandant.name)}`
      );
      if (!res.ok) return;
      const { files } = await res.json();
      if (!files || files.length === 0) return;

      const serverDocs = files.map((f, i) => ({
        id: `server_${mandant.id}_${i}_${f.name}`,
        name: f.name,
        size: f.size,
        type: f.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
        uploadedAt: f.createdAt,
        status: "ausstehend",
        category: "Nicht klassifiziert",
        amount: "---",
      }));

      setAllDocs((prev) => {
        const existing = prev[mandant.id] || [];
        const existingNames = new Set(existing.map((d) => d.name));
        const newDocs = serverDocs.filter((d) => !existingNames.has(d.name));
        if (newDocs.length === 0) return prev;
        return { ...prev, [mandant.id]: [...newDocs, ...existing] };
      });
    } catch {
      // Server nicht erreichbar - still ignorieren
    }
  };

  // Beim Start und bei jedem Mandantenwechsel Belege laden
  useEffect(() => {
    loadBelegeFromServer(currentMandant);
  }, [currentMandant.id]);

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

  // ── Upload an lokalen Server + React-State ────────────────────
  const uploadToLocal = async (files) => {
    const validFiles = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (!validFiles.length) {
      showNotification("Nur PDF oder Bilddateien erlaubt.", "error");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const uploadedDocs = [];
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress(((i + 1) / validFiles.length) * 100);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(
            `/api/upload?mandantNr=${encodeURIComponent(currentMandant.nr)}&mandantName=${encodeURIComponent(currentMandant.name)}`,
            { method: "POST", body: formData }
        );
        if (!response.ok) throw new Error("Server Fehler");
        const result = await response.json();
        if (result.success) {
          uploadedDocs.push({
            id: Date.now() + i,
            name: file.name,
            size: result.size ? `${(result.size / 1024).toFixed(0)} KB` : `${(file.size / 1024).toFixed(0)} KB`,
            type: file.type === "application/pdf" ? "pdf" : "image",
            uploadedAt: new Date().toLocaleDateString("de-DE"),
            status: "ausstehend",
            category: "Nicht klassifiziert",
            amount: "—",
          });
        }
      } catch {
        showNotification("Server nicht erreichbar. Bitte 'node server.js' starten.", "error");
        setUploading(false);
        return;
      }
    }
    setUploading(false);
    setUploadProgress(0);
    if (uploadedDocs.length > 0) {
      setAllDocs((prev) => ({
        ...prev,
        [currentMandant.id]: [...uploadedDocs, ...(prev[currentMandant.id] || [])],
      }));
      showNotification(`${uploadedDocs.length} Beleg${uploadedDocs.length > 1 ? "e" : ""} gespeichert ✓`);
    }
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
    setAllDocs(prev => ({
      ...prev,
      [currentMandant.id]: (prev[currentMandant.id] || []).map(d =>
        d.id === docId ? { ...d, status: "analysiert", extractedData: editedData, amount: editedData.gesamtBetrag, category: d.category } : d
      ),
    }));
    setSelectedDoc(null);
    showNotification("Beleg bestätigt und gespeichert ✓");
  };

  const handleDiscard = (docId) => {
    setAllDocs(prev => ({
      ...prev,
      [currentMandant.id]: (prev[currentMandant.id] || []).filter(d => d.id !== docId),
    }));
    setSelectedDoc(null);
    showNotification("Beleg verworfen", "error");
  };

  const filteredDocs = docs.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const stats = {
    total: docs.length,
    analysiert: docs.filter((d) => d.status === "analysiert").length,
    ausstehend: docs.filter((d) => d.status === "ausstehend").length,
  };

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
        /* ── Tablet ── */
        @media (max-width: 900px) {
          .main-content { margin-left: 0 !important; padding-top: 76px !important; padding-left: 16px !important; padding-right: 16px !important; padding-bottom: 90px !important; }
          .sidebar { transform: translateX(-100%); transition: transform .25s ease !important; z-index: 200 !important; }
          .sidebar.open { transform: translateX(0) !important; }
          .sidebar-overlay { display: block !important; }
          .mobile-topbar { display: flex !important; }
          .stats-grid { grid-template-columns: 1fr 1fr 1fr !important; }
          .header-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .page-title { font-size: 20px !important; display: block !important; }
          .page-subtitle { display: block !important; }
          .header-btns { width: 100% !important; }
          .header-btns button { flex: 1 !important; justify-content: center !important; }
        }
        /* ── Mobil ── */
        @media (max-width: 600px) {
          .main-content { padding-top: 76px !important; padding-left: 12px !important; padding-right: 12px !important; padding-bottom: 100px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .col-hide { display: none !important; }
          .doc-grid { grid-template-columns: 1fr auto !important; }
          .header-btns { width: 100% !important; flex-wrap: wrap !important; }
          .header-btns button { flex: 1 !important; justify-content: center !important; min-width: 120px !important; }
          .upload-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 380px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 199; }
        .mobile-topbar { display: none; }
        .bottom-nav { display: none; }
        @media (max-width: 900px) {
          .bottom-nav { display: flex !important; }
        }
      `}</style>

        {/* Kamera-Modal */}
        {cameraOpen && (
            <DocumentScanModal
                onClose={() => setCameraOpen(false)}
                onCapture={(file) => uploadToLocal([file])}
            />
        )}

        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile Top Bar */}
        <div className="mobile-topbar" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 60, background: "#0b2e44", zIndex: 150, alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "none", border: "none", color: "#7ab8d0", fontSize: 22, cursor: "pointer", padding: 4 }}>
            <i className="bi bi-list" />
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <div>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 900, color: "#f0f8ff" }}>Bill</span>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 400, color: "transparent", WebkitTextStroke: "1.2px #fd8f19" }}>Squid</span>
            </div>
            <span style={{ fontSize: 10, color: "#4a8aaa", marginTop: 2 }}>{currentMandant.name}</span>
          </div>
          <button onClick={() => setCameraOpen(true)} style={{ background: "none", border: "none", color: "#fd8f19", fontSize: 22, cursor: "pointer", padding: 4 }}>
            <i className="bi bi-camera" />
          </button>
        </div>

        {/* Sidebar */}
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 240, background: "#0b2e44", display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 200, transition: "transform .25s ease" }}>
          <div style={{ padding: "0 16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ lineHeight: 1 }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, fontWeight: 900, color: "#f0f8ff", letterSpacing: "-0.01em" }}>Bill</span>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, fontWeight: 400, color: "transparent", WebkitTextStroke: "1.2px #fd8f19", letterSpacing: "-0.01em" }}>Squid</span>
              </div>
            </div>
          </div>

          {/* Mandant Switcher */}
          <div style={{ padding: "0 12px 16px", position: "relative" }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#2b5f7a", letterSpacing: ".1em", marginBottom: 7, paddingLeft: 4 }}>MANDANT</div>
            <button onClick={() => setDropdownOpen((v) => !v)}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: dropdownOpen ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", transition: "background .15s" }}>
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
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 12, right: 12, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 8px 28px rgba(0,0,0,.14)", zIndex: 300, animation: "dropDown .16s ease" }}>
                  <div style={{ padding: "10px 12px 6px" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 7 }}>MANDANT WECHSELN</div>
                    <div style={{ position: "relative" }}>
                      <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      <input autoFocus type="text" placeholder="Name oder Nummer…" value={mandantenSearch}
                             onChange={(e) => setMandantenSearch(e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             style={{ width: "100%", padding: "6px 10px 6px 28px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#f9fafb", outline: "none" }} />
                    </div>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "scroll", padding: "3px 0 7px", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
                    {filteredMandanten.length === 0 ? (
                        <div style={{ padding: "14px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>Kein Mandant gefunden</div>
                    ) : filteredMandanten.map((m) => (
                        <button key={m.id} onClick={() => selectMandant(m)}
                                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 12px", background: m.id === currentMandant.id ? "#f0f4f8" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background .12s" }}>
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
              { icon: <i className="bi bi-border-all"></i>, label: "Dashboard" },
              { icon: <i className="bi bi-folder"></i>, label: "Belege", active: true },
              { icon: <i className="bi bi-bar-chart-line"></i>, label: "Auswertungen" },
              { icon: <i className="bi bi-gear"></i>, label: "Einstellungen" },
            ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 7, background: item.active ? "rgba(201,168,76,.12)" : "transparent", color: item.active ? "#fd8f19" : "#7ab8d0", fontSize: 13, fontWeight: item.active ? 600 : 400, cursor: "pointer", marginBottom: 2, borderLeft: item.active ? "2px solid #fd8f19" : "2px solid transparent" }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
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
        <main className="main-content" style={{ marginLeft: isMobile ? 0 : 240, flex: 1, minWidth: 0, padding: isMobile ? "90px 12px 100px" : "30px 32px", animation: "fadeUp .4s ease", display: "flex", justifyContent: "center", background: "#f8f7f4" }}>
          <div style={{ width: "100%", maxWidth: 900 }}>
            <div className="header-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h1 className="page-title" style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: "#0b2e44", fontWeight: 400, marginBottom: 3 }}>Belegverwaltung</h1>
                <p style={{ color: "#6b7280", fontSize: 13 }}>
                  Belege für <span style={{ fontWeight: 600, color: "#18537a" }}>{currentMandant.name}</span>
                </p>
              </div>

              <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => uploadToLocal(e.target.files)} />
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
              {[
                { label: "Belege gesamt", value: stats.total, icon: <i className="bi bi-file-text"></i>, accent: "#18537a" },
                { label: "Analysiert", value: stats.analysiert, icon: <i className="bi bi-check2"></i>, accent: "#16a34a" },
                { label: "Ausstehend", value: stats.ausstehend, icon: <i className="bi bi-hourglass-split"></i>, accent: "#d97706" },
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

          {/* Upload Zone — drei Optionen */}
          <div className="upload-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {/* Drag & Drop */}
            <div onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{ background: dragging ? "#fffbeb" : "#fff", border: `2px dashed ${dragging ? "#fd8f19" : "#d1d5db"}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: uploading ? "default" : "pointer", transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 160 }}>
              {uploading ? (
                <div style={{ width: "100%" }}>
                  <i className="bi bi-arrow-up" style={{ fontSize: 24, color: "#18537a" }} />
                  <p style={{ color: "#374151", fontWeight: 600, margin: "8px 0 10px", fontSize: 13 }}>Hochladen…</p>
                  <div style={{ height: 5, background: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(uploadProgress, 100)}%`, background: "linear-gradient(90deg,#18537a,#fd8f19)", borderRadius: 10, transition: "width .1s linear" }} />
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>{Math.min(Math.round(uploadProgress), 100)} %</p>
                </div>
              ) : (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`bi ${dragging ? "bi-cloud-upload" : "bi-upload"}`} style={{ fontSize: 20, color: dragging ? "#fd8f19" : "#18537a" }} />
                  </div>
                  <p style={{ color: "#0b2e44", fontWeight: 600, fontSize: 13, margin: 0 }}>{dragging ? "Datei hier ablegen" : "Drag & Drop"}</p>
                  <p style={{ color: "#9ca3af", fontSize: 11, margin: 0 }}>PDF, JPG, PNG</p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, padding: "5px 12px", background: "#f3f4f6", borderRadius: 7, fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
                    <i className="bi bi-folder" /> Dateien auswählen
                  </div>
                </>
              )}
            </div>

            {/* Scannen */}
            <div onClick={() => showNotification("Scanner wird geöffnet…", "success")}
              style={{ background: "#fff", border: "2px dashed #d1d5db", borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: "pointer", transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 160 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#18537a"; e.currentTarget.style.background = "#f8fbff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.background = "#fff"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eef6f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-upc-scan" style={{ fontSize: 20, color: "#16a34a" }} />
              </div>
              <p style={{ color: "#0b2e44", fontWeight: 600, fontSize: 13, margin: 0 }}>Beleg scannen</p>
              <p style={{ color: "#9ca3af", fontSize: 11, margin: 0 }}>Scanner oder Dokumenten-App</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, padding: "5px 12px", background: "#f0fdf4", borderRadius: 7, fontSize: 11, color: "#16a34a", fontWeight: 500 }}>
                <i className="bi bi-play-circle" /> Scanner starten
              </div>
            </div>

            {/* Foto */}
            <div onClick={() => showNotification("Kamera wird geöffnet…", "success")}
              style={{ background: "#fff", border: "2px dashed #d1d5db", borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: "pointer", transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 160 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#fd8f19"; e.currentTarget.style.background = "#fffbf5"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.background = "#fff"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-camera" style={{ fontSize: 20, color: "#fd8f19" }} />
              </div>
              <p style={{ color: "#0b2e44", fontWeight: 600, fontSize: 13, margin: 0 }}>Foto aufnehmen</p>
              <p style={{ color: "#9ca3af", fontSize: 11, margin: 0 }}>Kamera oder Smartphone</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, padding: "5px 12px", background: "#fff7ed", borderRadius: 7, fontSize: 11, color: "#fd8f19", fontWeight: 500 }}>
                <i className="bi bi-camera-fill" /> Kamera öffnen
              </div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => simulateUpload(e.target.files)} />

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
                <div key={doc.id}
                  onClick={() => doc.extractedData && setSelectedDoc(doc)}
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
                  <span style={{ fontSize: 11, color: "#374151", background: "#f3f4f6", padding: "3px 7px", borderRadius: 5, fontWeight: 500, display: "inline-block" }}>{doc.category}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{doc.amount}</span>
                  <StatusBadge status={doc.status} />
                  {/* Mini confidence indicator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {conf ? (
                      <>
                        <div style={{ flex: 1, height: 4, background: "#f0ece4", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${conf}%`, background: confColor, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: confColor, minWidth: 24 }}>{conf}%</span>
                      </>
                    ) : <span style={{ fontSize: 10, color: "#d1d5db" }}>—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

        {/* Bottom Navigation (nur mobile) */}
        <nav className="bottom-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "#0b2e44", borderTop: "1px solid rgba(255,255,255,.08)", zIndex: 150, alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
          {[
            { icon: "bi-border-all", label: "Dashboard" },
            { icon: "bi-folder-fill", label: "Belege", active: true },
            { icon: "bi-upc-scan", label: "Scannen", action: () => setCameraOpen(true) },
            { icon: "bi-bar-chart-line", label: "Auswertung" },
          ].map((item) => (
              <button key={item.label}
                      onClick={item.action || undefined}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, color: item.active ? "#fd8f19" : "#7ab8d0", minWidth: 56 }}>
                <i className={`bi ${item.icon}`} style={{ fontSize: 20 }} />
                <span style={{ fontSize: 10, fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
              </button>
          ))}
        </nav>

        {/* Detail Modal */}
        {selectedDoc && (
          <DocDetailModal
            doc={selectedDoc}
            onClose={() => setSelectedDoc(null)}
            onConfirm={(editedData) => handleConfirm(selectedDoc.id, editedData)}
            onDiscard={() => handleDiscard(selectedDoc.id)}
          />
        )}

        {/* Toast-Notification */}
        {notification && (
          <div style={{ position: "fixed", bottom: 24, right: 24, background: notification.type === "error" ? "#fef2f2" : "#f0fdf4", border: `1px solid ${notification.type === "error" ? "#fca5a5" : "#86efac"}`, color: notification.type === "error" ? "#dc2626" : "#16a34a", padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.08)", animation: "slideIn .3s ease", zIndex: 1000, display: "flex", alignItems: "center", gap: 7 }}>
            {notification.type === "error" ? <i className="bi bi-exclamation-triangle-fill" /> : <i className="bi bi-check2" />} {notification.msg}
          </div>
        )}
      </div>
    );
}