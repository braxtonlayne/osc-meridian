/**
 * Filer side of routed forms: consume `form.decided` traces returned to this account.
 *
 * An approved OSC-F-126 for a compartment designated approvable on request reads the filer
 * into it (an alternative unlock path to the pass-one narrative). Idempotent: the grant is a
 * no-op once held, and the trace is marked seen. Called by Forms and Message Traffic when they
 * open; integration may also call it on the `trace` audit line logged at sign-in.
 */
import type { Services, Trace } from '@core/contracts';
import { APPROVABLE_ON_REQUEST } from './routing';

/** Decisions addressed to this account (oldest first). */
export function myDecisions(services: Pick<Services, 'traces' | 'account'>): Trace[] {
  const me = services.account.id.peek();
  return services.traces.mine.peek().filter((t) => t.kind === 'form.decided' && t.to === me);
}

/** Apply every unseen decision. Returns the traces consumed. */
export function applyDecisions(services: Pick<Services, 'traces' | 'account' | 'clearance' | 'session'>): Trace[] {
  const me = services.account.id.peek();
  const done: Trace[] = [];
  for (const t of myDecisions(services)) {
    if ((t.seenBy ?? []).includes(me)) continue;
    const grant = (t.data?.grant ?? '').toUpperCase();
    // Tier 1 never; only the compartments read in on request; never one already held.
    if (t.data?.decision === 'approved' && APPROVABLE_ON_REQUEST.includes(grant) && services.session.tier.peek() !== 1 && !services.clearance.satisfies(grant)) {
      services.clearance.grant(
        grant as Parameters<Services['clearance']['grant']>[0],
        `Compartment access request ${t.data?.receipt ?? t.subject} approved by the ${t.data?._decidedRole || 'approving officer'} under OSC-DIR-0412 para 4(b).`,
      );
    }
    services.traces.markSeen(t.id);
    done.push(t);
  }
  return done;
}
