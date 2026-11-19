/**
 * Narrative runtime: feeds audit entries and clock ticks through the pure
 * reducer (rules.ts), applies its effects through Services, persists state and
 * publishes the segment 04 window. All I/O is injected so it can be tested.
 */
import type { AuditEntry, Services } from '@core/contracts';
import { reduce, reviveState, seg04Window } from './rules';
import type { Ctx, Effect, NarrativeEvent, NarrativeState } from './rules';
import { publishSeg04, transitBoardVisible } from './seg04';

export interface RuntimeIo {
  load(): Promise<unknown>;
  save(state: NarrativeState): void;
  now(): number;
  /** Start a repeating timer; returns a stop function. */
  every(ms: number, fn: () => void): () => void;
}

export const TICK_MS = 5_000;

export interface NarrativeRuntime {
  state(): NarrativeState;
  /** Feed an event directly (tests, or a forced tick). */
  dispatch(ev: NarrativeEvent): void;
  stop(): void;
}

export async function createRuntime(svc: Services, io: RuntimeIo): Promise<NarrativeRuntime> {
  let state: NarrativeState = reviveState(await io.load());
  let sawLogin = false;
  let busy = false;
  const queue: NarrativeEvent[] = [];

  const ctx: Ctx = {
    get operatorId() {
      return svc.session.operatorId.peek();
    },
    markingOf: (docNo) => svc.docs.byDocNo(docNo)?.marking,
  };

  function apply(fx: Effect): void {
    switch (fx.type) {
      case 'grant':
        svc.clearance.grant(fx.key, fx.reason);
        break;
      case 'flag':
        svc.session.setFlag(fx.name);
        break;
      case 'mail': {
        const { type: _t, id, ...opts } = fx;
        svc.mail.deliver(id, opts);
        break;
      }
      case 'notify':
        svc.notify(fx.text, { from: fx.from });
        break;
      case 'audit':
        svc.audit.log('system', fx.subject, fx.detail);
        break;
    }
  }

  function dispatch(ev: NarrativeEvent): void {
    queue.push(ev);
    if (busy) return; // effects re-enter through audit.subscribe; drain in order
    busy = true;
    try {
      while (queue.length) {
        const next = queue.shift()!;
        const r = reduce(state, next, ctx);
        state = r.state;
        io.save(state);
        for (const fx of r.effects) {
          try {
            apply(fx);
          } catch (err) {
            console.error('MERIDIAN narrative effect', err);
          }
        }
      }
    } finally {
      busy = false;
    }
    publishSeg04(seg04Window(state, io.now()));
  }

  const unsubscribe = svc.audit.subscribe((entry: AuditEntry) => {
    const newSession = entry.kind === 'login' && !sawLogin;
    if (entry.kind === 'login') sawLogin = true;
    if (entry.kind === 'logout') sawLogin = false;
    dispatch({ type: 'audit', entry, now: io.now(), newSession });
  });

  dispatch({ type: 'sync', compartments: [...svc.session.compartments.peek()], acting: svc.session.actingTier2.peek(), now: io.now() });
  const tick = () => dispatch({ type: 'tick', now: io.now(), boardOpen: transitBoardVisible.peek() });
  const stopTimer = io.every(TICK_MS, tick);
  // Board shown: tick at once so a due movement starts while it is on screen.
  const stopBoard = transitBoardVisible.subscribe((v) => {
    if (v) tick();
  });

  return {
    state: () => state,
    dispatch,
    stop() {
      unsubscribe();
      stopTimer();
      stopBoard();
    },
  };
}
