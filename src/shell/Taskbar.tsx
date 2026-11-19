/**
 * Taskbar: Directory (start) menu, running-window buttons, notification area
 * (ALPHA hub links, mail, print queue, session timer) and the clock.
 */
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import type { AppId } from '@core/contracts';
import { APPS } from '@apps/index';
import { printQueue, recent, services, handheldActive } from '@core/services';
import * as session from '@core/session';
import { Icon, canonNow } from './adapters';
import { activeId, focusWindow, minimize, restore, toggleMax, windows } from './wm';
import type { Win } from './wm';
import { MenuList, openMenu, SEP } from './Menu';
import type { MenuItem } from './Menu';
import { runOpen, searchOpen, doLock, doLogoff } from './state';
import { seg04 } from '@narrative/seg04';

export const directoryOpen = signal(false);
const trayPopup = signal<'links' | 'session' | null>(null);

/* ------------------------------------------------------------ hub links */

export type LinkState = 'LOCAL' | 'NOMINAL' | 'DEGRADED' | 'BUSY';

/** Hub at the far end of segment 04 (the narrative movement runs ALPHA-05 to ALPHA-03). */
const SEG04_HUB = 'ALPHA-05';

/**
 * Link state from this workstation (ALPHA-03) to each ALPHA hub. Deterministic:
 * the QKD link to each remote hub re-keys for three minutes each hour, offset
 * per hub; during re-key the link is reported DEGRADED. Otherwise NOMINAL.
 * While the segment 04 movement is running (narrative engine, start..end) the
 * ALPHA-05 link reports BUSY: the hub is carrying the unbooked movement's traffic.
 */
export function hubLinks(now: number): { id: string; state: LinkState; note: string }[] {
  const minute = new Date(now).getUTCMinutes();
  const ev = seg04.value;
  const segActive = !!ev && now >= ev.start && now <= ev.end;
  const hubs = canonNow()
    .facilities.filter((f) => f.class === 'ALPHA')
    .map((f) => f.id)
    .sort();
  return hubs.map((id, i) => {
    if (id === session.site.value) return { id, state: 'LOCAL' as const, note: 'This site' };
    if (segActive && id === SEG04_HUB) return { id, state: 'BUSY' as const, note: 'Link saturated; segment 04 movement traffic. Controlled mail queued' };
    const start = (i * 13 + 7) % 60;
    const inRekey = (minute - start + 60) % 60 < 3;
    return inRekey
      ? { id, state: 'DEGRADED' as const, note: 'QKD re-key in progress; traffic queued' }
      : { id, state: 'NOMINAL' as const, note: 'Link up; key current' };
  });
}

const stClass = (s: LinkState) => (s === 'DEGRADED' || s === 'BUSY' ? 'st-degraded' : 'st-nominal');

/* --------------------------------------------------------------- clock */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function sessionElapsed(now: number): string {
  const at = session.loginAt.value;
  if (!at) return '00:00:00';
  const s = Math.max(0, Math.floor((now - at) / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function Clock() {
  const now = new Date(session.tick.value);
  return (
    <div class="tray-clock" title={`In-world date ${session.formatInWorldDate(now)}. Site-local time is ALPHA-03 (Eastern).`}>
      <span class="mono">{session.zulu(now)}</span>
      <span class="mono tray-clock-local">({session.siteLocal(now)})</span>
      <span class="tray-clock-date">{session.formatInWorldDate(now)}</span>
    </div>
  );
}

/* ------------------------------------------------------- session panel */

export function SessionPanel() {
  const c = canonNow();
  const comps = session.compartments.value;
  const tier = session.tier.value;
  const acting = session.actingTier2.value;
  const div = c.divisions.find((d) => d.id === session.divisionId.value)?.name ?? session.divisionId.value;
  return (
    <table class="session-panel">
      <tbody>
        <tr>
          <th scope="row">Operator ID</th>
          <td class="mono">{session.operatorId.value}</td>
        </tr>
        <tr>
          <th scope="row">Tier</th>
          <td>
            Tier {tier}
            {acting ? ' (acting)' : ' (probationary analyst)'}
          </td>
        </tr>
        <tr>
          <th scope="row">Compartments</th>
          <td>{comps.length ? comps.join(', ') : 'None held'}</td>
        </tr>
        <tr>
          <th scope="row">Site</th>
          <td>
            {session.site.value}, {div}
          </td>
        </tr>
        <tr>
          <th scope="row">Probation</th>
          <td>
            Day {session.probationDay.value} of {session.PROBATION_LENGTH_DAYS}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ----------------------------------------------------- directory menu */

function recentTitle(path: string): string {
  const r = services.docs.byRoute(path);
  if (r) return `${r.docNo}  ${r.title}`;
  const app = APPS.find((a) => a.homeRoute === path);
  return app ? app.title : path;
}

export function DirectoryMenu() {
  const ref = useRef<HTMLDivElement>(null);
  const close = () => {
    directoryOpen.value = false;
    document.querySelector<HTMLElement>('.dir-button')?.focus();
  };

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest('.dir-button')) return;
      directoryOpen.value = false;
    };
    window.addEventListener('pointerdown', down, true);
    return () => window.removeEventListener('pointerdown', down, true);
  }, []);

  const appItems: MenuItem[] = APPS.map((a) => ({ label: a.title, action: () => services.openApp(a.id as AppId) }));
  // App home routes are already listed (Applications, and the shortcuts above), so recent
  // documents show documents only.
  const recents = recent.value.filter((p) => !APPS.some((a) => a.homeRoute === p)).slice(0, 6);
  const docItems: MenuItem[] = [
    { label: 'Records Library', action: () => services.openApp('records') },
    { label: 'Directives', action: () => services.openApp('directives') },
    { label: 'Forms', action: () => services.openApp('forms') },
    { label: 'Message Traffic', action: () => services.openApp('mail') },
    SEP,
    ...(recents.length
      ? recents.map((p) => ({ label: recentTitle(p), action: () => services.openRoute(p) }))
      : [{ label: 'No recent documents', disabled: true }]),
    SEP,
    { label: 'Settings', action: () => services.openRoute(services.docs.byRoute('/system/settings') ? '/system/settings' : '/system') },
    { label: 'Search...', shortcut: 'Ctrl+K', action: () => (searchOpen.value = true) },
    { label: 'Run...', shortcut: 'Alt+R', action: () => (runOpen.value = true) },
    SEP,
    { label: 'Lock workstation', shortcut: 'Alt+L', action: doLock },
    { label: 'Log off', action: doLogoff },
  ];

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const lists = [...(ref.current?.querySelectorAll<HTMLElement>('.sh-menu') ?? [])];
      const cur = lists.findIndex((l) => l.contains(document.activeElement));
      const next = lists[(cur + (e.key === 'ArrowRight' ? 1 : lists.length - 1)) % lists.length];
      next?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
      e.preventDefault();
    }
  };

  return (
    <div class="dir-menu" ref={ref} onKeyDown={onKey} role="dialog" aria-label="Directory">
      <div class="dir-head">
        <div class="dir-head-title">Directory</div>
        <SessionPanel />
      </div>
      <div class="dir-cols">
        <div class="dir-col">
          <div class="dir-col-h">Applications</div>
          <MenuList items={appItems} label="Applications" onDone={close} />
        </div>
        <div class="dir-col">
          <div class="dir-col-h">Documents and recent</div>
          <MenuList items={docItems} label="Documents" onDone={close} autoFocus={false} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- task buttons */

function taskMenu(w: Win, x: number, y: number): void {
  const mode = w.mode.peek();
  openMenu({
    x,
    y,
    label: `${w.title.peek()} task menu`,
    items: [
      { label: 'Restore', disabled: mode === 'normal' && !w.snap.peek(), action: () => restore(w.id) },
      { label: 'Minimize', disabled: mode === 'min', action: () => minimize(w.id) },
      { label: 'Maximize', disabled: mode === 'max', action: () => toggleMax(w.id) },
      SEP,
      { label: 'Close', action: () => w.handle.close() },
      {
        label: 'Close all windows of this application',
        disabled: !w.appId,
        action: () => windows.peek().filter((x) => x.appId === w.appId).forEach((x) => x.handle.close()),
      },
    ],
  });
}

function TaskButton({ w }: { w: Win }) {
  const active = activeId.value === w.id && w.mode.value !== 'min';
  const title = w.title.value;
  const docNo = w.docNo.value;
  return (
    <button
      type="button"
      class={`task-btn${active ? ' is-active' : ''}${w.mode.value === 'min' ? ' is-min' : ''}`}
      aria-pressed={active}
      title={`${docNo ? docNo + ' ' : ''}${title}`}
      onClick={() => (active && !handheldActive.peek() ? minimize(w.id) : focusWindow(w.id))}
      onContextMenu={(e) => {
        e.preventDefault();
        taskMenu(w, e.clientX, e.clientY);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
          e.preventDefault();
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          taskMenu(w, r.left, r.top - 4);
        }
      }}
    >
      {w.def ? <Icon id={w.def.icon} size={16} /> : <span class="task-btn-plain" />}
      <span class="task-btn-label">{docNo || title}</span>
      {w.busy.value && <span class="sr-only"> (busy)</span>}
    </button>
  );
}

/* ------------------------------------------------------------- tray */

function Tray() {
  const now = session.tick.value;
  const links = hubLinks(now);
  const unread = services.mail.unread.value;
  const pq = printQueue.value;
  const pop = trayPopup.value;
  const linkSummary = links.map((l) => `${l.id} ${l.state}`).join('; ');

  useEffect(() => {
    if (!pop) return;
    const down = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.tray')) trayPopup.value = null;
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') trayPopup.value = null;
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key);
    };
  }, [pop]);

  return (
    <div class="tray">
      <button
        type="button"
        class="tray-item tray-links"
        title={`Hub links: ${linkSummary}`}
        aria-label={`Hub links: ${linkSummary}`}
        aria-expanded={pop === 'links'}
        onClick={() => (trayPopup.value = pop === 'links' ? null : 'links')}
      >
        {links.map((l) => (
          <span key={l.id} class={`st-sq ${l.state === 'LOCAL' ? 'st-local' : stClass(l.state)}`} aria-hidden="true" />
        ))}
      </button>
      <button type="button" class="tray-item" title={`${unread} unread message${unread === 1 ? '' : 's'}`} onClick={() => services.openApp('mail')}>
        Mail <span class="mono">{unread}</span>
      </button>
      <button type="button" class="tray-item" title={`${pq} job${pq === 1 ? '' : 's'} in print queue`} onClick={() => services.openRoute(services.docs.byRoute('/system/print-queue') ? '/system/print-queue' : '/system')}>
        Print <span class="mono">{pq}</span>
      </button>
      <button
        type="button"
        class="tray-item"
        title="Session time. Select for session details."
        aria-expanded={pop === 'session'}
        onClick={() => (trayPopup.value = pop === 'session' ? null : 'session')}
      >
        <span class="mono">{sessionElapsed(now)}</span>
      </button>
      <Clock />
      {pop === 'links' && (
        <div class="tray-pop" role="dialog" aria-label="Hub link state">
          <div class="tray-pop-h">Hub links from {session.site.value}</div>
          <table class="tray-table">
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <th scope="row" class="mono">
                    {l.id}
                  </th>
                  <td>
                    <span class={`st-sq ${l.state === 'LOCAL' ? 'st-local' : stClass(l.state)}`} aria-hidden="true" /> {l.state}
                  </td>
                  <td class="tray-note">{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pop === 'session' && (
        <div class="tray-pop" role="dialog" aria-label="Session">
          <div class="tray-pop-h">Session, signed in {sessionElapsed(now)}</div>
          <SessionPanel />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ taskbar */

export function Taskbar() {
  const list = windows.value;
  const open = directoryOpen.value;
  const handheld = handheldActive.value;
  return (
    <nav class={`taskbar${handheld ? ' is-handheld' : ''}`} aria-label="Taskbar">
      <button
        type="button"
        class={`dir-button${open ? ' is-open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Directory (Alt+Home)"
        onClick={() => (directoryOpen.value = !open)}
      >
        <span class="dir-button-label">Directory</span>
      </button>
      <div class="task-list" role="toolbar" aria-label="Open windows">
        {list.map((w) => (
          <TaskButton key={w.id} w={w} />
        ))}
      </div>
      {!handheld && <Tray />}
      {handheld && (
        <div class="tray tray-compact">
          <span class="mono">{session.zulu(new Date(session.tick.value))}</span>
          <button type="button" class="tray-item" onClick={() => services.openApp('mail')}>
            Mail <span class="mono">{services.mail.unread.value}</span>
          </button>
        </div>
      )}
      {open && <DirectoryMenu />}
    </nav>
  );
}
