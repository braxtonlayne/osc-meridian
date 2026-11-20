/**
 * Forms Center local records: receipts issued to this profile and saved drafts.
 * Held in the workstation profile (persist key "forms"), shared by every Forms window.
 */
import { signal } from '@preact/signals';
import { load, save } from '@core/persist';
import type { Disposition, Values } from './model';

export interface StoredReceipt {
  /** null when the form was returned without a receipt number. */
  receiptNo: string | null;
  formNo: string;
  title: string;
  route: string;
  /** "19 MAY 2008 1430Z (1030 EDT)" */
  enteredAt: string;
  disposition: Disposition;
  /** Disposition text (refusal message or the receiving office's acknowledgement). */
  message: string;
  /** Further notes printed on the receipt (approval, counter hours, responses). */
  notes: string[];
  routing: string[];
  /** Entries as submitted: [ref, label, value]. */
  entries: [string, string, string][];
  /** Pass two: ids of the `form.routed` traces posted to approving accounts. */
  routed?: string[];
}

export interface Draft {
  values: Values;
  savedAt: string;
}

interface FormsStore {
  receipts: StoredReceipt[];
  drafts: Record<string, Draft>;
}

export const receipts = signal<StoredReceipt[]>([]);
export const drafts = signal<Record<string, Draft>>({});
let loaded: Promise<void> | null = null;

export function loadStore(): Promise<void> {
  loaded ??= load<FormsStore>('forms', { receipts: [], drafts: {} }).then((s) => {
    receipts.value = Array.isArray(s?.receipts) ? s.receipts : [];
    drafts.value = s?.drafts && typeof s.drafts === 'object' ? s.drafts : {};
  });
  return loaded;
}

function persist(): void {
  save('forms', { receipts: receipts.peek(), drafts: drafts.peek() });
}

export function addReceipt(r: StoredReceipt): void {
  receipts.value = [r, ...receipts.peek()];
  persist();
}

export function updateReceipt(match: (r: StoredReceipt) => boolean, patch: Partial<StoredReceipt>): void {
  receipts.value = receipts.peek().map((r) => (match(r) ? { ...r, ...patch } : r));
  persist();
}

export function saveDraft(id: string, d: Draft): void {
  drafts.value = { ...drafts.peek(), [id]: d };
  persist();
}

export function dropDraft(id: string): void {
  if (!(id in drafts.peek())) return;
  const next = { ...drafts.peek() };
  delete next[id];
  drafts.value = next;
  persist();
}

/** Receipts drawn on a form so far (for the next serial). */
export function countFor(formNo: string): number {
  return receipts.peek().filter((r) => r.formNo === formNo).length;
}
