/** Shell-wide UI state and session transitions. */
import { signal } from '@preact/signals';
import * as audit from '@core/audit';
import * as session from '@core/session';
import { replacePath } from '@core/router';
import { openRoute } from '@core/services';
import { removeWindow, windows } from './wm';
import { menu } from './Menu';

function toLock(): void {
  menu.value = null;
  runOpen.value = false;
  searchOpen.value = false;
  session.phase.value = 'locked';
}

export const runOpen = signal(false);
export const searchOpen = signal(false);
/** Path requested by the URL at boot; opened after first sign-in. */
export const pendingPath = signal<string | null>(null);

export function doLogin(): void {
  const first = !session.signedIn.peek();
  const afterLogoff = session.lockReason.peek() === 'logoff';
  session.signedIn.value = true;
  if (first || afterLogoff || !session.loginAt.peek()) session.loginAt.value = Date.now();
  session.noteActivity();
  audit.log('login', session.operatorId.peek());
  session.phase.value = 'active';
  const p = pendingPath.peek();
  pendingPath.value = null;
  if (p && p !== '/') openRoute(p, { push: false });
}

export function doLock(): void {
  session.lockReason.value = 'manual';
  toLock();
}

export function doTimeout(): void {
  audit.log('timeout', session.operatorId.peek());
  session.lockReason.value = 'timeout';
  toLock();
}

export function doLogoff(): void {
  for (const w of [...windows.peek()]) removeWindow(w.id);
  audit.log('logout', session.operatorId.peek());
  replacePath('/');
  session.lockReason.value = 'logoff';
  session.loginAt.value = null;
  toLock();
}
