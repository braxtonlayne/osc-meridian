/** Reserves: stock tables, facility table, sustainment calculator, reactor fleet table. */
import { useMemo } from 'preact/hooks';
import { DataTable, FieldGroup, FieldMessage, GroupBox, PropertyGrid, Select, StatusLight, TextField } from '@design/index';
import type { Column } from '@design/index';
import type { Facility } from '@core/canon-types';
import { rxInfo } from '@core/rx';
import { CATEGORY_LABEL, CATEGORY_ORDER, canon, fmtN, houseDate, siteReleased } from './data';
import type { Category, ReserveItem } from './data';
import { Bar, CanonText, LinkButton, useRsv } from './parts';
import { describeDays, facilityWindow, networkSustainment, parseWhole } from './sustain';

const tierWord = (t: number) => (t === 1 ? 'Tier 1' : t === 2 ? 'Tier 2' : 'Tier 3');

/* ------------------------------------------------------------------ stock position */

export function PositionTable({ categories, onOpenSite }: { categories?: Category[]; onOpenSite?: (item: ReserveItem) => void }) {
  const { narrow } = useRsv();
  const rows = useMemo(() => {
    const cats = categories ?? CATEGORY_ORDER;
    return canon.reserves.items
      .filter((i) => cats.includes(i.category))
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  }, [categories]);

  const columns: Column<ReserveItem>[] = [
    { key: 'category', header: 'Category', width: 90, render: (r) => CATEGORY_LABEL[r.category], sortValue: (r) => CATEGORY_ORDER.indexOf(r.category) },
    { key: 'id', header: 'Line', width: 132, mono: true },
    { key: 'label', header: 'Item', width: 190, render: (r) => <CanonText value={r.label} />, sortValue: (r) => (rxInfo(r.label) ? '' : r.label) },
    {
      key: 'value',
      header: 'Quantity',
      width: 176,
      align: 'right',
      mono: true,
      sortValue: (r) => r.value,
      render: (r) => {
        if (typeof r.value === 'number') return `${fmtN(r.value)}${r.unit ? ` ${r.unit}` : ''}`;
        const info = rxInfo(r.text) ?? rxInfo(r.label);
        if (info) return <Bar len={Math.max(6, Math.min(12, info.len))} rxKey={info.key} />;
        return 'Not quantified';
      },
    },
    { key: 'text', header: 'Statement (as held)', wrap: true, render: (r) => <CanonText value={r.text} />, sortable: false },
    {
      key: 'site',
      header: 'Held at',
      width: 84,
      mono: true,
      render: (r) => (r.site ? onOpenSite ? <LinkButton onClick={() => onOpenSite(r)}>{r.site}</LinkButton> : r.site : 'Network'),
      sortValue: (r) => r.site ?? '',
    },
    { key: 'tier', header: 'Release', width: 64, render: (r) => tierWord(r.tier) },
  ];
  return (
    <DataTable
      columns={narrow ? columns.filter((c) => ['label', 'text', 'site'].includes(c.key)) : columns}
      rows={rows}
      rowKey={(r) => r.id}
      label={`Reserve lines, ${rows.length} records`}
      selection="single"
      dense
      wrap
    />
  );
}

export function PositionSummary() {
  const h = canon.headline;
  return (
    <PropertyGrid
      columns={2}
      rows={[
        { label: 'Basis', value: canon.reserves.basisNote },
        { label: 'Position date', value: houseDate(canon.meta.inWorldDate), mono: true },
        { label: 'Sustained capacity', value: fmtN(h.capacitySustained), mono: true },
        { label: 'Total surge berthing', value: fmtN(h.capacitySurge), mono: true },
        { label: 'Total personnel', value: fmtN(h.staffTotal), mono: true },
        { label: 'Reserve lines', value: String(canon.reserves.items.length), mono: true },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ by facility */

interface FacRow {
  f: Facility;
  window: string;
}

/** A site figure; null is withheld by the client canon (DELTA, Tier 1), never zero. */
function figure(n: number | null) {
  return n === null ? <Bar len={4} rxKey="T1" /> : fmtN(n);
}

/** Occupancy offered when a site is chosen; a site with withheld berths starts at one. */
const defaultOccupancy = (f: Facility): string => String(f.capacity ?? 1);

export function FacilityTable({ onOpen }: { onOpen: (f: Facility) => void }) {
  const { satisfies, narrow } = useRsv();
  const tallow = satisfies('TALLOW');
  const rows: FacRow[] = useMemo(
    () =>
      canon.facilities.map((f) => {
        const cls = canon.classes.find((c) => c.id === f.class);
        const w = f.class === 'ALPHA' && f.sustainedMonths != null ? `${f.sustainedMonths} months` : (cls?.sustainabilityText ?? '');
        return { f, window: w };
      }),
    [],
  );
  const columns: Column<FacRow>[] = [
    { key: 'id', header: 'Facility', width: 82, mono: true, sortValue: (r) => r.f.id, render: (r) => r.f.id },
    { key: 'class', header: 'Class', width: 56, sortValue: (r) => r.f.class, render: (r) => r.f.class },
    { key: 'cap', header: 'Berths', width: 64, align: 'right', mono: true, sortValue: (r) => r.f.capacity, render: (r) => figure(r.f.capacity) },
    { key: 'staff', header: 'Posted', width: 60, align: 'right', mono: true, sortValue: (r) => r.f.staff, render: (r) => figure(r.f.staff) },
    {
      key: 'fill',
      header: 'Occupancy',
      width: 76,
      align: 'right',
      mono: true,
      title: 'Posted staff as a percentage of berths',
      sortValue: (r) => (r.f.staff === null || r.f.capacity === null ? null : r.f.staff / r.f.capacity),
      render: (r) => (r.f.staff === null || r.f.capacity === null ? <Bar len={5} rxKey="T1" /> : `${((r.f.staff / r.f.capacity) * 100).toFixed(1)}%`),
    },
    { key: 'window', header: 'Sustainment window', wrap: true, sortValue: (r) => r.window, render: (r) => r.window },
    {
      key: 'reactor',
      header: 'Reactor',
      width: 64,
      sortable: false,
      render: (r) =>
        !siteReleased(r.f.id, satisfies) || r.f.reactor === null ? (
          <Bar len={3} rxKey={r.f.class === 'DELTA' ? 'T1' : 'SEXTANT'} />
        ) : r.f.reactor ? (
          'Yes'
        ) : (
          'No'
        ),
    },
    {
      key: 'stock',
      header: 'Site stock position',
      width: 150,
      sortable: false,
      render: () => (tallow ? 'Released (see category records)' : <Bar len={14} rxKey="TALLOW" />),
    },
  ];
  return (
    <DataTable
      columns={narrow ? columns.filter((c) => ['id', 'cap', 'staff', 'window'].includes(c.key)) : columns}
      rows={rows}
      rowKey={(r) => r.f.id}
      label={`Facilities, ${rows.length} records`}
      selection="single"
      dense
      onActivate={(r) => onOpen(r.f)}
      defaultSort={{ key: 'id', dir: 'asc' }}
    />
  );
}

/* ------------------------------------------------------------------ calculator */

export interface CalcState {
  population: string;
  meals: string;
  site: string;
  occupancy: string;
}

export function initialCalc(): CalcState {
  const f = canon.facilities[0]!;
  return { population: String(canon.headline.capacitySustained), meals: '3', site: f.id, occupancy: defaultOccupancy(f) };
}

export function Calculator({ state, onChange }: { state: CalcState; onChange: (s: CalcState) => void }) {
  const { satisfies, narrow } = useRsv();
  const h = canon.headline;
  const presets = [
    { value: String(h.capacitySustained), label: `Sustained capacity (${fmtN(h.capacitySustained)})` },
    { value: String(h.capacitySurge), label: `Total surge berthing (${fmtN(h.capacitySurge)})` },
    { value: String(h.staffTotal), label: `Total personnel (${fmtN(h.staffTotal)})` },
    { value: String(h.staffPosted), label: `Total posted staff (${fmtN(h.staffPosted)})` },
    ...canon.phases
      .filter((p) => typeof p.targetCount === 'number')
      .map((p) => ({ value: String(p.targetCount), label: `Phase ${p.n} target (${fmtN(p.targetCount!)})` })),
  ];
  const presetValue = presets.find((p) => p.value === state.population.replace(/,/g, '').trim())?.value ?? '';

  const pop = parseWhole(state.population, '1', 'Population', 1, h.capacitySurge, 'total surge berthing');
  const meals = parseWhole(state.meals, '2', 'Meals per person per day', 1, 6, 'the ration scale maximum');
  const lines = pop.ok && meals.ok ? networkSustainment(canon, pop.value, meals.value) : [];

  const fac = canon.facilities.find((f) => f.id === state.site) ?? canon.facilities[0]!;
  const facCls = canon.classes.find((c) => c.id === fac.class);
  // Withheld berths (DELTA): the class's stated berthing is the only bound held in clear.
  const occ =
    fac.capacity !== null
      ? parseWhole(state.occupancy, '4', 'Occupancy', 1, fac.capacity, `the berths at ${fac.id}`)
      : parseWhole(state.occupancy, '4', 'Occupancy', 1, facCls?.statedCapacity ?? 1, `the ${fac.class} class berthing`);
  const win = occ.ok ? facilityWindow(fac, facCls, occ.value) : null;

  const set = (p: Partial<CalcState>) => onChange({ ...state, ...p });

  const lineCols: Column<(typeof lines)[number]>[] = [
    { key: 'label', header: 'Reserve', width: 170 },
    { key: 'stock', header: 'Stock (as held)', wrap: true, sortable: false },
    { key: 'basis', header: 'Computation', wrap: true, sortable: false, mono: true },
    { key: 'days', header: 'Days', width: 70, align: 'right', mono: true, sortValue: (l) => l.days, render: (l) => describeDays(l.days).days },
    { key: 'months', header: 'Months', width: 64, align: 'right', mono: true, sortable: false, render: (l) => describeDays(l.days).months },
    { key: 'years', header: 'Years', width: 56, align: 'right', mono: true, sortable: false, render: (l) => describeDays(l.days).years },
    {
      key: 'per',
      header: 'Per person',
      width: 170,
      wrap: true,
      sortable: false,
      render: (l) => (l.perHead ? `${l.perHead.value.toFixed(l.perHead.value < 10 ? 2 : 1)} ${l.perHead.unit}` : ''),
    },
  ];

  const wd = win ? describeDays(win.minDays) : null;
  const wdMax = win && win.maxDays !== win.minDays ? describeDays(win.maxDays) : null;

  return (
    <div class="rsv-stack">
      <GroupBox title="Network reserves against population">
        <FieldGroup labelWidth="190px">
          <Select
            label="Planning population"
            block="1a"
            value={presetValue}
            emptyLabel="(entered figure)"
            options={presets}
            onChange={(v) => v && set({ population: v })}
          />
          <TextField
            label="Population"
            block="1"
            mono
            inputMode="numeric"
            width={120}
            value={state.population}
            onInput={(v) => set({ population: v })}
            error={pop.ok ? null : pop.error}
            required
          />
          <TextField
            label="Meals per person per day"
            block="2"
            mono
            inputMode="numeric"
            width={60}
            value={state.meals}
            onInput={(v) => set({ meals: v })}
            error={meals.ok ? null : meals.error}
            required
          />
        </FieldGroup>
        {lines.length ? (
          <DataTable columns={narrow ? lineCols.filter((c) => ['label', 'days', 'months', 'years', 'per'].includes(c.key)) : lineCols} rows={lines} rowKey={(l) => l.id} label="Sustainment by reserve line" dense wrap sortRows={false} />
        ) : (
          <FieldMessage kind="notice">Computation suspended until blocks 1 and 2 are accepted.</FieldMessage>
        )}
        <p class="rsv-note">
          Network stocks are stated at network scale and are not apportioned to sites here. Site stock positions:{' '}
          {satisfies('TALLOW') ? 'released in the category records.' : <Bar len={22} rxKey="TALLOW" />}
        </p>
      </GroupBox>

      <GroupBox title="Facility sustainment window">
        <FieldGroup labelWidth="190px">
          <Select
            label="Facility"
            block="3"
            value={fac.id}
            options={canon.facilities.map((f) => ({ value: f.id, label: `${f.id}${f.codename && !rxInfo(f.codename) ? ` ${f.codename}` : ''}` }))}
            onChange={(v) => {
              const f = canon.facilities.find((x) => x.id === v);
              if (f) set({ site: f.id, occupancy: defaultOccupancy(f) });
            }}
          />
          <TextField
            label="Occupancy"
            block="4"
            mono
            inputMode="numeric"
            width={120}
            value={state.occupancy}
            onInput={(v) => set({ occupancy: v })}
            error={occ.ok ? null : occ.error}
            hint={
              fac.capacity === null ? (
                <>
                  Berths at {fac.id}: <Bar len={4} rxKey="T1" /> ({fac.class} class: {fmtN(facCls?.statedCapacity ?? 0)})
                </>
              ) : (
                `Berths at ${fac.id}: ${fmtN(fac.capacity)}`
              )
            }
            required
          />
        </FieldGroup>
        {win ? (
          <PropertyGrid
            rows={[
              { label: 'Stated window', value: win.stated },
              { label: 'Computation', value: win.basis, mono: true },
              {
                label: 'Days',
                mono: true,
                value: win.minDays === null ? 'No figure held' : wdMax ? `${wd!.days} to ${wdMax.days}` : wd!.days,
              },
              {
                label: 'Months',
                mono: true,
                value: win.minDays === null ? '' : wdMax ? `${wd!.months} to ${wdMax.months}` : wd!.months,
              },
              { label: 'Scaled by occupancy', value: win.scaled ? 'Yes, pro rata of berths' : 'No' },
            ]}
          />
        ) : null}
      </GroupBox>
    </div>
  );
}

/* ------------------------------------------------------------------ reactor fleet */

type Rx = (typeof canon.reactors)[number];

export function FleetTable({ onOpen }: { onOpen: (r: Rx) => void }) {
  const { satisfies, narrow } = useRsv();
  const columns: Column<Rx>[] = [
    { key: 'id', header: 'Unit', width: 64, mono: true, render: (r) => <LinkButton onClick={() => onOpen(r)}>{r.id}</LinkButton> },
    {
      key: 'site',
      header: 'Site',
      width: 84,
      mono: true,
      sortValue: (r) => (siteReleased(r.site, satisfies) ? r.site : 'BETA'),
      render: (r) => (siteReleased(r.site, satisfies) ? r.site : <Bar len={7} rxKey="SEXTANT" />),
    },
    { key: 'designation', header: 'Designation', width: 128 },
    { key: 'thermalMWt', header: 'MWt', width: 48, align: 'right', mono: true },
    { key: 'electricMWe', header: 'MWe', width: 48, align: 'right', mono: true },
    { key: 'commissioned', header: 'Commissioned', width: 92, mono: true, render: (r) => houseDate(r.commissioned) },
    { key: 'status', header: 'Status', width: 96, render: (r) => <StatusLight status={r.status} /> },
    { key: 'statusNote', header: 'Status note', wrap: true, sortable: false },
  ];
  return (
    <DataTable
      columns={narrow ? columns.filter((c) => ['id', 'status', 'statusNote'].includes(c.key)) : columns}
      rows={canon.reactors}
      rowKey={(r) => r.id}
      label={`Reactor installations, ${canon.reactors.length} records`}
      selection="single"
      dense
      wrap
      onActivate={onOpen}
    />
  );
}
