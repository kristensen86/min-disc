import { useState, useRef } from "react";
import { Share2 } from "lucide-react";
import { C, TYPE_COLOR } from "../constants";

function lw(t) { return t.length * 4.8 + 6; }

async function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function FlightMatrix({ discs, selectedId, onSelect, sources = [], sourceKey = "owned", onSourceChange, onEditDisc = null }) {
  const [groupPopup, setGroupPopup] = useState(null);
  const svgRef = useRef(null);

  const W = 360, H = 580;
  const padL = 20, padR = 4, padT = 16, padB = 38;
  const stabMin = -6, stabMax = 6, speedMin = 1, speedMax = 14;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const r = 10;

  const mapX = s => padL + (stabMax - s) / (stabMax - stabMin) * plotW;
  const mapY = s => padT + (speedMax - s) / (speedMax - speedMin) * plotH;
  const dkey = d => d.uid ?? d.id;
  const clampX = x => Math.max(padL + r, Math.min(W - padR - r, x));
  const clampY = y => Math.max(padT + r, Math.min(H - padB - r, y));

  const xTicks = [-4, -2, 0, 2, 4];
  const yTicks = [2, 4, 6, 8, 10, 12, 14];

  // Group by clamped speed + stability
  const groupMap = new Map();
  discs.forEach(d => {
    const sx = +(d.fade + d.turn).toFixed(1);
    const csx = Math.max(stabMin, Math.min(stabMax, sx));
    const csp = Math.max(speedMin, Math.min(speedMax, d.speed));
    const key = `${csx}_${csp}`;
    if (!groupMap.has(key)) groupMap.set(key, { csx, csp, discs: [] });
    groupMap.get(key).discs.push(d);
  });

  const groups = [...groupMap.values()].map(({ csx, csp, discs: gd }) => ({
    jx: clampX(mapX(csx)),
    jy: clampY(mapY(csp)),
    discs: gd,
    isSel: gd.some(d => dkey(d) === selectedId),
    key: `${csx}_${csp}`,
  }));

  const LABEL_H = 8;
  const GAP = 4;

  // Build candidate label positions for each group
  function makeCandidates(g) {
    const { jx, jy } = g;
    const names = g.discs.map(d => d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name);
    const text = (() => { const t = names.join(", "); return t.length > 20 ? t.slice(0, 19) + "…" : t; })();
    const w = lw(text);
    // center-x clamped to SVG, anchor-y: label center
    const cx = x => Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x));
    const cy = y => Math.max(padT + LABEL_H / 2, Math.min(H - padB - LABEL_H / 2, y));
    return [
      // below
      { lx: cx(jx), ly: cy(jy + r + GAP + LABEL_H / 2), anchor: "below" },
      // above
      { lx: cx(jx), ly: cy(jy - r - GAP - LABEL_H / 2), anchor: "above" },
      // left (text right-anchored, lx = center of label to left of disc)
      { lx: cx(jx - r - GAP - w / 2), ly: cy(jy), anchor: "left" },
      // right
      { lx: cx(jx + r + GAP + w / 2), ly: cy(jy), anchor: "right" },
    ].map(c => ({ ...c, w, text, isSel: g.isSel, g, color: g.discs[0].pColor || TYPE_COLOR[g.discs[0].type] }));
  }

  function boxesOverlap(ax, ay, aw, bx, by, bw) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < LABEL_H;
  }

  function labelHitsMarker(lx, ly, lw, g2) {
    // Check if this label box overlaps another group's marker circle
    const dx = lx - g2.jx, dy = ly - g2.jy;
    const half = lw / 2;
    // Simplified: overlap if any corner of label box is within marker radius + 2
    return Math.sqrt(
      Math.pow(Math.max(0, Math.abs(dx) - half), 2) +
      Math.pow(Math.max(0, Math.abs(dy) - LABEL_H / 2), 2)
    ) < r + 2;
  }

  // Greedy placement: try each candidate in order, pick first non-colliding one
  const placed = [];
  const labels = groups.map(g => {
    const candidates = makeCandidates(g);
    let chosen = null;
    for (const cand of candidates) {
      let ok = true;
      // Check against already-placed labels
      for (const pl of placed) {
        if (boxesOverlap(cand.lx, cand.ly, cand.w, pl.lx, pl.ly, pl.w)) { ok = false; break; }
      }
      if (ok) {
        // Check against all marker circles (except own group)
        for (const g2 of groups) {
          if (g2.key === g.key) continue;
          if (labelHitsMarker(cand.lx, cand.ly, cand.w, g2)) { ok = false; break; }
        }
      }
      if (ok) { chosen = cand; break; }
    }
    // Fallback: use "below" position with connector line flag
    const label = chosen ?? { ...candidates[0], needsLine: true };
    placed.push(label);
    return label;
  });

  function handleGroupTap(g) {
    if (g.discs.length === 1) {
      const uid = dkey(g.discs[0]);
      onSelect(uid === selectedId ? null : uid);
      onEditDisc?.(uid);
    } else {
      setGroupPopup(g.discs);
    }
  }

  async function exportImage() {
    if (discs.length === 0) return;
    try {
      // Draw directly on a canvas (rather than rasterizing a serialized SVG data-URI):
      // an <img src="data:image/svg+xml..."> is decoded in an isolated context that can't
      // see the page's @font-face CSS, so custom fonts silently fall back to a system font.
      // Canvas 2D text drawn in this document has full access to already-loaded fonts.
      await document.fonts.ready;
      const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

      const photos = await Promise.all(groups.map(g => g.discs[0].pPhoto ? loadImg(g.discs[0].pPhoto) : Promise.resolve(null)));
      const photoByKey = new Map(groups.map((g, i) => [g.key, photos[i]]));

      const canvas = document.createElement("canvas");
      canvas.width = W * scale; canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      ctx.fillStyle = C.surface;
      ctx.fillRect(0, 0, W, H);

      // Grid
      xTicks.forEach(s => {
        ctx.save();
        ctx.strokeStyle = s === 0 ? C.brand : C.line;
        ctx.globalAlpha = s === 0 ? 0.35 : 0.12;
        ctx.lineWidth = s === 0 ? 1 : 0.5;
        if (s === 0) ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(mapX(s), padT); ctx.lineTo(mapX(s), H - padB); ctx.stroke();
        ctx.restore();
      });
      yTicks.forEach(s => {
        ctx.save();
        ctx.strokeStyle = C.line; ctx.globalAlpha = 0.12; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(padL, mapY(s)); ctx.lineTo(W - padR, mapY(s)); ctx.stroke();
        ctx.restore();
      });

      // Tick labels
      ctx.textBaseline = "alphabetic";
      xTicks.forEach(s => {
        ctx.fillStyle = s === 0 ? C.muted : "#2a3e2a";
        ctx.font = "7.5px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(s), mapX(s), H - padB + 11);
      });
      yTicks.forEach(s => {
        ctx.fillStyle = C.muted;
        ctx.font = "7px 'DM Sans', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(s), padL - 3, mapY(s) + 2.5);
      });

      // OS / US
      ctx.save();
      ctx.fillStyle = C.muted; ctx.globalAlpha = 0.6;
      ctx.font = "8.5px 'DM Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("← OS", padL + 2, H - padB + 22);
      ctx.textAlign = "right";
      ctx.fillText("US →", W - padR - 2, H - padB + 22);
      ctx.restore();

      // Labels + connector lines
      labels.forEach(lb => {
        if (lb.needsLine) {
          ctx.save();
          ctx.strokeStyle = lb.color; ctx.globalAlpha = 0.4; ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath(); ctx.moveTo(lb.g.jx, lb.g.jy); ctx.lineTo(lb.lx, lb.ly); ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = lb.isSel ? C.text : C.muted;
        ctx.font = `${lb.isSel ? 600 : 400} 6px 'DM Sans', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(lb.text, lb.lx, lb.ly + 3);
      });

      // Markers
      groups.forEach(g => {
        const { jx, jy, isSel, discs: gd, key } = g;
        const lead = gd[0];
        const color = lead.pColor || TYPE_COLOR[lead.type];
        const count = gd.length;
        const photo = photoByKey.get(key);

        if (isSel) {
          ctx.save();
          ctx.globalAlpha = 0.14; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(jx, jy, r + 6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.6; ctx.strokeStyle = color; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(jx, jy, r + 2, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }

        if (photo) {
          ctx.save();
          ctx.globalAlpha = 0.12; ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI * 2); ctx.clip();
          const s = Math.max((r * 2) / photo.naturalWidth, (r * 2) / photo.naturalHeight);
          const dw = photo.naturalWidth * s, dh = photo.naturalHeight * s;
          ctx.drawImage(photo, jx - dw / 2, jy - dh / 2, dw, dh);
          ctx.restore();
          ctx.strokeStyle = isSel ? color : color + "60";
          ctx.lineWidth = isSel ? 1.5 : 0.8;
          ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.save();
          ctx.globalAlpha = isSel ? 0.9 : 0.75;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          if (isSel) {
            ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI * 2); ctx.stroke();
          }
        }

        if (count > 1) {
          const badgeX = jx + r * 0.72, badgeY = jy - r * 0.72;
          ctx.fillStyle = C.brand;
          ctx.strokeStyle = C.bg; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(badgeX, badgeY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.bg;
          ctx.font = "700 7px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(count), badgeX, badgeY + 2.5);
        }
      });

      canvas.toBlob(blob => {
        if (!blob) return;
        const file = new File([blob], "flight-matrix.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          navigator.share({ files: [file], title: "BagUp Flight Matrix" }).catch(() => {});
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "flight-matrix.png";
          a.click();
        }
      }, "image/png");
    } catch { alert("Export fejlede."); }
  }

  return (
    <div data-no-swipe="true">
      {/* Control row — only renders select when sources are provided */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px",
        justifyContent: sources.length === 0 ? "flex-end" : "flex-start",
      }}>
        {sources.length > 0 && (
          <select
            value={sourceKey}
            onChange={e => onSourceChange?.(e.target.value)}
            style={{
              flex: 1, padding: "11px 13px", borderRadius: 12, cursor: "pointer",
              background: C.surface, border: `1px solid ${C.line}`,
              color: C.text, fontSize: 14, outline: "none",
            }}
          >
            {sources.map(s => (
              <option key={s.key} value={s.key} style={{ background: C.surface }}>{s.label}</option>
            ))}
          </select>
        )}
        <button
          onClick={exportImage}
          aria-label="Del matrix"
          style={{
            flexShrink: 0, width: 38, height: 38, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: `1px solid ${C.line}`,
            cursor: "pointer", color: C.muted,
          }}
        >
          <Share2 size={16}/>
        </button>
      </div>

      {discs.length === 0 ? (
        <div style={{ padding: "40px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>
          Ingen discs at vise her endnu.
        </div>
      ) : (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          <rect x="0" y="0" width={W} height={H} fill={C.surface}/>

          {/* Grid */}
          {xTicks.map(s => (
            <line key={"v" + s} x1={mapX(s)} x2={mapX(s)} y1={padT} y2={H - padB}
              stroke={s === 0 ? C.brand : C.line} strokeWidth={s === 0 ? "1" : "0.5"}
              strokeDasharray={s === 0 ? "4 3" : undefined} opacity={s === 0 ? 0.35 : 0.12}/>
          ))}
          {yTicks.map(s => (
            <line key={"h" + s} x1={padL} x2={W - padR} y1={mapY(s)} y2={mapY(s)}
              stroke={C.line} strokeWidth="0.5" opacity="0.12"/>
          ))}

          {/* Tick labels */}
          {xTicks.map(s => (
            <text key={"x" + s} x={mapX(s)} y={H - padB + 11}
              fill={s === 0 ? C.muted : "#2a3e2a"} fontSize="7.5" textAnchor="middle">{s}</text>
          ))}
          {yTicks.map(s => (
            <text key={"y" + s} x={padL - 3} y={mapY(s) + 2.5} fill={C.muted} fontSize="7" textAnchor="end">{s}</text>
          ))}

          {/* OS / US */}
          <text x={padL + 2} y={H - padB + 22} fill={C.muted} fontSize="8.5" textAnchor="start" opacity="0.6">← OS</text>
          <text x={W - padR - 2} y={H - padB + 22} fill={C.muted} fontSize="8.5" textAnchor="end" opacity="0.6">US →</text>

          {/* Clip paths */}
          <defs>
            {groups.filter(g => g.discs[0].pPhoto).map(g => (
              <clipPath key={"cp-" + g.key} id={"cp-" + g.key}>
                <circle cx={g.jx} cy={g.jy} r={r}/>
              </clipPath>
            ))}
          </defs>

          {/* Labels + optional connector lines */}
          {labels.map((lb, i) => (
            <g key={"lb" + i} style={{ cursor: "pointer" }} onClick={() => handleGroupTap(lb.g)}>
              {lb.needsLine && (
                <line x1={lb.g.jx} y1={lb.g.jy} x2={lb.lx} y2={lb.ly}
                  stroke={lb.color} strokeWidth="0.5" opacity="0.4" strokeDasharray="2 2"/>
              )}
              <text x={lb.lx} y={lb.ly + 3}
                fill={lb.isSel ? C.text : C.muted} fontSize="6" textAnchor="middle"
                style={{ fontWeight: lb.isSel ? 600 : 400 }}>{lb.text}</text>
            </g>
          ))}

          {/* Markers */}
          {groups.map(g => {
            const { jx, jy, isSel, discs: gd, key } = g;
            const lead = gd[0];
            const color = lead.pColor || TYPE_COLOR[lead.type];
            const count = gd.length;
            const badgeX = jx + r * 0.72;
            const badgeY = jy - r * 0.72;
            return (
              <g key={key} style={{ cursor: "pointer" }} onClick={() => handleGroupTap(g)}>
                {isSel && <circle cx={jx} cy={jy} r={r + 6} fill={color} fillOpacity="0.14"/>}
                {isSel && <circle cx={jx} cy={jy} r={r + 2} fill="none" stroke={color} strokeWidth="1" opacity="0.6"/>}
                {lead.pPhoto ? (
                  <>
                    <circle cx={jx} cy={jy} r={r} fill={color} fillOpacity="0.12"
                      stroke={isSel ? color : color + "60"} strokeWidth={isSel ? "1.5" : "0.8"}/>
                    <image href={lead.pPhoto} x={jx - r} y={jy - r} width={r * 2} height={r * 2}
                      clipPath={`url(#cp-${key})`} preserveAspectRatio="xMidYMid slice"/>
                    <circle cx={jx} cy={jy} r={r} fill="none"
                      stroke={isSel ? color : color + "60"} strokeWidth={isSel ? "1.5" : "0.8"}/>
                  </>
                ) : (
                  <circle cx={jx} cy={jy} r={r} fill={color}
                    fillOpacity={isSel ? 0.9 : 0.75}
                    stroke={isSel ? C.bg : "none"} strokeWidth={isSel ? "1.5" : "0"}/>
                )}
                {count > 1 && (
                  <g>
                    <circle cx={badgeX} cy={badgeY} r={5} fill={C.brand} stroke={C.bg} strokeWidth="1.2"/>
                    <text x={badgeX} y={badgeY + 2.5} fill={C.bg} fontSize="7"
                      textAnchor="middle" style={{ fontWeight: 700 }}>{count}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Group selection bottom sheet */}
      {groupPopup && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 250,
          background: "rgba(5,10,5,0.72)",
          display: "flex", alignItems: "flex-end",
        }} onClick={() => setGroupPopup(null)}>
          <div style={{
            width: "100%", maxWidth: 560, margin: "0 auto",
            background: C.raised, borderRadius: "20px 20px 0 0",
            padding: "20px 16px 36px",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, textAlign: "center", letterSpacing: "0.04em" }}>
              Vælg disc
            </div>
            {groupPopup.map(d => {
              const color = d.pColor || TYPE_COLOR[d.type];
              const isSelD = dkey(d) === selectedId;
              return (
                <button key={dkey(d)} onClick={() => { const uid = dkey(d); onSelect(isSelD ? null : uid); setGroupPopup(null); onEditDisc?.(uid); }} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 0", background: "transparent", border: "none",
                  borderBottom: `1px solid ${C.line}15`, cursor: "pointer", color: C.text,
                  textAlign: "left",
                }}>
                  <div style={{
                    width: 40, height: 40, flexShrink: 0, borderRadius: "50%",
                    background: d.pPhoto ? C.raised : `${color}22`,
                    border: `1.5px solid ${isSelD ? color : color + "50"}`,
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {d.pPhoto
                      ? <img src={d.pPhoto} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                      : <span style={{ fontSize: 15, fontWeight: 800, color }}>{d.type[0]}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isSelD ? 700 : 500, color: isSelD ? C.brand : C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {d.brand} · {d.speed}/{d.glide}/{d.turn}/{d.fade}
                    </div>
                  </div>
                  {isSelD && <span style={{ fontSize: 13, color: C.brand }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
