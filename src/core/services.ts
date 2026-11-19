/**
 * The Services singleton (contract: src/core/contracts.ts). Apps reach the
 * shell only through this object: `import { services } from '@core/services'`
 * or the `useServices()` hook.
 */
import { computed, signal } from '@preact/signals';
import { effect } from '@preact/signals';
import type { AccountId, AppId, AuditEntry, DocJson, MailDeliverOptions, MailMeta, RouteEntry, Services, SoundCue } from './contracts';
import type { CompartmentId, TierNo } from './canon-types';
import * as audit from './audit';
import * as session from './session';
import { loadSync, saveSync, load, save, loadFrom, flush } from './persist';
import * as accounts from './accounts';
import { shared } from './shared';
import { createTraces, inboundMailTraces, processArrivals, traceMsgNo, traceSubject } from './traces';
import { hashOf, normalize, pushPath, replacePath } from './router';
import { heldHits, isHeldEntry } from './search';
import { readableByTier4 } from './docs';
import { APPS, appById, appForPath, isAppId } from '@apps/index';
import { canonNow, loadDoc, markingById, printDocument, searchRoutes } from '@shell/adapters';
import type { SearchHit } from '@shell/adapters';
import * as wm from '@shell/wm';
import type { Win } from '@shell/wm';
import { playCue, stopCue } from '@shell/sound';

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

/** Mail delivery state (shell-internal; apps read it through services.mail). */
export const mailState = {
  delivered: signal<string[]>([]),
  read: signal<string[]>([]),
  /** Delivery time and slot values per message (narrative engine). */
  meta: signal<Record<string, MailMeta>>({}),
};
/**
 * Unread count for the taskbar and services.mail.unread: delivered messages not read, plus
 * messages that arrived as traces (mail, finding, form.decided, notice) whose transfer number
 * (MSG-08-8xxxx) has no mail.read line yet. Message Traffic counts the same way.
 */
const unread = computed(() => {
  const r = new Set(mailState.read.value);
  const content = mailState.delivered.value.filter((id) => !r.has(id)).length;
  const traceMail = inboundMailTraces(traces.mine.value, accounts.activeId.value).filter((t) => !r.has(traceMsgNo(t))).length;
  return content + traceMail;
});

/** Replace `{token}` slots in a title with delivered values; an unfilled slot prints as a blank line. */
export function fillSlots(text: string, slots: Record<string, string> | undefined): string {
  return text.replace(/\{([A-Za-z]\w*)\}/g, (_m, k: string) => slots?.[k] ?? '________');
}

function persistMail(): void {
  save('mail', { delivered: mailState.delivered.peek(), read: mailState.read.peek(), meta: mailState.meta.peek() });
}

function deliverMail(msgId: string, opts: MailDeliverOptions = {}): void {
  const already = mailState.delivered.peek().includes(msgId);
  if (already && !opts.repeat) return;
  mailState.delivered.value = [...mailState.delivered.peek().filter((id) => id !== msgId), msgId];
  const read = mailState.read.peek().filter((id) => id !== msgId);
  mailState.read.value = opts.read ? [...read, msgId] : read;
  mailState.meta.value = { ...mailState.meta.peek(), [msgId]: { at: session.inWorldIso(), ...(opts.slots ? { slots: opts.slots } : {}) } };
  persistMail();
  if (opts.silent) return;
  cue('mail');
  const entry = byIdMap.get(msgId);
  notify(entry ? `New message: ${fillSlots(entry.title, opts.slots)}` : 'New message received.', { from: 'Message Traffic' });
}

export async function initStores(): Promise<void> {
  const m = await load<{ delivered: string[]; read: string[]; meta?: Record<string, MailMeta> }>('mail', { delivered: [], read: [] });
  mailState.delivered.value = m.delivered;
  mailState.read.value = m.read;
  mailState.meta.value = m.meta ?? {};
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

/**
 * Tier 4 rule (docs/SPEC-2.md §1, mechanism 1): a Tier 4 account sees a document only if
 * its RouteEntry is marked `t4` or the account has its own variant of it. Application
 * home routes are exempt (the application decides what it shows), and so is a message
 * that has been delivered to this account (it was addressed to the operator).
 */
export function t4Blocked(r: RouteEntry, tier: TierNo = session.baseTier.peek(), account: AccountId = accounts.activeId.peek()): boolean {
  if (tier !== 4 || readableByTier4(r) || r.variants?.includes(account)) return false;
  if (r.family === 'mail' && mailState.delivered.peek().includes(r.id)) return false;
  return !APPS.some((a) => a.homeRoute === normalize(r.route));
}

/** Short-form reference cited by the Tier 4 refusal (canon numbering: "DIR-0301"). */
export const T4_REFUSAL_REF = 'DIR-0301';

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
  const hash = hashOf(target);
  const entry = byRouteMap.get(p);
  const owner = entry ? appById(entry.app) : appForPath(p);
  if (
    !owner ||
    owner.id !== w.appId ||
    (entry && !heldEntry(entry)) ||
    (entry && t4Blocked(entry)) ||
    (entry && routeKey(entry) && !session.satisfies(routeKey(entry)!))
  ) {
    openRoute(p + hash);
    return;
  }
  if (p === w.path.peek()) {
    if (hash) goToAnchor(w, hash, true);
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
  pushPath(p, hash);
  if (hash) goToAnchor(w, hash, false);
}

/* ------------------------------------------------------------- anchors */

let anchorJob = 0;

/**
 * Scroll a window to the element named by a fragment once its content has
 * loaded (apps load lazily and fetch their document). Looks for an element
 * with that id, or a directive paragraph (`data-para`), inside the window and
 * scrolls only the window's own scrollers. Gives up after ~6 s.
 * When `announce` is set (the window was already open), a hashchange event is
 * dispatched so apps that track the fragment themselves (directives) follow it.
 */
function goToAnchor(w: Win, hash: string, announce: boolean): void {
  if (announce) {
    const old = location.href;
    pushPath(w.path.peek(), hash);
    if (location.href !== old) dispatchEvent(new HashChangeEvent('hashchange', { oldURL: old, newURL: location.href }));
  }
  const id = decodeURIComponent(hash.slice(1));
  if (!id || typeof document === 'undefined') return;
  const job = ++anchorJob;
  const until = performance.now() + 6000;
  const sel = `#${CSS.escape(id)}, [data-para="${CSS.escape(id.replace(/^para-/, ''))}"]`;
  const tick = () => {
    if (job !== anchorJob) return;
    const root = document.querySelector(`[data-win-id="${w.id}"] .win-body`);
    const el = root?.querySelector<HTMLElement>(sel);
    if (el && !root!.querySelector('.win-loading')) {
      scrollWithin(root as HTMLElement, el);
      return;
    }
    if (performance.now() < until) setTimeout(tick, 100);
  };
  setTimeout(tick, 0);
}

/** Scroll every scrollable ancestor of `el` up to `root` so `el` sits at the top; never the page. */
function scrollWithin(root: HTMLElement, el: HTMLElement): void {
  let node = el.parentElement;
  while (node) {
    if (node.scrollHeight > node.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(node).overflowY)) {
      const top = el.getBoundingClientRect().top - node.getBoundingClientRect().top;
      node.scrollTop += top;
    }
    if (node === root) break;
    node = node.parentElement;
  }
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

/** False only for a message the narrative has not yet delivered to this operator. */
function heldEntry(r: RouteEntry): boolean {
  return isHeldEntry(r, mailState.delivered.peek());
}

/** services.mail.isHeld: by docNo (or alias) or route path. Unknown documents count as held. */
function isHeld(docNoOrRoute: string): boolean {
  const k = docNoOrRoute.trim();
  const up = k.toUpperCase();
  const r =
    (k.startsWith('/') ? byRouteMap.get(normalize(k)) : undefined) ??
    byDocNoMap.get(up) ??
    byIdMap.get(k) ??
    routes.peek().find((x) => x.aliases?.some((a) => a.toUpperCase() === up));
  return r ? heldEntry(r) : true;
}

/** In-world refusal for an undelivered message. The subject is not shown: only the number asked for. */
function openNotHeld(path: string, entry: RouteEntry): Win {
  return openRefusal(
    path,
    'Message not held',
    {
      authority: 'MERIDIAN Message Centre',
      ref: entry.docNo,
      reason: `${entry.docNo} is not held in the mailbox of operator ${session.operatorId.peek()}. Messages are displayed to the addressee only after delivery.`,
    },
    entry.docNo,
  );
}

export interface OpenRouteOptions {
  push?: boolean;
}

export function openRoute(path: string, opts: OpenRouteOptions = {}): void {
  const p = normalize(path);
  if (p === '/') return;
  const hash = hashOf(path);
  const push = opts.push !== false;
  const existing = wm.windows.peek().find((w) => w.path.peek() === p);
  if (existing) {
    wm.focusWindow(existing.id);
    if (hash) goToAnchor(existing, hash, true);
    return;
  }
  const opened = openRouteNew(p, push, hash);
  if (opened && hash) goToAnchor(opened, hash, false);
}

/** Open a new window for a normalised path (route, app home, refusal or not-found). */
function openRouteNew(p: string, push: boolean, hash: string): Win | null {
  const pushIt = () => {
    if (push) pushPath(p, hash);
  };
  const entry = byRouteMap.get(p);
  if (entry && !heldEntry(entry)) {
    const w = openNotHeld(p, entry);
    pushIt();
    return w;
  }
  if (entry && t4Blocked(entry)) {
    const w = openRefusal(
      p,
      entry.title,
      {
        authority: 'Classification Control, Office of Internal Assurance',
        ref: T4_REFUSAL_REF,
        reason: `Requires Tier 3 access determination. Display of ${entry.docNo} to this operator is not authorised.`,
      },
      entry.docNo,
    );
    pushIt();
    return w;
  }
  if (entry) {
    const def = appById(entry.app);
    const key = routeKey(entry);
    if (key && !session.satisfies(key)) {
      const comp = entry.access?.compartment;
      const briefing = comp ? canonNow().compartments.find((c) => c.id === comp)?.briefingDocNo : undefined;
      const w = openRefusal(
        p,
        entry.title,
        {
          authority: 'Classification Control, Office of Internal Assurance',
          ref: briefing ?? entry.docNo,
          reason: `Requires Tier ${entry.access!.tier} access determination${comp ? ` and ${comp} compartment briefing` : ''}. Display of ${entry.docNo} to this operator is not authorised.`,
        },
        entry.docNo,
      );
      pushIt();
      return w;
    }
    if (def) {
      const w = openAppWindow(def.id, entry, p);
      pushIt();
      return w;
    }
  }
  const home = APPS.find((a) => a.homeRoute === p);
  if (home) {
    const w = openAppWindow(home.id, null, p);
    pushIt();
    return w;
  }
  const w = openRefusal(p, 'Path not found', {
    authority: 'MERIDIAN Directory Service',
    ref: 'DS-ERR-0404',
    reason: `No document or application is registered at ${p}.`,
    notFound: true,
  });
  pushIt();
  return w;
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
  // Undelivered messages are dropped before anything else: not listed, not counted as withheld.
  const raw = heldHits(await searchRoutes(q, routes.peek()), mailState.delivered.peek());
  const hits: SearchHit[] = [];
  let withheld = 0;
  for (const h of raw) {
    const key = routeKey(h.route);
    if (t4Blocked(h.route) || (key && !session.satisfies(key))) withheld++;
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

/* ------------------------------------------------------ accounts, traces */

/**
 * Leave this account for `id`: log off (if signed in), point storage at `id`, and
 * reload into its namespace. The next load skips the self-test; with `autologin`
 * (the visitor already signed in with that card) it goes straight to the desktop,
 * otherwise to the lock screen with that card selected.
 */
export async function switchAccount(id: AccountId, autologin: boolean): Promise<void> {
  if (session.signedIn.peek() && session.lockReason.peek() !== 'logoff') {
    audit.log('logout', session.operatorId.peek());
  }
  accounts.writePointer(id);
  accounts.writeSwitchNote({ to: id, autologin });
  stopCue('alarm');
  await flush();
  location.reload();
}

async function readAudit(id: AccountId): Promise<AuditEntry[]> {
  const me = accounts.activeDef.peek();
  if (!me.auditReader) {
    throw new Error(`Audit review is not open to operator ${session.operatorId.peek()}. Office of Internal Assurance auditors only.`);
  }
  if (id === me.id) return audit.entries.peek().slice();
  if (!accounts.accountById(id)) throw new Error(`No account ${id}.`);
  return (await loadFrom<AuditEntry[]>(id, 'audit', [])).slice();
}

const traces = createTraces(shared, () => accounts.activeId.peek(), () => session.inWorldIso());

/** Forms' decision consumer (lazy: the Forms routing module is not part of the shell chunk). */
async function runDecisions(): Promise<void> {
  try {
    const { applyDecisions } = await import('@apps/forms/decisions');
    applyDecisions(services);
  } catch (err) {
    console.error('MERIDIAN decisions', err);
  }
}

/**
 * Receive traces addressed to this account: once at sign-in (silent mail delivery)
 * and then live while signed in. Call after the audit trail and mail stores loaded.
 */
export async function startTraceWatch(): Promise<void> {
  const arrived = new Set(await load<string[]>('traces:arrived', []));
  let batch = true;
  const run = () => {
    if (!session.signedIn.peek()) return;
    const fresh = processArrivals(traces.mine.peek(), {
      me: accounts.activeId.peek(),
      arrived,
      accountById: accounts.accountById,
      opShort: accounts.operatorShort,
      log: (kind, subject, detail, data) => void audit.log(kind, subject, detail, data),
      deliver: deliverMail,
      markSeen: (id) => traces.markSeen(id),
      silent: batch,
      announce: (t) => {
        cue('mail');
        notify(`New message: ${traceSubject(t)}`, { from: 'Message Traffic' });
      },
    });
    const first = batch;
    batch = false;
    if (fresh.length) save('traces:arrived', [...arrived]);
    // Decisions on forms this account filed apply at sign-in and on arrival, with no window open.
    if (first || fresh.some((t) => t.kind === 'form.decided')) void runDecisions();
  };
  audit.subscribe((e) => {
    if (e.kind === 'login') {
      batch = true;
      queueMicrotask(run);
    }
  });
  effect(() => {
    void traces.mine.value;
    // Outside the effect: arrival writes back to the store (markSeen) and the audit trail.
    queueMicrotask(run);
  });
}

export const services: Services = {
  openRoute: (p) => openRoute(p),
  openApp,
  audit: {
    log: (kind, subject, detail, data) => void audit.log(kind, subject, detail, data),
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
    deliver: deliverMail,
    unread,
    delivered: mailState.delivered,
    read: mailState.read,
    meta: mailState.meta,
    isHeld,
  },
  sound: {
    play(cue: SoundCue) {
      if (sSound.peek()) playCue(cue);
    },
    stop(cue: SoundCue) {
      stopCue(cue);
    },
  },
  account: {
    id: accounts.activeId,
    def: accounts.activeDef,
    all: accounts.allAccounts,
    switchTo: (id) => void switchAccount(id, false),
    readAudit,
    byEmail: accounts.accountByEmail,
  },
  traces: {
    post: (t) => traces.post(t),
    all: traces.all,
    mine: traces.mine,
    markSeen: (id) => traces.markSeen(id),
  },
  shared,
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
      if (key === 'sound' && !sSound.peek()) stopCue('alarm');
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
