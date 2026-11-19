/** Muster Board views: network board, site panel, point and reader log, close-out report. */
import type { ComponentChildren } from 'preact';
import { Button, ButtonRow, DataTable, GroupBox, PropertyGrid, StatusLight, type Column, type OperStatus } from '@design/index';
import { Annunciator, GuardedSwitch, Lamp, PanelFrame, PanelSection, PushButton, SegmentDisplay, SelectorSwitch, type AnnunciatorTile, type GuardState } from '@graphics/panel';
import type { MusterRun } from './types';
import { shortSite, type Person, type Read, type Reconciliation, type RunView, type Tally } from './model';
import { canon, fmt, MC, PROC_SHORT, tPlus, zuluOf, zuluSec } from './common';

const PROC_NO = MC.system.procedure.split('-').pop() ?? '';

/* ------------------------------------------------------------------ status */

export interface SiteStatus {
  status: OperStatus;
  word: string;
}

export function siteStatus(v: RunView | null, offline: boolean): SiteStatus {
  if (offline) return { status: 'OFFLINE', word: 'NO DATA' };
  if (!v) return { status: 'NOMINAL', word: 'NO MUSTER' };
  if (v.closed) return v.run.closeout && v.run.closeout.discrepancies.length > 0 ? { status: 'DEGRADED', word: 'CLOSED, DISCREPANCY' } : { status: 'NOMINAL', word: 'CLOSED' };
  if (v.reportDue && v.totals.unaccounted > 0) return { status: 'FAULT', word: `UNACCOUNTED ${v.totals.unaccounted}` };
  if (v.reportDue) return { status: 'DEGRADED', word: 'REPORT DUE' };
  return { status: 'DEGRADED', word: 'IN PROGRESS' };
}

const dash = '—';

/* ------------------------------------------------------------------ network board */

export interface NetRow {
  site: string;
  cls: string;
  points: number;
  assigned: number | null;
  view: RunView | null;
  offline: boolean;
  onNetwork: boolean;
}

export function NetworkBoard(p: {
  rows: NetRow[];
  rec: Reconciliation;
  totals: Tally;
  selected: string | null;
  onSelect: (site: string) => void;
  onOpen: (site: string) => void;
  compact: boolean;
}) {
  const num = (r: NetRow, k: keyof Tally) => (!r.onNetwork || r.offline || !r.view ? dash : fmt(r.view.totals[k]));
  const cols: Column<NetRow>[] = [
    { key: 'site', header: 'Site', mono: true, width: 82, sortable: true },
    { key: 'cls', header: 'Class', width: 58, sortable: true },
    { key: 'points', header: 'Pts', align: 'right', width: 36, render: (r) => (r.onNetwork ? r.points : dash) },
    { key: 'assigned', header: 'Assigned', align: 'right', width: 70, mono: true, sortable: true, sortValue: (r) => r.assigned ?? -1, render: (r) => (r.assigned === null ? dash : fmt(r.assigned)) },
    { key: 'present', header: 'Present', align: 'right', width: 62, mono: true, render: (r) => num(r, 'present') },
    {
      key: 'acc',
      header: 'Sweep/roster',
      align: 'right',
      width: 84,
      mono: true,
      title: 'Located by sweep teams plus accounted by duty roster',
      render: (r) => (!r.onNetwork || r.offline || !r.view ? dash : fmt(r.view.totals.located + r.view.totals.roster)),
    },
    { key: 'unacc', header: 'Unaccounted', align: 'right', width: 84, mono: true, render: (r) => num(r, 'unaccounted') },
    { key: 'vis', header: 'Visitors', align: 'right', width: 60, mono: true, render: (r) => num(r, 'visitors') },
    { key: 'unk', header: 'Not on strength', align: 'right', width: 96, mono: true, render: (r) => num(r, 'unknown') },
    { key: 'run', header: 'Muster', mono: true, width: 150, render: (r) => (r.view && !r.offline ? `${r.view.run.id}` : dash) },
    {
      key: 'status',
      header: 'Status',
      width: 170,
      render: (r) => {
        if (!r.onNetwork) return <StatusLight status="OFFLINE" word="NOT ON PLANT NETWORK" />;
        const s = siteStatus(r.view, r.offline);
        return <StatusLight status={s.status} word={s.word} />;
      },
    },
  ];
  const shown = p.compact ? cols.filter((c) => ['site', 'assigned', 'present', 'unacc', 'status'].includes(c.key)) : cols;
  const rx = p.rec;
  return (
    <div class="mus-net">
      <DataTable
        columns={shown}
        rows={p.rows}
        rowKey={(r) => r.site}
        label="Muster by site"
        caption="Badge-reader muster by site. Select a site and press Enter to open its board."
        selection="single"
        selected={p.selected ? [p.selected] : []}
        onSelectionChange={(k) => k[0] && p.onSelect(k[0])}
        onActivate={(r) => r.onNetwork && p.onOpen(r.site)}
        dense
        zebra
        rowClass={(r) => (r.onNetwork ? undefined : 'mus-row--off')}
        footer={
          <tr class="mus-total">
            <td>Network</td>
            {!p.compact && <td />}
            {!p.compact && <td />}
            <td class="num">{fmt(rx.assignedToPoints)}</td>
            <td class="num">{fmt(p.totals.present)}</td>
            {!p.compact && <td class="num">{fmt(p.totals.located + p.totals.roster)}</td>}
            <td class="num">{fmt(p.totals.unaccounted)}</td>
            {!p.compact && <td class="num">{fmt(p.totals.visitors)}</td>}
            {!p.compact && <td class="num">{fmt(p.totals.unknown)}</td>}
            {!p.compact && <td />}
            <td />
          </tr>
        }
      />
      <GroupBox title="Reconciliation against personnel strength">
        <PropertyGrid
          columns={p.compact ? 1 : 2}
          rows={[
            { label: 'Total personnel', value: fmt(rx.totalPersonnel), mono: true },
            { label: 'Total posted staff', value: fmt(rx.postedStaff), mono: true },
            { label: 'Assigned to assembly points', value: fmt(rx.assignedToPoints), mono: true },
            { label: 'Posted, not on plant network (DELTA)', value: fmt(rx.postedOffNetwork), mono: true },
            { label: 'DETACHED / UNPOSTED', value: `${fmt(rx.unposted)} (no assembly point)`, mono: true },
            { label: 'Badges not on posted strength', value: fmt(p.totals.unknown), mono: true },
          ]}
        />
        <p class="mus-note">
          Personnel carried as DETACHED / UNPOSTED ({fmt(rx.unposted)}) hold no assembly point assignment and are not mustered ({PROC_SHORT} para 3.3). Figures for sites without a muster in
          progress show {dash}. Totals cover the latest muster at each site.
        </p>
      </GroupBox>
    </div>
  );
}

/* ------------------------------------------------------------------ site board */

export interface SitePanelProps {
  site: string;
  view: RunView | null;
  offline: boolean;
  guard: GuardState;
  tiles: AnnunciatorTile[];
  sweepSel: number;
  canControl: boolean;
  reducedMotion: boolean;
  now: number;
  onGuardLift: () => void;
  onGuardClose: () => void;
  onInitiate: () => void;
  onAck: (ids: string[]) => void;
  onReset: (ids: string[]) => void;
  onTest: (on: boolean) => void;
  onSweepSel: (i: number) => void;
  onSweep: () => void;
  onCloseout: () => void;
  onPrint: () => void;
  onOpenPoint: (pointId: string) => void;
  selectedPoint: string | null;
  onSelectPoint: (pointId: string) => void;
  compact: boolean;
}

interface PointRow {
  id: string;
  level: number;
  location: string;
  capacity: number;
  assigned: number;
  pv: RunView['points'][number] | null;
}

export function SiteBoard(p: SitePanelProps) {
  const sm = canon.musterPoints.find((s) => s.facility === p.site)!;
  const cls = MC.classes.find((c) => c.classId === p.site.split('-')[0])!;
  const v = p.offline ? null : p.view;
  const t = v?.totals;
  const open = !!v && !v.closed;
  const short = (id: string) => id.split('-').pop() ?? id;
  const rows: PointRow[] = sm.points.map((pt) => ({ ...pt, pv: v?.points.find((x) => x.point.id === pt.id) ?? null }));
  const n = (x: number | undefined) => (x === undefined ? '----' : x);
  const cols: Column<PointRow>[] = [
    { key: 'id', header: 'Point', mono: true, width: 76 },
    { key: 'level', header: 'Lvl', align: 'right', width: 36 },
    { key: 'location', header: 'Location', wrap: true },
    { key: 'capacity', header: 'Cap', align: 'right', mono: true, width: 44 },
    { key: 'assigned', header: 'Asgd', align: 'right', mono: true, width: 46 },
    { key: 'present', header: 'Present', align: 'right', mono: true, width: 56, render: (r) => (r.pv ? r.pv.present : dash) },
    { key: 'located', header: 'Sweep', align: 'right', mono: true, width: 48, render: (r) => (r.pv ? r.pv.located : dash) },
    { key: 'roster', header: 'Roster', align: 'right', mono: true, width: 50, render: (r) => (r.pv ? r.pv.roster : dash) },
    { key: 'unacc', header: 'Unacc', align: 'right', mono: true, width: 50, render: (r) => (r.pv ? r.pv.unaccounted : dash) },
    { key: 'vis', header: 'Vis', align: 'right', mono: true, width: 36, render: (r) => (r.pv ? r.pv.visitors : dash) },
    { key: 'unk', header: 'Not on str.', align: 'right', mono: true, width: 70, render: (r) => (r.pv ? r.pv.unknown : dash) },
    {
      key: 'bar',
      header: 'Accounted',
      width: 120,
      render: (r) => {
        if (!r.pv) return dash;
        const acc = r.pv.present + r.pv.located + r.pv.roster;
        const frac = Math.min(1, acc / Math.max(1, r.assigned));
        const over = acc + r.pv.unknown > r.assigned;
        // Bar segments are neutral; an over-count is said with the status square + word.
        return (
          <span class="mus-bar-cell">
            <span class="mus-bar" role="meter" aria-valuemin={0} aria-valuemax={r.assigned} aria-valuenow={acc} aria-label={`${r.id} accounted ${acc} of ${r.assigned}`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} class={i < Math.floor(frac * 10) ? 'on' : undefined} />
              ))}
            </span>
            {over ? <StatusLight status="DEGRADED" word="OVER" /> : null}
          </span>
        );
      },
    },
    { key: 'sweep', header: 'Sweep team', width: 84, render: (r) => (r.pv ? (r.pv.sweep === 'none' ? dash : r.pv.sweep === 'sweeping' ? 'SWEEPING' : 'CLEAR') : dash) },
  ];
  const shown = p.compact ? cols.filter((c) => ['id', 'assigned', 'present', 'unacc', 'sweep'].includes(c.key)) : cols;
  return (
    <div class="mus-site">
      <PanelFrame
        title={[`${p.site} MUSTER BOARD`, v ? `${v.run.id}${v.run.drillId ? '  DRILL' : ''}` : p.offline ? 'NO DATA: HUB CIRCUIT DOWN' : 'NO MUSTER IN PROGRESS']}
        panelNo={`PNL-SFC-${PROC_NO}-${shortSite(p.site)}  REV B  ${MC.system.name.toUpperCase()} ${MC.system.release}`}
        columns={p.compact ? '1fr' : 'minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(0, 1fr)'}
        gap={12}
      >
        <PanelSection title="TOTALS" columns={p.compact ? 2 : 3} span={p.compact ? 1 : 2}>
          <SegmentDisplay value={sm.points.reduce((a, x) => a + x.assigned, 0)} digits={4} label="ASSIGNED" />
          <SegmentDisplay value={n(t?.present)} digits={4} label="PRESENT" />
          <SegmentDisplay value={t ? t.located + t.roster : '----'} digits={4} label="SWEEP / ROSTER" />
          <SegmentDisplay value={n(t?.unaccounted)} digits={4} label="UNACCOUNTED" variant="led" />
          <SegmentDisplay value={n(t?.visitors)} digits={4} label="VISITORS" />
          <SegmentDisplay value={n(t?.unknown)} digits={4} label="NOT ON STRENGTH" variant="led" />
        </PanelSection>
        <PanelSection title="SWEEP TEAMS">
          <SelectorSwitch positions={sm.points.map((x) => short(x.id))} value={p.sweepSel} onChange={p.onSweepSel} label="ASSEMBLY POINT" tag={`SS-${p.site}-SW`} />
          <PushButton legend={['SEND', 'TEAM']} label="DISPATCH SWEEP" color="amber" onPress={p.onSweep} disabled={p.offline} tag={`PB-${p.site}-SW`} ariaLabel="Dispatch sweep team" />
          <SegmentDisplay value={v ? `${v.activeSweeps}-${cls.sweepTeams}` : `0-${cls.sweepTeams}`} digits={3} label="TEAMS OUT / HELD" size="sm" />
        </PanelSection>
        <PanelSection title="ANNUNCIATOR" span={p.compact ? 1 : 2}>
          <Annunciator tiles={p.tiles} columns={p.compact ? 3 : 4} label={`${p.site} muster annunciator`} reducedMotion={p.reducedMotion} onAck={p.onAck} onReset={p.onReset} onTest={p.onTest} tileWidth={p.compact ? 84 : 96} />
        </PanelSection>
        <PanelSection title="MUSTER" columns={2}>
          <GuardedSwitch
            state={p.guard}
            label={['SITE MUSTER', 'INITIATE']}
            plate="warning"
            holdMs={2000}
            tag={`HS-${p.site}-M1`}
            disabled={p.offline}
            reducedMotion={p.reducedMotion}
            words={{ actuated: 'INITIATED' }}
            onLift={p.onGuardLift}
            onClose={p.onGuardClose}
            onActuate={p.onInitiate}
          />
          <div class="mus-stack">
          <div class="mus-lamps">
            <Lamp legend={['MUSTER', 'IN PROGRESS']} color="red" lit={open} />
            <Lamp legend={['REPORT', 'DUE']} color="amber" lit={open && !!v?.reportDue} />
            <Lamp legend={['ALL', 'ACCOUNTED']} color="green" lit={!!t && t.unaccounted === 0 && !!v?.reportDue} />
          </div>
          <SegmentDisplay value={v ? Math.min(999.9, Math.floor(v.elapsedMin * 10) / 10) : '----'} decimals={1} digits={4} label="EXERCISE CLOCK MIN" size="sm" />
          <div class="mus-lamps">
            <PushButton legend="REPORT" label="CLOSE-OUT" color="white" onPress={p.onCloseout} tag={`PB-${p.site}-CO`} />
            <PushButton legend="PRINT" label="REPORT" color="white" onPress={p.onPrint} tag={`PB-${p.site}-PR`} />
            <Lamp legend={['CLOSE-OUT', 'SIGNED']} color="white" lit={!!v?.closed} />
          </div>
          </div>
        </PanelSection>
      </PanelFrame>
      <DataTable
        columns={shown}
        rows={rows}
        rowKey={(r) => r.id}
        label={`${p.site} assembly points`}
        caption={`Assembly points, ${p.site}. Enter opens the point and its readers.`}
        selection="single"
        selected={p.selectedPoint ? [p.selectedPoint] : []}
        onSelectionChange={(k) => k[0] && p.onSelectPoint(k[0])}
        onActivate={(r) => p.onOpenPoint(r.id)}
        dense
        zebra
        rowClass={(r) => (r.pv && r.pv.present + r.pv.located + r.pv.roster + r.pv.unknown > r.assigned ? 'mus-row--over' : undefined)}
      />
      {!p.canControl && <p class="mus-note">Read access. Muster controls on this board are refused at this workstation ({PROC_SHORT} para 4).</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ point and readers */

export function PointBoard(p: {
  site: string;
  pointId: string;
  view: RunView | null;
  offline: boolean;
  reader: string | null;
  onReader: (id: string | null) => void;
  selectedRead: string | null;
  onSelectRead: (key: string | null) => void;
  onLookup: (r: Read) => void;
  nameOf: (ps: Person) => ComponentChildren;
  startedAt: number;
  compact: boolean;
}) {
  const sm = canon.musterPoints.find((s) => s.facility === p.site)!;
  const pt = sm.points.find((x) => x.id === p.pointId)!;
  const pv = p.offline ? null : (p.view?.points.find((x) => x.point.id === p.pointId) ?? null);
  const readers = p.view?.model.readers.filter((r) => r.point === p.pointId) ?? [];
  const reads = (p.view?.reads ?? []).filter((r) => r.point === p.pointId && (!p.reader || r.reader === p.reader)).slice().reverse();
  const key = (r: Read) => `${r.reader}:${r.badge}:${r.kind}`;
  const sel = reads.find((r) => key(r) === p.selectedRead) ?? null;
  const wall = (min: number) => p.startedAt + (min * 60000) / canon.sealDrill.timeScale;
  const statusWord = (r: Read) => (r.kind === 'located' ? 'LOCATED BY SWEEP' : r.kind === 'visitor' ? 'VISITOR' : r.kind === 'unknown' ? 'NOT ON POSTED STRENGTH' : 'READ');
  const readerCols: Column<(typeof readers)[number]>[] = [
    { key: 'id', header: 'Reader', mono: true, width: 96 },
    { key: 'label', header: 'Location', wrap: true },
    {
      key: 'st',
      header: 'Status',
      width: 300,
      wrap: true,
      render: (r) => (r.inService ? <StatusLight status="NOMINAL" word="IN SERVICE" /> : <StatusLight status="OFFLINE" word="NOT IN SERVICE" note={r.note ?? undefined} />),
    },
    { key: 'reads', header: 'Reads', align: 'right', mono: true, width: 56, render: (r) => (pv ? (pv.readers.find((x) => x.reader.id === r.id)?.reads ?? 0) : dash) },
  ];
  const logCols: Column<Read>[] = [
    { key: 'at', header: 'Time', mono: true, width: 78, render: (r) => zuluSec(wall(r.atMin)) },
    { key: 'clock', header: 'Clock', mono: true, width: 64, render: (r) => tPlus(r.atMin) },
    { key: 'badge', header: 'Badge', mono: true, width: 82 },
    { key: 'reader', header: 'Reader', mono: true, width: 96 },
    { key: 'dir', header: 'Directory', wrap: true, render: (r) => p.nameOf(r.person) },
    {
      key: 'st',
      header: 'Status',
      width: 200,
      render: (r) => <StatusLight status={r.kind === 'unknown' ? 'FAULT' : r.kind === 'located' ? 'DEGRADED' : 'NOMINAL'} word={statusWord(r)} />,
    },
  ];
  return (
    <div class="mus-point">
      <PropertyGrid
        columns={p.compact ? 1 : 2}
        caption={`${pt.id}, ${p.site}`}
        rows={[
          { label: 'Location', value: pt.location },
          { label: 'Level', value: String(pt.level), mono: true },
          { label: 'Capacity', value: fmt(pt.capacity), mono: true },
          { label: 'Assigned', value: fmt(pt.assigned), mono: true },
          { label: 'Present', value: pv ? fmt(pv.present) : dash, mono: true },
          { label: 'Unaccounted', value: pv ? fmt(pv.unaccounted) : dash, mono: true },
        ]}
      />
      <DataTable
        columns={p.compact ? readerCols.filter((c) => c.key !== 'label') : readerCols}
        rows={readers}
        rowKey={(r) => r.id}
        label={`Readers at ${pt.id}`}
        caption="Assembly readers. Select a reader to filter the log; select it again to show all."
        selection="single"
        selected={p.reader ? [p.reader] : []}
        onSelectionChange={(k) => p.onReader(k[0] && k[0] !== p.reader ? k[0] : null)}
        dense
        empty={p.offline ? 'No data: hub circuit down.' : 'No muster on record at this site.'}
      />
      <DataTable
        columns={p.compact ? logCols.filter((c) => !['clock', 'reader'].includes(c.key)) : logCols}
        rows={reads}
        rowKey={key}
        label={`Badge reads at ${pt.id}`}
        caption={`Badge log${p.reader ? `, reader ${p.reader}` : ''}, newest first. Enter looks up the selected badge.`}
        selection="single"
        selected={p.selectedRead ? [p.selectedRead] : []}
        onSelectionChange={(k) => p.onSelectRead(k[0] ?? null)}
        onActivate={(r) => p.onLookup(r)}
        dense
        zebra
        maxHeight="320px"
        rowClass={(r) => (r.kind === 'unknown' ? 'mus-row--unk' : undefined)}
        empty={p.offline ? 'No data: hub circuit down.' : 'No badge reads.'}
      />
      <ButtonRow>
        <Button onClick={() => sel && p.onLookup(sel)} disabled={!sel}>
          Look up badge
        </Button>
      </ButtonRow>
    </div>
  );
}

/* ------------------------------------------------------------------ close-out */

export function CloseoutView(p: {
  site: string;
  runs: MusterRun[];
  runIdSel: string | null;
  onRun: (id: string) => void;
  view: RunView | null;
  preview: string[];
  signer: string;
  signedBy: string | null;
  initiator?: string;
  canSign: boolean;
  onSign: () => void;
  onPrint: () => void;
  compact: boolean;
}) {
  const v = p.view;
  if (!v) return <div class="mus-empty">No muster on record at {p.site}. A close-out report is prepared from a muster in progress or a closed muster.</div>;
  const c = v.run.closeout;
  const t = c ?? { ...v.totals, discrepancies: p.preview };
  return (
    <div class="mus-co">
      {p.runs.length > 1 && (
        <div class="mus-co__runs">
          <label>
            Muster{' '}
            <select value={p.runIdSel ?? v.run.id} onChange={(e) => p.onRun((e.target as HTMLSelectElement).value)}>
              {p.runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} {r.closeout ? '(closed)' : '(open)'}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <CloseoutSheet site={p.site} view={v} totals={t} discrepancies={t.discrepancies} signer={p.signedBy} initiator={p.initiator} />
      <ButtonRow>
        {!c && (
          <Button onClick={p.onSign} disabled={!p.canSign}>
            Sign close-out as {p.signer}
          </Button>
        )}
        <Button onClick={p.onPrint}>Print close-out...</Button>
      </ButtonRow>
      {!c && !v.reportDue && <p class="mus-note">Close-out is signed after the report time ({tPlus(v.model.cls.reportMin)}).</p>}
    </div>
  );
}

export function CloseoutSheet({ site, view: v, totals: t, discrepancies, signer, initiator }: { site: string; view: RunView; totals: Tally; discrepancies: string[]; signer: string | null; initiator?: string }) {
  const c = v.run.closeout;
  return (
    <article class="mus-sheet" aria-label={`Close-out report ${v.run.id}`}>
      <header>
        <div class="mus-sheet__no">{MC.system.procedure} ANNEX B</div>
        <h2>MUSTER CLOSE-OUT REPORT</h2>
        <div class="mus-sheet__sub">{c ? 'SIGNED' : 'DRAFT, NOT SIGNED'}</div>
      </header>
      <table class="mus-sheet__id">
        <tbody>
          <tr>
            <th>Facility</th>
            <td>{site}</td>
            <th>Muster</th>
            <td class="mono">{v.run.id}</td>
          </tr>
          <tr>
            <th>Initiated</th>
            <td class="mono">{zuluOf(v.run.startedAt)}</td>
            <th>Initiated by</th>
            <td>{v.run.by === 'drill' ? `Seal drill ${v.run.drillId ?? ''}` : (initiator ?? v.run.by.toUpperCase())}</td>
          </tr>
          <tr>
            <th>Report time</th>
            <td class="mono">{tPlus(v.model.cls.reportMin)}</td>
            <th>Exercise clock</th>
            <td class="mono">{tPlus(v.elapsedMin)}</td>
          </tr>
        </tbody>
      </table>
      <table class="mus-sheet__tot">
        <thead>
          <tr>
            <th>Assigned</th>
            <th>Badged present</th>
            <th>Located by sweep</th>
            <th>Accounted by roster</th>
            <th>Unaccounted</th>
            <th>Visitors</th>
            <th>Not on strength</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {[t.assigned, t.present, t.located, t.roster, t.unaccounted, t.visitors, t.unknown].map((x, i) => (
              <td key={i} class="mono">
                {fmt(x)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <h3>Discrepancies</h3>
      {discrepancies.length === 0 ? <p>None. Muster reconciled with posted staff assigned to this facility.</p> : (
        <ol>
          {discrepancies.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ol>
      )}
      <footer>
        <div>Signed: {c && signer ? `${signer}, ${zuluOf(c.at)}` : '________________________'}</div>
        <div class="mus-sheet__dist">Distribution: Facility command; Security Forces Command; Office of Internal Assurance (with discrepancies only).</div>
      </footer>
    </article>
  );
}
