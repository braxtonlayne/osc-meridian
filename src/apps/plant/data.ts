/**
 * Reactor Plant Panel: canon access, unit parameters, per-account rules and small formatters.
 * Pure (no DOM, no services) so it can be unit-tested.
 */
import canonJson from '@canon';
import type { Canon, Facility, Reactor } from '@core/canon-types';
import type { PlantCanon } from '@core/canon-apps/plant';
import type { AccountDef, AccountId } from '@core/contracts';
import { isRx } from '@core/rx';
import { buildPlant } from '@graphics/reactor/model';
import type { Plant } from '@graphics/reactor/model';
import type { Constants, UnitParams } from './model';

export const canon = canonJson as unknown as Canon;
export const P = canon.apps.plant as PlantCanon;
export const K: Constants = P;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** A unit the panel can show: a canon installation or the generic trainer. */
export interface UnitDef {
  id: string;
  /** Short label for selectors. */
  label: string;
  designation: string;
  reactor: Reactor | null;
  plant: Plant | null;
  params: UnitParams;
  dgCount: number;
  essKV: number;
  /** Site id when released to the client; null when withheld (SEXTANT) or the trainer. */
  site: string | null;
  siteWithheld: boolean;
  /** Withheld site sentinel (for the redaction bar), when withheld. */
  siteSentinel: string | null;
  facility: Facility | null;
}

function fwBOos(note: string): boolean {
  return /feedwater pump B out of service/i.test(note);
}

export function unitFor(r: Reactor): UnitDef {
  const plant = buildPlant(canon, r.id);
  const withheld = isRx(r.site);
  const facility = withheld ? null : (canon.facilities.find((f) => f.id === r.site) ?? null);
  return {
    id: r.id,
    label: r.id,
    designation: r.designation,
    reactor: r,
    plant,
    params: {
      id: r.id,
      ratedMWt: r.thermalMWt,
      ratedMWe: r.electricMWe,
      stationLoad: plant?.loadFraction ?? P.trainer.stationLoadFraction,
      limitPct: plant?.limitPct ?? P.limits.defaultLimitPct,
      fwBOos: fwBOos(r.statusNote),
    },
    dgCount: plant?.dgCount ?? 2,
    essKV: plant?.essKV ?? P.trainer.essKV,
    site: withheld ? null : r.site,
    siteWithheld: withheld,
    siteSentinel: withheld ? r.site : null,
    facility,
  };
}

export const TRAINER: UnitDef = {
  id: P.trainer.id,
  label: P.trainer.id,
  designation: P.trainer.designation,
  reactor: null,
  plant: null,
  params: {
    id: P.trainer.id,
    ratedMWt: P.trainer.thermalMWt,
    ratedMWe: P.trainer.electricMWe,
    stationLoad: P.trainer.stationLoadFraction,
    limitPct: P.limits.defaultLimitPct,
    fwBOos: false,
  },
  dgCount: 2,
  essKV: P.trainer.essKV,
  site: null,
  siteWithheld: false,
  siteSentinel: null,
  facility: null,
};

export const INSTALLATIONS: UnitDef[] = canon.reactors.map(unitFor);

/* ------------------------------------------------------------------ per-account rules */

export interface AccountRules {
  /** Sees the eight installations (live display, event log, one-lines). */
  seesInstallations: boolean;
  /** Units offered on the simulator. */
  simUnits: UnitDef[];
  /** Units offered on the live display. */
  liveUnits: UnitDef[];
  /** May operate live plant controls (canon qualification list; nobody at present). */
  liveQualified: boolean;
}

export function rulesFor(def: Pick<AccountDef, 'id' | 'tier'>): AccountRules {
  const sees = def.tier !== 4;
  return {
    seesInstallations: sees,
    simUnits: sees ? INSTALLATIONS : [TRAINER],
    liveUnits: sees ? INSTALLATIONS : [],
    liveQualified: (P.qualification.qualifiedAccounts as readonly AccountId[]).includes(def.id),
  };
}

/** Default unit for an account: its own site's unit, else the training unit RX-A05, else the first. */
export function defaultUnit(units: UnitDef[], site: string): UnitDef | null {
  return units.find((u) => u.site === site) ?? units.find((u) => u.id === 'RX-A05') ?? units[0] ?? null;
}

/** Initial condition id a unit opens on: hot shutdown for a unit that is shut down, else station load. */
export function defaultIc(u: UnitDef): string {
  const off = u.reactor && (u.reactor.status === 'OFFLINE' || u.reactor.status === 'FAULT');
  return off ? (P.initialConditions[0]?.id ?? 'IC-1') : (P.initialConditions[P.initialConditions.length - 1]?.id ?? 'IC-3');
}

/** Power fraction for an initial condition on a unit (-1 = the unit's station load). */
export function icPower(u: UnitDef, icId: string): number {
  const ic = P.initialConditions.find((x) => x.id === icId) ?? P.initialConditions[0]!;
  return ic.powerFraction < 0 ? u.params.stationLoad : ic.powerFraction;
}

/* ------------------------------------------------------------------ events */

export type PlantEvent = PlantCanon['events'][number];

export function eventsFor(unitId: string | null): PlantEvent[] {
  const list = P.events.filter((e) => unitId === null || e.unit === unitId);
  return [...list].sort((a, b) => (b.date + b.timeZ).localeCompare(a.date + a.timeZ));
}

export function unplannedTrips(unitId: string): number {
  return P.events.filter((e) => e.unit === unitId && e.kind === 'TRIP' && !e.planned).length;
}

export function lastTrip(unitId: string): PlantEvent | null {
  return eventsFor(unitId).find((e) => e.kind === 'TRIP' || e.kind === 'SHUTDOWN') ?? null;
}

/* ------------------------------------------------------------------ time and dates */

/** "30 MAR 2007" from an ISO date. */
export function dateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** Site-local zone for a unit (from the released site longitude), or null when not released. */
export function zoneFor(u: UnitDef): { offsetH: number; label: string } | null {
  const lon = u.facility?.lon;
  if (typeof lon !== 'number') return null;
  const band = P.live.zoneBands.find((b) => lon >= b.minLon);
  return band ? { offsetH: band.offsetH, label: band.label } : null;
}

/** "0640Z (0140 CDT)" for a Zulu HHMM at a unit; Zulu alone when the site is not released. */
export function zuluWithLocal(timeZ: string, u: UnitDef | null): string {
  const z = u ? zoneFor(u) : null;
  if (!z) return `${timeZ}Z`;
  const h = Number(timeZ.slice(0, 2));
  const lh = (((h + z.offsetH) % 24) + 24) % 24;
  return `${timeZ}Z (${String(lh).padStart(2, '0')}${timeZ.slice(2)} ${z.label})`;
}

export function unitById(id: string): UnitDef | null {
  return INSTALLATIONS.find((u) => u.id === id) ?? (id === TRAINER.id ? TRAINER : null);
}
