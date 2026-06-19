import { C } from "../constants";

export function FlightBadge({disc}){
  return(
    <div style={{display:"flex",gap:4}}>
      {[["S",disc.speed],["G",disc.glide],["T",disc.turn],["F",disc.fade]].map(([k,v])=>(
        <div key={k} style={{minWidth:30,textAlign:"center",padding:"3px 0",borderRadius:7,
          background:C.raised,border:`1px solid ${C.line}`,
          fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace",fontSize:12}}>
          <span style={{color:C.muted}}>{k}</span>{" "}
          <span style={{color:C.text}}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function StabilityPill({stability}){
  if(!stability)return null;
  const map={"Very Understable":["#ff9f43","Meget understabil"],"Understable":["#f2c14e","Understabil"],
    "Stable":["#5fd486","Stabil"],"Overstable":["#5bb4ff","Overstabil"],"Very Overstable":["#c77dff","Meget overstabil"]};
  const[color,label]=map[stability]??[C.muted,stability];
  return(
    <span style={{fontSize:11,padding:"2px 7px",borderRadius:999,
      border:`1px solid ${color}30`,color,background:`${color}15`}}>{label}</span>
  );
}

export function WearBadge({wear}){
  if(!wear)return null;
  const map={ny:["#5fd486","Ny"],brugt:["#f2c14e","Brugt"],"beat-in":["#ff9f43","Beat in"]};
  const[color,label]=map[wear]??[C.muted,wear];
  return(
    <span style={{fontSize:11,padding:"2px 7px",borderRadius:999,
      border:`1px solid ${color}40`,color,background:`${color}15`}}>{label}</span>
  );
}
