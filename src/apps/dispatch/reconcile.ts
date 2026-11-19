/**
 * Headless desk housekeeping, run by the shell's plant reconciler while no Dispatcher
 * Workstation window is open in this tab. Same rules as the desk's own housekeeping effect:
 * latch holds that have reached a train (`settle`) and send the "held by network isolation"
 * notice once per train and isolation.
 *
 * It also latches an isolation that began and cleared while nobody watched: a train that was
 * running when the isolation was initiated was brought to a stand there, and stays held until
 * released at the desk (dispatch.md: holds are latched until released at the desk). Without
 * this the train would appear to have run straight through an unwatched isolation.
 *
 * Writes only when a hold is latched or a record is withdrawn, so a desk open elsewhere (which
 * uses the block sheets on top of the same model) never fights it over derived status.
 */
import type { AccountId, DrillState, IsolationState, Services } from '@core/contracts';
import { formatInWorldDate } from '@core/session';
import { ISOLATION_NONE, isolationPeriods } from '@apps/isolate/state';
import { runLegs, runState, type SimModel } from '@sim/transit-model';
import { BASE_MODEL } from './data';
import { DSP, plantOf, settle } from './logic';
import type { DispatchHold, DispatchRecord } from './types';

/** Shared keys whose change runs this reconciler, with the fallback each is read with. */
export const KEYS: Record<string, unknown> = { dispatch: [], isolation: ISOLATION_NONE, drill: null };

/** Isolations initiated while the train was running (wall ms between its clock and its unheld arrival). */
export function missedIsolations(model: SimModel, r: DispatchRecord, iso: IsolationState, now: number): DispatchHold[] {
  if (r.status === 'cancelled' || r.status === 'arrived' || r.withdrawn) return [];
  const legs = runLegs(model, r.route, r.dwellMs) ?? [];
  const total = legs.length ? legs[legs.length - 1]!.end : 0;
  const arrive = r.clock.at + Math.max(0, total - r.clock.elapsed) / (r.timeScale ?? 1);
  const known = new Set([...r.holds.map((h) => h.ref), ...r.released]);
  return isolationPeriods(iso, now)
    .filter((p) => !known.has(p.ref) && p.from >= r.clock.at && p.from < arrive && p.from <= now)
    .map((p) => ({ ref: p.ref, kind: 'isolation' as const, at: p.from }));
}

function step(model: SimModel, r: DispatchRecord, iso: IsolationState, drill: DrillState | null, now: number): DispatchRecord {
  const missed = missedIsolations(model, r, iso, now);
  const base = missed.length ? { ...r, holds: [...r.holds, ...missed] } : r;
  const s = settle(model, base, plantOf(iso, drill), now);
  // Only latches and withdrawals are written headlessly (see header).
  return s.holds.length !== r.holds.length || s.withdrawn !== r.withdrawn ? s : r;
}

export function reconcile(services: Services, now: number, model: SimModel = BASE_MODEL): void {
  const recs = services.shared.get<DispatchRecord[]>('dispatch', []).peek() ?? [];
  if (!recs.length) return;
  const iso = services.shared.get<IsolationState>('isolation', ISOLATION_NONE).peek() ?? ISOLATION_NONE;
  const drill = services.shared.get<DrillState | null>('drill', null).peek();
  if (recs.some((r) => step(model, r, iso, drill, now) !== r)) {
    services.shared.update<DispatchRecord[]>('dispatch', [], (prev) => (prev ?? []).map((r) => step(model, r, iso, drill, now)));
  }

  const me = services.account.id.peek();
  const plant = plantOf(iso, drill);
  for (const r of services.shared.get<DispatchRecord[]>('dispatch', []).peek() ?? []) {
    const st = runState(model, r, plant, now);
    for (const h of st.heldBy) {
      if (h.kind !== 'isolation' || r.notified.includes(`iso:${h.ref}`)) continue;
      let won = false;
      services.shared.update<DispatchRecord[]>('dispatch', [], (prev) =>
        (prev ?? []).map((x) => {
          if (x.ref !== r.ref || x.notified.includes(`iso:${h.ref}`)) return x;
          won = true;
          return { ...x, notified: [...x.notified, `iso:${h.ref}`] };
        }),
      );
      if (!won) continue;
      const to = r.by as AccountId;
      if (to === me) services.mail.deliver(DSP.mail.isolationHold, { slots: { date: formatInWorldDate() }, repeat: services.mail.delivered.peek().includes(DSP.mail.isolationHold) });
      else services.traces.post({ to, kind: 'mail.deliver', msgId: DSP.mail.isolationHold, subject: 'Movement held: network isolation' });
      services.audit.log('control', 'dispatch:held', `Movement ${r.ref} brought to a stand by network isolation ${h.ref}; notice sent to the entering desk.`, { ref: r.ref, hold: h.ref, by: r.by });
    }
  }
}
