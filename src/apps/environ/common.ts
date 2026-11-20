/** Shared bits of the environ app: annunciator windows, panel roles, time format. */
import * as session from '@core/session';
import { EC } from './plant';

export type Role = 'operator' | 'monitor' | 'refused';

interface Tile {
  id: string;
  legend: [string, string];
  priority: 'alarm' | 'warning' | 'status';
}
export const TILES: Tile[] = [
  { id: 'co2hi', legend: ['CO2', 'HIGH'], priority: 'warning' },
  { id: 'co2hh', legend: ['CO2', 'HIGH-HIGH'], priority: 'alarm' },
  { id: 'o2lo', legend: ['O2', 'LOW'], priority: 'alarm' },
  { id: 'zone', legend: ['ZONE CO2', 'HIGH'], priority: 'warning' },
  { id: 'seal', legend: ['SEAL', 'SIGNAL'], priority: 'status' },
  { id: 'latch', legend: ['MAKEUP AIR', 'SEAL CLOSED'], priority: 'warning' },
  { id: 'ovr', legend: ['SEAL', 'OVERRIDE'], priority: 'alarm' },
  { id: 'noscr', legend: ['NO SCRUBBER', 'ON LINE'], priority: 'warning' },
  { id: 'satA', legend: ['SCR-A BED', 'SATURATED'], priority: 'warning' },
  { id: 'satB', legend: ['SCR-B BED', 'SATURATED'], priority: 'warning' },
  { id: 'cbrn', legend: ['CBRN', 'MODE'], priority: 'status' },
  { id: 'oplo', legend: ['OVERPRESS', 'LOW'], priority: 'alarm' },
  { id: 'dp', legend: ['FILTER DP', 'HIGH'], priority: 'warning' },
  { id: 'due', legend: ['FILTER', 'CHANGE DUE'], priority: 'warning' },
  { id: 'temp', legend: ['ZONE TEMP', 'HIGH'], priority: 'warning' },
  { id: 'link', legend: ['FE LINK', 'DOWN'], priority: 'status' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
/**
 * "19 MAY 2008 0301Z (18 MAY 2201 CDT)": date and Zulu time of an in-world ISO instant, with the
 * site local time, which carries its own day when it falls on another date than the Zulu one.
 */
export function zlDated(iso: string): string {
  const DAY = 86_400_000;
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const z = Date.parse(iso);
  const l = z + EC.local.utcOffsetH * 3_600_000;
  const word = (ms: number) => {
    const x = new Date(ms);
    return `${pad2(x.getUTCDate())} ${MON[x.getUTCMonth()]}`;
  };
  const ld = new Date(l);
  const lh = `${pad2(ld.getUTCHours())}${pad2(ld.getUTCMinutes())} ${EC.local.zone}`;
  const same = Math.floor(l / DAY) === Math.floor(z / DAY);
  return `${word(z)} ${new Date(z).getUTCFullYear()} ${session.zulu(new Date(z))} (${same ? '' : `${word(l)} `}${lh})`;
}

/** "1430Z (0930 CDT)" for a wall time, site local per canon. */
export function zl(w: number): string {
  const d = new Date(w);
  const h = (((d.getUTCHours() + EC.local.utcOffsetH) % 24) + 24) % 24;
  return `${session.zulu(d)} (${pad2(h)}${pad2(d.getUTCMinutes())} ${EC.local.zone})`;
}

