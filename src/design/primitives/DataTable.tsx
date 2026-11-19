import type { ComponentChildren, TargetedKeyboardEvent } from 'preact';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import './primitives.css';
import { cx, scrollIntoViewWithin, useControllable } from '../util';

export type SortDir = 'asc' | 'desc';
export interface SortState {
  key: string;
  dir: SortDir;
}

export interface Column<T> {
  key: string;
  header: string;
  /** px number or CSS length. */
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  /** Plex Mono, tabular numerals (IDs, codes, figures). */
  mono?: boolean;
  /** Defaults to true when sortValue or a primitive field exists. */
  sortable?: boolean;
  /** Value used for sorting; defaults to row[key]. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Cell renderer; defaults to String(row[key]). */
  render?: (row: T) => ComponentChildren;
  /** Header tooltip / long name. */
  title?: string;
  /** Allow the cell to wrap instead of ellipsis. */
  wrap?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Accessible name, e.g. "Facilities, 47 records". */
  label: string;
  /** Visible caption above the table. */
  caption?: string;
  selection?: 'none' | 'single' | 'multi';
  /** Controlled selected keys. */
  selected?: string[];
  defaultSelected?: string[];
  onSelectionChange?: (keys: string[]) => void;
  /** Enter or double-click on a row. */
  onActivate?: (row: T) => void;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (s: SortState | null) => void;
  /** Sort internally (default true). Set false if the caller sorts `rows` itself. */
  sortRows?: boolean;
  dense?: boolean;
  zebra?: boolean;
  /** Let every cell wrap. */
  wrap?: boolean;
  /** Content for an empty table (e.g. an @graphics/states EmptyState). Default: an in-world line. */
  empty?: ComponentChildren;
  /** Totals row(s): rendered in a sticky tfoot. Pass <tr> elements. */
  footer?: ComponentChildren;
  /** Scroll container max height (CSS length). Default fills parent. */
  maxHeight?: string;
  rowClass?: (row: T) => string | undefined;
  /** Right-click on a row (for context menus). */
  onRowContextMenu?: (row: T, e: MouseEvent) => void;
}

function defaultValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en-US', { numeric: true, sensitivity: 'base' });
}

/**
 * Dense sortable table with sticky header, zebra rows, row selection and keyboard navigation.
 * Keyboard (table focused): Up/Down, PageUp/PageDown, Home/End move; Shift extends (multi);
 * Space toggles (multi); Ctrl+A selects all (multi); Enter activates.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    rows,
    rowKey,
    label,
    caption,
    selection = 'single',
    onActivate,
    dense,
    zebra = true,
    wrap,
    empty,
    footer,
    maxHeight,
    rowClass,
    sortRows = true,
    onRowContextMenu,
  } = props;
  const [sort, setSort] = useControllable<SortState | null>(props.sort, props.defaultSort ?? null, props.onSortChange);
  const [selected, setSelected] = useControllable<string[]>(props.selected, props.defaultSelected ?? [], props.onSelectionChange);
  const [cursor, setCursor] = useState(0);
  const anchor = useRef(0);
  const baseId = useId();
  const wellRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    if (!sort || !sortRows) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.sortValue ?? ((r: T) => defaultValue(r, col.key) as string | number);
    const out = rows.slice().sort((a, b) => compare(get(a), get(b)));
    if (sort.dir === 'desc') out.reverse();
    return out;
  }, [rows, sort?.key, sort?.dir, sortRows, columns]);

  useEffect(() => {
    if (cursor > sorted.length - 1) setCursor(Math.max(0, sorted.length - 1));
  }, [sorted.length]);

  // Keep the cursor row in view: inside the table's own scroller, and not on mount
  // (scrollIntoView would also scroll the window body or page that holds the table).
  const cursorMounted = useRef(false);
  useEffect(() => {
    if (!cursorMounted.current) {
      cursorMounted.current = true;
      return;
    }
    const well = wellRef.current;
    scrollIntoViewWithin(well, well?.querySelector<HTMLElement>(`#${CSS.escape(`${baseId}-r${cursor}`)}`));
  }, [cursor]);

  const sel = new Set(selected);

  const toggleSort = (col: Column<T>) => {
    if (sort && sort.key === col.key) {
      setSort(sort.dir === 'asc' ? { key: col.key, dir: 'desc' } : null);
    } else {
      setSort({ key: col.key, dir: 'asc' });
    }
  };

  const keysBetween = (a: number, b: number) => {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    return sorted.slice(lo, hi + 1).map(rowKey);
  };

  const selectAt = (i: number, mode: 'replace' | 'toggle' | 'range') => {
    const row = sorted[i];
    if (!row || selection === 'none') return;
    const k = rowKey(row);
    if (selection === 'single' || mode === 'replace') {
      setSelected([k]);
      anchor.current = i;
    } else if (mode === 'toggle') {
      setSelected(sel.has(k) ? selected.filter((x) => x !== k) : [...selected, k]);
      anchor.current = i;
    } else {
      setSelected(keysBetween(anchor.current, i));
    }
  };

  const pageSize = () => {
    const h = wellRef.current?.clientHeight ?? 200;
    return Math.max(1, Math.floor(h / 20) - 1);
  };

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLTableElement>) => {
    if (!sorted.length) return;
    let next: number;
    switch (e.key) {
      case 'ArrowDown':
        next = Math.min(sorted.length - 1, cursor + 1);
        break;
      case 'ArrowUp':
        next = Math.max(0, cursor - 1);
        break;
      case 'PageDown':
        next = Math.min(sorted.length - 1, cursor + pageSize());
        break;
      case 'PageUp':
        next = Math.max(0, cursor - pageSize());
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = sorted.length - 1;
        break;
      case 'Enter': {
        e.preventDefault();
        const row = sorted[cursor];
        if (row) onActivate?.(row);
        return;
      }
      case ' ':
        e.preventDefault();
        selectAt(cursor, selection === 'multi' ? 'toggle' : 'replace');
        return;
      case 'a':
      case 'A':
        if ((e.ctrlKey || e.metaKey) && selection === 'multi') {
          e.preventDefault();
          setSelected(sorted.map(rowKey));
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    setCursor(next);
    if (selection !== 'none') {
      if (e.shiftKey && selection === 'multi') selectAt(next, 'range');
      else if (!e.ctrlKey) selectAt(next, 'replace');
    }
  };

  const onRowClick = (i: number, e: MouseEvent) => {
    setCursor(i);
    if (selection === 'none') return;
    if (selection === 'multi' && e.shiftKey) selectAt(i, 'range');
    else if (selection === 'multi' && (e.ctrlKey || e.metaKey)) selectAt(i, 'toggle');
    else selectAt(i, 'replace');
  };

  const alignCls = (a?: string) => (a === 'right' ? 'is-right' : a === 'center' ? 'is-center' : undefined);

  return (
    <div class="u-stack" style={{ gap: 0, minHeight: 0, height: maxHeight ? undefined : '100%' }}>
      {caption ? <div class="dt-caption">{caption}</div> : null}
      <div ref={wellRef} class="well" style={{ maxHeight, flex: '1 1 auto' }}>
        <table
          class={cx('dt', zebra && 'dt--zebra', dense && 'dt--dense', wrap && 'dt--wrap')}
          role="grid"
          aria-label={label}
          aria-rowcount={sorted.length + 1}
          aria-multiselectable={selection === 'multi' ? true : undefined}
          aria-activedescendant={sorted.length ? `${baseId}-r${cursor}` : undefined}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={c.width !== undefined ? { width: typeof c.width === 'number' ? `${c.width}px` : c.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr role="row" aria-rowindex={1}>
              {columns.map((c) => {
                const sortable = c.sortable ?? true;
                const dir = sort && sort.key === c.key ? sort.dir : null;
                return (
                  <th
                    key={c.key}
                    role="columnheader"
                    scope="col"
                    class={alignCls(c.align)}
                    title={c.title}
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : sortable ? 'none' : undefined}
                  >
                    {sortable ? (
                      <button type="button" class="dt__sort" tabIndex={-1} onClick={() => toggleSort(c)}>
                        <span>{c.header}</span>
                        {dir ? <span class={cx('dt__arrow', dir === 'asc' ? 'dt__arrow--asc' : 'dt__arrow--desc')} aria-hidden="true" /> : null}
                      </button>
                    ) : (
                      <span class="dt__th-inner">{c.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr class="dt__empty" role="row">
                <td colSpan={columns.length} role="gridcell">
                  {empty ?? 'No records match the current selection.'}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => {
                const k = rowKey(row);
                return (
                  <tr
                    key={k}
                    id={`${baseId}-r${i}`}
                    role="row"
                    aria-rowindex={i + 2}
                    aria-selected={selection === 'none' ? undefined : sel.has(k)}
                    class={cx(i === cursor && 'is-cursor', rowClass?.(row))}
                    onClick={(e) => onRowClick(i, e as unknown as MouseEvent)}
                    onDblClick={() => onActivate?.(row)}
                    onContextMenu={
                      onRowContextMenu
                        ? (e) => {
                            e.preventDefault();
                            setCursor(i);
                            if (!sel.has(k)) selectAt(i, 'replace');
                            onRowContextMenu(row, e as unknown as MouseEvent);
                          }
                        : undefined
                    }
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        role="gridcell"
                        class={cx(alignCls(c.align), c.mono && 'is-mono')}
                        style={c.wrap ? { whiteSpace: 'normal' } : undefined}
                      >
                        {c.render ? c.render(row) : String(defaultValue(row, c.key) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {footer ? <tfoot>{footer}</tfoot> : null}
        </table>
      </div>
    </div>
  );
}
