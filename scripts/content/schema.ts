/**
 * Frontmatter schema for content/<family>/<slug>.md (docs/CONTRACTS.md, "Content format").
 * Cross-file rules (unique id/route/docNo, xref resolution, family = folder) live in build.ts.
 */
import { z } from 'zod';
import { APP_IDS, COMPARTMENT_IDS, MARKING_IDS, MAX_DATE, TEMPLATES } from './util.ts';

/** gray-matter (js-yaml) turns bare ISO dates into Date objects; bring them back to strings. */
const isoDate = z.preprocess(
  (v) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be ISO YYYY-MM-DD')
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), 'date is not a real calendar date')
    .refine((d) => d <= MAX_DATE, `date must be on or before ${MAX_DATE} (in-world ceiling)`),
);

export const ROUTE_RE = /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
/** First path segments the static host already uses for files. */
export const RESERVED_ROUTE_ROOTS = ['assets', 'data', 'fonts', '404', 'index'];

const docNoList = z.array(z.string().min(1));

export const FrontmatterSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case (a-z, 0-9, hyphens)'),
    route: z
      .string()
      .regex(ROUTE_RE, 'route must look like /family/slug (lowercase, no base, no trailing slash)')
      .refine(
        (r) => !RESERVED_ROUTE_ROOTS.includes(r.split('/')[1] ?? ''),
        `route must not start with a reserved segment (${RESERVED_ROUTE_ROOTS.join(', ')})`,
      ),
    app: z.enum(APP_IDS),
    family: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'family must be kebab-case'),
    template: z.enum(TEMPLATES),
    docNo: z.string().regex(/^[A-Z0-9]+(?:[-/.][A-Z0-9]+)+$/, 'docNo must be an upper-case canon document number'),
    title: z.string().min(3),
    marking: z.enum(MARKING_IDS),
    originator: z.string().min(1),
    revision: z.number().int().min(0),
    date: isoDate,
    access: z
      .object({
        tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        compartment: z.enum(COMPARTMENT_IDS).optional(),
      })
      .strict()
      .optional(),
    distribution: z.array(z.string().min(1)).optional(),
    supersedes: z.string().min(1).optional(),
    xrefs: docNoList.optional(),
    facility: z.string().regex(/^(ALPHA|BETA|GAMMA|DELTA)-\d{2}$/, 'facility must be a FacilityId like ALPHA-03').optional(),
    summary: z.string().min(10, 'summary is required (one line for search results)'),
  })
  .loose();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

/** Keys that are part of RouteEntry/DocJson; everything else goes to DocJson.frontmatter. */
export const CORE_KEYS = new Set([
  'id', 'route', 'app', 'family', 'template', 'docNo', 'title', 'marking', 'originator',
  'revision', 'date', 'access', 'distribution', 'supersedes', 'xrefs', 'facility', 'summary',
]);
