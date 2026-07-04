import { useState, useMemo } from "react";
import { X, Search, Check } from "lucide-react";
import { C, TYPES } from "../constants";
import { DiscCard } from "./DiscCard";
import { Empty } from "./ui";

export function MoldPickerModal({ allDiscs, currentDiscId, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Alle");
  const [visibleCount, setVisibleCount] = useState(40);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allDiscs.filter(d => {
      if (typeFilter !== "Alle" && d.type !== typeFilter) return false;
      if (!q) return true;
      return (d.name + " " + d.brand).toLowerCase().includes(q);
    });
  }, [allDiscs, query, typeFilter]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(5,10,5,0.92)", display: "flex" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        margin: "0 auto", width: "100%", maxWidth: 560,
        display: "flex", flexDirection: "column", height: "100%", background: C.bg,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 16px 14px", borderBottom: `1px solid ${C.line}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Skift mold</span>
          <button onClick={onClose} aria-label="Luk" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={20}/>
          </button>
        </div>

        <div style={{ padding: "14px 16px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 13px", marginBottom: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13 }}>
            <Search size={17} color={C.muted}/>
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Søg efter mold…" autoFocus
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, padding: "13px 0", fontSize: 15 }}
            />
            {query && <button onClick={() => setQuery("")} aria-label="Ryd" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={15}/></button>}
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {["Alle", ...TYPES].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, letterSpacing: "0.02em",
                border: `1px solid ${typeFilter === t ? C.brand : C.line}`,
                background: typeFilter === t ? C.raised : "transparent",
                color: typeFilter === t ? C.text : C.muted,
              }}>{t}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.slice(0, visibleCount).map(d => (
              <DiscCard key={d.id} disc={d} actions={
                d.id === currentDiscId
                  ? [{ icon: Check, label: "Nuværende mold", onClick: () => {}, color: C.muted }]
                  : [{ icon: Check, label: "Vælg denne disc", onClick: () => onSelect(d), color: C.brand }]
              }/>
            ))}
            {filtered.length === 0 && <Empty text="Ingen discs matcher din søgning."/>}
          </div>

          {filtered.length > visibleCount && (
            <button onClick={() => setVisibleCount(v => v + 40)} style={{ width: "100%", marginTop: 16, padding: "13px 0", borderRadius: 13, cursor: "pointer", background: "transparent", border: `1px solid ${C.line}`, color: C.muted, fontSize: 14 }}>
              Vis {Math.min(40, filtered.length - visibleCount)} mere
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
