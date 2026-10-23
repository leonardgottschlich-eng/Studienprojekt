/**
 * Kennzahlen für die Startseiten von Kanzlei und Mandant.
 *
 * Das Backend kennt drei Belegzustände (siehe data/status.js):
 *
 *   ausstehend      hochgeladen, noch nicht analysiert   zählt als "zu erfassen"
 *   in_bearbeitung  analysiert, wartet auf Prüfung       zählt als "zu prüfen"
 *   analysiert      bestätigt und gespeichert            zählt als "erledigt"
 *
 * Ein eigenes Feld "geprüft" gibt es im Backend nicht. Bestätigt wird ein
 * Beleg über den Statuswechsel auf "analysiert" (handleConfirm in App.jsx).
 * Unerledigt ist deshalb alles, was noch nicht "analysiert" ist.
 */

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

/**
 * Mandanten für die Kanzlei-Startseite: Wer die meisten unerledigten Belege
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
