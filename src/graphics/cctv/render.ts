/**
 * Draws one encoded video frame for a camera scene into a 2D context: the picture as a
 * monochrome camera sees it (luminance only), the recorder's mild block compression, and the
 * on-screen display the recorder burns in (camera title, date and time, record and alarm tags).
 *
 * No noise, no flicker, no scan lines: a DVR picture of a lit room is steady. The renderer is
 * pure apart from the canvas it is handed; the same inputs give the same picture.
 */
import { NEAR, projectPoint, projectPoly, toCamera, type CamPose, type V3 } from './project';
import { pick, type Passer } from './people';
import type { DoorSlot, Poly, Scene } from './scene';

export type LightMode = 'normal' | 'night' | 'standby' | 'off';

export interface FrameView {
  /** Pan and tilt offsets from the mounting axis, degrees; zoom multiplier (1 = widest). */
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface TrainView {
  /** Metres the near end of the consist is short of the stop mark (0 = standing at the platform). */
  d: number;
  /** Head and marker lamps lit (moving or about to). */
  lamps: boolean;
  /** Saloon lighting on. */
  lit: boolean;
}

export interface FrameInput {
  view: FrameView;
  lights: LightMode;
  /** Outdoor scenes: 0 = night, 1 = full day. */
  daylight: number;
  /** Leaf open fraction per door slot (1 = open); null leaves the slot at its default (closed). */
  doors: { primary: number | null; secondary: number | null };
  train: TrainView | null;
  /** Hoist landings: cage at this landing, and the landing gate's open fraction. */
  cage: { present: boolean; gateOpen: number } | null;
  passers: Passer[];
  /** Persons seated (dining rooms, shelter halls). */
  seated: number;
  /** Persons standing at the scene's standing spots (muster, waiting for a cage). */
  standing: number;
}

export interface Osd {
  title: string;
  /** "05-19-2008 17:14:07" */
  stamp: string;
  /** Right-hand tags: "REC", "ALM 3", "PB x4". */
  tags: string[];
}

export interface Quality {
  blockPx: number;
  blockMix: number;
  levels: number;
}

const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Grey from a luminance value (the picture's only colour). */
export function grey(l: number, a = 1): string {
  const v = Math.round(clamp(l, 0, 255));
  return a >= 1 ? `rgb(${v},${v},${v})` : `rgba(${v},${v},${v},${a})`;
}

const LIGHT_FACTOR: Record<LightMode, number> = { normal: 1, night: 0.78, standby: 0.42, off: 0.12 };

function lightOn(tier: 0 | 1 | 2, mode: LightMode): boolean {
  if (mode === 'off') return false;
  if (mode === 'standby') return tier === 0;
  if (mode === 'night') return tier <= 1;
  return true;
}

/** The pose a camera has at the given view. */
export function poseFor(scene: Scene, view: FrameView): CamPose {
  const m = scene.mount;
  return { x: m.x, y: m.y, z: m.z, yaw: m.yaw + view.yaw * DEG, pitch: m.pitch + view.pitch * DEG, f: m.f * view.zoom };
}

interface Ctx {
  c: CanvasRenderingContext2D;
  pose: CamPose;
  w: number;
  h: number;
  /** Overall brightness: lights and exposure. */
  k: number;
  outdoor: boolean;
}

function shade(x: Ctx, l: number, depth: number, emissive?: boolean): number {
  if (emissive) return l;
  const fall = x.outdoor ? 0.75 + 0.25 * Math.exp(-depth / 60) : 0.46 + 0.54 * Math.exp(-depth / 24);
  return l * fall * x.k;
}

function fillPoly(x: Ctx, poly: Poly, lOverride?: number): void {
  const pr = projectPoly(poly.p, x.pose, x.w, x.h);
  if (!pr) return;
  const { c } = x;
  c.beginPath();
  pr.pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.closePath();
  c.fillStyle = grey(shade(x, lOverride ?? poly.l, pr.depth, poly.emissive));
  c.fill();
  if (poly.line !== undefined) {
    c.strokeStyle = grey(shade(x, poly.line, pr.depth));
    c.lineWidth = Math.max(0.6, x.w / 500);
    c.stroke();
  }
}

function quad(a: V3, b: V3, cc: V3, d: V3, l: number, line?: number, emissive?: boolean): Poly {
  return { p: [a, b, cc, d], l, line, emissive };
}

/* -------------------------------------------------------------- doors */

function drawDoor(x: Ctx, s: DoorSlot, open: number): void {
  const o = clamp(open, 0, 1);
  if (s.style === 'slide') {
    const width = s.x1 - s.x0;
    const shift = o * width * s.side;
    const lx0 = clamp(s.x0 + shift, s.x0, s.x1);
    const lx1 = clamp(s.x1 + shift, s.x0, s.x1);
    if (lx1 - lx0 < 0.01) return;
    const zf = s.z - s.thick;
    fillPoly(x, quad([lx0, s.y0, zf], [lx1, s.y0, zf], [lx1, s.y1, zf], [lx0, s.y1, zf], s.l, s.l * 0.55));
    // the leading edge, seen obliquely, and two horizontal stiffeners
    const edgeX = s.side > 0 ? lx0 : lx1;
    if (s.thick > 0.1) fillPoly(x, quad([edgeX, s.y0, zf], [edgeX, s.y0, s.z], [edgeX, s.y1, s.z], [edgeX, s.y1, zf], s.l * 0.7));
    for (const fy of [0.33, 0.66]) {
      const y = s.y0 + (s.y1 - s.y0) * fy;
      fillPoly(x, quad([lx0, y, zf - 0.005], [lx1, y, zf - 0.005], [lx1, y + 0.08, zf - 0.005], [lx0, y + 0.08, zf - 0.005], s.l * 0.78));
    }
    return;
  }
  // swinging leaves and vault doors turn about a vertical hinge at one jamb, toward the camera
  const hingeX = s.side > 0 ? s.x1 : s.x0;
  const th = o * 100 * DEG;
  const turn = (px: number, py: number): V3 => {
    const dx = px - hingeX;
    return [hingeX + dx * Math.cos(th), py, s.z - Math.abs(dx) * Math.sin(th)];
  };
  if (s.style === 'swing') {
    if (o > 0.02) fillPoly(x, quad([s.x0, s.y0, s.z + 0.01], [s.x1, s.y0, s.z + 0.01], [s.x1, s.y1, s.z + 0.01], [s.x0, s.y1, s.z + 0.01], 20));
    fillPoly(x, quad(turn(s.x0, s.y0), turn(s.x1, s.y0), turn(s.x1, s.y1), turn(s.x0, s.y1), s.l, s.l * 0.5));
    const cx = (s.x0 + s.x1) / 2;
    const win: V3[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      win.push(turn(cx + Math.cos(a) * 0.16, 1.55 + Math.sin(a) * 0.16));
    }
    fillPoly(x, { p: win.map((p) => [p[0], p[1], p[2] - 0.004] as V3), l: 46 });
    return;
  }
  // vault: a round leaf with a locking wheel
  const cx = (s.x0 + s.x1) / 2;
  const cy = (s.y0 + s.y1) / 2;
  const R = (s.x1 - s.x0) / 2;
  const ring = (r: number, dz: number, useTurn: boolean): V3[] => {
    const out: V3[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const p: V3 = useTurn ? turn(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : [cx + Math.cos(a) * r, cy + Math.sin(a) * r, s.z];
      out.push([p[0], p[1], p[2] - dz]);
    }
    return out;
  };
  fillPoly(x, { p: ring(R + 0.18, 0, false), l: 92 });
  if (o > 0.02) fillPoly(x, { p: ring(R, 0.002, false), l: 16 });
  fillPoly(x, { p: ring(R, 0.004, true), l: s.l, line: 110 });
  fillPoly(x, { p: ring(R * 0.78, 0.008, true), l: s.l * 0.86, line: 120 });
  fillPoly(x, { p: ring(R * 0.16, 0.012, true), l: 70 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p0 = turn(cx + Math.cos(a) * R * 0.16, cy + Math.sin(a) * R * 0.16);
    const p1 = turn(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55);
    const a0 = projectPoint([p0[0], p0[1], p0[2] - 0.014], x.pose, x.w, x.h);
    const a1 = projectPoint([p1[0], p1[1], p1[2] - 0.014], x.pose, x.w, x.h);
    if (!a0 || !a1) continue;
    x.c.strokeStyle = grey(shade(x, 60, a0.z));
    x.c.lineWidth = Math.max(1, (0.05 * x.pose.f * x.w) / a0.z);
    x.c.beginPath();
    x.c.moveTo(a0.x, a0.y);
    x.c.lineTo(a1.x, a1.y);
    x.c.stroke();
  }
}

/* ---------------------------------------------------- shaft and cage */

function drawShaft(x: Ctx, sc: Scene, cage: FrameInput['cage']): void {
  const s = sc.shaft;
  if (!s) return;
  const z = s.z - 0.002;
  fillPoly(x, quad([s.x0, s.y0, z], [s.x1, s.y0, z], [s.x1, s.y1, z], [s.x0, s.y1, z], 10, undefined, true));
  const zb = s.z + s.depth;
  if (cage?.present) {
    const L = 150;
    fillPoly(x, quad([s.x0, 0, zb], [s.x1, 0, zb], [s.x1, s.y1, zb], [s.x0, s.y1, zb], L * 0.9, undefined, true));
    fillPoly(x, quad([s.x0, 0, s.z], [s.x1, 0, s.z], [s.x1, 0, zb], [s.x0, 0, zb], L * 0.8, undefined, true));
    fillPoly(x, quad([s.x0, 0, s.z], [s.x0, 0, zb], [s.x0, s.y1, zb], [s.x0, s.y1, s.z], L * 0.7, undefined, true));
    fillPoly(x, quad([s.x1, 0, s.z], [s.x1, s.y1, s.z], [s.x1, s.y1, zb], [s.x1, 0, zb], L * 0.65, undefined, true));
    // the cage's own sliding gate, folded to one side
    fillPoly(x, quad([s.x1 - 0.3, 0, s.z + 0.05], [s.x1, 0, s.z + 0.05], [s.x1, s.y1, s.z + 0.05], [s.x1 - 0.3, s.y1, s.z + 0.05], 96, 60, true));
  } else {
    for (const rx of [-0.35, 0.35]) {
      fillPoly(x, quad([rx - 0.02, s.y0, zb], [rx + 0.02, s.y0, zb], [rx + 0.02, s.y1, zb], [rx - 0.02, s.y1, zb], 74, undefined, true));
    }
  }
  // the landing gate: collapsible bars that fold toward the right-hand jamb
  const g = clamp(cage?.gateOpen ?? 0, 0, 1);
  const n = 22;
  const span = s.x1 - s.x0;
  const zg = s.z - 0.04;
  for (let i = 0; i <= n; i++) {
    const bx = s.x0 + (i / n) * span * (1 - g * 0.9) + g * span * 0.9;
    fillPoly(x, quad([bx - 0.015, s.y0, zg], [bx + 0.015, s.y0, zg], [bx + 0.015, s.y1, zg], [bx - 0.015, s.y1, zg], 150));
  }
  const left = s.x0 + g * span * 0.9;
  for (const y of [s.y0 + 0.05, s.y1 - 0.1]) fillPoly(x, quad([left, y, zg - 0.002], [s.x1, y, zg - 0.002], [s.x1, y + 0.05, zg - 0.002], [left, y + 0.05, zg - 0.002], 130));
}

/* -------------------------------------------------------------- train */

function drawTrain(x: Ctx, sc: Scene, tv: TrainView): void {
  const tr = sc.track;
  if (!tr) return;
  const zn = tr.zStop + tv.d;
  const zf = Math.min(zn + tr.len, tr.zMouth);
  if (zn >= tr.zMouth - 0.05 || zf <= zn) return;
  const x0 = tr.x0 + 0.1;
  const x1 = tr.x1 - 0.1;
  const y0 = -0.5;
  const y1 = 3.5;
  fillPoly(x, quad([x0, y1, zn], [x1, y1, zn], [x1, y1, zf], [x0, y1, zf], 118));
  fillPoly(x, quad([x0, y0, zn], [x0, y0, zf], [x0, y1, zf], [x0, y1, zn], 158, 120));
  for (let z = zn + 1.6; z < zf - 1.2; z += 2.6) {
    const w0 = z;
    const w1 = Math.min(z + 1.6, zf - 0.4);
    if (Math.floor((z - zn) / 2.6) % 4 === 3) {
      fillPoly(x, quad([x0 - 0.01, 0, w0], [x0 - 0.01, 0, w0 + 1.3], [x0 - 0.01, 2.6, w0 + 1.3], [x0 - 0.01, 2.6, w0], 134, 80));
      continue;
    }
    fillPoly(x, quad([x0 - 0.01, 1.4, w0], [x0 - 0.01, 1.4, w1], [x0 - 0.01, 2.35, w1], [x0 - 0.01, 2.35, w0], tv.lit ? 196 : 44, undefined, tv.lit));
  }
  fillPoly(x, quad([x0, y0, zn], [x1, y0, zn], [x1, y1, zn], [x0, y1, zn], 182, 110));
  fillPoly(x, quad([x0 + 0.5, 1.9, zn - 0.01], [x1 - 0.5, 1.9, zn - 0.01], [x1 - 0.5, 2.9, zn - 0.01], [x0 + 0.5, 2.9, zn - 0.01], 58));
  if (tv.lamps) {
    for (const lx of [x0 + 0.45, x1 - 0.75]) fillPoly(x, quad([lx, 0.5, zn - 0.02], [lx + 0.3, 0.5, zn - 0.02], [lx + 0.3, 0.8, zn - 0.02], [lx, 0.8, zn - 0.02], 252, undefined, true));
  }
}

/* -------------------------------------------------------------- people */

function drawPerson(x: Ctx, at: V3, shadeL: number, phase: number, seated: boolean, facing = 0): void {
  const feet = projectPoint(at, x.pose, x.w, x.h);
  const head = projectPoint([at[0], seated ? 1.32 : 1.74, at[2]], x.pose, x.w, x.h);
  if (!feet || !head) return;
  const hpx = feet.y - head.y;
  if (hpx < 2) return;
  const c = x.c;
  const cx = (feet.x + head.x) / 2;
  const wpx = hpx * (seated ? 0.3 : 0.24);
  const body = grey(shade(x, shadeL, feet.z));
  const skin = grey(shade(x, 150, feet.z));
  const legs = grey(shade(x, Math.max(24, shadeL * 0.6), feet.z));
  const headR = hpx * (seated ? 0.085 : 0.068);
  const top = head.y;
  c.fillStyle = skin;
  c.beginPath();
  c.ellipse(head.x, top + headR, headR * 0.9, headR, 0, 0, Math.PI * 2);
  c.fill();
  const shoulders = top + headR * 2.1;
  const seatTop = seated ? projectPoint([at[0], 0.74, at[2]], x.pose, x.w, x.h) : null;
  const hips = seatTop ? Math.max(seatTop.y, top + hpx * 0.3) : top + hpx * 0.52;
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(cx - wpx / 2, shoulders);
  c.lineTo(cx + wpx / 2, shoulders);
  c.lineTo(cx + wpx * 0.38, hips);
  c.lineTo(cx - wpx * 0.38, hips);
  c.closePath();
  c.fill();
  if (seated) return;
  const stride = Math.sin(phase * Math.PI * 2) * wpx * 0.35 * (1 - Math.abs(facing) * 0.4);
  c.fillStyle = legs;
  c.fillRect(cx - wpx * 0.32 + stride, hips, wpx * 0.26, feet.y - hips);
  c.fillRect(cx + wpx * 0.06 - stride, hips, wpx * 0.26, feet.y - hips);
}

function drawCart(x: Ctx, p: Passer): void {
  const along = Math.abs(p.dz) > Math.abs(p.dx);
  const hw = along ? 0.55 : 1;
  const hl = along ? 1 : 0.55;
  const [ax, , az] = p.at;
  const polys: Poly[] = [];
  const c = x.pose;
  const x0 = ax - hw;
  const x1 = ax + hw;
  const z0 = az - hl;
  const z1 = az + hl;
  const y1 = 0.8;
  if (c.z < z0) polys.push(quad([x0, 0.25, z0], [x1, 0.25, z0], [x1, y1, z0], [x0, y1, z0], 112, 60));
  if (c.x < x0) polys.push(quad([x0, 0.25, z0], [x0, 0.25, z1], [x0, y1, z1], [x0, y1, z0], 96, 60));
  if (c.x > x1) polys.push(quad([x1, 0.25, z0], [x1, y1, z0], [x1, y1, z1], [x1, 0.25, z1], 96, 60));
  polys.push(quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], 132));
  polys.push(quad([x0 + 0.1, 1.9, z0 + 0.2], [x1 - 0.1, 1.9, z0 + 0.2], [x1 - 0.1, 1.98, z1 - 0.3], [x0 + 0.1, 1.98, z1 - 0.3], 80));
  for (const poly of polys) fillPoly(x, poly);
  drawPerson(x, [ax, 0.1, az + (along ? 0.25 : 0)], p.shade, 0, true);
}

/* -------------------------------------------------------------- frame */

/** Draw the scene's picture (no compression, no OSD) at `w` x `h`. */
export function drawPicture(c: CanvasRenderingContext2D, w: number, h: number, sc: Scene, f: FrameInput): void {
  const pose = poseFor(sc, f.view);
  const k = sc.outdoor ? 0.42 + 0.58 * clamp(f.daylight, 0, 1) : LIGHT_FACTOR[f.lights] * sc.exposure;
  const x: Ctx = { c, pose, w, h, k, outdoor: sc.outdoor };
  c.save();
  c.globalCompositeOperation = 'source-over';
  if (sc.outdoor) {
    const day = clamp(f.daylight, 0, 1);
    const sky = c.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, grey(28 + 170 * day));
    sky.addColorStop(1, grey(40 + 200 * day));
    c.fillStyle = sky;
  } else c.fillStyle = grey(8);
  c.fillRect(0, 0, w, h);

  for (const p of sc.shell) fillPoly(x, p);

  // light pools on the floor
  c.globalCompositeOperation = 'lighter';
  for (const L of sc.lights) {
    if (L.dead || !lightOn(L.tier, sc.outdoor ? (f.daylight > 0.5 ? 'off' : 'normal') : f.lights)) continue;
    const pt = projectPoint([L.x, 0, L.z], pose, w, h);
    if (!pt) continue;
    const rad = (2.4 * pose.f * w) / pt.z;
    const flatten = clamp(L.y / Math.hypot(L.z - pose.z, L.y), 0.15, 1);
    const g = c.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rad);
    g.addColorStop(0, grey(255, sc.outdoor ? 0.22 : 0.12));
    g.addColorStop(1, grey(255, 0));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(pt.x, pt.y, rad, rad * flatten, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';

  for (const p of sc.decals) fillPoly(x, p);

  // the fittings themselves
  for (const L of sc.lights) {
    const on = !L.dead && lightOn(L.tier, sc.outdoor ? (f.daylight > 0.5 ? 'off' : 'normal') : f.lights);
    const y = L.y;
    fillPoly(x, quad([L.x - L.w / 2, y, L.z - L.d / 2], [L.x + L.w / 2, y, L.z - L.d / 2], [L.x + L.w / 2, y, L.z + L.d / 2], [L.x - L.w / 2, y, L.z + L.d / 2], on ? 246 : 96, undefined, on));
  }

  for (const t of sc.texts) {
    const pt = projectPoint(t.at, pose, w, h);
    if (!pt) continue;
    const px = (t.size * pose.f * w) / pt.z;
    if (px < 3) continue;
    c.fillStyle = grey(shade(x, t.l, pt.z));
    c.font = `600 ${px.toFixed(1)}px "IBM Plex Sans", Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(t.text, pt.x, pt.y);
  }

  for (const g of sc.back) for (const p of g.polys) fillPoly(x, p);

  // seated persons sit at tables (behind the near table edge is acceptable at this resolution)
  for (const s of pick(sc, sc.seats, f.seated, ':seat')) drawPerson(x, s, 70 + Math.abs((s[0] * 37 + s[2] * 11) % 140), 0, true);

  drawShaft(x, sc, f.cage);
  const sec = sc.doors.find((d) => d.role === 'secondary');
  const pri = sc.doors.find((d) => d.role === 'primary');
  if (sec) drawDoor(x, sec, f.doors.secondary ?? 0);
  if (f.train) drawTrain(x, sc, f.train);
  if (pri) drawDoor(x, pri, f.doors.primary ?? 0);

  // front props and people, far to near
  type Item = { d: number; draw: () => void };
  const items: Item[] = [];
  const dist = (p: V3) => {
    const q = toCamera(p, pose);
    return q[2] < NEAR ? -1 : q[2];
  };
  for (const g of sc.front) items.push({ d: dist(g.at), draw: () => g.polys.forEach((p) => fillPoly(x, p)) });
  for (const p of f.passers) items.push({ d: dist(p.at), draw: () => (p.cart ? drawCart(x, p) : drawPerson(x, p.at, p.shade, p.phase, false, p.dx)) });
  for (const s of pick(sc, sc.stands, f.standing, ':stand')) items.push({ d: dist(s), draw: () => drawPerson(x, s, 60 + Math.abs((s[0] * 53 + s[2] * 7) % 130), 0.25, false) });
  items.sort((a, b) => b.d - a.d);
  for (const it of items) if (it.d > 0) it.draw();

  // lens fall-off at the corners (the optics, not an effect)
  const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  v.addColorStop(0, grey(0, 0));
  v.addColorStop(1, grey(0, 0.28));
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  c.restore();
}

/** The recorder's compression: pull each block toward its mean and keep `levels` greys. */
export function compress(c: CanvasRenderingContext2D, w: number, h: number, q: Quality): void {
  if (q.blockMix <= 0 && q.levels >= 256) return;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const B = Math.max(2, Math.round(q.blockPx));
  const step = 255 / Math.max(1, q.levels - 1);
  for (let by = 0; by < h; by += B) {
    for (let bx = 0; bx < w; bx += B) {
      const ex = Math.min(w, bx + B);
      const ey = Math.min(h, by + B);
      let sum = 0;
      let n = 0;
      for (let y = by; y < ey; y++) for (let xx = bx; xx < ex; xx++) {
        sum += d[(y * w + xx) * 4]!;
        n++;
      }
      const mean = sum / n;
      for (let y = by; y < ey; y++) for (let xx = bx; xx < ex; xx++) {
        const i = (y * w + xx) * 4;
        const v0 = d[i]!;
        const v = Math.round((v0 + (mean - v0) * q.blockMix) / step) * step;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
  }
  c.putImageData(img, 0, 0);
}

/** The recorder's on-screen display, burned into the frame. */
export function drawOsd(c: CanvasRenderingContext2D, w: number, h: number, osd: Osd): void {
  const px = Math.max(8, Math.round(h / 22));
  c.save();
  c.font = `500 ${px}px "IBM Plex Mono", "Courier New", monospace`;
  c.textBaseline = 'top';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(1.5, px / 6);
  const text = (s: string, tx: number, ty: number, align: CanvasTextAlign) => {
    c.textAlign = align;
    // Backing box, as a DVR character generator draws it, so the caption reads on a bright sky.
    const tw = c.measureText(s).width;
    const pad = Math.max(2, Math.round(px * 0.2));
    const x0 = align === 'right' ? tx - tw : align === 'center' ? tx - tw / 2 : tx;
    c.fillStyle = grey(0, 0.55);
    c.fillRect(Math.round(x0 - pad), Math.round(ty - pad / 2), Math.round(tw + pad * 2), Math.round(px + pad));
    c.strokeStyle = grey(14);
    c.strokeText(s, tx, ty);
    c.fillStyle = grey(238);
    c.fillText(s, tx, ty);
  };
  const m = Math.round(px * 0.6);
  // The character generator has a fixed line: a long camera title is cut to the space left of the tags.
  const tagW = osd.tags.reduce((mx, t) => Math.max(mx, c.measureText(t).width), 0);
  const room = w - m * 2 - (osd.tags.length ? tagW + px : 0);
  const full = c.measureText(osd.title).width;
  const font = c.font;
  if (full > room) c.font = `500 ${Math.max(7, Math.floor((px * Math.max(0.7, room / full))))}px "IBM Plex Mono", "Courier New", monospace`;
  let title = osd.title;
  while (title.length > 1 && c.measureText(title).width > room) title = title.slice(0, -1);
  text(title.trimEnd(), m, m, 'left');
  c.font = font;
  text(osd.stamp, m, h - m - px, 'left');
  osd.tags.forEach((t, i) => text(t, w - m, m + i * (px + 2), 'right'));
  c.restore();
}

/** One complete encoded frame: picture, compression, OSD. */
export function renderFrame(c: CanvasRenderingContext2D, w: number, h: number, sc: Scene, f: FrameInput, osd: Osd, q: Quality): void {
  drawPicture(c, w, h, sc, f);
  compress(c, w, h, q);
  drawOsd(c, w, h, osd);
}

/**
 * A channel with no picture, as the client draws it: a flat field and a short message
 * (NO LINK, VIDEO LOSS, NO RECORDED VIDEO), with the channel's OSD title.
 */
export function renderBlank(c: CanvasRenderingContext2D, w: number, h: number, lines: string[], osd: Osd | null, level = 20): void {
  c.save();
  c.fillStyle = grey(level);
  c.fillRect(0, 0, w, h);
  const px = Math.max(10, Math.round(h / 14));
  c.font = `600 ${px}px "IBM Plex Mono", "Courier New", monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = grey(214);
  lines.forEach((s, i) => c.fillText(s, w / 2, h / 2 + (i - (lines.length - 1) / 2) * px * 1.4));
  c.restore();
  if (osd) drawOsd(c, w, h, osd);
}
