/**
 * Suche und Filter für die Belegliste.
 *
 * Gesucht wird in allen erfassten Inhalten eines Belegs (Aussteller,
 * Belegnummer, Positionen, Beträge, Klassifikationen …), nicht nur im
 * Dateinamen. Gefiltert wird zusätzlich nach Zeitraum, Status und
 * Klassifikation.
 */

import { kategorienVon } from "../data/kategorien";

/* ── Datum ─────────────────────────────────────────────────────── */

/** "01.08.2026", "5.8.2026" oder "2026-08-01" → Date (sonst null) */
export function parseDatum(str) {
  if (!str) return null;
  const s = String(str).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) return new Date(+de[3], +de[2] - 1, +de[1]);
  return null;
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Datum, nach dem gefiltert wird.
 * Beim Belegdatum wird auf das Upload-Datum zurückgegriffen, solange noch
 * keine Daten erfasst sind – sonst würden frisch hochgeladene Belege bei
 * jedem Zeitraumfilter verschwinden.
 */
export const datumFuer = (doc, bezug) =>
    bezug === "upload"
        ? parseDatum(doc.uploadedAt)
        : parseDatum(doc.extractedData?.datum) ?? parseDatum(doc.uploadedAt);

/* ── Zeitraum-Schnellauswahl ───────────────────────────────────── */

export const ZEITRAUM_PRESETS = [
  { id: "alle",     label: "Alle" },
  { id: "30tage",   label: "Letzte 30 Tage" },
  { id: "quartal",  label: "Dieses Quartal" },
  { id: "jahr",     label: "Dieses Jahr" },
  { id: "vorjahr",  label: "Letztes Jahr" },
];

/** Preset-Kennung → konkreter Zeitraum */
export function presetZeitraum(id) {
  const heute = new Date();
  const jahr = heute.getFullYear();

  if (id === "30tage") {
    const von = new Date();
    von.setDate(von.getDate() - 30);
    return { von: iso(von), bis: iso(heute) };
  }
  if (id === "quartal") {
    const ersterMonat = Math.floor(heute.getMonth() / 3) * 3;
    return { von: iso(new Date(jahr, ersterMonat, 1)), bis: iso(new Date(jahr, ersterMonat + 3, 0)) };
  }
  if (id === "jahr")    return { von: `${jahr}-01-01`,     bis: `${jahr}-12-31` };
  if (id === "vorjahr") return { von: `${jahr - 1}-01-01`, bis: `${jahr - 1}-12-31` };
  return { von: "", bis: "" };   // "alle"
}

/* ── Filterzustand ─────────────────────────────────────────────── */

export const LEERER_FILTER = {
  query: "",
  preset: "alle",
  von: "",
  bis: "",
  bezug: "beleg",     // "beleg" = Belegdatum, "upload" = Upload-Datum
  status: "alle",
  kategorie: "alle",
};

/** Anzahl gesetzter Filter (ohne Suchtext – der hat ein eigenes Feld) */
export const aktiveFilter = (f) =>
    (f.von || f.bis ? 1 : 0) +
    (f.status && f.status !== "alle" ? 1 : 0) +
    (f.kategorie && f.kategorie !== "alle" ? 1 : 0);

export const filterAktiv = (f) => !!f.query || aktiveFilter(f) > 0;

/* ── Suche ─────────────────────────────────────────────────────── */

/** Alle durchsuchbaren Felder eines Belegs als ein Text */
export function belegText(doc) {
  const ed = doc.extractedData || {};
  return [
    doc.name, doc.amount, ...kategorienVon(doc),
    ed.aussteller, ed.adresse, ed.ustIdNr, ed.rechnungsnr, ed.zahlungsart, ed.datum,
    ed.nettoBetrag, ed.mwstBetrag, ed.gesamtBetrag,
    ...(ed.positionen ?? []).flatMap((p) => [p.bezeichnung, p.betrag]),
  ].filter(Boolean).join(" ").toLowerCase();
}

/**
 * Suchbegriffe zerlegen. Anführungszeichen halten eine Wortfolge zusammen:
 *   hotel berlin      → beide Wörter müssen vorkommen
 *   "motel one"       → genau diese Wortfolge
 */
export function suchbegriffe(query) {
  const begriffe = [];
  const muster = /"([^"]+)"|(\S+)/g;
  let treffer;
  while ((treffer = muster.exec(query || ""))) {
    const wert = (treffer[1] ?? treffer[2] ?? "").trim().toLowerCase();
    if (wert) begriffe.push(wert);
  }
  return begriffe;
}

/** Feld, in dem der Suchbegriff steckt – für den Treffer-Hinweis in der Liste */
export function trefferFeld(doc, query) {
  const [begriff] = suchbegriffe(query);
  if (!begriff || doc.name.toLowerCase().includes(begriff)) return null;

  const ed = doc.extractedData || {};

  const kategorie = kategorienVon(doc).find((k) => k.toLowerCase().includes(begriff));
  if (kategorie) return { label: "Klassifikation", wert: kategorie };

  const position = (ed.positionen ?? []).find((p) => p.bezeichnung?.toLowerCase().includes(begriff));
  if (position) return { label: "Position", wert: position.bezeichnung };

  const felder = [
    ["Aussteller", ed.aussteller], ["Adresse", ed.adresse], ["Belegnummer", ed.rechnungsnr],
    ["USt-IdNr.", ed.ustIdNr], ["Zahlungsart", ed.zahlungsart], ["Betrag", doc.amount],
  ];
  const feld = felder.find(([, wert]) => String(wert ?? "").toLowerCase().includes(begriff));
  return feld ? { label: feld[0], wert: feld[1] } : null;
}

/* ── Filtern ───────────────────────────────────────────────────── */

export function filterBelege(docs, filter = LEERER_FILTER) {
  const { query = "", von = "", bis = "", bezug = "beleg", status = "alle", kategorie = "alle" } = filter;

  const begriffe = suchbegriffe(query);
  const vonDatum = von ? parseDatum(von) : null;
  const bisDatum = bis ? parseDatum(bis) : null;
  if (bisDatum) bisDatum.setHours(23, 59, 59, 999);

  return docs.filter((doc) => {
    if (begriffe.length) {
      const text = belegText(doc);
      if (!begriffe.every((b) => text.includes(b))) return false;
    }
    if (status !== "alle" && doc.status !== status) return false;
    if (kategorie !== "alle" && !kategorienVon(doc).includes(kategorie)) return false;

    if (vonDatum || bisDatum) {
      const datum = datumFuer(doc, bezug);
      if (!datum) return false;
      if (vonDatum && datum < vonDatum) return false;
      if (bisDatum && datum > bisDatum) return false;
    }
    return true;
  });
}

/** Alle in den Belegen vorkommenden Klassifikationen – für die Auswahlliste */
export const vorhandeneKategorien = (docs) =>
    [...new Set(docs.flatMap(kategorienVon))].sort((a, b) => a.localeCompare(b, "de"));
