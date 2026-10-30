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
 if(car.x<25||car.x>worldW-25||car.y<25||car.y>worldH-25){if(car.x<25||car.x>worldW-25)car.vx*=-.45;if(car.y<25||car.y>worldH-25)car.vy*=-.45;car.x=clamp(car.x,25,worldW-25);car.y=clamp(car.y,25,worldH-25);if(speed>50){damage(4);shake=Math.max(shake,3);burst(car.x,car.y,'#e4cc7b',4,65);noise(100,.07,.03)}}
 for(const o of nearby(car.x,car.y,15)){
 const nx=clamp(car.x,o.x,o.x+o.w),ny=clamp(car.y,o.y,o.y+o.h);let dx=car.x-nx,dy=car.y-ny,d=Math.hypot(dx,dy);if(d>=10)continue;
 if(o.solid){
  let ux,uy,push;
  if(d>.01){ux=dx/d;uy=dy/d;push=10-d+.2}
  else{
   const sides=[{n:car.x-o.x,x:-1,y:0},{n:o.x+o.w-car.x,x:1,y:0},{n:car.y-o.y,x:0,y:-1},{n:o.y+o.h-car.y,x:0,y:1}];
   sides.sort((a,b)=>a.n-b.n);ux=sides[0].x;uy=sides[0].y;push=sides[0].n+10.2;
  }
  car.x+=ux*push;car.y+=uy*push;const vn=car.vx*ux+car.vy*uy;
  if(vn<0){car.vx-=ux*vn*1.35;car.vy-=uy*vn*1.35}
  if(speed>45&&o.hit<=0){o.hit=.25;damage(4);shake=Math.max(shake,3);burst(nx,ny,'#b8b48a',5,50);noise(95,.09,.04)}
  continue;
 }
 const impactSpeed=Math.hypot(car.vx,car.vy),threshold=o.type==='brick'?76:34;
 if(impactSpeed>threshold){const ix=car.vx,iy=car.vy;destroy(o,false,ix,iy);car.vx*=o.type==='brick'?.91:.97;car.vy*=o.type==='brick'?.91:.97;shake=Math.max(shake,2.5);damage(o.type==='brick'?1.7:.6);noise(150+rand()*100,.055,.025)}
 else{if(d<.01){dx=car.x-(o.x+o.w/2);dy=car.y-(o.y+o.h/2);if(Math.abs(dx)>Math.abs(dy)){dx=Math.sign(dx)||1;dy=0}else{dy=Math.sign(dy)||1;dx=0}d=1}const ux=dx/d,uy=dy/d;car.x+=ux*(10-d+.2);car.y+=uy*(10-d+.2);const vn=car.vx*ux+car.vy*uy;if(vn<0){car.vx-=ux*vn*1.3;car.vy-=uy*vn*1.3}if(impactSpeed>32&&o.hit<=0){o.hp-=impactSpeed/110;o.hit=.22;burst(nx,ny,'#c3a875',3,30);if(o.hp<=0)destroy(o,false,car.vx,car.vy)}}
 }
 }
}
function updateDebris(dt){for(const d of debris){d.life-=dt;d.cooldown-=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.vz-=310*dt;d.a+=d.spin*dt;if(d.z<0){d.z=0;if(Math.abs(d.vz)>16){d.vz=-d.vz*.32;d.spin*=.6}else d.vz=0;d.vx*=.78;d.vy*=.78}const drag=Math.exp(-(d.z>0?.6:3)*dt);d.vx*=drag;d.vy*=drag;
 if(d.x<20||d.x>worldW-20){d.x=clamp(d.x,20,worldW-20);d.vx*=-.5}if(d.y<20||d.y>worldH-20){d.y=clamp(d.y,20,worldH-20);d.vy*=-.5}
 const dx=d.x-car.x,dy=d.y-car.y,r=Math.hypot(dx,dy);if(d.z<12&&r<15){const ux=dx/(r||1),uy=dy/(r||1);d.x=car.x+ux*16;d.y=car.y+uy*16;d.vx=car.vx*.7+ux*45;d.vy=car.vy*.7+uy*45;d.vz=Math.max(d.vz,35);d.spin+=2;car.vx*=.997;car.vy*=.997}
 if(d.z<13&&d.cooldown<=0&&Math.hypot(d.vx,d.vy)>70){for(const o of nearby(d.x,d.y,5)){if(d.x>o.x-3&&d.x<o.x+o.w+3&&d.y>o.y-3&&d.y<o.y+o.h+3){const force=Math.hypot(d.vx,d.vy);o.hp-=force/150;if(o.hp<=0||o.type==='barrel'&&force>100)destroy(o,true,d.vx,d.vy);d.vx*=-.35;d.vy*=-.35;d.cooldown=.2;break}}}
 }debris=debris.filter(d=>d.life>0)}
