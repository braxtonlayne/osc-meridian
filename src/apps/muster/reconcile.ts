/**
 * Headless drill musters, run by the shell's plant reconciler while no Muster Board window is
 * open in this tab. A seal drill reaching a site starts that site's muster (derived from the
 * drill, `drillRuns`); this stores those runs in shared key `muster` so other readers (CCTV,
 * System) see them, and sends the "unaccounted at report time" notice to the account
 * responsible for the site, once per run, exactly as the board does.
 */
import type { DrillState, Services } from '@core/contracts';
import { formatInWorldDate } from '@core/session';
import { drillRuns, evaluate, upsertRun } from './model';
import { INPUTS, MC, MUSTER_SITES, TS, permsFor, zuluOf } from './common';
import { MUSTER_NONE, type MusterRun, type MusterState } from './types';

/** Shared keys whose change runs this reconciler, with the fallback each is read with. */
export const KEYS: Record<string, unknown> = { drill: null, muster: MUSTER_NONE };

const KEY = 'muster';
const MAX_RUNS = 60;

function write(services: Services, fn: (s: MusterState) => MusterState): void {
  services.shared.update<MusterState>(KEY, MUSTER_NONE, (s0) => {
    const s = s0 ?? MUSTER_NONE;
    const next = fn(s);
    if (next === s) return s;
    return next.runs.length > MAX_RUNS ? { ...next, runs: next.runs.slice(next.runs.length - MAX_RUNS) } : next;
  });
}

/** Account that receives a drill muster's report: the resident account with control at the site. */
function responsible(services: Services, r: MusterRun): string | undefined {
  if (r.by !== 'drill') return r.by;
  const d = services.account.all().find((a) => a.id === MC.siteAccounts[r.site]);
  return d && permsFor(d).controlSite === r.site ? d.id : undefined;
}

export function reconcile(services: Services, now: number): void {
  const drill = services.shared.get<DrillState | null>('drill', null).peek();
  const state = services.shared.get<MusterState>(KEY, MUSTER_NONE).peek() ?? MUSTER_NONE;
  const stored = new Set(state.runs.map((r) => r.id));
  const fresh = drillRuns(drill, MUSTER_SITES).filter((r) => !stored.has(r.id));
  if (fresh.length) {
    write(services, (s) => {
      const have = new Set(s.runs.map((r) => r.id));
      const add = fresh.filter((r) => !have.has(r.id));
      return add.length ? { ...s, runs: [...s.runs, ...add] } : s;
    });
  }

  const me = services.account.id.peek();
  const runs = (services.shared.get<MusterState>(KEY, MUSTER_NONE).peek() ?? MUSTER_NONE).runs;
  for (const run of runs) {
    if (run.closeout || run.notices.includes('unaccounted') || responsible(services, run) !== me) continue;
    const v = evaluate(run, now, INPUTS, TS);
    if (!v || v.closed || !v.reportDue || v.totals.unaccounted === 0) continue;
    let won = false;
    write(services, (s) => {
      const existing = s.runs.find((r) => r.id === run.id);
      if (existing?.notices.includes('unaccounted')) return s;
      won = true;
      return upsertRun(s, run, (r) => ({ ...r, notices: [...r.notices, 'unaccounted'] }));
    });
    if (!won) continue;
    const id = MC.mail.unaccounted;
    services.mail.deliver(id, {
      slots: { date: formatInWorldDate(new Date(now)), run: run.id, site: run.site, count: String(v.totals.unaccounted), report: zuluOf(run.startedAt + (v.model.cls.reportMin * 60000) / TS) },
      repeat: services.mail.delivered.peek().includes(id),
    });
  }
}
