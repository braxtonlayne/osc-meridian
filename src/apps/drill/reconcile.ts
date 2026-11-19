/**
 * Headless ticker for the Seal Drill Coordinator (run by the shell's plant reconciler,
 * src/shell/reconcile.ts, while no coordinator window is open in this tab). Same rules as the
 * coordinator's own ticker in App.tsx: evaluate the drill, keep `drill` fresh (tickedAt), keep
 * the `drill-register` summary in step, and send this account's drill mail once per drill.
 * Pure of UI; deterministic, so tabs and accounts that run it at once agree.
 */
import type { IsolationState, Services } from '@core/contracts';
import { inWorldDateText } from '@sim/time';
import { isolatedAt, ISOLATION_NONE } from '@apps/isolate/state';
import { evaluate, toRecord } from './model';
import { canon, frag, zl } from './shared';
import { DRILL_KEY, REGISTER_KEY, type DrillRecord, type DrillStateExt } from './types';

/** Shared keys whose change runs this reconciler, with the fallback each is read with. */
export const KEYS: Record<string, unknown> = { [DRILL_KEY]: null, [REGISTER_KEY]: [], isolation: ISOLATION_NONE };

function syncRegister(services: Services, s: DrillStateExt): void {
  services.shared.update<DrillRecord[]>(REGISTER_KEY, [], (prev) => {
    const list = Array.isArray(prev) ? prev : [];
    const i = list.findIndex((r) => r.id === s.id);
    const rec = toRecord(s, i >= 0 ? list[i] : undefined);
    if (i >= 0 && JSON.stringify(list[i]) === JSON.stringify(rec)) return list;
    const out = i >= 0 ? list.map((r, k) => (k === i ? rec : r)) : [...list, rec];
    return out.slice(-frag.registerCap);
  });
}

export function reportSlots(r: DrillRecord, now: number): Record<string, string> {
  return {
    date: inWorldDateText(now),
    drill: r.id,
    ordered: zl(r.orderedAt),
    ended: r.endedAt ? zl(r.endedAt) : 'Not recorded',
    result: r.phase === 'aborted' ? 'ABORTED' : r.endedBy === 'network-control' ? 'STOOD DOWN BY NETWORK CONTROL AFTER THE HOLD' : 'STOOD DOWN BY THE ORDERING OFFICER',
    sites: String(r.sites),
    sealed: String(r.sealed),
    late: r.late.length ? r.late.join(', ') : 'NONE',
    noReport: r.noReport.length ? r.noReport.join(', ') : 'NONE',
    sequence: r.outOfSequence.length ? r.outOfSequence.join(', ') : 'NONE',
    observer: r.observer ? 'OIA, ALPHA-01' : 'NONE',
    second: r.secondOfficer || 'Not recorded',
    circuits: r.isolated ? 'HUB CIRCUITS DOWN DURING THE DRILL. ORDER NOT PASSED BEYOND THE EASTERN NETWORK.' : 'HUB CIRCUITS IN SERVICE.',
  };
}

export function reconcile(services: Services, now: number): void {
  const cur = services.shared.get<DrillStateExt | null>(DRILL_KEY, null).peek();
  if (cur && cur.v === 1 && (cur.phase === 'propagating' || cur.phase === 'sealed')) {
    const iso = isolatedAt(services.shared.get<IsolationState>('isolation', ISOLATION_NONE).peek(), now);
    const next = evaluate(cur, now, iso, canon, { holdMin: frag.holdMin });
    if (next !== cur || now - cur.tickedAt >= 1000) {
      services.shared.set(DRILL_KEY, next === cur ? { ...next, tickedAt: now } : next);
      if (next !== cur) syncRegister(services, next);
    }
  } else if (cur && cur.v === 1) {
    // Ended: make sure the register carries the final result (a coordinator may have closed first).
    const reg = services.shared.get<DrillRecord[]>(REGISTER_KEY, []).peek();
    const r = reg.find((x) => x.id === cur.id);
    if (!r || r.phase !== cur.phase) syncRegister(services, cur);
  }

  // Mail consequences for this account (flags in the register make each one once only).
  const me = services.account.id.peek();
  for (const r of services.shared.get<DrillRecord[]>(REGISTER_KEY, []).peek()) {
    const ended = r.phase === 'stand-down' || r.phase === 'aborted';
    const patch: DrillRecord['mailed'] = {};
    if (r.by === me && r.noReport.length && !r.mailed.noReport) {
      services.mail.deliver(frag.mail.noReport, {
        repeat: true,
        slots: { date: inWorldDateText(now), drill: r.id, sites: r.noReport.join(', '), count: String(r.noReport.length), ordered: zl(r.orderedAt) },
      });
      patch.noReport = true;
    }
    if (r.by === me && ended && !r.mailed.report) {
      services.mail.deliver(frag.mail.report, { repeat: true, slots: reportSlots(r, now) });
      patch.report = true;
    }
    if (ended && !r.mailed.oia) {
      if (r.observer) {
        if (r.by === me) services.mail.deliver(frag.mail.oiaObserved);
        else services.traces.post({ to: r.by, kind: 'mail.deliver', msgId: frag.mail.oiaObserved, subject: `OIA observation of seal drill ${r.id}` });
      } else if (me === 'auditor') services.mail.deliver(frag.mail.oiaUnobserved);
      else services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: frag.mail.oiaUnobserved, subject: `Seal drill ${r.id} held without an OIA observer` });
      patch.oia = true;
    }
    if (Object.keys(patch).length) {
      services.shared.update<DrillRecord[]>(REGISTER_KEY, [], (prev) => prev.map((x) => (x.id === r.id ? { ...x, mailed: { ...x.mailed, ...patch } } : x)));
    }
  }
}
