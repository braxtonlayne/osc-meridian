/**
 * Headless automatic broadcasts (DIR-0458 para 7), run by the shell's plant reconciler while no
 * PA console is open in this tab: the zone controllers log the seal drill and isolation calls
 * whether or not anyone is at a console. Same rule as the console (`autoBroadcasts` +
 * `appendRequests`, idempotent by autoKey and written with the original event times).
 */
import type { DrillState, IsolationState, Services } from '@core/contracts';
import { IN_WORLD_DATE_ISO } from '@core/session';
import { ISOLATION_NONE } from '@apps/isolate/state';
import { appendRequests, autoBroadcasts } from './model';
import { PA_EMPTY, type PaState } from './types';

/** Shared keys whose change runs this reconciler, with the fallback each is read with. */
export const KEYS: Record<string, unknown> = { drill: null, isolation: ISOLATION_NONE, pa: PA_EMPTY };

/** Last `active` seen (only for old isolation values that carry no clear time). */
let lastActive = false;

export function reconcile(services: Services, now: number): void {
  const drill = services.shared.get<DrillState | null>('drill', null).peek();
  const iso = services.shared.get<IsolationState>('isolation', ISOLATION_NONE).peek() ?? ISOLATION_NONE;
  const add = autoBroadcasts(drill, iso, now, { isolationActive: lastActive });
  lastActive = iso.active;
  if (!add.length) return;
  const state = services.shared.get<PaState>('pa', PA_EMPTY).peek() ?? PA_EMPTY;
  const have = new Set(state.requests.map((r) => r.autoKey).filter(Boolean));
  if (add.every((a) => a.autoKey && have.has(a.autoKey))) return;
  services.shared.update<PaState>('pa', PA_EMPTY, (prev) => appendRequests(prev ?? PA_EMPTY, add, IN_WORLD_DATE_ISO));
}
