import { useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Trash2 } from "lucide-react";

const C = {
  bg:"#0f1714",surface:"#18241f",raised:"#1f3029",line:"#2c4036",
  text:"#e8efe9",muted:"#8aa597",brand:"#f2c14e",
  midrange:"#5fd486",distance:"#ff6b6b",
};

function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

function today(){
  return new Date().toISOString().slice(0,10);
}

function btn(variant="default"){
  const base={padding:"10px 16px",borderRadius:11,cursor:"pointer",fontSize:14,fontWeight:600,
    border:`1px solid ${C.line}`,background:"transparent",color:C.text};
  if(variant==="primary")return{...base,border:`1px solid ${C.brand}`,background:C.raised};
  if(variant==="ghost")return{...base,border:"none",color:C.muted,padding:"6px 10px"};
  return base;
}

function NumberField({label,value,onChange,min=0,max=99}){
  return(
    <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:12,color:C.muted}}>
      {label}
      <input type="number" inputMode="numeric" value={value} min={min} max={max}
        onChange={e=>onChange(Math.max(min,Math.min(max,Number(e.target.value)||0)))}
        style={{padding:"8px 10px",background:C.raised,border:`1px solid ${C.line}`,
          borderRadius:9,color:C.text,fontSize:14,outline:"none"}}/>
    </label>
  );
}

function Empty({text}){
  return(
    <div style={{padding:"32px 20px",textAlign:"center",color:C.muted,fontSize:14,
      border:`1px dashed ${C.line}`,borderRadius:14,lineHeight:1.5}}>{text}</div>
  );
}

function ScoreBadge({diff}){
  const color=diff<0?C.midrange:diff>0?C.distance:C.text;
  const label=diff===0?"E":diff>0?"+"+diff:""+diff;
  return(
    <span style={{fontWeight:700,color,fontSize:15,minWidth:32,textAlign:"right"}}>{label}</span>
  );
}

function RoundRow({round,onDelete}){
  const filled=round.scores.filter(s=>s.strokes>0);
  const diff=filled.reduce((acc,s)=>acc+(s.strokes-s.par),0);
  const total=filled.reduce((a,s)=>a+s.strokes,0);
  const par=filled.reduce((a,s)=>a+s.par,0);
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",
      background:C.surface,border:`1px solid ${C.line}`,borderRadius:13}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:15,marginBottom:2,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{round.course}</div>
        <div style={{fontSize:12,color:C.muted}}>{round.date} · {round.holes} huller</div>
      </div>
      {filled.length>0?(
        <div style={{textAlign:"right",flexShrink:0}}>
          <ScoreBadge diff={diff}/>
          <div style={{fontSize:11,color:C.muted,marginTop:1}}>{total}/{par}</div>
        </div>
      ):(
        <span style={{fontSize:12,color:C.muted,flexShrink:0}}>Ikke startet</span>
      )}
      <button onClick={e=>{e.stopPropagation();onDelete(round.id);}} aria-label="Slet runde" style={{
        flexShrink:0,width:34,height:34,borderRadius:9,cursor:"pointer",
        background:"transparent",border:`1px solid ${C.line}`,color:C.distance,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Trash2 size={15}/>
      </button>
    </div>
  );
}

function NewRoundForm({onCreate,onCancel}){
  const[course,setCourse]=useState("");
  const[holes,setHoles]=useState(18);

  function handleCreate(){
    const name=course.trim()||"Unavngivet bane";
    const scores=Array.from({length:holes},()=>({par:3,strokes:0}));
    onCreate({id:genId(),course:name,holes,date:today(),scores});
  }

  return(
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:14,padding:16,
      display:"flex",flexDirection:"column",gap:14}}>
      <h3 style={{margin:0,fontSize:16,fontWeight:700}}>Ny runde</h3>
      <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:12,color:C.muted}}>
        Bane
        <input value={course} onChange={e=>setCourse(e.target.value)}
          placeholder="Bane-navn…"
          style={{padding:"8px 10px",background:C.raised,border:`1px solid ${C.line}`,
            borderRadius:9,color:C.text,fontSize:14,outline:"none"}}/>
      </label>
      <NumberField label="Antal huller" value={holes} onChange={v=>setHoles(Math.max(3,Math.min(21,v)))} min={3} max={21}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={handleCreate} style={{...btn("primary"),flex:1}}>Start runde</button>
        <button onClick={onCancel} style={btn()}>Annuller</button>
      </div>
    </div>
  );
}

function ScoringView({round,onSave,onBack}){
  const[scores,setScores]=useState(()=>round.scores.map(s=>({...s})));
  const[holeIdx,setHoleIdx]=useState(0);

  const hole=scores[holeIdx];
  const runningDiff=scores.slice(0,holeIdx+1).reduce((a,s)=>a+(s.strokes>0?s.strokes-s.par:0),0);
  const scoredCount=scores.filter(s=>s.strokes>0).length;
  const totalDiff=scores.reduce((a,s)=>a+(s.strokes>0?s.strokes-s.par:0),0);

  function setPar(v){setScores(ss=>ss.map((s,i)=>i===holeIdx?{...s,par:v}:s));}
  function setStrokes(v){setScores(ss=>ss.map((s,i)=>i===holeIdx?{...s,strokes:v}:s));}
  function finish(){onSave({...round,scores});}

  return(
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={onBack} style={{
          width:34,height:34,borderRadius:9,cursor:"pointer",flexShrink:0,
          background:"transparent",border:`1px solid ${C.line}`,color:C.muted,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <ChevronLeft size={17}/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:15,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{round.course}</div>
          <div style={{fontSize:12,color:C.muted}}>{round.date}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:12,color:C.muted}}>{scoredCount}/{round.holes} huller</div>
          {scoredCount>0&&<ScoreBadge diff={totalDiff}/>}
        </div>
      </div>

      {/* Hole card */}
      <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:20,
        display:"flex",flexDirection:"column",gap:18,marginBottom:14}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Flag size={16} color={C.brand}/>
            <span style={{fontWeight:700,fontSize:22}}>Hul {holeIdx+1}</span>
            <span style={{fontSize:13,color:C.muted}}>/ {round.holes}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
            <span style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Løbende</span>
            <ScoreBadge diff={runningDiff}/>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <NumberField label="Par" value={hole.par} onChange={setPar} min={2} max={6}/>
          <NumberField label="Slag" value={hole.strokes} onChange={setStrokes} min={1} max={12}/>
        </div>

        {hole.strokes>0&&(()=>{
          const d=hole.strokes-hole.par;
          const names={"-2":"Eagle","-1":"Birdie","0":"Even","1":"Bogey","2":"Dobbelt bogey"};
          const label=names[String(d)]||(d<0?`${-d} under par`:`+${d}`);
          const color=d<0?C.midrange:d>0?C.distance:C.text;
          return(
            <div style={{textAlign:"center",padding:"8px 0",borderTop:`1px solid ${C.line}`}}>
              <span style={{fontWeight:700,fontSize:16,color}}>{label}</span>
            </div>
          );
        })()}
      </div>

      {/* Navigation */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button onClick={()=>setHoleIdx(i=>Math.max(0,i-1))} disabled={holeIdx===0}
          style={{...btn(),display:"flex",alignItems:"center",gap:4,opacity:holeIdx===0?0.4:1}}>
          <ChevronLeft size={15}/>Forrige
        </button>
        <div style={{flex:1}}/>
        {holeIdx<round.holes-1?(
          <button onClick={()=>setHoleIdx(i=>Math.min(round.holes-1,i+1))}
            style={{...btn("primary"),display:"flex",alignItems:"center",gap:4}}>
            Næste<ChevronRight size={15}/>
          </button>
        ):(
          <button onClick={finish}
            style={{...btn("primary"),display:"flex",alignItems:"center",gap:4}}>
            Afslut runde
          </button>
        )}
      </div>

      {holeIdx<round.holes-1&&(
        <button onClick={finish} style={{...btn(),width:"100%",color:C.muted,fontSize:13,marginBottom:14}}>
          Afslut nu (gem delvis runde)
        </button>
      )}

      {/* Scorecard overview */}
      <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.line}`,
          fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>
          Scorecard
        </div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:0,fontSize:13}}>
          {scores.map((s,i)=>(
            <div key={i} onClick={()=>setHoleIdx(i)} style={{display:"contents",cursor:"pointer"}}>
              <div style={{padding:"7px 14px",borderBottom:`1px solid ${C.line}`,
                color:i===holeIdx?C.brand:C.muted,fontWeight:i===holeIdx?700:400}}>
                {i+1}
              </div>
              <div style={{padding:"7px 6px",borderBottom:`1px solid ${C.line}`,
                borderLeft:`1px solid ${C.line}`,color:C.muted,fontSize:11}}>
                Par {s.par}
              </div>
              <div style={{padding:"7px 10px",borderBottom:`1px solid ${C.line}`,
                borderLeft:`1px solid ${C.line}`,fontWeight:600,
                color:s.strokes>0?C.text:C.muted}}>
                {s.strokes>0?s.strokes:"—"}
              </div>
              <div style={{padding:"7px 14px",borderBottom:`1px solid ${C.line}`,
                borderLeft:`1px solid ${C.line}`,fontWeight:700,textAlign:"right",
                color:s.strokes>0?(s.strokes-s.par<0?C.midrange:s.strokes-s.par>0?C.distance:C.text):C.muted}}>
                {s.strokes>0?(s.strokes-s.par===0?"E":s.strokes-s.par>0?"+"+( s.strokes-s.par):""+( s.strokes-s.par)):"—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RoundTracker({rounds,setRounds}){
  const[showNew,setShowNew]=useState(false);
  const[scoringRound,setScoringRound]=useState(null);

  function createRound(round){
    setRounds(rs=>[round,...rs]);
    setShowNew(false);
    setScoringRound(round);
  }

  function saveScores(updatedRound){
    setRounds(rs=>rs.map(r=>r.id===updatedRound.id?updatedRound:r));
    setScoringRound(null);
  }

  function deleteRound(id){
    if(!window.confirm("Slet denne runde? Kan ikke fortrydes."))return;
    setRounds(rs=>rs.filter(r=>r.id!==id));
  }

  if(scoringRound){
    const latest=rounds.find(r=>r.id===scoringRound.id)||scoringRound;
    return(
      <ScoringView round={latest} onSave={saveScores} onBack={()=>setScoringRound(null)}/>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!showNew&&(
        <button onClick={()=>setShowNew(true)} style={btn("primary")}>
          + Ny runde
        </button>
      )}
      {showNew&&(
        <NewRoundForm onCreate={createRound} onCancel={()=>setShowNew(false)}/>
      )}
      {rounds.length===0&&!showNew?(
        <Empty text="Ingen runder endnu. Tryk '+ Ny runde' for at registrere din første runde."/>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {rounds.map(r=>(
            <div key={r.id} onClick={()=>!showNew&&setScoringRound(r)} style={{cursor:"pointer"}}>
              <RoundRow round={r} onDelete={deleteRound}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
