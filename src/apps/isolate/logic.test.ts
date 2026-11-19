import { describe, expect, it } from 'vitest';
import canonJson from '../../../content/canon/apps/isolate.json';
import { schema, type IsolateCanon } from '@core/canon-apps/isolate';
import {
  NONE,
  breakSeal,
  certBlock,
  decideCertificate,
  expire,
  fmtRemaining,
  initiate,
  initiateBlock,
  isIsolated,
  mailPlan,
  nextRef,
  normalize,
  opsCount,
  raiseCertificate,
  restorationWord,
  stepsFor,
} from './logic';
import type { IsolateState } from './types';

const cfg: IsolateCanon = schema.parse(canonJson);
const ISO = '2008-05-19T14:30:00Z';
const isoAt = () => '2008-05-19T15:00:00Z';
const accounts = [
  { id: 'analyst' as const, tier: 3 as const },
  { id: 'lifesupport' as const, tier: 4 as const },
  { id: 'deputy' as const, tier: 2 as const },
  { id: 'auditor' as const, tier: 3 as const },
];

function press(s: IsolateState, now: number, by: 'analyst' | 'deputy' = 'analyst'): IsolateState {
  const r = initiate(s, cfg, { by, operatorId: 'OPR-A03-1147', iso: ISO, now });
  if ('refused' in r) throw new Error(`refused: ${r.refused}`);
  return r.state;
}

function certify(s: IsolateState, now: number): IsolateState {
  const r = raiseCertificate(s, cfg, { by: 'analyst', iso: ISO, now, statement: 'Initiated in error while examining the control.' });
  if ('refused' in r) throw new Error(`refused: ${r.refused}`);
  const d = decideCertificate(r.state, cfg, { cert: r.cert.cert, decision: 'approved', by: 'deputy', iso: ISO });
  if (!d) throw new Error('not decided');
  return d;
}

describe('isolate escalation', () => {
  it('canon fragment validates and has five levels in order', () => {
    expect(cfg.levels.map((l) => l.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it('first initiation latches, sets the clear time, and numbers the reference from the archived register', () => {
    const s = press(normalize(null), 1000);
    expect(s.level).toBe(1);
    expect(s.active).toBe(true);
    expect(s.clearsAt).toBe(1000 + cfg.levels[0]!.clearsAfterMin! * 60_000);
    expect(s.initiations[0]!.ref).toBe('NI-080519-01');
    expect(isIsolated(s, 2000)).toBe(true);
    expect(opsCount(s, cfg.archived.length)).toBe(cfg.archived.length + 1);
    // the archived entry shares the numbering only on its own date
    expect(nextRef('NI', NONE, cfg.archived, '2008-03-27T23:00:00Z')).toBe('NI-080327-02');
  });

  it('refuses a second actuation while latched, and does not escalate', () => {
    const s = press(normalize(null), 1000);
    expect(initiateBlock(s, 2000)).toBe('latched');
    const r = initiate(s, cfg, { by: 'analyst', operatorId: 'x', iso: ISO, now: 2000 });
    expect('refused' in r && r.refused).toBe('latched');
  });

  it('level 1 restores itself after line checks; a level 1 certificate is refused', () => {
    const s = press(normalize(null), 0);
    expect(certBlock(s, cfg, 10)).toBe('automatic-only');
    expect(expire(s, cfg, 10, isoAt)).toBeNull();
    const e = expire(s, cfg, s.clearsAt!, isoAt)!;
    expect(e.active).toBe(false);
    expect(e.level).toBe(1);
    expect(e.restorations!.at(-1)!.status).toBe('automatic');
    expect(restorationWord(e, cfg, s.clearsAt!)).toBe('RESTORED');
  });

  it('level 2 may be restored early by certificate; the level never decreases', () => {
    let s = press(normalize(null), 0);
    s = expire(s, cfg, s.clearsAt!, isoAt)!;
    s = press(s, 1);
    expect(s.level).toBe(2);
    expect(certBlock(s, cfg, 2)).toBeNull();
    s = certify(s, 2);
    expect(s.active).toBe(false);
    expect(s.level).toBe(2);
    expect(s.seal).toBeNull();
  });

  it('a pending certificate is withdrawn by the automatic restoration', () => {
    let s = press(normalize(null), 0);
    s = expire(s, cfg, s.clearsAt!, isoAt)!;
    s = press(s, 1);
    const r = raiseCertificate(s, cfg, { by: 'analyst', iso: ISO, now: 2, statement: 'Statement of the circumstances of the initiation.' });
    if ('refused' in r) throw new Error(r.refused);
    expect(certBlock(r.state, cfg, 3)).toBe('pending');
    const e = expire(r.state, cfg, r.state.clearsAt!, isoAt)!;
    expect(e.restorations!.find((x) => x.cert === r.cert.cert)!.status).toBe('returned');
  });

  it('a short statement is refused', () => {
    let s = press(normalize(null), 0);
    s = expire(s, cfg, s.clearsAt!, isoAt)!;
    s = press(s, 1);
    const r = raiseCertificate(s, cfg, { by: 'analyst', iso: ISO, now: 2, statement: 'oops' });
    expect('refused' in r && r.refused).toBe('statement');
  });

  it('level 3 has no clear time, needs a certificate, and seals the cover on restoration', () => {
    let s = press(normalize(null), 0);
    s = expire(s, cfg, s.clearsAt!, isoAt)!;
    s = certify(press(s, 1), 2);
    s = press(s, 3);
    expect(s.level).toBe(3);
    expect(s.clearsAt).toBeNull();
    expect(isIsolated(s, Number.MAX_SAFE_INTEGER)).toBe(true);
    const ret = (() => {
      const r = raiseCertificate(s, cfg, { by: 'analyst', iso: ISO, now: 4, statement: 'Statement of the circumstances of the initiation.' });
      if ('refused' in r) throw new Error(r.refused);
      return decideCertificate(r.state, cfg, { cert: r.cert.cert, decision: 'returned', by: 'deputy', iso: ISO, note: 'Statement incomplete.' })!;
    })();
    expect(ret.active).toBe(true);
    s = certify(ret, 5);
    expect(s.active).toBe(false);
    expect(s.seal).toMatchObject({ no: cfg.seals[0], broken: false });
    expect(initiateBlock(s, 6)).toBe('sealed');
    expect(stepsFor(s)).toBe(3);
  });

  it('level 4 needs the seal broken; level 5 is withdrawn and held for good', () => {
    let s = press(normalize(null), 0);
    s = expire(s, cfg, s.clearsAt!, isoAt)!;
    s = certify(press(s, 1), 2);
    s = certify(press(s, 3), 4);
    s = breakSeal(s, { by: 'analyst', iso: ISO })!;
    expect(initiateBlock(s, 5)).toBeNull();
    s = press(s, 5);
    expect(s.level).toBe(4);
    s = certify(s, 6);
    expect(s.seal!.no).toBe(cfg.seals[1]);
    s = breakSeal(s, { by: 'deputy', iso: ISO })!;
    s = press(s, 7, 'deputy');
    expect(s.level).toBe(5);
    expect(s.withdrawn).toBe(true);
    expect(isIsolated(s, Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(certBlock(s, cfg, 8)).toBe('withdrawn');
    expect(initiateBlock(s, 8)).toBe('withdrawn');
    expect(restorationWord(s, cfg, 8)).toMatch(/COUNCIL/);
  });

  it('mail plan: network excludes Tier 4, initiator resolves to the presser', () => {
    const l1 = mailPlan(cfg.levels[0]!, 'deputy', accounts);
    const net = l1.filter((m) => m.msg === 'msg-08-05202').map((m) => m.account);
    expect(net).toEqual(['analyst', 'deputy', 'auditor']);
    expect(l1.find((m) => m.msg === 'msg-08-05201')!.account).toBe('deputy');
    expect(l1.find((m) => m.msg === 'msg-08-05203')!.account).toBe('lifesupport');
  });

  it('formats remaining time', () => {
    expect(fmtRemaining(61_000)).toBe('01:01');
    expect(fmtRemaining(3_723_000)).toBe('1:02:03');
  });
});
