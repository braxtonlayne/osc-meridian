/** Application icons. `s` is the 16px drawing, `l` the 32px drawing; each is drawn separately. */
import type { Cv, IconDef } from './canvas';
import { A, env, folder16, folder32, gear } from './shapes';

export type { IconDef };

const tick = (c: Cv, x: number, y: number, ch = 'n'): void => {
  c.p(x, y + 1, ch).p(x + 1, y + 2, ch).p(x + 2, y + 1, ch).p(x + 3, y, ch);
};

export const APPS = {
  /** Facility Registry: a plain block building, windows on a grid. */
  registry: {
    s: A(1, [
      '...kkkkkkkkkk...',
      '...kggggggggk...',
      '..kkkkkkkkkkkk..',
      '..khffffffffsk..',
      '..khnnfnnfnnsk..',
      '..khffffffffsk..',
      '..khnnfnnfnnsk..',
      '..khffffffffsk..',
      '..khnnfnnfnnsk..',
      '..khffffffffsk..',
      '..khnnfkkfnnsk..',
      '..khfffkkfffsk..',
      '.kkkkkkkkkkkkkk.',
    ]),
    l: (c) => {
      c.v(9, 1, 4, 'k').r(10, 1, 3, 2, 'r');
      c.bx(18, 2, 7, 5, 'g', 'h', 's');
      c.bx(3, 5, 26, 4, 'g', 'h', 's');
      c.bx(4, 8, 24, 22, 'f', 'h', 's');
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 4; i++) {
          c.r(7 + 5 * i, 11 + 4 * j, 3, 3, 'n').p(7 + 5 * i, 11 + 4 * j, 'b');
        }
      }
      c.r(7, 23, 3, 3, 'n').p(7, 23, 'b').r(22, 23, 3, 3, 'n').p(22, 23, 'b');
      c.b(13, 23, 6, 6, 'k', 'a').v(16, 24, 5, 'k');
      c.h(1, 29, 30, 'k').h(2, 30, 29, 's');
    },
  },

  /** Transit Control: line diagram, one branch, one section not in service. */
  transit: {
    s: A(3, [
      'kkk...kkk...kkk.',
      'kwknnnkwknnnkwk.',
      'kkk...kkk...kkk.',
      '.......n........',
      '.......n........',
      '.......n........',
      '.......n........',
      '......kkk...kkk.',
      'r.r.r.kwkrrrkwk.',
      '......kkk...kkk.',
    ]),
    l: (c) => {
      c.r(4, 8, 24, 2, 'n');
      c.r(15, 11, 2, 11, 'n');
      c.r(17, 23, 10, 2, 'r');
      for (let x = 1; x < 13; x += 4) c.r(x, 23, 2, 2, 'r');
      c.v(27, 12, 9, 'o').v(28, 12, 9, 'o');
      for (const [x, y] of [
        [1, 6],
        [13, 6],
        [25, 6],
        [13, 21],
        [25, 21],
      ] as const) {
        c.b(x, y, 6, 6, 'k', 'w');
      }
      c.h(2, 14, 4, 'q').h(2, 16, 3, 'q').h(4, 28, 5, 'q');
    },
  },

  /** Personnel System: folder with an ID badge. */
  personnel: {
    s: (c) => {
      folder16(c);
      c.g(8, 8, ['kkkkkkkk', 'knnnnnnk', 'kwwwwwwk', 'kwwaawwk', 'kwwaawwk', 'kwaaaawk', 'kkkkkkkk']);
    },
    l: (c) => {
      folder32(c);
      c.r(20, 11, 5, 2, 'k').r(21, 11, 3, 1, 'g');
      c.bx(15, 13, 15, 17, 'w', 'w', 'q');
      c.r(16, 14, 13, 3, 'n');
      c.b(17, 19, 6, 7, 'k', 'l');
      c.r(19, 20, 2, 2, 'a').r(18, 23, 4, 2, 'a');
      c.h(24, 20, 4, 'q').h(24, 22, 4, 'q').h(24, 24, 3, 'q');
      for (const x of [17, 19, 20, 22, 24, 25, 27]) c.p(x, 27, 'k');
    },
  },

  /** Records Library: archive box with a lid, label and hand slot. */
  records: {
    s: A(2, [
      '.kkkkkkkkkkkkkk.',
      '.khhhhhhhhhhhsk.',
      '.kfffffffffffsk.',
      '.kkkkkkkkkkkkkk.',
      '..khffffffffsk..',
      '..khfwwwwwwfsk..',
      '..khfwnnnnwfsk..',
      '..khfwwwwwwfsk..',
      '..khffffffffsk..',
      '..khffkkkkffsk..',
      '..khffffffffsk..',
      '..kssssssssssk..',
      '..kkkkkkkkkkkk..',
    ]),
    l: (c) => {
      c.bx(4, 9, 24, 21, 'f', 'h', 's');
      c.bx(2, 4, 28, 7, 'f', 'h', 's');
      c.h(5, 11, 22, 's');
      c.b(9, 14, 14, 7, 'k', 'w');
      c.r(11, 16, 6, 1, 'n').h(11, 18, 10, 'q');
      c.b(12, 23, 8, 4, 'k', 'a');
      c.h(13, 26, 6, 'e');
    },
  },

  /** Message Traffic: envelope with routing lines and a routing stamp. */
  mail: {
    s: (c) => {
      env(c, 0, 3, 16, 11);
      c.h(2, 9, 4, 'n').h(2, 11, 3, 'n').r(12, 9, 2, 2, 'r');
    },
    l: (c) => {
      env(c, 1, 6, 30, 21);
      c.h(4, 19, 9, 'n').h(4, 21, 7, 'n').h(4, 23, 8, 'q');
      c.b(20, 17, 8, 7, 'r').r(22, 19, 4, 1, 't').r(22, 21, 3, 1, 't');
      c.h(3, 27, 29, 's').v(31, 8, 19, 's');
    },
  },

  /** Ledger: bound account book, ruled label on the cover. */
  ledger: {
    s: A(1, [
      '..kkkkkkkkkkk...',
      '..kabnnnnnnnkk..',
      '..kabnnnnnnnkwk.',
      '..kabnwwwwwnkwk.',
      '..kabnwnnnwnkwk.',
      '..kabnwqqqwnkwk.',
      '..kabnwwwwwnkwk.',
      '..kabnnnnnnnkwk.',
      '..kabnnnnnnnkwk.',
      '..kabnnnnnnnkwk.',
      '..kabnnnnnonkwk.',
      '..kabnnnnoookwk.',
      '..kkkkkkkkkkkwk.',
      '...kwwwwwwwwwwk.',
      '....kkkkkkkkkkk.',
    ]),
    l: (c) => {
      // page block, seen below and to the right of the cover
      c.b(6, 4, 23, 27, 'k', 'w');
      c.v(27, 5, 25, 'q').h(7, 29, 21, 'q');
      // cover
      c.bx(4, 2, 22, 26, 'n', 'b', 'a');
      c.r(5, 3, 3, 24, 'a').v(6, 3, 24, 'b').v(8, 3, 24, 'k');
      c.b(12, 7, 11, 10, 'k', 'w');
      c.h(13, 9, 9, 'n').v(16, 10, 6, 'q').v(19, 10, 6, 'q').h(13, 12, 9, 'q').h(13, 14, 9, 'q');
      c.h(22, 3, 3, 'o').h(23, 4, 2, 'o').p(24, 5, 'o');
      c.p(24, 24, 'o').h(23, 25, 2, 'o').h(22, 26, 3, 'o');
    },
  },

  /** Reserves: steel drum in front of a slatted crate. */
  reserves: {
    s: A(1, [
      '......kkkkkkkkk.',
      '......kyyyyyyuk.',
      '......kymmmmmuk.',
      '......kkkkkkkkk.',
      '......kymmmmmuk.',
      '..kkkkkkmmmmmuk.',
      '.khllllekmmmmuk.',
      '.kkkkkkkkkkkkkk.',
      '.khleeeakmmmmuk.',
      '.kaaaaaakmmmmuk.',
      '.khleeeakmmmmuk.',
      '.khleeeakuuuuuk.',
      '.kaaaaaakkkkkkk.',
      '..kkkkkk........',
    ]),
    l: (c) => {
      c.bx(12, 2, 18, 26, 'm', 'y', 'u');
      c.h(13, 9, 16, 'k').h(13, 15, 16, 'k').h(13, 21, 16, 'k');
      c.h(14, 10, 14, 'y').h(14, 16, 14, 'y').h(14, 22, 14, 'y');
      c.v(16, 3, 24, 'u').v(25, 3, 24, 'u');
      c.r(19, 5, 4, 1, 'u').r(19, 7, 4, 1, 'u');
      // drum
      c.bx(2, 14, 14, 16, 'e', 'l', 'a');
      c.e(2, 11, 14, 7, 'k', 'l');
      c.r(6, 13, 3, 1, 'k').p(11, 15, 'e');
      c.h(3, 20, 12, 'k').h(3, 21, 12, 'l').h(3, 25, 12, 'k').h(3, 26, 12, 'l');
      c.v(3, 18, 2, 'l').v(3, 22, 3, 'l').v(3, 27, 2, 'l');
      c.h(1, 30, 30, 's');
    },
  },

  /** Assurance: inspection clipboard with an oxblood seal. */
  assurance: {
    s: A(1, [
      '......kkkk......',
      '..kkkkgffgkkkk..',
      '..kukkkkkkkkuk..',
      '..kuwwwwwwwwuk..',
      '..kuwnwqqqqwuk..',
      '..kuwwwwwwwwuk..',
      '..kuwnwqqqqwuk..',
      '..kuwwwwwwwwuk..',
      '..kuwnwqqwrrrr..',
      '..kuwwwwwrrttrr.',
      '..kuwwwwwrtrrtr.',
      '..kuwwwwwrtrrtr.',
      '..kuuuuuurrttrr.',
      '..kkkkkkkkrrrr..',
    ]),
    l: (c) => {
      c.bx(4, 3, 22, 27, 'u', 'm', 'k');
      c.b(7, 6, 16, 21, 'k', 'w');
      c.bx(11, 1, 10, 7, 'g', 'h', 's');
      c.r(15, 3, 2, 2, 'k');
      for (const y of [10, 14, 18]) {
        tick(c, 9, y);
        c.h(14, y + 1, 7, 'q');
      }
      c.h(9, 23, 6, 'q');
      c.e(17, 17, 13, 13, 'k', 'r');
      c.e(19, 19, 9, 9, 't');
      c.r(22, 22, 3, 3, 't').p(23, 23, 'r');
    },
  },

  /** Directives: bound binders on a shelf, spine labels. */
  directives: {
    s: A(1, [
      '....kkkkkkkk....',
      '.kkkktrrrrrk....',
      '.khfktwwwwrkkkk.',
      '.khfktwnnwrkfsk.',
      '.khfktwwwwrkfsk.',
      '.khfktwnnwrkfsk.',
      '.khfktwwwwrkfsk.',
      '.khfktrrrrrkfsk.',
      '.khfktrrrrrkfsk.',
      '.khfktrkkrrkfsk.',
      '.khfktrkkrrkfsk.',
      '.khfktrrrrrkfsk.',
      '.khfktrrrrrkfsk.',
      '.kkkkkkkkkkkkkk.',
    ]),
    l: (c) => {
      c.bx(2, 5, 9, 25, 'e', 'l', 'a');
      c.bx(21, 7, 9, 23, 'f', 'h', 's');
      c.bx(10, 2, 12, 28, 'r', 't', 'k');
      c.b(13, 6, 6, 10, 'k', 'w');
      c.h(14, 8, 4, 'n').h(14, 10, 4, 'q').h(14, 12, 4, 'q');
      c.e(14, 20, 4, 4, 'k', 'a');
      c.b(4, 9, 5, 7, 'k', 'w').h(5, 11, 3, 'q').h(5, 13, 3, 'q');
      c.b(23, 11, 5, 7, 'k', 'w').h(24, 13, 3, 'q').h(24, 15, 3, 'q');
      c.r(5, 23, 2, 2, 'k').r(25, 24, 2, 2, 'k');
      c.h(1, 30, 30, 'k').h(1, 31, 30, 's');
    },
  },

  /** Forms: stacked form sheets with tick boxes. */
  forms: {
    s: A(1, [
      '...kkkkkkkkkkk..',
      '...kwwwwwwwwwk..',
      '.kkkkkkkkkkkwk..',
      '.kwwwwwwwwwkwk..',
      '.kwkkkwwwwwkwk..',
      '.kwknkwqqqwkwk..',
      '.kwkkkwwwwwkwk..',
      '.kwwwwwwwwwkwk..',
      '.kwkkkwwwwwkwk..',
      '.kwkwkwqqqwkwk..',
      '.kwkkkwwwwwkwk..',
      '.kwwwwwwwwwkwk..',
      '.kwnnnnwwwwkkk..',
      '.kwwwwwwwwwk....',
      '.kkkkkkkkkkk....',
    ]),
    l: (c) => {
      c.b(8, 1, 20, 26, 'k', 'w');
      c.b(3, 4, 21, 27, 'k', 'w');
      c.v(26, 3, 23, 'q');
      c.r(6, 7, 7, 2, 'n').h(15, 7, 6, 'q');
      for (const y of [11, 18]) {
        c.b(6, y, 6, 6, 'k', 'w');
        c.h(14, y + 1, 8, 'q').h(14, y + 3, 6, 'q');
      }
      tick(c, 7, 12);
      c.h(6, 26, 15, 'd').h(6, 28, 9, 'q');
      c.v(24, 6, 26, 's').h(5, 31, 20, 's');
    },
  },

  /** Terminal: console window. */
  terminal: {
    s: A(1, [
      'kkkkkkkkkkkkkkkk',
      'knnnnnnnnnnfnfnk',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkk',
      'kkhkkkkkkkkkkkkk',
      'kkkhkkkkkkkkkkkk',
      'kkkkhkkkkkkkkkkk',
      'kkkhkkkkkkkkkkkk',
      'kkhkkkhhhhkkkkkk',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkk',
      'kssssssssssssssk',
      'kkkkkkkkkkkkkkkk',
    ]),
    l: (c) => {
      c.bx(1, 3, 30, 26, 'f', 'h', 's');
      c.r(3, 5, 26, 4, 'n');
      c.r(21, 6, 3, 2, 'f').r(25, 6, 3, 2, 'f');
      c.h(5, 7, 8, 'b');
      c.r(3, 10, 26, 17, 'k');
      c.h(6, 12, 14, 'e').h(6, 14, 9, 'e');
      c.l(6, 17, 9, 20, 'h').l(9, 20, 6, 23, 'h');
      c.l(7, 17, 10, 20, 'h').l(10, 20, 7, 23, 'h');
      c.r(13, 22, 5, 2, 'h');
      c.h(2, 29, 30, 's').v(31, 5, 24, 's');
    },
  },

  /** System tools: control panel with a gear. */
  system: {
    s: (c) => {
      c.blit(gear(16, 4, 3, 4), 0, 0);
    },
    l: (c) => {
      c.bx(1, 2, 24, 20, 'f', 'h', 's');
      c.r(3, 4, 20, 3, 'n');
      for (const [x, ky] of [
        [6, 12],
        [11, 15],
        [16, 10],
      ] as const) {
        c.v(x, 9, 10, 'k').v(x + 1, 9, 10, 'h');
        c.b(x - 1, ky, 4, 3, 'k', 'h');
      }
      c.blit(gear(18, 4, 4, 6), 13, 13);
    },
  },
} satisfies Record<string, IconDef>;
