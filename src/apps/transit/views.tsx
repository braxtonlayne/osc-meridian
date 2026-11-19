/**
 * Transit Control views: line diagram with link detail, movements, timetable, incident log,
 * possession register and tunnel environment. All figures come from canon, the timetable
 * document or the simulation snapshot.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DataTable, PropertyGrid, StatusLight, type Column } from '@design/index';
import { RefusalState } from '@graphics/states';
import { LineDiagram, type DiagramNetwork, type SchematicTrain } from '@graphics/schematic';
import type { Services } from '@core/contracts';
import { SEG04_LABEL } from '@sim/seg04';
import { blockId, diagramBlockCounts, envReading, incNo, stamp, type BoardState, type LogEntry, type Movement, type MoveStatus, type PossessionState, type SimLink, type SimModel, type TrainState } from '@sim/transit-model';
import { durText, hhmmZ } from '@sim/time';
import type { TimetableDoc } from './board';

export type Snapshot = BoardState;

/* ------------------------------------------------------------------ hooks */

export function useSize<T extends HTMLElement>(): [{ current: T | null }, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: Math.floor(r.width), h: Math.floor(r.height) }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/* ---------------------------------------------------------------- helpers */

export const consistText = (t: { label: string; unbooked?: boolean }) => (t.unbooked ? SEG04_LABEL : t.label || '--');

export function runningText(min: number | null): string {
  if (min === null) return '--';
  if (min === 0) return 'Right time';
  return min > 0 ? `${min} min late` : `${-min} min early`;
}

export function linkTitle(l: SimLink): string {
  return l.kind === 'RAIL' ? `Segment ${l.key}, ${l.a} to ${l.b}` : `Tram link ${l.a} to ${l.b} ${l.label}`;
}

export function statusWord(l: SimLink, s: Snapshot | null): { status: 'NOMINAL' | 'DEGRADED' | 'FAULT' | 'OFFLINE'; word: string } {
  if (!l.inService) return { status: 'OFFLINE', word: 'NOT IN REVENUE SERVICE' };
  if (s?.possessions.some((p) => p.status === 'IN FORCE' && p.link === l.key)) return { status: 'DEGRADED', word: 'POSSESSION' };
  return { status: 'NOMINAL', word: 'IN REVENUE SERVICE' };
}

/** Minimum interval between successive booked departures in one direction today, minutes. */
export function headwayMin(link: SimLink, s: Snapshot | null): number | null {
  if (!s || !link.inService) return null;
  let best: number | null = null;
  for (const from of [link.a, link.b]) {
    const deps = s.movements.filter((m) => m.link === link.key && m.from === from && !m.cancelled).map((m) => m.depMs).sort((a, b) => a - b);
    for (let i = 1; i < deps.length; i++) {
      const g = (deps[i]! - deps[i - 1]!) / 60_000;
      if (best === null || g < best) best = g;
    }
  }
  return best;
}

export function trainsForDiagram(s: Snapshot | null): SchematicTrain[] {
  return (s?.trains ?? []).map((t) => ({ id: t.id, kind: t.kind, link: t.link, pos: t.pos, dir: t.dir, label: t.label, suppressed: t.suppressed }));
}

/* ------------------------------------------------------------ line diagram */

export interface DiagramProps {
  model: SimModel;
  state: Snapshot | null;
  network: DiagramNetwork;
  selected: string | null;
  onSelect: (key: string | null) => void;
  services: Services;
  tt: TimetableDoc | null;
  compact: boolean;
}

export function DiagramView(p: DiagramProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  return (
    <div class={`tr-split ${p.compact ? 'is-stacked' : ''}`}>
      <div class="tr-board" ref={ref}>
        {size.w > 0 && size.h > 0 && (
          <LineDiagram
            width={size.w}
            height={size.h}
            network={p.network}
            trains={trainsForDiagram(p.state)}
            occupancy={p.state?.occupancy ?? {}}
            blockCounts={diagramBlockCounts(p.model)}
            selected={p.selected}
            onSelectLink={(k) => p.onSelect(k)}
            onSelectNode={(id) => p.onSelect(id)}
          />
        )}
      </div>
      <div class="tr-side">
        <Detail {...p} />
      </div>
    </div>
  );
}

export function Detail(p: Pick<DiagramProps, 'model' | 'state' | 'selected' | 'services' | 'tt'>) {
  const link = p.selected ? p.model.byKey[p.selected] : undefined;
  if (link) return <LinkDetail link={link} {...p} />;
  if (p.selected && /^[A-Z]+-\d{2}$/.test(p.selected)) return <NodeDetail id={p.selected} {...p} />;
  return (
    <div class="tr-pane">
      <div class="tr-caption">Selection</div>
      <p class="tr-note">Select a segment, link or site on the board (click, or Tab then Enter) for its block and movement details.</p>
      <SummaryTable model={p.model} state={p.state} tt={p.tt} />
    </div>
  );
}

function SummaryTable({ model, state, tt }: { model: SimModel; state: Snapshot | null; tt: TimetableDoc | null }) {
  const rows = model.links.filter((l) => l.kind === 'RAIL');
  const cols: Column<SimLink>[] = [
    { key: 'key', header: 'Seg', mono: true, width: 40 },
    { key: "ends", header: "Between", render: (l) => `${l.a.replace("ALPHA-", "A-")} / ${l.b.replace("ALPHA-", "A-")}`, sortValue: (l) => l.a },
    { key: 'paths', header: 'Paths today', align: 'right', mono: true, sortValue: (l) => pathsToday(l, state), render: (l) => (tt?.timetable.noPaths.includes(l.key) || !l.inService ? 'No paths' : String(pathsToday(l, state))) },
    { key: 'status', header: 'Status', wrap: true, render: (l) => <StatusLight {...statusWord(l, state)} />, sortValue: (l) => statusWord(l, state).word },
  ];
  return <DataTable columns={cols} rows={rows} rowKey={(l) => l.key} label="Rail segments" dense />;
}

const pathsToday = (l: SimLink, s: Snapshot | null) => (s ? s.movements.filter((m) => m.link === l.key && !m.cancelled).length : 0);

function LinkDetail({ link, state, model, tt }: { link: SimLink } & Pick<DiagramProps, 'model' | 'state' | 'services' | 'tt'>) {
  const trains = (state?.trains ?? []).filter((t) => t.link === link.key);
  const hw = headwayMin(link, state);
  const st = statusWord(link, state);
  const released = !tt || link.kind === 'RAIL' || tt.timetable.tram.some((x) => x.link === link.key);
  const blocks = Array.from({ length: link.blocks }, (_, i) => i + 1).map((n) => {
    const id = blockId(link, n);
    const occ = state?.blocks[id] ?? 'CLEAR';
    const t = trains.find((x) => x.block === id);
    return { id, occ, consist: t ? consistText(t) : '' };
  });
  const unbooked = trains.some((t) => t.unbooked);
  return (
    <div class="tr-pane">
      <PropertyGrid
        caption={link.kind === 'RAIL' ? `SEGMENT ${link.key}` : 'TRAM LINK'}
        rows={[
          { label: 'Between', value: `${link.a} and ${link.b}${link.kind === 'TRAM' ? ` ${link.label}` : ''}` },
          { label: 'Length (engineering)', value: `${link.miles.toLocaleString('en-US')} mi`, mono: true },
          { label: 'Running time (booked)', value: durText(link.bookedHours * 60), mono: true },
          { label: 'Line speed', value: unbooked ? '--' : `${link.speedMph} mph`, mono: true },
          { label: 'Headway (today)', value: unbooked || hw === null ? '--' : durText(hw), mono: true },
          { label: 'Status', value: <StatusLight {...st} /> },
          { label: 'Block sections', value: String(link.blocks), mono: true },
        ]}
      />
      {!released && <p class="tr-note">Paths on this network are carried in the network sheet and are released to holders of the network geography compartment. No movements are displayed for this link.</p>}
      <div class="tr-caption">Block occupancy</div>
      <DataTable
        columns={[
          { key: 'id', header: 'Block', mono: true, width: 70 },
          { key: 'occ', header: 'State', render: (r) => <StatusLight status={r.occ === 'CLEAR' ? (link.inService ? 'NOMINAL' : 'OFFLINE') : r.occ === 'OCCUPIED' ? 'DEGRADED' : 'OFFLINE'} word={r.occ} /> },
          { key: 'consist', header: 'Consist', mono: true },
        ]}
        rows={blocks}
        rowKey={(r) => r.id}
        label={`Blocks of ${linkTitle(link)}`}
        dense
      />
      <div class="tr-caption">Movements on this link</div>
      <MovementTable model={model} trains={trains} narrow />
    </div>
  );
}

function NodeDetail({ id, state, model }: { id: string } & Pick<DiagramProps, 'model' | 'state'>) {
  const moves = (state?.movements ?? []).filter((m) => m.from === id || m.to === id);
  const links = model.links.filter((l) => l.a === id || l.b === id);
  return (
    <div class="tr-pane">
      <PropertyGrid caption={id} rows={[{ label: 'Links at this site', value: links.map((l) => (l.kind === 'RAIL' ? `Seg ${l.key}` : `${l.a === id ? l.b : l.a}`)).join(', ') || 'None' }]} />
      <div class="tr-caption">Booked movements today</div>
      <TimetableTable model={model} rows={moves} state={state} dense narrow />
    </div>
  );
}

/* --------------------------------------------------------------- movements */

export function MovementTable({ model, trains, narrow }: { model: SimModel; trains: TrainState[]; narrow?: boolean }) {
  const cols: Column<TrainState>[] = [
    { key: 'label', header: 'Consist', mono: true, render: consistText, sortValue: consistText },
    { key: 'pathId', header: 'Path', mono: true, render: (t) => (t.unbooked ? '--' : t.pathId) },
    { key: 'link', header: 'Link', mono: true, render: (t) => (t.kind === 'RAIL' ? `Seg ${t.link}` : t.link.replace('>', ' / ')) },
    { key: 'dir', header: 'Direction', render: (t) => `${shortId(t.from)} to ${shortId(t.to)}`, sortValue: (t) => t.from },
    { key: 'block', header: 'Block', mono: true },
    { key: 'speed', header: 'Speed', align: 'right', mono: true, render: (t) => (t.speed === null ? '--' : `${t.speed} mph`), sortValue: (t) => t.speed ?? -1 },
    { key: 'exp', header: 'Expected arr.', mono: true, render: (t) => (t.unbooked ? '--' : stamp(model, t.expArrMs, t.to)), sortValue: (t) => t.expArrMs || 0 },
    { key: 'running', header: 'Running', render: (t) => runningText(t.runningMin), sortValue: (t) => t.runningMin ?? -999 },
  ];
  const used = narrow ? cols.filter((c) => ['label', 'dir', 'block', 'running'].includes(c.key)) : cols;
  return <DataTable columns={used} rows={trains} rowKey={(t) => t.id} label="Consists on the line" dense empty={<p class="tr-note">No consists on this section of line.</p>} />;
}

export function MovementsView({ model, state, narrow }: { model: SimModel; state: Snapshot | null; narrow?: boolean }) {
  const trains = state?.trains ?? [];
  const occupied = Object.entries(state?.blocks ?? {}).filter(([, v]) => v !== 'CLEAR');
  return (
    <div class="tr-scroll">
      <div class="tr-caption">Consists on the line ({trains.length})</div>
      <MovementTable model={model} trains={trains} narrow={narrow} />
      <div class="tr-caption">Blocks not clear ({occupied.length})</div>
      <DataTable
        columns={[
          { key: 'id', header: 'Block', mono: true, width: 90 },
          { key: 'v', header: 'State' },
        ]}
        rows={occupied.map(([id, v]) => ({ id, v }))}
        rowKey={(r) => r.id}
        label="Blocks not clear"
        dense
      />
    </div>
  );
}

/* --------------------------------------------------------------- timetable */

type Row = Movement & { status: MoveStatus | 'UNBOOKED' };

export function TimetableTable({ model, rows, state, dense, narrow }: { model: SimModel; rows: Row[]; state: Snapshot | null; dense?: boolean; narrow?: boolean }) {
  const cols: Column<Row>[] = [
    { key: 'pathId', header: 'Path', mono: true, width: 70 },
    { key: 'consist', header: 'Consist', mono: true, width: 72 },
    { key: 'link', header: 'Link', mono: true, width: 110, render: (m) => (m.kind === 'RAIL' ? `Seg ${m.link}` : m.link.split('>').map(shortId).join(' / ')) },
    { key: 'from', header: 'From', mono: true, width: 80 },
    { key: 'dep', header: 'Departs', mono: true, width: 140, render: (m) => (Number.isFinite(m.depMs) && m.status !== 'UNBOOKED' ? stamp(model, m.depMs, m.from) : '--'), sortValue: (m) => m.depMs },
    { key: 'to', header: 'To', mono: true, width: 80 },
    { key: 'arr', header: 'Booked arr.', mono: true, width: 140, render: (m) => (Number.isFinite(m.bookedArrMs) ? stamp(model, m.bookedArrMs, m.to) : '--'), sortValue: (m) => m.bookedArrMs || 0 },
    { key: 'exp', header: 'Expected', mono: true, width: 140, render: (m) => (Number.isFinite(m.expArrMs) ? stamp(model, m.expArrMs, m.to) : '--'), sortValue: (m) => m.expArrMs || 0 },
    { key: 'status', header: 'Status', wrap: true, render: (m) => (m.cancelled ? `CANCELLED (${m.cancelled})` : m.status) },
  ];
  void state;
  const used = narrow ? cols.filter((c) => ['pathId', 'consist', 'dep', 'status'].includes(c.key)).map((c) => (c.key === 'dep' ? { ...c, width: 64, render: (m: Row) => (Number.isFinite(m.depMs) && m.status !== 'UNBOOKED' ? hhmmZ(m.depMs) : '--') } : c)) : cols;
  return <DataTable columns={used} rows={rows} rowKey={(m) => m.key} label="Booked movements" dense={dense} empty={<p class="tr-note">No booked movements.</p>} />;
}

export const shortId = (id: string) => id.replace('ALPHA-', 'A-').replace('BETA-', 'B-').replace('GAMMA-', 'G-');

export function TimetableView({ model, state, tt, narrow }: { model: SimModel; state: Snapshot | null; tt: TimetableDoc | null; narrow?: boolean }) {
  const [filter, setFilter] = useState<'ALL' | 'RAIL' | 'TRAM'>('ALL');
  const rows: Row[] = (state?.movements ?? []).filter((m) => filter === 'ALL' || m.kind === filter);
  const u = state?.trains.find((t) => t.unbooked);
  if (u && filter !== 'TRAM') {
    rows.unshift({ key: 'UNBOOKED', pathId: '--', kind: 'RAIL', link: u.link, consist: SEG04_LABEL, from: u.from, to: u.to, depMs: NaN, bookedArrMs: NaN, expArrMs: NaN, cancelled: null, status: 'UNBOOKED' });
  }
  return (
    <div class="tr-scroll">
      <div class="tr-filter" role="radiogroup" aria-label="Movements shown">
        {(['ALL', 'RAIL', 'TRAM'] as const).map((f) => (
          <label key={f} class="tr-radio">
            <input type="radio" name="tt-filter" checked={filter === f} onChange={() => setFilter(f)} /> {f === 'ALL' ? 'All movements' : f === 'RAIL' ? 'Rail' : 'Tram'}
          </label>
        ))}
        <span class="tr-note">
          {tt ? `Working timetable ${tt.timetable.source} rev ${tt.revision}` : 'Working timetable not loaded'}
          {state ? `. Movements booked to depart ${state.date.slice(8)} MAY 2008 (UTC day).` : ''}
        </span>
      </div>
      <TimetableTable model={model} rows={rows} state={state} narrow={narrow} />
      {tt && tt.timetable.noPaths.length > 0 && (
        <p class="tr-note">
          {tt.timetable.noPaths.map((s) => `Segment ${s}: no paths. Not in revenue service.`).join(' ')}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ incident log */

export function LogView({ state, services, onOpen }: { state: Snapshot | null; services: Services; onOpen: (route: string) => void }) {
  const filed = services.docs.all().filter((r) => /^OSC-TRN-INC-/.test(r.docNo));
  return (
    <div class="tr-scroll">
      <div class="tr-caption">Live log, current and previous day (Network Control, ALPHA-01)</div>
      <DataTable
        columns={[
          { key: 'serial', header: 'Entry', mono: true, width: 96, render: (e: LogEntry) => incNo(e.serial), sortValue: (e: LogEntry) => e.serial },
          { key: 'text', header: 'Record', mono: true, wrap: true },
        ]}
        rows={state?.log ?? []}
        rowKey={(e) => `${e.serial}`}
        label="Incident log"
        dense
        wrap
        empty={<p class="tr-note">No entries this day.</p>}
      />
      <div class="tr-caption">Filed entries</div>
      <ul class="tr-links">
        {filed.map((r) => (
          <li key={r.id}>
            <a href={r.route} onClick={(e) => (e.preventDefault(), onOpen(r.route))}>
              {r.docNo}
            </a>{' '}
            {r.title}
          </li>
        ))}
        {filed.length === 0 && <li class="tr-note">No entries filed to the register.</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- possessions */

export function PossessionView({ state, services, onOpen }: { state: Snapshot | null; services: Services; onOpen: (route: string) => void }) {
  const docs = services.docs.all().filter((r) => /^OSC-TRN-POS-/.test(r.docNo));
  const docFor = (p: PossessionState) => docs.find((d) => p.link && d.title.toLowerCase().includes(p.limits.toLowerCase()) && d.date <= p.date);
  const cols: Column<PossessionState>[] = [
    { key: 'date', header: 'Date', mono: true, render: (p) => `${p.date.slice(8)} MAY 2008`, sortValue: (p) => p.date },
    { key: 'limits', header: 'Limits' },
    { key: 'time', header: 'Times', render: (p) => p.timeText },
    { key: 'originator', header: 'Booked by', mono: true },
    { key: 'status', header: 'Status', render: (p) => p.status },
    {
      key: 'record',
      header: 'Record',
      render: (p) => {
        const d = docFor(p);
        return d ? (
          <a href={d.route} onClick={(e) => (e.preventDefault(), onOpen(d.route))}>
            {d.docNo}
          </a>
        ) : (
          '--'
        );
      },
      sortable: false,
    },
  ];
  return (
    <div class="tr-scroll">
      <div class="tr-caption">Possession register, MAY 2008</div>
      <DataTable columns={cols} rows={state?.possessions ?? []} rowKey={(p) => p.id} label="Possession register" dense empty={<p class="tr-note">No possessions booked.</p>} />
      <p class="tr-note">A block under possession reports POSSESSED regardless of detection. No revenue movement is permitted on a link while a possession is in force.</p>
    </div>
  );
}

/* ------------------------------------------------------------- environment */

export function EnvironmentView({ model, state, services, segment, onSegment }: { model: SimModel; state: Snapshot | null; services: Services; segment: string; onSegment: (s: string) => void }) {
  if (!services.clearance.satisfies('KESTREL')) {
    return (
      <RefusalState
        authority="Transit Operations"
        reference="OSC-CB-011"
        reason="Tunnel environmental readings by block are transit engineering data and are not displayed to this operator."
        requirement="KESTREL compartment briefing. Reference DIR-0412."
      />
    );
  }
  const link = model.byKey[segment] ?? model.links[0]!;
  const now = state?.now ?? Date.now();
  const rows = Array.from({ length: link.blocks }, (_, i) => {
    const id = blockId(link, i + 1);
    return envReading(id, now, state?.blocks[id] ?? 'CLEAR');
  });
  return (
    <div class="tr-scroll">
      <div class="tr-filter">
        <label>
          Segment{' '}
          <select class="f-select" value={link.key} onChange={(e) => onSegment((e.target as HTMLSelectElement).value)} aria-label="Segment">
            {model.links
              .filter((l) => l.kind === 'RAIL')
              .map((l) => (
                <option key={l.key} value={l.key}>
                  {l.key} {l.a} / {l.b}
                </option>
              ))}
          </select>
        </label>
        <span class="tr-note">Readings at block ventilation stations, sampled each second.</span>
      </div>
      <DataTable
        columns={[
          { key: 'block', header: 'Block', mono: true },
          { key: 'tempF', header: 'Air temp (F)', align: 'right', mono: true, render: (r) => r.tempF.toFixed(1) },
          { key: 'rh', header: 'RH (%)', align: 'right', mono: true },
          { key: 'co2', header: 'CO2 (ppm)', align: 'right', mono: true },
          { key: 'airflow', header: 'Airflow (ft/s)', align: 'right', mono: true, render: (r) => r.airflow.toFixed(1) },
          { key: 'state', header: 'Block state' },
        ]}
        rows={rows}
        rowKey={(r) => r.block}
        label={`Environmental readings, segment ${link.key}`}
        dense
      />
    </div>
  );
}

export function Caption({ children }: { children: ComponentChildren }) {
  return <div class="tr-caption">{children}</div>;
}
