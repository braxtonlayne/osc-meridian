/**
 * Environmental Control (air revitalization), app id "environ": the GAMMA-08 environmental
 * control panel. Air handling, makeup air with the seal closure latch, CO2 scrubber trains,
 * filtration with CBRN mode, zone conditions, trends, the shift handover log and a CO2 load
 * balance check. Plant state is shared key `environ` (types.ts); the model is model.ts.
 *
 * Accounts: the site's life support technician operates the panel. Facility command (Tier 2)
 * and Internal Assurance (audit readers) see it as a remote monitor, display only. Anyone else
 * is refused in-world.
 */
import type { TargetedKeyboardEvent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, IsolationState } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import * as session from '@core/session';
import { Checkbox, Dialog, formatOscDate, MenuBar, StatusBar, TextArea, TextField, Toolbar, ToolbarButton, ToolbarSeparator, type MenuBarMenu } from '@design/index';
import { RefusalState } from '@graphics/states';
import { annunciatorStep, ANN_NORMAL, type AnnPoint } from '@graphics/panel';
import { EC, POSTED, TIME_SCALE, usePlant } from './plant';
import { bankDp, filterAgeDays, loadBalance, watchAt } from './model';
import type { EnvironState, FilterBankId, ScrubberMode } from './types';
import { BalanceView, FiltrationView, HandoverView, PanelView, ScrubberView, ZonesView, type Ctl } from './views';
import { DocPane } from './DocPane';
import { TILES, zl, type Role } from './common';
import './environ.css';
import { isolatedAt } from '@apps/isolate/state';

const TITLE = 'Environmental Control';
const MARKING: MarkingId = 'UMBRA-R';

export type ViewId = 'panel' | 'scrubbers' | 'filtration' | 'zones' | 'log' | 'balance';
export const VIEWS: { id: ViewId; label: string; short: string }[] = [
  { id: 'panel', label: 'Air handling panel', short: 'Panel' },
  { id: 'scrubbers', label: 'CO2 scrubber trains', short: 'Scrubbers' },
  { id: 'filtration', label: 'Filtration and CBRN', short: 'Filtration' },
  { id: 'zones', label: 'Zones and trends', short: 'Zones' },
  { id: 'log', label: 'Shift handover log', short: 'Handover' },
  { id: 'balance', label: 'CO2 load balance', short: 'Balance' },
];

type Dlg =
  | { kind: 'override' }
  | { kind: 'filter'; bank: FilterBankId }
  | { kind: 'sign' }
  | { kind: 'refuse'; title: string; text: string; reference: string }
  | null;

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const acct = services.account.def.value;
  const role: Role = acct.id === 'lifesupport' && acct.site === EC.site ? 'operator' : acct.tier <= 2 || acct.auditReader ? 'monitor' : 'refused';
  const operator = role === 'operator';
  const docRoute = route && route.route !== '/environ' ? route : null;

  const iso = services.shared.get<IsolationState | null>('isolation', null).value;
  const isolated = isolatedAt(iso, Date.now());
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting && !document.hidden));
    io.observe(el);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const frozen = role === 'monitor' && isolated;
  const { view: pv, commit } = usePlant(services, { writer: operator, frozen, visible: visible && role !== 'refused' });
  const st = pv.state;
  const today = session.IN_WORLD_DATE_ISO;

  const [view, setView] = useState<ViewId>('panel');
  const [msg, setMsg] = useState(operator ? 'Ready.' : role === 'monitor' ? 'Remote monitor. Display only.' : 'No plant monitoring authority.');
  const [dlg, setDlg] = useState<Dlg>(null);
  const [lampTest, setLampTest] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const balanceRun = useRef<ReturnType<typeof loadBalance> | null>(null);
  const [balance, setBalance] = useState<ReturnType<typeof loadBalance> | 'none' | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => e && setNarrow(e.contentRect.width < 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ------------------------------------------------ title, marking, audit */
  useEffect(() => {
    if (docRoute) {
      win.setTitle(docRoute.title, docRoute.docNo);
      win.setMarking(docRoute.marking);
    } else {
      win.setTitle(`${TITLE}: ${EC.site}`, '');
      win.setMarking(MARKING);
    }
  }, [docRoute?.id]);
  useEffect(() => {
    win.setStatus(`${TITLE}, ${EC.site}`);
  }, []);
  useEffect(() => {
    if (role === 'refused' && !docRoute) {
      services.audit.log('window.open', 'environ', `Operator ${services.session.operatorId.peek()} opened Environmental Control. Refused: no plant monitoring authority for ${EC.site} (DIR-0128).`, {
        app: 'environ',
        site: EC.site,
        account: acct.id,
      });
    }
  }, [role]);

  /* ------------------------------------------------------- annunciator */
  const ages = { A: filterAgeDays(st.filters.A.lastChange, today), B: filterAgeDays(st.filters.B.lastChange, today) };
  const latched = pv.plant.sealLatched || pv.r.seal;
  const abnormal: Record<string, boolean> = {
    co2hi: pv.plant.co2Ppm >= EC.limits.co2Warn,
    co2hh: pv.plant.co2Ppm >= EC.limits.co2Alarm,
    o2lo: pv.plant.o2Pct <= EC.limits.o2Low,
    zone: pv.r.zoneCo2.some((v) => v >= EC.limits.co2Warn),
    seal: pv.r.seal,
    latch: pv.r.makeupClosedBySeal,
    ovr: st.controls.sealOverride,
    noscr: pv.r.makeupM3h === 0 && !Object.values(pv.plant.trains).some((t) => t.phase === 'adsorb'),
    satA: (pv.plant.trains['SCR-A']?.loading ?? 0) >= 0.99,
    satB: (pv.plant.trains['SCR-B']?.loading ?? 0) >= 0.99,
    cbrn: st.controls.filtration.mode === 'cbrn',
    // Steady overpressure the selected bank can hold (the reading itself lags for a few plant minutes).
    oplo: st.controls.filtration.mode === 'cbrn' && (pv.r.makeupM3h === 0 || EC.filtration.overpressureFull * pv.r.bankFlow * pv.r.bankFlow < EC.filtration.overpressureLow),
    dp: pv.r.bankDp.A >= EC.filtration.dpChangeAt || pv.r.bankDp.B >= EC.filtration.dpChangeAt,
    due: ages.A > EC.filtration.cycleDays || ages.B > EC.filtration.cycleDays,
    temp: pv.plant.tempC.some((t) => t >= EC.limits.tempHigh),
    link: isolated,
  };
  const [ann, setAnn] = useState<Record<string, AnnPoint>>(() => Object.fromEntries(TILES.map((t) => [t.id, ANN_NORMAL])));
  const abnKey = TILES.map((t) => (abnormal[t.id] ? 1 : 0)).join('');
  useEffect(() => {
    let horn = false;
    setAnn((prev) => {
      const next = { ...prev };
      for (const t of TILES) {
        const p = prev[t.id] ?? ANN_NORMAL;
        const q = annunciatorStep(p, abnormal[t.id] ? 'abnormal' : 'normal');
        if (q.seq === 'unack' && p.seq !== 'unack' && t.priority !== 'status') horn = true;
        next[t.id] = q;
      }
      return next;
    });
    if (horn && operator) services.sound.play('alarm');
  }, [abnKey]);
  useEffect(() => () => services.sound.stop('alarm'), []);

  const ackAll = (ids?: string[]) => {
    if (!ids && !Object.values(ann).some((p) => p.seq === 'unack')) {
      setMsg('No alarm window is flashing. Nothing to acknowledge.');
      return;
    }
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of ids ?? Object.keys(prev)) next[id] = annunciatorStep(prev[id] ?? ANN_NORMAL, 'ack');
      return next;
    });
    services.sound.stop('alarm');
    services.sound.play('ack');
    setMsg('Alarms acknowledged.');
  };
  const resetAll = (ids?: string[]) => {
    if (!ids && !Object.values(ann).some((p) => p.seq === 'ringback')) {
      setMsg('No cleared alarm is waiting for reset.');
      return;
    }
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of ids ?? Object.keys(prev)) next[id] = annunciatorStep(prev[id] ?? ANN_NORMAL, 'reset');
      return next;
    });
    services.sound.play('button');
    setMsg('Cleared alarms reset.');
  };

  /* ------------------------------------------------------------- actions */
  const nowIso = () => session.inWorldIso(new Date());
  const ev = (s: EnvironState, text: string) => [...s.events, { at: nowIso(), w: Date.now(), by: acct.id, text }].slice(-60);
  const audit = (action: string, detail: string, data: Record<string, string>) =>
    services.audit.log('control', `environ:${action}`, detail, { site: EC.site, plantTime: zl(Date.now()), ...data });

  const refuse = (what: string) => {
    services.sound.play('error');
    services.audit.log('window.open', `environ:${what}`, `Operator ${services.session.operatorId.peek()} attempted ${what} on the ${EC.site} environmental panel from a remote monitor. Refused: display only.`, { site: EC.site, account: acct.id });
    setDlg({
      kind: 'refuse',
      title: 'Remote monitor',
      text: `This workstation holds a display-only connection to the ${EC.site} environmental control panel. Controls are operated at the site by the environmental systems watch. ${isolated ? 'The remote link is down while the network is isolated.' : ''}`,
      reference: 'DIR-0128',
    });
  };

  const guard = (what: string, fn: () => void) => () => (operator ? fn() : refuse(what));

  const setFan = (id: string, i: number) => {
    if (!operator) return refuse('fan speed');
    const from = EC.fanSpeeds[st.controls.ahu[id] ?? 0]?.pos ?? '';
    const to = EC.fanSpeeds[i]?.pos ?? '';
    services.sound.play('switch');
    commit((s) => ({ controls: { ...s.controls, ahu: { ...s.controls.ahu, [id]: i } }, events: ev(s, `${id} fan ${from} to ${to}`) }));
    audit('fan', `Operator ${services.session.operatorId.peek()} set ${id} fan speed ${from} to ${to} at ${EC.site}.`, { unit: id, from, to });
    setMsg(`${id} fan speed ${to}.`);
  };
  const setMakeup = (i: number) => {
    if (!operator) return refuse('makeup air damper');
    const from = EC.makeup.positions[st.controls.makeup]?.id ?? '';
    const to = EC.makeup.positions[i]?.id ?? '';
    services.sound.play('switch');
    commit((s) => ({ controls: { ...s.controls, makeup: i }, events: ev(s, `${EC.makeup.tag} ${from} to ${to}`) }));
    audit('makeup', `Operator ${services.session.operatorId.peek()} set makeup air damper ${EC.makeup.tag} ${from} to ${to} at ${EC.site}.`, { damper: EC.makeup.tag, from, to, sealClosure: pv.r.makeupClosedBySeal ? 'yes' : 'no' });
    setMsg(pv.r.makeupClosedBySeal ? `${EC.makeup.tag} set ${to}. The damper is held shut by the seal closure.` : `${EC.makeup.tag} ${to}.`);
  };
  const setScrubber = (id: string, mode: ScrubberMode) => {
    if (!operator) return refuse('scrubber train');
    const from = st.controls.scrubbers[id] ?? 'off';
    services.sound.play('switch');
    commit((s) => ({ controls: { ...s.controls, scrubbers: { ...s.controls.scrubbers, [id]: mode } }, events: ev(s, `${id} ${from.toUpperCase()} to ${mode.toUpperCase()}`) }));
    audit('scrubber', `Operator ${services.session.operatorId.peek()} set CO2 scrubber train ${id} ${from.toUpperCase()} to ${mode.toUpperCase()} at ${EC.site}.`, {
      train: id,
      from,
      to: mode,
      co2Ppm: String(Math.round(pv.plant.co2Ppm)),
    });
    setMsg(`${id} selector ${mode.toUpperCase()}.`);
  };
  const setFiltration = (mode: 'normal' | 'cbrn') => {
    if (!operator) return refuse('filtration mode');
    services.sound.play('switch');
    commit((s) => ({ controls: { ...s.controls, filtration: { ...s.controls.filtration, mode } }, events: ev(s, `Filtration ${mode === 'cbrn' ? 'CBRN' : 'NORMAL'} on bank ${s.controls.filtration.bank}`) }));
    audit('filtration-mode', `Operator ${services.session.operatorId.peek()} set filtration mode ${mode === 'cbrn' ? 'CBRN' : 'NORMAL'} at ${EC.site} (bank ${st.controls.filtration.bank}).`, {
      mode,
      bank: st.controls.filtration.bank,
    });
    setMsg(mode === 'cbrn' ? `CBRN mode. Makeup air drawn through filter bank ${st.controls.filtration.bank}.` : 'Filtration NORMAL. Makeup air through the damper.');
  };
  const setBank = (bank: FilterBankId) => {
    if (!operator) return refuse('filter bank selection');
    services.sound.play('switch');
    commit((s) => ({ controls: { ...s.controls, filtration: { ...s.controls.filtration, bank } }, events: ev(s, `Filter bank ${bank} selected`) }));
    audit('filter-bank', `Operator ${services.session.operatorId.peek()} selected filter bank ${bank} at ${EC.site}.`, { bank, dp: bankDp(EC, st.filters, pv.plant, bank).toFixed(2) });
    setMsg(`Filter bank ${bank} selected.`);
  };
  const setOverride = (on: boolean, reason = '') => {
    if (!operator) return refuse('seal override');
    services.sound.play('switch');
    commit((s) => ({ controls: { ...s.controls, sealOverride: on }, events: ev(s, on ? `Seal override ON: ${reason}` : 'Seal override NORMAL') }));
    audit('seal-override', on ? `Operator ${services.session.operatorId.peek()} placed makeup air seal override to OVERRIDE at ${EC.site}. Reason given: ${reason}` : `Operator ${services.session.operatorId.peek()} returned makeup air seal override to NORMAL at ${EC.site}.`, {
      state: on ? 'override' : 'normal',
      reason,
      sealSignal: pv.r.seal ? 'yes' : 'no',
      latched: latched ? 'yes' : 'no',
    });
    if (on && latched) {
      services.mail.deliver(EC.mail.overrideQuery, { repeat: true, slots: { date: session.formatInWorldDate(), time: zl(Date.now()), reason: reason || 'none given' } });
    }
    setMsg(on ? 'Seal override ON. Makeup air damper released from the seal closure.' : 'Seal override NORMAL.');
  };
  const resetSeal = () => {
    if (!operator) return refuse('seal closure reset');
    if (pv.r.seal) {
      services.sound.play('error');
      setMsg('Seal signal still present. The closure cannot be reset until the seal is lifted.');
      return;
    }
    if (!pv.plant.sealLatched) {
      setMsg('No seal closure is latched.');
      return;
    }
    services.sound.play('button');
    commit((s, plant) => ({ plant: { ...plant, sealLatched: false }, events: ev(s, 'Seal closure reset') }));
    audit('seal-reset', `Operator ${services.session.operatorId.peek()} reset the makeup air seal closure at ${EC.site}.`, { damper: EC.makeup.tag });
    setMsg('Seal closure reset. Makeup air damper follows its selector.');
  };
  const recordFilter = (bank: FilterBankId, lot: string) => {
    commit((s, plant) => ({
      plant: { ...plant, cbrnHours: { ...plant.cbrnHours, [bank]: 0 } },
      filters: { ...s.filters, [bank]: { lastChange: today, lot } },
      events: ev(s, `Filter bank ${bank} change recorded, lot ${lot}`),
    }));
    services.sound.play('button');
    audit('filter-change', `Operator ${services.session.operatorId.peek()} recorded a filter change on bank ${bank} at ${EC.site}, lot ${lot} (DIR-0128).`, { bank, lot, dpBefore: bankDp(EC, st.filters, pv.plant, bank).toFixed(2) });
    setMsg(`Filter bank ${bank} change recorded.`);
  };
  const tryFilterChange = (bank: FilterBankId) => {
    if (!operator) return refuse('filter change');
    const inUse = st.controls.filtration.mode === 'cbrn' && st.controls.filtration.bank === bank;
    if (latched || inUse) {
      services.sound.play('error');
      setDlg({
        kind: 'refuse',
        title: 'Filter change',
        text: latched
          ? 'No filter bank is opened while the site is sealed. Make the change on the first working day after the seal is lifted and record the deferral in the handover log.'
          : `Filter bank ${bank} is on line in CBRN mode. Select the other bank or return filtration to NORMAL before isolating it.`,
        reference: 'DIR-0128',
      });
      return;
    }
    setDlg({ kind: 'filter', bank });
  };
  const runBalance = () => {
    const lb = loadBalance(pv.samples, pv.env);
    balanceRun.current = lb;
    setBalance(lb ?? 'none');
    services.sound.play('button');
    services.audit.log('control', 'environ:load-balance', `Operator ${services.session.operatorId.peek()} ran a CO2 load balance on ${EC.site} historian data.`, {
      site: EC.site,
      hours: lb ? lb.hours.toFixed(1) : '0',
      implied: lb ? lb.impliedPersons.toFixed(1) : '',
      posted: String(POSTED),
    });
    setMsg(lb ? `Load balance computed over ${lb.hours.toFixed(1)} plant hours.` : 'Not enough historian data for a load balance.');
  };
  const sign = (remarks: string) => {
    const now = Date.now();
    const entry = {
      at: nowIso(),
      watch: watchAt(now, EC),
      by: `TECHNICIAN ${services.session.operatorId.peek().replace(/^OPR-G\d\d-/, '4-')}`,
      co2Ppm: Math.round(pv.plant.co2Ppm),
      o2Pct: Math.round(pv.plant.o2Pct * 100) / 100,
      remarks,
      plant: plantWords(st, pv.r.makeupClosedBySeal),
    };
    commit((s) => ({ handover: [...s.handover, entry].slice(-40), events: ev(s, `Handover log signed, watch ${entry.watch}`) }));
    services.sound.play('button');
    audit('handover-sign', `Operator ${services.session.operatorId.peek()} signed the ${EC.site} environmental handover log, watch ${entry.watch}.`, {
      watch: entry.watch,
      co2Ppm: String(entry.co2Ppm),
      o2Pct: String(entry.o2Pct),
      remarks,
    });
    const overdue = (['A', 'B'] as const).filter((b) => ages[b] > EC.filtration.cycleDays);
    const delivered = services.mail.delivered.peek();
    if (overdue.length && !delivered.includes(EC.mail.filterOverdue)) {
      const b = overdue[0]!;
      services.mail.deliver(EC.mail.filterOverdue, { slots: { date: session.formatInWorldDate(), bank: b, days: String(ages[b]), lastChange: formatOscDate(st.filters[b].lastChange) } });
    }
    const lb = balanceRun.current;
    if (lb && !lb.withinTolerance && /occupan|load balance|implied/i.test(remarks) && !delivered.includes(EC.mail.loadBalance)) {
      services.mail.deliver(EC.mail.loadBalance, { slots: { date: session.formatInWorldDate(), implied: String(Math.round(lb.impliedPersons)) } });
    }
    setMsg(`Handover log signed, watch ${entry.watch}.`);
  };

  /* ---------------------------------------- excursion tracking (operator) */
  const peak = useRef(0);
  useEffect(() => {
    if (!operator) return;
    const c = pv.plant.co2Ppm;
    const ex = st.excursion;
    if (c >= EC.limits.co2Warn) {
      peak.current = Math.max(peak.current, c, ex.peak);
      if (ex.since == null) {
        commit((s) => ({ excursion: { since: pv.at, peak: Math.round(c), reported: false }, events: ev(s, `CO2 above ${EC.limits.co2Warn} ppm`) }));
      } else if (!ex.reported && ((pv.at - ex.since) / 1000) * TIME_SCALE >= EC.limits.excursionMin * 60) {
        const pk = Math.round(peak.current);
        commit((s) => ({ excursion: { since: s.excursion.since, peak: pk, reported: true } }));
        services.mail.deliver(EC.mail.excursion, {
          repeat: true,
          slots: { date: session.formatInWorldDate(), time: zl(ex.since), peak: String(pk), limit: String(EC.limits.co2Warn) },
        });
      }
    } else if (ex.since != null) {
      peak.current = 0;
      commit((s) => ({ excursion: { since: null, peak: s.excursion.peak, reported: false }, events: ev(s, `CO2 below ${EC.limits.co2Warn} ppm`) }));
    }
  }, [pv.at]);

  /* ------------------------------------ periodic checkpoint (operator) */
  useEffect(() => {
    if (!operator) return;
    const id = setInterval(() => commit(() => ({})), EC.model.checkpointEveryRealSec * 1000);
    return () => clearInterval(id);
  }, [operator]);

  /* ----------------------------------------------------- keyboard, menus */
  const goView = (v: ViewId) => {
    if (docRoute) win.navigate('/environ');
    setView(v);
  };
  const openDoc = (id: string) => {
    const r = services.docs.all().find((d) => d.id === id);
    if (r) win.navigate(r.route);
    else setMsg('The record copy is not registered on this workstation.');
  };
  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (dlg) return;
    if (e.ctrlKey && !e.altKey && /^[1-6]$/.test(e.key)) {
      e.preventDefault();
      goView(VIEWS[Number(e.key) - 1]!.id);
    } else if (e.key === 'F8') {
      e.preventDefault();
      ackAll();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      guard('handover signature', () => setDlg({ kind: 'sign' }))();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      goView('balance');
      runBalance();
    }
  };

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: 'Operating &procedure', onSelect: () => openDoc(EC.docs.procedure) },
        { label: 'Plant &data sheet', onSelect: () => openDoc(EC.docs.datasheet) },
        { separator: true },
        { label: '&Print record copy', shortcut: 'Ctrl+P', onSelect: () => (docRoute ? services.print(docRoute.id) : openDoc(EC.docs.procedure)) },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+W', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: VIEWS.map((v, i) => ({ label: v.label, shortcut: `Ctrl+${i + 1}`, checked: !docRoute && view === v.id, radio: true, onSelect: () => goView(v.id) })),
    },
    {
      label: '&Controls',
      items: [
        { label: '&Acknowledge alarms', shortcut: 'F8', onSelect: () => ackAll() },
        { label: '&Reset cleared alarms', onSelect: () => resetAll() },
        { label: '&Lamp test', checked: lampTest, onSelect: () => setLampTest(!lampTest) },
        { separator: true },
        { label: 'Reset &seal closure', disabled: !pv.plant.sealLatched, onSelect: resetSeal },
        { label: 'Record &filter change...', onSelect: () => tryFilterChange(st.controls.filtration.bank === 'A' ? 'B' : 'A') },
        { separator: true },
        { label: 'Sign &handover log...', shortcut: 'Ctrl+L', onSelect: guard('handover signature', () => setDlg({ kind: 'sign' })) },
      ],
    },
    {
      label: '&Engineering',
      items: [
        { label: 'CO2 &load balance', shortcut: 'Ctrl+B', onSelect: () => (goView('balance'), runBalance()) },
        { label: '&Zones and trends', onSelect: () => goView('zones') },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: '&Operating procedure', onSelect: () => openDoc(EC.docs.procedure) },
        { label: 'Plant &data sheet', onSelect: () => openDoc(EC.docs.datasheet) },
        { separator: true },
        {
          label: '&About Environmental Control',
          onSelect: () =>
            setDlg({
              kind: 'refuse',
              title: 'About Environmental Control',
              text: `Environmental Control, panel ${EC.panelNo}. Site ${EC.site}. The plant model runs on the seal drill timebase, ${TIME_SCALE} plant seconds to each second. Occupancy basis: posted staff.`,
              reference: 'FE',
            }),
        },
      ],
    },
  ];

  /* ------------------------------------------------------------- body */
  const ctl: Ctl = {
    services,
    role,
    pv,
    ann,
    lampTest,
    isolated,
    frozen,
    ages,
    latched,
    narrow,
    balance,
    setFan,
    setMakeup,
    setScrubber,
    setFiltration,
    setBank,
    setOverride: (on) => (on ? (operator ? setDlg({ kind: 'override' }) : refuse('seal override')) : setOverride(false)),
    resetSeal,
    tryFilterChange,
    ackAll,
    resetAll,
    setLampTest,
    runBalance,
    sign: guard('handover signature', () => setDlg({ kind: 'sign' })),
    keyLocked: () => refuse('seal override'),
  };

  let body;
  if (docRoute) body = <DocPane entry={docRoute} />;
  else if (role === 'refused')
    body = (
      <RefusalState
        authority="Facilities Engineering"
        reference="DIR-0128"
        reason={`Environmental plant at ${EC.site} is operated by the site's environmental systems watch and monitored by facility command and Internal Assurance. This account holds neither.`}
        requirement="Facilities Engineering watch qualification, facility command or Internal Assurance"
      />
    );
  else if (view === 'panel') body = <PanelView c={ctl} />;
  else if (view === 'scrubbers') body = <ScrubberView c={ctl} />;
  else if (view === 'filtration') body = <FiltrationView c={ctl} />;
  else if (view === 'zones') body = <ZonesView c={ctl} />;
  else if (view === 'log') body = <HandoverView c={ctl} />;
  else body = <BalanceView c={ctl} />;

  const sealWord = pv.r.seal ? 'SEALED (DRILL)' : pv.r.makeupClosedBySeal ? 'SEAL CLOSURE LATCHED' : st.controls.filtration.mode === 'cbrn' ? 'CONDITIONED (CBRN)' : 'NORMAL';
  const panes = [
    { id: 'msg', content: msg, fill: true, label: 'Message' },
    { id: 'mode', content: role === 'operator' ? 'OPERATE' : role === 'monitor' ? (frozen ? 'REMOTE: LINK DOWN' : 'REMOTE MONITOR') : 'NO ACCESS', width: 130, label: 'Panel mode' },
    { id: 'seal', content: sealWord, width: 170, label: 'Site air state' },
    { id: 'co2', content: role === 'refused' ? '' : `CO2 ${Math.round(pv.plant.co2Ppm)} ppm`, width: 110, mono: true, label: 'Site CO2' },
    { id: 'clock', content: zl(session.tick.value), width: 140, mono: true, label: 'Time' },
  ].filter((p) => !narrow || p.id === 'msg' || p.id === 'seal');

  return (
    <div class="env-app" ref={rootRef} onKeyDown={onKeyDown} data-motion={services.settings.reducedMotion.value ? 'reduced' : undefined}>
      <MenuBar menus={menus} label="Environmental Control menu" />
      <Toolbar label="Panel views">
        {VIEWS.map((v) => (
          <ToolbarButton key={v.id} label={v.short} title={`${v.label} (Ctrl+${VIEWS.indexOf(v) + 1})`} pressed={!docRoute && view === v.id} onClick={() => goView(v.id)} />
        ))}
        <ToolbarSeparator />
        <ToolbarButton label="Ack" title="Acknowledge alarms (F8)" onClick={() => ackAll()} />
        <ToolbarButton label="Procedure" title="Operating procedure" pressed={docRoute?.id === EC.docs.procedure} onClick={() => openDoc(EC.docs.procedure)} />
      </Toolbar>
      <main class="env-body" aria-label={docRoute ? docRoute.title : VIEWS.find((v) => v.id === view)?.label}>
        {body}
      </main>
      <StatusBar panes={panes} />
      <Dialog
        open={dlg?.kind === 'refuse'}
        title={dlg?.kind === 'refuse' ? dlg.title : ''}
        kind="info"
        reference={dlg?.kind === 'refuse' ? dlg.reference : undefined}
        onClose={() => setDlg(null)}
        buttons={[{ label: 'OK', value: 'ok', isDefault: true, isCancel: true }]}
      >
        <p>{dlg?.kind === 'refuse' ? dlg.text : ''}</p>
      </Dialog>
      {dlg?.kind === 'override' && <OverrideDialog latched={latched} onClose={(reason) => (setDlg(null), reason != null && setOverride(true, reason))} />}
      {dlg?.kind === 'filter' && <FilterDialog bank={dlg.bank} age={ages[dlg.bank]} onClose={(lot) => (setDlg(null), lot != null && recordFilter(dlg.bank, lot))} />}
      {dlg?.kind === 'sign' && (
        <SignDialog
          suggestion={balanceRun.current && !balanceRun.current.withinTolerance ? `CO2 load balance over ${balanceRun.current.hours.toFixed(1)} plant hours implies occupancy ${Math.round(balanceRun.current.impliedPersons)} against posted ${POSTED}.` : ''}
          onClose={(r) => (setDlg(null), r != null && sign(r))}
        />
      )}
    </div>
  );
}

export function plantWords(s: EnvironState, sealClosed: boolean): string {
  const fans = EC.ahus.map((a) => `${a.id} ${EC.fanSpeeds[s.controls.ahu[a.id] ?? 0]?.pos ?? ''}`).join(', ');
  const mk = sealClosed ? 'makeup air SEAL CLOSED' : `makeup air ${EC.makeup.positions[s.controls.makeup]?.id ?? ''}`;
  const scr = EC.scrubbers.trains.map((t) => `${t.id} ${(s.controls.scrubbers[t.id] ?? 'off').toUpperCase()}`).join(', ');
  const f = `filtration ${s.controls.filtration.mode === 'cbrn' ? 'CBRN' : 'NORMAL'} bank ${s.controls.filtration.bank}`;
  return `${fans}; ${mk}; ${scr}; ${f}${s.controls.sealOverride ? '; SEAL OVERRIDE ON' : ''}.`;
}

function OverrideDialog({ latched, onClose }: { latched: boolean; onClose: (reason: string | null) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Dialog
      open
      title="Makeup air seal override"
      kind="warning"
      reference="DIR-0128"
      onClose={(v) => onClose(v === 'ok' && reason.trim() ? reason.trim() : null)}
      buttons={[
        { label: 'Override', value: 'ok', isDefault: true },
        { label: 'Cancel', value: 'cancel', isCancel: true },
      ]}
    >
      <p>
        The override releases {EC.makeup.tag} from the seal closure. {latched ? 'A seal closure is in force: unfiltered outside air will be admitted to a sealed site.' : 'No seal closure is in force now; the override will apply to the next one.'} State the reason. The override is
        logged and reported to the site superintendent.
      </p>
      <TextField label="Reason" value={reason} onInput={setReason} maxLength={120} />
    </Dialog>
  );
}

function FilterDialog({ bank, age, onClose }: { bank: FilterBankId; age: number; onClose: (lot: string | null) => void }) {
  const [lot, setLot] = useState('');
  const [isolated, setIsolated] = useState(false);
  const [tried, setTried] = useState(false);
  const value = lot.trim().toUpperCase();
  const lotError = !value
    ? 'Enter the lot number from the stock label.'
    : !/^GPB-\d{4}-\d{2}$/.test(value)
      ? `${value} is not a filter set lot number. Lots read GPB-YYMM-NN, for example ${EC.filtration.stock.lot}.`
      : null;
  const isoError = isolated ? null : 'Confirm the bank was isolated at the local panel before it was opened.';
  return (
    <Dialog
      open
      title={`Record filter change, bank ${bank}`}
      kind="question"
      reference="DIR-0128"
      onClose={(v) => {
        if (v !== 'ok') return onClose(null);
        // Validate in place: an invalid entry keeps the dialog open with the reason shown.
        if (lotError || isoError) return setTried(true);
        onClose(value);
      }}
      buttons={[
        { label: 'Record', value: 'ok', isDefault: true },
        { label: 'Cancel', value: 'cancel', isCancel: true },
      ]}
    >
      <p>
        Bank {bank} pre-filter, final filter check and gas-phase bed. Last change {age} days ago. Record the replacement lot number from the stock label (form GPB-YYMM-NN; the shelf stock in the{' '}
        {EC.filtration.stock.store.toLowerCase()} is lot {EC.filtration.stock.lot}). Isolate the bank at the local panel before opening it.
      </p>
      <TextField label="Lot number" value={lot} onInput={setLot} mono upper maxLength={12} error={tried ? lotError : null} />
      <Checkbox label={`Bank ${bank} isolated at the local panel (dampers shut, fan stopped) before opening`} checked={isolated} onChange={setIsolated} error={tried ? isoError : null} />
    </Dialog>
  );
}

function SignDialog({ suggestion, onClose }: { suggestion: string; onClose: (remarks: string | null) => void }) {
  const [text, setText] = useState('');
  const done = useMemo(() => text.trim().length > 0, [text]);
  return (
    <Dialog
      open
      title="Sign shift handover log"
      kind="question"
      onClose={(v) => onClose(v === 'ok' && done ? text.trim() : v === 'insert' ? null : null)}
      buttons={[
        { label: 'Sign', value: 'ok', isDefault: true },
        { label: 'Cancel', value: 'cancel', isCancel: true },
      ]}
    >
      <p>Your signature records the current readings and plant line-up with your remarks for the oncoming watch.</p>
      <TextArea label="Remarks" value={text} onInput={setText} rows={4} maxLength={400} showCount />
      {suggestion && !text.includes(suggestion) ? (
        <p class="env-note">
          <button type="button" class="env-linkbtn" onClick={() => setText((t) => (t ? `${t} ${suggestion}` : suggestion))}>
            Insert load balance result
          </button>
        </p>
      ) : null}
    </Dialog>
  );
}
