/**
 * Shared plant state key `pa` (owner: pa app; docs/CONTRACTS.md "Shared plant state").
 * Other apps read it with `import type { PaState } from '@apps/pa/types'` and
 * `services.shared.get<PaState>('pa', PA_EMPTY)`; only the pa app writes it.
 *
 * The key holds the requests made of the zone controllers (append-only, newest last) and the
 * cancellations. What is on air, queued, pre-empted or complete is derived from them and the
 * clock by `simulate` in `./model`, so every tab and account sees the same broadcast log.
 */
import type { AccountId } from '@core/contracts';

export type PaSource = 'operator' | 'drill' | 'isolation' | 'test';

export interface PaRequest {
  /** "PA-0519-0007": in-world month/day and controller serial. */
  id: string;
  /** Wall-clock ms the request reached the controller. */
  at: number;
  /** Originating account, or 'system' for automatic broadcasts. */
  by: AccountId | 'system';
  /** Console site (facility id) or "NETWORK" for automatic network messages. */
  origin: string;
  source: PaSource;
  /** Library message number ("31"). */
  msg: string;
  /** Zones as selected: level zones "A02-Z05", areas "A02-MP1", division zones "A03-RD", "A02-ALL", "NET-ALL". */
  zones: string[];
  /** Amplifier channel keys the call occupies: "A02-Z05", "A02-*" (site), "*" (network). */
  keys: string[];
  /** 1 (life safety) .. 5 (test); lower pre-empts higher. */
  priority: number;
  /** Airtime: pre tones + message x repeats + post tones. */
  durationMs: number;
  /** Drill id or isolation reference for automatic broadcasts. */
  ref?: string;
  /** Idempotency key for automatic broadcasts ("drill:SD-08-0519-01:order:ALPHA-02"). */
  autoKey?: string;
}

export interface PaCancel {
  id: string;
  at: number;
  by: AccountId;
}

export interface PaState {
  v: 1;
  /** Last controller serial issued. */
  serial: number;
  requests: PaRequest[];
  cancels: PaCancel[];
}

export const PA_EMPTY: PaState = { v: 1, serial: 0, requests: [], cancels: [] };

/** Derived status of a request at a given time. */
export type PaStatus = 'QUEUED' | 'ON AIR' | 'COMPLETE' | 'PRE-EMPTED' | 'CANCELLED' | 'LAPSED';

export interface PaOutcome {
  status: PaStatus;
  start: number | null;
  end: number | null;
  /** Request id that pre-empted this one. */
  preemptedBy?: string;
}
