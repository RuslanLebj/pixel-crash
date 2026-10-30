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
