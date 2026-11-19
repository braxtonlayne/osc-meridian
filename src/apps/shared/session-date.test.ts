/**
 * The in-world date is the session's fixed date (canon.meta.inWorldDate, 19 MAY 2008),
 * whatever the visitor's real calendar day; time of day still follows the real clock.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hostDate, stamp } from '../terminal/host';
import { inWorldOffsetMs } from '../registry/telemetry';
import { inWorldDateIso, inWorldDateText, inWorldDay, inWorldWeekday, isoDateText } from '@sim/time';

describe('session date with the real clock on another day (2026-03-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T14:32:10Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('terminal host date and stamp', () => {
    expect(hostDate(new Date())).toBe('19 MAY 2008');
    expect(stamp(new Date())).toContain('19 MAY 2008 1432Z');
  });
  it('registry telemetry offset maps now onto 19 MAY 2008, same time of day', () => {
    const world = new Date(Date.now() + inWorldOffsetMs());
    expect(world.toISOString()).toBe('2008-05-19T14:32:10.000Z');
  });
  it('transit simulation (src/sim/time.ts) and the possession register date', () => {
    const now = Date.now();
    expect(inWorldDay(now)).toBe(19);
    expect(inWorldDateIso(now)).toBe('2008-05-19');
    expect(inWorldDateText(now)).toBe('19 MAY 2008');
    expect(inWorldWeekday(now)).toBe(1); // Monday
    expect(isoDateText(inWorldDateIso(now))).toBe('19 MAY 2008');
  });
});
