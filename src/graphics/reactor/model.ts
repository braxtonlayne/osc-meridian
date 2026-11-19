/**
 * @graphics/reactor: station electrical model.
 *
 * Everything a one-line diagram shows is derived here from the canon reactor
 * record (rating, status, statusNote), the canon facility record (class,
 * codename) and the canon diesel reserve (ENERGY-DIESEL, days of runtime).
 * Nothing is typed by hand per site: equipment ratings are picked from
 * standard size ladders against the derived load, so the eight installations
 * differ only because their canon ratings and status differ.
 */
import type { Canon, Facility, Reactor } from '@core/canon-types';

export type BreakerState = 'CLOSED' | 'OPEN';
export type StatusId = 'NOMINAL' | 'DEGRADED' | 'FAULT' | 'OFFLINE';
export type BusId = 'EA' | 'EB' | 'MV';
export type AtsPosition = 'NORMAL' | 'EMERGENCY';

export interface LoadDef {
  id: string;
  /** Feeder breaker tag, e.g. 52-EA1. */
  tag: string;
  label: string;
  bus: BusId;
  /** Design demand at the canon steady-state load, MW. */
  mw: number;
}

export interface Plant {
  reactor: Reactor;
  facility: Facility | null;
  isAlpha: boolean;
  /** Generator / switchgear voltage, kV. */
  mvKV: number;
  /** Essential bus voltage, kV. */
  essKV: number;
  /** Utility service voltage, kV. */
  utilKV: number;
  /** Station load as a fraction of rated electrical output. */
  loadFraction: number;
  /** Power limit quoted in the canon status note (percent rated thermal), if any. */
  limitPct: number | null;
  stationLoadMW: number;
  loads: LoadDef[];
  dgCount: number;
  dgRatingMW: number;
  dieselDays: number | null;
  surfaceMW: number;
  /** Station service transformer rating (each of T-1A / T-1B), MVA. */
  serviceMVA: number;
  tractionMVA: number;
  utilityMVA: number;
  drawing: { no: string; rev: string; date: string };
  /** Canon in-world date, formatted. */
  asOf: string;
}

export interface LiveInput {
  breakers?: Record<string, BreakerState>;
  loadMW?: number;
}

export interface Solved {
  breakers: Record<string, BreakerState>;
  genOnline: boolean;
  busA: boolean;
  busB: boolean;
  normA: boolean;
  normB: boolean;
  atsA: AtsPosition;
  atsB: AtsPosition;
  dgRunning: boolean[];
  edgBus: boolean;
  essA: boolean;
  essB: boolean;
  rail: boolean;
  /** Demand actually served per load id, MW (0 when its bus is dead or its breaker is open). */
  loadMW: Record<string, number>;
  totalMW: number;
  genMW: number;
  dieselMW: number;
  surfaceMW: number;
  utilityMW: number;
  /** MW per running diesel set. */
  dgEachMW: number;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/** FNV-1a, for small deterministic per-site variation (revision letter, drawing date). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function ladder(sizes: readonly number[], need: number): number {
  for (const s of sizes) if (s >= need) return s;
  return sizes[sizes.length - 1] ?? need;
}

const DG_SIZES = [0.5, 0.8, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;
const MVA_SIZES = [0.5, 0.75, 1, 1.5, 2, 2.5, 3.75, 5, 7.5, 10, 12, 15, 20, 25] as const;

/** Share of station load per feeder. ALPHA sites carry rail traction; BETA sites do not. */
const SHARES_ALPHA: readonly (readonly [string, string, BusId, number])[] = [
  ['life', 'LIFE SUPPORT', 'EA', 0.15],
  ['air', 'AIR HANDLING', 'EA', 0.24],
  ['aux', 'RX PLANT AUX', 'EA', 0.08],
  ['water', 'WATER SYSTEMS', 'EB', 0.11],
  ['comms', 'COMMUNICATIONS', 'EB', 0.1],
  ['light', 'LIGHTING', 'EB', 0.08],
  ['rail', 'RAIL TRACTION', 'MV', 0.24],
];
const SHARES_BETA: readonly (readonly [string, string, BusId, number])[] = [
  ['life', 'LIFE SUPPORT', 'EA', 0.19],
  ['air', 'AIR HANDLING', 'EA', 0.31],
  ['aux', 'RX PLANT AUX', 'EA', 0.1],
  ['water', 'WATER SYSTEMS', 'EB', 0.15],
  ['comms', 'COMMUNICATIONS', 'EB', 0.14],
  ['light', 'LIGHTING', 'EB', 0.11],
];

export function formatDate(iso: string, day?: number): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso);
  if (!m) return iso;
  const mon = MONTHS[Number(m[2]) - 1] ?? '';
  const d = m[3] ?? (day !== undefined ? String(day).padStart(2, '0') : null);
  return d ? `${d} ${mon} ${m[1]}` : `${mon} ${m[1]}`;
}

/** Drawing issue date: after commissioning, never later than April of the canon in-world year. */
function drawingDate(reactor: Reactor, inWorld: string): string {
  const c = /^(\d{4})-(\d{2})/.exec(reactor.commissioned);
  const w = /^(\d{4})-(\d{2})/.exec(inWorld);
  const h = hash(reactor.id + '/dwg');
  const start = c ? Number(c[1]) * 12 + (Number(c[2]) - 1) : 2004 * 12;
  const end = w ? Number(w[1]) * 12 + (Number(w[2]) - 2) : start;
  const span = Math.max(1, end - start);
  // Bias toward the recent end: drawings get reissued.
  const at = end - (h % Math.min(span, 9));
  const y = Math.floor(at / 12);
  const mo = at % 12;
  const day = 1 + ((h >>> 8) % 27);
  return `${String(day).padStart(2, '0')} ${MONTHS[mo] ?? 'JAN'} ${y}`;
}

export function buildPlant(canon: Canon, reactorId: string): Plant | null {
  const reactor = canon.reactors.find((r) => r.id === reactorId);
  if (!reactor) return null;
  const facility = canon.facilities.find((f) => f.id === reactor.site) ?? null;
  const isAlpha = (facility?.class ?? reactor.site.split('-')[0]) === 'ALPHA';
  const h = hash(reactor.id);

  const quoted = /(\d{1,3})% rated thermal power to station load/i.exec(reactor.statusNote);
  const limit = /limited to (\d{1,3})% rated/i.exec(reactor.statusNote);
  const limitPct = limit ? Number(limit[1]) : null;
  let loadFraction = quoted ? Number(quoted[1]) / 100 : 0.58 + (h % 13) / 100;
  if (limitPct !== null) loadFraction = Math.min(loadFraction, (limitPct - 6) / 100);

  const stationLoadMW = reactor.electricMWe * loadFraction;
  const shares = isAlpha ? SHARES_ALPHA : SHARES_BETA;
  const counters: Record<BusId, number> = { EA: 0, EB: 0, MV: 0 };
  const loads: LoadDef[] = shares.map(([id, label, bus, share]) => {
    counters[bus] += 1;
    const tag = bus === 'MV' ? '52-B3' : `52-${bus}${counters[bus]}`;
    return { id, tag, label, bus, mw: stationLoadMW * share };
  });

  // Ratings are sized against rated output, not today's load, so they do not move with status.
  const sumShare = (bus: BusId) => shares.filter((s) => s[2] === bus).reduce((a, s) => a + s[3], 0);
  const essRated = reactor.electricMWe * (sumShare('EA') + sumShare('EB')) * 0.75;
  const dgCount = isAlpha ? 3 : 2;
  const dgRatingMW = ladder(DG_SIZES, essRated / (dgCount - 1));
  const serviceMVA = ladder(MVA_SIZES, (reactor.electricMWe * Math.max(sumShare('EA'), sumShare('EB'))) / 0.85);
  const tractionMVA = ladder(MVA_SIZES, (reactor.electricMWe * 0.24) / 0.9);
  const surfaceMW = ladder(DG_SIZES, reactor.electricMWe * sumShare('EB') * 0.8);
  const utilityMVA = ladder(MVA_SIZES, reactor.electricMWe * 0.5);

  const mvKV = reactor.electricMWe >= 10 ? 13.8 : 4.16;
  const essKV = mvKV > 10 ? 4.16 : 0.48;
  const diesel = canon.reserves.items.find((i) => i.id === 'ENERGY-DIESEL');
  const short = reactor.id.replace(/^RX-/, '');

  return {
    reactor,
    facility,
    isAlpha,
    mvKV,
    essKV,
    utilKV: mvKV > 10 ? 34.5 : 12.47,
    loadFraction,
    limitPct,
    stationLoadMW,
    loads,
    dgCount,
    dgRatingMW,
    dieselDays: typeof diesel?.value === 'number' ? diesel.value : null,
    surfaceMW,
    serviceMVA,
    tractionMVA,
    utilityMVA,
    drawing: {
      no: `FE-E-${short}-0101`,
      rev: String.fromCharCode(67 + (h % 6)), // C..H
      date: drawingDate(reactor, canon.meta.inWorldDate),
    },
    asOf: formatDate(canon.meta.inWorldDate),
  };
}

/**
 * Resolve breaker positions and what is energized.
 * Defaults follow reactor status; `live.breakers` overrides any tag; ATS units
 * transfer on their own (normal source dead -> EMERGENCY) and diesels start
 * when any ATS is on EMERGENCY.
 */
export function solve(plant: Plant, live?: LiveInput): Solved {
  const on = plant.reactor.status === 'NOMINAL' || plant.reactor.status === 'DEGRADED';
  const over = live?.breakers ?? {};
  const br: Record<string, BreakerState> = {
    '52-G1': on ? 'CLOSED' : 'OPEN',
    '52-BT': 'CLOSED',
    '52-U1': 'OPEN',
    // Surface supply is held in reserve while the unit carries the station.
    '52-S1': on ? 'OPEN' : 'CLOSED',
    // With the unit off, essential bus A is shed from the switchgear and taken by diesel.
    '52-A1': on ? 'CLOSED' : 'OPEN',
    '52-B1': 'CLOSED',
  };
  for (const l of plant.loads) br[l.tag] = l.bus === 'MV' ? (on ? 'CLOSED' : 'OPEN') : 'CLOSED';
  for (const k of Object.keys(br)) {
    const o = over[k];
    if (o) br[k] = o;
  }
  const closed = (tag: string) => br[tag] === 'CLOSED';

  const genOnline = on && closed('52-G1');
  const utilOn = closed('52-U1');
  const surfOn = closed('52-S1');
  const tie = closed('52-BT');
  const srcA = genOnline;
  const srcB = utilOn || surfOn;
  const busA = srcA || (tie && srcB);
  const busB = srcB || (tie && srcA);

  const normA = busA && closed('52-A1');
  const normB = busB && closed('52-B1');
  const atsA: AtsPosition = normA ? 'NORMAL' : 'EMERGENCY';
  const atsB: AtsPosition = normB ? 'NORMAL' : 'EMERGENCY';
  const need = atsA === 'EMERGENCY' || atsB === 'EMERGENCY';

  const dgRunning: boolean[] = [];
  let edgBus = false;
  for (let i = 1; i <= plant.dgCount; i++) {
    const tag = `52-D${i}`;
    const o = over[tag];
    br[tag] = o ?? (need ? 'CLOSED' : 'OPEN');
    const run = need || o === 'CLOSED';
    dgRunning.push(run);
    if (run && br[tag] === 'CLOSED') edgBus = true;
  }

  const essA = atsA === 'NORMAL' ? normA : edgBus;
  const essB = atsB === 'NORMAL' ? normB : edgBus;
  const railLoad = plant.loads.find((l) => l.bus === 'MV');
  const rail = !!railLoad && busB && closed(railLoad.tag);

  const design = plant.loads.reduce((a, l) => a + l.mw, 0);
  const k = live?.loadMW !== undefined && design > 0 ? live.loadMW / design : 1;
  const loadMW: Record<string, number> = {};
  let mvSide = 0;
  let dieselMW = 0;
  for (const l of plant.loads) {
    const busLive = l.bus === 'EA' ? essA : l.bus === 'EB' ? essB : busB;
    const mw = busLive && closed(l.tag) ? l.mw * k : 0;
    loadMW[l.id] = mw;
    const onDiesel = (l.bus === 'EA' && atsA === 'EMERGENCY') || (l.bus === 'EB' && atsB === 'EMERGENCY');
    if (onDiesel) dieselMW += mw;
    else mvSide += mw;
  }
  // One source is shown carrying the switchgear: unit first, then utility, then surface supply.
  const genFeeds = genOnline && (busA || busB);
  const genMW = genFeeds ? mvSide : 0;
  const utilityMW = !genFeeds && utilOn ? mvSide : 0;
  const surfaceMW = !genFeeds && !utilOn && surfOn ? mvSide : 0;
  const online = dgRunning.filter((r, i) => r && br[`52-D${i + 1}`] === 'CLOSED').length;

  return {
    breakers: br,
    genOnline,
    busA,
    busB,
    normA,
    normB,
    atsA,
    atsB,
    dgRunning,
    edgBus,
    essA,
    essB,
    rail,
    loadMW,
    totalMW: mvSide + dieselMW,
    genMW,
    dieselMW,
    surfaceMW,
    utilityMW,
    dgEachMW: online > 0 ? dieselMW / online : 0,
  };
}

export function fmtMW(mw: number): string {
  return mw.toFixed(2);
}

export function fmtKV(kv: number): string {
  return kv < 1 ? `${Math.round(kv * 1000)} V` : `${kv} kV`;
}

/** Wrap text to a column of `cols` characters (monospace, so exact). */
export function wrap(text: string, cols: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    if (line && line.length + 1 + word.length > cols) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out;
}
