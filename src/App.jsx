import { useState, useEffect, useMemo } from "react";
import { Search, Plus, X, Trash2, AlertCircle, Loader, Heart, LogOut, Disc3, Tag, Library, Briefcase, BarChart2, Bookmark, Share2, Camera, MoreHorizontal } from "lucide-react";
import { supabase, setUser } from "./supabase";
import { C, TYPE_COLOR, TYPES, FALLBACK, typeFromSpeed } from "./constants";
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
import { BagComparison } from "./components/BagComparison";
import { SalePanel } from "./components/SalePanel";
import { CreateDiscForm } from "./components/CreateDiscForm";
import { DiscScanner } from "./components/DiscScanner";
import { OverflowMenu } from "./components/OverflowMenu";

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
  const [showCompare, setShowCompare] = useState(false);
  const [flightSourceKey, setFlightSourceKey] = useState("owned");
  const [flightSelected, setFlightSelected] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [editingDiscUid, setEditingDiscUid] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [showOnlyWishlist, setShowOnlyWishlist] = useState(false);
  const [saleOrder, setSaleOrder] = useState([]);
  const [soldHistory, setSoldHistory] = useState([]);
  const [customDiscs, setCustomDiscs] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDbScanner, setShowDbScanner] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [bagsFlightSourceKey, setBagsFlightSourceKey] = useState("owned");
  const [bagsFlightSelected, setBagsFlightSelected] = useState(null);
  const [ownedQuery, setOwnedQuery] = useState("");
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
      .then(data => { setAllDiscs(prev => [...data, ...prev.filter(d => d.isCustom)]); setDiscsLoading(false); })
      .catch(() => { setAllDiscs(prev => [...FALLBACK, ...prev.filter(d => d.isCustom)]); setFallback(true); setDiscsLoading(false); });
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
        bagsList = ownedIds.length > 0
          ? [{ id: genId(), name: "Min bag", bagEntries: ownedIds.map(({ uid }) => ({ entryId: genId(), instanceId: uid })) }]
          : [];
        store.set("bags", JSON.stringify(bagsList)).catch(() => {});
      } else {
        // Migrate: discIds[] → bagEntries[], and discId entries → instanceId entries
        bagsList = bagsList.map(b => {
          const rawEntries = b.bagEntries || (b.discIds || []).map(id => ({ entryId: genId(), discId: id }));
          const needsMigration = rawEntries.some(e => !e.instanceId && e.discId);
          if (!needsMigration) return { ...b, bagEntries: rawEntries };
          const used = {};
          return {
            id: b.id, name: b.name,
            bagEntries: rawEntries.map(e => {
              if (e.instanceId) return e;
              const instances = ownedIds.filter(x => x.discId === e.discId);
              const idx = used[e.discId] || 0;
              used[e.discId] = idx + 1;
              const inst = instances[idx] || instances[0];
              return { entryId: e.entryId || genId(), instanceId: inst?.uid || genId() };
            }),
          };
        });
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
      let historyData = [];
      try {
        let res = await store.get("saleHistory");
        try { if (res?.value) historyData = JSON.parse(res.value); } catch (_) {}
      } catch (_) {}
      setSoldHistory(historyData);
      let customData = [];
      try {
        let res = await store.get("customDiscs");
        try { if (res?.value) customData = JSON.parse(res.value); } catch (_) {}
      } catch (_) {}
      setCustomDiscs(customData);
      if (customData.length > 0) {
        setAllDiscs(prev => [...prev.filter(d => !d.isCustom), ...customData]);
      }
      setDataLoaded(true);
    })();
  }, [authUser, authLoading]);

  useEffect(() => { if (dataLoaded) store.set("owned", JSON.stringify(owned)).catch(() => {}); }, [owned, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("overrides", JSON.stringify(overrides)).catch(() => {}); }, [overrides, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("bags", JSON.stringify(bags)).catch(() => {}); }, [bags, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("wishlist", JSON.stringify(wishlist)).catch(() => {}); }, [wishlist, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("saleOrder", JSON.stringify(saleOrder)).catch(() => {}); }, [saleOrder, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("saleHistory", JSON.stringify(soldHistory)).catch(() => {}); }, [soldHistory, dataLoaded]);
  useEffect(() => { if (dataLoaded) store.set("customDiscs", JSON.stringify(customDiscs)).catch(() => {}); }, [customDiscs, dataLoaded]);
  useEffect(() => { if (tab !== "owned") setOwnedQuery(""); }, [tab]);
  useEffect(() => { setFlightSelected(null); }, [flightSourceKey]);
  useEffect(() => {
    if (flightSourceKey !== "owned" && !bags.some(b => "bag:" + b.id === flightSourceKey)) setFlightSourceKey("owned");
  }, [bags, flightSourceKey]);

  const ownedDiscs = useMemo(() => owned.map(({ uid, discId }) => { const disc = allDiscs.find(d => d.id === discId); return disc ? { ...disc, uid } : null; }).filter(Boolean), [owned, allDiscs]);
  const resolvedOwned = useMemo(() => ownedDiscs.map(d => resolveDisc(d, overrides)), [ownedDiscs, overrides]);
  const forSaleDiscs = useMemo(() => resolvedOwned.filter(d => d.forSale), [resolvedOwned]);
  const filteredResolved = useMemo(() => {
    if (!ownedQuery.trim()) return resolvedOwned;
    const q = ownedQuery.trim().toLowerCase();
    return resolvedOwned.filter(d =>
      (d.name + " " + d.brand + " " + (d.pPlastic || "") + " " + (d.pNote || "")).toLowerCase().includes(q)
    );
  }, [resolvedOwned, ownedQuery]);
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
    return (bag.bagEntries || []).map(e => {
      const ownedInst = ownedDiscs.find(od => od.uid === e.instanceId);
      return ownedInst ? resolveDisc(ownedInst, overrides) : null;
    }).filter(Boolean);
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
          saleMP: cur.saleMP ?? "",
          saleBIN: cur.saleBIN || cur.price || "",
          saleNote: cur.saleNote ?? "",
          saleGroup: cur.saleGroup ?? "",
          salePos: cur.salePos ?? "",
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
  function markAsSold(uid, buyer = "") {
    const disc = forSaleDiscs.find(d => d.uid === uid);
    if (disc) {
      setSoldHistory(h => [...h, {
        name: disc.name, brand: disc.brand, type: disc.type,
        price: Number(disc.saleBIN || disc.price) || 0,
        date: new Date().toLocaleDateString("da-DK"),
        buyer: buyer || "",
        condition: disc.condition ?? 8,
      }]);
    }
    setOverrides(o => ({ ...o, [uid]: { ...(o[uid] || {}), forSale: false } }));
    setSaleOrder(s => s.filter(id => id !== uid));
  }

  function createCustomDisc(disc) {
    setCustomDiscs(c => [...c, disc]);
    setAllDiscs(d => [...d, disc]);
    setOwned(o => [...o, { uid: genId(), discId: disc.id }]);
    setShowCreateForm(false);
  }
  function deleteCustomDisc(id) {
    setCustomDiscs(c => c.filter(d => d.id !== id));
    setAllDiscs(d => d.filter(d => d.id !== id));
    const removedUids = new Set(owned.filter(x => x.discId === id).map(x => x.uid));
    setBags(bs => bs.map(b => ({ ...b, bagEntries: (b.bagEntries || []).filter(e => !removedUids.has(e.instanceId)) })));
    setOwned(prev => {
      const toRemove = new Set(prev.filter(x => x.discId === id).map(x => x.uid));
      if (toRemove.size > 0) setSaleOrder(s => s.filter(uid => !toRemove.has(uid)));
      return prev.filter(x => x.discId !== id);
    });
  }

  const [shareCopied, setShareCopied] = useState(false);
  function shareApp() {
    const shareData = {
      title: "BagUp — Disc Golf Bag Manager",
      text: "Jeg bruger BagUp til at holde styr på mine discs og bags. Prøv det gratis!",
      url: "https://bagup.vercel.app",
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareData.url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch(() => {});
    }
  }

  function shareBag(bag) {
    const bagForShare = {
      ...bag,
      bagEntries: (bag.bagEntries || []).map(e => {
        const inst = ownedDiscs.find(od => od.uid === e.instanceId);
        return inst ? { entryId: e.entryId, discId: inst.id } : null;
      }).filter(Boolean),
    };
    const encoded = encodeBag(bagForShare, allDiscs);
    const url = `${window.location.origin}${window.location.pathname}?bag=${encoded}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => alert("Link kopieret!")).catch(() => prompt("Kopiér dette link:", url));
    } else { prompt("Kopiér dette link:", url); }
  }
  function createEmptyBag() {
    const name = window.prompt("Navn på ny bag:", "Ny bag"); setShowNewChoice(false);
    if (name === null) return;
    const nb = { id: genId(), name: name.trim() || "Ny bag", bagEntries: [] };
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
  function addInstanceToBag(bagId, instanceId) {
    setBags(bs => bs.map(b => b.id === bagId ? { ...b, bagEntries: [...(b.bagEntries || []), { entryId: genId(), instanceId }] } : b));
  }
  function removeEntryFromBag(bagId, entryId) {
    setBags(bs => bs.map(b => b.id === bagId ? { ...b, bagEntries: (b.bagEntries || []).filter(e => e.entryId !== entryId) } : b));
  }
  function saveGeneratedBag(name, discs) {
    const nb = { id: genId(), name: name || "Tilfældig bag", bagEntries: discs.map(d => ({ entryId: genId(), instanceId: d.uid })) };
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

  // 4 nav tabs — FAB is center slot, Salg lives in overflow
  const NAV_LEFT  = [["db", "Søg", Search], ["owned", "Mine", Library]];
  const NAV_RIGHT = [["bags", "Bags", Briefcase]];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{fontStyle}</style>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px calc(84px + env(safe-area-inset-bottom))" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(180deg, ${C.surface} 0%, transparent 100%)`, margin: "0 -16px", padding: "20px 16px 18px", marginBottom: 4 }}>
          <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Disc3 size={24} color={C.brand}/>
            <h1 style={{ margin: 0, fontFamily: "Pacifico,cursive", fontWeight: 400, fontSize: 30, color: C.brand, lineHeight: 1 }}>BagUp</h1>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted, letterSpacing: "0.03em", background: C.raised, border: `1px solid ${C.line}`, padding: "5px 12px", borderRadius: 999 }}>
              {owned.length} ejet
            </span>
            <button onClick={shareApp} aria-label="Del BagUp" title={shareCopied ? "Link kopieret!" : "Del BagUp"}
              style={{ ...iconBtn(shareCopied ? C.brand : C.muted), flexShrink: 0, position: "relative" }}>
              <Share2 size={15}/>
              {shareCopied && (
                <span style={{ position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)",
                  fontSize: 10, color: C.brand, whiteSpace: "nowrap", pointerEvents: "none" }}>
                  Kopieret!
                </span>
              )}
            </button>
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

        {/* DATABASE */}
        {tab === "db" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 13px", marginBottom: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13 }}>
              <Search size={17} color={C.muted}/>
              <input value={query} onChange={e => { setQuery(e.target.value); setVisible(40); }} placeholder="Søg disc eller mærke…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, padding: "13px 0", fontSize: 15 }}/>
              {query && <button onClick={() => { setQuery(""); setVisible(40); }} aria-label="Ryd" style={iconBtn(C.muted)}><X size={15}/></button>}
            </div>
            {showDbScanner && (
              <DiscScanner
                allDiscs={allDiscs}
                onDirectAdd={(result, previewUrl) => {
                  const nameLow = (result.name || "").toLowerCase();
                  const brandLow = (result.brand || "").toLowerCase();
                  const match = allDiscs.find(d =>
                    d.name.toLowerCase() === nameLow && (!brandLow || d.brand.toLowerCase() === brandLow)
                  );
                  const newUid = genId();
                  const overrideData = {
                    ...(result.plastic && { pPlastic: result.plastic }),
                    ...(result.colorHex && { pColor: result.colorHex }),
                    ...(previewUrl && { pPhoto: previewUrl }),
                    ...(result.pWeight && { pWeight: result.pWeight }),
                    ...(result.pNote && { pNote: result.pNote }),
                    ...(result.forSale && { forSale: result.forSale }),
                    ...(result.forSale && result.condition != null && { condition: result.condition }),
                    ...(result.forSale && result.hasInk != null && { hasInk: result.hasInk }),
                    ...(result.forSale && result.saleMP && { saleMP: result.saleMP }),
                    ...(result.forSale && result.saleBIN && { saleBIN: result.saleBIN }),
                    ...(result.forSale && result.saleNote && { saleNote: result.saleNote }),
                  };
                  if (match) {
                    setOwned(o => [...o, { uid: newUid, discId: match.id }]);
                  } else {
                    const type = result.type || (result.speed ? typeFromSpeed(Number(result.speed)) : "Distance");
                    const t = Number(result.turn) || 0, f = Number(result.fade) || 2;
                    const s = f - t;
                    const stability = s <= -3 ? "Very Understable" : s <= -1 ? "Understable" : s <= 1 ? "Stable" : s <= 3 ? "Overstable" : "Very Overstable";
                    const customDisc = {
                      id: "custom_" + genId(),
                      name: result.name || "Ukendt disc",
                      brand: result.brand || "Ukendt",
                      type, stability, isCustom: true,
                      speed: Number(result.speed) || 7,
                      glide: Number(result.glide) || 5,
                      turn: t, fade: f,
                    };
                    setCustomDiscs(c => [...c, customDisc]);
                    setAllDiscs(d => [...d, customDisc]);
                    setOwned(o => [...o, { uid: newUid, discId: customDisc.id }]);
                  }
                  if (Object.keys(overrideData).length > 0) {
                    setOverrides(prev => ({ ...prev, [newUid]: overrideData }));
                  }
                  setShowDbScanner(false);
                }}
                onSearchFallback={(name, brand) => {
                  setQuery([name, brand].filter(Boolean).join(" "));
                  setVisible(40);
                  setShowDbScanner(false);
                }}
                onClose={() => setShowDbScanner(false)}/>
            )}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: C.muted, letterSpacing: "0.02em" }}>
                {filtered.length.toLocaleString("da")} discs{filtered.length > visibleCount && ` — viser ${visibleCount}`}
              </span>
              <button onClick={() => setShowCreateForm(v => !v)} style={{
                fontSize: 12, fontWeight: 600, color: showCreateForm ? C.brand : C.muted,
                background: showCreateForm ? `${C.brand}12` : "transparent",
                border: `1px solid ${showCreateForm ? C.brand : C.line}`,
                padding: "5px 12px", borderRadius: 999, cursor: "pointer", letterSpacing: "0.02em",
              }}>+ Opret disc</button>
            </div>

            {showCreateForm && (
              <CreateDiscForm onSave={createCustomDisc} onCancel={() => setShowCreateForm(false)}/>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.slice(0, visibleCount).map(d => {
                const count = owned.filter(x => x.discId === d.id).length;
                return (
                  <DiscCard key={d.id} disc={d} actions={[
                    { icon: Plus, badge: count > 0 ? count : null, label: "Tilføj til mine discs", onClick: () => addToOwned(d.id), color: count > 0 ? C.midrange : C.brand },
                    { icon: Heart, iconProps: wishlist.includes(d.id) ? { fill: "currentColor" } : {}, label: wishlist.includes(d.id) ? "Fjern fra ønskeliste" : "Tilføj til ønskeliste", onClick: () => wishlist.includes(d.id) ? removeFromWishlist(d.id) : addToWishlist(d.id), color: wishlist.includes(d.id) ? C.distance : C.muted },
                    ...(d.isCustom ? [{ icon: Trash2, label: "Slet disc", onClick: () => deleteCustomDisc(d.id), color: C.distance, needsConfirm: true }] : []),
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Search bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 13px", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13 }}>
              <Search size={17} color={C.muted}/>
              <input value={ownedQuery} onChange={e => setOwnedQuery(e.target.value)}
                placeholder="Søg i mine discs…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, padding: "13px 0", fontSize: 15 }}/>
              {ownedQuery && <button onClick={() => setOwnedQuery("")} aria-label="Ryd" style={iconBtn(C.muted)}><X size={15}/></button>}
            </div>

            {ownedDiscs.length === 0 ? (
              <Empty text="Du ejer ingen discs endnu. Gå til Søg og tilføj dem du har."/>
            ) : filteredResolved.length === 0 ? (
              <Empty text="Ingen discs matcher din søgning."/>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {TYPES.filter(t => filteredResolved.some(d => d.type === t)).map(t => (
                  <section key={t}>
                    <h2 style={secHdr(t)}>{t}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {filteredResolved.filter(d => d.type === t).map(d => (
                        <DiscCard key={d.uid} disc={d}
                          isEditing={editingDiscUid === d.uid}
                          onToggleEdit={() => setEditingDiscUid(editingDiscUid === d.uid ? null : d.uid)}
                          override={overrides[d.uid] || null}
                          onSave={vals => saveOverride(d.uid, vals)}
                          onClear={() => clearOverride(d.uid)}
                          actions={[
                            {
                              icon: Tag,
                              label: d.forSale ? "Fjern fra salg" : "Sæt til salg",
                              onClick: () => toggleForSale(d.uid),
                              color: d.forSale ? C.brand : C.muted,
                            },
                            { icon: Trash2, label: "Fjern fra mine discs", onClick: () => removeFromOwned(d.uid), color: C.distance, needsConfirm: true },
                          ]}/>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BAGS */}
        {tab === "bags" && (
          openBagId ? (
            <BagDetail
              bag={bags.find(b => b.id === openBagId)}
              ownedDiscs={ownedDiscs}
              onBack={() => setOpenBagId(null)}
              onRename={() => renameBag(openBagId)}
              onDelete={() => deleteBag(openBagId)}
              overrides={overrides}
              onAddDisc={instanceId => addInstanceToBag(openBagId, instanceId)}
              onRemoveDisc={entryId => removeEntryFromBag(openBagId, entryId)}
              onEditDisc={openEditForDisc}/>
          ) : (
            <div>
              {/* Flight — source selector handled inside FlightMatrix */}
              {!showGenerator && !showCompare && (
                <div style={{ margin: "0 -16px", marginBottom: 16 }}>
                  <FlightMatrix
                    discs={
                      bagsFlightSourceKey === "owned"
                        ? resolvedOwned
                        : (bags.find(b => "bag:" + b.id === bagsFlightSourceKey)?.bagEntries || [])
                            .map(e => { const od = ownedDiscs.find(od => od.uid === e.instanceId); return od ? resolveDisc(od, overrides) : null; })
                            .filter(Boolean)
                    }
                    selectedId={bagsFlightSelected}
                    onSelect={setBagsFlightSelected}
                    sources={[
                      { key: "owned", label: "Mine discs (alle)" },
                      ...bags.map(b => ({ key: "bag:" + b.id, label: b.name })),
                    ]}
                    sourceKey={bagsFlightSourceKey}
                    onSourceChange={key => { setBagsFlightSourceKey(key); setBagsFlightSelected(null); }}
                  />
                </div>
              )}

              {/* Mine bags / Sammenlign toggle */}
              {!showGenerator && (
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {["Mine bags", "Sammenlign"].map((label, i) => {
                    const active = i === 0 ? !showCompare : showCompare;
                    return (
                      <button key={label} onClick={() => setShowCompare(i === 1)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                        border: `1px solid ${active ? C.brand : C.line}`,
                        background: active ? `${C.brand}18` : "transparent",
                        color: active ? C.brand : C.muted,
                      }}>{label}</button>
                    );
                  })}
                </div>
              )}

              {showCompare ? (
                <BagComparison bags={bags} ownedDiscs={ownedDiscs} allDiscs={allDiscs} overrides={overrides}/>
              ) : (
                <>
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
                                <span style={{ fontSize: 13, color: C.muted }}>{(b.bagEntries || []).length} discs</span>
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
                </>
              )}
            </div>
          )
        )}

        {/* FLIGHT */}
        {tab === "flight" && (
          <div>
            <div style={{ margin: "0 -16px" }}>
              <FlightMatrix
                discs={flightDiscs}
                selectedId={flightSelected}
                onSelect={setFlightSelected}
                sources={[
                  { key: "owned", label: "Mine discs" },
                  ...bags.map(b => ({ key: "bag:" + b.id, label: b.name })),
                ]}
                sourceKey={flightSourceKey}
                onSourceChange={setFlightSourceKey}
              />
            </div>
            {flightSelectedDisc && <DiscCard disc={flightSelectedDisc}/>}
          </div>
        )}

        {/* STATISTIK */}
        {tab === "stats" && (
          <StatsPanel resolvedOwned={resolvedOwned} allDiscs={allDiscs}/>
        )}

        {/* SALG */}
        {tab === "salg" && (
          <SalePanel
            forSaleDiscs={forSaleDiscs}
            saleOrder={saleOrder}
            setSaleOrder={setSaleOrder}
            onSold={markAsSold}
            onEdit={openEditForDisc}
            username={authUser?.email}
            soldHistory={soldHistory}
            onClearHistory={() => setSoldHistory([])}
          />
        )}

        {/* ØNSKELISTE */}
        {tab === "wish" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {wishlist.length === 0 ? (
              <Empty text="Ingen ønsker endnu. Tilføj discs til din ønskeliste fra Søg-fanen."/>
            ) : (
              allDiscs.filter(d => wishlist.includes(d.id)).map(d => {
                const count = owned.filter(x => x.discId === d.id).length;
                return (
                  <DiscCard key={d.id} disc={d} actions={[
                    { icon: Plus, badge: count > 0 ? count : null, label: "Tilføj til mine discs", onClick: () => addToOwned(d.id), color: count > 0 ? C.midrange : C.brand },
                    { icon: Bookmark, iconProps: { fill: "currentColor" }, label: "Fjern fra ønskeliste", onClick: () => removeFromWishlist(d.id), color: C.distance },
                  ]}/>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Overflow menu */}
      {showOverflow && (
        <OverflowMenu
          ownedCount={owned.length}
          wishCount={wishlist.length}
          forSaleCount={forSaleDiscs.length}
          onGoSalg={() => { setTab("salg"); setOpenBagId(null); }}
          onGoStats={() => { setTab("stats"); setOpenBagId(null); }}
          onGoWish={() => { setTab("wish"); setOpenBagId(null); }}
          onShare={shareApp}
          onClose={() => setShowOverflow(false)}
        />
      )}

      {/* Fixed bottom navigation */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, overflow: "visible" }}>
        <div style={{
          maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center",
          height: 64, paddingBottom: "env(safe-area-inset-bottom)",
          background: "#0a0f0a",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        }}>

          {/* Left: Søg + Mine */}
          {NAV_LEFT.map(([key, label, Icon]) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => { setTab(key); setOpenBagId(null); }} style={{
                flex: 1, height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                background: "transparent", border: "none", cursor: "pointer", position: "relative",
              }}>
                {active && <span style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, borderRadius: "0 0 3px 3px", background: "#4ade80", boxShadow: "0 0 8px #4ade8090" }}/>}
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} color={active ? "#4ade80" : "#3d5249"}/>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.02em", lineHeight: 1, color: active ? "#4ade80" : "#3d5249" }}>{label}</span>
              </button>
            );
          })}

          {/* Center: FAB camera */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "visible" }}>
            <button onClick={() => setShowDbScanner(true)} aria-label="Scan disc" style={{
              width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
              background: "#4ade80", border: "none",
              boxShadow: "0 4px 20px rgba(74,222,128,0.4)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: "translateY(-12px)",
            }}>
              <Camera size={24} color="#0a0f0a" strokeWidth={2.2}/>
            </button>
          </div>

          {/* Right: Bags */}
          {NAV_RIGHT.map(([key, label, Icon]) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                background: "transparent", border: "none", cursor: "pointer", position: "relative",
              }}>
                {active && <span style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, borderRadius: "0 0 3px 3px", background: "#4ade80", boxShadow: "0 0 8px #4ade8090" }}/>}
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} color={active ? "#4ade80" : "#3d5249"}/>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.02em", lineHeight: 1, color: active ? "#4ade80" : "#3d5249" }}>{label}</span>
              </button>
            );
          })}

          {/* Mere — overflow */}
          {(() => {
            const active = tab === "stats" || tab === "wish" || tab === "salg";
            return (
              <button onClick={() => setShowOverflow(true)} style={{
                flex: 1, height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                background: "transparent", border: "none", cursor: "pointer", position: "relative",
              }}>
                {active && <span style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, borderRadius: "0 0 3px 3px", background: "#4ade80", boxShadow: "0 0 8px #4ade8090" }}/>}
                <MoreHorizontal size={22} strokeWidth={active ? 2.2 : 1.8} color={active ? "#4ade80" : "#3d5249"}/>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.02em", lineHeight: 1, color: active ? "#4ade80" : "#3d5249" }}>Mere</span>
              </button>
            );
          })()}

        </div>
      </nav>

    </div>
  );
}
