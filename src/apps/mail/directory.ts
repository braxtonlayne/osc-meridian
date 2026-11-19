/** Message Traffic: the address directory (canon roster, issued account mailboxes, mailboxes seen in traffic). */
import canonJson from '@canon';
import type { Canon, Marking, MarkingId } from '@core/canon-types';
import type { AccountDef } from '@core/contracts';
import { isRx } from '@core/rx';
import { displayFromAddress, type DirEntry } from './model';

export const canon = canonJson as unknown as Canon;

export const MARKINGS: readonly Marking[] = canon.markings;
const markingMap = new Map<MarkingId, Marking>(MARKINGS.map((m) => [m.id, m]));
export const markingOf = (id: MarkingId): Marking | undefined => markingMap.get(id);
export const markingRank = (id: MarkingId): number => markingMap.get(id)?.rank ?? 0;
export const markingLabel = (id: MarkingId): string => markingMap.get(id)?.label ?? id;
export const isMarkingId = (id: string): boolean => markingMap.has(id as MarkingId);
/** Lowest marking in the scheme: the default for new traffic and for an empty view. */
export const LOWEST_MARKING: MarkingId = [...MARKINGS].sort((a, b) => a.rank - b.rank)[0]?.id ?? 'TSSCI-OSC';

/** Roster entries; redacted names and addresses stay as sentinels. */
export const ROSTER_DIR: DirEntry[] = canon.roster.map((p) => ({ address: p.email, name: p.name, role: p.role, site: p.site, pn: p.pn }));

/**
 * Roster with Tier 2 sentinels replaced from the CANON-T2 release (keys roster.<pn>.name / .email).
 * Pass `t2` only when the session satisfies T2. Tier 1 and compartment sentinels stay.
 */
export function releaseRoster(dir: readonly DirEntry[], t2: Record<string, string> | null): DirEntry[] {
  if (!t2) return dir.slice();
  return dir.map((d) => {
    if (!d.pn) return d;
    const name = isRx(d.name) ? t2[`roster.${d.pn}.name`] : undefined;
    const address = isRx(d.address) ? t2[`roster.${d.pn}.email`] : undefined;
    return name || address ? { ...d, ...(name ? { name } : {}), ...(address ? { address } : {}) } : d;
  });
}

/**
 * Mailboxes of the issued accounts. A holder's personal name is shown only when it is public
 * (in the roster) or released (CANON-T2 `accounts.<id>.name`); otherwise the account's role label.
 */
export function accountEntries(accounts: readonly AccountDef[], roster: readonly DirEntry[], t2: Record<string, string> | null): DirEntry[] {
  return accounts.map((a) => {
    const r = roster.find((d) => d.pn === a.pn);
    const released = t2?.[`accounts.${a.id}.name`];
    const name = released || (r && !isRx(r.name) ? r.name : a.displayName);
    return { address: a.email, name, role: a.roleTitle, site: a.site, pn: a.pn, account: a.id };
  });
}

export interface DirectoryOptions {
  accounts?: readonly AccountDef[];
  t2?: Record<string, string> | null;
  /** Tier 4 sessions see only their own site's roster and mailboxes met in their own traffic. */
  restrictToSite?: string | null;
  self?: string;
}

export function buildDirectory(seen: Iterable<string>, opts: DirectoryOptions = {}): DirEntry[] {
  const seenList = [...seen];
  const seenSet = new Set(seenList.map((a) => a.toLowerCase()));
  const site = opts.restrictToSite ?? null;
  const roster = releaseRoster(ROSTER_DIR, opts.t2 ?? null);
  const out: DirEntry[] = [];
  const have = new Set<string>();
  const add = (d: DirEntry) => {
    const k = d.address.toLowerCase();
    if (!isRx(d.address)) {
      if (have.has(k)) return;
      have.add(k);
    }
    out.push(d);
  };
  for (const a of accountEntries(opts.accounts ?? [], roster, opts.t2 ?? null)) {
    if (site && a.address.toLowerCase() !== (opts.self ?? '').toLowerCase() && !seenSet.has(a.address.toLowerCase())) continue;
    add(a);
  }
  for (const d of roster) {
    if (site && d.site !== site && !(!isRx(d.address) && seenSet.has(d.address.toLowerCase()))) continue;
    add(d);
  }
  for (const a of seenList) {
    if (!a.includes('@') || have.has(a.toLowerCase())) continue;
    add({ address: a, name: displayFromAddress(a), role: 'Mailbox (from message traffic)' });
  }
  return out;
}

/** Display name for an address: directory name when it is released, else the address form. */
export function nameFor(address: string, dir: readonly DirEntry[]): string {
  const d = dir.find((x) => !isRx(x.address) && x.address.toLowerCase() === address.toLowerCase());
  if (d && !isRx(d.name)) return d.name;
  return displayFromAddress(address);
}
