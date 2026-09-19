import { useState } from "react";
import { apiFetch, documentToDoc, dateiZuDataUrl, neuerBelegPayload } from "../api";
import { bildZuPdfDatei, alsPdfName } from "../lib/jpegZuPdf";

export function useUpload(currentMandant, setAllDocs, showNotification) {
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Datei → Backend (MySQL): legt ein Dokument mit Platzhalter-Rechnungsdaten an,
  // die echten Werte werden später im Detail-Modal eingetragen und gePATCHt.
  // Das Backend nimmt nur PDF – ein Bild wird deshalb wie ein Handy-Scan in
  // ein PDF verpackt, damit es im Beleg-Dialog angezeigt werden kann.
  const uploadToBackend = async (file) => {
    const istPdf = file.type === "application/pdf";
    const pdf = istPdf ? file : await bildZuPdfDatei(file, alsPdfName(file.name));
    const { data } = await apiFetch("/documents", {
      method: "POST",
      body: neuerBelegPayload({
        mandant: currentMandant,
        dateiName: pdf.name,
        dataUrl: await dateiZuDataUrl(pdf),
      }),
    });
    return documentToDoc(data);
  };

  const uploadToLocal = async (files) => {
    const validFiles = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (!validFiles.length) {
      showNotification("Nur PDF oder Bilddateien erlaubt.", "error");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const uploadedDocs = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress(((i + 1) / validFiles.length) * 100);
      try {
        uploadedDocs.push(await uploadToBackend(file));
      } catch (e) {
        if (e.status === 401) {
          showNotification("Sitzung abgelaufen – bitte neu anmelden.", "error");
          sessionStorage.clear();
          window.location.reload();
          return;
        }
        showNotification(`Upload von ${file.name} fehlgeschlagen: ${e.message}`, "error");
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (uploadedDocs.length > 0) {
      setAllDocs((prev) => ({
        ...prev,
        [currentMandant.id]: [...uploadedDocs, ...(prev[currentMandant.id] || [])],
      }));
      showNotification(`${uploadedDocs.length} Beleg${uploadedDocs.length > 1 ? "e" : ""} gespeichert ✓`);
    }
  };

  return { uploading, uploadProgress, uploadToLocal };
}
