/**
 * Synthesised WebAudio cues. No audio files. Off unless the operator enables
 * sound in settings. The AudioContext is created lazily on the first cue played
 * after a user gesture.
 */
import type { SoundCue } from '@core/contracts';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function click(c: AudioContext, start: number, gain: number, ms: number): void {
  const len = Math.floor((c.sampleRate * ms) / 1000);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1800;
  f.Q.value = 0.9;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(start);
}

export function playCue(cue: SoundCue): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (cue) {
    case 'window':
      tone(c, 660, t, 0.05, 'triangle', 0.08);
      tone(c, 990, t + 0.035, 0.05, 'triangle', 0.05);
      break;
    case 'error':
      for (const f of [311, 370, 466]) tone(c, f, t, 0.28, 'square', 0.035);
      break;
    case 'mail':
      tone(c, 784, t, 0.12, 'sine', 0.09);
      tone(c, 1046, t + 0.13, 0.18, 'sine', 0.08);
      break;
    case 'relay':
      click(c, t, 0.6, 18);
      click(c, t + 0.045, 0.35, 12);
      break;
  }
}
