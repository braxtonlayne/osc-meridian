/**
 * Shared plant state key `isolation` (owner: isolate app). The core type is
 * `IsolationState` in src/core/contracts.ts; this app stores a superset of it under
 * the same key, so readers that only know IsolationState keep working.
 *
 * Readers: use `isolatedAt(state, now)` from @shell/isolation rather than `active`
 * alone. A timed isolation (clearsAt set) ends at clearsAt even if no isolate panel
 * was open to write `active: false`.
 */
import type { AccountId, IsolationState } from '@core/contracts';

export type IsolationLevel = IsolationState['level'];

/** One manual initiation (the core shape plus the panel's own fields). */
export interface Initiation {
  at: string; // in-world ISO
  by: AccountId;
  ref: string; // "NI-080519-01"
  /** Level reached by this initiation (1..5). */
  level?: number;
  /** Operator id of the initiating account, as printed on its card. */
  operatorId?: string;
  /** Wall-clock ms of the initiation (clearsAt is computed from it). */
  ms?: number;
}

export type RestorationStatus = 'pending' | 'approved' | 'returned' | 'automatic';

/** A Circuit Restoration Certificate, or an automatic restoration after line checks. */
export interface Restoration {
  cert: string; // "RC-080519-01", or "" for an automatic restoration
  /** Initiation the restoration answers. */
  ref: string;
  level: number;
  raisedBy: AccountId | 'system';
  raisedAt: string; // in-world ISO
  statement?: string;
  status: RestorationStatus;
  decidedBy?: AccountId | 'system';
  decidedAt?: string;
  note?: string;
  /** Trace id of the routed certificate (form.routed to deputy). */
  trace?: string;
}

/** Numbered tamper seal on the guard cover (fitted on restoration from level 3). */
export interface TamperSeal {
  no: string;
  fittedAt: string;
  broken: boolean;
  brokenAt?: string;
  brokenBy?: AccountId;
}

export interface IsolateState extends IsolationState {
  initiations: Initiation[];
  restorations?: Restoration[];
  seal?: TamperSeal | null;
  /** Level 5: control withdrawn from service; isolation held; no certificate accepted. */
  withdrawn?: boolean;
}
