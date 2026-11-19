/**
 * Shell reactions to network isolation (shared key `isolation`, owner: isolate app).
 * While isolated: hub links report DOWN (Taskbar), and a plain notice line sits
 * under the top classification banner. At level 3 or above the lock screen notes
 * that this workstation is under Internal Assurance review.
 *
 * The isolation rule itself (clearsAt and restorations honoured, malformed values read as
 * "never initiated") is the isolate app's `src/apps/isolate/state.ts`; this module re-exports it.
 */
import { computed } from '@preact/signals';
import type { IsolationState } from '@core/contracts';
import { shared } from '@core/shared';
import * as session from '@core/session';
import { WORKSTATION_ID } from '@core/audit';
import { ISOLATION_NONE as NONE, clearedAt, isolatedAt, latestInitiation, readIsolation } from '@apps/isolate/state';

export { clearedAt, isolatedAt, latestInitiation, readIsolation };

export const ISOLATION_NONE: IsolationState = NONE;

const raw = shared.get<IsolationState>('isolation', ISOLATION_NONE);
/** The stored isolation state, repaired (never throws on a partial or malformed value). */
export const isolation = computed<IsolationState>(() => readIsolation(raw.value));

export const isolatedNow = computed(() => isolatedAt(isolation.value, session.tick.value));

/** "1430Z (1030 EDT)" for an in-world ISO time. */
export function zuluLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${session.zulu(d)} (${session.siteLocal(d)})`;
}

/** Notice line under the top banner; renders an empty row when not isolated. */
export function IsolationNotice() {
  const s = isolation.value;
  const on = isolatedNow.value;
  const last = latestInitiation(s);
  if (!on) return <div class="iso-notice-slot" />;
  return (
    <div class="iso-notice-slot">
      <div class="iso-notice" role="status">
        <span class="st-sq st-fault" aria-hidden="true" />
        <span>
          Network isolated by manual initiate {last?.ref ?? 'reference not recorded'}
          {last ? ` at ${zuluLocal(last.at)}` : ''}. Hub circuits down.
        </span>
      </div>
    </div>
  );
}

/** Lock-screen review notice (isolation level 3 and above), or null. */
export function reviewNotice(s: IsolationState): string | null {
  const v = readIsolation(s);
  if (v.level < 3) return null;
  const last = latestInitiation(v);
  return `Workstation ${WORKSTATION_ID} is under Internal Assurance review following network isolation${last ? ` ${last.ref}` : ''}. Activity at this workstation is reviewed in full.`;
}
