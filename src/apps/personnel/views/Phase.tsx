/** Recruitment phase record, with the cumulative strength table across all five phases. */
import { DataTable, ProgressBar, PropertyGrid, StatusLight, type Column, type OperStatus } from '@design/index';
import type { Phase } from '@core/canon-types';
import { canon, fmt } from '../model';
import { Section, usePer } from '../ui';

const STATUS: Record<Phase['status'], OperStatus> = { COMPLETE: 'OFFLINE', ACTIVE: 'NOMINAL', PROJECTED: 'OFFLINE' };

/** Strength reached (cumulative) or targeted at the end of a phase. */
const level = (p: Phase): number | null => p.cumulative ?? p.targetCount;

export function CumulativeTable({ current }: { current?: number }) {
  const per = usePer();
  const max = Math.max(1, ...canon.phases.map((p) => level(p) ?? 0));
  const cols: Column<Phase>[] = [
    { key: 'n', header: 'Phase', width: 52, mono: true, sortValue: (p) => p.n, render: (p) => (p.n === current ? <strong>{p.n}</strong> : p.n) },
    { key: 'years', header: 'Years', width: 84, mono: true },
    { key: 'title', header: 'Title', render: (p) => p.title },
    { key: 'status', header: 'Status', width: 112, sortValue: (p) => p.status, render: (p) => <StatusLight status={STATUS[p.status]} word={p.status} /> },
    { key: 'rec', header: 'Recruited', width: 96, align: 'right', mono: true, sortValue: (p) => p.recruited ?? -1, render: (p) => (p.recruited === null ? '' : fmt(p.recruited)) },
    { key: 'cum', header: 'Cumulative or target', width: 170, wrap: true, align: 'right', mono: true, sortValue: (p) => level(p) ?? -1, render: (p) => (level(p) === null ? '' : `${fmt(level(p)!)}${p.cumulative === null ? ' (target)' : ''}`) },
    {
      key: 'bar',
      header: 'Strength',
      sortable: false,
      width: 220,
      render: (p) => (level(p) === null ? null : <ProgressBar value={level(p)!} max={max} label={`Phase ${p.n} strength`} showValue={false} segments={20} />),
    },
  ];
  return (
    <DataTable
      label="Cumulative strength by phase"
      columns={cols}
      rows={canon.phases}
      rowKey={(p) => String(p.n)}
      selection="single"
      selected={current ? [String(current)] : []}
      onActivate={(p) => per.go(`/personnel/phase/${p.n}`)}
      dense
    />
  );
}

export function PhaseView({ n }: { n: number }) {
  const p = canon.phases.find((x) => x.n === n)!;
  return (
    <div class="per-view">
      <PropertyGrid
        caption={`Phase ${p.n}: ${p.title}`}
        columns={2}
        rows={[
          { label: 'Years', value: p.years, mono: true },
          { label: 'Status', value: <StatusLight status={STATUS[p.status]} word={p.status} /> },
          { label: 'Recruited in phase', value: p.recruited === null ? 'Not applicable' : fmt(p.recruited), mono: true },
          { label: 'Cumulative strength', value: p.cumulative === null ? 'Not applicable' : fmt(p.cumulative), mono: true },
          { label: 'Target, % of capacity', value: p.targetPct === null ? 'None set' : `${fmt(p.targetPct)}%`, mono: true },
          { label: 'Target strength', value: p.targetCount === null ? 'None set' : fmt(p.targetCount), mono: true },
        ]}
      />
      <Section title="Phase content">
        <ul class="per-list">
          {p.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
        {p.targetCount !== null ? (
          <p class="per-note">
            Targets are stated against sustained capacity ({fmt(canon.headline.capacitySustained)}).
          </p>
        ) : null}
      </Section>
      <Section title="Cumulative strength by phase">
        <CumulativeTable current={p.n} />
        <p class="per-note">Enter or double-click a phase to open its record.</p>
      </Section>
    </div>
  );
}
