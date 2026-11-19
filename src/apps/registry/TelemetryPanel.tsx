/**
 * Facility Registry: telemetry and reactor instruments. Loaded lazily (it carries uPlot via
 * @graphics/reactor), so the register opens without it.
 */
import { Gauge, ReactorOneLine, ReadoutRow, SealStateIndicator, StatusWord, TelemetryChart } from '@graphics/reactor';
import type { Limit } from '@graphics/reactor';
import type { Facility, Reactor } from '@core/canon-types';
import { GroupBox, StatusLight } from '@design/index';
import type { Reading } from '@sim/telemetry.worker';
import { Bar, canon, fmtMonth, type RxAudit } from './shared';
import { inWorldOffsetMs, type TelemetryState } from './telemetry';
import type { Withheld } from './model';

/** Instrument scales and limit flags (engineering dressing for the panel, not canon figures). */
const SCALE = {
  o2: { min: 19, max: 22, warn: { lo: 19.8, hi: 21.5 }, alarm: { lo: 19.5, hi: 22 } },
  co2: { min: 0, max: 2000, warn: 1000, alarm: 1500 },
  temp: { min: 14, max: 30, warn: { lo: 17, hi: 25 }, alarm: { lo: 15, hi: 28 } },
  rh: { min: 10, max: 80, warn: { lo: 30, hi: 60 }, alarm: { lo: 20, hi: 70 } },
  over: { min: 0, max: 60, warn: { lo: 15 }, alarm: { lo: 10 } },
  storage: { min: 0, max: 100, warn: { lo: 60 }, alarm: { lo: 40 } },
  psi: { min: 30, max: 90, warn: { lo: 50, hi: 75 }, alarm: { lo: 45, hi: 80 } },
  hz: { min: 59, max: 61, warn: { lo: 59.8, hi: 60.2 }, alarm: { lo: 59.5, hi: 60.5 } },
} satisfies Record<string, { min: number; max: number; warn: Limit; alarm: Limit }>;

export interface PanelProps {
  f: Facility;
  t: TelemetryState;
  /** Requirement that withholds the reactor identity, or null when it is released. */
  reactorRx: Withheld | null;
  audit: RxAudit;
}

function reactorOf(f: Facility): Reactor | undefined {
  return canon.reactors.find((r) => r.site === f.id);
}

function since(s: number): string {
  const m = Math.floor(s / 60);
  return m < 1 ? 'under 1 min ago' : `${m} min ago`;
}

function sourceRow(r: Reading, p: PanelProps) {
  // Reactor fitting withheld: the source is withheld whatever the simulator reports, so a
  // clear UTILITY SERVICE cannot mark which sites do (or do not) carry a unit.
  if (p.reactorRx) {
    return (
      <div class="reg-readout-rx">
        <span class="reg-readout-rx__label">Power source</span>
        <Bar rx={p.reactorRx} id={`${p.f.id}:power-source`} audit={p.audit} />
      </div>
    );
  }
  const status = r.power.source === 'DIESEL AND SURFACE' ? 'OFFLINE' : 'NOMINAL';
  return <ReadoutRow tag="EP-100" label="Power source" value={r.power.source} status={status} word={status === 'OFFLINE' ? 'UNIT SHUT DOWN' : 'NORMAL'} />;
}

/** Compact readouts for the dossier side panel. */
export function TelemetrySummary(p: PanelProps) {
  const r = p.t.latest;
  if (!r) return <p class="reg-note">{p.t.link === 'NO SIMULATOR' ? 'Telemetry service not available on this workstation.' : 'Awaiting first scan from the site data concentrator.'}</p>;
  const sealed = r.seal.portals.every((x) => x.state === 'SEALED');
  return (
    <div class="reg-readouts">
      {sourceRow(r, p)}
      <ReadoutRow tag="EP-101" label="Station load" value={r.power.loadMW} unit="MW" digits={r.power.loadMW < 1 ? 3 : 2} />
      <ReadoutRow tag="AI-201" label="Oxygen" value={r.air.o2Pct} unit="%" digits={2} />
      <ReadoutRow tag="AI-202" label="Carbon dioxide" value={r.air.co2ppm} unit="ppm" digits={0} />
      <ReadoutRow tag="TI-210" label="Supply air" value={r.air.tempC} unit="C" digits={1} />
      <ReadoutRow tag="LI-301" label="Potable storage" value={r.water.storagePct} unit="%" digits={1} />
      <ReadoutRow
        tag="ZS-401"
        label="Portal seals"
        value={sealed ? 'ALL SEALED' : `${r.seal.portals.filter((x) => x.state !== 'SEALED').length} CYCLING`}
        status={sealed ? 'NOMINAL' : 'DEGRADED'}
        word={sealed ? 'SEALED' : 'CYCLING'}
      />
    </div>
  );
}

/** Full telemetry tab: instruments by system plus two-hour trends. */
export function TelemetryFull(p: PanelProps) {
  const r = p.t.latest;
  if (!r) return <TelemetrySummary {...p} />;
  const rx = reactorOf(p.f);
  const off = inWorldOffsetMs() / 1000;
  const xs = p.t.series.map((s) => s.t + off);
  const ser = (fn: (s: Reading) => number): [number[], number[]] => [xs, p.t.series.map(fn)];
  const loadMax = rx ? rx.electricMWe : Math.max(0.5, Math.ceil(r.power.loadMW * 2 * 10) / 10);
  return (
    <div class="reg-tele">
      <div class="reg-tele__groups">
        <GroupBox title="Electrical">
          <div class="reg-gauges">
            <Gauge tag="EP-101" label="Station load" value={r.power.loadMW} min={0} max={loadMax} unit="MW" warn={loadMax * 0.9} alarm={loadMax} digits={r.power.loadMW < 1 ? 3 : 2} />
            <Gauge tag="SI-102" label="Frequency" kind="dial" value={r.power.hz} {...SCALE.hz} unit="Hz" digits={2} />
          </div>
          {sourceRow(r, p)}
          <ReadoutRow tag="EI-103" label="Essential bus" value={r.power.busKV} unit="kV" digits={3} />
          <ReadoutRow tag="EG-104" label="Diesel sets" value={r.power.diesel} status={r.power.diesel === 'RUNNING' ? 'DEGRADED' : 'NOMINAL'} word={r.power.diesel === 'RUNNING' ? 'CARRYING LOAD' : 'READY'} />
        </GroupBox>
        <GroupBox title="Atmosphere">
          <div class="reg-gauges">
            <Gauge tag="AI-201" label="Oxygen" value={r.air.o2Pct} {...SCALE.o2} unit="%" digits={2} />
            <Gauge tag="AI-202" label="Carbon dioxide" value={r.air.co2ppm} {...SCALE.co2} unit="ppm" digits={0} />
            <Gauge tag="TI-210" label="Supply air" value={r.air.tempC} {...SCALE.temp} unit="C" digits={1} />
            <Gauge tag="MI-211" label="Humidity" value={r.air.rhPct} {...SCALE.rh} unit="%RH" digits={1} />
          </div>
          <ReadoutRow tag="PDI-220" label="Overpressure to portal" value={r.air.overPa} unit="Pa" digits={1} />
          <ReadoutRow tag="PDI-221" label="Filter bank differential" value={r.air.filterDpPa} unit="Pa" digits={0} />
        </GroupBox>
        <GroupBox title="Water">
          <div class="reg-gauges">
            <Gauge tag="LI-301" label="Potable storage" value={r.water.storagePct} {...SCALE.storage} unit="%" digits={1} />
            <Gauge tag="PI-302" label="Supply pressure" value={r.water.supplyPsi} {...SCALE.psi} unit="psig" digits={1} />
          </div>
          <ReadoutRow tag="FI-303" label="Demand" value={r.water.flowGph} unit="gal/h" digits={1} />
        </GroupBox>
        <GroupBox title="Seals">
          <div class="reg-seals">
            {r.seal.portals.map((x) => (
              <SealStateIndicator key={x.tag} state={x.state} label={`${x.tag} ${x.label}`} />
            ))}
          </div>
          <p class="reg-note">Personnel portal last cycled {since(r.seal.lastCycleS)}.</p>
        </GroupBox>
      </div>
      {p.t.series.length > 1 ? (
        <div class="reg-tele__trends">
          <GroupBox title="Trend, last two hours">
            <TelemetryChart
              height={150}
              series={[
                { label: 'STATION LOAD', unit: 'MW', data: ser((s) => s.power.loadMW), digits: 2 },
                { label: 'CO2', unit: 'ppm', data: ser((s) => s.air.co2ppm), digits: 0 },
              ]}
            />
            <TelemetryChart
              height={150}
              series={[
                { label: 'POTABLE STORAGE', unit: '%', data: ser((s) => s.water.storagePct), digits: 1 },
                { label: 'OVERPRESSURE', unit: 'Pa', data: ser((s) => s.air.overPa), digits: 1 },
              ]}
            />
          </GroupBox>
        </div>
      ) : null}
    </div>
  );
}

/** Reactor gauges for the side panel. */
export function ReactorGauges(p: PanelProps) {
  const rx = reactorOf(p.f);
  if (!rx) return null;
  if (p.reactorRx) {
    return (
      <p class="reg-note">
        Unit identity withheld: <Bar rx={p.reactorRx} id={`${p.f.id}:reactor`} audit={p.audit} />
      </p>
    );
  }
  const r = p.t.latest;
  return (
    <div class="reg-rx">
      <div class="reg-rx__head">
        <span class="reg-mono">{rx.id}</span> {rx.designation}
        <StatusLight status={rx.status} />
      </div>
      {r ? (
        <div class="reg-gauges">
          <Gauge tag="JI-001" label="Thermal power" value={r.power.thermalPct ?? 0} min={0} max={100} unit="% rated" warn={90} alarm={100} digits={1} />
          <Gauge tag="EP-101" label="Station load" value={r.power.loadMW} min={0} max={rx.electricMWe} unit="MW" warn={rx.electricMWe * 0.9} alarm={rx.electricMWe} digits={2} />
        </div>
      ) : null}
      <p class="reg-note">{rx.statusNote}</p>
    </div>
  );
}

/** Reactor tab: unit record, live instruments and the station one-line. */
export function ReactorView(p: PanelProps & { onOpenPage?: () => void }) {
  const rx = reactorOf(p.f);
  if (!rx) return null;
  if (p.reactorRx) return <ReactorGauges {...p} />;
  const r = p.t.latest;
  const live = r ? { loadMW: r.power.source === 'REACTOR UNIT' ? r.power.loadMW : undefined } : undefined;
  return (
    <div class="reg-reactor">
      <table class="reg-kv">
        <tbody>
          <tr><th>Unit</th><td class="reg-mono">{rx.id}</td><th>Designation</th><td>{rx.designation}</td></tr>
          <tr><th>Type</th><td colSpan={3}>{rx.type}</td></tr>
          <tr><th>Rating</th><td class="reg-mono">{rx.thermalMWt} MWt / {rx.electricMWe} MWe</td><th>Commissioned</th><td class="reg-mono">{fmtMonth(rx.commissioned)}</td></tr>
          <tr><th>Status</th><td colSpan={3}><StatusWord status={rx.status} /> {rx.statusNote}</td></tr>
        </tbody>
      </table>
      <ReactorGauges {...p} />
      <div class="reg-oneline">
        <ReactorOneLine reactorId={rx.id} live={live?.loadMW ? { loadMW: live.loadMW } : undefined} />
      </div>
    </div>
  );
}
