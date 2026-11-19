/**
 * Forms routing between accounts (pass two, docs/SPEC-2.md §1 "Cross-account traces").
 *
 * A form filed by one account whose number is in another account's `approves` list is posted
 * to that account as a `form.routed` trace; the approver's decision comes back as a
 * `form.decided` trace. Pure helpers here (unit-tested); the Forms app and Message Traffic
 * consume them. Trace data shapes (all values strings):
 *
 *   form.routed   subject = receipt no.
 *                 data = { ...form fields, form, _title, _route, _entered, _entries (JSON
 *                          [ref, label, value][]), _filer (operator id), _filerRole, _filerPn }
 *   form.decided  subject = receipt no.
 *                 data = { receipt, decision: 'approved' | 'denied', note, form, _title,
 *                          routed (form.routed trace id), _decidedBy (operator id),
 *                          _decidedRole, grant? (compartment granted on approval) }
 */
import type { AccountDef, AccountId, Trace } from '@core/contracts';

/** Compartments read in on request (classification guide OSC-ASR-CG para 4.3; F-126 "The compartments"). */
export const APPROVABLE_ON_REQUEST: readonly string[] = ['KESTREL', 'SEXTANT'];

export const META = {
  title: '_title',
  route: '_route',
  entered: '_entered',
  entries: '_entries',
  filer: '_filer',
  filerRole: '_filerRole',
  filerPn: '_filerPn',
  decidedBy: '_decidedBy',
  decidedRole: '_decidedRole',
} as const;

const SERIAL_BLOCK: Record<AccountId, number> = { analyst: 0, lifesupport: 300, deputy: 600, auditor: 900 };

/**
 * Receipt serial offset per account, so receipts issued to different profiles at this
 * workstation never share a number (the analyst's serials are unchanged from pass one).
 */
export function serialOffset(id: AccountId): number {
  return SERIAL_BLOCK[id] ?? 0;
}

/** Field values of a routed form as the filler expects them (multi-choice fields back to lists). */
export function unflatten(fields: Record<string, string>, multi: ReadonlySet<string>): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = multi.has(k) ? v.split('; ').filter(Boolean) : v;
  return out;
}

/** Accounts other than `from` with approval authority for `formNo`. */
export function approversFor(formNo: string, from: AccountId, accounts: readonly AccountDef[]): AccountDef[] {
  const f = formNo.trim().toUpperCase();
  return accounts.filter((a) => a.id !== from && a.approves.some((x) => x.toUpperCase() === f));
}

export interface RoutedInput {
  formNo: string;
  title: string;
  route: string;
  receiptNo: string;
  enteredAt: string;
  fields: Record<string, string>;
  entries: [string, string, string][];
  filer: Pick<AccountDef, 'operatorId' | 'roleTitle' | 'pn'>;
}

/** Trace payload (without id/at/from) for one approver. */
export function routedTrace(input: RoutedInput, to: AccountId): Omit<Trace, 'id' | 'at' | 'from' | 'seenBy'> {
  return {
    kind: 'form.routed',
    to,
    subject: input.receiptNo,
    data: {
      ...input.fields,
      form: input.formNo,
      [META.title]: input.title,
      [META.route]: input.route,
      [META.entered]: input.enteredAt,
      [META.entries]: JSON.stringify(input.entries),
      [META.filer]: input.filer.operatorId,
      [META.filerRole]: input.filer.roleTitle,
      [META.filerPn]: input.filer.pn,
    },
  };
}

/** Form fields of a routed trace (meta keys and `form` removed). */
export function routedFields(t: Pick<Trace, 'data'>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t.data ?? {})) if (!k.startsWith('_') && k !== 'form') out[k] = v;
  return out;
}

export function routedEntries(t: Pick<Trace, 'data'>): [string, string, string][] {
  try {
    const v = JSON.parse(t.data?.[META.entries] ?? '[]') as unknown;
    return Array.isArray(v) ? (v.filter((e) => Array.isArray(e) && e.length === 3).map((e) => (e as unknown[]).map(String)) as [string, string, string][]) : [];
  } catch {
    return [];
  }
}

export type Decision = 'approved' | 'denied';

/**
 * Compartment an approval reads the filer into, or null. Only F-126 for a compartment designated
 * approvable on request; never a Tier 1 key, never ACTING-T2 (certification is a separate act).
 */
export function grantFor(routed: Pick<Trace, 'data'>, decision: Decision): string | null {
  if (decision !== 'approved') return null;
  if ((routed.data?.form ?? '').toUpperCase() !== 'OSC-F-126') return null;
  const c = (routed.data?.compartment ?? '').trim().toUpperCase();
  return APPROVABLE_ON_REQUEST.includes(c) ? c : null;
}

export interface DecidedInput {
  routed: Trace;
  decision: Decision;
  note: string;
  approver: Pick<AccountDef, 'operatorId' | 'roleTitle'>;
}

export function decidedTrace(d: DecidedInput): Omit<Trace, 'id' | 'at' | 'from' | 'seenBy'> {
  const grant = grantFor(d.routed, d.decision);
  return {
    kind: 'form.decided',
    to: d.routed.from,
    subject: d.routed.subject,
    data: {
      receipt: d.routed.subject,
      decision: d.decision,
      note: d.note.trim(),
      form: d.routed.data?.form ?? '',
      [META.title]: d.routed.data?.[META.title] ?? '',
      routed: d.routed.id,
      [META.decidedBy]: d.approver.operatorId,
      [META.decidedRole]: d.approver.roleTitle,
      ...(grant ? { grant } : {}),
    },
  };
}

/** The decision returned on a routed trace, if any (latest wins). */
export function decisionFor(routedId: string, all: readonly Trace[]): Trace | undefined {
  let found: Trace | undefined;
  for (const t of all) if (t.kind === 'form.decided' && t.data?.routed === routedId) found = t;
  return found;
}

/** Decisions returned to `me` on a receipt number (latest wins). */
export function decisionOnReceipt(receiptNo: string, me: AccountId, all: readonly Trace[]): Trace | undefined {
  let found: Trace | undefined;
  for (const t of all) if (t.kind === 'form.decided' && t.to === me && t.data?.receipt === receiptNo) found = t;
  return found;
}

export type QueueState = 'pending' | 'approved' | 'denied';

export interface QueueItem {
  routed: Trace;
  state: QueueState;
  decided?: Trace;
}

/** Action queue for `me`: forms routed here, newest first, with their decision state. */
export function actionQueue(me: AccountId, all: readonly Trace[]): QueueItem[] {
  return all
    .filter((t) => t.kind === 'form.routed' && t.to === me)
    .map((routed) => {
      const decided = decisionFor(routed.id, all);
      const d = decided?.data?.decision;
      return { routed, decided, state: d === 'approved' || d === 'denied' ? d : 'pending' } as QueueItem;
    })
    .reverse();
}

/** Disposition line shown on the filer's receipt once a decision is back. */
export function decisionLine(t: Trace): string {
  const d = t.data ?? {};
  const who = d[META.decidedRole] || 'the approving officer';
  const verb = d.decision === 'approved' ? 'Approved' : 'Not approved';
  const note = d.note ? ` Remarks: ${d.note}` : '';
  const grant = d.grant ? ` Read-in to ${d.grant} under OSC-DIR-0412 para 4(b) is recorded on the next sign-in of the applicant.` : '';
  return `${verb} by ${who}.${note}${grant}`;
}
