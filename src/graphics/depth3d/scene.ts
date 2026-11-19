/**
 * @graphics/depth3d: the Three.js scene. This file (and three itself) is only ever
 * reached through `import('./scene')` in index.ts, so it forms the lazy chunk.
 *
 * Look: an engineering cutaway. Flat per-face shading baked into vertex colours (no
 * lights, no shadows, no fog, no post-processing), thin black edges, a canvas-drawn
 * section hatch on cut rock faces. Annotation (depth scale, leaders, labels) is a crisp
 * SVG/HTML overlay projected from the model each time the view changes.
 * Rendering is on demand: nothing is drawn while the view is at rest.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Float32BufferAttribute,
  LinearMipmapLinearFilter,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import { fillDesignation, h, type FrameMode, type Projection, type ViewImpl } from './chrome';
import { PLAN, fmtFt, spreadLabels, tickLabelStep, titleBlock, type Box, type SiteModel } from './model';

export interface SceneInit {
  tier: number;
  selected: number | null;
  reducedMotion: boolean;
  onPick(n: number): void;
}

const HATCH_FT = 160; // world size of one hatch tile
const FOV = 24;
const AZ0 = (18 * Math.PI) / 180;
const POL0 = (87 * Math.PI) / 180;
const AZ_MAX = (65 * Math.PI) / 180;
const POL_MIN = (52 * Math.PI) / 180;
const POL_MAX = (90 * Math.PI) / 180;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 14;

/** Linear-space shade per box face, by outward normal. Flat, fixed, no light rig. */
function shadeFor(nx: number, ny: number, nz: number): number {
  if (ny > 0.5) return 1;
  if (ny < -0.5) return 0.42;
  if (nz > 0.5) return 0.84;
  if (nz < -0.5) return 0.5;
  return nx > 0 ? 0.62 : 0.7;
}

function readPalette(el: HTMLElement): (token: string, fallback: number) => Color {
  const cs = getComputedStyle(el);
  return (token, fallback) => {
    const v = cs.getPropertyValue(token).trim();
    const c = new Color();
    if (v) c.setStyle(v);
    else c.setScalar(fallback);
    return c;
  };
}

function cssOf(c: Color): string {
  return `#${c.getHexString()}`;
}

function makeHatch(paper: Color, ink: Color): CanvasTexture {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d')!;
  g.fillStyle = cssOf(paper);
  g.fillRect(0, 0, size, size);
  g.strokeStyle = cssOf(ink);
  g.lineWidth = 3.5;
  g.lineCap = 'square';
  const stepPx = size / 4;
  g.beginPath();
  for (let k = -size; k <= size; k += stepPx) {
    g.moveTo(k, size);
    g.lineTo(k + size, 0);
  }
  g.stroke();
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

export function createScene(host: HTMLElement, model: SiteModel, init: SceneInit): ViewImpl {
  const tok = readPalette(host);
  const col = {
    bg: tok('--surface', 1),
    ink: tok('--text-1', 0.08),
    slab: tok('--chrome-face', 0.82),
    terminal: tok('--th-bg', 0.88),
    shaft: tok('--chrome-hi', 0.95),
    ramp: tok('--text-2', 0.3),
    cover: tok('--surface', 1),
    bore: tok('--row-rule', 0.78),
    boreStandby: tok('--paper', 0.95),
    ground: tok('--paper-edge', 0.84),
    rockBack: tok('--paper-edge', 0.84),
    paper: tok('--paper', 0.95),
    hatchInk: tok('--text-3', 0.5),
    select: tok('--select-bg', 0.2),
  };

  // ---------- DOM ----------
  const canvas = h('canvas', 'd3v-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  // Static markup, parsed by the HTML parser so the SVG namespace needs no URL literal here.
  const annWrap = h('div');
  annWrap.innerHTML =
    '<svg class="d3v-ann" aria-hidden="true"><path class="d3v-ann-lead"/><rect class="d3v-ann-back"/>' +
    '<path class="d3v-ann-line"/><path class="d3v-ann-line is-heavy"/><path class="d3v-ann-line is-dash"/></svg>';
  const svg = annWrap.firstElementChild as SVGSVGElement;
  const [pLead, rulerBack, pLines, pHeavy, pDash] = Array.from(svg.children) as [SVGElement, SVGElement, SVGElement, SVGElement, SVGElement];
  const layer = h('div', 'd3v-labels');
  host.append(canvas, svg, layer);

  // level labels
  const lvlEls = model.levels.map((lv) => {
    const el = h('div', 'd3v-lbl');
    const name = h('span', 'd3v-lbl-name');
    el.append(h('span', 'd3v-mono', String(lv.n).padStart(2, '0')), h('span', 'd3v-mono d3v-num', fmtFt(lv.topFt)), name);
    el.addEventListener('click', () => init.onPick(lv.n));
    layer.append(el);
    return { el, name, lv };
  });
  // depth scale numbers
  const tickEls = model.ticks.map((t) => {
    const el = h('div', `d3v-tick${t.canon ? ' is-canon' : ''}`, t.canon ? `${fmtFt(t.ft)} ft` : fmtFt(t.ft));
    layer.append(el);
    return { el, t };
  });
  const boreEls = model.bores.map((b) => {
    const el = h('div', 'd3v-bore-lbl', b.label);
    layer.append(el);
    return { el, b };
  });
  const noteShaft = h('div', 'd3v-note', model.callouts.shaft.label);
  const noteDecline = h('div', 'd3v-note', model.callouts.decline.label);
  layer.append(noteShaft, noteDecline);
  const tb = h('div', 'd3v-tb');
  titleBlock(model).forEach((line, i) => tb.append(h('div', i === 0 ? 'is-strong' : undefined, line)));
  layer.append(tb);

  // ---------- renderer ----------
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setClearColor(col.bg, 1);
  const scene = new Scene();
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const texs: Texture[] = [];

  // Unit box with baked face shades, shared by every slab.
  const unit = new BoxGeometry(1, 1, 1).toNonIndexed();
  {
    const nrm = unit.getAttribute('normal');
    const c = new Float32Array(nrm.count * 3);
    for (let i = 0; i < nrm.count; i++) {
      const s = shadeFor(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = s;
    }
    unit.setAttribute('color', new Float32BufferAttribute(c, 3));
  }
  geos.push(unit);
  const unitIdx = new BoxGeometry(1, 1, 1);
  const unitEdges = new EdgesGeometry(unitIdx);
  unitIdx.dispose();

  // Everything that never changes is merged into one mesh and one line set.
  const sPos: number[] = [];
  const sCol: number[] = [];
  const ePos: number[] = [];
  const uPos = unit.getAttribute('position');
  const uCol = unit.getAttribute('color');
  const uEdge = unitEdges.getAttribute('position');
  const v = new Vector3();
  const mtx = new Matrix4();
  const quat = new Quaternion();
  const zAxis = new Vector3(0, 0, 1);
  const boxMatrix = (b: Box, rotZ = 0): Matrix4 => {
    quat.setFromAxisAngle(zAxis, rotZ);
    return mtx.compose(
      new Vector3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2),
      quat,
      new Vector3(b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0),
    );
  };
  const pushEdges = (m: Matrix4): void => {
    for (let i = 0; i < uEdge.count; i++) {
      v.fromBufferAttribute(uEdge, i).applyMatrix4(m);
      ePos.push(v.x, v.y, v.z);
    }
  };
  const addStatic = (m: Matrix4, c: Color, edges = true): void => {
    for (let i = 0; i < uPos.count; i++) {
      v.fromBufferAttribute(uPos, i).applyMatrix4(m);
      sPos.push(v.x, v.y, v.z);
      const s = uCol.getX(i);
      sCol.push(c.r * s, c.g * s, c.b * s);
    }
    if (edges) pushEdges(m);
  };

  // cover facility, shaft, decline, bores
  for (const c of model.cover) addStatic(boxMatrix(c), col.cover);
  addStatic(boxMatrix(model.shaft), col.shaft);
  for (const leg of model.ramp.legs) {
    const dx = leg.xb - leg.xa;
    const dy = leg.yb - leg.ya;
    const len = Math.hypot(dx, dy);
    const mx = (leg.xa + leg.xb) / 2;
    const my = (leg.ya + leg.yb) / 2;
    addStatic(
      boxMatrix({ x0: mx - len / 2, x1: mx + len / 2, y0: my - model.ramp.thick / 2, y1: my + model.ramp.thick / 2, z0: model.ramp.z0, z1: model.ramp.z1 }, Math.atan2(dy, dx)),
      col.ramp,
      false,
    );
  }
  for (const b of model.bores) addStatic(boxMatrix(b), b.inService ? col.bore : col.boreStandby);

  const fillOpts = { vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 } as const;
  const staticGeo = new BufferGeometry();
  staticGeo.setAttribute('position', new Float32BufferAttribute(sPos, 3));
  staticGeo.setAttribute('color', new Float32BufferAttribute(sCol, 3));
  const staticMat = new MeshBasicMaterial(fillOpts);
  scene.add(new Mesh(staticGeo, staticMat));
  geos.push(staticGeo);
  mats.push(staticMat);

  // level slabs: one mesh each so a slab can be picked and highlighted
  const slabs = model.levels.map((lv) => {
    const base = lv.terminal ? col.terminal : col.slab;
    const mat = new MeshBasicMaterial({ ...fillOpts, color: base });
    const mesh = new Mesh(unit, mat);
    const m = boxMatrix(lv);
    mesh.applyMatrix4(m);
    mesh.updateMatrixWorld();
    mesh.userData.n = lv.n;
    pushEdges(m);
    scene.add(mesh);
    mats.push(mat);
    return { mesh, mat, base, lv };
  });

  // rock: retained half behind the cut plane. Hatch on every cut face, plain ground on top.
  {
    const r = model.rock;
    const g = new BoxGeometry(r.x1 - r.x0, r.y1 - r.y0, r.z1 - r.z0).toNonIndexed();
    g.translate((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, (r.z0 + r.z1) / 2);
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    const uv = new Float32Array(pos.count * 2);
    const c = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const nx = nrm.getX(i);
      const ny = nrm.getY(i);
      const [a, bb] = Math.abs(nx) > 0.5 ? [pos.getZ(i), pos.getY(i)] : Math.abs(ny) > 0.5 ? [pos.getX(i), pos.getZ(i)] : [pos.getX(i), pos.getY(i)];
      uv[i * 2] = a / HATCH_FT;
      uv[i * 2 + 1] = bb / HATCH_FT;
      // cut faces keep the paper tone; only the far side and underside are shaded down
      const s = ny > 0.5 ? 1 : Math.abs(nx) > 0.5 ? 0.82 : nrm.getZ(i) > 0.5 ? 1 : 0.6;
      c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = s;
    }
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new Float32BufferAttribute(c, 3));
    const hatch = makeHatch(col.paper, col.hatchInk);
    hatch.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texs.push(hatch);
    const mHatch = new MeshBasicMaterial({ ...fillOpts, map: hatch });
    const mGround = new MeshBasicMaterial({ ...fillOpts, color: col.ground });
    const mBack = new MeshBasicMaterial({ ...fillOpts, color: col.rockBack });
    // BoxGeometry group order: +x, -x, +y, -y, +z, -z
    scene.add(new Mesh(g, [mHatch, mHatch, mGround, mHatch, mHatch, mBack]));
    geos.push(g);
    mats.push(mHatch, mGround, mBack);
    pushEdges(boxMatrix(r));
  }

  const edgeGeo = new BufferGeometry();
  edgeGeo.setAttribute('position', new Float32BufferAttribute(ePos, 3));
  const edgeMat = new LineBasicMaterial({ color: col.ink });
  scene.add(new LineSegments(edgeGeo, edgeMat));
  geos.push(edgeGeo, unitEdges);
  mats.push(edgeMat);

  // ---------- camera ----------
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 1, 40000);
  const persp = new PerspectiveCamera(FOV, 1, 10, 60000);
  let cam: OrthographicCamera | PerspectiveCamera = ortho;
  const b = model.bounds;
  const home = new Vector3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0);
  const cur = { az: AZ0, pol: POL0, zoom: 1, tx: home.x, ty: home.y };
  let goal: typeof cur | null = null;
  let animFrom: typeof cur | null = null;
  let animStart = 0;
  const ANIM_MS = 200;

  let vw = 1;
  let vh = 1;
  let fit = 1; // px per foot at zoom 1
  const gutters = (): { gL: number; gR: number; padT: number; padB: number } => ({ gL: 68, gR: Math.min(256, Math.round(vw * 0.36)), padT: 14, padB: 58 });
  const target = new Vector3();

  function updateCamera(): void {
    const { gL, gR, padT, padB } = gutters();
    const availW = Math.max(60, vw - gL - gR);
    const availH = Math.max(60, vh - padT - padB);
    fit = Math.min(availH / (b.y1 - b.y0), availW / (b.x1 - b.x0));
    const offX = vw / 2 - (gL + availW / 2);
    const offY = vh / 2 - (padT + availH / 2);
    target.set(cur.tx, cur.ty, 0);
    const sp = Math.sin(cur.pol);
    const dir = new Vector3(sp * Math.sin(cur.az), Math.cos(cur.pol), sp * Math.cos(cur.az));
    if (cam === ortho) {
      ortho.left = -vw / (2 * fit);
      ortho.right = vw / (2 * fit);
      ortho.top = vh / (2 * fit);
      ortho.bottom = -vh / (2 * fit);
      ortho.zoom = cur.zoom;
      ortho.position.copy(target).addScaledVector(dir, 12000);
    } else {
      const dist = vh / (2 * fit * cur.zoom) / Math.tan((FOV * Math.PI) / 360);
      persp.aspect = vw / vh;
      persp.near = Math.max(20, dist * 0.05);
      persp.far = dist + 12000;
      persp.position.copy(target).addScaledVector(dir, dist);
    }
    cam.lookAt(target);
    cam.setViewOffset(vw, vh, offX, offY, vw, vh); // also updates the projection matrix
    cam.updateMatrixWorld();
  }

  const pv = new Vector3();
  const project = (x: number, y: number, z: number): { x: number; y: number } => {
    pv.set(x, y, z).project(cam);
    return { x: (pv.x + 1) * 0.5 * vw, y: (1 - pv.y) * 0.5 * vh };
  };
  const snap = (n: number): number => Math.round(n) + 0.5;

  // ---------- annotation overlay ----------
  let tier = init.tier;
  let selected = init.selected;
  function fillLabels(): void {
    for (const { el, name, lv } of lvlEls) {
      fillDesignation(name, lv, tier);
      el.classList.toggle('is-sel', lv.n === selected);
    }
  }

  function layoutOverlay(): void {
    const { gR } = gutters();
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    const r = model.rock;
    // right-hand label column: just clear of the drawing, never off the view
    let maxX = 0;
    for (const x of [r.x0, r.x1 + PLAN.boreStub]) for (const y of [r.y0, r.y1]) for (const z of [r.z0, PLAN.termZ1]) maxX = Math.max(maxX, project(x, y, z).x);
    const labelX = Math.round(Math.max(120, Math.min(vw - gR + 14, maxX + 18)));
    const rightBores = boreEls.filter((e) => e.b.side > 0);
    const leftBores = boreEls.filter((e) => e.b.side < 0);

    // level labels + leaders
    const anchors = model.levels.map((lv) => project(lv.x1, (lv.y0 + lv.y1) / 2, lv.z1));
    const ys = spreadLabels(
      anchors.map((a) => a.y),
      13,
      10,
      vh - 92 - rightBores.length * 12,
    );
    let lead = '';
    lvlEls.forEach(({ el }, i) => {
      const a = anchors[i]!;
      const ly = Math.round(ys[i]!);
      const off = a.y < -8 || a.y > vh + 8;
      el.style.display = off ? 'none' : '';
      if (off) return;
      el.style.transform = `translate(${labelX}px, ${ly - 6}px)`;
      el.style.width = `${Math.max(60, vw - labelX - 4)}px`;
      lead += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${labelX - 14} ${ly + 0.5}H${labelX - 3}`;
    });

    // callouts: lift shaft (on the drawing) and vehicle decline (in the label column)
    {
      const cs = model.callouts.shaft;
      const p = project(cs.x, cs.y, cs.z);
      const showS = p.y > 10 && p.y < vh - 90;
      noteShaft.style.display = showS ? '' : 'none';
      if (showS) {
        noteShaft.style.transform = `translate(${Math.round(p.x) + 12}px, ${Math.round(p.y) - 6}px)`;
        lead += `M${p.x.toFixed(1)} ${snap(p.y)}H${Math.round(p.x) + 11}`;
      }
      const cd = model.callouts.decline;
      const q = project(cd.x, cd.y, cd.z);
      const qy = Math.round(q.y);
      const clear = ys.every((y, i) => lvlEls[i]!.el.style.display === 'none' || Math.abs(y - qy) > 14);
      const showD = clear && q.y > 10 && q.y < vh - 96;
      noteDecline.style.display = showD ? '' : 'none';
      if (showD) {
        noteDecline.style.transform = `translate(${labelX}px, ${qy - 6}px)`;
        lead += `M${q.x.toFixed(1)} ${qy + 0.5}H${labelX - 3}`;
      }
    }

    // depth scale
    const top = project(PLAN.scaleX, 0, 0);
    const bot = project(PLAN.scaleX, -model.depthFt, 0);
    const axisX = snap(Math.max(66, top.x));
    const pxPerFt = Math.abs(bot.y - top.y) / model.depthFt;
    const step = tickLabelStep(pxPerFt);
    rulerBack.setAttribute('x', '0');
    rulerBack.setAttribute('y', '0');
    rulerBack.setAttribute('width', String(axisX));
    rulerBack.setAttribute('height', String(vh));
    let lines = `M${axisX} ${snap(top.y)}V${snap(bot.y)}`;
    let heavy = '';
    for (const { el, t } of tickEls) {
      const p = project(PLAN.scaleX, -t.ft, 0);
      const y = snap(p.y);
      const len = t.canon ? 12 : t.major ? 9 : 5;
      const seg = `M${axisX - len} ${y}H${axisX}`;
      if (t.canon) heavy += seg;
      else lines += seg;
      const show = y > 4 && y < vh - 4 && (t.canon || (t.ft % step === 0 && Math.abs(t.ft - model.depthFt) * pxPerFt > 11));
      el.style.display = show ? '' : 'none';
      if (show) el.style.transform = `translate(${axisX - len - 3}px, ${y - 0.5}px) translate(-100%, -50%)`;
    }
    // grade line and the terminal-floor datum carried across to the works
    const gA = project(r.x0 - 70, 0, 0);
    const gB = project(r.x1 + 40, 0, 0);
    lines += `M${Math.max(axisX, gA.x).toFixed(1)} ${gA.y.toFixed(1)}L${gB.x.toFixed(1)} ${gB.y.toFixed(1)}`;
    const fl = project(model.terminal.x0, -model.depthFt, 0);
    pDash.setAttribute('d', `M${axisX} ${snap(bot.y)}L${fl.x.toFixed(1)} ${fl.y.toFixed(1)}`);

    // bore annotations
    const rockBottom = Math.max(project(r.x0, r.y0, 0).y, project(r.x0, r.y0, r.z0).y, project(r.x1, r.y0, 0).y);
    leftBores.forEach(({ el, b: bo }, i) => {
      const p = project(bo.x0, bo.y0, (bo.z0 + bo.z1) / 2);
      const x = Math.max(axisX + 8, p.x);
      const y = Math.min(vh - 8 - (leftBores.length - 1 - i) * 12, Math.round(rockBottom) + 10 + i * 12);
      el.style.transform = `translate(${Math.round(x) + 4}px, ${y - 6}px)`;
      lead += `M${snap(x)} ${p.y.toFixed(1)}V${y}`;
    });
    const lastY = Math.round(ys[ys.length - 1] ?? 0);
    rightBores.forEach(({ el, b: bo }, i) => {
      const p = project(bo.x1, (bo.y0 + bo.y1) / 2, (bo.z0 + bo.z1) / 2);
      const y = lastY + 15 + i * 12;
      el.style.transform = `translate(${labelX}px, ${y - 6}px)`;
      el.style.width = `${Math.max(60, vw - labelX - 4)}px`;
      lead += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${labelX - 14} ${y + 0.5}H${labelX - 3}`;
    });

    pLines.setAttribute('d', lines);
    pHeavy.setAttribute('d', heavy);
    pLead.setAttribute('d', lead);
    tb.style.width = `${Math.max(120, gR - 18)}px`;
  }

  // ---------- render loop (on demand) ----------
  let raf = 0;
  let disposed = false;
  const invalidate = (): void => {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  };
  function frame(now: number): void {
    raf = 0;
    if (disposed) return;
    if (goal && animFrom) {
      const k = Math.min(1, (now - animStart) / ANIM_MS);
      (Object.keys(cur) as (keyof typeof cur)[]).forEach((key) => {
        cur[key] = animFrom![key] + (goal![key] - animFrom![key]) * k;
      });
      if (k >= 1) goal = animFrom = null;
      else invalidate();
    }
    updateCamera();
    renderer.render(scene, cam);
    layoutOverlay();
  }
  function moveTo(next: Partial<typeof cur>): void {
    const g = { ...cur, ...next };
    g.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, g.zoom));
    g.tx = Math.min(b.x1, Math.max(b.x0, g.tx));
    g.ty = Math.min(b.y1, Math.max(b.y0, g.ty));
    if (init.reducedMotion) {
      Object.assign(cur, g);
      goal = animFrom = null;
    } else {
      goal = g;
      animFrom = { ...cur };
      animStart = performance.now();
    }
    invalidate();
  }

  function paintSlabs(): void {
    for (const s of slabs) s.mat.color.copy(s.lv.n === selected ? col.select : s.base);
  }

  // ---------- input ----------
  const ray = new Raycaster();
  const ndc = new Vector2();
  const pick = (e: PointerEvent | MouseEvent): number | null => {
    const rc = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(
      slabs.map((s) => s.mesh),
      false,
    )[0];
    return hit ? (hit.object.userData.n as number) : null;
  };
  let drag: { id: number; x: number; y: number; moved: number; pan: boolean } | null = null;
  const onDown = (e: PointerEvent): void => {
    if (e.button > 2) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, pan: e.button !== 0 || e.shiftKey };
    canvas.setPointerCapture(e.pointerId);
  };
  let hoverQueued = false;
  const onMove = (e: PointerEvent): void => {
    if (!drag) {
      if (hoverQueued) return;
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        if (!disposed) canvas.style.cursor = pick(e) != null ? 'pointer' : '';
      });
      return;
    }
    if (drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved < 4) return;
    goal = animFrom = null;
    if (drag.pan) {
      const k = 1 / (fit * cur.zoom);
      cur.tx = Math.min(b.x1, Math.max(b.x0, cur.tx - dx * k));
      cur.ty = Math.min(b.y1, Math.max(b.y0, cur.ty + dy * k));
    } else {
      cur.az = Math.min(AZ_MAX, Math.max(-AZ_MAX, cur.az - dx * 0.006));
      cur.pol = Math.min(POL_MAX, Math.max(POL_MIN, cur.pol - dy * 0.006));
    }
    invalidate();
  };
  const onUp = (e: PointerEvent): void => {
    if (!drag || drag.id !== e.pointerId) return;
    const wasClick = drag.moved < 4 && !drag.pan;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (wasClick) {
      const n = pick(e);
      if (n != null) init.onPick(n);
    }
  };
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rc = canvas.getBoundingClientRect();
    const before = cur.zoom;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, before * Math.exp(-e.deltaY * 0.0015)));
    // keep the depth under the pointer where it is
    const { padT, padB } = gutters();
    const midY = padT + (vh - padT - padB) / 2;
    const worldY = cur.ty - (e.clientY - rc.top - midY) / (fit * before);
    goal = animFrom = null;
    cur.zoom = next;
    cur.ty = Math.min(b.y1, Math.max(b.y0, worldY + (e.clientY - rc.top - midY) / (fit * next)));
    invalidate();
  };
  const onContext = (e: Event): void => e.preventDefault();
  const onLost = (e: Event): void => e.preventDefault();
  const onRestored = (): void => invalidate();
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContext);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const resize = (): void => {
    const w = Math.max(1, Math.floor(host.clientWidth));
    const hgt = Math.max(1, Math.floor(host.clientHeight));
    if (w === vw && hgt === vh) return;
    vw = w;
    vh = hgt;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(vw, vh, false);
    invalidate();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  fillLabels();
  paintSlabs();
  invalidate();

  return {
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.clear();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      for (const t of texs) t.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      svg.remove();
      layer.remove();
    },
    setSelected(n) {
      selected = n;
      paintSlabs();
      fillLabels();
      const lv = model.levels.find((l) => l.n === n);
      // when zoomed in, bring the level to the middle of the view
      if (lv && (goal?.zoom ?? cur.zoom) > 1.05) moveTo({ ty: (lv.y0 + lv.y1) / 2 });
      else invalidate();
    },
    setTier(t) {
      tier = t;
      fillLabels();
      invalidate();
    },
    setProjection(p: Projection) {
      cam = p === 'ortho' ? ortho : persp;
      invalidate();
    },
    frame(mode: FrameMode) {
      if (mode === 'whole') {
        moveTo({ az: AZ0, pol: POL0, zoom: 1, tx: home.x, ty: home.y });
        return;
      }
      const lo = model.lower;
      const { gL, gR, padT, padB } = gutters();
      const zoom = Math.min((vh - padT - padB) / ((lo.y1 - lo.y0) * fit), (vw - gL - gR) / ((lo.x1 - lo.x0) * fit));
      moveTo({ zoom, tx: (lo.x0 + lo.x1) / 2, ty: (lo.y0 + lo.y1) / 2 });
    },
    zoomBy(f) {
      moveTo({ zoom: (goal?.zoom ?? cur.zoom) * f });
    },
  };
}
