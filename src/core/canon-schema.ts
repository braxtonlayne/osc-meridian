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
import type { AccountId, AppId } from './contracts';

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

// ---- Pass two (extended-c) ----

/** Every AppId (src/core/contracts.ts). Kept here so scripts can validate without importing UI code. */
export const APP_IDS = [
  'registry', 'transit', 'personnel', 'records', 'mail', 'ledger', 'reserves', 'assurance', 'directives', 'forms', 'terminal', 'system',
  'strike', 'isolate', 'drill', 'cctv', 'plant', 'doors', 'dispatch', 'hoist', 'environ', 'pa', 'muster', 'patch',
] as const satisfies readonly AppId[];
// Compile-time guard: every AppId is listed.
const _allApps = (id: AppId): (typeof APP_IDS)[number] => id;
void _allApps;
export const ACCOUNT_IDS = ['analyst', 'lifesupport', 'deputy', 'auditor'] as const satisfies readonly AccountId[];
/** Operator id on the access card: OPR-<class letter><site no>-<pn serial>. */
export const OPERATOR_ID_RE = /^OPR-[ABGD]\d{2}-\d{4}$/;
/** Facility-command accounts whose roster entry has no division carry this division id. */
export const COMMAND_DIVISION_ID = 'CMD';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pos = num.positive();

export const accountDefSchema = z.strictObject({
  id: z.enum(ACCOUNT_IDS),
  operatorId: z.string().regex(OPERATOR_ID_RE),
  passphrase: z.string().regex(/^[a-z]+( [a-z]+){3}$/),
  pn: z.string().regex(PN_RE),
  displayName: z.string().min(1),
  roleTitle: z.string().min(1),
  tier: tierNo,
  site: facilityId,
  divisionId: z.string().min(1),
  compartments: z.array(compartmentId),
  probationStart: isoDate.nullable(),
  email: z.string().regex(/^[a-z0-9.]+@[a-z0-9.]+\.mer$/),
  supervisorPn: z.string().regex(PN_RE).nullable(),
  approves: z.array(z.string().regex(/^OSC-F-\d{3}$/)),
  auditReader: z.boolean(),
  desktop: z.array(z.enum(APP_IDS)).min(1),
  /** Workstation the card is issued on, at the account's own site: "<A03>-<group>-<seat>". */
  workstation: z.string().regex(/^[ABGD]\d{2}-\d-\d{3}$/),
  /** Print queue serving that workstation's group: "PRN-<A03>-<group>". */
  printQueue: z.string().regex(/^PRN-[ABGD]\d{2}-\d$/),
});

const hardeningClassId = z.enum(['H1', 'H2', 'H3', 'H4']);
export const survivabilitySchema = z.strictObject({
  model: z.strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    revision: int.positive(),
    date: isoDate,
    originator: z.string().min(1),
    marking: markingId,
    disclaimer: z.string().min(1),
    method: z.array(z.string().min(1)).min(1),
  }),
  classes: z
    .array(z.strictObject({ id: hardeningClassId, name: z.string().min(1), description: z.string().min(1), ratedPsi: pos, depthCoupling: num.nonnegative() }))
    .length(4),
  gammaPlanningDepthFt: pos,
  conditions: z
    .array(z.strictObject({ id: z.enum(['OPERATIONAL', 'DEGRADED', 'ISOLATED', 'NOT ASSURED']), maxRatio: pos.nullable(), text: z.string().min(1) }))
    .length(4),
  contours: z.array(z.strictObject({ psi: pos, rangeCoeffMi: pos })).min(2),
  yieldsKt: z.array(pos).min(1),
  facilities: z.array(z.strictObject({ facility: facilityId, hardeningClass: hardeningClassId })),
  notModelled: z.strictObject({ classId: z.literal('DELTA'), text: z.string().min(1) }),
});

const drillClassId = z.enum(['ALPHA', 'BETA', 'GAMMA']);
export const sealDrillSchema = z.strictObject({
  timeScale: pos,
  origin: facilityId,
  classes: z.array(z.strictObject({ classId: drillClassId, ackMin: pos, doorCycleMin: pos, sealMin: pos })).length(3),
  relay: z.strictObject({ hubHopMin: pos, tramHopMin: pos, unlinkedMin: pos }),
  rules: z.array(z.string().min(1)).min(1),
  excluded: z.strictObject({ classId: z.literal('DELTA'), text: z.string().min(1) }),
  sequence: z.array(
    z.strictObject({
      facility: facilityId,
      network: networkId.nullable(),
      via: facilityId.nullable(),
      relay: z.enum(['origin', 'rail', 'tram', 'voice']),
      hop: nonNegInt,
      offsetMin: num.nonnegative(),
    }),
  ),
});

const plantLevel = z.strictObject({ n: nonNegInt, name: z.string().min(1) });
const doorDef = z.strictObject({
  id: z.string().regex(/^[ABG]\d{2}-[A-Z]{2}\d+(-[OI])?$/),
  level: nonNegInt,
  location: z.string().min(1),
  kind: z.enum(['portal', 'blast', 'airlock']),
  normal: z.enum(['open', 'closed']),
  cycleSec: pos,
  ratedPsi: pos.nullable(),
  sealsOnDrill: z.boolean(),
  tier: tierNo,
});
const airlockDef = z.strictObject({
  id: z.string().regex(/^[ABG]\d{2}-AL\d+$/),
  level: nonNegInt,
  location: z.string().min(1),
  outer: z.string(),
  inner: z.string(),
  cycleSec: pos,
  deconSec: pos.nullable(),
  tier: tierNo,
});
const siteSource = z.enum(['detailed', 'template']);
const cameraDef = z.strictObject({
  id: z.string().regex(/^[ABG]\d{2}-C\d{2}$/),
  level: nonNegInt,
  location: z.string().min(1),
  kind: z.enum(['corridor', 'portal', 'platform', 'vault', 'hoist', 'plant', 'assembly']),
  ptz: z.boolean(),
  tier: tierNo,
});
const hoist = z.strictObject({
  id: z.string().regex(/^A\d{2}-H\d$/),
  facility: facilityId,
  name: z.string().min(1),
  kind: z.enum(['personnel', 'vehicle', 'freight', 'egress']),
  levels: z.array(nonNegInt).min(2),
  speedFpm: pos,
  accelSec: num.nonnegative(),
  cagePersons: int.positive(),
  payloadLb: pos,
  stops: z.array(z.strictObject({ level: nonNegInt, depthFt: num.nonnegative() })),
  travelFt: pos,
});
const musterPoint = z.strictObject({
  id: z.string().regex(/^[ABG]\d{2}-MP\d+$/),
  level: nonNegInt,
  location: z.string().min(1),
  capacity: int.positive(),
  assigned: nonNegInt,
});

/** canon.apps: one entry per content/canon/apps/<appId>.json (validated by the app's own schema). */
export const canonAppsSchema = z.partialRecord(z.enum(APP_IDS), z.unknown());

export const extendedCShape = {
  accounts: z.array(accountDefSchema),
  survivability: survivabilitySchema,
  sealDrill: sealDrillSchema,
  templateLevels: z.strictObject({ BETA: z.array(plantLevel).min(1), GAMMA: z.array(plantLevel).min(1) }),
  doors: z.array(z.strictObject({ facility: facilityId, source: siteSource, doors: z.array(doorDef), airlocks: z.array(airlockDef) })),
  cameras: z.array(z.strictObject({ facility: facilityId, source: siteSource, cameras: z.array(cameraDef) })),
  hoists: z.array(hoist),
  musterPoints: z.array(z.strictObject({ facility: facilityId, source: siteSource, points: z.array(musterPoint).min(1) })),
};

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
  offices: z.array(z.strictObject({ id: z.string().min(1), name: z.string().min(1), parentDivision: z.string().min(1), site: facilityId.nullable() })),
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
  ...extendedCShape,
  apps: canonAppsSchema,
});

/** Keys that come from extended-c.json (absent when canon is merged without it). */
export const EXTENDED_C_KEYS = Object.keys(extendedCShape) as (keyof typeof extendedCShape)[];

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
  roster: z.array(person.extend({ site: z.union([facilityId, z.literal('DETACHED / UNPOSTED'), rxString]) })),
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

  // Offices hang under an existing division (they are not counted as divisions).
  for (const o of c.offices ?? []) if (!c.divisions.some((d) => d.id === o.parentDivision)) errs.push(`office ${o.id}: unknown parent division ${o.parentDivision}`);

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

  if (Array.isArray(c.accounts)) errs.push(...extendedCChecks(c));

  return errs;
}

/** Landing depth of a facility level: the level floor (topFt + heightFt). */
export const landingDepthFt = (l: { topFt: number; heightFt: number }): number => l.topFt + l.heightFt;

/** Cross-checks for the extended-c keys (accounts and plant data). */
export function extendedCChecks(c: Canon): string[] {
  const errs: string[] = [];
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const plantSites = c.facilities.filter((f) => f.class !== 'DELTA');
  const plantIds = plantSites.map((f) => f.id).sort();
  const fac = new Map(c.facilities.map((f) => [f.id as string, f]));
  const roster = new Map(c.roster.map((p) => [p.pn, p]));
  const sameSet = (label: string, got: string[]) => {
    const g = [...got].sort();
    if (g.length !== new Set(g).size) errs.push(`${label}: duplicate facility`);
    if (JSON.stringify([...new Set(g)]) !== JSON.stringify(plantIds)) errs.push(`${label}: must cover every non-DELTA facility exactly once`);
  };
  /** Level exists at the site (ALPHA: facility levels; BETA/GAMMA: template levels); returns its tier for ALPHA. */
  const levelOf = (site: string, n: number, label: string): { tier: number } | null => {
    const f = fac.get(site);
    if (!f) return (errs.push(`${label}: unknown facility ${site}`), null);
    if (f.class === 'ALPHA') {
      const l = (f.levels ?? []).find((x) => x.n === n);
      if (!l) errs.push(`${label}: ${site} has no level ${n}`);
      return l ?? null;
    }
    if (f.class === 'BETA' || f.class === 'GAMMA') {
      if (!c.templateLevels[f.class].some((x) => x.n === n)) errs.push(`${label}: ${f.class} template has no level ${n}`);
      return null;
    }
    errs.push(`${label}: DELTA sites carry no plant records`);
    return null;
  };

  // Accounts.
  const ids = c.accounts.map((a) => a.id);
  if (JSON.stringify([...ids].sort()) !== JSON.stringify([...ACCOUNT_IDS].sort())) errs.push(`accounts: expected exactly ${ACCOUNT_IDS.join(', ')}`);
  const restrictedNames = c.roster.filter((p) => p.tier <= 2).flatMap((p) => [p.name, p.name.split(' ').pop()!]);
  const seenOp = new Set<string>();
  const seenMail = new Set<string>();
  for (const a of c.accounts) {
    const at = `accounts.${a.id}`;
    if (seenOp.has(a.operatorId)) errs.push(`${at}: duplicate operatorId`);
    if (seenMail.has(a.email)) errs.push(`${at}: duplicate email`);
    seenOp.add(a.operatorId);
    seenMail.add(a.email);
    const f = fac.get(a.site);
    const site2 = f ? `${f.class[0]}${f.id.slice(-2)}` : '';
    if (a.operatorId !== `OPR-${site2}-${a.pn.slice(-4)}`) errs.push(`${at}: operatorId ${a.operatorId} must be OPR-${site2}-${a.pn.slice(-4)}`);
    if (!a.workstation.startsWith(`${site2}-`)) errs.push(`${at}: workstation ${a.workstation} must be at the account's site (${site2})`);
    if (a.printQueue !== `PRN-${a.workstation.slice(0, 5)}`) errs.push(`${at}: printQueue must be PRN-${a.workstation.slice(0, 5)}`);
    for (const s of [a.displayName, a.roleTitle, a.email, a.passphrase])
      for (const n of restrictedNames) if (s.toLowerCase().includes(n.toLowerCase())) errs.push(`${at}: client field contains restricted name "${n}"`);
    if (a.supervisorPn && !roster.has(a.supervisorPn)) errs.push(`${at}: supervisor ${a.supervisorPn} not in roster`);
    if (new Set(a.desktop).size !== a.desktop.length) errs.push(`${at}: desktop lists an app twice`);
    if (a.id === 'analyst') {
      const o = c.operator;
      const mirror: [string, unknown, unknown][] = [
        ['operatorId', a.operatorId, o.operatorId], ['passphrase', a.passphrase, o.passphrase], ['pn', a.pn, o.pn],
        ['displayName', a.displayName, o.displayName], ['tier', a.tier, o.tier], ['site', a.site, o.site], ['divisionId', a.divisionId, o.divisionId],
        ['compartments', JSON.stringify(a.compartments), JSON.stringify(o.compartments)], ['probationStart', a.probationStart, o.probationStart],
        ['supervisorPn', a.supervisorPn, o.supervisorPn], ['email', a.email, o.email],
      ];
      for (const [k, x, y] of mirror) if (x !== y) errs.push(`${at}.${k}: must mirror operator.${k}`);
      continue;
    }
    const p = roster.get(a.pn);
    if (!p) {
      errs.push(`${at}: pn ${a.pn} not in roster`);
      continue;
    }
    if (p.tier !== a.tier) errs.push(`${at}: tier ${a.tier} != roster tier ${p.tier}`);
    if (p.site !== a.site) errs.push(`${at}: site ${a.site} != roster site ${p.site}`);
    if ((p.divisionId ?? COMMAND_DIVISION_ID) !== a.divisionId) errs.push(`${at}: divisionId ${a.divisionId} != roster ${p.divisionId ?? COMMAND_DIVISION_ID}`);
    if (a.divisionId !== COMMAND_DIVISION_ID && !c.divisions.some((d) => d.id === a.divisionId)) errs.push(`${at}: unknown division ${a.divisionId}`);
    if (p.tier > 2 && p.email !== a.email) errs.push(`${at}: email must be the roster address ${p.email}`);
  }

  // Survivability.
  const sv = c.survivability;
  sameSet('survivability.facilities', sv.facilities.map((x) => x.facility));
  if (new Set(sv.classes.map((k) => k.id)).size !== 4) errs.push('survivability.classes: ids must be H1..H4');
  for (let i = 1; i < sv.contours.length; i++) {
    const a = sv.contours[i - 1]!;
    const b = sv.contours[i]!;
    if (!(b.psi > a.psi && b.rangeCoeffMi < a.rangeCoeffMi)) errs.push(`survivability.contours: must ascend in psi and descend in range (${a.psi} -> ${b.psi})`);
  }
  sv.conditions.forEach((k, i) => {
    const last = i === sv.conditions.length - 1;
    if (last !== (k.maxRatio === null)) errs.push('survivability.conditions: only the last condition has maxRatio null');
    if (i > 0 && k.maxRatio !== null && k.maxRatio <= (sv.conditions[i - 1]!.maxRatio ?? Infinity)) errs.push('survivability.conditions: maxRatio must ascend');
  });

  // Seal drill.
  const sd = c.sealDrill;
  for (const k of sd.classes) if (k.sealMin < k.ackMin + k.doorCycleMin) errs.push(`sealDrill ${k.classId}: sealMin ${k.sealMin} < ack + door cycle`);
  sameSet('sealDrill.sequence', sd.sequence.map((s) => s.facility));
  if (sd.sequence[0]?.facility !== sd.origin || sd.sequence[0]?.offsetMin !== 0) errs.push('sealDrill.sequence: must start at the origin at minute 0');
  for (let i = 1; i < sd.sequence.length; i++) if (sd.sequence[i]!.offsetMin < sd.sequence[i - 1]!.offsetMin) errs.push('sealDrill.sequence: offsets must not decrease');

  // Doors.
  sameSet('doors', c.doors.map((s) => s.facility));
  const doorIds = new Set<string>();
  for (const s of c.doors) {
    const f = fac.get(s.facility);
    const byId = new Map(s.doors.map((d) => [d.id, d]));
    for (const d of s.doors) {
      if (doorIds.has(d.id)) errs.push(`doors: duplicate id ${d.id}`);
      doorIds.add(d.id);
      const l = levelOf(s.facility, d.level, `door ${d.id}`);
      if (l && l.tier !== d.tier) errs.push(`door ${d.id}: tier ${d.tier} != level tier ${l.tier}`);
    }
    for (const a of s.airlocks) {
      levelOf(s.facility, a.level, `airlock ${a.id}`);
      for (const k of [a.outer, a.inner]) {
        const d = byId.get(k);
        if (!d || d.kind !== 'airlock' || d.level !== a.level) errs.push(`airlock ${a.id}: ${k} is not an airlock door on level ${a.level}`);
      }
    }
    if (!s.doors.some((d) => d.kind === 'blast' && d.level === 1)) errs.push(`doors ${s.facility}: no blast door at the portal level`);
    const drill = sd.classes.find((k) => k.classId === f?.class);
    const slowest = Math.max(0, ...s.doors.filter((d) => d.sealsOnDrill).map((d) => d.cycleSec));
    if (drill && slowest > drill.doorCycleMin * 60) errs.push(`doors ${s.facility}: a door cycles in ${slowest}s, over the class door cycle`);
  }

  // Cameras.
  sameSet('cameras', c.cameras.map((s) => s.facility));
  const camIds = new Set<string>();
  for (const s of c.cameras)
    for (const k of s.cameras) {
      if (camIds.has(k.id)) errs.push(`cameras: duplicate id ${k.id}`);
      camIds.add(k.id);
      const l = levelOf(s.facility, k.level, `camera ${k.id}`);
      if (l && l.tier !== k.tier) errs.push(`camera ${k.id}: tier ${k.tier} != level tier ${l.tier}`);
    }

  // Hoists.
  for (const h of c.hoists) {
    const f = fac.get(h.facility);
    if (!f || f.class !== 'ALPHA') {
      errs.push(`hoist ${h.id}: hoists are ALPHA only`);
      continue;
    }
    const levels = h.levels.map((n) => (f.levels ?? []).find((l) => l.n === n));
    if (levels.some((l) => !l)) errs.push(`hoist ${h.id}: serves a level ${f.id} does not have`);
    for (let i = 1; i < h.levels.length; i++) if (h.levels[i]! <= h.levels[i - 1]!) errs.push(`hoist ${h.id}: levels must ascend`);
    const want = levels.filter(Boolean).map((l) => ({ level: l!.n, depthFt: landingDepthFt(l!) }));
    if (JSON.stringify(want) !== JSON.stringify(h.stops)) errs.push(`hoist ${h.id}: stops do not match level depths`);
    const travel = want.length ? want[want.length - 1]!.depthFt - want[0]!.depthFt : 0;
    if (h.travelFt !== travel) errs.push(`hoist ${h.id}: travelFt ${h.travelFt} != ${travel}`);
    if (f.depthFt !== null && want.some((s) => s.depthFt > f.depthFt!)) errs.push(`hoist ${h.id}: a landing is below the facility depth ${f.depthFt}`);
  }
  for (const f of plantSites.filter((x) => x.class === 'ALPHA')) if (!c.hoists.some((h) => h.facility === f.id)) errs.push(`hoists: ${f.id} has none`);

  // Muster points.
  sameSet('musterPoints', c.musterPoints.map((s) => s.facility));
  for (const s of c.musterPoints) {
    const f = fac.get(s.facility);
    const staff = f?.staff ?? 0;
    for (const p of s.points) {
      levelOf(s.facility, p.level, `muster ${p.id}`);
      if (p.assigned > p.capacity) errs.push(`muster ${p.id}: ${p.assigned} assigned over capacity ${p.capacity}`);
    }
    const assigned = sum(s.points.map((p) => p.assigned));
    const cap = sum(s.points.map((p) => p.capacity));
    if (assigned !== staff) errs.push(`muster ${s.facility}: assigned ${assigned} != posted staff ${staff}`);
    if (cap < staff) errs.push(`muster ${s.facility}: capacity ${cap} < posted staff ${staff}`);
  }
  return errs;
}
