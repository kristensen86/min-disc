import { useState } from "react";
import { C } from "../constants";

export function SaleHistory({ history, onClear }) {
  const [expanded, setExpanded] = useState(false);
  if (!history || history.length === 0) return null;

  const totalRevenue = history.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 20, marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Salgshistorik</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {onClear && (
            <button onClick={() => { if (window.confirm("Ryd hele salgshistorikken?")) onClear(); }}
              style={{ fontSize: 11, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.02em" }}>
              Ryd
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)}
            style={{ fontSize: 12, color: C.brand, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
            {expanded ? "Skjul" : `Vis (${history.length})`}
          </button>
        </div>
      </div>

      <div style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13,
        padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: expanded ? 10 : 0,
      }}>
        <span style={{ fontSize: 12, color: C.muted }}>{history.length} solgt disc{history.length !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.brand }}>{totalRevenue}kr</span>
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...history].reverse().map((item, i) => (
            <div key={i} style={{
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {item.brand} · {item.type} · {item.condition}/10
                  </div>
                  {item.buyer && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Køber: {item.buyer}</div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: C.brand, fontSize: 15 }}>{item.price}kr</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
