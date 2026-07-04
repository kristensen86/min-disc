import { useState } from "react";
import { C, TYPE_COLOR } from "../constants";
import { FlightBadge, StabilityPill } from "./FlightBadge";
import { iconBtn } from "./ui";
import { FlightChart } from "./FlightChart";
import { FlightEditor } from "./FlightEditor";

export function DiscCard({ disc, actions = [], isEditing = false, onToggleEdit = null, override = null, onSave = null, onClear = null, allDiscs = [], onChangeMold = null, onEditNav = null }) {
  const hasOverride = !!override;
  const [showBane, setShowBane] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [moldChangeMsg, setMoldChangeMsg] = useState(null);
  const open = isEditing || showBane;
  const glowColor = disc.pColor || TYPE_COLOR[disc.type];
  const cardTappable = !onToggleEdit && !!onEditNav;

  function handleChangeMold(newDisc) {
    onChangeMold(newDisc.id);
    setMoldChangeMsg(`Disc skiftet til ${newDisc.name}`);
    setTimeout(() => setMoldChangeMsg(null), 3500);
  }

  return (
    <div>
      <div
        className={cardTappable ? "tap-editable" : undefined}
        role={cardTappable ? "button" : undefined}
        tabIndex={cardTappable ? 0 : undefined}
        onClick={cardTappable ? () => onEditNav(disc.uid) : undefined}
        onKeyDown={cardTappable ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEditNav(disc.uid); } } : undefined}
        aria-label={cardTappable ? `Rediger ${disc.name}` : undefined}
        style={{
          padding: "14px 14px 12px",
          background: `linear-gradient(145deg, ${C.surface} 0%, ${C.raised}90 100%)`,
          border: `1px solid ${isEditing ? C.brand : showBane ? C.brand + "60" : C.line}`,
          boxShadow: showBane || isEditing
            ? `0 0 20px ${C.brand}18`
            : `0 0 14px ${glowColor}08`,
          borderRadius: open ? "16px 16px 0 0" : 16,
        }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

          {/* Photo anchor */}
          <button
            onClick={e => { e.stopPropagation(); setShowBane(v => !v); }}
            aria-label="Vis flyvekurve"
            style={{
              width: 64, height: 64, flexShrink: 0, padding: 0,
              borderRadius: "50%", cursor: "pointer",
              border: `1.5px solid ${showBane ? glowColor : glowColor + "50"}`,
              background: disc.pPhoto ? C.raised : `${glowColor}18`,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 12px ${glowColor}28`,
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          >
            {disc.pPhoto ? (
              <img src={disc.pPhoto} alt={disc.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: glowColor, lineHeight: 1 }}>
                {disc.type[0]}
              </span>
            )}
          </button>

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Row 1: Name + action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              <span style={{
                flex: 1, minWidth: 0,
                fontWeight: 700, fontSize: 16, color: C.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}>
                {disc.name}
              </span>
              {hasOverride && (
                <span style={{ fontSize: 9, color: C.brand, fontWeight: 700, flexShrink: 0, opacity: 0.8 }}>●</span>
              )}
              {onToggleEdit && (
                <button onClick={e => { e.stopPropagation(); onToggleEdit(); }} aria-label="Rediger"
                  style={{ ...iconBtn(isEditing ? C.brand : C.muted), flexShrink: 0 }}>✎</button>
              )}
              {actions.map((a, i) => (
                <div key={i} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); a.needsConfirm ? setConfirmAction(a) : a.onClick(); }}
                    aria-label={a.label}
                    style={iconBtn(a.color || C.muted)}
                  >
                    <a.icon size={15} {...(a.iconProps || {})}/>
                  </button>
                  {a.badge != null && (
                    <span style={{
                      position: "absolute", top: -5, right: -5,
                      background: C.brand, color: C.bg,
                      fontSize: 9, fontWeight: 700,
                      padding: "2px 5px", borderRadius: 999, lineHeight: 1.4,
                      pointerEvents: "none",
                    }}>{a.badge}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Row 2: Brand · Type · color dot · stability */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: C.muted, letterSpacing: "0.01em" }}>
                {disc.brand} · {disc.type}
              </span>
              {disc.pColor && (
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: disc.pColor, boxShadow: `0 0 5px ${disc.pColor}80`,
                  display: "inline-block",
                }}/>
              )}
              <StabilityPill stability={disc.stability}/>
              {disc.isCustom && (
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 999,
                  background: `${C.brand}12`, border: `1px solid ${C.brand}35`,
                  color: C.brand, fontWeight: 600, letterSpacing: "0.03em", flexShrink: 0,
                }}>Egen</span>
              )}
            </div>

            {/* Row 3: Weight + Plastic + Note chips */}
            {(disc.pWeight || disc.pPlastic || disc.pNote) && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                {disc.pWeight && (
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 999,
                    background: C.raised, border: `1px solid ${C.line}`,
                    color: C.muted, letterSpacing: "0.02em",
                  }}>{disc.pWeight}g</span>
                )}
                {disc.pPlastic && (
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 999,
                    background: C.raised, border: `1px solid ${C.line}`,
                    color: C.muted, letterSpacing: "0.02em",
                  }}>{disc.pPlastic}</span>
                )}
                {disc.pNote && (
                  <span style={{
                    fontSize: 11, color: C.muted, fontStyle: "italic",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}>{disc.pNote}</span>
                )}
              </div>
            )}

            {/* Row 4: Flight badges */}
            <FlightBadge disc={disc}/>
          </div>
        </div>
      </div>

      {showBane && !isEditing && (
        <div style={{
          borderLeft: `1px solid ${C.brand}50`,
          borderRight: `1px solid ${C.brand}50`,
          borderBottom: `1px solid ${C.brand}50`,
          borderRadius: "0 0 16px 16px",
          background: C.bg, padding: "6px 10px 10px",
        }}>
          <FlightChart discs={[disc]} hand="R" height={160} showLabels={true}/>
          <div style={{
            display: "flex", justifyContent: "center", gap: 18, marginTop: 6,
            fontSize: 11, color: C.muted, letterSpacing: "0.04em",
          }}>
            <span>S {disc.speed}</span>
            <span>G {disc.glide}</span>
            <span>T {disc.turn}</span>
            <span>F {disc.fade}</span>
          </div>
        </div>
      )}

      {moldChangeMsg && (
        <div style={{
          marginTop: 8, padding: "9px 12px", borderRadius: 12,
          background: `${C.brand}12`, border: `1px solid ${C.brand}40`,
          color: C.brand, fontSize: 12.5, fontWeight: 600,
        }}>{moldChangeMsg}</div>
      )}

      {isEditing && (
        <FlightEditor key={disc.id} disc={disc} override={override}
          onSave={onSave} onClear={onClear} onClose={onToggleEdit}
          allDiscs={allDiscs} onChangeMold={onChangeMold ? handleChangeMold : null}/>
      )}

      {confirmAction && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(5,10,5,0.88)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }} onClick={() => setConfirmAction(null)}>
          <div style={{
            background: C.raised, border: `1px solid ${C.line}`,
            borderRadius: 20, padding: 24, maxWidth: 320, width: "100%",
            boxShadow: `0 8px 40px rgba(0,0,0,0.6)`,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 8 }}>
              Fjern disc?
            </div>
            <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>
              Er du sikker på du vil fjerne{" "}
              <strong style={{ color: C.text }}>{disc.name}</strong>{" "}
              fra din samling?
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmAction(null)} style={{
                flex: 1, padding: "12px 0", borderRadius: 13, cursor: "pointer",
                border: `1px solid ${C.line}`, background: "transparent",
                color: C.muted, fontSize: 14, fontWeight: 600,
              }}>Annullér</button>
              <button onClick={() => { confirmAction.onClick(); setConfirmAction(null); }} style={{
                flex: 1, padding: "12px 0", borderRadius: 13, cursor: "pointer",
                border: `1px solid ${C.distance}`, background: `${C.distance}15`,
                color: C.distance, fontSize: 14, fontWeight: 600,
              }}>Fjern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
