/**
 * BillSquid – Lokaler Server
 * - REST-API: Upload, Belege, Status
 * - Auth:     Login, Token-Prüfung (JWT)
 *
 * Installation:
 *   npm install express multer cors jsonwebtoken bcryptjs
 *
 * Start: node server.js
 */

const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const fs       = require("fs");
const path     = require("path");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");

const app  = express();
const PORT = 3001;

// ── Sicherheits-Schlüssel ─────────────────────────────────────────
const JWT_SECRET = "billsquid-geheimer-schluessel-2026";
// Kein Ablauf – Token bleibt dauerhaft gültig

// ── Benutzer (in Produktion: Datenbank!) ─────────────────────────
// Passwörter sind gehasht mit bcrypt (nie Klartext speichern!)
// Passwort für alle Demo-Benutzer: "billsquid123"
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

// ── Basis-Setup ───────────────────────────────────────────────────
const BASE_PATH = path.join(__dirname, "..", "Belege");
fs.mkdirSync(BASE_PATH, { recursive: true });

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
      // kein expiresIn = Token läuft nie ab
  );

  console.log(`✅ Login: ${user.name} (${user.email})`);
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
    const folderName  = `${mandantNr}_${mandantName.replace(/\s+/g, "_")}`;
    const targetDir   = path.join(BASE_PATH, folderName);
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
  const folderName  = `${mandantNr}_${mandantName.replace(/\s+/g, "_")}`;
  const targetDir   = path.join(BASE_PATH, folderName);

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

app.get("/status", (req, res) => {
  res.json({ running: true, basePath: BASE_PATH });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🟢 BillSquid Server läuft auf http://localhost:${PORT}`);
  console.log(`🔐 Auth aktiv – Token ohne Ablauf`);
  console.log(`📁 Belege: ${BASE_PATH}\n`);
  console.log(`Demo-Zugangsdaten:`);
  console.log(`   doerte@kanzlei.de  /  billsquid123`);
  console.log(`   max@kanzlei.de     /  billsquid123\n`);
});