/**
 * Ledger: the Comptroller's programme accounts. Summary, category, funding-source
 * and fiscal-year sheets (charts from @graphics/ledger), the 127-line register as
 * a grid with filter, grouping, subtotals and a column chooser, the document for
 * each route, and a register extract to print.
 */
import { useEffect, useId, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import canonJson from "@canon";
import type { Canon, MarkingId } from "@core/canon-types";
import type { AppProps, DocJson, RouteEntry, Services } from "@core/contracts";
import { useServices } from "@core/services";
import { formatInWorldDate, zulu } from "@core/session";
import {
  Checkbox,
  Dialog,
  DocumentView,
  MenuBar,
  StatusBar,
  StatusLight,
  Tabs,
  Tree,
} from "@design/index";
import type { MenuBarMenu, MenuItem, TreeNode } from "@design/index";
import { ErrorState } from "@graphics/states";
import { Stamp } from "@graphics/banners";
import { fmtB, fmtM, fmtPct } from "@graphics/ledger";
import {
  EMPTY_FILTER,
  GROUP_LABELS,
  HOME_ROUTE,
  REGISTER_ROUTE,
  budget,
  categoryRoute,
  columnSpecs,
  defaultColumns,
  fyRoute,
  parseRoute,
  reconcile,
  sourceRoute,
  toTsv,
} from "./model";
import type { GroupBy, LedgerView, RegisterFilter } from "./model";
import { Register, describeFilter, useRegisterModel } from "./Register";
import type { RegState } from "./Register";
import { CategoryView, FiscalYearView, SourceView, SummaryView } from "./Views";
import type { ViewCtx } from "./Views";
import { MarkingStripById, Refusal, useOnce, useWidth } from "./parts";
import { printExtract } from "./print";
import "./ledger-app.css";
import { T4Home, t4Refused } from "./acct";

const canon = canonJson as unknown as Canon;

function accessKey(r: RouteEntry | null): string | null {
  if (!r?.access) return null;
  const t = `T${r.access.tier}`;
  return r.access.compartment ? `${r.access.compartment}+${t}` : t;
}

function highestMarking(entries: RouteEntry[]): MarkingId | null {
  let best: MarkingId | null = null;
  let rank = -1;
  for (const e of entries) {
    const m = canon.markings.find((x) => x.id === e.marking);
    if (m && m.rank > rank) {
      rank = m.rank;
      best = m.id;
    }
  }
  return best;
}

export default function App(props: AppProps) {
  const services = useServices();
  const entry = props.route ?? services.docs.byRoute(HOME_ROUTE) ?? null;
  if (t4Refused(services, entry)) return <T4Home win={props.win} services={services} title="Programme Accounts" docNo={entry?.docNo ?? "OSC-LDG-IDX"} />;
  return <LedgerApp {...props} />;
}

function LedgerApp({ win, route }: AppProps) {
  const services = useServices();
  const ledgerRoutes = services.docs.all().filter((r) => r.app === "ledger");
  const available = ledgerRoutes.map((r) => r.route);
  const docEntry = route ?? services.docs.byRoute(HOME_ROUTE) ?? null;
  const marking: MarkingId =
    route?.marking ??
    docEntry?.marking ??
    highestMarking(ledgerRoutes) ??
    "UMBRA-C";
  const key = accessKey(route);
  const refused = !!key && !services.clearance.satisfies(key);

  useEffect(() => {
    win.setTitle(docEntry?.title ?? "Programme Accounts", docEntry?.docNo);
    win.setMarking(marking);
    win.setStatus(refused ? "Access refused" : (docEntry?.docNo ?? "Ready"));
  }, [win, docEntry?.id, marking, refused]);

  useOnce(refused && route ? route.docNo : null, () => {
    services.audit.log(
      "window.open",
      route!.docNo,
      `Operator ${services.session.operatorId.peek()} requested ${route!.docNo} in Ledger. Request refused: access determination ${key} not held.`,
    );
    services.sound.play("error");
  });

  if (refused && route) {
    const comp = route.access?.compartment;
    const briefing = comp
      ? canon.compartments.find((c) => c.id === comp)?.briefingDocNo
      : undefined;
    return (
      <div class="lga lga--refused">
        <Refusal
          authority="Comptroller, programme accounts"
          reference={briefing ?? route.docNo}
          docNo={route.docNo}
          reason={`Display of ${route.docNo} to this operator is not authorised.`}
          requirement={`Tier ${route.access!.tier} access determination${comp ? ` and ${comp} compartment briefing` : ""}`}
        />
      </div>
    );
  }

  const view = parseRoute(route?.route ?? null, available);
  return (
    <Ledger
      key={route?.route ?? "home"}
      win={win}
      services={services}
      view={view}
      docEntry={docEntry}
      marking={marking}
      available={available}
    />
  );
}

type TabId = "view" | "register" | "doc";
type DialogId = null | "columns" | "notes" | "method" | "about" | "refuse";

const VIEW_TAB_LABEL: Record<LedgerView["kind"], string> = {
  summary: "&Summary",
  register: "&Summary",
  category: "&Category sheet",
  source: "S&ource sheet",
  fy: "&Fiscal year sheet",
};

function initialFilter(view: LedgerView): RegisterFilter {
  switch (view.kind) {
    case "category":
      return { ...EMPTY_FILTER, category: view.id };
    case "source":
      return { ...EMPTY_FILTER, source: view.id };
    case "fy":
      return { ...EMPTY_FILTER, fy: view.fys[0] ?? "" };
    default:
      return EMPTY_FILTER;
  }
}

function Ledger({
  win,
  services,
  view,
  docEntry,
  marking,
  available,
}: {
  win: AppProps["win"];
  services: Services;
  view: LedgerView;
  docEntry: RouteEntry | null;
  marking: MarkingId;
  available: string[];
}): JSX.Element {
  const isRegister = view.kind === "register";
  const [tab, setTab] = useState<TabId>(isRegister ? "register" : "view");
  const [fy, setFy] = useState(view.kind === "fy" ? (view.fys[0] ?? "") : "");
  const [nav, setNav] = useState(true);
  const [dialog, setDialog] = useState<DialogId>(null);
  const [refusal, setRefusal] = useState<{ text: string; ref: string }>({
    text: "",
    ref: "",
  });
  const [message, setMessage] = useState("Ready");
  const [reg, setReg] = useState<RegState>(() => ({
    filter: initialFilter(view),
    groupBy: view.kind === "category" ? "source" : "category",
    collapsed: [],
    sort: null,
    columns: defaultColumns(),
    selected: [],
    subtotals: true,
    detail: true,
  }));
  const [colDraft, setColDraft] = useState<string[]>([]);
  const findId = `lga-find${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [rootRef, rootWidth] = useWidth<HTMLDivElement>(1000);
  const narrow = rootWidth < 700;
  const clickNav = useRef(false);

  const setRegPatch = (patch: Partial<RegState>) =>
    setReg((s) => ({ ...s, ...patch }));
  const model = useRegisterModel(reg);
  const checks = useMemo(() => reconcile(), []);
  const balanced = checks.every((c) => c.agrees);
  const subject = docEntry?.docNo ?? "OSC-LDG";
  const regEntry = services.docs.byRoute(REGISTER_ROUTE);
  const markingInfo = canon.markings.find((m) => m.id === marking);

  const here = docEntry?.route ?? HOME_ROUTE;
  const go = (r: string) => {
    if (r === here) {
      setTab(isRegister ? "register" : "view");
      setMessage(
        `${docEntry?.docNo ?? "This sheet"} is already shown in this window.`,
      );
      return;
    }
    win.navigate(r);
  };

  const ctx: ViewCtx = {
    services,
    nav: go,
    available,
    subject,
    setMessage,
    showInRegister: (patch, select) => {
      setReg((s) => ({
        ...s,
        filter: { ...EMPTY_FILTER, ...patch },
        collapsed: [],
        selected: select ? [select] : s.selected,
        detail: select ? true : s.detail,
      }));
      setTab("register");
      setMessage(
        select
          ? `Line ${select} shown in the register.`
          : `Register filtered: ${describeFilter({ ...EMPTY_FILTER, ...patch })}.`,
      );
    },
  };

  const pickFy = (y: string) => {
    setFy(y);
    setReg((s) => ({ ...s, filter: { ...s.filter, fy: y }, collapsed: [] }));
  };

  /* ---------------------------------------------------------- document */

  const [doc, setDoc] = useState<{
    state: "idle" | "loading" | "ready" | "error";
    doc?: DocJson;
  }>({ state: "idle" });
  useEffect(() => {
    if (tab !== "doc" || !docEntry || doc.state !== "idle") return;
    setDoc({ state: "loading" });
    win.setBusy(true);
    services.docs
      .load(docEntry.id)
      .then((d) => setDoc({ state: "ready", doc: d }))
      .catch(() => setDoc({ state: "error" }))
      .finally(() => win.setBusy(false));
  }, [tab, docEntry?.id]);

  useOnce(
    tab === "doc" && doc.state === "ready" && doc.doc ? doc.doc.docNo : null,
    () => {
      const d = doc.doc!;
      const label =
        canon.markings.find((m) => m.id === d.marking)?.label ?? d.marking;
      services.audit.log(
        "doc.read",
        d.docNo,
        `Operator ${services.session.operatorId.peek()} read ${d.docNo} rev ${d.revision} (${label}) in Ledger.`,
      );
    },
  );

  /* ----------------------------------------------------------- actions */

  const refuse = (text: string, ref: string) => {
    setRefusal({ text, ref });
    setDialog("refuse");
  };

  const printDocument = () => {
    if (!docEntry) {
      refuse(
        "No ledger document is held for this view. Select a sheet from the Go menu and print from there.",
        "OSC-LDG-IDX",
      );
      return;
    }
    services.print(docEntry.id);
    setMessage(`${docEntry.docNo} sent to the print queue.`);
  };

  const printRegister = () => {
    const now = new Date();
    const docNo = regEntry?.docNo ?? "OSC-LDG-REG";
    const scope = describeFilter(reg.filter);
    services.audit.log(
      "print",
      docNo,
      `Operator ${services.session.operatorId.peek()} printed an extract of ${docNo}: ${model.filtered.length} of ${budget.lineItems.length} lines (${scope}).`,
    );
    setMessage(
      `Extract of ${docNo} (${model.filtered.length} lines) sent to the print queue.`,
    );
    void printExtract({
      docNo,
      title: regEntry?.title ?? "Register of Programme Line Items",
      marking: regEntry?.marking ?? marking,
      markingLabel:
        canon.markings.find((m) => m.id === (regEntry?.marking ?? marking))
          ?.label ?? marking,
      scope,
      grouping: GROUP_LABELS[reg.groupBy],
      basis: reg.filter.fy ? `${reg.filter.fy} obligations` : "Programme total",
      fy: reg.filter.fy,
      columns: reg.columns,
      rows: model.rows,
      totals: model.totals,
      totalLines: budget.lineItems.length,
      copyNo: String(
        (Number(sessionStorage.getItem("lga-copy") ?? "0") || 0) + 1,
      ).padStart(3, "0"),
      printedBy: services.session.operatorId.peek(),
      printedAt: `${formatInWorldDate(now)} ${zulu(now)}`,
    });
    try {
      sessionStorage.setItem(
        "lga-copy",
        String((Number(sessionStorage.getItem("lga-copy") ?? "0") || 0) + 1),
      );
    } catch {
      /* copy numbering is per session only */
    }
  };

  const copyLines = () => {
    const items = model.selectedItems;
    if (!items.length) {
      setMessage(
        "No lines selected. Select lines in the register before copying.",
      );
      return;
    }
    const text = toTsv(items, reg.filter.fy);
    const done = () =>
      setMessage(
        `${items.length} ${items.length === 1 ? "line" : "lines"} copied to the clipboard.`,
      );
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done, () =>
          setMessage(
            "The clipboard is not available to this session. Use Print extract instead.",
          ),
        );
    } else {
      setMessage(
        "The clipboard is not available to this session. Use Print extract instead.",
      );
    }
  };

  const selectAll = () => {
    setTab("register");
    setRegPatch({ selected: model.filtered.map((l) => l.no) });
    setMessage(`${model.filtered.length} lines selected.`);
  };

  const focusFind = () => {
    setTab("register");
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLInputElement>(`#${findId}`)?.focus(),
    );
  };

  const openColumns = () => {
    setColDraft(reg.columns);
    setDialog("columns");
  };

  const groupBy = (g: GroupBy) => {
    setRegPatch({ groupBy: g, collapsed: [] });
    setTab("register");
    setMessage(`Register grouped by ${GROUP_LABELS[g].toLowerCase()}.`);
  };

  /* ------------------------------------------------------------- menus */

  const fySheets = useMemo(() => {
    const seen = new Map<string, string[]>();
    for (const f of budget.fiscalYears) {
      const r = fyRoute(f.fy, available);
      seen.set(r, [...(seen.get(r) ?? []), f.fy]);
    }
    return [...seen.entries()].map(([r, fys]) => ({
      route: r,
      label: fys.length > 1 ? `${fys[0]} to ${fys[fys.length - 1]}` : fys[0]!,
    }));
  }, [available.join("|")]);

  const tabs = [
    ...(isRegister
      ? []
      : [{ id: "view" as const, label: VIEW_TAB_LABEL[view.kind] }]),
    {
      id: "register" as const,
      label: isRegister ? "&Register" : "&Line items",
    },
    { id: "doc" as const, label: "&Document", disabled: !docEntry },
  ];

  const menus: MenuBarMenu[] = [
    {
      label: "&File",
      items: [
        {
          label: "&Print document...",
          shortcut: "Ctrl+P",
          onSelect: printDocument,
        },
        {
          label: "Print register e&xtract...",
          shortcut: "Ctrl+Shift+P",
          onSelect: printRegister,
        },
        { separator: true },
        {
          label: "&Export to file...",
          onSelect: () =>
            refuse(
              "Export of programme accounts to removable or network media is not permitted from this workstation. Use Print register extract; printed copies are recorded.",
              "OSC-DIR-0412",
            ),
        },
        { separator: true },
        { label: "&Close", shortcut: "Alt+F4", onSelect: () => win.close() },
      ],
    },
    {
      label: "&Edit",
      items: [
        {
          label: "&Copy selected lines",
          shortcut: "Ctrl+C",
          onSelect: copyLines,
        },
        { label: "Select &all lines", shortcut: "Ctrl+A", onSelect: selectAll },
        {
          label: "&Find in register...",
          shortcut: "Ctrl+F",
          onSelect: focusFind,
        },
        { separator: true },
        {
          label: "Post &adjustment...",
          onSelect: () =>
            refuse(
              `The register is read-only at this workstation. Adjustments are posted by the ${canon.divisions.find((d) => d.id === "CMP")?.name ?? "Comptroller"} (CMP/${canon.divisions.find((d) => d.id === "CMP")?.site ?? "ALPHA-01"}) under the annual cost return.`,
              regEntry?.docNo ?? "OSC-LDG-REG",
            ),
        },
        {
          label: "&Reclassify line...",
          onSelect: () =>
            refuse(
              "Reclassification of a cover line item between programme categories requires Comptroller approval and a revised allocation matrix. No request can be raised from a Records Division workstation.",
              "OSC-LDG-IDX",
            ),
        },
      ],
    },
    {
      label: "&View",
      items: [
        ...tabs.map((t): MenuItem => ({
          label: t.label,
          radio: true,
          checked: tab === t.id,
          onSelect: () =>
            t.disabled
              ? refuse(
                  "No ledger document is held for this view.",
                  "OSC-LDG-IDX",
                )
              : setTab(t.id),
        })),
        { separator: true },
        {
          label: "&Navigation pane",
          checked: nav,
          onSelect: () => setNav(!nav),
        },
        {
          label: "Record &pane",
          checked: reg.detail,
          onSelect: () => setRegPatch({ detail: !reg.detail }),
        },
        {
          label: "&Subtotals",
          checked: reg.subtotals,
          onSelect: () => setRegPatch({ subtotals: !reg.subtotals }),
        },
        { label: "C&olumns...", onSelect: openColumns },
        { separator: true },
        ...(Object.keys(GROUP_LABELS) as GroupBy[]).map((g): MenuItem => ({
          label:
            g === "none"
              ? "No grouping"
              : `Group by ${GROUP_LABELS[g].toLowerCase()}`,
          radio: true,
          checked: reg.groupBy === g,
          onSelect: () => groupBy(g),
        })),
        { separator: true },
        {
          label: "Clear &filter",
          onSelect: () => {
            setRegPatch({ filter: EMPTY_FILTER, collapsed: [] });
            setMessage("Register filter cleared.");
          },
        },
      ],
    },
    {
      label: "&Go",
      items: [
        {
          label: "Programme &summary",
          checked: here === HOME_ROUTE,
          onSelect: () => go(HOME_ROUTE),
        },
        {
          label: "Line-item &register",
          checked: here === REGISTER_ROUTE,
          onSelect: () => go(REGISTER_ROUTE),
        },
        { separator: true },
        ...budget.categories.map((c): MenuItem => ({
          label: `Category: ${c.name}`,
          checked: view.kind === "category" && view.id === c.id,
          onSelect: () => go(categoryRoute(c.id)),
        })),
        { separator: true },
        ...budget.sources.map((s): MenuItem => ({
          label: `Source: ${s.id}`,
          checked: view.kind === "source" && view.id === s.id,
          onSelect: () => go(sourceRoute(s.id)),
        })),
        { separator: true },
        ...fySheets.map((f): MenuItem => ({
          label: `Fiscal year: ${f.label}`,
          checked: docEntry?.route === f.route,
          onSelect: () => go(f.route),
        })),
      ],
    },
    {
      label: "&Help",
      items: [
        { label: "Register &notes...", onSelect: () => setDialog("notes") },
        {
          label: "&Reconciliation method...",
          onSelect: () => setDialog("method"),
        },
        { separator: true },
        { label: "&About Ledger", onSelect: () => setDialog("about") },
      ],
    },
  ];

  /* ---------------------------------------------------------- keyboard */

  const onKeyDown = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    const inField =
      e.target instanceof HTMLElement &&
      /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
    if (k === "p") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) printRegister();
      else printDocument();
    } else if (k === "f") {
      e.preventDefault();
      e.stopPropagation();
      focusFind();
    } else if (k === "c" && !inField && tab === "register") {
      const sel = window.getSelection();
      if (sel && sel.toString()) return;
      e.preventDefault();
      copyLines();
    }
  };

  /* -------------------------------------------------------- navigation */

  const treeNodes: TreeNode[] = [
    {
      id: HOME_ROUTE,
      label: "Programme summary",
      meta: fmtB(budget.totalB, 0),
    },
    {
      id: REGISTER_ROUTE,
      label: "Line-item register",
      meta: `(${budget.lineItems.length})`,
    },
    {
      id: "cats",
      label: "Programme categories",
      children: budget.categories.map((c) => ({
        id: categoryRoute(c.id),
        label: c.name,
        meta: fmtPct(c.pct),
      })),
    },
    {
      id: "srcs",
      label: "Funding sources",
      children: budget.sources.map((s) => ({
        id: sourceRoute(s.id),
        label: s.id,
        meta: fmtPct(s.pct, 0),
      })),
    },
    {
      id: "fys",
      label: "Fiscal years",
      children: fySheets.map((f) => ({ id: f.route, label: f.label })),
    },
  ];
  const currentNode =
    view.kind === "summary" ? HOME_ROUTE : (docEntry?.route ?? HOME_ROUTE);

  /* ------------------------------------------------------------ render */

  const selTotal = model.selectedItems.reduce((a, l) => a + l.amountM, 0);
  const colSpecs = columnSpecs().filter((c) => !c.fixed);

  return (
    <div
      class="lga"
      ref={rootRef}
      onKeyDown={(e) => onKeyDown(e as unknown as KeyboardEvent)}
    >
      <MenuBar menus={menus} label="Ledger" />
      <div class="lga-main">
        {nav ? (
          <nav
            class="lga-nav"
            aria-label="Programme accounts"
            onPointerDown={() => {
              clickNav.current = true;
            }}
          >
            <div class="lga-nav__head">Programme accounts</div>
            <Tree
              label="Programme accounts"
              nodes={treeNodes}
              selectedId={currentNode}
              defaultExpanded={["cats", "srcs", "fys"]}
              onSelect={(n) => {
                const leaf = n.id.startsWith("/");
                if (clickNav.current && leaf) go(n.id);
                else if (leaf)
                  setMessage(
                    `${services.docs.byRoute(n.id)?.docNo ?? n.label}: press Enter to open.`,
                  );
                clickNav.current = false;
              }}
              onActivate={(n) => {
                if (n.id.startsWith("/")) go(n.id);
              }}
            />
          </nav>
        ) : null}
        <div class="lga-content">
          <Tabs
            tabs={tabs}
            active={tab}
            onChange={(id) => setTab(id as TabId)}
            label="Ledger views"
            panel="flush"
          >
            {tab === "view" ? (
              <div class="lga-scroll">
                {view.kind === "summary" ? (
                  <SummaryView ctx={ctx} />
                ) : view.kind === "category" ? (
                  <CategoryView ctx={ctx} id={view.id} />
                ) : view.kind === "source" ? (
                  <SourceView ctx={ctx} id={view.id} />
                ) : view.kind === "fy" ? (
                  <FiscalYearView
                    ctx={ctx}
                    fys={view.fys}
                    fy={fy}
                    onFy={pickFy}
                  />
                ) : null}
              </div>
            ) : tab === "register" ? (
              <Register
                ctx={ctx}
                s={reg}
                set={setRegPatch}
                model={model}
                findId={findId}
                onColumns={openColumns}
                onPrint={printRegister}
                onCopy={copyLines}
              />
            ) : (
              <div class="lga-scroll lga-doc">
                {doc.state === "ready" && doc.doc ? (
                  <DocumentView
                    doc={doc.doc}
                    markings={canon.markings}
                    onNavigate={services.openRoute}
                    onRedactionHover={(i) =>
                      services.audit.log(
                        "redaction.hover",
                        doc.doc!.docNo,
                        `Operator ${services.session.operatorId.peek()} examined withheld material in ${doc.doc!.docNo} (${i.auth} ${i.ref}). No release was made.`,
                      )
                    }
                    slots={{
                      MarkingStrip: MarkingStripById,
                      Stamp: Stamp as never,
                    }}
                  />
                ) : doc.state === "error" ? (
                  <ErrorState
                    code="LDG-DOC-0404"
                    title={`${docEntry?.docNo ?? "The document"} could not be retrieved`}
                    body="The document is not held in the workstation document store. The sheet and register figures are drawn from the programme accounts tables and are unaffected. Retry later or report the condition to the Help Desk quoting the code."
                  />
                ) : (
                  <p class="lga-loading">Retrieving {docEntry?.docNo}...</p>
                )}
              </div>
            )}
          </Tabs>
        </div>
      </div>
      <StatusBar
        live
        panes={[
          { id: "msg", content: message, fill: true },
          {
            id: "lines",
            content: `${model.filtered.length} of ${budget.lineItems.length} lines`,
            width: 120,
          },
          ...(narrow
            ? []
            : [
                {
                  id: "total",
                  content: `Total ${fmtM(reg.filter.fy ? (model.totals.fy[reg.filter.fy] ?? 0) : model.totals.amountM)}`,
                  width: 130,
                  mono: true,
                },
                {
                  id: "sel",
                  content: model.selectedItems.length
                    ? `${model.selectedItems.length} sel. ${fmtM(selTotal)}`
                    : "No selection",
                  width: 130,
                  mono: true,
                },
                {
                  id: "rec",
                  content: (
                    <StatusLight
                      status={balanced ? "NOMINAL" : "FAULT"}
                      word={balanced ? "BALANCED" : "VARIANCE"}
                    />
                  ),
                  width: 96,
                  label: "Reconciliation with stated totals",
                },
                {
                  id: "doc",
                  content: docEntry?.docNo ?? "",
                  width: 150,
                  mono: true,
                },
              ]),
        ]}
      />

      <Dialog
        open={dialog === "columns"}
        kind="question"
        title="Register columns"
        buttons={[
          { label: "OK", value: "ok", isDefault: true },
          { label: "&Defaults", value: "defaults" },
          { label: "Cancel", value: "cancel", isCancel: true },
        ]}
        onClose={(v) => {
          setDialog(null);
          if (v === "ok") {
            setRegPatch({ columns: colDraft });
            setMessage(
              `${colDraft.length + columnSpecs().filter((c) => c.fixed).length} columns shown.`,
            );
          } else if (v === "defaults") {
            setRegPatch({ columns: defaultColumns() });
            setMessage("Default columns restored.");
          }
        }}
      >
        <p>
          Line, Title and Amount are always shown. Select the other columns to
          show in the register and its printed extract.
        </p>
        <div class="lga-colpick">
          {colSpecs.map((c) => (
            <Checkbox
              key={c.key}
              label={c.label}
              checked={colDraft.includes(c.key)}
              onChange={(on) =>
                setColDraft((d) =>
                  on ? [...d, c.key] : d.filter((k) => k !== c.key),
                )
              }
            />
          ))}
        </div>
      </Dialog>

      <Dialog
        open={dialog === "refuse"}
        kind="error"
        title="Ledger"
        reference={`Ref ${refusal.ref}`}
        onOpen={() => services.sound.play("error")}
        onClose={() => setDialog(null)}
      >
        {refusal.text}
      </Dialog>

      <Dialog
        open={dialog === "notes"}
        kind="info"
        title="Register notes"
        onClose={() => setDialog(null)}
      >
        <ol class="lga-notes">
          {canon.budgetNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ol>
      </Dialog>

      <Dialog
        open={dialog === "method"}
        kind="info"
        title="Reconciliation method"
        onClose={() => setDialog(null)}
      >
        <p>
          Every stated total in the programme accounts is recomputed from the{" "}
          {budget.lineItems.length} line items of the register: the programme
          total, each programme category, each funding source and each fiscal
          year. A figure stated in whole billions must agree exactly. A figure
          stated to two decimal places of a billion agrees when the register sum
          falls within half a unit of its last digit.
        </p>
        <p>
          Current result: {checks.filter((c) => c.agrees).length} of{" "}
          {checks.length} figures agree. The full table is on the Summary sheet.
        </p>
      </Dialog>

      <Dialog
        open={dialog === "about"}
        kind="info"
        title="About Ledger"
        onClose={() => setDialog(null)}
      >
        <p>
          <strong>Ledger</strong>, programme accounts client.{" "}
          {canon.meta.environment}, release {canon.meta.release}.
        </p>
        <p>
          Accounts maintained by the{" "}
          {canon.divisions.find((d) => d.id === "CMP")?.name ?? "Comptroller"},{" "}
          {canon.divisions.find((d) => d.id === "CMP")?.site ?? ""}.{" "}
          {canon.divisions.find((d) => d.id === "CMP")?.mandate ?? ""}
        </p>
        <p>
          {budget.lineItems.length} line items across{" "}
          {budget.departments.length} cover departments and{" "}
          {budget.sources.length} funding sources, {budget.fiscalYears[0]?.fy}{" "}
          to {budget.fiscalYears[budget.fiscalYears.length - 1]?.fy}. Marking of
          this window: {markingInfo?.label ?? marking}.
        </p>
      </Dialog>
    </div>
  );
}
