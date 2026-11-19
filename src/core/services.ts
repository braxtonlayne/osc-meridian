/**
 * The Services singleton (contract: src/core/contracts.ts). Apps reach the
 * shell only through this object: `import { services } from '@core/services'`
 * or the `useServices()` hook.
 */
import { computed, signal } from '@preact/signals';
import type { AppId, DocJson, RouteEntry, Services, SoundCue } from './contracts';
import type { CompartmentId, TierNo } from './canon-types';
import * as audit from './audit';
import * as session from './session';
import { loadSync, saveSync, load, save } from './persist';
import { normalize, pushPath, replacePath } from './router';
import { APPS, appById, appForPath, isAppId } from '@apps/index';
import { canonNow, loadDoc, markingById, printDocument, searchRoutes } from '@shell/adapters';
import type { SearchHit } from '@shell/adapters';
import * as wm from '@shell/wm';
import type { Win } from '@shell/wm';
import { playCue } from '@shell/sound';

/* ------------------------------------------------------------- settings */

interface SettingsState {
  sound: boolean;
  density: 'standard' | 'compact';
  reducedMotion: boolean;
  handheld: 'auto' | 'on' | 'off';
}
const sysReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const storedSettings = loadSync<Partial<SettingsState>>('settings', {});
const sSound = signal(storedSettings.sound ?? false);
const sDensity = signal<'standard' | 'compact'>(storedSettings.density ?? 'standard');
const sReduced = signal(storedSettings.reducedMotion ?? sysReduced);
const sHandheld = signal<'auto' | 'on' | 'off'>(storedSettings.handheld ?? 'auto');

function persistSettings(): void {
  saveSync('settings', { sound: sSound.peek(), density: sDensity.peek(), reducedMotion: sReduced.peek(), handheld: sHandheld.peek() });
}

/** Viewport narrower than 900px. */
export const narrowViewport = signal(typeof innerWidth === 'number' ? innerWidth < 900 : false);
if (typeof matchMedia !== 'undefined') {
  const mq = matchMedia('(max-width: 899.98px)');
  narrowViewport.value = mq.matches;
  mq.addEventListener('change', (e) => (narrowViewport.value = e.matches));
}
export const handheldActive = computed(() => sHandheld.value === 'on' || (sHandheld.value === 'auto' && narrowViewport.value));
export const motionReduced = computed(() => sReduced.value);

/* --------------------------------------------------------------- routes */

export const routes = signal<RouteEntry[]>([]);
const byRouteMap = new Map<string, RouteEntry>();
const byDocNoMap = new Map<string, RouteEntry>();
const byIdMap = new Map<string, RouteEntry>();

export function setRoutes(list: RouteEntry[]): void {
  byRouteMap.clear();
  byDocNoMap.clear();
  byIdMap.clear();
  for (const r of list) {
    byRouteMap.set(normalize(r.route), r);
    byDocNoMap.set(r.docNo.toUpperCase(), r);
    byIdMap.set(r.id, r);
  }
  routes.value = list;
}

/* ---------------------------------------------------- shell-side stores */

export interface Toast {
  id: number;
  text: string;
  from?: string;
}
export const toasts = signal<Toast[]>([]);
let toastSeq = 0;

export const printQueue = signal(0);
export const recent = signal<string[]>([]);
export const runHistory = signal<string[]>([]);

/** Mail delivery state; the Message Traffic app reads `delivered` and `read`. */
export const mailState = {
  delivered: signal<string[]>([]),
  read: signal<string[]>([]),
};
const unread = computed(() => {
  const r = new Set(mailState.read.value);
  return mailState.delivered.value.filter((id) => !r.has(id)).length;
});

function persistMail(): void {
  save('mail', { delivered: mailState.delivered.peek(), read: mailState.read.peek() });
}

export async function initStores(): Promise<void> {
  const m = await load<{ delivered: string[]; read: string[] }>('mail', { delivered: [], read: [] });
  mailState.delivered.value = m.delivered;
  mailState.read.value = m.read;
  recent.value = await load<string[]>('recent', []);
  runHistory.value = await load<string[]>('runHistory', []);
  audit.subscribe((e) => {
    if (e.kind === 'mail.read' && !mailState.read.peek().includes(e.subject)) {
      mailState.read.value = [...mailState.read.peek(), e.subject];
      persistMail();
    }
  });
}

function pushRecent(path: string): void {
  const next = [path, ...recent.peek().filter((p) => p !== path)].slice(0, 15);
  recent.value = next;
  save('recent', next);
}

export function pushRunHistory(cmd: string): void {
  const next = [cmd, ...runHistory.peek().filter((p) => p !== cmd)].slice(0, 20);
  runHistory.value = next;
  save('runHistory', next);
}

/* --------------------------------------------------------- open / route */

function routeKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  const t = `T${r.access.tier}`;
  return r.access.compartment ? `${r.access.compartment}+${t}` : t;
}

function appTitle(id: AppId | null): string {
  return (id && appById(id)?.title) || 'MERIDIAN';
}

function onFocus(w: Win): void {
  if (w.kind === 'app' || w.path.peek() !== '/') replacePath(w.path.peek());
}

function onClose(w: Win): void {
  audit.log('window.close', w.docNo.peek() || w.title.peek(), `Operator ${session.operatorId.peek()} closed ${describe(w)}.`);
  wm.removeWindow(w.id);
  if (!wm.windows.peek().length) replacePath('/');
}

function describe(w: Win): string {
  const doc = w.docNo.peek();
  const label = markingById(w.marking.peek()).label;
  if (w.kind === 'refusal') return `refusal notice "${w.title.peek()}"`;
  return doc ? `${doc} (${label}) in ${appTitle(w.appId)}` : `${appTitle(w.appId)}`;
}

function onNavigate(w: Win, target: string): void {
  const p = normalize(target);
  const entry = byRouteMap.get(p);
  const owner = entry ? appById(entry.app) : appForPath(p);
  if (!owner || owner.id !== w.appId || (entry && routeKey(entry) && !session.satisfies(routeKey(entry)!))) {
    openRoute(p);
    return;
  }
  w.path.value = p;
  w.route.value = entry ?? null;
  if (entry) {
    w.title.value = entry.title;
    w.docNo.value = entry.docNo;
    w.marking.value = entry.marking;
    audit.log('window.open', entry.docNo, `Operator ${session.operatorId.peek()} opened ${entry.docNo} (${markingById(entry.marking).label}) in ${owner.title}.`);
  }
  pushRecent(p);
  pushPath(p);
}

const hooks = { onFocus, onClose, onNavigate };

function openRefusal(path: string, title: string, refusal: { authority: string; ref: string; reason: string; notFound?: boolean }, docNo?: string): Win {
  cue('error');
  const w = wm.openWindow({
    kind: 'refusal',
    def: null,
    route: null,
    path,
    title,
    docNo,
    refusal: { title, docNo, ...refusal },
    ...hooks,
  });
  audit.log('window.open', docNo || path, `Operator ${session.operatorId.peek()} requested ${docNo || path}. Request refused: ${refusal.reason}`);
  return w;
}

export interface OpenRouteOptions {
  push?: boolean;
}

export function openRoute(path: string, opts: OpenRouteOptions = {}): void {
  const p = normalize(path);
  if (p === '/') return;
  const push = opts.push !== false;
  const existing = wm.windows.peek().find((w) => w.path.peek() === p);
  if (existing) {
    wm.focusWindow(existing.id);
    return;
  }
  const entry = byRouteMap.get(p);
  if (entry) {
    const def = appById(entry.app);
    const key = routeKey(entry);
    if (key && !session.satisfies(key)) {
      const comp = entry.access?.compartment;
      const briefing = comp ? canonNow().compartments.find((c) => c.id === comp)?.briefingDocNo : undefined;
      openRefusal(
        p,
        entry.title,
        {
          authority: 'Classification Control, Office of Internal Assurance',
          ref: briefing ?? entry.docNo,
          reason: `Requires Tier ${entry.access!.tier} access determination${comp ? ` and ${comp} compartment briefing` : ''}. Display of ${entry.docNo} to this operator is not authorised.`,
        },
        entry.docNo,
      );
      if (push) pushPath(p);
      return;
    }
    if (def) {
      openAppWindow(def.id, entry, p);
      if (push) pushPath(p);
      return;
    }
  }
  const home = APPS.find((a) => a.homeRoute === p);
  if (home) {
    openAppWindow(home.id, null, p);
    if (push) pushPath(p);
    return;
  }
  openRefusal(p, 'Path not found', {
    authority: 'MERIDIAN Directory Service',
    ref: 'DS-ERR-0404',
    reason: `No document or application is registered at ${p}.`,
    notFound: true,
  });
  if (push) pushPath(p);
}

function openAppWindow(id: AppId, entry: RouteEntry | null, path: string): Win | null {
  const def = appById(id);
  if (!def) return null;
  cue('window');
  const w = wm.openWindow({
    kind: 'app',
    def,
    route: entry,
    path,
    title: entry?.title ?? def.title,
    docNo: entry?.docNo,
    marking: entry?.marking,
    ...hooks,
  });
  audit.log(
    'window.open',
    entry?.docNo ?? def.title,
    entry
      ? `Operator ${session.operatorId.peek()} opened ${entry.docNo} (${markingById(entry.marking).label}) in ${def.title}.`
      : `Operator ${session.operatorId.peek()} opened ${def.title}.`,
  );
  pushRecent(path);
  return w;
}

export function openApp(id: AppId): void {
  const def = appById(id);
  if (!def) return;
  const existing = wm.windows.peek().find((w) => w.appId === id && w.route.peek() === null && w.path.peek() === def.homeRoute);
  if (existing) {
    wm.focusWindow(existing.id);
    return;
  }
  openRoute(def.homeRoute);
}

/** Restore the window for a path after browser back/forward. */
export function restorePath(path: string): void {
  const p = normalize(path);
  if (p === '/') return;
  const existing = wm.windows.peek().find((w) => w.path.peek() === p);
  if (existing) wm.focusWindow(existing.id);
  else openRoute(p, { push: false });
}

/* ------------------------------------------------------- notifications */

export function notify(text: string, opts?: { from?: string }): void {
  const t: Toast = { id: ++toastSeq, text, from: opts?.from };
  toasts.value = [...toasts.peek(), t].slice(-4);
  setTimeout(() => dismissToast(t.id), 7000);
}

export function dismissToast(id: number): void {
  toasts.value = toasts.peek().filter((t) => t.id !== id);
}

/* ---------------------------------------------------------------- print */

let printSeq = 0;

/**
 * Print a document (by RouteEntry id; falls back to the focused window's route):
 * DocumentView with cover sheet in a .print-root under <body> (see adapters.printDocument).
 */
function print(docId: string): void {
  const entry = byIdMap.get(docId) ?? wm.activeWin.peek()?.route.peek() ?? undefined;
  if (!entry) {
    notify('Nothing to print. Open a document and select Print from its window menu.', { from: 'Print queue' });
    return;
  }
  audit.log('print', entry.docNo);
  printQueue.value = printQueue.peek() + 1;
  const now = new Date();
  const copyNo = `${String(++printSeq).padStart(3, '0')}`;
  void loadDoc(entry.id)
    .then((doc) =>
      printDocument(doc, {
        onNavigate: (r) => openRoute(r),
        onRedactionHover: (i) => audit.log('redaction.hover', doc.docNo, `Operator ${session.operatorId.peek()} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`),
        copyNo,
        printedBy: session.operatorId.peek(),
        printedAt: `${session.formatInWorldDate(now)} ${session.zulu(now)}`,
      }),
    )
    .catch(() => {
      cue('error');
      notify(`${entry.docNo} could not be spooled. The document is not available to this workstation.`, { from: 'Print queue' });
    })
    .finally(() => setTimeout(() => (printQueue.value = Math.max(0, printQueue.peek() - 1)), 4000));
}

/* --------------------------------------------------------------- search */

let searchAuditTimer: ReturnType<typeof setTimeout> | null = null;

export async function searchAll(q: string): Promise<{ hits: SearchHit[]; withheld: number }> {
  const raw = await searchRoutes(q, routes.peek());
  const hits: SearchHit[] = [];
  let withheld = 0;
  for (const h of raw) {
    const key = routeKey(h.route);
    if (key && !session.satisfies(key)) withheld++;
    else hits.push(h);
  }
  if (q.trim()) {
    if (searchAuditTimer) clearTimeout(searchAuditTimer);
    searchAuditTimer = setTimeout(() => audit.log('search', q.trim()), 1200);
  }
  return { hits, withheld };
}

/* ------------------------------------------------------------- services */

function grant(key: CompartmentId | 'ACTING-T2', reason: string): void {
  const changed = key === 'ACTING-T2' ? session.setActingTier2(true) : session.addCompartment(key);
  if (!changed) return;
  const what = key === 'ACTING-T2' ? 'Acting Tier 2 determination' : `Compartment ${key}`;
  audit.log('clearance.grant', key, `${what} recorded against operator ${session.operatorId.peek()}. Basis: ${reason}`);
  notify(`${what} has been recorded against your access determination. Withheld material covered by it will be released on next display.`, {
    from: 'Classification Control',
  });
}

export const services: Services = {
  openRoute: (p) => openRoute(p),
  openApp,
  audit: {
    log: (kind, subject, detail) => void audit.log(kind, subject, detail),
    entries: audit.entries,
    subscribe: audit.subscribe,
  },
  session: {
    operatorId: session.operatorId,
    tier: session.tier,
    compartments: session.compartments,
    actingTier2: session.actingTier2,
    probationDay: session.probationDay,
    flags: session.flags,
    setFlag: session.setFlag,
  },
  clearance: {
    grant,
    satisfies: session.satisfies,
  },
  docs: {
    load: (id: string): Promise<DocJson> => loadDoc(id),
    byRoute: (r) => byRouteMap.get(normalize(r)),
    byDocNo: (d) => byDocNoMap.get(d.toUpperCase()),
    all: () => routes.peek(),
  },
  search: async (q) => (await searchAll(q)).hits,
  mail: {
    deliver(msgId: string) {
      if (mailState.delivered.peek().includes(msgId)) return;
      mailState.delivered.value = [...mailState.delivered.peek(), msgId];
      persistMail();
      cue('mail');
      const entry = byIdMap.get(msgId);
      notify(entry ? `New message: ${entry.title}` : 'New message received.', { from: 'Message Traffic' });
    },
    unread,
  },
  sound: {
    play(cue: SoundCue) {
      if (sSound.peek()) playCue(cue);
    },
  },
  settings: {
    sound: sSound,
    density: sDensity,
    reducedMotion: sReduced,
    handheld: sHandheld,
    set(key, value) {
      if (key === 'sound') sSound.value = Boolean(value);
      else if (key === 'density') sDensity.value = value === 'compact' ? 'compact' : 'standard';
      else if (key === 'reducedMotion') sReduced.value = Boolean(value);
      else if (key === 'handheld') sHandheld.value = value === 'on' || value === 'off' ? value : 'auto';
      persistSettings();
    },
  },
  notify,
  print,
};

/** Route a cue through the sound setting (shell-internal callers). */
function cue(c: SoundCue): void {
  services.sound.play(c);
}
// Shell modules call playCue via services so the setting is honoured.
export { cue as playCueIfEnabled };

export function useServices(): Services {
  return services;
}

/* ---------------------------------------------------------- run dialog */

export type RunResult = { ok: true; message?: string } | { ok: false; message: string };

/**
 * Interpret a Run dialog entry: route, docNo, app id/title, or a short command.
 * Shell-level commands are handled by the caller-supplied `commands` map.
 */
export function interpretRun(input: string, commands: Record<string, (arg: string) => RunResult>): RunResult {
  const raw = input.trim();
  if (!raw) return { ok: false, message: 'Enter a route, document number, application name or command.' };
  const [head = '', ...rest] = raw.split(/\s+/);
  const arg = rest.join(' ');
  const lower = head.toLowerCase();
  if (raw.startsWith('/')) {
    openRoute(raw);
    return { ok: true };
  }
  const doc = byDocNoMap.get(raw.toUpperCase()) ?? byDocNoMap.get(`OSC-${raw.toUpperCase()}`);
  if (doc) {
    openRoute(doc.route);
    return { ok: true };
  }
  if (lower === 'open' && arg) {
    const d = byDocNoMap.get(arg.toUpperCase()) ?? byDocNoMap.get(`OSC-${arg.toUpperCase()}`);
    if (d) {
      openRoute(d.route);
      return { ok: true };
    }
    if (arg.startsWith('/')) {
      openRoute(arg);
      return { ok: true };
    }
    return { ok: false, message: `MERIDIAN cannot find document ${arg.toUpperCase()}. Check the number against the register and try again.` };
  }
  if (isAppId(lower) && !arg) {
    openApp(lower);
    return { ok: true };
  }
  const byTitle = APPS.find((a) => a.title.toLowerCase() === raw.toLowerCase());
  if (byTitle) {
    openApp(byTitle.id);
    return { ok: true };
  }
  const cmd = commands[lower];
  if (cmd) return cmd(arg);
  return { ok: false, message: `MERIDIAN cannot find "${raw}". Check the route, document number or command name and try again. Type "help" for a list of commands.` };
}

export type { TierNo };
