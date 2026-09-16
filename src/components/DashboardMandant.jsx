import FileIcon from "./FileIcon";
import StatusBadge from "./StatusBadge";
import KategorieChips from "./KategorieChips";
import StatTile from "./StatTile";

const begruessung = () => {
  const stunde = new Date().getHours();
  if (stunde < 11) return "Guten Morgen";
  if (stunde < 18) return "Guten Tag";
  return "Guten Abend";
};

/**
 * Startseite für Mandanten: eigene Belege im Überblick, die beiden Wege
 * einen Beleg einzureichen und die zuletzt eingegangenen Dokumente.
 */
export default function DashboardMandant({ user, mandant, docs = [], isMobile, onOpenDoc, onZurBelegliste, onUpload, onScan }) {
  const stats = {
    total:      docs.length,
    analysiert: docs.filter((d) => d.status === "analysiert").length,
    ausstehend: docs.filter((d) => d.status === "ausstehend").length,
  };
  const zuletzt = docs.slice(0, 5);
  const vorname = (user?.name || "").split(" ")[0];

  const aktion = {
    display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200,
    background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12,
    padding: "16px 18px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
    transition: "border-color .15s, transform .15s",
  };

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
            {stats.ausstehend > 0
                ? <>Für Sie {stats.ausstehend === 1 ? "ist" : "sind"} aktuell <span style={{ fontWeight: 600, color: "#b45309" }}>{stats.ausstehend} Beleg{stats.ausstehend !== 1 ? "e" : ""}</span> in Bearbeitung.</>
                : "Alle Ihre Belege sind bearbeitet."}
          </p>
        </div>

        {/* Kennzahlen */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
          <StatTile label="Meine Belege" value={stats.total}      icon="bi-file-text"       accent="#18537a" />
          <StatTile label="Analysiert"   value={stats.analysiert} icon="bi-check2"          accent="#16a34a" />
          <StatTile label="Ausstehend"   value={stats.ausstehend} icon="bi-hourglass-split" accent="#d97706" />
        </div>

        {/* Beleg einreichen */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
          <button onClick={onUpload} style={aktion}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#18537a")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e8e4dc")}>
            <i className="bi bi-upload" style={{ fontSize: 20, color: "#18537a" }} />
            <span>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0b2e44" }}>Beleg hochladen</span>
              <span style={{ fontSize: 11.5, color: "#9ca3af" }}>PDF oder Bild vom Gerät wählen</span>
            </span>
          </button>
          <button onClick={onScan} style={aktion}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#fd8f19")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e8e4dc")}>
            <i className="bi bi-camera" style={{ fontSize: 20, color: "#fd8f19" }} />
            <span>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0b2e44" }}>Mit Kamera scannen</span>
              <span style={{ fontSize: 11.5, color: "#9ca3af" }}>Beleg direkt abfotografieren</span>
            </span>
          </button>
        </div>

        {/* Zuletzt eingegangen */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f0ece4" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0b2e44" }}>Zuletzt eingegangen</h2>
            <button onClick={onZurBelegliste}
                    style={{ background: "none", border: "none", color: "#18537a", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              Alle Belege <i className="bi bi-arrow-right" style={{ fontSize: 11 }} />
            </button>
          </div>

          {zuletzt.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                Noch keine Belege eingereicht.
              </div>
          ) : zuletzt.map((doc, i) => (
              <div key={doc.id} onClick={() => onOpenDoc?.(doc)}
                   style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < zuletzt.length - 1 ? "1px solid #f9f7f3" : "none", cursor: "pointer", transition: "background .12s" }}
                   onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf8")}
                   onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <FileIcon type={doc.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{doc.uploadedAt} · {doc.size}</div>
                </div>
                {!isMobile && <KategorieChips doc={doc} max={1} />}
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#111827", minWidth: 62, textAlign: "right" }}>{doc.amount}</span>
                <StatusBadge status={doc.status} />
              </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 14, lineHeight: 1.5 }}>
          Ihre Belege werden von {mandant?.name ? "Ihrer Kanzlei" : "der Kanzlei"} geprüft und klassifiziert.
          Sie können jederzeit weitere Belege einreichen.
        </p>
      </>
  );
}
