import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api";
import { istAdmin } from "../settings";

/* ── Bausteine im Stil der Belegverwaltung ─────────────────────── */

function Karte({ icon, titel, beschreibung, nurAdmin, children }) {
  return (
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", marginBottom: 18, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid #f0ece4" }}>
          <i className={`bi ${icon}`} style={{ color: "#18537a", fontSize: 15 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#0b2e44" }}>{titel}</h2>
            {beschreibung && <p style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>{beschreibung}</p>}
          </div>
          {nurAdmin && (
              <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10, whiteSpace: "nowrap" }}>
                <i className="bi bi-shield-lock" style={{ marginRight: 4 }} />Nur Admin
              </span>
          )}
        </div>
        <div style={{ padding: "4px 20px 8px" }}>{children}</div>
      </div>
  );
}

function Zeile({ titel, hinweis, letzte, children }) {
  return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: letzte ? "none" : "1px solid #f9f7f3", flexWrap: "wrap" }}>
        <div style={{ minWidth: 180, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827" }}>{titel}</div>
          {hinweis && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, lineHeight: 1.45 }}>{hinweis}</div>}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>
  );
}

function Schalter({ an, onChange, deaktiviert }) {
  return (
      <button onClick={() => !deaktiviert && onChange(!an)} disabled={deaktiviert}
              aria-pressed={an}
              style={{ width: 42, height: 23, borderRadius: 12, border: "none", padding: 2.5, display: "flex", justifyContent: an ? "flex-end" : "flex-start", alignItems: "center", background: an ? "#16a34a" : "#d1d5db", cursor: deaktiviert ? "default" : "pointer", opacity: deaktiviert ? 0.45 : 1, transition: "background .2s" }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "all .2s" }} />
      </button>
  );
}

const feldStil = {
  padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
  fontSize: 12, color: "#374151", background: "#fff", outline: "none", fontFamily: "inherit",
};

const wertStil = { fontSize: 12.5, color: "#374151", fontWeight: 500 };

function GruppenChip({ gruppe }) {
  const farben = {
    admin:       { bg: "#fef3c7", fg: "#b45309" },
    tax_advisor: { bg: "#dbeafe", fg: "#1d4ed8" },
    client:      { bg: "#dcfce7", fg: "#166534" },
  };
  const { bg, fg } = farben[gruppe] || { bg: "#f3f4f6", fg: "#6b7280" };
  const namen = { admin: "Admin", tax_advisor: "Steuerberater", client: "Mandant", user: "Benutzer" };
  return (
      <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 9, marginRight: 4 }}>
        {namen[gruppe] || gruppe}
      </span>
  );
}

function StatusPunkt({ zustand, textOk, textFehler }) {
  const map = {
    pruefe: { farbe: "#9ca3af", text: "wird geprüft…" },
    ok:     { farbe: "#16a34a", text: textOk },
    fehler: { farbe: "#dc2626", text: textFehler },
  };
  const { farbe, text } = map[zustand] || map.pruefe;
  return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: farbe, fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: farbe, animation: zustand === "pruefe" ? "pulse 1.2s infinite" : "none" }} />
        {text}
      </span>
  );
}

/** Fragt beide Server ab und meldet ihren Zustand zurück */
async function ermittleVerbindungen() {
  let backend = "fehler";
  try {
    await apiFetch("/test-connection", { token: null });
    backend = "ok";
  } catch { /* bleibt "fehler" */ }

  let lokal = "fehler", pfad = "";
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      const d = await res.json();
      lokal = d.running ? "ok" : "fehler";
      pfad = d.basePath || "";
    }
  } catch { /* bleibt "fehler" */ }

  return { backend, lokal, pfad };
}

/** Benutzer und Zuordnungen für den Admin-Bereich holen */
async function holeAdminDaten() {
  try {
    const [u, z] = await Promise.all([apiFetch("/users"), apiFetch("/advisor-clients")]);
    return { benutzer: u.data || [], zuordnungen: z.data || [], fehler: null };
  } catch (e) {
    return { benutzer: [], zuordnungen: [], fehler: e.message };
  }
}

/* ── Einstellungsseite ─────────────────────────────────────────── */

export default function SettingsPage({ user, einstellungen, setEinstellungen, showNotification, isMobile }) {
  const admin = istAdmin(user);
  const [verbindung, setVerbindung] = useState({ backend: "pruefe", lokal: "pruefe", pfad: "" });

  // Admin-Bereich
  const [benutzer, setBenutzer]       = useState([]);
  const [zuordnungen, setZuordnungen] = useState([]);
  const [adminFehler, setAdminFehler] = useState(null);
  const [neu, setNeu]                 = useState({ advisor: "", client: "" });
  const [busy, setBusy]               = useState(false);

  const setzeWert = (schluessel, wert) => setEinstellungen((prev) => ({ ...prev, [schluessel]: wert }));

  // Beim Öffnen der Seite einmal prüfen; das Ergebnis kommt erst nach den
  // Netzwerkabfragen in den State (kein synchrones setState im Effekt).
  useEffect(() => {
    let abgebrochen = false;
    ermittleVerbindungen().then((status) => { if (!abgebrochen) setVerbindung(status); });
    return () => { abgebrochen = true; };
  }, []);

  const pruefeVerbindungen = async () => {
    setVerbindung({ backend: "pruefe", lokal: "pruefe", pfad: "" });
    setVerbindung(await ermittleVerbindungen());
  };

  const uebernehmeAdminDaten = useCallback((d) => {
    if (d.fehler) { setAdminFehler(d.fehler); return; }  // vorhandene Liste stehen lassen
    setBenutzer(d.benutzer);
    setZuordnungen(d.zuordnungen);
    setAdminFehler(null);
  }, []);

  useEffect(() => {
    if (!admin) return;
    let abgebrochen = false;
    holeAdminDaten().then((d) => { if (!abgebrochen) uebernehmeAdminDaten(d); });
    return () => { abgebrochen = true; };
  }, [admin, uebernehmeAdminDaten]);

  const ladeAdminDaten = async () => uebernehmeAdminDaten(await holeAdminDaten());

  const nameVon = (id) => {
    const u = benutzer.find((b) => b.id === id);
    return u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username : `#${id}`;
  };

  const zuordnungAnlegen = async () => {
    if (!neu.advisor || !neu.client) return;
    setBusy(true);
    try {
      await apiFetch("/advisor-clients", {
        method: "POST",
        body: { advisor_user_id: Number(neu.advisor), client_user_id: Number(neu.client), status: "active" },
      });
      setNeu({ advisor: "", client: "" });
      await ladeAdminDaten();
      showNotification("Zuordnung angelegt ✓");
    } catch (e) {
      showNotification(`Anlegen fehlgeschlagen: ${e.message}`, "error");
    }
    setBusy(false);
  };

  const statusUmschalten = async (z) => {
    setBusy(true);
    try {
      await apiFetch(`/advisor-clients/${z.id}`, {
        method: "PATCH",
        body: { status: z.status === "active" ? "inactive" : "active" },
      });
      await ladeAdminDaten();
      showNotification("Status geändert ✓");
    } catch (e) {
      showNotification(`Änderung fehlgeschlagen: ${e.message}`, "error");
    }
    setBusy(false);
  };

  const zuordnungLoeschen = async (z) => {
    setBusy(true);
    try {
      await apiFetch(`/advisor-clients/${z.id}`, { method: "DELETE" });
      await ladeAdminDaten();
      showNotification("Zuordnung gelöscht", "error");
    } catch (e) {
      showNotification(`Löschen fehlgeschlagen: ${e.message}`, "error");
    }
    setBusy(false);
  };

  const berater  = benutzer.filter((b) => b.groups?.includes("tax_advisor"));
  const mandanten = benutzer.filter((b) => b.groups?.includes("client"));

  return (
      <div style={{ width: "100%", maxWidth: 900 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          {!isMobile && <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: "#0b2e44", fontWeight: 400, marginBottom: 3 }}>Einstellungen</h1>}
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            Angemeldet als <span style={{ fontWeight: 600, color: "#18537a" }}>{user?.name}</span>
            {admin && <span style={{ marginLeft: 8, background: "#fef3c7", color: "#b45309", fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 10 }}>Administrator</span>}
          </p>
        </div>

        {/* Profil */}
        <Karte icon="bi-person-circle" titel="Profil" beschreibung="Stammdaten aus der Benutzerverwaltung des Backends">
          <Zeile titel="Name">
            <span style={wertStil}>{user?.name || "—"}</span>
          </Zeile>
          <Zeile titel="E-Mail">
            <span style={wertStil}>{user?.email || "—"}</span>
          </Zeile>
          <Zeile titel="Rolle" hinweis="Bestimmt, welche Einstellungen und Belege sichtbar sind">
            <span>{(user?.groups || []).map((g) => <GruppenChip key={g} gruppe={g} />)}</span>
          </Zeile>
          <Zeile titel="Benutzer-ID" letzte>
            <span style={{ ...wertStil, fontFamily: "monospace", color: "#6b7280" }}>#{user?.id ?? "—"}</span>
          </Zeile>
        </Karte>

        {/* Darstellung & Verhalten */}
        <Karte icon="bi-sliders" titel="Darstellung & Verhalten" beschreibung="Gilt für diesen Browser">
          <Zeile titel="Automatisch aktualisieren"
                 hinweis="Belegliste und Scanner-Eingang regelmäßig im Hintergrund neu laden">
            <Schalter an={einstellungen.autoAktualisieren} onChange={(v) => setzeWert("autoAktualisieren", v)} />
          </Zeile>
          <Zeile titel="Aktualisierungstakt" hinweis="Kürzere Abstände zeigen neue Scans schneller an">
            <select value={einstellungen.intervallSekunden}
                    disabled={!einstellungen.autoAktualisieren}
                    onChange={(e) => setzeWert("intervallSekunden", Number(e.target.value))}
                    style={{ ...feldStil, cursor: einstellungen.autoAktualisieren ? "pointer" : "default", opacity: einstellungen.autoAktualisieren ? 1 : 0.5 }}>
              {[5, 10, 30, 60].map((s) => <option key={s} value={s}>alle {s} Sekunden</option>)}
            </select>
          </Zeile>
          <Zeile titel="Scanner-Eingang anzeigen"
                 hinweis="Bereich für Scans, die noch keinem Mandanten zugeordnet sind">
            <Schalter an={einstellungen.scannerEingangAnzeigen} onChange={(v) => setzeWert("scannerEingangAnzeigen", v)} />
          </Zeile>
          <Zeile titel="Zuletzt gewählten Mandanten merken"
                 hinweis="Beim nächsten Anmelden ist derselbe Mandant vorausgewählt" letzte>
            <Schalter an={einstellungen.mandantMerken} onChange={(v) => setzeWert("mandantMerken", v)} />
          </Zeile>
        </Karte>

        {/* Verbindungen */}
        <Karte icon="bi-hdd-network" titel="Verbindungen" beschreibung="Status der beiden Server, mit denen die App arbeitet">
          <Zeile titel="BillSquid-Backend" hinweis="Benutzer, Mandanten und Belege (Datenbank)">
            <StatusPunkt zustand={verbindung.backend} textOk="erreichbar" textFehler="nicht erreichbar" />
          </Zeile>
          <Zeile titel="Lokaler Scan-Server"
                 hinweis={verbindung.pfad ? `Belege-Ordner: ${verbindung.pfad}` : "Scanner-Eingang und Bild-Uploads · Start mit \"node server.js\""}>
            <StatusPunkt zustand={verbindung.lokal} textOk="läuft" textFehler="offline" />
          </Zeile>
          <Zeile titel="Erneut prüfen" hinweis="Fragt beide Server sofort noch einmal ab" letzte>
            <button onClick={pruefeVerbindungen}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
              <i className="bi bi-arrow-clockwise" /> Prüfen
            </button>
          </Zeile>
        </Karte>

        {/* ── Ab hier nur für Administratoren ── */}
        {admin ? (
            <>
              <Karte icon="bi-people" titel="Benutzer" beschreibung={`${benutzer.length} Konten im Backend`} nurAdmin>
                {adminFehler && (
                    <p style={{ fontSize: 12, color: "#dc2626", padding: "12px 0" }}>
                      <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }} />{adminFehler}
                    </p>
                )}
                {benutzer.map((b, i) => (
                    <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: i < benutzer.length - 1 ? "1px solid #f9f7f3" : "none" }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#18537a", color: "#fd8f19", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                        {`${(b.first_name || b.username || "?")[0]}${(b.last_name || "?")[0]}`.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "#111827" }}>
                          {`${b.first_name || ""} ${b.last_name || ""}`.trim() || b.username}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis" }}>{b.email}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {(b.groups || []).filter((g) => g !== "user").map((g) => <GruppenChip key={g} gruppe={g} />)}
                        {!b.active && <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>inaktiv</span>}
                      </div>
                    </div>
                ))}
              </Karte>

              <Karte icon="bi-diagram-3" titel="Mandanten-Zuordnungen"
                     beschreibung="Legt fest, welcher Steuerberater welche Mandanten sieht" nurAdmin>
                {zuordnungen.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9ca3af", padding: "14px 0" }}>Noch keine Zuordnungen angelegt.</p>
                ) : zuordnungen.map((z, i) => (
                    <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: i < zuordnungen.length - 1 ? "1px solid #f9f7f3" : "none", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 190, fontSize: 12.5, color: "#111827" }}>
                        <span style={{ fontWeight: 600 }}>{nameVon(z.advisor_user_id)}</span>
                        <i className="bi bi-arrow-right" style={{ margin: "0 8px", color: "#9ca3af", fontSize: 11 }} />
                        {nameVon(z.client_user_id)}
                      </div>
                      <span style={{ background: z.status === "active" ? "#dcfce7" : "#f3f4f6", color: z.status === "active" ? "#166534" : "#6b7280", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 9 }}>
                        {z.status === "active" ? "aktiv" : "inaktiv"}
                      </span>
                      <button onClick={() => statusUmschalten(z)} disabled={busy} title="Status umschalten"
                              style={{ padding: "5px 10px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 11, fontWeight: 600, color: "#374151", cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>
                        {z.status === "active" ? "Deaktivieren" : "Aktivieren"}
                      </button>
                      <button onClick={() => zuordnungLoeschen(z)} disabled={busy} title="Zuordnung löschen"
                              style={{ padding: "5px 9px", background: "#fff", border: "1px solid #fca5a5", borderRadius: 7, fontSize: 11, color: "#dc2626", cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                ))}

                {/* Neue Zuordnung */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0ece4", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={neu.advisor} onChange={(e) => setNeu((p) => ({ ...p, advisor: e.target.value }))} style={{ ...feldStil, cursor: "pointer" }}>
                    <option value="">Steuerberater…</option>
                    {berater.map((b) => <option key={b.id} value={b.id}>{`${b.first_name} ${b.last_name}`.trim()}</option>)}
                  </select>
                  <i className="bi bi-arrow-right" style={{ color: "#9ca3af", fontSize: 11 }} />
                  <select value={neu.client} onChange={(e) => setNeu((p) => ({ ...p, client: e.target.value }))} style={{ ...feldStil, cursor: "pointer" }}>
                    <option value="">Mandant…</option>
                    {mandanten.map((m) => <option key={m.id} value={m.id}>{`${m.first_name} ${m.last_name}`.trim()}</option>)}
                  </select>
                  <button onClick={zuordnungAnlegen} disabled={!neu.advisor || !neu.client || busy}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 15px", background: neu.advisor && neu.client && !busy ? "#18537a" : "#e5e7eb", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: neu.advisor && neu.client && !busy ? "#fff" : "#9ca3af", cursor: neu.advisor && neu.client && !busy ? "pointer" : "default", fontFamily: "inherit" }}>
                    <i className="bi bi-plus-lg" /> Zuordnen
                  </button>
                </div>
              </Karte>
            </>
        ) : (
            <div style={{ background: "#fafaf8", border: "1px dashed #d6cfc4", borderRadius: 12, padding: "22px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <i className="bi bi-shield-lock" style={{ fontSize: 22, color: "#b45309", opacity: 0.7 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0b2e44", marginBottom: 3 }}>Weitere Einstellungen für Administratoren</div>
                <p style={{ fontSize: 11.5, color: "#6b7280", lineHeight: 1.5 }}>
                  Benutzerverwaltung und Mandanten-Zuordnungen sind Konten der Rolle „Admin" vorbehalten.
                  Wende dich an deine Administration, wenn du dort etwas ändern möchtest.
                </p>
              </div>
            </div>
        )}
      </div>
  );
}
