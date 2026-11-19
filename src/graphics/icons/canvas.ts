/**
 * MERIDIAN icon set: integer pixel canvas.
 *
 * Every icon is authored on a 16x16 or 32x32 integer grid, one palette "ink"
 * (a single character) per pixel. There is no anti-aliasing and no sub-pixel
 * geometry anywhere: what is authored is what is rendered.
 */

/** The whole icon palette. One character per ink. See README.md. */
export const PALETTE = {
  k: '#23272C', // outline
  d: '#5B5A56', // chrome outer line / dark grey
  s: '#8C8A84', // chrome shadow
  g: '#B5B2AA', // mid grey (metal)
  f: '#D6D3CB', // chrome face
  h: '#F4F2EC', // chrome highlight
  w: '#FFFFFF', // white stock
  p: '#F3F1EA', // paper
  q: '#A3A096', // greeked text / rule on paper
  n: '#1F3552', // navy (title bar)
  b: '#4A6587', // navy highlight
  l: '#AFBBC8', // light slate (glass, water)
  a: '#3A4652', // slate (workspace)
  e: '#7C8591', // mid slate (inactive title)
  o: '#A8842C', // ochre
  y: '#DCCB94', // manila highlight
  m: '#C4AE6C', // manila
  u: '#86703A', // manila shadow / board
  r: '#7A1F1F', // oxblood
  t: '#B0605A', // oxblood highlight
  v: '#2E6B3F', // dull green (link up, ready lamp)
} as const;

export type Ink = keyof typeof PALETTE;

const EMPTY = '.';
/** In a stamp or an op, `_` erases to transparent; `.` in a stamp is "leave as is". */
const ERASE = '_';

function isInk(ch: string): ch is Ink {
  return Object.prototype.hasOwnProperty.call(PALETTE, ch);
}

export type Draw = (c: Cv) => void;

/** `s` = 16px, `l` = 32px. `sg`/`lg` are the bare-glyph drawings of icons that default to a bevelled button. */
export interface IconDef {
  readonly s: Draw;
  readonly l: Draw;
  readonly sg?: Draw;
  readonly lg?: Draw;
}

export class Cv {
  readonly n: number;
  readonly d: string[];

  constructor(n: number) {
    this.n = n;
    this.d = new Array<string>(n * n).fill(EMPTY);
  }

  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.n || y >= this.n) return EMPTY;
    return this.d[y * this.n + x] ?? EMPTY;
  }

  /** One pixel. */
  p(x: number, y: number, ch: string): this {
    if (x < 0 || y < 0 || x >= this.n || y >= this.n) return this;
    if (ch === ERASE) this.d[y * this.n + x] = EMPTY;
    else if (isInk(ch)) this.d[y * this.n + x] = ch;
    else throw new Error(`icons: unknown ink "${ch}"`);
    return this;
  }

  /** Filled rectangle. */
  r(x: number, y: number, w: number, h: number, ch: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, ch);
    return this;
  }

  h(x: number, y: number, w: number, ch: string): this {
    return this.r(x, y, w, 1, ch);
  }

  v(x: number, y: number, h: number, ch: string): this {
    return this.r(x, y, 1, h, ch);
  }

  /** 1px outlined box, optionally filled. */
  b(x: number, y: number, w: number, h: number, ch: string, fill?: string): this {
    if (fill !== undefined) this.r(x + 1, y + 1, w - 2, h - 2, fill);
    this.h(x, y, w, ch).h(x, y + h - 1, w, ch);
    this.v(x, y, h, ch).v(x + w - 1, y, h, ch);
    return this;
  }

  /** The house solid: outline, fill, 1px highlight top/left, 1px shadow bottom/right. */
  bx(x: number, y: number, w: number, h: number, fill: string, hi: string, sh: string, out = 'k'): this {
    this.b(x, y, w, h, out, fill);
    this.h(x + 1, y + 1, w - 2, hi).v(x + 1, y + 1, h - 2, hi);
    this.h(x + 1, y + h - 2, w - 2, sh).v(x + w - 2, y + 1, h - 2, sh);
    return this;
  }

  /** Bresenham line. */
  l(x0: number, y0: number, x1: number, y1: number, ch: string): this {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.p(x, y, ch);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Pixel ellipse inscribed in the box; `ch` is the rim, `fill` the inside. */
  e(x: number, y: number, w: number, h: number, ch: string, fill?: string): this {
    const inside = (i: number, j: number): boolean => {
      if (i < 0 || j < 0 || i >= w || j >= h) return false;
      const nx = (i + 0.5 - w / 2) / (w / 2);
      const ny = (j + 0.5 - h / 2) / (h / 2);
      return nx * nx + ny * ny <= 1.0;
    };
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!inside(i, j)) continue;
        const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
        if (edge) this.p(x + i, y + j, ch);
        else if (fill !== undefined) this.p(x + i, y + j, fill);
      }
    }
    return this;
  }

  /** Stamp hand-pixelled rows. `.` or space leaves the pixel alone, `_` erases. */
  g(x: number, y: number, rows: readonly string[]): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row.charAt(i);
        if (ch === EMPTY || ch === ' ') continue;
        this.p(x + i, y + j, ch);
      }
    });
    return this;
  }

  /** Turn the boundary pixels of everything drawn so far into an outline. */
  ol(ch = 'k'): this {
    const edge: number[] = [];
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        if (this.get(x, y) === EMPTY) continue;
        if (
          this.get(x - 1, y) === EMPTY ||
          this.get(x + 1, y) === EMPTY ||
          this.get(x, y - 1) === EMPTY ||
          this.get(x, y + 1) === EMPTY
        ) {
          edge.push(y * this.n + x);
        }
      }
    }
    for (const i of edge) this.d[i] = ch;
    return this;
  }

  /** 1px bevel on a `fill` region that is bounded by `out`. */
  bev(fill: string, hi: string, sh: string, out = 'k'): this {
    const marks: Array<[number, string]> = [];
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        if (this.get(x, y) !== fill) continue;
        if (this.get(x - 1, y) === out || this.get(x, y - 1) === out) {
          if (x + y < this.n) marks.push([y * this.n + x, hi]);
        } else if (this.get(x + 1, y) === out || this.get(x, y + 1) === out) {
          if (x + y >= this.n) marks.push([y * this.n + x, sh]);
        }
      }
    }
    for (const [i, ch] of marks) this.d[i] = ch;
    return this;
  }

  /** Copy another canvas in, skipping its transparent pixels. Integer scale only. */
  blit(src: Cv, x: number, y: number, scale = 1): this {
    for (let j = 0; j < src.n; j++) {
      for (let i = 0; i < src.n; i++) {
        const ch = src.get(i, j);
        if (ch === EMPTY) continue;
        this.r(x + i * scale, y + j * scale, scale, scale, ch);
      }
    }
    return this;
  }

  flipH(): this {
    const n = this.n;
    for (let y = 0; y < n; y++) {
      const row = this.d.slice(y * n, y * n + n).reverse();
      row.forEach((ch, x) => {
        this.d[y * n + x] = ch;
      });
    }
    return this;
  }

  flipV(): this {
    const n = this.n;
    const copy = this.d.slice();
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) this.d[y * n + x] = copy[(n - 1 - y) * n + x] ?? EMPTY;
    }
    return this;
  }
}

export interface InkPath {
  readonly fill: string;
  readonly d: string;
}

/** One SVG path per ink, built from horizontal pixel runs. */
export function toPaths(c: Cv): InkPath[] {
  const by = new Map<string, string[]>();
  for (let y = 0; y < c.n; y++) {
    let x = 0;
    while (x < c.n) {
      const ch = c.get(x, y);
      if (ch === EMPTY) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < c.n && c.get(x + w, y) === ch) w++;
      const list = by.get(ch) ?? [];
      list.push(`M${x} ${y}h${w}v1h-${w}z`);
      by.set(ch, list);
      x += w;
    }
  }
  const out: InkPath[] = [];
  for (const [ch, segs] of by) {
    if (isInk(ch)) out.push({ fill: PALETTE[ch], d: segs.join('') });
  }
  return out;
}
