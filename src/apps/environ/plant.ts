/**
 * Live plant hook: reads shared key `environ`, integrates the model locally from the checkpoint
 * to now once a second (stopped while the window is hidden), and writes new checkpoints when the
 * operator changes a control. Only the environ app writes the key.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { DrillState, Services } from '@core/contracts';
import type { EnvironCanon } from '@core/canon-apps/environ';
import { advance, defaultState, readings, trimLog, type Cursor, type ModelEnv, type Readings } from './model';
import type { EnvironControls, EnvironPlant, EnvironSample, EnvironState } from './types';

const canon = canonJson as unknown as Canon;
export const EC = (canon.apps as Record<string, unknown>).environ as EnvironCanon;
export const SITE = canon.facilities.find((f) => f.id === EC.site);
export const POSTED = SITE?.staff ?? 0;
export const TIME_SCALE = canon.sealDrill.timeScale;
export const LEVEL_NAMES: Record<number, string> = Object.fromEntries(
  ((canon.templateLevels as unknown as Record<string, { n: number; name: string }[]>).GAMMA ?? []).map((l) => [l.n, l.name]),
);

/** Seal signal for the site from the seal drill state. */
export function sealFn(d: DrillState | null): (w: number) => boolean {
  const s = d?.sites[EC.site];
  if (!d || !s) return () => false;
  const start = s.acknowledged ?? (s.status === 'sealing' || s.status === 'sealed' ? (s.sealed ?? s.ordered) : null);
  if (start == null) return () => false;
  const end = d.endedAt ?? (d.phase === 'stand-down' || d.phase === 'aborted' ? start : Number.POSITIVE_INFINITY);
  return (w) => w >= start && w < end;
}

export function modelEnv(drill: DrillState | null): ModelEnv {
  return { ec: EC, posted: POSTED, timeScale: TIME_SCALE, sealAt: sealFn(drill) };
}

export interface PlantView {
  state: EnvironState;
  at: number;
  plant: EnvironPlant;
  r: Readings;
  /** Historian plus local samples since the checkpoint. */
  samples: EnvironSample[];
  env: ModelEnv;
  /** Wall ms the view was last advanced. */
  now: number;
}

interface Local {
  key: string;
  cursor: Cursor;
  samples: EnvironSample[];
}

export function usePlant(services: Services, opts: { writer: boolean; frozen: boolean; visible: boolean }) {
  const sig = services.shared.get<EnvironState | null>('environ', null);
  const drillSig = services.shared.get<DrillState | null>('drill', null);
  const drill = drillSig.value;
  const env = useMemo(() => modelEnv(drill), [drill]);
  const stored = sig.value;
  // A plant nobody has opened yet: the operator writes the initial state; readers compute it.
  const fallback = useMemo(() => (stored ? null : defaultState(env, Date.now())), [!!stored]);
  const state = stored ?? fallback!;
  const local = useRef<Local | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!stored && opts.writer && fallback) services.shared.set('environ', fallback);
  }, [!!stored, opts.writer]);

  useEffect(() => {
    if (opts.frozen || !opts.visible) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [opts.frozen, opts.visible]);

  const key = `${state.rev}:${state.checkpoint.at}`;
  if (!local.current || local.current.key !== key) {
    local.current = { key, cursor: { at: state.checkpoint.at, plant: state.checkpoint.plant }, samples: [] };
  }
  const L = local.current;
  if (!opts.frozen) {
    L.cursor = advance(L.cursor, state.controls, state.filters, env, now, (s) => L.samples.push(s));
  }
  const r = readings(L.cursor.plant, state.controls, state.filters, env, L.cursor.at);
  const view: PlantView = {
    state,
    at: L.cursor.at,
    plant: L.cursor.plant,
    r,
    samples: trimLog([...state.log, ...L.samples], env, L.cursor.at),
    env,
    now,
  };

  /** Write a new checkpoint at the current cursor with changed controls / plant / other fields. */
  const commit = (fn: (s: EnvironState, plant: EnvironPlant) => Partial<EnvironState> & { plant?: EnvironPlant }) => {
    const cur = sig.peek() ?? state;
    // Re-integrate against the stored state so a commit never rewinds the plant.
    let cursor: Cursor;
    let fresh: EnvironSample[];
    if (local.current && local.current.key === `${cur.rev}:${cur.checkpoint.at}`) {
      local.current.cursor = advance(local.current.cursor, cur.controls, cur.filters, env, Date.now(), (s) => local.current!.samples.push(s));
      cursor = local.current.cursor;
      fresh = local.current.samples;
    } else {
      fresh = [];
      cursor = advance({ at: cur.checkpoint.at, plant: cur.checkpoint.plant }, cur.controls, cur.filters, env, Date.now(), (s) => fresh.push(s));
    }
    const patch = fn(cur, cursor.plant);
    const plant = patch.plant ?? cursor.plant;
    delete patch.plant;
    const next: EnvironState = {
      ...cur,
      ...patch,
      rev: cur.rev + 1,
      checkpoint: { at: cursor.at, plant },
      log: trimLog([...cur.log, ...fresh], env, cursor.at),
    };
    services.shared.set('environ', next);
  };

  return { view, commit };
}

export function setControl(c: EnvironControls, patch: Partial<EnvironControls>): EnvironControls {
  return { ...c, ...patch };
}
