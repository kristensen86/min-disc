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
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:12,
        background:C.surface,border:`1px solid ${isEditing?C.brand:showBane?C.brand+"80":C.line}`,
        borderRadius:open?"14px 14px 0 0":14}}>
        {disc.pPhoto&&(
          <button onClick={()=>setShowBane(v=>!v)} style={{
            width:56,flexShrink:0,padding:0,border:"none",background:"transparent",cursor:"pointer",borderRadius:10}}>
            <img src={disc.pPhoto} alt={disc.name}
              style={{width:56,height:56,borderRadius:10,objectFit:"cover",
                border:`1px solid ${showBane?C.brand:C.line}`,display:"block"}}/>
          </button>
        )}
        {!disc.pPhoto&&(
          <button onClick={()=>setShowBane(v=>!v)} style={{
            width:44,height:44,flexShrink:0,borderRadius:10,padding:0,cursor:"pointer",
            background:`${disc.pColor||TYPE_COLOR[disc.type]}22`,
            border:`1px solid ${showBane?(disc.pColor||TYPE_COLOR[disc.type]):(disc.pColor||TYPE_COLOR[disc.type])+"55"}`,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18,fontWeight:800,color:disc.pColor||TYPE_COLOR[disc.type],lineHeight:1}}>
              {disc.type[0]}
            </span>
          </button>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
            <span style={{width:10,height:10,borderRadius:"50%",flexShrink:0,
              background:disc.pColor||TYPE_COLOR[disc.type],
              border:disc.pColor?`1px solid ${C.line}`:"none"}}/>
            <span style={{fontWeight:600,color:C.text}}>{disc.name}</span>
            {hasOverride&&<span style={{fontSize:10,color:C.brand}}>✎</span>}
            <WearBadge wear={disc.pWear}/>
            <StabilityPill stability={disc.stability}/>
          </div>
          <div style={{color:C.muted,fontSize:13,marginBottom:disc.pWeight||disc.pPlastic?4:8}}>
            {disc.brand} · {disc.type}
          </div>
          {(disc.pWeight||disc.pPlastic)&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:disc.pNote?4:8}}>
              {disc.pWeight&&<span style={{fontSize:11,padding:"2px 7px",borderRadius:999,
                background:C.surface,border:`1px solid ${C.line}`,color:C.muted}}>{disc.pWeight}g</span>}
              {disc.pPlastic&&<span style={{fontSize:11,padding:"2px 7px",borderRadius:999,
                background:C.surface,border:`1px solid ${C.line}`,color:C.muted}}>{disc.pPlastic}</span>}
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
              padding:"1px 4px",borderRadius:999,lineHeight:1.4,pointerEvents:"none"}}>{a.badge}</span>}
          </div>
        ))}
      </div>
      {showBane&&!isEditing&&(
        <div style={{
          borderLeft:`1px solid ${C.brand}80`,
          borderRight:`1px solid ${C.brand}80`,
          borderBottom:`1px solid ${C.brand}80`,
          borderRadius:"0 0 14px 14px",
          background:C.bg,padding:"4px 8px 8px",
        }}>
          <FlightChart discs={[disc]} hand="R" height={160} showLabels={true}/>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4,fontSize:11,color:C.muted}}>
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
