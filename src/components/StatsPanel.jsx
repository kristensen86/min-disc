import { C, TYPE_COLOR, TYPES, DISC_COLORS, typeBarStyle } from "../constants";
import { Empty, textDisplay, dataMono } from "./ui";
import { CollectorStatus } from "./CollectorStatus";

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function nearestStdColor(hex) {
  const [r1,g1,b1] = hexToRgb(hex);
  let best = DISC_COLORS[0], bestDist = Infinity;
  for (const c of DISC_COLORS) {
    const [r2,g2,b2] = hexToRgb(c);
    const d = (r1-r2)**2+(g1-g2)**2+(b1-b2)**2;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

function StatCard({title,children}){
  return(
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
      padding:"16px 18px",boxShadow:`0 0 20px ${C.brand}06`}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
        color:C.muted,marginBottom:14}}>{title}</div>
      {children}
    </div>
  );
}

export function StatsPanel({resolvedOwned, allDiscs}){
  const total=resolvedOwned.length;

  const byType=TYPES.map(t=>({type:t,count:resolvedOwned.filter(d=>d.type===t).length}));
  const maxTypeCount=Math.max(...byType.map(x=>x.count),1);

  const brandMap={};
  resolvedOwned.forEach(d=>{
    if(!brandMap[d.brand])brandMap[d.brand]={total:0,byType:{}};
    brandMap[d.brand].total+=1;
    brandMap[d.brand].byType[d.type]=(brandMap[d.brand].byType[d.type]||0)+1;
  });
  const byBrand=Object.entries(brandMap).sort((a,b)=>b[1].total-a[1].total);
  const maxBrandCount=byBrand.length>0?byBrand[0][1].total:1;

  const colorMap={};
  resolvedOwned.forEach(d=>{if(d.pColor){const std=nearestStdColor(d.pColor);colorMap[std]=(colorMap[std]||0)+1;}});
  const byColor=Object.entries(colorMap).sort((a,b)=>b[1]-a[1]);

  const plasticMap={};
  resolvedOwned.forEach(d=>{if(d.pPlastic){const k=d.pPlastic.trim();plasticMap[k]=(plasticMap[k]||0)+1;}});
  const byPlastic=Object.entries(plasticMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const withWeight=resolvedOwned.filter(d=>d.pWeight&&!isNaN(Number(d.pWeight)));
  const avgWeight=withWeight.length>0
    ?(withWeight.reduce((a,d)=>a+Number(d.pWeight),0)/withWeight.length).toFixed(1)
    :null;

  if(total===0){
    return <Empty text="Tilføj discs til din samling for at se statistik."/>;
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Samling overview */}
      <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
        padding:"20px 18px",display:"flex",gap:20,alignItems:"center",
        boxShadow:`0 0 24px ${C.brand}08`}}>
        <div>
          <div style={textDisplay()}>{total}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:5,letterSpacing:"0.08em",
            textTransform:"uppercase"}}>discs i alt</div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
          {byType.filter(x=>x.count>0).map(({type,count})=>{
            const bar=typeBarStyle(type);
            return(
              <div key={type} style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:TYPE_COLOR[type],width:72,flexShrink:0,
                  letterSpacing:"0.02em"}}>{type}</span>
                <div style={{flex:1,height:5,borderRadius:3,background:C.line}}>
                  <div style={{height:5,borderRadius:3,width:`${(count/maxTypeCount)*100}%`,...bar}}/>
                </div>
                <span style={{...dataMono(11,C.muted),width:20,textAlign:"right"}}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By brand — bar segmented by type composition, so the chart itself signals what's in the collection */}
      <StatCard title="Mærker">
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          {byBrand.map(([brand,{total:brandTotal,byType:brandByType}])=>(
            <div key={brand} style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:13,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{brand}</span>
              <div style={{width:88,height:6,borderRadius:3,background:C.line,display:"flex",gap:1,overflow:"hidden"}}>
                {TYPES.filter(t=>brandByType[t]).map(t=>{
                  const bar=typeBarStyle(t);
                  return(
                    <div key={t} title={`${t}: ${brandByType[t]}`} style={{
                      height:"100%",width:`${(brandByType[t]/maxBrandCount)*100}%`,
                      background:bar.background,
                    }}/>
                  );
                })}
              </div>
              <span style={{...dataMono(12,C.muted),width:22,textAlign:"right"}}>{brandTotal}</span>
            </div>
          ))}
        </div>
      </StatCard>

      {/* By color */}
      {byColor.length>0&&(
        <StatCard title="Farver">
          <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
            {byColor.map(([color,count])=>(
              <div key={color} style={{display:"flex",alignItems:"center",gap:7,
                fontSize:12,color:C.muted}}>
                <span style={{width:20,height:20,borderRadius:"50%",background:color,
                  border:`1px solid ${C.line}`,flexShrink:0,
                  boxShadow:`0 0 8px ${color}50`}}/>
                <span style={dataMono(12,C.muted)}>{count}</span>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* By plastic */}
      {byPlastic.length>0&&(
        <StatCard title="Plast-typer">
          {byPlastic.map(([plastic,count],i)=>(
            <div key={plastic} style={{display:"flex",justifyContent:"space-between",
              padding:"8px 0",fontSize:13,
              borderBottom:i<byPlastic.length-1?`1px solid ${C.line}`:"none"}}>
              <span style={{color:C.text}}>{plastic}</span>
              <span style={dataMono(13,C.muted)}>{count}</span>
            </div>
          ))}
        </StatCard>
      )}

      {/* Average weight */}
      {avgWeight&&(
        <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
          padding:"14px 16px"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
            color:C.muted,marginBottom:10}}>Ø Vægt</div>
          <div style={{...dataMono(26,C.brand),fontWeight:700}}>{avgWeight}g</div>
          <div style={{fontSize:11,color:C.muted,marginTop:4,letterSpacing:"0.02em"}}>
            <span style={dataMono(11,C.muted)}>{withWeight.length}</span> registreret
          </div>
        </div>
      )}

      {allDiscs&&<CollectorStatus resolvedOwned={resolvedOwned} allDiscs={allDiscs}/>}

    </div>
  );
}
