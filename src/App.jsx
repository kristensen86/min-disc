import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Check, X, Trash2, Disc3, RotateCcw, AlertCircle, Loader } from "lucide-react";

/* =========================================================================
   MIN DISC — virtuel bag + disc-database + flight-matrix
   -------------------------------------------------------------------------
   Databasen hentes fra /public/discs.json (genereret af fetch-discs.mjs).
   Filen serveres gratis af Vercel/Netlify direkte fra dit GitHub-repo.
   Hvis filen ikke er tilgængelig falder appen tilbage på en mini-database.
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
      {[0.25,0.5,0.75].map(f=>(
        <line key={f} x1={geom.padX} x2={W-geom.padX}
          y1={geom.padTop+(H-geom.padTop-geom.padBottom)*f}
          y2={geom.padTop+(H-geom.padTop-geom.padBottom)*f}
          stroke={C.line} strokeWidth="1" opacity="0.4"/>
      ))}
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
  );
}

function DiscCard({disc,inBag,onAdd,onRemove}){
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
      {inBag?(
        <button onClick={()=>onRemove(disc.id)} aria-label="Fjern fra bag" style={iconBtn(C.distance)}><Trash2 size={16}/></button>
      ):(
        <button onClick={()=>onAdd(disc.id)} aria-label="Læg i bag" style={iconBtn(C.brand)}><Plus size={18}/></button>
      )}
    </div>
  );
}

function iconBtn(color){
  return{flexShrink:0,width:38,height:38,borderRadius:10,cursor:"pointer",
    background:"transparent",border:`1px solid ${C.line}`,color,
    display:"flex",alignItems:"center",justifyContent:"center"};
}

export default function App(){
  const[allDiscs,setAllDiscs]=useState([]);
  const[loading,setLoading]=useState(true);
  const[usingFallback,setFallback]=useState(false);
  const[bag,setBag]=useState([]);
  const[bagLoaded,setBagLoaded]=useState(false);
  const[tab,setTab]=useState("bag");
  const[query,setQuery]=useState("");
  const[typeFilter,setTypeFilter]=useState("Alle");
  const[brandFilter,setBrandFilter]=useState("Alle");
  const[shown,setShown]=useState([]);
  const[hand,setHand]=useState("R");
  const[visibleCount,setVisible]=useState(40);

  useEffect(()=>{
    fetch("/discs.json")
      .then(r=>{if(!r.ok)throw new Error("mangler");return r.json();})
      .then(data=>{setAllDiscs(data);setLoading(false);})
      .catch(()=>{setAllDiscs(FALLBACK);setFallback(true);setLoading(false);});
  },[]);

  useEffect(()=>{
    (async()=>{
      try{const res=await window.storage?.get("bag");if(res?.value)setBag(JSON.parse(res.value));}catch(_){}
      setBagLoaded(true);
    })();
  },[]);

  useEffect(()=>{
    if(!bagLoaded)return;
    window.storage?.set("bag",JSON.stringify(bag)).catch(()=>{});
  },[bag,bagLoaded]);

  const bagDiscs=useMemo(()=>bag.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean),[bag,allDiscs]);
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

  const addToBag=id=>setBag(b=>b.includes(id)?b:[...b,id]);
  const removeFromBag=id=>{setBag(b=>b.filter(x=>x!==id));setShown(s=>s.filter(x=>x!==id));};
  const toggleShown=id=>setShown(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const shownDiscs=shown.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean);

  if(loading)return(
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
            {bag.length} i bag
          </span>
        </header>

        {usingFallback&&(
          <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"10px 12px",marginBottom:14,
            background:`${C.brand}15`,border:`1px solid ${C.brand}40`,borderRadius:10,fontSize:13}}>
            <AlertCircle size={16} color={C.brand} style={{flexShrink:0,marginTop:1}}/>
            <span style={{color:C.muted}}>
              Mini-database aktiv (22 discs). Kør <code style={{color:C.brand}}>node fetch-discs.mjs</code> for fuld database med 1000+ discs.
            </span>
          </div>
        )}

        <nav style={{display:"flex",gap:6,marginBottom:18}}>
          {[["bag","Min bag"],["db",`Database (${allDiscs.length.toLocaleString("da")})`],["flight","Flight"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              flex:1,padding:"10px 0",borderRadius:11,cursor:"pointer",fontSize:13,fontWeight:600,
              border:`1px solid ${tab===key?C.brand:C.line}`,
              background:tab===key?C.raised:"transparent",color:tab===key?C.text:C.muted}}>
              {label}
            </button>
          ))}
        </nav>

        {tab==="bag"&&(
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {bagDiscs.length===0?(
              <Empty text="Din bag er tom. Gå til Database og læg dine discs i."/>
            ):(
              TYPES.filter(t=>bagDiscs.some(d=>d.type===t)).map(t=>(
                <section key={t}>
                  <h2 style={secHdr(t)}>{t}</h2>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {bagDiscs.filter(d=>d.type===t).map(d=>(
                      <DiscCard key={d.id} disc={d} inBag onRemove={removeFromBag}/>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

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
                <DiscCard key={d.id} disc={d} inBag={bag.includes(d.id)} onAdd={addToBag} onRemove={removeFromBag}/>
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

        {tab==="flight"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",gap:6}}>
                {[["R","Højrehånd"],["L","Venstrehånd"]].map(([key,label])=>(
                  <button key={key} onClick={()=>setHand(key)} style={{
                    padding:"8px 13px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,
                    border:`1px solid ${hand===key?C.brand:C.line}`,
                    background:hand===key?C.raised:"transparent",color:hand===key?C.text:C.muted}}>
                    {label}
                  </button>
                ))}
              </div>
              {shown.length>0&&(
                <button onClick={()=>setShown([])} style={iconBtn(C.muted)} aria-label="Nulstil"><RotateCcw size={15}/></button>
              )}
            </div>
            <div style={{padding:14,background:C.bg,border:`1px solid ${C.line}`,borderRadius:16,marginBottom:16}}>
              <FlightChart discs={shownDiscs} hand={hand} height={340}/>
            </div>
            {shownDiscs.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:18}}>
                {shownDiscs.map((d,i)=>(
                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:14}}>
                    <span style={{width:18,height:3,borderRadius:2,background:TRACE[i%TRACE.length]}}/>
                    <span style={{fontWeight:600}}>{d.name}</span>
                    <span style={{color:C.muted}}>· {d.speed}/{d.glide}/{d.turn}/{d.fade}</span>
                    <StabilityPill stability={d.stability}/>
                  </div>
                ))}
              </div>
            )}
            <h2 style={{fontSize:13,color:C.muted,fontWeight:600,margin:"0 0 10px",
              letterSpacing:"0.04em",textTransform:"uppercase"}}>Vælg fra din bag</h2>
            {bagDiscs.length===0?(
              <Empty text="Læg discs i din bag for at sammenligne flight-baner her."/>
            ):(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {bagDiscs.map(d=>{
                  const active=shown.includes(d.id);
                  return(
                    <button key={d.id} onClick={()=>toggleShown(d.id)} style={{
                      display:"flex",alignItems:"center",gap:7,padding:"8px 12px",
                      borderRadius:999,cursor:"pointer",fontSize:14,fontWeight:500,
                      border:`1px solid ${active?C.brand:C.line}`,
                      background:active?C.raised:"transparent",color:C.text}}>
                      {active?<Check size={14} color={C.brand}/>
                        :<span style={{width:8,height:8,borderRadius:"50%",background:TYPE_COLOR[d.type]}}/>}
                      {d.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
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
