/**
 * Facility Video: pure logic. The camera index (canon cameras, recorder units and channels),
 * the access rules per account, which door, hoist and platform each camera looks at, and what a
 * camera shows at any wall-clock moment given the shared plant state. No DOM, no signals: the
 * same inputs give the same picture state in every tab and every account, live or in playback.
 */
import canonJson from '@canon';
import type { Canon, CameraDef, DoorDef, FacilityId, TierNo } from '@core/canon-types';
import type { CctvCanon } from '@core/canon-apps/cctv';
import type { HoistCanon } from '@core/canon-apps/hoist';
import type { MusterCanon } from '@core/canon-apps/muster';
import type { AccountDef, DrillState, IsolationState } from '@core/contracts';
import { isRx } from '@core/rx';
import { isolatedAt as isolationAt, isolationPeriods } from '@apps/isolate/state';
import type { DoorRecord, DoorsState } from '@apps/doors/types';
import type { HoistState, HoistUnit } from '@apps/hoist/types';
import type { MusterState } from '@apps/muster/types';
import type { DispatchRecord } from '@apps/dispatch/types';
import type { DrillStateExt, SitePlan } from '@apps/drill/types';
import type { Seg04Window } from '@narrative/seg04';
import { runState, type SimModel } from '@sim/transit-model';
import { zoneForSite, type Zone } from '@sim/time';
import { buildScene, passagesBetween, passersAt, presetScene, sceneKindFor, type FrameInput, type LightMode, type Scene, type SceneKind, type SceneSpec, type TrainView } from '@graphics/cctv';
import type { CctvState, PtzRecord, PtzView, RecordGap } from './types';

export const canon = canonJson as unknown as Canon;
const apps = canon.apps as Record<string, unknown>;
export const CC = apps.cctv as CctvCanon;
const HOIST_CANON = apps.hoist as HoistCanon | undefined;
const MUSTER_CANON = apps.muster as MusterCanon | undefined;

/* ------------------------------------------------------------ index */

export type SiteClass = 'ALPHA' | 'BETA' | 'GAMMA';

export interface CamEntry {
  id: string;
  facility: FacilityId;
  cls: SiteClass;
  level: number;
  /** Level label for the tree ("Level 11: Rail Terminal ..."), or "Level 7" when the name is withheld. */
  levelLabel: string;
  location: string;
  kind: CameraDef['kind'];
  ptz: boolean;
  tier: TierNo;
  unit: string;
  channel: number;
  scene: SceneKind;
  spec: SceneSpec;
  /** Burned-in title. */
  osd: string;
  /** A recorder channel with no camera record (no entry in the camera schedule). */
  unassigned: boolean;
}

export interface SiteEntry {
  facility: FacilityId;
  cls: SiteClass;
  label: string;
  zone: Zone;
  units: string[];
  cams: CamEntry[];
  levels: { n: number; label: string }[];
}

const short = (f: string) => `${f[0]}${f.slice(-2)}`; // ALPHA-02 -> A02

function levelLabelOf(fac: FacilityId, cls: SiteClass, n: number): string {
  if (cls === 'ALPHA') {
    const L = canon.facilities.find((f) => f.id === fac)?.levels?.find((l) => l.n === n);
    if (!L || isRx(L.name)) return `Level ${n}`;
    return L.name;
  }
  const t = canon.templateLevels[cls]?.find((l) => l.n === n);
  return t ? `Level ${n}: ${t.name}` : `Level ${n}`;
}

function platformNo(location: string): string | undefined {
  return /platform (\d+)/i.exec(location)?.[1];
}

function hoistSign(fac: FacilityId, location: string, level: number): string {
  const h = /H(\d)/.exec(location)?.[1];
  const hoist = h ? canon.hoists.find((x) => x.id === `${short(fac)}-H${h}`) : undefined;
  return hoist ? String(hoist.stops[0]?.level ?? level) : String(level);
}

function entryFor(fac: FacilityId, cls: SiteClass, c: CameraDef, i: number): CamEntry {
  const per = CC.recorder.channelsPerUnit;
  const scene = sceneKindFor(c.kind, c.location);
  const labels: SceneSpec['labels'] = {};
  if (scene === 'lobby') labels.level = String(c.level);
  if (scene === 'platform') labels.platform = platformNo(c.location) ?? '1';
  if (scene === 'hoist') labels.sign = hoistSign(fac, c.location, c.level);
  return {
    id: c.id,
    facility: fac,
    cls,
    level: c.level,
    levelLabel: levelLabelOf(fac, cls, c.level),
    location: c.location,
    kind: c.kind,
    ptz: c.ptz,
    tier: c.tier,
    unit: `DVR-${short(fac)}-${Math.floor(i / per) + 1}`,
    channel: (i % per) + 1,
    scene,
    spec: { id: c.id, kind: c.kind, location: c.location, level: c.level, labels },
    osd: `${c.id} ${c.location.toUpperCase()}`.slice(0, 30),
    unassigned: false,
  };
}

function buildIndex(): SiteEntry[] {
  const out: SiteEntry[] = [];
  for (const s of canon.cameras) {
    const fac = s.facility;
    const cls = fac.split('-')[0] as SiteClass;
    if (cls !== 'ALPHA' && cls !== 'BETA' && cls !== 'GAMMA') continue;
    const f = canon.facilities.find((x) => x.id === fac);
    const cams = s.cameras.map((c, i) => entryFor(fac, cls, c, i));
    const u = CC.unassigned;
    if (u.facility === fac) {
      const unitNo = Number(u.unit.split('-').pop());
      const i = (unitNo - 1) * CC.recorder.channelsPerUnit + (u.channel - 1);
      cams.push({
        id: `${u.unit}/${String(u.channel).padStart(2, '0')}`,
        facility: fac,
        cls,
        level: Number(u.placard),
        levelLabel: '',
        location: '',
        kind: u.scene === 'hoist' ? 'hoist' : 'corridor',
        ptz: false,
        tier: 4,
        unit: u.unit,
        channel: u.channel,
        scene: u.scene,
        spec: { id: `${u.unit}-${u.channel}`, kind: u.scene === 'hoist' ? 'hoist' : 'corridor', location: '', level: Number(u.placard), labels: { sign: u.placard, level: u.placard }, scene: u.scene },
        osd: u.osdTitle,
        unassigned: true,
      });
      void i;
    }
    const units = [...new Set(cams.map((c) => c.unit))];
    const levels = [...new Set(cams.filter((c) => !c.unassigned).map((c) => c.level))].sort((a, b) => a - b).map((n) => ({ n, label: levelLabelOf(fac, cls, n) }));
    out.push({ facility: fac, cls, label: f?.codename && !isRx(f.codename) ? `${fac}` : fac, zone: zoneForSite(fac, f?.anchor?.state), units, cams, levels });
  }
  return out;
}

export const SITES: SiteEntry[] = buildIndex();
export const CAM_BY_ID = new Map<string, CamEntry>(SITES.flatMap((s) => s.cams.map((c) => [c.id, c] as const)));
export const SITE_BY_ID = new Map<string, SiteEntry>(SITES.map((s) => [s.facility, s]));
/** Cameras in canon (the unassigned channel is not one). */
export const CAMERA_COUNT = canon.cameras.reduce((n, s) => n + s.cameras.length, 0);

/** Recorder channels of a unit, 1..channelsPerUnit, with the camera on each (or null). */
export function unitChannels(site: SiteEntry, unit: string): { channel: number; cam: CamEntry | null }[] {
  const out: { channel: number; cam: CamEntry | null }[] = [];
  for (let ch = 1; ch <= CC.recorder.channelsPerUnit; ch++) out.push({ channel: ch, cam: site.cams.find((c) => c.unit === unit && c.channel === ch) ?? null });
  return out;
}

/* ------------------------------------------------------------ access */

export interface Access {
  /** Shown in the camera tree at all. */
  listed: boolean;
  allowed: boolean;
  /** May recall presets and steer (PTZ cameras only). */
  steer: boolean;
  reason?: string;
  requirement?: string;
  reference?: string;
  /** Basis for an allowed view at another site, for the status bar. */
  basis?: string;
}

export interface Viewer {
  def: AccountDef;
  /** Effective tier (2 when acting). */
  tier: TierNo;
  compartments: readonly string[];
}

/** Whether a site appears in this account's camera tree. Tier 4 sees only its own site. */
export function siteListed(v: Viewer, facility: string): boolean {
  return v.def.tier < 4 || facility === v.def.site;
}

/** The access rule, decided per camera (docs: OSC-DIR-0474 para 5). */
export function accessFor(v: Viewer, cam: CamEntry): Access {
  const own = cam.facility === v.def.site;
  if (!siteListed(v, cam.facility)) return { listed: false, allowed: false, steer: false };
  const rules = CC.docs.rules;
  // A recorder channel with no camera record has no line in the access table.
  if (cam.unassigned) return { listed: true, allowed: true, steer: false, basis: 'no access entry' };
  if (v.tier > cam.tier) {
    return {
      listed: true,
      allowed: false,
      steer: false,
      reason: `Camera ${cam.id} views a level held at Tier ${cam.tier}. Video from it is not displayed to an operator below that tier.`,
      requirement: `Tier ${cam.tier} access determination. Reference ${rules}.`,
      reference: rules,
    };
  }
  if (own) return { listed: true, allowed: true, steer: cam.ptz && !v.def.auditReader, basis: v.def.auditReader ? 'own site, review access' : 'own site' };
  if (v.def.auditReader) return { listed: true, allowed: true, steer: false, basis: 'assurance review' };
  if (v.tier <= 2) return { listed: true, allowed: true, steer: cam.ptz, basis: `Tier ${v.tier}` };
  if (v.compartments.includes('SEXTANT')) return { listed: true, allowed: true, steer: false, basis: 'SEXTANT' };
  if (cam.cls === 'ALPHA' && (cam.kind === 'portal' || cam.kind === 'platform')) return { listed: true, allowed: true, steer: false, basis: 'hub portal and platform feeds' };
  return {
    listed: true,
    allowed: false,
    steer: false,
    reason: `Video from ${cam.facility} interior cameras is not repeated to operators outside the site without a network geography briefing.`,
    requirement: `SEXTANT compartment briefing. Reference ${rules}.`,
    reference: rules,
  };
}

/* ------------------------------------------------------------ time */

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Fractional local hour at a site. */
export function localHour(ms: number, zone: Zone): number {
  const d = new Date(ms + zone.offsetH * 3600_000);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

/** The recorder's burned-in stamp: in-world date, site-local time ("05-19-2008 17:14:07"). */
export function dvrStamp(ms: number, zone: Zone): string {
  const iso = canon.meta.inWorldDate;
  const d = new Date(ms + zone.offsetH * 3600_000);
  return `${iso.slice(5, 7)}-${iso.slice(8, 10)}-${iso.slice(0, 4)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** "1714:07" local, for lists. */
export function hhmmss(ms: number, zone: Zone): string {
  const d = new Date(ms + zone.offsetH * 3600_000);
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function inWindow(h: number, from: number, to: number): boolean {
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

/** Chance that a camera's activity slot holds a passage, from the site-local hour. */
export function activityRate(cam: CamEntry, ms: number, zone: Zone): number {
  const a = CC.activity;
  const h = localHour(ms, zone);
  const night = inWindow(h, a.nightFromLocal, a.nightToLocal);
  const shift = a.shiftChangesLocal.some((s) => Math.abs(((h - s + 36) % 24) - 12) > 12 - a.shiftWindowMin / 60);
  if (shift) return a.shiftRate;
  if (cam.kind === 'assembly' && a.mealsLocal.some((m) => inWindow(h, m.from, m.to))) return a.shiftRate;
  return night ? a.nightRate : a.dayRate;
}

export function activityParams(cam: CamEntry): { slotSec: number; walkMps: number; cartMps: number; cartShare: number } {
  const a = CC.activity;
  return { slotSec: a.slotSec.find((s) => s.kind === cam.kind)?.sec ?? 120, walkMps: a.walkMps, cartMps: a.cartMps, cartShare: a.cartShare };
}

function seatedAt(cam: CamEntry, ms: number, zone: Zone): number {
  if (cam.kind !== 'assembly') return 0;
  const a = CC.activity;
  const h = localHour(ms, zone);
  if (a.mealsLocal.some((m) => inWindow(h, m.from, m.to))) return a.seatedMeal;
  if (inWindow(h, a.nightFromLocal, a.nightToLocal)) return a.seatedNight;
  return a.seatedDay;
}

/* ------------------------------------------------------------ doors */

/** The doors a camera looks at: `primary` nearest the camera, `secondary` behind it. */
export function doorsForCamera(cam: CamEntry, siteDoors: readonly DoorDef[], platformServes?: string): { primary?: DoorDef; secondary?: DoorDef } {
  const at = siteDoors.filter((d) => d.level === cam.level);
  const loc = cam.location.toLowerCase();
  const find = (fn: (d: DoorDef) => boolean) => at.find(fn);
  switch (cam.scene) {
    case 'platform': {
      let d: DoorDef | undefined;
      if (platformServes === 'SEG04') d = find((x) => /segment 04/i.test(x.location));
      else if (platformServes && /^(ALPHA)-/.test(platformServes)) {
        const seg = canon.railSegments.find((s) => (s.a === cam.facility && s.b === platformServes) || (s.b === cam.facility && s.a === platformServes));
        d = seg ? find((x) => x.location.toLowerCase().includes(`segment ${seg.no}`)) : undefined;
      } else d = find((x) => /tram/i.test(x.location) && /portal/i.test(x.location));
      return { secondary: d };
    }
    case 'vault':
      return { primary: find((x) => x.location.toLowerCase().startsWith(loc)) };
    case 'airlock':
      return { primary: find((x) => x.kind === 'airlock' && /outer/i.test(x.location)) };
    case 'portal': {
      const portal = find((x) => x.location.toLowerCase().startsWith(loc));
      const words = loc.split(/[\s,]+/).filter((w) => !['head', 'portal', 'door', 'level', 'vestibule'].includes(w) && !/^\d+$/.test(w));
      let blast = find((x) => x.kind === 'blast' && !/tunnel/i.test(x.location) && words.some((w) => x.location.toLowerCase().includes(w)));
      if (!blast && /blast door (\d)/i.test(cam.location)) blast = find((x) => x.location.toLowerCase().startsWith(loc.replace(' vestibule', '')));
      if (!blast) blast = find((x) => x.kind === 'blast' && /portal blast/i.test(x.location));
      return { primary: blast, secondary: portal };
    }
    case 'generator':
    case 'ahu':
    case 'depot':
      return { primary: find((x) => /plant|depot road|plant room/i.test(x.location)) };
    case 'lobby':
      return {};
    default:
      return {};
  }
}

/** Leaf open fraction from a doors record (copied rule from the doors key's header). */
function openFractionOf(rec: DoorRecord, now: number): number {
  let i = 0;
  for (let k = 0; k < rec.steps.length; k++) if (rec.steps[k]!.from <= now) i = k;
  const step = rec.steps[i]!;
  const next = rec.steps[i + 1];
  const t = next ? Math.min(1, Math.max(0, (now - step.from) / Math.max(1, next.from - step.from))) : 1;
  switch (step.pos) {
    case 'open':
      return 1;
    case 'opening':
      return t;
    case 'closing':
      return 1 - t;
    default:
      return 0;
  }
}

/** Where a door stands at `t`, from the doors key, the drill and canon. */
export function doorOpenAt(door: DoorDef, facility: string, t: number, doors: DoorsState | null, drill: DrillState | null): number {
  const rec = doors?.doors?.[door.id];
  if (rec && rec.steps.length) {
    const first = rec.steps[0]!;
    if (t >= first.from) return openFractionOf(rec, t);
    if (first.pos === 'opening' || first.pos === 'unlocking') return 0;
    if (first.pos === 'closing') return 1;
  }
  const normal = door.normal === 'open' ? 1 : 0;
  // The doors app writes drill schedules into the key; if it has not run since the drill was
  // ordered, seal doors at a sealing or sealed site read as closing from the acknowledgement.
  if (drill && door.sealsOnDrill && normal === 1 && doors?.drill?.id !== drill.id) {
    const s = drillSiteAt(drill, facility, t);
    if (s && (s.status === 'sealing' || s.status === 'sealed') && s.ackAt !== null) {
      const closeEnd = s.ackAt + door.cycleSec * 1000 * drillTimeFactor(drill);
      let f = t >= closeEnd ? 0 : 1 - Math.max(0, (t - s.ackAt) / Math.max(1, closeEnd - s.ackAt));
      if (drill.endedAt !== null && t >= drill.endedAt) f = Math.min(1, f + (t - drill.endedAt) / (door.cycleSec * 1000 * drillTimeFactor(drill)));
      return f;
    }
  }
  return normal;
}

/* ------------------------------------------------------------ drill */

function drillTimeFactor(drill: DrillState): number {
  return 1 / (canon.sealDrill.timeScale || 1) / ((drill as Partial<DrillStateExt>).msPerMin ? 1 : 1);
}

const EPS = 1e-6;
function statusFromPlan(p: SitePlan, m: number): DrillState['sites'][string]['status'] {
  if (p.ack !== null && m >= p.ack - EPS) {
    if (p.sealed !== null && m >= p.sealed - EPS) return 'sealed';
    if (m >= p.deadline - EPS) return 'no-report';
    if (p.doorsDone === null) return 'acknowledged';
    return 'sealing';
  }
  if (m >= p.deadline - EPS) return 'no-report';
  return 'pending';
}

/** A site's drill status at `t` (from the drill's plan when it carries one), with its acknowledgement time. */
export function drillSiteAt(drill: DrillState, facility: string, t: number): { status: DrillState['sites'][string]['status']; ackAt: number | null } | null {
  if (t < drill.orderedAt) return null;
  const site = drill.sites[facility];
  if (!site) return null;
  const ext = drill as Partial<DrillStateExt>;
  const plan = ext.plan?.[facility];
  const msPerMin = ext.msPerMin;
  if (drill.endedAt !== null && t >= drill.endedAt) return { status: site.status, ackAt: site.acknowledged };
  if (plan && msPerMin) {
    const m = (t - drill.orderedAt) / msPerMin;
    const ackAt = plan.ack !== null ? drill.orderedAt + plan.ack * msPerMin : null;
    return { status: statusFromPlan(plan, m), ackAt };
  }
  const acked = site.acknowledged !== null && t >= site.acknowledged;
  const sealed = site.sealed !== null && t >= site.sealed;
  return { status: sealed ? 'sealed' : acked ? (site.status === 'acknowledged' ? 'acknowledged' : 'sealing') : site.status === 'no-report' ? 'no-report' : 'pending', ackAt: site.acknowledged };
}

/** Drill alarm input on the site's recorders (acknowledged and not stood down). */
export function drillAlarm(drill: DrillState | null, facility: string, t: number): boolean {
  if (!drill) return false;
  if (drill.endedAt !== null && t >= drill.endedAt) return false;
  const s = drillSiteAt(drill, facility, t);
  return !!s && (s.status === 'acknowledged' || s.status === 'sealing' || s.status === 'sealed');
}

/* ------------------------------------------------------------ isolation */

export function isolatedAt(iso: IsolationState | null, journal: CctvState['journal'], t: number, now: number): boolean {
  // Past moments: the recorder's journal of link changes. Now: the isolation key itself.
  if (t >= now - 1500) return isolationAt(iso, t);
  let v: number | null = null;
  for (const j of journal) if (j.k === 'iso' && j.at <= t) v = j.v;
  if (v !== null) return v === 1;
  return false;
}

/* ------------------------------------------------------------ trains */

/** What a platform camera's platform serves (rail neighbour, "SEG04", "tram"). */
export function platformServes(cam: CamEntry): string {
  if (cam.cls !== 'ALPHA') return 'tram';
  return CC.platforms.find((p) => p.camera === cam.id)?.serves ?? 'tram';
}

function tramPlatforms(facility: string): string[] {
  return CC.platforms.filter((p) => p.camera.startsWith(short(facility)) && p.serves === 'tram').map((p) => p.camera);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

/** True when a train to or from `neighbour` over `link` uses this camera's platform. */
export function platformUsedBy(cam: CamEntry, neighbour: string, link: string): boolean {
  const serves = platformServes(cam);
  if (serves === 'SEG04') return link === '04';
  if (link === '04') return false;
  if (serves !== 'tram') return serves === neighbour;
  if (/^\d\d$/.test(link)) return false; // rail legs never use tram platforms
  if (cam.cls !== 'ALPHA') return true;
  const list = tramPlatforms(cam.facility);
  return list[hashStr(neighbour) % list.length] === cam.id;
}

/** The consist at a platform camera at `t` from dispatched trains, or null. */
export function dispatchTrainAt(cam: CamEntry, t: number, recs: readonly DispatchRecord[], model: SimModel, plant: { isolation: IsolationState | null; drill: DrillState | null }): TrainView | null {
  const D = 40; // metres of platform road from the stop mark to the tunnel mouth, near enough for every scene
  const T = CC.trains.approachSec * 1000;
  for (const rec of recs) {
    if (rec.status === 'cancelled' && rec.endNode !== cam.facility) continue;
    if (!rec.route.includes(cam.facility)) continue;
    if (!rec.clock || !Array.isArray(rec.holds)) continue;
    let st;
    try {
      st = runState(model, rec, plant, t);
    } catch {
      continue;
    }
    const legs = st.legs;
    if (!legs.length) continue;
    if (st.atNode === cam.facility) {
      const l = legs[Math.min(st.leg, legs.length - 1)]!;
      const departing = l.from === cam.facility && st.elapsed <= l.start;
      const nb = departing ? l.to : l.from;
      if (!platformUsedBy(cam, nb, l.link)) continue;
      const boarding = departing && st.status === 'scheduled' && rec.departAt - t > CC.trains.boardingMin * 60_000;
      if (boarding) continue;
      return { d: 0, lamps: departing, lit: !rec.instruction };
    }
    if (st.onLink) {
      const l = legs[st.leg]!;
      const into = st.elapsed - l.start;
      const left = l.end - st.elapsed;
      if (l.from === cam.facility && into < T && platformUsedBy(cam, l.to, l.link)) return { d: D * (into / T) ** 2 * 1.6, lamps: true, lit: !rec.instruction };
      if (l.to === cam.facility && left < T && platformUsedBy(cam, l.from, l.link)) return { d: D * (left / T) ** 2 * 1.6, lamps: true, lit: !rec.instruction };
    }
  }
  return null;
}

/* ------------------------------------------------------------ hoist */

interface Collar {
  hoistId: string;
  depthFt: number;
}

/** The hoist and landing depth a hoist camera looks at. */
export function hoistForCamera(cam: CamEntry): Collar | null {
  if (cam.unassigned) {
    const h = canon.hoists.find((x) => x.id === CC.unassigned.hoist);
    const v = HOIST_CANON?.sumpVanes.find((x) => x.hoist === CC.unassigned.hoist);
    if (!h || !v) return null;
    const bottom = h.stops[h.stops.length - 1]!.depthFt;
    return { hoistId: h.id, depthFt: bottom + v.belowBottomFt };
  }
  const n = /H(\d)/.exec(cam.location)?.[1];
  const h = n ? canon.hoists.find((x) => x.id === `${short(cam.facility)}-H${n}`) : undefined;
  return h ? { hoistId: h.id, depthFt: h.stops[0]!.depthFt } : null;
}

function defaultDepth(hoistId: string): number | null {
  const h = canon.hoists.find((x) => x.id === hoistId);
  if (!h) return null;
  const stop = h.kind === 'personnel' ? (h.stops[1] ?? h.stops[0]!) : h.kind === 'egress' ? h.stops[0]! : h.stops[h.stops.length - 1]!;
  return stop.depthFt;
}

/** Cage position for a unit at `t` (coarse: stationary, running, or arrived). */
function cageDepth(u: HoistUnit, t: number): { ft: number; moving: boolean } {
  const m = u.motion;
  if (!m) return { ft: u.posFt, moving: false };
  if (t < m.startedAt) return { ft: m.fromFt, moving: false };
  if (m.kind === 'run') {
    const dist = Math.abs(m.toFt - m.fromFt);
    const total = dist / Math.max(0.1, m.vFtps) + m.vFtps / Math.max(0.1, m.aFtps2) + m.creepFt / Math.max(0.1, m.creepFtps);
    if ((t - m.startedAt) / 1000 >= total) return { ft: m.toFt, moving: false };
    return { ft: m.fromFt, moving: true };
  }
  const tStop = Math.abs(m.v0) / Math.max(0.1, m.decel);
  const s = Math.min((t - m.startedAt) / 1000, tStop);
  const d = Math.abs(m.v0) * s - 0.5 * m.decel * s * s;
  return { ft: m.fromFt + Math.sign(m.v0) * d, moving: s < tStop };
}

export function cageAt(cam: CamEntry, t: number, hoist: HoistState | null): FrameInput['cage'] {
  const c = hoistForCamera(cam);
  if (!c) return null;
  const u = hoist?.units?.[c.hoistId];
  const pos = u ? cageDepth(u, t) : { ft: defaultDepth(c.hoistId) ?? -1, moving: false };
  const present = !pos.moving && Math.abs(pos.ft - c.depthFt) < 2;
  return { present, gateOpen: present && u?.gates === 'open' ? 1 : 0 };
}

/* ------------------------------------------------------------ muster */

/** Start of the latest muster at a site still in hand at `t` (operator run or drill muster). */
export function musterStart(facility: string, t: number, muster: MusterState | null, drill: DrillState | null): number | null {
  let best: number | null = null;
  for (const r of muster?.runs ?? []) {
    if (r.site !== facility || r.startedAt > t) continue;
    if (r.closeout && r.closeout.at <= t) continue;
    if (best === null || r.startedAt > best) best = r.startedAt;
  }
  if (drill && (drill.endedAt === null || t < drill.endedAt)) {
    const s = drillSiteAt(drill, facility, t);
    if (s?.ackAt !== null && s?.ackAt !== undefined && s.ackAt <= t && (best === null || s.ackAt > best)) best = s.ackAt;
  }
  return best;
}

function musterCrowd(cam: CamEntry, t: number, start: number | null): number {
  if (start === null || cam.kind !== 'assembly') return 0;
  const site = canon.musterPoints.find((m) => m.facility === cam.facility);
  const word = cam.location.toLowerCase().replace(/^level \d+ /, '');
  const point = site?.points.find((p) => p.location.toLowerCase().includes(word) || word.includes(p.location.toLowerCase()));
  if (!point) return 0;
  const cls = canon.sealDrill.classes.find((c) => c.classId === cam.cls);
  const ramp = ((cls?.sealMin ?? 1) * 60_000) / (canon.sealDrill.timeScale || 1);
  return Math.round(point.assigned * Math.min(1, Math.max(0, (t - start) / ramp)));
}

/** Persons standing at the out-of-service reader on the muster camera's platform. */
function readerCrowd(cam: CamEntry, t: number, start: number | null): number {
  const mc = CC.musterCamera;
  if (cam.id !== mc.camera || start === null) return 0;
  const reads = (MUSTER_CANON?.unknownBadges ?? []).filter((u) => u.reader === mc.reader).map((u) => (u.atMin * 60_000) / (canon.sealDrill.timeScale || 1));
  if (!reads.length) return 0;
  const first = start + Math.min(...reads);
  const leave = first + mc.leaveAfterMin * 60_000;
  if (t < first || t > leave) return 0;
  return Math.min(mc.standing, reads.filter((r) => start + r <= t).length);
}

/* ------------------------------------------------------------ PTZ */

export function presetsFor(cam: CamEntry): { n: number; name: string; yaw: number; pitch: number; zoom: number }[] {
  if (!cam.ptz) return [];
  const fam = presetScene(cam.scene);
  return CC.presets.find((p) => p.scene === fam)?.list ?? [];
}

export const HOME: PtzView = { yaw: 0, pitch: 0, zoom: 1 };

/** The view a camera has at `t` (moves interpolate; off-HOME cameras park after parkMin). */
export function viewAt(cam: CamEntry, rec: PtzRecord | undefined, t: number): { view: PtzView; preset: number; moving: boolean } {
  const presets = presetsFor(cam);
  const home = presets[0] ? { yaw: presets[0].yaw, pitch: presets[0].pitch, zoom: presets[0].zoom } : HOME;
  if (!rec || !cam.ptz) return { view: home, preset: 1, moving: false };
  const moveMs = CC.recorder.ptzMoveSec * 1000;
  const parkAt = rec.at + CC.recorder.parkMin * 60_000;
  if (rec.preset !== 1 && t >= parkAt) {
    const k = Math.min(1, (t - parkAt) / moveMs);
    return { view: lerpView(rec, home, k), preset: k >= 1 ? 1 : rec.preset, moving: k < 1 };
  }
  if (t < rec.at) return { view: rec.from, preset: 0, moving: false };
  const k = Math.min(1, (t - rec.at) / moveMs);
  return { view: lerpView(rec.from, rec, k), preset: rec.preset, moving: k < 1 };
}

function lerpView(a: PtzView, b: PtzView, k: number): PtzView {
  const e = k * k * (3 - 2 * k);
  return { yaw: a.yaw + (b.yaw - a.yaw) * e, pitch: a.pitch + (b.pitch - a.pitch) * e, zoom: a.zoom + (b.zoom - a.zoom) * e };
}

/** Clamp a hand-steered view to the head's travel. */
export function clampView(v: PtzView): PtzView {
  return { yaw: Math.max(-90, Math.min(90, v.yaw)), pitch: Math.max(-45, Math.min(20, v.pitch)), zoom: Math.max(1, Math.min(CC.recorder.zoomMax, v.zoom)) };
}

/* ------------------------------------------------------------ seg04 */

export const SEG04_NEAR = CC.seg04.nearCamera;
export const SEG04_FAR = CC.seg04.farCamera;

function seg04View(cam: CamEntry, t: number, w: Seg04Window | null, holdMs: number): { train: TrainView | null; door: number | null; standby: boolean } | null {
  if (!w || (cam.id !== SEG04_NEAR && cam.id !== SEG04_FAR)) return null;
  if (t < w.start || t > w.end + holdMs) return null;
  const T = CC.seg04.approachSec * 1000;
  const D = 40;
  if (cam.id === SEG04_FAR) {
    // the consist leaves platform 7 as the first block lights
    const into = t - w.start;
    if (into > T * 1.4) return { train: null, door: Math.max(0, 1 - (into - T * 1.4) / T), standby: true };
    return { train: { d: D * (into / T) ** 2 * 1.6, lamps: true, lit: false }, door: 1, standby: true };
  }
  const lead = CC.seg04.doorLeadSec * 1000;
  const door = t < w.end - lead ? 0 : Math.min(1, (t - (w.end - lead)) / (lead * 0.6));
  if (t < w.end - T) return { train: null, door, standby: true };
  const left = Math.max(0, w.end - t);
  return { train: { d: D * (left / T) ** 2 * 1.6, lamps: t < w.end, lit: false }, door, standby: true };
}

/* ------------------------------------------------------------ frame */

export interface PlantView {
  isolation: IsolationState | null;
  drill: DrillState | null;
  dispatch: readonly DispatchRecord[];
  doors: DoorsState | null;
  hoist: HoistState | null;
  muster: MusterState | null;
  cctv: CctvState;
  seg04: Seg04Window | null;
  seg04HoldMs: number;
  model: SimModel;
}

export interface CamFrame {
  /** null = draw a picture; otherwise the channel shows this message. */
  blank: string[] | null;
  input: FrameInput;
  tags: string[];
  /** For the status bar and event list. */
  alarm: boolean;
  preset: number;
}

export function siteDoorsOf(facility: string): DoorDef[] {
  return canon.doors.find((s) => s.facility === facility)?.doors ?? [];
}

/** Daylight 0..1 at a site from the local hour (twilight over an hour either side). */
export function daylight(ms: number, zone: Zone): number {
  const h = localHour(ms, zone);
  const up = Math.min(1, Math.max(0, h - 5.5));
  const down = Math.min(1, Math.max(0, 20.5 - h));
  return Math.min(up, down);
}

/**
 * Everything a camera shows at wall-clock `t`. `now` is the live instant (playback passes an
 * earlier `t`). `viewerSite` is the account's own site: other sites drop out while isolated.
 */
export function frameFor(cam: CamEntry, scene: Scene, t: number, now: number, p: PlantView, viewerSite: string, playback: boolean): CamFrame {
  const site = SITE_BY_ID.get(cam.facility)!;
  const zone = site.zone;
  const v = viewAt(cam, p.cctv.ptz[cam.id], t);
  const alarm = drillAlarm(p.drill, cam.facility, t);
  const tags: string[] = [];
  if (playback) tags.push('PB');
  else tags.push('REC');
  if (alarm) tags.push('ALM 1');
  const input: FrameInput = {
    view: v.view,
    lights: 'normal',
    daylight: daylight(t, zone),
    doors: { primary: null, secondary: null },
    train: null,
    cage: null,
    passers: [],
    seated: 0,
    standing: 0,
  };
  const frame: CamFrame = { blank: null, input, tags, alarm, preset: v.preset };
  if (cam.facility !== viewerSite && isolatedAt(p.isolation, p.cctv.journal, t, now)) {
    frame.blank = ['NO LINK', `${cam.unit} not reachable`];
    return frame;
  }
  if (playback && gapAt(p.cctv.gaps, cam.id, t)) {
    frame.blank = ['NO RECORDED VIDEO'];
    return frame;
  }
  const h = localHour(t, zone);
  const a = CC.activity;
  input.lights = cam.scene === 'platform' && platformServes(cam) === 'SEG04' ? 'standby' : inWindow(h, a.nightFromLocal, a.nightToLocal) && cam.kind === 'corridor' ? 'night' : 'normal';
  const doors = doorsForCamera(cam, siteDoorsOf(cam.facility), cam.kind === 'platform' ? platformServes(cam) : undefined);
  if (doors.primary) input.doors.primary = doorOpenAt(doors.primary, cam.facility, t, p.doors, p.drill);
  if (doors.secondary) input.doors.secondary = doorOpenAt(doors.secondary, cam.facility, t, p.doors, p.drill);
  if (cam.kind === 'platform') {
    input.train = dispatchTrainAt(cam, t, p.dispatch, p.model, { isolation: p.isolation, drill: p.drill });
    const s4 = seg04View(cam, t, p.seg04, p.seg04HoldMs);
    if (s4) {
      if (s4.train) input.train = s4.train;
      if (s4.door !== null) input.doors.secondary = Math.max(input.doors.secondary ?? 0, s4.door);
      if (s4.standby) input.lights = 'standby';
    }
  }
  if (cam.kind === 'hoist') input.cage = cageAt(cam, t, p.hoist);
  input.passers = passersAt(scene, t, activityParams(cam), rateFn(cam));
  input.seated = seatedAt(cam, t, zone);
  const mStart = musterStart(cam.facility, t, p.muster, p.drill);
  input.standing = musterCrowd(cam, t, mStart) + readerCrowd(cam, t, mStart);
  if (input.standing && cam.kind === 'assembly') input.seated = Math.min(input.seated, 2);
  return frame;
}

/** Passer-by rate function for a camera (0 on the unassigned channel). */
export function rateFn(cam: CamEntry): (ms: number) => number {
  const zone = SITE_BY_ID.get(cam.facility)!.zone;
  return (ms: number) => (cam.unassigned ? 0 : activityRate(cam, ms, zone));
}

export function gapAt(gaps: readonly RecordGap[], camera: string, t: number): RecordGap | null {
  return gaps.find((g) => g.camera === camera && t >= g.from && t <= g.to) ?? null;
}

/* ------------------------------------------------------------ events */

export interface RecEvent {
  at: number;
  kind: 'MOTION' | 'ALARM IN' | 'DOOR' | 'CONSIST' | 'LINK' | 'GAP' | 'PTZ' | 'CAGE';
  text: string;
}

/**
 * The recorder's event list for one camera between `from` and `to`: motion (from the passer-by
 * schedule), alarm input (drill), door movements, consists, link loss, record gaps, PTZ moves.
 */
export function eventsFor(cam: CamEntry, from: number, to: number, p: PlantView, motion: number[]): RecEvent[] {
  const out: RecEvent[] = [];
  for (const m of motion) out.push({ at: m, kind: 'MOTION', text: 'Motion detected' });
  if (p.drill) {
    const s = drillSiteAt(p.drill, cam.facility, to);
    if (s?.ackAt && s.ackAt >= from && s.ackAt <= to) out.push({ at: s.ackAt, kind: 'ALARM IN', text: `Alarm input 1 (seal alarm) ${p.drill.id}` });
    if (p.drill.endedAt && p.drill.endedAt >= from && p.drill.endedAt <= to && s) out.push({ at: p.drill.endedAt, kind: 'ALARM IN', text: 'Alarm input 1 restored' });
  }
  const doors = doorsForCamera(cam, siteDoorsOf(cam.facility), cam.kind === 'platform' ? platformServes(cam) : undefined);
  for (const d of [doors.primary, doors.secondary]) {
    if (!d) continue;
    for (const st of p.doors?.doors?.[d.id]?.steps ?? []) {
      if (st.from >= from && st.from <= to && (st.pos === 'opening' || st.pos === 'closing' || st.pos === 'closed-locked' || st.pos === 'open')) out.push({ at: st.from, kind: 'DOOR', text: `${d.id} ${st.pos.toUpperCase()}` });
    }
  }
  if (cam.kind === 'platform') {
    // sample the platform once every 20 s for arrivals and departures
    let had = false;
    for (let t = from; t <= to; t += 20_000) {
      const tr = dispatchTrainAt(cam, t, p.dispatch, p.model, { isolation: p.isolation, drill: p.drill });
      const has = !!tr && tr.d < 30;
      if (has !== had) out.push({ at: t, kind: 'CONSIST', text: has ? 'Consist at platform' : 'Platform clear' });
      had = has;
    }
  }
  // Hub link changes at the times the isolation record gives (initiation, restoration), not when a
  // recorder window happened to notice them.
  if (cam.facility !== undefined) {
    for (const per of isolationPeriods(p.isolation, to)) {
      if (per.from >= from && per.from <= to) out.push({ at: per.from, kind: 'LINK', text: 'Hub link lost (network isolation)' });
      if (per.to !== null && per.to > per.from && per.to >= from && per.to <= to) out.push({ at: per.to, kind: 'LINK', text: 'Hub link restored' });
    }
  }
  for (const g of p.cctv.gaps) if (g.camera === cam.id && g.from <= to && g.to >= from) out.push({ at: g.from, kind: 'GAP', text: g.note });
  const ptz = p.cctv.ptz[cam.id];
  if (ptz && ptz.at >= from && ptz.at <= to) out.push({ at: ptz.at, kind: 'PTZ', text: ptz.preset ? `Preset ${ptz.preset} recalled` : 'Manual move' });
  return out.sort((a, b) => a.at - b.at);
}

/* ------------------------------------------------------------ misc */

const SCENES = new Map<string, Scene>();
/** The built scene for a camera (cached; scenes are pure functions of the camera record). */
export function sceneOf(cam: CamEntry): Scene {
  let s = SCENES.get(cam.id);
  if (!s) {
    s = buildScene(cam.spec);
    SCENES.set(cam.id, s);
  }
  return s;
}

/** Motion events (passage starts) on a camera between two instants. */
export function motionBetween(cam: CamEntry, from: number, to: number): number[] {
  return passagesBetween(sceneOf(cam), from, to, activityParams(cam), rateFn(cam));
}

export function fpsFor(layout: 1 | 4 | 9 | 16): number {
  return CC.recorder.fps.find((f) => f.layout === layout)?.fps ?? 2;
}

/** Light mode words for the details pane. */
export const LIGHT_WORD: Record<LightMode, string> = { normal: 'Normal', night: 'Night', standby: 'Standby', off: 'Off' };

/** Still number "VS-08-00012". */
export function stillNo(serial: number): string {
  return `${CC.stillPrefix}-${String(serial).padStart(5, '0')}`;
}
