# BillSquid – Frontend

React-Frontend (Vite) für die Belegverwaltung einer Steuerkanzlei. Die Daten
kommen vom BillSquid-Backend der Hochschule (CodeIgniter 4 mit
Shield-Authentifizierung). Dateien vor Ort – Scanner-Eingang, Google Drive,
Belegarchiv – verwaltet ein kleiner Node-Server in `billsquid_server/`.

## Starten

```bash
npm install
npm run dev
```

Der Dev-Server läuft unter `https://localhost:5173`. Das selbstsignierte
Zertifikat von `@vitejs/plugin-basic-ssl` muss im Browser einmal bestätigt
werden. Ohne HTTPS gibt der Browser die Kamera nicht frei. Auf `localhost` ist
das egal, aber am Handy über die Netzwerkadresse (`https://192.168.…:5173`)
funktioniert der Kamera-Scan nur mit HTTPS.

Mit `NO_SSL=1 npm run dev` läuft der Dev-Server ohne HTTPS. Das ist am Rechner
bequemer, aber dann scannt die Kamera am Handy nicht.

Den Scan-Server startet man in einem zweiten Terminal:

```bash
cd billsquid_server
npm install
npm start
```

Ohne ihn läuft die App weiter, nur Scanner-Eingang, Google Drive und das
lokale Belegarchiv bleiben leer.

## Backend-Anbindung

Die App spricht mit zwei Servern, beide über den Vite-Proxy (siehe
`vite.config.js`), dadurch gibt es im Dev-Betrieb keine CORS-Probleme:

| Präfix | Ziel | Aufgabe |
| --- | --- | --- |
| `/backend/api/...` | Hochschul-Backend (CodeIgniter), Standard `https://app.billsquid.com` | Benutzer, Mandanten, Belege, Export |
| `/api/...` | lokaler Scan-Server (`billsquid_server/`, Port 3001) | Scanner-Eingang, Google Drive, Belegarchiv |

Andere Ziele wählt man über Umgebungsvariablen:

```bash
VITE_API_TARGET=http://localhost:8080 VITE_SCAN_TARGET=http://localhost:3002 npm run dev
```

Die Endpunkte des Backends beschreibt `frontend-api.pdf` des Backend-Teams.

## Aufbau

| Datei | Aufgabe |
| --- | --- |
| `src/api.js` | Requests ans Backend (`apiFetch`), Feld-Mapping Beleg ↔ Backend-Dokument, Status-Übersetzung, Mandant anlegen, ZIP-Export |
| `src/localServer.js` | Requests an den Scan-Server (`lokalFetch`) mit automatischer Anmeldung |
| `src/settings.js` | Persönliche Einstellungen, zuletzt gewählte Seite und Mandant, Merkliste der KI-Demo |
| `src/hooks/useUpload.js` | Upload ins Backend, Bilder vorher als PDF verpackt |
| `src/lib/belegDatei.js` | Originaldatei eines Belegs laden (Backend oder Scan-Server) und herunterladen |
| `src/lib/pdfjs.js` | pdf.js laden, PDF öffnen und Text auslesen |
| `src/lib/jpegZuPdf.js` | Bilder (Handy-Scan, PNG, JPG …) ohne Bibliothek in ein einseitiges PDF verpacken |
| `src/lib/kiAnalyse.js` | Simulierte KI-Analyse (siehe unten) |
| `src/lib/stats.js` | Kennzahlen und Sortierung für die Startseiten |
| `src/data/kiDemoBelege.js` | Vorbereitetes Ergebnis der KI-Demo (REWE-Beleg) |
| `src/utils/belegFilter.js` | Suche, Zeitraum-, Status- und Kategoriefilter der Belegliste |
| `src/components/DashboardBerater.jsx` | Startseite der Kanzlei (Mandantenübersicht) |
| `src/components/DashboardMandant.jsx` | Startseite der Mandant:innen |
| `src/components/BelegListe.jsx` | Belegliste – Tabelle am Schreibtisch, Karten am Handy |
| `src/components/BelegSuche.jsx` | Suchfeld, Filter und Export über der Belegliste |
| `src/components/DocDetailModal.jsx` | Beleg-Dialog mit Vorschau (pdf.js), Bearbeitung und Download |
| `src/components/DocumentScanModal.jsx` | Kamera-Scan mit Kantenerkennung und Zuschnitt |
| `src/components/ScannerInbox.jsx` | Scanner-Eingang: Scans benennen, zuordnen oder verwerfen |
| `src/components/MandantAnlegenModal.jsx` | Dialog zum Anlegen eines Mandanten |
| `src/components/SettingsPage.jsx` | Einstellungen, Verbindungsstatus, Admin-Bereich |
| `scripts/copy-pdfjs-assets.mjs` | Kopiert Hilfsdateien von pdf.js nach `public/pdfjs/` |

pdf.js braucht zur Laufzeit einige Hilfsdateien (WebAssembly-Decoder für
JBIG2 und JPEG 2000, Farbprofile, Schriften). `npm install` kopiert sie
automatisch nach `public/pdfjs/`. Fehlen sie, bleiben gescannte Seiten in der
Vorschau **ohne Fehlermeldung weiß**. Nachholen lässt sich das mit
`npm run pdfjs:assets`. Der Ordner ist erzeugt und steht in `.gitignore`.

## Rollen

Das Backend kennt drei Gruppen:

| | Mandant (`client`) | Steuerberater (`tax_advisor`) | Admin |
| --- | --- | --- | --- |
| Belege sehen, hochladen, ändern, löschen | eigene | von zugewiesenen Mandanten | alle |
| Belege als ZIP exportieren | eigene | von aktiv zugewiesenen | alle |
| Mandantenliste | nur sich selbst | nur zugewiesene | alle |
| Mandant anlegen | – | laut Backend noch nicht erlaubt | ja |
| Steuerberater ↔ Mandant zuordnen | – | – | ja |
| Scanner-Eingang | eigene Scans | alle, inkl. Google Drive | alle, inkl. Google Drive |
| Admin-Bereich der Einstellungen | – | – | ja |

Eine Zuweisung zählt nur, wenn der Eintrag in `advisor_clients` den Status
`active` hat. Ohne Zuweisung sieht eine Steuerberaterin **keine** Mandanten.
Die App zeigt dann einen Hinweis und den Knopf zum Anlegen. Zuweisungen legt
ein Admin in den Einstellungen an (`POST /api/advisor-clients`).

**Achtung:** Die Einschränkung der Mandantenliste macht das Frontend selbst.
Laut API-Dokumentation liefert `GET /api/users` jedem angemeldeten Benutzer
alle Benutzer samt E-Mail-Adresse, ohne Einschränkung nach Rolle. Bei den
Belegen setzt das Backend die Regeln durch, bei der Benutzerliste nicht.

## Startseite

Nach dem Login richtet sich die Startseite nach der Rolle
(`istMandantenRolle` in `src/App.jsx`):

* **Mandant:in** – Kennzahlen zu den eigenen Belegen (gesamt, analysiert,
  ausstehend), darunter die fünf zuletzt eingegangenen Belege. Ein Klick
  öffnet den Beleg-Dialog. Die Mandantenauswahl in der Seitenleiste ist
  ausgeblendet.
* **Steuerberater:in / Admin** – die eigenen Mandanten, sortiert nach
  Arbeitsaufwand: Wer die meisten unerledigten Belege hat, steht oben. Neben
  jedem Mandanten stehen die Zahlen für *zu erfassen*, *in Prüfung* und
  *erledigt*. Ein Klick wechselt zum Mandanten und öffnet dessen Belegliste.

Zwischen den Ansichten wechselt man über „Dashboard", „Belege" und
„Einstellungen" in der Seitenleiste bzw. mobil in der unteren Navigation.

Beim Anmelden zeigt die App kurz „Mandanten werden geladen…". Die Demo-Daten
aus `src/data/mockData.js` erscheinen nur, wenn das Backend nicht erreichbar
ist (Demo-Modus).

**Zur Zählung:** Ein eigenes Feld „geprüft" gibt es im Backend nicht. Ein Beleg
gilt als erledigt, sobald er den Status `analyzed` hat. Den setzt das Frontend
beim Bestätigen im Beleg-Dialog. „Unerledigt" ist damit alles mit Status
`pending` oder `processing`.

## Funktionen

### Belegliste

Suche über Dateiname, Aussteller, Rechnungsnummer, Positionen, Beträge und
Klassifikationen, dazu Filter nach Zeitraum, Status und Kategorie. Die
Datumsspalte zeigt das **Belegdatum**, ersatzweise das Upload-Datum, wenn noch
keins erfasst ist. Im Filter lässt sich auf das Upload-Datum umstellen.

Das Stift-Symbol öffnet einen Beleg direkt im Bearbeitungsmodus. Dort lassen
sich auch der Name und alle Belegdaten ändern. Im Kopf des Beleg-Dialogs lädt
das Download-Symbol die Originaldatei herunter.

**Export:** Der Knopf „Export" lädt die Belege des Mandanten als ZIP-Datei
(`GET /api/documents/export`). Der Zeitraum kommt aus dem Filter. Ist dort
keiner gesetzt, reicht er vom ältesten bis zum jüngsten angezeigten Beleg.
Der Endpunkt filtert nur nach Belegdatum, Suchbegriff, Status und Kategorie
wirken nicht. Das Archiv kann also mehr enthalten, als die Liste gerade zeigt.
Obergrenze sind 500 PDFs bzw. 100 MB.

**Status:** Solange die KI nicht über einen Beleg gelaufen ist, bleibt er beim
Speichern auf „ausstehend". Der grüne Knopf heißt dann „Speichern" statt
„Bestätigen".

### Scanner-Eingang

Hier landen Scans, die noch keinem Mandanten zugeordnet sind. Sie kommen aus
drei Quellen:

* dem **Scanner-Ordner** `Belege/_Scanner-Eingang` (Scan-to-Folder),
* **Google Drive** (Ordner „BillSquid", siehe Scan-Server),
* dem **Kamera-Scan** am Handy.

Man gibt dem Scan einen Namen, wählt den Mandanten und speichert. Dann legt die
App den Beleg im Backend an, das Original wandert als Archiv in den
Mandantenordner. Das Papierkorb-Symbol (zweimal tippen) **verschiebt** einen
Scan in den Ordner `_Verworfen`, gelöscht wird nichts. Das hat zwei Gründe:
Steuerunterlagen sollen nicht per Klick verschwinden, und in Google Drive darf
das Dienstkonto fremde Dateien ohnehin nur verschieben, nicht löschen. Den
Ordner `_Verworfen` leert man bei Bedarf von Hand.

Der Eingang wird regelmäßig abgefragt, Standard alle 10 Sekunden, einstellbar
in den Einstellungen. „Aktualisieren" fragt sofort nach, „Stand" zeigt die
letzte Abfrage. Antwortet eine Quelle nicht, erscheint ein roter Hinweis.

### Mandanten anlegen

In der Seitenleiste unter der Mandantenliste steht „Mandant anlegen". Der
Dialog fragt Vorname, Nachname, E-Mail und Startpasswort ab. Den vom Backend
verlangten Anmeldenamen bildet die App aus dem Namen (`emma.schmidt`).
Legt eine Steuerberaterin an, weist die App ihr den Mandanten gleich zu.

**Stand:** `POST /api/users` ist laut Backend nur für Admins freigegeben,
Steuerberater bekommen einen 403-Fehler. Damit das Anlegen auch für sie
funktioniert, muss das Backend die Rolle `tax_advisor` für die Gruppe `client`
freigeben und die Zuweisung gleich mit anlegen. Die darf der Steuerberater
selbst nicht setzen.

### KI-Analyse (simuliert)

„Jetzt analysieren" nimmt den zuletzt hochgeladenen offenen Beleg des
aktuellen Mandanten. Hinter der Analyse steckt keine echte KI, sondern das
vorbereitete Ergebnis aus `src/data/kiDemoBelege.js`, ein REWE-Einkauf mit
allen Positionen und Steuersätzen.

**Erkannt wird nur, was über Google Drive hereinkommt.** Beim Zuordnen eines
Drive-Scans merkt sich die App die Beleg-ID im `localStorage`
(`bs_ki_belege`), damit ein Neuladen dazwischen nichts verliert. Jeder andere
Beleg gilt als „nicht erkannt" und bleibt unverändert.

Ablauf in der Vorführung: Bon in den Drive-Ordner legen, im Scanner-Eingang
benennen und zuordnen, dann „Jetzt analysieren".

Durch eine echte KI ersetzt man nur `analysiereBeleg` in
`src/lib/kiAnalyse.js`. Aufruf und Rückgabeform bleiben gleich.

## Bekannte Einschränkungen der Backend-Schnittstelle

Diese Punkte sind bewusst so gelöst und sollten mit dem Backend-Team
besprochen werden:

1. **Keine Mandanten-Entität.** Ein Mandant ist ein Benutzer der Gruppe
   `client`. Mandantennummer (`KD-001`), Initialen und Farbe erzeugt das
   Frontend aus der Benutzer-ID (`userToMandant` in `src/api.js`). Im Backend
   gibt es dafür keine Felder.

2. **Kein Feld für die Belegdaten der KI-Analyse.** Positionen, Steuersätze,
   Kategorien und Konfidenz liegen als JSON im Freitextfeld `notes`
   (`documentToDoc` liest, `updatePayload` schreibt, beide in `src/api.js`).
   Sauberer wäre eine eigene Spalte, z. B. `metadata JSON`.

   **Achtung:** `notes` ist das einzige freie Feld der API. Schreibt eine
   andere Quelle dort hinein, liest das Frontend nur die Felder, die es
   kennt, und **überschreibt beim nächsten Speichern den gesamten Inhalt**.
   Die eigentliche Lösung ist ein eigenes Feld.

3. **Pflichtfelder beim Upload.** `POST /api/documents` verlangt
   Rechnungsnummer, Aussteller, Empfänger, Datum, Währung und Betrag. Beim
   Hochladen einer Datei ist davon nichts bekannt. Deshalb schickt die App
   Platzhalter und überschreibt sie nach der Analyse per `PATCH`.

4. **Nur PDF.** Kamera-Scans, hochgeladene Bilder und Bild-Scans aus dem
   Scanner-Eingang verpackt die App vor dem Upload in ein einseitiges PDF
   (`src/lib/jpegZuPdf.js`). Das Original bleibt im Mandantenordner bzw. in
   Drive als Archiv liegen.

5. **`pdf_url` der API zeigt auf die Backend-eigene baseURL** (teilweise
   `localhost:8080`) und ist deshalb nicht direkt verwendbar. Das Frontend
   baut den Pfad selbst und lädt die Datei mit Token als Blob.

6. **Benutzer lassen sich weder ändern noch löschen.** Die API kennt bei
   `/api/users` nur Auflisten, Einzelabruf und Anlegen. Ein Tippfehler im
   Namen oder ein versehentlich angelegter Mandant lässt sich nur direkt in
   der Datenbank korrigieren. Sinnvoll wären `PATCH /api/users/{id}` und
   ein Weg zum Deaktivieren (die Spalte `active` existiert bereits).

7. **Mandanten anlegen nur als Admin**, siehe oben.

## Scan-Server (`billsquid_server/`)

Der Node-Server auf Port 3001 verwaltet alles, was nicht ins Backend passt:
den Scanner-Eingang (lokaler Ordner und Google Drive) und die Mandantenordner
als lokales Archiv.

### Konfiguration

| Einstellung | Standard | Bedeutung |
| --- | --- | --- |
| `BELEGE_PFAD` | `../../Belege` (neben dem Projekt) | Wurzel für Eingang, Archiv und `_Verworfen` |
| `DRIVE_ORDNER` | `BillSquid` | Name des freigegebenen Ordners in Google Drive |
| `service-account.json` | – | Schlüssel des Google-Dienstkontos |

Der Belegordner liegt bewusst **außerhalb des Repositorys**, denn
Mandantendaten gehören nicht in Git. Darin legt der Server an:

```
Belege/
├── _Scanner-Eingang/   ← hier legt der Scanner ab (Scan-to-Folder)
├── _Unzugeordnet/      ← Scans, die auf Namen und Mandant warten
├── _Verworfen/         ← aus dem Eingang entfernte Scans
└── KD-001_Emma_Schmidt/ …  ← Archiv je Mandant
```

### Google Drive

1. `service-account.json` von einem Teammitglied holen und nach
   `billsquid_server/` legen. **Die Datei enthält einen privaten Schlüssel und
   steht in `.gitignore`. Niemals committen.** Ohne sie bleibt Drive inaktiv,
   der Rest läuft weiter.
2. In Google Drive einen Ordner „BillSquid" anlegen und für die
   Dienstkonto-Adresse (`client_email` in der Schlüsseldatei) als
   **Bearbeiter** freigeben.

Das Dienstkonto darf Dateien lesen, verschieben und umbenennen, aber nicht
löschen. In „Meine Ablage" darf das nur der Eigentümer. Echtes Löschen ginge
nur in einer geteilten Ablage, und die gibt es erst mit Google Workspace.

`googleapis` lädt der Server erst beim ersten Drive-Zugriff. Das Paket braucht
rund 2,5 Sekunden und würde sonst jeden Start verzögern. Der erste
Drive-Aufruf dauert deshalb etwas länger.

### Anmeldung und Protokoll

Der Server hat keinen eigenen Personen-Login. Die App meldet sich
automatisch mit einem technischen Zugang an (`src/localServer.js`) und schickt
im Kopf `X-BillSquid-Benutzer` mit, wer gerade in der App arbeitet. Diesen
Namen schreibt der Server ins Protokoll. **Das ist eine Beschriftung, kein
Nachweis.** Der Server prüft keine Rollen und darf deshalb nie von außen
erreichbar sein.

Alle Antworten tragen `Cache-Control: no-store`. Sonst verwenden Browser,
allen voran Safari, alte Listen wieder, und neue Scans erscheinen erst nach
einem Neuladen der Seite.

### Routen

Alle Routen außer Login und Status verlangen den Bearer-Token des technischen
Zugangs:

| Route | Zweck |
| --- | --- |
| `POST /auth/login`, `POST /auth/logout`, `GET /status` | Anmeldung und Erreichbarkeit |
| `POST /upload?mandantNr&mandantName` | Datei in den Mandantenordner |
| `GET /belege?mandantNr&mandantName` | Dateien im Mandantenordner |
| `GET`/`DELETE /belege/file?mandantNr&mandantName&name` | Datei lesen bzw. löschen |
| `POST /belege/rename` | Datei im Mandantenordner umbenennen |
| `GET /scan/inbox[?mandantNr]` | Scans im Eingang (optional mit `vorschlag`, mit `mandantNr` nur die eines Mandanten) |
| `POST /scan/upload?mandantNr&mandantName` | Handy-Scan in den Eingang legen |
| `GET /scan/file?name` | Scan aus dem Eingang lesen |
| `POST /scan/assign` | Scan benennen und in den Mandantenordner verschieben |
| `POST /scan/verwerfen` | Scan aus dem Eingang nach `_Verworfen` verschieben |
| `GET /drive/status` | Ist Drive eingerichtet und erreichbar? |
| `POST /drive/ordner` | Drive-Ordner je Mandant anlegen |
| `GET /drive/inbox`, `GET /drive/file?id` | Scanner-Eingang in Google Drive |
| `POST /drive/assign` | Drive-Scan in den Mandantenordner verschieben |
| `POST /drive/verwerfen` | Drive-Scan nach `_Verworfen` verschieben |
