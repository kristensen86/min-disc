import { useState, useEffect, useMemo } from "react";
import { Search, Plus, X, Trash2, AlertCircle, Loader, Heart, LogOut, Disc3, Tag } from "lucide-react";
import { supabase, setUser } from "./supabase";
import { C, TYPE_COLOR, TYPES, FALLBACK } from "./constants";
import { encodeBag, decodeBag, genId, resolveDisc } from "./utils";
import { store } from "./store";
import { iconBtn, btn, secHdr, Empty } from "./components/ui";
import { DiscCard } from "./components/DiscCard";
import { FlightMatrix } from "./components/FlightMatrix";
import { GeneratorPanel } from "./components/GeneratorPanel";
import { BagDetail } from "./components/BagDetail";
import { SharedBagView } from "./components/SharedBagView";
import { LoginScreen } from "./components/LoginScreen";
import { StatsPanel } from "./components/StatsPanel";
import { SalePanel } from "./components/SalePanel";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allDiscs, setAllDiscs] = useState([]);
  const [discsLoading, setDiscsLoading] = useState(true);
  const [usingFallback, setFallback] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [owned, setOwned] = useState([]);
  const [bags, setBags] = useState([]);
  const [tab, setTab] = useState("owned");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Alle");
  const [brandFilter, setBrandFilter] = useState("Alle");
  const [visibleCount, setVisible] = useState(40);
  const [openBagId, setOpenBagId] = useState(null);
  const [showNewChoice, setShowNewChoice] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [flightSourceKey, setFlightSourceKey] = useState("owned");
  const [flightSelected, setFlightSelected] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [editingDiscUid, setEditingDiscUid] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [showOnlyWishlist, setShowOnlyWishlist] = useState(false);
  const [saleOrder, setSaleOrder] = useState([]);
  const [sharedBag, setSharedBag] = useState(() => {
    try { const p = new URLSearchParams(window.location.search).get("bag"); return p ? decodeBag(p) : null; }
    catch { return null; }
  });

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u); setAuthUser(u); setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u); setAuthUser(u);
      if (!u) {
        setDataLoaded(false);
        setOwned([]); setBags([]); setOverrides({}); setWishlist([]); setSaleOrder([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch("/discs.json")
      .then(r => { if (!r.ok) throw new Error("mangler"); return r.json(); })
      .then(data => { setAllDiscs(data); setDiscsLoading(false); })
      .catch(() => { setAllDiscs(FALLBACK); setFallback(true); setDiscsLoading(false); });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setDataLoaded(false);
    (async () => {
      let ownedIds = [];
      let loadedOverrides = {};
      try {
        let res = await store.get("owned");
        if (!res?.value && authUser) { const lv = localStorage.getItem("md_owned"); if (lv) res = { value: lv }; }
        if (res?.value) {
          const raw = JSON.parse(res.value);
          if (raw.length > 0 && typeof raw[0] === "string") {
            ownedIds = raw.map(discId => ({ uid: genId(), discId }));
            let ovRes = await store.get("overrides");
            if (!ovRes?.value && authUser) { const lv = localStorage.getItem("md_overrides"); if (lv) ovRes = { value: lv }; }
            if (ovRes?.value) {
              try {
                const rawOv = JSON.parse(ovRes.value);
                const discIdSet = new Set(ownedIds.map(x => x.discId));
                const firstKey = Object.keys(rawOv)[0];
                if (firstKey && discIdSet.has(firstKey)) {
                  const migOv = {};
                  ownedIds.forEach(({ uid, discId }) => { if (rawOv[discId]) migOv[uid] = rawOv[discId]; });
                  loadedOverrides = migOv;
                } else { loadedOverrides = rawOv; }
              } catch (_) {}
            }
            store.set("owned", JSON.stringify(ownedIds)).catch(() => {});
            store.set("overrides", JSON.stringify(loadedOverrides)).catch(() => {});
          } else {
            ownedIds = raw;
            let ovRes = await store.get("overrides");
            if (!ovRes?.value && authUser) { const lv = localStorage.getItem("md_overrides"); if (lv) ovRes = { value: lv }; }
            try { if (ovRes?.value) loadedOverrides = JSON.parse(ovRes.value); } catch (_) {}
          }
        } else if (!authUser) {
          const legacy = await store.get("bag").catch(() => null);
          if (legacy?.value) {
            ownedIds = JSON.parse(legacy.value).map(discId => ({ uid: genId(), discId }));
            await store.set("owned", JSON.stringify(ownedIds)).catch(() => {});
          }
        }
      } catch (_) {}
      setOwned(ownedIds);
      setOverrides(loadedOverrides);
      let bagsList = null;
      try {
        let res = await store.get("bags");
        if (!res?.value && authUser) { const lv = localStorage.getItem("md_bags"); if (lv) res = { value: lv }; }
        if (res?.value) bagsList = JSON.parse(res.value);
      } catch (_) {}
      if (bagsList === null) {
        const uniqueDiscIds = [...new Set(ownedIds.map(x => x.discId))];
        bagsList = uniqueDiscIds.length > 0 ? [{ id: genId(), name: "Min bag", discIds: uniqueDiscIds }] : [];
        store.set("bags", JSON.stringify(bagsList)).catch(() => {});
      }
      setBags(bagsList);
      let wishlistIds = [];
      try {
        let res = await store.get("wishlist");
        if (!res?.value && authUser) { const lv = localStorage.getItem("md_wishlist"); if (lv) res = { value: lv }; }
        try { if (res?.value) wishlistIds = JSON.parse(res.value); } catch (_) {}
      } catch (_) {}
      setWishlist(wishlistIds);
      let saleOrderData = [];
      try {
        let res = await store.get("saleOrder");
        try { if (res?.value) saleOrderData = JSON.parse(res.value); } catch (_) {}
      } catch (_) {}
      setSaleOrder(saleOrderData);
      setDataLoaded(true);
    })();
  }, [authUser, authLoading]);

  useEffect(() => { if (dataLoaded) store.set("owned", JSON.stringify(owned)).catch(() => {}); }, [owned, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("overrides", JSON.stringify(overrides)).catch(() => {}); }, [overrides, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("bags", JSON.stringify(bags)).catch(() => {}); }, [bags, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("wishlist", JSON.stringify(wishlist)).catch(() => {}); }, [wishlist, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("saleOrder", JSON.stringify(saleOrder)).catch(() => {}); }, [saleOrder, dataLoaded]);
  useEffect(() => { setFlightSelected(null); }, [flightSourceKey]);
  useEffect(() => {
    if (flightSourceKey !== "owned" && !bags.some(b => "bag:" + b.id === flightSourceKey)) setFlightSourceKey("owned");
  }, [bags, flightSourceKey]);

  const ownedDiscs = useMemo(() => owned.map(({ uid, discId }) => { const disc = allDiscs.find(d => d.id === discId); return disc ? { ...disc, uid } : null; }).filter(Boolean), [owned, allDiscs]);
  const resolvedOwned = useMemo(() => ownedDiscs.map(d => resolveDisc(d, overrides)), [ownedDiscs, overrides]);
  const forSaleDiscs = useMemo(() => resolvedOwned.filter(d => d.forSale), [resolvedOwned]);
  const brands = useMemo(() => ["Alle", ...[...new Set(allDiscs.map(d => d.brand))].sort()], [allDiscs]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allDiscs.filter(d => {
      if (showOnlyWishlist && !wishlist.includes(d.id)) return false;
      if (typeFilter !== "Alle" && d.type !== typeFilter) return false;
      if (brandFilter !== "Alle" && d.brand !== brandFilter) return false;
      if (!q) return true;
      return (d.name + " " + d.brand).toLowerCase().includes(q);
    });
  }, [allDiscs, query, typeFilter, brandFilter, wishlist, showOnlyWishlist]);

  const flightDiscs = useMemo(() => {
    if (flightSourceKey === "owned") return resolvedOwned;
    const bag = bags.find(b => "bag:" + b.id === flightSourceKey);
    if (!bag) return [];
    return bag.discIds.map(id => allDiscs.find(d => d.id === id)).filter(Boolean).map(d => resolveDisc(d, overrides));
  }, [flightSourceKey, resolvedOwned, bags, allDiscs, overrides]);
  const flightSelectedDisc = flightDiscs.find(d => (d.uid ?? d.id) === flightSelected) || null;

  const addToOwned = id => setOwned(o => [...o, { uid: genId(), discId: id }]);
  const removeFromOwned = uid => setOwned(o => o.filter(x => x.uid !== uid));
  const addToWishlist = id => setWishlist(w => w.includes(id) ? w : [...w, id]);
  const removeFromWishlist = id => setWishlist(w => w.filter(x => x !== id));

  function saveOverride(uid, vals) {
    setOverrides(o => {
      const wasForSale = o[uid]?.forSale;
      const isNowForSale = vals.forSale;
      if (isNowForSale && !wasForSale) setSaleOrder(s => s.includes(uid) ? s : [...s, uid]);
      else if (!isNowForSale && wasForSale) setSaleOrder(s => s.filter(id => id !== uid));
      return { ...o, [uid]: vals };
    });
    setEditingDiscUid(null);
  }
  function clearOverride(uid) {
    setOverrides(o => { const n = { ...o }; delete n[uid]; return n; });
    setSaleOrder(s => s.filter(id => id !== uid));
    setEditingDiscUid(null);
  }
  function toggleForSale(uid) {
    setOverrides(o => {
      const cur = o[uid] || {};
      const nowForSale = !cur.forSale;
      if (nowForSale) setSaleOrder(s => s.includes(uid) ? s : [...s, uid]);
      else setSaleOrder(s => s.filter(id => id !== uid));
      return {
        ...o, [uid]: {
          ...cur, forSale: nowForSale,
          condition: cur.condition ?? 8,
          hasInk: cur.hasInk ?? false,
          price: cur.price ?? "",
          saleNote: cur.saleNote ?? "",
        }
      };
    });
  }
  function openEditForDisc(uid) {
    setTab("owned");
    setEditingDiscUid(uid);
    setOpenBagId(null);
  }
  function openEditForDiscByDiscId(discId) {
    const inst = ownedDiscs.find(d => d.id === discId);
    if (inst) openEditForDisc(inst.uid);
  }
  function markAsSold(uid) {
    setOverrides(o => ({ ...o, [uid]: { ...(o[uid] || {}), forSale: false } }));
    setSaleOrder(s => s.filter(id => id !== uid));
  }

  function shareBag(bag) {
    const encoded = encodeBag(bag, allDiscs);
    const url = `${window.location.origin}${window.location.pathname}?bag=${encoded}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => alert("Link kopieret!")).catch(() => prompt("Kopiér dette link:", url));
    } else { prompt("Kopiér dette link:", url); }
  }
  function createEmptyBag() {
    const name = window.prompt("Navn på ny bag:", "Ny bag"); setShowNewChoice(false);
    if (name === null) return;
    const nb = { id: genId(), name: name.trim() || "Ny bag", discIds: [] };
    setBags(b => [...b, nb]); setOpenBagId(nb.id);
  }
  function renameBag(id) {
    const bag = bags.find(b => b.id === id); if (!bag) return;
    const name = window.prompt("Nyt navn:", bag.name);
    if (name === null || !name.trim()) return;
    setBags(bs => bs.map(b => b.id === id ? { ...b, name: name.trim() } : b));
  }
  function deleteBag(id) {
    const bag = bags.find(b => b.id === id); if (!bag) return;
    if (!window.confirm(`Slet bag "${bag.name}"? Kan ikke fortrydes.`)) return;
    setBags(bs => bs.filter(b => b.id !== id)); if (openBagId === id) setOpenBagId(null);
  }
  function addDiscToBag(bagId, discId) {
    setBags(bs => bs.map(b => b.id === bagId && !b.discIds.includes(discId) ? { ...b, discIds: [...b.discIds, discId] } : b));
  }
  function removeDiscFromBag(bagId, discId) {
    setBags(bs => bs.map(b => b.id === bagId ? { ...b, discIds: b.discIds.filter(id => id !== discId) } : b));
  }
  function saveGeneratedBag(name, discs) {
    const nb = { id: genId(), name: name || "Tilfældig bag", discIds: discs.map(d => d.id) };
    setBags(b => [...b, nb]); setOpenBagId(nb.id); setShowGenerator(false);
  }
  function addAllFromShared() {
    if (!sharedBag) return;
    setOwned(o => {
      const existingIds = new Set(o.map(x => x.discId));
      const newItems = sharedBag.discs.filter(d => !existingIds.has(d.id)).map(d => ({ uid: genId(), discId: d.id }));
      return [...o, ...newItems];
    });
    setSharedBag(null); window.history.replaceState({}, "", window.location.pathname);
  }

  if (sharedBag) return (
    <SharedBagView bag={sharedBag}
      onClose={() => { setSharedBag(null); window.history.replaceState({}, "", window.location.pathname); }}
      onAddAll={addAllFromShared}/>
  );

  const fontStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap');
    *{box-sizing:border-box;}
    button:focus-visible{outline:2px solid ${C.brand};outline-offset:2px;}
    select{appearance:none;}
    input::placeholder{color:${C.muted};}
    input[type=range]{height:4px;}
  `;
  const spinStyle = `@keyframes spin{to{transform:rotate(360deg)}}`;

  if (authLoading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <style>{fontStyle + spinStyle}</style>
      <Loader size={28} color={C.brand} style={{ animation: "spin 1s linear infinite" }}/>
      <span style={{ color: C.muted, fontSize: 14 }}>Logger ind…</span>
    </div>
  );

  if (!authUser && supabase) return <LoginScreen/>;

  if (discsLoading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
      <style>{fontStyle + spinStyle}</style>
      <Loader size={28} color={C.brand} style={{ animation: "spin 1s linear infinite" }}/>
      <span style={{ color: C.muted, fontSize: 14 }}>Henter disc-database…</span>
    </div>
  );

  const TABS = [
    ["db", "Database"], ["owned", "Mine discs"], ["bags", "Bags"],
    ["flight", "Flight"], ["stats", "Statistik"],
    ["salg", forSaleDiscs.length > 0 ? `Salg (${forSaleDiscs.length})` : "Salg"],
  ];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{fontStyle}</style>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 60px" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(180deg, ${C.surface} 0%, transparent 100%)`, margin: "0 -16px", padding: "20px 16px 18px", marginBottom: 4 }}>
          <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Disc3 size={24} color={C.brand}/>
            <h1 style={{ margin: 0, fontFamily: "Pacifico,cursive", fontWeight: 400, fontSize: 30, color: C.brand, lineHeight: 1 }}>BagUp</h1>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted, letterSpacing: "0.03em", background: C.raised, border: `1px solid ${C.line}`, padding: "5px 12px", borderRadius: 999 }}>
              {owned.length} ejet
            </span>
            {authUser && supabase && (
              <button onClick={() => supabase.auth.signOut()} aria-label="Log ud" title={authUser.email} style={{ ...iconBtn(C.muted), flexShrink: 0 }}>
                <LogOut size={15}/>
              </button>
            )}
          </header>
        </div>

        {usingFallback && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "11px 14px", marginBottom: 16, background: `${C.brand}12`, border: `1px solid ${C.brand}35`, borderRadius: 12, fontSize: 13 }}>
            <AlertCircle size={16} color={C.brand} style={{ flexShrink: 0, marginTop: 1 }}/>
            <span style={{ color: C.muted }}>Mini-database aktiv. Kør <code style={{ color: C.brand }}>node fetch-discs.mjs</code> for fuld database.</span>
          </div>
        )}

        {/* Navigation — 6 tabs */}
        <nav style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "9px 0", borderRadius: 12, cursor: "pointer",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.01em",
              border: `1px solid ${tab === key ? C.brand : C.line}`,
              background: tab === key ? C.raised : "transparent",
              color: tab === key ? C.text : `${C.muted}bb`,
              boxShadow: tab === key ? `0 4px 14px ${C.brand}25` : "none",
            }}>
              {label}
            </button>
          ))}
        </nav>

        {/* DATABASE */}
        {tab === "db" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 13px", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, marginBottom: 12 }}>
              <Search size={17} color={C.muted}/>
              <input value={query} onChange={e => { setQuery(e.target.value); setVisible(40); }} placeholder="Søg disc eller mærke…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, padding: "13px 0", fontSize: 15 }}/>
              {query && <button onClick={() => { setQuery(""); setVisible(40); }} aria-label="Ryd" style={iconBtn(C.muted)}><X size={15}/></button>}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {["Alle", ...TYPES].map(t => (
                <button key={t} onClick={() => { setTypeFilter(t); setVisible(40); }} style={{
                  padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, letterSpacing: "0.02em",
                  border: `1px solid ${typeFilter === t ? C.brand : C.line}`,
                  background: typeFilter === t ? C.raised : "transparent",
                  color: typeFilter === t ? C.text : C.muted,
                  boxShadow: typeFilter === t ? `0 2px 8px ${C.brand}20` : "none",
                }}>{t}</button>
              ))}
              <button onClick={() => { setShowOnlyWishlist(v => !v); setVisible(40); }} style={{
                padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, letterSpacing: "0.02em",
                display: "flex", alignItems: "center", gap: 5,
                border: `1px solid ${showOnlyWishlist ? C.distance : C.line}`,
                background: showOnlyWishlist ? `${C.distance}12` : "transparent",
                color: showOnlyWishlist ? C.distance : C.muted,
              }}>
                <Heart size={12} fill={showOnlyWishlist ? "currentColor" : "none"}/>
                Ønskeliste{wishlist.length > 0 ? ` (${wishlist.length})` : ""}
              </button>
            </div>
            <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setVisible(40); }}
              style={{ width: "100%", padding: "11px 13px", marginBottom: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, color: C.text, fontSize: 14, cursor: "pointer" }}>
              {brands.map(b => <option key={b} value={b} style={{ background: C.surface }}>{b}</option>)}
            </select>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, letterSpacing: "0.02em" }}>
              {filtered.length.toLocaleString("da")} discs{filtered.length > visibleCount && ` — viser ${visibleCount}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.slice(0, visibleCount).map(d => {
                const count = owned.filter(x => x.discId === d.id).length;
                return (
                  <DiscCard key={d.id} disc={d} actions={[
                    { icon: Plus, badge: count > 0 ? count : null, label: "Tilføj til mine discs", onClick: () => addToOwned(d.id), color: count > 0 ? C.midrange : C.brand },
                    { icon: Heart, iconProps: wishlist.includes(d.id) ? { fill: "currentColor" } : {}, label: wishlist.includes(d.id) ? "Fjern fra ønskeliste" : "Tilføj til ønskeliste", onClick: () => wishlist.includes(d.id) ? removeFromWishlist(d.id) : addToWishlist(d.id), color: wishlist.includes(d.id) ? C.distance : C.muted }
                  ]}/>
                );
              })}
              {filtered.length === 0 && <Empty text="Ingen discs matcher din søgning."/>}
            </div>
            {filtered.length > visibleCount && (
              <button onClick={() => setVisible(v => v + 40)} style={{ width: "100%", marginTop: 16, padding: "13px 0", borderRadius: 13, cursor: "pointer", background: "transparent", border: `1px solid ${C.line}`, color: C.muted, fontSize: 14 }}>
                Vis {Math.min(40, filtered.length - visibleCount)} mere
              </button>
            )}
          </div>
        )}

        {/* MINE DISCS */}
        {tab === "owned" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {ownedDiscs.length === 0 ? (
              <Empty text="Du ejer ingen discs endnu. Gå til Database og tilføj dem du har."/>
            ) : (
              TYPES.filter(t => ownedDiscs.some(d => d.type === t)).map(t => (
                <section key={t}>
                  <h2 style={secHdr(t)}>{t}</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ownedDiscs.filter(d => d.type === t).map(d => {
                      const rd = resolveDisc(d, overrides);
                      return (
                        <DiscCard key={d.uid} disc={rd}
                          isEditing={editingDiscUid === d.uid}
                          onToggleEdit={() => setEditingDiscUid(editingDiscUid === d.uid ? null : d.uid)}
                          override={overrides[d.uid] || null}
                          onSave={vals => saveOverride(d.uid, vals)}
                          onClear={() => clearOverride(d.uid)}
                          actions={[
                            {
                              icon: Tag,
                              label: rd.forSale ? "Fjern fra salg" : "Sæt til salg",
                              onClick: () => toggleForSale(d.uid),
                              color: rd.forSale ? C.brand : C.muted,
                            },
                            { icon: Trash2, label: "Fjern fra mine discs", onClick: () => removeFromOwned(d.uid), color: C.distance },
                          ]}/>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {/* BAGS */}
        {tab === "bags" && (
          openBagId ? (
            <BagDetail
              bag={bags.find(b => b.id === openBagId)}
              ownedDiscs={ownedDiscs} allDiscs={allDiscs}
              onBack={() => setOpenBagId(null)}
              onRename={() => renameBag(openBagId)}
              onDelete={() => deleteBag(openBagId)}
              onAddDisc={discId => addDiscToBag(openBagId, discId)}
              onRemoveDisc={discId => removeDiscFromBag(openBagId, discId)}
              onEditDisc={openEditForDiscByDiscId}/>
          ) : (
            <div>
              {!showGenerator && (
                <>
                  <button onClick={() => setShowNewChoice(v => !v)} style={{ ...btn("primary"), marginBottom: showNewChoice ? 12 : 16 }}>
                    + Ny bag
                  </button>
                  {showNewChoice && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      <button onClick={createEmptyBag} style={btn()}>Tom bag</button>
                      <button onClick={() => { setShowGenerator(true); setShowNewChoice(false); }} style={btn()}>🎲 Tilfældig bag</button>
                    </div>
                  )}
                  {bags.length === 0 ? (
                    <Empty text="Du har ingen bags endnu. Opret en ovenfor."/>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {bags.map(b => (
                        <button key={b.id} onClick={() => setOpenBagId(b.id)} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: 16, borderRadius: 16, cursor: "pointer", textAlign: "left",
                          background: C.surface, border: `1px solid ${C.line}`, color: C.text, boxShadow: `0 0 12px ${C.brand}06`,
                        }}>
                          <span style={{ fontWeight: 600 }}>{b.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 13, color: C.muted }}>{b.discIds.length} discs</span>
                            <button onClick={e => { e.stopPropagation(); shareBag(b); }}
                              style={{ fontSize: 12, color: C.brand, background: "transparent", border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 7 }}>Del</button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {showGenerator && (
                <GeneratorPanel ownedDiscs={resolvedOwned} onSave={saveGeneratedBag} onCancel={() => setShowGenerator(false)}/>
              )}
            </div>
          )
        )}

        {/* FLIGHT */}
        {tab === "flight" && (
          <div>
            <select value={flightSourceKey} onChange={e => setFlightSourceKey(e.target.value)}
              style={{ width: "100%", padding: "11px 13px", marginBottom: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, color: C.text, fontSize: 14, cursor: "pointer" }}>
              <option value="owned">Mine discs (alle ejede)</option>
              {bags.map(b => <option key={b.id} value={"bag:" + b.id}>{b.name}</option>)}
            </select>
            <div style={{ padding: 16, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 18, marginBottom: 14 }}>
              {flightDiscs.length === 0 ? (
                <Empty text="Ingen discs at vise her endnu."/>
              ) : (
                <FlightMatrix discs={flightDiscs} selectedId={flightSelected} onSelect={setFlightSelected}/>
              )}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8, fontSize: 12, color: C.muted }}>
              {TYPES.map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: TYPE_COLOR[t] }}/>{t}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>
              Disc-farve vises i matrixen hvis du har valgt én under ✎ i Mine discs.
            </div>
            {flightSelectedDisc && <DiscCard disc={flightSelectedDisc}/>}
          </div>
        )}

        {/* STATISTIK */}
        {tab === "stats" && (
          <StatsPanel resolvedOwned={resolvedOwned}/>
        )}

        {/* SALG */}
        {tab === "salg" && (
          <SalePanel
            forSaleDiscs={forSaleDiscs}
            saleOrder={saleOrder}
            setSaleOrder={setSaleOrder}
            onSold={markAsSold}
            onEdit={openEditForDisc}
          />
        )}

      </div>
    </div>
  );
}
