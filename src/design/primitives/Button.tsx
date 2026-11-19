import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';
import './primitives.css';
import { cx, parseMnemonic } from '../util';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'label' | 'type'> {
  /** "default" grey push button; "primary" carries the heavy default-button frame. */
  variant?: 'default' | 'primary';
  size?: 'normal' | 'small' | 'icon';
  /** Toggle buttons: sets aria-pressed and the pushed-in look. */
  pressed?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Text label; "&" marks the mnemonic letter ("&Print" underlines P). Use children for custom content. */
  label?: string;
  children?: ComponentChildren;
}

/** Render a label with its mnemonic letter underlined. */
export function Mnemonic({ label }: { label: string }) {
  const { text, index } = parseMnemonic(label);
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span class="mn">{text.charAt(index)}</span>
      {text.slice(index + 1)}
    </>
  );
}

export function Button({
  variant = 'default',
  size = 'normal',
  pressed,
  disabled,
  type = 'button',
  label,
  children,
  class: klass,
  className,
  ...rest
}: ButtonProps) {
  const mn = label ? parseMnemonic(label).mnemonic : null;
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-pressed={pressed === undefined ? undefined : pressed}
      accessKey={mn ?? undefined}
      class={cx(
        'btn',
        variant === 'primary' && 'btn--primary',
        size === 'small' && 'btn--small',
        size === 'icon' && 'btn--icon',
        (klass as string) || (className as string),
      )}
    >
      {label ? (
        <span>
          <Mnemonic label={label} />
        </span>
      ) : null}
      {children}
    </button>
  );
}

/** Right-aligned row of dialog/form buttons. */
export function ButtonRow({ children, align = 'right' }: { children: ComponentChildren; align?: 'left' | 'right' }) {
  return <div class={cx('btn-row', align === 'left' && 'btn-row--left')}>{children}</div>;
}
