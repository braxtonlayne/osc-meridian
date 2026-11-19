/**
 * Facility telemetry simulator (Web Worker). Owner: registry app; reserves may consume it.
 *
 * Readings are a pure function of (site seed, time): slow, bounded drift around a set point
 * derived from canon (posted staff, berthing, reactor rating and status). Nothing ever drifts
 * out of its normal band; this is a quiet plant on an ordinary day.
 *
 * Protocol (main -> worker):
 *   { type: 'config', sites: SiteSeed[], intervalMs?: number }   replace the watched set
 *   { type: 'history', id: string, end: number, span: number, step: number }   backfill
 *   { type: 'stop' }
 * Protocol (worker -> main):
 *   { type: 'frame', t: number, readings: Record<string, Reading> }   every intervalMs
 *   { type: 'history', id: string, samples: Reading[] }
 * Times are Unix seconds (real clock); the caller maps them onto the in-world date.
 */

export type ClassId = 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';
export type UnitStatus = 'NOMINAL' | 'DEGRADED' | 'FAULT' | 'OFFLINE';
export type PortalState = 'SEALED' | 'CYCLING';

export interface SiteSeed {
  id: string;
  cls: ClassId;
  staff: number;
  capacity: number;
  /** Reactor plant, when the site has one and the caller may show it. */
  reactor?: {
    id: string;
    status: UnitStatus;
    /** Rated electrical output, MW. */
    mwe: number;
    /** Steady station load from the plant model, MW. */
    loadMW: number;
    /** Steady thermal power, percent of rated. */
    thermalPct: number;
    /** Essential bus voltage, kV. */
    essKV: number;
  };
  /** Hour offset of site local time from UTC (for the day/night occupancy swing). */
  utcOffset?: number;
}

export interface Portal {
  tag: string;
  label: string;
  state: PortalState;
}

export interface Reading {
  t: number;
  power: {
    source: 'REACTOR UNIT' | 'DIESEL AND SURFACE' | 'UTILITY SERVICE';
    loadMW: number;
    busKV: number;
    hz: number;
    /** Percent rated thermal; null when the site has no unit. */
    thermalPct: number | null;
    diesel: 'STANDBY' | 'RUNNING';
  };
  air: { o2Pct: number; co2ppm: number; tempC: number; rhPct: number; overPa: number; filterDpPa: number };
  water: { storagePct: number; flowGph: number; supplyPsi: number };
  seal: { portals: Portal[]; lastCycleS: number };
}

/* ------------------------------------------------------------ helpers */

/** FNV-1a 32-bit. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const unit = (h: number): number => (h % 100000) / 100000;

/**
 * Smooth bounded wander in [-1, 1]: three incommensurate slow sines with per-channel phases.
 * Periods are minutes to hours, so a 2 s frame moves a reading by a hair.
 */
export function wander(key: string, t: number): number {
  const h = hash(key);
  const p1 = unit(h) * Math.PI * 2;
  const p2 = unit(h >>> 7) * Math.PI * 2;
  const p3 = unit(h >>> 13) * Math.PI * 2;
  const v = 0.5 * Math.sin(t / 431 + p1) + 0.3 * Math.sin(t / 1373 + p2) + 0.2 * Math.sin(t / 5527 + p3);
  return Math.max(-1, Math.min(1, v));
}

/** Occupancy factor 0.75 .. 1.0 over the site day: day shift up, night shift down. */
export function occupancy(t: number, utcOffset = -5): number {
  const hour = (((t / 3600 + utcOffset) % 24) + 24) % 24;
  return 0.875 + 0.125 * Math.sin(((hour - 8) / 24) * Math.PI * 2);
}

const round = (v: number, d: number): number => {
  const k = 10 ** d;
  return Math.round(v * k) / k;
};

const PORTALS: Record<ClassId, { tag: string; label: string }[]> = {
  ALPHA: [
    { tag: 'P-1', label: 'Personnel portal' },
    { tag: 'P-2', label: 'Vehicle portal' },
    { tag: 'P-3', label: 'Rail terminal portal' },
  ],
  BETA: [
    { tag: 'P-1', label: 'Personnel portal' },
    { tag: 'P-2', label: 'Vehicle portal' },
  ],
  GAMMA: [{ tag: 'P-1', label: 'Personnel portal' }],
  DELTA: [],
};

/** Personnel portal cycle: every 9 to 15 minutes (per site), 40 s through the lock. */
export function portalCycle(id: string, t: number): { cycling: boolean; lastCycleS: number } {
  const period = 540 + (hash(id + ':cycle') % 361);
  const offset = hash(id + ':phase') % period;
  const into = (((t - offset) % period) + period) % period;
  return { cycling: into < 40, lastCycleS: Math.floor(into) };
}

/* ------------------------------------------------------------ model */

export function sample(s: SiteSeed, t: number): Reading {
  const w = (ch: string): number => wander(`${s.id}:${ch}`, t);
  const occ = occupancy(t, s.utcOffset ?? -5);

  // Power
  let power: Reading['power'];
  const rx = s.reactor;
  if (rx && rx.status !== 'OFFLINE' && rx.status !== 'FAULT') {
    const load = rx.loadMW * (0.97 + 0.03 * occ) * (1 + 0.012 * w('load'));
    power = {
      source: 'REACTOR UNIT',
      loadMW: round(load, 2),
      busKV: round(rx.essKV * (1 + 0.004 * w('kv')), 3),
      hz: round(60 + 0.015 * w('hz'), 3),
      thermalPct: round(rx.thermalPct + 0.5 * w('th'), 1),
      diesel: 'STANDBY',
    };
  } else if (rx) {
    // Unit shut down: station carried on diesel and surface supply at reduced load.
    const load = rx.loadMW * 0.55 * (0.97 + 0.03 * occ) * (1 + 0.015 * w('load'));
    power = {
      source: 'DIESEL AND SURFACE',
      loadMW: round(load, 2),
      busKV: round(rx.essKV * (1 + 0.006 * w('kv')), 3),
      hz: round(60 + 0.03 * w('hz'), 3),
      thermalPct: 0,
      diesel: 'RUNNING',
    };
  } else {
    const kw = 40 + s.staff * 3.5 + s.capacity * 0.35;
    power = {
      source: 'UTILITY SERVICE',
      loadMW: round((kw / 1000) * (0.95 + 0.05 * occ) * (1 + 0.02 * w('load')), 3),
      busKV: round(0.48 * (1 + 0.005 * w('kv')), 3),
      hz: round(60 + 0.02 * w('hz'), 3),
      thermalPct: null,
      diesel: 'STANDBY',
    };
  }

  // Air: positive pressure, filtered, a little CO2 with the day shift.
  const air = {
    o2Pct: round(20.9 + 0.04 * w('o2'), 2),
    co2ppm: Math.round(520 + 260 * (occ - 0.75) * 4 * 0.5 + 35 * w('co2')),
    tempC: round(20.8 + 0.6 * w('temp'), 1),
    rhPct: round(43 + 3 * w('rh'), 1),
    overPa: round(30 + 2.5 * w('dp'), 1),
    filterDpPa: Math.round(185 + 12 * w('filter')),
  };

  // Water: storage drawn down and topped up on a six-hour cycle, never below 86%.
  const cyc = (((t + (hash(s.id + ':water') % 21600)) % 21600) + 21600) % 21600;
  const saw = cyc < 18000 ? 1 - cyc / 18000 : (cyc - 18000) / 3600;
  const water = {
    storagePct: round(87 + 9 * saw + 0.4 * w('lvl'), 1),
    flowGph: round(Math.max(1, s.staff) * 1.65 * occ * (1 + 0.06 * w('flow')), 1),
    supplyPsi: round(62 + 1.5 * w('psi'), 1),
  };

  // Seals: every portal sealed; the personnel portal passes people through its lock.
  const pc = portalCycle(s.id, t);
  const portals: Portal[] = PORTALS[s.cls].map((p, i) => ({ ...p, state: i === 0 && pc.cycling ? 'CYCLING' : 'SEALED' }));

  return { t, power, air, water, seal: { portals, lastCycleS: pc.lastCycleS } };
}

/** Samples ending at `end`, `span` seconds back, every `step` seconds (oldest first). */
export function history(s: SiteSeed, end: number, span: number, step: number): Reading[] {
  const n = Math.max(1, Math.floor(span / step));
  const out: Reading[] = [];
  for (let i = n; i >= 0; i--) out.push(sample(s, end - i * step));
  return out;
}

/* ------------------------------------------------------------ worker */

export type TelemetryIn =
  | { type: 'config'; sites: SiteSeed[]; intervalMs?: number }
  | { type: 'history'; id: string; end: number; span: number; step: number }
  | { type: 'stop' };

export type TelemetryOut =
  | { type: 'frame'; t: number; readings: Record<string, Reading> }
  | { type: 'history'; id: string; samples: Reading[] };

interface WorkerScope {
  postMessage(m: TelemetryOut): void;
  addEventListener(type: 'message', fn: (e: MessageEvent<TelemetryIn>) => void): void;
}

const scope = globalThis as unknown as WorkerScope & { document?: unknown; importScripts?: unknown };

if (typeof scope.importScripts === 'function' || (typeof scope.document === 'undefined' && typeof (globalThis as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined')) {
  let sites: SiteSeed[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  const frame = (): void => {
    const t = Date.now() / 1000;
    const readings: Record<string, Reading> = {};
    for (const s of sites) readings[s.id] = sample(s, t);
    scope.postMessage({ type: 'frame', t, readings });
  };
  scope.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'config') {
      sites = m.sites;
      if (timer) clearInterval(timer);
      timer = setInterval(frame, Math.max(500, m.intervalMs ?? 2000));
      frame();
    } else if (m.type === 'history') {
      const s = sites.find((x) => x.id === m.id);
      if (s) scope.postMessage({ type: 'history', id: m.id, samples: history(s, m.end, m.span, m.step) });
    } else if (m.type === 'stop') {
      if (timer) clearInterval(timer);
      timer = null;
      sites = [];
    }
  });
}
