import { useState } from "react";
import { C, DISC_COLORS } from "../constants";
import { conditionText, suggestSalePrices } from "../utils";
import { miniBtn } from "./ui";
import { ImageCropper } from "./ImageCropper";

export function FlightEditor({ disc, override, onSave, onClear, onClose }) {
  const cur = { ...disc, ...(override || {}) };
  const [vals, setVals] = useState({
    speed: cur.speed, glide: cur.glide, turn: cur.turn, fade: cur.fade,
    pColor: cur.pColor || null, pWeight: cur.pWeight || "", pPlastic: cur.pPlastic || "",
    pNote: cur.pNote || "", pPhoto: cur.pPhoto || null,
    forSale: cur.forSale || false,
    condition: cur.condition ?? 8,
    hasInk: cur.hasInk ?? false,
    saleMP: cur.saleMP || "",
    saleBIN: cur.saleBIN || cur.price || "",
    saleNote: cur.saleNote || "",
    saleGroup: cur.saleGroup ?? "",
    salePos: cur.salePos ?? "",
  });
  const set = k => v => setVals(p => ({ ...p, [k]: v }));
  const [cropperSrc, setCropperSrc] = useState(null);

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropperSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  const label = { fontSize: 11, color: C.muted, letterSpacing: "0.04em" };
  const inpStyle = { padding: "7px 9px", borderRadius: 9, background: C.surface, border: `1px solid ${C.line}`, color: C.text, fontSize: 13, width: "100%", outline: "none" };

  return (
    <>
      {cropperSrc && (
        <ImageCropper
          src={cropperSrc}
          onSave={dataUrl => { set("pPhoto")(dataUrl); setCropperSrc(null); }}
          onCancel={() => setCropperSrc(null)}
        />
      )}

      <div style={{
        padding: "14px 16px", background: C.raised,
        border: `1px solid ${C.brand}40`, borderRadius: "0 0 16px 16px", marginTop: -2,
      }}>

        {/* Flight numbers */}
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Flight-tal</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[["Speed", "speed", 1, 15, 1], ["Glide", "glide", 1, 7, 1], ["Turn", "turn", -5, 1, 0.5], ["Fade", "fade", 0, 5, 0.5]].map(([lbl, key, min, max, step]) => (
            <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, ...label }}>
              {lbl}
              <input type="number" inputMode="decimal" value={vals[key]} min={min} max={max} step={step}
                onChange={e => set(key)(Number(e.target.value))}
                style={{ ...inpStyle, textAlign: "center", border: `1px solid ${vals[key] !== disc[key] ? C.brand : C.line}` }}/>
              <span style={{ fontSize: 10, color: C.line, textAlign: "center" }}>std: {disc[key]}</span>
            </label>
          ))}
        </div>

        {/* Personal details */}
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Mine oplysninger</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...label, marginBottom: 6 }}>Foto</div>
            {vals.pPhoto ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={vals.pPhoto} alt="disc" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `1px solid ${C.line}` }}/>
                <button onClick={() => set("pPhoto")(null)} style={miniBtn(C.distance)}>Fjern</button>
              </div>
            ) : (
              <label style={{ cursor: "pointer" }}>
                <div style={{ ...miniBtn(C.muted), display: "inline-flex", alignItems: "center", gap: 6 }}>📷 Upload foto</div>
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoSelect}/>
              </label>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...label, marginBottom: 6 }}>Farve</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {DISC_COLORS.map(c => (
                <button key={c} onClick={() => set("pColor")(c)} style={{
                  width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", padding: 0, flexShrink: 0,
                  border: vals.pColor === c ? `2.5px solid ${C.text}` : `1px solid ${C.line}`,
                }}/>
              ))}
              {vals.pColor && (
                <button onClick={() => set("pColor")(null)} style={{
                  width: 26, height: 26, borderRadius: "50%", background: "transparent",
                  cursor: "pointer", border: `1px dashed ${C.line}`, fontSize: 14, color: C.muted, padding: 0,
                }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3, ...label, flex: "0 0 80px" }}>
              Vægt (g)
              <input type="number" inputMode="numeric" value={vals.pWeight} min={100} max={200}
                onChange={e => set("pWeight")(e.target.value)} placeholder="175"
                style={inpStyle}/>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3, ...label, flex: 1 }}>
              Plast
              <input type="text" value={vals.pPlastic} onChange={e => set("pPlastic")(e.target.value)}
                placeholder="Star, Z Line…" style={inpStyle}/>
            </label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 3, ...label }}>
            Note
            <input type="text" value={vals.pNote} onChange={e => set("pNote")(e.target.value)}
              placeholder="Beat in, skovbag, gave fra…" style={inpStyle}/>
          </label>
        </div>

        {/* Sale section */}
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: vals.forSale ? 16 : 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Til salg</div>
            <button onClick={() => set("forSale")(!vals.forSale)} style={{
              padding: "6px 15px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `1px solid ${vals.forSale ? C.brand : C.line}`,
              background: vals.forSale ? `${C.brand}18` : "transparent",
              color: vals.forSale ? C.brand : C.muted,
              letterSpacing: "0.02em",
            }}>
              {vals.forSale ? "Til salg ✓" : "Ikke til salg"}
            </button>
          </div>

          {vals.forSale && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: C.muted }}>Tilstand</span>
                  <span style={{ color: C.brand, fontWeight: 600 }}>{vals.condition}/10 — {conditionText(vals.condition)}</span>
                </div>
                <input
                  type="range" min={0} max={10} step={1} value={vals.condition}
                  onChange={e => set("condition")(Number(e.target.value))}
                  style={{ width: "100%", accentColor: C.brand, cursor: "pointer", display: "block" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
                  <span>Ødelagt</span><span>Ny disc</span>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ ...label, marginBottom: 6 }}>Ink</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[[false, "Uden ink"], [true, "Med ink"]].map(([val, lbl]) => (
                    <button key={String(val)} onClick={() => set("hasInk")(val)} style={{
                      padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500,
                      border: `1px solid ${vals.hasInk === val ? C.brand : C.line}`,
                      background: vals.hasInk === val ? `${C.brand}15` : "transparent",
                      color: vals.hasInk === val ? C.brand : C.muted,
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Sale number */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 3, ...label, flex: "0 0 70px" }}>
                  Gruppe (X)
                  <input type="number" inputMode="numeric" value={vals.saleGroup} min={1}
                    onChange={e => set("saleGroup")(e.target.value)} placeholder="1"
                    style={inpStyle}/>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 3, ...label, flex: "0 0 70px" }}>
                  Position (Y)
                  <input type="number" inputMode="numeric" value={vals.salePos} min={1}
                    onChange={e => set("salePos")(e.target.value)} placeholder="1"
                    style={inpStyle}/>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, ...label, flex: 1 }}>
                  Nummer
                  <div style={{
                    padding: "7px 9px", borderRadius: 9, background: C.surface, border: `1px solid ${C.line}`,
                    fontSize: 16, fontWeight: 700, color: vals.saleGroup && vals.salePos ? C.brand : C.muted,
                    letterSpacing: "0.02em",
                  }}>
                    {vals.saleGroup && vals.salePos ? `${vals.saleGroup}.${vals.salePos}` : "—"}
                  </div>
                </div>
              </div>

              {/* Prices */}
              {(() => {
                const suggested = suggestSalePrices({ type: cur.type, condition: vals.condition });
                const mpError = vals.saleMP && !vals.saleBIN;
                return (
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...label, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>BIN (kr) *</span>
                        {!vals.saleBIN && (
                          <button type="button" onClick={() => { set("saleBIN")(suggested.bin); set("saleMP")(suggested.mp); }}
                            style={{ fontSize: 10, color: C.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            Foreslået: {suggested.bin}kr
                          </button>
                        )}
                      </div>
                      <input type="number" inputMode="numeric" value={vals.saleBIN} min={0}
                        onChange={e => set("saleBIN")(e.target.value)} placeholder={String(suggested.bin)}
                        style={{ ...inpStyle, border: `1px solid ${mpError ? C.distance : C.line}` }}/>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...label, flex: 1 }}>
                      <span>MP / Mindstepris (kr)</span>
                      <input type="number" inputMode="numeric" value={vals.saleMP} min={0}
                        onChange={e => set("saleMP")(e.target.value)} placeholder={vals.saleBIN ? String(Math.round(Number(vals.saleBIN) * 0.75)) : String(suggested.mp)}
                        style={inpStyle} disabled={!vals.saleBIN}/>
                    </div>
                  </div>
                );
              })()}
              {vals.saleMP && !vals.saleBIN && (
                <div style={{ fontSize: 11, color: C.distance, marginBottom: 10 }}>MP kræver at BIN også er udfyldt</div>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: 3, ...label }}>
                Note (fx "first run")
                <input type="text" value={vals.saleNote} onChange={e => set("saleNote")(e.target.value)}
                  placeholder="first run, mystery boks…" style={inpStyle}/>
              </label>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={() => onSave(vals)} style={miniBtn(C.brand)}>Gem</button>
          {override && <button onClick={onClear} style={miniBtn(C.distance)}>Nulstil</button>}
          <button onClick={onClose} style={miniBtn(C.muted)}>Luk</button>
        </div>
      </div>
    </>
  );
}
