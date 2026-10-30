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
