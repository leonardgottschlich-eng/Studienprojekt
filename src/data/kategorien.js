/**
 * Klassifikationen eines Belegs.
 *
 * Ein Beleg kann mehrere Klassifikationen tragen (1:n). Eine Hotelrechnung
 * ist zum Beispiel gleichzeitig "Reisekosten" und "Bewirtung". Gespeichert
 * wird die Liste im Feld `kategorien`. Belege mit einem einzelnen Feld
 * `category` versteht kategorienVon() ebenfalls.
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

/** Klassifikationen eines Belegs, aus dem Feld kategorien oder ersatzweise category */
export const kategorienVon = (doc) => {
  if (Array.isArray(doc?.kategorien)) return doc.kategorien;
  return doc?.category && doc.category !== "Nicht klassifiziert" ? [doc.category] : [];
};

/**
 * Doppelte und leere Einträge entfernen, Reihenfolge beibehalten.
 * "Nicht klassifiziert" ist nur ein Anzeigetext und wird verworfen, falls er
 * als Wert gespeichert wurde.
 */
export const bereinigeKategorien = (liste) =>
    [...new Set(
        (liste ?? [])
            .map((k) => String(k).trim())
            .filter((k) => k && k !== "Nicht klassifiziert")
    )];
