/**
 * Redaction sentinels in the client canon (content/canon/canon.client.json).
 *
 * scripts/canon-merge.ts replaces every restricted string with `[[RX:<key>:<len>]]`
 * (key = T1 | T2 | <COMPARTMENT>; len = character length of the withheld text) and
 * every restricted number with null. The withheld text never reaches the browser
 * bundle; UI code uses these helpers to draw a redaction bar of the right length.
 * Rules: docs/CANON.md, "## Client canon".
 */

export interface RxInfo {
  /** Requirement key: "T1", "T2" or a compartment id such as "SEXTANT". */
  key: string;
  /** Length of the withheld text, in characters. */
  len: number;
}

const RX_EXACT = /^\[\[RX:([A-Z0-9+]+):(\d+)\]\]$/;
const RX_ANY = /\[\[RX:([A-Z0-9+]+):(\d+)\]\]/g;

/** Build a sentinel string. */
export const rxSentinel = (key: string, len: number): string => `[[RX:${key}:${Math.max(0, Math.round(len))}]]`;

/** True when `v` is a whole-value redaction sentinel. */
export function isRx(v: unknown): boolean {
  return typeof v === 'string' && RX_EXACT.test(v);
}

/** Key and length of a sentinel, or null when `v` is not one. */
export function rxInfo(v: unknown): RxInfo | null {
  if (typeof v !== 'string') return null;
  const m = RX_EXACT.exec(v);
  return m ? { key: m[1]!, len: Number(m[2]) } : null;
}

/** True when `v` contains a sentinel anywhere (e.g. a scrubbed name inside a note). */
export function hasRx(v: unknown): boolean {
  return typeof v === 'string' && new RegExp(RX_ANY.source).test(v);
}

export type RxPart = { text: string } | { rx: RxInfo };

/** Split a string into plain text and sentinel parts, for inline rendering. */
export function splitRx(s: string): RxPart[] {
  const out: RxPart[] = [];
  const re = new RegExp(RX_ANY.source, 'g');
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    out.push({ rx: { key: m[1]!, len: Number(m[2]) } });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** Plain-text form for canvas or aria contexts: sentinels become a block bar of their length. */
export function rxPlain(s: string, ch = '█'): string {
  return s.replace(new RegExp(RX_ANY.source, 'g'), (_m, _k: string, n: string) => ch.repeat(Math.max(1, Number(n))));
}
