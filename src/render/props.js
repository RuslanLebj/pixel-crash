function drawProp(o){
 const {x,y,w,h,type,tone}=o,color=PROP_KINDS[type].colors[tone%3];
 if(type==='plane'){const cx=x+w/2;rect(cx-5,y+10,18,h-10,'#15251e55');rect(x+8,y+59,w-8,21,'#15251e55');rect(cx-22,y+h-18,52,9,'#15251e55')}else rect(x+4,y+5,w,h,'#15251e66');
 if(type==='chainFence'){
  const length=o.vertical?h:w;ctx.save();ctx.translate(x+(o.vertical?w:0),y);if(o.vertical)ctx.rotate(Math.PI/2);
  rect(0,2,length,1,'#b3bba4');rect(0,7,length,1,color);
  for(let i=0;i<length;i+=7){cityPixelLine(i,3,Math.min(length,i+5),7,1,'#6d897e');cityPixelLine(i,7,Math.min(length,i+5),3,1,'#8ca391')}
  for(const px of [0,length-3]){rect(px,0,3,11,'#788e7e');rect(px,0,3,1,'#c5c9a7')}
  ctx.restore();
 }else if(type==='baggageCart'){
  for(const dx of [3,w-8]){rect(x+dx,y-1,5,3,'#233a30');rect(x+dx,y+h-2,5,3,'#233a30')}
  rect(x,y+2,w,h-4,'#82917e');rect(x+2,y+4,w-4,h-8,'#455c50');
  rect(x+3,y+4,9,8,color);rect(x+14,y+3,11,10,'#927654');rect(x+5,y+3,5,1,'#d5bd86');rect(x+w,y+7,7,2,'#a6af94');
 }else if(type==='generator'){
  rect(x+2,y+2,w-4,h-4,'#2d4437');rect(x+4,y+3,w-8,h-6,color);rect(x+5,y+4,9,h-8,'#40554a');
  for(let dy=6;dy<h-5;dy+=3)rect(x+6,y+dy,7,1,'#a4ad92');rect(x+17,y+5,5,5,'#253e35');rect(x+18,y+6,2,1,'#c6d593');
 }else if(type==='bench'){
  rect(x+3,y+3,3,h+2,'#394d3f');rect(x+w-6,y+3,3,h+2,'#394d3f');
  for(let i=0;i<3;i++){rect(x,y+i*4,w,3,color);rect(x+1,y+i*4,w-2,1,'#cfb483')}
 }else if(type==='bin'){
  rect(x+1,y+2,w-2,h-2,color);rect(x,y,w,3,'#b2b695');rect(x+3,y+5,w-6,2,'#29483b');rect(x+2,y+10,w-4,1,'#335543');
 }else if(type==='rock'){
  cityPolygon([[x,y+8],[x+4,y+2],[x+12,y],[x+w-1,y+6],[x+w,y+12],[x+13,y+h],[x+3,y+h-2]],color);
  cityPolygon([[x+4,y+3],[x+12,y+1],[x+17,y+6],[x+8,y+8]],'#c1baa0');rect(x+5,y+11,8,2,'#576452');
 }else if(type==='pipe'){
  for(const dy of [0,6,11]){rect(x+2,y+dy,w-4,5,color);rect(x+3,y+dy,w-6,1,'#c1c4ab');rect(x,y+dy+1,4,4,'#2c493e');rect(x+w-4,y+dy+1,4,4,'#4e6a5c')}
 }else if(type==='bollard'){
  rect(x,y+3,w,h-3,'#34493b');rect(x+2,y+1,w-4,h-1,color);rect(x-2,y+1,w+4,4,'#a39f7a');rect(x,y+1,w,1,'#c1b78d');
 }else if(type==='cone'){
  rect(x,y+h-3,w,3,'#26362a');rect(x+3,y,4,h-2,color);rect(x+1,y+6,w-2,4,color);rect(x+3,y+4,4,2,'#e9dab2');
 }else if(type==='barrier'){
  rect(x+2,y+7,5,6,'#39473c');rect(x+w-7,y+7,5,6,'#39473c');rect(x,y,w,h,color);
  for(let i=0;i<w-3;i+=10){rect(x+i,y+1,5,3,'#d78548');rect(x+i+3,y+4,5,4,'#e7d9ad')}
 }else if(type==='pallet'){
  rect(x,y+3,w,h-3,'#705332');for(let i=0;i<3;i++){rect(x+i*9,y+2,7,h,color);rect(x+i*9+1,y+3,5,2,'#d2b77b')}
  rect(x+3,y,18,15,'#ac9869');rect(x+11,y,2,15,'#d7c38c');rect(x+3,y+6,18,2,'#766240');
 }else if(type==='container'){
  rect(x,y,w,h,'#314d43');rect(x+2,y+2,w-4,h-4,color);rect(x+3,y+2,w-6,2,'#c2cbab66');
  for(let i=7;i<w-4;i+=8){rect(x+i,y+5,2,h-10,'#182e313f');rect(x+i+2,y+5,1,h-10,'#e1d4ad3a')}
  rect(x+w-13,y+3,1,h-6,'#243b36');rect(x+w-8,y+6,2,h-12,'#bac3ab');
 }else if(type==='parkedCar'){
  for(const dx of [7,w-13]){rect(x+dx,y-2,7,4,'#16231c');rect(x+dx,y+h-2,7,4,'#16231c')}
  rect(x,y+3,w,h-6,'#304137');rect(x+3,y,w-6,h,color);rect(x+13,y+3,17,h-6,'#263e3c');
  rect(x+15,y+3,11,2,'#8eaaa0');rect(x+w-4,y+4,3,4,'#e8d3a0');rect(x+w-4,y+h-8,3,4,'#e8d3a0');
 }else if(type==='sign'){
  rect(x+4,y+5,3,16,'#7c8a72');rect(x+w-7,y+5,3,16,'#7c8a72');rect(x,y,w,h,'#d4c9a0');rect(x+1,y+1,w-2,h-2,color);
  rect(x+4,y+4,w-8,2,'#e9d9a9');rect(x+w-9,y+2,3,6,'#e9d9a9');
 }else if(type==='fuelTank'){
  rect(x+3,y,w-6,h,'#3d5045');rect(x,y+5,w,h-10,color);rect(x+5,y+2,w-10,h-4,color);
  rect(x+7,y+6,w-14,3,'#e0dbc0');rect(x+5,y+h/2,w-10,3,'#8c7455');rect(x+w/2-3,y+3,6,6,'#627b6b');
 }else if(type==='plane'){
  const cx=x+w/2;
  rect(cx-9,y+5,18,h-10,color);rect(cx-5,y,10,h,'#d9dfcc');rect(cx-8,y+13,16,9,'#3e6263');
  cityPolygon([[cx-8,y+43],[x,y+69],[x+1,y+79],[cx-8,y+65]],color);cityPolygon([[cx+8,y+43],[x+w,y+69],[x+w-1,y+79],[cx+8,y+65]],color);rect(cx-20,y+72,8,17,'#647c76');rect(cx+12,y+72,8,17,'#647c76');
  rect(cx-26,y+h-25,52,9,color);rect(cx-4,y+h-29,8,26,'#c7814f');rect(cx-8,y+28,3,48,'#6d8c8588');
  for(let dy=28;dy<90;dy+=9){rect(cx-7,y+dy,2,3,'#496c69');rect(cx+5,y+dy,2,3,'#496c69')}
 }else if(type==='machine'){
  rect(x+5,y-2,w-10,9,'#27372d');rect(x+5,y+h-7,w-10,9,'#27372d');
  for(let dx=7;dx<w-8;dx+=7){rect(x+dx,y-1,3,6,'#60705b');rect(x+dx,y+h-5,3,6,'#60705b')}
  rect(x+8,y+5,w-16,h-10,color);rect(x+13,y+8,14,h-16,'#344e48');rect(x+w-11,y+10,17,5,color);
  rect(x+w+3,y+3,7,h-6,'#a9a781');rect(x+14,y+8,10,2,'#88aaa0');
 }
}
function drawPropWreck(o){
 const {x,y,w,h,type}=o;
 if(type==='plane'){
  const cx=x+w/2,cy=y+69;
  // Irregular scorch and torn airframe parts, with no rectangular foundation.
  for(let i=0;i<15;i++){const a=i*2.4,r=8+(i*13)%32;rect(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.6,7+i%5,4,'#26332c88')}
  cityPolygon([[cx-8,y+25],[cx+5,y+31],[cx+10,y+59],[cx+3,y+70],[cx-6,y+61]],'#7c8c81');
  cityPolygon([[cx-12,y+77],[cx+3,y+72],[cx+9,y+109],[cx-4,y+121]],'#8f9b89');
  cityPolygon([[cx-11,y+57],[x+6,y+74],[x+14,y+83],[cx-8,y+69]],'#aab19b');
  cityPolygon([[cx+17,y+66],[x+w-2,y+78],[x+w-14,y+87],[cx+8,y+76]],'#677e71');
  rect(cx-21,y+82,8,10,'#344c43');rect(cx+18,y+86,7,9,'#3e5548');rect(cx-2,y+108,6,11,'#9a754d');
  for(let i=0;i<8;i++)rect(x+8+(i*23)%98,y+28+(i*19)%85,3,2,i%2?'#bcc1a8':'#4c6054');return;
 }
 if(type==='chainFence'){cityPixelLine(x+2,y+4,x+w-2,y+h-3,2,'#7b9383');rect(x,y+2,4,5,'#adb397');return}
 rect(x+3,y+5,w-6,h-8,'#293c3266');
 if(['container','parkedCar','machine','fuelTank'].includes(type)){
  rect(x+5,y+h/2,w-10,4,'#536452');rect(x+8,y+5,5,h-10,'#798372');rect(x+w-15,y+8,7,h-13,'#43584b');
 }
 for(let i=0;i<5;i++)rect(x+3+(i*17)%(w-5),y+4+(i*11)%(h-5),3+i%3,2,'#94957b');
}
