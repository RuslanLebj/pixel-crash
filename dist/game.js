'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const speedCtx=$('speedDial').getContext('2d');
let dialSpeed=0;
const W = 768, H = 480, keys = new Set();
const keyboardKeys = new Set(), pointerKeys = new Map();
const drivingKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight']);
const FLEET=[{"id":"dvor","name":"Дворняга","kind":"Первый хэтчбек","inspiration":"Та самая оранжевая машинка. Собственный образ.","paint":"#ee773d","shade":"#9e432a","light":"#ffc17a","shape":"hatch","half":7,"length":28,"roof":10},{"id":"kopeika","name":"Копеечка","kind":"Классический седан","inspiration":"Отсылка к ВАЗ-2101: хром, круглая оптика, простой силуэт.","paint":"#e6d09c","shade":"#9c8052","light":"#fff0c4","shape":"classic","half":8,"length":30,"roof":11},{"id":"golf","name":"Гольфстрим II","kind":"Угловатый хэтчбек","inspiration":"Отсылка к Volkswagen Golf II: короткий зад и чёрные бамперы.","paint":"#ce4f40","shade":"#7e302c","light":"#f28b69","shape":"golf","half":8,"length":26,"roof":12},{"id":"bavarian","name":"Баварец E-30","kind":"Спортивный седан","inspiration":"Отсылка к BMW E30: длинный капот и парные фары.","paint":"#6799c6","shade":"#315b83","light":"#b0d3e8","shape":"bavarian","half":8,"length":31,"roof":11},{"id":"meridian","name":"Меридиан 124","kind":"Большой седан","inspiration":"Отсылка к Mercedes-Benz W124: строгий кузов и широкая оптика.","paint":"#b6c3bb","shade":"#697c74","light":"#e8eee0","shape":"meridian","half":9,"length":34,"roof":13},{"id":"niva","name":"Нивушка 4×4","kind":"Короткий внедорожник","inspiration":"Отсылка к классической «Ниве»: широкие колёса и запаска.","paint":"#9caf6a","shade":"#52683c","light":"#d9df9e","shape":"niva","half":9,"length":27,"roof":13},{"id":"tofu","name":"Тофу-86","kind":"Купе из горных серпантинов","inspiration":"Отсылка к Toyota AE86: чёрно-белый кузов и убирающиеся фары.","paint":"#eee9d4","shade":"#8c9589","light":"#fff9e2","shape":"tofu","half":8,"length":30,"roof":10},{"id":"stuttgart","name":"Штутгарт 911","kind":"Округлый спорткар","inspiration":"Отсылка к Porsche 911: широкая корма, круглая оптика и спойлер.","paint":"#e7ba4d","shade":"#9a6b31","light":"#ffe795","shape":"sport","half":9,"length":30,"roof":10}];
let vehicleId='dvor',garageOpen=false,garageWasPlaying=false;
try{const saved=localStorage.getItem('crash-vehicle');if(FLEET.some(model=>model.id===saved))vehicleId=saved}catch{}
const palette = {brick:['#ac6144','#bf7450','#98593e'],crate:['#b78a4c','#c39c60','#a7783d'],barrel:['#b84f38'],fence:['#9f9a70']};
let objects=[], particles=[], debris=[], rings=[], scars=[], skids=[], pickups=[], popups=[], collapseQueue=[], groups=[], grid=new Map();
let car, state='ready', mode='free', invulnerable=true, remaining=90, elapsed=0, score=0, dead=0, total=0, shake=0;
let combo=0, comboTime=0, toastTime=0, last=0, muted=true, audio=null, best=0, seed=301, cleared=false, driftSmoke=0;
const soundtrack=window.CrashMusic?new window.CrashMusic({onError:()=>{syncMusicButton();message('МУЗЫКА НЕДОСТУПНА В ЭТОМ БРАУЗЕРЕ')}}):null;
function syncMusicButton(){const enabled=!!soundtrack?.enabled;$('music').setAttribute('aria-pressed',String(enabled));$('music').setAttribute('aria-label',enabled?'Выключить музыку':'Включить музыку');$('music').title=(enabled?'Выключить':'Включить')+' музыку «Ночная смена» · 92 BPM';$('music').classList.toggle('music-on',enabled)}
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
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
function immortal(){return mode==='free' && invulnerable}
function loadBest(){try{best=Number(localStorage.getItem(mode==='free'?'crash-best-free':'crash-best')||0)}catch{best=0}$('best').textContent=String(best).padStart(5,'0')}
function saveBest(){if(score<=best)return;best=score;try{localStorage.setItem(mode==='free'?'crash-best-free':'crash-best',String(best))}catch{}$('best').textContent=String(best).padStart(5,'0')}
function syncKey(code){
 const pressed=keyboardKeys.has(code)||[...pointerKeys.values()].includes(code);
 if(pressed)keys.add(code);else keys.delete(code);
 for(const b of document.querySelectorAll('[data-key]'))if(b.dataset.key===code)b.classList.toggle('active',pressed);
 updateControlDiagnostics();
}
function clearInput(){keyboardKeys.clear();pointerKeys.clear();keys.clear();for(const b of document.querySelectorAll('[data-key]'))b.classList.remove('active');updateControlDiagnostics()}
function add(x,y,type,w=16,h=16,group=-1){const o={x,y,w,h,type,group,hp:type==='brick'?1.3:1,alive:true,tone:Math.floor(rand()*3),hit:0};objects.push(o);if(group>=0)groups[group].members.push(o);for(let gx=Math.floor(x/32);gx<=Math.floor((x+w)/32);gx++)for(let gy=Math.floor(y/32);gy<=Math.floor((y+h)/32);gy++){const k=gx+','+gy;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(o)}}
function nearby(x,y,r=15){const found=new Set();for(let gx=Math.floor((x-r)/32);gx<=Math.floor((x+r)/32);gx++)for(let gy=Math.floor((y-r)/32);gy<=Math.floor((y+r)/32);gy++)for(const o of grid.get(gx+','+gy)||[])if(o.alive)found.add(o);return found}
function reset(){dialSpeed=0;seed=301;objects=[];particles=[];debris=[];rings=[];scars=[];skids=[];pickups=[];popups=[];collapseQueue=[];groups=[];grid=new Map();remaining=90;elapsed=0;score=0;dead=0;combo=0;comboTime=0;shake=0;cleared=false;driftSmoke=0;clearInput();
 car={modelId:vehicleId,x:384,y:387,a:-Math.PI/2,vx:0,vy:0,hp:100,inv:0,steer:0,yaw:0,slip:0,driftBlend:0};
 const wall=(x,y,cols,rows)=>{const group=groups.length;groups.push({members:[],lost:0,collapsed:false});for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)add(x+i*12,y+j*10,'brick',12,10,group)};
 wall(108,93,12,2);wall(108,113,2,8);wall(228,113,2,8);wall(108,193,4,2);wall(204,193,4,2);
 wall(503,86,13,2);wall(503,106,2,8);wall(635,106,2,8);wall(551,186,9,2);
 wall(105,304,2,9);wall(129,374,8,2);wall(237,314,2,8);
 wall(504,315,2,9);wall(528,385,11,2);wall(636,315,2,7);
 [[150,137],[178,137],[178,164],[558,130],[581,130],[600,158],[145,340],[175,340],[567,342],[592,342],[357,146],[382,146],[407,146],[370,171],[306,272],[330,272],[444,276],[468,276],[341,63],[365,63]].forEach(([x,y])=>add(x,y,'crate',19,19));
 [[272,130],[470,157],[290,332],[454,358],[529,240],[550,240],[570,240],[175,248],[195,248],[612,285]].forEach(([x,y])=>add(x,y,'barrel',13,17));
 for(let i=0;i<9;i++)add(332+i*13,218,'fence',11,7);
 pickups=[{x:384,y:252},{x:62,y:251},{x:705,y:252}].map(p=>({...p,alive:true}));total=objects.length;toastTime=0;$('toast').classList.remove('show');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Пауза');updateHUD();
}
function noise(freq,duration,volume=.06,type='square'){if(muted)return;try{if(!audio)audio=new AudioContext();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq/4),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function burst(x,y,color,n=10,power=80,smoke=false){for(let i=0;i<n;i++){const a=rand()*Math.PI*2,s=10+rand()*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:smoke?.7+rand()*.6:.3+rand()*.6,color,size:smoke?4+rand()*7:2+Math.floor(rand()*4),smoke})}if(particles.length>650)particles.splice(0,particles.length-650)}
function fragment(x,y,color,n,ix=0,iy=0){for(let i=0;i<n;i++){const a=rand()*Math.PI*2,s=25+rand()*85;debris.push({x,y,z:2+rand()*5,vx:Math.cos(a)*s+ix*.32,vy:Math.sin(a)*s+iy*.32,vz:45+rand()*85,w:3+Math.floor(rand()*5),h:3+Math.floor(rand()*4),a:rand()*6.28,spin:(rand()-.5)*10,life:14+rand()*8,color,cooldown:.25})}if(debris.length>280)debris.splice(0,debris.length-280)}
function message(s){$('toast').textContent=s;$('toast').classList.add('show');toastTime=2.1}
function damage(amount){if(immortal()||car.inv>0)return;car.hp=Math.max(0,car.hp-amount);car.inv=.25}
function destroy(o,explosive=false,ix=0,iy=0){if(!o.alive)return;o.alive=false;dead++;combo++;comboTime=1.8;const points=(o.type==='barrel'?150:o.type==='crate'?60:25)*Math.min(5,1+Math.floor(combo/8));score+=points;saveBest();const cx=o.x+o.w/2,cy=o.y+o.h/2,color=palette[o.type][o.tone%palette[o.type].length];
 fragment(cx,cy,color,o.type==='crate'?6:3,ix,iy);burst(cx,cy,'#b7a078',4,40,true);if(o.type==='crate'||o.type==='barrel')popups.push({x:cx,y:cy,t:1,text:'+'+points});
 if(combo===8)message('КРАСИВО! КОМБО ×2');if(combo===24)message('ДВОР НЕ УЗНАТЬ! КОМБО ×4');
 if(o.group>=0){const g=groups[o.group];g.lost++;if(!g.collapsed&&g.lost/g.members.length>=.34){g.collapsed=true;let delay=.1;for(const other of g.members)if(other.alive){collapseQueue.push({o:other,t:delay});delay+=.025}burst(cx,cy,'#c4ad86',10,50,true)}}
 if(o.type==='barrel')explode(cx,cy);
}
function explode(cx,cy){shake=Math.max(shake,9);noise(80,.35,.12,'sawtooth');scars.push({x:cx,y:cy,size:22+rand()*10});rings.push({x:cx,y:cy,t:0});burst(cx,cy,'#ffae48',28,180);burst(cx,cy,'#f5e9a5',12,210);burst(cx,cy,'#5e6250',12,65,true);
 for(const d of debris){const dx=d.x-cx,dy=d.y-cy,r=Math.hypot(dx,dy);if(r<90){const f=(1-r/90)*180;d.vx+=dx/(r||1)*f;d.vy+=dy/(r||1)*f;d.vz+=f*.6}}
 const dx=car.x-cx,dy=car.y-cy,r=Math.hypot(dx,dy);if(r<90){const push=(1-r/90)*220;car.vx+=dx/(r||1)*push;car.vy+=dy/(r||1)*push;damage(11*(1-r/110))}
 for(const o of objects)if(o.alive&&Math.hypot(o.x+o.w/2-cx,o.y+o.h/2-cy)<76)destroy(o,true,(o.x-cx)*3,(o.y-cy)*3);
}
// Tiny bitmap glyphs keep the instrument pixel-sharp, including offline.
const instrumentGlyphs={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
 '2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
 '4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
 '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],
 '8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
 'K':['101','110','100','110','101'],'M':['101','111','111','101','101'],
 'H':['101','101','111','101','101'],'/':['001','001','010','100','100'],
 'D':['110','101','101','101','110'],'N':['10001','11001','10101','10011','10001'],
 'R':['110','101','110','101','101'],
 'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],
 'C':['111','100','100','100','111'],'E':['111','100','110','100','111'],
 'F':['111','100','110','100','100'],'G':['111','100','101','101','111'],
 'I':['111','010','010','010','111'],'L':['100','100','100','100','111'],
 'O':['111','101','101','101','111'],'P':['110','101','110','100','100'],
 'S':['111','100','111','001','111'],'T':['111','010','010','010','010'],
 'U':['101','101','101','101','111'],'V':['101','101','101','101','010'],
 'Y':['101','101','010','010','010'],':':['000','010','000','010','000'],
 '-':['000','000','111','000','000'],'%':['101','001','010','100','101'],
 '∞':['000','000','101','111','101']
};
function instrumentText(text,x,y,scale,color){
 speedCtx.fillStyle=color;
 for(const letter of text){
  const glyph=instrumentGlyphs[letter];
  if(glyph)for(let row=0;row<5;row++)for(let col=0;col<glyph[row].length;col++)if(glyph[row][col]==='1')speedCtx.fillRect(x+col*scale,y+row*scale,scale,scale);
  x+=((glyph?glyph[0].length:3)+1)*scale;
 }
}
function updateSpeedometer(){
 const speed=Math.hypot(car.vx,car.vy)*.55,forward=car.vx*Math.cos(car.a)+car.vy*Math.sin(car.a);
 $('speed').textContent=String(Math.round(speed)).padStart(3,'0');
 const direction=speed<2?'N':forward<-3?'R':forward>3?'D':'N';
 $('speedDirection').textContent=direction;
 $('speedDirection').setAttribute('aria-label',direction==='R'?'Задний ход':direction==='D'?'Вперёд':'Нейтраль');
}
function instrumentLine(x1,y1,x2,y2,color){
 speedCtx.fillStyle=color;
 const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));
 for(let i=0;i<=steps;i++)speedCtx.fillRect(Math.round(x1+(x2-x1)*i/(steps||1)),Math.round(y1+(y2-y1)*i/(steps||1)),1,1);
}
function segmentDigit(digit,x,y,color){
 const segments={0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
 const rects={a:[4,0,14,3],b:[19,4,3,12],c:[19,21,3,12],d:[4,34,14,3],e:[0,21,3,12],f:[0,4,3,12],g:[4,17,14,3]};
 for(const [name,[dx,dy,w,h]] of Object.entries(rects)){
  speedCtx.fillStyle=(segments[digit]||'').includes(name)?color:'#102820';
  speedCtx.fillRect(x+dx,y+dy,w,h);
 }
}
function instrumentRoundRect(x,y,w,h,r,color){
 // Rasterize rounded contours on the same low-resolution pixel grid as the dial.
 speedCtx.fillStyle=color;
 for(let row=0;row<h;row++){
  const edge=Math.min(row,h-1-row),dy=Math.max(0,r-edge-1);
  const inset=dy?Math.ceil(r-Math.sqrt(r*r-dy*dy)):0;
  speedCtx.fillRect(x+inset,y+row,w-inset*2,1);
 }
}
function instrumentArc(cx,cy,r,start,end,color,size=1){
 speedCtx.fillStyle=color;
 for(let degree=start;degree<=end;degree+=2){
  const angle=degree*Math.PI/180;
  speedCtx.fillRect(Math.round(cx+Math.sin(angle)*r),Math.round(cy-Math.cos(angle)*r),size,size);
 }
}
function drawSpeedometer(dt){
 const speed=Math.hypot(car.vx,car.vy)*.55,controls=readControls(),protectedCar=immortal();
 dialSpeed+=(clamp(speed,0,160)-dialSpeed)*(1-Math.exp(-12*dt));
 const cyan='#9fffd4',amber='#e6bc72',dim='#6d8066',hot=speed>=120;
 speedCtx.fillStyle='#070e0c';speedCtx.fillRect(0,0,384,112);
 // Three softly rounded instrument wells combine the original pods and VFD glass.
 for(const [x,w] of [[7,114],[128,138],[273,104]]){
  instrumentRoundRect(x,6,w,86,16,'#49523e');
  instrumentRoundRect(x+1,7,w-2,84,15,'#0b1711');
  instrumentRoundRect(x+3,9,w-6,80,13,'#09110d');
  // Static, fine-grained instrument material: gentle green-black tonal bands.
  // It is painted before every readout and never flickers or covers the digits.
  const tones=['#101e18','#0f1d17','#0e1c16','#0d1a15','#0c1914','#0b1813','#0a1712'];
  for(let y=16;y<82;y++){
   speedCtx.fillStyle=tones[Math.min(6,Math.floor((y-16)/10))];
   speedCtx.fillRect(x+10,y,w-20,1);
  }
  for(let i=0;i<54;i++){
   speedCtx.fillStyle=i%3?'#1b2b21':'#223127';
   speedCtx.fillRect(x+11+(i*37+3)%(w-22),18+(i*19+7)%61,1,1);
  }
 }
 const cx=63,cy=47;
 instrumentArc(cx,cy,38,0,360,'#3e4f3a');
 instrumentArc(cx,cy,36,-120,120,'#263c2c',2);
 instrumentArc(cx,cy,36,68,120,'#8b5836',2);
 if(dialSpeed>0)instrumentArc(cx,cy,36,-120,-120+dialSpeed*1.5,hot?'#efbb78':cyan,2);
 for(let value=0;value<=160;value+=10){
  const a=(-120+value*1.5)*Math.PI/180,major=value%40===0;
  instrumentLine(Math.round(cx+Math.sin(a)*32),Math.round(cy-Math.cos(a)*32),Math.round(cx+Math.sin(a)*(major?28:30)),Math.round(cy-Math.cos(a)*(major?28:30)),value>=130?amber:'#a6ba95');
  if(major){
   const text=String(value),x=cx+Math.sin(a)*23-text.length*2+1,y=cy-Math.cos(a)*23-2;
   instrumentText(text,Math.round(x),Math.round(y),1,dim);
  }
 }
 const angle=(-120+dialSpeed*1.5)*Math.PI/180;
 instrumentLine(Math.round(cx-Math.sin(angle)*5),Math.round(cy+Math.cos(angle)*5),Math.round(cx+Math.sin(angle)*29),Math.round(cy-Math.cos(angle)*29),'#ff995a');
 speedCtx.fillStyle='#e9c28c';speedCtx.fillRect(cx-2,cy-2,5,5);
 speedCtx.fillStyle='#543d25';speedCtx.fillRect(cx,cy,1,1);
 instrumentText('KM/H',56,62,1,amber);
 // Retain the crisp seven-segment speed display and a slim illuminated speed strip.
 instrumentText('DIGITAL SPEED',143,12,1,amber);
 const digits=String(Math.round(speed)).padStart(3,'0');
 if(digits.length<=3)for(let i=0;i<3;i++)segmentDigit(digits[i],142+i*27,25,hot?'#ffcb85':cyan);
 else instrumentText(digits,142,32,5,cyan);
 instrumentText('KM/H',225,55,1,amber);
 instrumentRoundRect(233,25,23,22,7,'#283c2c');
 instrumentRoundRect(234,26,21,20,6,'#101f16');
 const direction=$('speedDirection').textContent;
 instrumentText(direction,direction==='N'?237:240,29,3,cyan);
 for(let i=0;i<28;i++){
  speedCtx.fillStyle=dialSpeed>=(i+1)/28*160?(i>=21?amber:cyan):'#24382a';
  speedCtx.fillRect(142+i*4,69,3,3);
 }
 const seconds=Math.floor(elapsed),time=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 instrumentText('TIME',143,80,1,dim);instrumentText(time,165,80,1,cyan);
 instrumentText(mode==='free'?'FREE':'90 S',225,80,1,amber);
 // Rounded diagnostics pod: actual body condition, protection, and steering.
 const bodyColor=!protectedCar&&car.hp<30?'#ff875d':cyan;
 instrumentText('BODY',285,13,1,amber);instrumentText(protectedCar?'INF':Math.ceil(car.hp)+'%',344,13,1,bodyColor);
 instrumentLine(293,31,329,31,bodyColor);instrumentLine(293,52,329,52,bodyColor);
 instrumentLine(289,35,289,48,bodyColor);instrumentLine(333,35,333,48,bodyColor);
 instrumentLine(289,35,293,31,bodyColor);instrumentLine(289,48,293,52,bodyColor);
 instrumentLine(329,31,333,35,bodyColor);instrumentLine(329,52,333,48,bodyColor);
 instrumentLine(301,33,301,50,bodyColor);instrumentLine(317,33,321,37,bodyColor);
 instrumentLine(321,37,321,46,bodyColor);instrumentLine(321,46,317,50,bodyColor);
 for(const [x,y] of [[294,27],[320,27],[294,54],[320,54]]){speedCtx.fillStyle=dim;speedCtx.fillRect(x,y,8,3)}
 const health=protectedCar?100:car.hp;
 for(let i=0;i<10;i++){speedCtx.fillStyle=i<Math.ceil(health/10)?bodyColor:'#283b2c';speedCtx.fillRect(357,61-i*4,10,3)}
 instrumentText(protectedCar?'PROTECT':'DAMAGE',291,66,1,protectedCar?amber:dim);
 instrumentText('STEER',285,80,1,dim);
 instrumentRoundRect(312,79,55,5,2,'#2c422f');
 speedCtx.fillStyle=cyan;speedCtx.fillRect(Math.round(338+car.steer*24),78,3,7);
 // Live control lamps sit in a shared, shallow rounded rail.
 instrumentRoundRect(8,96,368,13,6,'#1e2e21');
 instrumentRoundRect(9,97,366,11,5,'#0b1510');
 const lamp=(label,x,on,color)=>{
  instrumentRoundRect(x,100,4,4,1,on?color:'#293a2c');
  instrumentText(label,x+8,100,1,on?color:'#6a7d65');
 };
 lamp('GAS',16,controls.up,cyan);lamp('BRAKE',66,controls.handbrake,'#ff986a');
 lamp('SHIELD',131,protectedCar,amber);lamp('DRIFT',203,Math.abs(car.slip)>28&&speed>30,cyan);
 lamp('REPAIR',266,!protectedCar&&car.hp<30,'#ff875d');
 instrumentText('01',359,100,1,amber);
}
function updateInstrumentPanel(){
 const controls=readControls(),protectedCar=immortal();
 $('consoleHp').textContent=protectedCar?'∞':Math.ceil(car.hp)+'%';
 $('consoleHealthBar').style.width=(protectedCar?100:car.hp)+'%';
 $('consoleProtection').textContent=protectedCar?'ЩИТ ВКЛ.':car.hp<30?'РЕМОНТ':'ЩИТ ВЫКЛ.';
 $('consoleCondition').classList.toggle('warn',!protectedCar&&car.hp<40);
 $('consoleCar').classList.toggle('damaged',!protectedCar&&car.hp<60);
 $('consoleCar').classList.toggle('critical',!protectedCar&&car.hp<30);
 $('consoleGas').classList.toggle('on',controls.up);
 $('consoleBrake').classList.toggle('on',controls.handbrake);
 $('consoleGas').setAttribute('aria-label',controls.up?'Газ нажат':'Газ отпущен');
 $('consoleBrake').setAttribute('aria-label',controls.handbrake?'Ручник нажат':'Ручник отпущен');
 $('consoleSteering').style.left=(50+car.steer*40)+'%';
}
function updateHUD(){updateControlDiagnostics();const pct=Math.floor(dead/total*100);$('score').textContent=String(score).padStart(5,'0');$('percent').textContent=mode==='free'?pct+'%':pct+' / 65%';$('destruction').style.width=Math.min(100,pct/(mode==='free'?100:65)*100)+'%';$('hp').textContent=immortal()?'∞':Math.ceil(car.hp)+'%';$('health').style.width=(immortal()?100:car.hp)+'%';$('health').parentElement.classList.toggle('protected',immortal());$('healthLabel').textContent=immortal()?'Урон отключён':'Прочность машинки';$('timeLabel').textContent=mode==='free'?'БЕЗ ТАЙМЕРА':'ОСТАЛОСЬ';const t=Math.ceil(remaining);$('timer').textContent=mode==='free'?'∞':String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');updateSpeedometer();$('driftIndicator').classList.toggle('on',Math.abs(car.slip)>28&&Math.hypot(car.vx,car.vy)>55)}
function overlay(title,text,button,eyebrow,hint){$('modalTitle').textContent=title;$('modalText').innerHTML=text;$('start').textContent=button;$('eyebrow').textContent=eyebrow;$('modalHint').textContent=hint;$('overlay').classList.remove('hidden')}
function ready(){state='ready';soundtrack?.setPlaying(false);reset();overlay('Устрой беспорядок.',mode==='free'?'Никакого таймера. Разнеси весь двор.<br>'+(immortal()?'Машинка неуязвима — газуй от души.':'Береги машинку и собирай ремкомплекты.'):'Разнеси 65% двора за 90 секунд.<br>Разгоняйся, влетай в стены и береги машинку.','ЗАВЕСТИ МОТОР →',mode==='free'?'СВОБОДНЫЙ ЗАЕЗД':'ГОНКА НА ВРЕМЯ','WASD / СТРЕЛКИ — РУЛИТЬ · ПРОБЕЛ / SHIFT — РУЧНИК');$('status').textContent=mode==='free'?'● СВОБОДА. БЕСПОРЯДОК. НИКАКОЙ СПЕШКИ.':'● ДВОР ГОТОВ К РАЗНОСУ'}
function start(){if(state==='paused'){state='playing';soundtrack?.setPlaying(true);clearInput();$('overlay').classList.add('hidden');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Пауза');canvas.focus();return}saveBest();reset();state='playing';soundtrack?.setPlaying(true);$('overlay').classList.add('hidden');$('status').textContent=mode==='free'?'● СВОБОДНЫЙ ЗАЕЗД · РАЗНЕСИ ВСЁ ДО ОСНОВАНИЯ':'● ГАЗУЙ. ДВОР САМ СЕБЯ НЕ РАЗНЕСЁТ.';noise(260,.15);canvas.focus()}
function restart(){if(state==='paused')state='ready';start()}
function finish(won){state=won?'won':'lost';soundtrack?.setPlaying(false);clearInput();saveBest();overlay(won?'Вот это разнос!':car.hp<=0?'Мотору нужен отдых.':'Ещё по газам?',`${won?'Двор разобран. Работа выполнена.':car.hp<=0?'Машинка приняла слишком много ударов.':'В этот раз двор оказался крепче.'}<br>${Math.floor(dead/total*100)}% разрушено · ${score.toLocaleString('ru-RU')} очков`,'ЕЩЁ ОДИН ЗАЕЗД →',won?'МИССИЯ ВЫПОЛНЕНА':'ЗАЕЗД ЗАВЕРШЁН','R — НАЧАТЬ ЗАНОВО');$('status').textContent=won?'● ПРОМДВОР УСПЕШНО РАЗОБРАН':'● ВРЕМЯ НА НОВЫЙ ЗАЕЗД';noise(won?660:120,.4,.08)}
function pause(){if(state==='playing'){state='paused';soundtrack?.setPlaying(false);clearInput();$('pause').textContent='▶';$('pause').setAttribute('aria-label','Продолжить');overlay('Перекур.','Двор никуда не денется.<br>Продолжим, когда будешь готов.','ПРОДОЛЖИТЬ →','ИГРА НА ПАУЗЕ','P / ESC — ПРОДОЛЖИТЬ')}else if(state==='paused')start()}
function updateDriving(dt){
 const {up,down,left,right,handbrake}=readControls();
 let fx=Math.cos(car.a),fy=Math.sin(car.a),forward=car.vx*fx+car.vy*fy;
 // Engage quickly, then restore traction progressively over about 0.7 seconds.
 car.driftBlend+=((handbrake?1:0)-car.driftBlend)*(1-Math.exp(-(handbrake?30:4)*dt));
 car.steer+=(((right?1:0)-(left?1:0))-car.steer)*(1-Math.exp(-11*dt));
 const targetYaw=car.steer*(2.55+.85*car.driftBlend)*clamp(Math.abs(forward)/80,0,1)*(forward<0?-1:1);
 car.yaw+=(targetYaw-car.yaw)*(1-Math.exp(-(12-5*car.driftBlend)*dt));car.a+=car.yaw*dt;
 // Reproject the existing world velocity after steering: heading and travel direction stay independent.
 fx=Math.cos(car.a);fy=Math.sin(car.a);forward=car.vx*fx+car.vy*fy;let lateral=-car.vx*fy+car.vy*fx;
 const acceleration=(up?265:0)-(down?(forward>0?360:175):0);
 // Motor limits cap added acceleration, not momentum already carried by the car.
 forward=clamp(forward+acceleration*dt,Math.min(-105,forward),Math.max(245,forward));
 const normalDrag=up||down?.3:.65;
 forward*=Math.exp(-(normalDrag+(.85-normalDrag)*car.driftBlend)*dt);
 const sideBeforeGrip=lateral;
 const grip=1.15+9.35*(1-car.driftBlend)**2;
 lateral*=Math.exp(-grip*dt);
 // During exit, redirect most of the fading sideways momentum into travel
 // along the car. This preserves the flow without adding kinetic energy.
 if(!handbrake&&car.driftBlend>0){
  const carriedEnergy=(sideBeforeGrip**2-lateral**2)*.92*clamp(car.driftBlend*4,0,1);
  const direction=Math.sign(forward)||(down&&!up?-1:1);
  forward=direction*Math.sqrt(forward**2+Math.max(0,carriedEnergy));
 }
 car.slip=lateral;
 car.vx=fx*forward-fy*lateral;car.vy=fy*forward+fx*lateral;
 const speed=Math.hypot(car.vx,car.vy);driftSmoke-=dt;
 if((Math.abs(lateral)>22||handbrake)&&speed>55){skids.push({x:car.x-fx*8-fy*6,y:car.y-fy*8+fx*6,t:18},{x:car.x-fx*8+fy*6,y:car.y-fy*8-fx*6,t:18});if(driftSmoke<=0){driftSmoke=.065;burst(car.x-fx*11,car.y-fy*11,'#adb09a',2,15,true)}}
 if(car.hp<40&&!immortal()&&rand()<dt*9)burst(car.x+fx*9,car.y+fy*9,'#727669',1,12,true);
 const steps=Math.max(1,Math.ceil(speed*dt/4));for(let step=0;step<steps;step++){
 car.x+=car.vx*dt/steps;car.y+=car.vy*dt/steps;
 if(car.x<25||car.x>W-25||car.y<25||car.y>H-25){if(car.x<25||car.x>W-25)car.vx*=-.45;if(car.y<25||car.y>H-25)car.vy*=-.45;car.x=clamp(car.x,25,W-25);car.y=clamp(car.y,25,H-25);if(speed>50){damage(4);shake=Math.max(shake,3);burst(car.x,car.y,'#e4cc7b',4,65);noise(100,.07,.03)}}
 for(const o of nearby(car.x,car.y,15)){
 const nx=clamp(car.x,o.x,o.x+o.w),ny=clamp(car.y,o.y,o.y+o.h);let dx=car.x-nx,dy=car.y-ny,d=Math.hypot(dx,dy);if(d>=10)continue;
 const impactSpeed=Math.hypot(car.vx,car.vy),threshold=o.type==='brick'?76:34;
 if(impactSpeed>threshold){const ix=car.vx,iy=car.vy;destroy(o,false,ix,iy);car.vx*=o.type==='brick'?.91:.97;car.vy*=o.type==='brick'?.91:.97;shake=Math.max(shake,2.5);damage(o.type==='brick'?1.7:.6);noise(150+rand()*100,.055,.025)}
 else{if(d<.01){dx=car.x-(o.x+o.w/2);dy=car.y-(o.y+o.h/2);if(Math.abs(dx)>Math.abs(dy)){dx=Math.sign(dx)||1;dy=0}else{dy=Math.sign(dy)||1;dx=0}d=1}const ux=dx/d,uy=dy/d;car.x+=ux*(10-d+.2);car.y+=uy*(10-d+.2);const vn=car.vx*ux+car.vy*uy;if(vn<0){car.vx-=ux*vn*1.3;car.vy-=uy*vn*1.3}if(impactSpeed>32&&o.hit<=0){o.hp-=impactSpeed/110;o.hit=.22;burst(nx,ny,'#c3a875',3,30);if(o.hp<=0)destroy(o,false,car.vx,car.vy)}}
 }
 }
}
function updateDebris(dt){for(const d of debris){d.life-=dt;d.cooldown-=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.vz-=310*dt;d.a+=d.spin*dt;if(d.z<0){d.z=0;if(Math.abs(d.vz)>16){d.vz=-d.vz*.32;d.spin*=.6}else d.vz=0;d.vx*=.78;d.vy*=.78}const drag=Math.exp(-(d.z>0?.6:3)*dt);d.vx*=drag;d.vy*=drag;
 if(d.x<20||d.x>W-20){d.x=clamp(d.x,20,W-20);d.vx*=-.5}if(d.y<20||d.y>H-20){d.y=clamp(d.y,20,H-20);d.vy*=-.5}
 const dx=d.x-car.x,dy=d.y-car.y,r=Math.hypot(dx,dy);if(d.z<12&&r<15){const ux=dx/(r||1),uy=dy/(r||1);d.x=car.x+ux*16;d.y=car.y+uy*16;d.vx=car.vx*.7+ux*45;d.vy=car.vy*.7+uy*45;d.vz=Math.max(d.vz,35);d.spin+=2;car.vx*=.997;car.vy*=.997}
 if(d.z<13&&d.cooldown<=0&&Math.hypot(d.vx,d.vy)>70){for(const o of nearby(d.x,d.y,5)){if(d.x>o.x-3&&d.x<o.x+o.w+3&&d.y>o.y-3&&d.y<o.y+o.h+3){const force=Math.hypot(d.vx,d.vy);o.hp-=force/150;if(o.hp<=0||o.type==='barrel'&&force>100)destroy(o,true,d.vx,d.vy);d.vx*=-.35;d.vy*=-.35;d.cooldown=.2;break}}}
 }debris=debris.filter(d=>d.life>0)}
function update(dt){if(state!=='playing')return;elapsed+=dt;if(mode==='arcade')remaining=Math.max(0,remaining-dt);car.inv=Math.max(0,car.inv-dt);comboTime-=dt;if(comboTime<=0)combo=0;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show')}
 for(const o of objects)o.hit=Math.max(0,o.hit-dt);
 updateDriving(dt);
 const pending=collapseQueue;collapseQueue=[];for(const c of pending){c.t-=dt;if(c.t<=0)destroy(c.o,false,0,20);else collapseQueue.push(c)}
 updateDebris(dt);
 for(const p of pickups)if(p.alive&&Math.hypot(car.x-p.x,car.y-p.y)<20&&car.hp<99&&!immortal()){p.alive=false;car.hp=Math.min(100,car.hp+35);burst(p.x,p.y,'#c6df78',15,60);message('+35 ПРОЧНОСТИ · СНОВА В БОЙ');noise(700,.14)}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-3*dt);p.vy*=Math.exp(-3*dt);p.life-=dt;if(p.smoke){p.size+=5*dt;p.y-=9*dt}}particles=particles.filter(p=>p.life>0);
 for(const p of popups){p.y-=18*dt;p.t-=dt}popups=popups.filter(p=>p.t>0);for(const s of skids)s.t-=dt;skids=skids.filter(s=>s.t>0);if(skids.length>1800)skids.splice(0,100);for(const r of rings)r.t+=dt;rings=rings.filter(r=>r.t<.6);shake=Math.max(0,shake-dt*17);
 updateHUD();if(car.hp<=0&&!immortal())finish(false);else if(mode==='arcade'&&dead/total>=.65)finish(true);else if(mode==='arcade'&&remaining<=0)finish(false);else if(mode==='free'&&dead===total&&!cleared){cleared=true;message('ДВОР РАЗОБРАН НА 100%! R — ВЕРНУТЬ ВСЁ НАЗАД');$('status').textContent='● НИЧЕГО НЕ УЦЕЛЕЛО. R — НОВЫЙ ДВОР.';noise(660,.35)}
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

function drawOriginalCar(){ctx.save();ctx.translate(Math.round(car.x),Math.round(car.y));ctx.rotate(car.a+Math.PI/2);
 rect(-7,-11,18,29,'#1b251b77');ctx.save();ctx.translate(-7,-5);ctx.rotate(car.steer*.42);rect(-2,-4,4,8,'#161d1a');ctx.restore();ctx.save();ctx.translate(7,-5);ctx.rotate(car.steer*.42);rect(-2,-4,4,8,'#161d1a');ctx.restore();rect(-9,7,4,7,'#161d1a');rect(5,7,4,7,'#161d1a');
 const dent=car.hp<70&&!immortal(),wreck=car.hp<35&&!immortal();const paint=car.inv>0&&Math.floor(car.inv*30)%2?'#ffcc8c':'#ee773d';rect(-7,-13,14,28,'#9e432a');rect(-7+(wreck?1:0),-12+(dent?2:0),14-(wreck?2:0),25-(dent?2:0),paint);rect(-5,-13+(dent?2:0),10,2,'#ffc17a');rect(-5,-4,10,10,'#434e43');rect(-4,-3,8,3,'#93b1a0');rect(-4,4,8,3,'#303c35');rect(-4,0,8,4,'#ee874a');rect(-7,-9,2,5,'#ffaf62');rect(-6,10,12,2,'#b95833');rect(-7,-12+(dent?2:0),3,3,'#f5e9aa');if(!wreck)rect(4,-12,3,3,'#f5e9aa');rect(-7,12,3,2,'#ed4634');rect(4,12,3,2,'#ed4634');
 if(dent){rect(-4,-9,5,2,'#8f4b2d');rect(-3,-7,2,3,'#8f4b2d');rect(1,-3,1,3,'#d7e0bf')}if(wreck){rect(0,-9,5,4,'#4a4431');rect(-7,9,3,4,'#8f4b2d')}ctx.save();ctx.rotate(wreck?.22:dent?.1:0);rect(-5,-16+(dent?3:0),10,3,'#b9bb96');ctx.restore();rect(-6,14,12,2,'#53594a');ctx.restore();
}
function vehicleModel(){return FLEET.find(model=>model.id===vehicleId)||FLEET[0]}
function drawVehicleSprite(target,model,steer=0,hp=100,flash=false){
 const r=(x,y,w,h,color)=>{target.fillStyle=color;target.fillRect(x,y,w,h)};
 const h=model.half,L=model.length,front=-Math.floor(L/2),rear=front+L;
 const dent=hp<70,wreck=hp<35,paint=flash?'#ffe0a1':model.paint;
 // Different silhouettes, wheelbases and glass areas remain legible at game scale.
 r(-h+2,front+3,h*2+2,L,'#111b1488');
 const wheelFront=front+7,wheelRear=rear-7,wide=model.shape==='niva'?4:3;
 for(const side of [-1,1]){
  target.save();target.translate(side*h,wheelFront);target.rotate(steer*.42);
  r(-wide/2,-3,wide,6,'#101812');target.restore();
  r(side*h-wide/2,wheelRear-3,wide,6,'#101812');
 }
 if(model.shape==='sport'){
  // Rounded nose, narrow cabin, broad rear arches and a raised spoiler.
  r(-h+3,front,h*2-6,L,model.shade);r(-h+1,front+3,h*2-2,L-5,model.shade);
  r(-h,front+7,h*2,L-11,paint);r(-h+2,front+2,h*2-4,L-3,paint);
  r(-5,-6,10,15,'#273d34');r(-4,-5,8,4,'#a3c2b3');r(-4,1,8,6,model.light);
  r(-7,8,14,3,model.shade);r(-9,rear-5,18,2,'#27362d');r(-8,front+3,4,3,'#fff1c4');r(4,front+3,4,3,'#fff1c4');
 }else{
  r(-h,front,h*2,L,model.shade);
  r(-h+(wreck?1:0),front+1+(dent?1:0),h*2-(wreck?2:0),L-2-(dent?1:0),paint);
  r(-h+2,front+1,h*2-4,2,model.light);
  let roofTop=model.shape==='niva'||model.shape==='golf'?-7:-5;
  if(model.shape==='tofu')roofTop=-5;
  r(-h+2,roofTop,h*2-4,model.roof,'#293c32');
  r(-h+3,roofTop+1,h*2-6,3,'#99b9ac');
  r(-h+3,roofTop+5,h*2-6,Math.max(3,model.roof-8),paint);
  r(-h+3,roofTop+model.roof-3,h*2-6,2,'#758f83');
  r(-h+1,front+4,1,L-8,model.light);r(h-2,front+5,1,L-9,model.shade);
  const chrome=model.shape==='classic'||model.shape==='meridian'?'#c5c8ac':'#29372d';
  r(-h+1,front-1,h*2-2,2,chrome);r(-h+1,rear-1,h*2-2,2,chrome);
  if(model.shape==='classic'){
   r(-h+2,front+2,3,3,'#fff1bd');r(h-5,front+2,3,3,'#fff1bd');r(-2,front+2,4,2,'#656d59');r(-5,rear-5,10,1,model.shade);
  }else if(model.shape==='bavarian'){
   for(const x of [-7,-3,2,5])r(x,front+2,2,2,'#fbefbe');
   r(-1,front+1,2,3,'#253b33');r(-6,front+6,12,1,model.shade);r(-7,rear-4,14,2,'#334c57');
  }else if(model.shape==='meridian'){
   r(-8,front+2,5,3,'#f7efc6');r(3,front+2,5,3,'#f7efc6');r(-2,front+1,4,4,'#4a5f52');r(-1,front+1,1,4,'#d4dfc8');
   r(-6,7,12,1,'#e4e7d2');r(-h-1,-1,2,3,paint);r(h-1,-1,2,3,paint);
  }else if(model.shape==='niva'){
   r(-8,front+2,4,3,'#fff1bd');r(4,front+2,4,3,'#fff1bd');r(-3,front+2,6,2,'#364833');
   r(-5,-1,10,7,model.light);r(-4,0,8,5,paint);r(-4,rear-3,8,4,'#1a281b');r(-2,rear-2,4,2,'#78876c');
  }else if(model.shape==='tofu'){
   r(-h,front+6,2,L-9,'#293b34');r(h-2,front+6,2,L-9,'#293b34');
   r(-7,front+2,5,4,'#253a32');r(2,front+2,5,4,'#253a32');r(-6,front+2,3,2,'#fff6cf');r(3,front+2,3,2,'#fff6cf');
   r(-5,5,10,5,'#68867d');r(-h,rear-4,h*2,2,'#263a32');
  }else{
   r(-h+1,front+2,4,2,'#fff0b6');r(h-5,front+2,4,2,'#fff0b6');r(-h+2,rear-5,h*2-4,2,model.shade);
   if(model.shape==='golf'){r(-6,3,12,5,'#57756a');r(-1,6,6,1,'#b0c3ab');r(-h,rear-2,h*2,3,'#1d2e24')}
  }
 }
 r(-h+1,rear-3,3,2,'#e74b35');r(h-4,rear-3,3,2,'#e74b35');
 if(dent){r(-4,front+5,5,2,model.shade);r(1,-2,1,4,'#d6dabb')}
 if(wreck){r(0,front+4,5,4,'#3f4331');r(-h,rear-6,3,4,model.shade)}
}
function drawCar(){
 if(vehicleId==='dvor'){drawOriginalCar();return}
 ctx.save();ctx.translate(Math.round(car.x),Math.round(car.y));ctx.rotate(car.a+Math.PI/2);
 drawVehicleSprite(ctx,vehicleModel(),car.steer,immortal()?100:car.hp,car.inv>0&&Math.floor(car.inv*30)%2);
 ctx.restore();
}
function drawVehiclePreview(target,model){
 const g=target.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,112,64);
 g.fillStyle='#151e12';g.fillRect(0,0,112,64);g.fillStyle='#35432c';
 for(const y of [10,53]){g.fillRect(12,y,88,1);g.fillRect(12,y===10?10:49,1,5);g.fillRect(99,y===10?10:49,1,5)}
 g.fillStyle='#1e2b1b';for(let x=18;x<100;x+=14)g.fillRect(x,31,6,1);
 g.save();g.translate(56,32);g.rotate(Math.PI/2);g.scale(2,2);drawVehicleSprite(g,model);g.restore();
}
function syncVehicleUI(){
 const model=vehicleModel();$('selectedVehicleName').textContent=model.name;$('selectedVehicleKind').textContent=model.kind;
 $('garageOpen').setAttribute('aria-label','Открыть гараж. Выбрана '+model.name);
 for(const button of document.querySelectorAll('[data-vehicle]')){
  const active=button.dataset.vehicle===vehicleId;button.setAttribute('aria-pressed',String(active));
  $('vehicleStatus-'+button.dataset.vehicle).textContent=active?'ВЫБРАНА':'ВЫБРАТЬ →';
 }
 drawVehiclePreview($('selectedCarPreview'),model);
}
function selectVehicle(id){
 const model=FLEET.find(item=>item.id===id);if(!model)return false;
 vehicleId=id;if(car)car.modelId=id;
 try{localStorage.setItem('crash-vehicle',id)}catch{}
 syncVehicleUI();return true;
}
function openGarage(){
 if(garageOpen)return;garageWasPlaying=state==='playing';
 if(garageWasPlaying)pause();clearInput();garageOpen=true;
 syncVehicleUI();$('garageDialog').showModal();
}
function closeGarage(){if(garageOpen)$('garageDialog').close()}
function finishGarageClose(){
 garageOpen=false;clearInput();
 const resume=garageWasPlaying;garageWasPlaying=false;
 if(resume&&state==='paused')start();
}
function setupGarage(){
 for(const model of FLEET)drawVehiclePreview($('garagePreview-'+model.id),model);
 syncVehicleUI();
 $('garageOpen').onclick=openGarage;$('garageToolbar').onclick=openGarage;$('garageClose').onclick=closeGarage;
 $('garageDialog').addEventListener('close',finishGarageClose);
 for(const button of document.querySelectorAll('[data-vehicle]'))button.onclick=()=>{selectVehicle(button.dataset.vehicle);closeGarage()};
}
function draw(t){ctx.imageSmoothingEnabled=false;ctx.save();if(shake>0)ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ground();
 for(const s of scars){rect(s.x-s.size/2,s.y-s.size/2,s.size,s.size,'#30382b');rect(s.x-s.size*.35,s.y-s.size*.65,s.size*.7,s.size*1.3,'#343b2d')}
 for(const s of skids){ctx.globalAlpha=Math.min(.5,s.t/12);rect(s.x,s.y,3,3,'#20291f')}ctx.globalAlpha=1;
 for(const o of objects)if(!o.alive){rect(o.x+3,o.y+4,6,3,o.type==='barrel'?'#2b3229':'#766749');rect(o.x+o.w-4,o.y+8,3,3,'#3a3e2e')}
 for(const o of objects)if(o.alive){drawObject(o);if(o.hp<1.1){rect(o.x+3,o.y+2,2,4,'#503d2d');rect(o.x+5,o.y+5,3,2,'#503d2d')}}
 for(const p of pickups)if(p.alive){ctx.globalAlpha=immortal()?.45:1;rect(p.x-10,p.y-8,20,18,'#263d28');rect(p.x-8,p.y-9,16,16,'#8eaf59');rect(p.x-6,p.y-7,12,12,'#bcd77f');rect(p.x-2,p.y-5,4,9,'#355337');rect(p.x-5,p.y-2,10,3,'#355337');if(Math.floor(t/650)%2)rect(p.x-5,p.y-13,10,2,'#e3ecbc')}ctx.globalAlpha=1;
 for(const d of debris)if(d.z<5)drawDebris(d);drawCar();for(const d of debris)if(d.z>=5)drawDebris(d);
 for(const r of rings){const radius=8+r.t*145;ctx.globalAlpha=(1-r.t/.6)*.85;for(let i=0;i<24;i++){const a=i*Math.PI/12;rect(r.x+Math.cos(a)*radius-3,r.y+Math.sin(a)*radius-3,6,6,r.t<.18?'#ffe5a0':'#e78a45')}if(r.t<.12){ctx.globalAlpha=(1-r.t/.12)*.6;rect(r.x-20,r.y-20,40,40,'#fff6cf')}}
 for(const p of particles){ctx.globalAlpha=clamp(p.life*(p.smoke?.45:2),0,1);rect(p.x-p.size/2,p.y-p.size/2,Math.ceil(p.size),Math.ceil(p.size),p.color)}ctx.globalAlpha=1;ctx.font='bold 11px monospace';ctx.textAlign='center';for(const p of popups){ctx.globalAlpha=Math.min(1,p.t*2);ctx.fillStyle='#f4e8b6';ctx.fillText(p.text,p.x,p.y)}ctx.globalAlpha=1;ctx.textAlign='left';ctx.restore();
}
function drawDebris(d){ctx.globalAlpha=Math.min(1,d.life/2);rect(d.x-d.w/2+2,d.y-d.h/2+2,d.w,d.h,'#242d2470');ctx.save();ctx.translate(Math.round(d.x),Math.round(d.y-d.z));ctx.rotate(d.a);rect(-d.w/2,-d.h/2,d.w,d.h,d.color);rect(-d.w/2,-d.h/2,d.w,1,'#e4bc7b');ctx.restore();ctx.globalAlpha=1}
function frame(t){const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);draw(t);drawSpeedometer(dt);requestAnimationFrame(frame)}
function syncSettings(){for(const b of document.querySelectorAll('[data-mode]')){const active=b.dataset.mode===mode;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))}$('invulnerability').disabled=mode!=='free';$('damageOption').classList.toggle('disabled',mode!=='free');$('modeHelp').textContent=mode==='free'?'Весь двор твой. Без таймера и финиша.':'Разрушь 65% двора за 90 секунд.';$('recordLabel').textContent=mode==='free'?'РЕКОРД СВОБОДНОГО ЗАЕЗДА':'РЕКОРД НА ВРЕМЯ'}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(b.dataset.mode===mode)return;saveBest();mode=b.dataset.mode;loadBest();syncSettings();ready()};
$('invulnerability').onchange=()=>{invulnerable=$('invulnerability').checked;if(immortal())car.hp=100;if(state==='ready')ready();else{updateHUD();canvas.focus()}};
function nativeInput(target){return target&&(['INPUT','SELECT','TEXTAREA'].includes(target.tagName)||target.isContentEditable)}
document.addEventListener('keydown',e=>{
 if(garageOpen)return;
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
// Preserve the normal layout; fit one complete display into the fullscreen cabinet.
function fitFullscreenDisplay(){
 const game=$('game'),display=$('gameDisplay');
 if(document.fullscreenElement!==game)return;
 const margin=game.clientWidth<600?12:32;
 const width=display.offsetWidth,height=display.offsetHeight;
 if(!width||!height)return;
 const scale=Math.max(.05,Math.min((game.clientWidth-margin*2)/width,(game.clientHeight-margin*2)/height));
 display.style.transform='translate(-50%,-50%) scale('+scale+')';
}
function syncFullscreenDisplay(){
 if(document.fullscreenElement===$('game'))fitFullscreenDisplay();
 else{const display=$('gameDisplay');display.style.width='';display.style.transform=''}
}
window.addEventListener('resize',fitFullscreenDisplay);
document.addEventListener('fullscreenchange',syncFullscreenDisplay);
$('full').onclick=async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else{
   const display=$('gameDisplay');
   display.style.width=display.getBoundingClientRect().width+'px';
   await $('game').requestFullscreen();
   fitFullscreenDisplay();
  }
 }catch{syncFullscreenDisplay();message('ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН В ЭТОМ ОКНЕ')}
};
setupGarage();syncMusicButton();loadBest();syncSettings();ready();requestAnimationFrame(frame);
})();
