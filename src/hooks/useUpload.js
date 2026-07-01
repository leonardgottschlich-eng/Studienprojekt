import { useState } from "react";

// Token aus sessionStorage holen
const getToken = () => sessionStorage.getItem("bs_token") || "";

export function useUpload(currentMandant, setAllDocs, showNotification) {
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
        if (response.status === 401) {
          showNotification("Sitzung abgelaufen – bitte neu anmelden.", "error");
          sessionStorage.clear();
          window.location.reload();
          return;
        }
        if (!response.ok) throw new Error("Server Fehler");
        const result = await response.json();
        if (result.success) {
          uploadedDocs.push({
            id: Date.now() + i,
            name: file.name,
            size: result.size ? `${(result.size / 1024).toFixed(0)} KB` : `${(file.size / 1024).toFixed(0)} KB`,
            type: file.type === "application/pdf" ? "pdf" : "image",
            uploadedAt: new Date().toLocaleDateString("de-DE"),
            status: "ausstehend",
            category: "Nicht klassifiziert",
            amount: "—",
          });
        }
      } catch {
        showNotification("Server nicht erreichbar. Bitte 'node server.js' starten.", "error");
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