/** Zone table of one site's controller: zone, level, designation, rack, speakers, state. */
import type { AccountDef } from '@core/contracts';
import { DataTable, Select, StatusLight, type Column } from '@design/index';
import { allSites, keysOverlap, pa, type LogRow, type SiteZones, type Zone } from './model';
import { ZoneName } from './shared';

export interface ZonesViewProps {
  account: AccountDef;
  site: string;
  onSite: (s: string) => void;
  zones: SiteZones | null;
  onAir: LogRow[];
  reachable: boolean;
  t2: Record<string, string>;
}

const KIND: Record<Zone['kind'], string> = { level: 'Level', area: 'Area', division: 'Division', unassigned: 'Zone' };

export function ZonesView(p: ZonesViewProps) {
  const sites = p.account.tier === 4 ? [p.account.site] : allSites();
  const rows = p.zones?.zones ?? [];
  const state = (z: Zone) => {
    if (!p.reachable) return <StatusLight status="OFFLINE" word="NOT REACHABLE" />;
    const busy = p.onAir.some((r) => keysOverlap(r.keys, z.keys));
    return busy ? <StatusLight status="NOMINAL" word="ON AIR" /> : <StatusLight status="OFFLINE" word="IDLE" />;
  };
  const cols: Column<Zone>[] = [
    { key: 'id', header: 'Zone', width: 78, mono: true },
    { key: 'kind', header: 'Type', width: 70, render: (z) => KIND[z.kind] },
    { key: 'level', header: 'Level', width: 50, mono: true, align: 'right', render: (z) => (z.level == null ? (z.levels.length ? z.levels.join(', ') : '') : String(z.level)) },
    { key: 'name', header: 'Designation', render: (z) => <ZoneName zone={z} t2={p.t2} subject={pa.system.libraryDocNo} />, sortable: false },
    { key: 'rack', header: 'Rack', width: 46, mono: true, align: 'right', render: (z) => (z.kind === 'area' || z.kind === 'division' ? '' : `AR-${z.rack}`) },
    { key: 'speakers', header: 'Spkrs', width: 50, mono: true, align: 'right', render: (z) => (z.kind === 'area' ? '' : String(z.speakers)), title: 'Loudspeakers on the zone' },
    { key: 'state', header: 'State', width: 130, render: state, sortable: false },
  ];
  return (
    <div class="pa-zonesview">
      <div class="pa-filters">
        <Select label="Controller" value={p.site} onChange={p.onSite} disabled={sites.length === 1} options={sites.map((s) => ({ value: s, label: `${s} ${pa.system.controller}` }))} />
        <span class="pa-mono pa-muted">
          {p.zones ? `All-call answers ${p.zones.allCall.length} zones · ${rows.filter((z) => z.kind === 'area').length} assembly areas` : ''}
        </span>
      </div>
      <DataTable<Zone> label={`Zones at ${p.site}`} rows={rows} rowKey={(z) => z.id} dense columns={cols} />
    </div>
  );
}
