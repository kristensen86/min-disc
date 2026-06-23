import { useState, useRef } from "react";
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

// Crop a circular disc photo from the image using canvas.
// discPos: { centerX, centerY, radius } — all as % of image width/height/width
function cropDisc(dataUrl, discPos) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const { centerX, centerY, radius } = discPos;
        const cx = (centerX / 100) * img.width;
        const cy = (centerY / 100) * img.height;
        const r  = (radius  / 100) * img.width;
        const side = r * 1.65; // tight crop: ~17% inside detected edge each side

        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Circular clip — transparent outside the circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.drawImage(
          img,
          cx - side / 2, cy - side / 2, side, side,
          0, 0, size, size,
        );

        resolve(canvas.toDataURL("image/png"));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function DiscScanner({ allDiscs, onDirectAdd, onSearchFallback, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | scanning | confirm | editing | error
  const [preview, setPreview] = useState(null);   // shown in scanning (original) then confirm (cropped)
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [editVals, setEditVals] = useState(null);
  const inputRef = useRef();
  const editFileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setErrorMsg("");

    let dataUrl;
    try {
      dataUrl = await resizeImage(file, 800);
    } catch {
      setPhase("error");
      setErrorMsg("Kunne ikke læse billedet.");
      return;
    }

    // Show original image (dimmed) while API works
    setPreview(dataUrl);
    setPhase("scanning");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
          max_tokens: 768,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
              { type: "text", text: `Dette er et billede af en disc golf disc.
Udfør to opgaver og svar med JSON:

1. IDENTIFICER DISC:
   name, brand, plastic, color, colorHex, speed, glide, turn, fade, confidence

2. FIND DISC POSITION:
   Find den runde disc i billedet og returner:
   centerX: disc centrum X som procent af billedbredde (0-100)
   centerY: disc centrum Y som procent af billedhøjde (0-100)
   radius: disc radius SOM PRÆCIST måler til discens fysiske plastkant — IKKE til skyggekant eller baggrund. Underestimer hellere lidt end overestimer. Procent af billedbredde (0-100)
   Hvis disc ikke kan lokaliseres, sæt disc til null.

Svar KUN med JSON:
{
  "name": "...", "brand": "...", "plastic": "...", "color": "...", "colorHex": "...",
  "speed": null, "glide": null, "turn": null, "fade": null, "confidence": "high/medium/low",
  "disc": { "centerX": 50, "centerY": 50, "radius": 35 }
}` },
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

      // Auto-crop if disc position was found
      let finalPreview = dataUrl;
      if (parsed.disc) {
        try {
          finalPreview = await cropDisc(dataUrl, parsed.disc);
        } catch {
          // Crop failed — fall back to original image
        }
      }

      setPreview(finalPreview);
      setResult(parsed);
      setPhase("confirm");
    } catch (e) {
      clearTimeout(timeout);
      setPhase("error");
      setErrorMsg(e.name === "AbortError" ? "Timeout — prøv manuel søgning." : "Kunne ikke genkende disc'en. Prøv manuel søgning.");
    }
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
              Tag et billede af din disc, og Claude Vision identificerer og beskærer den automatisk.
            </p>
            <input ref={inputRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0])}/>
            <button onClick={() => inputRef.current?.click()} style={{
              ...btn("primary"), display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px",
            }}>
              <Camera size={16}/> Åbn kamera
            </button>
          </div>
        )}

        {/* scanning — dimmed original with spinner overlay */}
        {phase === "scanning" && (
          <div>
            <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              {preview && (
                <img src={preview} alt="" style={{
                  width: "100%", maxHeight: 240, objectFit: "cover",
                  display: "block", opacity: 0.35,
                }}/>
              )}
              <div style={{
                position: preview ? "absolute" : "relative",
                inset: 0, minHeight: preview ? undefined : 100,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <Loader size={26} color={C.brand} style={{ animation: "spin 1s linear infinite" }}/>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 500,
                  textShadow: preview ? "0 1px 4px rgba(0,0,0,0.8)" : "none" }}>
                  Analyserer disc…
                </span>
              </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* confirm */}
        {phase === "confirm" && result && (
          <div>
            {/* No-disc-found notice */}
            {!result.disc && (
              <div style={{
                fontSize: 12, color: C.muted, textAlign: "center",
                padding: "6px 12px", marginBottom: 10,
                background: `${C.brand}0a`, border: `1px solid ${C.line}`,
                borderRadius: 10,
              }}>
                Kunne ikke finde disc automatisk — billedet bruges som det er
              </div>
            )}

            {/* Disc card */}
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
