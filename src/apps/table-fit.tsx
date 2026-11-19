/**
 * Keeps a DataTable's flexible column readable.
 *
 * DataTable lays out with `table-layout: fixed`. When the fixed-width columns
 * add up to more than the well is wide, the browser gives every column without
 * a width (the Title or Subject column) zero pixels, and a wrapping cell then
 * breaks one word per line and stretches its row to 100-200px. Wrapping the
 * table in <TableFit> sets a minimum table width (the fixed columns plus a
 * floor for each flexible one), so narrow windows scroll the well sideways
 * instead of collapsing the column.
 *
 * The wrapper is `display: contents`, so it adds no box and the table still
 * fills its parent exactly as before.
 */
import type { ComponentChildren, JSX } from 'preact';
import './table-fit.css';

export interface FitColumn {
  width?: number | string;
}

/** Sum of numeric column widths, with `flex` px for each column that has none. */
export function tableMinWidth(columns: readonly FitColumn[], flex = 200): number {
  return columns.reduce((a, c) => a + (typeof c.width === 'number' ? c.width : flex), 0);
}

export function TableFit({
  columns,
  flex = 200,
  children,
}: {
  columns: readonly FitColumn[];
  /** Minimum width in px for each column without a numeric width. */
  flex?: number;
  children: ComponentChildren;
}): JSX.Element {
  return (
    <div class="app-dt-fit" style={{ '--app-dt-min': `${tableMinWidth(columns, flex)}px` }}>
      {children}
    </div>
  );
}
