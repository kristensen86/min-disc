import { useState, useRef, useEffect } from "react";
import { X, Camera, Image as ImageIcon, Loader } from "lucide-react";
import { C, DISC_COLORS, TYPES, typeFromSpeed } from "../constants";
import { resizeImage } from "../utils";

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const CONF = {
  high:   { label: "Høj sikkerhed", color: C.brand },
  medium: { label: "Middel sikkerhed", color: "#fdba74" },
  low:    { label: "Lav sikkerhed", color: C.distance },
};

async function cropFromBbox(imageDataUrl, bbox) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const px = (bbox.x / 100) * img.width;
        const py = (bbox.y / 100) * img.height;
        const pw = (bbox.width / 100) * img.width;
        const ph = (bbox.height / 100) * img.height;
        const size = 400;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, px, py, pw, ph, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}

export function BulkDiscScanner({ onAddDisc, onDone, onClose }) {
  const [phase, setPhase] = useState("upload"); // upload|loading|cards|edit|done
  const [imageUrl, setImageUrl] = useState(null);
  const [discs, setDiscs] = useState([]);
  const [croppedPhotos, setCroppedPhotos] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [addedCount, setAddedCount] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState(null); // "left"|"right"|null
  const [editDisc, setEditDisc] = useState(null);
  const [editVals, setEditVals] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const cameraRef = useRef();
  const galleryRef = useRef();

  useEffect(() => {
    if (phase === "cards" && showSwipeHint) {
      const t = setTimeout(() => setShowSwipeHint(false), 2000);
      return () => clearTimeout(t);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(file) {
    if (!file) return;
    setErrorMsg("");

    let dataUrl;
    try {
      dataUrl = await resizeImage(file, 1200);
    } catch {
      setErrorMsg("Kunne ikke læse billedet.");
      return;
    }

    setImageUrl(dataUrl);
    setPhase("loading");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

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
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
              { type: "text", text: `Dette billede viser flere disc golf discs spredt på en flade.
Identificér ALLE discs du kan se i billedet.
For hver disc returner:
{
  "id": unikt nummer (1, 2, 3...),
  "name": disc mold navn,
  "brand": mærke,
  "plastic": plasttype hvis synlig,
  "color": farve på dansk,
  "colorHex": hex farvekode,
  "speed": tal eller null,
  "glide": tal eller null,
  "turn": tal eller null,
  "fade": tal eller null,
  "confidence": "high"/"medium"/"low",
  "bbox": {"x": %, "y": %, "width": %, "height": %} — bounding box i procent af billedstørrelse
}

Svar KUN med JSON: { "discs": [...] }

Inkluder alle synlige discs, selv med confidence "low".` },
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
      const found = parsed.discs || [];

      if (found.length === 0) {
        setErrorMsg("Ingen discs fundet. Prøv med et tydeligere billede.");
        setPhase("upload");
        return;
      }

      setDiscs(found);
      setCurrentIdx(0);
      setAddedCount(0);
      setPhase("cards");
      setShowSwipeHint(true);

      // Pre-crop in background after showing cards
      setTimeout(async () => {
        const crops = {};
        for (const disc of found) {
          if (disc.bbox) {
            try { crops[disc.id] = await cropFromBbox(dataUrl, disc.bbox); } catch {}
          }
        }
        setCroppedPhotos(crops);
      }, 100);

    } catch (e) {
      clearTimeout(timeout);
      setErrorMsg(e.name === "AbortError" ? "Timeout — prøv igen med kortere analyse." : `Fejl: ${e.message}`);
      setPhase("upload");
    }
  }

  function doAdvance(idx, newAddedCount) {
    if (idx >= discs.length - 1) {
      setAddedCount(newAddedCount);
      setPhase("done");
    } else {
      setCurrentIdx(idx + 1);
      setDragX(0);
    }
  }

  function animateSwipe(dir, action) {
    if (swipeAnim) return;
    setSwipeAnim(dir);
    const newCount = action(); // returns new addedCount
    setTimeout(() => {
      setSwipeAnim(null);
      doAdvance(currentIdx, newCount ?? addedCount);
    }, 280);
  }

  function addCurrent() {
    const disc = discs[currentIdx];
    const photo = croppedPhotos[disc.id] || null;
    onAddDisc({ name: disc.name, brand: disc.brand, speed: disc.speed, glide: disc.glide, turn: disc.turn, fade: disc.fade, plastic: disc.plastic, colorHex: disc.colorHex }, photo);
    return addedCount + 1;
  }

  // Pointer events for swipe
  function onPointerDown(e) {
    if (swipeAnim) return;
    setIsDragging(true);
    setDragStartX(e.touches ? e.touches[0].clientX : e.clientX);
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    setDragX(cx - dragStartX);
  }
  function onPointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 90;
    if (dragX > threshold) {
      animateSwipe("right", addCurrent);
    } else if (dragX < -threshold) {
      animateSwipe("left", () => addedCount);
    } else {
      setDragX(0);
    }
  }

  function openEdit(disc) {
    if (Math.abs(dragX) > 8) return; // ignore tap after drag
    setEditDisc(disc);
    setEditVals({
      name: disc.name || "",
      brand: disc.brand || "",
      type: disc.type || (disc.speed ? typeFromSpeed(Number(disc.speed)) : "Distance"),
      speed: disc.speed ?? "",
      glide: disc.glide ?? "",
      turn: disc.turn ?? "",
      fade: disc.fade ?? "",
      plastic: disc.plastic || "",
      colorHex: disc.colorHex || "",
      weight: "",
    });
    setPhase("edit");
  }

  function confirmEdit() {
    const photo = croppedPhotos[editDisc.id] || null;
    onAddDisc({
      name: editVals.name,
      brand: editVals.brand,
      speed: editVals.speed,
      glide: editVals.glide,
      turn: editVals.turn,
      fade: editVals.fade,
      plastic: editVals.plastic,
      colorHex: editVals.colorHex,
      pWeight: editVals.weight,
    }, photo);
    const newCount = addedCount + 1;
    setPhase("cards");
    setEditDisc(null);
    doAdvance(currentIdx, newCount);
  }

  function skipEdit() {
    setPhase("cards");
    setEditDisc(null);
    doAdvance(currentIdx, addedCount);
  }

  // Derived card visuals
  const disc = discs[currentIdx];
  const photo = disc ? (croppedPhotos[disc.id] || null) : null;
  const discColor = disc?.colorHex || C.brand;
  const conf = disc ? (CONF[disc.confidence] || CONF.low) : CONF.low;

  const rotation = swipeAnim === "right" ? 12 : swipeAnim === "left" ? -12 : Math.max(-12, Math.min(12, dragX * 0.08));
  const cardX = swipeAnim === "right" ? 500 : swipeAnim === "left" ? -500 : dragX;
  const overlayRatio = Math.min(1, Math.abs(dragX) / 130);
  const showGreen = dragX > 25 || swipeAnim === "right";
  const showRed   = dragX < -25 || swipeAnim === "left";

  const inputStyle = {
    width: "100%", background: C.raised, border: `1px solid ${C.line}`,
    borderRadius: 10, color: C.text, padding: "10px 12px", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: C.bg, display: "flex", flexDirection: "column",
      maxWidth: 560, margin: "0 auto",
      overflowY: phase === "edit" ? "auto" : "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 16px 12px",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        flexShrink: 0,
      }}>
        <button
          onClick={phase === "edit" ? () => { setPhase("cards"); setEditDisc(null); } : onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, display: "flex" }}>
          <X size={20}/>
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.text, flex: 1 }}>
          {phase === "edit" ? "Rediger disc" : "Bulk scan"}
        </span>
        {phase === "cards" && disc && (
          <span style={{ fontSize: 13, color: C.muted }}>
            {currentIdx + 1} af {discs.length}
          </span>
        )}
      </div>

      {/* ── UPLOAD ── */}
      {phase === "upload" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px 40px" }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>🥏</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8, textAlign: "center" }}>
            Scan flere discs på én gang
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 32, textAlign: "center", lineHeight: 1.6 }}>
            Læg 3–15 discs spredt ud —<br/>tag et billede eller vælg fra dit galleri
          </div>

          {errorMsg && (
            <div style={{ color: C.distance, fontSize: 13, marginBottom: 20, textAlign: "center", padding: "10px 16px", background: `${C.distance}15`, borderRadius: 10, border: `1px solid ${C.distance}30`, width: "100%", maxWidth: 340 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 340 }}>
            <button
              onClick={() => cameraRef.current.click()}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                padding: "22px 12px", borderRadius: 18, cursor: "pointer",
                background: `${C.brand}12`, border: `1.5px solid ${C.brand}50`, color: C.brand,
              }}>
              <Camera size={28}/>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Tag billede</span>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])}/>
            </button>
            <button
              onClick={() => galleryRef.current.click()}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                padding: "22px 12px", borderRadius: 18, cursor: "pointer",
                background: `${C.brand}12`, border: `1.5px solid ${C.brand}50`, color: C.brand,
              }}>
              <ImageIcon size={28}/>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Vælg fra galleri</span>
              <input ref={galleryRef} type="file" accept="image/*"
                style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])}/>
            </button>
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {phase === "loading" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 32 }}>
          {imageUrl && (
            <div style={{ width: 220, height: 220, borderRadius: 20, overflow: "hidden", border: `1px solid ${C.line}`, opacity: 0.5 }}>
              <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted }}>
            <Loader size={18} style={{ animation: "spin 1s linear infinite" }}/>
            <span style={{ fontSize: 14 }}>Analyserer discs...</span>
          </div>
        </div>
      )}

      {/* ── CARDS ── */}
      {phase === "cards" && disc && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 16px 20px", gap: 16, position: "relative" }}>

          {/* Swipe hint */}
          {showSwipeHint && (
            <div style={{
              position: "absolute", top: "44%", left: 0, right: 0, zIndex: 20,
              display: "flex", justifyContent: "space-between", padding: "0 44px",
              pointerEvents: "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.distance, fontSize: 13, fontWeight: 700, background: `${C.distance}20`, padding: "6px 14px", borderRadius: 999 }}>
                ← Spring over
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.brand, fontSize: 13, fontWeight: 700, background: `${C.brand}20`, padding: "6px 14px", borderRadius: 999 }}>
                Tilføj →
              </div>
            </div>
          )}

          {/* Card */}
          <div
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragX(0); } }}
            onTouchStart={onPointerDown}
            onTouchMove={e => { e.preventDefault(); onPointerMove(e); }}
            onTouchEnd={onPointerUp}
            onClick={() => openEdit(disc)}
            style={{
              width: "100%", maxWidth: 400,
              background: C.surface, border: `1px solid ${C.line}`,
              borderRadius: 24, padding: "22px 20px 24px",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none", touchAction: "none",
              transform: `translateX(${cardX}px) rotate(${rotation}deg)`,
              transition: swipeAnim || !isDragging ? "transform 0.28s cubic-bezier(.25,.46,.45,.94), box-shadow 0.15s" : "none",
              boxShadow: showGreen
                ? `0 10px 48px ${C.brand}50`
                : showRed
                ? `0 10px 48px ${C.distance}50`
                : `0 8px 32px rgba(0,0,0,0.5)`,
              position: "relative", overflow: "hidden",
              flexShrink: 0,
            }}>

            {/* Directional overlays */}
            {showGreen && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 24, zIndex: 5, pointerEvents: "none",
                background: `${C.brand}${Math.round(overlayRatio * 50).toString(16).padStart(2, "0")}`,
                display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 28,
              }}>
                <span style={{ fontSize: 52, opacity: overlayRatio }}>✓</span>
              </div>
            )}
            {showRed && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 24, zIndex: 5, pointerEvents: "none",
                background: `${C.distance}${Math.round(overlayRatio * 50).toString(16).padStart(2, "0")}`,
                display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 28,
              }}>
                <span style={{ fontSize: 52, opacity: overlayRatio }}>✕</span>
              </div>
            )}

            {/* Disc photo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{
                width: 170, height: 170, borderRadius: "50%",
                border: `3px solid ${discColor}60`,
                background: photo ? C.raised : `${discColor}18`,
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 32px ${discColor}30`,
              }}>
                {photo
                  ? <img src={photo} alt={disc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  : <span style={{ fontSize: 52, fontWeight: 800, color: discColor }}>
                      {(disc.type?.[0] || disc.name?.[0] || "?").toUpperCase()}
                    </span>
                }
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 3 }}>
                {disc.name || "Ukendt disc"}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                {[disc.brand, disc.type].filter(Boolean).join(" · ")}
              </div>

              {/* Chips row */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                {disc.plastic && (
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${C.brand}15`, color: C.brand, border: `1px solid ${C.brand}30` }}>
                    {disc.plastic}
                  </span>
                )}
                {disc.colorHex && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: C.raised, border: `1px solid ${C.line}`, color: C.muted }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: disc.colorHex, flexShrink: 0, display: "inline-block" }}/>
                    {disc.color}
                  </span>
                )}
              </div>

              {/* Flight numbers */}
              {[disc.speed, disc.glide, disc.turn, disc.fade].some(v => v != null) && (
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                  {[["S", disc.speed], ["G", disc.glide], ["T", disc.turn], ["F", disc.fade]].map(([label, val]) =>
                    val != null ? (
                      <div key={label} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        background: C.raised, borderRadius: 10, padding: "5px 11px",
                        border: `1px solid ${C.line}`, minWidth: 40,
                      }}>
                        <span style={{ fontSize: 9, color: C.muted, letterSpacing: "0.04em", marginBottom: 1 }}>{label}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{val}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* Confidence */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${conf.color}15`, color: conf.color, border: `1px solid ${conf.color}30` }}>
                  {conf.label}
                </span>
              </div>

              <div style={{ fontSize: 11, color: C.muted, opacity: 0.5 }}>Tryk for at redigere</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 14, width: "100%", maxWidth: 400 }}>
            <button
              onClick={() => animateSwipe("left", () => addedCount)}
              disabled={!!swipeAnim}
              style={{
                flex: 1, padding: "13px 0", borderRadius: 14, cursor: "pointer", fontSize: 14, fontWeight: 600,
                background: `${C.distance}12`, border: `1px solid ${C.distance}40`, color: C.distance,
                opacity: swipeAnim ? 0.5 : 1,
              }}>
              ✕ Spring over
            </button>
            <button
              onClick={() => animateSwipe("right", addCurrent)}
              disabled={!!swipeAnim}
              style={{
                flex: 1, padding: "13px 0", borderRadius: 14, cursor: "pointer", fontSize: 14, fontWeight: 600,
                background: `${C.brand}18`, border: `1px solid ${C.brand}50`, color: C.brand,
                opacity: swipeAnim ? 0.5 : 1,
              }}>
              ✓ Tilføj
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT ── */}
      {phase === "edit" && editVals && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 32px" }}>
          {editDisc && croppedPhotos[editDisc.id] && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", border: `2px solid ${C.brand}40` }}>
                <img src={croppedPhotos[editDisc.id]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name + Brand */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Navn</label>
                <input style={inputStyle} value={editVals.name} onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}/>
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={labelStyle}>Mærke</label>
                <input style={inputStyle} value={editVals.brand} onChange={e => setEditVals(v => ({ ...v, brand: e.target.value }))}/>
              </div>
            </div>

            {/* Type */}
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: "flex", gap: 6 }}>
                {TYPES.map(t => (
                  <button key={t} onClick={() => setEditVals(v => ({ ...v, type: t }))
                  } style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600,
                    border: `1px solid ${editVals.type === t ? C.brand : C.line}`,
                    background: editVals.type === t ? `${C.brand}18` : "transparent",
                    color: editVals.type === t ? C.brand : C.muted,
                  }}>{t}</button>
                ))}
              </div>
            </div>

            {/* Flight numbers */}
            <div>
              <label style={labelStyle}>Flight-tal</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {[["Speed", "speed"], ["Glide", "glide"], ["Turn", "turn"], ["Fade", "fade"]].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, textAlign: "center" }}>{label}</div>
                    <input
                      type="number"
                      style={{ ...inputStyle, textAlign: "center", padding: "8px 4px" }}
                      value={editVals[key]}
                      onChange={e => setEditVals(v => ({ ...v, [key]: e.target.value }))}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Plastic + Weight */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Plast</label>
                <input style={inputStyle} value={editVals.plastic} onChange={e => setEditVals(v => ({ ...v, plastic: e.target.value }))} placeholder="f.eks. Champion"/>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Vægt (g)</label>
                <input type="number" style={inputStyle} value={editVals.weight} onChange={e => setEditVals(v => ({ ...v, weight: e.target.value }))} placeholder="175"/>
              </div>
            </div>

            {/* Color */}
            <div>
              <label style={labelStyle}>Farve</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DISC_COLORS.map(c => (
                  <button key={c} onClick={() => setEditVals(v => ({ ...v, colorHex: c }))} style={{
                    width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer",
                    border: editVals.colorHex === c ? `3px solid ${C.text}` : `2px solid transparent`,
                    boxShadow: editVals.colorHex === c ? `0 0 0 2px ${C.brand}` : `0 0 8px ${c}50`,
                    flexShrink: 0,
                  }}/>
                ))}
                <button onClick={() => setEditVals(v => ({ ...v, colorHex: "" }))} style={{
                  width: 32, height: 32, borderRadius: "50%", background: C.raised, cursor: "pointer",
                  border: `1px solid ${C.line}`, fontSize: 16, color: C.muted, flexShrink: 0,
                }}>×</button>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={skipEdit} style={{
                flex: 1, padding: "13px 0", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600,
                background: "transparent", border: `1px solid ${C.line}`, color: C.muted,
              }}>Spring over</button>
              <button onClick={confirmEdit} style={{
                flex: 2, padding: "13px 0", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700,
                background: C.brand, border: "none", color: C.bg,
              }}>Gem og tilføj</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === "done" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 14 }}>
          <div style={{ fontSize: 60 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Færdig!</div>
          <div style={{ fontSize: 15, color: C.muted, textAlign: "center" }}>
            Du tilføjede <span style={{ color: C.brand, fontWeight: 700 }}>{addedCount}</span> disc{addedCount !== 1 ? "s" : ""} til din samling.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300, marginTop: 16 }}>
            <button onClick={onDone || onClose} style={{
              padding: "14px 0", borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 700,
              background: C.brand, border: "none", color: C.bg, width: "100%",
            }}>Se mine discs</button>
            <button onClick={() => { setPhase("upload"); setDiscs([]); setCurrentIdx(0); setAddedCount(0); setImageUrl(null); setCroppedPhotos({}); setErrorMsg(""); }} style={{
              padding: "13px 0", borderRadius: 14, cursor: "pointer", fontSize: 14, fontWeight: 600,
              background: "transparent", border: `1px solid ${C.line}`, color: C.muted, width: "100%",
            }}>Scan flere</button>
          </div>
        </div>
      )}
    </div>
  );
}
