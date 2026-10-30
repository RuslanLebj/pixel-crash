const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const speedCtx=$('speedDial').getContext('2d');
let dialSpeed=0;
const W = 768, H = 480, keys = new Set();
const keyboardKeys = new Set(), pointerKeys = new Map();
const drivingKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight']);
