/**
 * Ledger app: every total the application computes from the 127 line items is
 * cross-checked against the stated canon totals (programme, categories,
 * sources, fiscal years), plus the register's filter, grouping, subtotal and
 * route logic.
 */
import { describe, expect, it } from "vitest";
import canonJson from "@canon";
import type { Canon } from "@core/canon-types";
import {
  EMPTY_FILTER,
  accountsReached,
  budget,
  crossTab,
  defaultColumns,
  filterItems,
  fyProfile,
  fyRoute,
  gridRows,
  groupItems,
  lineProfileVariances,
  parseRoute,
  reconcile,
  sortItems,
  totalsOf,
  toTsv,
} from "./model";

const canon = canonJson as unknown as Canon;
const L = budget.lineItems;
const sumM = (items: readonly { amountM: number }[]) =>
  items.reduce((a, r) => a + r.amountM, 0);

describe("ledger totals reconcile with canon", () => {
  it("uses the canon budget", () => {
    expect(budget).toBe(canon.budget);
    expect(L.length).toBe(canon.budget.lineItemCount);
  });

  it("every reconciliation check agrees", () => {
    const checks = reconcile();
    const failing = checks
      .filter((c) => !c.agrees)
      .map((c) => `${c.id}: stated ${c.statedM}, computed ${c.computedM}`);
    expect(failing).toEqual([]);
    // One check per stated figure: total, count, 5 categories, 5 sources, every FY.
    expect(checks.length).toBe(
      2 +
        canon.budget.categories.length +
        canon.budget.sources.length +
        canon.budget.fiscalYears.length,
    );
  });

  it("grand total equals the canon programme cost and the headline figure", () => {
    expect(totalsOf(L).amountM).toBe(canon.budget.totalB * 1000);
    expect(totalsOf(L).amountM).toBe(canon.headline.programCostB * 1000);
  });

  it("category subtotals equal canon category amounts", () => {
    const groups = groupItems(L, "category");
    expect(groups.map((g) => g.key)).toEqual(
      canon.budget.categories.map((c) => c.id),
    );
    for (const c of canon.budget.categories) {
      const g = groups.find((x) => x.key === c.id)!;
      expect(g.totals.amountM).toBe(c.amountB * 1000);
    }
  });

  it("source subtotals equal canon source amounts at stated precision", () => {
    for (const s of canon.budget.sources) {
      const g = groupItems(L, "source").find((x) => x.key === s.id)!;
      expect(Math.abs(g.totals.amountM - s.amountB * 1000)).toBeLessThanOrEqual(
        5,
      );
    }
  });

  it("fiscal-year totals equal canon year totals, and years sum to the programme", () => {
    const t = totalsOf(L);
    for (const f of canon.budget.fiscalYears) expect(t.fy[f.fy]).toBe(f.totalM);
    expect(canon.budget.fiscalYears.reduce((a, f) => a + f.totalM, 0)).toBe(
      canon.budget.totalB * 1000,
    );
    expect(fyProfile(L).map((r) => r.amountM)).toEqual(
      canon.budget.fiscalYears.map((f) => f.totalM),
    );
  });

  it("each line profile sums to the line amount", () => {
    expect(lineProfileVariances()).toEqual([]);
  });

  it("subtotals in every grouping sum to the grand total", () => {
    for (const by of ["category", "source", "department", "firstFy"] as const) {
      const groups = groupItems(L, by);
      expect(groups.reduce((a, g) => a + g.totals.amountM, 0)).toBe(
        canon.budget.totalB * 1000,
      );
      expect(groups.reduce((a, g) => a + g.totals.count, 0)).toBe(L.length);
    }
  });

  it("department totals cover the four canon departments", () => {
    const groups = groupItems(L, "department");
    expect(groups.map((g) => g.key)).toEqual(
      canon.budget.departments.filter((d) => L.some((l) => l.department === d)),
    );
  });

  it("cross-tabs within a category add back to the canon category amount", () => {
    for (const c of canon.budget.categories) {
      const scope = filterItems(L, { ...EMPTY_FILTER, category: c.id });
      expect(sumM(crossTab(scope, "source"))).toBe(c.amountB * 1000);
      expect(sumM(crossTab(scope, "department"))).toBe(c.amountB * 1000);
      expect(
        crossTab(scope, "source").reduce((a, r) => a + r.pct, 0),
      ).toBeCloseTo(100, 6);
    }
  });

  it("fiscal-year cross-tab by category matches the canon year total", () => {
    for (const f of canon.budget.fiscalYears) {
      const scope = filterItems(L, { ...EMPTY_FILTER, fy: f.fy });
      expect(sumM(crossTab(scope, "category", f.fy))).toBe(f.totalM);
    }
  });

  it("accounts reached by a source sum to that source", () => {
    for (const s of canon.budget.sources) {
      const scope = filterItems(L, { ...EMPTY_FILTER, source: s.id });
      expect(sumM(accountsReached(scope))).toBe(sumM(scope));
      expect(accountsReached(scope).reduce((a, r) => a + r.count, 0)).toBe(
        scope.length,
      );
    }
  });
});

describe("register", () => {
  it("filters by text, department and fiscal year", () => {
    expect(filterItems(L, { ...EMPTY_FILTER, text: L[0]!.no })).toContain(L[0]);
    const dhs = filterItems(L, { ...EMPTY_FILTER, department: "DHS" });
    expect(dhs.every((l) => l.department === "DHS")).toBe(true);
    const fy = canon.budget.fiscalYears[0]!.fy;
    expect(
      filterItems(L, { ...EMPTY_FILTER, fy }).every((l) => (l.fy[fy] ?? 0) > 0),
    ).toBe(true);
  });

  it("grid rows: one subtotal per group, collapsed groups hide their lines", () => {
    const groups = groupItems(L, "category");
    const rows = gridRows(groups, "category", new Set());
    expect(rows.filter((r) => r.type === "subtotal").length).toBe(
      groups.length,
    );
    expect(rows.filter((r) => r.type === "item").length).toBe(L.length);
    const first = groups[0]!;
    const collapsed = gridRows(groups, "category", new Set([first.key]));
    expect(collapsed.filter((r) => r.type === "item").length).toBe(
      L.length - first.items.length,
    );
    expect(
      gridRows(groupItems(L, "none"), "none", new Set()).every(
        (r) => r.type === "item",
      ),
    ).toBe(true);
  });

  it("sorts by amount on either basis", () => {
    const desc = sortItems(L, "amount", "desc", "");
    expect(desc[0]!.amountM).toBe(Math.max(...L.map((l) => l.amountM)));
    const fy = canon.budget.fiscalYears[3]!.fy;
    const byFy = sortItems(L, "amount", "desc", fy);
    expect(byFy[0]!.fy[fy] ?? 0).toBe(Math.max(...L.map((l) => l.fy[fy] ?? 0)));
  });

  it("default columns include the fixed ones", () => {
    expect(defaultColumns()).toEqual(
      expect.arrayContaining(["no", "title", "amount"]),
    );
  });

  it("TSV export carries a header and one row per line", () => {
    const tsv = toTsv(L.slice(0, 3), "").split("\n");
    expect(tsv.length).toBe(4);
    expect(tsv[1]!.split("\t")[0]).toBe(L[0]!.no);
  });
});

describe("routes", () => {
  const available = [
    "/ledger",
    "/ledger/register",
    "/ledger/fy/2001",
    "/ledger/fy/2003",
    "/ledger/fy/2008",
  ];
  it("parses every manifest route shape", () => {
    expect(parseRoute(null)).toEqual({ kind: "summary" });
    expect(parseRoute("/ledger")).toEqual({ kind: "summary" });
    expect(parseRoute("/ledger/register")).toEqual({ kind: "register" });
    expect(parseRoute("/ledger/category/transit")).toEqual({
      kind: "category",
      id: "TRANSIT",
    });
    expect(parseRoute("/ledger/source/black")).toEqual({
      kind: "source",
      id: "BLACK",
    });
    expect(parseRoute("/ledger/fy/2001", available)).toEqual({
      kind: "fy",
      fys: ["FY2001", "FY2002"],
    });
    expect(parseRoute("/ledger/fy/2003", available)).toEqual({
      kind: "fy",
      fys: ["FY2003", "FY2004", "FY2005", "FY2006", "FY2007"],
    });
    expect(parseRoute("/ledger/fy/2006")).toEqual({
      kind: "fy",
      fys: ["FY2006"],
    });
  });
  it("maps a fiscal year to the sheet that carries it", () => {
    expect(fyRoute("FY2002", available)).toBe("/ledger/fy/2001");
    expect(fyRoute("FY2008", available)).toBe("/ledger/fy/2008");
    expect(fyRoute("FY2005")).toBe("/ledger/fy/2005");
  });
});
