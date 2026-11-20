/**
 * Dispatcher Workstation: the desk panel (panel hardware kit). Route entry, consist, departure,
 * signals, dispatch, the desk and segment keys, and the desk annunciator.
 */
import { useEffect, useState } from 'preact/hooks';
import type { DispatchMode } from '@core/canon-apps/dispatch';
import { Select } from '@design/index';
import { Annunciator, KeySwitch, Lamp, MimicBox, MimicLine, MimicSvg, PanelFrame, PanelSection, Plate, PushButton, SegmentDisplay, SelectorSwitch, type AnnPoint, type AnnunciatorTile } from '@graphics/panel';
import { runLegs, type SimModel } from '@sim/transit-model';
import type { RouteState, SignalState } from './App';
import { crossesSeg04, dwellMsFor, DSP, routeMiles, SEG04, type StockPosition } from './logic';
import type { DispatchSystem } from './types';

export interface AnnInputs {
  conflict: boolean;
  possession: boolean;
  seg04: boolean;
  isolation: boolean;
  drill: boolean;
  held: boolean;
  release: boolean;
}

export const ANN_TILES: (Omit<AnnunciatorTile, 'seq'> & { id: keyof AnnInputs })[] = [
  { id: 'conflict', legend: ['ROUTE', 'CONFLICT'], priority: 'alarm' },
  { id: 'possession', legend: ['POSSESSION', 'IN FORCE'], priority: 'warning' },
  { id: 'seg04', legend: [`SEG ${SEG04.segment}`, 'NOT IN SERVICE'], priority: 'warning' },
  { id: 'isolation', legend: ['NETWORK', 'ISOLATED'], priority: 'alarm' },
  { id: 'drill', legend: ['SEAL DRILL', 'PORTALS SHUT'], priority: 'alarm' },
  { id: 'held', legend: ['TRAIN', 'HELD'], priority: 'warning' },
  { id: 'release', legend: ['RELEASE', SEG04.releaseDesk.replace('ALPHA-', 'A')], priority: 'status' },
  { id: 'spare' as keyof AnnInputs, legend: '', spare: true },
];

export interface DeskPanelProps {
  model: SimModel;
  training: boolean;
  mode: DispatchMode;
  route: string[];
  routeState: RouteState;
  signal: SignalState;
  system: DispatchSystem | null;
  positions: StockPosition[];
  consist: string;
  onConsist: (id: string) => void;
  offset: number;
  onOffset: (i: number) => void;
  keyPos: number;
  onSegKey: (i: number) => void;
  onSegKeyLocked: () => void;
  segKeyPresent: boolean;
  onDeskKey: (i: number) => void;
  onDeskKeyLocked: () => void;
  deskKeyPresent: boolean;
  onOrigin: (id: string) => void;
  onDestination: (id: string) => void;
  onSetRoute: () => void;
  onCancelRoute: () => void;
  onClearSignals: () => void;
  onDispatch: () => void;
  ann: Record<string, AnnPoint>;
  onAck: (ids: string[]) => void;
  onReset: (ids: string[]) => void;
  instruction: string | null;
  reducedMotion: boolean;
  now: number;
  scale: number;
}

const short = (id: string) => id.replace('ALPHA-', 'A').replace('BETA-', 'B').replace('GAMMA-', 'G');

/** Route strip: platforms as boxes, legs as mimic lines that fill as the route is set. */
function RouteStrip({ route, model, routeState, signal, reducedMotion }: { route: string[]; model: SimModel; routeState: RouteState; signal: SignalState; reducedMotion: boolean }) {
  const [filled, setFilled] = useState(0);
  const legs = Math.max(0, route.length - 1);
  useEffect(() => {
    if (routeState !== 'setting' || reducedMotion) {
      setFilled(routeState === 'set' || routeState === 'setting' ? legs : 0);
      return;
    }
    setFilled(0);
    const step = DSP.working.routeSetMs / Math.max(1, legs);
    let n = 0;
    const h = setInterval(() => {
      n += 1;
      setFilled(Math.min(n, legs));
      if (n >= legs) clearInterval(h);
    }, step);
    return () => clearInterval(h);
  }, [routeState, legs, reducedMotion]);
  const boxW = 40;
  const gap = 30;
  const w = Math.max(300, route.length * (boxW + gap) + 10);
  const h = 54;
  const y = 16;
  if (!route.length)
    return (
      <MimicSvg width={300} height={h} label="Route: none entered">
        <text x={150} y={32} text-anchor="middle" class="dsp-mimic-t">
          NO ROUTE ENTERED
        </text>
      </MimicSvg>
    );
  return (
    <div class="dsp-strip">
      <MimicSvg width={w} height={h} label={`Route ${route.join(' to ')}, ${routeState === 'set' ? 'set' : routeState === 'setting' ? 'setting' : 'not set'}`}>
        {route.slice(1).map((_, i) => {
          const x0 = 5 + i * (boxW + gap) + boxW;
          const x1 = x0 + gap;
          const link = model.links.find((l) => (l.a === route[i] && l.b === route[i + 1]) || (l.b === route[i] && l.a === route[i + 1]));
          const state = i < filled ? (signal === 'clear' ? 'flow' : 'live') : 'dead';
          return (
            <g key={i}>
              <MimicLine points={[[x0, y + 11], [x1, y + 11]]} state={state} weight={link?.kind === 'RAIL' ? 4 : 2} />
              <text x={(x0 + x1) / 2} y={y + 32} text-anchor="middle" class="dsp-mimic-t">
                {link ? (link.kind === 'RAIL' ? link.key : `${link.netCode}${String(link.linkNo).padStart(2, '0')}`) : ''}
              </text>
            </g>
          );
        })}
        {route.map((id, i) => (
          <MimicBox key={id} x={5 + i * (boxW + gap)} y={y} w={boxW} h={22} label={short(id)} on={i < filled + 1 && routeState !== 'pending' && routeState !== 'none'} />
        ))}
      </MimicSvg>
    </div>
  );
}

export function DeskPanel(p: DeskPanelProps) {
  const nodes = [...new Set(p.model.links.flatMap((l) => [l.a, l.b]))].sort();
  const legs = p.route.length >= 2 ? (runLegs(p.model, p.route, dwellMsFor(p.system ?? 'RAIL')) ?? []) : [];
  const runMin = legs.length ? Math.round(legs[legs.length - 1]!.end / 60_000) : 0;
  const miles = routeMiles(p.model, p.route);
  const origin = p.route[0] ?? '';
  const dest = p.route.length >= 2 ? p.route[p.route.length - 1]! : '';
  const stock = p.positions.filter((s) => !p.system || s.stock.system === p.system);
  const seg04 = crossesSeg04(p.model, p.route);
  const offsets = DSP.working.departOffsetsMin.map((m) => (m === 0 ? 'NOW' : `+${m}`));
  return (
    <PanelFrame title={p.training ? DSP.training.plate : DSP.desk.plate} panelNo={DSP.desk.panelNo} columns={1}>
      {p.training && <p class="dsp-note dsp-warn">Time compressed {p.scale} to 1. Movements are not passed to Network Control.</p>}
      <PanelSection title="ROUTE" columns={1}>
        <div class="dsp-od">
          <Select label="Origin" value={origin} options={nodes.map((n) => ({ value: n, label: n }))} emptyLabel="(platform)" onChange={(v) => p.onOrigin(v)} />
          <Select label="Destination" value={dest} options={nodes.filter((n) => n !== origin).map((n) => ({ value: n, label: n }))} emptyLabel="(platform)" onChange={(v) => p.onDestination(v)} disabled={!origin} />
        </div>
        <RouteStrip route={p.route} model={p.model} routeState={p.routeState} signal={p.signal} reducedMotion={p.reducedMotion} />
        <div class="dsp-row">
          <SegmentDisplay label="MILES" value={miles} digits={5} />
          <SegmentDisplay label="RUN MIN" value={runMin} digits={4} />
          <Lamp legend={['ROUTE', 'SET']} lit={p.routeState === 'set'} color="white" showState words={{ on: 'SET', off: p.routeState === 'setting' ? 'SETTING' : 'NOT SET' }} />
          <PushButton legend={['SET', 'ROUTE']} color="white" lit={p.routeState === 'setting'} onPress={p.onSetRoute} tag="F5" />
          <PushButton legend={['CANCEL', 'ROUTE']} color="grey" onPress={p.onCancelRoute} tag="ESC" />
        </div>
      </PanelSection>
      <PanelSection title="CONSIST AND DEPARTURE" columns={1}>
        <Select
          label="Consist"
          value={p.consist}
          emptyLabel="(spare stock)"
          options={stock.map((s) => ({
            value: s.stock.id,
            label: `${s.stock.id}  ${s.stock.type}  ${s.at ? `at ${s.at}` : 'on a run'}${s.stock.available ? '' : ', not available'}`,
          }))}
          onChange={p.onConsist}
        />
        <p class="dsp-note">{p.positions.find((s) => s.stock.id === p.consist)?.stock.remark ?? 'Spare stock only. In-service consists are allocated to timetable paths.'}</p>
        <SelectorSwitch label="DEPART" positions={offsets} value={p.offset} onChange={p.onOffset} tag="MIN" />
      </PanelSection>
      <PanelSection title="SIGNALS AND DISPATCH" columns={1}>
        <div class="dsp-row">
          <Lamp legend={['STARTER', 'DANGER']} lit={p.signal !== 'clear'} color="red" size="sm" />
          <Lamp legend={['STARTER', 'PROCEED']} lit={p.signal === 'clear'} color="green" size="sm" />
          <Lamp legend={['RELEASE', short(SEG04.releaseDesk.replace('TC/', ''))]} lit={p.signal === 'release' || !!p.instruction} color="amber" size="sm" />
          <PushButton legend={['CLEAR', 'SIGNALS']} color="green" lit={p.signal === 'clearing'} onPress={p.onClearSignals} tag="F6" />
          <PushButton legend={['DIS-', 'PATCH']} color="white" lit={p.signal === 'clear'} onPress={p.onDispatch} tag="F7" />
        </div>
        {p.instruction && <Plate text={`INSTRUCTION ${p.instruction}: CONSIST IDENTITY SUPPRESSED`} variant="dark" size="sm" />}
      </PanelSection>
      <PanelSection title="KEYS" columns={2}>
        <KeySwitch label="DESK" positions={['LIVE', 'TRAINING']} value={p.training ? 1 : 0} keyPresent={p.deskKeyPresent} keyNo={DSP.desk.id.replace('/', '-')} removableAt={[1]} onChange={p.onDeskKey} onLocked={p.onDeskKeyLocked} />
        <KeySwitch
          label={[`SEG ${SEG04.segment}`, 'WORKING']}
          positions={SEG04.positions}
          value={p.training ? 0 : p.keyPos}
          keyPresent={p.segKeyPresent}
          keyNo={SEG04.keyNo}
          removableAt={[0]}
          onChange={p.onSegKey}
          onLocked={p.onSegKeyLocked}
          tag={seg04 ? 'ROUTE' : undefined}
        />
      </PanelSection>
      <Annunciator
        label="DESK ANNUNCIATOR"
        columns={4}
        tileWidth={84}
        tiles={ANN_TILES.map((t) => ({ ...t, seq: p.ann[t.id]?.seq ?? 'normal' }))}
        onAck={p.onAck}
        onReset={p.onReset}
        reducedMotion={p.reducedMotion || undefined}
      />
    </PanelFrame>
  );
}
