/**
 * Shaft Hoist Control: the hoist driver's console (panel kit hardware only). Every control is
 * live: a function this workstation may not use answers with an in-world refusal from the app.
 */
import type { JSX } from 'preact';
import {
  Annunciator,
  ArcMeter,
  BarMeter,
  GuardedSwitch,
  KeySwitch,
  Lamp,
  PanelFrame,
  PanelSection,
  PushButton,
  SegmentDisplay,
  ToggleSwitch,
} from '@graphics/panel';
import type { AnnunciatorTile, GuardState } from '@graphics/panel';
import type { Hoist } from '@core/canon-types';
import { M, ftpsToFpm, landingAt, loadLb, zoneAt } from './model';
import type { Authority, CageNow, Interlocks } from './model';
import type { HoistMode, HoistUnit } from './types';

export const MODES: readonly HoistMode[] = ['auto', 'manual', 'inspection'];
const MODE_LEGENDS = ['AUTO', 'MANUAL', 'INSPECT'] as const;

export interface ConsoleHandlers {
  target(level: number): void;
  run(): void;
  stop(): void;
  estop(): void;
  reset(): void;
  mode(m: HoistMode): void;
  modeLocked(): void;
  gates(open: boolean): void;
  load(dPersons: number, dFreight: number): void;
  brake(): void;
  inch(dir: 1 | -1): void;
  inchRelease(): void;
  guard(s: GuardState): void;
  annAck(ids: string[]): void;
  annReset(ids: string[]): void;
  annTest(on: boolean): void;
}

export interface ConsoleProps {
  h: Hoist;
  unit: HoistUnit;
  cage: CageNow;
  il: Interlocks;
  auth: Authority;
  sealed: boolean;
  target: number | null;
  guard: GuardState;
  tiles: AnnunciatorTile[];
  lampTest: boolean;
  reducedMotion: boolean;
  on: ConsoleHandlers;
}

export function DriverConsole({ h, unit, cage, il, auth, sealed, target, guard, tiles, lampTest, reducedMotion, on }: ConsoleProps): JSX.Element {
  const at = cage.moving ? null : landingAt(h, cage.posFt);
  const zone = zoneAt(h, cage.posFt);
  const fpm = ftpsToFpm(Math.abs(cage.v));
  const overspeed = (h.speedFpm * M.overspeedPct) / 100;
  const meterMax = Math.ceil(overspeed / 100) * 100;
  const load = loadLb(unit);
  const loadPct = (load / h.payloadLb) * 100;
  const insp = unit.mode === 'inspection';
  const t = lampTest;
  return (
    <PanelFrame title={[`${h.id} ${h.name}`, "HOIST DRIVER'S CONSOLE"]} panelNo={`HCP-${h.id}`} columns="repeat(auto-fill, minmax(232px, 1fr))" class="hst-panel">
      <PanelSection title="DEPTH INDICATOR" columns={3}>
        <SegmentDisplay value={Math.round(cage.posFt)} digits={5} variant="led" size="lg" label="DEPTH" unit="FT" ariaLabel={`Cage depth ${Math.round(cage.posFt)} feet`} />
        <SegmentDisplay value={at != null ? String(at).padStart(2, '0') : '--'} digits={2} variant="led" size="lg" label="LANDING" ariaLabel={at != null ? `At landing ${at}` : 'Between landings'} />
        <Lamp legend={['LANDING', 'ZONE']} lit={t || zone != null} color="white" tag="ZL" />
      </PanelSection>

      <PanelSection title="ROPE SPEED" columns={2}>
        <ArcMeter label="ROPE SPEED" value={fpm} min={0} max={meterMax} unit="FPM" alarm={overspeed} ticks={5} tag="SI-1" digits={0} />
        <div class="hst-stack">
          <Lamp legend="UP" lit={t || cage.v < -0.01} color="green" size="sm" />
          <Lamp legend="DOWN" lit={t || cage.v > 0.01} color="green" size="sm" />
          <Lamp legend="CREEP" lit={t || (cage.moving && fpm > 0 && fpm <= M.creepFpm + 0.5 && !insp)} color="amber" size="sm" />
        </div>
      </PanelSection>

      <PanelSection title="LOAD WEIGHING" columns={2}>
        <SegmentDisplay value={Math.round(load)} digits={6} variant="lcd" label="LOAD" unit="LB" ariaLabel={`Load cell ${Math.round(load)} pounds`} />
        <SegmentDisplay value={unit.persons} digits={3} variant="lcd" label="PERSONS" />
        <div class="hst-span2">
          <BarMeter label="PERCENT OF RATED" value={loadPct} min={0} max={M.loadScalePct} unit="%" warn={M.loadWarnPct} alarm={100} segments={25} tag="WI-1" />
        </div>
        <div class="hst-span2 hst-btnrow" role="group" aria-label="Onsetter's loading report">
          <PushButton legend={['PERS', '-']} size="sm" color="grey" onPress={() => on.load(-M.personStep, 0)} />
          <PushButton legend={['PERS', '+']} size="sm" color="grey" onPress={() => on.load(M.personStep, 0)} />
          <PushButton legend={['FRT', '-']} size="sm" color="grey" onPress={() => on.load(0, -M.freightStepLb)} />
          <PushButton legend={['FRT', '+']} size="sm" color="grey" onPress={() => on.load(0, M.freightStepLb)} />
        </div>
      </PanelSection>

      <PanelSection title="INTERLOCKS" columns={2}>
        <Lamp legend={['GATES', 'CLOSED']} lit={t || il.gates} color="green" size="sm" />
        <Lamp legend={['LOAD', 'NORMAL']} lit={t || il.load} color="green" size="sm" />
        <Lamp legend={['PORTAL', 'OPEN']} lit={t || il.seal} color="green" size="sm" />
        <Lamp legend={['REMOTE', 'CONTROL']} lit={t || il.remote} color="green" size="sm" />
        <Lamp legend={['BRAKE', 'TESTED']} lit={t || il.brake} color="green" size="sm" />
        <Lamp legend={['DRIVE', 'READY']} lit={t || (il.ready && !cage.moving)} color="white" size="sm" />
      </PanelSection>

      <PanelSection title="MODE" columns={1}>
        <KeySwitch
          positions={MODE_LEGENDS}
          value={MODES.indexOf(unit.mode)}
          label="HOIST MODE"
          keyPresent={auth.drive}
          keyNo={`K-${h.id}`}
          tag="HS-2"
          onChange={(i) => on.mode(MODES[i]!)}
          onLocked={on.modeLocked}
        />
      </PanelSection>

      <PanelSection title="LEVEL SELECTOR" columns={4}>
        {h.stops.map((s) => (
          <PushButton
            legend={String(s.level).padStart(2, '0')}
            size="sm"
            color="white"
            lit={target === s.level || lampTest}
            ariaLabel={`Select landing ${s.level}${sealed && s.level === h.stops[0]!.level ? ' (portal sealed)' : ''}`}
            onPress={() => on.target(s.level)}
          />
        ))}
      </PanelSection>

      <PanelSection title="DRIVE" columns={3}>
        <PushButton legend="RUN" color="green" lit={t || cage.moving} onPress={on.run} tag="PB-1" />
        <PushButton legend="STOP" color="red" onPress={on.stop} tag="PB-2" />
        <PushButton legend={['TRIP', 'RESET']} color="amber" lit={t || unit.trip != null} onPress={on.reset} tag="PB-3" />
        <ToggleSwitch checked={unit.gates === 'closed'} onLegend="CLOSED" offLegend="OPEN" label="GATES" onChange={(c) => on.gates(!c)} tag="HS-3" />
        <PushButton legend={['BRAKE', 'TEST']} color="white" lit={t || unit.brakeTesting != null} onPress={on.brake} tag="PB-4" />
        <div class="hst-stack">
          <PushButton legend={['INCH', 'UP']} size="sm" color="black" lit={t || (insp && cage.moving && cage.v < 0)} onPress={() => on.inch(-1)} onRelease={on.inchRelease} />
          <PushButton legend={['INCH', 'DOWN']} size="sm" color="black" lit={t || (insp && cage.moving && cage.v > 0)} onPress={() => on.inch(1)} onRelease={on.inchRelease} />
        </div>
      </PanelSection>

      <PanelSection title="EMERGENCY STOP" columns={1}>
        <GuardedSwitch
          state={guard}
          label={['EMERGENCY', 'STOP']}
          plate="danger"
          holdMs={M.estopHoldMs}
          segments={5}
          reducedMotion={reducedMotion}
          tag="ES-1"
          words={{ closed: 'COVER CLOSED', lifted: 'COVER LIFTED', armed: 'HOLD', actuated: 'STOPPED' }}
          onLift={() => on.guard('lifted')}
          onClose={() => on.guard('closed')}
          onActuate={on.estop}
        />
        {!auth.estop && <p class="hst-note hst-small">{auth.why}</p>}
      </PanelSection>

      <PanelSection title="ANNUNCIATOR" span={2}>
        <Annunciator
          tiles={tiles}
          columns={4}
          label={`${h.id} ALARMS`}
          test={lampTest}
          tileWidth={96}
          reducedMotion={reducedMotion}
          onAck={on.annAck}
          onReset={on.annReset}
          onTest={on.annTest}
        />
      </PanelSection>
    </PanelFrame>
  );
}
