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
