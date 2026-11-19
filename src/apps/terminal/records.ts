/**
 * Host-side records for the terminal: manual entries, help text, and the
 * division lookup registers (work orders, accessions) that the records host
 * answers from. Figures shown alongside these come from canon at run time.
 */

/** Host identity. The workstation is the visitor's accredited seat (docs/NARRATIVE.md §0). */
export const HOST = 'A03RD1';
export const HOST_TITLE = 'MERIDIAN RECORDS HOST';
export const WORKSTATION = 'A03-5-114';
export const PROMPT = `${HOST}> `;

export interface HelpLine {
  cmd: string;
  text: string;
}

/** Commands listed by HELP (KB-0026 plus the session controls). Division utilities are not listed (OSC-DIR-0301 para 7). */
export const HELP_LINES: HelpLine[] = [
  { cmd: 'help', text: 'This list' },
  { cmd: 'whoami', text: 'Operator, tier, compartments, workstation' },
  { cmd: 'sites', text: 'Facility list' },
  { cmd: 'site <id>', text: 'Facility status (site ALPHA-03)' },
  { cmd: 'rail status', text: 'Inter-hub rail segment status' },
  { cmd: 'find <term>', text: 'Search the MERIDIAN index' },
  { cmd: 'lookup <docno>', text: 'Register entry for a document' },
  { cmd: 'open <docno>', text: 'Display a document in its application' },
  { cmd: 'mail', text: 'Message Traffic summary' },
  { cmd: 'audit tail [n]', text: 'Last n entries of your audit trail' },
  { cmd: 'clearance', text: 'Access determination' },
  { cmd: 'date', text: 'Host date and time' },
  { cmd: 'history', text: 'Commands entered this session' },
  { cmd: 'clear', text: 'Clear the screen' },
  { cmd: 'man <cmd>', text: 'Manual entry for a command' },
  { cmd: 'logout', text: 'End the host session' },
];

/** Command words offered by tab completion: the documented set only. */
export const DOCUMENTED = [
  'help', 'whoami', 'sites', 'site', 'rail', 'find', 'lookup', 'open', 'mail', 'audit', 'clearance', 'date', 'history', 'clear', 'man', 'logout',
] as const;

/** Division utilities answered by the host but not listed by HELP or MAN. */
export const DIVISION_UTILITIES = ['wo', 'trace', 'strength', 'consist', 'copies'] as const;

export const MAN: Record<string, string[]> = {
  help: ['HELP', '  Lists the commands available to this operator.', '  Reference KB-0026.'],
  whoami: ['WHOAMI', '  Prints the operator identity, effective tier, compartments held,', '  site, workstation and probation day.'],
  sites: ['SITES', '  Lists the facilities on the MERIDIAN register with class, designation,', '  posted staff and surge berthing. Long output is paged.'],
  site: [
    'SITE <id>',
    '  Facility status for one site. Accepts ALPHA-03, A03 or ALPHA 3.',
    '  Location and connection lines beyond the operator\'s site and its',
    '  adjacent sites are withheld without the network geography briefing.',
  ],
  rail: ['RAIL STATUS', '  Status of the six inter-hub rail segments: endpoints, engineering', '  mileage, running time and service status. Reference OSC-TRN-ENG.'],
  find: ['FIND <term>', '  Searches the MERIDIAN index. Results withheld from this operator are', '  counted but not listed. Queries are retained with the audit trail.'],
  lookup: ['LOOKUP <docno>', '  Prints the register entry for a document: title, marking, originator,', '  revision, date and access requirement. Does not display the document.'],
  open: ['OPEN <docno>', '  Displays a document in the application that owns it. A route', '  (/directives/dir-0412) is also accepted. Access is determined on display.'],
  mail: ['MAIL', '  Prints the number of unread messages.', 'MAIL OPEN', '  Starts Message Traffic.'],
  audit: ['AUDIT TAIL [n]', '  Prints the last n entries (default 10, maximum 50) of the audit trail', '  for this operator. Reference OSC-DIR-0412 para 8.'],
  clearance: [
    'CLEARANCE',
    '  Prints the access determination for this operator.',
    'CLEARANCE REQUEST <compartment>',
    '  Compartment access is requested on OSC-F-126. Reference OSC-DIR-0412.',
  ],
  date: ['DATE', '  Host date, Zulu time and site-local time.'],
  history: ['HISTORY', '  Lists the commands entered this session. Up and Down recall them.'],
  clear: ['CLEAR', '  Clears the screen. Ctrl+L does the same.'],
  man: ['MAN <cmd>', '  Prints the manual entry for a command.'],
  logout: ['LOGOUT', '  Ends the host session. The workstation session is not affected.'],
};

/* ------------------------------------------------------------ work orders */

export interface WorkOrder {
  no: string;
  title: string;
  location: string;
  status: 'OPEN' | 'CLOSED';
  raisedBy: string;
  closed?: string;
  /** Reactor id whose canon status note is printed as the plant note. */
  reactor?: string;
  constraint?: string;
  distribution: string[];
  /** Holders of this order's distribution are read into this compartment (DIR-0412 para 4(e)). */
  readsInto?: 'TALLOW';
}

export const WORK_ORDERS: WorkOrder[] = [
  {
    no: 'FE-08-0417',
    title: 'Main feedwater pump B: replacement seal kit',
    location: 'ALPHA-03, reactor plant',
    status: 'OPEN',
    raisedBy: 'FE/ALPHA-03',
    reactor: 'RX-A03',
    constraint: 'Essential bus loads held at present level until close-out, including cold room 2 (Level 8).',
    distribution: ['FE/ALPHA-03', 'LR/ALPHA-03', 'LR/ALPHA-01', 'RD/ALPHA-03 Cold Storage'],
    readsInto: 'TALLOW',
  },
  {
    no: 'FE-07-0233',
    title: 'Level 5 corridor lighting: replace ballasts, bays 5-110 to 5-128',
    location: 'ALPHA-03, Level 5',
    status: 'CLOSED',
    raisedBy: 'FE/ALPHA-03',
    closed: '14 NOV 2007',
    distribution: ['FE/ALPHA-03'],
  },
  {
    no: 'LR-08-0102',
    title: 'Dining hall dishwasher: rinse booster heater element',
    location: 'ALPHA-03, Level 3',
    status: 'CLOSED',
    raisedBy: 'LR/ALPHA-03',
    closed: '09 APR 2008',
    distribution: ['LR/ALPHA-03', 'FE/ALPHA-03'],
  },
];

/* -------------------------------------------------------------- accessions */

/** The Stacks C processing queue named in the tasking (RD-ACC-08-00398 to 00415). */
export const ACCESSION_FIRST = 398;
export const ACCESSION_LAST = 415;
export const ACCESSION_HELD = 412;

export interface CustodyHop {
  date: string;
  from: string;
  to: string;
  receipt: string;
}

export interface Accession {
  no: string;
  description: string;
  hops: CustodyHop[];
  status: string;
}

const MUNDANE: { origin: string; desc: string }[] = [
  { origin: 'FE/ALPHA-03 Drawing Office', desc: 'Superseded HVAC drawings, AHU-1 to AHU-6' },
  { origin: 'MS/ALPHA-03 Clinic', desc: 'Closed visit registers, calendar 2005' },
  { origin: 'LR/ALPHA-03 Stores', desc: 'Issue vouchers, FY2006' },
  { origin: 'RD/ALPHA-03 Reading Room', desc: 'Sign-in ledgers, 2006' },
  { origin: 'SFC/ALPHA-03 Portal Security', desc: 'Visitor escort logs, 2005 to 2006' },
  { origin: 'PV/ALPHA-03 Personnel Office', desc: 'Training attendance sheets, 2006' },
  { origin: 'FE/ALPHA-03 Plant Office', desc: 'Generator test records, 2005' },
  { origin: 'LR/ALPHA-03 Food Service', desc: 'Menu cycles and supplier dockets, 2006' },
  { origin: 'CMS/ALPHA-03 Message Centre', desc: 'Routine traffic logs, superseded, 2005' },
];

const RECEIVED_DAYS = ['18 MAR 2008', '19 MAR 2008', '21 MAR 2008', '24 MAR 2008', '26 MAR 2008', '31 MAR 2008', '02 APR 2008', '07 APR 2008', '11 APR 2008'];

export function accessionNo(n: number): string {
  return `RD-ACC-08-${String(n).padStart(5, '0')}`;
}

/** Custody record for a Stacks C accession, or null when the host holds none. */
export function accession(n: number): Accession | null {
  if (n < ACCESSION_FIRST || n > ACCESSION_LAST) return null;
  const no = accessionNo(n);
  if (n === ACCESSION_HELD) {
    return {
      no,
      description: 'Superseded registry media (consignment)',
      hops: [
        { date: '', from: '', to: 'Consignment, superseded registry media', receipt: '' },
        { date: '24 MAR 2008', from: 'Consignment', to: 'RD/ALPHA-03 Stacks C', receipt: 'CR-08-0412' },
      ],
      status: 'HELD (OIA-08-031). Do not process.',
    };
  }
  const i = n - ACCESSION_FIRST;
  const m = MUNDANE[i % MUNDANE.length]!;
  const day = RECEIVED_DAYS[i % RECEIVED_DAYS.length]!;
  return {
    no,
    description: m.desc,
    hops: [
      { date: day, from: m.origin, to: 'RD/ALPHA-03 Accessions counter', receipt: `CR-08-${String(n).padStart(4, '0')}` },
      { date: day, from: 'RD/ALPHA-03 Accessions counter', to: 'RD/ALPHA-03 Stacks C', receipt: 'Internal' },
    ],
    status: 'Queued for review, Accessions & Review Branch.',
  };
}
