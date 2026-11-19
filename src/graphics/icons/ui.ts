/** Shell and toolbar icons. Window-button and tree glyphs are single-ink so they sit on a bevelled button. */
import { Cv, type Draw, type IconDef } from './canvas';
import { Q_LARGE } from './files';
import { A, btn, env, mirror, mon, padlock16, upturn } from './shapes';

// 32px caption glyphs: drawn for the size, strokes three to four pixels heavy.
const close32: Draw = (c) => {
  for (let i = 0; i <= 13; i++) c.r(7 + i, 8 + i, 4, 1, 'k').r(20 - i, 8 + i, 4, 1, 'k');
};
const minimize32: Draw = (c) => {
  c.r(8, 21, 12, 3, 'k');
};
const maximize32: Draw = (c) => {
  c.b(7, 7, 17, 16, 'k').b(8, 8, 15, 14, 'k').r(7, 7, 17, 4, 'k');
};
const restore32: Draw = (c) => {
  c.b(11, 6, 14, 12, 'k').b(12, 7, 12, 10, 'k').r(11, 6, 14, 4, 'k');
  c.r(6, 12, 14, 12, '_');
  c.b(6, 12, 14, 12, 'k').b(7, 13, 12, 10, 'k').r(6, 12, 14, 4, 'k');
};
const sortAsc32: Draw = (c) => {
  for (let i = 0; i <= 6; i++) c.h(14 - i, 11 + i, 2 + 2 * i, 'k');
};
const tree32 =
  (plus: boolean, box: boolean): Draw =>
  (c) => {
    if (box) c.b(6, 6, 19, 19, 's', 'w').b(7, 7, 17, 17, 's');
    c.r(10, 14, 11, 3, 'k');
    if (plus) c.r(14, 10, 3, 11, 'k');
  };
const tree16 =
  (plus: boolean): Draw =>
  (c) => {
    c.h(5, 7, 5, 'k');
    if (plus) c.v(7, 5, 5, 'k');
  };

const close16 = A(4, [
  '....kk....kk....',
  '.....kk..kk.....',
  '......kkkk......',
  '.......kk.......',
  '......kkkk......',
  '.....kk..kk.....',
  '....kk....kk....',
]);

const minimize16 = A(10, ['....kkkkkk......', '....kkkkkk......']);

const maximize16 = A(3, [
  '...kkkkkkkkk....',
  '...kkkkkkkkk....',
  '...k.......k....',
  '...k.......k....',
  '...k.......k....',
  '...k.......k....',
  '...k.......k....',
  '...k.......k....',
  '...kkkkkkkkk....',
]);

const restore16 = A(2, [
  '.....kkkkkkkk...',
  '.....kkkkkkkk...',
  '.....k......k...',
  '...kkkkkkkk.k...',
  '...kkkkkkkk.k...',
  '...k......k.k...',
  '...k......kkk...',
  '...k......k.....',
  '...k......k.....',
  '...kkkkkkkk.....',
]);

const sortAsc16 = A(6, ['.......kk.......', '......kkkk......', '.....kkkkkk.....', '....kkkkkkkk....']);

const treeExpand16 = A(3, [
  '...sssssssss....',
  '...swwwwwwws....',
  '...swwwkwwws....',
  '...swwwkwwws....',
  '...swkkkkkws....',
  '...swwwkwwws....',
  '...swwwkwwws....',
  '...swwwwwwws....',
  '...sssssssss....',
]);

const treeCollapse16 = A(3, [
  '...sssssssss....',
  '...swwwwwwws....',
  '...swwwwwwws....',
  '...swwwwwwws....',
  '...swkkkkkws....',
  '...swwwwwwws....',
  '...swwwwwwws....',
  '...swwwwwwws....',
  '...sssssssss....',
]);

const back16 = A(3, [
  '.......k........',
  '......kk........',
  '.....knk........',
  '....knnkkkkkkk..',
  '...knbbbbbbbbk..',
  '..knnnnnnnnnnk..',
  '...knnnnnnnnnk..',
  '....knnkkkkkkk..',
  '.....knk........',
  '......kk........',
  '.......k........',
]);

const back32: Draw = (c) => {
  const t = new Cv(32);
  for (let i = 0; i <= 9; i++) t.v(5 + i, 15 - i, 2 + 2 * i, 'n');
  t.r(15, 11, 11, 10, 'n');
  t.ol('k').bev('n', 'b', 'a');
  c.blit(t, 0, 0);
};

const printer16 = A(1, [
  '....kkkkkkkk....',
  '....kwwwwwwk....',
  '....kwqqqqwk....',
  '....kwwwwwwk....',
  '.kkkkkkkkkkkkkk.',
  'khhhhhhhhhhhhhsk',
  'khffffffffffvfsk',
  'khffffffffffffsk',
  'kssssssssssssssk',
  'kkkkkkkkkkkkkkkk',
  '...kwwwwwwwwk...',
  '...kwqqqqqqwk...',
  '...kwwwwwwwwk...',
  '...kkkkkkkkkk...',
]);

const printer32: Draw = (c) => {
  c.b(8, 1, 16, 11, 'k', 'w');
  c.h(11, 4, 10, 'q').h(11, 6, 10, 'q').h(11, 8, 6, 'q');
  c.bx(1, 11, 30, 13, 'f', 'h', 's');
  c.h(2, 11, 28, 'k').p(1, 11, '_').p(30, 11, '_');
  c.r(5, 14, 16, 2, 'k').h(5, 16, 16, 'h');
  c.r(26, 14, 2, 2, 'v').r(23, 14, 2, 2, 'd');
  c.h(3, 19, 26, 's');
  c.b(6, 20, 20, 10, 'k', 'w');
  c.h(9, 23, 14, 'q').h(9, 25, 14, 'q').h(9, 27, 9, 'q');
  c.h(8, 30, 19, 's');
};

const net16 = (cable: string, scr: string): Draw =>
  A(
    1,
    [
      'kkkkkkkk........',
      'kbbbbbbk........',
      'kbbbbbbk........',
      'kbbbbbbk........',
      'kkkkkkkk........',
      '..kggk..kkkkkkkk',
      '.kkkkkk.kbbbbbbk',
      '...v....kbbbbbbk',
      '...v....kbbbbbbk',
      '...v....kkkkkkkk',
      '...v......kggk..',
      '...v.....kkkkkk.',
      '...v........v...',
      '...vvvvvvvvvv...',
    ].map((row) => row.replaceAll('v', cable).replaceAll('b', scr)),
  );

const net32 = (c: Cv, cable: string, scr: string): void => {
  const station = (x: number, y: number): void => {
    mon(c, x, y, 15, 12, scr);
    c.r(x + 6, y + 12, 3, 2, 'g').v(x + 5, y + 12, 2, 'k').v(x + 9, y + 12, 2, 'k');
    c.r(x + 2, y + 14, 11, 2, 'k').h(x + 3, y + 14, 9, 'f');
  };
  station(1, 1);
  station(16, 12);
  c.r(8, 17, 2, 12, cable).r(8, 29, 16, 2, cable).r(22, 28, 2, 1, cable);
};

export const UI = {
  close: btn(close16, close32),
  minimize: btn(minimize16, minimize32),
  maximize: btn(maximize16, maximize32),
  restore: btn(restore16, restore32),

  search: {
    s: (c) => {
      for (let i = 0; i <= 5; i++) c.r(9 + i, 9 + i, 2, 2, 'k');
      c.e(1, 1, 10, 10, 'k', 'l');
      c.p(4, 3, 'w').p(3, 4, 'w').p(5, 3, 'w');
    },
    l: (c) => {
      for (let i = 0; i <= 10; i++) c.r(18 + i, 17 + i, 4, 4, 'k');
      for (let i = 0; i <= 8; i++) c.r(20 + i, 19 + i, 2, 2, 'u');
      c.e(1, 1, 21, 21, 'k', 'g');
      c.e(3, 3, 17, 17, 'k', 'l');
      c.l(7, 10, 10, 7, 'w').l(7, 11, 11, 7, 'w');
    },
  },

  print: { s: printer16, l: printer32 },

  'printer-queue': {
    s: (c) => {
      printer16(c);
      c.g(8, 8, ['kkkkkkkk', 'kwwwwwwk', 'kwnwddwk', 'kwwwwwwk', 'kwnwddwk', 'kwwwwwwk', 'kwnwddwk', 'kkkkkkkk']);
    },
    l: (c) => {
      printer32(c);
      c.b(15, 15, 16, 16, 'k', 'w');
      for (const y of [18, 22, 26]) c.r(18, y, 2, 2, 'n').h(22, y, 6, 'q').h(22, y + 1, 4, 'q');
    },
  },

  lock: {
    s: (c) => {
      c.blit(padlock16(), 0, 0);
    },
    l: (c) => {
      const t = new Cv(32);
      t.e(8, 1, 16, 20, 'g', 'g');
      t.e(12, 5, 8, 14, '_', '_');
      t.r(12, 12, 8, 8, '_');
      t.ol('k').bev('g', 'h', 's');
      c.blit(t, 0, 0);
      c.bx(4, 13, 24, 17, 'o', 'y', 'u');
      c.r(14, 17, 4, 3, 'k').r(15, 20, 2, 4, 'k');
      c.h(5, 30, 24, 's');
    },
  },

  /** Smart token: body, lanyard eye, label, contact tongue. */
  'key-token': {
    s: A(3, [
      '.kkkkkkkkkk.....',
      'kbnnnnnnnnnk....',
      'kbnnnnnnnnnkkkkk',
      'kbkknnwwwnnkhhgk',
      'kbk.knwwwnnkgkgk',
      'kbk.knnnnvnkgkgk',
      'kbkknnnnnnnkgggk',
      'kbnnnnnnnnnkkkkk',
      'kannnnnnnnnk....',
      '.kkkkkkkkkk.....',
    ]),
    l: (c) => {
      const t = new Cv(32);
      t.bx(1, 7, 21, 18, 'n', 'b', 'a');
      t.p(1, 7, '_').p(1, 24, '_').p(2, 8, 'k').p(2, 23, 'k');
      t.e(4, 13, 6, 6, 'k', '_');
      t.b(12, 10, 8, 6, 'k', 'w').h(13, 12, 6, 'q').h(13, 13, 4, 'q');
      t.r(13, 19, 2, 2, 'v').h(16, 20, 3, 'b');
      t.bx(21, 10, 10, 12, 'g', 'h', 's');
      t.r(24, 13, 4, 2, 'k').r(24, 17, 4, 2, 'k');
      c.blit(t, 0, 0);
    },
  },

  hourglass: {
    s: A(0, [
      '..kkkkkkkkkkkk..',
      '..kuuuuuuuuuuk..',
      '..kkkkkkkkkkkk..',
      '...kwwwwwwwwk...',
      '...kwyyyyyywk...',
      '....kwyyyywk....',
      '.....kwyywk.....',
      '......kyyk......',
      '.....kwyywk.....',
      '....kwwyywwk....',
      '...kwwyyyywwk...',
      '...kwyyyyyywk...',
      '..kkkkkkkkkkkk..',
      '..kuuuuuuuuuuk..',
      '..kkkkkkkkkkkk..',
    ]),
    l: (c) => {
      c.bx(4, 1, 24, 4, 'u', 'm', 'u');
      c.bx(4, 27, 24, 4, 'u', 'm', 'u');
      for (let i = 0; i <= 9; i++) {
        const x0 = 6 + i;
        const w = 20 - 2 * i;
        // upper bulb
        c.h(x0, 5 + i, w, i >= 4 ? 'y' : 'w').p(x0, 5 + i, 'k').p(x0 + w - 1, 5 + i, 'k');
        if (i >= 4 && w > 4) c.p(x0 + 1, 5 + i, 'w').p(x0 + w - 2, 5 + i, 'w');
        // lower bulb
        c.h(x0, 26 - i, w, i <= 4 ? 'y' : 'w').p(x0, 26 - i, 'k').p(x0 + w - 1, 26 - i, 'k');
        if (i <= 4) c.p(x0 + 1, 26 - i, 'w').p(x0 + w - 2, 26 - i, 'w');
      }
      c.r(15, 15, 2, 7, 'y').v(14, 15, 2, 'k').v(17, 15, 2, 'k');
      c.r(13, 21, 6, 1, 'y');
    },
  },

  info: {
    s: (c) => {
      c.e(1, 1, 14, 14, 'k', 'n');
      c.g(6, 4, ['.ww.', '.ww.', '....', 'www.', '.ww.', '.ww.', '.ww.', 'wwww']);
    },
    l: (c) => {
      c.e(2, 2, 28, 28, 'k', 'n');
      c.e(3, 3, 26, 26, 'b');
      c.r(14, 7, 4, 4, 'w').r(12, 13, 6, 2, 'w').r(14, 13, 4, 11, 'w').r(12, 23, 8, 2, 'w');
    },
  },

  /** Stop sign in dull oxblood with a white cross. No triangle, no exclamation mark. */
  error: {
    s: A(1, [
      '.....kkkkkk.....',
      '....krrrrrrk....',
      '...krrrrrrrrk...',
      '..krrrrrrrrrrk..',
      '.krrwwrrrrwwrrk.',
      '.krrrwwrrwwrrrk.',
      '.krrrrwwwwrrrrk.',
      '.krrrrwwwwrrrrk.',
      '.krrrwwrrwwrrrk.',
      '.krrwwrrrrwwrrk.',
      '..krrrrrrrrrrk..',
      '...krrrrrrrrk...',
      '....krrrrrrk....',
      '.....kkkkkk.....',
    ]),
    l: (c) => {
      for (let j = 0; j < 28; j++) {
        const ins = j < 8 ? 8 - j : j > 19 ? j - 19 : 0;
        const edge = j === 0 || j === 27;
        c.h(2 + ins, 2 + j, 28 - 2 * ins, edge ? 'k' : 'r');
        c.p(2 + ins, 2 + j, 'k').p(29 - ins, 2 + j, 'k');
        if (!edge && j < 8) c.p(3 + ins, 2 + j, 't');
      }
      c.h(11, 3, 10, 't');
      for (let i = 0; i <= 11; i++) c.r(9 + i, 10 + i, 3, 1, 'w').r(20 - i, 10 + i, 3, 1, 'w');
    },
  },

  question: {
    s: (c) => {
      c.e(1, 1, 14, 14, 'k', 'w');
      c.g(5, 4, ['.nnnn.', 'nn..nn', '....nn', '...nn.', '..nn..', '......', '..nn..', '..nn..']);
    },
    l: (c) => {
      c.e(2, 2, 28, 28, 'k', 'w');
      c.g(11, 9, Q_LARGE);
    },
  },

  'network-link': {
    s: net16('v', 'b'),
    l: (c) => {
      net32(c, 'v', 'b');
    },
  },

  'network-link-down': {
    s: (c) => {
      net16('d', 'g')(c);
      c.r(4, 12, 9, 3, '_');
      c.g(5, 10, ['rr..rr', '.rrrr.', '..rr..', '.rrrr.', 'rr..rr']);
    },
    l: (c) => {
      net32(c, 'd', 'g');
      c.r(4, 19, 12, 12, '_');
      c.r(8, 17, 2, 2, 'd').r(16, 29, 8, 2, 'd');
      for (let i = 0; i <= 8; i++) c.r(3 + i, 20 + i, 3, 2, 'r').r(11 - i, 20 + i, 3, 2, 'r');
    },
  },

  'mail-unread': {
    s: (c) => {
      env(c, 0, 4, 16, 11);
      c.h(2, 11, 4, 'n');
      c.e(10, 0, 6, 6, 'k', 'r');
    },
    l: (c) => {
      env(c, 1, 8, 30, 21);
      c.h(4, 22, 9, 'n').h(4, 24, 7, 'n');
      c.h(3, 29, 29, 's').v(31, 12, 17, 's');
      c.e(20, 1, 11, 11, 'k', 'r');
      c.r(24, 5, 3, 3, 'w');
    },
  },

  clock: {
    s: (c) => {
      c.e(1, 1, 14, 14, 'k', 'w');
      c.p(8, 2, 's').p(13, 8, 's').p(2, 8, 's').p(8, 13, 's');
      c.v(8, 4, 5, 'k').h(8, 8, 3, 'k');
    },
    l: (c) => {
      c.e(1, 1, 30, 30, 'k', 'g');
      c.e(2, 2, 28, 28, 'h');
      c.e(4, 4, 24, 24, 'k', 'w');
      c.r(15, 6, 2, 2, 'd').r(15, 24, 2, 2, 'd').r(6, 15, 2, 2, 'd').r(24, 15, 2, 2, 'd');
      c.r(15, 9, 2, 8, 'k').r(15, 15, 7, 2, 'k');
      c.l(16, 16, 11, 21, 'r');
    },
  },

  user: {
    s: A(1, [
      '......kkkk......',
      '.....khffsk.....',
      '.....kffffk.....',
      '.....kffffk.....',
      '.....kfffsk.....',
      '......kssk......',
      '....kkkkkkkk....',
      '...kbnnwwnnnk...',
      '..kbnnnwwnnnnk..',
      '..kbnnnnnnnnnk..',
      '..kbnnnnnnnnnk..',
      '..kbnnnnnnnnnk..',
      '..kkkkkkkkkkkk..',
    ]),
    l: (c) => {
      const t = new Cv(32);
      for (let j = 0; j <= 4; j++) t.h(9 - j, 16 + j, 14 + 2 * j, 'n');
      t.r(4, 21, 24, 9, 'n');
      t.ol('k').bev('n', 'b', 'a');
      c.blit(t, 0, 0);
      c.r(13, 17, 6, 1, 'w').r(14, 18, 4, 1, 'w').r(15, 19, 2, 2, 'w');
      c.r(15, 21, 2, 6, 'a');
      const hd = new Cv(32);
      hd.e(10, 2, 12, 14, 'f', 'f');
      hd.ol('k').bev('f', 'h', 's');
      c.blit(hd, 0, 0);
      c.r(13, 15, 6, 2, 'k').h(14, 15, 4, 's');
    },
  },

  /** Audit log: bound pad of time-stamped entries, one flagged. */
  'audit-log': {
    s: A(1, [
      '..kkkkkkkkkkkk..',
      '..kaaaaaaaaaak..',
      '..kkkkkkkkkkkk..',
      '..kwwwwwwwwwwk..',
      '..kwnnwddddwwk..',
      '..kwwwwwwwwwwk..',
      '..kwnnwdddddwk..',
      '..kwwwwwwwwwwk..',
      '..kwrrwddddwwk..',
      '..kwwwwwwwwwwk..',
      '..kwnnwdddddwk..',
      '..kwwwwwwwwwwk..',
      '..kwnnwdddwwwk..',
      '..kkkkkkkkkkkk..',
    ]),
    l: (c) => {
      c.b(4, 1, 24, 30, 'k', 'w');
      c.r(5, 2, 22, 4, 'a').h(4, 6, 24, 'k');
      for (let x = 7; x <= 25; x += 3) c.r(x, 3, 1, 2, 'h');
      [9, 13, 17, 21, 25].forEach((y, k) => {
        c.r(7, y, 5, 2, k === 2 ? 'r' : 'n');
        c.h(14, y, k % 2 === 0 ? 10 : 11, 'q').h(14, y + 1, k % 2 === 0 ? 7 : 5, 'q');
      });
      c.v(28, 3, 28, 's').h(6, 31, 23, 's');
    },
  },

  /** Run: a small dialog with one entry field. */
  run: {
    s: A(1, [
      'kkkkkkkkkkkkkkkk',
      'knnnnnnnnnnnnnnk',
      'kkkkkkkkkkkkkkkk',
      'khhhhhhhhhhhhhsk',
      'khffffffffffffsk',
      'khfssssssssssfsk',
      'khfskwwwwwwwhfsk',
      'khfskwwwwwwwhfsk',
      'khfshhhhhhhhhfsk',
      'khffffffffffffsk',
      'khfffffffkkkkfsk',
      'khfffffffkhfkfsk',
      'khfffffffkkkkfsk',
      'kkkkkkkkkkkkkkkk',
    ]),
    l: (c) => {
      c.bx(1, 4, 30, 25, 'f', 'h', 's');
      c.r(3, 6, 26, 4, 'n').h(5, 8, 7, 'b').r(25, 7, 3, 2, 'f');
      c.h(5, 13, 4, 'd');
      c.b(11, 12, 17, 6, 's', 'w').h(12, 17, 15, 'h').v(27, 13, 5, 'h');
      c.v(13, 13, 4, 'k').h(15, 15, 6, 'd');
      c.bx(11, 21, 8, 6, 'f', 'h', 's').h(13, 23, 4, 'd');
      c.bx(20, 21, 8, 6, 'f', 'h', 's').h(22, 23, 4, 'd');
    },
  },

  refresh: btn(
    A(2, [
      '.....nnnn..n....',
      '...nnnnnnnnn....',
      '..nnn....nnn....',
      '..nn....nnnn....',
      '..nn............',
      '................',
      '...........nn...',
      '...nnnn....nn...',
      '...nnn....nnn...',
      '...nnnnnnnnn....',
      '...n..nnnn......',
    ]),
    (c) => {
      const t = new Cv(32);
      t.e(5, 5, 21, 21, 'n', 'n');
      t.e(9, 9, 13, 13, '_', '_');
      t.r(12, 12, 7, 7, '_');
      t.r(17, 0, 15, 14, '_').r(0, 17, 14, 15, '_');
      for (let i = 0; i <= 5; i++) t.v(17 + i, 2 + i, 11 - 2 * i, 'n').v(13 - i, 18 + i, 11 - 2 * i, 'n');
      c.blit(t, 0, 0);
    },
  ),

  back: btn(back16, back32),
  forward: btn(mirror(back16), mirror(back32)),

  'sort-asc': btn(sortAsc16, sortAsc32),
  'sort-desc': btn(upturn(sortAsc16), upturn(sortAsc32)),
  'tree-expand': { s: treeExpand16, l: tree32(true, true), sg: tree16(true), lg: tree32(true, false) },
  'tree-collapse': { s: treeCollapse16, l: tree32(false, true), sg: tree16(false), lg: tree32(false, false) },

  calendar: {
    s: A(1, [
      '...kk......kk...',
      '.kkkkkkkkkkkkkk.',
      '.krrrrrrrrrrrrk.',
      '.krrrrrrrrrrrrk.',
      '.kkkkkkkkkkkkkk.',
      '.kwwwwwwwwwwwwk.',
      '.kwdwdwdwdwdwwk.',
      '.kwwwwwwwwwwwwk.',
      '.kwdwdwnwdwdwwk.',
      '.kwwwwwwwwwwwwk.',
      '.kwdwdwdwdwwwwk.',
      '.kwwwwwwwwwwwwk.',
      '.kkkkkkkkkkkkkk.',
    ]),
    l: (c) => {
      c.bx(2, 4, 28, 26, 'w', 'w', 'q');
      c.r(3, 5, 26, 6, 'r').h(3, 5, 26, 't').h(3, 11, 26, 'k');
      c.r(8, 2, 3, 6, 'k').v(9, 3, 4, 'g');
      c.r(21, 2, 3, 6, 'k').v(22, 3, 4, 'g');
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          if (row === 3 && col > 3) continue;
          c.r(5 + 4 * col, 14 + 4 * row, 2, 2, 'd');
        }
      }
      c.b(12, 17, 4, 4, 'n').r(13, 18, 2, 2, 'n');
      c.h(4, 30, 27, 's').v(30, 6, 24, 's');
    },
  },

  /** Glossary: open reference book, head-words in navy, thumb index. */
  glossary: {
    s: A(2, [
      '.kkkkkk..kkkkkk.',
      'kwwwwwwkkwwwwwwk',
      'kwnnwwwkkwqqqqwk',
      'kwqqqqwkkwqqqqwk',
      'kwwwwwwkkwwwwwwk',
      'kwnnnwwkkwnnwwwk',
      'kwqqqqwkkwqqqqwk',
      'kwwwwwwkkwwwwwwk',
      'kwnnwwwkkwqqqqwk',
      'kwqqqqwkkwwwwwwk',
      'kkkkkkkkkkkkkkkk',
      '.aaaaaaaaaaaaaa.',
    ]),
    l: (c) => {
      c.r(1, 26, 30, 3, 'a').b(0, 25, 32, 5, 'k');
      c.b(1, 4, 15, 23, 'k', 'w').b(16, 4, 15, 23, 'k', 'w');
      c.v(14, 5, 21, 'q').v(17, 5, 21, 'q');
      for (const y of [7, 13, 19]) {
        c.r(3, y, 5, 2, 'n').h(3, y + 3, 10, 'q');
        c.r(19, y, y === 13 ? 6 : 4, 2, 'n').h(19, y + 3, 10, 'q');
      }
      c.h(3, 24, 6, 'q');
      c.r(29, 7, 2, 3, 'o').r(29, 13, 2, 3, 'r').r(29, 19, 2, 3, 'e');
    },
  },

  /** System monitor: display with a trace. */
  monitor: {
    s: (c) => {
      A(0, [
        '.kkkkkkkkkkkkkk.',
        '.khhhhhhhhhhhsk.',
        '.khaaaaaaaaaask.',
        '.khaaaaaaaaaask.',
        '.khaaaaaaaaaask.',
        '.khaaaaaaaaaask.',
        '.khaaaaaaaaaask.',
        '.khaaaaaaaaaask.',
        '.khaaaaaaaaaask.',
        '.kssssssssssssk.',
        '.kkkkkkkkkkkkkk.',
        '......kfsk......',
        '...kkkkkkkkkk...',
        '...kffffffffk...',
        '...kkkkkkkkkk...',
      ])(c);
      c.l(3, 7, 5, 5, 'h').l(5, 5, 7, 7, 'h').l(7, 7, 9, 3, 'h').l(9, 3, 10, 6, 'h').l(10, 6, 12, 5, 'h');
    },
    l: (c) => {
      mon(c, 1, 1, 30, 22, 'a');
      for (let x = 7; x < 28; x += 5) c.v(x, 4, 16, 'e');
      c.h(4, 9, 24, 'e').h(4, 15, 24, 'e');
      c.l(4, 17, 8, 12, 'h').l(8, 12, 12, 15, 'h').l(12, 15, 17, 6, 'h').l(17, 6, 21, 13, 'h').l(21, 13, 27, 10, 'h');
      c.r(26, 20, 2, 1, 'v');
      c.r(13, 23, 6, 3, 'f').v(12, 23, 3, 'k').v(19, 23, 3, 'k').v(18, 23, 3, 's');
      c.bx(7, 26, 18, 4, 'f', 'h', 's');
    },
  },

  /** 3D view: a shaded block. */
  '3d-view': {
    s: A(1, [
      '.....kkkkkkkkkk.',
      '....khhhhhhhhkk.',
      '...khhhhhhhhkek.',
      '..khhhhhhhhkeek.',
      '.kkkkkkkkkkeeek.',
      '.kllllllllkeeek.',
      '.kllllllllkeeek.',
      '.kllllllllkeeek.',
      '.kllllllllkeeek.',
      '.kllllllllkeeek.',
      '.kllllllllkeek..',
      '.kllllllllkek...',
      '.kllllllllkk....',
      '.kkkkkkkkkk.....',
    ]),
    l: (c) => {
      for (let i = 1; i <= 8; i++) {
        c.h(2 + i, 10 - i, 20, i === 8 ? 'k' : 'h').p(2 + i, 10 - i, 'k').p(21 + i, 10 - i, 'k');
        c.v(21 + i, 11 - i, 19, 'e').p(21 + i, 30 - i, 'k');
      }
      c.v(29, 3, 19, 'k');
      c.b(2, 10, 20, 20, 'k', 'l');
      c.v(3, 11, 18, 'h').h(3, 11, 18, 'h');    },
  },

  /** Map view: a folded sheet with water, a route and two markers. */
  'map-view': {
    s: (c) => {
      c.b(0, 2, 16, 12, 'k', 'p');
      c.r(10, 3, 5, 4, 'l').r(12, 7, 3, 3, 'l').r(8, 3, 2, 2, 'l');
      c.v(5, 3, 10, 'q').v(10, 3, 10, 'q');
      c.l(3, 10, 6, 7, 'r').l(6, 7, 9, 9, 'r');
      c.r(2, 10, 2, 2, 'k').r(9, 9, 2, 2, 'k');
    },
    l: (c) => {
      c.b(1, 4, 30, 24, 'k', 'p');
      c.r(20, 5, 10, 9, 'l').r(24, 14, 6, 6, 'l').r(16, 5, 4, 4, 'l').r(22, 20, 4, 3, 'l');
      c.v(11, 5, 22, 'q').v(21, 5, 22, 'q');
      c.v(10, 5, 22, 'h').v(20, 5, 22, 'h');
      c.h(2, 12, 9, 'q').h(2, 20, 9, 'q').h(12, 16, 9, 'q');
      c.l(5, 23, 12, 16, 'r').l(12, 16, 18, 19, 'r').l(5, 24, 12, 17, 'r').l(12, 17, 18, 20, 'r');
      c.b(3, 22, 4, 4, 'k', 'w').b(17, 18, 4, 4, 'k', 'w');
      c.h(3, 28, 29, 's').v(31, 6, 22, 's');
    },
  },

  /** Schematic view: three blocks on a bus. */
  'schematic-view': {
    s: A(1, [
      '.kkkkk..........',
      '.kfffk..........',
      '.kfffk..........',
      '.kkkkk..........',
      '...n............',
      '...n......kkkkk.',
      '...nnnnnnnkfffk.',
      '...n......kfffk.',
      '...n......kkkkk.',
      '...n............',
      '.kkkkk..........',
      '.kfffk..........',
      '.kfffk..........',
      '.kkkkk..........',
    ]),
    l: (c) => {
      c.r(6, 9, 2, 13, 'n').r(8, 15, 12, 2, 'n');
      c.bx(1, 2, 12, 8, 'f', 'h', 's');
      c.bx(19, 12, 12, 8, 'f', 'h', 's');
      c.bx(1, 22, 12, 8, 'f', 'h', 's');
      c.h(4, 5, 6, 'd').h(22, 15, 6, 'd').h(4, 25, 6, 'd');
      c.r(5, 14, 4, 4, 'k');
      c.b(12, 13, 5, 6, 'k', 'w');
    },
  },
} satisfies Record<string, IconDef>;
