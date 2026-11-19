/**
 * @graphics/depth3d: the parametric site model.
 *
 * One model for every ALPHA site. Every depth (level tops, heights, the terminal floor,
 * the scale) is read from canon. The only constants in this file are horizontal
 * proportions and surface-building heights, which canon does not hold; the drawing says
 * so in its title block ("Horizontal extents schematic").
 *
 * Coordinates are in feet: x to the right, y up (0 = grade, depths are negative y),
 * z toward the viewer. The section (cut) plane is z = 0; the rock in front of it is
 * removed and the works are shown whole.
 *
 * No three.js import here: this file is shared by the 3D scene, the 2D elevation and
 * the level index, and must stay in the small (non-lazy) part of the module.
 */
import canonJson from '@canon';
import type { Canon, Facility, FacilityLevel, RailSegment, TierNo } from '@core/canon-types';
import { isRx, rxInfo } from '@core/rx';

const canon = canonJson as unknown as Canon;

/** Horizontal proportions (feet). Not canon: schematic, identical for all sites. */
export const PLAN = {
  rockHalfW: 480,
  rockDepth: 300, // z extent of the retained rock behind the cut plane
  rockBelowFt: 90, // rock shown beneath the terminal floor
  slabX0: -330,
  slabX1: 120,
  slabZ: 120, // slabs span z = -slabZ .. +slabZ
  upperX0: -420,
  upperX1: -180,
  upperZ: 80,
  shaftX0: -390,
  shaftX1: -330,
  shaftZ: 30,
  termX0: -400,
  termX1: 400,
  termZ0: -120,
  termZ1: 170,
  rampX0: 180,
  rampX1: 380,
  rampZ0: -20,
  rampZ1: 40,
  rampGrade: 1 / 6,
  rampThickFt: 8,
  boreStub: 60, // how far a bore runs past the rock face before it is broken off
  railBore: { w: 34, h: 26 },
  tramBore: { w: 26, h: 20 },
  scaleX: -580, // depth scale axis
} as const;

export interface Box {
  x0: number;
  x1: number;
  /** y of the underside and the top, feet above grade (negative = below). */
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface LevelModel extends Box {
  n: number;
  /** Canon name, complete ("Level 6: Administration and Secretariat Offices"). */
  name: string;
  /** Canon name without the "Level N:" prefix. Empty when the client canon withholds it. */
  short: string;
  /** Length of the short name, also when withheld (sizes the redaction bar). */
  shortLen: number;
  /** The client canon carries only a redaction sentinel for this name (src/core/rx.ts). */
  redacted: boolean;
  topFt: number;
  heightFt: number;
  floorFt: number;
  tier: TierNo;
  notes: string;
  /** Part of the group of levels directly under the surface (above the long shaft). */
  upper: boolean;
  terminal: boolean;
}

export interface BoreModel extends Box {
  kind: 'rail' | 'tram';
  side: -1 | 1;
  /** Annotation text, built from canon rail segments / tram networks. */
  label: string;
  inService: boolean;
}

export interface RampLeg {
  xa: number;
  ya: number;
  xb: number;
  yb: number;
}

export interface CoverBox extends Box {
  label: string;
}

export interface Callout {
  label: string;
  x: number;
  y: number;
  z: number;
}

export interface DepthTick {
  ft: number;
  /** 500 ft marks draw longer. */
  major: boolean;
  /** The canon depth of the site, drawn at the terminal floor. */
  canon: boolean;
}

export interface SiteModel {
  id: string;
  codename: string | null;
  terrain: string | null;
  coverIdentity: string | null;
  depthFt: number;
  levels: LevelModel[];
  terminal: LevelModel;
  /** True when the terminal floor (top + height) equals facility.depthFt. */
  floorMatchesCanon: boolean;
  cover: CoverBox[];
  shaft: Box;
  ramp: { legs: RampLeg[]; z0: number; z1: number; thick: number };
  bores: BoreModel[];
  rock: Box;
  ticks: DepthTick[];
  /** Whole-drawing extents, feet. */
  bounds: { x0: number; x1: number; y0: number; y1: number };
  /** Extents of the levels below the long shaft, including the terminal and bore stubs. */
  lower: { x0: number; x1: number; y0: number; y1: number };
  /** Callouts for the two access ways, anchored in the long shaft between the upper works and the lower levels. */
  callouts: { shaft: Callout; decline: Callout };
  /** Name of the division that keeps the drawing, if canon has one. */
  drawingOffice: string | null;
}

export const fmtFt = (n: number): string => n.toLocaleString('en-US');

/**
 * A level name is withheld when its tier is more restricted than the session's (1 = most
 * restricted), or when the client canon does not carry it at all (redaction sentinel).
 */
export const isWithheld = (level: { tier: number; redacted?: boolean }, sessionTier: number): boolean =>
  !!level.redacted || level.tier < sessionTier;

export function alphaSiteIds(): string[] {
  return canon.facilities.filter((f) => f.class === 'ALPHA' && (f.levels?.length ?? 0) > 0).map((f) => f.id);
}

/** Deterministic small variation for the cover buildings (not a depth; not canon). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function coverBoxes(f: Facility, surface: FacilityLevel | undefined): CoverBox[] {
  const raw = (surface?.name ?? '').replace(/^Level\s+\d+:\s*/i, '').replace(/^Surface:\s*/i, '');
  const names = raw
    .split(/\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: CoverBox[] = [];
  let x = PLAN.upperX0 + 10;
  names.slice(0, 3).forEach((label, i) => {
    const r = hash(f.id + label);
    const w = i === 0 ? 150 + Math.round(r * 40) : 60 + Math.round(r * 30);
    const h = i === 0 ? 20 + Math.round(r * 8) : 12 + Math.round(r * 6);
    const d = i === 0 ? 110 : 60;
    out.push({ label, x0: x, x1: x + w, y0: 0, y1: h, z0: -40 - d, z1: -40 });
    x += w + 28;
  });
  // Lift head house over the shaft and a portal structure at the head of the decline.
  out.push({ label: 'Lift head', x0: PLAN.shaftX0 - 12, x1: PLAN.shaftX1 + 12, y0: 0, y1: 30, z0: -PLAN.shaftZ - 8, z1: PLAN.shaftZ + 8 });
  out.push({ label: 'Vehicle portal', x0: PLAN.rampX0 - 44, x1: PLAN.rampX0 + 16, y0: 0, y1: 16, z0: PLAN.rampZ0 - 10, z1: PLAN.rampZ1 + 10 });
  return out;
}

function segmentLabel(seg: RailSegment, other: string): string {
  const base = `SEG ${seg.no}  ${other}  ${fmtFt(seg.miles)} mi`;
  return seg.status === 'IN REVENUE SERVICE' ? base : `${base}  ${seg.status}`;
}

const cache = new Map<string, SiteModel | null>();

export function buildSiteModel(facilityId: string): SiteModel | null {
  const hit = cache.get(facilityId);
  if (hit !== undefined) return hit;
  const model = build(facilityId);
  cache.set(facilityId, model);
  return model;
}

function build(facilityId: string): SiteModel | null {
  const f = canon.facilities.find((x) => x.id === facilityId);
  if (!f || !f.levels || f.levels.length < 2 || f.depthFt == null) return null;
  const src = [...f.levels].sort((a, b) => a.topFt - b.topFt);

  // The "upper works" are the levels directly under the surface; the long shaft is the
  // largest vertical gap between consecutive levels.
  let gapAt = 1;
  let gap = -1;
  for (let i = 1; i < src.length; i++) {
    const prev = src[i - 1]!;
    const g = src[i]!.topFt - (prev.topFt + prev.heightFt);
    if (g > gap) {
      gap = g;
      gapAt = i;
    }
  }
  const lastIdx = src.length - 1;

  const levels: LevelModel[] = src.map((l, i) => {
    const upper = i < gapAt;
    const terminal = i === lastIdx;
    const floorFt = l.topFt + l.heightFt;
    const plan = terminal
      ? { x0: PLAN.termX0, x1: PLAN.termX1, z0: PLAN.termZ0, z1: PLAN.termZ1 }
      : upper
        ? { x0: PLAN.upperX0, x1: PLAN.upperX1, z0: -PLAN.upperZ, z1: PLAN.upperZ }
        : { x0: PLAN.slabX0, x1: PLAN.slabX1, z0: -PLAN.slabZ, z1: PLAN.slabZ };
    const rx = rxInfo(l.name);
    const short = rx ? '' : l.name.replace(/^Level\s+\d+:\s*/i, '');
    return {
      n: l.n,
      name: rx ? `Level ${l.n}` : l.name,
      short,
      shortLen: rx ? Math.max(1, rx.len - `Level ${l.n}: `.length) : short.length,
      redacted: !!rx,
      topFt: l.topFt,
      heightFt: l.heightFt,
      floorFt,
      tier: l.tier,
      notes: rx || isRx(l.notes) ? '' : l.notes,
      upper,
      terminal,
      ...plan,
      y0: -floorFt,
      y1: -l.topFt,
    };
  });
  const terminal = levels[lastIdx]!;
  const upperFloor = Math.max(...levels.filter((l) => l.upper).map((l) => l.floorFt));
  const firstLower = levels.find((l) => !l.upper) ?? terminal;

  const shaft: Box = { x0: PLAN.shaftX0, x1: PLAN.shaftX1, y0: -terminal.topFt, y1: -upperFloor, z0: -PLAN.shaftZ, z1: PLAN.shaftZ };

  // Vehicle decline: switchback legs from grade to the top of the terminal.
  const run = PLAN.rampX1 - PLAN.rampX0;
  const nLegs = Math.max(1, Math.round(terminal.topFt / (run * PLAN.rampGrade)));
  const drop = terminal.topFt / nLegs;
  const legs: RampLeg[] = [];
  for (let i = 0; i < nLegs; i++) {
    const even = i % 2 === 0;
    legs.push({
      xa: even ? PLAN.rampX0 : PLAN.rampX1,
      ya: -i * drop,
      xb: even ? PLAN.rampX1 : PLAN.rampX0,
      yb: -(i + 1) * drop,
    });
  }

  // Maglev bores: one per inter-hub rail segment at this site, alternating sides in
  // segment order. The regional tram bore takes the side with fewer rail bores.
  const segs = canon.railSegments.filter((s) => s.a === f.id || s.b === f.id).sort((a, b) => a.no.localeCompare(b.no));
  const perSide: Record<'-1' | '1', number> = { '-1': 0, '1': 0 };
  const bores: BoreModel[] = [];
  const rockX0 = -PLAN.rockHalfW;
  const rockX1 = PLAN.rockHalfW;
  const place = (side: -1 | 1, kind: 'rail' | 'tram', label: string, inService: boolean): void => {
    const slot = perSide[String(side) as '-1' | '1']++;
    const dim = kind === 'rail' ? PLAN.railBore : PLAN.tramBore;
    const zc = 32 + slot * 46;
    bores.push({
      kind,
      side,
      label,
      inService,
      x0: side < 0 ? rockX0 - PLAN.boreStub : terminal.x1,
      x1: side < 0 ? terminal.x0 : rockX1 + PLAN.boreStub,
      y0: -terminal.floorFt + 2,
      y1: -terminal.floorFt + 2 + dim.h,
      z0: zc - dim.w / 2,
      z1: zc + dim.w / 2,
    });
  };
  segs.forEach((s, i) => place(i % 2 === 0 ? -1 : 1, 'rail', segmentLabel(s, s.a === f.id ? s.b : s.a), s.status === 'IN REVENUE SERVICE'));
  for (const net of canon.tramNetworks.filter((nw) => nw.hubs.includes(f.id))) {
    place(perSide['1'] <= perSide['-1'] ? 1 : -1, 'tram', `TRAM  ${net.name}`, true);
  }

  const rock: Box = { x0: rockX0, x1: rockX1, y0: -(terminal.floorFt + PLAN.rockBelowFt), y1: 0, z0: -PLAN.rockDepth, z1: 0 };

  const ticks: DepthTick[] = [];
  for (let ft = 0; ft <= f.depthFt; ft += 100) ticks.push({ ft, major: ft % 500 === 0, canon: ft === f.depthFt });
  if (f.depthFt % 100 !== 0) ticks.push({ ft: f.depthFt, major: true, canon: true });

  const cover = coverBoxes(f, f.levels.find((l) => l.n === 0));
  const coverTop = Math.max(...cover.map((c) => c.y1));
  const fe = canon.divisions.find((d) => d.id === 'FE');

  return {
    id: f.id,
    codename: f.codename,
    terrain: f.terrain,
    coverIdentity: f.coverIdentity,
    depthFt: f.depthFt,
    levels,
    terminal,
    floorMatchesCanon: terminal.floorFt === f.depthFt,
    cover,
    shaft,
    ramp: { legs, z0: PLAN.rampZ0, z1: PLAN.rampZ1, thick: PLAN.rampThickFt },
    bores,
    rock,
    ticks,
    bounds: { x0: PLAN.scaleX - 10, x1: rockX1 + PLAN.boreStub + 10, y0: rock.y0, y1: coverTop + 16 },
    lower: { x0: rockX0 - PLAN.boreStub, x1: rockX1 + PLAN.boreStub, y0: rock.y0, y1: -firstLower.topFt + 40 },
    callouts: {
      shaft: { label: 'Lift shaft', x: shaft.x1, y: -(upperFloor + firstLower.topFt) / 2, z: shaft.z1 },
      decline: { label: `Vehicle decline, 1 in ${Math.round(1 / PLAN.rampGrade)}`, x: PLAN.rampX1, y: -(upperFloor + firstLower.topFt) / 2, z: PLAN.rampZ1 },
    },
    drawingOffice: fe ? fe.name : null,
  };
}

/**
 * Spread label positions so that none is closer than `gap` to its neighbour while
 * staying as near as possible to where each wants to be (pool-adjacent-violators),
 * then clamp the run into [lo, hi]. Input order must be ascending by desired position.
 */
export function spreadLabels(desired: number[], gap: number, lo: number, hi: number): number[] {
  const n = desired.length;
  if (n === 0) return [];
  // Work on d_i - i*gap, which must be non-decreasing; merge violating blocks to their mean.
  const blocks: { sum: number; count: number }[] = [];
  for (let i = 0; i < n; i++) {
    blocks.push({ sum: desired[i]! - i * gap, count: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1]!;
      const a = blocks[blocks.length - 2]!;
      if (a.sum / a.count <= b.sum / b.count) break;
      a.sum += b.sum;
      a.count += b.count;
      blocks.pop();
    }
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.count; k++) out.push(b.sum / b.count + out.length * gap);
  const span = (n - 1) * gap;
  if (hi - lo <= span) return out.map((_, i) => lo + i * gap);
  for (let i = n - 1, cap = hi; i >= 0; i--, cap -= gap) if (out[i]! > cap) out[i] = cap;
  for (let i = 0, floor = lo; i < n; i++, floor += gap) if (out[i]! < floor) out[i] = floor;
  return out;
}

/** Which depth ticks carry a number at a given drawing scale (px per foot). */
export function tickLabelStep(pxPerFt: number): number {
  const px100 = pxPerFt * 100;
  return px100 >= 13 ? 100 : px100 >= 6.5 ? 200 : 500;
}

/** Title block lines, shared by the 3D overlay and the 2D elevation. */
export function titleBlock(m: SiteModel): string[] {
  const lines = [`${m.id}${m.codename ? '  ' + m.codename : ''}`, 'DEPTH SECTION'];
  if (m.drawingOffice) lines.push(m.drawingOffice);
  lines.push(`Terminal floor ${fmtFt(m.depthFt)} ft below grade`);
  lines.push('Depths per site record.');
  lines.push('Horizontal extents schematic.');
  return lines;
}
