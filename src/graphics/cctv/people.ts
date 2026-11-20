/**
 * Who walks past a camera, and when. Pure and deterministic: the same camera at the same
 * wall-clock moment shows the same passer-by in every window, every tab and every account,
 * and playback of a past minute shows what live view showed at that minute.
 *
 * Time is cut into slots per camera; in each slot at most one passage (sometimes a pair, or an
 * electric cart where the lane is wide enough) happens, with a probability the caller sets from
 * the site's local hour.
 */
import { hashId, mulberry, type Lane, type Scene } from './scene';
import type { V3 } from './project';

export interface Passer {
  cart: boolean;
  /** Floor position, metres. */
  at: V3;
  /** Gait phase 0..1 (walkers) or wheel phase (carts). */
  phase: number;
  /** Clothing luminance. */
  shade: number;
  /** Heading along the lane, unit vector on the floor. */
  dx: number;
  dz: number;
}

export interface ActivityParams {
  slotSec: number;
  walkMps: number;
  cartMps: number;
  cartShare: number;
}

interface Passage {
  start: number; // ms
  dur: number; // ms
  lane: Lane;
  reverse: boolean;
  cart: boolean;
  pair: boolean;
  shade: number;
  offset: number;
}

function laneLen(l: Lane): number {
  return Math.hypot(l.b[0] - l.a[0], l.b[2] - l.a[2]);
}

/** The passage planned for slot `k`, or null. `rate` is the chance a slot has one (0..1). */
export function passageInSlot(scene: Scene, k: number, p: ActivityParams, rate: number): Passage | null {
  if (!scene.lanes.length) return null;
  const r = mulberry((scene.seed ^ Math.imul(k, 2654435761)) >>> 0);
  if (r() >= rate) return null;
  const lane = scene.lanes[Math.floor(r() * scene.lanes.length)]!;
  const cart = lane.cart && r() < p.cartShare;
  const slotMs = p.slotSec * 1000;
  const speed = cart ? p.cartMps : p.walkMps * (0.85 + r() * 0.3);
  const dur = (laneLen(lane) / speed) * 1000;
  return {
    start: k * slotMs + r() * slotMs * 0.8,
    dur,
    lane,
    reverse: r() < 0.5,
    cart,
    pair: !cart && r() < 0.18,
    shade: 50 + Math.floor(r() * 150),
    offset: r() * 0.5 - 0.25,
  };
}

/**
 * Passers-by in view at wall-clock `t` (ms). `rateAt(ms)` gives the chance of a passage in the
 * slot that starts at `ms`.
 */
export function passersAt(scene: Scene, t: number, p: ActivityParams, rateAt: (ms: number) => number): Passer[] {
  const slotMs = p.slotSec * 1000;
  const k0 = Math.floor(t / slotMs);
  const out: Passer[] = [];
  for (let k = k0 - 2; k <= k0; k++) {
    const ps = passageInSlot(scene, k, p, rateAt(k * slotMs));
    if (!ps || t < ps.start || t > ps.start + ps.dur) continue;
    const f = (t - ps.start) / ps.dur;
    const [a, b] = ps.reverse ? [ps.lane.b, ps.lane.a] : [ps.lane.a, ps.lane.b];
    const len = laneLen(ps.lane) || 1;
    const dx = (b[0] - a[0]) / len;
    const dz = (b[2] - a[2]) / len;
    const along = f * len;
    const put = (back: number, side: number, shade: number) => {
      const s = Math.max(0, along - back);
      out.push({
        cart: ps.cart,
        at: [a[0] + dx * s - dz * side, 0, a[2] + dz * s + dx * side],
        phase: ((t - ps.start) / 1000 / (ps.cart ? 0.4 : 1.05) + side) % 1,
        shade,
        dx,
        dz,
      });
    };
    put(0, ps.offset, ps.shade);
    if (ps.pair) put(0.9, ps.offset + 0.55, 200 - ps.shade);
  }
  return out;
}

/** Start times (ms) of passages between `from` and `to`, for the recorder's motion list. */
export function passagesBetween(scene: Scene, from: number, to: number, p: ActivityParams, rateAt: (ms: number) => number): number[] {
  const slotMs = p.slotSec * 1000;
  const out: number[] = [];
  for (let k = Math.floor(from / slotMs); k <= Math.floor(to / slotMs); k++) {
    const ps = passageInSlot(scene, k, p, rateAt(k * slotMs));
    if (ps && ps.start >= from && ps.start <= to) out.push(ps.start);
  }
  return out;
}

/** The first `n` of a fixed, seeded order of the scene's seats or standing spots. */
export function pick(scene: Scene, spots: V3[], n: number, salt: string): V3[] {
  if (n <= 0 || !spots.length) return [];
  const r = mulberry(hashId(scene.id + salt));
  const idx = spots.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx.slice(0, Math.min(n, spots.length)).map((i) => spots[i]!);
}
