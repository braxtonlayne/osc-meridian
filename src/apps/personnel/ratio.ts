/**
 * Staffing ratio calculator (pure logic). Applies the canon ratio model
 * (canon.ratioModel: ten functions, per cent of establishment) to any
 * facility's berthing at any fill. Allocation uses the largest-remainder
 * method so the function lines always sum to the establishment exactly.
 */

export interface RatioRow {
  function: string;
  pct: number;
  /** Count at the model basis, as published in canon. */
  count: number;
}

export interface RatioLine {
  function: string;
  pct: number;
  modelCount: number;
  /** Posts at the requested establishment. */
  posts: number;
}

export interface RatioResult {
  capacity: number;
  establishment: number;
  /** Establishment as a percentage of capacity (unrounded). */
  fillPct: number;
  lines: RatioLine[];
  /** Posts on the command line (first line whose function starts with "Command"). */
  commandPosts: number;
  /** Non-command posts per command post, or null when there are no command posts. */
  supportToCommand: number | null;
}

/** Headcount for a fill percentage of capacity, rounded half up, clamped to [0, capacity]. */
export function headcountForFill(capacity: number, fillPct: number): number {
  if (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(fillPct)) return 0;
  const n = Math.floor((capacity * fillPct) / 100 + 0.5 + 1e-9);
  return Math.min(capacity, Math.max(0, n));
}

export function fillForHeadcount(capacity: number, headcount: number): number {
  if (!Number.isFinite(capacity) || capacity <= 0) return 0;
  return (headcount / capacity) * 100;
}

/**
 * Split `total` across shares in proportion, as whole numbers summing to `total`.
 * Shares need not sum to 100. Ties on the remainder go to the earlier line.
 */
export function allocate(total: number, shares: readonly number[]): number[] {
  const sum = shares.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0 || sum <= 0) return shares.map(() => 0);
  const exact = shares.map((s) => (total * Math.max(0, s)) / sum);
  const out = exact.map((x) => Math.floor(x + 1e-9));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x + 1e-9) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0 && order.length > 0; k = (k + 1) % order.length, left--) {
    const idx = order[k]!.i;
    out[idx] = (out[idx] ?? 0) + 1;
  }
  return out;
}

export function isCommandFunction(name: string): boolean {
  return /^command\b/i.test(name.trim());
}

/** Ratio of non-command to command, or null when command is zero. */
export function supportRatio(total: number, command: number): number | null {
  return command > 0 ? (total - command) / command : null;
}

/** "11.5:1", or a dash when undefined. */
export function formatRatio(r: number | null): string {
  return r === null ? '—' : `${r.toFixed(1)}:1`;
}

export function computeEstablishment(rows: readonly RatioRow[], capacity: number, establishment: number): RatioResult {
  const est = Math.max(0, Math.min(Math.round(establishment), Math.max(0, capacity)));
  const posts = allocate(est, rows.map((r) => r.pct));
  const lines = rows.map((r, i) => ({ function: r.function, pct: r.pct, modelCount: r.count, posts: posts[i] ?? 0 }));
  const commandPosts = lines.filter((l) => isCommandFunction(l.function)).reduce((a, l) => a + l.posts, 0);
  return {
    capacity,
    establishment: est,
    fillPct: fillForHeadcount(capacity, est),
    lines,
    commandPosts,
    supportToCommand: supportRatio(est, commandPosts),
  };
}

/**
 * Parse a fill entry ("7.5", "7.5%", " 40 "). Returns the number, or a
 * REJECTED message naming the block when it is not a percentage from 0 to 100.
 */
export function parseFill(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/%$/, '').trim();
  if (!s) return { ok: false, message: 'Block 2: enter a fill percentage.' };
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return { ok: false, message: 'Block 2: fill must be a number with at most two decimal places.' };
  const v = Number(s);
  if (v < 0 || v > 100) return { ok: false, message: 'Block 2: fill must be between 0 and 100 per cent of berthing.' };
  return { ok: true, value: v };
}

/** Parse a headcount entry; must be a whole number from 0 to capacity. */
export function parseHeadcount(raw: string, capacity: number): { ok: true; value: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/,/g, '');
  if (!s) return { ok: false, message: 'Block 3: enter an establishment headcount.' };
  if (!/^\d{1,6}$/.test(s)) return { ok: false, message: 'Block 3: headcount must be a whole number.' };
  const v = Number(s);
  if (v > capacity) return { ok: false, message: `Block 3: headcount exceeds berthing for the selected facility (${capacity.toLocaleString('en-US')}).` };
  return { ok: true, value: v };
}
