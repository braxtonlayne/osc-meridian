// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildContent, loadManifestDocNos, type BuildResult } from '../../scripts/content/build.ts';
import { FrontmatterSchema } from '../../scripts/content/schema.ts';
import { ContentBuildError } from '../../scripts/content/util.ts';
import { checkDrift, figureRules } from '../../scripts/content/figures.ts';
import { clearStrings, findBannedWords, findExternalUrls, findWithheld, isAgencyName, isAuthoredName, checkReleaseFiles, findSlotTokens, isDocFile, withheldNeedles } from '../../scripts/verify-dist.ts';
import { appHomeHtml, blankSlots, readAppHomes, renderPage, SLOT_BLANK, STATIC_MARKER } from '../../scripts/prerender.ts';
import { applyReleases, createDocs } from '../../src/core/docs';
import { createSearch } from '../../src/core/search';
import type { RouteEntry } from '../../src/core/contracts';
import { decodeRelease, encodeRelease, releaseFileName, type EncodedRelease } from '../../src/core/release-codec';

/** Release files as the content build writes them: { <hash>: encoded body }. */
function releaseFiles(releases: Record<string, Record<string, string>>): Record<string, EncodedRelease> {
  return Object.fromEntries(Object.entries(releases).map(([k, m]) => [releaseFileName(k), encodeRelease(k, m)]));
}

const FIXTURES = resolve(__dirname, '../fixtures/content');
const CANON = resolve(__dirname, '../fixtures/canon.json');

/** Text that only exists inside redactions in the fixtures. */
const HIDDEN_T2 = ['Lanyard Protocol', 'Fixture Deputy Bravo'];
const HIDDEN_COMPARTMENT = ['Heron Gate', 'Inner Kestrel Note'];
const HIDDEN_T1 = ['Quarry Annex Seven', 'Nested Lantern Line', 'Fixture Director Alpha'];

function build(extra: Partial<Parameters<typeof buildContent>[0]> = {}): BuildResult {
  return buildContent({ contentDir: FIXTURES, canonPath: CANON, ...extra });
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const FM = {
  id: 'dir-0099',
  route: '/directives/dir-0099',
  app: 'directives',
  family: 'directives',
  template: 'directive',
  docNo: 'OSC-DIR-0099',
  title: 'Parking Allocation, Level 2',
  marking: 'UMBRA-U',
  originator: 'FS/ALPHA-03',
  revision: 1,
  date: '2008-05-01',
  summary: 'Parking allocation for the Level 2 vehicle bay.',
};

function tempContent(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'meridian-fx-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(join(dir, p, '..'), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  return dir;
}

function md(fm: Record<string, unknown>, body: string): string {
  const yaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v)}`)
    .join('\n');
  return `---\n${yaml}\n---\n\n${body}\n`;
}

function expectBuildError(dir: string, pattern: RegExp): ContentBuildError {
  try {
    buildContent({ contentDir: dir, canonPath: CANON });
  } catch (e) {
    expect(e).toBeInstanceOf(ContentBuildError);
    expect((e as Error).message).toMatch(pattern);
    return e as ContentBuildError;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  throw new Error('expected a ContentBuildError');
}

describe('content pipeline', () => {
  let r: BuildResult;
  beforeAll(() => {
    r = build();
  });

  it('builds routes sorted by route', () => {
    expect(r.routes.map((x) => x.route)).toEqual(['/directives/dir-0001', '/records/mem-08-0002']);
    expect(r.routes[1]!.access).toEqual({ tier: 2, compartment: 'KESTREL' });
  });

  it('never leaks hidden text into baseline html or the search index', () => {
    const blobs = [JSON.stringify(r.docs), r.searchJson, JSON.stringify(r.routes)];
    for (const s of [...HIDDEN_T2, ...HIDDEN_COMPARTMENT, ...HIDDEN_T1]) {
      for (const b of blobs) expect(b).not.toContain(s);
    }
    const dir = r.docs.find((d) => d.id === 'dir-0001')!;
    expect(dir.html).toContain('Fixture Analyst Charlie'); // tier-3 roster names are visible
    expect(dir.html).toMatch(/<span class="rx" data-rx="dir-0001-1" data-len="16" data-auth="OIA" data-ref="OIA-08-114" data-key="T2"/);
    expect(dir.html).toMatch(/<div class="rx rx-block" data-rx="dir-0001-3"[^>]*data-key="T1"[^>]*data-lines="1"/);
  });

  it('writes release files per key and never a tier-1 key or tier-1 text', () => {
    expect(Object.keys(r.releases).sort()).toEqual(['KESTREL', 'KESTREL+T2', 'T2']);
    expect(Object.keys(r.releases.T2!).sort()).toEqual(['dir-0001-1', 'dir-0001-5', 'dir-0001-8']);
    expect(r.releases.KESTREL).toEqual({ 'dir-0001-2': 'Heron Gate' });
    expect(r.releases['KESTREL+T2']).toEqual({ 'dir-0001-6': 'Inner Kestrel Note' });
    // the outer T2 block carries the inner compartment bar, not its text
    expect(r.releases.T2!['dir-0001-5']).toContain('data-rx="dir-0001-6"');
    expect(r.releases.T2!['dir-0001-5']).not.toContain('Inner Kestrel Note');
    // the T2 redaction nested in a T1 block is dropped entirely
    const ids = r.docs.flatMap((d) => d.redactions.map((x) => x.id));
    expect(ids).not.toContain('dir-0001-4');

    const out = mkdtempSync(join(tmpdir(), 'meridian-out-'));
    try {
      buildContent({ contentDir: FIXTURES, canonPath: CANON, outDir: out });
      const files = walk(out);
      const t2File = files.find((f) => f.endsWith(`${releaseFileName('T2')}.json`));
      expect(t2File).toBeDefined();
      expect(decodeRelease('T2', JSON.parse(readFileSync(t2File!, 'utf8')))).toEqual(r.releases.T2);
      expect(files.some((f) => /(T1|T2|KESTREL)\.json$/.test(f))).toBe(false);
      expect(files.some((f) => f.endsWith(`${releaseFileName('T1')}.json`))).toBe(false);
      for (const f of files) {
        const text = readFileSync(f, 'utf8');
        for (const s of HIDDEN_T1) expect(text, `${f} contains ${s}`).not.toContain(s);
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('resolves canon values with formatting', () => {
    const html = r.docs.find((d) => d.id === 'dir-0001')!.html;
    expect(html).toContain('>3,847<');
    expect(html).toContain('>1,400<');
    expect(html).toContain('>2001<'); // years keep no separator
    expect(html).toContain('>NOV 2003<');
    expect(html).toContain('ratio 3:Ab notwithstanding'); // bare unknown text directive restored
    expect(html).toContain('<td>BETA-07</td>');
    expect(html).not.toContain('ALPHA-03</td>'); // class filter applied
  });

  it('fails on unknown canon paths with file:line', () => {
    const dir = tempContent({ 'directives/a.md': md(FM, 'Line one.\n\nValue :c[headline.nope].') });
    const e = expectBuildError(dir, /directives\/a\.md:\d+.*headline\.nope/);
    expect(e.problems[0]!.line).toBe(18);
  });

  it('resolves cross-references with the base path and fails on unknown docNos', () => {
    const dir = r.docs.find((d) => d.id === 'dir-0001')!;
    expect(dir.html).toContain('<a href="/records/mem-08-0002" data-xref="/records/mem-08-0002" class="xref">OSC-MEM-08-0002</a>');
    expect(dir.xrefs).toEqual([{ docNo: 'OSC-MEM-08-0002', route: '/records/mem-08-0002', title: 'Staffing Reconciliation, Second Quarter' }]);
    const paged = build({ base: '/osc-meridian' });
    expect(paged.docs.find((d) => d.id === 'dir-0001')!.html).toContain('href="/osc-meridian/records/mem-08-0002"');
    expectBuildError(tempContent({ 'directives/a.md': md(FM, 'See :x[OSC-DIR-9999].') }), /unknown document number/);
  });

  it('assigns heading ids and wrapper classes', () => {
    const d = r.docs.find((x) => x.id === 'dir-0001')!;
    expect(d.headings.map((h) => h.id)).toEqual(['1-purpose', '2-policy', '2-policy-2']);
    for (const cls of ['margin-note', 'stamp', 'routing-slip', 'scan-page']) expect(d.html).toContain(`class="${cls}"`);
    expect(d.html).toContain('02 MAY 2008');
  });

  it('emits the scan/stamp kit attributes', () => {
    const d = r.docs.find((x) => x.id === 'dir-0001')!;
    expect(d.html).toContain('<span data-ink="circle"><span class="cv" data-canon="headline.tunnelCertifiedMi">847</span></span>');
    expect(d.html).toContain('<aside class="margin-note" data-hand="RT" data-seed="5" data-mark="arrow">');
    expect(d.html).toContain('<aside class="margin-note" data-hand="RT" data-seed="3" data-mark="none">');
    expect(d.html).toContain(
      '<span class="stamp" data-kind="COPY-NO" data-date="2008-05-03" data-text="3" data-seed="4" data-of="12" data-ink="red"><span class="stamp-kind">COPY NO</span> <span class="stamp-text">3</span> <span class="stamp-of">OF 12</span> <span class="stamp-date">03 MAY 2008</span></span>',
    );
    expect(d.html).toContain('data-initials="JH 5/2,MKB 5/5"');
    expect(d.html).toContain('<span class="routing-initial" data-seq="2">MKB 5/5</span>');
    expectBuildError(tempContent({ 'directives/a.md': md(FM, 'x :ink[y]{mark=box}') }), /:ink mark="box"/);
  });
});

describe('validation modes for parallel content agents', () => {
  const FM2 = { ...FM, id: 'mem-0200', route: '/records/mem-0200', family: 'records', app: 'records', docNo: 'OSC-MEM-08-0200' };

  it('onlyDir reports problems only for that dir but still resolves cross-family xrefs', () => {
    const dir = tempContent({
      'directives/a.md': md(FM, 'See :x[OSC-MEM-08-0200].'),
      'records/b.md': md(FM2, 'Broken :c[headline.nope] here.'),
    });
    try {
      const r = buildContent({ contentDir: dir, canonPath: CANON, onlyDir: join(dir, 'directives'), displayRoot: dir });
      expect(r.docs.find((d) => d.id === 'dir-0099')!.html).toContain('href="/records/mem-0200"');
      expect(r.suppressed).toBe(1);
      expect(() => buildContent({ contentDir: dir, canonPath: CANON, onlyDir: join(dir, 'records'), displayRoot: dir })).toThrow(
        /records\/b\.md:\d+.*headline\.nope/,
      );
      expect(() => buildContent({ contentDir: dir, canonPath: CANON, onlyDir: dir, outDir: dir })).toThrow(/cannot be combined/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('manifest xrefs to pages not yet written are warnings in dry run and errors otherwise', () => {
    const dir = tempContent({
      'directives/a.md': md({ ...FM, xrefs: ['OSC-LED-0001'] }, 'See :x[OSC-PER-0007] and :x[OSC-DIR-0099].'),
      'manifest.json': JSON.stringify({ families: { personnel: [{ docNo: 'OSC-PER-0007' }] }, docNos: ['OSC-LED-0001'] }),
    });
    try {
      const planned = loadManifestDocNos(join(dir, 'manifest.json'));
      expect([...planned].sort()).toEqual(['OSC-LED-0001', 'OSC-PER-0007']);
      const r = buildContent({ contentDir: dir, canonPath: CANON, manifestDocNos: planned, pendingXrefsAreWarnings: true, displayRoot: dir });
      expect(r.warnings.map((w) => w.message).join('\n')).toMatch(/OSC-PER-0007[\s\S]*OSC-LED-0001|OSC-LED-0001[\s\S]*OSC-PER-0007/);
      expect(r.warnings.find((w) => w.message.includes('OSC-PER-0007'))!.line).toBe(17);
      expect(() => buildContent({ contentDir: dir, canonPath: CANON, manifestDocNos: planned, displayRoot: dir })).toThrow(
        /planned in the manifest but its page does not exist/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('--dry-run writes nothing', () => {
    const out = mkdtempSync(join(tmpdir(), 'meridian-dry-'));
    try {
      const res = spawnSync(
        process.execPath,
        ['--import', 'tsx', resolve(__dirname, '../../scripts/build-content.ts'), '--content', FIXTURES, '--canon', CANON, '--out', out, '--dry-run'],
        { encoding: 'utf8' },
      );
      expect(res.status, res.stderr).toBe(0);
      expect(res.stdout).toContain('DRY RUN');
      expect(readdirSync(out)).toEqual([]);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe('aliases, lenient builds and structured frontmatter', () => {
  const MAIL = {
    ...FM,
    id: 'msg-0012',
    route: '/mail/msg-0012',
    family: 'mail',
    app: 'mail',
    template: 'message',
    docNo: 'OSC-MSG-08-0012',
    aliases: ['OSC-CB-012'],
  };

  it('resolves :x[] and frontmatter xrefs through aliases and keeps the primary docNo', async () => {
    const dir = tempContent({
      'directives/a.md': md({ ...FM, xrefs: ['OSC-CB-012'] }, 'Briefing :x[OSC-CB-012] applies.'),
      'mail/m.md': md(MAIL, 'Briefing text.'),
    });
    try {
      const r = buildContent({ contentDir: dir, canonPath: CANON });
      const a = r.docs.find((d) => d.id === 'dir-0099')!;
      expect(a.html).toContain('<a href="/mail/msg-0012" data-xref="/mail/msg-0012" class="xref">OSC-CB-012</a>');
      expect(a.xrefs).toEqual([{ docNo: 'OSC-CB-012', route: '/mail/msg-0012', title: MAIL.title }]);
      const m = r.routes.find((x) => x.id === 'msg-0012')! as RouteEntry & { aliases?: string[] };
      expect(m.docNo).toBe('OSC-MSG-08-0012');
      expect(m.aliases).toEqual(['OSC-CB-012']);
      const docs = createDocs({ satisfies: () => true, routes: r.routes, fetchJson: async () => ({}) });
      expect(docs.byDocNo('OSC-CB-012')?.route).toBe('/mail/msg-0012');
      const search = createSearch({ satisfies: () => true, byRoute: docs.byRoute, loadIndex: async () => r.searchJson });
      const hit = (await search('OSC-CB-012'))[0]!;
      expect(hit.route.route).toBe('/mail/msg-0012');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expectBuildError(
      tempContent({ 'mail/m.md': md(MAIL, 'x'), 'directives/a.md': md({ ...FM, aliases: ['OSC-CB-012'] }, 'y') }),
      /duplicate document number "OSC-CB-012"/,
    );
  });

  it('lenient real build skips failing files with warnings and writes the rest', () => {
    const dir = tempContent({
      'directives/a.md': md(FM, 'Good page linking :x[OSC-MEM-08-0300] and :x[OSC-NOPE-1].'),
      'records/b.md': md({ ...FM, id: 'mem-0300', route: '/records/mem-0300', family: 'records', app: 'records', docNo: 'OSC-MEM-08-0300' }, 'Broken :c[headline.nope].'),
      'records/c.md': md({ ...FM, id: 'mem-0301', route: '/records/mem-0301', family: 'records', app: 'records', docNo: 'OSC-MEM-08-0301', date: '2009-01-01' }, 'Bad date.'),
    });
    const out = mkdtempSync(join(tmpdir(), 'meridian-len-'));
    try {
      expectBuildErrorNoCleanup(dir);
      const r = buildContent({ contentDir: dir, canonPath: CANON, outDir: out, lenient: true, displayRoot: dir });
      expect(r.routes.map((x) => x.id)).toEqual(['dir-0099']);
      const html = r.docs[0]!.html;
      expect(html).toContain('linking OSC-MEM-08-0300 and OSC-NOPE-1.'); // plain text, no link
      expect(html).not.toContain('href="/records');
      const w = r.warnings.map((x) => `${x.file}:${x.line ?? ''} ${x.message}`).join('\n');
      expect(w).toMatch(/records\/b\.md:\d+ skipped: .*headline\.nope/);
      expect(w).toMatch(/records\/c\.md:12 skipped: frontmatter date/);
      expect(w).toMatch(/OSC-NOPE-1.*plain text/);
      expect(readdirSync(join(out, 'public', 'data', 'docs'))).toEqual(['dir-0099.json']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('passes structured template blocks through and drops planning fields', () => {
    const form = {
      formNo: 'OSC-F-114',
      edition: '03/2007',
      routing: ['SUPERVISOR', 'RD/ALPHA-03'],
      blocks: [{ n: 1, label: 'Requester', fields: [{ name: 'pn', label: 'Personnel no.', type: 'text', required: true, pattern: '^\\d-\\d{4}$', width: 12, extra: 'kept' }] }],
      submit: { receiptPrefix: 'LV', consequence: { mail: 'msg-0012' } },
    };
    const message = { from: 'a@a03.rd.mer', to: ['b@a03.rd.mer'], cc: [], precedence: 'ROUTINE', sent: '2008-05-02T14:30:00Z', folder: 'inbox', thread: 't1', inReplyTo: null, readReceipt: true, arrival: { after: 'login', minutes: 5 } };
    const fm = { ...FM, form, message, minutes: { present: ['RT'], date: '2008-05-01' }, audience: 3, synopsis: 'internal planning note', plants: ['x'], owner: 'forms', dateMode: 'delivery', slotTemplate: 'a' };
    const dir = tempContent({ 'directives/a.md': md(fm, 'Body.') });
    try {
      const r = buildContent({ contentDir: dir, canonPath: CANON });
      const f = r.docs[0]!.frontmatter;
      expect(f.form).toEqual(form);
      expect(f.message).toEqual(message);
      expect(f.minutes).toEqual({ present: ['RT'], date: '2008-05-01' });
      for (const k of ['audience', 'synopsis', 'plants', 'owner', 'dateMode', 'slotTemplate']) expect(f).not.toHaveProperty(k);
      expect(JSON.stringify(r.docs) + r.searchJson).not.toContain('internal planning note');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expectBuildError(tempContent({ 'directives/a.md': md({ ...FM, form: { formNo: 'X', blocks: 'nope' } }, 'B.') }), /frontmatter form\.blocks/);
    expectBuildError(tempContent({ 'directives/a.md': md({ ...FM, message: { from: 'a', to: [] } }, 'B.') }), /frontmatter message\.to/);
  });

  it.skipIf(!existsSync(resolve(__dirname, '../../content/manifest.json')))('reads the real manifest, including aliases', () => {
    const path = resolve(__dirname, '../../content/manifest.json');
    const m = JSON.parse(readFileSync(path, 'utf8')) as { pages: { docNo: string; aliases?: string[] }[] };
    const planned = loadManifestDocNos(path);
    for (const p of m.pages) {
      expect(planned.has(p.docNo), p.docNo).toBe(true);
      for (const a of p.aliases ?? []) expect(planned.has(a), a).toBe(true);
    }
    expect(planned.size).toBe(m.pages.length + m.pages.reduce((n, p) => n + (p.aliases?.length ?? 0), 0));
  });
});

function expectBuildErrorNoCleanup(dir: string): void {
  expect(() => buildContent({ contentDir: dir, canonPath: CANON })).toThrow(ContentBuildError);
}

describe('restricted material never reaches the baseline', () => {
  const MEM = { ...FM, id: 'mem-0400', route: '/records/mem-0400', family: 'records', app: 'records', docNo: 'OSC-MEM-08-0400', title: 'Gallery Survey Return' };

  it('xrefs inside redactions ship only in the release and merge back on release', async () => {
    const dir = tempContent({
      'directives/a.md': md(
        { ...FM, xrefs: ['OSC-MEM-08-0400'] },
        'Routine text.\n\n:::redact{tier=2 auth="CSO" ref="CSO-08-090"}\nSee :x[OSC-MEM-08-0400] for the survey.\n:::\n\nInline :r[per :x[OSC-MEM-08-0400]]{tier=1 auth="CSO" ref="CSO-08-091"} too.',
      ),
      'records/b.md': md(MEM, 'Survey body.'),
    });
    try {
      const r = buildContent({ contentDir: dir, canonPath: CANON, displayRoot: dir });
      const a = r.docs.find((d) => d.id === 'dir-0099')!;
      expect(a.xrefs).toEqual([]);
      expect(JSON.stringify(a)).not.toContain('OSC-MEM-08-0400');
      expect(JSON.stringify(a)).not.toContain('/records/mem-0400');
      const sdoc = r.search.find((s) => s.id === 'dir-0099')!;
      expect(JSON.stringify(sdoc)).not.toContain('OSC-MEM-08-0400');
      expect(r.warnings.some((w) => /linked only inside a redaction/.test(w.message))).toBe(true);
      const t2 = Object.values(r.releases.T2!)[0]!;
      expect(t2).toContain('data-xref="/records/mem-0400"');

      const fetchJson = async (url: string) => {
        const d = /data\/docs\/(.+)\.json$/.exec(url);
        if (d) return r.docs.find((x) => x.id === d[1]);
        const k = /data\/releases\/(.+)\.json$/.exec(url);
        return releaseFiles(r.releases)[k![1]!] ?? {};
      };
      const closed = await createDocs({ satisfies: (k) => k === 'T3', routes: r.routes, fetchJson }).load('dir-0099');
      expect(closed.xrefs).toEqual([]);
      const open = await createDocs({ satisfies: (k) => k === 'T2', routes: r.routes, fetchJson }).load('dir-0099');
      expect(open.xrefs).toEqual([{ docNo: 'OSC-MEM-08-0400', route: '/records/mem-0400', title: 'Gallery Survey Return' }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('canon-table and :c redact values the client canon withholds', () => {
    const body = [
      '::canon-table{source="facilities.ALPHA-03.levels" cols="n,name,notes"}',
      '',
      '::canon-table{source="facilities" class="DELTA" cols="id,anchor.city,anchor.miles,depthFt"}',
      '',
      'Anchor :c[facilities.DELTA-01.anchor.city], :c[facilities.DELTA-01.anchor.miles] miles out; level :c[facilities.ALPHA-03.levels.7.name]; analyst :c[roster.3-1147.name].',
    ].join('\n');
    const dir = tempContent({ 'directives/a.md': md(FM, body) });
    try {
      const r = buildContent({ contentDir: dir, canonPath: CANON, displayRoot: dir });
      const html = r.docs[0]!.html;
      const baseline = JSON.stringify(r.docs) + r.searchJson + JSON.stringify(r.routes);
      for (const s of ['Cistern Gallery Kappa', 'Tier two gallery notes', 'Sealed Annex Omicron', 'Tier one annex notes', 'Marbleford']) {
        expect(baseline, s).not.toContain(s);
      }
      expect(html).toContain('Level 0: Surface Depot'); // tier-4 level stays
      expect(html).toContain('Fixture Analyst Charlie'); // tier-3 name stays
      expect(html).not.toContain('<td class="num">300</td>'); // DELTA depth is SEXTANT (registry plan, docs/CANON.md)
      const rel = JSON.stringify(r.releases);
      expect(rel).toContain('Cistern Gallery Kappa');
      expect(rel).not.toContain('Sealed Annex Omicron');
      expect(rel).not.toContain('Tier one annex notes');
      expect(Object.keys(r.releases).sort()).toEqual(['SEXTANT', 'T2']);
      // DELTA city is SEXTANT; DELTA numbers (anchor miles, depth) are T1 and never ship.
      expect(Object.values(r.releases.SEXTANT!).join(' ')).toContain('Marbleford');
      expect(rel).not.toMatch(/>30</);
      expect(r.docs[0]!.redactions.filter((x) => x.key === 'T1').length).toBeGreaterThan(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps canon-table filter semantics for missing values (fy.FYxxxx!=undefined)', () => {
    const body = [
      '::canon-table{source="budget.lineItems" filter="fy.FY2003!=undefined" cols="no,fy.FY2003:FY2003"}',
      '',
      '::canon-table{source="budget.lineItems" filter="fy.FY2003=undefined" cols="no,fy.FY2001:FY2001"}',
      '',
      '::canon-table{source="budget.lineItems" filter="fy.FY2001!=undefined" cols="no,amountM"}',
    ].join('\n');
    const dir = tempContent({ 'ledger/a.md': md({ ...FM, family: 'ledger', app: 'ledger', route: '/ledger/a' }, body) });
    try {
      const html = buildContent({ contentDir: dir, canonPath: CANON, displayRoot: dir }).docs[0]!.html;
      const tables = html.split('<table').slice(1);
      expect(tables).toHaveLength(3);
      const rowsOf = (t: string) => [...t.matchAll(/<tr><td>(LI-\d+)<\/td>/g)].map((m) => m[1]);
      expect(rowsOf(tables[0]!)).toEqual(['LI-001']); // present only where FY2003 exists
      expect(tables[0]).toContain('<td class="num">800</td>');
      expect(rowsOf(tables[1]!)).toEqual(['LI-002']); // "=undefined" selects the missing ones
      expect(rowsOf(tables[2]!)).toEqual(['LI-001', 'LI-002']);
      expect(tables[2]).toContain('<td class="num">1,200</td>');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('verify-dist finds withheld canon strings in all their escaped forms', () => {
    const needles = withheldNeedles([
      { path: 'roster.1-0001.name', key: 'T1', text: "Dana O'Brien", scrub: true },
      { path: 'facilities.DELTA-01.anchor.city', key: 'SEXTANT', text: 'Pueblo', scrub: false },
      { path: 'reserves.ARMS-SMALL.label', key: 'T2', text: 'Small arms', scrub: false },
      { path: 'facilities.DELTA-01.anchor.state', key: 'SEXTANT', text: 'CO', scrub: false },
    ]);
    expect(needles.map((n) => n.path)).toEqual(['roster.1-0001.name', 'facilities.DELTA-01.anchor.city']);
    expect(findWithheld('<td>Dana O&#x27;Brien</td>', needles).map((h) => h.key)).toEqual(['T1']);
    expect(findWithheld('{"t":"near Pueblo"}', needles).map((h) => h.key)).toEqual(['SEXTANT']);
    expect(findWithheld('Small arms issue; CO2 scrubbers', needles)).toEqual([]);
  });

  it('verify-dist ignores withheld strings that are public elsewhere, except tier 1', () => {
    const client = {
      facilities: [
        { id: 'DELTA-04', completed: '[[RX:SEXTANT:7]]', anchor: { city: '[[RX:SEXTANT:6]]' } },
        { id: 'BETA-03', completed: '2006-02', anchor: { city: 'Pueblo' } },
      ],
      cover: 'Operated by [[RX:SEXTANT:12]] under the Dry Creek Survey Office lease',
      roster: [{ name: '[[RX:T1:12]]' }],
    };
    expect(clearStrings(client)).toContain(' under the Dry Creek Survey Office lease');
    const needles = withheldNeedles(
      [
        { path: 'facilities.DELTA-04.completed', key: 'SEXTANT', text: '2006-02', scrub: false }, // clear in BETA-03
        { path: 'facilities.DELTA-04.anchor.city', key: 'SEXTANT', text: 'Pueblo', scrub: false }, // clear elsewhere
        { path: 'coverCatalogue.DELTA-04.office', key: 'SEXTANT', text: 'Dry Creek Survey Office', scrub: true }, // clear part of a string
        { path: 'contractors.PC-05.sites.2', key: 'T1', text: 'DELTA-04', scrub: false }, // designation
        { path: 'coverCatalogue.DELTA-04.agency', key: 'SEXTANT', text: 'Bureau of Mines Annex', scrub: true }, // genuinely withheld
        { path: 'roster.1-0001.name', key: 'T1', text: 'Pueblo', scrub: false }, // tier 1 stays strict
      ],
      client,
    );
    expect(needles.map((n) => n.path)).toEqual(['coverCatalogue.DELTA-04.agency', 'roster.1-0001.name']);
  });

  it('verify-dist exempts bare dates and canon funding agencies below tier 1', () => {
    const deps = ['DOD', 'DOE', 'DHS', 'FEMA'];
    expect(isAgencyName('Department of Energy', deps)).toBe(true);
    expect(isAgencyName('Federal Emergency Management Agency', deps)).toBe(true);
    expect(isAgencyName('Department of Homeland Security', deps)).toBe(true);
    expect(isAgencyName('Bureau of Mines Annex', deps)).toBe(false);
    expect(isAgencyName('Heavy weapon systems', deps)).toBe(false);
    const needles = withheldNeedles(
      [
        { path: 'coverCatalogue.BETA-02.coverAgency', key: 'SEXTANT', text: 'Department of Energy', scrub: true },
        { path: 'coverCatalogue.BETA-05.lastCoverReview', key: 'SEXTANT', text: '2008-04-29', scrub: true },
        { path: 'facilities.DELTA-08.completed', key: 'SEXTANT', text: '2006-06', scrub: true },
        { path: 'x.t1.date', key: 'T1', text: '2008-04-29', scrub: true },
        { path: 'x.t1.agency', key: 'T1', text: 'Department of Energy', scrub: true },
        { path: 'reserves.ARMS-HEAVY.label', key: 'T1', text: 'Heavy weapon systems', scrub: false },
      ],
      {},
      deps,
    );
    expect(needles.map((n) => n.path)).toEqual(['x.t1.date', 'x.t1.agency', 'reserves.ARMS-HEAVY.label']);
  });

  it('verify-dist lets tier-2 names stand in authored documents only', () => {
    const needles = withheldNeedles([
      { path: 'roster.2-0102.name', key: 'T2', text: 'Fixture Deputy Bravo', scrub: true },
      { path: 'roster.2-0102.email', key: 'T2', text: 'f.bravo@a03.rd.mer', scrub: true },
      { path: 'roster.1-0001.name', key: 'T1', text: 'Fixture Director Alpha', scrub: true },
    ]);
    expect(needles.filter(isAuthoredName).map((n) => n.path)).toEqual(['roster.2-0102.name', 'roster.2-0102.email']);
    const docFile = join('x', 'dist', 'data', 'docs', 'dir-0001.json');
    expect(isDocFile(docFile, join('x', 'dist'))).toBe(true);
    expect(isDocFile(join('x', 'dist', 'directives', 'dir-0001', 'index.html'), join('x', 'dist'))).toBe(true);
    expect(isDocFile(join('x', 'dist', 'data', 'search.json'), join('x', 'dist'))).toBe(true);
    expect(isDocFile(join('x', 'dist', 'assets', 'index-abc.js'), join('x', 'dist'))).toBe(false);
    const docNeedles = needles.filter((n) => !isAuthoredName(n));
    const text = 'Signed: Fixture Deputy Bravo; copy f.bravo@a03.rd.mer; for Fixture Director Alpha';
    expect(findWithheld(text, docNeedles).map((h) => h.path)).toEqual(['roster.1-0001.name']);
    // strict in bundles
    expect(findWithheld(text, needles).map((h) => h.path)).toEqual(['roster.2-0102.name', 'roster.2-0102.email', 'roster.1-0001.name']);
    // tier-1 emails are never exempt
    const t1mail = withheldNeedles([{ path: 'roster.1-0001.email', key: 'T1', text: 'f.alpha@a03.rd.mer', scrub: true }]);
    expect(t1mail.filter(isAuthoredName)).toEqual([]);
  });
});

describe('fixtures against the real canon', () => {
  const REAL = resolve(__dirname, '../../content/canon/canon.json');
  it.skipIf(!existsSync(REAL))('builds, keeps headline figures and never ships tier-1/2 roster names in baseline', () => {
    const canon = JSON.parse(readFileSync(REAL, 'utf8')) as {
      headline: Record<string, number>;
      roster: { name: string; tier: number }[];
    };
    const r = buildContent({ contentDir: FIXTURES, canonPath: REAL });
    const html = r.docs.find((d) => d.id === 'dir-0001')!.html;
    expect(html).toContain(`>${canon.headline.staffTotal!.toLocaleString('en-US')}<`);
    expect(html).toContain(`>${canon.headline.tunnelCertifiedMi!.toLocaleString('en-US')}<`);
    expect(r.figures.map((f) => f.id)).toEqual(
      expect.arrayContaining(['tunnelCertifiedMi', 'capacitySustained', 'capacitySurge', 'staffTotal']),
    );
    const blobs = JSON.stringify(r.docs) + r.searchJson;
    const t1 = canon.roster.filter((p) => p.tier === 1).map((p) => p.name);
    const t2 = canon.roster.filter((p) => p.tier === 2).map((p) => p.name);
    expect(t1.length + t2.length).toBeGreaterThan(0);
    for (const n of [...t1, ...t2]) expect(blobs).not.toContain(n);
    const released = JSON.stringify(r.releases);
    for (const n of t1) expect(released).not.toContain(n);
    for (const n of t2) expect(released).toContain(n);
    for (const d of r.docs) expect(checkDrift(d.html.replace(/<[^>]+>/g, ' '), r.figures)).toEqual([]);
  });
});

describe('frontmatter schema', () => {
  it('accepts a valid record and YAML Date objects', () => {
    expect(FrontmatterSchema.safeParse(FM).success).toBe(true);
    const r = FrontmatterSchema.safeParse({ ...FM, date: new Date('2008-04-22T00:00:00Z') });
    expect(r.success && r.data.date).toBe('2008-04-22');
  });
  it('rejects dates after 31 May 2008', () => {
    expect(FrontmatterSchema.safeParse({ ...FM, date: '2008-06-01' }).success).toBe(false);
  });
  it('rejects unknown markings, templates, apps and bad routes', () => {
    expect(FrontmatterSchema.safeParse({ ...FM, marking: 'SECRET' }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...FM, template: 'poster' }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...FM, app: 'browser' }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...FM, route: '/Directives/x/' }).success).toBe(false);
    expect(FrontmatterSchema.safeParse({ ...FM, route: '/assets/x' }).success).toBe(false);
  });
  it('reports bad frontmatter and duplicates through the build with file:line', () => {
    expectBuildError(tempContent({ 'directives/a.md': md({ ...FM, date: '2008-06-02' }, 'Body.') }), /a\.md:12\s+frontmatter date/);
    expectBuildError(
      tempContent({ 'directives/a.md': md(FM, 'A.'), 'directives/b.md': md({ ...FM, id: 'dir-0100', docNo: 'OSC-DIR-0100' }, 'B.') }),
      /duplicate route/,
    );
    expectBuildError(tempContent({ 'records/a.md': md(FM, 'A.') }), /must match its folder/);
  });
  it('requires auth and ref on redactions', () => {
    expectBuildError(tempContent({ 'directives/a.md': md(FM, 'x :r[y]{tier=2}') }), /auth=.*\n.*ref=/s);
  });
  it('handles an empty or missing content directory', () => {
    const empty = buildContent({ contentDir: join(tmpdir(), 'meridian-does-not-exist'), canonPath: join(tmpdir(), 'nope.json') });
    expect(empty.routes).toEqual([]);
    expect(empty.figures).toEqual([]);
  });
});

describe('docs service', () => {
  let r: BuildResult;
  let routes: RouteEntry[];
  beforeAll(() => {
    r = build();
    routes = r.routes;
  });
  const fetcher = (fetched: string[]) => async (url: string) => {
    fetched.push(url);
    const doc = /data\/docs\/(.+)\.json$/.exec(url);
    if (doc) return r.docs.find((d) => d.id === decodeURIComponent(doc[1]!));
    const rel = /data\/releases\/(.+)\.json$/.exec(url);
    const files = releaseFiles(r.releases);
    if (rel && files[rel[1]!]) return files[rel[1]!];
    throw new Error(`404 ${url}`);
  };

  it('applies only satisfied releases and fetches each release file once', async () => {
    const fetched: string[] = [];
    const docs = createDocs({ satisfies: (k) => k === 'T2' || k === 'T3', routes, fetchJson: fetcher(fetched) });
    const d = await docs.load('dir-0001');
    expect(d.html).toContain('<span class="rx-released" data-rx="dir-0001-1" data-auth="OIA" data-ref="OIA-08-114" data-key="T2">Lanyard Protocol</span>');
    expect(d.html).toContain('<div class="rx-released rx-block" data-rx="dir-0001-5"');
    expect(d.html).not.toContain('Heron Gate');
    expect(d.html).toContain('data-rx="dir-0001-6"'); // inner compartment bar still in place
    await docs.load('dir-0001');
    expect(fetched.filter((u) => u.includes(`releases/${releaseFileName('T2')}.json`))).toHaveLength(1);
    expect(fetched.some((u) => [releaseFileName('KESTREL'), releaseFileName('T1')].some((n) => u.includes(n)))).toBe(false);
    expect(docs.byDocNo('OSC-MEM-08-0002')?.route).toBe('/records/mem-08-0002');
    expect(docs.byRoute('/directives/dir-0001')?.docNo).toBe('OSC-DIR-0001');
    expect(docs.all()).toHaveLength(2);
  });

  it('opens nested releases when both keys are held', async () => {
    const docs = createDocs({ satisfies: (k) => ['T2', 'KESTREL', 'KESTREL+T2'].includes(k), routes, fetchJson: fetcher([]) });
    const d = await docs.load('dir-0001');
    expect(d.html).toContain('Heron Gate');
    expect(d.html).toContain('<span class="rx-released" data-rx="dir-0001-6"');
    expect(d.html).toContain('Inner Kestrel Note');
    expect(d.html).not.toContain('Quarry Annex Seven');
  });

  it('applyReleases leaves unknown bars alone', () => {
    const html = '<p>a <span class="rx" data-rx="x-1" data-len="3" data-key="T2"></span> b</p>';
    expect(applyReleases(html, {})).toBe(html);
    expect(applyReleases(html, { 'x-1': 'abc' })).toBe('<p>a <span class="rx-released" data-rx="x-1" data-key="T2">abc</span> b</p>');
  });
});

describe('search', () => {
  it('searches baseline text and filters by access', async () => {
    const r = build();
    const byRoute = (route: string) => r.routes.find((x) => x.route === route);
    const open = createSearch({ satisfies: () => true, byRoute, loadIndex: async () => r.searchJson });
    const closed = createSearch({ satisfies: (k) => k === 'T3', byRoute, loadIndex: async () => r.searchJson });
    const hits = await open('reconciliation');
    expect(hits.map((h) => h.route.route)).toContain('/records/mem-08-0002');
    expect(hits[0]!.snippet.length).toBeGreaterThan(0);
    expect((await closed('reconciliation')).map((h) => h.route.route)).not.toContain('/records/mem-08-0002');
    expect(await open('Lanyard')).toEqual([]);
    expect((await open('OSC-DIR-0001'))[0]!.route.route).toBe('/directives/dir-0001');
  });
});

describe('verify-dist rules', () => {
  it('detects headline drift and missing figures', () => {
    const rules = figureRules(JSON.parse(readFileSync(CANON, 'utf8')));
    expect(checkDrift('The certified mileage is 847 miles.', rules)).toEqual([]);
    expect(checkDrift('The certified mileage is 850 miles.', rules).map((p) => p.rule)).toContain('tunnelCertifiedMi');
    expect(checkDrift('Sustained capacity at ALPHA-03 is set out in Annex B; programme figure 23,400.', rules)).toEqual([]);
    expect(checkDrift('Total personnel are listed in the annex.', rules).map((p) => p.rule)).toEqual(['staffTotal']);
    expect(checkDrift('DETACHED / UNPOSTED: 791', rules).map((p) => p.rule)).toEqual(['staffUnposted']);
  });

  it('finds external URLs except namespaces and license comments', () => {
    const js = '/*! lib v1 | https://example.com/license */\nconst a="http://www.w3.org/2000/svg";\nfetch("https://cdn.example.net/x.js")';
    expect(findExternalUrls(js, '.js').map((h) => h.url)).toEqual(['https://cdn.example.net/x.js']);
  });

  it('flags filler words but not the placeholder attribute', () => {
    expect(findBannedWords('<input placeholder="Operator ID">').length).toBe(0);
    expect(findBannedWords('input::placeholder{color:var(--t)} el.placeholder=1').length).toBe(0);
    expect(findBannedWords('Section 4: TBD').map((h) => h.word)).toEqual(['TBD']);
    expect(findBannedWords('Lorem ipsum. Coming soon.').length).toBe(2);
    expect(findBannedWords('TODOS and todolist').length).toBe(0);
  });

  it('prerenders a static document at the marker', () => {
    const r = build();
    const tpl = `<html><head><title>MERIDIAN</title></head><body><div id="static-doc">${STATIC_MARKER}</div></body></html>`;
    const html = renderPage(tpl, r.docs[0]!, 'UMBRA//OSC COMPARTMENTED');
    expect(html).toContain('<title>OSC-DIR-0001 · Handling of Compartmented Records in Shared Workspaces · MERIDIAN</title>');
    expect(html).toContain('<meta name="description" content="Rules for keeping compartmented records out of shared workstation folders.">');
    expect(html).toContain('22 APR 2008');
    expect(html).not.toContain(STATIC_MARKER);
  });
});

describe('static message slots and app homes', () => {
  it('blanks declared slot tokens only, and verify-dist flags any left over', () => {
    const body = '<p>Audit reference {auditRef}; keep {other} as authored.</p>';
    const out = blankSlots(body, ['auditRef'], SLOT_BLANK);
    expect(out).toContain(`Audit reference ${SLOT_BLANK};`);
    expect(out).toContain('{other}');
    const page = `<title>MSG · {auditRef}</title><article class="static-doc">${out}</article>`;
    expect(findSlotTokens(page)).toEqual(['{other}', '{auditRef}']);
    expect(findSlotTokens(`<title>ok</title><article class="static-doc">${blankSlots(body, ['auditRef', 'other'], SLOT_BLANK)}</article>`)).toEqual([]);
  });

  it('reads the app registry and renders a linked register for an app home', () => {
    const apps = readAppHomes();
    expect(apps.map((a) => a.id)).toEqual(expect.arrayContaining(['records', 'mail', 'terminal', 'system']));
    const routes = [
      { id: 'b', route: '/mail/msg-2', app: 'mail', docNo: 'MSG-2', title: 'Second', date: '2008-04-22' },
      { id: 'a', route: '/mail/msg-1', app: 'mail', docNo: 'MSG-1', title: 'First', date: '2003-11' },
    ] as unknown as RouteEntry[];
    const html = appHomeHtml({ id: 'mail', title: 'Message Traffic', homeRoute: '/mail' }, routes, '/osc-meridian/');
    expect(html).toContain('<h1 class="static-doc-title">Message Traffic</h1>');
    expect(html.indexOf('MSG-1')).toBeLessThan(html.indexOf('MSG-2'));
    expect(html).toContain('href="/osc-meridian/mail/msg-1"');
    const empty = appHomeHtml({ id: 'terminal', title: 'Terminal', homeRoute: '/terminal' }, routes, '/');
    expect(empty).toContain('holds no filed documents');
  });
});

describe('release file obfuscation', () => {
  const body = { 'dir-0001-2': 'Heron Gate', 'dir-0001-3': '<p>Käse — “quoted” Marbleford</p>' };

  it('round-trips with the right key, hides names and text, and rejects the wrong key', () => {
    const enc = encodeRelease('KESTREL', body);
    const raw = JSON.stringify(enc);
    expect(raw).not.toMatch(/Heron|Marbleford|dir-0001/);
    expect(decodeRelease('KESTREL', enc)).toEqual(body);
    expect(() => decodeRelease('HOLLOW', enc)).toThrow();
    expect(() => decodeRelease('KESTREL', body)).toThrow(/not encoded/);
    expect(releaseFileName('KESTREL')).toMatch(/^[0-9a-f]{16}$/);
    expect(releaseFileName('KESTREL')).not.toBe(releaseFileName('KESTREL+T2'));
  });

  it('verify-dist accepts only hashed, encoded, non-tier-1 release files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'meridian-rel-'));
    try {
      const put = (name: string, v: unknown) => {
        const f = join(dir, name);
        writeFileSync(f, JSON.stringify(v));
        return f;
      };
      const good = put(`${releaseFileName('KESTREL')}.json`, encodeRelease('KESTREL', body));
      const clear = put(`${releaseFileName('T2')}.json`, body);
      const named = put('KESTREL.json', encodeRelease('KESTREL', body));
      const t1 = put(`${releaseFileName('T1')}.json`, encodeRelease('T1', body));
      const swapped = put(`${releaseFileName('HOLLOW')}.json`, encodeRelease('KESTREL', body));
      const res = new Map(checkReleaseFiles([good, clear, named, t1, swapped], ['KESTREL', 'T2', 'T1', 'HOLLOW']));
      expect(res.get(good)).toEqual({ key: 'KESTREL', body });
      expect(res.get(clear)).toMatch(/not encoded/);
      expect(res.get(named)).toMatch(/key hash/);
      expect(res.get(t1)).toMatch(/^tier-1/);
      expect(res.get(swapped)).toMatch(/does not decode/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
