/**
 * Shared plant state key `patch` (owner: the Hub Circuit Patch Panel, src/apps/patch).
 *
 * Read it from any app or the shell with a type-only import:
 *
 *   import type { PatchState } from '@apps/patch/types';
 *   const patch = services.shared.get<PatchState | null>('patch', null);
 *
 * Only the patch app writes it. The key is absent until someone first operates a bay: treat
 * `null` (or a missing key) as "every circuit normal-through, nothing on test, every hub pair UP".
 *
 * What it holds
 * - `cords`: every patch cord standing in every bay (one bay per ALPHA hub, plus the GAMMA-08
 *   terminal block). A cord joins two jacks of one bay. Jack ids are `<circuitId>/L` (line side,
 *   towards the cable), `<circuitId>/E` (equipment side, towards the site switch or multiplexer),
 *   or a bay utility `<siteCode>/TST|OPR|MON|LB` (test set, operator position, monitor, loopback
 *   plug). A circuit with no cord in either jack is normal-through.
 * - `tests`: recent circuit tests, newest last (tone, loopback, line quality), with readings.
 * - `calls`: recent calls placed from an operator position, newest last.
 * - `links`: summary per hub pair, for the taskbar notification area and the system monitor.
 *
 * `links` (for the shell)
 * - Keyed by the two hub ids sorted and joined with `|`: `"ALPHA-01|ALPHA-03"`. One entry per
 *   inter-hub route in revenue service (rail segments 01, 02, 03, 05, 06). There is no entry for
 *   segment 04 (no circuits are assigned on it).
 * - `state` reflects patching and test faults only. It does NOT apply network isolation: a reader
 *   showing link state applies `isolation` itself (isolatedAt in src/shell/isolation.tsx), as the
 *   taskbar already does. The patch app also treats every inter-site circuit as dead while
 *   isolated, but never writes that into `links`, so the summary is right again the moment the
 *   isolation clears.
 * - `UP`: the data bearer (key distribution network) is in service on its own pair or on a spare.
 *   `DEGRADED`: the bearer is in service but a voice circuit on the route is out of service,
 *   on test, or failing its limits, or the bearer itself is failing its limits. `DOWN`: the bearer
 *   is out of service (its pair is patched away, opened, or carried to the wrong hub).
 * - `since` is wall-clock ms of the last change of `state`; `note` is a security-office line.
 */
import type { AccountId } from '@core/contracts';

/** A jack: `<circuitId>/L`, `<circuitId>/E`, or `<siteCode>/TST|OPR|MON|LB` (siteCode e.g. A03, G08). */
export type JackId = string;

export type CordPurpose = 'repatch' | 'test' | 'call' | 'monitor' | 'loop';

export interface PatchCord {
  /** "PC-<serial>" */
  id: string;
  /** Bay (facility id) the cord stands in. */
  site: string;
  a: JackId;
  b: JackId;
  purpose: CordPurpose;
  by: AccountId;
  /** In-world ISO time the cord was inserted. */
  at: string;
  /** Wall-clock ms the cord was inserted. */
  wall: number;
  /** Circuit order or authority quoted for a repatch ("CDR-A02/…"), null when none was held. */
  order: string | null;
  /** False for a trunk or network repatch made without an order (reported to Network Operations). */
  authorised: boolean;
}

export type TestKind = 'tone' | 'loopback' | 'quality';
export type TestResult = 'PASS' | 'MARGINAL' | 'FAIL';

export interface CircuitTest {
  /** "CT-<yy>-<serial>" */
  id: string;
  site: string;
  circuit: string;
  kind: TestKind;
  by: AccountId;
  at: string;
  wall: number;
  result: TestResult;
  /** One line, test desk phrasing ("Loss 7.9 dB at 1004 Hz, expected 5.5 dB ±1.0"). */
  summary: string;
  /** Final readings by name (lossDb, noiseDbrnc0, snrDb, berExp, esPerHour, loopMs). */
  readings: Record<string, number>;
  /** Line quality test: one value per sample of the primary measurement (noise dBrnC0 or ES/h). */
  samples?: number[];
}

export type CallOutcome = 'answered' | 'intercept' | 'busy' | 'no-reply' | 'dead' | 'no-dial-tone' | 'abandoned';

export interface CallRecord {
  /** "CL-<serial>" */
  id: string;
  site: string;
  circuit: string;
  /** Digits dialled; empty for a ringdown circuit. */
  number: string;
  /** Far-end site of the call (null for a call that never left the bay). */
  farSite: string | null;
  by: AccountId;
  at: string;
  wall: number;
  outcome: CallOutcome;
  /** Section that answered, as it answered ("Two-one-zero-zero, Duty Officer."). */
  answer?: string;
  durationS: number;
}

export type HubLinkState = 'UP' | 'DEGRADED' | 'DOWN';

export interface HubLinkSummary {
  a: string;
  b: string;
  /** Rail segment the circuits run on ("05"). */
  segment: string;
  state: HubLinkState;
  /** Voice circuits on the route in service / assigned. */
  voiceUp: number;
  voiceTotal: number;
  /** Data bearer in service (0 or 1) / assigned. */
  dataUp: number;
  dataTotal: number;
  note: string;
  since: number;
}

export interface PatchState {
  v: 1;
  cords: PatchCord[];
  tests: CircuitTest[];
  calls: CallRecord[];
  links: Record<string, HubLinkSummary>;
  /** Next serial for cords, tests and calls. */
  serial: number;
  /** Wall-clock ms of the last write. */
  updatedAt: number;
}
