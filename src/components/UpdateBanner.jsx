import { RefreshCw } from "lucide-react";
import { C } from "../constants";

export function UpdateBanner({ onReload }) {
  return (
    <div style={{
      position: "fixed", left: 0, right: 0,
      bottom: "calc(64px + env(safe-area-inset-bottom))",
      zIndex: 101, display: "flex", justifyContent: "center", padding: "0 16px",
    }}>
      <div style={{
        maxWidth: 560, width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px", background: C.raised, border: `1px solid ${C.brand}45`,
        borderRadius: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}>
        <RefreshCw size={16} color={C.brand} style={{ flexShrink: 0 }}/>
        <span style={{ flex: 1, fontSize: 13, color: C.text }}>Ny version klar</span>
        <button onClick={onReload} style={{
          flexShrink: 0, background: C.brand, border: "none", borderRadius: 999,
          padding: "7px 14px", fontSize: 13, fontWeight: 600, color: C.bg, cursor: "pointer",
        }}>
          Genindlæs
        </button>
      </div>
    </div>
  );
}
