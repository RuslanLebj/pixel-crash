const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
function fixture(saved='day',map='city',blocked=false){
 const elements=new Map(),store=new Map([['crash-map',map],['crash-lighting',saved]]),calls=[];
 function context(id){return new Proxy({}, {get:(_,key)=>{
  if(key==='createRadialGradient'||key==='createLinearGradient')return (...args)=>{calls.push([id,key,...args]);return{addColorStop(){}}};
  return (...args)=>{calls.push([id,key,...args])};
 },set:(_,key,value)=>{calls.push([id,key,value]);return true}})}
 function el(id){if(elements.has(id))return elements.get(id);const listeners={},g=context(id),node={style:{},checked:true,textContent:'',innerHTML:'',attributes:{},
  classList:{add(){},remove(){},toggle(){}},parentElement:{classList:{toggle(){}}},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,v){listeners[k]=v},focus(){},
  getContext(){return g},showModal(){},close(){listeners.close?.()}};elements.set(id,node);return node;}
 const sandbox={Math,Number,String,Set,Map,console,requestAnimationFrame(){},
  document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement(tag){assert.equal(tag,'canvas');return el('night-mask')}},window:{addEventListener(){}},
  localStorage:{getItem(k){if(blocked)throw Error('blocked');return store.get(k)||null},setItem(k,v){if(blocked)throw Error('blocked');store.set(k,v)}}};
 const marker='loadBest();syncSettings();ready();requestAnimationFrame(frame);';
 const api='globalThis.lightTest={signalState,setupWorldLighting,updateEnvironment,setNightMode,selectMap,start,pause,draw,ground,drawPropWreck,drawWorldLighting,lampHead,cityRoadAt,cityCanDrive,signalBulb,destroy,explode,updateDriving,updateDebris,nearby,reset,keys,get:()=>({nightMode,nightBlend,environmentTime,streetLamps,trafficLights,car,state,score,elapsed,remaining,objects,debris,dead,total,popups,camera,worldW,worldH,CITY_X,CITY_Y,cityLots})};';
 vm.createContext(sandbox);vm.runInContext(source.replace(marker,marker+api),sandbox);return{t:sandbox.lightTest,el,store,calls};
}
const {t,el,store,calls}=fixture();
for(const [time,ns,ew] of [[0,'green','red'],[7,'green','red'],[8,'amber','red'],[10,'red','red'],[11,'red','green'],[18,'red','green'],[19,'red','amber'],[21,'red','red'],[22,'green','red']]){
 assert.equal(t.signalState('ns',0,time),ns);assert.equal(t.signalState('ew',0,time),ew);
}
for(const offset of [0,3,6])for(let i=0;i<660;i++){
 const ns=t.signalState('ns',offset,i/10),ew=t.signalState('ew',offset,i/10);
 assert(!(ns!=='red'&&ew!=='red'),'conflicting directions must never get simultaneous go signals');
}
assert.equal(t.get().trafficLights.length,140);assert(t.get().streetLamps.length>200);
console.log('Three-bulb traffic cycles, amber phases, all-red clearance and intersection offsets: OK');
t.start();const original=t.get(),car=original.car;t.keys.add('KeyW');
t.setNightMode(true);assert.equal(t.get().car,car);assert.equal(t.get().state,'playing');assert.equal(t.get().score,original.score);assert.equal(t.get().elapsed,original.elapsed);assert(t.keys.has('KeyW'));
assert.equal(store.get('crash-lighting'),'night');assert.equal(el('timeToggle').attributes['aria-pressed'],'true');
t.updateEnvironment(1);assert(t.get().nightBlend>.99);const beforePause=t.get().environmentTime;t.pause();t.updateEnvironment(8);assert.equal(t.get().environmentTime,beforePause,'traffic freezes during pause');t.start();
t.draw(1000);assert(calls.some(c=>c[0]==='night-mask'&&c[1]==='globalCompositeOperation'&&c[2]==='destination-out'),'night illumination must cut lit regions out of the darkness');
assert(calls.some(c=>c[1]==='createLinearGradient'),'headlight beams are directional');assert(calls.some(c=>c[1]==='drawImage'),'the low-resolution light mask must be composited over the world');
t.setNightMode(false);t.updateEnvironment(2);assert.equal(t.get().nightBlend,0);assert.equal(el('timeToggle').attributes['aria-pressed'],'false');assert.equal(t.get().car,car);
console.log('Live day/night switching, unchanged driving state, smooth transition, pause and headlight/mask rendering: OK');
t.setNightMode(true);t.selectMap('yard');assert.equal(t.get().streetLamps.length,10);assert.equal(t.get().trafficLights.length,0);assert(t.get().nightMode);t.draw(1000);
assert(fixture('night').t.get().nightMode);assert(!fixture('invalid').t.get().nightMode);const blocked=fixture('night','city',true);assert(!blocked.t.get().nightMode);blocked.t.setNightMode(true);blocked.t.updateEnvironment(2);blocked.t.draw(1000);
for(const fps of [30,60,120]){const other=fixture().t;other.start();for(let i=0;i<20*fps;i++)other.updateEnvironment(1/fps);assert.equal(other.signalState('ew'),'amber');assert.equal(other.signalState('ns'),'red')}
console.log('Both maps, saved preference, blocked storage and consistent traffic at 30 / 60 / 120 FPS: OK');

// Traffic signals use the same spatial collision, damage and destruction lifecycle as props.
{
 const {t,calls}=fixture('night');t.start();
 let world=t.get(),light=world.trafficLights[0];
 assert(world.objects.includes(light));assert(t.nearby(light.x+light.w/2,light.y+light.h/2,1).has(light));
 assert.equal(world.objects.filter(o=>o.type==='trafficLight').length,140);
 assert.equal(world.total,world.objects.filter(o=>!o.solid).length);
 const x=light.x,y=light.y+light.h/2;
 Object.assign(world.car,{x:x-10,y,a:0,vx:20,vy:0});t.updateDriving(1/60);
 assert(light.alive,'a slow touch must not destroy a signal');assert(world.car.x<=x-9.9,'a signal blocks a slow car');
 Object.assign(world.car,{x:x-12,y,a:0,vx:180,vy:0});t.updateDriving(1/30);
 assert(!light.alive,'a fast vehicle impact must break the signal');
 assert(!t.nearby(x,y,1).has(light),'the broken signal no longer blocks the car');
 assert.equal(t.get().dead,1);assert.equal(t.get().score,100);assert(t.get().debris.length>=10);assert(t.get().popups.some(p=>p.text==='+100'));
 const score=t.get().score;t.destroy(light);assert.equal(t.get().score,score,'a signal can only score once');
 assert(world.trafficLights.slice(1).every(l=>l.alive),'neighboring signals survive a direct impact');
 // A destroyed head must disappear from both the night light mask and the bright bulb pass.
 t.reset();t.start();world=t.get();light=world.trafficLights[0];
 // Pick a signal inside the initial viewport for rendering assertions.
 light=world.trafficLights.find(l=>Math.abs(l.x-world.camera.x-384)<300&&Math.abs(l.y-world.camera.y-240)<180);
 assert(light,'the initial viewport includes traffic signals');
 const active=t.signalBulb(light),mx=(active.x-Math.round(world.camera.x))/4,my=(active.y-Math.round(world.camera.y))/4;
 function glows(){return calls.some(c=>c[0]==='night-mask'&&c[1]==='createRadialGradient'&&c[2]===mx&&c[3]===my&&c[7]===19/4)}
 calls.length=0;t.drawWorldLighting([]);assert(glows(),'an intact signal illuminates its surroundings');
 t.destroy(light);calls.length=0;t.drawWorldLighting([]);assert(!glows(),'a broken signal emits no night light');
 t.draw(1000); // Fallen housing and shards render in the scene without an active lamp.
 t.reset();assert(t.get().trafficLights.every(l=>l.alive));assert.equal(t.get().dead,0);
 console.log('Real traffic-signal collisions, impact destruction, points, debris, darkness and restart: OK');
}
{
 const {t}=fixture();t.start();let light=t.get().trafficLights[0];
 t.explode(light.x+light.w/2,light.y+light.h/2);assert(!light.alive,'explosions destroy signals');
 t.reset();t.start();light=t.get().trafficLights[0];
 t.get().debris.push({x:light.x+light.w/2,y:light.y+light.h/2,z:1,vx:200,vy:0,vz:0,a:0,spin:0,life:5,w:3,h:3,cooldown:0});
 t.updateDebris(.001);assert(!light.alive,'fast debris can break a signal');
 t.selectMap('yard');assert.equal(t.get().objects.filter(o=>o.type==='trafficLight').length,0);
 console.log('Traffic signals break from explosions and flying debris; yard has no traffic signals: OK');
}

for(const map of ['yard','city']){
 const {t,calls}=fixture('night',map);t.start();
 let world=t.get(),lamp=world.streetLamps[0];const count=world.streetLamps.length;
 assert(world.objects.includes(lamp));assert(t.nearby(lamp.x+4,lamp.y+4,1).has(lamp));
 assert.equal(world.objects.filter(o=>o.type==='streetLamp').length,count);
 assert.equal(world.total,world.objects.filter(o=>!o.solid).length);
 Object.assign(world.car,{x:lamp.x-10,y:lamp.y+4,a:0,vx:20,vy:0});t.updateDriving(1/60);
 assert(lamp.alive);assert(world.car.x<=lamp.x-9.9,'a standing lamp blocks a slow car');
 Object.assign(world.car,{x:lamp.x-12,y:lamp.y+4,a:0,vx:180,vy:0});t.updateDriving(1/30);
 assert(!lamp.alive,'a vehicle impact breaks the lamp');assert(!t.nearby(lamp.x,lamp.y,1).has(lamp));
 assert.equal(t.get().dead,1);assert.equal(t.get().score,75);assert(t.get().debris.length>=10);
 assert(world.streetLamps.slice(1).every(l=>l.alive),'other lamps stay intact');
 t.destroy(lamp);assert.equal(t.get().score,75,'no duplicate points');
 t.reset();t.start();world=t.get();
 lamp=world.streetLamps.find(l=>l.x>=world.camera.x&&l.x<world.camera.x+768&&l.y>=world.camera.y&&l.y<world.camera.y+480);
 assert(lamp);const head=t.lampHead(lamp),mx=(head.x-Math.round(world.camera.x))/4,my=(head.y+4-Math.round(world.camera.y))/4;
 const hasPool=()=>calls.some(c=>c[0]==='night-mask'&&c[1]==='createRadialGradient'&&c[2]===mx&&c[3]===my&&c[7]===20);
 const hasWarmth=()=>calls.some(c=>c[0]==='canvas'&&c[1]==='createRadialGradient'&&c[2]===head.x&&c[3]===head.y+4&&c[7]===70);
 const hasBulb=()=>calls.some(c=>c[0]==='canvas'&&c[1]==='fillRect'&&c[2]===head.x-3&&c[3]===head.y&&c[4]===7&&c[5]===2);
 calls.length=0;t.drawWorldLighting([]);assert(hasPool());assert(hasWarmth());assert(hasBulb());
 t.destroy(lamp);calls.length=0;t.drawWorldLighting([]);assert(!hasPool());assert(!hasWarmth());assert(!hasBulb());t.draw(1000);
 t.setNightMode(false);t.updateEnvironment(2);t.setNightMode(true);t.updateEnvironment(2);
 calls.length=0;t.drawWorldLighting([]);assert(!hasPool(),'day/night toggling cannot relight a destroyed lamp');
 t.reset();assert.equal(t.get().streetLamps.length,count);assert(t.get().streetLamps.every(l=>l.alive));assert.equal(t.get().dead,0);
 lamp=t.get().streetLamps[0];t.explode(lamp.x+4,lamp.y+4);assert(!lamp.alive,'explosions break lamps');
 t.reset();t.start();lamp=t.get().streetLamps[0];
 t.get().debris.push({x:lamp.x+4,y:lamp.y+4,z:1,vx:200,vy:0,vz:0,a:0,spin:0,life:5,w:3,h:3,cooldown:0});
 t.updateDebris(.001);assert(!lamp.alive,'flying debris breaks lamps');
 console.log(map+': street-lamp collisions, impact/blast/debris destruction, scoring, light removal and restart: OK');
}

{
 const {t}=fixture();const world=t.get(),lamps=world.streetLamps;
 const centers=lamps.map(l=>({x:l.x+l.w/2,y:l.y+l.h/2}));
 for(let i=0;i<centers.length;i++){
  const a=centers[i];assert(a.x>=32&&a.y>=32&&a.x<=world.worldW-32&&a.y<=world.worldH-32);
  for(let j=i+1;j<centers.length;j++)assert(Math.hypot(a.x-centers[j].x,a.y-centers[j].y)>=100,'lamp poles must not bunch up');
 }
 // Each block gets balanced lighting from both sidewalks, including the middle of a block.
 for(const x of world.CITY_X)for(let row=0;row<world.CITY_Y.length-1;row++){
  const a=world.CITY_Y[row],b=world.CITY_Y[row+1];if(!t.cityRoadAt(x,(a+b)/2))continue;
  const left=centers.filter(l=>l.x===x-75&&l.y>a&&l.y<b).map(l=>l.y);
  const right=centers.filter(l=>l.x===x+75&&l.y>a&&l.y<b).map(l=>l.y);
  assert(left.length>=2);assert.deepEqual(left,right);assert(left[0]-a>=120&&b-left.at(-1)>=120);
  assert(left.some(y=>y>a+140&&y<a+220)&&left.some(y=>y>b-220&&y<b-140),'both halves of every block are lit');
 }
 for(const y of world.CITY_Y)for(let col=0;col<world.CITY_X.length-1;col++){
  const a=world.CITY_X[col],b=world.CITY_X[col+1];if(!t.cityRoadAt((a+b)/2,y))continue;
  const top=centers.filter(l=>l.y===y-75&&l.x>a&&l.x<b).map(l=>l.x);
  const bottom=centers.filter(l=>l.y===y+75&&l.x>a&&l.x<b).map(l=>l.x);
  assert(top.length>=2);assert.deepEqual(top,bottom);assert(top[0]-a>=120&&b-top.at(-1)>=120);
 }
 for(const x of world.CITY_X){assert(centers.some(l=>l.x===x-75&&l.y<world.CITY_Y[0]));assert(centers.some(l=>l.x===x+75&&l.y>world.CITY_Y.at(-1)))}
 for(const y of world.CITY_Y){assert(centers.some(l=>l.y===y-75&&l.x<world.CITY_X[0]));assert(centers.some(l=>l.y===y+75&&l.x>world.CITY_X.at(-1)))}
 const positions=JSON.stringify(centers);t.reset();assert.equal(JSON.stringify(t.get().streetLamps.map(l=>({x:l.x+l.w/2,y:l.y+l.h/2}))),positions);
 t.selectMap('yard');const yard=t.get(),yc=yard.streetLamps.map(l=>({x:l.x+4,y:l.y+4}));
 for(const l of yc){assert(yc.some(other=>other.x===yard.worldW-l.x&&other.y===l.y));assert(yc.some(other=>other.y===yard.worldH-l.y&&other.x===l.x))}
 for(const lamp of yard.streetLamps)assert(!yard.objects.some(o=>o!==lamp&&lamp.x<o.x+o.w&&lamp.x+lamp.w>o.x&&lamp.y<o.y+o.h&&lamp.y+lamp.h>o.y),'yard poles do not overlap obstacles');
 console.log('Balanced sidewalk rows, clear intersection corners, outer road coverage, repeatable layout and symmetric yard: OK');
}

{
 const {t,calls}=fixture('day');t.start();const plane=t.get().objects.find(o=>o.type==='plane');assert(plane);
 Object.assign(t.get().camera,{x:plane.x-100,y:plane.y-100});
 calls.length=0;t.ground();const before=JSON.stringify(calls);
 t.destroy(plane);assert(!plane.alive);calls.length=0;t.ground();assert.equal(JSON.stringify(calls),before,'destroying an aircraft must never alter the ground or reveal a newly drawn road');
 calls.length=0;t.drawPropWreck(plane);assert(!calls.some(c=>c[0]==='canvas'&&c[1]==='fillRect'&&c[4]>plane.w*.7&&c[5]>plane.h*.7),'aircraft wrecks must not draw rectangular foundations');
 assert(calls.some(c=>c[1]==='lineTo'),'aircraft wrecks include torn wing and fuselage outlines');
 console.log('Aircraft explosions leave the same apron beneath irregular scorched wreckage, with no road-like rectangle: OK');
}
