/**
 * Simulierte KI-Schnittstelle.
 *
 * Liefert die Belegdaten so, wie es später ein echter KI-Dienst tun soll.
 * Statt eines Modells steckt dahinter das vorbereitete Ergebnis aus
 * data/kiDemoBelege.js – für die Präsentation gilt der zuletzt hochgeladene
 * Beleg als der vorbereitete (siehe runKiAnalysis in App.jsx). Dadurch ist es
 * egal, ob der Scan als Bild oder PDF und mit oder ohne Texterkennung kommt.
 *
 * Für den Austausch gegen eine echte KI muss nur analysiereBeleg ersetzt
 * werden – sie bekäme dann die Datei des Belegs und würde sie auswerten.
 */

import { KI_DEMO_BELEG } from "../data/kiDemoBelege";

// Eine echte Analyse dauert einige Sekunden – so wirkt die Vorführung echt
const DAUER_MS = 2500;

/** @returns {Promise<{ extractedData, kategorien, confidence }>} */
export async function analysiereBeleg() {
  await new Promise((r) => setTimeout(r, DAUER_MS));
  return {
    // Kopie, damit spätere Änderungen am Beleg die Vorlage nicht verändern
    extractedData: structuredClone(KI_DEMO_BELEG.extractedData),
    kategorien: [...KI_DEMO_BELEG.kategorien],
    confidence: KI_DEMO_BELEG.confidence,
  };
}
