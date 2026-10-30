// Preserve the normal layout; fit one complete display into the fullscreen cabinet.
function fitFullscreenDisplay(){
 const game=$('game'),display=$('gameDisplay');
 if(document.fullscreenElement!==game)return;
 const margin=game.clientWidth<600?12:32;
 const width=display.offsetWidth,height=display.offsetHeight;
 if(!width||!height)return;
 const scale=Math.max(.05,Math.min((game.clientWidth-margin*2)/width,(game.clientHeight-margin*2)/height));
 display.style.transform='translate(-50%,-50%) scale('+scale+')';
}
function syncFullscreenDisplay(){
 if(document.fullscreenElement===$('game'))fitFullscreenDisplay();
 else{const display=$('gameDisplay');display.style.width='';display.style.transform=''}
}
window.addEventListener('resize',fitFullscreenDisplay);
document.addEventListener('fullscreenchange',syncFullscreenDisplay);
$('full').onclick=async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else{
   const display=$('gameDisplay');
   display.style.width=display.getBoundingClientRect().width+'px';
   await $('game').requestFullscreen();
   fitFullscreenDisplay();
  }
 }catch{syncFullscreenDisplay();message('ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН В ЭТОМ ОКНЕ')}
};
