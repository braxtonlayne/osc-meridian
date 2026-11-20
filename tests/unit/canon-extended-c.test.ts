import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  apportion, buildCanon, buildCanonT2, buildClientCanon, canonT2File, loadAppFragments, loadInputs, validateAppFragments,
} from '../../scripts/canon-merge';
import { landingDepthFt } from '../../src/core/canon-schema';
import { CANON_T2_KEY, canonT2Path } from '../../src/core/canon-release';
import { decodeRelease, encodeRelease, releaseFileName } from '../../src/core/release-codec';

const encodeT2ForTest = (body: Record<string, string>) => encodeRelease(CANON_T2_KEY, body);
import type { Canon } from '../../src/core/canon-types';

const inputs = loadInputs();
const result = buildCanon(inputs);
const canon: Canon = result.canon;
const clientText = readFileSync(resolve(__dirname, '../../content/canon/canon.client.json'), 'utf8');
const client = JSON.parse(clientText) as Canon;
const appears = (s: string): boolean => clientText.includes(JSON.stringify(s).slice(1, -1));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const plant = canon.facilities.filter((f) => f.class !== 'DELTA');
const acct = (id: string) => canon.accounts.find((a) => a.id === id)!;
const formDocNos = readdirSync(resolve(__dirname, '../../content/forms'))
  .filter((n) => n.endsWith('.md'))
  .map((n) => /^docNo:\s*(\S+)/m.exec(readFileSync(resolve(__dirname, '../../content/forms', n), 'utf8'))?.[1]);

describe('extended-c merge', () => {
  it('builds without errors', () => {
    expect(result.errors).toEqual([]);
    expect(inputs.extendedC).toBeTruthy();
  });
  it('leaves source-only and A/B-only merges valid', () => {
    expect(buildCanon({ source: inputs.source, extendedA: inputs.extendedA, extendedB: inputs.extendedB }).errors).toEqual([]);
  });
});

describe('accounts', () => {
  it('has the four accounts', () => {
    expect(canon.accounts.map((a) => a.id).sort()).toEqual(['analyst', 'auditor', 'deputy', 'lifesupport']);
  });
  it('analyst mirrors the operator', () => {
    const a = acct('analyst');
    const o = canon.operator;
    expect([a.operatorId, a.passphrase, a.pn, a.displayName, a.tier, a.site, a.divisionId, a.compartments, a.probationStart, a.supervisorPn, a.email]).toEqual([
      o.operatorId, o.passphrase, o.pn, o.displayName, o.tier, o.site, o.divisionId, o.compartments, o.probationStart, o.supervisorPn, o.email,
    ]);
  });
  it('places each account as SPEC-2 says', () => {
    const ls = acct('lifesupport');
    expect([ls.tier, ls.site.startsWith('GAMMA-'), ls.compartments]).toEqual([4, true, []]);
    const d = acct('deputy');
    expect([d.tier, d.site, d.compartments, d.roleTitle]).toEqual([2, 'ALPHA-02', [], 'Deputy Commander, ALPHA-02']);
    const au = acct('auditor');
    expect([au.tier, au.site, au.divisionId, au.compartments, au.auditReader]).toEqual([3, 'ALPHA-01', 'OIA', ['BRIAR'], true]);
    expect(canon.divisions.find((x) => x.id === 'OIA')!.site).toBe(au.site);
    expect(canon.accounts.filter((a) => a.auditReader).map((a) => a.id)).toEqual(['auditor']);
  });
  it('has roster entries for the three new holders, and operator ids in the card format', () => {
    for (const a of canon.accounts.filter((x) => x.id !== 'analyst')) {
      const p = canon.roster.find((x) => x.pn === a.pn)!;
      expect(p, a.id).toBeTruthy();
      expect([p.tier, p.site], a.id).toEqual([a.tier, a.site]);
      expect(a.operatorId).toBe(`OPR-${a.site[0]}${a.site.slice(-2)}-${a.pn.slice(-4)}`);
      expect(canon.roster.some((x) => x.pn === a.supervisorPn), a.id).toBe(true);
    }
  });
  it('routes approvals to the deputy only, on forms that exist', () => {
    expect(acct('deputy').approves).toContain('OSC-F-126');
    for (const a of canon.accounts) for (const f of a.approves) expect(formDocNos, `${a.id} ${f}`).toContain(f);
    expect(canon.accounts.filter((a) => a.approves.length).map((a) => a.id)).toEqual(['deputy']);
  });
  it('gives the Tier 4 technician only apps that fit a GAMMA site (no hoist)', () => {
    const ls = acct('lifesupport');
    expect(ls.desktop).toContain('environ');
    expect(ls.desktop).not.toContain('hoist');
    expect(canon.hoists.some((h) => h.facility === ls.site)).toBe(false);
  });
});

describe('restricted values', () => {
  const deputy = canon.roster.find((p) => p.pn === acct('deputy').pn)!;
  const t2 = buildCanonT2(canon);
  it('keeps the deputy name and personal address out of the client canon', () => {
    expect(deputy.tier).toBe(2);
    expect(appears(deputy.name)).toBe(false);
    expect(appears(deputy.email)).toBe(false);
    expect(appears(deputy.name.split(' ').pop()!)).toBe(false);
  });
  it('puts the deputy name in the CANON-T2 release', () => {
    expect(t2[`accounts.deputy.name`]).toBe(deputy.name);
    expect(t2[`roster.${deputy.pn}.name`]).toBe(deputy.name);
    expect(t2['roster.P-2-03-0039.name']).toBe(canon.roster.find((p) => p.pn === 'P-2-03-0039')!.name);
    expect(decodeRelease(CANON_T2_KEY, encodeT2ForTest(t2))).toEqual(t2);
  });
  it('the written release file decodes to the same values', () => {
    const file = canonT2File();
    expect(file.endsWith(`${releaseFileName(CANON_T2_KEY)}.json`)).toBe(true);
    expect(canonT2Path()).toBe(`data/releases/${releaseFileName(CANON_T2_KEY)}.json`);
    if (!existsSync(file)) return; // written by npm run canon; the content build may clear the folder
    expect(decodeRelease(CANON_T2_KEY, JSON.parse(readFileSync(file, 'utf8')))).toEqual(t2);
  });
  it('never carries a Tier 1 or compartment value', () => {
    const withheld = buildClientCanon(canon).withheld;
    const t2Texts = new Set(withheld.filter((w) => w.key === 'T2').map((w) => w.text));
    const values = new Set(Object.values(t2));
    for (const w of withheld) if (w.key !== 'T2' && !t2Texts.has(w.text)) expect(values.has(w.text), `${w.path} (${w.key})`).toBe(false);
    for (const p of canon.roster.filter((x) => x.tier === 1)) expect(values.has(p.name)).toBe(false);
  });
  it('carries every GAMMA depth of record', () => {
    for (const f of canon.facilities.filter((x) => x.class === 'GAMMA')) expect(t2[`facilities.${f.id}.depthFt`]).toBe(String(f.depthFt));
  });
  it('ships the plant data and accounts to the client unredacted (nothing restricted in them)', () => {
    for (const k of ['accounts', 'survivability', 'sealDrill', 'templateLevels', 'doors', 'cameras', 'hoists', 'musterPoints'] as const) {
      expect(client[k], k).toEqual(canon[k]);
      expect(JSON.stringify(client[k]).includes('[[RX:'), k).toBe(false);
    }
  });
});

describe('plant data', () => {
  it('gives every non-DELTA facility a hardening class, and DELTA none', () => {
    expect(canon.survivability.facilities.map((x) => x.facility).sort()).toEqual(plant.map((f) => f.id).sort());
    const byId = new Map(canon.survivability.facilities.map((x) => [x.facility, x.hardeningClass]));
    for (const f of plant.filter((x) => x.class === 'ALPHA')) expect(byId.get(f.id)).toBe('H1');
    expect(canon.survivability.classes.map((k) => k.id)).toEqual(['H1', 'H2', 'H3', 'H4']);
  });
  it('contour coefficients shrink as overpressure rises', () => {
    const k = canon.survivability.contours;
    for (let i = 1; i < k.length; i++) expect(k[i]!.rangeCoeffMi).toBeLessThan(k[i - 1]!.rangeCoeffMi);
  });
  it('muster capacities cover posted staff and assignments sum to it', () => {
    expect(canon.musterPoints.map((m) => m.facility).sort()).toEqual(plant.map((f) => f.id).sort());
    for (const m of canon.musterPoints) {
      const f = canon.facilities.find((x) => x.id === m.facility)!;
      expect(sum(m.points.map((p) => p.capacity)), f.id).toBeGreaterThanOrEqual(f.staff!);
      expect(sum(m.points.map((p) => p.assigned)), f.id).toBe(f.staff);
      for (const p of m.points) expect(p.assigned, p.id).toBeLessThanOrEqual(p.capacity);
    }
  });
  it('hoist travel matches level depths and ends at the facility depth', () => {
    for (const f of plant.filter((x) => x.class === 'ALPHA')) {
      const hs = canon.hoists.filter((h) => h.facility === f.id);
      expect(hs.length, f.id).toBeGreaterThan(0);
      for (const h of hs) {
        const stops = h.levels.map((n) => landingDepthFt(f.levels!.find((l) => l.n === n)!));
        expect(h.stops.map((s) => s.depthFt)).toEqual(stops);
        expect(h.travelFt).toBe(stops[stops.length - 1]! - stops[0]!);
        expect(Math.max(...stops)).toBeLessThanOrEqual(f.depthFt!);
      }
      const personnel = hs.find((h) => h.kind === 'personnel')!;
      expect(personnel.stops[personnel.stops.length - 1]!.depthFt, f.id).toBe(f.depthFt);
    }
  });
  it('doors sit on levels that exist; airlocks pair two interlocked doors', () => {
    for (const s of canon.doors) {
      const f = canon.facilities.find((x) => x.id === s.facility)!;
      const levels = f.class === 'ALPHA' ? f.levels!.map((l) => l.n) : canon.templateLevels[f.class as 'BETA' | 'GAMMA'].map((l) => l.n);
      for (const d of s.doors) expect(levels, d.id).toContain(d.level);
      for (const a of s.airlocks) {
        const o = s.doors.find((d) => d.id === a.outer)!;
        const i = s.doors.find((d) => d.id === a.inner)!;
        expect([o.kind, i.kind, o.level, i.level]).toEqual(['airlock', 'airlock', a.level, a.level]);
      }
      expect(s.doors.some((d) => d.kind === 'blast' && d.level === 1), s.facility).toBe(true);
    }
    // Segment 04 is not in revenue service: its portal doors stand closed at both ends.
    for (const id of ['ALPHA-02', 'ALPHA-05'])
      expect(canon.doors.find((s) => s.facility === id)!.doors.find((d) => d.location === 'Segment 04 tunnel portal door')!.normal).toBe('closed');
  });
  it('cameras cover every non-DELTA facility with unique ids on real levels', () => {
    const ids = canon.cameras.flatMap((s) => s.cameras.map((k) => k.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(canon.cameras.map((s) => s.facility).sort()).toEqual(plant.map((f) => f.id).sort());
    for (const s of canon.cameras.filter((x) => x.facility.startsWith('ALPHA'))) {
      const f = canon.facilities.find((x) => x.id === s.facility)!;
      for (const k of s.cameras) expect(f.levels!.find((l) => l.n === k.level)!.tier, k.id).toBe(k.tier);
    }
  });
  it('orders the seal drill over every non-DELTA site, starting at the origin', () => {
    const seq = canon.sealDrill.sequence;
    expect(seq[0]).toMatchObject({ facility: canon.sealDrill.origin, offsetMin: 0, relay: 'origin' });
    expect(seq.map((s) => s.facility).sort()).toEqual(plant.map((f) => f.id).sort());
    for (const k of canon.sealDrill.classes) expect(k.sealMin).toBeGreaterThanOrEqual(k.ackMin + k.doorCycleMin);
    const ls = seq.find((s) => s.facility === acct('lifesupport').site)!;
    expect(ls.relay).toBe('tram');
  });
  it('apportions exactly', () => {
    expect(apportion(38, [0.75, 0.25])).toEqual([29, 9]);
    expect(sum(apportion(287, [0.4, 0.25, 0.2, 0.1, 0.05]))).toBe(287);
  });
});

describe('app fragments', () => {
  it('merges content/canon/apps/*.json into canon.apps by file name', () => {
    const dir = mkdtempSync(join(tmpdir(), 'canon-apps-'));
    writeFileSync(join(dir, 'strike.json'), JSON.stringify({ a: 1 }));
    writeFileSync(join(dir, 'notes.txt'), 'ignored');
    expect(loadAppFragments(dir)).toEqual({ strike: { a: 1 } });
    const merged = buildCanon({ ...inputs, apps: { strike: { a: 1 } } });
    expect(merged.errors).toEqual([]);
    expect(merged.canon.apps).toEqual({ strike: { a: 1 } });
  });
  it('validates a fragment with the app schema, and rejects unknown app ids', async () => {
    // The module runner only loads files inside the project, so the stand-in schema folder is
    // created under tests/unit and removed afterwards.
    const dir = mkdtempSync(join(__dirname, '.canon-app-schemas-'));
    try {
      // A stand-in for a Zod schema: only safeParse is used.
      writeFileSync(
        join(dir, 'strike.ts'),
        'export const schema = { safeParse: (v: any) => (typeof v?.a === "number" ? { success: true } : { success: false, error: { issues: [{ path: ["a"], message: "expected number" }] } }) };\n',
      );
      expect((await validateAppFragments({ strike: { a: 1 } }, dir)).errors).toEqual([]);
      expect((await validateAppFragments({ strike: { a: 'x' } }, dir)).errors).toEqual(['apps/strike.json: a: expected number']);
      expect((await validateAppFragments({ pinball: {} }, dir)).errors[0]).toMatch(/not an AppId/);
      expect((await validateAppFragments({ doors: {} }, dir)).unchecked).toEqual(['doors']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('the shipped fragments pass their schemas', async () => {
    expect((await validateAppFragments(canon.apps)).errors).toEqual([]);
  });
});
