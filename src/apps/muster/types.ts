/**
 * Shared plant state key `muster` (owner: muster app; everyone else reads with `import type`).
 *
 * The board stores only what operators did. Badge reads are not stored: every tab derives them
 * from the run's start time with the deterministic model in model.ts, so every account and every
 * open window sees the same reads at the same moment. Drill-driven musters are derived from the
 * shared `drill` key and appear here only once an operator has acted on them (sweep, close-out).
 */
import type { AccountId } from '@core/contracts';

export interface MusterSweep {
  id: string; // "SW-A02-3"
  point: string; // assembly point id, "A02-MP3"
  by: AccountId;
  /** Wall-clock ms the team was sent. */
  at: number;
}

export interface MusterCloseout {
  ref: string; // the run id, printed on the report
  by: AccountId;
  /** Wall-clock ms of signature. */
  at: number;
  assigned: number;
  present: number;
  located: number;
  roster: number;
  unaccounted: number;
  visitors: number;
  /** Badges read that resolve to no posted person. */
  unknown: number;
  /** Discrepancy lines as printed on the close-out report (empty = reconciled). */
  discrepancies: string[];
}

export interface MusterRun {
  id: string; // "MU-A02-0519-01", or "<drill id>/<site>" for a drill muster
  site: string; // FacilityId
  /** Wall-clock ms of the muster alarm (for a drill: the site's acknowledgement). */
  startedAt: number;
  by: AccountId | 'drill';
  drillId: string | null;
  sweeps: MusterSweep[];
  closeout: MusterCloseout | null;
  /** Consequences already sent for this run ("unaccounted", "closeout"), so none repeats. */
  notices: string[];
}

export interface MusterState {
  runs: MusterRun[];
  /** Serial for operator-initiated runs. */
  seq: number;
}

export const MUSTER_NONE: MusterState = { runs: [], seq: 0 };
