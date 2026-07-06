import { useEffect, useState } from "react";
import { C, TYPE_COLOR } from "../constants";

// The one recurring visual signature for BagUp: a disc's flight-path curve
// (bank out, arc, fade back) reused as a decorative motif across empty states,
// loading, and section headers — instead of a generic dashboard look.
const ARC_PATH = "M4 34 C 22 34, 30 10, 54 6 C 70 3, 82 12, 92 26";

function useReducedMotion(){
  const [reduced,setReduced]=useState(()=>
    typeof window!=="undefined"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(()=>{
    if(typeof window==="undefined"||!window.matchMedia)return;
    const mq=window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange=()=>setReduced(mq.matches);
    mq.addEventListener?.("change",onChange);
    return()=>mq.removeEventListener?.("change",onChange);
  },[]);
  return reduced;
}

// Low-opacity background ornament — purely decorative.
export function FlightArcDecoration({ color = C.brand, width = 96, height = 40, opacity = 0.14, style = {} }){
  return(
    <svg aria-hidden="true" viewBox="0 0 96 40" width={width} height={height}
      style={{ display: "block", pointerEvents: "none", ...style }}>
      <path d={ARC_PATH} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={opacity}/>
    </svg>
  );
}

// Tiny flourish placed before uppercase section labels (secHdr).
export function FlightArcFlourish({ color = C.brand }){
  return(
    <svg aria-hidden="true" viewBox="0 0 96 40" width="16" height="7"
      style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6, marginTop: -2 }}>
      <path d={ARC_PATH} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
    </svg>
  );
}

const TYPE_CYCLE = [TYPE_COLOR.Putter, TYPE_COLOR.Midrange, TYPE_COLOR.Fairway, TYPE_COLOR.Distance, TYPE_COLOR.Putter];

// Loading indicator: a dot traveling the flight-path instead of a generic spinner.
// `cycleColors` sweeps the dot through the 4 type colors — reads as "disc golf data
// loading", not a generic dashboard spinner. Falls back to a static dot when the
// user prefers reduced motion.
export function FlightArcSpinner({ color = C.brand, size = 48, cycleColors = false }){
  const reduced = useReducedMotion();
  return(
    <svg viewBox="0 0 96 40" width={size} height={size * (40/96)} role="status" aria-label="Indlæser…">
      <path d={ARC_PATH} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
      {reduced ? (
        <circle cx="54" cy="6" r="4" fill={cycleColors ? TYPE_CYCLE[0] : color} opacity="0.7"/>
      ) : (
        <circle r="4" fill={color}>
          <animateMotion dur="1.4s" repeatCount="indefinite" path={ARC_PATH}/>
          {cycleColors && (
            <animate attributeName="fill" values={TYPE_CYCLE.join(";")} dur="1.4s" repeatCount="indefinite"/>
          )}
        </circle>
      )}
    </svg>
  );
}
