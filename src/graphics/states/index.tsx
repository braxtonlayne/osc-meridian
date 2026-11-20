/**
 * @graphics/states: empty, error and refusal states (asset family 15).
 *
 * Message panels in the register of a 2008 records-management thick client:
 * grey, exact, undramatic. Everything is drawn in code (inline SVG + HTML) and
 * coloured only through design tokens (see states.css).
 *
 * Nothing in this module ever receives withheld text. Redaction bars are sized
 * from a character count only.
 */
import { Fragment } from 'preact';
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { closeWorldText } from '@core/closed-world';
import { activeDef } from '@core/accounts';
import './states.css';

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

/** FNV-1a, 32 bit. Stable across sessions and builds. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small seeded generator, returns values in [0, 1). */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function hex(n: number, width: number): string {
  return n.toString(16).toUpperCase().padStart(width, '0');
}

/* ------------------------------------------------------------------ */
/* Glyphs                                                              */
/* ------------------------------------------------------------------ */

export type StateGlyphId =
  | 'locked'
  | 'tray'
  | 'folder'
  | 'search'
  | 'printer'
  | 'mail'
  | 'error'
  | 'path';

export interface StateGlyphProps {
  id: StateGlyphId;
  /** Rendered size in CSS px. Art is drawn on a 32 unit grid. Default 32. */
  size?: number;
  class?: string;
}

function glyphBody(id: StateGlyphId): JSX.Element {
  switch (id) {
    case 'locked':
      // Closed record folder with a padlock over the lower right corner.
      return (
        <g>
          <path class="st-g-mid st-g-line" d="M2.5 8.5v-3h9l2 3z" />
          <path class="st-g-mid st-g-line" d="M2.5 8.5h25v17h-25z" />
          <path class="st-g-face st-g-line" d="M2.5 11.5h25v14h-25z" />
          <path class="st-g-hi-line" d="M3.5 24.5v-12h23" />
          <path class="st-g-line" d="M19 19.5v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke-width="2" />
          <path class="st-g-hi-line" d="M19.5 19v-2.5a3 3 0 0 1 3-3" />
          <path class="st-g-dark st-g-line" d="M16.5 19.5h12v9h-12z" />
          <path class="st-g-hi-fill" d="M21.5 22h2v2.2l.6 2.3h-3.2l.6-2.3z" />
        </g>
      );
    case 'tray':
      // Empty correspondence tray, seen from the front.
      return (
        <g>
          <path class="st-g-hi-fill st-g-line" d="M7.5 7.5h17l4 11v8h-25v-8z" />
          <path class="st-g-face st-g-line" d="M3.5 18.5h8l1.5 3h6l1.5-3h8v8h-25z" />
          <path class="st-g-hi-line" d="M4.5 25.5v-6h6.4l1.5 3h7.2l1.5-3h6.4" />
          <path class="st-g-soft-line" d="M9.5 10.5h13M8.5 13.5h15" />
        </g>
      );
    case 'folder':
      // Open folder with nothing in it.
      return (
        <g>
          <path class="st-g-mid st-g-line" d="M2.5 26.5v-20h9l2 3h13v4" />
          <path class="st-g-face st-g-line" d="M2.5 26.5l4-13h23l-4 13z" />
          <path class="st-g-hi-line" d="M4.2 25.5l3.4-11h20.5" />
          <path class="st-g-soft-line" d="M11.5 20.5h9" stroke-dasharray="2 2" />
        </g>
      );
    case 'search':
      // Index card with a magnifier that has found nothing.
      return (
        <g>
          <path class="st-g-hi-fill st-g-line" d="M3.5 4.5h18v20h-18z" />
          <path class="st-g-soft-line" d="M6.5 8.5h12M6.5 11.5h12M6.5 14.5h7M6.5 17.5h5" />
          <circle class="st-g-face st-g-line" cx="19.5" cy="18.5" r="5" stroke-width="1.6" />
          <path class="st-g-hi-line" d="M16.4 18.5a3.1 3.1 0 0 1 3.1-3.1" />
          <path class="st-g-line" d="M23.2 22.2l5.3 5.3" stroke-width="3" fill="none" />
        </g>
      );
    case 'printer':
      // Departmental printer, output tray empty.
      return (
        <g>
          <path class="st-g-hi-fill st-g-line" d="M9.5 3.5h13v8h-13z" />
          <path class="st-g-face st-g-line" d="M3.5 11.5h25v11h-25z" />
          <path class="st-g-hi-line" d="M4.5 21.5v-9h23" />
          <path class="st-g-dark st-g-line" d="M7.5 18.5h17v3h-17z" />
          <path class="st-g-mid st-g-line" d="M5.5 22.5h21l2 5h-25z" />
          <path class="st-g-idle" d="M23 14h3v2h-3z" />
        </g>
      );
    case 'mail':
      // Mail folder: an open, empty envelope.
      return (
        <g>
          <path class="st-g-mid st-g-line" d="M3.5 12.5l12.5-9 12.5 9v15h-25z" />
          <path class="st-g-dark" d="M6 13l10-7 10 7-10 6z" />
          <path class="st-g-face st-g-line" d="M3.5 12.5l12.5 8 12.5-8v15h-25z" />
          <path class="st-g-hi-line" d="M4.5 26.5v-12.2l11.5 7.4" />
          <path class="st-g-soft-line" d="M3.5 27.5l9-9M28.5 27.5l-9-9" />
        </g>
      );
    case 'error':
      // The plain octagon. No gradient, no gloss.
      return (
        <g shape-rendering="geometricPrecision">
          <path class="st-g-fault st-g-line" d="M10.5 2.5h11l8 8v11l-8 8h-11l-8-8v-11z" />
          <path class="st-g-fault-edge" d="M11.1 4h9.8l7.1 7.1" />
          <path class="st-g-cross" d="M11 11l10 10M21 11L11 21" />
        </g>
      );
    case 'path':
      // Namespace tree: one branch resolves, the requested one does not.
      return (
        <g>
          <path class="st-g-face st-g-line" d="M3.5 3.5h9v6h-9z" />
          <path class="st-g-soft-line" d="M7.5 9.5v15M7.5 15.5h9M7.5 24.5h9" stroke="currentColor" />
          <path class="st-g-face st-g-line" d="M16.5 12.5h9v6h-9z" />
          <path class="st-g-hi-line" d="M17.5 17.5v-4h7" />
          <path class="st-g-hi-fill st-g-line" d="M16.5 21.5h12v6h-12z" stroke-dasharray="2 1.5" />
          <path class="st-g-soft-line" d="M20.5 24.5h4" />
        </g>
      );
  }
}

/** The small drawn glyphs used by the state panels. Decorative: hidden from AT. */
export function StateGlyph({ id, size = 32, class: className }: StateGlyphProps): JSX.Element {
  return (
    <svg
      class={cx('st-glyph', className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shape-rendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {glyphBody(id)}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Shared parts                                                        */
/* ------------------------------------------------------------------ */

interface FieldRow {
  label: string;
  value: ComponentChildren;
  mono?: boolean;
}

function Fields({ rows, caption }: { rows: FieldRow[]; caption: string }): JSX.Element {
  return (
    <table class="st-fields">
      <caption class="st-sr">{caption}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td class={row.mono ? 'st-mono' : undefined}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface StateButtonProps {
  onClick: () => void;
  children: ComponentChildren;
  /** Marks the default action with the heavier outline. */
  primary?: boolean;
  small?: boolean;
  expanded?: boolean;
  controls?: string;
}

/** Bevelled push button matching the panel chrome. */
export function StateButton({
  onClick,
  children,
  primary,
  small,
  expanded,
  controls,
}: StateButtonProps): JSX.Element {
  return (
    <button
      type="button"
      class={cx('st-btn', primary && 'st-btn--default', small && 'st-btn--small')}
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* RefusalState                                                        */
/* ------------------------------------------------------------------ */

export interface RefusalStateProps {
  /** Withholding authority, e.g. "Records Division" or "OIA". */
  authority: string;
  /** Reference under which the control is applied, e.g. "DIR-0412". */
  reference: string;
  /** One in-world sentence: why this operator cannot open it. */
  reason: string;
  /** What would satisfy the control, e.g. "Tier 2 compartment briefing". */
  requirement?: string;
  /** Document number of the controlled record, e.g. "OSC-DIR-0412". */
  docNo?: string;
  /** When given, the "Request access (OSC Form 21)…" button is shown. */
  onRequestAccess?: () => void;
  /** Single-row form for use inside lists, table cells and document flow. */
  compact?: boolean;
  /** Overrides the heading. */
  heading?: string;
  class?: string;
}

const REQUEST_LABEL = 'Request access (OSC Form 21)…';

/**
 * In-world refusal shown where content needs clearance the operator lacks.
 * Fills its container (a window content area) unless `compact`.
 */
export function RefusalState(props: RefusalStateProps): JSX.Element {
  // Tier 4 closed world (SPEC-2 §1): a refusal shown to a Tier 4 operator names no other facility.
  const me = activeDef.peek();
  const close = (x: string): string => (me.tier === 4 ? closeWorldText(x, me.site) : x);
  const authority = close(props.authority);
  const reason = close(props.reason);
  const reference = close(props.reference);
  const {
    requirement,
    docNo,
    onRequestAccess,
    compact,
    heading = 'Access to this record is controlled',
    class: className,
  } = props;

  if (compact) {
    return (
      <span class={cx('st st-refusal-compact', className)} role="note">
        <svg class="st-glyph" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
          <path class="st-g-line" d="M5 7.5v-2.5a3 3 0 0 1 6 0v2.5" fill="none" stroke-width="2" shape-rendering="geometricPrecision" />
          <path class="st-g-face st-g-line" d="M3.5 7.5h9v6h-9z" />
          <path class="st-g-hi-line" d="M4.5 12.5v-4h7" />
          <path class="st-g-dark" d="M7 9h2v3h-2z" />
        </svg>
        <span class="st-refusal-compact__text">
          <strong>Controlled.</strong> {reason}{' '}
          <span class="st-refusal-compact__ref">
            Authority {authority}. Reference <span class="st-mono">{reference}</span>.
          </span>
        </span>
        {onRequestAccess && (
          <StateButton small onClick={onRequestAccess}>
            Request access{'…'}
          </StateButton>
        )}
      </span>
    );
  }

  const rows: FieldRow[] = [];
  if (docNo) rows.push({ label: 'Document', value: docNo, mono: true });
  if (requirement) rows.push({ label: 'Requirement', value: requirement });
  rows.push({ label: 'Withholding authority', value: authority });
  rows.push({ label: 'Reference', value: reference, mono: true });

  return (
    <section class={cx('st st-panel st-refusal', className)} role="group" aria-label={heading}>
      <div class="st-head">
        <StateGlyph id="locked" />
        <div class="st-head__text">
          <h2 class="st-title">{heading}</h2>
          <p class="st-lead">{reason}</p>
        </div>
      </div>
      <div class="st-body">
        <Fields rows={rows} caption="Access control particulars" />
        <p class="st-note">
          The record is held under access control by the withholding authority shown above. The
          present session does not carry the tier or compartment needed to open it, and the record
          has not been opened. The attempt has been entered in the
          audit log in the ordinary way; no further action is required of the operator.
        </p>
        {onRequestAccess && (
          <p class="st-note">
            Access may be requested from the withholding authority on OSC Form 21. Quote the
            reference above. A request does not confer access.
          </p>
        )}
      </div>
      {onRequestAccess && (
        <div class="st-actions">
          <StateButton primary onClick={onRequestAccess}>
            {REQUEST_LABEL}
          </StateButton>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

export type EmptyIconId = 'tray' | 'folder' | 'search' | 'printer' | 'mail';

export interface EmptyStateProps {
  title: string;
  body?: string;
  /** A built-in glyph id, or any node to use in its place. Default 'tray'. */
  icon?: EmptyIconId | ComponentChildren;
  class?: string;
}

const EMPTY_ICONS: readonly string[] = ['tray', 'folder', 'search', 'printer', 'mail'];

function isEmptyIconId(value: unknown): value is EmptyIconId {
  return typeof value === 'string' && EMPTY_ICONS.includes(value);
}

/** Quiet "nothing here" message for list panes. Fills its container. */
export function EmptyState({ title, body, icon = 'tray', class: className }: EmptyStateProps): JSX.Element {
  return (
    <div class={cx('st st-empty', className)} role="status">
      <div class="st-empty__icon">{isEmptyIconId(icon) ? <StateGlyph id={icon} /> : icon}</div>
      <p class="st-empty__title">{title}</p>
      {body && <p class="st-empty__body">{body}</p>}
    </div>
  );
}

/** "No items in this folder." */
export function EmptyFolder({ name }: { name?: string }): JSX.Element {
  return (
    <EmptyState
      icon="folder"
      title={name ? `No items in ${name}.` : 'No items in this folder.'}
      body="Items filed here at or below your current tier will be listed in this view."
    />
  );
}

/** Empty search results. Says, accurately, what the search covered. */
export function EmptySearchResults({ query }: { query?: string }): JSX.Element {
  return (
    <EmptyState
      icon="search"
      title={query ? `No records matched “${query}”.` : 'No records matched.'}
      body="Search covers records releasable at your current tier. Check the spelling of document numbers and site designators, or search on fewer terms."
    />
  );
}

/** Empty print queue. */
export function EmptyPrintQueue({ device }: { device?: string }): JSX.Element {
  return (
    <EmptyState
      icon="printer"
      title="There are no documents in the print queue."
      body={
        device
          ? `Jobs sent to ${device} are listed here until collected. Printed copies are numbered and recorded against the operator.`
          : 'Jobs are listed here until collected. Printed copies are numbered and recorded against the operator.'
      }
    />
  );
}

/** Empty mailbox folder. */
export function EmptyMailFolder({ folder }: { folder?: string }): JSX.Element {
  return (
    <EmptyState
      icon="mail"
      title={folder ? `There are no messages in ${folder}.` : 'There are no messages in this folder.'}
      body="Traffic addressed to you is delivered as it is released by the message centre."
    />
  );
}

/* ------------------------------------------------------------------ */
/* ErrorState                                                          */
/* ------------------------------------------------------------------ */

export interface ErrorStateProps {
  /** In-world error code, e.g. "MERIDIAN-0x0417". Shown in mono, copyable. */
  code: string;
  title: string;
  body: string;
  /** Trace text for the Details pane. A plausible one is derived from `code` if omitted. */
  detail?: string;
  /** Start with the Details pane open. */
  defaultOpen?: boolean;
  /** Optional extra buttons (use StateButton), placed left of Details. */
  actions?: ComponentChildren;
  class?: string;
}

const TRACE_MODULES = ['RECVIEW', 'MWSDOC', 'RELSVC', 'IDXQRY'] as const;
const TRACE_FRAMES = [
  'RenderPage(RecordHandle*, int)',
  'OpenRecord(const wchar_t*)',
  'ResolveRelease(const ReleaseKey&)',
  'ReadBlock(BlockRef*, unsigned long)',
  'LayoutFlow(PageBox*)',
  'FetchManifest(RouteRequest*)',
] as const;

/**
 * Builds a fixed, plausible trace for an error code. In-world only: module and
 * symbol names are invented and contain no dates, operators or record content.
 */
export function traceForCode(code: string): string {
  const seed = hash32(code);
  const next = prng(seed);
  const mod = TRACE_MODULES[seed % TRACE_MODULES.length] ?? 'RECVIEW';
  const numeric = /0x([0-9a-f]+)/i.exec(code)?.[1];
  const status = `0x8004${(numeric ?? hex(seed & 0xffff, 4)).toUpperCase().padStart(4, '0').slice(-4)}`;
  const off = (): string => `0x${hex(8 + Math.floor(next() * 0x3f0), 3)}`;
  const first = Math.floor(next() * TRACE_FRAMES.length);
  const frames = [0, 1, 2].map((i) => TRACE_FRAMES[(first + i * 2) % TRACE_FRAMES.length] ?? TRACE_FRAMES[0]);
  const base = hex(0x10000000 + ((seed >>> 4) & 0x0fff) * 0x10000, 8);
  return [
    `${code}  status ${status}  severity ERROR`,
    `Raised in module ${mod}.DLL (base 0x${base})`,
    '',
    ...frames.map((frame) => `  at ${mod}!${frame} + ${off()}`),
    `  at MWSSHELL!DispatchOpen(RouteRequest*) + ${off()}`,
    `  at MWSSHELL!MessagePump() + ${off()}`,
    `  at MWS.EXE!WinMainCRTStartup + ${off()}`,
    '',
    `Thread 0x${hex(0x400 + (seed & 0xfff), 4)}  open handles ${120 + (seed % 380)}`,
    'The condition was written to the workstation event log.',
    'No record content is included in this report.',
  ].join('\n');
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** In-world system error with a Details disclosure and a copyable code. */
export function ErrorState({
  code,
  title,
  body,
  detail,
  defaultOpen = false,
  actions,
  class: className,
}: ErrorStateProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState<'idle' | 'done' | 'manual'>('idle');
  const codeRef = useRef<HTMLInputElement>(null);
  const detailId = useId();
  const trace = detail ?? traceForCode(code);

  useEffect(() => {
    if (copied === 'idle') return undefined;
    const timer = setTimeout(() => setCopied('idle'), 2400);
    return () => clearTimeout(timer);
  }, [copied]);

  const onCopy = (): void => {
    void copyText(code).then((ok) => {
      if (!ok) codeRef.current?.select();
      setCopied(ok ? 'done' : 'manual');
    });
  };

  return (
    <section class={cx('st st-panel st-error', className)} role="alert" aria-label={`${code} ${title}`}>
      <div class="st-head">
        <StateGlyph id="error" />
        <div class="st-head__text">
          <h2 class="st-title">{title}</h2>
          <p class="st-lead">{body}</p>
        </div>
      </div>
      <div class="st-body">
        <div class="st-code">
          <label class="st-code__label" for={`${detailId}-code`}>
            Error code
          </label>
          <input
            ref={codeRef}
            id={`${detailId}-code`}
            class="st-code__value st-mono"
            type="text"
            readOnly
            value={code}
            size={Math.max(code.length + 1, 12)}
            onFocus={(event) => event.currentTarget.select()}
          />
          <StateButton small onClick={onCopy}>
            Copy
          </StateButton>
          <span class="st-code__status" aria-live="polite">
            {copied === 'done' && 'Copied to clipboard.'}
            {copied === 'manual' && 'Selected. Press Ctrl+C to copy.'}
          </span>
        </div>
        <p class="st-note">Quote this code if you report the condition to the Systems Help Desk.</p>
        {open && (
          <pre class="st-trace st-mono" id={detailId} tabIndex={0} aria-label="Error details">
            {trace}
          </pre>
        )}
      </div>
      <div class="st-actions">
        {actions}
        <StateButton onClick={() => setOpen(!open)} expanded={open} controls={detailId}>
          {open ? '<< Details' : 'Details >>'}
        </StateButton>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PathNotFound                                                        */
/* ------------------------------------------------------------------ */

export interface PathNotFoundProps {
  /** The path that was requested, as typed or followed. */
  path: string;
  /** When given, an "Open Records Search" button is shown. */
  onSearch?: () => void;
  /** When given, a "Return to desktop" button is shown. */
  onHome?: () => void;
  class?: string;
}

/** In-world answer to an unknown deep link. */
export function PathNotFound({ path, onSearch, onHome, class: className }: PathNotFoundProps): JSX.Element {
  const heading = 'The address does not correspond to a record or view';
  return (
    <section class={cx('st st-panel st-path', className)} role="group" aria-label={heading}>
      <div class="st-head">
        <StateGlyph id="path" />
        <div class="st-head__text">
          <h2 class="st-title">{heading}</h2>
          <p class="st-lead">
            MERIDIAN could not resolve the requested address. Nothing is registered at this location in
            the workstation namespace.
          </p>
        </div>
      </div>
      <div class="st-body">
        <Fields
          caption="Address resolution particulars"
          rows={[
            { label: 'Requested address', value: <span class="st-break">{path}</span>, mono: true },
            { label: 'Result', value: 'No record, application or view is registered at this address' },
            { label: 'Condition', value: 'MERIDIAN-0x0194', mono: true },
          ]}
        />
        <p class="st-note">
          An address that was valid may cease to resolve when a record is renumbered, superseded or
          withdrawn from the index. This response is given for every unregistered address and does
          not indicate whether a record of that description is held.
        </p>
        <p class="st-note">Check the document number against the citing record, or locate the record by search.</p>
      </div>
      {(onSearch || onHome) && (
        <div class="st-actions">
          {onSearch && (
            <StateButton primary onClick={onSearch}>
              Open Records Search
            </StateButton>
          )}
          {onHome && <StateButton onClick={onHome}>Return to desktop</StateButton>}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Redaction                                                           */
/* ------------------------------------------------------------------ */

export type RedactionBarStyle = 'inline' | 'field' | 'sentence';

export interface RedactionBarProps {
  /** Length of the withheld text in characters. The text itself is never passed. */
  chars: number;
  authority?: string;
  reference?: string;
  /**
   * inline: one unbroken bar (a word, a name, a number).
   * field: one bar filling the available cell or field width; `chars` is ignored for width.
   * sentence: a run of bars that can wrap across lines like the text it replaces.
   */
  variant?: RedactionBarStyle;
  class?: string;
}

function redactionLabel(authority?: string, reference?: string): string {
  const parts = ['Withheld'];
  if (authority) parts.push(`Authority: ${authority}`);
  if (reference) parts.push(`Reference: ${reference}`);
  return parts.join('. ') + '.';
}

/** Splits a long run into word-length pieces so the bar wraps with the paragraph. */
function sentencePieces(chars: number, seed: number): number[] {
  const next = prng(seed);
  const pieces: number[] = [];
  let left = Math.max(1, Math.round(chars));
  while (left > 0) {
    const want = 3 + Math.floor(next() * 9);
    const take = left - want < 3 ? left : want;
    pieces.push(take);
    left -= take;
  }
  return pieces;
}

/**
 * Black bar standing in for withheld text, sized by character count in the
 * current font (1ch per character, scaled by --rx-ch-scale for proportional
 * faces). Carries the same class and data attributes as the pipeline's
 * `<span class="rx" data-len data-auth data-ref>` so one stylesheet serves both.
 */
export function RedactionBar({
  chars,
  authority,
  reference,
  variant = 'inline',
  class: className,
}: RedactionBarProps): JSX.Element {
  const len = Math.max(1, Math.round(chars));
  const label = redactionLabel(authority, reference);
  const common = {
    role: 'img',
    'aria-label': label,
    title: label,
    'data-len': len,
    'data-auth': authority,
    'data-ref': reference,
  } as const;

  if (variant === 'sentence' && len > 14) {
    const pieces = sentencePieces(len, hash32(`${reference ?? ''}:${len}`));
    return (
      <span class={cx('rx st-rx st-rx--sentence', className)} {...common}>
        {pieces.map((piece, i) => (
          <Fragment key={i}>
            {i > 0 && <wbr />}
            <span class="st-rx__piece" style={{ '--rx-len': piece }} />
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <span
      class={cx('rx st-rx', variant === 'field' && 'st-rx--field', className)}
      style={{ '--rx-len': len }}
      {...common}
    />
  );
}

export interface WithheldBlockProps {
  authority: string;
  reference: string;
  /** Number of text lines the withheld section occupied. */
  lines: number;
  /** Optional heading of the withheld section, if the heading itself is releasable. */
  label?: string;
  class?: string;
}

interface WithheldLine {
  /** Bar widths as shares of the line. */
  bars: number[];
  /** Portion of the measure the line fills, in percent. */
  fill: number;
  /** True for the first line of a paragraph (indented). */
  indent: boolean;
}

/** Deterministic line plan: same authority, reference and line count give the same bars. */
export function withheldLines(seedText: string, lines: number): WithheldLine[] {
  const next = prng(hash32(seedText));
  const count = Math.max(1, Math.min(200, Math.round(lines)));
  const out: WithheldLine[] = [];
  let untilBreak = 3 + Math.floor(next() * 4);
  let indent = true;
  for (let i = 0; i < count; i++) {
    const last = i === count - 1;
    const paragraphEnd = last || untilBreak === 0;
    const barCount = paragraphEnd ? 1 + Math.floor(next() * 3) : 3 + Math.floor(next() * 4);
    const bars: number[] = [];
    for (let b = 0; b < barCount; b++) bars.push(2 + Math.floor(next() * 11));
    out.push({
      bars,
      fill: paragraphEnd ? 28 + Math.floor(next() * 45) : 94 + Math.floor(next() * 7),
      indent,
    });
    indent = paragraphEnd;
    untilBreak = paragraphEnd ? 3 + Math.floor(next() * 4) : untilBreak - 1;
  }
  return out;
}

/**
 * Full-block redaction: a section withheld in its entirety. Bars follow the
 * measure of the surrounding column and are the same on every render.
 */
export function WithheldBlock({
  authority,
  reference,
  lines,
  label,
  class: className,
}: WithheldBlockProps): JSX.Element {
  const plan = withheldLines(`${authority}|${reference}|${lines}`, lines);
  const summary = `Section withheld in full. Authority: ${authority}. Reference: ${reference}.`;
  return (
    <div class={cx('st st-withheld', className)} role="group" aria-label={summary} title={redactionLabel(authority, reference)}>
      {label && <div class="st-withheld__label">{label}</div>}
      <div class="st-withheld__lines" aria-hidden="true">
        {plan.map((line, i) => (
          <div
            key={i}
            class={cx('st-withheld__line', line.indent && 'st-withheld__line--indent')}
            style={{ '--wl-fill': `${line.fill}%` }}
          >
            {line.bars.map((weight, b) => (
              <span key={b} class="st-withheld__bar" style={{ flexGrow: weight }} />
            ))}
          </div>
        ))}
      </div>
      <div class="st-withheld__foot">
        <span>Withheld in full</span>
        <span>
          Authority <span class="st-mono">{authority}</span>
        </span>
        <span>
          Reference <span class="st-mono">{reference}</span>
        </span>
      </div>
    </div>
  );
}
