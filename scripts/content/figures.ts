/**
 * Headline-figure drift rules (SPEC §6: "A test greps built pages for headline figures and fails
 * on drift"). Values come from canon; the phrases are the labels pages use when they claim the
 * figure. Emitted to .generated/canon-figures.json and enforced by scripts/verify-dist.ts:
 *
 *  - mismatch: the first number printed within `window` characters after a trigger phrase must
 *    equal the canon value (e.g. "sustained capacity of 23,400").
 *  - presence: if `requirePresence`, any page whose text matches the trigger must also print the
 *    canon value somewhere (formatted with separators).
 *
 * Content authors: write these phrases only when you mean the programme-wide figure, and print
 * the value with :c[...] so it can never drift.
 */
import { resolvePath, type CanonData } from './canon.ts';
import { formatNumber } from './util.ts';

export interface FigureRule {
  id: string;
  canonPath: string;
  value: number;
  formatted: string;
  label: string;
  trigger: string; // RegExp source, case-insensitive
  window: number;
  requirePresence: boolean;
}

const RULES: Omit<FigureRule, 'value' | 'formatted'>[] = [
  {
    id: 'tunnelCertifiedMi',
    canonPath: 'headline.tunnelCertifiedMi',
    label: 'certified mileage',
    trigger: String.raw`\bcertified\s+(?:(?:network|tunnel|transit|route|system|total)\s+){0,2}(?:mileage|miles|route[- ]miles|length)\b`,
    window: 40,
    requirePresence: true,
  },
  {
    id: 'capacitySustained',
    canonPath: 'headline.capacitySustained',
    label: 'sustained capacity',
    trigger: String.raw`\bsustained\s+capacity\b`,
    window: 40,
    requirePresence: true,
  },
  {
    id: 'capacitySurge',
    canonPath: 'headline.capacitySurge',
    label: 'total surge berthing',
    trigger: String.raw`\b(?:total|aggregate|programme|program|combined|network[- ]wide)\s+surge\s+berthing\b`,
    window: 40,
    requirePresence: true,
  },
  {
    id: 'staffTotal',
    canonPath: 'headline.staffTotal',
    label: 'total personnel',
    trigger: String.raw`\btotal\s+personnel\b`,
    window: 40,
    requirePresence: true,
  },
  {
    id: 'staffPosted',
    canonPath: 'headline.staffPosted',
    label: 'total posted staff',
    trigger: String.raw`\b(?:total|aggregate)\s+posted\s+(?:staff|personnel|strength)\b`,
    window: 40,
    requirePresence: true,
  },
  {
    id: 'staffUnposted',
    canonPath: 'headline.staffUnposted',
    label: 'DETACHED / UNPOSTED',
    trigger: String.raw`\bdetached\s*/\s*unposted\b`,
    window: 24,
    requirePresence: false,
  },
  {
    id: 'programCostB',
    canonPath: 'headline.programCostB',
    label: 'total programme cost',
    trigger: String.raw`\btotal\s+(?:programme|program)\s+cost\b`,
    window: 40,
    requirePresence: false,
  },
];

export function figureRules(canon: CanonData | null): FigureRule[] {
  if (!canon) return [];
  const out: FigureRule[] = [];
  for (const r of RULES) {
    const res = resolvePath(canon, r.canonPath);
    if (!res.found || typeof res.value !== 'number') continue;
    out.push({ ...r, value: res.value, formatted: formatNumber(res.value) });
  }
  return out;
}

/** Shared by verify-dist and tests: numbers in a text window ("$287B", "23,400", "16.4"). */
export const NUMBER_RE = /(?<![\w.-])(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

export interface DriftProblem {
  rule: string;
  message: string;
}

export function checkDrift(text: string, rules: FigureRule[]): DriftProblem[] {
  const problems: DriftProblem[] = [];
  for (const r of rules) {
    const re = new RegExp(r.trigger, 'gi');
    let m: RegExpExecArray | null;
    let claimed = false;
    while ((m = re.exec(text))) {
      claimed = true;
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + r.window);
      const num = new RegExp(NUMBER_RE.source).exec(after);
      if (num) {
        const v = Number(num[0].replace(/,/g, ''));
        if (v !== r.value) {
          problems.push({
            rule: r.id,
            message: `"${m[0]}" is followed by ${num[0]}, canon ${r.canonPath} is ${r.formatted}`,
          });
        }
      }
    }
    if (claimed && r.requirePresence && !text.includes(r.formatted)) {
      problems.push({ rule: r.id, message: `mentions "${r.label}" but never prints ${r.formatted}` });
    }
  }
  return problems;
}
