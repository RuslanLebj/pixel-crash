'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const speedCtx=$('speedDial').getContext('2d');
let dialSpeed=0;
const W = 768, H = 480, keys = new Set();
const keyboardKeys = new Set(), pointerKeys = new Map();
const drivingKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight']);

const FLEET=[{"id":"dvor","name":"Дворняга","kind":"Первый хэтчбек","inspiration":"Та самая оранжевая машинка. Собственный образ.","paint":"#ee773d","shade":"#9e432a","light":"#ffc17a","shape":"hatch","half":7,"length":28,"roof":10},{"id":"kopeika","name":"Копеечка","kind":"Классический седан","inspiration":"Отсылка к ВАЗ-2101: хром, круглая оптика, простой силуэт.","paint":"#e6d09c","shade":"#9c8052","light":"#fff0c4","shape":"classic","half":8,"length":30,"roof":11},{"id":"golf","name":"Гольфстрим II","kind":"Угловатый хэтчбек","inspiration":"Отсылка к Volkswagen Golf II: короткий зад и чёрные бамперы.","paint":"#ce4f40","shade":"#7e302c","light":"#f28b69","shape":"golf","half":8,"length":26,"roof":12},{"id":"bavarian","name":"Баварец E-30","kind":"Спортивный седан","inspiration":"Отсылка к BMW E30: длинный капот и парные фары.","paint":"#6799c6","shade":"#315b83","light":"#b0d3e8","shape":"bavarian","half":8,"length":31,"roof":11},{"id":"meridian","name":"Меридиан 124","kind":"Большой седан","inspiration":"Отсылка к Mercedes-Benz W124: строгий кузов и широкая оптика.","paint":"#b6c3bb","shade":"#697c74","light":"#e8eee0","shape":"meridian","half":9,"length":34,"roof":13},{"id":"niva","name":"Нивушка 4×4","kind":"Короткий внедорожник","inspiration":"Отсылка к классической «Ниве»: широкие колёса и запаска.","paint":"#9caf6a","shade":"#52683c","light":"#d9df9e","shape":"niva","half":9,"length":27,"roof":13},{"id":"tofu","name":"Тофу-86","kind":"Купе из горных серпантинов","inspiration":"Отсылка к Toyota AE86: чёрно-белый кузов и убирающиеся фары.","paint":"#eee9d4","shade":"#8c9589","light":"#fff9e2","shape":"tofu","half":8,"length":30,"roof":10},{"id":"stuttgart","name":"Штутгарт 911","kind":"Округлый спорткар","inspiration":"Отсылка к Porsche 911: широкая корма, круглая оптика и спойлер.","paint":"#e7ba4d","shade":"#9a6b31","light":"#ffe795","shape":"sport","half":9,"length":30,"roof":10}];
let vehicleId='dvor',garageOpen=false,garageWasPlaying=false;
try{const saved=localStorage.getItem('crash-vehicle');if(FLEET.some(model=>model.id===saved))vehicleId=saved}catch{}

const palette = {brick:['#ac6144','#bf7450','#98593e'],crate:['#b78a4c','#c39c60','#a7783d'],barrel:['#b84f38'],fence:['#9f9a70'],streetLamp:['#63745d','#7f8b70','#96a087'],trafficLight:['#89917a','#63745d','#3d5146'],tree:['#557b45','#719455','#446b42']};
let objects=[], particles=[], debris=[], rings=[], scars=[], skids=[], pickups=[], popups=[], collapseQueue=[], groups=[], grid=new Map();
let car, state='ready', mode='free', invulnerable=true, remaining=90, elapsed=0, score=0, dead=0, total=0, shake=0;
let combo=0, comboTime=0, toastTime=0, last=0, muted=true, audio=null, best=0, seed=301, cleared=false, driftSmoke=0;
const soundtrack=window.CrashMusic?new window.CrashMusic({onError:()=>{syncMusicButton();message('МУЗЫКА НЕДОСТУПНА В ЭТОМ БРАУЗЕРЕ')}}):null;

// Two worlds share the driving model; the canvas is a viewport, not the world boundary.
const MAPS=[
 {id:'yard',name:'Старый промдвор',subtitle:'Компактная арена · разнести всё',w:768,h:480,spawn:[384,387],seed:301},
 {id:'city',name:'Новоград',subtitle:'Река · мосты · аэропорт · порт',w:6144,h:4608,spawn:[704,2620],seed:8041}
];
const CITY_X=Array.from({length:6},(_,i)=>192+i*512),CITY_Y=Array.from({length:6},(_,i)=>192+i*512);
let mapId='yard',worldW=W,worldH=H,mapOpen=false,mapWasPlaying=false;
let camera={x:0,y:0},cityLots=[],lastDistrict='',minimapVisible=true;
try{const saved=localStorage.getItem('crash-map');if(MAPS.some(m=>m.id===saved))mapId=saved}catch{}

// The old town is only one district. A river, superblocks and long service roads
// give the rest of Novograd its own shape instead of extending the square grid.
const CITY_RIVER=[[3550,0],[3440,650],[3720,1450],[3600,2200],[3450,2920],[3790,3600],[3700,4608]];
const CITY_BRIDGES=[{x:3264,y:1728,w:864,h:160,roadWidth:128,approach:160,name:'БОЛЬШОЙ МОСТ'},{x:3392,y:3776,w:704,h:128,roadWidth:112,approach:192,name:'ПОРТОВЫЙ МОСТ'}];
const CITY_PLACES=[
 {id:'oldtown',name:'Старый город',spawn:[704,2620],a:-Math.PI/2},
 {id:'bridge',name:'Большой мост',spawn:[3104,1728],a:0},
 {id:'airport',name:'Аэропорт',spawn:[5200,1728],a:-Math.PI/2},
 {id:'port',name:'Речной порт',spawn:[2680,3776],a:0},
 {id:'stadium',name:'Стадион «Комета»',spawn:[1728,704],a:0},
 {id:'depot',name:'Железнодорожное депо',spawn:[1440,3450],a:Math.PI/2},
 {id:'quarry',name:'Большой карьер',spawn:[4720,3480],a:Math.PI/2}
];
let cityStartId='oldtown';
try{const saved=localStorage.getItem('crash-city-start');if(CITY_PLACES.some(p=>p.id===saved))cityStartId=saved}catch{}
function cityStart(){return CITY_PLACES.find(p=>p.id===cityStartId)||CITY_PLACES[0]}
function insideStadium(x,y){return x>1790&&x<2690&&y>250&&y<1150}
function cityOldIntersection(x,y){return !insideStadium(x,y)}
function createCityRoads(){
 const roads=[],addRoad=(points,width=128,kind='street')=>roads.push({points,width,kind});
 for(const x of CITY_X){
  if(x===2240){addRoad([[x,32],[x,192]]);addRoad([[x,1216],[x,3080]])}
  else addRoad([[x,32],[x,3080]]);
 }
 for(const y of CITY_Y){
  if(y===704){addRoad([[32,y],[1728,y]]);addRoad([[2752,y],[3080,y]])}
  else addRoad([[32,y],[3080,y]]);
 }
 addRoad([[3040,2752],[2920,3100],[2680,3320],[2680,4300]],104,'avenue');
 addRoad([[704,2752],[704,3136],[1440,3320],[1600,3750],[2350,4000],[2880,4000]],112,'avenue');
 addRoad([[704,3136],[704,3400]],88,'service');
 addRoad([[1440,3320],[1440,4100]],88,'service');
 addRoad([[1600,3776],[4480,3776]],112,'avenue');
 addRoad([[2880,3776],[2880,4300]],96,'service');
 addRoad([[4400,400],[4400,2400]],104,'avenue');
 addRoad([[2752,1728],[4470,1728]],128,'avenue');
 addRoad([[4470,1728],[5200,1728]],88,'apron');
 addRoad([[5320,760],[5320,2240]],64,'taxiway');
 for(const y of [1080,2100])addRoad([[5320,y],[5572,y]],64,'taxiway');
 addRoad([[5200,1728],[5320,1728]],64,'taxiway');
 addRoad([[4400,2400],[4800,2880],[5750,3000],[5900,3550],[5680,4180],[4640,4180],[4480,4020],[4480,3520],[4320,3200],[4400,2400]],112,'avenue');
 addRoad([[5000,2880],[5000,3380],[4720,3480],[4620,3740],[4720,3990],[5200,4080],[5630,3970]],72,'dirt');
 addRoad([[4720,3480],[4800,3560],[4930,3580],[5070,3620],[5300,3780]],52,'dirt');
 for(const b of CITY_BRIDGES)addRoad([[b.x,b.y],[b.x+b.w,b.y]],b.h,'bridge');
 const raw=roads.map(r=>({...r}));
 return roads.map((r,index)=>({...r,points:citySmoothRoad(r.points,r.kind==='street'||r.kind==='bridge'?0:r.kind==='service'?90:160,p=>raw.some((other,j)=>j!==index&&other.points.slice(1).some((end,i)=>citySegmentDistance(p[0],p[1],other.points[i],end)<1)))}));
}
const CITY_ROADS=createCityRoads();
function citySegmentDistance(x,y,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
 return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
}
function cityRoadAt(x,y,extra=0){
 if(CITY_BRIDGES.some(b=>{const width=cityBridgeWidth(b,x);return width!==null&&Math.abs(y-b.y)<=width/2+extra}))return true;
 return CITY_ROADS.some(r=>r.kind!=='bridge'&&r.points.slice(1).some((p,i)=>citySegmentDistance(x,y,r.points[i],p)<=r.width/2+extra));
}
function cityBridgeWidth(b,x){
 if(x<b.x-b.approach||x>b.x+b.w+b.approach)return null;
 const t=x<b.x?(x-b.x+b.approach)/b.approach:x>b.x+b.w?(b.x+b.w+b.approach-x)/b.approach:1;
 return b.roadWidth+(b.h-b.roadWidth)*t;
}
function citySmoothRoad(points,radius,locked=()=>false){
 if(!radius||points.length<3)return points;
 const closed=points[0][0]===points.at(-1)[0]&&points[0][1]===points.at(-1)[1],input=closed?points.slice(0,-1):points,out=[];
 for(let i=0;i<input.length;i++){
  const b=input[i];if(!closed&&(i===0||i===input.length-1)||locked(b)){out.push(b);continue}
  const a=input[(i+input.length-1)%input.length],c=input[(i+1)%input.length],l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]);
  const cut=Math.min(radius,l1*.35,l2*.35),start=[b[0]-(b[0]-a[0])*cut/l1,b[1]-(b[1]-a[1])*cut/l1],end=[b[0]+(c[0]-b[0])*cut/l2,b[1]+(c[1]-b[1])*cut/l2];
  for(let j=0,n=Math.max(8,Math.ceil(cut/12));j<=n;j++){const t=j/n;out.push([start[0]*(1-t)**2+2*b[0]*t*(1-t)+end[0]*t*t,start[1]*(1-t)**2+2*b[1]*t*(1-t)+end[1]*t*t])}
 }
 if(closed)out.push(out[0]);return out;
}
function cityRoadSamples(road,start=15,spacing=48){
 const out=[];let travelled=0,next=start;
 for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length<.001)continue;
  while(next<travelled+length){const t=(next-travelled)/length;out.push({x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,dx:(b[0]-a[0])/length,dy:(b[1]-a[1])/length,d:next});next+=spacing}
  travelled+=length;
 }
 return out.filter(p=>p.d<travelled-24);
}
function cityJunctionAt(x,y,dx,dy,own){
 return CITY_ROADS.some(r=>r!==own&&r.kind!=='bridge'&&r.points.slice(1).some((b,i)=>{const a=r.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);return length>.01&&Math.abs(dx*(b[1]-a[1])/length-dy*(b[0]-a[0])/length)>.3&&citySegmentDistance(x,y,a,b)<r.width/2+14}));
}
function cityRiverCenter(y){
 for(let i=1;i<CITY_RIVER.length;i++)if(y<=CITY_RIVER[i][1]){
  const a=CITY_RIVER[i-1],b=CITY_RIVER[i];return a[0]+(b[0]-a[0])*clamp((y-a[1])/(b[1]-a[1]),0,1);
 }
 return CITY_RIVER.at(-1)[0];
}
function cityCanDrive(x,y,r=10){
 if(x<25||y<25||x>worldW-25||y>worldH-25)return false;
 if(Math.abs(x-cityRiverCenter(y))>230+r)return true;
 return CITY_BRIDGES.some(b=>x>=b.x-r&&x<=b.x+b.w+r&&Math.abs(y-b.y)<=b.h/2-r);
}
function resolveCityBank(oldX,oldY){
 if(cityCanDrive(car.x,car.y))return;
 const speed=Math.hypot(car.vx,car.vy);
 if(cityCanDrive(oldX,car.y)){car.x=oldX;car.vx*=-.22}
 else if(cityCanDrive(car.x,oldY)){car.y=oldY;car.vy*=-.22}
 else{car.x=oldX;car.y=oldY;car.vx*=-.22;car.vy*=-.22}
 if(speed>45){damage(2);shake=Math.max(shake,2);burst(car.x,car.y,'#83a5a5',4,45)}
}
function cityRoadStroke(g,road,color,extra=0,sx=1,sy=1){
 g.strokeStyle=color;g.lineWidth=(road.width+extra)*Math.min(sx,sy);g.lineCap='butt';g.lineJoin='round';g.beginPath();
 road.points.forEach((p,i)=>i?g.lineTo(p[0]*sx,p[1]*sy):g.moveTo(p[0]*sx,p[1]*sy));g.stroke();
}

// Day/night preference survives map changes; fixtures share the world destruction lifecycle.
let nightMode=false;
try{nightMode=localStorage.getItem('crash-lighting')==='night'}catch{}
let nightBlend=nightMode?1:0,environmentTime=0,streetLamps=[],trafficLights=[],nightMask=null;
function signalState(axis,offset=0,time=environmentTime){
 const phase=((time+offset)%22+22)%22;
 if(axis==='ns')return phase<8?'green':phase<10?'amber':'red';
 return phase>=11&&phase<19?'green':phase>=19&&phase<21?'amber':'red';
}
function addTrafficLight(x,y,axis,offset){
 const w=axis==='ns'?10:22,h=axis==='ns'?22:10;
 const light=add(x-w/2,y-h/2,'trafficLight',w,h);
 Object.assign(light,{axis,offset,hp:1.2});trafficLights.push(light);
}
function addStreetLamp(x,y,dir){
 const lamp=add(x-4,y-4,'streetLamp',8,8);
 Object.assign(lamp,{dir,hp:1.2});streetLamps.push(lamp);
}
function lampHead(lamp){return{x:lamp.x+lamp.w/2+lamp.dir*13,y:lamp.y+lamp.h/2-14}}
function placeCityLamp(x,y,dir){
 x=Math.round(x);y=Math.round(y);
 if(CITY_PLACES.some(p=>Math.hypot(p.spawn[0]-x,p.spawn[1]-y)<28))return;
 if(!cityCanDrive(x,y,6)||streetLamps.some(l=>Math.hypot(l.x+4-x,l.y+4-y)<100))return;
 if([...nearby(x,y,10)].some(o=>x-5<o.x+o.w&&x+5>o.x&&y-5<o.y+o.h&&y+5>o.y))return;
 addStreetLamp(x,y,dir);
}
function setupWorldLighting(){
 environmentTime=0;streetLamps=[];trafficLights=[];
 if(mapId==='yard'){
  for(const x of [96,288,480,672])for(const y of [48,432])addStreetLamp(x,y,x<W/2?1:-1);
  for(const x of [64,704])addStreetLamp(x,240,x<W/2?1:-1);
  return;
 }
 for(let col=0;col<CITY_X.length;col++)for(let row=0;row<CITY_Y.length;row++){
  const x=CITY_X[col],y=CITY_Y[row];if(!cityOldIntersection(x,y))continue;const offset=((col+row)%3)*3;
  for(const side of [-1,1]){
   addTrafficLight(x+side*75,y+side*93,'ns',offset);
   addTrafficLight(x-side*93,y+side*75,'ew',offset);
  }
 }
 // Paired poles repeat along each block. A clear corner setback prevents clusters
 // where horizontal and vertical sidewalks meet; the outer street ends are included.
 for(const x of CITY_X)for(const y0 of [CITY_Y[0]-512,...CITY_Y])for(const offset of [160,352]){
  const y=y0+offset;if(y<32||y>3080)continue;
  for(const side of [-1,1])if(cityRoadAt(x+side*75,y,20))placeCityLamp(x+side*75,y,-side);
 }
 for(const y of CITY_Y)for(const x0 of [CITY_X[0]-512,...CITY_X])for(const offset of [160,352]){
  const x=x0+offset;if(x<32||x>3080)continue;
  for(const side of [-1,1])if(cityRoadAt(x,y+side*75,20))placeCityLamp(x,y+side*75,side);
 }
 for(const road of CITY_ROADS.filter(r=>!['street','taxiway','dirt'].includes(r.kind)))for(const p of cityRoadSamples(road,100,192)){
  if(cityJunctionAt(p.x,p.y,p.dx,p.dy,road))continue;
  const offset=road.width/2+(road.kind==='bridge'?-16:12);
  for(const side of [-1,1]){const x=p.x-p.dy*offset*side,y=p.y+p.dx*offset*side;placeCityLamp(x,y,x>4000?-side:side)}
 }
 for(const y of [760,1100,1440,1880,2240])for(const x of [5060,5370])placeCityLamp(x,y,x<5200?1:-1);
 for(const lot of cityLots)if(lot.kind==='park')for(const side of [-1,1])placeCityLamp(lot.x+lot.w/2+side*62,lot.y+lot.h/2-26,-side);
}
function updateEnvironment(dt){
 if(state!=='paused')environmentTime=(environmentTime+dt)%2200;
 nightBlend+=((nightMode?1:0)-nightBlend)*(1-Math.exp(-5*dt));
 if(Math.abs(nightBlend-(nightMode?1:0))<.001)nightBlend=nightMode?1:0;
}
function syncLightingControls(){
 $('game').setAttribute('data-lighting',nightMode?'night':'day');
 $('timeToggle').textContent=nightMode?'☾ НОЧЬ':'☀ ДЕНЬ';
 $('timeToolbar').textContent=nightMode?'☾':'☀';
 for(const id of ['timeToggle','timeToolbar']){
  $(id).setAttribute('aria-pressed',String(nightMode));$(id).setAttribute('aria-label',nightMode?'Переключить на день':'Переключить на ночь');
  $(id).title=nightMode?'Переключить на день':'Переключить на ночь';
 }
}
function setNightMode(enabled){
 nightMode=!!enabled;try{localStorage.setItem('crash-lighting',nightMode?'night':'day')}catch{}
 syncLightingControls();if(state==='playing')canvas.focus();
}
function setupLightingControls(){
 for(const id of ['timeToggle','timeToolbar'])$(id).onclick=()=>setNightMode(!nightMode);
 syncLightingControls();
}
function signalBulb(light,state=signalState(light.axis,light.offset)){
 const position=state==='red'?-6:state==='amber'?0:6;
 return {x:light.x+light.w/2+(light.axis==='ew'?position:0),y:light.y+light.h/2+(light.axis==='ns'?position:0),color:state==='red'?'#ff6658':state==='amber'?'#ffd06c':'#9cf39a'};
}
function drawTrafficLight(light){
 const {axis}=light,x=light.x+light.w/2,y=light.y+light.h/2;
 rect(x+2,y+3,axis==='ns'?10:22,axis==='ns'?22:10,'#13251c66');
 rect(x-1,y+8,3,12,'#394c3d');rect(x-3,y+18,7,3,'#1c2b23');
 rect(x-(axis==='ns'?5:11),y-(axis==='ns'?11:5),axis==='ns'?10:22,axis==='ns'?22:10,'#89917a');
 rect(x-(axis==='ns'?4:10),y-(axis==='ns'?10:4),axis==='ns'?8:20,axis==='ns'?20:8,'#15231d');
 const active=signalState(axis,light.offset);
 for(const [index,state] of ['red','amber','green'].entries()){
  const p=(index-1)*6,bx=x+(axis==='ew'?p:0),by=y+(axis==='ns'?p:0);
  const dark=state==='red'?'#58322c':state==='amber'?'#5d5330':'#2f513b';
  rect(bx-2,by-2,4,4,state===active?signalBulb(light,state).color:dark);
  if(state===active)rect(bx-1,by-1,2,1,'#fff4c7');
 }
}
function drawBrokenTrafficLight(light){
 const x=light.x+light.w/2,y=light.y+light.h/2;
 // A sheared mounting base and a dark, fallen housing remain in the street.
 rect(x-3,y+18,7,3,'#26362c');rect(x-1,y+15,3,4,'#8a9380');
 rect(x-9,y+6,22,7,'#19271f66');rect(x-11,y+3,22,7,'#697767');
 rect(x-10,y+4,20,5,'#1b2923');
 for(let i=0;i<3;i++)rect(x-8+i*6,y+5,3,3,'#383f36');
 rect(x+9,y+7,9,2,'#8c9882');rect(x+1,y+3,2,4,'#9fa58c');
}
function drawStreetLamp(lamp){
 const {dir}=lamp,x=lamp.x+lamp.w/2,y=lamp.y+lamp.h/2,hx=x+dir*13,hy=y-14;
 rect(x+3,y+4,6,4,'#18281f66');rect(x-3,y+2,7,5,'#364b3d');
 rect(x-1,y-15,3,19,'#63745d');rect(Math.min(x,hx),y-16,Math.abs(hx-x)+2,3,'#7f8b70');
 rect(hx-5,hy-2,11,6,'#263c30');rect(hx-4,hy-2,9,1,'#9aab84');rect(hx-3,hy,7,2,nightBlend>.05?'#ffe9a8':'#bcb995');
}
function drawBrokenStreetLamp(lamp){
 const x=lamp.x+lamp.w/2,y=lamp.y+lamp.h/2,dir=lamp.dir;
 rect(x-3,y+2,7,5,'#364b3d');rect(x-1,y,3,4,'#96a087');
 ctx.save();ctx.translate(x,y+7);ctx.scale(dir,1);
 rect(-2,3,24,3,'#18281f66');rect(-1,0,22,3,'#63745d');rect(0,0,18,1,'#9aa58b');
 rect(18,-7,3,9,'#7f8b70');rect(15,-10,11,6,'#263c30');rect(16,-9,9,1,'#8c997c');
 rect(17,-7,3,2,'#555d4c');rect(22,-7,2,2,'#728176');ctx.restore();
}
function maskLight(g,x,y,radius,strength=1){
 const sx=(x-Math.round(camera.x))/4,sy=(y-Math.round(camera.y))/4,r=radius/4;
 const gradient=g.createRadialGradient(sx,sy,0,sx,sy,r);
 gradient.addColorStop(0,'rgba(0,0,0,'+strength+')');gradient.addColorStop(.38,'rgba(0,0,0,'+strength*.72+')');gradient.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=gradient;g.fillRect(sx-r,sy-r,r*2,r*2);
}
function maskHeadlights(g){
 const sx=(car.x-Math.round(camera.x))/4,sy=(car.y-Math.round(camera.y))/4;
 const model=vehicleModel(),front=model.length/8-1,side=(model.half-2)/4;
 maskLight(g,car.x,car.y,32,.7);
 for(const offset of [-side,side]){
  g.save();g.translate(sx,sy);g.rotate(car.a);g.translate(front,offset);
  const beam=g.createLinearGradient(0,0,40,0);beam.addColorStop(0,'rgba(0,0,0,.95)');beam.addColorStop(.45,'rgba(0,0,0,.65)');beam.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=beam;g.beginPath();g.moveTo(0,-.75);g.lineTo(40,-8);g.lineTo(40,8);g.lineTo(0,.75);g.closePath();g.fill();g.restore();
 }
}
function drawNightWindows(shown){
 for(const o of shown)if(o.alive&&o.solid){
  let index=0;
  for(let x=o.x+14;x<o.x+o.w-20;x+=24,index++)if(((o.index||0)*3+index)%4!==0){
   rect(x,o.y+o.h-9,12,5,'#d9a85a');rect(x+1,o.y+o.h-9,9,2,'#ffe5a2');rect(x+6,o.y+o.h-9,1,5,'#816637');
  }
  if(['cafe','shop','garage'].includes(o.kind)){
   ctx.fillStyle=o.kind==='cafe'?'#ffd69a':'#b4edc5';ctx.font='bold 8px monospace';ctx.fillText(o.kind==='cafe'?'CAFE':o.kind==='garage'?'GARAGE':'MARKET',o.x+18,o.y+o.h-11);
  }
 }
}
function drawWorldLighting(shown){
 if(nightBlend<=0)return;
 if(!nightMask){nightMask=document.createElement('canvas');nightMask.width=W/4;nightMask.height=H/4}
 const g=nightMask.getContext('2d');
 g.globalCompositeOperation='source-over';g.clearRect(0,0,W/4,H/4);g.fillStyle='rgba(6,13,33,'+nightBlend*.82+')';g.fillRect(0,0,W/4,H/4);
 g.globalCompositeOperation='destination-out';
 for(const lamp of streetLamps)if(lamp.alive&&visible(lamp.x,lamp.y,1,1,95)){const head=lampHead(lamp);maskLight(g,head.x,head.y+4,80,.94)}
 for(const light of trafficLights)if(light.alive&&visible(light.x,light.y,1,1,24)){const bulb=signalBulb(light);maskLight(g,bulb.x,bulb.y,19,.55)}
 for(const o of shown)if(o.alive&&o.solid&&['cafe','shop','garage'].includes(o.kind))maskLight(g,o.x+o.w/2,o.y+o.h,43,.38);
 for(const ring of rings)if(visible(ring.x,ring.y,1,1,100))maskLight(g,ring.x,ring.y,70*(1-ring.t/.6),1);
 maskHeadlights(g);
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(nightMask,0,0,W,H);ctx.restore();
 ctx.save();ctx.globalAlpha=nightBlend;
 // Warm pavement tint is deliberately faint: illumination reveals the original pixels.
 ctx.globalCompositeOperation='screen';
 for(const lamp of streetLamps)if(lamp.alive&&visible(lamp.x,lamp.y,1,1,85)){
  const head=lampHead(lamp),x=head.x,y=head.y+4,glow=ctx.createRadialGradient(x,y,0,x,y,70);
  glow.addColorStop(0,'#ffd47d24');glow.addColorStop(.6,'#f1bc630b');glow.addColorStop(1,'#e8aa5300');ctx.fillStyle=glow;ctx.fillRect(x-70,y-70,140,140);
 }
 ctx.globalCompositeOperation='source-over';drawNightWindows(shown);
 for(const lamp of streetLamps)if(lamp.alive&&visible(lamp.x,lamp.y,24,24)){const head=lampHead(lamp);rect(head.x-3,head.y,7,2,'#ffe6a5');rect(head.x-1,head.y,3,1,'#fff5d1')}
 for(const light of trafficLights)if(light.alive&&visible(light.x,light.y,24,24)){const bulb=signalBulb(light);rect(bulb.x-2,bulb.y-2,4,4,bulb.color);rect(bulb.x-1,bulb.y-1,2,1,'#fff5c8')}
 const model=vehicleModel(),front=model.length/2-2,side=model.half-2;
 ctx.save();ctx.translate(Math.round(car.x),Math.round(car.y));ctx.rotate(car.a);
 for(const y of [-side,side]){rect(front,y-1,3,3,'#fff1b8');rect(-front-2,y-1,2,3,readControls().handbrake||readControls().down?'#ff664d':'#b14338')}
 ctx.restore();ctx.restore();
}

function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}

function readControls(){return {
 up:keys.has('KeyW')||keys.has('ArrowUp'),down:keys.has('KeyS')||keys.has('ArrowDown'),
 left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),
 handbrake:keys.has('Space')||keys.has('ShiftLeft')||keys.has('ShiftRight')
}}
function updateControlDiagnostics(){
 if(car)updateInstrumentPanel();
 const controls=readControls();
 for(const name of ['up','down','left','right','handbrake']){
  const indicator=$('input-'+name);indicator.classList.toggle('pressed',!!controls[name]);indicator.setAttribute('data-pressed',String(!!controls[name]));
 }
 if(!car)return;
 const forward=car.vx*Math.cos(car.a)+car.vy*Math.sin(car.a),speed=Math.hypot(car.vx,car.vy);
 $('input-motion').textContent=speed<5?'ХОД: СТОИМ':Math.abs(forward)<12?'ХОД: БОКОМ':forward>0?'ХОД: ВПЕРЁД':'ХОД: НАЗАД';
 $('input-turn').textContent=Math.abs(car.yaw)<.12?'ВРАЩЕНИЕ: —':car.yaw>0?'ВРАЩЕНИЕ: ↻':'ВРАЩЕНИЕ: ↺';
}
function syncKey(code){
 const pressed=keyboardKeys.has(code)||[...pointerKeys.values()].includes(code);
 if(pressed)keys.add(code);else keys.delete(code);
 for(const b of document.querySelectorAll('[data-key]'))if(b.dataset.key===code)b.classList.toggle('active',pressed);
 updateControlDiagnostics();
}
function clearInput(){keyboardKeys.clear();pointerKeys.clear();keys.clear();for(const b of document.querySelectorAll('[data-key]'))b.classList.remove('active');updateControlDiagnostics()}
function nativeInput(target){return target&&(['INPUT','SELECT','TEXTAREA'].includes(target.tagName)||target.isContentEditable)}

const PROP_KINDS={
 chainFence:{w:40,h:8,hp:1.2,threshold:48,points:30,pieces:7,colors:['#819486','#94a28d','#73877b']},
 baggageCart:{w:30,h:18,hp:1,threshold:35,points:55,pieces:7,colors:['#d8b263','#9fac91','#b48256']},
 generator:{w:28,h:22,hp:1.5,threshold:65,points:85,pieces:9,colors:['#bd9956','#829f8d','#997452']},
 bench:{w:28,h:12,hp:.8,threshold:30,points:25,pieces:6,colors:['#a58a57','#b39763','#84764c']},
 bin:{w:12,h:15,hp:.7,threshold:28,points:20,pieces:5,colors:['#5b8770','#829274','#657c75']},
 rock:{w:20,h:16,hp:1.5,threshold:72,points:30,pieces:8,colors:['#898878','#a09a83','#777d70']},
 pipe:{w:36,h:16,hp:1.6,threshold:65,points:50,pieces:8,colors:['#8c9b91','#a6aaa0','#7b8a82']},
 bollard:{w:10,h:12,hp:1.2,threshold:52,points:25,pieces:4,colors:['#a29a74','#878d78','#6b7c74']},
 cone:{w:10,h:12,hp:.5,threshold:20,points:15,pieces:3,colors:['#df7e42','#e69850','#c86b3f']},
 barrier:{w:36,h:10,hp:1.2,threshold:45,points:40,pieces:6,colors:['#b5ae85','#c7bd93','#9e9d7c']},
 pallet:{w:26,h:24,hp:1,threshold:38,points:80,pieces:8,colors:['#ac824c','#b99460','#967245']},
 container:{w:80,h:34,hp:2.4,threshold:90,points:180,pieces:16,colors:['#518b80','#bd784f','#778e63']},
 parkedCar:{w:44,h:22,hp:2.1,threshold:80,points:160,pieces:12,colors:['#a0aa76','#a55945','#648a98']},
 sign:{w:24,h:12,hp:.7,threshold:28,points:35,pieces:5,colors:['#7c9a78','#a5ab83','#b99b59']},
 fuelTank:{w:40,h:40,hp:2,threshold:75,points:240,pieces:14,explosive:true,colors:['#bec2a8','#a9b49a','#8f9f8c']},
 plane:{w:112,h:128,hp:4,threshold:110,points:450,pieces:24,explosive:true,colors:['#c1c7b6','#b8c7bd','#cbd0be']},
 machine:{w:54,h:34,hp:2.2,threshold:85,points:180,pieces:14,colors:['#d3a74f','#d69940','#c6b066']}
};
function addProp(x,y,type,tone){const spec=PROP_KINDS[type],o=add(x,y,type,spec.w,spec.h);if(tone!==undefined)o.tone=tone;return o}

function add(x,y,type,w=16,h=16,group=-1){const o={x,y,w,h,type,group,hp:PROP_KINDS[type]?.hp??(type==='brick'?1.3:1),alive:true,tone:Math.floor(rand()*3),hit:0};objects.push(o);if(group>=0)groups[group].members.push(o);for(let gx=Math.floor(x/32);gx<=Math.floor((x+w)/32);gx++)for(let gy=Math.floor(y/32);gy<=Math.floor((y+h)/32);gy++){const k=gx+','+gy;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(o)}return o}
function nearby(x,y,r=15){const found=new Set();for(let gx=Math.floor((x-r)/32);gx<=Math.floor((x+r)/32);gx++)for(let gy=Math.floor((y-r)/32);gy<=Math.floor((y+r)/32);gy++)for(const o of grid.get(gx+','+gy)||[])if(o.alive)found.add(o);return found}
function wall(x,y,cols,rows){
 const group=groups.length;groups.push({members:[],lost:0,collapsed:false});
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)add(x+i*12,y+j*10,'brick',12,10,group);
}
function updateCamera(dt=0,snap=false){
 const targetX=clamp(car.x-W/2+car.vx*.22,0,Math.max(0,worldW-W));
 const targetY=clamp(car.y-H/2+car.vy*.22,0,Math.max(0,worldH-H));
 const blend=snap?1:1-Math.exp(-7*dt);
 camera.x+=(targetX-camera.x)*blend;camera.y+=(targetY-camera.y)*blend;
}
function visible(x,y,w=1,h=1,margin=48){return x+w>=camera.x-margin&&x<=camera.x+W+margin&&y+h>=camera.y-margin&&y<=camera.y+H+margin}
function visibleObjects(){
 if(mapId==='yard')return objects;
 const found=new Set();
 for(let x=Math.floor((camera.x-48)/32);x<=Math.floor((camera.x+W+48)/32);x++)
  for(let y=Math.floor((camera.y-48)/32);y<=Math.floor((camera.y+H+48)/32);y++)
   for(const o of grid.get(x+','+y)||[])found.add(o);
 return [...found];
}

function reset(){dialSpeed=0;seed=activeMap().seed;objects=[];particles=[];debris=[];rings=[];scars=[];skids=[];pickups=[];popups=[];collapseQueue=[];groups=[];grid=new Map();remaining=90;elapsed=0;score=0;dead=0;combo=0;comboTime=0;shake=0;cleared=false;driftSmoke=0;clearInput();
 const map=activeMap();worldW=map.w;worldH=map.h;cityLots=[];
 const start=mapId==='city'?cityStart():{spawn:map.spawn,a:-Math.PI/2};
 car={modelId:vehicleId,x:start.spawn[0],y:start.spawn[1],a:start.a,vx:0,vy:0,hp:100,inv:0,steer:0,yaw:0,slip:0,driftBlend:0,handbrakeActive:false,driftDirection:1};
 if(mapId==='city')buildCity();else buildYard();
 setupWorldLighting();
 total=objects.filter(o=>!o.solid).length;toastTime=0;camera={x:0,y:0};updateCamera(0,true);
 $('toast').classList.remove('show');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Пауза');updateHUD();
}

function buildYard(){
 wall(108,93,12,2);wall(108,113,2,8);wall(228,113,2,8);wall(108,193,4,2);wall(204,193,4,2);
 wall(503,86,13,2);wall(503,106,2,8);wall(635,106,2,8);wall(551,186,9,2);
 wall(105,304,2,9);wall(129,374,8,2);wall(237,314,2,8);
 wall(504,315,2,9);wall(528,385,11,2);wall(636,315,2,7);
 [[150,137],[178,137],[178,164],[558,130],[581,130],[600,158],[145,340],[175,340],[567,342],[592,342],[357,146],[382,146],[407,146],[370,171],[306,272],[330,272],[444,276],[468,276],[341,63],[365,63]].forEach(([x,y])=>add(x,y,'crate',19,19));
 [[272,130],[470,157],[290,332],[454,358],[529,240],[550,240],[570,240],[175,248],[195,248],[612,285]].forEach(([x,y])=>add(x,y,'barrel',13,17));
 for(let i=0;i<9;i++)add(332+i*13,218,'fence',11,7);
 pickups=[{x:384,y:252},{x:62,y:251},{x:705,y:252}].map(p=>({...p,alive:true}));
}

function addCityProp(x,y,type,tone,allowRoad=false){
 const p=PROP_KINDS[type],cx=x+p.w/2,cy=y+p.h/2;
 if(allowRoad&&cityRoadAt(cx,cy,-14))return;
 if(CITY_PLACES.some(place=>Math.hypot(Math.max(x-place.spawn[0],0,place.spawn[0]-x-p.w),Math.max(y-place.spawn[1],0,place.spawn[1]-y-p.h))<28))return;
 if(![[x,y],[x+p.w,y],[x,y+p.h],[x+p.w,y+p.h]].every(([px,py])=>cityCanDrive(px,py,0))||(!allowRoad&&cityRoadAt(cx,cy,16)))return;
 if([...nearby(cx,cy,Math.max(p.w,p.h)/2+12)].some(o=>x<o.x+o.w+4&&x+p.w+4>o.x&&y<o.y+o.h+4&&y+p.h+4>o.y))return;
 return addProp(x,y,type,tone);
}
function cityCargo(x,y,cols,rows,spacing=102){
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)addCityProp(x+col*spacing,y+row*62,'container',(col+row)%3);
}
function buildCityLandmarks(){
 // Stadium superblock: the central lawn is reachable through two wide entrances.
 building(1840,310,800,100,'stadium',0);building(1840,1000,800,100,'stadium',1);
 for(const x of [1840,2520]){building(x,410,120,230,'stadium',2);building(x,770,120,230,'stadium',3)}
 for(let i=0;i<18;i++){addCityProp(1870+i*40,1140,'barrier');addCityProp(1840+i*44,236,'cone')}
 for(let i=0;i<12;i++)addCityProp(1990+(i%6)*80,440+Math.floor(i/6)*490,'sign');
 // Airport: a runway longer than three viewports, apron, terminal and hangars.
 building(4510,480,620,180,'terminal',5);building(4510,800,70,70,'tower',1);
 building(4520,1120,280,260,'hangar',2);building(4520,1940,380,280,'hangar',3);
 for(const y of [850,1200,1500,1990])addCityProp(5140,y,'plane',y%3,true);
 for(const y of [720,1460,2220]){
  cityCargo(4730,y,3,2,94);
  for(let i=0;i<7;i++)addCityProp(5020+i*30,y+140,'pallet');
  for(let i=0;i<6;i++)addCityProp(5340,y+i*24,'cone',0,true);
 }
 for(let i=0;i<12;i++)addCityProp(4620+i*42,690,'parkedCar',i%3);
 for(const x of [4540,4610,4680])addCityProp(x,2300,'fuelTank');
 for(let i=0;i<16;i++)addCityProp(5420,540+i*104,'barrier',i%3,true);
 // A long railway depot and freight sidings, well south of the old town grid.
 building(320,3490,920,190,'depot',4);building(330,3310,210,120,'station',2);
 for(let row=0;row<3;row++)cityCargo(340,3840+row*90,9,1,108);
 for(let i=0;i<18;i++)addCityProp(340+i*51,3740,'pallet');
 // Port yards stay open down the middle; the banks and cranes define its outline.
 building(1810,3340,570,180,'warehouse',5);building(1850,4080,360,160,'warehouse',2);
 cityCargo(1830,3570,5,2);cityCargo(2260,4120,6,3);
 cityCargo(2800,3340,4,3);cityCargo(2860,3580,4,2);cityCargo(3000,3940,3,5);
 for(const [x,y] of [[3200,3460],[3260,4010]])building(x,y,28,32,'crane',0);
 for(let i=0;i<16;i++)addCityProp(1800+i*71,3940,'pallet');
 for(let i=0;i<10;i++)addCityProp(2410+i*72,3530,'fuelTank');
 // An open construction quarry forms an angled southern edge to the new districts.
 building(5380,3290,260,140,'warehouse',3);
 for(const [x,y,tone] of [[4760,3820,0],[4920,3970,1],[5230,3910,2],[5410,3600,0],[5570,3860,1],[4750,3580,2]])addCityProp(x,y,'machine',tone);
 for(let i=0;i<35;i++)addCityProp(4630+(i%7)*167,3560+Math.floor(i/7)*135,i%3?'pallet':'barrier',i%3);
 for(let i=0;i<12;i++)addCityProp(5140+i*50,4100,'fuelTank');
 building(5480,3650,32,32,'crane',1);building(5700,3890,32,32,'crane',1);
 // The bridge deck is permanent; rail sections, cargo and service objects break.
 for(const b of CITY_BRIDGES){
  for(let x=b.x+24;x<b.x+b.w-24;x+=48)for(const side of [-1,1])addCityProp(x,b.y+side*(b.h/2-6)-5,'barrier',0,true);
  if(b===CITY_BRIDGES[0])for(const x of [3280,4020])for(const side of [-1,1])building(x,b.y+side*116-22,32,44,'bridgeTower',side);
 }
 for(let i=0;i<14;i++){addCityProp(3030+i*84,1600,'cone',0,true);addCityProp(3020+i*84,1840,'sign',1,true)}
 // Add street life and fragile cargo throughout the original districts as well.
 for(const lot of cityLots)if(lot.kind!=='park'){
  for(let i=0;i<22;i++){
   const type=['pallet','cone','parkedCar','sign','barrier','pallet'][i%6];
   addCityProp(lot.x+8+(i*73)%292,lot.y+12+(i*97)%308,type,(i+lot.row)%3);
  }
 }
 for(const road of CITY_ROADS.filter(r=>r.kind==='avenue'))for(const p of cityRoadSamples(road,100,145)){
  if(cityJunctionAt(p.x,p.y,p.dx,p.dy,road))continue;
  for(const side of [-1,1])addCityProp(p.x-p.dy*(road.width/2+28)*side,p.y+p.dx*(road.width/2+28)*side,p.d%2?'cone':'barrier',0,true);
 }
 buildCityDetails();
 for(const p of CITY_PLACES.slice(1))pickups.push({x:p.spawn[0]+32,y:p.spawn[1]+24,alive:true});
}
function cityPolygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill()}
function cityPixelLine(x1,y1,x2,y2,width,color){
 const n=Math.ceil(Math.hypot(x2-x1,y2-y1)/Math.max(1,width/2));for(let i=0;i<=n;i++)rect(x1+(x2-x1)*i/n-width/2,y1+(y2-y1)*i/n-width/2,width,width,color);
}
function cityGroundLabel(text,x,y,size=15){ctx.fillStyle='#c8c2a477';ctx.font='bold '+size+'px monospace';ctx.fillText(text,x,y)}
function drawCityTerrain(){
 // Stair-stepped banks follow the river instead of a rectangular canal.
 for(let y=Math.max(0,Math.floor((camera.y-32)/16)*16);y<Math.min(worldH,camera.y+H+32);y+=16){
  const center=cityRiverCenter(y+8),left=Math.round(center-230);
  rect(left-28,y,516,16,'#7c8261');rect(left-12,y,484,16,'#a09c77');rect(left,y,460,16,'#30585b');
  rect(left+20,y,420,16,'#2a5057');
  for(let i=0;i<6;i++){const x=left+38+(i*71+(y*7)%51)%380;rect(x,y+4+(i*3)%11,19,1,'#5e85802e')}
 }
 if(visible(4380,320,1560,2220)){
  cityPolygon([[4440,350],[5910,350],[5980,2300],[5800,2510],[4610,2460],[4420,2290]],'#737e6b');
  rect(4840,700,590,1600,'#88917a');for(let x=4840;x<5420;x+=96)rect(x,704,1,1588,'#aeb398');
  rect(5470,480,204,1840,'#2d3b38');rect(5480,490,184,1820,'#414c46');
  for(let y=530;y<2280;y+=72){rect(5569,y,6,34,'#dad3b0');for(const x of [5473,5665])rect(x,y,3,6,nightMode?'#a1d9a0':'#76896b')}
  for(const y of [540,2200])for(let i=0;i<6;i++)rect(5500+i*23,y,10,82,'#d8d2b2');
  ctx.save();ctx.translate(5549,795);ctx.rotate(-Math.PI/2);cityGroundLabel('09',0,0,40);ctx.restore();
  ctx.save();ctx.translate(5592,2000);ctx.rotate(Math.PI/2);cityGroundLabel('27',0,0,40);ctx.restore();
  for(const y of [820,1180,1980]){rect(5030,y,330,2,'#d6bc6a');rect(5190,y-30,2,150,'#d6bc6a')}
  cityGroundLabel('NOVOGRAD  /  NVG',4740,2380,28);
 }
 if(visible(1790,250,900,900)){
  rect(1790,250,900,900,'#697c5e');rect(1964,425,552,560,'#355e3f');
  for(let y=450;y<970;y+=64)rect(1980,y,520,32,'#426e44');
  ctx.strokeStyle='#c4cc9a';ctx.lineWidth=2;ctx.strokeRect(1990,464,500,468);ctx.strokeRect(2125,464,230,62);ctx.strokeRect(2125,870,230,62);
  ctx.beginPath();ctx.moveTo(1990,698);ctx.lineTo(2490,698);ctx.stroke();ctx.beginPath();ctx.arc(2240,698,60,0,Math.PI*2);ctx.stroke();
  cityGroundLabel('КОМЕТА',2110,1180,24);
 }
 if(visible(280,3290,1100,900)){
  rect(280,3290,1100,900,'#68705b');
  for(const y of [3855,3945,4035]){
   rect(300,y-15,1030,40,'#525747');for(let x=300;x<1320;x+=14)rect(x,y-12,5,34,'#84744d');
   rect(300,y-4,1030,2,'#b0b7a0');rect(300,y+12,1030,2,'#b0b7a0');
  }
  cityGroundLabel('ГРУЗОВОЙ ВОКЗАЛ',480,4140,20);
 }
 if(visible(1760,3280,1580,1140)){
  cityPolygon([[1770,3290],[3120,3290],[3330,3470],[3290,4200],[3120,4410],[1810,4340]],'#74765e');
  for(let x=1820;x<3290;x+=96)rect(x,3330,1,980,'#8e8d70');
  for(let y=3380;y<4310;y+=96)rect(1800,y,1470,1,'#83836a');
  rect(3300,3460,18,660,'#b4ad86');for(let y=3480;y<4100;y+=56)rect(3302,y,10,14,'#3c5146');
  cityGroundLabel('РЕЧНОЙ ПОРТ',2780,4350,25);
 }
 drawQuarryTerrain();
 drawSiteGroundDetails();
}
function drawCityBridges(){
 for(const b of CITY_BRIDGES)if(visible(b.x-b.approach,b.y-b.h/2-70,b.w+b.approach*2,b.h+140)){
  // Trapezoidal approaches meet the ordinary road at its own width, then flare
  // gradually to the deck. Junctions sit beyond these straight transition zones.
  for(const side of [-1,1]){
   const roadX=side<0?b.x-b.approach:b.x+b.w+b.approach,deckX=side<0?b.x:b.x+b.w;
   for(const [color,roadPad,deckPad] of [['#92977d',15,8],['#5b695a',4,4],['#35413a',0,0]]){
    const r=b.roadWidth/2+roadPad,d=b.h/2+deckPad;
    cityPolygon([[roadX,b.y-r],[deckX,b.y-d],[deckX,b.y+d],[roadX,b.y+r]],color);
   }
   for(const edge of [-1,1])cityPixelLine(roadX,b.y+edge*(b.roadWidth/2-14),deckX,b.y+edge*(b.h/2-15),2,'#d4c997');
  }
  rect(b.x+12,b.y-b.h/2+26,b.w,b.h,'#172f324f');rect(b.x,b.y-b.h/2-8,b.w,b.h+16,'#92977d');
  rect(b.x,b.y-b.h/2-4,b.w,b.h+8,'#5b695a');rect(b.x,b.y-b.h/2,b.w,b.h,'#35413a');
  for(const side of [-1,1])rect(b.x,b.y+side*(b.h/2-15),b.w,2,'#d4c997');
  for(let x=Math.ceil((b.x-b.approach)/48)*48;x<b.x+b.w+b.approach-24;x+=48)rect(x,b.y-1,23,2,'#b7ac72');
  for(let x=b.x+20;x<b.x+b.w;x+=48)rect(x,b.y-b.h/2,2,b.h,'#87958422');
  for(const x of [b.x,b.x+b.w-3]){rect(x,b.y-b.h/2,3,b.h,'#a4a88b');rect(x+1,b.y-b.h/2,1,b.h,'#4b6053')}
  if(b===CITY_BRIDGES[0])for(const side of [-1,1]){
   const y=b.y+side*106;
   for(const [a,c] of [[b.x,3296],[3296,4036],[4036,b.x+b.w]]){
    for(let x=a;x<c;x+=16){const t=(x-a)/(c-a),sag=Math.sin(t*Math.PI)*38;
     rect(x,y+side*sag,5,5,'#c3ad77');if(x%32===0)cityPixelLine(x,y,x,y+side*sag,2,'#8e9d83');
    }
   }
  }
  cityGroundLabel(b.name,b.x+60,b.y-26,16);
 }
}
function drawLandmarkBuilding(o){
 if(!['stadium','terminal','tower','hangar','depot','station','warehouse','crane','bridgeTower'].includes(o.kind))return false;
 const {x,y,w,h,kind}=o;
 if(kind==='crane'){
  const length=o.index?220:160;rect(x+9,y+6,14,34,'#394d41');rect(x,y,w,h,'#d0aa50');rect(x+4,y+4,w-8,h-8,'#6d784f');
  cityPixelLine(x+14,y+14,x+length,y-62,8,'#c6a253');cityPixelLine(x+14,y+14,x+length,y-62,2,'#e0c37a');
  cityPixelLine(x+length,y-62,x+length,y+45,2,'#6c7d68');rect(x+length-5,y+43,11,6,'#d8bc6b');return true;
 }
 if(kind==='bridgeTower'){
  rect(x+6,y+7,w,h,'#192c3155');rect(x,y,w,h,'#b5ae83');rect(x+5,y+4,w-10,h-8,'#536c61');rect(x+11,y+8,10,h-16,'#d2c399');return true;
 }
 rect(x+8,y+10,w,h,'#18251f66');rect(x,y,w,h,'#33463b');rect(x+3,y+3,w-6,h-6,kind==='terminal'?'#89aaa0':kind==='stadium'?'#748c70':'#89907a');
 for(let yy=y+12;yy<y+h-8;yy+=14){rect(x+7,yy,w-14,2,kind==='stadium'?'#a4ad7d':'#c4c6a955');rect(x+7,yy+3,w-14,2,'#465f4e44')}
 if(kind==='terminal'){
  for(let xx=x+14;xx<x+w-12;xx+=32){rect(xx,y+h-20,23,15,'#315858');rect(xx+2,y+h-19,18,2,'#8ac0ae')}
  for(const xx of [x+90,x+310,x+500]){rect(xx,y+h-3,24,70,'#9caa8a');rect(xx+3,y+h,18,65,'#485e55')}
  cityGroundLabel('НОВОГРАД  /  АЭРОВОКЗАЛ',x+35,y+48,21);
 }else if(kind==='tower'){
  rect(x+15,y+16,w-30,h-16,'#acb39b');rect(x+3,y+3,w-6,29,'#436660');rect(x+5,y+4,w-10,3,'#9fc3ae');
  rect(x+w/2-1,y-13,2,32,'#b7b89b');rect(x+w/2-15,y-13,31,3,'#c1b98f');
 }else if(kind==='hangar'||kind==='depot'){
  rect(x+14,y+h-28,w-28,23,'#283f39');for(let xx=x+20;xx<x+w-20;xx+=18)rect(xx,y+h-26,3,19,'#7c9683');
  cityGroundLabel(kind==='hangar'?'HANGAR 0'+o.index:'NOVOGRAD / RAIL',x+20,y+35,18);
 }else if(kind==='stadium'){
  for(let xx=x+11;xx<x+w-10;xx+=16)for(let yy=y+10;yy<y+h-8;yy+=18)rect(xx,yy,8,5,(xx+yy)%3?'#b8ab6a':'#7d9c85');
 }else{cityGroundLabel(kind==='station'?'ДЕПО':'СКЛАД / 0'+o.index,x+12,y+25,14)}
 return true;
}

function airportFence(x1,y1,x2,y2){
 const vertical=x1===x2,length=Math.hypot(x2-x1,y2-y1),count=Math.ceil(length/40);
 for(let i=0;i<count;i++){
  const x=x1+(x2-x1)*i/count,y=y1+(y2-y1)*i/count;
  if(vertical&&x===4470&&y>1620&&y<1810)continue;
  const o=add(x,y,'chainFence',vertical?8:length/count,vertical?length/count:8);o.vertical=vertical;o.zone='airport';
 }
}
function buildCityDetails(){
 // Perimeter and service gate separate the airfield from the public avenue.
 airportFence(4470,320,5920,320);airportFence(5920,320,5920,2480);
 airportFence(4470,2480,5920,2480);airportFence(4470,320,4470,2480);
 building(4484,1830,52,44,'station',3);
 for(const x of [4485,4525])addProp(x,1696,'barrier');
 // Equipment has a purpose and sits beside the aircraft, not across taxiways.
 for(const y of [850,1200,1500,1990]){
  for(let i=0;i<3;i++)addCityProp(5030+i*34,y+75,'baggageCart',i,true);
  addCityProp(5110,y+6,'generator',0,true);addCityProp(5265,y+92,'cone',0,true);
 }
 for(let i=0;i<10;i++){addCityProp(4550+i*46,720,'bench',i%3);if(i%2===0)addCityProp(4560+i*46,746,'bin',0)}
 for(let i=0;i<9;i++){addCityProp(4890+i*48,2320,'pipe',i%3);addCityProp(4930+i*38,2270,'pallet',i%3)}
 // Tie-up bollards, hose reels, crates and old tyres give the quay a working edge.
 for(let i=0;i<15;i++){
  addCityProp(3250,3500+i*43,'bollard',i%3,true);
  if(i%3===0){addCityProp(3170,3510+i*43,'pipe',1);addCityProp(3130,3500+i*43,'bin',i%3)}
 }
 for(const [x,y] of [[1850,3570],[2310,3890],[3000,4240],[1240,3720],[1260,4060]]){
  for(let i=0;i<5;i++)addCityProp(x+(i%3)*34,y+Math.floor(i/3)*29,'pallet',i%3);
  addCityProp(x+110,y,'generator',1);addCityProp(x-22,y+50,'bin',2);
 }
 // Quarry clutter is clustered in spoil piles and work areas rather than a grid.
 for(const [cx,cy] of [[4770,3650],[5430,3490],[5590,3830],[5000,3960],[4820,3870]]){
  for(let i=0;i<15;i++){
   const a=i*2.39996,r=12+Math.sqrt(i)*13;addCityProp(cx+Math.cos(a)*r,cy+Math.sin(a)*r,'rock',i%3,true);
  }
 }
 for(const [x,y] of [[4750,3460],[5330,4090],[5710,3530]]){
  addCityProp(x,y,'generator',0,true);addCityProp(x+42,y+12,'pipe',1,true);addCityProp(x+28,y+45,'bin',2,true);
 }
 for(const lot of cityLots){
  for(const dx of [38,270]){addCityProp(lot.x+dx,lot.y+196,'bench');addCityProp(lot.x+dx+33,lot.y+198,'bin')}
 }
 for(const x of [1950,2470])for(const y of [650,738])addCityProp(x,y,'bin');
}

function building(x,y,w,h,kind,index){
 const o=add(x,y,'building',w,h);o.solid=true;o.hp=Infinity;o.kind=kind;o.index=index;return o;
}
function buildCity(){
 cityLots=[];
 for(let row=0;row<CITY_Y.length-1;row++)for(let col=0;col<CITY_X.length-1;col++){
  if(col>=3&&row<=1)continue;
  const x=CITY_X[col]+82,y=CITY_Y[row]+82,w=348,h=348;
  const park=(row===2&&col===3)||(row===0&&col===1)||(row===3&&col===4);
  const kind=park?'park':row>=3&&col<3?'industrial':(col+row*3)%5===0?'parking':'residential';
  cityLots.push({x,y,w,h,kind,row,col});
  if(kind==='park'){
   for(let i=0;i<16;i++){
    const tx=x+28+(i%4)*88,ty=y+28+Math.floor(i/4)*88;
    if(Math.abs(tx-(x+w/2))>28&&Math.abs(ty-(y+h/2))>28)add(tx,ty,'tree',24,24);
   }
   for(const dx of [18,w-30])for(let i=0;i<3;i++)add(x+dx,y+110+i*40,'fence',12,9);
  }else if(kind==='parking'){
   building(x+218,y+22,108,84,'shop',row*7+col);
   for(let i=0;i<6;i++){
    add(x+26+i*44,y+294,'crate',19,19);
    if(i%2===0)add(x+246+(i%3)*22,y+134,'barrel',13,17);
   }
   wall(x+20,y+326,12,1);wall(x+240,y+326,7,1);
  }else if(kind==='industrial'){
   building(x+22,y+22,210,134,'factory',row*7+col);
   building(x+22,y+224,132,100,'garage',row*7+col);
   for(let j=0;j<3;j++)for(let i=0;i<4;i++)add(x+244+i*22,y+30+j*24,'crate',19,19);
   for(let i=0;i<4;i++)add(x+210+i*22,y+270,'barrel',13,17);
   wall(x+178,y+214,2,8);wall(x+244,y+314,7,2);
  }else{
   const inset=22;
   building(x+inset,y+inset,132,108,'home',row*7+col);
   building(x+198,y+inset,128,148,(col+row)%3===0?'shop':'home',row*7+col+1);
   building(x+inset,y+222,154,104,(col+row)%4===0?'cafe':'home',row*7+col+2);
   for(let i=0;i<4;i++)add(x+212+i*26,y+254,'tree',24,24);
   for(let i=0;i<3;i++)add(x+184,y+42+i*30,'crate',19,19);
   wall(x+200,y+322,10,1);
  }
  // Keep the road network empty; obstacles sit inside the courtyards.
  if((row+col)%2===0)pickups.push({x:x+184,y:y+184,alive:true});
 }
 pickups.push({x:704,y:2560,alive:true},{x:2240,y:1728,alive:true});
 buildCityLandmarks();
}
function cityGround(){
 rect(camera.x-2,camera.y-2,W+4,H+4,'#455442');
 for(let gy=Math.floor(camera.y/32);gy<=(camera.y+H)/32;gy++)for(let gx=Math.floor(camera.x/32);gx<=(camera.x+W)/32;gx++){
  const hash=(gx*137+gy*197)>>>0;rect(gx*32+hash%23,gy*32+(hash*7)%27,3,1,hash%3?'#4c5c45':'#3e4d3b');
 }
 drawCityTerrain();
 for(const lot of cityLots)if(visible(lot.x,lot.y,lot.w,lot.h)){
  const {x,y,w,h,kind}=lot;
  rect(x-16,y-16,w+32,h+32,'#787d68');rect(x-12,y-12,w+24,h+24,'#999b80');
  rect(x,y,w,h,kind==='park'?'#586d42':kind==='parking'?'#515b50':'#68705a');
  if(kind==='park'){
   rect(x+w/2-13,y,26,h,'#aaa17b');rect(x,y+h/2-13,w,26,'#aaa17b');
   rect(x+w/2-30,y+h/2-30,60,60,'#858771');rect(x+w/2-23,y+h/2-23,46,46,'#4c7774');rect(x+w/2-17,y+h/2-17,34,34,'#709b8d');
   for(let i=0;i<4;i++){rect(x+58+i*64,y+67,18,5,'#b1a26b');rect(x+58+i*64,y+73,3,3,'#333f30')}
  }else if(kind==='parking'){
   for(let i=0;i<6;i++){rect(x+20+i*32,y+42,1,55,'#a4a17b');rect(x+20+i*32,y+42,25,1,'#a4a17b');rect(x+20+i*32,y+190,1,55,'#a4a17b');rect(x+20+i*32,y+244,25,1,'#a4a17b')}
   ctx.fillStyle='#9a9e7b';ctx.font='bold 25px monospace';ctx.fillText('P',x+84,y+155);
  }else{
   rect(x+170,y+10,18,h-20,'#535e4d');rect(x+10,y+182,w-20,19,'#535e4d');
   for(let i=0;i<9;i++)rect(x+170,y+18+i*36,18,1,'#7b8067');
  }
 }
 const roads=CITY_ROADS.filter(road=>{const xs=road.points.map(p=>p[0]),ys=road.points.map(p=>p[1]);return visible(Math.min(...xs)-90,Math.min(...ys)-90,Math.max(...xs)-Math.min(...xs)+180,Math.max(...ys)-Math.min(...ys)+180)});
 // Paint every curb before any asphalt so junctions have continuous pavement.
 for(let layer=0;layer<3;layer++)for(const road of roads){
  const airside=road.kind==='taxiway'||road.kind==='apron',dirt=road.kind==='dirt';
  const color=airside?(road.kind==='taxiway'?'#89927e':'#7f8d7c'):dirt?['#776f50','#9a8862','#ab956c'][layer]:['#92977d','#5b695a','#35413a'][layer];
  cityRoadStroke(ctx,road,color,airside?0:dirt?[14,6,0][layer]:[30,8,0][layer]);
 }
 for(const road of roads)if(road.kind==='taxiway')cityRoadStroke(ctx,road,'#cfb76a',2-road.width);
 for(const road of roads)if(!['bridge','taxiway','apron','dirt'].includes(road.kind))for(const p of cityRoadSamples(road)){
  if(!visible(p.x,p.y,24,24)||cityJunctionAt(p.x,p.y,p.dx,p.dy,road))continue;
  cityPixelLine(p.x,p.y,p.x+p.dx*21,p.y+p.dy*21,2,'#b7ac72');
 }
 for(const x of CITY_X)for(const y of CITY_Y)if(cityOldIntersection(x,y)&&visible(x-90,y-90,180,180)){
  rect(x-64,y-64,128,128,'#35413a');
  for(let i=0;i<7;i++)for(const side of [-1,1]){
   rect(x-43+i*13,y+side*78-6,7,12,'#b3b296');rect(x+side*78-6,y-43+i*13,12,7,'#b3b296');
  }
 }
 drawCityBridges();
 drawSiteSurfaceDetails();
 // Small gutters, worn asphalt, and the outside perimeter remain fixed in world space.
 for(let gy=Math.floor(camera.y/48);gy<=(camera.y+H)/48;gy++)for(let gx=Math.floor(camera.x/48);gx<=(camera.x+W)/48;gx++){
  const h=(gx*97+gy*61)>>>0;rect(gx*48+h%31,gy*48+(h*13)%37,3,1,'#a3a38533');
 }
 rect(0,0,worldW,16,'#283b2a');rect(0,worldH-16,worldW,16,'#283b2a');rect(0,0,16,worldH,'#283b2a');rect(worldW-16,0,16,worldH,'#283b2a');
}
function drawBuilding(o){
 if(drawLandmarkBuilding(o))return;
 const {x,y,w,h,kind,index}=o;
 const roof=['#797d65','#8b7057','#677777','#927f68'][(index||0)%4];
 rect(x+8,y+10,w,h,'#18251f66');rect(x,y,w,h,'#323f36');rect(x,y,w,5,'#c0b28a');
 rect(x+3,y+5,w-6,h-12,'#9b9278');rect(x+7,y+8,w-14,h-20,roof);
 for(let sy=y+18;sy<y+h-19;sy+=14)rect(x+10,sy,w-20,1,'#263d3333');
 rect(x+8,y+8,w-16,2,'#d5c29b55');rect(x+8,y+h-15,w-16,3,'#39493b');
 for(let sx=x+14;sx<x+w-20;sx+=24){rect(sx,y+h-9,12,5,'#2a4742');rect(sx+1,y+h-9,9,1,'#8fa699')}
 const ventX=x+w-36;rect(ventX+2,y+20,20,18,'#3b4b3d');rect(ventX,y+17,20,18,'#abb29a');
 for(let i=0;i<4;i++)rect(ventX+3,y+20+i*3,14,1,'#5d7160');
 rect(x+21,y+22,12,15,'#505f4c');rect(x+20,y+20,12,14,'#a9a98a');
 const doorX=x+Math.floor(w/2)-10;rect(doorX,y+h-7,20,9,'#1b2c25');rect(doorX+3,y+h-6,14,6,'#5e7e6b');
 if(kind==='shop'||kind==='cafe'||kind==='garage'){
  const awning=kind==='cafe'?'#b1734d':kind==='garage'?'#718b67':'#629e8c';
  rect(x+12,y+h-21,w-24,14,awning);for(let sx=x+14;sx<x+w-15;sx+=12)rect(sx,y+h-21,5,14,'#dfcf9e44');
  ctx.fillStyle='#f1e1b1';ctx.font='bold 8px monospace';ctx.fillText(kind==='cafe'?'CAFE':kind==='garage'?'GARAGE':'MARKET',x+18,y+h-11);
 }else if(kind==='factory'){
  for(let sx=x+48;sx<x+w-20;sx+=34){rect(sx,y+28,19,60,'#485b53');rect(sx+2,y+30,15,56,'#819888');rect(sx+2,y+56,15,2,'#4b6456')}
  rect(x+18,y+h-28,w-36,12,'#3e5447');ctx.fillStyle='#c1bd8e';ctx.font='bold 8px monospace';ctx.fillText('NOVOGRAD / DEPOT',x+24,y+h-19);
 }
}
function drawTree(o){
 const {x,y}=o;rect(x+5,y+9,26,22,'#15281e55');rect(x+10,y+17,5,13,'#6e573b');
 rect(x+3,y+3,19,20,'#304c32');rect(x,y+8,25,11,'#3b603a');rect(x+6,y,12,23,'#477347');rect(x+5,y+4,13,5,'#69874f');rect(x+2,y+11,6,3,'#537c42');
}

function burst(x,y,color,n=10,power=80,smoke=false){for(let i=0;i<n;i++){const a=rand()*Math.PI*2,s=10+rand()*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:smoke?.7+rand()*.6:.3+rand()*.6,color,size:smoke?4+rand()*7:2+Math.floor(rand()*4),smoke})}if(particles.length>650)particles.splice(0,particles.length-650)}
function fragment(x,y,color,n,ix=0,iy=0){for(let i=0;i<n;i++){const a=rand()*Math.PI*2,s=25+rand()*85;debris.push({x,y,z:2+rand()*5,vx:Math.cos(a)*s+ix*.32,vy:Math.sin(a)*s+iy*.32,vz:45+rand()*85,w:3+Math.floor(rand()*5),h:3+Math.floor(rand()*4),a:rand()*6.28,spin:(rand()-.5)*10,life:14+rand()*8,color,cooldown:.25})}if(debris.length>280)debris.splice(0,debris.length-280)}
function damage(amount){if(immortal()||car.inv>0)return;car.hp=Math.max(0,car.hp-amount);car.inv=.25}
function destroy(o,explosive=false,ix=0,iy=0){if(!o.alive||o.solid)return;const electrical=o.type==='trafficLight'||o.type==='streetLamp',prop=PROP_KINDS[o.type];o.alive=false;dead++;combo++;comboTime=1.8;const points=(prop?.points??(o.type==='barrel'?150:o.type==='crate'?60:o.type==='trafficLight'?100:o.type==='streetLamp'?75:25))*Math.min(5,1+Math.floor(combo/8));score+=points;saveBest();const cx=o.x+o.w/2,cy=o.y+o.h/2,colors=prop?.colors||palette[o.type],color=colors[o.tone%colors.length];
 fragment(cx,cy,color,prop?.pieces||(o.type==='crate'||electrical?6:3),ix,iy);if(electrical){fragment(cx,cy,'#8bafa5',4,ix,iy);burst(cx,cy,'#ffe8a0',8,65)}burst(cx,cy,'#b7a078',4,40,true);if(o.type==='crate'||o.type==='barrel'||electrical||prop)popups.push({x:cx,y:cy,t:1,text:'+'+points});
 if(combo===8)message('КРАСИВО! КОМБО ×2');if(combo===24)message('ДВОР НЕ УЗНАТЬ! КОМБО ×4');
 if(o.group>=0){const g=groups[o.group];g.lost++;if(!g.collapsed&&g.lost/g.members.length>=.34){g.collapsed=true;let delay=.1;for(const other of g.members)if(other.alive){collapseQueue.push({o:other,t:delay});delay+=.025}burst(cx,cy,'#c4ad86',10,50,true)}}
 if(o.type==='barrel'||prop?.explosive)explode(cx,cy);
}
function explode(cx,cy){shake=Math.max(shake,9);noise(80,.35,.12,'sawtooth');scars.push({x:cx,y:cy,size:22+rand()*10});rings.push({x:cx,y:cy,t:0});burst(cx,cy,'#ffae48',28,180);burst(cx,cy,'#f5e9a5',12,210);burst(cx,cy,'#5e6250',12,65,true);
 for(const d of debris){const dx=d.x-cx,dy=d.y-cy,r=Math.hypot(dx,dy);if(r<90){const f=(1-r/90)*180;d.vx+=dx/(r||1)*f;d.vy+=dy/(r||1)*f;d.vz+=f*.6}}
 const dx=car.x-cx,dy=car.y-cy,r=Math.hypot(dx,dy);if(r<90){const push=(1-r/90)*220;car.vx+=dx/(r||1)*push;car.vy+=dy/(r||1)*push;damage(11*(1-r/110))}
 for(const o of nearby(cx,cy,90))if(!o.solid&&o.alive&&Math.hypot(o.x+o.w/2-cx,o.y+o.h/2-cy)<76)destroy(o,true,(o.x-cx)*3,(o.y-cy)*3);
}

function updateDriving(dt){
 const {up,down,left,right,handbrake}=readControls();
 let fx=Math.cos(car.a),fy=Math.sin(car.a),forward=car.vx*fx+car.vy*fy;
 const initialSpeed=Math.hypot(car.vx,car.vy),initialSide=-car.vx*fy+car.vy*fx;
 if(handbrake&&!car.handbrakeActive)car.driftDirection=Math.abs(forward)>8?Math.sign(forward):(down&&!up?-1:1);
 car.handbrakeActive=handbrake;
 const throttleDirection=up&&!down?1:down&&!up?-1:0;
 if(throttleDirection&&(initialSpeed<8||forward*throttleDirection>8&&Math.abs(initialSide)<Math.abs(forward)*.6))car.driftDirection=throttleDirection;
 // Engage quickly, then restore traction progressively over about 0.7 seconds.
 car.driftBlend+=((handbrake?1:0)-car.driftBlend)*(1-Math.exp(-(handbrake?30:4)*dt));
 car.steer+=(((right?1:0)-(left?1:0))-car.steer)*(1-Math.exp(-11*dt));
 const driftDirection=car.driftDirection||(forward<0?-1:1);
 const steeringSpeed=Math.abs(forward)*(1-car.driftBlend)+initialSpeed*car.driftBlend;
 const steeringDirection=car.driftBlend>.15?driftDirection:(forward<0?-1:1);
 const targetYaw=car.steer*(2.55+.85*car.driftBlend)*clamp(steeringSpeed/80,0,1)*steeringDirection;
 const yawResponse=12-7.5*car.driftBlend;
 car.yaw+=(targetYaw-car.yaw)*(1-Math.exp(-yawResponse*dt));
 // A sliding rear axle feeds rotation; neutral steering does not pin the drift angle.
 if(handbrake)car.yaw+=(-initialSide*driftDirection/Math.max(initialSpeed,30))*8*(initialSpeed/(initialSpeed+80))*car.driftBlend*dt;
 if(car.driftBlend>.05&&initialSpeed<30)car.yaw*=Math.exp(-(1-initialSpeed/30)*10*dt);
 car.yaw=clamp(car.yaw,-6.5,6.5);car.a+=car.yaw*dt;
 // Reproject the existing world velocity after steering: heading and travel direction stay independent.
 fx=Math.cos(car.a);fy=Math.sin(car.a);forward=car.vx*fx+car.vy*fy;let lateral=-car.vx*fy+car.vy*fx;
 const acceleration=(up?265:0)-(down?(forward>0?360:175):0);
 // Motor limits cap added acceleration, not momentum already carried by the car.
 forward=clamp(forward+acceleration*dt,Math.min(-105,forward),Math.max(245,forward));
 const normalDrag=up||down?.3:.65;
 forward*=Math.exp(-(normalDrag+(.85-normalDrag)*car.driftBlend)*dt);
 // Braking opposes travel and reaches zero without pushing the car into reverse.
 if(handbrake)forward=Math.sign(forward)*Math.max(0,Math.abs(forward)-95*car.driftBlend*dt);
 const sideBeforeGrip=lateral;
 const grip=1.15+9.35*(1-car.driftBlend)**2;
 lateral*=Math.exp(-grip*dt);
 // During exit, redirect most of the fading sideways momentum into travel
 // along the car. This preserves the flow without adding kinetic energy.
 if(!handbrake&&car.driftBlend>0){
  const carriedEnergy=(sideBeforeGrip**2-lateral**2)*.92*clamp(car.driftBlend*4,0,1);
  const direction=Math.sign(forward)||(down&&!up?-1:1);
  forward=direction*Math.sqrt(forward**2+Math.max(0,carriedEnergy));
 }
 if(handbrake&&!up&&!down&&Math.hypot(forward,lateral)<2){forward=0;lateral=0;car.yaw=0}
 car.slip=lateral;
 car.vx=fx*forward-fy*lateral;car.vy=fy*forward+fx*lateral;
 const speed=Math.hypot(car.vx,car.vy);driftSmoke-=dt;
 if((Math.abs(lateral)>22||handbrake)&&speed>55){skids.push({x:car.x-fx*8-fy*6,y:car.y-fy*8+fx*6,t:18},{x:car.x-fx*8+fy*6,y:car.y-fy*8-fx*6,t:18});if(driftSmoke<=0){driftSmoke=.065;burst(car.x-fx*11,car.y-fy*11,'#adb09a',2,15,true)}}
 if(car.hp<40&&!immortal()&&rand()<dt*9)burst(car.x+fx*9,car.y+fy*9,'#727669',1,12,true);
 const steps=Math.max(1,Math.ceil(speed*dt/4));for(let step=0;step<steps;step++){
 const oldX=car.x,oldY=car.y;
 car.x+=car.vx*dt/steps;car.y+=car.vy*dt/steps;
 if(car.x<25||car.x>worldW-25||car.y<25||car.y>worldH-25){if(car.x<25||car.x>worldW-25)car.vx*=-.45;if(car.y<25||car.y>worldH-25)car.vy*=-.45;car.x=clamp(car.x,25,worldW-25);car.y=clamp(car.y,25,worldH-25);if(speed>50){damage(4);shake=Math.max(shake,3);burst(car.x,car.y,'#e4cc7b',4,65);noise(100,.07,.03)}}
 if(mapId==='city')resolveCityBank(oldX,oldY);
 for(const o of nearby(car.x,car.y,15)){
 const nx=clamp(car.x,o.x,o.x+o.w),ny=clamp(car.y,o.y,o.y+o.h);let dx=car.x-nx,dy=car.y-ny,d=Math.hypot(dx,dy);if(d>=10)continue;
 if(o.solid){
  let ux,uy,push;
  if(d>.01){ux=dx/d;uy=dy/d;push=10-d+.2}
  else{
   const sides=[{n:car.x-o.x,x:-1,y:0},{n:o.x+o.w-car.x,x:1,y:0},{n:car.y-o.y,x:0,y:-1},{n:o.y+o.h-car.y,x:0,y:1}];
   sides.sort((a,b)=>a.n-b.n);ux=sides[0].x;uy=sides[0].y;push=sides[0].n+10.2;
  }
  car.x+=ux*push;car.y+=uy*push;const vn=car.vx*ux+car.vy*uy;
  if(vn<0){car.vx-=ux*vn*1.35;car.vy-=uy*vn*1.35}
  if(speed>45&&o.hit<=0){o.hit=.25;damage(4);shake=Math.max(shake,3);burst(nx,ny,'#b8b48a',5,50);noise(95,.09,.04)}
  continue;
 }
 const impactSpeed=Math.hypot(car.vx,car.vy),threshold=PROP_KINDS[o.type]?.threshold??(o.type==='brick'?76:34);
 if(impactSpeed>threshold){const ix=car.vx,iy=car.vy;destroy(o,false,ix,iy);car.vx*=o.type==='brick'?.91:.97;car.vy*=o.type==='brick'?.91:.97;shake=Math.max(shake,2.5);damage(o.type==='brick'?1.7:.6);noise(150+rand()*100,.055,.025)}
 else{if(d<.01){dx=car.x-(o.x+o.w/2);dy=car.y-(o.y+o.h/2);if(Math.abs(dx)>Math.abs(dy)){dx=Math.sign(dx)||1;dy=0}else{dy=Math.sign(dy)||1;dx=0}d=1}const ux=dx/d,uy=dy/d;car.x+=ux*(10-d+.2);car.y+=uy*(10-d+.2);const vn=car.vx*ux+car.vy*uy;if(vn<0){car.vx-=ux*vn*1.3;car.vy-=uy*vn*1.3}if(impactSpeed>32&&o.hit<=0){o.hp-=impactSpeed/110;o.hit=.22;burst(nx,ny,'#c3a875',3,30);if(o.hp<=0)destroy(o,false,car.vx,car.vy)}}
 }
 }
}
function updateDebris(dt){for(const d of debris){d.life-=dt;d.cooldown-=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.vz-=310*dt;d.a+=d.spin*dt;if(d.z<0){d.z=0;if(Math.abs(d.vz)>16){d.vz=-d.vz*.32;d.spin*=.6}else d.vz=0;d.vx*=.78;d.vy*=.78}const drag=Math.exp(-(d.z>0?.6:3)*dt);d.vx*=drag;d.vy*=drag;
 if(d.x<20||d.x>worldW-20){d.x=clamp(d.x,20,worldW-20);d.vx*=-.5}if(d.y<20||d.y>worldH-20){d.y=clamp(d.y,20,worldH-20);d.vy*=-.5}
 const dx=d.x-car.x,dy=d.y-car.y,r=Math.hypot(dx,dy);if(d.z<12&&r<15){const ux=dx/(r||1),uy=dy/(r||1);d.x=car.x+ux*16;d.y=car.y+uy*16;d.vx=car.vx*.7+ux*45;d.vy=car.vy*.7+uy*45;d.vz=Math.max(d.vz,35);d.spin+=2;car.vx*=.997;car.vy*=.997}
 if(d.z<13&&d.cooldown<=0&&Math.hypot(d.vx,d.vy)>70){for(const o of nearby(d.x,d.y,5)){if(d.x>o.x-3&&d.x<o.x+o.w+3&&d.y>o.y-3&&d.y<o.y+o.h+3){const force=Math.hypot(d.vx,d.vy);o.hp-=force/150;if(o.hp<=0||(o.type==='barrel'||PROP_KINDS[o.type]?.explosive)&&force>100)destroy(o,true,d.vx,d.vy);d.vx*=-.35;d.vy*=-.35;d.cooldown=.2;break}}}
 }debris=debris.filter(d=>d.life>0)}

function drawOriginalCar(){ctx.save();ctx.translate(Math.round(car.x),Math.round(car.y));ctx.rotate(car.a+Math.PI/2);
 rect(-7,-11,18,29,'#1b251b77');ctx.save();ctx.translate(-7,-5);ctx.rotate(car.steer*.42);rect(-2,-4,4,8,'#161d1a');ctx.restore();ctx.save();ctx.translate(7,-5);ctx.rotate(car.steer*.42);rect(-2,-4,4,8,'#161d1a');ctx.restore();rect(-9,7,4,7,'#161d1a');rect(5,7,4,7,'#161d1a');
 const dent=car.hp<70&&!immortal(),wreck=car.hp<35&&!immortal();const paint=car.inv>0&&Math.floor(car.inv*30)%2?'#ffcc8c':'#ee773d';rect(-7,-13,14,28,'#9e432a');rect(-7+(wreck?1:0),-12+(dent?2:0),14-(wreck?2:0),25-(dent?2:0),paint);rect(-5,-13+(dent?2:0),10,2,'#ffc17a');rect(-5,-4,10,10,'#434e43');rect(-4,-3,8,3,'#93b1a0');rect(-4,4,8,3,'#303c35');rect(-4,0,8,4,'#ee874a');rect(-7,-9,2,5,'#ffaf62');rect(-6,10,12,2,'#b95833');rect(-7,-12+(dent?2:0),3,3,'#f5e9aa');if(!wreck)rect(4,-12,3,3,'#f5e9aa');rect(-7,12,3,2,'#ed4634');rect(4,12,3,2,'#ed4634');
 if(dent){rect(-4,-9,5,2,'#8f4b2d');rect(-3,-7,2,3,'#8f4b2d');rect(1,-3,1,3,'#d7e0bf')}if(wreck){rect(0,-9,5,4,'#4a4431');rect(-7,9,3,4,'#8f4b2d')}ctx.save();ctx.rotate(wreck?.22:dent?.1:0);rect(-5,-16+(dent?3:0),10,3,'#b9bb96');ctx.restore();rect(-6,14,12,2,'#53594a');ctx.restore();
}
function vehicleModel(){return FLEET.find(model=>model.id===vehicleId)||FLEET[0]}
function drawVehicleSprite(target,model,steer=0,hp=100,flash=false){
 const r=(x,y,w,h,color)=>{target.fillStyle=color;target.fillRect(x,y,w,h)};
 const h=model.half,L=model.length,front=-Math.floor(L/2),rear=front+L;
 const dent=hp<70,wreck=hp<35,paint=flash?'#ffe0a1':model.paint;
 // Different silhouettes, wheelbases and glass areas remain legible at game scale.
 r(-h+2,front+3,h*2+2,L,'#111b1488');
 const wheelFront=front+7,wheelRear=rear-7,wide=model.shape==='niva'?4:3;
 for(const side of [-1,1]){
  target.save();target.translate(side*h,wheelFront);target.rotate(steer*.42);
  r(-wide/2,-3,wide,6,'#101812');target.restore();
  r(side*h-wide/2,wheelRear-3,wide,6,'#101812');
 }
 if(model.shape==='sport'){
  // Rounded nose, narrow cabin, broad rear arches and a raised spoiler.
  r(-h+3,front,h*2-6,L,model.shade);r(-h+1,front+3,h*2-2,L-5,model.shade);
  r(-h,front+7,h*2,L-11,paint);r(-h+2,front+2,h*2-4,L-3,paint);
  r(-5,-6,10,15,'#273d34');r(-4,-5,8,4,'#a3c2b3');r(-4,1,8,6,model.light);
  r(-7,8,14,3,model.shade);r(-9,rear-5,18,2,'#27362d');r(-8,front+3,4,3,'#fff1c4');r(4,front+3,4,3,'#fff1c4');
 }else{
  r(-h,front,h*2,L,model.shade);
  r(-h+(wreck?1:0),front+1+(dent?1:0),h*2-(wreck?2:0),L-2-(dent?1:0),paint);
  r(-h+2,front+1,h*2-4,2,model.light);
  let roofTop=model.shape==='niva'||model.shape==='golf'?-7:-5;
  if(model.shape==='tofu')roofTop=-5;
  r(-h+2,roofTop,h*2-4,model.roof,'#293c32');
  r(-h+3,roofTop+1,h*2-6,3,'#99b9ac');
  r(-h+3,roofTop+5,h*2-6,Math.max(3,model.roof-8),paint);
  r(-h+3,roofTop+model.roof-3,h*2-6,2,'#758f83');
  r(-h+1,front+4,1,L-8,model.light);r(h-2,front+5,1,L-9,model.shade);
  const chrome=model.shape==='classic'||model.shape==='meridian'?'#c5c8ac':'#29372d';
  r(-h+1,front-1,h*2-2,2,chrome);r(-h+1,rear-1,h*2-2,2,chrome);
  if(model.shape==='classic'){
   r(-h+2,front+2,3,3,'#fff1bd');r(h-5,front+2,3,3,'#fff1bd');r(-2,front+2,4,2,'#656d59');r(-5,rear-5,10,1,model.shade);
  }else if(model.shape==='bavarian'){
   for(const x of [-7,-3,2,5])r(x,front+2,2,2,'#fbefbe');
   r(-1,front+1,2,3,'#253b33');r(-6,front+6,12,1,model.shade);r(-7,rear-4,14,2,'#334c57');
  }else if(model.shape==='meridian'){
   r(-8,front+2,5,3,'#f7efc6');r(3,front+2,5,3,'#f7efc6');r(-2,front+1,4,4,'#4a5f52');r(-1,front+1,1,4,'#d4dfc8');
   r(-6,7,12,1,'#e4e7d2');r(-h-1,-1,2,3,paint);r(h-1,-1,2,3,paint);
  }else if(model.shape==='niva'){
   r(-8,front+2,4,3,'#fff1bd');r(4,front+2,4,3,'#fff1bd');r(-3,front+2,6,2,'#364833');
   r(-5,-1,10,7,model.light);r(-4,0,8,5,paint);r(-4,rear-3,8,4,'#1a281b');r(-2,rear-2,4,2,'#78876c');
  }else if(model.shape==='tofu'){
   r(-h,front+6,2,L-9,'#293b34');r(h-2,front+6,2,L-9,'#293b34');
   r(-7,front+2,5,4,'#253a32');r(2,front+2,5,4,'#253a32');r(-6,front+2,3,2,'#fff6cf');r(3,front+2,3,2,'#fff6cf');
   r(-5,5,10,5,'#68867d');r(-h,rear-4,h*2,2,'#263a32');
  }else{
   r(-h+1,front+2,4,2,'#fff0b6');r(h-5,front+2,4,2,'#fff0b6');r(-h+2,rear-5,h*2-4,2,model.shade);
   if(model.shape==='golf'){r(-6,3,12,5,'#57756a');r(-1,6,6,1,'#b0c3ab');r(-h,rear-2,h*2,3,'#1d2e24')}
  }
 }
 r(-h+1,rear-3,3,2,'#e74b35');r(h-4,rear-3,3,2,'#e74b35');
 if(dent){r(-4,front+5,5,2,model.shade);r(1,-2,1,4,'#d6dabb')}
 if(wreck){r(0,front+4,5,4,'#3f4331');r(-h,rear-6,3,4,model.shade)}
}
function drawCar(){
 if(vehicleId==='dvor'){drawOriginalCar();return}
 ctx.save();ctx.translate(Math.round(car.x),Math.round(car.y));ctx.rotate(car.a+Math.PI/2);
 drawVehicleSprite(ctx,vehicleModel(),car.steer,immortal()?100:car.hp,car.inv>0&&Math.floor(car.inv*30)%2);
 ctx.restore();
}
function drawVehiclePreview(target,model){
 const g=target.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,112,64);
 g.fillStyle='#151e12';g.fillRect(0,0,112,64);g.fillStyle='#35432c';
 for(const y of [10,53]){g.fillRect(12,y,88,1);g.fillRect(12,y===10?10:49,1,5);g.fillRect(99,y===10?10:49,1,5)}
 g.fillStyle='#1e2b1b';for(let x=18;x<100;x+=14)g.fillRect(x,31,6,1);
 g.save();g.translate(56,32);g.rotate(Math.PI/2);g.scale(2,2);drawVehicleSprite(g,model);g.restore();
}

function quarryContour(scale,level=0){
 const out=[];
 for(let i=0;i<28;i++){
  const a=i*Math.PI*2/28,rough=1+.07*Math.sin(a*3+.4)+.04*Math.cos(a*7);
  out.push([Math.round((5150+level*11+Math.cos(a)*520*scale*rough)/4)*4,Math.round((3760+level*8+Math.sin(a)*330*scale*rough)/4)*4]);
 }
 return out;
}
function drawQuarryTerrain(){
 if(!visible(4510,3330,1400,900))return;
 const colors=['#8d8466','#aa9875','#948163','#82755b','#756b56'];
 for(let i=0;i<5;i++){
  const points=quarryContour([1,.86,.7,.54,.36][i],i);
  cityPolygon(points.map(p=>[p[0],p[1]+9]),'#5d5c47');cityPolygon(points,colors[i]);
  // Broken ledges and exposed rock faces follow the pit's own outline.
  for(let j=0;j<points.length;j+=2){const a=points[j],b=points[(j+1)%points.length];cityPixelLine(a[0],a[1],b[0],b[1],2,j<14?'#c1af86':'#685d49')}
 }
 cityPolygon([[5190,3840],[5220,3828],[5274,3835],[5312,3858],[5288,3883],[5236,3888],[5196,3869]],'#65756c');
 for(let i=0;i<200;i++){
  const a=i*2.39996,r=34+(i*37)%460,x=5150+Math.cos(a)*r,y=3760+Math.sin(a)*r*.58;
  if(visible(x,y,6,6))rect(x,y,i%4+1,1,i%3?'#e0c39333':'#443d3444');
 }
 cityGroundLabel('КАРЬЕР / 04',5360,3430,17);
}
function drawSiteGroundDetails(){
 // Concrete joints, stains and service markings stay when an aircraft breaks.
 if(visible(4470,320,1450,2160)){
  for(let y=720;y<2310;y+=64)for(let x=4840;x<5420;x+=72){
   if(!visible(x,y,72,64))continue;
   rect(x,y,1,64,'#56695c33');rect(x,y,72,1,'#b5b69b44');
   if((x+y)%5===0){rect(x+18,y+20,8,2,'#47564b33');rect(x+20,y+22,13,2,'#47564b22')}
  }
  for(const y of [850,1200,1500,1990]){
   ctx.strokeStyle='#d5c483';ctx.lineWidth=2;ctx.strokeRect(5100,y-20,180,180);
   cityGroundLabel(String([850,1200,1500,1990].indexOf(y)+1).padStart(2,'0'),5108,y+8,12);
   rect(5195,y+132,2,30,'#e7ce7e');rect(5178,y+159,36,2,'#e7ce7e');
  }
  for(let i=0;i<12;i++){rect(4590+i*43,680,33,2,'#ceca9d');rect(4590+i*43,680,2,35,'#ceca9d')}
  for(const x of [5450,5685])for(let y=510;y<2310;y+=48)rect(x,y,4,3,nightMode?'#97c9ad':'#b8baa1');
  rect(4492,1876,40,6,'#bdaf77');cityGroundLabel('КПП / NVG',4490,1820,9);
 }
 if(visible(1760,3280,1580,1140)){
  for(let y=3480;y<4160;y+=48){
   rect(3280,y,12,8,'#253f3d');rect(3282,y+2,8,3,'#626d56');
   for(let i=0;i<3;i++)rect(3338+i*11,y+16+i%2,7,1,'#a6bab533');
  }
  for(let i=0;i<48;i++){const x=1810+(i*139)%1430,y=3330+(i*197)%970;if(visible(x,y,10,10)){rect(x,y,6,2,'#38473733');rect(x+2,y+2,10,1,'#38473722')}}
 }
 if(visible(280,3290,1100,900)){
  for(let i=0;i<22;i++){const x=330+i*44;rect(x,3820,6,5,'#baa680');rect(x+1,3821,4,2,'#d3c09a')}
  for(let y=3700;y<4160;y+=80)rect(1300,y,10,28,'#657161');
 }
 for(const lot of cityLots)if(visible(lot.x,lot.y,lot.w,lot.h)){
  for(const dx of [18,320]){rect(lot.x+dx,lot.y+170,11,16,'#3a4c3d');for(let i=0;i<4;i++)rect(lot.x+dx+2,lot.y+172+i*3,7,1,'#1b2e25')}
  for(let i=0;i<8;i++){const x=lot.x+15+(i*79)%308,y=lot.y+15+(i*103)%308;rect(x,y,2,1,'#bac39a66');rect(x+3,y+2,1,2,'#2a413c55')}
 }
}
function drawSiteSurfaceDetails(){
 // Aviation taxiways use yellow guidance lines; public-road striping ends at the gate.
 if(visible(4470,1650,220,150)){
  for(let i=0;i<7;i++)rect(4494,1674+i*15,24,6,'#d8d3ae');
  cityGroundLabel('SERVICE',4535,1765,11);
 }
 for(const road of CITY_ROADS)if(road.kind==='dirt')for(const p of cityRoadSamples(road,12,20))if(visible(p.x,p.y,20,20)){
  for(const side of [-1,1])rect(p.x-p.dy*side*9,p.y+p.dx*side*9,3,2,'#5e5b4633');
 }
}

function drawProp(o){
 const {x,y,w,h,type,tone}=o,color=PROP_KINDS[type].colors[tone%3];
 if(type==='plane'){const cx=x+w/2;rect(cx-5,y+10,18,h-10,'#15251e55');rect(x+8,y+59,w-8,21,'#15251e55');rect(cx-22,y+h-18,52,9,'#15251e55')}else rect(x+4,y+5,w,h,'#15251e66');
 if(type==='chainFence'){
  const length=o.vertical?h:w;ctx.save();ctx.translate(x+(o.vertical?w:0),y);if(o.vertical)ctx.rotate(Math.PI/2);
  rect(0,2,length,1,'#b3bba4');rect(0,7,length,1,color);
  for(let i=0;i<length;i+=7){cityPixelLine(i,3,Math.min(length,i+5),7,1,'#6d897e');cityPixelLine(i,7,Math.min(length,i+5),3,1,'#8ca391')}
  for(const px of [0,length-3]){rect(px,0,3,11,'#788e7e');rect(px,0,3,1,'#c5c9a7')}
  ctx.restore();
 }else if(type==='baggageCart'){
  for(const dx of [3,w-8]){rect(x+dx,y-1,5,3,'#233a30');rect(x+dx,y+h-2,5,3,'#233a30')}
  rect(x,y+2,w,h-4,'#82917e');rect(x+2,y+4,w-4,h-8,'#455c50');
  rect(x+3,y+4,9,8,color);rect(x+14,y+3,11,10,'#927654');rect(x+5,y+3,5,1,'#d5bd86');rect(x+w,y+7,7,2,'#a6af94');
 }else if(type==='generator'){
  rect(x+2,y+2,w-4,h-4,'#2d4437');rect(x+4,y+3,w-8,h-6,color);rect(x+5,y+4,9,h-8,'#40554a');
  for(let dy=6;dy<h-5;dy+=3)rect(x+6,y+dy,7,1,'#a4ad92');rect(x+17,y+5,5,5,'#253e35');rect(x+18,y+6,2,1,'#c6d593');
 }else if(type==='bench'){
  rect(x+3,y+3,3,h+2,'#394d3f');rect(x+w-6,y+3,3,h+2,'#394d3f');
  for(let i=0;i<3;i++){rect(x,y+i*4,w,3,color);rect(x+1,y+i*4,w-2,1,'#cfb483')}
 }else if(type==='bin'){
  rect(x+1,y+2,w-2,h-2,color);rect(x,y,w,3,'#b2b695');rect(x+3,y+5,w-6,2,'#29483b');rect(x+2,y+10,w-4,1,'#335543');
 }else if(type==='rock'){
  cityPolygon([[x,y+8],[x+4,y+2],[x+12,y],[x+w-1,y+6],[x+w,y+12],[x+13,y+h],[x+3,y+h-2]],color);
  cityPolygon([[x+4,y+3],[x+12,y+1],[x+17,y+6],[x+8,y+8]],'#c1baa0');rect(x+5,y+11,8,2,'#576452');
 }else if(type==='pipe'){
  for(const dy of [0,6,11]){rect(x+2,y+dy,w-4,5,color);rect(x+3,y+dy,w-6,1,'#c1c4ab');rect(x,y+dy+1,4,4,'#2c493e');rect(x+w-4,y+dy+1,4,4,'#4e6a5c')}
 }else if(type==='bollard'){
  rect(x,y+3,w,h-3,'#34493b');rect(x+2,y+1,w-4,h-1,color);rect(x-2,y+1,w+4,4,'#a39f7a');rect(x,y+1,w,1,'#c1b78d');
 }else if(type==='cone'){
  rect(x,y+h-3,w,3,'#26362a');rect(x+3,y,4,h-2,color);rect(x+1,y+6,w-2,4,color);rect(x+3,y+4,4,2,'#e9dab2');
 }else if(type==='barrier'){
  rect(x+2,y+7,5,6,'#39473c');rect(x+w-7,y+7,5,6,'#39473c');rect(x,y,w,h,color);
  for(let i=0;i<w-3;i+=10){rect(x+i,y+1,5,3,'#d78548');rect(x+i+3,y+4,5,4,'#e7d9ad')}
 }else if(type==='pallet'){
  rect(x,y+3,w,h-3,'#705332');for(let i=0;i<3;i++){rect(x+i*9,y+2,7,h,color);rect(x+i*9+1,y+3,5,2,'#d2b77b')}
  rect(x+3,y,18,15,'#ac9869');rect(x+11,y,2,15,'#d7c38c');rect(x+3,y+6,18,2,'#766240');
 }else if(type==='container'){
  rect(x,y,w,h,'#314d43');rect(x+2,y+2,w-4,h-4,color);rect(x+3,y+2,w-6,2,'#c2cbab66');
  for(let i=7;i<w-4;i+=8){rect(x+i,y+5,2,h-10,'#182e313f');rect(x+i+2,y+5,1,h-10,'#e1d4ad3a')}
  rect(x+w-13,y+3,1,h-6,'#243b36');rect(x+w-8,y+6,2,h-12,'#bac3ab');
 }else if(type==='parkedCar'){
  for(const dx of [7,w-13]){rect(x+dx,y-2,7,4,'#16231c');rect(x+dx,y+h-2,7,4,'#16231c')}
  rect(x,y+3,w,h-6,'#304137');rect(x+3,y,w-6,h,color);rect(x+13,y+3,17,h-6,'#263e3c');
  rect(x+15,y+3,11,2,'#8eaaa0');rect(x+w-4,y+4,3,4,'#e8d3a0');rect(x+w-4,y+h-8,3,4,'#e8d3a0');
 }else if(type==='sign'){
  rect(x+4,y+5,3,16,'#7c8a72');rect(x+w-7,y+5,3,16,'#7c8a72');rect(x,y,w,h,'#d4c9a0');rect(x+1,y+1,w-2,h-2,color);
  rect(x+4,y+4,w-8,2,'#e9d9a9');rect(x+w-9,y+2,3,6,'#e9d9a9');
 }else if(type==='fuelTank'){
  rect(x+3,y,w-6,h,'#3d5045');rect(x,y+5,w,h-10,color);rect(x+5,y+2,w-10,h-4,color);
  rect(x+7,y+6,w-14,3,'#e0dbc0');rect(x+5,y+h/2,w-10,3,'#8c7455');rect(x+w/2-3,y+3,6,6,'#627b6b');
 }else if(type==='plane'){
  const cx=x+w/2;
  rect(cx-9,y+5,18,h-10,color);rect(cx-5,y,10,h,'#d9dfcc');rect(cx-8,y+13,16,9,'#3e6263');
  cityPolygon([[cx-8,y+43],[x,y+69],[x+1,y+79],[cx-8,y+65]],color);cityPolygon([[cx+8,y+43],[x+w,y+69],[x+w-1,y+79],[cx+8,y+65]],color);rect(cx-20,y+72,8,17,'#647c76');rect(cx+12,y+72,8,17,'#647c76');
  rect(cx-26,y+h-25,52,9,color);rect(cx-4,y+h-29,8,26,'#c7814f');rect(cx-8,y+28,3,48,'#6d8c8588');
  for(let dy=28;dy<90;dy+=9){rect(cx-7,y+dy,2,3,'#496c69');rect(cx+5,y+dy,2,3,'#496c69')}
 }else if(type==='machine'){
  rect(x+5,y-2,w-10,9,'#27372d');rect(x+5,y+h-7,w-10,9,'#27372d');
  for(let dx=7;dx<w-8;dx+=7){rect(x+dx,y-1,3,6,'#60705b');rect(x+dx,y+h-5,3,6,'#60705b')}
  rect(x+8,y+5,w-16,h-10,color);rect(x+13,y+8,14,h-16,'#344e48');rect(x+w-11,y+10,17,5,color);
  rect(x+w+3,y+3,7,h-6,'#a9a781');rect(x+14,y+8,10,2,'#88aaa0');
 }
}
function drawPropWreck(o){
 const {x,y,w,h,type}=o;
 if(type==='plane'){
  const cx=x+w/2,cy=y+69;
  // Irregular scorch and torn airframe parts, with no rectangular foundation.
  for(let i=0;i<15;i++){const a=i*2.4,r=8+(i*13)%32;rect(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.6,7+i%5,4,'#26332c88')}
  cityPolygon([[cx-8,y+25],[cx+5,y+31],[cx+10,y+59],[cx+3,y+70],[cx-6,y+61]],'#7c8c81');
  cityPolygon([[cx-12,y+77],[cx+3,y+72],[cx+9,y+109],[cx-4,y+121]],'#8f9b89');
  cityPolygon([[cx-11,y+57],[x+6,y+74],[x+14,y+83],[cx-8,y+69]],'#aab19b');
  cityPolygon([[cx+17,y+66],[x+w-2,y+78],[x+w-14,y+87],[cx+8,y+76]],'#677e71');
  rect(cx-21,y+82,8,10,'#344c43');rect(cx+18,y+86,7,9,'#3e5548');rect(cx-2,y+108,6,11,'#9a754d');
  for(let i=0;i<8;i++)rect(x+8+(i*23)%98,y+28+(i*19)%85,3,2,i%2?'#bcc1a8':'#4c6054');return;
 }
 if(type==='chainFence'){cityPixelLine(x+2,y+4,x+w-2,y+h-3,2,'#7b9383');rect(x,y+2,4,5,'#adb397');return}
 rect(x+3,y+5,w-6,h-8,'#293c3266');
 if(['container','parkedCar','machine','fuelTank'].includes(type)){
  rect(x+5,y+h/2,w-10,4,'#536452');rect(x+8,y+5,5,h-10,'#798372');rect(x+w-15,y+8,7,h-13,'#43584b');
 }
 for(let i=0;i<5;i++)rect(x+3+(i*17)%(w-5),y+4+(i*11)%(h-5),3+i%3,2,'#94957b');
}

function ground(){if(mapId==='city'){cityGround();return}rect(0,0,W,H,'#484e39'); // Sand, concrete and old service roads.
 rect(24,24,720,432,'#555a42');rect(274,24,207,432,'#474c3a');rect(24,221,720,82,'#474c3a');
 for(let x=34;x<W-30;x+=45){rect(x,258,21,3,'#6d7050')}for(let y=40;y<H-25;y+=41){rect(377,y,3,17,'#6b6e4e')}
 // Deterministic ground texture, without moving noise.
 for(let i=0;i<1100;i++){const x=(i*127+17)%720+24,y=(i*73+29)%432+24;rect(x,y,i%3+1,1,i%3?'#62664a':'#3d4634')}
 rect(92,81,173,137,'#65674b');rect(492,74,180,138,'#62654b');rect(93,303,174,103,'#62654b');rect(493,311,180,104,'#60644a');
 // Worn parking lines and wall shadows.
 for(let i=0;i<4;i++){rect(307+i*34,337,2,53,'#777954');rect(307+i*34,337,23,2,'#777954')}rect(307,388,125,2,'#777954');
 ctx.font='bold 13px monospace';ctx.fillStyle='#858263';ctx.save();ctx.translate(417,441);ctx.rotate(Math.PI);ctx.fillText('SLOW',0,0);ctx.restore();
 for(let i=0;i<48;i++){const x=i*16;rect(x,0,14,16,'#252e25');rect(x,464,14,16,'#252e25');rect(x+2,2,11,3,'#626a4d');rect(x+2,466,11,3,'#626a4d')}for(let i=1;i<29;i++){rect(0,i*16,16,14,'#252e25');rect(752,i*16,16,14,'#252e25');rect(2,i*16+1,3,12,'#626a4d');rect(754,i*16+1,3,12,'#626a4d')}
 // Small tufts, industrial markings and gutters.
 for(let i=0;i<60;i++){const x=32+(i*137)%702,y=27+(i*197)%426;if(x<80||x>690||y<65||y>423){rect(x,y,3,5,'#75824c');rect(x-3,y+3,3,2,'#687747')}}
 for(const [x,y] of [[62,102],[704,387],[58,394],[706,75]]){rect(x,y,15,22,'#303b2f');for(let j=0;j<4;j++)rect(x+3,y+3+j*5,9,2,'#171f1b')}
}
function drawObject(o){if(PROP_KINDS[o.type]){drawProp(o);return}if(o.type==='streetLamp'){drawStreetLamp(o);return}if(o.type==='trafficLight'){drawTrafficLight(o);return}if(o.type==='building'){drawBuilding(o);return}if(o.type==='tree'){drawTree(o);return}const {x,y,w,h,type,tone}=o;rect(x+3,y+4,w,h,'#222b2470');if(type==='brick'){rect(x,y,w-1,h-1,palette.brick[tone]);rect(x+1,y+1,w-3,2,'#d29462');rect(x+1,y+h-3,w-3,2,'#7e4c36');rect(x+w-3,y+2,2,h-5,'#8c4d36')}
 else if(type==='crate'){rect(x,y,w,h,'#76552f');rect(x+2,y+2,w-4,h-4,palette.crate[tone]);rect(x+3,y+4,w-6,2,'#d4ac69');rect(x+3,y+h-6,w-6,2,'#8b6637');for(let i=3;i<w-3;i+=3)rect(x+i,y+i,3,3,'#d0a05a');rect(x+1,y+1,3,3,'#e0b276');rect(x+w-4,y+h-4,2,2,'#e0b276')}
 else if(type==='barrel'){rect(x+2,y,w-4,h,'#a74832');rect(x,y+3,w,h-6,'#c15b3c');rect(x+2,y+3,3,h-6,'#e48550');rect(x,y+4,w,2,'#583f33');rect(x,y+h-6,w,2,'#583f33');rect(x+4,y+7,5,3,'#e8bf60');rect(x+4,y+1,4,2,'#e69b61')}
 else{rect(x,y,w,h,'#8d8960');rect(x+1,y+1,w-2,2,'#c2b785');rect(x+3,y+2,2,7,'#696c4d')}
}
function draw(t){ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));if(shake>0)ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ground();
 for(const s of scars){rect(s.x-s.size/2,s.y-s.size/2,s.size,s.size,'#30382b');rect(s.x-s.size*.35,s.y-s.size*.65,s.size*.7,s.size*1.3,'#343b2d')}
 for(const s of skids){ctx.globalAlpha=Math.min(.5,s.t/12);rect(s.x,s.y,3,3,'#20291f')}ctx.globalAlpha=1;
 const shown=visibleObjects();
 for(const o of shown)if(!o.alive){if(PROP_KINDS[o.type]){drawPropWreck(o);continue}if(o.type==='streetLamp'){drawBrokenStreetLamp(o);continue}if(o.type==='trafficLight'){drawBrokenTrafficLight(o);continue}rect(o.x+3,o.y+4,6,3,o.type==='barrel'?'#2b3229':'#766749');rect(o.x+o.w-4,o.y+8,3,3,'#3a3e2e')}
 for(const o of shown)if(o.alive){drawObject(o);if(o.hp<1.1){rect(o.x+3,o.y+2,2,4,'#503d2d');rect(o.x+5,o.y+5,3,2,'#503d2d')}}
 for(const p of pickups)if(p.alive&&visible(p.x,p.y,20,20)){ctx.globalAlpha=immortal()?.45:1;rect(p.x-10,p.y-8,20,18,'#263d28');rect(p.x-8,p.y-9,16,16,'#8eaf59');rect(p.x-6,p.y-7,12,12,'#bcd77f');rect(p.x-2,p.y-5,4,9,'#355337');rect(p.x-5,p.y-2,10,3,'#355337');if(Math.floor(t/650)%2)rect(p.x-5,p.y-13,10,2,'#e3ecbc')}ctx.globalAlpha=1;
 for(const d of debris)if(d.z<5)drawDebris(d);drawCar();for(const d of debris)if(d.z>=5)drawDebris(d);
 for(const r of rings){const radius=8+r.t*145;ctx.globalAlpha=(1-r.t/.6)*.85;for(let i=0;i<24;i++){const a=i*Math.PI/12;rect(r.x+Math.cos(a)*radius-3,r.y+Math.sin(a)*radius-3,6,6,r.t<.18?'#ffe5a0':'#e78a45')}if(r.t<.12){ctx.globalAlpha=(1-r.t/.12)*.6;rect(r.x-20,r.y-20,40,40,'#fff6cf')}}
 for(const p of particles){ctx.globalAlpha=clamp(p.life*(p.smoke?.45:2),0,1);rect(p.x-p.size/2,p.y-p.size/2,Math.ceil(p.size),Math.ceil(p.size),p.color)}ctx.globalAlpha=1;drawWorldLighting(shown);ctx.font='bold 11px monospace';ctx.textAlign='center';for(const p of popups){ctx.globalAlpha=Math.min(1,p.t*2);ctx.fillStyle='#f4e8b6';ctx.fillText(p.text,p.x,p.y)}ctx.globalAlpha=1;ctx.textAlign='left';ctx.restore();
}
function drawDebris(d){ctx.globalAlpha=Math.min(1,d.life/2);rect(d.x-d.w/2+2,d.y-d.h/2+2,d.w,d.h,'#242d2470');ctx.save();ctx.translate(Math.round(d.x),Math.round(d.y-d.z));ctx.rotate(d.a);rect(-d.w/2,-d.h/2,d.w,d.h,d.color);rect(-d.w/2,-d.h/2,d.w,1,'#e4bc7b');ctx.restore();ctx.globalAlpha=1}

function syncMusicButton(){const enabled=!!soundtrack?.enabled;$('music').setAttribute('aria-pressed',String(enabled));$('music').setAttribute('aria-label',enabled?'Выключить музыку':'Включить музыку');$('music').title=(enabled?'Выключить':'Включить')+' музыку «Ночная смена» · 92 BPM';$('music').classList.toggle('music-on',enabled)}
function noise(freq,duration,volume=.06,type='square'){if(muted)return;try{if(!audio)audio=new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq/4),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}

// Tiny bitmap glyphs keep the instrument pixel-sharp, including offline.
const instrumentGlyphs={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
 '2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
 '4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
 '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],
 '8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
 'K':['101','110','100','110','101'],'M':['101','111','111','101','101'],
 'H':['101','101','111','101','101'],'/':['001','001','010','100','100'],
 'D':['110','101','101','101','110'],'N':['10001','11001','10101','10011','10001'],
 'R':['110','101','110','101','101'],
 'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],
 'C':['111','100','100','100','111'],'E':['111','100','110','100','111'],
 'F':['111','100','110','100','100'],'G':['111','100','101','101','111'],
 'I':['111','010','010','010','111'],'L':['100','100','100','100','111'],
 'O':['111','101','101','101','111'],'P':['110','101','110','100','100'],
 'S':['111','100','111','001','111'],'T':['111','010','010','010','010'],
 'U':['101','101','101','101','111'],'V':['101','101','101','101','010'],
 'Y':['101','101','010','010','010'],':':['000','010','000','010','000'],
 '-':['000','000','111','000','000'],'%':['101','001','010','100','101'],
 '∞':['000','000','101','111','101']
};
function instrumentText(text,x,y,scale,color){
 speedCtx.fillStyle=color;
 for(const letter of text){
  const glyph=instrumentGlyphs[letter];
  if(glyph)for(let row=0;row<5;row++)for(let col=0;col<glyph[row].length;col++)if(glyph[row][col]==='1')speedCtx.fillRect(x+col*scale,y+row*scale,scale,scale);
  x+=((glyph?glyph[0].length:3)+1)*scale;
 }
}
function updateSpeedometer(){
 const speed=Math.hypot(car.vx,car.vy)*.55,forward=car.vx*Math.cos(car.a)+car.vy*Math.sin(car.a);
 $('speed').textContent=String(Math.round(speed)).padStart(3,'0');
 const direction=speed<2?'N':forward<-3?'R':forward>3?'D':'N';
 $('speedDirection').textContent=direction;
 $('speedDirection').setAttribute('aria-label',direction==='R'?'Задний ход':direction==='D'?'Вперёд':'Нейтраль');
}
function instrumentLine(x1,y1,x2,y2,color){
 speedCtx.fillStyle=color;
 const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));
 for(let i=0;i<=steps;i++)speedCtx.fillRect(Math.round(x1+(x2-x1)*i/(steps||1)),Math.round(y1+(y2-y1)*i/(steps||1)),1,1);
}
function segmentDigit(digit,x,y,color){
 const segments={0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
 const rects={a:[4,0,14,3],b:[19,4,3,12],c:[19,21,3,12],d:[4,34,14,3],e:[0,21,3,12],f:[0,4,3,12],g:[4,17,14,3]};
 for(const [name,[dx,dy,w,h]] of Object.entries(rects)){
  speedCtx.fillStyle=(segments[digit]||'').includes(name)?color:'#102820';
  speedCtx.fillRect(x+dx,y+dy,w,h);
 }
}
function instrumentRoundRect(x,y,w,h,r,color){
 // Rasterize rounded contours on the same low-resolution pixel grid as the dial.
 speedCtx.fillStyle=color;
 for(let row=0;row<h;row++){
  const edge=Math.min(row,h-1-row),dy=Math.max(0,r-edge-1);
  const inset=dy?Math.ceil(r-Math.sqrt(r*r-dy*dy)):0;
  speedCtx.fillRect(x+inset,y+row,w-inset*2,1);
 }
}
function instrumentArc(cx,cy,r,start,end,color,size=1){
 speedCtx.fillStyle=color;
 for(let degree=start;degree<=end;degree+=2){
  const angle=degree*Math.PI/180;
  speedCtx.fillRect(Math.round(cx+Math.sin(angle)*r),Math.round(cy-Math.cos(angle)*r),size,size);
 }
}
function drawSpeedometer(dt){
 const speed=Math.hypot(car.vx,car.vy)*.55,controls=readControls(),protectedCar=immortal();
 dialSpeed+=(clamp(speed,0,160)-dialSpeed)*(1-Math.exp(-12*dt));
 const cyan='#9fffd4',amber='#e6bc72',dim='#6d8066',hot=speed>=120;
 speedCtx.fillStyle='#070e0c';speedCtx.fillRect(0,0,384,112);
 // Three softly rounded instrument wells combine the original pods and VFD glass.
 for(const [x,w] of [[7,114],[128,138],[273,104]]){
  instrumentRoundRect(x,6,w,86,16,'#49523e');
  instrumentRoundRect(x+1,7,w-2,84,15,'#0b1711');
  instrumentRoundRect(x+3,9,w-6,80,13,'#09110d');
  // Static, fine-grained instrument material: gentle green-black tonal bands.
  // It is painted before every readout and never flickers or covers the digits.
  const tones=['#101e18','#0f1d17','#0e1c16','#0d1a15','#0c1914','#0b1813','#0a1712'];
  for(let y=16;y<82;y++){
   speedCtx.fillStyle=tones[Math.min(6,Math.floor((y-16)/10))];
   speedCtx.fillRect(x+10,y,w-20,1);
  }
  for(let i=0;i<54;i++){
   speedCtx.fillStyle=i%3?'#1b2b21':'#223127';
   speedCtx.fillRect(x+11+(i*37+3)%(w-22),18+(i*19+7)%61,1,1);
  }
 }
 const cx=63,cy=47;
 instrumentArc(cx,cy,38,0,360,'#3e4f3a');
 instrumentArc(cx,cy,36,-120,120,'#263c2c',2);
 instrumentArc(cx,cy,36,68,120,'#8b5836',2);
 if(dialSpeed>0)instrumentArc(cx,cy,36,-120,-120+dialSpeed*1.5,hot?'#efbb78':cyan,2);
 for(let value=0;value<=160;value+=10){
  const a=(-120+value*1.5)*Math.PI/180,major=value%40===0;
  instrumentLine(Math.round(cx+Math.sin(a)*32),Math.round(cy-Math.cos(a)*32),Math.round(cx+Math.sin(a)*(major?28:30)),Math.round(cy-Math.cos(a)*(major?28:30)),value>=130?amber:'#a6ba95');
  if(major){
   const text=String(value),x=cx+Math.sin(a)*23-text.length*2+1,y=cy-Math.cos(a)*23-2;
   instrumentText(text,Math.round(x),Math.round(y),1,dim);
  }
 }
 const angle=(-120+dialSpeed*1.5)*Math.PI/180;
 instrumentLine(Math.round(cx-Math.sin(angle)*5),Math.round(cy+Math.cos(angle)*5),Math.round(cx+Math.sin(angle)*29),Math.round(cy-Math.cos(angle)*29),'#ff995a');
 speedCtx.fillStyle='#e9c28c';speedCtx.fillRect(cx-2,cy-2,5,5);
 speedCtx.fillStyle='#543d25';speedCtx.fillRect(cx,cy,1,1);
 instrumentText('KM/H',56,62,1,amber);
 // Retain the crisp seven-segment speed display and a slim illuminated speed strip.
 instrumentText('DIGITAL SPEED',143,12,1,amber);
 const digits=String(Math.round(speed)).padStart(3,'0');
 if(digits.length<=3)for(let i=0;i<3;i++)segmentDigit(digits[i],142+i*27,25,hot?'#ffcb85':cyan);
 else instrumentText(digits,142,32,5,cyan);
 instrumentText('KM/H',225,55,1,amber);
 instrumentRoundRect(233,25,23,22,7,'#283c2c');
 instrumentRoundRect(234,26,21,20,6,'#101f16');
 const direction=$('speedDirection').textContent;
 instrumentText(direction,direction==='N'?237:240,29,3,cyan);
 for(let i=0;i<28;i++){
  speedCtx.fillStyle=dialSpeed>=(i+1)/28*160?(i>=21?amber:cyan):'#24382a';
  speedCtx.fillRect(142+i*4,69,3,3);
 }
 const seconds=Math.floor(elapsed),time=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 instrumentText('TIME',143,80,1,dim);instrumentText(time,165,80,1,cyan);
 instrumentText(mode==='free'?'FREE':'90 S',225,80,1,amber);
 // Rounded diagnostics pod: actual body condition, protection, and steering.
 const bodyColor=!protectedCar&&car.hp<30?'#ff875d':cyan;
 instrumentText('BODY',285,13,1,amber);instrumentText(protectedCar?'INF':Math.ceil(car.hp)+'%',344,13,1,bodyColor);
 instrumentLine(293,31,329,31,bodyColor);instrumentLine(293,52,329,52,bodyColor);
 instrumentLine(289,35,289,48,bodyColor);instrumentLine(333,35,333,48,bodyColor);
 instrumentLine(289,35,293,31,bodyColor);instrumentLine(289,48,293,52,bodyColor);
 instrumentLine(329,31,333,35,bodyColor);instrumentLine(329,52,333,48,bodyColor);
 instrumentLine(301,33,301,50,bodyColor);instrumentLine(317,33,321,37,bodyColor);
 instrumentLine(321,37,321,46,bodyColor);instrumentLine(321,46,317,50,bodyColor);
 for(const [x,y] of [[294,27],[320,27],[294,54],[320,54]]){speedCtx.fillStyle=dim;speedCtx.fillRect(x,y,8,3)}
 const health=protectedCar?100:car.hp;
 for(let i=0;i<10;i++){speedCtx.fillStyle=i<Math.ceil(health/10)?bodyColor:'#283b2c';speedCtx.fillRect(357,61-i*4,10,3)}
 instrumentText(protectedCar?'PROTECT':'DAMAGE',291,66,1,protectedCar?amber:dim);
 instrumentText('STEER',285,80,1,dim);
 instrumentRoundRect(312,79,55,5,2,'#2c422f');
 speedCtx.fillStyle=cyan;speedCtx.fillRect(Math.round(338+car.steer*24),78,3,7);
 // Live control lamps sit in a shared, shallow rounded rail.
 instrumentRoundRect(8,96,368,13,6,'#1e2e21');
 instrumentRoundRect(9,97,366,11,5,'#0b1510');
 const lamp=(label,x,on,color)=>{
  instrumentRoundRect(x,100,4,4,1,on?color:'#293a2c');
  instrumentText(label,x+8,100,1,on?color:'#6a7d65');
 };
 lamp('GAS',16,controls.up,cyan);lamp('BRAKE',66,controls.handbrake,'#ff986a');
 lamp('SHIELD',131,protectedCar,amber);lamp('DRIFT',203,Math.abs(car.slip)>28&&speed>30,cyan);
 lamp('REPAIR',266,!protectedCar&&car.hp<30,'#ff875d');
 instrumentText('01',359,100,1,amber);
}
function updateInstrumentPanel(){
 const controls=readControls(),protectedCar=immortal();
 $('consoleHp').textContent=protectedCar?'∞':Math.ceil(car.hp)+'%';
 $('consoleHealthBar').style.width=(protectedCar?100:car.hp)+'%';
 $('consoleProtection').textContent=protectedCar?'ЩИТ ВКЛ.':car.hp<30?'РЕМОНТ':'ЩИТ ВЫКЛ.';
 $('consoleCondition').classList.toggle('warn',!protectedCar&&car.hp<40);
 $('consoleCar').classList.toggle('damaged',!protectedCar&&car.hp<60);
 $('consoleCar').classList.toggle('critical',!protectedCar&&car.hp<30);
 $('consoleGas').classList.toggle('on',controls.up);
 $('consoleBrake').classList.toggle('on',controls.handbrake);
 $('consoleGas').setAttribute('aria-label',controls.up?'Газ нажат':'Газ отпущен');
 $('consoleBrake').setAttribute('aria-label',controls.handbrake?'Ручник нажат':'Ручник отпущен');
 $('consoleSteering').style.left=(50+car.steer*40)+'%';
}

function message(s){$('toast').textContent=s;$('toast').classList.add('show');toastTime=2.1}
function updateHUD(){updateControlDiagnostics();const pct=Math.floor(dead/total*100);$('score').textContent=String(score).padStart(5,'0');$('percent').textContent=mode==='free'?pct+'%':pct+' / 65%';$('destruction').style.width=Math.min(100,pct/(mode==='free'?100:65)*100)+'%';$('hp').textContent=immortal()?'∞':Math.ceil(car.hp)+'%';$('health').style.width=(immortal()?100:car.hp)+'%';$('health').parentElement.classList.toggle('protected',immortal());$('healthLabel').textContent=immortal()?'Урон отключён':'Прочность машинки';$('timeLabel').textContent=mode==='free'?'БЕЗ ТАЙМЕРА':'ОСТАЛОСЬ';const t=Math.ceil(remaining);$('timer').textContent=mode==='free'?'∞':String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');updateSpeedometer();$('driftIndicator').classList.toggle('on',Math.abs(car.slip)>28&&Math.hypot(car.vx,car.vy)>55)}
function overlay(title,text,button,eyebrow,hint){$('modalTitle').textContent=title;$('modalText').innerHTML=text;$('start').textContent=button;$('eyebrow').textContent=eyebrow;$('modalHint').textContent=hint;$('overlay').classList.remove('hidden')}
function syncSettings(){for(const b of document.querySelectorAll('[data-mode]')){const active=b.dataset.mode===mode;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.disabled=mapId==='city'&&b.dataset.mode==='arcade'}$('invulnerability').disabled=mode!=='free';$('damageOption').classList.toggle('disabled',mode!=='free');$('modeHelp').textContent=mapId==='city'?'Целый город для поездок. Без таймера и финиша.':mode==='free'?'Весь двор твой. Без таймера и финиша.':'Разрушь 65% двора за 90 секунд.';$('recordLabel').textContent=mapId==='city'?'РЕКОРД НОВОГРАДА':mode==='free'?'РЕКОРД СВОБОДНОГО ЗАЕЗДА':'РЕКОРД НА ВРЕМЯ'}

function syncVehicleUI(){
 const model=vehicleModel();$('selectedVehicleName').textContent=model.name;$('selectedVehicleKind').textContent=model.kind;
 $('garageOpen').setAttribute('aria-label','Открыть гараж. Выбрана '+model.name);
 for(const button of document.querySelectorAll('[data-vehicle]')){
  const active=button.dataset.vehicle===vehicleId;button.setAttribute('aria-pressed',String(active));
  $('vehicleStatus-'+button.dataset.vehicle).textContent=active?'ВЫБРАНА':'ВЫБРАТЬ →';
 }
 drawVehiclePreview($('selectedCarPreview'),model);
}
function selectVehicle(id){
 const model=FLEET.find(item=>item.id===id);if(!model)return false;
 vehicleId=id;if(car)car.modelId=id;
 try{localStorage.setItem('crash-vehicle',id)}catch{}
 syncVehicleUI();return true;
}
function openGarage(){
 if(garageOpen||mapOpen)return;garageWasPlaying=state==='playing';
 if(garageWasPlaying)pause();clearInput();garageOpen=true;
 syncVehicleUI();$('garageDialog').showModal();
}
function closeGarage(){if(garageOpen)$('garageDialog').close()}
function finishGarageClose(){
 garageOpen=false;clearInput();
 const resume=garageWasPlaying;garageWasPlaying=false;
 if(resume&&state==='paused')start();
}
function setupGarage(){
 for(const model of FLEET)drawVehiclePreview($('garagePreview-'+model.id),model);
 syncVehicleUI();
 $('garageOpen').onclick=openGarage;$('garageToolbar').onclick=openGarage;$('garageClose').onclick=closeGarage;
 $('garageDialog').addEventListener('close',finishGarageClose);
 for(const button of document.querySelectorAll('[data-vehicle]'))button.onclick=()=>{selectVehicle(button.dataset.vehicle);closeGarage()};
}

function activeMap(){return MAPS.find(m=>m.id===mapId)||MAPS[0]}
function districtName(){
 if(car.x>4400&&car.y<2640)return 'АЭРОПОРТ НОВОГРАД';
 if(car.x>4400&&car.y>3200)return 'БОЛЬШОЙ КАРЬЕР';
 if(CITY_BRIDGES.some(b=>car.x>=b.x-b.approach&&car.x<=b.x+b.w+b.approach&&Math.abs(car.y-b.y)<b.h/2+60))return car.y<2500?'БОЛЬШОЙ МОСТ':'ПОРТОВЫЙ МОСТ';
 if(car.y>3260&&car.x<1500)return 'ГРУЗОВОЕ ДЕПО';
 if(car.y>3260&&car.x<3400)return 'РЕЧНОЙ ПОРТ';
 if(insideStadium(car.x,car.y))return 'СТАДИОН КОМЕТА';
 if(car.x>4000)return 'ОБЪЕЗДНАЯ';
 const col=Math.floor(car.x/512),row=Math.floor(car.y/512);
 if(row>=4&&col<3)return 'ЮЖНЫЕ ГАРАЖИ';
 if(col>=5&&row>=3)return 'ЗЕЛЁНЫЙ КВАРТАЛ';
 if(row<=1)return 'СЕВЕРНЫЙ РАЙОН';
 return col<3?'ПРОМЫШЛЕННЫЙ РАЙОН':col>=5?'ВОСТОЧНЫЙ РАЙОН':'ЦЕНТР';
}
function paintCityOverview(g,w,h){
 const sx=w/6144,sy=h/4608;
 g.fillStyle='#203c30';g.fillRect(0,0,w,h);
 for(let y=0;y<4608;y+=96){g.fillStyle='#477e85';g.fillRect((cityRiverCenter(y)-230)*sx,y*sy,460*sx,98*sy)}
 const zone=(x,y,ww,hh,color)=>{g.fillStyle=color;g.fillRect(x*sx,y*sy,ww*sx,hh*sy)};
 for(let row=0;row<CITY_Y.length-1;row++)for(let col=0;col<CITY_X.length-1;col++)if(!(col>=3&&row<=1))zone(CITY_X[col]+82,CITY_Y[row]+82,348,348,(row+col)%5?'#697c5c':'#81944f');
 zone(1790,250,900,900,'#597e4e');zone(1980,450,520,500,'#8eac6c');
 zone(4440,400,1480,2080,'#7d927d');zone(5470,480,204,1840,'#b8c4ac');zone(4510,480,620,180,'#bfd4b7');
 zone(280,3300,1100,900,'#a49b70');zone(1770,3290,1530,1040,'#8a8962');g.fillStyle='#ac9560';g.beginPath();quarryContour(1).forEach((p,i)=>i?g.lineTo(p[0]*sx,p[1]*sy):g.moveTo(p[0]*sx,p[1]*sy));g.closePath();g.fill();
 for(const r of CITY_ROADS)cityRoadStroke(g,r,r.kind==='bridge'?'#e1c985':'#81967b',24,sx,sy);
 for(const b of CITY_BRIDGES)zone(b.x,b.y-b.h/2,b.w,b.h,'#d4be7f');
 if(w>=200){g.font='bold 7px monospace';g.fillStyle='#e2debb';g.fillText('СТАРЫЙ ГОРОД',8,54);g.fillText('NVG',202,38);g.fillText('ПОРТ',78,110);g.fillText('КАРЬЕР',184,110)}
}
function drawMinimap(){
 if(mapId!=='city')return;
 const district=districtName();if(district!==lastDistrict){lastDistrict=district;$('districtName').textContent=district}
 if(!minimapVisible)return;
 const g=$('minimap').getContext('2d'),sx=144/worldW,sy=108/worldH;
 paintCityOverview(g,144,108);
 g.strokeStyle='#b3ceb077';g.lineWidth=1;g.strokeRect(camera.x*sx,camera.y*sy,W*sx,H*sy);
 g.fillStyle='#ff8a4f';g.fillRect(car.x*sx-2,car.y*sy-2,5,5);
 g.strokeStyle='#ffe0a4';g.beginPath();g.moveTo(car.x*sx,car.y*sy);g.lineTo(car.x*sx+Math.cos(car.a)*6,car.y*sy+Math.sin(car.a)*6);g.stroke();
}
function drawMapPreview(target,id){
 const g=target.getContext('2d');g.imageSmoothingEnabled=false;
 g.fillStyle='#293d2b';g.fillRect(0,0,240,120);
 if(id==='city'){
  paintCityOverview(g,240,120);
 }else{
  g.fillStyle='#4a513b';g.fillRect(8,8,224,104);g.fillStyle='#2e3b2e';g.fillRect(92,8,54,104);g.fillRect(8,53,224,24);
  g.fillStyle='#a76346';for(const [x,y] of [[30,24],[163,24],[30,80],[163,80]]){g.fillRect(x,y,43,4);g.fillRect(x,y,4,22);g.fillRect(x+39,y,4,22)}
  g.fillStyle='#fb8d4c';g.fillRect(115,83,7,12);
 }
}
function syncMapUI(){
 const map=activeMap();$('selectedMapName').textContent=map.name;$('selectedMapKind').textContent=map.subtitle;
 $('mapOpen').setAttribute('aria-label','Выбрать карту. Сейчас '+map.name);
 $('mapLabel').innerHTML='<span>'+(mapId==='city'?'02':'01')+' /</span> '+map.name.toUpperCase();
 $('worldFeatures').textContent=mapId==='city'?'МОСТЫ · АЭРОПОРТ · ПОРТ':'ЯЩИКИ · КИРПИЧИ · ВЗРЫВНЫЕ БОЧКИ';
 $('cityNavigation').hidden=mapId!=='city';lastDistrict='';
 for(const button of document.querySelectorAll('[data-map]')){const active=button.dataset.map===mapId;button.setAttribute('aria-pressed',String(active));$('mapStatus-'+button.dataset.map).textContent=active?'ТЕКУЩАЯ КАРТА':'ВЫБРАТЬ МАРШРУТ →'}
 drawMapPreview($('selectedMapPreview'),mapId);
}
function selectMap(id){
 if(!MAPS.some(m=>m.id===id))return false;
 if(id===mapId){closeMapChooser();return true}
 saveBest();mapId=id;if(mapId==='city')mode='free';
 try{localStorage.setItem('crash-map',mapId)}catch{}
 mapWasPlaying=false;loadBest();syncSettings();syncMapUI();ready();closeMapChooser();return true;
}
function chooseCityStart(id){
 if(!CITY_PLACES.some(p=>p.id===id))return false;
 saveBest();cityStartId=id;mapId='city';mode='free';
 try{localStorage.setItem('crash-city-start',id);localStorage.setItem('crash-map','city')}catch{}
 mapWasPlaying=false;loadBest();syncSettings();syncMapUI();ready();closeMapChooser();return true;
}
function openMapChooser(){
 if(mapOpen||garageOpen)return;
 mapWasPlaying=state==='playing';if(mapWasPlaying)pause();clearInput();mapOpen=true;$('cityStartSelect').value=cityStartId;$('mapDialog').showModal();
}
function closeMapChooser(){if(mapOpen)$('mapDialog').close()}
function setupMapChooser(){
 syncMapUI();for(const map of MAPS)drawMapPreview($('mapPreview-'+map.id),map.id);
 $('mapOpen').onclick=openMapChooser;$('mapToolbar').onclick=openMapChooser;$('mapClose').onclick=closeMapChooser;
 $('mapDialog').addEventListener('close',()=>{mapOpen=false;clearInput();const resume=mapWasPlaying;mapWasPlaying=false;if(resume&&state==='paused')start()});
 for(const button of document.querySelectorAll('[data-map]'))button.onclick=()=>selectMap(button.dataset.map);
 $('cityStartGo').onclick=()=>chooseCityStart($('cityStartSelect').value);
 $('minimapToggle').onclick=()=>{minimapVisible=!minimapVisible;$('minimap').hidden=!minimapVisible;$('minimapToggle').textContent=minimapVisible?'−':'+';$('minimapToggle').setAttribute('aria-expanded',String(minimapVisible));if(state==='playing')canvas.focus()};
}

function immortal(){return mode==='free' && invulnerable}
function loadBest(){try{best=Number(localStorage.getItem(recordKey())||0)}catch{best=0}$('best').textContent=String(best).padStart(5,'0')}
function saveBest(){if(score<=best)return;best=score;try{localStorage.setItem(recordKey(),String(best))}catch{}$('best').textContent=String(best).padStart(5,'0')}
function recordKey(){return mapId==='yard'?(mode==='free'?'crash-best-free':'crash-best'):'crash-best-city-free'}
function ready(){state='ready';soundtrack?.setPlaying(false);reset();overlay('Устрой беспорядок.',mode==='free'?'Никакого таймера. Разнеси весь двор.<br>'+(immortal()?'Машинка неуязвима — газуй от души.':'Береги машинку и собирай ремкомплекты.'):'Разнеси 65% двора за 90 секунд.<br>Разгоняйся, влетай в стены и береги машинку.','ЗАВЕСТИ МОТОР →',mode==='free'?'СВОБОДНЫЙ ЗАЕЗД':'ГОНКА НА ВРЕМЯ','WASD / СТРЕЛКИ — РУЛИТЬ · ПРОБЕЛ / SHIFT — РУЧНИК');if(mapId==='city')overlay('Город ждёт.','Река, большие мосты, аэропорт и речной порт.<br>В выборе карты можно начать у любого района.','ВЫЕХАТЬ В ГОРОД →','НОВОГРАД · СВОБОДНАЯ ЕЗДА','WASD / СТРЕЛКИ — ЕХАТЬ · ПРОБЕЛ / SHIFT — РУЧНИК');$('status').textContent=mapId==='city'?'● НОВОГРАД ОТКРЫТ. ВЫБИРАЙ СВОЙ МАРШРУТ.':mode==='free'?'● СВОБОДА. БЕСПОРЯДОК. НИКАКОЙ СПЕШКИ.':'● ДВОР ГОТОВ К РАЗНОСУ'}
function start(){if(state==='paused'){state='playing';soundtrack?.setPlaying(true);clearInput();$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Пауза');canvas.focus();return}saveBest();reset();state='playing';soundtrack?.setPlaying(true);$('overlay').classList.add('hidden');$('status').textContent=mapId==='city'?'● НОВОГРАД · СВОБОДНАЯ ЕЗДА':mode==='free'?'● СВОБОДНЫЙ ЗАЕЗД · РАЗНЕСИ ВСЁ ДО ОСНОВАНИЯ':'● ГАЗУЙ. ДВОР САМ СЕБЯ НЕ РАЗНЕСЁТ.';noise(260,.15);canvas.focus()}
function restart(){if(state==='paused')state='ready';start()}
function finish(won){state=won?'won':'lost';soundtrack?.setPlaying(false);clearInput();saveBest();overlay(won?'Вот это разнос!':car.hp<=0?'Мотору нужен отдых.':'Ещё по газам?',`${won?'Двор разобран. Работа выполнена.':car.hp<=0?'Машинка приняла слишком много ударов.':'В этот раз двор оказался крепче.'}<br>${Math.floor(dead/total*100)}% разрушено · ${score.toLocaleString('ru-RU')} очков`,'ЕЩЁ ОДИН ЗАЕЗД →',won?'МИССИЯ ВЫПОЛНЕНА':'ЗАЕЗД ЗАВЕРШЁН','R — НАЧАТЬ ЗАНОВО');$('status').textContent=won?'● ПРОМДВОР УСПЕШНО РАЗОБРАН':'● ВРЕМЯ НА НОВЫЙ ЗАЕЗД';noise(won?660:120,.4,.08)}
function pause(){if(state==='playing'){state='paused';soundtrack?.setPlaying(false);clearInput();$('pause').textContent='▶';$('pause').setAttribute('aria-label','Продолжить');overlay('Перекур.',(mapId==='city'?'Город':'Двор')+' никуда не денется.<br>Продолжим, когда будешь готов.','ПРОДОЛЖИТЬ →','ИГРА НА ПАУЗЕ','P / ESC — ПРОДОЛЖИТЬ')}else if(state==='paused')start()}
function update(dt){if(state!=='playing')return;elapsed+=dt;if(mode==='arcade')remaining=Math.max(0,remaining-dt);car.inv=Math.max(0,car.inv-dt);comboTime-=dt;if(comboTime<=0)combo=0;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show')}
 for(const o of objects)o.hit=Math.max(0,o.hit-dt);
 updateDriving(dt);
 const pending=collapseQueue;collapseQueue=[];for(const c of pending){c.t-=dt;if(c.t<=0)destroy(c.o,false,0,20);else collapseQueue.push(c)}
 updateDebris(dt);
 for(const p of pickups)if(p.alive&&Math.hypot(car.x-p.x,car.y-p.y)<20&&car.hp<99&&!immortal()){p.alive=false;car.hp=Math.min(100,car.hp+35);burst(p.x,p.y,'#c6df78',15,60);message('+35 ПРОЧНОСТИ · СНОВА В БОЙ');noise(700,.14)}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-3*dt);p.vy*=Math.exp(-3*dt);p.life-=dt;if(p.smoke){p.size+=5*dt;p.y-=9*dt}}particles=particles.filter(p=>p.life>0);
 for(const p of popups){p.y-=18*dt;p.t-=dt}popups=popups.filter(p=>p.t>0);for(const s of skids)s.t-=dt;skids=skids.filter(s=>s.t>0);if(skids.length>1800)skids.splice(0,100);for(const r of rings)r.t+=dt;rings=rings.filter(r=>r.t<.6);shake=Math.max(0,shake-dt*17);
 updateHUD();if(car.hp<=0&&!immortal())finish(false);else if(mode==='arcade'&&dead/total>=.65)finish(true);else if(mode==='arcade'&&remaining<=0)finish(false);else if(mode==='free'&&dead===total&&!cleared){cleared=true;message('ДВОР РАЗОБРАН НА 100%! R — ВЕРНУТЬ ВСЁ НАЗАД');$('status').textContent='● НИЧЕГО НЕ УЦЕЛЕЛО. R — НОВЫЙ ДВОР.';noise(660,.35)}
}

for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(b.dataset.mode===mode||mapId==='city'&&b.dataset.mode==='arcade')return;saveBest();mode=b.dataset.mode;loadBest();syncSettings();ready()};
$('invulnerability').onchange=()=>{invulnerable=$('invulnerability').checked;if(immortal())car.hp=100;if(state==='ready')ready();else{updateHUD();canvas.focus()}};
document.addEventListener('keydown',e=>{
 if(garageOpen||mapOpen)return;
 if(nativeInput(e.target))return;
 // While driving, gameplay keys take priority over a focused toolbar button.
 // Enter still activates the button, and form fields keep native keyboard behavior.
 if(state==='playing'&&drivingKeys.has(e.code)){
  e.preventDefault();keyboardKeys.add(e.code);syncKey(e.code);return;
 }
 if(e.repeat)return;
 if(e.code==='KeyR'){e.preventDefault();restart();return}
 if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();pause();return}
 if(e.target&&e.target.tagName==='BUTTON'&&(e.code==='Enter'||e.code==='Space'))return;
 if((e.code==='Enter'||e.code==='Space')&&state!=='playing'){e.preventDefault();start()}
});
document.addEventListener('keyup',e=>{
 if(state==='playing'&&drivingKeys.has(e.code)&&!nativeInput(e.target))e.preventDefault();
 keyboardKeys.delete(e.code);syncKey(e.code);
});
window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
for(const b of document.querySelectorAll('[data-key]')){
 b.addEventListener('pointerdown',e=>{
  e.preventDefault();if(state!=='playing'||e.button!==0)return;
  b.setPointerCapture(e.pointerId);pointerKeys.set(e.pointerId,b.dataset.key);syncKey(b.dataset.key);
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{
  const code=pointerKeys.get(e.pointerId);if(!code)return;
  pointerKeys.delete(e.pointerId);syncKey(code);
 });
}
$('start').onclick=start;$('restart').onclick=restart;$('pause').onclick=pause;
$('sound').onclick=()=>{muted=!muted;$('sound').textContent='FX';$('sound').classList.toggle('fx-off',muted);$('sound').title=muted?'Включить звук':'Выключить звук';$('sound').setAttribute('aria-label',$('sound').title);$('sound').setAttribute('aria-pressed',String(!muted));if(!muted)noise(440,.12)};
$('music').onclick=()=>{if(!soundtrack){message('МУЗЫКА НЕДОСТУПНА В ЭТОМ БРАУЗЕРЕ');return}soundtrack.setEnabled(!soundtrack.enabled);syncMusicButton();if(state==='playing')canvas.focus()};

// Preserve the normal layout; fit one complete display into the fullscreen cabinet.
function fitFullscreenDisplay(){
 const game=$('game'),display=$('gameDisplay');
 if(document.fullscreenElement!==game)return;
 const margin=game.clientWidth<600?12:32;
 const width=display.offsetWidth,height=display.offsetHeight;
 if(!width||!height)return;
 const scale=Math.max(.05,Math.min((game.clientWidth-margin*2)/width,(game.clientHeight-margin*2)/height));
 display.style.transform='translate(-50%,-50%) scale('+scale+')';
}
function syncFullscreenDisplay(){
 if(document.fullscreenElement===$('game'))fitFullscreenDisplay();
 else{const display=$('gameDisplay');display.style.width='';display.style.transform=''}
}
window.addEventListener('resize',fitFullscreenDisplay);
document.addEventListener('fullscreenchange',syncFullscreenDisplay);
$('full').onclick=async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else{
   const display=$('gameDisplay');
   display.style.width=display.getBoundingClientRect().width+'px';
   await $('game').requestFullscreen();
   fitFullscreenDisplay();
  }
 }catch{syncFullscreenDisplay();message('ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН В ЭТОМ ОКНЕ')}
};

function frame(t){const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);updateEnvironment(dt);updateCamera(dt);draw(t);drawSpeedometer(dt);drawMinimap();requestAnimationFrame(frame)}
setupGarage();setupMapChooser();setupLightingControls();syncMusicButton();loadBest();syncSettings();ready();requestAnimationFrame(frame);
})();
