import { describe, expect, it } from 'vitest';
import type { AuditEntry, DocJson, RouteEntry } from '@core/contracts';
import {
  deliveryLines,
  dtgFromIso,
  dtgKey,
  fillSlots,
  fillText,
  forView,
  mayOriginate,
  parseSent,
  prefixSubject,
  quoteBody,
  readHeaders,
  receiptAudit,
  replyAllRecipients,
  resolveRecipient,
  sendAudit,
  splitRecipients,
  zuluLocal,
  UNFILLED,
  type DirEntry,
  type Outgoing,
} from './model';

const entry: RouteEntry = {
  id: 'msg-x',
  route: '/mail/msg-x',
  app: 'mail',
  family: 'mail',
  template: 'message',
  docNo: 'MSG-08-00001',
  title: 'Record of Access: {docNo}',
  marking: 'TSSCI-OSC',
  originator: 'OIA/ALPHA-03',
  revision: 1,
  date: '2008-05-20',
  summary: 'test message',
};

const doc = (fm: Record<string, unknown>, html = '<p>Opened {docNo} at {time}.</p>'): DocJson => ({
  ...entry,
  html,
  redactions: [],
  xrefs: [],
  headings: [],
  frontmatter: fm,
});

const DIR: DirEntry[] = [
  { address: 'm.okafor@a03.rd.mer', name: 'Miriam Okafor' },
  { address: 'j.harrow@a03.rd.mer', name: 'J. Harrow' },
  { address: 'c.dimmick@a03.rd.mer', name: 'Carol Ann Dimmick', site: 'DETACHED / UNPOSTED' },
  { address: '[[RX:T1:17]]', name: '[[RX:T1:17]]' },
];

describe('DTG', () => {
  it('round-trips and sorts', () => {
    expect(dtgKey('201507Z MAY 08')).toBe('2008-05-20T15:07');
    expect(dtgKey('nonsense')).toBeNull();
    expect(dtgFromIso('2008-05-20T14:32:10.000Z')).toBe('201432Z MAY 08');
    expect(zuluLocal('2008-05-20T14:32:10.000Z')).toBe('1432Z (1032 EDT)');
    expect(zuluLocal('2008-05-20T02:05:00.000Z')).toBe('0205Z (2205 EDT)');
  });
});

describe('headers', () => {
  it('reads the nested message block and stamps in-session arrivals with the delivery time', () => {
    const d = doc({ message: { from: 'd.prewitt@a03.oia.mer', to: ['analyst.1147@a03.rd.mer'], sent: '201436Z MAY 08', precedence: 'priority', slots: ['docNo', 'time'], arrival: { type: 'audit' } } });
    const h = readHeaders(entry, d, { at: '2008-05-22T09:15:00.000Z', slots: { docNo: 'OSC-2008-Q2' } });
    expect(h.from).toBe('d.prewitt@a03.oia.mer');
    expect(h.precedence).toBe('PRIORITY');
    expect(h.sent).toBe('220915Z MAY 08');
    expect(h.subject).toBe('Record of Access: OSC-2008-Q2');
    const login = readHeaders(entry, doc({ message: { from: 'a@b.mer', to: [], sent: '141200Z APR 08', arrival: { type: 'login' } } }), { at: '2008-05-22T09:15:00.000Z' });
    expect(login.sent).toBe('141200Z APR 08');
  });
  it('lifts the header block and fills slots for DocumentView', () => {
    const d = doc({ message: { from: 'x@a.mer', to: ['y@b.mer'], slots: ['docNo', 'time'], arrival: { type: 'audit' } } });
    const delivery = { at: '2008-05-21T10:00:00.000Z', slots: { docNo: 'OSC-2008-Q2' } };
    const v = forView(d, readHeaders(entry, d, delivery), delivery);
    expect(v.frontmatter.from).toBe('x@a.mer');
    expect(v.html).toBe(`<p>Opened OSC-2008-Q2 at ${UNFILLED}.</p>`);
    expect(v.date).toBe('2008-05-21');
    expect(v.html).not.toMatch(/\{\w+\}/);
  });
  it('cable pages keep the cable heading for the view but the envelope for the list', () => {
    const d = { ...doc({ message: { from: 'registry@a03.rd.mer', to: ['me@a03.rd.mer'] }, cable: { to: ['NETWORK CONTROL'], dtg: '121430Z MAY 08' } }), template: 'cable' as const };
    expect(readHeaders(entry, d).to).toEqual(['me@a03.rd.mer']);
    expect(forView(d, readHeaders(entry, d)).frontmatter.to).toEqual(['NETWORK CONTROL']);
  });
});

describe('slots', () => {
  it('escapes values and leaves undeclared braces alone', () => {
    expect(fillSlots('<p>{query} {other}</p>', { query: '<b>790</b>' })).toBe('<p>&lt;b&gt;790&lt;/b&gt; {other}</p>');
    expect(fillText('Q {a}', {}, ['a'])).toBe(`Q ${UNFILLED}`);
  });
});

describe('addresses', () => {
  it('splits and resolves', () => {
    expect(splitRecipients('a@b.mer; c@d.mer,\n e@f.mer')).toEqual(['a@b.mer', 'c@d.mer', 'e@f.mer']);
    expect(resolveRecipient('okafor', DIR).status).toBe('resolved');
    expect(resolveRecipient('someone@example.com', DIR).status).toBe('external');
    expect(resolveRecipient('x.unknown@a03.rd.mer', DIR).status).toBe('unlisted');
    expect(resolveRecipient('nobody', DIR).status).toBe('unknown');
    expect(resolveRecipient('M.OKAFOR@A03.RD.MER', DIR)).toMatchObject({ status: 'resolved', address: 'm.okafor@a03.rd.mer' });
  });
  it('reply-all drops the operator and duplicates', () => {
    const r = replyAllRecipients({ from: 'm.okafor@a03.rd.mer', to: ['analyst.1147@a03.rd.mer', 'j.harrow@a03.rd.mer'], cc: ['m.okafor@a03.rd.mer', 'd.prewitt@a03.oia.mer'] }, 'analyst.1147@a03.rd.mer');
    expect(r).toEqual({ to: ['m.okafor@a03.rd.mer', 'j.harrow@a03.rd.mer'], cc: ['d.prewitt@a03.oia.mer'] });
  });
  it('limits precedence below Tier 2', () => {
    expect(mayOriginate('PRIORITY', 3)).toBe(true);
    expect(mayOriginate('FLASH', 3)).toBe(false);
    expect(mayOriginate('FLASH', 2)).toBe(true);
  });
});

describe('sent traffic from the audit trail', () => {
  const out: Outgoing = {
    to: ['m.okafor@a03.rd.mer', 'c.dimmick@a03.rd.mer'],
    cc: ['x.unlisted@a03.rd.mer'],
    subject: 'Stacks C "queue"',
    precedence: 'ROUTINE',
    marking: 'TSSCI-OSC',
    receiptRequested: true,
    attachments: ['OSC-DIR-0412'],
    inReplyTo: 'MSG-08-04470',
    text: 'Line one.\nLine two.',
  };
  it('logs data in the engine shape and parses it back', () => {
    const a = sendAudit('OPR-A03-1147', out);
    expect(a.subject).toBe('Stacks C "queue"');
    expect(a.data).toMatchObject({ to: 'm.okafor@a03.rd.mer,c.dimmick@a03.rd.mer', cc: 'x.unlisted@a03.rd.mer', body: 'Line one.\nLine two.' });
    const r = receiptAudit('OPR-A03-1147', 'MSG-08-04480', 'BRIAR Briefing', 'c.brandauer@a01.oia.mer');
    const entries: AuditEntry[] = [
      { seq: 7, at: '2008-05-20T14:00:00.000Z', kind: 'mail.send', subject: a.subject, detail: a.detail, data: a.data },
      { seq: 8, at: '2008-05-20T14:01:00.000Z', kind: 'mail.send', subject: r.subject, detail: r.detail, data: r.data },
      { seq: 9, at: '2008-05-20T14:02:00.000Z', kind: 'mail.read', subject: 'msg-x', detail: '' },
    ];
    const parsed = parseSent(entries);
    expect(parsed).toHaveLength(2);
    const m = parsed[0]!;
    if (m.kind !== 'message') throw new Error('expected message');
    expect(m).toMatchObject({ to: out.to, cc: out.cc, text: out.text, receiptRequested: true, attachments: ['OSC-DIR-0412'], inReplyTo: 'MSG-08-04470' });
    expect(parsed[1]).toMatchObject({ kind: 'receipt', docNo: 'MSG-08-04480' });
    // carried-centrally mailboxes get the transfer system's own notice, not a delivery report
    expect(deliveryLines(m, DIR)).toEqual([
      { address: 'm.okafor@a03.rd.mer', outcome: 'delivered' },
      { address: 'x.unlisted@a03.rd.mer', outcome: 'manual' },
    ]);
    expect(deliveryLines({ ...m, to: ['c.dimmick@a03.rd.mer'], cc: [] }, DIR)).toBeNull();
  });
});

describe('reply and forward', () => {
  it('prefixes once and quotes', () => {
    expect(prefixSubject('RE', 'RE: FW: Tasking')).toBe('RE: Tasking');
    const q = quoteBody({ from: 'a@b.mer', to: ['c@d.mer'], cc: [], sent: '201436Z MAY 08', subject: 'S', docNo: 'MSG-08-1', text: 'one\ntwo' });
    expect(q).toContain('-----Original Message-----');
    expect(q).toContain('> one\n> two');
  });
});
