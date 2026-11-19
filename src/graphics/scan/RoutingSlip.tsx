import { Handwriting, InkSvg, RoutingInitials, type InkGeometry } from './Handwriting';
import { checkStroke, growBounds, handStyle, inkPath } from './pen';
import { hashString, mulberry32 } from './rng';

export interface RoutingEntry {
  /** Typed addressee: a name, office symbol or initials. */
  to: string;
  /** Typed room / office. */
  room?: string;
  /** Handwritten initials once the addressee has seen it; omit for "not yet". */
  initials?: string;
  /** Handwritten date beside the initials, e.g. "5/2". */
  date?: string;
  /** Hand to write in; defaults to the initials. */
  hand?: string;
}

export type RoutingAction = 'ACTION' | 'APPROVAL' | 'COMMENT' | 'FILE' | 'INFORMATION' | 'NOTE AND RETURN' | 'SEE ME' | 'SIGNATURE';

const ACTIONS: readonly RoutingAction[] = ['ACTION', 'APPROVAL', 'COMMENT', 'FILE', 'INFORMATION', 'NOTE AND RETURN', 'SEE ME', 'SIGNATURE'];

export interface RoutingSlipProps {
  entries: readonly RoutingEntry[];
  seed?: number;
  /** Boxes ticked by hand. */
  actions?: readonly RoutingAction[];
  /** Hand that ticked the boxes and wrote the remarks. Defaults to the first initialer. */
  hand?: string;
  /** Handwritten remarks. */
  remarks?: string;
  /** Typed originator line. */
  from?: string;
  /** Typed date on the originator line. */
  date?: string;
  /** Total rows printed on the form; unused rows stay blank. */
  rows?: number;
  class?: string;
}

function tickGeometry(hand: string | undefined, seed: number): InkGeometry {
  const style = handStyle(hand);
  const rng = mulberry32(hashString(`tick|${style.id}|${seed}`));
  const strokes = [checkStroke(0, 0, 8, rng)];
  const b = growBounds({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }, strokes);
  const d = inkPath(strokes, { width: style.pen, variation: style.widthVar }, rng);
  const x = Math.floor(b.minX - 2);
  const y = Math.floor(b.minY - 2);
  const width = Math.ceil(b.maxX + 2) - x;
  const height = Math.ceil(b.maxY + 2) - y;
  return { d, viewBox: `${x} ${y} ${width} ${height}`, width, height, descent: y + height, ink: style.ink };
}

/**
 * A routing slip: pre-printed form, typed addressees, handwritten initials.
 * Typed entries use var(--font-typed).
 */
export function RoutingSlip({ entries, seed = 1, actions = [], hand, remarks, from, date, rows = 5, class: cls }: RoutingSlipProps) {
  const writer = hand ?? entries.find((e) => e.initials)?.hand ?? entries.find((e) => e.initials)?.initials ?? 'RT';
  const blanks = Math.max(0, rows - entries.length);
  return (
    <div class={`routing-slip routing-slip--set${cls ? ` ${cls}` : ''}`} data-scan-enhanced="">
      <div class="routing-slip__head">ROUTING SLIP</div>
      <table class="routing-slip__table">
        <thead>
          <tr>
            <th scope="col" class="routing-slip__n" aria-label="Order" />
            <th scope="col">TO</th>
            <th scope="col">ROOM</th>
            <th scope="col">INITIALS</th>
            <th scope="col">DATE</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td class="routing-slip__n">{i + 1}</td>
              <td class="routing-slip__typed">{e.to}</td>
              <td class="routing-slip__typed">{e.room ?? ''}</td>
              <td class="routing-slip__hand">
                {e.initials && <RoutingInitials initials={e.initials} hand={e.hand ?? e.initials} seed={seed + i * 7} />}
              </td>
              <td class="routing-slip__hand">
                {e.initials && e.date && <Handwriting text={e.date} hand={e.hand ?? e.initials} seed={seed + i * 7 + 3} size={1.05} />}
              </td>
            </tr>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <tr key={`b${i}`}>
              <td class="routing-slip__n">{entries.length + i + 1}</td>
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <ul class="routing-slip__actions">
        {ACTIONS.map((a, i) => {
          const on = actions.includes(a);
          return (
            <li key={a}>
              <span class="routing-slip__box">
                {on && <InkSvg geo={tickGeometry(writer, seed + i)} idKey={`tick|${writer}|${seed}|${i}`} class="routing-slip__tick" />}
              </span>
              {a}
              {on && <span class="scan-sr"> (ticked)</span>}
            </li>
          );
        })}
      </ul>
      <div class="routing-slip__remarks">
        <span class="routing-slip__label">REMARKS</span>
        {remarks && <Handwriting text={remarks} hand={writer} seed={seed + 91} maxWidth={230} />}
      </div>
      <div class="routing-slip__foot">
        <span>
          <span class="routing-slip__label">FROM</span> <span class="routing-slip__typed">{from ?? ''}</span>
        </span>
        <span>
          <span class="routing-slip__label">DATE</span> <span class="routing-slip__typed">{date ?? ''}</span>
        </span>
      </div>
    </div>
  );
}
