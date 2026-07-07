import { useState, useRef, useEffect } from "react";
import { X, Sun, Contrast, Droplet, Thermometer, Focus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, Minus, RotateCcw, Wand2, Check } from "lucide-react";
import { C } from "../constants";
import { btn, miniBtn } from "./ui";
import { enhancePhoto } from "../photoEnhance";

const OUT = 400;
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

// Fine-tunes a photo that's already been cropped (auto-crop output, or an
// existing disc photo) — brightness/contrast/saturation/warmth/sharpness
// sliders, a small pan+zoom for nudging the crop, and a 90° rotate for
// photos that came out sideways. `resetSrc` (defaults to `src`) is what
// "Nulstil" reverts to — pass the untouched auto-crop result so resetting
// always goes back to that, not to a previous manual edit.
export function ImageAdjuster({ src, resetSrc = null, onSave, onCancel }) {
  const [baseImg, setBaseImg] = useState(null);
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(src).then(img => { if (!cancelled) setBaseImg(img); }).catch(() => {});
    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImg) return;
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
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
  }, [baseImg, adjust, panX, panY, zoom, rotation]);

  function resetAll(img) {
    setAdjust(DEFAULT_ADJUST);
    setPanX(0); setPanY(0); setZoom(1); setRotation(0);
    if (img) setBaseImg(img);
  }

  function handleReset() {
    loadImage(resetSrc || src).then(resetAll).catch(() => resetAll(null));
  }

  async function handleAutoEnhance() {
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
  function rotate() { setRotation(r => (r - 90 + 360) % 360); }

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
            width: 220, height: 220, borderRadius: "50%",
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
            <button onClick={rotate} style={{ ...dirBtn, width: "auto", padding: "0 14px", gap: 6 }} aria-label="Rotér 90° mod uret">
              <RotateCcw size={16}/><span style={{ fontSize: 12, fontWeight: 600 }}>90°</span>
            </button>
          </div>
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
