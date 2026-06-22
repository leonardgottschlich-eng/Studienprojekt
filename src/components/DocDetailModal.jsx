import { useState } from 'react';
import FileIcon from './FileIcon';
import StatusBadge from './StatusBadge';

function ConfidenceRing({ value }) {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value >= 85 ? "#16a34a" : value >= 65 ? "#d97706" : "#dc2626";
  const bg = value >= 85 ? "#dcfce7" : value >= 65 ? "#fef3c7" : "#fee2e2";
  const label = value >= 85 ? "Hoch" : value >= 65 ? "Mittel" : "Niedrig";
  return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ position: "relative", width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={r} fill="none" stroke="#f0ece4" strokeWidth="8" />
            <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 44 44)" style={{ transition: "stroke-dasharray .6s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}%</span>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "3px 10px", borderRadius: 12 }}>
        KI-Konfidenz: {label}
      </span>
        <p style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", maxWidth: 160, lineHeight: 1.4 }}>
          Plausibilitätsscore der extrahierten Belegdaten
        </p>
      </div>
  );
}

/* ── Scan Preview ────────────────────────────────────────────── */
function ScanPreview({ doc }) {
  if (doc.scanPreview === "totalenergies") {
    return (
        <div style={{ background: "#fff", borderRadius: 4, padding: "28px 24px", fontFamily: "'Courier New', monospace", fontSize: 11.5, lineHeight: 1.7, color: "#1a1a1a", boxShadow: "0 2px 12px rgba(0,0,0,.08)", minHeight: "100%", filter: "contrast(1.05)", position: "relative" }}>
          <div style={{ position: "absolute", top: 10, left: 10, width: 30, height: 3, background: "#888", borderRadius: 2, transform: "rotate(-10deg)" }} />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>TotalEnergies Mertert</div>
            <div>48, Route de Wasserbillig</div>
            <div>L-6686 Mertert</div>
            <div>Tel: 00352-748478</div>
            <div style={{ fontSize: 10, color: "#555" }}>Öffnung: Montag bis Sonntag 6h00–22h00</div>
            <div>MwSt-Nr: LU18678765</div>
          </div>
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, letterSpacing: 1, marginBottom: 4 }}>KUNDENBELEG</div>
          <div style={{ textAlign: "center", marginBottom: 12, fontSize: 10 }}>Genehmigt</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 8px", borderTop: "1px solid #ccc", paddingTop: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700 }}>ARTIKEL</span><span style={{ fontSize: 10, fontWeight: 700 }}>MWST</span><span style={{ fontSize: 10, fontWeight: 700 }}>BETRAG</span>
            <span>*Eurosuper</span><span>4</span><span>€ 70,73</span>
            <span style={{ fontSize: 9, color: "#555", gridColumn: "1/4" }}>(ZP 5; 39,45 l × € 1,793/l)</span>
            <span>MONSTER JUICE VIK. B</span><span>1</span><span>€ 1,99</span>
          </div>
          <div style={{ borderTop: "1px dashed #aaa", marginBottom: 6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
            <span>SUMME</span><span>€ 72,72</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span>Mastercard</span><span>€ 72,72</span>
          </div>
          <div style={{ fontSize: 9.5, color: "#444", borderTop: "1px solid #ccc", paddingTop: 8, marginBottom: 8 }}>
            <div>MASTERCARD: 537428******2640 OT</div>
            <div>PAN Folgenummer: 00</div>
            <div>Rest.: Kontaktlos bearbeitet</div>
            <div>Autorisierung: On-line</div>
            <div>PIN geprüft</div>
            <div>STAN: 147965 | Autor.-code: 134908</div>
            <div>Händler ID: ***77187</div>
            <div>VERKAUF – Genehmigt</div>
          </div>
          <div style={{ borderTop: "1px solid #ccc", paddingTop: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>MASTERCARD</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", fontSize: 9.5, gap: 2 }}>
              <span style={{ fontWeight: 600 }}>MwSt.</span><span style={{ fontWeight: 600 }}>Art %</span><span style={{ fontWeight: 600 }}>Netto</span><span style={{ fontWeight: 600 }}>Betrag</span>
              <span>4</span><span>17,00</span><span>€ 60,45</span><span>€ 10,28</span>
              <span>1</span><span>3,00</span><span>€ 1,93</span><span>€ 0,06</span>
            </div>
          </div>
          <div style={{ fontSize: 9.5, color: "#555", borderTop: "1px solid #ccc", paddingTop: 8 }}>
            <div>01-05-2026 13:49:21 – T4 0943120093</div>
            <div>12-342944-65469427 / 1882</div>
          </div>
          <div style={{ marginTop: 14, fontSize: 9, color: "#777", borderTop: "1px dashed #ccc", paddingTop: 8, textAlign: "center" }}>
            <div>Keine Rückerstattung</div>
            <div>Umtausch innerhalb von 15 Tagen</div>
            <div style={{ marginTop: 6 }}>Dieser Beleg gilt als Rechnung</div>
            <div>Merci et bonne route 🚗</div>
          </div>
        </div>
    );
  }

  // Generische Scan-Vorschau für alle anderen Belege
  const lines = [
    { w: "60%", bold: true }, { w: "40%" }, { w: "50%" }, { w: "30%" }, { w: "0%", h: 10 },
    { w: "55%", bold: true, center: true }, { w: "0%", h: 8 },
    { w: "100%", thin: true }, { w: "90%" }, { w: "75%" }, { w: "85%" }, { w: "70%" },
    { w: "100%", thin: true }, { w: "0%", h: 8 },
    { w: "50%", bold: true }, { w: "0%", h: 12 },
    { w: "95%" }, { w: "80%" }, { w: "88%" }, { w: "72%" }, { w: "0%", h: 8 },
    { w: "100%", thin: true },
    { w: "40%", bold: true }, { w: "55%" }, { w: "45%" },
    { w: "0%", h: 10 }, { w: "60%", thin: true }, { w: "35%", bold: true, right: true },
    { w: "0%", h: 16 }, { w: "70%", thin: true },
    { w: "55%" }, { w: "48%" }, { w: "62%" },
  ];
  return (
      <div style={{ background: "#fff", borderRadius: 4, padding: "28px 24px", boxShadow: "0 2px 12px rgba(0,0,0,.08)", minHeight: "100%", position: "relative" }}>
        <div style={{ position: "absolute", top: 10, left: 10, width: 26, height: 3, background: "#aaa", borderRadius: 2, transform: "rotate(-8deg)" }} />
        {lines.map((l, i) => l.w === "0%" ? (
            <div key={i} style={{ height: l.h }} />
        ) : (
            <div key={i} style={{
              height: l.bold ? 9 : l.thin ? 1 : 7, width: l.w,
              background: l.thin ? "#ddd" : l.bold ? "#2a2a2a" : "#888",
              borderRadius: 3, marginBottom: l.bold ? 7 : 5,
              marginLeft: l.right ? "auto" : l.center ? "auto" : 0,
              marginRight: l.right ? 0 : l.center ? "auto" : 0,
              opacity: l.thin ? 1 : undefined,
            }} />
        ))}
      </div>
  );
}


/* ── Einzelnes Datenfeld (editierbar) ──────────────────────────── */
function FieldRow({ label, fieldKey, wide, editMode, edited, setEdited, ed }) {
  const fieldStyle = {
    width: "100%", padding: "7px 10px", border: "1px solid #e5e7eb",
    borderRadius: 7, fontSize: 12.5, color: "#111827", background: "#f9fafb", outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 3, display: "block" };
  return (
      <div style={{ gridColumn: wide ? "1 / -1" : undefined }}>
        <span style={labelStyle}>{label.toUpperCase()}</span>
        {editMode ? (
            <input style={fieldStyle} value={edited[fieldKey] ?? ""} onChange={e => setEdited(p => ({ ...p, [fieldKey]: e.target.value }))} />
        ) : (
            <div style={{ fontSize: 12.5, color: "#111827", fontWeight: 500, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>{ed[fieldKey] || "—"}</div>
        )}
      </div>
  );
}

export default function DocDetailModal({ doc, onClose, onConfirm, onDiscard }) {
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState({ ...doc.extractedData });
  const ed = doc.extractedData;

  const fieldStyle = {
    width: "100%", padding: "7px 10px", border: "1px solid #e5e7eb",
    borderRadius: 7, fontSize: 12.5, color: "#111827", background: "#f9fafb", outline: "none",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 3, display: "block" };


  return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "stretch" }}
           onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        {/* Backdrop */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(11,46,68,.55)", backdropFilter: "blur(4px)" }} onClick={onClose} />

        {/* Modal panel */}
        <div style={{ position: "relative", margin: "auto", width: "min(92vw, 1080px)", maxHeight: "92vh", background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", animation: "fadeUp .25s ease", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f0ece4", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <FileIcon type={doc.type} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0b2e44" }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Hochgeladen am {doc.uploadedAt} · {doc.size}</div>
              </div>
              <StatusBadge status={doc.status} />
            </div>
            <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-x" />
            </button>
          </div>

          {/* Body */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* Left: Scan */}
            <div style={{ width: "42%", flexShrink: 0, background: "#f5f3ef", borderRight: "1px solid #ede9e0", overflowY: "auto", padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 12 }}>ORIGINALDOKUMENT</div>
              <ScanPreview doc={doc} />
            </div>

            {/* Right: Extracted data */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Confidence + header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".08em", marginBottom: 6 }}>KI-EXTRAHIERTE DATEN</div>
                  <p style={{ fontSize: 12, color: "#6b7280", maxWidth: 320, lineHeight: 1.5 }}>
                    Die folgenden Felder wurden automatisch aus dem Beleg extrahiert. Bitte prüfen und ggf. korrigieren.
                  </p>
                </div>
                <ConfidenceRing value={doc.confidence} />
              </div>

              {/* Fields grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", marginBottom: 20 }}>
                <FieldRow label="Aussteller" fieldKey="aussteller" wide editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="Adresse" fieldKey="adresse" wide editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="USt-IdNr." fieldKey="ustIdNr" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="Datum" fieldKey="datum" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                {ed.uhrzeit && <FieldRow label="Uhrzeit" fieldKey="uhrzeit" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />}
                <FieldRow label="Belegnummer" fieldKey="rechnungsnr" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                <FieldRow label="Zahlungsart" fieldKey="zahlungsart" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
              </div>

              {/* Positionen */}
              <div style={{ marginBottom: 20 }}>
                <span style={labelStyle}>POSITIONEN</span>
                <div style={{ background: "#fafaf8", borderRadius: 8, border: "1px solid #f0ece4", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "7px 12px", background: "#f5f3ef", borderBottom: "1px solid #ede9e0" }}>
                    {["Bezeichnung", "Menge", "Einzelpreis", "Betrag"].map(h => (
                        <span key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: ".05em" }}>{h.toUpperCase()}</span>
                    ))}
                  </div>
                  {(editMode ? edited.positionen : ed.positionen)?.map((p, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 12px", borderBottom: i < ed.positionen.length - 1 ? "1px solid #f0ece4" : "none", alignItems: "center" }}>
                        {editMode ? (
                            ["bezeichnung", "menge", "einzelpreis", "betrag"].map(k => (
                                <input key={k} style={{ ...fieldStyle, padding: "4px 6px", fontSize: 11.5 }}
                                       value={edited.positionen[i][k]}
                                       onChange={e => setEdited(prev => {
                                         const pos = prev.positionen.map((pp, ii) => ii === i ? { ...pp, [k]: e.target.value } : pp);
                                         return { ...prev, positionen: pos };
                                       })} />
                            ))
                        ) : (
                            <>
                              <span style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{p.bezeichnung}</span>
                              <span style={{ fontSize: 11.5, color: "#6b7280" }}>{p.menge}</span>
                              <span style={{ fontSize: 11.5, color: "#6b7280" }}>{p.einzelpreis}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#0b2e44" }}>{p.betrag}</span>
                            </>
                        )}
                      </div>
                  ))}
                </div>
              </div>

              {/* Beträge */}
              <div style={{ background: "#f5f3ef", borderRadius: 8, padding: "12px 16px", marginBottom: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 20px" }}>
                  <FieldRow label="Nettobetrag" fieldKey="nettoBetrag" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                  <FieldRow label="MwSt-Satz" fieldKey="mwstSatz" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                  <FieldRow label="MwSt-Betrag" fieldKey="mwstBetrag" editMode={editMode} edited={edited} setEdited={setEdited} ed={ed} />
                </div>
                <div style={{ borderTop: "1px solid #e0dbd2", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0b2e44" }}>GESAMTBETRAG</span>
                  {editMode ? (
                      <input style={{ ...fieldStyle, width: 140, textAlign: "right", fontWeight: 700, fontSize: 16 }}
                             value={edited.gesamtBetrag}
                             onChange={e => setEdited(p => ({ ...p, gesamtBetrag: e.target.value }))} />
                  ) : (
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#0b2e44" }}>{ed.gesamtBetrag}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer: Action buttons */}
          <div style={{ flexShrink: 0, padding: "14px 24px", borderTop: "1px solid #f0ece4", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {editMode ? "✏️ Bearbeitungsmodus aktiv — Felder können geändert werden" : "Klicke auf einen Eintrag um Details anzuzeigen"}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {/* Verwerfen */}
              <button onClick={onDiscard}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#fff", border: "1px solid #fca5a5", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer", transition: "all .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <i className="bi bi-trash3" /> Verwerfen
              </button>

              {/* Bearbeiten / Speichern */}
              {editMode ? (
                  <button onClick={() => { setEditMode(false); onConfirm(edited); }}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#18537a", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    <i className="bi bi-floppy" /> Änderungen speichern
                  </button>
              ) : (
                  <button onClick={() => setEditMode(true)}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all .15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <i className="bi bi-pencil" /> Bearbeiten
                  </button>
              )}

              {/* Bestätigen */}
              {!editMode && (
                  <button onClick={() => onConfirm(ed)}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,.3)" }}>
                    <i className="bi bi-check2-circle" /> Bestätigen
                  </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */