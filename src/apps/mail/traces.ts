/**
 * Message Traffic and cross-account traces (pass two, docs/SPEC-2.md §1).
 *
 * Traffic between issued accounts travels as traces in the shared store (services.traces), not as
 * content messages. Consumed here:
 *   mail          data { subject, body, to, cc?, fromAddress, precedence?, marking?, inReplyTo?, attachments? }
 *   finding       data { ref, text, category?, basis?, _by?, _byRole? }   (Office of Internal Assurance)
 *   form.decided  data per src/apps/forms/routing.ts (receipt, decision, note, form, _title, grant?)
 *   notice        data { text }
 * Produced here: one `mail` trace per other account addressed in To or Cc.
 * Pure functions only (unit-tested in traces.test.ts).
 */
import type { AccountDef, AccountId, Trace } from '@core/contracts';
import { closeWorldText } from '@core/closed-world';
import type { MarkingId } from '@core/canon-types';
import { isMessageTrace, traceMsgNo } from '@core/traces';
import { decisionLine } from '@apps/forms/routing';
import { dtgFromIso, normPrecedence, type Outgoing, type Precedence } from './model';

export type MailTraceKind = 'mail' | 'finding' | 'form.decided' | 'notice';
const MAIL_KINDS: readonly string[] = ['mail', 'finding', 'form.decided', 'notice'];

export function isMailTrace(t: Pick<Trace, 'kind'>): t is Trace & { kind: MailTraceKind } {
  return MAIL_KINDS.includes(t.kind);
}

/** Traces this account receives as messages: addressed here (or to all) and not posted by itself. */
export function inboundMailTraces(mine: readonly Trace[], me: AccountId): Trace[] {
  return mine.filter((t) => isMailTrace(t) && isMessageTrace(t) && t.from !== me && (t.to === me || t.to === 'all'));
}

/** In-world message number the transfer system gives a trace: "MSG-08-80007" (series 8xxxx); core counts unread with it too. */
export { traceMsgNo };

/** The OIA compartment registry's mailbox (content/mail/accounts/msg-08-04341). */
export const REGISTRY_ADDRESS = 'registry@a01.oia.mer';

const list = (v: string | undefined) => (v ? v.split(/[;,]/).map((x) => x.trim()).filter(Boolean) : []);

export interface TraceMessage {
  docNo: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  sent: string; // DTG
  sortKey: string;
  precedence: Precedence;
  marking: MarkingId;
  text: string;
  inReplyTo: string | null;
  attachments: string[];
  /** Originating office line for the message header. */
  originator: string;
}

export interface TraceCtx {
  me: AccountDef;
  accountById(id: AccountId): AccountDef | undefined;
  isMarking(id: string): boolean;
  lowest: MarkingId;
}

/**
 * Header and body of a trace rendered as a delivered message. A Tier 4 recipient reads it with no
 * other facility named (closed world, SPEC-2 §1): originator, subject and body pass through
 * closeWorldText.
 */
export function traceMessage(t: Trace, ctx: TraceCtx): TraceMessage {
  const m = traceMessageRaw(t, ctx);
  if (ctx.me.tier !== 4) return m;
  const home = ctx.me.site;
  return { ...m, originator: closeWorldText(m.originator, home), subject: closeWorldText(m.subject, home), text: closeWorldText(m.text, home) };
}

function traceMessageRaw(t: Trace, ctx: TraceCtx): TraceMessage {
  const d = t.data ?? {};
  const sender = ctx.accountById(t.from);
  const senderBox = sender?.email ?? `${t.from}@mts.mer`;
  const toSelf = t.to === 'all' ? [ctx.me.email] : [ctx.accountById(t.to)?.email ?? ctx.me.email];
  const marking = (d.marking && ctx.isMarking(d.marking) ? d.marking : ctx.lowest) as MarkingId;
  const base = {
    docNo: traceMsgNo(t),
    sent: dtgFromIso(t.at),
    sortKey: t.at.slice(0, 16),
    marking,
    inReplyTo: null as string | null,
    attachments: [] as string[],
    originator: sender ? `${sender.divisionId}/${sender.site}` : 'MTS',
  };
  switch (t.kind) {
    case 'mail':
      return {
        ...base,
        from: d.fromAddress || senderBox,
        to: list(d.to).length ? list(d.to) : toSelf,
        cc: list(d.cc),
        subject: d.subject || t.subject || '(no subject)',
        precedence: normPrecedence(d.precedence),
        text: d.body ?? '',
        inReplyTo: d.inReplyTo || null,
        attachments: list(d.attachments),
      };
    case 'finding': {
      const ref = d.ref || t.subject;
      const by = d._byRole || sender?.roleTitle || 'Office of Internal Assurance';
      const text = [
        `OFFICE OF INTERNAL ASSURANCE. FINDING ${ref}.`,
        `Recorded against operator ${ctx.me.operatorId} (${ctx.me.roleTitle}), workstation audit trail.`,
        d.category ? `Category: ${d.category}.` : '',
        d.basis ? `Basis: ${d.basis}` : '',
        d.text ?? '',
        `Issued by ${by}${d._by ? ` (${d._by})` : ''}. The finding is held on the operator's assurance record. Representations may be made in writing to the Office of Internal Assurance${ctx.me.tier === 4 ? '' : ', ALPHA-01'} (OSC-ASR-PSEC).`,
      ]
        .filter(Boolean)
        .join('\n\n');
      return { ...base, from: senderBox, to: toSelf, cc: [], subject: `Internal Assurance finding ${ref}${t.subject && t.subject !== ref ? `: ${t.subject}` : ''}`, precedence: 'PRIORITY', text };
    }
    case 'form.decided': {
      const receipt = d.receipt || t.subject;
      // Forms routed through the action queue are certified for the OIA compartment registry, and the
      // decision is written to the applicant in the registry's name (msg-08-04341 para 3-4); the
      // applicant is not told who certified. Restoration certificates (app: isolate) are signed for.
      const viaRegistry = d.app !== 'isolate';
      const text = [
        `Your ${d.form || 'form'}${d._title ? ` ${d._title}` : ''}, receipt ${receipt}, has been decided.`,
        decisionLine(t),
        d.decision === 'approved' ? 'The receipt held at your workstation has been endorsed with the decision.' : 'The form is returned. A fresh request may be made on a new form if circumstances change.',
        viaRegistry ? `Compartment Registry, Office of Internal Assurance${ctx.me.tier === 4 ? '' : ', ALPHA-01'}. Queries to this registry only.` : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      return {
        ...base,
        ...(viaRegistry ? { originator: ctx.me.tier === 4 ? 'OIA' : 'OIA/ALPHA-01' } : {}),
        from: viaRegistry ? REGISTRY_ADDRESS : senderBox,
        to: toSelf,
        cc: [],
        subject: `Decision on ${receipt}`,
        precedence: 'ROUTINE',
        text,
      };
    }
    default:
      return { ...base, from: senderBox, to: toSelf, cc: [], subject: t.subject || 'Notice', precedence: 'ROUTINE', text: d.text ?? t.subject };
  }
}

/** One `mail` trace per other account addressed in To or Cc (deduped; own mailbox skipped). */
export function outgoingTraces(
  m: Outgoing,
  me: AccountDef,
  byEmail: (e: string) => AccountDef | undefined,
): Omit<Trace, 'id' | 'at' | 'from' | 'seenBy'>[] {
  const seen = new Set<AccountId>();
  const out: Omit<Trace, 'id' | 'at' | 'from' | 'seenBy'>[] = [];
  const subject = m.subject.replace(/\s+/g, ' ').trim() || '(no subject)';
  for (const a of [...m.to, ...m.cc]) {
    const acct = byEmail(a);
    if (!acct || acct.id === me.id || seen.has(acct.id)) continue;
    seen.add(acct.id);
    const data: Record<string, string> = {
      subject,
      body: m.text.replace(/\r\n/g, '\n'),
      to: m.to.join(','),
      fromAddress: me.email,
      precedence: m.precedence,
      marking: m.marking,
    };
    if (m.cc.length) data.cc = m.cc.join(',');
    if (m.inReplyTo) data.inReplyTo = m.inReplyTo;
    if (m.attachments.length) data.attachments = m.attachments.join(',');
    out.push({ kind: 'mail', to: acct.id, subject, data });
  }
  return out;
}
