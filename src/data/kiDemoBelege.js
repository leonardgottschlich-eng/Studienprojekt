/**
 * Vorbereitetes Ergebnis der simulierten KI-Analyse (für die Präsentation).
 *
 * Eine echte KI würde die Daten aus dem Scan lesen. Hier liegen sie für einen
 * vorher ausgesuchten Beleg fest bereit und werden dem zuletzt hochgeladenen
 * Beleg zugeordnet (siehe lib/kiAnalyse.js).
 *
 * Vorlage: 05082026_1785952042639.pdf – REWE-Einkauf vom 31.07.2026
 */

export const KI_DEMO_BELEG = {
  confidence: 94,
  kategorien: ["Betriebsausgaben"],
  extractedData: {
    aussteller: "REWE Markt Kati Sommer oHG",
    adresse: "Ernst-Reuter-Allee 11, 39104 Magdeburg",
    ustIdNr: "DE221908587",
    datum: "31.07.2026",
    uhrzeit: "14:22:34",
    rechnungsnr: "2171",
    zahlungsart: "girocard (kontaktlos), Karte **** 9968",
    // Pfand ist keine Betriebsausgabe, sondern wird bei Rückgabe erstattet –
    // die KI nimmt die Pfandpositionen deshalb von der Anrechnung aus.
    positionen: [
      { bezeichnung: "ANNO 1688 KLASS.", menge: "2", einzelpreis: "2,49 €", netto: "4,65 €", mwstSatz: 7, mwstBetrag: "0,33 €", betrag: "4,98 €", angerechnet: true },
      { bezeichnung: "ANNO 1688 RUSTIK", menge: "1", einzelpreis: "2,49 €", netto: "2,33 €", mwstSatz: 7, mwstBetrag: "0,16 €", betrag: "2,49 €", angerechnet: true },
      { bezeichnung: "HUMMUS NATUR", menge: "1", einzelpreis: "1,49 €", netto: "1,39 €", mwstSatz: 7, mwstBetrag: "0,10 €", betrag: "1,49 €", angerechnet: true },
      { bezeichnung: "LIKE GRILLED CHI", menge: "3", einzelpreis: "2,49 €", netto: "6,96 €", mwstSatz: 7, mwstBetrag: "0,51 €", betrag: "7,47 €", angerechnet: true },
      { bezeichnung: "VEG. LACHSSCHIN", menge: "1", einzelpreis: "1,99 €", netto: "1,86 €", mwstSatz: 7, mwstBetrag: "0,13 €", betrag: "1,99 €", angerechnet: true },
      { bezeichnung: "VEGAN LYONER PAP", menge: "1", einzelpreis: "0,95 €", netto: "0,89 €", mwstSatz: 7, mwstBetrag: "0,06 €", betrag: "0,95 €", angerechnet: true },
      { bezeichnung: "VEG. HAEHN PAPR", menge: "1", einzelpreis: "1,59 €", netto: "1,49 €", mwstSatz: 7, mwstBetrag: "0,10 €", betrag: "1,59 €", angerechnet: true },
      { bezeichnung: "VEG POMMERSCHE", menge: "2", einzelpreis: "2,49 €", netto: "4,65 €", mwstSatz: 7, mwstBetrag: "0,33 €", betrag: "4,98 €", angerechnet: true },
      { bezeichnung: "VEG POMM", menge: "2", einzelpreis: "2,49 €", netto: "4,65 €", mwstSatz: 7, mwstBetrag: "0,33 €", betrag: "4,98 €", angerechnet: true },
      { bezeichnung: "ZITRONE UEB", menge: "1", einzelpreis: "1,19 €", netto: "1,11 €", mwstSatz: 7, mwstBetrag: "0,08 €", betrag: "1,19 €", angerechnet: true },
      { bezeichnung: "AVOCADO VORGER.", menge: "2", einzelpreis: "0,79 €", netto: "1,48 €", mwstSatz: 7, mwstBetrag: "0,10 €", betrag: "1,58 €", angerechnet: true },
      { bezeichnung: "KOPFSALAT", menge: "1", einzelpreis: "1,49 €", netto: "1,39 €", mwstSatz: 7, mwstBetrag: "0,10 €", betrag: "1,49 €", angerechnet: true },
      { bezeichnung: "KOKOS NATUR", menge: "1", einzelpreis: "1,45 €", netto: "1,36 €", mwstSatz: 7, mwstBetrag: "0,09 €", betrag: "1,45 €", angerechnet: true },
      { bezeichnung: "BIO AUFSTRICH", menge: "1", einzelpreis: "0,99 €", netto: "0,93 €", mwstSatz: 7, mwstBetrag: "0,06 €", betrag: "0,99 €", angerechnet: true },
      { bezeichnung: "BIO TOMATENS.ARR", menge: "2", einzelpreis: "1,99 €", netto: "3,72 €", mwstSatz: 7, mwstBetrag: "0,26 €", betrag: "3,98 €", angerechnet: true },
      { bezeichnung: "BIO PESTO VERDE", menge: "1", einzelpreis: "2,49 €", netto: "2,33 €", mwstSatz: 7, mwstBetrag: "0,16 €", betrag: "2,49 €", angerechnet: true },
      { bezeichnung: "BIO PESTO ROSSO", menge: "1", einzelpreis: "2,49 €", netto: "2,33 €", mwstSatz: 7, mwstBetrag: "0,16 €", betrag: "2,49 €", angerechnet: true },
      { bezeichnung: "BION.NUSS-NOUGAT", menge: "1", einzelpreis: "4,49 €", netto: "4,20 €", mwstSatz: 7, mwstBetrag: "0,29 €", betrag: "4,49 €", angerechnet: true },
      { bezeichnung: "KICHERERBSEN", menge: "1", einzelpreis: "0,59 €", netto: "0,55 €", mwstSatz: 7, mwstBetrag: "0,04 €", betrag: "0,59 €", angerechnet: true },
      { bezeichnung: "INTENSE CHIPS", menge: "1", einzelpreis: "0,99 €", netto: "0,93 €", mwstSatz: 7, mwstBetrag: "0,06 €", betrag: "0,99 €", angerechnet: true },
      { bezeichnung: "KC SWEET CHILI P", menge: "1", einzelpreis: "2,49 €", netto: "2,33 €", mwstSatz: 7, mwstBetrag: "0,16 €", betrag: "2,49 €", angerechnet: true },
      { bezeichnung: "LINSEN CHIPS", menge: "3", einzelpreis: "1,99 €", netto: "5,58 €", mwstSatz: 7, mwstBetrag: "0,39 €", betrag: "5,97 €", angerechnet: true },
      { bezeichnung: "READY POPCO.SUES", menge: "1", einzelpreis: "1,99 €", netto: "1,86 €", mwstSatz: 7, mwstBetrag: "0,13 €", betrag: "1,99 €", angerechnet: true },
      { bezeichnung: "JA! COLA", menge: "1", einzelpreis: "0,65 €", netto: "0,55 €", mwstSatz: 19, mwstBetrag: "0,10 €", betrag: "0,65 €", angerechnet: true },
      { bezeichnung: "PFAND 0,25 EURO", menge: "1", einzelpreis: "0,25 €", netto: "0,21 €", mwstSatz: 19, mwstBetrag: "0,04 €", betrag: "0,25 €", angerechnet: false },
      { bezeichnung: "SPEZI", menge: "2", einzelpreis: "1,25 €", netto: "2,10 €", mwstSatz: 19, mwstBetrag: "0,40 €", betrag: "2,50 €", angerechnet: true },
      { bezeichnung: "PFAND 0,08 EUR", menge: "2", einzelpreis: "0,08 €", netto: "0,13 €", mwstSatz: 19, mwstBetrag: "0,03 €", betrag: "0,16 €", angerechnet: false },
      { bezeichnung: "JA! ZITRONENLIMO", menge: "1", einzelpreis: "0,65 €", netto: "0,55 €", mwstSatz: 19, mwstBetrag: "0,10 €", betrag: "0,65 €", angerechnet: true },
      { bezeichnung: "PFAND 0,25 EURO", menge: "1", einzelpreis: "0,25 €", netto: "0,21 €", mwstSatz: 19, mwstBetrag: "0,04 €", betrag: "0,25 €", angerechnet: false },
      { bezeichnung: "MIO MIO MATE", menge: "1", einzelpreis: "11,99 €", netto: "10,08 €", mwstSatz: 19, mwstBetrag: "1,91 €", betrag: "11,99 €", angerechnet: true },
      { bezeichnung: "PFAND 3,30 EUR", menge: "1", einzelpreis: "3,30 €", netto: "2,77 €", mwstSatz: 19, mwstBetrag: "0,53 €", betrag: "3,30 €", angerechnet: false },
      { bezeichnung: "FAIRTRADE MULTI.", menge: "1", einzelpreis: "2,39 €", netto: "2,01 €", mwstSatz: 19, mwstBetrag: "0,38 €", betrag: "2,39 €", angerechnet: true },
    ],
    nettoBetrag: "77,58 €",
    mwstSatz: "19 % / 7 %",
    mwstBetrag: "7,66 €",
    gesamtBetrag: "85,24 €",
    angerechnetBetrag: "81,28 €",
  },
};
