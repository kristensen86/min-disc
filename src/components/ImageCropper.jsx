import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../constants";

const DISPLAY = 280;
const OUTPUT = 300;

function pinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function ImageCropper({ src, onSave, onCancel }) {
  const [img, setImg] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [fillScale, setFillScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pinchStart, setPinchStart] = useState(null);
  const [pinchScaleBase, setPinchScaleBase] = useState(1);
  const areaRef = useRef(null);
  const stateRef = useRef({});

  stateRef.current = { dragging, dragStart, pinchStart, pinchScaleBase, scale, fillScale, offset };

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const fs = Math.max(DISPLAY / image.naturalWidth, DISPLAY / image.naturalHeight);
      setImg(image);
      setFillScale(fs);
      setScale(fs);
      setOffset({ x: 0, y: 0 });
    };
    image.src = src;
    return () => URL.revokeObjectURL(src);
  }, [src]);

  const clamp = useCallback((s) => {
    const fs = stateRef.current.fillScale;
    return Math.max(fs * 0.8, Math.min(fs * 5, s));
  }, []);

  function save() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();
    const ratio = OUTPUT / DISPLAY;
    const imgW = img.naturalWidth * scale * ratio;
    const imgH = img.naturalHeight * scale * ratio;
    const x = (OUTPUT - imgW) / 2 + offset.x * ratio;
    const y = (OUTPUT - imgH) / 2 + offset.y * ratio;
    ctx.drawImage(img, x, y, imgW, imgH);
    onSave(canvas.toDataURL("image/png"));
  }

  // Mouse handlers
  function onMouseDown(e) {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }
  function onMouseMove(e) {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }
  function onMouseUp() { setDragging(false); }

  // Touch handlers (touchstart + touchend via React, touchmove via non-passive listener)
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      const s = stateRef.current;
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - s.offset.x, y: e.touches[0].clientY - s.offset.y });
    } else if (e.touches.length === 2) {
      setDragging(false);
      setPinchStart(pinchDist(e.touches));
      setPinchScaleBase(stateRef.current.scale);
    }
  }
  function onTouchEnd() {
    setDragging(false);
    setPinchStart(null);
  }

  const touchMoveHandler = useCallback((e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (e.touches.length === 1 && s.dragging) {
      setOffset({ x: e.touches[0].clientX - s.dragStart.x, y: e.touches[0].clientY - s.dragStart.y });
    } else if (e.touches.length === 2 && s.pinchStart) {
      const newDist = pinchDist(e.touches);
      setScale(Math.max(s.fillScale * 0.8, Math.min(s.fillScale * 5, s.pinchScaleBase * (newDist / s.pinchStart))));
    }
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.addEventListener("touchmove", touchMoveHandler, { passive: false });
    return () => el.removeEventListener("touchmove", touchMoveHandler);
  }, [touchMoveHandler]);

  const imgW = img ? img.naturalWidth * scale : DISPLAY;
  const imgH = img ? img.naturalHeight * scale : DISPLAY;
  const imgLeft = (DISPLAY - imgW) / 2 + offset.x;
  const imgTop = (DISPLAY - imgH) / 2 + offset.y;

  return (
    <div data-no-swipe="true" style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(5,10,5,0.92)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 24, padding: 24,
    }}>
      <div style={{ fontSize: 13, color: C.muted, letterSpacing: "0.02em" }}>
        Flyt og zoom for at beskære
      </div>

      {/* Crop circle */}
      <div
        ref={areaRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          width: DISPLAY, height: DISPLAY, borderRadius: "50%",
          overflow: "hidden", position: "relative",
          cursor: dragging ? "grabbing" : "grab",
          border: `2px solid ${C.brand}90`,
          boxShadow: `0 0 0 6px ${C.brand}18, 0 0 40px ${C.brand}20`,
          userSelect: "none", touchAction: "none", flexShrink: 0,
          background: C.raised,
        }}
      >
        {img ? (
          <img src={src} draggable={false} style={{
            position: "absolute",
            left: imgLeft, top: imgTop,
            width: imgW, height: imgH,
            pointerEvents: "none",
          }}/>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Indlæser…</span>
          </div>
        )}
      </div>

      {/* Zoom slider */}
      {img && (
        <div style={{ width: DISPLAY, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, color: C.muted, lineHeight: 1 }}>−</span>
          <input
            type="range"
            min={fillScale * 0.8} max={fillScale * 5} step={0.001}
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.brand, cursor: "pointer" }}
          />
          <span style={{ fontSize: 16, color: C.muted, lineHeight: 1 }}>+</span>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onCancel} style={{
          padding: "13px 26px", borderRadius: 13, cursor: "pointer",
          border: `1px solid ${C.line}`, background: "transparent",
          color: C.muted, fontSize: 14, fontWeight: 600, letterSpacing: "0.01em",
        }}>Annullér</button>
        <button onClick={save} disabled={!img} style={{
          padding: "13px 26px", borderRadius: 13, cursor: img ? "pointer" : "default",
          border: `1px solid ${C.brand}`, background: C.raised,
          color: C.text, fontSize: 14, fontWeight: 600, letterSpacing: "0.01em",
          boxShadow: `0 2px 16px ${C.brand}25`,
          opacity: img ? 1 : 0.5,
        }}>Gem foto</button>
      </div>
    </div>
  );
}
