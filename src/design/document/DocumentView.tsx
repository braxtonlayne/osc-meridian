import type { ComponentChildren, ComponentType } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RedactionInfo, Template } from '@core/contracts';
import type { Marking, MarkingId } from '@core/canon-types';
import '../primitives/primitives.css';
import './document.css';
import { cx, formatOscDate } from '../util';
import { redactionNotice } from '../primitives/Records';
import { fmOf, num, recs, str } from './frontmatter';
import { TEMPLATES, type TemplateCtx, type TemplateParts } from './templates';

/** Graphics supplied by the shell from @graphics/* once those modules exist. All optional. */
export interface DocumentSlots {
  /** @graphics/scan ScanPage */
  ScanPage?: ComponentType<{ seed: number; rotate: number; children: ComponentChildren }>;
  /** @graphics/banners MarkingStrip (replaces the token-styled strip). */
  MarkingStrip?: ComponentType<{ marking: MarkingId }>;
  /** @graphics/seal Seal (charter header). */
  Seal?: ComponentType<{ size: number; variant: 'full' | 'mono' | 'tiny' }>;
  /** @graphics/banners Stamp (distribution stamp on the print cover). */
  Stamp?: ComponentType<{ kind: string; date?: string }>;
}

export interface DocumentViewProps {
  doc: DocJson;
  /** canon.markings — supplies banner text and colours. Without it a neutral strip shows the id. */
  markings?: readonly Marking[];
  /** Intercepted cross-reference navigation (<a data-xref="/route">). */
  onNavigate?: (route: string) => void;
  /** Fired when a withheld element is hovered or focused. The shell audits it. */
  onRedactionHover?: (info: RedactionInfo) => void;
  slots?: DocumentSlots;
  /** Print cover sheet details. */
  print?: { copyNo?: string; printedBy?: string; printedAt?: string };
  /** Hide the screen header strip / footer (e.g. when the host window already shows them). */
  bare?: boolean;
}

const FALLBACK_LABELS: Record<MarkingId, string> = {
  'TSSCI-OSC': 'TOP SECRET//SCI//OSC',
  'UMBRA-EO': 'UMBRA//OSC EYES ONLY',
  'UMBRA-C': 'UMBRA//OSC COMPARTMENTED',
  'UMBRA-R': 'UMBRA//OSC RESTRICTED',
  'UMBRA-U': 'UMBRA//OSC UNRESTRICTED',
};

export function markingStyle(m: Pick<Marking, 'bannerBg' | 'bannerFg'> | undefined): Record<string, string> | undefined {
  return m ? { '--mark-bg': m.bannerBg, '--mark-fg': m.bannerFg } : undefined;
}

const TEMPLATE_NAMES: Record<Template, string> = {
  memo: 'Memorandum',
  directive: 'Directive',
  cable: 'Message (cable)',
  minutes: 'Minutes',
  dossier: 'Dossier',
  ledger: 'Ledger',
  form: 'Form',
  message: 'Message',
  help: 'Knowledge base article',
  record: 'Record',
  charter: 'Charter',
  scan: 'Scanned document',
  index: 'Index',
};

const NUMERIC = /^[\s(]*[-−+]?[$]?\s?\d[\d,]*(\.\d+)?\s*(%|[A-Z]{1,3})?\)?\s*$/;
const DATEISH = /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i;
const TOTAL = /^(sub-?total|total|grand total|net|balance)\b/i;

/** Post-process body HTML once per render of new HTML: redaction bars, numeric cells, totals rows. */
function enhanceBody(root: HTMLElement, redactions: RedactionInfo[]) {
  const byId = new Map(redactions.map((r) => [r.id, r]));
  root.querySelectorAll<HTMLElement>('[data-rx]').forEach((el) => {
    if (el.classList.contains('rx-released')) return;
    const info = byId.get(el.dataset.rx ?? '');
    const len = Number(el.dataset.len ?? info?.len ?? 8) || 8;
    const auth = el.dataset.auth ?? info?.auth ?? '';
    const ref = el.dataset.ref ?? info?.ref ?? '';
    el.classList.add('rx');
    const block = el.tagName === 'DIV' || el.classList.contains('rx-block') || el.hasAttribute('data-block');
    if (block) {
      el.classList.add('rx-block');
      el.style.setProperty('--rx-lines', String(Math.max(1, Math.ceil(len / 80))));
    } else {
      el.style.setProperty('--rx-len', String(Math.max(1, len)));
    }
    el.tabIndex = 0;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `Withheld. Authority ${auth}. Reference ${ref}.`);
    el.textContent = '';
  });
  root.querySelectorAll<HTMLTableElement>('table').forEach((t) => {
    t.classList.add('doc-table');
    const rows = Array.from(t.rows);
    const numericCols = new Map<number, { num: number; all: number }>();
    rows.forEach((tr) => {
      const first = tr.cells[0];
      if (first && TOTAL.test((first.textContent ?? '').trim())) tr.classList.add('is-total');
      Array.from(tr.cells).forEach((c, ci) => {
        if (c.tagName !== 'TD') return;
        const txt = (c.textContent ?? '').trim();
        if (!txt) return;
        const s = numericCols.get(ci) ?? { num: 0, all: 0 };
        s.all++;
        if (NUMERIC.test(txt) && !DATEISH.test(txt)) {
          s.num++;
          c.classList.add('num');
        }
        numericCols.set(ci, s);
      });
    });
    // Right-align header cells over numeric columns.
    const head = t.tHead?.rows[0];
    if (head) {
      numericCols.forEach((s, ci) => {
        if (s.all > 0 && s.num / s.all >= 0.75) head.cells[ci]?.classList.add('num');
      });
    }
  });
}

interface TipState {
  text: string;
  x: number;
  y: number;
}

/**
 * Renders a DocJson in its template: header strip, marking strip, template head, body HTML,
 * template tail, distribution / routing / revision / cross-reference sections, footer,
 * and a print-only cover sheet.
 */
export function DocumentView({ doc, markings, onNavigate, onRedactionHover, slots = {}, print, bare }: DocumentViewProps) {
  const fm = fmOf(doc);
  const marking = markings?.find((m) => m.id === doc.marking);
  const markingLabel = marking?.label ?? FALLBACK_LABELS[doc.marking] ?? doc.marking;
  const rootRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const hoverEl = useRef<Element | null>(null);

  useLayoutEffect(() => {
    if (bodyRef.current) enhanceBody(bodyRef.current, doc.redactions);
  }, [doc.html, doc.id]);

  const navigate = (route: string, e: MouseEvent) => {
    if (!onNavigate) return;
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    onNavigate(route);
  };

  const rxInfo = (el: HTMLElement): RedactionInfo => {
    const id = el.dataset.rx ?? '';
    const known = doc.redactions.find((r) => r.id === id);
    return {
      id,
      key: known?.key ?? '',
      len: Number(el.dataset.len ?? known?.len ?? 0),
      auth: el.dataset.auth ?? known?.auth ?? '',
      ref: el.dataset.ref ?? known?.ref ?? '',
    };
  };

  const showTip = (el: HTMLElement) => {
    const root = rootRef.current;
    if (!root) return;
    const info = rxInfo(el);
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    setTip({ text: redactionNotice(info.auth, info.ref), x: r.left - rr.left + root.scrollLeft, y: r.bottom - rr.top + root.scrollTop + 4 });
    onRedactionHover?.(info);
  };

  const findRx = (t: EventTarget | null): HTMLElement | null =>
    t instanceof Element ? (t.closest('.doc-body [data-rx]:not(.rx-released)') as HTMLElement | null) : null;

  const onOver = (e: MouseEvent) => {
    const el = findRx(e.target);
    if (el === hoverEl.current) return;
    hoverEl.current = el;
    if (el) showTip(el);
    else setTip(null);
  };
  const onFocusIn = (e: FocusEvent) => {
    const el = findRx(e.target);
    if (el) {
      hoverEl.current = el;
      showTip(el);
    }
  };
  const onFocusOut = (e: FocusEvent) => {
    if (findRx(e.target)) {
      hoverEl.current = null;
      setTip(null);
    }
  };
  const onClick = (e: MouseEvent) => {
    const a = e.target instanceof Element ? e.target.closest('a[data-xref]') : null;
    if (!a || !(a instanceof HTMLAnchorElement)) return;
    if (a.closest('.doc-body')) {
      const route = a.dataset.xref || a.getAttribute('href') || '';
      if (route) navigate(route, e);
    }
  };

  // Template parts. A scan may declare `scanOf` to lay out its content as another template.
  const ctx: TemplateCtx = { doc, fm, markingLabel, navigate, Seal: slots.Seal };
  const scanOf = str(fm, 'scanOf') as Template | undefined;
  const isScan = doc.template === 'scan';
  const scanLayout = isScan && scanOf && scanOf !== 'scan' && TEMPLATES[scanOf] ? scanOf : null;
  const tpl: TemplateParts = isScan && !scanLayout ? { bodyClass: 'doc-body--typed' } : (TEMPLATES[scanLayout ?? doc.template] ?? TEMPLATES.record)(ctx);
  const scanNote = isScan ? TEMPLATES.scan(ctx).head : null;

  const sheetInner = <SheetInner tpl={tpl} doc={doc} bodyRef={bodyRef} typed={isScan} />;
  let sheet: ComponentChildren;
  if (isScan) {
    const seed = num(fm, 'seed') ?? 1;
    const rotate = num(fm, 'rotate') ?? -0.4;
    sheet = slots.ScanPage ? (
      <slots.ScanPage seed={seed} rotate={rotate}>
        {sheetInner}
      </slots.ScanPage>
    ) : (
      <div class="scan-sheet" style={{ ['--scan-rot' as string]: `${rotate}deg` }}>
        <span class="scan-hole scan-hole--1" aria-hidden="true" />
        <span class="scan-hole scan-hole--2" aria-hidden="true" />
        <span class="scan-hole scan-hole--3" aria-hidden="true" />
        {sheetInner}
      </div>
    );
  } else {
    sheet = <div class="doc-sheet">{sheetInner}</div>;
  }

  const strip = slots.MarkingStrip ? (
    <slots.MarkingStrip marking={doc.marking} />
  ) : (
    <div class="doc-marking" role="note" aria-label={`Marking: ${markingLabel}`}>
      {markingLabel}
    </div>
  );

  const routing = recs(fm, 'routing');
  const revisions = recs(fm, 'revisions');

  return (
    <article
      ref={rootRef}
      class={cx('doc', `doc--${doc.template}`, isScan && scanOf && `doc--scan-of-${scanOf}`)}
      data-template={doc.template}
      data-docno={doc.docNo}
      style={markingStyle(marking)}
      aria-label={`${doc.docNo} ${doc.title}`}
      onMouseOver={onOver as unknown as (e: Event) => void}
      onMouseLeave={() => {
        hoverEl.current = null;
        setTip(null);
      }}
      onFocusIn={onFocusIn as unknown as (e: Event) => void}
      onFocusOut={onFocusOut as unknown as (e: Event) => void}
      onClick={onClick as unknown as (e: Event) => void}
    >
      <CoverSheet doc={doc} markingLabel={markingLabel} print={print} Stamp={slots.Stamp} />

      {bare ? null : (
        <header class="doc-strip" aria-label="Document control">
          <StripCell k="Doc No" v={doc.docNo} mono />
          <StripCell k="Marking" v={markingLabel} />
          <StripCell k="Originator" v={doc.originator} />
          <StripCell k="Rev" v={String(doc.revision)} mono />
          <StripCell k="Date" v={formatOscDate(doc.date)} mono />
          <StripCell k="Type" v={TEMPLATE_NAMES[doc.template] ?? doc.template} />
        </header>
      )}

      {strip}
      {scanNote}
      {sheet}
      {strip}

      <Annexes doc={doc} routing={routing} revisions={revisions} navigate={navigate} />

      {bare ? null : (
        <footer class="doc-foot">
          <span class="u-mono">
            {doc.docNo} &middot; Rev {doc.revision}
          </span>
          <span class="doc-foot__notice">
            UNCONTROLLED WHEN PRINTED OR COPIED. The controlled copy is held in MERIDIAN Records; confirm the current revision with
            the originating office before acting on any printed copy.
          </span>
          <span>{markingLabel}</span>
        </footer>
      )}

      {tip ? (
        <span class="tip doc-rx-tip" role="tooltip" style={{ left: `${tip.x}px`, top: `${tip.y}px` }}>
          {tip.text}
        </span>
      ) : null}
    </article>
  );
}

function StripCell({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div class="doc-strip__cell">
      <div class="doc-strip__k">{k}</div>
      <div class={cx('doc-strip__v', mono && 'u-mono')}>{v}</div>
    </div>
  );
}

function SheetInner({
  tpl,
  doc,
  bodyRef,
  typed,
}: {
  tpl: TemplateParts;
  doc: DocJson;
  bodyRef: { current: HTMLDivElement | null };
  typed: boolean;
}) {
  return (
    <>
      {tpl.head}
      <div ref={bodyRef} class={cx('doc-body', tpl.bodyClass, typed && 'doc-body--typed')} dangerouslySetInnerHTML={{ __html: doc.html }} />
      {tpl.tail}
    </>
  );
}

function Annexes({
  doc,
  routing,
  revisions,
  navigate,
}: {
  doc: DocJson;
  routing: Record<string, string>[];
  revisions: Record<string, string>[];
  navigate: (route: string, e: MouseEvent) => void;
}) {
  const dist = doc.distribution ?? [];
  if (!dist.length && !routing.length && !revisions.length && !doc.xrefs.length) return null;
  return (
    <div class="doc-annexes">
      {dist.length ? (
        <section class="doc-sec">
          <h2 class="doc-sec__h">Distribution</h2>
          <ol class="doc-dist">
            {dist.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ol>
        </section>
      ) : null}
      {routing.length ? (
        <section class="doc-sec">
          <h2 class="doc-sec__h">Routing slip</h2>
          <table class="doc-table doc-routing">
            <thead>
              <tr>
                <th scope="col" style={{ width: '4ch' }}>
                  #
                </th>
                <th scope="col">Office</th>
                <th scope="col">Action</th>
                <th scope="col" style={{ width: '9ch' }}>
                  Initials
                </th>
                <th scope="col" style={{ width: '13ch' }}>
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {routing.map((r, i) => (
                <tr key={i}>
                  <td class="num">{i + 1}</td>
                  <td>{r.office ?? r.to ?? ''}</td>
                  <td>{r.action ?? ''}</td>
                  <td class="doc-routing__init">{r.initials ?? ''}</td>
                  <td class="u-mono">{r.date ? formatOscDate(r.date) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {revisions.length ? (
        <section class="doc-sec">
          <h2 class="doc-sec__h">Revision history</h2>
          <table class="doc-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '6ch' }}>
                  Rev
                </th>
                <th scope="col" style={{ width: '13ch' }}>
                  Date
                </th>
                <th scope="col">Change</th>
                <th scope="col" style={{ width: '16ch' }}>
                  By
                </th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((r, i) => (
                <tr key={i}>
                  <td class="num">{r.rev ?? ''}</td>
                  <td class="u-mono">{r.date ? formatOscDate(r.date) : ''}</td>
                  <td>{r.change ?? ''}</td>
                  <td>{r.by ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {doc.xrefs.length ? (
        <section class="doc-sec no-print-links">
          <h2 class="doc-sec__h">Cross-references</h2>
          <table class="doc-table">
            <tbody>
              {doc.xrefs.map((x) => (
                <tr key={x.docNo}>
                  <td class="u-mono" style={{ width: '20ch' }}>
                    {x.docNo}
                  </td>
                  <td>
                    <a href={x.route} data-xref={x.route} onClick={(e) => navigate(x.route, e as unknown as MouseEvent)}>
                      {x.title}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function CoverSheet({
  doc,
  markingLabel,
  print,
  Stamp,
}: {
  doc: DocJson;
  markingLabel: string;
  print?: DocumentViewProps['print'];
  Stamp?: DocumentSlots['Stamp'];
}) {
  const dist = doc.distribution ?? [];
  return (
    <section class="doc-cover print-only" aria-hidden="true">
      <div class="doc-cover__band">{markingLabel}</div>
      <div class="doc-cover__main">
        <div class="doc-cover__org">OFFICE OF STRATEGIC CONTINUITY</div>
        <div class="doc-cover__kind">DOCUMENT COVER SHEET</div>
        <div class="doc-cover__marking">{markingLabel}</div>
        <table class="doc-cover__id">
          <tbody>
            <tr>
              <th>Document</th>
              <td>{doc.docNo}</td>
            </tr>
            <tr>
              <th>Title</th>
              <td>{doc.title}</td>
            </tr>
            <tr>
              <th>Originator</th>
              <td>{doc.originator}</td>
            </tr>
            <tr>
              <th>Revision / date</th>
              <td>
                {doc.revision} / {formatOscDate(doc.date)}
              </td>
            </tr>
            {print?.copyNo ? (
              <tr>
                <th>Copy</th>
                <td>{print.copyNo}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div class="doc-cover__stamp">
          {Stamp ? <Stamp kind="DISTRIBUTION" /> : null}
          <div class="doc-cover__stamp-h">DISTRIBUTION LIMITED</div>
          {dist.length ? (
            <ol>
              {dist.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
          ) : (
            <div>Addressees shown on the document only.</div>
          )}
          <div class="doc-cover__stamp-f">Further dissemination only with approval of the originating office.</div>
        </div>
        <p class="doc-cover__notice">
          This sheet stays attached to the document it covers. Store the document in an approved container when it is not under the
          direct control of a cleared operator. Return unwanted copies to Records Division for destruction; do not discard them.
        </p>
        {print?.printedBy || print?.printedAt ? (
          <p class="doc-cover__printed">
            Printed {print.printedAt ?? ''} {print.printedBy ? `by operator ${print.printedBy}` : ''}. Print event recorded.
          </p>
        ) : null}
      </div>
      <div class="doc-cover__band">{markingLabel}</div>
    </section>
  );
}
