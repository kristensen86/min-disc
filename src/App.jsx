import { useState, useEffect, useMemo } from "react";
import { Search, Plus, X, Trash2, Disc3, AlertCircle, Loader } from "lucide-react";

/* =========================================================================
   MIN DISC v2 — ejet samling + flere bags + random bag-generator + flight-matrix
   -------------------------------------------------------------------------
   Datamodel:
     owned: string[]           — alle discs du ejer (din fulde samling)
     bags:  {id,name,discIds}[] — navngivne bags, hver et udsnit af owned
   Migrerer automatisk fra v1's enkelt-bag ("bag"-nøgle) første gang appen
   åbnes efter opdateringen.
   ========================================================================= */

const C = {
  bg:"#0f1714",surface:"#18241f",raised:"#1f3029",line:"#2c4036",
  text:"#e8efe9",muted:"#8aa597",brand:"#f2c14e",
  putter:"#5bb4ff",midrange:"#5fd486",fairway:"#f2b13c",distance:"#ff6b6b",
};
const TYPE_COLOR={Putter:C.putter,Midrange:C.midrange,Fairway:C.fairway,Distance:C.distance};
const TRACE=["#f2c14e","#5bb4ff","#5fd486","#ff6b6b","#c77dff","#ff9f43","#4dd4c0","#ff6fb5"];
const TYPES=["Putter","Midrange","Fairway","Distance"];

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

function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function emptyGenForm(){
  return {
    name:"Tilfældig bag", preset:"none", balanced:true, total:8,
    counts:{Putter:2,Midrange:2,Fairway:2,Distance:2},
    minSpeed:1, maxSpeed:14, allowDup:false,
  };
}
function splitEvenly(total){
  const base=Math.floor(total/4), rem=total%4, counts={};
  TYPES.forEach((t,i)=>{ counts[t]=base+(i<rem?1:0); });
  return counts;
}

// ─── Flight-trace model (bruges til de små preview-baner på DiscCard) ──────
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

// ─── Flight Matrix: Speed (lodret) × Turn (vandret), Fade = cirkelstørrelse ─
function FlightMatrix({discs,selectedId,onSelect}){
  const W=320,H=400,padL=42,padR=16,padT=16,padB=46;
  const speedMin=1, speedMax=Math.max(14,...discs.map(d=>d.speed),1);
  const turnMin=-5, turnMax=Math.max(1,...discs.map(d=>d.turn),1);
  const mapY=s=>padT+(speedMax-s)/(speedMax-speedMin)*(H-padT-padB);
  const mapX=t=>padL+(turnMax-t)/(turnMax-turnMin)*(W-padL-padR);
  const r=fade=>4+Math.min(5,Math.max(0,fade))*1.1;
  const speedMid=Math.round((speedMin+speedMax)/2);

  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
      <rect x="0" y="0" width={W} height={H} rx="14" fill={C.surface} stroke={C.line}/>
      {[0.25,0.5,0.75].map(f=>(
        <line key={"h"+f} x1={padL} x2={W-padR}
          y1={padT+(H-padT-padB)*f} y2={padT+(H-padT-padB)*f}
          stroke={C.line} strokeWidth="1" opacity="0.3"/>
      ))}
      {[0.25,0.5,0.75].map(f=>(
        <line key={"v"+f} y1={padT} y2={H-padB}
          x1={padL+(W-padL-padR)*f} x2={padL+(W-padL-padR)*f}
          stroke={C.line} strokeWidth="1" opacity="0.3"/>
      ))}
      <line x1={mapX(0)} x2={mapX(0)} y1={padT} y2={H-padB} stroke={C.muted} strokeWidth="1" strokeDasharray="2 4" opacity="0.5"/>

      <text x={padL-8} y={padT+4} fill={C.muted} fontSize="9" textAnchor="end">{speedMax}</text>
      <text x={padL-8} y={mapY(speedMid)+3} fill={C.muted} fontSize="9" textAnchor="end">{speedMid}</text>
      <text x={padL-8} y={H-padB} fill={C.muted} fontSize="9" textAnchor="end">{speedMin}</text>
      <text x={14} y={(padT+H-padB)/2} fill={C.muted} fontSize="9" textAnchor="middle"
        transform={`rotate(-90 14 ${(padT+H-padB)/2})`}>Speed</text>

      <text x={padL} y={H-padB+18} fill={C.muted} fontSize="9" textAnchor="start">Overstabil ←</text>
      <text x={W-padR} y={H-padB+18} fill={C.muted} fontSize="9" textAnchor="end">→ Understabil</text>

      {discs.map(d=>{
        const x=mapX(Math.max(turnMin,Math.min(turnMax,d.turn)));
        const y=mapY(Math.max(speedMin,Math.min(speedMax,d.speed)));
        const isSel=d.id===selectedId;
        return(
          <circle key={d.id} cx={x} cy={y} r={r(d.fade)}
            fill={TYPE_COLOR[d.type]} fillOpacity={isSel?1:0.78}
            stroke={isSel?C.text:C.bg} strokeWidth={isSel?2:1}
            style={{cursor:"pointer"}}
            onClick={()=>onSelect(d.id===selectedId?null:d.id)}/>
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
      border:`1px solid ${color}30`,color,background:`${color}15`}}>
      {label}
    </span>
  );function DiscCard({disc,actions=[]}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:12,padding:12,
      background:C.surface,border:`1px solid ${C.line}`,borderRadius:14}}>
      <div style={{width:56,flexShrink:0}}>
        <FlightChart discs={[disc]} hand="R" height={70} showLabels={false}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:TYPE_COLOR[disc.type],flexShrink:0}}/>
          <span style={{fontWeight:600,color:C.text}}>{disc.name}</span>
          <StabilityPill stability={disc.stability}/>
        </div>
        <div style={{color:C.muted,fontSize:13,marginBottom:8}}>{disc.brand} · {disc.type}</div>
        <FlightBadge disc={disc}/>
      </div>
      {disc.link&&(
        <a href={disc.link} target="_blank" rel="noopener noreferrer"
          style={{fontSize:11,color:C.muted,flexShrink:0}}>Køb</a>
      )}
      {actions.map((a,i)=>(
        <button key={i} onClick={a.onClick} aria-label={a.label} style={iconBtn(a.color||C.muted)}>
          <a.icon size={16}/>
        </button>
      ))}
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
          color:value===key?C.text:C.muted}}>
          {label}
        </button>
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

// ─── Random bag-generator ───────────────────────────────────────────────────
function GeneratorPanel({ownedDiscs,onSave,onCancel}){
  const[form,setForm]=useState(emptyGenForm());
  const[preview,setPreview]=useState(null);
  const patch=p=>setForm(f=>({...f,...p}));

  function applyPreset(preset){
    const presets={
      none:{minSpeed:1,maxSpeed:14}, skov:{minSpeed:1,maxSpeed:9},
      aaben:{minSpeed:4,maxSpeed:14}, blaesende:{minSpeed:1,maxSpeed:11},
      begynder:{minSpeed:1,maxSpeed:9},
    };
    patch({preset,...(presets[preset]||{})});
  }

  function generate(){
    const candidates=ownedDiscs.filter(d=>d.speed>=form.minSpeed&&d.speed<=form.maxSpeed);
    const counts=form.balanced?splitEvenly(form.total):form.counts;
    const bias=form.preset==="blaesende"?"stable":form.preset==="begynder"?"easy":"none";
    const picked=[],warnings=[];
    for(const type of TYPES){
      const need=counts[type]||0;
      if(need<=0)continue;
      let pool=candidates.filter(d=>d.type===type);
      if(bias==="stable")pool=[...pool].sort((a,b)=>(b.fade-b.turn)-(a.fade-a.turn));
      if(bias==="easy")pool=[...pool].sort((a,b)=>(Math.abs(a.turn)+a.fade)-(Math.abs(b.turn)+b.fade));
      if(bias!=="none"&&pool.length>3)pool=pool.slice(0,Math.ceil(pool.length*0.6));
      const available=[...pool];
      for(let i=0;i<need;i++){
        if(available.length===0){
          if(form.allowDup&&pool.length>0){
            picked.push(pool[Math.floor(Math.random()*pool.length)]);
          }else{
            warnings.push(`Kun ${i} af ${need} ${type.toLowerCase()} fundet`);
            break;
          }
          continue;
        }
        const idx=Math.floor(Math.random()*available.length);
        picked.push(available[idx]); available.splice(idx,1);
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
        <div style={{fontSize:12,color:C.muted,marginBottom:6}}>Bane-type (forudfylder fornuftige værdier)</div>
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
          {preview.warnings.length>0&&(
            <div style={{fontSize:12,color:C.brand}}>{preview.warnings.join(" · ")}</div>
          )}
          {preview.discs.length===0?(
            <Empty text="Ingen discs matchede kriterierne. Justér speed-interval eller antal."/>
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

// ─── Bag-detalje (vis/redigér én bag) ───────────────────────────────────────
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
        {query&&(
          <button onClick={()=>setQuery("")} aria-label="Ryd" style={iconBtn(C.muted)}><X size={14}/></button>
        )}
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
}// ─── Hoved-app ───────────────────────────────────────────────────────────
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
        if(res?.value){
          ownedIds=JSON.parse(res.value);
        }else{
          const legacy=await window.storage?.get("bag").catch(()=>null);
          if(legacy?.value){
            ownedIds=JSON.parse(legacy.value);
            await window.storage.set("owned",JSON.stringify(ownedIds)).catch(()=>{});
          }
        }
      }catch(_){}
      setOwned(ownedIds);

      let bagsList=null;
      try{
        const res=await window.storage?.get("bags");
        if(res?.value)bagsList=JSON.parse(res.value);
      }catch(_){}
      if(bagsList===null){
        bagsList=ownedIds.length>0?[{id:genId(),name:"Min bag",discIds:[...ownedIds]}]:[];
        window.storage?.set("bags",JSON.stringify(bagsList)).catch(()=>{});
      }
      setBags(bagsList);
      setDataLoaded(true);
    })();
  },[]);

  useEffect(()=>{ if(dataLoaded)window.storage?.set("owned",JSON.stringify(owned)).catch(()=>{}); },[owned,dataLoaded]);
  useEffect(()=>{ if(dataLoaded)window.storage?.set("bags",JSON.stringify(bags)).catch(()=>{}); },[bags,dataLoaded]);
  useEffect(()=>{ setFlightSelected(null); },[flightSourceKey]);
  useEffect(()=>{
    if(flightSourceKey!=="owned"&&!bags.some(b=>"bag:"+b.id===flightSourceKey)){
      setFlightSourceKey("owned");
    }
  },[bags,flightSourceKey]);

  const ownedDiscs=useMemo(()=>owned.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean),[owned,allDiscs]);
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
    if(flightSourceKey==="owned")return ownedDiscs;
    const bag=bags.find(b=>"bag:"+b.id===flightSourceKey);
    if(!bag)return[];
    return bag.discIds.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean);
  },[flightSourceKey,ownedDiscs,bags,allDiscs]);
  const flightSelectedDisc=flightDiscs.find(d=>d.id===flightSelected)||null;

  const addToOwned=id=>setOwned(o=>o.includes(id)?o:[...o,id]);
  const removeFromOwned=id=>setOwned(o=>o.filter(x=>x!==id));

  function createEmptyBag(){
    const name=window.prompt("Navn på ny bag:","Ny bag");
    setShowNewChoice(false);
    if(name===null)return;
    const nb={id:genId(),name:name.trim()||"Ny bag",discIds:[]};
    setBags(b=>[...b,nb]);
    setOpenBagId(nb.id);
  }
  function renameBag(id){
    const bag=bags.find(b=>b.id===id); if(!bag)return;
    const name=window.prompt("Nyt navn:",bag.name);
    if(name===null||!name.trim())return;
    setBags(bs=>bs.map(b=>b.id===id?{...b,name:name.trim()}:b));
  }
  function deleteBag(id){
    const bag=bags.find(b=>b.id===id); if(!bag)return;
    if(!window.confirm(`Slet bag "${bag.name}"? Kan ikke fortrydes.`))return;
    setBags(bs=>bs.filter(b=>b.id!==id));
    if(openBagId===id)setOpenBagId(null);
  }
  function addDiscToBag(bagId,discId){
    setBags(bs=>bs.map(b=>b.id===bagId&&!b.discIds.includes(discId)?{...b,discIds:[...b.discIds,discId]}:b));
  }
  function removeDiscFromBag(bagId,discId){
    setBags(bs=>bs.map(b=>b.id===bagId?{...b,discIds:b.discIds.filter(id=>id!==discId)}:b));
  }
  function saveGeneratedBag(name,discs){
    const nb={id:genId(),name:name||"Tilfældig bag",discIds:discs.map(d=>d.id)};
    setBags(b=>[...b,nb]);
    setOpenBagId(nb.id);
    setShowGenerator(false);
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
          <h1 style={{margin:0,fontFamily:"Pacifico,cursive",fontWeight:400,fontSize:30,color:C.text,lineHeight:1}}>
            Min Disc
          </h1>
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
              Mini-database aktiv (22 discs). Kør <code style={{color:C.brand}}>node fetch-discs.mjs</code> for fuld database.
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

        {/* ── DATABASE ── */}
        {tab==="db"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 12px",
              background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,marginBottom:10}}>
              <Search size={17} color={C.muted}/>
              <input value={query} onChange={e=>{setQuery(e.target.value);setVisible(40);}}
                placeholder="Søg disc eller mærke…"
                style={{flex:1,background:"transparent",border:"none",outline:"none",
                  color:C.text,padding:"12px 0",fontSize:15}}/>
              {query&&(
                <button onClick={()=>{setQuery("");setVisible(40);}} aria-label="Ryd" style={iconBtn(C.muted)}>
                  <X size={15}/>
                </button>
              )}
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
                Vis {Math.min(40,filtered.length-visibleCount)} mere ({filtered.length-visibleCount} tilbage)
              </button>
            )}
          </div>
        )}

        {/* ── MINE DISCS (ejet samling) ── */}
        {tab==="owned"&&(
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {ownedDiscs.length===0?(
              <Empty text="Du ejer ingen discs endnu. Gå til Database og tilføj dem du har."/>
            ):(
              TYPES.filter(t=>ownedDiscs.some(d=>d.type===t)).map(t=>(
                <section key={t}>
                  <h2 style={secHdr(t)}>{t}</h2>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {ownedDiscs.filter(d=>d.type===t).map(d=>(
                      <DiscCard key={d.id} disc={d}
                        actions={[{icon:Trash2,label:"Fjern fra mine discs",onClick:()=>removeFromOwned(d.id),color:C.distance}]}/>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {/* ── BAGS ── */}
        {tab==="bags"&&(
          openBagId?(
            <BagDetail
              bag={bags.find(b=>b.id===openBagId)}
              ownedDiscs={ownedDiscs}
              allDiscs={allDiscs}
              onBack={()=>setOpenBagId(null)}
              onRename={()=>renameBag(openBagId)}
              onDelete={()=>deleteBag(openBagId)}
              onAddDisc={discId=>addDiscToBag(openBagId,discId)}
              onRemoveDisc={discId=>removeDiscFromBag(openBagId,discId)}
            />
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

        {/* ── FLIGHT MATRIX ── */}
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
                  <span style={{width:9,height:9,borderRadius:"50%",background:TYPE_COLOR[t]}}/>
                  {t}
                </span>
              ))}
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>
              Cirkelstørrelse = fade. Tal er manufacturer-rating for højrehånds-backhand.
            </div>

            {flightSelectedDisc&&(
              <DiscCard disc={flightSelectedDisc}/>
            )}
          </div>
        )}

      </div>
    </div>
  );
                        }
}
