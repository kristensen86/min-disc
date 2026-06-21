import { C, TYPE_COLOR } from "../constants";

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

export function Empty({text}){
  return(
    <div style={{padding:"36px 24px",textAlign:"center",color:C.muted,fontSize:14,
      border:`1px dashed ${C.line}`,borderRadius:16,lineHeight:1.6}}>{text}</div>
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

export function miniBtn(color){
  return{padding:"8px 14px",borderRadius:10,cursor:"pointer",
    background:"transparent",border:`1px solid ${color}`,color,fontSize:12,fontWeight:600,
    letterSpacing:"0.02em"};
}
