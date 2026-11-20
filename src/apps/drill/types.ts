/**
 * Shared plant state written by the Seal Drill Coordinator (owner: drill app). Every other app
 * reads these with `import type` only.
 *
 * ## Key `drill`: `DrillState | null` (contracts.ts), stored as `DrillStateExt`
 *
 * `null` (or absent) = no drill has been ordered from the coordinator. A drill stays in the key
 * after it ends (phase 'stand-down' or 'aborted') until the next one is ordered.
 *
 * Times are wall-clock ms. The drill runs compressed: one drill minute = `msPerMin` wall ms
 * (60 000 / canon sealDrill.timeScale = 2 000 ms). Seal times come from canon sealDrill
 * (class acknowledge / door cycle / report sealed, counted from the site's receipt).
 *
 * Per site (`sites[facilityId]`, every non-DELTA facility, DELTA never appears):
 * - `ordered`: when the site receives the order (relay time; in the future for sites not yet reached).
 * - `acknowledged`: when the site acknowledged, or null. Door closing starts at this moment.
 *   It CAN be earlier than `ordered` at one site; do not clamp or reorder it.
 * - `sealed`: when the site reported sealed, or null.
 * - `status`:
 *   - 'pending'       not acknowledged yet (whether or not the order has reached it)
 *   - 'acknowledged'  acknowledged, seal deferred: the site is NOT closing its doors
 *   - 'sealing'       acknowledged, seal doors cycling or checks in hand (treat doors as closing)
 *   - 'sealed'        reported sealed (doors closed and dogged)
 *   - 'no-report'     not sealed by twice its class seal time: state unknown to Network Control.
 *                     Doors at such a site may be open or closed; treat as unknown.
 *
 * Phase:
 * - 'propagating'  order going out / sites sealing
 * - 'sealed'       every site is 'sealed' or 'no-report'; the network is held sealed
 * - 'stand-down'   drill over, sites reopen from `endedAt` (Network Control after `holdMin`, or the deputy)
 * - 'aborted'      drill cancelled at `endedAt`; sites that were sealing reopen, pending sites never close
 * Per-site statuses are frozen at `endedAt` once the phase is 'stand-down' or 'aborted'.
 *
 * Freshness: the coordinator writes the key whenever a status changes, while its window is
 * open in any tab of any account (`tickedAt` = last evaluation). If `Date.now() - tickedAt` is
 * more than a few seconds during 'propagating' or 'sealed', no coordinator is open: derive a
 * site's status at `now` from `plan` (drill minutes from `orderedAt`) with the same rules:
 *   t = (now - orderedAt) / msPerMin
 *   if plan.ack != null and t >= plan.ack:
 *       if plan.sealed != null and t >= plan.sealed            -> 'sealed'
 *       else if t >= plan.deadline                             -> 'no-report'
 *       else if plan.doorsDone == null                         -> 'acknowledged'
 *       else                                                   -> 'sealing'
 *   else if t >= plan.deadline                                 -> 'no-report'
 *   else                                                       -> 'pending'
 * (`model.ts` `siteStatusAt` is that function; readers keep their import type-only and copy it.)
 *
 * Isolation: while `isolation` is active, the order does not pass the hub circuits. Sites the
 * order has not reached and that are not on ALPHA-01's own tram network are marked `cut` and
 * end 'no-report'.
 *
 * ## Key `drill-register`: `DrillRecord[]` (oldest first, capped)
 *
 * One record per network drill ordered from the coordinator, written when it is ordered and
 * updated when it ends. The coordinator's earlier history (site drills) is canon
 * (`canon.apps.drill.history`), not in this key.
 */
import type { AccountId, DrillState } from '@core/contracts';
import type { DrillClassId, FacilityId, NetworkId } from '@core/canon-types';

export type SiteStatus = DrillState['sites'][string]['status'];
export type DrillPhase = DrillState['phase'];

/** Why a site's timing differs from its class timing (each from a canon fact). */
export type SiteCause =
  | 'single-duty-officer' // staff breakdown carries one duty officer: acknowledges late
  | 'unpracticed' // completed recently, never drilled: door cycle slower
  | 'acceptance' // seal acceptance not entered: doors cycle, no seal report
  | 'calendar' // a calendar entry in session defers the seal
  | 'order-wire' // acknowledgement carried on an order wire, not the relay circuit
  | 'attended' // an issued operator account holds the site order position: the order waits for their ACK, standby watch answers late
  | 'cut'; // order not passed: hub circuits down (isolation)

/** One site's timing, in drill minutes from the order. */
export interface SitePlan {
  facility: FacilityId;
  cls: DrillClassId;
  network: NetworkId | null;
  via: FacilityId | null;
  relay: 'origin' | 'rail' | 'tram' | 'voice';
  hop: number;
  /** Receipt of the order. */
  receipt: number;
  /** Acknowledgement (null: never acknowledges). */
  ack: number | null;
  /** Seal doors closed (null: doors not closed for the drill). */
  doorsDone: number | null;
  /** Reported sealed (null: no seal report). */
  sealed: number | null;
  /** NO REPORT after this (receipt + 2 x class seal time). */
  deadline: number;
  /** Class seal time from receipt; a site sealed after receipt + sealMin is late. */
  sealMin: number;
  causes: SiteCause[];
  /** Circuit the order arrived on, as written in the message log. */
  circuit: string;
  /** Circuit the acknowledgement came back on (differs only for an order-wire site). */
  ackCircuit: string;
  /** Acknowledged / reported by an operator at the site's own workstation (wall ms). */
  manualAck?: number;
  manualSealed?: number;
}

export interface DrillStateExt extends DrillState {
  v: 1;
  /** Wall ms per drill minute. */
  msPerMin: number;
  /** Drill-minute plan per site (see header). */
  plan: Record<string, SitePlan>;
  /** Last evaluation by a coordinator (wall ms). */
  tickedAt: number;
  /** When the phase became 'sealed' (wall ms), null before. */
  sealedAt: number | null;
  /** Hub circuits were down when ordered. */
  isolatedAtOrder: boolean;
  /** OIA observer recorded against the drill. */
  observer: AccountId | null;
  /** Who ended it: the deputy, or Network Control after the hold. */
  endedBy: AccountId | 'network-control' | null;
  /** Second officer named at the order position (two-person rule). */
  secondOfficer: string;
}

export interface DrillRecord {
  id: string;
  orderedAt: number;
  by: AccountId;
  secondOfficer: string;
  observer: AccountId | null;
  phase: DrillPhase;
  endedAt: number | null;
  endedBy: AccountId | 'network-control' | null;
  sites: number;
  sealed: number;
  late: string[];
  noReport: string[];
  /** Acknowledgements received before the site's receipt of the order. */
  outOfSequence: string[];
  isolated: boolean;
  /** Messages already sent for this drill (idempotency across tabs). */
  mailed: { report?: boolean; noReport?: boolean; oia?: boolean };
}

export const DRILL_KEY = 'drill';
export const REGISTER_KEY = 'drill-register';
