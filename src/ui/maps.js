function activeMap(){return MAPS.find(m=>m.id===mapId)||MAPS[0]}
function districtName(){
 if(car.x>4400&&car.y<2640)return 'АЭРОПОРТ НОВОГРАД';
 if(car.x>4400&&car.y>3200)return 'БОЛЬШОЙ КАРЬЕР';
 if(CITY_BRIDGES.some(b=>car.x>=b.x-b.approach&&car.x<=b.x+b.w+b.approach&&Math.abs(car.y-b.y)<b.h/2+60))return car.y<2500?'БОЛЬШОЙ МОСТ':'ПОРТОВЫЙ МОСТ';
 if(car.y>3260&&car.x<1500)return 'ГРУЗОВОЕ ДЕПО';
 if(car.y>3260&&car.x<3400)return 'РЕЧНОЙ ПОРТ';
 if(insideStadium(car.x,car.y))return 'СТАДИОН КОМЕТА';
 if(car.x>4000)return 'ОБЪЕЗДНАЯ';
 const col=Math.floor(car.x/512),row=Math.floor(car.y/512);
 if(row>=4&&col<3)return 'ЮЖНЫЕ ГАРАЖИ';
 if(col>=5&&row>=3)return 'ЗЕЛЁНЫЙ КВАРТАЛ';
 if(row<=1)return 'СЕВЕРНЫЙ РАЙОН';
 return col<3?'ПРОМЫШЛЕННЫЙ РАЙОН':col>=5?'ВОСТОЧНЫЙ РАЙОН':'ЦЕНТР';
}
function paintCityOverview(g,w,h){
 const sx=w/6144,sy=h/4608;
 g.fillStyle='#203c30';g.fillRect(0,0,w,h);
 for(let y=0;y<4608;y+=96){g.fillStyle='#477e85';g.fillRect((cityRiverCenter(y)-230)*sx,y*sy,460*sx,98*sy)}
 const zone=(x,y,ww,hh,color)=>{g.fillStyle=color;g.fillRect(x*sx,y*sy,ww*sx,hh*sy)};
 for(let row=0;row<CITY_Y.length-1;row++)for(let col=0;col<CITY_X.length-1;col++)if(!(col>=3&&row<=1))zone(CITY_X[col]+82,CITY_Y[row]+82,348,348,(row+col)%5?'#697c5c':'#81944f');
 zone(1790,250,900,900,'#597e4e');zone(1980,450,520,500,'#8eac6c');
 zone(4440,400,1480,2080,'#7d927d');zone(5470,480,204,1840,'#b8c4ac');zone(4510,480,620,180,'#bfd4b7');
 zone(280,3300,1100,900,'#a49b70');zone(1770,3290,1530,1040,'#8a8962');g.fillStyle='#ac9560';g.beginPath();quarryContour(1).forEach((p,i)=>i?g.lineTo(p[0]*sx,p[1]*sy):g.moveTo(p[0]*sx,p[1]*sy));g.closePath();g.fill();
 for(const r of CITY_ROADS)cityRoadStroke(g,r,r.kind==='bridge'?'#e1c985':'#81967b',24,sx,sy);
 for(const b of CITY_BRIDGES)zone(b.x,b.y-b.h/2,b.w,b.h,'#d4be7f');
 if(w>=200){g.font='bold 7px monospace';g.fillStyle='#e2debb';g.fillText('СТАРЫЙ ГОРОД',8,54);g.fillText('NVG',202,38);g.fillText('ПОРТ',78,110);g.fillText('КАРЬЕР',184,110)}
}
function drawMinimap(){
 if(mapId!=='city')return;
 const district=districtName();if(district!==lastDistrict){lastDistrict=district;$('districtName').textContent=district}
 if(!minimapVisible)return;
 const g=$('minimap').getContext('2d'),sx=144/worldW,sy=108/worldH;
 paintCityOverview(g,144,108);
 g.strokeStyle='#b3ceb077';g.lineWidth=1;g.strokeRect(camera.x*sx,camera.y*sy,W*sx,H*sy);
 g.fillStyle='#ff8a4f';g.fillRect(car.x*sx-2,car.y*sy-2,5,5);
 g.strokeStyle='#ffe0a4';g.beginPath();g.moveTo(car.x*sx,car.y*sy);g.lineTo(car.x*sx+Math.cos(car.a)*6,car.y*sy+Math.sin(car.a)*6);g.stroke();
}
function drawMapPreview(target,id){
 const g=target.getContext('2d');g.imageSmoothingEnabled=false;
 g.fillStyle='#293d2b';g.fillRect(0,0,240,120);
 if(id==='city'){
  paintCityOverview(g,240,120);
 }else{
  g.fillStyle='#4a513b';g.fillRect(8,8,224,104);g.fillStyle='#2e3b2e';g.fillRect(92,8,54,104);g.fillRect(8,53,224,24);
  g.fillStyle='#a76346';for(const [x,y] of [[30,24],[163,24],[30,80],[163,80]]){g.fillRect(x,y,43,4);g.fillRect(x,y,4,22);g.fillRect(x+39,y,4,22)}
  g.fillStyle='#fb8d4c';g.fillRect(115,83,7,12);
 }
}
function syncMapUI(){
 const map=activeMap();$('selectedMapName').textContent=map.name;$('selectedMapKind').textContent=map.subtitle;
 $('mapOpen').setAttribute('aria-label','Выбрать карту. Сейчас '+map.name);
 $('mapLabel').innerHTML='<span>'+(mapId==='city'?'02':'01')+' /</span> '+map.name.toUpperCase();
 $('worldFeatures').textContent=mapId==='city'?'МОСТЫ · АЭРОПОРТ · ПОРТ':'ЯЩИКИ · КИРПИЧИ · ВЗРЫВНЫЕ БОЧКИ';
 $('cityNavigation').hidden=mapId!=='city';lastDistrict='';
 for(const button of document.querySelectorAll('[data-map]')){const active=button.dataset.map===mapId;button.setAttribute('aria-pressed',String(active));$('mapStatus-'+button.dataset.map).textContent=active?'ТЕКУЩАЯ КАРТА':'ВЫБРАТЬ МАРШРУТ →'}
 drawMapPreview($('selectedMapPreview'),mapId);
}
function selectMap(id){
 if(!MAPS.some(m=>m.id===id))return false;
 if(id===mapId){closeMapChooser();return true}
 saveBest();mapId=id;if(mapId==='city')mode='free';
 try{localStorage.setItem('crash-map',mapId)}catch{}
 mapWasPlaying=false;loadBest();syncSettings();syncMapUI();ready();closeMapChooser();return true;
}
function chooseCityStart(id){
 if(!CITY_PLACES.some(p=>p.id===id))return false;
 saveBest();cityStartId=id;mapId='city';mode='free';
 try{localStorage.setItem('crash-city-start',id);localStorage.setItem('crash-map','city')}catch{}
 mapWasPlaying=false;loadBest();syncSettings();syncMapUI();ready();closeMapChooser();return true;
}
function openMapChooser(){
 if(mapOpen||garageOpen)return;
 mapWasPlaying=state==='playing';if(mapWasPlaying)pause();clearInput();mapOpen=true;$('cityStartSelect').value=cityStartId;$('mapDialog').showModal();
}
function closeMapChooser(){if(mapOpen)$('mapDialog').close()}
function setupMapChooser(){
 syncMapUI();for(const map of MAPS)drawMapPreview($('mapPreview-'+map.id),map.id);
 $('mapOpen').onclick=openMapChooser;$('mapToolbar').onclick=openMapChooser;$('mapClose').onclick=closeMapChooser;
 $('mapDialog').addEventListener('close',()=>{mapOpen=false;clearInput();const resume=mapWasPlaying;mapWasPlaying=false;if(resume&&state==='paused')start()});
 for(const button of document.querySelectorAll('[data-map]'))button.onclick=()=>selectMap(button.dataset.map);
 $('cityStartGo').onclick=()=>chooseCityStart($('cityStartSelect').value);
 $('minimapToggle').onclick=()=>{minimapVisible=!minimapVisible;$('minimap').hidden=!minimapVisible;$('minimapToggle').textContent=minimapVisible?'−':'+';$('minimapToggle').setAttribute('aria-expanded',String(minimapVisible));if(state==='playing')canvas.focus()};
}
