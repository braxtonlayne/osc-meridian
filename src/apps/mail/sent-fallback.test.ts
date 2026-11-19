import { describe, expect, it } from 'vitest';
import type { DocJson, RouteEntry } from '@core/contracts';
import { fallbackSent, readHeaders } from './model';

const SESSION = '2008-05-19T14:32:10.000Z';

describe('sent DTG without a delivery record', () => {
  it('uses the message frontmatter DTG when it is on or before the session date', () => {
    expect(fallbackSent('191110Z MAY 08', '2008-05-19', SESSION)).toBe('191110Z MAY 08');
    expect(fallbackSent('121512Z MAY 08', '2008-05-12', SESSION)).toBe('121512Z MAY 08');
  });
  it('never gives a date after the session date', () => {
    expect(fallbackSent('201507Z MAY 08', '2008-05-20', SESSION)).toBe('191432Z MAY 08');
    expect(fallbackSent(undefined, '2008-05-20', SESSION)).toBe('191432Z MAY 08');
    expect(fallbackSent('garbage', 'not a date', SESSION)).toBe('191432Z MAY 08');
  });
  it('falls back to the entry date when the message has no DTG', () => {
    expect(fallbackSent(undefined, '2008-05-14', SESSION)).toBe('140000Z MAY 08');
  });
  it('readHeaders applies it when meta is missing', () => {
    const entry = { docNo: 'MSG-08-1', date: '2008-05-20', originator: 'X', title: 'T' } as RouteEntry;
    const doc = { frontmatter: { message: { from: 'a@b.mer', to: [], sent: '201507Z MAY 08', arrival: { type: 'audit' } } } } as unknown as DocJson;
    expect(readHeaders(entry, doc, undefined, SESSION).sent).toBe('191432Z MAY 08');
    expect(readHeaders(entry, null, undefined, SESSION).sent).toBe('191432Z MAY 08');
  });
});
