import { useState, useEffect, useMemo } from "react";
import { Search, Plus, X, Trash2, Disc3, AlertCircle, Loader } from "lucide-react";

const C = {
  bg:"#0f1714",surface:"#18241f",raised:"#1f3029",line:"#2c4036",
  text:"#e8efe9",muted:"#8aa597",brand:"#f2c14e",
  putter:"#5bb4ff",midrange:"#5fd486",fairway:"#f2b13c",distance:"#ff6b6b",
};
const TYPE_COLOR={Putter:C.putter,Midrange:C.midrange,Fairway:C.fairway,Distance:C.distance};
const TRACE=["#f2c14e","#5bb4ff","#5fd486","#ff6b6b","#c77dff","#ff9f43","#4dd4c0","#ff6fb5"];
const TYPES=["Putter","Midrange","Fairway","Distance"];
const DISC_COLORS=["#ff4757","#ff6348","#ffa502","#eccc68","#2ed573","#1e90ff","#a29bfe","#fd79a8","#ffffff","#b2bec3","#636e72","#2d3436"];

function typeFromSpeed(s){if(s<=3)return"Putter";if(s<=5)return"Midrange";if(s<=8)return"Fairway";return"Distance";}
const RAW=[
  ["innova-aviar","Innova","Aviar",2,3,0,1],["discraft-luna","Discraft","Luna",3,3,0,3],
  ["dd-judge","Dynamic Discs","Judge",2,4,0,1],["discraft-zone","Discraft","Zone",4,3,0,3],
  ["innova-roc3","Innova","Roc3",5,4,0,3],["discraft-buzzz","Discraft","Buzzz",5,4,-1,1],
  ["innova-mako3","Innova","Mako3",5,5,0,0],["dd-emac-truth","Dynamic Discs","EMAC Truth",5,5,-1,1],
  ["mvp-tesla","MVP","Tesla",8,5,-1,2],["innova-leopard3","Innova","Leopard3",7,5,-2,1],
  ["innova-teebird","Innova","Teebird",7,5,0,2],["latitude-river","Latitude 64","River",7,7,-1,1],
  ["discmania-fd","Discmania","FD",7,6,-1,1],["dd-escape","Dynamic Discs","Escape",9,5,-1,2],
  ["discraft-undertaker","Discraft","Undertaker",9,5,-1,2],["innova-firebird","Innova","Firebird",9,3,0,4],
  ["innova-wraith","Innova","Wraith",11,5,-1,3],["innova-destroyer","Innova","Destroyer",12,5,-1,3],
  ["discraft-nuke","Discraft","Nuke",13,5,-1,3],["innova-tern","Innova","Tern",12,6,-3,2],
  ["innova-mamba","Innova","Mamba",11,6,-5,1],["latitude-diamond","Latitude 64","Diamond",8,6,-3,1],
];
const FALLBACK=RAW.map(([id,brand,name,speed,glide,turn,fade])=>({
  id,brand,name,speed,glide,turn,fade,type:typeFromSpeed(speed),category:"",stability:"",pic:null,link:null,
}));

function resolveDisc(disc,overrides){
  const ov=overrides[disc.id];
  return ov?{...disc,...ov}:disc;
}

function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function emptyGenForm(){
  return{name:"Tilfældig bag",preset:"none",balanced:true,total:8,
    counts:{Putter:2,Midrange:2,Fairway:2,Distance:2},minSpeed:1,maxSpeed:14,allowDup:false};
}
function splitEvenly(total){
  const base=Math.floor(total/4),rem=total%4,counts={};
  TYPES.forEach((t,i)=>{counts[t]=base+(i<rem?1:0);});
  return counts;
}

function computePath(disc,hand,geom){
  const{W,H,padX,padTop,padBottom}=geom;const{speed,glide,turn,fade}=disc;
  const cx=W/2,usableH=H-padTop-padBottom,halfW=(W-padX*2)/2;
  const reach=Math.max(0.5,Math.min(1,(speed*0.5+glide)/16));
  const xScale=halfW/0.34;
  return Array.from({length:65},(_,i)=>{
    const t=i/64;
    const turnPhase=Math.sin(Math.PI*Math.min(t/0.7,1));
    const fadeRamp=Math.pow(Math.max(0,(t-0.45)/0.55),1.8);
    let x=-turn*0.05*turnPhase-fade*0.07*fadeRamp;
    if(hand==="L")x=-x;
    return[cx+Math.max(-halfW,Math.min(halfW,x*xScale)),padTop+usableH-t*reach*usableH];
  });
}
const pathStr=pts=>pts.map(([x,y],i)=>`${i===0?"M":"L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

function FlightChart({discs,hand,height=320,showLabels=true}){
  const W=280,H=height,geom={W,H,padX:28,padTop:18,padBottom:26},cx=W/2;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
      <rect x="0" y="0" width={W} height={H} rx="14" fill={C.surface} stroke={C.line}/>
      <line x1={cx} y1={geom.padTop} x2={cx} y2={H-geom.padBottom} stroke={C.line} strokeWidth="1" strokeDasharray="3 5"/>
      {discs.map((d,i)=>{
        const color=TRACE[i%TRACE.length],pts=computePath(d,hand,geom),end=pts[pts.length-1];
        return(
          <g key={d.id}>
            <path d={pathStr(pts)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
            <circle cx={end[0]} cy={end[1]} r="4.5" fill={color} stroke={C.bg} strokeWidth="1.5"/>
          </g>
        );
      })}
      <circle cx={cx} cy={H-geom.padBottom} r="3.5" fill={C.muted}/>
      {showLabels&&<text x={cx} y={H-9} fill={C.muted} fontSize="9" textAnchor="middle" style={{letterSpacing:"0.08em"}}>UDKAST</text>}
    </svg>
  );
}

function FlightMatrix({discs,selectedId,onSelect}){
  const W=300,H=460,padL=28,padR=8,padT=34,padB=44;
  const stabMin=-5,stabMax=5,speedMin=1,speedMax=14;
  const plotW=W-padL-padR,plotH=H-padT-padB;
  const getStab=d=>+(d.fade+d.turn).toFixed(1);
  const mapX=s=>padL+(stabMax-s)/(stabMax-stabMin)*plotW;
  const mapY=s=>padT+(speedMax-s)/(speedMax-speedMin)*plotH;
  const stabTicks=[5,4,3,2,1,0,-1,-2,-3,-4,-5];
  const speedTicks=[1,2,3,4,5,6,7,8,9,10,11,12,13,14];
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
      <rect x="0" y="0" width={W} height={H} rx="12" fill={C.surface} stroke={C.line}/>
      {stabTicks.map(s=>(
        <line key={"v"+s} x1={mapX(s)} x2={mapX(s)} y1={padT} y2={H-padB}
          stroke={s===0?C.brand:C.line} strokeWidth={s===0?"1":"0.5"}
          strokeDasharray={s===0?"4 3":undefined} opacity={s===0?0.45:0.18}/>
      ))}
      {speedTicks.map(s=>(
        <line key={"h"+s} x1={padL} x2={W-padR} y1={mapY(s)} y2={mapY(s)}
          stroke={C.line} strokeWidth="0.5" opacity="0.18"/>
      ))}
      {stabTicks.map(s=>(
        <text key={"x"+s} x={mapX(s)} y={H-padB+13}
          fill={s===0?C.muted:"#3d5249"} fontSize="8" textAnchor="middle">{s}</text>
      ))}
      {speedTicks.filter(s=>s%2===0||s===1).map(s=>(
        <text key={"y"+s} x={padL-4} y={mapY(s)+3} fill={C.muted} fontSize="8" textAnchor="end">{s}</text>
      ))}
      <text x={W/2} y={13} fill={C.muted} fontSize="9" textAnchor="middle" style={{letterSpacing:"0.05em"}}>Stability (Turn + Fade)</text>
      <text x={padL} y={padT-7} fill={C.muted} fontSize="7">← Overstabil</text>
      <text x={W-padR} y={padT-7} fill={C.muted} fontSize="7" textAnchor="end">Understabil →</text>
      <text x={padL-4} y={padT-7} fill={C.muted} fontSize="7" textAnchor="end">S</text>
      {discs.map(d=>{
        const sx=getStab(d);
        const x=mapX(Math.max(stabMin,Math.min(stabMax,sx)));
        const y=mapY(Math.max(speedMin,Math.min(speedMax,d.speed)));
        const isSel=d.id===selectedId;
        const color=d.pColor||TYPE_COLOR[d.type];
        return(
          <g key={d.id} style={{cursor:"pointer"}} onClick={()=>onSelect(d.id===selectedId?null:d.id)}>
            {isSel&&<circle cx={x} cy={y} r="11" fill="none" stroke={C.text} strokeWidth="1.5" opacity="0.5"/>}
            <circle cx={x} cy={y} r={isSel?8:6} fill={color} fillOpacity={isSel?1:0.88} stroke={C.bg} strokeWidth="1.2"/>
            <text x={x} y={y+(isSel?22:19)} fill={isSel?C.text:C.muted} fontSize={isSel?8:7} textAnchor="middle">{d.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function FlightBadge({disc}){
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

function StabilityPill({stability}){
  if(!stability)return null;
  const map={"Very Understable":["#ff9f43","Meget understabil"],"Understable":["#f2c14e","Understabil"],
    "Stable":["#5fd486","Stabil"],"Overstable":["#5bb4ff","Overstabil"],"Very Overstable":["#c77dff","Meget overstabil"]};
  const[color,label]=map[stability]??[C.muted,stability];
  return(
    <span style={{fontSize:11,padding:"2px 7px",borderRadius:999,
      border:`1px solid ${color}30`,color,background:`${color}15`}}>{label}</span>
  );
}

function miniBtn(color){
  return{padding:"7px 12px",borderRadius:9,cursor:"pointer",
    background:"transparent",border:`1px solid ${color}`,color,fontSize:12,fontWeight:600};
}

function FlightEditor({disc,override,onSave,onClear,onClose}){
  const cur={...disc,...(override||{})};
  const[vals,setVals]=useState({
    speed:cur.speed,glide:cur.glide,turn:cur.turn,fade:cur.fade,
    pColor:cur.pColor||null,pWeight:cur.pWeight||"",pPlastic:cur.pPlastic||"",pNote:cur.pNote||"",
  });
  const set=k=>v=>setVals(prev=>({...prev,[k]:v}));
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
              onChange={e=>set("pWeight")(e.target.value)}
              placeholder="175"
              style={{padding:"7px 8px",borderRadius:8,background:C.surface,
                border:`1px solid ${C.line}`,color:C.text,fontSize:13,width:"100%"}}/>
          </label>
          <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,color:C.muted,flex:1}}>
            Plast
            <input type="text" value={vals.pPlastic}
              onChange={e=>set("pPlastic")(e.target.value)}
              placeholder="f.eks. Star, Z Line…"
              style={{padding:"7px 8px",borderRadius:8,background:C.surface,
                border:`1px solid ${C.line}`,color:C.text,fontSize:13,width:"100%"}}/>
          </label>
        </div>

        <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,color:C.muted}}>
          Note
          <input type="text" value={vals.pNote}
            onChange={e=>set("pNote")(e.target.value)}
            placeholder="f.eks. Beat in, skovbag, gave fra…"
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

function DiscCard({disc,actions=[],isEditing=false,onToggleEdit=null,override=null,onSave=null,onClear=null}){
  const hasOverride=!!override;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:12,
        background:C.surface,border:`1px solid ${isEditing?C.brand:C.line}`,
        borderRadius:isEditing?"14px 14px 0 0":14}}>
        <div style={{width:56,flexShrink:0}}>
          <FlightChart discs={[disc]} hand="R" height={70} showLabels={false}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
            <span style={{width:10,height:10,borderRadius:"50%",flexShrink:0,
              background:disc.pColor||TYPE_COLOR[disc.type],
              border:disc.pColor?`1px solid ${C.line}`:"none"}}/>
            <span style={{fontWeight:600,color:C.text}}>{disc.name}</span>
            {hasOverride&&<span style={{fontSize:10,color:C.brand}}>✎</span>}
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
          <button key={i} onClick={a.onClick} aria-label={a.label} style={iconBtn(a.color||C.muted)}>
            <a.icon size={16}/>
          </button>
        ))}
      </div>
      {isEditing&&(
        <FlightEditor disc={disc} override={override}
          onSave={onSave} onClear={onClear} onClose={onToggleEdit}/>
      )}
    </div>
  );
}

function iconBtn(color){
  return{flexShrink:0,width:38,height:38,borderRadius:10,cursor:"pointer",
    background:"transparent",border:`1px solid ${C.line}`,color,
    display:"flex",alignItems:"center",justifyContent:"center"};
}
function btn(variant="default"){
  const base={padding:"10px 16px",borderRadius:11,cursor:"pointer",fontSize:14,fontWeight:600,
    border:`1px solid ${C.line}`,background:"transparent",color:C.text};
  if(variant==="primary")return{...base,border:`1px solid ${C.brand}`,background:C.raised};
  if(variant==="ghost")return{...base,border:"none",color:C.muted,padding:"6px 10px"};
  return base;
}
function secHdr(type){
  return{fontSize:13,fontWeight:700,margin:"0 0 10px",letterSpacing:"0.05em",textTransform:"uppercase",color:TYPE_COLOR[type]};
}
function Empty({text}){
  return(
    <div style={{padding:"32px 20px",textAlign:"center",color:C.muted,fontSize:14,
      border:`1px dashed ${C.line}`,borderRadius:14,lineHeight:1.5}}>{text}</div>
  );
}

function Segmented({options,value,onChange}){
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

function NumberField({label,value,onChange,min=0,max=99}){
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

function GeneratorPanel({ownedDiscs,onSave,onCancel}){
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

function BagDetail({bag,ownedDiscs,allDiscs,onBack,onRename,onDelete,onAddDisc,onRemoveDisc}){
  const[query,setQuery]=useState("");
  if(!bag)return <Empty text="Bag ikke fundet."/>;
  const bagDiscs=bag.discIds.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean);
  const q=query.trim().toLowerCase();
  const searchResults=q?ownedDiscs.filter(d=>!bag.discIds.includes(d.id)&&
    (d.name+" "+d.brand).toLowerCase().includes(q)).slice(0,8):[];
  return(
    <div>
      <button onClick={onBack} style={btn("ghost")}>‹ Alle bags</button>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"12px 0 16px"}}>
        <h2 style={{margin:0,fontSize:19,fontWeight:600,color:C.text}}>{bag.name}</h2>
        <div style={{display:"flex",gap:4}}>
          <button onClick={onRename} style={btn("ghost")}>Omdøb</button>
          <button onClick={onDelete} style={{...btn("ghost"),color:C.distance}}>Slet</button>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 12px",
        background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,marginBottom:10}}>
        <Search size={16} color={C.muted}/>
        <input value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Søg i mine discs for at tilføje…"
          style={{flex:1,background:"transparent",border:"none",outline:"none",
            color:C.text,padding:"10px 0",fontSize:14}}/>
        {query&&<button onClick={()=>setQuery("")} aria-label="Ryd" style={iconBtn(C.muted)}><X size={14}/></button>}
      </div>
      {searchResults.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {searchResults.map(d=>(
            <button key={d.id} onClick={()=>{onAddDisc(d.id);setQuery("");}} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"10px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",
              background:C.raised,border:`1px solid ${C.line}`,color:C.text,fontSize:13}}>
              <span>{d.name} <span style={{color:C.muted}}>· {d.brand}</span></span>
              <Plus size={15} color={C.brand}/>
            </button>
          ))}
        </div>
      )}
      {bagDiscs.length===0?(
        <Empty text="Denne bag er tom. Søg ovenfor for at tilføje discs fra din samling."/>
      ):(
        TYPES.filter(t=>bagDiscs.some(d=>d.type===t)).map(t=>(
          <section key={t} style={{marginBottom:18}}>
            <h3 style={secHdr(t)}>{t}</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {bagDiscs.filter(d=>d.type===t).map(d=>(
                <DiscCard key={d.id} disc={d}
                  actions={[{icon:Trash2,label:"Fjern fra bag",onClick:()=>onRemoveDisc(d.id),color:C.distance}]}/>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default function App(){
  const[allDiscs,setAllDiscs]=useState([]);
  const[discsLoading,setDiscsLoading]=useState(true);
  const[usingFallback,setFallback]=useState(false);
  const[dataLoaded,setDataLoaded]=useState(false);
  const[owned,setOwned]=useState([]);
  const[bags,setBags]=useState([]);
  const[tab,setTab]=useState("owned");
  const[query,setQuery]=useState("");
  const[typeFilter,setTypeFilter]=useState("Alle");
  const[brandFilter,setBrandFilter]=useState("Alle");
  const[visibleCount,setVisible]=useState(40);
  const[openBagId,setOpenBagId]=useState(null);
  const[showNewChoice,setShowNewChoice]=useState(false);
  const[showGenerator,setShowGenerator]=useState(false);
  const[flightSourceKey,setFlightSourceKey]=useState("owned");
  const[flightSelected,setFlightSelected]=useState(null);
  const[overrides,setOverrides]=useState({});
  const[editingDiscId,setEditingDiscId]=useState(null);

  useEffect(()=>{
    fetch("/discs.json")
      .then(r=>{if(!r.ok)throw new Error("mangler");return r.json();})
      .then(data=>{setAllDiscs(data);setDiscsLoading(false);})
      .catch(()=>{setAllDiscs(FALLBACK);setFallback(true);setDiscsLoading(false);});
  },[]);

  useEffect(()=>{
    (async()=>{
      let ownedIds=[];
      try{
        let res=await window.storage?.get("owned");
        if(res?.value){ownedIds=JSON.parse(res.value);}
        else{const legacy=await window.storage?.get("bag").catch(()=>null);
          if(legacy?.value){ownedIds=JSON.parse(legacy.value);
            await window.storage.set("owned",JSON.stringify(ownedIds)).catch(()=>{});}}
      }catch(_){}
      setOwned(ownedIds);
      let bagsList=null;
      try{const res=await window.storage?.get("bags");if(res?.value)bagsList=JSON.parse(res.value);}catch(_){}
      if(bagsList===null){
        bagsList=ownedIds.length>0?[{id:genId(),name:"Min bag",discIds:[...ownedIds]}]:[];
        window.storage?.set("bags",JSON.stringify(bagsList)).catch(()=>{});
      }
      setBags(bagsList);setDataLoaded(true);
    })();
  },[]);

  useEffect(()=>{if(dataLoaded)window.storage?.set("owned",JSON.stringify(owned)).catch(()=>{});},[owned,dataLoaded]);
  useEffect(()=>{
    (async()=>{try{const r=await window.storage?.get("overrides");if(r?.value)setOverrides(JSON.parse(r.value));}catch(_){}})();
  },[]);
  useEffect(()=>{if(dataLoaded)window.storage?.set("overrides",JSON.stringify(overrides)).catch(()=>{});},[overrides,dataLoaded]);
  useEffect(()=>{if(dataLoaded)window.storage?.set("bags",JSON.stringify(bags)).catch(()=>{});},[bags,dataLoaded]);
  useEffect(()=>{setFlightSelected(null);},[flightSourceKey]);
  useEffect(()=>{
    if(flightSourceKey!=="owned"&&!bags.some(b=>"bag:"+b.id===flightSourceKey))setFlightSourceKey("owned");
  },[bags,flightSourceKey]);

  const ownedDiscs=useMemo(()=>owned.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean),[owned,allDiscs]);
  const resolvedOwned=useMemo(()=>ownedDiscs.map(d=>resolveDisc(d,overrides)),[ownedDiscs,overrides]);
  const brands=useMemo(()=>["Alle",...[...new Set(allDiscs.map(d=>d.brand))].sort()],[allDiscs]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return allDiscs.filter(d=>{
      if(typeFilter!=="Alle"&&d.type!==typeFilter)return false;
      if(brandFilter!=="Alle"&&d.brand!==brandFilter)return false;
      if(!q)return true;
      return(d.name+" "+d.brand).toLowerCase().includes(q);
    });
  },[allDiscs,query,typeFilter,brandFilter]);

  const flightDiscs=useMemo(()=>{
    if(flightSourceKey==="owned")return resolvedOwned;
    const bag=bags.find(b=>"bag:"+b.id===flightSourceKey);
    if(!bag)return[];
    return bag.discIds.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean).map(d=>resolveDisc(d,overrides));
  },[flightSourceKey,resolvedOwned,bags,allDiscs,overrides]);
  const flightSelectedDisc=flightDiscs.find(d=>d.id===flightSelected)||null;

  const addToOwned=id=>setOwned(o=>o.includes(id)?o:[...o,id]);
  const removeFromOwned=id=>setOwned(o=>o.filter(x=>x!==id));

  function saveOverride(discId,vals){setOverrides(o=>({...o,[discId]:vals}));setEditingDiscId(null);}
  function clearOverride(discId){setOverrides(o=>{const n={...o};delete n[discId];return n;});setEditingDiscId(null);}

  function createEmptyBag(){
    const name=window.prompt("Navn på ny bag:","Ny bag");setShowNewChoice(false);
    if(name===null)return;
    const nb={id:genId(),name:name.trim()||"Ny bag",discIds:[]};
    setBags(b=>[...b,nb]);setOpenBagId(nb.id);
  }
  function renameBag(id){
    const bag=bags.find(b=>b.id===id);if(!bag)return;
    const name=window.prompt("Nyt navn:",bag.name);
    if(name===null||!name.trim())return;
    setBags(bs=>bs.map(b=>b.id===id?{...b,name:name.trim()}:b));
  }
  function deleteBag(id){
    const bag=bags.find(b=>b.id===id);if(!bag)return;
    if(!window.confirm(`Slet bag "${bag.name}"? Kan ikke fortrydes.`))return;
    setBags(bs=>bs.filter(b=>b.id!==id));if(openBagId===id)setOpenBagId(null);
  }
  function addDiscToBag(bagId,discId){
    setBags(bs=>bs.map(b=>b.id===bagId&&!b.discIds.includes(discId)?{...b,discIds:[...b.discIds,discId]}:b));
  }
  function removeDiscFromBag(bagId,discId){
    setBags(bs=>bs.map(b=>b.id===bagId?{...b,discIds:b.discIds.filter(id=>id!==discId)}:b));
  }
  function saveGeneratedBag(name,discs){
    const nb={id:genId(),name:name||"Tilfældig bag",discIds:discs.map(d=>d.id)};
    setBags(b=>[...b,nb]);setOpenBagId(nb.id);setShowGenerator(false);
  }

  if(discsLoading)return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",gap:12}}>
      <Loader size={28} color={C.brand} style={{animation:"spin 1s linear infinite"}}/>
      <span style={{color:C.muted,fontSize:14}}>Henter disc-database…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",
      fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        button:focus-visible{outline:2px solid ${C.brand};outline-offset:2px;}
        select{appearance:none;}
      `}</style>
      <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px 60px"}}>

        <header style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <Disc3 size={26} color={C.brand}/>
          <h1 style={{margin:0,fontFamily:"Pacifico,cursive",fontWeight:400,fontSize:30,color:C.text,lineHeight:1}}>Min Disc</h1>
          <span style={{marginLeft:"auto",fontSize:13,color:C.muted,
            background:C.surface,border:`1px solid ${C.line}`,padding:"5px 11px",borderRadius:999}}>
            {owned.length} ejet
          </span>
        </header>

        {usingFallback&&(
          <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"10px 12px",marginBottom:14,
            background:`${C.brand}15`,border:`1px solid ${C.brand}40`,borderRadius:10,fontSize:13}}>
            <AlertCircle size={16} color={C.brand} style={{flexShrink:0,marginTop:1}}/>
            <span style={{color:C.muted}}>
              Mini-database aktiv. Kør <code style={{color:C.brand}}>node fetch-discs.mjs</code> for fuld database.
            </span>
          </div>
        )}

        <nav style={{display:"flex",gap:6,marginBottom:18}}>
          {[["db","Database"],["owned","Mine discs"],["bags","Bags"],["flight","Flight"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              flex:1,padding:"10px 0",borderRadius:11,cursor:"pointer",fontSize:13,fontWeight:600,
              border:`1px solid ${tab===key?C.brand:C.line}`,
              background:tab===key?C.raised:"transparent",color:tab===key?C.text:C.muted}}>
              {label}
            </button>
          ))}
        </nav>

        {tab==="db"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 12px",
              background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,marginBottom:10}}>
              <Search size={17} color={C.muted}/>
              <input value={query} onChange={e=>{setQuery(e.target.value);setVisible(40);}}
                placeholder="Søg disc eller mærke…"
                style={{flex:1,background:"transparent",border:"none",outline:"none",
                  color:C.text,padding:"12px 0",fontSize:15}}/>
              {query&&<button onClick={()=>{setQuery("");setVisible(40);}} aria-label="Ryd" style={iconBtn(C.muted)}><X size={15}/></button>}
            </div>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              {["Alle",...TYPES].map(t=>(
                <button key={t} onClick={()=>{setTypeFilter(t);setVisible(40);}} style={{
                  padding:"6px 12px",borderRadius:999,cursor:"pointer",fontSize:12,fontWeight:500,
                  border:`1px solid ${typeFilter===t?C.brand:C.line}`,
                  background:typeFilter===t?C.raised:"transparent",color:typeFilter===t?C.text:C.muted}}>
                  {t}
                </button>
              ))}
            </div>
            <select value={brandFilter} onChange={e=>{setBrandFilter(e.target.value);setVisible(40);}}
              style={{width:"100%",padding:"10px 12px",marginBottom:10,background:C.surface,
                border:`1px solid ${C.line}`,borderRadius:10,color:C.text,fontSize:14,cursor:"pointer"}}>
              {brands.map(b=><option key={b} value={b} style={{background:C.surface}}>{b}</option>)}
            </select>
            <div style={{fontSize:12,color:C.muted,marginBottom:10}}>
              {filtered.length.toLocaleString("da")} discs{filtered.length>visibleCount&&` — viser ${visibleCount}`}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filtered.slice(0,visibleCount).map(d=>(
                <DiscCard key={d.id} disc={d} actions={[
                  owned.includes(d.id)
                    ?{icon:Trash2,label:"Fjern fra mine discs",onClick:()=>removeFromOwned(d.id),color:C.distance}
                    :{icon:Plus,label:"Tilføj til mine discs",onClick:()=>addToOwned(d.id),color:C.brand}
                ]}/>
              ))}
              {filtered.length===0&&<Empty text="Ingen discs matcher din søgning."/>}
            </div>
            {filtered.length>visibleCount&&(
              <button onClick={()=>setVisible(v=>v+40)} style={{
                width:"100%",marginTop:14,padding:"12px 0",borderRadius:11,cursor:"pointer",
                background:"transparent",border:`1px solid ${C.line}`,color:C.muted,fontSize:14}}>
                Vis {Math.min(40,filtered.length-visibleCount)} mere
              </button>
            )}
          </div>
        )}

        {tab==="owned"&&(
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {ownedDiscs.length===0?(
              <Empty text="Du ejer ingen discs endnu. Gå til Database og tilføj dem du har."/>
            ):(
              TYPES.filter(t=>ownedDiscs.some(d=>d.type===t)).map(t=>(
                <section key={t}>
                  <h2 style={secHdr(t)}>{t}</h2>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {ownedDiscs.filter(d=>d.type===t).map(d=>{
                      const rd=resolveDisc(d,overrides);
                      return(
                        <DiscCard key={d.id} disc={rd}
                          isEditing={editingDiscId===d.id}
                          onToggleEdit={()=>setEditingDiscId(editingDiscId===d.id?null:d.id)}
                          override={overrides[d.id]||null}
                          onSave={vals=>saveOverride(d.id,vals)}
                          onClear={()=>clearOverride(d.id)}
                          actions={[{icon:Trash2,label:"Fjern fra mine discs",onClick:()=>removeFromOwned(d.id),color:C.distance}]}/>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {tab==="bags"&&(
          openBagId?(
            <BagDetail
              bag={bags.find(b=>b.id===openBagId)}
              ownedDiscs={ownedDiscs} allDiscs={allDiscs}
              onBack={()=>setOpenBagId(null)}
              onRename={()=>renameBag(openBagId)}
              onDelete={()=>deleteBag(openBagId)}
              onAddDisc={discId=>addDiscToBag(openBagId,discId)}
              onRemoveDisc={discId=>removeDiscFromBag(openBagId,discId)}/>
          ):(
            <div>
              {!showGenerator&&(
                <>
                  <button onClick={()=>setShowNewChoice(v=>!v)} style={{...btn("primary"),marginBottom:showNewChoice?10:14}}>
                    + Ny bag
                  </button>
                  {showNewChoice&&(
                    <div style={{display:"flex",gap:8,marginBottom:14}}>
                      <button onClick={createEmptyBag} style={btn()}>Tom bag</button>
                      <button onClick={()=>{setShowGenerator(true);setShowNewChoice(false);}} style={btn()}>🎲 Tilfældig bag</button>
                    </div>
                  )}
                  {bags.length===0?(
                    <Empty text="Du har ingen bags endnu. Opret en ovenfor."/>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {bags.map(b=>(
                        <button key={b.id} onClick={()=>setOpenBagId(b.id)} style={{
                          display:"flex",justifyContent:"space-between",alignItems:"center",
                          padding:14,borderRadius:14,cursor:"pointer",textAlign:"left",
                          background:C.surface,border:`1px solid ${C.line}`,color:C.text}}>
                          <span style={{fontWeight:600}}>{b.name}</span>
                          <span style={{fontSize:13,color:C.muted}}>{b.discIds.length} discs</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {showGenerator&&(
                <GeneratorPanel ownedDiscs={ownedDiscs} onSave={saveGeneratedBag} onCancel={()=>setShowGenerator(false)}/>
              )}
            </div>
          )
        )}

        {tab==="flight"&&(
          <div>
            <select value={flightSourceKey} onChange={e=>setFlightSourceKey(e.target.value)}
              style={{width:"100%",padding:"10px 12px",marginBottom:12,background:C.surface,
                border:`1px solid ${C.line}`,borderRadius:10,color:C.text,fontSize:14,cursor:"pointer"}}>
              <option value="owned">Mine discs (alle ejede)</option>
              {bags.map(b=><option key={b.id} value={"bag:"+b.id}>{b.name}</option>)}
            </select>
            <div style={{padding:14,background:C.bg,border:`1px solid ${C.line}`,borderRadius:16,marginBottom:12}}>
              {flightDiscs.length===0?(
                <Empty text="Ingen discs at vise her endnu."/>
              ):(
                <FlightMatrix discs={flightDiscs} selectedId={flightSelected} onSelect={setFlightSelected}/>
              )}
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:6,fontSize:12,color:C.muted}}>
              {TYPES.map(t=>(
                <span key={t} style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:9,height:9,borderRadius:"50%",background:TYPE_COLOR[t]}}/>{t}
                </span>
              ))}
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>
              Disc-farve vises i matrixen hvis du har valgt én under ✎ i Mine discs.
            </div>
            {flightSelectedDisc&&<DiscCard disc={flightSelectedDisc}/>}
          </div>
        )}

      </div>
    </div>
  );
}
