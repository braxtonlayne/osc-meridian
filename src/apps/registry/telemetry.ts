/**
 * Facility Registry: telemetry seeds (from canon) and the client side of the telemetry worker.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Facility } from '@core/canon-types';
import { buildPlant } from '@graphics/reactor/model';
import type { Reading, SiteSeed, TelemetryIn, TelemetryOut } from '@sim/telemetry.worker';
import { canon } from './shared';

/**
 * Seed for one site: posted staff, berthing and, where fitted, the reactor plant model.
 * No seed when the client canon withholds the site's figures (DELTA): nothing is
 * simulated from a withheld value.
 */
export function seedFor(f: Facility): SiteSeed | null {
  if (f.class === 'DELTA' || f.staff === null || f.capacity === null) return null;
  const seed: SiteSeed = {
    id: f.id,
    cls: f.class,
    staff: f.staff,
    capacity: f.capacity,
    utcOffset: typeof f.lon === 'number' ? Math.round(f.lon / 15) + 1 : -4,
  };
  const rx = canon.reactors.find((r) => r.site === f.id);
  if (rx) {
    const plant = buildPlant(canon, rx.id);
    if (plant) {
      seed.reactor = {
        id: rx.id,
        status: rx.status,
        mwe: rx.electricMWe,
        loadMW: plant.stationLoadMW,
        thermalPct: Math.round(plant.loadFraction * 1000) / 10,
        essKV: plant.essKV,
      };
    }
  }
  return seed;
}

/** Offset (ms) that maps the real clock onto the pinned in-world date, same time of day. */
export function inWorldOffsetMs(now = new Date()): number {
  const day = Math.min(Math.max(now.getDate(), 1), 31);
  const world = Date.UTC(2008, 4, day, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
  return world - now.getTime();
}

export interface TelemetryState {
  latest: Reading | null;
  /** Oldest first; real-clock Unix seconds. */
  series: Reading[];
  /** Real-clock ms of the last frame. */
  at: number | null;
  link: 'CONNECTING' | 'LIVE' | 'NO SIMULATOR';
}

const HISTORY_SPAN = 2 * 3600;
const HISTORY_STEP = 60;
const MAX_POINTS = 240;

/** Live readings for one site from a dedicated telemetry worker. */
export function useTelemetry(seed: SiteSeed | null): TelemetryState {
  const [state, setState] = useState<TelemetryState>({ latest: null, series: [], at: null, link: 'CONNECTING' });
  const lastAppend = useRef(0);

  useEffect(() => {
    if (!seed) return;
    let worker: Worker;
    try {
      worker = new Worker(new URL('../../sim/telemetry.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      setState((s) => ({ ...s, link: 'NO SIMULATOR' }));
      return;
    }
    lastAppend.current = 0;
    setState({ latest: null, series: [], at: null, link: 'CONNECTING' });
    worker.onmessage = (e: MessageEvent<TelemetryOut>) => {
      const m = e.data;
      if (m.type === 'history' && m.id === seed.id) {
        lastAppend.current = m.samples.at(-1)?.t ?? 0;
        setState((s) => ({ ...s, series: m.samples }));
      } else if (m.type === 'frame') {
        const r = m.readings[seed.id];
        if (!r) return;
        setState((s) => {
          let series = s.series;
          // Trend at 15 s resolution once the backfill has arrived.
          if (series.length && r.t - lastAppend.current >= 15) {
            lastAppend.current = r.t;
            series = [...series, r].slice(-MAX_POINTS);
          }
          return { latest: r, series, at: Date.now(), link: 'LIVE' };
        });
      }
    };
    worker.onerror = () => setState((s) => ({ ...s, link: 'NO SIMULATOR' }));
    const post = (m: TelemetryIn): void => worker.postMessage(m);
    post({ type: 'config', sites: [seed], intervalMs: 2000 });
    post({ type: 'history', id: seed.id, end: Date.now() / 1000, span: HISTORY_SPAN, step: HISTORY_STEP });
    return () => {
      post({ type: 'stop' });
      worker.terminate();
    };
  }, [seed?.id]);

  return state;
}
