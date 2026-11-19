import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RELEASED_SITES, adjacentSites, buildClientCanon, serialize } from '../../scripts/canon-merge';
import { clientCanonSchema } from '../../src/core/canon-schema';
import type { Canon } from '../../src/core/canon-types';
import { isRx, rxInfo, splitRx, rxPlain } from '../../src/core/rx';
import clientJson from '@canon';

const dir = resolve(__dirname, '../../content/canon');
const full = JSON.parse(readFileSync(resolve(dir, 'canon.json'), 'utf8')) as Canon;
const text = readFileSync(resolve(dir, 'canon.client.json'), 'utf8');
const client = JSON.parse(text) as Canon;

// The browser alias must resolve to the client file, and the client file must still be a Canon.
const _typed: Canon = clientJson as unknown as Canon;
void _typed;

/** Search the raw file text, so JSON escaping cannot hide a match. */
const appears = (s: string): boolean => text.includes(JSON.stringify(s).slice(1, -1));

describe('client canon', () => {
  it('is what @canon resolves to', () => {
    expect(clientJson).toEqual(client);
  });

  it('parses against the client canon schema', () => {
    const r = clientCanonSchema.safeParse(client);
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues.slice(0, 5))).toBe(true);
  });

  it('is exactly what canon-merge derives from the full canon (regenerate with npm run canon)', () => {
    expect(serialize(buildClientCanon(full).client)).toBe(text);
  });

  it('carries no tier 1 or tier 2 roster name or address', () => {
    const restricted = full.roster.filter((p) => p.tier <= 2);
    expect(restricted.length).toBeGreaterThan(0);
    for (const p of restricted) {
      expect(appears(p.name), p.name).toBe(false);
      expect(appears(p.email), p.email).toBe(false);
      const c = client.roster.find((x) => x.pn === p.pn)!;
      expect(rxInfo(c.name)).toEqual({ key: `T${p.tier}`, len: p.name.length });
    }
  });

  it('carries no restricted level name', () => {
    let n = 0;
    for (const f of full.facilities)
      for (const l of f.levels ?? []) {
        const c = client.facilities.find((x) => x.id === f.id)!.levels!.find((x) => x.n === l.n)!;
        if (l.tier <= 2) {
          n++;
          expect(appears(l.name), l.name).toBe(false);
          expect(rxInfo(c.name)).toEqual({ key: `T${l.tier}`, len: l.name.length });
        } else {
          expect(c.name).toBe(l.name);
        }
      }
    expect(n).toBeGreaterThan(0);
  });

  it('carries no DELTA location detail', () => {
    const delta = full.facilities.filter((f) => f.class === 'DELTA');
    expect(delta).toHaveLength(12);
    for (const f of delta) {
      expect(appears(f.locationText), f.id).toBe(false);
      for (const s of [f.coverIdentity, f.coverStory, f.terrain, f.anchor.city]) if (s) expect(appears(s), `${f.id}: ${s}`).toBe(false);
      const c = client.facilities.find((x) => x.id === f.id)!;
      expect(rxInfo(c.locationText)?.key).toBe('SEXTANT');
      expect([c.lat, c.lon, c.anchor.cityLat, c.anchor.cityLon, c.anchor.miles]).toEqual([null, null, null, null, null]);
    }
  });

  it('withholds tier 1 and 2 reserve items and protocol titles', () => {
    for (const it of full.reserves.items.filter((x) => x.tier <= 2)) {
      const c = client.reserves.items.find((x) => x.id === it.id)!;
      expect(c.value).toBeNull();
      expect(isRx(c.label) && isRx(c.text)).toBe(true);
    }
    for (const t of client.threatDetail.filter((x) => x.protocol.titleWithheld)) expect(rxInfo(t.protocol.title)?.key).toBe('T1');
  });

  it('keeps headline figures and unrestricted records identical', () => {
    expect(client.headline).toEqual(full.headline);
    expect(client.classes).toEqual(full.classes);
    expect(client.tiers).toEqual(full.tiers);
    expect(client.budget).toEqual(full.budget);
    expect(client.reactors.map((r) => [r.id, r.status, r.thermalMWt])).toEqual(full.reactors.map((r) => [r.id, r.status, r.thermalMWt]));
    const open = (c: Canon) => c.facilities.filter((f) => f.class !== 'DELTA').map((f) => [f.id, f.staff, f.capacity]);
    expect(open(client)).toEqual(open(full));
    // DELTA per-site figures are withheld; the class totals stay in clear.
    for (const f of client.facilities.filter((x) => x.class === 'DELTA')) expect([f.staff, f.capacity, f.staffBreakdown]).toEqual([null, null, []]);
    const delta = client.classes.find((k) => k.id === 'DELTA')!;
    const fullDelta = full.facilities.filter((f) => f.class === 'DELTA');
    expect(delta.statedCapacity).toBe(fullDelta.reduce((s, f) => s + f.capacity!, 0));
    expect(delta.statedStaff).toBe(fullDelta.reduce((s, f) => s + f.staff!, 0));
  });

  // Registry plan (src/apps/registry/model.ts): own site + directly linked sites in full.
  const near = adjacentSites(full, full.operator.site);
  it('releases positions for the home network and GAMMA only (22 map markers)', () => {
    expect([...near].filter((id) => !id.startsWith('GAMMA')).sort()).toEqual(['ALPHA-01', 'ALPHA-03', 'ALPHA-05', 'BETA-09']);
    for (const f of full.facilities) {
      const c = client.facilities.find((x) => x.id === f.id)!;
      const open = f.class === 'GAMMA' || (f.class !== 'DELTA' && near.has(f.id));
      if (open) {
        expect([c.lat, c.lon, c.locationText], f.id).toEqual([f.lat, f.lon, f.locationText]);
      } else {
        expect([c.lat, c.lon, c.anchor.cityLat, c.anchor.miles], f.id).toEqual([null, null, null, null]);
        expect(rxInfo(c.locationText)?.key, f.id).toBe('SEXTANT');
        expect(appears(f.locationText), f.id).toBe(false);
        if (f.coverStory) expect(appears(f.coverStory), f.id).toBe(false);
      }
    }
    expect(client.facilities.filter((f) => typeof f.lat === 'number')).toHaveLength(22);
  });

  it('withholds GAMMA depth (T2) and BETA reactor identity outside the home network', () => {
    for (const f of client.facilities.filter((x) => x.class === 'GAMMA')) expect(f.depthFt).toBeNull();
    for (const f of client.facilities.filter((x) => x.class === 'BETA')) expect(f.reactor === null, f.id).toBe(!near.has(f.id));
    const hidden = full.reactors.filter((r) => r.site.startsWith('BETA') && !near.has(r.site));
    expect(hidden.length).toBeGreaterThan(0);
    for (const r of hidden) expect(rxInfo(client.reactors.find((x) => x.id === r.id)!.site)?.key).toBe('SEXTANT');
  });

  it('withholds DELTA records except designation and class', () => {
    for (const f of client.facilities.filter((x) => x.class === 'DELTA')) {
      expect(isRx(f.function) && f.depthFt === null && f.reactor === null && f.network === null, f.id).toBe(true);
    }
  });

  it('withholds HOLLOW roster entries except pn, site and tier', () => {
    const unposted = full.roster.filter((p) => p.site === 'DETACHED / UNPOSTED');
    expect(unposted).toHaveLength(3);
    for (const p of unposted) {
      const c = client.roster.find((x) => x.pn === p.pn)!;
      for (const k of ['name', 'role', 'email', 'notes'] as const) expect(rxInfo(c[k])?.key, `${p.pn}.${k}`).toBe('HOLLOW');
      expect(appears(p.name)).toBe(false);
      expect(appears(p.notes)).toBe(false);
    }
  });

  it('withholds cover rows and contractor sites outside what content releases', () => {
    for (const row of client.coverCatalogue) {
      const open = row.facility === full.operator.site || RELEASED_SITES.includes(row.facility);
      expect(row.visibleSurfaceStaff === null, row.facility).toBe(!open);
      expect(isRx(row.coverAgency), row.facility).toBe(!open);
    }
    expect(client.coverCatalogue.filter((r) => !isRx(r.coverAgency)).map((r) => r.facility).sort()).toEqual(['ALPHA-03', 'BETA-09']);
    for (const pc of client.contractors.register)
      for (const s of pc.sites) {
        if (s === full.operator.site) continue;
        expect(rxInfo(s)?.key, pc.id).toMatch(/^(SEXTANT|T1)$/);
      }
  });
});

describe('graphics build from the client canon', () => {
  it('tunnelmap, tunnel3d and schematic models build with withheld positions', async () => {
    const links = await import('../../src/graphics/tunnelmap/links');
    expect(links.tunnelLinks.length).toBeGreaterThan(0);
    const t3 = await import('../../src/graphics/tunnel3d/model');
    expect(t3.buildTunnelModel().links.length).toBeGreaterThan(0);
    const sch = await import('../../src/graphics/schematic/layout');
    expect(sch.railKey('01')).toBeTruthy();
  });
});

describe('rx helpers', () => {
  it('detect and measure sentinels', () => {
    expect(isRx('[[RX:T2:14]]')).toBe(true);
    expect(isRx('x [[RX:T2:14]]')).toBe(false);
    expect(rxInfo('[[RX:SEXTANT:97]]')).toEqual({ key: 'SEXTANT', len: 97 });
    expect(rxInfo('Level 4')).toBeNull();
    expect(rxInfo(null)).toBeNull();
    expect(splitRx('Seen by [[RX:T1:5]] today')).toEqual([{ text: 'Seen by ' }, { rx: { key: 'T1', len: 5 } }, { text: ' today' }]);
    expect(rxPlain('a [[RX:T1:3]] b', '#')).toBe('a ### b');
  });
});
