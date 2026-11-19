/**
 * Dispatcher Workstation views: the desk's line diagram, the train register, the dispatch
 * log and the tram platform indicator.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AccountId } from '@core/contracts';
import { Button, ButtonRow, DataTable, StatusLight, type Column, type OperStatus } from '@design/index';
import { LineDiagram, type DiagramNetwork } from '@graphics/schematic';
import { Lamp, Plate } from '@graphics/panel';
import { hhmmLocal, hhmmZ, zoneForState } from '@sim/time';
import { diagramBlockCounts, runState, stamp, type BoardState, type Movement, type PlantInput, type RunState, type SimModel } from '@sim/transit-model';
import { DSP, placeText, SEG04 } from './logic';
import type { DispatchRecord } from './types';

const NC_ZONE = zoneForState('VA');
const zl = (ms: number) => `${hhmmZ(ms)} (${hhmmLocal(ms, NC_ZONE)})`;

function useSize<T extends HTMLElement>(): [{ current: T | null }, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

export const STATUS_LIGHT: Record<RunState['status'], OperStatus> = { scheduled: 'NOMINAL', running: 'NOMINAL', held: 'DEGRADED', arrived: 'OFFLINE', cancelled: 'OFFLINE' };

/* ---------------------------------------------------------------- diagram */

export function DeskBoard(p: { board: BoardState; model: SimModel; network: DiagramNetwork; route: string[]; onNode: (id: string) => void; onLink: (key: string) => void; training: boolean }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const last = p.route[p.route.length - 1] ?? null;
  return (
    <div class="dsp-board" ref={ref} aria-label="Line diagram: click platforms in order to enter a route">
      {size.w > 0 && size.h > 0 && (
        <LineDiagram
          width={Math.max(size.w, 560)}
          height={size.h}
          network={p.network}
          trains={p.board.trains.map((t) => ({ id: t.id, kind: t.kind, link: t.link, pos: t.pos, dir: t.dir, label: t.label, suppressed: t.suppressed }))}
          occupancy={p.board.occupancy}
          blockCounts={diagramBlockCounts(p.model)}
          selected={last}
          onSelectNode={p.onNode}
          onSelectLink={p.onLink}
        />
      )}
      {p.training && <div class="dsp-board-tag">TRAINING SIMULATOR: TIMETABLE TRAFFIC NOT SHOWN</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- register */

interface Row {
  rec: DispatchRecord;
  st: RunState;
}

function consistLabel(r: DispatchRecord): string {
  return r.instruction ? SEG04.suppressedLabel : r.consist;
}

function holdText(st: RunState): string {
  if (st.heldBy.length) return st.heldBy.map((h) => `${h.kind === 'manual' ? 'Desk' : h.kind === 'isolation' ? 'Isolation' : 'Drill'} ${h.ref}${h.active ? '' : ' (cleared; release required)'}`).join('; ');
  if (st.pending.length) return `At next platform: ${st.pending.map((h) => h.ref).join(', ')}`;
  return '';
}

export function Register(p: {
  model: SimModel;
  recs: DispatchRecord[];
  plant: PlantInput;
  now: number;
  selected: string | null;
  onSelect: (ref: string | null) => void;
  onHold: () => void;
  onRelease: () => void;
  onCancel: () => void;
  canAct: boolean;
  training: boolean;
}) {
  const rows: Row[] = p.recs
    .filter((r) => !r.withdrawn)
    .map((rec) => ({ rec, st: runState(p.model, rec, p.plant, p.now) }))
    .filter((x) => x.st.status !== 'cancelled' || x.rec.ref === p.selected)
    .reverse();
  const cols: Column<Row>[] = [
    { key: 'ref', header: 'Ref', mono: true, width: 132, render: (x) => x.rec.ref, sortValue: (x) => x.rec.ref },
    { key: 'consist', header: 'Consist', mono: true, width: 72, render: (x) => consistLabel(x.rec) },
    { key: 'route', header: 'Route', wrap: true, render: (x) => x.rec.route.map((n) => n.replace('ALPHA-', 'A-').replace('BETA-', 'B-').replace('GAMMA-', 'G-')).join(' > ') },
    { key: 'status', header: 'Status', width: 112, render: (x) => <StatusLight status={STATUS_LIGHT[x.st.status]} word={x.st.status.toUpperCase()} />, sortValue: (x) => x.st.status },
    { key: 'place', header: 'Position', wrap: true, render: (x) => placeText(x.st, p.model) },
    { key: 'eta', header: 'Expected arr.', mono: true, width: 120, render: (x) => (x.st.etaMs ? zl(x.st.etaMs) : '--'), sortValue: (x) => x.st.etaMs ?? 0 },
    { key: 'hold', header: 'Holds', wrap: true, render: (x) => holdText(x.st) },
  ];
  return (
    <div class="dsp-register">
      <div class="dsp-caption">
        {p.training ? 'Training movements' : 'Movements entered at this desk and others'} ({rows.length})
        <ButtonRow>
          <Button size="small" label="&Hold" disabled={!p.selected || !p.canAct} onClick={p.onHold} title="Hold at the next platform (F8)" />
          <Button size="small" label="&Release" disabled={!p.selected || !p.canAct} onClick={p.onRelease} title="Release a held train (F9)" />
          <Button size="small" label="Ca&ncel" disabled={!p.selected || !p.canAct} onClick={p.onCancel} title="Cancel a train standing at a platform" />
        </ButtonRow>
      </div>
      <DataTable
        columns={cols}
        rows={rows}
        rowKey={(x) => x.rec.ref}
        label="Dispatched movements"
        dense
        selection="single"
        selected={p.selected ? [p.selected] : []}
        onSelectionChange={(k) => p.onSelect(k[0] ?? null)}
        empty={<p class="dsp-note">No movements entered.</p>}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- log */

export function LogView(p: { model: SimModel; recs: DispatchRecord[]; plant: PlantInput; now: number; opFor: (id: AccountId) => string; selected: string | null; onSelect: (ref: string | null) => void }) {
  const rows: Row[] = p.recs
    .map((rec) => ({ rec, st: runState(p.model, rec, p.plant, p.now) }))
    .reverse()
    .slice(0, DSP.working.logShown);
  const withdrawn = (x: Row) => !!x.rec.withdrawn;
  const cols: Column<Row>[] = [
    { key: 'ref', header: 'Log no.', mono: true, width: 132, render: (x) => x.rec.ref },
    { key: 'dep', header: 'Departs', mono: true, width: 120, render: (x) => (withdrawn(x) ? '--' : zl(x.rec.departAt)), sortValue: (x) => x.rec.departAt },
    { key: 'by', header: 'Entered by', mono: true, width: 112, render: (x) => (x.rec.instruction ? SEG04.releaseDesk : p.opFor(x.rec.by)) },
    { key: 'consist', header: 'Consist', mono: true, width: 72, render: (x) => consistLabel(x.rec) },
    { key: 'route', header: 'Route', wrap: true, render: (x) => (withdrawn(x) ? '--' : x.rec.route.join(' > ')) },
    { key: 'status', header: 'Status', width: 112, render: (x) => (withdrawn(x) ? 'WITHDRAWN' : x.st.status.toUpperCase()) },
    { key: 'note', header: 'Remarks', wrap: true, render: (x) => x.rec.note ?? holdText(x.st) },
  ];
  return (
    <div class="dsp-scroll">
      <div class="dsp-caption">Dispatch log, all desks (latest {DSP.working.logShown})</div>
      <DataTable
        columns={cols}
        rows={rows}
        rowKey={(x) => x.rec.ref}
        label="Dispatch log"
        dense
        selection="single"
        selected={p.selected ? [p.selected] : []}
        onSelectionChange={(k) => p.onSelect(k[0] ?? null)}
        empty={<p class="dsp-note">No movements have been entered from a dispatcher workstation.</p>}
      />
      <p class="dsp-note dsp-pad">The log lists movements entered at Transit Control desks. Booked paths are in the working timetable. Records withdrawn by Transit Control show the log number only.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- platform */

interface PlatRow {
  key: string;
  service: string;
  dir: 'ARR' | 'DEP';
  ms: number;
  consist: string;
  status: string;
  other: string;
}

/**
 * Tram platform indicator for one site. For the Tier 4 account the far end of every service is
 * not named ("hub service"): a Tier 4 display does not name other facilities.
 */
export function PlatformView(p: { model: SimModel; board: BoardState; moves: Movement[]; recs: DispatchRecord[]; plant: PlantInput; now: number; site: string; tier4: boolean; timetableMissing: boolean }) {
  const zone = p.model.zones[p.site] ?? NC_ZONE;
  const rows: PlatRow[] = [];
  const held = p.board.holds.isolation !== null || p.board.holds.drill !== null;
  const today = new Set(p.board.movements.filter((m) => m.status === 'HELD').map((m) => m.key));
  for (const m of p.moves) {
    if (m.from !== p.site && m.to !== p.site) continue;
    if (m.expArrMs < p.now - 30 * 60_000 && m.depMs < p.now) continue;
    const dep = m.from === p.site;
    const st = m.cancelled ? 'CANCELLED' : today.has(m.key) ? 'HELD' : p.now < m.depMs ? 'BOOKED' : p.now < m.expArrMs ? (dep ? 'DEPARTED' : 'APPROACHING') : dep ? 'DEPARTED' : 'ARRIVED';
    rows.push({ key: m.key, service: m.pathId, dir: dep ? 'DEP' : 'ARR', ms: dep ? m.depMs : m.expArrMs, consist: m.consist, status: st, other: dep ? m.to : m.from });
  }
  for (const r of p.recs) {
    if (r.withdrawn || !r.route.includes(p.site)) continue;
    const st = runState(p.model, r, p.plant, p.now);
    if (st.status === 'cancelled' || st.status === 'arrived') continue;
    const i = r.route.indexOf(p.site);
    const scale = r.timeScale ?? 1;
    if (i > 0) {
      const l = st.legs[i - 1]!;
      rows.push({ key: `${r.ref}:a`, service: r.instruction ? '--' : r.ref, dir: 'ARR', ms: Math.max(p.now, r.clock.at) + (l.end - st.elapsed) / scale, consist: r.instruction ? SEG04.suppressedLabel : r.consist, status: st.status === 'held' ? 'HELD' : 'SPECIAL', other: r.route[i - 1]! });
    }
    if (i < r.route.length - 1) {
      const l = st.legs[i]!;
      if (l.start >= st.elapsed) rows.push({ key: `${r.ref}:d`, service: r.instruction ? '--' : r.ref, dir: 'DEP', ms: Math.max(p.now, r.clock.at) + (l.start - st.elapsed) / scale, consist: r.instruction ? SEG04.suppressedLabel : r.consist, status: st.status === 'held' ? 'HELD' : 'SPECIAL', other: r.route[i + 1]! });
    }
  }
  const shown = rows.filter((r) => r.ms <= p.now + 24 * 3_600_000).sort((a, b) => a.ms - b.ms);
  const cols: Column<PlatRow>[] = [
    { key: 'time', header: 'Time', mono: true, width: 150, render: (r) => stamp(p.model, r.ms, p.site), sortValue: (r) => r.ms },
    { key: 'dir', header: 'Arr / dep', width: 80, render: (r) => (r.dir === 'ARR' ? 'Arriving' : 'Departing') },
    { key: 'service', header: 'Service', mono: true, width: 100 },
    { key: 'via', header: 'Service to / from', render: (r) => (p.tier4 ? 'Hub service' : r.other) },
    { key: 'consist', header: 'Consist', mono: true, width: 80 },
    { key: 'status', header: 'Status', width: 110 },
  ];
  return (
    <div class="dsp-scroll dsp-platform">
      <div class="dsp-plat-head">
        <Plate text={`TRAM PLATFORM ${p.site}`} variant="dark" />
        <Lamp legend={['SERVICES', 'HELD']} lit={held} color="amber" showState words={{ on: 'HELD', off: 'NORMAL' }} />
        <span class="dsp-mono">{hhmmZ(p.now)} ({hhmmLocal(p.now, zone)})</span>
      </div>
      {held && (
        <p class="dsp-notice" role="status">
          {p.board.holds.isolation ? 'Services are held. Remain clear of the platform edge and await instruction from the duty supervisor.' : 'Portal seal doors are closed for a seal drill. Services are held at the platform until the drill stands down.'}
        </p>
      )}
      <DataTable
        columns={cols}
        rows={shown}
        rowKey={(r) => r.key}
        label={`Tram platform ${p.site}: services`}
        dense
        empty={<p class="dsp-note">{p.timetableMissing ? 'The service list is not available at this workstation.' : 'No services shown for the rest of the day.'}</p>}
      />
      <p class="dsp-note dsp-pad">Times are platform local. Special services are shown as they are entered by Transit Control.</p>
    </div>
  );
}

