// @vitest-environment node
/** Pass two pipeline: account variants, `t4`, per-account search indexes, new app homes. */
import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildContent, type BuildResult } from '../../scripts/content/build.ts';
import { ContentBuildError } from '../../scripts/content/util.ts';
import { APP_HOME_TEXT } from '../../scripts/content/app-homes.ts';
import { checkVariantDoc, findBannedWords, isDocFile, undeclaredSlotTokens } from '../../scripts/verify-dist.ts';
import { appHomeHtml, homeDocs, readAppHomes } from '../../scripts/prerender.ts';
import { createDocs, docDataPath, readableByTier4 } from '../../src/core/docs';
import { createSearch, searchIndexPath } from '../../src/core/search';
import type { AccountId, DocJson, RouteEntry } from '../../src/core/contracts';
import { encodeRelease, releaseFileName } from '../../src/core/release-codec';

const FIXTURES = resolve(__dirname, '../fixtures/content');
const VARIANTS = resolve(__dirname, '../fixtures/variants');
const CANON = resolve(__dirname, '../fixtures/canon.json');

const build = (extra: Partial<Parameters<typeof buildContent>[0]> = {}): BuildResult =>
  buildContent({ contentDir: FIXTURES, canonPath: CANON, variantsDir: VARIANTS, ...extra });

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

function md(fm: Record<string, unknown>, body: string): string {
  const yaml = Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  return `---\n${yaml}\n---\n\n${body}\n`;
}

function tempContent(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'meridian-v-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(join(dir, p, '..'), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  return dir;
}

function buildError(files: Record<string, string>): ContentBuildError {
  const dir = tempContent(files);
  try {
    buildContent({ contentDir: dir, canonPath: CANON });
  } catch (e) {
    expect(e).toBeInstanceOf(ContentBuildError);
    return e as ContentBuildError;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  throw new Error('expected a build error');
}

describe('account variants', () => {
  let r: BuildResult;
  beforeAll(() => {
    r = build();
  });

  it('builds both fixture variants and lists them on the base route and doc', () => {
    expect(r.variants.map((v) => `${v.account}/${v.doc.id}`)).toEqual(['lifesupport/mem-08-0002', 'deputy/dir-0001']);
    expect(r.routes.find((x) => x.id === 'dir-0001')!.variants).toEqual(['deputy']);
    expect(r.routes.find((x) => x.id === 'mem-08-0002')!.variants).toEqual(['lifesupport']);
    expect(r.docs.find((x) => x.id === 'dir-0001')!.variants).toEqual(['deputy']);
    expect(r.routes).toHaveLength(2); // variants never add routes
  });

  it('keeps id/route/docNo, takes its own revision, body and redactions', () => {
    const v = r.variants.find((x) => x.account === 'deputy')!.doc;
    expect([v.id, v.route, v.docNo, v.app, v.family]).toEqual(['dir-0001', '/directives/dir-0001', 'OSC-DIR-0001', 'directives', 'directives']);
    expect(v.revision).toBe(4);
    expect(v.date).toBe('2008-05-14');
    expect(v.distribution).toContain('DCO/ALPHA-02');
    expect(v.frontmatter.variant).toBe('deputy');
    expect(v.html).toContain('Wrenfield annex');
    expect(v.html).toContain('data-rx="deputy-dir-0001-1"');
    expect(v.html).not.toContain('Saltmarsh Ledger');
    expect(v.redactions.map((x) => [x.id, x.key])).toEqual([['deputy-dir-0001-1', 'T2']]);
    expect(v.xrefs.map((x) => x.docNo)).toEqual(['OSC-MEM-08-0002']);
    const lv = r.variants.find((x) => x.account === 'lifesupport')!.doc;
    expect(lv.access).toBeUndefined(); // a Tier 4 extract may drop the base access block
  });

  it('puts variant releases in the shared per-key files without colliding with base ids', () => {
    expect(r.releases.T2!['deputy-dir-0001-1']).toBe('Saltmarsh Ledger');
    expect(r.releases.T2!['dir-0001-1']).toBe('Lanyard Protocol');
    expect(Object.keys(r.releases).sort()).toEqual(['KESTREL', 'KESTREL+T2', 'T2']);
  });

  it('keeps base outputs base-only and builds an index per account with variants', () => {
    const baseBlob = JSON.stringify(r.docs) + JSON.stringify(r.routes) + r.searchJson;
    expect(baseBlob).not.toContain('Wrenfield');
    expect(baseBlob).not.toMatch(/scrubber/i);
    expect(Object.keys(r.accountSearch)).toEqual(['lifesupport', 'deputy']);
    expect(r.accountSearch.deputy).toContain('Wrenfield');
    expect(r.accountSearch.deputy).not.toMatch(/scrubber/i);
    expect(r.accountSearch.lifesupport).toContain('scrubber');
    for (const s of Object.values(r.accountSearch)) expect(s).not.toContain('Saltmarsh');
  });

  it('writes @account doc files and search@account indexes, and clears stale ones', () => {
    const out = mkdtempSync(join(tmpdir(), 'meridian-vout-'));
    try {
      mkdirSync(join(out, 'public', 'data'), { recursive: true });
      writeFileSync(join(out, 'public', 'data', 'search@auditor.json'), '{}');
      build({ outDir: out });
      const data = join(out, 'public', 'data');
      expect(JSON.parse(readFileSync(join(data, 'docs', '@deputy', 'dir-0001.json'), 'utf8')).revision).toBe(4);
      expect(existsSync(join(data, 'docs', '@lifesupport', 'mem-08-0002.json'))).toBe(true);
      expect(existsSync(join(data, 'search@deputy.json'))).toBe(true);
      expect(existsSync(join(data, 'search@lifesupport.json'))).toBe(true);
      expect(existsSync(join(data, 'search@auditor.json'))).toBe(false);
      const routes = JSON.parse(readFileSync(join(out, '.generated', 'routes.json'), 'utf8')) as RouteEntry[];
      expect(routes.find((x) => x.id === 'dir-0001')!.variants).toEqual(['deputy']);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('fails when a locked field differs, the base is missing, or the file is misplaced', () => {
    const base = { 'directives/dir-0099.md': md(FM, 'Body.') };
    expect(buildError({ ...base, 'variants/deputy/dir-0099.md': md({ ...FM, route: '/directives/dir-0100' }, 'B.') }).message).toMatch(
      /variants\/deputy\/dir-0099\.md:\d+\s+variant route "\/directives\/dir-0100" must equal the base/,
    );
    expect(buildError({ ...base, 'variants/deputy/dir-0099.md': md({ ...FM, docNo: 'OSC-DIR-0100' }, 'B.') }).message).toMatch(/variant docNo/);
    expect(buildError({ ...base, 'variants/deputy/dir-0099.md': md({ ...FM, app: 'records' }, 'B.') }).message).toMatch(/variant app/);
    expect(buildError({ ...base, 'variants/deputy/dir-0099.md': md({ ...FM, family: 'records' }, 'B.') }).message).toMatch(/variant family/);
    expect(buildError({ ...base, 'variants/deputy/dir-0098.md': md({ ...FM, id: 'dir-0098' }, 'B.') }).message).toMatch(/no base document/);
    expect(buildError({ ...base, 'variants/visitor/dir-0099.md': md(FM, 'B.') }).message).toMatch(/account: analyst, lifesupport, deputy, auditor/);
    expect(buildError({ ...base, 'variants/deputy/other.md': md(FM, 'B.') }).message).toMatch(/file name must be its id/);
    expect(buildError({ ...base, 'variants/deputy/dir-0099.md': md({ ...FM, aliases: ['OSC-CB-099'] }, 'B.') }).message).toMatch(/aliases/);
    expect(buildError({ ...base, 'variants/deputy/dir-0099.md': md({ ...FM, date: '2008-06-02' }, 'B.') }).message).toMatch(/2008-05-31/);
  });

  it('allows title, marking, revision, date, access and body to differ', () => {
    const dir = tempContent({
      'directives/dir-0099.md': md(FM, 'Base body.'),
      'variants/auditor/dir-0099.md': md(
        { ...FM, title: 'Parking Allocation (REVIEWED-OIA)', marking: 'UMBRA-C', revision: 2, date: '2008-05-18', access: { tier: 3 } },
        'Reviewed :r[finding text]{tier=2 auth="OIA" ref="OIA-08-200"}.',
      ),
    });
    try {
      const res = buildContent({ contentDir: dir, canonPath: CANON });
      const v = res.variants[0]!;
      expect(v.account).toBe('auditor');
      expect([v.doc.title, v.doc.marking, v.doc.revision, v.doc.access]).toEqual(['Parking Allocation (REVIEWED-OIA)', 'UMBRA-C', 2, { tier: 3 }]);
      expect(res.routes[0]!.title).toBe('Parking Allocation, Level 2');
      expect(res.releases.T2).toEqual({ 'auditor-dir-0099-1': 'finding text' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('t4 flag and new app families', () => {
  it('maps t4: true to RouteEntry.t4 and keeps it out of frontmatter extras', () => {
    const dir = tempContent({
      'directives/dir-0099.md': md({ ...FM, t4: true }, 'Body.'),
      'directives/dir-0098.md': md({ ...FM, id: 'dir-0098', route: '/directives/dir-0098', docNo: 'OSC-DIR-0098', t4: false }, 'Body.'),
      'environ/env-sop-01.md': md(
        { ...FM, id: 'env-sop-01', route: '/environ/env-sop-01', app: 'environ', family: 'environ', docNo: 'OSC-ENV-SOP-01', t4: true },
        'Scrubber changeover procedure.',
      ),
      'mail/environ/msg-08-09001.md': md(
        { ...FM, id: 'msg-08-09001', route: '/mail/msg-08-09001', app: 'mail', family: 'mail', template: 'message', docNo: 'OSC-MSG-08-09001', message: { from: 'a@b.mer', to: ['c@d.mer'] } },
        'Changeover complete.',
      ),
    });
    try {
      const res = buildContent({ contentDir: dir, canonPath: CANON });
      const by = (id: string) => res.routes.find((x) => x.id === id)!;
      expect(by('dir-0099').t4).toBe(true);
      expect('t4' in by('dir-0098')).toBe(false);
      expect(by('env-sop-01')).toMatchObject({ app: 'environ', family: 'environ', t4: true });
      expect(by('msg-08-09001').family).toBe('mail');
      expect(res.docs.find((d) => d.id === 'dir-0099')!.frontmatter).not.toHaveProperty('t4');
      expect(res.variants).toEqual([]);
      expect(res.accountSearch).toEqual({});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a non-boolean t4', () => {
    expect(buildError({ 'directives/dir-0099.md': md({ ...FM, t4: 'yes' }, 'B.') }).message).toMatch(/frontmatter t4/);
  });

  it('the Tier 4 rule reads t4 or a lifesupport variant', () => {
    expect(readableByTier4({ t4: true })).toBe(true);
    expect(readableByTier4({ variants: ['lifesupport'] })).toBe(true);
    expect(readableByTier4({ variants: ['deputy'] })).toBe(false);
    expect(readableByTier4({})).toBe(false);
  });
});

describe('docs service with an active account', () => {
  let r: BuildResult;
  beforeAll(() => {
    r = build();
  });
  const fetcher = (fetched: string[], failVariants = false) => async (url: string) => {
    fetched.push(url);
    const v = /data\/docs\/@([a-z]+)\/(.+)\.json$/.exec(url);
    if (v) {
      if (failVariants) throw new Error(`404 ${url}`);
      return r.variants.find((x) => x.account === v[1] && x.doc.id === decodeURIComponent(v[2]!))?.doc;
    }
    const d = /data\/docs\/([^/@]+)\.json$/.exec(url);
    if (d) return r.docs.find((x) => x.id === decodeURIComponent(d[1]!));
    const rel = /data\/releases\/(.+)\.json$/.exec(url);
    for (const [k, m] of Object.entries(r.releases)) if (rel && releaseFileName(k) === rel[1]) return encodeRelease(k, m);
    throw new Error(`404 ${url}`);
  };
  const docsFor = (account: AccountId | null, fetched: string[], failVariants = false) =>
    createDocs({ satisfies: (k) => k === 'T2', routes: r.routes, fetchJson: fetcher(fetched, failVariants), account: () => account });

  it("loads the account's variant with its releases applied", async () => {
    const fetched: string[] = [];
    const d = await docsFor('deputy', fetched).load('dir-0001');
    expect(fetched[0]).toContain(docDataPath('dir-0001', 'deputy'));
    expect(d.revision).toBe(4);
    expect(d.html).toContain('<span class="rx-released" data-rx="deputy-dir-0001-1"');
    expect(d.html).toContain('Saltmarsh Ledger');
    // documents without a variant for this account load the base
    const m = await docsFor('deputy', fetched).load('mem-08-0002');
    expect(m.title).toBe('Staffing Reconciliation, Second Quarter');
  });

  it('loads the base for other accounts, and falls back to the base if the variant fails', async () => {
    const a: string[] = [];
    expect((await docsFor('analyst', a).load('dir-0001')).revision).toBe(3);
    expect(a.some((u) => u.includes('@'))).toBe(false);
    expect((await docsFor(null, []).load('dir-0001')).revision).toBe(3);
    const f: string[] = [];
    expect((await docsFor('deputy', f, true).load('dir-0001')).revision).toBe(3);
    expect(f.some((u) => u.includes('@deputy'))).toBe(true);
  });
});

describe('per-account search', () => {
  let r: BuildResult;
  beforeAll(() => {
    r = build();
  });
  const byRoute = (route: string) => r.routes.find((x) => x.route === route);
  const searchFor = (account: AccountId | null, asked: (AccountId | null)[], opts: { all?: boolean; fail?: boolean } = {}) =>
    createSearch({
      satisfies: () => true,
      byRoute,
      account: () => account,
      all: opts.all === false ? undefined : () => r.routes,
      loadIndex: async (a) => {
        asked.push(a);
        if (a && opts.fail) throw new Error('404');
        return a ? r.accountSearch[a]! : r.searchJson;
      },
    });

  it("searches the account's index, returning base route entries", async () => {
    const asked: (AccountId | null)[] = [];
    const s = searchFor('deputy', asked);
    const hits = await s('Wrenfield');
    expect(hits.map((h) => h.route.route)).toEqual(['/directives/dir-0001']);
    expect(hits[0]!.route.revision).toBe(3); // base RouteEntry
    expect(hits[0]!.snippet).toContain('annotated copy');
    expect(asked).toEqual(['deputy']);
    expect(await searchFor(null, [])('Wrenfield')).toEqual([]);
  });

  it('uses the base index for accounts without variants and on a failed fetch', async () => {
    const asked: (AccountId | null)[] = [];
    await searchFor('auditor', asked)('reconciliation');
    expect(asked).toEqual([null]);
    const asked2: (AccountId | null)[] = [];
    const hits = await searchFor('deputy', asked2, { fail: true })('Lanyard Protocol Wrenfield');
    expect(hits).toEqual([]);
    expect(asked2).toEqual(['deputy', null]);
    expect(searchIndexPath('deputy')).toBe('data/search@deputy.json');
    expect(searchIndexPath(null)).toBe('data/search.json');
  });

  it('applies the visible() rule (Tier 4)', async () => {
    const s = createSearch({ satisfies: () => true, byRoute, account: () => 'lifesupport', all: () => r.routes, loadIndex: async (a) => (a ? r.accountSearch[a]! : r.searchJson), visible: readableByTier4 });
    expect((await s('Scrubber')).map((h) => h.route.id)).toEqual(['mem-08-0002']);
    expect(await s('OSC-DIR-0001')).toEqual([]);
  });
});

describe('verify-dist variant rules', () => {
  const base = { id: 'dir-0001', route: '/directives/dir-0001', docNo: 'OSC-DIR-0001', app: 'directives', family: 'directives', variants: ['deputy'] } as RouteEntry;
  const doc = (over: Partial<DocJson> = {}) =>
    ({ ...base, title: 'T', summary: 'S', html: '<p>x</p>', frontmatter: {}, redactions: [], xrefs: [], headings: [], ...over }) as DocJson;

  it('checks account, base agreement and the variants list', () => {
    expect(checkVariantDoc('deputy', doc(), base)).toEqual([]);
    expect(checkVariantDoc('visitor', doc(), base).join()).toMatch(/unknown account/);
    expect(checkVariantDoc('deputy', doc({ route: '/directives/x' }), base).join()).toMatch(/route/);
    expect(checkVariantDoc('deputy', doc({ docNo: 'OSC-DIR-9' }), base).join()).toMatch(/docNo/);
    expect(checkVariantDoc('auditor', doc(), base).join()).toMatch(/does not list "auditor"/);
    expect(checkVariantDoc('deputy', doc(), undefined).join()).toMatch(/no base route/);
  });

  it('allows declared message slots only', () => {
    expect(undeclaredSlotTokens(doc({ html: '<p>Ref {auditRef}</p>', frontmatter: { message: { slots: ['auditRef'] } } }))).toEqual([]);
    expect(undeclaredSlotTokens(doc({ html: '<p>Ref {auditRef} {date}</p>' }))).toEqual(['{auditRef}', '{date}']);
  });

  it('treats variant JSON and account indexes as baseline document files', () => {
    expect(isDocFile(join('x', 'dist', 'data', 'docs', '@deputy', 'dir-0001.json'), join('x', 'dist'))).toBe(true);
    expect(isDocFile(join('x', 'dist', 'data', 'search@deputy.json'), join('x', 'dist'))).toBe(true);
    expect(isDocFile(join('x', 'dist', 'data', 'releases', 'abc.json'), join('x', 'dist'))).toBe(false);
  });
});

describe('pass-two app homes', () => {
  it('has in-world text for the twelve set pieces, with no filler words', () => {
    expect(Object.keys(APP_HOME_TEXT).sort()).toEqual(
      ['cctv', 'dispatch', 'doors', 'drill', 'environ', 'hoist', 'isolate', 'muster', 'pa', 'patch', 'plant', 'strike'],
    );
    for (const t of Object.values(APP_HOME_TEXT)) {
      expect(t!.description.join(' ').length).toBeGreaterThan(200);
      expect(findBannedWords(t!.description.join(' '))).toEqual([]);
      expect(t!.description.join(' ').replace(/PM-3/g, '')).not.toMatch(/\d/); // figures belong in canon
    }
  });

  it('reads registry entries regardless of key order and quoting', () => {
    const dir = mkdtempSync(join(tmpdir(), 'meridian-apps-'));
    try {
      const f = join(dir, 'index.ts');
      writeFileSync(
        f,
        `export const APPS = [\n  { id: 'registry', title: 'Facility Registry', icon: 'registry', homeRoute: '/registry', load: () => import('./registry/App') },\n` +
          `  {\n    id: 'environ',\n    icon: 'environ',\n    homeRoute: "/environ",\n    title: "Environmental Control (air revitalization)",\n    minSize: { w: 1, h: 1 },\n    load: () => import('./environ/App'),\n  },\n];\n`,
      );
      expect(readAppHomes(f)).toEqual([
        { id: 'registry', title: 'Facility Registry', homeRoute: '/registry' },
        { id: 'environ', title: 'Environmental Control (air revitalization)', homeRoute: '/environ' },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('renders the description, the register and the full static text of the app documents', () => {
    const r = build();
    const doc = r.docs.find((d) => d.id === 'dir-0001')!;
    const routes = [{ ...r.routes[0]!, app: 'environ' }] as RouteEntry[];
    expect(homeDocs('environ', routes).map((x) => x.id)).toEqual(['dir-0001']);
    const app = { id: 'environ', title: 'Environmental Control (air revitalization)', homeRoute: '/environ' };
    const html = appHomeHtml(app, routes, '/', undefined, { description: APP_HOME_TEXT.environ!.description, fullDocs: [{ doc, label: 'UMBRA' }] });
    expect(html).toContain('class="static-app-description"');
    expect(html).toContain('air handling trains');
    expect(html).toContain('href="/directives/dir-0001"');
    expect(html).toContain(`data-doc-id="dir-0001"`);
    expect(html.indexOf('static-app-register')).toBeLessThan(html.indexOf('data-doc-id="dir-0001"'));
    const empty = appHomeHtml({ ...app, id: 'pa' }, [], '/', undefined, { description: APP_HOME_TEXT.pa!.description, fullDocs: [] });
    expect(empty).toContain('pre-recorded messages');
    expect(empty).toContain('holds no filed documents');
  });
});
