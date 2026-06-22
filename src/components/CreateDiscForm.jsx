import { useState } from "react";
import { C, TYPES } from "../constants";
import { genId } from "../utils";

function computeStability(turn, fade) {
  const s = Number(fade) - Number(turn);
  if (s <= -3) return "Very Understable";
  if (s <= -1) return "Understable";
  if (s <= 1) return "Stable";
  if (s <= 3) return "Overstable";
  return "Very Overstable";
}

const empty = () => ({ name: "", brand: "", type: "Distance", speed: 7, glide: 5, turn: 0, fade: 2, pPlastic: "", pWeight: "" });

export function CreateDiscForm({ onSave, onCancel }) {
  const [vals, setVals] = useState(empty());
  const set = k => v => setVals(p => ({ ...p, [k]: v }));
  const inp = {
    padding: "8px 10px", borderRadius: 9, fontFamily: "inherit",
    background: C.surface, border: `1px solid ${C.line}`,
    color: C.text, fontSize: 13, width: "100%", outline: "none",
    boxSizing: "border-box",
  };
  const lbl = { fontSize: 11, color: C.muted, letterSpacing: "0.04em" };
  const valid = vals.name.trim() && vals.brand.trim();

  function save() {
    if (!valid) return;
    onSave({
      id: "custom_" + genId(),
      name: vals.name.trim(),
      brand: vals.brand.trim(),
      type: vals.type,
      speed: Number(vals.speed),
      glide: Number(vals.glide),
      turn: Number(vals.turn),
      fade: Number(vals.fade),
      stability: computeStability(vals.turn, vals.fade),
      pPlastic: vals.pPlastic.trim() || null,
      pWeight: vals.pWeight ? Number(vals.pWeight) : null,
      isCustom: true,
    });
  }

  return (
    <div style={{
      background: C.raised, border: `1px solid ${C.brand}40`,
      borderRadius: 16, padding: 16, marginBottom: 16,
      boxShadow: `0 0 20px ${C.brand}10`,
    }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
        Opret disc
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
          Navn *
          <input value={vals.name} onChange={e => set("name")(e.target.value)}
            placeholder="Captains Caliber" autoFocus style={inp}/>
        </label>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
          Mærke *
          <input value={vals.brand} onChange={e => set("brand")(e.target.value)}
            placeholder="Discraft" style={inp}/>
        </label>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ ...lbl, marginBottom: 6 }}>Type</div>
        <div style={{ display: "flex", gap: 6 }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => set("type")(t)} style={{
              flex: 1, padding: "7px 0", borderRadius: 999, cursor: "pointer",
              fontSize: 12, fontWeight: 500,
              border: `1px solid ${vals.type === t ? C.brand : C.line}`,
              background: vals.type === t ? `${C.brand}15` : "transparent",
              color: vals.type === t ? C.brand : C.muted,
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[["Speed", "speed", 1, 15], ["Glide", "glide", 1, 7], ["Turn", "turn", -5, 1], ["Fade", "fade", 0, 5]].map(([label, key, min, max]) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
            {label}
            <input type="number" inputMode="decimal" value={vals[key]} min={min} max={max} step={0.5}
              onChange={e => set(key)(e.target.value)}
              style={{ ...inp, textAlign: "center" }}/>
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
          Plast (valgfri)
          <input value={vals.pPlastic} onChange={e => set("pPlastic")(e.target.value)}
            placeholder="Star, ESP…" style={inp}/>
        </label>
        <label style={{ flex: "0 0 90px", display: "flex", flexDirection: "column", gap: 4, ...lbl }}>
          Vægt (g)
          <input type="number" inputMode="numeric" value={vals.pWeight}
            onChange={e => set("pWeight")(e.target.value)} placeholder="175" style={inp}/>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={!valid} style={{
          flex: 1, padding: "11px 0", borderRadius: 13, cursor: valid ? "pointer" : "default",
          border: `1px solid ${C.brand}`, background: C.raised,
          color: C.text, fontSize: 13, fontWeight: 600,
          boxShadow: `0 2px 12px ${C.brand}18`,
          opacity: valid ? 1 : 0.45,
        }}>Opret og tilføj til Mine discs</button>
        <button onClick={onCancel} style={{
          padding: "11px 16px", borderRadius: 13, cursor: "pointer",
          border: `1px solid ${C.line}`, background: "transparent",
          color: C.muted, fontSize: 13,
        }}>Annullér</button>
      </div>
    </div>
  );
}
