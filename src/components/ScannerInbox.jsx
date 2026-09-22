import { useState } from "react";
import FileIcon from "./FileIcon";
import { lokalFetch } from "../localServer";

// "Scan_123.pdf" → ["Scan_123", ".pdf"]
const splitName = (name) => {
    const i = name.lastIndexOf(".");
    return i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ""];
};

// Date → "14:02:11"
const uhrzeit = (d) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * Scanner-Eingang: Hier landen alle Scans vom Belegscanner. Der Beleg wird
 * erst einsortiert, wenn er benannt und einem Mandanten zugeordnet wurde.
 * Erkennt der Server einen Mandanten im PDF-Text, ist er vorausgewählt.
 *
 * Der Bereich steht immer da, auch leer – so sieht man, dass er abgefragt
 * wird, und kann ihn ohne Neuladen der Seite sofort auffrischen.
 */
export default function ScannerInbox({ files, mandanten, onAssign, onVerwerfen, stand, onAktualisieren }) {
    const [selection, setSelection] = useState({}); // fileName → mandantNr
    const [names, setNames]         = useState({}); // fileName → neuer Name (ohne Endung)
    const [busy, setBusy]           = useState(null);
    const [laedt, setLaedt]         = useState(false);
    // Scan, bei dem der Papierkorb einmal angetippt wurde und auf Bestätigung wartet
    const [bestaetigen, setBestaetigen] = useState(null);

    const aktualisieren = async () => {
        if (laedt || !onAktualisieren) return;
        setLaedt(true);
        try { await onAktualisieren(); } finally { setLaedt(false); }
    };

    // Scans kommen aus zwei Quellen: dem lokalen Ordner und Google Drive
    const schluessel = (f) => (f.quelle === "drive" ? `drive:${f.id}` : f.name);

    const preview = async (f) => {
        try {
            const pfad = f.quelle === "drive"
                ? `/api/drive/file?id=${encodeURIComponent(f.id)}`
                : `/api/scan/file?name=${encodeURIComponent(f.name)}`;
            const res = await lokalFetch(pfad);
            if (!res.ok) return;
            const url = URL.createObjectURL(await res.blob());
            window.open(url, "_blank");
        } catch { /* Vorschau optional */ }
    };

    // gewählter Mandant – Fallback auf den Server-Vorschlag
    const selectedNr = (f) => selection[schluessel(f)] ?? f.vorschlag?.nr ?? "";

    const assign = async (f) => {
        const nr = selectedNr(f);
        if (!nr) return;
        const [origBase] = splitName(f.name);
        const newBase = (names[schluessel(f)] ?? origBase).trim();
        setBusy(schluessel(f));
        await onAssign(f, nr, newBase && newBase !== origBase ? newBase : null);
        setBusy(null);
    };

    // Entfernen in zwei Schritten: Der erste Tipp macht den Knopf rot, erst
    // der zweite entfernt. Ohne zweiten Tipp stellt er sich nach ein paar
    // Sekunden zurück, damit kein "scharfer" Knopf stehen bleibt.
    const verwerfen = async (f) => {
        const k = schluessel(f);
        if (bestaetigen !== k) {
            setBestaetigen(k);
            setTimeout(() => setBestaetigen((aktuell) => (aktuell === k ? null : aktuell)), 4000);
            return;
        }
        setBestaetigen(null);
        setBusy(k);
        await onVerwerfen?.(f);
        setBusy(null);
    };

    const leer = files.length === 0;

    return (
        <div style={{ background: leer ? "#fff" : "#fffbeb", border: `1px solid ${leer ? "#e8e4dc" : "#fcd34d"}`, borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderBottom: `1px solid ${leer ? "#f0ece4" : "#fde68a"}`, flexWrap: "wrap" }}>
                <i className="bi bi-printer" style={{ color: leer ? "#9ca3af" : "#b45309", fontSize: 16 }} />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0b2e44" }}>Scanner-Eingang</h2>
                <span style={{ background: leer ? "#f3f4f6" : "#fde68a", color: leer ? "#6b7280" : "#92400e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9 }}>{files.length}</span>

                {/* Stand der letzten Abfrage und sofortiges Auffrischen */}
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {stand?.zeit && (
                        <span style={{ fontSize: 11, color: "#9ca3af" }} title="Wird automatisch regelmäßig neu abgefragt">
                            Stand {uhrzeit(stand.zeit)}
                        </span>
                    )}
                    <button onClick={aktualisieren} disabled={laedt} title="Jetzt nach neuen Scans sehen"
                            style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, color: "#6b7280", fontSize: 11.5, fontWeight: 500, padding: "4px 9px", cursor: laedt ? "default" : "pointer", fontFamily: "inherit" }}>
                        <i className="bi bi-arrow-clockwise" style={{ display: "inline-block", animation: laedt ? "drehen .8s linear infinite" : "none" }} />
                        Aktualisieren
                    </button>
                </span>
            </div>
            <style>{`@keyframes drehen { to { transform: rotate(360deg); } }`}</style>

            {/* Eine Quelle antwortet nicht – sonst sähe das aus wie "nichts Neues" */}
            {(stand?.driveFehler || stand?.lokalFehler) && (
                <div style={{ padding: "8px 20px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 11.5, color: "#b91c1c", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="bi bi-exclamation-triangle-fill" />
                    {stand.driveFehler && stand.lokalFehler
                        ? "Weder Google Drive noch der Scan-Server antworten – neue Scans werden gerade nicht angezeigt."
                        : stand.driveFehler
                            ? "Google Drive antwortet gerade nicht – Scans von dort fehlen in der Liste."
                            : "Der Scan-Server antwortet nicht – lokale Scans fehlen in der Liste."}
                </div>
            )}

            {leer ? (
                <div style={{ padding: "18px 20px", fontSize: 12.5, color: "#9ca3af", display: "flex", alignItems: "center", gap: 10 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 18 }} />
                    <span>Keine neuen Scans. Was im Scanner-Ordner oder in Google Drive ankommt, erscheint hier von selbst.</span>
                </div>
            ) : (
                <div style={{ padding: "8px 20px", fontSize: 11.5, color: "#92400e", borderBottom: "1px solid #fef3c7" }}>
                    Beleg benennen und Mandanten zuordnen – erst dann wird er einsortiert.
                </div>
            )}

            {files.map((f, i) => {
                const [origBase, ext] = splitName(f.name);
                const k = schluessel(f);
                return (
                    <div key={k}
                         style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: i < files.length - 1 ? "1px solid #fef3c7" : "none", flexWrap: "wrap" }}>
                        <FileIcon type={ext.toLowerCase() === ".pdf" ? "pdf" : "image"} />
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input type="text" value={names[k] ?? origBase}
                                       onChange={(e) => setNames((prev) => ({ ...prev, [k]: e.target.value }))}
                                       placeholder="Belegname…"
                                       style={{ flex: 1, minWidth: 120, padding: "6px 10px", border: "1px solid #fcd34d", borderRadius: 7, fontSize: 12.5, fontWeight: 500, color: "#111827", background: "#fff", outline: "none" }} />
                                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{ext}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                {/* Herkunft, damit klar ist wo der Scan liegt */}
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: f.quelle === "drive" ? "#1d4ed8" : "#6b7280" }}>
                                    <i className={`bi ${f.quelle === "drive" ? "bi-cloud" : "bi-hdd"}`} />
                                    {f.quelle === "drive" ? "Drive" : "Lokal"}
                                </span>
                                · {f.size} · {f.createdAt}
                                {f.vorschlag && <span style={{ color: "#b45309" }}>· Vorschlag: {f.vorschlag.name}</span>}
                            </div>
                        </div>
                        <button onClick={() => preview(f)} title="Vorschau öffnen"
                                style={{ background: "none", border: "1px solid #fcd34d", borderRadius: 7, color: "#92400e", fontSize: 13, padding: "6px 10px", cursor: "pointer" }}>
                            <i className="bi bi-eye" />
                        </button>
                        {/* Auswahl, Speichern und Löschen bleiben als Gruppe
                            zusammen – bricht die Zeile um, dann nur als Ganzes */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px", minWidth: 0 }}>
                            <select value={selectedNr(f)}
                                    onChange={(e) => setSelection((prev) => ({ ...prev, [k]: e.target.value }))}
                                    style={{ flex: 1, minWidth: 0, padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#fff", outline: "none" }}>
                                <option value="">Mandant wählen…</option>
                                {mandanten.map((m) => (
                                    <option key={m.nr} value={m.nr}>{m.name} ({m.nr})</option>
                                ))}
                            </select>
                            <button onClick={() => assign(f)}
                                    disabled={!selectedNr(f) || busy === k}
                                    style={{ flexShrink: 0, padding: "7px 14px", background: selectedNr(f) ? "#fd8f19" : "#e5e7eb", border: "none", borderRadius: 7, color: selectedNr(f) ? "#0b2e44" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: selectedNr(f) ? "pointer" : "default" }}>
                                {busy === k ? "…" : "Speichern"}
                            </button>
                            {onVerwerfen && (
                                <button onClick={() => verwerfen(f)} disabled={busy === k}
                                        title={bestaetigen === k ? "Nochmal tippen zum Entfernen" : "Scan aus dem Eingang entfernen"}
                                        style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: bestaetigen === k ? "7px 11px" : "7px 10px", background: bestaetigen === k ? "#dc2626" : "#fff", border: `1px solid ${bestaetigen === k ? "#dc2626" : "#fca5a5"}`, borderRadius: 7, color: bestaetigen === k ? "#fff" : "#dc2626", fontSize: 12, fontWeight: 600, cursor: busy === k ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .15s" }}>
                                    <i className="bi bi-trash3" />
                                    {bestaetigen === k && "Wirklich?"}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
