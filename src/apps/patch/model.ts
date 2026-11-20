/**
 * Hub Circuit Patch Panel: pure model. Bays, jacks, cords, circuit service, lamps, line
 * quality figures, tests, the dial plan and the hub link summary. No DOM, no services.
 * Every figure comes from the canon fragment (content/canon/apps/patch.json) or canon.
 */
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { PatchCanon, PatchCircuit, PatchDesk, PatchRingdown } from '@core/canon-apps/patch';
import type {
  CordPurpose,
  HubLinkState,
  HubLinkSummary,
  JackId,
  PatchCord,
  PatchState,
  TestKind,
  TestResult,
} from './types';

const canon = canonJson as unknown as Canon;
export const PC = canon.apps.patch as PatchCanon;
export const CIRCUITS: readonly PatchCircuit[] = PC.circuits;
const byId = new Map(CIRCUITS.map((c) => [c.id, c]));

export function circuit(id: string): PatchCircuit | undefined {
  return byId.get(id);
}

export const HUBS: readonly string[] = canon.facilities
  .filter((f) => f.class === 'ALPHA')
  .map((f) => f.id)
  .sort();

/** Circuit whose pair is live although the register carries it as not assigned. */
export const LIVE_UNASSIGNED = 'T04-SP1';

export const EMPTY: PatchState = { v: 1, cords: [], tests: [], calls: [], links: {}, serial: 1, updatedAt: 0 };

/* ------------------------------------------------------------------ sites and bays */

/** "ALPHA-03" -> "A03". */
export function siteCode(site: string): string {
  return site.charAt(0) + (site.split('-')[1] ?? '');
}

/** Bays with patching: every ALPHA hub, plus any site named (an account's own terminal block). */
export function baySites(extra?: string): string[] {
  const out = [...HUBS];
  if (extra && !out.includes(extra) && CIRCUITS.some((c) => c.b === extra)) out.push(extra);
  return out;
}

const CLASS_ORDER: Record<PatchCircuit['class'], number> = { trunk: 0, network: 1, local: 2 };

/** Circuits terminating in a bay, in jack-field order (trunks, network, local). */
export function circuitsAt(site: string): PatchCircuit[] {
  return CIRCUITS.filter((c) => c.a === site || c.b === site).sort(
    (x, y) => CLASS_ORDER[x.class] - CLASS_ORDER[y.class] || (x.class === 'network' ? 0 : x.id.localeCompare(y.id)),
  );
}

export function farEnd(c: PatchCircuit, site: string): string | null {
  if (c.b === null) return null;
  return c.a === site ? c.b : c.a;
}

export function interSite(c: PatchCircuit): boolean {
  return c.class !== 'local';
}

export type Utility = 'TST' | 'OPR' | 'MON' | 'LB';
export const UTILITY_LABEL: Record<Utility, string> = { TST: 'TEST SET', OPR: 'OPR POSN', MON: 'MONITOR', LB: 'LOOP PLUG' };

/** Utility jacks in a bay. A terminal block (not a hub) has a test set and a handset only. */
export function utilitiesAt(site: string): Utility[] {
  return HUBS.includes(site) ? ['TST', 'OPR', 'MON', 'LB'] : ['TST', 'OPR'];
}

export interface ParsedJack {
  circuit?: PatchCircuit;
  side?: 'L' | 'E';
  util?: Utility;
}

export function parseJack(j: JackId): ParsedJack {
  const [left, right] = j.split('/');
  if (right === 'L' || right === 'E') return { circuit: byId.get(left ?? ''), side: right };
  if (right === 'TST' || right === 'OPR' || right === 'MON' || right === 'LB') return { util: right };
  return {};
}

export function jackLabel(j: JackId): string {
  const p = parseJack(j);
  if (p.util) return UTILITY_LABEL[p.util];
  if (p.circuit) return `${p.circuit.id} ${p.side === 'L' ? 'LINE' : 'EQPT'}`;
  return j;
}

/** True if the jack belongs to the bay. */
export function jackInBay(site: string, j: JackId): boolean {
  const p = parseJack(j);
  if (p.util) return j.split('/')[0] === siteCode(site) && utilitiesAt(site).includes(p.util);
  return !!p.circuit && (p.circuit.a === site || p.circuit.b === site);
}

export function cordsAt(s: PatchState | null, site: string): PatchCord[] {
  return (s?.cords ?? []).filter((c) => c.site === site);
}

export function cordOn(s: PatchState | null, site: string, j: JackId): PatchCord | undefined {
  return cordsAt(s, site).find((c) => c.a === j || c.b === j);
}

export function otherEnd(cord: PatchCord, j: JackId): JackId {
  return cord.a === j ? cord.b : cord.a;
}

/* ------------------------------------------------------------------ cord classification */

export type Classified = { ok: true; purpose: CordPurpose; circuits: PatchCircuit[] } | { ok: false; text: string };

/** What a cord between two jacks would be, or why the bay will not take it. */
export function classifyCord(site: string, a: JackId, b: JackId): Classified {
  if (a === b) return { ok: false, text: 'Both plugs cannot go into one jack.' };
  if (!jackInBay(site, a) || !jackInBay(site, b)) return { ok: false, text: 'Both jacks must be in the same bay.' };
  const pa = parseJack(a);
  const pb = parseJack(b);
  if (pa.util && pb.util) return { ok: false, text: 'Utility jacks are not patched to one another.' };
  if (pa.util || pb.util) {
    const u = (pa.util ?? pb.util) as Utility;
    const j = pa.util ? pb : pa;
    const c = j.circuit!;
    switch (u) {
      case 'TST':
        if (j.side !== 'L') return { ok: false, text: 'The test set measures the line side. Patch it to the LINE jack.' };
        return { ok: true, purpose: 'test', circuits: [c] };
      case 'OPR':
        if (j.side !== 'L') return { ok: false, text: 'The operator position takes a line. Patch it to the LINE jack.' };
        return { ok: true, purpose: 'call', circuits: [c] };
      case 'MON':
        return { ok: true, purpose: 'monitor', circuits: [c] };
      case 'LB':
        return { ok: true, purpose: 'loop', circuits: [c] };
    }
  }
  const ca = pa.circuit!;
  const cb = pb.circuit!;
  if (ca.id === cb.id) return { ok: false, text: `${ca.id} is normal-through between its own LINE and EQPT jacks. No cord is needed.` };
  if (pa.side === pb.side) return { ok: false, text: 'A repatch joins a LINE jack to an EQPT jack.' };
  return { ok: true, purpose: 'repatch', circuits: [ca, cb] };
}

/* ------------------------------------------------------------------ service */

export type ServiceStatus =
  | 'IN SERVICE'
  | 'REPATCHED'
  | 'LOOPED'
  | 'ON TEST'
  | 'OUT OF SERVICE'
  | 'MISROUTED'
  | 'DEAD'
  | 'SPARE'
  | 'CARRYING'
  | 'NOT ASSIGNED';

export interface Service {
  status: ServiceStatus;
  /** Circuit whose line pair carries this circuit's equipment (itself when normal-through). */
  via: string | null;
  note: string;
}

const RANK: Record<ServiceStatus, number> = {
  'NOT ASSIGNED': 0,
  SPARE: 0,
  'IN SERVICE': 1,
  CARRYING: 1,
  REPATCHED: 2,
  LOOPED: 3,
  'ON TEST': 4,
  'OUT OF SERVICE': 5,
  MISROUTED: 6,
  DEAD: 7,
};

function sameRoute(x: PatchCircuit, y: PatchCircuit): boolean {
  return (x.a === y.a && x.b === y.b) || (x.a === y.b && x.b === y.a);
}

function baseService(c: PatchCircuit): Service {
  if (c.status === 'SPARE') return { status: 'SPARE', via: null, note: 'Spare pair, terminated.' };
  if (c.status === 'NOT ASSIGNED') return { status: 'NOT ASSIGNED', via: null, note: 'Pair not assigned.' };
  return { status: 'IN SERVICE', via: c.id, note: 'Normal-through.' };
}

/** Service of a circuit as seen from one bay. Monitor cords are non-intrusive and ignored. */
export function serviceInBay(s: PatchState | null, site: string, c: PatchCircuit): Service {
  const cords = cordsAt(s, site).filter((k) => k.purpose !== 'monitor');
  const eJ = `${c.id}/E`;
  const lJ = `${c.id}/L`;
  const eCord = cords.find((k) => k.a === eJ || k.b === eJ);
  const lCord = cords.find((k) => k.a === lJ || k.b === lJ);
  if (!eCord && !lCord) return baseService(c);
  if (eCord) {
    const other = parseJack(otherEnd(eCord, eJ));
    if (other.util === 'LB') return { status: 'LOOPED', via: null, note: 'Equipment looped at the bay.' };
    if (other.circuit) {
      if (!sameRoute(other.circuit, c)) return { status: 'MISROUTED', via: other.circuit.id, note: `Equipment patched to ${other.circuit.id}, which runs to another site.` };
      if (other.circuit.status === 'NOT ASSIGNED') return { status: 'REPATCHED', via: other.circuit.id, note: `Carried on ${other.circuit.id} (pair not assigned).` };
      return { status: 'REPATCHED', via: other.circuit.id, note: `Carried on ${other.circuit.id}.` };
    }
  }
  // Line jack in use, equipment jack free: the equipment has no line.
  const lp = parseJack(otherEnd(lCord!, lJ));
  if (lp.circuit) {
    if (c.status !== 'IN SERVICE') return { status: 'CARRYING', via: null, note: `Pair carrying ${lp.circuit.id}.` };
    return { status: 'OUT OF SERVICE', via: null, note: `Line pair given to ${lp.circuit.id}; equipment open.` };
  }
  const what = lp.util === 'TST' ? 'test set' : lp.util === 'OPR' ? 'operator position' : 'loop plug';
  if (c.status !== 'IN SERVICE') return { status: baseService(c).status, via: null, note: `Line on the ${what}.` };
  return { status: 'ON TEST', via: null, note: `Line on the ${what}; equipment open.` };
}

/** End-to-end service: the worse of both bays; DEAD while isolated (inter-site only). */
export function service(s: PatchState | null, c: PatchCircuit, isolated: boolean): Service {
  if (isolated && interSite(c) && c.id !== LIVE_UNASSIGNED) {
    return { status: 'DEAD', via: null, note: 'Network isolated. No loop current, no signal returned.' };
  }
  const ends = c.b === null ? [c.a] : [c.a, c.b];
  let worst = serviceInBay(s, ends[0]!, c);
  for (const site of ends.slice(1)) {
    const sv = serviceInBay(s, site, c);
    if (RANK[sv.status] > RANK[worst.status]) worst = sv;
  }
  return worst;
}

/** Circuit whose pair the figures are read from (the carrying spare after a repatch). */
export function lineOf(s: PatchState | null, c: PatchCircuit, site: string): PatchCircuit {
  const sv = serviceInBay(s, site, c);
  return (sv.via && byId.get(sv.via)) || c;
}

/* ------------------------------------------------------------------ deterministic noise */

export function hash01(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [-1, 1] over t (seconds), per key. */
export function wobble(key: string, t: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const a = hash01(`${key}:${i}`) * 2 - 1;
  const b = hash01(`${key}:${i + 1}`) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

/* ------------------------------------------------------------------ lamps */

export type Lamp = 'busy' | 'idle' | 'dark' | 'test';

export interface LampContext {
  now: number;
  isolated: boolean;
  /** Seal drill order being relayed (drill phase propagating). */
  drillRelay: boolean;
  /** Drill origin hub (canon sealDrill.origin). */
  drillOrigin: string;
  /** Unbooked segment 04 movement in progress (narrative engine signal). */
  seg04: boolean;
  /** Circuits with a call standing. */
  calling: ReadonlySet<string>;
}

export function slotOf(now: number): number {
  return Math.floor(now / 1000 / PC.traffic.slotSeconds);
}

/** Busy/idle lamp of a circuit (same at both ends). */
export function lampOf(s: PatchState | null, c: PatchCircuit, ctx: LampContext): Lamp {
  const sv = service(s, c, ctx.isolated);
  if (sv.status === 'DEAD') return 'dark';
  if (ctx.calling.has(c.id)) return 'busy';
  if (sv.status === 'ON TEST' || sv.status === 'LOOPED') return 'test';
  const slot = slotOf(ctx.now);
  if (c.id === LIVE_UNASSIGNED) return ctx.seg04 || hash01(`${c.id}#${slot}`) < PC.traffic.unassignedLive ? 'busy' : 'idle';
  if (sv.status === 'OUT OF SERVICE' || sv.status === 'MISROUTED' || c.status !== 'IN SERVICE') return sv.status === 'CARRYING' ? 'busy' : 'idle';
  if (c.kind === 'DATA') return 'busy';
  if (ctx.drillRelay && c.kind === 'VF' && c.id.endsWith('-V1') && c.class === 'trunk' && (c.a === ctx.drillOrigin || c.b === ctx.drillOrigin)) return 'busy';
  const p = c.kind === 'MAINT' ? PC.traffic.maintBusy : PC.traffic.voiceBusy;
  return hash01(`${c.id}#${slot}`) < p ? 'busy' : 'idle';
}

/* ------------------------------------------------------------------ line figures */

const segMiles = new Map(canon.railSegments.map((r) => [r.no, r.miles]));
const tramMiles = new Map<string, number>(canon.tramNetworks.flatMap((n) => n.links.map((l) => [`${l.from}|${l.to}`, l.miles] as [string, number])));

/** Route miles of a circuit's pair (0 for a site circuit). */
export function routeMiles(c: PatchCircuit): number {
  if (c.class === 'local' || c.b === null) return 0;
  if (c.class === 'trunk') return segMiles.get(c.route.replace('SEG ', '')) ?? 0;
  return tramMiles.get(`${c.a}|${c.b}`) ?? 0;
}

/** True for a pair with no termination at the far end (an open spare). */
export function isOpen(c: PatchCircuit): boolean {
  return c.kind !== 'DATA' && (c.lossDb === null || c.lossDb === undefined);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface VoiceReading {
  lossDb: number;
  noiseDbrnc0: number;
  snrDb: number;
}
export interface DataReading {
  esPerHour: number;
  berExp: number;
}

/** Voice-frequency reading on a pair at time t (seconds). null if open or not a VF pair. */
export function voiceAt(line: PatchCircuit, t: number): VoiceReading | null {
  if (line.kind === 'DATA' || isOpen(line)) return null;
  const j = PC.jitter;
  return {
    lossDb: r1((line.lossDb ?? 0) + j.lossDb * wobble(`${line.id}:loss`, t / 7)),
    noiseDbrnc0: r1((line.noiseDbrnc0 ?? 0) + j.noiseDb * wobble(`${line.id}:noise`, t / 3)),
    snrDb: r1((line.snrDb ?? 0) + j.snrDb * wobble(`${line.id}:snr`, t / 5)),
  };
}

/** Data bearer reading at time t (seconds). */
export function dataAt(line: PatchCircuit, t: number): DataReading | null {
  if (line.kind !== 'DATA') return null;
  const es = Math.max(0, Math.round((line.esPerHour ?? 0) + PC.jitter.esPerHour * wobble(`${line.id}:es`, t / 4)));
  return { esPerHour: es, berExp: line.berExp ?? -9 };
}

/** Hourly history (oldest first) of the primary figure of a pair, ending at `now`. */
export function history(line: PatchCircuit, now: number): { at: number; value: number }[] {
  const hours = PC.tests.historyHours;
  const end = Math.floor(now / 3600000) * 3600000;
  const out: { at: number; value: number }[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const at = end - i * 3600000;
    const t = at / 1000 / 60;
    if (line.kind === 'DATA') out.push({ at, value: dataAt(line, t)!.esPerHour });
    else {
      const v = voiceAt(line, t);
      if (v) out.push({ at, value: v.noiseDbrnc0 });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ tests */

export interface TestOutcome {
  result: TestResult;
  summary: string;
  readings: Record<string, number>;
  samples?: number[];
}

/** Round-trip time of a loop, ms: 8 microseconds per route mile each way plus 3 ms equipment. */
export function loopMs(c: PatchCircuit): number {
  return r1((routeMiles(c) * 2 * 8) / 1000 + 3);
}

/**
 * Run a test on a line from a bay. `line` is the pair the test set is patched to; `dead` is true
 * while isolated (inter-site pairs). `t` is the start time in seconds.
 */
export function runTest(kind: TestKind, line: PatchCircuit, t: number, dead: boolean): TestOutcome {
  const L = PC.limits;
  if (dead) {
    return { result: 'FAIL', summary: kind === 'loopback' ? 'No loop. No signal returned from the far end.' : PC.messages.dead, readings: {} };
  }
  if (isOpen(line)) {
    return { result: line.status === 'NOT ASSIGNED' ? 'PASS' : 'FAIL', summary: `${PC.messages.open} Register entry: ${line.status.toLowerCase()}.`, readings: {} };
  }
  const unassigned = line.status === 'NOT ASSIGNED';
  const unassignedNote = unassigned ? ' Reading taken on a pair the register carries as not assigned; expected: open, no termination.' : '';
  if (kind === 'loopback') {
    const ms = loopMs(line);
    return { result: unassigned ? 'MARGINAL' : 'PASS', summary: `Loop returned at the far end. Round trip ${ms} ms.${unassignedNote}`, readings: { loopMs: ms } };
  }
  if (kind === 'tone') {
    if (line.kind === 'DATA') return { result: 'FAIL', summary: 'Tone test applies to voice-frequency pairs. Use loopback or line quality on a data bearer.', readings: {} };
    const v = voiceAt(line, t)!;
    if (line.expectedLossDb == null) {
      return { result: 'MARGINAL', summary: `Loss ${v.lossDb} dB at ${PC.tests.toneHz} Hz.${unassignedNote}`, readings: { lossDb: v.lossDb } };
    }
    const dev = Math.abs(v.lossDb - line.expectedLossDb);
    const tol = L.lossToleranceDb;
    const result: TestResult = dev <= tol ? 'PASS' : dev <= tol * 2 ? 'MARGINAL' : 'FAIL';
    return {
      result,
      summary: `Loss ${v.lossDb} dB at ${PC.tests.toneHz} Hz, expected ${line.expectedLossDb} dB ±${tol}.`,
      readings: { lossDb: v.lossDb, expectedLossDb: line.expectedLossDb },
    };
  }
  // Line quality: a run of samples.
  const n = PC.tests.qualitySamples;
  const step = PC.tests.sampleMs / 1000;
  if (line.kind === 'DATA') {
    const samples = Array.from({ length: n }, (_, i) => dataAt(line, t + i * step)!.esPerHour);
    const mean = Math.round(samples.reduce((a, b) => a + b, 0) / n);
    const ber = line.berExp ?? -9;
    const result: TestResult = mean > L.esFailPerHour || ber > L.berFailExp ? 'FAIL' : mean > L.esWarnPerHour ? 'MARGINAL' : 'PASS';
    return { result, summary: `Errored seconds ${mean} per hour (limit ${L.esWarnPerHour}), bit error ratio 1E${ber}.`, readings: { esPerHour: mean, berExp: ber }, samples };
  }
  const reads = Array.from({ length: n }, (_, i) => voiceAt(line, t + i * step)!);
  const samples = reads.map((r) => r.noiseDbrnc0);
  const noise = r1(samples.reduce((a, b) => a + b, 0) / n);
  const snr = r1(reads.reduce((a, b) => a + b.snrDb, 0) / n);
  let result: TestResult = noise > L.noiseFailDbrnc0 || snr < L.snrMinDb ? 'FAIL' : noise > L.noiseWarnDbrnc0 ? 'MARGINAL' : 'PASS';
  if (unassigned) result = 'MARGINAL';
  return {
    result,
    summary: `C-message noise ${noise} dBrnC0 (limit ${L.noiseWarnDbrnc0}), signal to noise ${snr} dB (minimum ${L.snrMinDb}).${unassignedNote}`,
    readings: { noiseDbrnc0: noise, snrDb: snr },
    samples,
  };
}

/** Whether a pair fails its limits on its baseline figures (no jitter). */
export function failsLimits(line: PatchCircuit): boolean {
  const L = PC.limits;
  if (line.kind === 'DATA') return (line.esPerHour ?? 0) > L.esFailPerHour || (line.berExp ?? -9) > L.berFailExp;
  if (isOpen(line)) return false;
  if (line.expectedLossDb != null && line.lossDb != null && Math.abs(line.lossDb - line.expectedLossDb) > L.lossToleranceDb * 2) return true;
  return (line.noiseDbrnc0 ?? 0) > L.noiseFailDbrnc0 || (line.snrDb ?? 99) < L.snrMinDb;
}

/* ------------------------------------------------------------------ dial plan */

export type DialResult =
  | { kind: 'desk'; site: string; desk: PatchDesk | PatchRingdown; listed: boolean }
  | { kind: 'intercept'; site: string }
  | { kind: 'no-reply'; site: string; desk: PatchDesk };

/** What answers a number dialled on an exchange at `site` at Zulu hour `hourZ`. */
export function dial(site: string, digits: string, hourZ: number): DialResult {
  const ex = PC.exchanges.find((e) => e.site === site);
  const desk = ex?.desks.find((d) => d.ext === digits);
  if (!desk) return { kind: 'intercept', site };
  if (desk.hoursZ && (hourZ < desk.hoursZ[0] || hourZ >= desk.hoursZ[1])) return { kind: 'no-reply', site, desk };
  return { kind: 'desk', site, desk, listed: desk.listed };
}

/** Ringdown far end (no digits): maintenance control, the duty officer, or an unassigned pair. */
export function ringdownOf(c: PatchCircuit): PatchRingdown | null {
  if (c.id === LIVE_UNASSIGNED) return PC.ringdowns.UNASSIGNED;
  if (!c.ringdown) return null;
  return c.kind === 'MAINT' ? PC.ringdowns.MAINT : PC.ringdowns.DUTY;
}

/** Exchange reached by a dialled call on a circuit from a bay (the far hub, or this site). */
export function exchangeFor(c: PatchCircuit, site: string): string | null {
  if (c.class === 'local') return c.a;
  const far = farEnd(c, site);
  return far && HUBS.includes(far) ? far : null;
}

/** The listed desks a bay's procedure annex may print (never the unlisted numbers). */
export function listedDesks(): { site: string; ext: string; section: string; hoursZ?: [number, number] }[] {
  return PC.exchanges.flatMap((e) => e.desks.filter((d) => d.listed && d.section).map((d) => ({ site: e.site, ext: d.ext, section: d.section!, hoursZ: d.hoursZ })));
}

/* ------------------------------------------------------------------ hub link summary */

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

const UPISH: ReadonlySet<ServiceStatus> = new Set(['IN SERVICE', 'REPATCHED']);

/** Summary per inter-hub route in revenue service (rail segments with assigned circuits). */
export function computeLinks(s: PatchState | null, now: number, prev: Record<string, HubLinkSummary> = {}): Record<string, HubLinkSummary> {
  const out: Record<string, HubLinkSummary> = {};
  for (const seg of canon.railSegments.filter((r) => r.status === 'IN REVENUE SERVICE')) {
    const on = CIRCUITS.filter((c) => c.class === 'trunk' && c.route === `SEG ${seg.no}` && c.status === 'IN SERVICE');
    const voice = on.filter((c) => c.kind === 'VF');
    const data = on.filter((c) => c.kind === 'DATA');
    const sv = (c: PatchCircuit) => service(s, c, false);
    const voiceUp = voice.filter((c) => UPISH.has(sv(c).status)).length;
    const dataUp = data.filter((c) => UPISH.has(sv(c).status) && !failsLimits(lineOf(s, c, c.a))).length;
    const notes: string[] = [];
    for (const c of [...data, ...voice]) {
      const v = sv(c);
      if (v.status !== 'IN SERVICE') notes.push(`${c.id} ${v.status.toLowerCase()}`);
      else if (failsLimits(c)) notes.push(`${c.id} outside limits`);
    }
    let state: HubLinkState = 'UP';
    if (dataUp < data.length) state = 'DOWN';
    else if (voiceUp < voice.length || data.some((c) => sv(c).status === 'REPATCHED')) state = 'DEGRADED';
    const key = pairKey(seg.a, seg.b);
    const old = prev[key];
    out[key] = {
      a: seg.a,
      b: seg.b,
      segment: seg.no,
      state,
      voiceUp,
      voiceTotal: voice.length,
      dataUp,
      dataTotal: data.length,
      note: notes.length ? `Hub circuits: ${notes.join('; ')}.` : 'Hub circuits normal-through and in service.',
      since: old && old.state === state ? old.since : now,
    };
  }
  return out;
}

/* ------------------------------------------------------------------ helpers */

export function serialId(prefix: string, n: number, yy?: string): string {
  return yy ? `${prefix}-${yy}-${String(n).padStart(4, '0')}` : `${prefix}-${String(n).padStart(4, '0')}`;
}

export function trimLog<T>(list: T[]): T[] {
  return list.length > PC.panel.logLimit ? list.slice(list.length - PC.panel.logLimit) : list;
}

/** Pencil note on a designation strip in a bay, if any. */
export function pencilAt(site: string, circuitId: string): string | null {
  return PC.pencil.find((p) => p.site === site && p.circuit === circuitId)?.text ?? null;
}
