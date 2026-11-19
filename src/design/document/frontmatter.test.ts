import { describe, expect, it } from 'vitest';
import { normaliseFrontmatter, routingRecs, strs } from './frontmatter';

describe('normaliseFrontmatter', () => {
  it('lifts the template block onto the top level', () => {
    const fm = normaliseFrontmatter({ message: { from: 'a@x', to: ['b@x'], subject: 'Hi' } }, 'message');
    expect(fm.from).toBe('a@x');
    expect(strs(fm, 'to')).toEqual(['b@x']);
    expect(fm.subject).toBe('Hi');
    // the nested object stays for apps that read it there
    expect(fm.message).toEqual({ from: 'a@x', to: ['b@x'], subject: 'Hi' });
  });

  it('keeps top-level values when the nested value is undefined or absent', () => {
    const fm = normaliseFrontmatter({ formNo: '126', authority: 'Top', form: { formNo: 'OSC-F-126', edition: undefined } }, 'form');
    expect(fm.formNo).toBe('OSC-F-126');
    expect(fm.authority).toBe('Top');
    expect(fm).not.toHaveProperty('edition', undefined);
  });

  it('leaves flat frontmatter unchanged', () => {
    const raw = { kbNo: 'KB-1', audience: 'All' };
    expect(normaliseFrontmatter(raw, 'help')).toEqual(raw);
    expect(normaliseFrontmatter(undefined, 'help')).toEqual({});
  });

  it('lifts other template blocks, with the doc template winning', () => {
    const fm = normaliseFrontmatter({ message: { to: ['mail@x'], sent: '1200Z' }, cable: { to: ['ALPHA-03'], dtg: '121430Z MAY 08' } }, 'cable');
    expect(strs(fm, 'to')).toEqual(['ALPHA-03']);
    expect(fm.dtg).toBe('121430Z MAY 08');
    expect(fm.sent).toBe('1200Z');
  });

  it('ignores template keys that are not objects', () => {
    const fm = normaliseFrontmatter({ index: ['a'], memo: 'text', dossier: { identity: [] } }, 'dossier');
    expect(fm.index).toEqual(['a']);
    expect(fm.memo).toBe('text');
    expect(fm.identity).toEqual([]);
  });

  it('does not mutate the input', () => {
    const raw = { form: { formNo: 'X' } };
    normaliseFrontmatter(raw, 'form');
    expect(raw).toEqual({ form: { formNo: 'X' } });
  });
});

describe('routingRecs', () => {
  it('accepts objects and plain office names', () => {
    expect(routingRecs({ routing: ['Supervisor', { office: 'OIA', action: 'Decide' }, '', 3] }, 'routing')).toEqual([
      { office: 'Supervisor' },
      { office: 'OIA', action: 'Decide' },
    ]);
  });
});
