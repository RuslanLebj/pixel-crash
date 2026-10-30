function add(x,y,type,w=16,h=16,group=-1){const o={x,y,w,h,type,group,hp:type==='brick'?1.3:1,alive:true,tone:Math.floor(rand()*3),hit:0};objects.push(o);if(group>=0)groups[group].members.push(o);for(let gx=Math.floor(x/32);gx<=Math.floor((x+w)/32);gx++)for(let gy=Math.floor(y/32);gy<=Math.floor((y+h)/32);gy++){const k=gx+','+gy;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(o)}return o}
function nearby(x,y,r=15){const found=new Set();for(let gx=Math.floor((x-r)/32);gx<=Math.floor((x+r)/32);gx++)for(let gy=Math.floor((y-r)/32);gy<=Math.floor((y+r)/32);gy++)for(const o of grid.get(gx+','+gy)||[])if(o.alive)found.add(o);return found}
function wall(x,y,cols,rows){
 const group=groups.length;groups.push({members:[],lost:0,collapsed:false});
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)add(x+i*12,y+j*10,'brick',12,10,group);
}
function updateCamera(dt=0,snap=false){
 const targetX=clamp(car.x-W/2+car.vx*.22,0,Math.max(0,worldW-W));
 const targetY=clamp(car.y-H/2+car.vy*.22,0,Math.max(0,worldH-H));
 const blend=snap?1:1-Math.exp(-7*dt);
 camera.x+=(targetX-camera.x)*blend;camera.y+=(targetY-camera.y)*blend;
}
function visible(x,y,w=1,h=1,margin=48){return x+w>=camera.x-margin&&x<=camera.x+W+margin&&y+h>=camera.y-margin&&y<=camera.y+H+margin}
function visibleObjects(){
 if(mapId==='yard')return objects;
 const found=new Set();
 for(let x=Math.floor((camera.x-48)/32);x<=Math.floor((camera.x+W+48)/32);x++)
  for(let y=Math.floor((camera.y-48)/32);y<=Math.floor((camera.y+H+48)/32);y++)
   for(const o of grid.get(x+','+y)||[])found.add(o);
 return [...found];
}

function reset(){dialSpeed=0;seed=activeMap().seed;objects=[];particles=[];debris=[];rings=[];scars=[];skids=[];pickups=[];popups=[];collapseQueue=[];groups=[];grid=new Map();remaining=90;elapsed=0;score=0;dead=0;combo=0;comboTime=0;shake=0;cleared=false;driftSmoke=0;clearInput();
 const map=activeMap();worldW=map.w;worldH=map.h;cityLots=[];
 car={modelId:vehicleId,x:map.spawn[0],y:map.spawn[1],a:-Math.PI/2,vx:0,vy:0,hp:100,inv:0,steer:0,yaw:0,slip:0,driftBlend:0};
 if(mapId==='city')buildCity();else buildYard();
 total=objects.filter(o=>!o.solid).length;toastTime=0;camera={x:0,y:0};updateCamera(0,true);
 $('toast').classList.remove('show');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Пауза');updateHUD();
}
