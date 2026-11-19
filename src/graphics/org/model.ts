/**
 * @graphics/org chart model: turns canon (council, divisions, facilities, roster,
 * headline strength figures) into the tree the chart draws. No figure is typed
 * here; every count is read or summed from canon.
 */
import canonJson from '@canon';
import type { Canon, ClassId, Division, Facility, Person } from '../../core/canon-types';
import { isRx, rxInfo } from '../../core/rx';

export const canon = canonJson as unknown as Canon;

export type OrgRoot = 'COUNCIL' | (string & {});

export type OrgNodeKind =
  | 'council'
  | 'group'
  | 'division'
  | 'class'
  | 'facility'
  | 'person'
  | 'accounting'
  | 'count'
  | 'unposted';

export interface OrgNode {
  /** Unique within one chart. */
  id: string;
  kind: OrgNodeKind;
  /** Title line: unit name or the person's post. */
  title: string;
  /** Person shown on the name line (unit head, commander, or the person). */
  person: Person | null;
  /** Name line text when there is no person. */
  nameText: string;
  /** Mono line: personnel number or a figure. */
  mono: string;
  /** Right-hand end of the mono line. */
  meta: string;
  /** Id handed to onSelectUnit (division id, facility id, class id, group key). */
  unitId: string | null;
  children: OrgNode[];
  /**
   * 0: children are laid out side by side.
   * n: children that are not themselves expanded hang in columns of at most n.
   */
  stackRows: number;
}

/** Payroll category carried in strength totals; never a drill-down. */
export const UNPOSTED_LABEL = 'DETACHED / UNPOSTED';
export const UNPOSTED_REFUSAL = 'No organisational assignment of record.';
/** The division whose mandate covers strength accounting. */
const ACCOUNTING_DIVISION = 'PV';

export const fmt = (n: number): string => n.toLocaleString('en-US');

const byPn = new Map<string, Person>(canon.roster.map((p) => [p.pn, p]));

/** Tier 1 holders are shown only as seats; unposted staff have no place on the chart. */
const chartable = (p: Person): boolean => p.tier !== 1 && p.site !== UNPOSTED_LABEL;

const byTierThenPn = (a: Person, b: Person): number => a.tier - b.tier || a.pn.localeCompare(b.pn);

function node(part: Partial<OrgNode> & Pick<OrgNode, 'id' | 'kind' | 'title'>): OrgNode {
  return { person: null, nameText: '', mono: '', meta: '', unitId: null, children: [], stackRows: 0, ...part };
}

function personNode(p: Person): OrgNode {
  return node({ id: `p:${p.pn}`, kind: 'person', title: p.role, person: p, mono: p.pn, meta: `T${p.tier}  ${p.site}` });
}

function accountingNode(): OrgNode {
  const h = canon.headline;
  return node({
    id: 'acct',
    kind: 'accounting',
    title: 'PERSONNEL ACCOUNTING',
    nameText: 'Total personnel',
    mono: fmt(h.staffTotal),
    unitId: 'ACCOUNTING',
    stackRows: 4,
    children: [
      node({ id: 'acct:posted', kind: 'count', title: 'POSTED TO FACILITIES', nameText: 'Total posted staff', mono: fmt(h.staffPosted), unitId: 'POSTED' }),
      node({ id: 'acct:unposted', kind: 'unposted', title: UNPOSTED_LABEL, nameText: 'Count only', mono: fmt(h.staffUnposted) }),
    ],
  });
}

function divisionNode(d: Division): OrgNode {
  const head = d.headId ? (byPn.get(d.headId) ?? null) : null;
  const staff = canon.roster.filter((p) => p.divisionId === d.id && p.pn !== d.headId && chartable(p)).sort(byTierThenPn);
  const children = staff.map(personNode);
  if (d.id === ACCOUNTING_DIVISION) children.push(accountingNode());
  return node({
    id: `d:${d.id}`,
    kind: 'division',
    title: d.name.toUpperCase(),
    person: head,
    nameText: head ? '' : 'No head of record',
    mono: head ? head.pn : '',
    meta: `${d.id}  ${d.site ?? ''}`.trim(),
    unitId: d.id,
    children,
    stackRows: 8,
  });
}

function facilityNode(f: Facility, withResidentDivisions: boolean): OrgNode {
  const cmd = f.commanderId ? (byPn.get(f.commanderId) ?? null) : null;
  const staff = canon.roster
    .filter((p) => p.site === f.id && p.divisionId === null && p.pn !== f.commanderId && chartable(p))
    .sort(byTierThenPn);
  const children = staff.map(personNode);
  if (withResidentDivisions) {
    for (const d of canon.divisions) if (d.site === f.id) children.push(divisionNode(d));
  }
  return node({
    id: `f:${f.id}`,
    kind: 'facility',
    title: f.codename ? `${f.id}  ${f.codename}` : f.id,
    person: cmd,
    nameText: cmd ? '' : 'No commander of record',
    mono: cmd ? cmd.pn : '',
    meta: f.staff == null ? 'Posted strength withheld' : `Posted ${fmt(f.staff)}`,
    unitId: f.id,
    children,
    stackRows: 6,
  });
}

function classNode(id: ClassId): OrgNode {
  const cls = canon.classes.find((c) => c.id === id);
  const sites = canon.facilities.filter((f) => f.class === id);
  // Per-site staff is withheld for DELTA in the client canon: fall back to the class total.
  const posted = sites.some((f) => f.staff == null) ? (cls?.statedStaff ?? 0) : sites.reduce((s, f) => s + (f.staff ?? 0), 0);
  return node({
    id: `c:${id}`,
    kind: 'class',
    title: `CLASS ${id}`,
    nameText: cls?.name ?? '',
    mono: `${fmt(sites.length)} facilities`,
    meta: `Posted ${fmt(posted)}`,
    unitId: id,
    children: sites.map((f) => facilityNode(f, false)),
    stackRows: 6,
  });
}

function councilNode(): OrgNode {
  const t1 = canon.tiers.find((t) => t.tier === 1);
  const h = canon.headline;
  const classIds = canon.classes.map((c) => c.id);
  return node({
    id: 'council',
    kind: 'council',
    title: (t1?.name ?? 'Core Council').toUpperCase(),
    nameText: `${fmt(canon.council.seats.length)} seats`,
    mono: 'TIER 1',
    meta: t1?.clearance ?? '',
    unitId: 'COUNCIL',
    children: [
      node({
        id: 'g:divisions',
        kind: 'group',
        title: 'DIVISIONS',
        nameText: `${fmt(canon.divisions.length)} divisions`,
        unitId: 'DIVISIONS',
        children: canon.divisions.map(divisionNode),
        stackRows: 6,
      }),
      node({
        id: 'g:facilities',
        kind: 'group',
        title: 'FACILITY COMMANDS',
        nameText: `${fmt(h.facilities)} facilities`,
        mono: `Posted ${fmt(h.staffPosted)}`,
        unitId: 'FACILITIES',
        children: classIds.map(classNode),
      }),
    ],
  });
}

export interface OrgModel {
  root: OrgNode;
  /** True when the Council seat row is drawn above the root. */
  seats: boolean;
  /** Node ids expanded when the chart first opens. */
  open: string[];
}

/** Resolve `root` to a chart. Unknown ids fall back to the Council chart. */
export function buildModel(root: OrgRoot | undefined): OrgModel {
  const key = root ?? 'COUNCIL';
  const div = canon.divisions.find((d) => d.id === key);
  if (div) {
    const n = divisionNode(div);
    return { root: n, seats: false, open: [n.id, 'acct'] };
  }
  const fac = canon.facilities.find((f) => f.id === key);
  if (fac) {
    const n = facilityNode(fac, true);
    return { root: n, seats: false, open: [n.id] };
  }
  const n = councilNode();
  return { root: n, seats: true, open: [n.id, 'g:divisions', 'g:facilities', `d:${ACCOUNTING_DIVISION}`, 'acct'] };
}

/**
 * True when the session may not see this person's name: the tier is more restricted than
 * the session's, or the client canon carries only a redaction sentinel for it.
 */
export const nameWithheld = (p: Person, sessionTier: number): boolean => isRx(p.name) || p.tier < sessionTier;

/** Character length of the person's name, also when the client canon withholds it. */
export const nameLength = (p: Person): number => rxInfo(p.name)?.len ?? p.name.length;
