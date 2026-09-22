import { useState } from "react";
import { mandantAnlegen, alsAnmeldename, fehlerText } from "../api";

/**
 * Dialog zum Anlegen eines Mandanten.
 *
 * Als Steuerberater:in wird der neue Mandant der eigenen Kennung zugewiesen,
 * damit er anschließend in der eigenen Liste steht. Die Schnittstelle dahinter
 * steckt in api.js (mandantAnlegen) – das Backend baut sie gerade erst.
 */

const LEER = { vorname: "", nachname: "", email: "", passwort: "" };

const FELDER = [
  { feld: "vorname",  label: "Vorname",       typ: "text",  autoFocus: true },
  { feld: "nachname", label: "Nachname",      typ: "text" },
  { feld: "email",    label: "E-Mail",        typ: "email", breit: true },
  { feld: "passwort", label: "Startpasswort", typ: "text",  breit: true },
];

export default function MandantAnlegenModal({ istBerater, beraterId, isMobile, onClose, onAngelegt, showNotification }) {
  const [werte, setWerte] = useState({ ...LEER });
  const [laeuft, setLaeuft] = useState(false);

  const vollstaendig = FELDER.every(({ feld }) => werte[feld].trim());

  const anlegen = async () => {
    if (!vollstaendig || laeuft) return;
    setLaeuft(true);
    try {
      const { zuweisungOffen } = await mandantAnlegen(werte, istBerater ? beraterId : null);
      onAngelegt?.();
      showNotification?.(zuweisungOffen
          ? `${werte.vorname} ${werte.nachname} angelegt – erscheint nach der Zuweisung durch einen Administrator`
          : `Mandant ${werte.vorname} ${werte.nachname} angelegt ✓`, zuweisungOffen ? "info" : "success");
      onClose();
    } catch (e) {
      const meldung =
          e.status === 403 ? "Nur Administratoren dürfen Mandanten anlegen – das Backend muss die Rolle noch freigeben."
          : e.status === 404 ? "Das Backend kennt das Anlegen von Mandanten noch nicht."
          : `Anlegen fehlgeschlagen: ${fehlerText(e)}`;
      showNotification?.(meldung, "error");
      setLaeuft(false);
    }
  };

  const feldStil = {
    width: "100%", padding: "8px 11px", border: "1px solid #e5e7eb", borderRadius: 8,
    fontSize: 13, color: "#111827", background: "#f9fafb", outline: "none", fontFamily: "inherit",
  };

  return (
      <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 16 : 24 }}
           onClick={(e) => { if (e.target === e.currentTarget && !laeuft) onClose(); }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(11,46,68,.55)", backdropFilter: "blur(4px)" }}
             onClick={() => !laeuft && onClose()} />

        <div style={{ position: "relative", width: "100%", maxWidth: 460, background: "#fff", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,.22)", overflow: "hidden", animation: "fadeUp .2s ease" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid #f0ece4" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <i className="bi bi-person-plus" style={{ color: "#18537a", fontSize: 16 }} />
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0b2e44" }}>Mandant anlegen</h2>
            </div>
            <button onClick={onClose} disabled={laeuft}
                    style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 30, height: 30, flexShrink: 0, cursor: laeuft ? "default" : "pointer", fontSize: 15, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-x" />
            </button>
          </div>

          <div style={{ padding: "18px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              {FELDER.map(({ feld, label, typ, breit, autoFocus }) => (
                  <label key={feld} style={{ display: "block", gridColumn: breit && !isMobile ? "1 / -1" : "auto" }}>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#9ca3af", letterSpacing: ".06em", marginBottom: 5, textTransform: "uppercase" }}>{label}</span>
                    <input type={typ} value={werte[feld]} autoFocus={autoFocus} disabled={laeuft}
                           onChange={(e) => setWerte((p) => ({ ...p, [feld]: e.target.value }))}
                           onKeyDown={(e) => e.key === "Enter" && anlegen()}
                           style={feldStil} />
                  </label>
              ))}
            </div>

            {/* Das Backend verlangt einen Anmeldenamen – er wird aus dem Namen
                gebildet und hier gezeigt, damit er nicht überrascht */}
            {(werte.vorname.trim() || werte.nachname.trim()) && (
                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 12 }}>
                  Anmeldename: <span style={{ fontFamily: "monospace", color: "#18537a" }}>{alsAnmeldename(werte.vorname, werte.nachname) || "—"}</span>
                </p>
            )}

            <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5, marginTop: 10 }}>
              {istBerater
                  ? "Der Mandant wird Ihnen zugewiesen und erscheint danach in Ihrer Liste. "
                  : "Die Zuordnung zu einer Steuerberater:in nehmen Sie in den Einstellungen vor. "}
              Er meldet sich mit E-Mail und Startpasswort an – geben Sie ihm das Passwort persönlich
              weiter, die App verschickt keine Einladung.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid #f0ece4", background: "#fafaf8" }}>
            <button onClick={onClose} disabled={laeuft}
                    style={{ padding: "9px 16px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#374151", cursor: laeuft ? "default" : "pointer", fontFamily: "inherit" }}>
              Abbrechen
            </button>
            <button onClick={anlegen} disabled={!vollstaendig || laeuft}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: vollstaendig && !laeuft ? "#18537a" : "#e5e7eb", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: vollstaendig && !laeuft ? "#fff" : "#9ca3af", cursor: vollstaendig && !laeuft ? "pointer" : "default", fontFamily: "inherit" }}>
              <i className={laeuft ? "bi bi-hourglass" : "bi bi-plus-lg"} /> {laeuft ? "Wird angelegt…" : "Anlegen"}
            </button>
          </div>
        </div>
      </div>
  );
}
