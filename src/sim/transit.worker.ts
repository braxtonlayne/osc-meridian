/// <reference lib="webworker" />
/**
 * Transit Control simulation worker. Builds the network model from canon, receives the
 * working timetable and segment sheet block arrangements (parsed on the main thread from
 * the documents) and the segment 04 window published by the narrative engine, and answers
 * each clock tick with a board snapshot. The main thread owns the clock so the board and
 * the engine's movement window always agree on the time.
 *
 * Messages in:  { type: 'config', ...Partial<SimConfig> }   { type: 'tick', now }
 *               { type: 'date', iso }  (the session's in-world date, "2008-05-19")
 * Messages out: { type: 'state', state: BoardState }
 */
import { setInWorldDate } from './time';
import { createSim, EMPTY_CONFIG, type SimConfig } from './transit-sim';

const sim = createSim();
let cfg: SimConfig = { ...EMPTY_CONFIG };
let last = Date.now();

function post(now: number): void {
  last = now;
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ type: 'state', state: sim.state(now, cfg) });
}

self.onmessage = (ev: MessageEvent) => {
  const { type, now, iso, ...rest } = ev.data as { type: string; now?: number; iso?: string } & Partial<SimConfig>;
  if (type === 'date') {
    if (typeof iso === 'string') setInWorldDate(iso);
    post(last);
  } else if (type === 'config') {
    cfg = { ...cfg, ...rest };
    post(last);
  } else if (type === 'tick') post(typeof now === 'number' ? now : Date.now());
};
