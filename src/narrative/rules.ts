/**
 * MERIDIAN narrative rules: a pure, deterministic reducer
 *   reduce(state, event, ctx) -> { state, effects }
 * driven by src/narrative/plan.json (steps S01-S15, mail queue) and the audit
 * consequence table A1-A11 (docs/NARRATIVE.md section 3). No I/O, no clocks, no
 * Math.random: time arrives on the event, randomness from a seeded PRNG kept in
 * state. The runtime (runtime.ts) applies the effects through Services.
 *
 * Text produced here is in-world only. Step ids and rule ids never reach an
 * effect's text.
 */
import { SPEC } from './spec';
import type { AuditEntry } from '@core/contracts';
import type { CompartmentId, MarkingId } from '@core/canon-types';
import { auditRef, dateSlot, durationSlot, timeSlot, zuluOf } from './format';
import { SEG04_DURATION_MS, SEG04_LOG_HOLD_MS } from './seg04';

/* ------------------------------------------------------------------ plan */

export type Trigger =
  | { type: 'doc.read'; docNos: string[]; mode?: 'any' | 'all' }
  | { type: 'search'; pattern: string }
  | { type: 'form.submit'; form: string; match: Record<string, string> }
  | { type: 'terminal.cmd'; pattern: string }
  | { type: 'transit.watch'; event: string }
  | { type: 'state'; condition: string }
  | { type: 'anyOf'; of: Trigger[] };

export interface Step {
  id: string;
  trigger: Trigger;
  requires: string[];
  requiresAny?: string[];
  grant: { kind: 'flag' | 'compartment' | 'acting'; value: string };
}

export type MailRule =
  | { type: 'login' }
  | { type: 'after'; minutes: number }
  | { type: 'step'; step: string }
  | { type: 'firstOf'; of: MailRule[] }
  | { type: 'audit'; audit: string; delayMinutes: [number, number] };

export interface MailItem {
  id: string;
  rule: MailRule;
  read?: boolean;
  oia?: boolean;
  slots?: string[];
}

/** The runtime subset of plan.json (see spec.ts). */
export interface Spec {
  baseline: { compartments: string[]; workstation: string };
  /** The six compartments that can be earned (S14 counts these). */
  earnable: string[];
  steps: Step[];
  mailQueue: MailItem[];
}

const plan = SPEC;
export const WORKSTATION = plan.baseline.workstation;
const EARNABLE = plan.earnable;

/* ----------------------------------------------------------------- state */

export interface PendingMail {
  id: string;
  /** Due when profile active time reaches this (ms). */
  dueActive: number;
  slots?: Record<string, string>;
}

export interface Seg04State {
  /** Wall-clock ms at which the movement is due (fires at the first unlocked tick after). */
  fireAt: number;
  startedAt: number | null;
  watched: boolean;
  withdrawn: boolean;
}

export interface SessionState {
  startedAt: number;
  locked: boolean;
  searches: number;
  hovers: number;
  hoverDocs: Record<string, number>;
  firstHoverAt: number | null;
  refusals: number;
  /** Transit Control windows open, by audit subject (from window.open / window.close lines). */
  transitWins?: string[];
  seg04: Seg04State;
}

export interface NarrativeState {
  v: 1;
  /** PRNG state (mulberry32). 0 = not yet seeded. */
  rng: number;
  /** Completed steps. */
  steps: string[];
  /** Mail ids delivered by the engine (once-only bookkeeping). */
  mail: string[];
  pending: PendingMail[];
  /** Once-per-profile audit consequences already fired. */
  fired: string[];
  /** Distinct docNos displayed (upper case). */
  reads: string[];
  compartments: string[];
  acting: boolean;
  /** Unlocked, signed-in time accumulated across sessions (ms). */
  activeMs: number;
  lastTick: number | null;
  session: SessionState | null;
}

export function initialState(): NarrativeState {
  return {
    v: 1,
    rng: 0,
    steps: [],
    mail: [],
    pending: [],
    fired: [],
    reads: [],
    compartments: [...plan.baseline.compartments],
    acting: false,
    activeMs: 0,
    lastTick: null,
    session: null,
  };
}

/** Accept a persisted value if it looks like our state; otherwise start fresh. */
export function reviveState(raw: unknown): NarrativeState {
  const base = initialState();
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return base;
  return { ...base, ...(raw as Partial<NarrativeState>) } as NarrativeState;
}

/* ---------------------------------------------------------------- events */

export type NarrativeEvent =
  | { type: 'audit'; entry: AuditEntry; now: number; newSession?: boolean }
  /** boardOpen: Transit Control board visible (reported by the app); falls back to open transit windows. */
  | { type: 'tick'; now: number; boardOpen?: boolean }
  /** Reconcile with the session store (grants made outside the engine). */
  | { type: 'sync'; compartments: string[]; acting: boolean; now?: number };

export type Effect =
  | { type: 'grant'; key: CompartmentId | 'ACTING-T2'; reason: string }
  | { type: 'flag'; name: string }
  | { type: 'mail'; id: string; slots?: Record<string, string>; read?: boolean; silent?: boolean; repeat?: boolean }
  | { type: 'notify'; text: string; from: string }
  | { type: 'audit'; subject: string; detail: string };

export interface Ctx {
  operatorId: string;
  /** Marking of a document by docNo (undefined if unknown). */
  markingOf(docNo: string): MarkingId | undefined;
}

/* -------------------------------------------------------------- constants */

const MIN = 60_000;
/** Longest gap between ticks that still counts as active time (sleep, background tab). */
export const TICK_CAP_MS = 30_000;
export const SEG04_DELAY_MIN: [number, number] = [6, 25];
/**
 * Once due, the movement waits for the board to be open in an unlocked session.
 * If the board is never opened it still runs, unwatched, this long after it fell due,
 * so the withdrawal record exists for audit tail.
 */
export const SEG04_UNWATCHED_AFTER_MS = 20 * MIN;
const TRANSIT_WINDOW = /\bin Transit Control\.$|\bopened Transit Control\.$|\bclosed Transit Control\.$|^Transit Control$/;
export const SCAN_DOCNO = 'OSC-2008-Q2';
const MARKING_RANK: Record<MarkingId, number> = { 'TSSCI-OSC': 0, 'UMBRA-R': 1, 'UMBRA-C': 2, 'UMBRA-U': 3, 'UMBRA-EO': 4 };

/** A2: queries of interest to the Office of Internal Assurance. */
export const A2_PATTERN = /unposted|\b790\b|detached|seg(ment)?\s*0?4\b|electronic cop|inventory scan|copy\s*0?7\b/i;
/** A2: FNV-1a of the three surnames (lowercase); names are not shipped. */
const A2_NAME_HASHES = new Set([0x6f807b88, 0xfa36807d, 0xc31e9cfd]);
export function isQueryOfInterest(q: string): boolean {
  if (A2_PATTERN.test(q)) return true;
  return q
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((t) => t && A2_NAME_HASHES.has(fnv1a(t)));
}
export const A3_THRESHOLD = 25;
export const A6_PATTERN = /^(trace\s+RD-ACC-08-00412\b|strength\s+unposted\b)/i;
/** 32-bit FNV-1a of a string (stable, pure). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
/** A7: FNV-1a of the lowercased addresses that are not accepting mail (addresses are not shipped). */
const A7_RECIPIENT_HASHES = new Set([0xc6d3ceba, 0x2180fd56, 0xd14fff91]);
export function isUndeliverable(address: string): boolean {
  return A7_RECIPIENT_HASHES.has(fnv1a(address.trim().toLowerCase()));
}
export const A8_DOMAIN = '@a01.pv.mer';
export const A8_PATTERN = /790|unposted|PV-Q-08-0031/i;
export const A9_REFUSALS = 5;
const REFUSED = /Request refused/;
const NOT_FOUND = /No document or application is registered/;

/** In-world basis recorded with each grant (shown by Classification Control). */
const GRANT_REASON: Record<string, string> = {
  BRIAR: 'Read-in under OSC-DIR-0412 para 4(c) on receipt of self-report OSC-F-160.',
  HOLLOW: 'Read-in under OSC-DIR-0412 para 4(c) on receipt of declaration OSC-F-131.',
  KESTREL: 'Compartment access request OSC-F-126 approved; sponsor holds the compartment.',
  SEXTANT: 'Reporting officer read into the compartment of the report, OSC-DIR-0412 para 4(c) (OSC-F-114).',
  TALLOW: 'Workstation added to the distribution of work order FE-08-0417 (OSC-DIR-0301 para 7).',
  QUARRY: 'Read-in under OSC-DIR-0412 para 4(e) on receipt of provenance report OSC-F-114.',
  'ACTING-T2': 'Acting designation under OSC-DIR-0395 para 7 on the recommendation of the supervisor of record.',
};

/* --------------------------------------------------------------- helpers */

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** mulberry32 step on state.rng; returns [0, 1). */
function random(s: NarrativeState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function uniformMs(s: NarrativeState, [lo, hi]: [number, number]): number {
  return Math.round((lo + random(s) * (hi - lo)) * MIN);
}

function re(pattern: string): RegExp {
  return new RegExp(pattern, 'i');
}

/** The form number a form.submit entry refers to ("OSC-F-160"). */
export function formOf(e: AuditEntry): string {
  const f = e.data?.form ?? /OSC-F-\d+/i.exec(e.subject)?.[0] ?? e.subject;
  return f.trim().toUpperCase();
}

function field(e: AuditEntry, name: string): string | undefined {
  const d = e.data;
  if (!d) return undefined;
  if (name in d) return d[name];
  const k = Object.keys(d).find((x) => x.toLowerCase() === name.toLowerCase());
  return k ? d[k] : undefined;
}

function fieldValues(e: AuditEntry): string[] {
  return Object.entries(e.data ?? {})
    .filter(([k]) => k !== 'form')
    .map(([, v]) => v);
}

/** A window.open / doc.read that actually displayed a document; returns its docNo. */
export function displayedDocNo(e: AuditEntry): string | null {
  if (e.kind === 'doc.read') return e.subject.trim().toUpperCase();
  if (e.kind === 'window.open' && !REFUSED.test(e.detail) && /\bopened\b/.test(e.detail)) return e.subject.trim().toUpperCase();
  return null;
}

export function isAccessRefusal(e: AuditEntry): boolean {
  return e.kind === 'window.open' && REFUSED.test(e.detail) && !NOT_FOUND.test(e.detail);
}

function recipients(e: AuditEntry): string[] {
  const raw = [e.data?.to, e.data?.cc, e.data?.bcc].filter(Boolean).join(',') || `${e.subject} ${e.detail}`;
  return (raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g) ?? []).map((r) => r.toLowerCase());
}

function matches(t: Trigger, e: AuditEntry, s: NarrativeState): boolean {
  switch (t.type) {
    case 'doc.read': {
      const doc = displayedDocNo(e);
      if (!doc) return false;
      const want = t.docNos.map((d) => d.toUpperCase());
      if (!want.includes(doc)) return false;
      return t.mode === 'all' ? want.every((d) => s.reads.includes(d)) : true;
    }
    case 'search':
      return e.kind === 'search' && re(t.pattern).test(e.subject);
    case 'terminal.cmd':
      return e.kind === 'terminal.cmd' && re(t.pattern).test(e.subject.trim());
    case 'transit.watch':
      return e.kind === 'transit.watch' && (e.data?.event ?? e.subject).toUpperCase().includes(t.event.toUpperCase());
    case 'form.submit': {
      if (e.kind !== 'form.submit' || formOf(e) !== t.form.toUpperCase()) return false;
      return Object.entries(t.match).every(([name, pattern]) => {
        const rx = re(pattern);
        if (name === 'anyField') return fieldValues(e).some((v) => rx.test(v));
        const v = field(e, name);
        return v !== undefined && rx.test(v.trim());
      });
    }
    case 'anyOf':
      return t.of.some((x) => matches(x, e, s));
    case 'state':
      return false;
  }
}

function stateMet(t: Trigger, s: NarrativeState): boolean {
  if (t.type !== 'state') return false;
  const n = Number(/>=\s*(\d+)/.exec(t.condition)?.[1] ?? Infinity);
  return EARNABLE.filter((c) => s.compartments.includes(c)).length >= n;
}

function requiresMet(step: Step, s: NarrativeState): boolean {
  if (!step.requires.every((r) => s.steps.includes(r))) return false;
  if (step.requiresAny?.length && !step.requiresAny.some((r) => s.steps.includes(r))) return false;
  return true;
}

function ruleMentionsStep(rule: MailRule, step: string): boolean {
  if (rule.type === 'step') return rule.step === step;
  if (rule.type === 'firstOf') return rule.of.some((r) => ruleMentionsStep(r, step));
  return false;
}

function afterMinutes(rule: MailRule): number | null {
  if (rule.type === 'after') return rule.minutes;
  if (rule.type === 'firstOf') {
    const m = rule.of.map(afterMinutes).filter((x): x is number => x !== null);
    return m.length ? Math.min(...m) : null;
  }
  return null;
}

function auditMail(rule: string): MailItem | undefined {
  return plan.mailQueue.find((m) => m.rule.type === 'audit' && m.rule.audit === rule);
}

/* ------------------------------------------------------------- reducer */

class Run {
  effects: Effect[] = [];
  constructor(
    public s: NarrativeState,
    public ctx: Ctx,
    /** Wall-clock ms of the event being processed (delivery moment). */
    public now: number,
  ) {}

  /**
   * Deliver now. Triggered (non-login) mail always carries `{date}` = the
   * in-world session date at the moment of delivery, so "today" in a body
   * resolves to the date the taskbar shows; rule slots override it.
   */
  deliver(id: string, extra: Omit<Extract<Effect, { type: 'mail' }>, 'type' | 'id'> = {}): void {
    if (!extra.repeat) {
      if (this.s.mail.includes(id)) return;
      this.s.mail.push(id);
    } else if (!this.s.mail.includes(id)) this.s.mail.push(id);
    this.s.pending = this.s.pending.filter((p) => p.id !== id);
    const out = extra.silent ? extra : { ...extra, slots: { date: dateSlot(this.now), ...extra.slots } };
    this.effects.push({ type: 'mail', id, ...out });
  }

  /** Queue an audit-rule message with its plan delay; slots captured now. */
  schedule(rule: string, slots?: Record<string, string>): void {
    const item = auditMail(rule);
    if (!item || item.rule.type !== 'audit') return;
    if (this.s.mail.includes(item.id) || this.s.pending.some((p) => p.id === item.id)) return;
    const delay = uniformMs(this.s, item.rule.delayMinutes);
    if (delay <= 0) {
      this.deliver(item.id, slots ? { slots } : {});
      return;
    }
    this.s.pending.push({ id: item.id, dueActive: this.s.activeMs + delay, ...(slots ? { slots } : {}) });
  }

  fireOnce(rule: string): boolean {
    if (this.s.fired.includes(rule)) return false;
    this.s.fired.push(rule);
    return true;
  }

  complete(step: Step): void {
    this.s.steps.push(step.id);
    const g = step.grant;
    if (g.kind === 'flag') this.effects.push({ type: 'flag', name: g.value });
    else if (g.kind === 'compartment') {
      if (!this.s.compartments.includes(g.value)) this.s.compartments.push(g.value);
      this.effects.push({ type: 'grant', key: g.value as CompartmentId, reason: GRANT_REASON[g.value] ?? 'Read-in under OSC-DIR-0412.' });
    } else {
      this.s.acting = true;
      this.effects.push({ type: 'grant', key: 'ACTING-T2', reason: GRANT_REASON['ACTING-T2']! });
    }
    for (const m of plan.mailQueue) if (ruleMentionsStep(m.rule, step.id)) this.deliver(m.id);
  }

  steps(e: AuditEntry | null): void {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const step of plan.steps) {
        if (this.s.steps.includes(step.id) || !requiresMet(step, this.s)) continue;
        const hit = step.trigger.type === 'state' ? stateMet(step.trigger, this.s) : e !== null && matches(step.trigger, e, this.s);
        if (hit) {
          this.complete(step);
          progressed = true;
        }
      }
    }
  }

  startSession(now: number): void {
    if (this.s.rng === 0) this.s.rng = (Math.floor(now) ^ 0x5eed1147) | 0 || 1;
    const delay = uniformMs(this.s, SEG04_DELAY_MIN);
    this.s.session = {
      startedAt: now,
      locked: false,
      searches: 0,
      hovers: 0,
      hoverDocs: {},
      firstHoverAt: null,
      refusals: 0,
      transitWins: [],
      seg04: { fireAt: now + delay, startedAt: null, watched: false, withdrawn: false },
    };
    this.s.lastTick = now;
    for (const m of plan.mailQueue) if (m.rule.type === 'login') this.deliver(m.id, { silent: true, ...(m.read ? { read: true } : {}) });
  }

  audit(e: AuditEntry, now: number, newSession: boolean): void {
    const s = this.s;
    switch (e.kind) {
      case 'login':
        if (!s.session || newSession) this.startSession(now);
        else {
          s.session.locked = false;
          s.lastTick = now;
        }
        return;
      case 'timeout':
        if (s.session) s.session.locked = true;
        return;
      case 'logout':
        s.session = null;
        return;
      case 'window.close':
        if (s.session && TRANSIT_WINDOW.test(e.detail)) {
          const w = (s.session.transitWins ??= []);
          const i = w.lastIndexOf(e.subject);
          w.splice(i >= 0 ? i : w.length - 1, 1);
        }
        return;
      case 'system':
      case 'clearance.grant':
      case 'mail.read':
        return;
      default:
        break;
    }

    if (s.session && e.kind === 'window.open' && !REFUSED.test(e.detail) && TRANSIT_WINDOW.test(e.detail)) {
      (s.session.transitWins ??= []).push(e.subject);
    }

    const doc = displayedDocNo(e);
    if (doc && !s.reads.includes(doc)) s.reads.push(doc);

    this.steps(e);
    this.consequences(e, now, doc);
  }

  consequences(e: AuditEntry, now: number, doc: string | null): void {
    const s = this.s;
    const sess = s.session;
    const ref = auditRef(now, e.seq);
    const time = timeSlot(now);

    // A1: first display of the scanned inventory.
    if (doc === SCAN_DOCNO && this.fireOnce('A1')) {
      this.schedule('A1', { workstation: WORKSTATION, docNo: SCAN_DOCNO, time, auditRef: ref });
    }

    // A2: second query of interest in a session.
    if (e.kind === 'search' && sess && isQueryOfInterest(e.subject)) {
      sess.searches += 1;
      if (sess.searches >= 2 && this.fireOnce('A2')) {
        this.schedule('A2', { date: dateSlot(now), time, query: e.subject.trim(), count: String(sess.searches), auditRef: ref });
      }
    }

    // A3: sustained examination of withholding marks.
    if (e.kind === 'redaction.hover' && sess) {
      sess.hovers += 1;
      sess.firstHoverAt ??= now;
      const d = e.subject.trim();
      sess.hoverDocs[d] = (sess.hoverDocs[d] ?? 0) + 1;
      if (sess.hovers >= A3_THRESHOLD && this.fireOnce('A3')) {
        const most = Object.entries(sess.hoverDocs).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];
        this.schedule('A3', { firstTime: timeSlot(sess.firstHoverAt), time, count: String(sess.hovers), docNo: most, auditRef: ref });
      }
    }

    // A4: the board was displayed during the movement.
    if (e.kind === 'transit.watch' && (e.data?.event ?? e.subject).toUpperCase().includes('SEG04')) {
      if (sess) sess.seg04.watched = true;
      if (this.fireOnce('A4')) {
        const from = Number(e.data?.start) || sess?.seg04.startedAt || now;
        const to = Number(e.data?.end) || now;
        this.schedule('A4', { time: timeSlot(from), view: e.data?.view ?? 'schematic', duration: durationSlot((to - from) / 1000), auditRef: ref });
      }
    }

    // A5: reproduction of compartmented or higher material.
    if (e.kind === 'print' || (e.kind === 'form.submit' && formOf(e) === 'OSC-F-142')) {
      const target = e.kind === 'print' ? this.ranked(e.subject.trim().toUpperCase(), 2) : this.eyesOnlyIn(fieldValues(e));
      if (target && this.fireOnce('A5')) {
        this.effects.push({ type: 'flag', name: 'oiaReviewedPrints' });
        this.schedule('A5', { pq: e.data?.pq ?? `PQ-${String(e.seq).padStart(5, '0')}`, docNo: target, time, auditRef: ref });
      }
    }

    // A6: terminal lookups against an item under inquiry or a central category.
    if (e.kind === 'terminal.cmd' && A6_PATTERN.test(e.subject.trim()) && this.fireOnce('A6')) {
      this.schedule('A6', { time, command: e.subject.trim(), auditRef: ref });
    }

    // A7 / A8: outgoing mail.
    if (e.kind === 'mail.send') {
      const to = recipients(e);
      for (const r of to) if (isUndeliverable(r)) this.deliver(auditMail('A7')!.id, { slots: { recipient: r }, repeat: true });
      const body = [e.data?.subject, e.data?.body, e.subject, e.detail].filter(Boolean).join('\n');
      if (to.some((r) => r.endsWith(A8_DOMAIN)) && A8_PATTERN.test(body) && this.fireOnce('A8')) this.schedule('A8');
    }

    // A9: repeated access refusals.
    if (isAccessRefusal(e) && sess) {
      sess.refusals += 1;
      if (sess.refusals === A9_REFUSALS) {
        this.effects.push({ type: 'notify', text: 'Repeated refusals are recorded (DIR-0412 para 8).', from: 'Classification Control' });
        this.effects.push({
          type: 'audit',
          subject: 'Classification Control',
          detail: `Operator ${this.ctx.operatorId} WS ${WORKSTATION}: ${A9_REFUSALS} access refusals this session. Recorded under OSC-DIR-0412 para 8.`,
        });
      }
    }

    // A10: transfer request by a probationer.
    if (e.kind === 'form.submit' && formOf(e) === 'OSC-F-122') {
      this.effects.push({
        type: 'notify',
        text: 'OSC-F-122 returned without action. Transfer applications are not accepted from operators in a probationary period (OSC-DIR-0247).',
        from: 'Personnel Accounting',
      });
      this.effects.push({
        type: 'audit',
        subject: 'OSC-F-122',
        detail: `OSC-F-122 from operator ${this.ctx.operatorId} WS ${WORKSTATION} returned without action: probationary period, OSC-DIR-0247.`,
      });
    }
  }

  ranked(docNo: string, minRank: number): string | null {
    const m = this.ctx.markingOf(docNo);
    return m && MARKING_RANK[m] >= minRank ? docNo : null;
  }

  eyesOnlyIn(values: string[]): string | null {
    for (const v of values) {
      for (const tok of v.match(/[A-Z0-9]+(?:-[A-Z0-9]+)+/gi) ?? []) {
        const d = tok.toUpperCase();
        if (this.ctx.markingOf(d) === 'UMBRA-EO') return d;
      }
    }
    return null;
  }

  tick(now: number, boardOpen = false): void {
    const s = this.s;
    const sess = s.session;
    if (sess && !sess.locked && s.lastTick !== null) s.activeMs += Math.min(Math.max(now - s.lastTick, 0), TICK_CAP_MS);
    s.lastTick = now;

    for (const m of plan.mailQueue) {
      const min = afterMinutes(m.rule);
      if (min !== null && sess && s.activeMs >= min * MIN) this.deliver(m.id);
    }
    for (const p of [...s.pending]) {
      if (s.activeMs >= p.dueActive) this.deliver(p.id, p.slots ? { slots: p.slots } : {});
    }

    if (!sess) return;
    const g = sess.seg04;
    const open = boardOpen || (sess.transitWins?.length ?? 0) > 0;
    if (g.startedAt === null && !sess.locked && now >= g.fireAt && (open || now >= g.fireAt + SEG04_UNWATCHED_AFTER_MS)) g.startedAt = now;
    if (g.startedAt !== null && !g.withdrawn && now >= g.startedAt + SEG04_DURATION_MS + SEG04_LOG_HOLD_MS) {
      g.withdrawn = true;
      this.effects.push({
        type: 'audit',
        subject: 'Transit Control',
        detail: `Board indication record for interval ${zuluOf(g.startedAt)} to ${zuluOf(g.startedAt + SEG04_DURATION_MS)} withdrawn by Transit Control on instruction.`,
      });
    }
  }

  sync(compartments: string[], acting: boolean): void {
    for (const c of compartments) if (!this.s.compartments.includes(c)) this.s.compartments.push(c);
    if (acting) this.s.acting = true;
    this.steps(null);
  }
}

export function reduce(state: NarrativeState, ev: NarrativeEvent, ctx: Ctx): { state: NarrativeState; effects: Effect[] } {
  const run = new Run(clone(state), ctx, ev.type === 'sync' ? (ev.now ?? state.lastTick ?? 0) : ev.now);
  if (ev.type === 'tick') run.tick(ev.now, !!ev.boardOpen);
  else if (ev.type === 'sync') run.sync(ev.compartments, ev.acting);
  else run.audit(ev.entry, ev.now, !!ev.newSession);
  return { state: run.s, effects: run.effects };
}

/** The movement window to publish to Transit Control, if any, at `now`. */
export function seg04Window(s: NarrativeState, now: number): { start: number; end: number } | null {
  const st = s.session?.seg04.startedAt;
  if (st === null || st === undefined) return null;
  if (now >= st + SEG04_DURATION_MS + SEG04_LOG_HOLD_MS) return null;
  return { start: st, end: st + SEG04_DURATION_MS };
}

/**
 * In-world refusals a form can show before routing (pure; for the Forms app).
 * Returns null when the form may be routed.
 */
export function formRefusal(formNo: string, fields: Record<string, string>): string | null {
  const f = formNo.toUpperCase();
  if (f === 'OSC-F-122') return 'Not accepted. Transfer applications are not accepted from operators in a probationary period (OSC-DIR-0247).';
  if (f === 'OSC-F-126') {
    const c = (fields.compartment ?? '').trim().toUpperCase();
    if (['HOLLOW', 'TALLOW', 'BRIAR', 'QUARRY'].includes(c)) return 'Not approvable on request. Read-in under DIR-0412 para 4(c)-(e) only.';
  }
  return null;
}
