/**
 * Simulator runtime: one installation's training simulator, run in a requestAnimationFrame loop
 * that only steps while this window is on screen (not minimised, tab visible) and not frozen.
 *
 * Shared state (`plant` key): the window running a unit holds a short lease and writes a
 * checkpoint every `history.checkpointS`. Other windows, tabs and accounts follow the
 * checkpoints. An operator action anywhere takes the lease (the last station to act runs the
 * simulator). With no station running, the simulator stands frozen where it was left.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AccountId, Services } from '@core/contracts';
import { inWorldIso } from '@core/session';
import { applyAction, flowFraction, heatRemoval, initialState, pressureMPa, step } from './model';
import type { Action, SimEvent } from './model';
import { K, P, defaultIc, icPower } from './data';
import type { UnitDef } from './data';
import { PLANT_SHARED_NONE } from './types';
import type { PlantShared, SimRecord, SimState, SimTripRecord } from './types';

export interface TrendSample {
  /** Unix seconds (wall clock, shown as Zulu on the trend axis). */
  t: number;
  powerPct: number;
  tc: number;
  pressure: number;
  flowPct: number;
  genMW: number;
}

export interface SimHandle {
  state: SimState;
  /** This window is stepping the simulator. */
  running: boolean;
  /** Another station holds the lease (its checkpoints are shown here). */
  remote: boolean;
  /** Frozen by the operator (FREEZE pushbutton). */
  frozen: boolean;
  /** On screen (not minimised, tab visible). */
  visible: boolean;
  lastBy: AccountId | null;
  trend: TrendSample[];
  act(a: Action): { refused?: string; events: SimEvent[] };
  loadIc(id: string): void;
  setFrozen(f: boolean): void;
}

const newToken = () => Math.random().toString(36).slice(2, 10);

function isOnScreen(el: HTMLElement | null): boolean {
  return !!el && el.getClientRects().length > 0 && (typeof document === 'undefined' || document.visibilityState === 'visible');
}

export function useSim(opts: {
  unit: UnitDef;
  services: Services;
  rootRef: { current: HTMLElement | null };
  /** False while the window shows something else (live display, documents): the loop idles. */
  active: boolean;
  onEvents: (events: SimEvent[], s: SimState) => void;
}): SimHandle {
  const { unit, services, rootRef, active } = opts;
  const me = services.account.id.value;
  const shared = services.shared.get<PlantShared>('plant', PLANT_SHARED_NONE);
  const token = useRef(newToken()).current;
  const cur = useRef<SimState | null>(null);
  const rev = useRef(0);
  const trend = useRef<TrendSample[]>([]);
  const nextSample = useRef(0);
  const lastWrite = useRef(0);
  const holding = useRef(false);
  const onEvents = useRef(opts.onEvents);
  onEvents.current = opts.onEvents;
  const [frozen, setFrozenState] = useState(false);
  const [, setTick] = useState(0);
  const [visible, setVisible] = useState(true);

  const record = (): SimRecord | undefined => shared.peek().sims[unit.id];

  /* ---- load or create the unit's state when the unit changes */
  if (!cur.current || cur.current.unit !== unit.id) {
    const rec = record();
    const ic = defaultIc(unit);
    cur.current = rec?.state ?? initialState(K, unit.params, ic, icPower(unit, ic));
    rev.current = rec?.rev ?? 0;
    trend.current = [];
    nextSample.current = 0;
  }

  const write = (state: SimState, runner: SimRecord['runner'], isFrozen: boolean) => {
    rev.current += 1;
    lastWrite.current = Date.now();
    const rec: SimRecord = { state, rev: rev.current, savedAt: Date.now(), by: me, runner, frozen: isFrozen };
    services.shared.update<PlantShared>('plant', PLANT_SHARED_NONE, (prev) => ({ ...prev, v: 1, sims: { ...prev.sims, [unit.id]: rec } }));
  };

  const lease = () => ({ token, until: Date.now() + P.history.leaseS * 1000 });

  const otherRunner = (): boolean => {
    const r = record()?.runner;
    return !!r && r.token !== token && r.until > Date.now();
  };

  /* ---- follow checkpoints written elsewhere */
  const sharedRec = shared.value.sims[unit.id];
  useEffect(() => {
    if (!sharedRec || sharedRec.rev <= rev.current) return;
    if (sharedRec.runner?.token === token) return;
    cur.current = sharedRec.state;
    rev.current = sharedRec.rev;
    holding.current = false;
    sample(sharedRec.state);
    setTick((n) => n + 1);
  }, [sharedRec?.rev, unit.id]);

  const sample = (s: SimState) => {
    const now = Date.now() / 1000;
    if (now < nextSample.current) return;
    nextSample.current = now + P.history.trendSampleS;
    const hr = heatRemoval(K, s);
    trend.current.push({
      t: now,
      powerPct: s.n * 100,
      tc: s.tc,
      pressure: pressureMPa(K, s.tc),
      flowPct: flowFraction(K, s) * 100,
      genMW: s.gen ? hr.turbine * unit.params.ratedMWe : 0,
    });
    const max = Math.ceil(P.history.trendSeconds / P.history.trendSampleS);
    if (trend.current.length > max) trend.current.splice(0, trend.current.length - max);
  };

  /* ---- the loop */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    let wasVisible = true;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(P.model.maxCatchUpS, Math.max(0, (now - last) / 1000));
      last = now;
      const on = active && isOnScreen(rootRef.current);
      if (on !== wasVisible) {
        wasVisible = on;
        setVisible(on);
      }
      const s0 = cur.current;
      if (!s0) return;
      const mayRun = on && !frozen && !otherRunner();
      if (!mayRun) {
        if (holding.current) {
          // Hand the simulator back: frozen where it stands until a station runs it again.
          holding.current = false;
          write(s0, null, true);
        }
        return;
      }
      holding.current = true;
      const r = step(K, unit.params, s0, dt);
      cur.current = r.state;
      sample(r.state);
      if (r.events.length) onEvents.current(r.events, r.state);
      if (Date.now() - lastWrite.current >= P.history.checkpointS * 1000) write(r.state, lease(), false);
      if (now - lastPaint > 200) {
        lastPaint = now;
        setTick((n) => (n + 1) % 1e9);
      }
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      last = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      if (holding.current && cur.current) {
        holding.current = false;
        write(cur.current, null, true);
      }
    };
  }, [unit.id, active, frozen]);

  const act = (a: Action) => {
    const s0 = cur.current!;
    const r = applyAction(K, unit.params, s0, a);
    cur.current = r.state;
    // Acting takes the station: this window runs the simulator from here.
    holding.current = active && !frozen;
    write(r.state, holding.current ? lease() : null, !holding.current);
    if (r.events.length) onEvents.current(r.events, r.state);
    setTick((n) => n + 1);
    return { refused: r.refused, events: r.events };
  };

  const loadIc = (id: string) => {
    const s = initialState(K, unit.params, id, icPower(unit, id));
    cur.current = s;
    trend.current = [];
    holding.current = active && !frozen;
    write(s, holding.current ? lease() : null, !holding.current);
    setTick((n) => n + 1);
  };

  const rec = shared.value.sims[unit.id];
  return {
    state: cur.current,
    running: holding.current,
    remote: !!rec?.runner && rec.runner.token !== token && rec.runner.until > Date.now(),
    frozen,
    visible,
    lastBy: rec?.by ?? null,
    trend: trend.current,
    act,
    loadIc,
    setFrozen: (f: boolean) => setFrozenState(f),
  };
}

/** Append a simulator trip to the network-wide history (owner write). */
export function recordTrip(services: Services, unitId: string, e: Extract<SimEvent, { type: 'trip' }>): SimTripRecord {
  let rec: SimTripRecord | null = null;
  services.shared.update<PlantShared>('plant', PLANT_SHARED_NONE, (prev) => {
    const seq = (prev.trips.at(-1) ? Number(prev.trips.at(-1)!.id.slice(4)) : 0) + 1;
    rec = {
      id: `SIM-${String(seq).padStart(4, '0')}`,
      unit: unitId,
      at: inWorldIso(),
      by: services.account.id.peek(),
      manual: e.manual,
      cause: e.cause,
      powerPct: e.powerPct,
    };
    const trips = [...prev.trips, rec].slice(-P.history.maxScrams);
    return { ...prev, v: 1, trips };
  });
  return rec!;
}
