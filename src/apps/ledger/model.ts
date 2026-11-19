/**
 * Ledger application model: route parsing, the line-item register (filter,
 * group, subtotal, columns) and the reconciliation of computed totals against
 * the stated canon figures. Pure functions, no DOM. Every figure is read from
 * canon or summed from its 127 line items; nothing here is typed by hand.
 * Unit-tested in ledger.test.ts.
 */
import { budget as canonBudget } from "@graphics/ledger/model";
import type { Budget, LineItem } from "@graphics/ledger/model";

export type { Budget, LineItem };
export const budget: Budget = canonBudget;

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

export type LedgerView =
  | { kind: "summary" }
  | { kind: "register" }
  | { kind: "category"; id: string }
  | { kind: "source"; id: string }
  | { kind: "fy"; fys: string[] };

export const HOME_ROUTE = "/ledger";
export const REGISTER_ROUTE = "/ledger/register";
export const categoryRoute = (id: string): string =>
  `/ledger/category/${id.toLowerCase()}`;
export const sourceRoute = (id: string): string =>
  `/ledger/source/${id.toLowerCase()}`;

const fyYear = (fy: string): number => Number(fy.replace(/\D/g, ""));

/**
 * The FY route that carries a fiscal year. A page /ledger/fy/<Y> covers FY<Y> and
 * every following year that has no page of its own (FY2002 shares the FY2001 sheet).
 * `available` is the list of ledger routes known to the shell; when empty, each
 * year maps to its own path.
 */
export function fyRoute(fy: string, available: readonly string[] = []): string {
  const y = fyYear(fy);
  const years = available
    .map((r) => /^\/ledger\/fy\/(\d{4})$/.exec(r)?.[1])
    .filter((v): v is string => !!v)
    .map(Number)
    .filter((v) => v <= y)
    .sort((a, b) => b - a);
  return `/ledger/fy/${years[0] ?? y}`;
}

/** Fiscal years shown on the sheet for `/ledger/fy/<year>`. */
export function fysForRoute(
  year: number,
  available: readonly string[] = [],
  b: Budget = budget,
): string[] {
  const all = b.fiscalYears.map((f) => f.fy);
  return all.filter(
    (fy) =>
      fyRoute(fy, available) === `/ledger/fy/${year}` ||
      (available.length === 0 && fyYear(fy) === year),
  );
}

/** Parse a ledger path ("/ledger/category/transit") into a view. Unknown paths give the summary. */
export function parseRoute(
  path: string | null | undefined,
  available: readonly string[] = [],
  b: Budget = budget,
): LedgerView {
  if (!path) return { kind: "summary" };
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean); // ['ledger', kind, id]
  if (parts[0] !== "ledger" || parts.length === 1) return { kind: "summary" };
  const [, kind, raw = ""] = parts;
  const id = raw.toUpperCase();
  if (kind === "register") return { kind: "register" };
  if (kind === "category" && b.categories.some((c) => c.id === id))
    return { kind: "category", id };
  if (kind === "source" && b.sources.some((s) => s.id === id))
    return { kind: "source", id };
  if (kind === "fy" && /^\d{4}$/.test(raw)) {
    const fys = fysForRoute(Number(raw), available, b);
    if (fys.length) return { kind: "fy", fys };
  }
  return { kind: "summary" };
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export const categoryName = (id: string, b: Budget = budget): string =>
  b.categories.find((c) => c.id === id)?.name ?? id;
export const sourceName = (id: string, b: Budget = budget): string =>
  b.sources.find((s) => s.id === id)?.name ?? id;
export const fiscalYearIds = (b: Budget = budget): string[] =>
  b.fiscalYears.map((f) => f.fy);

/** First fiscal year with a non-zero obligation, or '' when none. */
export function firstFy(item: LineItem, b: Budget = budget): string {
  return b.fiscalYears.find(({ fy }) => (item.fy[fy] ?? 0) > 0)?.fy ?? "";
}
/** Fiscal year with the largest obligation (earliest on a tie). */
export function peakFy(item: LineItem, b: Budget = budget): string {
  let best = "";
  let max = -1;
  for (const { fy } of b.fiscalYears) {
    const v = item.fy[fy] ?? 0;
    if (v > max) {
      max = v;
      best = fy;
    }
  }
  return max > 0 ? best : "";
}

/* ------------------------------------------------------------------ */
/* Register: filter                                                    */
/* ------------------------------------------------------------------ */

export interface RegisterFilter {
  text: string;
  category: string; // '' = all
  source: string;
  department: string;
  /** '' = programme total; otherwise only lines obligated in that FY, amount = that FY. */
  fy: string;
}
export const EMPTY_FILTER: RegisterFilter = {
  text: "",
  category: "",
  source: "",
  department: "",
  fy: "",
};

export function filterActive(f: RegisterFilter): boolean {
  return !!(f.text.trim() || f.category || f.source || f.department || f.fy);
}

/** Amount of a line on the current basis (programme total, or one fiscal year). */
export function amountOf(item: LineItem, fy: string): number {
  return fy ? (item.fy[fy] ?? 0) : item.amountM;
}

export function filterItems(
  items: readonly LineItem[],
  f: RegisterFilter,
): LineItem[] {
  const q = f.text.trim().toLowerCase();
  return items.filter(
    (l) =>
      (!f.category || l.categoryId === f.category) &&
      (!f.source || l.sourceId === f.source) &&
      (!f.department || l.department === f.department) &&
      (!f.fy || (l.fy[f.fy] ?? 0) > 0) &&
      (!q ||
        l.no.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        l.account.toLowerCase().includes(q)),
  );
}

/* ------------------------------------------------------------------ */
/* Register: grouping and subtotals                                    */
/* ------------------------------------------------------------------ */

export type GroupBy = "none" | "category" | "source" | "department" | "firstFy";
export const GROUP_LABELS: Record<GroupBy, string> = {
  none: "No grouping",
  category: "Programme category",
  source: "Funding source",
  department: "Cover department",
  firstFy: "First obligation year",
};

export interface Totals {
  count: number;
  amountM: number;
  fy: Record<string, number>;
}

export function totalsOf(
  items: readonly LineItem[],
  b: Budget = budget,
): Totals {
  const fy: Record<string, number> = {};
  for (const { fy: y } of b.fiscalYears) fy[y] = 0;
  let amountM = 0;
  for (const l of items) {
    amountM += l.amountM;
    for (const y of Object.keys(fy)) fy[y] = (fy[y] ?? 0) + (l.fy[y] ?? 0);
  }
  return { count: items.length, amountM, fy };
}

export interface Group {
  key: string;
  label: string;
  items: LineItem[];
  totals: Totals;
}

function groupKey(item: LineItem, by: GroupBy, b: Budget): string {
  switch (by) {
    case "category":
      return item.categoryId;
    case "source":
      return item.sourceId;
    case "department":
      return item.department;
    case "firstFy":
      return firstFy(item, b);
    case "none":
      return "";
  }
}

function groupOrder(by: GroupBy, b: Budget): string[] {
  switch (by) {
    case "category":
      return b.categories.map((c) => c.id);
    case "source":
      return b.sources.map((s) => s.id);
    case "department":
      return [...b.departments];
    case "firstFy":
      return b.fiscalYears.map((f) => f.fy);
    case "none":
      return [""];
  }
}

export function groupLabel(
  key: string,
  by: GroupBy,
  b: Budget = budget,
): string {
  switch (by) {
    case "category":
      return categoryName(key, b);
    case "source":
      return sourceName(key, b);
    case "department":
      return key;
    case "firstFy":
      return key ? `First obligated ${key}` : "No obligation";
    case "none":
      return "All lines";
  }
}

/** Groups in canon order; empty groups are dropped. Items keep the order they were given in. */
export function groupItems(
  items: readonly LineItem[],
  by: GroupBy,
  b: Budget = budget,
): Group[] {
  const buckets = new Map<string, LineItem[]>();
  for (const k of groupOrder(by, b)) buckets.set(k, []);
  for (const l of items) {
    const k = groupKey(l, by, b);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(l);
  }
  const out: Group[] = [];
  for (const [key, list] of buckets) {
    if (!list.length) continue;
    out.push({
      key,
      label: groupLabel(key, by, b),
      items: list,
      totals: totalsOf(list, b),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Register: sorting                                                   */
/* ------------------------------------------------------------------ */

export type SortKey =
  | "no"
  | "title"
  | "department"
  | "account"
  | "source"
  | "category"
  | "amount"
  | "first"
  | "peak"
  | `fy:${string}`;

export function sortValue(
  item: LineItem,
  key: string,
  fy: string,
  b: Budget = budget,
): string | number {
  if (key.startsWith("fy:")) return item.fy[key.slice(3)] ?? 0;
  switch (key) {
    case "no":
      return item.no;
    case "title":
      return item.title;
    case "department":
      return item.department;
    case "account":
      return item.account;
    case "source":
      return b.sources.findIndex((s) => s.id === item.sourceId);
    case "category":
      return b.categories.findIndex((c) => c.id === item.categoryId);
    case "amount":
      return amountOf(item, fy);
    case "first":
      return firstFy(item, b);
    case "peak":
      return peakFy(item, b);
    case "share":
      return shareOfCategory(item, b);
    default:
      return item.no;
  }
}

export function sortItems(
  items: readonly LineItem[],
  key: string,
  dir: "asc" | "desc",
  fy: string,
  b: Budget = budget,
): LineItem[] {
  const out = items.slice().sort((x, y) => {
    const a = sortValue(x, key, fy, b);
    const c = sortValue(y, key, fy, b);
    const d =
      typeof a === "number" && typeof c === "number"
        ? a - c
        : String(a).localeCompare(String(c), "en-US", { numeric: true });
    return d || x.no.localeCompare(y.no);
  });
  return dir === "desc" ? out.reverse() : out;
}

/* ------------------------------------------------------------------ */
/* Register: grid rows                                                 */
/* ------------------------------------------------------------------ */

export type GridRow =
  | { type: "item"; key: string; item: LineItem; group: string }
  | { type: "subtotal"; key: string; group: Group; collapsed: boolean };

/**
 * Flatten groups into grid rows: each group's lines (unless collapsed) followed
 * by its subtotal row. With no grouping, lines only.
 */
export function gridRows(
  groups: readonly Group[],
  by: GroupBy,
  collapsed: ReadonlySet<string>,
  subtotals = true,
): GridRow[] {
  const rows: GridRow[] = [];
  for (const g of groups) {
    const isCollapsed = by !== "none" && collapsed.has(g.key);
    if (by !== "none" && subtotals && isCollapsed) {
      rows.push({
        type: "subtotal",
        key: `sub:${g.key}`,
        group: g,
        collapsed: true,
      });
      continue;
    }
    for (const item of g.items)
      rows.push({ type: "item", key: item.no, item, group: g.key });
    if (by !== "none" && subtotals)
      rows.push({
        type: "subtotal",
        key: `sub:${g.key}`,
        group: g,
        collapsed: false,
      });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

export interface ColumnSpec {
  key: string;
  label: string;
  /** Always shown (cannot be hidden in the column chooser). */
  fixed?: boolean;
  numeric?: boolean;
  defaultVisible: boolean;
}

export function columnSpecs(b: Budget = budget): ColumnSpec[] {
  return [
    { key: "no", label: "Line", fixed: true, defaultVisible: true },
    { key: "title", label: "Title", fixed: true, defaultVisible: true },
    { key: "department", label: "Dept", defaultVisible: true },
    { key: "account", label: "Account", defaultVisible: true },
    { key: "source", label: "Funding source", defaultVisible: true },
    { key: "category", label: "Programme category", defaultVisible: true },
    {
      key: "amount",
      label: "Amount ($M)",
      fixed: true,
      numeric: true,
      defaultVisible: true,
    },
    {
      key: "share",
      label: "Share of category",
      numeric: true,
      defaultVisible: false,
    },
    { key: "first", label: "First FY", defaultVisible: false },
    { key: "peak", label: "Peak FY", defaultVisible: false },
    { key: "trend", label: "Profile", defaultVisible: true },
    ...b.fiscalYears.map(({ fy }) => ({
      key: `fy:${fy}`,
      label: `${fy} ($M)`,
      numeric: true,
      defaultVisible: false,
    })),
  ];
}

export const defaultColumns = (b: Budget = budget): string[] =>
  columnSpecs(b)
    .filter((c) => c.defaultVisible)
    .map((c) => c.key);

/** Share of the line in its programme category, percent. */
export function shareOfCategory(item: LineItem, b: Budget = budget): number {
  const total = b.lineItems
    .filter((l) => l.categoryId === item.categoryId)
    .reduce((a, l) => a + l.amountM, 0);
  return total ? (item.amountM / total) * 100 : 0;
}

/* ------------------------------------------------------------------ */
/* Cross-tabulations                                                   */
/* ------------------------------------------------------------------ */

export interface CrossRow {
  id: string;
  label: string;
  amountM: number;
  count: number;
  pct: number; // share of the scope total
}

/** Sum the scope's lines by a dimension, in canon order, dropping empty rows. */
export function crossTab(
  items: readonly LineItem[],
  by: Exclude<GroupBy, "none">,
  fy = "",
  b: Budget = budget,
): CrossRow[] {
  const groups = groupItems(items, by, b);
  const total = items.reduce((a, l) => a + amountOf(l, fy), 0);
  return groups
    .map((g) => {
      const amountM = g.items.reduce((a, l) => a + amountOf(l, fy), 0);
      return {
        id: g.key,
        label: g.label,
        amountM,
        count: g.items.filter((l) => amountOf(l, fy) > 0).length,
        pct: total ? (amountM / total) * 100 : 0,
      };
    })
    .filter((r) => r.amountM > 0 || !fy);
}

/** Per-FY totals of a set of lines, every canon year. */
export function fyProfile(
  items: readonly LineItem[],
  b: Budget = budget,
): { fy: string; amountM: number; count: number }[] {
  return b.fiscalYears.map(({ fy }) => ({
    fy,
    amountM: items.reduce((a, l) => a + (l.fy[fy] ?? 0), 0),
    count: items.filter((l) => (l.fy[fy] ?? 0) > 0).length,
  }));
}

export interface AccountRow {
  account: string;
  department: string;
  count: number;
  amountM: number;
  items: string[];
}
/** Account codes reached by a set of lines (one row per account). */
export function accountsReached(items: readonly LineItem[]): AccountRow[] {
  const map = new Map<string, AccountRow>();
  for (const l of items) {
    const row = map.get(l.account) ?? {
      account: l.account,
      department: l.department,
      count: 0,
      amountM: 0,
      items: [],
    };
    row.count += 1;
    row.amountM += l.amountM;
    row.items.push(l.no);
    map.set(l.account, row);
  }
  return [...map.values()].sort((a, b) => a.account.localeCompare(b.account));
}

/* ------------------------------------------------------------------ */
/* Reconciliation                                                      */
/* ------------------------------------------------------------------ */

export interface Check {
  id: string;
  group: "Programme" | "Category" | "Source" | "Fiscal year" | "Line items";
  label: string;
  /** Stated canon figure, millions (or a count for the line-item check). */
  statedM: number;
  /** Computed from the line items, millions (or a count). */
  computedM: number;
  /** Absolute tolerance, millions: half a unit of the stated figure's last digit. */
  tolerance: number;
  agrees: boolean;
}

/** Decimal places used by a stated figure (142 -> 0, 117.67 -> 2). */
function decimals(v: number): number {
  const s = String(v);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function check(
  id: string,
  group: Check["group"],
  label: string,
  statedM: number,
  computedM: number,
  tolerance: number,
): Check {
  return {
    id,
    group,
    label,
    statedM,
    computedM,
    tolerance,
    agrees: Math.abs(statedM - computedM) <= tolerance + 1e-9,
  };
}

/**
 * Every stated total in canon.budget against the same total computed from the
 * line items. Billions-stated figures are compared at the precision they are
 * stated in (a figure stated as $117.67B agrees with any sum within $5M).
 */
export function reconcile(b: Budget = budget): Check[] {
  const L = b.lineItems;
  const sum = (pred: (l: LineItem) => boolean) =>
    L.filter(pred).reduce((a, l) => a + l.amountM, 0);
  const tolB = (v: number) =>
    decimals(v) === 0 ? 0 : 0.5 * 10 ** -decimals(v) * 1000;
  const out: Check[] = [];
  out.push(
    check(
      "total",
      "Programme",
      "Total programme cost",
      b.totalB * 1000,
      sum(() => true),
      tolB(b.totalB),
    ),
  );
  out.push(
    check(
      "count",
      "Line items",
      "Line items in register",
      b.lineItemCount,
      L.length,
      0,
    ),
  );
  for (const c of b.categories)
    out.push(
      check(
        `cat:${c.id}`,
        "Category",
        c.name,
        c.amountB * 1000,
        sum((l) => l.categoryId === c.id),
        tolB(c.amountB),
      ),
    );
  for (const s of b.sources)
    out.push(
      check(
        `src:${s.id}`,
        "Source",
        s.name,
        s.amountB * 1000,
        sum((l) => l.sourceId === s.id),
        tolB(s.amountB),
      ),
    );
  for (const f of b.fiscalYears) {
    out.push(
      check(
        `fy:${f.fy}`,
        "Fiscal year",
        f.fy,
        f.totalM,
        L.reduce((a, l) => a + (l.fy[f.fy] ?? 0), 0),
        0,
      ),
    );
  }
  return out;
}

/** Lines whose fiscal-year entries do not sum to the line amount. */
export function lineProfileVariances(b: Budget = budget): string[] {
  return b.lineItems
    .filter((l) => Object.values(l.fy).reduce((a, v) => a + v, 0) !== l.amountM)
    .map((l) => l.no);
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

/** Tab-separated text of lines for the clipboard, header first. */
export function toTsv(
  items: readonly LineItem[],
  fy: string,
  b: Budget = budget,
): string {
  const head = [
    "Line",
    "Title",
    "Dept",
    "Account",
    "Funding source",
    "Programme category",
    fy ? `${fy} ($M)` : "Amount ($M)",
  ];
  const rows = items.map((l) => [
    l.no,
    l.title,
    l.department,
    l.account,
    sourceName(l.sourceId, b),
    categoryName(l.categoryId, b),
    String(amountOf(l, fy)),
  ]);
  return [head, ...rows].map((r) => r.join("\t")).join("\n");
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const GROUPED = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
/** Grouped millions without a unit: 4023 -> "4,023". */
export const fmtNum = (m: number): string => GROUPED.format(Math.round(m));
