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

/* Belege, die über Google Drive hereingekommen sind.
   Für die Vorführung gelten genau diese als der vorbereitete Beleg – die
   simulierte KI erkennt sie und sonst nichts (siehe lib/kiAnalyse.js).
   Im localStorage, damit ein Neuladen zwischen Zuordnen und Analyse nichts
   verliert. */
const KI_BELEGE = "bs_ki_belege";
const MERKE_MAX = 20;   // ältere fallen raus, die Liste soll nicht wachsen

export const ladeKiBelege = () => {
  try { return JSON.parse(localStorage.getItem(KI_BELEGE) || "[]"); } catch { return []; }
};

export const merkeKiBeleg = (id) => {
  try {
    const liste = [...new Set([...ladeKiBelege(), id])].slice(-MERKE_MAX);
    localStorage.setItem(KI_BELEGE, JSON.stringify(liste));
  } catch { /* privater Modus – dann gilt der Beleg eben als nicht vorbereitet */ }
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
