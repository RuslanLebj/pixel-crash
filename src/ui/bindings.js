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
