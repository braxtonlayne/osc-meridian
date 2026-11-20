/**
 * Shaft Hoist Control: the tabbed views beside the shaft (call stations, event recorder,
 * shaft data) and the level designation cell shared by them.
 */
import type { JSX } from 'preact';
import { DataTable, PropertyGrid, Redaction, Select, StatusLight } from '@design/index';
import type { Column, RedactionHoverInfo } from '@design/index';
import { Lamp, PushButton } from '@graphics/panel';
import { rxInfo } from '@core/rx';
import type { Hoist } from '@core/canon-types';
import type { AccountDef, AccountId } from '@core/contracts';
import { siteLocal, zulu } from '@core/session';
import { HC, HOISTS, M, accelOf, cageAt, landingAt, levelOf, limits, runSeconds, unitOf, vanes } from './model';
import type { HoistEvent, HoistState, HoistUnit } from './types';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
export const zl = (ms: number): string => `${zulu(new Date(ms))} (${siteLocal(new Date(ms))})`;

/* ------------------------------------------------------------------ level designation */

export interface NameCtx {
  t2: Record<string, string> | null;
  onRxHover: (i: RedactionHoverInfo) => void;
}

/** Level designation without the "Level N:" prefix, or a redaction bar of the withheld length. */
export function LevelName({ facility, n, ctx }: { facility: string; n: number; ctx: NameCtx }): JSX.Element {
  const l = levelOf(facility, n);
  if (!l) return <span class="hst-dim">No level record</span>;
  const rx = rxInfo(l.name);
  if (rx) {
    const released = rx.key === 'T2' ? ctx.t2?.[`facilities.${facility}.levels.${n}.name`] : undefined;
    if (released) return <span>{released.replace(/^Level\s+\d+:\s*/i, '')}</span>;
    const len = Math.max(4, rx.len - `Level ${n}: `.length);
    return <Redaction len={len} auth="SFC" reference="OSC-DIR-0412" onHover={ctx.onRxHover} />;
  }
  return <span>{l.name.replace(/^Level\s+\d+:\s*/i, '')}</span>;
}

/* ------------------------------------------------------------------ call stations */

export interface CallStationsProps {
  h: Hoist;
  unit: HoistUnit;
  now: number;
  canCall: boolean;
  canDrive: boolean;
  sealed: boolean;
  why: string;
  names: NameCtx;
  onCall: (level: number) => void;
  onCancel: () => void;
}

export function CallStations({ h, unit, now, canCall, canDrive, sealed, why, names, onCall, onCancel }: CallStationsProps): JSX.Element {
  const cage = cageAt(unit, now);
  const at = cage.moving ? null : landingAt(h, cage.posFt);
  const stops = [...h.stops];
  return (
    <div class="hst-calls">
      <p class="hst-note">
        One call station per landing. A call is registered with the hoist controller; in AUTOMATIC the cage answers registered calls nearest first, in MANUAL the driver answers them.
        {canCall ? '' : ` ${why}`}
      </p>
      <table class="hst-table" aria-label={`Call stations, ${h.id}`}>
        <thead>
          <tr>
            <th scope="col">Landing</th>
            <th scope="col">Designation</th>
            <th scope="col" class="num hst-opt">Depth (ft)</th>
            <th scope="col">Station</th>
            <th scope="col">Registered</th>
            <th scope="col" class="hst-opt">Landing gate</th>
          </tr>
        </thead>
        <tbody>
          {stops.map((s, i) => {
            const called = unit.calls.includes(s.level);
            const here = at === s.level;
            const portalSealed = sealed && i === 0;
            return (
              <tr class={here ? 'is-here' : undefined}>
                <td class="mono">{String(s.level).padStart(2, '0')}</td>
                <td>
                  <LevelName facility={h.facility} n={s.level} ctx={names} />
                </td>
                <td class="mono num hst-opt">{fmt(s.depthFt)}</td>
                <td>
                  <PushButton legend="CALL" size="sm" color="white" lit={called} ariaLabel={`Call ${h.id} to landing ${s.level}`} onPress={() => onCall(s.level)} />
                </td>
                <td>
                  <Lamp legend={called ? 'CALL' : 'NONE'} lit={called} color="amber" size="sm" showState={false} />
                </td>
                <td class="hst-opt">
                  <StatusLight
                    status={portalSealed ? 'FAULT' : here && unit.gates === 'open' ? 'DEGRADED' : 'NOMINAL'}
                    word={portalSealed ? 'SEALED (DRILL)' : here ? (unit.gates === 'open' ? 'OPEN, CAGE AT LANDING' : 'CLOSED, CAGE AT LANDING') : 'CLOSED'}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {canDrive && (
        <div class="hst-row">
          <PushButton legend={['CANCEL', 'CALLS']} size="sm" color="black" disabled={!unit.calls.length} onPress={onCancel} />
          <span class="hst-dim">Cancels every registered call on {h.id}.</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ event recorder */

export interface RecorderProps {
  state: HoistState;
  site: string;
  scope: 'site' | 'all';
  onScope: (s: 'site' | 'all') => void;
  accounts: AccountDef[];
}

const byLabel = (by: HoistEvent['by'], accounts: AccountDef[]): string =>
  by === 'auto' ? 'AUTOMATIC' : by === 'local' ? 'WINDER HOUSE' : (accounts.find((a) => a.id === (by as AccountId))?.operatorId ?? by);

export function Recorder({ state, site, scope, onScope, accounts }: RecorderProps): JSX.Element {
  const rows = [...state.events].reverse().filter((e) => scope === 'all' || e.hoist.startsWith(site.replace('ALPHA-', 'A')));
  const cols: Column<HoistEvent>[] = [
    { key: 'seq', header: 'Seq', width: 48, mono: true, align: 'right' },
    { key: 'at', header: 'Time', width: 130, mono: true, render: (e) => zl(e.at), sortValue: (e) => e.at },
    { key: 'hoist', header: 'Hoist', width: 64, mono: true },
    { key: 'kind', header: 'Event', width: 70, render: (e) => e.kind.toUpperCase() },
    { key: 'text', header: 'Record', render: (e) => e.text, sortable: false },
    { key: 'by', header: 'Origin', width: 110, mono: true, render: (e) => byLabel(e.by, accounts) },
  ];
  return (
    <div class="hst-rec">
      <div class="hst-row">
        <Select
          label="Show"
          layout="inline"
          value={scope}
          options={[
            { value: 'site', label: `${site} hoists` },
            { value: 'all', label: 'All ALPHA hoists' },
          ]}
          onChange={(v) => onScope(v as 'site' | 'all')}
        />
        <span class="hst-dim">
          Recorder holds the last {M.recorderEvents} events across the network. Times Zulu (site local).
        </span>
      </div>
      {rows.length ? (
        <DataTable columns={cols} rows={rows} rowKey={(e) => String(e.seq)} label={`Hoist event recorder, ${rows.length} events`} />
      ) : (
        <p class="hst-note">No events recorded{scope === 'site' ? ` for ${site} hoists` : ''} since the recorder was last cleared.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ shaft data */

export function ShaftData({ h, state, names }: { h: Hoist; state: HoistState; names: NameCtx }): JSX.Element {
  const v = vanes(h);
  const lim = limits(h);
  const u = unitOf(state, h);
  const rows = [
    { label: 'Hoist', value: `${h.id} ${h.name}`, mono: false },
    { label: 'Rated rope speed', value: `${fmt(h.speedFpm)} fpm`, mono: true },
    { label: 'Acceleration', value: `${h.accelSec} s to rated speed (${accelOf(h).toFixed(2)} ft/s²)`, mono: true },
    { label: 'Creep', value: `${fmt(M.creepFpm)} fpm over the last ${M.creepFt} ft`, mono: true },
    { label: 'Inspection speed', value: `${fmt(Math.min(M.inspectionFpm, h.speedFpm))} fpm`, mono: true },
    { label: 'Cage', value: `${h.cagePersons} persons / ${fmt(h.payloadLb)} lb rated`, mono: true },
    { label: 'Landings in stop list', value: String(h.stops.length), mono: true },
    { label: 'Landing-zone vanes fitted', value: String(v.length), mono: true },
    { label: 'Travel (collar to bottom landing)', value: `${fmt(h.travelFt)} ft`, mono: true },
    { label: 'Final limits', value: `${fmt(lim.top)} ft / ${fmt(lim.bottom)} ft`, mono: true },
    { label: 'Full travel run', value: `${runSeconds(h, h.travelFt).toFixed(0)} s`, mono: true },
    { label: 'Last brake test', value: u.brakeTest ? `${u.brakeTest.date} ${zl(u.brakeTest.at)}: ${u.brakeTest.result}` : 'None on record', mono: false },
  ];
  return (
    <div class="hst-data">
      <PropertyGrid caption={`${h.id} DATA`} rows={rows} />
      <table class="hst-table" aria-label={`Shaft vanes, ${h.id}`}>
        <caption>Landing-zone vanes, collar to sump</caption>
        <thead>
          <tr>
            <th scope="col" class="num">Depth (ft)</th>
            <th scope="col">Landing</th>
            <th scope="col">Designation</th>
            <th scope="col">Remark</th>
          </tr>
        </thead>
        <tbody>
          {v.map((x) => (
            <tr>
              <td class="mono num">{fmt(x.depthFt)}</td>
              <td class="mono">{x.listed && x.level != null ? String(x.level).padStart(2, '0') : '--'}</td>
              <td>{x.level != null ? <LevelName facility={h.facility} n={x.level} ctx={names} /> : <span class="hst-dim">No level record</span>}</td>
              <td>{x.listed ? 'Landing' : 'Vane fitted. No landing in stop list.'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="hst-note">
        Depths are cage floor at the landing sill, from the site level record. Data sheet {HC.docs.dataSheet}; operation under {HC.docs.procedure}.
      </p>
    </div>
  );
}

export function FleetTable({ state, now, onPick }: { state: HoistState; now: number; onPick: (id: string) => void }): JSX.Element {
  return (
    <table class="hst-table" aria-label="ALPHA hoists">
      <caption>ALPHA shaft hoists</caption>
      <thead>
        <tr>
          <th scope="col">Hoist</th>
          <th scope="col">Type</th>
          <th scope="col" class="num">Speed (fpm)</th>
          <th scope="col" class="num">Travel (ft)</th>
          <th scope="col">Mode</th>
          <th scope="col">Cage</th>
        </tr>
      </thead>
      <tbody>
        {HOISTS.map((h) => {
          const u = unitOf(state, h);
          const c = cageAt(u, now);
          const at = landingAt(h, c.posFt);
          return (
            <tr>
              <td class="mono">
                <button type="button" class="hst-link" onClick={() => onPick(h.id)}>
                  {h.id}
                </button>
              </td>
              <td>{h.name}</td>
              <td class="mono num">{fmt(h.speedFpm)}</td>
              <td class="mono num">{fmt(h.travelFt)}</td>
              <td>{u.mode.toUpperCase()}</td>
              <td>
                <StatusLight
                  status={u.trip ? 'FAULT' : c.moving ? 'DEGRADED' : 'NOMINAL'}
                  word={u.trip ? 'TRIPPED' : c.moving ? `RUNNING ${fmt(c.posFt)} FT` : at != null ? `AT LANDING ${at}` : `STOPPED ${fmt(c.posFt)} FT`}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
