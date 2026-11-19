import { useCallback, useRef, useState } from 'preact/hooks';

/**
 * Bring `el` into view inside `scroller` only (block: nearest), without scrolling any
 * ancestor of the scroller or the page, which `Element.scrollIntoView` would do.
 */
export function scrollIntoViewWithin(scroller: HTMLElement | null | undefined, el: HTMLElement | null | undefined): void {
  if (!scroller || !el) return;
  // The component may not scroll itself (a tree in a pane): use its nearest scrolling ancestor.
  let box: HTMLElement | null = scroller;
  while (box && box !== document.body && !(box.scrollHeight > box.clientHeight && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
  if (!box || box === document.body) return;
  scroller = box;
  const s = scroller.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  // Account for a sticky header inside the scroller.
  const head = scroller.querySelector<HTMLElement>('thead');
  const top = s.top + (head && head.contains(el) === false ? head.getBoundingClientRect().height : 0);
  if (r.top < top) scroller.scrollTop -= top - r.top;
  else if (r.bottom > s.bottom) scroller.scrollTop += r.bottom - s.bottom;
}

/** Join class names, skipping falsy entries. */
export function cx(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(' ');
}

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/** In-world date ceiling. Nothing in MERIDIAN is dated after this. */
export const DATE_CEILING = '2008-05-31';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "2008-05-12" -> "12 MAY 2008". Returns the input unchanged if it is not an ISO date. */
export function formatOscDate(iso: string | undefined | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const mon = MONTHS[Number(m[2]) - 1];
  if (!mon) return iso;
  return `${m[3]} ${mon} ${m[1]}`;
}

/**
 * Parse an operator-typed date. Accepts "12 MAY 2008", "12MAY08", "12 May 08",
 * "2008-05-12". Returns ISO "2008-05-12" or null.
 */
export function parseOscDate(input: string): string | null {
  const s = input.trim().toUpperCase();
  if (!s) return null;
  let y: number, mo: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const mil = /^(\d{1,2})\s*([A-Z]{3})\s*(\d{2}|\d{4})$/.exec(s);
  if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    d = Number(iso[3]);
  } else if (mil) {
    d = Number(mil[1]);
    mo = MONTHS.indexOf(mil[2] as (typeof MONTHS)[number]) + 1;
    const yy = Number(mil[3]);
    y = (mil[3] ?? '').length === 2 ? 2000 + yy : yy;
  } else {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1) return null;
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > dim) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

/** Date-time group: ("2008-05-12", "1430") -> "121430Z MAY 08". */
export function formatDtg(iso: string, hhmmZ = '0000'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const mon = MONTHS[Number(m[2]) - 1] ?? '';
  const t = hhmmZ.replace(/\D/g, '').padStart(4, '0').slice(0, 4);
  return `${m[3]}${t}Z ${mon} ${(m[1] ?? '').slice(2)}`;
}

/** Thousands separators, tabular use. */
export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Controlled-or-uncontrolled state helper. */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (v: T) => void,
): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : inner;
  const cb = useRef(onChange);
  cb.current = onChange;
  const set = useCallback(
    (v: T) => {
      if (!controlled) setInner(v);
      cb.current?.(v);
    },
    [controlled],
  );
  return [current, set];
}

/** Clamp helper. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Split "&File" into { text: "File", mnemonic: "f", index: 0 }. "&&" escapes an ampersand. */
export function parseMnemonic(label: string): { text: string; mnemonic: string | null; index: number } {
  let text = '';
  let mnemonic: string | null = null;
  let index = -1;
  for (let i = 0; i < label.length; i++) {
    const ch = label[i] ?? '';
    if (ch === '&') {
      const next = label[i + 1];
      if (next === '&') {
        text += '&';
        i++;
        continue;
      }
      if (next !== undefined && mnemonic === null) {
        mnemonic = next.toLowerCase();
        index = text.length;
      }
      continue;
    }
    text += ch;
  }
  return { text, mnemonic, index };
}
