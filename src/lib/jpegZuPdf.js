/**
 * Handy-Scan (JPEG) → PDF.
 *
 * Das Backend nimmt nur PDF an (siehe frontend-api.md), die Kamera liefert aber
 * ein Bild. PDF kann JPEG-Daten unverändert aufnehmen (Filter /DCTDecode) –
 * das Bild wird also nur verpackt, nicht neu komprimiert. Deshalb reicht ein
 * paar Zeilen eigener Code und es braucht keine PDF-Bibliothek.
 *
 * Der Beleg landet mittig auf einer A4-Seite, damit er sich wie die übrigen
 * Belege ansehen und ausdrucken lässt.
 */

const A4   = { breite: 595.28, hoehe: 841.89 }; // DIN A4 in Punkten (72 dpi)
const RAND = 28;                                // ca. 1 cm Seitenrand

const enc = new TextEncoder();

/**
 * Bildmaße aus den JPEG-Kopfdaten lesen.
 * Gesucht ist der SOF-Marker (Start of Frame); davor stehen beliebig viele
 * andere Segmente, die jeweils ihre Länge mitbringen und übersprungen werden.
 */
function jpegMasse(bytes) {
  let i = 2; // führendes FFD8 überspringen
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];

    // Füllbyte sowie Marker ohne Datenteil (SOI, RSTn, TEM)
    if (marker === 0xff) { i++; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }

    const laenge = (bytes[i + 2] << 8) | bytes[i + 3];
    // C0–CF sind SOF-Marker – bis auf C4 (Huffman), C8 (JPG) und CC (Arithmetik)
    const istSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (istSof) {
      return { hoehe: (bytes[i + 5] << 8) | bytes[i + 6], breite: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    if (laenge < 2) break; // unplausibel – lieber abbrechen als endlos laufen
    i += 2 + laenge;
  }
  return null;
}

/** JPEG-Bytes → fertiges PDF als Uint8Array */
export function jpegZuPdfBytes(jpeg) {
  const masse = jpegMasse(jpeg);
  if (!masse?.breite || !masse?.hoehe) throw new Error("JPEG konnte nicht gelesen werden.");

  // Bild in den Satzspiegel einpassen, Seitenverhältnis bleibt erhalten
  const skala  = Math.min((A4.breite - 2 * RAND) / masse.breite, (A4.hoehe - 2 * RAND) / masse.hoehe);
  const breite = masse.breite * skala;
  const hoehe  = masse.hoehe  * skala;
  const x = (A4.breite - breite) / 2;
  const y = (A4.hoehe  - hoehe)  / 2;

  const rnd = (n) => n.toFixed(2);
  // Grafikzustand sichern, Bild auf seine Fläche skalieren, zeichnen, zurück
  const inhalt = `q ${rnd(breite)} 0 0 ${rnd(hoehe)} ${rnd(x)} ${rnd(y)} cm /Bild Do Q\n`;

  // Die Querverweistabelle am Ende braucht die Byte-Position jedes Objekts,
  // deshalb wird beim Zusammenbauen mitgezählt.
  const teile = [];
  let position = 0;
  const schreibe = (daten) => {
    const bytes = typeof daten === "string" ? enc.encode(daten) : daten;
    teile.push(bytes);
    position += bytes.length;
  };

  const offsets = [];
  const objekt = (nr, koerper, strom = null) => {
    offsets[nr] = position;
    schreibe(`${nr} 0 obj\n${koerper}\n`);
    if (strom) {
      schreibe("stream\n");
      schreibe(strom);
      schreibe("\nendstream\n");
    }
    schreibe("endobj\n");
  };

  schreibe("%PDF-1.4\n");
  objekt(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objekt(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objekt(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${rnd(A4.breite)} ${rnd(A4.hoehe)}]`
      + ` /Resources << /XObject << /Bild 5 0 R >> >> /Contents 4 0 R >>`);
  objekt(4, `<< /Length ${enc.encode(inhalt).length} >>`, inhalt);
  objekt(5, `<< /Type /XObject /Subtype /Image /Width ${masse.breite} /Height ${masse.hoehe}`
      + ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);

  const xrefPos = position;
  schreibe("xref\n0 6\n0000000000 65535 f \n");
  for (let nr = 1; nr <= 5; nr++) schreibe(`${String(offsets[nr]).padStart(10, "0")} 00000 n \n`);
  schreibe(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const pdf = new Uint8Array(position);
  let ziel = 0;
  for (const teil of teile) { pdf.set(teil, ziel); ziel += teil.length; }
  return pdf;
}

/** "data:image/jpeg;base64,…" → Uint8Array */
export function dataUrlZuBytes(dataUrl) {
  const roh   = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

/** JPEG-Data-URL der Kamera → PDF-Datei für den Upload */
export function scanZuPdfDatei(dataUrl, dateiName) {
  return new File([jpegZuPdfBytes(dataUrlZuBytes(dataUrl))], dateiName, { type: "application/pdf" });
}
