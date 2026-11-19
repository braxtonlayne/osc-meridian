/**
 * Shared construction parts. These are what make the set read as one hand:
 * the same sheet of paper, the same folder, the same monitor, the same bevel.
 */
import { Cv, type Draw, type IconDef } from './canvas';

/** A hand-pixelled 16px drawing: full-width rows starting at row `y0`. */
export const A =
  (y0: number, rows: readonly string[]): Draw =>
  (c) => {
    for (const row of rows) {
      if (row.length !== 16) throw new Error(`icons: 16px row is ${row.length} wide: "${row}"`);
    }
    c.g(0, y0, rows);
  };

/** Raised face-coloured button filling the canvas: the ground for caption and toolbar glyphs. */
export function face(c: Cv): void {
  const n = c.n;
  c.r(0, 0, n, n, 'f');
  c.h(0, 0, n - 1, 'h').v(0, 0, n - 1, 'h');
  c.h(1, n - 2, n - 2, 's').v(n - 2, 1, n - 2, 's');
  c.h(0, n - 1, n, 'k').v(n - 1, 0, n, 'k');
}

const onButton =
  (g: Draw): Draw =>
  (c) => {
    face(c);
    const t = new Cv(c.n);
    g(t);
    c.blit(t, 0, 0);
  };

/** A glyph that is a button by default and a bare glyph on request. */
export const btn = (s: Draw, l: Draw): IconDef => ({ s: onButton(s), l: onButton(l), sg: s, lg: l });

/** Solid navy arrow on a 16px canvas, pointing left or up; flip it for the others. */
export function arrow(dir: 'left' | 'right' | 'up'): Cv {
  const t = new Cv(16);
  if (dir === 'up') {
    for (let i = 0; i <= 5; i++) t.h(7 - i, 1 + i, 2 + 2 * i, 'n');
    t.r(5, 7, 6, 7, 'n');
  } else {
    for (let i = 0; i <= 5; i++) t.v(1 + i, 7 - i, 2 + 2 * i, 'n');
    t.r(7, 5, 7, 6, 'n');
  }
  t.ol('k').bev('n', 'b', 'a');
  return dir === 'right' ? t.flipH() : t;
}

export const mirror =
  (d: Draw): Draw =>
  (c) => {
    const t = new Cv(c.n);
    d(t);
    c.blit(t.flipH(), 0, 0);
  };

export const upturn =
  (d: Draw): Draw =>
  (c) => {
    const t = new Cv(c.n);
    d(t);
    c.blit(t.flipV(), 0, 0);
  };

/** Sheet of paper with a turned corner of `f` pixels. */
export function page(c: Cv, x: number, y: number, w: number, h: number, f: number, stock = 'p'): void {
  c.b(x, y, w, h, 'k', stock);
  const fx = x + w - f;
  for (let j = 0; j < f; j++) {
    for (let i = 0; i < f; i++) {
      if (i > j) c.p(fx + i, y + j, '_');
      else if (i === j || i === 0 || j === f - 1) c.p(fx + i, y + j, 'k');
      else c.p(fx + i, y + j, 'h');
    }
  }
}

/** The standard document sheet at each size. */
export function page16(c: Cv): void {
  page(c, 2, 1, 11, 14, 4);
}

export function page32(c: Cv, f = 7): void {
  page(c, 5, 2, 22, 28, f);
  c.v(27, 2 + f + 2, 28 - f - 1, 's').h(7, 30, 21, 's');
}

/** Greeked text: `n` rules, the last one short. */
export function tx(c: Cv, x: number, y: number, w: number, n: number, step = 2, ch = 'q'): void {
  for (let k = 0; k < n; k++) c.h(x, y + k * step, k === n - 1 ? Math.ceil(w * 0.6) : w, ch);
}

/** Closed manila folder. */
export function folder16(c: Cv): void {
  c.g(0, 2, [
    '.kkkkk..........',
    'kyyyyykkkkkkkk..',
    'kyyyyyyyyyyyyuk.',
    'kymmmmmmmmmmmuk.',
    'kymmmmmmmmmmmuk.',
    'kymmmmmmmmmmmuk.',
    'kymmmmmmmmmmmuk.',
    'kymmmmmmmmmmmuk.',
    'kymmmmmmmmmmmuk.',
    'kymmmmmmmmmmmuk.',
    'kymmmmmmmmmmmuk.',
    'kuuuuuuuuuuuuuk.',
    '.kkkkkkkkkkkkk..',
  ]);
}

export function folder32(c: Cv): void {
  // tab
  c.r(2, 5, 11, 4, 'y');
  c.h(3, 4, 9, 'k').p(2, 5, 'k').v(1, 6, 3, 'k');
  c.p(12, 5, 'k').p(13, 6, 'k').p(14, 7, 'k');
  c.p(12, 6, 'y').r(12, 7, 2, 1, 'y');
  // body
  c.bx(1, 8, 29, 20, 'm', 'y', 'u');
  c.r(2, 8, 12, 1, 'y');
  c.p(1, 8, 'k');
  // drop line
  c.h(3, 28, 28, 's').v(30, 10, 19, 's');
}

/** Sealed envelope with a 2:1 flap. */
export function env(c: Cv, x: number, y: number, w: number, h: number): void {
  c.bx(x, y, w, h, 'w', 'w', 'q');
  for (let i = 0; x + 1 + 2 * i <= x + w - 3 - 2 * i; i++) {
    c.r(x + 1 + 2 * i, y + 1 + i, 2, 1, 'd');
    c.r(x + w - 3 - 2 * i, y + 1 + i, 2, 1, 'd');
  }
}

/** Bevelled monitor case with a flat screen. */
export function mon(c: Cv, x: number, y: number, w: number, h: number, scr: string): void {
  c.bx(x, y, w, h, 'f', 'h', 's');
  c.b(x + 2, y + 2, w - 4, h - 4, 'k', scr);
}

/** Gear on its own canvas of `n` pixels: 4 cardinal + 4 diagonal teeth. */
export function gear(n: number, toothW: number, diag: number, hole: number): Cv {
  const t = new Cv(n);
  const inset = 3;
  t.e(inset, inset, n - 2 * inset, n - 2 * inset, 'g', 'g');
  const m = (n - toothW) / 2;
  t.r(m, 0, toothW, inset + 1, 'g').r(m, n - inset - 1, toothW, inset + 1, 'g');
  t.r(0, m, inset + 1, toothW, 'g').r(n - inset - 1, m, inset + 1, toothW, 'g');
  const far = n - 2 - diag;
  t.r(2, 2, diag, diag, 'g').r(far, 2, diag, diag, 'g').r(2, far, diag, diag, 'g').r(far, far, diag, diag, 'g');
  t.ol('k').bev('g', 'h', 's');
  const hx = (n - hole) / 2;
  t.e(hx, hx, hole, hole, 'k', '_');
  if (hole <= 4) t.r(hx + 1, hx + 1, hole - 2, hole - 2, '_');
  return t;
}

/* ---- Plant parts (pass two). Shared by the set-piece app icons and their toolbar icons. ---- */

/**
 * Axial fan seen square-on: four swept blades on a hub inside a dark round opening of diameter `d`.
 * The opening rim is drawn by the caller's housing; this draws the opening, blades and hub.
 */
export function fanAt(c: Cv, x: number, y: number, d: number): void {
  c.e(x, y, d, d, 'k', 'a');
  if (d < 18) {
    // Too small to compute: hand-pixelled blades, top-left blade given, the others turned 90 degrees.
    const g = d - 2;
    const blade: ReadonlyArray<readonly [number, number]> =
      g >= 10
        ? [[2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [2, 3], [3, 3]]
        : [[1, 1], [2, 1], [2, 2], [3, 2]];
    const ox = x + 1;
    const oy = y + 1;
    const mask = new Set<number>();
    for (const [bx, by] of blade) {
      let px = bx;
      let py = by;
      for (let k = 0; k < 4; k++) {
        mask.add(py * 64 + px);
        [px, py] = [g - 1 - py, px];
      }
    }
    const has = (i: number, j: number): boolean => mask.has(j * 64 + i);
    for (let j = -1; j <= g; j++) {
      for (let i = -1; i <= g; i++) {
        if (has(i, j)) {
          const hi = !has(i - 1, j) || !has(i, j - 1);
          const sh = !has(i + 1, j) || !has(i, j + 1);
          c.p(ox + i, oy + j, hi && i + j < g ? 'h' : sh && i + j >= g - 1 ? 's' : 'g');
        } else if (has(i - 1, j) || has(i + 1, j) || has(i, j - 1) || has(i, j + 1)) {
          c.p(ox + i, oy + j, 'k');
        }
      }
    }
    const hd = g >= 10 ? 4 : 2;
    const ho = (g - hd) / 2;
    if (hd === 2) c.r(ox + ho, oy + ho, 2, 2, 'k');
    else c.e(ox + ho, oy + ho, hd, hd, 'k', 'f');
    return;
  }
  const t = new Cv(c.n);
  const cx = x + d / 2;
  const cy = y + d / 2;
  const R = d / 2 - 0.5;
  // Four petal blades, each an ellipse on a diagonal, sheared a little so they read as swept.
  const A = R * 0.42;
  const B = R * 0.34;
  const m = R * 0.46;
  for (let j = y; j < y + d; j++) {
    for (let i = x; i < x + d; i++) {
      const dx = i + 0.5 - cx;
      const dy = j + 0.5 - cy;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        const u = dx * Math.cos(a) + dy * Math.sin(a) - m;
        const v = -dx * Math.sin(a) + dy * Math.cos(a) + 0.35 * u;
        if ((u / A) ** 2 + (v / B) ** 2 <= 1) t.p(i, j, 'g');
      }
    }
  }
  t.ol('k').bev('g', 'h', 's');
  c.blit(t, 0, 0);
  const hd = Math.max(4, Math.round(d / 3.5));
  const ho = (d - hd) / 2;
  c.e(Math.round(x + ho), Math.round(y + ho), hd, hd, 'k', 'f');
}

/** Blast door leaf with a handwheel, 16px. Occupies x 0..12, y 0..13. */
export function blastDoor16(c: Cv): void {
  c.bx(0, 0, 13, 14, 'g', 'h', 's');
  c.h(2, 11, 9, 's');
  c.e(2, 2, 9, 9, 'k');
  c.v(6, 3, 7, 'k').h(3, 6, 7, 'k');
  c.r(5, 5, 3, 3, 'a');
}

/** Blast door leaf with a handwheel, 32px. Occupies x 1..25, y 1..28. */
export function blastDoor32(c: Cv): void {
  c.r(0, 6, 2, 4, 'k').r(0, 19, 2, 4, 'k');
  c.bx(1, 1, 25, 28, 'g', 'h', 's');
  c.b(4, 4, 19, 22, 's').h(5, 25, 17, 'h').v(22, 5, 20, 'h');
  c.e(6, 6, 15, 15, 'k').e(7, 7, 13, 13, 'd');
  c.r(13, 7, 1, 13, 'k').r(7, 13, 13, 1, 'k');
  c.b(11, 11, 5, 5, 'k', 'a').p(12, 12, 'e');
}

/** ID badge on a clip, 16px, at (x, y): 8 x 9. The personnel badge, hung. */
export function badge16(c: Cv, x: number, y: number): void {
  c.r(x + 3, y, 2, 2, 'k');
  c.g(x, y + 2, ['kkkkkkkk', 'knnnnnnk', 'kwwwwwwk', 'kwwaawwk', 'kwwaawwk', 'kwaaaawk', 'kkkkkkkk']);
}

/** ID badge on a clip, 32px, at (x, y): 15 x 19. The personnel badge drawing. */
export function badge32(c: Cv, x: number, y: number): void {
  c.r(x + 5, y, 5, 2, 'k').r(x + 6, y, 3, 1, 'g');
  c.bx(x, y + 2, 15, 17, 'w', 'w', 'q');
  c.r(x + 1, y + 3, 13, 3, 'n');
  c.b(x + 2, y + 8, 6, 7, 'k', 'l');
  c.r(x + 4, y + 9, 2, 2, 'a').r(x + 3, y + 12, 4, 2, 'a');
  c.h(x + 9, y + 9, 4, 'q').h(x + 9, y + 11, 4, 'q').h(x + 9, y + 13, 3, 'q');
  for (const i of [2, 4, 5, 7, 9, 10, 12]) c.p(x + i, y + 16, 'k');
}

/** Industrial door in a slate frame, 16px. `leaf` false shows the opening with the leaf slid back. */
export function door16(c: Cv, leaf: boolean): void {
  c.bx(1, 0, 14, 16, 'e', 'l', 'a');
  c.b(3, 3, 10, 13, 'k', 'a');
  if (leaf) {
    c.bx(4, 4, 8, 12, 'g', 'h', 's');
    c.b(6, 6, 4, 3, 'k', 'l');
    c.v(10, 10, 3, 'k');
  } else {
    c.r(4, 12, 8, 3, 'e').h(4, 12, 8, 'd');
    c.bx(4, 4, 3, 12, 'g', 'h', 's');
  }
}

/** Industrial door in a slate frame, 32px. */
export function door32(c: Cv, leaf: boolean): void {
  c.bx(3, 1, 26, 30, 'e', 'l', 'a');
  c.b(6, 4, 20, 27, 'k', 'a');
  if (leaf) {
    c.bx(7, 5, 18, 26, 'g', 'h', 's');
    c.b(11, 8, 10, 7, 'k', 'l').h(12, 9, 3, 'w');
    c.b(10, 18, 12, 9, 's').h(11, 26, 10, 'h').v(21, 19, 7, 'h');
    c.r(21, 15, 2, 5, 'k');
  } else {
    c.r(7, 23, 18, 7, 'e').h(7, 23, 18, 'd').h(7, 26, 18, 'q');
    c.b(14, 10, 6, 13, 'd');
    c.bx(7, 5, 5, 26, 'g', 'h', 's');
  }
}

/** Alarm bell in brass with its clapper, on its own canvas, top left (room for an overlay bottom right). */
export function bell(n: 16 | 32): Cv {
  const t = new Cv(n);
  // half-widths per row, knob to lip
  const hw = n === 16 ? [1, 1, 3, 4, 4, 4, 5, 5, 6, 6] : [2, 2, 2, 5, 7, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 12, 12, 13, 13];
  const cx = n === 16 ? 6 : 13;
  const y0 = n === 16 ? 1 : 1;
  hw.forEach((w, j) => t.h(cx - w, y0 + j, 2 * w + 1, 'o'));
  t.ol('k').bev('o', 'y', 'u');
  const lip = y0 + hw.length - (n === 16 ? 3 : 4);
  for (let x = 0; x < n; x++) {
    const ch = t.get(x, lip);
    if (ch !== '.' && ch !== 'k') t.p(x, lip, 'u');
  }
  const yb = y0 + hw.length;
  if (n === 16) t.r(cx - 1, yb, 3, 2, 'k').p(cx, yb, 'g');
  else t.e(cx - 3, yb - 1, 7, 6, 'k', 'g').r(cx - 1, yb, 2, 1, 'h');
  return t;
}

/** Two-aspect colour-light signal head on a post. `aspect` is the lit lamp. */
export function signal(c: Cv, n: 16 | 32, aspect: 'stop' | 'clear'): void {
  const top = aspect === 'stop';
  if (n === 16) {
    c.r(7, 13, 2, 2, 'k').h(4, 15, 8, 'k');
    c.b(3, 0, 10, 14, 'k', 'a');
    c.e(4, 1, 8, 6, 'k', top ? 'r' : 'd').e(4, 7, 8, 6, 'k', top ? 'd' : 'v');
    if (top) c.r(6, 3, 2, 1, 't');
    else c.r(6, 9, 2, 1, 'h');
  } else {
    c.bx(14, 26, 4, 5, 'g', 'h', 's').r(9, 30, 14, 2, 'k');
    c.bx(6, 0, 20, 27, 'a', 'e', 'k');
    for (const [y, lit, fill, glint] of [
      [2, top, 'r', 't'],
      [14, !top, 'v', 'h'],
    ] as const) {
      c.e(8, y, 16, 12, 'k', lit ? fill : 'd');
      c.h(8, y - 1, 16, 'k');
      if (lit) c.r(12, y + 3, 4, 2, glint).p(12, y + 5, glint);
      else c.r(12, y + 3, 3, 1, 's');
    }
  }
}

/** Small padlock on its own canvas (used alone and as the folder overlay). */
export function padlock16(): Cv {
  const t = new Cv(16);
  t.g(0, 1, [
    '.....kkkkkk.....',
    '....kgggggsk....',
    '...kgskkkkgsk...',
    '...kgsk..kgsk...',
    '...kgsk..kgsk...',
    '..kkkkkkkkkkkk..',
    '..kyyyyyyyyyuk..',
    '..kyoooooooouk..',
    '..kyoookkooouk..',
    '..kyoookkooouk..',
    '..kyoookkooouk..',
    '..kyoooooooouk..',
    '..kuuuuuuuuuuk..',
    '..kkkkkkkkkkkk..',
  ]);
  return t;
}
