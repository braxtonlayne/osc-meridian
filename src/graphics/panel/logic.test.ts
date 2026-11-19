import { describe, expect, it } from 'vitest';
import {
  ANN_NORMAL,
  annunciatorRun,
  annunciatorStep,
  guardStep,
  holdProgress,
  limitWord,
  limitZones,
  rotaryAngles,
  rotaryKey,
  scaleTicks,
  segmentCells,
  stepPosition,
  type AnnSeq,
  type GuardState,
} from './logic';

describe('annunciator ring-back sequence', () => {
  it('alarm flashes until acknowledged, then steady', () => {
    expect(annunciatorStep(ANN_NORMAL, 'abnormal')).toEqual({ seq: 'unack', abnormal: true });
    expect(annunciatorRun(['abnormal', 'ack'])).toEqual({ seq: 'ack', abnormal: true });
  });
  it('acknowledged alarm that clears goes to ringback, RESET returns to normal', () => {
    expect(annunciatorRun(['abnormal', 'ack', 'normal']).seq).toBe('ringback');
    expect(annunciatorRun(['abnormal', 'ack', 'normal', 'reset'])).toEqual(ANN_NORMAL);
  });
  it('alarm locks in when it clears before acknowledgement; ACK then needs RESET', () => {
    const p = annunciatorRun(['abnormal', 'normal']);
    expect(p).toEqual({ seq: 'unack', abnormal: false });
    expect(annunciatorStep(p, 'ack').seq).toBe('ringback');
  });
  it('RESET does nothing unless in ringback', () => {
    for (const seq of ['normal', 'unack', 'ack'] as AnnSeq[]) {
      const p = { seq, abnormal: seq !== 'normal' };
      expect(annunciatorStep(p, 'reset')).toBe(p);
    }
  });
  it('a new alarm during ringback flashes again', () => {
    expect(annunciatorRun(['abnormal', 'ack', 'normal', 'abnormal']).seq).toBe('unack');
  });
  it('ACK on a normal or steady window is ignored', () => {
    expect(annunciatorStep(ANN_NORMAL, 'ack')).toBe(ANN_NORMAL);
    const ack = { seq: 'ack' as const, abnormal: true };
    expect(annunciatorStep(ack, 'ack')).toBe(ack);
  });
  it('repeated abnormal inputs do not re-flash an acknowledged alarm', () => {
    expect(annunciatorRun(['abnormal', 'ack', 'abnormal', 'abnormal']).seq).toBe('ack');
  });
});

describe('guarded switch sequence', () => {
  const run = (events: Parameters<typeof guardStep>[1][], s: GuardState = 'closed') => events.reduce(guardStep, s);
  it('needs the cover lifted before the actuator does anything', () => {
    expect(run(['press'])).toBe('closed');
    expect(run(['press', 'complete'])).toBe('closed');
  });
  it('lift, press, complete actuates', () => {
    expect(run(['lift', 'press', 'complete'])).toBe('actuated');
  });
  it('releasing early drops back to lifted', () => {
    expect(run(['lift', 'press', 'release'])).toBe('lifted');
    expect(run(['lift', 'press', 'release', 'complete'])).toBe('lifted');
  });
  it('Escape (close) from any open state closes the cover', () => {
    expect(run(['lift', 'close'])).toBe('closed');
    expect(run(['lift', 'press', 'close'])).toBe('closed');
    expect(run(['lift', 'press', 'complete', 'close'])).toBe('closed');
  });
});

describe('holdProgress', () => {
  it('lights a segment only once its share of time has passed', () => {
    expect(holdProgress(0, 3000, 10)).toMatchObject({ lit: 0, complete: false, remaining: 3 });
    expect(holdProgress(299, 3000, 10).lit).toBe(0);
    expect(holdProgress(300, 3000, 10).lit).toBe(1);
    expect(holdProgress(1500, 3000, 10)).toMatchObject({ lit: 5, fraction: 0.5, remaining: 1.5 });
  });
  it('completes at the duration and clamps past it', () => {
    expect(holdProgress(3000, 3000, 10)).toMatchObject({ lit: 10, complete: true, remaining: 0 });
    expect(holdProgress(9000, 3000, 10)).toMatchObject({ lit: 10, fraction: 1 });
  });
  it('rounds remaining time up to a tenth', () => {
    expect(holdProgress(2950, 3000).remaining).toBe(0.1);
    expect(holdProgress(1, 3000).remaining).toBe(3);
  });
  it('handles a zero duration and bad input', () => {
    expect(holdProgress(0, 0).complete).toBe(true);
    expect(holdProgress(Number.NaN, 3000).lit).toBe(0);
    expect(holdProgress(-50, 3000).fraction).toBe(0);
  });
});

describe('rotary positions', () => {
  it('two positions throw 90 degrees, three step 45', () => {
    expect(rotaryAngles(2)).toEqual([-45, 45]);
    expect(rotaryAngles(3)).toEqual([-45, 0, 45]);
    expect(rotaryAngles(5)).toEqual([-90, -45, 0, 45, 90]);
  });
  it('compresses many positions into 270 degrees', () => {
    const a = rotaryAngles(9);
    expect(a[0]).toBeCloseTo(-135);
    expect(a[8]).toBeCloseTo(135);
  });
  it('has end stops', () => {
    expect(stepPosition(0, -1, 3)).toBe(0);
    expect(stepPosition(2, 1, 3)).toBe(2);
    expect(rotaryKey('ArrowRight', 1, 3)).toBe(2);
    expect(rotaryKey('End', 0, 4)).toBe(3);
    expect(rotaryKey('Tab', 0, 4)).toBeNull();
  });
});

describe('meter scales and limits', () => {
  it('chooses round major ticks', () => {
    expect(scaleTicks(0, 100, 5).major).toEqual([0, 20, 40, 60, 80, 100]);
    expect(scaleTicks(0, 15, 5).major).toEqual([0, 5, 10, 15]);
    expect(scaleTicks(58, 62, 4).major).toEqual([58, 59, 60, 61, 62]);
  });
  it('minor ticks never sit on a major tick', () => {
    const s = scaleTicks(0, 100, 5);
    expect(s.minor.some((m) => s.major.includes(m))).toBe(false);
    expect(s.minor.length).toBeGreaterThan(10);
  });
  it('limit words follow the reactor gauge rules', () => {
    expect(limitWord(50, 80, 90)).toBe('NORMAL');
    expect(limitWord(85, 80, 90)).toBe('HIGH');
    expect(limitWord(95, 80, 90)).toBe('HIGH-HIGH');
    expect(limitWord(1, { lo: 5 }, { lo: 2 })).toBe('LOW-LOW');
    expect(limitWord(Number.NaN, 80)).toBe('NO DATA');
  });
  it('builds warn and alarm zones without overlap', () => {
    expect(limitZones(0, 100, 80, 90)).toEqual([
      { from: 80, to: 90, kind: 'warn' },
      { from: 90, to: 100, kind: 'alarm' },
    ]);
  });
});

describe('seven-segment cells', () => {
  it('right-aligns and attaches decimal points', () => {
    const c = segmentCells('12.5', 4);
    expect(c.map((x) => x.ch).join('')).toBe(' 125');
    expect(c[2]!.dot).toBe(true);
    expect(c[1]!.segs).toBe('bc');
  });
  it('shows dashes when the value does not fit', () => {
    expect(segmentCells('12345', 4).every((x) => x.ch === '-' && x.segs === 'g')).toBe(true);
  });
  it('draws unknown characters as a middle bar', () => {
    expect(segmentCells('?', 1)[0]!.segs).toBe('g');
  });
});
