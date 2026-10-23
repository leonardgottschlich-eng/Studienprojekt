import { useState, useRef, useEffect } from 'react';
import { scanZuPdfDatei, dataUrlZuBytes } from '../lib/jpegZuPdf';

export default function DocumentScanModal({ onClose, onCapture }) {
  const videoRef      = useRef(null);
  const smallCanvas   = useRef(null); // Bild in halber Auflösung für die Erkennung
  const svgOverlayRef = useRef(null); // Rahmen um das erkannte Dokument
  const frozenCanvas  = useRef(null); // Aufgenommenes Foto zum Zuschneiden
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

  // Wartet, bis OpenCV und jscanify geladen sind, und startet dann die Kamera
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
    // Läuft nur einmal beim Öffnen, startCamera wird bei jedem Rendern neu erzeugt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    // Die Kamera gibt der Browser nur in einem sicheren Kontext frei: über
    // HTTPS oder auf localhost. Über eine Netzwerkadresse mit http fehlt
    // navigator.mediaDevices ganz, daran ändert auch eine Berechtigung nichts.
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Die Kamera ist nur über HTTPS oder auf localhost verfügbar.\n\n"
          + "Starte den Dev-Server ohne NO_SSL=1, dann läuft die Seite über https://.");
      onClose();
      return;
    }
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

  // Live-Erkennung des Dokuments. OpenCV arbeitet auf halber Auflösung, das
  // sind ein Viertel der Pixel und hält die Vorschau flüssig. Das Video selbst
  // zeigt der Browser direkt an.
  const startDetection = () => {
    const video = videoRef.current;
    const small = smallCanvas.current;
    const svg   = svgOverlayRef.current;
    const sc    = scannerRef.current;
    if (!video || !small || !svg || !sc) return;

    intervalRef.current = setInterval(() => {
      if (video.readyState < 2) return;
      const vw = video.videoWidth, vh = video.videoHeight;
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

        // Koordinaten zurück auf die volle Auflösung rechnen
        const scale = 2;
        const tl = { x: pts.topLeftCorner.x    * scale, y: pts.topLeftCorner.y    * scale };
        const tr = { x: pts.topRightCorner.x   * scale, y: pts.topRightCorner.y   * scale };
        const br = { x: pts.bottomRightCorner.x * scale, y: pts.bottomRightCorner.y * scale };
        const bl = { x: pts.bottomLeftCorner.x  * scale, y: pts.bottomLeftCorner.y  * scale };

        drawSvgFrame(svg, tl, tr, br, bl, vw, vh);
      } catch { clearSvg(svg); }
      finally  { try { mat?.delete(); } catch { /* schon freigegeben */ } }
    }, 80); // etwa 12 Bilder pro Sekunde reichen für die Erkennung
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

  // Foto aufnehmen und danach die Ecken anpassen lassen
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
    setImgDims({ w: fc.width, h: fc.height });

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
    finally { try { mat?.delete(); } catch { /* schon freigegeben */ } }

    // Ohne erkanntes Dokument liegen die Ecken knapp innerhalb des Bildrands
    if (!detectedCorners) {
      const w = fc.width, h = fc.height, m = Math.min(w, h) * 0.05;
      detectedCorners = { tl:{x:m,y:m}, tr:{x:w-m,y:m}, br:{x:w-m,y:h-m}, bl:{x:m,y:h-m} };
    }

    setCorners(detectedCorners);
    setPhase("adjust");
  };

  // Ecken mit Maus oder Finger verschieben
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

  // Dokument entlang der Ecken ausschneiden und gerade ziehen
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

    // Klappt der Zuschnitt nicht, wird das ganze Foto verwendet
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

  // Der Scan geht als PDF weiter. So nimmt ihn das Backend an und er landet
  // wie jeder andere Beleg in der Belegliste.
  const confirm = () => {
    const name = `Scan_${Date.now()}`;
    let file;
    try {
      file = scanZuPdfDatei(finalImg, `${name}.pdf`);
    } catch (e) {
      // Sollte die Umwandlung fehlschlagen, geht der Scan als Bild weiter,
      // statt verloren zu sein.
      console.warn("PDF-Umwandlung fehlgeschlagen:", e);
      file = new File([dataUrlZuBytes(finalImg)], `${name}.jpg`, { type: "image/jpeg" });
    }
    stopAll();
    onCapture(file);
    onClose();
  };

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
                <p style={{ color: "#4a8aaa", fontSize: 11, opacity: 0.7 }}>Kann beim ersten Mal 10 bis 20 Sekunden dauern</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
          )}

          {/* Live-Video */}
          <video ref={videoRef} autoPlay playsInline muted
                 style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: phase === "scanning" ? "block" : "none" }} />

          {/* Rahmen um das erkannte Dokument */}
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

          {/* Aufgenommenes Foto mit verschiebbaren Ecken */}
          {phase === "adjust" && corners && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                      src={frozenCanvas.current?.toDataURL()}
                      alt="Foto"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                  />
                  <svg
                      viewBox={`0 0 ${imgW} ${imgH}`}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: dragging ? "grabbing" : "default" }}
                  >
                    <polygon
                        points={`${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`}
                        fill="rgba(253,143,25,0.12)"
                        stroke="#fd8f19"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                    {/* Gestrichelte Kanten, damit der Rahmen auf jedem Hintergrund sichtbar bleibt */}
                    {[[corners.tl,corners.tr],[corners.tr,corners.br],[corners.br,corners.bl],[corners.bl,corners.tl]].map(([a,b],i) => (
                        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fd8f19" strokeWidth="3" strokeDasharray="10 6" />
                    ))}
                    {/* Griffe mit größerer unsichtbarer Trefferfläche */}
                    {KEYS.map((key) => (
                        <g key={key}
                           onMouseDown={onPointerDown(key)}
                           onTouchStart={onPointerDown(key)}
                           style={{ cursor: "grab" }}>
                          <circle cx={corners[key].x} cy={corners[key].y} r={HANDLE + 10} fill="transparent" />
                          <circle cx={corners[key].x} cy={corners[key].y} r={HANDLE} fill="#fd8f19" stroke="#fff" strokeWidth="3" />
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
