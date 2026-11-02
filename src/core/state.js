const palette = {brick:['#ac6144','#bf7450','#98593e'],crate:['#b78a4c','#c39c60','#a7783d'],barrel:['#b84f38'],fence:['#9f9a70'],streetLamp:['#63745d','#7f8b70','#96a087'],trafficLight:['#89917a','#63745d','#3d5146'],tree:['#557b45','#719455','#446b42']};
let objects=[], particles=[], debris=[], rings=[], scars=[], skids=[], pickups=[], popups=[], collapseQueue=[], groups=[], grid=new Map();
let car, state='ready', mode='free', invulnerable=true, remaining=90, elapsed=0, score=0, dead=0, total=0, shake=0;
let combo=0, comboTime=0, toastTime=0, last=0, muted=true, audio=null, best=0, seed=301, cleared=false, driftSmoke=0;
const soundtrack=window.CrashMusic?new window.CrashMusic({onError:()=>{syncMusicButton();message('МУЗЫКА НЕДОСТУПНА В ЭТОМ БРАУЗЕРЕ')}}):null;
