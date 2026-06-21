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

export function conditionText(c){
  const n=Number(c);
  if(n<=1)return"Ødelagt";
  if(n<=3)return"Meget brugt";
  if(n<=5)return"Brugt";
  if(n<=7)return"God stand";
  if(n<=9)return"Næsten ny";
  return"Ny disc";
}

export function saleNumber(disc){
  const g=disc.saleGroup,p=disc.salePos;
  if(!g&&!p)return"";
  return`${g??"?"}.${p??"?"}`;
}

export function salePriceStr(disc){
  const mp=disc.saleMP;
  const bin=disc.saleBIN||disc.price;
  if(mp&&bin)return`MP: ${mp}kr / BIN: ${bin}kr`;
  if(bin)return`BIN: ${bin}kr`;
  if(mp)return`MP: ${mp}kr`;
  return"DM";
}

export function salePriceStrShort(disc){
  const mp=disc.saleMP;
  const bin=disc.saleBIN||disc.price;
  if(mp&&bin)return`${mp} / ${bin}kr`;
  if(bin)return`${bin}kr`;
  if(mp)return`${mp}kr`;
  return"DM";
}

const SALE_BASE={Putter:80,Midrange:90,Fairway:110,Distance:130};
function condMult(c){
  const n=Number(c);
  if(n>=10)return 1.0;
  if(n>=8)return 0.8;
  if(n>=6)return 0.6;
  if(n>=4)return 0.4;
  return 0.2;
}
export function suggestSalePrices(disc){
  const base=SALE_BASE[disc.type]||100;
  const bin=Math.round(base*condMult(disc.condition??8));
  return{bin,mp:Math.round(bin*0.75)};
}
