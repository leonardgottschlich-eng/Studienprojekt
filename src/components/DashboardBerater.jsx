import { useState } from "react";
import MandantAvatar from "./MandantAvatar";
import StatTile from "./StatTile";
import { belegStats, mandantenNachAufwand } from "../lib/stats";

/** Kleines Zahlen-Etikett je Belegzustand, z. B. "3 zu erfassen". */
function Zaehler({ wert, label, farbe, hintergrund }) {
  return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: wert ? hintergrund : "#f6f6f4", color: wert ? farbe : "#b6bcc4", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{wert}</span>{label}
      </span>
  );
}

const begruessung = () => {
  const stunde = new Date().getHours();
  if (stunde < 11) return "Guten Morgen";
  if (stunde < 18) return "Guten Tag";
  return "Guten Abend";
};

/**
 * Startseite für Kanzlei-Konten (Admin und Steuerberater): Überblick über
 * alle Mandanten, den Scanner-Eingang und die offenen Belege.
 */
export default function DashboardBerater({ user, mandanten = [], allDocs = {}, scanInboxCount = 0, zuordnungUnbekannt, isMobile, onSelectMandant, onScannerEingang }) {
  const [suche, setSuche] = useState("");

  const belegeVon = (m) => allDocs[m.id] || [];
  const gesamt     = mandanten.reduce((summe, m) => summe + belegeVon(m).length, 0);
  const ausstehend = mandanten.reduce((summe, m) => summe + belegStats(belegeVon(m)).ausstehend, 0);
  const vorname    = (user?.name || "").split(" ")[0];

  // Nach Arbeitsaufwand sortiert: die meisten unerledigten Belege zuerst.
  // "Unerledigt" zählt auch Belege in Prüfung mit, nicht nur die noch
  // nicht erfassten – siehe src/lib/stats.js.
  const sortiert = mandantenNachAufwand(mandanten, allDocs).filter(({ mandant }) =>
      mandant.name.toLowerCase().includes(suche.toLowerCase()) ||
      mandant.nr.toLowerCase().includes(suche.toLowerCase())
  );

  return (
      <>
        {/* Begrüßung */}
        <div style={{ marginBottom: 24 }}>
          {!isMobile && (
              <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: "#0b2e44", fontWeight: 400, marginBottom: 3 }}>
                {begruessung()}{vorname ? `, ${vorname}` : ""}
              </h1>
          )}
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            {ausstehend > 0
                ? <>Es {ausstehend === 1 ? "wartet" : "warten"} <span style={{ fontWeight: 600, color: "#b45309" }}>{ausstehend} Beleg{ausstehend !== 1 ? "e" : ""}</span> auf Bearbeitung.</>
                : "Alle Belege sind bearbeitet."}
          </p>
        </div>

        {/* Kennzahlen */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
          <StatTile label="Mandanten"     value={mandanten.length} icon="bi-people"          accent="#18537a" />
          <StatTile label="Belege gesamt" value={gesamt}           icon="bi-file-text"       accent="#0e6655" />
          <StatTile label="Ausstehend"    value={ausstehend}       icon="bi-hourglass-split" accent="#d97706" />
        </div>

        {/* Scanner-Eingang */}
        {scanInboxCount > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
              <i className="bi bi-printer" style={{ color: "#b45309", fontSize: 18 }} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0b2e44" }}>
                  {scanInboxCount} Scan{scanInboxCount !== 1 ? "s" : ""} im Eingang
                </div>
                <div style={{ fontSize: 11.5, color: "#92400e" }}>
                  {zuordnungUnbekannt
                      ? "Kein Mandant erkannt – bitte von Hand zuordnen"
                      : "Benennen und einem Mandanten zuordnen"}
                </div>
              </div>
              <button onClick={onScannerEingang}
                      style={{ padding: "8px 16px", background: "#fd8f19", border: "none", borderRadius: 7, color: "#0b2e44", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Zum Eingang
              </button>
            </div>
        )}

        {/* Mandantenübersicht */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderBottom: "1px solid #f0ece4" }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0b2e44" }}>
                Mandanten
                <span style={{ marginLeft: 6, background: "#f3f4f6", color: "#6b7280", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 9 }}>{sortiert.length}</span>
              </h2>
              {!isMobile && <span style={{ fontSize: 11, color: "#9ca3af" }}>Mandant wählen, um dessen Belege zu öffnen</span>}
            </div>
            <input type="text" placeholder="Mandant suchen…" value={suche} onChange={(e) => setSuche(e.target.value)}
                   style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#374151", background: "#f9fafb", width: 175, maxWidth: "50%", outline: "none", fontFamily: "inherit" }} />
          </div>

          {sortiert.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                {mandanten.length === 0 ? "Keine Mandanten vorhanden." : "Kein Mandant gefunden."}
              </div>
          ) : sortiert.map(({ mandant: m, stats }, i) => {
            return (
                <div key={m.id} onClick={() => onSelectMandant?.(m)}
                     style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < sortiert.length - 1 ? "1px solid #f9f7f3" : "none", cursor: "pointer", transition: "background .12s" }}
                     onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf8")}
                     onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <MandantAvatar m={m} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{m.nr}</div>
                  </div>
                  {isMobile ? (
                      <span style={{ background: stats.unerledigt ? "#fef3c7" : "#f6f6f4", color: stats.unerledigt ? "#b45309" : "#b6bcc4", fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 10, whiteSpace: "nowrap" }}>
                        {stats.unerledigt} offen
                      </span>
                  ) : (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <Zaehler wert={stats.ausstehend}    label="zu erfassen" farbe="#b45309" hintergrund="#fef3c7" />
                        <Zaehler wert={stats.inBearbeitung} label="in Prüfung"  farbe="#1d4ed8" hintergrund="#dbeafe" />
                        <Zaehler wert={stats.analysiert}    label="erledigt"    farbe="#16a34a" hintergrund="#dcfce7" />
                      </div>
                  )}
                  <i className="bi bi-chevron-right" style={{ fontSize: 11, color: "#d1d5db" }} />
                </div>
            );
          })}
        </div>
      </>
  );
}
