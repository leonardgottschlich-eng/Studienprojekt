/**
 * Google-Drive-Anbindung für den Scanner-Eingang.
 *
 * Der Scanner legt Scans über die Drive-Desktop-Synchronisierung in einem
 * freigegebenen Ordner ab. Dieses Modul liest sie, legt die Ordnerstruktur an
 * und verschiebt zugeordnete Belege in den Mandantenordner.
 *
 * Wichtig: Das Dienstkonto hat keinen eigenen Drive-Speicher. Es kann deshalb
 * Ordner anlegen (die belegen nichts), Dateien lesen und verschieben – aber
 * keine neuen Dateien hochladen. Genau das brauchen wir hier auch nicht.
 *
 * Einrichtung: Ordner in Google Drive anlegen und für die Dienstkonto-Adresse
 * aus service-account.json als Bearbeiter freigeben. Name über die
 * Umgebungsvariable DRIVE_ORDNER änderbar (Standard: "BillSquid").
 */

const fs   = require("fs");
const path = require("path");
const { google } = require("googleapis");

const SCHLUESSEL   = path.join(__dirname, "service-account.json");
const BASIS_NAME   = process.env.DRIVE_ORDNER || "BillSquid";
const EINGANG_NAME = "_Unzugeordnet";
const ORDNER_TYP   = "application/vnd.google-apps.folder";
const BELEG_MUSTER = /\.(pdf|jpe?g|png|webp)$/i;

/** Ohne Schlüsseldatei bleibt die Drive-Anbindung einfach inaktiv */
const aktiv = () => fs.existsSync(SCHLUESSEL);

let client = null;
function drive() {
    if (!client) {
        const auth = new google.auth.GoogleAuth({
            keyFile: SCHLUESSEL,
            scopes: ["https://www.googleapis.com/auth/drive"],
        });
        client = google.drive({ version: "v3", auth });
    }
    return client;
}

// Einfache Anführungszeichen müssen in Drive-Suchausdrücken maskiert werden
const maskiere = (text) => String(text).replace(/'/g, "\\'");

/* ── Ordner ─────────────────────────────────────────────────────── */

let basisId = null;

/** Der vom Benutzer freigegebene Basisordner */
async function basisOrdner() {
    if (basisId) return basisId;
    const res = await drive().files.list({
        q: `mimeType='${ORDNER_TYP}' and name='${maskiere(BASIS_NAME)}' and trashed=false`,
        fields: "files(id,name,capabilities(canAddChildren))",
        pageSize: 10,
    });
    const treffer = (res.data.files || []).find((f) => f.capabilities?.canAddChildren);
    if (!treffer) {
        throw new Error(`Ordner "${BASIS_NAME}" nicht gefunden. Bitte in Google Drive anlegen und für das Dienstkonto als Bearbeiter freigeben.`);
    }
    basisId = treffer.id;
    return basisId;
}

/** Unterordner suchen oder anlegen (Ordner brauchen keinen Speicherplatz) */
async function ordnerFuer(name, parentId) {
    const res = await drive().files.list({
        q: `mimeType='${ORDNER_TYP}' and name='${maskiere(name)}' and '${parentId}' in parents and trashed=false`,
        fields: "files(id)",
        pageSize: 1,
    });
    if (res.data.files?.length) return res.data.files[0].id;

    const neu = await drive().files.create({
        requestBody: { name, mimeType: ORDNER_TYP, parents: [parentId] },
        fields: "id",
    });
    return neu.data.id;
}

const eingangsOrdner = async () => ordnerFuer(EINGANG_NAME, await basisOrdner());

/** Legt _Unzugeordnet und je Mandant einen Ordner an */
async function ordnerAnlegen(mandantenOrdner = []) {
    const basis = await basisOrdner();
    const angelegt = [];
    angelegt.push({ name: EINGANG_NAME, id: await ordnerFuer(EINGANG_NAME, basis) });
    for (const name of mandantenOrdner) {
        angelegt.push({ name, id: await ordnerFuer(name, basis) });
    }
    return angelegt;
}

/* ── Dateien ────────────────────────────────────────────────────── */

/**
 * Noch nicht zugeordnete Scans: alles, was direkt im Basisordner oder in
 * _Unzugeordnet liegt. Damit ist es egal, wohin der Scanner synchronisiert.
 */
async function listeEingang() {
    const basis   = await basisOrdner();
    const eingang = await eingangsOrdner();
    const res = await drive().files.list({
        q: `('${basis}' in parents or '${eingang}' in parents) and mimeType!='${ORDNER_TYP}' and trashed=false`,
        fields: "files(id,name,size,createdTime)",
        orderBy: "createdTime desc",
        pageSize: 200,
    });
    return (res.data.files || [])
        .filter((f) => BELEG_MUSTER.test(f.name))
        .map((f) => ({
            id: f.id,
            name: f.name,
            size: `${Math.max(1, Math.round(Number(f.size || 0) / 1024))} KB`,
            createdAt: new Date(f.createdTime).toLocaleDateString("de-DE"),
            quelle: "drive",
        }));
}

/** Dateiinhalt herunterladen */
async function dateiInhalt(fileId) {
    const meta = await drive().files.get({ fileId, fields: "name,mimeType" });
    const res  = await drive().files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    return { name: meta.data.name, mimeType: meta.data.mimeType, daten: Buffer.from(res.data) };
}

/** Beleg in den Mandantenordner verschieben und dabei umbenennen */
async function zuordnen({ fileId, ordnerName, neuerName }) {
    const ziel = await ordnerFuer(ordnerName, await basisOrdner());
    const jetzt = await drive().files.get({ fileId, fields: "parents,name" });

    const res = await drive().files.update({
        fileId,
        addParents: ziel,
        removeParents: (jetzt.data.parents || []).join(","),
        requestBody: neuerName ? { name: neuerName } : {},
        fields: "id,name,parents",
    });
    return { id: res.data.id, name: res.data.name, ordner: ordnerName };
}

/** Kurzer Zustandsbericht für die Einstellungsseite */
async function status() {
    if (!aktiv()) return { aktiv: false, grund: "Keine service-account.json vorhanden." };
    try {
        const basis = await basisOrdner();
        const dateien = await listeEingang();
        return { aktiv: true, ordner: BASIS_NAME, ordnerId: basis, imEingang: dateien.length };
    } catch (e) {
        return { aktiv: false, grund: e.message };
    }
}

module.exports = { aktiv, status, listeEingang, dateiInhalt, zuordnen, ordnerAnlegen };