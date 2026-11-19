/** `:x[OSC-DIR-0398]` -> <a href="<BASE><route>" data-xref="<route>">OSC-DIR-0398</a>. */
import { joinBase } from '../util.ts';
import { fail, mdText, type CompileContext, type MdNode } from './context.ts';

export function xref(node: MdNode, ctx: CompileContext): void {
  const docNo = mdText(node).trim();
  const target = ctx.docsByNo.get(docNo);
  if (!target) {
    fail(ctx, node, `:x[${docNo}] cross-reference to unknown document number`);
    node.data = { hName: 'span', hProperties: { className: ['xref-missing'] } };
    node.children = [{ type: 'text', value: docNo }];
    return;
  }
  if (!ctx.xrefsUsed.includes(docNo)) ctx.xrefsUsed.push(docNo);
  node.data = {
    hName: 'a',
    hProperties: { href: joinBase(ctx.base, target.route), dataXref: target.route, className: ['xref'] },
  };
  node.children = [{ type: 'text', value: docNo }];
}
