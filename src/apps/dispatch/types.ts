/**
 * Shared plant state key `dispatch` (owner: dispatch app). Readers import these types with
 * `import type` only. The array is `DispatchedTrain[]` (src/core/contracts.ts) with the extra
 * fields below; every extra field is the dispatch app's own and other apps may ignore it.
 *
 * Run position is not stored: it is computed from the record, the clock and plant state by
 * `runState` in src/sim/transit-model.ts (the same function the transit worker uses), so
 * every account and tab sees the same train in the same place.
 */
import type { AccountId, DispatchedTrain } from '@core/contracts';

export type DispatchSystem = 'RAIL' | 'TRAM';

/** A hold that has applied to this train: network isolation, a seal drill, or the dispatcher. */
export interface DispatchHold {
  /** Isolation initiation ref, drill id, or "MAN-<n>" for a dispatcher's hold. */
  ref: string;
  kind: 'isolation' | 'drill' | 'manual';
  /** Wall-clock ms the hold was ordered. */
  at: number;
}

export interface DispatchRecord extends DispatchedTrain {
  /** Dispatch log number, e.g. "DSP-A02-0519-003". */
  ref: string;
  /** Consist identity as entered at the desk. Shown as the suppressed label when `instruction` is set. */
  consist: string;
  system: DispatchSystem;
  /** Link key per leg ("02", "ALPHA-05>GAMMA-08"), parallel to consecutive `route` nodes. */
  links: string[];
  /** Dwell at each intermediate platform, ms. */
  dwellMs: number;
  /** Run clock: `elapsed` ms of the run had been made at wall time `at`; it runs on from there unless held. */
  clock: { at: number; elapsed: number };
  /** Holds latched by the desk (isolation and drill holds are also derived live from plant state). */
  holds: DispatchHold[];
  /** Hold refs the dispatcher has released this train from. */
  released: string[];
  /** Notices already sent for this train (idempotency), e.g. "iso:<ref>". */
  notified: string[];
  /** Where a cancelled train stands. */
  endNode?: string;
  /** Movement entered under a Transit Control instruction: consist identity suppressed on every board. */
  instruction?: string;
  /** Indication record withdrawn by Transit Control (instruction movements, after arrival). */
  withdrawn?: boolean;
  /** Training simulator only: run time compression. Never set on live records. */
  timeScale?: number;
  /** Account that entered it (same as `by`; kept for the dispatch log). */
  desk?: string;
}

/** Value of shared key `dispatch`. */
export type DispatchState = DispatchRecord[];

export type { AccountId };
