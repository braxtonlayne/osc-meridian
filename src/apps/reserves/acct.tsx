/**
 * Pass two account helpers for this app (docs/SPEC-2.md §1):
 * - Tier 2 canon values: a session that satisfies T2 (the deputy commander) reads the values the
 *   client canon carries as T2 sentinels from the CANON-T2 release. The release is fetched only
 *   once the session satisfies T2; T1 and compartment sentinels are never replaced.
 * - Tier 4 home: the Tier 4 account sees only its own site, so a network-wide home view opens as
 *   the in-world refusal (DIR-0301) instead.
 */
import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { AppProps, RouteEntry, Services } from '@core/contracts';
import { readableByTier4 } from '@core/docs';
import { loadCanonT2 } from '@core/canon-release';
import { rxInfo } from '@core/rx';
import { MenuBar, StatusBar, type MenuBarMenu } from '@design/index';
import { RefusalState } from '@graphics/states';
import './acct.css';

export type CanonT2 = Record<string, string>;

const t2 = signal<CanonT2 | null>(null);

/** CANON-T2 values when the session satisfies T2, else null (never fetched below T2). */
export function useCanonT2(services: Services): CanonT2 | null {
  const ok = services.clearance.satisfies('T2');
  useEffect(() => {
    if (!ok || t2.peek()) return;
    loadCanonT2()
      .then((v) => (t2.value = v))
      .catch(() => undefined);
  }, [ok]);
  return ok ? t2.value : null;
}

/** Released value for a whole-value T2 sentinel at canon dot path `path`, else undefined. */
export function t2Value(v: unknown, path: string, map: CanonT2 | null | undefined): string | undefined {
  if (!map || rxInfo(v)?.key !== 'T2') return undefined;
  return map[path];
}

/** True for the Tier 4 account (base tier 4). */
export const isTier4 = (services: Services): boolean => services.session.tier.value === 4;

export const T4_REF = 'DIR-0301';

/** Home view for a Tier 4 session: an in-world refusal with working chrome. */
export function T4Home({ win, services, title, docNo }: Pick<AppProps, 'win'> & { services: Services; title: string; docNo: string }) {
  const site = services.account.def.value.site;
  useEffect(() => {
    win.setTitle(title, docNo);
    win.setMarking('TSSCI-OSC');
    win.setStatus('Access refused');
    services.audit.log(
      'window.open',
      docNo,
      `Operator ${services.session.operatorId.peek()} requested ${docNo}. Request refused: Tier 4 access determination, ${T4_REF}.`,
    );
  }, []);
  const menus: MenuBarMenu[] = [
    { label: '&File', items: [{ label: 'C&lose', onSelect: () => win.close() }] },
    { label: '&Help', items: [{ label: '&Directives issued to this operator', onSelect: () => services.openApp('directives') }] },
  ];
  return (
    <div class="t4-home">
      <MenuBar menus={menus} label={`${title} menu`} />
      <div class="t4-home__body">
        <RefusalState
          authority="Classification Control, Office of Internal Assurance"
          reference={T4_REF}
          docNo={docNo}
          requirement="Tier 3"
          reason={`Requires Tier 3 access determination. ${title} holds records beyond the assigned site of this operator (${site}). Records issued to Tier 4 personnel are in Directives and Message Traffic.`}
        />
      </div>
      <StatusBar
        panes={[
          { id: 'msg', fill: true, content: 'Access refused.' },
          { id: 'ref', width: 110, mono: true, content: T4_REF },
        ]}
      />
    </div>
  );
}

/**
 * Whether a Tier 4 session must see the refusal for `entry` (the page shown, or the app home's
 * entry). Pages marked for Tier 4, or with this account's own variant, open as usual.
 */
export function t4Refused(services: Services, entry: RouteEntry | null | undefined): boolean {
  if (!isTier4(services)) return false;
  if (!entry) return true;
  return !(readableByTier4(entry) || !!entry.variants?.includes(services.account.id.value));
}

/** A reserve line with its T2 label, statement and quantity filled from CANON-T2 when released. */
export function revealItem<T extends { id: string; label: string; text: string; value: number | null }>(item: T, t2: CanonT2 | null): T {
  if (!t2) return item;
  const label = t2Value(item.label, `reserves.${item.id}.label`, t2) ?? item.label;
  const text = t2Value(item.text, `reserves.${item.id}.text`, t2) ?? item.text;
  const raw = item.value === null && rxInfo(item.label)?.key === 'T2' ? t2[`reserves.${item.id}.value`] : undefined;
  const n = raw !== undefined ? Number(String(raw).replace(/,/g, '')) : NaN;
  return { ...item, label, text, value: Number.isFinite(n) ? n : item.value };
}
