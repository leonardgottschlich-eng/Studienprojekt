import { useState } from "react";
import { STATUS_CONFIG } from "../data/mockData";
import { ZEITRAUM_PRESETS, presetZeitraum, aktiveFilter, LEERER_FILTER } from "../utils/belegFilter";

/**
 * Kopfzeile der Belegliste: Volltextsuche über die Beleginhalte plus
 * ausklappbarer Filterbereich für Zeitraum, Status und Kategorie.
 */
export default function BelegSuche({ filter, onChange, kategorien = [], anzahl, gesamt, onExport }) {
    const [offen, setOffen] = useState(false);
    const anzahlFilter = aktiveFilter(filter);

    const set = (aenderung) => onChange({ ...filter, ...aenderung });

    // Schnellauswahl setzt den Zeitraum, eigene Datumseingabe schaltet auf "custom"
    const waehlePreset = (id) => set({ preset: id, ...presetZeitraum(id) });
    const setDatum = (feld, wert) => set({ [feld]: wert, preset: "custom" });

    const zuruecksetzen = () => onChange({ ...LEERER_FILTER, bezug: filter.bezug });

    return (
        <>
            {/* Kopfzeile mit Suchfeld */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 20px", borderBottom: "1px solid #f0ece4", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0b2e44" }}>
                    Hochgeladene Belege
                    <span style={{ marginLeft: 6, background: "#f3f4f6", color: "#6b7280", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 9 }}>
                        {anzahl}{anzahl !== gesamt ? ` / ${gesamt}` : ""}
                    </span>
                </h2>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative" }}>
                        <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 12, pointerEvents: "none" }} />
                        <input
                            type="text"
                            placeholder="Inhalte durchsuchen…"
                            value={filter.query}
                            onChange={(e) => set({ query: e.target.value })}
                            title="Durchsucht Dateiname, Aussteller, Rechnungsnummer, Positionen, Beträge und Klassifikationen"
                            style={{ padding: "6px 26px 6px 28px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#f9fafb", width: 210, outline: "none" }}
                        />
                        {filter.query && (
                            <button onClick={() => set({ query: "" })} title="Suche leeren"
                                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 12, padding: 2 }}>
                                <i className="bi bi-x-circle-fill" />
                            </button>
                        )}
                    </div>

                    <button onClick={() => setOffen((v) => !v)}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", border: `1px solid ${offen || anzahlFilter ? "#18537a" : "#e5e7eb"}`, background: offen || anzahlFilter ? "#eef4f8" : "#f9fafb", color: offen || anzahlFilter ? "#18537a" : "#6b7280", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                        <i className="bi bi-sliders" style={{ fontSize: 12 }} />
                        Filter
                        {anzahlFilter > 0 && (
                            <span style={{ background: "#18537a", color: "#fff", fontSize: 9.5, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>{anzahlFilter}</span>
                        )}
                    </button>

                    {/* Export der aktuell angezeigten Belege */}
                    {onExport && (
                        <button onClick={() => onExport(filter)} disabled={!anzahl}
                                title={anzahl ? `${anzahl} angezeigte Belege exportieren` : "Keine Belege zum Exportieren"}
                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", border: "1px solid #e5e7eb", background: anzahl ? "#f9fafb" : "#f3f4f6", color: anzahl ? "#6b7280" : "#d1d5db", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: anzahl ? "pointer" : "default", fontFamily: "inherit" }}>
                            <i className="bi bi-box-arrow-down" style={{ fontSize: 12 }} />
                            Export
                        </button>
                    )}
                </div>
            </div>

            {/* Filterbereich */}
            {offen && (
                <div style={{ padding: "14px 20px", background: "#fafaf8", borderBottom: "1px solid #f0ece4", animation: "dropDown .18s ease" }}>

                    {/* Zeitraum-Schnellauswahl */}
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 7 }}>ZEITRAUM</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {ZEITRAUM_PRESETS.map((p) => {
                            const aktiv = filter.preset === p.id;
                            return (
                                <button key={p.id} onClick={() => waehlePreset(p.id)}
                                        style={{ padding: "5px 11px", borderRadius: 20, border: `1px solid ${aktiv ? "#18537a" : "#e5e7eb"}`, background: aktiv ? "#18537a" : "#fff", color: aktiv ? "#fff" : "#6b7280", fontSize: 11.5, fontWeight: aktiv ? 600 : 500, cursor: "pointer" }}>
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Von / Bis / Datumsbezug */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 12 }}>
                        <Feld label="Von">
                            <input type="date" value={filter.von} max={filter.bis || undefined}
                                   onChange={(e) => setDatum("von", e.target.value)} style={inputStil} />
                        </Feld>
                        <Feld label="Bis">
                            <input type="date" value={filter.bis} min={filter.von || undefined}
                                   onChange={(e) => setDatum("bis", e.target.value)} style={inputStil} />
                        </Feld>
                        <Feld label="Datum bezieht sich auf">
                            <select value={filter.bezug} onChange={(e) => set({ bezug: e.target.value })} style={inputStil}>
                                <option value="beleg">Belegdatum</option>
                                <option value="upload">Upload-Datum</option>
                            </select>
                        </Feld>
                    </div>

                    {/* Status / Kategorie */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                        <Feld label="Status">
                            <select value={filter.status} onChange={(e) => set({ status: e.target.value })} style={inputStil}>
                                <option value="alle">Alle Status</option>
                                {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                                    <option key={id} value={id}>{cfg.label}</option>
                                ))}
                            </select>
                        </Feld>
                        <Feld label="Kategorie">
                            <select value={filter.kategorie} onChange={(e) => set({ kategorie: e.target.value })} style={inputStil}>
                                <option value="alle">Alle Kategorien</option>
                                {kategorien.map((k) => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </Feld>
                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                            <button onClick={zuruecksetzen}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, color: "#6b7280", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                                <i className="bi bi-arrow-counterclockwise" /> Zurücksetzen
                            </button>
                        </div>
                    </div>

                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10, lineHeight: 1.5 }}>
                        Gesucht wird in Dateiname, Aussteller, Rechnungsnummer, Adresse, Zahlungsart, Klassifikationen,
                        einzelnen Positionen und Beträgen. Mehrere Begriffe werden mit „und“ verknüpft,
                        Anführungszeichen suchen die genaue Wortfolge. Belege ohne erfasstes Belegdatum werden
                        nach ihrem Upload-Datum einsortiert.
                    </p>
                </div>
            )}
        </>
    );
}

const inputStil = { width: "100%", padding: "7px 9px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#fff", outline: "none", fontFamily: "inherit" };

function Feld({ label, children }) {
    return (
        <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 5, textTransform: "uppercase" }}>{label}</span>
            {children}
        </label>
    );
}
