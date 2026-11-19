/** Facility Registry: the sortable register of installations. */
import type { ClassId } from '@core/canon-types';
import { Checkbox, DataTable, TextField, type Column, type SortState } from '@design/index';
import { MarkerGlyph } from '@graphics/map';
import { CLASS_IDS, isOpen, sortKey, totals, type RegRow, type RowFilter } from './model';
import { CellView, canon, className, fmt, fmtMonth, type RxAudit } from './shared';

export interface RegisterProps {
  rows: RegRow[];
  filter: RowFilter;
  onFilter: (f: RowFilter) => void;
  /** Class fixed by the page (class pages): the class boxes are not offered. */
  fixedClass?: ClassId | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  sort: SortState | null;
  onSort: (s: SortState | null) => void;
  audit: RxAudit;
  filterRef?: { current: HTMLInputElement | null };
}

export function FilterBar({ filter, onFilter, fixedClass, count, filterRef }: Pick<RegisterProps, 'filter' | 'onFilter' | 'fixedClass' | 'filterRef'> & { count: number }) {
  const toggle = (c: ClassId, on: boolean): void => {
    const next = new Set(filter.classes);
    if (on) next.add(c);
    else next.delete(c);
    onFilter({ ...filter, classes: next });
  };
  return (
    <div
      class="reg-filters"
      role="group"
      aria-label="Register filter"
      ref={(el) => {
        if (filterRef) filterRef.current = el?.querySelector('input[type="search"], input[type="text"]') ?? null;
      }}
    >
      {fixedClass ? null : (
        <span class="reg-filters__classes">
          {CLASS_IDS.map((c) => (
            <Checkbox
              key={c}
              label={
                <span class="reg-cls">
                  <MarkerGlyph cls={c} size={12} /> {c}
                </span>
              }
              checked={filter.classes.has(c)}
              onChange={(on) => toggle(c, on)}
            />
          ))}
        </span>
      )}
      <Checkbox label="Reactor sites" checked={filter.reactorOnly} onChange={(on) => onFilter({ ...filter, reactorOnly: on })} />
      <span class="reg-filters__find">
        <TextField label="Find" type="search" value={filter.text} onInput={(v) => onFilter({ ...filter, text: v })} width={20} />
      </span>
      <span class="reg-filters__count" aria-live="polite">
        {count} of {fixedClass ? canon.facilities.filter((f) => f.class === fixedClass).length : canon.facilities.length} shown
      </span>
    </div>
  );
}

export function RegisterTable({ rows, selected, onSelect, onOpen, sort, onSort, audit, allShown }: Pick<RegisterProps, 'rows' | 'selected' | 'onSelect' | 'onOpen' | 'sort' | 'onSort' | 'audit'> & { allShown: boolean }) {
  const cols: Column<RegRow>[] = [
    {
      key: 'id',
      header: 'Designation',
      width: 104,
      mono: true,
      sortValue: (r) => `${CLASS_IDS.indexOf(r.cls)}-${r.id}`,
      render: (r) => (
        <span class="reg-desig">
          <MarkerGlyph cls={r.cls} size={11} /> {r.id}
        </span>
      ),
    },
    { key: 'codename', header: 'Codename', width: 140, sortValue: (r) => sortKey(r.codename), render: (r) => <CellView c={r.codename} id={`${r.id}:codename`} audit={audit} nil="" /> },
    // Location and Cover identity share the remaining width (DataTable flexMin floor 170px each).
    { key: 'location', header: 'Location', sortValue: (r) => sortKey(r.location), render: (r) => <CellView c={r.location} id={`${r.id}:location`} audit={audit} /> },
    { key: 'cover', header: 'Cover identity', sortValue: (r) => sortKey(r.cover), render: (r) => <CellView c={r.cover} id={`${r.id}:cover`} audit={audit} nil="Not entered" /> },
    { key: 'depth', header: 'Depth ft', width: 72, align: 'right', mono: true, sortValue: (r) => sortKey(r.depth), render: (r) => <CellView c={r.depth} id={`${r.id}:depth`} audit={audit} fmt={(v) => (v == null ? '' : fmt(v))} /> },
    { key: 'capacity', header: 'Berthing', width: 76, align: 'right', mono: true, sortValue: (r) => sortKey(r.capacity), render: (r) => <CellView c={r.capacity} id={`${r.id}:capacity`} audit={audit} fmt={fmt} /> },
    { key: 'staff', header: 'Posted', width: 64, align: 'right', mono: true, sortValue: (r) => sortKey(r.staff), render: (r) => <CellView c={r.staff} id={`${r.id}:staff`} audit={audit} fmt={fmt} /> },
    { key: 'network', header: 'Network', width: 120, sortValue: (r) => sortKey(r.network), render: (r) => <CellView c={r.network} id={`${r.id}:network`} audit={audit} nil="" /> },
    { key: 'reactor', header: 'Power', width: 70, sortValue: (r) => sortKey(r.reactor), render: (r) => <CellView c={r.reactor} id={`${r.id}:reactor`} audit={audit} fmt={(v) => (v ? 'Reactor' : 'Service')} /> },
    { key: 'completed', header: 'Completed', width: 84, mono: true, sortValue: (r) => sortKey(r.completed), render: (r) => <CellView c={r.completed} id={`${r.id}:completed`} audit={audit} fmt={(v) => (v ? fmtMonth(v) : '')} /> },
  ];
  const t = totals(rows);
  const footer = allShown ? (
    <span class="reg-foot">
      {fmt(canon.headline.facilities)} installations. Total surge berthing <b class="reg-mono">{fmt(canon.headline.capacitySurge)}</b>. Total posted staff{' '}
      <b class="reg-mono">{fmt(canon.headline.staffPosted)}</b>.
    </span>
  ) : (
    <span class="reg-foot">
      {t.rows} shown. Berthing <b class="reg-mono">{fmt(t.capacity)}</b>
      {t.capacityWithheld ? ` (${t.capacityWithheld} withheld)` : ''}. Posted <b class="reg-mono">{fmt(t.staff)}</b>
      {t.staffWithheld ? ` (${t.staffWithheld} withheld)` : ''}.
    </span>
  );
  return (
    <DataTable<RegRow>
      flexMin={170}
      label="Register of installations"
      columns={cols}
      rows={rows}
      rowKey={(r) => r.id}
      selection="single"
      selected={selected ? [selected] : []}
      onSelectionChange={(k) => onSelect(k[0] ?? null)}
      onActivate={(r) => onOpen(r.id)}
      sort={sort}
      onSortChange={onSort}
      dense
      footer={footer}
      rowClass={(r) => (r.id === canon.operator.site ? 'reg-row-home' : undefined)}
      empty={<span class="reg-note">No installation matches the filter.</span>}
    />
  );
}

/** One-line summary of the selected installation, under the table or beside the map. */
export function SelectionSummary({ row, onOpen, audit }: { row: RegRow | null; onOpen: (id: string) => void; audit: RxAudit }) {
  if (!row) return <div class="reg-sel reg-sel--none">No installation selected. Select a row or a marker; Enter opens the dossier.</div>;
  return (
    <div class="reg-sel">
      <span class="reg-sel__id">
        <MarkerGlyph cls={row.cls} size={12} /> {row.id}
      </span>
      {isOpen(row.codename) && row.codename.v ? <span class="reg-sel__code">"{row.codename.v}"</span> : null}
      <span>
        {row.cls}, {className(row.cls)}
      </span>
      <span>
        <CellView c={row.location} id={`${row.id}:location`} audit={audit} />
      </span>
      <button type="button" class="reg-linkbtn" onClick={() => onOpen(row.id)}>
        Open dossier {row.id}
      </button>
    </div>
  );
}
