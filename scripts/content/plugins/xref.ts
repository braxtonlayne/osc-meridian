/** `:x[OSC-DIR-0398]` -> <a href="<BASE><route>" data-xref="<route>">OSC-DIR-0398</a>. */
import { joinBase } from '../util.ts';
import { fail, mdText, type CompileContext, type MdNode } from './context.ts';

export function xref(node: MdNode, ctx: CompileContext): void {
  const docNo = mdText(node).trim();
  const target = ctx.docsByNo.get(docNo);
  if (!target) {
    if (ctx.lenient && !(ctx.manifest.has(docNo) && ctx.pendingXrefsAreWarnings)) {
      const line = node.position?.start?.line;
      ctx.warnings.push({
        file: ctx.file,
        line: line !== undefined ? line + ctx.lineOffset : undefined,
        message: `:x[${docNo}] does not resolve; rendered as plain text`,
      });
      node.type = 'text';
      node.value = docNo;
      delete node.children;
      delete node.attributes;
      delete node.data;
      return;
    }
    if (ctx.manifest.has(docNo) && ctx.pendingXrefsAreWarnings) {
      const line = node.position?.start?.line;
      ctx.warnings.push({
        file: ctx.file,
        line: line !== undefined ? line + ctx.lineOffset : undefined,
        message: `:x[${docNo}] is in the manifest but has no page yet`,
      });
    } else if (ctx.manifest.has(docNo)) {
      fail(ctx, node, `:x[${docNo}] is planned in the manifest but its page does not exist`);
    } else {
      fail(ctx, node, `:x[${docNo}] cross-reference to unknown document number`);
    }
    node.data = { hName: 'span', hProperties: { className: ['xref-missing'] } };
    node.children = [{ type: 'text', value: docNo }];
    return;
  }
  // A link inside a redaction is part of the withheld text: it ships only in the release file.
  const list = ctx.rxDepth > 0 ? ctx.xrefsHidden : ctx.xrefsUsed;
  if (!list.includes(docNo)) list.push(docNo);
  node.data = {
    hName: 'a',
    hProperties: { href: joinBase(ctx.base, target.route), dataXref: target.route, className: ['xref'] },
  };
  node.children = [{ type: 'text', value: docNo }];
}
