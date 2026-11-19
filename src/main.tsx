/**
 * MERIDIAN entry. Boot order:
 *   1. design system CSS (layer order, tokens, fonts) first
 *   2. remove the prerendered static document (#static-doc; present for no-JS readers and crawlers)
 *   3. fix the active account (pointer in localStorage) and its storage namespace
 *   4. render the shell (self-test panel, or a plain workspace after an account switch)
 *   5. in parallel: legacy key migration, canon (lazy chunk), session from the AccountDef,
 *      audit trail, window positions, mail/recent stores, cross-account traces
 *   6. self-test completes -> lock screen -> sign-in -> the URL's route opens as a window
 */
import '@design/styles';
import './shell/shell.css';
import { render } from 'preact';
import { docsService, followRouteRebuilds, loadCanon, loadRoutes } from '@shell/adapters';
import { initSession, satisfies } from '@core/session';
import * as session from '@core/session';
import { initAudit } from '@core/audit';
import { migrateLegacy, setActiveAccount } from '@core/persist';
import { initActive, readPointer, takeSwitchNote } from '@core/accounts';
import { currentPath } from '@core/router';
import { initStores, setRoutes, startTraceWatch } from '@core/services';
import { initWm } from '@shell/wm';
import { bootSkipped, doLogin, pendingPath } from '@shell/state';
import { Shell, setReady } from '@shell/Shell';
import { startNarrative } from '@narrative/engine';

document.getElementById('static-doc')?.remove();
document.documentElement.classList.add('js');

const accountId = readPointer();
setActiveAccount(accountId);
const def = initActive(accountId);
const switchNote = takeSwitchNote(accountId);
bootSkipped.value = switchNote !== null;

docsService(satisfies);
setRoutes(loadRoutes());
// Dev: a content rebuild rewrites routes.json; re-index in place instead of losing the table.
if (import.meta.hot) followRouteRebuilds(setRoutes);

const path = currentPath();
// Keep the fragment (#para-6) so the deep link scrolls to its anchor after sign-in.
if (path !== '/') pendingPath.value = path + location.hash;

const ready = (async () => {
  await migrateLegacy();
  await loadCanon();
  await initSession({
    operatorId: def.operatorId,
    tier: def.tier,
    site: def.site,
    divisionId: def.divisionId,
    displayName: def.displayName,
    probationStart: def.probationStart,
    compartments: def.compartments,
    roleTitle: def.roleTitle,
  });
  await Promise.all([initAudit(), initWm(), initStores()]);
  await startTraceWatch();
  // The pass-one narrative (login mail, segment 04, OIA consequences) is the analyst's.
  // Other accounts' scripted queues arrive in wave 2B/2C.
  if (accountId === 'analyst') await startNarrative();
})().catch((err: unknown) => {
  console.error('MERIDIAN initialisation', err);
});

setReady(ready);

if (switchNote) {
  // Account switch: no self-test. Straight to the lock screen with this card selected,
  // or to the desktop when the visitor already signed in with it.
  void ready.then(() => {
    session.phase.value = 'locked';
    if (switchNote.autologin) doLogin();
  });
}

render(<Shell />, document.getElementById('app')!);
