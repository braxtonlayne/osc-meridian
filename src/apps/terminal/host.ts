/**
 * The records host behind the Terminal: a pure command interpreter.
 *
 * `run(line, ctx)` returns the lines to print and a list of effects for the app
 * to carry out (open a window, grant a compartment, deliver mail, clear the
 * screen...). Nothing here touches the DOM, the shell or the clock: every input
 * arrives in `HostContext`, so the whole host is unit-tested.
 *
 * Every figure printed comes from canon or from the route register.
 *
 * Narrative consequences (compartment grants, flags, OIA mail) are not issued
 * here: the app logs every command line as a `terminal.cmd` audit entry and the
 * narrative engine (src/narrative) reacts to it. The host only prints what the
 * operator's state already supports, so its output agrees with the engine.
 */
import type { AccountDef, AccountId, AppId, AuditEntry, RouteEntry } from '@core/contracts';
import type { Canon, Facility, FacilityId, MarkingId, TierNo } from '@core/canon-types';
import { readableByTier4 } from '@core/docs';
import { hasRx, isRx, rxPlain } from '@core/rx';
import { formatInWorldDate, siteLocal } from '@core/session';
import { activeDef, allAccounts } from '@core/accounts';
import {
  ACCESSION_HELD,
  DIVISION_UTILITIES,
  DOCUMENTED,
  HELP_LINES,
  HOST,
  MAN,
  WORK_ORDERS,
  workstation,
  accession,
  accessionNo,
} from './records';

/* ----------------------------------------------------------------- types */

export interface HostContext {
  canon: Canon;
  now: Date;
  /** Terminal width in columns (for wrapping). */
  cols: number;
  operatorId: string;
  tier: TierNo;
  acting: boolean;
  compartments: readonly string[];
  flags: Readonly<Record<string, boolean>>;
  probationDay: number;
  probationLength: number;
  /** Commands entered this host session, oldest first (excluding the current one). */
  history: readonly string[];
  audit: readonly AuditEntry[];
  unread: number;
  routes: readonly RouteEntry[];
  satisfies(key: string): boolean;
  /** services.mail.isHeld: false for a message document not yet delivered. Omitted: everything is held. */
  isHeld?(docNoOrRoute: string): boolean;
  /**
   * Table rows of a document as loaded with the session's releases (shared/released.ts),
   * keyed by first cell; null cells are still withheld. Released values the client canon
   * carries only as sentinels are read from here. Omitted or not yet loaded: undefined.
   */
  docRows?(docNo: string): ReadonlyMap<string, readonly (string | null)[]> | undefined;
  appTitle(id: AppId): string;
  /** Pass two: the signed-in account (identity for WHOAMI, home site, Tier 4 rule). Omitted: canon.operator. */
  account?: AccountDef;
  /** Pass two: every credential issued on this workstation (ACCOUNTS). */
  accounts?: readonly AccountDef[];
  /** Pass two: ids of messages delivered to this account (Tier 4 may list them). */
  delivered?: readonly string[];
}

type VisCtx = Pick<HostContext, 'routes' | 'isHeld' | 'account' | 'delivered'>;

/** Short-form reference cited by the Tier 4 refusal (as the shell's). */
export const T4_REF = 'DIR-0301';

/** The identity the host answers for: the signed-in account, or the pass-one operator. */
export function identity(ctx: Pick<HostContext, 'canon' | 'account'>): Pick<AccountDef, 'operatorId' | 'pn' | 'displayName' | 'roleTitle' | 'tier' | 'site' | 'divisionId' | 'supervisorPn' | 'probationStart'> {
  if (ctx.account) return ctx.account;
  const op = ctx.canon.operator;
  return { operatorId: op.operatorId, pn: op.pn, displayName: op.displayName, roleTitle: '', tier: op.tier, site: op.site, divisionId: op.divisionId, supervisorPn: op.supervisorPn, probationStart: op.probationStart };
}

/** Division label; facility command posts carry id CMD, which no division has. */
export function divisionLabel(canon: Canon, id: string): string {
  if (id === 'CMD') return 'Facility Command';
  return canon.divisions.find((d) => d.id === id)?.name ?? id;
}

const isTier4 = (ctx: Pick<HostContext, 'account'>): boolean => ctx.account?.tier === 4;

/**
 * Tier 4 rule (docs/SPEC-2.md §1): a Tier 4 account sees a document only if it is marked `t4`,
 * the account has its own variant, it is a message delivered to the account, or it is an
 * application home route. True for every route at other tiers.
 */
export function tier4Visible(r: RouteEntry, ctx: Pick<HostContext, 'account' | 'delivered'>): boolean {
  const a = ctx.account;
  if (!a || a.tier !== 4) return true;
  if (readableByTier4(r) || r.variants?.includes(a.id)) return true;
  if (r.family === 'mail' && (ctx.delivered ?? []).includes(r.id)) return true;
  return r.route === `/${r.app}`;
}

/** Routes the operator may see listed: undelivered messages are not on this operator's register; Tier 4 sees its own small world. */
export function heldRoutes(ctx: VisCtx): readonly RouteEntry[] {
  const held = ctx.isHeld;
  return ctx.routes.filter((r) => (!held || held(r.route)) && tier4Visible(r, ctx));
}

const T4_REFUSAL = (what: string) => `${what}: refused. Requires Tier 3 access determination. Reference ${T4_REF}.`;

export type Effect =
  | { kind: 'open'; route: string }
  | { kind: 'openApp'; app: AppId }
  | { kind: 'clear' }
  | { kind: 'logout' }
  | { kind: 'search'; q: string }
  | { kind: 'consist'; id: string }
  /** Auditor only: read another account's trail (services.account.readAudit) and print the last n. */
  | { kind: 'auditOther'; account: AccountId; operatorId: string; n: number };

export interface HostResult {
  lines: string[];
  effects: Effect[];
  /** Marking of compartmented output (the screen marking rises to it until cleared). */
  marking?: MarkingId;
}

/** Marking applied to output released under a compartment (compartment briefing level). */
export const COMPARTMENT_MARKING: MarkingId = 'UMBRA-C';


/* ------------------------------------------------------------ formatting */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const NF = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const pad2 = (n: number) => String(n).padStart(2, '0');

export const fmtN = (n: number | null | undefined): string => (n === null || n === undefined ? '--' : NF.format(n));

/** In-world host date: the session's fixed in-world date (canon.meta.inWorldDate), "19 MAY 2008". */
export function hostDate(now: Date): string {
  return formatInWorldDate(now);
}
export const zulu = (now: Date): string => `${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}Z`;
/** Host site-local: ALPHA-03 (Eastern Daylight) for the records host; a Tier 4 site host keeps its own site's zone. */
export const local = (now: Date): string =>
  activeDef.peek().tier === 4 ? siteLocal(now) : `${pad2((now.getUTCHours() + 20) % 24)}${pad2(now.getUTCMinutes())} EDT`;
export const stamp = (now: Date): string => `${hostDate(now)} ${zulu(now)} (${local(now)})`;

/** "2004-08" -> "AUG 2004" */
export function monthYear(ym: string | null | undefined): string {
  if (!ym) return '--';
  const m = /^(\d{4})-(\d{2})/.exec(ym);
  return m ? `${MONTHS[Number(m[2]) - 1] ?? '???'} ${m[1]}` : ym;
}

/** Restricted canon strings print as solid bars of their withheld length. */
export const plain = (v: string | null | undefined): string => (v === null || v === undefined ? '--' : rxPlain(v));

const bar = (n: number) => '█'.repeat(Math.max(1, n));

/** A site figure; null is withheld by the client canon (DELTA, Tier 1) and prints as a bar, never 0. */
const fig = (n: number | null): string => (n === null ? bar(4) : fmtN(n));

export function wrap(text: string, width: number): string[] {
  const w = Math.max(16, width);
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if (line.length + 1 + word.length <= w) line += ' ' + word;
      else {
        out.push(line);
        line = word;
      }
      while (line.length > w) {
        out.push(line.slice(0, w));
        line = line.slice(w);
      }
    }
    out.push(line);
  }
  return out;
}

const LABEL_W = 14;
/** "LABEL         value" with the value wrapped under itself. */
export function kv(label: string, value: string, cols: number, labelW = LABEL_W): string[] {
  const lines = wrap(value, cols - labelW - 1);
  return lines.map((l, i) => (i === 0 ? label.toUpperCase().padEnd(labelW) : ' '.repeat(labelW)) + l);
}

const col = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '~' : s.padEnd(n));
const rcol = (s: string, n: number) => s.padStart(n);

/* --------------------------------------------------------------- parsing */

/** Split a command line into words; double quotes group words. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"?|(\S+)/g;
  for (let m = re.exec(line); m; m = re.exec(line)) out.push(m[1] ?? m[2] ?? '');
  return out;
}

export interface Parsed {
  raw: string;
  cmd: string;
  args: string[];
  /** Everything after the command word, as typed. */
  rest: string;
}

export function parse(line: string): Parsed {
  const raw = line.trim();
  const words = tokenize(raw);
  const cmd = (words[0] ?? '').toLowerCase();
  const rest = raw.slice(raw.indexOf(words[0] ?? '') + (words[0]?.length ?? 0)).trim();
  return { raw, cmd, args: words.slice(1), rest: rest.replace(/^"(.*)"$/, '$1') };
}

/** ALPHA-03, alpha 3, A03, a-3 -> "ALPHA-03"; null when not a facility id. */
export function normalizeFacility(arg: string, canon: Canon): FacilityId | null {
  const m = /^(alpha|beta|gamma|delta|a|b|g|d)[\s-]?0?(\d{1,2})$/i.exec(arg.trim());
  if (!m) return null;
  const word = m[1]!.toUpperCase();
  const cls = word.length === 1 ? ({ A: 'ALPHA', B: 'BETA', G: 'GAMMA', D: 'DELTA' } as const)[word as 'A' | 'B' | 'G' | 'D'] : word;
  const id = `${cls}-${pad2(Number(m[2]))}` as FacilityId;
  return canon.facilities.some((f) => f.id === id) ? id : null;
}

/** Register lookup that tolerates a missing "OSC-" prefix and any case. */
export function findDoc(routes: readonly RouteEntry[], arg: string): RouteEntry | undefined {
  const a = arg.trim().toUpperCase();
  if (!a) return undefined;
  if (a.startsWith('/')) return routes.find((r) => r.route.toUpperCase() === a);
  return routes.find((r) => r.docNo.toUpperCase() === a) ?? routes.find((r) => r.docNo.toUpperCase() === `OSC-${a}`);
}

function accessKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  const t = `T${r.access.tier}`;
  return r.access.compartment ? `${r.access.compartment}+${t}` : t;
}

function requirementText(r: RouteEntry): string {
  const a = r.access!;
  return `Tier ${a.tier} access determination${a.compartment ? ` and ${a.compartment} compartment briefing` : ''}`;
}

/* -------------------------------------------------------------- commands */

type Handler = (p: Parsed, ctx: HostContext) => HostResult;

const out = (lines: string[], effects: Effect[] = [], marking?: MarkingId): HostResult => (marking ? { lines, effects, marking } : { lines, effects });

const help: Handler = (_p, ctx) => {
  const lines = HELP_LINES.map((h) => `  ${h.cmd.padEnd(18)}${h.text}`);
  if (ctx.account?.auditReader) lines.push('  audit tail [n] --operator <id>  Audit trail of another operator (OIA, read-only)');
  return out(['COMMANDS AVAILABLE TO THIS OPERATOR', ...lines, 'Reference KB-0026 and OSC-DIR-0301.']);
};

const whoami: Handler = (_p, ctx) => {
  const op = identity(ctx);
  const held = [...ctx.compartments];
  const lines = [
    ...kv('Operator', `${ctx.operatorId}  ${op.pn}`, ctx.cols),
    ...kv('Name', op.displayName, ctx.cols),
  ];
  if (op.roleTitle) lines.push(...kv('Post', op.roleTitle, ctx.cols));
  lines.push(
    ...kv('Tier', ctx.acting ? `${ctx.tier} (acting)  baseline ${op.tier}` : String(ctx.tier), ctx.cols),
    ...kv('Site', `${op.site}  ${divisionLabel(ctx.canon, op.divisionId)}`, ctx.cols),
    ...kv('Workstation', workstation(), ctx.cols),
    ...kv('Compartments', held.length ? held.join(' ') : 'None', ctx.cols),
  );
  // Accounts with no probation start are not on probation: no row.
  if (op.probationStart) lines.push(...kv('Probation', `Day ${ctx.probationDay} of ${ctx.probationLength}`, ctx.cols));
  if (op.supervisorPn) lines.push(...kv('Supervisor', op.supervisorPn, ctx.cols));
  if (ctx.account?.approves.length) lines.push(...kv('Approves', ctx.account.approves.join(' '), ctx.cols));
  if (ctx.account?.auditReader) lines.push(...kv('Audit review', 'Office of Internal Assurance auditor (read-only)', ctx.cols));
  return out(lines);
};

/** "OPR-A01-0948", "a01-0948", "auditor" -> the account, if issued on this workstation. */
export function resolveAccount(arg: string, accounts: readonly AccountDef[]): AccountDef | undefined {
  const a = arg.trim().toUpperCase();
  if (!a) return undefined;
  return accounts.find((x) => x.id.toUpperCase() === a || x.operatorId.toUpperCase() === a || x.operatorId.toUpperCase() === `OPR-${a}`);
}

const accounts: Handler = (_p, ctx) => {
  const list = ctx.accounts ?? [];
  if (!list.length) return out(['No credentials are recorded for this session.']);
  const me = identity(ctx).operatorId;
  const rw = Math.max(16, ctx.cols - 36);
  const lines = [`CREDENTIALS HELD  WS ${workstation()}  ${stamp(ctx.now)}`, `  ${col('OPERATOR', 15)}${col('TIER', 5)}${col('SITE', 10)}POST`];
  for (const a of list) lines.push(`${a.operatorId === me ? '*' : ' '} ${col(a.operatorId, 15)}${col(String(a.tier), 5)}${col(a.site, 10)}${col(a.roleTitle, rw)}`.trimEnd());
  lines.push(`${list.length} credentials. * in use. Credentials are presented at the lock screen.`);
  return out(lines);
};

const su: Handler = (p, ctx) => {
  const who = p.args[0] ? resolveAccount(p.args[0], ctx.accounts ?? []) : undefined;
  const cmd = p.cmd.toUpperCase();
  const lines = [
    `${cmd}: not available at ${HOST}. A credential is presented only at the workstation lock screen (OSC-DIR-0301).`,
    who
      ? `To use credential ${who.operatorId}, log off (Directory > Log off) and choose its card.`
      : 'Log off (Directory > Log off) and choose the card of the credential to be used.',
  ];
  return out(lines.flatMap((l) => wrap(l, ctx.cols)));
};

const sites: Handler = (_p, ctx) => {
  const dw = Math.max(6, Math.min(28, ctx.cols - 32));
  const lines = [`${col('ID', 10)}${col('CLASS', 7)}${col('DESIGNATION', dw)}${rcol('STAFF', 6)}${rcol('BERTHS', 8)}`];
  // Tier 4: the operator's own site only; the register itself is a Tier 3 listing.
  const home = identity(ctx).site;
  const shown = isTier4(ctx) ? ctx.canon.facilities.filter((f) => f.id === home) : ctx.canon.facilities;
  for (const f of shown) {
    lines.push(`${col(f.id, 10)}${col(f.class, 7)}${col(plain(f.codename ?? '-'), dw)}${rcol(fig(f.staff), 6)}${rcol(fig(f.capacity), 8)}`);
  }
  if (isTier4(ctx)) {
    lines.push(`Assigned site only. The facility register is released at Tier 3 (${T4_REF}).`);
    return out(lines);
  }
  // The total is the canon figure, not a sum over rows: withheld site figures are not zero.
  const withheld = ctx.canon.facilities.some((f) => f.staff === null);
  lines.push(
    `${ctx.canon.facilities.length} facilities on the register. Posted staff ${fmtN(ctx.canon.headline.staffPosted)}. Berths are surge berthing.${withheld ? ' Barred site figures are withheld (T1).' : ''}`,
  );
  return out(lines);
};

/** Sites whose location and connections a Tier 3 reader at the operator's site may see without SEXTANT. */
export function adjacentSites(canon: Canon, home: string = canon.operator.site): Set<string> {
  const s = new Set<string>([home]);
  for (const seg of canon.railSegments) {
    if (seg.a === home) s.add(seg.b);
    if (seg.b === home) s.add(seg.a);
  }
  for (const n of canon.tramNetworks)
    for (const l of n.links) {
      if (l.from === home) s.add(l.to);
      if (l.to === home) s.add(l.from);
    }
  return s;
}

function facilityLines(f: Facility, ctx: HostContext): string[] {
  const c = ctx.canon;
  const cls = c.classes.find((k) => k.id === f.class);
  const open = adjacentSites(c, identity(ctx).site).has(f.id) || ctx.satisfies('SEXTANT');
  const geo = (v: string | null) => (v === null ? '--' : open ? plain(v) : `${bar(rxPlain(v).length)} (SEXTANT)`);
  const rx = c.reactors.find((r) => r.site === f.id);
  const lines = [
    `FACILITY STATUS  ${f.id}${f.codename ? '  ' + plain(f.codename) : ''}  ${stamp(ctx.now)}`,
    ...kv('Class', `${f.class}  ${cls ? cls.name : ''}`.trim(), ctx.cols),
    ...kv('Location', geo(f.locationText), ctx.cols),
    ...kv('Cover', plain(f.coverIdentity), ctx.cols),
    // Client-canon nulls: GAMMA depths are Tier 2, DELTA figures Tier 1. Withheld, not absent.
    ...kv('Depth', f.depthFt !== null ? `${fmtN(f.depthFt)} ft` : f.class === 'GAMMA' ? `${fig(null)} Withheld (T2)` : f.class === 'DELTA' ? `${fig(null)} Withheld (T1)` : '--', ctx.cols),
    ...kv('Completed', isRx(f.completed) ? plain(f.completed) : monthYear(f.completed), ctx.cols),
    ...kv('Berths', f.capacity === null ? `${fig(null)} Withheld (T1)` : `${fmtN(f.capacity)} (surge berthing)`, ctx.cols),
  ];
  if (f.sustainedMonths !== null) lines.push(...kv('Sustained', `${fmtN(f.sustainedMonths)} months at full reserves`, ctx.cols));
  lines.push(...kv('Posted staff', f.staff === null ? `${fig(null)} Withheld (T1)` : fmtN(f.staff), ctx.cols), ...kv('Function', plain(f.function), ctx.cols));
  if (f.connectionsText) lines.push(...kv('Connections', geo(f.connectionsText), ctx.cols));
  if (rx) lines.push(...kv('Reactor', open ? `${rx.id} ${rx.designation}  ${rx.status}` : `${bar(rx.id.length + rx.designation.length + 1)} (SEXTANT)`, ctx.cols));
  // A null reactor flag is withheld by the client canon (BETA outside the home network, DELTA), not "none".
  else if (f.reactor === null) lines.push(...kv('Reactor', `${bar(3)} Withheld (${f.class === 'DELTA' ? 'T1' : 'SEXTANT'})`, ctx.cols));
  else lines.push(...kv('Reactor', 'None. Station supply per class standard.', ctx.cols));
  return lines;
}

const site: Handler = (p, ctx) => {
  if (!p.rest) return out(['SITE: specify a facility (site ALPHA-03).']);
  const id = normalizeFacility(p.rest, ctx.canon);
  if (!id) return out([`SITE: ${p.rest.toUpperCase()} is not on the facility register.`]);
  if (isTier4(ctx) && id !== identity(ctx).site) return out([T4_REFUSAL(`SITE ${id}`)]);
  return out(facilityLines(ctx.canon.facilities.find((f) => f.id === id)!, ctx));
};

const rail: Handler = (p, ctx) => {
  if ((p.args[0] ?? '').toLowerCase() !== 'status') return out(['RAIL: usage RAIL STATUS.']);
  if (isTier4(ctx)) return out([T4_REFUSAL('RAIL STATUS')]);
  const lines = [
    `INTER-HUB RAIL  STATUS AT ${stamp(ctx.now)}`,
    `${col('SEG', 5)}${col('FROM', 10)}${col('TO', 10)}${rcol('MILES', 6)}${rcol('HRS', 6)}  STATUS`,
  ];
  for (const s of ctx.canon.railSegments) {
    lines.push(`${col(s.no, 5)}${col(s.a, 10)}${col(s.b, 10)}${rcol(fmtN(s.miles), 6)}${rcol(s.hours.toFixed(1), 6)}  ${s.status}`);
  }
  lines.push('Engineering mileage. Reference OSC-TRN-ENG.');
  return out(lines);
};

const find: Handler = (p) => {
  if (!p.rest) return out(['FIND: specify a term.']);
  return out([], [{ kind: 'search', q: p.rest }]);
};

/** Results of FIND, formatted for the screen. */
export function formatFind(q: string, hits: readonly { route: RouteEntry }[], cols: number): string[] {
  if (!hits.length) return [`FIND "${q}": no entries available to this operator.`];
  const shown = hits.slice(0, 20);
  const lines = [`FIND "${q}": ${hits.length} ${hits.length === 1 ? 'entry' : 'entries'}${hits.length > shown.length ? `, first ${shown.length} listed` : ''}`];
  const w = Math.max(16, cols - 21);
  for (const h of shown) lines.push(`${col(h.route.docNo, 20)} ${col(h.route.title, w)}`.trimEnd());
  lines.push('Type OPEN <docno> to display an entry.');
  return lines;
}

const lookup: Handler = (p, ctx) => {
  if (!p.rest) return out(['LOOKUP: specify a document number.']);
  const r = findDoc(heldRoutes(ctx), p.rest);
  if (!r) return out([`LOOKUP: ${p.rest.toUpperCase()} is not on the register.`]);
  const marking = ctx.canon.markings.find((m) => m.id === r.marking);
  const key = accessKey(r);
  return out([
    ...kv('Doc no', r.docNo, ctx.cols),
    ...kv('Title', r.title, ctx.cols),
    ...kv('Marking', marking ? marking.label : r.marking, ctx.cols),
    ...kv('Originator', r.originator, ctx.cols),
    ...kv('Revision', String(r.revision), ctx.cols),
    ...kv('Date', isoToOsc(r.date), ctx.cols),
    ...kv('Held in', ctx.appTitle(r.app), ctx.cols),
    ...kv('Access', key ? `${requirementText(r)}: ${ctx.satisfies(key) ? 'satisfied' : 'not satisfied'}` : 'Open to this operator', ctx.cols),
  ]);
};

export function isoToOsc(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

const open: Handler = (p, ctx) => {
  if (!p.rest) return out(['OPEN: specify a document number or route.']);
  const r = findDoc(ctx.routes, p.rest);
  // An undelivered message: refused in-world, without confirming it exists or opening anything.
  if (r && ctx.isHeld && !ctx.isHeld(r.route)) return out(['No such message held.']);
  if (r && !tier4Visible(r, ctx)) return out([`${r.docNo}: display refused. Requires Tier 3 access determination. Reference ${T4_REF}.`]);
  if (!r) {
    if (p.rest.startsWith('/')) return out([`Requesting ${p.rest}.`], [{ kind: 'open', route: p.rest }]);
    return out([`OPEN: ${p.rest.toUpperCase()} is not on the register. Check the number against the register.`]);
  }
  const key = accessKey(r);
  if (key && !ctx.satisfies(key)) {
    return out([`${r.docNo}: display refused. Requires ${requirementText(r)}. Reference DIR-0412.`], [{ kind: 'open', route: r.route }]);
  }
  return out([`Opening ${r.docNo} in ${ctx.appTitle(r.app)}.`], [{ kind: 'open', route: r.route }]);
};

const mail: Handler = (p, ctx) => {
  if ((p.args[0] ?? '').toLowerCase() === 'open') return out(['Starting Message Traffic.'], [{ kind: 'openApp', app: 'mail' }]);
  if (p.args.length) return out(['MAIL: usage MAIL or MAIL OPEN.']);
  const n = ctx.unread;
  return out([`${n === 0 ? 'No' : n} unread ${n === 1 ? 'message' : 'messages'} for ${ctx.operatorId}. Type MAIL OPEN to start Message Traffic.`]);
};

/** One audit entry in the security office's line format (docs/NARRATIVE.md §3). */
export function auditLine(e: AuditEntry, operatorId: string): string {
  const d = new Date(e.at);
  const ymd = e.at.slice(2, 10).replace(/-/g, '');
  const valid = !Number.isNaN(d.getTime());
  const t = valid ? `${zulu(d)} (${local(d)})` : '----Z';
  const ws = allAccounts().find((a) => a.operatorId === operatorId)?.workstation ?? workstation();
  return `AUD-${ymd}-${String(e.seq).padStart(6, '0')} ${t} ${e.kind.toUpperCase()} ${operatorId} WS ${ws} ${e.detail}`;
}

/** AUDIT TAIL --OPERATOR output, once the trail has been read (read-only copy). */
export function formatAuditOther(entries: readonly AuditEntry[] | null, operatorId: string, n: number, cols: number, now: Date): string[] {
  if (!entries) return [`AUDIT: the audit trail of ${operatorId} could not be read at ${HOST}. Report the fault to the MERIDIAN Service Desk.`];
  const head = `AUDIT TRAIL  ${operatorId}  READ-ONLY COPY  ${stamp(now)}`;
  if (!entries.length) return [head, `No audit entries recorded for ${operatorId}.`];
  const list = entries.slice(-n);
  const lines = [head];
  for (const e of list) lines.push(...wrap(auditLine(e, operatorId), cols));
  lines.push(`${list.length} of ${entries.length} entries. Read by the Office of Internal Assurance (OSC-DIR-0412 para 8).`);
  return lines;
}

/** Pull "--operator <id>" (or "--operator=<id>") out of an argument list. */
export function takeOperatorOpt(args: readonly string[]): { rest: string[]; operator: string | null; bad: boolean } {
  const rest: string[] = [];
  let operator: string | null = null;
  let bad = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    const m = /^--operator(?:=(.*))?$/i.exec(a);
    if (!m) {
      rest.push(a);
      continue;
    }
    const v = m[1] ?? args[++i];
    if (!v) bad = true;
    else operator = v;
  }
  return { rest, operator, bad };
}

const audit: Handler = (p, ctx) => {
  if ((p.args[0] ?? '').toLowerCase() !== 'tail') return out(['AUDIT: usage AUDIT TAIL [n].']);
  const opt = takeOperatorOpt(p.args.slice(1));
  if (opt.bad) return out(['AUDIT: --operator needs an operator id (OPR-A03-1147).']);
  if (opt.operator !== null) {
    if (!ctx.account?.auditReader) {
      return out(wrap('AUDIT TAIL --OPERATOR: refused. The audit trail of another operator is read only by the Office of Internal Assurance (OSC-DIR-0412 para 8). This request has been recorded.', ctx.cols));
    }
    const who = resolveAccount(opt.operator, ctx.accounts ?? []);
    if (!who) return out([`AUDIT: ${opt.operator.toUpperCase()} is not a credential issued on this workstation. Type ACCOUNTS.`]);
    const rawN = opt.rest[0];
    const n = rawN === undefined ? 10 : Number(rawN);
    if (!Number.isInteger(n) || n < 1) return out(['AUDIT: n must be a whole number from 1 to 50.']);
    if (who.operatorId === identity(ctx).operatorId) return audit({ ...p, args: ['tail', ...opt.rest] }, ctx);
    return out([], [{ kind: 'auditOther', account: who.id, operatorId: who.operatorId, n: Math.min(n, 50) }]);
  }
  const raw = p.args[1];
  const n = raw === undefined ? 10 : Number(raw);
  if (!Number.isInteger(n) || n < 1) return out(['AUDIT: n must be a whole number from 1 to 50.']);
  const take = Math.min(n, 50);
  const list = ctx.audit.slice(-take);
  if (!list.length) return out(['No audit entries recorded for this operator.']);
  const lines: string[] = [];
  for (const e of list) lines.push(...wrap(auditLine(e, ctx.operatorId), ctx.cols));
  return out(lines);
};

const clearance: Handler = (p, ctx) => {
  const sub = (p.args[0] ?? 'status').toLowerCase();
  if (sub === 'status') {
    const lines = [`ACCESS DETERMINATION  ${ctx.operatorId}  ${stamp(ctx.now)}`];
    lines.push(...kv('Tier', ctx.acting ? `${ctx.tier} (acting)  baseline ${identity(ctx).tier}` : `${ctx.tier}`, ctx.cols));
    const held = ctx.canon.compartments.filter((c) => ctx.compartments.includes(c.id));
    if (!held.length) lines.push(...kv('Compartments', 'None', ctx.cols));
    held.forEach((c, i) => lines.push(...kv(i === 0 ? 'Compartments' : '', `${c.id.padEnd(9)}briefing ${c.briefingDocNo}`, ctx.cols)));
    if (identity(ctx).probationStart) lines.push(...kv('Probation', `Day ${ctx.probationDay} of ${ctx.probationLength}`, ctx.cols));
    lines.push('Compartment access is requested on OSC-F-126. Reference DIR-0412.');
    return out(lines);
  }
  if (sub === 'request') {
    const what = (p.args[1] ?? '').toUpperCase();
    if (!what) return out(['CLEARANCE REQUEST: specify a compartment. Applications are made on OSC-F-126.']);
    if (what === 'ACTING' && p.args.length === 2) return requestActing(ctx);
    if (ctx.compartments.includes(what)) return out([`${what} is already recorded against ${ctx.operatorId}.`]);
    return out([`CLEARANCE REQUEST ${what}: not accepted at the command line. Compartment access is requested on OSC-F-126. Reference DIR-0412.`]);
  }
  return out([`CLEARANCE: ${sub.toUpperCase()} is not a clearance subcommand. Type MAN CLEARANCE.`]);
};

function requestActing(ctx: HostContext): HostResult {
  if (ctx.acting) return out(['Acting Tier 2 determination is already recorded for this operator.']);
  // Eligibility follows the interim review (narrative step S14); the grant itself is the engine's (S15).
  if (!ctx.flags.interimReview) return out(['CLEARANCE REQUEST ACTING: not eligible: probationary (DIR-0247).']);
  const sponsor = identity(ctx).supervisorPn ?? '--';
  return out([
    `REQUEST  ACTING TIER 2  ${ctx.operatorId}  ${stamp(ctx.now)}`,
    ...kv('Sponsor', `${sponsor} (supervisor of record)`, ctx.cols),
    ...kv('Basis', 'OSC-DIR-0395 para 7; probationary interim review', ctx.cols),
    ...kv('Determination', 'Recorded. Notice follows by Message Traffic.', ctx.cols),
  ]);
}

const date: Handler = (_p, ctx) => out([`${HOST}  ${stamp(ctx.now)}`]);

const history: Handler = (_p, ctx) => {
  if (!ctx.history.length) return out(['No commands entered this session.']);
  return out(ctx.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`));
};

const clear: Handler = () => out([], [{ kind: 'clear' }]);

const man: Handler = (p) => {
  const w = (p.args[0] ?? '').toLowerCase();
  if (!w) return out(['MAN: specify a command (man site).']);
  const page = MAN[w];
  if (page) return out(page);
  if ((DIVISION_UTILITIES as readonly string[]).includes(w)) {
    return out([`No manual entry for ${w.toUpperCase()}. Division lookup utilities are documented by the owning division.`]);
  }
  return out([`No manual entry for ${w.toUpperCase()}.`]);
};

const logout: Handler = (_p, ctx) => out([`Session ended ${stamp(ctx.now)}. Connection to ${HOST} closed.`], [{ kind: 'logout' }]);

/* ------------------------------------------------- division utilities */

const wo: Handler = (p, ctx) => {
  const no = (p.args[0] ?? '').toUpperCase();
  if (!no) return out(['WO: specify a work order number (FE-07-0233).']);
  if (!/^[A-Z]{2,3}-\d{2}-\d{4}$/.test(no)) return out([`WO: ${no} is not a work order number. Format AA-YY-NNNN.`]);
  const w = WORK_ORDERS.find((x) => x.no === no);
  if (!w) return out([`WO: no record of ${no} on the ALPHA-03 work order register.`]);
  const rx = w.reactor ? ctx.canon.reactors.find((r) => r.id === w.reactor) : undefined;
  const lines = [
    `WORK ORDER  ${w.no}  ${w.status}`,
    ...kv('Title', w.title, ctx.cols),
    ...kv('Location', rx ? `${w.location}, ${rx.id} ${rx.designation}` : w.location, ctx.cols),
    ...kv('Raised by', w.raisedBy, ctx.cols),
  ];
  if (w.closed) lines.push(...kv('Closed', w.closed, ctx.cols));
  if (rx) lines.push(...kv('Plant status', `${rx.status}. ${rx.statusNote}`, ctx.cols));
  if (w.constraint) lines.push(...kv('Constraint', w.constraint, ctx.cols));
  // Viewing adds the workstation to the distribution once the operator's orientation is recorded
  // (narrative S11 requires S01); the engine grants the compartment from the audit entry.
  const dist = [...w.distribution];
  let added = false;
  if (w.readsInto) {
    const holds = ctx.compartments.includes(w.readsInto);
    if (holds) dist.push(`WS ${workstation()}`);
    else if (ctx.flags.oriented) {
      dist.push(`WS ${workstation()} (added ${zulu(ctx.now)} ${hostDate(ctx.now)})`);
      added = true;
    }
  }
  lines.push(...kv('Distribution', dist.join(', '), ctx.cols));
  if (w.readsInto) {
    lines.push(...wrap(`Distribution holders are read into ${w.readsInto} for the duration of the order (DIR-0412 para 4(e)).`, ctx.cols));
    if (!ctx.compartments.includes(w.readsInto) && !ctx.flags.oriented) {
      lines.push(...wrap(`Workstation ${workstation()} not added to distribution: no orientation record for this operator (OSC-DIR-0412).`, ctx.cols));
    }
  }
  const released = w.readsInto && (ctx.compartments.includes(w.readsInto) || added);
  return out(lines, [], released ? COMPARTMENT_MARKING : undefined);
};

/** "RD-ACC-08-00412", "00412", "412" -> 412; null when not an accession of this register. */
export function parseAccession(arg: string): number | null {
  const a = arg.trim().toUpperCase();
  const m = /^(?:RD-ACC-08-)?(\d{1,5})$/.exec(a);
  return m ? Number(m[1]) : null;
}

/** Incident record that carries the 00412 custody origin under BRIAR. */
export const CUSTODY_DOCNO = 'OIA-08-031';
/** Directory document whose HOLLOW release carries unposted names and last postings. */
export const DIRECTORY_DOCNO = 'OSC-PER-DIR';

const trace: Handler = (p, ctx) => {
  if (!p.args[0]) return out(['TRACE: specify an accession number (RD-ACC-08-00398).']);
  const n = parseAccession(p.args[0]);
  if (n === null) return out([`TRACE: ${p.args[0].toUpperCase()} is not an accession number. Format RD-ACC-YY-NNNNN.`]);
  const a = accession(n);
  if (!a) return out([`TRACE: no custody record for ${accessionNo(n)} on this host.`]);
  const lines = [`CHAIN OF CUSTODY  ${a.no}  ${stamp(ctx.now)}`, ...kv('Description', a.description, ctx.cols)];
  if (n === ACCESSION_HELD) {
    // Released to a holder of both compartments, from the incident record (OIA-08-031).
    const both = ctx.satisfies('SEXTANT') && ctx.satisfies('BRIAR');
    const origin = both ? ctx.docRows?.(CUSTODY_DOCNO)?.get('Origin')?.[1] : null;
    lines.push(...kv('Hop 1  origin', origin ? `${origin} to ${a.hops[0]!.to}` : `${bar(28)}  Withheld (SEXTANT/BRIAR)`, ctx.cols, 16));
    const h = a.hops[1]!;
    lines.push(...kv('Hop 2', `${h.date}  ${h.from} to ${h.to}  receipt ${h.receipt}`, ctx.cols, 16));
  } else {
    a.hops.forEach((h, i) => lines.push(...kv(`Hop ${i + 1}`, `${h.date}  ${h.from} to ${h.to}  receipt ${h.receipt}`, ctx.cols, 16)));
  }
  lines.push(...kv('Status', a.status, ctx.cols, 16));
  return out(lines);
};

function shortName(name: string): string {
  if (isRx(name)) return rxPlain(name);
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() ?? '';
  return `${last.toUpperCase()}, ${parts.map((p) => p[0]!.toUpperCase() + '.').join(' ')}`.trim();
}

const UNPOSTED = 'DETACHED / UNPOSTED';

const strength: Handler = (p, ctx) => {
  const c = ctx.canon;
  const arg = p.rest.trim();
  if (!arg) return out(['STRENGTH: specify a site, a class or ALL.']);
  const head = (what: string) => `STRENGTH RETURN  ${what}  ${stamp(ctx.now)}`;
  const lower = arg.toLowerCase();
  if (lower === 'unposted') {
    const lines = [head(UNPOSTED), ...kv('Category total', fmtN(c.headline.staffUnposted), ctx.cols, 16)];
    if (ctx.compartments.includes('HOLLOW')) {
      const carried = c.roster.filter((x) => x.site === UNPOSTED);
      const lw = Math.max(10, Math.min(26, ctx.cols - 43));
      lines.push(`${col('PN', 13)}${col('NAME', 18)}${col('LAST POSTED', lw)}EFFECTIVE`);
      const dir = ctx.docRows?.(DIRECTORY_DOCNO);
      for (const x0 of carried) {
        // Name and remarks released by the directory document (columns 1 and 6); canon has sentinels.
        const row = dir?.get(x0.pn);
        const x = { ...x0, name: row?.[1] || x0.name, notes: row?.[6] || x0.notes };
        // Notes the client canon withholds (HOLLOW sentinels) print as bars, not as "none".
        const held = hasRx(x.notes);
        const last = /Last posted ([^,.]+)/.exec(x.notes)?.[1] ?? (held ? bar(Math.min(12, lw - 1)) : '--');
        const eff = /effective (\d{2} [A-Z]{3} \d{4})/.exec(x.notes)?.[1] ?? (held ? bar(11) : '--');
        lines.push(`${col(x.pn, 13)}${col(shortName(x.name), 18)}${col(last, lw)}${eff}`);
      }
      const rest = c.headline.staffUnposted - carried.length;
      lines.push(`${fmtN(rest)} further entries  [NOT RELEASED]`);
      const change = c.calendar.find((e) => /payroll category change/i.test(e.title));
      if (change) lines.push(`Category change effective ${change.dateText}: count withheld.`);
      return out(lines, [], COMPARTMENT_MARKING);
    }
    lines.push(...kv('Breakdown', 'None. The utility returns the category total without breakdown.', ctx.cols, 16));
    return out(lines);
  }
  if (lower === 'all' || lower === 'network') {
    const lines = [head('ALL SITES'), `${col('CLASS', 8)}${col('NAME', 30)}${rcol('SITES', 6)}${rcol('POSTED', 8)}`];
    for (const k of c.classes) {
      // Class stated totals: site figures withheld from the client canon (DELTA) are not summed as zero.
      lines.push(`${col(k.id, 8)}${col(k.name, 30)}${rcol(String(k.count), 6)}${rcol(fmtN(k.statedStaff), 8)}`);
    }
    lines.push(`${col('Posted', 44)}${rcol(fmtN(c.headline.staffPosted), 8)}`);
    lines.push(`${col(UNPOSTED, 44)}${rcol(fmtN(c.headline.staffUnposted), 8)}`);
    lines.push(`${col('Total personnel', 44)}${rcol(fmtN(c.headline.staffTotal), 8)}`);
    return out(lines);
  }
  const cls = c.classes.find((k) => k.id === arg.toUpperCase());
  if (cls) {
    const fs = c.facilities.filter((f) => f.class === cls.id);
    const lines = [head(`${cls.id} ${cls.name.toUpperCase()}`)];
    for (const f of fs) lines.push(`${col(f.id, 10)}${col(plain(f.codename ?? '-'), 30)}${rcol(fig(f.staff), 6)}`);
    // The class stated total, never a sum that would count withheld sites as zero.
    lines.push(`${col(fs.some((f) => f.staff === null) ? 'Posted (class stated total)' : 'Posted', 40)}${rcol(fmtN(cls.statedStaff), 6)}`);
    return out(lines);
  }
  const id = normalizeFacility(arg, c);
  if (!id) return out([`STRENGTH: ${arg.toUpperCase()} is not a site, a class or a category on the return.`]);
  const f = c.facilities.find((x) => x.id === id)!;
  const lines = [head(f.id)];
  for (const s of f.staffBreakdown) lines.push(`${col(plain(s.role), 40)}${rcol(fmtN(s.count), 6)}`);
  if (f.staff === null) lines.push('Site return withheld (T1).');
  lines.push(`${col('Posted', 40)}${rcol(fig(f.staff), 6)}`);
  return out(lines);
};

/** Consist ID formats from the rolling stock register: R01-214, TEA-031. */
const CONSIST_RE = /^(R0[1-6]|TEA|TSO|TMW|TCE)-([0-9*]{3})$/;

const consist: Handler = (p, ctx) => {
  const id = (p.args[0] ?? '').toUpperCase();
  if (!id) return out(['CONSIST: specify a consist ID (R01-214).']);
  const m = CONSIST_RE.exec(id);
  if (!m) return out([`CONSIST: ${id} is not a consist ID. Format R0n-NNN or Txx-NNN.`]);
  if (m[1] === 'R04' && (m[2]!.includes('*') || m[2]!.startsWith('9'))) return out([`CONSIST ${id}: NO RECORD.`]);
  if (m[2]!.includes('*')) return out([`CONSIST ${id}: NO RECORD.`]);
  if (!ctx.satisfies('KESTREL')) {
    const seg = ctx.canon.railSegments.find((s) => `R${s.no}` === m[1]);
    const net = ctx.canon.tramNetworks.find((n) => `T${n.id.slice(0, 2)}` === m[1] || (m[1] === 'TMW' && n.id === 'MOUNTAIN_WESTERN'));
    return out([
      `CONSIST ${id}`,
      ...kv('Series', seg ? `Rail, segment ${seg.no}` : net ? `Tram, ${net.name}` : m[1]!, ctx.cols),
      ...kv('Build', `${bar(12)}`, ctx.cols),
      ...kv('Allocation', `${bar(22)}`, ctx.cols),
      ...kv('Overhaul', `${bar(11)}`, ctx.cols),
      'Rolling stock technical records are held under KESTREL. Reference DIR-0412.',
    ]);
  }
  return out([], [{ kind: 'consist', id }]);
};

/** Render a consist record found in the rolling stock register's tables (header row first). */
export function formatConsist(id: string, tables: readonly (readonly (readonly string[])[])[] | null, cols: number): string[] {
  if (!tables) return [`CONSIST ${id}: register OSC-TRN-RS is not available to this host at present.`];
  for (const t of tables) {
    const header = t[0];
    if (!header) continue;
    const row = t.slice(1).find((r) => r.some((cell) => cell.trim().toUpperCase() === id));
    if (row) {
      const lines = [`CONSIST ${id}  (OSC-TRN-RS)`];
      header.forEach((h, i) => {
        const v = (row[i] ?? '').trim();
        if (h.trim() && v) lines.push(...kv(h.trim().slice(0, 13), v, cols));
      });
      return lines;
    }
  }
  return [`CONSIST ${id}: NO RECORD.`];
}

const copies: Handler = (p, ctx) => {
  const arg = (p.args[0] ?? '').toUpperCase();
  if (!arg) return out(['COPIES: specify a document number.']);
  if (!ctx.satisfies('QUARRY')) {
    return out(['COPIES: the Council copy register is held under QUARRY. Requires QUARRY compartment briefing. Reference DIR-0412.']);
  }
  const src = ctx.canon.meta.sourceDocNo.toUpperCase();
  if (arg !== src && `OSC-${arg}` !== src) {
    return out([`COPIES: no Council copy register is held for ${arg}. Records copies are controlled under OSC-DIR-0319.`]);
  }
  const lines = [
    `COUNCIL COPY REGISTER  ${ctx.canon.meta.sourceDocNo}  REVISION ${ctx.canon.meta.sourceRevision}`,
    `${col('COPY', 6)}${col('HOLDER', 28)}${col('ISSUED', 10)}PREDECESSOR COPY DESTRUCTION`,
  ];
  for (const s of ctx.canon.council.seats) {
    const succ = /Succession (\d{4})-(\d{2})/.exec(s.notes);
    const dest = s.seat === 7 ? 'TO FOLLOW (Secretariat)' : succ ? `Certificate CS-CD-${succ[1]!.slice(2)}${succ[2]}-${pad2(s.seat)}` : 'Original issue';
    lines.push(`${col(pad2(s.seat), 6)}${col(`Seat ${pad2(s.seat)} ${s.category}`, 28)}${col(monthYear(s.since), 10)}${dest}`);
  }
  lines.push('Council copies are destroyed under Secretariat procedure, not on OSC-F-137 (OSC-DIR-0354).');
  return out(lines, [], COMPARTMENT_MARKING);
};

/* ------------------------------------------------------------ dispatch */

/** Division utilities belong to the ALPHA-03 divisions; a Tier 4 credential is not on their distribution. */
const division = (h: Handler): Handler => (p, ctx) => (isTier4(ctx) ? out([T4_REFUSAL(p.cmd.toUpperCase())]) : h(p, ctx));

const HANDLERS: Record<string, Handler> = {
  help,
  '?': help,
  whoami,
  accounts,
  su,
  login: su,
  sites,
  site,
  rail,
  find,
  lookup,
  open,
  mail,
  audit,
  clearance,
  date,
  history,
  clear,
  cls: clear,
  man,
  logout,
  exit: logout,
  wo: division(wo),
  trace: division(trace),
  strength: division(strength),
  consist: division(consist),
  copies: division(copies),
};

/** Run one command line against the host. */
export function run(line: string, ctx: HostContext): HostResult {
  const p = parse(line);
  if (!p.cmd) return out([]);
  const h = HANDLERS[p.cmd];
  if (!h) return out([`${p.cmd.toUpperCase()}: command not recognised. Type HELP for the commands available to this operator.`]);
  return closeWorld(h(p, ctx), ctx);
}

const FACILITY_RE = /\b(ALPHA|BETA|GAMMA|DELTA)[- ](\d{1,2})\b/gi;

/**
 * Tier 4 closed world (SPEC-2 §1): no host output names another facility. Any facility id other
 * than the operator's own site that reaches a Tier 4 session (help text, manual pages, refusals)
 * is printed as "another site".
 */
export function closeWorld(r: HostResult, ctx: Pick<HostContext, 'account' | 'canon'>): HostResult {
  if (!isTier4(ctx)) return r;
  const home = identity(ctx).site;
  const scrub = (l: string) => l.replace(FACILITY_RE, (m: string, c: string, n: string) => (`${c.toUpperCase()}-${n.padStart(2, '0')}` === home ? m : 'another site'));
  return { ...r, lines: r.lines.map(scrub) };
}

/* ------------------------------------------------------------ completion */

export interface Completion {
  line: string;
  options: string[];
}

function commonPrefix(xs: string[]): string {
  if (!xs.length) return '';
  let pre = xs[0]!;
  for (const x of xs) while (!x.toUpperCase().startsWith(pre.toUpperCase())) pre = pre.slice(0, -1);
  return pre;
}

/** Tab completion over documented commands, their subcommands, docNos and facility ids. */
export function complete(line: string, ctx: Pick<HostContext, 'routes' | 'canon' | 'isHeld' | 'account' | 'delivered'>): Completion {
  const m = /^(\s*)(\S*)(\s+)?(.*)$/.exec(line)!;
  const [, lead = '', word = '', gap, tail = ''] = m;
  let pool: string[];
  let prefix: string;
  let stem: string;
  let upper = false;
  if (!gap) {
    pool = [...DOCUMENTED];
    prefix = word.toLowerCase();
    stem = lead;
  } else {
    const cmd = word.toLowerCase();
    const lastSpace = tail.lastIndexOf(' ');
    if (lastSpace >= 0 && cmd !== 'rail' && cmd !== 'audit' && cmd !== 'clearance' && cmd !== 'mail') return { line, options: [] };
    prefix = tail.slice(lastSpace + 1);
    stem = line.slice(0, line.length - prefix.length);
    const sub: Record<string, string[]> = { rail: ['status'], audit: ['tail'], clearance: ['status', 'request'], mail: ['open'] };
    if (sub[cmd]) pool = lastSpace >= 0 ? [] : sub[cmd]!;
    else if (cmd === 'open' || cmd === 'lookup') {
      pool = heldRoutes(ctx).map((r) => r.docNo);
      upper = true;
    } else if (cmd === 'site') {
      pool = isTier4(ctx) ? [identity(ctx).site] : ctx.canon.facilities.map((f) => f.id);
      upper = true;
    } else if (cmd === 'man') pool = Object.keys(MAN);
    else pool = [];
  }
  const hits = pool.filter((x) => x.toUpperCase().startsWith(prefix.toUpperCase())).sort();
  if (!hits.length) return { line, options: [] };
  if (hits.length === 1) return { line: stem + hits[0]! + ' ', options: [] };
  const pre = commonPrefix(hits);
  if (pre.length > prefix.length || (upper && pre !== prefix)) return { line: stem + (upper ? pre : pre.toLowerCase()), options: [] };
  return { line, options: hits };
}
