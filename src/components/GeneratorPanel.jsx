import { useState } from "react";
import { C, TYPES, TYPE_COLOR } from "../constants";
import { emptyGenForm, splitEvenly } from "../utils";
import { btn, Empty, Segmented, NumberField } from "./ui";

export function GeneratorPanel({ownedDiscs,onSave,onCancel}){
  const[form,setForm]=useState(emptyGenForm());
  const[preview,setPreview]=useState(null);
  const patch=p=>setForm(f=>({...f,...p}));

  const availableColors=[...new Set(ownedDiscs.filter(d=>d.pColor).map(d=>d.pColor))];
  const availableBrands=[...new Set(ownedDiscs.map(d=>d.brand))].sort();

  function applyPreset(preset){
    const presets={none:{minSpeed:1,maxSpeed:14},skov:{minSpeed:1,maxSpeed:9},
      aaben:{minSpeed:4,maxSpeed:14},blaesende:{minSpeed:1,maxSpeed:11},begynder:{minSpeed:1,maxSpeed:9}};
    patch({preset,...(presets[preset]||{})});
  }

  function toggleColor(color){
    patch({colors:form.colors.includes(color)?form.colors.filter(c=>c!==color):[...form.colors,color]});
  }
  function toggleBrand(brand){
    patch({brands:form.brands.includes(brand)?form.brands.filter(b=>b!==brand):[...form.brands,brand]});
  }

  function generate(){
    const candidates=ownedDiscs.filter(d=>{
      if(d.speed<form.minSpeed||d.speed>form.maxSpeed)return false;
      if(form.colors.length>0&&!form.colors.includes(d.pColor))return false;
      if(form.maxWeight!=null&&d.pWeight&&Number(d.pWeight)>form.maxWeight)return false;
      if(form.brands.length>0&&!form.brands.includes(d.brand))return false;
      return true;
    });
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

  const sectionLabel={fontSize:12,color:C.muted,marginBottom:6,letterSpacing:"0.03em"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:16,
      background:C.surface,border:`1px solid ${C.line}`,borderRadius:16}}>
      <div>
        <div style={sectionLabel}>Navn</div>
        <input value={form.name} onChange={e=>patch({name:e.target.value})}
          style={{width:"100%",padding:"11px 13px",background:C.raised,
            border:`1px solid ${C.line}`,borderRadius:11,color:C.text,fontSize:14}}/>
      </div>
      <div>
        <div style={sectionLabel}>Bane-type</div>
        <select value={form.preset} onChange={e=>applyPreset(e.target.value)}
          style={{width:"100%",padding:"11px 13px",background:C.raised,
            border:`1px solid ${C.line}`,borderRadius:11,color:C.text,fontSize:14}}>
          <option value="none">Ingen / generel</option>
          <option value="skov">Skov</option>
          <option value="aaben">Åben</option>
          <option value="blaesende">Blæsende</option>
          <option value="begynder">Begynder-runde</option>
        </select>
      </div>
      <div>
        <div style={sectionLabel}>Fordeling</div>
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

      {availableColors.length>0&&(
        <div>
          <div style={sectionLabel}>Farve-filter</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {availableColors.map(color=>(
              <button key={color} onClick={()=>toggleColor(color)} style={{
                width:28,height:28,borderRadius:"50%",background:color,cursor:"pointer",padding:0,flexShrink:0,
                border:form.colors.includes(color)?`2.5px solid ${C.text}`:`1.5px solid ${C.line}`,
                boxShadow:form.colors.includes(color)?`0 0 10px ${color}80`:undefined}}/>
            ))}
            {form.colors.length>0&&(
              <button onClick={()=>patch({colors:[]})} style={{
                fontSize:11,color:C.muted,background:"transparent",border:`1px dashed ${C.line}`,
                borderRadius:999,padding:"4px 9px",cursor:"pointer"}}>Nulstil</button>
            )}
          </div>
          {form.colors.length>0&&(
            <div style={{fontSize:11,color:C.muted,marginTop:5,letterSpacing:"0.02em"}}>
              {form.colors.length} farve{form.colors.length>1?"r":""} valgt
            </div>
          )}
        </div>
      )}

      <div>
        <div style={sectionLabel}>Maks. vægt (g)</div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={()=>patch({maxWeight:form.maxWeight!=null?null:175})} style={{
            fontSize:12,padding:"6px 13px",borderRadius:999,cursor:"pointer",fontWeight:500,letterSpacing:"0.02em",
            border:`1px solid ${form.maxWeight!=null?C.brand:C.line}`,
            background:form.maxWeight!=null?`${C.brand}15`:"transparent",
            color:form.maxWeight!=null?C.brand:C.muted}}>
            {form.maxWeight!=null?"Aktiv":"Ingen grænse"}
          </button>
          {form.maxWeight!=null&&(
            <input type="number" value={form.maxWeight} min={100} max={200}
              onChange={e=>patch({maxWeight:Number(e.target.value)||175})}
              style={{width:72,padding:"7px 9px",borderRadius:9,background:C.raised,
                border:`1px solid ${C.line}`,color:C.text,fontSize:13,textAlign:"center"}}/>
          )}
        </div>
      </div>

      {availableBrands.length>1&&(
        <div>
          <div style={sectionLabel}>Mærke</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {availableBrands.map(brand=>(
              <button key={brand} onClick={()=>toggleBrand(brand)} style={{
                padding:"6px 12px",borderRadius:999,cursor:"pointer",fontSize:11,fontWeight:500,letterSpacing:"0.01em",
                border:`1px solid ${form.brands.includes(brand)?C.brand:C.line}`,
                background:form.brands.includes(brand)?`${C.brand}15`:"transparent",
                color:form.brands.includes(brand)?C.brand:C.muted}}>
                {brand}
              </button>
            ))}
            {form.brands.length>0&&(
              <button onClick={()=>patch({brands:[]})} style={{
                fontSize:11,color:C.muted,background:"transparent",border:`1px dashed ${C.line}`,
                borderRadius:999,padding:"6px 12px",cursor:"pointer"}}>Nulstil</button>
            )}
          </div>
        </div>
      )}

      <div>
        <div style={sectionLabel}>Tillad dubletter</div>
        <Segmented options={[["false","Nej"],["true","Ja"]]}
          value={String(form.allowDup)} onChange={v=>patch({allowDup:v==="true"})}/>
      </div>
      <button onClick={generate} style={btn("primary")}>🎲 Generér</button>
      {preview&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {preview.warnings.length>0&&<div style={{fontSize:12,color:C.brand,letterSpacing:"0.02em"}}>{preview.warnings.join(" · ")}</div>}
          {preview.discs.length===0?(
            <Empty text="Ingen discs matchede kriterierne."/>
          ):(
            <>
              <div style={{fontSize:13,color:C.muted,letterSpacing:"0.01em"}}>{preview.discs.length} discs valgt:</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {preview.discs.map((d,i)=>(
                  <div key={d.id+i} style={{display:"flex",alignItems:"center",gap:9,fontSize:13}}>
                    <span style={{width:9,height:9,borderRadius:"50%",background:TYPE_COLOR[d.type],flexShrink:0}}/>
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
