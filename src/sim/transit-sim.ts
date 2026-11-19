/**
 * Canon-bound simulation instance shared by the worker and the main-thread fallback.
 */
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { DispatchCanon } from '@core/canon-apps/dispatch';
import { SCHEMATIC_LAYOUT } from '@graphics/schematic/layout';
import type { Seg04Window } from './seg04';
import { parseZ } from './time';
import { boardState, buildModel, NO_PLANT, possessionsFrom, withBlockSheets, type BlockSheet, type BoardState, type DispatchInput, type PlantInput, type PossessionSpec, type SimModel, type Timetable } from './transit-model';

const canon = canonJson as unknown as Canon;
const dispatchCanon = (canon.apps as Record<string, unknown> | undefined)?.dispatch as DispatchCanon | undefined;

export interface SimConfig {
  timetable: Timetable | null;
  seg04: Seg04Window | null;
  logBase: { serial: number; day: number } | null;
  places: string[];
  /** Block arrangement read from the segment engineering sheets, by segment number. */
  sheets: Record<string, BlockSheet>;
  /** Pass two: dispatched trains (shared key `dispatch`). */
  dispatch?: readonly DispatchInput[];
  /** Pass two: network isolation and seal drill (shared keys `isolation`, `drill`). */
  plant?: PlantInput;
}

export const EMPTY_CONFIG: SimConfig = { timetable: null, seg04: null, logBase: null, places: [], sheets: {}, dispatch: [], plant: NO_PLANT };

export function canonModel(): SimModel {
  const sections: Record<string, number> = {};
  for (const l of SCHEMATIC_LAYOUT.links) sections[l.key] = l.blocks;
  const states: Record<string, string> = {};
  for (const f of canon.facilities) if (f.anchor?.state) states[f.id] = f.anchor.state;
  return buildModel({
    railSegments: canon.railSegments,
    tramNetworks: canon.tramNetworks,
    railSpeedText: canon.transitTech.railSpeed ?? '',
    tramSpeedText: canon.transitTech.tramSpeed ?? '',
    sections,
    states,
  });
}

/** UTC midnight on which a calendar date runs: the in-world day maps onto the real day of the same number this month. */
export function dayStartForIso(iso: string, now: number = Date.now()): number {
  const day = Number(iso.slice(8, 10));
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), day);
}

/** Possessions granted by Transit Control desks (dispatch canon fragment), in the board's form. */
export function deskPossessions(model: SimModel, now: number): PossessionSpec[] {
  return (dispatchCanon?.possessions ?? []).map((p) => {
    const day = dayStartForIso(p.date, now);
    const s = parseZ(p.startZ) ?? 0;
    const f = parseZ(p.endZ) ?? 0;
    const ends = p.link.split('>');
    return {
      id: p.id,
      date: p.date,
      link: model.byKey[p.link] ? p.link : null,
      limits: ends.length === 2 ? `Tram link ${ends[0]} to ${ends[1]}` : `Segment ${p.link}`,
      fromMs: day + s * 60_000,
      toMs: day + (f <= s ? f + 1440 : f) * 60_000 + (f % 60 === 59 ? 60_000 : 0),
      timeText: `${p.startZ} to ${p.endZ}`,
      originator: p.originator,
      title: p.title,
      note: p.note,
    };
  });
}

/** Every possession the board knows: canon calendar (TRANSIT) plus desk-granted ones. */
export function allPossessions(model: SimModel, now: number): PossessionSpec[] {
  return [...possessionsFrom(canon.calendar ?? [], model, (iso) => dayStartForIso(iso, now)), ...deskPossessions(model, now)];
}

export const SUPPRESSED_LABEL = dispatchCanon?.seg04.suppressedLabel;

export function createSim() {
  const base = canonModel();
  let sheetsKey = '';
  let model = base;
  return {
    get model() {
      return model;
    },
    state(now: number, cfg: SimConfig): BoardState {
      const k = JSON.stringify(cfg.sheets ?? {});
      if (k !== sheetsKey) {
        sheetsKey = k;
        model = withBlockSheets(base, cfg.sheets ?? {});
      }
      return boardState(model, now, { ...cfg, possessions: allPossessions(model, now), suppressedLabel: SUPPRESSED_LABEL });
    },
  };
}
