import { TYPES } from "./constants";

export function resizeImage(file,maxPx=300){
  return new Promise(resolve=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const scale=Math.min(maxPx/img.width,maxPx/img.height,1);
        const c=document.createElement("canvas");
        c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        resolve(c.toDataURL("image/jpeg",0.72));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function encodeBag(bag,allDiscs){
  const discs=bag.discIds.map(id=>allDiscs.find(d=>d.id===id)).filter(Boolean)
    .map(({id,name,brand,type,speed,glide,turn,fade})=>({id,name,brand,type,speed,glide,turn,fade}));
  return btoa(unescape(encodeURIComponent(JSON.stringify({name:bag.name,discs}))));
}

export function decodeBag(enc){
  try{return JSON.parse(decodeURIComponent(escape(atob(enc))));}catch{return null;}
}

export function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

export function emptyGenForm(){
  return{name:"Tilfældig bag",preset:"none",balanced:true,total:8,
    counts:{Putter:2,Midrange:2,Fairway:2,Distance:2},minSpeed:1,maxSpeed:14,allowDup:false,
    colors:[],maxWeight:null,brands:[]};
}

export function splitEvenly(total){
  const base=Math.floor(total/4),rem=total%4,counts={};
  TYPES.forEach((t,i)=>{counts[t]=base+(i<rem?1:0);});
  return counts;
}

export function resolveDisc(disc,overrides){
  const ov=overrides[disc.uid??disc.id];
  return ov?{...disc,...ov}:disc;
}
