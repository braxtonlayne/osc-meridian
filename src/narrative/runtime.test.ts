import { describe, expect, it } from 'vitest';
import { signal } from '@preact/signals';
import type { AuditEntry, AuditKind, Services } from '@core/contracts';
import type { CompartmentId } from '@core/canon-types';
import { createRuntime } from './runtime';
import type { RuntimeIo } from './runtime';
import type { NarrativeState } from './rules';
import { seg04 } from './seg04';

function fakeServices() {
  const subs = new Set<(e: AuditEntry) => void>();
  let seq = 0;
  const calls: { grant: string[]; flags: string[]; mail: [string, unknown][]; notify: string[]; audit: [AuditKind, string][] } = {
    grant: [],
    flags: [],
    mail: [],
    notify: [],
    audit: [],
  };
  const compartments = signal<CompartmentId[]>(['LANTERN']);
  const log = (kind: AuditKind, subject: string, detail?: string, data?: Record<string, string>) => {
    calls.audit.push([kind, subject]);
    const e: AuditEntry = { seq: ++seq, at: '', kind, subject, detail: detail ?? '', ...(data ? { data } : {}) };
    for (const fn of subs) fn(e);
  };
  const svc = {
    audit: { log, entries: signal([]), subscribe: (fn: (e: AuditEntry) => void) => (subs.add(fn), () => subs.delete(fn)) },
    session: {
      operatorId: signal('OPR-A03-1147'),
      compartments,
      actingTier2: signal(false),
      setFlag: (n: string) => calls.flags.push(n),
    },
    clearance: {
      grant: (key: string, reason: string) => {
        calls.grant.push(key);
        // the real shell logs a clearance.grant line: must not loop
        log('clearance.grant', key, reason);
      },
    },
    docs: { byDocNo: (d: string) => (d === 'OSC-2008-Q2' ? { marking: 'UMBRA-EO' } : undefined) },
    mail: { deliver: (id: string, opts: unknown) => calls.mail.push([id, opts]) },
    notify: (t: string) => calls.notify.push(t),
  } as unknown as Services;
  return { svc, calls, log };
}

function io(stored: unknown = null) {
  let now = Date.UTC(2026, 10, 19, 15, 0, 0);
  let tick: (() => void) | null = null;
  let saved: NarrativeState | null = null;
  const x: RuntimeIo & { advance(ms: number): void; saved(): NarrativeState | null } = {
    load: async () => stored,
    save: (s) => (saved = s),
    now: () => now,
    every: (_ms, fn) => ((tick = fn), () => (tick = null)),
    advance(ms) {
      const end = now + ms;
      while (now < end) {
        now += 5000;
        tick?.();
      }
    },
    saved: () => saved,
  };
  return x;
}

describe('narrative runtime', () => {
  it('applies effects through Services and persists state', async () => {
    const { svc, calls, log } = fakeServices();
    const clock = io();
    const rt = await createRuntime(svc, clock);
    log('login', 'OPR-A03-1147');
    expect(calls.mail.map(([id]) => id)).toContain('msg-08-04102');
    log('doc.read', 'OSC-2008-Q2');
    log('form.submit', 'OSC-F-160', '', { form: 'OSC-F-160', documentInvolved: 'OSC-2008-Q2' });
    expect(calls.grant).toEqual(['BRIAR']);
    expect(calls.flags).toEqual(['scanRead']);
    expect(clock.saved()!.steps).toEqual(['S03', 'S04']);
    clock.advance(5 * 60_000);
    expect(calls.mail.map(([id]) => id)).toContain('msg-08-04490');
    rt.stop();
  });

  it('writes the withdrawal line through audit.log and publishes the movement window', async () => {
    const { svc, calls, log } = fakeServices();
    const clock = io();
    const rt = await createRuntime(svc, clock);
    log('login', 'OPR-A03-1147');
    const fireAt = rt.state().session!.seg04.fireAt;
    clock.advance(fireAt - clock.now() + 5000);
    expect(seg04.value).not.toBeNull();
    clock.advance(4 * 60_000);
    expect(seg04.value).toBeNull();
    expect(calls.audit.filter(([k]) => k === 'system')).toHaveLength(1);
    rt.stop();
  });

  it('resumes from persisted state', async () => {
    const first = fakeServices();
    const c1 = io();
    const rt1 = await createRuntime(first.svc, c1);
    first.log('login', 'x');
    first.log('doc.read', 'OSC-DIR-0412');
    rt1.stop();
    const second = fakeServices();
    const rt2 = await createRuntime(second.svc, io(JSON.parse(JSON.stringify(c1.saved()))));
    second.log('login', 'x');
    expect(second.calls.mail.map(([id]) => id)).not.toContain('msg-08-04102');
    second.log('terminal.cmd', 'wo FE-08-0417');
    expect(second.calls.grant).toEqual(['TALLOW']);
    rt2.stop();
  });
});
