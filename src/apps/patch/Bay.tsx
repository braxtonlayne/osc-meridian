/**
 * Bay view: the jack field of one bay and the position equipment beside it (selected circuit,
 * test set, operator position, monitor).
 */
import { useState } from 'preact/hooks';
import { PropertyGrid, StatusLight, type OperStatus } from '@design/index';
import { BarMeter, Lamp, PanelSection, Plate, PushButton, SegmentDisplay, SelectorSwitch } from '@graphics/panel';
import { JackField, Trend, type JackColumn, type JackCord, type JackUtility } from '@graphics/patch';
import type { PatchCircuit } from '@core/canon-apps/patch';
import {
  PC,
  UTILITY_LABEL,
  circuit,
  circuitsAt,
  cordsAt,
  farEnd,
  isOpen,
  lampOf,
  parseJack,
  pencilAt,
  service,
  siteCode,
  utilitiesAt,
  voiceAt,
  type Lamp as LampState,
  type LampContext,
  type ServiceStatus,
} from './model';
import { bayName, type CallRun, type Ops, type TestRun } from './ops';
import type { PatchCord, PatchState, TestKind } from './types';

export interface BayProps {
  site: string;
  state: PatchState | null;
  lampCtx: LampContext;
  isolated: boolean;
  /** Circuit ids whose designation is withheld from this reader. */
  withheld: ReadonlySet<string>;
  /** Tier 4 presentation: far ends are not named. */
  t4: boolean;
  /** Observer position (Internal Assurance): the monitor panel comes first; test set and operator position are not fitted. */
  observer: boolean;
  selectedJack: string | null;
  selectedCord: string | null;
  selectedCircuit: string | null;
  ops: Ops;
  reducedMotion: boolean;
  now: number;
  onJack(id: string): void;
  onDrop(a: string, b: string): void;
  onCord(id: string): void;
  onDeleteAt(jack: string): void;
  onEscape(): void;
}

export function farName(c: PatchCircuit, site: string, t4: boolean): string {
  const f = farEnd(c, site);
  if (!f) return 'This site';
  return t4 ? 'Hub' : f;
}

export function routeName(c: PatchCircuit, t4: boolean): string {
  if (!t4) return c.route;
  return c.class === 'local' ? 'Site' : 'Tram link';
}

const SERVICE_STATUS: Record<ServiceStatus, OperStatus> = {
  'IN SERVICE': 'NOMINAL',
  REPATCHED: 'DEGRADED',
  LOOPED: 'DEGRADED',
  'ON TEST': 'DEGRADED',
  'OUT OF SERVICE': 'FAULT',
  MISROUTED: 'FAULT',
  DEAD: 'FAULT',
  SPARE: 'OFFLINE',
  CARRYING: 'DEGRADED',
  'NOT ASSIGNED': 'OFFLINE',
};

export function ServiceWord({ status }: { status: ServiceStatus }) {
  return <StatusLight status={SERVICE_STATUS[status]} word={status} />;
}

export function BayView(p: BayProps) {
  const { site, state, t4, withheld } = p;
  const circuits = circuitsAt(site);
  const cords = cordsAt(state, site);
  const code = siteCode(site);

  const columns: JackColumn[] = circuits.map((c) => {
    const hidden = withheld.has(c.id);
    const busyCord = cords.some((k) => k.purpose !== 'monitor' && [k.a, k.b].some((j) => j === `${c.id}/L` || j === `${c.id}/E`));
    const far = farEnd(c, site);
    const lamp: LampState = lampOf(state, c, p.lampCtx);
    return {
      id: c.id,
      jacks: [`${c.id}/L`, `${c.id}/E`] as const,
      lines: [c.id, far ? (t4 ? 'HUB' : siteCode(far)) : c.id.endsWith('X1') ? 'EXCH' : 'DUTY'] as const,
      withheld: hidden,
      pencil: hidden ? null : pencilAt(site, c.id),
      lamp,
      normal: !busyCord,
    };
  });
  const utilities: JackUtility[] = utilitiesAt(site).map((u) => ({ id: `${code}/${u}`, legend: UTILITY_LABEL[u] }));
  const jackCords: JackCord[] = cords.map((k) => ({ id: k.id, a: k.a, b: k.b, kind: k.purpose, flagged: k.purpose === 'repatch' && !k.authorised }));
  const inert = new Set<string>();
  for (const id of withheld) {
    inert.add(`${id}/L`);
    inert.add(`${id}/E`);
  }

  const sel = p.selectedCircuit ? circuit(p.selectedCircuit) : undefined;
  const selVisible = sel && !withheld.has(sel.id) && (sel.a === site || sel.b === site) ? sel : undefined;

  return (
    <div class="pt-bay-view">
      <div class="pt-field-wrap">
        <JackField
          title={`${bayName(site)}   ${t4 ? 'SITE TERMINAL BLOCK' : 'HUB CIRCUIT PATCH BAY'}   ${site}`}
          perStrip={PC.panel.stripWidth}
          columns={columns}
          utilities={utilities}
          cords={jackCords}
          selectedJack={p.selectedJack}
          selectedCord={p.selectedCord}
          inert={inert}
          label={`Jack field, bay ${bayName(site)}`}
          onJack={p.onJack}
          onDrop={p.onDrop}
          onCord={p.onCord}
          onDelete={p.onDeleteAt}
          onEscape={p.onEscape}
        />
        <p class="pt-hint">
          Click a jack, then a second jack, to patch; or drag a cord between them. Click a cord to select it; Delete removes it. Keyboard: Tab to the field, arrows, Enter, Delete,
          Escape.
        </p>
      </div>
      <div class="pt-side">
        <CircuitCard c={selVisible} site={site} state={state} isolated={p.isolated} t4={t4} cords={cords} />
        {p.observer ? <MonitorPanel {...p} cords={cords} /> : null}
        {p.observer ? null : <TestSet {...p} cords={cords} />}
        {p.observer ? null : <OperatorPosition {...p} cords={cords} />}
        {!p.observer && utilitiesAt(site).includes('MON') ? <MonitorPanel {...p} cords={cords} /> : null}
      </div>
    </div>
  );
}

function figuresOf(c: PatchCircuit, t4: boolean): string {
  if (c.kind === 'DATA') return `BER 1E${c.berExp}, ES ${c.esPerHour}/h`;
  // Figures of record are the register's: a pair not assigned is entered as open, whatever a test finds.
  if (isOpen(c) || c.status === 'NOT ASSIGNED') return 'Open pair';
  const exp = c.expectedLossDb != null ? `, expected ${c.expectedLossDb} dB` : '';
  void t4;
  return `Loss ${c.lossDb} dB${exp}; noise ${c.noiseDbrnc0} dBrnC0; S/N ${c.snrDb} dB`;
}

function CircuitCard({ c, site, state, isolated, t4, cords }: { c?: PatchCircuit; site: string; state: PatchState | null; isolated: boolean; t4: boolean; cords: PatchCord[] }) {
  if (!c) {
    return (
      <PanelSection title="CIRCUIT">
        <p class="pt-muted">No circuit selected. Select a jack in the field to show its circuit.</p>
      </PanelSection>
    );
  }
  const sv = service(state, c, isolated);
  const on = cords.filter((k) => [k.a, k.b].some((j) => j.startsWith(`${c.id}/`)));
  return (
    <PanelSection title={`CIRCUIT ${c.id}`}>
      <PropertyGrid
        rows={[
          { label: 'Use', value: c.use },
          { label: 'Route', value: routeName(c, t4), mono: true },
          { label: 'Far end', value: farName(c, site, t4), mono: true },
          { label: 'Type', value: c.kind === 'VF' ? 'Voice, 4-wire VF' : c.kind === 'DATA' ? 'Data bearer' : c.kind === 'MAINT' ? 'Maintenance ringdown' : 'Spare pair' },
          { label: 'Register', value: c.status },
          { label: 'Service', value: <ServiceWord status={sv.status} /> },
          { label: 'Condition', value: sv.note },
          { label: 'Order of record', value: c.order ?? 'None', mono: true },
          { label: 'Figures of record', value: figuresOf(c, t4) },
          ...(c.fault && !t4 ? [{ label: 'Fault note', value: c.fault }] : []),
          { label: 'Cords', value: on.length ? on.map((k) => `${k.id} (${k.purpose}${k.authorised ? '' : ', no order'})`).join('; ') : 'None; normal-through' },
        ]}
      />
    </PanelSection>
  );
}

/** Strip chart scale and limits for a primary figure (noise for voice pairs, ES/h for data). */
export function chartScale(data: boolean) {
  const L = PC.limits;
  const T = PC.tests;
  return data
    ? { min: 0, max: T.chartEsMax, warn: L.esWarnPerHour, limit: L.esFailPerHour, unit: 'ES/h' }
    : { min: T.chartNoiseMin, max: T.chartNoiseMax, warn: L.noiseWarnDbrnc0, limit: L.noiseFailDbrnc0, unit: 'dBrnC0' };
}

const TEST_KINDS: TestKind[] = ['tone', 'loopback', 'quality'];
const TEST_POS = ['TONE', 'LOOP', 'QUAL'];

function TestSet(p: BayProps & { cords: PatchCord[] }) {
  const [pos, setPos] = useState(0);
  const tst = `${siteCode(p.site)}/TST`;
  const cord = p.cords.find((k) => k.a === tst || k.b === tst);
  const on = cord ? parseJack(cord.a === tst ? cord.b : cord.a).circuit : undefined;
  const run: TestRun | null = p.ops.test && p.ops.test.site === p.site ? p.ops.test : null;
  const running = !!run && !run.outcome;
  const kind = TEST_KINDS[pos]!;
  const o = run?.outcome;
  const readout = (() => {
    if (!run) return '----';
    if (running && run.kind === 'quality' && run.samples.length) return String(run.samples[run.samples.length - 1]);
    if (running) return '----';
    if (!o) return '----';
    const r = o.readings;
    const v = r.lossDb ?? r.noiseDbrnc0 ?? r.esPerHour ?? r.loopMs;
    return v === undefined ? '----' : String(v);
  })();
  const unit = !run ? '' : run.kind === 'tone' ? 'dB' : run.kind === 'loopback' ? 'ms' : circuit(run.circuit)?.kind === 'DATA' ? 'ES/h' : 'dBrnC0';
  return (
    <PanelSection title="TEST SET">
      <p class="pt-line">{on ? `Patched to ${on.id} LINE.` : `Not patched. Patch TEST SET (${tst}) to a LINE jack.`}</p>
      <div class="pt-row">
        <SelectorSwitch positions={TEST_POS} value={pos} onChange={(i) => setPos(i)} label="TEST" disabled={running} />
        <PushButton legend="START" color="green" size="sm" lit={running} disabled={!on || running} onPress={() => on && p.ops.startTest(p.site, on, kind)} />
        <PushButton legend="STOP" color="grey" size="sm" disabled={!running} onPress={() => p.ops.abortTest()} />
        <SegmentDisplay value={readout} digits={5} label="READING" unit={unit} />
        <Lamp legend="PASS" lit={o?.result === 'PASS'} color="green" size="sm" />
        <Lamp legend="MARG" lit={o?.result === 'MARGINAL'} color="amber" size="sm" />
        <Lamp legend="FAIL" lit={o?.result === 'FAIL'} color="red" size="sm" />
      </div>
      {run && run.kind === 'quality' ? (
        <Trend
          label={`${run.circuit} line quality run`}
          values={run.samples}
          {...chartScale(circuit(run.circuit)?.kind === 'DATA')}
          from="start"
          to={`${PC.tests.qualitySamples} samples`}
          live={running}
          width={330}
          height={110}
        />
      ) : null}
      {o ? (
        <p class="pt-line">
          <span class="pk-mono">{o.id}</span> {run!.circuit} {run!.kind}: <strong>{o.result}</strong>. {o.summary}
        </p>
      ) : running ? (
        <p class="pt-line">Test running on {run!.circuit}.</p>
      ) : null}
    </PanelSection>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

function OperatorPosition(p: BayProps & { cords: PatchCord[] }) {
  const opr = `${siteCode(p.site)}/OPR`;
  const cord = p.cords.find((k) => k.a === opr || k.b === opr);
  const on = cord ? parseJack(cord.a === opr ? cord.b : cord.a).circuit : undefined;
  const call: CallRun | null = p.ops.call && p.ops.call.site === p.site ? p.ops.call : null;
  const cycle = (PC.calls.ringOnS + PC.calls.ringOffS) * 1000;
  const ringing = call?.phase === 'ringing';
  const ringLit = ringing && call!.rings > 0 && (p.reducedMotion || (p.now - call!.startedAt) % cycle < PC.calls.ringOnS * 1000);
  const canDial = call?.phase === 'dial-tone' || call?.phase === 'dialling';
  return (
    <PanelSection title={p.t4 ? 'HANDSET' : 'OPERATOR POSITION'}>
      <p class="pt-line">{on ? `On ${on.id} LINE.${on.ringdown || on.status === 'NOT ASSIGNED' ? ' Ringdown: no dialling.' : ''}` : `Not patched. Patch ${p.t4 ? 'the handset' : 'OPR POSN'} (${opr}) to a voice LINE jack.`}</p>
      <div class="pt-row">
        <Lamp legend="LINE" lit={!!call && call.phase !== 'dead' && call.phase !== 'no-dial-tone'} color="white" size="sm" />
        <Lamp legend="RING" lit={!!ringLit} color="amber" size="sm" />
        <Lamp legend="ANS" lit={call?.phase === 'answered'} color="green" size="sm" />
        <SegmentDisplay value={call?.digits ? call.digits : '----'} digits={PC.calls.dialDigits} label="DIALLED" />
        <SegmentDisplay value={call ? call.rings : 0} digits={1} label="RINGS" />
      </div>
      <div class="pt-row">
        <div class="pt-keypad" role="group" aria-label="Keypad">
          {KEYS.map((k) => (
            <PushButton key={k} legend={k} size="sm" color="black" disabled={!canDial} onPress={() => p.ops.press(k)} ariaLabel={`Key ${k}`} />
          ))}
        </div>
        <div class="pt-callside">
          <PushButton legend={['REL', '']} label="RELEASE" color="red" size="sm" disabled={!call} onPress={() => p.ops.endCall('abandoned')} />
          <ol class="pt-transcript" aria-label="Call progress" aria-live="polite">
            {(call?.transcript ?? []).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </div>
      </div>
    </PanelSection>
  );
}

function MonitorPanel(p: BayProps & { cords: PatchCord[] }) {
  const mon = `${siteCode(p.site)}/MON`;
  const cord = p.cords.find((k) => k.a === mon || k.b === mon);
  const on = cord ? parseJack(cord.a === mon ? cord.b : cord.a).circuit : undefined;
  if (!on) {
    return (
      <PanelSection title="MONITOR">
        <p class="pt-line">Not patched. A monitor cord bridges a jack without breaking the circuit. No speech is reproduced at this position.</p>
      </PanelSection>
    );
  }
  const lamp = lampOf(p.state, on, p.lampCtx);
  const v = voiceAt(on, p.now / 1000);
  const traffic = lamp === 'busy';
  // dBrnC0 is referred to the noise reference level; speech and data sit at their nominal levels.
  const M = PC.monitor;
  const level = lamp === 'dark' ? M.floorDbm0 : on.kind === 'DATA' ? M.dataDbm0 : traffic ? M.speechDbm0 : Math.max(M.floorDbm0, M.noiseRefDbm0 + (v?.noiseDbrnc0 ?? 0));
  return (
    <PanelSection title="MONITOR">
      <p class="pt-line">
        Bridged to {on.id}. {lamp === 'dark' ? 'No signal.' : on.kind === 'DATA' ? 'Line signal present (data bearer).' : traffic ? 'Speech-band energy present.' : `Idle. Circuit noise ${v?.noiseDbrnc0 ?? '--'} dBrnC0.`} No speech is reproduced at this position.
      </p>
      <BarMeter label="LEVEL" value={level} min={M.floorDbm0} max={0} unit="dBm0" segments={20} length={200} readout />
      <Plate text={traffic ? 'TRAFFIC' : lamp === 'dark' ? 'NO SIGNAL' : 'IDLE'} size="sm" variant={traffic ? 'warning' : 'light'} />
    </PanelSection>
  );
}
