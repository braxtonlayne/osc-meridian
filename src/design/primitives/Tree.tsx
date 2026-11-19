import type { ComponentChildren, TargetedKeyboardEvent } from 'preact';
import { useEffect, useId, useMemo, useRef } from 'preact/hooks';
import './primitives.css';
import { cx, scrollIntoViewWithin, useControllable } from '../util';

export interface TreeNode {
  id: string;
  label: string;
  /** Small count or code shown after the label, e.g. "(14)". */
  meta?: string;
  /** Custom 16px icon (from @graphics/icons). Defaults to a drawn folder/document glyph. */
  icon?: ComponentChildren;
  children?: TreeNode[];
  disabled?: boolean;
}

export interface TreeProps {
  nodes: TreeNode[];
  /** Accessible name, e.g. "Records folders". */
  label: string;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (node: TreeNode) => void;
  /** Enter or double-click. */
  onActivate?: (node: TreeNode) => void;
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
}

interface Flat {
  node: TreeNode;
  level: number;
  parent: string | null;
  hasKids: boolean;
}

/**
 * Folder tree. Keyboard: Up/Down move, Right expands or enters, Left collapses or goes to
 * parent, Home/End, Enter activates, * expands all siblings.
 */
export function Tree({
  nodes,
  label,
  selectedId,
  defaultSelectedId = null,
  onSelect,
  onActivate,
  expanded,
  defaultExpanded = [],
  onExpandedChange,
}: TreeProps) {
  const [sel, setSel] = useControllable<string | null>(selectedId, defaultSelectedId, (id) => {
    const f = id ? index.get(id) : undefined;
    if (f) onSelect?.(f.node);
  });
  const [open, setOpen] = useControllable<string[]>(expanded, defaultExpanded, onExpandedChange);
  const openSet = new Set(open);
  const baseId = useId();
  const rootRef = useRef<HTMLUListElement>(null);

  const index = useMemo(() => {
    const m = new Map<string, Flat>();
    const walk = (list: TreeNode[], level: number, parent: string | null) => {
      for (const n of list) {
        m.set(n.id, { node: n, level, parent, hasKids: !!n.children?.length });
        if (n.children) walk(n.children, level + 1, n.id);
      }
    };
    walk(nodes, 1, null);
    return m;
  }, [nodes]);

  const visible: Flat[] = [];
  const collect = (list: TreeNode[]) => {
    for (const n of list) {
      const f = index.get(n.id);
      if (f) visible.push(f);
      if (n.children?.length && openSet.has(n.id)) collect(n.children);
    }
  };
  collect(nodes);

  const cursorId = sel && visible.some((v) => v.node.id === sel) ? sel : (visible[0]?.node.id ?? null);
  const domId = (id: string) => `${baseId}-${id.replace(/[^A-Za-z0-9_-]/g, '_')}`;

  useEffect(() => {
    if (!cursorId) return;
    const root = rootRef.current;
    scrollIntoViewWithin(root, root?.querySelector<HTMLElement>(`#${CSS.escape(domId(cursorId))} > .tree__row`));
  }, [cursorId]);

  const toggle = (id: string, force?: boolean) => {
    const isOpen = openSet.has(id);
    const want = force ?? !isOpen;
    if (want === isOpen) return;
    setOpen(want ? [...open, id] : open.filter((x) => x !== id));
  };

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLUListElement>) => {
    if (!visible.length) return;
    const i = Math.max(0, visible.findIndex((v) => v.node.id === cursorId));
    const cur = visible[i];
    if (!cur) return;
    const go = (f: Flat | undefined) => {
      if (f) setSel(f.node.id);
    };
    switch (e.key) {
      case 'ArrowDown':
        go(visible[i + 1]);
        break;
      case 'ArrowUp':
        go(visible[i - 1]);
        break;
      case 'Home':
        go(visible[0]);
        break;
      case 'End':
        go(visible[visible.length - 1]);
        break;
      case 'ArrowRight':
        if (cur.hasKids && !openSet.has(cur.node.id)) toggle(cur.node.id, true);
        else if (cur.hasKids) go(visible[i + 1]);
        break;
      case 'ArrowLeft':
        if (cur.hasKids && openSet.has(cur.node.id)) toggle(cur.node.id, false);
        else if (cur.parent) go(index.get(cur.parent));
        break;
      case 'Enter':
        if (!cur.node.disabled) onActivate?.(cur.node);
        break;
      case '*': {
        const sibs = cur.parent ? (index.get(cur.parent)?.node.children ?? []) : nodes;
        setOpen(Array.from(new Set([...open, ...sibs.filter((s) => s.children?.length).map((s) => s.id)])));
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  };

  const renderList = (list: TreeNode[], level: number): ComponentChildren =>
    list.map((n, pos) => {
      const isOpen = openSet.has(n.id);
      const hasKids = !!n.children?.length;
      return (
        <li
          key={n.id}
          id={domId(n.id)}
          role="treeitem"
          aria-level={level}
          aria-setsize={list.length}
          aria-posinset={pos + 1}
          aria-expanded={hasKids ? isOpen : undefined}
          aria-selected={sel === n.id}
          aria-disabled={n.disabled ? 'true' : undefined}
          class={cx(cursorId === n.id && 'is-cursor')}
        >
          <div
            class="tree__row"
            style={{ ['--level' as string]: String(level) }}
            onClick={() => setSel(n.id)}
            onDblClick={() => {
              if (hasKids) toggle(n.id);
              if (!n.disabled) onActivate?.(n);
            }}
          >
            <span
              class={cx('tree__twisty', !hasKids && 'tree__twisty--leaf')}
              data-open={isOpen ? 'true' : 'false'}
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                if (hasKids) toggle(n.id);
              }}
            />
            {n.icon ?? (hasKids || n.children ? <span class="glyph-folder" data-open={isOpen ? 'true' : 'false'} aria-hidden="true" /> : <span class="glyph-doc" aria-hidden="true" />)}
            <span class="tree__label">{n.label}</span>
            {n.meta ? <span class="tree__meta">{n.meta}</span> : null}
          </div>
          {hasKids && isOpen ? <ul role="group">{renderList(n.children ?? [], level + 1)}</ul> : null}
        </li>
      );
    });

  return (
    <ul
      ref={rootRef}
      class="tree"
      role="tree"
      aria-label={label}
      tabIndex={0}
      aria-activedescendant={cursorId ? domId(cursorId) : undefined}
      onKeyDown={onKeyDown}
    >
      {renderList(nodes, 1)}
    </ul>
  );
}
