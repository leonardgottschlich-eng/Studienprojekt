/**
 * Kennzahlen für die Startseiten (Dashboard) von Kanzlei und Mandant.
 *
 * Das Backend kennt drei Belegzustände (siehe STATUS_CONFIG in mockData.js):
 *
 *   ausstehend     – hochgeladen, noch nicht analysiert  → "zu erfassen"
 *   in_bearbeitung – Analyse läuft / wartet auf Prüfung  → "zu prüfen"
 *   analysiert     – bestätigt und gespeichert           → "erledigt"
 *
 * Ein eigenes Feld "geprüft" gibt es im Backend nicht – bestätigt wird ein
 * Beleg über den Statuswechsel auf "analysiert" (handleConfirm in App.jsx).
 * "Unerledigt" ist deshalb alles, was noch nicht "analysiert" ist.
 */

export const IST_UNERLEDIGT = (doc) => doc.status !== "analysiert";

export function belegStats(docs = []) {
  const ausstehend    = docs.filter((d) => d.status === "ausstehend").length;
  const inBearbeitung = docs.filter((d) => d.status === "in_bearbeitung").length;
  const analysiert    = docs.filter((d) => d.status === "analysiert").length;

  return {
    total: docs.length,
    ausstehend,
    inBearbeitung,
    analysiert,
    unerledigt: ausstehend + inBearbeitung,
  };
}

/** "15.01.2025" → sortierbare Zahl (20250115). Unbekanntes Format ans Ende. */
export function datumWert(de) {
  const treffer = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(de || "").trim());
  return treffer ? Number(`${treffer[3]}${treffer[2]}${treffer[1]}`) : 0;
}

/** Belege: neueste zuerst. */
export const nachDatum = (a, b) => datumWert(b.uploadedAt) - datumWert(a.uploadedAt);

/**
 * Mandanten für die Kanzlei-Startseite: wer die meisten unerledigten Belege
 * hat, steht oben. Bei Gleichstand entscheidet die Gesamtzahl, dann der Name.
 */
export function mandantenNachAufwand(mandanten, allDocs) {
  return mandanten
    .map((m) => ({ mandant: m, stats: belegStats(allDocs[m.id] || []) }))
    .sort((a, b) =>
      b.stats.unerledigt - a.stats.unerledigt ||
      b.stats.total - a.stats.total ||
      a.mandant.name.localeCompare(b.mandant.name, "de")
    );
}
