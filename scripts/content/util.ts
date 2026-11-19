/** Shared helpers for the MERIDIAN content pipeline. */

export const MAX_DATE = '2008-05-31';

export const MARKING_IDS = ['TSSCI-OSC', 'UMBRA-R', 'UMBRA-C', 'UMBRA-U', 'UMBRA-EO'] as const;
export const COMPARTMENT_IDS = ['KESTREL', 'HOLLOW', 'SEXTANT', 'TALLOW', 'BRIAR', 'QUARRY', 'LANTERN'] as const;
export const TEMPLATES = [
  'memo', 'directive', 'cable', 'minutes', 'dossier', 'ledger', 'form',
  'message', 'help', 'record', 'charter', 'scan', 'index',
] as const;
export const APP_IDS = [
  'registry', 'transit', 'personnel', 'records', 'mail', 'ledger',
  'reserves', 'assurance', 'directives', 'forms', 'terminal', 'system',
] as const;

/** A located build problem. Collected and reported together. */
export interface Problem {
  file: string;
  line?: number;
  message: string;
}

export class ContentBuildError extends Error {
  constructor(public problems: Problem[]) {
    super(
      `Content build failed with ${problems.length} problem(s):\n` +
        problems.map((p) => `  ${p.file}${p.line ? `:${p.line}` : ''}  ${p.message}`).join('\n'),
    );
    this.name = 'ContentBuildError';
  }
}

/** Thrown inside plugins; carries a body-relative line which the compiler offsets. */
export class DirectiveError extends Error {
  constructor(message: string, public bodyLine?: number) {
    super(message);
    this.name = 'DirectiveError';
  }
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2008-04-22" -> "22 APR 2008"; "2003-11" -> "NOV 2003". Returns input unchanged if not ISO. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
  if (!m) return iso;
  const mon = MONTHS[Number(m[2]) - 1];
  if (!mon) return iso;
  return m[3] ? `${m[3]} ${mon} ${m[1]}` : `${mon} ${m[1]}`;
}

/** Thousands separators, decimals preserved as stored in canon. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/** Keys whose numeric values are years/identifiers and must not get separators. */
export function isRawNumberKey(key: string): boolean {
  return /year$/i.test(key) || /^(n|no|seat|tier|fy)$/i.test(key);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Release key for a requirement: "T2", "KESTREL", "KESTREL+T2". */
export function releaseKey(tier: number | undefined, compartment: string | undefined): string {
  if (compartment && tier) return `${compartment}+T${tier}`;
  if (compartment) return compartment;
  if (tier) return `T${tier}`;
  throw new Error('release key needs a tier or a compartment');
}

/** Tier-1 material never ships, with or without a compartment. */
export function isTier1Key(key: string): boolean {
  return /(^|\+)T1$/.test(key);
}

/** Normalise a configured base path to "/x/" form. */
export function normalizeBase(b: string | undefined): string {
  let base = (b ?? '/').trim() || '/';
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

export function joinBase(base: string, route: string): string {
  return normalizeBase(base) + route.replace(/^\/+/, '');
}
