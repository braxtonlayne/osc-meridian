/**
 * @graphics/forms — form furniture for the Forms app (asset family 14).
 *
 * Everything here is drawn in code: SVG for the marks, the signature and the
 * barcode; ruled HTML/CSS for the form skeleton. Colours and fonts come from
 * design tokens only (see the alias block at the top of forms.css).
 */
import type { ComponentChildren } from 'preact';
import { layoutCode39, sanitizeCode39, code39CheckChar } from './code39';
import { generateSignature } from './signature';
import './forms.css';

export {
  CODE39_CHARSET,
  CODE39_PATTERNS,
  code39CheckChar,
  decodeCode39,
  encodeCode39,
  layoutCode39,
  sanitizeCode39,
} from './code39';
export type { Code39Element, Code39Layout, Code39Rect } from './code39';
export { generateSignature } from './signature';
export type { SignatureGeometry, SignatureOptions } from './signature';

const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */

export type CheckboxMarkStyle = 'x' | 'check' | 'filled';

export interface CheckboxMarkProps {
  checked: boolean;
  /** How a marked box is drawn. Default 'x'. */
  style?: CheckboxMarkStyle;
  /** Pixel size. Drawn on a 12-unit grid; 12 is pixel-exact. */
  size?: number;
  class?: string;
}

/** A printed form box, empty or marked. Decorative: pair it with visible text. */
export function CheckboxMark({ checked, style = 'x', size = 12, class: className }: CheckboxMarkProps) {
  return (
    <svg
      class={cx('oscf oscf-check', className)}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
      data-checked={checked ? 'true' : 'false'}
      data-mark={style}
    >
      <rect class="oscf-check__box" x="0.5" y="0.5" width="11" height="11" shape-rendering="crispEdges" />
      {checked && style === 'x' && <path class="oscf-check__stroke" d="M3 3L9 9M9 3L3 9" />}
      {checked && style === 'check' && <path class="oscf-check__stroke" d="M2.6 6.4L5 8.8L9.6 3" />}
      {checked && style === 'filled' && (
        <rect class="oscf-check__fill" x="3" y="3" width="6" height="6" shape-rendering="crispEdges" />
      )}
    </svg>
  );
}

export interface CheckItemProps {
  checked: boolean;
  label: ComponentChildren;
  style?: CheckboxMarkStyle;
  /** When given, the item is a working checkbox (native input, keyboard operable). */
  onChange?: (checked: boolean) => void;
  name?: string;
  disabled?: boolean;
}

/** A checkbox with its caption, as printed on a form. Interactive when `onChange` is passed. */
export function CheckItem({ checked, label, style = 'x', onChange, name, disabled }: CheckItemProps) {
  if (!onChange) {
    return (
      <span class="oscf oscf-checkitem">
        <CheckboxMark checked={checked} style={style} />
        <span class="oscf-visually-hidden">{checked ? 'Marked: ' : 'Not marked: '}</span>
        <span class="oscf-checkitem__label">{label}</span>
      </span>
    );
  }
  return (
    <label class={cx('oscf oscf-checkitem oscf-checkitem--live', disabled && 'is-disabled')}>
      <input
        class="oscf-checkitem__input"
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)}
      />
      <CheckboxMark checked={checked} style={style} />
      <span class="oscf-checkitem__label">{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Signature                                                           */
/* ------------------------------------------------------------------ */

export interface SignatureBlockProps {
  /** Corner label, e.g. "SIGNATURE OF REQUESTER". */
  label: string;
  /** Typed name printed under the line. */
  name?: string;
  signed?: boolean;
  /** Date signed, already formatted (e.g. "12 MAY 2008"). */
  date?: string;
  /** Varies the hand for the same name. */
  seed?: number;
  /** Optional block number shown before the label. */
  n?: number | string;
  class?: string;
}

const SIG_W = 190;
const SIG_H = 48;
const SIG_BASE = 0.7;

/** Ruled signature line with the typed name beneath; a generated pen signature when signed. */
export function SignatureBlock({ label, name, signed = false, date, seed = 0, n, class: className }: SignatureBlockProps) {
  const sig =
    signed && name ? generateSignature(name, seed, { width: SIG_W, height: SIG_H, baselineAt: SIG_BASE }) : null;
  return (
    <div class={cx('oscf oscf-sig', signed && 'is-signed', className)}>
      <div class="oscf-sig__sign">
        <div class="oscf-label">
          {n !== undefined && <span class="oscf-label__n">{n}.</span>}
          {label}
        </div>
        <div class="oscf-sig__area">
          {sig && (
            <svg
              class="oscf-sig__ink"
              width={sig.width}
              height={sig.height}
              viewBox={`0 0 ${sig.width} ${sig.height}`}
              role="img"
              aria-label={`Signed: ${name ?? ''}`}
            >
              {sig.paths.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </svg>
          )}
          {!sig && <span class="oscf-visually-hidden">Not signed</span>}
        </div>
        <div class="oscf-sig__name">
          <span class="oscf-sig__caption">TYPED OR PRINTED NAME</span>
          <span class="oscf-sig__typed">{name ?? ''}</span>
        </div>
      </div>
      <div class="oscf-sig__date">
        <div class="oscf-label">DATE SIGNED</div>
        <div class="oscf-sig__datevalue">{signed ? (date ?? '') : ''}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barcode (Code 39)                                                   */
/* ------------------------------------------------------------------ */

export interface BarcodeProps {
  /** Encoded as Code 39. Lower case is raised; characters outside the set become "-". */
  value: string;
  /** Bar height in px. Default 26. */
  height?: number;
  /** Print the value beneath the bars. Default true. */
  showText?: boolean;
  /** Width of a narrow element in px. Default 1. */
  module?: number;
  /** Wide:narrow ratio, 2 to 3. Default 3 (whole pixels at module 1). */
  ratio?: number;
  /** Append the optional modulo-43 check character. */
  checkDigit?: boolean;
  class?: string;
}

/** A scannable Code 39 symbol: start/stop `*`, narrow inter-character gaps, quiet zones. */
export function Barcode({
  value,
  height = 26,
  showText = true,
  module = 1,
  ratio = 3,
  checkDigit = false,
  class: className,
}: BarcodeProps) {
  const clean = sanitizeCode39(value);
  const data = checkDigit ? clean + code39CheckChar(clean) : clean;
  const layout = layoutCode39(data, Math.min(3, Math.max(2, ratio)));
  const width = layout.width * module;
  return (
    <span class={cx('oscf oscf-barcode', className)} style={{ width: `${width}px` }}>
      <svg
        class="oscf-barcode__bars"
        width={width}
        height={height}
        viewBox={`0 0 ${layout.width} ${height}`}
        preserveAspectRatio="none"
        shape-rendering="crispEdges"
        role="img"
        aria-label={`Barcode ${clean}`}
        data-code39={data}
      >
        {layout.bars.map((b) => (
          <rect key={b.x} x={b.x} y="0" width={b.width} height={height} />
        ))}
      </svg>
      {showText && <span class="oscf-barcode__text">{clean}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Form number mark and footer                                         */
/* ------------------------------------------------------------------ */

export interface FormNumberMarkProps {
  /** e.g. "OSC FORM 114" */
  formNo: string;
  /** Revision date as printed, e.g. "03-2007" */
  edition: string;
  /** Form this one replaces, e.g. "OSC FORM 98 (REV 11-1999)" */
  supersedes?: string;
  class?: string;
}

/** Bottom-left form identification block. */
export function FormNumberMark({ formNo, edition, supersedes, class: className }: FormNumberMarkProps) {
  return (
    <div class={cx('oscf oscf-formno', className)}>
      <span class="oscf-formno__id">
        {formNo} (REV {edition})
      </span>
      <span class="oscf-formno__note">
        {supersedes
          ? `REPLACES ${supersedes}, WHICH IS WITHDRAWN FROM USE`
          : 'EARLIER EDITIONS ARE WITHDRAWN AND WILL NOT BE ACCEPTED'}
      </span>
    </div>
  );
}

export interface FormFooterProps extends FormNumberMarkProps {
  /** Centre text, e.g. "PAGE 1 OF 1". */
  page?: string;
  /** Barcode value for the corner; omitted when undefined. */
  barcode?: string;
}

/** Foot of a form page: form number at left, page count in the centre, barcode at right. */
export function FormFooter({ page, barcode, class: className, ...mark }: FormFooterProps) {
  return (
    <div class={cx('oscf oscf-footer', className)}>
      <FormNumberMark {...mark} />
      <span class="oscf-footer__page">{page ?? ''}</span>
      {barcode !== undefined ? <Barcode value={barcode} height={22} /> : <span />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet, header, grid, blocks                                         */
/* ------------------------------------------------------------------ */

export interface FormSheetProps {
  children: ComponentChildren;
  class?: string;
}

/** The page the form is printed on. */
export function FormSheet({ children, class: className }: FormSheetProps) {
  return <div class={cx('oscf oscf-sheet', className)}>{children}</div>;
}

/**
 * Notice printed under the title when a form supplies none of its own.
 * Original wording; it cites no directive so that it is true of every form.
 */
export const DEFAULT_PRIVACY_NOTE: ReadonlyArray<readonly [string, string]> = [
  ['BASIS', 'This form is prescribed by the office named above for the action stated in its title.'],
  [
    'USE OF ENTRIES',
    'What you enter is used to decide and record that action, and is filed by the receiving office for the period set for its file series.',
  ],
  [
    'WHO SEES IT',
    'The offices named in the routing block and any reviewer who must act on the request. No other distribution is made.',
  ],
  [
    'IF LEFT BLANK',
    'Completion is not compelled. A form missing a required block is returned to the originator without action.',
  ],
];

export interface FormHeaderProps {
  /** e.g. "OSC FORM 114" */
  formNo: string;
  title: string;
  /** Issuing office line above the title. */
  agencyLine: string;
  /**
   * Notice under the title. Omit for the standard notice; pass content to
   * replace it; pass `false` for none.
   */
  privacyNote?: ComponentChildren | false;
  /** Slot for the seal (e.g. `<Seal variant="mono" size={40} />`). */
  seal?: ComponentChildren;
  /** Small line under the title, e.g. the governing directive. */
  subtitle?: string;
}

/** Title block of a form, with the notice to the person completing it. */
export function FormHeader({ formNo, title, agencyLine, privacyNote, seal, subtitle }: FormHeaderProps) {
  return (
    <header class="oscf oscf-header">
      <div class="oscf-header__top">
        {seal !== undefined && <div class="oscf-header__seal">{seal}</div>}
        <div class="oscf-header__titles">
          <div class="oscf-header__agency">{agencyLine}</div>
          <h1 class="oscf-header__title">{title}</h1>
          {subtitle !== undefined && <div class="oscf-header__sub">{subtitle}</div>}
        </div>
        <div class="oscf-header__no">{formNo}</div>
      </div>
      {privacyNote !== false && (
        <div class="oscf-header__notice">
          <div class="oscf-header__noticehead">NOTICE TO THE PERSON COMPLETING THIS FORM</div>
          {privacyNote !== undefined && privacyNote !== null && privacyNote !== true ? (
            <p>{privacyNote}</p>
          ) : (
            <p>
              {DEFAULT_PRIVACY_NOTE.map(([head, body]) => (
                <span key={head}>
                  <b>{head}:</b> {body}{' '}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </header>
  );
}

export interface FormGridProps {
  /** Column count the blocks span across. Default 12. */
  cols?: number;
  children: ComponentChildren;
  class?: string;
}

/** Ruled grid. Children are `FormBlock`, `FormSection` and `SignatureBlock`s wrapped in blocks. */
export function FormGrid({ cols = 12, children, class: className }: FormGridProps) {
  return (
    <div
      class={cx('oscf oscf-grid', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export interface FormBlockProps {
  /** Block number as printed ("7", "12a"). Omit for an unnumbered box. */
  n?: number | string;
  /** Corner label. Rendered in capitals. */
  label: string;
  children?: ComponentChildren;
  /** Columns spanned in the parent FormGrid. Default: full width. */
  span?: number;
  /** Lower-case qualifier after the label, e.g. "(Last, First, MI)". */
  hint?: string;
  /** Minimum height in text rows (16px each) for the entry area. */
  rows?: number;
  /** Shaded "office use" block. */
  shade?: boolean;
  /** Drop the padding so a nested grid or SignatureBlock sits flush. */
  flush?: boolean;
  class?: string;
}

/** A numbered ruled box with its label in the top-left corner. */
export function FormBlock({ n, label, children, span, hint, rows, shade, flush, class: className }: FormBlockProps) {
  return (
    <div
      class={cx('oscf-block', shade && 'oscf-block--shade', flush && 'oscf-block--flush', className)}
      style={{ gridColumn: span !== undefined ? `span ${span}` : '1 / -1' }}
    >
      <div class="oscf-label">
        {n !== undefined && <span class="oscf-label__n">{n}.</span>}
        {label}
        {hint !== undefined && <span class="oscf-label__hint"> {hint}</span>}
      </div>
      <div class="oscf-block__body" style={rows !== undefined ? { minHeight: `${rows * 16}px` } : undefined}>
        {children}
      </div>
    </div>
  );
}

export interface FormSectionProps {
  /** e.g. "PART I" */
  part?: string;
  title: string;
  /** Right-aligned instruction, e.g. "To be completed by the supervisor". */
  note?: string;
}

/** Full-width shaded band that opens a part of the form. */
export function FormSection({ part, title, note }: FormSectionProps) {
  return (
    <div class="oscf-section" style={{ gridColumn: '1 / -1' }}>
      <span class="oscf-section__title">
        {part !== undefined && <span class="oscf-section__part">{part}</span>}
        {title}
      </span>
      {note !== undefined && <span class="oscf-section__note">{note}</span>}
    </div>
  );
}

export interface FormValueProps {
  children?: ComponentChildren;
  /** Courier, for forms completed on a typewriter. */
  typed?: boolean;
}

/** An entry as filled in: monospaced, upper case left to the caller. */
export function FormValue({ children, typed }: FormValueProps) {
  return <span class={cx('oscf-value', typed && 'oscf-value--typed')}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Receipt                                                             */
/* ------------------------------------------------------------------ */

export interface ReceiptSlipProps {
  /** e.g. "FR-08-004417" */
  receiptNo: string;
  /** e.g. "OSC FORM 114" */
  formNo: string;
  /** Already formatted, e.g. "12 MAY 2008 1430Z (1030 EDT)". */
  submittedAt: string;
  /** Offices the form passes through, in order. */
  routing: string[];
  /** Form title, printed beside the form number. */
  title?: string;
  /** Operator ID of the submitter. */
  submittedBy?: string;
}

/** Tear-off receipt shown once a form has been submitted. */
export function ReceiptSlip({ receiptNo, formNo, submittedAt, routing, title, submittedBy }: ReceiptSlipProps) {
  return (
    <section class="oscf oscf-receipt" aria-label={`Receipt ${receiptNo}`}>
      <div class="oscf-receipt__perf">
        <span>DETACH ALONG THIS LINE</span>
      </div>
      <div class="oscf-receipt__body">
        <div class="oscf-receipt__main">
          <div class="oscf-receipt__head">RECEIPT FOR FORM ENTERED INTO ROUTING</div>
          <dl class="oscf-receipt__facts">
            <dt>FORM</dt>
            <dd>
              {formNo}
              {title !== undefined && <span class="oscf-receipt__title"> {title}</span>}
            </dd>
            <dt>ENTERED</dt>
            <dd>{submittedAt}</dd>
            {submittedBy !== undefined && <dt>ENTERED BY</dt>}
            {submittedBy !== undefined && <dd>{submittedBy}</dd>}
          </dl>
          <table class="oscf-receipt__routing">
            <thead>
              <tr>
                <th scope="col">STEP</th>
                <th scope="col">ROUTED TO</th>
                <th scope="col">INITIALS</th>
                <th scope="col">DATE</th>
              </tr>
            </thead>
            <tbody>
              {routing.map((office, i) => (
                <tr key={`${i}-${office}`}>
                  <td>{i + 1}</td>
                  <td>{office}</td>
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="oscf-receipt__stub">
          <div class="oscf-label">RECEIPT NO.</div>
          <div class="oscf-receipt__no">{receiptNo}</div>
          <Barcode value={receiptNo} height={30} />
        </div>
      </div>
      <p class="oscf-receipt__foot">
        This slip records that the form was accepted for routing. It is not a decision on the request. Keep this
        portion and quote the receipt number in any inquiry.
      </p>
    </section>
  );
}
