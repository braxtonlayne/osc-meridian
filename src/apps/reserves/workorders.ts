/**
 * Work order citations: find work order numbers (canon pattern "<div>-YY-NNNN", e.g. FE-08-0417)
 * in canon status notes and in document HTML, with the sentence that cites each one.
 * Withheld spans in document HTML stay withheld: they become `rx` parts (length, authority,
 * reference) and never contribute text.
 */

export type ExcerptPart = { text: string } | { rx: { len: number; auth: string; ref: string } };

export interface Citation {
  /** docNo of the citing record, or the canon record id for status notes. */
  source: string;
  title: string;
  /** Route to open the citing document, when it is a document. */
  route: string | null;
  excerpt: ExcerptPart[];
}

export interface WorkOrder {
  no: string;
  division: string;
  year: string;
  serial: string;
  citations: Citation[];
}

/** Regex for work order numbers whose prefix is one of the division codes. */
export function workOrderPattern(divisionIds: readonly string[]): RegExp {
  const ids = [...divisionIds].filter((d) => /^[A-Z]{2,4}$/.test(d)).sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(${ids.join('|')})-(\\d{2})-(\\d{4})\\b`, 'g');
}

const ENT: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

function attr(tag: string, name: string): string {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? (m[1] ?? '') : '';
}

/**
 * Flatten document HTML into excerpt parts: text, with each withheld span or block replaced by
 * an rx part. Block elements end a sentence.
 */
export function htmlToParts(html: string): ExcerptPart[] {
  const parts: ExcerptPart[] = [];
  const push = (t: string) => {
    if (!t) return;
    const last = parts[parts.length - 1];
    if (last && 'text' in last) last.text += t;
    else parts.push({ text: t });
  };
  const re = /<(span|div)\b[^>]*\bclass="[^"]*\brx\b(?![-\w])[^"]*"[^>]*>(?:[\s\S]*?)<\/\1>|<\/?(p|li|tr|td|th|h[1-6]|div|br|table|ul|ol|blockquote)\b[^>]*>|<[^>]+>|&[a-z#0-9]+;|[^<&]+/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const tok = m[0];
    if (m[1]) {
      const open = /^<[^>]+>/.exec(tok)?.[0] ?? '';
      parts.push({ rx: { len: Number(attr(open, 'data-len')) || 8, auth: attr(open, 'data-auth') || 'OSC', ref: attr(open, 'data-ref') || '' } });
    } else if (m[2]) {
      push(/^(td|th)$/i.test(m[2]) ? ' ' : '\n');
    } else if (tok.startsWith('<')) {
      // inline tag: drop
    } else if (tok.startsWith('&')) {
      push(ENT[tok] ?? ' ');
    } else {
      push(tok.replace(/\s+/g, ' '));
    }
  }
  return parts;
}

/** Split parts into sentences (on ". " followed by a capital, or on newlines). */
export function sentences(parts: ExcerptPart[]): ExcerptPart[][] {
  const out: ExcerptPart[][] = [];
  let cur: ExcerptPart[] = [];
  const flush = () => {
    const trimmed = trimParts(cur);
    if (trimmed.length) out.push(trimmed);
    cur = [];
  };
  for (const p of parts) {
    if ('rx' in p) {
      cur.push(p);
      continue;
    }
    const pieces = p.text.split(/(\n|(?<=[.;:])\s+(?=[A-Z(]))/);
    pieces.forEach((piece, i) => {
      if (piece === undefined) return;
      if (piece === '\n' || (i % 2 === 1 && /^\s+$/.test(piece))) {
        flush();
        return;
      }
      if (piece) cur.push({ text: piece.replace(/\s+/g, ' ') });
    });
  }
  flush();
  return out;
}

function trimParts(ps: ExcerptPart[]): ExcerptPart[] {
  const out = ps.filter((p) => !('text' in p) || p.text.length > 0);
  const first = out[0];
  if (first && 'text' in first) first.text = first.text.replace(/^\s+/, '');
  const last = out[out.length - 1];
  if (last && 'text' in last) last.text = last.text.replace(/\s+$/, '');
  return out.filter((p) => !('text' in p) || p.text.length > 0);
}

const textOf = (ps: ExcerptPart[]) => ps.map((p) => ('text' in p ? p.text : '')).join('');

/** Every (work order, sentence) pair in a body of excerpt parts. */
export function citationsIn(parts: ExcerptPart[], pattern: RegExp): { no: string; excerpt: ExcerptPart[] }[] {
  const out: { no: string; excerpt: ExcerptPart[] }[] = [];
  for (const s of sentences(parts)) {
    const t = textOf(s);
    const seen = new Set<string>();
    const re = new RegExp(pattern.source, 'g');
    for (let m = re.exec(t); m; m = re.exec(t)) {
      if (seen.has(m[0])) continue;
      seen.add(m[0]);
      out.push({ no: m[0], excerpt: s });
    }
  }
  return out;
}

/** Merge citations into a register keyed by work order number, sorted by number. */
export function buildRegister(
  sources: { source: string; title: string; route: string | null; parts: ExcerptPart[] }[],
  divisionIds: readonly string[],
): WorkOrder[] {
  const pattern = workOrderPattern(divisionIds);
  const map = new Map<string, WorkOrder>();
  for (const src of sources) {
    for (const c of citationsIn(src.parts, pattern)) {
      const [division = '', year = '', serial = ''] = c.no.split('-');
      let wo = map.get(c.no);
      if (!wo) {
        wo = { no: c.no, division, year, serial, citations: [] };
        map.set(c.no, wo);
      }
      if (!wo.citations.some((x) => x.source === src.source && textOf(x.excerpt) === textOf(c.excerpt))) {
        wo.citations.push({ source: src.source, title: src.title, route: src.route, excerpt: c.excerpt });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.no.localeCompare(b.no));
}
