const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const contexts = [], timers = new Map(), preferences = new Map();
let timerId = 0;
class Param {
  constructor() {this.value = 0; this.targets = []}
  validate(value, time) {assert(Number.isFinite(value)); assert(Number.isFinite(time) && time >= 0)}
  setValueAtTime(value, time) {this.validate(value,time); this.value=value}
  linearRampToValueAtTime(value,time) {this.validate(value,time); this.value=value}
  exponentialRampToValueAtTime(value,time) {this.validate(value,time); assert(value>0); this.value=value}
  setTargetAtTime(value,time,constant) {this.validate(value,time); assert(constant>0); this.targets.push(value)}
  cancelScheduledValues() {}
}
class Node {
  constructor() {for(const name of ['gain','frequency','detune','delayTime','threshold','knee','ratio','attack','release'])this[name]=new Param()}
  connect(destination) {return destination}
  disconnect() {}
  start(time) {assert(Number.isFinite(time) && time>=0); this.started=time}
  stop(time) {assert(time>this.started); this.stopped=time}
}
class Audio {
  constructor() {this.currentTime=0;this.state='running';this.sampleRate=8000;this.destination=new Node();this.sources=[];contexts.push(this)}
  createGain(){return new Node()}
  createDynamicsCompressor(){return new Node()}
  createDelay(){return new Node()}
  createBiquadFilter(){return new Node()}
  createOscillator(){const node=new Node();this.sources.push(node);return node}
  createBufferSource(){const node=new Node();this.sources.push(node);return node}
  createBuffer(channels,length){const samples=new Float32Array(length);return {getChannelData:()=>samples}}
  resume(){this.state='running';return Promise.resolve()}
}
const sandbox={window:{AudioContext:Audio},localStorage:{getItem:key=>preferences.get(key),setItem:(key,value)=>preferences.set(key,value)},setInterval(fn){const id=++timerId;timers.set(id,fn);return id},clearInterval:id=>timers.delete(id)};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/music.js'),'utf8'),sandbox);
const Engine=sandbox.window.CrashMusic;
const music=new Engine();
assert.equal(contexts.length,0,'loading the page must not start audio');
music.setPlaying(false);assert.equal(contexts.length,0);
music.setPlaying(true);assert.equal(contexts.length,1);assert.equal(timers.size,1);
const ctx=contexts[0];assert(ctx.sources.length>0,'starting a run must schedule the composition');
music.setPlaying(true);assert.equal(timers.size,1,'repeated start must not duplicate the soundtrack');
for(let step=0;step<128;step++)music._step(step,1+step*60/92/4,60/92);
assert(ctx.sources.length>150,'the arrangement should include chords, bass, melody and percussion');
assert(ctx.sources.every(node=>node.stopped>node.started),'every voice must have a finite end');
for(const node of ctx.sources)node.onended?.();
music.setPlaying(false);assert.equal(timers.size,0,'pausing must stop scheduling');
assert.equal(music.master.gain.targets.at(-1),0,'pausing must fade out music');
music.setPlaying(true);music.setEnabled(false);assert.equal(timers.size,0);assert.equal(preferences.get('crash-music'),'off');
const muted=new Engine();assert.equal(muted.enabled,false,'music preference must survive reload');
music.setEnabled(true);assert.equal(timers.size,1);assert.equal(preferences.get('crash-music'),'on');
ctx.currentTime=200;music._schedule();assert(music.nextTime>=200,'a delayed timer must not replay stale music');
music.setPlaying(false);
console.log('Arrangement, audio scheduling, pause, mute and preference persistence: OK');

let errors=0;sandbox.window.AudioContext=undefined;
const unsupported=new Engine({onError:()=>errors++});unsupported.setPlaying(true);
assert.equal(errors,1);assert.equal(unsupported.enabled,false);assert.equal(timers.size,0);
console.log('Unsupported audio fails without affecting the game: OK');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(html.includes('window.CrashMusic = CrashMusic'));
assert(html.indexOf('window.CrashMusic = CrashMusic')<html.indexOf('const soundtrack='),'standalone build must load music before the game');
assert(!html.includes('<script src='),'standalone game must embed all scripts');
console.log('Standalone HTML includes music in the correct order: OK');
