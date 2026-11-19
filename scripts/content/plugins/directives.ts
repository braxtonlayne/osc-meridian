/**
 * Remark transformer for every MERIDIAN directive except redaction (redaction.ts runs after
 * this so redacted fragments contain resolved canon values and links).
 *
 * Known directives and the form each must use:
 *   text      :r  :c  :x  :ink
 *   leaf      ::canon-table  ::stamp  ::routing
 *   container :::redact  :::margin  :::scan
 * A bare unknown text directive (e.g. "ratio 3:Ab" parsed as `:Ab`) is restored to literal
 * text; anything else unknown is a build error.
 */
import { canonValue } from './canon-value.ts';
import { xref } from './xref.ts';
import { canonTable } from './canon-table.ts';
import { ink, margin, routing, scan, stamp } from './wrappers.ts';
import { DIRECTIVE_TYPES, fail, mdText, type CompileContext, type MdNode } from './context.ts';

const FORMS: Record<string, string> = {
  r: 'textDirective',
  c: 'textDirective',
  x: 'textDirective',
  ink: 'textDirective',
  'canon-table': 'leafDirective',
  stamp: 'leafDirective',
  routing: 'leafDirective',
  redact: 'containerDirective',
  margin: 'containerDirective',
  scan: 'containerDirective',
};

const PREFIX: Record<string, string> = { textDirective: ':', leafDirective: '::', containerDirective: ':::' };

function handle(node: MdNode, ctx: CompileContext): void {
  const name = node.name ?? '';
  const form = FORMS[name];
  if (!form) {
    const hasAttrs = node.attributes && Object.keys(node.attributes).length > 0;
    if (node.type === 'textDirective' && !hasAttrs) {
      const label = node.children?.length ? `[${mdText(node)}]` : '';
      node.type = 'text';
      node.value = `:${name}${label}`;
      delete node.children;
      delete node.attributes;
      return;
    }
    fail(ctx, node, `unknown directive ${PREFIX[node.type] ?? ':'}${name}`);
    node.data = { hName: 'div' };
    return;
  }
  if (form !== node.type) {
    fail(ctx, node, `directive "${name}" must be written as ${PREFIX[form]}${name}, not ${PREFIX[node.type]}${name}`);
    node.data = { hName: node.type === 'textDirective' ? 'span' : 'div' };
    return;
  }
  switch (name) {
    case 'c':
      return canonValue(node, ctx);
    case 'x':
      return xref(node, ctx);
    case 'canon-table':
      return canonTable(node, ctx);
    case 'stamp':
      return stamp(node, ctx);
    case 'routing':
      return routing(node, ctx);
    case 'ink':
      return ink(node, ctx);
    case 'margin':
      return margin(node, ctx);
    case 'scan':
      return scan(node, ctx);
    default:
      return; // r / redact: handled by redaction.ts
  }
}

function walk(node: MdNode, ctx: CompileContext): void {
  let rx = false;
  if (DIRECTIVE_TYPES.has(node.type)) {
    const name = node.name;
    rx = name === 'r' || name === 'redact';
    handle(node, ctx);
    // canon-table / stamp / routing produce final children; c and x consume their label.
    if (name === 'canon-table' || name === 'c' || name === 'x' || name === 'stamp' || name === 'routing') return;
  }
  if (rx) ctx.rxDepth++;
  for (const child of node.children ?? []) walk(child, ctx);
  if (rx) ctx.rxDepth--;
}

export function remarkMeridianDirectives(ctx: CompileContext) {
  return (tree: MdNode) => walk(tree, ctx);
}
