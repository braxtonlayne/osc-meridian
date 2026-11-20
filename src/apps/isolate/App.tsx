/**
 * Network Isolation, Manual Initiate (control HS-0001). The covered two-step control:
 * lift the guard, then press and hold. Each initiation raises a global, persistent
 * escalation level (shared key `isolation`, owner: this app) with consequences across
 * every account: audit, OIA mail, network notices, the deputy commander's restoration
 * certificate, an OIA finding and review, a tamper seal on the cover, a probation report,
 * and at level 5 an isolation that is held for good. Restoration only by procedure.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AccountId, AppProps, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { handheldActive, useServices } from '@core/services';
import { inWorldIso, tick } from '@core/session';
import { Dialog, MenuBar, MessageBox, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, type MenuBarMenu } from '@design/index';
import { annunciatorStep, type AnnPoint, type AnnunciatorTile, type GuardState } from '@graphics/panel';
import { hubLinks } from '@shell/Taskbar';
import { zuluLocal } from '@shell/isolation';
import {
  attachTrace,
  breakSeal,
  decideCertificate,
  expire,
  fmtRemaining,
  initiate,
  initiateBlock,
  isIsolated,
  latest,
  levelDef,
  mailPlan,
  normalize,
  NONE,
  pendingCert,
  raiseCertificate,
  remainingMs,
  type MailItem,
} from './logic';
import { DIR_REF, HOME, PANEL_TITLE, canon, cfg, dtg, operatorOf, rightsFor } from './model';
import type { IsolateState } from './types';
import { DocPane, Refused } from './DocPane';
import { LinksView, PanelView, RegisterView, RestorationView, SiteView } from './Views';
import './isolate.css';

type View = 'panel' | 'register' | 'restoration' | 'links';
const VIEW_TITLE: Record<View, string> = { panel: 'Control panel', register: 'Initiation register', restoration: 'Restoration', links: 'Hub links' };
const SHARED_KEY = 'isolation';

interface Notice {
  title: string;
  body: string;
  reference?: string;
  kind?: 'info' | 'warning' | 'error';
}

interface TileDef {
  id: string;
  legend: string[];
  priority: 'alarm' | 'warning' | 'status';
}
const TILES: TileDef[] = [
  { id: 'iso', legend: ['NETWORK', 'ISOLATED'], priority: 'alarm' },
  { id: 'hub', legend: ['HUB LINKS', 'DOWN'], priority: 'alarm' },
  { id: 'mi', legend: ['MANUAL', 'INITIATE'], priority: 'alarm' },
  { id: 'held', legend: ['ISOLATION', 'HELD'], priority: 'alarm' },
  { id: 'cert', legend: ['CERTIFICATE', 'REQUIRED'], priority: 'warning' },
  { id: 'pend', legend: ['RESTORE', 'PENDING'], priority: 'warning' },
  { id: 'review', legend: ['OIA', 'REVIEW'], priority: 'warning' },
  { id: 'sealbrk', legend: ['SEAL', 'BROKEN'], priority: 'warning' },
  { id: 'cover', legend: ['COVER', 'LIFTED'], priority: 'warning' },
  { id: 'timer', legend: ['AUTO CLEAR', 'TIMING'], priority: 'status' },
  { id: 'sealed', legend: ['COVER', 'SEALED'], priority: 'status' },
  { id: 'spare', legend: [''], priority: 'status' },
];

function abnormalSet(s: IsolateState, now: number, guard: GuardState): Record<string, boolean> {
  const iso = isIsolated(s, now);
  const def = levelDef(cfg, s.level);
  const pend = !!pendingCert(s);
  return {
    iso,
    hub: iso,
    mi: iso && !!latest(s),
    held: !!s.withdrawn,
    cert: iso && !s.withdrawn && !pend && (def?.restoration === 'certificate' || def?.restoration === 'automatic-or-certificate'),
    pend,
    review: s.level >= 3,
    sealbrk: !!s.seal?.broken && !s.withdrawn,
    cover: guard !== 'closed' && !s.withdrawn,
    timer: iso && s.clearsAt != null,
    sealed: !!s.seal && !s.seal.broken,
    spare: false,
  };
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const acct = services.account.def.value;
  const me: AccountId = services.account.id.value;
  const rights = rightsFor(acct);
  const raw = services.shared.get<IsolateState>(SHARED_KEY, NONE).value;
  const s = useMemo(() => normalize(raw), [raw]);
  const now = tick.value;
  const iso = isIsolated(s, now);
  const op = services.session.operatorId.value;

  const [view, setView] = useState<View>('panel');
  const [guard, setGuard] = useState<GuardState>('closed');
  const [showArchived, setShowArchived] = useState(false);
  const [statement, setStatement] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmSeal, setConfirmSeal] = useState(false);
  const [confirmCert, setConfirmCert] = useState<string | null>(null);
  const [lampTest, setLampTest] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const horn = useRef(false);

  const all = services.docs.all();
  const docs = useMemo(() => all.filter((r) => r.app === 'isolate').sort((a, b) => a.docNo.localeCompare(b.docNo)), [all]);
  const procedure = docs.find((r) => r.docNo === cfg.panel.procedureDocNo);
  const schedule = docs.find((r) => r.docNo === cfg.panel.scheduleDocNo);

  /* ------------------------------------------------------- shared state io */

  const write = (fn: (prev: IsolateState) => IsolateState | null) =>
    services.shared.update<IsolateState>(SHARED_KEY, NONE, (prev) => fn(normalize(prev)) ?? prev);

  const audit = (action: string, detail: string, data: Record<string, string> = {}) =>
    services.audit.log('control', `isolate:${action}`, detail, { panel: cfg.panel.tag, level: String(normalize(services.shared.get<IsolateState>(SHARED_KEY, NONE).peek()).level), ...data });

  const subjectOf = (msgId: string) => all.find((r) => r.id === msgId)?.title ?? 'Message';

  const sendMail = (items: MailItem[], slots: Record<string, string>) => {
    const posted = services.traces.all.peek();
    for (const m of items) {
      if (m.account === me) services.mail.deliver(m.msg, { slots });
      else if (!posted.some((t) => t.kind === 'mail.deliver' && t.msgId === m.msg && t.to === m.account))
        services.traces.post({ to: m.account, kind: 'mail.deliver', msgId: m.msg, subject: subjectOf(m.msg) });
    }
  };

  /* ---------------------------------------------- automatic restoration */

  useEffect(() => {
    if (!s.active || s.clearsAt == null || now < s.clearsAt) return;
    write((prev) => expire(prev, cfg, Date.now(), (ms) => inWorldIso(new Date(ms))));
    services.sound.play('relay');
  }, [now >= (s.clearsAt ?? Infinity), s.active]);

  // The actuator stays in once actuated; when the isolation ends (restored or cleared) the cover is shut.
  useEffect(() => {
    if (!iso && !s.withdrawn && guard === 'actuated') setGuard('closed');
  }, [iso]);

  /* ---------------- decisions returned through another queue (form.decided) */

  const traces = services.traces.all.value;
  useEffect(() => {
    const pend = pendingCert(s);
    if (!pend) return;
    const d = traces.find((t) => t.kind === 'form.decided' && t.from === 'deputy' && (t.data?.receipt === pend.cert || t.subject === pend.cert));
    if (!d) return;
    const decision = d.data?.decision === 'approved' ? 'approved' : 'returned';
    write((prev) => decideCertificate(prev, cfg, { cert: pend.cert, decision, by: 'deputy', iso: d.at, note: d.data?.note, now: Date.now() }));
  }, [traces.length, s.restorations?.length]);

  /* ------------------------------------------------------- annunciator */

  const abn = abnormalSet(s, now, guard);
  const abnKey = TILES.map((t) => (abn[t.id] ? '1' : '0')).join('');
  const [pts, setPts] = useState<Record<string, AnnPoint>>(() => {
    const p: Record<string, AnnPoint> = {};
    for (const t of TILES) p[t.id] = abn[t.id] ? { seq: 'ack', abnormal: true } : { seq: 'normal', abnormal: false };
    return p;
  });
  useEffect(() => {
    let newAlarm = false;
    setPts((prev) => {
      const n = { ...prev };
      for (const t of TILES) {
        const was = prev[t.id]!.abnormal;
        const is = !!abn[t.id];
        if (is !== was) {
          n[t.id] = annunciatorStep(prev[t.id]!, is ? 'abnormal' : 'normal');
          if (is && t.priority === 'alarm') newAlarm = true;
        }
      }
      return n;
    });
    if (newAlarm && !horn.current) {
      horn.current = true;
      services.sound.play('alarm');
    }
  }, [abnKey]);
  useEffect(
    () => () => {
      if (horn.current) services.sound.stop('alarm');
    },
    [],
  );

  const ack = (ids: string[]) => {
    setPts((prev) => {
      const n = { ...prev };
      for (const id of ids) n[id] = annunciatorStep(n[id]!, 'ack');
      return n;
    });
    if (horn.current) {
      horn.current = false;
      services.sound.stop('alarm');
      services.sound.play('ack');
      audit('alarm-ack', `Operator ${op} acknowledged the alarm at control ${cfg.panel.tag}. Horn silenced.`, { windows: ids.join(',') });
    }
  };
  const ackAll = () => ack(TILES.filter((t) => pts[t.id]?.seq === 'unack').map((t) => t.id));
  const reset = (ids: string[]) =>
    setPts((prev) => {
      const n = { ...prev };
      for (const id of ids) n[id] = annunciatorStep(n[id]!, 'reset');
      return n;
    });
  const tiles: AnnunciatorTile[] = TILES.map((t) => ({ id: t.id, legend: t.legend, priority: t.priority, seq: pts[t.id]?.seq ?? 'normal', spare: t.id === 'spare' }));

  /* ------------------------------------------------------------ refusals */

  const refuse = (n: Notice) => {
    services.sound.play('error');
    setNotice({ kind: 'warning', ...n });
    services.audit.log('window.open', `isolate:${n.title}`, `Operator ${op} attempted an operation at control ${cfg.panel.tag}. Refused: ${n.body}`);
  };
  const operatorRefusal = () =>
    refuse({
      title: 'Control not operable by this account',
      body: acct.auditReader
        ? `Assurance staff observe the control and its register. They do not operate it (${DIR_REF} para 3.4).`
        : `Control ${cfg.panel.tag} is operated only by the assigned operator of workstation A03-5-114 or by a command officer of the hub (${DIR_REF} para 3.1).`,
      reference: cfg.panel.procedureDocNo,
    });

  /* ---------------------------------------------------------- controls */

  const lift = () => {
    if (!rights.operate) return operatorRefusal();
    if (s.withdrawn) return refuse({ title: 'Control withdrawn from service', body: 'The control is withdrawn from service in the actuated position. The cover is not lifted.', reference: cfg.panel.procedureDocNo });
    if (s.seal && !s.seal.broken)
      return refuse({ title: 'Cover sealed', body: `The cover is held by tamper seal ${s.seal.no}. The seal must be broken before the cover can be lifted (${DIR_REF} para 5.3).`, reference: cfg.panel.procedureDocNo });
    setGuard('lifted');
    services.sound.play('guard');
    audit('cover-lift', `Operator ${op} lifted the guard cover of control ${cfg.panel.tag} (Network Isolation, Manual Initiate) at workstation ${acct.workstation}.`);
  };
  const closeCover = () => {
    if (guard === 'closed') return;
    setGuard('closed');
    services.sound.play('guard');
    audit('cover-close', `Operator ${op} closed the guard cover of control ${cfg.panel.tag}.`);
  };
  const arm = () => services.sound.play('button');
  const abort = () => audit('hold-released', `Operator ${op} released the actuator of control ${cfg.panel.tag} before the hold was complete. No initiation was made.`);

  const actuate = () => {
    const cur = normalize(services.shared.get<IsolateState>(SHARED_KEY, NONE).peek());
    const block = initiateBlock(cur, Date.now());
    if (block === 'latched') {
      setGuard('lifted');
      services.sound.play('relay');
      audit('actuate-latched', `Operator ${op} actuated control ${cfg.panel.tag} while the isolation was latched. The actuation had no further effect and was recorded.`);
      setNotice({ kind: 'info', title: 'Isolation already latched', body: 'The network is already isolated. The actuation has no further effect on the circuits and does not raise the escalation level. It is recorded.', reference: cfg.panel.procedureDocNo });
      return;
    }
    const r = initiate(cur, cfg, { by: me, operatorId: acct.operatorId, iso: inWorldIso(), now: Date.now() });
    if ('refused' in r) {
      setGuard('closed');
      return lift();
    }
    services.shared.set(SHARED_KEY, r.state);
    setGuard('actuated');
    services.sound.play('relay');
    const ini = r.initiation;
    audit(
      'initiate',
      `Operator ${op} initiated network isolation at control ${cfg.panel.tag}, workstation ${acct.workstation}. Reference ${ini.ref}. Escalation level ${r.state.level}. All remote hub circuits dropped. Reported to the Office of Internal Assurance.`,
      {
        ref: ini.ref,
        level: String(r.state.level),
        by: me,
        clearsAt: r.state.clearsAt == null ? 'manual' : new Date(r.state.clearsAt).toISOString(),
      },
    );
    const at = new Date();
    sendMail(mailPlan(r.def, me, canon.accounts), {
      ref: ini.ref,
      date: dtg(ini.at).slice(0, 11),
      time: zuluLocal(ini.at),
      level: String(r.state.level),
      operator: acct.operatorId,
      clears: r.state.clearsAt == null ? 'not before restoration by certificate' : `after line checks, about ${fmtRemaining(r.state.clearsAt - at.getTime())} from initiation`,
    });
  };

  const doBreakSeal = () => {
    setConfirmSeal(false);
    const cur = normalize(services.shared.get<IsolateState>(SHARED_KEY, NONE).peek());
    const no = cur.seal?.no;
    const next = breakSeal(cur, { by: me, iso: inWorldIso() });
    if (!next || !no) return;
    services.shared.set(SHARED_KEY, next);
    services.sound.play('switch');
    audit('seal-break', `Operator ${op} broke tamper seal ${no} on the cover of control ${cfg.panel.tag}. The breaking of the seal is reported to the Office of Internal Assurance.`, { seal: no });
    sendMail([{ account: 'auditor', msg: cfg.outcomeMail.sealBroken }], { seal: no, operator: acct.operatorId, date: dtg(inWorldIso()).slice(0, 11) });
  };
  const askBreakSeal = () => {
    if (!rights.operate) return operatorRefusal();
    if (!s.seal || s.seal.broken) return refuse({ title: 'No seal to break', body: 'No intact tamper seal is fitted to the cover.', reference: cfg.panel.procedureDocNo });
    setConfirmSeal(true);
  };

  /* -------------------------------------------------------- restoration */

  const raise = () => {
    if (!rights.raise) return operatorRefusal();
    const cur = normalize(services.shared.get<IsolateState>(SHARED_KEY, NONE).peek());
    const r = raiseCertificate(cur, cfg, { by: me, iso: inWorldIso(), now: Date.now(), statement });
    if ('refused' in r) {
      return refuse({
        title: 'Certificate not raised',
        body:
          r.refused === 'statement'
            ? `The statement of circumstances must be at least ${cfg.panel.statementMinChars} characters.`
            : r.refused === 'pending'
              ? 'A certificate for this isolation is already with the certifying officer.'
              : r.refused === 'automatic-only'
                ? 'At this level the circuits are restored after line checks. A certificate is not accepted.'
                : r.refused === 'withdrawn'
                  ? 'Restoration is reserved to the Council Secretariat. No certificate is accepted at this panel.'
                  : 'The network is not isolated. No certificate is required.',
        reference: cfg.panel.procedureDocNo,
      });
    }
    const tr = services.traces.post({
      to: 'deputy',
      kind: 'form.routed',
      subject: r.cert.cert,
      data: { form: cfg.panel.restorationForm, receipt: r.cert.cert, ref: r.cert.ref, level: String(r.cert.level), statement: r.cert.statement ?? '', app: 'isolate' },
    });
    services.shared.set(SHARED_KEY, attachTrace(r.state, r.cert.cert, tr.id));
    services.sound.play('button');
    setStatement('');
    audit('certificate-raise', `Operator ${op} raised ${cfg.panel.restorationForm} ${r.cert.cert} for isolation ${r.cert.ref}. Routed to the Deputy Commander, ALPHA-02.`, {
      cert: r.cert.cert,
      ref: r.cert.ref,
      trace: tr.id,
    });
    setNotice({ kind: 'info', title: 'Certificate routed', body: `${cfg.panel.restorationForm} ${r.cert.cert} has been routed to the Deputy Commander, ALPHA-02, as certifying officer. Trace ${tr.id}.`, reference: cfg.panel.procedureDocNo });
  };

  const decide = (cert: string, decision: 'approved' | 'returned') => {
    if (!rights.certify)
      return refuse({ title: 'Not the certifying officer', body: 'Circuit Restoration Certificates are approved by the Deputy Commander, ALPHA-02, only.', reference: cfg.panel.procedureDocNo });
    const cur = normalize(services.shared.get<IsolateState>(SHARED_KEY, NONE).peek());
    const c = (cur.restorations ?? []).find((x) => x.cert === cert);
    const next = decideCertificate(cur, cfg, { cert, decision, by: me, iso: inWorldIso(), note: note.trim() || undefined, now: Date.now() });
    if (!next || !c) return;
    services.shared.set(SHARED_KEY, next);
    if (c.trace) services.traces.markSeen(c.trace);
    if (c.raisedBy !== 'system' && c.raisedBy !== me) services.traces.post({ to: c.raisedBy, kind: 'form.decided', subject: cert, data: { receipt: cert, decision, note: note.trim(), app: 'isolate', ...(c.trace ? { routed: c.trace } : {}) } });
    const msg = decision === 'approved' ? cfg.outcomeMail.approved : cfg.outcomeMail.returned;
    if (c.raisedBy !== 'system') {
      if (c.raisedBy === me) services.mail.deliver(msg, { slots: { cert, ref: c.ref, note: note.trim() || 'None.' }, repeat: true });
      else sendMail([{ account: c.raisedBy, msg }], {});
    }
    setNote('');
    if (decision === 'approved') {
      services.sound.play('relay');
      audit('certificate-approve', `Operator ${op} approved ${cfg.panel.restorationForm} ${cert} as certifying officer. Hub circuits restored. Escalation level unchanged.`, { cert, ref: c.ref });
      if (next.seal && next.seal.no !== cur.seal?.no)
        audit('seal-fit', `Tamper seal ${next.seal.no} fitted to the cover of control ${cfg.panel.tag} on restoration under ${cfg.panel.procedureDocNo}.`, { seal: next.seal.no });
    } else {
      services.sound.play('button');
      audit('certificate-return', `Operator ${op} returned ${cfg.panel.restorationForm} ${cert} without approval. Isolation continues.`, { cert, ref: c.ref });
    }
  };

  /* ------------------------------------------------------ view switching */

  const go = (v: View) => {
    if (!rights.view && v !== 'panel') return refuseT4();
    setView(v);
    if (route) win.navigate(HOME);
  };
  const refuseT4 = () =>
    refuse({ title: 'Not available at this site', body: 'Requires Tier 3 access determination. This display shows the external circuits of this site only.', reference: 'OSC-DIR-0301' });
  const openDoc = (r: RouteEntry | undefined) => {
    if (!rights.view) return refuseT4();
    if (r) win.navigate(r.route);
    else refuse({ title: 'Document not held', body: 'The document is not held on the MERIDIAN index at this workstation.', reference: 'OSC-DIR-0412' });
  };
  const print = () => {
    if (route) return services.print(route.id);
    if (procedure && rights.view) return services.print(procedure.id);
    refuse({ title: 'Reproduction not available', body: 'Panel displays are not printed from the workstation. Print the operating procedure instead.', reference: 'OSC-DIR-0319' });
  };

  /* ------------------------------------------------- title, marking, status */

  const marking: MarkingId = route ? route.marking : rights.view ? 'UMBRA-R' : 'UMBRA-U';
  const title = route ? route.title : rights.view ? VIEW_TITLE[view] : 'Site External Circuits';
  const rem = remainingMs(s, now);
  const stateWord = s.withdrawn ? 'ISOLATED, HELD' : iso ? 'ISOLATED' : 'NORMAL';
  const message = route
    ? `${route.docNo} · ${route.originator} · Rev ${route.revision}`
    : !rights.view
      ? `Site ${acct.site}. External circuits ${iso ? 'out of service' : 'in service'}.`
      : iso
        ? `Network isolated by manual initiate ${latest(s)?.ref ?? ''}. Hub circuits down.`
        : guard === 'lifted'
          ? 'Cover lifted. Press and hold the actuator to initiate. Escape closes the cover.'
          : `Control ${cfg.panel.tag}. Network normal.`;
  useEffect(() => {
    win.setTitle(title, route?.docNo ?? '');
    win.setMarking(marking);
    win.setStatus(message);
  }, [title, route?.docNo, marking, message]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setNarrow((e?.contentRect.width ?? 900) < 700));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = narrow || handheldActive.value;

  /* ------------------------------------------------------------ keyboard */

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && !e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      go((['panel', 'register', 'restoration', 'links'] as View[])[Number(e.key) - 1]!);
    } else if (e.key === 'F9') {
      e.preventDefault();
      ackAll();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      print();
    }
  };

  /* -------------------------------------------------------------- menus */

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: 'Open &operating procedure', onSelect: () => openDoc(procedure) },
        { label: 'Open &escalation schedule', onSelect: () => openDoc(schedule) },
        { separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: print },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Control',
      items: [
        { label: guard === 'closed' ? '&Lift cover' : 'C&lose cover', shortcut: guard === 'closed' ? undefined : 'Esc', onSelect: () => (!rights.view ? refuseT4() : guard === 'closed' ? (go('panel'), lift()) : closeCover()) },
        { label: '&Break tamper seal...', onSelect: () => (!rights.view ? refuseT4() : (go('panel'), askBreakSeal())) },
        { separator: true },
        { label: '&Acknowledge alarms', shortcut: 'F9', onSelect: () => (!rights.view ? refuseT4() : ackAll()) },
        { label: 'Lamp &test', onSelect: () => (!rights.view ? refuseT4() : (setLampTest(true), setTimeout(() => setLampTest(false), 1500))) },
        { separator: true },
        { label: '&Raise restoration certificate...', onSelect: () => go('restoration') },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Control panel', shortcut: 'Ctrl+1', radio: true, checked: !route && view === 'panel', onSelect: () => go('panel') },
        { label: '&Initiation register', shortcut: 'Ctrl+2', radio: true, checked: !route && view === 'register', onSelect: () => go('register') },
        { label: '&Restoration', shortcut: 'Ctrl+3', radio: true, checked: !route && view === 'restoration', onSelect: () => go('restoration') },
        { label: '&Hub links', shortcut: 'Ctrl+4', radio: true, checked: !route && view === 'links', onSelect: () => go('links') },
        { separator: true },
        { label: 'Include &archived register entries', checked: showArchived, onSelect: () => (!rights.view ? refuseT4() : (setShowArchived((v) => !v), go('register'))) },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: `&Procedure ${DIR_REF}`, onSelect: () => openDoc(procedure) },
        { label: 'MERIDIAN &Help Desk', onSelect: () => services.openApp('system') },
        { separator: true },
        {
          label: '&About this control',
          onSelect: () =>
            setNotice({
              kind: 'info',
              title: 'About this control',
              body: rights.view
                ? `${PANEL_TITLE}, control ${cfg.panel.tag}. ${cfg.panel.station}. Remote panel of the key distribution network switch, ${cfg.panel.controlRoom}. ${canon.meta.environment} release ${canon.meta.release}.`
                : `Site External Circuits display, ${acct.site}. ${canon.meta.environment} release ${canon.meta.release}.`,
              reference: rights.view ? cfg.panel.procedureDocNo : 'OSC-DIR-0301',
            }),
        },
      ],
    },
  ];

  /* -------------------------------------------------------------- main */

  let main;
  if (!rights.view) {
    main = route ? (
      <Refused subject={route.docNo} reason="Requires Tier 3 access determination." reference="OSC-DIR-0301" authority="Classification Control, Office of Internal Assurance" />
    ) : (
      <SiteView site={acct.site} isolated={iso} since={iso ? (latest(s)?.at ?? null) : null} />
    );
  } else if (route) {
    main = (
      <div class="iso-routed">
        <div class="iso-strip" role="status">
          <span class={`st-sq ${iso ? 'st-fault' : 'st-nominal'}`} aria-hidden="true" />
          <span>
            Control {cfg.panel.tag}: network {stateWord.toLowerCase()}. Escalation level {s.level} of {cfg.levels.length}.
          </span>
          <button type="button" class="iso-linkbtn" onClick={() => go('panel')}>
            Open the control panel
          </button>
        </div>
        <DocPane entry={route} />
      </div>
    );
  } else if (view === 'register') {
    main = <RegisterView s={s} showArchived={showArchived} onToggleArchived={setShowArchived} />;
  } else if (view === 'restoration') {
    main = (
      <RestorationView s={s} now={now} rights={rights} me={me} statement={statement} onStatement={setStatement} onRaise={raise} note={note} onNote={setNote} onDecide={(cert, d) => (d === 'approved' ? setConfirmCert(cert) : decide(cert, d))} />
    );
  } else if (view === 'links') {
    main = <LinksView s={s} now={now} local={acct.site} links={hubLinks(now)} />;
  } else {
    main = (
      <PanelView
        s={s}
        now={now}
        rights={rights}
        guard={iso && guard === 'closed' && !s.withdrawn ? 'closed' : guard}
        tiles={tiles}
        lampTest={lampTest}
        compact={compact}
        onLift={lift}
        onClose={closeCover}
        onArm={arm}
        onAbort={abort}
        onActuate={actuate}
        onBreakSeal={askBreakSeal}
        onAck={ack}
        onReset={reset}
        onTest={setLampTest}
      />
    );
  }

  const tb = (v: View, label: string, t: string) => <ToolbarButton label={label} pressed={!route && view === v} onClick={() => go(v)} title={t} />;

  return (
    <div class={compact ? 'iso-app iso-app--compact' : 'iso-app'} ref={rootRef} onKeyDown={onKey}>
      <MenuBar menus={menus} label="Network Isolation menu" />
      {rights.view ? (
        <Toolbar label="Network Isolation views">
          {tb('panel', 'Panel', 'Control panel (Ctrl+1)')}
          {tb('register', 'Register', 'Initiation register (Ctrl+2)')}
          {tb('restoration', 'Restoration', 'Restoration (Ctrl+3)')}
          {tb('links', 'Links', 'Hub links (Ctrl+4)')}
          <ToolbarSeparator />
          <ToolbarButton label="Ack" onClick={ackAll} title="Acknowledge alarms (F9)" />
          {!compact && <ToolbarButton label="Procedure" onClick={() => openDoc(procedure)} title={`Operating procedure ${DIR_REF}`} />}
          <ToolbarSpacer />
        </Toolbar>
      ) : null}
      <main class="iso-main">{main}</main>
      <StatusBar
        panes={[
          { id: 'msg', content: message, fill: true },
          { id: 'net', content: rights.view ? stateWord : iso ? 'OUT OF SERVICE' : 'IN SERVICE', width: compact ? 90 : 120, mono: true, label: 'Network state' },
          ...(rights.view
            ? [
                { id: 'lvl', content: `LEVEL ${s.level}`, width: 70, mono: true, label: 'Escalation level' },
                { id: 'clr', content: iso && rem != null ? `CLR ${fmtRemaining(rem)}` : pendingCert(s) ? 'CERT PENDING' : iso ? 'NO AUTO CLR' : '--', width: compact ? 90 : 110, mono: true, label: 'Restoration' },
              ]
            : []),
          ...(compact ? [] : [{ id: 'op', content: operatorOf(me), width: 110, mono: true, label: 'Operator' }]),
        ]}
      />
      <MessageBox open={!!notice} kind={notice?.kind ?? 'info'} title={notice?.title ?? ''} reference={notice?.reference ? `Ref ${notice.reference}` : undefined} onClose={() => setNotice(null)}>
        {notice?.body}
      </MessageBox>
      <Dialog
        open={confirmSeal}
        kind="warning"
        title="Break tamper seal"
        reference={`Ref ${cfg.panel.procedureDocNo}`}
        buttons={[
          { label: '&Break seal', value: 'break' },
          { label: 'Cancel', value: 'cancel', isDefault: true, isCancel: true },
        ]}
        onClose={(v) => (v === 'break' ? doBreakSeal() : setConfirmSeal(false))}
      >
        Tamper seal {s.seal?.no} was fitted to this cover by the Resident Assurance Officer. Breaking it is reported to the Office of Internal Assurance at once, whether or not the control is then
        operated. The seal is not refitted from the workstation.
      </Dialog>
      <Dialog
        open={confirmCert !== null}
        kind="warning"
        title="Approve restoration certificate"
        reference={`Ref ${cfg.panel.procedureDocNo}`}
        buttons={[
          { label: '&Approve and restore', value: 'approve' },
          { label: 'Cancel', value: 'cancel', isDefault: true, isCancel: true },
        ]}
        onClose={(v) => {
          const cert = confirmCert;
          setConfirmCert(null);
          if (v === 'approve' && cert) decide(cert, 'approved');
        }}
      >
        Approve {cfg.panel.restorationForm} {confirmCert} as certifying officer? The hub circuits are restored at once. The approval is entered in the isolation register under your operator number and
        cannot be withdrawn. The escalation level is not reduced.
      </Dialog>
    </div>
  );
}
