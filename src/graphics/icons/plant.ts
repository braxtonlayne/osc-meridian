/** Pass-two application icons: the twelve plant set pieces. Same hand, same parts as `apps.ts`. */
import { Cv, type IconDef } from './canvas';
import { badge16, badge32, blastDoor16, blastDoor32, fanAt } from './shapes';
import { MORE } from './more';

const tick = (c: Cv, x: number, y: number, ch = 'n'): void => {
  c.p(x, y + 1, ch).p(x + 1, y + 2, ch).p(x + 2, y + 1, ch).p(x + 3, y, ch);
};

export const PLANT_APPS = {
  /** Survivability estimator: map sheet with range rings about a point. */
  strike: {
    s: (c) => {
      c.b(0, 1, 16, 14, 'k', 'p');
      c.r(1, 2, 4, 3, 'l').r(1, 5, 2, 2, 'l');
      c.e(3, 2, 11, 11, 'e');
      c.e(5, 4, 7, 7, 'd');
      c.p(8, 6, 'r').h(7, 7, 3, 'r').p(8, 8, 'r');
    },
    l: (c) => {
      c.b(1, 3, 30, 26, 'k', 'p');
      c.r(2, 4, 7, 6, 'l').r(2, 10, 4, 4, 'l').r(9, 4, 3, 2, 'l');
      c.v(11, 4, 24, 'q').v(10, 4, 24, 'h').h(2, 18, 28, 'q');
      c.e(7, 5, 23, 23, 'e');
      c.e(11, 9, 15, 15, 'd');
      c.e(14, 12, 9, 9, 'r');
      c.r(17, 15, 3, 3, 'k');
      c.h(3, 23, 5, 'q').h(3, 25, 3, 'q');
      c.h(3, 29, 29, 's').v(31, 5, 24, 's');
    },
  },

  /** Network isolation: toggle under a lifted oxblood guard cover. */
  isolate: {
    s: (c) => {
      c.bx(3, 0, 10, 6, 'r', 't', 'k');
      c.bx(0, 5, 16, 11, 'f', 'h', 's');
      c.h(3, 5, 10, 'k');
      c.b(4, 7, 8, 8, 'k', 'a');
      c.r(6, 11, 4, 2, 'g').h(6, 13, 4, 's');
      c.v(7, 8, 3, 'h').v(8, 8, 3, 'g');
    },
    l: (c) => {
      c.bx(8, 0, 16, 11, 'r', 't', 'k');
      c.r(10, 3, 12, 1, 'k').r(10, 6, 12, 1, 'k');
      c.bx(2, 10, 28, 20, 'f', 'h', 's');
      c.r(7, 9, 18, 2, 'k').h(8, 9, 16, 'g');
      for (const [x, y] of [[4, 13], [26, 13], [4, 26], [26, 26]] as const) c.r(x, y, 2, 2, 'd');
      c.b(9, 13, 14, 15, 'k', 'a');
      c.bx(11, 21, 10, 5, 'g', 'h', 's');
      c.bx(14, 14, 4, 8, 'g', 'h', 's');
      c.h(3, 30, 28, 's').v(30, 12, 19, 's');
    },
  },

  /** Seal drill: blast door and the timetable clock. */
  drill: {
    s: (c) => {
      blastDoor16(c);
      c.e(7, 7, 9, 9, 'k', 'w');
      c.v(11, 9, 3, 'k').h(11, 11, 3, 'k');
    },
    l: (c) => {
      blastDoor32(c);
      c.e(15, 15, 16, 16, 'k', 'w');
      c.r(22, 18, 2, 6, 'k').r(22, 22, 5, 2, 'k');
      c.p(23, 17, 's').p(28, 23, 's').p(17, 23, 's').p(23, 28, 's');
    },
  },

  /** Facility video: camera with a sun hood on a wall bracket. */
  cctv: {
    s: (c) => {
      c.b(13, 5, 3, 10, 'k', 'g');
      c.v(7, 9, 4, 'k').h(7, 12, 6, 'k');
      c.h(1, 2, 12, 'k');
      c.bx(2, 3, 10, 6, 'f', 'h', 's');
      c.b(0, 4, 3, 4, 'k', 'a');
      c.p(9, 5, 'r');
    },
    l: (c) => {
      c.bx(26, 12, 5, 18, 'g', 'h', 's').p(28, 15, 'k').p(28, 26, 'k');
      c.bx(14, 16, 4, 8, 'g', 'h', 's');
      c.bx(14, 21, 13, 4, 'g', 'h', 's');
      c.b(1, 3, 25, 4, 'k', 'e').h(2, 4, 23, 'l');
      c.bx(4, 6, 21, 11, 'f', 'h', 's');
      c.b(0, 8, 5, 7, 'k', 'a').r(1, 9, 2, 2, 'e').p(1, 9, 'l');
      c.r(20, 8, 2, 2, 'r');
      c.h(8, 12, 11, 's').h(8, 14, 11, 's');
      c.h(1, 30, 30, 's');
    },
  },

  /** Reactor plant panel: the reactor on a mimic, annunciator tiles, meter and scram. */
  plant: {
    s: (c) => {
      c.bx(0, 1, 16, 14, 'f', 'h', 's');
      c.b(2, 3, 4, 3, 'k', 'w').b(5, 3, 4, 3, 'k', 'o').b(8, 3, 4, 3, 'k', 'w').b(11, 3, 3, 3, 'k', 'r');
      c.b(2, 7, 8, 7, 'k', 'a');
      c.g(3, 8, ['.hhh..', 'hhhhh.', 'hhhhhh', 'hhkhhh', 'eeeeee']);
      c.v(8, 8, 3, 'h');
      c.b(11, 7, 3, 3, 'k', 'w');
      c.e(10, 10, 4, 4, 'k', 'r');
    },
    l: (c) => {
      c.bx(1, 2, 30, 27, 'f', 'h', 's');
      (['w', 'o', 'w', 'r', 'w'] as const).forEach((ink, i) => c.b(3 + 5 * i, 4, 6, 5, 'k', ink));
      c.b(3, 10, 17, 17, 'k', 'a');
      const t = new Cv(16);
      MORE.reactor.s(t);
      c.blit(t, 4, 10);
      c.b(21, 10, 8, 8, 'k', 'w');
      c.p(22, 13, 'q').p(24, 11, 'q').p(26, 11, 'q').p(27, 13, 'q');
      c.l(24, 16, 26, 12, 'k');
      c.e(21, 19, 8, 8, 'k', 'r').r(23, 21, 2, 2, 't');
      c.h(3, 29, 29, 's').v(31, 4, 26, 's');
    },
  },

  /** Door and airlock control: an interlocked door pair, one lamp each, sill striped. */
  doors: {
    s: (c) => {
      c.bx(0, 0, 16, 16, 'e', 'l', 'a');
      c.b(2, 1, 4, 3, 'k', 'v').b(10, 1, 4, 3, 'k', 'r');
      c.bx(1, 4, 7, 10, 'g', 'h', 's').bx(8, 4, 7, 10, 'g', 'h', 's');
      c.r(3, 6, 2, 2, 'l').r(10, 6, 2, 2, 'l');
      for (let x = 1; x <= 14; x++) c.p(x, 14, (x >> 1) % 2 === 0 ? 'o' : 'k');
    },
    l: (c) => {
      c.bx(0, 1, 32, 30, 'e', 'l', 'a');
      c.b(6, 3, 6, 4, 'k', 'v').b(20, 3, 6, 4, 'k', 'r');
      for (const x of [2, 17]) {
        c.bx(x, 8, 13, 18, 'g', 'h', 's');
        c.e(x + 3, 10, 7, 7, 'k', 'l');
        c.p(x + 5, 12, 'w');
        c.r(x + (x === 2 ? 10 : 1), 19, 2, 4, 'k');
      }
      for (let y = 26; y <= 28; y++) for (let x = 1; x <= 30; x++) c.p(x, y, ((x + y) >> 1) % 2 === 0 ? 'o' : 'k');
    },
  },

  /** Dispatcher: colour-light signal showing clear beside a train, head on. */
  dispatch: {
    s: (c) => {
      c.b(0, 0, 5, 10, 'k', 'a');
      c.r(1, 2, 3, 2, 'd').r(1, 6, 3, 2, 'v');
      c.v(2, 10, 5, 'k').h(0, 15, 5, 'k');
      c.l(8, 12, 6, 15, 'k').l(14, 12, 15, 15, 'k').h(7, 14, 8, 'd');
      c.bx(6, 1, 10, 11, 'n', 'b', 'a');
      c.p(6, 1, '_').p(15, 1, '_').p(7, 2, 'k').p(14, 2, 'k');
      c.b(7, 3, 8, 4, 'k', 'l').h(8, 7, 6, 'o');
      c.p(8, 9, 'h').p(13, 9, 'h').r(10, 9, 2, 2, 'k');
      c.h(7, 11, 8, 'k');
    },
    l: (c) => {
      c.bx(0, 1, 9, 17, 'a', 'e', 'k');
      c.e(1, 3, 7, 6, 'k', 'd').e(1, 10, 7, 6, 'k', 'v').r(3, 12, 2, 1, 'h');
      c.b(3, 18, 3, 12, 'k', 'g').r(0, 30, 9, 2, 'k');
      c.l(17, 25, 14, 31, 'k').l(18, 25, 15, 31, 'k').l(27, 25, 30, 31, 'k').l(26, 25, 29, 31, 'k');
      c.h(15, 28, 15, 'd').h(13, 30, 19, 'd');
      c.bx(12, 2, 19, 23, 'n', 'b', 'a');
      c.r(12, 2, 2, 2, '_').r(29, 2, 2, 2, '_').p(13, 2, 'k').p(12, 3, 'k').p(13, 3, 'k');
      c.p(29, 2, 'k').p(30, 3, 'k').p(29, 3, 'k');
      c.b(14, 5, 15, 9, 'k', 'l').v(21, 6, 7, 'k').h(15, 6, 5, 'h').h(22, 6, 5, 'h');
      c.r(13, 16, 17, 2, 'o');
      c.r(15, 20, 3, 2, 'h').r(25, 20, 3, 2, 'h').r(20, 20, 3, 4, 'k');
      c.h(13, 25, 17, 'k');
    },
  },

  /** Shaft hoist: headframe, sheave wheel, rope and cage at the collar. */
  hoist: {
    s: (c) => {
      c.l(1, 15, 5, 7, 'k').l(14, 15, 10, 7, 'k').h(3, 11, 10, 'd');
      c.h(4, 7, 8, 'k');
      c.e(4, 0, 8, 8, 'k', 'g').r(7, 3, 2, 2, 'k');
      c.r(7, 8, 2, 2, 'd');
      c.bx(4, 10, 8, 5, 'g', 'h', 's').v(7, 11, 3, 'k');
      c.h(0, 15, 16, 'k');
    },
    l: (c) => {
      c.l(3, 29, 10, 13, 'k').l(4, 29, 11, 13, 'k').l(28, 29, 21, 13, 'k').l(27, 29, 20, 13, 'k');
      c.l(6, 21, 25, 21, 'k').l(5, 24, 26, 24, 'd');
      c.l(8, 17, 24, 24, 'd').l(23, 17, 7, 24, 'd');
      c.r(8, 12, 16, 2, 'k').h(9, 12, 14, 'e');
      c.e(10, 0, 12, 12, 'k', 'g').e(12, 2, 8, 8, 'k');
      c.r(15, 2, 2, 8, 'd').r(12, 5, 8, 2, 'd').r(15, 5, 2, 2, 'k');
      c.p(14, 3, 'h').p(13, 4, 'h');
      c.r(15, 14, 2, 4, 'd');
      c.bx(10, 17, 12, 12, 'g', 'h', 's');
      c.r(10, 17, 12, 2, 'k').v(14, 19, 9, 'k').v(17, 19, 9, 'k');
      c.r(0, 29, 32, 1, 'k').r(0, 30, 32, 2, 'u').r(9, 30, 14, 2, 'k');
    },
  },

  /** Environmental control: duct run with an inline axial fan. */
  environ: {
    s: (c) => {
      c.bx(0, 5, 16, 6, 'g', 'h', 's');
      c.v(2, 4, 8, 'k').v(13, 4, 8, 'k');
      fanAt(c, 2, 2, 12);
    },
    l: (c) => {
      c.bx(0, 9, 32, 14, 'g', 'h', 's');
      c.r(2, 8, 2, 16, 'k').r(28, 8, 2, 16, 'k');
      c.bx(5, 3, 22, 26, 'g', 'h', 's');
      fanAt(c, 7, 6, 18);
      c.h(6, 29, 22, 's');
    },
  },

  /** Emergency broadcast: horn loudspeaker on its yoke. */
  pa: {
    s: (c) => {
      const t = new Cv(16);
      for (let x = 4; x <= 12; x++) {
        const k = Math.round(((x - 4) * 5) / 8);
        t.v(x, 6 - k, 4 + 2 * k, 'g');
      }
      t.ol('k').bev('g', 'h', 's');
      c.bx(0, 5, 5, 6, 'e', 'l', 'a');
      c.blit(t, 0, 0);
      c.b(12, 0, 3, 16, 'k', 'a');
      c.v(7, 11, 3, 'k').h(4, 14, 6, 'k');
    },
    l: (c) => {
      const t = new Cv(32);
      for (let x = 9; x <= 25; x++) {
        const k = Math.round(((x - 9) * 10) / 16);
        t.v(x, 13 - k, 6 + 2 * k, 'g');
      }
      t.ol('k').bev('g', 'h', 's');
      c.bx(1, 10, 9, 12, 'e', 'l', 'a').r(3, 14, 5, 1, 'a').r(3, 17, 5, 1, 'a');
      c.blit(t, 0, 0);
      c.bx(25, 1, 5, 30, 'a', 'e', 'k');
      c.r(15, 22, 2, 6, 'k').v(17, 23, 5, 's');
      c.bx(9, 27, 14, 4, 'g', 'h', 's');
    },
  },

  /** Muster board: roll sheet with ticks and the badge that was read. */
  muster: {
    s: (c) => {
      c.b(0, 0, 11, 15, 'k', 'w').r(1, 1, 9, 2, 'n');
      for (const y of [4, 8]) c.p(1, y + 1, 'n').p(2, y + 2, 'n').p(3, y + 1, 'n').p(4, y, 'n').h(6, y + 1, 3, 'q');
      c.b(1, 11, 4, 3, 'k', 'w');
      badge16(c, 8, 6);
    },
    l: (c) => {
      c.b(2, 1, 20, 28, 'k', 'w');
      c.r(4, 3, 11, 2, 'n').h(4, 6, 16, 'q');
      for (const y of [8, 15, 22]) {
        c.b(4, y, 6, 6, 'k', 'w');
        c.h(12, y + 1, 8, 'q').h(12, y + 3, 5, 'q');
      }
      tick(c, 5, 9);
      tick(c, 5, 16);
      c.v(22, 3, 27, 's').h(4, 29, 19, 's');
      badge32(c, 16, 11);
      c.h(17, 30, 15, 's').v(31, 14, 17, 's');
    },
  },

  /** Hub circuit patch panel: jack field with one cord patched across. */
  patch: {
    s: (c) => {
      c.bx(0, 1, 16, 10, 'f', 'h', 's');
      for (const y of [3, 7]) for (const x of [2, 5, 8, 11]) c.r(x, y, 2, 2, 'k');
      c.h(2, 6, 12, 'q');
      c.b(4, 2, 4, 4, 'k', 'g');
      c.b(10, 6, 4, 4, 'k', 'g');
      c.r(5, 6, 2, 9, 'v').r(5, 13, 8, 2, 'v').r(11, 10, 2, 5, 'v');
    },
    l: (c) => {
      c.bx(0, 2, 32, 20, 'f', 'h', 's');
      c.h(2, 21, 29, 's');
      for (const y of [6, 14]) {
        for (const x of [3, 9, 15, 21, 27]) c.e(x, y, 4, 4, 'k', 'a');
        c.h(3, y - 2, 27, 'q');
      }
      const t = new Cv(32);
      t.r(8, 8, 4, 20, 'v').r(8, 25, 18, 4, 'v').r(22, 16, 4, 13, 'v');
      t.ol('k');
      t.p(8, 28, '_').p(25, 28, '_');
      c.blit(t, 0, 0);
      c.bx(6, 4, 8, 8, 'g', 'h', 's').r(9, 7, 2, 2, 'k');
      c.bx(20, 12, 8, 8, 'g', 'h', 's').r(23, 15, 2, 2, 'k');
    },
  },
} satisfies Record<string, IconDef>;
