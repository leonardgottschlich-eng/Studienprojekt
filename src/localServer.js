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

async function holeToken() {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
        ...optionen,
        headers: {
          ...(optionen.headers || {}),
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
