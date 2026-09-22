/**
 * Zugriff auf den lokalen Scan-Server (billsquid_server, Port 3001)
 * über den Vite-Proxy /api.
 *
 * Er verwaltet den Scanner-Eingang und die Bilddateien und verlangt einen
 * eigenen Token. Die Anmeldung passiert bei Bedarf: Fehlt der Token oder
 * lehnt der Server ihn ab, meldet sich die App neu an und wiederholt die
 * Anfrage. Damit funktioniert die App auch dann, wenn der Scan-Server erst
 * nach dem Einloggen gestartet wird.
 */

// Technischer Zugang des Scan-Servers (lokal, keine Mandantendaten)
const ZUGANG = { email: "doerte@kanzlei.de", password: "billsquid123" };

export const lokalerToken = () => sessionStorage.getItem("bs_token") || "";

/**
 * Wer gerade in der App angemeldet ist – ausschließlich als Beschriftung für
 * das Protokoll des Scan-Servers. Der kennt nur seinen technischen Zugang und
 * würde sonst jede Aktion derselben Kennung zuschreiben.
 *
 * Das ist keine Anmeldung: Der Wert ist eine Angabe des Browsers und für
 * Berechtigungen nicht belastbar. Header dürfen nur ASCII enthalten, Umlaute
 * werden deshalb kodiert.
 */
function benutzerKopf() {
  try {
    const user = JSON.parse(sessionStorage.getItem("bs_user") || "null");
    if (!user?.name) return {};
    const text = user.rolle ? `${user.name} (${user.rolle})` : user.name;
    return { "X-BillSquid-Benutzer": encodeURIComponent(text) };
  } catch {
    return {};   // z. B. privater Modus ohne sessionStorage
  }
}

async function holeToken() {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    // Auch hier den angemeldeten Benutzer mitschicken, sonst stünde im
    // Protokoll des Servers bei der Anmeldung nur der technische Zugang
    headers: { "Content-Type": "application/json", ...benutzerKopf() },
    body: JSON.stringify(ZUGANG),
  });
  if (!res.ok) throw new Error("Scan-Server: Anmeldung fehlgeschlagen");
  const { token } = await res.json();
  sessionStorage.setItem("bs_token", token);
  return token;
}

// Beim Start laufen mehrere Anfragen gleichzeitig los (Belege, Scanner-Eingang).
// Sie teilen sich eine Anmeldung, statt jede eine eigene auszulösen.
let anmeldungLaeuft = null;
function anmelden() {
  if (!anmeldungLaeuft) {
    anmeldungLaeuft = holeToken().finally(() => { anmeldungLaeuft = null; });
  }
  return anmeldungLaeuft;
}

/** fetch gegen den Scan-Server – hängt den Token an und meldet sich nötigenfalls neu an */
export async function lokalFetch(pfad, optionen = {}) {
  const senden = (token) =>
      fetch(pfad, {
        // Immer frisch fragen – der Scanner-Eingang ändert sich laufend, eine
        // zwischengespeicherte Antwort würde neue Scans verschlucken
        cache: "no-store",
        ...optionen,
        headers: {
          ...(optionen.headers || {}),
          ...benutzerKopf(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

  const token = lokalerToken();
  const antwort = token ? await senden(token) : null;

  // Kein Token vorhanden oder abgelehnt → einmal neu anmelden und wiederholen
  if (!antwort || antwort.status === 401) {
    return senden(await anmelden());
  }
  return antwort;
}
