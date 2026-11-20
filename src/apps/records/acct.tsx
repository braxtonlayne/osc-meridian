/**
 * Pass two: the Tier 4 account sees only documents marked for Tier 4 (`t4`) or written for it
 * (its own variant); every other record is outside its holdings (docs/SPEC-2.md §1, DIR-0301).
 */
import type { RouteEntry, Services } from '@core/contracts';
import { readableByTier4 } from '@core/docs';

export function heldByAccount(services: Services, r: RouteEntry): boolean {
  if (services.session.tier.peek() !== 4) return true;
  return readableByTier4(r) || !!r.variants?.includes(services.account.id.peek());
}
