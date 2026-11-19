/**
 * Who may do what at a patch bay (pure). The four accounts:
 * - deputy (Tier 2, ALPHA-02): operates the ALPHA-02 bay, including trunk and network repatches,
 *   quoting command authority as the circuit order. Views the other bays.
 * - analyst (Tier 3, ALPHA-03): tests, monitors, places calls and makes local patches at the
 *   ALPHA-03 bay. A trunk or network repatch holds no circuit order: the bay takes the cord,
 *   it is recorded as made without order and reported. Views the other bays.
 * - auditor (Tier 3, OIA, ALPHA-01): monitors only, at any bay. Operates nothing.
 * - lifesupport (Tier 4, GAMMA-08): sees the GAMMA-08 terminal block only, and may test and call
 *   on its maintenance circuit. Nothing else.
 */
import type { AccountDef } from '@core/contracts';
import type { PatchCircuit } from '@core/canon-apps/patch';
import type { CordPurpose } from './types';
import { PC, siteCode } from './model';

export type BayAccess = 'operate' | 'view' | 'hidden';

type Who = Pick<AccountDef, 'id' | 'tier' | 'site'>;

export function bayAccess(who: Who, site: string, hubs: readonly string[]): BayAccess {
  if (who.tier >= 4 || who.id === 'lifesupport') return site === who.site ? 'operate' : 'hidden';
  if (!hubs.includes(site)) return 'hidden';
  if (who.id === 'auditor') return 'view';
  return site === who.site ? 'operate' : 'view';
}

export type Decision =
  | { ok: true; authorised: boolean; order: string | null; confirm?: string }
  | { ok: false; text: string; reference: string };

const PROC = PC.panel.procedureDocNo;
const MAINT = PC.panel.maintenanceDocNo;

/** Decide a cord (or a test or call through one) at a bay. `today` = "190508" style date tag. */
export function decide(who: Who, site: string, purpose: CordPurpose, circuits: readonly PatchCircuit[], hubs: readonly string[], today: string): Decision {
  const access = bayAccess(who, site, hubs);
  if (access === 'hidden') {
    return { ok: false, text: 'This bay is not on this position.', reference: who.tier >= 4 ? MAINT : PROC };
  }
  if (who.id === 'auditor') {
    if (purpose === 'monitor') return { ok: true, authorised: true, order: null };
    return {
      ok: false,
      text: 'The Office of Internal Assurance observes circuits and does not operate them. A monitor cord, which does not break the circuit, may be placed at any bay.',
      reference: `${PROC} para 7`,
    };
  }
  if (who.tier >= 4) {
    const own = circuits.every((c) => c.kind === 'MAINT' && c.b === who.site);
    if (own && (purpose === 'test' || purpose === 'call')) return { ok: true, authorised: true, order: null };
    return {
      ok: false,
      text: 'Not on this technician\'s maintenance assignment. The maintenance circuit may be tested and called from this block. Other circuits are worked by Network Operations.',
      reference: MAINT,
    };
  }
  if (access === 'view') {
    return {
      ok: false,
      text: `The ${siteCode(site)} bay is operated from its own Network Operations position. This position may view it.`,
      reference: `${PROC} para 3`,
    };
  }
  if (purpose !== 'repatch') return { ok: true, authorised: true, order: null };
  const external = circuits.some((c) => c.class !== 'local');
  if (!external) return { ok: true, authorised: true, order: null };
  if (who.tier <= 2) return { ok: true, authorised: true, order: `${PC.panel.authorisedOrderPrefix}-${siteCode(site)}/${today}` };
  return {
    ok: true,
    authorised: false,
    order: null,
    confirm: `No circuit order is held at this position for ${circuits.map((c) => c.id).join(' and ')}. A trunk or network repatch without an order is recorded as such and reported to Network Operations.`,
  };
}
