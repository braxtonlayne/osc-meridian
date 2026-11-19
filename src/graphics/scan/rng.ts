/** Small deterministic PRNG utilities. Everything in the scan kit derives from a seed. */

export type Rng = () => number;

/** mulberry32: fast, well-distributed 32-bit PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash to an unsigned 32-bit integer. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Combine a numeric seed with a salt so sibling effects do not share a sequence. */
export function seeded(seed: number | string | undefined, salt = ''): Rng {
  const base = typeof seed === 'number' ? `n${seed}` : `s${seed ?? ''}`;
  return mulberry32(hashString(`${base}|${salt}`));
}

/** Uniform in [lo, hi). */
export function range(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng();
}

/** Symmetric jitter in (-amp, amp), roughly triangular so extremes are rare. */
export function jitter(rng: Rng, amp: number): number {
  return (rng() + rng() - 1) * amp;
}

/** Parse a data-* seed; non-numeric strings are hashed so any value is usable. */
export function parseSeed(raw: string | null | undefined, fallback = 1): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : hashString(raw);
}
