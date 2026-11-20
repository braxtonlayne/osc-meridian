/**
 * Shared plant state key `environ` (owner: environ app; docs/CONTRACTS.md "Shared plant state").
 * Other apps read it with `import type { EnvironState } from '@apps/environ/types'` and
 * `services.shared.get<EnvironState | null>('environ', null)`. Only the environ app writes it.
 *
 * The plant is a deterministic model: `checkpoint` holds the plant values at a wall-clock time,
 * `controls` the operator positions since then; readers integrate from the checkpoint to now
 * (src/apps/environ/model.ts `advance`). `log` is the historian (samples up to the checkpoint).
 */

/** Scrubber train selector position. */
export type ScrubberMode = 'off' | 'auto' | 'adsorb' | 'regen';
/** What a train is doing. `standby` = clean bed holding after a manual regeneration. */
export type ScrubberPhase = 'off' | 'adsorb' | 'regen' | 'standby';
export type FilterBankId = 'A' | 'B';

export interface EnvironControls {
  /** Fan speed index per AHU id (canon apps.environ.fanSpeeds: OFF, LOW, MED, HIGH). */
  ahu: Record<string, number>;
  /** Makeup air damper MAD-1 position index (canon makeup.positions: CLOSED, MIN, OPEN). */
  makeup: number;
  /** Makeup air seal override key switch (opens MAD-1 against a seal signal). */
  sealOverride: boolean;
  filtration: { mode: 'normal' | 'cbrn'; bank: FilterBankId };
  /** Selector position per scrubber train id (SCR-A, SCR-B). */
  scrubbers: Record<string, ScrubberMode>;
}

export interface TrainState {
  phase: ScrubberPhase;
  /** Bed loading 0..1 of capacity. */
  loading: number;
  /** Plant seconds left in a regeneration (0 when not regenerating). */
  regenLeft: number;
}

/** Plant values at a moment (model state). Zone arrays follow canon zones order. */
export interface EnvironPlant {
  co2Ppm: number;
  o2Pct: number;
  tempC: number[];
  rh: number[];
  overpressure: number; // in. w.g.
  trains: Record<string, TrainState>;
  /** Seal closure latched by a seal signal; cleared only by RESET SEAL CLOSURE. */
  sealLatched: boolean;
  /** Plant hours run in CBRN mode per filter bank since its last change. */
  cbrnHours: Record<FilterBankId, number>;
}

/** Historian sample (compact). */
export interface EnvironSample {
  w: number; // wall-clock ms
  co2: number; // site ppm
  o2: number;
  zc: number[]; // zone CO2 ppm
  zt: number[]; // zone temperature
  zh: number[]; // zone RH
  op: number; // overpressure
  mk: number; // makeup m3/h actually admitted
  rm: number; // scrubber removal m3/h CO2
  ld: number[]; // train loadings in train order
}

export interface HandoverEntry {
  at: string; // in-world ISO
  watch: string;
  by: string; // "TECHNICIAN 4-0611"
  co2Ppm: number;
  o2Pct: number;
  remarks: string;
  /** Snapshot words recorded with the signature. */
  plant?: string;
}

export interface EnvironEvent {
  at: string; // in-world ISO
  w: number; // wall ms
  by: string; // account id
  text: string;
}

export interface EnvironState {
  v: 1;
  site: string;
  rev: number;
  checkpoint: { at: number; plant: EnvironPlant };
  controls: EnvironControls;
  /** Filter bank last change dates (ISO day) and lot numbers, after any change recorded on the panel. */
  filters: Record<FilterBankId, { lastChange: string; lot: string }>;
  log: EnvironSample[];
  handover: HandoverEntry[];
  events: EnvironEvent[];
  /** Current or last CO2 excursion above the HIGH limit (wall ms). */
  excursion: { since: number | null; peak: number; reported: boolean };
}
