/**
 * Build-time redaction (SPEC §7 clearance engine; docs/CONTRACTS.md).
 *
 *   :r[hidden text]{tier=2 compartment=KESTREL auth="OIA" ref="OIA-08-114"}
 *   :::redact{tier=2 auth="CSO" ref="CSO-08-031"}  ...blocks...  :::
 *
 * Baseline output contains no hidden text:
 *   inline <span class="rx" data-rx="<docId>-<n>" data-len data-auth data-ref data-key style="--rx-len:N"></span>
 *   block  <div class="rx rx-block" data-rx data-len data-lines data-auth data-ref data-key style="--rx-lines:N"></div>
 * The hidden HTML goes to ctx.releases[key][rxId]. Keys: T<tier> | <COMPARTMENT> | <COMPARTMENT>+T<tier>.
 * Any tier-1 key is never released (not to disk, not to the search index, not anywhere).
 * Ids are numbered in document order; nested redactions are processed innermost-first so an
 * outer release still carries the inner baseline span.
 */
import { unified } from 'unified';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { toString as hastToString } from 'hast-util-to-string';
import { isTier1Key, releaseKey } from '../util.ts';
import { fail, type CompileContext, type MdNode } from './context.ts';

const fragmentProcessor = unified()
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify);

interface HastLike {
  type: string;
  tagName?: string;
  children?: HastLike[];
}

const BLOCK_TAGS = new Set(['p', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'div', 'dt', 'dd']);

function countLines(node: HastLike): number {
  let lines = 0;
  for (const c of node.children ?? []) {
    if (c.type !== 'element') continue;
    if (c.tagName && BLOCK_TAGS.has(c.tagName) && !(c.children ?? []).some((k) => k.tagName && BLOCK_TAGS.has(k.tagName))) {
      lines += Math.max(1, Math.ceil(hastToString(c as never).length / 90));
    } else {
      lines += countLines(c);
    }
  }
  return lines;
}

function renderFragment(children: MdNode[]): { html: string; text: string; lines: number } {
  const root = { type: 'root', children: structuredClone(children) };
  const hast = fragmentProcessor.runSync(root as never) as unknown as HastLike;
  const html = String(fragmentProcessor.stringify(hast as never)).trim();
  const text = hastToString(hast as never);
  return { html, text, lines: Math.max(1, countLines(hast)) };
}

function isRx(node: MdNode): boolean {
  return (
    (node.type === 'textDirective' && node.name === 'r') || (node.type === 'containerDirective' && node.name === 'redact')
  );
}

/** rx ids already emitted inside a subtree (post-processing). */
function innerIds(node: MdNode, out: string[] = []): string[] {
  for (const c of node.children ?? []) {
    const props = (c.data?.hProperties ?? {}) as Record<string, unknown>;
    if (typeof props.dataRx === 'string') out.push(props.dataRx);
    innerIds(c, out);
  }
  return out;
}

/**
 * Characters withheld by nested redactions (a withheld canon value inside :r[...]): their
 * bars render empty, so the outer bar must count their stated length, not their text.
 */
function innerLen(node: MdNode): number {
  let n = 0;
  for (const c of node.children ?? []) {
    const props = (c.data?.hProperties ?? {}) as Record<string, unknown>;
    if (typeof props.dataRx === 'string' || typeof props.dataKey === 'string') n += Number(props.dataLen) || 0;
    else n += innerLen(c);
  }
  return n;
}

export function remarkRedaction(ctx: CompileContext) {
  return (tree: MdNode) => {
    // 1. ids in document order
    const ids = new Map<MdNode, string>();
    let n = 0;
    const number = (node: MdNode) => {
      if (isRx(node)) ids.set(node, `${ctx.rxPrefix ?? ctx.docId}-${++n}`);
      for (const c of node.children ?? []) number(c);
    };
    number(tree);

    // 2. post-order processing
    const process = (node: MdNode) => {
      for (const c of node.children ?? []) process(c);
      if (!isRx(node)) return;
      const id = ids.get(node)!;
      const block = node.type === 'containerDirective';
      const a = node.attributes ?? {};
      const tierRaw = (a.tier ?? '').trim();
      const compartment = (a.compartment ?? '').trim().toUpperCase() || undefined;
      const auth = (a.auth ?? '').trim();
      const ref = (a.ref ?? '').trim();
      let tier: number | undefined;
      if (tierRaw) {
        tier = Number(tierRaw);
        if (![1, 2, 3, 4].includes(tier)) {
          fail(ctx, node, `redaction tier="${tierRaw}" must be 1, 2, 3 or 4`);
          tier = 1;
        }
      }
      if (compartment && !ctx.compartments.has(compartment)) {
        fail(ctx, node, `redaction compartment "${compartment}" is not a canon compartment`);
      }
      if (!tier && !compartment) {
        fail(ctx, node, 'redaction needs tier=<1-4> and/or compartment=<ID>');
        tier = 1;
      }
      if (!auth) fail(ctx, node, 'redaction needs auth="<withholding authority>"');
      if (!ref) fail(ctx, node, 'redaction needs ref="<reference number>"');
      if (!node.children?.length) fail(ctx, node, 'redaction has no content to withhold');

      const key = releaseKey(tier, compartment);
      const inner = innerIds(node);
      const frag = renderFragment(node.children ?? []);
      const len = Math.max(1, frag.text.length + innerLen(node));

      if (isTier1Key(key)) {
        // Nothing nested inside a tier-1 block can ever be displayed: do not ship it either.
        for (const iid of inner) {
          for (const m of ctx.releases.values()) m.delete(iid);
          const rec = ctx.redactions.find((r) => r.id === iid);
          if (rec) rec.shipped = false;
        }
      } else {
        let m = ctx.releases.get(key);
        if (!m) ctx.releases.set(key, (m = new Map()));
        m.set(id, frag.html);
      }
      ctx.redactions.push({ id, key, len, auth, ref, shipped: true });

      const props: Record<string, unknown> = {
        className: block ? ['rx', 'rx-block'] : ['rx'],
        dataRx: id,
        dataLen: String(len),
        dataAuth: auth,
        dataRef: ref,
        dataKey: key,
        role: 'img',
        ariaLabel: `Withheld. Authority ${auth || 'not stated'}, reference ${ref || 'not stated'}.`,
      };
      if (block) {
        props.dataLines = String(frag.lines);
        props.style = `--rx-lines:${frag.lines}`;
      } else {
        props.style = `--rx-len:${len}`;
      }
      node.children = [];
      node.data = { hName: block ? 'div' : 'span', hProperties: props };
    };
    process(tree);
    ctx.redactions.sort((x, y) => Number(x.id.split('-').pop()) - Number(y.id.split('-').pop()));
  };
}
