/**
 * Dispatcher Workstation: the desk's copy of the network model and the working timetable,
 * read from the same documents as Transit Control (segment sheets for block counts, the
 * working timetable for booked paths), and the desk's 1 Hz board snapshot.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { DocJson, Services } from '@core/contracts';
import { IN_WORLD_DATE_ISO } from '@core/session';
import { setInWorldDate } from '@sim/time';
import { linkBetween, parseBlockSheet, parseTimetable, withBlockSheets, type BlockSheet, type BoardState, type DispatchInput, type PlantInput, type SimModel, type Timetable } from '@sim/transit-model';
import { allPossessions, canonModel, createSim } from '@sim/transit-sim';
import { DSP } from './logic';

export const TIMETABLE_DOCNO = 'OSC-TRN-TT-08-02';
export const BASE_MODEL = canonModel();

/** Tables (rows of cell text) and body text of a document, with released blocks included. */
export function extractDoc(doc: DocJson): { tables: string[][][]; text: string } {
  const parsed = new DOMParser().parseFromString(`<div>${doc.html}</div>`, 'text/html');
  const tables = [...parsed.querySelectorAll('table')].map((t) =>
    [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th,td')].map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())),
  );
  return { tables, text: (parsed.body.textContent ?? '').replace(/\s+/g, ' ') };
}

export interface DeskData {
  model: SimModel;
  sheets: Record<string, BlockSheet>;
  timetable: Timetable | null;
  /** The timetable could not be read at this workstation. */
  timetableMissing: boolean;
}

/** Load segment sheets and the working timetable once per window. */
export function useDeskData(services: Services): DeskData {
  const [sheets, setSheets] = useState<Record<string, BlockSheet>>({});
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let live = true;
    const segs = BASE_MODEL.links.filter((l) => l.kind === 'RAIL').map((l) => l.key);
    void Promise.all(
      segs.map(async (seg) => {
        const entry = services.docs.byDocNo(`OSC-TRN-SEG-${seg}`);
        if (!entry) return null;
        try {
          const sheet = parseBlockSheet(seg, extractDoc(await services.docs.load(entry.id)).text);
          return sheet ? ([seg, sheet] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (!live) return;
      const out: Record<string, BlockSheet> = {};
      for (const r of rows) if (r) out[r[0]] = r[1];
      setSheets(out);
    });
    const tt = services.docs.byDocNo(TIMETABLE_DOCNO);
    if (tt)
      services.docs
        .load(tt.id)
        .then((doc) => live && setTimetable(parseTimetable({ source: doc.docNo, ...extractDoc(doc) }, BASE_MODEL)))
        .catch(() => live && setMissing(true));
    else setMissing(true);
    return () => {
      live = false;
    };
  }, [services]);
  const model = useMemo(() => withBlockSheets(BASE_MODEL, sheets), [sheets]);
  return { model, sheets, timetable, timetableMissing: missing };
}

/** Wall clock at 1 Hz, paused while the page is hidden. */
export function useNow(): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const h = setInterval(() => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    }, 1000);
    return () => clearInterval(h);
  }, []);
  return now;
}

let sim: ReturnType<typeof createSim> | null = null;

/** Board snapshot computed on the main thread (one network, a few dozen movements: well under a millisecond). */
export function deskBoard(now: number, data: DeskData, dispatch: readonly DispatchInput[], plant: PlantInput, withTimetable: boolean): BoardState {
  if (!sim) {
    setInWorldDate(IN_WORLD_DATE_ISO);
    sim = createSim();
  }
  return sim.state(now, { timetable: withTimetable ? data.timetable : null, seg04: null, logBase: null, places: [], sheets: data.sheets, dispatch, plant });
}

export { allPossessions };

/**
 * The platform indicator's timetable: the working timetable plus the service posted at the
 * platform itself (canon platformService), which is printed in the timetable only as
 * running text released to holders of the network geography.
 */
export function platformTimetable(model: SimModel, tt: Timetable | null): Timetable | null {
  const ps = DSP.platformService;
  const link = linkBetween(model, ps.from, ps.to);
  if (!link) return tt;
  const base: Timetable = tt ?? { source: '', rail: [], tram: [], dwellRailMin: DSP.working.dwellMin.rail, dwellTramMin: DSP.working.dwellMin.tram, weekendFullSegments: null, noPaths: [] };
  if (base.tram.some((p) => p.link === link.key)) return base;
  return { ...base, tram: [...base.tram, { link: link.key, paths: ps.pathsEachWay, firstDepMin: null, consist: ps.consist, secondDepMin: null, secondDays: null }] };
}
