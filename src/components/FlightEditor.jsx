import { useState } from "react";
import { C, WEAR, DISC_COLORS } from "../constants";
import { resizeImage } from "../utils";
import { miniBtn } from "./ui";

export function FlightEditor({disc,override,onSave,onClear,onClose}){
  const cur={...disc,...(override||{})};
  const[vals,setVals]=useState({
    speed:cur.speed,glide:cur.glide,turn:cur.turn,fade:cur.fade,
    pColor:cur.pColor||null,pWeight:cur.pWeight||"",pPlastic:cur.pPlastic||"",
    pNote:cur.pNote||"",pWear:cur.pWear||null,pPhoto:cur.pPhoto||null,
  });
  const set=k=>v=>setVals(p=>({...p,[k]:v}));
  async function handlePhoto(e){
    const file=e.target.files?.[0];
    if(file){const data=await resizeImage(file);set("pPhoto")(data);}
  }
  return(
    <div style={{padding:"12px 14px",background:C.raised,
      border:`1px solid ${C.brand}40`,borderRadius:"0 0 14px 14px",marginTop:-2}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:600,letterSpacing:"0.06em",
        textTransform:"uppercase",marginBottom:8}}>Flight-tal</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[["Speed","speed",1,15,1],["Glide","glide",1,7,1],["Turn","turn",-5,1,0.5],["Fade","fade",0,5,0.5]].map(([label,key,min,max,step])=>(
          <label key={key} style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,color:C.muted}}>
            {label}
            <input type="number" inputMode="decimal" value={vals[key]} min={min} max={max} step={step}
              onChange={e=>set(key)(Number(e.target.value))}
              style={{padding:"6px 4px",textAlign:"center",borderRadius:8,background:C.surface,
                color:C.text,fontSize:13,width:"100%",
                border:`1px solid ${vals[key]!==disc[key]?C.brand:C.line}`}}/>
            <span style={{fontSize:10,color:C.line,textAlign:"center"}}>std: {disc[key]}</span>
          </label>
        ))}
      </div>
      <div style={{borderTop:`1px solid ${C.line}`,paddingTop:12,marginBottom:10}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:600,letterSpacing:"0.06em",
          textTransform:"uppercase",marginBottom:10}}>Min disc</div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Foto</div>
          {vals.pPhoto?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <img src={vals.pPhoto} alt="disc" style={{width:56,height:56,borderRadius:10,objectFit:"cover",border:`1px solid ${C.line}`}}/>
              <button onClick={()=>set("pPhoto")(null)} style={miniBtn(C.distance)}>Fjern</button>
            </div>
          ):(
            <label style={{cursor:"pointer"}}>
              <div style={{...miniBtn(C.muted),display:"inline-flex",alignItems:"center",gap:6}}>📷 Upload foto</div>
              <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
            </label>
          )}
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Slid-status</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {WEAR.map(([val,label,color])=>(
              <button key={val} onClick={()=>set("pWear")(vals.pWear===val?null:val)} style={{
                padding:"6px 12px",borderRadius:999,cursor:"pointer",fontSize:12,fontWeight:500,
                border:`1px solid ${vals.pWear===val?color:C.line}`,
                background:vals.pWear===val?`${color}20`:"transparent",
                color:vals.pWear===val?color:C.muted}}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Farve</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {DISC_COLORS.map(c=>(
              <button key={c} onClick={()=>set("pColor")(c)} style={{
                width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",padding:0,flexShrink:0,
                border:vals.pColor===c?`2.5px solid ${C.text}`:`1px solid ${C.line}`}}/>
            ))}
            {vals.pColor&&(
              <button onClick={()=>set("pColor")(null)} style={{
                width:26,height:26,borderRadius:"50%",background:"transparent",
                cursor:"pointer",border:`1px dashed ${C.line}`,fontSize:14,color:C.muted,padding:0}}>✕</button>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,color:C.muted,flex:"0 0 80px"}}>
            Vægt (g)
            <input type="number" inputMode="numeric" value={vals.pWeight} min={100} max={200}
              onChange={e=>set("pWeight")(e.target.value)} placeholder="175"
              style={{padding:"7px 8px",borderRadius:8,background:C.surface,
                border:`1px solid ${C.line}`,color:C.text,fontSize:13,width:"100%"}}/>
          </label>
          <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,color:C.muted,flex:1}}>
            Plast
            <input type="text" value={vals.pPlastic}
              onChange={e=>set("pPlastic")(e.target.value)} placeholder="f.eks. Star, Z Line…"
              style={{padding:"7px 8px",borderRadius:8,background:C.surface,
                border:`1px solid ${C.line}`,color:C.text,fontSize:13,width:"100%"}}/>
          </label>
        </div>
        <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,color:C.muted}}>
          Note
          <input type="text" value={vals.pNote}
            onChange={e=>set("pNote")(e.target.value)} placeholder="f.eks. Beat in, skovbag, gave fra…"
            style={{padding:"7px 8px",borderRadius:8,background:C.surface,
              border:`1px solid ${C.line}`,color:C.text,fontSize:13,width:"100%"}}/>
        </label>
      </div>
      <div style={{display:"flex",gap:8,marginTop:4}}>
        <button onClick={()=>onSave(vals)} style={miniBtn(C.brand)}>Gem</button>
        {override&&<button onClick={onClear} style={miniBtn(C.distance)}>Nulstil</button>}
        <button onClick={onClose} style={miniBtn(C.muted)}>Luk</button>
      </div>
    </div>
  );
}
