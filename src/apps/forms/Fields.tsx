/**
 * The field grid of a form, drawn entirely from its `form:` frontmatter with the
 * @graphics/forms furniture. One FormSection per multi-field block, one ruled box per field.
 */
import type { ComponentChildren } from 'preact';
import { FieldMessage, Redaction, Button } from '@design/index';
import { CheckItem, FormBlock, FormGrid, FormSection, SignatureBlock } from '@graphics/forms';
import { isRx, rxInfo } from '@core/rx';
import type { RedactionHoverInfo } from '@design/index';
import { fieldRef, layoutSpans, type BlockSpec, type FieldOption, type FieldSpec, type FieldValue, type FormSpec, type Issue, type Values } from './model';

export interface DirectoryEntry {
  pn: string;
  name: string;
  role: string;
  site: string;
}

export interface FieldGridProps {
  spec: FormSpec;
  values: Values;
  /** Issues to display, by field name. */
  issues: Map<string, Issue[]>;
  readOnly: boolean;
  /** DOM id prefix, unique per window. */
  idPrefix: string;
  satisfies: (key: string) => boolean;
  facilityOptions: FieldOption[];
  signer: { name: string; date: string; seed: number };
  lookupPn: (pn: string) => DirectoryEntry | undefined;
  lookupDoc: (docNo: string) => { docNo: string; title: string } | undefined;
  onChange: (name: string, v: FieldValue) => void;
  onBlur: (f: FieldSpec) => void;
  onRedactionHover: (i: RedactionHoverInfo) => void;
}

export const fieldDomId = (prefix: string, name: string) => `${prefix}-${name}`;

/** Options the operator may see: keyed options are offered only when the key is satisfied. */
export function visibleOptions(f: FieldSpec, facilityOptions: FieldOption[], satisfies: (k: string) => boolean): FieldOption[] {
  const base = f.options.length ? f.options : f.type === 'facility' ? facilityOptions : [];
  return base.filter((o) => !o.key || satisfies(o.key));
}

const stripParen = (s: string) => s.replace(/\s*\(.*\)\s*$/, '');

function RxText({ text, onHover }: { text: string; onHover: (i: RedactionHoverInfo) => void }) {
  const rx = rxInfo(text);
  if (rx) return <Redaction len={rx.len} auth="PV" reference={`Directory ${rx.key}`} onHover={onHover} />;
  return <>{text}</>;
}

export function FieldGrid(p: FieldGridProps) {
  return (
    <FormGrid cols={12}>
      {p.spec.blocks.map((b) => (
        <BlockView key={b.n} block={b} {...p} />
      ))}
    </FormGrid>
  );
}

function BlockView(p: FieldGridProps & { block: BlockSpec }) {
  const { block } = p;
  if (block.fields.length === 1) {
    const f = block.fields[0]!;
    return <FieldBox {...p} f={f} refNo={block.n} label={block.label} hint={f.label !== block.label ? stripParen(f.label) : undefined} span={12} />;
  }
  const spans = layoutSpans(block.fields);
  return (
    <>
      <FormSection part={`BLOCK ${block.n}`} title={block.label} note={block.note} />
      {block.fields.map((f, i) => (
        <FieldBox key={f.name} {...p} f={f} refNo={fieldRef(block, i)} label={f.label} span={spans[i]!} />
      ))}
    </>
  );
}

interface BoxProps extends FieldGridProps {
  f: FieldSpec;
  refNo: string;
  label: string;
  hint?: string;
  span: number;
}

function FieldBox(p: BoxProps) {
  const { f, refNo } = p;
  const id = fieldDomId(p.idPrefix, f.name);
  const own = p.issues.get(f.name) ?? [];
  const errId = `${id}-msg`;
  const helpId = `${id}-help`;
  const invalid = own.some((i) => i.level === 'error');
  const described = [f.help ? helpId : null, own.length ? errId : null].filter(Boolean).join(' ') || undefined;
  const req = f.required ? ' *' : '';
  const aria = {
    id,
    'aria-label': `${refNo}. ${p.label}${f.required ? ', required' : ''}`,
    'aria-invalid': invalid ? ('true' as const) : undefined,
    'aria-required': f.required ? ('true' as const) : undefined,
    'aria-describedby': described,
    disabled: p.readOnly,
  };
  const value = p.values[f.name];
  const str = typeof value === 'string' ? value : '';
  const set = (v: FieldValue) => p.onChange(f.name, v);
  const blur = () => p.onBlur(f);

  let control: ComponentChildren;
  let boxLabel = `${p.label}${req}`;
  let flush = false;
  let extra: ComponentChildren = null;

  switch (f.type) {
    case 'textarea':
      control = <textarea {...aria} rows={3} value={str} maxLength={f.maxLength} onInput={(e) => set(e.currentTarget.value)} onBlur={blur} />;
      break;
    case 'select':
    case 'facility': {
      const opts = visibleOptions(f, p.facilityOptions, p.satisfies);
      control = (
        <select {...aria} value={str} onChange={(e) => set(e.currentTarget.value)} onBlur={blur}>
          <option value="">(select)</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    case 'radio': {
      const opts = visibleOptions(f, p.facilityOptions, p.satisfies);
      control = (
        <div class="fx-radios" role="radiogroup" aria-label={aria['aria-label']} aria-invalid={aria['aria-invalid']} aria-describedby={described} id={id} tabIndex={-1}>
          {opts.map((o) => (
            <label key={o.value} class="fx-radio">
              <input type="radio" name={id} value={o.value} checked={str === o.value} disabled={p.readOnly} onChange={() => set(o.value)} onBlur={blur} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'checkbox': {
      if (f.multi) {
        const arr = Array.isArray(value) ? value : [];
        const opts = visibleOptions(f, p.facilityOptions, p.satisfies);
        control = (
          <div class="fx-checks" role="group" aria-label={aria['aria-label']} aria-describedby={described} id={id} tabIndex={-1}>
            {opts.map((o) => (
              <CheckItem
                key={o.value}
                checked={arr.includes(o.value)}
                label={o.label}
                disabled={p.readOnly}
                onChange={(on) => set(on ? [...arr, o.value] : arr.filter((x) => x !== o.value))}
              />
            ))}
          </div>
        );
      } else {
        boxLabel = p.hint ? `${p.label}${req}` : '';
        control = (
          <div class="fx-single" id={id} tabIndex={-1} aria-describedby={described}>
            <CheckItem checked={str === 'YES'} label={`${p.hint ?? p.label}${req}`} disabled={p.readOnly} onChange={(on) => set(on ? 'YES' : '')} />
          </div>
        );
      }
      break;
    }
    case 'signature': {
      flush = true;
      const signed = str !== '';
      control = (
        <div class="fx-sig" id={id} tabIndex={-1} aria-describedby={described}>
          <SignatureBlock label={`${stripParen(f.label).toUpperCase()}${req}`} name={p.signer.name} signed={signed} date={p.signer.date} seed={p.signer.seed} />
          {!p.readOnly && (
            <div class="fx-sig__ctl">
              <Button size="small" label={signed ? '&Withdraw signature' : 'Apply &signature from token'} onClick={() => set(signed ? '' : p.signer.name)} />
              <span class="fx-sig__note">Applied by the workstation from the token in reader 0. Certifies the entries above.</span>
            </div>
          )}
        </div>
      );
      break;
    }
    default: {
      const mono = f.type === 'pn' || f.type === 'docno' || f.type === 'date' || f.type === 'time' || f.type === 'number';
      const inputMode = f.type === 'number' ? 'decimal' : f.type === 'time' ? 'numeric' : undefined;
      const maxLength = f.type === 'date' ? 11 : f.type === 'time' ? 5 : f.type === 'pn' ? 11 : f.maxLength;
      control = (
        <input
          {...aria}
          type="text"
          class={mono ? 'fx-mono' : undefined}
          value={str}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete="off"
          spellcheck={false}
          onInput={(e) => set(f.type === 'pn' || f.type === 'docno' ? e.currentTarget.value.toUpperCase() : e.currentTarget.value)}
          onBlur={blur}
        />
      );
      if (f.type === 'date') extra = <span class="fx-fmt">DD MMM YYYY</span>;
      if (f.type === 'time') extra = <span class="fx-fmt">HHMM, 24-hour</span>;
      if (f.type === 'pn' && str) {
        const d = p.lookupPn(str.trim());
        if (d) {
          extra = (
            <span class="fx-lookup">
              Directory: <RxText text={d.name} onHover={p.onRedactionHover} />
              {', '}
              {isRx(d.role) ? <RxText text={d.role} onHover={p.onRedactionHover} /> : d.role}
              {', '}
              {d.site}
            </span>
          );
        }
      }
      if ((f.type === 'docno' || /document/i.test(f.name)) && str) {
        const toks = (str.toUpperCase().match(/[A-Z0-9]+(?:[-/.][A-Z0-9]+)+/g) ?? []).map(p.lookupDoc).filter((x): x is { docNo: string; title: string } => !!x);
        if (toks.length) extra = <span class="fx-lookup">Index: {toks.map((t) => `${t.docNo}, ${t.title}`).join('; ')}</span>;
      }
      break;
    }
  }

  return (
    <FormBlock n={refNo} label={boxLabel} span={p.span} flush={flush} class={invalid ? 'fx-invalid' : undefined}>
      {control}
      {extra}
      {f.help ? (
        <div class="fx-help" id={helpId}>
          {f.help}
        </div>
      ) : null}
      {own.length ? (
        <div id={errId}>
          {own.map((i, k) => (
            <FieldMessage key={k} kind={i.level === 'error' ? 'error' : 'notice'} live={false}>
              {i.message}
            </FieldMessage>
          ))}
        </div>
      ) : null}
    </FormBlock>
  );
}
