/**
 * MERIDIAN entry. Boot order:
 *   1. design system CSS (layer order, tokens, fonts) first
 *   2. remove the prerendered static document (#static-doc; present for no-JS readers and crawlers)
 *   3. render the shell (self-test panel) immediately
 *   4. in parallel: canon (lazy chunk), session, audit trail, window positions, mail/recent stores
 *   5. self-test completes -> lock screen -> sign-in -> the URL's route opens as a window
 */
import '@design/styles';
import './shell/shell.css';
import { render } from 'preact';
import { docsService, followRouteRebuilds, loadCanon, loadRoutes } from '@shell/adapters';
import { initSession, satisfies } from '@core/session';
import { initAudit } from '@core/audit';
import { currentPath } from '@core/router';
import { initStores, setRoutes } from '@core/services';
import { initWm } from '@shell/wm';
import { pendingPath } from '@shell/state';
import { Shell, setReady } from '@shell/Shell';
import { startNarrative } from '@narrative/engine';

document.getElementById('static-doc')?.remove();
document.documentElement.classList.add('js');

docsService(satisfies);
setRoutes(loadRoutes());
// Dev: a content rebuild rewrites routes.json; re-index in place instead of losing the table.
if (import.meta.hot) followRouteRebuilds(setRoutes);

const path = currentPath();
// Keep the fragment (#para-6) so the deep link scrolls to its anchor after sign-in.
if (path !== '/') pendingPath.value = path + location.hash;

setReady(
  (async () => {
    const canon = await loadCanon();
    const op = canon.operator;
    await initSession({
      operatorId: op.operatorId,
      tier: op.tier,
      site: op.site,
      divisionId: op.divisionId,
      displayName: op.displayName,
      probationStart: op.probationStart,
      compartments: op.compartments,
    });
    await Promise.all([initAudit(), initWm(), initStores()]);
    await startNarrative();
  })().catch((err: unknown) => {
    console.error('MERIDIAN initialisation', err);
  }),
);

render(<Shell />, document.getElementById('app')!);
