import { C, TYPE_COLOR } from "../constants";

const LABEL_H = 10;
const LABEL_PAD_Y = 4;

function labelWidth(name) {
  return name.length * 6 + 8;
}

function resolveLabels(pts, W, H, padL, padR, padT, padB) {
  const labels = pts.map(({ jx, jy, d }) => {
    const name = d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name;
    const w = labelWidth(name);
    // Start below the dot
    let lx = jx;
    let ly = jy + 8 + LABEL_PAD_Y + LABEL_H / 2;
    return { lx, ly, w, name, d };
  });

  // Clamp helper
  const clamp = (label) => {
    const hw = label.w / 2;
    label.lx = Math.max(padL + hw, Math.min(W - padR - hw, label.lx));
    label.ly = Math.max(padT + LABEL_H / 2, Math.min(H - padB - LABEL_H / 2, label.ly));
  };

  labels.forEach(clamp);

  // 3 passes of collision resolution
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        const overlapX = (a.w / 2 + b.w / 2) - Math.abs(a.lx - b.lx);
        const overlapY = LABEL_H - Math.abs(a.ly - b.ly);
        if (overlapX > 0 && overlapY > 0) {
          // Separate vertically: push upper up, lower down
          if (a.ly <= b.ly) {
            a.ly -= 10;
            b.ly += 10;
          } else {
            a.ly += 10;
            b.ly -= 10;
          }
          clamp(a);
          clamp(b);
        }
      }
    }
  }

  return labels;
}

export function FlightMatrix({ discs, selectedId, onSelect }) {
  const W = 300, H = 460, padL = 28, padR = 8, padT = 34, padB = 44;
  const stabMin = -5, stabMax = 5, speedMin = 1, speedMax = 14;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const getStab = d => +(d.fade + d.turn).toFixed(1);
  const mapX = s => padL + (stabMax - s) / (stabMax - stabMin) * plotW;
  const mapY = s => padT + (speedMax - s) / (speedMax - speedMin) * plotH;
  const stabTicks = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5];
  const speedTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const dkey = d => d.uid ?? d.id;

  const pts = discs.map(d => {
    const sx = getStab(d);
    return {
      x: mapX(Math.max(stabMin, Math.min(stabMax, sx))),
      y: mapY(Math.max(speedMin, Math.min(speedMax, d.speed))),
      d,
    };
  });

  const placed = pts.map((p, i) => {
    const cluster = pts.filter(q => Math.abs(q.x - p.x) < 2 && Math.abs(q.y - p.y) < 2);
    if (cluster.length === 1) return { ...p, jx: p.x, jy: p.y };
    const idx = cluster.indexOf(p), total = cluster.length;
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
    return { ...p, jx: p.x + Math.cos(angle) * 10, jy: p.y + Math.sin(angle) * 10 };
  });

  const resolvedLabels = resolveLabels(placed, W, H, padL, padR, padT, padB);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <rect x="0" y="0" width={W} height={H} rx="12" fill={C.surface} stroke={C.line}/>
      {stabTicks.map(s => (
        <line key={"v" + s} x1={mapX(s)} x2={mapX(s)} y1={padT} y2={H - padB}
          stroke={s === 0 ? C.brand : C.line} strokeWidth={s === 0 ? "1.2" : "0.5"}
          strokeDasharray={s === 0 ? "4 3" : undefined} opacity={s === 0 ? 0.6 : 0.18}/>
      ))}
      {speedTicks.map(s => (
        <line key={"h" + s} x1={padL} x2={W - padR} y1={mapY(s)} y2={mapY(s)}
          stroke={C.line} strokeWidth="0.5" opacity="0.18"/>
      ))}
      {stabTicks.map(s => (
        <text key={"x" + s} x={mapX(s)} y={H - padB + 13}
          fill={s === 0 ? C.muted : "#2a3e2a"} fontSize="8" textAnchor="middle">{s}</text>
      ))}
      {speedTicks.filter(s => s % 2 === 0 || s === 1).map(s => (
        <text key={"y" + s} x={padL - 4} y={mapY(s) + 3} fill={C.muted} fontSize="8" textAnchor="end">{s}</text>
      ))}
      <text x={W / 2} y={13} fill={C.muted} fontSize="9" textAnchor="middle" style={{ letterSpacing: "0.06em" }}>Stability (Turn + Fade)</text>
      <text x={padL} y={padT - 7} fill={C.muted} fontSize="7">← Overstabil</text>
      <text x={W - padR} y={padT - 7} fill={C.muted} fontSize="7" textAnchor="end">Understabil →</text>
      <text x={padL - 4} y={padT - 7} fill={C.muted} fontSize="7" textAnchor="end">S</text>

      {/* Labels (drawn first so dots render on top) */}
      {resolvedLabels.map(({ lx, ly, w, name, d }) => {
        const isSel = dkey(d) === selectedId;
        const color = d.pColor || TYPE_COLOR[d.type];
        const fontSize = isSel ? 8 : 7;
        const textColor = isSel ? C.text : C.muted;
        return (
          <g key={"lbl-" + dkey(d)} style={{ cursor: "pointer" }} onClick={() => onSelect(dkey(d) === selectedId ? null : dkey(d))}>
            <rect x={lx - w / 2} y={ly - LABEL_H / 2} width={w} height={LABEL_H} rx={4}
              fill={C.bg} stroke={isSel ? color : color + "40"} strokeWidth={isSel ? "0.75" : "0.5"}
              opacity={isSel ? 0.97 : 0.85}
              style={isSel ? { filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))" } : undefined}/>
            <text x={lx} y={ly + fontSize / 2 - 0.5} fill={textColor} fontSize={fontSize} textAnchor="middle"
              style={{ fontWeight: isSel ? 600 : 400 }}>{name}</text>
          </g>
        );
      })}

      {/* Dots */}
      {placed.map(({ jx, jy, d }) => {
        const isSel = dkey(d) === selectedId;
        const color = d.pColor || TYPE_COLOR[d.type];
        return (
          <g key={dkey(d)} style={{ cursor: "pointer" }} onClick={() => onSelect(dkey(d) === selectedId ? null : dkey(d))}>
            {isSel && <circle cx={jx} cy={jy} r="16" fill={color} fillOpacity="0.1"/>}
            {isSel && <circle cx={jx} cy={jy} r="11" fill="none" stroke={color} strokeWidth="1" opacity="0.5"/>}
            <circle cx={jx} cy={jy} r={isSel ? 8 : 6} fill={color} fillOpacity={isSel ? 1 : 0.88} stroke={C.bg} strokeWidth="1.2"/>
          </g>
        );
      })}
    </svg>
  );
}
