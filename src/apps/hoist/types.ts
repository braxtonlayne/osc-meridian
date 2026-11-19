/**
 * Shared plant state key `hoist` (owner: Shaft Hoist Control). Other apps (CCTV, for the
 * collar-landing cameras) read it with a type-only import:
 *
 *   import type { HoistState } from '@apps/hoist/types';
 *   const hoist = services.shared.get<HoistState | null>('hoist', null);
 *
 * Positions are depths in feet below grade (larger = deeper). A cage in motion is described
 * by its `motion` record, not by repeated writes: every tab computes the position at any time
 * with `cageAt(unit, hoist, now)` from `src/apps/hoist/model.ts` (pure, no DOM). A unit missing
 * from `units` is parked at its default landing (`defaultUnit`).
 */
import type { AccountId } from '@core/contracts';

export type HoistMode = 'auto' | 'manual' | 'inspection';

/** A run between two depths on the drive's speed profile (accelerate, cruise, slow to creep, creep). */
export interface RunMotion {
  kind: 'run';
  fromFt: number;
  toFt: number;
  /** Landing the run ends at, or null when it ends at a travel limit (inching). */
  toLevel: number | null;
  /** Wall-clock ms the cage starts to move (may be in the future while gates close). */
  startedAt: number;
  vFtps: number;
  aFtps2: number;
  creepFtps: number;
  creepFt: number;
  by: AccountId | 'auto';
}

/** A stop from speed: controlled (drive), emergency (brake) or at a limit. */
export interface StopMotion {
  kind: 'stop';
  fromFt: number;
  /** Signed rope speed at the moment of the stop, ft/s (+ = down). */
  v0: number;
  startedAt: number;
  decel: number;
  cause: 'stop' | 'estop';
  by: AccountId;
}

export type Motion = RunMotion | StopMotion;

export interface HoistTrip {
  cause: 'estop' | 'overtravel';
  /** Wall-clock ms. */
  at: number;
  by: AccountId;
  /** Wall-clock ms the winder house returns the hoist to service, or null (panel reset only). */
  returnAt: number | null;
}

export interface HoistUnit {
  id: string; // canon hoist id, "A02-H1"
  /** Cage floor depth at rest, or at the start of `motion`. */
  posFt: number;
  motion: Motion | null;
  mode: HoistMode;
  gates: 'open' | 'closed';
  persons: number;
  freightLb: number;
  /** Registered landing calls (level numbers), oldest first. */
  calls: number[];
  trip: HoistTrip | null;
  /** Last brake test: wall ms, in-world date label ("19 MAY 2008"), result line. */
  brakeTest: { at: number; date: string; by: AccountId; result: string } | null;
  /** Brake test in progress: ends at `until` (wall ms). */
  brakeTesting: { until: number; by: AccountId } | null;
  /** AUTO mode: gates held open at the landing until this wall ms. */
  dwellUntil: number | null;
}

/** One line of the hoist event recorder (shared; every account sees the same record). */
export interface HoistEvent {
  seq: number;
  /** Wall-clock ms. */
  at: number;
  hoist: string;
  kind:
    | 'call' | 'run' | 'arrive' | 'stop' | 'estop' | 'reset' | 'return' | 'mode' | 'gates'
    | 'load' | 'brake' | 'overload' | 'limit' | 'inch';
  text: string;
  by: AccountId | 'auto' | 'local';
}

export interface HoistState {
  v: 1;
  seq: number;
  units: Record<string, HoistUnit>;
  /** Newest last, capped at canon `apps.hoist.model.recorderEvents`. */
  events: HoistEvent[];
}
