/**
 * The line-item register: a spreadsheet-like grid of the 127 cover line items
 * with filter, sort within groups, subtotals by category / source / department
 * / first obligation year, a column chooser and a record pane for the selection.
 * State lives in App so the menus and the print extract see the same view.
 */
import { useMemo, useState } from "preact/hooks";
import type { JSX } from "preact";
import {
  Button,
  DataTable,
  Menu,
  PropertyGrid,
  Select,
  TextField,
  Toolbar,
  ToolbarButton,
  ToolbarLabel,
  ToolbarSeparator,
  ToolbarSpacer,
} from "@design/index";
import type { Column, MenuItem, SortState } from "@design/index";
import { LineItemSparkline, fmtM, fmtPct } from "@graphics/ledger";
import {
  EMPTY_FILTER,
  GROUP_LABELS,
  amountOf,
  budget,
  categoryName,
  categoryRoute,
  columnSpecs,
  filterActive,
  filterItems,
  firstFy,
  fmtNum,
  gridRows,
  groupItems,
  peakFy,
  shareOfCategory,
  sortItems,
  sourceName,
  sourceRoute,
  totalsOf,
} from "./model";
import type {
  GridRow,
  Group,
  GroupBy,
  LineItem,
  RegisterFilter,
  Totals,
} from "./model";
import { CanonText, NavLink } from "./parts";
import type { ViewCtx } from "./Views";

export interface RegState {
  filter: RegisterFilter;
  groupBy: GroupBy;
  collapsed: string[];
  sort: SortState | null;
  columns: string[];
  selected: string[];
  subtotals: boolean;
  detail: boolean;
}

export interface RegisterModel {
  filtered: LineItem[];
  groups: Group[];
  rows: GridRow[];
  totals: Totals;
  selectedItems: LineItem[];
}

/** Derive the grid from register state (shared by the grid, the status bar and the print extract). */
export function useRegisterModel(s: RegState): RegisterModel {
  return useMemo(() => {
    const filtered = filterItems(budget.lineItems, s.filter);
    const sorted = s.sort
      ? sortItems(filtered, s.sort.key, s.sort.dir, s.filter.fy)
      : filtered;
    const groups = groupItems(sorted, s.groupBy);
    const rows = gridRows(groups, s.groupBy, new Set(s.collapsed), s.subtotals);
    const sel = new Set(s.selected);
    return {
      filtered,
      groups,
      rows,
      totals: totalsOf(filtered),
      selectedItems: filtered.filter((l) => sel.has(l.no)),
    };
  }, [s.filter, s.sort, s.groupBy, s.collapsed, s.subtotals, s.selected]);
}

/** Human description of the current filter, for the status bar and print extract. */
export function describeFilter(f: RegisterFilter): string {
  const parts: string[] = [];
  if (f.category) parts.push(`category ${categoryName(f.category)}`);
  if (f.source) parts.push(`source ${f.source}`);
  if (f.department) parts.push(`department ${f.department}`);
  if (f.fy) parts.push(`obligated in ${f.fy}`);
  if (f.text.trim()) parts.push(`text "${f.text.trim()}"`);
  return parts.length ? parts.join("; ") : "all lines";
}

const subtotalAmount = (t: Totals, fy: string) =>
  fy ? (t.fy[fy] ?? 0) : t.amountM;

export function Register({
  ctx,
  s,
  set,
  model,
  findId,
  onColumns,
  onPrint,
  onCopy,
}: {
  ctx: ViewCtx;
  s: RegState;
  set: (patch: Partial<RegState>) => void;
  model: RegisterModel;
  findId: string;
  onColumns: () => void;
  onPrint: () => void;
  onCopy: () => void;
}): JSX.Element {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    row: GridRow;
  } | null>(null);
  const fy = s.filter.fy;
  const specs = useMemo(() => columnSpecs(), []);
  const visible = specs.filter((c) => c.fixed || s.columns.includes(c.key));

  const setFilter = (patch: Partial<RegisterFilter>) =>
    set({ filter: { ...s.filter, ...patch }, collapsed: [] });
  const toggleGroup = (key: string) =>
    set({
      collapsed: s.collapsed.includes(key)
        ? s.collapsed.filter((k) => k !== key)
        : [...s.collapsed, key],
    });

  const columns: Column<GridRow>[] = visible.map((spec): Column<GridRow> => {
    const base = {
      key: spec.key,
      header: spec.key === "amount" && fy ? `${fy} ($M)` : spec.label,
    };
    switch (spec.key) {
      case "no":
        return {
          ...base,
          mono: true,
          width: 72,
          render: (r) =>
            r.type === "item" ? (
              r.item.no
            ) : (
              <span
                class="lga-twisty"
                aria-label={r.collapsed ? "Collapsed group" : "Expanded group"}
              >
                {r.collapsed ? "+" : "-"}
              </span>
            ),
        };
      case "title":
        return {
          ...base,
          render: (r) =>
            r.type === "item" ? (
              <span title={r.item.title}>
                <CanonText
                  value={r.item.title}
                  services={ctx.services}
                  subject={ctx.subject}
                />
              </span>
            ) : (
              <span class="lga-subtotal-label">
                Subtotal, {r.group.label} ({r.group.totals.count}{" "}
                {r.group.totals.count === 1 ? "line" : "lines"})
              </span>
            ),
        };
      case "department":
        return {
          ...base,
          width: 52,
          render: (r) => (r.type === "item" ? r.item.department : ""),
        };
      case "account":
        return {
          ...base,
          width: 92,
          mono: true,
          render: (r) =>
            r.type === "item" ? (
              <CanonText
                value={r.item.account}
                services={ctx.services}
                subject={ctx.subject}
              />
            ) : (
              ""
            ),
        };
      case "source":
        return {
          ...base,
          width: 150,
          render: (r) =>
            r.type === "item" ? (
              <span title={sourceName(r.item.sourceId)}>
                {sourceName(r.item.sourceId)}
              </span>
            ) : (
              ""
            ),
        };
      case "category":
        return {
          ...base,
          width: 150,
          render: (r) =>
            r.type === "item" ? categoryName(r.item.categoryId) : "",
        };
      case "amount":
        return {
          ...base,
          width: 92,
          align: "right",
          mono: true,
          render: (r) =>
            fmtNum(
              r.type === "item"
                ? amountOf(r.item, fy)
                : subtotalAmount(r.group.totals, fy),
            ),
        };
      case "share":
        return {
          ...base,
          width: 80,
          align: "right",
          mono: true,
          render: (r) =>
            r.type === "item" ? fmtPct(shareOfCategory(r.item)) : "",
        };
      case "first":
        return {
          ...base,
          width: 72,
          mono: true,
          render: (r) => (r.type === "item" ? firstFy(r.item) : ""),
        };
      case "peak":
        return {
          ...base,
          width: 72,
          mono: true,
          render: (r) => (r.type === "item" ? peakFy(r.item) : ""),
        };
      case "trend":
        return {
          ...base,
          width: 100,
          sortable: false,
          render: (r) =>
            r.type === "item" ? <LineItemSparkline no={r.item.no} /> : "",
        };
      default: {
        const y = spec.key.slice(3);
        return {
          ...base,
          width: 84,
          align: "right",
          mono: true,
          render: (r) =>
            fmtNum(
              r.type === "item"
                ? (r.item.fy[y] ?? 0)
                : (r.group.totals.fy[y] ?? 0),
            ),
        };
      }
    }
  });

  const footCell = (key: string): string => {
    const t = model.totals;
    if (key === "no") return "Total";
    if (key === "title")
      return `${t.count} ${t.count === 1 ? "line" : "lines"}${filterActive(s.filter) ? ", filtered" : ""}`;
    if (key === "amount") return fmtNum(subtotalAmount(t, fy));
    if (key.startsWith("fy:")) return fmtNum(t.fy[key.slice(3)] ?? 0);
    return "";
  };

  const selItems = model.selectedItems;
  const one = selItems.length === 1 ? selItems[0]! : null;

  const rowMenu = (row: GridRow): MenuItem[] => {
    if (row.type === "subtotal") {
      return [
        {
          label: row.collapsed ? "&Expand group" : "&Collapse group",
          onSelect: () => toggleGroup(row.group.key),
        },
        {
          label: "Collapse &all groups",
          onSelect: () => set({ collapsed: model.groups.map((g) => g.key) }),
        },
        { label: "E&xpand all groups", onSelect: () => set({ collapsed: [] }) },
      ];
    }
    const l = row.item;
    return [
      { label: "&Copy line", shortcut: "Ctrl+C", onSelect: onCopy },
      { separator: true },
      {
        label: `Filter to category: ${categoryName(l.categoryId)}`,
        onSelect: () => setFilter({ category: l.categoryId }),
      },
      {
        label: `Filter to source: ${l.sourceId}`,
        onSelect: () => setFilter({ source: l.sourceId }),
      },
      {
        label: `Filter to department: ${l.department}`,
        onSelect: () => setFilter({ department: l.department }),
      },
      { separator: true },
      {
        label: "Open category &sheet",
        onSelect: () => ctx.nav(categoryRoute(l.categoryId)),
      },
      {
        label: "Open source s&heet",
        onSelect: () => ctx.nav(sourceRoute(l.sourceId)),
      },
    ];
  };

  return (
    <div class="lga-register">
      <Toolbar label="Register">
        <ToolbarButton
          label="Columns..."
          title="Choose the columns shown"
          onClick={onColumns}
        />
        <ToolbarButton
          label="Subtotals"
          pressed={s.subtotals}
          disabled={s.groupBy === "none"}
          title="Show a subtotal row under each group"
          onClick={() => set({ subtotals: !s.subtotals })}
        />
        <ToolbarButton
          label="Collapse all"
          disabled={s.groupBy === "none" || !s.subtotals}
          onClick={() => set({ collapsed: model.groups.map((g) => g.key) })}
        />
        <ToolbarButton
          label="Expand all"
          disabled={s.collapsed.length === 0}
          onClick={() => set({ collapsed: [] })}
        />
        <ToolbarSeparator />
        <ToolbarButton
          label="Copy"
          disabled={selItems.length === 0}
          title="Copy the selected lines (Ctrl+C)"
          onClick={onCopy}
        />
        <ToolbarButton
          label="Print extract..."
          title="Print the register as shown (Ctrl+Shift+P)"
          onClick={onPrint}
        />
        <ToolbarButton
          label="Record"
          pressed={s.detail}
          title="Show the record pane"
          onClick={() => set({ detail: !s.detail })}
        />
        <ToolbarSpacer />
        <ToolbarLabel>
          {model.filtered.length} of {budget.lineItems.length} lines
        </ToolbarLabel>
      </Toolbar>
      <div class="lga-filters" role="search" aria-label="Register filter">
        <TextField
          id={findId}
          label="Find"
          layout="stacked"
          width={16}
          value={s.filter.text}
          onInput={(v) => setFilter({ text: v })}
        />
        <Select
          label="Programme category"
          layout="stacked"
          width={22}
          value={s.filter.category}
          onChange={(v) => setFilter({ category: v })}
          options={[
            { value: "", label: "All categories" },
            ...budget.categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          label="Funding source"
          layout="stacked"
          width={24}
          value={s.filter.source}
          onChange={(v) => setFilter({ source: v })}
          options={[
            { value: "", label: "All sources" },
            ...budget.sources.map((x) => ({
              value: x.id,
              label: `${x.id}: ${x.name}`,
            })),
          ]}
        />
        <Select
          label="Department"
          layout="stacked"
          width={16}
          value={s.filter.department}
          onChange={(v) => setFilter({ department: v })}
          options={[
            { value: "", label: "All departments" },
            ...budget.departments.map((d) => ({ value: d, label: d })),
          ]}
        />
        <Select
          label="Amount basis"
          layout="stacked"
          width={17}
          value={s.filter.fy}
          onChange={(v) => setFilter({ fy: v })}
          options={[
            { value: "", label: "Programme total" },
            ...budget.fiscalYears.map((f) => ({
              value: f.fy,
              label: `${f.fy} only`,
            })),
          ]}
        />
        <Select
          label="Group and subtotal by"
          layout="stacked"
          width={22}
          value={s.groupBy}
          onChange={(v) => set({ groupBy: v as GroupBy, collapsed: [] })}
          options={(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => ({
            value: g,
            label: GROUP_LABELS[g],
          }))}
        />
        <div class="lga-filters__btn">
          <Button
            size="small"
            label="C&lear filter"
            disabled={!filterActive(s.filter)}
            onClick={() => set({ filter: EMPTY_FILTER, collapsed: [] })}
          />
        </div>
      </div>
      <div
        class="lga-grid"
        style={{
          "--lga-min": `${columns.reduce((a, c) => a + (typeof c.width === "number" ? c.width : 260), 0)}px`,
        }}
      >
        <DataTable
          columns={columns}
          rows={model.rows}
          rowKey={(r) => r.key}
          label={`Register of line items, ${model.filtered.length} of ${budget.lineItems.length} lines`}
          selection="multi"
          selected={s.selected}
          onSelectionChange={(keys) =>
            set({ selected: keys.filter((k) => !k.startsWith("sub:")) })
          }
          sort={s.sort}
          onSortChange={(sort) => set({ sort })}
          sortRows={false}
          dense
          rowClass={(r) => (r.type === "subtotal" ? "lga-subtotal" : undefined)}
          onActivate={(r) =>
            r.type === "subtotal"
              ? toggleGroup(r.group.key)
              : set({ detail: true })
          }
          onRowContextMenu={(r, e) =>
            setMenu({ x: e.clientX, y: e.clientY, row: r })
          }
          empty="No line items match the filter. Clear the filter to show the full register."
          footer={
            <tr class="dt__total lga-grand">
              {visible.map((c) => (
                <td
                  key={c.key}
                  class={
                    c.numeric
                      ? "is-right is-mono"
                      : c.key === "no"
                        ? "is-mono"
                        : undefined
                  }
                >
                  {footCell(c.key)}
                </td>
              ))}
            </tr>
          }
        />
      </div>
      {s.detail ? (
        <section class="lga-record" aria-label="Line item record">
          {one ? (
            <LineRecord item={one} ctx={ctx} />
          ) : selItems.length > 1 ? (
            <p class="lga-record__msg">
              {selItems.length} lines selected. Total{" "}
              {fmtM(selItems.reduce((a, l) => a + l.amountM, 0))}
              {fy
                ? `; ${fy} ${fmtM(selItems.reduce((a, l) => a + (l.fy[fy] ?? 0), 0))}`
                : ""}
              .
            </p>
          ) : (
            <p class="lga-record__msg">
              Select a line to show its record. Enter on a subtotal row
              collapses or expands the group.
            </p>
          )}
        </section>
      ) : null}
      {menu ? (
        <Menu
          label="Line item"
          position={{ x: menu.x, y: menu.y }}
          initialIndex={0}
          items={rowMenu(menu.row)}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  );
}

function LineRecord({ item, ctx }: { item: LineItem; ctx: ViewCtx }) {
  return (
    <div class="lga-record__body">
      <PropertyGrid
        columns={2}
        rows={[
          { label: "Line item", value: item.no, mono: true },
          {
            label: "Account",
            value: (
              <CanonText
                value={item.account}
                services={ctx.services}
                subject={ctx.subject}
              />
            ),
            mono: true,
          },
          {
            label: "Title",
            value: (
              <CanonText
                value={item.title}
                services={ctx.services}
                subject={ctx.subject}
              />
            ),
          },
          { label: "Department", value: item.department },
          {
            label: "Funding source",
            value: (
              <NavLink href={sourceRoute(item.sourceId)} onNavigate={ctx.nav}>
                {sourceName(item.sourceId)}
              </NavLink>
            ),
          },
          {
            label: "Programme category",
            value: (
              <NavLink
                href={categoryRoute(item.categoryId)}
                onNavigate={ctx.nav}
              >
                {categoryName(item.categoryId)}
              </NavLink>
            ),
          },
          { label: "Amount", value: fmtM(item.amountM), mono: true },
          {
            label: "Share of category",
            value: fmtPct(shareOfCategory(item)),
            mono: true,
          },
          { label: "First obligated", value: firstFy(item), mono: true },
          { label: "Peak year", value: peakFy(item), mono: true },
        ]}
      />
      <div class="lga-record__profile">
        <table
          class="lga-fytable"
          aria-label={`${item.no} obligations by fiscal year ($M)`}
        >
          <thead>
            <tr>
              {budget.fiscalYears.map((f) => (
                <th key={f.fy} scope="col">
                  {f.fy}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {budget.fiscalYears.map((f) => (
                <td key={f.fy}>{fmtNum(item.fy[f.fy] ?? 0)}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <LineItemSparkline no={item.no} width={160} height={28} />
      </div>
    </div>
  );
}
