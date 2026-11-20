/**
 * Tier 4 home (docs/SPEC-2.md §1): the Tier 4 account sees only its own site, so the network-wide
 * board opens as the in-world refusal (DIR-0301) instead. Same helper as registry/acct.tsx.
 */
import { useEffect } from 'preact/hooks';
import type { AppProps, RouteEntry, Services } from '@core/contracts';
import { readableByTier4 } from '@core/docs';
import { MenuBar, StatusBar, type MenuBarMenu } from '@design/index';
import { RefusalState } from '@graphics/states';
import './acct.css';

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
