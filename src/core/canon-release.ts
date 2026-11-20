/**
 * CANON-T2: the Tier 2 values the client canon withholds (docs/canon/extended-c.md,
 * "Restricted values"). scripts/canon-merge.ts writes them, encoded with the release codec
 * under key CANON-T2, to public/data/releases/<releaseFileName('CANON-T2')>.json.
 *
 * Keys are dot paths matching the client canon sentinels they replace:
 *   roster.<pn>.name, roster.<pn>.email          Tier 2 roster names and addresses
 *   facilities.<id>.levels.<n>.name / .notes     Tier 2 level designations
 *   facilities.<GAMMA id>.depthFt                GAMMA depth of record (number as a string)
 *   facilities.<GAMMA id>.coverStory             GAMMA cover stories outside the home network
 *   reserves.<id>.label / .text / .value         Tier 2 reserve items
 *   accounts.<accountId>.name / .rosterEmail     holder of a Tier 2 account (the deputy)
 * Tier 1 and compartment-keyed values are never in it.
 *
 * Obfuscated, not secret (see release-codec.ts). Callers must only call loadCanonT2() when the
 * session satisfies T2 (`services.clearance.satisfies('T2')`).
 */
import { asset } from './base';
import { decodeRelease, releaseFileName } from './release-codec';

export const CANON_T2_KEY = 'CANON-T2';

/** Path of the release file relative to the public root. */
export const canonT2Path = (): string => `data/releases/${releaseFileName(CANON_T2_KEY)}.json`;

let pending: Promise<Record<string, string>> | null = null;

/** Fetch and decode the CANON-T2 release (cached; a failed fetch is retried on the next call). */
export function loadCanonT2(): Promise<Record<string, string>> {
  pending ??= fetch(asset(canonT2Path()))
    .then((r) => {
      if (!r.ok) throw new Error(`CANON-T2 release: HTTP ${r.status}`);
      return r.json() as Promise<unknown>;
    })
    .then((payload) => decodeRelease(CANON_T2_KEY, payload))
    .catch((e: unknown) => {
      pending = null;
      throw e;
    });
  return pending;
}

/** Dot-path helpers for the common lookups. */
export const t2Path = {
  rosterName: (pn: string) => `roster.${pn}.name`,
  rosterEmail: (pn: string) => `roster.${pn}.email`,
  accountName: (accountId: string) => `accounts.${accountId}.name`,
  gammaDepth: (facilityId: string) => `facilities.${facilityId}.depthFt`,
};

/** Roster names in a CANON-T2 map, by personnel number (for @graphics/org `releasedNames`). */
export function t2RosterNames(map: Record<string, string> | null | undefined): Record<string, string> | undefined {
  if (!map) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (k.startsWith('roster.') && k.endsWith('.name')) out[k.slice(7, -5)] = v;
  }
  return out;
}
