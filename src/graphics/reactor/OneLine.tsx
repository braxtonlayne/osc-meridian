/**
 * ReactorOneLine: station electrical single-line diagram for one reactor
 * installation, drawn from canon via ./model.ts.
 *
 * Conventions: breaker = square (filled CLOSED, hollow OPEN, always with the
 * word beside it); transformer = two circles; bus = heavy bar; energized
 * conductors solid, de-energized conductors dashed. Status colours appear only
 * as 10px squares beside a status word.
 */
import type { ComponentChildren, JSX } from 'preact';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import { buildPlant, fmtKV, fmtMW, solve, wrap } from './model';
import type { BreakerState, LiveInput, StatusId } from './model';
import './reactor.css';

const canon = canonJson as unknown as Canon;

export interface ReactorOneLineProps {
  reactorId: string;
  live?: LiveInput;
  /**
   * Shown in place of the site id and codename (title block and accessible name) when the
   * site identity is not released to the operator, e.g. "BETA SITE". Omit to show the site.
   */
  siteMask?: string;
  class?: string;
}

const W = 1160;
const H = 730;
const Y_MV = 215;
const Y_EDG = 345;
const Y_ESS = 455;

const SQ: Record<StatusId, string> = {
  NOMINAL: 'rx-sq rx-sq--nominal',
  DEGRADED: 'rx-sq rx-sq--degraded',
  FAULT: 'rx-sq rx-sq--fault',
  OFFLINE: 'rx-sq rx-sq--offline',
};

function Seg({ pts, live }: { pts: readonly (readonly [number, number])[]; live: boolean }) {
  return (
    <polyline
      class={live ? 'rx-wire' : 'rx-wire rx-wire--dead'}
      points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')}
    />
  );
}

function Bus({ x1, x2, y, live }: { x1: number; x2: number; y: number; live: boolean }) {
  return <line class={live ? 'rx-bus' : 'rx-bus rx-bus--dead'} x1={x1} y1={y} x2={x2} y2={y} />;
}

function T({
  x,
  y,
  children,
  anchor = 'start',
  cls = '',
}: {
  x: number;
  y: number;
  children: ComponentChildren;
  anchor?: 'start' | 'middle' | 'end';
  cls?: string;
}) {
  return (
    <text x={x} y={y} text-anchor={anchor} class={`rx-t ${cls}`}>
      {children}
    </text>
  );
}

/** 10px status square followed by its word; x,y is the text baseline start. */
function StatusTag({
  x,
  y,
  status,
  word,
  anchor = 'start',
}: {
  x: number;
  y: number;
  status: StatusId;
  word: string;
  anchor?: 'start' | 'middle';
}) {
  const w = 14 + word.length * 6;
  const x0 = anchor === 'middle' ? x - w / 2 : x;
  return (
    <g>
      <rect x={x0} y={y - 9} width={10} height={10} class={SQ[status]} />
      <T x={x0 + 14} y={y}>
        {word}
      </T>
    </g>
  );
}

function Breaker({
  x,
  y,
  tag,
  state,
  side = 'right',
}: {
  x: number;
  y: number;
  tag: string;
  state: BreakerState;
  side?: 'right' | 'left' | 'above';
}) {
  const closed = state === 'CLOSED';
  const lx = side === 'right' ? x + 11 : side === 'left' ? x - 11 : x;
  const anchor = side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle';
  const y1 = side === 'above' ? y - 22 : y - 1;
  const y2 = side === 'above' ? y - 11 : y + 9;
  return (
    <g>
      <rect x={x - 6} y={y - 6} width={12} height={12} class={closed ? 'rx-brk rx-brk--closed' : 'rx-brk rx-brk--open'} />
      <T x={lx} y={y1} anchor={anchor} cls="rx-b">
        {tag}
      </T>
      <T x={lx} y={y2} anchor={anchor} cls={closed ? 'rx-s' : 'rx-s rx-b'}>
        {state}
      </T>
    </g>
  );
}

function Xfmr({ x, y, live, lines }: { x: number; y: number; live: boolean; lines: string[] }) {
  const cls = live ? 'rx-sym' : 'rx-sym rx-sym--dead';
  return (
    <g>
      <circle cx={x} cy={y - 6} r={9} class={cls} />
      <circle cx={x} cy={y + 6} r={9} class={`${cls} rx-sym--open`} />
      {lines.map((l, i) => (
        <T x={x + 15} y={y - 5 + i * 11} cls={i === 0 ? 'rx-b' : 'rx-s'}>
          {l}
        </T>
      ))}
    </g>
  );
}

function Ats({
  x,
  y,
  tag,
  pos,
  nx,
  ex,
  live,
  labelSide,
}: {
  x: number;
  y: number;
  tag: string;
  pos: 'NORMAL' | 'EMERGENCY';
  nx: number;
  ex: number;
  live: boolean;
  labelSide: 'left' | 'right';
}) {
  const tx = pos === 'NORMAL' ? nx : ex;
  const lx = labelSide === 'left' ? x - 47 : x + 47;
  const anchor = labelSide === 'left' ? 'end' : 'start';
  return (
    <g>
      <rect x={x - 40} y={y} width={80} height={36} class="rx-sym" />
      <line x1={x} y1={y + 29} x2={tx} y2={y + 8} class={live ? 'rx-wire' : 'rx-wire rx-wire--dead'} />
      <circle cx={nx} cy={y + 7} r={2.5} class="rx-dot" />
      <circle cx={ex} cy={y + 7} r={2.5} class="rx-dot" />
      <circle cx={x} cy={y + 29} r={2.5} class="rx-dot" />
      <T x={nx < x ? nx - 6 : nx + 6} y={y + 22} anchor={nx < x ? 'end' : 'start'} cls="rx-s">
        N
      </T>
      <T x={ex < x ? ex - 6 : ex + 6} y={y + 22} anchor={ex < x ? 'end' : 'start'} cls="rx-s">
        E
      </T>
      <T x={lx} y={y + 15} anchor={anchor} cls="rx-b">
        {tag}
      </T>
      <T x={lx} y={y + 26} anchor={anchor} cls={pos === 'NORMAL' ? 'rx-s' : 'rx-s rx-b'}>
        {pos}
      </T>
    </g>
  );
}

function Frame() {
  const cols = 8;
  const rows = 5;
  const cw = (W - 36) / cols;
  const rh = (H - 36) / rows;
  const marks: JSX.Element[] = [];
  for (let i = 0; i < cols; i++) {
    const cx = 18 + cw * (i + 0.5);
    marks.push(
      <T x={cx} y={15} anchor="middle" cls="rx-zone">
        {cols - i}
      </T>,
      <T x={cx} y={H - 8} anchor="middle" cls="rx-zone">
        {cols - i}
      </T>,
    );
    if (i > 0) {
      const x = 18 + cw * i;
      marks.push(<line x1={x} y1={6} x2={x} y2={18} class="rx-hair" />, <line x1={x} y1={H - 18} x2={x} y2={H - 6} class="rx-hair" />);
    }
  }
  for (let j = 0; j < rows; j++) {
    const cy = 18 + rh * (j + 0.5) + 3;
    const letter = String.fromCharCode(65 + rows - 1 - j);
    marks.push(
      <T x={12} y={cy} anchor="middle" cls="rx-zone">
        {letter}
      </T>,
      <T x={W - 12} y={cy} anchor="middle" cls="rx-zone">
        {letter}
      </T>,
    );
    if (j > 0) {
      const y = 18 + rh * j;
      marks.push(<line x1={6} y1={y} x2={18} y2={y} class="rx-hair" />, <line x1={W - 18} y1={y} x2={W - 6} y2={y} class="rx-hair" />);
    }
  }
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} class="rx-sheet" />
      <rect x={6} y={6} width={W - 12} height={H - 12} class="rx-hairbox" />
      <rect x={18} y={18} width={W - 36} height={H - 36} class="rx-border" />
      {marks}
    </g>
  );
}

export function ReactorOneLine({ reactorId, live, siteMask, class: cls }: ReactorOneLineProps) {
  const plant = buildPlant(canon, reactorId);
  if (!plant) {
    return (
      <div class={`rx-oneline ${cls ?? ''}`} role="img" aria-label={`No reactor record ${reactorId}`}>
        <span class="rx-mono">NO RECORD: {reactorId}</span>
      </div>
    );
  }
  const s = solve(plant, live);
  const { reactor: r, facility: f } = plant;
  const on = r.status === 'NOMINAL' || r.status === 'DEGRADED';
  const b = (tag: string): BreakerState => s.breakers[tag] ?? 'OPEN';
  const mv = fmtKV(plant.mvKV);
  const ess = fmtKV(plant.essKV);
  const busBEnd = plant.isAlpha ? 1100 : 1010;
  const dgX = plant.dgCount === 3 ? [500, 560, 620] : [530, 590];
  const loadsA = plant.loads.filter((l) => l.bus === 'EA');
  const loadsB = plant.loads.filter((l) => l.bus === 'EB');
  const railLoad = plant.loads.find((l) => l.bus === 'MV');
  const loadX = (bus: 'EA' | 'EB', i: number, n: number) => {
    const x0 = bus === 'EA' ? 100 : 680;
    const span = 340;
    return x0 + (span / n) * (i + 0.5);
  };
  const siteName = siteMask ?? `${r.site}${f?.codename ? ` ${f.codename}` : ''}`;
  const fe = canon.divisions.find((d) => d.id === 'FE');
  const noteLines = wrap(r.statusNote.toUpperCase(), 75).slice(0, 3);
  const pct = Math.round(plant.loadFraction * 100);

  const notes = [
    `UNIT G-1 RATED ${r.electricMWe} MWe AT ${mv}. DESIGN STATION LOAD ${fmtMW(plant.stationLoadMW)} MW (${pct}% OF RATED).`,
    'SITE OPERATES ISLANDED. UTILITY TIE 52-U1 NORMALLY OPEN.',
    'ATS-A AND ATS-B TRANSFER ESSENTIAL BUSES TO EDG BUS ON LOSS OF NORMAL SOURCE.',
    `${plant.dgCount} x ${plant.dgRatingMW} MW DIESEL GENERATOR SETS.` +
      (plant.dieselDays !== null ? ` FUEL STORAGE ${plant.dieselDays} DAYS RUNTIME.` : ''),
    'SURFACE SUPPLY 52-S1 NORMALLY OPEN. CLOSED WITH UNIT OFF LINE.',
  ];
  if (railLoad) notes.push(`RAIL TRACTION FEEDER ${railLoad.tag} SHED ON LOSS OF UNIT GENERATOR.`);

  const unitWord = r.status;
  const dgWord = (i: number): [StatusId, string] =>
    s.dgRunning[i] ? (b(`52-D${i + 1}`) === 'CLOSED' ? ['NOMINAL', 'RUN'] : ['DEGRADED', 'IDLE']) : ['OFFLINE', 'STBY'];

  const label =
    `${siteName} station electrical one-line diagram. ${r.id} ${r.designation}, ${r.thermalMWt} MWt, ${r.electricMWe} MWe. ` +
    `Unit status ${r.status}. Generator breaker 52-G1 ${b('52-G1')}. Utility tie 52-U1 ${b('52-U1')}. ` +
    `Station load ${fmtMW(s.totalMW)} MW: unit ${fmtMW(s.genMW)} MW, diesel ${fmtMW(s.dieselMW)} MW, surface supply ${fmtMW(s.surfaceMW)} MW.`;

  return (
    <div class={`rx-oneline ${cls ?? ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} class="rx-svg">
        <title>{`${r.id} one-line diagram`}</title>
        <Frame />

        {/* ---- Reactor, turbine, generator ---- */}
        <rect x={34} y={58} width={104} height={56} class="rx-sym" />
        <T x={86} y={76} anchor="middle" cls="rx-b">
          {r.id}
        </T>
        <T x={86} y={89} anchor="middle" cls="rx-s">
          REACTOR
        </T>
        <T x={86} y={102} anchor="middle" cls="rx-s">
          {r.thermalMWt} MWt
        </T>
        <StatusTag x={34} y={129} status={r.status} word={unitWord} />
        <line x1={138} y1={86} x2={172} y2={86} class={on ? 'rx-steam' : 'rx-steam rx-wire--dead'} />
        <T x={155} y={79} anchor="middle" cls="rx-s">
          STEAM
        </T>
        <polygon points="172,78 208,66 208,106 172,94" class={on ? 'rx-sym' : 'rx-sym rx-sym--dead'} />
        <T x={190} y={122} anchor="middle" cls="rx-b">
          TG-1
        </T>
        <line x1={208} y1={84} x2={234} y2={84} class="rx-wire" />
        <line x1={208} y1={88} x2={234} y2={88} class="rx-wire" />
        <Seg pts={[[250, 102], [250, 159]]} live={on} />
        <circle cx={250} cy={86} r={16} class={on ? 'rx-sym' : 'rx-sym rx-sym--dead'} />
        <T x={250} y={90} anchor="middle" cls="rx-b rx-big">
          G
        </T>
        <T x={274} y={74} cls="rx-b">
          G-1
        </T>
        <T x={274} y={85} cls="rx-s">
          {r.electricMWe} MWe {mv}
        </T>
        <T x={274} y={96} cls="rx-s">
          3PH 60 Hz 0.85 PF
        </T>
        <T x={274} y={109} cls="rx-b">
          OUTPUT {fmtMW(s.genMW)} MW
        </T>
        <Seg pts={[[250, 171], [250, Y_MV]]} live={s.busA} />
        <Breaker x={250} y={165} tag="52-G1" state={b('52-G1')} />

        {/* ---- Utility tie ---- */}
        <line x1={746} y1={40} x2={774} y2={40} class="rx-bus rx-bus--thin" />
        <path d="M749 40 l-4 -7 M756 40 l-4 -7 M763 40 l-4 -7 M770 40 l-4 -7 M777 40 l-4 -7" class="rx-wire" />
        <Seg pts={[[760, 40], [760, 159]]} live />
        <Xfmr x={760} y={100} live lines={['T-U1', `${plant.utilityMVA} MVA`, `${fmtKV(plant.utilKV).replace(' kV', '')}/${mv}`]} />
        <T x={784} y={46} cls="rx-b">
          UTILITY TIE
        </T>
        <T x={784} y={57} cls="rx-s">
          {fmtKV(plant.utilKV)} SERVICE
        </T>
        <StatusTag
          x={784}
          y={71}
          status={b('52-U1') === 'OPEN' ? 'OFFLINE' : 'DEGRADED'}
          word={b('52-U1') === 'OPEN' ? 'ISOLATED' : 'PARALLEL'}
        />
        <Seg pts={[[760, 171], [760, Y_MV]]} live={s.busB} />
        <Breaker x={760} y={165} tag="52-U1" state={b('52-U1')} />
        {b('52-U1') === 'OPEN' ? (
          <T x={775} y={187} cls="rx-s">
            SITE ISLANDED
          </T>
        ) : null}

        {/* ---- Surface supply ---- */}
        <rect x={912} y={42} width={36} height={36} class="rx-sym" />
        <line x1={912} y1={78} x2={948} y2={42} class="rx-hair" />
        <path d="M917 50 h10 M917 54 h10" class="rx-wire" />
        <path d="M932 68 q3 -6 6 0 t6 0" class="rx-wire rx-nofill" />
        <Seg pts={[[930, 78], [930, 159]]} live />
        <T x={956} y={48} cls="rx-b">
          SURFACE SUPPLY
        </T>
        <T x={956} y={59} cls="rx-s">
          PV / GEOTHERMAL
        </T>
        <T x={956} y={70} cls="rx-s">
          INV-S1 {plant.surfaceMW} MW
        </T>
        <StatusTag
          x={956}
          y={85}
          status={s.surfaceMW > 0 ? 'NOMINAL' : 'OFFLINE'}
          word={s.surfaceMW > 0 ? `ON LINE ${fmtMW(s.surfaceMW)} MW` : b('52-S1') === 'CLOSED' ? 'FLOATING' : 'STANDBY'}
        />
        <Seg pts={[[930, 171], [930, Y_MV]]} live={s.busB} />
        <Breaker x={930} y={165} tag="52-S1" state={b('52-S1')} />

        {/* ---- Switchgear buses and tie ---- */}
        <Bus x1={90} x2={520} y={Y_MV} live={s.busA} />
        <Bus x1={600} x2={busBEnd} y={Y_MV} live={s.busB} />
        <T x={92} y={Y_MV - 8} cls="rx-b">
          {mv} SWGR BUS A
        </T>
        <T x={604} y={Y_MV - 8} cls="rx-b">
          {mv} SWGR BUS B
        </T>
        <Seg pts={[[520, Y_MV], [554, Y_MV]]} live={s.busA} />
        <Seg pts={[[566, Y_MV], [600, Y_MV]]} live={s.busB} />
        <Breaker x={560} y={Y_MV} tag="52-BT" state={b('52-BT')} side="above" />

        {/* ---- Station service A ---- */}
        <Seg pts={[[255, Y_MV], [255, 249]]} live={s.busA} />
        <Seg pts={[[255, 261], [255, 372]]} live={s.normA} />
        <Breaker x={255} y={255} tag="52-A1" state={b('52-A1')} />
        <Xfmr x={255} y={302} live={s.normA} lines={['T-1A', `${plant.serviceMVA} MVA`, `${mv.replace(' kV', '')}/${ess}`]} />
        <Seg pts={[[470, Y_EDG], [295, Y_EDG], [295, 372]]} live={s.edgBus} />
        <Ats x={275} y={365} tag="ATS-A" pos={s.atsA} nx={255} ex={295} live={s.essA} labelSide="left" />
        <Seg pts={[[275, 394], [275, Y_ESS]]} live={s.essA} />

        {/* ---- Station service B ---- */}
        <Seg pts={[[865, Y_MV], [865, 249]]} live={s.busB} />
        <Seg pts={[[865, 261], [865, 372]]} live={s.normB} />
        <Breaker x={865} y={255} tag="52-B1" state={b('52-B1')} />
        <Xfmr x={865} y={302} live={s.normB} lines={['T-1B', `${plant.serviceMVA} MVA`, `${mv.replace(' kV', '')}/${ess}`]} />
        <Seg pts={[[650, Y_EDG], [825, Y_EDG], [825, 372]]} live={s.edgBus} />
        <Ats x={845} y={365} tag="ATS-B" pos={s.atsB} nx={865} ex={825} live={s.essB} labelSide="right" />
        <Seg pts={[[845, 394], [845, Y_ESS]]} live={s.essB} />

        {/* ---- Diesel generator sets ---- */}
        <Bus x1={470} x2={650} y={Y_EDG} live={s.edgBus} />
        <T x={560} y={Y_EDG - 8} anchor="middle" cls="rx-b">
          {ess} EDG BUS
        </T>
        {dgX.map((x, i) => {
          const tag = `52-D${i + 1}`;
          const run = !!s.dgRunning[i];
          const [st, word] = dgWord(i);
          return (
            <g>
              <Seg pts={[[x, Y_EDG], [x, 369]]} live={s.edgBus} />
              <Seg pts={[[x, 381], [x, 405]]} live={run} />
              <Breaker x={x} y={375} tag={tag} state={b(tag)} />
              <circle cx={x} cy={420} r={15} class={run ? 'rx-sym' : 'rx-sym rx-sym--dead'} />
              <T x={x} y={424} anchor="middle" cls="rx-b">
                DG
              </T>
              <T x={x} y={449} anchor="middle" cls="rx-b">
                DG-{i + 1}
              </T>
              <T x={x} y={460} anchor="middle" cls="rx-s">
                {plant.dgRatingMW} MW
              </T>
              <StatusTag x={x} y={474} status={st} word={word} anchor="middle" />
              {run && b(tag) === 'CLOSED' ? (
                <T x={x} y={486} anchor="middle" cls="rx-s">
                  {fmtMW(s.dgEachMW)} MW
                </T>
              ) : null}
            </g>
          );
        })}
        {plant.dieselDays !== null ? (
          <T x={560} y={503} anchor="middle" cls="rx-s">
            FUEL STORAGE {plant.dieselDays} DAYS RUNTIME
          </T>
        ) : null}

        {/* ---- Essential buses and loads ---- */}
        <Bus x1={100} x2={440} y={Y_ESS} live={s.essA} />
        <Bus x1={680} x2={1010} y={Y_ESS} live={s.essB} />
        <T x={102} y={Y_ESS - 8} cls="rx-b">
          {ess} ESSENTIAL BUS E-A
        </T>
        <T x={682} y={Y_ESS - 8} cls="rx-b">
          {ess} ESSENTIAL BUS E-B
        </T>
        {[...loadsA, ...loadsB].map((l) => {
          const bus = l.bus === 'EA' ? 'EA' : 'EB';
          const list = bus === 'EA' ? loadsA : loadsB;
          const x = loadX(bus, list.indexOf(l), list.length);
          const busLive = bus === 'EA' ? s.essA : s.essB;
          const fed = busLive && b(l.tag) === 'CLOSED';
          return (
            <g>
              <Seg pts={[[x, Y_ESS], [x, 484]]} live={busLive} />
              <Seg pts={[[x, 496], [x, 528]]} live={fed} />
              <polygon points={`${x - 5},526 ${x + 5},526 ${x},536`} class={fed ? 'rx-arrow' : 'rx-arrow rx-arrow--dead'} />
              <Breaker x={x} y={490} tag={l.tag} state={b(l.tag)} />
              <T x={x} y={551} anchor="middle" cls="rx-b">
                {l.label}
              </T>
              <T x={x} y={563} anchor="middle" cls="rx-s">
                {fed ? `${fmtMW(s.loadMW[l.id] ?? 0)} MW` : 'DE-ENERGIZED'}
              </T>
            </g>
          );
        })}

        {/* ---- Rail traction (ALPHA sites) ---- */}
        {railLoad ? (
          <g>
            <Seg pts={[[1065, Y_MV], [1065, 249]]} live={s.busB} />
            <Seg pts={[[1065, 261], [1065, 398]]} live={s.rail} />
            <Breaker x={1065} y={255} tag={railLoad.tag} state={b(railLoad.tag)} />
            <Xfmr x={1065} y={302} live={s.rail} lines={['T-R1', `${plant.tractionMVA} MVA`]} />
            <rect x={1049} y={336} width={32} height={30} class={s.rail ? 'rx-sym' : 'rx-sym rx-sym--dead'} />
            <polygon points="1057,345 1073,345 1065,357" class={s.rail ? 'rx-arrow' : 'rx-arrow rx-arrow--dead'} />
            <line x1={1057} y1={357} x2={1073} y2={357} class="rx-wire" />
            <T x={1087} y={349} cls="rx-b">
              REC-1
            </T>
            <T x={1087} y={360} cls="rx-s">
              12-PULSE
            </T>
            <polygon points="1060,396 1070,396 1065,406" class={s.rail ? 'rx-arrow' : 'rx-arrow rx-arrow--dead'} />
            <T x={1065} y={421} anchor="middle" cls="rx-b">
              RAIL TRACTION
            </T>
            <T x={1065} y={433} anchor="middle" cls="rx-s">
              750 V DC
            </T>
            <T x={1065} y={445} anchor="middle" cls="rx-s">
              {s.rail ? `${fmtMW(s.loadMW[railLoad.id] ?? 0)} MW` : 'SHED'}
            </T>
          </g>
        ) : null}

        {/* ---- Station summary ---- */}
        <rect x={34} y={246} width={176} height={84} class="rx-panel" />
        <rect x={34} y={246} width={176} height={15} class="rx-panelhead" />
        <T x={40} y={257} cls="rx-b">
          STATION SUMMARY
        </T>
        {(
          [
            ['STATION LOAD', s.totalMW],
            ['UNIT G-1', s.genMW],
            ['DIESEL', s.dieselMW],
            ['SURFACE', s.surfaceMW],
            ['UTILITY', s.utilityMW],
          ] as const
        ).map(([k, v], i) => (
          <g>
            <T x={40} y={274 + i * 12} cls="rx-s">
              {k}
            </T>
            <T x={204} y={274 + i * 12} anchor="end" cls={i === 0 ? 'rx-b' : 'rx-s'}>
              {fmtMW(v)} MW
            </T>
          </g>
        ))}

        {/* ---- Notes and legend ---- */}
        <T x={34} y={604} cls="rx-b">
          NOTES
        </T>
        {notes.map((n, i) => (
          <T x={34} y={618 + i * 12} cls="rx-s">
            {i + 1}. {n}
          </T>
        ))}
        <T x={516} y={604} cls="rx-b">
          LEGEND
        </T>
        <rect x={516} y={611} width={10} height={10} class="rx-brk rx-brk--closed" />
        <T x={534} y={620} cls="rx-s">
          BREAKER CLOSED
        </T>
        <rect x={516} y={625} width={10} height={10} class="rx-brk rx-brk--open" />
        <T x={534} y={634} cls="rx-s">
          BREAKER OPEN
        </T>
        <line x1={516} y1={644} x2={530} y2={644} class="rx-wire" />
        <T x={534} y={648} cls="rx-s">
          ENERGIZED
        </T>
        <line x1={516} y1={658} x2={530} y2={658} class="rx-wire rx-wire--dead" />
        <T x={534} y={662} cls="rx-s">
          DE-ENERGIZED
        </T>
        <circle cx={521} cy={670} r={4} class="rx-sym" />
        <circle cx={526} cy={670} r={4} class="rx-sym rx-sym--open" />
        <T x={534} y={676} cls="rx-s">
          TRANSFORMER
        </T>
        <T x={516} y={690} cls="rx-s">
          52 = AC CIRCUIT BREAKER
        </T>
        <T x={516} y={702} cls="rx-s">
          ATS = AUTO TRANSFER SWITCH
        </T>

        {/* ---- Title block ---- */}
        <rect x={722} y={592} width={420} height={120} class="rx-border rx-fill" />
        <path d="M722 608 H1142 M722 646 H1142 M722 690 H1142 M872 690 V712 M922 690 V712 M1042 690 V712" class="rx-hair" />
        <T x={728} y={603} cls="rx-s">
          {canon.meta.agency.toUpperCase()}
        </T>
        <T x={1136} y={603} anchor="end" cls="rx-s">
          {(fe?.name ?? 'Facilities Engineering').toUpperCase()}
        </T>
        <T x={728} y={621} cls="rx-b rx-title">
          {siteName}
        </T>
        <T x={728} y={632} cls="rx-s">
          STATION ELECTRICAL ONE-LINE DIAGRAM
        </T>
        <T x={728} y={642} cls="rx-s">
          {r.id} {r.designation.toUpperCase()} {r.thermalMWt} MWt / {r.electricMWe} MWe
        </T>
        <T x={728} y={657} cls="rx-s">
          UNIT STATUS
        </T>
        <StatusTag x={796} y={657} status={r.status} word={r.status} />
        <T x={1136} y={657} anchor="end" cls="rx-s">
          AS OF {plant.asOf}
        </T>
        {noteLines.map((n, i) => (
          <T x={728} y={666 + i * 9} cls="rx-n">
            {n}
          </T>
        ))}
        {(
          [
            [728, 'DWG NO', plant.drawing.no],
            [878, 'REV', plant.drawing.rev],
            [928, 'DATE', plant.drawing.date],
            [1048, 'SHEET', '1 OF 1'],
          ] as const
        ).map(([x, k, v]) => (
          <g>
            <T x={x} y={697} cls="rx-tiny">
              {k}
            </T>
            <T x={x} y={708} cls="rx-b">
              {v}
            </T>
          </g>
        ))}
      </svg>
    </div>
  );
}
