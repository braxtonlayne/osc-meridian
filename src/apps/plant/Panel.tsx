/**
 * The control panel itself, drawn entirely with @graphics/panel hardware. The same panel serves
 * the training simulator (operable) and the live remote display (every control refuses).
 */
import {
  Annunciator,
  ArcMeter,
  BarMeter,
  EdgewiseMeter,
  GuardedSwitch,
  KeySwitch,
  Lamp,
  PanelFrame,
  PanelSection,
  PushButton,
  SegmentDisplay,
  SelectorSwitch,
} from '@graphics/panel';
import type { AnnunciatorTile, GuardState } from '@graphics/panel';
import type { AnnId, BankId, DieselSelect, SimMode, SimState } from './types';
import { ANN_HORN, DIESEL_POSITIONS, MODES, electrical, flowFraction, heatRemoval, logPower, pressureMPa } from './model';
import { K, P } from './data';
import type { UnitDef } from './data';

export const ANN_LEGEND: Record<AnnId, readonly string[]> = {
  RX_TRIP: ['REACTOR', 'TRIP'],
  FLUX_HI: ['NEUTRON FLUX', 'HIGH'],
  SUR_HI: ['STARTUP RATE', 'HIGH'],
  PRESS_HI: ['PRI PRESS', 'HIGH'],
  PRESS_LO: ['PRI PRESS', 'LOW'],
  TEMP_HI: ['COOLANT TEMP', 'HIGH'],
  FLOW_LO: ['COOLANT FLOW', 'LOW'],
  ROD_BLOCK: ['ROD WITHDRAWAL', 'BLOCK'],
  TURB_TRIP: ['TURBINE', 'TRIPPED'],
  GEN_OPEN: ['GEN BKR 52-G1', 'OPEN'],
  DG_RUN: ['DIESEL SETS', 'RUNNING'],
  ESS_DEAD: ['ESS BUS', 'UNDERVOLTAGE'],
  ABOVE_LIMIT: ['POWER ABOVE', 'LIMIT'],
  DUMP_OPEN: ['STEAM DUMP', 'OPEN'],
  FW_B_OOS: ['FW PUMP B', 'OUT OF SVC'],
  DRILL: ['SITE SEAL', 'DRILL'],
};

const ANN_ORDER: AnnId[] = [
  'RX_TRIP', 'FLUX_HI', 'SUR_HI', 'ROD_BLOCK',
  'PRESS_HI', 'PRESS_LO', 'TEMP_HI', 'FLOW_LO',
  'TURB_TRIP', 'GEN_OPEN', 'DG_RUN', 'ESS_DEAD',
  'ABOVE_LIMIT', 'DUMP_OPEN', 'FW_B_OOS', 'DRILL',
];

export interface PanelHandlers {
  rod(bank: BankId, dir: 1 | -1 | 0): void;
  mode(m: SimMode): void;
  guard(next: GuardState): void;
  scram(): void;
  scramReset(): void;
  pump(p: 'A' | 'B', on: boolean): void;
  turbineTrip(): void;
  turbineReset(): void;
  genClose(): void;
  genOpen(): void;
  diesel(d: DieselSelect): void;
  ack(ids: string[]): void;
  reset(ids: string[]): void;
  lampTest(on: boolean): void;
  icSelect(i: number): void;
  icLoad(): void;
  freeze(on: boolean): void;
  link(i: number): void;
}

export interface PanelProps {
  unit: UnitDef;
  live: boolean;
  /** Null when there is nothing to show (live link down): instruments read NO DATA. */
  state: SimState | null;
  guard: GuardState;
  lampTest: boolean;
  narrow: boolean;
  reducedMotion: boolean;
  frozen: boolean;
  icIndex: number;
  /** Seconds since the initial condition was loaded. */
  simTime: number;
  /** Live: telemetered values when the link is up. */
  telemetry?: { loadMW: number; hz: number; busKV: number; thermalPct: number | null } | null;
  /** Live: whether the unit's site is in a seal drill. */
  drill?: boolean;
  on: PanelHandlers;
}

const NaNv = Number.NaN;

function simClock(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(Math.min(m, 999)).padStart(2, '0')}.${String(s).padStart(2, '0')}`;
}

export function Panel(p: PanelProps) {
  const { unit, live, state: s, on } = p;
  const k = K;
  const has = !!s;
  const pct = s ? s.n * 100 : NaNv;
  const press = s ? pressureMPa(k, s.tc) : NaNv;
  const flow = s ? flowFraction(k, s) * 100 : NaNv;
  const el = s ? electrical(k, unit.params, s, unit.dgCount) : null;
  const hr = s ? heatRemoval(k, s) : null;
  const tel = p.telemetry ?? null;
  const powerShown = live ? (tel?.thermalPct ?? NaNv) : pct;
  const genMW = live ? (tel && s?.gen ? tel.loadMW : tel ? 0 : NaNv) : s?.gen && hr ? hr.turbine * unit.params.ratedMWe : has ? 0 : NaNv;
  const stationMW = live ? (tel?.loadMW ?? NaNv) : unit.params.stationLoad * unit.params.ratedMWe;

  const tiles: AnnunciatorTile[] = ANN_ORDER.map((id) => {
    const point = s?.ann[id];
    const spare = (id === 'FW_B_OOS' && !unit.params.fwBOos) || (id === 'DRILL' && !live);
    let seq = point?.seq ?? 'normal';
    if (id === 'DRILL') seq = live && p.drill ? 'ack' : 'normal';
    return {
      id,
      legend: spare ? [] : ANN_LEGEND[id],
      seq: spare ? 'normal' : seq,
      priority: id === 'RX_TRIP' || id === 'ESS_DEAD' || id === 'FLUX_HI' ? 'alarm' : ANN_HORN.has(id) ? 'warning' : 'status',
      spare,
    };
  });

  const title = [`${unit.id} REACTOR PLANT`, live ? 'REMOTE DISPLAY, READ ONLY' : 'TRAINING SIMULATOR'];
  const cols = p.narrow ? 1 : 3;
  const modeIdx = s ? MODES.indexOf(s.mode) : 0;
  const dieselIdx = s ? DIESEL_POSITIONS.indexOf(s.diesel) : 1;
  const N = k.rods.steps;
  const powerWarn = Math.min(unit.params.limitPct, k.alarms.fluxHighPct);

  return (
    <PanelFrame title={title} panelNo={`${P.panel.panelNo}  REV ${P.panel.panelRev}  ${unit.id}`} columns={cols} gap={14}>
      <PanelSection title={live ? 'ANNUNCIATOR (REPEAT)' : 'ANNUNCIATOR A'} span={p.narrow ? 1 : 2}>
        <Annunciator
          tiles={tiles}
          columns={p.narrow ? 2 : 4}
          label={`${unit.id} annunciator`}
          test={p.lampTest}
          reducedMotion={p.reducedMotion}
          onAck={on.ack}
          onReset={on.reset}
          onTest={on.lampTest}
        />
      </PanelSection>

      <PanelSection title="REACTOR TRIP" columns={1}>
        <GuardedSwitch
          state={p.guard}
          label={['REACTOR SCRAM', 'MANUAL']}
          plate="danger"
          holdMs={1500}
          tag="HS-RPS-01"
          reducedMotion={p.reducedMotion}
          words={{ actuated: 'SCRAM' }}
          onLift={() => on.guard('lifted')}
          onClose={() => on.guard('closed')}
          onActuate={() => on.scram()}
        />
        <div class="plt-row">
          <Lamp legend={['TRIP', 'SEALED IN']} color="red" lit={!!s?.scrammed} tag="XL-RPS-01" />
          <PushButton legend={['TRIP', 'RESET']} color="black" onPress={on.scramReset} tag="HS-RPS-02" />
        </div>
      </PanelSection>

      <PanelSection title="REACTOR" columns={p.narrow ? 2 : 3}>
        <ArcMeter label="POWER" value={powerShown} min={0} max={P.meters.powerMaxPct} unit="% RTP" warn={powerWarn} alarm={k.trips.fluxHighRunPct} tag="JI-001" />
        <EdgewiseMeter
          label="PRI PRESS"
          value={press}
          min={P.meters.pressureMinMPa}
          max={P.meters.pressureMaxMPa}
          unit="MPa"
          warn={{ lo: k.alarms.pressureLowMPa, hi: k.alarms.pressureHighMPa }}
          alarm={{ lo: k.trips.pressureLowMPa, hi: k.trips.pressureHighMPa }}
          tag="PI-110"
          digits={2}
        />
        <EdgewiseMeter
          label="COOLANT TEMP"
          value={s ? s.tc : NaNv}
          min={P.meters.tempMinC}
          max={P.meters.tempMaxC}
          unit="°C"
          warn={k.alarms.coolantTempHighC}
          alarm={k.trips.coolantTempHighC}
          tag="TI-111"
          digits={1}
        />
        <SegmentDisplay value={s ? logPower(s.n) : '----'} digits={6} label="LOG POWER" ariaLabel="Log power, fraction of rated" />
        <EdgewiseMeter
          label="STARTUP RATE"
          value={s ? s.sur : NaNv}
          min={P.meters.sumMinDpm}
          max={P.meters.sumMaxDpm}
          unit="DPM"
          warn={k.alarms.startupRateDpm}
          alarm={k.trips.startupRateDpm}
          tag="NI-040"
          digits={2}
        />
        <SegmentDisplay value={s ? Math.round(s.tf) : '----'} digits={4} label="FUEL TEMP °C" ariaLabel="Fuel temperature, degrees C" />
      </PanelSection>

      <PanelSection title="CONTROL RODS" columns={2}>
        {(['SD', 'CB'] as const).map((b) => (
          <div class="plt-bank" key={b}>
            <SegmentDisplay value={s ? Math.round(s.rods[b]) : '---'} digits={3} label={`${k.rods.banks.find((x) => x.id === b)?.label ?? b} STEPS`} />
            <div class="plt-row">
              <PushButton legend={[b, 'OUT']} color="white" onPress={() => on.rod(b, 1)} onRelease={() => on.rod(b, 0)} tag={`HS-${b}-W`} ariaLabel={`Withdraw ${b} bank (hold)`} />
              <PushButton legend={[b, 'IN']} color="white" onPress={() => on.rod(b, -1)} onRelease={() => on.rod(b, 0)} tag={`HS-${b}-I`} ariaLabel={`Insert ${b} bank (hold)`} />
            </div>
            <div class="plt-row">
              <Lamp legend={['FULL', 'OUT']} color="white" size="sm" lit={!!s && s.rods[b] >= N - 0.5} />
              <Lamp legend={['ON', 'BOTTOM']} color="green" size="sm" lit={!!s && s.rods[b] <= 0.5} />
            </div>
          </div>
        ))}
        <SelectorSwitch positions={MODES} value={modeIdx} onChange={(i) => on.mode(MODES[i]!)} label="REACTOR MODE" tag="HS-MODE" />
      </PanelSection>

      <PanelSection title="PRIMARY COOLANT" columns={2}>
        {(['A', 'B'] as const).map((pp) => (
          <div class="plt-bank" key={pp}>
            <div class="plt-row">
              <Lamp legend={[`PUMP ${pp}`, 'RUNNING']} color="red" lit={!!s && s.pumps[pp].speed > 0.5} />
              <Lamp legend={[`PUMP ${pp}`, 'STOPPED']} color="green" lit={!!s && s.pumps[pp].speed <= 0.5} />
            </div>
            <div class="plt-row">
              <PushButton legend={[`PUMP ${pp}`, 'START']} color="red" lit={!!s?.pumps[pp].on} onPress={() => on.pump(pp, true)} tag={`HS-RCP-${pp}1`} />
              <PushButton legend={[`PUMP ${pp}`, 'STOP']} color="green" lit={!!s && !s.pumps[pp].on} onPress={() => on.pump(pp, false)} tag={`HS-RCP-${pp}2`} />
            </div>
          </div>
        ))}
        <div class="plt-span2">
          <BarMeter
            label="COOLANT FLOW"
            value={flow}
            min={0}
            max={P.meters.flowMaxPct}
            unit="%"
            warn={{ lo: k.alarms.flowLowFraction * 100 }}
            alarm={{ lo: k.trips.flowLowFraction * 100 }}
            length={p.narrow ? 140 : 180}
            segments={22}
            tag="FI-120"
          />
        </div>
      </PanelSection>

      <PanelSection title="TURBINE-GENERATOR" columns={2}>
        <div class="plt-row">
          <Lamp legend={['TURBINE', 'LATCHED']} color="red" lit={!!s?.turbineLatched} />
          <Lamp legend={['TURBINE', 'TRIPPED']} color="green" lit={!!s && !s.turbineLatched} />
        </div>
        <div class="plt-row">
          <PushButton legend={['TURBINE', 'TRIP']} color="red" onPress={on.turbineTrip} tag="HS-TG-01" />
          <PushButton legend={['TURBINE', 'RESET']} color="black" onPress={on.turbineReset} tag="HS-TG-02" />
        </div>
        <div class="plt-row">
          <Lamp legend={['52-G1', 'CLOSED']} color="red" lit={!!s?.gen} />
          <Lamp legend={['52-G1', 'OPEN']} color="green" lit={!!s && !s.gen} />
        </div>
        <div class="plt-row">
          <PushButton legend={['52-G1', 'SYNC/CLOSE']} color="red" onPress={on.genClose} tag="HS-52G1-C" />
          <PushButton legend={['52-G1', 'OPEN']} color="green" onPress={on.genOpen} tag="HS-52G1-T" />
        </div>
        <SegmentDisplay value={Number.isFinite(genMW) ? genMW : '----'} decimals={2} digits={5} label="GEN OUTPUT MW" />
        <SegmentDisplay value={Number.isFinite(stationMW) ? stationMW : '----'} decimals={2} digits={5} label="STATION LOAD MW" />
      </PanelSection>

      <PanelSection title="ELECTRICAL" columns={2}>
        <SelectorSwitch positions={DIESEL_POSITIONS} value={dieselIdx} onChange={(i) => on.diesel(DIESEL_POSITIONS[i]!)} label="DIESEL SETS" tag="HS-DG" />
        <div class="plt-col">
          <Lamp legend={['DIESEL', 'RUNNING']} color="red" lit={!!el?.dieselRunning} />
          <Lamp legend={['SURFACE', 'SUPPLY']} color="white" lit={!!s && !s.gen} />
        </div>
        <Lamp legend={['ESS BUS E-A', 'LIVE']} color="white" lit={!!el?.essA} showState />
        <Lamp legend={['ESS BUS E-B', 'LIVE']} color="white" lit={!!el?.essB} showState />
        {live && tel ? (
          <>
            <SegmentDisplay value={tel.hz} decimals={2} digits={5} label="FREQ HZ" />
            <SegmentDisplay value={tel.busKV} decimals={3} digits={5} label="ESS BUS KV" />
          </>
        ) : null}
      </PanelSection>

      <PanelSection title="SIMULATOR" columns={2}>
        <SelectorSwitch positions={P.initialConditions.map((x) => x.id)} value={p.icIndex} onChange={on.icSelect} label="INITIAL CONDITION" tag="HS-IC" />
        <div class="plt-col">
          <PushButton legend={['LOAD', 'IC']} color="black" onPress={on.icLoad} tag="HS-IC-L" />
          <PushButton legend={['FREEZE']} mode="latching" pressed={p.frozen} color="amber" lit={p.frozen} onChange={on.freeze} tag="HS-FRZ" />
        </div>
        <SegmentDisplay value={live ? '----' : simClock(p.simTime)} digits={6} label="SIM TIME MIN.SEC" />
        <KeySwitch positions={['SIM', 'LIVE']} value={live ? 1 : 0} onChange={on.link} label="PLANT LINK" keyNo={P.panel.keyNo} removableAt={[0]} tag="KS-LINK" />
      </PanelSection>
    </PanelFrame>
  );
}
