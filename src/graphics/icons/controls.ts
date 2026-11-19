/** Pass-two toolbar and state icons for the plant applications. */
import { Cv, type Draw, type IconDef } from './canvas';
import { bell, blastDoor16, blastDoor32, btn, door16, door32, fanAt, padlock16, signal } from './shapes';

/* ---- Transport glyphs: navy, outlined and bevelled like Back/Forward, on the raised button by default. ---- */

const navy = (draw: (t: Cv) => void, n: 16 | 32): Draw => (c) => {
  const t = new Cv(n);
  draw(t);
  t.ol('k').bev('n', 'b', 'a');
  c.blit(t, 0, 0);
};

const play16 = navy((t) => {
  for (let i = 0; i <= 6; i++) t.v(5 + i, 2 + i, 12 - 2 * i, 'n');
}, 16);
const play32 = navy((t) => {
  for (let i = 0; i <= 11; i++) t.v(10 + i, 4 + i, 24 - 2 * i, 'n');
}, 32);

const pause16 = navy((t) => {
  t.r(3, 3, 4, 10, 'n').r(9, 3, 4, 10, 'n');
}, 16);
const pause32 = navy((t) => {
  t.r(7, 6, 7, 20, 'n').r(18, 6, 7, 20, 'n');
}, 32);

const rewind16 = navy((t) => {
  for (let i = 0; i <= 5; i++) t.v(2 + i, 7 - i, 2 + 2 * i, 'n').v(8 + i, 7 - i, 2 + 2 * i, 'n');
}, 16);
const rewind32 = navy((t) => {
  for (let i = 0; i <= 10; i++) t.v(4 + i, 15 - i, 2 + 2 * i, 'n').v(15 + i, 15 - i, 2 + 2 * i, 'n');
}, 32);

const record16: Draw = (c) => {
  c.e(3, 3, 10, 10, 'k', 'r');
  c.r(5, 5, 2, 1, 't').p(5, 6, 't');
};
const record32: Draw = (c) => {
  c.e(6, 6, 20, 20, 'k', 'r');
  c.r(10, 9, 4, 2, 't').r(9, 11, 2, 3, 't');
};

/* ---- Overlays, placed bottom right like the padlock on `folder-locked`. ---- */

const tick16 = ['......kk', '.....kvk', 'kk..kvk.', 'kvkkvk..', '.kvvk...', '..kk....'] as const;
const cross16 = ['kk..kk', 'krkkrk', '.krrk.', '.krrk.', 'krkkrk', 'kk..kk'] as const;

const tick32 = (c: Cv, x: number, y: number): void => {
  const t = new Cv(32);
  for (let i = 0; i <= 3; i++) t.r(x + i, y + 5 + i, 3, 4, 'v');
  for (let i = 0; i <= 8; i++) t.r(x + 4 + i, y + 8 - i, 3, 4, 'v');
  c.blit(t.ol('k'), 0, 0);
};
const cross32 = (c: Cv, x: number, y: number): void => {
  const t = new Cv(32);
  for (let i = 0; i <= 9; i++) t.r(x + i, y + i, 4, 1, 'r').r(x + 9 - i, y + i, 4, 1, 'r');
  c.blit(t.ol('k'), 0, 0);
};

const lock32 = (c: Cv): void => {
  const t = new Cv(16);
  t.blit(padlock16(), 0, 0);
  c.blit(t, 16, 15);
};

/** Small navy chevron arrows for the airlock cycle. */
const cycle16: Draw = (c) => {
  c.p(10, 0, 'n').h(2, 1, 10, 'n').p(10, 2, 'n').p(11, 0, '_');
  c.r(9, 0, 1, 3, 'n');
  c.p(5, 13, 'n').h(4, 14, 10, 'n').p(5, 15, 'n').r(6, 13, 1, 3, 'n');
};

const cageArrowUp = ['..kk..', '.knnk.', 'knnnnk', 'kknnkk', '.knnk.', '.knnk.', '.knnk.', '.kkkk.'] as const;

const upArrow32 = (dir: 'up' | 'down'): Cv => {
  const t = new Cv(16);
  if (dir === 'up') {
    for (let i = 0; i <= 5; i++) t.h(7 - i, 1 + i, 2 + 2 * i, 'n');
    t.r(5, 7, 6, 7, 'n');
  } else {
    for (let i = 0; i <= 5; i++) t.h(7 - i, 14 - i, 2 + 2 * i, 'n');
    t.r(5, 2, 6, 7, 'n');
  }
  return t.ol('k').bev('n', 'b', 'a');
};

const cage16 = (c: Cv): void => {
  c.v(5, 0, 3, 'd');
  c.bx(1, 3, 9, 12, 'g', 'h', 's');
  c.h(1, 3, 9, 'k').v(4, 5, 8, 'k').v(6, 5, 8, 'k');
};
const cage32 = (c: Cv): void => {
  c.r(9, 0, 2, 4, 'd');
  c.bx(2, 4, 16, 26, 'g', 'h', 's');
  c.r(2, 4, 16, 3, 'k').r(3, 27, 14, 1, 'k');
  for (const x of [6, 10, 14]) c.v(x, 8, 19, 'k');
  c.h(3, 30, 16, 's');
};

export const CONTROLS = {
  /** Four-way camera split. */
  'camera-grid': {
    s: (c) => {
      c.r(0, 0, 15, 15, 'k');
      for (const [x, y, dx] of [[1, 1, 3], [8, 1, 1], [1, 8, 0], [8, 8, 2]] as const) {
        c.r(x, y, 6, 6, 'a').r(x, y + 4, 6, 2, 'e').h(x, y + 4, 6, 'd');
        c.r(x + dx + 1, y + 1, 2, 3, 'd').p(x, y, 'h');
      }
      c.h(1, 15, 15, 's').v(15, 1, 14, 's');
    },
    l: (c) => {
      c.bx(0, 1, 32, 30, 'f', 'h', 's');
      c.r(2, 3, 28, 26, 'k');
      for (const [x, y, dx] of [[3, 4, 7], [17, 4, 2], [3, 16, 1], [17, 16, 5]] as const) {
        c.r(x, y, 12, 11, 'a');
        c.r(x, y + 7, 12, 4, 'e').h(x, y + 7, 12, 'd');
        c.b(x + dx, y + 2, 4, 6, 'k', 'd');
        c.h(x + 1, y + 1, 4, 'h').h(x + 9, y + 1, 2, 'h');
      }
      c.h(2, 30, 29, 's');
    },
  },

  play: btn(play16, play32),
  pause: btn(pause16, pause32),
  record: btn(record16, record32),
  rewind: btn(rewind16, rewind32),

  'door-open': {
    s: (c) => door16(c, false),
    l: (c) => door32(c, false),
  },
  'door-closed': {
    s: (c) => door16(c, true),
    l: (c) => door32(c, true),
  },
  'door-locked': {
    s: (c) => {
      door16(c, true);
      c.g(8, 8, ['..kkkk..', '.kk..kk.', '.kk..kk.', 'kkkkkkkk', 'kyoooouk', 'kyokkouk', 'kyoooouk', 'kkkkkkkk']);
    },
    l: (c) => {
      door32(c, true);
      lock32(c);
    },
  },

  /** Airlock cycle: the door pair between opposed arrows. */
  'airlock-cycle': {
    s: (c) => {
      cycle16(c);
      c.bx(1, 3, 7, 10, 'g', 'h', 's').bx(8, 3, 7, 10, 'g', 'h', 's');
      c.r(3, 5, 2, 2, 'l').r(10, 5, 2, 2, 'l');
    },
    l: (c) => {
      c.r(4, 3, 20, 2, 'n');
      for (let i = 0; i <= 3; i++) c.v(23 + i, 1 + i, 6 - 2 * i, 'n');
      c.r(8, 27, 20, 2, 'n');
      for (let i = 0; i <= 3; i++) c.v(8 - i, 25 + i, 6 - 2 * i, 'n');
      for (const x of [3, 16]) {
        c.bx(x, 8, 13, 17, 'g', 'h', 's');
        c.e(x + 3, 10, 7, 7, 'k', 'l');
        c.p(x + 5, 12, 'w');
      }
      c.r(12, 18, 2, 4, 'k').r(18, 18, 2, 4, 'k');
    },
  },

  'alarm-ack': {
    s: (c) => {
      c.blit(bell(16), 0, 0);
      c.g(8, 9, tick16);
    },
    l: (c) => {
      c.blit(bell(32), 0, 0);
      tick32(c, 16, 17);
    },
  },

  'alarm-silence': {
    s: (c) => {
      c.blit(bell(16), 0, 0);
      c.g(10, 10, cross16);
    },
    l: (c) => {
      c.blit(bell(32), 0, 0);
      cross32(c, 17, 18);
    },
  },

  'signal-clear': {
    s: (c) => signal(c, 16, 'clear'),
    l: (c) => signal(c, 32, 'clear'),
  },
  'signal-stop': {
    s: (c) => signal(c, 16, 'stop'),
    l: (c) => signal(c, 32, 'stop'),
  },

  /** Route set: mimic panel, the route through the crossover lit. */
  'route-set': {
    s: (c) => {
      c.b(0, 1, 16, 14, 'k', 'a');
      c.h(1, 5, 14, 'e').h(1, 10, 14, 'e');
      c.h(1, 10, 4, 'h').l(4, 10, 9, 5, 'h').h(9, 5, 4, 'h');
      c.v(13, 3, 5, 'h').v(14, 4, 3, 'h').p(15, 5, 'h');
      c.r(1, 12, 2, 2, 'v');
    },
    l: (c) => {
      c.bx(0, 2, 32, 28, 'f', 'h', 's');
      c.b(2, 4, 28, 24, 'k', 'a');
      c.r(3, 10, 26, 2, 'e').r(3, 20, 26, 2, 'e');
      c.p(14, 10, 'k').p(14, 11, 'k').p(22, 20, 'k').p(22, 21, 'k');
      c.r(3, 20, 6, 2, 'h');
      for (let i = 0; i <= 10; i++) c.r(8 + i, 20 - i, 2, 2, 'h');
      c.r(19, 10, 6, 2, 'h');
      for (let i = 0; i <= 3; i++) c.v(25 + i, 7 + i, 8 - 2 * i, 'h');
      c.r(4, 24, 3, 2, 'v').r(4, 14, 3, 2, 'd');
      c.h(2, 30, 30, 's');
    },
  },

  'cage-up': {
    s: (c) => {
      cage16(c);
      c.g(10, 4, cageArrowUp);
    },
    l: (c) => {
      cage32(c);
      c.blit(upArrow32('up'), 16, 7);
    },
  },
  'cage-down': {
    s: (c) => {
      cage16(c);
      c.g(10, 4, [...cageArrowUp].reverse().map((r) => (r === 'kknnkk' ? 'kknnkk' : r)));
    },
    l: (c) => {
      cage32(c);
      c.blit(upArrow32('down'), 16, 9);
    },
  },

  /** Emergency stop: red mushroom head in a caution-ochre housing. */
  estop: {
    s: (c) => {
      c.bx(1, 1, 14, 14, 'o', 'y', 'u');
      for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]] as const) c.p(x, y, '_');
      c.p(2, 2, 'k').p(13, 2, 'k').p(2, 13, 'k').p(13, 13, 'k');
      c.e(3, 3, 10, 10, 'k', 'r');
      c.r(5, 5, 2, 1, 't').p(5, 6, 't');
    },
    l: (c) => {
      c.bx(2, 2, 28, 28, 'o', 'y', 'u');
      for (const [x, y] of [[2, 2], [29, 2], [2, 29], [29, 29]] as const) c.p(x, y, '_');
      c.p(3, 3, 'k').p(28, 3, 'k').p(3, 28, 'k').p(28, 28, 'k');
      c.e(5, 5, 22, 22, 'k', 'g');
      const t = new Cv(32);
      t.e(7, 7, 18, 18, 'r', 'r');
      t.ol('k').bev('r', 't', 'r');
      c.blit(t, 0, 0);
      c.r(11, 10, 3, 2, 't').r(10, 12, 2, 2, 't');
      c.h(4, 30, 26, 's');
    },
  },

  /** Fan: square housing, round opening, four swept blades. */
  fan: {
    s: (c) => {
      c.bx(0, 0, 16, 16, 'g', 'h', 's');
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]] as const) c.p(x, y, 'k');
      fanAt(c, 2, 2, 12);
    },
    l: (c) => {
      c.bx(1, 1, 30, 30, 'g', 'h', 's');
      for (const [x, y] of [[3, 3], [27, 3], [3, 27], [27, 27]] as const) c.r(x, y, 2, 2, 'k');
      fanAt(c, 4, 4, 24);
    },
  },

  /** Tone chime: tubular chimes of falling length on a bar. */
  chime: {
    s: (c) => {
      c.b(0, 0, 16, 4, 'k', 'm').h(1, 1, 14, 'y');
      [12, 10, 8, 6].forEach((h, i) => c.b(1 + 4 * i, 3, 3, h, 'k', 'g').v(2 + 4 * i, 4, h - 3, 'h'));
      c.h(1, 3, 3, 'k');
    },
    l: (c) => {
      c.bx(1, 1, 30, 5, 'u', 'm', 'k');
      [24, 20, 16, 12].forEach((h, i) => {
        const x = 3 + 7 * i;
        c.v(x + 2, 6, 1, 'k');
        c.bx(x, 7, 5, h, 'g', 'h', 's');
        c.h(x, 7, 5, 'k');
      });
      c.l(22, 26, 28, 20, 'u').l(23, 26, 29, 20, 'u');
      c.bx(24, 25, 6, 5, 'g', 'h', 's');
    },
  },

  /** Identity badge on its clip. */
  badge: {
    s: (c) => {
      c.r(6, 0, 4, 2, 'k').r(7, 0, 2, 1, 'g');
      c.bx(3, 2, 10, 14, 'w', 'w', 'q');
      c.r(4, 3, 8, 2, 'n');
      c.b(4, 6, 5, 6, 'k', 'l').r(5, 7, 3, 2, 'a').r(5, 10, 3, 1, 'a');
      c.h(10, 7, 2, 'q').h(10, 9, 2, 'q');
      c.h(4, 13, 7, 'k');
    },
    l: (c) => {
      c.r(13, 0, 6, 4, 'k').r(14, 1, 4, 2, 'g');
      c.bx(6, 4, 20, 27, 'w', 'w', 'q');
      c.r(7, 5, 18, 5, 'n').r(13, 6, 6, 2, 'a');
      c.b(9, 12, 9, 11, 'k', 'l');
      c.e(11, 13, 5, 5, 'a', 'a').r(10, 19, 7, 3, 'a');
      c.h(20, 13, 4, 'q').h(20, 15, 4, 'q').h(20, 17, 3, 'q').h(20, 20, 4, 'q');
      for (const [x, w] of [[9, 2], [12, 1], [14, 2], [17, 1], [19, 1], [21, 2]] as const) c.r(x, 25, w, 3, 'k');
      c.h(7, 31, 20, 's');
    },
  },

  /** Jack: a plug going into a panel socket. */
  jack: {
    s: (c) => {
      c.bx(11, 1, 5, 14, 'f', 'h', 's');
      c.r(12, 6, 3, 4, 'k');
      c.r(0, 7, 2, 2, 'v');
      c.bx(2, 5, 6, 6, 'g', 'h', 's');
      c.h(8, 6, 4, 'k').h(8, 7, 4, 'g').h(8, 8, 4, 's').h(8, 9, 4, 'k');
    },
    l: (c) => {
      c.bx(21, 1, 10, 30, 'f', 'h', 's');
      c.e(22, 7, 8, 8, 'k', 'g').e(24, 9, 4, 4, 'k', 'a');
      c.e(22, 19, 8, 8, 'k', 'g').e(24, 21, 4, 4, 'k', 'a');
      const t = new Cv(32);
      t.r(0, 9, 4, 4, 'v');
      c.blit(t.ol('k'), 0, 0);
      c.bx(3, 6, 10, 10, 'g', 'h', 's');
      c.b(12, 8, 3, 6, 'k', 's');
      c.r(14, 9, 10, 4, 'g').h(14, 9, 10, 'k').h(14, 12, 10, 'k').h(14, 10, 9, 'h');
    },
  },

  /** Loopback: a circuit sent out and turned straight back into its own jack. */
  loopback: {
    s: (c) => {
      c.b(0, 2, 5, 12, 'k', 'f').v(1, 3, 10, 'h');
      c.r(2, 4, 2, 2, 'k').r(2, 10, 2, 2, 'k');
      c.r(5, 4, 8, 2, 'n').r(12, 5, 2, 6, 'n').p(12, 4, 'n').p(12, 11, 'n');
      c.r(8, 10, 5, 2, 'n');
      c.v(7, 8, 6, 'n').v(6, 9, 4, 'n').v(5, 10, 2, 'n');
    },
    l: (c) => {
      c.bx(0, 5, 9, 22, 'f', 'h', 's');
      c.e(1, 8, 7, 7, 'k', 'a').e(1, 17, 7, 7, 'k', 'a');
      const t = new Cv(32);
      t.r(8, 10, 18, 3, 'n');
      t.r(23, 10, 3, 12, 'n').r(26, 12, 2, 8, 'n');
      t.r(12, 19, 14, 3, 'n');
      for (let i = 0; i <= 4; i++) t.v(8 + i, 20 - i, 1 + 2 * i, 'n');
      t.r(23, 10, 1, 1, '_').r(23, 21, 1, 1, '_');
      c.blit(t.ol('k').bev('n', 'b', 'a'), 0, 0);
    },
  },

  /** Yield: selector knob over a graduated scale. */
  yield: {
    s: (c) => {
      c.bx(0, 0, 16, 16, 'f', 'h', 's');
      c.p(2, 10, 'k').p(3, 5, 'k').r(6, 2, 2, 1, 'k').r(10, 2, 2, 2, 'k').r(12, 5, 2, 3, 'k');
      c.e(3, 5, 9, 9, 'k', 'g');
      c.p(5, 7, 'h').p(6, 6, 'h').p(5, 8, 'h');
      c.l(7, 9, 9, 7, 'k').l(8, 9, 10, 7, 'k');
    },
    l: (c) => {
      c.bx(1, 1, 30, 30, 'f', 'h', 's');
      c.r(4, 22, 2, 2, 'k').r(4, 12, 2, 2, 'k').r(8, 5, 3, 3, 'k').r(15, 3, 3, 3, 'k').r(22, 4, 4, 4, 'k');
      c.e(6, 9, 20, 20, 'k', 's');
      const t = new Cv(32);
      t.e(8, 11, 16, 16, 'g', 'g');
      t.ol('k').bev('g', 'h', 's');
      c.blit(t, 0, 0);
      for (let i = 0; i <= 6; i++) c.r(15 + i, 17 - i, 2, 2, 'k');
      c.h(2, 31, 30, 's').v(31, 2, 30, 's');
    },
  },

  /** Target point: crosshair with the point in oxblood. */
  'target-point': {
    s: (c) => {
      c.e(2, 2, 12, 12, 'k', 'w');
      c.r(7, 0, 2, 5, 'k').r(7, 11, 2, 5, 'k').r(0, 7, 5, 2, 'k').r(11, 7, 5, 2, 'k');
      c.r(7, 7, 2, 2, 'r');
    },
    l: (c) => {
      c.e(4, 4, 24, 24, 'k', 'w').e(5, 5, 22, 22, 'k');
      c.r(15, 0, 2, 10, 'k').r(15, 22, 2, 10, 'k').r(0, 15, 10, 2, 'k').r(22, 15, 10, 2, 'k');
      c.b(13, 13, 6, 6, 'k', 'r').r(14, 14, 2, 1, 't');
    },
  },

  /** Start a seal drill: the blast door, a green start mark. */
  'drill-start': {
    s: (c) => {
      blastDoor16(c);
      c.g(9, 6, ['kk.....', 'kvk....', 'kvvk...', 'kvvvk..', 'kvvvvk.', 'kvvvvvk', 'kvvvvk.', 'kvvvk..', 'kvvk...', 'kvk....']);
      c.p(9, 15, 'k').p(10, 15, 'k');
    },
    l: (c) => {
      blastDoor32(c);
      const t = new Cv(32);
      for (let i = 0; i <= 8; i++) t.v(17 + i, 13 + i, 18 - 2 * i, 'v');
      c.blit(t.ol('k'), 0, 0);
    },
  },

  /** Abort a seal drill: the blast door, the no-entry disc. */
  'drill-abort': {
    s: (c) => {
      blastDoor16(c);
      c.e(8, 8, 8, 8, 'k', 'r');
      c.r(10, 11, 4, 2, 'w');
    },
    l: (c) => {
      blastDoor32(c);
      c.e(15, 15, 16, 16, 'k', 'r');
      c.e(16, 16, 14, 14, 't');
      c.r(18, 22, 10, 3, 'w');
    },
  },

  /** Key: brass key for a key switch (the smart token is `key-token`). */
  key: {
    s: (c) => {
      const t = new Cv(16);
      t.e(0, 4, 8, 8, 'o', 'o');
      t.r(7, 6, 9, 4, 'o').r(9, 9, 3, 3, 'o').r(13, 9, 3, 2, 'o');
      t.ol('k').bev('o', 'y', 'u');
      t.r(3, 7, 2, 2, 'k');
      c.blit(t, 0, 0);
    },
    l: (c) => {
      const t = new Cv(32);
      t.e(1, 8, 15, 15, 'o', 'o');
      t.r(14, 12, 18, 6, 'o').r(19, 17, 5, 6, 'o').r(26, 17, 5, 4, 'o');
      t.ol('k').bev('o', 'y', 'u');
      t.e(5, 12, 7, 7, 'k', '_');
      t.h(16, 14, 14, 'u');
      c.blit(t, 0, 0);
    },
  },
} satisfies Record<string, IconDef>;
