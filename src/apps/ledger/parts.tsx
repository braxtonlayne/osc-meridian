/** Small shared pieces for the Ledger app: canon text with redaction sentinels, sizing hook, links. */
import { h } from "preact";
import type { ComponentChildren, JSX, RefObject } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Redaction } from "@design/index";
import { RefusalState } from "@graphics/states";
import { isRx, rxInfo, splitRx } from "@core/rx";
import type { Services } from "@core/contracts";
import type { Canon, MarkingId } from "@core/canon-types";
import canonJson from "@canon";
import { MarkingStrip as GMarkingStrip } from "@graphics/banners";

/** Authority shown on canon values withheld by the client-canon sanitiser. */
const RX_AUTH = "Classification Control";
const RX_REF = "OSC-LDG-REG";

/**
 * Canon text that may carry redaction sentinels (`[[RX:key:len]]`). Plain text is
 * printed as is; sentinels become Redaction bars of the withheld length.
 */
export function CanonText({
  value,
  services,
  subject,
}: {
  value: string | number | null | undefined;
  services: Services;
  subject: string;
}): JSX.Element {
  const onHover = (i: { auth: string; ref: string }) =>
    services.audit.log(
      "redaction.hover",
      subject,
      `Operator ${services.session.operatorId.peek()} examined a withheld ledger value (${i.auth}, ref ${i.ref}). No release was made.`,
    );
  if (value === null || value === undefined)
    return (
      <Redaction len={8} auth={RX_AUTH} reference={RX_REF} onHover={onHover} />
    );
  if (typeof value === "number") return <>{value}</>;
  if (isRx(value)) {
    const info = rxInfo(value)!;
    return (
      <Redaction
        len={info.len}
        auth={RX_AUTH}
        reference={`${RX_REF} (${info.key})`}
        onHover={onHover}
      />
    );
  }
  const parts = splitRx(value);
  if (parts.length === 1 && "text" in parts[0]!) return <>{value}</>;
  return (
    <>
      {parts.map((p, i) =>
        "text" in p ? (
          <span key={i}>{p.text}</span>
        ) : (
          <Redaction
            key={i}
            len={p.rx.len}
            auth={RX_AUTH}
            reference={`${RX_REF} (${p.rx.key})`}
            onHover={onHover}
          />
        ),
      )}
    </>
  );
}

/** Plain-string form of canon text for sorting, tooltips and print (sentinels become bars). */
export function canonPlain(value: string): string {
  return splitRx(value)
    .map((p) => ("text" in p ? p.text : "█".repeat(Math.max(1, p.rx.len))))
    .join("");
}

/** Width of an element, tracked with ResizeObserver. */
export function useWidth<T extends HTMLElement>(
  fallback = 600,
): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.floor(el.clientWidth) || fallback);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (cw > 0) setW(cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** An underlined in-window link that navigates through a callback (Ctrl/middle click keep normal behaviour). */
export function NavLink({
  href,
  onNavigate,
  children,
  title,
}: {
  href: string;
  onNavigate: (route: string) => void;
  children: ComponentChildren;
  title?: string;
}) {
  return (
    <a
      href={href}
      title={title}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}

interface RefusalProps {
  authority: string;
  reference: string;
  reason: string;
  requirement?: string;
  docNo?: string;
}
/** @graphics/states RefusalState with the app's prop shape. */
export function Refusal(p: RefusalProps) {
  return h(RefusalState, p);
}

export interface SimpleColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  mono?: boolean;
  width?: number;
  wrap?: boolean;
  render: (row: T) => ComponentChildren;
}

/**
 * Static report table in the DataTable look (dense, zebra, ruled). Used for the
 * small cross-tabulations on the sheets, where rows are fixed and drilldowns are
 * links; it does not take focus or scroll its ancestors.
 */
export function SimpleTable<T>({
  columns,
  rows,
  rowKey,
  label,
  footer,
  empty,
}: {
  columns: SimpleColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  label: string;
  footer?: ComponentChildren[];
  empty?: string;
}) {
  const cls = (c: SimpleColumn<T>) =>
    [c.align === "right" ? "is-right" : "", c.mono ? "is-mono" : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div class="well lga-table">
      <table class="dt dt--zebra dt--dense" aria-label={label}>
        <colgroup>
          {columns.map((c) => (
            <col
              key={c.key}
              style={c.width ? { width: `${c.width}px` } : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                class={c.align === "right" ? "is-right" : undefined}
              >
                <span class="dt__th-inner">{c.header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr class="dt__empty">
              <td colSpan={columns.length}>{empty ?? "No records."}</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    class={cls(c)}
                    style={c.wrap ? { whiteSpace: "normal" } : undefined}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer ? (
          <tfoot>
            <tr class="dt__total">
              {footer.map((f, i) => (
                <td key={i} class={columns[i] ? cls(columns[i]) : undefined}>
                  {f}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

/** @graphics/banners MarkingStrip by marking id (the DocumentView slot signature). */
export function MarkingStripById({ marking }: { marking: MarkingId }) {
  const m = (canonJson as unknown as Canon).markings.find(
    (x) => x.id === marking,
  );
  return m ? <GMarkingStrip marking={m} /> : null;
}

/** Fire `fn` once per distinct key (e.g. one doc.read per document shown). */
export function useOnce(key: string | null, fn: () => void): void {
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (key && seen.current !== key) {
      seen.current = key;
      fn();
    }
  }, [key]);
}
