/**
 * Per-account narrative (pass two): login mail and the triggered queue for the lifesupport,
 * deputy and auditor accounts (docs/narrative-2/accounts.md). The analyst keeps the pass-one
 * engine (rules.ts / runtime.ts) unchanged.
 *
 * Data-driven: ACCOUNT_SPECS below copies each message's `arrival` from its frontmatter in
 * content/mail/accounts/ (a unit test fails if they drift). The reducer is pure: time and the
 * world (shared plant state, traces, other accounts' audit trails) arrive on the event.
 *
 * Rule shapes (`arrival`):
 *   login                                   delivered silently at each sign-in (once)
 *   after { minutes }                       unlocked signed-in time on this account (pass-one rule)
 *   firstOf { of }                          whichever comes first
 *   trace { kind: 'form.route', form, from } a form.routed trace from `from` with data.form = `form`
 *                                           in this account's traces (the approvals queue)
 *   trace { kind: 'doc.read', docNo, from } account `from` has displayed `docNo` (its audit trail,
 *                                           read across accounts on this workstation)
 *   docRead { docNo }                       this account displays `docNo` (doc.read / window.open)
 *   app { app: 'doors', on: 'open', door }  this account commands door `door` open (control doors:open)
 *   app { app: 'assurance', on: 'auditReview', account }  this account reads `account`'s audit trail
 *   plant { key: 'drill', when: 'active' }  shared key drill is propagating or sealed
 *   mailTo { pattern, from }                this account sends mail to an address matching `pattern` (* = any)
 * Every triggered (non-login) delivery carries slots.date = the in-world date (pass-one rule).
 */
import type { AccountId, AuditEntry } from '@core/contracts';
import { dateSlot } from './format';
import { displayedDocNo } from './rules';

export type AcctRule =
  | { type: 'login' }
  | { type: 'after'; minutes: number }
  | { type: 'firstOf'; of: AcctRule[] }
  | { type: 'trace'; kind: 'form.route'; form: string; from: AccountId; first?: boolean }
  | { type: 'trace'; kind: 'doc.read'; docNo: string; from: AccountId }
  | { type: 'docRead'; docNo: string }
  | { type: 'app'; app: 'doors'; on: 'open'; door: string }
  | { type: 'app'; app: 'assurance'; on: 'auditReview'; account: AccountId }
  | { type: 'plant'; key: 'drill'; when: 'active' }
  | { type: 'mailTo'; pattern: string; from?: AccountId };

export interface AcctMail {
  id: string;
  arrival: AcctRule;
  /** Message frontmatter `slots` (triggered mail: [date]). */
  slots?: string[];
}

export type NarrativeAccount = Exclude<AccountId, 'analyst'>;

/** Per-account queues, in delivery order (copied from content/mail/accounts frontmatter). */
export const ACCOUNT_SPECS: Record<NarrativeAccount, AcctMail[]> = {
  lifesupport: [
    { id: 'msg-08-04446', arrival: { type: 'login' } },
    { id: 'msg-08-04423', arrival: { type: 'login' } },
    { id: 'msg-08-04404', arrival: { type: 'login' } },
    { id: 'msg-08-04371', arrival: { type: 'login' } },
    { id: 'msg-08-06105', arrival: { type: 'firstOf', of: [{ type: 'plant', key: 'drill', when: 'active' }, { type: 'after', minutes: 12 }] }, slots: ['date'] },
    { id: 'msg-08-06106', arrival: { type: 'firstOf', of: [{ type: 'app', app: 'doors', on: 'open', door: 'G08-BD3' }, { type: 'after', minutes: 30 }] }, slots: ['date'] },
  ],
  deputy: [
    { id: 'msg-08-04463', arrival: { type: 'login' } },
    { id: 'msg-08-04427', arrival: { type: 'login' } },
    { id: 'msg-08-04466', arrival: { type: 'login' } },
    { id: 'msg-08-04398', arrival: { type: 'login' } },
    { id: 'msg-08-04341', arrival: { type: 'login' } },
    { id: 'msg-08-06206', arrival: { type: 'trace', kind: 'form.route', form: 'OSC-F-126', from: 'analyst', first: true }, slots: ['date'] },
    { id: 'msg-08-06207', arrival: { type: 'firstOf', of: [{ type: 'docRead', docNo: 'OSC-TRN-POS-08-044' }, { type: 'after', minutes: 20 }] }, slots: ['date'] },
    { id: 'msg-08-06208', arrival: { type: 'firstOf', of: [{ type: 'trace', kind: 'doc.read', docNo: 'OSC-MEM-08-0187', from: 'auditor' }, { type: 'after', minutes: 40 }] }, slots: ['date'] },
    { id: 'msg-08-06209', arrival: { type: 'after', minutes: 50 }, slots: ['date'] },
  ],
  auditor: [
    { id: 'msg-08-04468', arrival: { type: 'login' } },
    { id: 'msg-08-04401', arrival: { type: 'login' } },
    { id: 'msg-08-04411', arrival: { type: 'login' } },
    { id: 'msg-08-04356', arrival: { type: 'login' } },
    { id: 'msg-08-04477', arrival: { type: 'login' } },
    { id: 'msg-08-06306', arrival: { type: 'firstOf', of: [{ type: 'app', app: 'assurance', on: 'auditReview', account: 'analyst' }, { type: 'after', minutes: 15 }] }, slots: ['date'] },
    { id: 'msg-08-06307', arrival: { type: 'firstOf', of: [{ type: 'docRead', docNo: 'OIA-08-031' }, { type: 'docRead', docNo: 'OSC-2008-Q2' }, { type: 'after', minutes: 30 }] }, slots: ['date'] },
    { id: 'msg-08-06308', arrival: { type: 'firstOf', of: [{ type: 'mailTo', pattern: '*@a01.pv.mer', from: 'auditor' }, { type: 'after', minutes: 45 }] }, slots: ['date'] },
  ],
};

export function isNarrativeAccount(id: AccountId): id is NarrativeAccount {
  return id in ACCOUNT_SPECS;
}

/* ------------------------------------------------------------------ state */

export interface AcctState {
  v: 1;
  account: AccountId;
  /** Messages delivered by this queue (once-only bookkeeping). */
  mail: string[];
  /** Unlocked, signed-in time accumulated across sessions (ms). */
  activeMs: number;
  lastTick: number | null;
  session: { locked: boolean } | null;
}

export function initialAcctState(account: AccountId): AcctState {
  return { v: 1, account, mail: [], activeMs: 0, lastTick: null, session: null };
}

/** Accept a persisted value if it is this account's queue state; otherwise start fresh. */
export function reviveAcctState(raw: unknown, account: AccountId): AcctState {
  const base = initialAcctState(account);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AcctState>;
  if (r.v !== 1 || r.account !== account) return base;
  return {
    ...base,
    mail: Array.isArray(r.mail) ? r.mail.filter((x): x is string => typeof x === 'string') : [],
    activeMs: typeof r.activeMs === 'number' && Number.isFinite(r.activeMs) ? r.activeMs : 0,
    lastTick: typeof r.lastTick === 'number' ? r.lastTick : null,
    session: r.session && typeof r.session === 'object' ? { locked: !!r.session.locked } : null,
  };
}

/* ----------------------------------------------------------------- events */

/** What the runtime observed of the world at the moment of a tick. */
export interface AcctWorld {
  /** Shared key `drill` is propagating or sealed. */
  drillActive: boolean;
  /** Traces addressed to this account (or all), any state. */
  traces: readonly { kind: string; from: AccountId; data?: Record<string, string> }[];
  /** DocNos (upper case) other accounts have displayed, by account (their audit trails). */
  crossReads: Partial<Record<AccountId, readonly string[]>>;
}

export type AcctEvent =
  | { type: 'audit'; entry: AuditEntry; now: number; newSession?: boolean }
  | { type: 'tick'; now: number; world: AcctWorld };

export interface AcctMailEffect {
  type: 'mail';
  id: string;
  slots?: Record<string, string>;
  silent?: boolean;
}

/** Longest gap between ticks that still counts as active time (same as pass one). */
export const ACCT_TICK_CAP_MS = 30_000;
const MIN = 60_000;

function afterMinutes(r: AcctRule): number | null {
  if (r.type === 'after') return r.minutes;
  if (r.type === 'firstOf') {
    const m = r.of.map(afterMinutes).filter((x): x is number => x !== null);
    return m.length ? Math.min(...m) : null;
  }
  return null;
}

/** `*@a01.pv.mer` style match (only `*` is special), case-insensitive. */
export function addressMatches(pattern: string, address: string): boolean {
  const rx = new RegExp(`^${pattern.trim().toLowerCase().split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return rx.test(address.trim().toLowerCase());
}

function recipients(e: AuditEntry): string[] {
  const raw = [e.data?.to, e.data?.cc, e.data?.bcc].filter(Boolean).join(',');
  return (raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g) ?? []).map((r) => r.toLowerCase());
}

/** Does this audit entry (of the account itself) satisfy rule `r`? */
function auditHit(r: AcctRule, e: AuditEntry): boolean {
  switch (r.type) {
    case 'firstOf':
      return r.of.some((x) => auditHit(x, e));
    case 'docRead': {
      const doc = displayedDocNo(e);
      return !!doc && doc === r.docNo.toUpperCase();
    }
    case 'app':
      if (e.kind !== 'control') return false;
      if (r.app === 'doors') return e.subject === 'doors:open' && (e.data?.door ?? '').toUpperCase() === r.door.toUpperCase() && (e.data?.cmd ?? 'open') === 'open';
      return e.subject === 'assurance:review' && e.data?.operator === r.account;
    case 'mailTo':
      return e.kind === 'mail.send' && recipients(e).some((a) => addressMatches(r.pattern, a));
    default:
      return false;
  }
}

/** Does the world (and active time) satisfy rule `r` at this tick? */
function worldHit(r: AcctRule, w: AcctWorld, activeMs: number): boolean {
  switch (r.type) {
    case 'firstOf':
      return r.of.some((x) => worldHit(x, w, activeMs));
    case 'after':
      return activeMs >= r.minutes * MIN;
    case 'plant':
      return r.key === 'drill' && w.drillActive;
    case 'trace':
      if (r.kind === 'form.route') return w.traces.some((t) => t.kind === 'form.routed' && t.from === r.from && (t.data?.form ?? '').toUpperCase() === r.form.toUpperCase());
      return (w.crossReads[r.from] ?? []).includes(r.docNo.toUpperCase());
    default:
      return false;
  }
}

/** Accounts whose audit trails a spec's rules read (the runtime polls only these). */
export function crossReadAccounts(spec: readonly AcctMail[]): AccountId[] {
  const out = new Set<AccountId>();
  const walk = (r: AcctRule) => {
    if (r.type === 'firstOf') r.of.forEach(walk);
    else if (r.type === 'trace' && r.kind === 'doc.read') out.add(r.from);
  };
  spec.forEach((m) => walk(m.arrival));
  return [...out];
}

/** DocNos (upper case) an audit trail shows displayed. */
export function displayedDocNos(entries: readonly AuditEntry[]): string[] {
  const out = new Set<string>();
  for (const e of entries) {
    const d = displayedDocNo(e);
    if (d) out.add(d);
  }
  return [...out];
}

/**
 * The per-account reducer. Pure: returns the next state and the mail to deliver.
 * Triggered mail is delivered only while signed in and unlocked.
 */
export function reduceAccount(state: AcctState, spec: readonly AcctMail[], ev: AcctEvent): { state: AcctState; effects: AcctMailEffect[] } {
  const s: AcctState = { ...state, mail: [...state.mail], session: state.session ? { ...state.session } : null };
  const effects: AcctMailEffect[] = [];
  const deliver = (m: AcctMail, now: number, silent = false) => {
    if (s.mail.includes(m.id)) return;
    s.mail.push(m.id);
    effects.push(silent ? { type: 'mail', id: m.id, silent: true } : { type: 'mail', id: m.id, slots: { date: dateSlot(now) } });
  };
  const live = () => !!s.session && !s.session.locked;

  if (ev.type === 'audit') {
    const e = ev.entry;
    switch (e.kind) {
      case 'login':
        if (!s.session || ev.newSession) {
          s.session = { locked: false };
          for (const m of spec) if (m.arrival.type === 'login') deliver(m, ev.now, true);
        } else s.session.locked = false;
        s.lastTick = ev.now;
        return { state: s, effects };
      case 'timeout':
        if (s.session) s.session.locked = true;
        return { state: s, effects };
      case 'logout':
        s.session = null;
        return { state: s, effects };
      default:
        break;
    }
    if (!live()) return { state: s, effects };
    for (const m of spec) if (m.arrival.type !== 'login' && auditHit(m.arrival, e)) deliver(m, ev.now);
    return { state: s, effects };
  }

  // tick
  if (live() && s.lastTick !== null) s.activeMs += Math.min(Math.max(ev.now - s.lastTick, 0), ACCT_TICK_CAP_MS);
  s.lastTick = ev.now;
  if (!live()) return { state: s, effects };
  for (const m of spec) {
    if (m.arrival.type === 'login' || s.mail.includes(m.id)) continue;
    if (worldHit(m.arrival, ev.world, s.activeMs)) deliver(m, ev.now);
  }
  return { state: s, effects };
}

/** Minutes of active time until the earliest timed fallback still pending (null if none). Test helper. */
export function nextFallbackMin(state: AcctState, spec: readonly AcctMail[]): number | null {
  const left = spec.filter((m) => !state.mail.includes(m.id)).map((m) => afterMinutes(m.arrival)).filter((x): x is number => x !== null);
  return left.length ? Math.min(...left) : null;
}
