/** Threat register (canon threats + threatDetail) and the panel above each threat page. */
import type { RouteEntry } from '@core/contracts';
import type { ThreatDetail } from '@core/canon-types';
import { Button, DataTable, GroupBox, PropertyGrid, type Column } from '@design/index';
import { formatNumber } from '@design/index';
import { threatRouteFor } from './logic';
import { RxText, canon, divisionName, useGridCols } from './shared';

const response = (id: string) => [...canon.threats.external, ...canon.threats.internal].find((t) => t.id === id)?.response;
const groupWord = (g: string) => (g === 'external' ? 'External' : 'Internal');
const regNo = (t: ThreatDetail) => /(\d{2})$/.exec(t.protocol.designation)?.[1] ?? '';

function ProtocolTitle({ t, docNo }: { t: ThreatDetail; docNo: string }) {
  return <RxText text={t.protocol.title} docNo={docNo} auth={t.protocol.withholdingAuthority} reference={t.protocol.ref} />;
}

export function ThreatRegister({ routes, selected, onSelect, nav }: { routes: RouteEntry[]; selected: string | null; onSelect: (id: string) => void; nav: (route: string) => void }) {
  const open = (t: ThreatDetail) => {
    const r = threatRouteFor(t.protocol.designation, routes);
    if (r) nav(r.route);
  };
  const cols: Column<ThreatDetail>[] = [
    { key: 'no', header: 'No.', width: 40, mono: true, sortValue: regNo, render: regNo },
    { key: 'label', header: 'Threat', width: 190, sortValue: (t) => t.label, render: (t) => t.label },
    { key: 'group', header: 'Source', width: 70, sortValue: (t) => t.group, render: (t) => groupWord(t.group) },
    { key: 'owner', header: 'Owning office', wrap: true, sortValue: (t) => t.ownerDivision, render: (t) => t.ownerDivision },
    { key: 'cp', header: 'Protocol', width: 92, mono: true, render: (t) => t.protocol.designation },
    { key: 'title', header: 'Protocol title', width: 200, render: (t) => <ProtocolTitle t={t} docNo={`OSC-ASR-THR-${regNo(t)}`} /> },
    { key: 'pages', header: 'Pages', width: 56, align: 'right', mono: true, sortValue: (t) => t.protocol.pageCount, render: (t) => formatNumber(t.protocol.pageCount) },
    { key: 'rev', header: 'Rev', width: 40, align: 'right', mono: true, sortValue: (t) => t.protocol.revision, render: (t) => String(t.protocol.revision) },
  ];
  const sel = canon.threatDetail.find((t) => t.id === selected) ?? null;
  const pages = canon.threatDetail.reduce((s, t) => s + t.protocol.pageCount, 0);
  return (
    <div class="asr-view">
      <div class="asr-viewhead">
        <div>
          <div class="asr-h1">Threat register</div>
          <div class="asr-sub">Threat categories with the source response and the contingency protocol held against each. Open an entry for its register page.</div>
        </div>
      </div>
      <DataTable
        label="Threat register"
        columns={cols}
        rows={canon.threatDetail}
        rowKey={(t) => t.id}
        selection="single"
        selected={selected ? [selected] : []}
        onSelectionChange={(k) => k[0] && onSelect(k[0])}
        onActivate={open}
        footer={
          <tr>
            <td colSpan={6}>Total, {canon.threatDetail.length} contingency protocols</td>
            <td class="asr-num">{formatNumber(pages)}</td>
            <td />
          </tr>
        }
      />
      {sel && (
        <GroupBox title={`Entry ${regNo(sel)}: ${sel.label}`} on="surface">
          <PropertyGrid
            rows={[
              { label: 'Source response', value: <RxText text={response(sel.id)} docNo={`OSC-ASR-THR-${regNo(sel)}`} auth={sel.protocol.withholdingAuthority} reference={sel.protocol.ref} /> },
              { label: 'Owning office', value: sel.ownerDivision },
              { label: 'Withholding authority', value: `${sel.protocol.withholdingAuthority} · Ref ${sel.protocol.ref}`, mono: true },
            ]}
          />
          <div class="asr-btns asr-btns--left">
            <Button label="&Open register page" variant="primary" onClick={() => open(sel)} />
          </div>
        </GroupBox>
      )}
    </div>
  );
}

/** Identity panel shown above a threat register page. */
export function ThreatPanel({ entry, routes, nav }: { entry: RouteEntry; routes: RouteEntry[]; nav: (route: string) => void }) {
  const gridCols = useGridCols();
  const n = /(\d{2})$/.exec(entry.docNo)?.[1];
  const idx = canon.threatDetail.findIndex((t) => regNo(t) === n);
  const t = canon.threatDetail[idx];
  if (!t) return null;
  const go = (d: number) => {
    const next = canon.threatDetail[(idx + d + canon.threatDetail.length) % canon.threatDetail.length]!;
    const r = threatRouteFor(next.protocol.designation, routes);
    if (r) nav(r.route);
  };
  const owner = divisionName(t.ownerDivisionId);
  return (
    <GroupBox title={`Threat register entry ${n}`} on="surface">
      <div class="asr-panel-row">
        <PropertyGrid
          columns={gridCols}
          rows={[
            { label: 'Threat', value: t.label },
            { label: 'Source', value: groupWord(t.group) },
            { label: 'Owning office', value: owner ? `${t.ownerDivision} (${t.ownerDivisionId})` : t.ownerDivision },
            { label: 'Protocol', value: t.protocol.designation, mono: true },
            { label: 'Protocol title', value: <ProtocolTitle t={t} docNo={entry.docNo} /> },
            { label: 'Page count', value: formatNumber(t.protocol.pageCount), mono: true },
            { label: 'Protocol revision', value: String(t.protocol.revision), mono: true },
            { label: 'Withheld by', value: `${t.protocol.withholdingAuthority} · Ref ${t.protocol.ref}`, mono: true },
          ]}
        />
      </div>
      <div class="asr-btns asr-btns--left">
        <Button label="Pre&vious entry" size="small" onClick={() => go(-1)} />
        <Button label="&Next entry" size="small" onClick={() => go(1)} />
      </div>
    </GroupBox>
  );
}
