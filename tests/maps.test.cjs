const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
function fixture(saved='yard',blocked=false,start='oldtown'){
 const store=new Map([['crash-map',saved],['crash-best-free','4321'],['crash-city-start',start]]),elements=new Map(),events={};
 function el(id){
  if(elements.has(id))return elements.get(id);
  const listeners={},node={style:{},dataset:{},checked:true,textContent:'',innerHTML:'',tagName:'DIV',attributes:{},
   classList:{add(){},remove(){},toggle(){}},parentElement:{classList:{toggle(){}}},
   setAttribute(k,v){this.attributes[k]=v},addEventListener(k,f){listeners[k]=f},focus(){},
   getContext(){return new Proxy({}, {get:()=>()=>{},set:()=>true})},
   showModal(){this.open=true},close(){this.open=false;listeners.close?.()}};
  elements.set(id,node);return node;
 }
 const modes=['free','arcade'].map(mode=>Object.assign(el('mode-'+mode),{dataset:{mode}}));
 const maps=['yard','city'].map(map=>Object.assign(el('map-'+map),{dataset:{map}}));
 const sandbox={console,Math,Number,String,Set,Map,requestAnimationFrame(){},
  localStorage:{getItem(k){if(blocked)throw Error('blocked');return store.get(k)||null},setItem(k,v){if(blocked)throw Error('blocked');store.set(k,v)}},
  document:{getElementById:el,addEventListener:(k,f)=>events[k]=f,querySelectorAll:s=>s==='[data-mode]'?modes:s==='[data-map]'?maps:[]},
  window:{addEventListener(){}}};
 const marker='loadBest();syncSettings();ready();requestAnimationFrame(frame);';
 const expose=`globalThis.mapsTest={selectMap,selectVehicle,start,openMapChooser,closeMapChooser,update,updateDriving,updateCamera,updateDebris,draw,drawMinimap,destroy,explode,nearby,keys,visibleObjects,chooseCityStart,cityCanDrive,cityRiverCenter,cityRoadAt,citySegmentDistance,cityBridgeWidth,cityRoadSamples,CITY_ROADS,CITY_BRIDGES,CITY_PLACES,PROP_KINDS,addProp,CITY_X,CITY_Y,get:()=>({car,objects,state,mapId,worldW,worldH,camera,total,dead,score,elapsed,remaining,debris,cityLots,rings,cityStartId})};`;
 vm.createContext(sandbox);vm.runInContext(source.replace(marker,marker+expose),sandbox);
 return {t:sandbox.mapsTest,el,modes,maps,store};
}
const {t,el,modes,store}=fixture();
const yardCount=t.get().objects.length;t.start();const original=t.get().car;
t.openMapChooser();assert.equal(t.get().state,'paused');t.closeMapChooser();assert.equal(t.get().state,'playing');assert.equal(t.get().car,original,'closing the chooser must preserve the ongoing run');
t.selectVehicle('kopeika');t.openMapChooser();assert(t.selectMap('city'));
let city=t.get();assert.equal(city.state,'ready');assert.equal(city.car.modelId,'kopeika');assert.equal(store.get('crash-map'),'city');
assert.equal(city.worldW,6144);assert.equal(city.worldH,4608);assert.equal(city.cityLots.length,21);assert.equal(city.total,city.objects.filter(o=>!o.solid).length);
assert(city.worldW*city.worldH/(768*480)>76);assert(city.total>1800);assert(modes[1].disabled);
modes[1].onclick();assert.equal(t.get().mapId,'city');assert.equal(el('timer').textContent,'∞','city cannot start a 90-second timer');
assert(!t.nearby(city.car.x,city.car.y,10).size,'spawn is clear of obstacles');
for(const o of city.objects){
 assert(o.x>=0&&o.y>=0&&o.x+o.w<city.worldW&&o.y+o.h<city.worldH);
 assert(t.cityCanDrive(o.x+o.w/2,o.y+o.h/2,0),'objects stay on land or a bridge');
}
console.log('Chooser pause/resume, vehicle preservation, 21 old-town blocks, landmarks, clear spawn and connected open roads: OK');
t.start();let car=t.get().car;Object.assign(car,{x:2200,y:1728,a:0,vx:0,vy:0});t.keys.add('ArrowUp');
for(let i=0;i<360;i++){t.updateDriving(1/60);t.updateCamera(1/60)}t.keys.clear();
assert(car.x>3000&&car.x<6144,'the car travels beyond the old canvas boundary');assert(t.get().camera.x>2400);
assert(t.visibleObjects().length<t.get().objects.length/3,'rendering queries the visible portion of the city');
Object.assign(car,{x:6140,y:4605,vx:100,vy:100});t.updateDriving(1/60);t.updateCamera(0,true);
assert(car.x<=6119&&car.y<=4583);assert.equal(t.get().camera.x,6144-768);assert.equal(t.get().camera.y,4608-480);
console.log('Long-distance driving, world bounds, camera clamping and spatial draw culling: OK');
const building=t.get().objects.find(o=>o.solid),before=t.get().dead;
Object.assign(car,{x:building.x-11,y:building.y+building.h/2,a:0,vx:180,vy:0});t.updateDriving(1/30);
assert(car.x<=building.x-9.9,'buildings block the car');assert(building.alive);assert.equal(t.get().dead,before);
t.destroy(building);assert(building.alive);assert.equal(t.get().dead,before,'permanent buildings do not affect destruction percentage');
const crate=t.get().objects.find(o=>o.type==='crate');t.destroy(crate);assert(!crate.alive);assert(t.get().dead>before);
assert(store.has('crash-best-city-free'));assert.equal(store.get('crash-best-free'),'4321','city records do not overwrite yard records');
const fragment=t.get().debris[0];Object.assign(fragment,{x:3000,y:2000,vx:10,vy:0});t.updateDebris(1/60);assert(fragment.x>2900&&fragment.y>1900,'debris uses world bounds');
t.draw(1);t.drawMinimap();t.update(180);assert.equal(t.get().state,'playing');assert.equal(t.get().remaining,90);
console.log('Solid building collisions, destructible props, city records, rendering and unlimited time: OK');
t.selectMap('yard');assert.equal(t.get().worldW,768);assert.equal(t.get().objects.length,yardCount);assert.equal(t.get().camera.x,0);assert.equal(t.get().camera.y,0);assert(!modes[1].disabled);assert.equal(el('cityNavigation').hidden,true);
assert.equal(t.selectMap('unknown'),false);
assert.equal(fixture('city').t.get().mapId,'city');assert.equal(fixture('unknown').t.get().mapId,'yard');assert.equal(fixture('city',true).t.get().mapId,'yard');
const blocked=fixture('yard',true);assert(blocked.t.selectMap('city'));assert.equal(blocked.t.get().worldW,6144);
console.log('Returning to the unchanged yard, saved map, invalid storage and blocked storage: OK');

{
 const {t,store}=fixture('city');t.start();let world=t.get();
 console.log('Expanded city:',world.objects.length,'objects,',world.total,'destructible');
 assert(t.CITY_ROADS.some(r=>r.points.slice(1).some((p,i)=>p[0]!==r.points[i][0]&&p[1]!==r.points[i][1])),'new districts use angled roads');
 assert(Math.abs(t.cityRiverCenter(0)-t.cityRiverCenter(1500))>100,'river banks are not a straight canal');
 assert.equal(t.CITY_BRIDGES.length,2);assert(t.CITY_BRIDGES[0].w>768);
 for(const b of t.CITY_BRIDGES)assert(world.objects.filter(o=>o.type==='barrier'&&o.x>=b.x&&o.x<=b.x+b.w&&Math.abs(o.y-b.y)<b.h/2+8).length>=b.w/36,'destructible bridge railings');
 for(const kind of ['terminal','tower','hangar','stadium','depot','warehouse','crane','bridgeTower'])assert(world.objects.some(o=>o.kind===kind),'missing landmark '+kind);
 for(const kind of Object.keys(t.PROP_KINDS))assert(world.objects.filter(o=>o.type===kind).length>=2,'missing destructible prop '+kind);
 // No permanent structure is allowed to block the center of any declared road.
 for(const road of t.CITY_ROADS)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(let d=0;d<=len;d+=32){const x=a[0]+(b[0]-a[0])*d/len,y=a[1]+(b[1]-a[1])*d/len;
   assert(t.cityCanDrive(x,y,10),'road enters the river away from a bridge');
   assert(![...t.nearby(x,y,12)].some(o=>o.solid&&x>o.x-12&&x<o.x+o.w+12&&y>o.y-12&&y<o.y+o.h+12),'solid landmark blocks a road');
  }
 }
 // Flood the real navigable road footprint; all starting districts must connect.
 const step=32,cols=Math.floor(world.worldW/step),rows=Math.floor(world.worldH/step),seen=new Set(),queue=[];
 function passable(ix,iy){const x=ix*step,y=iy*step;return t.cityRoadAt(x,y)&&t.cityCanDrive(x,y,12)&&![...t.nearby(x,y,12)].some(o=>o.solid&&x>o.x-12&&x<o.x+o.w+12&&y>o.y-12&&y<o.y+o.h+12)}
 const first=t.CITY_PLACES[0].spawn;queue.push([Math.round(first[0]/step),Math.round(first[1]/step)]);seen.add(queue[0].join(','));
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const x=queue[i][0]+dx,y=queue[i][1]+dy,key=x+','+y;if(x<1||y<1||x>=cols||y>=rows||seen.has(key)||!passable(x,y))continue;seen.add(key);queue.push([x,y]);
 }
 for(const place of t.CITY_PLACES){
  assert(seen.has(Math.round(place.spawn[0]/step)+','+Math.round(place.spawn[1]/step)),'disconnected district '+place.id);
  assert(t.chooseCityStart(place.id));world=t.get();assert.equal(world.state,'ready');assert.equal(world.car.x,place.spawn[0]);assert.equal(world.car.y,place.spawn[1]);
  assert(t.cityCanDrive(world.car.x,world.car.y));assert(![...t.nearby(world.car.x,world.car.y,16)].some(o=>Math.hypot(Math.max(o.x-world.car.x,0,world.car.x-o.x-o.w),Math.max(o.y-world.car.y,0,world.car.y-o.y-o.h))<16),'clear landmark spawn '+place.id);
  assert.equal(store.get('crash-city-start'),place.id);t.start();t.draw(1000);t.drawMinimap();
 }
 assert.equal(t.chooseCityStart('missing'),false);assert.equal(fixture('city',false,'airport').t.get().car.x,5200);
 console.log('River, 2 bridges, site prop types, large landmarks, connected roads, safe saved starts and rendering: OK');
 // Both bridges can actually be crossed with the driving model; elsewhere the bank blocks the car.
 for(const bridge of t.CITY_BRIDGES){
  t.chooseCityStart('bridge');t.start();const car=t.get().car;
  Object.assign(car,{x:bridge.x+20,y:bridge.y,a:0,vx:180,vy:0});t.keys.add('KeyW');
  for(let i=0;i<600;i++)t.updateDriving(1/60);t.keys.clear();assert(car.x>bridge.x+bridge.w-40,'drive across '+bridge.name);
 }
 t.chooseCityStart('bridge');t.start();const car=t.get().car,y=2500,bank=t.cityRiverCenter(y)-230;
 Object.assign(car,{x:bank-30,y,a:0,vx:200,vy:0});t.keys.add('KeyW');for(let i=0;i<120;i++)t.updateDriving(1/60);t.keys.clear();
 assert(car.x<bank-8,'car cannot drive into the river');assert(t.cityCanDrive(car.x,car.y));
 console.log('Full-length bridge crossings and bank collision with real vehicle physics: OK');
 // Every prop uses impacts, debris and the common destruction count; large tanks chain.
 for(const [type,spec] of Object.entries(t.PROP_KINDS)){
  t.chooseCityStart('airport');t.start();const o=t.addProp(5600,2700,type),car=t.get().car;
  Object.assign(car,{x:o.x-12,y:o.y+o.h/2,a:0,vx:180,vy:0});t.updateDriving(1/30);assert(!o.alive,'vehicle destroys '+type);assert(t.get().score>0);assert(t.get().debris.length>0);
 }
 t.chooseCityStart('port');t.start();const tanks=t.get().objects.filter(o=>o.type==='fuelTank'&&o.y===3530);assert(tanks.length>=3);t.destroy(tanks[1]);assert(tanks.filter(o=>!o.alive).length>=3);assert(t.get().rings.length>=3);
 console.log('All prop collision types, metal/glass wreckage, points and fuel-tank chain reactions: OK');
}

{
 const {t}=fixture('city');const roads=t.CITY_ROADS;
 for(const b of t.CITY_BRIDGES){
  for(const end of [b.x,b.x+b.w])assert(!roads.some(r=>r.kind!=='bridge'&&r.points.slice(1).some((p,i)=>{
   const a=r.points[i];return Math.abs(p[1]-a[1])>Math.abs(p[0]-a[0])*.5&&t.citySegmentDistance(end,b.y,a,p)<b.approach*.8;
  })),'junctions must sit away from the bridge deck');
  for(const side of [-1,1]){
   const roadX=side<0?b.x-b.approach:b.x+b.w+b.approach,deckX=side<0?b.x:b.x+b.w;
   assert.equal(t.cityBridgeWidth(b,roadX),b.roadWidth);assert.equal(t.cityBridgeWidth(b,deckX),b.h);
   for(let i=0;i<=16;i++){
    const x=roadX+(deckX-roadX)*i/16,width=t.cityBridgeWidth(b,x);
    assert(t.cityRoadAt(x,b.y+width/2-2),'pavement follows the taper');assert(t.cityCanDrive(x,b.y+width/2-12),'the tapered shoulder is drivable');
   }
   for(const offset of [-b.roadWidth*.25,b.roadWidth*.25]){
    t.chooseCityStart('bridge');t.start();const car=t.get().car;
    Object.assign(car,{x:roadX-side*30,y:b.y+offset,a:side<0?0:Math.PI,vx:side<0?180:-180,vy:0});t.keys.add('KeyW');
    for(let i=0;i<150;i++)t.updateDriving(1/60);t.keys.clear();assert(side<0?car.x>deckX+50:car.x<deckX-50,'both approaches pass at ordinary lane offsets');
   }
  }
 }
 const curve=roads.find(r=>r.kind==='avenue'&&r.points.length>20);assert(curve,'avenues use genuinely curved centerlines');
 const samples=t.cityRoadSamples(curve,20,48);assert(samples.length>10);
 for(let i=1;i<samples.length;i++)assert(Math.hypot(samples[i].x-samples[i-1].x,samples[i].y-samples[i-1].y)>38,'markings keep their spacing around bends');
 console.log('Separated bridge junctions, gradual drivable tapers, 8 lane approaches and spaced curve markings: OK');
}

{
 const {t}=fixture('city'),world=t.get(),fences=world.objects.filter(o=>o.type==='chainFence'&&o.zone==='airport');
 assert(fences.length>150,'the airport has a continuous perimeter fence');
 for(const point of [[4474,1000],[5924,1000],[5100,324],[5100,2484]])assert(fences.some(o=>point[0]>=o.x&&point[0]<=o.x+o.w&&point[1]>=o.y&&point[1]<=o.y+o.h),'fence encloses all four airport sides');
 assert(!fences.some(o=>4474>=o.x&&4474<=o.x+o.w&&1728>=o.y&&1728<=o.y+o.h),'the service gate remains open for driving');
 const publicRoads=t.CITY_ROADS.filter(r=>!['taxiway','apron'].includes(r.kind));
 for(const plane of world.objects.filter(o=>o.type==='plane'))for(let y=plane.y;y<=plane.y+plane.h;y+=16)for(let x=plane.x;x<=plane.x+plane.w;x+=16){
  assert(!publicRoads.some(r=>r.points.slice(1).some((b,i)=>t.citySegmentDistance(x,y,r.points[i],b)<r.width/2+8)),'aircraft stands cannot overlap public roads');
 }
 assert(!publicRoads.some(r=>r.points.some(p=>p[0]>5400&&p[0]<5800&&p[1]>400&&p[1]<2400)),'no city road runs beside the runway');
 for(const kind of ['baggageCart','generator','bench','bin','rock','pipe','bollard'])assert(world.objects.filter(o=>o.type===kind).length>=3,'site clutter has a real destructible representation: '+kind);
 const airportFence=fences[0];t.destroy(airportFence);assert(!airportFence.alive);t.start();assert(t.get().objects.filter(o=>o.type==='chainFence'&&o.zone==='airport').every(o=>o.alive));
 console.log('Airport perimeter, usable gate, separate taxiways, road-free aircraft stands and destructible site details: OK');
}
