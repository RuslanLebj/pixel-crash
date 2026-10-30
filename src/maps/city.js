function building(x,y,w,h,kind,index){
 const o=add(x,y,'building',w,h);o.solid=true;o.hp=Infinity;o.kind=kind;o.index=index;
}
function buildCity(){
 cityLots=[];
 for(let row=0;row<CITY_Y.length-1;row++)for(let col=0;col<CITY_X.length-1;col++){
  const x=CITY_X[col]+82,y=CITY_Y[row]+82,w=348,h=348;
  const park=(row===2&&col===3)||(row===0&&col===1)||(row===3&&col===5);
  const kind=park?'park':row>=3&&col<3?'industrial':(col+row*3)%5===0?'parking':'residential';
  cityLots.push({x,y,w,h,kind,row,col});
  if(kind==='park'){
   for(let i=0;i<16;i++){
    const tx=x+28+(i%4)*88,ty=y+28+Math.floor(i/4)*88;
    if(Math.abs(tx-(x+w/2))>28&&Math.abs(ty-(y+h/2))>28)add(tx,ty,'tree',24,24);
   }
   for(const dx of [18,w-30])for(let i=0;i<3;i++)add(x+dx,y+110+i*40,'fence',12,9);
  }else if(kind==='parking'){
   building(x+218,y+22,108,84,'shop',row*7+col);
   for(let i=0;i<6;i++){
    add(x+26+i*44,y+294,'crate',19,19);
    if(i%2===0)add(x+246+(i%3)*22,y+134,'barrel',13,17);
   }
   wall(x+20,y+326,12,1);wall(x+240,y+326,7,1);
  }else if(kind==='industrial'){
   building(x+22,y+22,210,134,'factory',row*7+col);
   building(x+22,y+224,132,100,'garage',row*7+col);
   for(let j=0;j<3;j++)for(let i=0;i<4;i++)add(x+244+i*22,y+30+j*24,'crate',19,19);
   for(let i=0;i<4;i++)add(x+210+i*22,y+270,'barrel',13,17);
   wall(x+178,y+214,2,8);wall(x+244,y+314,7,2);
  }else{
   const inset=22;
   building(x+inset,y+inset,132,108,'home',row*7+col);
   building(x+198,y+inset,128,148,(col+row)%3===0?'shop':'home',row*7+col+1);
   building(x+inset,y+222,154,104,(col+row)%4===0?'cafe':'home',row*7+col+2);
   for(let i=0;i<4;i++)add(x+212+i*26,y+254,'tree',24,24);
   for(let i=0;i<3;i++)add(x+184,y+42+i*30,'crate',19,19);
   wall(x+200,y+322,10,1);
  }
  // Keep the road network empty; obstacles sit inside the courtyards.
  if((row+col)%2===0)pickups.push({x:x+184,y:y+184,alive:true});
 }
 pickups.push({x:704,y:2560,alive:true},{x:2240,y:704,alive:true},{x:3264,y:2240,alive:true});
}
function cityGround(){
 rect(camera.x-2,camera.y-2,W+4,H+4,'#455442');
 for(let gy=Math.floor(camera.y/32);gy<=(camera.y+H)/32;gy++)for(let gx=Math.floor(camera.x/32);gx<=(camera.x+W)/32;gx++){
  const hash=(gx*137+gy*197)>>>0;rect(gx*32+hash%23,gy*32+(hash*7)%27,3,1,hash%3?'#4c5c45':'#3e4d3b');
 }
 for(const lot of cityLots)if(visible(lot.x,lot.y,lot.w,lot.h)){
  const {x,y,w,h,kind}=lot;
  rect(x-16,y-16,w+32,h+32,'#787d68');rect(x-12,y-12,w+24,h+24,'#999b80');
  rect(x,y,w,h,kind==='park'?'#586d42':kind==='parking'?'#515b50':'#68705a');
  if(kind==='park'){
   rect(x+w/2-13,y,26,h,'#aaa17b');rect(x,y+h/2-13,w,26,'#aaa17b');
   rect(x+w/2-30,y+h/2-30,60,60,'#858771');rect(x+w/2-23,y+h/2-23,46,46,'#4c7774');rect(x+w/2-17,y+h/2-17,34,34,'#709b8d');
   for(let i=0;i<4;i++){rect(x+58+i*64,y+67,18,5,'#b1a26b');rect(x+58+i*64,y+73,3,3,'#333f30')}
  }else if(kind==='parking'){
   for(let i=0;i<6;i++){rect(x+20+i*32,y+42,1,55,'#a4a17b');rect(x+20+i*32,y+42,25,1,'#a4a17b');rect(x+20+i*32,y+190,1,55,'#a4a17b');rect(x+20+i*32,y+244,25,1,'#a4a17b')}
   ctx.fillStyle='#9a9e7b';ctx.font='bold 25px monospace';ctx.fillText('P',x+84,y+155);
  }else{
   rect(x+170,y+10,18,h-20,'#535e4d');rect(x+10,y+182,w-20,19,'#535e4d');
   for(let i=0;i<9;i++)rect(x+170,y+18+i*36,18,1,'#7b8067');
  }
 }
 for(const x of CITY_X)if(visible(x-80,0,160,worldH)){
  rect(x-80,0,160,worldH,'#9a9b80');rect(x-68,0,136,worldH,'#555f53');rect(x-64,0,128,worldH,'#343d38');
  rect(x-48,0,1,worldH,'#626b5a');rect(x+47,0,1,worldH,'#626b5a');
 }
 for(const y of CITY_Y)if(visible(0,y-80,worldW,160)){
  rect(0,y-80,worldW,160,'#9a9b80');rect(0,y-68,worldW,136,'#555f53');rect(0,y-64,worldW,128,'#343d38');
  rect(0,y-48,worldW,1,'#626b5a');rect(0,y+47,worldW,1,'#626b5a');
 }
 for(const x of CITY_X)if(visible(x-80,0,160,worldH))for(let y=Math.floor(camera.y/48)*48;y<camera.y+H+48;y+=48)
  if(!CITY_Y.some(c=>Math.abs(c-y)<92))rect(x-1,y,2,22,'#b9aa70');
 for(const y of CITY_Y)if(visible(0,y-80,worldW,160))for(let x=Math.floor(camera.x/48)*48;x<camera.x+W+48;x+=48)
  if(!CITY_X.some(c=>Math.abs(c-x)<92))rect(x,y-1,22,2,'#b9aa70');
 for(const x of CITY_X)for(const y of CITY_Y)if(visible(x-90,y-90,180,180)){
  rect(x-68,y-68,136,136,'#343d38');
  for(let i=0;i<7;i++)for(const side of [-1,1]){
   rect(x-43+i*13,y+side*78-6,7,12,'#b3b296');rect(x+side*78-6,y-43+i*13,12,7,'#b3b296');
  }
  for(const [sx,sy] of [[-1,-1],[1,1]]){
   rect(x+sx*74-2,y+sy*91,4,18,'#29392b');rect(x+sx*74-4,y+sy*91-1,8,12,'#222c24');rect(x+sx*74-2,y+sy*91+2,4,3,'#b7d679');
  }
 }
 // Small gutters, worn asphalt, and the outside perimeter remain fixed in world space.
 for(let gy=Math.floor(camera.y/48);gy<=(camera.y+H)/48;gy++)for(let gx=Math.floor(camera.x/48);gx<=(camera.x+W)/48;gx++){
  const h=(gx*97+gy*61)>>>0;rect(gx*48+h%31,gy*48+(h*13)%37,3,1,'#a3a38533');
 }
 rect(0,0,worldW,16,'#283b2a');rect(0,worldH-16,worldW,16,'#283b2a');rect(0,0,16,worldH,'#283b2a');rect(worldW-16,0,16,worldH,'#283b2a');
}
function drawBuilding(o){
 const {x,y,w,h,kind,index}=o;
 const roof=['#797d65','#8b7057','#677777','#927f68'][(index||0)%4];
 rect(x+8,y+10,w,h,'#18251f66');rect(x,y,w,h,'#323f36');rect(x,y,w,5,'#c0b28a');
 rect(x+3,y+5,w-6,h-12,'#9b9278');rect(x+7,y+8,w-14,h-20,roof);
 for(let sy=y+18;sy<y+h-19;sy+=14)rect(x+10,sy,w-20,1,'#263d3333');
 rect(x+8,y+8,w-16,2,'#d5c29b55');rect(x+8,y+h-15,w-16,3,'#39493b');
 for(let sx=x+14;sx<x+w-20;sx+=24){rect(sx,y+h-9,12,5,'#2a4742');rect(sx+1,y+h-9,9,1,'#8fa699')}
 const ventX=x+w-36;rect(ventX+2,y+20,20,18,'#3b4b3d');rect(ventX,y+17,20,18,'#abb29a');
 for(let i=0;i<4;i++)rect(ventX+3,y+20+i*3,14,1,'#5d7160');
 rect(x+21,y+22,12,15,'#505f4c');rect(x+20,y+20,12,14,'#a9a98a');
 const doorX=x+Math.floor(w/2)-10;rect(doorX,y+h-7,20,9,'#1b2c25');rect(doorX+3,y+h-6,14,6,'#5e7e6b');
 if(kind==='shop'||kind==='cafe'||kind==='garage'){
  const awning=kind==='cafe'?'#b1734d':kind==='garage'?'#718b67':'#629e8c';
  rect(x+12,y+h-21,w-24,14,awning);for(let sx=x+14;sx<x+w-15;sx+=12)rect(sx,y+h-21,5,14,'#dfcf9e44');
  ctx.fillStyle='#f1e1b1';ctx.font='bold 8px monospace';ctx.fillText(kind==='cafe'?'CAFE':kind==='garage'?'GARAGE':'MARKET',x+18,y+h-11);
 }else if(kind==='factory'){
  for(let sx=x+48;sx<x+w-20;sx+=34){rect(sx,y+28,19,60,'#485b53');rect(sx+2,y+30,15,56,'#819888');rect(sx+2,y+56,15,2,'#4b6456')}
  rect(x+18,y+h-28,w-36,12,'#3e5447');ctx.fillStyle='#c1bd8e';ctx.font='bold 8px monospace';ctx.fillText('NOVOGRAD / DEPOT',x+24,y+h-19);
 }
}
function drawTree(o){
 const {x,y}=o;rect(x+5,y+9,26,22,'#15281e55');rect(x+10,y+17,5,13,'#6e573b');
 rect(x+3,y+3,19,20,'#304c32');rect(x,y+8,25,11,'#3b603a');rect(x+6,y,12,23,'#477347');rect(x+5,y+4,13,5,'#69874f');rect(x+2,y+11,6,3,'#537c42');
}
