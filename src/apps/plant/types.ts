/**
 * Shared plant state key `plant` (owner: plant app; docs/CONTRACTS.md "Shared plant state").
 * Other apps may read it with `import type { PlantShared } from '@apps/plant/types'` and
 * `services.shared.get<PlantShared>('plant', PLANT_SHARED_NONE)`; only the plant app writes it.
 *
 * Live plant status is never stored here: it comes from canon and the telemetry worker.
 * This key holds the training simulator (one state per installation, plus the generic
 * part-task trainer) and the network-wide simulator trip history.
 */
import type { AccountId } from '@core/contracts';
import type { AnnPoint } from '@graphics/panel';

export type SimMode = 'SHUTDOWN' | 'STARTUP' | 'RUN';
export type BankId = 'SD' | 'CB';
export type DieselSelect = 'AUTO' | 'RUN' | 'STOP';

/** Annunciator windows on the simulator panel (ISA-18.1 sequence per window). */
export type AnnId =
  | 'RX_TRIP' | 'FLUX_HI' | 'SUR_HI' | 'PRESS_HI' | 'PRESS_LO' | 'TEMP_HI' | 'FLOW_LO' | 'ROD_BLOCK'
  | 'TURB_TRIP' | 'GEN_OPEN' | 'DG_RUN' | 'ESS_DEAD' | 'ABOVE_LIMIT' | 'DUMP_OPEN' | 'FW_B_OOS' | 'DRILL';

/** One installation's simulator state. Pure data; advanced by `step()` in model.ts. */
export interface SimState {
  unit: string; // "RX-A03" or the trainer id
  ic: string; // initial condition last loaded
  /** Simulated seconds since the initial condition was loaded. */
  t: number;
  /** Neutron power, fraction of rated. */
  n: number;
  /** Delayed-neutron precursors, normalised so that c = n at equilibrium. */
  c: number;
  /** Decay heat, fraction of rated. */
  d: number;
  /** Fuel and average coolant temperatures, degrees C. */
  tf: number;
  tc: number;
  /** Rod bank positions, steps withdrawn (fractional while moving). */
  rods: Record<BankId, number>;
  /** Rod motion while a withdraw/insert button is held. */
  rodCmd: { bank: BankId; dir: 1 | -1 } | null;
  mode: SimMode;
  scrammed: boolean;
  scramCause: string | null;
  /** Pump running (commanded) and shaft speed 0..1. */
  pumps: { A: { on: boolean; speed: number }; B: { on: boolean; speed: number } };
  turbineLatched: boolean;
  /** Generator breaker 52-G1 closed. */
  gen: boolean;
  /** Steam demand taken by the turbine, fraction of rated (ramps to station load after sync). */
  demand: number;
  diesel: DieselSelect;
  /** Startup rate, decades per minute (smoothed). */
  sur: number;
  /** Seconds spent outside a limit without a trip (resets when back inside). */
  limitTimer: number;
  ann: Record<AnnId, AnnPoint>;
}

/** One stored simulator record: the state plus who last ran it and when. */
export interface SimRecord {
  state: SimState;
  rev: number;
  /** Wall-clock ms of this checkpoint. */
  savedAt: number;
  by: AccountId;
  /** The window (tab token) running the simulator, and its lease expiry (wall-clock ms). */
  runner: { token: string; until: number } | null;
  /** True when no station is running it (window closed, hidden or FREEZE pressed). */
  frozen: boolean;
}

/** A simulator trip, kept for every account (network-wide history). */
export interface SimTripRecord {
  id: string; // "SIM-0001"
  unit: string;
  at: string; // in-world ISO
  by: AccountId;
  manual: boolean;
  cause: string;
  powerPct: number;
}

export interface PlantShared {
  v: 1;
  sims: Record<string, SimRecord>;
  trips: SimTripRecord[];
}

export const PLANT_SHARED_NONE: PlantShared = { v: 1, sims: {}, trips: [] };
