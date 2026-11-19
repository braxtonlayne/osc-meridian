/** Facility Registry: shared canon handle, session viewer, withheld-value rendering. */
import canonJson from '@canon';
import type { ComponentChildren } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { Canon, Facility, FacilityId } from '@core/canon-types';
import type { Services } from '@core/contracts';
import { splitRx } from '@core/rx';
import { activeDef } from '@core/accounts';
import { Redaction } from '@design/index';
import { adjacentTo, authorityFor, isOpen, type Cell, type Viewer, type Withheld } from './model';

export const canon = canonJson as unknown as Canon;

/** The signed-in account's own site (pass two: per account; the page reloads on a switch). */
export const HOME_SITE = activeDef.peek().site as FacilityId;

export const facilityById = new Map<string, Facility>(canon.facilities.map((f) => [f.id, f]));

/** Session viewer: adjacency of the operator's site plus the live clearance check. */
export function useViewer(services: Services): Viewer {
  // Re-read on every render: tier and compartments are signals, and render follows them.
  const tier = services.session.tier.value;
  const comps = services.session.compartments.value;
  const adjacent = useMemo(() => adjacentTo(canon, HOME_SITE), []);
  return useMemo(() => ({ adjacent, satisfies: (k: string) => services.clearance.satisfies(k) }), [adjacent, tier, comps.join(',')]);
}

/**
 * Audit hook for withheld values. Logs `redaction.hover` once per bar per view, with the
 * document in view as the subject.
 */
export function useRxAudit(services: Services, subject: string): (barId: string, auth: string, ref: string) => void {
  const seen = useRef(new Set<string>());
  const subj = useRef(subject);
  if (subj.current !== subject) {
    subj.current = subject;
    seen.current = new Set();
  }
  return (barId, auth, ref) => {
    if (seen.current.has(barId)) return;
    seen.current.add(barId);
    services.audit.log(
      'redaction.hover',
      subject,
      `Operator ${services.session.operatorId.value} examined a withheld field in ${subject} (${auth} ${ref}). No release was made.`,
    );
  };
}

export type RxAudit = ReturnType<typeof useRxAudit>;

export function Bar({ rx, id, audit }: { rx: Withheld; id: string; audit: RxAudit }) {
  const a = authorityFor(canon, rx.key);
  return <Redaction len={rx.len} auth={a.auth} reference={a.ref} id={id} onHover={() => audit(id, a.auth, a.ref)} />;
}

/** A register cell: the formatted value, or a bar of the withheld text's length. */
export function CellView<T>({ c, id, audit, fmt, nil = 'None' }: { c: Cell<T>; id: string; audit: RxAudit; fmt?: (v: T) => ComponentChildren; nil?: string }) {
  if (!isOpen(c)) return <Bar rx={c.rx} id={id} audit={audit} />;
  if (c.v === null || c.v === undefined || c.v === '') return nil ? <span class="reg-nil">{nil}</span> : null;
  return <>{fmt ? fmt(c.v) : String(c.v)}</>;
}

/** Plain canon text that may carry embedded sentinels (scrubbed names inside a note). */
export function RxText({ text, id, audit }: { text: string; id: string; audit: RxAudit }) {
  const parts = splitRx(text);
  return (
    <>
      {parts.map((p, i) => ('text' in p ? <span key={i}>{p.text}</span> : <Bar key={i} rx={p.rx} id={`${id}:${i}`} audit={audit} />))}
    </>
  );
}

export const fmt = (n: number): string => n.toLocaleString('en-US');

/** "2004-08" -> "AUG 2004". */
export function fmtMonth(ym: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(ym);
  if (!m) return ym;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

export function className(cls: string): string {
  return canon.classes.find((c) => c.id === cls)?.name ?? cls;
}
