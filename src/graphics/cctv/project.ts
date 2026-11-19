/**
 * Pinhole camera for the facility video scenes: world metres (x right, y up, z away from the
 * mounting wall), a camera at a mounting point with pan (yaw) and tilt (pitch), and a focal
 * length in picture widths. Pure; no DOM.
 */

export type V3 = readonly [number, number, number];

export interface CamPose {
  x: number;
  y: number;
  z: number;
  /** Pan, radians (positive = right). */
  yaw: number;
  /** Tilt, radians (negative = down). */
  pitch: number;
  /** Focal length in picture widths (0.8 is a 3.6 mm lens on a 1/3 in. sensor, near enough). */
  f: number;
}

export const NEAR = 0.12;

/** World point to camera space (x right, y up, z forward). */
export function toCamera(p: V3, c: CamPose): [number, number, number] {
  const dx = p[0] - c.x;
  const dy = p[1] - c.y;
  const dz = p[2] - c.z;
  const cy = Math.cos(c.yaw);
  const sy = Math.sin(c.yaw);
  const x1 = dx * cy - dz * sy;
  const z1 = dx * sy + dz * cy;
  const cp = Math.cos(c.pitch);
  const sp = Math.sin(c.pitch);
  const y2 = dy * cp - z1 * sp;
  const z2 = dy * sp + z1 * cp;
  return [x1, y2, z2];
}

/** Camera-space point to picture pixels. */
export function toScreen(q: readonly [number, number, number], c: CamPose, w: number, h: number): [number, number] {
  const k = (c.f * w) / q[2];
  return [w / 2 + q[0] * k, h / 2 - q[1] * k];
}

/** Clip a camera-space polygon to z >= NEAR (Sutherland-Hodgman, one plane). */
export function clipNear(pts: [number, number, number][]): [number, number, number][] {
  const out: [number, number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const ain = a[2] >= NEAR;
    const bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}

/** Project a world polygon; null when it lies wholly behind the camera. */
export function projectPoly(poly: readonly V3[], c: CamPose, w: number, h: number): { pts: [number, number][]; depth: number } | null {
  const cam = clipNear(poly.map((p) => toCamera(p, c)));
  if (cam.length < 3) return null;
  let depth = 0;
  for (const q of cam) depth += q[2];
  return { pts: cam.map((q) => toScreen(q, c, w, h)), depth: depth / cam.length };
}

/** Project one world point; null when behind the camera. */
export function projectPoint(p: V3, c: CamPose, w: number, h: number): { x: number; y: number; z: number } | null {
  const q = toCamera(p, c);
  if (q[2] < NEAR) return null;
  const [x, y] = toScreen(q, c, w, h);
  return { x, y, z: q[2] };
}

/** Distance from the camera to a world point (for painter's ordering). */
export function distance(p: V3, c: CamPose): number {
  return Math.hypot(p[0] - c.x, p[1] - c.y, p[2] - c.z);
}
