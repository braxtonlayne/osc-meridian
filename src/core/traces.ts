/**
 * Cross-account traces (pass two, docs/SPEC-2.md §1): an append-only list in the
 * shared store under key `traces`. Any account posts; the addressee sees it on its
 * next sign-in, or at once if signed in (in this or another tab).
 *
 * Arrival, per account: each trace addressed to this account (or `all`) is
 * "arrived" once. On arrival the shell logs audit kind `trace` in the security
 * office's phrasing, and a `mail.deliver` trace is delivered through
 * services.mail.deliver and marked seen. Other kinds stay unseen until the app that
 * consumes them (Forms action queue, Mail, Assurance) calls markSeen.
 * The per-account record of arrived ids is persisted as `traces:arrived`.
 */
import { computed } from '@preact/signals';
import type { ReadonlySignal } from '@preact/signals';
import type { AccountDef, AccountId, AuditKind, MailDeliverOptions, SharedStore, Trace } from './contracts';

export const TRACES_KEY = 'traces';

export type TraceInput = Omit<Trace, 'id' | 'at' | 'from' | 'seenBy'>;

export interface TracesApi {
  post(t: TraceInput): Trace;
  all: ReadonlySignal<Trace[]>;
  mine: ReadonlySignal<Trace[]>;
  markSeen(id: string): void;
}

export function traceId(seq: number): string {
  return `TR-${String(seq).padStart(4, '0')}`;
}

function seqOf(id: string): number {
  const n = Number(/^TR-(\d+)$/.exec(id)?.[1]);
  return Number.isFinite(n) ? n : 0;
}

export function addressedTo(t: Trace, me: AccountId): boolean {
  return t.to === me || t.to === 'all';
}

/** Trace kinds Message Traffic shows as delivered messages (src/apps/mail/traces.ts). */
export const MAIL_TRACE_KINDS: readonly Trace['kind'][] = ['mail', 'finding', 'form.decided', 'notice'];

/**
 * A trace Message Traffic shows as a message. A restoration certificate decision (form.decided from
 * the isolation panel) is not: its outcome reaches the raiser as the panel's own certificate message.
 */
export function isMessageTrace(t: Pick<Trace, 'kind' | 'data'>): boolean {
  return MAIL_TRACE_KINDS.includes(t.kind) && !(t.kind === 'form.decided' && t.data?.app === 'isolate');
}

/** Traces this account receives as messages: addressed here (or to all), not posted by itself. */
export function inboundMailTraces(mine: readonly Trace[], me: AccountId): Trace[] {
  return mine.filter((t) => isMessageTrace(t) && t.from !== me && addressedTo(t, me));
}

/** In-world message number the transfer system gives a trace: "MSG-08-80007" (series 8xxxx). */
export function traceMsgNo(t: Pick<Trace, 'id' | 'at'>): string {
  const seq = Number(/(\d+)$/.exec(t.id)?.[1] ?? 0);
  const yy = /^\d{2}(\d{2})/.exec(t.at)?.[1] ?? '08';
  return `MSG-${yy}-${String(80000 + (seq % 20000)).padStart(5, '0')}`;
}

/** Subject line of a message trace as Message Traffic shows it (toasts use the same words). */
export function traceSubject(t: Trace): string {
  const d = t.data ?? {};
  switch (t.kind) {
    case 'mail':
      return d.subject || t.subject;
    case 'finding':
      return `Finding ${d.ref ?? t.subject}`;
    case 'form.decided':
      return `Decision on ${d.receipt ?? t.subject}`;
    default:
      return t.subject;
  }
}

/**
 * Cross-site message traffic sent while the network was isolated carries `data.queued` = the
 * isolation reference. The message centre holds it until that isolation clears: it is not
 * delivered (not in `mine`) while `holdRef` (the reference of the isolation now in force, or
 * null) still names it.
 */
export function heldInQueue(t: Pick<Trace, 'data'>, holdRef: string | null): boolean {
  const q = t.data?.queued;
  return q !== undefined && holdRef !== null && q === holdRef;
}

export function createTraces(store: SharedStore, me: () => AccountId, nowIso: () => string, holdRef: () => string | null = () => null): TracesApi {
  const all = store.get<Trace[]>(TRACES_KEY, []);
  const mine = computed(() => {
    const id = me();
    const hold = holdRef();
    return all.value.filter((t) => addressedTo(t, id) && !heldInQueue(t, hold));
  });
  return {
    all,
    mine,
    post(input) {
      let stored: Trace | null = null;
      store.update<Trace[]>(TRACES_KEY, [], (prev) => {
        const seq = prev.reduce((m, t) => Math.max(m, seqOf(t.id)), 0) + 1;
        stored = { ...input, id: traceId(seq), at: nowIso(), from: me() };
        return [...prev, stored];
      });
      return stored!;
    },
    markSeen(id) {
      const who = me();
      store.update<Trace[]>(TRACES_KEY, [], (prev) =>
        prev.map((t) => (t.id === id && !(t.seenBy ?? []).includes(who) ? { ...t, seenBy: [...(t.seenBy ?? []), who] } : t)),
      );
    },
  };
}

/* --------------------------------------------------------------- arrival */

/** "Routed item TR-0007 received from operator 2-0412 (Deputy Commander, ALPHA-02). ..." */
export function arrivalDetail(t: Trace, from: AccountDef | undefined, opShort: string): string {
  // Queue decisions travel in the OIA compartment registry's name; the applicant is not told who certified.
  const viaRegistry = t.kind === 'form.decided' && t.data?.app !== 'isolate';
  const who = viaRegistry ? 'the OIA compartment registry' : from ? `operator ${opShort} (${from.roleTitle})` : `operator account ${t.from}`;
  const head = `Routed item ${t.id} received from ${who}.`;
  switch (t.kind) {
    case 'form.routed':
      return `${head} Form ${t.subject} entered in the action queue of this operator.`;
    case 'form.decided':
      return `${head} Decision on ${t.data?.receipt ?? t.subject} returned to this operator.`;
    case 'mail':
    case 'mail.deliver':
      return `${head} Message traffic entered in the mailbox of this operator.`;
    case 'finding':
      return `${head} Office of Internal Assurance finding ${t.data?.ref ?? t.subject} recorded against this operator.`;
    case 'notice':
      return `${head} Notice recorded at this workstation.`;
  }
}

export interface ArrivalContext {
  me: AccountId;
  arrived: Set<string>;
  accountById(id: AccountId): AccountDef | undefined;
  opShort(def: AccountDef): string;
  log(kind: AuditKind, subject: string, detail: string, data: Record<string, string>): void;
  deliver(msgId: string, opts?: MailDeliverOptions): void;
  markSeen(id: string): void;
  /** Sign-in batch: deliver without toast or sound. */
  silent: boolean;
  /** A message trace (mail, finding, decision, notice) arrived live: toast it (optional). */
  announce?(t: Trace): void;
}

/**
 * Process every trace in `mine` this account has not yet received. Mutates
 * `ctx.arrived`; returns the newly arrived traces (oldest first).
 */
export function processArrivals(mine: readonly Trace[], ctx: ArrivalContext): Trace[] {
  const fresh: Trace[] = [];
  for (const t of mine) {
    if (ctx.arrived.has(t.id) || !addressedTo(t, ctx.me)) continue;
    ctx.arrived.add(t.id);
    // A trace this account posted to `all` is not news to it.
    if (t.from === ctx.me) continue;
    fresh.push(t);
    const from = ctx.accountById(t.from);
    const data: Record<string, string> = { trace: t.id, kind: t.kind, from: t.from, subject: t.subject };
    if (t.msgId) data.msgId = t.msgId;
    ctx.log('trace', t.id, arrivalDetail(t, from, from ? ctx.opShort(from) : t.from), data);
    if (t.kind === 'mail.deliver' && t.msgId) {
      // The trace's data travels as the message's slots ({date}, {bay}, ...).
      const slots = t.data && Object.keys(t.data).length ? { ...t.data } : undefined;
      if (!(t.seenBy ?? []).includes(ctx.me)) ctx.deliver(t.msgId, { ...(ctx.silent ? { silent: true } : {}), ...(slots ? { slots } : {}) });
      ctx.markSeen(t.id);
    } else if (!ctx.silent && isMessageTrace(t)) ctx.announce?.(t);
  }
  return fresh;
}
