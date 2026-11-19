/**
 * Synthesised WebAudio cues. No audio files, no speech. Off unless the operator
 * enables sound in settings (services.sound.play checks the setting; stop always
 * works). The AudioContext is created lazily on the first cue played after a
 * user gesture.
 *
 * Pass-one cues: window, error, mail, relay. Pass-two panel and plant cues are
 * plain equipment sounds at modest level: switch and button clicks, a guard
 * cover, an annunciator horn that repeats until stopped, motor runs for doors and
 * hoists, a PA chime and alert tones, DTMF digits, a busy tone, a line-printer
 * burst and a DVR relay tick.
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

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number, out: AudioNode = c.destination): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** A tone with a flat sustain and short release (alert tones, busy, DTMF). */
function held(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number, out: AudioNode = c.destination, lowpass = 0): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.008);
  g.gain.setValueAtTime(gain, start + Math.max(0.01, dur - 0.02));
  g.gain.linearRampToValueAtTime(0, start + dur);
  if (lowpass) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    o.connect(f).connect(g).connect(out);
  } else o.connect(g).connect(out);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noiseBuffer(c: AudioContext, ms: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor((c.sampleRate * ms) / 1000));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  return buf;
}

function click(c: AudioContext, start: number, gain: number, ms: number, freq = 1800, q = 0.9, type: BiquadFilterType = 'bandpass', out: AudioNode = c.destination): void {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, ms, 6);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  src.start(start);
}

/** Electric motor run: filtered sawtooth with spin-up and run-down, plus a faint gear whine. */
function motor(c: AudioContext, start: number, dur: number, f0: number, f1: number, gain: number, whine: number): void {
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0 * 0.6, start);
  o.frequency.linearRampToValueAtTime(f0, start + 0.35);
  o.frequency.linearRampToValueAtTime(f1, start + dur - 0.3);
  o.frequency.linearRampToValueAtTime(f1 * 0.5, start + dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.3);
  g.gain.setValueAtTime(gain, start + dur - 0.35);
  g.gain.linearRampToValueAtTime(0, start + dur);
  o.connect(lp).connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
  if (whine > 0) {
    const w = c.createOscillator();
    w.type = 'sine';
    w.frequency.setValueAtTime(f0 * 9, start);
    w.frequency.linearRampToValueAtTime(f1 * 9, start + dur - 0.3);
    const wg = c.createGain();
    wg.gain.setValueAtTime(0, start);
    wg.gain.linearRampToValueAtTime(whine, start + 0.4);
    wg.gain.setValueAtTime(whine, start + dur - 0.4);
    wg.gain.linearRampToValueAtTime(0, start + dur);
    w.connect(wg).connect(c.destination);
    w.start(start);
    w.stop(start + dur + 0.05);
  }
}

/** Heavy seat: low thump (filtered noise + decaying low sine). */
function thunk(c: AudioContext, start: number, gain: number): void {
  click(c, start, gain, 90, 180, 0.7, 'lowpass');
  tone(c, 62, start, 0.32, 'sine', gain * 0.35);
}

/** Bell-like chime note (fundamental and two partials). */
function bell(c: AudioContext, freq: number, start: number, gain: number): void {
  tone(c, freq, start, 1.2, 'sine', gain);
  tone(c, freq * 2.01, start, 0.6, 'sine', gain * 0.25);
  tone(c, freq * 3.02, start, 0.3, 'sine', gain * 0.1);
}

const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '0': [941, 1336],
};

/* ----------------------------------------------------------------- alarm */

let alarm: { bus: GainNode; timer: ReturnType<typeof setInterval> } | null = null;

/** Annunciator horn: a filtered two-tone buzz, 0.45 s on, repeating every 1.2 s. */
function alarmPulse(c: AudioContext, bus: GainNode): void {
  const t = c.currentTime + 0.01;
  held(c, 440, t, 0.45, 'square', 0.03, bus, 1400);
  held(c, 554, t, 0.45, 'square', 0.018, bus, 1400);
}

function startAlarm(c: AudioContext): void {
  if (alarm) return;
  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(c.destination);
  alarmPulse(c, bus);
  alarm = { bus, timer: setInterval(() => alarmPulse(c, bus), 1200) };
}

/** Stop a looping cue. Only `alarm` loops; anything else is a no-op. */
export function stopCue(cue: SoundCue): void {
  if (cue !== 'alarm' || !alarm) return;
  const { bus, timer } = alarm;
  alarm = null;
  clearInterval(timer);
  try {
    const t = bus.context.currentTime;
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0, t + 0.04);
    setTimeout(() => bus.disconnect(), 120);
  } catch {
    /* context closed */
  }
}

/** True while the annunciator horn loops. */
export function alarmPlaying(): boolean {
  return alarm !== null;
}

/* ------------------------------------------------------------------ play */

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
    case 'switch':
      // Toggle: lever snap and detent.
      click(c, t, 0.45, 6, 3200, 1.2);
      click(c, t + 0.012, 0.25, 10, 1400, 1);
      break;
    case 'guard':
      // Hinged plastic cover lifted or closed onto its stop.
      click(c, t, 0.35, 28, 900, 0.8);
      click(c, t + 0.06, 0.2, 14, 2200, 1);
      break;
    case 'button':
      // Momentary pushbutton: press and release.
      click(c, t, 0.4, 8, 2600, 1.4);
      click(c, t + 0.09, 0.22, 6, 3000, 1.4);
      break;
    case 'alarm':
      startAlarm(c);
      break;
    case 'ack':
      stopCue('alarm');
      click(c, t, 0.3, 8, 2600, 1.4);
      tone(c, 880, t + 0.02, 0.14, 'sine', 0.06);
      break;
    case 'door':
      motor(c, t, 1.8, 58, 66, 0.07, 0.006);
      thunk(c, t + 1.85, 0.7);
      break;
    case 'hoist':
      click(c, t, 0.4, 20, 600, 0.8); // brake release
      motor(c, t + 0.15, 2.6, 85, 112, 0.06, 0.008);
      click(c, t + 2.85, 0.35, 20, 600, 0.8); // brake set
      break;
    case 'chime':
      bell(c, 784, t, 0.07);
      bell(c, 659, t + 0.42, 0.07);
      bell(c, 523, t + 0.84, 0.07);
      break;
    case 'tone':
      // Alert tone: alternating 800 / 1000 Hz, six steps.
      for (let i = 0; i < 6; i++) held(c, i % 2 ? 1000 : 800, t + i * 0.25, 0.24, 'triangle', 0.05, c.destination, 3000);
      break;
    case 'dtmf': {
      const digits = '4127';
      [...digits].forEach((d, i) => {
        const pair = DTMF[d];
        if (!pair) return;
        held(c, pair[0], t + i * 0.14, 0.08, 'sine', 0.04);
        held(c, pair[1], t + i * 0.14, 0.08, 'sine', 0.04);
      });
      break;
    }
    case 'busy':
      // Circuit busy: 480 + 620 Hz, half-second cadence, three times.
      for (let i = 0; i < 3; i++) {
        held(c, 480, t + i, 0.5, 'sine', 0.035);
        held(c, 620, t + i, 0.5, 'sine', 0.035);
      }
      break;
    case 'print':
      // Line printer: a fast train of hammer strikes over a carriage hum.
      for (let i = 0; i < 28; i++) click(c, t + i * 0.028 + Math.random() * 0.004, 0.18, 5, 3400, 1.6);
      held(c, 120, t, 0.85, 'sawtooth', 0.012, c.destination, 400);
      break;
    case 'shutter':
      // DVR camera switch: small relay tick.
      click(c, t, 0.3, 5, 4200, 1.8);
      click(c, t + 0.022, 0.12, 4, 2400, 1.2);
      break;
  }
}
