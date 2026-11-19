/**
 * Annunciator: a grid of legend windows following the ISA-18.1 ring-back sequence.
 * The app drives each window's `seq` (use annunciatorStep from logic.ts); the grid
 * reports operator actions: onAck, onReset, onTest. No sound inside.
 *
 *   normal    dark window, legend faint
 *   unack     slow flash (1 s); with reduced motion: static inverse (light window, heavy border, coloured legend)
 *   ack       steady on
 *   ringback  dim slow flash (2 s); with reduced motion: static dim with a dashed border
 *   lamp test every window steady on while `test` is true
 */
import type { TargetedKeyboardEvent } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { PushButton } from './controls';
import { ANN_WORD, type AnnSeq } from './logic';
import { cx, legendLines, legendText, useReducedMotion, type Legend } from './parts';

export type AnnPriority = 'alarm' | 'warning' | 'status';

export interface AnnunciatorTile {
  id: string;
  legend: Legend;
  seq: AnnSeq;
  /** Window colour when lit: alarm (red), warning (amber), status (white). Default alarm. */
  priority?: AnnPriority;
  /** Window is not in use: blank, never lights. */
  spare?: boolean;
}

export interface AnnunciatorProps {
  tiles: readonly AnnunciatorTile[];
  /** Windows per row (default 4). */
  columns?: number;
  /** Accessible name and the engraved caption over the grid. */
  label: string;
  /** Lamp test: all windows on. */
  test?: boolean;
  reducedMotion?: boolean;
  /** Window width in px (default 92). Height is fixed at 44. */
  tileWidth?: number;
  /** Ids to acknowledge: a clicked window, or every unacknowledged window from the ACK button. */
  onAck?: (ids: string[]) => void;
  /** Ids in ringback to reset. */
  onReset?: (ids: string[]) => void;
  /** Lamp test pushbutton pressed (true) and released (false). */
  onTest?: (on: boolean) => void;
  /** Draw the ACK / RESET / TEST pushbuttons under the grid (default true when any handler is given). */
  buttons?: boolean;
}

export function Annunciator(props: AnnunciatorProps) {
  const { tiles, columns = 4, label, test = false, tileWidth = 92 } = props;
  const rm = useReducedMotion(props.reducedMotion);
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const showButtons = props.buttons ?? !!(props.onAck || props.onReset || props.onTest);
  const unack = tiles.filter((t) => !t.spare && t.seq === 'unack').map((t) => t.id);
  const ring = tiles.filter((t) => !t.spare && t.seq === 'ringback').map((t) => t.id);
  const rows = Math.ceil(tiles.length / columns);

  const move = (to: number): void => {
    const i = Math.max(0, Math.min(tiles.length - 1, to));
    setFocus(i);
    refs.current[i]?.focus();
  };
  const onKey = (e: TargetedKeyboardEvent<HTMLButtonElement>, i: number): void => {
    const col = i % columns;
    let to: number | null = null;
    if (e.key === 'ArrowRight') to = i + 1;
    else if (e.key === 'ArrowLeft') to = i - 1;
    else if (e.key === 'ArrowDown') to = i + columns;
    else if (e.key === 'ArrowUp') to = i - columns;
    else if (e.key === 'Home') to = i - col;
    else if (e.key === 'End') to = Math.min(tiles.length - 1, i - col + columns - 1);
    if (to === null || to < 0 || to >= tiles.length) return;
    e.preventDefault();
    move(to);
  };
  const activate = (t: AnnunciatorTile): void => {
    if (t.spare) return;
    if (t.seq === 'unack') props.onAck?.([t.id]);
    else if (t.seq === 'ringback') props.onReset?.([t.id]);
  };

  return (
    <div class={cx('pk-ann', rm && 'pk-rm', props.reducedMotion === false && 'pk-motion', test && 'is-test')} role="group" aria-label={label}>
      <div
        class="pk-ann__grid"
        role="group"
        aria-label={`${label}: ${rows} rows of ${columns} windows; arrow keys move, Enter acknowledges or resets`}
        style={{ gridTemplateColumns: `repeat(${columns}, ${tileWidth}px)` }}
      >
        {tiles.map((t, i) => {
          const lines = legendLines(t.legend);
          const seq: AnnSeq = t.spare ? 'normal' : t.seq;
          const state = t.spare ? 'SPARE' : test ? 'LAMP TEST' : ANN_WORD[seq];
          return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                class={cx('pk-tile', `pk-tile--${t.priority ?? 'alarm'}`, `is-${seq}`, t.spare && 'is-spare')}
                data-seq={seq}
                tabIndex={i === focus ? 0 : -1}
                aria-label={`${legendText(t.legend) || 'Spare'}: ${state}`}
                onFocus={() => setFocus(i)}
                onKeyDown={(e) => onKey(e, i)}
                onClick={() => activate(t)}
              >
                {t.spare
                  ? null
                  : lines.map((l, k) => (
                      <span class="pk-tile__line" key={k}>
                        {l}
                      </span>
                    ))}
              </button>
          );
        })}
      </div>
      {showButtons ? (
        <div class="pk-ann__btns">
          <PushButton
            legend={['ACK']}
            color="black"
            size="sm"
            ariaLabel={`Acknowledge ${unack.length} alarm${unack.length === 1 ? '' : 's'}`}
            onPress={() => {
              if (unack.length) props.onAck?.(unack);
            }}
          />
          <PushButton
            legend={['RESET']}
            color="black"
            size="sm"
            ariaLabel={`Reset ${ring.length} cleared window${ring.length === 1 ? '' : 's'}`}
            onPress={() => {
              if (ring.length) props.onReset?.(ring);
            }}
          />
          <PushButton
            legend={['LAMP', 'TEST']}
            color="grey"
            size="sm"
            ariaLabel="Lamp test (hold)"
            onPress={() => props.onTest?.(true)}
            onRelease={() => props.onTest?.(false)}
          />
          <span class="pk-ann__count" aria-live="polite">
            {unack.length > 0 ? `${unack.length} UNACK` : ring.length > 0 ? `${ring.length} RESET REQD` : 'NO ALARMS UNACK'}
          </span>
        </div>
      ) : null}
    </div>
  );
}
