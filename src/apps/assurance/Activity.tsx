/** "Your session activity": the operator's own audit trail, as the Office of Internal Assurance reads it. */
import { useMemo, useState } from 'preact/hooks';
import type { AuditEntry } from '@core/contracts';
import { useServices } from '@core/services';
import { workstationId } from '@core/audit';
import { DataTable, GroupBox, PropertyGrid, Select, TextField, formatNumber, type Column } from '@design/index';
import { EmptyState } from '@graphics/states';
import { ACTIVITY_FILTERS, actionLabel, auditDate, auditRef, auditTime, currentSession, matchesFilter, summarize, type ActivityFilter } from './logic';
import { canon, useGridCols } from './shared';

export type ActivityScope = 'session' | 'all';

export function ActivityView({
  scope,
  onScope,
  filter,
  onFilter,
}: {
  scope: ActivityScope;
  onScope: (s: ActivityScope) => void;
  filter: ActivityFilter;
  onFilter: (f: ActivityFilter) => void;
}) {
  const services = useServices();
  const gridCols = useGridCols();
  const [text, setText] = useState('');
  const all = services.audit.entries.value;
  const base = useMemo(() => (scope === 'session' ? currentSession(all) : all.slice()), [all, scope]);
  const top = useMemo(() => [...canon.markings].sort((a, b) => b.rank - a.rank)[0], []);
  const rankOf = (docNo: string) => {
    const r = services.docs.byDocNo(docNo);
    return r ? (canon.markings.find((m) => m.id === r.marking)?.rank ?? null) : null;
  };
  const sum = useMemo(() => summarize(base, rankOf, top?.rank ?? 99), [base]);
  const q = text.trim().toUpperCase();
  const rows = useMemo(
    () =>
      base
        .filter((e) => matchesFilter(e, filter))
        .filter((e) => !q || `${e.subject} ${e.detail} ${actionLabel(e)} ${auditRef(e)}`.toUpperCase().includes(q))
        .reverse(),
    [base, filter, q],
  );

  const cols: Column<AuditEntry>[] = [
    { key: 'ref', header: 'Audit reference', width: 132, mono: true, sortValue: (e) => e.seq, render: (e) => auditRef(e) },
    { key: 'date', header: 'Date', width: 92, mono: true, render: (e) => auditDate(e.at) },
    { key: 'time', header: 'Time', width: 128, mono: true, sortValue: (e) => e.at, render: (e) => auditTime(e.at) },
    { key: 'act', header: 'Action', width: 160, sortValue: (e) => actionLabel(e), render: (e) => actionLabel(e) },
    { key: 'subj', header: 'Item', width: 130, mono: true, sortValue: (e) => e.subject, render: (e) => e.subject },
    { key: 'det', header: 'Record', wrap: true, render: (e) => e.detail },
  ];

  const psec = services.docs.byDocNo('OSC-ASR-PSEC');
  const from = sum.firstAt ? `${auditDate(sum.firstAt)} ${auditTime(sum.firstAt)}` : '';

  return (
    <div class="asr-view">
      <div class="asr-viewhead">
        <div>
          <div class="asr-h1">Your session activity</div>
          <div class="asr-sub">
            Record of workstation activity for operator {services.session.operatorId.value}, prepared from the workstation audit trail.
          </div>
        </div>
      </div>
      <GroupBox title="Record of workstation activity" on="surface">
        <PropertyGrid
          columns={gridCols}
          rows={[
            { label: 'Operator', value: services.session.operatorId.value, mono: true },
            { label: 'Workstation', value: `${workstationId()} (${services.account.def.value.site})`, mono: true },
            { label: 'Period', value: from ? `${from} to present` : 'No entries', mono: true },
            { label: 'Access', value: `Tier ${services.session.tier.value}${services.session.actingTier2.value ? ' (acting)' : ''}; ${services.session.compartments.value.join(', ') || 'no compartments'}` },
            { label: 'Actions recorded', value: formatNumber(sum.total), mono: true },
            { label: 'Documents displayed', value: `${formatNumber(sum.documents)} (${formatNumber(sum.displays)} displays)`, mono: true },
            { label: 'Withheld items examined', value: formatNumber(sum.withheld), mono: true },
            { label: 'Requests refused', value: formatNumber(sum.refusals), mono: true },
            { label: 'Index queries', value: formatNumber(sum.queries), mono: true },
            { label: 'Terminal commands', value: formatNumber(sum.commands), mono: true },
            { label: 'Reproduction', value: `${formatNumber(sum.prints)} print jobs`, mono: true },
            { label: 'Forms submitted', value: formatNumber(sum.forms), mono: true },
            ...(sum.highDocs.length && top ? [{ label: `${top.label} displayed`, value: sum.highDocs.join(', '), mono: true }] : []),
          ]}
        />
        <p class="asr-note">
          This record is retained with the audit trail and is open to review by the Resident Assurance Officer under{' '}
          {psec ? (
            <a
              href={psec.route}
              onClick={(e) => {
                if (e.button !== 0 || e.ctrlKey || e.shiftKey || e.metaKey) return;
                e.preventDefault();
                services.openRoute(psec.route);
              }}
            >
              {psec.docNo}
            </a>
          ) : (
            'OSC-ASR-PSEC'
          )}
          . Entries cannot be amended or withdrawn from the workstation.
        </p>
      </GroupBox>
      <div class="asr-filterbar">
        <Select
          label="Period"
          value={scope}
          onChange={(v) => onScope(v === 'all' ? 'all' : 'session')}
          options={[
            { value: 'session', label: 'This sign-in' },
            { value: 'all', label: 'All recorded sign-ins' },
          ]}
        />
        <Select label="Show" value={filter} onChange={(v) => onFilter(v as ActivityFilter)} options={ACTIVITY_FILTERS.map((f) => ({ value: f.id, label: f.label }))} />
        <TextField label="Contains" value={text} onInput={setText} width={18} type="search" />
      </div>
      <DataTable
        label="Audit entries, newest first"
        columns={cols}
        rows={rows}
        rowKey={(e) => String(e.seq)}
        sortRows={false}
        dense
        empty={<EmptyState title="No entries" body="No recorded actions match the selected period and filter." icon="search" />}
      />
    </div>
  );
}
