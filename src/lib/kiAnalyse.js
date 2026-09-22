/**
 * Simulierte KI-Schnittstelle.
 *
 * Liefert die Belegdaten so, wie es später ein echter KI-Dienst tun soll.
 * Statt eines Modells steckt dahinter das vorbereitete Ergebnis aus
 * data/kiDemoBelege.js.
 *
 * Als vorbereitet gilt für die Vorführung jeder Beleg, der über Google Drive
 * hereingekommen ist – die Drive-Strecke ist damit der Weg, auf dem die
 * "Erkennung" gelingt. Alles andere gilt als nicht erkannt und bleibt
 * unverändert, damit nicht jeder beliebige Beleg dieselben Daten bekommt.
 *
 * Für den Austausch gegen eine echte KI muss nur analysiereBeleg ersetzt
 * werden – sie bekäme dann die Datei des Belegs und würde sie auswerten.
 */

import { KI_DEMO_BELEG } from "../data/kiDemoBelege";

// Eine echte Analyse dauert einige Sekunden – so wirkt die Vorführung echt
const DAUER_MS = 2500;

/**
 * @param {boolean} istVorbereitet Kam der Beleg über Google Drive herein?
 * @returns {Promise<
 *   { erkannt: true, extractedData, kategorien, confidence } |
 *   { erkannt: false, grund: "nicht_vorbereitet" }
 * >}
 */
export async function analysiereBeleg(istVorbereitet) {
  await new Promise((r) => setTimeout(r, DAUER_MS));

  if (!istVorbereitet) return { erkannt: false, grund: "nicht_vorbereitet" };

  return {
    erkannt: true,
    // Kopie, damit spätere Änderungen am Beleg die Vorlage nicht verändern
    extractedData: structuredClone(KI_DEMO_BELEG.extractedData),
    kategorien: [...KI_DEMO_BELEG.kategorien],
    confidence: KI_DEMO_BELEG.confidence,
  };
}
