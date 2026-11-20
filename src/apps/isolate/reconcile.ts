/**
 * Headless isolation housekeeping, run by the shell's plant reconciler while no isolation panel
 * is open in this tab. Same rules as the panel: restore automatically once the line checks
 * complete (`expire` at `clearsAt`), and apply a restoration decision the deputy returned
 * through the forms queue (`form.decided`) to the pending certificate. Both are pure updates of
 * shared key `isolation` that return null when there is nothing to do, so tabs agree.
 */
import type { Services } from '@core/contracts';
import { inWorldIso } from '@core/session';
import { decideCertificate, expire, normalize, NONE, pendingCert } from './logic';
import { cfg } from './model';
import type { IsolateState } from './types';

/** Shared keys whose change runs this reconciler, with the fallback each is read with. */
export const KEYS: Record<string, unknown> = { isolation: NONE, traces: [] };

const KEY = 'isolation';

export function reconcile(services: Services, now: number): void {
  const write = (fn: (prev: IsolateState) => IsolateState | null) => services.shared.update<IsolateState>(KEY, NONE, (prev) => fn(normalize(prev)) ?? prev);
  const s = normalize(services.shared.get<IsolateState>(KEY, NONE).peek());

  if (s.active && s.clearsAt != null && now >= s.clearsAt) {
    write((prev) => expire(prev, cfg, now, (ms) => inWorldIso(new Date(ms))));
  }

  const pend = pendingCert(normalize(services.shared.get<IsolateState>(KEY, NONE).peek()));
  if (!pend) return;
  const d = services.traces.all.peek().find((t) => t.kind === 'form.decided' && t.from === 'deputy' && (t.data?.receipt === pend.cert || t.subject === pend.cert));
  if (!d) return;
  const decision = d.data?.decision === 'approved' ? 'approved' : 'returned';
  write((prev) => decideCertificate(prev, cfg, { cert: pend.cert, decision, by: 'deputy', iso: d.at, note: d.data?.note, now }));
}
