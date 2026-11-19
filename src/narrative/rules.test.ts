import { describe, expect, it } from 'vitest';
import planJson from './plan.json';
import { SPEC } from './spec';
import { A2_PATTERN, formRefusal, initialState, isQueryOfInterest, isUndeliverable, reduce, seg04Window, TICK_CAP_MS } from './rules';
import type { Ctx, Effect, NarrativeEvent, NarrativeState } from './rules';
import type { AuditEntry, AuditKind } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { SEG04_DURATION_MS, SEG04_LOG_HOLD_MS, seg04Blocks } from './seg04';

const MARKINGS: Record<string, MarkingId> = {
  'OSC-2008-Q2': 'UMBRA-EO',
  'OSC-DIR-0412': 'TSSCI-OSC',
  'OIA-08-031': 'UMBRA-C',
  'OSC-FAC-IDX': 'UMBRA-C',
};
const ctx: Ctx = { operatorId: 'OPR-A03-1147', markingOf: (d) => MARKINGS[d] };
const T0 = Date.UTC(2026, 10, 19, 15, 0, 0);

class H {
  s: NarrativeState = initialState();
  fx: Effect[] = [];
  now = T0;
  seq = 100;

  send(ev: NarrativeEvent): Effect[] {
    const r = reduce(this.s, ev, ctx);
    this.s = r.state;
    this.fx.push(...r.effects);
    return r.effects;
  }
  audit(kind: AuditKind, subject: string, detail = '', data?: Record<string, string>, newSession = false): Effect[] {
    const entry: AuditEntry = { seq: ++this.seq, at: '', kind, subject, detail, ...(data ? { data } : {}) };
    return this.send({ type: 'audit', entry, now: this.now, newSession });
  }
  login(newSession = true) {
    return this.audit('login', 'OPR-A03-1147', '', undefined, newSession);
  }
  read(docNo: string) {
    return this.audit('doc.read', docNo);
  }
  form(form: string, fields: Record<string, string>) {
    return this.audit('form.submit', form, '', { form, ...fields });
  }
  cmd(c: string) {
    return this.audit('terminal.cmd', c);
  }
  search(q: string) {
    return this.audit('search', q);
  }
  /** Advance the clock in 5 s ticks; returns effects produced meanwhile. */
  advance(ms: number): Effect[] {
    const out: Effect[] = [];
    const end = this.now + ms;
    while (this.now < end) {
      this.now = Math.min(this.now + 5000, end);
      out.push(...this.send({ type: 'tick', now: this.now }));
    }
    return out;
  }
  mails(fx: Effect[] = this.fx) {
    return fx.filter((f): f is Extract<Effect, { type: 'mail' }> => f.type === 'mail');
  }
  mailIds(fx?: Effect[]) {
    return this.mails(fx).map((m) => m.id);
  }
  grants(fx: Effect[] = this.fx) {
    return fx.filter((f) => f.type === 'grant').map((f) => (f as Extract<Effect, { type: 'grant' }>).key);
  }
  flags(fx: Effect[] = this.fx) {
    return fx.filter((f) => f.type === 'flag').map((f) => (f as Extract<Effect, { type: 'flag' }>).name);
  }
  done(id: string) {
    return this.s.steps.includes(id);
  }
}

function session(): H {
  const h = new H();
  h.login();
  return h;
}

/** Complete S03 then S04 (BRIAR). */
function withBriar(h: H) {
  h.read('OSC-2008-Q2');
  h.form('OSC-F-160', { documentInvolved: 'OSC-2008-Q2' });
}

describe('spec', () => {
  it('runtime spec matches plan.json (triggers, requirements, grants, mail rules)', () => {
    const p = planJson as unknown as typeof SPEC & { keys: { compartments: string[] }; steps: (typeof SPEC.steps[number] & { title: string })[] };
    expect(SPEC.mailQueue).toEqual(p.mailQueue);
    expect(SPEC.steps.map((s) => s.id)).toEqual(p.steps.map((s) => s.id));
    for (const [i, s] of SPEC.steps.entries()) {
      const q = p.steps[i]!;
      expect(s.trigger).toEqual(q.trigger);
      expect(s.requires).toEqual(q.requires);
      expect(s.requiresAny).toEqual(q.requiresAny);
      expect(s.grant).toEqual(q.grant);
    }
    expect(SPEC.earnable.sort()).toEqual(p.keys.compartments.filter((c) => c !== 'LANTERN').sort());
    expect(SPEC.steps).toHaveLength(15);
  });
});

describe('login and timed mail', () => {
  it('delivers the login batch once, silently, with the briefing acknowledgement already read', () => {
    const h = new H();
    const fx = h.login();
    const ids = h.mailIds(fx);
    expect(ids).toEqual(['msg-08-04102', 'msg-08-04106', 'msg-08-04131', 'msg-08-04298', 'msg-08-04305', 'msg-08-04362', 'msg-08-04417', 'msg-08-04433', 'msg-08-04459']);
    expect(h.mails(fx).every((m) => m.silent)).toBe(true);
    expect(h.mails(fx).find((m) => m.id === 'msg-08-04131')!.read).toBe(true);
    expect(h.mailIds(h.login(true))).toEqual([]);
  });

  it('delivers the timed queue by active minutes (tasking falls back at 6 min)', () => {
    const h = session();
    expect(h.mailIds(h.advance(5 * 60_000))).toEqual([]);
    expect(h.mailIds(h.advance(60_000))).toEqual(['msg-08-04470']);
    expect(h.mailIds(h.advance(6 * 60_000))).toEqual(['msg-08-04471']);
    expect(h.mailIds(h.advance(8 * 60_000))).toEqual(['msg-08-04472']);
    expect(h.mailIds(h.advance(10 * 60_000))).toEqual(['msg-08-04473']);
    expect(h.mailIds(h.advance(15 * 60_000))).toEqual(['msg-08-04474']);
  });

  it('does not count locked time or long gaps as active time', () => {
    const h = session();
    h.audit('timeout', 'x');
    h.advance(60 * 60_000);
    expect(h.s.activeMs).toBe(0);
    h.login(false);
    h.now += 3 * 60 * 60_000; // laptop asleep
    h.send({ type: 'tick', now: h.now });
    expect(h.s.activeMs).toBe(TICK_CAP_MS);
  });
});

describe('unlock steps', () => {
  it('S01 reading DIR-0412 sets oriented and brings the tasking forward', () => {
    const h = session();
    const fx = h.read('OSC-DIR-0412');
    expect(h.flags(fx)).toEqual(['oriented']);
    expect(h.mailIds(fx)).toEqual(['msg-08-04470']);
    expect(h.mailIds(h.advance(10 * 60_000))).not.toContain('msg-08-04470');
  });

  it('S01 also counts a window.open of the directive, but not a refusal', () => {
    const h = session();
    h.audit('window.open', 'OSC-DIR-0412', 'Operator OPR-A03-1147 requested OSC-DIR-0412. Request refused: Requires Tier 2 access determination.');
    expect(h.done('S01')).toBe(false);
    h.audit('window.open', 'OSC-DIR-0412', 'Operator OPR-A03-1147 opened OSC-DIR-0412 (TOP SECRET//SCI//OSC) in Directives.');
    expect(h.done('S01')).toBe(true);
  });

  it('S02 by reading the ticket or by searching the accession', () => {
    const a = session();
    expect(a.flags(a.read('OIA-08-031'))).toEqual(['accessionHeld']);
    const b = session();
    expect(b.flags(b.search('accession 00412'))).toEqual(['accessionHeld']);
    const c = session();
    c.search('004120');
    expect(c.done('S02')).toBe(false);
  });

  it('S03 and A1: the scan sets scanRead and the OIA record of access follows in 2-4 minutes', () => {
    const h = session();
    const fx = h.read('OSC-2008-Q2');
    expect(h.flags(fx)).toEqual(['scanRead']);
    expect(h.mailIds(fx)).toEqual([]);
    expect(h.mailIds(h.advance(2 * 60_000 - 5000))).toEqual(expect.not.arrayContaining(['msg-08-04490']));
    const later = h.mails(h.advance(2 * 60_000 + 5000)).find((m) => m.id === 'msg-08-04490')!;
    expect(later.slots).toMatchObject({ workstation: 'A03-5-114', docNo: 'OSC-2008-Q2', time: '1500Z (1100 EDT)' });
    expect(later.slots!.auditRef).toMatch(/^AUD-0805\d{2}-000102$/);
    h.read('OSC-2008-Q2');
    expect(h.mailIds(h.advance(10 * 60_000))).not.toContain('msg-08-04490');
  });

  it('S04 BRIAR needs the scan opened first', () => {
    const h = session();
    h.form('OSC-F-160', { documentInvolved: 'RD-ACC-08-00412' });
    expect(h.grants()).toEqual([]);
    h.read('OSC-2008-Q2');
    const fx = h.form('OSC-F-160', { documentInvolved: 'scan OSC-2008-Q2 copy' });
    expect(h.grants(fx)).toEqual(['BRIAR']);
    expect(h.mailIds(fx)).toEqual(['msg-08-04480']);
  });

  it('S05 needs both 790 memos', () => {
    const h = session();
    h.read('OSC-MEM-08-0187');
    expect(h.done('S05')).toBe(false);
    expect(h.flags(h.read('OSC-MEM-08-0203'))).toEqual(['queryRead']);
  });

  it('S06 HOLLOW on F-131 naming 790 or one of the three', () => {
    const a = session();
    const fx = a.form('OSC-F-131', { subjectPn: 'P-4-07-0219' });
    expect(a.grants(fx)).toEqual(['HOLLOW']);
    expect(a.mailIds(fx)).toEqual(['msg-08-04481']);
    const b = session();
    expect(b.grants(b.form('OSC-F-131', { personsDeclared: ' 790 ' }))).toEqual(['HOLLOW']);
    const c = session();
    expect(c.grants(c.form('OSC-F-131', { personsDeclared: '7900' }))).toEqual([]);
  });

  it('S07 then S08 KESTREL with a holder as sponsor and an in-scope justification', () => {
    const h = session();
    const good = { compartment: 'KESTREL', sponsorPn: 'P-3-05-0288', justification: 'Discrepancy noted in OSC-MEM-07-0944.' };
    h.form('OSC-F-126', good);
    expect(h.grants()).toEqual([]);
    expect(h.flags(h.read('OSC-MEM-07-0944'))).toEqual(['mileageQuery']);
    h.form('OSC-F-126', { ...good, sponsorPn: 'P-2-04-0218' });
    h.form('OSC-F-126', { ...good, justification: 'For my work.' });
    expect(h.grants()).toEqual([]);
    const fx = h.form('OSC-F-126', good);
    expect(h.grants(fx)).toEqual(['KESTREL']);
    expect(h.mailIds(fx)).toEqual(['msg-08-04482']);
  });

  it('S09 and A4: the movement fires 6-25 min after login, watching it sets the flag and OIA writes 8-12 min later', () => {
    const h = session();
    const fireAt = h.s.session!.seg04.fireAt;
    expect(fireAt - T0).toBeGreaterThanOrEqual(6 * 60_000);
    expect(fireAt - T0).toBeLessThanOrEqual(25 * 60_000);
    h.advance(fireAt - h.now + 5000);
    const w = seg04Window(h.s, h.now)!;
    expect(w.end - w.start).toBe(SEG04_DURATION_MS);
    expect(seg04Blocks(w.start + 1, w)).toEqual([1]);
    expect(seg04Blocks(w.start + 30_000, w)).toEqual([2, 3]);
    expect(seg04Blocks(w.end - 1, w)).toEqual([11, 12]);
    const fx = h.audit('transit.watch', 'SEG04', 'board displayed', { event: 'SEG04', view: 'schematic', start: String(w.start), end: String(w.end) });
    expect(h.flags(fx)).toEqual(['seg04Witnessed']);
    const after = h.advance(13 * 60_000);
    const m = h.mails(after).find((x) => x.id === 'msg-08-04493')!;
    expect(m.slots).toMatchObject({ view: 'schematic', duration: '2 min 30 s' });
    expect(JSON.stringify(m.slots)).not.toMatch(/seg/i);
    const withdrawn = after.filter((f) => f.type === 'audit');
    expect(withdrawn).toHaveLength(1);
    expect((withdrawn[0] as { detail: string }).detail).toMatch(/^Board indication record for interval \d{4}Z to \d{4}Z withdrawn by Transit Control on instruction\.$/);
    expect(seg04Window(h.s, h.now)).toBeNull();
  });

  it('S09 unwatched: only the withdrawal line, no mail; once per session', () => {
    const h = session();
    const fx = h.advance(30 * 60_000);
    expect(fx.filter((f) => f.type === 'audit')).toHaveLength(1);
    expect(h.mailIds(fx)).not.toContain('msg-08-04493');
    expect(h.advance(60 * 60_000).filter((f) => f.type === 'audit')).toHaveLength(0);
    h.login(true); // a new sign-in draws a new movement
    expect(h.advance(30 * 60_000).filter((f) => f.type === 'audit')).toHaveLength(1);
  });

  it('the movement never fires while locked; it fires at unlock', () => {
    const h = session();
    h.audit('timeout', 'x');
    h.advance(40 * 60_000);
    expect(h.s.session!.seg04.startedAt).toBeNull();
    h.login(false);
    h.advance(5000);
    expect(h.s.session!.seg04.startedAt).toBe(h.now);
  });

  it('S10 SEXTANT needs the witnessed movement or KESTREL', () => {
    const h = session();
    h.form('OSC-F-114', { location: 'Segment 04, block 04-03' });
    expect(h.grants()).toEqual([]);
    h.audit('transit.watch', 'SEG04', '', { event: 'SEG04', view: 'geographic' });
    const fx = h.form('OSC-F-114', { location: 'seg 4' });
    expect(h.grants(fx)).toEqual(['SEXTANT']);
    expect(h.mailIds(fx)).toEqual(['msg-08-04483']);
    const k = session();
    k.read('OSC-MEM-07-0944');
    k.form('OSC-F-126', { compartment: 'KESTREL', sponsorPn: 'P-2-02-0091', justification: 'OSC-TRN-SEG-04 sheet' });
    expect(k.grants(k.form('OSC-F-114', { location: 'R04 consist at 04-07' }))).toEqual(['SEXTANT']);
  });

  it('S11 TALLOW: wo FE-08-0417 after orientation', () => {
    const h = session();
    h.cmd('wo FE-08-0417');
    expect(h.grants()).toEqual([]);
    h.read('OSC-DIR-0412');
    const fx = h.cmd('wo FE-08-0417');
    expect(h.grants(fx)).toEqual(['TALLOW']);
    expect(h.mailIds(fx)).toEqual(['msg-08-04484']);
  });

  it('S12 QUARRY: F-114 citing the scan and copy 07, after BRIAR', () => {
    const h = session();
    const report = { location: 'Records Division', documents: 'OSC-2008-Q2', description: 'Title sheet reads copy no. 7' };
    h.form('OSC-F-114', report);
    expect(h.grants()).toEqual([]);
    withBriar(h);
    const fx = h.form('OSC-F-114', report);
    expect(h.grants(fx)).toEqual(['QUARRY']);
    expect(h.mailIds(fx)).toEqual(['msg-08-04485']);
  });

  it('S13 and A6: strength unposted after HOLLOW sets the flag and draws the terminal notice', () => {
    const h = session();
    h.form('OSC-F-131', { subjectPn: 'P-3-05-0142' });
    const fx = h.cmd('strength unposted');
    expect(h.flags(fx)).toEqual(['strengthRun']);
    const m = h.mails(h.advance(4 * 60_000)).find((x) => x.id === 'msg-08-04495')!;
    expect(m.slots).toMatchObject({ command: 'strength unposted' });
  });

  it('S14 interim review at four compartments, then S15 by F-126 or terminal', () => {
    const h = session();
    h.cmd('clearance request acting');
    withBriar(h);
    h.form('OSC-F-131', { personsDeclared: '790' });
    h.read('OSC-DIR-0412');
    h.cmd('wo FE-08-0417');
    expect(h.done('S14')).toBe(false);
    const fx = h.form('OSC-F-114', { documents: 'OSC-2008-Q2', description: 'copy 07' });
    expect(h.grants(fx)).toEqual(['QUARRY']);
    expect(h.flags(fx)).toEqual(['interimReview']);
    expect(h.mailIds(fx)).toEqual(['msg-08-04485', 'msg-08-04486']);
    h.form('OSC-F-126', { compartment: 'ACTING-T2', sponsorPn: 'P-2-02-0091' });
    expect(h.done('S15')).toBe(false);
    const fx2 = h.form('OSC-F-126', { compartment: 'ACTING-T2', sponsorPn: 'P-2-04-0218' });
    expect(h.grants(fx2)).toEqual(['ACTING-T2']);
    expect(h.mailIds(fx2)).toEqual(['msg-08-04487']);

    const t = session();
    t.send({ type: 'sync', compartments: ['LANTERN', 'BRIAR', 'HOLLOW', 'TALLOW', 'QUARRY'], acting: false });
    expect(t.done('S14')).toBe(true);
    expect(t.grants(t.cmd('clearance request acting'))).toEqual(['ACTING-T2']);
  });
});

describe('audit consequences', () => {
  it('A2: second query of interest in a session, once, quoting it', () => {
    const h = session();
    h.search('cafeteria');
    h.search('unposted');
    expect(h.s.pending).toHaveLength(0);
    h.search('Dimmick');
    const m = h.mails(h.advance(3 * 60_000)).find((x) => x.id === 'msg-08-04491')!;
    expect(m.slots).toMatchObject({ query: 'Dimmick', count: '2' });
    expect(m.slots!.date).toMatch(/^\d{2} MAY 2008$/);
    h.search('790');
    h.search('detached');
    expect(h.mailIds(h.advance(5 * 60_000))).not.toContain('msg-08-04491');
  });

  it('A3: 25 withholding marks examined in a session', () => {
    const h = session();
    for (let i = 0; i < 24; i++) h.audit('redaction.hover', i % 3 ? 'OSC-DIR-0233' : 'OIA-08-031');
    expect(h.s.pending).toHaveLength(0);
    h.audit('redaction.hover', 'OSC-DIR-0233');
    const m = h.mails(h.advance(2 * 60_000)).find((x) => x.id === 'msg-08-04492')!;
    expect(m.slots).toMatchObject({ count: '25', docNo: 'OSC-DIR-0233', firstTime: '1500Z (1100 EDT)' });
  });

  it('A5: printing UMBRA-C or higher, or requesting reproduction of an EYES ONLY record', () => {
    const h = session();
    h.audit('print', 'OSC-DIR-0412');
    expect(h.flags()).toEqual([]);
    const fx = h.audit('print', 'OIA-08-031');
    expect(h.flags(fx)).toEqual(['oiaReviewedPrints']);
    expect(h.mails(h.advance(5 * 60_000)).find((x) => x.id === 'msg-08-04494')!.slots).toMatchObject({ docNo: 'OIA-08-031' });
    const f = session();
    const fx2 = f.form('OSC-F-142', { document: 'OSC-2008-Q2 (one copy)' });
    expect(f.flags(fx2)).toEqual(['oiaReviewedPrints']);
  });

  it('A6: trace of the held accession', () => {
    const h = session();
    h.cmd('trace RD-ACC-08-00398');
    expect(h.s.pending).toHaveLength(0);
    h.cmd('trace RD-ACC-08-00412');
    expect(h.mailIds(h.advance(3 * 60_000))).toContain('msg-08-04495');
  });

  it('A7: non-delivery every time, naming the recipient', () => {
    const h = session();
    const a = h.audit('mail.send', 'x', '', { to: 'C.Dimmick@a03.rd.mer', subject: 'Locker', body: 'Your items' });
    const b = h.audit('mail.send', 'x', '', { to: 'r.tobin@a02.fe.mer, m.okafor@a03.rd.mer' });
    expect(h.mails(a)).toEqual([{ type: 'mail', id: 'msg-08-04497', slots: { recipient: 'c.dimmick@a03.rd.mer' }, repeat: true }]);
    expect(h.mails(b)[0]!.slots).toEqual({ recipient: 'r.tobin@a02.fe.mer' });
    expect(h.mailIds(h.audit('mail.send', 'x', '', { to: 'm.okafor@a03.rd.mer' }))).toEqual([]);
  });

  it('A2: hashed surnames plus the shipped pattern cover the plan pattern', () => {
    const rule = (planJson as unknown as { auditRules: { id: string; condition: string }[] }).auditRules.find((r) => r.id === 'A2')!;
    const src = /\/(.+)\/i/.exec(rule.condition)![1]!;
    const norm = (a: string) => a.replace(/\\b/g, '');
    const shipped = A2_PATTERN.source.split('|').map(norm);
    const names = src.split('|').filter((alt) => !shipped.includes(norm(alt)));
    expect(names).toHaveLength(3);
    for (const n of names) {
      expect(isQueryOfInterest(`Records of ${n[0]!.toUpperCase()}${n.slice(1)}, C.`)).toBe(true);
      expect(isQueryOfInterest(`${n}x`)).toBe(false);
    }
    expect(isQueryOfInterest('cafeteria rota')).toBe(false);
  });

  it('A7: the hashed recipient set is exactly the plan list', () => {
    const rule = (planJson as unknown as { auditRules: { id: string; condition: string }[] }).auditRules.find((r) => r.id === 'A7')!;
    const listed = rule.condition.match(/[a-z.]+@[a-z0-9.]+/g)!;
    expect(listed).toHaveLength(3);
    for (const a of listed) expect(isUndeliverable(a.toUpperCase())).toBe(true);
    expect(isUndeliverable('m.okafor@a03.rd.mer')).toBe(false);
  });

  it('A8: strength enquiry to Personnel Accounting, once', () => {
    const h = session();
    h.audit('mail.send', 'x', '', { to: 'h.lindqvist@a01.pv.mer', subject: 'Parking', body: 'Bay 12' });
    expect(h.s.pending).toHaveLength(0);
    h.audit('mail.send', 'x', '', { to: 'h.lindqvist@a01.pv.mer', subject: 'Query', body: 'About the 790 figure' });
    expect(h.mailIds(h.advance(6 * 60_000))).toContain('msg-08-04496');
    h.audit('mail.send', 'x', '', { to: 'h.lindqvist@a01.pv.mer', body: 'unposted' });
    expect(h.s.pending).toHaveLength(0);
  });

  it('A9: the fifth access refusal in a session is noted', () => {
    const h = session();
    const refuse = () => h.audit('window.open', 'OSC-TRN-RS', 'Operator OPR-A03-1147 requested OSC-TRN-RS. Request refused: Requires Tier 3 access determination and KESTREL compartment briefing.');
    h.audit('window.open', '/nowhere', 'Operator OPR-A03-1147 requested /nowhere. Request refused: No document or application is registered at /nowhere.');
    for (let i = 0; i < 4; i++) expect(refuse()).toEqual([]);
    const fx = refuse();
    expect(fx.map((f) => f.type)).toEqual(['notify', 'audit']);
    expect((fx[0] as { text: string }).text).toBe('Repeated refusals are recorded (DIR-0412 para 8).');
    expect(refuse()).toEqual([]);
  });

  it('A10: F-122 from a probationer is returned citing DIR-0247', () => {
    const h = session();
    const fx = h.form('OSC-F-122', { destination: 'ALPHA-01' });
    expect(fx.map((f) => f.type)).toEqual(['notify', 'audit']);
    expect(JSON.stringify(fx)).toMatch(/OSC-DIR-0247/);
    expect(formRefusal('OSC-F-122', {})).toMatch(/DIR-0247/);
    expect(formRefusal('OSC-F-126', { compartment: 'hollow' })).toMatch(/Not approvable on request/);
    expect(formRefusal('OSC-F-126', { compartment: 'KESTREL' })).toBeNull();
  });
});

describe('engine properties', () => {
  it('is pure: the input state is not mutated', () => {
    const h = session();
    const before = JSON.stringify(h.s);
    reduce(h.s, { type: 'audit', entry: { seq: 1, at: '', kind: 'doc.read', subject: 'OSC-DIR-0412', detail: '' }, now: T0 }, ctx);
    expect(JSON.stringify(h.s)).toBe(before);
  });

  it('is deterministic: the same events give the same state and effects', () => {
    const run = () => {
      const h = session();
      h.read('OSC-2008-Q2');
      h.search('unposted');
      h.search('790');
      h.advance(30 * 60_000);
      return JSON.stringify([h.s, h.fx]);
    };
    expect(run()).toBe(run());
  });

  it('is idempotent: repeating triggers grants nothing twice', () => {
    const h = session();
    withBriar(h);
    withBriar(h);
    h.read('OSC-DIR-0412');
    h.read('OSC-DIR-0412');
    h.send({ type: 'sync', compartments: ['LANTERN', 'BRIAR'], acting: false });
    expect(h.grants()).toEqual(['BRIAR']);
    expect(h.mailIds().filter((m) => m === 'msg-08-04470' || m === 'msg-08-04480')).toEqual(['msg-08-04480', 'msg-08-04470']);
  });

  it('survives a persist round trip mid-way (reload resumes)', () => {
    const h = session();
    h.read('OSC-2008-Q2');
    h.s = JSON.parse(JSON.stringify(h.s)) as NarrativeState;
    h.login(true);
    expect(h.mailIds(h.advance(5 * 60_000))).toContain('msg-08-04490');
    expect(h.grants(h.form('OSC-F-160', { documentInvolved: 'OSC-2008-Q2' }))).toEqual(['BRIAR']);
  });

  it('ignores its own audit lines and grant records', () => {
    const h = session();
    expect(h.audit('system', 'Transit Control', 'withdrawn')).toEqual([]);
    expect(h.audit('clearance.grant', 'BRIAR', 'recorded')).toEqual([]);
  });

  it('never puts step or rule ids into text it emits', () => {
    const h = session();
    withBriar(h);
    h.form('OSC-F-122', {});
    for (let i = 0; i < 5; i++) h.audit('window.open', 'X', 'Request refused: Requires Tier 2 access determination.');
    h.advance(40 * 60_000);
    expect(JSON.stringify(h.fx.filter((f) => f.type !== 'mail'))).not.toMatch(/\b(S(0[1-9]|1[0-5])|A([1-9]|1[01]))\b/);
  });

  it('withdrawal line timing matches the published window', () => {
    const h = session();
    h.advance(h.s.session!.seg04.fireAt - h.now + 5000);
    const st = h.s.session!.seg04.startedAt!;
    expect(h.advance(SEG04_DURATION_MS + SEG04_LOG_HOLD_MS - (h.now - st) - 5000).filter((f) => f.type === 'audit')).toHaveLength(0);
    expect(h.advance(5000).filter((f) => f.type === 'audit')).toHaveLength(1);
  });
});
