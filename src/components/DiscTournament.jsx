import { useState, useMemo, useRef, useEffect } from "react";
import { Trophy, X, ChevronLeft, ChevronRight, Share2, RotateCcw } from "lucide-react";
import { C, TYPE_COLOR, TYPES } from "../constants";
import { btn, Segmented } from "./ui";
import { FlightBadge } from "./FlightBadge";

const SWIPE_THRESHOLD = 100;
const CATEGORY_LABELS = { Putter: "Puttere", Midrange: "Midrange", Fairway: "Fairway", Distance: "Distance" };
const CATEGORY_OPTIONS = [["Alle", "Alle discs"], ...TYPES.map(t => [t, CATEGORY_LABELS[t]])];
const MODE_OPTIONS = [["quick", "Hurtig — top 3"], ["full", "Fuld turnering"]];
const MONTHS_DA = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pairs discs sequentially; an odd disc out gets a bye (paired with null).
function buildPairs(discs) {
  const pairs = [];
  for (let i = 0; i < discs.length; i += 2) {
    pairs.push(discs[i + 1] ? [discs[i], discs[i + 1]] : [discs[i], null]);
  }
  return pairs;
}

function formatDateDa(iso) {
  const d = new Date(iso);
  return `${d.getDate()}. ${MONTHS_DA[d.getMonth()]}`;
}

function fireConfetti(canvas) {
  if (!canvas || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};
  const ctx = canvas.getContext("2d");
  const W = (canvas.width = window.innerWidth);
  const H = (canvas.height = window.innerHeight);
  const colors = [C.brand, C.putter, C.midrange, C.fairway, C.distance, "#ffffff"];
  const particles = Array.from({ length: 90 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 100,
    y: H * 0.32,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 11 - 4,
    size: 5 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    gravity: 0.28 + Math.random() * 0.1,
    life: 0,
  }));
  let raf;
  function frame() {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    particles.forEach(p => {
      p.life++;
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.rot += p.vr;
      p.vx *= 0.99;
      const opacity = Math.max(0, 1 - p.life / 110);
      if (opacity > 0 && p.y < H + 20) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });
    if (alive) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  frame();
  return () => cancelAnimationFrame(raf);
}

function DiscAvatar({ disc, size }) {
  const glowColor = disc.pColor || TYPE_COLOR[disc.type] || C.brand;
  return disc.pPhoto ? (
    <img src={disc.pPhoto} alt={disc.name} style={{
      width: size, height: size, borderRadius: "50%", objectFit: "cover",
      border: `2px solid ${glowColor}60`, boxShadow: `0 0 20px ${glowColor}30`, display: "block",
    }}/>
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `${glowColor}18`, border: `2px solid ${glowColor}60`,
      color: glowColor, fontSize: size * 0.32, fontWeight: 800,
    }}>{disc.type[0]}</div>
  );
}

// A single matchup — swipeable "this vs that" card. Remounted per match (via key)
// so drag state always starts fresh; owns the fly-out exit animation for every
// trigger path (swipe, tapping the opponent, or the two buttons) so they feel identical.
function MatchCard({ discA, discB, onPick }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flyDir, setFlyDir] = useState(null);
  const start = useRef({ x: 0, active: false });

  function commit(dir) {
    if (flyDir) return;
    setFlyDir(dir);
    setTimeout(() => onPick(dir === "right" ? discA : discB), 180);
  }
  function onDown(e) {
    if (flyDir) return;
    start.current = { x: e.touches ? e.touches[0].clientX : e.clientX, active: true };
    setDragging(true);
  }
  function onMove(e) {
    if (!start.current.active) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setDragX(x - start.current.x);
  }
  function onUp() {
    if (!start.current.active) return;
    start.current.active = false;
    setDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) commit(dragX > 0 ? "right" : "left");
    else setDragX(0);
  }

  const rotate = dragX / 18;
  const pickOpacity = Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD));
  const skipOpacity = Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD));
  const transform = flyDir
    ? `translateX(${flyDir === "right" ? 700 : -700}px) rotate(${flyDir === "right" ? 40 : -40}deg)`
    : `translateX(${dragX}px) rotate(${rotate}deg)`;

  return (
    <div>
      <div
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        style={{
          position: "relative", touchAction: "pan-y",
          transform, transition: dragging ? "none" : "transform 0.22s ease",
          cursor: dragging ? "grabbing" : "grab", userSelect: "none",
        }}
      >
        <div style={{
          position: "absolute", top: 18, left: 18, zIndex: 2, padding: "6px 14px", borderRadius: 10,
          border: `2px solid ${C.brand}`, color: C.brand, fontWeight: 800, fontSize: 13,
          letterSpacing: "0.05em", transform: "rotate(-12deg)", opacity: pickOpacity,
        }}>VÆLG</div>
        <div style={{
          position: "absolute", top: 18, right: 18, zIndex: 2, padding: "6px 14px", borderRadius: 10,
          border: `2px solid ${C.distance}`, color: C.distance, fontWeight: 800, fontSize: 13,
          letterSpacing: "0.05em", transform: "rotate(12deg)", opacity: skipOpacity,
        }}>SPRING OVER</div>

        <div style={{
          background: `linear-gradient(160deg, ${C.surface} 0%, ${C.raised}90 100%)`,
          border: `1px solid ${C.line}`, borderRadius: 22, padding: "30px 20px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <DiscAvatar disc={discA} size={180}/>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, textAlign: "center" }}>{discA.name}</div>
          <div style={{ fontSize: 13, color: C.muted }}>{discA.brand} · {discA.type}</div>
          <FlightBadge disc={discA}/>
          {discA.pNote && (
            <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", textAlign: "center" }}>{discA.pNote}</div>
          )}
        </div>
      </div>

      {discB && (
        <>
          <div style={{
            textAlign: "center", fontSize: 12, color: C.muted, fontWeight: 700,
            letterSpacing: "0.1em", margin: "14px 0",
          }}>VS</div>

          <button onClick={() => commit("left")} style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "10px 12px", borderRadius: 14, cursor: "pointer",
            border: `1px solid ${C.line}`, background: "transparent", textAlign: "left",
          }}>
            <DiscAvatar disc={discB} size={60}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{discB.name}</div>
              <div style={{ fontSize: 11.5, color: C.muted }}>{discB.brand} · {discB.type}</div>
            </div>
          </button>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => commit("left")} style={{
              flex: 1, ...btn(), display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <ChevronLeft size={16}/> Vælg modstander
            </button>
            <button onClick={() => commit("right")} style={{
              flex: 1, ...btn("primary"), border: `1px solid ${C.brand}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              Vælg dette <ChevronRight size={16}/>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function DiscTournament({ resolvedOwned, bags, history, onSaveHistory, username, onClose }) {
  const [phase, setPhase] = useState("setup"); // setup | playing | result
  const [categoryFilter, setCategoryFilter] = useState("Alle");
  const [bagFilter, setBagFilter] = useState("all");
  const [mode, setMode] = useState("quick");
  const [bracket, setBracket] = useState(null); // { roundNumber, queue, total, completed, roundWinners, roundDone }
  const [wins, setWins] = useState({});
  const [result, setResult] = useState(null); // { winner, podium }
  const canvasRef = useRef(null);

  const pool = useMemo(() => {
    const bagUidSet = bagFilter === "all" ? null
      : new Set((bags.find(b => b.id === bagFilter)?.bagEntries || []).map(e => e.instanceId));
    return resolvedOwned.filter(d =>
      (categoryFilter === "Alle" || d.type === categoryFilter) &&
      (!bagUidSet || bagUidSet.has(d.uid))
    );
  }, [resolvedOwned, bags, categoryFilter, bagFilter]);

  const minNeeded = mode === "quick" ? 4 : 2;
  const canStart = pool.length >= minNeeded;

  function finish(discsArray, winsMap) {
    let podium = null, winnerDisc;
    if (mode === "quick" && discsArray.length > 1) {
      podium = [...discsArray].sort((a, b) => (winsMap[b.uid] || 0) - (winsMap[a.uid] || 0));
      winnerDisc = podium[0];
    } else {
      winnerDisc = discsArray[0];
    }
    setResult({ winner: winnerDisc, podium });
    setPhase("result");
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      discUid: winnerDisc.uid, discId: winnerDisc.id,
      name: winnerDisc.name, brand: winnerDisc.brand, type: winnerDisc.type,
      photo: winnerDisc.pPhoto || null, date: new Date().toISOString(), mode,
    };
    onSaveHistory(prev => [entry, ...(prev || [])].slice(0, 5));
  }

  function beginRound(discsArray, roundNum) {
    const pairs = buildPairs(discsArray);
    const decisive = pairs.filter(p => p[1]);
    const byes = pairs.filter(p => !p[1]).map(p => p[0]);
    setBracket({
      roundNumber: roundNum, queue: decisive, total: decisive.length,
      completed: 0, roundWinners: byes, roundDone: decisive.length === 0,
    });
  }

  function maybeFinishOrBeginRound(discsArray, roundNum, winsMap) {
    if (discsArray.length <= 1 || (mode === "quick" && discsArray.length <= 3)) {
      finish(discsArray, winsMap);
      return;
    }
    beginRound(discsArray, roundNum);
  }

  function startTournament() {
    setWins({});
    setResult(null);
    setPhase("playing");
    maybeFinishOrBeginRound(shuffle(pool), 1, {});
  }

  // A round finishes inside handleDecision's setBracket update — react to it here
  // once state has settled, so `wins` is guaranteed current for a "quick" podium sort.
  useEffect(() => {
    if (!bracket?.roundDone) return;
    maybeFinishOrBeginRound(bracket.roundWinners, bracket.roundNumber + 1, wins);
  }, [bracket]);

  useEffect(() => {
    if (phase !== "result") return;
    return fireConfetti(canvasRef.current);
  }, [phase, result]);

  function handleDecision(winnerDisc) {
    setWins(w => ({ ...w, [winnerDisc.uid]: (w[winnerDisc.uid] || 0) + 1 }));
    setBracket(prev => {
      const restQueue = prev.queue.slice(1);
      return {
        ...prev, queue: restQueue, completed: prev.completed + 1,
        roundWinners: [...prev.roundWinners, winnerDisc], roundDone: restQueue.length === 0,
      };
    });
  }

  function shareResult() {
    if (!result) return;
    const first = username ? username.split("@")[0] : "";
    const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : "Jeg";
    const text = `${name} kastede og ${result.winner.name} vandt turneringen!`;
    const shareData = { title: "BagUp — Favorit disc", text, url: window.location.origin };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else navigator.clipboard?.writeText(text).catch(() => {});
  }

  const label = { fontSize: 11, color: C.muted, letterSpacing: "0.04em", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 16px 8px", maxWidth: 560, width: "100%", margin: "0 auto", flexShrink: 0, boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.brand, fontSize: 14, fontWeight: 700 }}>
          <Trophy size={18}/> Favorit disc
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
          <X size={18}/>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 40px", boxSizing: "border-box" }}>
        <div key={phase} className="tab-transition" style={{ maxWidth: 560, margin: "0 auto" }}>

          {/* SETUP */}
          {phase === "setup" && (
            <div>
              <div style={{ textAlign: "center", padding: "24px 8px 30px" }}>
                <Trophy size={40} color={C.brand} style={{ marginBottom: 14 }}/>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Find din favorit disc</h1>
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Swipe på den du helst vil kaste</p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <span style={label}>Kategori</span>
                <Segmented options={CATEGORY_OPTIONS} value={categoryFilter} onChange={setCategoryFilter}/>
              </div>

              <div style={{ marginBottom: 20 }}>
                <span style={label}>Bag</span>
                <select value={bagFilter} onChange={e => setBagFilter(e.target.value)} style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  background: C.surface, border: `1px solid ${C.line}`,
                  color: C.text, fontSize: 13, appearance: "none", cursor: "pointer",
                }}>
                  <option value="all" style={{ background: C.surface }}>Alle mine discs</option>
                  {bags.map(b => (
                    <option key={b.id} value={b.id} style={{ background: C.surface }}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={label}>Turneringstype</span>
                <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode}/>
              </div>

              {!canStart && (
                <div style={{ fontSize: 12, color: C.distance, marginTop: 10 }}>
                  {pool.length === 0 ? "Ingen discs matcher dit filter." : `Vælg mindst ${minNeeded} discs for at starte.`}
                </div>
              )}

              <button onClick={startTournament} disabled={!canStart} style={{
                width: "100%", ...btn("primary"), border: `1px solid ${C.brand}`,
                padding: "15px 0", fontSize: 15, marginTop: 16,
                opacity: canStart ? 1 : 0.4, cursor: canStart ? "pointer" : "default",
              }}>
                Start turnering ({pool.length} discs)
              </button>

              {history?.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <span style={label}>Seneste vindere</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {history.map(h => (
                      <div key={h.id} style={{
                        fontSize: 12.5, color: C.muted, padding: "9px 12px",
                        background: C.raised, borderRadius: 10, border: `1px solid ${C.line}`,
                      }}>
                        Sidst vandt: <span style={{ color: C.text, fontWeight: 600 }}>{h.name}</span> ({formatDateDa(h.date)})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PLAYING */}
          {phase === "playing" && bracket && (
            <div>
              <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: "0.03em" }}>
                Runde {bracket.roundNumber} · Kamp {Math.min(bracket.completed + 1, bracket.total)} af {bracket.total}
              </div>
              <div style={{ height: 5, borderRadius: 999, background: C.line, overflow: "hidden", marginBottom: 22 }}>
                <div style={{
                  height: "100%", borderRadius: 999, background: C.brand, transition: "width 0.3s ease",
                  width: `${bracket.total ? (bracket.completed / bracket.total) * 100 : 0}%`,
                }}/>
              </div>
              {bracket.queue[0] && (
                <MatchCard
                  key={`${bracket.roundNumber}-${bracket.queue[0][0].uid}-${bracket.queue[0][1].uid}`}
                  discA={bracket.queue[0][0]} discB={bracket.queue[0][1]}
                  onPick={handleDecision}
                />
              )}
            </div>
          )}

          {/* RESULT */}
          {phase === "result" && result && (
            <div style={{ textAlign: "center", padding: "20px 8px" }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, letterSpacing: "0.03em" }}>Din favorit disc er…</div>
              <div className="winner-pulse" style={{ display: "inline-block", marginBottom: 18 }}>
                <DiscAvatar disc={result.winner} size={160}/>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>{result.winner.name}</h1>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>{result.winner.brand} · {result.winner.type}</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
                <FlightBadge disc={result.winner}/>
              </div>

              {result.podium && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 22, marginBottom: 30 }}>
                  {result.podium.slice(0, 3).map((d, i) => (
                    <div key={d.uid} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{["🥇", "🥈", "🥉"][i]}</div>
                      <DiscAvatar disc={d} size={i === 0 ? 68 : 54}/>
                      <div style={{
                        fontSize: 11, color: C.muted, marginTop: 6, maxWidth: 76,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{d.name}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320, margin: "0 auto" }}>
                <button onClick={shareResult} style={{ ...btn(), display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Share2 size={15}/> Del resultat
                </button>
                <button onClick={() => setPhase("setup")} style={{
                  ...btn("primary"), border: `1px solid ${C.brand}`,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <RotateCcw size={15}/> Spil igen
                </button>
                <button onClick={onClose} style={btn("ghost")}>Tilbage</button>
              </div>

              <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}/>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
