/**
 * Ledger analysis views: programme summary, category sheet, funding-source
 * sheet and fiscal-year sheet. Charts come from @graphics/ledger; every figure
 * is read from canon or summed from the line items (./model).
 */
import { useMemo, useState } from "preact/hooks";
import type { JSX } from "preact";
import canonJson from "@canon";
import type { Canon } from "@core/canon-types";
import type { Services } from "@core/contracts";
import {
  Button,
  GroupBox,
  PropertyGrid,
  StatusLight,
  Toolbar,
  ToolbarButton,
  ToolbarLabel,
  ToolbarSeparator,
} from "@design/index";
import {
  BudgetSankey,
  CategoryBars,
  FiscalYearChart,
  LineItemSparkline,
  SourceBars,
  fmtB,
  fmtM,
  fmtPct,
} from "@graphics/ledger";
import type { GroupMode, NodeRef } from "@graphics/ledger";
import {
  EMPTY_FILTER,
  accountsReached,
  budget,
  categoryName,
  categoryRoute,
  crossTab,
  filterItems,
  firstFy,
  fmtNum,
  fyProfile,
  fyRoute,
  reconcile,
  sourceName,
  sourceRoute,
} from "./model";
import type { AccountRow, Check, CrossRow, RegisterFilter } from "./model";
import { CanonText, FitWidth, NavLink, SimpleTable, useWidth } from "./parts";
import type { SimpleColumn } from "./parts";

const canon = canonJson as unknown as Canon;

export interface ViewCtx {
  services: Services;
  /** Navigate this window to another ledger route. */
  nav: (route: string) => void;
  /** Ledger routes known to the shell. */
  available: string[];
  /** Switch to the Line items tab with a filter, optionally selecting a line. */
  showInRegister: (filter: Partial<RegisterFilter>, select?: string) => void;
  setMessage: (m: string) => void;
  /** docNo for audit subjects. */
  subject: string;
}

/* ------------------------------------------------------------------ */
/* Shared tables                                                       */
/* ------------------------------------------------------------------ */

/** Drilldown link inside a table cell. */
function CellLink({
  label,
  href,
  go,
}: {
  label: string;
  href: string;
  go: () => void;
}) {
  return (
    <NavLink href={href} onNavigate={go}>
      {label}
    </NavLink>
  );
}

function CrossTable({
  rows,
  label,
  dimension,
  shareLabel,
  link,
}: {
  rows: CrossRow[];
  label: string;
  dimension: string;
  shareLabel: string;
  /** Drilldown for a row: target href and action. */
  link?: (row: CrossRow) => { href: string; go: () => void };
}) {
  const total = rows.reduce((a, r) => a + r.amountM, 0);
  const count = rows.reduce((a, r) => a + r.count, 0);
  const cols: SimpleColumn<CrossRow>[] = [
    {
      key: "label",
      header: dimension,
      render: (r) =>
        link ? <CellLink label={r.label} {...link(r)} /> : r.label,
    },
    {
      key: "count",
      header: "Lines",
      align: "right",
      mono: true,
      width: 52,
      render: (r) => r.count,
    },
    {
      key: "amountM",
      header: "Amount ($M)",
      align: "right",
      mono: true,
      width: 96,
      render: (r) => fmtNum(r.amountM),
    },
    {
      key: "pct",
      header: shareLabel,
      align: "right",
      mono: true,
      width: 88,
      render: (r) => fmtPct(r.pct),
    },
  ];
  return (
    <SimpleTable
      columns={cols}
      rows={rows}
      rowKey={(r) => r.id || "none"}
      label={`${label}, ${rows.length} rows`}
      footer={["Total", count, fmtNum(total), rows.length ? fmtPct(100) : ""]}
    />
  );
}

function ProfileTable({
  rows,
  label,
  programmeShare,
}: {
  rows: { fy: string; amountM: number; count: number }[];
  label: string;
  programmeShare?: boolean;
}) {
  const yearTotal = new Map(budget.fiscalYears.map((f) => [f.fy, f.totalM]));
  const total = rows.reduce((a, r) => a + r.amountM, 0);
  type R = (typeof rows)[number];
  const cols: SimpleColumn<R>[] = [
    {
      key: "fy",
      header: "Fiscal year",
      mono: true,
      width: 96,
      render: (r) => r.fy,
    },
    {
      key: "count",
      header: "Lines obligated",
      align: "right",
      mono: true,
      width: 110,
      render: (r) => r.count,
    },
    {
      key: "amountM",
      header: "Amount ($M)",
      align: "right",
      mono: true,
      width: 110,
      render: (r) => fmtNum(r.amountM),
    },
    ...(programmeShare
      ? [
          {
            key: "share",
            header: "Share of year",
            align: "right" as const,
            mono: true,
            width: 100,
            render: (r: R) =>
              fmtPct((r.amountM / (yearTotal.get(r.fy) || 1)) * 100),
          },
        ]
      : []),
  ];
  return (
    <SimpleTable
      columns={cols}
      rows={rows}
      rowKey={(r) => r.fy}
      label={`${label}, ${rows.length} fiscal years`}
      footer={["Total", "", fmtNum(total), ...(programmeShare ? [""] : [])]}
    />
  );
}

function ReconTable({ checks }: { checks: Check[] }) {
  const cols: SimpleColumn<Check>[] = [
    { key: "group", header: "Figure", width: 90, render: (c) => c.group },
    { key: "label", header: "Item", render: (c) => c.label },
    {
      key: "statedM",
      header: "Stated",
      align: "right",
      mono: true,
      width: 96,
      render: (c) => (c.id === "count" ? String(c.statedM) : fmtNum(c.statedM)),
    },
    {
      key: "computedM",
      header: "From register",
      align: "right",
      mono: true,
      width: 104,
      render: (c) =>
        c.id === "count" ? String(c.computedM) : fmtNum(c.computedM),
    },
    {
      key: "var",
      header: "Variance",
      align: "right",
      mono: true,
      width: 76,
      render: (c) => fmtNum(c.computedM - c.statedM),
    },
    {
      key: "agrees",
      header: "Result",
      width: 96,
      render: (c) => (
        <StatusLight
          status={c.agrees ? "NOMINAL" : "FAULT"}
          word={c.agrees ? "AGREES" : "VARIANCE"}
        />
      ),
    },
  ];
  return (
    <SimpleTable
      columns={cols}
      rows={checks}
      rowKey={(c) => c.id}
      label={`Reconciliation, ${checks.length} figures`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export function SummaryView({ ctx }: { ctx: ViewCtx }): JSX.Element {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [mode, setMode] = useState<GroupMode>("department");
  const [highlight, setHighlight] = useState<NodeRef | null>(null);
  const checks = useMemo(() => reconcile(), []);
  const agree = checks.every((c) => c.agrees);
  const fys = budget.fiscalYears.map((f) => f.fy);

  const onSankey = (r: NodeRef) => {
    if (r.kind === "item") {
      ctx.showInRegister({}, r.id);
      return;
    }
    const same =
      highlight && highlight.kind === r.kind && highlight.id === r.id;
    setHighlight(same ? null : r);
    const what =
      r.kind === "category"
        ? categoryName(r.id)
        : r.kind === "source"
          ? sourceName(r.id)
          : `${r.id} cover lines`;
    ctx.setMessage(
      same ? "Trace cleared." : `Tracing ${what} through the flow of funds.`,
    );
  };
  const traceRoute =
    highlight?.kind === "category"
      ? categoryRoute(highlight.id)
      : highlight?.kind === "source"
        ? sourceRoute(highlight.id)
        : null;

  return (
    <div class="lga-view" ref={ref}>
      <PropertyGrid
        caption="PROGRAMME ACCOUNTS"
        columns={width >= 640 ? 2 : 1}
        rows={[
          {
            label: "Total programme cost",
            value: fmtB(budget.totalB, 1),
            mono: true,
          },
          {
            label: "Line items",
            value: String(budget.lineItems.length),
            mono: true,
          },
          {
            label: "Fiscal years",
            value: `${fys[0]} to ${fys[fys.length - 1]}`,
            mono: true,
          },
          { label: "Cover departments", value: budget.departments.join(", ") },
          {
            label: "Funding sources",
            value: String(budget.sources.length),
            mono: true,
          },
          {
            label: "Reconciliation",
            value: (
              <StatusLight
                status={agree ? "NOMINAL" : "FAULT"}
                word={agree ? "BALANCED" : "VARIANCE"}
                note={`${checks.filter((c) => c.agrees).length} of ${checks.length} figures agree`}
              />
            ),
          },
        ]}
      />
      <div class="lga-pair">
        <GroupBox title="By programme category" on="surface">
          <FitWidth>
            {(w) => (
              <CategoryBars
                width={w}
                highlight={highlight?.kind === "category" ? highlight.id : null}
                onSelect={(id) => ctx.nav(categoryRoute(id))}
              />
            )}
          </FitWidth>
          <p class="lga-hint">Select a category to open its sheet.</p>
        </GroupBox>
        <GroupBox title="By funding source" on="surface">
          <FitWidth>
            {(w) => (
              <SourceBars
                width={w}
                highlight={highlight?.kind === "source" ? highlight.id : null}
                onSelect={(id) => ctx.nav(sourceRoute(id))}
              />
            )}
          </FitWidth>
          <p class="lga-hint">Select a source to open its sheet.</p>
        </GroupBox>
      </div>
      <GroupBox title="Obligations by fiscal year" on="surface">
        <FitWidth>
          {(w) => (
            <FiscalYearChart
              width={w}
              height={240}
              highlight={highlight?.kind === "category" ? highlight.id : null}
              onSelect={(fy) => ctx.nav(fyRoute(fy, ctx.available))}
            />
          )}
        </FitWidth>
        <p class="lga-hint">Select a year to open its fiscal-year sheet.</p>
      </GroupBox>
      <GroupBox
        title="Flow of funds: source appropriation, cover line item, programme category"
        on="surface"
      >
        <Toolbar label="Flow of funds">
          <ToolbarLabel>Middle column</ToolbarLabel>
          <ToolbarButton
            label="By department"
            pressed={mode === "department"}
            onClick={() => setMode("department")}
          />
          <ToolbarButton
            label="All line items"
            pressed={mode === "item"}
            onClick={() => setMode("item")}
          />
          <ToolbarButton
            label="None"
            pressed={mode === "none"}
            onClick={() => setMode("none")}
          />
          <ToolbarSeparator />
          <ToolbarButton
            label="Clear trace"
            disabled={!highlight}
            onClick={() => {
              setHighlight(null);
              ctx.setMessage("Trace cleared.");
            }}
          />
          <ToolbarButton
            label="Open sheet"
            disabled={!traceRoute}
            title="Open the sheet for the traced source or category"
            onClick={() => traceRoute && ctx.nav(traceRoute)}
          />
        </Toolbar>
        <div class="lga-sankey">
          <FitWidth>
            {(w) => (
              <BudgetSankey
                key={mode}
                width={w}
                height={mode === "item" ? Math.max(520, Math.min(900, w)) : 380}
                groupLineItems={mode}
                highlight={highlight}
                onSelect={onSankey}
              />
            )}
          </FitWidth>
        </div>
        <p class="lga-hint">
          Select a source or category to trace it; select a department to expand
          it into its line items; select a line item to show it in the register.
        </p>
      </GroupBox>
      <GroupBox
        title="Reconciliation of register totals with stated figures ($M)"
        on="surface"
      >
        <ReconTable checks={checks} />
      </GroupBox>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category                                                            */
/* ------------------------------------------------------------------ */

export function CategoryView({
  ctx,
  id,
}: {
  ctx: ViewCtx;
  id: string;
}): JSX.Element {
  const [ref, width] = useWidth<HTMLDivElement>();
  const cat = budget.categories.find((c) => c.id === id)!;
  const scope = useMemo(
    () => filterItems(budget.lineItems, { ...EMPTY_FILTER, category: id }),
    [id],
  );
  const sumM = scope.reduce((a, l) => a + l.amountM, 0);
  const bySource = crossTab(scope, "source");
  const byDept = crossTab(scope, "department");
  const profile = fyProfile(scope);
  const peak = profile.reduce(
    (a, r) => (r.amountM > a.amountM ? r : a),
    profile[0]!,
  );
  const half = width >= 760 ? Math.floor((width - 12) / 2) - 18 : width - 18;

  return (
    <div class="lga-view" ref={ref}>
      <PropertyGrid
        caption="PROGRAMME CATEGORY"
        columns={width >= 640 ? 2 : 1}
        rows={[
          { label: "Category", value: cat.name },
          { label: "Code", value: cat.id, mono: true },
          { label: "Stated amount", value: fmtB(cat.amountB, 1), mono: true },
          { label: "Share of programme", value: fmtPct(cat.pct), mono: true },
          { label: "From register", value: fmtM(sumM), mono: true },
          {
            label: "Reconciliation",
            value: (
              <StatusLight
                status={sumM === cat.amountB * 1000 ? "NOMINAL" : "FAULT"}
                word={sumM === cat.amountB * 1000 ? "AGREES" : "VARIANCE"}
              />
            ),
          },
          { label: "Line items", value: String(scope.length), mono: true },
          {
            label: "Peak year",
            value: `${peak.fy} (${fmtM(peak.amountM)})`,
            mono: true,
          },
        ]}
      />
      <GroupBox
        title={`Obligations by fiscal year, ${cat.name} emphasised`}
        on="surface"
      >
        <FitWidth>
          {(w) => (
            <FiscalYearChart
              width={w}
              height={220}
              highlight={id}
              onSelect={(fy) => ctx.nav(fyRoute(fy, ctx.available))}
            />
          )}
        </FitWidth>
      </GroupBox>
      <div class="lga-pair">
        <GroupBox title="By funding source" on="surface">
          <div style={{ width: `${half}px`, maxWidth: "100%" }}>
            <CrossTable
              rows={bySource}
              label="Category by funding source"
              dimension="Funding source"
              shareLabel="Share"
              link={(r) => ({
                href: sourceRoute(r.id),
                go: () => ctx.nav(sourceRoute(r.id)),
              })}
            />
          </div>
        </GroupBox>
        <GroupBox title="By cover department" on="surface">
          <div style={{ width: `${half}px`, maxWidth: "100%" }}>
            <CrossTable
              rows={byDept}
              label="Category by department"
              dimension="Department"
              shareLabel="Share"
              link={(r) => ({
                href: "/ledger/register",
                go: () =>
                  ctx.showInRegister({ category: id, department: r.id }),
              })}
            />
          </div>
        </GroupBox>
      </div>
      {id === "TRANSIT" ? <CostPerMile ctx={ctx} amountM={sumM} /> : null}
      <GroupBox title="Annual profile" on="surface">
        <ProfileTable
          rows={profile}
          label={`${cat.name} by fiscal year`}
          programmeShare
        />
      </GroupBox>
      <div class="lga-actions">
        <Button
          label={`Show the ${scope.length} line items in the register`}
          onClick={() => ctx.showInRegister({ category: id })}
        />
      </div>
    </div>
  );
}

/** Transit category: cost per route mile on the certified and the engineering mileage bases. */
function CostPerMile({ ctx, amountM }: { ctx: ViewCtx; amountM: number }) {
  const hl = canon.headline;
  const memo = ctx.services.docs.byDocNo("OSC-MEM-07-0944");
  const rows = [
    {
      id: "cert",
      basis: "Certified mileage (return to the Council)",
      miles: hl.tunnelCertifiedMi,
    },
    {
      id: "rail",
      basis: "Engineering mileage, rail segments",
      miles: hl.railEngineeringMi,
    },
    {
      id: "tram",
      basis: "Engineering mileage, tram networks",
      miles: hl.tramEngineeringMi,
    },
    {
      id: "eng",
      basis: "Engineering mileage, rail and tram",
      miles: hl.railEngineeringMi + hl.tramEngineeringMi,
    },
  ];
  type R = (typeof rows)[number];
  const cols: SimpleColumn<R>[] = [
    { key: "basis", header: "Mileage basis", render: (r) => r.basis },
    {
      key: "miles",
      header: "Route miles",
      align: "right",
      mono: true,
      width: 96,
      render: (r) => fmtNum(r.miles),
    },
    {
      key: "cpm",
      header: "Cost per mile ($M)",
      align: "right",
      mono: true,
      width: 124,
      render: (r) => (amountM / r.miles).toFixed(2),
    },
  ];
  return (
    <GroupBox title="Cost per route mile" on="surface">
      <SimpleTable
        columns={cols}
        rows={rows}
        rowKey={(r) => r.id}
        label="Transit cost per route mile"
      />
      <p class="lga-hint">
        Category amount {fmtM(amountM)}. Engineering lengths per{" "}
        {memo ? (
          <NavLink
            href={memo.route}
            onNavigate={(r) => ctx.services.openRoute(r)}
          >
            {memo.docNo}
          </NavLink>
        ) : (
          "OSC-MEM-07-0944"
        )}
        .
      </p>
    </GroupBox>
  );
}

/* ------------------------------------------------------------------ */
/* Funding source                                                      */
/* ------------------------------------------------------------------ */

export function SourceView({
  ctx,
  id,
}: {
  ctx: ViewCtx;
  id: string;
}): JSX.Element {
  const [ref, width] = useWidth<HTMLDivElement>();
  const src = budget.sources.find((s) => s.id === id)!;
  const scope = useMemo(
    () => filterItems(budget.lineItems, { ...EMPTY_FILTER, source: id }),
    [id],
  );
  const sumM = scope.reduce((a, l) => a + l.amountM, 0);
  const byCat = crossTab(scope, "category");
  const byDept = crossTab(scope, "department");
  const accounts = useMemo(() => accountsReached(scope), [scope]);
  const agrees = Math.abs(sumM - src.amountB * 1000) <= 5;
  const half = width >= 760 ? Math.floor((width - 12) / 2) - 18 : width - 18;

  const accCols: SimpleColumn<AccountRow>[] = [
    {
      key: "account",
      header: "Account",
      mono: true,
      width: 104,
      render: (r) => (
        <CellLink
          label={r.account}
          href="/ledger/register"
          go={() => ctx.showInRegister({ source: id, text: r.account })}
        />
      ),
    },
    {
      key: "department",
      header: "Dept",
      width: 56,
      render: (r) => r.department,
    },
    {
      key: "count",
      header: "Lines",
      align: "right",
      mono: true,
      width: 52,
      render: (r) => r.count,
    },
    {
      key: "items",
      header: "Line items",
      mono: true,
      render: (r) => r.items.join(", "),
      wrap: true,
    },
    {
      key: "amountM",
      header: "Amount ($M)",
      align: "right",
      mono: true,
      width: 100,
      render: (r) => fmtNum(r.amountM),
    },
  ];

  return (
    <div class="lga-view" ref={ref}>
      <PropertyGrid
        caption="FUNDING SOURCE"
        columns={width >= 640 ? 2 : 1}
        rows={[
          {
            label: "Source",
            value: (
              <CanonText
                value={src.name}
                services={ctx.services}
                subject={ctx.subject}
              />
            ),
          },
          { label: "Code", value: src.id, mono: true },
          { label: "Stated share", value: fmtPct(src.pct, 0), mono: true },
          { label: "Stated amount", value: fmtB(src.amountB, 2), mono: true },
          { label: "From register", value: fmtM(sumM), mono: true },
          {
            label: "Reconciliation",
            value: (
              <StatusLight
                status={agrees ? "NOMINAL" : "FAULT"}
                word={agrees ? "AGREES" : "VARIANCE"}
                note="at stated precision"
              />
            ),
          },
          { label: "Line items", value: String(scope.length), mono: true },
          {
            label: "Accounts reached",
            value: String(accounts.length),
            mono: true,
          },
        ]}
      />
      <GroupBox title="Allocation to programme categories" on="surface">
        <FitWidth>
          {(w) => (
            <BudgetSankey
              width={w}
              height={260}
              groupLineItems="none"
              highlight={{ kind: "source", id }}
              onSelect={(r) =>
                r.kind === "category"
                  ? ctx.nav(categoryRoute(r.id))
                  : r.kind === "source"
                    ? ctx.nav(sourceRoute(r.id))
                    : undefined
              }
            />
          )}
        </FitWidth>
      </GroupBox>
      <div class="lga-pair">
        <GroupBox title="By programme category" on="surface">
          <div style={{ width: `${half}px`, maxWidth: "100%" }}>
            <CrossTable
              rows={byCat}
              label="Source by category"
              dimension="Programme category"
              shareLabel="Share"
              link={(r) => ({
                href: categoryRoute(r.id),
                go: () => ctx.nav(categoryRoute(r.id)),
              })}
            />
          </div>
        </GroupBox>
        <GroupBox title="By cover department" on="surface">
          <div style={{ width: `${half}px`, maxWidth: "100%" }}>
            <CrossTable
              rows={byDept}
              label="Source by department"
              dimension="Department"
              shareLabel="Share"
              link={(r) => ({
                href: "/ledger/register",
                go: () => ctx.showInRegister({ source: id, department: r.id }),
              })}
            />
          </div>
        </GroupBox>
      </div>
      <GroupBox
        title={`Account codes reached (${accounts.length})`}
        on="surface"
      >
        <SimpleTable
          columns={accCols}
          rows={accounts}
          rowKey={(r) => r.account}
          label={`Accounts reached by ${src.id}, ${accounts.length} rows`}
          footer={["Total", "", String(scope.length), "", fmtNum(sumM)]}
        />
      </GroupBox>
      <GroupBox title="Annual profile" on="surface">
        <ProfileTable
          rows={fyProfile(scope)}
          label={`${src.id} by fiscal year`}
          programmeShare
        />
      </GroupBox>
      <div class="lga-actions">
        <Button
          label={`Show the ${scope.length} line items in the register`}
          onClick={() => ctx.showInRegister({ source: id })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fiscal year                                                         */
/* ------------------------------------------------------------------ */

export function FiscalYearView({
  ctx,
  fys,
  fy,
  onFy,
}: {
  ctx: ViewCtx;
  fys: string[];
  fy: string;
  onFy: (fy: string) => void;
}): JSX.Element {
  const [ref, width] = useWidth<HTMLDivElement>();
  const stated = budget.fiscalYears.find((f) => f.fy === fy)!;
  const idx = budget.fiscalYears.findIndex((f) => f.fy === fy);
  const prior = idx > 0 ? budget.fiscalYears[idx - 1] : undefined;
  const scope = useMemo(
    () => filterItems(budget.lineItems, { ...EMPTY_FILTER, fy }),
    [fy],
  );
  const sumM = scope.reduce((a, l) => a + (l.fy[fy] ?? 0), 0);
  const byCat = crossTab(scope, "category", fy);
  const byDept = crossTab(scope, "department", fy);
  const firsts = scope
    .filter((l) => firstFy(l) === fy)
    .sort((a, b) => (b.fy[fy] ?? 0) - (a.fy[fy] ?? 0));
  const half = width >= 760 ? Math.floor((width - 12) / 2) - 18 : width - 18;

  type L = (typeof firsts)[number];
  const firstCols: SimpleColumn<L>[] = [
    {
      key: "no",
      header: "Line",
      mono: true,
      width: 64,
      render: (l) => (
        <CellLink
          label={l.no}
          href="/ledger/register"
          go={() => ctx.showInRegister({ fy }, l.no)}
        />
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (l) => (
        <CanonText
          value={l.title}
          services={ctx.services}
          subject={ctx.subject}
        />
      ),
    },
    {
      key: "department",
      header: "Dept",
      width: 52,
      render: (l) => l.department,
    },
    {
      key: "cat",
      header: "Category",
      width: 150,
      render: (l) => categoryName(l.categoryId),
    },
    {
      key: "yr",
      header: `${fy} ($M)`,
      align: "right",
      mono: true,
      width: 96,
      render: (l) => fmtNum(l.fy[fy] ?? 0),
    },
    {
      key: "trend",
      header: "Profile",
      width: 100,
      render: (l) => <LineItemSparkline no={l.no} />,
    },
  ];

  return (
    <div class="lga-view" ref={ref}>
      {fys.length > 1 ? (
        <Toolbar label="Fiscal years on this sheet">
          <ToolbarLabel>Year</ToolbarLabel>
          {fys.map((y) => (
            <ToolbarButton
              key={y}
              label={y}
              pressed={y === fy}
              onClick={() => onFy(y)}
            />
          ))}
        </Toolbar>
      ) : null}
      <PropertyGrid
        caption="FISCAL YEAR"
        columns={width >= 640 ? 2 : 1}
        rows={[
          { label: "Fiscal year", value: fy, mono: true },
          {
            label: "Stated obligations",
            value: fmtM(stated.totalM),
            mono: true,
          },
          { label: "From register", value: fmtM(sumM), mono: true },
          {
            label: "Reconciliation",
            value: (
              <StatusLight
                status={sumM === stated.totalM ? "NOMINAL" : "FAULT"}
                word={sumM === stated.totalM ? "AGREES" : "VARIANCE"}
              />
            ),
          },
          {
            label: "Share of programme",
            value: fmtPct((stated.totalM / (budget.totalB * 1000)) * 100),
            mono: true,
          },
          {
            label: "Change on prior year",
            value: prior
              ? `${stated.totalM >= prior.totalM ? "+" : "-"}${fmtM(Math.abs(stated.totalM - prior.totalM))} on ${prior.fy}`
              : "First year of obligation",
            mono: true,
          },
          { label: "Lines obligated", value: String(scope.length), mono: true },
          {
            label: "Lines first obligated",
            value: String(firsts.length),
            mono: true,
          },
        ]}
      />
      <GroupBox title="Obligations by fiscal year" on="surface">
        <FitWidth>
          {(w) => (
            <FiscalYearChart
              width={w}
              height={200}
              legend={w >= 520}
              onSelect={(y) =>
                fys.includes(y) ? onFy(y) : ctx.nav(fyRoute(y, ctx.available))
              }
            />
          )}
        </FitWidth>
      </GroupBox>
      <div class="lga-pair">
        <GroupBox title="By programme category" on="surface">
          <div style={{ width: `${half}px`, maxWidth: "100%" }}>
            <CrossTable
              rows={byCat}
              label={`${fy} by category`}
              dimension="Programme category"
              shareLabel="Share of year"
              link={(r) => ({
                href: categoryRoute(r.id),
                go: () => ctx.nav(categoryRoute(r.id)),
              })}
            />
          </div>
        </GroupBox>
        <GroupBox title="By cover department" on="surface">
          <div style={{ width: `${half}px`, maxWidth: "100%" }}>
            <CrossTable
              rows={byDept}
              label={`${fy} by department`}
              dimension="Department"
              shareLabel="Share of year"
              link={(r) => ({
                href: "/ledger/register",
                go: () => ctx.showInRegister({ fy, department: r.id }),
              })}
            />
          </div>
        </GroupBox>
      </div>
      <GroupBox
        title={`Lines first obligated in ${fy} (${firsts.length})`}
        on="surface"
      >
        <SimpleTable
          columns={firstCols}
          rows={firsts}
          rowKey={(l) => l.no}
          label={`Lines first obligated in ${fy}, ${firsts.length} rows`}
          empty={`No line was first obligated in ${fy}.`}
        />
      </GroupBox>
      <div class="lga-actions">
        <Button
          label={`Show the ${scope.length} lines obligated in ${fy} in the register`}
          onClick={() => ctx.showInRegister({ fy })}
        />
      </div>
    </div>
  );
}
