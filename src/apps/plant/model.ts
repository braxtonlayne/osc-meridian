/**
 * Reactor plant training simulator: a deliberately simplified, deterministic toy.
 *
 * - Neutronics: one-group point kinetics with an external source, integrated by implicit
 *   Euler (stable at any step below prompt critical; subdivided above it).
 * - Reactivity: rod bank S-curve worths, moderator and fuel temperature feedback.
 * - Thermal: lumped fuel and average coolant temperatures; decay heat as a first-order lag;
 *   heat removed by the turbine (station load after sync) and by the steam dump.
 * - Protection: trips on flux, startup rate, pressure, temperature, flow, turbine trip.
 * - Electrical: generator breaker, surface supply and diesel sets on the essential buses
 *   (same rules as the @graphics/reactor one-line `solve`).
 *
 * Every constant comes from the canon fragment (content/canon/apps/plant.json). Pure functions,
 * no DOM, no clock: `step(state, dt)` returns the new state and the events it raised.
 */
import { ANN_NORMAL, annunciatorStep } from '@graphics/panel/logic';
import type { AnnPoint } from '@graphics/panel/logic';
import type { PlantCanon } from '@core/canon-apps/plant';
import type { AnnId, BankId, DieselSelect, SimMode, SimState } from './types';

export type Constants = Pick<PlantCanon, 'model' | 'rods' | 'trips' | 'alarms' | 'electrical' | 'limits'>;

/** Per-unit parameters (from canon `reactors` + the one-line plant model, or the trainer). */
export interface UnitParams {
  id: string;
  ratedMWt: number;
  ratedMWe: number;
  /** Station load as a fraction of rated output (turbine demand after sync). */
  stationLoad: number;
  /** Thermal power limit in force, percent rated. */
  limitPct: number;
  /** Main feedwater pump B out of service (shown as a status window). */
  fwBOos: boolean;
}

export const ANN_IDS: readonly AnnId[] = [
  'RX_TRIP', 'FLUX_HI', 'SUR_HI', 'PRESS_HI', 'PRESS_LO', 'TEMP_HI', 'FLOW_LO', 'ROD_BLOCK',
  'TURB_TRIP', 'GEN_OPEN', 'DG_RUN', 'ESS_DEAD', 'ABOVE_LIMIT', 'DUMP_OPEN', 'FW_B_OOS', 'DRILL',
];

/** Windows that sound the horn when they come in (status windows do not). */
export const ANN_HORN: ReadonlySet<AnnId> = new Set<AnnId>([
  'RX_TRIP', 'FLUX_HI', 'SUR_HI', 'PRESS_HI', 'PRESS_LO', 'TEMP_HI', 'FLOW_LO', 'ROD_BLOCK', 'TURB_TRIP', 'ESS_DEAD', 'ABOVE_LIMIT',
]);

export const MODES: readonly SimMode[] = ['SHUTDOWN', 'STARTUP', 'RUN'];
export const DIESEL_POSITIONS: readonly DieselSelect[] = ['STOP', 'AUTO', 'RUN'];

export type SimEvent =
  | { type: 'trip'; cause: string; manual: boolean; powerPct: number }
  | { type: 'horn' }
  | { type: 'limit'; parameter: string; value: string; limit: string };

/* ------------------------------------------------------------------ reactivity */

/** Integral rod worth fraction for a bank withdrawn `f` (0..1) of its travel. */
export function sCurve(f: number): number {
  const x = Math.min(1, Math.max(0, f));
  return x - Math.sin(2 * Math.PI * x) / (2 * Math.PI);
}

/** Inverse of sCurve by bisection (monotonic on 0..1). */
export function sCurveInverse(y: number): number {
  const target = Math.min(1, Math.max(0, y));
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (sCurve(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function bankWorth(k: Constants, id: BankId): number {
  return k.rods.banks.find((b) => b.id === id)?.worthPcm ?? 0;
}

/** Total reactivity in pcm. */
export function reactivityPcm(k: Constants, s: Pick<SimState, 'rods' | 'tc' | 'tf'>): number {
  const m = k.model;
  const N = k.rods.steps;
  let rho = m.excessPcm;
  for (const id of ['SD', 'CB'] as const) rho -= bankWorth(k, id) * (1 - sCurve(s.rods[id] / N));
  rho += m.alphaModeratorPcmPerC * (s.tc - m.noLoadTempC);
  rho += m.alphaFuelPcmPerC * (s.tf - m.noLoadTempC);
  return rho;
}

/** Control bank position (steps) that makes the core critical at power fraction p (steady, full flow). */
export function criticalBankSteps(k: Constants, p: number): number {
  const m = k.model;
  const need = (m.excessPcm + m.alphaFuelPcmPerC * m.fuelDeltaTFullPowerC * p) / bankWorth(k, 'CB');
  return sCurveInverse(1 - need) * k.rods.steps;
}

/* ------------------------------------------------------------------ derived quantities */

export function flowFraction(k: Constants, s: Pick<SimState, 'pumps'>): number {
  return Math.max(k.model.naturalCirculation, 0.5 * s.pumps.A.speed + 0.5 * s.pumps.B.speed);
}

export function pressureMPa(k: Constants, tc: number): number {
  return k.model.pressureNominalMPa + k.model.pressurePerC * (tc - k.model.noLoadTempC);
}

/** Thermal power delivered to the coolant, fraction of rated. */
export function thermalPower(s: Pick<SimState, 'tf' | 'tc'>, k: Constants): number {
  return (s.tf - s.tc) / k.model.fuelDeltaTFullPowerC;
}

export interface HeatRemoval {
  cap: number;
  turbine: number;
  dump: number;
  total: number;
}

export function heatRemoval(k: Constants, s: Pick<SimState, 'tc' | 'demand' | 'pumps'>): HeatRemoval {
  const m = k.model;
  const cap = Math.min(1, flowFraction(k, s) / m.removalFlowForFull);
  const drive = Math.min(1.5, Math.max(0, (s.tc - m.feedTempC) / (m.noLoadTempC - m.feedTempC)));
  const turbine = s.demand * drive;
  const dump = Math.min(m.dumpCapacity, Math.max(0, m.dumpGainPerC * (s.tc - m.noLoadTempC - m.dumpDeadbandC)));
  return { cap, turbine: cap * turbine, dump: cap * dump, total: cap * (turbine + dump) };
}

export interface Electrical {
  /** Generator output, MW. */
  genMW: number;
  stationMW: number;
  dieselRunning: boolean;
  /** Diesel sets on their breakers (carrying bus E-A). */
  dieselOnBus: boolean;
  essA: boolean;
  essB: boolean;
  /** Breaker overrides for the one-line diagram (`solve` from @graphics/reactor). */
  breakers: Record<string, 'OPEN' | 'CLOSED'>;
}

/**
 * Essential buses: with the unit on line both buses run from the switchgear. With 52-G1 open,
 * bus E-A is shed to the diesel sets (52-A1 opens, ATS-A transfers) and bus E-B is carried by the
 * surface supply (52-S1 closes). Diesel selector STOP holds the diesel breakers open.
 */
export function electrical(k: Constants, u: UnitParams, s: SimState, dgCount: number): Electrical {
  const hr = heatRemoval(k, s);
  const genMW = s.gen ? hr.turbine * u.ratedMWe : 0;
  const dieselRunning = s.diesel === 'RUN' || (s.diesel === 'AUTO' && !s.gen);
  const dieselOnBus = s.diesel !== 'STOP' && dieselRunning;
  const essA = s.gen || dieselOnBus;
  const breakers: Record<string, 'OPEN' | 'CLOSED'> = {
    '52-G1': s.gen ? 'CLOSED' : 'OPEN',
    '52-S1': s.gen ? 'OPEN' : 'CLOSED',
    '52-A1': s.gen ? 'CLOSED' : 'OPEN',
  };
  for (let i = 1; i <= dgCount; i++) {
    if (s.diesel === 'STOP') breakers[`52-D${i}`] = 'OPEN';
    else if (s.diesel === 'RUN') breakers[`52-D${i}`] = 'CLOSED';
  }
  return { genMW, stationMW: u.stationLoad * u.ratedMWe, dieselRunning, dieselOnBus, essA, essB: true, breakers };
}

/* ------------------------------------------------------------------ initial conditions */

function anns(): Record<AnnId, AnnPoint> {
  const out = {} as Record<AnnId, AnnPoint>;
  for (const id of ANN_IDS) out[id] = { ...ANN_NORMAL };
  return out;
}

/**
 * Initial condition at power fraction p. p = 0: hot shutdown, all rods in, scram reset;
 * small p: hot standby, shutdown bank out, critical on the control bank; otherwise steady at
 * p with the generator carrying the station (p should be the unit's station load).
 */
export function initialState(k: Constants, u: UnitParams, ic: string, p: number): SimState {
  const m = k.model;
  const N = k.rods.steps;
  const pumps = { A: { on: true, speed: 1 }, B: { on: true, speed: 1 } };
  const base = {
    unit: u.id,
    ic,
    t: 0,
    d: 0,
    tc: m.noLoadTempC,
    tf: m.noLoadTempC,
    rodCmd: null,
    scrammed: false,
    scramCause: null,
    pumps,
    turbineLatched: false,
    gen: false,
    demand: 0,
    diesel: 'AUTO' as DieselSelect,
    sur: 0,
    limitTimer: 0,
    ann: anns(),
  };
  let s: SimState;
  if (p <= 0) {
    const rods = { SD: 0, CB: 0 };
    const rho = reactivityPcm(k, { rods, tc: base.tc, tf: base.tf }) / 1e5;
    const n = Math.max(m.minPower, (m.sourcePerS * m.genTimeS) / Math.max(1e-6, -rho));
    s = { ...base, n, c: n, rods, mode: 'SHUTDOWN' };
  } else if (p < 0.01) {
    s = { ...base, n: p, c: p, rods: { SD: N, CB: criticalBankSteps(k, 0) }, mode: 'STARTUP' };
  } else {
    s = {
      ...base,
      n: p,
      c: p,
      d: m.decayHeatFraction * p,
      tf: m.noLoadTempC + m.fuelDeltaTFullPowerC * p,
      rods: { SD: N, CB: criticalBankSteps(k, p) },
      mode: 'RUN',
      turbineLatched: true,
      gen: true,
      demand: u.stationLoad,
    };
  }
  // An IC loads with its standing windows already acknowledged (steady, no horn).
  const r = refreshAnnunciators(k, u, s, false).state;
  const ann = { ...r.ann };
  for (const id of ANN_IDS) if (ann[id].seq === 'unack') ann[id] = { ...ann[id], seq: 'ack' };
  return { ...r, ann };
}

/* ------------------------------------------------------------------ operator actions */

export type Action =
  | { type: 'rod'; bank: BankId; dir: 1 | -1 | 0 }
  | { type: 'mode'; mode: SimMode }
  | { type: 'scram' }
  | { type: 'scramReset' }
  | { type: 'pump'; pump: 'A' | 'B'; on: boolean }
  | { type: 'turbineTrip' }
  | { type: 'turbineReset' }
  | { type: 'genClose' }
  | { type: 'genOpen' }
  | { type: 'diesel'; select: DieselSelect }
  | { type: 'ack' }
  | { type: 'reset' };

export interface ActionResult {
  state: SimState;
  events: SimEvent[];
  /** In-world refusal (interlock) when the plant would not accept the action. */
  refused?: string;
}

function tripState(s: SimState, cause: string, manual: boolean): { state: SimState; event: SimEvent } {
  return {
    state: { ...s, scrammed: true, scramCause: cause, rodCmd: null, turbineLatched: false, gen: false, demand: 0 },
    event: { type: 'trip', cause, manual, powerPct: round(s.n * 100, 1) },
  };
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Why a withdrawal is blocked, or null. */
export function withdrawBlock(k: Constants, s: SimState, bank: BankId): string | null {
  if (s.scrammed) return 'Rod withdrawal blocked: reactor tripped. Reset the trip in SHUTDOWN first.';
  if (s.mode === 'SHUTDOWN') return 'Rod withdrawal blocked: mode selector in SHUTDOWN.';
  if (bank === 'CB' && s.rods.SD < k.rods.steps - 0.5) return 'Rod withdrawal blocked: control bank cannot be withdrawn until the shutdown bank is fully out.';
  if (flowFraction(k, s) < k.trips.flowLowFraction) return 'Rod withdrawal blocked: coolant flow below the trip setpoint.';
  return null;
}

export function applyAction(k: Constants, u: UnitParams, s0: SimState, a: Action): ActionResult {
  const events: SimEvent[] = [];
  let s: SimState = s0;
  switch (a.type) {
    case 'rod': {
      if (a.dir === 0) return { state: { ...s, rodCmd: null }, events };
      if (a.dir === 1) {
        const why = withdrawBlock(k, s, a.bank);
        if (why) {
          const ann = { ...s.ann, ROD_BLOCK: annunciatorStep(s.ann.ROD_BLOCK, 'abnormal') };
          if (s.ann.ROD_BLOCK.seq === 'normal') events.push({ type: 'horn' });
          return { state: { ...s, rodCmd: null, ann }, events, refused: why };
        }
      } else if (s.scrammed) {
        return { state: s, events, refused: 'Rods are inserting on the trip; bank control is not available until the trip is reset.' };
      }
      return { state: { ...s, rodCmd: { bank: a.bank, dir: a.dir } }, events };
    }
    case 'mode': {
      if (a.mode === s.mode) return { state: s, events };
      s = { ...s, mode: a.mode };
      if (a.mode === 'SHUTDOWN' && !s.scrammed) {
        const t = tripState(s, 'MODE SELECTOR TO SHUTDOWN', true);
        s = t.state;
        events.push(t.event);
      } else if (a.mode === 'STARTUP' && s.gen) {
        s = { ...s, gen: false, demand: 0 };
      }
      break;
    }
    case 'scram': {
      if (s.scrammed) return { state: s, events };
      const t = tripState(s, 'MANUAL SCRAM', true);
      s = t.state;
      events.push(t.event);
      break;
    }
    case 'scramReset': {
      if (!s.scrammed) return { state: s, events, refused: 'No trip is sealed in.' };
      if (s.mode !== 'SHUTDOWN') return { state: s, events, refused: 'Trip reset is permitted only with the mode selector in SHUTDOWN.' };
      if (s.rods.SD > 0.5 || s.rods.CB > 0.5) return { state: s, events, refused: 'Trip reset is not permitted until both banks read zero steps.' };
      s = { ...s, scrammed: false, scramCause: null };
      break;
    }
    case 'pump':
      s = { ...s, pumps: { ...s.pumps, [a.pump]: { ...s.pumps[a.pump], on: a.on } } };
      break;
    case 'turbineTrip': {
      if (!s.turbineLatched) return { state: s, events };
      s = { ...s, turbineLatched: false, gen: false, demand: 0 };
      if (!s.scrammed && s.n * 100 >= k.trips.turbineTripPermissivePct) {
        const t = tripState(s, 'TURBINE TRIP ABOVE PERMISSIVE', false);
        s = t.state;
        events.push(t.event);
      }
      break;
    }
    case 'turbineReset':
      if (s.scrammed) return { state: s, events, refused: 'Turbine latch is blocked while the reactor trip is sealed in.' };
      s = { ...s, turbineLatched: true };
      break;
    case 'genClose': {
      if (s.gen) return { state: s, events };
      if (!s.turbineLatched) return { state: s, events, refused: 'Synchronising is blocked: turbine not latched.' };
      if (s.mode !== 'RUN') return { state: s, events, refused: 'Synchronising is blocked: mode selector not in RUN.' };
      const pct = s.n * 100;
      if (pct < k.electrical.syncMinPct || pct > k.electrical.syncMaxPct)
        return { state: s, events, refused: `Synchronising is permitted between ${k.electrical.syncMinPct} and ${k.electrical.syncMaxPct}% rated thermal power.` };
      s = { ...s, gen: true, demand: 0 };
      break;
    }
    case 'genOpen':
      s = { ...s, gen: false, demand: 0 };
      break;
    case 'diesel':
      s = { ...s, diesel: a.select };
      break;
    case 'ack': {
      const ann = { ...s.ann };
      for (const id of ANN_IDS) ann[id] = annunciatorStep(ann[id], 'ack');
      s = { ...s, ann };
      break;
    }
    case 'reset': {
      const ann = { ...s.ann };
      for (const id of ANN_IDS) ann[id] = annunciatorStep(ann[id], 'reset');
      s = { ...s, ann };
      break;
    }
  }
  const r = refreshAnnunciators(k, u, s, true);
  return { state: r.state, events: [...events, ...r.events] };
}

/* ------------------------------------------------------------------ annunciators */

/** Process condition per window. ROD_BLOCK and DRILL are driven by actions and the app. */
export function conditions(k: Constants, u: UnitParams, s: SimState): Partial<Record<AnnId, boolean>> {
  const pct = s.n * 100;
  const p = pressureMPa(k, s.tc);
  const flow = flowFraction(k, s);
  const hr = heatRemoval(k, s);
  const el = electrical(k, u, s, 1);
  return {
    RX_TRIP: s.scrammed,
    FLUX_HI: pct >= (s.mode === 'RUN' ? k.alarms.fluxHighPct : k.alarms.fluxHighStartupPct),
    SUR_HI: s.sur >= k.alarms.startupRateDpm,
    PRESS_HI: p >= k.alarms.pressureHighMPa,
    PRESS_LO: p <= k.alarms.pressureLowMPa,
    TEMP_HI: s.tc >= k.alarms.coolantTempHighC,
    FLOW_LO: flow < k.alarms.flowLowFraction,
    TURB_TRIP: !s.turbineLatched,
    GEN_OPEN: !s.gen,
    DG_RUN: el.dieselRunning,
    ESS_DEAD: !el.essA || !el.essB,
    ABOVE_LIMIT: pct > u.limitPct,
    DUMP_OPEN: hr.dump > 0.005,
    FW_B_OOS: u.fwBOos,
  };
}

function refreshAnnunciators(k: Constants, u: UnitParams, s: SimState, horn: boolean): { state: SimState; events: SimEvent[] } {
  const cond = conditions(k, u, s);
  const ann = { ...s.ann };
  let sound = false;
  for (const id of ANN_IDS) {
    const c = cond[id];
    if (c === undefined) {
      // Latched by an action (rod block): clears once no withdrawal is held.
      if (id === 'ROD_BLOCK' && ann[id].abnormal && !s.rodCmd) ann[id] = annunciatorStep(ann[id], 'normal');
      continue;
    }
    const before = ann[id];
    const next = annunciatorStep(before, c ? 'abnormal' : 'normal');
    if (next.seq === 'unack' && before.seq !== 'unack' && ANN_HORN.has(id)) sound = true;
    ann[id] = next;
  }
  return { state: { ...s, ann }, events: horn && sound ? [{ type: 'horn' }] : [] };
}

/* ------------------------------------------------------------------ time step */

function approach(v: number, target: number, tau: number, dt: number): number {
  return target + (v - target) * Math.exp(-dt / tau);
}

/** One kinetics + thermal sub-step (no protection, no annunciators). */
function integrate(k: Constants, s: SimState, dt: number, target: number): SimState {
  const m = k.model;
  const N = k.rods.steps;
  // Rods
  const rods = { ...s.rods };
  if (s.scrammed) {
    const rate = N / k.rods.scramInsertS;
    rods.SD = Math.max(0, rods.SD - rate * dt);
    rods.CB = Math.max(0, rods.CB - rate * dt);
  } else if (s.rodCmd) {
    const b = s.rodCmd.bank;
    rods[b] = Math.min(N, Math.max(0, rods[b] + s.rodCmd.dir * k.rods.speedStepsPerS * dt));
  }
  // Pumps
  const pumps = {
    A: { on: s.pumps.A.on, speed: approach(s.pumps.A.speed, s.pumps.A.on ? 1 : 0, s.pumps.A.on ? m.pumpSpinUpS : m.pumpCoastdownS, dt) },
    B: { on: s.pumps.B.on, speed: approach(s.pumps.B.speed, s.pumps.B.on ? 1 : 0, s.pumps.B.on ? m.pumpSpinUpS : m.pumpCoastdownS, dt) },
  };
  // Neutronics (implicit Euler on n and normalised c, reactivity held over the step)
  const rho = reactivityPcm(k, { rods, tc: s.tc, tf: s.tf }) / 1e5;
  const a = (rho - m.betaEff) / m.genTimeS;
  const bl = m.betaEff / m.genTimeS;
  const lam = m.lambdaPerS;
  const D = 1 - dt * a - (dt * dt * bl * lam) / (1 + lam * dt);
  let n = (s.n + (dt * bl * s.c) / (1 + lam * dt) + dt * m.sourcePerS) / D;
  if (!Number.isFinite(n) || n <= 0) n = m.minPower;
  n = Math.min(m.maxPower, Math.max(m.minPower, n));
  const c = (s.c + dt * lam * n) / (1 + lam * dt);
  // Startup rate, decades per minute, smoothed over about a second
  const instSur = ((Math.log(n) - Math.log(s.n)) / dt) * (60 / Math.LN10);
  const sur = s.sur + (instSur - s.sur) * Math.min(1, dt / 1);
  // Thermal
  const d = approach(s.d, m.decayHeatFraction * n, m.decayTauS, dt);
  const gen = (1 - m.decayHeatFraction) * n + d;
  const toCoolant = (s.tf - s.tc) / m.fuelDeltaTFullPowerC;
  const tf = s.tf + ((gen - toCoolant) * m.fuelDeltaTFullPowerC * dt) / m.fuelTauS;
  const demand = s.gen ? Math.min(s.demand + k.electrical.loadRampPerS * dt, target) : 0;
  const hr = heatRemoval(k, { tc: s.tc, demand, pumps });
  const tc = s.tc + (toCoolant - hr.total) * m.coolantHeatupCPerS * dt;
  return { ...s, t: s.t + dt, rods, pumps, n, c, d, tf, tc, sur, demand };
}

/** Advance the simulator by dt seconds (fixed sub-steps). Returns the state and raised events. */
export function step(k: Constants, u: UnitParams, s0: SimState, dt: number): { state: SimState; events: SimEvent[] } {
  const events: SimEvent[] = [];
  let s = s0;
  const stepS = k.model.stepS;
  let left = dt;
  while (left > 1e-9) {
    let h = Math.min(stepS, left);
    // Subdivide above prompt critical so the implicit step stays well conditioned.
    const rho = reactivityPcm(k, s) / 1e5;
    const a = (rho - k.model.betaEff) / k.model.genTimeS;
    if (a * h > k.model.promptStepLimit) h = Math.max(1e-4, k.model.promptStepLimit / a);
    s = integrate(k, s, h, u.stationLoad);
    left -= h;
    const trip = !s.scrammed ? protection(k, s) : null;
    if (trip) {
      const t = tripState(s, trip, false);
      s = t.state;
      events.push(t.event);
    }
  }
  // Limits held without a trip
  const outside = limitBreach(k, u, s);
  if (outside) {
    const before = s.limitTimer;
    s = { ...s, limitTimer: before + dt };
    if (before < k.limits.holdS && s.limitTimer >= k.limits.holdS) events.push({ type: 'limit', ...outside });
  } else if (s.limitTimer !== 0) {
    s = { ...s, limitTimer: 0 };
  }
  const r = refreshAnnunciators(k, u, s, true);
  return { state: r.state, events: [...events, ...r.events] };
}

/** The first protection trip condition met, or null. */
export function protection(k: Constants, s: SimState): string | null {
  const tr = k.trips;
  const pct = s.n * 100;
  const p = pressureMPa(k, s.tc);
  if (pct >= (s.mode === 'RUN' ? tr.fluxHighRunPct : tr.fluxHighStartupPct)) return 'NEUTRON FLUX HIGH';
  if (s.sur >= tr.startupRateDpm && pct < tr.startupRateBypassPct) return 'STARTUP RATE HIGH';
  if (p >= tr.pressureHighMPa) return 'PRIMARY PRESSURE HIGH';
  if (p <= tr.pressureLowMPa && pct >= tr.pressureLowPermissivePct) return 'PRIMARY PRESSURE LOW';
  if (s.tc >= tr.coolantTempHighC) return 'COOLANT TEMPERATURE HIGH';
  if (flowFraction(k, s) < tr.flowLowFraction && pct >= tr.flowLowPermissivePct) return 'COOLANT FLOW LOW';
  return null;
}

/** A limit being exceeded without a trip: power above the unit limit, or an essential bus dead. */
export function limitBreach(k: Constants, u: UnitParams, s: SimState): { parameter: string; value: string; limit: string } | null {
  const pct = s.n * 100;
  if (pct > u.limitPct) return { parameter: 'Thermal power', value: `${pct.toFixed(1)}% rated`, limit: `${u.limitPct}% rated` };
  const el = electrical(k, u, s, 1);
  if (!el.essA || !el.essB) return { parameter: 'Essential bus E-A', value: 'de-energised', limit: 'energised' };
  return null;
}

/* ------------------------------------------------------------------ display helpers */

/** Log power display: "3.2E-5" (fraction of rated). */
export function logPower(n: number): string {
  if (!(n > 0)) return '0';
  const e = Math.floor(Math.log10(n));
  const m = n / 10 ** e;
  return `${m.toFixed(1)}E${e}`;
}

/** Steady-state readings for a unit at power fraction p (used to dress the live display). */
export function steadyState(k: Constants, u: UnitParams, p: number): SimState {
  if (p <= 0.0005) {
    const s = initialState(k, u, 'LIVE', 0);
    return { ...s, scrammed: false, diesel: 'AUTO' };
  }
  return initialState(k, u, 'LIVE', p);
}
