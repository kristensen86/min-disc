import { Disc3 } from "lucide-react";
import { C, TYPES } from "../constants";
import { btn, secHdr } from "./ui";
import { DiscCard } from "./DiscCard";

export function SharedBagView({bag,onClose,onAddAll}){
  return(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,overflowY:"auto",
      fontFamily:"'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pacifico&family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;}`}</style>
      <div style={{maxWidth:560,margin:"0 auto",padding:"24px 16px 60px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <Disc3 size={22} color={C.brand}/>
          <span style={{fontFamily:"Pacifico,cursive",fontSize:26,color:C.brand,lineHeight:1}}>BagUp</span>
        </div>
        <div style={{fontSize:12,color:C.muted,padding:"6px 12px",marginBottom:22,
          background:C.surface,borderRadius:10,border:`1px solid ${C.line}`,display:"inline-block",
          letterSpacing:"0.03em"}}>
          Delt bag — kun læsning
        </div>
        <h1 style={{margin:"0 0 5px",fontSize:22,fontWeight:700,color:C.text}}>{bag.name}</h1>
        <div style={{fontSize:13,color:C.muted,marginBottom:20,letterSpacing:"0.02em"}}>{bag.discs.length} discs</div>
        <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>
          <button onClick={onAddAll} style={btn("primary")}>+ Tilføj alle til mine discs</button>
          <button onClick={onClose} style={btn()}>Åbn min bag</button>
        </div>
        {TYPES.filter(t=>bag.discs.some(d=>d.type===t)).map(t=>(
          <section key={t} style={{marginBottom:20}}>
            <h2 style={secHdr(t)}>{t}</h2>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {bag.discs.filter(d=>d.type===t).map(d=>(
                <DiscCard key={d.id} disc={d}/>
              ))}
            </div>
          </section>
        ))}
        <button onClick={onClose} style={{...btn("ghost"),width:"100%",marginTop:12}}>Åbn min bag</button>
      </div>
    </div>
  );
}
