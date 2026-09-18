/**
 * BillSquid – Lokaler Scan-Server (Port 3001)
 *
 * Arbeitsteilung: Benutzer, Mandanten und Belegdaten liegen im Backend
 * (CodeIgniter + MySQL, Endpunkte siehe frontend-api.md). Dieser Server
 * kümmert sich nur um die Dateien vor Ort:
 *   - Scanner-Eingang (Scan-to-Folder und Google Drive) mit Mandanten-Erkennung
 *     im PDF-Text
 *   - Belege in Belege/<Nr>_<Name> ablegen, ausliefern und löschen
 *
 * Der eigene Login (JWT) ist nur ein technischer Zugang für das Frontend –
 * die Benutzeranmeldung läuft über das Backend.
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
const { PDFParse } = require("pdf-parse");
const gdrive   = require("./drive");

const app  = express();
const PORT = 3001;

// ── Sicherheits-Schlüssel ─────────────────────────────────────────
const JWT_SECRET = "billsquid-geheimer-schluessel-2026";

// ── Technischer Zugang für das Frontend ──────────────────────────
// Keine echten Benutzerkonten: Die Anmeldung der App läuft über das Backend.
// Diese Kennung nutzt billsquid/src/localServer.js automatisch, damit nur die
// eigene App an den Scanner-Eingang kommt.
// Passwörter sind gehasht mit bcrypt (nie Klartext speichern!)
// Passwort für beide Kennungen: "billsquid123"
const USERS = [
  {
    id: 1,
    name:     "Dörte Ludwig",
    email:    "doerte@kanzlei.de",
    rolle:    "Steuerberaterin",
    // bcrypt-Hash von "billsquid123" – in Produktion individuell setzen
    passwort: "$2b$10$VO1Lg6jE/AFXDqjzqVhz9umOsZRfzL3M75vK83ULyd1nO8mtG9isS",
  },
  {
    id: 2,
    name:     "Max Mustermann",
    email:    "max@kanzlei.de",
    rolle:    "Sachbearbeiter",
    passwort: "$2b$10$VO1Lg6jE/AFXDqjzqVhz9umOsZRfzL3M75vK83ULyd1nO8mtG9isS",
  },
];

// ── Mandanten für die Erkennung im PDF ────────────────────────────
// Dient nur dem Vorschlag im Scanner-Eingang. Im Betrieb kommen die Mandanten
// aus der Backend-Datenbank (Nummern KD-001, KD-002 …); /scan/assign bekommt
// Nummer und Name deshalb vom Frontend mitgeschickt und ist auf diese Liste
// nicht angewiesen.
const MANDANTEN = [
  { nr: "MK-2024-001", name: "Max Kirchner" },
  { nr: "SH-2024-002", name: "Sabine Hoffmann" },
  { nr: "BG-2023-015", name: "Baumann GmbH" },
  { nr: "RS-2024-008", name: "Rainer Schulz" },
  { nr: "TS-2024-022", name: "TechStart UG" },
  { nr: "PW-2023-044", name: "Petra Winkel" },
  { nr: "MG-2024-031", name: "Markus Gruber" },
  { nr: "BM-2022-007", name: "Bäckerei Meier OHG" },
];

// ── Basis-Setup ───────────────────────────────────────────────────
// Die Belege liegen neben dem Projekt, nicht im Repository – dort haben
// Mandantendaten nichts verloren. Über BELEGE_PFAD umstellbar.
const BASE_PATH = process.env.BELEGE_PFAD || path.join(__dirname, "..", "..", "Belege");
fs.mkdirSync(BASE_PATH, { recursive: true });

// Ordnernamen von pfad-gefährlichen Zeichen befreien (kein ../-Ausbruch)
const sanitizeSegment = (s) => String(s).replace(/[\\/:*?"<>|.]/g, "").trim() || "Unbekannt";
const folderNameFor = (nr, name) => `${sanitizeSegment(nr)}_${sanitizeSegment(name).replace(/\s+/g, "_")}`;

app.use(cors());
app.use(express.json());

// ── Middleware: Token prüfen ──────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════
// AUTH ENDPUNKTE
// ═══════════════════════════════════════════════════════════════════

// POST /auth/login – Anmelden
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

  console.log(`Login: ${user.name} (${user.email})`);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, rolle: user.rolle },
  });
});

// GET /auth/me – aktuellen Benutzer abrufen
app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/logout – Token-Invalidierung (Frontend löscht Token selbst)
app.post("/auth/logout", requireAuth, (req, res) => {
  console.log(`👋 Logout: ${req.user.name}`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// BELEG ENDPUNKTE (geschützt mit requireAuth)
// ═══════════════════════════════════════════════════════════════════

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mandantNr   = req.query.mandantNr   || "Unbekannt";
    const mandantName = req.query.mandantName || "Unbekannt";
    const targetDir   = path.join(BASE_PATH, folderNameFor(mandantNr, mandantName));
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

app.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  console.log(`📄 Upload von ${req.user.name}: ${req.file.path}`);
  res.json({ success: true, fileName: req.file.filename, path: req.file.path, size: req.file.size });
});

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

// GET /belege/file?mandantNr=…&mandantName=…&name=… – Beleg zur Ansicht ausliefern
app.get("/belege/file", requireAuth, (req, res) => {
  const fileName  = path.basename(String(req.query.name || ""));
  const targetDir = path.join(BASE_PATH, folderNameFor(req.query.mandantNr || "Unbekannt", req.query.mandantName || "Unbekannt"));
  const filePath  = path.join(targetDir, fileName);
  if (!fileName || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }
  res.sendFile(filePath);
});

// POST /belege/rename – Beleg im Mandantenordner umbenennen.
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
  const wunsch = path.basename(String(newName || "").trim())
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(new RegExp(`\\${ext}$`, "i"), "")
      .trim();
  if (!wunsch) return res.status(400).json({ error: "Kein gültiger Name." });

  try {
    const ziel = uniquePath(ordner, wunsch + ext);
    fs.renameSync(quelle, ziel);
    console.log(`✏️ Umbenannt von ${req.user.name}: ${safeName} → ${path.basename(ziel)}`);
    res.json({ success: true, fileName: path.basename(ziel) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /belege/file?mandantNr=…&mandantName=…&name=… – Beleg endgültig löschen
app.delete("/belege/file", requireAuth, (req, res) => {
  const fileName = path.basename(String(req.query.name || ""));
  const filePath = path.join(BASE_PATH, folderNameFor(req.query.mandantNr || "Unbekannt", req.query.mandantName || "Unbekannt"), fileName);
  if (!fileName || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }
  try {
    fs.unlinkSync(filePath);
    console.log(`🗑️ Beleg gelöscht von ${req.user.name}: ${filePath}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GOOGLE DRIVE
// Scans, die per Drive-Desktop-Synchronisierung im freigegebenen Ordner
// landen, erscheinen im selben Scanner-Eingang wie die lokalen Dateien.
// ═══════════════════════════════════════════════════════════════════

app.get("/drive/status", requireAuth, async (req, res) => {
  res.json(await gdrive.status());
});

// GET /drive/inbox – noch nicht zugeordnete Scans aus Drive
app.get("/drive/inbox", requireAuth, async (req, res) => {
  if (!gdrive.aktiv()) return res.json({ files: [] });
  try {
    res.json({ files: await gdrive.listeEingang() });
  } catch (e) {
    res.status(500).json({ files: [], error: e.message });
  }
});

// GET /drive/file?id=… – Datei zur Vorschau bzw. zum Hochladen ausliefern
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

// POST /drive/ordner – _Unzugeordnet und die Mandantenordner anlegen
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

// POST /drive/assign – Scan benennen und in den Mandantenordner verschieben
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
    console.log(`📁 Drive-Zuordnung von ${req.user.name}: ${ergebnis.name} → ${ergebnis.ordner}`);
    res.json({ success: true, ...ergebnis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/status", (req, res) => {
  res.json({ running: true, basePath: BASE_PATH });
});

// ═══════════════════════════════════════════════════════════════════
// SCANNER-EINGANG
// Der Belegscanner legt Dateien (Scan-to-Folder) in _Scanner-Eingang ab.
// Der Server liest den PDF-Text und sucht darin nach Mandantennummer
// oder -name → automatische Zuordnung in den Mandantenordner.
// Ohne Treffer (oder bei Bild-PDFs ohne Textebene) → _Unzugeordnet,
// dort erfolgt die Zuordnung manuell über das Frontend.
// ═══════════════════════════════════════════════════════════════════

const SCAN_INBOX     = path.join(BASE_PATH, "_Scanner-Eingang");
const UNASSIGNED_DIR = path.join(BASE_PATH, "_Unzugeordnet");
fs.mkdirSync(SCAN_INBOX,     { recursive: true });
fs.mkdirSync(UNASSIGNED_DIR, { recursive: true });

// true  = Scans mit erkanntem Mandanten werden sofort einsortiert (altes Verhalten)
// false = alle Scans warten im Eingang, bis sie im Frontend benannt und
//         zugeordnet wurden; ein erkannter Mandant wird nur als Vorschlag gemerkt
const AUTO_ZUORDNUNG = false;

// Dateiname im Eingang → aus dem PDF erkannter Mandant (Vorschlag fürs Frontend)
const SCAN_VORSCHLAEGE = new Map();

// Zielpfad, der keine bestehende Datei überschreibt
const uniquePath = (dir, fileName) => {
  const target = path.join(dir, fileName);
  if (!fs.existsSync(target)) return target;
  const ext  = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return path.join(dir, `${base}_${Date.now()}${ext}`);
};

// PDF-Text extrahieren und nach Mandantennummer bzw. -name durchsuchen
const resolveMandantFromPdf = async (filePath) => {
  let parser = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(filePath)) });
    const { text } = await parser.getText();
    const haystack = (text || "").toLowerCase().replace(/\s+/g, " ");
    return (
        MANDANTEN.find((m) => haystack.includes(m.nr.toLowerCase())) ||
        MANDANTEN.find((m) => haystack.includes(m.name.toLowerCase())) ||
        null
    );
  } catch (e) {
    console.warn(`PDF nicht lesbar (${path.basename(filePath)}): ${e.message}`);
    return null;
  } finally {
    try { await parser?.destroy(); } catch { /* ignorieren */ }
  }
};

const processScan = async (filePath) => {
  const fileName = path.basename(filePath);
  if (fileName.startsWith(".") || fileName.startsWith("~")) return; // temporäre Dateien
  const mandant = /\.pdf$/i.test(fileName) ? await resolveMandantFromPdf(filePath) : null;

  if (AUTO_ZUORDNUNG && mandant) {
    const targetDir = path.join(BASE_PATH, folderNameFor(mandant.nr, mandant.name));
    fs.mkdirSync(targetDir, { recursive: true });
    try {
      fs.renameSync(filePath, uniquePath(targetDir, fileName));
      console.log(`📠 Scan automatisch zugeordnet: ${fileName} → ${mandant.name} (${mandant.nr})`);
    } catch (e) {
      console.error(`Scan konnte nicht verschoben werden: ${e.message}`);
    }
    return;
  }

  // In den Eingang legen – dort wird er im Frontend benannt und zugeordnet.
  // Ein erkannter Mandant wird als Vorschlag gemerkt.
  try {
    const target = uniquePath(UNASSIGNED_DIR, fileName);
    fs.renameSync(filePath, target);
    if (mandant) SCAN_VORSCHLAEGE.set(path.basename(target), { nr: mandant.nr, name: mandant.name });
    console.log(mandant
        ? `📠 Scan im Eingang, Vorschlag: ${fileName} → ${mandant.name} (${mandant.nr})`
        : `📠 Scan im Eingang, kein Mandant erkannt: ${fileName}`);
  } catch (e) {
    console.error(`Scan konnte nicht verschoben werden: ${e.message}`);
  }
};

// awaitWriteFinish: erst verarbeiten, wenn der Scanner die Datei fertig
// geschrieben hat (Größe 1,5 s stabil). Verarbeitet beim Start auch
// Dateien, die noch im Eingang liegen.
chokidar
    .watch(SCAN_INBOX, { awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 } })
    .on("add", processScan);

// POST /scan/upload – Datei direkt in den Scanner-Eingang legen.
// Damit landet ein Handy-Scan dort, wo auch der Belegscanner ablegt: Er wird
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

  console.log(`📲 Scan im Eingang von ${req.user.name}: ${req.file.filename}`
      + (mandantName ? ` (für ${mandantName})` : ""));
  res.json({ success: true, fileName: req.file.filename, size: req.file.size });
});

// GET /scan/inbox – unzugeordnete Scans auflisten.
// Mit ?mandantNr=… nur die Scans, die für diesen Mandanten gedacht sind –
// so bekommt ein angemeldeter Mandant die Scans der anderen gar nicht erst zu
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

// GET /scan/file?name=… – unzugeordneten Scan zur Vorschau ausliefern
app.get("/scan/file", requireAuth, (req, res) => {
  const fileName = path.basename(String(req.query.name || ""));
  const filePath = path.join(UNASSIGNED_DIR, fileName);
  if (!fileName || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }
  res.sendFile(filePath);
});

// POST /scan/assign – Scan benennen und einem Mandanten zuordnen
// Optionales newName benennt die Datei beim Einsortieren um (Endung bleibt erhalten)
app.post("/scan/assign", requireAuth, (req, res) => {
  const { fileName, mandantNr, mandantName, newName } = req.body || {};
  // Mandant aus der Festliste – oder aus dem Request (Mandanten aus der Backend-DB)
  const mandant  = MANDANTEN.find((m) => m.nr === mandantNr)
      || (mandantNr && String(mandantName || "").trim()
          ? { nr: String(mandantNr), name: String(mandantName).trim() }
          : null);
  const safeName = path.basename(String(fileName || ""));
  const src      = path.join(UNASSIGNED_DIR, safeName);

  if (!mandant) return res.status(400).json({ error: "Unbekannter Mandant." });
  if (!safeName || !fs.existsSync(src)) {
    return res.status(404).json({ error: "Datei nicht gefunden." });
  }

  // Wunschname bereinigen: keine Pfade, keine Sonderzeichen, Original-Endung erzwingen
  const ext = path.extname(safeName);
  let targetName = safeName;
  const wunsch = path.basename(String(newName || "").trim())
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(new RegExp(`\\${ext}$`, "i"), "")
      .trim();
  if (wunsch) targetName = wunsch + ext;

  const targetDir = path.join(BASE_PATH, folderNameFor(mandant.nr, mandant.name));
  fs.mkdirSync(targetDir, { recursive: true });
  try {
    fs.renameSync(src, uniquePath(targetDir, targetName));
    SCAN_VORSCHLAEGE.delete(safeName);
    console.log(`📠 Zugeordnet von ${req.user.name}: ${safeName}${targetName !== safeName ? ` (umbenannt in ${targetName})` : ""} → ${mandant.name} (${mandant.nr})`);
    res.json({ success: true, fileName: targetName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nBillSquid Scan-Server läuft auf http://localhost:${PORT}`);
  console.log(`Belege:          ${BASE_PATH}`);
  console.log(`Scanner-Eingang: ${SCAN_INBOX}`);
  console.log(`Google Drive:    ${gdrive.aktiv() ? "aktiv" : "inaktiv (keine service-account.json)"}\n`);

  console.log(`Anmeldung der App läuft über das Backend, nicht über diesen Server.`);
  console.log(`Demo-Benutzer (Passwort für alle: Password123!):`);
  console.log(`   emma.schmidt@example.com   Mandantin`);
  console.log(`   noah.weber@example.com     Mandant`);
  console.log(`   mia.fischer@example.com    Mandantin`);
  console.log(`   advisor@example.com        Steuerberater`);
  console.log(`   admin@example.com          Admin\n`);

  console.log(`Dieser Server kennt nur den technischen Zugang des Frontends`);
  console.log(`(doerte@kanzlei.de) – die App meldet sich damit selbst an.\n`);
});