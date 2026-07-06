import { C, TYPE_COLOR } from "../constants";
import { FlightArcDecoration, FlightArcFlourish } from "./FlightArc";

// Shared type scale — keeps hierarchy deliberate instead of ad-hoc per-component sizes.
export function textDisplay(color=C.brand){
  return{fontSize:38,fontWeight:700,color,lineHeight:1,letterSpacing:"-0.02em"};
}
export function textTitle(color=C.text){
  return{fontSize:19,fontWeight:600,color,letterSpacing:"-0.01em"};
}
export function textCaption(color=C.muted){
  return{fontSize:11.5,fontWeight:500,color,letterSpacing:"0.02em"};
}
// Numeric/data values (flight numbers, weights, prices, percentages) always read as
// "data" via monospace, distinct from prose — extends the treatment FlightBadge already used.
export function dataMono(size=13,color=C.text){
  return{fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace",fontSize:size,color,letterSpacing:"0.01em"};
}

export function iconBtn(color){
  return{flexShrink:0,width:40,height:40,borderRadius:12,cursor:"pointer",
    background:"transparent",border:`1px solid ${C.line}`,color,
    display:"flex",alignItems:"center",justifyContent:"center"};
}

export function btn(variant="default"){
  const base={padding:"11px 18px",borderRadius:13,cursor:"pointer",fontSize:14,fontWeight:600,
    border:`1px solid ${C.line}`,background:"transparent",color:C.text,letterSpacing:"0.01em"};
  if(variant==="primary")return{...base,border:`1px solid ${C.brand}`,background:C.raised,
    boxShadow:`0 2px 12px ${C.brand}18`};
  if(variant==="ghost")return{...base,border:"none",color:C.muted,padding:"7px 11px"};
  return base;
}

export function secHdr(type){
  return{fontSize:11,fontWeight:700,margin:"0 0 12px",letterSpacing:"0.08em",
    textTransform:"uppercase",color:TYPE_COLOR[type]};
}

// Section headers get the flight-arc flourish so the motif recurs across screens.
export function SectionHeader({type,children,as:Tag="h2"}){
  return(
    <Tag style={secHdr(type)}>
      <FlightArcFlourish color={TYPE_COLOR[type]}/>{children}
    </Tag>
  );
}

export function Empty({text,title=null,tint=null}){
  const color=tint?(TYPE_COLOR[tint]||tint):C.brand;
  return(
    <div style={{
      padding:"32px 24px",textAlign:"center",borderRadius:16,
      border:`1px solid ${tint?color+"30":C.line}`,
      background:tint?`${color}08`:"transparent",
    }}>
      <FlightArcDecoration color={color} width={72} height={30} opacity={tint?0.4:0.22}
        style={{margin:"0 auto 14px"}}/>
      {title&&<div style={{...textTitle(),fontSize:16,marginBottom:6}}>{title}</div>}
      <div style={{color:C.muted,fontSize:13.5,lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>{text}</div>
    </div>
  );
}

export function Segmented({options,value,onChange}){
  return(
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {options.map(([key,label])=>(
        <button key={key} onClick={()=>onChange(key)} style={{
          padding:"8px 14px",borderRadius:11,cursor:"pointer",fontSize:12.5,fontWeight:600,
          letterSpacing:"0.01em",
          border:`1px solid ${value===key?C.brand:C.line}`,
          background:value===key?C.raised:"transparent",
          color:value===key?C.text:C.muted,
          boxShadow:value===key?`0 2px 8px ${C.brand}18`:"none"}}>{label}</button>
      ))}
    </div>
  );
}

export function NumberField({label,value,onChange,min=0,max=99}){
  return(
    <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,color:C.muted,
      letterSpacing:"0.03em"}}>
      {label}
      <input type="number" inputMode="numeric" value={value} min={min} max={max}
        onChange={e=>onChange(Math.max(min,Math.min(max,Number(e.target.value)||0)))}
        style={{padding:"9px 11px",background:C.raised,border:`1px solid ${C.line}`,
          borderRadius:10,color:C.text,fontSize:14}}/>
    </label>
  );
}

const DEFAULT_FLIGHT_FIELDS=[["Speed","speed",1,15,1],["Glide","glide",1,7,1],["Turn","turn",-5,1,0.5],["Fade","fade",0,5,0.5]];

// The 4 flight numbers are a disc's identity, not just another form field —
// render them as a compact "spec sheet" quad instead of plain bordered inputs.
// Pass `reference` (the catalog disc) to highlight edited values against std.
export function FlightNumberQuad({values,onChange,reference=null,fields=DEFAULT_FLIGHT_FIELDS}){
  return(
    <div style={{
      display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",
      borderRadius:12,overflow:"hidden",border:`1px solid ${C.line}`,background:C.bg,
    }}>
      {fields.map(([label,key,min,max,step],i)=>{
        const changed=reference&&values[key]!==reference[key];
        return(
          <label key={key} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            padding:"10px 4px",
            background:changed?`${C.brand}0a`:"transparent",
            borderRight:i<fields.length-1?`1px solid ${C.line}`:"none",
          }}>
            <span style={{fontSize:9,color:C.muted,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}</span>
            <input type="number" inputMode="decimal" value={values[key]} min={min} max={max} step={step}
              onChange={e=>onChange(key,e.target.value===""?"":Number(e.target.value))}
              style={{
                ...dataMono(19,changed?C.brand:C.text),fontWeight:700,
                textAlign:"center",background:"transparent",border:"none",outline:"none",width:"100%",padding:0,
              }}/>
            {reference&&<span style={{fontSize:9,color:C.line}}>std {reference[key]}</span>}
          </label>
        );
      })}
    </div>
  );
}

export function miniBtn(color){
  return{padding:"8px 14px",borderRadius:10,cursor:"pointer",
    background:"transparent",border:`1px solid ${color}`,color,fontSize:12,fontWeight:600,
    letterSpacing:"0.02em"};
}
