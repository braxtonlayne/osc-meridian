/**
 * Issued MERIDIAN accounts (pass two, docs/SPEC-2.md §1).
 *
 * Definitions come from the client canon (`accounts`, content/canon/extended-c.json).
 * The active account is a pointer in localStorage (`meridian:activeAccount`); every
 * other persisted key lives in that account's namespace (src/core/persist.ts).
 * Switching account reloads the page into the new namespace, so no module-level
 * state can leak between accounts. A one-shot sessionStorage note tells the next
 * page load to skip the self-test (and, when the visitor already signed in with
 * the new card, to sign straight in).
 */
import { signal } from '@preact/signals';
import type { ReadonlySignal } from '@preact/signals';
import type { AccountDef, AccountId } from './contracts';
// Shell slice of the client canon, not '@canon' (which would preload the whole client canon).
import shellCanon from '../../content/canon/canon.shell.json';
const canonAccounts = shellCanon.accounts;

export const ACCOUNT_IDS: readonly AccountId[] = ['analyst', 'lifesupport', 'deputy', 'auditor'];
export const POINTER_KEY = 'meridian:activeAccount';
const SWITCH_KEY = 'meridian:switch';

const DEFS: AccountDef[] = (canonAccounts as unknown as AccountDef[]).filter((a) => ACCOUNT_IDS.includes(a.id));
const byId = new Map<AccountId, AccountDef>(DEFS.map((a) => [a.id, a]));

export function isAccountId(id: unknown): id is AccountId {
  return typeof id === 'string' && (ACCOUNT_IDS as readonly string[]).includes(id);
}

/** Every issued account, in card order. */
export function allAccounts(): AccountDef[] {
  return DEFS;
}

export function accountById(id: AccountId): AccountDef | undefined {
  return byId.get(id);
}

/** Resolve an in-world .mer address to the account it belongs to. */
export function accountByEmail(email: string): AccountDef | undefined {
  const e = email.trim().toLowerCase();
  if (!e) return undefined;
  return DEFS.find((a) => a.email.toLowerCase() === e);
}

/* -------------------------------------------------------------- pointer */

export function readPointer(): AccountId {
  try {
    const v = localStorage.getItem(POINTER_KEY);
    if (isAccountId(v) && byId.has(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return 'analyst';
}

export function writePointer(id: AccountId): void {
  try {
    localStorage.setItem(POINTER_KEY, id);
  } catch {
    /* storage unavailable: the switch lasts for this page only */
  }
}

/** Note for the next page load after an account switch. */
export interface SwitchNote {
  to: AccountId;
  /** The visitor already signed in with this card: go straight to the desktop. */
  autologin: boolean;
}

export function writeSwitchNote(n: SwitchNote): void {
  try {
    sessionStorage.setItem(SWITCH_KEY, JSON.stringify(n));
  } catch {
    /* storage unavailable: the self-test runs again */
  }
}

/** Read and clear the switch note. Ignored if it names another account than the pointer. */
export function takeSwitchNote(current: AccountId): SwitchNote | null {
  try {
    const raw = sessionStorage.getItem(SWITCH_KEY);
    if (raw == null) return null;
    sessionStorage.removeItem(SWITCH_KEY);
    const n = JSON.parse(raw) as Partial<SwitchNote>;
    if (!isAccountId(n.to) || n.to !== current) return null;
    return { to: n.to, autologin: n.autologin === true };
  } catch {
    return null;
  }
}

/* --------------------------------------------------------- active account */

const fallbackDef = (): AccountDef => {
  const d = DEFS[0];
  if (!d) throw new Error('No accounts in canon.');
  return d;
};

const _id = signal<AccountId>('analyst');
const _def = signal<AccountDef>(byId.get('analyst') ?? fallbackDef());
export const activeId: ReadonlySignal<AccountId> = _id;
export const activeDef: ReadonlySignal<AccountDef> = _def;

/** Fix the active account for this page load (main.tsx, before any store loads). */
export function initActive(id: AccountId): AccountDef {
  const def = byId.get(id) ?? fallbackDef();
  _id.value = def.id;
  _def.value = def;
  return def;
}

/** Short operator number used in audit phrasing: "OPR-A03-1147" -> "3-1147" (tier-serial). */
export function operatorShort(def: AccountDef): string {
  const serial = def.pn.replace(/\D/g, '').slice(-4) || def.operatorId.replace(/\D/g, '').slice(-4);
  return `${def.tier}-${serial}`;
}

/** Card number printed on the access card: "TAC-A03-1147". */
export function cardNo(def: AccountDef): string {
  const m = /^([A-Z])[A-Z]*-(\d+)$/.exec(def.site);
  const site = m ? `${m[1]}${m[2]}` : def.site;
  return `TAC-${site}-${def.pn.replace(/\D/g, '').slice(-4)}`;
}
