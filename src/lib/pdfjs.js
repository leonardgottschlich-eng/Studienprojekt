/**
 * pdf.js laden und ein PDF öffnen – gemeinsam genutzt von der Belegvorschau
 * (Seiten zeichnen) und der KI-Analyse (Text auslesen).
 */

export async function oeffnePdf(blob) {
  // Bewusst der "legacy"-Build: Er ist für ältere Browser übersetzt und läuft
  // auch in Safari-Versionen, in denen der normale Build aussteigt.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Der Worker wird von Vite als eigene Datei ausgeliefert
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  // Die drei Pfade sind wichtig: pdf.js lädt Bilddecoder (JBIG2, JPEG 2000),
  // Farbprofile und Standardschriften erst bei Bedarf nach. Ohne sie bleibt
  // eine gescannte Seite stillschweigend weiß. Die Dateien liegen unter
  // public/pdfjs (siehe scripts/copy-pdfjs-assets.mjs).
  //
  // Aufgeräumt wird über den Ladevorgang – das Dokument selbst hat kein
  // destroy() (mehr).
  return pdfjs.getDocument({
    data: await blob.arrayBuffer(),
    wasmUrl: "/pdfjs/wasm/",
    iccUrl: "/pdfjs/iccs/",
    standardFontDataUrl: "/pdfjs/standard_fonts/",
  });
}

/**
 * Text aller Seiten eines PDFs. Ein Scan ohne Texterkennung (OCR) besteht nur
 * aus einem Bild – dann ist das Ergebnis leer.
 */
export async function pdfText(blob, maxSeiten = 5) {
  const ladevorgang = await oeffnePdf(blob);
  try {
    const datei = await ladevorgang.promise;
    const teile = [];
    for (let nr = 1; nr <= Math.min(datei.numPages, maxSeiten); nr++) {
      const inhalt = await (await datei.getPage(nr)).getTextContent();
      teile.push(inhalt.items.map((item) => item.str).join(" "));
    }
    return teile.join("\n");
  } finally {
    try { await ladevorgang.destroy(); } catch { /* nicht weiter schlimm */ }
  }
}
