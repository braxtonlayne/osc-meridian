/**
 * Operating the bays: cords in and out, tests, calls. Writes the shared key `patch`, plays the
 * panel cues, writes the audit trail and sends the consequence mail. One hook per window.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AccountDef, IsolationState, Services } from '@core/contracts';
import * as session from '@core/session';
import { isolatedAt } from '@shell/isolation';
import type { PatchCircuit } from '@core/canon-apps/patch';
import {
  EMPTY,
  HUBS,
  LIVE_UNASSIGNED,
  PC,
  classifyCord,
  computeLinks,
  cordOn,
  dial,
  exchangeFor,
  farEnd,
  interSite,
  jackLabel,
  lampOf,
  otherEnd,
  parseJack,
  ringdownOf,
  runTest,
  serialId,
  siteCode,
  trimLog,
  type LampContext,
} from './model';
import { decide, type Decision } from './rules';
import type { CallOutcome, CallRecord, CircuitTest, CordPurpose, PatchCord, PatchState, TestKind } from './types';

export const ISO_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };

export const MSG = {
  repatch: 'msg-08-04931',
  testFail: 'msg-08-04932',
  unlisted: 'msg-08-04933',
  deputyRepatch: 'msg-08-04934',
  auditorReferral: 'msg-08-04935',
  maintFault: 'msg-08-04936',
} as const;

export interface Refusal {
  title: string;
  text: string;
  reference: string;
}

export interface PendingConfirm {
  text: string;
  site: string;
  a: string;
  b: string;
  purpose: CordPurpose;
  circuits: PatchCircuit[];
}

export interface TestRun {
  site: string;
  circuit: string;
  kind: TestKind;
  startedAt: number;
  durationMs: number;
  samples: number[];
  outcome: CircuitTest | null;
}

export type CallPhase = 'dial-tone' | 'dialling' | 'ringing' | 'answered' | 'cleared' | 'intercept' | 'no-reply' | 'dead' | 'no-dial-tone' | 'busy';

export interface CallRun {
  site: string;
  circuit: string;
  cordId: string;
  phase: CallPhase;
  digits: string;
  rings: number;
  startedAt: number;
  transcript: string[];
  farSite: string | null;
  answer?: string;
  unlisted?: boolean;
}

/** Extension of the duty officer (the same on every exchange). */
const DUTY_EXT = PC.exchanges.flatMap((e) => e.desks).find((d) => d.section === 'Duty Officer')?.ext ?? '';

const pad = (n: number) => String(n).padStart(2, '0');
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function timeText(d: Date = new Date()): string {
  return `${session.zulu(d)} (${session.siteLocal(d)})`;
}

/** "19MAY08" for authority strings. */
export function dateTag(): string {
  const d = session.inWorldDate();
  return `${pad(d.getUTCDate())}${MON[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(2)}`;
}

function yy(): string {
  return String(session.inWorldDate().getUTCFullYear()).slice(2);
}

export function bayName(site: string): string {
  return `${PC.panel.bayPrefix}-${siteCode(site)}`;
}

export interface OpsEnv {
  services: Services;
  who: AccountDef;
  state: PatchState | null;
  isolation: IsolationState;
  lampCtx: Omit<LampContext, 'calling'>;
  say(text: string): void;
  refuse(r: Refusal): void;
}

export function useOps(env: OpsEnv) {
  const { services, who } = env;
  const envRef = useRef(env);
  envRef.current = env;
  const [test, setTest] = useState<TestRun | null>(null);
  const [call, setCall] = useState<CallRun | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const timers = useRef<number[]>([]);
  const callRef = useRef<CallRun | null>(null);
  callRef.current = call;
  const testRef = useRef<TestRun | null>(null);
  testRef.current = test;

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const op = () => services.session.operatorId.peek();
  const isolated = () => isolatedAt(envRef.current.isolation, Date.now());

  const write = (fn: (s: PatchState) => PatchState) => {
    services.shared.update<PatchState | null>('patch', null, (prev) => {
      const base = prev ?? EMPTY;
      const next = fn({ ...base, cords: [...base.cords], tests: [...base.tests], calls: [...base.calls] });
      const now = Date.now();
      return { ...next, links: computeLinks(next, now, base.links), updatedAt: now };
    });
  };

  const delivered = (id: string) => services.mail.delivered.peek().includes(id);
  const traced = (id: string) => services.traces.all.peek().some((t) => t.msgId === id);
  const deliverOnce = (id: string, slots: Record<string, string>) => {
    if (delivered(id)) return;
    services.mail.deliver(id, { slots: { date: session.formatInWorldDate(), ...slots } });
  };

  const refuseDecision = (d: Extract<Decision, { ok: false }>, site: string, what: string) => {
    services.sound.play('error');
    services.audit.log(
      'window.open',
      PC.panel.procedureDocNo,
      `Operator ${op()} attempted ${what} at patch bay ${bayName(site)}. Refused: ${d.text} Reference ${d.reference}.`,
      { app: 'patch', site, refused: what },
    );
    envRef.current.refuse({ title: 'Hub Circuit Patch Panel', text: d.text, reference: d.reference });
  };

  /* ---------------------------------------------------------------- cords */

  const lampNow = (c: PatchCircuit) => lampOf(envRef.current.state, c, { ...envRef.current.lampCtx, now: Date.now(), calling: new Set() });

  function attempt(site: string, a: string, b: string): void {
    const s = envRef.current.state;
    const used = cordOn(s, site, a) ?? cordOn(s, site, b);
    if (used) {
      services.sound.play('error');
      envRef.current.say(`${jackLabel(used.a === a || used.b === a ? a : b)} is in use (cord ${used.id}). Remove the cord first.`);
      return;
    }
    const k = classifyCord(site, a, b);
    if (!k.ok) {
      services.sound.play('error');
      envRef.current.say(k.text);
      return;
    }
    const d = decide(who, site, k.purpose, k.circuits, HUBS, dateTag());
    if (!d.ok) return refuseDecision(d, site, `a ${k.purpose} cord between ${jackLabel(a)} and ${jackLabel(b)}`);
    // A line carrying speech is not broken into: wait for the busy lamp.
    const taken = [a, b].map(parseJack).find((p) => p.side === 'L' && p.circuit && p.circuit.kind !== 'DATA' && k.purpose !== 'monitor');
    if (taken?.circuit && lampNow(taken.circuit) === 'busy' && taken.circuit.status === 'IN SERVICE') {
      services.sound.play('busy');
      envRef.current.say(`${taken.circuit.id} is busy. A line carrying traffic is not patched; wait for the busy lamp to go out.`);
      return;
    }
    if (d.confirm) {
      services.sound.play('error');
      setConfirm({ text: d.confirm, site, a, b, purpose: k.purpose, circuits: k.circuits });
      return;
    }
    commit(site, a, b, k.purpose, k.circuits, d.authorised, d.order);
  }

  function commit(site: string, a: string, b: string, purpose: CordPurpose, circuits: PatchCircuit[], authorised: boolean, order: string | null): void {
    const now = Date.now();
    const at = session.inWorldIso(new Date(now));
    let cord: PatchCord | null = null;
    write((s) => {
      cord = { id: serialId('PC', s.serial), site, a, b, purpose, by: who.id, at, wall: now, order, authorised };
      return { ...s, serial: s.serial + 1, cords: [...s.cords, cord] };
    });
    services.sound.play('switch');
    const pair = `${jackLabel(a)} and ${jackLabel(b)}`;
    const ids = circuits.map((c) => c.id).join(', ');
    const detail =
      purpose === 'repatch'
        ? authorised
          ? `Operator ${op()} repatched ${pair} at bay ${bayName(site)}${order ? ` under ${order}` : ''}.`
          : `Operator ${op()} repatched ${pair} at bay ${bayName(site)} with no circuit order held. Repatch reported to Network Operations.`
        : `Operator ${op()} inserted a ${purpose} cord between ${pair} at bay ${bayName(site)}.`;
    services.audit.log('control', purpose === 'monitor' ? 'patch:monitor' : 'patch:patch', detail, {
      site,
      a,
      b,
      purpose,
      circuits: ids,
      order: order ?? '',
      authorised: String(authorised),
    });
    envRef.current.say(`Cord in: ${pair} (${purpose}).`);
    if (purpose === 'repatch' && !authorised) {
      deliverOnce(MSG.repatch, { bay: bayName(site), circuits: ids, jacks: pair, time: timeText(new Date(now)) });
      if (who.id !== 'deputy' && !traced(MSG.deputyRepatch)) {
        services.traces.post({ to: 'deputy', kind: 'mail.deliver', msgId: MSG.deputyRepatch, subject: `Repatch without order, bay ${bayName(site)}` });
      }
    }
    if (purpose === 'call') {
      const c = circuits[0]!;
      const placed = cordFor(site, a, b);
      later(250, () => offHook(site, c, placed));
    }
  }

  const cordFor = (site: string, a: string, b: string): string => {
    const s = services.shared.get<PatchState | null>('patch', null).peek();
    return (s?.cords ?? []).find((k) => k.site === site && ((k.a === a && k.b === b) || (k.a === b && k.b === a)))?.id ?? '';
  };

  function confirmPending(yes: boolean): void {
    const p = confirm;
    setConfirm(null);
    if (!p) return;
    if (!yes) {
      envRef.current.say('Repatch not made.');
      return;
    }
    commit(p.site, p.a, p.b, p.purpose, p.circuits, false, null);
  }

  function remove(cord: PatchCord): void {
    const k = classifyCord(cord.site, cord.a, cord.b);
    const circuits = k.ok ? k.circuits : [];
    const d = decide(who, cord.site, cord.purpose, circuits, HUBS, dateTag());
    if (!d.ok) return refuseDecision(d, cord.site, `removal of cord ${cord.id}`);
    if (callRef.current?.cordId === cord.id) endCall('abandoned');
    if (testRef.current && testRef.current.site === cord.site && circuits.some((c) => c.id === testRef.current!.circuit) && cord.purpose === 'test') abortTest();
    write((s) => ({ ...s, cords: s.cords.filter((x) => x.id !== cord.id) }));
    services.sound.play('switch');
    services.audit.log('control', 'patch:unpatch', `Operator ${op()} removed cord ${cord.id} (${jackLabel(cord.a)} to ${jackLabel(cord.b)}) at bay ${bayName(cord.site)}.${cord.authorised ? '' : ' The cord had been made without a circuit order.'}`, {
      site: cord.site,
      cord: cord.id,
      a: cord.a,
      b: cord.b,
      purpose: cord.purpose,
      madeBy: cord.by,
    });
    envRef.current.say(`Cord ${cord.id} out. ${circuits.map((c) => c.id).join(' and ')} normal-through where no other cord stands.`);
  }

  /* ---------------------------------------------------------------- tests */

  function startTest(site: string, c: PatchCircuit, kind: TestKind): void {
    if (testRef.current) {
      envRef.current.say('A test is already running on the test set.');
      return;
    }
    const d = decide(who, site, 'test', [c], HUBS, dateTag());
    if (!d.ok) return refuseDecision(d, site, `a ${kind} test on ${c.id}`);
    const dead = isolated() && interSite(c) && c.id !== LIVE_UNASSIGNED;
    const t0 = Date.now();
    const outcome = runTest(kind, c, t0 / 1000, dead);
    const durationMs =
      kind === 'tone' ? PC.tests.toneS * 1000 : kind === 'loopback' ? PC.tests.loopS * 1000 : outcome.samples ? outcome.samples.length * PC.tests.sampleMs : PC.tests.loopS * 1000;
    services.sound.play('relay');
    const run: TestRun = { site, circuit: c.id, kind, startedAt: t0, durationMs, samples: [], outcome: null };
    setTest(run);
    envRef.current.say(`Test set: ${kind === 'quality' ? 'line quality run' : kind === 'tone' ? `${PC.tests.toneHz} Hz tone at ${PC.tests.toneDbm0} dBm0` : 'far-end loop requested'} on ${c.id}.`);
    if (outcome.samples) {
      outcome.samples.forEach((_, i) => later((i + 1) * PC.tests.sampleMs, () => setTest((r) => (r && r.startedAt === t0 ? { ...r, samples: outcome.samples!.slice(0, i + 1) } : r))));
    }
    later(durationMs, () => finishTest(run, c, outcome, dead));
  }

  function finishTest(run: TestRun, c: PatchCircuit, o: ReturnType<typeof runTest>, dead: boolean): void {
    if (testRef.current?.startedAt !== run.startedAt) return;
    const now = Date.now();
    let rec: CircuitTest | null = null;
    write((s) => {
      rec = { id: serialId('CT', s.serial, yy()), site: run.site, circuit: c.id, kind: run.kind, by: who.id, at: session.inWorldIso(new Date(now)), wall: now, result: o.result, summary: o.summary, readings: o.readings, samples: o.samples };
      return { ...s, serial: s.serial + 1, tests: trimLog([...s.tests, rec]) };
    });
    const r = rec as CircuitTest | null;
    setTest({ ...run, samples: o.samples ?? [], outcome: r });
    services.sound.play(o.result === 'FAIL' ? 'error' : 'relay');
    const readings: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.readings)) readings[k] = String(v);
    services.audit.log('control', 'patch:test', `Operator ${op()} ran a ${run.kind} test on ${c.id} at bay ${bayName(run.site)}${r ? ` (${r.id})` : ''}. Result ${o.result}. ${o.summary}`, {
      site: run.site,
      circuit: c.id,
      test: run.kind,
      result: o.result,
      testId: r?.id ?? '',
      ...readings,
    });
    envRef.current.say(`${c.id} ${run.kind} test: ${o.result}. ${o.summary}`);
    if (o.result === 'FAIL') {
      const slots = { circuit: c.id, bay: bayName(run.site), test: run.kind, result: o.result, summary: o.summary, testId: r?.id ?? '', time: timeText(new Date(now)) };
      // During isolation a hub test fails on every inter-site pair and is not reported (OSC-MEM-07-1186 para 9).
      if (who.tier >= 4) deliverOnce(MSG.maintFault, slots);
      else if (!dead) deliverOnce(MSG.testFail, slots);
    }
  }

  function abortTest(): void {
    if (!testRef.current) return;
    const t = testRef.current;
    clearTimers();
    setTest(null);
    envRef.current.say(`Test on ${t.circuit} stopped before completion. No result recorded.`);
  }

  /* ---------------------------------------------------------------- calls */

  function offHook(site: string, c: PatchCircuit, cordId: string): void {
    const t0 = Date.now();
    const base: CallRun = { site, circuit: c.id, cordId, phase: 'dial-tone', digits: '', rings: 0, startedAt: t0, transcript: [], farSite: farEnd(c, site) };
    services.sound.play('relay');
    const dead = isolated() && interSite(c) && c.id !== LIVE_UNASSIGNED;
    if (dead) return settle({ ...base, phase: 'dead', transcript: [PC.messages.dead] }, 'dead');
    if (c.kind === 'DATA') return settle({ ...base, phase: 'no-dial-tone', transcript: [PC.messages.dataCircuit] }, 'no-dial-tone');
    if (c.status === 'NOT ASSIGNED' && c.id !== LIVE_UNASSIGNED) return settle({ ...base, phase: 'no-dial-tone', transcript: [PC.messages.open] }, 'no-dial-tone');
    const rd = ringdownOf(c);
    if (rd || c.status === 'SPARE') {
      if (!rd) return settle({ ...base, phase: 'no-dial-tone', transcript: [PC.messages.noDialTone] }, 'no-dial-tone');
      const run = { ...base, phase: 'ringing' as const, transcript: ['Ringdown circuit: the far end rings when the line is seized.'], unlisted: c.id === LIVE_UNASSIGNED };
      setCall(run);
      ring(run, rd.rings, rd.answer, rd.reply);
      return;
    }
    setCall({ ...base, transcript: ['Dial tone.'] });
    envRef.current.say(`Operator position on ${c.id}. Dial tone. Dial ${PC.calls.dialDigits} digits.`);
  }

  function settle(run: CallRun, outcome: CallOutcome): void {
    setCall(run);
    services.sound.play(outcome === 'busy' ? 'busy' : 'error');
    record(run, outcome);
  }

  function press(digit: string): void {
    const cur = callRef.current;
    if (!cur || (cur.phase !== 'dial-tone' && cur.phase !== 'dialling')) {
      services.sound.play('button');
      return;
    }
    services.sound.play('button');
    const digits = cur.digits + digit;
    if (digits.length < PC.calls.dialDigits) {
      setCall({ ...cur, phase: 'dialling', digits });
      return;
    }
    services.sound.play('dtmf');
    const c = PC.circuits.find((x) => x.id === cur.circuit)!;
    const exch = exchangeFor(c, cur.site);
    const hourZ = new Date().getUTCHours();
    const dialled = { ...cur, phase: 'ringing' as const, digits, transcript: [...cur.transcript, `Dialled ${digits}.`] };
    if (!exch) {
      // A site exchange beyond the hub: only its duty officer answers line checks.
      setCall(dialled);
      if (digits === DUTY_EXT) ring(dialled, PC.ringdowns.DUTY.rings, PC.ringdowns.DUTY.answer, PC.ringdowns.DUTY.reply);
      else later(1500, () => settle({ ...dialled, phase: 'intercept', transcript: [...dialled.transcript, PC.messages.intercept] }, 'intercept'));
      return;
    }
    const res = dial(exch, digits, hourZ);
    setCall({ ...dialled, farSite: exch });
    if (res.kind === 'intercept') {
      later(1500, () => settle({ ...dialled, farSite: exch, phase: 'intercept', transcript: [...dialled.transcript, PC.messages.intercept] }, 'intercept'));
      return;
    }
    if (res.kind === 'no-reply') {
      ring({ ...dialled, farSite: exch }, PC.calls.maxRings + 1, '', null);
      return;
    }
    ring({ ...dialled, farSite: exch, unlisted: !res.listed }, res.desk.rings, res.desk.answer, res.desk.reply);
  }

  function ring(run: CallRun, rings: number, answer: string, reply: string | null): void {
    const cycle = (PC.calls.ringOnS + PC.calls.ringOffS) * 1000;
    const t0 = Date.now();
    const max = Math.min(rings, PC.calls.maxRings);
    for (let i = 0; i < max; i++) {
      later(i * cycle, () => setCall((r) => (r && r.startedAt === run.startedAt && r.phase === 'ringing' ? { ...r, rings: i + 1 } : r)));
    }
    if (rings > PC.calls.maxRings || !answer) {
      later(max * cycle, () => {
        const r = callRef.current;
        if (!r || r.startedAt !== run.startedAt) return;
        settle({ ...r, phase: 'no-reply', transcript: [...r.transcript, PC.messages.noReply] }, 'no-reply');
      });
      return;
    }
    const answerAt = (rings - 1) * cycle + PC.calls.ringOnS * 500;
    later(answerAt, () => {
      const r = callRef.current;
      if (!r || r.startedAt !== run.startedAt) return;
      services.sound.play('relay');
      setCall({ ...r, phase: 'answered', answer, unlisted: run.unlisted, transcript: [...r.transcript, `Far end: "${answer}"`] });
      envRef.current.say(`${r.circuit}: answered. "${answer}"`);
    });
    const replyAt = answerAt + PC.calls.replyAfterS * 1000;
    if (reply) {
      later(replyAt, () => setCall((r) => (r && r.startedAt === run.startedAt && r.phase === 'answered' ? { ...r, transcript: [...r.transcript, `Far end: "${reply}"`] } : r)));
    }
    later(replyAt + PC.calls.clearAfterS * 1000, () => {
      const r = callRef.current;
      if (!r || r.startedAt !== run.startedAt || r.phase !== 'answered') return;
      services.sound.play('relay');
      const done = { ...r, phase: 'cleared' as const, transcript: [...r.transcript, PC.messages.farClear] };
      setCall(done);
      record(done, 'answered');
    });
    void t0;
  }

  function endCall(outcome: CallOutcome = 'abandoned'): void {
    const r = callRef.current;
    if (!r) return;
    clearTimers();
    if (r.phase === 'cleared' || r.phase === 'intercept' || r.phase === 'no-reply' || r.phase === 'dead' || r.phase === 'no-dial-tone' || r.phase === 'busy') {
      setCall(null);
      return;
    }
    services.sound.play('relay');
    const done = { ...r, phase: 'cleared' as const, transcript: [...r.transcript, 'Released at this position.'] };
    record(done, r.phase === 'answered' ? 'answered' : outcome);
    setCall(null);
  }

  function record(run: CallRun, outcome: CallOutcome): void {
    const now = Date.now();
    const durationS = Math.round((now - run.startedAt) / 1000);
    let rec: CallRecord | null = null;
    write((s) => {
      rec = { id: serialId('CL', s.serial), site: run.site, circuit: run.circuit, number: run.digits, farSite: run.farSite, by: who.id, at: session.inWorldIso(new Date(now)), wall: now, outcome, answer: run.answer, durationS };
      return { ...s, serial: s.serial + 1, calls: trimLog([...s.calls, rec]) };
    });
    const r = rec as CallRecord | null;
    const to = run.digits ? `${run.digits} on the ${run.farSite ?? 'site'} exchange` : 'the ringdown far end';
    services.audit.log('control', 'patch:call', `Operator ${op()} placed a call on ${run.circuit} from bay ${bayName(run.site)} to ${to}. Outcome: ${outcome}${run.answer ? `; answered "${run.answer}"` : ''}. Duration ${durationS} s.`, {
      site: run.site,
      circuit: run.circuit,
      number: run.digits,
      far: run.farSite ?? '',
      outcome,
      callId: r?.id ?? '',
      unlisted: String(!!run.unlisted),
    });
    envRef.current.say(`Call ${r?.id ?? ''} on ${run.circuit}: ${outcome}. Entered in the bay log.`);
    if (outcome === 'answered' && run.unlisted) {
      deliverOnce(MSG.unlisted, { circuit: run.circuit, number: run.digits || 'none (ringdown)', bay: bayName(run.site), time: timeText(new Date(now)), callId: r?.id ?? '' });
      if (who.id !== 'auditor' && !traced(MSG.auditorReferral)) {
        services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: MSG.auditorReferral, subject: 'Referral: exchange record withdrawn' });
      }
    }
  }

  return { test, call, confirm, attempt, confirmPending, remove, startTest, abortTest, press, endCall, setTestView: setTest };
}

export type Ops = ReturnType<typeof useOps>;

export { otherEnd };
