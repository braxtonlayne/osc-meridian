import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import type { AuditEntry } from '@core/contracts';
import { ACCOUNT_SPECS, addressMatches, initialAcctState, reduceAccount, reviveAcctState, type AcctState, type AcctWorld } from './accounts';

const NO_WORLD: AcctWorld = { drillActive: false, traces: [], crossReads: {} };
const entry = (kind: AuditEntry['kind'], subject: string, data?: Record<string, string>): AuditEntry => ({ seq: 1, at: '2008-05-19T14:00:00Z', kind, subject, detail: '', ...(data ? { data } : {}) });

function login(account: 'lifesupport' | 'deputy' | 'auditor', now = 1000) {
  return reduceAccount(initialAcctState(account), ACCOUNT_SPECS[account], { type: 'audit', entry: entry('login', 'x'), now, newSession: true });
}

/** Tick every 5 s from `from` for `ms`. */
function run(s0: AcctState, account: 'lifesupport' | 'deputy' | 'auditor', from: number, ms: number, world: AcctWorld = NO_WORLD) {
  let s = s0;
  const ids: string[] = [];
  for (let t = from; t <= from + ms; t += 5000) {
    const r = reduceAccount(s, ACCOUNT_SPECS[account], { type: 'tick', now: t, world });
    s = r.state;
    ids.push(...r.effects.map((e) => e.id));
  }
  return { s, ids };
}

describe('per-account narrative: spec matches content frontmatter', () => {
  const dir = join(process.cwd(), 'content/mail/accounts');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  it('every account message is in its account spec with the same arrival', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const fm = matter(readFileSync(join(dir, f), 'utf8')).data as { id: string; account: keyof typeof ACCOUNT_SPECS; message?: { arrival?: unknown } };
      const spec = ACCOUNT_SPECS[fm.account];
      expect(spec, `${f}: account ${fm.account}`).toBeDefined();
      const m = spec.find((x) => x.id === fm.id);
      expect(m, `${fm.id} missing from ACCOUNT_SPECS.${fm.account}`).toBeDefined();
      expect(m!.arrival).toEqual(fm.message?.arrival);
    }
    const all = Object.values(ACCOUNT_SPECS).flat().map((m) => m.id);
    expect(all.sort()).toEqual(files.map((f) => f.replace(/\.md$/, '')).sort());
  });
});

describe('per-account narrative: reducer', () => {
  it('delivers login mail silently, once', () => {
    const r = login('deputy');
    const ids = r.effects.map((e) => e.id);
    expect(ids).toEqual(ACCOUNT_SPECS.deputy.filter((m) => m.arrival.type === 'login').map((m) => m.id));
    expect(r.effects.every((e) => e.silent)).toBe(true);
    const again = reduceAccount(r.state, ACCOUNT_SPECS.deputy, { type: 'audit', entry: entry('login', 'x'), now: 2000, newSession: true });
    expect(again.effects).toEqual([]);
  });

  it('timed fallback counts only unlocked signed-in time, capped per tick', () => {
    const r = login('deputy', 0);
    const a = run(r.state, 'deputy', 0, 49 * 60_000);
    expect(a.ids).not.toContain('msg-08-06209');
    const b = run(a.s, 'deputy', 49 * 60_000 + 5000, 2 * 60_000);
    expect(b.ids).toContain('msg-08-06209');
    // A long gap (laptop asleep) adds at most the cap.
    const c = reduceAccount(initialAcctState('auditor'), ACCOUNT_SPECS.auditor, { type: 'audit', entry: entry('login', 'x'), now: 0, newSession: true });
    const d = reduceAccount(c.state, ACCOUNT_SPECS.auditor, { type: 'tick', now: 3_600_000, world: NO_WORLD });
    expect(d.state.activeMs).toBe(30_000);
  });

  it('plant trigger: lifesupport gets 06105 when the drill goes active', () => {
    const r = login('lifesupport', 0);
    const a = run(r.state, 'lifesupport', 5000, 10_000, { ...NO_WORLD, drillActive: true });
    expect(a.ids).toContain('msg-08-06105');
    const e = reduceAccount(r.state, ACCOUNT_SPECS.lifesupport, { type: 'tick', now: 5000, world: { ...NO_WORLD, drillActive: true } }).effects[0]!;
    expect(e.slots?.date).toBeTruthy();
  });

  it('app trigger: opening G08-BD3 delivers 06106; other doors do not', () => {
    const r = login('lifesupport', 0);
    const other = reduceAccount(r.state, ACCOUNT_SPECS.lifesupport, { type: 'audit', entry: entry('control', 'doors:open', { door: 'G08-BD1', cmd: 'open' }), now: 10 });
    expect(other.effects).toEqual([]);
    const hit = reduceAccount(r.state, ACCOUNT_SPECS.lifesupport, { type: 'audit', entry: entry('control', 'doors:open', { door: 'G08-BD3', cmd: 'open' }), now: 10 });
    expect(hit.effects.map((e) => e.id)).toEqual(['msg-08-06106']);
  });

  it('trace trigger: the first F-126 routed by the analyst delivers 06206 (no fallback)', () => {
    const r = login('deputy', 0);
    const none = run(r.state, 'deputy', 5000, 120 * 60_000);
    expect(none.ids).not.toContain('msg-08-06206');
    const w: AcctWorld = { ...NO_WORLD, traces: [{ kind: 'form.routed', from: 'analyst', data: { form: 'OSC-F-126' } }] };
    expect(reduceAccount(r.state, ACCOUNT_SPECS.deputy, { type: 'tick', now: 5000, world: w }).effects.map((e) => e.id)).toContain('msg-08-06206');
  });

  it('cross-account docRead: the auditor reading OSC-MEM-08-0187 delivers 06208 to the deputy', () => {
    const r = login('deputy', 0);
    const w: AcctWorld = { ...NO_WORLD, crossReads: { auditor: ['OSC-MEM-08-0187'] } };
    expect(reduceAccount(r.state, ACCOUNT_SPECS.deputy, { type: 'tick', now: 5000, world: w }).effects.map((e) => e.id)).toContain('msg-08-06208');
  });

  it('docRead, app (assurance review) and mailTo triggers for the auditor', () => {
    const r = login('auditor', 0);
    const spec = ACCOUNT_SPECS.auditor;
    const read = reduceAccount(r.state, spec, { type: 'audit', entry: entry('doc.read', 'OIA-08-031'), now: 10 });
    expect(read.effects.map((e) => e.id)).toEqual(['msg-08-06307']);
    const rev = reduceAccount(r.state, spec, { type: 'audit', entry: entry('control', 'assurance:review', { operator: 'analyst' }), now: 10 });
    expect(rev.effects.map((e) => e.id)).toEqual(['msg-08-06306']);
    const sent = reduceAccount(r.state, spec, { type: 'audit', entry: entry('mail.send', 'Q', { to: 'pay.records@a01.pv.mer' }), now: 10 });
    expect(sent.effects.map((e) => e.id)).toEqual(['msg-08-06308']);
  });

  it('nothing triggers while locked; revive rejects another account’s state', () => {
    const r = login('lifesupport', 0);
    const locked = reduceAccount(r.state, ACCOUNT_SPECS.lifesupport, { type: 'audit', entry: entry('timeout', 'x'), now: 1 });
    expect(reduceAccount(locked.state, ACCOUNT_SPECS.lifesupport, { type: 'tick', now: 5000, world: { ...NO_WORLD, drillActive: true } }).effects).toEqual([]);
    expect(reviveAcctState(r.state, 'deputy')).toEqual(initialAcctState('deputy'));
    expect(reviveAcctState({ v: 1, account: 'lifesupport', mail: 'bad' }, 'lifesupport').mail).toEqual([]);
  });

  it('address patterns', () => {
    expect(addressMatches('*@a01.pv.mer', 'X.Y@A01.PV.MER')).toBe(true);
    expect(addressMatches('*@a01.pv.mer', 'x@a01.pv.mer.evil')).toBe(false);
  });
});
