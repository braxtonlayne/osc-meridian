import { describe, expect, it } from 'vitest';
import { clearedAt, isolatedAt, isolationPeriods, readIsolation } from './state';
import type { IsolateState } from './types';

const T0 = 1_000_000;
const base = (over: Partial<IsolateState> = {}): IsolateState => ({
  level: 1,
  active: true,
  clearsAt: T0 + 60_000,
  initiations: [{ at: '2008-05-19T14:00:00Z', by: 'analyst', ref: 'NI-080519-01', ms: T0 }],
  restorations: [],
  seal: null,
  withdrawn: false,
  ...over,
});

describe('isolation readers', () => {
  it('readIsolation repairs any stored value', () => {
    for (const raw of [null, undefined, 'x', 3, [], { level: 'two' }, { initiations: 'bad', active: 'yes' }]) {
      const s = readIsolation(raw);
      expect(s.active).toBe(false);
      expect(Array.isArray(s.initiations)).toBe(true);
      expect(isolatedAt(s, T0)).toBe(false);
    }
  });

  it('isolated until clearsAt, then cleared at clearsAt', () => {
    const s = base();
    expect(isolatedAt(s, T0 + 1)).toBe(true);
    expect(clearedAt(s, T0 + 1)).toBeNull();
    expect(isolatedAt(s, T0 + 60_000)).toBe(false);
    expect(clearedAt(s, T0 + 70_000)).toBe(T0 + 60_000);
  });

  it('clearedMs written at restoration ends it even with active still true', () => {
    const s = base({ clearsAt: null, initiations: [{ at: '2008-05-19T14:00:00Z', by: 'analyst', ref: 'NI-080519-01', ms: T0, clearedMs: T0 + 5000 }] });
    expect(isolatedAt(s, T0 + 4000)).toBe(true);
    expect(isolatedAt(s, T0 + 5000)).toBe(false);
    expect(clearedAt(s, T0 + 9000)).toBe(T0 + 5000);
  });

  it('an approved restoration for the last initiation ends it', () => {
    const s = base({ clearsAt: null, restorations: [{ cert: 'RC-1', ref: 'NI-080519-01', level: 1, raisedBy: 'analyst', raisedAt: '2008-05-19T14:01:00Z', status: 'approved' }] });
    expect(isolatedAt(s, T0 + 1)).toBe(false);
  });

  it('periods: one per initiation, open while in force', () => {
    expect(isolationPeriods(base(), T0 + 1)).toEqual([{ ref: 'NI-080519-01', from: T0, to: null }]);
    expect(isolationPeriods(base(), T0 + 90_000)).toEqual([{ ref: 'NI-080519-01', from: T0, to: T0 + 60_000 }]);
  });
});
