/**
 * Persönliche Einstellungen der App.
 * Liegen im localStorage, gelten also pro Browser und überleben das Abmelden.
 */

const SCHLUESSEL = "bs_einstellungen";

export const STANDARD_EINSTELLUNGEN = {
  autoAktualisieren: true,   // Belegliste und Scanner-Eingang selbsttätig neu laden
  intervallSekunden: 10,     // Takt der Aktualisierung
  scannerEingangAnzeigen: true,
  mandantMerken: true,       // zuletzt gewählten Mandanten beim Start wiederherstellen
};

export function ladeEinstellungen() {
  try {
    return { ...STANDARD_EINSTELLUNGEN, ...JSON.parse(localStorage.getItem(SCHLUESSEL) || "{}") };
  } catch {
    return { ...STANDARD_EINSTELLUNGEN };
  }
}

export function speichereEinstellungen(einstellungen) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(einstellungen));
  } catch { /* z. B. privater Modus – Einstellungen gelten dann nur für diese Sitzung */ }
}

/* Zuletzt geöffnete Seite – im sessionStorage, also pro Browser-Tab.
   Dadurch bleibt ein Neuladen auf derselben Seite, während ein zweiter Tab
   unabhängig davon woanders stehen kann. Beim Abmelden wird sie verworfen. */
const SEITE = "bs_seite";

export const ladeLetzteSeite = () => {
  try { return sessionStorage.getItem(SEITE); } catch { return null; }
};
export const merkeSeite = (seite) => {
  try { sessionStorage.setItem(SEITE, seite); } catch { /* ignorieren */ }
};

/* Zuletzt gewählter Mandant */
export const ladeLetztenMandanten = () => {
  const wert = localStorage.getItem("bs_letzter_mandant");
  return wert ? Number(wert) : null;
};
export const merkeMandanten = (id) => {
  try { localStorage.setItem("bs_letzter_mandant", String(id)); } catch { /* ignorieren */ }
};

/** Rollen aus den Backend-Gruppen ableiten */
export const istAdmin       = (user) => !!user?.groups?.includes("admin");
export const istSteuerberater = (user) => !!user?.groups?.includes("tax_advisor");
