/**
 * Door and Airlock Control views: board (annunciator, level mimic, detail), cycle log,
 * overrides in force, and the procedure documents.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AirlockDef, DoorDef, Marking } from '@core/canon-types';
import type { AccountDef, DocJson, DrillState, RouteEntry } from '@core/contracts';
import canonJson from '@canon';
import { useServices } from '@core/services';
import { loadCanonT2 } from '@core/canon-release';
import { isRx, rxInfo } from '@core/rx';
import { DataTable, DocumentView, ProgressBar, PropertyGrid, Select, type Column } from '@design/index';
import { Annunciator, BarMeter, KeySwitch, Lamp, PanelSection, Plate, PushButton, SegmentDisplay, SelectorSwitch, type AnnPoint } from '@graphics/panel';
import { StatusWord } from '@graphics/reactor';
import { LevelMimic, type MimicItem, type MimicLevelRow } from '@graphics/doors';
import { ErrorState } from '@graphics/states';
import { ScanPage } from '@graphics/scan';
import { Stamp } from '@graphics/banners';
import { MarkingStrip, Seal } from '@shell/adapters';
import {
  ALARM_TILES,
  DC,
  airlockDef,
  airlockPhase,
  doorSite,
  chamberDp,
  doorDef,
  doorView,
  drillHolds,
  heldOpen,
  kindWord,
  levelIndex,
  logRows,
  opOf,
  onBoard,
  POS_WORD,
  restingPos,
  siteDoors,
  zl,
  dayOf,
  type AccountRules,
  type AlarmId,
  type LogRow,
} from './model';
import type { DoorsState } from './types';

export interface Ui {
  site: string;
  own: boolean;
  stale: boolean;
  now: number;
  nowIso: string;
  state: DoorsState;
  drill: DrillState | null;
  ann: Record<AlarmId, AnnPoint>;
  lampTest: boolean;
  sel: string | null;
  deconMode: Record<string, boolean>;
  rules: AccountRules;
  acct: AccountDef;
  reduced: boolean;
  logSite: string;
  logSel: string | null;
}

export interface Actions {
  select(id: string | null): void;
  commandDoor(id: string, cmd: 'open' | 'close'): void;
  cycleAirlock(id: string, dir: 'in' | 'out'): void;
  setDecon(id: string, on: boolean): void;
  bypassDecon(id: string): void;
  bypassAttempt(al: AirlockDef): void;
  requestHoldOpen(id: string): void;
  clearOverride(id: string): void;
  ack(ids?: string[]): void;
  reset(ids?: string[]): void;
  test(on: boolean): void;
  operable(id: string | null | undefined): boolean;
  setLogSite(s: string): void;
  setLogSel(k: string | null): void;
  requestRecord(door: string, site: string, level: number | null): void;
  say(t: string): void;
}

const MARKINGS = (canonJson as unknown as { markings: Marking[] }).markings;
const tag = (id: string) => id.replace(/^[ABG]\d\d-/, '');
const secs = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

/* ================================================================ board */

export function Board({ ui, act }: { ui: Ui; act: Actions }) {
  const services = useServices();
  const tier = services.session.tier.value;
  const t2ok = services.clearance.satisfies('T2');
  const [t2, setT2] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (!t2ok || t2) return;
    loadCanonT2()
      .then(setT2)
      .catch(() => undefined);
  }, [t2ok]);
  const sd = siteDoors(ui.site);
  if (!sd) {
    return (
      <ErrorState
        code="DR-ERR-0404"
        title="No door board"
        body={`No door board is held for ${ui.site}. Sites not on the plant network carry no door records.`}
      />
    );
  }
  const leafIds = new Set(sd.airlocks.flatMap((a) => [a.outer, a.inner]));
  const held = new Set(heldOpen(ui.site, ui.state, ui.now));
  const holds = drillHolds(ui.drill, ui.site);
  const rows: MimicLevelRow[] = levelIndex(ui.site).map((l) => {
    const items: MimicItem[] = [];
    for (const d of sd.doors) {
      if (d.level !== l.n || leafIds.has(d.id)) continue;
      const v = doorView(d, ui.state.doors[d.id], ui.now);
      const rec = ui.state.doors[d.id];
      items.push({
        type: 'door',
        id: d.id,
        tag: tag(d.id),
        kind: d.kind === 'portal' ? 'portal' : 'blast',
        leaf: { frac: v.frac, pos: v.pos },
        alarm: held.has(d.id),
        override: !!rec?.override,
        held: holds && d.sealsOnDrill,
        withheld: d.tier < tier,
        title: `${d.id}, ${d.location}: ${POS_WORD[v.pos]}`,
      });
    }
    for (const a of sd.airlocks) {
      if (a.level !== l.n) continue;
      const o = doorView(doorDef(a.outer)!, ui.state.doors[a.outer], ui.now);
      const i = doorView(doorDef(a.inner)!, ui.state.doors[a.inner], ui.now);
      const ph = airlockPhase(ui.state.airlocks[a.id], ui.now);
      items.push({
        type: 'airlock',
        id: a.id,
        tag: tag(a.id),
        outer: { frac: o.frac, pos: o.pos },
        inner: { frac: i.frac, pos: i.pos },
        chamber: chamberDp(ui.state.airlocks[a.id], ui.now) / DC.pressure.insideDp,
        decon: ph === 'decon',
        alarm: o.pos !== 'closed-locked' && i.pos !== 'closed-locked',
        withheld: a.tier < tier,
        title: `${a.id}, ${a.location}: ${ph.toUpperCase()}`,
      });
    }
    const rx = isRx(l.name) ? rxInfo(l.name) : null;
    const released = rx && rx.key === 'T2' && tier <= 2 ? t2?.[`facilities.${ui.site}.levels.${l.n}.name`] : undefined;
    const name = released ? released.replace(/^Level \d+: /, '') : rx || l.tier < tier ? null : l.name.replace(/^Level \d+: /, '');
    return { n: l.n, name, withheldLen: rx?.len ?? l.name.length, items };
  });

  const tiles = ALARM_TILES.map((t) => ({
    id: t.id,
    legend: t.legend,
    priority: t.priority,
    seq: ui.ann[t.id]?.seq ?? 'normal',
  }));
  const selDoor = ui.sel ? doorDef(ui.sel) : undefined;
  const selAl = ui.sel ? airlockDef(ui.sel) : undefined;
  const selOk = (selDoor && selDoor.tier >= tier) || (selAl && selAl.tier >= tier);

  return (
    <div class="dr-board">
      <div class="dr-board__left">
        <div class="dr-board__top">
          <Annunciator
            tiles={tiles}
            columns={4}
            label={`${ui.site} door board annunciator`}
            test={ui.lampTest}
            reducedMotion={ui.reduced || undefined}
            onAck={(ids) => act.ack(ids)}
            onReset={(ids) => act.reset(ids)}
            onTest={act.test}
          />
          <div class="dr-siteplate">
            <Plate text={[ui.site, ui.own ? 'LOCAL CONTROL' : 'INDICATION ONLY']} variant="dark" size="md" screws />
            <div class="dr-siteplate__rows">
              <StatusWord
                status={ui.stale ? 'OFFLINE' : 'NOMINAL'}
                word={ui.stale ? 'REMOTE INDICATION LOST' : ui.own ? 'BOARD ON LOCAL LAN' : 'REMOTE INDICATION'}
              />
              <StatusWord status={holds ? 'DEGRADED' : 'NOMINAL'} word={holds ? `SEALED: DRILL ${ui.drill?.id ?? ''}` : 'NO DRILL HOLD'} />
              <span class="dr-small">
                {sd.doors.length} doors, {sd.airlocks.length} airlock
                {sd.airlocks.length === 1 ? '' : 's'}. Select a door on the mimic.
              </span>
            </div>
          </div>
        </div>
        <div class="dr-mimic">
          <LevelMimic
            site={ui.site}
            levels={rows}
            selected={ui.sel}
            onSelect={(id) => act.select(id)}
            stale={ui.stale}
            note={ui.stale ? 'REMOTE INDICATION LOST: LAST VALUES' : 'NOT TO SCALE'}
          />
        </div>
      </div>
      <aside class="dr-detail" aria-label="Selected door">
        {selDoor && selOk ? (
          <DoorDetail ui={ui} act={act} def={selDoor} />
        ) : selAl && selOk ? (
          <AirlockDetail ui={ui} act={act} al={selAl} />
        ) : (
          <div class="dr-detail__empty">
            <Plate text="NO DOOR SELECTED" size="sm" />
            <p>Select a door or airlock on the mimic (Tab, then Enter) to show its position, controls and cycle times.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function PositionLamps({ pos }: { pos: string }) {
  return (
    <div class="dr-lamps">
      <Lamp legend="OPEN" lit={pos === 'open'} color="green" size="sm" />
      <Lamp legend="TRAVEL" lit={pos === 'opening' || pos === 'closing' || pos === 'unlocking' || pos === 'seated'} color="amber" size="sm" />
      <Lamp legend="CLOSED" lit={pos === 'seated' || pos === 'closed-locked'} color="white" size="sm" />
      <Lamp legend="LOCKED" lit={pos === 'closed-locked'} color="red" size="sm" />
    </div>
  );
}

function DoorDetail({ ui, act, def }: { ui: Ui; act: Actions; def: DoorDef }) {
  const rec = ui.state.doors[def.id];
  const v = doorView(def, rec, ui.now);
  const remain = v.endsAt ? secs(v.endsAt - ui.now) : 0;
  const ok = act.operable(def.id);
  const held = heldOpen(ui.site, ui.state, ui.now).includes(def.id);
  const openFor = rec && v.pos === 'open' ? secs(ui.now - (rec.steps.find((s) => s.pos === 'open')?.from ?? ui.now)) : 0;
  return (
    <div class="dr-det">
      <Plate text={[def.id, def.location.toUpperCase()]} size="sm" align="left" />
      <div class="dr-det__pos">
        <StatusWord status={held ? 'FAULT' : v.moving ? 'DEGRADED' : v.pos === restingPos(def) ? 'NOMINAL' : 'DEGRADED'} word={POS_WORD[v.pos]} />
        <SegmentDisplay
          value={v.moving ? remain : v.pos === 'open' && def.normal === 'closed' ? openFor : 0}
          digits={4}
          size="sm"
          label={v.moving ? 'S TO STOP' : 'S OPEN'}
        />
      </div>
      <PositionLamps pos={v.pos} />
      <PanelSection title="CONTROL" columns={3}>
        <PushButton
          legend="OPEN"
          label="DOOR"
          color="green"
          size="sm"
          onPress={() => act.commandDoor(def.id, 'open')}
          tag={`${def.id}-O`}
          ariaLabel={`Open ${def.id}`}
        />
        <PushButton
          legend="CLOSE"
          label="DOOR"
          color="red"
          size="sm"
          onPress={() => act.commandDoor(def.id, 'close')}
          tag={`${def.id}-C`}
          ariaLabel={`Close ${def.id}`}
        />
        <PushButton
          legend={rec?.override ? ['CLEAR', 'OVERRIDE'] : ['HOLD', 'OPEN']}
          label="OVERRIDE"
          color="amber"
          size="sm"
          lit={!!rec?.override}
          onPress={() => (rec?.override ? act.clearOverride(def.id) : act.requestHoldOpen(def.id))}
          ariaLabel={rec?.override ? `Clear override on ${def.id}` : `Hold-open override on ${def.id}`}
        />
      </PanelSection>
      {!ok ? <p class="dr-small">Indication only at this workstation. Commands are refused.</p> : null}
      <PropertyGrid
        rows={[
          { label: 'Kind', value: kindWord(def.kind) },
          { label: 'Level', value: String(def.level), mono: true },
          { label: 'Normal', value: POS_WORD[restingPos(def)] },
          { label: 'Cycle', value: `${def.cycleSec} s`, mono: true },
          {
            label: 'Rating',
            value: def.ratedPsi == null ? 'Not rated' : `${def.ratedPsi} psi`,
            mono: true,
          },
          {
            label: 'Seal drill',
            value: def.sealsOnDrill ? 'Closes on drill' : 'Not in drill',
          },
          {
            label: 'Held-open time',
            value: def.normal === 'closed' ? `${DC.motion.heldOpenSec[def.kind]} s` : 'Normally open',
            mono: true,
          },
          {
            label: 'Last command',
            value: rec ? `${rec.cmd.toUpperCase()} by ${opOf(rec.by)}` : 'None this watch',
          },
          {
            label: 'Override',
            value: rec?.override ? `${rec.override.ref}: ${rec.override.reason}` : 'None',
          },
        ]}
      />
    </div>
  );
}

const PHASE_WORD: Record<string, string> = {
  idle: 'IDLE',
  'outer-open': 'OUTER LEAF',
  decon: 'DECON DWELL',
  equalize: 'EQUALIZING',
  'inner-open': 'INNER LEAF',
  fault: 'FAULT',
};

function AirlockDetail({ ui, act, al }: { ui: Ui; act: Actions; al: AirlockDef }) {
  const rec = ui.state.airlocks[al.id];
  const ph = airlockPhase(rec, ui.now);
  const dp = chamberDp(rec, ui.now);
  const P = DC.pressure;
  const o = doorView(doorDef(al.outer)!, ui.state.doors[al.outer], ui.now);
  const i = doorView(doorDef(al.inner)!, ui.state.doors[al.inner], ui.now);
  const end = rec?.steps[rec.steps.length - 1]?.from ?? 0;
  const remain = ph !== 'idle' ? secs(end - ui.now) : 0;
  const ok = act.operable(al.id);
  const decon = !!ui.deconMode[al.id];
  const fixed = (n: number) => Math.round(n * 100) / 100;
  return (
    <div class="dr-det">
      <Plate text={[al.id, al.location.toUpperCase()]} size="sm" align="left" />
      <div class="dr-det__pos">
        <StatusWord status={ph === 'idle' ? 'NOMINAL' : ph === 'fault' ? 'FAULT' : 'DEGRADED'} word={PHASE_WORD[ph] ?? ph.toUpperCase()} />
        <SegmentDisplay value={remain} digits={4} size="sm" label="S TO IDLE" />
      </div>
      <div class="dr-lamps">
        <Lamp legend={['OUTER', 'CLOSED']} lit={o.pos === 'closed-locked'} color="white" size="sm" />
        <Lamp legend={['INNER', 'CLOSED']} lit={i.pos === 'closed-locked'} color="white" size="sm" />
        <Lamp legend="IDLE" lit={ph === 'idle'} color="green" size="sm" />
        <Lamp legend="DECON" lit={ph === 'decon'} color="amber" size="sm" />
      </div>
      <PanelSection title={['CHAMBER', P.unit]} columns={1}>
        <BarMeter label="CHAMBER" value={fixed(dp)} min={0} max={P.meterMax} unit={P.unit} digits={2} segments={20} length={180} readout />
        <BarMeter
          label="ACROSS OUTER"
          value={fixed(Math.abs(dp))}
          min={0}
          max={P.meterMax}
          unit={P.unit}
          digits={2}
          segments={20}
          length={180}
          readout
          warn={P.leafOpenMaxDp}
        />
        <BarMeter
          label="ACROSS INNER"
          value={fixed(Math.abs(P.insideDp - dp))}
          min={0}
          max={P.meterMax}
          unit={P.unit}
          digits={2}
          segments={20}
          length={180}
          readout
          warn={P.leafOpenMaxDp}
        />
        <span class="dr-small">
          Leaf permissive at {P.leafOpenMaxDp.toFixed(2)} {P.unit} or less. Shelter held at {P.insideDp.toFixed(2)} {P.unit} above outside.
        </span>
      </PanelSection>
      <PanelSection title="CYCLE" columns={3}>
        <PushButton
          legend={['CYCLE', 'IN']}
          label="AIRLOCK"
          color="green"
          size="sm"
          onPress={() => act.cycleAirlock(al.id, 'in')}
          ariaLabel={`Cycle ${al.id} inbound`}
        />
        <PushButton
          legend={['CYCLE', 'OUT']}
          label="AIRLOCK"
          color="green"
          size="sm"
          onPress={() => act.cycleAirlock(al.id, 'out')}
          ariaLabel={`Cycle ${al.id} outbound`}
        />
        <PushButton
          legend={['DECON', 'BYPASS']}
          label="OVERRIDE"
          color="amber"
          size="sm"
          disabled={al.deconSec == null}
          onPress={() => act.bypassDecon(al.id)}
          ariaLabel={`Decon bypass ${al.id}`}
        />
      </PanelSection>
      <PanelSection title="MODE AND INTERLOCK" columns={2} gap={28}>
        <SelectorSwitch
          label="MODE"
          positions={al.deconSec == null ? ['NORM'] : ['NORM', 'DECON']}
          value={decon ? 1 : 0}
          onChange={(n) => act.setDecon(al.id, n === 1)}
          tag={`${al.id}-MS`}
        />
        <KeySwitch
          label="INTERLOCK"
          positions={['NORM', 'BYP']}
          value={0}
          keyPresent={false}
          keyNo={`${DC.bypassKeyPrefix}-${al.id}`}
          onLocked={() => act.bypassAttempt(al)}
        />
      </PanelSection>
      {!ok ? <p class="dr-small">Indication only at this workstation. Commands are refused.</p> : null}
      <PropertyGrid
        rows={[
          {
            label: 'Outer leaf',
            value: `${al.outer} ${POS_WORD[o.pos]}`,
            mono: true,
          },
          {
            label: 'Inner leaf',
            value: `${al.inner} ${POS_WORD[i.pos]}`,
            mono: true,
          },
          { label: 'Cycle', value: `${al.cycleSec} s`, mono: true },
          {
            label: 'Decon dwell',
            value: al.deconSec == null ? 'No decon (platform airlock)' : `${al.deconSec} s, inbound only`,
            mono: true,
          },
          {
            label: 'Chamber',
            value: `${DC.airlock.maxPersons} persons per cycle`,
            mono: true,
          },
          {
            label: 'Last cycle',
            value: rec ? `${rec.dir === 'in' ? 'IN' : 'OUT'}${rec.decon ? ' DECON' : ''} by ${opOf(String(rec.by))}` : 'None this watch',
          },
        ]}
      />
    </div>
  );
}

/* ================================================================ cycle log */

export function LogView({ ui, act }: { ui: Ui; act: Actions }) {
  const rows = logRows(ui.state, [ui.logSite], ui.nowIso).filter((r) => r.at <= Date.parse(ui.nowIso) || !r.seeded);
  const visible = rows.filter((r) => r.at <= Date.parse(ui.nowIso));
  const tier = useServices().session.tier.value;
  const selRow = visible.find((r) => r.key === ui.logSel) ?? null;
  const cols: Column<LogRow>[] = [
    {
      key: 'day',
      header: 'Date',
      width: 96,
      mono: true,
      sortValue: (r) => r.at,
      render: (r) => dayOf(r.atIso),
    },
    {
      key: 'time',
      header: 'Time',
      width: 130,
      mono: true,
      sortValue: (r) => r.at,
      render: (r) => zl(r.atIso, r.site),
    },
    { key: 'door', header: 'Door', width: 90, mono: true },
    {
      key: 'level',
      header: 'Lvl',
      width: 40,
      mono: true,
      align: 'right',
      render: (r) => (r.level == null ? '' : String(r.level)),
    },
    { key: 'event', header: 'Event', width: 160 },
    { key: 'by', header: 'Source', width: 110 },
    {
      key: 'count',
      header: 'Count',
      width: 54,
      align: 'right',
      mono: true,
      render: (r) => (r.count == null ? '' : String(r.count)),
    },
    { key: 'note', header: 'Note', wrap: true },
  ];
  const withheld = (r: LogRow) => {
    const d = doorDef(r.door) ?? airlockDef(r.door);
    return d ? d.tier < tier : false;
  };
  const shown = visible.filter((r) => !withheld(r));
  return (
    <div class="dr-log">
      <div class="dr-log__head">
        {ui.rules.logs.length > 1 ? (
          <Select label="Cycle log for" value={ui.logSite} options={ui.rules.logs.map((s) => ({ value: s, label: s }))} onChange={act.setLogSite} width={16} />
        ) : (
          <Plate text={`${ui.logSite} CYCLE LOG`} size="sm" />
        )}
        <span class="dr-small">
          {shown.length} entries, last {DC.logRetentionDays} days. Times Zulu
          {DC.localZones.some((z) => z.facility === ui.logSite) ? ' with site local' : ''}.
          {visible.length > shown.length ? ` ${visible.length - shown.length} entries for doors above your access determination are not listed.` : ''}
        </span>
      </div>
      <div class="dr-log__split">
        <DataTable
          columns={cols}
          rows={shown}
          rowKey={(r) => r.key}
          label={`${ui.logSite} door cycle log, ${shown.length} entries`}
          selection="single"
          selected={ui.logSel ? [ui.logSel] : []}
          onSelectionChange={(k) => act.setLogSel(k[0] ?? null)}
          sortRows={false}
          dense
          zebra
        />
        <aside class="dr-log__detail" aria-label="Log entry">
          {selRow ? <LogDetail row={selRow} act={act} /> : <p class="dr-small">Select an entry to see the door record it refers to.</p>}
        </aside>
      </div>
    </div>
  );
}

function LogDetail({ row, act }: { row: LogRow; act: Actions }) {
  const known = onBoard(row.door);
  const d = doorDef(row.door) ?? airlockDef(row.door);
  const sd = siteDoors(row.site);
  const inIndex = row.level == null ? true : levelIndex(row.site).some((l) => l.n === row.level);
  if (known && d) {
    return (
      <div class="dr-det">
        <Plate text={[row.door, d.location.toUpperCase()]} size="sm" align="left" />
        <PropertyGrid
          rows={[
            { label: 'Site', value: row.site, mono: true },
            { label: 'Level', value: String(d.level), mono: true },
            { label: 'Event', value: row.event },
            {
              label: 'Time',
              value: `${dayOf(row.atIso)} ${zl(row.atIso, row.site)}`,
              mono: true,
            },
            { label: 'Source', value: row.by },
            ...(row.count != null
              ? [
                  {
                    label: 'Persons counted',
                    value: String(row.count),
                    mono: true,
                  },
                ]
              : []),
            ...(row.note ? [{ label: 'Note', value: row.note }] : []),
          ]}
        />
      </div>
    );
  }
  if (!sd || row.door === row.site) {
    return (
      <div class="dr-det">
        <Plate text={[row.site, row.event]} size="sm" align="left" />
        <PropertyGrid
          rows={[
            {
              label: 'Time',
              value: `${dayOf(row.atIso)} ${zl(row.atIso, row.site)}`,
              mono: true,
            },
            { label: 'Source', value: row.by },
            ...(row.note ? [{ label: 'Note', value: row.note }] : []),
          ]}
        />
      </div>
    );
  }
  return (
    <div class="dr-det">
      <Plate text={[row.door, 'NO DOOR RECORD']} size="sm" align="left" variant="warning" />
      <p>
        No door record is held for <span class="mono">{row.door}</span> on the {row.site} board.
        {row.level != null && !inIndex ? ` Level ${row.level} is not in the ${row.site} level index.` : ''}
      </p>
      <PropertyGrid
        rows={[
          { label: 'Event', value: row.event },
          {
            label: 'Time',
            value: `${dayOf(row.atIso)} ${zl(row.atIso, row.site)}`,
            mono: true,
          },
          { label: 'Source', value: row.by },
          ...(row.count != null
            ? [
                {
                  label: 'Persons counted',
                  value: String(row.count),
                  mono: true,
                },
              ]
            : []),
        ]}
      />
      <PushButton
        legend={['REQUEST', 'RECORD']}
        label="DOOR RECORD"
        size="sm"
        color="white"
        onPress={() => act.requestRecord(row.door, row.site, row.level)}
        ariaLabel={`Request door record for ${row.door}`}
      />
    </div>
  );
}

/* ================================================================ overrides */

export function OverridesView({ ui, act }: { ui: Ui; act: Actions }) {
  const sites = Array.from(new Set([...ui.rules.boards, ...ui.rules.logs]));
  const list = Object.entries(ui.state.doors)
    .filter(([id, r]) => r.override && sites.includes(doorSite(id) ?? ''))
    .map(([id, r]) => ({ id, r }));
  const recent = ui.state.log
    .filter((l) => (l.event === 'OVERRIDE' || l.event === 'OVERRIDE CLEARED' || l.event === 'INTERLOCK BYPASS ATTEMPT') && sites.includes(l.site))
    .slice(-30)
    .reverse();
  return (
    <div class="dr-ovr">
      <Plate text="OVERRIDES IN FORCE" size="sm" />
      {list.length ? (
        <table class="dr-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Door</th>
              <th>Kind</th>
              <th>Entered</th>
              <th>By</th>
              <th>Reason</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map(({ id, r }) => (
              <tr key={id}>
                <td class="mono">{r.override!.ref}</td>
                <td class="mono">{id}</td>
                <td>{r.override!.kind.replace('-', ' ').toUpperCase()}</td>
                <td class="mono">{zl(r.override!.atIso, doorSite(id) ?? '')}</td>
                <td>{opOf(r.override!.by)}</td>
                <td>{r.override!.reason}</td>
                <td>
                  <button type="button" class="dr-linkbtn" onClick={() => act.clearOverride(id)}>
                    Clear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="dr-small">No overrides in force on the boards this workstation displays.</p>
      )}
      <Plate text="OVERRIDE AND BYPASS RECORD" size="sm" />
      {recent.length ? (
        <table class="dr-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Site</th>
              <th>Door</th>
              <th>Event</th>
              <th>Operator</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((l) => (
              <tr key={`${l.at}-${l.door}-${l.event}`}>
                <td class="mono">{dayOf(l.atIso)}</td>
                <td class="mono">{zl(l.atIso, l.site)}</td>
                <td class="mono">{l.site}</td>
                <td class="mono">{l.door}</td>
                <td>{l.event}</td>
                <td>{opOf(String(l.by))}</td>
                <td>{l.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="dr-small">No overrides or bypass attempts recorded this period.</p>
      )}
    </div>
  );
}

/* ================================================================ documents */

const SLOTS = {
  ScanPage: ScanPage as never,
  MarkingStrip,
  Seal,
  Stamp: Stamp as never,
};

type Load = { state: 'loading' } | { state: 'ready'; doc: DocJson } | { state: 'failed' };

export function DocPane({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const logged = useRef(new Set<string>());
  const tier = services.session.tier.value;
  useEffect(() => {
    let live = true;
    setLoad({ state: 'loading' });
    services.docs
      .load(entry.id)
      .then((doc) => {
        if (!live) return;
        setLoad({ state: 'ready', doc });
        if (!logged.current.has(doc.docNo)) {
          logged.current.add(doc.docNo);
          services.audit.log('doc.read', doc.docNo);
        }
      })
      .catch(() => live && setLoad({ state: 'failed' }));
    return () => {
      live = false;
    };
  }, [entry.id, tier]);
  if (load.state === 'loading') {
    return (
      <div class="dr-doc" role="status">
        <p>
          Retrieving <span class="mono">{entry.docNo}</span> from the document store.
        </p>
        <ProgressBar label={`Retrieving ${entry.docNo}`} />
      </div>
    );
  }
  if (load.state === 'failed') {
    return (
      <ErrorState
        code="DS-ERR-0410"
        title="Record copy not available"
        body={`The record copy of ${entry.docNo} could not be retrieved from the document store on this workstation. Reopen it later.`}
      />
    );
  }
  return (
    <div class="dr-doc">
      <DocumentView
        doc={load.doc}
        markings={MARKINGS}
        slots={SLOTS}
        onNavigate={(r) => services.openRoute(r)}
        onRedactionHover={() => services.audit.log('redaction.hover', load.doc.docNo)}
      />
    </div>
  );
}
