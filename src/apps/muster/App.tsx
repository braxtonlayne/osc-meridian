/**
 * Muster Board: badge-reader muster by site, assembly point and reader. Operators initiate a
 * site muster (or a seal drill starts one), badges arrive at the assembly readers over exercise
 * time, sweep teams locate the rest, and the board is closed out with a signed, printable report.
 *
 * Plant state: shared key `muster` (types.ts), written only here. Reads: `drill`, `isolation`.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, DrillState, IsolationState } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { handheldActive, motionReduced, useServices } from '@core/services';
import { IN_WORLD_DATE_ISO, formatInWorldDate, tick, zulu, siteLocal } from '@core/session';
import { loadCanonT2, t2Path } from '@core/canon-release';
import { isRx, rxInfo } from '@core/rx';
import { MenuBar, MessageBox, Redaction, Select, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, type MenuBarMenu } from '@design/index';
import { ANN_NORMAL, annunciatorStep, type AnnPoint, type AnnunciatorTile, type GuardState } from '@graphics/panel';
import { MUSTER_NONE, type MusterRun, type MusterState } from './types';
import { addTally, allRuns, closeoutOf, currentRun, discrepancies, evaluate, nameVisible, reconciliation, runId, siteModel, upsertRun, type Person, type Read, type RunView, type Tally } from './model';
import { INPUTS, MC, MUSTER_SITES, PROC, PROC_SHORT, TS, canon, fmt, permsFor, signerLabel, tPlus, zuluOf } from './common';
import { CloseoutView, NetworkBoard, PointBoard, SiteBoard, siteStatus, type NetRow } from './views';
import { DocPane, RouteRefusal, routeKey } from './docs';
import { printCloseout } from './print';
import './muster.css';
import { isolatedAt } from '@apps/isolate/state';

type View = 'network' | 'site' | 'point' | 'closeout';
const HOME = '/muster';
const KEY = 'muster';
const ISO_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };
const MARKING: MarkingId = 'UMBRA-R';
const MAX_RUNS = 60;
const ZERO: Tally = { assigned: 0, present: 0, located: 0, roster: 0, unaccounted: 0, visitors: 0, unknown: 0 };

interface Notice {
  title: string;
  body: string;
  reference?: string;
  kind?: 'info' | 'warning' | 'error';
}

const TILES: { id: string; legend: string[]; priority: AnnunciatorTile['priority'] }[] = [
  { id: 'muster', legend: ['MUSTER', 'ALARM'], priority: 'alarm' },
  { id: 'unacc', legend: ['PERSONNEL', 'UNACCOUNTED'], priority: 'alarm' },
  { id: 'unknown', legend: ['BADGE NOT', 'ON STRENGTH'], priority: 'alarm' },
  { id: 'report', legend: ['REPORT', 'DUE'], priority: 'warning' },
  { id: 'capacity', legend: ['POINT OVER', 'CAPACITY'], priority: 'warning' },
  { id: 'sweep', legend: ['SWEEP TEAMS', 'OUT'], priority: 'status' },
  { id: 'oos', legend: ['READER NOT', 'IN SERVICE'], priority: 'status' },
  { id: 'drill', legend: ['SEAL DRILL', 'MUSTER'], priority: 'status' },
  { id: 'hub', legend: ['HUB CIRCUIT', 'DOWN'], priority: 'warning' },
];
const SPARES = 3;

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const acct = services.account.def.value;
  const tier = services.session.tier.value;
  const perms = useMemo(() => permsFor(acct), [acct.id]);
  const state = services.shared.get<MusterState>(KEY, MUSTER_NONE).value;
  const drill = services.shared.get<DrillState | null>('drill', null).value;
  const iso = services.shared.get<IsolationState>('isolation', ISO_NONE).value;
  const now = tick.value;
  const isolated = isolatedAt(iso, now);
  const homeSite = MUSTER_SITES.includes(acct.site) ? acct.site : MUSTER_SITES[0]!;
  const visibleSites = perms.network ? MUSTER_SITES : [homeSite];
  const offline = (s: string) => isolated && s !== acct.site;
  const reduced = services.settings.reducedMotion.value || motionReduced.value;

  const [view, setView] = useState<View>(perms.network ? 'network' : 'site');
  const [site, setSite] = useState<string>(homeSite);
  const [netSel, setNetSel] = useState<string | null>(homeSite);
  const [pointSel, setPointSel] = useState<string | null>(null);
  const [reader, setReader] = useState<string | null>(null);
  const [readSel, setReadSel] = useState<string | null>(null);
  const [coRun, setCoRun] = useState<string | null>(null);
  const [guard, setGuard] = useState<GuardState>('closed');
  const [sweepSel, setSweepSel] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [lampTest, setLampTest] = useState(false);
  const [t2, setT2] = useState<Record<string, string> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const compact = narrow || handheldActive.value;
  const op = services.session.operatorId.peek();

  /* ------------------------------------------------------------- runs and views */

  const runs = useMemo(() => allRuns(state, drill, MUSTER_SITES), [state, drill]);
  const views = useMemo(() => {
    const m = new Map<string, RunView | null>();
    for (const s of visibleSites) {
      const r = currentRun(runs, s);
      m.set(s, r ? evaluate(r, now, INPUTS, TS) : null);
    }
    return m;
  }, [runs, now, visibleSites.length]);
  const cur = views.get(site) ?? null;
  const siteRuns = runs.filter((r) => r.site === site);
  const coView = useMemo(() => {
    const r = coRun ? siteRuns.find((x) => x.id === coRun) : null;
    return r ? evaluate(r, now, INPUTS, TS) : cur;
  }, [coRun, siteRuns, now, cur]);
  const canControl = perms.controlSite === site && !offline(site);

  /* ------------------------------------------------------------- tier 2 names */

  useEffect(() => {
    if (!services.clearance.satisfies('T2')) return;
    let live = true;
    loadCanonT2()
      .then((m) => live && setT2(m))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [tier]);

  const nameOf = (p: Person) => {
    if (p.kind === 'visitor') return <span class="mus-dim">Visitor badge, escorted</span>;
    if (p.kind === 'unknown') return <span class="mus-unk">No directory entry. Not on posted strength.</span>;
    if (!p.pn) return <span class="mus-dim">Posted staff, {p.point}</span>;
    const rx = rxInfo(p.name);
    if (!nameVisible(p.tier, tier)) {
      return (
        <span>
          <Redaction len={rx?.len ?? p.name?.length ?? 12} auth="SFC" reference={`${PROC_SHORT} para 6`} onHover={(i) => logRx(i.auth, i.ref)} /> <span class="mus-dim">Tier {p.tier ?? '?'}</span>
        </span>
      );
    }
    const name = isRx(p.name) ? (t2?.[t2Path.rosterName(p.pn)] ?? null) : p.name;
    return (
      <span>
        {name ?? <Redaction len={rx?.len ?? 12} auth="SFC" reference={`${PROC_SHORT} para 6`} onHover={(i) => logRx(i.auth, i.ref)} />}
        {p.role ? `, ${p.role}` : ''}
      </span>
    );
  };
  const logRx = (auth: string, ref: string) =>
    services.audit.log('redaction.hover', `${PROC} muster board`, `Operator ${op} examined a withheld directory entry on the Muster Board (${auth} ${ref}). No release was made.`);

  /* ------------------------------------------------------------- refusals */

  const refuse = (action: string, n: Notice) => {
    services.sound.play('error');
    services.audit.log('window.open', `muster:${action}`, `Operator ${op} attempted ${action} on the Muster Board, ${site}. Refused: ${n.body}`, { site, action });
    setNotice({ kind: 'warning', ...n });
  };
  const refuseControl = (action: string): boolean => {
    if (offline(site)) {
      refuse(action, { title: 'No data from site', body: `The ${site} muster server is reached over the hub circuits, which are down. Board controls for ${site} are not available from this workstation while the network is isolated.`, reference: `${PROC_SHORT} para 9` });
      return true;
    }
    if (!canControl) {
      const r = perms.refusal(site);
      refuse(action, { title: 'Not authorised at this workstation', body: r.body, reference: r.reference });
      return true;
    }
    return false;
  };

  /* ------------------------------------------------------------- plant writes */

  const write = (fn: (s: MusterState) => MusterState) => services.shared.update<MusterState>(KEY, MUSTER_NONE, (s) => {
    const next = fn(s);
    return next.runs.length > MAX_RUNS ? { ...next, runs: next.runs.slice(next.runs.length - MAX_RUNS) } : next;
  });

  const onGuardLift = () => {
    if (refuseControl('initiate')) return;
    if (cur && !cur.closed) {
      refuse('initiate', { title: 'Muster in progress', body: `Muster ${cur.run.id} is in progress at ${site}. A new muster is initiated only after the current one is closed out.`, reference: `${PROC_SHORT} para 5.1` });
      return;
    }
    setGuard('lifted');
    services.sound.play('guard');
  };
  const onGuardClose = () => {
    setGuard('closed');
    services.sound.play('guard');
  };
  const onInitiate = () => {
    if (refuseControl('initiate')) return setGuard('closed');
    let id = '';
    const at = Date.now();
    write((s) => {
      const n = s.seq + 1;
      id = runId(site, IN_WORLD_DATE_ISO, n);
      const run: MusterRun = { id, site, startedAt: at, by: acct.id, drillId: null, sweeps: [], closeout: null, notices: [] };
      return { seq: n, runs: [...s.runs, run] };
    });
    setGuard('actuated');
    setCoRun(null);
    services.audit.log('control', 'muster:initiate', `Operator ${op} initiated site muster ${id} at ${site} from the Muster Board. Muster alarm sounded on all levels.`, { site, run: id, by: acct.id });
  };

  const onSweep = () => {
    if (refuseControl('sweep')) return;
    if (!cur || cur.closed) {
      refuse('sweep', { title: 'No muster in progress', body: `Sweep teams are tasked against a muster in progress. There is no open muster at ${site}.`, reference: `${PROC_SHORT} para 7` });
      return;
    }
    const pt = cur.model.points[sweepSel] ?? cur.model.points[0]!;
    const pv = cur.points.find((x) => x.point.id === pt.id);
    if (pv && pv.sweep !== 'none') {
      refuse('sweep', { title: 'Area already swept', body: `A sweep team has already been tasked to the area of ${pt.id} (${pt.location}) for muster ${cur.run.id}.`, reference: `${PROC_SHORT} para 7.2` });
      return;
    }
    if (cur.activeSweeps >= cur.model.cls.sweepTeams) {
      refuse('sweep', { title: 'No sweep team available', body: `All ${cur.model.cls.sweepTeams} sweep teams at ${site} are deployed. Task the next area when a team reports clear.`, reference: `${PROC_SHORT} para 7.3` });
      return;
    }
    const sw = { id: `SW-${cur.run.id}-${cur.run.sweeps.length + 1}`, point: pt.id, by: acct.id, at: Date.now() };
    write((s) => upsertRun(s, cur.run, (r) => ({ ...r, sweeps: [...r.sweeps, sw] })));
    services.sound.play('button');
    services.audit.log('control', 'muster:sweep', `Operator ${op} tasked sweep team ${sw.id} to ${pt.id} (${pt.location}), ${site}, muster ${cur.run.id}.`, { site, run: cur.run.id, point: pt.id, sweep: sw.id });
  };

  /** Account that receives a run's report: its initiator, or for a drill muster the resident account with control there. */
  const responsible = (r: MusterRun) => {
    if (r.by !== 'drill') return r.by;
    const d = services.account.all().find((a) => a.id === MC.siteAccounts[r.site]);
    return d && permsFor(d).controlSite === r.site ? d.id : undefined;
  };
  const slotsBase = () => ({ date: formatInWorldDate(new Date()) });
  const acctLabel = (id: string) => signerLabel(services.account.all().find((a) => a.id === id), id.toUpperCase());

  const onSign = () => {
    const v = coView;
    if (refuseControl('closeout')) return;
    if (!v || v.closed) {
      refuse('closeout', { title: 'Nothing to close out', body: `There is no open muster at ${site}.`, reference: `${PROC_SHORT} para 8` });
      return;
    }
    if (!v.reportDue) {
      refuse('closeout', { title: 'Report time not reached', body: `Close-out of ${v.run.id} is signed at or after the report time, ${tPlus(v.model.cls.reportMin)} on the exercise clock. Continue the muster.`, reference: `${PROC_SHORT} para 8.1` });
      return;
    }
    const co = closeoutOf(v, acct.id, Date.now());
    let won = false;
    write((s) => {
      const existing = s.runs.find((r) => r.id === v.run.id);
      if (existing?.closeout) return s;
      won = true;
      return upsertRun(s, v.run, (r) => ({ ...r, closeout: co, notices: [...r.notices, 'closeout'] }));
    });
    if (!won) return;
    services.sound.play('button');
    services.audit.log(
      'control',
      'muster:closeout',
      `Operator ${op} signed close-out of muster ${v.run.id} at ${site}: ${co.discrepancies.length === 0 ? 'reconciled' : `${co.discrepancies.length} discrepancies recorded`}.`,
      { site, run: v.run.id, discrepancies: String(co.discrepancies.length), unaccounted: String(co.unaccounted), unknown: String(co.unknown) },
    );
    if (co.discrepancies.length > 0) {
      const id = MC.mail.closeoutDiscrepancy;
      services.mail.deliver(id, { slots: { ...slotsBase(), run: v.run.id, site, count: String(co.discrepancies.length) }, repeat: services.mail.delivered.value.includes(id) });
      if (acct.id !== 'auditor') services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: MC.mail.oiaReferral, subject: `Muster close-out with discrepancies, ${v.run.id}` });
    }
  };

  /* ------------------------------------------------------------- consequences */

  useEffect(() => {
    for (const v of views.values()) {
      if (!v || v.closed || !v.reportDue || v.totals.unaccounted === 0) continue;
      if (v.run.notices.includes('unaccounted') || responsible(v.run) !== acct.id) continue;
      let won = false;
      write((s) => {
        const existing = s.runs.find((r) => r.id === v.run.id);
        if (existing?.notices.includes('unaccounted')) return s;
        won = true;
        return upsertRun(s, v.run, (r) => ({ ...r, notices: [...r.notices, 'unaccounted'] }));
      });
      if (!won) continue;
      const id = MC.mail.unaccounted;
      services.mail.deliver(id, {
        slots: { ...slotsBase(), run: v.run.id, site: v.run.site, count: String(v.totals.unaccounted), report: zuluOf(v.run.startedAt + (v.model.cls.reportMin * 60000) / TS) },
        repeat: services.mail.delivered.value.includes(id),
      });
    }
  }, [views]);

  /* ------------------------------------------------------------- annunciator */

  const cond = useMemo<Record<string, boolean>>(() => {
    const v = offline(site) ? null : cur;
    const open = !!v && !v.closed;
    return {
      muster: open,
      unacc: open && !!v?.reportDue && (v?.totals.unaccounted ?? 0) > 0,
      unknown: open && (v?.totals.unknown ?? 0) > 0,
      report: open && !!v?.reportDue,
      capacity: open && !!v?.points.some((p) => p.reads > p.point.capacity),
      sweep: open && (v?.activeSweeps ?? 0) > 0,
      oos: !!siteModel(site, INPUTS)?.readers.some((r) => !r.inService),
      drill: open && !!v?.run.drillId,
      hub: offline(site),
    };
  }, [cur, site, isolated]);
  const condSig = TILES.map((t) => (cond[t.id] ? '1' : '0')).join('');
  const annKey = `${site}|${cur?.run.id ?? ''}`;
  const [ann, setAnn] = useState<{ key: string; pts: Record<string, AnnPoint> }>({ key: '', pts: {} });
  const alarming = useRef(false);
  useEffect(() => {
    setAnn((prev) => {
      // A board opened on an existing condition shows it steady; new conditions flash.
      if (prev.key !== annKey) {
        const pts: Record<string, AnnPoint> = {};
        for (const t of TILES) pts[t.id] = cond[t.id] ? { seq: 'ack', abnormal: true } : ANN_NORMAL;
        return { key: annKey, pts };
      }
      let horn = false;
      const pts = { ...prev.pts };
      for (const t of TILES) {
        const p = pts[t.id] ?? ANN_NORMAL;
        const next = annunciatorStep(p, cond[t.id] ? 'abnormal' : 'normal');
        if (next.seq === 'unack' && p.seq !== 'unack' && t.priority !== 'status') horn = true;
        pts[t.id] = next;
      }
      if (horn && !alarming.current) {
        alarming.current = true;
        services.sound.play('alarm');
      }
      return { key: annKey, pts };
    });
  }, [annKey, condSig]);
  // A drill or a muster begun elsewhere while the board is open on that site sounds the horn.
  useEffect(() => () => services.sound.stop('alarm'), []);
  const tiles: AnnunciatorTile[] = [
    ...TILES.map((t) => ({ id: t.id, legend: t.legend, priority: t.priority, seq: lampTest ? ('ack' as const) : (ann.pts[t.id]?.seq ?? 'normal') })),
    ...Array.from({ length: SPARES }, (_, i) => ({ id: `spare${i}`, legend: ['SPARE'], seq: 'normal' as const, spare: true })),
  ];
  const onAck = (ids: string[]) => {
    setAnn((prev) => {
      const pts = { ...prev.pts };
      for (const id of ids.length ? ids : Object.keys(pts)) if (pts[id]) pts[id] = annunciatorStep(pts[id]!, 'ack');
      return { ...prev, pts };
    });
    if (alarming.current) {
      alarming.current = false;
      services.sound.stop('alarm');
    }
    services.sound.play('ack');
    services.audit.log('control', 'muster:ack', `Operator ${op} acknowledged muster annunciator at the ${site} board.`, { site, run: cur?.run.id ?? '' });
  };
  const onReset = (ids: string[]) => {
    setAnn((prev) => {
      const pts = { ...prev.pts };
      for (const id of ids.length ? ids : Object.keys(pts)) if (pts[id]) pts[id] = annunciatorStep(pts[id]!, 'reset');
      return { ...prev, pts };
    });
    services.sound.play('button');
  };
  const onTest = (on: boolean) => {
    setLampTest(on);
    if (on) services.sound.play('button');
  };

  /* ------------------------------------------------------------- badge lookup */

  const onLookup = (r: Read) => {
    services.sound.play('button');
    const p = r.person;
    let body: string;
    let result: string;
    if (r.kind === 'unknown') {
      result = 'not-on-strength';
      body = `Badge ${p.badge}, read at ${r.reader}. No person posted to ${site} holds this number, and it is not held against posted strength at any assembly point on this board. The read is recorded and reported to the Badge and Pass Office.`;
      const id = MC.mail.unknownBadge;
      if (!services.mail.delivered.value.includes(id)) {
        const badges = (cur?.reads ?? []).filter((x) => x.kind === 'unknown' && x.reader === r.reader).map((x) => x.badge);
        services.mail.deliver(id, { slots: { ...slotsBase(), site, reader: r.reader, badges: badges.join(', '), count: String(badges.length) } });
      }
    } else if (r.kind === 'visitor') {
      result = 'visitor';
      body = `Visitor badge ${p.badge}, issued at the portal against a visitor escort request. Visitors muster with their escort and are counted separately.`;
    } else if (p.pn && nameVisible(p.tier, tier)) {
      result = 'directory';
      body = `Badge ${p.badge} is held against posted strength at ${site}, assembly point ${p.point}. Directory entry ${p.pn}.`;
    } else {
      result = p.pn ? 'withheld' : 'posted';
      body = `Badge ${p.badge} is held against posted strength at ${site}, assembly point ${p.point}.${p.pn ? ' Directory entry withheld at this access level.' : ''}`;
    }
    services.audit.log('control', 'muster:lookup', `Operator ${op} looked up badge ${p.badge} read at ${r.reader}, ${site}.`, { site, badge: p.badge, reader: r.reader, result });
    setNotice({ kind: 'info', title: `Badge ${p.badge}`, body, reference: `${PROC_SHORT} para 6` });
  };

  /* ------------------------------------------------------------- print */

  const onPrint = () => {
    const v = view === 'closeout' ? coView : cur;
    if (!v) {
      refuse('print', { title: 'Nothing to print', body: `There is no muster on record at ${site}. A close-out report is printed from a muster in progress or a closed muster.`, reference: `${PROC_SHORT} para 8` });
      return;
    }
    const c = v.run.closeout;
    const signer = c ? signerLabel(services.account.all().find((a) => a.id === c.by), c.by.toUpperCase()) : null;
    services.sound.play('print');
    services.audit.log('print', v.run.id, `Operator ${op} printed close-out report ${v.run.id} (${c ? 'signed' : 'draft'}), ${site}.`);
    printCloseout({
      site,
      view: v,
      totals: c ?? v.totals,
      discrepancies: c ? c.discrepancies : discrepancies(v),
      signer,
      initiator: v.run.by === 'drill' ? undefined : acctLabel(v.run.by),
      marking: MARKING,
      printedBy: op,
      printedAt: `${formatInWorldDate(new Date())} ${zulu(new Date())}`,
      copyNo: String(services.audit.entries.peek().length % 1000).padStart(3, '0'),
    });
  };

  /* ------------------------------------------------------------- navigation */

  const go = (v: View) => {
    if (v === 'network' && !perms.network) {
      refuse('network', { title: 'Not available to this operator', body: 'Requires Tier 3 access determination. The board at this workstation shows this facility only.', reference: 'DIR-0301' });
      return;
    }
    if (v === 'point' && !pointSel) setPointSel(canon.musterPoints.find((s) => s.facility === site)?.points[0]?.id ?? null);
    setView(v);
    if (route) win.navigate(HOME);
  };
  const openSite = (s: string) => {
    if (!visibleSites.includes(s)) return;
    setSite(s);
    setNetSel(s);
    setPointSel(null);
    setReader(null);
    setReadSel(null);
    setCoRun(null);
    setGuard('closed');
    setSweepSel(0);
    services.sound.stop('alarm');
    alarming.current = false;
    setView('site');
    if (route) win.navigate(HOME);
  };
  const openPoint = (id: string) => {
    setPointSel(id);
    setReader(null);
    setReadSel(null);
    setView('point');
  };
  const openDoc = (docNo: string) => {
    const r = services.docs.byDocNo(docNo);
    if (r) win.navigate(r.route);
    else refuse('document', { title: 'Item not on the index', body: `${docNo} is not held on the MERIDIAN index at this workstation.`, reference: 'OSC-DIR-0412' });
  };

  /* ------------------------------------------------------------- title, status */

  const statusNow = siteStatus(offline(site) ? null : cur, offline(site));
  const title = route ? route.title : view === 'network' ? 'Muster Board, network' : `Muster Board, ${site}`;
  const message = route
    ? `${route.docNo} · ${route.originator}`
    : view === 'network'
      ? 'Latest muster at each site. Enter opens a site board.'
      : cur && !offline(site)
        ? `${cur.run.id} · ${tPlus(cur.elapsedMin)} · present ${fmt(cur.totals.present)} of ${fmt(cur.totals.assigned)}`
        : offline(site)
          ? `${site}: no data, hub circuit down`
          : `${site}: no muster in progress`;
  useEffect(() => {
    win.setTitle(title, route?.docNo ?? '');
    win.setMarking(route?.marking ?? MARKING);
    win.setStatus(message);
  }, [title, route?.id, message]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setNarrow((e?.contentRect.width ?? 900) < 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (route) services.print(route.id);
      else onPrint();
    }
  };

  /* ------------------------------------------------------------- menus */

  const procRoute = services.docs.byDocNo(PROC);
  const refRoute = services.docs.byDocNo(MC.system.reference);
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print close-out report...', shortcut: 'Ctrl+P', onSelect: () => (route ? services.print(route.id) : onPrint()) },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Network board', radio: true, checked: !route && view === 'network', onSelect: () => go('network') },
        { label: '&Site board', radio: true, checked: !route && view === 'site', onSelect: () => go('site') },
        { label: '&Assembly point and readers', radio: true, checked: !route && view === 'point', onSelect: () => go('point') },
        { label: '&Close-out report', radio: true, checked: !route && view === 'closeout', onSelect: () => go('closeout') },
        { separator: true },
        { label: `&Own site (${homeSite})`, onSelect: () => openSite(homeSite) },
      ],
    },
    {
      label: '&Muster',
      items: [
        {
          label: '&Initiate site muster...',
          onSelect: () => {
            if (view !== 'site' || route) go('site');
            onGuardLift();
          },
        },
        { label: '&Dispatch sweep team', onSelect: onSweep },
        { label: '&Acknowledge annunciator', onSelect: () => onAck([]) },
        {
          label: 'Si&gn close-out...',
          onSelect: () => {
            setView('closeout');
            onSign();
          },
        },
        { separator: true },
        {
          label: '&Stand down muster without close-out',
          onSelect: () =>
            refuse('standdown', {
              title: 'Not available',
              body: 'A muster stands down only by signed close-out. The board keeps an open muster until every assigned person is accounted for or the close-out records the difference.',
              reference: `${PROC_SHORT} para 8.3`,
            }),
        },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: `&Procedure (${PROC_SHORT})`, onSelect: () => openDoc(PROC) },
        { label: `Operator &reference (${MC.system.reference})`, onSelect: () => openDoc(MC.system.reference) },
        { separator: true },
        {
          label: '&About Muster Board',
          onSelect: () =>
            setNotice({
              kind: 'info',
              title: 'About Muster Board',
              body: `Muster Board, ${MC.system.name} release ${MC.system.release}, ${canon.meta.environment} release ${canon.meta.release}. Badge-reader muster by site, assembly point and reader, operated under ${PROC_SHORT}. Exercise and drill musters run at the seal-drill time scale.`,
              reference: MC.system.originator,
            }),
        },
      ],
    },
  ];

  /* ------------------------------------------------------------- main */

  let main;
  if (route) {
    const k = routeKey(route);
    main = !k || services.clearance.satisfies(k) ? <DocPane key={route.id} entry={route} /> : <RouteRefusal entry={route} />;
  } else if (view === 'network') {
    const rows: NetRow[] = canon.facilities.map((f) => {
      const sm = canon.musterPoints.find((s) => s.facility === f.id);
      return {
        site: f.id,
        cls: f.class,
        points: sm?.points.length ?? 0,
        assigned: sm ? sm.points.reduce((a, p) => a + p.assigned, 0) : null,
        view: views.get(f.id) ?? null,
        offline: offline(f.id),
        onNetwork: !!sm,
      };
    });
    const totals = rows.reduce<Tally>((a, r) => (r.view && !r.offline ? addTally(a, r.view.totals) : a), ZERO);
    main = <NetworkBoard rows={rows} rec={reconciliation(canon)} totals={totals} selected={netSel} onSelect={setNetSel} onOpen={openSite} compact={compact} />;
  } else if (view === 'site') {
    main = (
      <SiteBoard
        site={site}
        view={cur}
        offline={offline(site)}
        guard={guard}
        tiles={tiles}
        sweepSel={sweepSel}
        canControl={canControl}
        reducedMotion={reduced}
        now={now}
        onGuardLift={onGuardLift}
        onGuardClose={onGuardClose}
        onInitiate={onInitiate}
        onAck={onAck}
        onReset={onReset}
        onTest={onTest}
        onSweepSel={(i) => {
          setSweepSel(i);
          services.sound.play('switch');
        }}
        onSweep={onSweep}
        onCloseout={() => go('closeout')}
        onPrint={onPrint}
        onOpenPoint={openPoint}
        selectedPoint={pointSel}
        onSelectPoint={setPointSel}
        compact={compact}
      />
    );
  } else if (view === 'point') {
    const pid = pointSel ?? canon.musterPoints.find((s) => s.facility === site)!.points[0]!.id;
    main = (
      <PointBoard
        site={site}
        pointId={pid}
        view={cur}
        offline={offline(site)}
        reader={reader}
        onReader={setReader}
        selectedRead={readSel}
        onSelectRead={setReadSel}
        onLookup={onLookup}
        nameOf={nameOf}
        startedAt={cur?.run.startedAt ?? 0}
        compact={compact}
      />
    );
  } else {
    const c = coView?.run.closeout;
    main = (
      <CloseoutView
        site={site}
        runs={siteRuns}
        runIdSel={coRun}
        onRun={setCoRun}
        view={offline(site) ? null : coView}
        preview={coView ? discrepancies(coView) : []}
        signer={acct.displayName}
        signedBy={c ? acctLabel(c.by) : null}
        initiator={coView && coView.run.by !== 'drill' ? acctLabel(coView.run.by) : undefined}
        canSign={!!coView && !coView.closed}
        onSign={onSign}
        onPrint={onPrint}
        compact={compact}
      />
    );
  }

  const siteOptions = visibleSites.map((s) => ({ value: s, label: s }));
  const pointOptions = (canon.musterPoints.find((s) => s.facility === site)?.points ?? []).map((p) => ({ value: p.id, label: `${p.id} ${p.location}` }));

  return (
    <div class={compact ? 'mus-app mus-app--compact' : 'mus-app'} ref={rootRef} onKeyDown={onKey} data-motion={reduced ? 'reduced' : undefined}>
      <MenuBar menus={menus} label="Muster Board menu" />
      <Toolbar label="Muster Board views">
        {perms.network && <ToolbarButton label="Network" pressed={!route && view === 'network'} onClick={() => go('network')} title="Network board" />}
        <ToolbarButton label="Site" pressed={!route && view === 'site'} onClick={() => go('site')} title="Site board" />
        <ToolbarButton label="Point" pressed={!route && view === 'point'} onClick={() => go('point')} title="Assembly point and readers" />
        <ToolbarButton label="Close-out" pressed={!route && view === 'closeout'} onClick={() => go('closeout')} title="Close-out report" />
        <ToolbarSeparator />
        <ToolbarButton label="Print" onClick={() => (route ? services.print(route.id) : onPrint())} title="Print close-out report (Ctrl+P)" />
        {!compact && <ToolbarButton label={PROC_SHORT} pressed={route?.docNo === PROC} onClick={() => openDoc(PROC)} title={procRoute?.title ?? 'Muster procedure'} />}
        {!compact && <ToolbarButton label={MC.system.reference} pressed={route?.docNo === MC.system.reference} onClick={() => openDoc(MC.system.reference)} title={refRoute?.title ?? 'Operator reference'} />}
        <ToolbarSpacer />
      </Toolbar>
      {!route && (
        <div class="mus-pick">
          {perms.network ? <Select label="Site" value={site} onChange={openSite} options={siteOptions} /> : <span class="mus-pick__fixed">Site {site}</span>}
          {view === 'point' && <Select label="Point" value={pointSel ?? pointOptions[0]?.value ?? ''} onChange={openPoint} options={pointOptions} />}
        </div>
      )}
      <main class="mus-main">{main}</main>
      <StatusBar
        panes={[
          { id: 'msg', content: message, fill: true },
          { id: 'site', content: route ? 'DOCUMENT' : view === 'network' ? 'NETWORK' : site, width: 80, mono: true, label: 'Board' },
          { id: 'state', content: route || view === 'network' ? (isolated ? 'ISOLATED' : 'LINKED') : statusNow.word, width: compact ? 110 : 160, mono: true, label: 'Muster status' },
          { id: 'clock', content: `${zulu(new Date(now))} (${siteLocal(new Date(now))})`, width: 120, mono: true, label: 'Time' },
          { id: 'acc', content: `T${tier} ${perms.controlSite ? `CTL ${perms.controlSite}` : 'READ'}`, width: compact ? 90 : 130, mono: true, label: 'Access' },
        ]}
      />
      <MessageBox
        open={!!notice}
        kind={notice?.kind ?? 'info'}
        title={notice?.title ?? ''}
        reference={notice?.reference ? `Ref ${notice.reference}` : undefined}
        onClose={() => setNotice(null)}
      >
        {notice?.body}
      </MessageBox>
    </div>
  );
}

