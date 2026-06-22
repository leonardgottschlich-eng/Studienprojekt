export const MANDANTEN = [
  { id: 1, name: "Max Kirchner",       nr: "MK-2024-001", typ: "Einzelunternehmen",        initials: "MK", color: "#18537a" },
  { id: 2, name: "Sabine Hoffmann",    nr: "SH-2024-002", typ: "Freiberuflerin",            initials: "SH", color: "#5b3a8a" },
  { id: 3, name: "Baumann GmbH",       nr: "BG-2023-015", typ: "GmbH",                      initials: "BG", color: "#0e6655" },
  { id: 4, name: "Rainer Schulz",      nr: "RS-2024-008", typ: "Gewerbetreibender",         initials: "RS", color: "#7d3c19" },
  { id: 5, name: "TechStart UG",       nr: "TS-2024-022", typ: "UG (haftungsbeschränkt)",  initials: "TS", color: "#18537a" },
  { id: 6, name: "Petra Winkel",       nr: "PW-2023-044", typ: "Freiberuflerin",            initials: "PW", color: "#6b1a5c" },
  { id: 7, name: "Markus Gruber",      nr: "MG-2024-031", typ: "Einzelunternehmen",        initials: "MG", color: "#1a5c3a" },
  { id: 8, name: "Bäckerei Meier OHG", nr: "BM-2022-007", typ: "OHG",                      initials: "BM", color: "#7a4a1a" },
];

export const STATUS_CONFIG = {
  analysiert:     { label: "Analysiert",     color: "#16a34a", bg: "#dcfce7", dot: "#16a34a" },
  ausstehend:     { label: "Ausstehend",     color: "#b45309", bg: "#fef3c7", dot: "#d97706" },
  in_bearbeitung: { label: "In Bearbeitung", color: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
};

export const DOCS_BY_MANDANT = {
  1: [
    { id: 1, name: "Rechnung_Büromaterial_Jan2025.pdf", size: "1.2 MB", type: "pdf", uploadedAt: "15.01.2025", status: "analysiert", category: "Betriebsausgaben", amount: "342,50 €", confidence: 94, extractedData: { aussteller: "Office Depot GmbH", adresse: "Lyoner Str. 15, 60528 Frankfurt", ustIdNr: "DE811207406", datum: "14.01.2025", rechnungsnr: "RE-2025-00441", zahlungsart: "Überweisung", positionen: [{ bezeichnung: "Druckerpapier A4 (5× Ries)", menge: "5", einzelpreis: "28,99 €", betrag: "144,95 €" }, { bezeichnung: "Toner HP LaserJet", menge: "2", einzelpreis: "64,90 €", betrag: "129,80 €" }, { bezeichnung: "Ordner A4 breit (10er Pack)", menge: "1", einzelpreis: "38,50 €", betrag: "38,50 €" }], nettoBetrag: "287,81 €", mwstSatz: "19 %", mwstBetrag: "54,69 €", gesamtBetrag: "342,50 €" } },
    { id: 2, name: "Tankquittung_Mai2026.pdf", size: "485 KB", type: "pdf", uploadedAt: "13.05.2026", status: "analysiert", category: "Fahrtkosten", amount: "72,72 €", confidence: 91, scanPreview: "totalenergies", extractedData: { aussteller: "TotalEnergies Mertert", adresse: "48, Route de Wasserbillig, L-6686 Mertert", ustIdNr: "LU18678765", datum: "01.05.2026", uhrzeit: "13:49:21", rechnungsnr: "0943120093", zahlungsart: "Mastercard (**** 2640)", positionen: [{ bezeichnung: "Eurosuper", menge: "39,45 L", einzelpreis: "1,793 €/L", betrag: "70,73 €" }, { bezeichnung: "Monster Juice Vik. B", menge: "1", einzelpreis: "1,99 €", betrag: "1,99 €" }], nettoBetrag: "62,38 €", mwstSatz: "17 % / 3 %", mwstBetrag: "10,34 €", gesamtBetrag: "72,72 €" } },
    { id: 3, name: "Kontoauszug_Q1_2025.pdf", size: "2.8 MB", type: "pdf", uploadedAt: "01.03.2025", status: "in_bearbeitung", category: "Bankbelege", amount: "—", confidence: 62, extractedData: { aussteller: "Sparkasse Frankfurt", adresse: "Neue Mainzer Str. 47, 60311 Frankfurt", ustIdNr: "—", datum: "28.02.2025", rechnungsnr: "KTOAUSZUG-2025-Q1", zahlungsart: "—", positionen: [{ bezeichnung: "Kontoführungsgebühr Feb.", menge: "1", einzelpreis: "8,90 €", betrag: "8,90 €" }, { bezeichnung: "Lastschrift Miete", menge: "1", einzelpreis: "1.200,00 €", betrag: "1.200,00 €" }], nettoBetrag: "—", mwstSatz: "—", mwstBetrag: "—", gesamtBetrag: "—" } },
    { id: 4, name: "Hotelrechnung_Berlin.pdf", size: "890 KB", type: "pdf", uploadedAt: "18.02.2025", status: "analysiert", category: "Reisekosten", amount: "219,00 €", confidence: 88, extractedData: { aussteller: "Motel One Berlin-Alexanderplatz", adresse: "Grunerstraße 11, 10179 Berlin", ustIdNr: "DE247557709", datum: "17.02.2025", rechnungsnr: "M1-2025-98341", zahlungsart: "Kreditkarte", positionen: [{ bezeichnung: "Doppelzimmer (2 Nächte)", menge: "2", einzelpreis: "89,00 €", betrag: "178,00 €" }, { bezeichnung: "Frühstück", menge: "2", einzelpreis: "12,50 €", betrag: "25,00 €" }, { bezeichnung: "Parken", menge: "2", einzelpreis: "8,00 €", betrag: "16,00 €" }], nettoBetrag: "184,03 €", mwstSatz: "7 % / 19 %", mwstBetrag: "34,97 €", gesamtBetrag: "219,00 €" } },
  ],
  2: [
    { id: 5, name: "Honorarrechnung_Q1.pdf", size: "620 KB", type: "pdf", uploadedAt: "31.03.2025", status: "analysiert", category: "Einnahmen", amount: "4.800,00 €", confidence: 97, extractedData: { aussteller: "Sabine Hoffmann – Freiberufliche Beraterin", adresse: "Musterstraße 12, 80331 München", ustIdNr: "DE334556778", datum: "31.03.2025", rechnungsnr: "SH-2025-003", zahlungsart: "Überweisung", positionen: [{ bezeichnung: "Beratungsleistung März 2025 (40 h)", menge: "40 h", einzelpreis: "120,00 €/h", betrag: "4.800,00 €" }], nettoBetrag: "4.800,00 €", mwstSatz: "0 % (Kleinunternehmen)", mwstBetrag: "0,00 €", gesamtBetrag: "4.800,00 €" } },
    { id: 6, name: "Bürokosten_März.pdf", size: "310 KB", type: "pdf", uploadedAt: "28.03.2025", status: "ausstehend", category: "Betriebsausgaben", amount: "156,00 €", confidence: 73, extractedData: { aussteller: "WeWork GmbH", adresse: "Friesenplatz 4, 50672 Köln", ustIdNr: "DE298771234", datum: "01.03.2025", rechnungsnr: "WW-MAR-2025-0812", zahlungsart: "SEPA-Lastschrift", positionen: [{ bezeichnung: "Hot Desk – März 2025", menge: "1", einzelpreis: "131,09 €", betrag: "131,09 €" }], nettoBetrag: "131,09 €", mwstSatz: "19 %", mwstBetrag: "24,91 €", gesamtBetrag: "156,00 €" } },
  ],
  3: [], 4: [], 5: [], 6: [], 7: [], 8: [],
};
