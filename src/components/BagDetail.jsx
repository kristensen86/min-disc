import { useState } from "react";
import { Search, Plus, Trash2, X, Pencil } from "lucide-react";
import { C, TYPES, TYPE_COLOR } from "../constants";
import { resolveDisc, conditionText } from "../utils";
import { btn, iconBtn, secHdr, Empty } from "./ui";
import { DiscCard } from "./DiscCard";

export function BagDetail({ bag, ownedDiscs, allDiscs, overrides, onBack, onRename, onDelete, onAddDisc, onRemoveDisc, onEditDisc }) {
  const [query, setQuery] = useState("");
  if (!bag) return <Empty text="Bag ikke fundet."/>;

  const bagEntries = bag.bagEntries || [];

  const entryDiscs = bagEntries.map(entry => {
    const ownedInst = ownedDiscs.find(od => od.uid === entry.instanceId);
    if (!ownedInst) return null;
    return { disc: resolveDisc(ownedInst, overrides || {}), entryId: entry.entryId };
  }).filter(Boolean);

  const q = query.trim().toLowerCase();
  const resolvedOwned = ownedDiscs.map(d => resolveDisc(d, overrides || {}));
  const searchResults = q
    ? resolvedOwned.filter(d =>
        (d.name + " " + d.brand + " " + (d.pPlastic || "") + " " + (d.pNote || "")).toLowerCase().includes(q)
      ).slice(0, 8)
    : [];

  return (
    <div>
      <button onClick={onBack} style={btn("ghost")}>‹ Alle bags</button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 16px" }}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: C.text }}>{bag.name}</h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onRename} style={btn("ghost")}>Omdøb</button>
          <button onClick={onDelete} style={{ ...btn("ghost"), color: C.distance }}>Slet</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, marginBottom: 10 }}>
        <Search size={16} color={C.muted}/>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Søg i mine discs for at tilføje…"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none",
            color: C.text, padding: "10px 0", fontSize: 14 }}/>
        {query && <button onClick={() => setQuery("")} aria-label="Ryd" style={iconBtn(C.muted)}><X size={14}/></button>}
      </div>
      {searchResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {searchResults.map(d => {
            const glowColor = d.pColor || TYPE_COLOR[d.type];
            const hasExtras = d.pColor || d.pWeight || d.pPlastic || d.condition;
            return (
              <button key={d.uid} onClick={() => { onAddDisc(d.uid); setQuery(""); }} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                background: C.raised, border: `1px solid ${C.line}`, color: C.text }}>
                {/* Photo / letter badge */}
                <div style={{
                  width: 32, height: 32, flexShrink: 0, borderRadius: "50%",
                  border: `1.5px solid ${glowColor}50`,
                  background: d.pPhoto ? C.raised : `${glowColor}18`,
                  overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {d.pPhoto
                    ? <img src={d.pPhoto} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    : <span style={{ fontSize: 13, fontWeight: 800, color: glowColor }}>{d.type[0]}</span>
                  }
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.name} <span style={{ color: C.muted, fontWeight: 400 }}>· {d.brand}</span>
                  </div>
                  {hasExtras && (
                    <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
                      {d.pColor && (
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: d.pColor, boxShadow: `0 0 4px ${d.pColor}80`,
                          flexShrink: 0, display: "inline-block",
                        }}/>
                      )}
                      {d.pWeight && (
                        <span style={{ fontSize: 10, color: C.muted }}>{d.pWeight}g</span>
                      )}
                      {d.pPlastic && (
                        <span style={{ fontSize: 10, color: C.muted }}>{d.pPlastic}</span>
                      )}
                      {d.condition && (
                        <span style={{ fontSize: 10, color: C.muted }}>{conditionText(d.condition)}</span>
                      )}
                    </div>
                  )}
                </div>
                <Plus size={15} color={C.brand} style={{ flexShrink: 0 }}/>
              </button>
            );
          })}
        </div>
      )}
      {entryDiscs.length === 0 ? (
        <Empty text="Denne bag er tom. Søg ovenfor for at tilføje discs fra din samling."/>
      ) : (
        TYPES.filter(t => entryDiscs.some(e => e.disc.type === t)).map(t => (
          <section key={t} style={{ marginBottom: 18 }}>
            <h3 style={secHdr(t)}>{t}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entryDiscs.filter(e => e.disc.type === t).map(e => (
                <DiscCard key={e.entryId} disc={e.disc}
                  actions={[
                    ...(onEditDisc ? [{ icon: Pencil, label: "Rediger disc", onClick: () => onEditDisc(e.disc.uid), color: C.muted }] : []),
                    { icon: Trash2, label: "Fjern fra bag", onClick: () => onRemoveDisc(e.entryId), color: C.distance },
                  ]}/>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
