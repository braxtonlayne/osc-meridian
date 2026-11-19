/**
 * Specimen documents for the template gallery (Help Desk: "Document formats").
 * Plain operational paperwork; figures here are local and operational, never canon
 * headline figures. Document numbers follow the pattern used in docs/CONTRACTS.md.
 */
import type { DocJson, RedactionInfo, Template } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';

function rx(id: string, len: number, auth: string, ref: string, key = 'T2'): { span: string; info: RedactionInfo } {
  return {
    span: `<span class="rx" data-rx="${id}" data-len="${len}" data-auth="${auth}" data-ref="${ref}"></span>`,
    info: { id, key, len, auth, ref },
  };
}

function xref(docNo: string, route: string): string {
  return `<a href="${route}" data-xref="${route}">${docNo}</a>`;
}

interface Base {
  id: string;
  template: Template;
  docNo: string;
  title: string;
  marking: MarkingId;
  originator: string;
  revision: number;
  date: string;
  summary: string;
}

function doc(b: Base, rest: Partial<DocJson> & { html: string }): DocJson {
  return {
    ...b,
    route: `/system/help/specimen-${b.id}`,
    app: 'system',
    family: 'help',
    redactions: [],
    xrefs: [],
    headings: [],
    frontmatter: {},
    ...rest,
  };
}

/* ---------------- memo: parking allocation ---------------- */
const memoRx = rx('m1', 22, 'SSO', 'SSO-08-031');
export const SAMPLE_MEMO = doc(
  {
    id: 'memo',
    template: 'memo',
    docNo: 'OSC-MEM-08-0214',
    title: 'Reallocation of Surface Lot B Permits by Shift Rotation',
    marking: 'UMBRA-U',
    originator: 'SSB/ALPHA-03',
    revision: 1,
    date: '2008-05-09',
    summary: 'Lot B permits reissued by shift rotation from 19 MAY 2008.',
  },
  {
    html: [
      '<p>Effective 19 MAY 2008, permits for Surface Lot B at the cover facility are issued by shift rotation rather than by division. Permits issued under the previous allocation (reference a) remain valid until 1800 local on 18 MAY 2008 and are to be returned to the gate office by that time.</p>',
      '<p>Lot B holds 112 marked spaces. Nine spaces in rows F and G are withdrawn until resurfacing is complete, and four are reserved for the visitor reception building. The remaining spaces are divided among the 0600, 1400 and 2200 rotations in proportion to the number of operators who drive to site on each.</p>',
      '<p>Operators on the same rotation who share a vehicle from the same housing area may apply for a single shared permit on OSC Form 61. A shared permit counts once against the rotation allocation.</p>',
      '<p>Requests to retain a reserved space on medical grounds go to the Occupational Health Office, not to this office. Requests sent here will be returned without action.</p>',
      `<p>Spaces in row A adjacent to the ${memoRx.span} are not to be used by any vehicle at any time, including during shift change.</p>`,
      '<p>Vehicles in Lot B without a current permit will be recorded by gate staff. Repeated entries are reported to the operator’s division chief. The gate log is not a disciplinary record.</p>',
      '<p>The point of contact for this memorandum is Mr. D. Okafor, Site Support Branch, extension 3-4471.</p>',
    ].join(''),
    redactions: [memoRx.info],
    xrefs: [
      { docNo: 'OSC-MEM-07-0388', route: '/records/osc-mem-07-0388', title: 'Surface Lot Permit Allocation' },
      { docNo: 'OSC-DIR-0233', route: '/directives/dir-0233', title: 'Cover Facility Access Control' },
    ],
    distribution: ['All division chiefs, ALPHA-03', 'Chief, Site Support Branch', 'Gate Office, cover facility', 'Occupational Health Office (info)'],
    frontmatter: {
      memoFor: ['ALL DIVISION CHIEFS, ALPHA-03', 'CHIEF, SITE SUPPORT BRANCH'],
      from: 'Deputy Commander, ALPHA-03',
      letterhead: ['ALPHA-03', 'Site Support Branch'],
      references: ['(a) OSC-MEM-07-0388, Surface Lot Permit Allocation, 14 SEP 2007', '(b) OSC-DIR-0233, Cover Facility Access Control'].map((r) =>
        r.replace(/^\([a-z]\)\s*/, ''),
      ),
      signature: { name: 'Margaret K. Brandt', title: 'Deputy Commander, ALPHA-03', by: 'D. Okafor' },
      attachments: ['Lot B space allocation by rotation (1 page)'],
      routing: [
        { office: 'SSB/ALPHA-03', action: 'Prepare', initials: 'DO', date: '2008-05-07' },
        { office: 'Gate Office', action: 'Coordinate', initials: 'RW', date: '2008-05-08' },
        { office: 'DCDR/ALPHA-03', action: 'Signature', initials: 'DO for MKB', date: '2008-05-09' },
      ],
    },
  },
);

/* ---------------- directive: filter change ---------------- */
const dirRx = rx('d1', 18, 'FE', 'FE-08-007');
const DIR_HEADINGS = [
  { id: 'purpose', text: 'Purpose', depth: 2 },
  { id: 'applicability', text: 'Applicability', depth: 2 },
  { id: 'policy', text: 'Policy', depth: 2 },
  { id: 'responsibilities', text: 'Responsibilities', depth: 2 },
  { id: 'procedures', text: 'Procedures', depth: 2 },
  { id: 'references', text: 'References', depth: 2 },
  { id: 'supersession', text: 'Supersession', depth: 2 },
];
export const SAMPLE_DIRECTIVE = doc(
  {
    id: 'directive',
    template: 'directive',
    docNo: 'OSC-DIR-0427',
    title: 'Replacement Interval for Air Handling Filter Media',
    marking: 'UMBRA-R',
    originator: 'FE/ALPHA-03',
    revision: 3,
    date: '2008-04-28',
    summary: 'Filter replacement intervals and handling for air handling units serving occupied levels.',
  },
  {
    html: [
      '<h2 id="purpose">Purpose</h2>',
      '<p>This directive sets the replacement interval and handling procedure for primary and secondary filter media in air handling units serving occupied levels.</p>',
      '<h2 id="applicability">Applicability</h2>',
      '<p>This directive applies to Facilities Engineering personnel and contract maintenance staff at ALPHA-class sites. BETA-class sites follow it where their maintenance agreement does not state otherwise.</p>',
      '<h2 id="policy">Policy</h2>',
      '<p>Primary filter media are replaced every 90 days, or when differential pressure across the bank exceeds 1.0 inch water gauge, whichever comes first. Secondary banks are replaced every 24 months or at 2.0 inches water gauge.</p>',
      '<p>No filter bank is opened while the facility is in a sealed condition. Replacement then falls due on the first working day after the condition is lifted.</p>',
      `<p>Spent media from units serving ${dirRx.span} are bagged separately and handled as controlled waste under reference (c).</p>`,
      '<h2 id="responsibilities">Responsibilities</h2>',
      '<p>The Chief, Facilities Engineering, keeps the replacement schedule and approves deferrals. Shift maintenance supervisors assign the work and countersign the log. Contract staff record each change on Form FE-12 before leaving the plant room.</p>',
      '<h2 id="procedures">Procedures</h2>',
      '<ol><li>Isolate the unit at the local panel and tag the isolator.</li><li>Record the differential pressure reading before removal.</li><li>Remove, bag and label the spent media with unit number and date.</li><li>Fit replacement media from current stock; record the lot number.</li><li>Restore the unit, record the new reading and remove the tag.</li></ol>',
      '<h2 id="references">References</h2>',
      `<p>(a) ${xref('OSC-DIR-0198', '/directives/dir-0198')}, Plant Room Access. (b) Form FE-12, Filter Change Log. (c) ${xref('OSC-DIR-0305', '/directives/dir-0305')}, Controlled Waste Handling.</p>`,
      '<h2 id="supersession">Supersession</h2>',
      '<p>This directive supersedes OSC-DIR-0391, Revision 2. Logs kept under the superseded directive are retained for two years.</p>',
    ].join(''),
    redactions: [dirRx.info],
    headings: DIR_HEADINGS,
    supersedes: 'OSC-DIR-0391',
    xrefs: [
      { docNo: 'OSC-DIR-0391', route: '/directives/dir-0391', title: 'Filter Media Replacement (superseded)' },
      { docNo: 'OSC-DIR-0198', route: '/directives/dir-0198', title: 'Plant Room Access' },
      { docNo: 'OSC-DIR-0305', route: '/directives/dir-0305', title: 'Controlled Waste Handling' },
    ],
    distribution: ['Chief, Facilities Engineering, ALPHA sites', 'Shift maintenance supervisors', 'Contract maintenance site leads'],
    frontmatter: {
      effective: '2008-05-01',
      opr: 'FE/ALPHA-03',
      category: 'Facilities and Plant',
      approvedBy: { name: 'Thomas R. Vell', title: 'Chief, Facilities Engineering' },
      revisions: [
        { rev: '1', date: '2006-02-14', change: 'Initial issue.', by: 'FE/ALPHA-03' },
        { rev: '2', date: '2007-06-30', change: 'Pressure thresholds added for secondary banks.', by: 'FE/ALPHA-03' },
        { rev: '3', date: '2008-04-28', change: 'Sealed-condition deferral rule; controlled waste reference.', by: 'FE/ALPHA-03' },
      ],
    },
  },
);

/* ---------------- cable: lost badge ---------------- */
const cblRx = rx('c1', 14, 'OIA', 'OIA-08-114');
export const SAMPLE_CABLE = doc(
  {
    id: 'cable',
    template: 'cable',
    docNo: 'OSC-CBL-08-0533',
    title: 'Loss of access badge, operator 3-0862',
    marking: 'UMBRA-R',
    originator: 'SECURITY OFFICE ALPHA-03',
    revision: 1,
    date: '2008-05-12',
    summary: 'Badge 03-11406 reported lost and revoked; temporary badge issued.',
  },
  {
    html: [
      '<p>At 0940Z (0540 EDT) 12 May 08 operator 3-0862, Records Division, reported loss of access badge serial 03-11406. Operator states badge was in jacket pocket at end of previous shift.</p>',
      '<p>Badge last used at turnstile L4-02 at 2251Z (1851 EDT) 11 May 08. No use recorded after that time.</p>',
      '<p>Badge 03-11406 revoked 0952Z (0552 EDT). Temporary badge issued, valid 14 days.</p>',
      '<p>Level 4 locker area and cafeteria searched with negative result. Cafeteria lost property bin to be checked at each shift change until 19 May 08.</p>',
      `<p>Operator reminded of requirement at ref A. No further action proposed by this office. ${cblRx.span} advised IAW ref B.</p>`,
    ].join(''),
    redactions: [cblRx.info],
    xrefs: [
      { docNo: 'OSC-DIR-0233', route: '/directives/dir-0233', title: 'Cover Facility Access Control' },
      { docNo: 'OSC-DIR-0240', route: '/directives/dir-0240', title: 'Credential Loss Reporting' },
    ],
    frontmatter: {
      precedence: 'ROUTINE',
      time: '1430',
      serial: '08-0533',
      fm: 'Security Office ALPHA-03',
      to: ['Records Division ALPHA-03'],
      info: ['Badge and Credential Section ALPHA-03'],
      refs: ['OSC-DIR-0240, Credential Loss Reporting', 'OSC-DIR-0233, Cover Facility Access Control'],
    },
  },
);

/* ---------------- minutes ---------------- */
export const SAMPLE_MINUTES = doc(
  {
    id: 'minutes',
    template: 'minutes',
    docNo: 'OSC-MIN-08-0019',
    title: 'Site Services Working Group, Meeting 08-05',
    marking: 'UMBRA-U',
    originator: 'SSB/ALPHA-03',
    revision: 1,
    date: '2008-05-15',
    summary: 'Cafeteria rotation, Lot B permits, elevator 3 outage.',
  },
  {
    html: [
      '<h2 id="item-1">Cafeteria rotation</h2>',
      '<p>The contractor proposed moving the hot meal service on Level 2 from three sittings to four from 2 JUN 2008 to relieve queuing at the 1200 sitting. Records Division asked that the 2200 rotation keep a hot meal. The proposal was accepted on that condition.</p>',
      '<h2 id="item-2">Surface Lot B permits</h2>',
      '<p>Site Support reported that 41 shared-permit applications had been received. Several divisions raised the withdrawal of rows F and G. The Chair noted that the resurfacing date is set by the cover facility contractor and is not within the group’s control.</p>',
      '<h2 id="item-3">Elevator 3 outage</h2>',
      '<p>Elevator 3 remains out of service pending a replacement drive controller. Operators with mobility restrictions are to contact Site Support for an escorted transfer by Elevator 1.</p>',
    ].join(''),
    headings: [
      { id: 'item-1', text: 'Cafeteria rotation', depth: 2 },
      { id: 'item-2', text: 'Surface Lot B permits', depth: 2 },
      { id: 'item-3', text: 'Elevator 3 outage', depth: 2 },
    ],
    distribution: ['Working group members', 'Division administrative officers, ALPHA-03'],
    frontmatter: {
      meeting: 'Site Services Working Group',
      convened: '1400Z (1000 EDT)',
      adjourned: '1452Z (1052 EDT)',
      location: 'Conference Room 2-114',
      chair: 'Chief, Site Support Branch',
      recorder: 'L. Pruitt, SSB',
      attendees: [
        { name: 'R. Hale', office: 'Site Support Branch (Chair)', status: 'Present' },
        { name: 'L. Pruitt', office: 'Site Support Branch (Recorder)', status: 'Present' },
        { name: 'J. Harrow', office: 'Records Division', status: 'Present' },
        { name: 'S. Imrie', office: 'Facilities Engineering', status: 'Present' },
        { name: 'K. Danvers', office: 'Occupational Health', status: 'Excused' },
        { name: 'Contractor representative', office: 'Food service', status: 'Present' },
      ],
      agenda: ['Cafeteria rotation', 'Surface Lot B permits', 'Elevator 3 outage'],
      actions: [
        { no: '08-05-01', action: 'Publish four-sitting meal schedule, including 2200 rotation hot meal.', owner: 'Food service contractor', suspense: '2008-05-28', status: 'Open' },
        { no: '08-05-02', action: 'Confirm resurfacing dates for Lot B rows F and G.', owner: 'SSB', suspense: '2008-05-23', status: 'Open' },
        { no: '08-05-03', action: 'Report delivery date for Elevator 3 drive controller.', owner: 'FE', suspense: '2008-05-22', status: 'Open' },
      ],
      nextMeeting: '12 JUN 2008, 1400Z (1000 EDT), Conference Room 2-114',
    },
  },
);

/* ---------------- ledger ---------------- */
export const SAMPLE_LEDGER = doc(
  {
    id: 'ledger',
    template: 'ledger',
    docNo: 'OSC-LGR-08-0112',
    title: 'Consumables Issue Ledger, Records Division, April 2008',
    marking: 'UMBRA-U',
    originator: 'RD/ALPHA-03',
    revision: 1,
    date: '2008-05-02',
    summary: 'Monthly consumables issue and receipt for Records Division.',
  },
  {
    html: [
      '<table><thead><tr><th>Item</th><th>Stock No.</th><th>Opening</th><th>Received</th><th>Issued</th><th>Closing</th></tr></thead><tbody>',
      '<tr><td>Toner cartridge, LP-4 printer</td><td>7510-0441</td><td>18</td><td>12</td><td>14</td><td>16</td></tr>',
      '<tr><td>Archive box, acid-free, letter</td><td>7530-1180</td><td>240</td><td>0</td><td>65</td><td>175</td></tr>',
      '<tr><td>Destruction bag, 20 lb</td><td>8105-0072</td><td>60</td><td>100</td><td>88</td><td>72</td></tr>',
      '<tr><td>Cover sheet pad, UMBRA-R</td><td>7530-2216</td><td>9</td><td>10</td><td>11</td><td>8</td></tr>',
      '<tr><td>Badge holder, clear</td><td>8455-0310</td><td>35</td><td>0</td><td>4</td><td>31</td></tr>',
      '<tr><td>Total</td><td></td><td>362</td><td>122</td><td>182</td><td>302</td></tr>',
      '</tbody></table>',
    ].join(''),
    frontmatter: {
      fields: [
        { label: 'Account', value: 'RD-A03-OPS-114', mono: true },
        { label: 'Period', value: '01 APR 2008 to 30 APR 2008' },
        { label: 'Custodian', value: 'J. Harrow, Records Division' },
        { label: 'Store', value: 'Level 4 supply room 4-021' },
      ],
      certification: 'Counts verified against store cards on 01 MAY 2008. Discrepancies: none.',
    },
  },
);

/* ---------------- dossier ---------------- */
export const SAMPLE_DOSSIER = doc(
  {
    id: 'dossier',
    template: 'dossier',
    docNo: 'OSC-EQP-A03-0007',
    title: 'Standby Generator Set 2, Cover Facility',
    marking: 'UMBRA-U',
    originator: 'FE/ALPHA-03',
    revision: 4,
    date: '2008-03-19',
    summary: 'Equipment dossier for standby generator set 2 at the cover facility.',
  },
  {
    html: '<p>Set 2 carries the cover facility office load during loss of utility supply. It has no connection to plant below the surface level.</p><p>Monthly load test is run on the second Tuesday. The March test was postponed one week because the fuel delivery was late.</p>',
    frontmatter: {
      dossierType: 'EQUIPMENT DOSSIER',
      identity: [
        { label: 'Asset', value: 'A03-GEN-S2', mono: true },
        { label: 'Location', value: 'Cover facility, plant yard' },
        { label: 'Rating', value: '350 kW standby' },
        { label: 'Installed', value: 'NOV 2003' },
        { label: 'Last test', value: '18 MAR 2008' },
        { label: 'Status', value: 'In service' },
      ],
    },
  },
);

/* ---------------- form ---------------- */
export const SAMPLE_FORM = doc(
  {
    id: 'form',
    template: 'form',
    docNo: 'OSC-FRM-027',
    title: 'Request for Replacement Access Badge',
    marking: 'UMBRA-R',
    originator: 'BCS/ALPHA-03',
    revision: 2,
    date: '2008-05-12',
    summary: 'Completed replacement badge request.',
  },
  {
    html: '<p><strong>Instructions.</strong> Complete blocks 1 through 8. A replacement badge is not issued until the loss has been reported to the Security Office and a report number entered in block 6. Temporary badges expire after 14 days and are not renewed.</p>',
    frontmatter: {
      formNo: '27',
      edition: '03-2006',
      blocks: [
        { no: '1', label: 'Operator ID', value: '3-0862' },
        { no: '2', label: 'Division', value: 'Records Division' },
        { no: '3', label: 'Site', value: 'ALPHA-03' },
        { no: '4', label: 'Badge serial lost', value: '03-11406' },
        { no: '5', label: 'Date of loss', value: '12 MAY 2008' },
        { no: '6', label: 'Security report no.', value: 'OSC-CBL-08-0533' },
        { no: '7', label: 'Circumstances', value: 'Badge believed left in jacket pocket at end of shift. Not recovered.', wide: 'true' },
        { no: '8', label: 'Operator signature and date', value: 'Signed 12 MAY 2008', wide: 'true' },
      ],
    },
  },
);

/* ---------------- message ---------------- */
export const SAMPLE_MESSAGE = doc(
  {
    id: 'message',
    template: 'message',
    docNo: 'MSG-A03-08-22714',
    title: 'Temporary badge expiry',
    marking: 'UMBRA-U',
    originator: 'BCS/ALPHA-03',
    revision: 1,
    date: '2008-05-13',
    summary: 'Reminder of temporary badge expiry date.',
  },
  {
    html: '<p>Your temporary badge T-0419 expires at 2359 local on 26 MAY 2008.</p><p>If your replacement badge has not been issued by 23 MAY 2008, report to the Badge and Credential Section, Level 1, between 0800 and 1100 local. Bring the temporary badge with you. Do not reply to this message.</p><p>Badge and Credential Section<br/>ALPHA-03</p>',
    frontmatter: {
      from: 'Badge and Credential Section <bcs@a03.ss.mer>',
      to: ['Operator 3-0862'],
      sent: '13 MAY 2008 0812Z (0412 EDT)',
      precedence: 'Routine',
      receipt: 'Read receipt requested by sender.',
    },
  },
);

/* ---------------- help ---------------- */
export const SAMPLE_HELP = doc(
  {
    id: 'help',
    template: 'help',
    docNo: 'KB-0042',
    title: 'Printing a document with its cover sheet',
    marking: 'UMBRA-U',
    originator: 'HELP DESK/ALPHA-01',
    revision: 5,
    date: '2008-02-11',
    summary: 'How to print a document from Records with the required cover sheet.',
  },
  {
    html: [
      '<h2 id="summary">Summary</h2><p>Every document printed from MERIDIAN prints with a cover sheet and its distribution stamp. The cover sheet cannot be suppressed.</p>',
      '<h2 id="steps">Steps</h2><ol><li>Open the document in Records Library.</li><li>Choose <strong>File &gt; Print</strong> or press <kbd>Ctrl</kbd>+<kbd>P</kbd>.</li><li>Confirm the printer shown is an approved printer for the document’s marking. Unapproved printers are not listed.</li><li>Collect the printout at once. Uncollected printouts are removed and logged after 15 minutes.</li></ol>',
      '<h2 id="notes">Notes</h2><p>Each print is recorded in the audit trail with the document number and printer. Printed copies are uncontrolled; destroy them through Records Division when no longer needed.</p>',
    ].join(''),
    headings: [
      { id: 'summary', text: 'Summary', depth: 2 },
      { id: 'steps', text: 'Steps', depth: 2 },
      { id: 'notes', text: 'Notes', depth: 2 },
    ],
    frontmatter: { kbNo: 'KB-0042', appliesTo: 'MERIDIAN 4.1.x, Records Library', audience: 'All operators', reviewed: '2008-02-11' },
  },
);

/* ---------------- record ---------------- */
export const SAMPLE_RECORD = doc(
  {
    id: 'record',
    template: 'record',
    docNo: 'OSC-KEY-A03-08-0311',
    title: 'Key Control Register, Plant Room 4-B',
    marking: 'UMBRA-R',
    originator: 'FE/ALPHA-03',
    revision: 1,
    date: '2008-05-20',
    summary: 'Key issue record for plant room 4-B.',
  },
  {
    html: '<table><thead><tr><th>Date</th><th>Key</th><th>Issued to</th><th>Out</th><th>In</th></tr></thead><tbody><tr><td>19 MAY 2008</td><td>4B-01</td><td>S. Imrie</td><td>0712</td><td>0948</td></tr><tr><td>19 MAY 2008</td><td>4B-02</td><td>Contract staff (escorted)</td><td>1030</td><td>1155</td></tr><tr><td>20 MAY 2008</td><td>4B-01</td><td>S. Imrie</td><td>0705</td><td>0731</td></tr></tbody></table>',
    frontmatter: {
      recordType: 'REGISTER EXTRACT',
      fields: [
        { label: 'Register', value: 'FE-KCR-4B', mono: true },
        { label: 'Keyholder', value: 'Shift maintenance supervisor' },
        { label: 'Times', value: 'Local (EDT)' },
      ],
    },
  },
);

/* ---------------- charter ---------------- */
export const SAMPLE_CHARTER = doc(
  {
    id: 'charter',
    template: 'charter',
    docNo: 'OSC-CHR-VII',
    title: 'Amendment',
    marking: 'UMBRA-C',
    originator: 'COUNCIL SECRETARIAT',
    revision: 1,
    date: '2001-10-02',
    summary: 'Charter Article VII: procedure for amendment.',
  },
  {
    html: '<p>This Charter may be amended only by resolution of the Council, adopted by not less than two-thirds of the seats then filled, at a meeting of which notice of the proposed amendment has been given to every seat not less than thirty days in advance.</p><p>No amendment shall shorten the term of a seat then held, nor alter the obligations of the Office toward those persons already designated for its protection.</p><p>Each amendment shall be entered in the Council record, numbered in sequence, and attached to every controlled copy of this Charter.</p>',
    frontmatter: { article: 'ARTICLE VII' },
  },
);

/* ---------------- scan ---------------- */
export const SAMPLE_SCAN = doc(
  {
    id: 'scan',
    template: 'scan',
    docNo: 'OSC-SCN-A03-08-0091',
    title: 'Visitor Escort Log, Sheet 14',
    marking: 'UMBRA-R',
    originator: 'GATE OFFICE/ALPHA-03',
    revision: 1,
    date: '2008-04-30',
    summary: 'Scanned visitor escort log sheet.',
  },
  {
    html: '<p>VISITOR ESCORT LOG &nbsp; SHEET 14 &nbsp; COVER FACILITY RECEPTION</p><table><thead><tr><th>Date</th><th>Visitor</th><th>Company</th><th>Escort</th><th>In</th><th>Out</th></tr></thead><tbody><tr><td>28 APR</td><td>Elevator technician</td><td>Contract</td><td>3-0417</td><td>0810</td><td>1540</td></tr><tr><td>29 APR</td><td>Elevator technician</td><td>Contract</td><td>3-0417</td><td>0805</td><td>1612</td></tr><tr><td>30 APR</td><td>Fuel delivery driver</td><td>Contract</td><td>3-0233</td><td>1102</td><td>1131</td></tr></tbody></table><p>Sheet checked and closed.</p>',
    frontmatter: { seed: 7, rotate: -0.6, scanNote: 'Scanned image of a paper original held by the Gate Office, ALPHA-03.' },
  },
);

/* ---------------- index ---------------- */
const ALL = [SAMPLE_MEMO, SAMPLE_DIRECTIVE, SAMPLE_CABLE, SAMPLE_MINUTES, SAMPLE_LEDGER, SAMPLE_DOSSIER, SAMPLE_FORM, SAMPLE_MESSAGE, SAMPLE_HELP, SAMPLE_RECORD, SAMPLE_CHARTER, SAMPLE_SCAN];

export const SAMPLE_INDEX = doc(
  {
    id: 'index',
    template: 'index',
    docNo: 'OSC-IDX-HD-0003',
    title: 'Document Formats: Specimen Pages',
    marking: 'UMBRA-U',
    originator: 'HELP DESK/ALPHA-01',
    revision: 2,
    date: '2008-03-03',
    summary: 'Index of specimen pages for each MERIDIAN document format.',
  },
  {
    html: '<p>The pages listed below show each document format used in MERIDIAN. They are specimens: the content is representative and is not to be cited.</p>',
    frontmatter: {
      entries: ALL.map((d) => ({ docNo: d.docNo, title: d.title, route: d.route, date: d.date, marking: d.marking })),
    },
  },
);

export const SAMPLE_DOCS: Record<Template, DocJson> = {
  memo: SAMPLE_MEMO,
  directive: SAMPLE_DIRECTIVE,
  cable: SAMPLE_CABLE,
  minutes: SAMPLE_MINUTES,
  ledger: SAMPLE_LEDGER,
  dossier: SAMPLE_DOSSIER,
  form: SAMPLE_FORM,
  message: SAMPLE_MESSAGE,
  help: SAMPLE_HELP,
  record: SAMPLE_RECORD,
  charter: SAMPLE_CHARTER,
  scan: SAMPLE_SCAN,
  index: SAMPLE_INDEX,
};
