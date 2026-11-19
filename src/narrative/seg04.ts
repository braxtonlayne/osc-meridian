/**
 * The once-per-session unscheduled movement on segment 04, as published to the
 * Transit Control app. The narrative engine decides when it happens; the app
 * only draws it. Nothing here names a rule or a step.
 */
import { signal } from '@preact/signals';
import type { ReadonlySignal } from '@preact/signals';
import { localOf, zuluOf } from './format';

/** Visible occupancy, ms. */
export const SEG04_DURATION_MS = 150_000;
/** The live incident log entry is removed this long after the last block clears. */
export const SEG04_LOG_HOLD_MS = 60_000;
export const SEG04_BLOCKS = 12;
const PER_BLOCK_MS = SEG04_DURATION_MS / SEG04_BLOCKS; // 12.5 s
/** Displayed consist label. The true series is never shown. */
export const SEG04_CONSIST_LABEL = 'R04-***';

export interface Seg04Window {
  /** Wall-clock ms when the first block lit. */
  start: number;
  /** start + SEG04_DURATION_MS */
  end: number;
}

const _seg04 = signal<Seg04Window | null>(null);
/** Current or just-finished movement (null outside start .. end + log hold). */
export const seg04: ReadonlySignal<Seg04Window | null> = _seg04;

const _boardVisible = signal(false);
/** Whether the Transit Control board is on screen (not minimised), as reported by the app. */
export const transitBoardVisible: ReadonlySignal<boolean> = _boardVisible;
/**
 * Transit Control calls this when its board view becomes visible or hidden
 * (opened, minimised, restored, closed). A due movement starts at once when the
 * board is visible in an unlocked session. Without these calls the engine falls
 * back to open/close lines in the audit trail.
 */
export function reportTransitBoard(visible: boolean): void {
  _boardVisible.value = visible;
}

/** Engine-internal: publish the window derived from engine state. */
export function publishSeg04(w: Seg04Window | null): void {
  const cur = _seg04.peek();
  if (cur?.start === w?.start && cur?.end === w?.end) return;
  _seg04.value = w;
}

/**
 * Blocks lit at `now` (1..12, block 1 at the ALPHA-05 end, platform 7), two
 * adjacent blocks at a time, about 12.5 s per block.
 */
export function seg04Blocks(now: number, w: Seg04Window | null): number[] {
  if (!w || now < w.start || now >= w.end) return [];
  const i = Math.floor((now - w.start) / PER_BLOCK_MS); // 0..11
  return i === 0 ? [1] : [i, i + 1].filter((b) => b >= 1 && b <= SEG04_BLOCKS);
}

/** Live incident log line for a lit block: "2114Z (1714 EDT) SEG 04 BLK 04-03 OCCUPIED CONSIST R04-*** NO BOOKING". */
export function seg04LogLine(now: number, block: number): string {
  return `${zuluOf(now)} (${localOf(now)}) SEG 04 BLK 04-${String(block).padStart(2, '0')} OCCUPIED CONSIST ${SEG04_CONSIST_LABEL} NO BOOKING`;
}

/** True while the incident log should still show the entry. */
export function seg04LogVisible(now: number, w: Seg04Window | null): boolean {
  return !!w && now >= w.start && now < w.end + SEG04_LOG_HOLD_MS;
}

/**
 * Audit detail the Transit Control app writes when its board was visible
 * (not minimised) at any moment of the movement. Log it once per movement:
 *   services.audit.log('transit.watch', 'SEG04', seg04WatchDetail(...), seg04WatchData(...))
 */
export function seg04WatchDetail(operatorId: string, workstation: string, view: string, fromMs: number, toMs: number): string {
  return `Operator ${operatorId} WS ${workstation}: Network Control board displayed (${view}) ${zuluOf(fromMs)} to ${zuluOf(toMs)}. Indications displayed: SEG 04 BLK 04-01 to 04-12.`;
}

export function seg04WatchData(view: string, fromMs: number, toMs: number): Record<string, string> {
  return { event: 'SEG04', view, start: String(fromMs), end: String(toMs) };
}
