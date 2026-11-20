/**
 * Registry of headless plant reconcilers (lazy chunk, loaded by ./reconcile.ts after sign-in).
 * Each entry is an app's pure `reconcile(services, now)` from its small reconcile module (never
 * its App chunk) and the shared keys whose change should run it at once. Order matters within a
 * pass: the drill ticks first, then the plant that reacts to it.
 */
import type { AppId, Services } from '@core/contracts';
import * as drill from '@apps/drill/reconcile';
import * as isolate from '@apps/isolate/reconcile';
import * as doors from '@apps/doors/reconcile';
import * as pa from '@apps/pa/reconcile';
import * as muster from '@apps/muster/reconcile';
import * as dispatch from '@apps/dispatch/reconcile';
import * as environ from '@apps/environ/reconcile';

export interface Reconciler {
  app: AppId;
  /** Shared keys whose change runs it, with the fallback each is read with (the owner's). */
  keys: Readonly<Record<string, unknown>>;
  reconcile(services: Services, now: number): void;
}

export const RECONCILERS: Reconciler[] = [
  { app: 'drill', keys: drill.KEYS, reconcile: drill.reconcile },
  { app: 'isolate', keys: isolate.KEYS, reconcile: isolate.reconcile },
  { app: 'doors', keys: doors.KEYS, reconcile: doors.reconcile },
  { app: 'pa', keys: pa.KEYS, reconcile: pa.reconcile },
  { app: 'muster', keys: muster.KEYS, reconcile: muster.reconcile },
  { app: 'dispatch', keys: dispatch.KEYS, reconcile: (s, now) => dispatch.reconcile(s, now) },
  { app: 'environ', keys: environ.KEYS, reconcile: environ.reconcile },
];
