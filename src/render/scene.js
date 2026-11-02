function ground(){if(mapId==='city'){cityGround();return}rect(0,0,W,H,'#484e39'); // Sand, concrete and old service roads.
 rect(24,24,720,432,'#555a42');rect(274,24,207,432,'#474c3a');rect(24,221,720,82,'#474c3a');
 for(let x=34;x<W-30;x+=45){rect(x,258,21,3,'#6d7050')}for(let y=40;y<H-25;y+=41){rect(377,y,3,17,'#6b6e4e')}
 // Deterministic ground texture, without moving noise.
 for(let i=0;i<1100;i++){const x=(i*127+17)%720+24,y=(i*73+29)%432+24;rect(x,y,i%3+1,1,i%3?'#62664a':'#3d4634')}
 rect(92,81,173,137,'#65674b');rect(492,74,180,138,'#62654b');rect(93,303,174,103,'#62654b');rect(493,311,180,104,'#60644a');
 // Worn parking lines and wall shadows.
 for(let i=0;i<4;i++){rect(307+i*34,337,2,53,'#777954');rect(307+i*34,337,23,2,'#777954')}rect(307,388,125,2,'#777954');
 ctx.font='bold 13px monospace';ctx.fillStyle='#858263';ctx.save();ctx.translate(417,441);ctx.rotate(Math.PI);ctx.fillText('SLOW',0,0);ctx.restore();
 for(let i=0;i<48;i++){const x=i*16;rect(x,0,14,16,'#252e25');rect(x,464,14,16,'#252e25');rect(x+2,2,11,3,'#626a4d');rect(x+2,466,11,3,'#626a4d')}for(let i=1;i<29;i++){rect(0,i*16,16,14,'#252e25');rect(752,i*16,16,14,'#252e25');rect(2,i*16+1,3,12,'#626a4d');rect(754,i*16+1,3,12,'#626a4d')}
 // Small tufts, industrial markings and gutters.
 for(let i=0;i<60;i++){const x=32+(i*137)%702,y=27+(i*197)%426;if(x<80||x>690||y<65||y>423){rect(x,y,3,5,'#75824c');rect(x-3,y+3,3,2,'#687747')}}
 for(const [x,y] of [[62,102],[704,387],[58,394],[706,75]]){rect(x,y,15,22,'#303b2f');for(let j=0;j<4;j++)rect(x+3,y+3+j*5,9,2,'#171f1b')}
}
function drawObject(o){if(PROP_KINDS[o.type]){drawProp(o);return}if(o.type==='streetLamp'){drawStreetLamp(o);return}if(o.type==='trafficLight'){drawTrafficLight(o);return}if(o.type==='building'){drawBuilding(o);return}if(o.type==='tree'){drawTree(o);return}const {x,y,w,h,type,tone}=o;rect(x+3,y+4,w,h,'#222b2470');if(type==='brick'){rect(x,y,w-1,h-1,palette.brick[tone]);rect(x+1,y+1,w-3,2,'#d29462');rect(x+1,y+h-3,w-3,2,'#7e4c36');rect(x+w-3,y+2,2,h-5,'#8c4d36')}
 else if(type==='crate'){rect(x,y,w,h,'#76552f');rect(x+2,y+2,w-4,h-4,palette.crate[tone]);rect(x+3,y+4,w-6,2,'#d4ac69');rect(x+3,y+h-6,w-6,2,'#8b6637');for(let i=3;i<w-3;i+=3)rect(x+i,y+i,3,3,'#d0a05a');rect(x+1,y+1,3,3,'#e0b276');rect(x+w-4,y+h-4,2,2,'#e0b276')}
 else if(type==='barrel'){rect(x+2,y,w-4,h,'#a74832');rect(x,y+3,w,h-6,'#c15b3c');rect(x+2,y+3,3,h-6,'#e48550');rect(x,y+4,w,2,'#583f33');rect(x,y+h-6,w,2,'#583f33');rect(x+4,y+7,5,3,'#e8bf60');rect(x+4,y+1,4,2,'#e69b61')}
 else{rect(x,y,w,h,'#8d8960');rect(x+1,y+1,w-2,2,'#c2b785');rect(x+3,y+2,2,7,'#696c4d')}
}
function draw(t){ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));if(shake>0)ctx.translate(Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake));ground();
 for(const s of scars){rect(s.x-s.size/2,s.y-s.size/2,s.size,s.size,'#30382b');rect(s.x-s.size*.35,s.y-s.size*.65,s.size*.7,s.size*1.3,'#343b2d')}
 for(const s of skids){ctx.globalAlpha=Math.min(.5,s.t/12);rect(s.x,s.y,3,3,'#20291f')}ctx.globalAlpha=1;
 const shown=visibleObjects();
 for(const o of shown)if(!o.alive){if(PROP_KINDS[o.type]){drawPropWreck(o);continue}if(o.type==='streetLamp'){drawBrokenStreetLamp(o);continue}if(o.type==='trafficLight'){drawBrokenTrafficLight(o);continue}rect(o.x+3,o.y+4,6,3,o.type==='barrel'?'#2b3229':'#766749');rect(o.x+o.w-4,o.y+8,3,3,'#3a3e2e')}
 for(const o of shown)if(o.alive){drawObject(o);if(o.hp<1.1){rect(o.x+3,o.y+2,2,4,'#503d2d');rect(o.x+5,o.y+5,3,2,'#503d2d')}}
 for(const p of pickups)if(p.alive&&visible(p.x,p.y,20,20)){ctx.globalAlpha=immortal()?.45:1;rect(p.x-10,p.y-8,20,18,'#263d28');rect(p.x-8,p.y-9,16,16,'#8eaf59');rect(p.x-6,p.y-7,12,12,'#bcd77f');rect(p.x-2,p.y-5,4,9,'#355337');rect(p.x-5,p.y-2,10,3,'#355337');if(Math.floor(t/650)%2)rect(p.x-5,p.y-13,10,2,'#e3ecbc')}ctx.globalAlpha=1;
 for(const d of debris)if(d.z<5)drawDebris(d);drawCar();for(const d of debris)if(d.z>=5)drawDebris(d);
 for(const r of rings){const radius=8+r.t*145;ctx.globalAlpha=(1-r.t/.6)*.85;for(let i=0;i<24;i++){const a=i*Math.PI/12;rect(r.x+Math.cos(a)*radius-3,r.y+Math.sin(a)*radius-3,6,6,r.t<.18?'#ffe5a0':'#e78a45')}if(r.t<.12){ctx.globalAlpha=(1-r.t/.12)*.6;rect(r.x-20,r.y-20,40,40,'#fff6cf')}}
 for(const p of particles){ctx.globalAlpha=clamp(p.life*(p.smoke?.45:2),0,1);rect(p.x-p.size/2,p.y-p.size/2,Math.ceil(p.size),Math.ceil(p.size),p.color)}ctx.globalAlpha=1;drawWorldLighting(shown);ctx.font='bold 11px monospace';ctx.textAlign='center';for(const p of popups){ctx.globalAlpha=Math.min(1,p.t*2);ctx.fillStyle='#f4e8b6';ctx.fillText(p.text,p.x,p.y)}ctx.globalAlpha=1;ctx.textAlign='left';ctx.restore();
}
function drawDebris(d){ctx.globalAlpha=Math.min(1,d.life/2);rect(d.x-d.w/2+2,d.y-d.h/2+2,d.w,d.h,'#242d2470');ctx.save();ctx.translate(Math.round(d.x),Math.round(d.y-d.z));ctx.rotate(d.a);rect(-d.w/2,-d.h/2,d.w,d.h,d.color);rect(-d.w/2,-d.h/2,d.w,1,'#e4bc7b');ctx.restore();ctx.globalAlpha=1}
