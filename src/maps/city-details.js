function airportFence(x1,y1,x2,y2){
 const vertical=x1===x2,length=Math.hypot(x2-x1,y2-y1),count=Math.ceil(length/40);
 for(let i=0;i<count;i++){
  const x=x1+(x2-x1)*i/count,y=y1+(y2-y1)*i/count;
  if(vertical&&x===4470&&y>1620&&y<1810)continue;
  const o=add(x,y,'chainFence',vertical?8:length/count,vertical?length/count:8);o.vertical=vertical;o.zone='airport';
 }
}
function buildCityDetails(){
 // Perimeter and service gate separate the airfield from the public avenue.
 airportFence(4470,320,5920,320);airportFence(5920,320,5920,2480);
 airportFence(4470,2480,5920,2480);airportFence(4470,320,4470,2480);
 building(4484,1830,52,44,'station',3);
 for(const x of [4485,4525])addProp(x,1696,'barrier');
 // Equipment has a purpose and sits beside the aircraft, not across taxiways.
 for(const y of [850,1200,1500,1990]){
  for(let i=0;i<3;i++)addCityProp(5030+i*34,y+75,'baggageCart',i,true);
  addCityProp(5110,y+6,'generator',0,true);addCityProp(5265,y+92,'cone',0,true);
 }
 for(let i=0;i<10;i++){addCityProp(4550+i*46,720,'bench',i%3);if(i%2===0)addCityProp(4560+i*46,746,'bin',0)}
 for(let i=0;i<9;i++){addCityProp(4890+i*48,2320,'pipe',i%3);addCityProp(4930+i*38,2270,'pallet',i%3)}
 // Tie-up bollards, hose reels, crates and old tyres give the quay a working edge.
 for(let i=0;i<15;i++){
  addCityProp(3250,3500+i*43,'bollard',i%3,true);
  if(i%3===0){addCityProp(3170,3510+i*43,'pipe',1);addCityProp(3130,3500+i*43,'bin',i%3)}
 }
 for(const [x,y] of [[1850,3570],[2310,3890],[3000,4240],[1240,3720],[1260,4060]]){
  for(let i=0;i<5;i++)addCityProp(x+(i%3)*34,y+Math.floor(i/3)*29,'pallet',i%3);
  addCityProp(x+110,y,'generator',1);addCityProp(x-22,y+50,'bin',2);
 }
 // Quarry clutter is clustered in spoil piles and work areas rather than a grid.
 for(const [cx,cy] of [[4770,3650],[5430,3490],[5590,3830],[5000,3960],[4820,3870]]){
  for(let i=0;i<15;i++){
   const a=i*2.39996,r=12+Math.sqrt(i)*13;addCityProp(cx+Math.cos(a)*r,cy+Math.sin(a)*r,'rock',i%3,true);
  }
 }
 for(const [x,y] of [[4750,3460],[5330,4090],[5710,3530]]){
  addCityProp(x,y,'generator',0,true);addCityProp(x+42,y+12,'pipe',1,true);addCityProp(x+28,y+45,'bin',2,true);
 }
 for(const lot of cityLots){
  for(const dx of [38,270]){addCityProp(lot.x+dx,lot.y+196,'bench');addCityProp(lot.x+dx+33,lot.y+198,'bin')}
 }
 for(const x of [1950,2470])for(const y of [650,738])addCityProp(x,y,'bin');
}
