/**
 * Deterministic handwritten-signature generator.
 *
 * Not a font: each name is turned into pen strokes. A tall capital opens each
 * word, the following letters become joined humps, loops, ascenders and
 * descenders that shrink into a ripple the way a practised signature does,
 * and the last stroke ends in a flourish. The points are sheared for slant,
 * given a slight baseline climb, and joined with a Catmull-Rom spline.
 * Same name + seed gives the same signature on every render.
 */

type Pt = [number, number];

export interface SignatureGeometry {
  /** SVG path data, one entry per pen stroke, in viewBox units. */
  paths: string[];
  width: number;
  height: number;
  /** y of the writing baseline inside the viewBox. */
  baseline: number;
}

export interface SignatureOptions {
  width?: number;
  height?: number;
  /** Fraction of the height at which the baseline sits. */
  baselineAt?: number;
}

function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ASCENDERS = 'bdfhklt';
const DESCENDERS = 'gjpqyz';
const ROUNDS = 'aceos';
const DOUBLES = 'mw';

const CAP_OVAL = 'CGOQES';
const CAP_STEM = 'BDPRKHMNFTL';

/** Catmull-Rom spline through the points, emitted as cubic Béziers. */
function spline(pts: readonly Pt[]): string {
  const f = (n: number) => (Math.round(n * 10) / 10).toString();
  const first = pts[0];
  if (first === undefined) return '';
  if (pts.length === 1) return `M${f(first[0])} ${f(first[1])}l0.4 0.3`;
  let d = `M${f(first[0])} ${f(first[1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const t = 1 / 6;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * Builds the strokes in "letter units": x-height = 1, y negative upward,
 * baseline at y = 0.
 */
function buildStrokes(name: string, seed: number): Pt[][] {
  const rnd = mulberry32(hash32(`${name}|${seed}`));
  const range = (lo: number, hi: number) => lo + (hi - lo) * rnd();
  const jit = (n: number, amount = 0.07) => n + range(-amount, amount);

  const rawWords = name
    .replace(/[^A-Za-z\s'-]/g, ' ')
    .split(/[\s-]+/)
    .map((w) => w.replace(/'/g, ''))
    .filter((w) => w.length > 0);
  const words = rawWords.length > 0 ? rawWords : ['X'];

  // Given names often collapse to an initial; the surname is written out.
  const initialsOnly = rnd() < 0.45;
  const plan = words.map((w, i) => {
    const last = i === words.length - 1;
    if (last) return w;
    if (i > 0 || initialsOnly) return w.charAt(0);
    return w;
  });

  const strokes: Pt[][] = [];
  let stroke: Pt[] = [];
  let x = 0;
  const capH = range(2.2, 2.9);
  const tightness = range(0.48, 0.66);
  const fade = Math.floor(range(3, 7));

  const put = (px: number, py: number) => stroke.push([x + px, py]);
  const lift = () => {
    if (stroke.length > 0) strokes.push(stroke);
    stroke = [];
  };

  plan.forEach((word, wi) => {
    const isLast = wi === plan.length - 1;
    if (wi > 0) {
      // Usually a pen lift between words; sometimes the pen drags across.
      if (rnd() < 0.75) lift();
      x += range(0.35, 0.7);
    }

    // Capital
    const cap = word.charAt(0).toUpperCase();
    const H = capH * range(0.9, 1.1);
    const W = range(1.0, 1.35);
    if (CAP_OVAL.includes(cap)) {
      put(jit(0.85 * W), jit(-H * 0.82));
      put(jit(0.35 * W), jit(-H));
      put(jit(0.0), jit(-H * 0.45));
      put(jit(0.42 * W), jit(0.02));
      put(jit(0.95 * W), jit(-0.55));
      put(jit(0.62 * W), jit(-0.95));
      put(jit(1.05 * W), jit(-0.1));
    } else if (CAP_STEM.includes(cap)) {
      put(jit(0.28 * W), jit(-H));
      put(jit(0.14 * W), jit(-H * 0.4));
      put(jit(0.1 * W), jit(0.12));
      put(jit(0.2 * W), jit(-H * 0.88));
      put(jit(0.92 * W), jit(-H * 0.8));
      put(jit(0.36 * W), jit(-H * 0.42));
      put(jit(1.05 * W), jit(-0.05));
    } else {
      put(jit(0.0), jit(-0.55));
      put(jit(0.62 * W), jit(-H));
      put(jit(0.3 * W), jit(-H * 0.86));
      put(jit(0.34 * W), jit(-0.4));
      put(jit(0.6 * W), jit(0.05));
      put(jit(1.05 * W), jit(-0.35));
    }
    x += 1.05 * W;

    // Lower-case run
    const letters = word.slice(1).toLowerCase();
    const marks: Pt[][] = [];
    for (let i = 0; i < letters.length; i++) {
      const ch = letters.charAt(i);
      const faded = i >= fade;
      const amp = (faded ? range(0.16, 0.34) : Math.max(0.45, 1 - 0.1 * i)) * range(0.85, 1.12);
      const w = tightness * (faded ? range(0.55, 0.85) : range(0.85, 1.2));
      if (ASCENDERS.includes(ch)) {
        const A = (faded ? 1.15 : 1.9) * range(0.9, 1.1);
        put(jit(0.62 * w, 0.04), jit(-A));
        put(jit(0.3 * w, 0.04), jit(-A * 0.86));
        put(jit(0.36 * w, 0.04), jit(-0.04, 0.04));
        if (ch === 't' && !faded && rnd() < 0.8) {
          marks.push([
            [x + 0.05 * w - 0.2, jit(-A * 0.62, 0.05)],
            [x + 0.9 * w + range(0.2, 0.6), jit(-A * 0.7, 0.05)],
          ]);
        }
      } else if (DESCENDERS.includes(ch)) {
        const D = (faded ? 0.7 : 1.2) * range(0.85, 1.1);
        put(jit(0.4 * w, 0.04), jit(-0.85 * amp, 0.04));
        put(jit(0.56 * w, 0.04), jit(D * 0.75));
        put(jit(0.12 * w, 0.04), jit(D));
        put(jit(0.55 * w, 0.04), jit(-0.02, 0.04));
        if (ch === 'j' && !faded && rnd() < 0.7) {
          marks.push([[x + 0.6 * w, jit(-1.45, 0.08)]]);
        }
      } else if (ROUNDS.includes(ch) && !faded) {
        put(jit(0.58 * w, 0.03), jit(-0.92 * amp, 0.04));
        put(jit(0.16 * w, 0.03), jit(-0.5 * amp, 0.04));
        put(jit(0.5 * w, 0.03), jit(-0.02, 0.03));
        put(jit(0.95 * w, 0.03), jit(-0.3 * amp, 0.04));
      } else {
        const humps = DOUBLES.includes(ch) ? 2 : 1;
        for (let h = 0; h < humps; h++) {
          const o = (h * w) / humps;
          const hw = w / humps;
          put(o + jit(0.38 * hw, 0.03), jit(-0.95 * amp, 0.05));
          put(o + jit(0.82 * hw, 0.03), jit(-0.04, 0.04));
        }
        if (ch === 'i' && !faded && rnd() < 0.7) {
          marks.push([[x + 0.55 * w, jit(-1.5, 0.1)]]);
        }
      }
      x += w;
    }

    if (isLast) {
      // Terminal flourish
      const style = rnd();
      const left = strokes[0]?.[0]?.[0] ?? stroke[0]?.[0] ?? 0;
      const span = x - Math.min(left, 0);
      if (style < 0.4) {
        // long tail rising to the right
        put(jit(0.5), jit(-0.12));
        put(jit(1.5, 0.2), jit(-0.45, 0.1));
        put(jit(2.4, 0.3), jit(-0.75, 0.15));
      } else if (style < 0.75) {
        // sweeps back under the name and returns as a paraph
        put(jit(0.55), jit(-0.25));
        put(jit(0.75), jit(0.45));
        put(-span * range(0.45, 0.7), jit(0.85, 0.1));
        put(-span * range(0.75, 0.9), jit(0.62, 0.08));
        put(-span * range(0.2, 0.35), jit(0.6, 0.08));
      } else {
        // short hook, then a separate underline
        put(jit(0.45), jit(-0.3));
        put(jit(0.8), jit(-0.05));
        marks.push([
          [x - span * range(0.7, 0.9), jit(0.7, 0.08)],
          [x - span * 0.4, jit(0.58, 0.06)],
          [x + range(0.3, 0.9), jit(0.5, 0.08)],
        ]);
      }
    }
    lift();
    // Dots and crossbars are added after the word, as a writer would.
    for (const m of marks) strokes.push(m);
  });

  // Slant and baseline drift
  const slant = range(0.22, 0.42);
  const climb = range(0.02, 0.09);
  return strokes.map((s) => s.map(([px, py]): Pt => [px - py * slant, py - px * climb]));
}

export function generateSignature(name: string, seed = 0, opts: SignatureOptions = {}): SignatureGeometry {
  const width = opts.width ?? 180;
  const height = opts.height ?? 46;
  const baselineAt = opts.baselineAt ?? 0.7;
  const strokes = buildStrokes(name, seed);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    for (const [px, py] of s) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }
  const pad = 2;
  const baseline = Math.round(height * baselineAt);
  const ascent = Math.max(0.5, -minY);
  const descent = Math.max(0.3, maxY);
  const scale = Math.min(
    (width - pad * 2) / Math.max(1, maxX - minX),
    (baseline - pad) / ascent,
    (height - baseline - pad) / descent,
    11,
  );
  const paths = strokes.map((s) =>
    spline(s.map(([px, py]): Pt => [pad + (px - minX) * scale, baseline + py * scale])),
  );
  return { paths, width, height, baseline };
}
