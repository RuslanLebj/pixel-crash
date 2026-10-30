'use strict';
// Original, browser-generated soundtrack. No audio downloads or third-party recordings.
(() => {
  class CrashMusic {
    constructor({onError = () => {}} = {}) {
      this.enabled = true;
      try { this.enabled = localStorage.getItem('crash-music') !== 'off'; } catch {}
      this.playing = false;
      this.context = null;
      this.timer = null;
      this.step = 0;
      this.nextTime = 0;
      this.bpm = 92;
      this.onError = onError;
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      try { localStorage.setItem('crash-music', enabled ? 'on' : 'off'); } catch {}
      if (enabled && this.playing) this._activate();
      else this._halt();
    }

    setPlaying(playing) {
      this.playing = playing;
      if (playing && this.enabled) this._activate();
      else this._halt();
    }

    _ensureContext() {
      if (this.context) return;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is unavailable');
      const ctx = new Audio();
      this.context = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 20;
      compressor.ratio.value = 4;
      compressor.attack.value = .008;
      compressor.release.value = .25;
      this.master.connect(compressor).connect(ctx.destination);

      // A short, dark echo gives the melody space without drowning out the car.
      this.delay = ctx.createDelay(1);
      this.delay.delayTime.value = 60 / this.bpm * .75;
      const feedback = ctx.createGain(), echoTone = ctx.createBiquadFilter();
      feedback.gain.value = .24;
      echoTone.type = 'lowpass';
      echoTone.frequency.value = 2400;
      const wet = ctx.createGain();
      wet.gain.value = .22;
      this.delay.connect(echoTone);
      echoTone.connect(feedback).connect(this.delay);
      echoTone.connect(wet).connect(this.master);

      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const samples = this.noise.getChannelData(0);
      let seed = 731;
      for (let i = 0; i < samples.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        samples[i] = seed / 2147483648 - 1;
      }
    }

    _activate() {
      try {
        this._ensureContext();
        const begin = () => {
          if (!this.enabled || !this.playing || this.timer !== null) return;
          const ctx = this.context;
          this.master.gain.cancelScheduledValues(ctx.currentTime);
          this.master.gain.setTargetAtTime(.38, ctx.currentTime, .18);
          this.nextTime = ctx.currentTime + .06;
          this._schedule();
          this.timer = setInterval(() => this._schedule(), 40);
        };
        if (this.context.state === 'suspended') this.context.resume().then(begin).catch(() => this._fail());
        else begin();
      } catch { this._fail(); }
    }

    _fail() {
      this._halt();
      this.enabled = false;
      this.onError();
    }

    _halt() {
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      if (!this.master) return;
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, .055);
    }

    _schedule() {
      if (!this.enabled || !this.playing || this.context.state !== 'running') return;
      // Recover after a delayed background timer without replaying a backlog.
      if (this.nextTime < this.context.currentTime - .1) this.nextTime = this.context.currentTime + .03;
      const beat = 60 / this.bpm;
      while (this.nextTime < this.context.currentTime + .18) {
        this._step(this.step, this.nextTime, beat);
        this.nextTime += beat / 4;
        this.step = (this.step + 1) % 128;
      }
    }

    _step(step, time, beat) {
      const position = step % 16, bar = Math.floor(step / 16), chord = bar % 4;
      const chords = [[57,60,64,71], [53,57,60,67], [48,55,59,64], [55,59,62,69]];
      const roots = [33,29,36,31];
      const melody = [[76,71,72,69], [72,69,67,64], [71,67,64,67], [74,71,69,67]];
      const swing = position % 2 ? .014 : 0;
      if (position === 0) this._pad(chords[chord], time, beat * 4);
      if ([0,3,6,8,10,14].includes(position)) {
        const octave = position === 14 ? 12 : 0;
        this._tone(roots[chord] + octave, time + swing, beat * .55, .2, 'triangle', 480);
      }
      if (position === 0 || position === 8 || bar % 2 && position === 14) this._kick(time + swing);
      if (position === 4 || position === 12) {
        this._noise(time, .15, .095, 1400);
        this._tone(50, time, .1, .055, 'triangle', 1600);
      }
      if (position % 2 === 0 || bar >= 4 && position === 15) {
        this._noise(time + swing, position === 14 ? .12 : .045, position % 4 === 0 ? .024 : .035, 7200);
      }
      if ([2,6,10,14].includes(position)) {
        const note = melody[chord][Math.floor(position / 4)];
        this._tone(note, time + swing, beat * .65, bar < 4 ? .055 : .065, 'sine', 3200, true);
      }
    }

    _frequency(note) { return 440 * 2 ** ((note - 69) / 12); }

    _tone(note, time, duration, volume, type, cutoff, echo = false) {
      const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      osc.type = type;
      osc.frequency.value = this._frequency(note);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(Math.max(100, cutoff * .4), time + duration);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      osc.connect(filter).connect(gain).connect(this.master);
      if (echo) gain.connect(this.delay);
      osc.start(time);
      osc.stop(time + duration + .02);
      osc.onended = () => {osc.disconnect(); filter.disconnect(); gain.disconnect()};
    }

    _pad(notes, time, duration) {
      const ctx = this.context;
      for (const note of notes) {
        const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, time);
        filter.frequency.linearRampToValueAtTime(1250, time + duration * .5);
        filter.frequency.linearRampToValueAtTime(650, time + duration);
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.linearRampToValueAtTime(.022, time + .55);
        gain.gain.setValueAtTime(.022, time + duration * .75);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration + .85);
        filter.connect(gain).connect(this.master);
        const oscillators = [-7,7].map((detune, i) => {
          const osc = ctx.createOscillator();
          osc.type = i ? 'triangle' : 'sawtooth';
          osc.frequency.value = this._frequency(note);
          osc.detune.value = detune;
          osc.connect(filter);
          osc.start(time);
          osc.stop(time + duration + .9);
          return osc;
        });
        oscillators[1].onended = () => {for (const osc of oscillators) osc.disconnect(); filter.disconnect(); gain.disconnect()};
      }
    }

    _kick(time) {
      const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.setValueAtTime(115, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + .13);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(.48, time + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .29);
      osc.connect(gain).connect(this.master);
      osc.start(time);
      osc.stop(time + .32);
      osc.onended = () => {osc.disconnect(); gain.disconnect()};
    }

    _noise(time, duration, volume, cutoff) {
      const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      source.buffer = this.noise;
      filter.type = 'highpass';
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      source.connect(filter).connect(gain).connect(this.master);
      source.start(time);
      source.stop(time + duration + .01);
      source.onended = () => {source.disconnect(); filter.disconnect(); gain.disconnect()};
    }
  }

  window.CrashMusic = CrashMusic;
})();
