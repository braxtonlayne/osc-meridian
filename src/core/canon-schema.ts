/**
 * Zod schema mirroring src/core/canon-types.ts. Used by scripts/canon-merge.ts to
 * validate content/canon/canon.json before it is written. Objects are strict (unknown
 * keys fail) and numbers must be finite; counts are integers.
 *
 * Structural checks only live here. Cross-field checks (sums, counts, date ceiling)
 * live in `canonCrossChecks` below so the merge script and tests share them.
 */
import { z } from 'zod';
import type { Canon, FacilityId, RxString } from './canon-types';

export const DATE_CEILING = '2008-05-31';

const num = z.number().finite();
const int = z.number().int().finite();
const nonNegInt = int.nonnegative();
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const FACILITY_ID_RE = /^(ALPHA|BETA|GAMMA|DELTA)-\d{2}$/;
const facilityId = z.custom<FacilityId>((v) => typeof v === 'string' && FACILITY_ID_RE.test(v), {
  message: 'facility id must look like ALPHA-01',
});

const classId = z.enum(['ALPHA', 'BETA', 'GAMMA', 'DELTA']);
const tierNo = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const markingId = z.enum(['TSSCI-OSC', 'UMBRA-R', 'UMBRA-C', 'UMBRA-U', 'UMBRA-EO']);
const bearing = z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
const networkId = z.enum(['EASTERN', 'SOUTHERN', 'MOUNTAIN_WESTERN', 'CENTRAL']);
const compartmentId = z.enum(['KESTREL', 'HOLLOW', 'SEXTANT', 'TALLOW', 'BRIAR', 'QUARRY', 'LANTERN']);

const staffLine = z.strictObject({ role: z.string().min(1), count: nonNegInt });

const marking = z.strictObject({
  id: markingId,
  label: z.string().min(1),
  sourceLabel: z.string().min(1),
  rank: int.min(0).max(4),
  bannerBg: hex,
  bannerFg: hex,
  usage: z.string().min(1),
});

const anchor = z.strictObject({
  miles: num.positive().optional(),
  bearing: bearing.optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  cityLat: num.min(-90).max(90),
  cityLon: num.min(-180).max(180),
  areaLabel: z.string().min(1).optional(),
});

const facilityLevel = z.strictObject({
  n: nonNegInt,
  name: z.string().min(1),
  topFt: num.nonnegative(),
  heightFt: num.positive(),
  tier: tierNo,
  notes: z.string(),
});

export const facilitySchema = z.strictObject({
  id: facilityId,
  class: classId,
  codename: z.string().nullable(),
  locationText: z.string().min(1),
  anchor,
  lat: num.min(-90).max(90).optional(),
  lon: num.min(-180).max(180).optional(),
  terrain: z.string().nullable(),
  coverIdentity: z.string().nullable(),
  coverStory: z.string().nullable(),
  depthFt: num.nonnegative().nullable(),
  completed: z.string().nullable(),
  capacity: nonNegInt,
  sustainedMonths: num.positive().nullable(),
  staff: nonNegInt,
  staffBreakdown: z.array(staffLine),
  function: z.string().min(1),
  connectionsText: z.string().nullable(),
  network: networkId.nullable(),
  reactor: z.boolean(),
  commanderId: z.string().nullable(),
  levels: z.array(facilityLevel).optional(),
  origin: z.enum(['source', 'extended', 'mixed']),
});

const facilityClass = z.strictObject({
  id: classId,
  name: z.string().min(1),
  depthText: z.string().min(1),
  depthMinFt: num.nonnegative().nullable(),
  depthMaxFt: num.nonnegative().nullable(),
  sustainabilityText: z.string().min(1),
  sustainDaysMin: num.nonnegative().nullable(),
  sustainDaysMax: num.nonnegative().nullable(),
  transitEntitlement: z.string().min(1),
  bullets: z.array(z.string()),
  count: nonNegInt,
  statedCapacity: nonNegInt,
  statedStaff: nonNegInt,
});

const railSegment = z.strictObject({
  no: z.string().regex(/^\d{2}$/),
  a: facilityId,
  b: facilityId,
  routeNote: z.string(),
  miles: num.positive(),
  hours: num.positive(),
  completed: z.string(),
  status: z.enum(['IN REVENUE SERVICE', 'NOT IN REVENUE SERVICE']),
});

const tramLink = z.strictObject({
  from: facilityId,
  to: facilityId,
  label: z.string(),
  miles: num.positive(),
  hours: num.positive(),
  kind: z.enum(['BETA', 'GAMMA']),
});

const tramNetwork = z.strictObject({
  id: networkId,
  name: z.string().min(1),
  hubs: z.array(facilityId),
  links: z.array(tramLink),
  statedTotalMi: num.positive(),
});

const tier = z.strictObject({
  tier: tierNo,
  name: z.string().min(1),
  count: nonNegInt,
  composition: z.union([z.array(staffLine), z.array(z.string())]),
  clearance: z.string().min(1),
  clearanceMarking: markingId.nullable(),
  knowledgeScope: z.string().min(1),
});

const phase = z.strictObject({
  n: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  years: z.string(),
  startYear: int,
  endYear: int,
  title: z.string(),
  status: z.enum(['COMPLETE', 'ACTIVE', 'PROJECTED']),
  recruited: nonNegInt.nullable(),
  cumulative: nonNegInt.nullable(),
  targetPct: num.nullable(),
  targetCount: nonNegInt.nullable(),
  items: z.array(z.string()),
});

const budgetCategory = z.strictObject({ id: z.string(), name: z.string(), amountB: num, pct: num });
const fundingSource = z.strictObject({ id: z.string(), name: z.string(), pct: num, amountB: num });
const lineItem = z.strictObject({
  no: z.string().regex(/^LI-\d{3}$/),
  department: z.enum(['DOD', 'DOE', 'DHS', 'FEMA']),
  sourceId: z.string(),
  categoryId: z.string(),
  title: z.string().min(1),
  account: z.string().min(1),
  amountM: num.nonnegative(),
  fy: z.record(z.string().regex(/^FY20(0[1-8])$/), num.nonnegative()),
});

const coverEntry = z.strictObject({
  facility: facilityId,
  coverAgency: z.string().min(1),
  coverFacilityType: z.string().min(1),
  visibleSurfaceStaff: nonNegInt,
  publicRecordsPosture: z.string(),
  lastCoverReview: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const contractor = z.strictObject({
  id: z.string().regex(/^PC-\d{2}$/),
  name: z.string().min(1),
  trade: z.string().min(1),
  subcontractors: nonNegInt,
  sites: z.array(facilityId),
  compartmentNote: z.string(),
});

const reactor = z.strictObject({
  id: z.string(),
  site: facilityId,
  designation: z.string(),
  type: z.string(),
  thermalMWt: num.nonnegative(),
  electricMWe: num.nonnegative(),
  commissioned: z.string(),
  status: z.enum(['NOMINAL', 'DEGRADED', 'FAULT', 'OFFLINE']),
  statusNote: z.string(),
});

const division = z.strictObject({
  id: z.string(),
  name: z.string(),
  site: facilityId.nullable(),
  mandate: z.string(),
  headId: z.string().nullable(),
});

const person = z.strictObject({
  pn: z.string(),
  name: z.string(),
  rank: z.string().nullable(),
  role: z.string(),
  tier: tierNo,
  site: z.union([facilityId, z.literal('DETACHED / UNPOSTED')]),
  divisionId: z.string().nullable(),
  email: z.string(),
  notes: z.string(),
});

const compartment = z.strictObject({
  id: compartmentId,
  name: z.string(),
  scope: z.string(),
  briefingDocNo: z.string(),
});

const councilSeat = z.strictObject({
  seat: int.min(1).max(11),
  category: z.string(),
  holderLabel: z.string(),
  since: z.string(),
  notes: z.string(),
});

const charterArticle = z.strictObject({ n: int.min(1).max(7), title: z.string(), text: z.string().min(1) });
const glossaryTerm = z.strictObject({ term: z.string().min(1), def: z.string().min(1), seeAlso: z.array(z.string()) });

const anomaly = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  figures: z.record(z.string(), z.union([num, z.string()])),
  canonAnswer: z.string().min(1),
  origin: z.enum(['brief', 'extractor']),
});

const labelText = z.strictObject({ label: z.string(), text: z.string() });
const threat = z.strictObject({ id: z.string(), label: z.string(), response: z.string() });

/** Personnel number: P-<tier at issue>-<intake year 01..08>-<serial>, e.g. P-3-06-1147. */
export const PN_RE = /^P-[1-4]-(0[1-8])-\d{4}$/;

export const canonSchema = z.strictObject({
  meta: z.strictObject({
    environment: z.string(),
    release: z.string(),
    agency: z.string(),
    inWorldDate: z.string(),
    sourceDocNo: z.string(),
    sourceRevision: z.string(),
  }),
  headline: z.strictObject({
    facilities: nonNegInt,
    hubs: nonNegInt,
    capacitySustained: nonNegInt,
    capacitySurge: nonNegInt,
    staffTotal: nonNegInt,
    staffPosted: nonNegInt,
    staffUnposted: nonNegInt,
    utilizationPct: num,
    programCostB: num,
    tunnelCertifiedMi: num,
    railEngineeringMi: num,
    tramEngineeringMi: num,
    tramLinkSumMi: num,
  }),
  markings: z.array(marking).length(5),
  classes: z.array(facilityClass).length(4),
  facilities: z.array(facilitySchema),
  transitTech: z.record(z.string(), z.string()),
  railSegments: z.array(railSegment),
  tramNetworks: z.array(tramNetwork),
  tiers: z.array(tier).length(4),
  ratioModel: z.strictObject({
    basis: z.string(),
    capacity: nonNegInt,
    rows: z.array(z.strictObject({ function: z.string(), pct: num, count: nonNegInt })),
    note: z.string(),
  }),
  phases: z.array(phase).length(5),
  security: z.strictObject({
    construction: z.array(labelText),
    personnel: z.strictObject({
      investigation: z.string(),
      focusAreas: z.array(z.string()),
      compartmentation: z.string(),
      communications: z.string(),
    }),
  }),
  reserves: z.strictObject({
    basisNote: z.string(),
    items: z.array(
      z.strictObject({
        id: z.string(),
        category: z.enum(['FOOD', 'WATER', 'MEDICAL', 'ENERGY', 'ARMAMENTS']),
        label: z.string(),
        value: num.nullable(),
        unit: z.string(),
        text: z.string(),
        site: facilityId.nullable(),
        tier: tierNo,
      }),
    ),
  }),
  budget: z.strictObject({
    totalB: num,
    categories: z.array(budgetCategory),
    sources: z.array(fundingSource),
    lineItemCount: nonNegInt,
    departments: z.array(z.string()),
    auditNote: z.string(),
    fiscalYears: z.array(z.strictObject({ fy: z.string(), totalM: num })),
    lineItems: z.array(lineItem),
  }),
  contractors: z.strictObject({
    primeCount: nonNegInt,
    avgSubs: num,
    maxSitesKnown: nonNegInt,
    register: z.array(contractor),
  }),
  expansion: z.strictObject({ phase4: z.array(z.string()), phase5: z.array(z.string()) }),
  threats: z.strictObject({ external: z.array(threat), internal: z.array(threat) }),
  classificationControl: z.array(labelText),
  legalNotice: z.string().min(1),
  charter: z.array(charterArticle),
  council: z.strictObject({ composition: z.array(staffLine), seats: z.array(councilSeat) }),
  reactors: z.array(reactor),
  divisions: z.array(division),
  compartments: z.array(compartment),
  roster: z.array(person),
  glossary: z.array(glossaryTerm),
  docNumbering: z.array(z.strictObject({ family: z.string(), pattern: z.string(), example: z.string(), notes: z.string() })),
  personnelNumberFormat: z.strictObject({ pattern: z.string(), example: z.string(), notes: z.string() }),
  anomalies: z.array(anomaly),
  threatDetail: z.array(
    z.strictObject({
      id: z.string().min(1),
      group: z.enum(['external', 'internal']),
      label: z.string().min(1),
      ownerDivision: z.string().min(1),
      ownerDivisionId: z.string().nullable(),
      contingency: z.array(z.string()),
      protocol: z.strictObject({
        designation: z.string().min(1),
        title: z.string().nullable(),
        titleWithheld: z.boolean(),
        pageCount: int.positive(),
        revision: nonNegInt,
        withholdingAuthority: z.string(),
        ref: z.string(),
      }),
    }),
  ),
  coverCatalogue: z.array(coverEntry),
  realEvents: z.array(
    z.strictObject({
      id: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dateText: z.string(),
      publicEvent: z.string().min(1),
      oscExplanation: z.string().min(1),
      citedIn: z.string(),
    }),
  ),
  calendar: z.array(
    z.strictObject({
      id: z.string().min(1),
      date: z.string().regex(/^2008-05-\d{2}$/),
      dateText: z.string(),
      startZ: z.string().regex(/^\d{4}Z$/).nullable(),
      endZ: z.string().regex(/^\d{4}Z$/).nullable(),
      timeText: z.string(),
      facility: facilityId,
      title: z.string().min(1),
      category: z.string().min(1),
      originator: z.string(),
      tier: tierNo,
      note: z.string(),
    }),
  ),
  budgetNotes: z.array(z.string()),
  anomalyNotes: z.record(
    z.string(),
    z.strictObject({
      noticedBy: z.string(),
      closedBy: z.string().optional(),
      actionOfficer: z.string().optional(),
      documents: z.array(z.string()),
      compartment: compartmentId.nullable(),
      notes: z.string(),
    }),
  ),
  operator: z.strictObject({
    operatorId: z.string().min(1),
    passphrase: z.string().min(1),
    pn: z.string().regex(PN_RE),
    displayName: z.string(),
    tier: tierNo,
    site: facilityId,
    divisionId: z.string(),
    compartments: z.array(compartmentId),
    probationStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    supervisorPn: z.string().regex(PN_RE),
    email: z.string(),
  }),
});

export type CanonParsed = z.infer<typeof canonSchema>;

/**
 * The client canon (content/canon/canon.client.json, generated by canon-merge) has the
 * same shape, but redacted coordinates are null and a redacted state is a sentinel
 * string (src/core/rx.ts). Every other field keeps the full-canon rules.
 */
const clientAnchor = anchor.extend({
  miles: num.positive().nullable().optional(),
  bearing: bearing.nullable().optional(),
  state: z.string().min(1),
  cityLat: num.min(-90).max(90).nullable(),
  cityLon: num.min(-180).max(180).nullable(),
});
const clientFacility = facilitySchema.extend({
  anchor: clientAnchor,
  lat: num.min(-90).max(90).nullable().optional(),
  lon: num.min(-180).max(180).nullable().optional(),
  capacity: nonNegInt.nullable(),
  staff: nonNegInt.nullable(),
  reactor: z.boolean().nullable(),
});
const rxString = z.custom<RxString>((v) => typeof v === 'string' && /^\[\[RX:[A-Z0-9+]+:\d+\]\]$/.test(v), {
  message: 'expected a redaction sentinel',
});
const clientCover = coverEntry.extend({
  visibleSurfaceStaff: nonNegInt.nullable(),
  lastCoverReview: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), rxString]),
});
const clientContractor = contractor.extend({ sites: z.array(z.union([facilityId, rxString])) });
export const clientCanonSchema = canonSchema.extend({
  facilities: z.array(clientFacility),
  reactors: z.array(reactor.extend({ site: z.union([facilityId, rxString]) })),
  coverCatalogue: z.array(clientCover),
  contractors: canonSchema.shape.contractors.extend({ register: z.array(clientContractor) }),
});

const _clientAssignable = (c: z.infer<typeof clientCanonSchema>): Canon => c;
void _clientAssignable;

// Compile-time guard: the schema's output must be assignable to the Canon contract.
const _assignable = (c: CanonParsed): Canon => c;
void _assignable;

/** Options for cross-checks that only apply once extended data is merged. */
export interface CrossCheckOptions {
  /** extended-a.json was present: require all 47 facilities. */
  extendedA: boolean;
}

/**
 * Cross-field checks. Returns a list of error strings (empty = pass).
 */
export function canonCrossChecks(c: Canon, opts: CrossCheckOptions): string[] {
  const errs: string[] = [];
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  // Facility ids unique.
  const ids = new Set<string>();
  for (const f of c.facilities) {
    if (ids.has(f.id)) errs.push(`duplicate facility id ${f.id}`);
    ids.add(f.id);
    if (!f.id.startsWith(`${f.class}-`)) errs.push(`${f.id}: class ${f.class} does not match id`);
  }

  // Facility count and class counts.
  if (opts.extendedA && c.facilities.length !== 47) errs.push(`expected 47 facilities, found ${c.facilities.length}`);
  for (const k of c.classes) {
    const n = c.facilities.filter((f) => f.class === k.id).length;
    const required = opts.extendedA || k.id !== 'DELTA';
    if (required && n !== k.count) errs.push(`class ${k.id}: ${n} facilities, class count says ${k.count}`);
    if (!required && n !== 0 && n !== k.count) errs.push(`class ${k.id}: ${n} facilities, class count says ${k.count}`);
  }

  // Tier sum.
  const tierSum = sum(c.tiers.map((t) => t.count));
  if (tierSum !== 3847) errs.push(`tier sum ${tierSum} !== 3847`);
  if (tierSum !== c.headline.staffTotal) errs.push(`tier sum ${tierSum} !== headline.staffTotal ${c.headline.staffTotal}`);
  for (const t of c.tiers) {
    const comp = t.composition;
    if (comp.length > 0 && typeof comp[0] === 'object') {
      const s = sum((comp as { count: number }[]).map((l) => l.count));
      if (s !== t.count) errs.push(`tier ${t.tier} composition sums to ${s}, count is ${t.count}`);
    }
  }

  // Breakdown sums.
  for (const f of c.facilities) {
    if (f.staffBreakdown.length > 0) {
      const s = sum(f.staffBreakdown.map((l) => l.count));
      if (s !== f.staff) errs.push(`${f.id}: staffBreakdown sums to ${s}, staff is ${f.staff}`);
    }
    if (!(typeof f.lat === 'number' && typeof f.lon === 'number')) errs.push(`${f.id}: lat/lon not computed`);
  }

  // Ratio model rows.
  const ratioPct = sum(c.ratioModel.rows.map((r) => r.pct));
  if (Math.abs(ratioPct - 100) > 1e-9) errs.push(`ratio model pct sums to ${ratioPct}`);
  for (const r of c.ratioModel.rows) {
    if (Math.round((r.pct / 100) * c.ratioModel.capacity) !== r.count) errs.push(`ratio row ${r.function}: count mismatch`);
  }

  // Budget.
  const catSum = sum(c.budget.categories.map((k) => k.amountB));
  if (Math.abs(catSum - c.budget.totalB) > 1e-9) errs.push(`budget categories sum ${catSum} !== ${c.budget.totalB}`);
  const srcPct = sum(c.budget.sources.map((s) => s.pct));
  if (Math.abs(srcPct - 100) > 1e-9) errs.push(`funding source pct sums to ${srcPct}`);
  if (c.budget.lineItems.length > 0) {
    if (c.budget.lineItems.length !== c.budget.lineItemCount)
      errs.push(`lineItems length ${c.budget.lineItems.length} !== lineItemCount ${c.budget.lineItemCount}`);
    for (const k of c.budget.categories) {
      const s = sum(c.budget.lineItems.filter((li) => li.categoryId === k.id).map((li) => li.amountM));
      if (Math.abs(s - k.amountB * 1000) > 0.5) errs.push(`line items for ${k.id} sum to ${s}M, category is ${k.amountB * 1000}M`);
    }
    const catIds = new Set(c.budget.categories.map((k) => k.id));
    const srcIds = new Set(c.budget.sources.map((s) => s.id));
    for (const li of c.budget.lineItems) {
      if (!catIds.has(li.categoryId)) errs.push(`${li.no}: unknown categoryId ${li.categoryId}`);
      if (!srcIds.has(li.sourceId)) errs.push(`${li.no}: unknown sourceId ${li.sourceId}`);
    }
  }

  // Contractors.
  for (const k of c.contractors.register) {
    if (k.sites.length > c.contractors.maxSitesKnown) errs.push(`${k.id}: knows ${k.sites.length} sites (max ${c.contractors.maxSitesKnown})`);
    for (const s of k.sites) if (!ids.has(s) && opts.extendedA) errs.push(`${k.id}: unknown site ${s}`);
  }
  if (c.contractors.register.length > 0) {
    if (c.contractors.register.length !== c.contractors.primeCount)
      errs.push(`contractor register has ${c.contractors.register.length}, primeCount is ${c.contractors.primeCount}`);
    const avg = sum(c.contractors.register.map((k) => k.subcontractors)) / c.contractors.register.length;
    if (Math.abs(avg - c.contractors.avgSubs) >= 0.05) errs.push(`contractor mean subs ${avg.toFixed(3)} does not round to ${c.contractors.avgSubs}`);
  }

  // Transit references.
  for (const s of c.railSegments) for (const id of [s.a, s.b]) if (!ids.has(id)) errs.push(`rail segment ${s.no}: unknown ${id}`);
  for (const n of c.tramNetworks) for (const l of n.links) for (const id of [l.from, l.to]) if (!ids.has(id)) errs.push(`tram ${n.id}: unknown ${id}`);

  // Reactors: source says 8 installations, 5 ALPHA sites and 3 BETA sites.
  const rxSites = c.facilities.filter((f) => f.reactor);
  if (opts.extendedA) {
    const nA = rxSites.filter((f) => f.class === 'ALPHA').length;
    const nB = rxSites.filter((f) => f.class === 'BETA').length;
    if (nA !== 5 || nB !== 3 || rxSites.length !== 8) errs.push(`reactor sites: ${nA} ALPHA + ${nB} BETA (${rxSites.length} total); source says 5 + 3`);
  }
  if (c.reactors.length > 0) {
    if (c.reactors.length !== 8) errs.push(`reactors: ${c.reactors.length} records, source says 8`);
    for (const r of c.reactors) if (!rxSites.some((f) => f.id === r.site)) errs.push(`reactor ${r.id}: site ${r.site} is not flagged reactor:true`);
  }

  // Extended-b additions reference source ids.
  const threatIds = new Set([...c.threats.external, ...c.threats.internal].map((t) => t.id));
  for (const t of c.threatDetail) if (!threatIds.has(t.id)) errs.push(`threatDetail ${t.id}: no such threat`);
  for (const e of c.coverCatalogue) if (!ids.has(e.facility)) errs.push(`coverCatalogue: unknown facility ${e.facility}`);
  for (const e of c.calendar) if (!ids.has(e.facility) && (opts.extendedA || !e.facility.startsWith('DELTA-'))) errs.push(`calendar ${e.id}: unknown facility ${e.facility}`);

  for (const [k, n] of Object.entries(c.anomalyNotes)) {
    if (!c.anomalies.some((a) => a.id === k)) errs.push(`anomalyNotes.${k}: no such anomaly`);
    if (c.roster.length > 0) {
      for (const pn of [n.noticedBy, n.closedBy, n.actionOfficer]) {
        if (pn && !c.roster.some((p) => p.pn === pn)) errs.push(`anomalyNotes.${k}: ${pn} not in roster`);
      }
    }
  }

  // Markings: ranks 0..4 unique.
  const ranks = new Set(c.markings.map((m) => m.rank));
  if (ranks.size !== 5) errs.push('marking ranks must be unique 0..4');

  // Operator PN in the declared format.
  if (!PN_RE.test(c.operator.pn)) errs.push(`operator pn ${c.operator.pn} not in personnel number format`);
  for (const p of c.roster) if (!PN_RE.test(p.pn)) errs.push(`roster pn ${p.pn} not in personnel number format`);
  if (c.roster.length > 0) {
    const pns = new Set<string>();
    for (const p of c.roster) {
      if (pns.has(p.pn)) errs.push(`duplicate roster pn ${p.pn}`);
      pns.add(p.pn);
    }
    if (!pns.has(c.operator.supervisorPn)) errs.push(`operator.supervisorPn ${c.operator.supervisorPn} not in roster`);
    if (pns.has(c.operator.pn)) errs.push(`operator.pn ${c.operator.pn} must not appear in the roster`);
  }

  // Date ceiling: any ISO-like date string anywhere must be <= 2008-05-31.
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'string') {
      const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v);
      if (m) {
        const iso = `${m[1]}-${m[2]}-${m[3] ?? '01'}`;
        if (iso > DATE_CEILING) errs.push(`${path}: date ${v} is after ${DATE_CEILING}`);
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(c, '');

  return errs;
}
