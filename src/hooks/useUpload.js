import { useState } from "react";
import { apiFetch, documentToDoc } from "../api";

// Token des lokalen Scan-Servers aus sessionStorage holen
const getToken = () => sessionStorage.getItem("bs_token") || "";

// Datei → data:application/pdf;base64,… (das Backend akzeptiert die volle Data-URL)
const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

export function useUpload(currentMandant, setAllDocs, showNotification) {
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // PDF → Backend (MySQL): legt ein Dokument mit Platzhalter-Rechnungsdaten an,
  // die echten Werte werden später im Detail-Modal eingetragen und gePATCHt.
  const uploadPdfToBackend = async (file) => {
    const { data } = await apiFetch("/documents", {
      method: "POST",
      body: {
        client_user_id: currentMandant.id,
        invoice_number: `UPL-${Date.now()}`,
        issuer_name: "Unbekannt",
        recipient_name: currentMandant.name,
        invoice_date: new Date().toISOString().slice(0, 10),
        currency: "EUR",
        total_amount: "0.00",
        status: "pending",
        original_file_name: file.name,
        pdf_base64: await fileToDataUrl(file),
      },
    });
    return documentToDoc(data);
  };

  // Bild → lokaler Scan-Server (das Backend nimmt nur PDFs an)
  const uploadImageToLocal = async (file, i) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(
        `/api/upload?mandantNr=${encodeURIComponent(currentMandant.nr)}&mandantName=${encodeURIComponent(currentMandant.name)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        }
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
      category: "Nicht klassifiziert",
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
