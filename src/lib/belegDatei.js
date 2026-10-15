import { getApiToken } from "../api";
import { lokalFetch } from "../localServer";

/**
 * Originaldatei eines Belegs als Blob, aus dem Backend oder aus dem
 * Mandantenordner des Scan-Servers. Geholt wird sie per fetch statt über
 * <img src>, weil beide Server einen Auth-Header verlangen.
 */
export async function ladeBelegDatei(doc, mandant) {
  const res = doc.backendDoc
      ? await fetch(`/backend/api/documents/${doc.apiId}/pdf`, {
          headers: { Authorization: `Bearer ${getApiToken()}` },
        })
      : await lokalFetch(`/api/belege/file?mandantNr=${encodeURIComponent(mandant.nr)}&mandantName=${encodeURIComponent(mandant.name)}&name=${encodeURIComponent(doc.name)}`);
  if (!res.ok) throw new Error(`Datei nicht abrufbar (HTTP ${res.status})`);
  return res.blob();
}

/**
 * Inhalt als Datei speichern.
 *
 * Ein direkter Link auf die Server-Adresse geht nicht: Beide Server verlangen
 * einen Auth-Header, den ein <a href> nicht mitschickt. Deshalb wird der Inhalt
 * geholt und über eine kurzlebige Objekt-URL an den Browser gereicht. Dabei
 * dient auch gleich der Name aus der App als Dateiname.
 */
export function speichereBlob(blob, dateiName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Erst freigeben, wenn der Browser den Download begonnen hat
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** Einzelnen Beleg als Datei speichern */
export async function ladeBelegHerunter(doc, mandant) {
  speichereBlob(await ladeBelegDatei(doc, mandant), doc.name);
}
