/**
 * MERIDIAN audit trail. Every recorded action is phrased the way the Office of
 * Internal Assurance writes it, persisted locally (IndexedDB), and published to
 * subscribers (the narrative layer listens here for consequences).
 */
import { signal } from '@preact/signals';
import type { ReadonlySignal } from '@preact/signals';
import type { AuditEntry, AuditKind } from './contracts';
import { load, save } from './persist';
import { inWorldIso, operatorId } from './session';

/** Workstation identifier printed in audit entries for this terminal. */
export const WORKSTATION_ID = 'A03-5-114';
export const MAX_ENTRIES = 2000;

const _entries = signal<AuditEntry[]>([]);
export const entries: ReadonlySignal<AuditEntry[]> = _entries;
const subscribers = new Set<(e: AuditEntry) => void>();
let seq = 0;
let ready = false;
const pending: AuditEntry[] = [];

function phrase(kind: AuditKind, subject: string): string {
  const op = `Operator ${operatorId.peek()}`;
  switch (kind) {
    case 'window.open':
      return `${op} opened ${subject}.`;
    case 'window.close':
      return `${op} closed ${subject}.`;
    case 'doc.read':
      return `${op} displayed document ${subject}. Display recorded against the operator's access determination.`;
    case 'search':
      return `${op} queried the MERIDIAN index for "${subject}".`;
    case 'redaction.hover':
      return `${op} examined withheld material in ${subject}. Withholding notice was displayed; no release was made.`;
    case 'print':
      return `${op} sent ${subject} to print queue PRN-${WORKSTATION_ID.slice(0, 6)}. Cover sheet and distribution stamp applied. Operator is accountable for the printed copy.`;
    case 'form.submit':
      return `${op} submitted ${subject} for routing.`;
    case 'mail.read':
      return `${op} opened message ${subject}.`;
    case 'mail.send':
      return `${op} dispatched message ${subject}.`;
    case 'terminal.cmd':
      return `${op} entered command at terminal session: ${subject}`;
    case 'transit.watch':
      return `${op} had Transit Control displayed during movement ${subject}.`;
    case 'clearance.grant':
      return `Access ${subject} recorded against ${op.toLowerCase()} following briefing.`;
    case 'login':
      return `${op} authenticated at workstation ${WORKSTATION_ID}. Token present in reader 0.`;
    case 'logout':
      return `${op} logged off workstation ${WORKSTATION_ID}.`;
    case 'timeout':
      return `Session for ${op.toLowerCase()} locked by the workstation after ten minutes without input. Open work was retained.`;
    case 'system':
      return `${subject}.`;
    default:
      return `${op}: ${subject}.`;
  }
}

export function log(kind: AuditKind, subject: string, detail?: string, data?: Record<string, string>): AuditEntry {
  const e: AuditEntry = {
    seq: ++seq,
    at: inWorldIso(),
    kind,
    subject,
    detail: detail ?? phrase(kind, subject),
  };
  if (data) e.data = data;
  if (!ready) {
    pending.push(e);
  } else {
    commit(e);
  }
  return e;
}

function commit(e: AuditEntry): void {
  const next = _entries.peek().concat(e);
  _entries.value = next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
  save('audit', _entries.peek(), 400);
  for (const fn of subscribers) {
    try {
      fn(e);
    } catch (err) {
      console.error(err);
    }
  }
}

export function subscribe(fn: (e: AuditEntry) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** Load the persisted trail. Entries logged before this resolves are appended after it. */
export async function initAudit(): Promise<void> {
  const stored = await load<AuditEntry[]>('audit', []);
  seq = stored.reduce((m, e) => Math.max(m, e.seq), 0);
  _entries.value = stored;
  ready = true;
  const queued = pending.splice(0);
  for (const e of queued) {
    e.seq = ++seq;
    commit(e);
  }
}
