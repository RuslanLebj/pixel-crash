const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const documentEvents = {}, windowEvents = {}, elements = new Map();
function element(id, tagName = 'DIV') {
  if (elements.has(id)) {
    if (arguments.length > 1) elements.get(id).tagName = tagName;
    return elements.get(id);
  }
  const classes = new Set(), listeners = {};
  const node = {
    tagName, textContent: '', innerHTML: '', checked: true, style: {}, dataset: {}, listeners, attributes: {},
    parentElement: {classList: {toggle() {}}},
    classList: {add: x => classes.add(x), remove: x => classes.delete(x), toggle(x, enabled) {enabled ? classes.add(x) : classes.delete(x)}},
    setAttribute(name,value) {this.attributes[name]=value}, focus() {}, setPointerCapture() {},
    addEventListener(type, handler) {(listeners[type] ||= []).push(handler)},
    getContext() {return new Proxy({}, {get: () => () => {}, set: () => true})}
  };
  elements.set(id, node);
  return node;
}
const modeButtons = ['free', 'arcade'].map(mode => Object.assign(element(mode, 'BUTTON'), {dataset: {mode}}));
const touchButtons = ['ArrowUp', 'Space', 'ArrowRight'].map(key => Object.assign(element(key, 'BUTTON'), {dataset: {key}}));
const sandbox = {
  console, Math, Number, String, Set, Map,
  localStorage: {getItem: () => null, setItem() {}}, requestAnimationFrame() {},
  document: {
    getElementById: element,
    querySelectorAll: selector => selector === '[data-mode]' ? modeButtons : selector === '[data-key]' ? touchButtons : [],
    addEventListener: (type, handler) => documentEvents[type] = handler
  },
  window: {addEventListener: (type, handler) => windowEvents[type] = handler}
};
const marker = 'loadBest();syncSettings();ready();requestAnimationFrame(frame);';
let source = fs.readFileSync(path.join(__dirname, '../dist/game.js'), 'utf8');
assert(source.includes(marker));
source = source.replace(marker, marker + 'globalThis.inputTest={keys,start,restart,reset,get:()=>({car,state}),updateDriving,fixture:()=>{objects=[];grid=new Map()}};');
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const game = sandbox.inputTest;
const canvas = element('canvas', 'CANVAS');
function keyboard(type, code, target = canvas, repeat = false) {
  const event = {code, target, repeat, prevented: false, preventDefault() {this.prevented = true}};
  documentEvents[type](event);
  return event;
}
function pointer(type, code, pointerId) {
  const button = touchButtons.find(b => b.dataset.key === code);
  for (const listener of button.listeners[type] || []) listener({pointerId, button: 0, preventDefault() {}});
}

game.start();
keyboard('keydown', 'KeyW');
const space = keyboard('keydown', 'Space', element('sound', 'BUTTON'));
assert(game.keys.has('KeyW') && game.keys.has('Space'), 'gas and handbrake must work when a toolbar button has focus');
assert(space.prevented, 'Space must not activate the focused toolbar button during driving');
keyboard('keyup', 'Space');
assert(game.keys.has('KeyW') && !game.keys.has('Space'));
keyboard('keyup', 'KeyW');
keyboard('keydown', 'Space');
keyboard('keydown', 'ArrowUp');
keyboard('keydown', 'Space', canvas, true);
assert(game.keys.has('Space') && game.keys.has('ArrowUp'), 'both press orders and key repeat must preserve the combination');
console.log('Keyboard combinations and toolbar focus: OK');

game.restart();
keyboard('keydown', 'ArrowUp');
pointer('pointerdown', 'ArrowUp', 1);
pointer('pointerup', 'ArrowUp', 1);
assert(game.keys.has('ArrowUp'), 'releasing a screen button must not cancel a held keyboard key');
pointer('pointerdown', 'Space', 2);
keyboard('keydown', 'Space');
keyboard('keyup', 'Space');
assert(game.keys.has('Space'), 'releasing keyboard handbrake must not cancel the screen handbrake');
pointer('pointerdown', 'Space', 3);
pointer('pointerup', 'Space', 2);
assert(game.keys.has('Space'), 'a second pointer on the same action must remain active');
pointer('pointercancel', 'Space', 3);
assert(!game.keys.has('Space') && game.keys.has('ArrowUp'));
pointer('pointerdown', 'Space', 4);
pointer('pointerdown', 'ArrowRight', 5);
assert(['ArrowUp','ArrowRight','Space'].every(key => game.keys.has(key)), 'gas, steering and handbrake must work together');
windowEvents.blur();
assert.equal(game.keys.size, 0, 'losing focus must clear every input source');
assert.equal(game.get().state, 'paused');
game.start();
keyboard('keydown', 'Space');
pointer('lostpointercapture', 'Space', 4);
assert(game.keys.has('Space'), 'a stale pointer release must not cancel newly pressed keyboard input');
console.log('Mixed keyboard/pointer input, multi-touch and focus loss: OK');

game.restart();
game.fixture();
keyboard('keydown', 'KeyW');
keyboard('keydown', 'ShiftLeft');
assert(game.keys.has('ShiftLeft'), 'Shift must be available as an alternate handbrake');
for (let i = 0; i < 30; i++) game.updateDriving(1 / 60);
assert(Math.hypot(game.get().car.vx, game.get().car.vy) > 60, 'handbrake must not block the throttle');
keyboard('keydown', 'ArrowRight');
for (let i = 0; i < 24; i++) game.updateDriving(1 / 60);
assert(Math.abs(game.get().car.slip) > 30, 'combined throttle, steering and handbrake must produce a drift');
console.log('Throttle and alternate handbrake drive physics together: OK');

game.restart();
const checkbox = element('invulnerability', 'INPUT');
const checkboxSpace = keyboard('keydown', 'Space', checkbox);
assert(!checkboxSpace.prevented && !game.keys.has('Space'), 'focused form controls must retain native keyboard behavior');
game.reset();
sandbox.document.hidden = true;
documentEvents.visibilitychange();
assert.equal(game.keys.size, 0);
console.log('Native form controls and hidden-tab cleanup: OK');

for (const [gas, right, left, brake] of [
  ['ArrowUp','ArrowRight','ArrowLeft','Space'],
  ['KeyW','KeyD','KeyA','Space'],
  ['ArrowUp','ArrowRight','ArrowLeft','ShiftLeft'],
  ['KeyW','KeyD','KeyA','ShiftLeft']
]) {
  for (const turnFrames of [6, 30, 60, 180]) {
    game.restart(); game.fixture();
    function drive(frames) {
      for (let i = 0; i < frames; i++) {
        game.get().car.x=384;game.get().car.y=240;
        game.updateDriving(1/60);
      }
    }
    keyboard('keydown',gas);keyboard('keydown',brake);drive(60);
    keyboard('keydown',right);drive(turnFrames);
    keyboard('keyup',right);keyboard('keydown',left);drive(45);
    assert(game.keys.has(gas)&&game.keys.has(brake)&&game.keys.has(left)&&!game.keys.has(right));
    assert(game.get().car.steer < -.95, 'steering must switch left while gas and handbrake stay held');
    assert(game.get().car.yaw < -.1, 'car must start rotating left without releasing throttle');
    console.log(gas,brake,'right-to-left after',turnFrames,'frames: steer',game.get().car.steer.toFixed(2),'yaw',game.get().car.yaw.toFixed(2));
  }
}

for (const [gas, right, left, brake] of [
  ['ArrowDown','ArrowRight','ArrowLeft','Space'],
  ['KeyS','KeyD','KeyA','Space'],
  ['ArrowDown','ArrowRight','ArrowLeft','ShiftLeft'],
  ['KeyS','KeyD','KeyA','ShiftLeft']
]) {
  game.restart(); game.fixture();
  function drive(frames) {
    for (let i = 0; i < frames; i++) {
      game.get().car.x=384;game.get().car.y=240;
      game.updateDriving(1/60);
    }
  }
  keyboard('keydown',gas);keyboard('keydown',brake);drive(60);
  keyboard('keydown',right);drive(60);
  assert(game.get().car.yaw < -.1, 'right steering must rotate the body the opposite way while reversing');
  keyboard('keyup',right);keyboard('keydown',left);drive(45);
  assert(game.keys.has(gas)&&game.keys.has(brake)&&game.keys.has(left)&&!game.keys.has(right));
  assert(game.get().car.steer < -.95);
  assert(game.get().car.yaw > .1, 'reverse countersteering must work while the reverse throttle stays held');
}
console.log('Reverse drift and countersteering with Space and Shift: OK');

game.restart();
keyboard('keydown','KeyW');keyboard('keydown','Space');keyboard('keydown','KeyD');
assert.equal(element('input-up').attributes['data-pressed'],'true');
assert.equal(element('input-right').attributes['data-pressed'],'true');
assert.equal(element('input-handbrake').attributes['data-pressed'],'true');
keyboard('keyup','KeyD');keyboard('keydown','KeyA');
assert.equal(element('input-right').attributes['data-pressed'],'false');
assert.equal(element('input-left').attributes['data-pressed'],'true');
assert.equal(element('input-up').attributes['data-pressed'],'true');
console.log('On-screen diagnostics mirror the controls consumed by the physics: OK');
