/**
 * Position and behaviour checks for @graphics/map.
 * Run:  npx vitest run --config src/graphics/map/check/vitest.config.ts
 */
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import type { ComponentChild } from 'preact';
import { geoContains, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, MultiPolygon } from 'geojson';
import canonJson from '@canon';
import type { Canon, Facility } from '@core/canon-types';
import topo from './geo/conus.topo.json';
import { UsMap, projectionFor } from './index';

const canon = canonJson as unknown as Canon;
const MI = 3958.8;

interface Placed extends Facility {
  lat: number;
  lon: number;
}
const site = (id: string): Placed => {
  const f = canon.facilities.find((x) => x.id === id);
  if (!f || typeof f.lat !== 'number' || typeof f.lon !== 'number') throw new Error(`no position for ${id}`);
  return f as Placed;
};

type St = Feature<MultiPolygon, { postal: string }>;
const states = (topo as never as { objects: { states: { geometries: never[] } } }).objects.states.geometries.map(
  (g) => feature(topo as never, g) as unknown as St,
);
const stateOf = (lon: number, lat: number): string | undefined =>
  states.find((s) => geoContains(s, [lon, lat]))?.properties.postal;

describe('projectionFor', () => {
  const W = 1200;
  const H = 760;
  const p = projectionFor(W, H);
  const xy = (lon: number, lat: number): [number, number] => {
    const v = p([lon, lat]);
    if (!v) throw new Error('unprojectable');
    return v;
  };
  // Ground miles per pixel near a point, from the projection itself.
  const miPerPx = (x: number, y: number): number => {
    const a = p.invert?.([x - 20, y]);
    const b = p.invert?.([x + 20, y]);
    if (!a || !b) throw new Error('uninvertible');
    return (geoDistance(a, b) * MI) / 40;
  };

  it('puts ALPHA-03 due south of Lexington KY by its anchor distance', () => {
    const f = site('ALPHA-03');
    const [sx, sy] = xy(f.lon, f.lat);
    const [cx, cy] = xy(f.anchor.cityLon, f.anchor.cityLat);
    expect(f.anchor.city).toBe('Lexington');
    expect(sy).toBeGreaterThan(cy); // south is down the frame
    const px = Math.hypot(sx - cx, sy - cy);
    expect(Math.abs(px * miPerPx(sx, sy) - (f.anchor.miles as number))).toBeLessThan(1);
    // Bearing S: the offset runs along the local meridian, so little sideways drift.
    expect(Math.abs(sx - cx)).toBeLessThan(px * 0.25);
    expect(stateOf(f.lon, f.lat)).toBe('KY');
  });

  it('puts ALPHA-02 north-west of Denver and ALPHA-04 east of Reno', () => {
    const a2 = site('ALPHA-02');
    const [x2, y2] = xy(a2.lon, a2.lat);
    const [dx, dy] = xy(a2.anchor.cityLon, a2.anchor.cityLat);
    expect(x2).toBeLessThan(dx);
    expect(y2).toBeLessThan(dy);
    expect(stateOf(a2.lon, a2.lat)).toBe('CO');

    const a4 = site('ALPHA-04');
    const [x4] = xy(a4.lon, a4.lat);
    const [rx] = xy(a4.anchor.cityLon, a4.anchor.cityLat);
    expect(x4).toBeGreaterThan(rx);
    expect(stateOf(a4.lon, a4.lat)).toBe('NV');
  });

  it('keeps west left of east and north above south across the country', () => {
    const [xw] = xy(site('GAMMA-12').lon, site('GAMMA-12').lat); // San Francisco area
    const [xe] = xy(site('GAMMA-01').lon, site('GAMMA-01').lat); // Boston area
    expect(xw).toBeLessThan(W * 0.1);
    expect(xe).toBeGreaterThan(W * 0.88);
    const [, yn] = xy(site('BETA-07').lon, site('BETA-07').lat); // Seattle area
    const [, ys] = xy(site('GAMMA-06').lon, site('GAMMA-06').lat); // Miami area
    expect(yn).toBeLessThan(H * 0.15);
    expect(ys).toBeGreaterThan(H * 0.85);
  });

  it('projects every canon facility inside the frame at both check sizes and inverts back', () => {
    for (const [w, h] of [
      [1200, 760],
      [600, 380],
    ] as const) {
      const q = projectionFor(w, h);
      for (const f of canon.facilities) {
        const s = site(f.id);
        const v = q([s.lon, s.lat]);
        expect(v, f.id).not.toBeNull();
        const [x, y] = v as [number, number];
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(w);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(h);
        const back = q.invert?.([x, y]) as [number, number];
        expect(back[0]).toBeCloseTo(s.lon, 4);
        expect(back[1]).toBeCloseTo(s.lat, 4);
      }
    }
  });

  it('places anchored sites inside the bundled outline of the state they belong to', () => {
    const expected: Record<string, string> = {
      'ALPHA-01': 'VA',
      'ALPHA-05': 'TX',
      'BETA-01': 'ME',
      'BETA-07': 'WA',
      'BETA-12': 'LA',
      'DELTA-11': 'MI',
    };
    for (const [id, st] of Object.entries(expected)) {
      const f = site(id);
      expect(stateOf(f.lon, f.lat), id).toBe(st);
    }
  });
});

describe('UsMap', () => {
  const mount = (vnode: ComponentChild): HTMLElement => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    render(vnode, el);
    return el;
  };

  it('draws no DELTA marker unless revealDelta is set', () => {
    const hidden = mount(<UsMap width={900} height={570} />);
    expect(hidden.querySelectorAll('.um-marker').length).toBe(35);
    expect(hidden.querySelectorAll('.um-marker[data-id^="DELTA"]').length).toBe(0);
    const shown = mount(<UsMap width={900} height={570} revealDelta />);
    expect(shown.querySelectorAll('.um-marker').length).toBe(canon.facilities.length);
    expect(shown.querySelectorAll('.um-marker[data-id^="DELTA"]').length).toBe(12);
  });

  it('marks the selected site, labels it with a plate, and exposes one tab stop', () => {
    const el = mount(<UsMap width={900} height={570} selected="ALPHA-03" classes={['ALPHA', 'BETA']} />);
    expect(el.querySelectorAll('.um-marker').length).toBe(17);
    expect(el.querySelectorAll('.um-selbox').length).toBe(1);
    expect(el.querySelector('.um-plate')?.textContent).toContain('ARCHIVE SITE TANGO');
    const stops = el.querySelectorAll('.um-marker[tabindex="0"]');
    expect(stops.length).toBe(1);
    expect(stops[0]?.getAttribute('data-id')).toBe('ALPHA-03');
    expect(stops[0]?.getAttribute('aria-label')).toContain('capacity 2,800 berths');
  });

  it('draws each marker at projectionFor of its canon lat/lon', () => {
    const el = mount(<UsMap width={900} height={570} />);
    const p = projectionFor(900, 570);
    for (const id of ['ALPHA-03', 'BETA-07', 'GAMMA-06']) {
      const f = site(id);
      const [x, y] = p([f.lon, f.lat]) as [number, number];
      const t = el.querySelector(`[data-id="${id}"]`)?.getAttribute('transform') ?? '';
      const m = /translate\(([\d.]+),([\d.]+)\)/.exec(t);
      expect(Math.abs(Number(m?.[1]) - x)).toBeLessThanOrEqual(1);
      expect(Math.abs(Number(m?.[2]) - y)).toBeLessThanOrEqual(1);
    }
  });
});
