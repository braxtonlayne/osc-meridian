import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildClientCanon, serialize } from '../../scripts/canon-merge';
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
    expect(client.reactors).toEqual(full.reactors);
    expect(client.facilities.filter((f) => f.class !== 'DELTA').map((f) => [f.id, f.lat, f.lon, f.staff, f.capacity])).toEqual(
      full.facilities.filter((f) => f.class !== 'DELTA').map((f) => [f.id, f.lat, f.lon, f.staff, f.capacity]),
    );
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
