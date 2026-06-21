import { C, TYPE_COLOR, TYPES } from "../constants";
import { Empty } from "./ui";

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

export function StatsPanel({resolvedOwned}){
  const total=resolvedOwned.length;

  const byType=TYPES.map(t=>({type:t,count:resolvedOwned.filter(d=>d.type===t).length}));
  const maxTypeCount=Math.max(...byType.map(x=>x.count),1);

  const brandMap={};
  resolvedOwned.forEach(d=>{brandMap[d.brand]=(brandMap[d.brand]||0)+1;});
  const byBrand=Object.entries(brandMap).sort((a,b)=>b[1]-a[1]);
  const maxBrandCount=byBrand.length>0?byBrand[0][1]:1;

  const colorMap={};
  resolvedOwned.forEach(d=>{if(d.pColor)colorMap[d.pColor]=(colorMap[d.pColor]||0)+1;});
  const byColor=Object.entries(colorMap).sort((a,b)=>b[1]-a[1]);

  const plasticMap={};
  resolvedOwned.forEach(d=>{if(d.pPlastic){const k=d.pPlastic.trim();plasticMap[k]=(plasticMap[k]||0)+1;}});
  const byPlastic=Object.entries(plasticMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const withWeight=resolvedOwned.filter(d=>d.pWeight&&!isNaN(Number(d.pWeight)));
  const avgWeight=withWeight.length>0
    ?(withWeight.reduce((a,d)=>a+Number(d.pWeight),0)/withWeight.length).toFixed(1)
    :null;

  const stabScore=d=>d.fade-d.turn;
  const sortedByStab=[...resolvedOwned].sort((a,b)=>stabScore(b)-stabScore(a));
  const mostOver=sortedByStab[0]||null;
  const mostUnder=sortedByStab[sortedByStab.length-1]||null;
  const hasDistinctExtremes=mostOver&&mostUnder&&(mostOver.uid??mostOver.id)!==(mostUnder.uid??mostUnder.id);

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
          <div style={{fontSize:44,fontWeight:700,color:C.brand,lineHeight:1}}>{total}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:5,letterSpacing:"0.08em",
            textTransform:"uppercase"}}>discs i alt</div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
          {byType.filter(x=>x.count>0).map(({type,count})=>(
            <div key={type} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:TYPE_COLOR[type],width:72,flexShrink:0,
                letterSpacing:"0.02em"}}>{type}</span>
              <div style={{flex:1,height:5,borderRadius:3,background:C.line}}>
                <div style={{height:5,borderRadius:3,background:TYPE_COLOR[type],
                  width:`${(count/maxTypeCount)*100}%`,
                  boxShadow:`0 0 6px ${TYPE_COLOR[type]}50`}}/>
              </div>
              <span style={{fontSize:11,color:C.muted,width:20,textAlign:"right"}}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By brand */}
      <StatCard title="Mærker">
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {byBrand.map(([brand,count])=>(
            <div key={brand} style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:13,color:C.text,flex:1}}>{brand}</span>
              <div style={{width:88,height:4,borderRadius:2,background:C.line}}>
                <div style={{height:4,borderRadius:2,background:`${C.brand}70`,
                  width:`${(count/maxBrandCount)*100}%`}}/>
              </div>
              <span style={{fontSize:12,color:C.muted,width:22,textAlign:"right"}}>{count}</span>
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
                {count}
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
              <span style={{color:C.muted}}>{count}</span>
            </div>
          ))}
        </StatCard>
      )}

      {/* Weight + extremes grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {avgWeight&&(
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
            padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
              color:C.muted,marginBottom:10}}>Ø Vægt</div>
            <div style={{fontSize:26,fontWeight:700,color:C.brand}}>{avgWeight}g</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4,letterSpacing:"0.02em"}}>
              {withWeight.length} registreret
            </div>
          </div>
        )}
        {mostOver&&(
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
            padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
              color:C.muted,marginBottom:10}}>Mest overstabil</div>
            <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:3}}>{mostOver.name}</div>
            <div style={{fontSize:11,color:C.muted}}>{mostOver.brand}</div>
            <div style={{fontSize:11,color:C.putter,marginTop:4,letterSpacing:"0.02em"}}>
              Stab {stabScore(mostOver).toFixed(1)}
            </div>
          </div>
        )}
        {hasDistinctExtremes&&(
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
            padding:"14px 16px",gridColumn:avgWeight?"auto":"1 / -1"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
              color:C.muted,marginBottom:10}}>Mest understabil</div>
            <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:3}}>{mostUnder.name}</div>
            <div style={{fontSize:11,color:C.muted}}>{mostUnder.brand}</div>
            <div style={{fontSize:11,color:C.fairway,marginTop:4,letterSpacing:"0.02em"}}>
              Stab {stabScore(mostUnder).toFixed(1)}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
