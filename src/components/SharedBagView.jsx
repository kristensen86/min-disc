import { Disc3 } from "lucide-react";
import { C, TYPES } from "../constants";
import { btn, secHdr } from "./ui";
import { DiscCard } from "./DiscCard";

export function SharedBagView({bag,onClose,onAddAll}){
  return(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,overflowY:"auto"}}>
      <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px 60px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <Disc3 size={22} color={C.brand}/>
          <span style={{fontFamily:"Pacifico,cursive",fontSize:24,color:C.text,lineHeight:1}}>Min Disc</span>
        </div>
        <div style={{fontSize:12,color:C.muted,padding:"6px 10px",marginBottom:20,
          background:C.surface,borderRadius:8,border:`1px solid ${C.line}`,display:"inline-block"}}>
          Delt bag — kun læsning
        </div>
        <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:C.text}}>{bag.name}</h1>
        <div style={{fontSize:13,color:C.muted,marginBottom:18}}>{bag.discs.length} discs</div>
        <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
          <button onClick={onAddAll} style={btn("primary")}>+ Tilføj alle til mine discs</button>
          <button onClick={onClose} style={btn()}>Åbn min bag</button>
        </div>
        {TYPES.filter(t=>bag.discs.some(d=>d.type===t)).map(t=>(
          <section key={t} style={{marginBottom:18}}>
            <h2 style={secHdr(t)}>{t}</h2>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {bag.discs.filter(d=>d.type===t).map(d=>(
                <DiscCard key={d.id} disc={d}/>
              ))}
            </div>
          </section>
        ))}
        <button onClick={onClose} style={{...btn("ghost"),width:"100%",marginTop:10}}>Åbn min bag</button>
      </div>
    </div>
  );
}
