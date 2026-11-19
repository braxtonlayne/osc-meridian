/**
 * Released values read from document content.
 *
 * The client canon carries restricted roster and custody fields as redaction
 * sentinels and never the text. When the session holds the release key, the
 * text arrives only through the document loader (services.docs.load applies
 * the release files). These helpers read table rows of a loaded document so an
 * app can show the released value of a field instead of the canon sentinel,
 * without reading release files itself.
 */
import type { DocJson, Services } from '@core/contracts';

/** One table cell: its text, or null while it is still a withheld bar. */
export type ReleasedCell = string | null;

const text = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

/**
 * Body rows of every table in the document HTML, keyed by the text of the first
 * cell (a personnel number, a field label). Cells still drawn as a baseline bar
 * (class "rx") are null; released cells (class "rx-released") and plain cells
 * are text. The first table that lists a key wins.
 */
export function tableRows(html: string): Map<string, ReleasedCell[]> {
  const out = new Map<string, ReleasedCell[]>();
  if (typeof DOMParser === 'undefined') return out;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  for (const tr of doc.querySelectorAll('table tbody tr, table tr')) {
    const cells = [...tr.querySelectorAll(':scope > td')];
    if (cells.length < 2) continue;
    const key = text(cells[0]!);
    if (!key || out.has(key)) continue;
    out.set(
      key,
      // Baseline bars carry class "rx"; released text carries "rx-released" (no "rx" token).
      cells.map((td) => (td.querySelector('.rx') ? null : text(td))),
    );
  }
  return out;
}

/** Load a document by number through the release-applying loader and read its table rows. */
export async function loadTableRows(services: Pick<Services, 'docs'>, docNo: string): Promise<Map<string, ReleasedCell[]>> {
  const entry = services.docs.byDocNo(docNo);
  if (!entry) return new Map();
  let doc: DocJson;
  try {
    doc = await services.docs.load(entry.id);
  } catch {
    return new Map();
  }
  return tableRows(doc.html);
}
