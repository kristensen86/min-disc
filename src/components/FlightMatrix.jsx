import { useState, useRef } from "react";
import { C, TYPE_COLOR } from "../constants";

const LABEL_H = 9;
const LABEL_Y_GAP = 4;
function lw(t) { return t.length * 5.4 + 8; }

export function FlightMatrix({ discs, selectedId, onSelect }) {
  const [groupPopup, setGroupPopup] = useState(null);
  const svgRef = useRef(null);

  const W = 360, H = 460;
  const padL = 22, padR = 6, padT = 20, padB = 42;
  const stabMin = -6, stabMax = 6, speedMin = 1, speedMax = 14;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const r = 19;

  const mapX = s => padL + (stabMax - s) / (stabMax - stabMin) * plotW;
  const mapY = s => padT + (speedMax - s) / (speedMax - speedMin) * plotH;
  const dkey = d => d.uid ?? d.id;
  const clampX = x => Math.max(padL + r, Math.min(W - padR - r, x));
  const clampY = y => Math.max(padT + r, Math.min(H - padB - r, y));

  const xTicks = [-4, -2, 0, 2, 4];
  const yTicks = [2, 4, 6, 8, 10, 12, 14];

  // Group by exact clamped speed + stability
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

  // One label per group
  const labels = groups.map(g => {
    const names = g.discs.map(d => d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name);
    const text = (() => { const t = names.join(", "); return t.length > 20 ? t.slice(0, 19) + "…" : t; })();
    const w = lw(text);
    return {
      lx: Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, g.jx)),
      ly: Math.max(padT + LABEL_H / 2, Math.min(H - padB - LABEL_H / 2, g.jy + r + LABEL_Y_GAP + LABEL_H / 2)),
      w, text, isSel: g.isSel, g,
      color: g.discs[0].pColor || TYPE_COLOR[g.discs[0].type],
    };
  });

  // 3-pass collision push-apart
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

  function handleGroupTap(g) {
    if (g.discs.length === 1) {
      onSelect(dkey(g.discs[0]) === selectedId ? null : dkey(g.discs[0]));
    } else {
      setGroupPopup(g.discs);
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
    } catch { alert("Export fejlede."); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 16px", marginBottom: 8 }}>
        <button onClick={exportImage} style={{
          padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          cursor: "pointer", border: `1px solid ${C.line}`,
          background: "transparent", color: C.muted,
        }}>↑ Del</button>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <rect x="0" y="0" width={W} height={H} fill={C.surface}/>

        {/* Grid — only at shown tick values */}
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
          <text key={"x" + s} x={mapX(s)} y={H - padB + 12}
            fill={s === 0 ? C.muted : "#2a3e2a"} fontSize="8" textAnchor="middle">{s}</text>
        ))}
        {yTicks.map(s => (
          <text key={"y" + s} x={padL - 3} y={mapY(s) + 3} fill={C.muted} fontSize="7.5" textAnchor="end">{s}</text>
        ))}

        {/* OS / US edge labels */}
        <text x={padL + 2} y={H - padB + 24} fill={C.muted} fontSize="9" textAnchor="start" opacity="0.65">← OS</text>
        <text x={W - padR - 2} y={H - padB + 24} fill={C.muted} fontSize="9" textAnchor="end" opacity="0.65">US →</text>

        {/* Clip paths for photos */}
        <defs>
          {groups.filter(g => g.discs[0].pPhoto).map(g => (
            <clipPath key={"cp-" + g.key} id={"cp-" + g.key}>
              <circle cx={g.jx} cy={g.jy} r={r}/>
            </clipPath>
          ))}
        </defs>

        {/* Labels — drawn below markers */}
        {labels.map((lb, i) => (
          <text key={"lb" + i} x={lb.lx} y={lb.ly + 3.5}
            fill={lb.isSel ? C.text : C.muted} fontSize="7" textAnchor="middle"
            style={{ fontWeight: lb.isSel ? 600 : 400, cursor: "pointer" }}
            onClick={() => handleGroupTap(lb.g)}>{lb.text}</text>
        ))}

        {/* Group markers */}
        {groups.map(g => {
          const { jx, jy, isSel, discs: gd, key } = g;
          const lead = gd[0];
          const color = lead.pColor || TYPE_COLOR[lead.type];
          const count = gd.length;
          const badgeX = jx + r * 0.72;
          const badgeY = jy - r * 0.72;
          return (
            <g key={key} style={{ cursor: "pointer" }} onClick={() => handleGroupTap(g)}>
              {isSel && <circle cx={jx} cy={jy} r={r + 9} fill={color} fillOpacity="0.12"/>}
              {isSel && <circle cx={jx} cy={jy} r={r + 3} fill="none" stroke={color} strokeWidth="1.2" opacity="0.6"/>}
              {lead.pPhoto ? (
                <>
                  <circle cx={jx} cy={jy} r={r} fill={color} fillOpacity="0.12"
                    stroke={isSel ? color : color + "60"} strokeWidth={isSel ? "1.8" : "1"}/>
                  <image href={lead.pPhoto} x={jx - r} y={jy - r} width={r * 2} height={r * 2}
                    clipPath={`url(#cp-${key})`} preserveAspectRatio="xMidYMid slice"/>
                  <circle cx={jx} cy={jy} r={r} fill="none"
                    stroke={isSel ? color : color + "60"} strokeWidth={isSel ? "1.8" : "1"}/>
                </>
              ) : (
                <circle cx={jx} cy={jy} r={r} fill={color}
                  fillOpacity={isSel ? 0.88 : 0.72}
                  stroke={isSel ? C.bg : "none"} strokeWidth={isSel ? "2" : "0"}/>
              )}
              {count > 1 && (
                <g>
                  <circle cx={badgeX} cy={badgeY} r={8} fill={C.brand} stroke={C.bg} strokeWidth="1.5"/>
                  <text x={badgeX} y={badgeY + 3.5} fill={C.bg} fontSize="9"
                    textAnchor="middle" style={{ fontWeight: 700 }}>{count}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Group selection popup */}
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
                <button key={dkey(d)} onClick={() => { onSelect(isSelD ? null : dkey(d)); setGroupPopup(null); }} style={{
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
