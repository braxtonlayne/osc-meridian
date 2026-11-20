/** The coordinator's views: map, line diagram, timeline, message log, register, site detail. */
import { useMemo } from 'preact/hooks';
import type { AccountDef } from '@core/contracts';
import type { FacilityId } from '@core/canon-types';
import { DataTable, PropertyGrid, type Column, type PropertyRow } from '@design/index';
import { UsMap } from '@graphics/map';
import { LineDiagram, SCHEMATIC_LAYOUT } from '@graphics/schematic';
import { DrillMapLayer, Gantt, MapRingGlyph, PortalGlyph, PortalMarks, type GanttRow, type MapSite, type PortalMark } from '@graphics/drill';
import { buildPlan, drillClock, minuteAt, type LogLine } from './model';
import { canon, causeText, dtg, FAC, frag, MS_PER_MIN, RELAY_WORD, SD, STATUS_WORD, useSize, zl } from './shared';
import type { DrillRecord, DrillStateExt, SitePlan, SiteStatus } from './types';

export interface ViewProps {
  drill: DrillStateExt | null;
  now: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

/** A plan for drawing before any drill exists (receipt order and circuits only; nothing is filled). */
const STATIC_PLAN: SitePlan[] = buildPlan({ canon, frag, inWorldIso: canon.meta.inWorldDate, orderedAt: 0, isolated: false });

export function planRows(drill: DrillStateExt | null): SitePlan[] {
  if (!drill) return STATIC_PLAN;
  return SD.sequence.map((s) => drill.plan[s.facility]).filter((p): p is SitePlan => !!p);
}

export function statusOf(drill: DrillStateExt | null, f: string): SiteStatus {
  return drill?.sites[f]?.status ?? 'pending';
}

function reachedOf(drill: DrillStateExt | null, p: SitePlan, now: number): boolean {
  if (!drill || p.causes.includes('cut')) return false;
  const until = drill.endedAt !== null ? Math.min(now, drill.endedAt) : now;
  return until >= drill.orderedAt + p.receipt * drill.msPerMin;
}

/* ------------------------------------------------------------------ map */

export function MapView({ drill, now, selected, onSelect, ownSite }: ViewProps & { ownSite?: string }) {
  const own = ownSite ? FAC.get(ownSite) : undefined;
  const ownPlotted = own?.lon != null && own?.lat != null;
  const [ref, size] = useSize<HTMLDivElement>();
  const sites: MapSite[] = useMemo(
    () =>
      planRows(drill).map((p) => {
        const f = FAC.get(p.facility)!;
        const v = p.via ? FAC.get(p.via) : null;
        return {
          id: p.facility,
          lon: f.lon ?? 0,
          lat: f.lat ?? 0,
          via: v && v.lon != null && v.lat != null ? { lon: v.lon, lat: v.lat } : null,
          relay: p.relay,
          reached: reachedOf(drill, p, now),
          status: statusOf(drill, p.facility),
          cut: !!drill && p.causes.includes('cut') && now >= drill.orderedAt + p.receipt * drill.msPerMin,
        };
      }),
    [drill, Math.floor(now / 250)],
  );
  const facilities = useMemo(() => canon.facilities.filter((f) => f.class !== 'DELTA'), []);
  return (
    <div class="sd-mapwrap" ref={ref}>
      {size.w > 0 && size.h > 0 && (
        <UsMap
          width={size.w}
          height={size.h}
          facilities={facilities}
          selected={(selected as FacilityId) ?? null}
          onSelect={(id) => onSelect(id)}
          showLabels="alpha"
          label="Seal drill propagation, geographic"
          overlay={<MapKey ownSite={ownSite} plotted={ownPlotted} />}
        >
          {(ctx) => {
            const at = ownPlotted ? ctx.project(own!.lon!, own!.lat!) : null;
            return (
              <>
                <DrillMapLayer ctx={ctx} sites={sites} />
                {at && <rect class="sd-own" x={at[0] - 9} y={at[1] - 9} width={18} height={18} aria-hidden="true" />}
              </>
            );
          }}
        </UsMap>
      )}
    </div>
  );
}

function MapKey({ ownSite, plotted }: { ownSite?: string; plotted: boolean }) {
  const rows: { g: Parameters<typeof MapRingGlyph>[0]['status']; t: string }[] = [
    { g: 'ordered', t: 'Order received' },
    { g: 'acknowledged', t: 'Acknowledged, seal deferred' },
    { g: 'sealing', t: 'Sealing' },
    { g: 'sealed', t: 'Sealed (drill)' },
    { g: 'no-report', t: 'No report' },
    { g: 'cut', t: 'Order not passed' },
  ];
  return (
    <div class="sd-key" aria-label="Map key">
      <div class="sd-key-title">Seal drill</div>
      {rows.map((r) => (
        <div key={r.t} class="sd-key-row">
          <MapRingGlyph status={r.g} />
          <span>{r.t}</span>
        </div>
      ))}
      <div class="sd-key-row">
        <svg width={18} height={18} aria-hidden="true">
          <line x1={1} y1={9} x2={17} y2={9} class="dg-relay dg-relay--rail" />
        </svg>
        <span>Relay, inter-hub</span>
      </div>
      <div class="sd-key-row">
        <svg width={18} height={18} aria-hidden="true">
          <line x1={1} y1={9} x2={17} y2={9} class="dg-relay" />
        </svg>
        <span>Relay, tram order wire</span>
      </div>
      <div class="sd-key-row">
        <svg width={18} height={18} aria-hidden="true">
          <line x1={1} y1={9} x2={17} y2={9} class="dg-relay dg-relay--voice" />
        </svg>
        <span>Voice circuit call</span>
      </div>
      {ownSite && (
        <div class="sd-key-row">
          <svg width={18} height={18} aria-hidden="true">
            <rect x={2} y={2} width={14} height={14} class="sd-own" />
          </svg>
          <span>{plotted ? `This command, ${ownSite}` : `This command, ${ownSite}: position held under the network geography compartment, not plotted`}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ line diagram */

const ON_DIAGRAM = new Set<string>(SCHEMATIC_LAYOUT.nodes.map((n) => n.id));
const OCCUPANCY = { '04': 'DARK' as const };

function markOf(drill: DrillStateExt | null, p: SitePlan, now: number): PortalMark {
  const status = statusOf(drill, p.facility);
  let closed = 0;
  if (drill && status === 'sealing' && p.ack !== null && p.doorsDone !== null) {
    const t = minuteAt(drill, drill.endedAt !== null ? Math.min(now, drill.endedAt) : now);
    closed = Math.max(0, Math.min(1, (t - p.ack) / Math.max(0.01, p.doorsDone - p.ack)));
  }
  return { status, closed, reached: reachedOf(drill, p, now) || (!!drill && drill.sites[p.facility]?.acknowledged != null), cut: !!drill && p.causes.includes('cut') && now >= drill.orderedAt + p.receipt * drill.msPerMin };
}

export function MimicView({ drill, now, selected, onSelect }: ViewProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  const rows = planRows(drill);
  const marks: Record<string, PortalMark> = {};
  for (const p of rows) marks[p.facility] = markOf(drill, p, now);
  const offBoard = rows.filter((p) => !ON_DIAGRAM.has(p.facility));
  return (
    <div class="sd-mimic">
      <div class="sd-mimic-board" ref={ref}>
        {size.w > 0 && size.h > 0 && (
          <>
            <LineDiagram width={size.w} height={size.h} network="ALL" occupancy={OCCUPANCY} selected={selected} onSelectNode={(id) => onSelect(id)} />
            <PortalMarks width={size.w} height={size.h} marks={marks} selected={selected} />
          </>
        )}
      </div>
      <div class="sd-mimic-foot">
        <div class="sd-voice" aria-label="Sites ordered by voice circuit">
          <span class="sd-caption">Voice circuit sites (no tram link)</span>
          {offBoard.map((p) => (
            <button key={p.facility} type="button" class={selected === p.facility ? 'sd-voice-site is-sel' : 'sd-voice-site'} onClick={() => onSelect(p.facility)} aria-pressed={selected === p.facility}>
              <PortalGlyph status={marks[p.facility]!.cut ? 'cut' : marks[p.facility]!.status} closed={marks[p.facility]!.closed} />
              <span class="sd-mono">{p.facility}</span>
              <span>{STATUS_WORD[marks[p.facility]!.status]}</span>
            </button>
          ))}
        </div>
        <div class="sd-portal-key" aria-label="Portal symbol key">
          {(['pending', 'sealing', 'sealed', 'acknowledged', 'no-report'] as const).map((s) => (
            <span key={s} class="sd-key-inline">
              <PortalGlyph status={s} />
              {s === 'pending' ? 'OPEN' : s === 'sealing' ? 'CLOSING' : s === 'sealed' ? 'CLOSED, DOGGED' : s === 'acknowledged' ? 'HELD OPEN' : 'NOT REPORTED'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ timeline */

export function TimelineView({ drill, now, selected, onSelect, only }: ViewProps & { only?: string | null }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const rows = planRows(drill).filter((p) => !only || p.facility === only);
  const span = Math.ceil((Math.max(...planRows(null).map((p) => p.deadline)) + 2) / 5) * 5;
  const t = drill ? minuteAt(drill, drill.endedAt !== null ? Math.min(now, drill.endedAt) : now) : null;
  const gantt: GanttRow[] = rows.map((p) => ({
    id: p.facility,
    label: p.facility,
    sub: only ? undefined : p.relay === 'origin' ? 'NC' : p.relay === 'rail' ? 'HUB' : p.relay === 'tram' ? 'TRAM' : 'VOICE',
    receipt: p.receipt,
    ack: p.ack,
    doorsDone: p.doorsDone,
    sealed: p.sealed,
    deadline: p.deadline,
    sealBy: p.receipt + p.sealMin,
    status: statusOf(drill, p.facility),
    cut: p.causes.includes('cut'),
  }));
  return (
    <div class="sd-timeline">
      <div class="sd-tl-head">
        <span>
          Drill minutes from the order. One drill minute runs in {MS_PER_MIN / 1000} s (time scale {SD.timeScale}).
        </span>
        <span class="sd-tl-legend" aria-hidden="true">
          <span class="sd-sw sd-sw--wait" /> awaiting acknowledgement
          <span class="sd-sw sd-sw--doors" /> door cycle
          <span class="sd-sw sd-sw--checks" /> checks to seal report
          <span class="sd-sw sd-sw--held" /> seal deferred
          <span class="sd-sw sd-sw--by" /> class seal time
        </span>
      </div>
      <div class="sd-tl-body" ref={ref}>
        {size.w > 0 && (
          <Gantt
            rows={gantt}
            width={size.w}
            now={t}
            span={span}
            selected={selected}
            onSelect={onSelect}
            words={STATUS_WORD}
            label={drill ? `Timeline of seal drill ${drill.id}` : 'Timeline: no drill ordered'}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ message log */

export interface LogRow extends LogLine {
  dtg: string;
  clock: string;
}

export function LogView({ lines, selected, onSelect, onActivate, empty }: { lines: LogRow[]; selected: string | null; onSelect: (k: string | null) => void; onActivate: (l: LogRow) => void; empty: string }) {
  const cols: Column<LogRow>[] = [
    { key: 'dtg', header: 'DTG', width: 84, mono: true },
    { key: 'clock', header: 'Drill', width: 64, mono: true, sortValue: (r) => r.t },
    { key: 'from', header: 'FM', width: 64, mono: true },
    { key: 'to', header: 'TO', width: 92, mono: true },
    { key: 'circuit', header: 'CCT', width: 132, mono: true },
    { key: 'text', header: 'Text', wrap: true, render: (r) => <span class="sd-cable">{r.text}</span> },
  ];
  return (
    <div class="sd-log">
      <DataTable
        columns={cols}
        rows={lines}
        rowKey={(r) => r.key}
        label={`Relay traffic, ${lines.length} lines`}
        selection="single"
        selected={selected ? [selected] : []}
        onSelectionChange={(k) => onSelect(k[0] ?? null)}
        onActivate={onActivate}
        sortRows={false}
        dense
        zebra
        empty={<p class="sd-note">{empty}</p>}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ register */

export interface RegisterRow {
  id: string;
  ordered: string;
  orderedMs: number;
  by: string;
  second: string;
  observer: string;
  sites: number;
  sealed: number;
  late: string;
  noReport: string;
  seq: string;
  result: string;
}

export function registerRows(records: DrillRecord[], accounts: AccountDef[], live: DrillStateExt | null, only: string | null): RegisterRow[] {
  const role = (id: string | null) => (id ? (accounts.find((a) => a.id === id)?.roleTitle ?? id) : 'None');
  const rows: RegisterRow[] = frag.history
    .filter((h) => !only || h.scope.includes(only))
    .map((h) => ({
      id: h.id,
      ordered: `${h.ordered.slice(8, 10)}${h.ordered.slice(11, 13)}${h.ordered.slice(14, 16)}Z ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(h.ordered.slice(5, 7)) - 1]} ${h.ordered.slice(2, 4)}`,
      orderedMs: Date.parse(h.ordered),
      by: h.orderedBy,
      second: 'Not recorded',
      observer: 'None',
      sites: h.sites,
      sealed: h.sealed,
      late: String(h.late),
      noReport: String(h.noReport),
      seq: '0',
      result: `${h.scope}. ${h.result}`,
    }));
  for (const r of records) {
    const result =
      r.phase === 'propagating' ? 'IN PROGRESS' : r.phase === 'sealed' ? 'NETWORK HELD SEALED' : r.phase === 'aborted' ? `ABORTED ${r.endedAt ? zl(r.endedAt) : ''}` : `STOOD DOWN ${r.endedAt ? zl(r.endedAt) : ''}${r.endedBy === 'network-control' ? ' BY NETWORK CONTROL' : ''}`;
    if (only) {
      const isLive = live && live.id === r.id;
      const st = isLive ? STATUS_WORD[live.sites[only]?.status ?? 'pending'] : r.noReport.includes(only) ? 'NO REPORT' : r.late.includes(only) ? 'SEALED (DRILL), LATE' : 'SEALED (DRILL)';
      rows.push({ id: r.id, ordered: dtg(r.orderedAt), orderedMs: r.orderedAt, by: 'Network Control', second: '', observer: '', sites: 1, sealed: st.startsWith('SEALED') ? 1 : 0, late: '', noReport: '', seq: '', result: st });
      continue;
    }
    rows.push({
      id: r.id,
      ordered: `${dtg(r.orderedAt)} MAY 08`,
      orderedMs: r.orderedAt,
      by: role(r.by),
      second: r.secondOfficer,
      observer: r.observer ? `OIA (${role(r.observer)})` : 'None',
      sites: r.sites,
      sealed: r.sealed,
      late: r.late.length ? r.late.join(', ') : '0',
      noReport: r.noReport.length ? r.noReport.join(', ') : '0',
      seq: String(r.outOfSequence.length),
      result: `${r.isolated ? 'HUB CIRCUITS DOWN. ' : ''}${result}`,
    });
  }
  return rows.sort((a, b) => b.orderedMs - a.orderedMs);
}

export function RegisterView({ rows, only }: { rows: RegisterRow[]; only: string | null }) {
  const cols: Column<RegisterRow>[] = only
    ? [
        { key: 'id', header: 'Drill', width: 120, mono: true },
        { key: 'ordered', header: 'Ordered', width: 110, mono: true, sortValue: (r) => r.orderedMs },
        { key: 'result', header: `Result, ${only}`, wrap: true },
      ]
    : [
        { key: 'id', header: 'Drill', width: 112, mono: true },
        { key: 'ordered', header: 'Ordered', width: 104, mono: true, sortValue: (r) => r.orderedMs },
        { key: 'by', header: 'Ordered by', width: 150, wrap: true },
        { key: 'second', header: 'Second officer', width: 150, wrap: true },
        { key: 'observer', header: 'Observer', width: 110, wrap: true },
        { key: 'sites', header: 'Sites', width: 46, align: 'right', mono: true },
        { key: 'sealed', header: 'Sealed', width: 52, align: 'right', mono: true },
        { key: 'late', header: 'Late', width: 110, mono: true, wrap: true },
        { key: 'noReport', header: 'No report', width: 90, mono: true, wrap: true },
        { key: 'seq', header: 'Ack out of seq.', width: 60, align: 'right', mono: true, title: 'Acknowledgements time-stamped before the site received the order' },
        { key: 'result', header: 'Result', wrap: true },
      ];
  return (
    <div class="sd-register">
      <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} label={`Seal drill register, ${rows.length} entries`} caption="Seal drill register (network drills from this coordinator; site drills before commissioning)" dense zebra wrap />
    </div>
  );
}

/* ------------------------------------------------------------------ site detail */

export function SiteDetail({ drill, now, id }: { drill: DrillStateExt | null; now: number; id: string }) {
  const p = planRows(drill).find((x) => x.facility === id);
  const f = FAC.get(id);
  if (!p || !f) {
    return <p class="sd-note">{id} is not in the network seal drill. {SD.excluded.text}</p>;
  }
  const site = drill?.sites[id];
  const at = (m: number | null) => (m === null ? 'None' : drill ? `${drillClock(m)}  ${zl(drill.orderedAt + m * drill.msPerMin)}` : drillClock(m));
  const shown = (m: number | null) => (drill && m !== null && minuteAt(drill, drill.endedAt !== null ? Math.min(now, drill.endedAt) : now) >= m ? at(m) : drill ? 'Not yet' : at(m));
  const rows: PropertyRow[] = [
    { label: 'Facility', value: `${f.id}${f.codename ? `  ${f.codename}` : ''}` },
    { label: 'Class', value: f.class },
    { label: 'Order relayed by', value: p.via ? `${p.via} (${RELAY_WORD[p.relay]})` : RELAY_WORD[p.relay] },
    { label: 'Circuit', value: p.circuit },
    { label: 'Receipt', value: drill ? at(p.receipt) : drillClock(p.receipt) },
    { label: 'Acknowledged', value: shown(p.ack) },
    { label: 'Seal doors closed', value: shown(p.doorsDone) },
    { label: 'Reported sealed', value: site?.status === 'sealed' ? at(p.sealed) : drill ? 'Not reported' : 'Class time ' + drillClock(p.receipt + p.sealMin) },
    { label: 'No report after', value: drillClock(p.deadline) },
    { label: 'Status', value: STATUS_WORD[statusOf(drill, id)] },
  ];
  const reached = drill && minuteAt(drill, now) >= p.receipt;
  const notes = drill && reached ? p.causes.filter((c) => c !== 'order-wire' || (site?.acknowledged ?? null) !== null).map(causeText) : [];
  if (drill && p.causes.includes('order-wire') && site?.acknowledged != null) rows.splice(4, 0, { label: 'Ack circuit', value: p.ackCircuit });
  return (
    <div class="sd-detail">
      <PropertyGrid rows={rows} />
      {notes.length > 0 && (
        <ul class="sd-notes">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
