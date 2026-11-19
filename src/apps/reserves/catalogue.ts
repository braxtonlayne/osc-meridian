/**
 * ALPHA-03 vault catalogues as deterministic record generators.
 *
 * The collection sizes come from canon (seed collection) or from the document as released to
 * the operator (biological samples). Accession structure, storage notation and page size follow
 * the catalogue records (OSC-RSV-SEED, OSC-RSV-GENE); the entries those records print as
 * "Catalogue, page 1" are laid over the generated entries so the browser and the record agree.
 * Each entry is a pure function of its index, so any page of a 1.2 million entry catalogue can be
 * drawn without holding it in memory. Entry dressing is catalogue content, not a canon figure.
 */

/** Entries per page (both catalogue records: "25 entries to a page"). */
export const PAGE_SIZE = 25;

/** Small deterministic hash in [0, 1). */
export function rnd(seed: number, i: number): number {
  let t = (Math.imul(i + 1, 0x9e3779b1) ^ seed) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))]!;
}

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
const DAY = 86400000;

const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
/** "09 MAY 2008" to ms (UTC), or null. */
export function parseHouseDay(s: string): number | null {
  const m = /^(\d{2}) ([A-Z]{3}) (\d{4})/.exec(s.trim());
  if (!m) return null;
  const mon = (MON as readonly string[]).indexOf(m[2]!);
  return mon < 0 ? null : Date.UTC(Number(m[3]), mon, Number(m[1]));
}

/** Latest date printed in column `col` of a document table: generated entries are not dated earlier. */
function overlayFloor(t: DocTable | null | undefined, col: number): number {
  let best = 0;
  for (const r of t?.rows ?? []) {
    const v = r[col] ? parseHouseDay(r[col]!) : null;
    if (v !== null && v > best) best = v;
  }
  return best;
}

export function houseDay(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Receipt period of a collection: first receipt and the catalogue revision date. */
export interface Timeline {
  start: string;
  end: string;
}

/** Maps an accession index to its receipt date. Serials restart each year. */
export interface Clock {
  /** Receipt date (ms, UTC midnight) of entry `index`. */
  at(index: number): number;
  /** First index received in `year`; Infinity when the year is after the period. */
  firstOfYear(year: number): number;
  /** Number of entries; Infinity when the extent is not known to the operator. */
  size: number;
}

/** Known extent: `total` entries spread evenly over the period. */
export function linearClock(total: number, t: Timeline): Clock {
  const a = utc(t.start);
  const days = Math.round((utc(t.end) - a) / DAY);
  const at = (i: number) => a + Math.floor(days * (total > 1 ? i / (total - 1) : 0)) * DAY;
  return {
    size: total,
    at,
    firstOfYear(year) {
      const y0 = Date.UTC(year, 0, 1);
      if (y0 <= a) return 0;
      if (y0 > utc(t.end)) return Infinity;
      let lo = 0;
      let hi = total - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (at(mid) >= y0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
  };
}

/**
 * Extent withheld: a browsing clock at a nominal intake per day, not derived from any holding
 * figure. Dates stop at the end of the period; the browser is not bounded.
 */
export function browseClock(perDay: number, t: Timeline): Clock {
  const a = utc(t.start);
  const b = utc(t.end);
  return {
    size: Infinity,
    at: (i) => Math.min(b, a + Math.floor(i / perDay) * DAY),
    firstOfYear(year) {
      const y0 = Date.UTC(year, 0, 1);
      if (y0 <= a) return 0;
      if (y0 > b) return Infinity;
      return Math.ceil((y0 - a) / DAY) * perDay;
    },
  };
}

/** Nominal intake used to lay out the biological catalogue while its extent is withheld. */
export const BROWSE_PER_DAY = 40;

function accessionFor(prefix: string, index: number, clock: Clock): string {
  const year = new Date(clock.at(index)).getUTCFullYear();
  const serial = index - clock.firstOfYear(year) + 1;
  return `${prefix}-${String(year).slice(2)}-${String(serial).padStart(6, '0')}`;
}

/** Index of an accession number, or null. Accepts "SC-04-000001" or "sc 04 1". */
export function findAccession(input: string, prefix: string, clock: Clock): number | null {
  const m = new RegExp(`^${prefix}[-\\s]?(\\d{2})[-\\s]?(\\d{1,6})$`).exec(input.trim().toUpperCase());
  if (!m) return null;
  const year = 2000 + Number(m[1]);
  const serial = Number(m[2]);
  if (serial < 1) return null;
  const first = clock.firstOfYear(year);
  if (!Number.isFinite(first)) return null;
  const next = clock.firstOfYear(year + 1);
  const idx = first + serial - 1;
  if (idx >= next || idx >= clock.size) return null;
  return idx;
}

/* ------------------------------------------------------------------ document tables */

/** A table printed in a record: header labels and cell text (null where the cell is withheld). */
export interface DocTable {
  headers: string[];
  rows: (string | null)[][];
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const withheld = (cell: string) => /class="[^"]*\brx\b(?![-\w])/.test(cell);

/** Every table in document HTML, cells decoded; withheld cells are null. */
export function docTables(html: string): DocTable[] {
  const out: DocTable[] = [];
  for (const t of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const headers = (t.match(/<th[^>]*>[\s\S]*?<\/th>/gi) ?? []).map(decode);
    const rows: (string | null)[][] = [];
    for (const row of t.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      if (/<th/i.test(row)) continue;
      const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map((c) => (withheld(c) ? null : decode(c)));
      if (cells.length) rows.push(cells);
    }
    out.push({ headers, rows });
  }
  return out;
}

/** The first table whose leading headers match `lead` (case-insensitive). */
export function findTable(html: string, lead: string[]): DocTable | null {
  return (
    docTables(html).find((t) => lead.every((h, i) => (t.headers[i] ?? '').toLowerCase() === h.toLowerCase())) ?? null
  );
}

export interface CodeEntry {
  code: string;
  label: string;
}

/** The donor category code list once the record releases it ("Code | Category"); [] while withheld. */
export function parseCodeList(html: string): CodeEntry[] {
  for (const t of docTables(html)) {
    if (!/code/i.test(t.headers[0] ?? '')) continue;
    const out = t.rows.flatMap((r) => (r[0] && r[1] ? [{ code: r[0], label: r[1] }] : []));
    if (out.length) return out;
  }
  return [];
}

/** A canon value printed in a document (`<span class="cv" data-canon="path">125,000</span>`). */
export function canonValueInHtml(html: string, path: string): number | null {
  const esc = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`<span[^>]*data-canon="${esc}"[^>]*>([^<]*)</span>`).exec(html);
  if (!m) return null;
  const n = Number((m[1] ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ------------------------------------------------------------------ seed collection */

export const SEED_PREFIX = 'SC';
export const SEED_TIMELINE: Timeline = { start: '2004-09-23', end: '2008-05-09' };
export const SEED_HEADERS = ['Accession', 'Taxon', 'Origin', 'Received', 'Viability test', 'Location'];

const TAXA: readonly string[] = [
  'Triticum aestivum', 'Triticum durum', 'Zea mays', 'Oryza sativa', 'Hordeum vulgare', 'Avena sativa', 'Secale cereale',
  'Sorghum bicolor', 'Pennisetum glaucum', 'Glycine max', 'Phaseolus vulgaris', 'Phaseolus lunatus', 'Pisum sativum',
  'Cicer arietinum', 'Lens culinaris', 'Arachis hypogaea', 'Vigna unguiculata', 'Helianthus annuus', 'Brassica napus',
  'Brassica oleracea', 'Brassica rapa', 'Daucus carota', 'Allium cepa', 'Solanum lycopersicum', 'Capsicum annuum',
  'Cucumis sativus', 'Cucurbita pepo', 'Cucurbita maxima', 'Citrullus lanatus', 'Lactuca sativa', 'Spinacia oleracea',
  'Beta vulgaris', 'Medicago sativa', 'Trifolium repens', 'Gossypium hirsutum', 'Linum usitatissimum',
  'Fagopyrum esculentum', 'Chenopodium quinoa', 'Amaranthus cruentus', 'Sesamum indicum', 'Solanum tuberosum',
];

const US_STATES: readonly string[] = [
  'Kansas', 'Nebraska', 'Iowa', 'North Dakota', 'South Dakota', 'Minnesota', 'Illinois', 'Indiana', 'Ohio', 'Missouri',
  'Wisconsin', 'Michigan', 'Kentucky', 'Tennessee', 'Arkansas', 'Texas', 'Oklahoma', 'Colorado', 'Idaho', 'Montana',
  'Washington', 'Oregon', 'California', 'Arizona', 'New Mexico', 'Georgia', 'South Carolina', 'North Carolina', 'Virginia',
  'Pennsylvania', 'New York', 'Vermont', 'Maine', 'Massachusetts', 'New Jersey', 'Louisiana', 'Mississippi', 'Alabama', 'Florida',
];
const COUNTRIES: readonly string[] = [
  'Mexico', 'Canada', 'Peru', 'Bolivia', 'Ethiopia', 'Turkey', 'India', 'China', 'Syria', 'Iran', 'Afghanistan', 'Nigeria',
  'Brazil', 'Argentina', 'Australia', 'Ukraine', 'Kazakhstan', 'Pakistan', 'Nepal', 'Guatemala',
];

export interface SeedRecord {
  index: number;
  accession: string;
  taxon: string;
  origin: string;
  received: string;
  viability: string;
  location: string;
}

/** Storage location "room/rack/shelf/box" in receipt order: 250 boxes to a shelf, six shelves to a rack. */
function seedLocation(i: number): string {
  const shelfSlot = Math.floor(i / 250);
  const box = (i % 250) + 1;
  const shelf = (shelfSlot % 6) + 1;
  const rackN = Math.floor(shelfSlot / 6);
  const letter = 'ABCDEFGH'[Math.floor(rackN / 100) % 8]!;
  const room = letter <= 'D' ? 1 : 2;
  return `${room}/${letter}-${String((rackN % 100) + 1).padStart(2, '0')}/${shelf}/${String(box).padStart(3, '0')}`;
}

export function seedRecord(index: number, clock: Clock, overlay?: DocTable | null): SeedRecord {
  const row = overlay?.rows[index];
  if (row && row.every((c) => c !== null) && row.length >= 6) {
    const [accession, taxon, origin, received, viability, location] = row as string[];
    return { index, accession: accession!, taxon: taxon!, origin: origin!, received: received!, viability: viability!, location: location! };
  }
  const s = 0x5eed;
  const at = Math.max(clock.at(index), overlayFloor(overlay, 3));
  const foreign = rnd(s, index * 7 + 2) < 0.22;
  // Viability: the first full cycle of tests began in 2007; the test follows receipt.
  const from = Math.max(at, utc('2007-01-02'));
  const to = utc(SEED_TIMELINE.end);
  const test = from >= to ? to : from + Math.floor(rnd(s, index * 7 + 3) * ((to - from) / DAY)) * DAY;
  const pct = 72 + Math.floor(rnd(s, index * 7 + 4) * 27);
  return {
    index,
    accession: accessionFor(SEED_PREFIX, index, clock),
    taxon: pick(TAXA, rnd(s, index * 7 + 1)) + (foreign ? ' (landrace)' : ''),
    origin: foreign ? pick(COUNTRIES, rnd(s, index * 7 + 5)) : `${pick(US_STATES, rnd(s, index * 7 + 5))}, US`,
    received: houseDay(at),
    viability: `${houseDay(test)}, ${pct}%`,
    location: seedLocation(index),
  };
}

/* ------------------------------------------------------------ biological sample collection */

export const GENE_PREFIX = 'BSC';
export const GENE_TIMELINE: Timeline = { start: '2004-10-18', end: '2008-05-09' };
export const GENE_HEADERS = ['Accession', 'Sample type', 'Aliquots', 'Received', 'Storage', 'Donor category', 'Selection basis'];

/** Sample types with aliquot count and store (dewar room or freezer hall), per the catalogue record. */
const SAMPLE_TYPES: readonly { type: string; aliquots: number; store: 'D' | 'F' }[] = [
  { type: 'Whole blood, EDTA', aliquots: 6, store: 'D' },
  { type: 'Buffy coat', aliquots: 3, store: 'D' },
  { type: 'Buccal swab', aliquots: 2, store: 'F' },
  { type: 'Extracted DNA', aliquots: 4, store: 'F' },
];

export interface GeneRecord {
  index: number;
  accession: string;
  sampleType: string;
  aliquots: string;
  received: string;
  storage: string;
  /** Donor category code; null while withheld. */
  donor: string | null;
  /** Selection basis; null while withheld. */
  basis: string | null;
  donorLen: number;
  basisLen: number;
}

export interface GeneRelease {
  codes: CodeEntry[];
  /** Selection basis wordings seen in the record, by donor category code. */
  bases: Record<string, string[]>;
}

/** Donor codes and basis wordings from the released catalogue page; empty while withheld. */
export function geneRelease(html: string): GeneRelease {
  const codes = parseCodeList(html);
  const bases: Record<string, string[]> = {};
  const t = findTable(html, GENE_HEADERS.slice(0, 2));
  for (const r of t?.rows ?? []) {
    const code = r[5];
    const basis = r[6];
    if (!code || !basis) continue;
    const list = (bases[code] ??= []);
    if (!list.includes(basis)) list.push(basis);
  }
  return { codes, bases };
}

export function geneRecord(index: number, clock: Clock, overlay?: DocTable | null, rel?: GeneRelease): GeneRecord {
  const s = 0x6e7e;
  const donorLen = 1 + Math.floor(rnd(s, index * 9 + 7) * 2);
  const basisLen = 18 + Math.floor(rnd(s, index * 9 + 8) * 22);
  const row = overlay?.rows[index];
  if (row && row.length >= 7 && row.slice(0, 5).every((c) => c !== null)) {
    const [accession, sampleType, aliquots, received, storage, donor, basis] = row;
    return {
      index,
      accession: accession!,
      sampleType: sampleType!,
      aliquots: aliquots!,
      received: received!,
      storage: storage!,
      donor: donor ?? null,
      basis: basis ?? null,
      donorLen,
      basisLen,
    };
  }
  const st = pick(SAMPLE_TYPES, rnd(s, index * 9 + 1));
  const storage =
    st.store === 'D'
      ? `D-${String(1 + Math.floor(rnd(s, index * 9 + 2) * 6)).padStart(2, '0')}/${String(1 + Math.floor(rnd(s, index * 9 + 3) * 12)).padStart(2, '0')}/${'ABCDEFGHJK'[Math.floor(rnd(s, index * 9 + 4) * 10)]}/${String(1 + Math.floor(rnd(s, index * 9 + 5) * 25)).padStart(2, '0')}`
      : `F-${String(1 + Math.floor(rnd(s, index * 9 + 2) * 24)).padStart(2, '0')}/${1 + Math.floor(rnd(s, index * 9 + 3) * 5)}/${String(1 + Math.floor(rnd(s, index * 9 + 4) * 20)).padStart(2, '0')}/${String(1 + Math.floor(rnd(s, index * 9 + 5) * 100)).padStart(3, '0')}`;
  let donor: string | null = null;
  let basis: string | null = null;
  if (rel && rel.codes.length) {
    const c = pick(rel.codes, rnd(s, index * 9 + 6));
    donor = c.code;
    const seen = rel.bases[c.code];
    const prev = accessionFor(GENE_PREFIX, Math.max(0, index - 1), clock);
    basis = seen && seen.length ? pick(seen, rnd(s, index * 9 + 9)).replace(/BSC-\d{2}-\d{6}/g, prev) : c.label;
  }
  return {
    index,
    accession: accessionFor(GENE_PREFIX, index, clock),
    sampleType: st.type,
    aliquots: String(st.aliquots),
    received: houseDay(Math.max(clock.at(index), overlayFloor(overlay, 3))),
    storage,
    donor,
    basis,
    donorLen,
    basisLen,
  };
}

/* ------------------------------------------------------------------ paging */

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Indices on a 1-based page. */
export function pageIndices(page: number, total: number, size = PAGE_SIZE): number[] {
  const start = (Math.max(1, page) - 1) * size;
  const end = Math.min(total, start + size);
  const out: number[] = [];
  for (let i = start; i < end; i++) out.push(i);
  return out;
}
