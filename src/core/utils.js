function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
