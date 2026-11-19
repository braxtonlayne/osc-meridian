/**
 * `:c[dot.path]` -> formatted canon value (numbers with separators except year/no/tier keys;
 * ISO dates as "22 APR 2008" / "NOV 2003"). `{raw}` prints the stored value unformatted.
 * Unknown path is a build error.
 */
import { formatScalar, resolvePath } from '../canon.ts';
import { formatDate } from '../util.ts';
import { fail, mdText, type CompileContext, type MdNode } from './context.ts';

export function canonValue(node: MdNode, ctx: CompileContext): void {
  const path = mdText(node).trim();
  const attrs = node.attributes ?? {};
  let display: string | null = null;
  if (!path) {
    fail(ctx, node, ':c[] needs a canon path, e.g. :c[headline.staffTotal]');
  } else if (!ctx.canon) {
    fail(ctx, node, `:c[${path}] used but no canon file was loaded`);
  } else {
    const r = resolvePath(ctx.canon, path);
    if (!r.found) {
      fail(ctx, node, `:c[${path}] does not resolve in canon`);
    } else {
      const raw = 'raw' in attrs;
      display =
        !raw && typeof r.value === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(r.value)
          ? formatDate(r.value)
          : formatScalar(r.value, r.lastKey, raw);
      if (display === null) {
        fail(ctx, node, `:c[${path}] resolves to ${r.value === null ? 'null' : typeof r.value}, not a printable value`);
      }
    }
  }
  node.data = { hName: 'span', hProperties: { className: ['cv'], dataCanon: path } };
  node.children = [{ type: 'text', value: display ?? path }];
}
