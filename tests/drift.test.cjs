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

// A held handbrake must dissipate speed, not just change the cornering grip.
function brakeRun(direction,held,fps=60){
 const car=setup(200*direction,0);car.driftBlend=0;
 if(held)game.keys.add('Space');
 let distance=0,stopTime=null,previous=speed(car);
 for(let frame=0;frame<fps*2;frame++){
  step(1/fps);const current=speed(car);distance+=current/fps;
  assert(car.vx*direction>=-1e-10,'handbrake must not reverse the travel direction');
  assert(current<=previous+1e-8,'braking without gas must not create energy');
  if(current<.5&&stopTime===null)stopTime=(frame+1)/fps;
  previous=current;
 }
 return {distance,stopTime,finalSpeed:speed(car)};
}
for(const direction of [1,-1]){
 const coast=brakeRun(direction,false),braking=brakeRun(direction,true);
 assert(braking.stopTime!==null&&braking.stopTime<1.6,'handbrake must bring a straight-moving car to a stop');
 assert.equal(braking.finalSpeed,0);
 assert(braking.distance<coast.distance*.6,'handbrake must reduce stopping distance substantially compared with coasting');
 console.log(direction>0?'Forward':'Reverse','handbrake: stopped in',braking.stopTime.toFixed(2)+'s','travel',braking.distance.toFixed(1),'vs coasting',coast.distance.toFixed(1));
}
function spinRun(direction=1,mirror=1,fps=60,releaseBrake=false){
 const car=setup(200*direction,0);car.driftBlend=0;
 let angleAtRelease=0,maxSlip=0;
 for(let frame=0;frame<fps*4;frame++){
  game.keys.clear();game.keys.add(direction>0?'KeyW':'KeyS');
  if(!releaseBrake||frame<fps*.7)game.keys.add('Space');
  if(frame<fps*.7)game.keys.add(mirror>0?'KeyD':'KeyA');
  step(1/fps);
  if(frame===Math.ceil(fps*.7)-1)angleAtRelease=car.a;
  const difference=Math.atan2(car.vy,car.vx)-car.a-(direction<0?Math.PI:0);
  if(speed(car)>30)maxSlip=Math.max(maxSlip,Math.abs(Math.atan2(Math.sin(difference),Math.cos(difference))));
  assert(Number.isFinite(car.a)&&Number.isFinite(car.yaw)&&Number.isFinite(speed(car)));
 }
 return {angle:car.a,afterNeutral:Math.abs(car.a-angleAtRelease),maxSlip,yaw:car.yaw,speed:speed(car)};
}
for(const mirror of [1,-1]){
 const spin=spinRun(1,mirror),recovered=spinRun(1,mirror,60,true);
 assert(spin.maxSlip>Math.PI/2,'the body must be able to rotate past the direction of travel instead of locking to a drift angle');
 assert(spin.afterNeutral>Math.PI/2,'rotational momentum must continue after steering is released');
 assert(spin.angle*mirror>Math.PI,'a prolonged handbrake drift can spin the car around');
 assert(Math.abs(recovered.yaw)<.02,'releasing the brake lets normal traction settle the rotation');
 assert(Math.abs(recovered.angle)<Math.abs(spin.angle)*.7,'releasing the brake must help catch the slide');
}
const reverseSpin=spinRun(-1);assert(reverseSpin.angle<-Math.PI,'reverse drifts retain reversed steering and can also spin');
console.log('Left/right/reverse spinout, neutral-steering inertia and recovery after releasing the brake: OK');
const brakeRates=[30,60,120].map(fps=>brakeRun(1,true,fps));
assert(Math.max(...brakeRates.map(r=>r.stopTime))-Math.min(...brakeRates.map(r=>r.stopTime))<.08);
const spinRates=[30,60,120].map(fps=>spinRun(1,1,fps));
assert(Math.max(...spinRates.map(r=>r.angle))-Math.min(...spinRates.map(r=>r.angle))<.15,'spinout must not depend strongly on frame rate');
const stationary=setup(0,0);game.keys.add('Space');game.keys.add('KeyD');for(let i=0;i<120;i++)step(1/60);
assert.equal(speed(stationary),0);assert.equal(stationary.a,0,'handbrake and steering cannot spin a stationary car');
game.reset();assert.equal(game.get().handbrakeActive,false);assert.equal(game.get().driftDirection,1);
console.log('30 / 60 / 120 FPS braking and rotation, stationary braking and reset: OK');
