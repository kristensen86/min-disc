export const C = {
  bg:"#0a0f0a",surface:"#111811",raised:"#182018",line:"#1e2e1e",
  text:"#e8f0e8",muted:"#6b8f6b",brand:"#4ade80",
  putter:"#93c5fd",midrange:"#86efac",fairway:"#fdba74",distance:"#fca5a5",
};
export const TYPE_COLOR={Putter:C.putter,Midrange:C.midrange,Fairway:C.fairway,Distance:C.distance};
export const TRACE=["#4ade80","#93c5fd","#86efac","#fca5a5","#c084fc","#fdba74","#34d399","#f9a8d4"];
export const TYPES=["Putter","Midrange","Fairway","Distance"];
export const DISC_COLORS=["#ff4757","#ff6348","#ffa502","#eccc68","#2ed573","#1e90ff","#a29bfe","#fd79a8","#ffffff","#b2bec3","#636e72","#2d3436"];
export const WEAR=[["ny","Ny","#86efac"],["brugt","Brugt","#fdba74"],["beat-in","Beat in","#fca5a5"]];
export const FLIGHT_MAX_M=150;

export function typeFromSpeed(s){if(s<=3)return"Putter";if(s<=5)return"Midrange";if(s<=8)return"Fairway";return"Distance";}

export const RAW=[
  ["innova-aviar","Innova","Aviar",2,3,0,1],["discraft-luna","Discraft","Luna",3,3,0,3],
  ["dd-judge","Dynamic Discs","Judge",2,4,0,1],["discraft-zone","Discraft","Zone",4,3,0,3],
  ["innova-roc3","Innova","Roc3",5,4,0,3],["discraft-buzzz","Discraft","Buzzz",5,4,-1,1],
  ["innova-mako3","Innova","Mako3",5,5,0,0],["dd-emac-truth","Dynamic Discs","EMAC Truth",5,5,-1,1],
  ["mvp-tesla","MVP","Tesla",8,5,-1,2],["innova-leopard3","Innova","Leopard3",7,5,-2,1],
  ["innova-teebird","Innova","Teebird",7,5,0,2],["latitude-river","Latitude 64","River",7,7,-1,1],
  ["discmania-fd","Discmania","FD",7,6,-1,1],["dd-escape","Dynamic Discs","Escape",9,5,-1,2],
  ["discraft-undertaker","Discraft","Undertaker",9,5,-1,2],["innova-firebird","Innova","Firebird",9,3,0,4],
  ["innova-wraith","Innova","Wraith",11,5,-1,3],["innova-destroyer","Innova","Destroyer",12,5,-1,3],
  ["discraft-nuke","Discraft","Nuke",13,5,-1,3],["innova-tern","Innova","Tern",12,6,-3,2],
  ["innova-mamba","Innova","Mamba",11,6,-5,1],["latitude-diamond","Latitude 64","Diamond",8,6,-3,1],
];

export const FALLBACK=RAW.map(([id,brand,name,speed,glide,turn,fade])=>({
  id,brand,name,speed,glide,turn,fade,type:typeFromSpeed(speed),category:"",stability:"",pic:null,link:null,
}));
