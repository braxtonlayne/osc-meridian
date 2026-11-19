/**
 * Unit check for the Code 39 encoder.
 * Run: npx vitest run --config src/graphics/forms/check/vitest.config.ts
 *
 * The pattern table is checked against the symbology's construction rule
 * rather than against itself: every character is one of ten "two wide bars
 * out of five" bar patterns combined with one wide space out of four (40
 * characters), plus four characters with all bars narrow and three wide spaces.
 */
import { describe, expect, it } from 'vitest';
import {
  CODE39_CHARSET,
  CODE39_PATTERNS,
  code39CheckChar,
  decodeCode39,
  encodeCode39,
  layoutCode39,
  sanitizeCode39,
} from './code39';

/** Bar patterns (wide flags for the five bars) in column order 1..9,0. */
const BAR_COLUMNS = ['10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010', '00110'];
/** Rows of ten characters, each row sharing the position of its wide space. */
const ROWS: Array<{ chars: string; space: string }> = [
  { chars: '1234567890', space: '0100' },
  { chars: 'ABCDEFGHIJ', space: '0010' },
  { chars: 'KLMNOPQRST', space: '0001' },
  { chars: 'UVWXYZ-. *', space: '1000' },
];
const SPECIALS: Record<string, string> = { $: '1110', '/': '1101', '+': '1011', '%': '0111' };

function interleave(bars: string, spaces: string): string {
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += bars.charAt(i);
    if (i < 4) out += spaces.charAt(i);
  }
  return out;
}

describe('Code 39 pattern table', () => {
  it('has the 43 data characters plus start/stop', () => {
    expect(Object.keys(CODE39_PATTERNS)).toHaveLength(44);
    for (const ch of CODE39_CHARSET) expect(CODE39_PATTERNS[ch]).toBeDefined();
    expect(CODE39_CHARSET).toHaveLength(43);
  });

  it('matches the construction rule for every character', () => {
    for (const row of ROWS) {
      for (let col = 0; col < 10; col++) {
        const ch = row.chars.charAt(col);
        expect(CODE39_PATTERNS[ch], `character "${ch}"`).toBe(interleave(BAR_COLUMNS[col]!, row.space));
      }
    }
    for (const [ch, spaces] of Object.entries(SPECIALS)) {
      expect(CODE39_PATTERNS[ch], `character "${ch}"`).toBe(interleave('00000', spaces));
    }
  });

  it('has three wide elements of nine and no duplicate patterns', () => {
    const seen = new Set<string>();
    for (const pattern of Object.values(CODE39_PATTERNS)) {
      expect(pattern).toMatch(/^[01]{9}$/);
      expect(pattern.split('1').length - 1).toBe(3);
      seen.add(pattern);
    }
    expect(seen.size).toBe(44);
  });
});

describe('Code 39 encode / decode', () => {
  it('frames the data with start/stop and narrow gaps', () => {
    const els = encodeCode39('A1');
    // 4 characters x 9 elements + 3 gaps
    expect(els).toHaveLength(4 * 9 + 3);
    expect(els[0]).toEqual({ bar: true, wide: false });
    expect(els[9]).toEqual({ bar: false, wide: false });
    const first = els.slice(0, 9).map((e) => (e.wide ? '1' : '0')).join('');
    const last = els.slice(-9).map((e) => (e.wide ? '1' : '0')).join('');
    expect(first).toBe('010010100');
    expect(last).toBe('010010100');
  });

  it('round-trips through bar geometry alone', () => {
    const samples = ['OSC-114', 'F114-0307', 'RCPT 08-004417', 'A.B/C+D%E$F', CODE39_CHARSET, ''];
    for (const data of samples) {
      for (const ratio of [2, 2.5, 3]) {
        const layout = layoutCode39(data, ratio);
        expect(decodeCode39(layout.bars), `"${data}" at ${ratio}:1`).toBe(data);
        // survives uniform scaling and offset, as when rendered
        const scaled = layout.bars.map((b) => ({ x: b.x * 1.37 + 12, width: b.width * 1.37 }));
        expect(decodeCode39(scaled)).toBe(data);
      }
    }
  });

  it('has the expected overall width', () => {
    // each character = 6 narrow + 3 wide; gaps between characters; two quiet zones
    const layout = layoutCode39('ABC', 3, 10);
    expect(layout.width).toBe(5 * (6 + 9) + 4 + 20);
    expect(layout.bars).toHaveLength(25);
  });

  it('rejects what it cannot encode and sanitizes on request', () => {
    expect(() => encodeCode39('abc')).toThrow();
    expect(() => encodeCode39('A*B')).toThrow();
    expect(sanitizeCode39('rcpt_08*17')).toBe('RCPT-08-17');
    expect(decodeCode39(layoutCode39(sanitizeCode39('osc form 114')).bars)).toBe('OSC FORM 114');
  });

  it('computes the modulo-43 check character', () => {
    // C=12 O=24 D=13 E=14 space=38 3 9 -> 113 mod 43 = 27 -> R
    expect(code39CheckChar('CODE 39')).toBe('R');
  });

  it('refuses damaged symbols', () => {
    const bars = layoutCode39('OSC').bars;
    expect(() => decodeCode39(bars.slice(1))).toThrow();
    expect(() => decodeCode39(bars.slice(5))).toThrow();
  });
});
