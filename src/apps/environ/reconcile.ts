/**
 * Headless plant integration for the GAMMA-08 environmental panel, run by the shell's plant
 * reconciler while no panel window is open in this tab, and only for the site operator (the
 * only writer of shared key `environ`). Same rules as the panel: write the initial state if the
 * plant has never been opened, checkpoint every `checkpointEveryRealSec` (integrating from the
 * stored checkpoint, with the seal taken from the drill so recirculation follows it), and track
 * a CO2 excursion, reporting it once when it has lasted `excursionMin` plant minutes.
 */
import type { DrillState, Services } from '@core/contracts';
import * as session from '@core/session';
import { advance, defaultState, trimLog } from './model';
import { EC, TIME_SCALE, modelEnv } from './plant';
import { zl } from './common';
import type { EnvironSample, EnvironState } from './types';

/** Shared keys whose change runs this reconciler, with the fallback each is read with. */
export const KEYS: Record<string, unknown> = { environ: null, drill: null };

let peak = 0;

export function reconcile(services: Services, now: number): void {
  const acct = services.account.def.peek();
  if (acct.id !== 'lifesupport' || acct.site !== EC.site) return;
  const drill = services.shared.get<DrillState | null>('drill', null).peek();
  const env = modelEnv(drill);
  const cur = services.shared.get<EnvironState | null>('environ', null).peek();
  if (!cur) {
    services.shared.set('environ', defaultState(env, now));
    return;
  }

  const fresh: EnvironSample[] = [];
  const cursor = advance({ at: cur.checkpoint.at, plant: cur.checkpoint.plant }, cur.controls, cur.filters, env, now, (s) => fresh.push(s));
  const ev = (text: string) => [...cur.events, { at: session.inWorldIso(new Date(now)), w: now, by: acct.id, text }].slice(-60);

  // Excursion tracking (as the panel does for the operator).
  const c = cursor.plant.co2Ppm;
  const ex = cur.excursion;
  let patch: Partial<EnvironState> | null = null;
  if (c >= EC.limits.co2Warn) {
    peak = Math.max(peak, c, ex.peak);
    if (ex.since == null) patch = { excursion: { since: cursor.at, peak: Math.round(c), reported: false }, events: ev(`CO2 above ${EC.limits.co2Warn} ppm`) };
    else if (!ex.reported && ((cursor.at - ex.since) / 1000) * TIME_SCALE >= EC.limits.excursionMin * 60) {
      const pk = Math.round(peak);
      patch = { excursion: { since: ex.since, peak: pk, reported: true } };
      services.mail.deliver(EC.mail.excursion, {
        repeat: true,
        slots: { date: session.formatInWorldDate(new Date(now)), time: zl(ex.since), peak: String(pk), limit: String(EC.limits.co2Warn) },
      });
    }
  } else if (ex.since != null) {
    peak = 0;
    patch = { excursion: { since: null, peak: ex.peak, reported: false }, events: ev(`CO2 below ${EC.limits.co2Warn} ppm`) };
  }

  const due = now - cur.checkpoint.at >= EC.model.checkpointEveryRealSec * 1000;
  if (!patch && !due) return;
  services.shared.set<EnvironState>('environ', {
    ...cur,
    ...patch,
    rev: cur.rev + 1,
    checkpoint: { at: cursor.at, plant: cursor.plant },
    log: trimLog([...cur.log, ...fresh], env, cursor.at),
  });
}
