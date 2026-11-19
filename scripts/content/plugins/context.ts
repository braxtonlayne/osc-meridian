/** Per-document compile context shared by the remark/rehype plugins. */
import type { CanonData } from '../canon.ts';
import type { Problem } from '../util.ts';

export interface RedactionRecord {
  id: string;
  key: string;
  len: number;
  auth: string;
  ref: string;
  /** false when nested inside a tier-1 redaction (its span never reaches a reader). */
  shipped: boolean;
}

export interface CompileContext {
  file: string; // repo-relative path for messages
  lineOffset: number; // lines before the Markdown body (frontmatter)
  docId: string;
  docNo: string;
  base: string; // normalised "/" or "/osc-meridian/"
  canon: CanonData | null;
  docsByNo: Map<string, { route: string; title: string }>;
  /** Compartment ids accepted in redaction requirements. */
  compartments: Set<string>;
  // outputs
  problems: Problem[];
  xrefsUsed: string[];
  redactions: RedactionRecord[];
  /** rxId -> released HTML, per key; tier-1 keys are never added. */
  releases: Map<string, Map<string, string>>;
  headings: { id: string; text: string; depth: number }[];
  plainText: string;
}

export interface Positioned {
  position?: { start?: { line?: number } };
}

export function fail(ctx: CompileContext, node: Positioned | undefined, message: string): void {
  const line = node?.position?.start?.line;
  ctx.problems.push({ file: ctx.file, line: line !== undefined ? line + ctx.lineOffset : undefined, message });
}

/** Minimal structural types for the mdast nodes we touch (mdast + mdast-util-directive). */
export interface MdNode {
  type: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MdNode[];
  data?: Record<string, unknown>;
  position?: { start?: { line?: number } };
}

export const DIRECTIVE_TYPES = new Set(['textDirective', 'leafDirective', 'containerDirective']);

/** An mdast node rendered as an arbitrary HTML element (mdast-util-to-hast honours hName/hProperties). */
export function el(tag: string, props: Record<string, unknown>, children: MdNode[] = []): MdNode {
  return { type: 'meridianElement', data: { hName: tag, hProperties: props }, children };
}

export function text(value: string): MdNode {
  return { type: 'text', value };
}

/** Plain text of an mdast subtree (label text of directives). */
export function mdText(node: MdNode): string {
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(mdText).join('');
}
