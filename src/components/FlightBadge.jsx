import { C, typeSignalStyle } from "../constants";

export function FlightBadge({disc}){
  const sig=typeSignalStyle(disc.type,5);
  return(
    <div style={{display:"flex",gap:4}}>
      {[["S",disc.speed],["G",disc.glide],["T",disc.turn],["F",disc.fade]].map(([k,v])=>(
        <div key={k} style={{minWidth:32,textAlign:"center",padding:"4px 2px",borderRadius:8,
          background:sig.background==="transparent"?C.bg:sig.background,
          border:sig.border, boxShadow:sig.boxShadow,
          fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace",fontSize:12,
          letterSpacing:"0.02em"}}>
          <span style={{color:C.muted}}>{k}</span>{" "}
          <span style={{color:C.text}}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function StabilityPill({stability}){
  if(!stability)return null;
  const map={
    "Very Understable":["#fca5a5","Meget understabil"],
    "Understable":["#fdba74","Understabil"],
    "Stable":["#0cb9a7","Stabil"],
    "Overstable":["#93c5fd","Overstabil"],
    "Very Overstable":["#c084fc","Meget overstabil"]
  };
  const[color,label]=map[stability]??[C.muted,stability];
  return(
    <span style={{fontSize:11,padding:"3px 9px",borderRadius:999,letterSpacing:"0.02em",
      border:`1px solid ${color}30`,color,background:`${color}12`}}>{label}</span>
  );
}

export function WearBadge({wear}){
  if(!wear)return null;
  const map={ny:["#86efac","Ny"],brugt:["#fdba74","Brugt"],"beat-in":["#fca5a5","Beat in"]};
  const[color,label]=map[wear]??[C.muted,wear];
  return(
    <span style={{fontSize:11,padding:"3px 9px",borderRadius:999,letterSpacing:"0.02em",
      border:`1px solid ${color}40`,color,background:`${color}12`}}>{label}</span>
  );
}
