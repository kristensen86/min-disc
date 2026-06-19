import { supabase, getUser } from "./supabase";

export const store={
  async get(key){
    if(typeof window!=="undefined"&&window.storage){
      try{return await window.storage.get(key);}catch{return null;}
    }
    const user=getUser();
    if(supabase&&user){
      try{
        const{data}=await supabase.from("user_data").select("value")
          .eq("user_id",user.id).eq("key",key).maybeSingle();
        return data?{value:data.value}:null;
      }catch{return null;}
    }
    try{const v=localStorage.getItem("md_"+key);return v?{value:v}:null;}catch{return null;}
  },
  async set(key,value){
    if(typeof window!=="undefined"&&window.storage){
      try{return await window.storage.set(key,value);}catch{return null;}
    }
    const user=getUser();
    if(supabase&&user){
      try{
        await supabase.from("user_data")
          .upsert({user_id:user.id,key,value},{onConflict:"user_id,key"});
        return{value};
      }catch{return null;}
    }
    try{localStorage.setItem("md_"+key,value);return{value};}catch{return null;}
  },
};
