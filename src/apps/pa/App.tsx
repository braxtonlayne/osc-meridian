/**
 * Emergency Broadcast and Public Address console (pass two set piece, docs/SPEC-2.md §3).
 *
 * Zone selection per site controller, the numbered message library (recorded scripts shown as
 * text; tones are synthesized cues, no speech), live tone tests, the channel queue with
 * priority pre-emption, and the broadcast log. Plant state is the shared key `pa`
 * (./types.ts); seal drills and network isolation add automatic calls to it.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AccountId, AppProps, DrillState, IsolationState, RouteEntry, SoundCue } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { handheldActive, useServices } from '@core/services';
import { IN_WORLD_DATE_ISO, formatInWorldDate, siteLocal, zulu } from '@core/session';
import { Button, Dialog, MenuBar, MessageBox, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, type MenuBarMenu } from '@design/index';
import { Icon } from '@graphics/icons';
import { Console, TEST_MODES, TONE_ORDER } from './Console';
import { LogView, type SourceFilter } from './LogView';
import { ZonesView } from './ZonesView';
import {
  airtimeMs,
  allSites,
  appendRequests,
  authorise,
  autoBroadcasts,
  drillSites,
  historyRows,
  inTestWindow,
  keysOverlap,
  liveRows,
  makeRequest,
  messageByNo,
  pa,
  priorityName,
  restrictedIn,
  rowVisible,
  simulate,
  siteShort,
  toneMs,
  zonesOf,
  type Refusal,
} from './model';
import { DocBody, RouteRefusal, useDoc, useT2Names } from './shared';
import { PA_EMPTY, type PaRequest, type PaState } from './types';
import './pa.css';
import { isolatedAt } from '@apps/isolate/state';

type View = 'console' | 'log' | 'zones';
const TITLE = 'Emergency Broadcast and Public Address';
const DIRREF = pa.system.procedureDocNo.replace(/^OSC-/, '');
const VIEW_TITLE: Record<View, string> = { console: 'Public address console', log: 'Broadcast log', zones: 'Zone table' };
const ISOLATION_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };

/** Consequence messages per account (content/mail/pa/). */
const MAIL: Record<'zone' | 'restricted' | 'test' | 'lifesafety', Partial<Record<AccountId, string>>> = {
  zone: { analyst: 'msg-08-05741', deputy: 'msg-08-05742' },
  restricted: { deputy: 'msg-08-05743' },
  test: { deputy: 'msg-08-05744', lifesupport: 'msg-08-05745' },
  lifesafety: { lifesupport: 'msg-08-05746' },
};

interface Notice {
  title: string;
  body: string;
  reference?: string;
  kind?: 'info' | 'warning' | 'error';
}
interface Confirm {
  title: string;
  body: string;
  reference?: string;
  ok: string;
  run: () => void;
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const account = services.account.def.value;
  const own = account.site;
  const ownShort = siteShort(own);
  const paState = services.shared.get<PaState>('pa', PA_EMPTY).value;
  const drill = services.shared.get<DrillState | null>('drill', null).value;
  const iso = services.shared.get<IsolationState>('isolation', ISOLATION_NONE).value ?? ISOLATION_NONE;
  const reduced = services.settings.reducedMotion.value;
  const t2 = useT2Names();

  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<View>('console');
  const [site, setSite] = useState<string>(own);
  const [selection, setSelection] = useState<string[]>([]);
  const [allCall, setAllCall] = useState(false);
  const [msgNo, setMsgNo] = useState<string>(pa.messages.find((m) => m.use === 'operator' && m.priority === 4)?.no ?? pa.messages[0]!.no);
  const [testMode, setTestMode] = useState(0);
  const [tone, setTone] = useState(0);
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [logSel, setLogSel] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<string>(account.tier === 4 ? own : 'all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [zoneSite, setZoneSite] = useState<string>(own);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [nonce, setNonce] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const played = useRef<Set<string> | null>(null);
  const lastIsoActive = useRef(iso.active);

  /* ---------------------------------------------------------------- clock */

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      for (const x of timers.current) clearTimeout(x);
      timers.current = [];
    };
  }, []);

  const isolated = isolatedAt(iso, now);
  const dSites = useMemo(() => drillSites(drill), [drill]);
  const drillHere = dSites.has(own);
  const testWindow = inTestWindow(new Date(now), IN_WORLD_DATE_ISO);

  /* --------------------------------------------- automatic broadcasts */

  const sec = Math.floor(now / 1000);
  useEffect(() => {
    const add = autoBroadcasts(drill, iso, now, { isolationActive: lastIsoActive.current });
    lastIsoActive.current = iso.active;
    if (!add.length) return;
    const have = new Set(paState.requests.map((r) => r.autoKey).filter(Boolean));
    if (add.every((a) => a.autoKey && have.has(a.autoKey))) return;
    services.shared.update<PaState>('pa', PA_EMPTY, (prev) => appendRequests(prev ?? PA_EMPTY, add, IN_WORLD_DATE_ISO));
  }, [drill, iso, sec]);

  /* ------------------------------------------------------------ simulate */

  const outcomes = useMemo(() => simulate(paState, now), [paState, sec]);
  const byLabel = (by: PaRequest['by']) => (by === 'system' ? 'Zone controller (automatic)' : (services.account.all().find((a) => a.id === by)?.roleTitle ?? by));
  const live = useMemo(() => liveRows(paState, outcomes, IN_WORLD_DATE_ISO, byLabel), [paState, outcomes]);
  const history = useMemo(() => historyRows(), []);
  const allRows = useMemo(() => [...live, ...history].filter((r) => rowVisible(r, account)).sort((a, b) => b.sort - a.sort), [live, history, account.id]);

  const siteKey = (s: string) => [`${siteShort(s)}-*`];
  const channel = live.filter((r) => (r.status === 'ON AIR' || r.status === 'QUEUED') && keysOverlap(r.keys, siteKey(site)) && rowVisible(r, account)).sort((a, b) => a.sort - b.sort);

  /* --------------------------------------------- console monitor speaker */

  useEffect(() => {
    if (!played.current) {
      // Calls already on air when the console opens are not replayed.
      played.current = new Set(live.filter((r) => r.status !== 'QUEUED').map((r) => r.id));
      return;
    }
    for (const r of live) {
      if (r.status !== 'ON AIR' || played.current.has(r.id) || r.start == null) continue;
      played.current.add(r.id);
      if (!keysOverlap(r.keys, [`${ownShort}-*`])) continue;
      if (now - r.start > 3000) continue;
      const m = messageByNo(r.msg);
      if (!m) continue;
      playTones(m.pre);
      if (m.post) {
        const at = r.durationMs - toneMs(m.post);
        timers.current.push(setTimeout(() => playTones(m.post), Math.max(0, at - (now - r.start))));
      }
    }
  }, [live]);

  function playTones(id: string | null) {
    const t = pa.tones.find((x) => x.id === id);
    if (!t) return;
    // The muster (evacuation) and all-clear signals have their own synthesized cues.
    const own: SoundCue | null = t.id === 'EVAC' ? 'evac' : t.id === 'CLEAR' ? 'allclear' : null;
    if (own) {
      services.sound.play(own);
      return;
    }
    let at = 0;
    for (const s of t.steps) {
      const cue = s.cue as SoundCue;
      timers.current.push(setTimeout(() => services.sound.play(cue), at));
      at += s.ms;
    }
  }

  /* -------------------------------------------------------- helpers */

  const opId = services.session.operatorId.peek();
  const refuse = (r: Refusal, action: string) => {
    services.audit.log('window.open', `pa:${action}`, `Operator ${opId} attempted public address action "${action}" at console ${pa.system.consoleNo} (${own}). Refused: ${r.reason} Ref ${r.reference}.`);
    setNotice({ kind: 'warning', title: r.title, body: r.reason, reference: r.reference });
  };
  const deliverOnce = (key: keyof typeof MAIL, slots: Record<string, string>) => {
    const id = MAIL[key][account.id];
    if (!id || services.mail.delivered.peek().includes(id)) return;
    const d = new Date();
    services.mail.deliver(id, { slots: { date: formatInWorldDate(d), time: `${zulu(d)} (${siteLocal(d)})`, ...slots } });
  };
  const ctxZones = (): string[] => (allCall ? [`${siteShort(site)}-ALL`] : selection);
  const zoneWords = (zs: string[]) => zs.map((z) => (z.endsWith('-ALL') ? `the ${site} all-call (${zonesOf(site)?.allCall.length ?? 0} zones)` : z)).join(', ');

  const issue = (source: PaRequest['source'], msgNumber: string, zs: string[]): PaRequest | null => {
    const m = messageByNo(msgNumber);
    if (!m) return null;
    const req = makeRequest({ at: Date.now(), by: account.id, origin: own, source, message: m, zones: zs });
    const made: { r: PaRequest | null } = { r: null };
    services.shared.update<PaState>('pa', PA_EMPTY, (prev) => {
      const next = appendRequests(prev ?? PA_EMPTY, [req], IN_WORLD_DATE_ISO);
      made.r = next.requests[next.requests.length - 1] ?? null;
      return next;
    });
    return made.r;
  };

  /* -------------------------------------------------------- actions */

  const broadcast = () => {
    services.sound.play('button');
    const m = messageByNo(msgNo);
    const zs = ctxZones();
    if (!m) return;
    if (!zs.length) {
      setNotice({ kind: 'info', title: 'No zone selected', body: 'Select one or more zones, or press SITE ALL-CALL, before pressing BROADCAST.', reference: `${DIRREF} para 4` });
      return;
    }
    const v = authorise({ account, site: site as never, zones: zs, message: m, isolated, drillSites: dSites, kind: 'broadcast' });
    if (!v.ok) {
      refuse(v.refusal, 'broadcast');
      if (v.mail) deliverOnce(v.mail, { zone: zoneWords(zs), site, msg: m.no });
      return;
    }
    const go = () => {
      const r = issue('operator', m.no, zs);
      if (!r) return;
      services.audit.log(
        'control',
        'pa:broadcast',
        `Public address call ${r.id} originated at console ${pa.system.consoleNo} (${own}) by operator ${opId}: message ${m.no} (${m.title}) to ${zoneWords(zs)}, priority P${m.priority} ${priorityName(m.priority)}.`,
        { call: r.id, msg: m.no, zones: zs.join(','), site, priority: String(m.priority), airtimeSec: String(Math.round(airtimeMs(m) / 1000)) },
      );
      setSelectedCall(r.id);
      if (v.note === 'restricted') {
        const lv = restrictedIn(zs, account).map((z) => (z.level != null ? `Level ${z.level}` : z.id));
        deliverOnce('restricted', { zone: zoneWords(zs), level: lv.join(', '), call: r.id });
      }
    };
    if (m.priority === 1) {
      setConfirm({
        title: 'Life safety call',
        body: `Message ${m.no} (${m.title}) will pre-empt every call on ${zoneWords(zs)} and is read ${m.repeat} times. Confirm the call.`,
        reference: `${DIRREF} para 6`,
        ok: '&Broadcast',
        run: go,
      });
    } else go();
  };

  const cancel = () => {
    services.sound.play('button');
    const id = selectedCall ?? channel.find((r) => r.status === 'ON AIR' || r.status === 'QUEUED')?.id ?? null;
    const req = paState.requests.find((r) => r.id === id);
    const row = live.find((r) => r.id === id);
    if (!req || !row || (row.status !== 'ON AIR' && row.status !== 'QUEUED')) {
      setNotice({ kind: 'info', title: 'No call to cancel', body: 'Select a call on air or queued in the channel queue, then press CANCEL.', reference: `${DIRREF} para 6` });
      return;
    }
    if (req.by === 'system') {
      refuse({ title: 'Automatic call', reason: 'Calls sent by the zone controller on a seal drill or network event are ended by the controller, not from a console.', reference: `${DIRREF} para 7` }, 'cancel');
      return;
    }
    const mayCancel = req.by === account.id || (account.tier <= 2 && req.origin === own);
    if (!mayCancel) {
      refuse({ title: 'Call not originated here', reason: `Call ${req.id} was originated by another console. It is cancelled by its originator or by the site command section.`, reference: `${DIRREF} para 6` }, 'cancel');
      return;
    }
    services.shared.update<PaState>('pa', PA_EMPTY, (prev) => ({ ...(prev ?? PA_EMPTY), cancels: [...(prev ?? PA_EMPTY).cancels, { id: req.id, at: Date.now(), by: account.id }] }));
    services.audit.log('control', 'pa:cancel', `Public address call ${req.id} (message ${req.msg}) cancelled at console ${pa.system.consoleNo} (${own}) by operator ${opId} while ${row.status === 'ON AIR' ? 'on air' : 'queued'}.`, {
      call: req.id,
      msg: req.msg,
      was: row.status,
    });
  };

  const test = () => {
    services.sound.play('button');
    if (TEST_MODES[testMode] === 'OFF') {
      setNotice({ kind: 'info', title: 'Test mode off', body: 'Turn the MODE selector to MONITOR (console loudspeaker only) or ZONE (selected zones) before pressing TEST.', reference: `${DIRREF} para 8` });
      return;
    }
    if (TEST_MODES[testMode] === 'MONITOR') {
      playMonitor();
      return;
    }
    const zs = ctxZones();
    const m = pa.messages.find((x) => x.use === 'test')!;
    if (!zs.length) {
      setNotice({ kind: 'info', title: 'No zone selected', body: 'A zone tone test is made on selected zones or on the site all-call. Select zones first.', reference: `${DIRREF} para 8` });
      return;
    }
    const v = authorise({ account, site: site as never, zones: zs, message: m, isolated, drillSites: dSites, kind: 'test' });
    if (!v.ok) {
      refuse(v.refusal, 'test');
      if (v.mail) deliverOnce(v.mail, { zone: zoneWords(zs), site, msg: m.no });
      return;
    }
    const inWindow = inTestWindow(new Date(), IN_WORLD_DATE_ISO);
    const go = () => {
      const r = issue('test', m.no, zs);
      if (!r) return;
      services.audit.log(
        'control',
        'pa:test',
        `Zone tone test ${r.id} keyed at console ${pa.system.consoleNo} (${own}) by operator ${opId} on ${zoneWords(zs)}, ${inWindow ? 'within' : 'outside'} the published test window (${pa.testWindow.label}).`,
        { call: r.id, zones: zs.join(','), inWindow: String(inWindow) },
      );
      setSelectedCall(r.id);
      if (!inWindow) deliverOnce('test', { zone: zoneWords(zs), call: r.id, window: pa.testWindow.label });
    };
    if (!inWindow) {
      setConfirm({
        title: 'Outside the test window',
        body: `Tone tests are made ${pa.testWindow.label}. Tones heard in a zone outside the window are treated as a live call by personnel in that zone. Key the test on ${zoneWords(zs)} anyway?`,
        reference: `${DIRREF} para 8`,
        ok: '&Key test',
        run: go,
      });
    } else go();
  };

  const networkLocked = () => {
    services.sound.play('switch');
    refuse({ title: 'Key not present', reason: `Network all-call is keyed at ${pa.networkKey.heldBy}. Key ${pa.networkKey.keyNo} is not issued to this console.`, reference: `${DIRREF} para 5` }, 'network-all-call');
  };

  const toggleZone = (id: string, on: boolean) => {
    services.sound.play('switch');
    setSelection((s) => (on ? [...s.filter((x) => x !== id), id] : s.filter((x) => x !== id)));
  };
  const changeSite = (s: string) => {
    setSite(s);
    setSelection([]);
    setAllCall(false);
  };

  /* ------------------------------------------------------------ docs */

  const procedure = services.docs.byDocNo(pa.system.procedureDocNo);
  const library = services.docs.byDocNo(pa.system.libraryDocNo);
  const openDoc = (r: RouteEntry | undefined) => {
    if (r) win.navigate(r.route);
    else setNotice({ kind: 'warning', title: 'Document not on the index', body: 'The requested document is not held on the MERIDIAN index at this workstation.', reference: 'OSC-DIR-0412' });
  };
  const goView = (v: View) => {
    setView(v);
    if (route) win.navigate('/pa');
  };

  const print = () => {
    if (route) return services.print(route.id);
    setNotice({
      kind: 'warning',
      title: 'Reproduction not available',
      body: 'Console displays and broadcast log listings are not printed from the workstation. Log extracts are requested from Communications Security.',
      reference: `${DIRREF} para 9`,
    });
  };

  /* ------------------------------------------------- title and status */

  const markingNow: MarkingId = route ? route.marking : Object.keys(t2).length ? 'UMBRA-C' : 'UMBRA-R';
  const onAirN = channel.filter((r) => r.status === 'ON AIR').length;
  const queuedN = channel.filter((r) => r.status === 'QUEUED').length;
  const authority = account.auditReader ? 'REVIEW ONLY' : account.tier === 4 ? `${ownShort} ZONES` : account.tier === 3 ? 'DIVISION ZONE' : 'SITE COMMAND';
  const message = route
    ? `${route.docNo} · Rev ${route.revision}`
    : view === 'console'
      ? isolated
        ? `Hub circuits down. Only the ${own} controller can be reached.`
        : drillHere
          ? 'Seal drill in progress at this site. Routine calls and tests suspended.'
          : `Console ${pa.system.consoleNo}, ${own}. ${site !== own ? `Viewing ${site} controller.` : 'Select zones and a message, then BROADCAST.'}`
      : view === 'log'
        ? `${allRows.length} calls on record. Enter shows a call.`
        : `Zone table, ${zoneSite} controller.`;

  useEffect(() => {
    win.setTitle(route ? route.title : VIEW_TITLE[view], route?.docNo ?? '');
    win.setMarking(markingNow);
    win.setStatus(message);
  }, [route?.id, view, markingNow, message]);

  /* ------------------------------------------------------- handheld */

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setNarrow((e?.contentRect.width ?? 900) < 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = narrow || handheldActive.value;

  /* ------------------------------------------------------- keyboard */

  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (e.key === 'F5') {
      e.preventDefault();
      setNonce((n) => n + 1);
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey && k === 'p') {
      e.preventDefault();
      print();
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey && k === 'b' && !route) {
      e.preventDefault();
      broadcast();
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey && ['1', '2', '3'].includes(k)) {
      e.preventDefault();
      goView((['console', 'log', 'zones'] as View[])[Number(k) - 1]!);
    }
  };

  /* ---------------------------------------------------------- menus */

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: print },
        {
          label: '&Export log extract...',
          onSelect: () =>
            setNotice({
              kind: 'warning',
              title: 'Extract not available',
              body: `Broadcast log extracts are issued by Communications Security on request. The controller retains ${pa.system.logRetentionDays} days of records.`,
              reference: `${DIRREF} para 9`,
            }),
        },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Console', shortcut: 'Ctrl+1', radio: true, checked: !route && view === 'console', onSelect: () => goView('console') },
        { label: '&Broadcast log', shortcut: 'Ctrl+2', radio: true, checked: !route && view === 'log', onSelect: () => goView('log') },
        { label: '&Zone table', shortcut: 'Ctrl+3', radio: true, checked: !route && view === 'zones', onSelect: () => goView('zones') },
        { separator: true },
        { label: '&Refresh', shortcut: 'F5', onSelect: () => setNonce((n) => n + 1) },
      ],
    },
    {
      label: '&Call',
      items: [
        { label: '&Broadcast', shortcut: 'Ctrl+B', onSelect: () => (route ? goView('console') : broadcast()) },
        { label: '&Cancel selected call', onSelect: cancel },
        { separator: true },
        { label: '&Site all-call', checked: allCall, onSelect: () => setAllCall((a) => !a) },
        { label: '&Network all-call...', onSelect: networkLocked },
        { label: 'C&lear zone selection', onSelect: () => (setSelection([]), setAllCall(false)) },
      ],
    },
    {
      label: '&Test',
      items: [
        { label: '&Monitor test (console loudspeaker)', onSelect: () => (setTestMode(1), playMonitor()) },
        { label: '&Zone test...', onSelect: () => (setTestMode(2), goView('console')) },
        {
          label: 'Test &window...',
          onSelect: () =>
            setNotice({
              kind: 'info',
              title: 'Test window',
              body: `Zone tone tests are made ${pa.testWindow.label}. The window is ${testWindow ? 'open' : 'closed'} now. Monitor tests on the console loudspeaker may be made at any time.`,
              reference: `${DIRREF} para 8`,
            }),
        },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: '&Operating procedure', onSelect: () => openDoc(procedure) },
        { label: '&Message library and test window', onSelect: () => openDoc(library) },
        { separator: true },
        {
          label: '&About Public Address',
          onSelect: () =>
            setNotice({
              kind: 'info',
              title: 'About Public Address',
              body: `${TITLE}, ${pa.system.controller}. Console ${pa.system.consoleNo}. Message library of ${pa.messages.length} recorded messages; tones are generated by the controller. Calls and tests are recorded in the broadcast log and the workstation audit trail.`,
              reference: 'CMS/ALPHA-02',
            }),
        },
      ],
    },
  ];

  function playMonitor() {
    const toneId = TONE_ORDER[tone]!;
    playTones(toneId);
    services.audit.log('control', 'pa:monitor', `Console monitor tone test (${pa.tones.find((t) => t.id === toneId)?.name}) at console ${pa.system.consoleNo} (${own}) by operator ${opId}. No zone was keyed.`, { tone: toneId });
  }

  /* ----------------------------------------------------------- body */

  let main;
  if (route) {
    const t4Refused = account.tier === 4 && !route.t4;
    const tierRefused = route.access && !services.clearance.satisfies(`T${route.access.tier}`);
    main = t4Refused ? (
      <RouteRefusal entry={route} reason="Requires Tier 3 access determination." reference="DIR-0301" />
    ) : tierRefused ? (
      <RouteRefusal entry={route} reason={`Requires Tier ${route.access?.tier} access determination. Display of ${route.docNo} to this operator is not authorised.`} reference="OSC-DIR-0412" />
    ) : (
      <RouteView key={`${route.id}:${nonce}`} entry={route} onConsole={() => goView('console')} />
    );
  } else if (view === 'log') {
    const rows = allRows.filter((r) => {
      if (siteFilter !== 'all' && !(r.site === siteFilter || r.zones.some((z) => z.startsWith(`${siteShort(siteFilter)}-`)) || r.zones.includes('NET-ALL'))) return false;
      if (sourceFilter === 'all') return true;
      if (sourceFilter === 'auto') return r.source === 'drill' || r.source === 'isolation';
      return r.source === sourceFilter;
    });
    main = (
      <LogView
        account={account}
        rows={rows}
        selected={logSel}
        onSelect={setLogSel}
        siteFilter={siteFilter}
        onSiteFilter={setSiteFilter}
        sourceFilter={sourceFilter}
        onSourceFilter={setSourceFilter}
        sites={account.tier === 4 ? [own] : allSites()}
        t2={t2}
        compact={compact}
      />
    );
  } else if (view === 'zones') {
    main = (
      <ZonesView
        account={account}
        site={zoneSite}
        onSite={setZoneSite}
        zones={zonesOf(zoneSite)}
        onAir={live.filter((r) => r.status === 'ON AIR')}
        reachable={!isolated || zoneSite === own}
        t2={t2}
      />
    );
  } else {
    main = (
      <Console
        key={nonce}
        account={account}
        compact={compact}
        site={site}
        onSite={changeSite}
        zones={zonesOf(site)}
        selection={selection}
        onToggleZone={toggleZone}
        allCall={allCall}
        onAllCall={(on) => {
          services.sound.play('button');
          setAllCall(on);
        }}
        onNetworkLocked={networkLocked}
        t2={t2}
        msgNo={msgNo}
        onMsg={setMsgNo}
        testMode={testMode}
        onTestMode={(i) => {
          services.sound.play('switch');
          setTestMode(i);
        }}
        tone={tone}
        onTone={(i) => {
          services.sound.play('switch');
          setTone(i);
        }}
        onBroadcast={broadcast}
        onCancel={cancel}
        onTest={test}
        channel={channel}
        selectedCall={selectedCall}
        onSelectCall={setSelectedCall}
        now={now}
        isolated={isolated}
        drillHere={drillHere}
        testWindow={testWindow}
        reduced={reduced}
      />
    );
  }

  const tb = (label: string, v: View, title: string) => <ToolbarButton label={label} pressed={!route && view === v} onClick={() => goView(v)} title={title} />;

  return (
    <div class={compact ? 'pa-app pa-app--compact' : 'pa-app'} ref={rootRef} onKeyDown={onKey}>
      <MenuBar menus={menus} label="Public address menu" />
      <Toolbar label="Public address">
        {tb('Console', 'console', 'Console (Ctrl+1)')}
        {tb('Log', 'log', 'Broadcast log (Ctrl+2)')}
        {tb('Zones', 'zones', 'Zone table (Ctrl+3)')}
        <ToolbarSeparator />
        <ToolbarButton label="Broadcast" icon={<Icon id="chime" size={16} />} onClick={() => (route ? goView('console') : broadcast())} title="Broadcast the selected message (Ctrl+B)" />
        <ToolbarButton label="Cancel call" icon={<Icon id="stop" size={16} />} onClick={cancel} title="Cancel the selected call" />
        {!compact && <ToolbarButton label="Procedure" onClick={() => openDoc(procedure)} title={pa.system.procedureDocNo} />}
        <ToolbarSpacer />
      </Toolbar>
      {isolated && !route && (
        <div class="pa-banner" role="status">
          <span class="st-sq st-fault" aria-hidden="true" />
          Hub circuits down. Calls to other site controllers are not carried. Automatic message 35 sent to all sites.
        </div>
      )}
      {drillHere && !route && (
        <div class="pa-banner" role="status">
          <span class="st-sq" aria-hidden="true" />
          Seal drill {drill?.id ?? ''} in progress at {own}. Routine calls and tone tests are suspended.
        </div>
      )}
      <main class="pa-main">{main}</main>
      <StatusBar
        panes={[
          { id: 'msg', content: message, fill: true },
          { id: 'air', content: `AIR ${onAirN} · Q ${queuedN}`, width: 96, mono: true, label: 'Calls on air and queued at the selected site' },
          ...(compact ? [] : [{ id: 'win', content: testWindow ? 'TEST WINDOW OPEN' : 'TEST WINDOW CLOSED', width: 150, mono: true, label: 'Tone test window' }]),
          { id: 'hub', content: isolated ? 'HUB DOWN' : 'HUB UP', width: 76, mono: true, label: 'Hub circuits' },
          { id: 'auth', content: authority, width: compact ? 96 : 120, mono: true, label: 'Console authority' },
          ...(compact ? [] : [{ id: 'clk', content: zulu(new Date(now)), width: 60, mono: true, label: 'Time (Zulu)' }]),
        ]}
      />
      <MessageBox
        open={!!notice}
        kind={notice?.kind ?? 'info'}
        title={notice?.title ?? ''}
        reference={notice?.reference ? `Ref ${notice.reference}` : undefined}
        onOpen={(kd) => kd !== 'info' && services.sound.play('error')}
        onClose={() => setNotice(null)}
      >
        {notice?.body}
      </MessageBox>
      <Dialog
        open={!!confirm}
        kind="warning"
        title={confirm?.title ?? ''}
        reference={confirm?.reference ? `Ref ${confirm.reference}` : undefined}
        buttons={[
          { label: confirm?.ok ?? '&OK', value: 'ok' },
          { label: 'Cancel', value: 'cancel', isDefault: true, isCancel: true },
        ]}
        onClose={(v) => {
          const c = confirm;
          setConfirm(null);
          if (v === 'ok' && c) c.run();
        }}
      >
        {confirm?.body}
      </Dialog>
    </div>
  );
}

/** A document route of this app: a strip back to the console, then the document. */
function RouteView({ entry, onConsole }: { entry: RouteEntry; onConsole: () => void }) {
  const state = useDoc(entry);
  return (
    <div class="pa-route">
      <div class="pa-routebar">
        <span>
          {entry.docNo} is the reference the {pa.system.consoleNo} console is built to.
        </span>
        <Button label="Open &console" size="small" onClick={onConsole} />
      </div>
      <DocBody state={state} entry={entry} />
    </div>
  );
}
