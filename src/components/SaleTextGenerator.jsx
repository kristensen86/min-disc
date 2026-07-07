import { useState } from "react";
import { X, ChevronLeft, Copy, RotateCcw } from "lucide-react";
import { C } from "../constants";
import { conditionText, salePriceStr } from "../utils";
import { btn } from "./ui";
import { FlightArcSpinner } from "./FlightArc";

const TONES = [
  {
    key: "friendly",
    label: "Venlig og uformel",
    desc: `"Sælger ud af skabet" — afslappet og hyggelig tone`,
    instruction: "Skriv i en venlig, afslappet og uformel tone, som om du sælger ud af dit eget bagskab til andre discgolfere. Hyggeligt og personligt, ikke corporate.",
  },
  {
    key: "short",
    label: "Kort og kontant",
    desc: "Kun facts, hurtigt overblik",
    instruction: "Skriv kort og kontant — kun de vigtigste facts, minimal fyldtekst, hurtigt at skimme.",
  },
  {
    key: "selling",
    label: "Sælgende",
    desc: "Fremhæver kvalitet og stand",
    instruction: "Skriv i en sælgende, entusiastisk tone der fremhæver discsenes kvalitet og stand — overbevisende uden at overdrive.",
  },
];

function buildDiscsSummary(discs) {
  return discs.map(d => {
    const cond = d.condition ?? 8;
    const parts = [d.name, d.brand];
    if (d.pPlastic) parts.push(d.pPlastic);
    parts.push(`${cond}/10 (${conditionText(cond)})`);
    parts.push(d.hasInk ? "med ink" : "uden ink");
    parts.push(salePriceStr(d));
    return `- ${parts.join(" · ")}`;
  }).join("\n");
}

async function generateText(forSaleDiscs, tone) {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: `Du skriver et Facebook-opslag på dansk til en disc golf køb/salg-gruppe, klar til at poste direkte.

DISCS TIL SALG:
${buildDiscsSummary(forSaleDiscs)}

TONE: ${tone.instruction}

Krav:
- Fængende indledning
- List alle discs fra listen ovenfor med deres priser
- Afslut med kontaktinfo-placeholderen: [KONTAKT]
- Maks 500 ord
- Brug emojis der passer til tonen
- Svar KUN med selve opslagsteksten — ingen forklaring, ingen markdown, ingen anførselstegn omkring teksten.`,
        }],
      }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error("Tomt svar");
  return text;
}

export function SaleTextGenerator({ forSaleDiscs, onClose }) {
  const [phase, setPhase] = useState("tone"); // tone | generating | result | error
  const [tone, setTone] = useState(null);
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function runGenerate(selectedTone) {
    setPhase("generating");
    try {
      const generated = await generateText(forSaleDiscs, selectedTone);
      setText(generated);
      setPhase("result");
    } catch {
      setErrorMsg("Kunne ikke generere salgstekst. Prøv igen.");
      setPhase("error");
    }
  }

  function handleGenerate() {
    if (!tone) return;
    runGenerate(tone);
  }

  function handleRegenerate() {
    setCopied(false);
    runGenerate(tone);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Kopiér salgstekst:", text);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 560,
        background: C.surface, border: `1px solid ${C.line}`,
        borderRadius: "20px 20px 0 0", padding: "24px 20px 36px",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          {phase === "result" || phase === "generating" ? (
            <button onClick={() => setPhase("tone")} disabled={phase === "generating"} style={{
              background: "none", border: "none", cursor: phase === "generating" ? "default" : "pointer",
              color: C.muted, padding: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 14,
              opacity: phase === "generating" ? 0.4 : 1,
            }}>
              <ChevronLeft size={16}/> Tilbage
            </button>
          ) : (
            <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Generer salgstekst</span>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={18}/>
          </button>
        </div>

        {/* tone selection */}
        {phase === "tone" && (
          <div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Vælg en tone, så genererer Claude et Facebook-opslag med alle {forSaleDiscs.length} disc{forSaleDiscs.length !== 1 ? "s" : ""} til salg.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {TONES.map(t => (
                <button key={t.key} onClick={() => setTone(t)} style={{
                  textAlign: "left", padding: "13px 14px", borderRadius: 13, cursor: "pointer",
                  border: `1px solid ${tone?.key === t.key ? C.brand : C.line}`,
                  background: tone?.key === t.key ? `${C.brand}12` : "transparent",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: tone?.key === t.key ? C.brand : C.text, marginBottom: 2 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={handleGenerate} disabled={!tone} style={{
              width: "100%", ...btn("primary"),
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: tone ? 1 : 0.45,
            }}>
              Generer
            </button>
          </div>
        )}

        {/* generating */}
        {phase === "generating" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 12, padding: "40px 0",
          }}>
            <FlightArcSpinner cycleColors size={44}/>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>Genererer salgstekst…</span>
          </div>
        )}

        {/* result */}
        {phase === "result" && (
          <div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={14}
              style={{
                width: "100%", padding: "13px 14px", borderRadius: 13, fontFamily: "inherit",
                background: C.raised, border: `1px solid ${C.line}`, color: C.text,
                fontSize: 13.5, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box",
                marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={handleCopy} style={{
                ...btn("primary"), display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                border: `1px solid ${C.brand}`,
              }}>
                <Copy size={15}/> {copied ? "Kopieret! ✓" : "Kopier til udklipsholder"}
              </button>
              <button onClick={handleRegenerate} style={{
                ...btn(), display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <RotateCcw size={14}/> Generer igen
              </button>
            </div>
          </div>
        )}

        {/* error */}
        {phase === "error" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.distance, fontSize: 14, marginBottom: 20 }}>{errorMsg}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setPhase("tone")} style={btn()}>Prøv igen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
