/** Message Traffic: the address directory (canon roster plus mailboxes seen in delivered traffic). */
import canonJson from '@canon';
import type { Canon, Marking, MarkingId } from '@core/canon-types';
import { isRx } from '@core/rx';
import { displayFromAddress, type DirEntry } from './model';

export const canon = canonJson as unknown as Canon;

export const MARKINGS: readonly Marking[] = canon.markings;
const markingMap = new Map<MarkingId, Marking>(MARKINGS.map((m) => [m.id, m]));
export const markingOf = (id: MarkingId): Marking | undefined => markingMap.get(id);
export const markingRank = (id: MarkingId): number => markingMap.get(id)?.rank ?? 0;
export const markingLabel = (id: MarkingId): string => markingMap.get(id)?.label ?? id;
/** Lowest marking in the scheme: the default for new traffic and for an empty view. */
export const LOWEST_MARKING: MarkingId = [...MARKINGS].sort((a, b) => a.rank - b.rank)[0]?.id ?? 'TSSCI-OSC';

export const SELF_ADDRESS = canon.operator.email;
export const HOME_SITE = canon.operator.site;

/** Roster entries; redacted names and addresses stay as sentinels. */
export const ROSTER_DIR: DirEntry[] = canon.roster.map((p) => ({ address: p.email, name: p.name, role: p.role, site: p.site }));

export function buildDirectory(seen: Iterable<string>): DirEntry[] {
  const out = ROSTER_DIR.slice();
  const have = new Set(out.filter((d) => !isRx(d.address)).map((d) => d.address.toLowerCase()));
  for (const a of seen) {
    const k = a.toLowerCase();
    if (!a.includes('@') || have.has(k)) continue;
    have.add(k);
    out.push({ address: a, name: displayFromAddress(a), role: 'Mailbox (from message traffic)' });
  }
  return out;
}

/** Display name for an address: roster name when it is released, else the address form. */
export function nameFor(address: string, dir: readonly DirEntry[]): string {
  const d = dir.find((x) => !isRx(x.address) && x.address.toLowerCase() === address.toLowerCase());
  if (d && !isRx(d.name)) return d.name;
  return displayFromAddress(address);
}
