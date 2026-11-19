/** Personnel directory: searchable, sortable roster with field-level withholding, and the record pane. */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Button, DataTable, PropertyGrid, Select, TextField, type Column } from '@design/index';
import type { CompartmentId } from '@core/canon-types';
import { canon, divisionName, fmt, personByPn, SPONSORABLE, UNPOSTED } from '../model';
import { buildRow, filterRows, sortKey, type DirFilter, type DirRow } from '../directory';
import { dirPreset, orgPreset } from '../state';
import { CellView, usePer } from '../ui';

const EMPTY: DirFilter = { query: '', tier: null, site: null, divisionId: null };

export interface DirectoryHandle {
  focusSearch(): void;
  selectedPn(): string | null;
}

export function DirectoryView({ onReady }: { onReady?: (h: DirectoryHandle) => void }) {
  const per = usePer();
  const { services } = per;
  const held = services.session.compartments.value;
  const [filter, setFilter] = useState<DirFilter>(() => dirPreset.peek() ?? EMPTY);
  const [sel, setSel] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const lastLogged = useRef<string>('');

  useEffect(() => {
    dirPreset.value = null;
  }, []);

  const rows = useMemo(
    () =>
      canon.roster.map((p) =>
        buildRow(p, {
          holds: (c: CompartmentId) => held.includes(c),
          sponsorable: SPONSORABLE,
          compartmentIds: canon.compartments.map((c) => c.id),
          divisionName,
        }),
      ),
    [held.join(',')],
  );
  const shown = useMemo(() => filterRows(rows, filter), [rows, filter]);

  // Directory queries are audited once the operator stops typing, and on Enter.
  const logQuery = (q: string) => {
    const t = q.trim();
    if (!t || t === lastLogged.current) return;
    lastLogged.current = t;
    services.audit.log('search', t, `Operator ${services.session.operatorId.peek()} queried the personnel directory for "${t}".`);
  };
  useEffect(() => {
    const id = setTimeout(() => logQuery(filter.query), 900);
    return () => clearTimeout(id);
  }, [filter.query]);

  useEffect(() => {
    per.setMessage(`${fmt(shown.length)} of ${fmt(rows.length)} entries shown.`);
  }, [shown.length, rows.length]);

  const focusSearch = () => searchRef.current?.querySelector('input')?.focus();
  useEffect(() => {
    onReady?.({ focusSearch, selectedPn: () => sel[0] ?? null });
  }, [sel]);

  const selected = sel[0] ? rows.find((r) => r.pn === sel[0]) ?? null : null;

  const cols: Column<DirRow>[] = [
    { key: 'pn', header: 'PN', width: 92, mono: true, sortValue: (r) => r.pn },
    { key: 'name', header: 'Name', sortValue: (r) => sortKey(r.name), render: (r) => <CellView c={r.name} /> },
    { key: 'role', header: 'Post', wrap: true, sortValue: (r) => sortKey(r.role), render: (r) => <CellView c={r.role} /> },
    { key: 'tier', header: 'Tier', width: 40, align: 'center', mono: true, sortValue: (r) => r.tierNo ?? 9, render: (r) => <CellView c={r.tier} /> },
    { key: 'site', header: 'Site', width: 150, mono: true, wrap: true, sortValue: (r) => r.site },
    { key: 'div', header: 'Division', sortValue: (r) => sortKey(r.division), render: (r) => <CellView c={r.division} /> },
    { key: 'email', header: 'Mail address', mono: true, sortValue: (r) => sortKey(r.email), render: (r) => <CellView c={r.email} /> },
    {
      key: 'holds',
      header: 'Holds',
      sortable: false,
      render: (r) => (
        <span class="per-holds">
          {r.holds.map((c, i) => (
            <CellView key={i} c={c} />
          ))}
        </span>
      ),
    },
  ];

  const sites = [...new Set(canon.roster.map((p) => p.site))];
  const siteOptions = [{ value: '', label: 'All sites' }, ...canon.facilities.filter((f) => sites.includes(f.id)).map((f) => ({ value: f.id, label: f.id })), { value: UNPOSTED, label: UNPOSTED }];
  const tierOptions = [{ value: '', label: 'All tiers' }, ...canon.tiers.map((t) => ({ value: String(t.tier), label: `Tier ${t.tier}` }))];
  const divOptions = [{ value: '', label: 'All divisions' }, ...canon.divisions.map((d) => ({ value: d.id, label: `${d.id} ${d.name}` }))];
  const set = (patch: Partial<DirFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const person = selected ? personByPn.get(selected.pn) : undefined;
  const chartRoot = person && !selected?.unposted ? person.divisionId ?? (person.site !== UNPOSTED ? person.site : null) : null;

  return (
    <div class="per-view per-dir">
      <div
        class="per-filters"
        role="search"
        ref={searchRef}
        onKeyDown={(e) => {
          if (e.key === 'Enter') logQuery(filter.query);
        }}
      >
        <TextField label="Find" value={filter.query} onInput={(v) => set({ query: v })} type="search" width={200} layout="inline" />
        <Select label="Tier" width={110} value={filter.tier === null ? '' : String(filter.tier)} options={tierOptions} onChange={(v) => set({ tier: v ? Number(v) : null })} layout="inline" />
        <Select label="Site" width={180} value={filter.site ?? ''} options={siteOptions} onChange={(v) => set({ site: v || null })} layout="inline" />
        <Select label="Division" width={220} value={filter.divisionId ?? ''} options={divOptions} onChange={(v) => set({ divisionId: v || null })} layout="inline" />
        <Button size="small" label="C&lear" onClick={() => setFilter(EMPTY)} disabled={filter === EMPTY} />
      </div>
      <DataTable
        label="Personnel directory"
        columns={cols}
        rows={shown}
        rowKey={(r) => r.pn}
        selection="single"
        selected={sel}
        onSelectionChange={setSel}
        defaultSort={{ key: 'pn', dir: 'asc' }}
        dense
        maxHeight="360px"
        empty="No directory entries match the current selection."
        footer={
          <tr>
            <td colSpan={5}>{UNPOSTED} (category total)</td>
            <td colSpan={3} class="is-mono">
              {fmt(canon.headline.staffUnposted)}
            </td>
          </tr>
        }
      />
      {selected ? (
        <div class="per-record" aria-label="Directory record">
          <PropertyGrid
            caption={`Directory record ${selected.pn}`}
            columns={2}
            rows={[
              { label: 'Personnel number', value: selected.pn, mono: true },
              { label: 'Name', value: <CellView c={selected.name} /> },
              { label: 'Rank or title', value: <CellView c={selected.rank} /> },
              { label: 'Post', value: <CellView c={selected.role} /> },
              { label: 'Tier', value: <CellView c={selected.tier} />, mono: true },
              { label: 'Site', value: selected.site, mono: true },
              { label: 'Division', value: <CellView c={selected.division} /> },
              { label: 'Mail address', value: <CellView c={selected.email} />, mono: true },
              { label: 'Holds', value: selected.holds.length ? <span class="per-holds">{selected.holds.map((c, i) => <CellView key={i} c={c} />)}</span> : 'None recorded' },
              { label: 'Notes', value: <CellView c={selected.notes} /> },
            ]}
          />
          <div class="per-actions">
            <Button
              size="small"
              label="Show in &organisation chart"
              disabled={!chartRoot}
              onClick={() => {
                orgPreset.value = chartRoot;
                per.go('/personnel/org');
              }}
            />
            <Button
              size="small"
              label="&Copy personnel number"
              onClick={() => {
                void navigator.clipboard?.writeText(selected.pn).then(
                  () => per.setMessage(`${selected.pn} copied to the clipboard.`),
                  () => per.setMessage('The clipboard is not available to this workstation.'),
                );
              }}
            />
          </div>
        </div>
      ) : (
        <p class="per-note">Select an entry to show its directory record. Fields are released according to the reader's tier and compartments.</p>
      )}
    </div>
  );
}
