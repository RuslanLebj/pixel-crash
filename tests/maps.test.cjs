const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
function fixture(saved='yard',blocked=false){
 const store=new Map([['crash-map',saved],['crash-best-free','4321']]),elements=new Map(),events={};
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
 const expose=`globalThis.mapsTest={selectMap,selectVehicle,start,openMapChooser,closeMapChooser,update,updateDriving,updateCamera,updateDebris,draw,drawMinimap,destroy,nearby,keys,visibleObjects,CITY_X,CITY_Y,get:()=>({car,objects,state,mapId,worldW,worldH,camera,total,dead,score,elapsed,remaining,debris,cityLots})};`;
 vm.createContext(sandbox);vm.runInContext(source.replace(marker,marker+expose),sandbox);
 return {t:sandbox.mapsTest,el,modes,maps,store};
}
const {t,el,modes,store}=fixture();
const yardCount=t.get().objects.length;t.start();const original=t.get().car;
t.openMapChooser();assert.equal(t.get().state,'paused');t.closeMapChooser();assert.equal(t.get().state,'playing');assert.equal(t.get().car,original,'closing the chooser must preserve the ongoing run');
t.selectVehicle('kopeika');t.openMapChooser();assert(t.selectMap('city'));
let city=t.get();assert.equal(city.state,'ready');assert.equal(city.car.modelId,'kopeika');assert.equal(store.get('crash-map'),'city');
assert.equal(city.worldW,4096);assert.equal(city.worldH,3072);assert.equal(city.cityLots.length,35);assert.equal(city.total,city.objects.filter(o=>!o.solid).length);
assert(city.worldW*city.worldH/(768*480)>34);assert(city.total>500);assert(modes[1].disabled);
modes[1].onclick();assert.equal(t.get().mapId,'city');assert.equal(el('timer').textContent,'∞','city cannot start a 90-second timer');
assert(!t.nearby(city.car.x,city.car.y,10).size,'spawn is clear of obstacles');
for(const o of city.objects){
 assert(o.x>=0&&o.y>=0&&o.x+o.w<city.worldW&&o.y+o.h<city.worldH);
 for(const x of t.CITY_X)assert(o.x>=x+64||o.x+o.w<=x-64,'vertical roads stay open');
 for(const y of t.CITY_Y)assert(o.y>=y+64||o.y+o.h<=y-64,'horizontal roads stay open');
}
console.log('Chooser pause/resume, vehicle preservation, 35 blocks, clear spawn and connected open roads: OK');
t.start();let car=t.get().car;Object.assign(car,{x:2200,y:1728,a:0,vx:0,vy:0});t.keys.add('ArrowUp');
for(let i=0;i<360;i++){t.updateDriving(1/60);t.updateCamera(1/60)}t.keys.clear();
assert(car.x>3000&&car.x<4096,'the car travels beyond the old canvas boundary');assert(t.get().camera.x>2400);
assert(t.visibleObjects().length<t.get().objects.length/3,'rendering queries the visible portion of the city');
Object.assign(car,{x:4090,y:3065,vx:100,vy:100});t.updateDriving(1/60);t.updateCamera(0,true);
assert(car.x<=4071&&car.y<=3047);assert.equal(t.get().camera.x,4096-768);assert.equal(t.get().camera.y,3072-480);
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
const blocked=fixture('yard',true);assert(blocked.t.selectMap('city'));assert.equal(blocked.t.get().worldW,4096);
console.log('Returning to the unchanged yard, saved map, invalid storage and blocked storage: OK');
