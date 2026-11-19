/**
 * Personnel System: shared model. Canon access, the app's route table and the
 * withholding particulars used for redaction bars. No figure is typed here.
 */
import canonJson from '@canon';
import type { Canon, CompartmentId, Facility, MarkingId, Person, TierNo } from '@core/canon-types';

export const canon = canonJson as unknown as Canon;

export const UNPOSTED = 'DETACHED / UNPOSTED';
export const HOME = '/personnel';

/* ------------------------------------------------------------------ views */

export type BranchId = 'ops' | 'sec' | 'tec' | 'sup';

export type View =
  | { kind: 'overview' }
  | { kind: 'tier'; tier: TierNo }
  | { kind: 'ratio' }
  | { kind: 'directory' }
  | { kind: 'phase'; n: number }
  | { kind: 'vetting' }
  | { kind: 'transfer' }
  | { kind: 'org' }
  | { kind: 'branch'; branch: BranchId };

/**
 * Functional branches group the ten lines of the ratio model. Function names
 * are matched exactly against canon.ratioModel.rows[].function.
 */
export const BRANCHES: { id: BranchId; title: string; short: string; functions: string[] }[] = [
  { id: 'ops', title: 'Command, Intelligence and Military Operations', short: 'Command and Intelligence', functions: ['Command & Administration', 'Intelligence/Analysis', 'Military Operations'] },
  { id: 'sec', title: 'Security Forces', short: 'Security Forces', functions: ['Security Forces'] },
  { id: 'tec', title: 'Technical, Engineering and Communications', short: 'Technical and Communications', functions: ['Technical/Engineering', 'Communications'] },
  { id: 'sup', title: 'Medical, Logistics and Facility Support', short: 'Medical, Logistics, Support', functions: ['Medical', 'Logistics & Supply', 'Food Service', 'Maintenance'] },
];

/** Parse an app path ("/personnel/tier/2") into a view. Unknown paths give null. */
export function parsePath(path: string | null | undefined): View | null {
  const p = (path ?? HOME).replace(/\/+$/, '') || HOME;
  if (p === HOME) return { kind: 'overview' };
  const rest = p.startsWith(HOME + '/') ? p.slice(HOME.length + 1).split('/') : null;
  if (!rest) return null;
  const [a, b] = rest;
  if (rest.length === 1) {
    if (a === 'ratio') return { kind: 'ratio' };
    if (a === 'directory') return { kind: 'directory' };
    if (a === 'vetting') return { kind: 'vetting' };
    if (a === 'transfer') return { kind: 'transfer' };
    if (a === 'org') return { kind: 'org' };
    return null;
  }
  if (rest.length === 2 && b) {
    if (a === 'tier' && canon.tiers.some((t) => String(t.tier) === b)) return { kind: 'tier', tier: Number(b) as TierNo };
    if (a === 'phase' && canon.phases.some((ph) => String(ph.n) === b)) return { kind: 'phase', n: Number(b) };
    if (a === 'branch' && BRANCHES.some((br) => br.id === b)) return { kind: 'branch', branch: b as BranchId };
  }
  return null;
}

export function pathOf(v: View): string {
  switch (v.kind) {
    case 'overview':
      return HOME;
    case 'tier':
      return `${HOME}/tier/${v.tier}`;
    case 'phase':
      return `${HOME}/phase/${v.n}`;
    case 'branch':
      return `${HOME}/branch/${v.branch}`;
    default:
      return `${HOME}/${v.kind}`;
  }
}

/** Navigation entries, in the order of the navigation pane and the Go menu. */
export interface NavEntry {
  path: string;
  label: string;
  group?: string;
}

export function navEntries(): NavEntry[] {
  const out: NavEntry[] = [{ path: HOME, label: 'Strength summary' }];
  for (const t of canon.tiers) out.push({ path: pathOf({ kind: 'tier', tier: t.tier }), label: `Tier ${t.tier}: ${t.name}`, group: 'Tiers' });
  out.push({ path: pathOf({ kind: 'ratio' }), label: 'Ratio model and calculator' });
  out.push({ path: pathOf({ kind: 'directory' }), label: 'Personnel directory' });
  for (const ph of canon.phases) out.push({ path: pathOf({ kind: 'phase', n: ph.n }), label: `Phase ${ph.n}: ${ph.title}`, group: 'Recruitment phases' });
  out.push({ path: pathOf({ kind: 'vetting' }), label: 'Vetting supplement' });
  out.push({ path: pathOf({ kind: 'transfer' }), label: 'Transfers and probation' });
  out.push({ path: pathOf({ kind: 'org' }), label: 'Organisation chart' });
  for (const br of BRANCHES) out.push({ path: pathOf({ kind: 'branch', branch: br.id }), label: br.short, group: 'Functional branches' });
  return out;
}

/** Window title for a view when no document entry is registered for its path. */
export function viewTitle(v: View): string {
  return navEntries().find((e) => e.path === pathOf(v))?.label ?? 'Personnel System';
}

/* ------------------------------------------------------------ withholding */

const PV = canon.divisions.find((d) => d.id === 'PV');
/** Withholding authority for personnel records: the division that keeps them. */
export const PERSONNEL_AUTHORITY = PV?.name ?? 'Personnel & Vetting';

/** Reference quoted on a bar withheld under `key` (tier keys: DIR-0412; compartments: the briefing). */
export function withholdingRef(key: string): string {
  const comp = canon.compartments.find((c) => c.id === key);
  if (comp) return comp.briefingDocNo;
  return 'OSC-DIR-0412';
}

/** Compartments that a Tier 3 reader may request on OSC Form 126 with a holder as sponsor. */
export const SPONSORABLE: readonly CompartmentId[] = ['KESTREL', 'SEXTANT'];

/* ----------------------------------------------------------------- lookup */

export const facilityById = new Map<string, Facility>(canon.facilities.map((f) => [f.id, f]));
export const personByPn = new Map<string, Person>(canon.roster.map((p) => [p.pn, p]));
export const divisionName = (id: string | null | undefined): string => (id ? canon.divisions.find((d) => d.id === id)?.name ?? id : '');

export function markingLabel(id: MarkingId | null | undefined): string {
  if (!id) return '';
  return canon.markings.find((m) => m.id === id)?.label ?? id;
}

/** Higher of two markings by canon rank. */
export function higherMarking(a: MarkingId, b: MarkingId | null | undefined): MarkingId {
  if (!b) return a;
  const ra = canon.markings.find((m) => m.id === a)?.rank ?? 0;
  const rb = canon.markings.find((m) => m.id === b)?.rank ?? 0;
  return rb > ra ? b : a;
}

export const fmt = (n: number, digits = 0): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
