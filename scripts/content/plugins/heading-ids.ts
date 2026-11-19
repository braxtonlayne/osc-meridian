/** Rehype: stable ids on h1-h6 (from baseline text only), and capture of baseline plain text. */
import { toString as hastToString } from 'hast-util-to-string';
import type { CompileContext } from './context.ts';

interface HNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function rehypeHeadingIds(ctx: CompileContext) {
  return (tree: HNode) => {
    const used = new Set<string>();
    let anon = 0;
    const walk = (node: HNode) => {
      if (node.type === 'element' && node.tagName && /^h[1-6]$/.test(node.tagName)) {
        const txt = hastToString(node as never).replace(/\s+/g, ' ').trim();
        const props = (node.properties ??= {});
        let id = typeof props.id === 'string' && props.id ? props.id : slugify(txt) || `section-${++anon}`;
        if (used.has(id)) {
          let i = 2;
          while (used.has(`${id}-${i}`)) i++;
          id = `${id}-${i}`;
        }
        used.add(id);
        props.id = id;
        ctx.headings.push({ id, text: txt, depth: Number(node.tagName.slice(1)) });
      }
      for (const c of node.children ?? []) walk(c);
    };
    walk(tree);
    ctx.plainText = spacedText(tree);
  };
}

/** Text of a hast tree with element boundaries treated as word breaks (for search). */
export function spacedText(tree: HNode): string {
  const parts: string[] = [];
  const walk = (n: HNode & { value?: string }) => {
    if (n.type === 'text' && typeof n.value === 'string') parts.push(n.value);
    else if (n.type === 'element' || n.type === 'root') {
      if (n.type === 'element') parts.push(' ');
      for (const c of n.children ?? []) walk(c);
      if (n.type === 'element') parts.push(' ');
    }
  };
  walk(tree);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
