import { getApiToken } from "../api";
import { lokalFetch } from "../localServer";

/**
 * Originaldatei eines Belegs als Blob – aus dem Backend oder aus dem
 * Mandantenordner des Scan-Servers. fetch statt <img src>, weil beide Server
 * einen Auth-Header verlangen.
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
