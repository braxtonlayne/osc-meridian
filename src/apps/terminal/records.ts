/**
 * Host-side records for the terminal: manual entries, help text, and the
 * division lookup registers (work orders, accessions) that the records host
 * answers from. Figures shown alongside these come from canon at run time.
 */

import { workstationId } from '@core/audit';
import { activeDef } from '@core/accounts';

/**
 * A Tier 4 credential is connected to its own site's host, never to the ALPHA-03 records host
 * (closed world, SPEC-2 §1): the host name is the workstation's site prefix (G08-3-002 -> G08SV1).
 */
const closed = activeDef.peek().tier === 4;

/** Host identity. The workstation is the active credential's own seat (canon accounts[].workstation). */
export const HOST = closed ? `${activeDef.peek().workstation.slice(0, 3)}SV1` : 'A03RD1';
export const HOST_TITLE = closed ? 'MERIDIAN SITE HOST' : 'MERIDIAN RECORDS HOST';
export const workstation = (): string => workstationId();
export const PROMPT = `${HOST}> `;

export interface HelpLine {
  cmd: string;
  text: string;
}

/** Commands listed by HELP (KB-0026 plus the session controls). Division utilities are not listed (OSC-DIR-0301 para 7). */
export const HELP_LINES: HelpLine[] = [
  { cmd: 'help', text: 'This list' },
  { cmd: 'whoami', text: 'Operator, tier, compartments, workstation' },
  { cmd: 'accounts', text: 'Credentials issued on this workstation' },
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
  'help', 'whoami', 'accounts', 'sites', 'site', 'rail', 'find', 'lookup', 'open', 'mail', 'audit', 'clearance', 'date', 'history', 'clear', 'man', 'logout',
] as const;

/** Division utilities answered by the host but not listed by HELP or MAN. */
export const DIVISION_UTILITIES = ['wo', 'trace', 'strength', 'consist', 'copies'] as const;

export const MAN: Record<string, string[]> = {
  help: ['HELP', '  Lists the commands available to this operator.', '  Reference KB-0026.'],
  whoami: ['WHOAMI', '  Prints the operator identity, effective tier, compartments held,', '  site, workstation and probation day.'],
  accounts: [
    'ACCOUNTS',
    '  Lists the operator credentials issued on this workstation: operator id,',
    '  post, tier and site. The credential in use is marked *. Credentials are',
    '  presented at the lock screen (Directory > Log off, then choose the card).',
  ],
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
  audit: [
    'AUDIT TAIL [n]',
    '  Prints the last n entries (default 10, maximum 50) of the audit trail',
    '  for this operator. Reference OSC-DIR-0412 para 8.',
    'AUDIT TAIL [n] --operator <id>',
    '  Office of Internal Assurance auditors only: the trail of another',
    '  operator on this workstation (operator id or credential), read-only.',
  ],
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

/**
 * Stacks C queue as tabled in the tasking message (msg-08-04470), which is
 * authoritative: received date, sending office and description per accession.
 * 00412 (held) is built separately below.
 */
const QUEUE: Record<number, { received: string; origin: string; desc: string; status?: string }> = {
  398: { received: '03 MAR 2008', origin: 'FE/ALPHA-03', desc: 'Work order files, FY06 (closed), 2 boxes' },
  399: { received: '05 MAR 2008', origin: 'MS/ALPHA-03', desc: 'Clinic appointment registers, 2006, 1 box' },
  400: { received: '05 MAR 2008', origin: 'LR/ALPHA-03', desc: 'Ration rotation returns, FY07, 3 boxes' },
  401: { received: '11 MAR 2008', origin: 'CMD/ALPHA-03', desc: 'Command Section routine correspondence, 2006, 4 boxes' },
  402: { received: '11 MAR 2008', origin: 'PV/ALPHA-01', desc: 'Leave cards, ALPHA-03 personnel, 2005 to 2006, 1 box' },
  403: { received: '14 MAR 2008', origin: 'CMS/ALPHA-02', desc: 'Superseded workstation accreditation certificates, 1 folder' },
  404: { received: '14 MAR 2008', origin: 'FE/ALPHA-03', desc: 'Air handling maintenance logs, 2007, 2 binders' },
  405: { received: '18 MAR 2008', origin: 'SFC/ALPHA-03', desc: 'Superseded access rosters, JUL to DEC 2007, 1 box', status: 'DESTROYED 14 MAY 2008 (certificate to file).' },
  406: { received: '18 MAR 2008', origin: 'RD/ALPHA-03', desc: 'Seed collection accession cards, 2005 duplicates, 1 tray' },
  407: { received: '20 MAR 2008', origin: 'LR/ALPHA-05', desc: 'Food service cycle menus and supplier substitutions, FY07, 1 box' },
  408: { received: '20 MAR 2008', origin: 'MS/ALPHA-05', desc: 'Medical readiness records, personnel transferred to ALPHA-03, 1 box' },
  409: { received: '21 MAR 2008', origin: 'FE/ALPHA-02', desc: 'Drawing register supplement, Levels 0 to 5, 1 binder' },
  410: { received: '24 MAR 2008', origin: 'PV/ALPHA-01', desc: 'Pay and strength returns, ALPHA-03, FY05, 2 boxes' },
  411: { received: '24 MAR 2008', origin: 'PV/ALPHA-01', desc: 'Pay and strength returns, ALPHA-03, FY06, 2 boxes' },
  413: { received: '02 APR 2008', origin: 'RD/ALPHA-03', desc: 'Reading room request slips, JAN to MAR 2008, 1 box' },
  414: { received: '15 APR 2008', origin: 'LR/ALPHA-03', desc: 'Dining hall stores issue vouchers, Q2 FY08, 1 box' },
  415: { received: '28 APR 2008', origin: 'FE/ALPHA-03', desc: 'Filter change records, AHU-07 to AHU-12, 2007, 1 binder' },
};

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
      description: 'Superseded registry media, 1 carton',
      hops: [
        { date: '', from: '', to: 'Consignment, superseded registry media', receipt: '' },
        { date: '24 MAR 2008', from: 'Consignment', to: 'RD/ALPHA-03 Stacks C', receipt: 'CR-08-0412' },
      ],
      status: 'HELD (OIA-08-031). Do not process.',
    };
  }
  const q = QUEUE[n];
  if (!q) return null;
  return {
    no,
    description: q.desc,
    hops: [
      { date: q.received, from: q.origin, to: 'RD/ALPHA-03 Accessions counter', receipt: `CR-08-${String(n).padStart(4, '0')}` },
      { date: q.received, from: 'RD/ALPHA-03 Accessions counter', to: 'RD/ALPHA-03 Stacks C', receipt: 'Internal' },
    ],
    status: q.status ?? 'Queued for review, Accessions & Review Branch.',
  };
}
