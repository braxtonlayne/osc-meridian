/**
 * Shared plant state key `strike` (owner: strike app; docs/CONTRACTS.md "Shared plant state").
 * The PM-3 scenario register: every estimate an operator entered, in any account. Readers
 * import this file as a type only.
 */
import type { AccountId } from '@core/contracts';

/** One register entry. Append-only: entries are withdrawn or queried, never deleted. */
export interface StrikeScenario {
  /** Register number, "PM3-08-0007". */
  id: string;
  account: AccountId;
  /** Operator id of the account that made the entry ("OPR-A03-1147"). */
  operatorId: string;
  /** Point of the event (decimal degrees). */
  lat: number;
  lon: number;
  /** How the point was given: "24 MI S OF LEXINGTON KY", "MAP 37.6932N 84.5037W", "ALPHA-03". */
  anchor: string;
  /** Yield step from canon survivability.yieldsKt. */
  kt: number;
  /** In-world ISO time of entry. */
  at: string;
  /** Summary at entry time (so a reviewer sees what the operator saw). */
  summary: {
    /** Sites evaluated (position held at the operator's workstation). */
    evaluated: number;
    /** Sites inside the outermost contour. */
    affected: number;
    /** Worst condition word among evaluated sites, or null if none affected. */
    worst: string | null;
    /** Sites whose condition is the worst one, comma separated. */
    worstSites: string;
  };
  /** Operator's own remark (free text, optional). */
  remark?: string;
  /** Set when the originator withdraws the entry. */
  withdrawn?: { at: string };
  /** Set when the Office of Internal Assurance raises a review query on the entry. */
  query?: { at: string; by: AccountId; ref: string };
}

export interface StrikeState {
  /** Last register serial issued. */
  seq: number;
  scenarios: StrikeScenario[];
}

export const STRIKE_KEY = 'strike';
export const STRIKE_EMPTY: StrikeState = { seq: 0, scenarios: [] };
