/**
 * `::canon-table{source="facilities" cols="id,anchor.city:City,capacity" filter="class=BETA"}`
 * Static HTML table rendered from a canon array at build time.
 *
 * - source: dot path to an array in canon (facilities, railSegments, tramNetworks, tramNetworks.links,
 *   tiers, phases, ratioModel.rows, budget.categories, budget.sources, budget.lineItems,
 *   budget.fiscalYears, reactors, contractors.register, roster, glossary, compartments,
 *   divisions, council.seats, calendar, ...). "tramNetworks.links" flattens every network's
 *   links and adds a `network` column.
 * - cols: comma list of fields (dot paths inside a row allowed), optional ":Label" each.
 *   Default: every scalar field of the first row.
 * - filter: "field=value,field2!=value". Any other unreserved attribute is also a filter
 *   (so `class="BETA"` works as in docs/CONTRACTS.md).
 * - caption: optional table caption. limit: optional max rows.
 * - roster: names and e-mail addresses of tier-1/2 personnel are emitted as redactions
 *   (key T1 / T2; tier 1 never ships). auth/ref attributes override the withholding authority.
 */
import { resolvePath, formatScalar, type CanonData } from '../canon.ts';
import { formatDate } from '../util.ts';
import { el, fail, text, type CompileContext, type MdNode } from './context.ts';

const RESERVED = new Set(['source', 'cols', 'filter', 'caption', 'limit', 'auth', 'id']);
const ROSTER_REDACT_FIELDS = new Set(['name', 'email']);

type Row = Record<string, unknown>;

function sourceRows(canon: CanonData, source: string): Row[] | null {
  if (source === 'tramNetworks.links' || source === 'tramLinks') {
    const nets = resolvePath(canon, 'tramNetworks');
    if (!nets.found || !Array.isArray(nets.value)) return null;
    return (nets.value as Row[]).flatMap((n) =>
      Array.isArray(n.links) ? (n.links as Row[]).map((l) => ({ network: n.id, ...l })) : [],
    );
  }
  const r = resolvePath(canon, source);
  if (!r.found || !Array.isArray(r.value)) return null;
  if (!r.value.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x))) return null;
  return r.value as Row[];
}

function field(row: Row, path: string): { found: boolean; value: unknown } {
  let cur: unknown = row;
  for (const seg of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(seg in (cur as Row))) return { found: false, value: undefined };
    cur = (cur as Row)[seg];
  }
  return { found: true, value: cur };
}

function humanize(path: string): string {
  const last = path.split('.').pop() ?? path;
  return last
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toUpperCase();
}

function cellText(value: unknown, key: string): string | null {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(value)) return formatDate(value);
  const s = formatScalar(value, key);
  if (s !== null) return s;
  if (Array.isArray(value)) {
    const parts = value.map((v) => {
      if (v && typeof v === 'object' && 'role' in v && 'count' in v) {
        const sl = v as { role: string; count: number };
        return `${sl.role} (${formatScalar(sl.count, 'count')})`;
      }
      return formatScalar(v, key);
    });
    if (parts.every((p) => p !== null)) return parts.join(', ');
  }
  return null;
}

function matches(value: unknown, want: string): boolean {
  if (Array.isArray(value)) return value.some((v) => String(v) === want);
  return String(value) === want;
}

export function canonTable(node: MdNode, ctx: CompileContext): void {
  const a = node.attributes ?? {};
  const source = (a.source ?? '').trim();
  const done = (children: MdNode[]) => {
    node.data = { hName: 'div', hProperties: { className: ['canon-table-wrap'] } };
    node.children = children;
  };
  if (!source) {
    fail(ctx, node, '::canon-table needs source="<canon array path>"');
    return done([]);
  }
  if (!ctx.canon) {
    fail(ctx, node, `::canon-table source="${source}" used but no canon file was loaded`);
    return done([]);
  }
  let rows = sourceRows(ctx.canon, source);
  if (!rows) {
    fail(ctx, node, `::canon-table source="${source}" is not an array of records in canon`);
    return done([]);
  }

  // filters
  const filters: { key: string; want: string; neg: boolean }[] = [];
  for (const part of (a.filter ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^([\w.]+)\s*(!?=)\s*(.*)$/.exec(part);
    if (!m) {
      fail(ctx, node, `::canon-table filter "${part}" must be field=value or field!=value`);
      continue;
    }
    filters.push({ key: m[1]!, want: m[3]!.trim(), neg: m[2] === '!=' });
  }
  for (const [k, v] of Object.entries(a)) {
    if (RESERVED.has(k) || v === null || v === undefined) continue;
    filters.push({ key: k, want: v, neg: false });
  }
  for (const f of filters) {
    if (rows.length && !rows.some((r) => field(r, f.key).found)) {
      fail(ctx, node, `::canon-table filter field "${f.key}" does not exist in ${source}`);
    }
  }
  rows = rows.filter((r) => filters.every((f) => matches(field(r, f.key).value, f.want) !== f.neg));
  if (!rows.length) {
    fail(ctx, node, `::canon-table source="${source}" with those filters has no rows`);
    return done([]);
  }
  const limit = a.limit ? Number(a.limit) : 0;
  if (limit > 0) rows = rows.slice(0, limit);

  // columns
  let cols: { key: string; label: string }[];
  if (a.cols) {
    cols = a.cols
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((spec) => {
        const i = spec.indexOf(':');
        const key = i >= 0 ? spec.slice(0, i).trim() : spec;
        return { key, label: i >= 0 ? spec.slice(i + 1).trim() : humanize(key) };
      });
  } else {
    cols = Object.entries(rows[0]!)
      .filter(([, v]) => v === null || typeof v !== 'object')
      .map(([k]) => ({ key: k, label: humanize(k) }));
  }
  for (const c of cols) {
    if (!rows.some((r) => field(r, c.key).found)) fail(ctx, node, `::canon-table column "${c.key}" does not exist in ${source}`);
  }

  const isRoster = source === 'roster';
  const auth = (a.auth ?? '').trim() || 'OSC/PSD';
  const body: MdNode[] = rows.map((row) =>
    el(
      'tr',
      {},
      cols.map((c) => {
        const { value } = field(row, c.key);
        const s = cellText(value, c.key.split('.').pop() ?? c.key);
        if (s === null) {
          fail(ctx, node, `::canon-table column "${c.key}" holds a structured value; pick a scalar field`);
        }
        const numeric = typeof value === 'number';
        const props = numeric ? { className: ['num'] } : {};
        const tier = typeof row.tier === 'number' ? row.tier : 4;
        if (isRoster && ROSTER_REDACT_FIELDS.has(c.key) && tier <= 2 && s !== null && s !== '—') {
          const rx: MdNode = {
            type: 'textDirective',
            name: 'r',
            attributes: { tier: String(tier), auth, ref: String(row.pn ?? source) },
            children: [text(s)],
            position: node.position,
          };
          return el('td', props, [rx]);
        }
        return el('td', props, [text(s ?? '')]);
      }),
    ),
  );

  const table: MdNode[] = [];
  if (a.caption) table.push(el('caption', {}, [text(a.caption)]));
  table.push(
    el('thead', {}, [el('tr', {}, cols.map((c) => el('th', { scope: 'col', dataField: c.key }, [text(c.label)])))]),
    el('tbody', {}, body),
  );
  done([el('table', { className: ['canon-table'], dataSource: source }, table)]);
}
