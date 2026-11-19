/**
 * End to end with the real Services: a message the engine delivers is stamped
 * with the in-world date and time at the moment of delivery, on the same clock
 * as the taskbar (session.formatInWorldDate / session.zulu).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatInWorldDate, zulu } from '@core/session';

describe('delivery stamp', () => {
  afterEach(() => vi.useRealTimers());

  it('mail.meta.at is the session clock at delivery, not the content date', async () => {
    const { services } = await import('@core/services');
    const { createRuntime } = await import('./runtime');
    await (await import('@core/audit')).initAudit(); // audit publishes to subscribers once ready
    let now = new Date(2026, 10, 19, 21, 7, 30).getTime(); // 19 NOV local evening -> 19 MAY in-world
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const rt = await createRuntime(services, {
      load: async () => null,
      save: () => undefined,
      now: () => now,
      every: () => () => undefined,
    });
    services.audit.log('login', 'OPR-A03-1147');
    services.audit.log('doc.read', 'OSC-DIR-0412');
    now += 47 * 60_000;
    vi.setSystemTime(now);
    services.audit.log('terminal.cmd', 'wo FE-08-0417');
    const meta = services.mail.meta.peek()['msg-08-04484']!;
    const at = new Date(now);
    // DTG the mail app renders: DDHHMMZ MON YY from meta.at
    expect(meta.at.slice(0, 10)).toBe(`2008-05-${formatInWorldDate(at).slice(0, 2)}`);
    expect(meta.at.slice(11, 16).replace(':', '') + 'Z').toBe(zulu(at));
    expect(meta.slots?.date).toBe(formatInWorldDate(at));
    rt.stop();
  });
});
