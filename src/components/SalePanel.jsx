import { useState, useMemo } from "react";
import { GripVertical } from "lucide-react";
import { C } from "../constants";
import { conditionText } from "../utils";
import { btn, Empty } from "./ui";

function SaleCard({ disc, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd, onSold }) {
  const cond = disc.condition ?? 8;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "13px 14px",
        background: isDragOver ? C.raised : C.surface,
        border: `1px solid ${isDragOver ? C.brand : C.line}`,
        borderRadius: 14,
        opacity: isDragging ? 0.45 : 1,
        boxShadow: isDragOver ? `0 0 16px ${C.brand}25` : `0 0 10px ${C.brand}05`,
        cursor: "grab",
        userSelect: "none",
        transition: "border-color 0.1s, background 0.1s",
      }}
    >
      {/* Drag handle */}
      <div style={{ color: C.muted, flexShrink: 0, opacity: 0.5 }}>
        <GripVertical size={16}/>
      </div>

      {/* Photo or type badge */}
      {disc.pPhoto ? (
        <img src={disc.pPhoto} alt={disc.name} style={{
          width: 42, height: 42, borderRadius: "50%", objectFit: "cover",
          border: `1px solid ${C.line}`, flexShrink: 0,
        }}/>
      ) : (
        <div style={{
          width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
          background: `${disc.pColor || C.muted}18`,
          border: `1px solid ${disc.pColor || C.muted}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: disc.pColor || C.muted }}>{disc.type[0]}</span>
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: C.text, fontSize: 14, marginBottom: 2 }}>{disc.name}</div>
        <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.01em" }}>{disc.brand} · {disc.type}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.brand, fontWeight: 600 }}>
            {cond}/10 · {conditionText(cond)}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>
            {disc.hasInk ? "med ink" : "uden ink"}
          </span>
          {disc.saleNote && (
            <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>"{disc.saleNote}"</span>
          )}
        </div>
      </div>

      {/* Price + sold button */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        {disc.price ? (
          <div style={{ fontSize: 18, fontWeight: 700, color: C.brand, marginBottom: 6 }}>{disc.price}kr</div>
        ) : (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>ingen pris</div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onSold(); }}
          style={{
            fontSize: 11, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
            background: `${C.midrange}14`, border: `1px solid ${C.midrange}40`,
            color: C.midrange, fontWeight: 600, letterSpacing: "0.03em",
            display: "block",
          }}
        >
          Solgt ✓
        </button>
      </div>
    </div>
  );
}

export function SalePanel({ forSaleDiscs, saleOrder, setSaleOrder, onSold }) {
  const [draggingUid, setDraggingUid] = useState(null);
  const [dragOverUid, setDragOverUid] = useState(null);

  const orderedDiscs = useMemo(() => {
    const validUids = saleOrder.filter(uid => forSaleDiscs.some(d => d.uid === uid));
    const unsorted = forSaleDiscs.filter(d => !validUids.includes(d.uid));
    return [
      ...validUids.map(uid => forSaleDiscs.find(d => d.uid === uid)).filter(Boolean),
      ...unsorted,
    ];
  }, [forSaleDiscs, saleOrder]);

  function reorder(fromUid, toUid) {
    const uids = orderedDiscs.map(d => d.uid);
    const from = uids.indexOf(fromUid);
    const to = uids.indexOf(toUid);
    const next = [...uids];
    next.splice(from, 1);
    next.splice(to, 0, fromUid);
    setSaleOrder(next);
  }

  function copyList() {
    const lines = orderedDiscs.map(d => {
      const note = d.saleNote ? ` ${d.saleNote}` : "";
      const cond = `${d.condition ?? 8}/10`;
      const ink = d.hasInk ? "med ink" : "uden ink";
      const price = d.price ? `${d.price}kr` : "DM";
      return `${d.name}${note} ${cond} ${ink} - ${price}`;
    });
    const text = lines.join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert("Salgsliste kopieret til udklipsholder!"))
        .catch(() => prompt("Kopiér salgsliste:", text));
    } else {
      prompt("Kopiér salgsliste:", text);
    }
  }

  if (forSaleDiscs.length === 0) {
    return (
      <Empty text="Ingen discs til salg endnu. Åbn ✎ på en disc i Mine discs, og markér den som til salg."/>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary bar */}
      <div style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13,
        padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, color: C.muted, letterSpacing: "0.01em" }}>
          {orderedDiscs.length} disc{orderedDiscs.length !== 1 ? "s" : ""} til salg
        </span>
        <span style={{ fontSize: 11, color: C.muted, opacity: 0.7 }}>Træk for at sortere</span>
      </div>

      {/* Copy button */}
      <button onClick={copyList} style={{
        ...btn("primary"), display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8, width: "100%",
      }}>
        📋 Kopier salgsliste til Facebook
      </button>

      {/* Disc list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {orderedDiscs.map(d => (
          <SaleCard
            key={d.uid}
            disc={d}
            isDragging={draggingUid === d.uid}
            isDragOver={dragOverUid === d.uid}
            onDragStart={() => setDraggingUid(d.uid)}
            onDragOver={e => { e.preventDefault(); setDragOverUid(d.uid); }}
            onDrop={e => {
              e.preventDefault();
              if (draggingUid && draggingUid !== d.uid) reorder(draggingUid, d.uid);
              setDraggingUid(null);
              setDragOverUid(null);
            }}
            onDragEnd={() => { setDraggingUid(null); setDragOverUid(null); }}
            onSold={() => onSold(d.uid)}
          />
        ))}
      </div>

      {/* Facebook format hint */}
      <div style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13,
        padding: "11px 14px", fontSize: 12, color: C.muted, lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: C.text }}>Format til Facebook:</div>
        <code style={{ color: C.brand }}>Navn note tilstand/10 ink-status - priskr</code>
        <div style={{ marginTop: 4, opacity: 0.7 }}>fx: Zone SS first run 9/10 uden ink - 175kr</div>
      </div>
    </div>
  );
}
