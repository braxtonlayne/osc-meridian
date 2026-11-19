/**
 * Register extract to print: the grid as currently filtered, grouped and
 * subtotalled, with an identification block and marking strips. Uses the same
 * print mechanism as the shell's document print (a .print-root under <body>,
 * body[data-print-doc], window.print()).
 */
import { render } from "preact";
import type { MarkingId } from "@core/canon-types";
import {
  amountOf,
  categoryName,
  columnSpecs,
  fmtNum,
  firstFy,
  peakFy,
  shareOfCategory,
  sourceName,
} from "./model";
import type { GridRow, Totals } from "./model";
import { fmtPct } from "@graphics/ledger";
import { MarkingStripById as MarkingStrip, canonPlain } from "./parts";

export interface ExtractSpec {
  docNo: string;
  title: string;
  marking: MarkingId;
  markingLabel: string;
  scope: string;
  grouping: string;
  basis: string;
  fy: string;
  columns: string[];
  rows: GridRow[];
  totals: Totals;
  totalLines: number;
  copyNo: string;
  printedBy: string;
  printedAt: string;
}

function cell(key: string, r: GridRow, fy: string): string {
  if (r.type === "subtotal") {
    const t = r.group.totals;
    if (key === "title")
      return `Subtotal, ${r.group.label} (${t.count} ${t.count === 1 ? "line" : "lines"})`;
    if (key === "amount") return fmtNum(fy ? (t.fy[fy] ?? 0) : t.amountM);
    if (key.startsWith("fy:")) return fmtNum(t.fy[key.slice(3)] ?? 0);
    return "";
  }
  const l = r.item;
  switch (key) {
    case "no":
      return l.no;
    case "title":
      return canonPlain(l.title);
    case "department":
      return l.department;
    case "account":
      return canonPlain(l.account);
    case "source":
      return sourceName(l.sourceId);
    case "category":
      return categoryName(l.categoryId);
    case "amount":
      return fmtNum(amountOf(l, fy));
    case "share":
      return fmtPct(shareOfCategory(l));
    case "first":
      return firstFy(l);
    case "peak":
      return peakFy(l);
    default:
      return key.startsWith("fy:") ? fmtNum(l.fy[key.slice(3)] ?? 0) : "";
  }
}

function Extract({ spec }: { spec: ExtractSpec }) {
  const specs = columnSpecs().filter(
    (c) => c.key !== "trend" && (c.fixed || spec.columns.includes(c.key)),
  );
  const t = spec.totals;
  return (
    <div class="lga-print">
      <MarkingStrip marking={spec.marking} />
      <h1 class="lga-print__title">{spec.title}: register extract</h1>
      <table class="lga-print__id">
        <tbody>
          <tr>
            <th>Extract of</th>
            <td>{spec.docNo}</td>
            <th>Copy</th>
            <td>{spec.copyNo}</td>
          </tr>
          <tr>
            <th>Scope</th>
            <td>{spec.scope}</td>
            <th>Lines</th>
            <td>
              {t.count} of {spec.totalLines}
            </td>
          </tr>
          <tr>
            <th>Grouping</th>
            <td>{spec.grouping}</td>
            <th>Amount basis</th>
            <td>{spec.basis}</td>
          </tr>
          <tr>
            <th>Printed by</th>
            <td>{spec.printedBy}</td>
            <th>Printed</th>
            <td>{spec.printedAt}</td>
          </tr>
        </tbody>
      </table>
      <table class="lga-print__grid">
        <thead>
          <tr>
            {specs.map((c) => (
              <th key={c.key} class={c.numeric ? "num" : undefined}>
                {c.key === "amount" && spec.fy ? `${spec.fy} ($M)` : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((r) => (
            <tr key={r.key} class={r.type === "subtotal" ? "sub" : undefined}>
              {specs.map((c) => (
                <td key={c.key} class={c.numeric ? "num" : undefined}>
                  {cell(c.key, r, spec.fy)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            {specs.map((c) => (
              <td key={c.key} class={c.numeric ? "num" : undefined}>
                {c.key === "no"
                  ? "Total"
                  : c.key === "title"
                    ? `${t.count} ${t.count === 1 ? "line" : "lines"}`
                    : c.key === "amount"
                      ? fmtNum(spec.fy ? (t.fy[spec.fy] ?? 0) : t.amountM)
                      : c.key.startsWith("fy:")
                        ? fmtNum(t.fy[c.key.slice(3)] ?? 0)
                        : ""}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <p class="lga-print__foot">
        Extract of {spec.docNo}. UNCONTROLLED WHEN PRINTED OR COPIED.{" "}
        {spec.markingLabel}
      </p>
      <MarkingStrip marking={spec.marking} />
    </div>
  );
}

/** Render the extract into a print root, print it, and clean up. */
export async function printExtract(spec: ExtractSpec): Promise<void> {
  const root = document.createElement("div");
  root.className = "print-root lga-print-root";
  document.body.appendChild(root);
  render(<Extract spec={spec} />, root);
  document.body.dataset.printDoc = spec.docNo;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    removeEventListener("afterprint", cleanup);
    render(null, root);
    root.remove();
    delete document.body.dataset.printDoc;
  };
  addEventListener("afterprint", cleanup);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  try {
    window.print();
  } finally {
    setTimeout(cleanup, 1500);
  }
}
