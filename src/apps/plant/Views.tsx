/**
 * Secondary views: trends (uPlot, lazy), the station one-line, the plant event log with the fleet
 * summary, and the trip history (live record and the network-wide simulator record).
 */
import type { ComponentChildren } from 'preact';
import { DataTable, GroupBox, Redaction, Select, StatusLight } from '@design/index';
import type { Column, RedactionHoverInfo } from '@design/index';
import { ReactorOneLine, TelemetryChart } from '@graphics/reactor';
import type { TelemetrySeries } from '@graphics/reactor';
import { solve } from '@graphics/reactor/model';
import { rxInfo } from '@core/rx';
import type { AccountDef } from '@core/contracts';
import type { Reading } from '@sim/telemetry.worker';
import { INSTALLATIONS, canon, dateLabel, eventsFor, lastTrip, unitById, unplannedTrips, zuluWithLocal } from './data';
import type { PlantEvent, UnitDef } from './data';
import { electrical } from './model';
import { K } from './data';
import type { SimState, SimTripRecord } from './types';
import type { TrendSample } from './useSim';

/* ------------------------------------------------------------------ site cell */

export function SiteCell({ u, onRxHover }: { u: UnitDef; onRxHover: (i: RedactionHoverInfo) => void }) {
  if (u.siteWithheld && u.siteSentinel) {
    const info = rxInfo(u.siteSentinel);
    const c = canon.compartments.find((x) => x.id === info?.key);
    return <Redaction len={info?.len ?? 8} auth={`Classification Control (${info?.key ?? 'SEXTANT'})`} reference={c?.briefingDocNo ?? 'OSC-DIR-0412'} onHover={onRxHover} />;
  }
  if (!u.site) return <span>Not applicable</span>;
  return <span class="plt-mono">{u.site}{u.facility?.codename ? ` ${u.facility.codename}` : ''}</span>;
}

/* ------------------------------------------------------------------ trends */

export function Trends(p: { live: boolean; unit: UnitDef; samples: TrendSample[]; series: Reading[]; narrow: boolean }) {
  const h = p.narrow ? 180 : 210;
  if (p.live) {
    if (!p.series.length) return <p class="plt-note">No telemetry has been received for {p.unit.id}. Trends start when the plant link reports.</p>;
    const t = p.series.map((r) => r.t);
    const a: TelemetrySeries[] = [
      { label: 'THERMAL POWER', unit: '% RTP', data: [t, p.series.map((r) => r.power.thermalPct ?? 0)], digits: 1 },
      { label: 'STATION LOAD', unit: 'MW', data: [t, p.series.map((r) => r.power.loadMW)], digits: 2 },
    ];
    const b: TelemetrySeries[] = [
      { label: 'FREQUENCY', unit: 'Hz', data: [t, p.series.map((r) => r.power.hz)], digits: 3 },
      { label: 'ESS BUS', unit: 'kV', data: [t, p.series.map((r) => r.power.busKV)], digits: 3 },
    ];
    return (
      <div class="plt-stack">
        <GroupBox title={`${p.unit.id} thermal power and station load, last two hours (telemetry)`}>
          <TelemetryChart series={a} height={h} label={`${p.unit.id} thermal power and station load`} />
        </GroupBox>
        <GroupBox title={`${p.unit.id} frequency and essential bus voltage (telemetry)`}>
          <TelemetryChart series={b} height={h} label={`${p.unit.id} frequency and essential bus voltage`} />
        </GroupBox>
      </div>
    );
  }
  if (p.samples.length < 2) return <p class="plt-note">Trends are recorded while the simulator runs at this station, one sample a second. Run the simulator to record.</p>;
  const t = p.samples.map((x) => x.t);
  const a: TelemetrySeries[] = [
    { label: 'POWER', unit: '% RTP', data: [t, p.samples.map((x) => x.powerPct)], digits: 1 },
    { label: 'COOLANT FLOW', unit: '% RTP', data: [t, p.samples.map((x) => x.flowPct)], digits: 0 },
    { label: 'COOLANT TEMP', unit: '°C', data: [t, p.samples.map((x) => x.tc)], digits: 1 },
  ];
  const b: TelemetrySeries[] = [
    { label: 'PRI PRESS', unit: 'MPa', data: [t, p.samples.map((x) => x.pressure)], digits: 2 },
    { label: 'GEN OUTPUT', unit: 'MW', data: [t, p.samples.map((x) => x.genMW)], digits: 2 },
  ];
  return (
    <div class="plt-stack">
      <GroupBox title={`${p.unit.id} simulator: power, flow and coolant temperature`}>
        <TelemetryChart series={a} height={h} label={`${p.unit.id} simulator power, flow and coolant temperature`} />
      </GroupBox>
      <GroupBox title={`${p.unit.id} simulator: primary pressure and generator output`}>
        <TelemetryChart series={b} height={h} label={`${p.unit.id} simulator pressure and generator output`} />
      </GroupBox>
    </div>
  );
}

/* ------------------------------------------------------------------ one-line */

export function OneLineView(p: { unit: UnitDef; live: boolean; state: SimState | null; loadMW: number | null }) {
  const u = p.unit;
  if (!u.reactor) return <p class="plt-note">The part-task trainer has no station drawing. Bus and breaker states are shown on the panel.</p>;
  const breakers = p.state ? electrical(K, u.params, p.state, u.dgCount).breakers : undefined;
  const live = p.live ? (p.loadMW !== null ? { loadMW: p.loadMW } : undefined) : breakers ? { breakers } : undefined;
  const solved = u.plant ? solve(u.plant, live) : null;
  return (
    <div class="plt-stack">
      <p class="plt-note">
        {p.live
          ? `Station one-line ${u.plant?.drawing.no ?? ''} with the telemetered station load. Breaker positions are those of the issued drawing for the reported unit status.`
          : `Station one-line ${u.plant?.drawing.no ?? ''} with the simulator's breaker positions. ${solved ? `Station load carried: ${solved.totalMW.toFixed(2)} MW.` : ''}`}
      </p>
      <div class="plt-drawing">
        <ReactorOneLine reactorId={u.id} live={live} siteMask={u.siteWithheld ? 'BETA SITE' : undefined} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ event log */

function RefCell({ e, onRef }: { e: PlantEvent; onRef: (e: PlantEvent) => void }) {
  if (e.ref === 'none') return <span class="plt-dim">none</span>;
  return (
    <button type="button" class="plt-link" onClick={() => onRef(e)} title={`Look up ${e.ref}`}>
      {e.ref}
    </button>
  );
}

export function EventLog(p: {
  filter: string;
  onFilter: (v: string) => void;
  onRef: (e: PlantEvent) => void;
  onOpenUnit: (id: string) => void;
  onRxHover: (i: RedactionHoverInfo) => void;
  narrow: boolean;
}) {
  const rows = eventsFor(p.filter === 'ALL' ? null : p.filter);
  const cols: Column<PlantEvent>[] = [
    { key: 'date', header: 'Date', width: 96, mono: true, sortable: true, sortValue: (e) => e.date + e.timeZ, render: (e) => dateLabel(e.date) },
    { key: 'time', header: 'Time', width: 128, mono: true, render: (e) => zuluWithLocal(e.timeZ, unitById(e.unit)) },
    { key: 'unit', header: 'Unit', width: 64, mono: true, sortable: true, sortValue: (e) => e.unit },
    { key: 'kind', header: 'Entry type', width: 104, sortable: true, sortValue: (e) => e.kind, render: (e) => `${e.kind}${e.planned ? '' : ', UNPLANNED'}` },
    { key: 'entry', header: 'Log entry', wrap: true, render: (e) => e.entry },
    { key: 'ref', header: 'Reference', width: 112, mono: true, render: (e) => <RefCell e={e} onRef={p.onRef} /> },
    { key: 'by', header: 'Init.', width: 44, mono: true, render: (e) => e.by },
  ];
  const shown = p.narrow ? cols.filter((c) => c.key !== 'by' && c.key !== 'time') : cols;
  const fleetCols: Column<UnitDef>[] = [
    { key: 'unit', header: 'Unit', width: 64, mono: true, render: (u) => <button type="button" class="plt-link" onClick={() => p.onOpenUnit(u.id)}>{u.id}</button> },
    { key: 'designation', header: 'Designation', width: 130, render: (u) => u.designation },
    { key: 'site', header: 'Site', width: 180, render: (u) => <SiteCell u={u} onRxHover={p.onRxHover} /> },
    { key: 'status', header: 'Status', width: 110, render: (u) => (u.reactor ? <StatusLight status={u.reactor.status} /> : null) },
    { key: 'last', header: 'Last trip or shutdown', width: 150, mono: true, render: (u) => { const t = lastTrip(u.id); return t ? `${dateLabel(t.date)} ${t.timeZ}Z` : 'None since commissioning'; } },
    { key: 'unplanned', header: 'Unplanned trips since commissioning', align: 'right', mono: true, render: (u) => String(unplannedTrips(u.id)) },
  ];
  return (
    <div class="plt-stack">
      <GroupBox title="Fleet summary (from the unit logs)">
        <DataTable columns={p.narrow ? fleetCols.filter((c) => c.key !== 'designation' && c.key !== 'site') : fleetCols} rows={INSTALLATIONS} rowKey={(u) => u.id} label="Reactor fleet summary" dense zebra />
      </GroupBox>
      <GroupBox title="Plant event log">
        <div class="plt-filter">
          <Select
            label="Unit"
            layout="inline"
            value={p.filter}
            options={[{ value: 'ALL', label: 'All installations' }, ...INSTALLATIONS.map((u) => ({ value: u.id, label: `${u.id}  ${u.designation}` }))]}
            onChange={p.onFilter}
          />
          <span class="plt-dim">{rows.length} entries. Unit log extracts as reported to the Reactor Operations Section. Times Zulu, with site local where the site is released.</span>
        </div>
        <DataTable columns={shown} rows={rows} rowKey={(e) => `${e.unit}-${e.date}-${e.timeZ}`} label="Plant event log" dense zebra wrap />
      </GroupBox>
    </div>
  );
}

/* ------------------------------------------------------------------ trip history */

export function TripHistory(p: {
  trips: SimTripRecord[];
  accounts: AccountDef[];
  visibleUnits: string[];
  showLive: boolean;
  me: string;
  extra?: ComponentChildren;
}) {
  const sim = p.trips.filter((t) => p.visibleUnits.includes(t.unit)).slice().reverse();
  const op = (id: string) => p.accounts.find((a) => a.id === id)?.operatorId ?? id;
  const simCols: Column<SimTripRecord>[] = [
    { key: 'id', header: 'Record', width: 80, mono: true },
    { key: 'at', header: 'Date and time', width: 150, mono: true, render: (t) => `${dateLabel(t.at)} ${t.at.slice(11, 13)}${t.at.slice(14, 16)}Z` },
    { key: 'unit', header: 'Simulated unit', width: 100, mono: true },
    { key: 'by', header: 'Station operator', width: 120, mono: true, render: (t) => (t.by === p.me ? `${op(t.by)} (this account)` : op(t.by)) },
    { key: 'manual', header: 'Initiation', width: 90, render: (t) => (t.manual ? 'MANUAL' : 'AUTOMATIC') },
    { key: 'cause', header: 'First-out', wrap: true },
    { key: 'power', header: 'Power at trip', width: 96, align: 'right', mono: true, render: (t) => `${t.powerPct.toFixed(1)}%` },
  ];
  const live = INSTALLATIONS.flatMap((u) => eventsFor(u.id).filter((e) => e.kind === 'TRIP' || e.kind === 'SHUTDOWN'));
  const liveCols: Column<PlantEvent>[] = [
    { key: 'date', header: 'Date', width: 96, mono: true, render: (e) => dateLabel(e.date) },
    { key: 'time', header: 'Time', width: 128, mono: true, render: (e) => zuluWithLocal(e.timeZ, unitById(e.unit)) },
    { key: 'unit', header: 'Unit', width: 64, mono: true },
    { key: 'planned', header: 'Class', width: 96, render: (e) => (e.planned ? 'PLANNED' : 'UNPLANNED') },
    { key: 'entry', header: 'Log entry', wrap: true },
  ];
  return (
    <div class="plt-stack">
      {p.showLive ? (
        <GroupBox title="Reactor trips and shutdowns on record (unit logs)">
          <DataTable columns={liveCols} rows={live} rowKey={(e) => `${e.unit}-${e.date}-${e.timeZ}`} label="Reactor trips on record" dense zebra wrap />
        </GroupBox>
      ) : null}
      <GroupBox title="Simulator trips, all stations">
        <DataTable
          columns={simCols}
          rows={sim}
          rowKey={(t) => t.id}
          label="Simulator trip record"
          dense
          zebra
          wrap
          empty="No simulator trips are recorded."
        />
      </GroupBox>
      {p.extra}
    </div>
  );
}
