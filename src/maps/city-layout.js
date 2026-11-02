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
