/**
 * Seal Drill Coordinator: order a network seal drill and watch it propagate site by site.
 *
 * Plant state: this app is the only writer of shared keys `drill` and `drill-register`
 * (types.ts). The drill is computed from canon sealDrill and the rules in canon.apps.drill
 * (model.ts), so every tab of every account computes the same drill; the coordinator writes the
 * key whenever a site's status changes while it is open anywhere.
 *
 * Accounts: the deputy commander orders, stands down and aborts (two-person rule: a second
 * officer and Network Control's read-back of the drill number). The auditor watches and records
 * an OIA observation. The records analyst may watch; the order key is not issued to them. The
 * Tier 4 technician sees only GAMMA-08's part and acknowledges and reports for that site.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, DocJson, IsolationState, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import {
  Checkbox,
  Dialog,
  DocumentView,
  FieldGroup,
  MenuBar,
  MessageBox,
  Select,
  StatusBar,
  TextField,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  type MenuBarMenu,
  type MenuItem,
} from '@design/index';
import { Annunciator, GuardedSwitch, KeySwitch, Lamp, PanelFrame, PanelSection, Plate, PushButton, SegmentDisplay, annunciatorStep, ANN_NORMAL, type AnnPoint, type AnnunciatorTile, type GuardState } from '@graphics/panel';
import { RefusalState } from '@graphics/states';
import { hhmmssZ, hhmmZ, inWorldDateIso, inWorldDateText } from '@sim/time';
import { createDrill, drillClock, endDrill, evaluate, logLines, manualAck, manualSealed, minuteAt, nextDrillId, summarize, toRecord } from './model';
import { canon, dtg, frag, PHASE_WORD, SD, STATUS_WORD, zl } from './shared';
import { DRILL_KEY, REGISTER_KEY, type DrillRecord, type DrillStateExt } from './types';
import { LogView, MapView, MimicView, registerRows, RegisterView, SiteDetail, TimelineView, type LogRow } from './views';
import './drill.css';
import { isolatedAt } from '@apps/isolate/state';

type View = 'map' | 'mimic' | 'timeline' | 'log' | 'register' | 'site' | 'document';

const ISOLATION_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };

interface Notice {
  title: string;
  kind: 'info' | 'warning' | 'error';
  body: string;
  reference?: string;
}

const PROC = frag.docs.procedure;
const CARD = frag.docs.siteCard;

function accessKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  return r.access.compartment ? `${r.access.compartment}+T${r.access.tier}` : `T${r.access.tier}`;
}

const TILE_DEFS: { id: string; legend: string[]; priority: 'alarm' | 'warning' | 'status' }[] = [
  { id: 'ordered', legend: ['DRILL', 'ORDERED'], priority: 'status' },
  { id: 'allack', legend: ['ALL SITES', 'ACK'], priority: 'status' },
  { id: 'sealed', legend: ['NETWORK', 'SEALED'], priority: 'status' },
  { id: 'standdown', legend: ['STAND', 'DOWN'], priority: 'status' },
  { id: 'late', legend: ['LATE', 'REPORT'], priority: 'warning' },
  { id: 'noreport', legend: ['NO', 'REPORT'], priority: 'alarm' },
  { id: 'seq', legend: ['ORDER WIRE', 'SEQUENCE'], priority: 'warning' },
  { id: 'hub', legend: ['HUB CCTS', 'DOWN'], priority: 'alarm' },
];

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const def = services.account.def.value;
  const me = def.id;
  const siteOnly = def.tier === 4 ? def.site : null;
  const canOrder = def.tier <= 2;
  const canObserve = def.auditReader;
  const op = services.session.operatorId.value;

  const drillSig = services.shared.get<DrillStateExt | null>(DRILL_KEY, null);
  const regSig = services.shared.get<DrillRecord[]>(REGISTER_KEY, []);
  const isoSig = services.shared.get<IsolationState>('isolation', ISOLATION_NONE);
  const drill = drillSig.value && (drillSig.value as DrillStateExt).v === 1 ? drillSig.value : null;
  const register = regSig.value;

  const docRoute = route && route.route !== '/drill' ? route : null;
  const homeView: View = siteOnly ? 'site' : 'map';
  const [view, setView] = useState<View>(docRoute ? 'document' : homeView);
  const [selected, setSelected] = useState<string | null>(siteOnly);
  const [logSel, setLogSel] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(Date.now());
  const [keyPos, setKeyPos] = useState(0);
  const [guard, setGuard] = useState<GuardState>('closed');
  const [confirm, setConfirm] = useState<{ id: string } | null>(null);
  const [abortAsk, setAbortAsk] = useState(false);
  const [lampTest, setLampTest] = useState(false);
  const [ann, setAnn] = useState<Record<string, AnnPoint>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    setView(docRoute ? 'document' : homeView);
  }, [route?.route]);

  /* ---------------------------------------------------------------- ticker */
  const lastSound = useRef<{ id: string; hop: number; acks: number; phase: string } | null>(null);
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      const cur = drillSig.peek();
      if (cur && (cur as DrillStateExt).v === 1 && (cur.phase === 'propagating' || cur.phase === 'sealed')) {
        const iso = isolatedAt(isoSig.peek(), t);
        const next = evaluate(cur as DrillStateExt, t, iso, canon, { holdMin: frag.holdMin });
        if (next !== cur || t - (cur as DrillStateExt).tickedAt >= 1000) {
          services.shared.set(DRILL_KEY, next === cur ? { ...next, tickedAt: t } : next);
          if (next.phase !== cur.phase || next !== cur) syncRegister(next);
        }
        cues(next, t);
      }
      const el = rootRef.current;
      if (el && el.offsetParent !== null) setNow(t);
    };
    tick();
    const h = setInterval(tick, frag.tickMs);
    return () => clearInterval(h);
  }, []);

  /** Record the drill's current result in the register (only the summary; never the plan). */
  function syncRegister(s: DrillStateExt) {
    services.shared.update<DrillRecord[]>(REGISTER_KEY, [], (prev) => {
      const i = prev.findIndex((r) => r.id === s.id);
      const rec = toRecord(s, i >= 0 ? prev[i] : undefined);
      const same = i >= 0 && JSON.stringify(prev[i]) === JSON.stringify(rec);
      if (same) return prev;
      const out = i >= 0 ? prev.map((r, k) => (k === i ? rec : r)) : [...prev, rec];
      return out.slice(-frag.registerCap);
    });
  }

  /** Sounds for the operator watching this tab: relay clicks as each wave of sites is reached, the alert tone at order and stand-down. */
  function cues(s: DrillStateExt, t: number) {
    const m = minuteAt(s, t);
    const hop = Math.max(0, ...Object.values(s.plan).filter((p) => p.receipt <= m && !p.causes.includes('cut')).map((p) => p.hop));
    const acks = Object.values(s.sites).filter((x) => x.acknowledged !== null).length;
    const prev = lastSound.current;
    if (prev && prev.id === s.id) {
      if (hop > prev.hop) services.sound.play('relay');
      if (prev.phase !== s.phase && s.phase === 'stand-down') services.sound.play('tone');
    }
    lastSound.current = { id: s.id, hop, acks, phase: s.phase };
  }

  /* ---------------------------------------------------------------- annunciator */
  const sum = drill ? summarize(drill) : null;
  const isolated = isolatedAt(isoSig.value, now);
  const active = !!drill && (drill.phase === 'propagating' || drill.phase === 'sealed');
  const conditions: Record<string, boolean> = {
    ordered: active,
    allack: !!drill && active && Object.entries(drill.sites).every(([f, x]) => x.acknowledged !== null || x.status === 'no-report' || drill.plan[f]?.causes.includes('cut')),
    sealed: drill?.phase === 'sealed',
    standdown: drill?.phase === 'stand-down' || drill?.phase === 'aborted',
    late: !!sum && active && sum.late.length > 0,
    noreport: !!sum && active && sum.noReport.length > 0,
    seq: !!sum && active && sum.outOfSequence.length > 0,
    hub: isolated,
  };
  const condKey = JSON.stringify(conditions);
  useEffect(() => {
    setAnn((prev) => {
      const next: Record<string, AnnPoint> = { ...prev };
      let alarm = false;
      for (const d of TILE_DEFS) {
        const p = prev[d.id] ?? ANN_NORMAL;
        const q = annunciatorStep(p, conditions[d.id] ? 'abnormal' : 'normal');
        if (q.seq === 'unack' && p.seq !== 'unack' && d.priority === 'alarm') alarm = true;
        next[d.id] = q;
      }
      if (alarm && !siteOnly) services.sound.play('alarm');
      return next;
    });
  }, [condKey]);
  const tiles: AnnunciatorTile[] = TILE_DEFS.map((d) => ({ id: d.id, legend: d.legend, priority: d.priority, seq: (ann[d.id] ?? ANN_NORMAL).seq }));
  const ackTiles = (ids: string[]) => {
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = annunciatorStep(prev[id] ?? ANN_NORMAL, 'ack');
      return next;
    });
    services.sound.stop('alarm');
    services.sound.play('ack');
  };
  const resetTiles = (ids: string[]) => {
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = annunciatorStep(prev[id] ?? ANN_NORMAL, 'reset');
      return next;
    });
    services.sound.play('button');
  };

  /* ---------------------------------------------------------------- mail consequences */
  useEffect(() => {
    for (const r of register) {
      const ended = r.phase === 'stand-down' || r.phase === 'aborted';
      const patch: DrillRecord['mailed'] = {};
      if (r.by === me && r.noReport.length && !r.mailed.noReport) {
        services.mail.deliver(frag.mail.noReport, {
          repeat: true,
          slots: { date: inWorldDateText(now), drill: r.id, sites: r.noReport.join(', '), count: String(r.noReport.length), ordered: zl(r.orderedAt) },
        });
        patch.noReport = true;
      }
      if (r.by === me && ended && !r.mailed.report) {
        services.mail.deliver(frag.mail.report, { repeat: true, slots: reportSlots(r) });
        patch.report = true;
      }
      if (ended && !r.mailed.oia) {
        if (r.observer) {
          if (r.by === me) services.mail.deliver(frag.mail.oiaObserved);
          else services.traces.post({ to: r.by, kind: 'mail.deliver', msgId: frag.mail.oiaObserved, subject: `OIA observation of seal drill ${r.id}` });
        } else if (me === 'auditor') services.mail.deliver(frag.mail.oiaUnobserved);
        else services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: frag.mail.oiaUnobserved, subject: `Seal drill ${r.id} held without an OIA observer` });
        patch.oia = true;
      }
      if (Object.keys(patch).length) {
        services.shared.update<DrillRecord[]>(REGISTER_KEY, [], (prev) => prev.map((x) => (x.id === r.id ? { ...x, mailed: { ...x.mailed, ...patch } } : x)));
      }
    }
  }, [register]);

  function reportSlots(r: DrillRecord): Record<string, string> {
    const second = r.secondOfficer || 'Not recorded';
    return {
      date: inWorldDateText(now),
      drill: r.id,
      ordered: zl(r.orderedAt),
      ended: r.endedAt ? zl(r.endedAt) : 'Not recorded',
      result: r.phase === 'aborted' ? 'ABORTED' : r.endedBy === 'network-control' ? 'STOOD DOWN BY NETWORK CONTROL AFTER THE HOLD' : 'STOOD DOWN BY THE ORDERING OFFICER',
      sites: String(r.sites),
      sealed: String(r.sealed),
      late: r.late.length ? r.late.join(', ') : 'NONE',
      noReport: r.noReport.length ? r.noReport.join(', ') : 'NONE',
      sequence: r.outOfSequence.length ? r.outOfSequence.join(', ') : 'NONE',
      observer: r.observer ? 'OIA, ALPHA-01' : 'NONE',
      second,
      circuits: r.isolated ? 'HUB CIRCUITS DOWN DURING THE DRILL. ORDER NOT PASSED BEYOND THE EASTERN NETWORK.' : 'HUB CIRCUITS IN SERVICE.',
    };
  }

  /* ---------------------------------------------------------------- refusals */
  const refuse = (title: string, body: string, reference: string, subject: string) => {
    services.audit.log('window.open', subject, `Operator ${op} was refused ${title.toLowerCase()} in the Seal Drill Coordinator. ${body}`);
    setNotice({ title, kind: 'warning', body, reference });
  };

  const refuseOrder = () => {
    if (me === 'analyst') {
      refuse('Order seal drill', 'The order key is not issued to this position. Seal drills are ordered by a facility commander or deputy commander through Network Control. The attempt has been entered in the drill log.', `Ref ${PROC} para 3`, 'drill:order');
      if (!services.mail.delivered.peek().includes(frag.mail.deputyNote)) {
        services.mail.deliver(frag.mail.deputyNote, { slots: { date: inWorldDateText(Date.now()), time: zl(Date.now()) } });
        services.traces.post({ to: 'deputy', kind: 'notice', subject: 'Seal drill order attempted from workstation A03-5-114', data: { text: `Order key attempted at the Seal Drill Coordinator by ${op} (Records Division, ALPHA-03). Refused: key not issued.` } });
      }
    } else if (canObserve) {
      refuse('Order seal drill', 'OIA observes seal drills and does not order them. Use OIA OBSERVER to enter an observation against a drill once it is ordered.', `Ref ${PROC} para 7`, 'drill:order');
    } else {
      refuse('Order seal drill', 'Seal drills are ordered by a facility commander or deputy commander. This position reports for its own site.', `Ref ${PROC} para 3`, 'drill:order');
    }
  };

  /* ---------------------------------------------------------------- order, stand-down, abort, observe */
  const startOrder = () => {
    if (!canOrder) return refuseOrder();
    if (active) {
      setNotice({ title: 'Order seal drill', kind: 'warning', body: `Drill ${drill!.id} is ${PHASE_WORD[drill!.phase].toLowerCase()}. One network drill at a time: stand down or abort it first.`, reference: `Ref ${PROC} para 5` });
      return;
    }
    if (keyPos !== 1) {
      setNotice({ title: 'Order seal drill', kind: 'info', body: `Turn the order authority key (${frag.orderPosition.keyNo}) to ENABLE, lift the cover and hold ORDER.`, reference: `Ref ${PROC} para 4` });
      return;
    }
    const id = nextDrillId(frag.drillIdPrefix, inWorldDateIso(Date.now()), [...register.map((r) => r.id), ...frag.history.map((h) => h.id)]);
    setConfirm({ id });
  };

  const issueOrder = (id: string, second: string) => {
    const t = Date.now();
    const iso = isolatedAt(isoSig.peek(), t);
    const s = createDrill({ canon, frag, inWorldIso: inWorldDateIso(t), orderedAt: t, isolated: iso, id, now: t, by: me, secondOfficer: second });
    services.shared.set(DRILL_KEY, s);
    syncRegister(s);
    services.audit.log('control', 'drill:order', `Operator ${op} ordered network seal drill ${id} from the Seal Drill Coordinator. Second officer: ${second}. Read-back by Network Control confirmed.${iso ? ' Hub circuits were down at the order.' : ''}`, {
      drill: id,
      second,
      isolated: String(iso),
      sites: String(Object.keys(s.sites).length),
    });
    services.sound.play('tone');
    setConfirm(null);
    setGuard('closed');
    setKeyPos(0);
    setView((v) => (v === 'document' || v === 'register' ? 'map' : v));
  };

  const standDown = () => {
    services.sound.play('button');
    if (!canOrder) return refuse('Stand down', 'Stand-down is given by the officer who ordered the drill, or by Network Control at the end of the hold.', `Ref ${PROC} para 6`, 'drill:stand-down');
    if (!drill || drill.phase !== 'sealed') {
      setNotice({ title: 'Stand down', kind: 'info', body: drill?.phase === 'propagating' ? 'The network has not been reported sealed. Stand-down follows the sealed report; to end the drill now, abort it.' : 'No drill is held sealed.', reference: `Ref ${PROC} para 6` });
      return;
    }
    const t = Date.now();
    const s = endDrill(drill, t, 'stand-down', me, canon);
    services.shared.set(DRILL_KEY, s);
    syncRegister(s);
    services.audit.log('control', 'drill:stand-down', `Operator ${op} stood down seal drill ${drill.id}. Sites to open seal doors and resume normal condition.`, { drill: drill.id, sealed: String(summarize(s).sealed) });
    services.sound.play('tone');
  };

  const askAbort = () => {
    services.sound.play('button');
    if (!canOrder) return refuse('Abort drill', 'A drill is aborted only by the officer who ordered it.', `Ref ${PROC} para 6`, 'drill:abort');
    if (!drill || drill.phase !== 'propagating') {
      setNotice({ title: 'Abort drill', kind: 'info', body: drill?.phase === 'sealed' ? 'The network is held sealed. Use STAND DOWN to end the drill.' : 'No drill is propagating.', reference: `Ref ${PROC} para 6` });
      return;
    }
    setAbortAsk(true);
  };
  const doAbort = () => {
    if (!drill) return;
    const t = Date.now();
    const s = endDrill(drill, t, 'aborted', me, canon);
    services.shared.set(DRILL_KEY, s);
    syncRegister(s);
    const sm = summarize(s);
    services.audit.log('control', 'drill:abort', `Operator ${op} aborted seal drill ${drill.id} at ${drillClock(minuteAt(drill, t))}. ${sm.sealed} sites had reported sealed.`, { drill: drill.id, at: drillClock(minuteAt(drill, t)), sealed: String(sm.sealed) });
    services.sound.stop('alarm');
    services.sound.play('tone');
    setAbortAsk(false);
  };

  const observe = () => {
    services.sound.play('button');
    if (!canObserve) return refuse('OIA observer', 'Observations are entered by the Office of Internal Assurance.', `Ref ${PROC} para 7`, 'drill:observe');
    if (!drill || !active) {
      setNotice({ title: 'OIA observer', kind: 'info', body: 'No drill is in progress. An observation is entered against a drill while it propagates or is held sealed.', reference: `Ref ${PROC} para 7` });
      return;
    }
    if (drill.observer) {
      setNotice({ title: 'OIA observer', kind: 'info', body: `An OIA observation is already entered against ${drill.id}.`, reference: `Ref ${PROC} para 7` });
      return;
    }
    const s = { ...drill, observer: me };
    services.shared.set(DRILL_KEY, s);
    syncRegister(s);
    services.audit.log('control', 'drill:observe', `Operator ${op} entered an Internal Assurance observation against seal drill ${drill.id}.`, { drill: drill.id });
  };

  /* ---------------------------------------------------------------- site (Tier 4) */
  const sitePlan = drill && siteOnly ? drill.plan[siteOnly] : undefined;
  const siteState = drill && siteOnly ? drill.sites[siteOnly] : undefined;
  const siteAck = () => {
    services.sound.play('button');
    if (!drill || !siteOnly || !sitePlan) return setNotice({ title: 'Acknowledge', kind: 'info', body: 'No drill order has been received at this site.', reference: `Ref ${CARD}` });
    const s = manualAck(drill, siteOnly, Date.now());
    if (!s) {
      const msg = siteState?.acknowledged != null ? 'The order is already acknowledged.' : 'No drill order has been received at this site.';
      return setNotice({ title: 'Acknowledge', kind: 'info', body: msg, reference: `Ref ${CARD}` });
    }
    const next = evaluate(s, Date.now(), isolatedAt(isoSig.peek(), Date.now()), canon, { holdMin: frag.holdMin });
    services.shared.set(DRILL_KEY, next);
    syncRegister(next);
    services.sound.play('ack');
    services.audit.log('control', 'drill:ack-site', `Operator ${op} acknowledged seal drill ${drill.id} for ${siteOnly}. Seal doors to close.`, { drill: drill.id, site: siteOnly });
  };
  const siteSealed = () => {
    services.sound.play('button');
    if (!drill || !siteOnly || !sitePlan) return setNotice({ title: 'Report sealed', kind: 'info', body: 'No drill order has been received at this site.', reference: `Ref ${CARD}` });
    const s = manualSealed(drill, siteOnly, Date.now());
    if (!s) {
      const msg = siteState?.status === 'sealed' ? 'The site is already reported sealed.' : siteState?.acknowledged == null ? 'Acknowledge the order first.' : 'Seal doors are still cycling. Report sealed when every seal door shows CLOSED AND DOGGED.';
      return setNotice({ title: 'Report sealed', kind: 'info', body: msg, reference: `Ref ${CARD} step 4` });
    }
    const next = evaluate(s, Date.now(), isolatedAt(isoSig.peek(), Date.now()), canon, { holdMin: frag.holdMin });
    services.shared.set(DRILL_KEY, next);
    syncRegister(next);
    services.audit.log('control', 'drill:report-sealed', `Operator ${op} reported ${siteOnly} sealed for drill ${drill.id}.`, { drill: drill.id, site: siteOnly });
  };

  /* ---------------------------------------------------------------- message log */
  const lines: LogRow[] = useMemo(() => {
    if (!drill) return [];
    const all = logLines(drill, now, hhmmZ).map((l) => ({ ...l, dtg: dtg(l.at), clock: drillClock(l.t) }));
    if (!siteOnly) return all;
    return all
      .filter((l) => (l.facility === siteOnly || (l.facility === null && l.kind !== 'network')))
      .map((l) => ({
        ...l,
        from: l.from === siteOnly.replace(/^([A-Z])[A-Z]*-(\d{2})$/, '$1$2') ? l.from : l.facility === siteOnly && l.kind === 'relay' ? 'RELAY' : 'NETWORK CONTROL',
        to: l.to === 'ALL STATIONS' || l.to === 'FILE' ? l.to : l.kind === 'relay' ? l.to : 'NETWORK CONTROL',
        circuit: l.kind === 'order' || l.kind === 'end' ? l.circuit : 'TRAM ORDER WIRE',
      }));
  }, [drill, Math.floor(now / 500), siteOnly]);

  const queryLine = (l: LogRow) => {
    services.sound.play('button');
    services.audit.log('control', 'drill:query', `Operator ${op} queried a relay traffic line of seal drill ${drill?.id ?? ''} with Network Control.`, { drill: drill?.id ?? '', line: l.key, site: l.facility ?? '' });
    const p = l.facility && drill ? drill.plan[l.facility] : undefined;
    if (l.kind === 'ack' && p && p.ack !== null && p.ack < p.receipt) {
      if (!services.mail.delivered.peek().includes(frag.mail.circuitReply)) {
        services.mail.deliver(frag.mail.circuitReply, { slots: { date: inWorldDateText(Date.now()), drill: drill!.id, site: l.facility!, circuit: p.ackCircuit, ack: drillClock(p.ack), receipt: drillClock(p.receipt) } });
      }
      setNotice({ title: 'Query relay traffic', kind: 'info', body: `Query on the ${l.facility} acknowledgement passed to the circuit office, Communications Security, ALPHA-02. The reply comes by message.`, reference: `Ref ${PROC} para 8` });
    } else {
      setNotice({ title: 'Query relay traffic', kind: 'info', body: 'The line agrees with the relay record held by Network Control. No query raised.', reference: `Ref ${PROC} para 8` });
    }
  };

  /* ---------------------------------------------------------------- documents */
  const key = docRoute ? accessKey(docRoute) : null;
  const t4Refused = !!docRoute && def.tier === 4 && !docRoute.t4 && !(docRoute.variants ?? []).includes(me);
  const refused = !!docRoute && (t4Refused || !!(key && !services.clearance.satisfies(key)));
  useEffect(() => {
    if (refused && docRoute) services.audit.log('window.open', docRoute.docNo, `Operator ${op} was refused ${docRoute.docNo} in the Seal Drill Coordinator. ${t4Refused ? 'Requires Tier 3 access determination.' : `Requirement ${key} not held.`}`);
  }, [refused, docRoute?.docNo]);
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [docErr, setDocErr] = useState(false);
  useEffect(() => {
    setDoc(null);
    setDocErr(false);
    if (!docRoute || refused) return;
    let live = true;
    services.docs
      .load(docRoute.id)
      .then((d) => live && setDoc(d))
      .catch(() => live && setDocErr(true));
    return () => {
      live = false;
    };
  }, [docRoute?.id, refused]);
  const readLogged = useRef<string | null>(null);
  useEffect(() => {
    if (view === 'document' && doc && readLogged.current !== doc.docNo) {
      readLogged.current = doc.docNo;
      services.audit.log('doc.read', doc.docNo);
    }
  }, [view, doc]);

  const openDoc = (docNo: string) => {
    const r = services.docs.byDocNo(docNo);
    if (r) win.navigate(r.route);
    else setNotice({ title: 'Seal Drill Coordinator', kind: 'info', body: `${docNo} is not held on this workstation.`, reference: docNo });
  };

  /* ---------------------------------------------------------------- chrome */
  const views: { id: View; label: string; menu: string }[] = siteOnly
    ? [
        { id: 'site', label: 'Site', menu: '&Site panel' },
        { id: 'timeline', label: 'Timeline', menu: '&Timeline' },
        { id: 'log', label: 'Messages', menu: '&Message log' },
        { id: 'register', label: 'Register', menu: '&Register' },
      ]
    : [
        { id: 'map', label: 'Map', menu: '&Map' },
        { id: 'mimic', label: 'Line diagram', menu: '&Line diagram' },
        { id: 'timeline', label: 'Timeline', menu: '&Timeline' },
        { id: 'log', label: 'Messages', menu: 'Message &log' },
        { id: 'register', label: 'Register', menu: '&Register' },
      ];

  useEffect(() => {
    if (docRoute) win.setTitle(docRoute.title, docRoute.docNo);
    else win.setTitle(siteOnly ? `Seal Drill Coordinator: ${siteOnly}` : 'Seal Drill Coordinator', drill?.id);
    win.setMarking(((docRoute && !refused ? docRoute.marking : null) ?? (siteOnly ? 'UMBRA-U' : 'UMBRA-R')) as MarkingId);
  }, [docRoute?.route, drill?.id, refused]);
  useEffect(() => {
    win.setStatus(drill ? `${drill.id} ${PHASE_WORD[drill.phase]}` : 'No drill ordered');
  }, [drill?.id, drill?.phase]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setNarrow(el.getBoundingClientRect().width < 820));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const printDoc = () => {
    if (view === 'document' && doc) services.print(doc.id);
    else setNotice({ title: 'Print', kind: 'warning', body: 'Coordinator displays are not released to the print queue. The drill report is issued by message when the drill ends; print the procedure from the Document view.', reference: `Ref ${PROC} para 9` });
  };

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: printDoc },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: views.map((v, i): MenuItem => ({ label: v.menu, shortcut: `Ctrl+${i + 1}`, checked: view === v.id, radio: true, onSelect: () => (docRoute ? (win.navigate('/drill'), setView(v.id)) : setView(v.id)) })),
    },
    {
      label: '&Drill',
      items: siteOnly
        ? [
            { label: '&Acknowledge order', onSelect: siteAck },
            { label: '&Report site sealed', onSelect: siteSealed },
            { separator: true },
            { label: 'Order drill...', onSelect: refuseOrder },
          ]
        : [
            { label: '&Order drill...', onSelect: startOrder },
            { label: '&Stand down', onSelect: standDown },
            { label: 'A&bort drill...', onSelect: askAbort },
            { separator: true },
            { label: 'Enter OIA &observation', onSelect: observe },
            { separator: true },
            { label: 'Acknowledge &alarms', shortcut: 'Ctrl+K', onSelect: () => ackTiles(TILE_DEFS.map((d) => d.id).filter((id) => ann[id]?.seq === 'unack')) },
            { label: '&Reset annunciator', onSelect: () => resetTiles(TILE_DEFS.map((d) => d.id).filter((id) => ann[id]?.seq === 'ringback')) },
          ],
    },
    {
      label: '&Go',
      items: [
        { label: '&Coordinator (home)', onSelect: () => win.navigate('/drill') },
        { separator: true },
        { label: `${PROC}  Network Seal Drill: Order, Relay and Report`, onSelect: () => openDoc(PROC) },
        { label: `${CARD}  Site Action Card, Seal Drill`, onSelect: () => openDoc(CARD) },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: '&Glossary', onSelect: () => openDoc('OSC-SYS-GLO') },
        { separator: true },
        {
          label: '&About Seal Drill Coordinator',
          onSelect: () =>
            setNotice({
              title: 'About Seal Drill Coordinator',
              kind: 'info',
              body: `Seal Drill Coordinator, Network Control order position client. Orders are issued by Network Control, ${SD.origin}, and relayed over the inter-hub circuits, the tram order wires and voice circuits. Drill time runs ${SD.timeScale} times faster than the wall clock on this display. Operation of the coordinator is recorded in the workstation audit trail.`,
              reference: 'MERIDIAN 4.1.7',
            }),
        },
      ],
    },
  ];

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && !e.altKey && /^[1-9]$/.test(e.key)) {
      const v = views[Number(e.key) - 1];
      if (v) {
        e.preventDefault();
        if (docRoute) win.navigate('/drill');
        setView(v.id);
      }
    } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      printDoc();
    } else if (e.ctrlKey && (e.key === 'k' || e.key === 'K') && !siteOnly) {
      e.preventDefault();
      ackTiles(TILE_DEFS.map((d) => d.id).filter((id) => ann[id]?.seq === 'unack'));
    } else if (e.key === 'Escape' && (selected || logSel) && !confirm && !abortAsk && !notice) {
      setSelected(siteOnly);
      setLogSel(null);
    }
  };

  /* ---------------------------------------------------------------- body */
  const t = drill ? minuteAt(drill, drill.endedAt !== null ? Math.min(now, drill.endedAt) : now) : 0;
  const vp = { drill, now, selected, onSelect: (id: string | null) => setSelected(siteOnly ?? id) };
  const regRows = registerRows(register, services.account.all(), drill, siteOnly);
  const selLine = lines.find((l) => l.key === logSel) ?? null;

  let main;
  if (view === 'document') {
    main = refused ? (
      <RefusalState
        authority={t4Refused ? 'Facilities Engineering' : 'Transit Operations'}
        reference={t4Refused ? 'DIR-0301' : 'DIR-0412'}
        docNo={docRoute?.docNo}
        reason={t4Refused ? 'Requires Tier 3 access determination.' : `${docRoute?.docNo} requires an access determination this operator does not hold.`}
        requirement={t4Refused ? 'Tier 3 access determination. Reference DIR-0301.' : undefined}
      />
    ) : docErr ? (
      <RefusalState authority="Records Division" reference="DIR-0412" reason="The document could not be retrieved from the records server. The request has been recorded." />
    ) : doc ? (
      <div class="sd-doc">
        <DocumentView
          doc={doc}
          markings={canon.markings}
          onNavigate={(p) => (p.startsWith('/drill') ? win.navigate(p) : services.openRoute(p))}
          onRedactionHover={(i) => services.audit.log('redaction.hover', doc.docNo, `Operator ${op} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)}
        />
      </div>
    ) : (
      <p class="sd-note sd-pad">Retrieving document from the records server.</p>
    );
  } else if (view === 'map') main = <MapView {...vp} />;
  else if (view === 'mimic') main = <MimicView {...vp} />;
  else if (view === 'timeline') main = <TimelineView {...vp} only={siteOnly} />;
  else if (view === 'log')
    main = (
      <div class="sd-logwrap">
        <LogView
          lines={lines}
          selected={logSel}
          onSelect={(k) => {
            setLogSel(k);
            const l = lines.find((x) => x.key === k);
            if (l?.facility && !siteOnly) setSelected(l.facility);
          }}
          onActivate={queryLine}
          empty={drill ? 'No traffic yet.' : 'No drill has been ordered from this coordinator. Relay traffic appears here as the order goes out.'}
        />
        {selLine && (
          <div class="sd-linebar">
            <span class="sd-mono">
              {selLine.dtg} {selLine.clock} FM {selLine.from} TO {selLine.to} CCT {selLine.circuit}
            </span>
            <button type="button" class="btn" onClick={() => queryLine(selLine)}>
              Query line with Network Control
            </button>
          </div>
        )}
      </div>
    );
  else if (view === 'register') main = <RegisterView rows={regRows} only={siteOnly} />;
  else main = sitePanel();

  function sitePanel() {
    const st = siteState?.status ?? 'pending';
    const received = !!drill && !!sitePlan && !sitePlan.causes.includes('cut') && t >= sitePlan.receipt;
    const sinceMin = received && sitePlan ? Math.max(0, t - sitePlan.receipt) : null;
    const since = sinceMin === null ? 'no order received' : drillClock(sinceMin);
    const ended = drill?.phase === 'stand-down' || drill?.phase === 'aborted';
    return (
      <div class="sd-sitepanel">
        <PanelFrame title={['SEAL DRILL', `${siteOnly} SITE ORDER POSITION`]} panelNo={frag.orderPosition.panelNo}>
          <PanelSection title="ORDER" columns={3}>
            <Lamp legend={['ORDER', 'RECEIVED']} lit={received && !ended} color="white" showState />
            <Lamp legend={['ACKNOW-', 'LEDGED']} lit={!ended && siteState?.acknowledged != null} color="white" showState />
            <Lamp legend={['STAND', 'DOWN']} lit={!!ended && received} color="green" showState />
          </PanelSection>
          <PanelSection title="SEAL" columns={3}>
            <Lamp legend={['DOORS', 'CLOSING']} lit={!ended && st === 'sealing'} color="amber" showState />
            <Lamp legend={['SEALED', '(DRILL)']} lit={!ended && st === 'sealed'} color="green" showState />
            <Lamp legend={['NO', 'REPORT']} lit={!ended && st === 'no-report'} color="red" showState />
          </PanelSection>
          <PanelSection title="SINCE RECEIPT" columns={1}>
            <SegmentDisplay value={sinceMin === null ? '----' : sinceMin} digits={4} decimals={1} label="MIN (DRILL TIME)" ariaLabel={`Drill time since receipt ${since}`} />
          </PanelSection>
          <PanelSection title="SITE REPORTS" columns={2}>
            <PushButton legend={['ACK', 'ORDER']} label="ACKNOWLEDGE" color="white" lit={received && siteState?.acknowledged == null && !ended} onPress={siteAck} tag="PB-1" />
            <PushButton legend={['REPORT', 'SEALED']} label="REPORT" color="green" lit={st === 'sealing' && !ended} onPress={siteSealed} tag="PB-2" />
          </PanelSection>
        </PanelFrame>
        <div class="sd-sitenote">
          <p>
            Status: <strong>{received || siteState?.acknowledged != null ? STATUS_WORD[st] : drill && !ended ? 'NO ORDER RECEIVED' : 'NO DRILL IN PROGRESS'}</strong>
            {drill ? `  Drill ${drill.id}, ${PHASE_WORD[drill.phase]}.` : ''}
          </p>
          <p>
            Work to the site action card, <a href="#" onClick={(e) => (e.preventDefault(), openDoc(CARD))}>{CARD}</a>. Acknowledge on receipt; close the seal doors in the order on the card; report sealed when every seal door shows CLOSED AND DOGGED.
          </p>
        </div>
      </div>
    );
  }

  const ordered = drill ? Object.values(drill.sites).filter((x) => now >= x.ordered).length : 0;
  const total = SD.sequence.length;

  const controls = siteOnly ? null : (
    <div class="sd-side" aria-label="Order position">
      <PanelFrame title={['SEAL DRILL', 'ORDER POSITION']} panelNo={frag.orderPosition.panelNo}>
        <PanelSection title="DRILL CLOCK" columns={2}>
          <SegmentDisplay value={drill ? Math.max(0, t) : '----'} digits={4} decimals={1} label="T+ MIN (DRILL)" ariaLabel={`Drill clock ${drill ? drillClock(t) : 'not running'}`} />
          <SegmentDisplay value={drill ? sum!.sealed : '--'} digits={2} label={`SEALED / ${total}`} ariaLabel={`${sum?.sealed ?? 0} of ${total} sites sealed`} />
        </PanelSection>
        <PanelSection title="ORDER" columns={2}>
          <KeySwitch
            positions={['OFF', 'ENABLE']}
            value={keyPos}
            label="ORDER AUTHORITY"
            keyPresent={canOrder}
            keyNo={frag.orderPosition.keyNo}
            removableAt={[0]}
            tag={frag.orderPosition.keyNo}
            onLocked={refuseOrder}
            onChange={(i) => {
              setKeyPos(i);
              services.sound.play('switch');
              services.audit.log('control', 'drill:key', `Operator ${op} turned order authority key ${frag.orderPosition.keyNo} to ${i ? 'ENABLE' : 'OFF'}.`, { key: frag.orderPosition.keyNo, position: i ? 'ENABLE' : 'OFF' });
              if (!i) setGuard('closed');
            }}
          />
          <GuardedSwitch
            state={guard}
            label={['SEAL DRILL', 'ORDER']}
            plate="warning"
            holdMs={2000}
            tag="HS-0433"
            reducedMotion={services.settings.reducedMotion.value}
            onLift={() => {
              if (!canOrder) return refuseOrder();
              if (keyPos !== 1) {
                setNotice({ title: 'Order seal drill', kind: 'info', body: `The cover is interlocked with the order authority key. Turn key ${frag.orderPosition.keyNo} to ENABLE first.`, reference: `Ref ${PROC} para 4` });
                return;
              }
              setGuard('lifted');
              services.sound.play('guard');
            }}
            onClose={() => {
              setGuard('closed');
              services.sound.play('guard');
            }}
            onActuate={() => {
              setGuard('actuated');
              services.sound.play('button');
              startOrder();
            }}
            onAbort={() => setGuard('lifted')}
          />
        </PanelSection>
        <PanelSection title="DRILL" columns={3}>
          <PushButton legend={['STAND', 'DOWN']} color="green" lit={drill?.phase === 'sealed'} onPress={standDown} tag="PB-3" />
          <PushButton legend={['ABORT']} color="red" lit={drill?.phase === 'propagating'} onPress={askAbort} tag="PB-4" />
          <PushButton legend={['OIA', 'OBSERVER']} color="white" mode="latching" pressed={!!drill?.observer && active} lit={!!drill?.observer && active} onPress={observe} tag="PB-5" />
        </PanelSection>
        <PanelSection columns={1}>
          <Annunciator
            tiles={tiles}
            columns={4}
            label="DRILL ANNUNCIATOR"
            tileWidth={narrow ? 70 : 64}
            test={lampTest}
            reducedMotion={services.settings.reducedMotion.value}
            onAck={ackTiles}
            onReset={resetTiles}
            onTest={(on) => {
              setLampTest(on);
              if (on) services.sound.play('button');
            }}
          />
        </PanelSection>
        <Plate text={canOrder ? 'ORDER KEY HELD' : canObserve ? 'OBSERVE ONLY' : 'MONITOR ONLY'} variant={canOrder ? 'dark' : 'light'} size="sm" />
      </PanelFrame>
      {selected && view !== 'register' && view !== 'document' && (
        <div class="sd-sel">
          <div class="sd-caption">Site detail</div>
          <SiteDetail drill={drill} now={now} id={selected} />
        </div>
      )}
    </div>
  );

  return (
    <div class={`sd-root${narrow ? ' is-narrow' : ''}`} ref={rootRef} onKeyDown={onKey}>
      <MenuBar menus={menus} label="Seal Drill Coordinator menu" />
      <Toolbar label="Coordinator views">
        {views.map((v, i) => (
          <ToolbarButton key={v.id} label={v.label} pressed={view === v.id} onClick={() => (docRoute ? (win.navigate('/drill'), setView(v.id)) : setView(v.id))} title={`${v.label} (Ctrl+${i + 1})`} />
        ))}
        <ToolbarSeparator />
        <ToolbarButton label={siteOnly ? 'Action card' : 'Procedure'} pressed={view === 'document'} onClick={() => openDoc(siteOnly ? CARD : PROC)} title={siteOnly ? CARD : PROC} />
        <ToolbarSpacer />
        <ToolbarButton label="Print" onClick={printDoc} title="Print (Ctrl+P)" />
      </Toolbar>
      <div class="sd-body">
        <div class="sd-main">{main}</div>
        {controls}
      </div>
      <StatusBar
        panes={[
          { id: 'drill', content: drill ? `${drill.id}  ${PHASE_WORD[drill.phase]}` : 'No drill ordered', fill: true },
          { id: 'clock', content: drill ? drillClock(t) : 'T+--:--', mono: true, label: 'Drill clock' },
          ...(siteOnly
            ? []
            : [
                { id: 'relay', content: `Ordered ${ordered}/${total}`, mono: true, label: 'Sites that have received the order' },
                { id: 'ack', content: `Ack ${sum?.acknowledged ?? 0}/${total}`, mono: true, label: 'Sites acknowledged' },
                { id: 'sealed', content: `Sealed ${sum?.sealed ?? 0}/${total}`, mono: true, label: 'Sites sealed' },
                { id: 'nr', content: `No report ${sum?.noReport.length ?? 0}`, mono: true },
              ]),
          { id: 'circuits', content: isolated ? 'Hub circuits DOWN' : 'Hub circuits up', label: 'Inter-hub circuits' },
          { id: 'nc', content: `NC ${hhmmssZ(now)}`, mono: true, label: 'Network Control time' },
        ]}
      />
      {notice && (
        <MessageBox open title={notice.title} kind={notice.kind} reference={notice.reference} onClose={() => setNotice(null)} onOpen={(k) => k !== 'info' && services.sound.play('error')}>
          {notice.body}
        </MessageBox>
      )}
      {confirm && <OrderDialog id={confirm.id} onIssue={issueOrder} onCancel={() => (setConfirm(null), setGuard('lifted'))} isolated={isolated} />}
      {abortAsk && drill && (
        <Dialog
          open
          title="Abort seal drill"
          kind="question"
          reference={`Ref ${PROC} para 6`}
          buttons={[
            { label: '&Abort drill', value: 'abort' },
            { label: 'Cancel', value: 'cancel', isDefault: true, isCancel: true },
          ]}
          onClose={(v) => (v === 'abort' ? doAbort() : setAbortAsk(false))}
        >
          Abort drill {drill.id} at {drillClock(t)}? Network Control passes ABORTED to every station. Sites that have not received the order take no action; sites sealing or sealed reopen. The abort is entered in the drill register.
        </Dialog>
      )}
    </div>
  );
}

/** Two-person rule: a second officer at the order position and Network Control's read-back of the drill number. */
function OrderDialog({ id, onIssue, onCancel, isolated }: { id: string; onIssue: (id: string, second: string) => void; onCancel: () => void; isolated: boolean }) {
  const [second, setSecond] = useState('');
  const [readBack, setReadBack] = useState('');
  const [sighted, setSighted] = useState(false);
  const [err, setErr] = useState<{ second?: string; read?: string; sighted?: string }>({});
  const close = (v: string) => {
    if (v !== 'issue') return onCancel();
    const e: typeof err = {};
    if (!second) e.second = 'A second officer must be present at the order position.';
    if (readBack.trim().toUpperCase() !== id) e.read = `Read-back does not agree with drill number ${id}. Enter the number as Network Control reads it back.`;
    if (!sighted) e.sighted = 'The second officer countersigns the order.';
    setErr(e);
    if (!Object.keys(e).length) onIssue(id, second);
  };
  return (
    <Dialog
      open
      title={`Order network seal drill ${id}`}
      kind="question"
      reference={`Ref ${PROC} para 4 (two-person rule)`}
      buttons={[
        { label: '&Issue order', value: 'issue', isDefault: true },
        { label: 'Cancel', value: 'cancel', isCancel: true },
      ]}
      onClose={close}
    >
      <p class="sd-dlg-p">
        Network Control, {SD.origin}, will issue seal drill <span class="sd-mono">{id}</span> to every station on the plant network ({SD.sequence.length} sites). {SD.excluded.text}
      </p>
      {isolated && <p class="sd-dlg-p sd-dlg-warn">Hub circuits are down. The order will not pass beyond the {canon.tramNetworks.find((n) => n.hubs.includes(SD.origin))?.name ?? 'origin network'}; other sites will be carried as NO REPORT.</p>}
      <FieldGroup labelWidth="150px">
        <Select label="Second officer" value={second} onChange={setSecond} options={frag.orderPosition.secondOfficers.map((s) => ({ value: s, label: s }))} emptyLabel="(select one)" error={err.second} required />
        <TextField label="Read-back received" value={readBack} onInput={setReadBack} mono upper maxLength={16} error={err.read} hint={`Network Control reads back the drill number: ${id}`} required />
        <Checkbox label="Second officer has sighted the order and countersigns" checked={sighted} onChange={setSighted} error={err.sighted} aligned />
      </FieldGroup>
    </Dialog>
  );
}
