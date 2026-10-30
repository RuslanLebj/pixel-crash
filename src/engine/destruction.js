function burst(x,y,color,n=10,power=80,smoke=false){for(let i=0;i<n;i++){const a=rand()*Math.PI*2,s=10+rand()*power;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:smoke?.7+rand()*.6:.3+rand()*.6,color,size:smoke?4+rand()*7:2+Math.floor(rand()*4),smoke})}if(particles.length>650)particles.splice(0,particles.length-650)}
function fragment(x,y,color,n,ix=0,iy=0){for(let i=0;i<n;i++){const a=rand()*Math.PI*2,s=25+rand()*85;debris.push({x,y,z:2+rand()*5,vx:Math.cos(a)*s+ix*.32,vy:Math.sin(a)*s+iy*.32,vz:45+rand()*85,w:3+Math.floor(rand()*5),h:3+Math.floor(rand()*4),a:rand()*6.28,spin:(rand()-.5)*10,life:14+rand()*8,color,cooldown:.25})}if(debris.length>280)debris.splice(0,debris.length-280)}
function damage(amount){if(immortal()||car.inv>0)return;car.hp=Math.max(0,car.hp-amount);car.inv=.25}
function destroy(o,explosive=false,ix=0,iy=0){if(!o.alive||o.solid)return;o.alive=false;dead++;combo++;comboTime=1.8;const points=(o.type==='barrel'?150:o.type==='crate'?60:25)*Math.min(5,1+Math.floor(combo/8));score+=points;saveBest();const cx=o.x+o.w/2,cy=o.y+o.h/2,color=palette[o.type][o.tone%palette[o.type].length];
 fragment(cx,cy,color,o.type==='crate'?6:3,ix,iy);burst(cx,cy,'#b7a078',4,40,true);if(o.type==='crate'||o.type==='barrel')popups.push({x:cx,y:cy,t:1,text:'+'+points});
 if(combo===8)message('КРАСИВО! КОМБО ×2');if(combo===24)message('ДВОР НЕ УЗНАТЬ! КОМБО ×4');
 if(o.group>=0){const g=groups[o.group];g.lost++;if(!g.collapsed&&g.lost/g.members.length>=.34){g.collapsed=true;let delay=.1;for(const other of g.members)if(other.alive){collapseQueue.push({o:other,t:delay});delay+=.025}burst(cx,cy,'#c4ad86',10,50,true)}}
 if(o.type==='barrel')explode(cx,cy);
}
function explode(cx,cy){shake=Math.max(shake,9);noise(80,.35,.12,'sawtooth');scars.push({x:cx,y:cy,size:22+rand()*10});rings.push({x:cx,y:cy,t:0});burst(cx,cy,'#ffae48',28,180);burst(cx,cy,'#f5e9a5',12,210);burst(cx,cy,'#5e6250',12,65,true);
 for(const d of debris){const dx=d.x-cx,dy=d.y-cy,r=Math.hypot(dx,dy);if(r<90){const f=(1-r/90)*180;d.vx+=dx/(r||1)*f;d.vy+=dy/(r||1)*f;d.vz+=f*.6}}
 const dx=car.x-cx,dy=car.y-cy,r=Math.hypot(dx,dy);if(r<90){const push=(1-r/90)*220;car.vx+=dx/(r||1)*push;car.vy+=dy/(r||1)*push;damage(11*(1-r/110))}
 for(const o of nearby(cx,cy,90))if(!o.solid&&o.alive&&Math.hypot(o.x+o.w/2-cx,o.y+o.h/2-cy)<76)destroy(o,true,(o.x-cx)*3,(o.y-cy)*3);
}
