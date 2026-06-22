import { useState, useRef, useEffect } from 'react';

export default function DocumentScanModal({ onClose, onCapture }) {
  const videoRef      = useRef(null);
  const smallCanvas   = useRef(null); // 50%-Canvas für OpenCV-Erkennung
  const svgOverlayRef = useRef(null); // SVG-Overlay für Rahmen-Zeichnung
  const frozenCanvas  = useRef(null); // Eingefriertes Foto für adjust-Phase
  const streamRef     = useRef(null);
  const intervalRef   = useRef(null);
  const scannerRef    = useRef(null);
  const containerRef  = useRef(null);

  // phase: loading | scanning | adjust | preview
  const [phase, setPhase]       = useState("loading");
  const [corners, setCorners]   = useState(null);   // {tl,tr,bl,br} in Bild-px
  const [dragging, setDragging] = useState(null);   // welche Ecke wird gezogen
  const [finalImg, setFinalImg] = useState(null);   // base64 nach Zuschnitt
  const [imgDims, setImgDims]   = useState({ w: 1, h: 1 }); // Bilddimensionen als State

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    const tryInit = () => {
      if (window.jscanify && window.cv && typeof window.cv.Mat === "function") {
        scannerRef.current = new window.jscanify();
        startCamera();
        return true;
      }
      return false;
    };
    if (tryInit()) return;
    const poll = setInterval(() => { if (tryInit()) clearInterval(poll); }, 250);
    return () => clearInterval(poll);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        setPhase("scanning");
        startDetection();
      };
    } catch {
      alert("Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.");
      onClose();
    }
  };

  // ── Live-Erkennung ────────────────────────────────────────────
  // OpenCV läuft auf 50%-Canvas → 4x weniger Pixel → deutlich flüssiger
  // Video selbst wird nativ angezeigt ohne Canvas-Kopie
  const startDetection = () => {
    const video = videoRef.current;
    const small = smallCanvas.current;
    const svg   = svgOverlayRef.current;
    const sc    = scannerRef.current;
    if (!video || !small || !svg || !sc) return;

    intervalRef.current = setInterval(() => {
      if (video.readyState < 2) return;
      const vw = video.videoWidth, vh = video.videoHeight;
      // Halbe Auflösung für OpenCV
      small.width  = Math.round(vw / 2);
      small.height = Math.round(vh / 2);
      small.getContext("2d").drawImage(video, 0, 0, small.width, small.height);

      let mat = null;
      try {
        mat = window.cv.imread(small);
        const contour = sc.findPaperContour(mat);
        if (!contour) { clearSvg(svg); return; }
        const pts = sc.getCornerPoints(contour, mat);
        if (!pts?.topLeftCorner) { clearSvg(svg); return; }

        // Koordinaten auf 100% hochskalieren
        const scale = 2;
        const tl = { x: pts.topLeftCorner.x    * scale, y: pts.topLeftCorner.y    * scale };
        const tr = { x: pts.topRightCorner.x   * scale, y: pts.topRightCorner.y   * scale };
        const br = { x: pts.bottomRightCorner.x * scale, y: pts.bottomRightCorner.y * scale };
        const bl = { x: pts.bottomLeftCorner.x  * scale, y: pts.bottomLeftCorner.y  * scale };

        // SVG-Overlay aktualisieren (kein Canvas-drawImage nötig → flüssig)
        drawSvgFrame(svg, tl, tr, br, bl, vw, vh);
      } catch { clearSvg(svg); }
      finally  { try { mat?.delete(); } catch {} }
    }, 80); // ~12 fps reicht für Erkennung
  };

  const clearSvg = (svg) => { if (svg) svg.innerHTML = ""; };

  const drawSvgFrame = (svg, tl, tr, br, bl, vw, vh) => {
    const pts = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
    svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    svg.innerHTML = `
      <polygon points="${pts}" fill="rgba(253,143,25,0.15)" stroke="#fd8f19" stroke-width="3" stroke-linejoin="round"/>
      ${[tl,tr,br,bl].map(p => `<circle cx="${p.x}" cy="${p.y}" r="14" fill="#fd8f19" opacity="0.7"/>`).join("")}
    `;
  };

  const stopDetection = () => clearInterval(intervalRef.current);
  const stopAll = () => {
    stopDetection();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  // ── Foto aufnehmen → adjust-Phase ────────────────────────────
  const capture = () => {
    stopDetection();
    clearSvg(svgOverlayRef.current);

    const video = videoRef.current;
    const fc    = frozenCanvas.current;
    const sc    = scannerRef.current;
    if (!video || !fc || !sc) return;

    // Foto einfrieren
    fc.width  = video.videoWidth;
    fc.height = video.videoHeight;
    fc.getContext("2d").drawImage(video, 0, 0);
    streamRef.current?.getTracks().forEach((t) => (t.enabled = false));
    setImgDims({ w: fc.width, h: fc.height }); // State triggert Re-render

    // Ecken mit halber Auflösung erkennen, dann hochskalieren
    const small = smallCanvas.current;
    small.width  = Math.round(fc.width / 2);
    small.height = Math.round(fc.height / 2);
    small.getContext("2d").drawImage(fc, 0, 0, small.width, small.height);

    let detectedCorners = null;
    let mat = null;
    try {
      mat = window.cv.imread(small);
      const contour = sc.findPaperContour(mat);
      if (contour) {
        const pts = sc.getCornerPoints(contour, mat);
        if (pts?.topLeftCorner) {
          const s = 2;
          detectedCorners = {
            tl: { x: pts.topLeftCorner.x    * s, y: pts.topLeftCorner.y    * s },
            tr: { x: pts.topRightCorner.x   * s, y: pts.topRightCorner.y   * s },
            br: { x: pts.bottomRightCorner.x * s, y: pts.bottomRightCorner.y * s },
            bl: { x: pts.bottomLeftCorner.x  * s, y: pts.bottomLeftCorner.y  * s },
          };
        }
      }
    } catch (e) { console.warn("Eckerkennung:", e); }
    finally { try { mat?.delete(); } catch {} }

    // Fallback: Ecken = Bildecken mit 5% Inset
    if (!detectedCorners) {
      const w = fc.width, h = fc.height, m = Math.min(w, h) * 0.05;
      detectedCorners = { tl:{x:m,y:m}, tr:{x:w-m,y:m}, br:{x:w-m,y:h-m}, bl:{x:m,y:h-m} };
    }

    setCorners(detectedCorners);
    setPhase("adjust");
  };

  // ── Drag-Logik für Eckpunkte ──────────────────────────────────
  const KEYS = ["tl", "tr", "br", "bl"];
  const HANDLE = 28; // Griff-Radius in px

  const getEventPos = (e, rect, imgW, imgH, dispW, dispH) => {
    const raw = e.touches ? e.touches[0] : e;
    const rx = (raw.clientX - rect.left) / dispW;
    const ry = (raw.clientY - rect.top)  / dispH;
    return { x: rx * imgW, y: ry * imgH };
  };

  const onPointerDown = (key) => (e) => {
    e.preventDefault();
    setDragging(key);
  };

  const onPointerMove = (e) => {
    if (!dragging || !containerRef.current || !frozenCanvas.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const pos  = getEventPos(e, rect, frozenCanvas.current.width, frozenCanvas.current.height, rect.width, rect.height);
    setCorners((prev) => ({ ...prev, [dragging]: pos }));
  };

  const onPointerUp = () => setDragging(null);

  // ── Zuschnitt anwenden ────────────────────────────────────────
  const applyExtract = () => {
    const fc  = frozenCanvas.current;
    const sc  = scannerRef.current;
    if (!fc || !sc || !corners) return;

    const ratio = calcRatio(corners);
    const outW  = 900;
    const outH  = ratio > 0 ? Math.round(outW / ratio) : 1200;

    const jsCorners = {
      topLeftCorner:     { x: corners.tl.x, y: corners.tl.y },
      topRightCorner:    { x: corners.tr.x, y: corners.tr.y },
      bottomRightCorner: { x: corners.br.x, y: corners.br.y },
      bottomLeftCorner:  { x: corners.bl.x, y: corners.bl.y },
    };

    try {
      const extracted = sc.extractPaper(fc, outW, outH, jsCorners);
      if (extracted) {
        setFinalImg(extracted.toDataURL("image/jpeg", 0.93));
        setPhase("preview");
        return;
      }
    } catch (e) { console.warn("extractPaper:", e); }

    // Fallback: Foto ohne Zuschnitt
    setFinalImg(fc.toDataURL("image/jpeg", 0.93));
    setPhase("preview");
  };

  const calcRatio = ({ tl, tr, br, bl }) => {
    const avgW = (Math.hypot(tr.x-tl.x, tr.y-tl.y) + Math.hypot(br.x-bl.x, br.y-bl.y)) / 2;
    const avgH = (Math.hypot(bl.x-tl.x, bl.y-tl.y) + Math.hypot(br.x-tr.x, br.y-tr.y)) / 2;
    return avgH > 0 ? avgW / avgH : 0;
  };

  const retake = () => {
    setFinalImg(null);
    setCorners(null);
    setPhase("scanning");
    streamRef.current?.getTracks().forEach((t) => (t.enabled = true));
    startDetection();
  };

  const confirm = () => {
    const src = finalImg;
    const byteString = atob(src.split(",")[1]);
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const file = new File([ia], `Scan_${Date.now()}.jpg`, { type: "image/jpeg" });
    stopAll();
    onCapture(file);
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────
  const imgW = imgDims.w;
  const imgH = imgDims.h;

  return (
      <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 999, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0b2e44", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bi bi-file-earmark-text" style={{ color: "#fd8f19", fontSize: 18 }} />
            <span style={{ color: "#f0f8ff", fontWeight: 600, fontSize: 15 }}>
            {phase === "loading"  && "Wird geladen…"}
              {phase === "scanning" && "Dokument ausrichten"}
              {phase === "adjust"   && "Ecken anpassen"}
              {phase === "preview"  && "Vorschau"}
          </span>
          </div>
          <button onClick={() => { stopAll(); onClose(); }} style={{ background: "none", border: "none", color: "#7ab8d0", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Kamera / Inhalt */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden", background: "#111" }}
             onMouseMove={phase === "adjust" ? onPointerMove : undefined}
             onMouseUp={phase === "adjust" ? onPointerUp : undefined}
             onTouchMove={phase === "adjust" ? onPointerMove : undefined}
             onTouchEnd={phase === "adjust" ? onPointerUp : undefined}>

          {/* Ladescreen */}
          {phase === "loading" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <div style={{ width: 36, height: 36, border: "3px solid #fd8f19", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ color: "#7ab8d0", fontSize: 13 }}>OpenCV wird geladen…</p>
                <p style={{ color: "#4a8aaa", fontSize: 11, opacity: 0.7 }}>Kann beim ersten Mal 10–20 Sek. dauern</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
          )}

          {/* Live-Video – nativ, kein Canvas-Copy → flüssig */}
          <video ref={videoRef} autoPlay playsInline muted
                 style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: phase === "scanning" ? "block" : "none" }} />

          {/* SVG-Overlay: Dokumentrahmen live */}
          <svg ref={svgOverlayRef} preserveAspectRatio="xMidYMid meet"
               style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: phase === "scanning" ? "block" : "none", pointerEvents: "none" }} />

          {/* Hinweis */}
          {phase === "scanning" && (
              <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 12, padding: "5px 14px", borderRadius: 20 }}>
              Beleg vor die Kamera halten
            </span>
              </div>
          )}

          {/* Versteckte Canvases */}
          <canvas ref={smallCanvas}   style={{ display: "none" }} />
          <canvas ref={frozenCanvas}  style={{ display: "none" }} />

          {/* ── Adjust-Phase: Foto + verschiebbare Ecken ── */}
          {phase === "adjust" && corners && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                      src={frozenCanvas.current?.toDataURL()}
                      alt="Foto"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                  />
                  {/* SVG-Overlay mit ziehbaren Ecken */}
                  <svg
                      viewBox={`0 0 ${imgW} ${imgH}`}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: dragging ? "grabbing" : "default" }}
                  >
                    {/* Polygon-Fläche */}
                    <polygon
                        points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                        fill="rgba(253,143,25,0.12)"
                        stroke="#fd8f19"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                    {/* Kantenlinien extra dick für Sichtbarkeit */}
                    {[[corners.tl,corners.tr],[corners.tr,corners.br],[corners.br,corners.bl],[corners.bl,corners.tl]].map(([a,b],i) => (
                        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fd8f19" strokeWidth="3" strokeDasharray="10 6" />
                    ))}
                    {/* Ziehbare Griffe */}
                    {KEYS.map((key) => (
                        <g key={key}
                           onMouseDown={onPointerDown(key)}
                           onTouchStart={onPointerDown(key)}
                           style={{ cursor: "grab" }}>
                          <circle cx={corners[key].x} cy={corners[key].y} r={HANDLE + 10} fill="transparent" />
                          <circle cx={corners[key].x} cy={corners[key].y} r={HANDLE} fill="#fd8f19" stroke="#fff" strokeWidth="3" />
                          <text x={corners[key].x} y={corners[key].y + 5} textAnchor="middle" fontSize={HANDLE * 0.8} fill="#0b2e44" fontWeight="bold" style={{userSelect:"none"}}>
                          </text>
                        </g>
                    ))}
                  </svg>
                </div>
              </div>
          )}

          {/* Vorschau */}
          {phase === "preview" && finalImg && (
              <img src={finalImg} alt="Scan-Vorschau" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          )}
        </div>

        {/* Steuerleiste */}
        <div style={{ padding: "16px 20px", background: "#0b2e44", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexShrink: 0 }}>
          {phase === "scanning" && (
              <button onClick={capture}
                      style={{ width: 68, height: 68, borderRadius: "50%", background: "#fd8f19", border: "4px solid rgba(255,255,255,.25)", color: "#fff", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(253,143,25,.5)" }}>
                <i className="bi bi-camera" />
              </button>
          )}
          {phase === "adjust" && (
              <>
                <button onClick={retake}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 20px", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#dff0fb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <i className="bi bi-arrow-counterclockwise" /> Neu scannen
                </button>
                <button onClick={applyExtract}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 26px", background: "#fd8f19", border: "none", color: "#0b2e44", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <i className="bi bi-crop" /> Zuschneiden
                </button>
              </>
          )}
          {phase === "preview" && (
              <>
                <button onClick={() => setPhase("adjust")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 20px", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#dff0fb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <i className="bi bi-pencil" /> Ecken anpassen
                </button>
                <button onClick={confirm}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 26px", background: "#fd8f19", border: "none", color: "#0b2e44", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <i className="bi bi-check-lg" /> Verwenden
                </button>
              </>
          )}
        </div>
      </div>
  );
}

/* ── Confidence Ring ─────────────────────────────────────────── */
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
