import { C, TYPE_COLOR } from "../constants";

export function iconBtn(color){
  return{flexShrink:0,width:38,height:38,borderRadius:10,cursor:"pointer",
    background:"transparent",border:`1px solid ${C.line}`,color,
    display:"flex",alignItems:"center",justifyContent:"center"};
}

export function btn(variant="default"){
  const base={padding:"10px 16px",borderRadius:11,cursor:"pointer",fontSize:14,fontWeight:600,
    border:`1px solid ${C.line}`,background:"transparent",color:C.text};
  if(variant==="primary")return{...base,border:`1px solid ${C.brand}`,background:C.raised};
  if(variant==="ghost")return{...base,border:"none",color:C.muted,padding:"6px 10px"};
  return base;
}

export function secHdr(type){
  return{fontSize:13,fontWeight:700,margin:"0 0 10px",letterSpacing:"0.05em",textTransform:"uppercase",color:TYPE_COLOR[type]};
}

export function Empty({text}){
  return(
    <div style={{padding:"32px 20px",textAlign:"center",color:C.muted,fontSize:14,
      border:`1px dashed ${C.line}`,borderRadius:14,lineHeight:1.5}}>{text}</div>
  );
}

export function Segmented({options,value,onChange}){
  return(
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {options.map(([key,label])=>(
        <button key={key} onClick={()=>onChange(key)} style={{
          padding:"7px 12px",borderRadius:9,cursor:"pointer",fontSize:12.5,fontWeight:600,
          border:`1px solid ${value===key?C.brand:C.line}`,
          background:value===key?C.raised:"transparent",
          color:value===key?C.text:C.muted}}>{label}</button>
      ))}
    </div>
  );
}

export function NumberField({label,value,onChange,min=0,max=99}){
  return(
    <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:12,color:C.muted}}>
      {label}
      <input type="number" inputMode="numeric" value={value} min={min} max={max}
        onChange={e=>onChange(Math.max(min,Math.min(max,Number(e.target.value)||0)))}
        style={{padding:"8px 10px",background:C.raised,border:`1px solid ${C.line}`,
          borderRadius:9,color:C.text,fontSize:14}}/>
    </label>
  );
}

export function miniBtn(color){
  return{padding:"7px 12px",borderRadius:9,cursor:"pointer",
    background:"transparent",border:`1px solid ${color}`,color,fontSize:12,fontWeight:600};
}
