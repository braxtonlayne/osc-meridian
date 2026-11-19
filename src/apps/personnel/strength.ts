/**
 * Strength reports (pure logic). Every total is a canon figure; lines are read
 * from canon tiers, classes and facilities. Nothing here reconciles one total
 * against another.
 */
import type { Canon, ClassId, TierNo } from '@core/canon-types';

export interface TierLine {
  tier: TierNo;
  name: string;
  count: number;
  clearance: string;
}

export interface ClassLine {
  id: ClassId;
  name: string;
  sites: number;
  berthing: number;
  posted: number;
  /** Posted as a percentage of berthing. */
  fillPct: number;
}

export interface FacilityLine {
  id: string;
  cls: ClassId;
  codename: string | null;
  berthing: number;
  posted: number;
  fillPct: number;
  commanderPn: string | null;
}

export interface Reconciliation {
  totalPersonnel: number;
  totalPosted: number;
  unposted: number;
}

const pct = (n: number, d: number): number => (d > 0 ? (n / d) * 100 : 0);

export function tierLines(c: Canon): TierLine[] {
  return [...c.tiers].sort((a, b) => a.tier - b.tier).map((t) => ({ tier: t.tier, name: t.name, count: t.count, clearance: t.clearance }));
}

export function classLines(c: Canon): ClassLine[] {
  return c.classes.map((k) => ({
    id: k.id,
    name: k.name,
    sites: k.count,
    berthing: k.statedCapacity,
    posted: k.statedStaff,
    fillPct: pct(k.statedStaff, k.statedCapacity),
  }));
}

export function facilityLines(c: Canon): FacilityLine[] {
  return c.facilities.map((f) => ({
    id: f.id,
    cls: f.class,
    codename: f.codename,
    berthing: f.capacity,
    posted: f.staff,
    fillPct: pct(f.staff, f.capacity),
    commanderPn: f.commanderId,
  }));
}

/** The three totals lines of the strength summary, each read directly from canon. */
export function reconciliation(c: Canon): Reconciliation {
  return { totalPersonnel: c.headline.staffTotal, totalPosted: c.headline.staffPosted, unposted: c.headline.staffUnposted };
}

/* ------------------------------------------------------------- probation */

/** ISO date `days` after `iso` (UTC, calendar days). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y!, (m ?? 1) - 1, d ?? 1) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export interface ProbationStatus {
  start: string; // ISO
  periodDays: number;
  /** Last day of the period (ISO): start + periodDays. */
  end: string;
  day: number;
  daysRemaining: number;
  /** Share of the period served, 0 to 100. */
  servedPct: number;
}

/** Where a probationer stands on probation day `day` of a period of `periodDays`. */
export function probationStatus(startIso: string, periodDays: number, day: number): ProbationStatus {
  const d = Math.max(0, Math.min(periodDays, Math.floor(day)));
  return {
    start: startIso,
    periodDays,
    end: addDays(startIso, periodDays),
    day: d,
    daysRemaining: periodDays - d,
    servedPct: periodDays > 0 ? (d / periodDays) * 100 : 0,
  };
}

/** Probation period length in days, read from the canon compartmentation rule ("90-day"). */
export function probationPeriodDays(rule: string): number | null {
  const m = /(\d+)-day probation/i.exec(rule);
  return m ? Number(m[1]) : null;
}
