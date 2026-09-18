/**
 * Simulierte KI-Schnittstelle.
 *
 * Nimmt die Originaldatei eines Belegs entgegen und liefert die Belegdaten
 * so, wie es später ein echter KI-Dienst tun soll. Statt eines Modells steckt
 * dahinter ein Abgleich mit hinterlegten Belegen (data/kiDemoBelege.js):
 * Der Text des PDFs wird ausgelesen und nach deren Merkmalen durchsucht.
 *
 * Für den Austausch gegen eine echte KI muss nur analysiereBeleg ersetzt
 * werden – Aufruf und Rückgabeform bleiben gleich.
 */

import { pdfText } from "./pdfjs";
import { KI_DEMO_BELEGE } from "../data/kiDemoBelege";

// Eine echte Analyse dauert einige Sekunden – so wirkt die Vorführung echt
const MINDESTDAUER_MS = 2500;

// Vergleich unabhängig von Leerzeichen, Satzzeichen und Groß-/Kleinschreibung
const normalisiere = (text) => String(text).toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, "");

/**
 * @returns {Promise<
 *   { erkannt: true, extractedData, kategorien, confidence } |
 *   { erkannt: false, grund: "kein_pdf" | "kein_text" | "unbekannt" }
 * >}
 */
export async function analysiereBeleg(blob) {
  const warten = new Promise((r) => setTimeout(r, MINDESTDAUER_MS));
  const [ergebnis] = await Promise.all([vergleiche(blob), warten]);
  return ergebnis;
}

async function vergleiche(blob) {
  let text;
  try {
    text = normalisiere(await pdfText(blob));
  } catch {
    return { erkannt: false, grund: "kein_pdf" };
  }
  if (!text) return { erkannt: false, grund: "kein_text" };

  for (const vorlage of KI_DEMO_BELEGE) {
    const treffer = vorlage.merkmale.filter((m) => text.includes(normalisiere(m))).length;
    if (treffer >= vorlage.mindestTreffer) {
      return {
        erkannt: true,
        // Kopie, damit spätere Änderungen am Beleg die Vorlage nicht verändern
        extractedData: structuredClone(vorlage.extractedData),
        kategorien: [...vorlage.kategorien],
        // Je mehr Merkmale gefunden, desto sicherer die "KI"
        confidence: Math.round(80 + 18 * (treffer / vorlage.merkmale.length)),
      };
    }
  }
  return { erkannt: false, grund: "unbekannt" };
}
