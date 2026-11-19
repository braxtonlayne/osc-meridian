/**
 * MERIDIAN narrative engine entry point.
 *
 *   startNarrative()  wires the runtime to the Services singleton and the
 *                     persist layer (key "narrative"). Call once after the
 *                     session, audit trail and mail stores are initialised.
 *
 * The rules themselves are a pure reducer in ./rules.ts; the runtime that
 * applies their effects is ./runtime.ts. Apps read the segment 04 movement
 * from ./seg04.ts and may use formRefusal() for in-form refusals.
 */
import { services } from '@core/services';
import { load, save } from '@core/persist';
import { createRuntime } from './runtime';
import type { NarrativeRuntime } from './runtime';

export { reduce, initialState, formRefusal, WORKSTATION } from './rules';
export type { NarrativeState, NarrativeEvent, Effect } from './rules';
export { seg04, seg04Blocks, seg04LogLine, seg04LogVisible, seg04WatchData, seg04WatchDetail, SEG04_CONSIST_LABEL } from './seg04';

let running: Promise<NarrativeRuntime> | null = null;

export function startNarrative(): Promise<NarrativeRuntime> {
  running ??= createRuntime(services, {
    load: () => load<unknown>('narrative', null),
    save: (s) => save('narrative', s, 250),
    now: () => Date.now(),
    every: (ms, fn) => {
      const h = setInterval(fn, ms);
      return () => clearInterval(h);
    },
  });
  return running;
}
