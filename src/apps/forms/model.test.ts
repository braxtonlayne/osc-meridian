import { describe, expect, it } from 'vitest';
import {
  conditionHolds,
  holdersOf,
  layoutSpans,
  precheckAccessRequest,
  spansDate,
  docNoTokens,
  fieldRef,
  fieldRefs,
  flattenValues,
  formatSubmitDetail,
  submitData,
  initialValues,
  matchRefusal,
  matchResponses,
  normalizeEntry,
  parseFormSpec,
  parseTime,
  pnRegex,
  receiptNumber,
  receiptSerial,
  validateField,
  validateForm,
  type FormSpec,
  type ValidationContext,
  type Values,
} from './model';

const PN = '^P-[1-4]-(0[1-8])-\\d{4}$';

/** Specimen frontmatter in the shape the content pipeline emits (subset of OSC-F-114 / F-104 / F-109). */
const FM = {
  formNo: '114',
  form: {
    formNo: 'OSC-F-114',
    edition: '03/2008',
    formTitle: 'Security Incident Report',
    routing: ['Resident Assurance Officer', 'OIA incident register'],
    processing: 'Acknowledged within one duty period.',
    blocks: [
      {
        n: 1,
        label: 'Reporting person',
        fields: [
          { name: 'pn', label: 'Personnel number', type: 'pn', required: true, prefill: 'operator.pn', pattern: PN },
          { name: 'post', label: 'Post and workstation', type: 'text', required: true, prefill: 'operator.workstation' },
        ],
      },
      {
        n: 2,
        label: 'When',
        fields: [
          { name: 'date', label: 'Date of occurrence', type: 'date', required: true, max: '2008-05-31' },
          { name: 'time', label: 'Time of occurrence (Zulu)', type: 'time', required: true },
          { name: 'ongoing', label: 'Continuing', type: 'checkbox' },
        ],
      },
      { n: 3, label: 'Where', fields: [{ name: 'location', label: 'Location', type: 'text', required: true }] },
      {
        n: 4,
        label: 'How',
        fields: [
          { name: 'observed', label: 'How it came to notice', type: 'radio', required: true, options: ['Observed in person', 'Observed on a MERIDIAN display'] },
          { name: 'areas', label: 'Areas', type: 'checkbox', required: true, options: ['Level 5', 'Level 7'] },
        ],
      },
      { n: 5, label: 'Documents involved', fields: [{ name: 'documents', label: 'Documents involved', type: 'docno' }] },
      {
        n: 6,
        label: 'Leave',
        fields: [
          { name: 'firstDay', label: 'First day', type: 'date', max: '2008-12-31' },
          { name: 'lastDay', label: 'Last day', type: 'date' },
          { name: 'workingDays', label: 'Working days', type: 'number', min: 0.5, step: 0.5 },
        ],
      },
      {
        n: 7,
        label: 'Journey',
        fields: [
          {
            name: 'destination',
            label: 'Destination',
            type: 'facility',
            options: [{ value: 'ALPHA-01', label: 'ALPHA-01' }, { value: 'ALPHA-02', label: 'ALPHA-02', compartment: 'SEXTANT' }],
          },
          { name: 'route', label: 'Routing requested', type: 'text' },
        ],
      },
      { n: 8, label: 'Certification', fields: [{ name: 'signature', label: 'Signature', type: 'signature', required: true }] },
    ],
    refusals: [{ when: { route: '(seg(ment)?\\.?\\s*0?4\\b|\\b04-\\d{2}\\b)' }, message: 'No paths (TT-08-02).' }],
    submit: {
      receiptPrefix: 'OSC-F-114/08',
      receiptFormat: 'OSC-F-114/08-NNNNN',
      ack: 'Report received.',
      responses: { memorialDay: 'Leave on 26 MAY 2008 is subject to holiday manning.' },
    },
  },
};

const spec = parseFormSpec(FM, { docNo: 'OSC-F-114', title: 'Security Incident Report' }) as FormSpec;

const roster = new Set(['P-3-05-0288', 'P-4-07-0219']);
const ctx: ValidationContext = {
  satisfies: (k) => k === 'LANTERN',
  pnPattern: pnRegex('P-<T>-<YY>-<NNNN>'),
  knownPn: (pn) => roster.has(pn) || pn === 'P-3-06-1147',
  knownDocNo: (d) => d === 'OSC-2008-Q2' || d === 'OSC-DIR-0412',
  facilities: ['ALPHA-01', 'ALPHA-02', 'ALPHA-03'],
};

function filled(over: Partial<Values> = {}): Values {
  return {
    ...initialValues(spec, { 'operator.pn': 'P-3-06-1147', 'operator.workstation': 'A03-5-114' }),
    date: '19 MAY 2008',
    time: '1430',
    location: 'ALPHA-03 Level 5 Room 512',
    observed: 'Observed in person',
    areas: ['Level 5'],
    signature: 'ANALYST (PROBATIONARY) 3-1147',
    ...over,
  };
}

const errors = (v: Values) => validateForm(spec, v, ctx).filter((i) => i.level === 'error');

describe('parseFormSpec', () => {
  it('reads blocks, fields, options, routing and submit', () => {
    expect(spec.formNo).toBe('OSC-F-114');
    expect(spec.title).toBe('Security Incident Report');
    expect(spec.routing).toHaveLength(2);
    expect(spec.blocks.map((b) => b.n)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    const areas = spec.blocks[3]!.fields[1]!;
    expect(areas.multi).toBe(true);
    const dest = spec.blocks[6]!.fields[0]!;
    expect(dest.options[1]).toEqual({ value: 'ALPHA-02', label: 'ALPHA-02', key: 'SEXTANT' });
    expect(spec.submit.receiptFormat).toBe('OSC-F-114/08-NNNNN');
    expect(spec.submit.responses[0]!.id).toBe('memorialDay');
    expect(spec.refusals).toHaveLength(1);
  });

  it('returns null without a usable form block', () => {
    expect(parseFormSpec({}, { docNo: 'X-1', title: 't' })).toBeNull();
    expect(parseFormSpec({ form: { blocks: [] } }, { docNo: 'X-1', title: 't' })).toBeNull();
  });

  it('falls back to text for unknown field types and to docNo for formNo', () => {
    const s = parseFormSpec({ form: { blocks: [{ n: 1, label: 'A', fields: [{ name: 'a', label: 'A', type: 'weird' }] }] } }, { docNo: 'OSC-F-999', title: 'T' })!;
    expect(s.formNo).toBe('OSC-F-999');
    expect(s.blocks[0]!.fields[0]!.type).toBe('text');
    expect(s.submit.receiptPrefix).toBe('OSC-F-999');
  });
});

describe('references', () => {
  it('numbers single-field blocks plainly and multi-field blocks with letters', () => {
    expect(fieldRef(spec.blocks[2]!, 0)).toBe('3');
    expect(fieldRef(spec.blocks[1]!, 2)).toBe('2c');
    expect(fieldRefs(spec).time).toBe('2b');
  });
});

describe('initialValues', () => {
  it('resolves prefill keys and leaves the rest blank', () => {
    const v = initialValues(spec, { 'operator.pn': 'P-3-06-1147', 'operator.workstation': 'A03-5-114' });
    expect(v.pn).toBe('P-3-06-1147');
    expect(v.post).toBe('A03-5-114');
    expect(v.location).toBe('');
    expect(v.areas).toEqual([]);
  });

  it('does not prefill a value missing from the printed list', () => {
    const s = parseFormSpec(
      { form: { blocks: [{ n: 1, label: 'A', fields: [{ name: 'o', label: 'O', type: 'facility', prefill: 'operator.site', options: ['ALPHA-01'] }] }] } },
      { docNo: 'OSC-F-1', title: 'T' },
    )!;
    expect(initialValues(s, { 'operator.site': 'ALPHA-03' }).o).toBe('');
  });
});

describe('validateForm', () => {
  it('accepts a complete form', () => {
    expect(errors(filled())).toEqual([]);
  });

  it('rejects every blank required block, citing the block', () => {
    const v = initialValues(spec, {});
    const e = errors(v);
    const refs = e.map((i) => i.ref);
    expect(refs).toEqual(['1a', '1b', '2a', '2b', '3', '4a', '4b', '8']);
    expect(e.every((i) => i.message.startsWith(`Block ${i.ref}.`))).toBe(true);
    expect(e.find((i) => i.ref === '8')!.message).toMatch(/Not signed/);
  });

  it('checks personnel numbers against the canon pattern and the directory', () => {
    expect(errors(filled({ pn: 'P-9-06-1147' })).map((i) => i.field)).toEqual(['pn']);
    expect(errors(filled({ pn: '3-1147' }))[0]!.message).toMatch(/not a personnel number/);
    const notes = validateForm(spec, filled({ pn: 'P-3-07-0001' }), ctx).filter((i) => i.level === 'notice');
    expect(notes.map((i) => i.field)).toEqual(['pn']);
  });

  it('checks dates: format, ceiling, explicit max, order of pairs', () => {
    expect(errors(filled({ date: '32 MAY 2008' }))[0]!.message).toMatch(/not recognised/);
    expect(errors(filled({ date: '01 JUN 2008' }))[0]!.message).toMatch(/later than 31 MAY 2008/);
    expect(errors(filled({ date: '12MAY08' }))).toEqual([]);
    // firstDay has max 31 DEC 2008, which widens the horizon for lastDay too
    expect(errors(filled({ firstDay: '02 JUN 2008', lastDay: '06 JUN 2008' }))).toEqual([]);
    const e = errors(filled({ firstDay: '20 MAY 2008', lastDay: '19 MAY 2008' }));
    expect(e).toHaveLength(1);
    expect(e[0]!.field).toBe('lastDay');
    expect(e[0]!.message).toMatch(/earlier than block 6a/);
  });

  it('checks times', () => {
    expect(errors(filled({ time: '2460' }))[0]!.field).toBe('time');
    expect(errors(filled({ time: '14:30' }))).toEqual([]);
    expect(errors(filled({ time: '0815Z' }))).toEqual([]);
  });

  it('checks numbers: figures, minimum, step', () => {
    expect(errors(filled({ workingDays: 'two' }))[0]!.message).toMatch(/figures only/);
    expect(errors(filled({ workingDays: '0' }))[0]!.message).toMatch(/less than 0.5/);
    expect(errors(filled({ workingDays: '1.25' }))[0]!.message).toMatch(/steps of 0.5/);
    expect(errors(filled({ workingDays: '3.5' }))).toEqual([]);
  });

  it('refuses options the operator is not briefed for and values not on the list', () => {
    expect(errors(filled({ destination: 'ALPHA-01' }))).toEqual([]);
    expect(errors(filled({ destination: 'ALPHA-02' }))[0]!.message).toMatch(/not open to this operator/);
    expect(errors(filled({ destination: 'BETA-08' }))[0]!.message).toMatch(/not on the printed list/);
    expect(errors(filled({ observed: 'Dreamt it' }))[0]!.field).toBe('observed');
    expect(errors(filled({ areas: ['Level 9'] }))[0]!.field).toBe('areas');
  });

  it('wants a document number in docno blocks and notes ones not on the index', () => {
    expect(errors(filled({ documents: 'the scan' }))[0]!.message).toMatch(/document or accession number/);
    expect(errors(filled({ documents: 'OSC-2008-Q2 copy 07' }))).toEqual([]);
    const n = validateForm(spec, filled({ documents: 'RD-ACC-08-00412' }), ctx).filter((i) => i.level === 'notice');
    expect(n[0]!.message).toMatch(/RD-ACC-08-00412 not found on the MERIDIAN index/);
  });

  it('applies a field pattern to text entries', () => {
    const s = parseFormSpec(
      { form: { blocks: [{ n: 1, label: 'A', fields: [{ name: 'acc', label: 'Accession', type: 'text', pattern: '^RD-ACC-\\d{2}-\\d{5}$' }] }] } },
      { docNo: 'OSC-F-1', title: 'T' },
    )!;
    const f = s.blocks[0]!.fields[0]!;
    expect(validateField(f, 'RD-ACC-08-00412', ctx, '1')).toEqual([]);
    expect(validateField(f, 'shelf 4', ctx, '1')[0]!.level).toBe('error');
  });
});

describe('helpers', () => {
  it('derives the personnel number regex from canon', () => {
    const re = pnRegex('P-<T>-<YY>-<NNNN>');
    expect(re.test('P-3-06-1147')).toBe(true);
    expect(re.test('P-5-06-1147')).toBe(false);
    expect(re.test('P-3-6-1147')).toBe(false);
  });

  it('parses times and normalises entries', () => {
    expect(parseTime('9:05')).toBe('0905');
    expect(parseTime('1430z')).toBe('1430');
    expect(parseTime('25:00')).toBeNull();
    const date = spec.blocks[1]!.fields[0]!;
    expect(normalizeEntry(date, '12may08')).toBe('12 MAY 2008');
    expect(normalizeEntry(spec.blocks[0]!.fields[0]!, 'p-3-05-0288')).toBe('P-3-05-0288');
  });

  it('finds document tokens', () => {
    expect(docNoTokens('osc-2008-q2, copy 07; RD-ACC-08-00412')).toEqual(['OSC-2008-Q2', 'RD-ACC-08-00412']);
    expect(docNoTokens('12-05')).toEqual([]);
  });
});

describe('flattenValues', () => {
  it('gives every field a string keyed by field name', () => {
    const flat = flattenValues(spec, filled({ areas: ['Level 5', 'Level 7'], ongoing: 'YES', location: '  SEG 04 BLK 04-07  ' }));
    expect(Object.keys(flat).sort()).toEqual(
      ['areas', 'date', 'destination', 'documents', 'firstDay', 'lastDay', 'location', 'observed', 'ongoing', 'pn', 'post', 'route', 'signature', 'time', 'workingDays'],
    );
    expect(flat.areas).toBe('Level 5; Level 7');
    expect(flat.location).toBe('SEG 04 BLK 04-07');
    expect(flat.documents).toBe('');
  });
});

describe('dispositions', () => {
  const cctx = { particulars: { 'operator.probationer': 'YES', 'operator.site': 'ALPHA-03' } };

  it('returns the form when a refusal condition holds (case-insensitive)', () => {
    const flat = flattenValues(spec, filled({ route: 'SEG 04' }));
    expect(matchRefusal(spec, flat, cctx)?.message).toBe('No paths (TT-08-02).');
    expect(matchRefusal(spec, flattenValues(spec, filled({ route: 'SEG 05' })), cctx)).toBeNull();
  });

  it('evaluates particulars, anyField, booleans and unknown keys', () => {
    const flat = { a: '790', b: '' };
    expect(conditionHolds({}, flat, cctx)).toBe(true);
    expect(conditionHolds({ probationer: 'YES' }, flat, cctx)).toBe(true);
    expect(conditionHolds({ anyField: '^\\s*790\\s*$' }, flat, cctx)).toBe(true);
    expect(conditionHolds({ b: false }, flat, cctx)).toBe(true);
    expect(conditionHolds({ b: true }, flat, cctx)).toBe(false);
    expect(conditionHolds({ nosuch: '.*' }, flat, cctx)).toBe(false);
  });

  it('applies named responses (memorialDay over a leave span)', () => {
    const on = flattenValues(spec, filled({ firstDay: '23 MAY 2008', lastDay: '27 MAY 2008' }));
    const off = flattenValues(spec, filled({ firstDay: '12 MAY 2008', lastDay: '13 MAY 2008' }));
    const named = { memorialDay: (f: Record<string, string>, s: FormSpec) => spansDate(f, s, '2008-05-26') };
    expect(matchResponses(spec, on, cctx, named).map((r) => r.id)).toEqual(['memorialDay']);
    expect(matchResponses(spec, off, cctx, named)).toEqual([]);
    expect(matchResponses(spec, on, cctx)).toEqual([]);
  });

  it('handles session and document-marking conditions', () => {
    const flat = { document: 'osc-2008-q2', other: '' };
    const c = { ...cctx, particulars: { 'session.probationer': 'YES' }, docMarking: (d: string) => (d === 'OSC-2008-Q2' ? 'UMBRA-EO' : 'TSSCI-OSC') };
    expect(conditionHolds({ session: 'probationer' }, flat, c)).toBe(true);
    expect(conditionHolds({ session: 'acting' }, flat, c)).toBe(false);
    expect(conditionHolds({ document: { marking: 'UMBRA-EO' } }, flat, c)).toBe(true);
    expect(conditionHolds({ document: { marking: 'UMBRA-EO' } }, { document: 'OSC-DIR-0412' }, c)).toBe(false);
  });

  it('parses refusal receipt flags, instructions:null and history', () => {
    const s = parseFormSpec(
      {
        form: {
          instructions: null,
          history: { requires: 'flag:queryRead', label: 'Declarations this period' },
          blocks: [{ n: 1, label: 'A', fields: [{ name: 'a', label: 'A' }] }],
          refusals: [{ when: { session: 'probationer' }, message: 'Not accepted.', receipt: false }],
          submit: { receiptPrefix: 'OSC-F-122/08', counterHours: { site: 'ALPHA-03', text: 'Counter open 1230Z.' } },
        },
      },
      { docNo: 'OSC-F-122', title: 'T' },
    )!;
    expect(s.noInstructions).toBe(true);
    expect(s.history).toEqual({ requires: 'flag:queryRead', label: 'Declarations this period' });
    expect(s.refusals[0]!.receipt).toBe(false);
    expect(s.submit.notes).toEqual(['Counter open 1230Z.']);
    expect(spec.noInstructions).toBe(false);
    expect(spec.refusals[0]!.receipt).toBe(true);
  });
});

describe('receipts', () => {
  it('follows the canon receipt scheme', () => {
    expect(receiptNumber('OSC-F-114/08', 417, 'OSC-F-114/08-NNNNN')).toBe('OSC-F-114/08-00417');
    expect(receiptNumber('OSC-F-114/08', 417)).toBe('OSC-F-114/08-00417');
    expect(receiptNumber('OSC-F-114', 417)).toBe('OSC-F-114/08-00417');
    expect(receiptNumber('RCPT-126-', 12)).toBe('RCPT-126-00012');
  });

  it('draws a stable, rising serial per form', () => {
    expect(receiptSerial('OSC-F-114', 0)).toBe(receiptSerial('OSC-F-114', 0));
    expect(receiptSerial('OSC-F-114', 1)).toBeGreaterThan(receiptSerial('OSC-F-114', 0));
  });
});

describe('audit payload', () => {
  it('carries every entry keyed by field name, plus the form number', () => {
    const fields = flattenValues(spec, filled({ location: 'SEG 04 BLK 04-07', documents: 'OSC-2008-Q2 COPY 07' }));
    const data = submitData('OSC-F-114', fields);
    expect(data.form).toBe('OSC-F-114');
    for (const f of spec.blocks.flatMap((b) => b.fields)) expect(typeof data[f.name]).toBe('string');
    // Shapes from the narrative plan (S10, S12), matched case-insensitively by the engine.
    expect(/(seg(ment)?\s*0?4\b|\b04-\d{2}\b|R04)/i.test(data.location!)).toBe(true);
    expect(/OSC-2008-Q2/i.test(data.documents!)).toBe(true);
    expect(Object.values(data).some((v) => /copy\s*(no\.?|number)?\s*0?7\b/i.test(v))).toBe(true);
  });

  it('phrases the audit line for each disposition', () => {
    const base = { formNo: 'OSC-F-114', title: 'Security Incident Report', operatorId: 'OPR-A03-1147', entries: 9 };
    expect(formatSubmitDetail({ ...base, receiptNo: 'OSC-F-114/08-00417', disposition: 'ACCEPTED' })).toBe(
      'Operator OPR-A03-1147 submitted OSC-F-114 (Security Incident Report) for routing, 9 entries. Receipt OSC-F-114/08-00417. Accepted for routing.',
    );
    expect(formatSubmitDetail({ ...base, receiptNo: null, disposition: 'RETURNED', reason: 'Not accepted.' })).toMatch(/No receipt issued\. Returned without action: Not accepted\.$/);
  });
});

describe('compartment access request (OSC-F-126)', () => {
  const roster = [
    { pn: 'P-3-05-0288', notes: 'Holds KESTREL. Signed the Segment 04 commissioning sheet.' },
    { pn: 'P-2-02-0091', notes: 'Holds KESTREL and TALLOW. Signs segment engineering sheets.' },
    { pn: 'P-2-04-0218', notes: 'Holds LANTERN. Supervisor of record.' },
    { pn: 'P-1-01-0004', notes: 'Holds distribution copy 10.' },
  ];
  const base = {
    compartment: 'KESTREL',
    sponsorPn: 'P-3-05-0288',
    justification: 'Mileage query OSC-MEM-07-0944 and OSC-TRN-ENG.',
    held: false,
    holders: holdersOf(roster, 'KESTREL'),
    supervisorPn: 'P-2-04-0218',
    interimReview: false,
  };

  it('reads holders from directory notes', () => {
    expect(holdersOf(roster, 'KESTREL')).toEqual(['P-3-05-0288', 'P-2-02-0091']);
    expect(holdersOf(roster, 'TALLOW')).toEqual(['P-2-02-0091']);
    expect(holdersOf(roster, 'QUARRY')).toEqual([]);
  });

  it('forwards a sponsored, in-scope request', () => {
    expect(precheckAccessRequest(base)).toBeNull();
    expect(precheckAccessRequest({ ...base, sponsorPn: 'p-2-02-0091' })).toBeNull();
  });

  it('returns requests with the reason the registry would give', () => {
    expect(precheckAccessRequest({ ...base, held: true })).toBe('alreadyHeld');
    expect(precheckAccessRequest({ ...base, sponsorPn: 'P-2-04-0218' })).toBe('sponsorNotHolder');
    expect(precheckAccessRequest({ ...base, justification: 'Needed for my work. OSC-DIR-0412.' })).toBe('outOfScope');
  });

  it('applies the acting credential rules', () => {
    const acting = { ...base, compartment: 'ACTING-T2', holders: [] };
    expect(precheckAccessRequest({ ...acting, sponsorPn: 'P-3-05-0288' })).toBe('actingSponsor');
    expect(precheckAccessRequest({ ...acting, sponsorPn: 'P-2-04-0218' })).toBe('actingIneligible');
    expect(precheckAccessRequest({ ...acting, sponsorPn: 'P-2-04-0218', interimReview: true })).toBeNull();
  });
});

describe('layoutSpans', () => {
  const f = (type: string, extra: Record<string, unknown> = {}) =>
    parseFormSpec({ form: { blocks: [{ n: 1, label: 'A', fields: [{ name: 'x', label: 'X', type, ...extra }] }] } }, { docNo: 'D-1', title: 'T' })!.blocks[0]!.fields[0]!;

  it('fills every row of the ruled grid to 12 columns', () => {
    expect(layoutSpans([f('pn'), f('text')])).toEqual([4, 8]);
    expect(layoutSpans([f('pn'), f('text'), f('facility'), f('text')])).toEqual([4, 8, 4, 8]);
    expect(layoutSpans([f('date'), f('date'), f('date'), f('textarea')])).toEqual([4, 4, 4, 12]);
    expect(layoutSpans([f('text', { width: 'half' })])).toEqual([12]);
    for (const spans of [layoutSpans([f('text'), f('pn'), f('pn'), f('time'), f('textarea'), f('checkbox')])]) {
      let row = 0;
      for (const s of spans) {
        row += s;
        expect(row).toBeLessThanOrEqual(12);
        if (row === 12) row = 0;
      }
      expect(row).toBe(0);
    }
  });
});
