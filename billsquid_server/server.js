/**
 * BillSquid Scan-Server (Port 3001)
 *
 * Benutzer, Mandanten und Belegdaten liegen im Backend (CodeIgniter und
 * MySQL). Dieser Server kümmert sich nur um die Dateien vor Ort:
 *   Scanner-Eingang aus Scan-to-Folder, Handy-Scans und Google Drive
 *   Belege in Belege/<Nr>_<Name> ablegen, ausliefern, umbenennen und löschen
 *
 * Der eigene Login (JWT) ist nur ein technischer Zugang für das Frontend.
 * Die Benutzeranmeldung läuft über das Backend.
 *
 * Installation: npm install
 * Start:        node server.js   (oder npm start)
 */

const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const fs       = require("fs");
const path     = require("path");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const chokidar = require("chokidar");
const gdrive   = require("./drive");

const app  = express();
const PORT = 3001;

// Schlüssel, mit dem die Tokens signiert werden
const JWT_SECRET = "billsquid-geheimer-schluessel-2026";

// Technischer Zugang für das Frontend. Das ist kein echtes Benutzerkonto,
// die Anmeldung der App läuft über das Backend. billsquid/src/localServer.js
// meldet sich damit automatisch an, damit nur die eigene App an den
// Scanner-Eingang kommt. Das Passwort ist mit bcrypt gehasht.
const USERS = [
  {
    id: 1,
    name:     "Dörte Ludwig",
    email:    "doerte@kanzlei.de",
    rolle:    "Steuerberaterin",
    passwort: "$2b$10$VO1Lg6jE/AFXDqjzqVhz9umOsZRfzL3M75vK83ULyd1nO8mtG9isS",
  },
];

// Die Belege liegen neben dem Projekt und nicht im Repository, dort haben
// Mandantendaten nichts verloren. Über BELEGE_PFAD lässt sich der Ort ändern.
const BASE_PATH = process.env.BELEGE_PFAD || path.join(__dirname, "..", "..", "Belege");
fs.mkdirSync(BASE_PATH, { recursive: true });

// Aus dem Eingang verworfene Scans, lokal wie in Google Drive. Sie werden
// verschoben statt gelöscht. Bei steuerlich relevanten Belegen wäre
// endgültiges Löschen per Klick zu riskant, und in Drive darf das Dienstkonto
// fremde Dateien ohnehin nur verschieben.
const VERWORFEN_NAME = "_Verworfen";

// Ordnernamen von Zeichen befreien, mit denen man aus dem Ordner ausbrechen könnte
const sanitizeSegment = (s) => String(s).replace(/[\\/:*?"<>|.]/g, "").trim() || "Unbekannt";
const folderNameFor = (nr, name) => `${sanitizeSegment(nr)}_${sanitizeSegment(name).replace(/\s+/g, "_")}`;

// Zielpfad, der keine bestehende Datei überschreibt
const uniquePath = (dir, fileName) => {
  const target = path.join(dir, fileName);
  if (!fs.existsSync(target)) return target;
  const ext  = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return path.join(dir, `${base}_${Date.now()}${ext}`);
};

// Wunschnamen bereinigen: keine Pfade, keine Sonderzeichen, die Endung des
// Originals bleibt erhalten
const bereinigterName = (newName, ext) =>
    path.basename(String(newName || "").trim())
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(new RegExp(`\\${ext}$`, "i"), "")
        .trim();

app.use(cors());
app.use(express.json());

// Nichts zwischenspeichern. Scanner-Eingang und Belegordner ändern sich
// ständig, und ohne diesen Kopf dürfen Browser eine Liste nach eigenem
// Ermessen wiederverwenden. Neue Scans tauchten dann erst nach einem
// Neuladen der Seite auf.
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Prüft den Token des Frontends
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Nicht angemeldet." });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token ungültig" });
  }
};

/**
 * Wer die Aktion ausgelöst hat, fürs Protokoll.
 *
 * Angemeldet ist am Scan-Server immer nur der technische Zugang des Frontends.
 * Wer wirklich in der App arbeitet, weiß nur der Browser. Er schickt den Namen
 * im Kopf X-BillSquid-Benutzer mit (siehe src/localServer.js). Das ist eine
 * Beschriftung und kein Nachweis, für Berechtigungen taugt der Wert nicht.
 */
const wer = (req) => {
  const roh = req.headers["x-billsquid-benutzer"];
  if (roh) {
    try { return decodeURIComponent(roh); } catch { return String(roh); }
  }
  return "unbekannt";   // Aufruf von außerhalb der App
};

/* Anmeldung */

// POST /auth/login: technischen Zugang anmelden
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-Mail und Passwort erforderlich." });
  }

  const user = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "E-Mail oder Passwort falsch." });
  }

  const pwKorrekt = await bcrypt.compare(password, user.passwort);
  if (!pwKorrekt) {
    return res.status(401).json({ error: "E-Mail oder Passwort falsch." });
  }

  const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, rolle: user.rolle },
      JWT_SECRET
  );

  // Technisch meldet sich immer dieselbe Kennung an. Interessant ist, wer
  // gerade in der App arbeitet.
  const benutzer = wer(req);
  console.log(benutzer === "unbekannt" ? "Frontend angemeldet" : `Angemeldet: ${benutzer}`);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, rolle: user.rolle },
  });
});

// POST /auth/logout: nur fürs Protokoll, den Token verwirft das Frontend selbst
app.post("/auth/logout", requireAuth, (req, res) => {
  console.log(`Frontend abgemeldet (${wer(req)})`);
  res.json({ success: true });
});

/* Belege im Mandantenordner */

// GET /belege?mandantNr=…&mandantName=…: Dateien im Mandantenordner auflisten
app.get("/belege", requireAuth, (req, res) => {
  const mandantNr   = req.query.mandantNr   || "Unbekannt";
  const mandantName = req.query.mandantName || "Unbekannt";
  const targetDir   = path.join(BASE_PATH, folderNameFor(mandantNr, mandantName));

  if (!fs.existsSync(targetDir)) return res.json({ files: [] });

  try {
    const files = fs.readdirSync(targetDir)
        .filter((f) => /\.(pdf|jpe?g|png|webp)$/i.test(f))
        .map((f) => {
          const stat = fs.statSync(path.join(targetDir, f));
          return { name: f, size: `${(stat.size / 1024).toFixed(0)} KB`, createdAt: stat.birthtime.toLocaleDateString("de-DE") };
        });
    res.json({ files });
  } catch (e) {
    res.status(500).json({ files: [], error: e.message });
  }
});

// GET /belege/file?mandantNr=…&mandantName=…&name=…: Beleg zur Ansicht ausliefern
app.get("/belege/file", requireAuth, (req, res) => {
  const fileName  = path.basename(String(req.query.name || ""));
  const targetDir = path.join(BASE_PATH, folderNameFor(req.query.mandantNr || "Unbekannt", req.query.mandantName || "Unbekannt"));
  const filePath  = path.join(targetDir, fileName);
  if (!fileName || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }
  res.sendFile(filePath);
});

// POST /belege/rename: Beleg im Mandantenordner umbenennen.
// Die Endung bleibt erhalten, damit aus einem PDF kein namenloser Anhang wird.
app.post("/belege/rename", requireAuth, (req, res) => {
  const { mandantNr, mandantName, fileName, newName } = req.body || {};
  const safeName = path.basename(String(fileName || ""));
  const ordner   = path.join(BASE_PATH, folderNameFor(mandantNr || "Unbekannt", mandantName || "Unbekannt"));
  const quelle   = path.join(ordner, safeName);

  if (!safeName || !fs.existsSync(quelle)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }

  const ext    = path.extname(safeName);
  const wunsch = bereinigterName(newName, ext);
  if (!wunsch) return res.status(400).json({ error: "Kein gültiger Name." });

  try {
    const ziel = uniquePath(ordner, wunsch + ext);
    fs.renameSync(quelle, ziel);
    console.log(`Umbenannt von ${wer(req)}: ${safeName} in ${path.basename(ziel)}`);
    res.json({ success: true, fileName: path.basename(ziel) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /belege/file?mandantNr=…&mandantName=…&name=…: Beleg endgültig löschen
app.delete("/belege/file", requireAuth, (req, res) => {
  const fileName = path.basename(String(req.query.name || ""));
  const filePath = path.join(BASE_PATH, folderNameFor(req.query.mandantNr || "Unbekannt", req.query.mandantName || "Unbekannt"), fileName);
  if (!fileName || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }
  try {
    fs.unlinkSync(filePath);
    console.log(`Beleg gelöscht von ${wer(req)}: ${filePath}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* Google Drive
   Scans, die über die Drive-Desktop-Synchronisierung im freigegebenen Ordner
   landen, erscheinen im selben Scanner-Eingang wie die lokalen Dateien. */

// GET /drive/inbox: noch nicht zugeordnete Scans aus Drive
app.get("/drive/inbox", requireAuth, async (req, res) => {
  if (!gdrive.aktiv()) return res.json({ files: [] });
  try {
    res.json({ files: await gdrive.listeEingang() });
  } catch (e) {
    res.status(500).json({ files: [], error: e.message });
  }
});

// GET /drive/file?id=…: Datei zur Vorschau oder zum Hochladen ausliefern
app.get("/drive/file", requireAuth, async (req, res) => {
  try {
    const { name, mimeType, daten } = await gdrive.dateiInhalt(String(req.query.id || ""));
    res.setHeader("Content-Type", mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(name)}"`);
    res.send(daten);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// POST /drive/ordner: _Unzugeordnet und die Mandantenordner anlegen
app.post("/drive/ordner", requireAuth, async (req, res) => {
  try {
    const namen = (req.body?.mandanten || [])
        .filter((m) => m?.nr && m?.name)
        .map((m) => folderNameFor(m.nr, m.name));
    res.json({ ordner: await gdrive.ordnerAnlegen(namen) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /drive/assign: Scan benennen und in den Mandantenordner verschieben
app.post("/drive/assign", requireAuth, async (req, res) => {
  const { fileId, mandantNr, mandantName, newName } = req.body || {};
  if (!fileId || !mandantNr || !mandantName) {
    return res.status(400).json({ error: "fileId, mandantNr und mandantName erforderlich." });
  }
  try {
    const ergebnis = await gdrive.zuordnen({
      fileId,
      ordnerName: folderNameFor(mandantNr, mandantName),
      neuerName: newName || null,
    });
    console.log(`Drive-Zuordnung von ${wer(req)}: ${ergebnis.name} nach ${ergebnis.ordner}`);
    res.json({ success: true, ...ergebnis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /drive/verwerfen: Scan aus dem Drive-Eingang nach _Verworfen schieben
app.post("/drive/verwerfen", requireAuth, async (req, res) => {
  const { fileId } = req.body || {};
  if (!fileId) return res.status(400).json({ error: "fileId erforderlich." });
  try {
    const ergebnis = await gdrive.zuordnen({ fileId, ordnerName: VERWORFEN_NAME, neuerName: null });
    console.log(`Drive-Scan verworfen von ${wer(req)}: ${ergebnis.name}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /status: Lebenszeichen für die Einstellungsseite
app.get("/status", (req, res) => {
  res.json({ running: true, basePath: BASE_PATH });
});

/* Scanner-Eingang
   Der Belegscanner legt Dateien per Scan-to-Folder in _Scanner-Eingang ab.
   Von dort wandern sie nach _Unzugeordnet und warten, bis sie im Frontend
   benannt und einem Mandanten zugeordnet werden. */

const SCAN_INBOX     = path.join(BASE_PATH, "_Scanner-Eingang");
const UNASSIGNED_DIR = path.join(BASE_PATH, "_Unzugeordnet");
fs.mkdirSync(SCAN_INBOX,     { recursive: true });
fs.mkdirSync(UNASSIGNED_DIR, { recursive: true });

// Dateiname im Eingang und der Mandant, für den der Scan gedacht ist.
// Das Frontend wählt diesen Mandanten im Eingang vor.
const SCAN_VORSCHLAEGE = new Map();

const processScan = (filePath) => {
  const fileName = path.basename(filePath);
  if (fileName.startsWith(".") || fileName.startsWith("~")) return; // temporäre Dateien
  try {
    fs.renameSync(filePath, uniquePath(UNASSIGNED_DIR, fileName));
    console.log(`Scan im Eingang: ${fileName}`);
  } catch (e) {
    console.error(`Scan konnte nicht verschoben werden: ${e.message}`);
  }
};

// awaitWriteFinish: erst verarbeiten, wenn der Scanner die Datei fertig
// geschrieben hat und ihre Größe 1,5 Sekunden stabil ist. Beim Start werden
// auch Dateien verarbeitet, die schon im Eingang liegen.
chokidar
    .watch(SCAN_INBOX, { awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 } })
    .on("add", processScan);

// POST /scan/upload: Datei direkt in den Scanner-Eingang legen.
// Damit landet ein Handy-Scan dort, wo auch der Belegscanner ablegt. Er wird
// erst benannt und einem Mandanten zugeordnet, bevor er als Beleg weitergeht.
const eingangUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(UNASSIGNED_DIR, { recursive: true });
      cb(null, UNASSIGNED_DIR);
    },
    // Gleichnamige Scans dürfen sich nicht gegenseitig überschreiben
    filename: (req, file, cb) => cb(null, path.basename(uniquePath(UNASSIGNED_DIR, path.basename(file.originalname)))),
  }),
});

app.post("/scan/upload", requireAuth, eingangUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei empfangen." });

  // Wer den Scan macht, weiß schon, zu wem er gehört. Der Mandant wird deshalb
  // als Vorschlag gemerkt und ist im Eingang vorausgewählt.
  const { mandantNr, mandantName } = req.query;
  if (mandantNr && mandantName) {
    SCAN_VORSCHLAEGE.set(req.file.filename, { nr: String(mandantNr), name: String(mandantName) });
  }

  console.log(`Scan im Eingang von ${wer(req)}: ${req.file.filename}`
      + (mandantName ? ` (für ${mandantName})` : ""));
  res.json({ success: true, fileName: req.file.filename, size: req.file.size });
});

// GET /scan/inbox: unzugeordnete Scans auflisten.
// Mit ?mandantNr=… nur die Scans, die für diesen Mandanten gedacht sind. So
// bekommt ein angemeldeter Mandant die Scans der anderen gar nicht erst zu
// sehen. Die Kanzlei fragt ohne Filter und erhält den ganzen Eingang.
app.get("/scan/inbox", requireAuth, (req, res) => {
  const nurFuer = req.query.mandantNr ? String(req.query.mandantNr) : null;
  try {
    const files = fs.readdirSync(UNASSIGNED_DIR)
        .filter((f) => /\.(pdf|jpe?g|png|webp)$/i.test(f))
        .filter((f) => !nurFuer || SCAN_VORSCHLAEGE.get(f)?.nr === nurFuer)
        .map((f) => {
          const stat = fs.statSync(path.join(UNASSIGNED_DIR, f));
          return {
            name: f, size: `${(stat.size / 1024).toFixed(0)} KB`,
            createdAt: stat.birthtime.toLocaleDateString("de-DE"),
            vorschlag: SCAN_VORSCHLAEGE.get(f) ?? null,
          };
        });
    res.json({ files });
  } catch (e) {
    res.status(500).json({ files: [], error: e.message });
  }
});

// GET /scan/file?name=…: unzugeordneten Scan zur Vorschau ausliefern
app.get("/scan/file", requireAuth, (req, res) => {
  const fileName = path.basename(String(req.query.name || ""));
  const filePath = path.join(UNASSIGNED_DIR, fileName);
  if (!fileName || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }
  res.sendFile(filePath);
});

// POST /scan/assign: Scan einem Mandanten zuordnen. Ein optionales newName
// benennt die Datei dabei um, die Endung bleibt erhalten.
app.post("/scan/assign", requireAuth, (req, res) => {
  const { fileName, mandantNr, mandantName, newName } = req.body || {};
  const name     = String(mandantName || "").trim();
  const safeName = path.basename(String(fileName || ""));
  const src      = path.join(UNASSIGNED_DIR, safeName);

  if (!mandantNr || !name) return res.status(400).json({ error: "Unbekannter Mandant." });
  if (!safeName || !fs.existsSync(src)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }

  const ext        = path.extname(safeName);
  const wunsch     = bereinigterName(newName, ext);
  const targetName = wunsch ? wunsch + ext : safeName;

  const targetDir = path.join(BASE_PATH, folderNameFor(mandantNr, name));
  fs.mkdirSync(targetDir, { recursive: true });
  try {
    fs.renameSync(src, uniquePath(targetDir, targetName));
    SCAN_VORSCHLAEGE.delete(safeName);
    console.log(`Zugeordnet von ${wer(req)}: ${safeName}`
        + (targetName !== safeName ? ` (umbenannt in ${targetName})` : "")
        + ` an ${name} (${mandantNr})`);
    res.json({ success: true, fileName: targetName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /scan/verwerfen: Scan aus dem lokalen Eingang nach Belege/_Verworfen schieben
app.post("/scan/verwerfen", requireAuth, (req, res) => {
  const safeName = path.basename(String(req.body?.fileName || ""));
  const src      = path.join(UNASSIGNED_DIR, safeName);
  if (!safeName || !fs.existsSync(src)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }

  const zielOrdner = path.join(BASE_PATH, VERWORFEN_NAME);
  try {
    fs.mkdirSync(zielOrdner, { recursive: true });
    fs.renameSync(src, uniquePath(zielOrdner, safeName));
    SCAN_VORSCHLAEGE.delete(safeName);
    console.log(`Scan verworfen von ${wer(req)}: ${safeName}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nBillSquid Scan-Server läuft auf http://localhost:${PORT}`);
  console.log(`Belege:          ${BASE_PATH}`);
  console.log(`Scanner-Eingang: ${SCAN_INBOX}`);
  console.log(`Google Drive:    ${gdrive.aktiv() ? "aktiv" : "inaktiv (keine service-account.json)"}\n`);

  console.log(`Die Anmeldung der App läuft über das Backend, nicht über diesen Server.`);
  console.log(`Demo-Benutzer (Passwort für alle: Password123!):`);
  console.log(`   emma.schmidt@example.com   Mandantin`);
  console.log(`   noah.weber@example.com     Mandant`);
  console.log(`   mia.fischer@example.com    Mandantin`);
  console.log(`   advisor@example.com        Steuerberater`);
  console.log(`   admin@example.com          Admin\n`);

  console.log(`Dieser Server hat keinen eigenen Personen-Login. Die App meldet sich`);
  console.log(`selbst an und nennt dabei den gerade angemeldeten Benutzer.\n`);
});
