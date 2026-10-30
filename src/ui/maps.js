function activeMap(){return MAPS.find(m=>m.id===mapId)||MAPS[0]}
function districtName(){
 const col=Math.floor(car.x/512),row=Math.floor(car.y/512);
 if(row>=4&&col<3)return 'ЮЖНЫЕ ГАРАЖИ';
 if(col>=5&&row>=3)return 'ЗЕЛЁНЫЙ КВАРТАЛ';
 if(row<=1)return 'СЕВЕРНЫЙ РАЙОН';
 return col<3?'ПРОМЫШЛЕННЫЙ РАЙОН':col>=5?'ВОСТОЧНЫЙ РАЙОН':'ЦЕНТР';
}
function drawMinimap(){
 if(mapId!=='city')return;
 const district=districtName();if(district!==lastDistrict){lastDistrict=district;$('districtName').textContent=district}
 if(!minimapVisible)return;
 const g=$('minimap').getContext('2d'),sx=144/worldW,sy=108/worldH;
 g.fillStyle='#1b2d23';g.fillRect(0,0,144,108);
 g.fillStyle='#62735d';for(const x of CITY_X)g.fillRect(x*sx-2,0,4,108);for(const y of CITY_Y)g.fillRect(0,y*sy-2,144,4);
 for(const lot of cityLots){g.fillStyle=lot.kind==='park'?'#7b9555':lot.kind==='industrial'?'#9c835a':'#455b48';g.fillRect(lot.x*sx,lot.y*sy,lot.w*sx,lot.h*sy)}
 g.strokeStyle='#b3ceb077';g.lineWidth=1;g.strokeRect(camera.x*sx,camera.y*sy,W*sx,H*sy);
 g.fillStyle='#ff8a4f';g.fillRect(car.x*sx-2,car.y*sy-2,5,5);
 g.strokeStyle='#ffe0a4';g.beginPath();g.moveTo(car.x*sx,car.y*sy);g.lineTo(car.x*sx+Math.cos(car.a)*6,car.y*sy+Math.sin(car.a)*6);g.stroke();
}
function drawMapPreview(target,id){
 const g=target.getContext('2d');g.imageSmoothingEnabled=false;
 g.fillStyle='#293d2b';g.fillRect(0,0,240,120);
 if(id==='city'){
  g.fillStyle='#899477';for(let i=0;i<6;i++)g.fillRect(17+i*41,0,12,120);for(let i=0;i<4;i++)g.fillRect(0,8+i*33,240,10);
  for(let r=0;r<3;r++)for(let c=0;c<5;c++){g.fillStyle=(r+c)%4?'#6d7760':'#759658';g.fillRect(34+c*41,23+r*33,23,18);g.fillStyle='#aaa181';g.fillRect(35+c*41,24+r*33,15,6)}
  g.fillStyle='#fb8d4c';g.fillRect(62,84,5,8);
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
 $('worldFeatures').textContent=mapId==='city'?'ПРОСПЕКТЫ · ДВОРЫ · ПАРКИ':'ЯЩИКИ · КИРПИЧИ · ВЗРЫВНЫЕ БОЧКИ';
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
function openMapChooser(){
 if(mapOpen||garageOpen)return;
 mapWasPlaying=state==='playing';if(mapWasPlaying)pause();clearInput();mapOpen=true;$('mapDialog').showModal();
}
function closeMapChooser(){if(mapOpen)$('mapDialog').close()}
function setupMapChooser(){
 syncMapUI();for(const map of MAPS)drawMapPreview($('mapPreview-'+map.id),map.id);
 $('mapOpen').onclick=openMapChooser;$('mapToolbar').onclick=openMapChooser;$('mapClose').onclick=closeMapChooser;
 $('mapDialog').addEventListener('close',()=>{mapOpen=false;clearInput();const resume=mapWasPlaying;mapWasPlaying=false;if(resume&&state==='paused')start()});
 for(const button of document.querySelectorAll('[data-map]'))button.onclick=()=>selectMap(button.dataset.map);
 $('minimapToggle').onclick=()=>{minimapVisible=!minimapVisible;$('minimap').hidden=!minimapVisible;$('minimapToggle').textContent=minimapVisible?'−':'+';$('minimapToggle').setAttribute('aria-expanded',String(minimapVisible));if(state==='playing')canvas.focus()};
}
