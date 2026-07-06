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
    width:"100%",padding:"13px 15px",borderRadius:12,
    background:C.raised,border:`1px solid ${C.line}`,
    color:C.text,fontSize:15,outline:"none",
  };

  return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",
      alignItems:"center",justifyContent:"center",padding:20,
      fontFamily:"'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        input::placeholder{color:${C.muted};}
        input:focus{border-color:${C.brand}!important;}
      `}</style>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:36,justifyContent:"center"}}>
          <Disc3 size={28} color={C.brand}/>
          <img src="/logo-horizontal.png" alt="BagUp" style={{ height: 42, width: "auto", display: "block" }}/>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:18,padding:26,
          boxShadow:`0 0 40px ${C.brand}10`}}>
          <div style={{display:"flex",gap:0,marginBottom:22,
            background:C.raised,borderRadius:11,padding:3}}>
            {[["login","Log ind"],["signup","Opret konto"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setMode(k);setError("");setInfo("");}} style={{
                flex:1,padding:"9px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,
                border:"none",background:mode===k?C.surface:"transparent",
                color:mode===k?C.text:C.muted,letterSpacing:"0.01em"}}>
                {l}
              </button>
            ))}
          </div>
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:13}}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Email" required autoComplete="email" style={inp}/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Adgangskode" required minLength={6} autoComplete={mode==="login"?"current-password":"new-password"} style={inp}/>
            {error&&(
              <div style={{fontSize:13,color:C.distance,padding:"9px 13px",
                background:`${C.distance}12`,borderRadius:10,border:`1px solid ${C.distance}30`}}>
                {error}
              </div>
            )}
            {info&&(
              <div style={{fontSize:13,color:C.midrange,padding:"9px 13px",
                background:`${C.midrange}12`,borderRadius:10,border:`1px solid ${C.midrange}30`}}>
                {info}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              padding:"13px 0",borderRadius:12,cursor:loading?"not-allowed":"pointer",
              fontSize:15,fontWeight:600,border:`1px solid ${C.brand}`,
              background:C.raised,color:loading?C.muted:C.text,marginTop:5,
              boxShadow:loading?"none":`0 2px 16px ${C.brand}20`,letterSpacing:"0.01em"}}>
              {loading?"Vent…":mode==="login"?"Log ind":"Opret konto"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
