import { describe, expect, it } from 'vitest';
import canonJson from '../../../content/canon/canon.client.json';
import type { AuditEntry, RouteEntry } from '@core/contracts';
import type { Canon } from '@core/canon-types';
import {
  accessLogRows,
  accessRecord,
  appendRowsAfterHeading,
  accessionsIn,
  actionLabel,
  auditDate,
  auditRef,
  auditTime,
  contractorStats,
  currentSession,
  highestMarking,
  incidentRoutes,
  isRefusal,
  matchesFilter,
  normalizeFields,
  releasedSites,
  summarize,
  threatRouteFor,
  ticketFields,
  ticketSubject,
} from './logic';

const canon = canonJson as unknown as Canon;

const e = (seq: number, kind: AuditEntry['kind'], subject: string, detail = '', at = '2008-05-19T14:30:05.000Z'): AuditEntry => ({ seq, kind, subject, detail, at });

const route = (docNo: string, extra: Partial<RouteEntry> = {}): RouteEntry => ({
  id: docNo.toLowerCase(),
  route: `/x/${docNo.toLowerCase()}`,
  app: 'assurance',
  family: 'assurance',
  template: 'record',
  docNo,
  title: docNo,
  marking: 'UMBRA-C',
  originator: 'OIA/ALPHA-01',
  revision: 1,
  date: '2008-05-01',
  summary: '',
  ...extra,
});

describe('markings', () => {
  it('picks the highest canon rank', () => {
    expect(highestMarking(['TSSCI-OSC', 'UMBRA-C', 'UMBRA-R'], canon.markings)).toBe('UMBRA-C');
    expect(highestMarking(['UMBRA-EO', 'TSSCI-OSC'], canon.markings)).toBe('UMBRA-EO');
  });
  it('falls back to the lowest marking', () => {
    expect(highestMarking([], canon.markings)).toBe('TSSCI-OSC');
    expect(highestMarking([null, undefined], canon.markings)).toBe('TSSCI-OSC');
  });
});

describe('audit formatting', () => {
  it('formats references, times and dates', () => {
    expect(auditRef({ seq: 42, at: '2008-05-19T14:30:05.000Z' })).toBe('AUD-080519-000042');
    expect(auditTime('2008-05-19T14:30:05.000Z')).toBe('1430Z (1030 EDT)');
    expect(auditTime('2008-05-19T02:05:00.000Z')).toBe('0205Z (2205 EDT)');
    expect(auditDate('2008-05-09T02:05:00.000Z')).toBe('09 MAY 2008');
  });
  it('labels refusals separately from opened windows', () => {
    const refused = e(1, 'window.open', 'OSC-X', 'Operator 3-1147 requested OSC-X. Request refused: Requires Tier 2.');
    const opened = e(2, 'window.open', 'Assurance', 'Operator 3-1147 opened Assurance.');
    expect(isRefusal(refused)).toBe(true);
    expect(actionLabel(refused)).toBe('REQUEST REFUSED');
    expect(actionLabel(opened)).toBe('WINDOW OPENED');
    expect(matchesFilter(refused, 'refusals')).toBe(true);
    expect(matchesFilter(opened, 'refusals')).toBe(false);
  });
  it('cuts the trail at the last sign-in', () => {
    const list = [e(1, 'login', 'a'), e(2, 'doc.read', 'X'), e(3, 'login', 'a'), e(4, 'doc.read', 'Y')];
    expect(currentSession(list).map((x) => x.seq)).toEqual([3, 4]);
    expect(currentSession([e(1, 'doc.read', 'X')])).toHaveLength(1);
  });
  it('summarizes documents, withheld items and high markings', () => {
    const list = [
      e(1, 'doc.read', 'OSC-2008-Q2'),
      e(2, 'doc.read', 'OSC-2008-Q2'),
      e(3, 'doc.read', 'OSC-DIR-0412'),
      e(4, 'redaction.hover', 'OSC-DIR-0412'),
      e(5, 'window.open', 'OSC-Y', 'Request refused.'),
      e(6, 'search', 'unposted'),
      e(7, 'print', 'OSC-DIR-0412'),
    ];
    const rank = (d: string) => (d === 'OSC-2008-Q2' ? 4 : 0);
    const s = summarize(list, rank, 4);
    expect(s).toMatchObject({ total: 7, documents: 2, displays: 3, withheld: 1, refusals: 1, queries: 1, prints: 1 });
    expect(s.highDocs).toEqual(['OSC-2008-Q2']);
  });
});

describe('incident tickets', () => {
  it('finds OIA-series tickets and strips the subject prefix', () => {
    const rs = [route('OIA-08-031', { title: 'Security Incident OIA-08-031: Electronic Image of Council Record' }), route('OSC-ASR-CG'), route('OIA-07-112')];
    expect(incidentRoutes(rs).map((r) => r.docNo)).toEqual(['OIA-08-031', 'OIA-07-112']);
    expect(ticketSubject(rs[0]!)).toBe('Electronic Image of Council Record');
    expect(ticketSubject(rs[1]!)).toBe('OSC-ASR-CG');
  });
  it('reads fields as a list or a map and picks header fields by label', () => {
    expect(normalizeFields({ Status: 'OPEN', Pages: 3 })).toEqual([
      { label: 'Status', value: 'OPEN' },
      { label: 'Pages', value: '3' },
    ]);
    const f = ticketFields(
      normalizeFields([
        { label: 'Status', value: 'OPEN' },
        { label: 'Severity', value: 'II' },
        { label: 'Date opened', value: '05 MAY 2008' },
        { label: 'Action officer', value: 'RAO ALPHA-03' },
        { label: 'Suspense', value: '30 MAY 2008' },
        { label: 'Reported by', value: 'Records Analyst' },
      ]),
    );
    expect(f).toEqual({ status: 'OPEN', severity: 'II', opened: '05 MAY 2008', officer: 'RAO ALPHA-03', suspense: '30 MAY 2008', reportedBy: 'Records Analyst' });
  });
  it('builds the access record from named terms', () => {
    const list = [
      e(1, 'login', 'x'),
      e(2, 'doc.read', 'OSC-2008-Q2'),
      e(3, 'search', 'RD-ACC-08-00412'),
      e(4, 'doc.read', 'OSC-DIR-0412'),
      e(5, 'window.close', 'OSC-2008-Q2'),
    ];
    expect(accessRecord(list, ['OSC-2008-Q2', 'rd-acc-08-00412']).map((x) => x.seq)).toEqual([2, 3]);
    expect(accessRecord(list, [])).toEqual([]);
    expect(accessionsIn('Found on Accession RD-ACC-08-00412 and RD-ACC-08-00412')).toEqual(['RD-ACC-08-00412']);
  });
});

describe('ticket access log', () => {
  it('lists the operator own openings, ticket displays and accession queries', () => {
    const list = [
      e(1, 'doc.read', 'OSC-2008-Q2', '', '2008-05-19T14:30:00.000Z'),
      e(2, 'doc.read', 'OIA-08-031'),
      e(3, 'search', '00412'),
      e(4, 'search', 'parking'),
      e(5, 'window.open', 'OSC-2008-Q2'),
    ];
    const rows = accessLogRows(list, { ticket: 'OIA-08-031', items: ['OSC-2008-Q2'], accessions: ['RD-ACC-08-00412'], workstation: 'A03-5-114', operator: 'OPR (P)' });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['19 MAY 2008 1430Z (1030 EDT)', 'A03-5-114', 'OPR (P)', 'Opened. Access recorded under OIA-08-031.']);
    expect(rows[2]![3]).toBe('Index query "00412".');
  });
  it('appends rows to the table under the heading only', () => {
    const html = '<h2 id="worklog">Worklog</h2><table><tbody><tr><td>a</td></tr></tbody></table><h2 id="access-log">Access log</h2><p>x</p><table><tbody><tr><td>b</td></tr></tbody></table>';
    const out = appendRowsAfterHeading(html, 'access-log', [['1 <2>', 'w']]);
    expect(out).toContain('<td>b</td></tr><tr class="asr-own-access"><td>1 &lt;2&gt;</td><td>w</td></tr></tbody>');
    expect(out.indexOf('asr-own-access')).toBeGreaterThan(out.indexOf('access-log'));
    expect(appendRowsAfterHeading(html, 'missing', [['x']])).toBe(html);
    expect(appendRowsAfterHeading('<h2 id="access-log">A</h2><h2 id="n">N</h2><table><tbody></tbody></table>', 'access-log', [['x']])).not.toContain('asr-own-access');
  });
});

describe('canon-derived views', () => {
  it('maps every threat protocol to a register page number', () => {
    const rs = canon.threatDetail.map((t, i) => route(`OSC-ASR-THR-${String(i + 1).padStart(2, '0')}`));
    for (const t of canon.threatDetail) expect(threatRouteFor(t.protocol.designation, rs)).toBeDefined();
  });
  it('releases the holder site and its regional network, never DELTA', () => {
    const s = releasedSites(canon.operator.site, canon.facilities);
    expect(s.has(canon.operator.site)).toBe(true);
    for (const id of s) expect(id.startsWith('DELTA')).toBe(false);
    const cover = canon.coverCatalogue.filter((c) => s.has(c.facility)).map((c) => c.facility);
    expect(cover.length).toBeGreaterThan(0);
    expect(cover.length).toBeLessThan(canon.coverCatalogue.length);
  });
  it('contractor register agrees with the canon headline figures', () => {
    const st = contractorStats(canon.contractors.register, canon.contractors.maxSitesKnown);
    expect(st.primes).toBe(canon.contractors.primeCount);
    expect(st.meanSubs).toBe(canon.contractors.avgSubs);
    expect(st.overLimit).toEqual([]);
    expect(st.maxSites).toBeLessThanOrEqual(canon.contractors.maxSitesKnown);
  });
});
