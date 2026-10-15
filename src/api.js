/**
 * Zugriff auf das BillSquid-Backend (CodeIgniter und MySQL).
 * Die Aufrufe laufen über den Vite-Proxy, der /backend an
 * https://app.billsquid.com weiterreicht. Dadurch sind keine
 * CORS-Einstellungen nötig.
 *
 * Endpunkte und Datenmodelle stehen in der API-Dokumentation des Backends.
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

/** Liest eine Datei als Data-URL ("data:application/pdf;base64,…"), so nimmt sie das Backend an */
export const dateiZuDataUrl = (datei) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(datei);
    });

/**
 * Payload für einen frisch eingegangenen Beleg aus Upload oder Scanner-Eingang.
 * Das Backend verlangt Rechnungsfelder als Pflichtangaben, die ein roher Scan
 * noch nicht hat. Deshalb stehen dort Platzhalter. Die echten Werte trägt man
 * später in der Detailansicht nach, sie gehen dann per PATCH an dieselbe Stelle.
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

/* Mandanten anlegen */

/**
 * Bildet aus Vor- und Nachname einen Anmeldenamen, etwa "emma.schmidt".
 * Das Backend verlangt einen, die Oberfläche fragt aber nur den Namen ab.
 * Umlaute werden umschrieben, andere Sonderzeichen fallen weg, und laut
 * Datenbankschema sind höchstens 30 Zeichen erlaubt.
 */
export const alsAnmeldename = (vorname, nachname) =>
    `${vorname}.${nachname}`
        .toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9.]+/g, ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.|\.$/g, "")
        .slice(0, 30);

/**
 * Legt einen neuen Mandanten an. Legt ihn eine Steuerberater:in an, wird er
 * ihr direkt zugewiesen, damit er in der eigenen Liste auftaucht.
 *
 *   POST /api/users
 *   { username, first_name, last_name, email, password, password_confirm, group }
 *   Antwort 201 { status, data: { id, … } }
 *
 * Alle Felder sind Pflicht, group ist "client" oder "tax_advisor".
 *
 * Beide Aufrufe sind laut API-Dokumentation Administratoren vorbehalten.
 * Eine Steuerberater:in bekommt hier also 403, solange das Backend Anlegen
 * und Zuweisen für ihre Rolle nicht freigibt.
 */
export async function mandantAnlegen({ vorname, nachname, email, passwort }, beraterId = null) {
  const { data } = await apiFetch("/users", {
    method: "POST",
    body: {
      username: alsAnmeldename(vorname, nachname),
      first_name: vorname.trim(),
      last_name: nachname.trim(),
      email: email.trim(),
      password: passwort,
      password_confirm: passwort,
      group: "client",
    },
  });

  if (!beraterId || !data?.id) return { mandant: data, zuweisungOffen: false };

  try {
    await apiFetch("/advisor-clients", {
      method: "POST",
      body: { advisor_user_id: beraterId, client_user_id: data.id, status: "active" },
    });
    return { mandant: data, zuweisungOffen: false };
  } catch {
    // Entweder hat das Backend schon zugewiesen oder es fehlt das Recht dazu.
    // Der Mandant ist angelegt, ob er sichtbar wird, zeigt das Neuladen.
    return { mandant: data, zuweisungOffen: true };
  }
}

/* Belege exportieren */

/** Dateiname aus dem Content-Disposition-Kopf, z. B. attachment; filename="x.zip" */
const dateiNameAusKopf = (kopf) => {
  const treffer = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(kopf || "");
  return treffer ? decodeURIComponent(treffer[1]) : null;
};

/**
 * Belege eines Mandanten als ZIP-Archiv holen.
 *
 * GET /api/documents/export?client_user_id=…&from_date=…&to_date=…
 * Gefiltert wird ausschließlich nach Belegdatum (einschließlich beider
 * Grenzen). Status, Suche und Klassifikation kennt der Endpunkt nicht.
 *
 * Die Antwort ist eine ZIP-Datei und kein JSON, deshalb gibt es hier einen
 * eigenen fetch statt apiFetch. Fehlerantworten kommen als JSON.
 */
export async function exportiereBelegeAlsZip({ mandantId, von, bis }) {
  const params = new URLSearchParams({
    client_user_id: String(mandantId),
    from_date: von,
    to_date: bis,
  });

  const res = await fetch(`/backend/api/documents/export?${params}`, {
    headers: { Accept: "application/zip", Authorization: `Bearer ${getApiToken()}` },
  });

  if (!res.ok) {
    const daten = await res.json().catch(() => ({}));
    throw Object.assign(new Error(daten.message || `HTTP ${res.status}`), { status: res.status, data: daten });
  }

  return {
    blob: await res.blob(),
    dateiName: dateiNameAusKopf(res.headers.get("content-disposition"))
        || `belege-${mandantId}-${von}-bis-${bis}.zip`,
  };
}

/** Lesbare Meldung aus einer Backend-Antwort (422 liefert Feldfehler mit) */
export const fehlerText = (e) => {
  const felder = e?.data?.errors ? Object.values(e.data.errors).join(" ") : "";
  return felder || e?.data?.message || e?.message || "Unbekannter Fehler";
};

/* Umrechnung zwischen Backend und Oberfläche */

// Das Backend kennt pending, processing und analyzed. paid und corrected
// kommen in Beispieldaten des Backends vor und gelten als erledigt.
const STATUS_ZUM_BACKEND = { ausstehend: "pending", in_bearbeitung: "processing", analysiert: "analyzed" };
const STATUS_VOM_BACKEND = {
  pending: "ausstehend", processing: "in_bearbeitung", analyzed: "analysiert",
  paid: "analysiert", corrected: "analysiert",
};

const FARBEN = ["#18537a", "#5b3a8a", "#0e6655", "#7d3c19", "#6b1a5c", "#1a5c3a", "#7a4a1a"];

// Macht aus einem Backend-User der Gruppe "client" einen Mandanten für Sidebar und Belegliste
export const userToMandant = (u, i) => ({
  id: u.id,
  name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username,
  nr: `KD-${String(u.id).padStart(3, "0")}`,
  typ: "Mandant",
  initials: `${(u.first_name || u.username || "?")[0]}${(u.last_name || "?")[0]}`.toUpperCase(),
  color: FARBEN[i % FARBEN.length],
});

// Liest "1.234,56 €" als 1234.56
const parseBetrag = (str) => {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

// Schreibt 119 oder "119.00" als "119,00 €"
const formatBetrag = (v) =>
    v == null || v === "" ? "" : Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const deDatum  = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "");
// Auch einstellige Tage und Monate annehmen ("5.8.2026"), sonst würde die
// Eingabe beim Speichern stillschweigend unter den Tisch fallen
const isoDatum = (de) => {
  const t = String(de || "").trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return t ? `${t[3]}-${t[2].padStart(2, "0")}-${t[1].padStart(2, "0")}` : undefined;
};

/**
 * Macht aus einem Backend-Dokument einen Beleg für Liste und Detailansicht.
 * Felder, die das Backend-Schema nicht kennt, etwa Positionen, Kategorien
 * oder der angerechnete Betrag, liegen als JSON im notes-Feld.
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
    size: d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : "-",
    type: "pdf",
    uploadedAt: deDatum(d.created_at),
    status: STATUS_VOM_BACKEND[d.status] ?? "ausstehend",
    // Mehrere Klassifikationen je Beleg. Steht nur ein einzelnes category-Feld
    // in den Notizen, wird es ebenfalls gelesen.
    kategorien: bereinigeKategorien(extra.kategorien ?? (extra.category ? [extra.category] : [])),
    amount: extra.angerechnetBetrag ?? (formatBetrag(d.total_amount) || "---"),
    // Sicherheit der KI-Analyse in Prozent, nur bei analysierten Belegen
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

// Baut aus den Belegdaten, ob von Hand bestätigt oder von der KI, den PATCH-Payload fürs Backend
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
      category: liste[0] ?? null,   // für Auswertungen, die ein Einzelfeld erwarten
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
