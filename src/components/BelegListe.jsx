import FileIcon from "./FileIcon";
import StatusBadge from "./StatusBadge";
import KategorieChips from "./KategorieChips";
import { trefferFeld } from "../utils/belegFilter";

/**
 * Belegliste – am Schreibtisch eine Tabelle, am Handy eine Karte je Beleg.
 * Die sechs Spalten passen auf einem Telefon nicht nebeneinander, deshalb
 * stehen dort Name, Datum, Status und Betrag untereinander.
 *
 * Ein Klick öffnet den Beleg, das Stift-Symbol öffnet ihn gleich in der
 * Bearbeitungsansicht – dort lassen sich Name und Belegdaten ändern.
 */

const SPALTEN = "2.5fr 1fr 1fr 1fr 1fr 60px";

export default function BelegListe({ docs, isMobile, query, onOpen, onEdit, leerAnzeige }) {
  if (!docs.length) return leerAnzeige;

  const StiftKnopf = ({ doc }) => (
      <button title="Beleg bearbeiten"
              onClick={(e) => { e.stopPropagation(); onEdit?.(doc); }}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", padding: 4, flexShrink: 0 }}>
        <i className="bi bi-pencil" />
      </button>
  );

  /* ── Handy: eine Karte je Beleg ─────────────────────────────── */
  if (isMobile) {
    return docs.map((doc, i) => {
      const treffer = trefferFeld(doc, query);
      return (
          <div key={doc.id} onClick={() => onOpen?.(doc)}
               style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: i < docs.length - 1 ? "1px solid #f9f7f3" : "none", alignItems: "flex-start" }}>
            <FileIcon type={doc.type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.name}
              </div>
              <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>
                {doc.uploadedAt} · {doc.size}
                {treffer && <span style={{ color: "#b45309" }}> · {treffer.label}: {treffer.wert}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <StatusBadge status={doc.status} kiLaeuft={doc.kiLaeuft} />
                <KategorieChips doc={doc} max={1} />
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "#111827" }}>{doc.amount}</span>
              </div>
            </div>
            <StiftKnopf doc={doc} />
          </div>
      );
    });
  }

  /* ── Schreibtisch: Tabelle ──────────────────────────────────── */
  return docs.map((doc, i) => {
    const conf = doc.confidence;
    const treffer = trefferFeld(doc, query);
    const confColor = !conf ? "#d1d5db" : conf >= 85 ? "#16a34a" : conf >= 65 ? "#d97706" : "#dc2626";
    return (
        <div key={doc.id} onClick={() => onOpen?.(doc)}
             style={{ display: "grid", gridTemplateColumns: SPALTEN, padding: "12px 20px", borderBottom: i < docs.length - 1 ? "1px solid #f9f7f3" : "none", alignItems: "center", cursor: "pointer", transition: "background .12s" }}
             onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf8")}
             onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          {/* Abstand rechts, damit der Stift nicht an der Datumsspalte klebt */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, paddingRight: 18 }}>
            <FileIcon type={doc.type} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.name}
              </div>
              <div style={{ fontSize: 10.5, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.size}
                {/* Zeigt an, wo der Suchbegriff steckt, wenn nicht im Dateinamen */}
                {treffer && <span style={{ color: "#b45309" }}> · {treffer.label}: {treffer.wert}</span>}
              </div>
            </div>
            <StiftKnopf doc={doc} />
          </div>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{doc.uploadedAt}</span>
          <KategorieChips doc={doc} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{doc.amount}</span>
          <StatusBadge status={doc.status} kiLaeuft={doc.kiLaeuft} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {conf ? (<>
              <div style={{ flex: 1, height: 4, background: "#f0ece4", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${conf}%`, background: confColor, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: confColor, minWidth: 24 }}>{conf}%</span>
            </>) : <span style={{ fontSize: 10, color: "#d1d5db" }}>—</span>}
          </div>
        </div>
    );
  });
}

export { SPALTEN };
