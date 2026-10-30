'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('canvas'),ctx=canvas.getContext('2d');
const W=768,H=480,keys=new Set();let objects=[],particles=[],skids=[],pickups=[],popups=[],car,state='ready',remaining=90,score=0,dead=0,total=0,shake=0,combo=0,comboTime=0,toastTime=0,last=0,muted=true,audio=null,best=0,seed=301;
try{best=Number(localStorage.getItem('crash-best')||0)}catch{} $('best').textContent=String(best).padStart(5,'0');
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}function clamp(v,a,b){return Math.max(a,Math.min(b,v))}function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
const palette={brick:['#ac6144','#bf7450','#98593e'],crate:['#b78a4c','#c39c60','#a7783d'],barrel:['#b84f38'],fence:['#9f9a70']};
function add(x,y,type,w=16,h=16){objects.push({x,y,w,h,type,hp:type==='brick'?1.4:1,alive:true,tone:Math.floor(rand()*3),hit:0});}
function reset(){seed=301;objects=[];particles=[];skids=[];pickups=[];popups=[];remaining=90;score=0;dead=0;combo=0;comboTime=0;shake=0;keys.clear();
 car={x:384,y:387,a:-Math.PI/2,vx:0,vy:0,hp:100,inv:0};
 // Individual bricks make every wall destructible.
 const wall=(x,y,cols,rows)=>{for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)add(x+i*12,y+j*10,'brick',12,10)};
 wall(108,93,12,2);wall(108,113,2,8);wall(228,113,2,8);wall(108,193,4,2);wall(204,193,4,2);
 wall(503,86,13,2);wall(503,106,2,8);wall(635,106,2,8);wall(551,186,9,2);
 wall(105,304,2,9);wall(129,374,8,2);wall(237,314,2,8);
 wall(504,315,2,9);wall(528,385,11,2);wall(636,315,2,7);
 [[150,137],[178,137],[178,164],[558,130],[581,130],[600,158],[145,340],[175,340],[567,342],[592,342],[357,146],[382,146],[407,146],[370,171],[306,272],[330,272],[444,276],[468,276],[341,63],[365,63]].forEach(([x,y])=>add(x,y,'crate',19,19));
 [[272,130],[470,157],[290,332],[454,358],[529,240],[550,240],[570,240],[175,248],[195,248],[612,285]].forEach(([x,y])=>add(x,y,'barrel',13,17));
 for(let i=0;i<9;i++)add(332+i*13,218,'fence',11,7);
 pickups=[{x:384,y:252},{x:62,y:251},{x:705,y:252}].map(p=>({...p,alive:true}));total=objects.length;toastTime=0;$('toast').classList.remove('show');updateHUD();
}
function noise(freq,duration,volume=.06,type='square'){if(muted)return;try{if(!audio)audio=new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq/4),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function burst(x,y,color,n=10,power=80){for(let i=0;i<n;i++){const a=rand()*Math.PI*2,s=20+rand()*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+rand()*.8,max:1.3,color,size:2+Math.floor(rand()*4)})}}
function message(s){$('toast').textContent=s;$('toast').classList.add('show');toastTime=1.8;}
function destroy(o,explosive=false){if(!o.alive)return;o.alive=false;dead++;combo++;comboTime=1.8;const points=(o.type==='barrel'?150:o.type==='crate'?60:25)*Math.min(5,1+Math.floor(combo/8));score+=points;burst(o.x+o.w/2,o.y+o.h/2,palette[o.type][o.tone%palette[o.type].length],o.type==='barrel'?22:7,explosive?170:90);if(o.type==='crate'||o.type==='barrel')popups.push({x:o.x,y:o.y,t:1,text:'+'+points});
 if(combo===8)message('КРАСИВО! КОМБО ×2');if(combo===24)message('ДВОР НЕ УЗНАТЬ! КОМБО ×4');
 if(o.type==='barrel'){shake=Math.max(shake,7);noise(85,.3,.12,'sawtooth');burst(o.x,o.y,'#ffae48',27,150);burst(o.x,o.y,'#f1df87',13,190);const cx=o.x+7,cy=o.y+8;for(const other of objects){if(other.alive&&Math.hypot(other.x+other.w/2-cx,other.y+other.h/2-cy)<76)destroy(other,true)}if(Math.hypot(car.x-cx,car.y-cy)<67&&car.inv<=0){car.hp-=9;car.inv=.6;}}
}
function updateHUD(){const pct=Math.floor(dead/total*100);$('score').textContent=String(score).padStart(5,'0');$('percent').textContent=pct+' / 65%';$('destruction').style.width=Math.min(100,pct/65*100)+'%';$('hp').textContent=Math.ceil(Math.max(0,car.hp))+'%';$('health').style.width=Math.max(0,car.hp)+'%';const t=Math.ceil(remaining);$('timer').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');$('speed').textContent=Math.round(Math.hypot(car.vx,car.vy)*.55);}
function overlay(title,text,button,eyebrow,hint){$('modalTitle').textContent=title;$('modalText').innerHTML=text;$('start').textContent=button;$('eyebrow').textContent=eyebrow;$('modalHint').textContent=hint;$('overlay').classList.remove('hidden');}
function start(){if(state==='paused'){state='playing';keys.clear();$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Пауза');return}reset();state='playing';$('overlay').classList.add('hidden');$('status').textContent='● ГАЗУЙ. ДВОР САМ СЕБЯ НЕ РАЗНЕСЁТ.';noise(260,.15);canvas.focus();}
function finish(won){state=won?'won':'lost';keys.clear();if(score>best){best=score;try{localStorage.setItem('crash-best',String(best))}catch{}$('best').textContent=String(best).padStart(5,'0')}overlay(won?'Вот это разнос!':car.hp<=0?'Мотору нужен отдых.':'Ещё по газам?',`${won?'Двор разобран. Работа выполнена.':car.hp<=0?'Машинка приняла слишком много ударов.':'В этот раз двор оказался крепче.'}<br>${Math.floor(dead/total*100)}% разрушено · ${score.toLocaleString('ru-RU')} очков`,'ЕЩЁ ОДИН ЗАЕЗД →',won?'МИССИЯ ВЫПОЛНЕНА':'ЗАЕЗД ЗАВЕРШЁН','R — НАЧАТЬ ЗАНОВО');$('status').textContent=won?'● ПРОМДВОР УСПЕШНО РАЗОБРАН':'● ВРЕМЯ НА НОВЫЙ ЗАЕЗД';noise(won?660:120,.4,.08);}
function pause(){if(state==='playing'){state='paused';keys.clear();$('pause').textContent='▶';$('pause').setAttribute('aria-label','Продолжить');overlay('Перекур.','Двор никуда не денется.<br>Продолжим, когда будешь готов.','ПРОДОЛЖИТЬ →','ИГРА НА ПАУЗЕ','P / ESC — ПРОДОЛЖИТЬ')}else if(state==='paused')start()}
function update(dt){if(state!=='playing')return;remaining=Math.max(0,remaining-dt);car.inv-=dt;comboTime-=dt;if(comboTime<=0)combo=0;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show')}
 const up=keys.has('KeyW')||keys.has('ArrowUp'),down=keys.has('KeyS')||keys.has('ArrowDown'),left=keys.has('KeyA')||keys.has('ArrowLeft'),right=keys.has('KeyD')||keys.has('ArrowRight'),drift=keys.has('Space');
 let fx=Math.cos(car.a),fy=Math.sin(car.a);let forward=car.vx*fx+car.vy*fy,lateral=-car.vx*fy+car.vy*fx;
 forward+=(up?245:0)*dt-(down?180:0)*dt;forward*=Math.pow(drift?.78:.66,dt);forward=clamp(forward,-102,drift?210:245);lateral*=Math.pow(drift?.25:.00001,dt);
 if(Math.abs(forward)>3)car.a+=((right?1:0)-(left?1:0))*2.65*dt*clamp(Math.abs(forward)/68,.18,1)*(forward<0?-1:1)*(drift?1.25:1);
 fx=Math.cos(car.a);fy=Math.sin(car.a);car.vx=fx*forward-fy*lateral;car.vy=fy*forward+fx*lateral;
 if(drift&&Math.abs(forward)>55){skids.push({x:car.x-fx*7-fy*6,y:car.y-fy*7+fx*6,t:12},{x:car.x-fx*7+fy*6,y:car.y-fy*7-fx*6,t:12});if(rand()<.35)burst(car.x-fx*10,car.y-fy*10,'#8c9272',1,18)}
 const steps=Math.max(1,Math.ceil(Math.hypot(car.vx,car.vy)*dt/5));for(let step=0;step<steps;step++){car.x+=car.vx*dt/steps;car.y+=car.vy*dt/steps;const speed=Math.hypot(car.vx,car.vy);
 if(car.x<25||car.x>W-25||car.y<25||car.y>H-25){car.x=clamp(car.x,25,W-25);car.y=clamp(car.y,25,H-25);if(speed>45&&car.inv<=0){car.hp-=4;car.inv=.5;shake=3;noise(100,.08)}car.vx*=-.4;car.vy*=-.4;}
 for(const o of objects){if(!o.alive)continue;const nx=clamp(car.x,o.x,o.x+o.w),ny=clamp(car.y,o.y,o.y+o.h),dx=car.x-nx,dy=car.y-ny,d=Math.hypot(dx,dy);if(d<10){if(speed>(o.type==='brick'?70:32)){destroy(o);car.vx*=o.type==='brick'?.95:.985;car.vy*=o.type==='brick'?.95:.985;shake=Math.max(shake,2);if(car.inv<=0){car.hp-=o.type==='brick'?1.5:.5;car.inv=.16;noise(140+rand()*110,.06,.03)}}else{let px=dx,py=dy,len=d;if(len<.01){px=car.x-(o.x+o.w/2);py=car.y-(o.y+o.h/2);if(Math.abs(px)>Math.abs(py)){px=Math.sign(px)||1;py=0}else{py=Math.sign(py)||1;px=0}len=1}car.x+=px/len*(10-d+.2);car.y+=py/len*(10-d+.2);car.vx*=.45;car.vy*=.45;}}}
 }
 for(const p of pickups)if(p.alive&&Math.hypot(car.x-p.x,car.y-p.y)<20&&car.hp<99){p.alive=false;car.hp=Math.min(100,car.hp+35);burst(p.x,p.y,'#c6df78',15,60);message('+35 ПРОЧНОСТИ · СНОВА В БОЙ');noise(700,.14)}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt);p.life-=dt}particles=particles.filter(p=>p.life>0);if(particles.length>800)particles.splice(0,particles.length-800);
 for(const p of popups){p.y-=18*dt;p.t-=dt}popups=popups.filter(p=>p.t>0);for(const s of skids)s.t-=dt;skids=skids.filter(s=>s.t>0);if(skids.length>1500)skids.splice(0,100);shake=Math.max(0,shake-dt*16);updateHUD();if(car.hp<=0)finish(false);else if(dead/total>=.65)finish(true);else if(remaining<=0)finish(false);
}
function ground(){rect(0,0,W,H,'#484e39'); // Sand, concrete and old service roads.
 rect(24,24,720,432,'#555a42');rect(274,24,207,432,'#474c3a');rect(24,221,720,82,'#474c3a');
 for(let x=34;x<W-30;x+=45){rect(x,258,21,3,'#6d7050')}for(let y=40;y<H-25;y+=41){rect(377,y,3,17,'#6b6e4e')}
 // Deterministic ground texture, without moving noise.
 for(let i=0;i<1100;i++){const x=(i*127+17)%720+24,y=(i*73+29)%432+24;rect(x,y,i%3+1,1,i%3?'#62664a':'#3d4634')}
 rect(92,81,173,137,'#65674b');rect(492,74,180,138,'#62654b');rect(93,303,174,103,'#62654b');rect(493,311,180,104,'#60644a');
 // Worn parking lines and wall shadows.
 for(let i=0;i<4;i++){rect(307+i*34,337,2,53,'#777954');rect(307+i*34,337,23,2,'#777954')}rect(307,388,125,2,'#777954');
 ctx.font='bold 13px monospace';ctx.fillStyle='#858263';ctx.save();ctx.translate(417,441);ctx.rotate(Math.PI);ctx.fillText('SLOW',0,0);ctx.restore();
 for(let i=0;i<48;i++){const x=i*16;rect(x,0,14,16,'#252e25');rect(x,464,14,16,'#252e25');rect(x+2,2,11,3,'#626a4d');rect(x+2,466,11,3,'#626a4d')}for(let i=1;i<29;i++){rect(0,i*16,16,14,'#252e25');rect(752,i*16,16,14,'#252e25');rect(2,i*16+1,3,12,'#626a4d');rect(754,i*16+1,3,12,'#626a4d')}
 // Small tufts, industrial markings and gutters.
 for(let i=0;i<60;i++){const x=32+(i*137)%702,y=27+(i*197)%426;if(x<80||x>690||y<65||y>423){rect(x,y,3,5,'#75824c');rect(x-3,y+3,3,2,'#687747')}}
 for(const [x,y] of [[62,102],[704,387],[58,394],[706,75]]){rect(x,y,15,22,'#303b2f');for(let j=0;j<4;j++)rect(x+3,y+3+j*5,9,2,'#171f1b')}
}
function drawObject(o){const {x,y,w,h,type,tone}=o;rect(x+3,y+4,w,h,'#222b2470');if(type==='brick'){rect(x,y,w-1,h-1,palette.brick[tone]);rect(x+1,y+1,w-3,2,'#d29462');rect(x+1,y+h-3,w-3,2,'#7e4c36');rect(x+w-3,y+2,2,h-5,'#8c4d36')}
 else if(type==='crate'){rect(x,y,w,h,'#76552f');rect(x+2,y+2,w-4,h-4,palette.crate[tone]);rect(x+3,y+4,w-6,2,'#d4ac69');rect(x+3,y+h-6,w-6,2,'#8b6637');for(let i=3;i<w-3;i+=3)rect(x+i,y+i,3,3,'#d0a05a');rect(x+1,y+1,3,3,'#e0b276');rect(x+w-4,y+h-4,2,2,'#e0b276')}
 else if(type==='barrel'){rect(x+2,y,w-4,h,'#a74832');rect(x,y+3,w,h-6,'#c15b3c');rect(x+2,y+3,3,h-6,'#e48550');rect(x,y+4,w,2,'#583f33');rect(x,y+h-6,w,2,'#583f33');rect(x+4,y+7,5,3,'#e8bf60');rect(x+4,y+1,4,2,'#e69b61')}
 else{rect(x,y,w,h,'#8d8960');rect(x+1,y+1,w-2,2,'#c2b785');rect(x+3,y+2,2,7,'#696c4d')}
}
function drawCar(){ctx.save();ctx.translate(Math.round(car.x),Math.round(car.y));ctx.rotate(car.a+Math.PI/2);rect(-7,-11,18,29,'#1b251b77');rect(-9,-8,4,7,'#161d1a');rect(5,-8,4,7,'#161d1a');rect(-9,7,4,7,'#161d1a');rect(5,7,4,7,'#161d1a');let paint=car.inv>0&&Math.floor(car.inv*30)%2?'#ffcc8c':'#ee773d';rect(-7,-13,14,28,'#9e432a');rect(-7,-12,14,25,paint);rect(-5,-13,10,2,'#ffc17a');rect(-5,-4,10,10,'#434e43');rect(-4,-3,8,3,'#93b1a0');rect(-4,4,8,3,'#303c35');rect(-4,0,8,4,'#ee874a');rect(-7,-9,2,5,'#ffaf62');rect(-6,10,12,2,'#b95833');rect(-7,-12,3,3,'#f5e9aa');rect(4,-12,3,3,'#f5e9aa');rect(-7,12,3,2,'#ed4634');rect(4,12,3,2,'#ed4634');rect(-5,-16,10,3,'#b9bb96');rect(-6,14,12,2,'#53594a');ctx.restore();if(car.hp<35&&state==='playing'&&rand()<.3)burst(car.x,car.y,'#a0a391',1,14)}
function draw(t){ctx.imageSmoothingEnabled=false;ctx.save();if(shake>0)ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ground();for(const s of skids){ctx.globalAlpha=Math.min(.45,s.t/8);rect(s.x,s.y,3,3,'#20291f')}ctx.globalAlpha=1;
 for(const o of objects)if(!o.alive){rect(o.x+3,o.y+4,6,3,o.type==='barrel'?'#2b3229':'#766749');rect(o.x+o.w-4,o.y+8,3,3,'#3a3e2e')}
 for(const o of objects)if(o.alive)drawObject(o);
 for(const p of pickups)if(p.alive){rect(p.x-10,p.y-8,20,18,'#263d28');rect(p.x-8,p.y-9,16,16,'#8eaf59');rect(p.x-6,p.y-7,12,12,'#bcd77f');rect(p.x-2,p.y-5,4,9,'#355337');rect(p.x-5,p.y-2,10,3,'#355337');if(Math.floor(t/650)%2)rect(p.x-5,p.y-13,10,2,'#e3ecbc')}
 drawCar();for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);rect(p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;ctx.font='bold 11px monospace';ctx.textAlign='center';for(const p of popups){ctx.globalAlpha=Math.min(1,p.t*2);ctx.fillStyle='#f4e8b6';ctx.fillText(p.text,p.x,p.y)}ctx.globalAlpha=1;ctx.textAlign='left';ctx.restore();}
function frame(t){const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);draw(t);requestAnimationFrame(frame)}
document.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat){if(state==='playing')keys.add(e.code);return}if(e.code==='KeyR'){state='ready';start();return}if(e.code==='KeyP'||e.code==='Escape'){pause();return}if((e.code==='Enter'||e.code==='Space')&&state!=='playing'){start();return}if(state==='playing')keys.add(e.code)});document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);b.classList.add('active')});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{keys.delete(b.dataset.key);b.classList.remove('active')})}
$('start').onclick=start;$('restart').onclick=()=>{if(state==='paused')state='ready';start()};$('pause').onclick=pause;
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'♪̸':'♪';$('sound').title=muted?'Включить звук':'Выключить звук';$('sound').setAttribute('aria-label',$('sound').title);$('sound').setAttribute('aria-pressed',String(!muted));if(!muted)noise(440,.12)};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').requestFullscreen()}catch{message('ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН В ЭТОМ ОКНЕ')}};
reset();requestAnimationFrame(frame);
})();
