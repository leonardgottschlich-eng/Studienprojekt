/**
 * Die drei Zustände eines Belegs und wie sie angezeigt werden.
 *
 * ausstehend:     hochgeladen, die KI hat ihn noch nicht ausgelesen
 * in_bearbeitung: von der KI ausgelesen, wartet auf Prüfung durch die Kanzlei
 * analysiert:     geprüft und bestätigt
 */
export const STATUS_CONFIG = {
  analysiert:     { label: "Analysiert", color: "#16a34a", bg: "#dcfce7", dot: "#16a34a" },
  ausstehend:     { label: "Ausstehend", color: "#b45309", bg: "#fef3c7", dot: "#d97706" },
  in_bearbeitung: { label: "Zu prüfen",  color: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
};
