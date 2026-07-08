import { useState, useRef, useMemo } from "react";
import exifr from "exifr";
import { X, Camera, Check, Search, ChevronLeft } from "lucide-react";
import { C, TYPES, DISC_COLORS, TYPE_COLOR, typeFromSpeed } from "../constants";
import { resizeImage, conditionText, suggestSalePrices } from "../utils";
import { enhancePhoto } from "../photoEnhance";
import { btn, miniBtn } from "./ui";
import { ImageCropper } from "./ImageCropper";
import { ImageAdjuster } from "./ImageAdjuster";
import { FlightArcSpinner } from "./FlightArc";
import { PlasticCombobox } from "./PlasticCombobox";

const CONF = {
  high:   { label: "Høj sikkerhed", color: C.brand },
  medium: { label: "Middel sikkerhed", color: "#fdba74" },
  low:    { label: "Lav sikkerhed", color: C.distance },
};

// Dropdown of matching discs, anchored under a Navn/Mærke autocomplete input.
// The input's onMouseDown-preventDefault-free onBlur would close this before
// onClick fires, so the option buttons use onMouseDown to pick before blur.
function DiscAutocomplete({ matches, onPick }) {
  return (
    <div style={{
      position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 10,
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
      overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    }}>
      {matches.map((d, i) => (
        <button key={d.id} onMouseDown={e => { e.preventDefault(); onPick(d); }} style={{
          width: "100%", textAlign: "left", padding: "8px 10px", cursor: "pointer",
          background: "transparent", border: "none", color: C.text, fontSize: 12,
          borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[d.type] || C.muted, flexShrink: 0 }}/>
          <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{d.name}</span>
          <span style={{ color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            · {d.brand} · {d.speed}/{d.glide}/{d.turn}/{d.fade}
          </span>
        </button>
      ))}
    </div>
  );
}

// Draws `img` upright onto a fresh canvas per its EXIF orientation tag.
// Only handles the rotations real camera output actually uses (mirrored
// variants 2/4/5/7 essentially never occur outside scanners) — anything else
// falls through as already-upright.
function drawUpright(img, orientation, w, h) {
  const swapped = orientation === 6 || orientation === 8;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? h : w;
  canvas.height = swapped ? w : h;
  const ctx = canvas.getContext("2d");
  switch (orientation) {
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;       // 180°
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;        // 90° clockwise
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;        // 90° counter-clockwise
    default: break;                                          // 1, or unrecognized
  }
  ctx.drawImage(img, 0, 0);
  return canvas;
}

// Resizes a canvas down so its long side is at most `maxSize` — keeps the
// original image small in memory/state without losing crop-adjustment detail.
function resizeCanvasTo(canvas, maxSize) {
  const longSide = Math.max(canvas.width, canvas.height);
  if (longSide <= maxSize) return canvas;
  const scale = maxSize / longSide;
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

// Validates/clamps Claude Vision's disc bbox, falling back to a centered
// guess if it's missing or nonsensical, then pads it a bit — Android camera
// output in particular needs slack at the edges — and clamps the padded
// circle so it never extends past the image edges.
function normalizeCropPos(discPos, padding) {
  let { centerX, centerY, radius } = discPos || {};
  const valid = [centerX, centerY, radius].every(Number.isFinite)
    && centerX > 0 && centerX < 100 && centerY > 0 && centerY < 100 && radius > 2 && radius < 60;
  if (!valid) {
    centerX = 50; centerY = 50; radius = 40;
  } else {
    radius = radius * padding;
  }
  if (centerX - radius < 0) radius = centerX;
  if (centerY - radius < 0) radius = Math.min(radius, centerY);
  if (centerX + radius > 100) radius = Math.min(radius, 100 - centerX);
  if (centerY + radius > 100) radius = Math.min(radius, 100 - centerY);
  return { centerX, centerY, radius };
}

// Crops a circular disc photo out of `canvas` per cropPos ({ centerX, centerY,
// radius }, all as % of the canvas). Shrinks-to-fit + shifts (not re-centers)
// so it never samples outside the image bounds.
function cropCircleFromCanvas(canvas, cropPos, size = 400) {
  const { centerX, centerY, radius } = cropPos;
  const cx = (centerX / 100) * canvas.width;
  const cy = (centerY / 100) * canvas.height;
  const r  = (radius  / 100) * canvas.width;

  const safeSize = Math.min(r * 2, canvas.width, canvas.height);
  const safeX = Math.min(Math.max(0, cx - safeSize / 2), canvas.width - safeSize);
  const safeY = Math.min(Math.max(0, cy - safeSize / 2), canvas.height - safeSize);

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");

  ctx.fillStyle = "#182018";
  ctx.fillRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, safeX, safeY, safeSize, safeSize, 0, 0, size, size);

  return out.toDataURL("image/jpeg", 0.8);
}

// Processes the original camera file (full resolution, not the downsized copy
// sent to Claude Vision) so EXIF rotation only ever gets applied once —
// re-rotating an already-upright preview would double-rotate on
// browsers/platforms that auto-rotate on decode.
// Returns the upright image resized to maxSize (for crop re-adjustment later),
// the initial circular crop, and the crop position used to produce it.
async function processImage(file, discPos) {
  const isAndroid = /android/i.test(navigator.userAgent);
  const padding = isAndroid ? 1.15 : 1.08; // Android camera output needs a bit more slack at the edges

  let orientation = 1;
  try { orientation = (await exifr.orientation(file)) || 1; } catch { orientation = 1; }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = objectUrl;
    });

    const upright = drawUpright(img, orientation, img.naturalWidth, img.naturalHeight);
    const resized = resizeCanvasTo(upright, 1200);
    const cropPos = normalizeCropPos(discPos, padding);

    return {
      originalImageData: resized.toDataURL("image/jpeg", 0.85),
      croppedImageData: cropCircleFromCanvas(resized, cropPos),
      cropPos,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function DiscScanner({ allDiscs, onDirectAdd, onSearchFallback, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | scanning | confirm | editing | error
  const [preview, setPreview] = useState(null);   // raw image shown (dimmed) during scanning
  const [croppedOriginal, setCroppedOriginal] = useState(null); // cropped, un-enhanced
  const [croppedEnhanced, setCroppedEnhanced] = useState(null); // cropped + auto-enhanced
  const [useEnhanced, setUseEnhanced] = useState(true);
  const [manualPreview, setManualPreview] = useState(null); // overrides both, once the user fine-tunes via ImageAdjuster
  const [originalImageData, setOriginalImageData] = useState(null); // full upright photo, for crop re-adjustment
  const [initialCropData, setInitialCropData] = useState(null); // { centerX, centerY, radius } used for the initial crop
  const [showAdjuster, setShowAdjuster] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [editVals, setEditVals] = useState(null);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [autocompleteField, setAutocompleteField] = useState(null); // "name" | "brand" | null — which field's dropdown is open
  const inputRef = useRef();

  const activePreview = manualPreview || (useEnhanced ? (croppedEnhanced || croppedOriginal) : croppedOriginal);

  const nameMatches = useMemo(() => {
    const q = (editVals?.name || "").trim().toLowerCase();
    if (q.length < 2) return [];
    return allDiscs.filter(d => d.name.toLowerCase().includes(q)).slice(0, 6);
  }, [allDiscs, editVals?.name]);

  const brandMatches = useMemo(() => {
    const q = (editVals?.brand || "").trim().toLowerCase();
    if (q.length < 2) return [];
    return allDiscs.filter(d => d.brand.toLowerCase().includes(q)).slice(0, 6);
  }, [allDiscs, editVals?.brand]);

  function pickDisc(d) {
    setEditVals(v => ({
      ...v,
      name: d.name, brand: d.brand, type: d.type,
      speed: d.speed, glide: d.glide, turn: d.turn, fade: d.fade,
    }));
    setAutocompleteField(null);
  }

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
      const res = await fetch("/api/scan", {
        signal: controller.signal,
        method: "POST",
        headers: {
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

      // Auto-crop from the original file so EXIF rotation is only ever
      // applied once (see processImage) — also keeps the upright original
      // around so the user can re-adjust the crop later via ImageAdjuster.
      let finalPreview = dataUrl;
      let originalData = null;
      let cropData = null;
      try {
        const processed = await processImage(file, parsed.disc);
        finalPreview = processed.croppedImageData;
        originalData = processed.originalImageData;
        cropData = processed.cropPos;
      } catch {
        // Processing failed — fall back to the plain preview, no crop-adjust available
      }

      setOriginalImageData(originalData);
      setInitialCropData(cropData);
      setCroppedOriginal(finalPreview);
      setCroppedEnhanced(await enhancePhoto(finalPreview));
      setUseEnhanced(true);
      setManualPreview(null);
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
    setAutocompleteField(null);
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
      pPhoto: activePreview || "",
      pWeight: "",
      pNote: "",
      forSale: false,
      condition: 8,
      hasInk: false,
      saleMP: "",
      saleBIN: "",
      saleNote: "",
    });
    setPhase("editing");
  }

  function handleDirectAdd() { onDirectAdd(result, activePreview); }

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
      pWeight: editVals.pWeight ? Number(editVals.pWeight) : null,
      pNote: editVals.pNote || null,
      forSale: editVals.forSale,
      condition: editVals.condition,
      hasInk: editVals.hasInk,
      saleMP: editVals.saleMP,
      saleBIN: editVals.saleBIN,
      saleNote: editVals.saleNote,
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
  const secHdr = {
    fontSize: 11, color: C.muted, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12,
  };

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
        {/* ImageCropper overlay for editing photo */}
        {cropperSrc && (
          <ImageCropper
            src={cropperSrc}
            onSave={async dataUrl => {
              setCropperSrc(null);
              const enhanced = await enhancePhoto(dataUrl);
              setEditVals(v => ({ ...v, pPhoto: enhanced }));
            }}
            onCancel={() => setCropperSrc(null)}
          />
        )}

        {/* ImageAdjuster overlay — fine-tune the confirm-phase photo */}
        {showAdjuster && activePreview && (
          <ImageAdjuster
            src={activePreview}
            resetSrc={croppedOriginal}
            originalImage={originalImageData}
            initialCrop={initialCropData}
            onSave={dataUrl => { setManualPreview(dataUrl); setShowAdjuster(false); }}
            onCancel={() => setShowAdjuster(false)}
          />
        )}

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
                <FlightArcSpinner cycleColors size={44}/>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 500,
                  textShadow: preview ? "0 1px 4px rgba(0,0,0,0.8)" : "none" }}>
                  Analyserer disc…
                </span>
              </div>
            </div>
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
              {activePreview && (
                <img src={activePreview} alt="Disc" style={{
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

            {croppedOriginal && !manualPreview && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
                {[[false, "Original"], [true, "Forbedret ✓"]].map(([val, label]) => (
                  <button key={String(val)} onClick={() => setUseEnhanced(val)} style={{
                    padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500,
                    border: `1px solid ${useEnhanced === val ? C.brand : C.line}`,
                    background: useEnhanced === val ? `${C.brand}15` : "transparent",
                    color: useEnhanced === val ? C.brand : C.muted,
                  }}>{label}</button>
                ))}
              </div>
            )}

            {activePreview && (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <button onClick={() => setShowAdjuster(true)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.muted, fontSize: 12, textDecoration: "underline", padding: 4,
                }}>
                  Juster billede
                </button>
              </div>
            )}

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

        {/* editing — full edit form matching Mine Discs */}
        {phase === "editing" && editVals && (
          <div>
            {/* Navn + Mærke — autocomplete mod disc-databasen, så en forkert scan-mold kan rettes ved at vælge den rigtige disc */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, ...lbl, position: "relative" }}>
                Navn *
                <input
                  value={editVals.name} autoComplete="off"
                  onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                  onFocus={() => setAutocompleteField("name")}
                  onBlur={() => setAutocompleteField(f => f === "name" ? null : f)}
                  style={inp}
                />
                {autocompleteField === "name" && nameMatches.length > 0 && (
                  <DiscAutocomplete matches={nameMatches} onPick={pickDisc}/>
                )}
              </label>
              <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, ...lbl, position: "relative" }}>
                Mærke *
                <input
                  value={editVals.brand} autoComplete="off"
                  onChange={e => setEditVals(v => ({ ...v, brand: e.target.value }))}
                  onFocus={() => setAutocompleteField("brand")}
                  onBlur={() => setAutocompleteField(f => f === "brand" ? null : f)}
                  style={inp}
                />
                {autocompleteField === "brand" && brandMatches.length > 0 && (
                  <DiscAutocomplete matches={brandMatches} onPick={pickDisc}/>
                )}
              </label>
            </div>

            {/* Type */}
            <div style={{ marginBottom: 16 }}>
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

            {/* Flight-tal */}
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
              <div style={secHdr}>Flight-tal</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[["Speed", "speed", 1, 15, 1], ["Glide", "glide", 1, 7, 1], ["Turn", "turn", -5, 1, 0.5], ["Fade", "fade", 0, 5, 0.5]].map(([label, key, min, max, step]) => (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, ...lbl }}>
                    {label}
                    <input type="number" inputMode="decimal" value={editVals[key]} min={min} max={max} step={step}
                      onChange={e => setEditVals(v => ({ ...v, [key]: Number(e.target.value) }))}
                      style={{ ...inp, textAlign: "center" }}/>
                    <span style={{ fontSize: 10, color: C.line, textAlign: "center" }}>std: {result[key] ?? "—"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mine oplysninger */}
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
              <div style={secHdr}>Mine oplysninger</div>

              {/* Foto */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...lbl, marginBottom: 6 }}>Foto</div>
                {editVals.pPhoto ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={editVals.pPhoto} alt="disc" style={{
                      width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `1px solid ${C.line}`,
                    }}/>
                    <label style={{ cursor: "pointer" }}>
                      <div style={{ ...miniBtn(C.muted), display: "inline-flex", alignItems: "center", gap: 6 }}>✎ Skift</div>
                      <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setCropperSrc(URL.createObjectURL(f)); e.target.value = ""; } }}/>
                    </label>
                    <button onClick={() => setEditVals(v => ({ ...v, pPhoto: null }))} style={miniBtn(C.distance)}>Fjern</button>
                  </div>
                ) : (
                  <label style={{ cursor: "pointer" }}>
                    <div style={{ ...miniBtn(C.muted), display: "inline-flex", alignItems: "center", gap: 6 }}>📷 Upload foto</div>
                    <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setCropperSrc(URL.createObjectURL(f)); e.target.value = ""; } }}/>
                  </label>
                )}
              </div>

              {/* Farve */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...lbl, marginBottom: 6 }}>Farve</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {DISC_COLORS.map(c => (
                    <button key={c} onClick={() => setEditVals(v => ({ ...v, pColor: c }))} style={{
                      width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", padding: 0, flexShrink: 0,
                      border: editVals.pColor === c ? `2.5px solid ${C.text}` : `1px solid ${C.line}`,
                    }}/>
                  ))}
                  {editVals.pColor && !DISC_COLORS.includes(editVals.pColor) && (
                    <button style={{
                      width: 26, height: 26, borderRadius: "50%", padding: 0, cursor: "default", flexShrink: 0,
                      background: editVals.pColor, border: `2.5px solid ${C.text}`,
                    }}/>
                  )}
                  {editVals.pColor && (
                    <button onClick={() => setEditVals(v => ({ ...v, pColor: null }))} style={{
                      width: 26, height: 26, borderRadius: "50%", background: "transparent",
                      cursor: "pointer", border: `1px dashed ${C.line}`, fontSize: 14, color: C.muted, padding: 0,
                    }}>✕</button>
                  )}
                </div>
              </div>

              {/* Vægt + Plast */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 3, ...lbl, flex: "0 0 80px" }}>
                  Vægt (g)
                  <input type="number" inputMode="numeric" value={editVals.pWeight} min={100} max={200}
                    onChange={e => setEditVals(v => ({ ...v, pWeight: e.target.value }))} placeholder="175" style={inp}/>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 3, ...lbl, flex: 1 }}>
                  Plast
                  <PlasticCombobox value={editVals.pPlastic} onChange={p => setEditVals(v => ({ ...v, pPlastic: p }))}
                    brand={editVals.brand} placeholder="Star, Z Line…" style={inp}/>
                </label>
              </div>

              {/* Note */}
              <label style={{ display: "flex", flexDirection: "column", gap: 3, ...lbl }}>
                Note
                <input type="text" value={editVals.pNote} onChange={e => setEditVals(v => ({ ...v, pNote: e.target.value }))}
                  placeholder="Beat in, skovbag, gave fra…" style={inp}/>
              </label>
            </div>

            {/* Til salg */}
            <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, marginTop: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editVals.forSale ? 16 : 0 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Til salg</div>
                <button onClick={() => setEditVals(v => ({ ...v, forSale: !v.forSale }))} style={{
                  padding: "6px 15px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  border: `1px solid ${editVals.forSale ? C.brand : C.line}`,
                  background: editVals.forSale ? `${C.brand}18` : "transparent",
                  color: editVals.forSale ? C.brand : C.muted,
                  letterSpacing: "0.02em",
                }}>
                  {editVals.forSale ? "Til salg ✓" : "Ikke til salg"}
                </button>
              </div>

              {editVals.forSale && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                      <span style={{ color: C.muted }}>Tilstand</span>
                      <span style={{ color: C.brand, fontWeight: 600 }}>{editVals.condition}/10 — {conditionText(editVals.condition)}</span>
                    </div>
                    <input type="range" min={0} max={10} step={1} value={editVals.condition}
                      onChange={e => setEditVals(v => ({ ...v, condition: Number(e.target.value) }))}
                      style={{ width: "100%", accentColor: C.brand, cursor: "pointer", display: "block" }}/>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
                      <span>Ødelagt</span><span>Ny disc</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ ...lbl, marginBottom: 6 }}>Ink</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[[false, "Uden ink"], [true, "Med ink"]].map(([val, label]) => (
                        <button key={String(val)} onClick={() => setEditVals(v => ({ ...v, hasInk: val }))} style={{
                          padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500,
                          border: `1px solid ${editVals.hasInk === val ? C.brand : C.line}`,
                          background: editVals.hasInk === val ? `${C.brand}15` : "transparent",
                          color: editVals.hasInk === val ? C.brand : C.muted,
                        }}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const suggested = suggestSalePrices({ type: editVals.type, condition: editVals.condition });
                    const mpError = editVals.saleMP && !editVals.saleBIN;
                    return (
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, ...lbl, flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>BIN (kr) *</span>
                            {!editVals.saleBIN && (
                              <button type="button"
                                onClick={() => setEditVals(v => ({ ...v, saleBIN: String(suggested.bin), saleMP: String(suggested.mp) }))}
                                style={{ fontSize: 10, color: C.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                Foreslået: {suggested.bin}kr
                              </button>
                            )}
                          </div>
                          <input type="number" inputMode="numeric" value={editVals.saleBIN} min={0}
                            onChange={e => setEditVals(v => ({ ...v, saleBIN: e.target.value }))}
                            placeholder={String(suggested.bin)}
                            style={{ ...inp, border: `1px solid ${mpError ? C.distance : C.line}` }}/>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, ...lbl, flex: 1 }}>
                          <span>MP / Mindstepris (kr)</span>
                          <input type="number" inputMode="numeric" value={editVals.saleMP} min={0}
                            onChange={e => setEditVals(v => ({ ...v, saleMP: e.target.value }))}
                            placeholder={editVals.saleBIN ? String(Math.round(Number(editVals.saleBIN) * 0.75)) : String(suggested.mp)}
                            style={inp} disabled={!editVals.saleBIN}/>
                        </div>
                      </div>
                    );
                  })()}
                  {editVals.saleMP && !editVals.saleBIN && (
                    <div style={{ fontSize: 11, color: C.distance, marginBottom: 10 }}>MP kræver at BIN også er udfyldt</div>
                  )}

                  <label style={{ display: "flex", flexDirection: "column", gap: 3, ...lbl }}>
                    Note (fx "first run")
                    <input type="text" value={editVals.saleNote} onChange={e => setEditVals(v => ({ ...v, saleNote: e.target.value }))}
                      placeholder="first run, mystery boks…" style={inp}/>
                  </label>
                </>
              )}
            </div>

            <button onClick={handleEditConfirm}
              disabled={!editVals.name.trim() || !editVals.brand.trim()} style={{
              width: "100%", ...btn("primary"),
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              border: `1px solid ${C.brand}`, marginTop: 8,
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
              <button onClick={() => {
                setPhase("idle"); setPreview(null);
                setCroppedOriginal(null); setCroppedEnhanced(null); setUseEnhanced(true);
                setManualPreview(null);
                setOriginalImageData(null); setInitialCropData(null);
              }} style={btn()}>Prøv igen</button>
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
