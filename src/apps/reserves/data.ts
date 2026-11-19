/** Reserves: canon access, route table and release rules shared by the views. */
import canonJson from '@canon';
import type { Canon, FacilityId, MarkingId } from '@core/canon-types';
import type { RouteEntry } from '@core/contracts';

export const canon = canonJson as unknown as Canon;

export type Category = Canon['reserves']['items'][number]['category'];
export type ReserveItem = Canon['reserves']['items'][number];

/** Views reachable by route. `rx:<id>` is a reactor console. */
export type ViewId = 'overview' | 'food' | 'medical' | 'energy' | 'arms' | 'seed' | 'gene' | `rx:${string}`;

export interface ViewDef {
  view: ViewId;
  /** Route path (manifest). */
  path: string;
  /** Short label for navigation. */
  label: string;
  /** Categories shown in the stock table for category views. */
  categories?: Category[];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  FOOD: 'Food',
  WATER: 'Water',
  MEDICAL: 'Medical',
  ENERGY: 'Energy',
  ARMAMENTS: 'Armaments',
};

export const CATEGORY_ORDER: Category[] = ['FOOD', 'WATER', 'MEDICAL', 'ENERGY', 'ARMAMENTS'];

const reactorViews: ViewDef[] = canon.reactors.map((r) => ({
  view: `rx:${r.id}` as ViewId,
  path: `/reserves/reactor/${r.id.toLowerCase()}`,
  label: r.id,
}));

export const VIEWS: ViewDef[] = [
  { view: 'overview', path: '/reserves', label: 'Reserves position' },
  { view: 'food', path: '/reserves/food', label: 'Food and water', categories: ['FOOD', 'WATER'] },
  { view: 'medical', path: '/reserves/medical', label: 'Medical', categories: ['MEDICAL'] },
  { view: 'energy', path: '/reserves/energy', label: 'Energy', categories: ['ENERGY'] },
  { view: 'arms', path: '/reserves/arms', label: 'Armaments', categories: ['ARMAMENTS'] },
  { view: 'seed', path: '/reserves/seed-vault', label: 'Seed collection' },
  { view: 'gene', path: '/reserves/genetic-vault', label: 'Biological sample collection' },
  ...reactorViews,
];

export function viewForPath(path: string | null | undefined): ViewDef {
  return VIEWS.find((v) => v.path === path) ?? VIEWS[0]!;
}

export function viewDef(view: ViewId): ViewDef {
  return VIEWS.find((v) => v.view === view) ?? VIEWS[0]!;
}

export function reactorOf(view: ViewId) {
  return view.startsWith('rx:') ? (canon.reactors.find((r) => r.id === view.slice(3)) ?? null) : null;
}

/** Requirement key for a route's access block (same rule as the shell). */
export function accessKey(r: RouteEntry | null | undefined): string | null {
  if (!r?.access) return null;
  const t = `T${r.access.tier}`;
  return r.access.compartment ? `${r.access.compartment}+${t}` : t;
}

export function markingRank(m: MarkingId): number {
  return canon.markings.find((x) => x.id === m)?.rank ?? 0;
}

export function highestMarking(ms: (MarkingId | null | undefined)[]): MarkingId | null {
  let best: MarkingId | null = null;
  for (const m of ms) if (m && (best === null || markingRank(m) > markingRank(best))) best = m;
  return best;
}

export function facility(id: string) {
  return canon.facilities.find((f) => f.id === id) ?? null;
}

export function division(id: string) {
  return canon.divisions.find((d) => d.id === id) ?? null;
}

export function compartment(id: string) {
  return canon.compartments.find((c) => c.id === id) ?? null;
}

/** Briefing reference for a release key ("TALLOW" -> OSC-CB-014; tier keys -> DIR-0412). */
export function briefingRef(key: string): string {
  const comp = key.split('+').find((k) => !/^T\d$/.test(k));
  return (comp && compartment(comp)?.briefingDocNo) || 'OSC-DIR-0412';
}

/**
 * BETA reactor site identities are network geography: shown when the operator holds
 * SEXTANT (geography) or TALLOW (reactor operations). ALPHA hubs are always named.
 */
export function siteReleased(site: FacilityId | string, satisfies: (k: string) => boolean): boolean {
  return !site.startsWith('BETA-') || satisfies('SEXTANT') || satisfies('TALLOW');
}

/** Formats "2004-06" / "2008-05-12" in house style. */
export function houseDate(iso: string): string {
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso);
  if (!m) return iso;
  const mon = MON[Number(m[2]) - 1] ?? '';
  return m[3] ? `${m[3]} ${mon} ${m[1]}` : `${mon} ${m[1]}`;
}

export const fmtN = (n: number, digits = 0) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
