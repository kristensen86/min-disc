import { useState, useMemo } from "react";
import { C, TYPE_COLOR, TYPES } from "../constants";
import { resolveDisc } from "../utils";

function getBagDiscs(bag, ownedDiscs, overrides) {
  if (!bag) return [];
  return (bag.bagEntries || []).map(e => {
    const inst = ownedDiscs.find(od => od.uid === e.instanceId);
    return inst ? resolveDisc(inst, overrides) : null;
  }).filter(Boolean);
}

function CompactDisc({ disc, highlight, onEditDisc }) {
  const color = disc.pColor || TYPE_COLOR[disc.type];
  return (
    <div
      className={onEditDisc ? "tap-editable" : undefined}
      role={onEditDisc ? "button" : undefined}
      tabIndex={onEditDisc ? 0 : undefined}
      onClick={onEditDisc ? () => onEditDisc(disc.uid) : undefined}
      onKeyDown={onEditDisc ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEditDisc(disc.uid); } } : undefined}
      aria-label={onEditDisc ? `Rediger ${disc.name}` : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 0",
        borderBottom: `1px solid ${C.line}10`,
        borderRadius: 8,
      }}>
      <div style={{
        width: 24, height: 24, flexShrink: 0, borderRadius: "50%",
        background: disc.pPhoto ? C.raised : `${color}20`,
        border: `1px solid ${highlight ? C.brand + "80" : color + "40"}`,
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {disc.pPhoto
          ? <img src={disc.pPhoto} alt={disc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          : <span style={{ fontSize: 10, fontWeight: 800, color }}>{disc.type[0]}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: highlight ? C.brand : C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{disc.name}</div>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.02em" }}>
          {disc.speed}/{disc.glide}/{disc.turn}/{disc.fade}
        </div>
      </div>
    </div>
  );
}

function BagColumn({ bag, discs, sharedIds, bags, selectedId, onSelect, onEditDisc }) {
  const typeCounts = TYPES.map(t => ({ t, n: discs.filter(d => d.type === t).length })).filter(x => x.n > 0);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <select value={selectedId} onChange={e => onSelect(e.target.value)} style={{
        width: "100%", padding: "8px 10px", marginBottom: 10, borderRadius: 10,
        background: C.surface, border: `1px solid ${C.line}`,
        color: C.text, fontSize: 12, appearance: "none", cursor: "pointer",
      }}>
        <option value="" style={{ background: C.surface }}>Vælg bag…</option>
        {bags.map(b => (
          <option key={b.id} value={b.id} style={{ background: C.surface }}>{b.name}</option>
        ))}
      </select>

      {bag && (
        <>
          {TYPES.filter(t => discs.some(d => d.type === t)).map(t => (
            <div key={t} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: TYPE_COLOR[t], marginBottom: 3,
              }}>{t}</div>
              {discs.filter(d => d.type === t).map((d, i) => (
                <CompactDisc key={d.uid ?? d.id + i} disc={d} highlight={sharedIds.has(d.id)} onEditDisc={onEditDisc}/>
              ))}
            </div>
          ))}

          <div style={{
            marginTop: 10, padding: "8px 10px", borderRadius: 8,
            background: C.raised, border: `1px solid ${C.line}`,
            fontSize: 10, color: C.muted,
          }}>
            <span style={{ color: C.text, fontWeight: 600 }}>{discs.length} discs</span>
            {" · "}
            {typeCounts.map(({ t, n }) => `${n}${t[0]}`).join(", ")}
          </div>
        </>
      )}
    </div>
  );
}

export function BagComparison({ bags, ownedDiscs, allDiscs, overrides, onEditDisc }) {
  const defaultA = bags[0]?.id ?? "";
  const defaultB = bags[1]?.id ?? "";
  const [idA, setIdA] = useState(defaultA);
  const [idB, setIdB] = useState(defaultB);

  const bagA = bags.find(b => b.id === idA) ?? null;
  const bagB = bags.find(b => b.id === idB) ?? null;

  const discsA = useMemo(() => getBagDiscs(bagA, ownedDiscs, overrides), [bagA, ownedDiscs, overrides]);
  const discsB = useMemo(() => getBagDiscs(bagB, ownedDiscs, overrides), [bagB, ownedDiscs, overrides]);

  const idsB = useMemo(() => new Set(discsB.map(d => d.id)), [discsB]);
  const idsA = useMemo(() => new Set(discsA.map(d => d.id)), [discsA]);
  const sharedIds = useMemo(() => new Set([...idsA].filter(id => idsB.has(id))), [idsA, idsB]);

  if (bags.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: C.muted, fontSize: 13 }}>
        Opret mindst to bags for at sammenligne.
      </div>
    );
  }

  return (
    <div>
      {sharedIds.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          padding: "8px 12px", borderRadius: 10,
          background: `${C.brand}0e`, border: `1px solid ${C.brand}25`,
          fontSize: 11, color: C.brand,
        }}>
          <span style={{ fontWeight: 700 }}>{sharedIds.size}</span>
          <span style={{ color: C.muted }}>disc{sharedIds.size !== 1 ? "s" : ""} i begge bags er fremhævet</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <BagColumn bag={bagA} discs={discsA} sharedIds={sharedIds} bags={bags} selectedId={idA} onSelect={setIdA} onEditDisc={onEditDisc}/>
        <div style={{ width: 1, background: C.line, flexShrink: 0 }}/>
        <BagColumn bag={bagB} discs={discsB} sharedIds={sharedIds} bags={bags} selectedId={idB} onSelect={setIdB} onEditDisc={onEditDisc}/>
      </div>
    </div>
  );
}
