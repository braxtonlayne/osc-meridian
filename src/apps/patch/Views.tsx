/**
 * Table views: circuit list of a bay, line quality history, and the bay log (cords standing,
 * tests, calls).
 */
import { useState } from 'preact/hooks';
import { DataTable, PropertyGrid, Select, type Column } from '@design/index';
import { Trend } from '@graphics/patch';
import type { AccountDef } from '@core/contracts';
import type { PatchCircuit } from '@core/canon-apps/patch';
import { PC, circuit, circuitsAt, cordsAt, history, jackLabel, lampOf, lineOf, service, type LampContext } from './model';
import { ServiceWord, chartScale, farName, routeName } from './Bay';
import { bayName } from './ops';
import type { CallRecord, CircuitTest, PatchCord, PatchState } from './types';

interface Common {
  site: string;
  state: PatchState | null;
  isolated: boolean;
  withheld: ReadonlySet<string>;
  t4: boolean;
  lampCtx: LampContext;
  accounts: AccountDef[];
}

function figures(c: PatchCircuit): string {
  if (c.kind === 'DATA') return `1E${c.berExp} / ${c.esPerHour} ES/h`;
  if (c.lossDb == null || c.status === 'NOT ASSIGNED') return 'Open';
  return `${c.lossDb} dB / ${c.noiseDbrnc0} dBrnC0`;
}

export function CircuitsView(p: Common & { selected: string | null; onSelect(id: string): void; onOpen(id: string): void }) {
  const rows = circuitsAt(p.site);
  const cols: Column<PatchCircuit>[] = [
    { key: 'id', header: 'Circuit', width: 78, mono: true, render: (c) => (p.withheld.has(c.id) ? <span class="pt-rx" title="Withheld: CMS · SEXTANT" aria-label="Withheld">{' '.repeat(4)}</span> : c.id) },
    { key: 'route', header: 'Route', width: 120, mono: true, render: (c) => (p.withheld.has(c.id) ? 'Withheld' : routeName(c, p.t4)) },
    { key: 'far', header: 'Far end', width: 82, mono: true, sortValue: (c) => farName(c, p.site, p.t4), render: (c) => (p.withheld.has(c.id) ? 'Withheld' : farName(c, p.site, p.t4)) },
    { key: 'kind', header: 'Type', width: 56, render: (c) => (p.withheld.has(c.id) ? 'Withheld' : c.kind) },
    { key: 'use', header: 'Use', render: (c) => (p.withheld.has(c.id) ? 'Withheld' : c.use) },
    { key: 'status', header: 'Register', width: 104 },
    { key: 'svc', header: 'Service', width: 128, sortValue: (c) => service(p.state, c, p.isolated).status, render: (c) => <ServiceWord status={service(p.state, c, p.isolated).status} /> },
    { key: 'lamp', header: 'Lamp', width: 52, sortValue: (c) => lampOf(p.state, c, p.lampCtx), render: (c) => lampOf(p.state, c, p.lampCtx).toUpperCase() },
    { key: 'order', header: 'Order of record', width: 104, mono: true, render: (c) => (p.withheld.has(c.id) ? 'Withheld' : c.order ?? 'None') },
    { key: 'fig', header: 'Figures of record', width: 150, mono: true, render: (c) => (p.withheld.has(c.id) ? 'Withheld' : figures(c)) },
  ];
  return (
    <div class="pt-table-view">
      <DataTable
        columns={cols}
        rows={rows}
        rowKey={(c) => c.id}
        label={`Circuits terminating at bay ${bayName(p.site)}, ${rows.length} records`}
        caption={`Bay ${bayName(p.site)}: ${rows.length} circuits. Enter or double-click opens the circuit in the bay.`}
        selection="single"
        selected={p.selected ? [p.selected] : []}
        onSelectionChange={(k) => k[0] && !p.withheld.has(k[0]) && p.onSelect(k[0])}
        onActivate={(c) => !p.withheld.has(c.id) && p.onOpen(c.id)}
        dense
        zebra
        flexMin={140}
      />
    </div>
  );
}

export function QualityView(p: Common & { selected: string | null; now: number; onSelect(id: string): void }) {
  const visible = circuitsAt(p.site).filter((c) => !p.withheld.has(c.id) && c.status !== 'NOT ASSIGNED' && c.lossDb !== null && (c.kind === 'DATA' || c.lossDb !== undefined));
  const pick = (p.selected && visible.find((c) => c.id === p.selected)) || visible[0];
  if (!pick) return <p class="pt-muted pt-pad">No measurable circuits at this bay.</p>;
  const line = lineOf(p.state, pick, p.site);
  const hist = history(line, p.now);
  const data = line.kind === 'DATA';
  const tests = (p.state?.tests ?? []).filter((t) => t.circuit === pick.id).slice(-8).reverse();
  const lastQ = tests.find((t) => t.kind === 'quality' && t.samples?.length);
  const scale = chartScale(data);
  return (
    <div class="pt-quality">
      <div class="pt-row">
        <Select
          label="Circuit"
          value={pick.id}
          options={visible.map((c) => ({ value: c.id, label: `${c.id}  ${routeName(c, p.t4)}  ${farName(c, p.site, p.t4)}` }))}
          onChange={(v) => p.onSelect(v)}
        />
      </div>
      <PropertyGrid
        columns={2}
        rows={[
          { label: 'Circuit', value: pick.id, mono: true },
          { label: 'Pair read', value: line.id === pick.id ? 'Own pair' : `${line.id} (repatched)`, mono: true },
          { label: 'Primary figure', value: data ? 'Errored seconds per hour' : 'C-message noise, dBrnC0' },
          { label: 'Limit', value: data ? `${PC.limits.esWarnPerHour} warn, ${PC.limits.esFailPerHour} limit` : `${PC.limits.noiseWarnDbrnc0} warn, ${PC.limits.noiseFailDbrnc0} limit`, mono: true },
        ]}
      />
      <h3 class="pt-h">Performance monitoring, last {PC.tests.historyHours} hours (hourly)</h3>
      <Trend label={`${pick.id} hourly ${scale.unit}`} values={hist.map((h) => h.value)} {...scale} from={`${PC.tests.historyHours} h ago`} to="this hour" width={560} height={150} />
      {lastQ ? (
        <>
          <h3 class="pt-h">Last line quality run: {lastQ.id}</h3>
          <Trend label={`${lastQ.id} samples`} values={lastQ.samples!} {...scale} from="start" to={`${lastQ.samples!.length} samples`} width={560} height={130} />
        </>
      ) : (
        <p class="pt-muted">No line quality run recorded for {pick.id}. Patch the test set to its LINE jack and run QUAL.</p>
      )}
      <h3 class="pt-h">Tests on {pick.id}</h3>
      <TestTable tests={tests} accounts={p.accounts} />
    </div>
  );
}

function who(accounts: AccountDef[], id: string): string {
  return accounts.find((a) => a.id === id)?.operatorId ?? id;
}

function TestTable({ tests, accounts }: { tests: CircuitTest[]; accounts: AccountDef[] }) {
  const cols: Column<CircuitTest>[] = [
    { key: 'id', header: 'Test', width: 92, mono: true },
    { key: 'at', header: 'Time (Z)', width: 70, mono: true, render: (t) => t.at.slice(11, 16).replace(':', '') + 'Z' },
    { key: 'circuit', header: 'Circuit', width: 70, mono: true },
    { key: 'kind', header: 'Test', width: 70 },
    { key: 'result', header: 'Result', width: 72 },
    { key: 'by', header: 'By', width: 104, mono: true, render: (t) => who(accounts, t.by) },
    { key: 'summary', header: 'Reading', wrap: true },
  ];
  return <DataTable columns={cols} rows={tests} rowKey={(t) => t.id} label={`Tests, ${tests.length} records`} dense zebra wrap empty={<p class="pt-muted">No tests recorded.</p>} />;
}

export function LogView(p: Common) {
  const [tab, setTab] = useState<'cords' | 'tests' | 'calls'>('cords');
  const cords = cordsAt(p.state, p.site);
  const tests = (p.state?.tests ?? []).filter((t) => t.site === p.site).slice().reverse();
  const calls = (p.state?.calls ?? []).filter((c) => c.site === p.site).slice().reverse();
  const cordCols: Column<PatchCord>[] = [
    { key: 'id', header: 'Cord', width: 70, mono: true },
    { key: 'a', header: 'From', width: 130, mono: true, render: (c) => jackLabel(c.a) },
    { key: 'b', header: 'To', width: 130, mono: true, render: (c) => jackLabel(c.b) },
    { key: 'purpose', header: 'Purpose', width: 76 },
    { key: 'order', header: 'Order', width: 130, mono: true, render: (c) => c.order ?? (c.purpose === 'repatch' && !c.authorised ? 'NONE HELD' : 'Not required') },
    { key: 'by', header: 'By', width: 104, mono: true, render: (c) => who(p.accounts, c.by) },
    { key: 'at', header: 'Inserted (Z)', width: 84, mono: true, render: (c) => c.at.slice(11, 16).replace(':', '') + 'Z' },
  ];
  const callCols: Column<CallRecord>[] = [
    { key: 'id', header: 'Call', width: 70, mono: true },
    { key: 'at', header: 'Time (Z)', width: 70, mono: true, render: (c) => c.at.slice(11, 16).replace(':', '') + 'Z' },
    { key: 'circuit', header: 'Circuit', width: 70, mono: true },
    { key: 'number', header: 'Dialled', width: 64, mono: true, render: (c) => c.number || 'Ringdown' },
    { key: 'outcome', header: 'Outcome', width: 90 },
    { key: 'answer', header: 'Answered', wrap: true, render: (c) => c.answer ?? '' },
    { key: 'durationS', header: 'Secs', width: 48, align: 'right', mono: true },
    { key: 'by', header: 'By', width: 104, mono: true, render: (c) => who(p.accounts, c.by) },
  ];
  return (
    <div class="pt-log">
      <div class="pt-row" role="radiogroup" aria-label="Log section">
        {(['cords', 'tests', 'calls'] as const).map((t) => (
          <label key={t} class="pt-radio">
            <input type="radio" name="pt-log" checked={tab === t} onChange={() => setTab(t)} /> {t === 'cords' ? `Cords standing (${cords.length})` : t === 'tests' ? `Tests (${tests.length})` : `Calls (${calls.length})`}
          </label>
        ))}
      </div>
      {tab === 'cords' ? (
        <DataTable columns={cordCols} rows={cords} rowKey={(c) => c.id} label={`Cords standing at ${bayName(p.site)}`} dense zebra empty={<p class="pt-muted">No cords standing. Every circuit at this bay is normal-through.</p>} />
      ) : tab === 'tests' ? (
        <TestTable tests={tests} accounts={p.accounts} />
      ) : (
        <DataTable columns={callCols} rows={calls} rowKey={(c) => c.id} label={`Calls from ${bayName(p.site)}`} dense zebra wrap empty={<p class="pt-muted">No calls placed from this bay.</p>} />
      )}
    </div>
  );
}

export { circuit };
