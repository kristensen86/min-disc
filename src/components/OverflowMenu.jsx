import { X, Tag, BarChart2, Bookmark, Share2, Trophy, LogOut } from "lucide-react";
import { C } from "../constants";

export function OverflowMenu({ ownedCount, wishCount, forSaleCount, onGoSalg, onGoStats, onGoWish, onGoTournament, onShare, onLogout, userEmail, onClose }) {
  const items = [
    {
      icon: Tag, color: forSaleCount > 0 ? C.brand : C.muted,
      label: "Salg",
      desc: forSaleCount > 0 ? `${forSaleCount} disc${forSaleCount !== 1 ? "s" : ""} til salg` : "Ingen discs til salg",
      onClick: onGoSalg,
    },
    {
      icon: BarChart2, color: C.brand,
      label: "Statistik",
      desc: `${ownedCount} discs i din samling`,
      onClick: onGoStats,
    },
    {
      icon: Bookmark, color: wishCount > 0 ? C.distance : C.muted,
      label: "Ønskeliste",
      desc: wishCount > 0 ? `${wishCount} discs på listen` : "Tom ønskeliste",
      onClick: onGoWish,
    },
    {
      icon: Trophy, color: C.brand,
      label: "Favorit disc",
      desc: "Find din favorit i en turnering",
      onClick: onGoTournament,
    },
    {
      icon: Share2, color: C.muted,
      label: "Del app",
      desc: "Invitér en ven til BagUp",
      onClick: onShare,
    },
    ...(onLogout ? [{
      icon: LogOut, color: C.muted,
      label: "Log ud",
      desc: userEmail || "Log ud af BagUp",
      onClick: onLogout,
    }] : []),
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.6)" }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          maxWidth: 560, margin: "0 auto",
          background: C.surface,
          borderRadius: "20px 20px 0 0",
          borderTop: `1px solid ${C.line}`,
          padding: "20px 16px calc(84px + env(safe-area-inset-bottom))",
        }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Mere</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(({ icon: Icon, color, label, desc, onClick }) => (
            <button
              key={label}
              onClick={() => { onClick(); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 14, width: "100%",
                padding: "14px 12px", borderRadius: 14, cursor: "pointer",
                background: "transparent", border: `1px solid ${C.line}`, textAlign: "left",
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: `${color}15`, border: `1px solid ${color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={18} color={color}/>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 1 }}>{label}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
