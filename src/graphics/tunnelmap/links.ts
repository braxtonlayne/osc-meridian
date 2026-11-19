/*
 * @graphics/tunnelmap: link table.
 * Every rail segment and every tram link in canon, as one flat list with the two
 * mileages the map compares: the stated (engineering) figure and the straight-line
 * distance between the computed facility positions.
 * No figure is typed here; all of it is read from canon.
 */
import canonJson from '@canon';
import type { Canon, Facility, FacilityId, NetworkId } from '@core/canon-types';
import { geoDistance } from 'd3-geo';

export const canon = canonJson as unknown as Canon;

/** Mean earth radius in statute miles, as used for every straight-line figure on the map. */
export const EARTH_RADIUS_MI = 3958.8;

/** `RAIL-04` for an inter-hub segment; `TRAM-BETA-02:GAMMA-03` for a tram link. */
export type LinkId = `RAIL-${string}` | `TRAM-${string}:${string}`;

export interface TunnelLink {
  id: LinkId;
  kind: 'RAIL' | 'TRAM';
  a: FacilityId;
  b: FacilityId;
  /** Stated mileage from the segment table / network link list. */
  miles: number;
  hours: number;
  /** Great-circle distance between the two computed positions, whole statute miles. */
  straightMi: number;
  /** Rail only. */
  segmentNo: string | null;
  inRevenueService: boolean;
  /** Tram only. */
  network: NetworkId | null;
  networkName: string | null;
  /** One-line designation: "SEGMENT 04" or "EASTERN NETWORK (PITTSBURGH)". */
  designation: string;
}

export type LonLat = [number, number];

const facilityById = new Map<string, Facility>(canon.facilities.map((f) => [f.id, f]));

export function facility(id: string): Facility | undefined {
  return facilityById.get(id);
}

/** Computed position of a facility as [lon, lat], or null when canon carries none. */
export function positionOf(id: string): LonLat | null {
  const f = facilityById.get(id);
  if (!f || typeof f.lat !== 'number' || typeof f.lon !== 'number') return null;
  return [f.lon, f.lat];
}

export function straightLineMiles(a: string, b: string): number {
  const pa = positionOf(a);
  const pb = positionOf(b);
  if (!pa || !pb) return 0;
  return Math.round(geoDistance(pa, pb) * EARTH_RADIUS_MI);
}

export function railId(no: string): LinkId {
  return `RAIL-${no}`;
}

export function tramId(from: string, to: string): LinkId {
  return `TRAM-${from}:${to}`;
}

function build(): TunnelLink[] {
  const out: TunnelLink[] = [];
  for (const s of canon.railSegments) {
    out.push({
      id: railId(s.no),
      kind: 'RAIL',
      a: s.a,
      b: s.b,
      miles: s.miles,
      hours: s.hours,
      straightMi: straightLineMiles(s.a, s.b),
      segmentNo: s.no,
      inRevenueService: s.status === 'IN REVENUE SERVICE',
      network: null,
      networkName: null,
      designation: `SEGMENT ${s.no}`,
    });
  }
  for (const n of canon.tramNetworks) {
    for (const l of n.links) {
      out.push({
        id: tramId(l.from, l.to),
        kind: 'TRAM',
        a: l.from,
        b: l.to,
        miles: l.miles,
        hours: l.hours,
        straightMi: straightLineMiles(l.from, l.to),
        segmentNo: null,
        inRevenueService: true,
        network: n.id,
        networkName: n.name,
        designation: `${n.name.toUpperCase()} ${l.label.toUpperCase()}`,
      });
    }
  }
  return out;
}

/** Six rail segments followed by the tram links, network by network, in canon order. */
export const tunnelLinks: readonly TunnelLink[] = build();

const linkById = new Map<string, TunnelLink>(tunnelLinks.map((l) => [l.id, l]));

export function linkOf(id: string): TunnelLink | undefined {
  return linkById.get(id);
}

/** Facilities that are an end of at least one listed link. */
export const linkedFacilityIds: ReadonlySet<string> = new Set(tunnelLinks.flatMap((l) => [l.a, l.b]));

export function formatMiles(n: number): string {
  return n.toLocaleString('en-US');
}
