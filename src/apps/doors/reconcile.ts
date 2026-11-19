/**
 * Headless seal-drill reaction for the door board (run by the shell's plant reconciler while no
 * door board window is open in this tab): writes the drill's close schedules, and the
 * stand-down reopen, into shared key `doors` exactly as the board does (`applyDrill`, pure and
 * deterministic, so concurrent writers agree).
 */
import type { DrillState, Services } from '@core/contracts';
import * as session from '@core/session';
import { applyDrill, trimLog } from './model';
import { DOORS_EMPTY, type DoorLogLine, type DoorsState } from './types';

/** Shared keys whose change runs this reconciler, with the fallback each is read with. */
export const KEYS: Record<string, unknown> = { drill: null, doors: DOORS_EMPTY };

export function reconcile(services: Services, now: number): void {
  const drill = services.shared.get<DrillState | null>('drill', null).peek();
  if (!drill) return;
  const r = applyDrill(services.shared.get<DoorsState>('doors', DOORS_EMPTY).peek() ?? DOORS_EMPTY, drill, now);
  if (!r) return;
  const lines: DoorLogLine[] = r.lines.map((l) => ({ ...l, door: l.site, atIso: session.inWorldIso(new Date(l.at)), by: 'drill' }));
  services.shared.set<DoorsState>('doors', { ...r.next, log: trimLog([...r.next.log, ...lines]) });
}
