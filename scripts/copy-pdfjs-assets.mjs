/**
 * Kopiert die Hilfsdateien von pdf.js nach public/pdfjs/.
 *
 * pdf.js lagert seit Version 5 die Bilddecoder (JBIG2, JPEG 2000) und die
 * Farbprofile in WebAssembly-Dateien aus und lädt sie erst bei Bedarf nach.
 * Fehlen sie, bleibt eine gescannte Seite beim Zeichnen einfach weiß – ohne
 * Fehlermeldung. Dasselbe gilt für die Standardschriften bei PDFs, die keine
 * Schrift mitliefern.
 *
 * Läuft automatisch nach "npm install" (siehe package.json) und kann jederzeit
 * mit "npm run pdfjs:assets" wiederholt werden. public/pdfjs/ ist erzeugt und
 * steht deshalb in .gitignore.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const quelle = path.join(wurzel, "node_modules", "pdfjs-dist");
const ziel   = path.join(wurzel, "public", "pdfjs");

// cmaps bleiben außen vor: die braucht nur, wer PDFs mit ostasiatischen
// Zeichensätzen anzeigt, und sie sind gut 1 MB groß.
const ORDNER = ["wasm", "standard_fonts", "iccs"];

if (!fs.existsSync(quelle)) {
  console.warn("pdfjs-dist nicht gefunden – nichts zu kopieren.");
  process.exit(0);
}

for (const ordner of ORDNER) {
  const von = path.join(quelle, ordner);
  if (!fs.existsSync(von)) continue;
  fs.rmSync(path.join(ziel, ordner), { recursive: true, force: true });
  fs.cpSync(von, path.join(ziel, ordner), { recursive: true });
  console.log(`pdf.js: ${ordner} → public/pdfjs/${ordner}`);
}
