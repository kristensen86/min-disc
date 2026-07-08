import { useState, useRef, useEffect } from "react";
import { X, Sun, Contrast, Droplet, Thermometer, Focus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, Minus, ZoomIn, ZoomOut, RotateCcw, Wand2, Check } from "lucide-react";
import { C } from "../constants";
import { btn, miniBtn } from "./ui";
import { enhancePhoto } from "../photoEnhance";

const OUT = 400;
const EDITOR_MAX = 320; // max width/height of the interactive crop-editor canvas
const CROP_R_MIN = 0.04;
const CROP_R_MAX = 0.55;
const DEFAULT_ADJUST = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpness: 0 };
const SLIDERS = [
  ["brightness", "Lysstyrke", Sun],
  ["contrast", "Kontrast", Contrast],
  ["saturation", "Mætning", Droplet],
  ["warmth", "Varme", Thermometer],
  ["sharpness", "Skarphed", Focus],
];

// CSS filter syntax works directly as Canvas2D's `filter` property, so the
// live preview and the exported photo are drawn through the exact same code
// path — no risk of the save looking different from what was previewed.
// Skarphed has no true CSS "sharpen" counterpart, so only its negative half
// (blur) has a visible effect. Varme's positive half uses sepia (warm); its
// negative half adds a touch of hue-rotate so the slider isn't a dead end
// on the cool side.
function buildFilterString({ brightness, contrast, saturation, warmth, sharpness }) {
  const sepiaAmt = Math.max(0, warmth) * 0.6;
  const hue = warmth < 0 ? warmth * 0.6 : 0;
  const blurPx = (Math.max(0, -sharpness) / 100) * 6;
  return `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%) sepia(${sepiaAmt}%) hue-rotate(${hue}deg) blur(${blurPx}px)`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function imgW(img) { return img.naturalWidth ?? img.width; }
function imgH(img) { return img.naturalHeight ?? img.height; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// Rotates an image/canvas 90° counter-clockwise, returning a new canvas.
// Crop-fraction remap for a point (cx, cy) under this rotation is simply
// newCx = cy, newCy = 1 - cx (both independent of source width/height).
function rotateImageCCW(img) {
  const w = imgW(img), h = imgH(img);
  const canvas = document.createElement("canvas");
  canvas.width = h;
  canvas.height = w;
  const ctx = canvas.getContext("2d");
  ctx.translate(0, w);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(img, 0, 0);
  return canvas;
}

// Draws the circular crop (per `crop` = { cx, cy, r }, all fractions of the
// source image's width/height/width respectively) with `adjust` filters
// applied, into a size x size square on `ctx`. Shrinks-to-fit + shifts the
// sample rect so it never samples outside the source image.
function drawCroppedPreview(ctx, img, crop, adjust, size) {
  const W = imgW(img), H = imgH(img);
  const cx = crop.cx * W, cy = crop.cy * H, r = crop.r * W;
  const side = Math.min(r * 2, W, H);
  const sx = Math.min(Math.max(0, cx - side / 2), W - side);
  const sy = Math.min(Math.max(0, cy - side / 2), H - side);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#182018";
  ctx.fillRect(0, 0, size, size);
  ctx.filter = buildFilterString(adjust);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  ctx.restore();
}

// Fine-tunes a disc photo — brightness/contrast/saturation/warmth/sharpness
// sliders, plus crop adjustment, and a 90° rotate.
//
// Two modes:
// - Crop-adjustable (pass `originalImage` + `initialCrop`): shows the full,
//   un-cropped photo with a draggable/resizable circle overlay showing what
//   will be cropped — the circle IS the crop, no hidden extra padding once
//   the user starts adjusting it. `initialCrop` is `{ centerX, centerY,
//   radius }` as % of `originalImage`, matching Claude Vision's bbox
//   convention (with any padding already baked in by the caller).
// - Legacy (only `src`): adjusts an already-cropped photo in place with a
//   small pan/zoom, same as before — used where no full original is
//   available (e.g. editing an existing owned disc's photo).
//
// `resetSrc` (defaults to `src`, legacy mode only) is what "Nulstil" reverts
// to — pass the untouched auto-crop result so resetting always goes back to
// that, not to a previous manual edit.
export function ImageAdjuster({ src, resetSrc = null, originalImage = null, initialCrop = null, onSave, onCancel }) {
  const hasOriginal = !!originalImage && !!initialCrop;

  const [baseImg, setBaseImg] = useState(null); // legacy mode
  const [origImg, setOrigImg] = useState(null); // crop-adjustable mode (possibly rotated)
  const [crop, setCrop] = useState(null);        // crop-adjustable mode: { cx, cy, r } fractions
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST);
  const [panX, setPanX] = useState(0);           // legacy mode only
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);           // legacy mode only
  const [rotation, setRotation] = useState(0);   // legacy mode only
  const canvasRef = useRef(null);   // small live preview, both modes
  const editorRef = useRef(null);   // big interactive canvas, crop-adjustable mode only
  const dragRef = useRef(null);

  // Legacy mode: load the already-cropped photo
  useEffect(() => {
    if (hasOriginal) return;
    let cancelled = false;
    loadImage(src).then(img => { if (!cancelled) setBaseImg(img); }).catch(() => {});
    return () => { cancelled = true; };
  }, [hasOriginal, src]);

  // Crop-adjustable mode: load the full original + seed the crop from the AI bbox
  useEffect(() => {
    if (!hasOriginal) return;
    let cancelled = false;
    loadImage(originalImage).then(img => {
      if (cancelled) return;
      setOrigImg(img);
      setCrop({ cx: initialCrop.centerX / 100, cy: initialCrop.centerY / 100, r: initialCrop.radius / 100 });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [hasOriginal, originalImage, initialCrop]);

  // Small live preview canvas — shared by both modes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");

    if (hasOriginal) {
      if (!origImg || !crop) return;
      drawCroppedPreview(ctx, origImg, crop, adjust, OUT);
      return;
    }

    if (!baseImg) return;
    ctx.clearRect(0, 0, OUT, OUT);
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#182018";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.filter = buildFilterString(adjust);
    ctx.translate(OUT / 2 + panX, OUT / 2 + panY);
    ctx.rotate((rotation * Math.PI) / 180);
    const baseScale = Math.max(OUT / baseImg.naturalWidth, OUT / baseImg.naturalHeight);
    const drawW = baseImg.naturalWidth * baseScale * zoom;
    const drawH = baseImg.naturalHeight * baseScale * zoom;
    ctx.drawImage(baseImg, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [hasOriginal, origImg, crop, baseImg, adjust, panX, panY, zoom, rotation]);

  // Big interactive editor canvas — crop-adjustable mode only
  useEffect(() => {
    if (!hasOriginal) return;
    const canvas = editorRef.current;
    if (!canvas || !origImg || !crop) return;
    const W = imgW(origImg), H = imgH(origImg);
    const scale = Math.min(EDITOR_MAX / W, EDITOR_MAX / H, 1);
    const dispW = Math.round(W * scale), dispH = Math.round(H * scale);
    canvas.width = dispW;
    canvas.height = dispH;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(origImg, 0, 0, dispW, dispH);

    const ccx = crop.cx * dispW, ccy = crop.cy * dispH, cr = crop.r * dispW;
    ctx.save();
    ctx.fillStyle = "rgba(5,10,5,0.6)";
    ctx.beginPath();
    ctx.rect(0, 0, dispW, dispH);
    ctx.moveTo(ccx + cr, ccy);
    ctx.arc(ccx, ccy, cr, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.restore();

    ctx.strokeStyle = C.brand;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
    ctx.stroke();
  }, [hasOriginal, origImg, crop]);

  function canvasPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function handlePointerDown(e) {
    const canvas = editorRef.current;
    if (!canvas || !crop) return;
    canvas.setPointerCapture(e.pointerId);
    const pos = canvasPos(e, canvas);
    dragRef.current = { startX: pos.x, startY: pos.y, cx: crop.cx, cy: crop.cy, w: canvas.width, h: canvas.height };
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const canvas = editorRef.current;
    const pos = canvasPos(e, canvas);
    const d = dragRef.current;
    setCrop(c => ({
      ...c,
      cx: clamp01(d.cx + (pos.x - d.startX) / d.w),
      cy: clamp01(d.cy + (pos.y - d.startY) / d.h),
    }));
  }
  function handlePointerUp(e) {
    dragRef.current = null;
    try { editorRef.current?.releasePointerCapture(e.pointerId); } catch {}
  }

  function handleRotate() {
    if (hasOriginal) {
      if (!origImg || !crop) return;
      const W = imgW(origImg), H = imgH(origImg);
      const rotated = rotateImageCCW(origImg);
      setOrigImg(rotated);
      setCrop({ cx: crop.cy, cy: 1 - crop.cx, r: Math.min(CROP_R_MAX, crop.r * (W / H)) });
    } else {
      setRotation(r => (r - 90 + 360) % 360);
    }
  }

  function resetAll(img) {
    setAdjust(DEFAULT_ADJUST);
    setPanX(0); setPanY(0); setZoom(1); setRotation(0);
    if (img) setBaseImg(img);
  }

  function handleReset() {
    if (hasOriginal) {
      setAdjust(DEFAULT_ADJUST);
      loadImage(originalImage).then(img => {
        setOrigImg(img);
        setCrop({ cx: initialCrop.centerX / 100, cy: initialCrop.centerY / 100, r: initialCrop.radius / 100 });
      }).catch(() => {});
      return;
    }
    loadImage(resetSrc || src).then(resetAll).catch(() => resetAll(null));
  }

  async function handleAutoEnhance() {
    if (hasOriginal) {
      if (!origImg) return;
      const W = imgW(origImg), H = imgH(origImg);
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      canvas.getContext("2d").drawImage(origImg, 0, 0, W, H);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const enhanced = await enhancePhoto(dataUrl);
      const img = await loadImage(enhanced).catch(() => null);
      if (img) { setOrigImg(img); setAdjust(DEFAULT_ADJUST); }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = canvas.toDataURL("image/jpeg", 0.92);
    const enhanced = await enhancePhoto(current);
    const img = await loadImage(enhanced).catch(() => null);
    resetAll(img);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/jpeg", 0.9));
  }

  function pan(dx, dy) { setPanX(x => x + dx); setPanY(y => y + dy); }
  function adjustZoom(delta) { setZoom(z => Math.min(2.5, Math.max(0.5, +(z + delta).toFixed(2)))); }

  const dirBtn = {
    width: 36, height: 36, borderRadius: 9, cursor: "pointer", padding: 0,
    background: C.surface, border: `1px solid ${C.line}`, color: C.muted,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const label = { fontSize: 11, color: C.muted, letterSpacing: "0.04em" };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 450, background: "rgba(5,10,5,0.92)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        width: "100%", maxWidth: 480, boxSizing: "border-box",
        background: C.surface, border: `1px solid ${C.line}`,
        borderRadius: "20px 20px 0 0", padding: "20px 20px 28px",
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Juster billede</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Live preview */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <canvas ref={canvasRef} style={{
            width: hasOriginal ? 150 : 220, height: hasOriginal ? 150 : 220, borderRadius: "50%",
            border: `1px solid ${C.line}`, boxShadow: "0 0 20px rgba(0,0,0,0.3)",
          }}/>
        </div>

        {/* Sliders */}
        <div style={{ marginBottom: 20 }}>
          {SLIDERS.map(([key, sliderLabel, Icon]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Icon size={15} color={C.muted} style={{ flexShrink: 0 }}/>
              <span style={{ ...label, width: 58, flexShrink: 0 }}>{sliderLabel}</span>
              <input type="range" min={-100} max={100} step={1} value={adjust[key]}
                onChange={e => setAdjust(a => ({ ...a, [key]: Number(e.target.value) }))}
                style={{ flex: 1, accentColor: C.brand, cursor: "pointer" }}/>
              <span style={{
                fontSize: 11.5, width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums",
                color: adjust[key] === 0 ? C.muted : C.brand,
              }}>{adjust[key] > 0 ? `+${adjust[key]}` : adjust[key]}</span>
            </div>
          ))}
        </div>

        {/* Crop adjustment */}
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Crop</div>

          {hasOriginal ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <canvas
                  ref={editorRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`,
                    touchAction: "none", cursor: "grab",
                  }}
                />
              </div>
              <div style={{ textAlign: "center", marginBottom: 12, fontSize: 11, color: C.muted }}>
                Træk cirklen for at flytte den
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <ZoomIn size={15} color={C.muted} style={{ flexShrink: 0 }}/>
                <input type="range" min={CROP_R_MIN} max={CROP_R_MAX} step={0.005}
                  value={crop?.r ?? CROP_R_MIN}
                  onChange={e => setCrop(c => ({ ...c, r: Number(e.target.value) }))}
                  style={{ flex: 1, accentColor: C.brand, cursor: "pointer" }}/>
                <ZoomOut size={15} color={C.muted} style={{ flexShrink: 0 }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={handleRotate} style={{ ...dirBtn, width: "auto", padding: "0 14px", gap: 6 }} aria-label="Rotér 90° mod uret">
                  <RotateCcw size={16}/><span style={{ fontSize: 12, fontWeight: 600 }}>90°</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 36px)", gridTemplateRows: "repeat(3, 36px)", gap: 4 }}>
                <div/>
                <button onClick={() => pan(0, -10)} style={dirBtn} aria-label="Flyt op"><ArrowUp size={16}/></button>
                <div/>
                <button onClick={() => pan(-10, 0)} style={dirBtn} aria-label="Flyt venstre"><ArrowLeft size={16}/></button>
                <div/>
                <button onClick={() => pan(10, 0)} style={dirBtn} aria-label="Flyt højre"><ArrowRight size={16}/></button>
                <div/>
                <button onClick={() => pan(0, 10)} style={dirBtn} aria-label="Flyt ned"><ArrowDown size={16}/></button>
                <div/>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => adjustZoom(0.05)} style={dirBtn} aria-label="Zoom ind"><Plus size={16}/></button>
                <button onClick={() => adjustZoom(-0.05)} style={dirBtn} aria-label="Zoom ud"><Minus size={16}/></button>
              </div>
              <button onClick={handleRotate} style={{ ...dirBtn, width: "auto", padding: "0 14px", gap: 6 }} aria-label="Rotér 90° mod uret">
                <RotateCcw size={16}/><span style={{ fontSize: 12, fontWeight: 600 }}>90°</span>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={handleReset} style={{ flex: 1, ...miniBtn(C.muted) }}>Nulstil</button>
          <button onClick={handleAutoEnhance} style={{ flex: 1, ...miniBtn(C.muted), display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Wand2 size={13}/> Auto-forbedring
          </button>
        </div>
        <button onClick={handleSave} style={{
          width: "100%", ...btn("primary"), border: `1px solid ${C.brand}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Check size={15}/> Gem
        </button>
      </div>
    </div>
  );
}
