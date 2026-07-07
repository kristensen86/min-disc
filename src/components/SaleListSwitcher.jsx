import { useState } from "react";
import { ChevronDown, Plus, Archive, RotateCcw } from "lucide-react";
import { C } from "../constants";
import { btn } from "./ui";

function StatusDot({ status }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
      background: status === "active" ? C.brand : C.muted,
    }}/>
  );
}

function Dialog({ onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 320,
      background: "rgba(5,10,5,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: C.raised, border: `1px solid ${C.line}`,
        borderRadius: 20, padding: 24, maxWidth: 340, width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function SaleListSwitcher({ saleLists, activeSaleListId, onSwitch, onCreate, onArchive, onReactivate }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [reducePrices, setReducePrices] = useState(false);

  const activeList = saleLists.find(l => l.id === activeSaleListId) || null;
  const sorted = [...saleLists].sort((a, b) => (a.status === b.status ? 0 : a.status === "active" ? -1 : 1));

  function submitCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName("");
    setCreating(false);
  }

  function submitReactivate() {
    onReactivate(activeList.id, reducePrices);
    setReducePrices(false);
    setReactivating(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <button onClick={() => setOpen(o => !o)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "11px 14px", borderRadius: 13, cursor: "pointer",
            border: `1px solid ${C.line}`, background: C.surface, color: C.text,
            fontSize: 13.5, fontWeight: 600,
          }}>
            <StatusDot status={activeList?.status || "active"}/>
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeList?.name || "Vælg liste"}
            </span>
            <ChevronDown size={16} color={C.muted}/>
          </button>

          {open && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 310 }} onClick={() => setOpen(false)}/>
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 311,
                background: C.raised, border: `1px solid ${C.line}`, borderRadius: 14,
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)", overflow: "hidden",
                maxHeight: 280, overflowY: "auto",
              }}>
                {sorted.map(l => (
                  <button key={l.id} onClick={() => { onSwitch(l.id); setOpen(false); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "11px 14px", cursor: "pointer", textAlign: "left",
                    border: "none", borderBottom: `1px solid ${C.line}`,
                    background: l.id === activeSaleListId ? `${C.brand}12` : "transparent",
                    color: l.id === activeSaleListId ? C.brand : C.text,
                    fontSize: 13.5, fontWeight: 600,
                  }}>
                    <StatusDot status={l.status}/>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{l.items.length}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={() => setCreating(true)} style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
          padding: "11px 14px", borderRadius: 13, cursor: "pointer",
          border: `1px solid ${C.brand}`, background: `${C.brand}12`,
          color: C.brand, fontSize: 13.5, fontWeight: 600,
        }}>
          <Plus size={15}/> Ny liste
        </button>
      </div>

      {activeList?.status === "archived" && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "11px 14px", borderRadius: 13,
          background: `${C.muted}10`, border: `1px solid ${C.line}`,
        }}>
          <span style={{ fontSize: 12.5, color: C.muted }}>Denne liste er arkiveret.</span>
          <button onClick={() => setReactivating(true)} style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${C.brand}`, background: "transparent",
            color: C.brand, fontSize: 12.5, fontWeight: 600,
          }}>
            <RotateCcw size={13}/> Genaktivér
          </button>
        </div>
      )}

      {activeList?.status === "active" && (
        <button onClick={() => setArchiving(true)} style={{
          alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 10, cursor: "pointer",
          border: "none", background: "transparent",
          color: C.muted, fontSize: 12, fontWeight: 600,
        }}>
          <Archive size={13}/> Arkivér liste
        </button>
      )}

      {creating && (
        <Dialog onClose={() => setCreating(false)}>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 12 }}>Ny salgsliste</div>
          <input
            autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submitCreate(); }}
            placeholder="Navn på liste"
            style={{
              width: "100%", padding: "11px 13px", borderRadius: 12, fontSize: 14,
              background: C.surface, border: `1px solid ${C.line}`, color: C.text,
              outline: "none", boxSizing: "border-box", marginBottom: 20,
            }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setCreating(false)} style={{ flex: 1, ...btn() }}>Annullér</button>
            <button onClick={submitCreate} disabled={!newName.trim()} style={{ flex: 1, ...btn("primary"), opacity: newName.trim() ? 1 : 0.45 }}>Opret</button>
          </div>
        </Dialog>
      )}

      {archiving && (
        <Dialog onClose={() => setArchiving(false)}>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 8 }}>Arkivér liste?</div>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>
            Arkivér denne salgsliste? Den kan genaktiveres senere.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setArchiving(false)} style={{ flex: 1, ...btn() }}>Annullér</button>
            <button onClick={() => { onArchive(activeList.id); setArchiving(false); }} style={{
              flex: 1, padding: "12px 0", borderRadius: 13, cursor: "pointer",
              border: `1px solid ${C.midrange}`, background: `${C.midrange}15`,
              color: C.midrange, fontSize: 14, fontWeight: 600,
            }}>Arkivér</button>
          </div>
        </Dialog>
      )}

      {reactivating && (
        <Dialog onClose={() => setReactivating(false)}>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 8 }}>Genaktivér liste?</div>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
            Listen bliver aktiv igen og vises i salgsfanen.
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, cursor: "pointer" }}>
            <input type="checkbox" checked={reducePrices} onChange={e => setReducePrices(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: C.brand, cursor: "pointer" }}/>
            <span style={{ fontSize: 13.5, color: C.text }}>Reducér alle BIN-priser med 10%</span>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setReactivating(false)} style={{ flex: 1, ...btn() }}>Annullér</button>
            <button onClick={submitReactivate} style={{ flex: 1, ...btn("primary") }}>Genaktivér</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
