/**
 * Shared plant state key `doors` (owner: doors app; everyone else reads it with `import type`).
 *
 * Door definitions (ids, levels, kinds, normal positions, cycle times) are canon `doors`
 * (content/canon/extended-c.json). This key holds only what has moved away from canon:
 * a door with no record here sits at its canon `normal` position (normal 'open' → 'open',
 * normal 'closed' → 'closed-locked').
 *
 * Reading a door without any doors code:
 *   const rec = state.doors[doorId];
 *   if (!rec) → canon normal position.
 *   else the current position is the last step in `rec.steps` whose `from` <= Date.now().
 *   While that step is 'opening' or 'closing', the leaf travel fraction is
 *   (now - step.from) / (next.from - step.from); `openFraction(rec, now)` below does it for you
 *   (it is a pure helper in a type-only-safe file; copy it rather than importing values if you
 *   must keep the import type-only).
 *
 * Seal drill: the doors app writes the drill's close (and stand-down reopen) schedules into
 * `steps` for every door with `sealsOnDrill` at a site as that site starts sealing (from the
 * drill's per-site `acknowledged` time). `drill` below says which drill id and phase have been
 * applied. If `drill.id` differs from the live DrillState id, the doors app has not run since
 * the drill was ordered: treat `sealsOnDrill` doors at a site whose drill status is 'sealing'
 * or 'sealed' as closed.
 */
import type { AccountId } from '@core/contracts';

/** Real door positions, in the order a closed door passes through them. */
export type DoorPosition =
  | 'closed-locked' // seated and dogged (locking bolts driven)
  | 'unlocking' // bolts withdrawing
  | 'opening' // leaf travelling open
  | 'open' // fully open, on the open stop
  | 'closing' // leaf travelling closed
  | 'seated'; // closed on the seals, bolts not yet driven (becomes closed-locked)

/** One step of a door's movement schedule (wall-clock ms). */
export interface DoorStep {
  pos: DoorPosition;
  from: number;
}

/** An override in force on a door (reason required, audited). */
export interface DoorOverride {
  /** Override reference, "DOR-G08-0003". */
  ref: string;
  kind: 'drill-hold' | 'hold-open' | 'decon-bypass';
  reason: string;
  by: AccountId;
  at: number; // wall-clock ms
  /** In-world ISO time the override was entered (for display). */
  atIso: string;
}

export interface DoorRecord {
  /** Movement schedule, ascending `from`. Never empty. */
  steps: DoorStep[];
  /** The commanded end state. */
  cmd: 'open' | 'close';
  /** Who issued the current command ('drill' for the seal drill sequence, 'airlock' for a leaf moved by its airlock cycle). */
  by: AccountId | 'drill' | 'airlock';
  override: DoorOverride | null;
}

/** Airlock cycle phases (both leaves are ordinary doors in `doors`; this is the chamber). */
export type AirlockPhase =
  | 'idle' // both leaves closed-locked, chamber at inside pressure
  | 'outer-open' // outer leaf moving or open (personnel passing)
  | 'decon' // CBRN decontamination dwell (air wash), both leaves locked
  | 'equalize' // chamber pressure moving to the far side
  | 'inner-open' // inner leaf moving or open
  | 'fault'; // interlock fault: cycle stopped, both leaves driven closed

export interface AirlockStep {
  phase: AirlockPhase;
  from: number; // wall-clock ms
  /** Chamber pressure relative to outside at this step's start, in the canon unit (doors fragment `pressure.unit`). */
  dp: number;
}

export interface AirlockRecord {
  /** 'in' = outside to inside (the decon direction); 'out' = inside to outside. */
  dir: 'in' | 'out';
  decon: boolean;
  /** Schedule ascending; the last step is 'idle' (cycle complete) or 'fault'. */
  steps: AirlockStep[];
  by: AccountId | 'drill';
  /** Persons counted through the chamber on this cycle (badge reader), when known. */
  count: number | null;
}

/** One line of the door cycle log (newest last; capped). */
export interface DoorLogLine {
  at: number; // wall-clock ms
  atIso: string; // in-world ISO
  site: string; // FacilityId
  door: string; // door or airlock id
  /** Event word: OPEN CMD, CLOSE CMD, OPEN, CLOSED-LOCKED, CYCLE IN, CYCLE OUT, DECON, OVERRIDE, INTERLOCK REJECT, HELD OPEN, ACK, DRILL SEAL, DRILL STAND-DOWN, HANDOVER. */
  event: string;
  by: AccountId | 'drill' | 'airlock' | 'system';
  note?: string;
}

export interface DoorsState {
  v: 1;
  doors: Record<string, DoorRecord>;
  /** Airlock id ("G08-AL1") → current or last cycle. */
  airlocks: Record<string, AirlockRecord>;
  log: DoorLogLine[];
  /** Override serial per site ("GAMMA-08" → 3). */
  serial: Record<string, number>;
  /** The seal drill this state reflects. */
  drill: { id: string; phase: 'sealed' | 'stand-down'; sites: string[] } | null;
}

export const DOORS_EMPTY: DoorsState = { v: 1, doors: {}, airlocks: {}, log: [], serial: {}, drill: null };

/** Current step of a schedule (pure; safe for readers to copy). */
export function currentStep<T extends { from: number }>(steps: T[], now: number): { step: T; next: T | undefined } {
  let i = 0;
  for (let k = 0; k < steps.length; k++) if (steps[k]!.from <= now) i = k;
  return { step: steps[i]!, next: steps[i + 1] };
}

/** Leaf open fraction 0..1 for a door record at `now` (pure). */
export function openFraction(rec: DoorRecord, now: number): number {
  const { step, next } = currentStep(rec.steps, now);
  const t = next ? Math.min(1, Math.max(0, (now - step.from) / Math.max(1, next.from - step.from))) : 1;
  switch (step.pos) {
    case 'open':
      return 1;
    case 'opening':
      return t;
    case 'closing':
      return 1 - t;
    default:
      return 0;
  }
}
