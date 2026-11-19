/** Canon fragment schema for the Muster Board (content/canon/apps/muster.json). */
import { z } from 'zod';

const n = z.number().finite();
const pos = n.positive();

const classModel = z.strictObject({
  classId: z.enum(['ALPHA', 'BETA', 'GAMMA']),
  /** Median badge-in time after the muster alarm, drill minutes. */
  arrivalMedianMin: pos,
  /** 90th percentile badge-in time, drill minutes. */
  arrivalP90Min: pos,
  /** Minutes after initiation at which the site reports to command (roster absences applied). */
  reportMin: pos,
  /** Minutes for a sweep team to clear one assembly point's area. */
  sweepMin: pos,
  /** Sweep teams a site can field at once. */
  sweepTeams: z.number().int().positive(),
  /** Most visitors on site at a muster. */
  visitorsMax: z.number().int().nonnegative(),
});

export const schema = z.strictObject({
  system: z.strictObject({
    name: z.string(),
    release: z.string(),
    procedure: z.string(),
    reference: z.string(),
    originator: z.string(),
  }),
  badge: z.strictObject({ format: z.string(), note: z.string(), visitorPrefix: z.string() }),
  classes: z.array(classModel).length(3),
  /** Posted staff per thousand who do not badge in (absent, asleep on shift change, working in a dead spot). */
  noBadgePer1000: z.number().int().nonnegative(),
  /** Share of non-badging staff accounted for by the duty roster at report time (leave, TDY). */
  rosterAccountedPct: n.min(0).max(100),
  /** Persons per assembly reader (non-platform points). */
  readerCapacity: z.number().int().positive(),
  maxReadersPerPoint: z.number().int().positive(),
  readersOutOfService: z.array(z.strictObject({ reader: z.string(), note: z.string() })),
  unknownBadges: z.array(
    z.strictObject({ site: z.string(), reader: z.string(), badge: z.string().regex(/^\d{2}-\d{4}$/), atMin: pos }),
  ),
  /** The account resident at a site (receives that site's muster mail). */
  siteAccounts: z.record(z.string(), z.enum(['analyst', 'lifesupport', 'deputy', 'auditor'])),
  mail: z.strictObject({
    unaccounted: z.string(),
    unknownBadge: z.string(),
    closeoutDiscrepancy: z.string(),
    oiaReferral: z.string(),
  }),
});

export type MusterCanon = z.infer<typeof schema>;
