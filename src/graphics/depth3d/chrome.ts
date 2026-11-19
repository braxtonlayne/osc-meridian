/**
 * @graphics/depth3d: the viewer frame (toolbar, level index, status line, keyboard).
 * Plain DOM, no three.js. The drawing area is filled by either the 3D scene (scene.ts)
 * or the 2D elevation (DepthSection2D) through the ViewImpl interface.
 */
import './depth3d.css';
import { fmtFt, isWithheld, type LevelModel, type SiteModel } from './model';

export type Projection = 'ortho' | 'persp';
export type FrameMode = 'whole' | 'lower';

export interface ViewImpl {
  dispose(): void;
  setSelected(n: number | null): void;
  setTier(t: number): void;
  setProjection?(p: Projection): void;
  frame?(mode: FrameMode): void;
  zoomBy?(factor: number): void;
}

export interface Chrome {
  root: HTMLElement;
  view: HTMLElement;
  state: { tier: number; selected: number | null };
  attach(impl: ViewImpl, kind: '3d' | '2d'): void;
  select(n: number, fromUser: boolean): void;
  setTier(t: number): void;
  dispose(): void;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/**
 * Fill `el` with a level designation, or with a redaction bar when the session tier does
 * not reach it. The withheld name is never written to the DOM; only its length is used.
 */
export function fillDesignation(el: HTMLElement, level: LevelModel, tier: number): void {
  el.textContent = '';
  if (isWithheld(level, tier)) {
    const bar = h('span', 'd3v-rx');
    bar.style.width = `${Math.min(30, Math.max(8, level.short.length))}ch`;
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', 'designation withheld');
    el.append(bar);
  } else {
    el.append(level.short);
  }
}

export function describeLevel(level: LevelModel, tier: number): string {
  const span = `Top ${fmtFt(level.topFt)} ft, floor ${fmtFt(level.floorFt)} ft, height ${fmtFt(level.heightFt)} ft.`;
  if (isWithheld(level, tier)) return `Level ${level.n}: designation withheld (Tier ${level.tier}). ${span}`;
  return `${level.name}. ${span}${level.notes ? ' ' + level.notes : ''}`;
}

export function createChrome(
  el: HTMLElement,
  model: SiteModel,
  opts: { tier: number; onSelectLevel?: (n: number) => void },
): Chrome {
  const state: Chrome['state'] = { tier: opts.tier, selected: null };
  let impl: ViewImpl | null = null;
  let projection: Projection = 'ortho';

  const root = h('div', 'd3v');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', `Depth section, ${model.id}${model.codename ? ' ' + model.codename : ''}`);

  // ---- toolbar ----
  const bar = h('div', 'd3v-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Section view');
  const title = h('span', 'd3v-title', `${model.id}${model.codename ? '  ' + model.codename : ''}`);
  const mkBtn = (label: string, onClick: () => void, pressed?: boolean): HTMLButtonElement => {
    const b = h('button', 'd3v-btn', label);
    b.type = 'button';
    if (pressed != null) b.setAttribute('aria-pressed', String(pressed));
    b.addEventListener('click', onClick);
    return b;
  };
  const setProjection = (p: Projection): void => {
    projection = p;
    bOrtho.setAttribute('aria-pressed', String(p === 'ortho'));
    bPersp.setAttribute('aria-pressed', String(p === 'persp'));
    impl?.setProjection?.(p);
    renderStatus();
  };
  const bOrtho = mkBtn('Orthographic', () => setProjection('ortho'), true);
  const bPersp = mkBtn('Perspective', () => setProjection('persp'), false);
  const bWhole = mkBtn('Whole section', () => impl?.frame?.('whole'));
  const bLower = mkBtn('Lower levels', () => impl?.frame?.('lower'));
  const bIn = mkBtn('Zoom in', () => impl?.zoomBy?.(1.25));
  const bOut = mkBtn('Zoom out', () => impl?.zoomBy?.(0.8));
  const only3d = [bOrtho, bPersp, bWhole, bLower, bIn, bOut];
  const grp = (...bs: HTMLElement[]): HTMLElement => {
    const g = h('span', 'd3v-grp');
    g.append(...bs);
    return g;
  };
  bar.append(title, grp(bOrtho, bPersp), grp(bWhole, bLower), grp(bIn, bOut));

  // ---- body: level index + drawing area ----
  const body = h('div', 'd3v-body');
  const side = h('div', 'd3v-side');
  const head = h('div', 'd3v-ix-head');
  head.setAttribute('aria-hidden', 'true');
  head.append(h('span', undefined, 'LVL'), h('span', undefined, 'DESIGNATION'), h('span', undefined, 'TIER'), h('span', 'd3v-num', 'TOP FT'));
  const list = h('div', 'd3v-ix');
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Levels, surface to terminal');
  list.tabIndex = 0;
  const rows = new Map<number, { row: HTMLElement; name: HTMLElement }>();
  for (const lv of model.levels) {
    const row = h('div', 'd3v-ix-row');
    row.id = `d3v-${model.id}-${lv.n}`;
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'false');
    const name = h('span', 'd3v-ix-name');
    row.append(h('span', 'd3v-mono', String(lv.n).padStart(2, '0')), name, h('span', 'd3v-mono', `T${lv.tier}`), h('span', 'd3v-mono d3v-num', fmtFt(lv.topFt)));
    row.addEventListener('click', () => {
      select(lv.n, true);
      list.focus({ preventScroll: true });
    });
    rows.set(lv.n, { row, name });
    list.append(row);
  }
  const foot = h('div', 'd3v-ix-foot');
  foot.append(h('span', undefined, 'Terminal floor'), h('span', 'd3v-mono d3v-num', `${fmtFt(model.depthFt)} ft`));
  side.append(head, list, foot);

  const view = h('div', 'd3v-view');
  view.tabIndex = 0;
  view.setAttribute('aria-label', 'Section drawing. Arrow up and arrow down change level.');
  body.append(side, view);

  // ---- status line ----
  const status = h('div', 'd3v-status');
  const stSel = h('span', 'd3v-st-sel');
  stSel.setAttribute('aria-live', 'polite');
  const stMode = h('span', 'd3v-st-mode');
  status.append(stSel, stMode);

  root.append(bar, body, status);
  el.append(root);

  let kind: '3d' | '2d' | 'wait' = 'wait';
  function renderStatus(): void {
    const lv = model.levels.find((l) => l.n === state.selected);
    stSel.textContent = lv ? describeLevel(lv, state.tier) : `${model.levels.length} levels. ${model.terrain ?? ''}`.trim();
    stMode.textContent =
      kind === '2d' ? 'Elevation drawing (3D display not available)' : kind === 'wait' ? 'Loading section' : projection === 'ortho' ? 'Orthographic' : 'Perspective';
  }
  function renderRows(): void {
    for (const lv of model.levels) {
      const r = rows.get(lv.n)!;
      fillDesignation(r.name, lv, state.tier);
      const withheld = isWithheld(lv, state.tier);
      r.row.title = withheld ? `Level ${lv.n}: designation withheld` : lv.name;
      r.row.setAttribute('aria-label', `Level ${lv.n}, ${withheld ? 'designation withheld' : lv.short}, top ${fmtFt(lv.topFt)} feet`);
      const on = state.selected === lv.n;
      r.row.setAttribute('aria-selected', String(on));
      r.row.classList.toggle('is-sel', on);
    }
    const cur = state.selected != null ? rows.get(state.selected) : undefined;
    if (cur) list.setAttribute('aria-activedescendant', cur.row.id);
    else list.removeAttribute('aria-activedescendant');
  }

  function select(n: number, fromUser: boolean): void {
    if (!model.levels.some((l) => l.n === n)) return;
    const changed = state.selected !== n;
    state.selected = n;
    renderRows();
    renderStatus();
    const r = rows.get(n);
    if (r && typeof r.row.scrollIntoView === 'function') r.row.scrollIntoView({ block: 'nearest' });
    impl?.setSelected(n);
    if (fromUser && changed) opts.onSelectLevel?.(n);
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const idx = model.levels.findIndex((l) => l.n === state.selected);
    let next = -1;
    if (e.key === 'ArrowDown') next = idx < 0 ? 0 : Math.min(model.levels.length - 1, idx + 1);
    else if (e.key === 'ArrowUp') next = idx < 0 ? 0 : Math.max(0, idx - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = model.levels.length - 1;
    else if (e.key === '+' || e.key === '=') impl?.zoomBy?.(1.25);
    else if (e.key === '-') impl?.zoomBy?.(0.8);
    else return;
    e.preventDefault();
    if (next >= 0) select(model.levels[next]!.n, true);
  };
  root.addEventListener('keydown', onKey);

  renderRows();
  renderStatus();

  return {
    root,
    view,
    state,
    attach(next, k) {
      impl = next;
      kind = k;
      for (const b of only3d) b.disabled = k !== '3d';
      renderStatus();
    },
    select,
    setTier(t) {
      state.tier = t;
      renderRows();
      renderStatus();
      impl?.setTier(t);
    },
    dispose() {
      root.removeEventListener('keydown', onKey);
      impl?.dispose();
      impl = null;
      root.remove();
    },
  };
}
