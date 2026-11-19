/**
 * Door and Airlock Control (app id "doors"). Per-facility door board over canon `doors`:
 * level-by-level mimic, door and airlock detail with panel-kit controls, annunciator,
 * cycle log, overrides. Plant state is the shared key `doors` (types.ts); the seal drill
 * (`drill`) and network isolation (`isolation`) drive it.
 */
import type { TargetedKeyboardEvent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AirlockDef, DoorDef, MarkingId } from '@core/canon-types';
import type { AppProps, DrillState, IsolationState } from '@core/contracts';
import { useServices } from '@core/services';
import * as session from '@core/session';
import {
  Dialog,
  MenuBar,
  Select,
  StatusBar,
  TextArea,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  type MenuBarMenu,
} from '@design/index';
import { Icon } from '@graphics/icons';
import { annunciatorStep, ANN_NORMAL, type AnnPoint } from '@graphics/panel';
import { RefusalState } from '@shell/adapters';
import {
  ALARM_TILES,
  DC,
  airlockBusy,
  airlockDef,
  airlockOfLeaf,
  airlockPhase,
  applyDrill,
  authority,
  crossedShift,
  doorDef,
  doorSite,
  doorView,
  drillHolds,
  heldOpen,
  leafPermissive,
  offNormal,
  overrideRef,
  planAirlock,
  planClose,
  planOpen,
  POS_WORD,
  restingPos,
  rulesFor,
  siteDoors,
  abnormal,
  trimLog,
  zl,
  type AlarmId,
} from './model';
import { DOORS_EMPTY, type DoorLogLine, type DoorOverride, type DoorRecord, type DoorsState } from './types';
import { Board, LogView, OverridesView, DocPane, type Actions, type Ui } from './views';
import './doors.css';

const TITLE = 'Door and Airlock Control';
const ISOLATION_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };
const PROC_ROUTE = '/doors/operating-procedure';
const CARD_ROUTE = '/doors/airlock-reference-card';

type View = 'board' | 'log' | 'overrides';
const VIEW_TITLE: Record<View, string> = { board: 'Door board', log: 'Door cycle log', overrides: 'Overrides in force' };

interface Refusal {
  title: string;
  text: string;
  reference: string;
}

type OverrideAsk = { kind: DoorOverride['kind']; target: string; then?: 'open' | 'bypass' };

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const acct = services.account.def.value;
  const rules = useMemo(() => rulesFor(acct), [acct.id]);
  const doorsSig = services.shared.get<DoorsState>('doors', DOORS_EMPTY);
  const drillSig = services.shared.get<DrillState | null>('drill', null);
  const isoSig = services.shared.get<IsolationState>('isolation', ISOLATION_NONE);
  const state = doorsSig.value;
  const drill = drillSig.value;
  const iso = isoSig.value;
  const reduced = services.settings.reducedMotion.value;

  const [site, setSite] = useState<string>(rules.boards.includes(acct.site) ? acct.site : rules.boards[0] ?? acct.site);
  const [view, setView] = useState<View>('board');
  const [sel, setSel] = useState<string | null>(null);
  const [logSel, setLogSel] = useState<string | null>(null);
  const [logSite, setLogSite] = useState<string>(rules.logs.includes(acct.site) ? acct.site : rules.logs[0] ?? acct.site);
  const [msg, setMsg] = useState('Ready');
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [ask, setAsk] = useState<OverrideAsk | null>(null);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState<string | null>(null);
  const [handover, setHandover] = useState(false);
  const [deconMode, setDeconMode] = useState<Record<string, boolean>>({});
  const [lampTest, setLampTest] = useState(false);
  const [ann, setAnn] = useState<Record<AlarmId, AnnPoint>>(() => Object.fromEntries(ALARM_TILES.map((t) => [t.id, ANN_NORMAL])) as Record<AlarmId, AnnPoint>);
  const [now, setNow] = useState(Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const lastTick = useRef(Date.now());

  const own = site === acct.site;
  const remoteLost = iso.active && (iso.clearsAt == null || now < iso.clearsAt);
  const stale = remoteLost && !own;
  const nowIso = session.inWorldIso(new Date(now));

  /* ------------------------------------------------------------ clock */
  const moving = useMemo(() => {
    const sd = siteDoors(site);
    if (!sd) return false;
    return sd.doors.some((d) => doorView(d, state.doors[d.id], now).moving) || sd.airlocks.some((a) => airlockBusy(state.airlocks[a.id], now));
  }, [state, site, now]);
  useEffect(() => {
    const period = moving && !reduced ? 250 : 1000;
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setNow(Date.now());
    }, period);
    return () => window.clearInterval(t);
  }, [moving, reduced]);

  /* ------------------------------------------------------------ seal drill */
  useEffect(() => {
    const r = applyDrill(doorsSig.peek(), drill, Date.now());
    if (!r) return;
    const lines: DoorLogLine[] = r.lines.map((l) => ({ ...l, door: l.site, atIso: session.inWorldIso(new Date(l.at)), by: 'drill' }));
    services.shared.set<DoorsState>('doors', { ...r.next, log: trimLog([...r.next.log, ...lines]) });
    if (r.lines.some((l) => l.site === site)) {
      services.sound.play('door');
      setMsg(r.lines.some((l) => l.event === 'DRILL SEAL') ? `Seal drill ${drill?.id ?? ''}: doors at ${site} closing to drill sequence.` : `Seal drill stand-down: doors at ${site} returning to normal.`);
    }
  }, [drill, now]);

  /* ------------------------------------------------------------ annunciator */
  const ab = abnormal(site, state, now, drill, remoteLost);
  useEffect(() => {
    setAnn((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of ALARM_TILES) {
        const p = prev[t.id];
        const n = annunciatorStep(p, ab[t.id] ? 'abnormal' : 'normal');
        if (n !== p) {
          next[t.id] = n;
          changed = true;
          if (n.seq === 'unack' && p.seq !== 'unack' && t.priority === 'alarm') services.sound.play('alarm');
        }
      }
      return changed ? next : prev;
    });
  }, [ab.held, ab.interlock, ab.portal, ab.override, ab.remote, ab.decon, ab.drill, ab.travel]);
  useEffect(() => {
    // A board brought up on the screen shows every abnormal window unacknowledged.
    setAnn(Object.fromEntries(ALARM_TILES.map((t) => [t.id, annunciatorStep(ANN_NORMAL, ab[t.id] ? 'abnormal' : 'normal')])) as Record<AlarmId, AnnPoint>);
    services.sound.stop('alarm');
  }, [site]);
  useEffect(() => () => services.sound.stop('alarm'), []);

  const ackAlarms = (ids?: string[]) => {
    const list = (ids ?? ALARM_TILES.map((t) => t.id)) as AlarmId[];
    const unacked = list.filter((id) => ann[id]?.seq === 'unack');
    if (!unacked.length) {
      setMsg('No unacknowledged alarms on this board.');
      return;
    }
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of unacked) next[id] = annunciatorStep(prev[id], 'ack');
      return next;
    });
    services.sound.stop('alarm');
    services.sound.play('ack');
    services.audit.log('control', 'doors:ack', `Operator ${services.session.operatorId.peek()} acknowledged door board alarms at ${site}: ${unacked.join(', ')}.`, { site, alarms: unacked.join(',') });
    logLine(site, site, 'ACK', unacked.map((id) => ALARM_TILES.find((t) => t.id === id)?.legend.join(' ')).join('; '));
    setMsg('Alarms acknowledged.');
  };
  const resetAlarms = (ids?: string[]) => {
    const list = (ids ?? ALARM_TILES.map((t) => t.id)) as AlarmId[];
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of list) next[id] = annunciatorStep(prev[id], 'reset');
      return next;
    });
    services.sound.play('button');
  };

  /* ------------------------------------------------------------ shift change */
  useEffect(() => {
    const prev = lastTick.current;
    lastTick.current = now;
    const h = crossedShift(prev, now);
    if (h == null || !(acct.id === 'lifesupport' || acct.id === 'deputy')) return;
    const held = offNormal(acct.site, doorsSig.peek(), now).filter(({ def, v }) => def.normal === 'closed' && v.pos === 'open');
    if (!held.length) return;
    deliverShift(held.map(({ def }) => def.id), `${String(h).padStart(2, '0')}00Z`);
  }, [now]);

  /* ------------------------------------------------------------ helpers */
  const opId = () => services.session.operatorId.peek();
  const isoAt = (ms: number) => session.inWorldIso(new Date(ms));

  function logLine(lineSite: string, door: string, event: string, note?: string, at = Date.now(), by: DoorLogLine['by'] = acct.id) {
    services.shared.update<DoorsState>('doors', DOORS_EMPTY, (s) => ({ ...s, log: trimLog([...s.log, { at, atIso: isoAt(at), site: lineSite, door, event, by, note }]) }));
  }

  const refuse = (r: Refusal, subject: string) => {
    setRefusal(r);
    services.audit.log('window.open', subject, `Operator ${opId()} requested ${subject} at the door board. Request refused in-world: ${r.text}`, { app: 'doors', refusal: r.reference });
  };

  const say = (t: string) => setMsg(t);

  /** Door or airlock definition by id with its site. */
  const defOf = (id: string): { d: DoorDef | AirlockDef; site: string } | null => {
    const s = doorSite(id);
    const d = doorDef(id) ?? airlockDef(id);
    return s && d ? { d, site: s } : null;
  };

  const checkAuthority = (id: string): boolean => {
    const x = defOf(id);
    if (!x) return false;
    if (stale && x.site !== acct.site) {
      refuse({ title: 'Remote indication lost', text: `Hub circuits to ${x.site} are down. The board shows the last indication received; no command can be passed.`, reference: 'OSC-MEM-08-0146 para 9' }, `doors:${id}`);
      return false;
    }
    const a = authority(acct, services.session.compartments.peek(), x.site, x.d);
    if (a.kind === 'view') {
      refuse({ title: 'Door control', text: a.reason, reference: a.reference }, `doors:${id}`);
      return false;
    }
    if (x.d.tier < services.session.tier.peek()) {
      refuse({ title: 'Door control', text: 'This door is not displayed at your access determination.', reference: 'OSC-MEM-08-0146 para 4' }, `doors:${id}`);
      return false;
    }
    return true;
  };

  /* ------------------------------------------------------------ door commands */
  const commandDoor = (id: string, cmd: 'open' | 'close', opts: { override?: DoorOverride } = {}) => {
    const def = doorDef(id);
    const dsite = doorSite(id);
    if (!def || !dsite) return;
    services.sound.play('button');
    if (!checkAuthority(id)) return;
    const t = Date.now();
    const cur = doorsSig.peek();
    const rec = cur.doors[id];
    const v = doorView(def, rec, t);
    if (v.moving) {
      refuse({ title: 'Door in travel', text: `${id} is in travel (${POS_WORD[v.pos]}). A command is accepted only with the leaf on a stop.`, reference: 'OSC-MEM-08-0146 para 5' }, `doors:${id}`);
      return;
    }
    if ((cmd === 'open' && v.pos === 'open') || (cmd === 'close' && v.pos === 'closed-locked')) {
      say(`${id} is already ${POS_WORD[v.pos]}.`);
      return;
    }
    const al = airlockOfLeaf(id);
    if (al && cmd === 'open') {
      const why = leafPermissive(al, id, cur, t);
      if (why === 'interlock') {
        logLine(dsite, al.id, 'INTERLOCK REJECT', `${id} open refused: other leaf not closed-locked`, t);
        services.audit.log('control', 'doors:interlock-reject', `Door board at ${dsite} refused an open command to ${id}: interlock with the other leaf of ${al.id}.`, { door: id, airlock: al.id, site: dsite });
        say(`Interlock: ${id} refused. The other leaf of ${al.id} is not closed and locked.`);
        return;
      }
      if (why === 'dp') {
        refuse({ title: 'Differential permissive not made', text: `The differential across ${id} exceeds ${DC.pressure.leafOpenMaxDp.toFixed(2)} ${DC.pressure.unit}. Cycle the airlock to equalize; leaves are not opened against pressure.`, reference: 'OSC-MEM-08-0147 para 3' }, `doors:${id}`);
        return;
      }
      if (why === 'cycle') {
        refuse({ title: 'Airlock cycling', text: `${al.id} is in a cycle. Leaves are driven by the cycle sequence until it completes.`, reference: 'OSC-MEM-08-0147 para 2' }, `doors:${id}`);
        return;
      }
    }
    if (cmd === 'open' && def.sealsOnDrill && drillHolds(drill, dsite) && rec?.override?.kind !== 'drill-hold' && !opts.override) {
      if (!rules.overrides) {
        refuse({ title: 'Seal drill', text: `${dsite} is sealed for drill ${drill?.id ?? ''}. Doors stay closed until stand-down.`, reference: 'OSC-MEM-08-0146 para 7' }, `doors:${id}`);
        return;
      }
      openAsk({ kind: 'drill-hold', target: id, then: 'open' });
      return;
    }
    const steps = cmd === 'open' ? planOpen(def, t) : planClose(def, t);
    const keepOverride = cmd === 'open' ? opts.override ?? rec?.override ?? null : null;
    const next: DoorRecord = { steps, cmd, by: acct.id, override: keepOverride };
    const done = steps[steps.length - 1]!.from;
    services.shared.update<DoorsState>('doors', DOORS_EMPTY, (s) => {
      const doors = { ...s.doors };
      if (cmd === 'close' && def.normal === 'closed') doors[id] = next;
      else doors[id] = next;
      return {
        ...s,
        doors,
        log: trimLog([
          ...s.log,
          { at: t, atIso: isoAt(t), site: dsite, door: id, event: cmd === 'open' ? 'OPEN CMD' : 'CLOSE CMD', by: acct.id },
          { at: done, atIso: isoAt(done), site: dsite, door: id, event: cmd === 'open' ? 'OPEN' : 'CLOSED-LOCKED', by: acct.id },
        ]),
      };
    });
    services.sound.play('door');
    services.audit.log(
      'control',
      `doors:${cmd}`,
      `Operator ${opId()} commanded ${def.kind} door ${id} (${def.location}, ${dsite}) to ${cmd === 'open' ? 'OPEN' : 'CLOSE'} from workstation.`,
      { door: id, site: dsite, cmd, from: v.pos, cycleSec: String(def.cycleSec), ...(keepOverride ? { override: keepOverride.ref } : {}) },
    );
    say(`${id} ${cmd === 'open' ? 'opening' : 'closing'}: ${def.cycleSec} s cycle.`);
  };

  /* ------------------------------------------------------------ airlock cycle */
  const cycleAirlock = (id: string, dir: 'in' | 'out') => {
    const al = airlockDef(id);
    const asite = doorSite(id);
    if (!al || !asite) return;
    services.sound.play('button');
    if (!checkAuthority(id)) return;
    const t = Date.now();
    const cur = doorsSig.peek();
    if (airlockBusy(cur.airlocks[id], t)) {
      refuse({ title: 'Airlock cycling', text: `${id} is already in a cycle. Wait for the IDLE lamp.`, reference: 'OSC-MEM-08-0147 para 2' }, `doors:${id}`);
      return;
    }
    for (const leaf of [al.outer, al.inner]) {
      const v = doorView(doorDef(leaf)!, cur.doors[leaf], t);
      if (v.pos !== 'closed-locked') {
        logLine(asite, id, 'INTERLOCK REJECT', `cycle refused: ${leaf} ${POS_WORD[v.pos]}`, t);
        services.audit.log('control', 'doors:interlock-reject', `Door board at ${asite} refused a cycle of ${id}: leaf ${leaf} not closed and locked.`, { airlock: id, leaf, site: asite });
        say(`Interlock: ${id} cycle refused. Leaf ${leaf} is ${POS_WORD[v.pos]}.`);
        return;
      }
    }
    if (drillHolds(drill, asite)) {
      refuse({ title: 'Seal drill', text: `${asite} is sealed for drill ${drill?.id ?? ''}. Airlocks do not cycle until stand-down.`, reference: 'OSC-MEM-08-0146 para 7' }, `doors:${id}`);
      return;
    }
    const decon = !!deconMode[id] && al.deconSec != null;
    const plan = planAirlock(al, dir, decon, t, acct.id, null);
    services.shared.update<DoorsState>('doors', DOORS_EMPTY, (s) => ({
      ...s,
      doors: { ...s.doors, [al.outer]: plan.outer, [al.inner]: plan.inner },
      airlocks: { ...s.airlocks, [id]: plan.airlock },
      log: trimLog([
        ...s.log,
        { at: t, atIso: isoAt(t), site: asite, door: id, event: dir === 'in' ? 'CYCLE IN' : 'CYCLE OUT', by: acct.id, note: plan.airlock.decon ? 'CBRN decon' : undefined },
        { at: plan.endsAt, atIso: isoAt(plan.endsAt), site: asite, door: id, event: 'CYCLE COMPLETE', by: 'airlock' },
      ]),
    }));
    services.sound.play('relay');
    services.audit.log(
      'control',
      'doors:cycle',
      `Operator ${opId()} cycled airlock ${id} (${al.location}, ${asite}) ${dir === 'in' ? 'inbound' : 'outbound'}${plan.airlock.decon ? ' with CBRN decontamination' : ''}.`,
      { airlock: id, site: asite, dir, decon: String(plan.airlock.decon), seconds: String(Math.round((plan.endsAt - t) / 1000)) },
    );
    say(`${id} cycling ${dir === 'in' ? 'in' : 'out'}${plan.airlock.decon ? ' with decon' : ''}: ${Math.round((plan.endsAt - t) / 1000)} s.`);
  };

  const setDecon = (id: string, on: boolean) => {
    services.sound.play('switch');
    if (!checkAuthority(id)) return;
    setDeconMode((m) => ({ ...m, [id]: on }));
    services.audit.log('control', 'doors:decon-mode', `Operator ${opId()} set airlock ${id} cycle mode to ${on ? 'CBRN DECON' : 'NORMAL'}.`, { airlock: id, mode: on ? 'decon' : 'normal' });
    say(`${id}: next inbound cycle ${on ? 'with' : 'without'} decontamination.`);
  };

  const bypassDecon = (id: string, ovr?: DoorOverride) => {
    const al = airlockDef(id);
    const asite = doorSite(id);
    if (!al || !asite) return;
    services.sound.play('button');
    if (!checkAuthority(id)) return;
    const t = Date.now();
    const rec = doorsSig.peek().airlocks[id];
    if (airlockPhase(rec, t) !== 'decon' || !rec) {
      say(`${id} is not in a decontamination dwell.`);
      return;
    }
    if (!rules.deconBypass) {
      refuse({ title: 'Decon bypass', text: 'Bypass of the decontamination dwell is the duty officer\'s decision and is entered at the command post. The cycle continues.', reference: 'OSC-MEM-08-0147 para 5' }, `doors:${id}`);
      return;
    }
    if (!ovr) {
      openAsk({ kind: 'decon-bypass', target: id, then: 'bypass' });
      return;
    }
    const idx = rec.steps.findIndex((s) => s.phase === 'decon' && s.from <= t);
    const after = rec.steps[idx + 1];
    if (!after) return;
    const shift = after.from - t;
    const mv = <T extends { from: number }>(xs: T[]) => xs.map((x) => (x.from > t ? { ...x, from: x.from - shift } : x));
    services.shared.update<DoorsState>('doors', DOORS_EMPTY, (s) => {
      const inner = s.doors[al.inner];
      return {
        ...s,
        airlocks: { ...s.airlocks, [id]: { ...rec, steps: mv(rec.steps) } },
        doors: { ...s.doors, ...(inner ? { [al.inner]: { ...inner, steps: mv(inner.steps) } } : {}) },
        log: trimLog(s.log.map((l) => (l.door === id && l.event === 'CYCLE COMPLETE' && l.at > t ? { ...l, at: l.at - shift, atIso: isoAt(l.at - shift) } : l))),
      };
    });
  };

  /* ------------------------------------------------------------ overrides */
  const openAsk = (a: OverrideAsk) => {
    setReason('');
    setReasonErr(null);
    setAsk(a);
    services.sound.play('guard');
  };

  const requestHoldOpen = (id: string) => {
    const def = doorDef(id);
    if (!def) return;
    services.sound.play('button');
    if (!checkAuthority(id)) return;
    if (!rules.overrides) {
      refuse({ title: 'Override', text: 'Door overrides are entered by the duty door operator.', reference: 'OSC-MEM-08-0146 para 8' }, `doors:${id}`);
      return;
    }
    const v = doorView(def, doorsSig.peek().doors[id], Date.now());
    if (def.normal !== 'closed' || v.pos !== 'open' || airlockOfLeaf(id)) {
      refuse({ title: 'Override', text: `A hold-open override applies only to a normally closed door standing open. ${id} is ${POS_WORD[v.pos]}${airlockOfLeaf(id) ? ' and is an airlock leaf' : ''}.`, reference: 'OSC-MEM-08-0146 para 8' }, `doors:${id}`);
      return;
    }
    openAsk({ kind: 'hold-open', target: id });
  };

  const clearOverride = (id: string) => {
    const rec = doorsSig.peek().doors[id];
    const dsite = doorSite(id);
    if (!rec?.override || !dsite) {
      say(`No override is in force on ${id}.`);
      return;
    }
    services.sound.play('button');
    if (!checkAuthority(id)) return;
    const ref = rec.override.ref;
    services.shared.update<DoorsState>('doors', DOORS_EMPTY, (s) => {
      const r = s.doors[id];
      return r ? { ...s, doors: { ...s.doors, [id]: { ...r, override: null } }, log: trimLog([...s.log, { at: Date.now(), atIso: isoAt(Date.now()), site: dsite, door: id, event: 'OVERRIDE CLEARED', by: acct.id, note: ref }]) } : s;
    });
    services.audit.log('control', 'doors:override-clear', `Operator ${opId()} cleared override ${ref} on door ${id} (${dsite}).`, { door: id, site: dsite, ref });
    say(`Override ${ref} cleared.`);
  };

  const submitOverride = () => {
    if (!ask) return;
    const text = reason.trim();
    if (text.length < 12) {
      setReasonErr('State the reason in full: the work or condition, and who is attending the door.');
      return;
    }
    const x = defOf(ask.target);
    if (!x) return;
    const serial = (doorsSig.peek().serial[x.site] ?? 0) + 1;
    const t = Date.now();
    const ovr: DoorOverride = { ref: overrideRef(x.site, serial), kind: ask.kind, reason: text, by: acct.id, at: t, atIso: isoAt(t) };
    services.shared.update<DoorsState>('doors', DOORS_EMPTY, (s) => {
      const doors = { ...s.doors };
      if (ask.kind === 'hold-open') {
        const r = doors[ask.target];
        if (r) doors[ask.target] = { ...r, override: ovr };
      }
      return {
        ...s,
        doors,
        serial: { ...s.serial, [x.site]: serial },
        log: trimLog([...s.log, { at: t, atIso: ovr.atIso, site: x.site, door: ask.target, event: 'OVERRIDE', by: acct.id, note: `${ovr.ref} ${ask.kind.toUpperCase()}: ${text}` }]),
      };
    });
    services.audit.log(
      'control',
      'doors:override',
      `Operator ${opId()} entered door override ${ovr.ref} (${ask.kind}) on ${ask.target} at ${x.site}. Reason given: "${text}".`,
      { door: ask.target, site: x.site, ref: ovr.ref, kind: ask.kind, reason: text },
    );
    services.sound.play('relay');
    deliverOverride(ovr, ask.target, x.site);
    const a = ask;
    setAsk(null);
    if (a.then === 'open') commandDoor(a.target, 'open', { override: ovr });
    else if (a.then === 'bypass') bypassDecon(a.target, ovr);
    say(`Override ${ovr.ref} entered.`);
  };

  /* ------------------------------------------------------------ interlock bypass (never available) */
  const bypassAttempt = (al: AirlockDef) => {
    const asite = doorSite(al.id) ?? site;
    const t = Date.now();
    const key = `${DC.bypassKeyPrefix}-${al.id}`;
    logLine(asite, al.id, 'INTERLOCK BYPASS ATTEMPT', `key ${key} not in switch`, t);
    services.audit.log('control', 'doors:interlock-bypass', `Operator ${opId()} attempted to turn interlock bypass switch ${key} on airlock ${al.id} (${asite}) without the key. Bypass not made.`, { airlock: al.id, site: asite, key });
    const prior = services.audit.entries.peek().filter((e) => e.kind === 'control' && e.subject === 'doors:interlock-bypass').length;
    const slots = { airlock: al.id, site: asite, key, time: zl(isoAt(t), asite), operator: opId() };
    if (prior <= 1) services.mail.deliver(DC.mail.interlock, { slots: { ...slots, date: session.formatInWorldDate() } });
    else if (acct.id !== 'auditor' && !services.traces.all.peek().some((x) => x.from === acct.id && x.msgId === DC.mail.interlockOia)) {
      services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: DC.mail.interlockOia, subject: `Interlock bypass attempts, ${al.id}`, data: { ...slots, count: String(prior), account: acct.displayName } });
    }
    services.sound.play('error');
    setRefusal({
      title: 'Interlock bypass',
      text: `Key ${key} is not in the switch. Interlock bypass keys are held by the ${asite} duty officer and issued against a signed permit. The attempt has been recorded.`,
      reference: 'OSC-MEM-08-0147 para 6',
    });
  };

  /* ------------------------------------------------------------ mail */
  function deliverOverride(ovr: DoorOverride, target: string, osite: string) {
    const slots = { ref: ovr.ref, door: target, site: osite, kind: ovr.kind.replace('-', ' '), reason: ovr.reason, time: zl(ovr.atIso, osite), operator: opId(), date: session.formatInWorldDate() };
    const already = services.mail.delivered.peek().includes(DC.mail.override);
    services.mail.deliver(DC.mail.override, { slots, repeat: already });
    if (acct.id !== 'auditor' && !services.traces.all.peek().some((x) => x.from === acct.id && x.msgId === DC.mail.overrideOia)) {
      services.traces.post({ to: 'auditor', kind: 'mail.deliver', msgId: DC.mail.overrideOia, subject: `Door override ${ovr.ref}`, data: { ...slots, account: acct.displayName } });
    }
  }

  const shiftSent = useRef(new Set<string>());
  function deliverShift(ids: string[], watch: string) {
    const key = `${watch}:${ids.join(',')}`;
    if (shiftSent.current.has(key)) return;
    shiftSent.current.add(key);
    const already = services.mail.delivered.peek().includes(DC.mail.shift);
    services.mail.deliver(DC.mail.shift, { slots: { doors: ids.join(', '), watch, site: acct.site, operator: opId(), date: session.formatInWorldDate() }, repeat: already });
    services.audit.log('system', 'doors:shift-open', `Door board ${acct.site}: ${ids.join(', ')} open across the watch change at ${watch}.`, { doors: ids.join(','), watch, site: acct.site });
  }

  const signHandover = () => {
    const t = Date.now();
    const list = offNormal(acct.site, doorsSig.peek(), t);
    const held = list.filter(({ def, v }) => def.normal === 'closed' && v.pos === 'open');
    services.audit.log(
      'control',
      'doors:handover',
      `Operator ${opId()} signed the door board watch handover at ${acct.site}. Doors off normal: ${list.length ? list.map(({ def, v }) => `${def.id} ${POS_WORD[v.pos]}`).join(', ') : 'none'}.`,
      { site: acct.site, offNormal: list.map(({ def }) => def.id).join(','), held: held.map(({ def }) => def.id).join(',') },
    );
    logLine(acct.site, acct.site, 'HANDOVER', list.length ? `${list.length} off normal` : 'all doors normal', t);
    services.sound.play('print');
    if (held.length) deliverShift(held.map(({ def }) => def.id), session.zulu(new Date(t)));
    setHandover(false);
    say(held.length ? `Handover signed with ${held.length} door${held.length > 1 ? 's' : ''} open. The incoming watch has been advised.` : 'Handover signed. All doors at normal.');
  };

  const requestRecord = (door: string, rsite: string, level: number | null) => {
    services.sound.play('button');
    services.audit.log('control', 'doors:record-request', `Operator ${opId()} requested the door record for ${door} (${rsite}) from the cycle log.`, { door, site: rsite, level: String(level ?? '') });
    if (!services.mail.delivered.peek().includes(DC.mail.noRecord)) {
      services.mail.deliver(DC.mail.noRecord, { slots: { door, site: rsite, level: level == null ? 'not stated' : String(level), operator: opId(), date: session.formatInWorldDate() } });
    }
    say(`Record request for ${door} passed to the ${rsite} door records office.`);
  };

  /* ------------------------------------------------------------ title, marking, audit */
  const docRoute = route && route.route !== '/doors' ? route : null;
  const marking: MarkingId = docRoute?.marking ?? 'UMBRA-R';
  const title = docRoute ? docRoute.title : `${TITLE}: ${site}`;
  useEffect(() => {
    win.setTitle(title, docRoute?.docNo ?? '');
    win.setMarking(marking);
    win.setStatus(docRoute ? `${docRoute.docNo} rev ${docRoute.revision}` : `${TITLE}: ${VIEW_TITLE[view]}`);
  }, [title, docRoute?.docNo, marking, view]);

  /* ------------------------------------------------------------ keyboard, menus */
  const selDoor = sel ? doorDef(sel) : undefined;
  const selAirlock = sel ? airlockDef(sel) : undefined;

  const goView = (v: View) => {
    if (docRoute) win.navigate('/doors');
    setView(v);
  };
  const goSite = (s: string) => {
    if (!rules.boards.includes(s)) return;
    setSite(s);
    setSel(null);
    services.sound.play('switch');
    services.audit.log('control', 'doors:board', `Operator ${opId()} displayed the ${s} door board.`, { site: s });
  };

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('textarea, input, select')) return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey && e.shiftKey && k === 'o' && selDoor) {
      e.preventDefault();
      commandDoor(selDoor.id, 'open');
    } else if (e.ctrlKey && e.shiftKey && k === 'c' && selDoor) {
      e.preventDefault();
      commandDoor(selDoor.id, 'close');
    } else if (e.ctrlKey && e.shiftKey && k === 'a') {
      e.preventDefault();
      ackAlarms();
    } else if (e.altKey && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      goView((['board', 'log', 'overrides'] as View[])[Number(e.key) - 1]!);
    } else if (e.key === 'Escape' && sel) {
      setSel(null);
    }
  };

  const operable = (id: string | null | undefined) => {
    if (!id) return false;
    const x = defOf(id);
    if (!x) return false;
    return authority(acct, services.session.compartments.value, x.site, x.d).kind === 'operate' && !(stale && x.site !== acct.site);
  };

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Operating procedure (OSC-MEM-08-0146)', onSelect: () => win.navigate(PROC_ROUTE) },
        { label: '&Airlock reference card (OSC-MEM-08-0147)', onSelect: () => win.navigate(CARD_ROUTE) },
        { separator: true },
        {
          label: '&Print',
          shortcut: 'Ctrl+P',
          onSelect: () =>
            docRoute
              ? services.print(docRoute.id)
              : refuse({ title: 'Print', text: 'The live door board is not a record and is not printed. Print the operating procedure, or sign the watch handover, which is filed.', reference: 'OSC-DIR-0319' }, 'doors:print'),
        },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+W', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Board',
      items: [
        ...rules.boards.slice(0, 12).map((s) => ({ label: s, checked: s === site && !docRoute, radio: true, onSelect: () => { goView('board'); goSite(s); } })),
        ...(rules.boards.length > 12 ? [{ label: 'Other sites: use the Site list on the toolbar', disabled: true, onSelect: () => undefined }] : []),
        { separator: true },
        { label: '&Acknowledge alarms', shortcut: 'Ctrl+Shift+A', onSelect: () => ackAlarms() },
        { label: '&Reset cleared alarms', onSelect: () => resetAlarms() },
        { label: '&Lamp test', checked: lampTest, onSelect: () => { setLampTest(!lampTest); services.sound.play('button'); } },
        { separator: true },
        {
          label: '&Watch handover report...',
          onSelect: () =>
            acct.id === 'lifesupport' || acct.id === 'deputy'
              ? (setHandover(true), services.sound.play('button'))
              : refuse({ title: 'Watch handover', text: 'The watch handover is signed by the duty door operator at the site. This workstation has no door watch.', reference: 'OSC-MEM-08-0146 para 10' }, 'doors:handover'),
        },
      ],
    },
    {
      label: '&Door',
      items: [
        { label: '&Open', shortcut: 'Ctrl+Shift+O', disabled: !selDoor, onSelect: () => selDoor && commandDoor(selDoor.id, 'open') },
        { label: '&Close', shortcut: 'Ctrl+Shift+C', disabled: !selDoor, onSelect: () => selDoor && commandDoor(selDoor.id, 'close') },
        { separator: true },
        { label: 'Cycle airlock &in', disabled: !selAirlock, onSelect: () => selAirlock && cycleAirlock(selAirlock.id, 'in') },
        { label: 'Cycle airlock o&ut', disabled: !selAirlock, onSelect: () => selAirlock && cycleAirlock(selAirlock.id, 'out') },
        { label: '&Decon bypass...', disabled: !selAirlock, onSelect: () => selAirlock && bypassDecon(selAirlock.id) },
        { separator: true },
        { label: '&Hold-open override...', disabled: !selDoor, onSelect: () => selDoor && requestHoldOpen(selDoor.id) },
        { label: 'C&lear override', disabled: !selDoor || !state.doors[selDoor.id]?.override, onSelect: () => selDoor && clearOverride(selDoor.id) },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Door board', shortcut: 'Alt+1', checked: view === 'board' && !docRoute, radio: true, onSelect: () => goView('board') },
        { label: 'Cycle &log', shortcut: 'Alt+2', checked: view === 'log' && !docRoute, radio: true, onSelect: () => goView('log') },
        { label: '&Overrides in force', shortcut: 'Alt+3', checked: view === 'overrides' && !docRoute, radio: true, onSelect: () => goView('overrides') },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: '&Operating procedure', onSelect: () => win.navigate(PROC_ROUTE) },
        { label: '&Airlock reference card', onSelect: () => win.navigate(CARD_ROUTE) },
        { separator: true },
        {
          label: '&About Door and Airlock Control',
          onSelect: () =>
            setRefusal({
              title: 'About Door and Airlock Control',
              text: `Door and Airlock Control, plant HMI release 2.3. Board data: ${DC.logRetentionDays}-day cycle log, ${siteDoors(site)?.doors.length ?? 0} doors at ${site}. Operated under OSC-MEM-08-0146.`,
              reference: 'OSC-MEM-08-0146',
            }),
        },
      ],
    },
  ];

  /* ------------------------------------------------------------ body */
  const ui: Ui = { site, own, stale, now, nowIso, state, drill, ann, lampTest, sel, deconMode, rules, acct, reduced, logSite, logSel };
  const actions: Actions = {
    select: (id) => {
      setSel(id);
      const x = id ? defOf(id) : null;
      if (x) say(`${id}: ${'location' in x.d ? x.d.location : ''}`);
    },
    commandDoor,
    cycleAirlock,
    setDecon,
    bypassDecon: (id) => bypassDecon(id),
    bypassAttempt,
    requestHoldOpen,
    clearOverride,
    ack: ackAlarms,
    reset: resetAlarms,
    test: (on) => {
      setLampTest(on);
      if (on) services.sound.play('button');
    },
    operable,
    setLogSite: (s) => {
      setLogSite(s);
      setLogSel(null);
      services.audit.log('control', 'doors:log', `Operator ${opId()} displayed the ${s} door cycle log.`, { site: s });
    },
    setLogSel,
    requestRecord,
    say,
  };

  let body;
  if (docRoute) {
    const key = docRoute.access ? (docRoute.access.compartment ? `${docRoute.access.compartment}+T${docRoute.access.tier}` : `T${docRoute.access.tier}`) : null;
    body =
      key && !services.clearance.satisfies(key) ? (
        <RefusalState authority="Classification Control, Office of Internal Assurance" reference={docRoute.docNo} docNo={docRoute.docNo} reason={`Display of ${docRoute.docNo} to this operator is not authorised by the current access determination.`} />
      ) : (
        <DocPane entry={docRoute} />
      );
  } else if (view === 'log') body = <LogView ui={ui} act={actions} />;
  else if (view === 'overrides') body = <OverridesView ui={ui} act={actions} />;
  else body = <Board ui={ui} act={actions} />;

  const offN = offNormal(site, state, now).length;
  const drillWord = drill && drillHolds(drill, site) ? `DRILL ${drill.id}` : drill && (drill.phase === 'propagating' || drill.phase === 'sealed') ? `DRILL ORDERED` : 'NO DRILL';
  const heldN = heldOpen(site, state, now).length;
  const panes = [
    { id: 'msg', content: msg, fill: true, label: 'Message' },
    { id: 'site', content: `${site}${own ? '' : stale ? ' NO DATA' : ' INDICATION'}`, width: 150, mono: true, label: 'Board' },
    { id: 'off', content: `${offN} off normal${heldN ? `, ${heldN} held` : ''}`, width: 140, label: 'Doors off normal' },
    { id: 'drill', content: drillWord, width: 150, label: 'Seal drill' },
    { id: 'clock', content: `${zl(nowIso, site)} ${session.formatInWorldDate(new Date(now))}`, width: 200, mono: true, label: 'Time' },
  ];

  const handoverList = handover ? offNormal(acct.site, state, now) : [];

  return (
    <div class="dr-app" ref={rootRef} onKeyDown={onKeyDown}>
      <MenuBar menus={menus} label="Door and Airlock Control menu" />
      <Toolbar label="Door board">
        <ToolbarButton label="Board" pressed={view === 'board' && !docRoute} title="Door board (Alt+1)" onClick={() => goView('board')} />
        <ToolbarButton label="Cycle log" pressed={view === 'log' && !docRoute} title="Cycle log (Alt+2)" onClick={() => goView('log')} />
        <ToolbarButton label="Overrides" pressed={view === 'overrides' && !docRoute} title="Overrides in force (Alt+3)" onClick={() => goView('overrides')} />
        <ToolbarSeparator />
        <ToolbarButton label="Open" icon={<Icon id="door-open" size={16} />} disabled={!selDoor || !operable(sel)} title="Open selected door (Ctrl+Shift+O)" onClick={() => selDoor && commandDoor(selDoor.id, 'open')} />
        <ToolbarButton label="Close" icon={<Icon id="door-closed" size={16} />} disabled={!selDoor || !operable(sel)} title="Close selected door (Ctrl+Shift+C)" onClick={() => selDoor && commandDoor(selDoor.id, 'close')} />
        <ToolbarButton label="Cycle" icon={<Icon id="airlock-cycle" size={16} />} disabled={!selAirlock || !operable(sel)} title="Cycle selected airlock inbound" onClick={() => selAirlock && cycleAirlock(selAirlock.id, 'in')} />
        <ToolbarButton label="Acknowledge" icon={<Icon id="alarm-ack" size={16} />} title="Acknowledge alarms (Ctrl+Shift+A)" onClick={() => ackAlarms()} />
        {rules.boards.length > 1 && view === 'board' && !docRoute ? (
          <>
            <ToolbarSeparator />
            <span class="dr-tb-site toolbar__focusable">
              <Select label="Site" value={site} options={rules.boards.map((s) => ({ value: s, label: s }))} onChange={goSite} width={18} />
            </span>
          </>
        ) : null}
      </Toolbar>
      <main class="dr-body" aria-label={title}>
        {body}
      </main>
      <StatusBar panes={panes} />

      <Dialog
        open={!!refusal}
        title={refusal?.title ?? ''}
        kind="info"
        reference={refusal?.reference}
        onOpen={() => services.sound.play('error')}
        onClose={() => setRefusal(null)}
        buttons={[{ label: 'OK', value: 'ok', isDefault: true, isCancel: true }]}
      >
        <p>{refusal?.text}</p>
      </Dialog>

      <Dialog
        open={!!ask}
        title={ask?.kind === 'drill-hold' ? 'Override: seal drill hold' : ask?.kind === 'decon-bypass' ? 'Override: decon bypass' : 'Override: hold open'}
        kind="warning"
        reference="OSC-MEM-08-0146 para 8"
        onClose={(v) => (v === 'ok' ? submitOverride() : (setAsk(null), say('Override not entered.')))}
        buttons={[
          { label: 'Enter override', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
      >
        <p>
          {ask?.kind === 'drill-hold'
            ? `${ask.target} is held closed by seal drill ${drill?.id ?? ''}. Opening it during the drill is an override and is reported to Internal Assurance.`
            : ask?.kind === 'decon-bypass'
              ? `Ends the decontamination dwell of ${ask.target} now. Personnel in the chamber pass to the inner leaf without the full air wash.`
              : `Holds ${ask?.target ?? ''} open beyond the held-open time and silences DOOR HELD OPEN for it until cleared.`}
        </p>
        <TextArea label="Reason" layout="stacked" value={reason} onInput={(v) => { setReason(v); setReasonErr(null); }} rows={3} maxLength={200} error={reasonErr} required hint="Recorded in the cycle log and the audit trail with your operator id." />
      </Dialog>

      <Dialog
        open={handover}
        title={`Watch handover: ${acct.site} door board`}
        kind="question"
        reference="OSC-MEM-08-0146 para 10"
        onClose={(v) => (v === 'sign' ? signHandover() : setHandover(false))}
        buttons={[
          { label: 'Sign handover', value: 'sign', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
      >
        <p>Doors off their normal position at {zl(nowIso, acct.site)}:</p>
        {handoverList.length ? (
          <ul class="dr-handover">
            {handoverList.map(({ def, v }) => (
              <li key={def.id}>
                <span class="mono">{def.id}</span> {def.location}: {POS_WORD[v.pos]} (normal {POS_WORD[restingPos(def)]}){state.doors[def.id]?.override ? `, override ${state.doors[def.id]!.override!.ref}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p>None. Every door is at its normal position.</p>
        )}
      </Dialog>
    </div>
  );
}
