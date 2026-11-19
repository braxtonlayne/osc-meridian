/**
 * Code 39 (Code 3 of 9) encoder and decoder.
 *
 * Each character is nine elements, alternating bar/space and starting with a
 * bar: five bars and four spaces, three of the nine wide. Characters are
 * separated by one narrow inter-character gap. A symbol is framed by the
 * start/stop character `*`.
 *
 * Patterns are written element by element, `1` = wide, `0` = narrow, in the
 * order bar, space, bar, space, bar, space, bar, space, bar.
 */

export const CODE39_PATTERNS: Readonly<Record<string, string>> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '*': '010010100',
  $: '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
};

/** Value order for the optional modulo-43 check character. */
export const CODE39_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

const START_STOP = '*';

export interface Code39Element {
  /** true = bar (ink), false = space. */
  bar: boolean;
  /** true = wide element. */
  wide: boolean;
}

export interface Code39Rect {
  x: number;
  width: number;
}

export interface Code39Layout {
  /** Data actually encoded, without the start/stop characters. */
  data: string;
  /** Bars only, in module units, quiet zone included in `x`. */
  bars: Code39Rect[];
  /** Total width in module units, both quiet zones included. */
  width: number;
}

/**
 * Makes a string encodable: upper-cases it and replaces anything outside the
 * Code 39 set (including `*`, which is reserved for start/stop) with `-`.
 */
export function sanitizeCode39(value: string): string {
  let out = '';
  for (const ch of value.toUpperCase()) {
    out += ch !== START_STOP && CODE39_PATTERNS[ch] !== undefined ? ch : '-';
  }
  return out;
}

/** Modulo-43 check character for already-valid data. */
export function code39CheckChar(data: string): string {
  let sum = 0;
  for (const ch of data) {
    const v = CODE39_CHARSET.indexOf(ch);
    if (v < 0) throw new Error(`Code 39: cannot encode "${ch}"`);
    sum += v;
  }
  return CODE39_CHARSET.charAt(sum % 43);
}

/**
 * Encodes `data` (no asterisks) into the full element sequence:
 * `*` + data + `*`, with a narrow space between characters.
 */
export function encodeCode39(data: string): Code39Element[] {
  const out: Code39Element[] = [];
  const symbol = START_STOP + data + START_STOP;
  for (let c = 0; c < symbol.length; c++) {
    const ch = symbol.charAt(c);
    const pattern = CODE39_PATTERNS[ch];
    if (pattern === undefined || (ch === START_STOP && c !== 0 && c !== symbol.length - 1)) {
      throw new Error(`Code 39: cannot encode "${ch}"`);
    }
    if (c > 0) out.push({ bar: false, wide: false });
    for (let i = 0; i < 9; i++) {
      out.push({ bar: i % 2 === 0, wide: pattern.charAt(i) === '1' });
    }
  }
  return out;
}

/**
 * Lays the symbol out in module units (narrow element = 1).
 * `ratio` is the wide:narrow ratio; the standard allows 2.0 to 3.0.
 */
export function layoutCode39(data: string, ratio = 3, quiet = 10): Code39Layout {
  const bars: Code39Rect[] = [];
  let x = quiet;
  for (const el of encodeCode39(data)) {
    const w = el.wide ? ratio : 1;
    if (el.bar) bars.push({ x, width: w });
    x += w;
  }
  return { data, bars, width: x + quiet };
}

/**
 * Decodes a symbol from the geometry of its bars alone (positions and widths
 * in any unit). Used to verify rendered output; it knows nothing about how
 * the bars were produced. Returns the data without start/stop characters.
 */
export function decodeCode39(bars: readonly Code39Rect[]): string {
  if (bars.length === 0 || bars.length % 5 !== 0) {
    throw new Error(`Code 39 decode: ${bars.length} bars is not a whole number of characters`);
  }
  const sorted = [...bars].sort((a, b) => a.x - b.x);
  // Run lengths, bar/space alternating, starting and ending on a bar.
  const runs: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      runs.push(b.x - (prev.x + prev.width));
    }
    runs.push(b.width);
  }
  const narrow = Math.min(...runs);
  const widest = Math.max(...runs);
  const threshold = (narrow + widest) / 2;
  const lookup = new Map<string, string>();
  for (const [ch, pattern] of Object.entries(CODE39_PATTERNS)) lookup.set(pattern, ch);

  let text = '';
  // 9 elements per character + 1 inter-character gap.
  for (let i = 0; i < runs.length; i += 10) {
    let pattern = '';
    for (let k = 0; k < 9; k++) {
      const run = runs[i + k];
      if (run === undefined) throw new Error('Code 39 decode: truncated symbol');
      pattern += run > threshold ? '1' : '0';
    }
    const gap = runs[i + 9];
    if (gap !== undefined && gap > threshold) {
      throw new Error('Code 39 decode: wide inter-character gap');
    }
    const ch = lookup.get(pattern);
    if (ch === undefined) throw new Error(`Code 39 decode: unknown pattern ${pattern}`);
    text += ch;
  }
  if (text.length < 2 || !text.startsWith(START_STOP) || !text.endsWith(START_STOP)) {
    throw new Error('Code 39 decode: missing start/stop character');
  }
  return text.slice(1, -1);
}
