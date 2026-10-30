const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const start=source.indexOf('// Preserve the normal layout;');
assert(start>=0);
const end=source.indexOf('setupGarage();',start);
const events={},windowEvents={},messages=[];
const display={style:{},offsetWidth:1035,offsetHeight:1100,getBoundingClientRect(){return{width:1035}}};
const button={};
const document={fullscreenElement:null,addEventListener:(name,callback)=>events[name]=callback};
const game={clientWidth:1920,clientHeight:1080,async requestFullscreen(){document.fullscreenElement=game;events.fullscreenchange()}};
document.exitFullscreen=async()=>{document.fullscreenElement=null;events.fullscreenchange()};
const nodes={game,gameDisplay:display,full:button};
const sandbox={Math,document,window:{addEventListener:(name,callback)=>windowEvents[name]=callback},$:name=>nodes[name],message:text=>messages.push(text)};
vm.runInNewContext(source.slice(start,end),sandbox);
function scale(){return Number(display.style.transform.match(/scale\(([^)]+)\)/)[1])}
function fits(){assert(display.offsetWidth*scale()<=game.clientWidth);assert(display.offsetHeight*scale()<=game.clientHeight)}
(async()=>{
 await button.onclick();
 assert.equal(display.style.width,'1035px','capture the normal content width before entering fullscreen');
 fits();
 const normalField=1035*5/8,normalPanel=370;
 assert(Math.abs((normalField*scale())/(normalPanel*scale())-normalField/normalPanel)<1e-10,'field and dashboard retain their relative sizes');
 game.clientWidth=844;game.clientHeight=390;windowEvents.resize();fits();
 assert.equal(display.style.width,'1035px','resizing must scale the original layout instead of reflowing it');
 document.fullscreenElement=null;events.fullscreenchange();
 assert.equal(display.style.width,'');assert.equal(display.style.transform,'','native Escape restores the normal layout');
 game.clientWidth=1920;game.clientHeight=1080;await button.onclick();await button.onclick();
 assert.equal(document.fullscreenElement,null);assert.equal(display.style.width,'');
 game.requestFullscreen=async()=>{throw new Error('fullscreen denied')};await button.onclick();
 assert.equal(display.style.width,'');assert.equal(display.style.transform,'');assert.equal(messages.length,1,'a refused fullscreen request must leave the normal layout intact');
 console.log('Fullscreen fit, shared scale, resize, Escape, toggle and refusal recovery: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
