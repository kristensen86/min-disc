import { C, TRACE, FLIGHT_MAX_M } from "../constants";

function computePath(disc,hand,geom){
  const{W,H,padX,padTop,padBottom}=geom;const{speed,glide,turn,fade}=disc;
  const cx=W/2,usableH=H-padTop-padBottom,halfW=(W-padX*2)/2;
  const reach=Math.max(0.2,Math.min(1,(speed*0.55+glide)/13));
  const xScale=halfW/0.34;
  return Array.from({length:65},(_,i)=>{
    const t=i/64;
    const turnPhase=Math.sin(Math.PI*Math.min(t/0.7,1));
    const fadeRamp=Math.pow(Math.max(0,(t-0.45)/0.55),1.8);
    let x=-turn*0.025*turnPhase-fade*0.035*fadeRamp;
    if(hand==="L")x=-x;
    return[cx+Math.max(-halfW/2,Math.min(halfW/2,x*xScale)),padTop+usableH-t*reach*usableH];
  });
}
const pathStr=pts=>pts.map(([x,y],i)=>`${i===0?"M":"L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

export function FlightChart({discs,hand,height=320,showLabels=true}){
  const W=280,H=height,padX=32,padTop=18,padBottom=26;
  const geom={W,H,padX,padTop,padBottom};
  const cx=W/2,usableH=H-padTop-padBottom;
  const distY=m=>padTop+usableH*(1-m/FLIGHT_MAX_M);
  const distMarks=[25,50,100,150];
  return(
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
      <rect x="0" y="0" width={W} height={H} rx="14" fill={C.surface} stroke={C.line}/>
      {distMarks.map(m=>(
        <line key={m} x1={padX} x2={W-padX} y1={distY(m)} y2={distY(m)}
          stroke={C.line} strokeWidth="0.5" opacity="0.4"/>
      ))}
      <line x1={cx} y1={padTop} x2={cx} y2={H-padBottom}
        stroke={C.line} strokeWidth="1" strokeDasharray="3 5" opacity="0.7"/>
      {discs.map((d,i)=>{
        const color=TRACE[i%TRACE.length],pts=computePath(d,hand,geom),end=pts[pts.length-1];
        return(
          <g key={d.id}>
            <path d={pathStr(pts)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
            <circle cx={end[0]} cy={end[1]} r="4.5" fill={color} stroke={C.bg} strokeWidth="1.5"/>
          </g>
        );
      })}
      <circle cx={cx} cy={H-padBottom} r="3.5" fill={C.muted}/>
      {showLabels&&(
        <>
          {distMarks.map(m=>(
            <text key={m} x={padX-3} y={distY(m)+3} fill={C.muted} fontSize="7.5" textAnchor="end">{m}m</text>
          ))}
          <text x={padX+2} y={H-padBottom+10} fill={C.muted} fontSize="8" textAnchor="start">← Fade</text>
          <text x={W-padX-2} y={H-padBottom+10} fill={C.muted} fontSize="8" textAnchor="end">Turn →</text>
          <text x={cx} y={H-3} fill={C.muted} fontSize="8" textAnchor="middle" style={{letterSpacing:"0.08em"}}>UDKAST</text>
        </>
      )}
    </svg>
  );
}
