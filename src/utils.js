import exifr from "exifr";
import { TYPES } from "./constants";

// Android camera photos carry an EXIF orientation tag that canvas ignores when
// drawing — without this, the pixels canvas sees can be sideways/upside-down
// relative to what the photo looks like, throwing off every later bbox-based crop.
function drawUpright(img, orientation) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const swapped = orientation >= 5 && orientation <= 8;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? h : w;
  canvas.height = swapped ? w : h;
  const ctx = canvas.getContext("2d");
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break; // 1, or unknown — already upright
  }
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export async function resizeImage(file, maxPx = 300) {
  let orientation = 1;
  try { orientation = (await exifr.orientation(file)) || 1; } catch { orientation = 1; }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = dataUrl;
  });

  const upright = drawUpright(img, orientation);
  const scale = Math.min(maxPx / upright.width, maxPx / upright.height, 1);
  const out = document.createElement("canvas");
  out.width = Math.round(upright.width * scale);
  out.height = Math.round(upright.height * scale);
  out.getContext("2d").drawImage(upright, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.72);
}

export function encodeBag(bag,allDiscs){
  const entries=bag.bagEntries||(bag.discIds||[]).map(id=>({discId:id}));
  const discs=entries.map(e=>allDiscs.find(d=>d.id===e.discId)).filter(Boolean)
    .map(({id,name,brand,type,speed,glide,turn,fade})=>({id,name,brand,type,speed,glide,turn,fade}));
  return btoa(unescape(encodeURIComponent(JSON.stringify({name:bag.name,discs}))));
}

export function decodeBag(enc){
  try{return JSON.parse(decodeURIComponent(escape(atob(enc))));}catch{return null;}
}

export function genId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

// Deterministic uid for legacy owned-array migration (discId[] -> {uid,discId}[]).
// Must produce the same uid every time for the same (discId, index) pair so the
// migration is idempotent — safe to re-run concurrently across tabs/devices.
export function legacyUid(discId, index){ return `legacy-${discId}-${index}`; }

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

export function computeStability(turn, fade) {
  const s = Number(fade) - Number(turn);
  if (s <= -3) return "Very Understable";
  if (s <= -1) return "Understable";
  if (s <= 1) return "Stable";
  if (s <= 3) return "Overstable";
  return "Very Overstable";
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
