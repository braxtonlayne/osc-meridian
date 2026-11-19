import type { ComponentChildren, HTMLAttributes, TargetedKeyboardEvent, TargetedPointerEvent } from 'preact';
import { useId, useRef } from 'preact/hooks';
import './primitives.css';
import { cx, useControllable } from '../util';
import { Mnemonic } from './Button';

export interface TabDef {
  id: string;
  /** "&General" */
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabDef[];
  active?: string;
  defaultActive?: string;
  onChange?: (id: string) => void;
  /** Accessible name of the tab list. */
  label: string;
  /** Content of the active panel. Render only the active tab's content. */
  children: ComponentChildren;
  /** Panel look: 'chrome' (grey dialog page), 'surface' (white) or 'flush' (no padding). */
  panel?: 'chrome' | 'surface' | 'flush';
}

/** Classic notebook tabs. Left/Right/Home/End move and activate (automatic activation). */
export function Tabs({ tabs, active, defaultActive, onChange, label, children, panel = 'chrome' }: TabsProps) {
  const [cur, setCur] = useControllable<string>(active, defaultActive ?? tabs[0]?.id ?? '', onChange);
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const enabled = tabs.filter((t) => !t.disabled);

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    const i = enabled.findIndex((t) => t.id === cur);
    let next: TabDef | undefined;
    if (e.key === 'ArrowRight') next = enabled[(i + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(i - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    setCur(next.id);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus();
  };

  return (
    <div class="tabs">
      <div ref={listRef} class="tabs__list" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            class="tabs__tab"
            data-tab={t.id}
            id={`${baseId}-t-${t.id}`}
            aria-selected={t.id === cur}
            aria-controls={`${baseId}-p`}
            tabIndex={t.id === cur ? 0 : -1}
            disabled={t.disabled}
            onClick={() => setCur(t.id)}
          >
            <span>
              <Mnemonic label={t.label} />
            </span>
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-p`}
        role="tabpanel"
        aria-labelledby={`${baseId}-t-${cur}`}
        tabIndex={0}
        class={cx('tabs__panel', panel === 'surface' && 'tabs__panel--surface', panel === 'flush' && 'tabs__panel--flush')}
      >
        {children}
      </div>
    </div>
  );
}
