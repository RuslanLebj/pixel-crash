// Two worlds share the driving model; the canvas is a viewport, not the world boundary.
const MAPS=[
 {id:'yard',name:'Старый промдвор',subtitle:'Компактная арена · разнести всё',w:768,h:480,spawn:[384,387],seed:301},
 {id:'city',name:'Новоград',subtitle:'Большой город · свободный маршрут',w:4096,h:3072,spawn:[704,2620],seed:8041}
];
const CITY_X=Array.from({length:8},(_,i)=>192+i*512),CITY_Y=Array.from({length:6},(_,i)=>192+i*512);
let mapId='yard',worldW=W,worldH=H,mapOpen=false,mapWasPlaying=false;
let camera={x:0,y:0},cityLots=[],lastDistrict='',minimapVisible=true;
try{const saved=localStorage.getItem('crash-map');if(MAPS.some(m=>m.id===saved))mapId=saved}catch{}
