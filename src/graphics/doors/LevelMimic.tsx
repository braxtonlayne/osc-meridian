/**
 * @graphics/doors: level-by-level door mimic for the Door and Airlock Control board.
 * Flat 2008 HMI drawing, same hand as @graphics/panel: 1px rules, token colours only,
 * no glow. Every door is a plan-view glyph whose leaf slides into its pocket as it opens.
 * Pure props in, `onSelect` out; positions are supplied by the app (it owns the clock).
 */
import type { TargetedKeyboardEvent } from 'preact';
import './doors.css';

export type MimicDoorPos = 'closed-locked' | 'unlocking' | 'opening' | 'open' | 'closing' | 'seated';

export interface MimicLeaf {
  frac: number; // 0 closed .. 1 open
  pos: MimicDoorPos;
}

export interface MimicDoor {
  type: 'door';
  id: string;
  tag: string; // "BD1"
  kind: 'portal' | 'blast';
  leaf: MimicLeaf;
  alarm?: boolean;
  override?: boolean;
  /** Seal drill holds this door. */
  held?: boolean;
  /** Withheld from this operator: drawn as a closed black block with no tag. */
  withheld?: boolean;
  title: string; // accessible name
}

export interface MimicAirlock {
  type: 'airlock';
  id: string;
  tag: string; // "AL1"
  outer: MimicLeaf;
  inner: MimicLeaf;
  /** Chamber pressure as a fraction of shelter overpressure (0 = outside, 1 = inside). */
  chamber: number;
  decon?: boolean;
  alarm?: boolean;
  withheld?: boolean;
  title: string;
}

export type MimicItem = MimicDoor | MimicAirlock;

export interface MimicLevelRow {
  n: number;
  /** Level name, or null when withheld (a bar of `withheldLen` characters is drawn). */
  name: string | null;
  withheldLen?: number;
  items: MimicItem[];
}

export interface LevelMimicProps {
  site: string;
  levels: MimicLevelRow[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** Grey out the whole mimic (indication lost). */
  stale?: boolean;
  /** Caption under the title block, e.g. "Indication only". */
  note?: string;
}

const LABEL_W = 300;
const SLOT_W = 70;
const ROW_H = 54;
const ROW_EMPTY_H = 20;
const TOP = 28;
const BOTTOM = 26;

const isTravel = (p: MimicDoorPos) => p === 'opening' || p === 'closing' || p === 'unlocking' || p === 'seated';

function Leaf({ x, y, w, h, leaf, heavy }: { x: number; y: number; w: number; h: number; leaf: MimicLeaf; heavy: boolean }) {
  // Opening between the jambs is [x, x + w]; the pocket is to the right, the leaf slides into it.
  const off = Math.max(0, Math.min(1, leaf.frac)) * w;
  const locked = leaf.pos === 'closed-locked';
  return (
    <g class={`dm-leaf${isTravel(leaf.pos) ? ' is-travel' : ''}${leaf.pos === 'open' ? ' is-open' : ''}`}>
      <rect x={x} y={y + h / 2 - 2} width={w} height={4} class="dm-gap" />
      <rect x={x + off + 0.5} y={y + h / 2 - (heavy ? 5 : 3.5)} width={w - 1} height={heavy ? 10 : 7} class="dm-leafrect" />
      {locked ? (
        <g class="dm-bolts">
          <path d={`M${x - 3} ${y + h / 2} h6 M${x + w - 3} ${y + h / 2} h6`} />
        </g>
      ) : null}
    </g>
  );
}

/** Alarm: the house status square (10px) and word. The glyph's accessible name says "alarm". */
function AlarmMark({ x, y }: { x: number; y: number }) {
  return (
    <g class="dm-deco" aria-hidden="true">
      <rect x={x} y={y} width={10} height={10} class="dm-alm-sq" />
      <text x={x + 13} y={y + 9} class="dm-alm">
        ALM
      </text>
    </g>
  );
}

function DoorGlyph({ d, x, y, selected, onSelect }: { d: MimicDoor; x: number; y: number; selected: boolean; onSelect?: (id: string) => void }) {
  const w = 30;
  const h = 22;
  const heavy = d.kind === 'blast';
  const act = (e: TargetedKeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(d.id);
    }
  };
  if (d.withheld) {
    return (
      <g class="dm-item dm-withheld" transform={`translate(${x} ${y})`} role="img" aria-label="Door withheld">
        <rect x={6} y={6} width={w + 12} height={h - 4} class="dm-rx" />
      </g>
    );
  }
  // The button's only text is its tag, which leads its accessible name (WCAG 2.5.3); the alarm
  // mark is drawn beside it in an aria-hidden layer.
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        class={`dm-item${selected ? ' is-selected' : ''}${d.alarm ? ' is-alarm' : ''}`}
        role="button"
        tabindex={0}
        aria-label={`${d.tag}: ${d.title}${d.alarm ? ', alarm' : ''}`}
        aria-pressed={selected}
        onClick={() => onSelect?.(d.id)}
        onKeyDown={act}
      >
        <rect x={0} y={0} width={SLOT_W - 12} height={ROW_H - 10} class="dm-hit" />
        {/* jambs and pocket */}
        <path d={`M8 4 v${h} M${8 + w} 4 v${h}`} class={`dm-jamb${heavy ? ' dm-jamb--heavy' : ''}`} />
        <path d={`M${8 + w} 6 h${w - 6} M${8 + w} ${h + 2} h${w - 6}`} class="dm-pocket" />
        <Leaf x={8} y={4} w={w} h={h} leaf={d.leaf} heavy={heavy} />
        {d.override ? <rect x={2} y={1} width={4} height={4} class="dm-ovr" /> : null}
        {d.held ? <path d={`M2 ${h + 1} h4`} class="dm-held" /> : null}
        <text x={8} y={h + 15} class="dm-tag">
          {d.tag}
        </text>
        {selected ? <rect x={0.5} y={0.5} width={SLOT_W - 13} height={ROW_H - 11} class="dm-sel" /> : null}
      </g>
      {d.alarm ? <AlarmMark x={30} y={h + 6} /> : null}
    </g>
  );
}

function AirlockGlyph({ a, x, y, selected, onSelect }: { a: MimicAirlock; x: number; y: number; selected: boolean; onSelect?: (id: string) => void }) {
  const w = 18;
  const chW = 28;
  const h = 22;
  const act = (e: TargetedKeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(a.id);
    }
  };
  if (a.withheld) {
    return (
      <g class="dm-item dm-withheld" transform={`translate(${x} ${y})`} role="img" aria-label="Airlock withheld">
        <rect x={6} y={6} width={SLOT_W * 2 - 30} height={h - 4} class="dm-rx" />
      </g>
    );
  }
  const total = SLOT_W * 2 - 12;
  const chX = 8 + w + 4;
  const fill = Math.max(0, Math.min(1, a.chamber));
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        class={`dm-item dm-airlock${selected ? ' is-selected' : ''}${a.alarm ? ' is-alarm' : ''}${a.decon ? ' is-decon' : ''}`}
        role="button"
        tabindex={0}
        aria-label={`${a.tag}${a.decon ? ' DECON' : ''}: ${a.title}${a.alarm ? ', alarm' : ''}`}
        aria-pressed={selected}
        onClick={() => onSelect?.(a.id)}
        onKeyDown={act}
      >
        <rect x={0} y={0} width={total} height={ROW_H - 10} class="dm-hit" />
        {/* outer leaf (left, outside), chamber, inner leaf (right, inside) */}
        <path d={`M8 4 v${h} M${8 + w} 4 v${h}`} class="dm-jamb" />
        <Leaf x={8} y={4} w={w} h={h} leaf={a.outer} heavy={false} />
        <rect x={chX} y={4} width={chW} height={h} class="dm-chamber" />
        <rect x={chX + 2} y={4 + h - 2 - (h - 4) * fill} width={chW - 4} height={(h - 4) * fill} class="dm-press" />
        <path d={`M${chX + chW + 4} 4 v${h} M${chX + chW + 4 + w} 4 v${h}`} class="dm-jamb" />
        <Leaf x={chX + chW + 4} y={4} w={w} h={h} leaf={a.inner} heavy={false} />
        <text x={8} y={h + 15} class="dm-tag">
          {a.tag}
          {a.decon ? ' DECON' : ''}
        </text>
        {selected ? <rect x={0.5} y={0.5} width={total - 1} height={ROW_H - 11} class="dm-sel" /> : null}
      </g>
      {/* outside (O) and inside (I) side letters, beside the button */}
      <g class="dm-deco" aria-hidden="true">
        <text x={2} y={h / 2 + 7} class="dm-side">
          O
        </text>
        <text x={chX + chW + w + 12} y={h / 2 + 7} class="dm-side">
          I
        </text>
      </g>
      {a.alarm ? <AlarmMark x={total - 40} y={h + 6} /> : null}
    </g>
  );
}

/** Level-by-level mimic. Rows without doors are drawn short; withheld names as a bar. */
export function LevelMimic({ site, levels, selected = null, onSelect, stale = false, note }: LevelMimicProps) {
  const slots = (it: MimicItem) => (it.type === 'airlock' ? 2 : 1);
  const maxSlots = Math.max(4, ...levels.map((l) => l.items.reduce((n, it) => n + slots(it), 0)));
  const W = LABEL_W + maxSlots * SLOT_W + 16;
  let y = TOP;
  const rows = levels.map((l) => {
    const h = l.items.length ? ROW_H : ROW_EMPTY_H;
    const row = { l, y, h };
    y += h;
    return row;
  });
  const H = y + BOTTOM;
  return (
    <svg
      class={`dm-svg${stale ? ' is-stale' : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      width={Math.round(W * 1.3)}
      role="group"
      aria-label={`${site} door mimic, ${levels.length} levels`}
      preserveAspectRatio="xMinYMin meet"
    >
      <rect x={0} y={0} width={W} height={H} class="dm-bg" />
      <text x={8} y={17} class="dm-title">
        {site} DOORS BY LEVEL
      </text>
      <text x={W - 8} y={17} text-anchor="end" class="dm-note">
        {note ?? 'NOT TO SCALE'}
      </text>
      {rows.map(({ l, y: ry }) => {
        let sx = LABEL_W;
        return (
          <g key={l.n} class={`dm-row${l.items.length ? '' : ' is-empty'}`}>
            <line x1={0} x2={W} y1={ry + 0.5} y2={ry + 0.5} class="dm-rule" />
            <text x={8} y={ry + (l.items.length ? 18 : 14)} class="dm-lvn">
              {String(l.n).padStart(2, '0')}
            </text>
            {l.name != null ? (
              <text x={30} y={ry + (l.items.length ? 18 : 14)} class="dm-lvname">
                {l.name.length > 46 ? `${l.name.slice(0, 44).trimEnd()}...` : l.name}
              </text>
            ) : (
              <rect x={30} y={ry + (l.items.length ? 9 : 5)} width={Math.min(250, (l.withheldLen ?? 20) * 5.6)} height={11} class="dm-rx" />
            )}
            {l.items.map((it) => {
              const x = sx;
              sx += slots(it) * SLOT_W;
              return it.type === 'airlock' ? (
                <AirlockGlyph key={it.id} a={it} x={x} y={ry + 5} selected={selected === it.id} onSelect={onSelect} />
              ) : (
                <DoorGlyph key={it.id} d={it} x={x} y={ry + 5} selected={selected === it.id} onSelect={onSelect} />
              );
            })}
          </g>
        );
      })}
      <line x1={0} x2={W} y1={y + 0.5} y2={y + 0.5} class="dm-rule" />
      <g transform={`translate(8 ${y + 17})`} class="dm-key">
        <rect x={0} y={-7} width={14} height={6} class="dm-leafrect" />
        <text x={18} y={-1}>CLOSED</text>
        <rect x={70} y={-7} width={14} height={6} class="dm-leafrect dm-key-travel" />
        <text x={88} y={-1}>IN TRAVEL</text>
        <path d="M156 -4 h8" class="dm-bolts-key" />
        <text x={168} y={-1}>LOCKED</text>
        <rect x={222} y={-8} width={4} height={4} class="dm-ovr" />
        <text x={230} y={-1}>OVERRIDE</text>
        <path d="M290 -3 h6" class="dm-held" />
        <text x={300} y={-1}>DRILL HOLD</text>
      </g>
    </svg>
  );
}
