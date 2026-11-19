/**
 * Transit Control: worker connection, timetable extraction and the segment 04 watch record.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, Services } from '@core/contracts';
import { phase } from '@core/session';
import { routes } from '@core/services';
import { seg04, seg04WatchData, seg04WatchDetail, WORKSTATION } from '@narrative/engine';
import type { Seg04Window } from '@sim/seg04';
import type { BoardState, Timetable } from '@sim/transit-model';
import { parseBlockSheet, parseTimetable, withBlockSheets, type BlockSheet, type SimModel } from '@sim/transit-model';
import { canonModel, createSim, EMPTY_CONFIG, type SimConfig } from '@sim/transit-sim';

export const baseModel = canonModel();
export const TIMETABLE_DOCNO = 'OSC-TRN-TT-08-02';

export interface WatchRow {
  watch: string;
  hours: string;
  dispatcher: string;
  relief: string;
  fromMin: number;
  toMin: number;
}

export interface TimetableDoc {
  timetable: Timetable;
  roster: WatchRow[];
  revision: number;
}

/** Tables (rows of cell text) and body text of a document, with released blocks included. */
export function extractDoc(doc: DocJson): { tables: string[][][]; text: string } {
  const parsed = new DOMParser().parseFromString(`<div>${doc.html}</div>`, 'text/html');
  const tables = [...parsed.querySelectorAll('table')].map((t) =>
    [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th,td')].map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())),
  );
  return { tables, text: (parsed.body.textContent ?? '').replace(/\s+/g, ' ') };
}

function parseRoster(tables: string[][][]): WatchRow[] {
  for (const t of tables) {
    const h = (t[0] ?? []).map((x) => x.toLowerCase());
    if (h[0] !== 'watch' || !h.includes('dispatcher')) continue;
    const iH = h.indexOf('hours');
    const iD = h.indexOf('dispatcher');
    const iR = h.indexOf('relief');
    return t.slice(1).flatMap((r) => {
      const m = /(\d{2})(\d{2})Z-(\d{2})(\d{2})Z/.exec(r[iH] ?? '');
      if (!m) return [];
      return [{ watch: r[0] ?? '', hours: r[iH] ?? '', dispatcher: r[iD] ?? '', relief: iR >= 0 ? (r[iR] ?? '') : '', fromMin: Number(m[1]) * 60 + Number(m[2]), toMin: Number(m[3]) * 60 + Number(m[4]) }];
    });
  }
  return [];
}

export function watchAt(roster: WatchRow[], now: number): WatchRow | null {
  const d = new Date(now);
  const min = d.getUTCHours() * 60 + d.getUTCMinutes();
  return roster.find((w) => (w.fromMin < w.toMin ? min >= w.fromMin && min < w.toMin : min >= w.fromMin || min < w.toMin)) ?? null;
}

/** Load and parse the working timetable; re-read when compartments change (released paths). */
export function useTimetable(services: Services): TimetableDoc | null {
  const [tt, setTt] = useState<TimetableDoc | null>(null);
  const comps = services.session.compartments.value.join(',');
  const nRoutes = routes.value.length;
  useEffect(() => {
    const entry = services.docs.byDocNo(TIMETABLE_DOCNO);
    if (!entry) return;
    let live = true;
    services.docs
      .load(entry.id)
      .then((doc) => {
        if (!live) return;
        const x = extractDoc(doc);
        setTt({ timetable: parseTimetable({ source: doc.docNo, ...x }, baseModel), roster: parseRoster(x.tables), revision: doc.revision });
      })
      .catch(() => {
        if (live) setTt(null);
      });
    return () => {
      live = false;
    };
  }, [services, comps, nRoutes]);
  return tt;
}

/** Block counts and numbering from the six segment engineering sheets; the model follows them. */
export function useSheets(services: Services): { sheets: Record<string, BlockSheet>; model: SimModel } {
  const [sheets, setSheets] = useState<Record<string, BlockSheet>>({});
  const nRoutes = routes.value.length;
  useEffect(() => {
    let live = true;
    const segs = baseModel.links.filter((l) => l.kind === 'RAIL').map((l) => l.key);
    void Promise.all(
      segs.map(async (seg) => {
        const entry = services.docs.byDocNo(`OSC-TRN-SEG-${seg}`);
        if (!entry) return null;
        try {
          const doc = await services.docs.load(entry.id);
          const sheet = parseBlockSheet(seg, extractDoc(doc).text);
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
    return () => {
      live = false;
    };
  }, [services, nRoutes]);
  const [model, setModel] = useState<SimModel>(baseModel);
  useEffect(() => setModel(withBlockSheets(baseModel, sheets)), [sheets]);
  return { sheets, model };
}

/** Latest filed incident log serial (from the document register) and its in-world day. */
export function logBaseFrom(services: Services): { serial: number; day: number } | null {
  let best: { serial: number; day: number } | null = null;
  for (const r of services.docs.all()) {
    const m = /^OSC-TRN-INC-08-(\d{3})$/.exec(r.docNo);
    if (!m) continue;
    const serial = Number(m[1]);
    if (!best || serial > best.serial) best = { serial, day: Number(r.date.slice(8, 10)) };
  }
  return best;
}

/** Board snapshots from the simulation worker (main-thread fallback if workers are unavailable). */
export function useBoard(cfg: Omit<SimConfig, 'seg04'>): BoardState | null {
  const [state, setState] = useState<BoardState | null>(null);
  const port = useRef<{ send(c: Partial<SimConfig>): void; stop(): void } | null>(null);
  const win = seg04.value;

  useEffect(() => {
    let worker: Worker | null;
    try {
      worker = new Worker(new URL('../../sim/transit.worker.ts', import.meta.url), { type: 'module', name: 'transit-sim' });
    } catch {
      worker = null;
    }
    if (worker) {
      const w = worker;
      w.onmessage = (ev: MessageEvent<{ type: string; state: BoardState }>) => {
        if (ev.data.type === 'state') setState(ev.data.state);
      };
      const tick = () => w.postMessage({ type: 'tick', now: Date.now() });
      tick();
      const h = setInterval(tick, 1000);
      port.current = {
        send: (c) => w.postMessage({ type: 'config', ...c }),
        stop: () => {
          clearInterval(h);
          w.terminate();
        },
      };
    } else {
      const sim = createSim();
      let current: SimConfig = { ...EMPTY_CONFIG };
      const tick = () => setState(sim.state(Date.now(), current));
      const h = setInterval(tick, 1000);
      port.current = {
        send: (c) => {
          current = { ...current, ...c };
          tick();
        },
        stop: () => clearInterval(h),
      };
    }
    return () => {
      port.current?.stop();
      port.current = null;
    };
  }, []);

  useEffect(() => {
    port.current?.send({ timetable: cfg.timetable, logBase: cfg.logBase, places: cfg.places, sheets: cfg.sheets });
  }, [cfg.timetable, cfg.logBase, cfg.places, cfg.sheets]);

  useEffect(() => {
    port.current?.send({ seg04: win ? { start: win.start, end: win.end } : null });
  }, [win?.start, win?.end]);

  return state;
}

/* ---------------------------------------------------------- watch record */

interface Seen {
  from: number;
  to: number;
  /** Every board view shown while the movement ran, in the order first seen. */
  views: string[];
}

/** "a", "a and b", "a, b and c". */
export function joinViews(views: readonly string[]): string {
  if (views.length <= 1) return views[0] ?? '';
  return `${views.slice(0, -1).join(', ')} and ${views[views.length - 1]}`;
}
/** One record per movement across every Transit Control window. */
const seen = new Map<number, Seen>();
const logged = new Set<number>();

function alreadyLogged(services: Services, start: number): boolean {
  if (logged.has(start)) return true;
  const s = String(start);
  return services.audit.entries.peek().some((e) => e.kind === 'transit.watch' && e.data?.start === s);
}

function flush(services: Services, w: Seg04Window): void {
  const rec = seen.get(w.start);
  if (!rec || alreadyLogged(services, w.start)) return;
  logged.add(w.start);
  const view = joinViews(rec.views);
  services.audit.log(
    'transit.watch',
    'SEG04',
    seg04WatchDetail(services.session.operatorId.peek(), WORKSTATION, view, rec.from, rec.to),
    seg04WatchData(view, rec.from, rec.to),
  );
}

/**
 * Notes whether this window's board is on screen (not minimised, page visible, workstation
 * unlocked) at each second of a movement, and writes the transit.watch entry once the
 * movement ends, or when the window closes during it.
 */
export function useSeg04Watch(services: Services, root: { current: HTMLElement | null }, view: string): void {
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    let lastWin: Seg04Window | null = null;
    const check = () => {
      const w = seg04.peek();
      const now = Date.now();
      if (w) lastWin = w;
      if (w && now >= w.start && now < w.end) {
        const el = root.current;
        const visible = !!el && el.getClientRects().length > 0 && document.visibilityState === 'visible' && phase.peek() === 'active';
        if (visible) {
          const rec = seen.get(w.start);
          if (rec) {
            rec.to = now;
            if (!rec.views.includes(viewRef.current)) rec.views.push(viewRef.current);
          } else seen.set(w.start, { from: now, to: now, views: [viewRef.current] });
        }
      } else if (w && now >= w.end) {
        flush(services, w);
      }
    };
    check();
    const h = setInterval(check, 1000);
    const off = seg04.subscribe(check);
    return () => {
      clearInterval(h);
      off();
      if (lastWin) flush(services, lastWin);
    };
  }, [services, root]);
}
