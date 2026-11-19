/**
 * Library store: the directive routes plus each directive's DocJson frontmatter,
 * read once per session and shared by every Directives window.
 */
import { computed, signal } from '@preact/signals';
import type { DocJson, RouteEntry, Services } from '@core/contracts';
import { buildGraph, rowFromEntry, serialOf, statusOf, type DirRow } from './model';

const docs = signal<Record<string, DocJson>>({});
const failed = signal<string[]>([]);
const entries = signal<RouteEntry[]>([]);
let started = false;

/** Directive pages of this app, in number order. */
function directiveEntries(services: Services): RouteEntry[] {
  return services.docs
    .all()
    .filter((r) => r.app === 'directives' && r.template === 'directive')
    .sort((a, b) => serialOf(a.docNo) - serialOf(b.docNo) || a.docNo.localeCompare(b.docNo));
}

export function ensureLibrary(services: Services, force = false): void {
  if (started && !force) return;
  started = true;
  const list = directiveEntries(services);
  entries.value = list;
  if (force) {
    docs.value = {};
    failed.value = [];
  }
  for (const e of list) {
    services.docs
      .load(e.id)
      .then((d) => {
        docs.value = { ...docs.peek(), [e.id]: d };
      })
      .catch(() => {
        if (!failed.peek().includes(e.id)) failed.value = [...failed.peek(), e.id];
      });
  }
}

/** Store a document the reader has just loaded (keeps the index current with releases applied). */
export function rememberDoc(d: DocJson): void {
  if (d.app !== 'directives' || d.template !== 'directive') return;
  docs.value = { ...docs.peek(), [d.id]: d };
}

export const library = {
  entries,
  docs,
  failed,
  rows: computed<DirRow[]>(() => entries.value.map((e) => rowFromEntry(e, docs.value[e.id]))),
  loadedCount: computed(() => entries.value.filter((e) => docs.value[e.id]).length),
};

export const graph = computed(() => buildGraph(library.rows.value));

export const statusByDocNo = computed(() => {
  const g = graph.value;
  const out: Record<string, string> = {};
  for (const r of library.rows.value) out[r.docNo] = statusOf(r.docNo, g);
  return out;
});

/** A one-shot instruction for the next reader mount: scroll to a paragraph or to the acknowledgement block. */
export const pendingAnchor = signal<{ route: string; anchor: string } | null>(null);
