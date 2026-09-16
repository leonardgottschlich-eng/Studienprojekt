import { useState } from "react";
import { apiFetch, documentToDoc, dateiZuDataUrl, neuerBelegPayload } from "../api";
import { lokalFetch } from "../localServer";

export function useUpload(currentMandant, setAllDocs, showNotification) {
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // PDF → Backend (MySQL): legt ein Dokument mit Platzhalter-Rechnungsdaten an,
  // die echten Werte werden später im Detail-Modal eingetragen und gePATCHt.
  const uploadPdfToBackend = async (file) => {
    const { data } = await apiFetch("/documents", {
      method: "POST",
      body: neuerBelegPayload({
        mandant: currentMandant,
        dateiName: file.name,
        dataUrl: await dateiZuDataUrl(file),
      }),
    });
    return documentToDoc(data);
  };

  // Bild → lokaler Scan-Server (das Backend nimmt nur PDFs an)
  const uploadImageToLocal = async (file, i) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await lokalFetch(
        `/api/upload?mandantNr=${encodeURIComponent(currentMandant.nr)}&mandantName=${encodeURIComponent(currentMandant.name)}`,
        { method: "POST", body: formData }
    );
    if (!response.ok) throw new Error("Lokaler Server nicht erreichbar");
    const result = await response.json();
    if (!result.success) throw new Error("Upload fehlgeschlagen");
    return {
      id: Date.now() + i,
      name: file.name,
      size: result.size ? `${(result.size / 1024).toFixed(0)} KB` : `${(file.size / 1024).toFixed(0)} KB`,
      type: "image",
      uploadedAt: new Date().toLocaleDateString("de-DE"),
      status: "ausstehend",
      kategorien: [],
      amount: "—",
      serverFile: true,
    };
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
        uploadedDocs.push(
            file.type === "application/pdf"
                ? await uploadPdfToBackend(file)
                : await uploadImageToLocal(file, i)
        );
      } catch (e) {
        if (e.status === 401) {
          showNotification("Sitzung abgelaufen – bitte neu anmelden.", "error");
          sessionStorage.clear();
          window.location.reload();
          return;
        }
        showNotification(
            file.type === "application/pdf"
                ? `Upload ins Backend fehlgeschlagen: ${e.message}`
                : "Lokaler Server nicht erreichbar. Bitte 'node server.js' starten.",
            "error"
        );
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
