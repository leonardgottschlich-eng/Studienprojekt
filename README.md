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

Alle Requests gehen an `/api/...` und werden vom Vite-Proxy an das Backend
weitergereicht (siehe `vite.config.js`). Dadurch entstehen im Dev-Betrieb
keine CORS-Probleme.

Ein anderes Backend wählt man über eine Umgebungsvariable:

```bash
VITE_API_TARGET=http://localhost:8080 npm run dev
```

Für einen Produktions-Build ohne Proxy muss die volle Backend-Origin gesetzt
werden, weil dann kein Vite-Server mehr dazwischen steht:

```bash
VITE_API_BASE_URL=https://app.billsquid.com npm run build
```

### Aufbau

| Datei | Aufgabe |
| --- | --- |
| `src/api/client.js` | Basis-Request, Bearer-Token, Session, Fehlerobjekt `ApiError` |
| `src/api/auth.js` | Login/Logout, Normalisierung des Benutzerobjekts |
| `src/api/mandanten.js` | Mandanten aus den Backend-Benutzern ableiten |
| `src/api/documents.js` | Belege lesen/anlegen/ändern/löschen inkl. Feld-Mapping |
| `src/lib/pdf.js` | Datei-Aufbereitung: Bild → PDF, Base64-Kodierung |
| `src/lib/stats.js` | Kennzahlen und Sortierung für die Startseiten |
| `src/components/DashboardBerater.jsx` | Startseite der Kanzlei (Mandantenübersicht) |
| `src/components/DashboardMandant.jsx` | Startseite der Mandant:innen (eigene offene Belege) |

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

4. **Nur PDF.** Der Kamera-Scan liefert JPEG. Bilder werden deshalb vor dem
   Upload clientseitig in ein einseitiges PDF verpackt (`src/lib/pdf.js`).

5. **`pdf_url` der API zeigt auf die Backend-eigene baseURL** (teilweise
   `localhost:8080`) und ist deshalb nicht direkt verwendbar. Das Frontend
   baut den Pfad selbst und lädt die Datei mit Token als Blob.

## Hinweis zu `billsquid_server/`

Der lokale Node-Server war die Übergangslösung vor der Backend-Anbindung
(eigenes Login, Dateiablage im Ordner `Belege/`). Er wird im laufenden Betrieb
nicht mehr benötigt und nur noch zu Dokumentationszwecken aufbewahrt.
