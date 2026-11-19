/**
 * Board-side geometry for the segment 04 movement. The narrative engine decides when the
 * movement happens and publishes its window (`seg04` signal in @narrative/seg04); this file
 * only turns a window and an instant into what the board draws. Pure.
 *
 * Rail block chainage on the board is measured from each segment's canon `b` end, so for
 * segment 04 (a = ALPHA-02, b = ALPHA-05) block 04-01 is the platform 7 end, matching the
 * engine's block numbering.
 */
import { SEG04_BLOCKS, SEG04_CONSIST_LABEL, SEG04_DURATION_MS, SEG04_LOG_HOLD_MS, seg04Blocks, type Seg04Window } from '@narrative/seg04';

export { SEG04_BLOCKS, SEG04_DURATION_MS, SEG04_LOG_HOLD_MS, type Seg04Window };
export const SEG04_NO = '04';
export const SEG04_LABEL = SEG04_CONSIST_LABEL;
const BLOCK_MS = SEG04_DURATION_MS / SEG04_BLOCKS;

export interface Seg04Phase {
  /** Blocks are lit. */
  active: boolean;
  /** The incident log entry stands. */
  logged: boolean;
  /** Head block 1..12 while active, else 0. */
  head: number;
  /** Lit blocks (chainage from the ALPHA-05 end), ascending. */
  lit: number[];
  /** Head position measured from the canon `a` end (ALPHA-02), 0..1. */
  posFromA: number;
  /** Instant the current (or last) head block became occupied. */
  headSince: number;
}

export function seg04Phase(w: Seg04Window, now: number): Seg04Phase {
  const lit = seg04Blocks(now, w);
  const active = lit.length > 0;
  const t = now - w.start;
  const logged = t >= 0 && now < w.end + SEG04_LOG_HOLD_MS;
  const head = active ? Math.max(...lit) : 0;
  const lastHead = active ? head : SEG04_BLOCKS;
  return {
    active,
    logged,
    head,
    lit,
    posFromA: active ? 1 - t / (w.end - w.start) : t < 0 ? 1 : 0,
    headSince: w.start + (lastHead - 1) * BLOCK_MS,
  };
}

/** "04-07" */
export function seg04BlockId(n: number): string {
  return `${SEG04_NO}-${String(n).padStart(2, '0')}`;
}
