const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    textContent:'', innerHTML:'', checked:true, style:{},
    parentElement:{classList:{toggle(){}}}, classList:{add(){},remove(){},toggle(){}},
    setAttribute(){},addEventListener(){},focus(){},
    getContext(){return new Proxy({}, {get:()=>()=>{},set:()=>true})}
  });
  return elements.get(id);
}
const sandbox = {
  Math, Number, String, Set, Map,
  localStorage:{getItem:()=>null,setItem(){}}, requestAnimationFrame(){},
  document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},
  window:{addEventListener(){}}
};
let source = fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const marker = 'loadBest();syncSettings();ready();requestAnimationFrame(frame);';
assert(source.includes(marker));
source = source.replace(marker,marker+'globalThis.physics={reset,updateDriving,keys,get:()=>car,empty:()=>{objects=[];grid=new Map()}};');
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const game = sandbox.physics;

function setup(forward=70, lateral=150) {
  game.reset();game.empty();
  Object.assign(game.get(),{a:0,x:384,y:240,vx:forward,vy:lateral,driftBlend:1});
  return game.get();
}
function speed(car) {return Math.hypot(car.vx,car.vy)}
function step(dt) {
  // Recenter the fixture to isolate traction from arena-wall collisions.
  game.get().x=384;game.get().y=240;
  game.updateDriving(dt);
}

for (const direction of [1,-1]) {
  const car=setup(70*direction,150*direction), initial=speed(car);
  step(1/60);
  const firstFrameRatio=speed(car)/initial;
  assert(speed(car)>=initial*.96,'releasing the handbrake must not remove a large fraction of speed in one frame');
  let previous=speed(car), worstFrameRatio=1;
  for(let frame=1;frame<48;frame++) {
    step(1/60);
    const current=speed(car);
    assert(current<=previous+1e-8,'traction recovery must not create energy while coasting');
    worstFrameRatio=Math.min(worstFrameRatio,current/previous);
    if(frame===14)assert(current>=initial*.8,'the first quarter-second of drift exit must retain momentum');
    previous=current;
  }
  assert(worstFrameRatio>.96,'traction recovery and speed limits must not cause abrupt braking');
  assert(Math.sign(car.vx)===direction,'exiting a reverse drift must not flip travel direction');
  assert(Math.abs(car.vy)<15,'normal lateral grip must return after the transition');
  assert(car.driftBlend<.05,'drift recovery must finish instead of leaving permanently slippery handling');
  console.log(direction>0?'Forward':'Reverse','exit: initial',initial.toFixed(1),'final',speed(car).toFixed(1),'first frame retained',(firstFrameRatio*100).toFixed(1)+'%','worst frame retained',(worstFrameRatio*100).toFixed(1)+'%');
}

const frameRates=[30,60,120].map(fps=>{
  const car=setup();
  for(let frame=0;frame<fps;frame++)step(1/fps);
  return speed(car);
});
assert((Math.max(...frameRates)-Math.min(...frameRates))/frameRates[1]<.04,'drift exit must behave consistently across frame rates');
console.log('30 / 60 / 120 FPS coasting speeds:',frameRates.map(n=>n.toFixed(1)).join(' / '));

const car=setup(150,95);
game.keys.add('KeyW');
const initial=speed(car);
for(let frame=0;frame<30;frame++)step(1/60);
assert(speed(car)>initial*.95,'continued throttle should carry the car out of a drift');
game.keys.add('Space');
for(let frame=0;frame<12;frame++)step(1/60);
assert(car.driftBlend>.95,'handbrake must re-engage promptly during recovery');
game.reset();
assert.equal(game.get().driftBlend,0,'restart must reset traction state');
console.log('Throttle, handbrake re-engagement and restart: OK');
