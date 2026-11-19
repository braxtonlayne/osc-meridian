/**
 * Hardened Site Survivability Estimator (planning model PM-3), docs/SPEC-2.md §3.
 *
 * Pick a point (map, marker, keyboard cursor, local plot, or a typed anchor) and a yield step;
 * Run draws the cube-root-scaled contours and reads every installation whose position this
 * workstation holds against its hardening class and depth. Estimates can be entered in the
 * planning register (shared key `strike`), compared, withdrawn, queried by OIA, and printed.
 * Everything is labelled a simplified planning model, not for engineering use.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FacilityId, MarkingId } from '@core/canon-types';
import type { AppProps, DrillState, IsolationState, RouteEntry } from '@core/contracts';
import { loadCanonT2, t2Path } from '@core/canon-release';
import { useServices } from '@core/services';
import { formatInWorldDate, inWorldIso, siteLocal, zulu } from '@core/session';
import { Dialog, MenuBar, MessageBox, StatusBar, Tabs, TextArea, Toolbar, ToolbarButton, ToolbarLabel, ToolbarSeparator, ToolbarSpacer, type MenuBarMenu, type MenuItem } from '@design/index';
import { Icon } from '@graphics/icons';
import { RefusalState } from '@graphics/states';
import { ISOLATION_NONE, isolatedAt, latestInitiation } from '@shell/isolation';
import { EstimateView } from './EstimateView';
import { evaluate, fmtCoord, gazetteer, parseAnchor, positionOf, summarize, type Evaluation, type Pt } from './model';
import { ModelView } from './ModelView';
import { printSheet } from './print';
import { CompareView, RegisterView, statusOf } from './RegisterView';
import { DocPane, MODEL_MARKING, REGISTER_HOST, S, canon, facilityById, fill, fmtKt, frag, registerId, useDoc, whenText } from './shared';
import { STRIKE_EMPTY, STRIKE_KEY, type StrikeScenario, type StrikeState } from './types';
import './strike.css';

const TITLE = 'Hardened Site Survivability Estimator';
const HOME = '/strike';
type Tab = 'estimate' | 'register' | 'compare' | 'model' | 'document';
type Notice = { title: string; body: string; reference?: string; kind?: 'info' | 'warning' | 'error' };

const markingRank = (id: string): number => canon.markings.find((m) => m.id === id)?.rank ?? 0;
const places = gazetteer(canon, frag);
const actx = { canon, frag, places };

export default function App(props: AppProps) {
  const services = useServices();
  if (services.account.def.value.tier === 4) return <Tier4 {...props} />;
  return <Estimator {...props} />;
}

/* --------------------------------------------------------------- Tier 4 */

function Tier4({ win }: AppProps) {
  const services = useServices();
  const r = frag.refusals.tier4;
  const [about, setAbout] = useState(false);
  useEffect(() => {
    win.setTitle(TITLE);
    win.setMarking('UMBRA-R');
    services.audit.log('window.open', `${S.model.id}`, `Operator ${services.session.operatorId.value} requested ${TITLE} (${S.model.id}). Request refused: ${r.reason} Reference ${r.reference}.`);
    services.sound.play('error');
  }, []);
  const menus: MenuBarMenu[] = [
    { label: '&File', items: [{ label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() }] },
    { label: '&Help', items: [{ label: `&About ${TITLE}`, onSelect: () => setAbout(true) }] },
  ];
  return (
    <div class="stk-app">
      <MenuBar menus={menus} label={`${TITLE} menu`} />
      <div class="stk-refusal">
        <RefusalState authority={r.authority} reference={r.reference} reason={r.reason} requirement={r.requirement} docNo={`${S.model.id}`} heading="This application is controlled" />
      </div>
      <StatusBar panes={[{ id: 'm', content: `Refused: ${r.requirement}`, fill: true }]} />
      <MessageBox open={about} title={`About ${TITLE}`} kind="info" onClose={() => setAbout(false)}>
        {`${TITLE}, planning model ${S.model.id} revision ${S.model.revision}. ${canon.meta.environment} release ${canon.meta.release}.`}
      </MessageBox>
    </div>
  );
}

/* ------------------------------------------------------------ estimator */

function Estimator({ win, route }: AppProps) {
  const services = useServices();
  const def = services.account.def.value;
  const me = def.id;
  const op = services.session.operatorId.value;
  const auditor = def.auditReader;
  const docEntry: RouteEntry | null = route && route.app === 'strike' && route.route !== HOME ? route : null;
  const strikeDocs = useMemo(() => services.docs.all().filter((r) => r.app === 'strike' && r.route !== HOME), []);

  /* ---------------------------------------------------------- state */
  const ownFac = facilityById.get(def.site);
  const ownPos = ownFac ? positionOf(ownFac) : null;
  const cursorStart: Pt = ownPos ?? positionOf(canon.facilities.find((f) => f.class === 'ALPHA' && positionOf(f))!)!;
  const [tab, setTab] = useState<Tab>(docEntry ? 'document' : 'estimate');
  const [anchorText, setAnchorText] = useState('');
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const [point, setPoint] = useState<Pt | null>(null);
  const [pointLabel, setPointLabel] = useState('');
  const [kt, setKt] = useState<number>(S.yieldsKt.includes(frag.defaultYieldKt) ? frag.defaultYieldKt : S.yieldsKt[0]!);
  const [rangeMi, setRangeMi] = useState<number>(frag.defaultListingRangeMi);
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [evLabel, setEvLabel] = useState('');
  const [stale, setStale] = useState(false);
  const [selSite, setSelSite] = useState<string | null>(null);
  const [showWithheld, setShowWithheld] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const [regSel, setRegSel] = useState<string[]>([]);
  const [cmpA, setCmpA] = useState('');
  const [cmpB, setCmpB] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [regDlg, setRegDlg] = useState(false);
  const [remark, setRemark] = useState('');
  const [wdDlg, setWdDlg] = useState<StrikeScenario | null>(null);
  const [qDlg, setQDlg] = useState<StrikeScenario | null>(null);
  const [registerNote, setRegisterNote] = useState('');
  const [depths, setDepths] = useState<Partial<Record<string, number>>>({});
  const t2 = services.clearance.satisfies('T2');
  const anchorRef = useRef<HTMLDivElement>(null);

  // Tier 2 sessions read GAMMA depths of record from the CANON-T2 release.
  useEffect(() => {
    if (!t2) return;
    let live = true;
    loadCanonT2().then(
      (rel) => {
        if (!live) return;
        const out: Record<string, number> = {};
        for (const f of canon.facilities) {
          if (f.class !== 'GAMMA') continue;
          const v = Number(rel[t2Path.gammaDepth(f.id)]);
          if (Number.isFinite(v) && v > 0) out[f.id] = v;
        }
        setDepths(out);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [t2]);
  // A run made before the depths arrived is re-read with them.
  useEffect(() => {
    if (ev) setEv(evaluate(canon, frag, ev.point, ev.kt, depths));
  }, [depths]);

  /* ---------------------------------------------------- plant state */
  const strike = services.shared.get<StrikeState>(STRIKE_KEY, STRIKE_EMPTY).value;
  const iso = services.shared.get<IsolationState>('isolation', ISOLATION_NONE).value;
  const drill = services.shared.get<DrillState | null>('drill', null).value;
  const isolated = isolatedAt(iso, Date.now()) && def.site !== REGISTER_HOST;
  const visible = useMemo(
    () => (auditor ? strike.scenarios : strike.scenarios.filter((s) => s.account === me)).slice(-frag.registerShowLimit),
    [strike, auditor, me],
  );

  const docLoad = useDoc(services, docEntry);

  /* -------------------------------------------------------- chrome */
  useEffect(() => {
    const marking = (docEntry && markingRank(docEntry.marking) > markingRank(MODEL_MARKING) ? docEntry.marking : MODEL_MARKING) as MarkingId;
    win.setMarking(marking);
    if (tab === 'document' && docEntry) win.setTitle(docEntry.title, docEntry.docNo);
    else win.setTitle(TITLE, S.model.id);
  }, [docEntry?.id, tab]);
  useEffect(() => setTab(docEntry ? 'document' : 'estimate'), [docEntry?.id]);

  /* -------------------------------------------------------- helpers */
  const plotted = useMemo(() => canon.facilities.filter((f) => f.class !== 'DELTA' && positionOf(f)), []);
  const depthNote = t2
    ? `Depth: R = depth of record from the Tier 2 release; P = planning depth (${S.gammaPlanningDepthFt} ft) where no depth of record is held; otherwise the registered depth.`
    : `Depth: P = GAMMA planning depth (${S.gammaPlanningDepthFt} ft), used because the depth of record is not held by this operator; otherwise the registered depth.`;
  const deliverOnce = (msgId: string, slots: Record<string, string> = {}) => {
    if (services.mail.delivered.value.includes(msgId)) return;
    services.mail.deliver(msgId, { slots: { date: formatInWorldDate(), ...slots } });
  };
  const refuse = (title: string, body: string, reference?: string) => {
    services.audit.log('window.open', S.model.id, `Operator ${op} requested ${title.toLowerCase()} in ${S.model.id}. Request refused: ${body}`);
    setNotice({ title, body, reference, kind: 'error' });
  };
  const nowIso = () => inWorldIso(new Date());
  const nowText = () => {
    const d = new Date();
    return `${formatInWorldDate(d)} ${zulu(d)} (${siteLocal(d)})`;
  };

  const setPt = (p: Pt, label: string, site?: FacilityId) => {
    setPoint(p);
    setPointLabel(label);
    setAnchorError(null);
    setStale(true);
    if (site) setSelSite(site);
  };

  const applyAnchor = () => {
    const r = parseAnchor(anchorText, actx);
    if (r.ok) {
      setPt(r.point, r.label, r.site);
      services.sound.play('switch');
      return;
    }
    if (r.error === 'position-not-held') {
      const comp = canon.compartments.find((c) => c.id === frag.positionWithholding.compartment);
      const text = fill(frag.refusals.positionNotHeld, { site: r.detail, briefing: comp?.briefingDocNo ?? '' });
      setAnchorError(text);
      services.audit.log('window.open', S.model.id, `Operator ${op} requested the position of ${r.detail} in ${S.model.id}. Request refused: position not held at this workstation (${frag.positionWithholding.compartment}).`, { site: r.detail });
      services.sound.play('error');
      return;
    }
    setAnchorError(r.detail);
    services.sound.play('error');
  };

  const run = (pt: Pt | null = point, k: number = kt, label: string = pointLabel) => {
    if (!pt) {
      setNotice({ title: 'Run estimate', body: 'No point is set. Click the national plot or a marker, move the point cursor, or type a point and select Set point.', kind: 'info' });
      return;
    }
    const e = evaluate(canon, frag, pt, k, depths);
    setEv(e);
    setEvLabel(label);
    setStale(false);
    setRegisterNote('');
    win.setBusy(true);
    setTimeout(() => win.setBusy(false), 250);
    services.sound.play('button');
    const sum = summarize(S, e);
    services.audit.log(
      'control',
      'strike:run',
      `Operator ${op} ran planning model ${S.model.id} for a ${fmtKt(k)} event at ${label}${auditor ? ' (review run, not entered in the register)' : ''}. ${sum.affected} of ${sum.evaluated} evaluated installations inside the outer contour${sum.worst ? `; worst estimated condition ${sum.worst} (${sum.worstSites})` : ''}.`,
      { point: fmtCoord(pt), anchor: label, kt: String(k), affected: String(sum.affected), worst: sum.worst ?? '', worstSites: sum.worstSites, review: auditor ? 'yes' : 'no' },
    );
    if (e.rows.some((r) => r.egress.some((g) => g.status !== 'IN REVENUE SERVICE'))) {
      const g = e.rows.flatMap((r) => r.egress.map((x) => ({ site: r.id, ...x }))).find((x) => x.status !== 'IN REVENUE SERVICE')!;
      deliverOnce(frag.messages.egressBasis, { site: g.site, segment: g.no });
    }
  };

  const startRegister = () => {
    if (auditor) return refuse('Enter in register', frag.refusals.auditorRegister, S.model.originator);
    if (!ev) return setNotice({ title: 'Enter in register', body: 'No estimate has been run in this window. Run the estimate first; the register records what was run.', kind: 'info' });
    if (stale) return setNotice({ title: 'Enter in register', body: 'The point or yield has changed since the last run. Run the estimate again before entering it, so the entry matches what is on screen.', kind: 'warning' });
    if (isolated) return refuse('Enter in register', fill(frag.refusals.isolated, { host: REGISTER_HOST }), latestInitiation(iso)?.ref);
    setRemark('');
    setRegDlg(true);
  };

  const commitRegister = () => {
    if (!ev) return;
    const sum = summarize(S, ev);
    const at = nowIso();
    let id = '';
    services.shared.update<StrikeState>(STRIKE_KEY, STRIKE_EMPTY, (prev) => {
      const seq = prev.seq + 1;
      id = registerId(seq);
      const entry: StrikeScenario = { id, account: me, operatorId: op, lat: ev.point.lat, lon: ev.point.lon, anchor: evLabel, kt: ev.kt, at, summary: sum, ...(remark.trim() ? { remark: remark.trim() } : {}) };
      return { seq, scenarios: [...prev.scenarios, entry] };
    });
    services.sound.play('relay');
    services.audit.log('control', 'strike:register', `Operator ${op} entered estimate ${id} in the ${S.model.id} planning register: ${fmtKt(ev.kt)} at ${evLabel}.`, {
      entry: id,
      point: fmtCoord(ev.point),
      anchor: evLabel,
      kt: String(ev.kt),
      affected: String(sum.affected),
      worst: sum.worst ?? '',
    });
    setRegisterNote(`Entered in the planning register as ${id}.`);
    // Own site inside the outer contour: Internal Assurance asks why.
    const own = ev.rows.find((r) => r.id === def.site);
    if (own && own.op.band !== 'below') deliverOnce(frag.messages.ownSite, { entry: id, site: def.site, condition: own.condition });
    // A probationer's first entry is copied to Internal Assurance.
    if (def.probationStart && !services.traces.all.value.some((t) => t.from === me && t.msgId === frag.messages.probationerEntry)) {
      services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: frag.messages.probationerEntry, subject: `${S.model.id} register entry ${id} by an operator on probation` });
    }
  };

  const selectedEntry = (): StrikeScenario | null => (regSel.length === 1 ? (visible.find((e) => e.id === regSel[0]) ?? null) : null);

  const openEntry = (s: StrikeScenario) => {
    const p = { lat: s.lat, lon: s.lon };
    setPoint(p);
    setPointLabel(s.anchor);
    setAnchorText(s.anchor);
    setKt(s.kt);
    setTab('estimate');
    run(p, s.kt, s.anchor);
  };

  const startWithdraw = () => {
    const s = selectedEntry();
    if (!s) return setNotice({ title: 'Withdraw entry', body: 'Select one entry in the register first.', kind: 'info' });
    if (s.account !== me) return refuse('Withdraw entry', frag.refusals.withdrawOthers, S.model.originator);
    if (s.withdrawn) return setNotice({ title: 'Withdraw entry', body: `${s.id} was withdrawn at ${whenText(s.withdrawn.at)}.`, kind: 'info' });
    if (isolated) return refuse('Withdraw entry', fill(frag.refusals.isolated, { host: REGISTER_HOST }), latestInitiation(iso)?.ref);
    setWdDlg(s);
  };
  const commitWithdraw = (s: StrikeScenario) => {
    const at = nowIso();
    services.shared.update<StrikeState>(STRIKE_KEY, STRIKE_EMPTY, (prev) => ({ ...prev, scenarios: prev.scenarios.map((x) => (x.id === s.id ? { ...x, withdrawn: { at } } : x)) }));
    services.sound.play('switch');
    services.audit.log('control', 'strike:withdraw', `Operator ${op} withdrew planning register entry ${s.id}. The entry is retained in the register marked withdrawn.`, { entry: s.id });
  };

  const startQuery = () => {
    if (!auditor) return refuse('Raise review query', 'Review queries on planning register entries are raised by the Office of Internal Assurance.', 'OSC-ASR-CG');
    const s = selectedEntry();
    if (!s) return setNotice({ title: 'Raise review query', body: 'Select one entry in the register first.', kind: 'info' });
    if (s.account === me) return refuse('Raise review query', frag.refusals.queryOwn);
    if (s.query) return setNotice({ title: 'Raise review query', body: `${s.id} has been under review query ${s.query.ref} since ${whenText(s.query.at)}.`, kind: 'info' });
    setQDlg(s);
  };
  const commitQuery = (s: StrikeScenario) => {
    const n = strike.scenarios.filter((x) => x.query).length + 1;
    const ref = `OIA-${formatInWorldDate().slice(-2)}-${String(frag.queryRefBase + n).padStart(3, '0')}`;
    const at = nowIso();
    services.shared.update<StrikeState>(STRIKE_KEY, STRIKE_EMPTY, (prev) => ({ ...prev, scenarios: prev.scenarios.map((x) => (x.id === s.id ? { ...x, query: { at, by: me, ref } } : x)) }));
    services.traces.post({ to: s.account, kind: 'mail.deliver', msgId: frag.messages.reviewQuery, subject: `Review query ${ref} on planning register entry ${s.id}` });
    services.sound.play('button');
    services.audit.log('control', 'strike:query', `Operator ${op} raised review query ${ref} on planning register entry ${s.id} (operator ${s.operatorId}). Notice routed to the operator.`, { entry: s.id, ref, account: s.account });
  };

  const doPrint = (src: 'run' | 'entry') => {
    let spec;
    if (src === 'entry') {
      const s = selectedEntry();
      if (!s) return setNotice({ title: 'Print sheet', body: 'Select one entry in the register first.', kind: 'info' });
      spec = { sheetNo: s.id, registered: true, anchor: s.anchor, ev: evaluate(canon, frag, s, s.kt, depths), enteredBy: s.operatorId, enteredAt: whenText(s.at), status: statusOf(s) };
    } else {
      if (!ev) return setNotice({ title: 'Print sheet', body: 'No estimate has been run in this window; there is nothing to send to the print queue.', kind: 'info' });
      const reg = [...strike.scenarios].reverse().find((s) => s.account === me && s.lat === ev.point.lat && s.lon === ev.point.lon && s.kt === ev.kt);
      spec = reg
        ? { sheetNo: reg.id, registered: true, anchor: reg.anchor, ev, enteredBy: reg.operatorId, enteredAt: whenText(reg.at), status: statusOf(reg) }
        : { sheetNo: `${frag.registerPrefix} RUN ${zulu(new Date())}`, registered: false, anchor: evLabel, ev };
    }
    services.sound.play('print');
    services.audit.log('print', spec.sheetNo, `Operator ${op} printed a ${S.model.id} planning estimate sheet (${spec.sheetNo}, ${fmtKt(spec.ev.kt)} at ${spec.anchor}).`, { sheet: spec.sheetNo, kt: String(spec.ev.kt) });
    void printSheet({ ...spec, rangeMi, printedBy: op, printedAt: nowText(), depthNote });
  };

  const goCompare = () => {
    if (regSel.length !== 2) return setNotice({ title: 'Compare', body: 'Select two entries in the register to compare.', kind: 'info' });
    const sorted = [...regSel].sort();
    setCmpA(sorted[0]!);
    setCmpB(sorted[1]!);
    setTab('compare');
  };

  const openDoc = (r: RouteEntry | undefined) => {
    if (!r) return setNotice({ title: 'Open document', body: 'The document is not held on the records server.', kind: 'warning' });
    win.navigate(r.route);
  };

  const focusAnchor = () => {
    setTab('estimate');
    setTimeout(() => anchorRef.current?.querySelector<HTMLInputElement>('input[name="anchor"]')?.focus(), 0);
  };
  const gotoOwnSite = () => {
    setTab('estimate');
    if (ownPos) {
      setPt(ownPos, def.site, def.site as FacilityId);
      setAnchorText(def.site);
      return;
    }
    setAnchorText(def.site);
    const comp = canon.compartments.find((c) => c.id === frag.positionWithholding.compartment);
    setAnchorError(fill(frag.refusals.positionNotHeld, { site: def.site, briefing: comp?.briefingDocNo ?? '' }));
    services.sound.play('error');
  };

  /* -------------------------------------------------------- keyboard */
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (e.key === 'F5') {
      e.preventDefault();
      run();
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (k === 's') {
        e.preventDefault();
        startRegister();
      } else if (k === 'p') {
        e.preventDefault();
        doPrint(tab === 'register' ? 'entry' : 'run');
      } else if (k === 'l') {
        e.preventDefault();
        focusAnchor();
      }
    }
  };

  /* ----------------------------------------------------------- menus */
  const tabs: { id: Tab; label: string }[] = [
    { id: 'estimate', label: 'Estimate' },
    { id: 'register', label: auditor ? 'Register (all operators)' : 'Register' },
    { id: 'compare', label: 'Compare' },
    { id: 'model', label: 'Model data' },
    ...(docEntry ? [{ id: 'document' as Tab, label: docEntry.docNo }] : []),
  ];
  const methodDoc = strikeDocs.find((r) => r.id === 'strike-pm-3');
  const procDoc = strikeDocs.find((r) => r.id === 'strike-register');
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Run estimate', shortcut: 'F5', onSelect: () => run() },
        { label: '&Enter in register...', shortcut: 'Ctrl+S', onSelect: startRegister },
        { separator: true },
        { label: '&Print estimate sheet...', shortcut: 'Ctrl+P', onSelect: () => doPrint('run') },
        { label: 'Print sheet for selected &entry...', onSelect: () => doPrint('entry') },
        { label: 'Print &method document', onSelect: () => (methodDoc ? services.print(methodDoc.id) : openDoc(undefined)) },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Point',
      items: [
        { label: '&Type a point...', shortcut: 'Ctrl+L', onSelect: focusAnchor },
        { label: `&Own site (${def.site})`, onSelect: gotoOwnSite },
        {
          label: '&Clear point',
          onSelect: () => {
            setPoint(null);
            setPointLabel('');
            setEv(null);
            setStale(false);
          },
        },
      ],
    },
    {
      label: '&Yield',
      items: S.yieldsKt.map(
        (y): MenuItem => ({
          label: fmtKt(y),
          radio: true,
          checked: kt === y,
          onSelect: () => {
            setKt(y);
            setStale(true);
            services.sound.play('switch');
          },
        }),
      ),
    },
    {
      label: '&View',
      items: [
        ...tabs.map((t, i): MenuItem => ({ label: `&${i + 1} ${t.label}`, radio: true, checked: tab === t.id, onSelect: () => setTab(t.id) })),
        { separator: true },
        { label: 'Show sites &not evaluated', checked: showWithheld, onSelect: () => setShowWithheld(!showWithheld) },
        { label: 'Show &DELTA (not modelled)', checked: showDelta, onSelect: () => setShowDelta(!showDelta) },
        { separator: true },
        ...frag.listingRangesMi.map((m): MenuItem => ({ label: `List within ${m} mi`, radio: true, checked: rangeMi === m, onSelect: () => setRangeMi(m) })),
      ],
    },
    {
      label: '&Register',
      items: [
        { label: '&Show register', onSelect: () => setTab('register') },
        { label: '&Open selected entry in estimate', onSelect: () => (selectedEntry() ? openEntry(selectedEntry()!) : setNotice({ title: 'Open entry', body: 'Select one entry in the register first.', kind: 'info' })) },
        { label: '&Compare selected entries', onSelect: goCompare },
        { separator: true },
        { label: '&Withdraw selected entry...', onSelect: startWithdraw },
        { label: 'Raise review &query...', onSelect: startQuery },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: `${S.model.id} &method and operating notes`, onSelect: () => openDoc(methodDoc) },
        { label: '&Planning register procedure', onSelect: () => openDoc(procDoc) },
        { label: 'G&lossary', onSelect: () => services.openRoute('/system/glossary') },
        { separator: true },
        {
          label: `&About ${TITLE}`,
          onSelect: () =>
            setNotice({
              title: `About ${TITLE}`,
              body: `${TITLE}, planning model ${S.model.id} revision ${S.model.revision} of ${S.model.date}, ${S.model.originator}. ${canon.meta.environment} release ${canon.meta.release}. ${frag.caveat}`,
              kind: 'info',
            }),
        },
      ],
    },
  ];

  /* ---------------------------------------------------------- status */
  const sum = ev ? summarize(S, ev) : null;
  const msg = stale && ev ? 'Inputs changed; run the estimate.' : ev && sum ? `${fmtKt(ev.kt)} at ${evLabel}: ${sum.affected} affected${sum.worst ? `, worst ${sum.worst}` : ''}.` : 'Ready. Set a point and run the estimate (F5).';
  const regLink = isolated ? `Register ${REGISTER_HOST}: DOWN` : `Register ${REGISTER_HOST}: ${def.site === REGISTER_HOST ? 'LOCAL' : 'UP'}`;
  const drillText = drill && (drill.phase === 'propagating' || drill.phase === 'sealed') ? `Seal drill ${drill.id}: ${drill.phase.toUpperCase()}` : null;

  /* ------------------------------------------------------------ body */
  let body;
  if (tab === 'register') {
    body = (
      <RegisterView
        entries={visible}
        total={strike.scenarios.length}
        auditor={auditor}
        me={me}
        accounts={services.account.all()}
        selected={regSel}
        onSelect={setRegSel}
        onOpen={openEntry}
        onCompare={goCompare}
        onWithdraw={startWithdraw}
        onQuery={startQuery}
        onPrint={() => doPrint('entry')}
        isolatedNote={isolated ? fill(frag.refusals.isolated, { host: REGISTER_HOST }) : null}
      />
    );
  } else if (tab === 'compare') {
    body = <CompareView entries={visible} a={cmpA} b={cmpB} onA={setCmpA} onB={setCmpB} depths={depths} />;
  } else if (tab === 'model') {
    body = <ModelView kt={ev?.kt ?? kt} depthNote={depthNote} />;
  } else if (tab === 'document' && docEntry) {
    body = (
      <div class="stk-docwrap">
        <DocPane services={services} load={docLoad} entry={docEntry} />
      </div>
    );
  } else {
    body = (
      <div ref={anchorRef} class="stk-fill">
        <EstimateView
          anchorText={anchorText}
          onAnchorText={(t) => {
            setAnchorText(t);
            setAnchorError(null);
          }}
          onApplyAnchor={applyAnchor}
          anchorError={anchorError}
          point={point}
          pointLabel={pointLabel}
          onPoint={setPt}
          kt={kt}
          onKt={(k) => {
            setKt(k);
            setStale(true);
            services.sound.play('switch');
          }}
          rangeMi={rangeMi}
          onRange={(m) => {
            setRangeMi(m);
            services.sound.play('switch');
          }}
          ev={ev}
          stale={stale}
          onRun={() => run()}
          onRegister={startRegister}
          onPrint={() => doPrint('run')}
          registerNote={registerNote || (auditor ? 'Review mode: runs are recorded in the audit trail, not in the planning register.' : isolated ? fill(frag.refusals.isolated, { host: REGISTER_HOST }) : '')}
          selectedSite={selSite}
          onSelectSite={setSelSite}
          showWithheld={showWithheld}
          showDelta={showDelta}
          plotted={plotted}
          ownSite={def.site}
          onRxHover={(id, auth, ref) => services.audit.log('redaction.hover', S.model.id, `Operator ${op} examined a withheld position in ${S.model.id} (${auth} ${ref}, ${id}). No release was made.`)}
          depthNote={depthNote}
          cursorStart={cursorStart}
        />
      </div>
    );
  }

  return (
    <div class="stk-app" onKeyDown={onKeyDown}>
      <MenuBar menus={menus} label={`${TITLE} menu`} />
      <Toolbar label="Estimator toolbar">
        <ToolbarButton label="Run" icon={<Icon id="run" size={16} />} onClick={() => run()} title="Run estimate (F5)" />
        <ToolbarButton label="Enter" icon={<Icon id="save" size={16} />} onClick={startRegister} title="Enter in register (Ctrl+S)" />
        <ToolbarButton label="Print" icon={<Icon id="print" size={16} />} onClick={() => doPrint(tab === 'register' ? 'entry' : 'run')} title="Print planning estimate sheet (Ctrl+P)" />
        <ToolbarSeparator />
        <ToolbarButton label="Own site" icon={<Icon id="target-point" size={16} />} onClick={gotoOwnSite} title={`Set the point at ${def.site}`} />
        <ToolbarButton label="Register" icon={<Icon id="audit-log" size={16} />} pressed={tab === 'register'} onClick={() => setTab('register')} title="Planning register" />
        <ToolbarButton label="Model" icon={<Icon id="calculator" size={16} />} pressed={tab === 'model'} onClick={() => setTab('model')} title="Model data sheet" />
        <ToolbarSpacer />
        <ToolbarLabel>
          <Icon id="yield" size={16} /> {fmtKt(kt)}
        </ToolbarLabel>
      </Toolbar>
      <div class="stk-body">
        <Tabs tabs={tabs} active={tab} onChange={(id) => setTab(id as Tab)} label={`${TITLE} views`} panel="flush">
          <div class="stk-tabbody">{body}</div>
        </Tabs>
      </div>
      <StatusBar
        panes={[
          { id: 'msg', content: msg, fill: true },
          { id: 'pt', content: point ? fmtCoord(point) : 'No point', width: 170, mono: true, label: 'Point' },
          { id: 'reg', content: regLink, width: 160, mono: true, label: 'Register link' },
          { id: 'dep', content: t2 ? 'GAMMA depth: record (T2)' : 'GAMMA depth: planning', width: 170, label: 'Depth basis' },
          ...(drillText ? [{ id: 'drill', content: drillText, width: 220 }] : []),
        ]}
      />
      <Dialog
        open={regDlg}
        title="Enter in planning register"
        kind="question"
        buttons={[
          { label: '&Enter', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => {
          setRegDlg(false);
          if (v === 'ok') commitRegister();
        }}
      >
        <p>
          The estimate ({ev ? fmtKt(ev.kt) : ''} at {evLabel}) will be entered in the {S.model.id} planning register held at {S.model.originator} under your operator id {op}. Entries are not deleted.
        </p>
        <TextArea label="Remark (optional)" layout="stacked" value={remark} onInput={setRemark} rows={3} maxLength={200} showCount />
      </Dialog>
      <Dialog
        open={!!wdDlg}
        title="Withdraw register entry"
        kind="warning"
        buttons={[
          { label: '&Withdraw', value: 'ok' },
          { label: 'Cancel', value: 'cancel', isCancel: true, isDefault: true },
        ]}
        onClose={(v) => {
          const s = wdDlg;
          setWdDlg(null);
          if (v === 'ok' && s) commitWithdraw(s);
        }}
      >
        {wdDlg ? `Withdraw ${wdDlg.id}? The entry stays in the register marked WITHDRAWN, with the time of withdrawal.` : ''}
      </Dialog>
      <Dialog
        open={!!qDlg}
        title="Raise review query"
        kind="question"
        buttons={[
          { label: '&Raise query', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => {
          const s = qDlg;
          setQDlg(null);
          if (v === 'ok' && s) commitQuery(s);
        }}
      >
        {qDlg ? `Raise an Office of Internal Assurance review query on ${qDlg.id} (${qDlg.operatorId}, ${fmtKt(qDlg.kt)} at ${qDlg.anchor})? A notice is routed to the operator who made the entry.` : ''}
      </Dialog>
      <MessageBox
        open={!!notice}
        title={notice?.title ?? ''}
        kind={notice?.kind ?? 'info'}
        reference={notice?.reference ? `Ref ${notice.reference}` : undefined}
        onClose={() => setNotice(null)}
        onOpen={(k) => k === 'error' && services.sound.play('error')}
      >
        {notice?.body ?? ''}
      </MessageBox>
    </div>
  );
}
