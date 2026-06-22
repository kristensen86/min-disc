import { useState, useRef } from "react";
import { X, Camera, Check, Search, Loader } from "lucide-react";
import { C } from "../constants";
import { resizeImage } from "../utils";
import { btn } from "./ui";

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export function DiscScanner({ allDiscs, onFound, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | scanning | confirm | error
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setPhase("scanning");
    setErrorMsg("");

    let base64;
    try {
      const dataUrl = await resizeImage(file, 800);
      base64 = dataUrl.split(",")[1];
      setPreview(dataUrl);
    } catch {
      setPhase("error");
      setErrorMsg("Kunne ikke læse billedet.");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 256,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: base64 },
              },
              {
                type: "text",
                text: `Dette er et billede af en disc golf disc. Identificér venligst:
- Disc navn (mold navn)
- Mærke/brand
- Plast type hvis synlig
- Farve

Svar KUN med JSON i dette format:
{"name":"...","brand":"...","plastic":"...","color":"..."}

Hvis du ikke kan identificere disc'en svar med:
{"error":"kunne ikke identificere"}`,
              },
            ],
          }],
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Ugyldigt svar");
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.error) {
        setPhase("error");
        setErrorMsg("Kunne ikke genkende disc'en. Prøv manuel søgning.");
        return;
      }

      setResult(parsed);
      setPhase("confirm");
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        setErrorMsg("Timeout — prøv manuel søgning.");
      } else {
        setErrorMsg("Kunne ikke genkende disc'en. Prøv manuel søgning.");
      }
      setPhase("error");
    }
  }

  function handleConfirm() {
    onFound(result?.name || "", result?.brand || "");
  }

  function handleManual() {
    onFound(result?.name || "", "");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 560,
        background: C.surface, border: `1px solid ${C.line}`,
        borderRadius: "20px 20px 0 0", padding: "24px 20px 36px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Scan disc</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
            <X size={18}/>
          </button>
        </div>

        {/* idle */}
        {phase === "idle" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              Tag et billede af din disc, og Claude Vision identificerer den automatisk.
            </p>
            <input ref={inputRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0])}/>
            <button onClick={() => inputRef.current?.click()} style={{
              ...btn("primary"),
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 24px",
            }}>
              <Camera size={16}/> Åbn kamera
            </button>
          </div>
        )}

        {/* scanning */}
        {phase === "scanning" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {preview && (
              <img src={preview} alt="Preview" style={{
                width: 120, height: 120, objectFit: "cover", borderRadius: 12,
                border: `1px solid ${C.line}`, marginBottom: 16,
              }}/>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted, fontSize: 14 }}>
              <Loader size={16} style={{ animation: "spin 1s linear infinite" }}/>
              Analyserer disc…
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* confirm */}
        {phase === "confirm" && result && (
          <div>
            <div style={{ display: "flex", gap: 14, alignItems: "center",
              background: C.raised, border: `1px solid ${C.line}`, borderRadius: 14,
              padding: "14px 16px", marginBottom: 6 }}>
              {preview && (
                <img src={preview} alt="Disc" style={{
                  width: 64, height: 64, objectFit: "cover", borderRadius: 10,
                  border: `1px solid ${C.line}`, flexShrink: 0,
                }}/>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  {result.name || "Ukendt disc"}
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {[result.brand, result.plastic, result.color].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 16 }}>
              Ser dette rigtigt ud?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleConfirm} style={{
                flex: 1, ...btn("primary"),
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                border: `1px solid ${C.brand}`,
              }}>
                <Check size={15}/> Ja, søg efter den
              </button>
              <button onClick={handleManual} style={{
                flex: 1, ...btn(),
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Search size={15}/> Søg manuelt
              </button>
            </div>
          </div>
        )}

        {/* error */}
        {phase === "error" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.distance, fontSize: 14, marginBottom: 20 }}>{errorMsg}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => { setPhase("idle"); setPreview(null); }} style={btn()}>
                Prøv igen
              </button>
              <button onClick={() => onFound("", "")} style={{ ...btn("primary"), border: `1px solid ${C.brand}` }}>
                Manuel søgning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
