/**
 * Personnel directory (pure logic): turns canon roster entries into display
 * rows with field-level withholding, filters and sorts them.
 *
 * Withholding rules, in order:
 * - A value that arrives as a redaction sentinel (tier 1 and 2 names and mail
 *   addresses in the client canon) is shown as a bar of the sentinel's length.
 * - Entries carried as DETACHED / UNPOSTED show only the personnel number and
 *   the site unless the session holds HOLLOW; every other field is a HOLLOW bar.
 * - The "Holds" column lists a compartment only when the reader holds it or it
 *   is one a reader may request with a holder as sponsor; otherwise a bar keyed
 *   to that compartment stands in its place.
 * Withheld text never enters a row, so it can be neither displayed nor searched.
 */
import type { CompartmentId, Person } from '@core/canon-types';
import { rxInfo } from '@core/rx';

export const UNPOSTED_SITE = 'DETACHED / UNPOSTED';

export type Cell = { text: string } | { rx: { key: string; len: number } };

export interface DirRow {
  pn: string;
  name: Cell;
  rank: Cell;
  role: Cell;
  tier: Cell;
  /** Numeric tier when shown, for filtering; null when withheld. */
  tierNo: number | null;
  site: string;
  division: Cell;
  divisionId: string | null;
  email: Cell;
  holds: Cell[];
  notes: Cell;
  unposted: boolean;
}

export interface DirContext {
  holds: (c: CompartmentId) => boolean;
  sponsorable: readonly CompartmentId[];
  compartmentIds: readonly CompartmentId[];
  divisionName: (id: string) => string;
}

const text = (s: string): Cell => ({ text: s });
const bar = (key: string, s: string): Cell => ({ rx: { key, len: Math.max(1, s.length) } });

/** Compartment ids named in a "Holds X." / "Holds X and Y." sentence of the notes. */
export function parseHolds(notes: string, ids: readonly string[]): string[] {
  const m = /(?:^|\.\s+)Holds ([^.]*)\./.exec(notes);
  if (!m) return [];
  const words = m[1]!.split(/,\s*|\s+and\s+/).map((w) => w.trim().toUpperCase());
  return words.filter((w) => ids.includes(w));
}

/** Notes with the "Holds ..." sentence removed (the Holds column carries it). */
export function stripHolds(notes: string): string {
  return notes.replace(/(^|\.\s+)Holds [^.]*\.\s*/, (_m, lead: string) => (lead ? '. ' : '')).replace(/^\.\s+/, '').trim();
}

function cellFor(value: string | null | undefined): Cell {
  if (value === null || value === undefined) return text('');
  const rx = rxInfo(value);
  return rx ? { rx } : text(value);
}

export function buildRow(p: Person, ctx: DirContext): DirRow {
  const unposted = p.site === UNPOSTED_SITE;
  const hollow = unposted && !ctx.holds('HOLLOW');
  const held = parseHolds(p.notes, ctx.compartmentIds);
  const holds: Cell[] = held.map((c) =>
    ctx.holds(c as CompartmentId) || ctx.sponsorable.includes(c as CompartmentId) ? text(c) : bar(c, c),
  );
  const notes = stripHolds(p.notes);
  const division = p.divisionId ? ctx.divisionName(p.divisionId) : '';
  if (hollow) {
    return {
      pn: p.pn,
      name: rxInfo(p.name) ? cellFor(p.name) : bar('HOLLOW', p.name),
      rank: p.rank ? bar('HOLLOW', p.rank) : text(''),
      role: bar('HOLLOW', p.role),
      tier: bar('HOLLOW', String(p.tier)),
      tierNo: null,
      site: p.site,
      division: division ? bar('HOLLOW', division) : text(''),
      divisionId: null,
      email: rxInfo(p.email) ? cellFor(p.email) : bar('HOLLOW', p.email),
      holds: held.map((c) => bar('HOLLOW', c)),
      notes: notes ? bar('HOLLOW', notes) : text(''),
      unposted,
    };
  }
  return {
    pn: p.pn,
    name: cellFor(p.name),
    rank: cellFor(p.rank),
    role: cellFor(p.role),
    tier: text(String(p.tier)),
    tierNo: p.tier,
    site: p.site,
    division: text(division),
    divisionId: p.divisionId,
    email: cellFor(p.email),
    holds,
    notes: cellFor(notes),
    unposted,
  };
}

/** Plain text of a cell; withheld cells contribute nothing. */
export const cellText = (c: Cell): string => ('text' in c ? c.text : '');

export interface DirFilter {
  query: string;
  tier: number | null;
  site: string | null;
  divisionId: string | null;
}

/** Visible text searched by the query box. Withheld fields are not searchable. */
export function searchText(r: DirRow): string {
  return [r.pn, cellText(r.name), cellText(r.rank), cellText(r.role), r.site, r.divisionId ?? '', cellText(r.division), cellText(r.email), ...r.holds.map(cellText), cellText(r.notes)]
    .join(' ')
    .replace(/\[\[RX:[^\]]*\]\]/g, ' ')
    .toLowerCase();
}

export function filterRows(rows: readonly DirRow[], f: DirFilter): DirRow[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (f.tier !== null && r.tierNo !== f.tier) return false;
    if (f.site !== null && r.site !== f.site) return false;
    if (f.divisionId !== null && r.divisionId !== f.divisionId) return false;
    if (!terms.length) return true;
    const hay = searchText(r);
    return terms.every((t) => hay.includes(t));
  });
}

/** Sort key for a cell: withheld values sort after every shown value. */
export const sortKey = (c: Cell): string => ('text' in c ? c.text.toLowerCase() : '￿');
