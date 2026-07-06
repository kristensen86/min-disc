import { useEffect, useRef, useState } from "react";
import { C } from "../constants";
import { PLASTICS_BY_BRAND, ALL_PLASTICS } from "../data/plastics";

const defaultInpStyle = {
  padding: "7px 9px", borderRadius: 9, background: C.surface, border: `1px solid ${C.line}`,
  color: C.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box",
};

// Free-text plastic field with autocomplete. Suggestions are strictly scoped to the
// disc's own brand when known (never mixed with other brands' plastics) — only
// unknown/custom brands fall back to the flat cross-brand list. Whatever the user
// types is the value, whether or not it matches a suggestion.
export function PlasticCombobox({ value, onChange, brand, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef(null);

  const pool = PLASTICS_BY_BRAND[brand] || ALL_PLASTICS;
  const q = (value || "").trim().toLowerCase();
  const suggestions = (q ? pool.filter(p => p.toLowerCase().includes(q)) : pool).slice(0, 8);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function choose(p) {
    onChange(p);
    setOpen(false);
    setHighlight(-1);
  }

  function onKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(suggestions.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
    else if (e.key === "Enter" && highlight >= 0) { e.preventDefault(); choose(suggestions[highlight]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={style || defaultInpStyle}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: C.raised, border: `1px solid ${C.line}`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)", overflow: "hidden",
          maxHeight: 180, overflowY: "auto",
        }}>
          {suggestions.map((p, i) => (
            <div key={p}
              onMouseDown={e => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: "8px 10px", fontSize: 13, cursor: "pointer",
                background: highlight === i ? `${C.brand}18` : "transparent",
                color: highlight === i ? C.brand : C.text,
              }}
            >{p}</div>
          ))}
        </div>
      )}
    </div>
  );
}
