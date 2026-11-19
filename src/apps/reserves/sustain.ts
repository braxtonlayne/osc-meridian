/**
 * Reserves sustainment calculator: pure logic, no UI.
 *
 * Every stock figure is read from canon (`reserves.items`, `headline`, `facilities`, `classes`).
 * The only constants here are calendar conversions. Results are durations of supply for a
 * stated population; nothing is rounded until display.
 */
import type { Canon, Facility, FacilityClass } from '@core/canon-types';

export const DAYS_PER_YEAR = 365.25;
export const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;

type ReserveItem = Canon['reserves']['items'][number];

export interface SustainLine {
  /** Reserve item id (canon) or a derived id. */
  id: string;
  label: string;
  /** Canon statement of the stock, as written. */
  stock: string;
  /** How the figure was derived, for the Basis column. */
  basis: string;
  /** Duration of supply in days at the stated population; null when the item is not a duration. */
  days: number | null;
  /** Per-head quantity, for items held as a rate or a pool rather than a duration. */
  perHead: { value: number; unit: string } | null;
  /** False when the figure does not depend on population (fuel runtime). */
  scales: boolean;
}

export type Parsed = { ok: true; value: number } | { ok: false; error: string };

/** Whole-number input in [min, max]. Messages are written as form rejections. */
export function parseWhole(raw: string, block: string, what: string, min: number, max: number, maxNote: string): Parsed {
  const s = raw.replace(/,/g, '').trim();
  if (!s) return { ok: false, error: `REJECTED Block ${block}: ${what} is required.` };
  if (!/^\d+$/.test(s)) return { ok: false, error: `REJECTED Block ${block}: ${what} must be a whole number.` };
  const n = Number(s);
  if (n < min) return { ok: false, error: `REJECTED Block ${block}: ${what} must be at least ${min.toLocaleString('en-US')}.` };
  if (n > max) return { ok: false, error: `REJECTED Block ${block}: ${what} exceeds ${maxNote} (${max.toLocaleString('en-US')}).` };
  return { ok: true, value: n };
}

/** Days of meals for `population` eating `mealsPerDay`. */
export function mealsDays(meals: number, population: number, mealsPerDay: number): number {
  if (population <= 0 || mealsPerDay <= 0) return Infinity;
  return meals / (population * mealsPerDay);
}

/** A duration stated at `basisPopulation`, re-stated for `population` (inverse proportion). */
export function scaledDays(daysAtBasis: number, basisPopulation: number, population: number): number {
  if (population <= 0) return Infinity;
  return (daysAtBasis * basisPopulation) / population;
}

export const toMonths = (days: number): number => days / DAYS_PER_MONTH;
export const toYears = (days: number): number => days / DAYS_PER_YEAR;

function item(canon: Canon, id: string): ReserveItem | undefined {
  return canon.reserves.items.find((i) => i.id === id);
}

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Network sustainment at a population: meals, pharmaceuticals, water and blood per head,
 * diesel runtime. Items whose canon value is withheld (null) are omitted.
 */
export function networkSustainment(canon: Canon, population: number, mealsPerDay: number): SustainLine[] {
  const out: SustainLine[] = [];
  const cap = canon.headline.capacitySustained;

  const mre = item(canon, 'FOOD-MRE');
  if (mre && typeof mre.value === 'number') {
    out.push({
      id: mre.id,
      label: mre.label,
      stock: mre.text,
      basis: `${fmt(mre.value)} ${mre.unit} / (${fmt(population)} x ${mealsPerDay} per day)`,
      days: mealsDays(mre.value, population, mealsPerDay),
      perHead: null,
      scales: true,
    });
  }

  const pharma = item(canon, 'MED-PHARMA');
  if (pharma && typeof pharma.value === 'number') {
    out.push({
      id: pharma.id,
      label: pharma.label,
      stock: pharma.text,
      basis: `${pharma.value} ${pharma.unit} at ${fmt(cap)}, pro rata`,
      days: scaledDays(pharma.value * DAYS_PER_YEAR, cap, population),
      perHead: null,
      scales: true,
    });
  }

  const water = item(canon, 'WATER-PURIFICATION');
  if (water && typeof water.value === 'number') {
    out.push({
      id: water.id,
      label: water.label,
      stock: water.text,
      basis: `${fmt(water.value)} ${water.unit} / ${fmt(population)}`,
      days: null,
      perHead: { value: population > 0 ? water.value / population : 0, unit: 'gallons per person per day' },
      scales: true,
    });
  }

  const blood = item(canon, 'MED-BLOOD');
  if (blood && typeof blood.value === 'number') {
    out.push({
      id: blood.id,
      label: blood.label,
      stock: blood.text,
      basis: `${fmt(blood.value)} ${blood.unit} / ${fmt(population)}`,
      days: null,
      perHead: { value: population > 0 ? blood.value / population : 0, unit: `${blood.unit} per person` },
      scales: true,
    });
  }

  const diesel = item(canon, 'ENERGY-DIESEL');
  if (diesel && typeof diesel.value === 'number') {
    out.push({
      id: diesel.id,
      label: diesel.label,
      stock: diesel.text,
      basis: 'Stated runtime; not population-dependent',
      days: diesel.value,
      perHead: null,
      scales: false,
    });
  }
  return out;
}

export interface FacilityWindow {
  facility: string;
  /** Days of operation without resupply at the stated occupancy; null when canon gives no figure. */
  minDays: number | null;
  /** Upper bound for a class range (GAMMA); equals minDays for a single figure. */
  maxDays: number | null;
  /** Canon statement used. */
  stated: string;
  basis: string;
  scaled: boolean;
}

/**
 * Sustainment window at a facility for an occupancy, from canon:
 *  - ALPHA: `sustainedMonths` at the facility's berths, pro rata.
 *  - GAMMA: the class window (days min..max) at the facility's berths, pro rata.
 *  - DELTA: the class maximum, stated in hours; not scaled (it is a ceiling, not a stock).
 *  - BETA: no figure is given in canon; the class statement is returned.
 *  Berths withheld by the client canon (null) are never scaled from: the class statement is returned.
 */
export function facilityWindow(f: Facility, cls: FacilityClass | undefined, occupancy: number): FacilityWindow {
  const berths = f.capacity;
  if (f.class === 'ALPHA' && berths !== null && typeof f.sustainedMonths === 'number') {
    const d = scaledDays(f.sustainedMonths * DAYS_PER_MONTH, berths, occupancy);
    return {
      facility: f.id,
      minDays: d,
      maxDays: d,
      stated: `${f.sustainedMonths} months at ${fmt(berths)} berths`,
      basis: `${f.sustainedMonths} months x ${fmt(berths)} / ${fmt(occupancy)}`,
      scaled: true,
    };
  }
  if (cls && f.class === 'GAMMA' && berths !== null && typeof cls.sustainDaysMin === 'number' && typeof cls.sustainDaysMax === 'number') {
    return {
      facility: f.id,
      minDays: scaledDays(cls.sustainDaysMin, berths, occupancy),
      maxDays: scaledDays(cls.sustainDaysMax, berths, occupancy),
      stated: cls.sustainabilityText,
      basis: `${cls.sustainDaysMin} to ${cls.sustainDaysMax} days x ${fmt(berths)} / ${fmt(occupancy)}`,
      scaled: true,
    };
  }
  if (cls && f.class === 'DELTA' && typeof cls.sustainDaysMax === 'number') {
    return {
      facility: f.id,
      minDays: cls.sustainDaysMax,
      maxDays: cls.sustainDaysMax,
      stated: cls.sustainabilityText,
      basis: 'Class maximum; not scaled by occupancy',
      scaled: false,
    };
  }
  return {
    facility: f.id,
    minDays: null,
    maxDays: null,
    stated: cls?.sustainabilityText ?? 'Not stated',
    basis: 'No sustainment figure is held for this class',
    scaled: false,
  };
}

/** Display a duration as days, months and years (rounded at display only). */
export function describeDays(days: number | null): { days: string; months: string; years: string } {
  if (days === null || !Number.isFinite(days)) return { days: '', months: '', years: '' };
  return {
    days: fmt(Math.round(days)),
    months: toMonths(days).toFixed(1),
    years: toYears(days).toFixed(2),
  };
}
