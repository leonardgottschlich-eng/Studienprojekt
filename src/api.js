/**
 * Zugriff auf das BillSquid-Backend (CodeIgniter + MySQL).
 * Läuft über den Vite-Proxy (/backend → https://app.billsquid.com),
 * dadurch sind keine CORS-Einstellungen nötig.
 *
 * Endpunkte und Datenmodelle: siehe frontend-api.md
 */

import { bereinigeKategorien } from "./data/kategorien";

export const getApiToken = () => sessionStorage.getItem("bs_api_token") || "";

export async function apiFetch(path, { method = "GET", body, token = getApiToken() } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`/backend/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.message || `HTTP ${res.status}`), { status: res.status, data });
  }
  return data;
}

/** Datei oder Blob → "data:application/pdf;base64,…" (das Backend nimmt die volle Data-URL) */
export const dateiZuDataUrl = (datei) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(datei);
    });

/**
 * Payload für einen frisch eingegangenen Beleg (Upload oder Scanner-Eingang).
 * Das Backend verlangt Rechnungsfelder als Pflichtangaben, ein roher Scan hat
 * die noch nicht – daher Platzhalter. Die echten Werte trägt man später im
 * Detail-Modal nach, sie gehen dann per PATCH an dieselbe Stelle.
 */
export const neuerBelegPayload = ({ mandant, dateiName, dataUrl }) => ({
  client_user_id: mandant.id,
  invoice_number: `UPL-${Date.now()}`,
  issuer_name: "Unbekannt",
  recipient_name: mandant.name,
  invoice_date: new Date().toISOString().slice(0, 10),
  currency: "EUR",
  total_amount: "0.00",
  status: "pending",
  original_file_name: dateiName,
  pdf_base64: dataUrl,
});

/* ── Mapping Backend ↔ Frontend ─────────────────────────────────── */

// Das Backend kennt pending / processing / analyzed; paid und corrected
// kommen in Beispieldaten des Backend-Teams vor und gelten als erledigt.
const STATUS_ZUM_BACKEND = { ausstehend: "pending", in_bearbeitung: "processing", analysiert: "analyzed" };
const STATUS_VOM_BACKEND = {
  pending: "ausstehend", processing: "in_bearbeitung", analyzed: "analysiert",
  paid: "analysiert", corrected: "analysiert",
};

const FARBEN = ["#18537a", "#5b3a8a", "#0e6655", "#7d3c19", "#6b1a5c", "#1a5c3a", "#7a4a1a"];

// Backend-User (Gruppe "client") → Mandant für Sidebar & Belegliste
export const userToMandant = (u, i) => ({
  id: u.id,
  name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username,
  nr: `KD-${String(u.id).padStart(3, "0")}`,
  typ: "Mandant",
  initials: `${(u.first_name || u.username || "?")[0]}${(u.last_name || "?")[0]}`.toUpperCase(),
  color: FARBEN[i % FARBEN.length],
});

// "1.234,56 €" → 1234.56
const parseBetrag = (str) => {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

// 119 / "119.00" → "119,00 €"
const formatBetrag = (v) =>
    v == null || v === "" ? "" : Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const deDatum  = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "");
const isoDatum = (de)  => (/^\d{2}\.\d{2}\.\d{4}$/.test(de || "") ? de.split(".").reverse().join("-") : undefined);

/**
 * Backend-Dokument → Beleg für die Liste/das Detail-Modal.
 * Felder, die das Backend-Schema nicht kennt (Positionen, Kategorie,
 * angerechneter Betrag …), liegen als JSON im notes-Feld.
 */
export function documentToDoc(d) {
  let extra = {};
  try { extra = JSON.parse(d.notes) || {}; } catch { /* notes ist Freitext */ }
  if (typeof extra !== "object" || Array.isArray(extra)) extra = {};

  return {
    id: `api_${d.id}`,
    apiId: d.id,
    backendDoc: true,
    name: d.original_file_name || d.file_name,
    size: d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : "—",
    type: "pdf",
    uploadedAt: deDatum(d.created_at),
    status: STATUS_VOM_BACKEND[d.status] ?? "ausstehend",
    // Mehrere Klassifikationen je Beleg; Belege aus der Zeit mit nur einer
    // Kategorie werden weiterhin gelesen
    kategorien: bereinigeKategorien(extra.kategorien ?? (extra.category ? [extra.category] : [])),
    amount: extra.angerechnetBetrag ?? (formatBetrag(d.total_amount) || "---"),
    // Sicherheit der KI-Analyse in Prozent – nur bei analysierten Belegen
    confidence: extra.confidence ?? undefined,
    extractedData: {
      aussteller: d.issuer_name === "Unbekannt" ? "" : d.issuer_name || "",
      adresse: extra.adresse || "",
      ustIdNr: d.issuer_tax_id || "",
      datum: deDatum(d.invoice_date),
      uhrzeit: extra.uhrzeit || "",
      rechnungsnr: d.invoice_number?.startsWith("UPL-") ? "" : d.invoice_number || "",
      zahlungsart: extra.zahlungsart || "",
      positionen: extra.positionen ?? [],
      nettoBetrag: formatBetrag(d.subtotal),
      mwstSatz: extra.mwstSatz || "",
      mwstBetrag: formatBetrag(d.tax_amount),
      gesamtBetrag: formatBetrag(d.total_amount),
      angerechnetBetrag: extra.angerechnetBetrag,
    },
  };
}

// Belegdaten (bestätigt im Detail-Modal oder von der KI) → PATCH-Payload fürs Backend
export function updatePayload(editedData, kategorien = [], { status = "analysiert", confidence } = {}) {
  const liste = bereinigeKategorien(kategorien);
  return {
    status: STATUS_ZUM_BACKEND[status] ?? status,
    invoice_number: editedData.rechnungsnr || undefined,
    issuer_name: editedData.aussteller || undefined,
    issuer_tax_id: editedData.ustIdNr || undefined,
    invoice_date: isoDatum(editedData.datum),
    subtotal: parseBetrag(editedData.nettoBetrag).toFixed(2),
    tax_amount: parseBetrag(editedData.mwstBetrag).toFixed(2),
    total_amount: parseBetrag(editedData.gesamtBetrag).toFixed(2),
    notes: JSON.stringify({
      kategorien: liste,
      category: liste[0] ?? null,   // für ältere Auswertungen, die ein Einzelfeld erwarten
      positionen: editedData.positionen ?? [],
      angerechnetBetrag: editedData.angerechnetBetrag,
      adresse: editedData.adresse || "",
      zahlungsart: editedData.zahlungsart || "",
      mwstSatz: editedData.mwstSatz || "",
      uhrzeit: editedData.uhrzeit || "",
      confidence,
    }),
  };
}
