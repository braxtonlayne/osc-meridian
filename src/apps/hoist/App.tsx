/**
 * Shaft Hoist Control (docs/SPEC-2.md §3): the hoists of the five ALPHA sites. Shaft elevation
 * (depth3d) with the cages at their live depth, the driver's depth indicator, the hoist driver's
 * console (panel kit), call stations, the shared event recorder and the shaft data sheet, plus
 * the two document routes under /hoist/.
 *
 * Plant state is the shared key `hoist` (types.ts): one physical plant for every account and tab.
 * Per account: any account may register calls and use the emergency stop at its own site; the
 * driver's console answers only to a Tier 2 issued account at its own site (the ALPHA-02 deputy
 * commander); the Tier 4 technician's site has no hoists. Network isolation removes all remote
 * control; a seal drill seals the portal landing.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TargetedKeyboardEvent } from 'preact';
import { DocumentView, MenuBar, MessageBox, Select, StatusBar, Tabs, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer } from '@design/index';
import type { MenuBarMenu, RedactionHoverInfo, StatusPane } from '@design/index';
import { ScanPage } from '@graphics/scan';
import { MarkingStrip as GMarkingStrip, Stamp } from '@graphics/banners';
import { Seal } from '@graphics/seal';
import { EmptyState, ErrorState, RefusalState } from '@graphics/states';
import { ANN_NORMAL, annunciatorStep, useReducedMotion } from '@graphics/panel';
import type { AnnPoint, AnnunciatorTile, GuardState } from '@graphics/panel';
import { DepthIndicator, ShaftElevation } from '@graphics/hoist';
import type { AppProps, DocJson, DrillState, IsolationState } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import { readableByTier4 } from '@core/docs';
import { loadCanonT2 } from '@core/canon-release';
import { formatInWorldDate, siteLocal, zulu } from '@core/session';
import { isolatedAt } from '@shell/isolation';
import { DriverConsole } from './Console';
import type { ConsoleHandlers } from './Console';
import { CallStations, FleetTable, Recorder, ShaftData } from './views';
import type { NameCtx } from './views';
import {
  EMPTY_STATE,
  HC,
  HOIST_SITES,
  M,
  authority,
  cageAt,
  call as callR,
  cancelCalls,
  canon,
  hoistById,
  hoistsAt,
  inch as inchR,
  interlocks,
  landingAt,
  landingRestriction,
  limits,
  loadLb,
  overloaded,
  positionWords,
  reset as resetR,
  run as runR,
  runRefusal,
  sealedSites,
  setGates as gatesR,
  setLoad as loadR,
  setMode as modeR,
  settle,
  startBrakeTest,
  stop as stopR,
  unitOf,
  vanes,
  zoneAt,
} from './model';
import type { PlantCtx } from './model';
import type { HoistMode, HoistState } from './types';
import './hoist.css';

type Tab = 'console' | 'calls' | 'recorder' | 'data' | 'fleet';
const TABS: { id: Tab; label: string }[] = [
  { id: 'console', label: "&Driver's console" },
  { id: 'calls', label: '&Call stations' },
  { id: 'recorder', label: '&Event recorder' },
  { id: 'data', label: '&Shaft data' },
  { id: 'fleet', label: '&All hoists' },
];

const ISO_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };
const TITLE = 'Shaft Hoist Control';
const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
const markingLabel = (m: MarkingId) => canon.markings.find((x) => x.id === m)?.label ?? m;

interface DialogState {
  title: string;
  body: string;
  reference?: string;
  kind: 'info' | 'error';
}

function MarkingStrip({ marking }: { marking: MarkingId }) {
  const m = canon.markings.find((x) => x.id === marking);
  return m ? <GMarkingStrip marking={m} /> : null;
}

const TILE_DEFS: { id: string; legend: string[]; priority: AnnunciatorTile['priority'] }[] = [
  { id: 'estop', legend: ['EMERGENCY', 'STOP'], priority: 'alarm' },
  { id: 'limit', legend: ['FINAL', 'LIMIT'], priority: 'alarm' },
  { id: 'overload', legend: ['CAGE', 'OVERLOAD'], priority: 'alarm' },
  { id: 'remote', legend: ['REMOTE', 'CONTROL LOST'], priority: 'warning' },
  { id: 'seal', legend: ['PORTAL', 'SEALED'], priority: 'warning' },
  { id: 'brake', legend: ['BRAKE TEST', 'DUE'], priority: 'warning' },
  { id: 'gates', legend: ['GATES', 'OPEN'], priority: 'status' },
  { id: 'calls', legend: ['CALL', 'REGISTERED'], priority: 'status' },
];

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const acct = services.account.def.value;
  const operator = services.session.operatorId.value;
  const who = { id: acct.id, tier: acct.tier, site: acct.site };
  const tier4 = acct.tier === 4;
  const satisfies = (k: string) => services.clearance.satisfies(k);
  const clearanceSig = `${services.session.tier.value}|${services.session.compartments.value.join(',')}`;
  const reducedMotion = useReducedMotion(services.settings.reducedMotion.value || undefined);

  /* ---- shared plant state */
  const hs = services.shared.get<HoistState>('hoist', EMPTY_STATE).value;
  const iso = services.shared.get<IsolationState>('isolation', ISO_NONE).value;
  const drill = services.shared.get<DrillState | null>('drill', null).value;

  /* ---- view state */
  const sites = tier4 ? HOIST_SITES.filter((s) => s === acct.site) : [...HOIST_SITES];
  const [site, setSite] = useState<string>(sites.includes(acct.site) ? acct.site : (sites[0] ?? acct.site));
  const siteHoists = hoistsAt(site);
  const [hoistId, setHoistId] = useState<string>(siteHoists[0]?.id ?? '');
  const h = hoistById(hoistId) ?? siteHoists[0];
  const [tab, setTab] = useState<Tab>(acct.tier <= M.driverMaxTier ? 'console' : 'calls');
  const [target, setTarget] = useState<number | null>(null);
  const [guard, setGuard] = useState<GuardState>('closed');
  const [scope, setScope] = useState<'site' | 'all'>('site');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [message, setMessage] = useState('Ready');
  const [lampTest, setLampTest] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);
  const [t2, setT2] = useState<Record<string, string> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const isDocRoute = !!route && route.app === 'hoist' && route.family === 'hoist';
  const unit = h ? unitOf(hs, h) : null;
  const ctx: PlantCtx = { now, isolated: isolatedAt(iso, now), sealed: sealedSites(drill, now), dateLabel: formatInWorldDate() };
  const cage = h && unit ? cageAt(unit, now) : null;
  const auth = h ? authority(who, h, ctx.isolated) : null;

  /* ---- clock: 10 Hz while a cage at this site moves and the window is shown, else 1 Hz */
  const siteMoving = siteHoists.some((x) => {
    const u = unitOf(hs, x);
    return u.motion != null || u.brakeTesting != null;
  });
  useEffect(() => {
    const shown = () => !document.hidden && !!rootRef.current && rootRef.current.offsetParent !== null;
    const id = window.setInterval(() => {
      if (shown() || !siteMoving) setNow(Date.now());
    }, siteMoving ? 100 : 1000);
    return () => window.clearInterval(id);
  }, [siteMoving]);

  /* ---- advance the plant (idempotent; any open window may do it) */
  const lastSettle = useRef(0);
  useEffect(() => {
    const r = settle(hs, ctx);
    if (!r.changed || now - lastSettle.current < 50) return;
    lastSettle.current = now;
    services.shared.update<HoistState>('hoist', EMPTY_STATE, (prev) => settle(prev, ctx).state);
    for (const f of r.finished) {
      if (f.by !== acct.id) continue;
      const fh = hoistById(f.hoist);
      const z = fh ? zoneAt(fh, f.restFt) : null;
      const msg = HC.mail.position[acct.id];
      if (fh && z && !z.listed && msg && !services.mail.delivered.value.includes(msg)) {
        services.mail.deliver(msg, { slots: slotsFor(fh, f.restFt, {}) });
      }
    }
  }, [now, hs]);

  /* ---- CANON-T2 level designations (only when T2 is satisfied) */
  useEffect(() => {
    if (!satisfies('T2') || t2) return;
    loadCanonT2()
      .then((v) => setT2(v))
      .catch(() => undefined);
  }, [clearanceSig]);

  /* ---- hoist selection follows the site */
  useEffect(() => {
    if (!siteHoists.some((x) => x.id === hoistId)) setHoistId(siteHoists[0]?.id ?? '');
    setTarget(null);
  }, [site]);
  useEffect(() => {
    setTarget(null);
    setGuard(unit?.trip?.cause === 'estop' ? 'actuated' : 'closed');
  }, [hoistId]);
  useEffect(() => {
    if (!unit?.trip && guard === 'actuated') setGuard('closed');
  }, [unit?.trip]);

  /* ---- motion sounds for the cage on screen */
  const wasMoving = useRef<boolean | null>(null);
  useEffect(() => {
    const m = !!cage?.moving;
    if (wasMoving.current != null && m !== wasMoving.current) services.sound.play(m ? 'hoist' : 'relay');
    wasMoving.current = m;
  }, [cage?.moving, hoistId]);
  useEffect(() => {
    wasMoving.current = null;
  }, [hoistId]);

  /* ---- annunciator */
  const abnormal: Record<string, boolean> = unit && h
    ? {
        estop: unit.trip?.cause === 'estop',
        limit: unit.trip?.cause === 'overtravel',
        overload: overloaded(unit, h),
        remote: ctx.isolated,
        seal: ctx.sealed.has(h.facility),
        brake: unit.brakeTest?.date !== ctx.dateLabel,
        gates: unit.gates === 'open',
        calls: unit.calls.length > 0,
      }
    : {};
  const abnSig = TILE_DEFS.map((t) => (abnormal[t.id] ? '1' : '0')).join('');
  const [ann, setAnn] = useState<{ hoist: string; points: Record<string, AnnPoint> }>({ hoist: '', points: {} });
  useEffect(() => {
    if (!h) return;
    setAnn((prev) => {
      const fresh = prev.hoist !== h.id;
      const points: Record<string, AnnPoint> = {};
      let newAlarm = false;
      for (const t of TILE_DEFS) {
        const was = fresh ? undefined : prev.points[t.id];
        if (!was) {
          // On selecting a hoist, standing conditions show steady (acknowledged).
          points[t.id] = abnormal[t.id] ? { seq: fresh ? 'ack' : 'unack', abnormal: true } : ANN_NORMAL;
          if (!fresh && abnormal[t.id] && t.priority === 'alarm') newAlarm = true;
          continue;
        }
        const next = annunciatorStep(was, abnormal[t.id] ? 'abnormal' : 'normal');
        if (t.priority === 'alarm' && next.seq === 'unack' && was.seq !== 'unack') newAlarm = true;
        points[t.id] = next;
      }
      if (newAlarm) services.sound.play('alarm');
      return { hoist: h.id, points };
    });
  }, [abnSig, h?.id]);
  const tiles: AnnunciatorTile[] = TILE_DEFS.map((t) => ({ id: t.id, legend: t.legend, priority: t.priority, seq: ann.points[t.id]?.seq ?? 'normal' }));
  const annAck = (ids: string[]) => {
    setAnn((prev) => {
      const points = { ...prev.points };
      for (const id of ids) if (points[id]) points[id] = annunciatorStep(points[id], 'ack');
      const alarmsLeft = TILE_DEFS.some((t) => t.priority === 'alarm' && points[t.id]?.seq === 'unack');
      if (!alarmsLeft) services.sound.stop('alarm');
      return { ...prev, points };
    });
    services.sound.play('ack');
    if (h) services.audit.log('control', 'hoist:ack', `Operator ${operator} acknowledged ${ids.length} alarm window${ids.length === 1 ? '' : 's'} on the ${h.id} console.`, { hoist: h.id, windows: ids.join(',') });
  };
  const annReset = (ids: string[]) =>
    setAnn((prev) => {
      const points = { ...prev.points };
      for (const id of ids) if (points[id]) points[id] = annunciatorStep(points[id], 'reset');
      return { ...prev, points };
    });
  useEffect(() => () => services.sound.stop('alarm'), []);

  /* ---- documents */
  const docAllowed = !isDocRoute || (!(tier4 && !readableByTier4(route!)) && (!route!.access || satisfies(route!.access.compartment ? `${route!.access.compartment}` : `T${route!.access.tier}`)));
  useEffect(() => {
    if (!isDocRoute) {
      setDoc(null);
      return;
    }
    if (!docAllowed) {
      services.audit.log('window.open', route!.docNo, `Operator ${operator} requested ${route!.docNo} in Shaft Hoist Control. Request refused: ${tier4 ? 'Tier 4 access determination, DIR-0301' : `requires Tier ${route!.access?.tier ?? 3} access determination`}.`);
      services.sound.play('error');
      return;
    }
    let live = true;
    setDoc(null);
    setDocErr(null);
    win.setBusy(true);
    services.docs
      .load(route!.id)
      .then((d) => {
        if (!live) return;
        setDoc(d);
        services.audit.log('doc.read', d.docNo, `Displayed ${d.docNo} (${markingLabel(d.marking)}) to operator ${operator} in Shaft Hoist Control.`);
      })
      .catch((e: unknown) => live && setDocErr(e instanceof Error ? e.message : String(e)))
      .finally(() => live && win.setBusy(false));
    return () => {
      live = false;
      win.setBusy(false);
    };
  }, [route?.id, docAllowed, clearanceSig]);

  /* ---- title and marking */
  const marking: MarkingId = isDocRoute ? (docAllowed ? route!.marking : 'TSSCI-OSC') : site === acct.site ? 'TSSCI-OSC' : 'UMBRA-C';
  useEffect(() => {
    if (isDocRoute) win.setTitle(route!.title, route!.docNo);
    else win.setTitle(h ? `${TITLE}: ${h.id} ${h.name}` : TITLE, '');
    win.setMarking(marking);
    win.setStatus(isDocRoute ? route!.docNo : h ? `${h.id} ${unit?.mode.toUpperCase() ?? ''}` : TITLE);
  }, [route?.id, h?.id, unit?.mode, marking]);

  /* ---- actions ---------------------------------------------------------------- */

  const subjectOf = (action: string) => `hoist:${action}`;
  const refuse = (title: string, body: string, action: string, reference = HC.docs.procedure) => {
    services.audit.log('window.open', subjectOf(action), `Operator ${operator} attempted ${title.toLowerCase()} on ${h?.id ?? 'a hoist'} in Shaft Hoist Control. Refused: ${body}`, { hoist: h?.id ?? '', action });
    setDialog({ title, body, reference: `Ref ${reference}`, kind: 'error' });
    setMessage(`${title}: refused.`);
  };
  const log = (action: string, detail: string, data: Record<string, string>) => services.audit.log('control', subjectOf(action), detail, { hoist: h?.id ?? '', facility: h?.facility ?? '', ...data });
  const update = (fn: (prev: HoistState) => HoistState) => services.shared.update<HoistState>('hoist', EMPTY_STATE, fn);
  const timeSlot = () => {
    const d = new Date();
    return `${zulu(d)} (${siteLocal(d)})`;
  };
  function slotsFor(hh: NonNullable<typeof h>, restFt: number, extra: Record<string, string>): Record<string, string> {
    return { date: formatInWorldDate(), time: timeSlot(), hoist: hh.id, hoistName: hh.name, facility: hh.facility, position: positionWords(hh, restFt), depth: fmt(restFt), operator, ...extra };
  }
  const needDrive = (action: string, title: string): boolean => {
    if (!h || !auth) return false;
    if (auth.drive) return true;
    refuse(title, auth.why || `The driver's console of ${h.id} is not operable from this workstation.`, action);
    return false;
  };

  const on: ConsoleHandlers = {
    target(level) {
      if (!h || !needDrive('select', 'Level selection')) return;
      const r = landingRestriction(h, level, satisfies);
      if (r) return refuse('Level selection', r.text, 'select', 'OSC-DIR-0412');
      setTarget(level);
      services.sound.play('button');
      setMessage(`Landing ${level} selected (${fmt(h.stops.find((s) => s.level === level)!.depthFt)} ft).`);
    },
    run() {
      if (!h || !unit || !needDrive('run', 'Run')) return;
      if (unit.mode === 'auto') return refuse('Run', 'The hoist is in AUTOMATIC and answers registered calls. Turn the mode key to MANUAL to run the cage from the console.', 'run');
      if (target == null) return refuse('Run', 'No landing is selected. Select a landing on the level selector, then press RUN.', 'run');
      const why = runRefusal(unit, h, target, ctx);
      if (why) return refuse('Run', why, 'run');
      const from = cageAt(unit, Date.now()).posFt;
      update((p) => runR(p, h, target, acct.id, Date.now()));
      services.sound.play('button');
      log('run', `Operator ${operator} ran ${h.id} (${h.facility}) ${positionWords(h, from)} to landing ${target} from the driver's console.`, { from: fmt(from), to: String(target), mode: unit.mode, persons: String(unit.persons), load: String(loadLb(unit)) });
      setMessage(`Running to landing ${target}.`);
    },
    stop() {
      if (!h || !unit || !cage || !needDrive('stop', 'Stop')) return;
      if (!cage.moving && !unit.motion) {
        services.sound.play('button');
        setMessage('The cage is at rest.');
        return;
      }
      let rest = cage.posFt;
      update((p) => {
        const r = stopR(p, h, 'stop', acct.id, Date.now());
        rest = r.restFt;
        return r.state;
      });
      services.sound.play('button');
      log('stop', `Operator ${operator} stopped ${h.id} (${h.facility}) from the driver's console at ${fmt(cage.posFt)} ft.`, { at: fmt(cage.posFt), rest: fmt(rest) });
      setMessage(`Controlled stop, cage coming to rest ${positionWords(h, rest)}.`);
    },
    estop() {
      if (!h || !unit || !cage || !auth) return;
      if (!auth.estop) {
        setGuard('closed');
        return refuse('Emergency stop', auth.why, 'estop');
      }
      const t = Date.now();
      const c = cageAt(unit, t);
      let rest = c.posFt;
      update((p) => {
        const r = stopR(p, h, 'estop', acct.id, t);
        rest = r.restFt;
        return r.state;
      });
      setGuard('actuated');
      services.sound.play('relay');
      const speed = (Math.abs(c.v) * 60).toFixed(0);
      log('estop', `Operator ${operator} applied the emergency stop of ${h.id} (${h.facility}) from this workstation. Cage at ${fmt(c.posFt)} ft, ${speed} fpm; at rest ${positionWords(h, rest)}.`, {
        at: fmt(c.posFt),
        rest: fmt(rest),
        speed,
        persons: String(unit.persons),
      });
      const msg = HC.mail.estop[acct.id];
      if (msg) {
        const again = services.mail.delivered.value.includes(msg);
        services.mail.deliver(msg, { slots: slotsFor(h, rest, { speed, persons: String(unit.persons), returnMin: String(M.estopInspectionMin) }), ...(again ? { repeat: true } : {}) });
      }
      if (acct.id !== 'auditor' && !services.traces.all.value.some((x) => x.from === acct.id && x.msgId === HC.mail.oiaEstop)) {
        services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: HC.mail.oiaEstop, subject: `Emergency stop, ${h.id}` });
      }
      setMessage(`Emergency stop applied. ${h.id} tripped.`);
    },
    reset() {
      if (!h || !unit || !needDrive('reset', 'Trip reset')) return;
      if (!unit.trip) {
        services.sound.play('button');
        setMessage('No trip to reset.');
        return;
      }
      if (cageAt(unit, Date.now()).moving) return refuse('Trip reset', 'The cage is still coming to rest on the brake. Reset when it is stationary.', 'reset');
      update((p) => resetR(p, h, acct.id, Date.now()));
      services.sound.play('relay');
      setGuard('closed');
      log('reset', `Operator ${operator} reset the ${unit.trip.cause === 'estop' ? 'emergency stop' : 'final limit'} trip of ${h.id} (${h.facility}).`, { cause: unit.trip.cause });
      setMessage('Trip reset.');
    },
    mode(m: HoistMode) {
      if (!h || !unit || !needDrive('mode', 'Mode change')) return;
      if (cageAt(unit, Date.now()).moving) return refuse('Mode change', 'The mode key is interlocked while the cage is in motion.', 'mode');
      update((p) => modeR(p, h, m, acct.id, Date.now()));
      services.sound.play('switch');
      log('mode', `Operator ${operator} turned the mode key of ${h.id} (${h.facility}) to ${m.toUpperCase()}.`, { from: unit.mode, to: m });
      setMessage(`Mode ${m.toUpperCase()}.`);
    },
    modeLocked() {
      if (!h || !auth) return;
      refuse('Mode change', auth.why || `The mode key of ${h.id} is held by the duty hoist driver.`, 'mode');
    },
    gates(open) {
      if (!h || !unit || !cage || !needDrive('gates', 'Gate control')) return;
      if (unit.mode === 'auto') return refuse('Gate control', 'In AUTOMATIC the gates are worked by the hoist controller.', 'gates');
      if (cage.moving) return refuse('Gate control', 'Gates cannot be worked with the cage in motion.', 'gates');
      const at = landingAt(h, cage.posFt);
      if (open && at == null) {
        const z = zoneAt(h, cage.posFt);
        return refuse('Gate control', z ? 'Landing gate interlocked closed from the landing side. The cage gate will not open against it.' : 'The cage is not at a landing. Gates open only within the landing tolerance.', 'gates');
      }
      update((p) => gatesR(p, h, open ? 'open' : 'closed', acct.id, Date.now()));
      services.sound.play('relay');
      log('gates', `Operator ${operator} ${open ? 'opened' : 'closed'} the gates of ${h.id} (${h.facility})${at != null ? ` at landing ${at}` : ''}.`, { gates: open ? 'open' : 'closed', landing: at != null ? String(at) : '' });
    },
    load(dp, df) {
      if (!h || !unit || !cage || !needDrive('load', "Onsetter's report")) return;
      if (unit.gates !== 'open' || landingAt(h, cage.posFt) == null) return refuse("Onsetter's report", 'Loading is reported by the onsetter with the cage at a landing and the gates open.', 'load');
      const persons = Math.max(0, unit.persons + dp);
      const freight = Math.max(0, unit.freightLb + df);
      const next = { ...unit, persons, freightLb: freight };
      const becameOver = overloaded(next, h) && !overloaded(unit, h);
      update((p) => loadR(p, h, persons, freight, acct.id, Date.now()));
      services.sound.play('button');
      log('load', `Operator ${operator} entered the onsetter's loading report for ${h.id}: ${persons} persons, ${fmt(freight)} lb freight.`, { persons: String(persons), freight: String(freight), load: String(loadLb(next)), rated: String(h.payloadLb) });
      if (becameOver) {
        const msg = HC.mail.overload[acct.id];
        if (msg) {
          const again = services.mail.delivered.value.includes(msg);
          services.mail.deliver(msg, { slots: slotsFor(h, cage.posFt, { load: fmt(loadLb(next)), persons: String(persons), rated: fmt(h.payloadLb), ratedPersons: String(h.cagePersons) }), ...(again ? { repeat: true } : {}) });
        }
      }
    },
    brake() {
      if (!h || !unit || !cage || !needDrive('brake', 'Brake test')) return;
      if (unit.mode === 'auto') return refuse('Brake test', 'Brake tests are made in MANUAL. Turn the mode key to MANUAL.', 'brake');
      if (unit.trip) return refuse('Brake test', 'The hoist is tripped. Reset the trip before testing the brake.', 'brake');
      if (unit.brakeTesting) return refuse('Brake test', 'A brake test is already in progress.', 'brake');
      if (cage.moving || landingAt(h, cage.posFt) == null) return refuse('Brake test', 'The static brake test is made with the cage at rest at a landing.', 'brake');
      if (unit.gates !== 'closed') return refuse('Brake test', 'Close the gates before the brake test. The drive is energised during the test.', 'brake');
      update((p) => startBrakeTest(p, h, acct.id, Date.now()));
      services.sound.play('relay');
      log('brake-test', `Operator ${operator} started the static brake test of ${h.id} (${h.facility}).`, { torquePct: String(M.brakeTestTorquePct), landing: String(landingAt(h, cage.posFt)) });
      setMessage(`Brake test in progress (${M.brakeTestSec} s).`);
    },
    inch(dir) {
      if (!h || !unit || !needDrive('inch', 'Inching')) return;
      if (unit.mode !== 'inspection') return refuse('Inching', 'Inching is available only in INSPECTION. Turn the mode key to INSPECT.', 'inch');
      if (unit.trip) return refuse('Inching', 'The hoist is tripped. Reset the trip first.', 'inch');
      if (unit.gates !== 'closed') return refuse('Inching', 'Gates must be closed before the cage is moved.', 'inch');
      if (cageAt(unit, Date.now()).moving) return;
      const from = cageAt(unit, Date.now()).posFt;
      update((p) => inchR(p, h, dir, acct.id, Date.now()));
      services.sound.play('button');
      log('inch', `Operator ${operator} inched ${h.id} (${h.facility}) ${dir > 0 ? 'down' : 'up'} from ${fmt(from)} ft in INSPECTION.`, { dir: dir > 0 ? 'down' : 'up', from: fmt(from) });
    },
    inchRelease() {
      if (!h || !unit || !auth?.drive) return;
      const m = unit.motion;
      if (!m || m.kind !== 'run' || m.toLevel != null || m.by !== acct.id) return;
      const t = Date.now();
      if (!cageAt(unit, t).moving) return;
      let rest = 0;
      update((p) => {
        const r = stopR(p, h, 'stop', acct.id, t);
        rest = r.restFt;
        return r.state;
      });
      log('inch', `Operator ${operator} released the inching button of ${h.id}; cage at rest at ${fmt(rest)} ft.`, { phase: 'release', rest: fmt(rest) });
      setMessage(`Cage at rest at ${fmt(rest)} ft, ${positionWords(h, rest)}.`);
    },
    guard(s) {
      if (s === 'lifted') services.sound.play('guard');
      setGuard(s);
    },
    annAck,
    annReset,
    annTest(onOff) {
      setLampTest(onOff);
      if (onOff) services.sound.play('button');
    },
  };

  const callLanding = (level: number) => {
    if (!h || !unit || !auth) return;
    if (!auth.call) return refuse('Landing call', auth.why, 'call');
    const r = landingRestriction(h, level, satisfies);
    if (r) {
      refuse('Landing call', `${r.text} The call was not registered.`, 'call', 'OSC-DIR-0412');
      const msg = HC.mail.restrictedCall[acct.id];
      if (msg && !services.mail.delivered.value.includes(msg)) services.mail.deliver(msg, { slots: slotsFor(h, cageAt(unit, Date.now()).posFt, { level: String(level) }) });
      return;
    }
    if (ctx.sealed.has(h.facility) && level === h.stops[0]!.level) return refuse('Landing call', `The portal landing (level ${level}) is sealed for the seal drill. Calls to it are held until stand-down.`, 'call');
    if (unit.calls.includes(level)) {
      services.sound.play('button');
      setMessage(`A call for landing ${level} is already registered.`);
      return;
    }
    update((p) => callR(p, h, level, acct.id, Date.now()));
    services.sound.play('button');
    log('call', `Operator ${operator} registered a call for landing ${level} of ${h.id} (${h.facility}) at the call station display.`, { level: String(level), mode: unit.mode });
    setMessage(`Call registered, landing ${level}.${unit.mode === 'auto' ? ' The cage answers in AUTOMATIC.' : ' The driver answers calls in MANUAL.'}`);
  };
  const cancel = () => {
    if (!h || !needDrive('cancel-calls', 'Cancel calls')) return;
    update((p) => cancelCalls(p, h, acct.id, Date.now()));
    services.sound.play('button');
    log('cancel-calls', `Operator ${operator} cancelled the registered calls of ${h.id}.`, {});
  };

  const onRxHover = (i: RedactionHoverInfo) =>
    services.audit.log('redaction.hover', h?.id ?? TITLE, `Operator ${operator} examined a withheld level designation in Shaft Hoist Control (${i.auth} ${i.ref}). No release was made.`);
  const names: NameCtx = { t2, onRxHover };

  const pickHoist = (id: string) => {
    const x = hoistById(id);
    if (!x) return;
    if (!sites.includes(x.facility)) return;
    setSite(x.facility);
    setHoistId(x.id);
    services.sound.play('switch');
  };
  const openDoc = (docNo: string) => {
    const r = services.docs.byDocNo(docNo);
    if (r) win.navigate(r.route);
    else setDialog({ title: 'Document', body: `${docNo} is not held in the document store at this workstation.`, kind: 'error', reference: 'Ref OSC-DIR-0319' });
  };
  const goHome = () => win.navigate('/hoist');
  const printDoc = () => {
    const r = isDocRoute ? route! : services.docs.byDocNo(HC.docs.dataSheet);
    if (r && docAllowed) {
      services.print(r.id);
      setMessage(`${r.docNo} sent to the print queue.`);
    } else setDialog({ title: 'Print', body: 'No printable record is held for this view.', kind: 'info', reference: 'Ref OSC-DIR-0319' });
  };
  const view = (t: Tab) => {
    if (isDocRoute) goHome();
    setTab(t);
  };

  /* ---- menus */
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print data sheet', shortcut: 'Ctrl+P', onSelect: printDoc },
        { label: '&Export recorder...', onSelect: () => refuse('Export', 'Export of hoist recorder data to file or removable media is not permitted from a MERIDIAN workstation.', 'export', 'OSC-DIR-0319') },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        ...TABS.map((t, i) => ({ label: t.label, shortcut: `Ctrl+${i + 1}`, radio: true, checked: !isDocRoute && tab === t.id, onSelect: () => view(t.id) })),
        { separator: true },
        { label: '&Operating procedure', checked: isDocRoute && route?.docNo === HC.docs.procedure, radio: true, onSelect: () => openDoc(HC.docs.procedure) },
        { label: 'Hoist and shaft &data sheet', checked: isDocRoute && route?.docNo === HC.docs.dataSheet, radio: true, onSelect: () => openDoc(HC.docs.dataSheet) },
      ],
    },
    {
      label: '&Site',
      items: sites.length
        ? sites.map((s) => ({ label: s, radio: true, checked: s === site, onSelect: () => (setSite(s), services.sound.play('switch')) }))
        : [{ label: `No hoists at ${acct.site}`, disabled: true }],
    },
    {
      label: 'H&oist',
      items: [
        ...siteHoists.map((x) => ({ label: `${x.id}  ${x.name}`, radio: true, checked: x.id === h?.id, onSelect: () => pickHoist(x.id) })),
        { separator: true },
        { label: '&Run to selected landing', shortcut: 'F6', onSelect: () => on.run() },
        { label: '&Stop', shortcut: 'F7', onSelect: () => on.stop() },
        { label: 'Trip &reset', onSelect: () => on.reset() },
        { label: '&Brake test', shortcut: 'F8', onSelect: () => on.brake() },
        { label: '&Cancel registered calls', onSelect: cancel },
        { separator: true },
        { label: '&Acknowledge alarms', shortcut: 'F9', onSelect: () => annAck(tiles.filter((t) => t.seq === 'unack').map((t) => t.id)) },
        { label: '&Lamp test', checked: lampTest, onSelect: () => setLampTest(!lampTest) },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: `Hoist operating procedure (${HC.docs.procedure})`, onSelect: () => openDoc(HC.docs.procedure) },
        { label: `Hoist and shaft data (${HC.docs.dataSheet})`, onSelect: () => openDoc(HC.docs.dataSheet) },
        { label: 'Facility &dossier', onSelect: () => services.openRoute(`/registry/facility/${site.toLowerCase()}`) },
        { separator: true },
        {
          label: '&About Shaft Hoist Control',
          onSelect: () =>
            setDialog({
              title: 'About Shaft Hoist Control',
              kind: 'info',
              body: `${TITLE}, ${canon.meta.environment} release ${canon.meta.release}. Remote display and control of the ${canon.hoists.length} shaft hoists at the ALPHA sites. Drive control remains with the winder house; this workstation operates within the authority of its account.`,
            }),
        },
      ],
    },
  ];

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey && !e.altKey && /^[1-5]$/.test(e.key)) {
      e.preventDefault();
      view(TABS[Number(e.key) - 1]!.id);
    } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      printDoc();
    } else if (e.key === 'F6') {
      e.preventDefault();
      on.run();
    } else if (e.key === 'F7') {
      e.preventDefault();
      on.stop();
    } else if (e.key === 'F8') {
      e.preventDefault();
      on.brake();
    } else if (e.key === 'F9') {
      e.preventDefault();
      annAck(tiles.filter((t) => t.seq === 'unack').map((t) => t.id));
    }
  };

  /* ---- status bar */
  const control = !auth ? 'NO HOIST' : ctx.isolated ? 'LOCAL ONLY (ISOLATED)' : auth.drive ? "DRIVER'S CONSOLE" : auth.call ? 'CALLS AND E-STOP' : 'DISPLAY ONLY';
  const panes: StatusPane[] = [
    { id: 'msg', fill: true, content: message },
    { id: 'hoist', width: 150, mono: true, label: 'Hoist', content: h && unit ? `${h.id} ${unit.mode.toUpperCase()}` : '--' },
    {
      id: 'pos',
      width: 210,
      mono: true,
      label: 'Cage',
      content: h && cage && unit ? (unit.trip ? `TRIPPED ${fmt(cage.posFt)} FT` : cage.moving ? `RUNNING ${fmt(cage.posFt)} FT` : `${positionWords(h, cage.posFt).toUpperCase()}`) : '--',
    },
    { id: 'ctl', width: 170, label: 'Control', content: control },
    { id: 'mk', width: 190, label: 'Marking', content: markingLabel(marking) },
  ];

  /* ---- body */
  let body;
  if (isDocRoute) {
    if (!docAllowed) {
      body = (
        <RefusalState
          authority={tier4 ? 'Facilities Engineering' : 'Classification Control, Office of Internal Assurance'}
          reference={tier4 ? 'DIR-0301' : 'OSC-DIR-0412'}
          reason={tier4 ? 'Requires Tier 3 access determination.' : `Requires Tier ${route!.access?.tier ?? 3} access determination. Display of ${route!.docNo} to this operator is not authorised.`}
          docNo={route!.docNo}
        />
      );
    } else if (docErr) {
      body = <ErrorState code="RD-DOC-0404" title="Record not available" body={`${route!.docNo} could not be retrieved from the document store. Use View to retry.`} detail={docErr} />;
    } else if (!doc) {
      body = <p class="hst-note">Retrieving {route!.docNo}.</p>;
    } else {
      body = (
        <div class="hst-docpad">
          <DocumentView
            doc={doc}
            markings={canon.markings}
            onNavigate={(r) => services.openRoute(r)}
            onRedactionHover={(i) => services.audit.log('redaction.hover', doc.docNo, `Operator ${operator} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)}
            slots={{ ScanPage: ScanPage as never, MarkingStrip, Seal: Seal as never, Stamp: Stamp as never }}
          />
        </div>
      );
    }
  } else if (!h || !unit || !cage || !auth) {
    body = (
      <EmptyState
        title={`No shaft hoists at ${acct.site}`}
        body={`${acct.site} is entered by its portal and has no shaft hoist. Hoist records are held for the sites where hoists are installed.`}
      />
    );
  } else {
    const v = vanes(h);
    const lim = limits(h);
    const zone = zoneAt(h, cage.posFt);
    const right =
      tab === 'console' ? (
        <DriverConsole
          h={h}
          unit={unit}
          cage={cage}
          il={interlocks(unit, h, ctx)}
          auth={auth}
          sealed={ctx.sealed.has(h.facility)}
          target={target}
          guard={guard}
          tiles={tiles}
          lampTest={lampTest}
          reducedMotion={reducedMotion}
          on={on}
        />
      ) : tab === 'calls' ? (
        <CallStations h={h} unit={unit} now={now} canCall={auth.call} canDrive={auth.drive} sealed={ctx.sealed.has(h.facility)} why={auth.why} names={names} onCall={callLanding} onCancel={cancel} />
      ) : tab === 'recorder' ? (
        <Recorder state={hs} site={site} scope={scope} onScope={setScope} accounts={services.account.all()} />
      ) : tab === 'data' ? (
        <ShaftData h={h} state={hs} names={names} />
      ) : (
        <FleetTable state={hs} now={now} onPick={(id) => (pickHoist(id), setTab('console'))} />
      );
    body = (
      <div class="hst-body">
        <section class="hst-shaft" aria-label={`Shaft elevation, ${site}`}>
          <div class="hst-elev">
            <ShaftElevation
              facilityId={site}
              tier={services.session.tier.value}
              width={360}
              height={560}
              cages={siteHoists.map((x) => {
                const c = cageAt(unitOf(hs, x), now);
                return { id: x.id, label: x.id.slice(4), posFt: c.posFt, moving: c.moving, selected: x.id === h.id, landings: x.stops.map((s) => s.depthFt) };
              })}
            />
          </div>
          <div class="hst-ind">
            <DepthIndicator marks={v.map((x) => ({ depthFt: x.depthFt, level: x.listed ? x.level : null }))} limits={lim} posFt={cage.posFt} target={target} calls={unit.calls} zone={zone != null} height={560} label={`${h.id} depth indicator`} />
          </div>
        </section>
        <section class="hst-side" aria-label="Hoist views">
          <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as Tab)} label="Hoist views" panel="surface">
            {right}
          </Tabs>
        </section>
      </div>
    );
  }

  return (
    <div class="hst" ref={rootRef} onKeyDown={onKeyDown} data-clearance={clearanceSig}>
      <MenuBar menus={menus} label="Shaft Hoist Control menu" />
      <Toolbar label="Shaft Hoist Control toolbar">
        {sites.length > 0 && (
          <Select label="Site" layout="inline" value={site} options={sites.map((s) => ({ value: s, label: s }))} onChange={(s) => (setSite(s), services.sound.play('switch'))} />
        )}
        {siteHoists.map((x) => (
          <ToolbarButton label={x.id.slice(4)} title={`${x.id} ${x.name}`} pressed={!isDocRoute && x.id === h?.id} onClick={() => (isDocRoute ? goHome() : undefined, pickHoist(x.id))} />
        ))}
        {sites.length > 0 && (
          <>
            <ToolbarSeparator />
            <ToolbarButton label="Console" pressed={!isDocRoute && tab === 'console'} onClick={() => view('console')} />
            <ToolbarButton label="Calls" pressed={!isDocRoute && tab === 'calls'} onClick={() => view('calls')} />
            <ToolbarButton label="Recorder" pressed={!isDocRoute && tab === 'recorder'} onClick={() => view('recorder')} />
          </>
        )}
        <ToolbarSpacer />
        <ToolbarButton label="Procedure" pressed={isDocRoute && route?.docNo === HC.docs.procedure} onClick={() => openDoc(HC.docs.procedure)} />
        <ToolbarButton label="Data sheet" pressed={isDocRoute && route?.docNo === HC.docs.dataSheet} onClick={() => openDoc(HC.docs.dataSheet)} />
      </Toolbar>
      <main class="hst-main">{body}</main>
      <StatusBar panes={panes} />
      {dialog ? (
        <MessageBox open title={dialog.title} kind={dialog.kind} reference={dialog.reference} onOpen={(k) => k === 'error' && services.sound.play('error')} onClose={() => setDialog(null)}>
          {dialog.body}
        </MessageBox>
      ) : null}
    </div>
  );
}

