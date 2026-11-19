/*
 * @graphics/tunnelmap: the certified route schedule.
 *
 * The certified mileage return (Transit Operations, signed quarterly) reports one figure
 * to the Council: canon `headline.tunnelCertifiedMi`. The source gives no list behind it.
 * This file supplies one: the links carried on the return are those with a witnessed
 * acceptance run on file at the return's first cut-off. The schedule was never amended
 * as later links were accepted, which is why it is shorter than rail segment 02 alone.
 *
 * The five links below are whole listed links (no partial certification) and their stated
 * mileages sum exactly to the canon figure. Mileages are read from canon, never typed here;
 * `certified.test.ts` fails if the sum drifts.
 */
import { canon, linkOf, tramId, type LinkId, type TunnelLink } from './links';

export interface CertifiedEntry {
  link: LinkId;
  /** One-line in-world reason the link is carried on the certified return. */
  rationale: string;
}

export const CERTIFIED: readonly CertifiedEntry[] = [
  {
    link: tramId('ALPHA-01', 'BETA-02'),
    rationale: 'First link entered on the return. Acceptance run witnessed by the Council Secretariat.',
  },
  {
    link: tramId('BETA-02', 'GAMMA-03'),
    rationale: 'Certified with the Pittsburgh link as one continuous route from the ALPHA-01 tram platforms.',
  },
  {
    link: tramId('BETA-02', 'GAMMA-04'),
    rationale: 'Certified on the same acceptance run as the DC Metro link.',
  },
  {
    link: tramId('BETA-10', 'GAMMA-07'),
    rationale: 'Certified on the contractor completion certificate. The Chicago link that reaches it was not submitted.',
  },
  {
    link: tramId('ALPHA-05', 'GAMMA-09'),
    rationale: 'Only Southern Network link with a witnessed acceptance run on file at the cut-off.',
  },
];

const rationaleById = new Map<string, string>(CERTIFIED.map((c) => [c.link, c.rationale]));

export function isCertified(id: string): boolean {
  return rationaleById.has(id);
}

export function certifiedRationale(id: string): string | null {
  return rationaleById.get(id) ?? null;
}

/** The certified entries resolved against the link table, in schedule order. */
export function certifiedLinks(): TunnelLink[] {
  const out: TunnelLink[] = [];
  for (const c of CERTIFIED) {
    const l = linkOf(c.link);
    if (l) out.push(l);
  }
  return out;
}

/** Sum of the stated mileage of the certified links. Equals canon 847 (checked by test). */
export function certifiedSumMi(): number {
  return certifiedLinks().reduce((s, l) => s + l.miles, 0);
}

/** The figure printed in the title block: always the canon value, never the computed sum. */
export const CERTIFIED_ROUTE_MILEAGE: number = canon.headline.tunnelCertifiedMi;
