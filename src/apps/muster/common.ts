/** Muster Board: canon access, formatting and the per-account rules. */
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { AccountDef } from '@core/contracts';
import type { MusterCanon } from '@core/canon-apps/muster';
import type { ModelInputs } from './model';

export const canon = canonJson as unknown as Canon;
export const MC = canon.apps.muster as MusterCanon;
export const INPUTS: ModelInputs = { canon, muster: MC };
/** Exercise and drill musters run at the seal-drill time scale (canon sealDrill.timeScale). */
export const TS = canon.sealDrill.timeScale;
/** Sites on the plant network with assembly points, in canon order. */
export const MUSTER_SITES: string[] = canon.musterPoints.map((s) => s.facility);
export const PROC = MC.system.procedure; // "OSC-DIR-0461"
export const PROC_SHORT = PROC.replace(/^OSC-/, '');

export const fmt = (n: number): string => n.toLocaleString('en-US');

const pad2 = (n: number) => String(n).padStart(2, '0');
/** "1430Z" */
export const zuluOf = (ms: number): string => {
  const d = new Date(ms);
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
};
/** "1430:12Z" */
export const zuluSec = (ms: number): string => {
  const d = new Date(ms);
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
};
/** Exercise clock "T+07:30" from drill minutes. */
export const tPlus = (min: number): string => {
  const s = Math.max(0, Math.floor(min * 60));
  return `T+${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
};

/* ------------------------------------------------------------------ per-account rules */

export interface Perms {
  /** May read boards other than the account's own site. */
  network: boolean;
  /** Site at which the account may initiate, task sweeps and sign close-out (null = none). */
  controlSite: string | null;
  /** In-world reason a control is refused at `site`. */
  refusal(site: string): { body: string; reference: string };
}

export function permsFor(a: AccountDef): Perms {
  const network = a.tier <= 3;
  // Tier 2 command staff direct musters at their own facility; at a GAMMA site the duty watch does
  // (DIR-0461 para 4.2); Tier 3 staff and OIA hold read access only.
  const controlSite = a.tier === 2 || (a.tier === 4 && a.site.startsWith('GAMMA-')) ? a.site : null;
  return {
    network,
    controlSite,
    refusal(site) {
      if (a.auditReader || a.divisionId === 'OIA')
        return {
          body: `The Office of Internal Assurance reviews muster records and close-out reports. It does not initiate musters, task sweep teams or sign close-out at any facility.`,
          reference: `${PROC_SHORT} para 4.4`,
        };
      if (controlSite && controlSite !== site)
        return {
          body: `Muster at ${site} is directed by that facility's command. This workstation holds read access to the ${site} board only.`,
          reference: `${PROC_SHORT} para 4.1`,
        };
      return {
        body: `Muster initiation, sweep tasking and close-out are command functions: the facility commander or deputy commander, the duty officer, or at a GAMMA site the duty watch. This workstation holds read access to the board only.`,
        reference: `${PROC_SHORT} para 4`,
      };
    },
  };
}

/** Account short label for reports: "DEPUTY COMMANDER 2-0139". */
export function signerLabel(a: AccountDef | undefined, fallback: string): string {
  return a ? `${a.displayName}, ${a.roleTitle}` : fallback;
}
