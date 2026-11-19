import type { ComponentChildren, ComponentType } from 'preact';
import type { DocJson, Template } from '@core/contracts';
import { formatDtg, formatOscDate } from '../util';
import { PropertyGrid } from '../primitives/Indicators';
import { fields, recs, sig, str, strs, type FM, type Sig } from './frontmatter';

export interface TemplateCtx {
  doc: DocJson;
  fm: FM;
  markingLabel: string;
  navigate: (route: string, e: MouseEvent) => void;
  Seal?: ComponentType<{ size: number; variant: 'full' | 'mono' | 'tiny' }>;
}

export interface TemplateParts {
  /** Template-specific header block above the body. */
  head?: ComponentChildren;
  /** Closing block after the body (signature, actions, end-of-message). */
  tail?: ComponentChildren;
  /** Class on the body container: controls numbering and type. */
  bodyClass?: string;
}

/* ---------------- Shared pieces ---------------- */

export function Signature({ s, label }: { s: Sig; label?: string }) {
  return (
    <div class="doc-sig">
      {label ? <div class="doc-sig__label">{label}</div> : null}
      <div class="doc-sig__mark">
        //SIGNED//{s.by ? <span> {s.by.toUpperCase()}</span> : null}
      </div>
      <div class="doc-sig__name">
        {s.by ? <span class="doc-sig__for">for </span> : null}
        {s.name.toUpperCase()}
      </div>
      {s.title ? <div class="doc-sig__title">{s.title}</div> : null}
    </div>
  );
}

function Lines({ items }: { items: string[] }) {
  return (
    <>
      {items.map((x, i) => (
        <div key={i}>{x}</div>
      ))}
    </>
  );
}

/** An authored list marker at the start of an item ("A. ", "1. ", "b) "). */
const MARKER = /^\s*(?:[A-Za-z]|\d{1,2})[.)]\s+/;
const dropMarker = (s: string) => s.replace(MARKER, '');
/** True when every item carries its own marker, so the list must not add a second one. */
const ownMarkers = (items: string[]) => items.length > 0 && items.every((s) => MARKER.test(s));

function XrefLink({ ctx, route, children }: { ctx: TemplateCtx; route?: string; children: ComponentChildren }) {
  if (!route) return <>{children}</>;
  return (
    <a href={route} data-xref={route} onClick={(e) => ctx.navigate(route, e as unknown as MouseEvent)}>
      {children}
    </a>
  );
}

function resolveRef(ctx: TemplateCtx, ref: string): ComponentChildren {
  const hit = ctx.doc.xrefs.find((x) => ref.includes(x.docNo));
  if (!hit) return ref;
  const at = ref.indexOf(hit.docNo);
  return (
    <>
      {ref.slice(0, at)}
      <XrefLink ctx={ctx} route={hit.route}>
        {hit.docNo}
      </XrefLink>
      {ref.slice(at + hit.docNo.length)}
    </>
  );
}

/* ---------------- memo ---------------- */

function memo(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const to = strs(fm, 'memoFor');
  const thru = strs(fm, 'thru');
  const from = str(fm, 'from') ?? doc.originator;
  const subject = str(fm, 'subject') ?? doc.title;
  const refs = strs(fm, 'references');
  const letterhead = strs(fm, 'letterhead');
  const s = sig(fm, 'signature');
  const atts = strs(fm, 'attachments');
  const cc = strs(fm, 'cc');
  const numbered = fm.numbered !== false;
  return {
    bodyClass: numbered ? 'doc-body--numbered' : undefined,
    head: (
      <>
        <div class="memo-lh">
          <div class="memo-lh__agency">OFFICE OF STRATEGIC CONTINUITY</div>
          {letterhead.length ? <Lines items={letterhead} /> : <div>{doc.originator}</div>}
        </div>
        <div class="memo-date">{formatOscDate(doc.date)}</div>
        <table class="memo-hdr">
          <tbody>
            <tr>
              <th scope="row">MEMORANDUM FOR</th>
              <td>{to.length ? <Lines items={to} /> : 'SEE DISTRIBUTION'}</td>
            </tr>
            {thru.length ? (
              <tr>
                <th scope="row">THROUGH</th>
                <td>
                  <Lines items={thru} />
                </td>
              </tr>
            ) : null}
            <tr>
              <th scope="row">FROM</th>
              <td>{from}</td>
            </tr>
            <tr>
              <th scope="row">SUBJECT</th>
              <td class="memo-subj">{subject}</td>
            </tr>
            {refs.length ? (
              <tr>
                <th scope="row">REFERENCES</th>
                <td>
                  <ol class={ownMarkers(refs) ? 'memo-refs is-marked' : 'memo-refs'}>
                    {refs.map((r, i) => (
                      <li key={i}>{resolveRef(ctx, r)}</li>
                    ))}
                  </ol>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </>
    ),
    tail: (
      <>
        {s ? <Signature s={s} /> : null}
        {atts.length ? (
          <div class="doc-annex">
            <div class="doc-annex__h">Attachments:</div>
            <ol class={ownMarkers(atts) ? 'is-marked' : undefined}>
              {atts.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {cc.length ? (
          <div class="doc-annex">
            <div class="doc-annex__h">cc:</div>
            <Lines items={cc} />
          </div>
        ) : null}
      </>
    ),
  };
}

/* ---------------- directive ---------------- */

function directive(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const effective = str(fm, 'effective') ?? doc.date;
  const opr = str(fm, 'opr') ?? doc.originator;
  const category = str(fm, 'category');
  const certified = str(fm, 'certifiedCurrent');
  const approved = sig(fm, 'approvedBy');
  // Content may give supersession as prose in frontmatter (`supersedes: "OSC-DIR-0301 Revision 5, ..."`).
  const sup = doc.supersedes;
  const supText = sup ? undefined : str(fm, 'supersedes');
  const supHit = sup ? doc.xrefs.find((x) => x.docNo === sup) : undefined;
  const sections = doc.headings.filter((h) => h.depth === 2);
  return {
    bodyClass: 'doc-body--sections',
    head: (
      <>
        <table class="dir-box">
          <tbody>
            <tr>
              <td class="dir-box__agency" rowSpan={2}>
                <div class="dir-box__org">OFFICE OF STRATEGIC CONTINUITY</div>
                <div class="dir-box__kind">DIRECTIVE</div>
              </td>
              <th scope="row">NUMBER</th>
              <td class="u-mono">{str(fm, 'directiveNo') ?? doc.docNo}</td>
            </tr>
            <tr>
              <th scope="row">EFFECTIVE</th>
              <td>{formatOscDate(effective)}</td>
            </tr>
            <tr>
              <td class="dir-box__cat">{category ?? ''}</td>
              <th scope="row">OPR</th>
              <td>{opr}</td>
            </tr>
            <tr>
              <td class="dir-box__cat">{certified ? `Certified current ${formatOscDate(certified)}` : `Revision ${doc.revision}`}</td>
              <th scope="row">SUPERSEDES</th>
              <td class="u-mono">
                {sup ? (
                  <XrefLink ctx={ctx} route={supHit?.route}>
                    {sup}
                  </XrefLink>
                ) : supText ? (
                  resolveRef(ctx, supText)
                ) : (
                  'None'
                )}
              </td>
            </tr>
          </tbody>
        </table>
        <h1 class="dir-title">{doc.title}</h1>
        {sections.length > 2 ? (
          <nav class="dir-toc" aria-label="Sections">
            {sections.map((h, i) => (
              <a key={h.id} href={`#${h.id}`} onClick={(e) => {
                e.preventDefault();
                const root = (e.currentTarget as HTMLElement).closest('.doc');
                root?.querySelector(`#${CSS.escape(h.id)}`)?.scrollIntoView({ block: 'start' });
              }}>
                {i + 1}. {h.text}
              </a>
            ))}
          </nav>
        ) : null}
      </>
    ),
    tail: approved ? <Signature s={approved} label="APPROVED" /> : undefined,
  };
}

/* ---------------- cable ---------------- */

function cable(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const precedence = (str(fm, 'precedence') ?? 'ROUTINE').toUpperCase();
  const dtg = str(fm, 'dtg') ?? formatDtg(doc.date, str(fm, 'time') ?? '0000');
  const to = strs(fm, 'to');
  const info = strs(fm, 'info');
  const refs = strs(fm, 'refs');
  const serial = str(fm, 'serial') ?? str(fm, 'msgNo');
  const line = (k: string, v: ComponentChildren) => (
    <div class="cbl-line">
      <span class="cbl-k">{k}</span>
      <span class="cbl-v">{v}</span>
    </div>
  );
  return {
    bodyClass: 'doc-body--cable',
    head: (
      <div class="cbl-head">
        <div class="cbl-mark">{ctx.markingLabel}</div>
        {line('PRECEDENCE', precedence)}
        {line('DTG', dtg)}
        {serial ? line('SERIAL', serial) : null}
        {line('FM', (str(fm, 'fm') ?? doc.originator).toUpperCase())}
        {line('TO', to.length ? <Lines items={to.map((x) => x.toUpperCase())} /> : 'SEE DISTRIBUTION')}
        {info.length ? line('INFO', <Lines items={info.map((x) => x.toUpperCase())} />) : null}
        {line('SUBJ', (str(fm, 'subj') ?? doc.title).toUpperCase())}
        {refs.length
          ? line(
              'REF',
              <>
                {refs.map((r, i) => (
                  <div key={i}>
                    {String.fromCharCode(65 + i)}. {resolveRef(ctx, dropMarker(r).toUpperCase())}
                  </div>
                ))}
              </>,
            )
          : null}
      </div>
    ),
    tail: (
      <div class="cbl-end">
        <div>END OF MESSAGE</div>
        <div class="cbl-mark">{ctx.markingLabel}</div>
      </div>
    ),
  };
}

/* ---------------- minutes ---------------- */

function minutes(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const attendees = recs(fm, 'attendees');
  const agenda = strs(fm, 'agenda');
  const actions = recs(fm, 'actions');
  const chair = str(fm, 'chair');
  const recorder = str(fm, 'recorder');
  const approved = sig(fm, 'approvedBy');
  const meta = [
    { label: 'Meeting', value: str(fm, 'meeting') ?? doc.title },
    { label: 'Date', value: formatOscDate(doc.date) },
    str(fm, 'convened') ? { label: 'Convened', value: str(fm, 'convened') ?? '' } : null,
    str(fm, 'adjourned') ? { label: 'Adjourned', value: str(fm, 'adjourned') ?? '' } : null,
    str(fm, 'location') ? { label: 'Location', value: str(fm, 'location') ?? '' } : null,
    chair ? { label: 'Chair', value: chair } : null,
    recorder ? { label: 'Recorder', value: recorder } : null,
  ].filter((x): x is { label: string; value: string } => !!x);
  return {
    bodyClass: 'doc-body--minutes',
    head: (
      <>
        <h1 class="min-title">MINUTES</h1>
        <div class="min-sub">{doc.title}</div>
        <PropertyGrid rows={meta} columns={2} />
        {attendees.length ? (
          <section class="doc-sec">
            <h2 class="doc-sec__h">Attendance</h2>
            <table class="doc-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Office</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a, i) => (
                  <tr key={i}>
                    <td>{a.name ?? ''}</td>
                    <td>{a.office ?? a.org ?? ''}</td>
                    <td>{(a.status ?? 'PRESENT').toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
        {agenda.length ? (
          <section class="doc-sec">
            <h2 class="doc-sec__h">Agenda</h2>
            <ol class="min-agenda">
              {agenda.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </section>
        ) : null}
        <h2 class="doc-sec__h">Proceedings</h2>
      </>
    ),
    tail: (
      <>
        {actions.length ? (
          <section class="doc-sec">
            <h2 class="doc-sec__h">Actions</h2>
            <table class="doc-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '9ch' }}>No.</th>
                  <th scope="col">Action</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Suspense</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i}>
                    <td class="u-mono">{a.no ?? String(i + 1)}</td>
                    <td>{a.action ?? ''}</td>
                    <td>{a.owner ?? ''}</td>
                    <td class="u-nowrap">{a.suspense ? formatOscDate(a.suspense) : ''}</td>
                    <td>{(a.status ?? 'OPEN').toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
        {str(fm, 'nextMeeting') ? <p class="min-next">Next meeting: {str(fm, 'nextMeeting')}</p> : null}
        {approved ? <Signature s={approved} label="APPROVED" /> : null}
      </>
    ),
  };
}

/* ---------------- ledger / record / dossier ---------------- */

function totalsBlock(fm: FM) {
  const totals = fields(fm, 'totals');
  if (!totals.length) return null;
  return (
    <table class="doc-table doc-totals">
      <tbody>
        {totals.map((t, i) => (
          <tr key={i} class="is-total">
            <th scope="row">{t.label}</th>
            <td class="num">{t.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ledger(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const f = fields(fm, 'fields');
  const cert = str(fm, 'certification');
  return {
    bodyClass: 'doc-body--dense',
    head: (
      <>
        <h1 class="rec-title">{doc.title}</h1>
        {f.length ? <PropertyGrid rows={f.map((x) => ({ label: x.label, value: x.value, mono: x.mono }))} columns={2} /> : null}
      </>
    ),
    tail: (
      <>
        {totalsBlock(fm)}
        {cert ? <p class="rec-cert">{cert}</p> : null}
      </>
    ),
  };
}

function record(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const f = fields(fm, 'fields');
  return {
    bodyClass: 'doc-body--dense',
    head: (
      <>
        <div class="rec-kind">{str(fm, 'recordType') ?? 'RECORD'}</div>
        <h1 class="rec-title">{doc.title}</h1>
        {f.length ? <PropertyGrid rows={f.map((x) => ({ label: x.label, value: x.value, mono: x.mono }))} /> : null}
      </>
    ),
    tail: totalsBlock(fm),
  };
}

function dossier(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const f = fields(fm, 'identity');
  const facility = doc.facility ?? str(fm, 'facility');
  return {
    head: (
      <>
        <div class="rec-kind">{str(fm, 'dossierType') ?? 'FACILITY DOSSIER'}</div>
        <h1 class="rec-title">
          {facility ? <span class="u-mono">{facility} </span> : null}
          {doc.title}
        </h1>
        {f.length ? (
          <PropertyGrid caption="IDENTITY" rows={f.map((x) => ({ label: x.label, value: x.value, mono: x.mono }))} columns={2} />
        ) : null}
      </>
    ),
  };
}

/* ---------------- form ---------------- */

const DEFAULT_FORM_AUTHORITY =
  'Information entered on this form is used by the receiving office to act on the request shown and to keep the record required by the issuing division. Entries are a condition of processing. Completed forms are retained under the records schedule of the issuing division and are not released outside the Office.';

function form(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  // The header prints "OSC FORM 126"; content may give the full docNo ("OSC-F-126").
  const formNo = (str(fm, 'formNo') ?? doc.docNo).replace(/^OSC-F(?:ORM)?[-\s]+/i, '');
  const edition = str(fm, 'edition');
  const footer = str(fm, 'footer');
  // Blocks: {no,label,value,wide} or the Forms app shape {n,label,fields:[{label}]}.
  const rawBlocks = (Array.isArray(fm.blocks) ? fm.blocks : []).filter((x) => !!x && typeof x === 'object' && !Array.isArray(x));
  const blocks = recs({ blocks: rawBlocks }, 'blocks').map((rec, i) => {
    const raw = rawBlocks[i] as { fields?: unknown } | undefined;
    const fieldLabels = Array.isArray(raw?.fields)
      ? raw.fields.flatMap((x) => (x && typeof x === 'object' && typeof (x as { label?: unknown }).label === 'string' ? [(x as { label: string }).label] : []))
      : [];
    return { rec, no: rec.no ?? rec.n, fieldLabels };
  });
  return {
    bodyClass: 'doc-body--form',
    head: (
      <>
        <table class="frm-top">
          <tbody>
            <tr>
              <td class="frm-top__no">
                <div>OSC FORM {formNo}</div>
                {edition ? <div class="frm-top__ed">EDITION {edition}</div> : null}
              </td>
              <td class="frm-top__title">{(str(fm, 'formTitle') ?? doc.title).toUpperCase()}</td>
              <td class="frm-top__ctl">
                <div>Control No.</div>
                <div class="frm-top__box" />
              </td>
            </tr>
          </tbody>
        </table>
        <div class="frm-auth">
          <span class="frm-auth__h">AUTHORITY AND USE. </span>
          {str(fm, 'authority') ?? DEFAULT_FORM_AUTHORITY}
        </div>
        {blocks.length ? (
          <div class="frm-grid">
            {blocks.map((b, i) => (
              <div key={i} class="frm-cell" style={b.rec.wide === 'true' ? { gridColumn: '1 / -1' } : undefined}>
                <div class="frm-cell__l">
                  <span class="frm-cell__no">{b.no ?? String(i + 1)}.</span> {b.rec.label ?? ''}
                </div>
                <div class="frm-cell__v">
                  {b.rec.value ?? (b.fieldLabels.length ? <Lines items={b.fieldLabels} /> : '')}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </>
    ),
    tail: (
      <div class="frm-foot">
        {footer ?? (
          <>
            OSC FORM {formNo}
            {edition ? `, EDITION ${edition}` : ''}
          </>
        )}
        . PREVIOUS EDITIONS ARE NOT TO BE USED.
      </div>
    ),
  };
}

/* ---------------- message ---------------- */

function message(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const rows: [string, ComponentChildren][] = [
    ['From', str(fm, 'from') ?? doc.originator],
    ['To', strs(fm, 'to').join('; ')],
  ];
  const cc = strs(fm, 'cc');
  if (cc.length) rows.push(['Cc', cc.join('; ')]);
  rows.push(['Sent', str(fm, 'sent') ?? formatOscDate(doc.date)]);
  const prec = str(fm, 'precedence');
  if (prec) rows.push(['Precedence', prec.toUpperCase()]);
  rows.push(['Subject', str(fm, 'subject') ?? doc.title]);
  return {
    bodyClass: 'doc-body--message',
    head: (
      <table class="msg-hdr">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}:</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
    tail: str(fm, 'receipt') ? <div class="msg-receipt">{str(fm, 'receipt')}</div> : undefined,
  };
}

/* ---------------- help ---------------- */

function help(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const rows = [
    { label: 'Article', value: str(fm, 'kbNo') ?? doc.docNo, mono: true },
    { label: 'Applies to', value: str(fm, 'appliesTo') ?? 'MERIDIAN Workstation Environment 4.1.x' },
    { label: 'Audience', value: str(fm, 'audience') ?? 'All operators' },
    { label: 'Last reviewed', value: formatOscDate(str(fm, 'reviewed') ?? doc.date) },
  ];
  return {
    bodyClass: 'doc-body--help',
    head: (
      <>
        <div class="rec-kind">HELP DESK KNOWLEDGE BASE</div>
        <h1 class="help-title">{doc.title}</h1>
        <PropertyGrid rows={rows} columns={2} />
      </>
    ),
  };
}

/* ---------------- charter ---------------- */

function charter(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const Seal = ctx.Seal;
  const article = str(fm, 'article');
  return {
    bodyClass: 'doc-body--charter',
    head: (
      <header class="chr-head">
        {Seal ? (
          <div class="chr-seal">
            <Seal size={72} variant="mono" />
          </div>
        ) : null}
        <div class="chr-org">OFFICE OF STRATEGIC CONTINUITY</div>
        <div class="chr-rule" />
        <h1 class="chr-title">{str(fm, 'charterTitle') ?? 'Charter of the Continuity Council'}</h1>
        {article ? <div class="chr-article">{article}</div> : null}
        <div class="chr-sub">{doc.title}</div>
        <div class="chr-rule" />
      </header>
    ),
    tail: str(fm, 'attestation') ? <p class="chr-attest">{str(fm, 'attestation')}</p> : undefined,
  };
}

/* ---------------- scan ---------------- */

function scan(ctx: TemplateCtx): TemplateParts {
  const { fm } = ctx;
  return {
    bodyClass: 'doc-body--typed',
    head: <div class="scan-note no-print">{str(fm, 'scanNote') ?? 'Scanned image of a paper original. Text has not been verified against the original.'}</div>,
  };
}

/* ---------------- index ---------------- */

function indexT(ctx: TemplateCtx): TemplateParts {
  const { doc, fm } = ctx;
  const entries = recs(fm, 'entries');
  return {
    head: <h1 class="rec-title">{doc.title}</h1>,
    tail: entries.length ? (
      <table class="doc-table idx-table">
        <thead>
          <tr>
            <th scope="col" style={{ width: '18ch' }}>Number</th>
            <th scope="col">Title</th>
            <th scope="col" style={{ width: '12ch' }}>Date</th>
            <th scope="col" style={{ width: '14ch' }}>Marking</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td class="u-mono">{e.docNo ?? ''}</td>
              <td>
                <XrefLink ctx={ctx} route={e.route}>
                  {e.title ?? ''}
                </XrefLink>
                {e.note ? <span class="idx-note"> {e.note}</span> : null}
              </td>
              <td class="u-nowrap">{e.date ? formatOscDate(e.date) : ''}</td>
              <td>{e.marking ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : undefined,
  };
}

export const TEMPLATES: Record<Template, (ctx: TemplateCtx) => TemplateParts> = {
  memo,
  directive,
  cable,
  minutes,
  dossier,
  ledger,
  form,
  message,
  help,
  record,
  charter,
  scan,
  index: indexT,
};
