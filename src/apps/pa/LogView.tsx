/** Broadcast log: live controller records and the retained history, with a detail pane. */
import type { AccountDef } from '@core/contracts';
import { DataTable, PropertyGrid, Select, StatusLight, type Column, type OperStatus } from '@design/index';
import { answerBack, messageByNo, mss, pa, priorityName, siteOfZone, zonesOf, zonesShown, type LogRow } from './model';
import { WithheldBar, ZoneName } from './shared';

export type SourceFilter = 'all' | 'operator' | 'auto' | 'test' | 'record';

const STATUS_LIGHT: Record<LogRow['status'], OperStatus> = {
  'ON AIR': 'NOMINAL',
  QUEUED: 'DEGRADED',
  COMPLETE: 'OFFLINE',
  'PRE-EMPTED': 'DEGRADED',
  CANCELLED: 'OFFLINE',
  LAPSED: 'FAULT',
};

const SOURCE_WORD: Record<LogRow['source'], string> = { operator: 'Console', drill: 'Seal drill', isolation: 'Network', test: 'Tone test', record: 'Controller record' };

export interface LogViewProps {
  account: AccountDef;
  rows: LogRow[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  siteFilter: string;
  onSiteFilter: (s: string) => void;
  sourceFilter: SourceFilter;
  onSourceFilter: (s: SourceFilter) => void;
  sites: string[];
  t2: Record<string, string>;
  compact: boolean;
}

export function LogView(p: LogViewProps) {
  const row = p.rows.find((r) => r.id === p.selected) ?? null;
  const subject = pa.system.procedureDocNo;
  return (
    <div class="pa-log">
      <div class="pa-filters">
        <Select
          label="Site"
          value={p.siteFilter}
          onChange={p.onSiteFilter}
          disabled={p.account.tier === 4}
          options={[...(p.account.tier === 4 ? [] : [{ value: 'all', label: 'All sites' }]), ...p.sites.map((s) => ({ value: s, label: s }))]}
        />
        <Select
          label="Source"
          value={p.sourceFilter}
          onChange={(v) => p.onSourceFilter(v as SourceFilter)}
          options={[
            { value: 'all', label: 'All calls' },
            { value: 'operator', label: 'Console calls' },
            { value: 'auto', label: 'Automatic (drill, network)' },
            { value: 'test', label: 'Tone tests' },
            { value: 'record', label: `Controller records (${pa.system.logRetentionDays} days)` },
          ]}
        />
      </div>
      <DataTable<LogRow>
        label={`Broadcast log, ${p.rows.length} calls`}
        rows={p.rows}
        rowKey={(r) => r.id}
        selection="single"
        selected={p.selected ? [p.selected] : []}
        onSelectionChange={(k) => p.onSelect(k[0] ?? null)}
        dense
        sortRows={false}
        maxHeight={p.compact ? '260px' : '320px'}
        empty={<div class="pa-empty">No calls match the filter.</div>}
        columns={logColumns(p.account, p.compact)}
      />
      {row && (
        <div class="pa-detail">
          <PropertyGrid
            caption={`CALL ${row.id}`}
            columns={p.compact ? 1 : 2}
            rows={[
              { label: 'Message', value: <MessageCell no={row.msg} subject={subject} /> },
              { label: 'Priority', value: `P${row.priority} ${priorityName(row.priority)}` },
              { label: 'Date / time', value: `${row.date} ${row.time}`, mono: true },
              { label: 'Originated by', value: row.by },
              { label: 'Source', value: SOURCE_WORD[row.source] },
              { label: 'Airtime', value: mss(row.durationMs), mono: true },
              { label: 'Status', value: <StatusLight status={STATUS_LIGHT[row.status]} word={row.status} /> },
              { label: 'Zones answered', value: `${answerBack(zonesShown(row.zones, p.account))} of ${answerBack(zonesShown(row.zones, p.account))}`, mono: true },
              ...(row.preemptedBy ? [{ label: 'Pre-empted by', value: row.preemptedBy, mono: true }] : []),
              ...(row.ref && p.account.tier !== 4 ? [{ label: 'Reference', value: row.ref, mono: true }] : []),
            ]}
          />
          <table class="pa-zonetable" aria-label={`Zones of call ${row.id}`}>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Designation</th>
              </tr>
            </thead>
            <tbody>
              {zonesShown(row.zones, p.account).map((id) => (
                <tr key={id}>
                  <td class="pa-mono">{id}</td>
                  <td>
                    <ZoneCell id={id} t2={p.t2} subject={subject} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MessageCell({ no, subject }: { no: string; subject: string }) {
  const m = messageByNo(no);
  if (!m) return <span>{no}</span>;
  return (
    <span>
      <span class="pa-mono">{no}</span> {m.title === null ? <WithheldBar len={22} subject={subject} /> : m.title}
    </span>
  );
}

function ZoneCell({ id, t2, subject }: { id: string; t2: Record<string, string>; subject: string }) {
  if (id === 'NET-ALL') return <span>Network all-call, every site controller</span>;
  const site = siteOfZone(id);
  const sz = site ? zonesOf(site) : null;
  if (id.endsWith('-ALL')) return <span>{site} all-call, {sz?.allCall.length ?? 0} zones</span>;
  const z = sz?.zones.find((x) => x.id === id);
  if (!z) return <span>{id}</span>;
  return (
    <span>
      {site} <ZoneName zone={z} t2={t2} subject={subject} />
    </span>
  );
}

function logColumns(account: AccountDef, compact: boolean): Column<LogRow>[] {
  const cols: Column<LogRow>[] = [
    { key: 'id', header: 'Call', width: 104, mono: true },
    { key: 'date', header: 'Date', width: 86, mono: true },
    { key: 'time', header: 'Time', width: 52, mono: true },
    { key: 'site', header: 'Site', width: 84, mono: true, render: (r) => (account.tier === 4 && r.site === 'NETWORK' ? account.site : r.site) },
    { key: 'zones', header: 'Zones', mono: true, render: (r) => zonesShown(r.zones, account).join(' ') },
    { key: 'msg', header: 'Msg', width: 40, mono: true },
    { key: 'priority', header: 'Pri', width: 36, mono: true, render: (r) => `P${r.priority}` },
    { key: 'status', header: 'Status', width: 112, render: (r) => <StatusLight status={STATUS_LIGHT[r.status]} word={r.status} /> },
  ];
  if (!compact) {
    cols.push({ key: 'air', header: 'Air', width: 44, mono: true, align: 'right', render: (r) => mss(r.durationMs) });
    cols.push({ key: 'by', header: 'Originator', width: 150 });
  }
  return cols;
}
