import { useState } from "react";
import { C, TYPE_COLOR } from "../constants";
import { FlightBadge, StabilityPill, WearBadge } from "./FlightBadge";
import { iconBtn } from "./ui";
import { FlightChart } from "./FlightChart";
import { FlightEditor } from "./FlightEditor";

export function DiscCard({disc,actions=[],isEditing=false,onToggleEdit=null,override=null,onSave=null,onClear=null}){
  const hasOverride=!!override;
  const[showBane,setShowBane]=useState(false);
  const open=isEditing||showBane;
  const glowColor=disc.pColor||TYPE_COLOR[disc.type];
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:14,
        background:C.surface,
        border:`1px solid ${isEditing?C.brand:showBane?C.brand+"60":C.line}`,
        boxShadow:showBane||isEditing
          ?`0 0 16px ${C.brand}18`
          :`0 0 12px ${glowColor}08`,
        borderRadius:open?"16px 16px 0 0":16}}>
        {disc.pPhoto&&(
          <button onClick={()=>setShowBane(v=>!v)} style={{
            width:56,flexShrink:0,padding:0,border:"none",background:"transparent",cursor:"pointer",borderRadius:12}}>
            <img src={disc.pPhoto} alt={disc.name}
              style={{width:56,height:56,borderRadius:12,objectFit:"cover",
                border:`1px solid ${showBane?C.brand:C.line}`,display:"block"}}/>
          </button>
        )}
        {!disc.pPhoto&&(
          <button onClick={()=>setShowBane(v=>!v)} style={{
            width:46,height:46,flexShrink:0,borderRadius:12,padding:0,cursor:"pointer",
            background:`${glowColor}18`,
            border:`1px solid ${showBane?glowColor:glowColor+"44"}`,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18,fontWeight:800,color:glowColor,lineHeight:1}}>
              {disc.type[0]}
            </span>
          </button>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
            <span style={{width:10,height:10,borderRadius:"50%",flexShrink:0,
              background:glowColor,
              boxShadow:`0 0 6px ${glowColor}80`,
              border:disc.pColor?`1px solid ${C.line}`:"none"}}/>
            <span style={{fontWeight:600,color:C.text}}>{disc.name}</span>
            {hasOverride&&<span style={{fontSize:10,color:C.brand}}>✎</span>}
            <WearBadge wear={disc.pWear}/>
            <StabilityPill stability={disc.stability}/>
          </div>
          <div style={{color:C.muted,fontSize:13,marginBottom:disc.pWeight||disc.pPlastic?5:8,
            letterSpacing:"0.01em"}}>
            {disc.brand} · {disc.type}
          </div>
          {(disc.pWeight||disc.pPlastic)&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:disc.pNote?5:8}}>
              {disc.pWeight&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:999,
                background:C.raised,border:`1px solid ${C.line}`,color:C.muted,
                letterSpacing:"0.02em"}}>{disc.pWeight}g</span>}
              {disc.pPlastic&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:999,
                background:C.raised,border:`1px solid ${C.line}`,color:C.muted,
                letterSpacing:"0.02em"}}>{disc.pPlastic}</span>}
            </div>
          )}
          {disc.pNote&&(
            <div style={{fontSize:11,color:C.muted,fontStyle:"italic",marginBottom:8,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{disc.pNote}</div>
          )}
          <FlightBadge disc={disc}/>
        </div>
        {onToggleEdit&&(
          <button onClick={onToggleEdit} aria-label="Rediger"
            style={{...iconBtn(isEditing?C.brand:C.muted),fontSize:16}}>✎</button>
        )}
        {actions.map((a,i)=>(
          <div key={i} style={{position:"relative",display:"inline-flex",flexShrink:0}}>
            <button onClick={a.onClick} aria-label={a.label} style={iconBtn(a.color||C.muted)}>
              <a.icon size={16} {...(a.iconProps||{})}/>
            </button>
            {a.badge!=null&&<span style={{position:"absolute",top:-5,right:-5,
              background:C.brand,color:C.bg,fontSize:9,fontWeight:700,
              padding:"2px 5px",borderRadius:999,lineHeight:1.4,pointerEvents:"none"}}>{a.badge}</span>}
          </div>
        ))}
      </div>
      {showBane&&!isEditing&&(
        <div style={{
          borderLeft:`1px solid ${C.brand}50`,
          borderRight:`1px solid ${C.brand}50`,
          borderBottom:`1px solid ${C.brand}50`,
          borderRadius:"0 0 16px 16px",
          background:C.bg,padding:"6px 10px 10px",
        }}>
          <FlightChart discs={[disc]} hand="R" height={160} showLabels={true}/>
          <div style={{display:"flex",justifyContent:"center",gap:18,marginTop:6,
            fontSize:11,color:C.muted,letterSpacing:"0.04em"}}>
            <span>S {disc.speed}</span>
            <span>G {disc.glide}</span>
            <span>T {disc.turn}</span>
            <span>F {disc.fade}</span>
          </div>
        </div>
      )}
      {isEditing&&(
        <FlightEditor disc={disc} override={override}
          onSave={onSave} onClear={onClear} onClose={onToggleEdit}/>
      )}
    </div>
  );
}
