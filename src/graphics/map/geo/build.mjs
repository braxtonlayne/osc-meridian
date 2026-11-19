// Geometry build for @graphics/map. Dev-only: not imported by the application.
// Usage (from the repository root):  node src/graphics/map/geo/build.mjs
//
// Reads node_modules/us-atlas/states-10m.json (US Census cartographic boundaries,
// unprojected lon/lat), keeps the 48 contiguous states and the District of
// Columbia, simplifies the shared arcs (Douglas-Peucker, so borders stay shared
// and gap-free), drops islets too small to draw, re-quantizes, and writes
// conus.topo.json next to this file. The map module imports that file, so the
// geometry ships inside the JS bundle and nothing is fetched at runtime.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const src = JSON.parse(readFileSync(join(root, 'node_modules/us-atlas/states-10m.json'), 'utf8'));

/** Simplification tolerance in degrees (about 1.7 statute miles of latitude). */
const TOLERANCE = 0.025;
/** Rings whose bounding box is smaller than this on both axes (degrees) are dropped. */
const MIN_RING = 0.09;
/** Output quantization grid. */
const Q = 1e4;

const POSTAL = {
  '01': 'AL', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
  '12': 'FL', '13': 'GA', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO',
  '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC',
  '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
};

// ---- decode arcs to absolute lon/lat ---------------------------------------
const { scale, translate } = src.transform;
const arcs = src.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});

// ---- Douglas-Peucker --------------------------------------------------------
function simplify(points, tol) {
  const n = points.length;
  if (n <= 2) return points;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstD = tol * tol;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d;
      if (len2 === 0) d = (px - ax) ** 2 + (py - ay) ** 2;
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
      }
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst > 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  const out = points.filter((_, i) => keep[i]);
  // A closed arc (an island ring) must stay a ring: keep at least 4 positions.
  const closed = points[0][0] === points[n - 1][0] && points[0][1] === points[n - 1][1];
  if (closed && out.length < 4) {
    const third = Math.floor(n / 3);
    return [points[0], points[third], points[2 * third], points[n - 1]];
  }
  return out;
}

const arcIndex = (i) => (i < 0 ? ~i : i);
function ringBox(ring) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const i of ring) {
    for (const [x, y] of arcs[arcIndex(i)]) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return [x1 - x0, y1 - y0];
}

// ---- filter geometries, drop islets ----------------------------------------
let droppedRings = 0;
const geometries = [];
for (const g of src.objects.states.geometries) {
  const postal = POSTAL[g.id];
  if (!postal) continue; // Alaska, Hawaii, territories
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  const boxes = polys.map((p) => ringBox(p[0]));
  const largest = Math.max(...boxes.map(([w, h]) => w * h));
  const kept = polys.filter((_, i) => {
    const [w, h] = boxes[i];
    const keep = w * h === largest || w >= MIN_RING || h >= MIN_RING;
    if (!keep) droppedRings++;
    return keep;
  });
  geometries.push({
    type: 'MultiPolygon',
    id: g.id,
    properties: { name: g.properties.name, postal },
    arcs: kept,
  });
}

// ---- prune and renumber arcs, simplify, quantize ----------------------------
const remap = new Map();
const outArcs = [];
const use = (i) => {
  const k = arcIndex(i);
  if (!remap.has(k)) {
    remap.set(k, outArcs.length);
    outArcs.push(simplify(arcs[k], TOLERANCE));
  }
  const n = remap.get(k);
  return i < 0 ? ~n : n;
};
for (const g of geometries) g.arcs = g.arcs.map((poly) => poly.map((ring) => ring.map(use)));

let x0 = Infinity;
let y0 = Infinity;
let x1 = -Infinity;
let y1 = -Infinity;
for (const arc of outArcs) {
  for (const [x, y] of arc) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}
const kx = (x1 - x0) / (Q - 1);
const ky = (y1 - y0) / (Q - 1);
let pointsIn = 0;
let pointsOut = 0;
for (const k of remap.keys()) pointsIn += arcs[k].length;
const qArcs = outArcs.map((arc) => {
  let px = 0;
  let py = 0;
  const out = [];
  arc.forEach(([x, y], i) => {
    const qx = Math.round((x - x0) / kx);
    const qy = Math.round((y - y0) / ky);
    // Drop interior positions that quantize onto the previous one.
    if (i > 0 && i < arc.length - 1 && qx === px && qy === py) return;
    out.push([qx - px, qy - py]);
    px = qx;
    py = qy;
  });
  pointsOut += out.length;
  return out;
});

const round = (v) => Number(v.toPrecision(12));
const topo = {
  type: 'Topology',
  bbox: [round(x0), round(y0), round(x1), round(y1)],
  transform: { scale: [round(kx), round(ky)], translate: [round(x0), round(y0)] },
  objects: { states: { type: 'GeometryCollection', geometries } },
  arcs: qArcs,
};

const text = JSON.stringify(topo);
writeFileSync(join(here, 'conus.topo.json'), text + '\n');
console.log(
  `states ${geometries.length}, arcs ${qArcs.length}, positions ${pointsIn} -> ${pointsOut}, islets dropped ${droppedRings}`,
);
console.log(`conus.topo.json ${text.length} bytes raw, ${gzipSync(text, { level: 9 }).length} bytes gzip`);
