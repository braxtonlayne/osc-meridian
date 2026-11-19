import { render } from 'preact';
import { InkCircle, InkUnderline, NoteInk, type NoteMark } from './Handwriting';
import { RoutingSlip, type RoutingAction, type RoutingEntry } from './RoutingSlip';
import { ScanEffects, scanRotation } from './ScanPage';
import { parseSeed } from './rng';

const DONE = 'data-scan-enhanced';
const MARKS: readonly NoteMark[] = ['none', 'underline', 'circle', 'arrow-left', 'arrow-right'];

/** "2008-05-02" -> "5/2" (how someone dates a routing slip by hand). Anything else passes through. */
export function shortDate(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  return m ? `${Number(m[2])}/${Number(m[3])}` : raw.trim();
}

/**
 * Parse data-initials. Plain form is "JH,MKB". Each item may carry its own
 * date: "JH 5/2,MKB 5/5" or "JH:5/2".
 */
export function parseInitials(raw: string | null | undefined, fallbackDate?: string): RoutingEntry[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const [who = '', when] = item.split(/[\s:]+/, 2);
      return { to: who, initials: who, date: when ?? fallbackDate, hand: who };
    });
}

function enhancePage(el: HTMLElement): HTMLElement {
  const seed = parseSeed(el.dataset.seed);
  const rawRotate = el.dataset.rotate;
  const rotate = rawRotate != null && rawRotate !== '' && Number.isFinite(Number(rawRotate)) ? Number(rawRotate) : undefined;
  el.style.setProperty('--scan-rotate', `${scanRotation(seed, rotate)}deg`);
  el.classList.add('scan-page--enhanced');
  const host = document.createElement('div');
  host.className = 'scan-fx-host';
  el.appendChild(host);
  const holesRaw = el.dataset.holes;
  const holes = holesRaw === '0' ? 0 : holesRaw === '3' ? 3 : 2;
  render(<ScanEffects seed={seed} holes={holes} />, host);
  return host;
}

function enhanceNote(el: HTMLElement): void {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  const hand = el.dataset.hand || 'RT';
  const seed = parseSeed(el.dataset.seed);
  const markRaw = el.dataset.mark as NoteMark | undefined;
  const mark = markRaw && MARKS.includes(markRaw) ? markRaw : undefined;
  const width = Number(el.dataset.width) || undefined;
  el.textContent = '';
  render(<NoteInk text={text} hand={hand} seed={seed} width={width} mark={mark} />, el);
}

function enhanceSlip(el: HTMLElement, root: HTMLElement): void {
  const scope = el.closest<HTMLElement>('.scan-page') ?? root;
  const date = shortDate(el.dataset.date ?? scope.querySelector<HTMLElement>('.stamp[data-date]')?.dataset.date);
  const entries = parseInitials(el.dataset.initials, date);
  if (entries.length === 0) return;
  const actions = (el.dataset.actions ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean) as RoutingAction[];
  const seed = parseSeed(el.dataset.seed ?? scope.dataset.seed);
  // Render the slip's contents into the pipeline's own element (it keeps the .routing-slip class).
  const tmp = document.createElement('div');
  render(<RoutingSlip entries={entries} seed={seed} actions={actions} remarks={el.dataset.remarks} from={el.dataset.from} />, tmp);
  const built = tmp.firstElementChild;
  el.textContent = '';
  if (built) {
    el.classList.add('routing-slip--set');
    while (built.firstChild) el.appendChild(built.firstChild);
  }
  render(null, tmp);
}

function enhanceInkTarget(el: HTMLElement): HTMLElement | undefined {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (!w || !h) return undefined; // not laid out (prerender, hidden window): leave the text alone
  const hand = el.dataset.hand || 'RT';
  const seed = parseSeed(el.dataset.seed);
  el.classList.add('ink-target');
  const host = document.createElement('span');
  host.className = 'scan-fx-host';
  host.setAttribute('aria-hidden', 'true');
  el.appendChild(host);
  if (el.dataset.ink === 'underline') {
    render(
      <span style={{ position: 'absolute', left: 0, top: `${h - 1}px` }}>
        <InkUnderline width={w} hand={hand} seed={seed} />
      </span>,
      host,
    );
  } else {
    render(<InkCircle width={w} height={h} hand={hand} seed={seed} />, host);
  }
  return host;
}

/**
 * Upgrade pipeline HTML inside `root` to the scan kit's rendering. Call after
 * the document body is mounted. Safe to call repeatedly: finished elements are
 * marked and skipped.
 *
 * Reads:
 *  - .scan-page    data-seed, data-rotate, [data-holes=0|2|3]
 *  - .margin-note  data-hand, data-seed, [data-mark=underline|circle|arrow-left|arrow-right], [data-width]
 *  - .routing-slip data-initials ("JH,MKB" or "JH 5/2,MKB 5/5"), [data-date], [data-actions], [data-remarks], [data-from]
 *  - [data-ink=circle|underline]  a pen mark drawn over inline text ([data-hand], [data-seed])
 *
 * Returns a dispose function that unmounts the overlays it added.
 */
export function enhanceScans(root: HTMLElement): () => void {
  const hosts: HTMLElement[] = [];
  const todo = <T extends HTMLElement>(sel: string): T[] => {
    const list = Array.from(root.querySelectorAll<T>(sel));
    if (root.matches(sel)) list.unshift(root as T);
    return list.filter((el) => !el.hasAttribute(DONE));
  };

  for (const el of todo<HTMLElement>('.margin-note')) {
    enhanceNote(el);
    el.setAttribute(DONE, '');
  }
  for (const el of todo<HTMLElement>('.routing-slip')) {
    enhanceSlip(el, root);
    el.setAttribute(DONE, '');
  }
  for (const el of todo<HTMLElement>('.scan-page')) {
    hosts.push(enhancePage(el));
    el.setAttribute(DONE, '');
  }
  // Last, so measurements see the final layout.
  for (const el of todo<HTMLElement>('[data-ink]')) {
    const host = enhanceInkTarget(el);
    if (host) {
      hosts.push(host);
      el.setAttribute(DONE, '');
    }
  }

  return () => {
    for (const host of hosts) {
      render(null, host);
      host.remove();
    }
  };
}
