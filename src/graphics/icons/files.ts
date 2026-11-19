/** File-type icons: one sheet of paper, thirteen ways of filling it in; three folders. */
import { Cv } from './canvas';
import type { IconDef } from './canvas';
import { A, env, folder16, folder32, padlock16, page, page16, page32, tx } from './shapes';

const Q_SMALL = ['.nnnn.', 'nn..nn', '....nn', '...nn.', '..nn..', '......', '..nn..', '..nn..'] as const;

export const Q_LARGE = [
  '..nnnnnn..',
  '.nnnnnnnn.',
  'nnn....nnn',
  'nnn....nnn',
  '......nnnn',
  '.....nnnn.',
  '....nnnn..',
  '...nnn....',
  '...nnn....',
  '..........',
  '...nnn....',
  '...nnn....',
  '...nnn....',
] as const;

export const FILES = {
  /** Memorandum: letterhead, addressing block, body. */
  'doc-memo': {
    s: (c) => {
      page16(c);
      c.h(4, 3, 3, 'n');
      tx(c, 4, 6, 7, 4);
    },
    l: (c) => {
      page32(c);
      c.r(8, 5, 6, 2, 'n');
      c.h(8, 10, 3, 'd').h(12, 10, 8, 'q').h(8, 12, 3, 'd').h(12, 12, 6, 'q');
      c.h(8, 14, 16, 'd');
      tx(c, 8, 17, 16, 6);
    },
  },

  /** Directive: title block, numbered sections, issuing seal. */
  'doc-directive': {
    s: (c) => {
      page16(c);
      c.r(4, 6, 7, 2, 'n');
      c.h(4, 9, 7, 'q').h(4, 11, 4, 'q');
      c.r(9, 11, 2, 2, 'r');
    },
    l: (c) => {
      page32(c);
      c.r(8, 5, 10, 3, 'n').h(8, 10, 6, 'd');
      for (const y of [13, 19]) {
        c.r(8, y, 2, 2, 'n').h(11, y, 8, 'd').h(11, y + 2, 13, 'q').h(11, y + 4, 10, 'q');
      }
      c.e(19, 22, 6, 6, 'r', 'r').r(21, 24, 2, 2, 't');
    },
  },

  /** Cable: teletype strip, sprocket holes, torn foot. */
  'doc-cable': {
    s: (c) => {
      c.b(2, 0, 12, 16, 'k', 'w');
      for (let y = 2; y <= 12; y += 2) c.p(3, y, 's').p(12, y, 's');
      c.h(5, 2, 5, 'r').h(5, 4, 6, 'd').h(5, 6, 4, 'd').h(5, 8, 6, 'd').h(5, 10, 3, 'd');
      for (let x = 2; x <= 13; x++) {
        const zy = 13 + (x % 2);
        c.p(x, zy, 'k');
        for (let y = zy + 1; y < 16; y++) c.p(x, y, '_');
      }
    },
    l: (c) => {
      c.b(4, 1, 24, 31, 'k', 'w');
      for (let y = 3; y <= 25; y += 3) c.r(5, y, 2, 2, 's').r(25, y, 2, 2, 's');
      for (let y = 2; y <= 27; y += 2) c.p(8, y, 'q').p(23, y, 'q');
      c.h(10, 4, 5, 'r').h(16, 4, 4, 'r');
      c.h(10, 7, 3, 'd').h(14, 7, 6, 'd');
      c.h(10, 10, 7, 'd').h(18, 10, 3, 'd');
      c.h(10, 13, 4, 'd').h(15, 13, 4, 'd');
      c.h(10, 16, 11, 'd');
      c.h(10, 19, 5, 'd');
      c.h(10, 22, 6, 'd').h(17, 22, 4, 'd');
      const saw = [0, 1, 2, 1] as const;
      for (let x = 4; x <= 27; x++) {
        const zy = 27 + (saw[x % 4] ?? 0);
        c.p(x, zy, 'k');
        for (let y = zy + 1; y < 32; y++) c.p(x, y, '_');
      }
    },
  },

  /** Minutes: heading, attendance, itemised points. */
  'doc-minutes': {
    s: (c) => {
      page16(c);
      c.h(4, 3, 4, 'n');
      for (const y of [6, 8, 10, 12]) c.p(4, y, 'n').h(6, y, y === 12 ? 3 : 5, 'q');
    },
    l: (c) => {
      page32(c);
      c.r(8, 5, 8, 2, 'n');
      c.h(8, 9, 10, 'q').h(8, 11, 7, 'q').h(8, 13, 16, 'd');
      for (const y of [16, 20, 24]) c.r(8, y, 2, 2, 'n').h(12, y, 12, 'q').h(12, y + 2, 8, 'q');
    },
  },

  /** Form: form number, entry field, tick boxes. */
  'doc-form': {
    s: (c) => {
      page16(c);
      c.h(4, 3, 4, 'n');
      c.b(4, 6, 3, 3, 'k').h(8, 7, 3, 'q');
      c.b(4, 10, 3, 3, 'k').p(5, 11, 'n').h(8, 11, 3, 'q');
    },
    l: (c) => {
      page32(c);
      c.r(8, 5, 6, 2, 'n');
      c.h(8, 10, 5, 'd').b(8, 12, 16, 4, 's', 'w');
      for (const y of [18, 23]) c.b(8, y, 5, 5, 'k', 'w').h(15, y + 1, 9, 'q').h(15, y + 3, 6, 'q');
      c.p(9, 20, 'n').p(10, 21, 'n').p(11, 20, 'n').p(11, 19, 'n');
    },
  },

  /** Scan: photocopied sheet, toner edge, skewed lines, dog-ear, punch holes. */
  'doc-scan': {
    s: (c) => {
      page(c, 2, 1, 11, 14, 5, 'h');
      c.v(3, 2, 12, 'g').h(3, 13, 9, 'g');
      for (const y of [7, 9, 11]) c.h(5, y, 3, 'q').h(8, y - 1, 3, 'q');
      c.p(5, 4, 'd');
    },
    l: (c) => {
      page32(c, 9);
      c.r(6, 3, 20, 26, 'h');
      page(c, 5, 2, 22, 28, 9, 'h');
      c.r(6, 3, 2, 26, 'g').r(6, 27, 20, 2, 'g').v(8, 3, 24, 'f');
      c.r(10, 7, 2, 2, 'd').r(10, 22, 2, 2, 'd');
      for (const y of [13, 16, 19, 22, 25]) c.h(13, y, 6, 'q').h(19, y - 1, y === 25 ? 2 : 6, 'q');
      c.r(13, 6, 4, 2, 'q');
      c.p(22, 12, 's').p(15, 10, 's').p(23, 24, 's').p(18, 20, 'g');
    },
  },

  /** Ledger sheet: ochre heading band, column rules, totals rule. */
  'doc-ledger': {
    s: (c) => {
      page16(c);
      c.h(4, 3, 4, 'n');
      c.r(3, 5, 9, 2, 'y');
      c.v(6, 5, 9, 'q').v(9, 5, 9, 'q');
      c.p(4, 8, 'd').h(10, 8, 2, 'd').h(7, 10, 2, 'd').p(4, 10, 'd').h(10, 10, 2, 'r');
      c.h(3, 12, 9, 'd');
    },
    l: (c) => {
      page32(c);
      c.r(8, 5, 8, 2, 'n');
      c.r(6, 9, 20, 3, 'y');
      c.v(13, 9, 20, 'q').v(19, 9, 20, 'q');
      const widths = [5, 4, 5, 3, 5, 4] as const;
      widths.forEach((w, k) => {
        const y = 14 + 2 * k;
        c.h(7, y, w, 'd').h(15, y, 3, 'd').h(22, y, 3, k === 3 ? 'r' : 'd');
      });
      c.h(6, 26, 20, 'd').h(21, 27, 4, 'k').h(21, 28, 4, 'p');
    },
  },

  /** Dossier: oxblood cover band, photograph, particulars. */
  'doc-dossier': {
    s: (c) => {
      page16(c);
      c.r(3, 2, 6, 2, 'r');
      c.b(4, 6, 4, 5, 'k', 'l').r(5, 7, 2, 1, 'a').r(5, 9, 2, 1, 'a');
      c.h(9, 7, 2, 'q').h(9, 9, 2, 'q').h(4, 12, 6, 'q');
    },
    l: (c) => {
      page32(c);
      c.r(6, 3, 14, 3, 'r');
      c.b(8, 9, 8, 10, 'k', 'l');
      c.r(11, 11, 2, 2, 'a').r(10, 14, 4, 1, 'a').r(9, 15, 6, 3, 'a');
      c.h(18, 10, 6, 'd').h(18, 12, 5, 'q').h(18, 14, 6, 'q').h(18, 16, 4, 'q');
      tx(c, 8, 21, 16, 4);
    },
  },

  /** Message: header lines with an envelope tucked on the corner. */
  'doc-message': {
    s: (c) => {
      page16(c);
      c.h(4, 3, 3, 'n');
      c.h(4, 6, 2, 'd').h(7, 6, 4, 'q').h(4, 8, 2, 'd').h(7, 8, 3, 'q');
      env(c, 7, 9, 9, 6);
    },
    l: (c) => {
      page32(c);
      for (const y of [5, 7, 9]) c.h(8, y, 3, 'd').h(12, y, y === 7 ? 5 : 7, 'q');
      c.h(8, 12, 16, 'd');
      tx(c, 8, 15, 16, 2);
      c.h(8, 19, 5, 'q').h(8, 21, 4, 'q');
      env(c, 14, 18, 17, 12);
    },
  },

  /** Help topic: the question mark is the only thing on the sheet. */
  'doc-help': {
    s: (c) => {
      page16(c);
      c.g(4, 5, Q_SMALL);
    },
    l: (c) => {
      page32(c);
      c.h(8, 5, 8, 'q');
      c.g(10, 10, Q_LARGE);
      c.h(8, 26, 14, 'q');
    },
  },

  /** Table: grey header row, full grid. */
  'doc-table': {
    s: (c) => {
      page16(c);
      c.h(4, 3, 4, 'n');
      c.r(3, 5, 9, 2, 'g');
      c.v(6, 5, 9, 'q').v(9, 5, 9, 'q').h(3, 7, 9, 'q').h(3, 9, 9, 'q').h(3, 11, 9, 'q');
    },
    l: (c) => {
      page32(c);
      c.r(8, 5, 8, 2, 'n');
      c.r(6, 9, 20, 4, 'g');
      for (const y of [13, 17, 21, 25]) c.h(6, y, 20, 'q');
      c.v(12, 9, 20, 'q').v(19, 9, 20, 'q');
      for (const y of [15, 19, 23, 27]) c.h(7, y, 3, 'd').h(14, y, 4, 'd').h(21, y, 3, 'd');
    },
  },

  /** Map sheet: graticule, water, a marked route. */
  'doc-map': {
    s: (c) => {
      page16(c);
      c.r(8, 5, 4, 3, 'l').r(10, 8, 2, 2, 'l');
      c.v(6, 5, 9, 'q').h(3, 10, 9, 'q');
      c.l(4, 12, 8, 8, 'r');
      c.p(4, 12, 'k').p(8, 8, 'k');
    },
    l: (c) => {
      page32(c);
      c.r(8, 5, 8, 2, 'n');
      c.r(20, 9, 6, 8, 'l').r(17, 12, 3, 4, 'l').r(22, 17, 4, 5, 'l').r(18, 10, 2, 2, 'l');
      c.v(12, 9, 20, 'q').v(19, 9, 20, 'q').h(6, 15, 20, 'q').h(6, 22, 20, 'q');
      c.l(8, 25, 13, 19, 'r').l(13, 19, 16, 21, 'r').l(16, 21, 15, 12, 'r');
      c.l(9, 25, 14, 19, 'r');
      c.b(7, 24, 3, 3, 'k', 'w').b(14, 10, 3, 3, 'k', 'w');
      c.h(21, 27, 4, 'k').p(21, 26, 'k').p(24, 26, 'k');
    },
  },

  /** Charter: centred text, ochre seal, oxblood ribbon. */
  'doc-charter': {
    s: (c) => {
      page16(c);
      c.h(5, 3, 3, 'n');
      c.h(4, 6, 7, 'q').h(5, 8, 5, 'q');
      c.e(6, 9, 4, 4, 'o', 'y').r(6, 13, 1, 1, 'r').r(9, 13, 1, 1, 'r');
    },
    l: (c) => {
      page32(c);
      c.r(9, 5, 8, 2, 'n');
      c.h(7, 9, 12, 'd');
      c.h(9, 11, 14, 'q').h(10, 13, 12, 'q').h(9, 15, 14, 'q').h(11, 17, 10, 'q');
      c.r(13, 25, 2, 4, 'r').r(17, 25, 2, 4, 'r');
      c.e(12, 19, 8, 8, 'k', 'o');
      c.e(14, 21, 4, 4, 'y', 'y');
      c.h(21, 25, 4, 'd');
    },
  },

  folder: {
    s: (c) => {
      folder16(c);
    },
    l: (c) => {
      folder32(c);
    },
  },

  'folder-open': {
    s: A(2, [
      '.kkkkk..........',
      'kyyyyykkkkkkk...',
      'kyyyyyyyyyyyuk..',
      'kymmmmmmmmmmuk..',
      'kymkkkkkkkkkkkkk',
      'kymkyyyyyyyyyyuk',
      'kykyymmmmmmmmuk.',
      'kykymmmmmmmmmuk.',
      'kkyymmmmmmmmuk..',
      'kkymmmmmmmmmuk..',
      'kyymmmmmmmmuk...',
      'kymmmmmmmmmuk...',
      'kkkkkkkkkkkkk...',
    ]),
    l: (c) => {
      // back panel and tab
      c.r(2, 5, 11, 4, 'y');
      c.h(3, 4, 9, 'k').p(2, 5, 'k').v(1, 6, 3, 'k');
      c.p(12, 5, 'k').p(13, 6, 'k').p(14, 7, 'k').p(12, 6, 'y').r(12, 7, 2, 1, 'y');
      c.bx(1, 8, 26, 20, 'm', 'y', 'u');
      c.r(2, 8, 12, 1, 'y').p(1, 8, 'k');
      // a sheet showing
      c.b(5, 10, 19, 6, 'k', 'p').h(7, 12, 12, 'q');
      // front flap, raked
      for (let y = 14; y <= 28; y++) {
        const s = Math.floor((28 - y) / 3);
        const top = y === 14 || y === 28;
        c.h(1 + s, y, 26, top ? 'k' : 'm');
        c.p(1 + s, y, 'k').p(26 + s, y, 'k');
        if (!top) c.p(2 + s, y, 'y').p(25 + s, y, 'u');
      }
      c.h(7, 15, 23, 'y');
      c.h(3, 27, 23, 'u');
    },
  },

  'folder-locked': {
    s: (c) => {
      folder16(c);
      c.g(8, 8, ['..kkkk..', '.kk..kk.', '.kk..kk.', 'kkkkkkkk', 'kyoooouk', 'kyokkouk', 'kyoooouk', 'kkkkkkkk']);
    },
    l: (c) => {
      folder32(c);
      const t = new Cv(16);
      t.blit(padlock16(), 0, 0);
      c.blit(t, 16, 15);
    },
  },
} satisfies Record<string, IconDef>;
