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
