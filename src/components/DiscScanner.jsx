import { useState, useRef, useEffect } from "react";
import { X, Camera, Check, Search, Loader, ChevronLeft } from "lucide-react";
import { C, TYPES, DISC_COLORS, typeFromSpeed } from "../constants";
import { resizeImage } from "../utils";
import { btn } from "./ui";

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const CONF = {
  high:   { label: "Høj sikkerhed", color: C.brand },
  medium: { label: "Middel sikkerhed", color: "#fdba74" },
  low:    { label: "Lav sikkerhed", color: C.distance },
};

export function DiscScanner({ allDiscs, onDirectAdd, onSearchFallback, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | camera | scanning | confirm | editing | error
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [editVals, setEditVals] = useState(null);
  const inputRef = useRef();
  const editFileRef = useRef();
  const videoRef = useRef();
  const streamRef = useRef(null);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  // Attach stream to video element after camera phase renders
  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  // Stop stream on unmount
  useEffect(() => () => stopStream(), []);

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      inputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setPhase("camera");
    } catch {
      // Permission denied or unsupported — fall back to file input
      inputRef.current?.click();
    }
  }

  async function analyzeBase64(base64) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 512,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              { type: "text", text: `Dette er et billede af en disc golf disc.
Identificér så præcist som muligt:
- name: disc mold navn (fx MD4, Zone, Destroyer)
- brand: mærke (fx Discmania, Discraft, Innova)
- plastic: plasttype og evt. edition synlig på disc (fx Swirl S-Line, Big Z, Star, Champion)
- color: farve på dansk (fx orange, lyserød, gul, hvid)
- colorHex: nærmeste hex-farvekode baseret på disc farven
- speed, glide, turn, fade: hvis du kender disse tal for denne disc mold
- confidence: high hvis du er sikker, medium hvis nogenlunde sikker, low hvis usikker
Svar KUN med JSON, ingen forklaring.` },
            ],
          }],
        }),
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Ugyldigt svar");
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error) {
        setPhase("error");
        setErrorMsg("Kunne ikke genkende disc'en. Prøv manuel søgning.");
        return;
      }
      setResult(parsed);
      setPhase("confirm");
    } catch (e) {
      clearTimeout(timeout);
      setPhase("error");
      setErrorMsg(e.name === "AbortError" ? "Timeout — prøv manuel søgning." : "Kunne ikke genkende disc'en. Prøv manuel søgning.");
    }
  }

  async function captureAndAnalyze() {
    const video = videoRef.current;
    if (!video) return;
    setPhase("scanning");

    const size = 800;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const vw = video.videoWidth, vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2, sy = (vh - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    setPreview(dataUrl);
    await analyzeBase64(dataUrl.split(",")[1]);
  }

  async function handleFile(file) {
    if (!file) return;
    setPhase("scanning");
    setErrorMsg("");
    let dataUrl;
    try {
      dataUrl = await resizeImage(file, 800);
      setPreview(dataUrl);
    } catch {
      setPhase("error");
      setErrorMsg("Kunne ikke læse billedet.");
      return;
    }
    await analyzeBase64(dataUrl.split(",")[1]);
  }

  function startEditing() {
    const type = result.speed ? typeFromSpeed(Number(result.speed)) : "Distance";
    setEditVals({
      name: result.name || "",
      brand: result.brand || "",
      type,
      speed: result.speed ?? 7,
      glide: result.glide ?? 5,
      turn: result.turn ?? 0,
      fade: result.fade ?? 2,
      pPlastic: result.plastic || "",
      pColor: result.colorHex || "",
      pPhoto: preview || "",
    });
    setPhase("editing");
  }

  function handleDirectAdd() { onDirectAdd(result, preview); }

  function handleEditConfirm() {
    onDirectAdd({
      name: editVals.name,
      brand: editVals.brand,
      type: editVals.type,
      speed: Number(editVals.speed),
      glide: Number(editVals.glide),
      turn: Number(editVals.turn),
      fade: Number(editVals.fade),
      plastic: editVals.pPlastic,
      colorHex: editVals.pColor,
    }, editVals.pPhoto);
  }

  const conf = result?.confidence ? (CONF[result.confidence] || CONF.medium) : null;
  const hasFlightNums = result && (result.speed != null || result.glide != null || result.turn != null || result.fade != null);

  const inp = {
    padding: "8px 10px", borderRadius: 9, fontFamily: "inherit",
    background: C.surface, border: `1px solid ${C.line}`,
    color: C.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box",
  };
  const lbl = { fontSize: 11, color: C.muted, letterSpacing: "0.04em" };

  // ── Camera overlay (full-screen, replaces bottom sheet) ──────────────────
  if (phase === "camera") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#000", overflow: "hidden" }}>
        {/* Live feed */}
        <video ref={videoRef} autoPlay playsInline muted style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
        }}/>

        {/* Circular cutout overlay — box-shadow fills outside the circle */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -58%)",
          width: 280, height: 280, borderRadius: "50%",
          border: `2px solid ${C.brand}`,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.60)",
          pointerEvents: "none",
        }}/>

        {/* Guide text below circle */}
        <div style={{
          position: "absolute",
          top: "calc(42% + 158px)",
          left: 0, right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.80)",
          fontSize: 13,
          pointerEvents: "none",
        }}>
          Placer disc inden for cirklen
        </div>

        {/* Cancel – top left */}
        <button onClick={() => { stopStream(); setPhase("idle"); }} style={{
          position: "absolute", top: 20, left: 20,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(0,0,0,0.50)", border: "none",
          color: "#fff", padding: "9px 16px", borderRadius: 12,
          cursor: "pointer", fontSize: 14, fontWeight: 500,
        }}>
          <X size={15}/> Annullér
        </button>

        {/* Capture button – bottom center */}
        <button onClick={captureAndAnalyze} aria-label="Tag billede" style={{
          position: "absolute", bottom: 52, left: "50%",
          transform: "translateX(-50%)",
          width: 72, height: 72, borderRadius: "50%",
          background: C.brand, border: "4px solid rgba(255,255,255,0.35)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 24px ${C.brand}60`,
        }}>
          <Camera size={26} color="#000"/>
        </button>
      </div>
    );
  }

  // ── Bottom sheet (all other phases) ─────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 560,
        background: C.surface, border: `1px solid ${C.line}`,
        borderRadius: "20px 20px 0 0", padding: "24px 20px 36px",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          {phase === "editing" ? (
            <button onClick={() => setPhase("confirm")} style={{
              background: "none", border: "none", cursor: "pointer", color: C.muted,
              padding: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 14,
            }}>
              <ChevronLeft size={16}/> Tilbage
            </button>
          ) : (
            <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Scan disc</span>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={18}/>
          </button>
        </div>

        {/* idle */}
        {phase === "idle" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              Tag et billede af din disc, og Claude Vision identificerer den automatisk.
            </p>
            {/* Fallback for browsers without getUserMedia */}
            <input ref={inputRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0])}/>
            <button onClick={openCamera} style={{
              ...btn("primary"), display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px",
            }}>
              <Camera size={16}/> Åbn kamera
            </button>
          </div>
        )}

        {/* scanning */}
        {phase === "scanning" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {preview && (
              <img src={preview} alt="Preview" style={{
                width: 80, height: 80, objectFit: "cover", borderRadius: "50%",
                border: `2px solid ${C.line}`, marginBottom: 16,
              }}/>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted, fontSize: 14 }}>
              <Loader size={16} style={{ animation: "spin 1s linear infinite" }}/>
              Analyserer disc…
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* confirm */}
        {phase === "confirm" && result && (
          <div>
            <div style={{
              display: "flex", gap: 14, alignItems: "center",
              background: C.raised, border: `1px solid ${C.line}`,
              borderRadius: 14, padding: "14px 16px", marginBottom: 10,
            }}>
              {preview && (
                <img src={preview} alt="Disc" style={{
                  width: 80, height: 80, objectFit: "cover", borderRadius: "50%",
                  border: `2px solid ${C.line}`, flexShrink: 0,
                }}/>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                  {result.name || "Ukendt disc"}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{result.brand || ""}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
                  {result.colorHex && (
                    <span style={{
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0, display: "inline-block",
                      background: result.colorHex, boxShadow: `0 0 6px ${result.colorHex}80`,
                    }}/>
                  )}
                  {result.plastic && <span style={{ fontSize: 12, color: C.muted }}>{result.plastic}</span>}
                </div>
                {hasFlightNums && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {[["S", result.speed], ["G", result.glide], ["T", result.turn], ["F", result.fade]].map(([label, val]) =>
                      val != null ? (
                        <span key={label} style={{
                          fontSize: 11, padding: "2px 7px", borderRadius: 6, fontWeight: 600,
                          background: `${C.brand}15`, border: `1px solid ${C.brand}30`, color: C.brand,
                        }}>{label}: {val}</span>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>

            {conf && (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{
                  fontSize: 12, padding: "3px 12px", borderRadius: 999, fontWeight: 600,
                  background: `${conf.color}18`, border: `1px solid ${conf.color}40`, color: conf.color,
                }}>{conf.label}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={handleDirectAdd} style={{
                ...btn("primary"), display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                border: `1px solid ${C.brand}`,
              }}>
                <Check size={15}/> Tilføj til min samling
              </button>
              <button onClick={startEditing} style={{
                ...btn(), display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                Rediger før tilføjelse
              </button>
              <button onClick={() => onSearchFallback(result.name || "", result.brand || "")} style={{
                ...btn(), display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: C.muted,
              }}>
                <Search size={14}/> Søg manuelt
              </button>
            </div>
          </div>
        )}

        {/* editing */}
        {phase === "editing" && editVals && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{ position: "relative" }}>
                <img src={editVals.pPhoto || preview} alt="Disc" style={{
                  width: 80, height: 80, objectFit: "cover", borderRadius: "50%", border: `2px solid ${C.line}`,
                }}/>
                <button onClick={() => editFileRef.current?.click()} style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: "50%",
                  background: C.raised, border: `1px solid ${C.line}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.muted, fontSize: 14,
                }}>✎</button>
                <input ref={editFileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) { const url = await resizeImage(f, 800); setEditVals(v => ({ ...v, pPhoto: url })); }
                  }}/>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
                Navn *
                <input value={editVals.name} onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))} style={inp}/>
              </label>
              <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
                Mærke *
                <input value={editVals.brand} onChange={e => setEditVals(v => ({ ...v, brand: e.target.value }))} style={inp}/>
              </label>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ ...lbl, marginBottom: 6 }}>Type</div>
              <div style={{ display: "flex", gap: 6 }}>
                {TYPES.map(t => (
                  <button key={t} onClick={() => setEditVals(v => ({ ...v, type: t }))} style={{
                    flex: 1, padding: "7px 0", borderRadius: 999, cursor: "pointer", fontSize: 11, fontWeight: 500,
                    border: `1px solid ${editVals.type === t ? C.brand : C.line}`,
                    background: editVals.type === t ? `${C.brand}15` : "transparent",
                    color: editVals.type === t ? C.brand : C.muted,
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[["Speed", "speed"], ["Glide", "glide"], ["Turn", "turn"], ["Fade", "fade"]].map(([label, key]) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
                  {label}
                  <input type="number" inputMode="decimal" value={editVals[key]}
                    onChange={e => setEditVals(v => ({ ...v, [key]: e.target.value }))}
                    style={{ ...inp, textAlign: "center" }}/>
                </label>
              ))}
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, ...lbl }}>
              Plasttype
              <input value={editVals.pPlastic}
                onChange={e => setEditVals(v => ({ ...v, pPlastic: e.target.value }))}
                placeholder="Star, ESP, Swirl S-Line…" style={inp}/>
            </label>

            <div style={{ marginBottom: 18 }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Farve</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                {DISC_COLORS.map(c => (
                  <button key={c} onClick={() => setEditVals(v => ({ ...v, pColor: c }))} style={{
                    width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", padding: 0,
                    border: editVals.pColor === c ? `3px solid ${C.text}` : "2px solid transparent",
                    boxShadow: editVals.pColor === c ? `0 0 0 1px ${c}` : "none",
                  }}/>
                ))}
                {editVals.pColor && !DISC_COLORS.includes(editVals.pColor) && (
                  <button style={{
                    width: 28, height: 28, borderRadius: "50%", padding: 0, cursor: "default",
                    background: editVals.pColor, border: `3px solid ${C.text}`,
                    boxShadow: `0 0 0 1px ${editVals.pColor}`,
                  }}/>
                )}
                {editVals.pColor && (
                  <button onClick={() => setEditVals(v => ({ ...v, pColor: "" }))} style={{
                    width: 28, height: 28, borderRadius: "50%", cursor: "pointer", padding: 0,
                    border: `1px solid ${C.line}`, background: "transparent", color: C.muted,
                    fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>×</button>
                )}
              </div>
            </div>

            <button onClick={handleEditConfirm}
              disabled={!editVals.name.trim() || !editVals.brand.trim()} style={{
              width: "100%", ...btn("primary"),
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              border: `1px solid ${C.brand}`,
              opacity: editVals.name.trim() && editVals.brand.trim() ? 1 : 0.45,
            }}>
              <Check size={15}/> Tilføj til min samling
            </button>
          </div>
        )}

        {/* error */}
        {phase === "error" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.distance, fontSize: 14, marginBottom: 20 }}>{errorMsg}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => { setPhase("idle"); setPreview(null); }} style={btn()}>Prøv igen</button>
              <button onClick={() => onSearchFallback("", "")} style={{ ...btn("primary"), border: `1px solid ${C.brand}` }}>
                Manuel søgning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
