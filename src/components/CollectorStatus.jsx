import { useState, useMemo } from "react";
import { C, TYPE_COLOR, typeBarStyle } from "../constants";

export function CollectorStatus({ resolvedOwned, allDiscs }) {
  const [expandedBrand, setExpandedBrand] = useState(null);

  const brandGroups = useMemo(() => {
    const map = {};
    allDiscs.filter(d => !d.isCustom).forEach(d => {
      if (!map[d.brand]) map[d.brand] = [];
      map[d.brand].push(d);
    });

    const ownedIds = new Set(resolvedOwned.map(d => d.id));

    return Object.entries(map)
      .map(([brand, discs]) => {
        const owned = discs.filter(d => ownedIds.has(d.id)).length;
        const total = discs.length;
        const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
        const missing = discs.filter(d => !ownedIds.has(d.id));
        const ownedTypeCounts = {};
        resolvedOwned.filter(d => d.brand === brand).forEach(d => {
          ownedTypeCounts[d.type] = (ownedTypeCounts[d.type] || 0) + 1;
        });
        const dominantType = Object.entries(ownedTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        return { brand, owned, total, pct, missing, dominantType };
      })
      .filter(g => g.owned > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [allDiscs, resolvedOwned]);

  if (brandGroups.length === 0) return null;

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16,
      padding: "16px 18px", boxShadow: `0 0 20px ${C.brand}06`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: C.muted, marginBottom: 14,
      }}>Samlerstatus</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {brandGroups.map(({ brand, owned, total, pct, missing, dominantType }) => {
          const isExpanded = expandedBrand === brand;
          const bar = dominantType ? typeBarStyle(dominantType) : { background: C.muted };
          return (
            <div key={brand}>
              <button
                onClick={() => setExpandedBrand(isExpanded ? null : brand)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 0", background: "transparent", border: "none",
                  borderBottom: `1px solid ${C.line}10`, cursor: "pointer", color: C.text,
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13, flex: 1, color: C.text }}>{brand}</span>
                <div style={{ width: 70, height: 4, borderRadius: 2, background: C.line, flexShrink: 0 }}>
                  <div style={{
                    height: 4, borderRadius: 2, width: `${pct}%`,
                    transition: "width 0.3s", ...bar,
                  }}/>
                </div>
                <span style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 11, color: C.muted, width: 46, textAlign: "right", flexShrink: 0 }}>
                  {owned}/{total}
                </span>
                <span style={{
                  fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
                  fontSize: 10, color: C.brand, width: 34, textAlign: "right",
                  fontWeight: 600, flexShrink: 0,
                }}>{pct}%</span>
              </button>

              {isExpanded && missing.length > 0 && (
                <div style={{
                  padding: "10px 0 12px",
                  borderBottom: `1px solid ${C.line}10`,
                }}>
                  <div style={{
                    fontSize: 10, color: C.muted, marginBottom: 8, letterSpacing: "0.05em",
                    textTransform: "uppercase", fontWeight: 600,
                  }}>
                    Mangler ({missing.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {missing.map(d => (
                      <span key={d.id} style={{
                        fontSize: 11, padding: "3px 8px", borderRadius: 999,
                        background: C.raised, border: `1px solid ${C.line}`,
                        color: TYPE_COLOR[d.type] ?? C.muted,
                      }}>{d.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {isExpanded && missing.length === 0 && (
                <div style={{
                  padding: "8px 0 10px", fontSize: 12, color: C.brand,
                  borderBottom: `1px solid ${C.line}10`,
                }}>
                  Komplet samling! ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
