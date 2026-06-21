import { useState, useMemo } from "react";
import { GripVertical } from "lucide-react";
import { C } from "../constants";
import { conditionText, saleNumber, salePriceStr } from "../utils";
import { Empty } from "./ui";
import { SaleGrid } from "./SaleGrid";
import { SaleHistory } from "./SaleHistory";

function SaleCard({ disc, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd, onSold, onEdit }) {
  const cond = disc.condition ?? 8;
  const num = saleNumber(disc);
  const priceStr = disc.saleBIN || disc.price
    ? disc.saleMP
      ? `MP: ${disc.saleMP}kr / BIN: ${disc.saleBIN || disc.price}kr`
      : `BIN: ${disc.saleBIN || disc.price}kr`
    : "ingen pris";

  function handleSold() {
    const buyer = window.prompt("Solgt! Købers navn (valgfrit — tryk OK for at springe over):", "");
    if (buyer === null) return;
    onSold(buyer);
  }

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
      <div style={{ color: C.muted, flexShrink: 0, opacity: 0.5 }}>
        <GripVertical size={16}/>
      </div>

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

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
          {num && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.brand,
              background: `${C.brand}15`, border: `1px solid ${C.brand}40`,
              padding: "2px 7px", borderRadius: 999, letterSpacing: "0.02em", flexShrink: 0,
            }}>{num}</span>
          )}
          <span style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>{disc.name}</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.01em", marginBottom: 4 }}>{disc.brand} · {disc.type}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.brand, fontWeight: 600 }}>
            {cond}/10 · {conditionText(cond)}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>{disc.hasInk ? "med ink" : "uden ink"}</span>
          {disc.saleNote && (
            <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>"{disc.saleNote}"</span>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{
          fontSize: disc.saleMP ? 12 : 15, fontWeight: 700,
          color: disc.saleBIN || disc.price ? C.brand : C.muted,
          marginBottom: 6, lineHeight: 1.3,
        }}>{priceStr}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{
              fontSize: 11, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
              background: `${C.brand}12`, border: `1px solid ${C.brand}35`,
              color: C.brand, fontWeight: 600, letterSpacing: "0.03em",
            }}
          >✎ Rediger</button>
          <button
            onClick={e => { e.stopPropagation(); handleSold(); }}
            style={{
              fontSize: 11, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
              background: `${C.midrange}14`, border: `1px solid ${C.midrange}40`,
              color: C.midrange, fontWeight: 600, letterSpacing: "0.03em",
            }}
          >Solgt ✓</button>
        </div>
      </div>
    </div>
  );
}

export function SalePanel({ forSaleDiscs, saleOrder, setSaleOrder, onSold, onEdit, username, soldHistory, onClearHistory }) {
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

  function buildListText() {
    return orderedDiscs.map(d => {
      const num = saleNumber(d);
      const note = d.saleNote ? ` ${d.saleNote}` : "";
      const cond = `${d.condition ?? 8}/10`;
      const ink = d.hasInk ? "med ink" : "uden ink";
      const price = salePriceStr(d);
      return `${num ? num + " " : ""}${d.name} ${d.brand}${note} ${cond} ${ink} - ${price}`;
    }).join("\n");
  }

  async function shareList() {
    const text = buildListText();
    if (navigator.share) {
      try {
        await navigator.share({ text, title: "BagUp salgsliste" });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      alert("Salgsliste kopieret til udklipsholder!");
    } else {
      prompt("Kopiér salgsliste:", text);
    }
  }

  function copyList() {
    const text = buildListText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert("Salgsliste kopieret til udklipsholder!"))
        .catch(() => prompt("Kopiér salgsliste:", text));
    } else {
      prompt("Kopiér salgsliste:", text);
    }
  }

  if (forSaleDiscs.length === 0 && (!soldHistory || soldHistory.length === 0)) {
    return (
      <Empty text="Ingen discs til salg endnu. Åbn ✎ på en disc i Mine discs, og markér den som til salg."/>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {forSaleDiscs.length > 0 && (
        <>
          <div style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13,
            padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, color: C.muted, letterSpacing: "0.01em" }}>
              {orderedDiscs.length} disc{orderedDiscs.length !== 1 ? "s" : ""} til salg
            </span>
            <span style={{ fontSize: 11, color: C.muted, opacity: 0.7 }}>Træk for at sortere</span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={shareList} style={{
              flex: 1, padding: "11px 0", borderRadius: 13, cursor: "pointer",
              border: `1px solid ${C.brand}`, background: C.raised,
              color: C.text, fontSize: 13, fontWeight: 600, letterSpacing: "0.01em",
              boxShadow: `0 2px 12px ${C.brand}18`,
            }}>
              ↗ Del liste
            </button>
            <button onClick={copyList} style={{
              flex: 1, padding: "11px 0", borderRadius: 13, cursor: "pointer",
              border: `1px solid ${C.line}`, background: "transparent",
              color: C.muted, fontSize: 13, fontWeight: 600, letterSpacing: "0.01em",
            }}>
              📋 Kopier
            </button>
          </div>

          <SaleGrid orderedDiscs={orderedDiscs} username={username}/>

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
                onSold={buyer => onSold(d.uid, buyer)}
                onEdit={() => onEdit(d.uid)}
              />
            ))}
          </div>

          <div style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13,
            padding: "11px 14px", fontSize: 12, color: C.muted, lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: C.text }}>Format:</div>
            <code style={{ color: C.brand }}>1.1 Navn Producent note tilstand/10 ink - MP: xkr / BIN: ykr</code>
          </div>
        </>
      )}

      <SaleHistory history={soldHistory} onClear={onClearHistory}/>
    </div>
  );
}
