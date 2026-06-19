import { useState } from "react";
import { C, TYPES, TYPE_COLOR } from "../constants";
import { emptyGenForm, splitEvenly } from "../utils";
import { btn, Empty, Segmented, NumberField } from "./ui";

export function GeneratorPanel({ownedDiscs,onSave,onCancel}){
  const[form,setForm]=useState(emptyGenForm());
  const[preview,setPreview]=useState(null);
  const patch=p=>setForm(f=>({...f,...p}));
  function applyPreset(preset){
    const presets={none:{minSpeed:1,maxSpeed:14},skov:{minSpeed:1,maxSpeed:9},
      aaben:{minSpeed:4,maxSpeed:14},blaesende:{minSpeed:1,maxSpeed:11},begynder:{minSpeed:1,maxSpeed:9}};
    patch({preset,...(presets[preset]||{})});
  }
  function generate(){
    const candidates=ownedDiscs.filter(d=>d.speed>=form.minSpeed&&d.speed<=form.maxSpeed);
    const counts=form.balanced?splitEvenly(form.total):form.counts;
    const bias=form.preset==="blaesende"?"stable":form.preset==="begynder"?"easy":"none";
    const picked=[],warnings=[];
    for(const type of TYPES){
      const need=counts[type]||0;if(need<=0)continue;
      let pool=candidates.filter(d=>d.type===type);
      if(bias==="stable")pool=[...pool].sort((a,b)=>(b.fade-b.turn)-(a.fade-a.turn));
      if(bias==="easy")pool=[...pool].sort((a,b)=>(Math.abs(a.turn)+a.fade)-(Math.abs(b.turn)+b.fade));
      if(bias!=="none"&&pool.length>3)pool=pool.slice(0,Math.ceil(pool.length*0.6));
      const available=[...pool];
      for(let i=0;i<need;i++){
        if(available.length===0){
          if(form.allowDup&&pool.length>0){picked.push(pool[Math.floor(Math.random()*pool.length)]);}
          else{warnings.push(`Kun ${i} af ${need} ${type.toLowerCase()} fundet`);break;}
          continue;
        }
        const idx=Math.floor(Math.random()*available.length);
        picked.push(available[idx]);available.splice(idx,1);
      }
    }
    setPreview({discs:picked,warnings});
  }
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14,padding:14,
      background:C.surface,border:`1px solid ${C.line}`,borderRadius:14}}>
      <div>
        <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Navn</div>
        <input value={form.name} onChange={e=>patch({name:e.target.value})}
          style={{width:"100%",padding:"10px 12px",background:C.raised,
            border:`1px solid ${C.line}`,borderRadius:9,color:C.text,fontSize:14}}/>
      </div>
      <div>
        <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Bane-type</div>
        <select value={form.preset} onChange={e=>applyPreset(e.target.value)}
          style={{width:"100%",padding:"10px 12px",background:C.raised,
            border:`1px solid ${C.line}`,borderRadius:9,color:C.text,fontSize:14}}>
          <option value="none">Ingen / generel</option>
          <option value="skov">Skov</option>
          <option value="aaben">Åben</option>
          <option value="blaesende">Blæsende</option>
          <option value="begynder">Begynder-runde</option>
        </select>
      </div>
      <div>
        <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Fordeling</div>
        <Segmented options={[["true","Balanceret"],["false","Brugerdefineret"]]}
          value={String(form.balanced)} onChange={v=>patch({balanced:v==="true"})}/>
      </div>
      {form.balanced?(
        <NumberField label="Antal discs i alt" value={form.total} min={1} max={40} onChange={v=>patch({total:v})}/>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {TYPES.map(t=>(
            <NumberField key={t} label={t} value={form.counts[t]} min={0} max={15}
              onChange={v=>patch({counts:{...form.counts,[t]:v}})}/>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:10}}>
        <NumberField label="Min. speed" value={form.minSpeed} min={1} max={15} onChange={v=>patch({minSpeed:v})}/>
        <NumberField label="Max. speed" value={form.maxSpeed} min={1} max={15} onChange={v=>patch({maxSpeed:v})}/>
      </div>
      <div>
        <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Tillad dubletter</div>
        <Segmented options={[["false","Nej"],["true","Ja"]]}
          value={String(form.allowDup)} onChange={v=>patch({allowDup:v==="true"})}/>
      </div>
      <button onClick={generate} style={btn("primary")}>🎲 Generér</button>
      {preview&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {preview.warnings.length>0&&<div style={{fontSize:12,color:C.brand}}>{preview.warnings.join(" · ")}</div>}
          {preview.discs.length===0?(
            <Empty text="Ingen discs matchede kriterierne."/>
          ):(
            <>
              <div style={{fontSize:13,color:C.muted}}>{preview.discs.length} discs valgt:</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {preview.discs.map((d,i)=>(
                  <div key={d.id+i} style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:TYPE_COLOR[d.type]}}/>
                    {d.name} <span style={{color:C.muted}}>· {d.brand}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={generate} style={btn()}>↻ Generér igen</button>
                <button onClick={()=>onSave(form.name,preview.discs)} style={btn("primary")}>Gem som bag</button>
              </div>
            </>
          )}
        </div>
      )}
      <button onClick={onCancel} style={btn("ghost")}>Annullér</button>
    </div>
  );
}
