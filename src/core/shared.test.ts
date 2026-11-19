import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSharedStore, SHARED_PREFIX } from './shared';
import type { SharedStoreHandle } from './shared';

const open: SharedStoreHandle[] = [];
function store(channelName: string): SharedStoreHandle {
  // Transport semantics with toy values: no typed-key validation (tested separately below).
  const s = createSharedStore({ channelName, eventTarget: null, validators: {} });
  open.push(s);
  return s;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => localStorage.clear());
afterEach(() => {
  for (const s of open.splice(0)) s.close();
});

describe('shared store', () => {
  it('returns the fallback, then the stored value, as one signal per key', () => {
    const s = store('t-a');
    const a = s.get('drill', null as null | { id: string });
    expect(a.value).toBeNull();
    expect(s.get('drill', null)).toBe(a);
    s.set('drill', { id: 'SD-1' });
    expect(a.value).toEqual({ id: 'SD-1' });
    expect(localStorage.getItem(SHARED_PREFIX + 'drill')).toBe('{"id":"SD-1"}');
  });

  it('is global: a second store (another account or page) reads the same value', () => {
    store('t-b').set('isolation', { level: 2 });
    expect(store('t-b2').get('isolation', { level: 0 }).value).toEqual({ level: 2 });
  });

  it('update reads the latest persisted value', () => {
    const a = store('t-c');
    const b = store('t-c2');
    a.get('n', 0);
    b.set('n', 5);
    a.update<number>('n', 0, (p) => p + 1);
    expect(a.get('n', 0).value).toBe(6);
  });

  it('syncs to other tabs over BroadcastChannel', async () => {
    const tab1 = store('t-sync');
    const tab2 = store('t-sync');
    const sig = tab2.get('doors', { open: [] as string[] });
    tab1.set('doors', { open: ['BD-1'] });
    for (let i = 0; i < 20 && sig.value.open.length === 0; i++) await wait(10);
    expect(sig.value).toEqual({ open: ['BD-1'] });
  });

  it('falls back to storage events', () => {
    const target = new EventTarget();
    const s = createSharedStore({ channelName: 't-ev', eventTarget: target, validators: {} });
    open.push(s);
    const sig = s.get('pa', 'idle');
    localStorage.setItem(SHARED_PREFIX + 'pa', '"broadcasting"');
    const ev = new Event('storage') as Event & { key: string; newValue: string };
    Object.assign(ev, { key: SHARED_PREFIX + 'pa', newValue: '"broadcasting"' });
    target.dispatchEvent(ev);
    expect(sig.value).toBe('broadcasting');
  });
});

describe('shared store: typed keys are validated on read', () => {
  const typed = (name: string) => {
    const s = createSharedStore({ channelName: name, eventTarget: null });
    open.push(s);
    return s;
  };

  it('repairs a partial isolation value to the full shape', () => {
    localStorage.setItem(SHARED_PREFIX + 'isolation', '{"level":2}');
    const v = typed('v-a').get<{ level: number; active: boolean; initiations: unknown[] }>('isolation', { level: 0, active: false, initiations: [] }).value;
    expect(v.level).toBe(2);
    expect(v.active).toBe(false);
    expect(v.initiations).toEqual([]);
  });

  it('reads malformed JSON and unusable values as absent (fallback), never throws', () => {
    localStorage.setItem(SHARED_PREFIX + 'drill', '{"id":"SD-1"}'); // no phase, no orderedAt
    localStorage.setItem(SHARED_PREFIX + 'dispatch', '{not json');
    const s = typed('v-b');
    expect(s.get('drill', null).value).toBeNull();
    expect(s.get('dispatch', []).value).toEqual([]);
  });

  it('keeps an old-version drill (core DrillState, no v) in that shape', () => {
    const old = { id: 'SD-0', orderedAt: 5, by: 'deputy', phase: 'sealed', sites: { 'GAMMA-08': { ordered: 5, acknowledged: 6, sealed: 7, status: 'sealed' }, X: { status: 'bogus' } }, endedAt: null };
    localStorage.setItem(SHARED_PREFIX + 'drill', JSON.stringify(old));
    const v = typed('v-d').get<Record<string, unknown> | null>('drill', null).value!;
    expect(v.v).toBeUndefined();
    expect(Object.keys(v.sites as object)).toEqual(['GAMMA-08']);
  });

  it('update hands the fallback to the updater when the stored value is unusable', () => {
    localStorage.setItem(SHARED_PREFIX + 'traces', '"garbage"');
    const s = typed('v-c');
    s.update<unknown[]>('traces', [], (prev) => [...prev, { id: 't1' }]);
    expect(Array.isArray(s.get('traces', []).value)).toBe(true);
  });
});
