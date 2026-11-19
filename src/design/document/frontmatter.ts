/**
 * Typed, defensive readers for DocJson.frontmatter. The pipeline validates frontmatter with
 * Zod, but the renderer never trusts shape: a missing or malformed field simply omits the
 * section it would have drawn. Field conventions are listed in docs/STYLE.md ("Template anatomy").
 */
import type { DocJson } from '@core/contracts';

export type FM = Record<string, unknown>;

export function str(fm: FM, key: string): string | undefined {
  const v = fm[key];
  if (typeof v === 'string' && v.trim()) return v;
  if (typeof v === 'number') return String(v);
  return undefined;
}

export function strs(fm: FM, key: string): string[] {
  const v = fm[key];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && !!x.trim());
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
}

export function bool(fm: FM, key: string, dflt: boolean): boolean {
  const v = fm[key];
  return typeof v === 'boolean' ? v : dflt;
}

export function num(fm: FM, key: string): number | undefined {
  const v = fm[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Array of objects with string-ish fields. */
export function recs(fm: FM, key: string): Record<string, string>[] {
  const v = fm[key];
  if (!Array.isArray(v)) return [];
  return v.filter(isObj).map((o) => {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(o)) {
      if (typeof val === 'string') out[k] = val;
      else if (typeof val === 'number' || typeof val === 'boolean') out[k] = String(val);
    }
    return out;
  });
}

/** Routing slip entries: [{office,action,initials,date}] or plain office names (form routing). */
export function routingRecs(fm: FM, key: string): Record<string, string>[] {
  const v = fm[key];
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => (typeof x === 'string' ? (x.trim() ? [{ office: x }] : []) : recs({ k: [x] }, 'k')));
}

export interface Sig {
  name: string;
  title?: string;
  /** Person who actually signed "for" the named official. */
  by?: string;
}

export function sig(fm: FM, key: string): Sig | undefined {
  const v = fm[key];
  if (typeof v === 'string' && v.trim()) return { name: v };
  if (!isObj(v) || typeof v.name !== 'string') return undefined;
  return {
    name: v.name,
    title: typeof v.title === 'string' ? v.title : undefined,
    by: typeof v.by === 'string' ? v.by : typeof v.for === 'string' ? v.for : undefined,
  };
}

export interface FieldLine {
  label: string;
  value: string;
  mono?: boolean;
}

/** `fields` either as [{label, value, mono}] or as a { Label: value } map. */
export function fields(fm: FM, key: string): FieldLine[] {
  const v = fm[key];
  if (Array.isArray(v)) {
    return v.filter(isObj).flatMap((o) =>
      typeof o.label === 'string' && (typeof o.value === 'string' || typeof o.value === 'number')
        ? [{ label: o.label, value: String(o.value), mono: o.mono === true }]
        : [],
    );
  }
  if (isObj(v)) {
    return Object.entries(v).flatMap(([label, value]) =>
      typeof value === 'string' || typeof value === 'number' ? [{ label, value: String(value) }] : [],
    );
  }
  return [];
}

/**
 * Content pages may nest a template's header fields under an object named after the template
 * (`message: { from, to, ... }`, `form: { formNo, blocks, ... }`; docs/BRIEF-CONTENT.md). The
 * templates read flat keys, so lift those objects onto the top level. The doc's own template
 * key is applied last so it wins over any other nested block. A nested value replaces the
 * top-level one unless it is undefined; the nested object itself stays under its key for
 * apps that read it there.
 */
export const TEMPLATE_FM_KEYS = ['memo', 'directive', 'cable', 'minutes', 'dossier', 'ledger', 'record', 'form', 'message', 'help', 'charter', 'scan', 'index'] as const;

export function normaliseFrontmatter(raw: FM | undefined | null, template?: string): FM {
  const fm: FM = { ...(raw ?? {}) };
  const order = TEMPLATE_FM_KEYS.filter((k) => k !== template && isObj(fm[k])) as string[];
  if (template && isObj(fm[template])) order.push(template);
  // Snapshot the nested blocks first, so a lifted field named like a template key cannot feed a later pass.
  const blocks = order.map((k) => fm[k] as Record<string, unknown>);
  for (const block of blocks) {
    for (const [k, v] of Object.entries(block)) {
      if (v !== undefined) fm[k] = v;
    }
  }
  return fm;
}

export function fmOf(doc: DocJson): FM {
  return normaliseFrontmatter(doc.frontmatter as FM | undefined, doc.template);
}
