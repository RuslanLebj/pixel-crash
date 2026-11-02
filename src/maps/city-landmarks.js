function addCityProp(x,y,type,tone,allowRoad=false){
 const p=PROP_KINDS[type],cx=x+p.w/2,cy=y+p.h/2;
 if(allowRoad&&cityRoadAt(cx,cy,-14))return;
 if(CITY_PLACES.some(place=>Math.hypot(Math.max(x-place.spawn[0],0,place.spawn[0]-x-p.w),Math.max(y-place.spawn[1],0,place.spawn[1]-y-p.h))<28))return;
 if(![[x,y],[x+p.w,y],[x,y+p.h],[x+p.w,y+p.h]].every(([px,py])=>cityCanDrive(px,py,0))||(!allowRoad&&cityRoadAt(cx,cy,16)))return;
 if([...nearby(cx,cy,Math.max(p.w,p.h)/2+12)].some(o=>x<o.x+o.w+4&&x+p.w+4>o.x&&y<o.y+o.h+4&&y+p.h+4>o.y))return;
 return addProp(x,y,type,tone);
}
function cityCargo(x,y,cols,rows,spacing=102){
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)addCityProp(x+col*spacing,y+row*62,'container',(col+row)%3);
}
function buildCityLandmarks(){
 // Stadium superblock: the central lawn is reachable through two wide entrances.
 building(1840,310,800,100,'stadium',0);building(1840,1000,800,100,'stadium',1);
 for(const x of [1840,2520]){building(x,410,120,230,'stadium',2);building(x,770,120,230,'stadium',3)}
 for(let i=0;i<18;i++){addCityProp(1870+i*40,1140,'barrier');addCityProp(1840+i*44,236,'cone')}
 for(let i=0;i<12;i++)addCityProp(1990+(i%6)*80,440+Math.floor(i/6)*490,'sign');
 // Airport: a runway longer than three viewports, apron, terminal and hangars.
 building(4510,480,620,180,'terminal',5);building(4510,800,70,70,'tower',1);
 building(4520,1120,280,260,'hangar',2);building(4520,1940,380,280,'hangar',3);
 for(const y of [850,1200,1500,1990])addCityProp(5140,y,'plane',y%3,true);
 for(const y of [720,1460,2220]){
  cityCargo(4730,y,3,2,94);
  for(let i=0;i<7;i++)addCityProp(5020+i*30,y+140,'pallet');
  for(let i=0;i<6;i++)addCityProp(5340,y+i*24,'cone',0,true);
 }
 for(let i=0;i<12;i++)addCityProp(4620+i*42,690,'parkedCar',i%3);
 for(const x of [4540,4610,4680])addCityProp(x,2300,'fuelTank');
 for(let i=0;i<16;i++)addCityProp(5420,540+i*104,'barrier',i%3,true);
 // A long railway depot and freight sidings, well south of the old town grid.
 building(320,3490,920,190,'depot',4);building(330,3310,210,120,'station',2);
 for(let row=0;row<3;row++)cityCargo(340,3840+row*90,9,1,108);
 for(let i=0;i<18;i++)addCityProp(340+i*51,3740,'pallet');
 // Port yards stay open down the middle; the banks and cranes define its outline.
 building(1810,3340,570,180,'warehouse',5);building(1850,4080,360,160,'warehouse',2);
 cityCargo(1830,3570,5,2);cityCargo(2260,4120,6,3);
 cityCargo(2800,3340,4,3);cityCargo(2860,3580,4,2);cityCargo(3000,3940,3,5);
 for(const [x,y] of [[3200,3460],[3260,4010]])building(x,y,28,32,'crane',0);
 for(let i=0;i<16;i++)addCityProp(1800+i*71,3940,'pallet');
 for(let i=0;i<10;i++)addCityProp(2410+i*72,3530,'fuelTank');
 // An open construction quarry forms an angled southern edge to the new districts.
 building(5380,3290,260,140,'warehouse',3);
 for(const [x,y,tone] of [[4760,3820,0],[4920,3970,1],[5230,3910,2],[5410,3600,0],[5570,3860,1],[4750,3580,2]])addCityProp(x,y,'machine',tone);
 for(let i=0;i<35;i++)addCityProp(4630+(i%7)*167,3560+Math.floor(i/7)*135,i%3?'pallet':'barrier',i%3);
 for(let i=0;i<12;i++)addCityProp(5140+i*50,4100,'fuelTank');
 building(5480,3650,32,32,'crane',1);building(5700,3890,32,32,'crane',1);
 // The bridge deck is permanent; rail sections, cargo and service objects break.
 for(const b of CITY_BRIDGES){
  for(let x=b.x+24;x<b.x+b.w-24;x+=48)for(const side of [-1,1])addCityProp(x,b.y+side*(b.h/2-6)-5,'barrier',0,true);
  if(b===CITY_BRIDGES[0])for(const x of [3280,4020])for(const side of [-1,1])building(x,b.y+side*116-22,32,44,'bridgeTower',side);
 }
 for(let i=0;i<14;i++){addCityProp(3030+i*84,1600,'cone',0,true);addCityProp(3020+i*84,1840,'sign',1,true)}
 // Add street life and fragile cargo throughout the original districts as well.
 for(const lot of cityLots)if(lot.kind!=='park'){
  for(let i=0;i<22;i++){
   const type=['pallet','cone','parkedCar','sign','barrier','pallet'][i%6];
   addCityProp(lot.x+8+(i*73)%292,lot.y+12+(i*97)%308,type,(i+lot.row)%3);
  }
 }
 for(const road of CITY_ROADS.filter(r=>r.kind==='avenue'))for(const p of cityRoadSamples(road,100,145)){
  if(cityJunctionAt(p.x,p.y,p.dx,p.dy,road))continue;
  for(const side of [-1,1])addCityProp(p.x-p.dy*(road.width/2+28)*side,p.y+p.dx*(road.width/2+28)*side,p.d%2?'cone':'barrier',0,true);
 }
 buildCityDetails();
 for(const p of CITY_PLACES.slice(1))pickups.push({x:p.spawn[0]+32,y:p.spawn[1]+24,alive:true});
}
function cityPolygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill()}
function cityPixelLine(x1,y1,x2,y2,width,color){
 const n=Math.ceil(Math.hypot(x2-x1,y2-y1)/Math.max(1,width/2));for(let i=0;i<=n;i++)rect(x1+(x2-x1)*i/n-width/2,y1+(y2-y1)*i/n-width/2,width,width,color);
}
function cityGroundLabel(text,x,y,size=15){ctx.fillStyle='#c8c2a477';ctx.font='bold '+size+'px monospace';ctx.fillText(text,x,y)}
function drawCityTerrain(){
 // Stair-stepped banks follow the river instead of a rectangular canal.
 for(let y=Math.max(0,Math.floor((camera.y-32)/16)*16);y<Math.min(worldH,camera.y+H+32);y+=16){
  const center=cityRiverCenter(y+8),left=Math.round(center-230);
  rect(left-28,y,516,16,'#7c8261');rect(left-12,y,484,16,'#a09c77');rect(left,y,460,16,'#30585b');
  rect(left+20,y,420,16,'#2a5057');
  for(let i=0;i<6;i++){const x=left+38+(i*71+(y*7)%51)%380;rect(x,y+4+(i*3)%11,19,1,'#5e85802e')}
 }
 if(visible(4380,320,1560,2220)){
  cityPolygon([[4440,350],[5910,350],[5980,2300],[5800,2510],[4610,2460],[4420,2290]],'#737e6b');
  rect(4840,700,590,1600,'#88917a');for(let x=4840;x<5420;x+=96)rect(x,704,1,1588,'#aeb398');
  rect(5470,480,204,1840,'#2d3b38');rect(5480,490,184,1820,'#414c46');
  for(let y=530;y<2280;y+=72){rect(5569,y,6,34,'#dad3b0');for(const x of [5473,5665])rect(x,y,3,6,nightMode?'#a1d9a0':'#76896b')}
  for(const y of [540,2200])for(let i=0;i<6;i++)rect(5500+i*23,y,10,82,'#d8d2b2');
  ctx.save();ctx.translate(5549,795);ctx.rotate(-Math.PI/2);cityGroundLabel('09',0,0,40);ctx.restore();
  ctx.save();ctx.translate(5592,2000);ctx.rotate(Math.PI/2);cityGroundLabel('27',0,0,40);ctx.restore();
  for(const y of [820,1180,1980]){rect(5030,y,330,2,'#d6bc6a');rect(5190,y-30,2,150,'#d6bc6a')}
  cityGroundLabel('NOVOGRAD  /  NVG',4740,2380,28);
 }
 if(visible(1790,250,900,900)){
  rect(1790,250,900,900,'#697c5e');rect(1964,425,552,560,'#355e3f');
  for(let y=450;y<970;y+=64)rect(1980,y,520,32,'#426e44');
  ctx.strokeStyle='#c4cc9a';ctx.lineWidth=2;ctx.strokeRect(1990,464,500,468);ctx.strokeRect(2125,464,230,62);ctx.strokeRect(2125,870,230,62);
  ctx.beginPath();ctx.moveTo(1990,698);ctx.lineTo(2490,698);ctx.stroke();ctx.beginPath();ctx.arc(2240,698,60,0,Math.PI*2);ctx.stroke();
  cityGroundLabel('КОМЕТА',2110,1180,24);
 }
 if(visible(280,3290,1100,900)){
  rect(280,3290,1100,900,'#68705b');
  for(const y of [3855,3945,4035]){
   rect(300,y-15,1030,40,'#525747');for(let x=300;x<1320;x+=14)rect(x,y-12,5,34,'#84744d');
   rect(300,y-4,1030,2,'#b0b7a0');rect(300,y+12,1030,2,'#b0b7a0');
  }
  cityGroundLabel('ГРУЗОВОЙ ВОКЗАЛ',480,4140,20);
 }
 if(visible(1760,3280,1580,1140)){
  cityPolygon([[1770,3290],[3120,3290],[3330,3470],[3290,4200],[3120,4410],[1810,4340]],'#74765e');
  for(let x=1820;x<3290;x+=96)rect(x,3330,1,980,'#8e8d70');
  for(let y=3380;y<4310;y+=96)rect(1800,y,1470,1,'#83836a');
  rect(3300,3460,18,660,'#b4ad86');for(let y=3480;y<4100;y+=56)rect(3302,y,10,14,'#3c5146');
  cityGroundLabel('РЕЧНОЙ ПОРТ',2780,4350,25);
 }
 drawQuarryTerrain();
 drawSiteGroundDetails();
}
function drawCityBridges(){
 for(const b of CITY_BRIDGES)if(visible(b.x-b.approach,b.y-b.h/2-70,b.w+b.approach*2,b.h+140)){
  // Trapezoidal approaches meet the ordinary road at its own width, then flare
  // gradually to the deck. Junctions sit beyond these straight transition zones.
  for(const side of [-1,1]){
   const roadX=side<0?b.x-b.approach:b.x+b.w+b.approach,deckX=side<0?b.x:b.x+b.w;
   for(const [color,roadPad,deckPad] of [['#92977d',15,8],['#5b695a',4,4],['#35413a',0,0]]){
    const r=b.roadWidth/2+roadPad,d=b.h/2+deckPad;
    cityPolygon([[roadX,b.y-r],[deckX,b.y-d],[deckX,b.y+d],[roadX,b.y+r]],color);
   }
   for(const edge of [-1,1])cityPixelLine(roadX,b.y+edge*(b.roadWidth/2-14),deckX,b.y+edge*(b.h/2-15),2,'#d4c997');
  }
  rect(b.x+12,b.y-b.h/2+26,b.w,b.h,'#172f324f');rect(b.x,b.y-b.h/2-8,b.w,b.h+16,'#92977d');
  rect(b.x,b.y-b.h/2-4,b.w,b.h+8,'#5b695a');rect(b.x,b.y-b.h/2,b.w,b.h,'#35413a');
  for(const side of [-1,1])rect(b.x,b.y+side*(b.h/2-15),b.w,2,'#d4c997');
  for(let x=Math.ceil((b.x-b.approach)/48)*48;x<b.x+b.w+b.approach-24;x+=48)rect(x,b.y-1,23,2,'#b7ac72');
  for(let x=b.x+20;x<b.x+b.w;x+=48)rect(x,b.y-b.h/2,2,b.h,'#87958422');
  for(const x of [b.x,b.x+b.w-3]){rect(x,b.y-b.h/2,3,b.h,'#a4a88b');rect(x+1,b.y-b.h/2,1,b.h,'#4b6053')}
  if(b===CITY_BRIDGES[0])for(const side of [-1,1]){
   const y=b.y+side*106;
   for(const [a,c] of [[b.x,3296],[3296,4036],[4036,b.x+b.w]]){
    for(let x=a;x<c;x+=16){const t=(x-a)/(c-a),sag=Math.sin(t*Math.PI)*38;
     rect(x,y+side*sag,5,5,'#c3ad77');if(x%32===0)cityPixelLine(x,y,x,y+side*sag,2,'#8e9d83');
    }
   }
  }
  cityGroundLabel(b.name,b.x+60,b.y-26,16);
 }
}
function drawLandmarkBuilding(o){
 if(!['stadium','terminal','tower','hangar','depot','station','warehouse','crane','bridgeTower'].includes(o.kind))return false;
 const {x,y,w,h,kind}=o;
 if(kind==='crane'){
  const length=o.index?220:160;rect(x+9,y+6,14,34,'#394d41');rect(x,y,w,h,'#d0aa50');rect(x+4,y+4,w-8,h-8,'#6d784f');
  cityPixelLine(x+14,y+14,x+length,y-62,8,'#c6a253');cityPixelLine(x+14,y+14,x+length,y-62,2,'#e0c37a');
  cityPixelLine(x+length,y-62,x+length,y+45,2,'#6c7d68');rect(x+length-5,y+43,11,6,'#d8bc6b');return true;
 }
 if(kind==='bridgeTower'){
  rect(x+6,y+7,w,h,'#192c3155');rect(x,y,w,h,'#b5ae83');rect(x+5,y+4,w-10,h-8,'#536c61');rect(x+11,y+8,10,h-16,'#d2c399');return true;
 }
 rect(x+8,y+10,w,h,'#18251f66');rect(x,y,w,h,'#33463b');rect(x+3,y+3,w-6,h-6,kind==='terminal'?'#89aaa0':kind==='stadium'?'#748c70':'#89907a');
 for(let yy=y+12;yy<y+h-8;yy+=14){rect(x+7,yy,w-14,2,kind==='stadium'?'#a4ad7d':'#c4c6a955');rect(x+7,yy+3,w-14,2,'#465f4e44')}
 if(kind==='terminal'){
  for(let xx=x+14;xx<x+w-12;xx+=32){rect(xx,y+h-20,23,15,'#315858');rect(xx+2,y+h-19,18,2,'#8ac0ae')}
  for(const xx of [x+90,x+310,x+500]){rect(xx,y+h-3,24,70,'#9caa8a');rect(xx+3,y+h,18,65,'#485e55')}
  cityGroundLabel('НОВОГРАД  /  АЭРОВОКЗАЛ',x+35,y+48,21);
 }else if(kind==='tower'){
  rect(x+15,y+16,w-30,h-16,'#acb39b');rect(x+3,y+3,w-6,29,'#436660');rect(x+5,y+4,w-10,3,'#9fc3ae');
  rect(x+w/2-1,y-13,2,32,'#b7b89b');rect(x+w/2-15,y-13,31,3,'#c1b98f');
 }else if(kind==='hangar'||kind==='depot'){
  rect(x+14,y+h-28,w-28,23,'#283f39');for(let xx=x+20;xx<x+w-20;xx+=18)rect(xx,y+h-26,3,19,'#7c9683');
  cityGroundLabel(kind==='hangar'?'HANGAR 0'+o.index:'NOVOGRAD / RAIL',x+20,y+35,18);
 }else if(kind==='stadium'){
  for(let xx=x+11;xx<x+w-10;xx+=16)for(let yy=y+10;yy<y+h-8;yy+=18)rect(xx,yy,8,5,(xx+yy)%3?'#b8ab6a':'#7d9c85');
 }else{cityGroundLabel(kind==='station'?'ДЕПО':'СКЛАД / 0'+o.index,x+12,y+25,14)}
 return true;
}
