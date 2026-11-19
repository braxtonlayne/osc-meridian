/** Small shared pieces: canon redaction sentinels, link buttons, refusal wrapper. */
import { createContext, h } from 'preact';
import type { ComponentChildren, ComponentType } from 'preact';
import { useContext } from 'preact/hooks';
import { Redaction } from '@design/index';
import type { RedactionHoverInfo } from '@design/index';
import { RefusalState as GRefusal } from '@graphics/states';
import { rxInfo, splitRx } from '@core/rx';
import { briefingRef } from './data';

export interface RsvCtx {
  /** Subject for audit lines raised by this window (docNo or module name). */
  subject: string;
  onRxHover: (info: RedactionHoverInfo) => void;
  satisfies: (key: string) => boolean;
  /** Window narrower than the two-pane layout (handheld): tables show fewer columns. */
  narrow: boolean;
}

export const Ctx = createContext<RsvCtx>({ subject: 'Reserves', onRxHover: () => undefined, satisfies: () => false, narrow: false });
export const useRsv = () => useContext(Ctx);

/** Withholding authority for a release key. */
export function authorityFor(key: string): string {
  if (key === 'T1') return 'Council Secretariat (Tier 1)';
  if (key === 'T2') return 'Logistics & Reserves (Tier 2)';
  return `Classification Control (${key})`;
}

/** A redaction bar for a canon sentinel or an explicit length. */
export function Bar({ len, rxKey, reference }: { len: number; rxKey: string; reference?: string }) {
  const { onRxHover } = useRsv();
  return <Redaction len={len} auth={authorityFor(rxKey)} reference={reference ?? briefingRef(rxKey)} onHover={onRxHover} />;
}

/** A canon value that may be a whole-value sentinel. */
export function CanonText({ value }: { value: string | null | undefined }) {
  if (value == null) return null;
  const info = rxInfo(value);
  if (info) return <Bar len={info.len} rxKey={info.key} />;
  const parts = splitRx(value);
  return (
    <>
      {parts.map((p, i) => ('rx' in p ? <Bar key={i} len={p.rx.len} rxKey={p.rx.key} /> : <span key={i}>{p.text}</span>))}
    </>
  );
}

/** Text-styled button for in-app navigation inside tables and paragraphs (always underlined). */
export function LinkButton({ onClick, children, title }: { onClick: () => void; children: ComponentChildren; title?: string }) {
  return (
    <button type="button" class="rsv-link" onClick={onClick} title={title}>
      {children}
    </button>
  );
}

/**
 * RefusalState takes its reference as `ref` (see @graphics/states README); Preact 11 passes it
 * through as an ordinary prop. Same seam as the shell adapter.
 */
export function Refusal(p: { authority: string; reference: string; reason: string; requirement?: string; docNo?: string }) {
  return h(GRefusal as unknown as ComponentType<Record<string, unknown>>, {
    authority: p.authority,
    ref: p.reference,
    reason: p.reason,
    requirement: p.requirement,
    docNo: p.docNo,
  });
}
