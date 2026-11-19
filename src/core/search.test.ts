import { describe, expect, it } from 'vitest';
import MiniSearch from 'minisearch';
import { createSearch, heldHits, isHeldEntry, isMessageEntry, SEARCH_OPTIONS, type SearchDoc } from './search';
import type { RouteEntry } from './contracts';

const entry = (id: string, family: string, docNo: string): RouteEntry =>
  ({
    id,
    route: `/${family}/${id}`,
    app: family === 'mail' ? 'mail' : 'directives',
    family,
    template: family === 'mail' ? 'message' : 'directive',
    docNo,
    title: `Title of ${docNo}`,
    marking: 'U',
    originator: 'OIA/ALPHA-01',
    revision: 1,
    date: '2008-05-19',
    summary: `Summary of ${docNo}`,
  }) as unknown as RouteEntry;

const delivered = entry('msg-08-04102', 'mail', 'MSG-08-04102');
const pending = entry('msg-08-04484', 'mail', 'MSG-08-04484');
const pending2 = entry('msg-08-04481', 'mail', 'MSG-08-04481');
const directive = entry('dir-0412', 'directives', 'OSC-DIR-0412');

describe('held-message filter', () => {
  it('treats only mail-family routes as messages', () => {
    expect(isMessageEntry(delivered)).toBe(true);
    expect(isMessageEntry(directive)).toBe(false);
  });

  it('holds non-messages always and messages only once delivered', () => {
    expect(isHeldEntry(directive, [])).toBe(true);
    expect(isHeldEntry(delivered, ['msg-08-04102'])).toBe(true);
    expect(isHeldEntry(pending, ['msg-08-04102'])).toBe(false);
    expect(isHeldEntry(pending, new Set(['msg-08-04484']))).toBe(true);
  });

  it('drops undelivered messages from hits and keeps order', () => {
    const hits = [directive, pending, delivered, pending2].map((route, i) => ({ route, score: 10 - i, snippet: '' }));
    const out = heldHits(hits, ['msg-08-04102']);
    expect(out.map((h) => h.route.id)).toEqual(['dir-0412', 'msg-08-04102']);
  });

  it('drops every message when nothing is delivered (fresh session)', () => {
    const hits = [pending, delivered].map((route) => ({ route, score: 1, snippet: '' }));
    expect(heldHits(hits, [])).toEqual([]);
  });

  it('applies to real index results: a docNo query for an undelivered message finds nothing', async () => {
    const docs: SearchDoc[] = [pending, delivered, directive].map((r) => ({
      id: r.id,
      route: r.route,
      title: r.title,
      docNo: r.docNo,
      summary: r.summary,
      text: r.id === 'msg-08-04484' ? 'TALLOW consignment' : 'routine',
      marking: 'U',
      app: r.app,
    }));
    const ms = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
    ms.addAll(docs);
    const all = [pending, delivered, directive];
    const search = createSearch({
      satisfies: () => true,
      byRoute: (p) => all.find((r) => r.route === p),
      loadIndex: async () => JSON.stringify(ms),
    });
    const raw = await search('TALLOW');
    expect(raw.map((h) => h.route.id)).toEqual(['msg-08-04484']);
    expect(heldHits(raw, [])).toEqual([]);
    expect(heldHits(raw, ['msg-08-04484']).map((h) => h.route.docNo)).toEqual(['MSG-08-04484']);
  });
});
