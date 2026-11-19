import type { ComponentChildren } from 'preact';
import { useEffect, useId, useState } from 'preact/hooks';
import './primitives.css';
import { DATE_CEILING, cx, formatOscDate, parseOscDate } from '../util';

/* ---------------- Shared ---------------- */

interface BaseFieldProps {
  label: string;
  /** In-world validation message; marks the control invalid. */
  error?: string | null;
  /** Small instruction line under the control. */
  hint?: ComponentChildren;
  required?: boolean;
  disabled?: boolean;
  /** Form block number shown before the label, e.g. "7". */
  block?: string;
  /** 'inline' = label column + control (default); 'stacked' = label above. */
  layout?: 'inline' | 'stacked';
  /** Control width as CSS length or character count (number = ch). */
  width?: number | string;
  name?: string;
  id?: string;
}

function widthVar(w: number | string | undefined) {
  if (w === undefined) return undefined;
  return { ['--f-width' as string]: typeof w === 'number' ? `${w + 2}ch` : w };
}

export interface FieldMessageProps {
  kind?: 'error' | 'notice';
  id?: string;
  children: ComponentChildren;
}

/** In-world validation line: a status word ("REJECTED" / "NOTE") followed by the reason. */
export function FieldMessage({ kind = 'error', id, children }: FieldMessageProps) {
  return (
    <div id={id} class={cx('f-msg', kind === 'notice' && 'f-msg--notice')} role={kind === 'error' ? 'alert' : undefined}>
      <span class="f-msg__word">{kind === 'error' ? 'REJECTED' : 'NOTE'}</span>
      <span>{children}</span>
    </div>
  );
}

function Row({
  p,
  id,
  children,
  describedBy,
}: {
  p: BaseFieldProps;
  id: string;
  children: ComponentChildren;
  describedBy: { hint: string; err: string };
}) {
  return (
    <div class={cx('f-row', p.layout === 'stacked' && 'f-row--stacked')} style={widthVar(p.width)}>
      <label class="f-label" for={id}>
        {p.block ? <span class="fieldset__no">{p.block}.</span> : null}
        {p.label}
        {p.required ? (
          <span class="f-req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div class="f-ctl">
        {children}
        {p.hint ? (
          <div class="f-hint" id={describedBy.hint}>
            {p.hint}
          </div>
        ) : null}
        {p.error ? <FieldMessage id={describedBy.err}>{p.error}</FieldMessage> : null}
      </div>
    </div>
  );
}

function useFieldIds(p: BaseFieldProps) {
  const auto = useId();
  const id = p.id ?? `f${auto}`;
  const ids = { hint: `${id}-hint`, err: `${id}-err` };
  const describedBy = [p.hint ? ids.hint : null, p.error ? ids.err : null].filter(Boolean).join(' ') || undefined;
  return { id, ids, describedBy };
}

/* ---------------- TextField ---------------- */

export interface TextFieldProps extends BaseFieldProps {
  value: string;
  onInput: (value: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'password' | 'search' | 'tel' | 'number';
  /** Plex Mono for IDs and codes. */
  mono?: boolean;
  /** Force uppercase entry (document numbers, call signs). */
  upper?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search';
}

export function TextField(p: TextFieldProps) {
  const { id, ids, describedBy } = useFieldIds(p);
  return (
    <Row p={p} id={id} describedBy={ids}>
      <input
        id={id}
        name={p.name}
        class={cx('f-input', p.mono && 'f-input--mono')}
        type={(p.type ?? 'text') as 'text'}
        value={p.value}
        disabled={p.disabled}
        readOnly={p.readOnly}
        required={p.required}
        maxLength={p.maxLength}
        autoComplete={p.autoComplete ?? 'off'}
        spellcheck={false}
        inputMode={p.inputMode}
        aria-invalid={p.error ? 'true' : undefined}
        aria-required={p.required ? 'true' : undefined}
        aria-describedby={describedBy}
        style={p.upper ? { textTransform: 'uppercase' } : undefined}
        onInput={(e) => {
          const v = e.currentTarget.value;
          p.onInput(p.upper ? v.toUpperCase() : v);
        }}
        onBlur={p.onBlur}
      />
    </Row>
  );
}

/* ---------------- TextArea ---------------- */

export interface TextAreaProps extends BaseFieldProps {
  value: string;
  onInput: (value: string) => void;
  rows?: number;
  maxLength?: number;
  /** Show "n of max characters" under the box. */
  showCount?: boolean;
  typed?: boolean;
}

export function TextArea(p: TextAreaProps) {
  const { id, ids, describedBy } = useFieldIds(p);
  return (
    <Row p={p} id={id} describedBy={ids}>
      <textarea
        id={id}
        name={p.name}
        class={cx('f-textarea', p.typed && 'f-input--mono')}
        rows={p.rows ?? 4}
        value={p.value}
        disabled={p.disabled}
        required={p.required}
        maxLength={p.maxLength}
        aria-invalid={p.error ? 'true' : undefined}
        aria-required={p.required ? 'true' : undefined}
        aria-describedby={describedBy}
        onInput={(e) => p.onInput(e.currentTarget.value)}
      />
      {p.showCount && p.maxLength ? (
        <div class="f-hint u-mono">
          {p.value.length} of {p.maxLength} characters
        </div>
      ) : null}
    </Row>
  );
}

/* ---------------- Select ---------------- */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends BaseFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** First, unselectable line, e.g. "(select one)". */
  emptyLabel?: string;
}

export function Select(p: SelectProps) {
  const { id, ids, describedBy } = useFieldIds(p);
  return (
    <Row p={p} id={id} describedBy={ids}>
      <span class="f-select-wrap">
        <select
          id={id}
          name={p.name}
          class="f-select"
          value={p.value}
          disabled={p.disabled}
          required={p.required}
          aria-invalid={p.error ? 'true' : undefined}
          aria-required={p.required ? 'true' : undefined}
          aria-describedby={describedBy}
          onChange={(e) => p.onChange(e.currentTarget.value)}
        >
          {p.emptyLabel !== undefined ? (
            <option value="" disabled={p.required}>
              {p.emptyLabel}
            </option>
          ) : null}
          {p.options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </Row>
  );
}

/* ---------------- Checkbox / Radio ---------------- */

export interface CheckboxProps {
  label: ComponentChildren;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string | null;
  name?: string;
  id?: string;
  /** Put the box in the control column of a FieldGroup (aligns under other controls). */
  aligned?: boolean;
}

export function Checkbox(p: CheckboxProps) {
  const auto = useId();
  const id = p.id ?? `c${auto}`;
  const box = (
    <label class="f-check" for={id}>
      <input
        id={id}
        type="checkbox"
        name={p.name}
        checked={p.checked}
        disabled={p.disabled}
        aria-invalid={p.error ? 'true' : undefined}
        aria-describedby={p.error ? `${id}-err` : undefined}
        onChange={(e) => p.onChange(e.currentTarget.checked)}
      />
      <span>{p.label}</span>
    </label>
  );
  if (!p.aligned && !p.error) return box;
  return (
    <div class={cx('f-row', !p.aligned && 'f-row--stacked')}>
      {p.aligned ? <span /> : null}
      <div class="f-ctl">
        {box}
        {p.error ? <FieldMessage id={`${id}-err`}>{p.error}</FieldMessage> : null}
      </div>
    </div>
  );
}

export interface RadioProps {
  label: ComponentChildren;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function Radio(p: RadioProps) {
  const auto = useId();
  const id = `r${auto}`;
  return (
    <label class="f-check" for={id}>
      <input
        id={id}
        type="radio"
        name={p.name}
        value={p.value}
        checked={p.checked}
        disabled={p.disabled}
        onChange={() => p.onChange(p.value)}
      />
      <span>{p.label}</span>
    </label>
  );
}

export interface RadioGroupProps {
  legend: string;
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  inline?: boolean;
  error?: string | null;
  required?: boolean;
  block?: string;
}

/** Radio set in a fieldset with legend; native arrow-key behaviour. */
export function RadioGroup(p: RadioGroupProps) {
  const auto = useId();
  return (
    <div
      class="f-row"
      role="radiogroup"
      aria-labelledby={`rg${auto}-l`}
      aria-required={p.required ? 'true' : undefined}
      aria-invalid={p.error ? 'true' : undefined}
      aria-describedby={p.error ? `rg${auto}-err` : undefined}
    >
      <span class="f-label" id={`rg${auto}-l`}>
        {p.block ? <span class="fieldset__no">{p.block}.</span> : null}
        {p.legend}
        {p.required ? (
          <span class="f-req" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      <div class="f-ctl">
        <div class={cx('f-radios', p.inline && 'f-radios--inline')}>
          {p.options.map((o) => (
            <Radio
              key={o.value}
              name={p.name}
              value={o.value}
              label={o.label}
              disabled={o.disabled}
              checked={p.value === o.value}
              onChange={p.onChange}
            />
          ))}
        </div>
        {p.error ? <FieldMessage id={`rg${auto}-err`}>{p.error}</FieldMessage> : null}
      </div>
    </div>
  );
}

/* ---------------- DateField ---------------- */

export interface DateFieldProps extends BaseFieldProps {
  /** ISO date ("2008-05-12") or "" when empty. */
  value: string;
  /** Called on blur/Enter with the parsed ISO date, or null when the entry is empty or unreadable. */
  onChange: (iso: string | null, raw: string) => void;
  /** Latest acceptable date (ISO). Defaults to the in-world ceiling, 31 MAY 2008. */
  max?: string;
  min?: string;
}

/**
 * Date entry in the house format "12 MAY 2008". Accepts 12MAY08, 12 May 2008 or ISO and
 * normalises on blur. Produces its own in-world message for unreadable or out-of-range
 * entries unless an `error` is supplied.
 */
export function DateField(p: DateFieldProps) {
  const { id, ids, describedBy } = useFieldIds(p);
  const [raw, setRaw] = useState(formatOscDate(p.value));
  const [own, setOwn] = useState<string | null>(null);
  const max = p.max ?? DATE_CEILING;
  useEffect(() => {
    setRaw(formatOscDate(p.value));
  }, [p.value]);

  const commit = () => {
    const s = raw.trim();
    if (!s) {
      setOwn(null);
      p.onChange(null, raw);
      return;
    }
    const iso = parseOscDate(s);
    if (!iso) {
      setOwn('Date not recognised. Enter as DD MMM YYYY, for example 12 MAY 2008.');
      p.onChange(null, raw);
      return;
    }
    if (iso > max) {
      setOwn(`Date may not be later than ${formatOscDate(max)}.`);
      p.onChange(null, raw);
      return;
    }
    if (p.min && iso < p.min) {
      setOwn(`Date may not be earlier than ${formatOscDate(p.min)}.`);
      p.onChange(null, raw);
      return;
    }
    setOwn(null);
    setRaw(formatOscDate(iso));
    p.onChange(iso, raw);
  };

  const error = p.error ?? own;
  const pp = { ...p, error };
  const desc = [p.hint ? ids.hint : null, error ? ids.err : null].filter(Boolean).join(' ') || describedBy;
  return (
    <Row p={pp} id={id} describedBy={ids}>
      <span class="f-date">
        <input
          id={id}
          name={p.name}
          class="f-input f-input--mono f-input--date"
          value={raw}
          disabled={p.disabled}
          required={p.required}
          maxLength={11}
          autoComplete="off"
          spellcheck={false}
          aria-invalid={error ? 'true' : undefined}
          aria-required={p.required ? 'true' : undefined}
          aria-describedby={desc}
          onInput={(e) => setRaw(e.currentTarget.value.toUpperCase())}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
        />
        <span class="f-date__fmt" aria-hidden="true">
          DD MMM YYYY
        </span>
      </span>
    </Row>
  );
}

/* ---------------- FieldGroup / Fieldset ---------------- */

export interface FieldGroupProps {
  children: ComponentChildren;
  /** Width of the label column (CSS length). */
  labelWidth?: string;
  /** Lay fields out in N columns. */
  columns?: number;
}

/** Vertical run of fields sharing one label column width. */
export function FieldGroup({ children, labelWidth, columns }: FieldGroupProps) {
  const style: Record<string, string> = {};
  if (labelWidth) style['--f-label-w'] = labelWidth;
  if (columns) style['--f-cols'] = String(columns);
  return (
    <div class={cx('f-group', columns && columns > 1 && 'f-group--cols')} style={style}>
      {children}
    </div>
  );
}

export interface FieldsetProps {
  legend: string;
  /** Section number on paper forms, e.g. "II". */
  no?: string;
  children: ComponentChildren;
  disabled?: boolean;
}

/** Etched fieldset with legend, for sections of a form. */
export function Fieldset({ legend, no, children, disabled }: FieldsetProps) {
  return (
    <fieldset class="fieldset" disabled={disabled}>
      <legend>
        {no ? <span class="fieldset__no">{no}.</span> : null}
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
