/**
 * F2 regression gates (docs/playtest-2/audit.md, defects 1-3): tier-1 and compartment text never in
 * the client canon, the shell slice stays small, and SVG focus uses the lowercase attribute.
 * verify-dist rules 11 and 12 check the built bundle; these check the sources.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readRedactionCorpus } from '../../scripts/content/redaction-corpus';
import { bundleForms, bundleNeedles, findWithheld, shellFiles } from '../../scripts/verify-dist';

const root = resolve(__dirname, '../..');
const corpus = readRedactionCorpus(join(root, 'content'));
const clientText = readFileSync(join(root, 'content/canon/canon.client.json'), 'utf8');

describe('restricted-text corpus', () => {
  it('finds the tier-1 literals the playtest-2 audit reported', () => {
    const t1 = new Set(corpus.restricted.filter((r) => r.key === 'T1').map((r) => r.text));
    expect(t1.has('Congressional oversight committees possess no awareness of program existence.')).toBe(true);
    expect(t1.has('Weapons research oversight.')).toBe(true);
    expect(t1.has('Member, Core Council (Seat 10)')).toBe(true);
    expect(t1.has('P-1-01-0004')).toBe(true);
    expect(corpus.paths.some((p) => p.path === 'facilities.ALPHA-02.function' && p.key === 'SEXTANT')).toBe(true);
  });

  it('none of it is in content/canon/canon.client.json', () => {
    const hits = findWithheld(clientText, bundleNeedles([], corpus.restricted));
    expect(hits.map((h) => `${h.key} ${h.path}`)).toEqual([]);
  });
});

describe('bundle gate helpers', () => {
  it('matches JSON-, quote- and unicode-escaped forms', () => {
    const forms = bundleForms('It\'s "sealed" — yes');
    expect(forms).toContain('It\'s \\"sealed\\" — yes');
    expect(forms).toContain("It\\'s \\\"sealed\\\" \\u2014 yes");
  });

  it('reads the entry script and modulepreloads from index.html', () => {
    const html = '<script type="module" crossorigin src="/b/assets/index-x.js"></script><link rel="modulepreload" crossorigin href="/b/assets/preact-y.js"><link rel="stylesheet" href="/b/assets/a.css">';
    expect(shellFiles(html)).toEqual(['/b/assets/index-x.js', '/b/assets/preact-y.js']);
  });
});

describe('shell canon slice', () => {
  it('carries only meta and accounts', () => {
    const shell = JSON.parse(readFileSync(join(root, 'content/canon/canon.shell.json'), 'utf8')) as Record<string, unknown>;
    expect(Object.keys(shell).sort()).toEqual(['accounts', 'meta']);
  });

  it('shell and core modules never import the whole client canon', () => {
    for (const f of ['src/main.tsx', 'src/core/session.ts', 'src/core/accounts.ts', 'src/sim/time.ts']) {
      const src = readFileSync(join(root, f), 'utf8');
      expect(/^import .* from '@canon';?$/m.test(src), f).toBe(false);
    }
  });
});

describe('SVG focus attribute', () => {
  const SVG_TAGS = /^(g|svg|rect|circle|path|text|line|polygon|polyline|ellipse|use)$/;
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(n) ? [p] : [];
    });

  it('uses lowercase tabindex on SVG elements (Preact writes camelCase tabIndex as a dead attribute)', () => {
    const bad: string[] = [];
    for (const f of walk(join(root, 'src'))) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/tabIndex[=:]/g)) {
        const before = s.slice(0, m.index);
        const tag = /^<([A-Za-z]+)/.exec(before.slice(before.lastIndexOf('<')))?.[1] ?? '';
        const svgProps = /SVGAttributes<|SVG[A-Z][A-Za-z]*Element>/.test(before.slice(Math.max(0, before.length - 300)));
        if (SVG_TAGS.test(tag) || svgProps) bad.push(`${f.slice(root.length + 1)}:${before.split('\n').length}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
