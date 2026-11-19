/**
 * Live plant display: mirrors the facility telemetry worker (src/sim/telemetry.worker.ts, read
 * only) for one installation. The worker gives thermal power, station load, frequency, essential
 * bus voltage and the diesel state; the remaining panel instruments are dressed from the
 * simulator model's steady state at the telemetered power (same constants as the trainer).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Reading, SiteSeed, TelemetryIn, TelemetryOut } from '@sim/telemetry.worker';
import { K, P } from './data';
import type { UnitDef } from './data';
import { conditions, steadyState } from './model';
import type { SimState } from './types';

export interface LiveHandle {
  latest: Reading | null;
  /** Oldest first, real-clock Unix seconds. */
  series: Reading[];
  link: 'CONNECTING' | 'LIVE' | 'NO SIMULATOR' | 'CIRCUIT DOWN' | 'NOT SHOWN';
  /** Panel state dressed from the telemetered power (null until the first frame). */
  state: SimState | null;
}

/** Telemetry seed for a unit: the same seed the Facility Registry uses where the site is released. */
export function seedFor(u: UnitDef): SiteSeed | null {
  const r = u.reactor;
  const plant = u.plant;
  if (!r || !plant) return null;
  const f = u.facility;
  const reactor = {
    id: r.id,
    status: r.status,
    mwe: r.electricMWe,
    loadMW: plant.stationLoadMW,
    thermalPct: Math.round(plant.loadFraction * 1000) / 10,
    essKV: plant.essKV,
  };
  if (f && f.staff !== null && f.capacity !== null) {
    return { id: f.id, cls: f.class, staff: f.staff, capacity: f.capacity, utcOffset: typeof f.lon === 'number' ? Math.round(f.lon / 15) + 1 : -4, reactor };
  }
  // Site withheld from this workstation: the unit is watched under its own id.
  return { id: r.id, cls: 'BETA', staff: 0, capacity: 0, reactor };
}

/** Steady-state dressing of the live panel from a telemetry frame. */
export function liveState(u: UnitDef, r: Reading): SimState {
  const p = Math.max(0, (r.power.thermalPct ?? 0) / 100);
  const s = steadyState(K, u.params, p);
  const unitOn = r.power.source === 'REACTOR UNIT';
  const out: SimState = {
    ...s,
    gen: unitOn,
    turbineLatched: unitOn,
    demand: unitOn ? p : 0,
    diesel: r.power.diesel === 'RUNNING' ? 'RUN' : 'AUTO',
    mode: unitOn ? 'RUN' : 'SHUTDOWN',
  };
  // Live windows show steady (acknowledged) indications: a remote display has no horn.
  const cond = conditions(K, u.params, out);
  const ann = { ...out.ann };
  for (const [id, on] of Object.entries(cond) as [keyof SimState['ann'], boolean][]) ann[id] = on ? { seq: 'ack', abnormal: true } : { seq: 'normal', abnormal: false };
  return { ...out, ann };
}

export function useLive(u: UnitDef | null, enabled: boolean, circuitUp: boolean): LiveHandle {
  const [h, setH] = useState<LiveHandle>({ latest: null, series: [], link: 'CONNECTING', state: null });
  const lastAppend = useRef(0);
  const seed = u ? seedFor(u) : null;

  useEffect(() => {
    if (!u || !seed) {
      setH({ latest: null, series: [], link: 'NOT SHOWN', state: null });
      return;
    }
    if (!enabled) return;
    if (!circuitUp) {
      setH({ latest: null, series: [], link: 'CIRCUIT DOWN', state: null });
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL('../../sim/telemetry.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      setH((s) => ({ ...s, link: 'NO SIMULATOR' }));
      return;
    }
    lastAppend.current = 0;
    setH({ latest: null, series: [], link: 'CONNECTING', state: null });
    worker.onmessage = (e: MessageEvent<TelemetryOut>) => {
      const m = e.data;
      if (m.type === 'history' && m.id === seed.id) {
        lastAppend.current = m.samples.at(-1)?.t ?? 0;
        setH((s) => ({ ...s, series: m.samples }));
      } else if (m.type === 'frame') {
        const r = m.readings[seed.id];
        if (!r) return;
        setH((s) => {
          let series = s.series;
          if (series.length && r.t - lastAppend.current >= 15) {
            lastAppend.current = r.t;
            series = [...series, r].slice(-240);
          }
          return { latest: r, series, link: 'LIVE', state: liveState(u, r) };
        });
      }
    };
    worker.onerror = () => setH((s) => ({ ...s, link: 'NO SIMULATOR' }));
    const post = (m: TelemetryIn) => worker.postMessage(m);
    post({ type: 'config', sites: [seed], intervalMs: P.live.intervalMs });
    post({ type: 'history', id: seed.id, end: Date.now() / 1000, span: P.history.liveHistorySpanS, step: P.history.liveHistoryStepS });
    return () => {
      post({ type: 'stop' });
      worker.terminate();
    };
  }, [u?.id, enabled, circuitUp]);

  return h;
}

/** Canon status of a unit as a status word. */
export function canonStatus(u: UnitDef): 'NOMINAL' | 'DEGRADED' | 'FAULT' | 'OFFLINE' {
  return u.reactor?.status ?? 'NOMINAL';
}

