/**
 * `:c[dot.path]` -> formatted canon value (numbers with separators except year/no/tier keys;
 * ISO dates as "22 APR 2008" / "NOV 2003"). `{raw}` prints the stored value unformatted.
 * Unknown path is a build error.
 *
 * A value the client canon withholds (tier-1/2 roster names, restricted levels, DELTA
 * locations, restricted reserves) is emitted as a redaction with the client-canon key, so it
 * never reaches baseline HTML. `auth`/`ref` attributes override the defaults (OSC/CSO, docNo).
 */
import { formatScalar, resolvePath } from '../canon.ts';
import { restrictedKey, rxAttributes } from '../client-canon.ts';
import { formatDate } from '../util.ts';
import { fail, mdText, text, type CompileContext, type MdNode } from './context.ts';

/** Enclosing records of a path in the full canon, innermost first. */
function ancestors(ctx: CompileContext, path: string): unknown[] {
  const segs = path.split('.').filter(Boolean);
  const out: unknown[] = [];
  for (let i = segs.length - 1; i > 0; i--) {
    const r = resolvePath(ctx.canon!, segs.slice(0, i).join('.'));
    if (r.found) out.push(r.value);
  }
  return out;
}

export function canonValue(node: MdNode, ctx: CompileContext): void {
  const path = mdText(node).trim();
  const attrs = node.attributes ?? {};
  let display: string | null = null;
  let key: string | null = null;
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
      } else if (ctx.restrictions) {
        const cr = resolvePath(ctx.restrictions.client, path);
        key = restrictedKey(r.value, cr.found ? cr.value : null, ancestors(ctx, path));
      }
    }
  }
  if (key && display !== null) {
    // Becomes an ordinary redaction; redaction.ts renders the bar and the release entry.
    node.name = 'r';
    node.attributes = rxAttributes(key, (attrs.auth ?? '').trim() || 'OSC/CSO', (attrs.ref ?? '').trim() || ctx.docNo);
    node.children = [{ type: 'meridianElement', data: { hName: 'span', hProperties: { className: ['cv'], dataCanon: path } }, children: [text(display)] }];
    return;
  }
  node.data = { hName: 'span', hProperties: { className: ['cv'], dataCanon: path } };
  node.children = [{ type: 'text', value: display ?? path }];
}
