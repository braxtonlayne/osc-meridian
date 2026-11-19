/** Canon, wording and small helpers shared by the coordinator's views. */
import { useEffect, useRef, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { Canon, Facility } from '@core/canon-types';
import type { DrillCanon } from '@core/canon-apps/drill';
import type { GanttStatus } from '@graphics/drill';
import { hhmmLocal, hhmmZ, inWorldDay, zoneForState } from '@sim/time';
import type { SiteCause, SitePlan } from './types';

export const canon = canonJson as unknown as Canon;
export const frag = canon.apps.drill as DrillCanon;
export const SD = canon.sealDrill;
export const FAC = new Map<string, Facility>(canon.facilities.map((f) => [f.id, f]));
export const NC_ZONE = zoneForState(FAC.get(SD.origin)?.anchor.state ?? null);
/** Wall ms per drill minute. */
export const MS_PER_MIN = 60_000 / SD.timeScale;

export const STATUS_WORD: Record<GanttStatus, string> = {
  pending: 'PENDING',
  acknowledged: 'ACK, DEFERRED',
  sealing: 'SEALING',
  sealed: 'SEALED (DRILL)',
  'no-report': 'NO REPORT',
};

export const PHASE_WORD = {
  propagating: 'PROPAGATING',
  sealed: 'NETWORK SEALED',
  'stand-down': 'STOOD DOWN',
  aborted: 'ABORTED',
} as const;

export const RELAY_WORD: Record<SitePlan['relay'], string> = {
  origin: 'Origin (Network Control)',
  rail: 'Inter-hub circuit',
  tram: 'Tram network order wire',
  voice: 'Voice circuit call',
};

export function causeText(c: SiteCause): string {
  switch (c) {
    case 'single-duty-officer':
      return frag.singleDutyOfficer.text;
    case 'unpracticed':
      return frag.completion.unpracticedText;
    case 'acceptance':
      return frag.completion.acceptanceText;
    case 'calendar':
      return frag.calendarHolds[0]?.text ?? 'Seal deferred by a calendar entry in session.';
    case 'order-wire':
      return 'Acknowledgement received on the order wire.';
    case 'cut':
      return 'Order not passed: hub circuits down.';
  }
}

/** "191452Z" */
export const dtg = (ms: number) => `${String(inWorldDay(ms)).padStart(2, '0')}${hhmmZ(ms)}`;
/** "1452Z (1052 EDT)" */
export const zl = (ms: number) => `${hhmmZ(ms)} (${hhmmLocal(ms, NC_ZONE)})`;

/** Element size, updated on resize. */
export function useSize<T extends HTMLElement>(): [{ current: T | null }, { w: number; h: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.w === Math.floor(r.width) && s.h === Math.floor(r.height) ? s : { w: Math.floor(r.width), h: Math.floor(r.height) }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}
