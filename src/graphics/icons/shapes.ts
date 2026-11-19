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
