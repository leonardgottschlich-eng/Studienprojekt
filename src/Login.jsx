import { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Login gegen das BillSquid-Backend (CodeIgniter + MySQL)
      const res = await fetch("/backend/api/login", {
        method:  "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, token_name: "billsquid-frontend" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "E-Mail oder Passwort falsch.");
        setLoading(false);
        return;
      }

      // Backend-User → Anzeige-Format der App (name/rolle)
      const rollen = { admin: "Admin", tax_advisor: "Steuerberater/in", client: "Mandant/in" };
      const user = {
        ...data.user,
        name:  `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() || data.user.username,
        rolle: rollen[(data.user.groups || []).find((g) => rollen[g])] || "Benutzer",
      };

      // Token im sessionStorage speichern (bleibt bis Browser-Tab geschlossen)
      sessionStorage.setItem("bs_api_token", data.access_token);
      sessionStorage.setItem("bs_user", JSON.stringify(user));

      // Am lokalen Scan-Server meldet sich die App bei Bedarf selbst an
      // (siehe localServer.js) – er muss beim Login noch nicht laufen.
      onLogin(user);
    } catch {
      // Ein fetch-Fehler heißt nur "Verbindung kam nicht zustande" – die Ursache
      // liegt oft schon vor dem Backend (z. B. Zertifikat des Dev-Servers).
      setError("Verbindung fehlgeschlagen. Läuft der Dev-Server und ist das Zertifikat akzeptiert? Details in der Browser-Konsole (F12).");
    }

    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .login-input:focus { border-color: #18537a !important; outline: none; box-shadow: 0 0 0 3px rgba(24,83,122,.12); }
        .login-btn:hover:not(:disabled) { background: #0d3a55 !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px", animation: "fadeUp .4s ease" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0b2e44", padding: "10px 22px", borderRadius: 12 }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 900, color: "#f0f8ff" }}>Bill</span>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, color: "transparent", WebkitTextStroke: "1.5px #fd8f19" }}>Squid</span>
          </div>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 10 }}>Steuerberater-Belegverwaltung</p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "32px 28px", border: "1px solid #e8e4dc", boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#0b2e44", marginBottom: 6 }}>Anmelden</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Bitte melden Sie sich mit Ihren Zugangsdaten an.</p>

          <form onSubmit={handleSubmit}>

            {/* E-Mail */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: ".04em", display: "block", marginBottom: 6 }}>
                E-MAIL
              </label>
              <div style={{ position: "relative" }}>
                <i className="bi bi-envelope" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14, pointerEvents: "none" }} />
                <input
                  className="login-input"
                  type="email"
                  required
                  placeholder="emma.schmidt@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, color: "#111827", background: "#f9fafb", transition: "border-color .15s" }}
                />
              </div>
            </div>

            {/* Passwort */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: ".04em", display: "block", marginBottom: 6 }}>
                PASSWORT
              </label>
              <div style={{ position: "relative" }}>
                <i className="bi bi-lock" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14, pointerEvents: "none" }} />
                <input
                  className="login-input"
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "10px 38px 10px 36px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, color: "#111827", background: "#f9fafb", transition: "border-color .15s" }}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, fontSize: 15 }}>
                  <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* Fehler */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 7 }}>
                <i className="bi bi-exclamation-triangle-fill" />
                {error}
              </div>
            )}

            {/* Button */}
            <button
              className="login-btn"
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "11px", background: loading ? "#9ca3af" : "#18537a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "background .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Anmelden…</>
              ) : (
                <><i className="bi bi-box-arrow-in-right" /> Anmelden</>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
          BillSquid · Steuerberater-Belegverwaltung
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
