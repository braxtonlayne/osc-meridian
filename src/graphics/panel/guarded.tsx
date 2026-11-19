/**
 * GuardedSwitch: the two-step control. A hinged cover must be lifted, then the
 * actuator held for `holdMs` while a segmented bar fills. Escape closes the cover.
 *
 * Controlled: the app owns `state` ('closed' | 'lifted' | 'actuated'; 'armed' only
 * to draw a static hold, with `progress`). The component owns the hold in progress
 * and reports it: onLift, onClose, onArm, onAbort, onActuate. No sound inside.
 */
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { StatusWord } from '@graphics/reactor/gauges';
import type { StatusId } from '@graphics/reactor/model';
import { Plate, type PlateVariant } from './controls';
import { holdProgress, type GuardState } from './logic';
import { BevelRect, cx, legendText, Screw, useReducedMotion, type Legend } from './parts';

export interface GuardedSwitchProps {
  state: GuardState;
  /** Engraved plate above the guard, e.g. ["NETWORK ISOLATION", "MANUAL INITIATE"]. */
  label: Legend;
  plate?: PlateVariant;
  /** Hold duration in ms (default 3000). */
  holdMs?: number;
  /** Segments in the hold bar (default 10). */
  segments?: number;
  /** Static hold fraction 0..1, drawn when `state` is 'armed' (screens, checks). */
  progress?: number;
  disabled?: boolean;
  reducedMotion?: boolean;
  /** Words beside the status square, per state. */
  words?: Partial<Record<GuardState, string>>;
  /** Equipment tag under the unit, e.g. HS-0001. */
  tag?: string;
  onLift?: () => void;
  onClose?: () => void;
  /** The hold started (cover lifted, actuator pressed). */
  onArm?: () => void;
  /** The actuator was let go before the hold completed. */
  onAbort?: () => void;
  /** The hold completed. */
  onActuate?: () => void;
}

const STATUS: Record<GuardState, StatusId> = { closed: 'OFFLINE', lifted: 'DEGRADED', armed: 'DEGRADED', actuated: 'FAULT' };
const WORD: Record<GuardState, string> = { closed: 'COVER CLOSED', lifted: 'COVER LIFTED', armed: 'HOLDING', actuated: 'ACTUATED' };

const VW = 150;
const VH = 160;
const ACX = 75;
const ACY = 92;

export function GuardedSwitch(props: GuardedSwitchProps) {
  const { state, label, plate = 'danger', holdMs = 3000, segments = 10, progress, disabled = false, words, tag } = props;
  const rm = useReducedMotion(props.reducedMotion);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const stripeId = `pk-stripe-${uid}`;
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0 = useRef(0);
  const coverBtn = useRef<HTMLButtonElement>(null);
  const cb = useRef(props);
  cb.current = props;

  const stop = (): void => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  // The app moved the switch away from 'lifted' (closed it, latched it): drop any hold.
  useEffect(() => {
    if (state !== 'lifted' && holding) {
      stop();
      setHolding(false);
      setElapsed(0);
    }
  }, [state, holding]);

  const startHold = (): void => {
    if (disabled || state !== 'lifted' || timer.current !== null) return;
    t0.current = performance.now();
    setElapsed(0);
    setHolding(true);
    cb.current.onArm?.();
    timer.current = setInterval(() => {
      const el = performance.now() - t0.current;
      setElapsed(el);
      if (el >= holdMs) {
        stop();
        setHolding(false);
        cb.current.onActuate?.();
      }
    }, 50);
  };
  const endHold = (): void => {
    if (timer.current === null) return;
    stop();
    setHolding(false);
    setElapsed(0);
    cb.current.onAbort?.();
  };
  const closeCover = (): void => {
    endHold();
    if (state !== 'closed') cb.current.onClose?.();
  };

  const shown: GuardState = holding ? 'armed' : state;
  const hp =
    shown === 'actuated'
      ? holdProgress(holdMs, holdMs, segments)
      : holding
        ? holdProgress(elapsed, holdMs, segments)
        : shown === 'armed'
          ? holdProgress((progress ?? 0) * holdMs, holdMs, segments)
          : holdProgress(0, holdMs, segments);
  const open = shown !== 'closed';
  const pressedIn = shown === 'armed' || shown === 'actuated';
  const name = legendText(label);
  const word = words?.[shown] ?? WORD[shown];

  return (
    <div
      class={cx('pk-ctl', 'pk-guard', `is-${shown}`, disabled && 'is-disabled', rm && 'pk-rm')}
      role="group"
      aria-label={name}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && state !== 'closed') {
          e.preventDefault();
          e.stopPropagation();
          closeCover();
          coverBtn.current?.focus();
        }
      }}
    >
      <Plate text={label} variant={plate} size="md" screws />
      <div class="pk-guard__unit" style={{ width: `${VW}px`, height: `${VH}px` }}>
        <svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`} aria-hidden="true">
          <defs>
            <pattern id={stripeId} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
              <rect x="0" y="0" width="5" height="10" class="pk-f-hazard" />
              <rect x="5" y="0" width="5" height="10" class="pk-f-hazard2" />
            </pattern>
          </defs>
          <BevelRect x={0} y={0} w={VW} h={VH} />
          <Screw x={9} y={9} seed={1} />
          <Screw x={VW - 9} y={9} seed={4} />
          <Screw x={9} y={VH - 9} seed={2} />
          <Screw x={VW - 9} y={VH - 9} seed={3} />

          {/* collar and well around the actuator */}
          <BevelRect x={34} y={50} w={82} h={86} fill="pk-f-collar" />
          <rect x={44} y={60} width={62} height={64} class="pk-f-dark" />
          {/* actuator: black ring, red cap with a 1px bevel */}
          <circle cx={ACX} cy={ACY} r={24} class="pk-f-bezel" />
          <circle cx={ACX + (pressedIn ? 0.5 : 0)} cy={ACY + (pressedIn ? 0.5 : 0)} r={pressedIn ? 17 : 19} class="pk-f-act pk-s-dark" />
          <path
            d={arcPath(ACX + (pressedIn ? 0.5 : 0), ACY + (pressedIn ? 0.5 : 0), (pressedIn ? 17 : 19) - 1.5, 45, 225)}
            class={cx(pressedIn ? 'pk-s-actsh' : 'pk-s-acthi', 'pk-nofill')}
          />
          <path
            d={arcPath(ACX + (pressedIn ? 0.5 : 0), ACY + (pressedIn ? 0.5 : 0), (pressedIn ? 17 : 19) - 1.5, 225, 405)}
            class={cx(pressedIn ? 'pk-s-acthi' : 'pk-s-actsh', 'pk-nofill')}
          />

          {/* hinge barrel across the top of the collar */}
          <rect x={32} y={41} width={86} height={10} class="pk-f-hinge pk-s-outer" />
          {[53, 75, 97].map((x) => (
            <line key={x} x1={x + 0.5} y1={41} x2={x + 0.5} y2={51} class="pk-s-outer" />
          ))}
          <line x1={33} y1={43.5} x2={117} y2={43.5} class="pk-s-hi" />

          {open ? (
            /* cover flipped up: underside seen edge-on above the hinge, lip and tab at the top */
            <g class="pk-guard__cover pk-guard__cover--up">
              <rect x={32} y={14} width={86} height={27} class="pk-f-coverunder pk-s-outer" />
              <rect x={32.5} y={14.5} width={85} height={6} fill={`url(#${stripeId})`} class="pk-s-outer" />
              <rect x={40} y={24} width={70} height={13} class="pk-nofill pk-s-dark" />
              <rect x={63} y={10} width={24} height={4} class="pk-f-cover pk-s-outer" />
            </g>
          ) : (
            /* cover down over the collar, striped lip at the front edge */
            <g class="pk-guard__cover pk-guard__cover--down">
              <rect x={32} y={50} width={86} height={88} class="pk-f-cover" />
              <path d="M32.5 137.5 V50.5 H117.5" class="pk-s-coverhi pk-nofill" />
              <path d="M32.5 137.5 H117.5 V50.5" class="pk-s-outer pk-nofill" />
              <rect x={32.5} y={50.5} width={85} height={87} class="pk-s-outer pk-nofill" />
              <rect x={33} y={123} width={84} height={14} fill={`url(#${stripeId})`} />
              <line x1={33} y1={122.5} x2={117} y2={122.5} class="pk-s-outer" />
              <rect x={63} y={138} width={24} height={5} class="pk-f-cover pk-s-outer" />
              <text x={75} y={94} text-anchor="middle" class="pk-engrave">
                LIFT COVER
              </text>
            </g>
          )}
        </svg>
        <button
          ref={coverBtn}
          type="button"
          class={cx('pk-hit', 'pk-guard__coverbtn', open && 'is-up')}
          aria-label={open ? `Close guard cover: ${name}` : `Lift guard cover: ${name}`}
          aria-expanded={open}
          aria-disabled={disabled || undefined}
          onClick={() => {
            if (disabled) return;
            if (state === 'closed') cb.current.onLift?.();
            else closeCover();
          }}
        />
        <button
          type="button"
          class="pk-hit pk-guard__act"
          tabIndex={open && !disabled ? 0 : -1}
          aria-label={`Press and hold ${(holdMs / 1000).toFixed(1)} seconds: ${name}`}
          aria-disabled={!open || disabled || state === 'actuated' || undefined}
          aria-pressed={pressedIn}
          hidden={!open}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            startHold();
          }}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onLostPointerCapture={endHold}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              startHold();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              endHold();
            }
          }}
          onBlur={endHold}
        />
      </div>
      <div
        class="pk-hold"
        role="progressbar"
        aria-label={`Hold progress: ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hp.fraction * 100)}
        style={{ width: `${VW}px` }}
      >
        <div class="pk-hold__bar">
          {Array.from({ length: segments }, (_, i) => (
            <span key={i} class={cx('pk-hold__seg', i < hp.lit && 'is-on')} />
          ))}
        </div>
        <div class="pk-hold__read">
          <span>HOLD {(holdMs / 1000).toFixed(1)} S</span>
          <span class="pk-mono">{shown === 'armed' ? `${hp.remaining.toFixed(1)} S` : shown === 'actuated' ? 'COMPLETE' : '--.-'}</span>
        </div>
      </div>
      <StatusWord status={STATUS[shown]} word={word} />
      {tag ? <span class="pk-tag">{tag}</span> : null}
    </div>
  );
}

/** Arc between two angles in degrees (0 = 3 o'clock, counter-clockwise positive). */
function arcPath(x: number, y: number, r: number, a0: number, a1: number): string {
  const p = (a: number): string => `${(x + Math.cos((a * Math.PI) / 180) * r).toFixed(2)} ${(y - Math.sin((a * Math.PI) / 180) * r).toFixed(2)}`;
  return `M${p(a0)} A${r} ${r} 0 0 0 ${p(a1)}`;
}
