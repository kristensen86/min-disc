import { useState } from "react";
import { Disc3 } from "lucide-react";
import { supabase } from "../supabase";
import { C } from "../constants";

export function LoginScreen(){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[info,setInfo]=useState("");

  async function submit(e){
    e.preventDefault();
    setLoading(true);setError("");setInfo("");
    if(mode==="login"){
      const{error:err}=await supabase.auth.signInWithPassword({email,password});
      if(err)setError(err.message);
    }else{
      const{error:err}=await supabase.auth.signUp({email,password});
      if(err)setError(err.message);
      else setInfo("Tjek din email og klik bekræftelseslinket for at aktivere din konto.");
    }
    setLoading(false);
  }

  const inp={
    width:"100%",padding:"12px 14px",borderRadius:10,
    background:C.raised,border:`1px solid ${C.line}`,
    color:C.text,fontSize:15,outline:"none",
  };

  return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",
      alignItems:"center",justifyContent:"center",padding:20,
      fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box;}input::placeholder{color:${C.muted};}input:focus{border-color:${C.brand}!important;}`}</style>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32,justifyContent:"center"}}>
          <Disc3 size={28} color={C.brand}/>
          <span style={{fontFamily:"Pacifico,cursive",fontSize:32,color:C.text,lineHeight:1}}>Min Disc</span>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:24}}>
          <div style={{display:"flex",gap:0,marginBottom:20,
            background:C.raised,borderRadius:9,padding:3}}>
            {[["login","Log ind"],["signup","Opret konto"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setMode(k);setError("");setInfo("");}} style={{
                flex:1,padding:"8px 0",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,
                border:"none",background:mode===k?C.surface:"transparent",
                color:mode===k?C.text:C.muted}}>
                {l}
              </button>
            ))}
          </div>
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Email" required autoComplete="email" style={inp}/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Adgangskode" required minLength={6} autoComplete={mode==="login"?"current-password":"new-password"} style={inp}/>
            {error&&(
              <div style={{fontSize:13,color:C.distance,padding:"8px 12px",
                background:`${C.distance}15`,borderRadius:8,border:`1px solid ${C.distance}30`}}>
                {error}
              </div>
            )}
            {info&&(
              <div style={{fontSize:13,color:C.midrange,padding:"8px 12px",
                background:`${C.midrange}15`,borderRadius:8,border:`1px solid ${C.midrange}30`}}>
                {info}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              padding:"12px 0",borderRadius:10,cursor:loading?"not-allowed":"pointer",
              fontSize:15,fontWeight:600,border:`1px solid ${C.brand}`,
              background:loading?C.raised:C.raised,color:loading?C.muted:C.text,marginTop:4}}>
              {loading?"Vent…":mode==="login"?"Log ind":"Opret konto"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
