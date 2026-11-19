/**
 * Preview gallery and rendered check for @graphics/panel. Dev-only; not imported by the app.
 *   npx vite --port 5282 --strictPort   then open /src/graphics/panel/preview.html
 * check/render.mjs screenshots every [data-check] block at 1x and 2x.
 * All figures on this page are sample data, not canon.
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import '@design/styles';
import './preview.css';
import {
  Annunciator,
  ArcMeter,
  BarMeter,
  EdgewiseMeter,
  GuardedSwitch,
  KeySwitch,
  Lamp,
  MimicBox,
  MimicJunction,
  MimicLine,
  MimicSvg,
  PanelFrame,
  PanelSection,
  Plate,
  PushButton,
  SegmentDisplay,
  SelectorSwitch,
  ToggleSwitch,
  annunciatorStep,
  guardStep,
  type AnnEvent,
  type AnnPoint,
  type AnnunciatorTile,
  type GuardState,
  type LensColor,
} from './index';

const noop = (): void => undefined;

function Check({ id, title, children, note }: { id: string; title: string; children: ComponentChildren; note?: string }) {
  return (
    <section class="ck" id={id} data-check>
      <h2 class="ck__h">{title}</h2>
      {children}
      {note ? <div class="ck__note">{note}</div> : null}
    </section>
  );
}

function Cell({ note, children }: { note: string; children: ComponentChildren }) {
  return (
    <div class="ck__cell">
      {children}
      <span class="ck__note">{note}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- live demos */

function LiveGuard() {
  const [s, setS] = useState<GuardState>('closed');
  const [log, setLog] = useState<string[]>([]);
  const note = (t: string): void => setLog((l) => [...l.slice(-3), t]);
  return (
    <div class="ck__cell" id="live-guard">
      <GuardedSwitch
        state={s}
        label={['NETWORK ISOLATION', 'MANUAL INITIATE']}
        holdMs={3000}
        tag="HS-0001"
        onLift={() => {
          setS((x) => guardStep(x, 'lift'));
          note('onLift');
        }}
        onClose={() => {
          setS((x) => guardStep(x, 'close'));
          note('onClose');
        }}
        onArm={() => note('onArm')}
        onAbort={() => note('onAbort')}
        onActuate={() => {
          setS('actuated');
          note('onActuate');
        }}
      />
      <span class="ck__note" id="live-guard-log">
        {log.join(' > ') || 'no events'}
      </span>
    </div>
  );
}

const ANN_DEF: { id: string; legend: string[]; priority?: AnnunciatorTile['priority'] }[] = [
  { id: 'a1', legend: ['REACTOR', 'TRIP'] },
  { id: 'a2', legend: ['PRIMARY', 'PRESS HIGH'] },
  { id: 'a3', legend: ['COOLANT', 'FLOW LOW'], priority: 'warning' },
  { id: 'a4', legend: ['PUMP A', 'OVERLOAD'], priority: 'warning' },
  { id: 'a5', legend: ['ROD BANK', 'DEVIATION'], priority: 'warning' },
  { id: 'a6', legend: ['DG-1', 'RUNNING'], priority: 'status' },
  { id: 'a7', legend: ['TURBINE', 'TRIP'] },
  { id: 'a8', legend: ['SIMULATOR', 'MODE'], priority: 'status' },
];

function LiveAnnunciator({ reducedMotion }: { reducedMotion?: boolean }) {
  const [pts, setPts] = useState<Record<string, AnnPoint>>(() => {
    const p: Record<string, AnnPoint> = {};
    for (const t of ANN_DEF) p[t.id] = { seq: 'normal', abnormal: false };
    const ev = (id: string, e: AnnEvent[]): void => {
      p[id] = e.reduce(annunciatorStep, p[id]!);
    };
    ev('a2', ['abnormal']);
    ev('a3', ['abnormal', 'ack']);
    ev('a4', ['abnormal', 'ack', 'normal']);
    ev('a6', ['abnormal', 'ack']);
    ev('a8', ['abnormal', 'ack']);
    return p;
  });
  const [test, setTest] = useState(false);
  const apply = (ids: string[], e: AnnEvent): void =>
    setPts((p) => {
      const n = { ...p };
      for (const id of ids) n[id] = annunciatorStep(n[id]!, e);
      return n;
    });
  return (
    <Annunciator
      label="Annunciator panel A"
      columns={4}
      tiles={ANN_DEF.map((t) => ({ ...t, seq: pts[t.id]!.seq }))}
      test={test}
      reducedMotion={reducedMotion}
      onAck={(ids) => apply(ids, 'ack')}
      onReset={(ids) => apply(ids, 'reset')}
      onTest={setTest}
    />
  );
}

/* ---------------------------------------------------------------- static sets */

const STATE_TILES: AnnunciatorTile[] = [
  { id: 's1', legend: ['ALARM', 'NORMAL'], seq: 'normal' },
  { id: 's2', legend: ['ALARM', 'UNACK'], seq: 'unack' },
  { id: 's3', legend: ['ALARM', 'ACK'], seq: 'ack' },
  { id: 's4', legend: ['ALARM', 'RINGBACK'], seq: 'ringback' },
  { id: 'w1', legend: ['WARNING', 'NORMAL'], seq: 'normal', priority: 'warning' },
  { id: 'w2', legend: ['WARNING', 'UNACK'], seq: 'unack', priority: 'warning' },
  { id: 'w3', legend: ['WARNING', 'ACK'], seq: 'ack', priority: 'warning' },
  { id: 'w4', legend: ['WARNING', 'RINGBACK'], seq: 'ringback', priority: 'warning' },
  { id: 't1', legend: ['STATUS', 'NORMAL'], seq: 'normal', priority: 'status' },
  { id: 't2', legend: ['STATUS', 'UNACK'], seq: 'unack', priority: 'status' },
  { id: 't3', legend: ['STATUS', 'ACK'], seq: 'ack', priority: 'status' },
  { id: 't4', legend: [''], seq: 'normal', spare: true },
];

const LENSES: LensColor[] = ['red', 'green', 'amber', 'white', 'blue'];

function Gallery() {
  const [sel, setSel] = useState(1);
  const [key, setKey] = useState(0);
  const [tog, setTog] = useState(true);
  const [latch, setLatch] = useState(false);
  return (
    <div class="ck-page">
      <Check id="guard-states" title="GuardedSwitch: closed, lifted, armed (60%), actuated, disabled">
        <div class="ck__row">
          <Cell note="closed">
            <GuardedSwitch state="closed" label={['NETWORK ISOLATION', 'MANUAL INITIATE']} />
          </Cell>
          <Cell note="lifted">
            <GuardedSwitch state="lifted" label={['NETWORK ISOLATION', 'MANUAL INITIATE']} />
          </Cell>
          <Cell note="armed, progress 0.6">
            <GuardedSwitch state="armed" progress={0.6} label={['NETWORK ISOLATION', 'MANUAL INITIATE']} />
          </Cell>
          <Cell note="actuated">
            <GuardedSwitch state="actuated" label={['NETWORK ISOLATION', 'MANUAL INITIATE']} words={{ actuated: 'INITIATED' }} />
          </Cell>
          <Cell note="disabled, warning plate">
            <GuardedSwitch state="closed" disabled plate="warning" label={['REACTOR SCRAM', 'MANUAL']} holdMs={1000} segments={5} />
          </Cell>
        </div>
      </Check>

      <Check id="guard-live" title="GuardedSwitch: live (click cover, hold actuator 3 s, Escape closes)">
        <div class="ck__row">
          <LiveGuard />
        </div>
      </Check>

      <Check id="pushbuttons" title="PushButton: lamp-in-button lit / unlit, caps, pressed, latching, disabled">
        <div class="ck__row">
          {LENSES.map((c) => (
            <Cell note={`${c} lit`} key={`l${c}`}>
              <PushButton legend={['PUMP A', 'START']} color={c} lit onPress={noop} />
            </Cell>
          ))}
          {LENSES.map((c) => (
            <Cell note={`${c} dark`} key={`d${c}`}>
              <PushButton legend={['PUMP A', 'START']} color={c} onPress={noop} />
            </Cell>
          ))}
        </div>
        <div class="ck__row">
          <Cell note="black cap">
            <PushButton legend="STOP" color="black" label="PUMP A" />
          </Cell>
          <Cell note="grey cap pressed">
            <PushButton legend={['LAMP', 'TEST']} color="grey" pressed />
          </Cell>
          <Cell note="latching (click)">
            <PushButton legend={['CBRN', 'MODE']} label="FILTRATION" mode="latching" color="amber" pressed={latch} lit={latch} onChange={setLatch} />
          </Cell>
          <Cell note="latched in">
            <PushButton legend={['ZONE 3', 'SELECT']} mode="latching" color="white" pressed lit />
          </Cell>
          <Cell note="small">
            <PushButton legend="ACK" color="black" size="sm" />
          </Cell>
          <Cell note="disabled">
            <PushButton legend={['HOIST', 'RUN']} color="green" disabled tag="HS-201" />
          </Cell>
        </div>
      </Check>

      <Check id="lamps" title="Lamp: lens colours lit and dark, small, state word">
        <div class="ck__row">
          {LENSES.map((c) => (
            <Lamp legend={['BREAKER', 'CLOSED']} color={c} lit key={`L${c}`} />
          ))}
          {LENSES.map((c) => (
            <Lamp legend={['BREAKER', 'CLOSED']} color={c} lit={false} key={`D${c}`} />
          ))}
          <Lamp legend="POWER" color="white" lit size="sm" />
          <Lamp legend="FAULT" color="red" lit={false} size="sm" showState tag="DS-12" />
          <Lamp legend="ISOLATED" color="amber" lit showState words={{ on: 'ISOLATED', off: 'NORMAL' }} />
        </div>
      </Check>

      <Check id="switches" title="ToggleSwitch, SelectorSwitch (2-5 positions), KeySwitch (key in / out)">
        <div class="ck__row">
          <ToggleSwitch checked={tog} onChange={setTog} label="PANEL LIGHTS" />
          <ToggleSwitch checked={false} label="FAN 2" onLegend="RUN" offLegend="STOP" />
          <ToggleSwitch checked disabled label="HEATER" />
          <SelectorSwitch positions={['LOCAL', 'REMOTE']} value={1} label="CONTROL" />
          <SelectorSwitch positions={['OFF', 'AUTO', 'MAN']} value={sel} onChange={setSel} label="PUMP A MODE" tag="HS-101" />
          <SelectorSwitch positions={['1', '2', '3', '4']} value={2} label="HOIST LEVEL" />
          <SelectorSwitch positions={['SHUT', 'STBY', 'START', 'RUN', 'TEST']} value={0} label="REACTOR MODE" />
          <KeySwitch positions={['OFF', 'ON']} value={key} onChange={setKey} label="SIMULATOR" removableAt={[0]} keyNo="K-114" />
          <KeySwitch positions={['NORMAL', 'BYPASS', 'TEST']} value={1} label="INTERLOCK" keyNo="K-07" />
          <KeySwitch positions={['OFF', 'ON']} value={0} keyPresent={false} label="LIVE PLANT" removableAt={[0]} />
        </div>
      </Check>

      <Check id="annunciator-on" title="Annunciator: every sequence state, flash phase ON (alarm, warning, status; spare)">
        <div class="ck-phase-on">
          <Annunciator label="States" tiles={STATE_TILES} columns={4} buttons={false} reducedMotion={false} />
        </div>
      </Check>
      <Check id="annunciator-off" title="Annunciator: flash phase OFF (unack dark, ringback dark)">
        <div class="ck-phase-off">
          <Annunciator label="States" tiles={STATE_TILES} columns={4} buttons={false} reducedMotion={false} />
        </div>
      </Check>
      <Check id="annunciator-reduced" title="Annunciator: reduced motion (unack = static inverse, ringback = dim + dashed)">
        <Annunciator label="States" tiles={STATE_TILES} columns={4} buttons={false} reducedMotion />
      </Check>
      <Check id="annunciator-test" title="Annunciator: lamp test held">
        <Annunciator label="States" tiles={STATE_TILES} columns={4} buttons={false} test reducedMotion={false} />
      </Check>
      <Check id="annunciator-live" title="Annunciator: live, with ACK / RESET / LAMP TEST pushbuttons (reduced motion for the check)">
        <LiveAnnunciator reducedMotion />
      </Check>

      <Check id="meters" title="EdgewiseMeter, ArcMeter: normal, high, high-high, no data">
        <div class="ck__row">
          <EdgewiseMeter label="BUS A VOLTS" value={4.12} min={0} max={5} unit="kV" tag="EI-101" />
          <EdgewiseMeter label="PUMP A AMPS" value={86} min={0} max={100} unit="A" warn={80} alarm={90} tag="II-102" />
          <EdgewiseMeter label="CO2 LEVEL 3" value={1620} min={0} max={2000} unit="ppm" warn={1000} alarm={1500} />
          <EdgewiseMeter label="FEED FLOW" value={Number.NaN} min={0} max={50} unit="L/s" warn={{ lo: 10 }} />
          <ArcMeter label="REACTOR POWER" value={71} min={0} max={120} unit="% RTP" warn={100} alarm={110} tag="JI-001" />
          <ArcMeter label="FREQUENCY" value={60.02} min={58} max={62} unit="Hz" warn={{ lo: 59.5, hi: 60.5 }} alarm={{ lo: 59, hi: 61 }} />
          <ArcMeter label="CAGE SPEED" value={0} min={0} max={10} unit="m/s" />
        </div>
      </Check>

      <Check id="bars-segments" title="BarMeter and SegmentDisplay (lcd / led, sizes, overflow)">
        <div class="ck__row">
          <BarMeter label="FAN 2 SPEED" value={64} min={0} max={100} unit="%" />
          <BarMeter label="SUMP LEVEL" value={92} min={0} max={100} unit="%" warn={80} alarm={90} length={160} segments={16} />
          <BarMeter label="O2" value={19.2} min={15} max={25} unit="%" warn={{ lo: 19.5 }} alarm={{ lo: 18 }} />
        </div>
        <div class="ck__row">
          <SegmentDisplay value={1247} label="ROD BANK 2 STEPS" />
          <SegmentDisplay value={42.6} decimals={1} digits={5} label="CAGE DEPTH" unit="m" variant="led" />
          <SegmentDisplay value="-08" digits={3} label="LEVEL" size="lg" />
          <SegmentDisplay value={0.5} decimals={2} digits={4} label="DIFF PRESS" unit="kPa" size="sm" />
          <SegmentDisplay value={123456} digits={4} label="OVER RANGE" variant="led" />
          <SegmentDisplay value="HELP" digits={4} label="LETTERS" />
        </div>
      </Check>

      <Check id="plates" title="Plate variants and sizes">
        <div class="ck__row">
          <Plate text="PUMP A" size="sm" />
          <Plate text={['DOOR 3', 'BLAST']} />
          <Plate text="AIR REVITALIZATION TRAIN 2" size="lg" screws />
          <Plate text="CBRN FILTRATION" variant="dark" screws />
          <Plate text={['CAUTION', 'TWO-PERSON RULE']} variant="warning" />
          <Plate text={['DANGER', 'ISOLATES ALL HUB CIRCUITS']} variant="danger" screws />
        </div>
      </Check>

      <Check id="mimic" title="Mimic helpers (live, dead, flow), junctions, equipment boxes">
        <MimicSvg width={360} height={110} label="Coolant loop mimic">
          <MimicLine points={[[20, 30], [140, 30]]} state="flow" />
          <MimicLine points={[[184, 30], [300, 30], [300, 80], [184, 80]]} state="live" />
          <MimicLine points={[[140, 80], [20, 80], [20, 30]]} state="dead" />
          <MimicJunction x={20} y={30} />
          <MimicJunction x={300} y={80} />
          <MimicBox x={140} y={19} label="P-1A" on />
          <MimicBox x={140} y={69} label="P-1B" />
          <MimicBox x={310} y={44} w={40} label="HX" />
        </MimicSvg>
      </Check>

      <Check id="sample-panel" title="Composed sample panel (sample data, not canon)">
        <SamplePanel />
      </Check>
    </div>
  );
}

function SamplePanel() {
  const [mode, setMode] = useState(3);
  const [pumpA, setPumpA] = useState(true);
  const [guard, setGuard] = useState<GuardState>('closed');
  return (
    <PanelFrame title={['RX-A03 REACTOR PLANT', 'TRAINING SIMULATOR']} panelNo="PNL-FE-0301-T  REV C  SHEET 1 OF 1" columns="auto auto auto" gap={18}>
      <PanelSection title="ANNUNCIATOR A" span={2}>
        <LiveAnnunciator reducedMotion />
      </PanelSection>
      <PanelSection title="REACTOR TRIP">
        <GuardedSwitch
          state={guard}
          label={['REACTOR SCRAM', 'MANUAL']}
          plate="danger"
          holdMs={2000}
          onLift={() => setGuard('lifted')}
          onClose={() => setGuard('closed')}
          onActuate={() => setGuard('actuated')}
          words={{ actuated: 'SCRAM' }}
          tag="HS-RPS-01"
        />
      </PanelSection>
      <PanelSection title="REACTOR" columns={3}>
        <ArcMeter label="POWER" value={71} min={0} max={120} unit="% RTP" warn={100} alarm={110} tag="JI-001" />
        <EdgewiseMeter label="PRI PRESS" value={15.2} min={0} max={20} unit="MPa" warn={16.5} alarm={17.2} tag="PI-110" />
        <EdgewiseMeter label="PRI TEMP" value={291} min={200} max={350} unit="°C" warn={310} alarm={320} tag="TI-111" />
      </PanelSection>
      <PanelSection title="CONTROL RODS" columns={2}>
        <SegmentDisplay value={1247} label="BANK 2 STEPS" />
        <SegmentDisplay value={228} digits={4} label="BANK 1 STEPS" />
        <SelectorSwitch positions={['SHUT', 'STBY', 'START', 'RUN', 'TEST']} value={mode} onChange={setMode} label="REACTOR MODE" />
        <KeySwitch positions={['SIM', 'LIVE']} value={0} label="PLANT LINK" removableAt={[0]} keyNo="K-114" />
      </PanelSection>
      <PanelSection title="PRIMARY COOLANT" columns={3}>
        <Lamp legend={['PUMP A', 'RUNNING']} color="red" lit={pumpA} />
        <Lamp legend={['PUMP A', 'STOPPED']} color="green" lit={!pumpA} />
        <Lamp legend={['DG-1', 'AVAIL']} color="white" lit />
        <PushButton legend={['PUMP A', 'START']} color="red" lit={pumpA} onPress={() => setPumpA(true)} />
        <PushButton legend={['PUMP A', 'STOP']} color="green" lit={!pumpA} onPress={() => setPumpA(false)} />
        <BarMeter label="FLOW" value={pumpA ? 74 : 0} min={0} max={100} unit="%" warn={{ lo: 40 }} alarm={{ lo: 20 }} length={120} segments={12} />
      </PanelSection>
    </PanelFrame>
  );
}

render(<Gallery />, document.getElementById('root')!);
