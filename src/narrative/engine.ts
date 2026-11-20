/**
 * MERIDIAN narrative engine entry point.
 *
 *   startNarrative(account)  wires the narrative for the signed-in account to the Services
 *                            singleton and the persist layer (key "narrative", in the
 *                            account's namespace). Call once after the session, audit trail
 *                            and mail stores are initialised.
 *     analyst                the pass-one engine, unchanged (./rules.ts, ./runtime.ts)
 *     lifesupport, deputy,   login mail and the triggered queue (./accounts.ts,
 *     auditor                ./account-runtime.ts; docs/narrative-2/accounts.md)
 *
 * The rules themselves are pure reducers; the runtimes apply their effects. Apps read the
 * segment 04 movement from ./seg04.ts and may use formRefusal() for in-form refusals.
 */
import type { AccountId } from '@core/contracts';
import { services } from '@core/services';
import { load, loadFrom, save } from '@core/persist';
import { createRuntime } from './runtime';
import type { NarrativeRuntime } from './runtime';
import { createAccountRuntime, type AcctRuntime } from './account-runtime';
import { ACCOUNT_SPECS, isNarrativeAccount } from './accounts';

export { reduce, initialState, formRefusal, WORKSTATION } from './rules';
export type { NarrativeState, NarrativeEvent, Effect } from './rules';
export { seg04, reportTransitBoard, transitBoardVisible, seg04Blocks, seg04LogLine, seg04LogVisible, seg04WatchData, seg04WatchDetail, SEG04_CONSIST_LABEL } from './seg04';

let running: Promise<NarrativeRuntime | AcctRuntime | null> | null = null;

const every = (ms: number, fn: () => void) => {
  const h = setInterval(fn, ms);
  return () => clearInterval(h);
};

export function startNarrative(account: AccountId = 'analyst'): Promise<NarrativeRuntime | AcctRuntime | null> {
  if (running) return running;
  if (account === 'analyst') {
    running = createRuntime(services, {
      load: () => load<unknown>('narrative', null),
      save: (s) => save('narrative', s, 250),
      now: () => Date.now(),
      every,
    });
  } else if (isNarrativeAccount(account)) {
    running = createAccountRuntime(
      services,
      {
        load: () => load<unknown>('narrative', null),
        save: (s) => save('narrative', s, 250),
        now: () => Date.now(),
        every,
        readAudit: (id) => loadFrom(id, 'audit', []),
      },
      account,
      ACCOUNT_SPECS[account],
    );
  } else running = Promise.resolve(null);
  return running;
}
