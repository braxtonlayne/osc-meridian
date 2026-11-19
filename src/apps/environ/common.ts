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
/** "1430Z (0930 CDT)" for a wall time, site local per canon. */
export function zl(w: number): string {
  const d = new Date(w);
  const h = (((d.getUTCHours() + EC.local.utcOffsetH) % 24) + 24) % 24;
  return `${session.zulu(d)} (${pad2(h)}${pad2(d.getUTCMinutes())} ${EC.local.zone})`;
}

