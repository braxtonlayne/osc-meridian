/**
 * Canon-bound simulation instance shared by the worker and the main-thread fallback.
 */
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import { SCHEMATIC_LAYOUT } from '@graphics/schematic/layout';
import type { Seg04Window } from './seg04';
import { boardState, buildModel, possessionsFrom, withBlockSheets, type BlockSheet, type BoardState, type SimModel, type Timetable } from './transit-model';

const canon = canonJson as unknown as Canon;

export interface SimConfig {
  timetable: Timetable | null;
  seg04: Seg04Window | null;
  logBase: { serial: number; day: number } | null;
  places: string[];
  /** Block arrangement read from the segment engineering sheets, by segment number. */
  sheets: Record<string, BlockSheet>;
}

export const EMPTY_CONFIG: SimConfig = { timetable: null, seg04: null, logBase: null, places: [], sheets: {} };

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
      const possessions = possessionsFrom(canon.calendar ?? [], model, (iso) => dayStartForIso(iso, now));
      return boardState(model, now, { ...cfg, possessions });
    },
  };
}
