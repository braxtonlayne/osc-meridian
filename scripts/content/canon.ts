/** Canon lookup for :c[path] and ::canon-table. */
import { readFileSync, existsSync } from 'node:fs';
import { formatNumber, isRawNumberKey } from './util.ts';

export type CanonData = Record<string, unknown>;

export function loadCanon(path: string): CanonData | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as CanonData;
}

/** Fields used to find an array element by a path segment, in priority order. */
const ARRAY_KEYS = ['id', 'no', 'n', 'fy', 'term', 'pn', 'seat', 'tier', 'date'];

function findInArray(arr: unknown[], seg: string): unknown {
  for (const k of ARRAY_KEYS) {
    const hit = arr.find(
      (el) => el !== null && typeof el === 'object' && k in el && String((el as Record<string, unknown>)[k]) === seg,
    );
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/**
 * Resolve a dot path. Array elements are addressed by id/no/n/fy/term/pn/seat/tier.
 * Segments may themselves contain dots only if an object key matches greedily
 * (e.g. "ratioModel.rows" is two plain segments; ids never contain dots).
 */
export function resolvePath(canon: CanonData, path: string): { found: boolean; value: unknown; lastKey: string } {
  const segs = path.split('.').filter(Boolean);
  let cur: unknown = canon;
  let lastKey = '';
  for (const seg of segs) {
    lastKey = seg;
    if (Array.isArray(cur)) {
      cur = findInArray(cur, seg);
    } else if (cur !== null && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, seg)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return { found: false, value: undefined, lastKey };
    }
    if (cur === undefined) return { found: false, value: undefined, lastKey };
  }
  return { found: segs.length > 0, value: cur, lastKey };
}

/** Display form of a scalar canon value. */
export function formatScalar(value: unknown, key: string, raw = false): string | null {
  if (typeof value === 'number') return raw || isRawNumberKey(key) ? String(value) : formatNumber(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'YES' : 'NO';
  return null;
}
