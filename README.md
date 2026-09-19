# BillSquid – Frontend

React-Frontend (Vite) für die Belegverwaltung. Die Daten kommen vom
BillSquid-Backend der Hochschule (CodeIgniter 4 mit Shield-Authentifizierung).

## Starten

```bash
npm install
npm run dev
```

Der Dev-Server läuft unter `https://localhost:5173`. Das selbstsignierte
Zertifikat von `@vitejs/plugin-basic-ssl` muss im Browser einmalig bestätigt
werden – es wird gebraucht, damit der Kamera-Scan auch auf dem Smartphone
funktioniert.

## Backend-Anbindung

Die App spricht mit zwei Servern, beide über den Vite-Proxy (siehe
`vite.config.js`), dadurch gibt es im Dev-Betrieb keine CORS-Probleme:

| Präfix | Ziel | Aufgabe |
| --- | --- | --- |
| `/backend/api/...` | Hochschul-Backend (CodeIgniter), Standard `https://app.billsquid.com` | Benutzer, Mandanten, Belege |
| `/api/...` | lokaler Scan-Server (`billsquid_server/`, Port 3001) | Scanner-Eingang, Bilddateien, Google Drive |

Andere Ziele wählt man über Umgebungsvariablen:

```bash
VITE_API_TARGET=http://localhost:8080 VITE_SCAN_TARGET=http://localhost:3002 npm run dev
```

Mit `NO_SSL=1 npm run dev` läuft der Dev-Server ohne HTTPS – bequemer am
Rechner, aber dann funktioniert der Kamera-Scan auf dem Handy nicht.

### Aufbau

| Datei | Aufgabe |
| --- | --- |
| `src/api.js` | Requests ans Backend (`apiFetch`), Feld-Mapping Beleg ↔ Backend-Dokument, Status-Übersetzung |
| `src/localServer.js` | Requests an den Scan-Server (`lokalFetch`) mit automatischer Anmeldung |
| `src/settings.js` | Persönliche Einstellungen, zuletzt gewählte Seite und Mandant |
| `src/hooks/useUpload.js` | Upload ins Backend, Bilder vorher als PDF verpackt |
| `src/lib/jpegZuPdf.js` | Bilder (Handy-Scan, PNG, JPG …) ohne Bibliothek in ein einseitiges PDF verpacken |
| `src/lib/stats.js` | Kennzahlen und Sortierung für die Startseiten |
| `src/utils/belegFilter.js` | Suche, Zeitraum-, Status- und Kategoriefilter der Belegliste |
| `src/components/DashboardBerater.jsx` | Startseite der Kanzlei (Mandantenübersicht) |
| `src/components/DashboardMandant.jsx` | Startseite der Mandant:innen (eigene offene Belege) |
| `src/components/BelegListe.jsx` | Belegliste – Tabelle am Schreibtisch, Karten am Handy |
| `src/components/DocDetailModal.jsx` | Beleg-Dialog mit PDF-Vorschau (pdf.js) und Bearbeitung |
| `src/components/ScannerInbox.jsx` | Scanner-Eingang: Scans benennen und Mandanten zuordnen |

pdf.js braucht zur Laufzeit einige Hilfsdateien (WebAssembly-Decoder,
Schriften). Die kopiert `npm install` automatisch nach `public/pdfjs/`; fehlen
sie, bleiben gescannte Seiten in der Vorschau weiß (`npm run pdfjs:assets`).

### Rollen

Das Backend kennt drei Gruppen. Davon hängt ab, welche Mandanten sichtbar sind:

| Rolle | Sichtbar |
| --- | --- |
| `admin` | alle Mandanten und Belege |
| `tax_advisor` | nur zugewiesene Mandanten (Tabelle `advisor_clients`, Status `active`) |
| `client` | nur die eigenen Belege |

Ohne Eintrag in `advisor_clients` sieht eine Steuerberaterin **keine**
Mandanten. Zuweisungen legt ein Admin über `POST /api/advisor-clients` an.

## Startseite

Nach dem Login zeigt die App eine Startseite, die sich nach der Rolle des
angemeldeten Benutzers richtet (`istMandantenRolle` in `src/App.jsx`):

* **Mandant:in** – die eigenen offenen Belege. Oben die Kennzahlen
  (zu erfassen / in Prüfung / erledigt), darunter die noch nicht erledigten
  Belege, neueste zuerst. Ein Klick öffnet den Beleg-Dialog. Der
  Mandantenwechsler in der Seitenleiste und der Scanner-Eingang sind
  ausgeblendet – beides sind Kanzlei-Funktionen.
* **Steuerberater:in / Admin** – die eigenen Mandanten, sortiert nach
  Arbeitsaufwand: wer die meisten unerledigten Belege hat, steht oben.
  Je Mandant stehen die Zahlen für *zu erfassen*, *in Prüfung* und
  *erledigt* daneben; ein Klick wechselt zum Mandanten und öffnet dessen
  Belegliste.

Über "Startseite" und "Belege" in der Seitenleiste (mobil: untere Navigation)
wechselt man zwischen beiden Ansichten.

**Zur Zählung:** Ein eigenes Feld "geprüft" gibt es im Backend nicht. Ein
Beleg gilt als erledigt, sobald er den Status `analyzed` hat – den setzt das
Frontend beim Bestätigen im Detail-Dialog. "Unerledigt" ist damit alles mit
Status `pending` oder `processing`. Für eine echte Trennung zwischen
"KI-analysiert" und "vom Berater freigegeben" bräuchte es ein zusätzliches
Feld im Backend.

## Bekannte Einschränkungen der Backend-Schnittstelle

Diese Punkte sind bewusst so gelöst und sollten mit dem Backend-Team
besprochen werden:

1. **Keine Mandanten-Entität.** Ein Mandant ist ein Benutzer der Gruppe
   `client`. Mandantennummer (`KDN-0001`), Initialen und Farbe erzeugt das
   Frontend aus der Benutzer-ID; im Backend gibt es dafür keine Felder.

2. **Kein Feld für die Belegdaten der KI-Analyse.** Positionen, Steuersätze,
   Kategorie und Konfidenz werden als JSON im Freitextfeld `notes` abgelegt
   (siehe `packNotes` in `src/api/documents.js`). Sauberer wäre eine eigene
   Spalte, z. B. `metadata JSON`.

   **Achtung:** `notes` ist das einzige freie Feld der API, und es schreibt
   nicht nur dieses Frontend hinein. Im Bestandsbeleg fand sich bereits JSON
   einer anderen Quelle – mit eigenem Schema (`positionen`, `angerechnet`,
   `angerechnetBetrag`), aber ohne Erkennungsmarker. Wer zuletzt speichert,
   überschreibt die Daten des anderen. `unpackNotes` erkennt fremdes JSON und
   übernimmt daraus nur `category`, statt es als Freitext einzubetten – sonst
   würde sich der Inhalt bei jedem Speichern eine Escaping-Ebene tiefer
   verschachteln. Die eigentliche Lösung ist eine Absprache mit dem
   Backend-Team über ein eigenes Feld.

3. **Pflichtfelder beim Upload.** `POST /api/documents` verlangt
   Rechnungsnummer, Aussteller, Empfänger, Datum, Währung und Betrag. Beim
   Hochladen einer Datei ist davon nichts bekannt, deshalb werden Platzhalter
   gesendet und nach der Analyse per `PATCH` überschrieben.

4. **Nur PDF.** Kamera-Scans, hochgeladene Bilder und Bild-Scans aus dem
   Scanner-Eingang (lokal oder Google Drive) werden deshalb vor dem Upload
   clientseitig in ein einseitiges PDF verpackt (`src/lib/jpegZuPdf.js`).
   Das Original bleibt im Mandantenordner bzw. in Drive als Archiv liegen.

5. **`pdf_url` der API zeigt auf die Backend-eigene baseURL** (teilweise
   `localhost:8080`) und ist deshalb nicht direkt verwendbar. Das Frontend
   baut den Pfad selbst und lädt die Datei mit Token als Blob.

## Scan-Server (`billsquid_server/`)

Der lokale Node-Server verwaltet alles, was nicht ins Backend passt: den
Scanner-Eingang (lokaler Ordner und Google Drive), Bilddateien und die
Mandantenordner als lokales Archiv. Ohne ihn läuft die App weiter, aber
Scanner-Eingang, Bild-Upload und Drive-Anbindung bleiben leer.

```bash
cd billsquid_server
npm install
npm start
```

Das Frontend erwartet diese Routen (alle mit Bearer-Token außer Login/Status):

| Route | Zweck |
| --- | --- |
| `POST /auth/login`, `POST /auth/logout`, `GET /status` | Anmeldung und Erreichbarkeit |
| `POST /upload?mandantNr&mandantName` | Bilddatei in den Mandantenordner |
| `GET /belege?mandantNr&mandantName` | Dateien im Mandantenordner |
| `GET`/`DELETE /belege/file?mandantNr&mandantName&name` | Datei lesen bzw. löschen |
| `POST /belege/rename` | Datei im Mandantenordner umbenennen |
| `GET /scan/inbox[?mandantNr]` | unzugeordnete Scans (optional mit `vorschlag`) |
| `POST /scan/upload?mandantNr&mandantName` | Handy-Scan in den Eingang legen |
| `GET /scan/file?name` | Scan aus dem Eingang lesen |
| `POST /scan/assign` | Scan benennen und in den Mandantenordner verschieben |
| `POST /drive/ordner` | Drive-Ordner je Mandant anlegen |
| `GET /drive/inbox`, `GET /drive/file?id`, `POST /drive/assign` | Scanner-Eingang in Google Drive |
