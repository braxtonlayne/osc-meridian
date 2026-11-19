/**
 * The three.js scene for @graphics/tunnel3d. Loaded on demand by mount.ts; nothing else imports it,
 * so three.js stays out of every other chunk.
 *
 * Renders on demand (camera change, selection, train movement): an idle view costs no frames.
 */
import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type Camera,
  type Material,
  type Object3D,
} from 'three';
import type { ClassId } from '@core/canon-types';
import { FEET_PER_UNIT, LINK_SAMPLES, buildTunnelModel, pointOnLink, resolveLink, type LinkPath, type SiteNode } from './model';
import { NATION_RINGS, PLATE_H, PLATE_W, STATE_BORDERS } from './plate-data';
import type { TunnelTrain, TunnelViewHandle, TunnelViewOptions } from './types';

/** Vertical exaggeration: depths are drawn this many times larger than horizontal distances. */
export const VERTICAL_EXAGGERATION = 800;
const UNITS_PER_FT = VERTICAL_EXAGGERATION / FEET_PER_UNIT;

const DEG = Math.PI / 180;
const LIMITS = { azMin: -80 * DEG, azMax: 80 * DEG, elMin: 4 * DEG, elMax: 89.5 * DEG, zoomMin: 0.7, zoomMax: 9 };
const VIEWS = {
  oblique: { az: 14 * DEG, el: 33 * DEG },
  plan: { az: 0, el: LIMITS.elMax },
  section: { az: 0, el: LIMITS.elMin },
} as const;
type ViewName = keyof typeof VIEWS;

const FRAME_PAD = 14;
const RADIAL = 6;
const TUBE_R = { rail: 2.1, tram: 1.25 } as const;
const SHAFT_W: Record<ClassId, number> = { ALPHA: 7.5, BETA: 4.6, GAMMA: 3.2, DELTA: 2.2 };
const TRAIN_BOX = { rail: [5.2, 5.2, 14], tram: [3.8, 3.8, 9.5] } as const;
const PICK_PX = 7;
/** Labels for the shallower classes appear as the view is magnified. */
const LABEL_ZOOM: Record<ClassId, number> = { ALPHA: 0, BETA: 1.5, GAMMA: 2.6, DELTA: 3.4 };

const fmt = (n: number) => n.toLocaleString('en-US');
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Label {
  el: HTMLElement;
  p: Vector3;
  /** Pixel offset and anchor: ax/ay are fractions of the label's own box. */
  dx: number;
  dy: number;
  ax: number;
  ay: number;
  show: () => boolean;
  w: number;
  h: number;
}

interface TrainState {
  group: Group;
  label: Label | null;
  link: LinkPath;
  reversed: boolean;
  cur: number;
  target: number;
  sig: string;
}

interface LinkView {
  link: LinkPath;
  curve: CatmullRomCurve3;
  segs: number;
  mesh: Mesh;
  /** World-space samples (x, y, z) for picking. */
  world: Float32Array;
  tag: Label;
}

interface SiteView {
  site: SiteNode;
  depth: number; // world units, 0 for a surface marker
  label: Label;
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createScene(root: HTMLElement, opts: TunnelViewOptions): TunnelViewHandle {
  const model = buildTunnelModel();
  const reducedMotion = opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- Tokens -> colours (no colour literals in this module) ----
  const css = getComputedStyle(root);
  const tok = (name: string, fallbackGrey: number): Color => {
    const c = new Color().setScalar(fallbackGrey);
    const v = css.getPropertyValue(name).trim();
    if (v) c.setStyle(v);
    return c;
  };
  const C = {
    bg: tok('--paper', 0.9),
    plate: tok('--surface', 1),
    stateLine: tok('--row-rule', 0.6),
    coast: tok('--chrome-shadow', 0.3),
    frame: tok('--text-3', 0.25),
    band: tok('--row-rule', 0.6),
    rail: tok('--title-active-bg', 0.04),
    tram: tok('--title-inactive-bg', 0.22),
    dark: tok('--chrome-shadow', 0.3),
    edge: tok('--text-1', 0.01),
    train: tok('--surface', 1),
    shaft: {
      ALPHA: tok('--chrome-outer', 0.1),
      BETA: tok('--chrome-shadow', 0.3),
      GAMMA: tok('--row-rule', 0.6),
      DELTA: tok('--row-rule', 0.6),
    } as Record<ClassId, Color>,
  };

  // ---- DOM ----
  const canvas = h('canvas', 't3d__canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute(
    'aria-label',
    'Tunnel network, three-dimensional view. Arrow keys rotate. Shift with arrow keys moves the view. Plus and minus change magnification. Page Up and Page Down step through tunnels and sites. Home restores the standard view. Escape clears the selection.',
  );
  const labelLayer = h('div', 't3d__labels');
  labelLayer.setAttribute('aria-hidden', 'true');
  const tools = h('div', 't3d__tools');
  tools.setAttribute('role', 'toolbar');
  tools.setAttribute('aria-label', 'View');
  const legend = h('div', 't3d__legend');
  const status = h('div', 't3d__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.append(canvas, labelLayer, tools, legend, status);

  // ---- Renderer ----
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(C.bg, 1);

  const scene = new Scene();
  scene.add(new AmbientLight(C.plate, 2.1));
  const sun = new DirectionalLight(C.plate, 1.5);
  sun.position.set(-0.5, 1, 0.75);
  scene.add(sun);

  const disposables = new Set<{ dispose(): void }>();
  const keep = <T extends { dispose(): void }>(d: T): T => {
    disposables.add(d);
    return d;
  };

  const lineMat = (c: Color, opacity = 1) =>
    keep(new LineBasicMaterial({ color: c, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  const flatMat = (c: Color) => keep(new MeshLambertMaterial({ color: c, flatShading: true }));

  const M = {
    edge: lineMat(C.edge),
    rail: flatMat(C.rail),
    tram: flatMat(C.tram),
    dark: flatMat(C.dark),
    train: flatMat(C.train),
    suppressed: flatMat(C.dark),
    suppressedEdge: lineMat(C.frame),
    hull: keep(new MeshBasicMaterial({ color: C.edge, side: BackSide })),
    shaft: {
      ALPHA: flatMat(C.shaft.ALPHA),
      BETA: flatMat(C.shaft.BETA),
      GAMMA: flatMat(C.shaft.GAMMA),
      DELTA: flatMat(C.shaft.DELTA),
    } as Record<ClassId, MeshLambertMaterial>,
  };

  // ---- Surface plate ----
  const hw = PLATE_W / 2;
  const hh = PLATE_H / 2;
  const datumY = -model.datumFt * UNITS_PER_FT;
  const ringPoints = (flat: readonly number[], y: number, closed: boolean): number[] => {
    const out: number[] = [];
    const n = flat.length / 2;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const j = (i + 1) % n;
      out.push((flat[i * 2] ?? 0) / 10 - hw, y, (flat[i * 2 + 1] ?? 0) / 10 - hh);
      out.push((flat[j * 2] ?? 0) / 10 - hw, y, (flat[j * 2 + 1] ?? 0) / 10 - hh);
    }
    return out;
  };
  const segments = (positions: number[], mat: LineBasicMaterial): LineSegments => {
    const g = keep(new BufferGeometry());
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const l = new LineSegments(g, mat);
    scene.add(l);
    return l;
  };

  {
    const shapes = NATION_RINGS.map((flat) => {
      const s = new Shape();
      for (let i = 0; i < flat.length; i += 2) {
        const x = (flat[i] ?? 0) / 10 - hw;
        const y = (flat[i + 1] ?? 0) / 10 - hh;
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      }
      return s;
    });
    const g = keep(new ShapeGeometry(shapes));
    g.rotateX(Math.PI / 2); // shape (x, y) -> ground (x, 0, z)
    const plate = new Mesh(
      g,
      keep(new MeshBasicMaterial({ color: C.plate, side: DoubleSide, transparent: true, opacity: 0.34, depthWrite: false })),
    );
    plate.renderOrder = 2;
    scene.add(plate);

    const coast: number[] = [];
    const under: number[] = [];
    for (const r of NATION_RINGS) {
      coast.push(...ringPoints(r, 0.15, true));
      under.push(...ringPoints(r, datumY, true));
    }
    const borders: number[] = [];
    for (const b of STATE_BORDERS) borders.push(...ringPoints(b, 0.15, false));
    segments(borders, lineMat(C.stateLine)).renderOrder = 3;
    segments(coast, lineMat(C.coast)).renderOrder = 3;
    segments(under, lineMat(C.stateLine, 0.7));
  }

  // ---- Reference frame, depth scale and the canon transit depth band ----
  const labels: Label[] = [];
  const addLabel = (el: HTMLElement, p: Vector3, o: Partial<Pick<Label, 'dx' | 'dy' | 'ax' | 'ay' | 'show'>> = {}): Label => {
    labelLayer.append(el);
    const l: Label = { el, p, dx: o.dx ?? 0, dy: o.dy ?? 0, ax: o.ax ?? 0.5, ay: o.ay ?? 0.5, show: o.show ?? (() => true), w: el.offsetWidth, h: el.offsetHeight };
    labels.push(l);
    return l;
  };
  const dropLabel = (l: Label) => {
    l.el.remove();
    const i = labels.indexOf(l);
    if (i >= 0) labels.splice(i, 1);
  };

  {
    const x0 = -hw - FRAME_PAD;
    const x1 = hw + FRAME_PAD;
    const z0 = -hh - FRAME_PAD;
    const z1 = hh + FRAME_PAD;
    const rect = (y: number) => [x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0];
    const frame: number[] = [...rect(0), ...rect(datumY)];
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as const) frame.push(x, 0, z, x, datumY, z);
    // Depth ticks on the front-left post, every 600 ft (the width of the canon band).
    const step = model.bandMaxFt - model.bandMinFt;
    for (let ft = 0; ft <= model.datumFt + 1; ft += step) {
      const y = -ft * UNITS_PER_FT;
      frame.push(x0, y, z1, x0 - 7, y, z1);
      addLabel(h('span', 't3d__label t3d__label--tick', ft === 0 ? 'SURFACE' : `${fmt(ft)} ft`), new Vector3(x0 - 7, y, z1), {
        ax: 1,
        dx: -4,
        show: () => el < 75 * DEG, // seen from above the ticks coincide
      });
    }
    segments(frame, lineMat(C.frame));
    segments([...rect(-model.bandMinFt * UNITS_PER_FT), ...rect(-model.bandMaxFt * UNITS_PER_FT)], lineMat(C.band));
  }

  // ---- Shafts ----
  const siteViews = new Map<string, SiteView>();
  let selected: string | null = null;
  let hovered: string | null = null;
  const edgeGeoCache = new Map<BufferGeometry, EdgesGeometry>();
  const edgesOf = (g: BufferGeometry) => {
    let e = edgeGeoCache.get(g);
    if (!e) {
      e = keep(new EdgesGeometry(g, 30));
      edgeGeoCache.set(g, e);
    }
    return e;
  };
  for (const s of model.sites) {
    const w = SHAFT_W[s.cls];
    const depth = (s.depthFt ?? 0) * UNITS_PER_FT;
    if (depth > 0) {
      const g = keep(new BoxGeometry(w, depth, w));
      const m = new Mesh(g, M.shaft[s.cls]);
      m.position.set(s.x, -depth / 2, s.z);
      m.add(new LineSegments(edgesOf(g), M.edge));
      scene.add(m);
    }
    // Collar at the surface: what an observer above ground could mark on a map.
    const cw = w * 1.7;
    const cg = keep(new BoxGeometry(cw, 0.8, cw));
    const collar = new Mesh(cg, M.shaft[s.cls]);
    collar.position.set(s.x, 0.5, s.z);
    collar.renderOrder = 4;
    const collarEdges = new LineSegments(edgesOf(cg), M.edge);
    collarEdges.renderOrder = 4;
    collar.add(collarEdges);
    scene.add(collar);

    const el = h('span', 't3d__label t3d__label--site', s.id);
    el.dataset.cls = s.cls;
    const label = addLabel(el, new Vector3(s.x, 1, s.z), {
      ay: 1,
      dy: -6,
      show: () => zoom >= LABEL_ZOOM[s.cls] || selected === s.id || hovered === s.id,
    });
    siteViews.set(s.id, { site: s, depth, label });
  }

  // ---- Tunnels ----
  const linkViews = new Map<string, LinkView>();
  const tubeGeometry = (lv: Pick<LinkView, 'curve' | 'segs' | 'link'>, radius: number): TubeGeometry => {
    const g = new TubeGeometry(lv.curve, lv.segs, radius, RADIAL, false);
    if (!lv.link.inService) {
      // Dashes: keep three tubular segments in five.
      const src = g.getIndex();
      if (src) {
        const per = RADIAL * 6;
        const kept: number[] = [];
        for (let j = 0; j < lv.segs; j++) {
          if (j % 5 >= 3) continue;
          for (let k = 0; k < per; k++) kept.push(src.getX(j * per + k));
        }
        g.setIndex(kept);
      }
    }
    return g;
  };
  for (const link of model.links) {
    const pts: Vector3[] = [];
    const world = new Float32Array((LINK_SAMPLES + 1) * 3);
    let len = 0;
    for (let i = 0; i <= LINK_SAMPLES; i++) {
      const v = new Vector3(link.samples[i * 3] ?? 0, -(link.samples[i * 3 + 1] ?? 0) * UNITS_PER_FT, link.samples[i * 3 + 2] ?? 0);
      const prev = pts[pts.length - 1];
      if (prev) len += prev.distanceTo(v);
      pts.push(v);
      world.set([v.x, v.y, v.z], i * 3);
    }
    const curve = new CatmullRomCurve3(pts, false, 'centripetal');
    const segs = link.inService ? Math.round(clamp(len / 5, 16, 120)) : Math.round(clamp(len / 3.2, 20, 200) / 5) * 5;
    const partial = { link, curve, segs };
    const mesh = new Mesh(keep(tubeGeometry(partial, TUBE_R[link.kind])), !link.inService ? M.dark : link.kind === 'rail' ? M.rail : M.tram);
    scene.add(mesh);

    const mid = pts[LINK_SAMPLES / 2] ?? new Vector3();
    // Rail segments carry their number at all times; tram links are named on hover or selection.
    const tagEl = h('span', 't3d__label t3d__label--seg', link.kind === 'rail' ? link.key : `${link.a} / ${link.b}`);
    if (!link.inService) tagEl.dataset.dark = '';
    const tag = addLabel(tagEl, mid.clone(), {
      ay: 0,
      dy: 7,
      show: link.kind === 'rail' ? undefined : () => selected === link.key || hovered === link.key,
    });
    linkViews.set(link.key, { link, curve, segs, mesh, world, tag });
  }

  // ---- Trains ----
  const trainGeo = {
    rail: keep(new BoxGeometry(...TRAIN_BOX.rail)),
    tram: keep(new BoxGeometry(...TRAIN_BOX.tram)),
  };
  const trainLayer = new Group();
  scene.add(trainLayer);
  const trains = new Map<string, TrainState>();
  const tmp: [number, number, number] = [0, 0, 0];
  const ahead = new Vector3();

  const placeTrain = (t: TrainState) => {
    const u = t.reversed ? 1 - t.cur : t.cur;
    pointOnLink(t.link, u, tmp);
    t.group.position.set(tmp[0], -tmp[1] * UNITS_PER_FT, tmp[2]);
    const e = 0.5 / LINK_SAMPLES;
    const u2 = u + e <= 1 ? u + e : u - e;
    pointOnLink(t.link, u2, tmp);
    ahead.set(tmp[0], -tmp[1] * UNITS_PER_FT, tmp[2]);
    t.group.lookAt(ahead);
    if (t.label) t.label.p.copy(t.group.position);
  };

  const setTrains = (list: TunnelTrain[]) => {
    const seen = new Set<string>();
    for (const tr of list) {
      const r = resolveLink(model, tr.link);
      if (!r) continue;
      seen.add(tr.id);
      const pos = clamp(tr.pos, 0, 1);
      const sig = `${tr.kind}|${tr.suppressed ? 1 : 0}|${tr.label}`;
      let st = trains.get(tr.id);
      if (st && st.sig !== sig) {
        removeTrain(tr.id, st);
        st = undefined;
      }
      if (!st) {
        const kind = tr.kind === 'tram' ? 'tram' : 'rail';
        const group = new Group();
        const box = new Mesh(trainGeo[kind], tr.suppressed ? M.suppressed : M.train);
        box.add(new LineSegments(edgesOf(trainGeo[kind]), tr.suppressed ? M.suppressedEdge : M.edge));
        group.add(box);
        trainLayer.add(group);
        const label = tr.suppressed
          ? null
          : addLabel(h('span', 't3d__label t3d__label--train', tr.label), new Vector3(), { ax: 0, ay: 1, dx: 7, dy: -7 });
        st = { group, label, link: r.link, reversed: r.reversed, cur: pos, target: pos, sig };
        trains.set(tr.id, st);
      } else if (st.link !== r.link || st.reversed !== r.reversed || reducedMotion || Math.abs(pos - st.cur) > 0.25) {
        st.link = r.link;
        st.reversed = r.reversed;
        st.cur = st.target = pos;
      } else {
        st.target = pos;
      }
      placeTrain(st);
    }
    for (const [id, st] of trains) if (!seen.has(id)) removeTrain(id, st);
    invalidate();
  };
  const removeTrain = (id: string, st: TrainState) => {
    trainLayer.remove(st.group);
    if (st.label) dropLabel(st.label);
    trains.delete(id);
  };

  // ---- Camera ----
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  const persp = new PerspectiveCamera(26, 1, 10, 9000);
  let useOrtho = opts.projection !== 'perspective';
  let cam: Camera = useOrtho ? ortho : persp;
  const home = new Vector3(-12, datumY * 0.5, -6);
  const target = home.clone();
  let az: number = VIEWS.oblique.az;
  let el: number = VIEWS.oblique.el;
  let zoom = 1;
  let width = 1;
  let height = 1;
  let halfH = 300;
  const dir = new Vector3();

  const applyCamera = () => {
    const aspect = width / height;
    halfH = Math.max((hw + 165) / aspect, 310);
    const ce = Math.cos(el);
    dir.set(Math.sin(az) * ce, Math.sin(el), Math.cos(az) * ce);
    if (useOrtho) {
      cam = ortho;
      ortho.left = -halfH * aspect;
      ortho.right = halfH * aspect;
      ortho.top = halfH;
      ortho.bottom = -halfH;
      ortho.zoom = zoom;
      ortho.position.copy(target).addScaledVector(dir, 2400);
      ortho.lookAt(target);
      ortho.updateProjectionMatrix();
    } else {
      cam = persp;
      const d = (halfH * 1.15) / zoom / Math.tan((persp.fov * DEG) / 2); // a little further back: the near corners splay
      persp.aspect = aspect;
      persp.near = Math.max(5, d / 40);
      persp.far = d + 3000;
      persp.position.copy(target).addScaledVector(dir, d);
      persp.lookAt(target);
      persp.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
  };

  // ---- Render loop (on demand) ----
  let raf = 0;
  let disposed = false;
  let lastT = 0;
  const invalidate = () => {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  };
  const v = new Vector3();
  const project = (p: Vector3 | { x: number; y: number; z: number }, out: { x: number; y: number; z: number }) => {
    v.set(p.x, p.y, p.z).project(cam);
    out.x = (v.x * 0.5 + 0.5) * width;
    out.y = (-v.y * 0.5 + 0.5) * height;
    out.z = v.z;
    return out;
  };
  const sp = { x: 0, y: 0, z: 0 };

  const layoutLabels = () => {
    for (const l of labels) {
      let on = l.show();
      if (on) {
        project(l.p, sp);
        on = sp.z > -1 && sp.z < 1 && sp.x > -40 && sp.x < width + 40 && sp.y > -20 && sp.y < height + 20;
      }
      if (!on) {
        if (l.el.style.display !== 'none') l.el.style.display = 'none';
        continue;
      }
      if (l.el.style.display === 'none') l.el.style.display = '';
      if (!l.w) {
        l.w = l.el.offsetWidth;
        l.h = l.el.offsetHeight;
      }
      l.el.style.transform = `translate(${Math.round(sp.x + l.dx - l.w * l.ax)}px, ${Math.round(sp.y + l.dy - l.h * l.ay)}px)`;
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016;
    lastT = now;
    let moving = false;
    for (const t of trains.values()) {
      const d = t.target - t.cur;
      if (d === 0) continue;
      if (Math.abs(d) < 1e-5) t.cur = t.target;
      else {
        t.cur += d * Math.min(1, dt * 6);
        moving = true;
      }
      placeTrain(t);
    }
    applyCamera();
    renderer.render(scene, cam);
    layoutLabels();
    if (moving) invalidate();
    else lastT = 0;
  };

  // ---- Selection ----
  let hull: Mesh | null = null;
  const describe = (key: string | null): string => {
    if (!key) return 'No selection. Drag to rotate. Select a shaft or tunnel for particulars.';
    const lv = linkViews.get(key);
    if (lv) {
      const l = lv.link;
      const head = l.kind === 'rail' ? `SEGMENT ${l.key}` : `TRAM ${l.note.replace(/[()]/g, '')}`.toUpperCase();
      const parts = [head, `${l.a} to ${l.b}`];
      if (l.kind === 'rail') parts.push(l.note);
      else if (l.network) parts.push(l.network);
      parts.push(`${fmt(l.miles)} mi`, `${l.hours.toFixed(1)} h`);
      if (l.status) parts.push(l.status);
      return parts.join('   ');
    }
    const sv = siteViews.get(key);
    if (sv) {
      const s = sv.site;
      const parts = [s.id, `Class ${s.cls}`, s.depthFt === null ? 'Depth not recorded' : `Depth ${fmt(s.depthFt)} ft`];
      const rail = s.links.filter((k) => !k.includes('>'));
      const tram = s.links.filter((k) => k.includes('>')).map((k) => k.split('>').find((id) => id !== s.id) ?? k);
      if (rail.length) parts.push(`Rail segments ${rail.join(', ')}`);
      if (tram.length) parts.push(`Tram to ${tram.join(', ')}`);
      if (!rail.length && !tram.length) parts.push('No transit connection');
      return parts.join('   ');
    }
    return 'No selection.';
  };

  const setSelected = (key: string | null) => {
    const k = key && (linkViews.has(key) || siteViews.has(key)) ? key : null;
    if (k === selected) return;
    for (const prev of [selected ? linkViews.get(selected)?.tag : null, selected ? siteViews.get(selected)?.label : null]) {
      if (prev) delete prev.el.dataset.sel;
    }
    selected = k;
    if (hull) {
      scene.remove(hull);
      hull.geometry.dispose();
      hull = null;
    }
    if (k) {
      const lv = linkViews.get(k);
      const sv = siteViews.get(k);
      if (lv) {
        hull = new Mesh(tubeGeometry(lv, TUBE_R[lv.link.kind] + 1.9), M.hull);
        lv.tag.el.dataset.sel = '';
      } else if (sv) {
        const w = SHAFT_W[sv.site.cls];
        const d = Math.max(sv.depth, 0.8);
        hull = new Mesh(new BoxGeometry(w + 2.6, d + 2.6, w + 2.6), M.hull);
        hull.position.set(sv.site.x, sv.depth > 0 ? -d / 2 : 0.5, sv.site.z);
        sv.label.el.dataset.sel = '';
      }
      if (hull) scene.add(hull);
    }
    status.textContent = describe(k);
    invalidate();
  };

  // ---- Picking (screen space: thin tubes stay easy to hit) ----
  const pa = { x: 0, y: 0, z: 0 };
  const pb = { x: 0, y: 0, z: 0 };
  const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  const pick = (px: number, py: number): string | null => {
    let best: string | null = null;
    let bestD = PICK_PX;
    for (const sv of siteViews.values()) {
      project({ x: sv.site.x, y: 0.5, z: sv.site.z }, pa);
      project({ x: sv.site.x, y: -sv.depth, z: sv.site.z }, pb);
      const d = segDist(px, py, pa.x, pa.y, pb.x, pb.y) - 2.5; // sites win near-ties with the tunnels that meet them
      if (d < bestD) {
        bestD = d;
        best = sv.site.id;
      }
    }
    for (const lv of linkViews.values()) {
      const w = lv.world;
      project({ x: w[0] ?? 0, y: w[1] ?? 0, z: w[2] ?? 0 }, pa);
      for (let i = 2; i <= LINK_SAMPLES; i += 2) {
        project({ x: w[i * 3] ?? 0, y: w[i * 3 + 1] ?? 0, z: w[i * 3 + 2] ?? 0 }, pb);
        const d = segDist(px, py, pa.x, pa.y, pb.x, pb.y);
        if (d < bestD) {
          bestD = d;
          best = lv.link.key;
        }
        pa.x = pb.x;
        pa.y = pb.y;
      }
    }
    return best;
  };

  // ---- View controls ----
  const clampView = () => {
    az = clamp(az, LIMITS.azMin, LIMITS.azMax);
    el = clamp(el, LIMITS.elMin, LIMITS.elMax);
    zoom = clamp(zoom, LIMITS.zoomMin, LIMITS.zoomMax);
    target.x = clamp(target.x, -hw, hw);
    target.z = clamp(target.z, -hh, hh);
    target.y = clamp(target.y, datumY, 0);
  };
  const orbit = (dAz: number, dEl: number) => {
    az += dAz;
    el += dEl;
    clampView();
    invalidate();
  };
  /** Pan by screen pixels: horizontally along the ground, vertically along the screen's up axis on the ground. */
  const pan = (dxPx: number, dyPx: number) => {
    const s = (2 * halfH) / zoom / height;
    const f = dyPx * s / Math.max(Math.sin(el), 0.35);
    target.x += -dxPx * s * Math.cos(az) - f * Math.sin(az);
    target.z += dxPx * s * Math.sin(az) - f * Math.cos(az);
    clampView();
    invalidate();
  };
  const zoomBy = (f: number) => {
    zoom *= f;
    clampView();
    invalidate();
  };
  const setView = (name: ViewName) => {
    az = VIEWS[name].az;
    el = VIEWS[name].el;
    zoom = 1;
    target.copy(home);
    invalidate();
  };

  const button = (text: string, title: string, fn: () => void) => {
    const b = h('button', 'btn btn--small', text);
    b.type = 'button';
    b.title = title;
    b.addEventListener('click', fn);
    tools.append(b);
    return b;
  };
  button('Oblique', 'Standard oblique view', () => setView('oblique'));
  button('Plan', 'View from directly above', () => setView('plan'));
  button('Section', 'View from the south at ground level', () => setView('section'));
  tools.append(h('span', 't3d__sep'));
  const projBtn = button('Orthographic', 'Orthographic projection (parallel, measurable). Release for perspective.', () => {
    useOrtho = !useOrtho;
    projBtn.setAttribute('aria-pressed', String(useOrtho));
    invalidate();
  });
  projBtn.setAttribute('aria-pressed', String(useOrtho));
  tools.append(h('span', 't3d__sep'));
  button('+', 'Increase magnification', () => zoomBy(1.3)).setAttribute('aria-label', 'Increase magnification');
  button('−', 'Decrease magnification', () => zoomBy(1 / 1.3)).setAttribute('aria-label', 'Decrease magnification');

  // ---- Legend ----
  {
    legend.append(h('h3', '', 'Tunnel network: depth model'));
    const dl = h('dl', '');
    const row = (sw: string, text: string) => {
      const dt = h('dt', '');
      dt.append(h('span', `t3d__sw t3d__sw--${sw}`));
      dl.append(dt, h('dd', '', text));
    };
    row('rail', `Rail. ${model.railSystem}`);
    row('tram', `Tram. ${model.tramSystem}`);
    for (const l of model.links) if (!l.inService && l.status) row('dark', `Segment ${l.key}. ${l.status}`);
    row('shaft', 'Facility shaft to recorded depth');
    row('train', 'Consist');
    row('band', `Transit depth band ${fmt(model.bandMinFt)} to ${fmt(model.bandMaxFt)} ft`);
    legend.append(dl);
    const p = h('p', '');
    p.append('Vertical exaggeration ', h('strong', '', `×${fmt(VERTICAL_EXAGGERATION)}`), '. Plate: lower 48, Albers equal-area conic. Depths in feet below surface. Not for survey use.');
    legend.append(p);
  }

  // ---- Input ----
  const cleanup: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, o?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, o);
    cleanup.push(() => t.removeEventListener(type, fn, o));
  };
  let drag: { id: number; x: number; y: number; sx: number; sy: number; pan: boolean; moved: boolean } | null = null;
  const local = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const setHover = (k: string | null) => {
    if (k === hovered) return;
    hovered = k;
    if (k) canvas.dataset.hit = '';
    else delete canvas.dataset.hit;
    invalidate();
  };
  on(canvas, 'pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, pan: e.button === 2 || e.shiftKey, moved: false };
  });
  on(canvas, 'pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) {
      if (e.pointerType === 'mouse') setHover(pick(...local(e)));
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) {
      drag.moved = true;
      canvas.dataset.drag = '';
      setHover(null);
    }
    if (!drag.moved) return;
    if (drag.pan) pan(dx, dy);
    else orbit(-dx * 0.006, dy * 0.006);
  });
  const endDrag = (e: PointerEvent, click: boolean) => {
    if (!drag || drag.id !== e.pointerId) return;
    const wasClick = click && !drag.moved && e.button === 0;
    drag = null;
    delete canvas.dataset.drag;
    if (wasClick) userSelect(pick(...local(e)));
  };
  on(canvas, 'pointerup', (e) => endDrag(e, true));
  on(canvas, 'pointercancel', (e) => endDrag(e, false));
  on(canvas, 'pointerleave', () => setHover(null));
  on(canvas, 'contextmenu', (e) => e.preventDefault());
  on(canvas, 'wheel', (e) => {
    e.preventDefault();
    zoomBy(Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  const userSelect = (k: string | null) => {
    if (k === selected) return;
    setSelected(k);
    opts.onSelect?.(selected ?? '');
  };
  const cycle = [...model.links.map((l) => l.key), ...model.sites.map((s) => s.id)];
  on(canvas, 'keydown', (e) => {
    const step = 5 * DEG;
    let used = true;
    switch (e.key) {
      case 'ArrowLeft': if (e.shiftKey) pan(40, 0); else orbit(-step, 0); break;
      case 'ArrowRight': if (e.shiftKey) pan(-40, 0); else orbit(step, 0); break;
      case 'ArrowUp': if (e.shiftKey) pan(0, 40); else orbit(0, step); break;
      case 'ArrowDown': if (e.shiftKey) pan(0, -40); else orbit(0, -step); break;
      case '+': case '=': zoomBy(1.2); break;
      case '-': case '_': zoomBy(1 / 1.2); break;
      case 'Home': setView('oblique'); break;
      case 'Escape': userSelect(null); break;
      case 'PageDown': case 'PageUp': {
        const i = selected ? cycle.indexOf(selected) : -1;
        const n = cycle.length;
        const next = e.key === 'PageDown' ? (i + 1) % n : (i <= 0 ? n - 1 : i - 1);
        userSelect(cycle[next] ?? null);
        break;
      }
      default: used = false;
    }
    if (used) e.preventDefault();
  });

  const ro = new ResizeObserver(() => {
    const w = Math.max(1, Math.round(root.clientWidth));
    const hgt = Math.max(1, Math.round(root.clientHeight));
    if (w === width && hgt === height) return;
    width = w;
    height = hgt;
    renderer.setSize(w, hgt, false);
    // Render in the same task so the canvas never shows a cleared frame during a window resize.
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    frame(performance.now());
  });
  ro.observe(root);

  // ---- Initial state ----
  status.textContent = describe(null);
  setTrains(opts.trains ?? []);
  if (opts.selected) setSelected(opts.selected);
  invalidate();

  return {
    update: (list) => {
      if (!disposed) setTrains(list);
    },
    select: (key) => {
      if (!disposed) setSelected(key || null);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      for (const fn of cleanup) fn();
      hull?.geometry.dispose();
      const mats = new Set<Material>();
      scene.traverse((o: Object3D) => {
        const m = o as Partial<Mesh>;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((x) => mats.add(x));
        else if (m.material) mats.add(m.material);
      });
      for (const m of mats) m.dispose();
      for (const d of disposables) d.dispose();
      disposables.clear();
      edgeGeoCache.clear();
      trains.clear();
      labels.length = 0;
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      root.replaceChildren();
    },
  };
}
