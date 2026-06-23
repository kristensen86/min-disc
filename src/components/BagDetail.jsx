import { useState } from "react";
import { Search, Plus, Check, Trash2, X, Pencil } from "lucide-react";
import { C, TYPES, TYPE_COLOR } from "../constants";
import { resolveDisc, conditionText } from "../utils";
import { btn, iconBtn, secHdr, Empty } from "./ui";
import { DiscCard } from "./DiscCard";
import { FlightMatrix } from "./FlightMatrix";

const TYPE_FILTERS = ["Alle", ...TYPES];

export function BagDetail({ bag, ownedDiscs, overrides, onBack, onRename, onDelete, onAddDisc, onRemoveDisc, onEditDisc }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Alle");
  const [removingUid, setRemovingUid] = useState(null);
  const [bagInternalTab, setBagInternalTab] = useState("discs"); // "discs" | "flight"
  const [flightSelected, setFlightSelected] = useState(null);

  if (!bag) return <Empty text="Bag ikke fundet."/>;

  const bagEntries = bag.bagEntries || [];
  const inBagUids = new Set(bagEntries.map(e => e.instanceId).filter(Boolean));

  const entryDiscs = bagEntries.map(entry => {
    const ownedInst = ownedDiscs.find(od => od.uid === entry.instanceId);
    if (!ownedInst) return null;
    return { disc: resolveDisc(ownedInst, overrides || {}), entryId: entry.entryId };
  }).filter(Boolean);

  const q = query.trim().toLowerCase();
  const resolvedOwned = ownedDiscs.map(d => resolveDisc(d, overrides || {}));

  const filtered = resolvedOwned.filter(d => {
    const matchesType = typeFilter === "Alle" || d.type === typeFilter;
    const matchesQuery = !q || (d.name + " " + d.brand + " " + (d.pPlastic || "") + " " + (d.pNote || "")).toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });

  const sorted = [
    ...filtered.filter(d => inBagUids.has(d.uid)),
    ...filtered.filter(d => !inBagUids.has(d.uid)),
  ];

  function handleRemoveFromBag(uid, entryId) {
    setRemovingUid(uid);
    setTimeout(() => {
      onRemoveDisc(entryId);
      setRemovingUid(null);
    }, 500);
  }

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

      {/* [Discs] [Flight] tab switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["discs", "Discs"], ["flight", "Flight"]].map(([key, label]) => (
          <button key={key} onClick={() => setBagInternalTab(key)} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: `1px solid ${bagInternalTab === key ? C.brand : C.line}`,
            background: bagInternalTab === key ? `${C.brand}18` : "transparent",
            color: bagInternalTab === key ? C.brand : C.muted,
          }}>{label}</button>
        ))}
      </div>

      {/* Flight tab */}
      {bagInternalTab === "flight" && (
        <div style={{ margin: "0 -16px" }}>
          <FlightMatrix
            discs={entryDiscs.map(e => e.disc)}
            selectedId={flightSelected}
            onSelect={setFlightSelected}
          />
        </div>
      )}

      {/* Discs tab */}
      {bagInternalTab === "discs" && (
        <>
          {/* Search row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", marginBottom: 10,
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12 }}>
            <Search size={16} color={C.muted}/>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Søg i mine discs…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none",
                color: C.text, padding: "10px 0", fontSize: 14 }}/>
            {query && <button onClick={() => setQuery("")} aria-label="Ryd" style={iconBtn(C.muted)}><X size={14}/></button>}
          </div>

          {/* Type filter chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "nowrap", overflowX: "auto" }}>
            {TYPE_FILTERS.map(t => {
              const active = typeFilter === t;
              const color = t === "Alle" ? C.brand : TYPE_COLOR[t];
              return (
                <button key={t} onClick={() => setTypeFilter(t)} style={{
                  padding: "6px 13px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  whiteSpace: "nowrap", flexShrink: 0,
                  border: `1px solid ${active ? color : C.line}`,
                  background: active ? `${color}22` : "transparent",
                  color: active ? color : C.muted,
                }}>{t}</button>
              );
            })}
          </div>

          {/* Full disc list */}
          {sorted.length === 0 ? (
            <Empty text={q || typeFilter !== "Alle" ? "Ingen discs matcher filteret." : "Din samling er tom."}/>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {sorted.map(d => {
                const inBag = inBagUids.has(d.uid);
                const glowColor = d.pColor || TYPE_COLOR[d.type];
                const hasExtras = d.pColor || d.pWeight || d.pPlastic || d.condition;
                return (
                  <div key={d.uid} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 10,
                    background: inBag ? `${C.brand}0a` : C.raised,
                    border: `1px solid ${inBag ? C.brand + "40" : C.line}`,
                  }}>
                    <div style={{
                      width: 40, height: 40, flexShrink: 0, borderRadius: "50%",
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

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.name} <span style={{ color: C.muted, fontWeight: 400 }}>· {d.brand}</span>
                      </div>
                      {hasExtras && (
                        <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
                          {d.pColor && (
                            <span style={{ width: 8, height: 8, borderRadius: "50%",
                              background: d.pColor, boxShadow: `0 0 4px ${d.pColor}80`,
                              flexShrink: 0, display: "inline-block" }}/>
                          )}
                          {d.pWeight && <span style={{ fontSize: 10, color: C.muted }}>{d.pWeight}g</span>}
                          {d.pPlastic && <span style={{ fontSize: 10, color: C.muted }}>{d.pPlastic}</span>}
                          {d.condition && <span style={{ fontSize: 10, color: C.muted }}>{conditionText(d.condition)}</span>}
                        </div>
                      )}
                    </div>

                    {inBag ? (
                      <button onClick={() => {
                        const entry = bagEntries.find(e => e.instanceId === d.uid);
                        if (entry && removingUid !== d.uid) handleRemoveFromBag(d.uid, entry.entryId);
                      }} aria-label={`Fjern ${d.name} fra bag`} style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: removingUid === d.uid ? `${C.distance}20` : `${C.brand}20`,
                        border: `1px solid ${removingUid === d.uid ? C.distance + "60" : C.brand + "60"}`,
                        transition: "background 0.2s, border-color 0.2s",
                      }}>
                        {removingUid === d.uid
                          ? <X size={15} color={C.distance}/>
                          : <Check size={15} color={C.brand}/>}
                      </button>
                    ) : (
                      <button onClick={() => onAddDisc(d.uid)} aria-label={`Tilføj ${d.name}`} style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${C.brand}15`, border: `1px solid ${C.brand}50`,
                      }}>
                        <Plus size={15} color={C.brand}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Current bag contents */}
          {entryDiscs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: C.muted, marginBottom: 12 }}>I bagen ({entryDiscs.length})</div>
              {TYPES.filter(t => entryDiscs.some(e => e.disc.type === t)).map(t => (
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
