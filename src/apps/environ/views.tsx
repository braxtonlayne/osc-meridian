/**
 * Environmental Control views. Every control is from @graphics/panel; this file only lays the
 * hardware out and words it.
 */
import { useState } from 'preact/hooks';
import type { Services } from '@core/contracts';
import {
  Annunciator,
  ArcMeter,
  BarMeter,
  EdgewiseMeter,
  KeySwitch,
  Lamp,
  PanelFrame,
  PanelSection,
  Plate,
  PushButton,
  SegmentDisplay,
  SelectorSwitch,
  type AnnPoint,
} from '@graphics/panel';
import { Button, formatOscDate } from '@design/index';
import { AirMimic } from './Mimic';
import { Trend } from './Trend';
import { EC, LEVEL_NAMES, POSTED, TIME_SCALE, type PlantView } from './plant';
import { plantHours, scrubberEquilibrium, sealedRise, trainRemoval, type LoadBalance } from './model';
import type { FilterBankId, ScrubberMode } from './types';
import { TILES, zl, type Role } from './common';

export interface Ctl {
  services: Services;
  role: Role;
  pv: PlantView;
  ann: Record<string, AnnPoint>;
  lampTest: boolean;
  isolated: boolean;
  frozen: boolean;
  ages: Record<FilterBankId, number>;
  latched: boolean;
  narrow: boolean;
  balance: LoadBalance | 'none' | null;
  setFan(id: string, i: number): void;
  setMakeup(i: number): void;
  setScrubber(id: string, m: ScrubberMode): void;
  setFiltration(m: 'normal' | 'cbrn'): void;
  setBank(b: FilterBankId): void;
  setOverride(on: boolean): void;
  resetSeal(): void;
  tryFilterChange(b: FilterBankId): void;
  ackAll(ids?: string[]): void;
  resetAll(ids?: string[]): void;
  setLampTest(on: boolean): void;
  runBalance(): void;
  sign(): void;
  keyLocked(): void;
}

const MODES: ScrubberMode[] = ['off', 'auto', 'adsorb', 'regen'];
const MODE_POS = MODES.map((m) => m.toUpperCase());
const ro = (c: Ctl) => c.role !== 'operator';

function MonitorPlate({ c }: { c: Ctl }) {
  if (c.role === 'operator') return null;
  return (
    <div class="env-remote" role="note">
      <Plate text={c.frozen ? ['REMOTE MONITOR', 'LINK DOWN: DATA HELD'] : ['REMOTE MONITOR', 'DISPLAY ONLY']} variant={c.frozen ? 'warning' : 'dark'} size="sm" />
      <span>
        {c.frozen
          ? `The remote link to ${EC.site} is down while the network is isolated. Readings are held at ${zl(c.pv.at)}.`
          : `Readings from the ${EC.site} environmental control panel. Controls are operated at the site.`}
      </span>
    </div>
  );
}

function Ann({ c, columns = 4 }: { c: Ctl; columns?: number }) {
  const tiles = TILES.map((t) => ({ id: t.id, legend: t.legend, priority: t.priority, seq: c.ann[t.id]?.seq ?? 'normal' }));
  return (
    <Annunciator
      tiles={tiles}
      columns={c.narrow ? 2 : columns}
      label="ENVIRONMENTAL ANNUNCIATOR"
      test={c.lampTest}
      tileWidth={c.narrow ? 120 : 92}
      reducedMotion={c.services.settings.reducedMotion.value || undefined}
      onAck={(ids) => c.ackAll(ids)}
      onReset={(ids) => c.resetAll(ids)}
      onTest={(on) => c.setLampTest(on)}
    />
  );
}

function Atmosphere({ c }: { c: Ctl }) {
  const { plant } = c.pv;
  const L = EC.limits;
  return (
    <PanelSection title="SITE ATMOSPHERE" columns={c.narrow ? 2 : 3}>
      <ArcMeter label="CO2" value={Math.round(plant.co2Ppm)} min={0} max={L.co2Alarm * 1.2} unit="ppm" warn={L.co2Warn} alarm={L.co2Alarm} tag="AIT-CO2" />
      <EdgewiseMeter label="O2" value={Math.round(plant.o2Pct * 100) / 100} min={17} max={22} unit="%" warn={{ lo: L.o2Low }} alarm={{ lo: L.o2LowLow }} tag="AIT-O2" digits={2} />
      <EdgewiseMeter
        label="OVERPRESS"
        value={Math.round(plant.overpressure * 100) / 100}
        min={0}
        max={EC.filtration.overpressureFull * 1.2}
        unit="in. w.g."
        warn={c.pv.state.controls.filtration.mode === 'cbrn' ? { lo: EC.filtration.overpressureTarget } : undefined}
        alarm={c.pv.state.controls.filtration.mode === 'cbrn' ? { lo: EC.filtration.overpressureLow } : undefined}
        tag="PDIT-01"
        digits={2}
      />
    </PanelSection>
  );
}

function AirHandling({ c }: { c: Ctl }) {
  const st = c.pv.state;
  return (
    <PanelSection title="AIR HANDLING" columns={EC.ahus.length}>
      {EC.ahus.map((a) => (
        <div class="env-stack" key={a.id}>
          <SelectorSwitch positions={EC.fanSpeeds.map((f) => f.pos)} value={st.controls.ahu[a.id] ?? 0} label={[a.id, 'FAN SPEED']} tag={a.tag} disabled={ro(c)} onChange={(i) => c.setFan(a.id, i)} />
          <Lamp legend={[a.id, 'RUNNING']} lit={(st.controls.ahu[a.id] ?? 0) > 0} color="red" size="sm" />
        </div>
      ))}
    </PanelSection>
  );
}

function MakeupAir({ c }: { c: Ctl }) {
  const st = c.pv.state;
  const { r, plant } = c.pv;
  return (
    <PanelSection title="MAKEUP AIR" columns={c.narrow ? 2 : 3}>
      <SelectorSwitch positions={EC.makeup.positions.map((p) => p.id)} value={st.controls.makeup} label={[EC.makeup.tag, 'DAMPER']} tag={`HS-${EC.makeup.tag}`} disabled={ro(c)} onChange={c.setMakeup} />
      <KeySwitch
        positions={['NORMAL', 'OVERRIDE']}
        value={st.controls.sealOverride ? 1 : 0}
        label={['SEAL', 'OVERRIDE']}
        keyNo="K-G08-04"
        keyPresent={!ro(c)}
        removableAt={[0]}
        tag="HS-SOV-1"
        onChange={(i) => c.setOverride(i === 1)}
        onLocked={c.keyLocked}
      />
      <div class="env-stack">
        <Lamp legend={['SEAL', 'SIGNAL']} lit={r.seal} color="amber" size="sm" />
        <Lamp legend={['CLOSED BY', 'SEAL']} lit={r.makeupClosedBySeal} color="amber" size="sm" />
        <Lamp legend={['AIR', 'ADMITTED']} lit={r.makeupM3h > 0} color="green" size="sm" />
        <PushButton legend={['RESET', 'CLOSURE']} color="white" lit={plant.sealLatched && !r.seal} onPress={c.resetSeal} tag="PB-SCR-1" />
      </div>
      <SegmentDisplay value={Math.round(r.makeupM3h)} digits={4} label="MAKEUP M3/H" />
    </PanelSection>
  );
}

export function PanelView({ c }: { c: Ctl }) {
  const { pv } = c;
  return (
    <div class="env-scroll">
      <MonitorPlate c={c} />
      <PanelFrame title={['ENVIRONMENTAL CONTROL', `${EC.site} AIR REVITALIZATION`]} panelNo={EC.panelNo} columns={c.narrow ? '1fr' : 'auto auto'} gap={16}>
        <PanelSection title="ANNUNCIATOR" span={c.narrow ? 1 : 2}>
          <Ann c={c} columns={8} />
        </PanelSection>
        <PanelSection title="AIR PATH" span={c.narrow ? 1 : 2}>
          <div class="env-mimicwrap">
            <AirMimic controls={pv.state.controls} plant={pv.plant} r={pv.r} />
          </div>
        </PanelSection>
        <Atmosphere c={c} />
        <AirHandling c={c} />
        <MakeupAir c={c} />
        <PanelSection title="OCCUPANCY BASIS" columns={2}>
          <SegmentDisplay value={POSTED} digits={3} label="POSTED STAFF" />
          <SegmentDisplay value={Math.round(pv.r.removalM3h * 1000)} digits={4} label="SCRUB L/H CO2" />
        </PanelSection>
      </PanelFrame>
    </div>
  );
}

export function ScrubberView({ c }: { c: Ctl }) {
  const { pv } = c;
  const st = pv.state;
  return (
    <div class="env-scroll">
      <MonitorPlate c={c} />
      <PanelFrame title={['CO2 SCRUBBER TRAINS', 'SWING BED, REGENERABLE']} panelNo={EC.panelNo} columns={c.narrow ? '1fr' : 'auto auto'} gap={16}>
        {EC.scrubbers.trains.map((t) => {
          const tr = pv.plant.trains[t.id] ?? { phase: 'off' as const, loading: 0, regenLeft: 0 };
          const removal = tr.phase === 'adsorb' ? trainRemoval(EC, tr.loading, pv.plant.co2Ppm, pv.r.fanFactor) : 0;
          return (
            <PanelSection key={t.id} title={`TRAIN ${t.id}`} columns={c.narrow ? 2 : 3}>
              <SelectorSwitch positions={MODE_POS} value={MODES.indexOf(st.controls.scrubbers[t.id] ?? 'off')} label={[t.id, 'MODE']} tag={t.tag} disabled={ro(c)} onChange={(i) => c.setScrubber(t.id, MODES[i] ?? 'off')} />
              <div class="env-stack">
                <Lamp legend="ADSORB" lit={tr.phase === 'adsorb'} color="green" size="sm" />
                <Lamp legend="REGEN" lit={tr.phase === 'regen'} color="amber" size="sm" />
                <Lamp legend="STANDBY" lit={tr.phase === 'standby'} color="white" size="sm" />
              </div>
              <div class="env-stack">
                <SegmentDisplay value={Math.ceil(tr.regenLeft / 60)} digits={3} label="REGEN MIN LEFT" />
                <SegmentDisplay value={Math.round(removal * 1000)} digits={4} label="REMOVAL L/H" />
              </div>
              <BarMeter label="BED LOADING" value={Math.round(tr.loading * 100)} min={0} max={100} unit="%" warn={EC.scrubbers.autoRegenAt * 100} alarm={99} length={c.narrow ? 140 : 200} />
            </PanelSection>
          );
        })}
        <PanelSection title="SITE CO2" span={c.narrow ? 1 : 2} columns={c.narrow ? 1 : 2}>
          <ArcMeter label="CO2" value={Math.round(pv.plant.co2Ppm)} min={0} max={EC.limits.co2Alarm * 1.2} unit="ppm" warn={EC.limits.co2Warn} alarm={EC.limits.co2Alarm} tag="AIT-CO2" />
          <dl class="env-dl">
            <dt>Scrubber air from</dt>
            <dd>{EC.zones.reduce((b, z) => (z.personShare > b.personShare ? z : b), EC.zones[0]!).ahu} return (fan factor {pv.r.fanFactor.toFixed(2)})</dd>
            <dt>Regeneration</dt>
            <dd>
              {EC.scrubbers.regenMin} plant minutes; AUTO regenerates at {Math.round(EC.scrubbers.autoRegenAt * 100)}% loading
            </dd>
            <dt>Equilibrium at posted strength, sealed</dt>
            <dd>
              one train {Math.round(scrubberEquilibrium(EC, POSTED, 1))} ppm, two trains {Math.round(scrubberEquilibrium(EC, POSTED, 2))} ppm
            </dd>
            <dt>Rate of rise, no scrubber, sealed</dt>
            <dd>{Math.round(sealedRise(EC, POSTED))} ppm per plant hour at posted strength</dd>
          </dl>
        </PanelSection>
      </PanelFrame>
    </div>
  );
}

export function FiltrationView({ c }: { c: Ctl }) {
  const { pv } = c;
  const st = pv.state;
  const banks: FilterBankId[] = ['A', 'B'];
  return (
    <div class="env-scroll">
      <MonitorPlate c={c} />
      <PanelFrame title={['FILTRATION', 'CBRN COLLECTIVE PROTECTION']} panelNo={EC.panelNo} columns={c.narrow ? '1fr' : 'auto auto auto'} gap={16}>
        <PanelSection title="MODE" columns={2}>
          <SelectorSwitch positions={['NORMAL', 'CBRN']} value={st.controls.filtration.mode === 'cbrn' ? 1 : 0} label={['FILTRATION', 'MODE']} tag="HS-FLT-1" disabled={ro(c)} onChange={(i) => c.setFiltration(i ? 'cbrn' : 'normal')} />
          <SelectorSwitch positions={['BANK A', 'BANK B']} value={st.controls.filtration.bank === 'A' ? 0 : 1} label={['FILTER', 'BANK']} tag="HS-FLT-2" disabled={ro(c)} onChange={(i) => c.setBank(i ? 'B' : 'A')} />
          <Lamp legend={['CBRN', 'MODE']} lit={st.controls.filtration.mode === 'cbrn'} color="amber" size="sm" />
          <SegmentDisplay value={Math.round(pv.r.makeupM3h)} digits={4} label="FILTERED M3/H" />
        </PanelSection>
        <PanelSection title="OVERPRESSURE" columns={1}>
          <EdgewiseMeter
            label="SITE TO ATMOS"
            value={Math.round(pv.plant.overpressure * 100) / 100}
            min={0}
            max={EC.filtration.overpressureFull * 1.2}
            unit="in. w.g."
            warn={{ lo: EC.filtration.overpressureTarget }}
            alarm={{ lo: EC.filtration.overpressureLow }}
            tag="PDIT-01"
            digits={2}
          />
          <p class="env-note">Target {EC.filtration.overpressureTarget.toFixed(2)} in. w.g. in CBRN mode. Low alarm {EC.filtration.overpressureLow.toFixed(2)}.</p>
        </PanelSection>
        {banks.map((b) => {
          const dp = pv.r.bankDp[b];
          const age = c.ages[b];
          const due = age > EC.filtration.cycleDays;
          return (
            <PanelSection key={b} title={`BANK ${b}`} columns={1}>
              <BarMeter label="PRE-FILTER DP" value={Math.round(dp * 100) / 100} min={0} max={EC.filtration.dpChangeAt * 1.5} unit="in. w.g." warn={EC.filtration.dpChangeAt * 0.9} alarm={EC.filtration.dpChangeAt} length={c.narrow ? 140 : 170} digits={2} />
              <dl class="env-dl">
                <dt>Last change</dt>
                <dd>
                  {formatOscDate(st.filters[b].lastChange)} ({age} days)
                </dd>
                <dt>Lot</dt>
                <dd class="mono">{st.filters[b].lot}</dd>
                <dt>Cycle</dt>
                <dd>
                  {EC.filtration.cycleDays} days (seal-capable zones); change at {EC.filtration.dpChangeAt.toFixed(1)} in. w.g.
                </dd>
              </dl>
              <Lamp legend={['CHANGE', 'DUE']} lit={due || dp >= EC.filtration.dpChangeAt} color="amber" size="sm" />
              <Button onClick={() => c.tryFilterChange(b)}>Record change on bank {b}...</Button>
            </PanelSection>
          );
        })}
      </PanelFrame>
    </div>
  );
}

const SERIES = [
  { id: 'co2', label: 'CO2', unit: 'ppm' },
  { id: 'o2', label: 'O2', unit: '%' },
  { id: 't', label: 'Temperature', unit: 'deg C' },
  { id: 'rh', label: 'Humidity', unit: '% RH' },
  { id: 'op', label: 'Overpressure', unit: 'in. w.g.' },
] as const;


export function ZonesView({ c }: { c: Ctl }) {
  const { pv } = c;
  const [sel, setSel] = useState<(typeof SERIES)[number]['id']>('co2');
  const last = pv.samples[pv.samples.length - 1];
  const x = pv.samples.map((s) => -plantHours((last?.w ?? s.w) - s.w, pv.env));
  const zoneSeries = (pick: (s: (typeof pv.samples)[number], i: number) => number) => EC.zones.map((z, i) => ({ label: `${z.id} ${z.sensor}`, values: pv.samples.map((s) => pick(s, i)) }));
  const def = SERIES.find((s) => s.id === sel)!;
  let series;
  let limits: { value: number; label: string }[] = [];
  if (sel === 'co2') {
    series = [{ label: 'Site', values: pv.samples.map((s) => s.co2) }, ...zoneSeries((s, i) => s.zc[i] ?? s.co2)];
    limits = [{ value: EC.limits.co2Warn, label: 'HIGH' }];
  } else if (sel === 'o2') {
    series = [{ label: 'Site', values: pv.samples.map((s) => s.o2) }];
    limits = [{ value: EC.limits.o2Low, label: 'LOW' }];
  } else if (sel === 't') {
    series = zoneSeries((s, i) => s.zt[i] ?? 0);
    limits = [{ value: EC.limits.tempHigh, label: 'HIGH' }];
  } else if (sel === 'rh') {
    series = zoneSeries((s, i) => s.zh[i] ?? 0);
    limits = [{ value: EC.limits.rhHigh, label: 'HIGH' }];
  } else {
    series = [{ label: 'Site', values: pv.samples.map((s) => s.op) }];
  }
  return (
    <div class="env-scroll">
      <MonitorPlate c={c} />
      <table class="env-table">
        <caption>Zone conditions, {EC.site}</caption>
        <thead>
          <tr>
            <th scope="col">Zone</th>
            <th scope="col">Level</th>
            <th scope="col">Unit</th>
            <th scope="col">Sensor</th>
            <th scope="col" class="num">CO2 ppm</th>
            <th scope="col" class="num">O2 %</th>
            <th scope="col" class="num">Temp deg C</th>
            <th scope="col" class="num">RH %</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {EC.zones.map((z, i) => {
            const co2 = pv.r.zoneCo2[i] ?? 0;
            const t = pv.plant.tempC[i] ?? 0;
            const h = pv.plant.rh[i] ?? 0;
            const bad = co2 >= EC.limits.co2Alarm;
            const warn = co2 >= EC.limits.co2Warn || t >= EC.limits.tempHigh || h >= EC.limits.rhHigh;
            return (
              <tr key={z.id}>
                <td>{z.id}</td>
                <td>
                  {z.level} {LEVEL_NAMES[z.level] ?? ''}
                </td>
                <td>{z.ahu}</td>
                <td class="mono">{z.sensor}</td>
                <td class="num mono">{Math.round(co2)}</td>
                <td class="num mono">{pv.plant.o2Pct.toFixed(2)}</td>
                <td class="num mono">{t.toFixed(1)}</td>
                <td class="num mono">{Math.round(h)}</td>
                <td>
                  <span class={`env-st env-st--${bad ? 'fault' : warn ? 'degraded' : 'nominal'}`} />
                  {bad ? 'ALARM' : warn ? 'HIGH' : 'NORMAL'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div class="env-trendbar" role="radiogroup" aria-label="Trend">
        {SERIES.map((s) => (
          <label key={s.id} class="env-radio">
            <input type="radio" name="env-trend" checked={sel === s.id} onChange={() => setSel(s.id)} /> {s.label}
          </label>
        ))}
        <span class="env-note">
          Last {EC.model.historyHours} plant hours. Plant time runs {TIME_SCALE} times the clock (seal drill timebase).
        </span>
      </div>
      <Trend x={x} series={series} unit={def.unit} height={c.narrow ? 200 : 260} label={`${def.label} trend, last ${EC.model.historyHours} plant hours`} limits={limits} />
    </div>
  );
}

export function HandoverView({ c }: { c: Ctl }) {
  const st = c.pv.state;
  const entries = [...EC.handoverSeed, ...st.handover].slice().reverse();
  const events = st.events.slice().reverse();
  return (
    <div class="env-scroll">
      <MonitorPlate c={c} />
      <div class="env-loghead">
        <h2 class="env-h">Shift handover log, environmental systems, {EC.site}</h2>
        <Button onClick={c.sign}>
          Sign handover log...
        </Button>
      </div>
      <table class="env-table">
        <thead>
          <tr>
            <th scope="col">Signed</th>
            <th scope="col">Watch</th>
            <th scope="col">By</th>
            <th scope="col" class="num">CO2</th>
            <th scope="col" class="num">O2</th>
            <th scope="col">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={`${e.at}-${i}`}>
              <td class="mono">
                {formatOscDate(e.at.slice(0, 10))} {zl(Date.parse(e.at))}
              </td>
              <td>{e.watch}</td>
              <td>{e.by}</td>
              <td class="num mono">{e.co2Ppm}</td>
              <td class="num mono">{e.o2Pct.toFixed(2)}</td>
              <td>
                {e.remarks}
                {'plant' in e && e.plant ? <div class="env-sub">{e.plant}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 class="env-h">Panel event record</h2>
      {events.length === 0 ? (
        <p class="env-note">No operator actions recorded on this panel since the record was opened.</p>
      ) : (
        <table class="env-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Account</th>
              <th scope="col">Event</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={`${e.w}-${i}`}>
                <td class="mono">{zl(e.w)}</td>
                <td>{e.by === 'lifesupport' ? 'ENV WATCH' : e.by.toUpperCase()}</td>
                <td>{e.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function BalanceView({ c }: { c: Ctl }) {
  const b = c.balance;
  return (
    <div class="env-scroll env-balance">
      <MonitorPlate c={c} />
      <h2 class="env-h">CO2 load balance, {EC.site}</h2>
      <p>
        The balance estimates the CO2 generated on site from historian data: the change in stored CO2, plus CO2 carried out by makeup air, plus CO2 taken up by the scrubber trains. Divided by the metabolic rate per person (
        {EC.metabolic.co2M3hPerPerson} m3/h), it gives the occupancy the readings imply. Sensors calibrated {formatOscDate(EC.calibration.date)}, tolerance {EC.calibration.tolerancePpm} ppm.
      </p>
      <Button onClick={c.runBalance}>Compute balance</Button>
      {b === 'none' ? <p class="env-note">Not enough historian data. The balance needs at least {EC.model.loadBalanceMinHours} plant hours.</p> : null}
      {b && b !== 'none' ? (
        <table class="env-table env-table--narrow">
          <tbody>
            <tr>
              <th scope="row">Interval</th>
              <td class="num mono">{b.hours.toFixed(1)} plant h</td>
            </tr>
            <tr>
              <th scope="row">Samples</th>
              <td class="num mono">{b.samples}</td>
            </tr>
            <tr>
              <th scope="row">Mean CO2 generation</th>
              <td class="num mono">{b.generationM3h.toFixed(3)} m3/h</td>
            </tr>
            <tr>
              <th scope="row">Occupancy implied</th>
              <td class="num mono">{b.impliedPersons.toFixed(1)}</td>
            </tr>
            <tr>
              <th scope="row">Occupancy basis (posted staff)</th>
              <td class="num mono">{b.posted}</td>
            </tr>
            <tr>
              <th scope="row">Difference</th>
              <td class="num mono">
                {b.difference >= 0 ? '+' : ''}
                {b.difference.toFixed(1)}
              </td>
            </tr>
            <tr>
              <th scope="row">Result</th>
              <td>
                <span class={`env-st env-st--${b.withinTolerance ? 'nominal' : 'degraded'}`} />
                {b.withinTolerance ? 'WITHIN TOLERANCE' : `OUTSIDE TOLERANCE (${EC.model.loadBalanceTolerancePersons} PERSONS)`}
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
      {b && b !== 'none' && !b.withinTolerance ? (
        <p class="env-note">A difference outside tolerance is to be checked against sensor calibration before it is reported. Record the result in the handover log with the sensor checks made.</p>
      ) : null}
    </div>
  );
}
