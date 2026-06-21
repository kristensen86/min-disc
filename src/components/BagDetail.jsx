import { useState } from "react";
import { Search, Plus, Trash2, X, Pencil } from "lucide-react";
import { C, TYPES } from "../constants";
import { btn, iconBtn, secHdr, Empty } from "./ui";
import { DiscCard } from "./DiscCard";

export function BagDetail({bag,ownedDiscs,allDiscs,onBack,onRename,onDelete,onAddDisc,onRemoveDisc,onEditDisc}){
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
              {bagDiscs.filter(d=>d.type===t).map(d=>{
                const ownedInst=ownedDiscs.find(od=>od.id===d.id);
                return(
                  <DiscCard key={d.id} disc={d}
                    actions={[
                      ...(onEditDisc&&ownedInst?[{icon:Pencil,label:"Rediger disc",onClick:()=>onEditDisc(d.id),color:C.muted}]:[]),
                      {icon:Trash2,label:"Fjern fra bag",onClick:()=>onRemoveDisc(d.id),color:C.distance},
                    ]}/>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
