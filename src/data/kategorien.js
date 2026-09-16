/**
 * Klassifikationen eines Belegs.
 *
 * Ein Beleg kann mehrere Klassifikationen tragen (1:n) – eine Hotelrechnung
 * ist z. B. gleichzeitig "Reisekosten" und "Bewirtung". Gespeichert wird die
 * Liste im Feld `kategorien`; ältere Belege mit einer einzelnen `category`
 * werden von kategorienVon() weiterhin verstanden.
 */

export const KATEGORIEN = [
  "Betriebsausgaben",
  "Einnahmen",
  "Fahrtkosten",
  "Reisekosten",
  "Bewirtung",
  "Bürobedarf",
  "Telekommunikation",
  "Miete & Nebenkosten",
  "Versicherungen",
  "Bankbelege",
  "Privatanteil",
  "Sonstige Ausgaben",
];

/** Klassifikationen eines Belegs – verträgt alte (category) und neue (kategorien) Form */
export const kategorienVon = (doc) => {
  if (Array.isArray(doc?.kategorien)) return doc.kategorien;
  return doc?.category && doc.category !== "Nicht klassifiziert" ? [doc.category] : [];
};

/**
 * Doppelte und leere Einträge entfernen, Reihenfolge beibehalten.
 * "Nicht klassifiziert" ist nur ein Anzeigetext und wird verworfen – ältere
 * Belege haben ihn teilweise als echten Wert gespeichert.
 */
export const bereinigeKategorien = (liste) =>
    [...new Set(
        (liste ?? [])
            .map((k) => String(k).trim())
            .filter((k) => k && k !== "Nicht klassifiziert")
    )];
