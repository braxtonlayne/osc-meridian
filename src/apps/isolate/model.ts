/** Canon access and account rules for the isolate app. */
import canonJson from '@canon';
import type { AccountDef, AccountId } from '@core/contracts';
import type { Canon, Facility } from '@core/canon-types';
import type { IsolateCanon } from '@core/canon-apps/isolate';

export const canon = canonJson as unknown as Canon;
export const cfg = canon.apps.isolate as IsolateCanon;

export const HOME = '/isolate';
export const PANEL_TITLE = 'Network Isolation, Manual Initiate';

export const ALPHA_HUBS: Facility[] = canon.facilities.filter((f) => f.class === 'ALPHA').sort((a, b) => a.id.localeCompare(b.id));

/** What an account may do at the panel. */
export interface Rights {
  /** Sees the panel, register, restoration and link views (Tier 3 and above). */
  view: boolean;
  /** May lift the cover, break the seal and actuate. */
  operate: boolean;
  /** May raise a Circuit Restoration Certificate. */
  raise: boolean;
  /** Certifying officer: approves or returns certificates. */
  certify: boolean;
}

export function rightsFor(def: AccountDef): Rights {
  const view = def.tier <= 3;
  const auditor = def.auditReader;
  return {
    view,
    operate: view && !auditor,
    raise: view && !auditor,
    certify: def.id === 'deputy',
  };
}

export const ACCOUNT_ROLE: Record<AccountId, string> = {
  analyst: 'Records analyst',
  lifesupport: 'Life support technician',
  deputy: 'Deputy Commander',
  auditor: 'Assurance auditor',
};

/** "OPR-A03-1147" for an account id (from canon accounts). */
export function operatorOf(id: AccountId | 'system'): string {
  if (id === 'system') return 'NETWORK OPERATIONS';
  return canon.accounts.find((a) => a.id === id)?.operatorId ?? id;
}

/** "19 MAY 2008 1430Z" from an in-world ISO date-time. */
export function dtg(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}${p(d.getUTCMinutes())}Z`;
}

/** "14 APR 2008" from an ISO date. */
export function dateOnly(iso: string): string {
  return dtg(`${iso.slice(0, 10)}T00:00:00Z`).slice(0, 11);
}

export const DIR_REF = cfg.panel.procedureDocNo.replace(/^OSC-/, '');
