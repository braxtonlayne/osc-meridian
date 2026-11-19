/**
 * Procedural camera scenes. Every camera is built from its canon record (kind, location, level)
 * and a seed taken from its id, so the same camera always shows the same room: the corridor
 * length, where the doors are, which ceiling fitting is out, where the extinguisher hangs.
 *
 * Geometry is in metres. Surfaces carry a luminance (0..255) rather than a colour: the picture is
 * a monochrome camera's, and the renderer turns luminance into grey. Nothing here touches the DOM.
 */
import type { V3 } from './project';

export type SceneKind =
  | 'corridor'
  | 'lobby'
  | 'gate'
  | 'surfacedoor'
  | 'portal'
  | 'airlock'
  | 'platform'
  | 'vault'
  | 'hoist'
  | 'generator'
  | 'ahu'
  | 'depot'
  | 'assembly'
  | 'shelter';

export type CameraKind = 'corridor' | 'portal' | 'platform' | 'vault' | 'hoist' | 'plant' | 'assembly';

export interface Poly {
  p: V3[];
  /** Luminance 0..255 before exposure. */
  l: number;
  /** Outline luminance, when the edge should read (door frames, kerbs). */
  line?: number;
  /** Not darkened with distance (lit fittings, signs). */
  emissive?: boolean;
}

/** A prop: its faces are drawn together, props ordered far to near by `at`. */
export interface Group {
  polys: Poly[];
  at: V3;
}

export interface Light {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  /** 0 = on at standby, 1 = on at night, 2 = day only. */
  tier: 0 | 1 | 2;
  /** Fitting out of service (stays dark; the seed decides, it never flickers). */
  dead: boolean;
}

export interface SceneText {
  at: V3;
  /** Letter height, metres. */
  size: number;
  text: string;
  l: number;
}

export interface Lane {
  a: V3;
  b: V3;
  /** Wide enough for an electric cart. */
  cart: boolean;
}

export interface DoorSlot {
  role: 'primary' | 'secondary';
  style: 'slide' | 'swing' | 'vault';
  /** Opening, world metres, in a plane of constant z. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z: number;
  /** Leaf thickness (slide) toward the camera. */
  thick: number;
  l: number;
  /** Which way a sliding leaf retracts, or which jamb a swinging leaf hinges on. */
  side: 1 | -1;
}

export interface TrackBed {
  x0: number;
  x1: number;
  /** Rail head height (platform floor is 0). */
  y: number;
  /** Stop mark (head of a train standing at the platform). */
  zStop: number;
  /** Tunnel mouth plane. */
  zMouth: number;
  len: number;
  /** Platform edge side: a train shows this face. */
  faceX: number;
}

export interface Shaft {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z: number;
  depth: number;
}

export interface Mount {
  x: number;
  y: number;
  z: number;
  /** Radians. */
  yaw: number;
  pitch: number;
  f: number;
}

export interface Scene {
  id: string;
  kind: SceneKind;
  seed: number;
  outdoor: boolean;
  mount: Mount;
  /** Room surfaces (drawn first, in order). */
  shell: Poly[];
  /** Flat details on the shell (drawn in order after it). */
  decals: Poly[];
  /** Props behind anything that moves. */
  back: Group[];
  /** Props in front of trains and doors (platform columns). */
  front: Group[];
  lights: Light[];
  texts: SceneText[];
  lanes: Lane[];
  seats: V3[];
  stands: V3[];
  doors: DoorSlot[];
  track: TrackBed | null;
  shaft: Shaft | null;
  /** Floor extent for crowd placement. */
  room: { x0: number; x1: number; z0: number; z1: number; h: number };
  /** Picture brightness at the camera's normal exposure. */
  exposure: number;
}

export interface SceneSpec {
  id: string;
  kind: CameraKind;
  location: string;
  level: number;
  /** Placard texts the scene may carry: level number, platform number, cage rating. */
  labels?: { level?: string; platform?: string; sign?: string };
  /** Force a scene kind (unassigned channels). */
  scene?: SceneKind;
}

/* ------------------------------------------------------------ seeding */

export function hashId(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scene kind for a canon camera. */
export function sceneKindFor(kind: CameraKind, location: string): SceneKind {
  const loc = location.toLowerCase();
  switch (kind) {
    case 'portal':
      if (loc.includes('gate')) return 'gate';
      if (loc.includes('surface access')) return 'surfacedoor';
      if (loc.includes('airlock')) return 'airlock';
      return 'portal';
    case 'corridor':
      return loc.includes('lift lobby') ? 'lobby' : 'corridor';
    case 'plant':
      if (loc.includes('generator')) return 'generator';
      if (loc.includes('depot')) return 'depot';
      return 'ahu';
    case 'assembly':
      return loc.includes('shelter') ? 'shelter' : 'assembly';
    default:
      return kind;
  }
}

/** Preset family a scene's PTZ presets come from (null = fixed camera). */
export function presetScene(k: SceneKind): 'gate' | 'portal' | 'platform' | 'assembly' | null {
  if (k === 'gate' || k === 'surfacedoor') return 'gate';
  if (k === 'portal' || k === 'airlock') return 'portal';
  if (k === 'platform') return 'platform';
  if (k === 'assembly' || k === 'shelter') return 'assembly';
  return null;
}

/* ------------------------------------------------------------ builders */

const DEG = Math.PI / 180;

class Builder {
  shell: Poly[] = [];
  decals: Poly[] = [];
  back: Group[] = [];
  front: Group[] = [];
  lights: Light[] = [];
  texts: SceneText[] = [];
  lanes: Lane[] = [];
  seats: V3[] = [];
  stands: V3[] = [];
  doors: DoorSlot[] = [];
  track: TrackBed | null = null;
  shaft: Shaft | null = null;
  constructor(
    public r: () => number,
    public cam: { x: number; y: number; z: number },
  ) {}

  rand(a: number, b: number): number {
    return a + (b - a) * this.r();
  }

  /** Inside of a rectangular room, z from behind the camera to `L`. */
  room(x0: number, x1: number, h: number, L: number, l: { floor: number; ceil: number; left: number; right: number; end: number }): void {
    const z0 = -1;
    this.shell.push(
      { p: [[x0, 0, z0], [x1, 0, z0], [x1, 0, L], [x0, 0, L]], l: l.floor },
      { p: [[x0, h, z0], [x0, h, L], [x1, h, L], [x1, h, z0]], l: l.ceil },
      { p: [[x0, 0, z0], [x0, 0, L], [x0, h, L], [x0, h, z0]], l: l.left },
      { p: [[x1, 0, z0], [x1, h, z0], [x1, h, L], [x1, 0, L]], l: l.right },
      { p: [[x0, 0, L], [x1, 0, L], [x1, h, L], [x0, h, L]], l: l.end },
    );
  }

  /** Rectangle on a wall plane x = const (decal), from z0..z1, y0..y1. */
  wallX(x: number, z0: number, z1: number, y0: number, y1: number, l: number, line?: number, emissive?: boolean): void {
    this.decals.push({ p: [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], l, line, emissive });
  }

  /** Rectangle on a plane z = const. */
  wallZ(z: number, x0: number, x1: number, y0: number, y1: number, l: number, line?: number, emissive?: boolean): void {
    this.decals.push({ p: [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], l, line, emissive });
  }

  /** Rectangle on a plane y = const (floor marking or ceiling panel). */
  flat(y: number, x0: number, x1: number, z0: number, z1: number, l: number, emissive?: boolean): void {
    this.decals.push({ p: [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], l, emissive });
  }

  /** Floor joints across a room every `step` metres. */
  joints(x0: number, x1: number, z0: number, z1: number, step: number, l: number): void {
    for (let z = z0; z < z1; z += step) this.flat(0.0005, x0, x1, z, z + 0.03, l);
  }

  /** A solid box prop; only the faces the camera can see are kept. */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, l: number, where: 'back' | 'front' = 'back', opts: { line?: number; top?: number } = {}): Group {
    const c = this.cam;
    const polys: Poly[] = [];
    const side = l * 0.82;
    if (c.z < z0) polys.push({ p: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], l, line: opts.line });
    if (c.z > z1) polys.push({ p: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], l, line: opts.line });
    if (c.x < x0) polys.push({ p: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], l: side, line: opts.line });
    if (c.x > x1) polys.push({ p: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], l: side, line: opts.line });
    if (c.y > y1) polys.push({ p: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], l: opts.top ?? Math.min(255, l * 1.08), line: opts.line });
    if (c.y < y0) polys.push({ p: [[x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0]], l: l * 0.6 });
    const g: Group = { polys, at: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] };
    (where === 'back' ? this.back : this.front).push(g);
    return g;
  }

  /** A row of ceiling fittings down the room; the seed puts one or two out. */
  lightRow(x: number, y: number, z0: number, z1: number, step: number, w = 0.3, d = 1.2): void {
    let i = 0;
    for (let z = z0; z <= z1; z += step, i++) {
      const tier: 0 | 1 | 2 = i % 4 === 0 ? 0 : i % 2 === 0 ? 1 : 2;
      this.lights.push({ x, y, z, w, d, tier, dead: this.r() < 0.07 });
    }
  }

  text(at: V3, size: number, text: string, l: number): void {
    this.texts.push({ at, size, text, l });
  }
}

function sorted(groups: Group[], cam: { x: number; y: number; z: number }): Group[] {
  const d = (g: Group) => Math.hypot(g.at[0] - cam.x, g.at[1] - cam.y, g.at[2] - cam.z);
  return groups.slice().sort((a, b) => d(b) - d(a));
}

/** Build the scene for one camera. Deterministic in `spec.id`. */
export function buildScene(spec: SceneSpec): Scene {
  const seed = hashId(spec.id);
  const r = mulberry(seed);
  const kind = spec.scene ?? sceneKindFor(spec.kind, spec.location);
  const labels = spec.labels ?? {};
  let mount: Mount;
  let outdoor = false;
  let exposure = 1;
  let room: Scene['room'];

  // The mounting point is decided first: the builder culls prop faces against it.
  const mk = (x: number, y: number, yawDeg: number, pitchDeg: number, f = 0.8): Mount => ({ x, y, z: 0, yaw: yawDeg * DEG, pitch: pitchDeg * DEG, f });

  let b: Builder;
  switch (kind) {
    case 'corridor':
    case 'lobby': {
      const lobby = kind === 'lobby';
      const w = lobby ? 4 + r() * 1.2 : 2.4 + r() * 0.8;
      const h = 2.7 + r() * 0.3;
      const L = lobby ? 11 + r() * 4 : 24 + r() * 20;
      const x0 = -w / 2;
      const x1 = w / 2;
      mount = mk(x0 + 0.35, h - 0.15, lobby ? 14 : 5 + r() * 3, lobby ? -16 : -11);
      b = new Builder(r, mount);
      b.room(x0, x1, h, L, { floor: 112, ceil: 86, left: 156, right: 146, end: 104 });
      b.joints(x0, x1, 0.6, L, 1.2, 96);
      // skirting and a mid-height rail
      b.wallX(x0 + 0.001, -1, L, 0, 0.12, 70);
      b.wallX(x1 - 0.001, -1, L, 0, 0.12, 70);
      b.wallX(x0 + 0.002, -1, L, 1.05, 1.1, 120);
      // services: a cable tray and a pipe run
      b.box(x1 - 0.6, x1 - 0.2, h - 0.38, h - 0.3, -1, L, 74);
      b.box(x0 + 0.05, x0 + 0.17, h - 0.5, h - 0.38, -1, L, 128);
      if (lobby) {
        // two pairs of lift doors on the right wall, call station between them
        const zA = 3 + r() * 2;
        for (const z of [zA, zA + 2.6]) {
          b.wallX(x1 - 0.002, z - 0.2, z + 1.4, 0, 2.35, 120, 70);
          b.wallX(x1 - 0.003, z, z + 1.2, 0, 2.2, 178, 96);
          b.wallX(x1 - 0.004, z + 0.595, z + 0.605, 0, 2.2, 80);
          b.wallX(x1 - 0.003, z + 0.4, z + 0.8, 2.3, 2.45, 40, undefined, true);
        }
        b.wallX(x1 - 0.003, zA + 1.55, zA + 1.75, 1.1, 1.4, 205, 90);
        // the corridor carries on through an opening at the end; the level placard is over it
        b.wallZ(L - 0.001, -1.1, 1.1, 0, 2.3, 34);
        b.wallZ(L - 0.002, -1, 1, 2.36, 2.62, 214, 80);
        b.text([0, 2.49, L - 0.01], 0.17, labels.level ? `LEVEL ${labels.level}` : 'LEVEL', 40);
        b.lanes.push({ a: [0, 0, L - 0.6], b: [x1 - 1, 0, zA + 0.6], cart: false });
        b.lanes.push({ a: [x1 - 1, 0, zA + 3.2], b: [-0.2, 0, L - 0.6], cart: false });
        b.lanes.push({ a: [-0.4, 0, L - 0.4], b: [-0.6, 0, 1.2], cart: false });
        b.lightRow(0, h - 0.002, 1.5, L - 1, 3.2, 0.6, 0.6);
      } else {
        // doors along both walls, an extinguisher, a notice board, and a door at the end
        let z = 3 + r() * 3;
        let n = 0;
        while (z < L - 3) {
          const left = r() < 0.5;
          const x = left ? x0 + 0.002 : x1 - 0.002;
          b.wallX(x, z - 0.08, z + 1.03, 0, 2.18, 182, 92);
          b.wallX(left ? x + 0.001 : x - 0.001, z, z + 0.95, 0, 2.1, 98 + r() * 30);
          b.wallX(left ? x + 0.002 : x - 0.002, z + 0.35, z + 0.6, 2.24, 2.34, 216);
          z += 3.5 + r() * 4.5;
          n++;
        }
        const ze = 4 + r() * (L - 10);
        b.box(x0 + 0.02, x0 + 0.2, 0.9, 1.5, ze, ze + 0.25, 54);
        if (n % 2 === 0) b.wallX(x1 - 0.002, ze + 2, ze + 3.2, 1.2, 1.9, 208, 110);
        b.wallZ(L - 0.002, -0.55, 0.55, 0, 2.1, 72, 150);
        b.wallZ(L - 0.003, -0.15, 0.15, 1.3, 1.65, 150);
        b.lanes.push({ a: [0.1, 0, L - 0.8], b: [0.25, 0, 0.8], cart: true });
        b.lanes.push({ a: [-0.3, 0, 0.8], b: [-0.2, 0, L - 0.8], cart: true });
        b.lightRow(0, h - 0.002, 2, L - 0.5, 3.6 + r() * 0.8);
      }
      room = { x0: x0 + 0.4, x1: x1 - 0.4, z0: 1.5, z1: L - 1, h };
      break;
    }

    case 'gate':
    case 'surfacedoor': {
      outdoor = true;
      mount = mk(-3.5, 5.2, 6 + r() * 4, -8, 0.82);
      b = new Builder(r, mount);
      const far = 180;
      // sky is drawn by the renderer; the ground plane and road are the shell
      b.shell.push({ p: [[-90, 0, -1], [90, 0, -1], [90, 0, far], [-90, 0, far]], l: 96 });
      if (kind === 'gate') {
        b.decals.push({ p: [[-3.2, 0.001, -1], [3.2, 0.001, -1], [2.4, 0.001, far], [-2.4, 0.001, far]], l: 70 });
        for (let z = 2; z < far; z += 9) b.flat(0.002, -0.08, 0.08, z, z + 3, 170);
        // barrier arm, gatehouse, fence lines
        b.box(2.8, 3.3, 0, 1.1, 13.6, 14.1, 120);
        b.box(-2.8, 2.8, 0.95, 1.05, 13.8, 13.9, 210);
        b.box(4.2, 7.4, 0, 2.7, 9, 12.4, 150, 'back', { top: 90 });
        b.wallZ(8.999, 4.8, 6.2, 1.1, 2.0, 50);
        for (let z = 6; z < 120; z += 6) {
          b.box(-9.05, -8.95, 0, 2.4, z, z + 0.1, 92);
          b.box(8.95, 9.05, 0, 2.4, z, z + 0.1, 92);
        }
        for (const y of [0.9, 1.6, 2.3]) {
          b.decals.push({ p: [[-9, y, 6], [-9, y, 120], [-9, y + 0.03, 120], [-9, y + 0.03, 6]], l: 70 });
          b.decals.push({ p: [[9, y, 6], [9, y + 0.03, 6], [9, y + 0.03, 120], [9, y, 120]], l: 70 });
        }
        b.lanes.push({ a: [1.2, 0, 70], b: [1.4, 0, 3], cart: true });
        b.lanes.push({ a: [5.6, 0, 9.2], b: [1.5, 0, 12], cart: false });
        b.lights.push({ x: 6, y: 6, z: 16, w: 0.5, d: 0.5, tier: 1, dead: false }, { x: -6, y: 6, z: 30, w: 0.5, d: 0.5, tier: 1, dead: false });
        b.text([3.05, 0.6, 13.55], 0.16, labels.sign ?? 'STOP', 30);
      } else {
        // the surface access building: a blank wall with one steel door
        b.box(-6, 6, 0, 4.2, 10, 16, 142, 'back', { top: 100 });
        b.wallZ(9.999, -0.55, 0.55, 0, 2.15, 92, 60);
        b.wallZ(9.998, -0.3, 0.3, 2.4, 2.6, 40);
        b.flat(0.002, -1.6, 1.6, 7.5, 10, 120);
        for (let z = 4; z < 60; z += 5) b.box(8.95, 9.05, 0, 2.2, z, z + 0.1, 92);
        b.decals.push({ p: [[9, 2.1, 4], [9, 2.13, 4], [9, 2.13, 60], [9, 2.1, 60]], l: 70 });
        b.lanes.push({ a: [-8, 0, 7], b: [0, 0, 9.6], cart: false });
        b.lights.push({ x: 0, y: 3.4, z: 9.8, w: 0.4, d: 0.4, tier: 1, dead: false });
      }
      room = { x0: -2, x1: 2, z0: 6, z1: 12, h: 4 };
      exposure = 1;
      break;
    }

    case 'portal':
    case 'airlock': {
      const air = kind === 'airlock';
      const w = air ? 3.4 : 7 + r();
      const h = air ? 2.9 : 5.6 + r() * 0.6;
      const L = air ? 7 : 20 + r() * 6;
      const x0 = -w / 2;
      const x1 = w / 2;
      mount = mk(x0 + 0.4, h - 0.2, air ? 12 : 8, air ? -18 : -10);
      b = new Builder(r, mount);
      b.room(x0, x1, h, L, { floor: 102, ceil: 70, left: 128, right: 120, end: 116 });
      if (air) {
        b.wallZ(L - 0.001, -0.7, 0.7, 0, 2.25, 66, 140);
        b.doors.push({ role: 'primary', style: 'swing', x0: -0.55, x1: 0.55, y0: 0, y1: 2.1, z: L - 0.01, thick: 0.08, l: 168, side: 1 });
        b.box(x1 - 0.35, x1 - 0.05, 1.1, 1.6, L - 2, L - 1.4, 150);
        b.wallX(x1 - 0.36, L - 1.9, L - 1.5, 1.42, 1.5, 236, undefined, true);
        for (let i = 0; i < 6; i++) b.flat(0.002, -0.9 + i * 0.3, -0.75 + i * 0.3, L - 1.4, L - 1, i % 2 ? 210 : 52);
        b.lanes.push({ a: [0, 0, L - 0.8], b: [-0.2, 0, 0.9], cart: false });
        b.lightRow(0, h - 0.002, 1.5, L - 1, 2.6, 0.5, 0.5);
      } else {
        // the portal opening in the end wall: portal door behind, blast door in front on its track
        const ow = 4.2 + r() * 0.6;
        const oh = 4.2;
        b.wallZ(L - 0.001, -ow / 2 - 0.25, ow / 2 + 0.25, 0, oh + 0.25, 82, 160);
        b.wallZ(L - 0.002, -ow / 2, ow / 2, 0, oh, 28);
        b.doors.push({ role: 'secondary', style: 'slide', x0: -ow / 2, x1: ow / 2, y0: 0, y1: oh, z: L - 0.02, thick: 0.05, l: 132, side: -1 });
        b.doors.push({ role: 'primary', style: 'slide', x0: -ow / 2 - 0.2, x1: ow / 2 + 0.2, y0: 0, y1: oh + 0.2, z: L - 1.6, thick: 0.7, l: 170, side: 1 });
        // the blast door's pocket and track
        b.box(ow / 2 + 0.2, x1, 0, oh + 0.6, L - 2.4, L - 1, 110);
        b.flat(0.002, -ow / 2 - 0.4, x1, L - 1.75, L - 1.45, 60);
        for (let i = 0; i < 12; i++) b.flat(0.003, -ow / 2 + i * (ow / 12), -ow / 2 + (i + 0.5) * (ow / 12), L - 3, L - 2.6, 205);
        // bollards and a walkway line
        for (const x of [-ow / 2 - 0.6, ow / 2 + 0.6]) b.box(x - 0.12, x + 0.12, 0, 1, L - 5, L - 4.76, 190);
        b.flat(0.002, x0 + 1.1, x0 + 1.2, 0.5, L - 4, 210);
        b.lanes.push({ a: [x0 + 0.7, 0, L - 3], b: [x0 + 0.7, 0, 1], cart: false });
        b.lanes.push({ a: [0.3, 0, 1], b: [0, 0, L - 3.2], cart: true });
        b.lightRow(-1.4, h - 0.002, 2, L - 2, 4.4, 0.6, 0.6);
        b.lightRow(1.4, h - 0.002, 4, L - 2, 4.4, 0.6, 0.6);
      }
      room = { x0: x0 + 0.5, x1: x1 - 0.5, z0: 2, z1: L - (air ? 1.5 : 4), h };
      break;
    }

    case 'platform': {
      const L = 56 + r() * 16;
      const h = 6;
      const x0 = -6;
      const x1 = 5.4;
      mount = mk(-4.4, 4.6, 9, -10);
      b = new Builder(r, mount);
      b.room(x0, x1, h, L, { floor: 118, ceil: 66, left: 132, right: 112, end: 100 });
      // track pit: lowered floor between the platform edge and the far wall
      b.decals.push({ p: [[0.6, 0.001, -1], [x1, 0.001, -1], [x1, 0.001, L], [0.6, 0.001, L]], l: 34 });
      b.decals.push({ p: [[0.6, 0.002, -1], [0.6, 0.002, L], [0.62, -1.1, L], [0.62, -1.1, -1]], l: 58 });
      b.flat(0.003, 0.1, 0.55, -1, L, 214);
      for (const x of [1.6, 3.1]) b.decals.push({ p: [[x, 0.004, -1], [x + 0.07, 0.004, -1], [x + 0.07, 0.004, L], [x, 0.004, L]], l: 150 });
      // the tunnel mouth and its portal door
      b.wallZ(L - 0.001, 0.6, 4.6, 0, 4.4, 14, 120);
      b.doors.push({ role: 'secondary', style: 'slide', x0: 0.6, x1: 4.6, y0: 0, y1: 4.4, z: L - 0.05, thick: 0.4, l: 120, side: -1 });
      b.track = { x0: 0.9, x1: 4.2, y: 0, zStop: 5, zMouth: L - 0.06, len: 46, faceX: 0.9 };
      // columns along the platform, nearer the camera than anything on the track
      for (let z = 7; z < L - 4; z += 9) b.box(-3.4, -2.9, 0, h, z, z + 0.5, 150, 'front');
      // hanging platform sign
      const sz = 12 + r() * 6;
      b.box(-2.2, 0.2, 3.4, 3.95, sz, sz + 0.08, 206);
      b.text([-1, 3.62, sz - 0.01], 0.38, labels.platform ? `PLATFORM ${labels.platform}` : 'PLATFORM', 40);
      // benches and a help point
      for (let z = 11; z < L - 10; z += 13) b.box(-5.9, -5.4, 0, 0.45, z, z + 1.8, 96);
      b.box(-5.95, -5.75, 1.1, 1.7, 20, 20.4, 180);
      b.lanes.push({ a: [-1.5, 0, L - 6], b: [-1.8, 0, 2], cart: false });
      b.lanes.push({ a: [-4.2, 0, 2.5], b: [-3.9, 0, L - 8], cart: true });
      b.lightRow(-3.9, h - 0.002, 2, L - 2, 4.2, 0.3, 1.4);
      b.lightRow(-0.6, h - 0.002, 4, L - 2, 4.2, 0.3, 1.4);
      for (let i = 0; i < 4; i++) b.stands.push([-1.9 + i * 0.45, 0, 15 + i * 0.6]);
      room = { x0: -5.4, x1: -0.2, z0: 3, z1: L - 6, h };
      break;
    }

    case 'vault': {
      const w = 6 + r();
      const h = 3.5;
      const L = 9 + r() * 2;
      mount = mk(-w / 2 + 0.4, h - 0.15, 10, -12);
      b = new Builder(r, mount);
      b.room(-w / 2, w / 2, h, L, { floor: 108, ceil: 74, left: 136, right: 128, end: 124 });
      b.joints(-w / 2, w / 2, 0.6, L, 1.2, 94);
      b.doors.push({ role: 'primary', style: 'vault', x0: -1.3, x1: 1.3, y0: 0.2, y1: 2.8, z: L - 0.02, thick: 0.6, l: 176, side: 1 });
      for (let i = 0; i < 8; i++) b.flat(0.002, -1.6 + i * 0.4, -1.4 + i * 0.4, L - 1.5, L - 1.1, i % 2 ? 210 : 50);
      b.box(-w / 2 + 0.1, -w / 2 + 0.9, 0, 0.78, 3, 4.6, 112);
      b.box(-w / 2 + 0.25, -w / 2 + 0.75, 0.78, 0.83, 3.4, 3.8, 220);
      b.wallX(w / 2 - 0.002, 2.5, 3.6, 1.3, 2, 210, 100);
      b.lanes.push({ a: [0.2, 0, L - 1.8], b: [0.4, 0, 1], cart: false });
      b.lightRow(0, h - 0.002, 1.5, L - 1, 2.8, 0.6, 0.6);
      room = { x0: -w / 2 + 1, x1: w / 2 - 0.6, z0: 1.5, z1: L - 2, h };
      break;
    }

    case 'hoist': {
      const w = 6.5;
      const h = 3.6;
      const L = 8;
      mount = mk(-2.8, h - 0.15, 12, -13);
      b = new Builder(r, mount);
      b.room(-w / 2, w / 2, h, L, { floor: 104, ceil: 72, left: 130, right: 126, end: 118 });
      b.wallZ(L - 0.001, -1.55, 1.55, 0, 2.75, 88, 170);
      b.shaft = { x0: -1.4, x1: 1.4, y0: 0, y1: 2.6, z: L, depth: 3.2 };
      b.wallZ(L - 0.002, -0.45, 0.45, 2.9, 3.25, 40, undefined, true);
      b.text([0, 3.04, L - 0.01], 0.2, labels.sign ?? '1', 228);
      for (let i = 0; i < 10; i++) b.flat(0.002, -1.5 + i * 0.3, -1.35 + i * 0.3, L - 0.9, L - 0.5, i % 2 ? 214 : 48);
      b.wallX(-w / 2 + 0.002, 4, 5.4, 1.2, 2, 208, 90);
      b.lanes.push({ a: [0, 0, L - 0.8], b: [-1.6, 0, 1], cart: false });
      b.lanes.push({ a: [2.4, 0, 1.2], b: [0.3, 0, L - 0.8], cart: true });
      b.lightRow(0, h - 0.002, 1.5, L - 1, 2.7, 0.6, 0.6);
      for (let i = 0; i < 6; i++) b.stands.push([-1.2 + (i % 3) * 0.9, 0, L - 1.8 - Math.floor(i / 3) * 0.9]);
      room = { x0: -2.6, x1: 2.6, z0: 1.5, z1: L - 1.2, h };
      break;
    }

    case 'generator':
    case 'ahu':
    case 'depot': {
      const depot = kind === 'depot';
      const w = depot ? 10 : 13;
      const h = depot ? 6.5 : 7;
      const L = 30 + r() * 8;
      const x0 = -w / 2;
      const x1 = w / 2;
      mount = mk(x0 + 0.5, h - 0.3, 9, -14);
      b = new Builder(r, mount);
      b.room(x0, x1, h, L, { floor: 100, ceil: 62, left: 126, right: 116, end: 108 });
      b.wallZ(L - 0.001, -2.2, 2.2, 0, 3.8, 60, 150);
      b.doors.push({ role: 'primary', style: 'slide', x0: -2.2, x1: 2.2, y0: 0, y1: 3.8, z: L - 0.04, thick: 0.35, l: 150, side: 1 });
      if (kind === 'generator') {
        for (let z = 3; z < L - 6; z += 7.5) {
          b.box(0.4, 4.6, 0, 2.6, z, z + 6, 138, 'back', { line: 90 });
          b.box(1.8, 2.3, 2.6, h, z + 4.6, z + 5.1, 120);
          b.box(0.38, 0.42, 1.2, 1.8, z + 1, z + 1.6, 220);
        }
        b.flat(0.002, -1.1, -1, 0.5, L - 2, 214);
      } else if (kind === 'ahu') {
        for (let z = 3; z < L - 5; z += 6.5) {
          b.box(-5.6, -2.4, 0, 3.2, z, z + 5, 146, 'back', { line: 96 });
          b.box(1.8, 5.6, 0, 3.2, z, z + 5, 140, 'back', { line: 96 });
        }
        b.box(-4.6, -3.2, 3.6, 4.6, -1, L - 2, 132);
        b.box(2.8, 4.2, 3.6, 4.6, -1, L - 2, 132);
      } else {
        for (const x of [0.6, 2.1]) b.decals.push({ p: [[x, 0.003, -1], [x + 0.08, 0.003, -1], [x + 0.08, 0.003, L], [x, 0.003, L]], l: 156 });
        b.box(-4.6, -2.4, 0, 2.1, 9, 13.5, 132, 'back', { line: 80 });
        b.box(2.8, 4.8, 0, 3.6, 4, 18, 98);
        for (let i = 0; i < 4; i++) b.wallX(x1 - 0.003, 20 + i * 2.2, 21.6 + i * 2.2, 0.8, 2.4, 92 + i * 6, 70);
      }
      b.lanes.push({ a: [-1.6, 0, L - 2], b: [-1.4, 0, 1.2], cart: true });
      b.lanes.push({ a: [-2.4, 0, 1.6], b: [-2, 0, L - 3], cart: !depot });
      b.lightRow(-2, h - 0.002, 2, L - 1, 5, 0.9, 0.9);
      b.lightRow(2.6, h - 0.002, 4, L - 1, 5, 0.9, 0.9);
      room = { x0: -3, x1: 0, z0: 2, z1: L - 3, h };
      break;
    }

    case 'assembly':
    case 'shelter':
    default: {
      const shelter = kind === 'shelter';
      const w = shelter ? 11 : 16;
      const h = shelter ? 3.2 : 3.4;
      const L = shelter ? 18 : 22;
      const x0 = -w / 2;
      const x1 = w / 2;
      mount = mk(x0 + 0.6, h - 0.15, 22, -17);
      b = new Builder(r, mount);
      b.room(x0, x1, h, L, { floor: 120, ceil: 92, left: 160, right: 150, end: 134 });
      b.joints(x0, x1, 0.6, L, 1.2, 106);
      if (shelter) {
        for (let z = 2.5; z < L - 2; z += 2.4) {
          b.box(x0 + 0.1, x0 + 1, 0, 1.8, z, z + 2, 112, 'back', { line: 70 });
          b.box(x1 - 1, x1 - 0.1, 0, 1.8, z, z + 2, 112, 'back', { line: 70 });
        }
        for (let z = 5; z < L - 4; z += 4) {
          b.box(-1.6, 1.6, 0, 0.74, z, z + 0.8, 168);
          for (const x of [-1.2, -0.4, 0.4, 1.2]) b.seats.push([x, 0, z - 0.4], [x, 0, z + 1.2]);
        }
        b.wallZ(L - 0.002, -0.6, 0.6, 0, 2.1, 80, 150);
        b.lanes.push({ a: [0, 0, L - 0.8], b: [2.2, 0, 1.5], cart: false });
        b.lanes.push({ a: [-2.4, 0, 1.6], b: [-2.2, 0, L - 2], cart: false });
        for (let i = 0; i < 24; i++) b.stands.push([-2.5 + (i % 6) * 1, 0, 3 + Math.floor(i / 6) * 1.1]);
        b.lightRow(-2.5, h - 0.002, 2, L - 1, 2.8, 1.2, 0.3);
        b.lightRow(2.5, h - 0.002, 2, L - 1, 2.8, 1.2, 0.3);
      } else {
        for (let z = 4; z < L - 5; z += 3.2) {
          for (const x of [-5, -1.2, 2.6]) {
            b.box(x, x + 2.4, 0, 0.76, z, z + 0.9, 176, 'back', { top: 196 });
            b.box(x, x + 2.4, 0, 0.45, z - 0.55, z - 0.25, 94);
            b.box(x, x + 2.4, 0, 0.45, z + 1.15, z + 1.45, 94);
            for (let k = 0; k < 3; k++) b.seats.push([x + 0.4 + k * 0.8, 0, z - 0.4], [x + 0.4 + k * 0.8, 0, z + 1.3]);
          }
        }
        b.box(-4, 4, 0, 1.05, L - 2.2, L - 1.4, 150, 'back', { top: 200 });
        b.wallZ(L - 0.002, -3, 3, 1.7, 2.6, 214, 100);
        b.wallX(x0 + 0.002, 8, 10, 1, 2.1, 70, 160);
        for (let z = 6; z < L - 2; z += 7) b.box(-0.2, 0.2, 0, h, z, z + 0.4, 158);
        b.lanes.push({ a: [x0 + 1.2, 0, 9], b: [3.8, 0, L - 3], cart: false });
        b.lanes.push({ a: [-3, 0, L - 3], b: [x0 + 1.2, 0, 9.4], cart: false });
        b.lanes.push({ a: [1.6, 0, 2], b: [1.2, 0, L - 3], cart: false });
        for (let i = 0; i < 40; i++) b.stands.push([-6 + (i % 10) * 1.3, 0, 2.6 + Math.floor(i / 10) * 0.9]);
        b.lightRow(-4.5, h - 0.002, 2, L - 1, 3, 1.2, 0.3);
        b.lightRow(0, h - 0.002, 3, L - 1, 3, 1.2, 0.3);
        b.lightRow(4.5, h - 0.002, 2, L - 1, 3, 1.2, 0.3);
      }
      room = { x0: x0 + 1, x1: x1 - 1, z0: 2, z1: L - 2.5, h };
      break;
    }
  }

  return {
    id: spec.id,
    kind,
    seed,
    outdoor,
    mount,
    shell: b.shell,
    decals: b.decals,
    back: sorted(b.back, mount),
    front: sorted(b.front, mount),
    lights: b.lights,
    texts: b.texts,
    lanes: b.lanes,
    seats: b.seats,
    stands: b.stands,
    doors: b.doors,
    track: b.track,
    shaft: b.shaft,
    room,
    exposure,
  };
}
