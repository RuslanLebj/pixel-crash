const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const ids=['dvor','kopeika','golf','bavarian','meridian','niva','tofu','stuttgart'];
function fixture(saved,storageBlocked=false){
 const elements=new Map(),events={},store=new Map(saved?[['crash-vehicle',saved]]:[]);
 function el(id){
  if(elements.has(id))return elements.get(id);
  const listeners={},classes=new Set(),node={textContent:'',style:{},checked:true,attributes:{},listeners,tagName:'DIV',
   classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,v){v?classes.add(c):classes.delete(c)}},
   parentElement:{classList:{toggle(){}}},setAttribute(k,v){this.attributes[k]=v},
   addEventListener(k,fn){listeners[k]=fn},focus(){},
   getContext(){return new Proxy({}, {get:()=>()=>{},set:()=>true})},
   showModal(){this.open=true},close(){this.open=false;listeners.close?.()}
  };elements.set(id,node);return node;
 }
 const buttons=ids.map(id=>Object.assign(el('button-'+id),{tagName:'BUTTON',dataset:{vehicle:id}}));
 const sandbox={Math,String,Number,Set,Map,
  localStorage:{getItem:k=>{if(storageBlocked)throw Error('blocked');return store.get(k)||null},setItem(k,v){if(storageBlocked)throw Error('blocked');store.set(k,v)}},
  document:{getElementById:el,querySelectorAll:s=>s==='[data-vehicle]'?buttons:[],addEventListener:(k,fn)=>events[k]=fn},
  window:{addEventListener(){}},requestAnimationFrame(){}};
 const marker='loadBest();syncSettings();ready();requestAnimationFrame(frame);';
 assert(source.includes(marker));
 const instrumented=source.replace(marker,marker+'globalThis.fleetTest={FLEET,selectVehicle,openGarage,closeGarage,start,pause,reset,keys,get:()=>({car,state,vehicleId,garageOpen,score,elapsed,remaining,dead,objects}),setup:()=>{score=450;elapsed=12;dead=3;car.hp=45;car.x=123;car.y=250}};');
 vm.createContext(sandbox);vm.runInContext(instrumented,sandbox);
 return {game:sandbox.fleetTest,el,buttons,events,store};
}
const f=fixture(),g=f.game;
assert.equal(g.FLEET.length,8);assert.equal(new Set(g.FLEET.map(m=>m.id)).size,8);
assert.equal(g.get().vehicleId,'dvor');assert.equal(g.get().car.modelId,'dvor');
assert.equal(f.buttons[0].attributes['aria-pressed'],'true');
g.start();g.setup();g.keys.add('KeyW');
const before=g.get(),world=before.objects,car=before.car;
g.openGarage();assert.equal(g.get().state,'paused');assert.equal(g.keys.size,0);assert(f.el('garageDialog').open);
const event={code:'KeyR',target:{tagName:'BUTTON'},preventDefault(){throw Error('game must not intercept garage key')}};
f.events.keydown(event);assert.equal(g.get().score,450,'R inside garage must not restart');
f.events.keydown({...event,code:'Space'});assert.equal(g.keys.size,0,'garage keyboard navigation must not drive');
f.buttons.find(b=>b.dataset.vehicle==='stuttgart').onclick();
assert.equal(g.get().state,'playing');assert.equal(g.get().vehicleId,'stuttgart');assert.equal(car.modelId,'stuttgart');
assert.equal(g.get().car,car);assert.equal(g.get().objects,world);assert.equal(car.hp,45);assert.equal(car.x,123);
assert.equal(g.get().score,450);assert.equal(g.get().elapsed,12);assert.equal(g.get().dead,3);
assert.equal(f.store.get('crash-vehicle'),'stuttgart');
assert.equal(f.el('selectedVehicleName').textContent,'Штутгарт 911');
assert.equal(f.buttons.filter(b=>b.attributes['aria-pressed']==='true').length,1);
assert.equal(g.selectVehicle('not-a-car'),false);assert.equal(g.get().vehicleId,'stuttgart');
g.reset();assert.equal(g.get().car.modelId,'stuttgart','restart must retain the selected model');
for(const id of ids){assert(g.selectVehicle(id));assert.equal(g.get().car.modelId,id)}
assert.equal(fixture('bavarian').game.get().vehicleId,'bavarian','selection must survive reload');
assert.equal(fixture('untrusted-id').game.get().vehicleId,'dvor','invalid storage value must fall back safely');
const noStorage=fixture(null,true);assert(noStorage.game.selectVehicle('niva'));assert.equal(noStorage.game.get().vehicleId,'niva');
const paused=fixture();paused.game.start();paused.game.pause();paused.game.openGarage();paused.game.closeGarage();
assert.equal(paused.game.get().state,'paused','closing garage must preserve a pre-existing pause');
const ready=fixture();ready.game.openGarage();ready.game.closeGarage();assert.equal(ready.game.get().state,'ready');
const cancel=fixture();cancel.game.start();cancel.game.openGarage();cancel.el('garageDialog').close();assert.equal(cancel.game.get().state,'playing','native Escape/close resumes only a previously active run');
console.log('Eight models, selection, reload, blocked storage, pause/resume, native close and non-destructive swaps: OK');
