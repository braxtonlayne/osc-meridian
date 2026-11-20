/** ALPHA-03 vault catalogues: paged record browsers over the deterministic generators. */
import { useMemo } from 'preact/hooks';
import { Button, DataTable, FieldMessage, Pager, PropertyGrid, TextField, Toolbar, ToolbarButton, ToolbarLabel, ToolbarSeparator } from '@design/index';
import type { Column } from '@design/index';
import {
  BROWSE_PER_DAY,
  GENE_PREFIX,
  GENE_TIMELINE,
  PAGE_SIZE,
  SEED_PREFIX,
  SEED_TIMELINE,
  browseClock,
  findAccession,
  geneRecord,
  linearClock,
  pageCount,
  pageIndices,
  seedRecord,
} from './catalogue';
import type { Clock, DocTable, GeneRecord, GeneRelease, SeedRecord } from './catalogue';
import { canon, fmtN } from './data';
import { Bar, CanonText, useRsv } from './parts';
import { revealItem, useCanonT2 } from './acct';
import { useServices } from '@core/services';

export interface BrowserState {
  page: number;
  selected: string | null;
  query: string;
  message: string | null;
}

export const initialBrowser = (): BrowserState => ({ page: 1, selected: null, query: '', message: null });

function FindBar({
  state,
  onChange,
  prefix,
  clock,
  accessionOf,
  onSearch,
}: {
  state: BrowserState;
  onChange: (s: BrowserState) => void;
  prefix: string;
  clock: Clock;
  accessionOf: (i: number) => string;
  onSearch: (q: string) => void;
}) {
  const go = () => {
    const q = state.query.trim().toUpperCase();
    if (!q) {
      onChange({ ...state, message: 'REJECTED: enter an accession number.' });
      return;
    }
    onSearch(q);
    const idx = findAccession(q, prefix, clock);
    if (idx === null) {
      onChange({ ...state, message: `REJECTED: ${q} is not an accession in this catalogue. Accession numbers take the form ${prefix}-YY-NNNNNN.` });
      return;
    }
    onChange({ ...state, page: Math.floor(idx / PAGE_SIZE) + 1, selected: accessionOf(idx), message: null });
  };
  return (
    <div class="rsv-find">
      <form
        class="rsv-find__form"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <TextField label="Accession" mono upper width={150} value={state.query} onInput={(v) => onChange({ ...state, query: v, message: null })} layout="inline" />
        <Button label="&Find" size="small" onClick={go} />
      </form>
      {state.message ? <FieldMessage kind="error">{state.message}</FieldMessage> : null}
    </div>
  );
}

/** "Triticum aestivum 'Turkey'": genus and species in italics. */
function Taxon({ name }: { name: string }) {
  const m = /^([A-Z][a-z]+ [a-z-]+)(.*)$/.exec(name);
  return m ? (
    <span>
      <i>{m[1]}</i>
      {m[2]}
    </span>
  ) : (
    <span>{name}</span>
  );
}

/* ------------------------------------------------------------------ seed collection */

export function SeedBrowser({
  state,
  onChange,
  onSearch,
  overlay,
}: {
  state: BrowserState;
  onChange: (s: BrowserState) => void;
  onSearch: (q: string) => void;
  /** "Catalogue, page 1" as printed in OSC-RSV-SEED. */
  overlay: DocTable | null;
}) {
  const { narrow } = useRsv();
  const item = canon.reserves.items.find((i) => i.id === 'FOOD-SEED');
  const total = typeof item?.value === 'number' ? item.value : 0;
  const clock = useMemo(() => linearClock(total, SEED_TIMELINE), [total]);
  const pages = pageCount(total);
  const rows = useMemo(() => pageIndices(state.page, total).map((i) => seedRecord(i, clock, overlay)), [state.page, total, clock, overlay]);
  const sel = rows.find((r) => r.accession === state.selected) ?? null;

  const columns: Column<SeedRecord>[] = [
    { key: 'accession', header: 'Accession', width: 110, mono: true },
    { key: 'taxon', header: 'Taxon', width: 250, render: (r) => <Taxon name={r.taxon} /> },
    { key: 'origin', header: 'Origin', width: 140 },
    { key: 'received', header: 'Received', width: 96, mono: true },
    { key: 'viability', header: 'Viability test', width: 130, mono: true },
    { key: 'location', header: 'Location', width: 110, mono: true },
  ];

  return (
    <div class="rsv-catalogue">
      <PropertyGrid
        columns={2}
        rows={[
          { label: 'Collection', value: item ? <CanonText value={item.label} /> : '' },
          { label: 'Holdings', value: item ? <CanonText value={item.text} /> : '' },
          { label: 'Store', value: 'Level 8, cold rooms 1 and 2' },
          { label: 'Compartment', value: 'LANTERN' },
        ]}
      />
      <FindBar
        state={state}
        onChange={onChange}
        prefix={SEED_PREFIX}
        clock={clock}
        accessionOf={(i) => seedRecord(i, clock, overlay).accession}
        onSearch={onSearch}
      />
      <Pager page={state.page} pageCount={pages} onPage={(p) => onChange({ ...state, page: p, message: null })} noun="Page" total={total} totalNoun="accessions" label="Seed catalogue pages" />
      <DataTable
        columns={narrow ? columns.filter((c) => ['accession', 'taxon', 'received'].includes(c.key)) : columns}
        rows={rows}
        rowKey={(r) => r.accession}
        label={`Seed accessions, page ${state.page} of ${pages}`}
        selection="single"
        selected={state.selected ? [state.selected] : []}
        onSelectionChange={(k) => onChange({ ...state, selected: k[0] ?? null })}
        dense
        sortRows={false}
      />
      {sel ? (
        <PropertyGrid
          caption={`Accession ${sel.accession}`}
          columns={2}
          rows={[
            { label: 'Taxon', value: <Taxon name={sel.taxon} /> },
            { label: 'Origin', value: sel.origin },
            { label: 'Received', value: sel.received, mono: true },
            { label: 'Last viability test', value: sel.viability, mono: true },
            { label: 'Location', value: `Level 8, ${sel.location}`, mono: true },
            { label: 'Catalogue page', value: fmtN(Math.floor(sel.index / PAGE_SIZE) + 1), mono: true },
          ]}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ biological samples */

export function GeneBrowser({
  state,
  onChange,
  onSearch,
  releasedTotal,
  overlay,
  release,
}: {
  state: BrowserState;
  onChange: (s: BrowserState) => void;
  onSearch: (q: string) => void;
  /** Holdings as printed in the record released to this operator; null while withheld. */
  releasedTotal: number | null;
  overlay: DocTable | null;
  release: GeneRelease;
}) {
  const { satisfies, narrow } = useRsv();
  const t2 = useCanonT2(useServices());
  const raw = canon.reserves.items.find((i) => i.id === 'MED-GENETIC');
  const item = raw ? revealItem(raw, t2) : undefined;
  const total = releasedTotal;
  const clock = useMemo(() => (total !== null ? linearClock(total, GENE_TIMELINE) : browseClock(BROWSE_PER_DAY, GENE_TIMELINE)), [total]);
  const rows = useMemo(
    () => pageIndices(state.page, clock.size).map((i) => geneRecord(i, clock, overlay, release)),
    [state.page, clock, overlay, release],
  );
  const sel = rows.find((r) => r.accession === state.selected) ?? null;

  const donor = (r: GeneRecord) => (r.donor !== null ? r.donor : <Bar len={r.donorLen} rxKey="T2" reference="OSC-RSV-GENE" />);
  const basis = (r: GeneRecord) => (r.basis !== null ? r.basis : <Bar len={r.basisLen} rxKey="T2" reference="OSC-RSV-GENE" />);

  const columns: Column<GeneRecord>[] = [
    { key: 'accession', header: 'Accession', width: 110, mono: true },
    { key: 'sampleType', header: 'Sample type', width: 120 },
    { key: 'aliquots', header: 'Aliquots', width: 60, mono: true, align: 'right' },
    { key: 'received', header: 'Received', width: 96, mono: true },
    { key: 'storage', header: 'Storage', width: 120, mono: true },
    { key: 'donor', header: 'Donor category', width: 104, sortable: false, render: donor },
    { key: 'basis', header: 'Selection basis', sortable: false, render: basis },
  ];

  const setPage = (p: number) => onChange({ ...state, page: p, message: null });

  return (
    <div class="rsv-catalogue">
      <PropertyGrid
        columns={2}
        rows={[
          { label: 'Collection', value: 'Biological Sample Collection (BSC), ALPHA-03' },
          { label: 'Holdings', value: total !== null ? `${fmtN(total)} samples` : item ? <CanonText value={item.text} /> : '' },
          { label: 'Store', value: 'Freezer hall and dewar room' },
          { label: 'Compartment', value: `LANTERN (accession and storage); Tier 2 (donor fields)${satisfies('T2') ? '' : ', not held'}` },
        ]}
      />
      <FindBar
        state={state}
        onChange={onChange}
        prefix={GENE_PREFIX}
        clock={clock}
        accessionOf={(i) => geneRecord(i, clock, overlay, release).accession}
        onSearch={onSearch}
      />
      {total === null ? (
        <Toolbar label="Biological catalogue pages">
          <ToolbarButton label="First" onClick={() => setPage(1)} disabled={state.page <= 1} />
          <ToolbarButton label="Previous" onClick={() => setPage(Math.max(1, state.page - 1))} disabled={state.page <= 1} />
          <ToolbarLabel>
            Page <span class="rsv-mono">{fmtN(state.page)}</span> of <Bar len={5} rxKey="T2" reference="OSC-RSV-GENE" />
          </ToolbarLabel>
          <ToolbarButton label="Next" onClick={() => setPage(state.page + 1)} />
          <ToolbarSeparator />
          <ToolbarButton
            label="Last"
            onClick={() => onChange({ ...state, message: 'REJECTED: the extent of the collection is withheld at Tier 2. Browse by page or find an accession by number.' })}
          />
        </Toolbar>
      ) : (
        <Pager page={state.page} pageCount={pageCount(total)} onPage={setPage} noun="Page" total={total} totalNoun="samples" label="Biological catalogue pages" />
      )}
      <DataTable
        columns={narrow ? columns.filter((c) => ['accession', 'sampleType', 'donor'].includes(c.key)) : columns}
        rows={rows}
        rowKey={(r) => r.accession}
        label={`Biological sample accessions, page ${state.page}`}
        selection="single"
        selected={state.selected ? [state.selected] : []}
        onSelectionChange={(k) => onChange({ ...state, selected: k[0] ?? null })}
        dense
        sortRows={false}
      />
      {sel ? (
        <PropertyGrid
          caption={`Accession ${sel.accession}`}
          columns={2}
          rows={[
            { label: 'Sample type', value: sel.sampleType },
            { label: 'Aliquots', value: sel.aliquots, mono: true },
            { label: 'Received', value: sel.received, mono: true },
            { label: 'Storage', value: sel.storage, mono: true },
            { label: 'Donor category', value: donor(sel) },
            { label: 'Selection basis', value: basis(sel) },
          ]}
        />
      ) : null}
    </div>
  );
}
