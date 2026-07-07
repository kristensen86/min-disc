// Auto-enhances a disc photo: histogram-stretch auto-levels, a contrast
// boost, and a saturation lift — all local canvas work. If the result is
// still very dark or very bright, Claude Vision is asked for a small
// brightness/contrast/saturation nudge, applied as a canvas filter.

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function requestAiAdjustment(dataUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("/api/scan", {
      signal: controller.signal,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
            { type: "text", text: `Disc golf disc billede. Returner KUN JSON:
{ "brightness": tal (-50 til +50), "contrast": tal (-50 til +50), "saturation": tal (-50 til +50), "isAcceptable": boolean }` },
          ],
        }],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// Returns an enhanced JPEG data URL. Falls back to the original on any failure.
export async function enhancePhoto(dataUrl) {
  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Auto-levels: stretch each channel's histogram so the darkest pixel
    // maps to 0 and the lightest to 255.
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (g < minG) minG = g; if (g > maxG) maxG = g;
      if (b < minB) minB = b; if (b > maxB) maxB = b;
    }
    const rangeR = maxR - minR || 1, rangeG = maxG - minG || 1, rangeB = maxB - minB || 1;

    let sum = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;

      let r = (data[i] - minR) / rangeR * 255;
      let g = (data[i + 1] - minG) / rangeG * 255;
      let b = (data[i + 2] - minB) / rangeB * 255;

      // Contrast boost
      r = clamp((r - 128) * 1.2 + 128);
      g = clamp((g - 128) * 1.2 + 128);
      b = clamp((b - 128) * 1.2 + 128);

      // Saturation +15%
      const [h, s, l] = rgbToHsl(r, g, b);
      const [nr, ng, nb] = hslToRgb(h, Math.min(1, s * 1.15), l);

      data[i] = clamp(nr);
      data[i + 1] = clamp(ng);
      data[i + 2] = clamp(nb);

      sum += data[i] + data[i + 1] + data[i + 2];
      count++;
    }

    ctx.putImageData(imageData, 0, 0);

    const avgBrightness = count ? sum / (count * 3) : 128;

    if (avgBrightness < 60 || avgBrightness > 200) {
      const baseDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const adjustment = await requestAiAdjustment(baseDataUrl);
      if (adjustment) {
        const b = 100 + Number(adjustment.brightness || 0);
        const c = 100 + Number(adjustment.contrast || 0);
        const s = 100 + Number(adjustment.saturation || 0);
        const filterCanvas = document.createElement("canvas");
        filterCanvas.width = canvas.width;
        filterCanvas.height = canvas.height;
        const fctx = filterCanvas.getContext("2d");
        fctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
        fctx.drawImage(canvas, 0, 0);
        return filterCanvas.toDataURL("image/jpeg", 0.85);
      }
    }

    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return dataUrl;
  }
}
