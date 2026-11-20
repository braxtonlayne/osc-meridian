/**
 * Runtime for the per-account queues (./accounts.ts): feeds this account's audit entries and
 * 5 s ticks (with a snapshot of shared plant state, this account's traces and, where a rule
 * needs it, other accounts' audit trails) through the pure reducer, and delivers the mail.
 * All I/O is injected so it can be tested.
 */
import type { AccountId, AuditEntry, DrillState, Services } from '@core/contracts';
import { crossReadAccounts, displayedDocNos, reduceAccount, reviveAcctState, type AcctEvent, type AcctMail, type AcctState, type AcctWorld } from './accounts';

export interface AcctRuntimeIo {
  load(): Promise<unknown>;
  save(state: AcctState): void;
  now(): number;
  every(ms: number, fn: () => void): () => void;
  /** Read another account's audit trail (persisted on this workstation). */
  readAudit(id: AccountId): Promise<AuditEntry[]>;
}

export const ACCT_TICK_MS = 5_000;
/** Other accounts' trails are re-read at most this often. */
export const CROSS_READ_MS = 30_000;

export interface AcctRuntime {
  state(): AcctState;
  dispatch(ev: AcctEvent): void;
  /** Tick now with a fresh world snapshot (tests; plant/trace changes). */
  tick(): void;
  stop(): void;
}

const ACTIVE_PHASES = new Set(['propagating', 'sealed']);

export async function createAccountRuntime(svc: Services, io: AcctRuntimeIo, account: AccountId, spec: readonly AcctMail[]): Promise<AcctRuntime> {
  let state = reviveAcctState(await io.load(), account);
  let sawLogin = false;
  let busy = false;
  const queue: AcctEvent[] = [];
  const crossFrom = crossReadAccounts(spec);
  const crossReads: Partial<Record<AccountId, string[]>> = {};
  let crossAt = 0;
  const drillSig = svc.shared.get<DrillState | null>('drill', null);

  function dispatch(ev: AcctEvent): void {
    queue.push(ev);
    if (busy) return;
    busy = true;
    try {
      while (queue.length) {
        const r = reduceAccount(state, spec, queue.shift()!);
        state = r.state;
        io.save(state);
        for (const fx of r.effects) {
          try {
            svc.mail.deliver(fx.id, { ...(fx.silent ? { silent: true } : {}), ...(fx.slots ? { slots: fx.slots } : {}) });
          } catch (err) {
            console.error('MERIDIAN account narrative', err);
          }
        }
      }
    } finally {
      busy = false;
    }
  }

  function world(): AcctWorld {
    const d = drillSig.peek();
    return {
      drillActive: !!d && typeof d === 'object' && ACTIVE_PHASES.has(d.phase),
      traces: svc.traces.mine.peek(),
      crossReads,
    };
  }

  async function refreshCross(force = false): Promise<void> {
    if (!crossFrom.length) return;
    const now = io.now();
    if (!force && now - crossAt < CROSS_READ_MS) return;
    crossAt = now;
    for (const id of crossFrom) {
      try {
        crossReads[id] = displayedDocNos(await io.readAudit(id));
      } catch {
        /* that account has never signed in here */
      }
    }
  }

  const tick = () => {
    void refreshCross().then(() => dispatch({ type: 'tick', now: io.now(), world: world() }));
  };

  const unsubscribe = svc.audit.subscribe((entry) => {
    const newSession = entry.kind === 'login' && !sawLogin;
    if (entry.kind === 'login') sawLogin = true;
    if (entry.kind === 'logout') sawLogin = false;
    dispatch({ type: 'audit', entry, now: io.now(), newSession });
    if (entry.kind === 'login') void refreshCross(true).then(() => dispatch({ type: 'tick', now: io.now(), world: world() }));
  });
  const stopTimer = io.every(ACCT_TICK_MS, tick);
  // Plant state and traces: react at once rather than on the next tick.
  const stopDrill = drillSig.subscribe(() => dispatch({ type: 'tick', now: io.now(), world: world() }));
  const stopTraces = svc.traces.mine.subscribe(() => dispatch({ type: 'tick', now: io.now(), world: world() }));

  return {
    state: () => state,
    dispatch,
    tick: () => dispatch({ type: 'tick', now: io.now(), world: world() }),
    stop() {
      unsubscribe();
      stopTimer();
      stopDrill();
      stopTraces();
    },
  };
}
