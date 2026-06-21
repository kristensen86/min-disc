import { useState } from "react";
import { C } from "../constants";
import { saleNumber, salePriceStrShort } from "../utils";

const COLS = 3;
const CELL_W = 160;
const PHOTO_D = 106;
const CELL_H = 16 + PHOTO_D + 10 + 16 + 15 + 12;
const HEADER_H = 54;
const FOOTER_H = 30;
const TYPE_COLORS = { Putter: "#93c5fd", Midrange: "#86efac", Fairway: "#fdba74", Distance: "#fca5a5" };

async function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function SaleGrid({ orderedDiscs, username }) {
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  async function generate() {
    if (orderedDiscs.length === 0) return;
    setGenerating(true);
    setImageUrl(null);
    await document.fonts.ready;

    const rows = Math.ceil(orderedDiscs.length / COLS);
    const W = COLS * CELL_W;
    const H = HEADER_H + rows * CELL_H + FOOTER_H;
    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);

    ctx.fillStyle = "#0a0f0a";
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = "#111811";
    ctx.fillRect(0, 0, W, HEADER_H);
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 24px Pacifico, 'DM Sans', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("BagUp", 14, HEADER_H / 2 + 1);
    if (username) {
      ctx.fillStyle = "#6b8f6b";
      ctx.font = "500 11px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`@${username.split("@")[0]}`, W - 14, HEADER_H / 2);
    }
    ctx.strokeStyle = "#1e2e1e";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_H);
    ctx.lineTo(W, HEADER_H);
    ctx.stroke();

    const images = await Promise.all(orderedDiscs.map(d => d.pPhoto ? loadImg(d.pPhoto) : Promise.resolve(null)));

    for (let i = 0; i < orderedDiscs.length; i++) {
      const d = orderedDiscs[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cellX = col * CELL_W;
      const cellY = HEADER_H + row * CELL_H;

      ctx.strokeStyle = "#1e2e1e80";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cellX + 0.25, cellY + 0.25, CELL_W - 0.5, CELL_H - 0.5);

      const cx = cellX + CELL_W / 2;
      const photoTop = cellY + 16;
      const cy = photoTop + PHOTO_D / 2;
      const r = PHOTO_D / 2;
      const img = images[i];

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      if (img) {
        const scale = Math.max(PHOTO_D / img.naturalWidth, PHOTO_D / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      } else {
        const tc = TYPE_COLORS[d.type] || "#6b8f6b";
        ctx.fillStyle = tc + "22";
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = tc;
        ctx.font = `bold ${Math.round(r * 0.8)}px 'DM Sans', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.type ? d.type[0] : "?", cx, cy + 1);
      }
      ctx.restore();

      ctx.strokeStyle = "#1e2e1e";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Number pill
      const numText = saleNumber(d);
      if (numText) {
        ctx.font = `bold 9px 'DM Sans', sans-serif`;
        const tw = ctx.measureText(numText).width;
        const ph = 16;
        const pw = Math.max(tw + 10, 26);
        const px = cx - r + 3;
        const py = photoTop + 3;
        ctx.fillStyle = "#0a0f0add";
        roundRect(ctx, px, py, pw, ph, 8);
        ctx.fill();
        ctx.strokeStyle = "#4ade8090";
        ctx.lineWidth = 0.75;
        roundRect(ctx, px, py, pw, ph, 8);
        ctx.stroke();
        ctx.fillStyle = "#4ade80";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(numText, px + pw / 2, py + ph / 2 + 0.5);
      }

      const textTop = photoTop + PHOTO_D + 10;
      ctx.fillStyle = "#e8f0e8";
      ctx.font = `600 12px 'DM Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const nameStr = d.name && d.name.length > 14 ? d.name.slice(0, 13) + "…" : (d.name || "");
      ctx.fillText(nameStr, cx, textTop);

      ctx.fillStyle = "#4ade80";
      ctx.font = `600 11px 'DM Sans', sans-serif`;
      ctx.fillText(salePriceStrShort(d), cx, textTop + 16);
    }

    // Footer
    const footerY = HEADER_H + rows * CELL_H;
    ctx.fillStyle = "#111811";
    ctx.fillRect(0, footerY, W, FOOTER_H);
    ctx.strokeStyle = "#1e2e1e";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, footerY);
    ctx.lineTo(W, footerY);
    ctx.stroke();
    ctx.fillStyle = "#6b8f6b";
    ctx.font = `400 10px 'DM Sans', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BagUp — disc golf collection tracker", W / 2, footerY + FOOTER_H / 2);

    setImageUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
  }

  async function share() {
    if (!imageUrl) return;
    try {
      const blob = await fetch(imageUrl).then(r => r.blob());
      const file = new File([blob], "bagup-salg.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "BagUp salgsliste" });
        return;
      }
    } catch { /* fall through */ }
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "bagup-salg.png";
    a.click();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        onClick={generate}
        disabled={generating || orderedDiscs.length === 0}
        style={{
          padding: "11px 18px", borderRadius: 13, cursor: orderedDiscs.length === 0 ? "default" : "pointer",
          border: `1px solid ${C.brand}`, background: C.raised, color: C.text,
          fontSize: 14, fontWeight: 600, letterSpacing: "0.01em",
          boxShadow: `0 2px 12px ${C.brand}18`,
          opacity: orderedDiscs.length === 0 ? 0.4 : 1,
        }}
      >
        {generating ? "Genererer…" : "🖼 Generér salgsbillede"}
      </button>

      {imageUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <img src={imageUrl} alt="Salgsbillede" style={{
            width: "100%", borderRadius: 12,
            border: `1px solid ${C.line}`, boxShadow: `0 0 20px ${C.brand}10`,
          }}/>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={share} style={{
              flex: 1, padding: "11px 0", borderRadius: 13, cursor: "pointer",
              border: `1px solid ${C.brand}`, background: C.raised,
              color: C.text, fontSize: 14, fontWeight: 600,
            }}>⬇ Gem / Del billede</button>
            <button onClick={() => setImageUrl(null)} style={{
              padding: "11px 16px", borderRadius: 13, cursor: "pointer",
              border: `1px solid ${C.line}`, background: "transparent",
              color: C.muted, fontSize: 14,
            }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
