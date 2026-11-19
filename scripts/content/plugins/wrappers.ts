/**
 * Paper-artefact wrappers. Semantic HTML only; the graphics/design layer styles them.
 *   :::margin{hand="RT" seed=3} ... :::       -> <aside class="margin-note" data-hand data-seed>
 *   :::scan{seed=7 rotate=-0.6} ... :::       -> <div class="scan-page" data-seed data-rotate>
 *   ::stamp{kind="RECEIVED" date="2008-05-02"} -> <div class="stamp" data-kind data-date>
 *   ::routing{initials="JH,MKB"}              -> <div class="routing-slip" data-initials>
 */
import { formatDate, MAX_DATE } from '../util.ts';
import { el, fail, text, type CompileContext, type MdNode } from './context.ts';

function num(ctx: CompileContext, node: MdNode, name: string, v: string | null | undefined, dflt: string): string {
  if (v === undefined || v === null || v === '') return dflt;
  if (!/^-?\d+(\.\d+)?$/.test(v)) fail(ctx, node, `${node.name}: ${name}="${v}" must be a number`);
  return v;
}

const MARGIN_MARKS = ['arrow', 'underline', 'circle', 'none'];
const INK_MARKS = ['circle', 'underline'];

export function margin(node: MdNode, ctx: CompileContext): void {
  const a = node.attributes ?? {};
  const hand = (a.hand ?? '').trim();
  const mark = (a.mark ?? 'none').trim() || 'none';
  if (!hand) fail(ctx, node, ':::margin needs hand="<initials>"');
  if (!MARGIN_MARKS.includes(mark)) fail(ctx, node, `:::margin mark="${mark}" must be one of ${MARGIN_MARKS.join(', ')}`);
  node.data = {
    hName: 'aside',
    hProperties: {
      className: ['margin-note'],
      dataHand: hand,
      dataSeed: num(ctx, node, 'seed', a.seed, '1'),
      dataMark: mark,
    },
  };
}

/** `:ink[847]{mark=circle}` -> <span data-ink="circle">847</span> (hand ink on running text). */
export function ink(node: MdNode, ctx: CompileContext): void {
  const a = node.attributes ?? {};
  const mark = (a.mark ?? 'underline').trim();
  if (!INK_MARKS.includes(mark)) fail(ctx, node, `:ink mark="${mark}" must be one of ${INK_MARKS.join(', ')}`);
  if (!node.children?.length) fail(ctx, node, ':ink[...] needs the text being marked');
  node.data = { hName: 'span', hProperties: { dataInk: mark } };
}

export function scan(node: MdNode, ctx: CompileContext): void {
  const a = node.attributes ?? {};
  node.data = {
    hName: 'div',
    hProperties: {
      className: ['scan-page'],
      dataSeed: num(ctx, node, 'seed', a.seed, '1'),
      dataRotate: num(ctx, node, 'rotate', a.rotate, '0'),
    },
  };
}

/**
 * `::stamp{kind="COPY-NO" date="2008-05-02" text="3" of="12" seed=4 ink="red"}`
 * -> <span class="stamp" data-kind data-date data-text data-seed data-of data-ink> with readable
 * no-JS text ("COPY NO 3 OF 12 02 MAY 2008"); @graphics/banners enhanceStamps() upgrades it.
 */
export function stamp(node: MdNode, ctx: CompileContext): void {
  const a = node.attributes ?? {};
  const kind = (a.kind ?? '').trim();
  const date = (a.date ?? '').trim();
  const label = (a.text ?? '').trim();
  const of = (a.of ?? '').trim();
  const inkColour = (a.ink ?? '').trim();
  if (!kind) fail(ctx, node, '::stamp needs kind="RECEIVED" (or similar)');
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(ctx, node, `::stamp date "${date}" must be ISO YYYY-MM-DD`);
    else if (date > MAX_DATE) fail(ctx, node, `::stamp date ${date} is after ${MAX_DATE}`);
  }
  const props: Record<string, unknown> = { className: ['stamp'], dataKind: kind };
  if (date) props.dataDate = date;
  if (label) props.dataText = label;
  if (a.seed !== undefined && a.seed !== null) props.dataSeed = num(ctx, node, 'seed', a.seed, '1');
  if (of) props.dataOf = of;
  if (inkColour) props.dataInk = inkColour;
  const kids: MdNode[] = [el('span', { className: ['stamp-kind'] }, [text(kind.replace(/-/g, ' '))])];
  if (label) kids.push(text(' '), el('span', { className: ['stamp-text'] }, [text(label)]));
  if (of) kids.push(text(' '), el('span', { className: ['stamp-of'] }, [text(`OF ${of}`)]));
  if (date) kids.push(text(' '), el('span', { className: ['stamp-date'] }, [text(formatDate(date))]));
  node.data = { hName: 'span', hProperties: props };
  node.children = kids;
}

export function routing(node: MdNode, ctx: CompileContext): void {
  const a = node.attributes ?? {};
  const initials = (a.initials ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!initials.length) fail(ctx, node, '::routing needs initials="JH,MKB"');
  node.data = { hName: 'div', hProperties: { className: ['routing-slip'], dataInitials: initials.join(',') } };
  node.children = initials.map((i, n) =>
    el('span', { className: ['routing-initial'], dataSeq: String(n + 1) }, [text(i)]),
  );
}
