import { useState, useRef } from "react";
import { C, TYPE_COLOR } from "../constants";

const LABEL_H = 10;
const LABEL_PAD_Y = 5;

function lw(name) { return name.length * 5.8 + 10; }

export function FlightMatrix({ discs, selectedId, onSelect }) {
  const [showLabels, setShowLabels] = useState(true);
  const [markerSize, setMarkerSize] = useState(36);
  const svgRef = useRef(null);

  const W = 320, H = 480;
  const padL = 30, padR = 10, padT = 38, padB = 46;
  const stabMin = -6, stabMax = 6, speedMin = 1, speedMax = 14;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const r = markerSize / 2;

  const getStab = d => +(d.fade + d.turn).toFixed(1);
  const mapX = s => padL + (stabMax - s) / (stabMax - stabMin) * plotW;
  const mapY = s => padT + (speedMax - s) / (speedMax - speedMin) * plotH;
  const dkey = d => d.uid ?? d.id;
  const clampX = x => Math.max(padL + r, Math.min(W - padR - r, x));
  const clampY = y => Math.max(padT + r, Math.min(H - padB - r, y));

  const stabTicks = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  const speedTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  // Map each disc to its base position and cluster key
  const pts = discs.map(d => {
    const sx = Math.max(stabMin, Math.min(stabMax, getStab(d)));
    const sp = Math.max(speedMin, Math.min(speedMax, d.speed));
    const bx = mapX(sx), by = mapY(sp);
    return { bx, by, posKey: `${sx}_${sp}`, d };
  });

  // Jitter within cluster
  const placed = pts.map((p, i) => {
    const cluster = pts.filter(q => Math.abs(q.bx - p.bx) < 2 && Math.abs(q.by - p.by) < 2);
    if (cluster.length === 1) return { ...p, jx: clampX(p.bx), jy: clampY(p.by) };
    const idx = cluster.indexOf(p), total = cluster.length;
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
    const spread = Math.max(r * 0.55, 10);
    return { ...p, jx: clampX(p.bx + Math.cos(angle) * spread), jy: clampY(p.by + Math.sin(angle) * spread) };
  });

  // Build one label per position cluster
  const groupMap = {};
  placed.forEach(p => {
    if (!groupMap[p.posKey]) groupMap[p.posKey] = [];
    groupMap[p.posKey].push(p);
  });

  const labels = Object.values(groupMap).map(group => {
    const cx = group.reduce((s, p) => s + p.jx, 0) / group.length;
    const cy = group.reduce((s, p) => s + p.jy, 0) / group.length;
    const shortNames = group.map(p => p.d.name.length > 10 ? p.d.name.slice(0, 9) + "…" : p.d.name);
    const text = shortNames.join(", ").slice(0, 22);
    const isSel = group.some(p => dkey(p.d) === selectedId);
    const w = lw(text);
    let lx = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, cx));
    let ly = Math.max(padT + LABEL_H / 2, Math.min(H - padB - LABEL_H / 2, cy + r + LABEL_PAD_Y + LABEL_H / 2));
    return { lx, ly, w, text, isSel, group, color: group[0].d.pColor || TYPE_COLOR[group[0].d.type] };
  });

  // 3-pass collision avoidance
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        if ((a.w / 2 + b.w / 2) - Math.abs(a.lx - b.lx) > 0 && LABEL_H - Math.abs(a.ly - b.ly) > 0) {
          if (a.ly <= b.ly) { a.ly -= 10; b.ly += 10; }
          else { a.ly += 10; b.ly -= 10; }
          [a, b].forEach(l => {
            l.lx = Math.max(l.w / 2 + 2, Math.min(W - l.w / 2 - 2, l.lx));
            l.ly = Math.max(padT + LABEL_H / 2, Math.min(H - padB - LABEL_H / 2, l.ly));
          });
        }
      }
    }
  }

  async function exportImage() {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale; canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej;
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
      });
      ctx.drawImage(img, 0, 0, W, H);
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
    } catch (e) {
      alert("Export fejlede — prøv igen.");
    }
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button onClick={() => setShowLabels(v => !v)} style={{
          flexShrink: 0, padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          cursor: "pointer", border: `1px solid ${showLabels ? C.brand : C.line}`,
          background: showLabels ? `${C.brand}18` : "transparent",
          color: showLabels ? C.brand : C.muted,
        }}>Labels</button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>Størrelse</span>
          <input type="range" min={24} max={56} value={markerSize}
            onChange={e => setMarkerSize(+e.target.value)}
            style={{ flex: 1, accentColor: C.brand, cursor: "pointer" }}/>
          <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, minWidth: 28 }}>{markerSize}px</span>
        </div>
        <button onClick={exportImage} style={{
          flexShrink: 0, padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          cursor: "pointer", border: `1px solid ${C.line}`,
          background: "transparent", color: C.muted,
        }}>↑ Del</button>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <rect x="0" y="0" width={W} height={H} rx="12" fill={C.surface} stroke={C.line}/>

        {/* Grid lines */}
        {stabTicks.map(s => (
          <line key={"v" + s} x1={mapX(s)} x2={mapX(s)} y1={padT} y2={H - padB}
            stroke={s === 0 ? C.brand : C.line} strokeWidth={s === 0 ? "1.2" : "0.5"}
            strokeDasharray={s === 0 ? "4 3" : undefined} opacity={s === 0 ? 0.6 : 0.15}/>
        ))}
        {speedTicks.map(s => (
          <line key={"h" + s} x1={padL} x2={W - padR} y1={mapY(s)} y2={mapY(s)}
            stroke={C.line} strokeWidth="0.5" opacity="0.15"/>
        ))}

        {/* Axis tick labels */}
        {stabTicks.filter(s => s % 2 === 0).map(s => (
          <text key={"x" + s} x={mapX(s)} y={H - padB + 13}
            fill={s === 0 ? C.muted : "#2a3e2a"} fontSize="7" textAnchor="middle">{s}</text>
        ))}
        {speedTicks.filter(s => s % 2 === 0 || s === 1).map(s => (
          <text key={"y" + s} x={padL - 4} y={mapY(s) + 3} fill={C.muted} fontSize="7" textAnchor="end">{s}</text>
        ))}

        {/* Axis titles */}
        <text x={W / 2} y={15} fill={C.muted} fontSize="8" textAnchor="middle" style={{ letterSpacing: "0.04em" }}>
          {"← Overstabil · Stabil · Understabil →"}
        </text>
        <text x={padL - 4} y={padT - 10} fill={C.muted} fontSize="7" textAnchor="end">Speed</text>

        {/* Clip paths for photos */}
        <defs>
          {placed.filter(p => p.d.pPhoto).map(p => (
            <clipPath key={"cp-" + dkey(p.d)} id={"cp-" + dkey(p.d)}>
              <circle cx={p.jx} cy={p.jy} r={r}/>
            </clipPath>
          ))}
        </defs>

        {/* Labels rendered below dots */}
        {showLabels && labels.map((lb, i) => (
          <g key={"lb" + i} style={{ cursor: "pointer" }}
            onClick={() => lb.group.length === 1 && onSelect(dkey(lb.group[0].d) === selectedId ? null : dkey(lb.group[0].d))}>
            <rect x={lb.lx - lb.w / 2} y={lb.ly - LABEL_H / 2} width={lb.w} height={LABEL_H} rx={4}
              fill={C.bg} stroke={lb.isSel ? lb.color : lb.color + "40"}
              strokeWidth={lb.isSel ? "0.75" : "0.5"} opacity={lb.isSel ? 0.97 : 0.85}
              style={lb.isSel ? { filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))" } : undefined}/>
            <text x={lb.lx} y={lb.ly + (lb.isSel ? 8 : 7) / 2 - 0.5}
              fill={lb.isSel ? C.text : C.muted}
              fontSize={lb.isSel ? 8 : 7} textAnchor="middle"
              style={{ fontWeight: lb.isSel ? 600 : 400 }}>{lb.text}</text>
          </g>
        ))}

        {/* Disc markers */}
        {placed.map(({ jx, jy, d }) => {
          const isSel = dkey(d) === selectedId;
          const color = d.pColor || TYPE_COLOR[d.type];
          return (
            <g key={dkey(d)} style={{ cursor: "pointer" }} onClick={() => onSelect(dkey(d) === selectedId ? null : dkey(d))}>
              {isSel && <circle cx={jx} cy={jy} r={r + 9} fill={color} fillOpacity="0.1"/>}
              {isSel && <circle cx={jx} cy={jy} r={r + 3} fill="none" stroke={color} strokeWidth="1.2" opacity="0.6"/>}
              {d.pPhoto ? (
                <>
                  <circle cx={jx} cy={jy} r={r} fill={color} fillOpacity="0.15"
                    stroke={isSel ? color : color + "70"} strokeWidth={isSel ? "1.8" : "1"}/>
                  <image href={d.pPhoto} x={jx - r} y={jy - r} width={r * 2} height={r * 2}
                    clipPath={`url(#cp-${dkey(d)})`} preserveAspectRatio="xMidYMid slice"/>
                  <circle cx={jx} cy={jy} r={r} fill="none"
                    stroke={isSel ? color : color + "70"} strokeWidth={isSel ? "1.8" : "1"}/>
                </>
              ) : (
                <>
                  <circle cx={jx} cy={jy} r={r} fill={color}
                    fillOpacity={isSel ? 0.28 : 0.2}
                    stroke={isSel ? color : color + "70"} strokeWidth={isSel ? "1.8" : "1"}/>
                  <text x={jx} y={jy + r * 0.36} fill={color} fontSize={r * 0.72}
                    textAnchor="middle" style={{ fontWeight: 800 }}>{d.type[0]}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
