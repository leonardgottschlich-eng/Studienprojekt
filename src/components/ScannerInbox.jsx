import { useState } from "react";
import FileIcon from "./FileIcon";

const getToken = () => sessionStorage.getItem("bs_token") || "";

// "Scan_123.pdf" → ["Scan_123", ".pdf"]
const splitName = (name) => {
    const i = name.lastIndexOf(".");
    return i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ""];
};

/**
 * Scanner-Eingang: Hier landen alle Scans vom Belegscanner. Der Beleg wird
 * erst einsortiert, wenn er benannt und einem Mandanten zugeordnet wurde.
 * Erkennt der Server einen Mandanten im PDF-Text, ist er vorausgewählt.
 */
export default function ScannerInbox({ files, mandanten, onAssign }) {
    const [selection, setSelection] = useState({}); // fileName → mandantNr
    const [names, setNames]         = useState({}); // fileName → neuer Name (ohne Endung)
    const [busy, setBusy]           = useState(null);

    if (!files.length) return null;

    const preview = async (name) => {
        try {
            const res = await fetch(`/api/scan/file?name=${encodeURIComponent(name)}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) return;
            const url = URL.createObjectURL(await res.blob());
            window.open(url, "_blank");
        } catch { /* Vorschau optional */ }
    };

    // gewählter Mandant – Fallback auf den Server-Vorschlag
    const selectedNr = (f) => selection[f.name] ?? f.vorschlag?.nr ?? "";

    const assign = async (f) => {
        const nr = selectedNr(f);
        if (!nr) return;
        const [origBase] = splitName(f.name);
        const newBase = (names[f.name] ?? origBase).trim();
        setBusy(f.name);
        await onAssign(f.name, nr, newBase && newBase !== origBase ? newBase : null);
        setBusy(null);
    };

    return (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderBottom: "1px solid #fde68a" }}>
                <i className="bi bi-printer" style={{ color: "#b45309", fontSize: 16 }} />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0b2e44" }}>Scanner-Eingang</h2>
                <span style={{ background: "#fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9 }}>{files.length}</span>
                <span style={{ fontSize: 11.5, color: "#92400e", marginLeft: "auto" }}>Beleg benennen und Mandanten zuordnen – erst dann wird er einsortiert</span>
            </div>

            {files.map((f, i) => {
                const [origBase, ext] = splitName(f.name);
                return (
                    <div key={f.name}
                         style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: i < files.length - 1 ? "1px solid #fef3c7" : "none", flexWrap: "wrap" }}>
                        <FileIcon type={ext.toLowerCase() === ".pdf" ? "pdf" : "image"} />
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input type="text" value={names[f.name] ?? origBase}
                                       onChange={(e) => setNames((prev) => ({ ...prev, [f.name]: e.target.value }))}
                                       placeholder="Belegname…"
                                       style={{ flex: 1, minWidth: 120, padding: "6px 10px", border: "1px solid #fcd34d", borderRadius: 7, fontSize: 12.5, fontWeight: 500, color: "#111827", background: "#fff", outline: "none" }} />
                                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{ext}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3 }}>
                                {f.size} · {f.createdAt}
                                {f.vorschlag && <span style={{ color: "#b45309" }}> · Vorschlag: {f.vorschlag.name}</span>}
                            </div>
                        </div>
                        <button onClick={() => preview(f.name)} title="Vorschau öffnen"
                                style={{ background: "none", border: "1px solid #fcd34d", borderRadius: 7, color: "#92400e", fontSize: 13, padding: "6px 10px", cursor: "pointer" }}>
                            <i className="bi bi-eye" />
                        </button>
                        <select value={selectedNr(f)}
                                onChange={(e) => setSelection((prev) => ({ ...prev, [f.name]: e.target.value }))}
                                style={{ padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#fff", outline: "none" }}>
                            <option value="">Mandant wählen…</option>
                            {mandanten.map((m) => (
                                <option key={m.nr} value={m.nr}>{m.name} ({m.nr})</option>
                            ))}
                        </select>
                        <button onClick={() => assign(f)}
                                disabled={!selectedNr(f) || busy === f.name}
                                style={{ padding: "7px 14px", background: selectedNr(f) ? "#fd8f19" : "#e5e7eb", border: "none", borderRadius: 7, color: selectedNr(f) ? "#0b2e44" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: selectedNr(f) ? "pointer" : "default" }}>
                            {busy === f.name ? "…" : "Speichern"}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
