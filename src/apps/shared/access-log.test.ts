import { describe, expect, it } from 'vitest';
import type { AuditEntry, DocJson } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { ticketTerms, withOwnAccess } from './access-log';

const doc = {
  id: 'assurance-oia-08-031',
  docNo: 'OIA-08-031',
  title: 'Security Incident OIA-08-031: image on RD-ACC-08-00412',
  summary: '',
  xrefs: [{ docNo: 'OSC-2008-Q2' }, { docNo: 'OSC-DIR-0412' }],
  html: '<h2 id="access-log">Access log</h2><table><tbody><tr><td>a</td></tr></tbody></table><h2 id="next">Next</h2>',
} as unknown as DocJson;
const entry = (kind: string, subject: string): AuditEntry => ({ seq: 1, at: '2008-05-19T14:32:00.000Z', kind, subject, detail: '' }) as unknown as AuditEntry;

describe('access log rows shared by Assurance and Records', () => {
  it('collects the ticket, its accessions and its top-marking cross-references', () => {
    const terms = ticketTerms(doc, doc, (d) => ({ marking: (d === 'OSC-2008-Q2' ? 'TSSCI-OSC' : 'UMBRA-U') as MarkingId }), 'TSSCI-OSC');
    expect(terms.sort()).toEqual(['OIA-08-031', 'OSC-2008-Q2', 'RD-ACC-08-00412']);
  });
  it('appends this workstation\'s rows to the access-log table only', () => {
    const terms = ['OIA-08-031', 'OSC-2008-Q2', 'RD-ACC-08-00412'];
    const out = withOwnAccess(doc, { entries: [entry('doc.read', 'OSC-2008-Q2'), entry('search', 'RD-ACC-08-00412'), entry('doc.read', 'OSC-DIR-0001')], terms, workstation: 'A03-5-114', operator: '3-1147 (P)' });
    const rows = out.html.match(/asr-own-access/g) ?? [];
    expect(rows).toHaveLength(2);
    expect(out.html).toContain('19 MAY 2008 1432Z (1032 EDT)');
    expect(out.html).toContain('Opened. Access recorded under OIA-08-031.');
    expect(out.html.indexOf('asr-own-access')).toBeLessThan(out.html.indexOf('id="next"'));
    expect(withOwnAccess({ ...doc, html: '<p>none</p>' }, { entries: [entry('doc.read', 'OSC-2008-Q2')], terms, workstation: 'w', operator: 'o' }).html).toBe('<p>none</p>');
  });
});
