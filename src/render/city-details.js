function quarryContour(scale,level=0){
 const out=[];
 for(let i=0;i<28;i++){
  const a=i*Math.PI*2/28,rough=1+.07*Math.sin(a*3+.4)+.04*Math.cos(a*7);
  out.push([Math.round((5150+level*11+Math.cos(a)*520*scale*rough)/4)*4,Math.round((3760+level*8+Math.sin(a)*330*scale*rough)/4)*4]);
 }
 return out;
}
function drawQuarryTerrain(){
 if(!visible(4510,3330,1400,900))return;
 const colors=['#8d8466','#aa9875','#948163','#82755b','#756b56'];
 for(let i=0;i<5;i++){
  const points=quarryContour([1,.86,.7,.54,.36][i],i);
  cityPolygon(points.map(p=>[p[0],p[1]+9]),'#5d5c47');cityPolygon(points,colors[i]);
  // Broken ledges and exposed rock faces follow the pit's own outline.
  for(let j=0;j<points.length;j+=2){const a=points[j],b=points[(j+1)%points.length];cityPixelLine(a[0],a[1],b[0],b[1],2,j<14?'#c1af86':'#685d49')}
 }
 cityPolygon([[5190,3840],[5220,3828],[5274,3835],[5312,3858],[5288,3883],[5236,3888],[5196,3869]],'#65756c');
 for(let i=0;i<200;i++){
  const a=i*2.39996,r=34+(i*37)%460,x=5150+Math.cos(a)*r,y=3760+Math.sin(a)*r*.58;
  if(visible(x,y,6,6))rect(x,y,i%4+1,1,i%3?'#e0c39333':'#443d3444');
 }
 cityGroundLabel('КАРЬЕР / 04',5360,3430,17);
}
function drawSiteGroundDetails(){
 // Concrete joints, stains and service markings stay when an aircraft breaks.
 if(visible(4470,320,1450,2160)){
  for(let y=720;y<2310;y+=64)for(let x=4840;x<5420;x+=72){
   if(!visible(x,y,72,64))continue;
   rect(x,y,1,64,'#56695c33');rect(x,y,72,1,'#b5b69b44');
   if((x+y)%5===0){rect(x+18,y+20,8,2,'#47564b33');rect(x+20,y+22,13,2,'#47564b22')}
  }
  for(const y of [850,1200,1500,1990]){
   ctx.strokeStyle='#d5c483';ctx.lineWidth=2;ctx.strokeRect(5100,y-20,180,180);
   cityGroundLabel(String([850,1200,1500,1990].indexOf(y)+1).padStart(2,'0'),5108,y+8,12);
   rect(5195,y+132,2,30,'#e7ce7e');rect(5178,y+159,36,2,'#e7ce7e');
  }
  for(let i=0;i<12;i++){rect(4590+i*43,680,33,2,'#ceca9d');rect(4590+i*43,680,2,35,'#ceca9d')}
  for(const x of [5450,5685])for(let y=510;y<2310;y+=48)rect(x,y,4,3,nightMode?'#97c9ad':'#b8baa1');
  rect(4492,1876,40,6,'#bdaf77');cityGroundLabel('КПП / NVG',4490,1820,9);
 }
 if(visible(1760,3280,1580,1140)){
  for(let y=3480;y<4160;y+=48){
   rect(3280,y,12,8,'#253f3d');rect(3282,y+2,8,3,'#626d56');
   for(let i=0;i<3;i++)rect(3338+i*11,y+16+i%2,7,1,'#a6bab533');
  }
  for(let i=0;i<48;i++){const x=1810+(i*139)%1430,y=3330+(i*197)%970;if(visible(x,y,10,10)){rect(x,y,6,2,'#38473733');rect(x+2,y+2,10,1,'#38473722')}}
 }
 if(visible(280,3290,1100,900)){
  for(let i=0;i<22;i++){const x=330+i*44;rect(x,3820,6,5,'#baa680');rect(x+1,3821,4,2,'#d3c09a')}
  for(let y=3700;y<4160;y+=80)rect(1300,y,10,28,'#657161');
 }
 for(const lot of cityLots)if(visible(lot.x,lot.y,lot.w,lot.h)){
  for(const dx of [18,320]){rect(lot.x+dx,lot.y+170,11,16,'#3a4c3d');for(let i=0;i<4;i++)rect(lot.x+dx+2,lot.y+172+i*3,7,1,'#1b2e25')}
  for(let i=0;i<8;i++){const x=lot.x+15+(i*79)%308,y=lot.y+15+(i*103)%308;rect(x,y,2,1,'#bac39a66');rect(x+3,y+2,1,2,'#2a413c55')}
 }
}
function drawSiteSurfaceDetails(){
 // Aviation taxiways use yellow guidance lines; public-road striping ends at the gate.
 if(visible(4470,1650,220,150)){
  for(let i=0;i<7;i++)rect(4494,1674+i*15,24,6,'#d8d3ae');
  cityGroundLabel('SERVICE',4535,1765,11);
 }
 for(const road of CITY_ROADS)if(road.kind==='dirt')for(const p of cityRoadSamples(road,12,20))if(visible(p.x,p.y,20,20)){
  for(const side of [-1,1])rect(p.x-p.dy*side*9,p.y+p.dx*side*9,3,2,'#5e5b4633');
 }
}
