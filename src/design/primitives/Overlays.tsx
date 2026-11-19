import type { ComponentChildren, TargetedKeyboardEvent } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import './primitives.css';
import { cx } from '../util';
import { Button } from './Button';

/* ---------------- Tooltip ---------------- */

export interface TooltipProps {
  text: string;
  children: ComponentChildren;
  placement?: 'below' | 'above';
  /** Delay in ms before showing on hover. Focus shows immediately. Default 500. */
  delay?: number;
}

/** Classic hover/focus tooltip. The wrapped content is described by the tip text. */
export function Tooltip({ text, children, placement = 'below', delay = 500 }: TooltipProps) {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();
  const show = (now: boolean) => {
    window.clearTimeout(timer.current);
    if (now) setShown(true);
    else timer.current = window.setTimeout(() => setShown(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setShown(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <span
      class="tip-host"
      aria-describedby={id}
      onPointerEnter={() => show(false)}
      onPointerLeave={hide}
      onFocusIn={() => show(true)}
      onFocusOut={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape') hide();
      }}
    >
      {children}
      <span id={id} role="tooltip" class={cx('tip', placement === 'above' && 'tip--above')} hidden={!shown}>
        {text}
      </span>
    </span>
  );
}

/* ---------------- Dialog / MessageBox ---------------- */

export type DialogKind = 'info' | 'warning' | 'error' | 'question';

export interface DialogButton {
  label: string; // "&Retry"
  value: string;
  /** Activated by Enter. */
  isDefault?: boolean;
  /** Activated by Esc / closing. */
  isCancel?: boolean;
}

export interface DialogProps {
  open: boolean;
  title: string;
  kind?: DialogKind;
  /** 32px icon (from @graphics/icons); a lettered fallback glyph is drawn if omitted. */
  icon?: ComponentChildren;
  children: ComponentChildren;
  /** Optional reference line under the message, e.g. "Ref DIR-0412 · Code RD-104". */
  reference?: string;
  buttons?: DialogButton[];
  onClose: (value: string) => void;
  /** Called once when the dialog opens. The shell wires this to sound.play('error') for error dialogs. */
  onOpen?: (kind: DialogKind) => void;
  /** 'window' (default) covers the nearest positioned ancestor; 'screen' covers the viewport. */
  scope?: 'window' | 'screen';
}

const GLYPH: Record<DialogKind, string> = { info: 'i', warning: '!', error: 'X', question: '?' };

/** Fallback message-box glyph. */
export function DialogGlyph({ kind }: { kind: DialogKind }) {
  return (
    <span class={cx('dlg-glyph', `dlg-glyph--${kind}`)} aria-hidden="true">
      {GLYPH[kind]}
    </span>
  );
}

/**
 * Modal message box inside a window. Focus is trapped while open and returned on close.
 * Enter = default button, Esc = cancel button.
 */
export function Dialog({
  open,
  title,
  kind = 'info',
  icon,
  children,
  reference,
  buttons = [{ label: 'OK', value: 'ok', isDefault: true, isCancel: true }],
  onClose,
  onOpen,
  scope = 'window',
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const prevFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    onOpen?.(kind);
    const def = ref.current?.querySelector<HTMLElement>('[data-default="true"]') ?? ref.current?.querySelector<HTMLElement>('button');
    def?.focus();
    return () => {
      const p = prevFocus.current;
      if (p instanceof HTMLElement && p.isConnected) p.focus();
    };
  }, [open]);

  if (!open) return null;

  const cancel = buttons.find((b) => b.isCancel) ?? buttons[buttons.length - 1];
  const dflt = buttons.find((b) => b.isDefault) ?? buttons[0];

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && cancel) {
      e.preventDefault();
      e.stopPropagation();
      onClose(cancel.value);
    } else if (e.key === 'Enter' && dflt && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      onClose(dflt.value);
    } else if (e.key === 'Tab') {
      const focusables = Array.from(ref.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex="0"]') ?? []);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  return (
    <div class={cx('dlg-scrim', scope === 'screen' && 'dlg-scrim--fixed')} onPointerDown={(e) => e.stopPropagation()}>
      <div
        ref={ref}
        class="dlg"
        role={kind === 'error' || kind === 'warning' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={onKeyDown}
      >
        <div class="dlg__title" id={titleId}>
          {title}
        </div>
        <div class="dlg__body">
          <div class="dlg__icon">{icon ?? <DialogGlyph kind={kind} />}</div>
          <div class="dlg__msg" id={bodyId}>
            <div>{children}</div>
            {reference ? <div class="dlg__ref">{reference}</div> : null}
          </div>
        </div>
        <div class="dlg__buttons">
          {buttons.map((b) => (
            <Button
              key={b.value}
              label={b.label}
              variant={b === dflt ? 'primary' : 'default'}
              data-default={b === dflt ? 'true' : undefined}
              onClick={() => onClose(b.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Convenience: single-message box with OK. */
export function MessageBox(props: Omit<DialogProps, 'buttons'> & { okLabel?: string }) {
  const { okLabel = 'OK', ...rest } = props;
  return <Dialog {...rest} buttons={[{ label: okLabel, value: 'ok', isDefault: true, isCancel: true }]} />;
}
