/** Records Library: canon lookups and small shared pieces. */
import canonJson from '@canon';
import type { Canon, Marking, MarkingId } from '@core/canon-types';
import { markingStyle } from '@design/index';
import { seriesMatchers } from './lib';

export const canon = canonJson as unknown as Canon;
export const MARKINGS: readonly Marking[] = canon.markings;
export const MATCHERS = seriesMatchers(canon.docNumbering);
export const DIVISIONS: readonly { id: string; name: string }[] = canon.divisions;
export const APP_NAME = 'Records Library';

const markById = new Map(MARKINGS.map((m) => [m.id, m]));
const divById = new Map(DIVISIONS.map((d) => [d.id, d]));

export function marking(id: MarkingId | string): Marking | undefined {
  return markById.get(id as MarkingId);
}
export function markingLabel(id: MarkingId | string): string {
  return marking(id)?.label ?? id;
}
export function markingRank(id: MarkingId | string): number {
  return marking(id)?.rank ?? 0;
}
export function divisionName(id: string): string | undefined {
  return divById.get(id)?.name;
}

export const FAMILY_LABELS: Record<string, string> = {
  registry: 'Facility registry',
  transit: 'Transit',
  personnel: 'Personnel',
  council: 'Council and governance',
  reserves: 'Reserves',
  ledger: 'Ledger',
  assurance: 'Assurance',
  directives: 'Directives',
  forms: 'Forms',
  mail: 'Message traffic',
  system: 'Help and system',
};
export function familyLabel(f: string): string {
  return FAMILY_LABELS[f] ?? f.charAt(0).toUpperCase() + f.slice(1);
}

/** Marking tag in the fictional marking colours (from canon, via custom properties). */
export function MarkingTag({ id }: { id: MarkingId | string }) {
  const m = marking(id);
  return (
    <span class="rec-mk" style={markingStyle(m)}>
      {m?.label ?? id}
    </span>
  );
}
