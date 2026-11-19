import { describe, expect, it } from 'vitest';
import type { AuditEntry } from '@core/contracts';
import { ACTION_LABELS, FINDING_CATEGORIES, REVIEW_KINDS, filterTrail, findingRef, trailDates } from './logic';

const e = (seq: number, kind: AuditEntry['kind'], at: string, subject = '', detail = ''): AuditEntry => ({ seq, kind, at, subject, detail });

const TRAIL: AuditEntry[] = [
  e(1, 'login', '2008-05-18T13:00:00Z', 'OPR-A03-1147'),
  e(2, 'doc.read', '2008-05-18T13:05:00Z', 'OSC-DIR-0412'),
  e(3, 'window.open', '2008-05-19T09:00:00Z', 'OSC-TRN-SEG-04', 'Request refused: requires KESTREL.'),
  e(4, 'form.submit', '2008-05-19T09:10:00Z', 'OSC-F-126', 'Compartment request.'),
];

describe('audit review', () => {
  it('lists in-world days present, oldest first', () => {
    expect(trailDates(TRAIL)).toEqual(['2008-05-18', '2008-05-19']);
  });

  it('filters by kind, refusals, date and text, newest first', () => {
    expect(filterTrail(TRAIL, { kind: 'all', date: 'all', text: '' }).map((x) => x.seq)).toEqual([4, 3, 2, 1]);
    expect(filterTrail(TRAIL, { kind: 'doc.read', date: 'all', text: '' }).map((x) => x.seq)).toEqual([2]);
    expect(filterTrail(TRAIL, { kind: 'refusals', date: 'all', text: '' }).map((x) => x.seq)).toEqual([3]);
    expect(filterTrail(TRAIL, { kind: 'all', date: '2008-05-19', text: '' }).map((x) => x.seq)).toEqual([4, 3]);
    expect(filterTrail(TRAIL, { kind: 'all', date: 'all', text: 'f-126' }).map((x) => x.seq)).toEqual([4]);
  });

  it('numbers findings apart from incident tickets', () => {
    expect(findingRef(0)).toBe('OIA-AF-08-101');
    expect(findingRef(12)).toBe('OIA-AF-08-113');
    expect(findingRef(0)).not.toMatch(/^OIA-\d{2}-\d{3}$/);
  });

  it('labels every kind offered and has categories', () => {
    for (const k of REVIEW_KINDS) expect(ACTION_LABELS[k]).toBeTruthy();
    expect(FINDING_CATEGORIES.length).toBeGreaterThan(3);
  });
});
