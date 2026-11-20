/** Facility calendar, MAY 2008, from canon.calendar, filtered by tier. */
import type { TargetedKeyboardEvent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import type { CalendarEvent } from '@core/canon-types';
import canon from '@canon';
import * as session from '@core/session';
import { DataTable, Redaction, Toolbar, ToolbarButton, ToolbarLabel, ToolbarSeparator, formatOscDate, type Column } from '@design/index';
import { useSys } from '../ctx';
import { eventReleased, eventState, monthGrid, sortEvents } from '../logic';
import { WithRecord } from './WithRecord';

const EVENTS = sortEvents((canon as unknown as { calendar: CalendarEvent[] }).calendar);
const GRID = monthGrid(2008, 5);
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FACILITIES = [...new Set(EVENTS.map((e) => e.facility))].sort();
const RX_AUTH = 'Classification Control';
const RX_REF = 'OSC-ASR-CG';

export function Calendar({ entry }: { entry: RouteEntry | null }) {
  return (
    <WithRecord entry={entry} label="Calendar">
      <CalendarPanel docNo={entry?.docNo ?? 'OSC-SYS-CAL'} />
    </WithRecord>
  );
}

function CalendarPanel({ docNo }: { docNo: string }) {
  const { services, say } = useSys();
  const tier = services.session.tier.value;
  const now = new Date(session.tick.value);
  const today = session.inWorldDate(now).toISOString().slice(0, 10);
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [mode, setMode] = useState<'month' | 'list'>('month');
  const [site, setSite] = useState('');
  const [cat, setCat] = useState('');
  const [day, setDay] = useState(today);
  const gridRef = useRef<HTMLDivElement>(null);

  // Tier 4: the operator's own site only (a Tier 4 view names no other facility, DIR-0301).
  const own = services.account.def.value;
  const pool = useMemo(() => (own.tier === 4 ? EVENTS.filter((e) => e.facility === own.site) : EVENTS), [own.id]);
  const facilities = useMemo(() => (own.tier === 4 ? [own.site] : FACILITIES), [own.id]);
  const shown = useMemo(() => pool.filter((e) => (!site || e.facility === site) && (!cat || e.category === cat)), [site, cat, pool]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of shown) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [shown]);
  const categories = useMemo(() => [...new Set(pool.filter((e) => eventReleased(e, tier)).map((e) => e.category))].sort(), [tier, pool]);
  const withheld = shown.filter((e) => !eventReleased(e, tier)).length;

  useEffect(() => {
    say(`${shown.length} events${site || cat ? ' match the filter' : ' in MAY 2008'}${withheld ? `; ${withheld} withheld at Tier ${tier}` : ''}.`);
  }, [shown.length, withheld, tier, site, cat]);

  const hover = () => services.audit.log('redaction.hover', docNo);
  const title = (e: CalendarEvent) =>
    eventReleased(e, tier) ? e.title : <Redaction len={e.title.length} auth={RX_AUTH} reference={RX_REF} onHover={hover} />;

  const field = (e: CalendarEvent, v: string) => (eventReleased(e, tier) ? v : <Redaction len={v.length} auth={RX_AUTH} reference={RX_REF} onHover={hover} />);

  const moveDay = (delta: number) => {
    const d = new Date(Date.parse(day + 'T00:00:00Z') + delta * 86400000);
    if (d.getUTCMonth() !== 4) return;
    const iso = d.toISOString().slice(0, 10);
    setDay(iso);
    setTimeout(() => gridRef.current?.querySelector<HTMLElement>(`[data-day="${iso}"]`)?.focus(), 0);
  };

  const onGridKey = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      moveDay(step);
    }
  };

  const cols: Column<CalendarEvent>[] = [
    { key: 'date', header: 'Date', width: 96, mono: true, sortable: true, render: (e) => formatOscDate(e.date) },
    { key: 'timeText', header: 'Time (Zulu, site-local)', width: 250, wrap: true },
    { key: 'facility', header: 'Site', width: 80, mono: true, sortable: true },
    { key: 'title', header: 'Event', wrap: true, render: title, sortValue: (e) => (eventReleased(e, tier) ? e.title : '') },
    { key: 'category', header: 'Category', width: 100, sortable: true, render: (e) => field(e, e.category), sortValue: (e) => (eventReleased(e, tier) ? e.category : '') },
    { key: 'originator', header: 'Originator', width: 100, mono: true, render: (e) => field(e, e.originator) },
  ];

  const dayEvents = byDay.get(day) ?? [];

  return (
    <div class="sys-fill sys-cal">
      <Toolbar label="Calendar">
        <ToolbarButton label="Month" pressed={mode === 'month'} onClick={() => setMode('month')} />
        <ToolbarButton label="List" pressed={mode === 'list'} onClick={() => setMode('list')} />
        <ToolbarButton label="Today" title={formatOscDate(today)} onClick={() => setDay(today)} />
        <ToolbarSeparator />
        <ToolbarLabel>Site</ToolbarLabel>
        <select class="sys-select toolbar__focusable" aria-label="Site" value={site} onChange={(e) => setSite((e.target as HTMLSelectElement).value)}>
          <option value="">All sites</option>
          {facilities.map((f) => (
            <option key={f} value={f}>
              {f}
              {f === session.site.value ? ' (this site)' : ''}
            </option>
          ))}
        </select>
        <ToolbarLabel>Category</ToolbarLabel>
        <select class="sys-select toolbar__focusable" aria-label="Category" value={cat} onChange={(e) => setCat((e.target as HTMLSelectElement).value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Toolbar>

      {mode === 'list' ? (
        <div class="sys-pad sys-fill">
          <DataTable<CalendarEvent>
            label="Calendar events"
            columns={cols}
            rows={shown}
            rowKey={(e) => e.id}
            selection="single"
            selected={[]}
            onActivate={(e) => {
              setDay(e.date);
              setMode('month');
            }}
            dense
            wrap
            empty={<p class="sys-dim sys-pad">No events match the filter.</p>}
          />
        </div>
      ) : (
        <div class="sys-cal__month">
          <div class="sys-cal__grid" ref={gridRef} role="grid" aria-label="MAY 2008" onKeyDown={onGridKey}>
            <div class="sys-cal__caption">MAY 2008</div>
            <div class="sys-cal__row sys-cal__head" role="row">
              {DOW.map((d) => (
                <div key={d} role="columnheader" class="sys-cal__dow">
                  {d}
                </div>
              ))}
            </div>
            {GRID.map((week, wi) => (
              <div class="sys-cal__row" role="row" key={wi}>
                {week.map((c) => {
                  const evs = c.inMonth ? byDay.get(c.iso) ?? [] : [];
                  return (
                    <div role="gridcell" key={c.iso} class="sys-cal__cell" aria-selected={c.iso === day}>
                      {c.inMonth ? (
                        <button
                          type="button"
                          class="sys-cal__day"
                          data-day={c.iso}
                          data-today={c.iso === today ? 'true' : undefined}
                          tabIndex={c.iso === day ? 0 : -1}
                          aria-label={`${formatOscDate(c.iso)}${c.iso === today ? ', today' : ''}, ${evs.length} ${evs.length === 1 ? 'event' : 'events'}`}
                          onClick={() => setDay(c.iso)}
                        >
                          <span class="sys-cal__num">
                            {c.day}
                            {c.iso === today ? <span class="sys-cal__today">TODAY</span> : null}
                          </span>
                          {evs.slice(0, 3).map((e) => (
                            <span key={e.id} class="sys-cal__ev">
                              {eventReleased(e, tier) ? (
                                <>
                                  <span class="mono">{e.startZ ?? '----'}</span> {e.title}
                                </>
                              ) : (
                                <>
                                  <span class="mono">{e.startZ ?? '----'}</span> <span class="sys-cal__bar" aria-label="Withheld" />
                                </>
                              )}
                            </span>
                          ))}
                          {evs.length ? <span class="sys-cal__count" aria-hidden="true">{evs.length}</span> : null}
                          {evs.length > 3 ? <span class="sys-cal__more">{evs.length - 3} more</span> : null}
                        </button>
                      ) : (
                        <span class="sys-cal__out" aria-hidden="true">
                          {c.day}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <section class="sys-cal__detail" aria-label={`Events for ${formatOscDate(day)}`}>
            <h3 class="sys-h">
              {formatOscDate(day)}
              {day === today ? ' (today)' : ''}
            </h3>
            {dayEvents.length ? (
              <ul class="sys-cal__list">
                {dayEvents.map((e) => {
                  return (
                    <li key={e.id}>
                      <div class="sys-cal__etitle">{title(e)}</div>
                      <table class="sys-kv">
                        <tbody>
                          <tr>
                            <th scope="row">Time</th>
                            <td class="mono">{e.timeText}</td>
                          </tr>
                          <tr>
                            <th scope="row">Site</th>
                            <td class="mono">{e.facility}</td>
                          </tr>
                          <tr>
                            <th scope="row">Category</th>
                            <td>{field(e, e.category)}</td>
                          </tr>
                          <tr>
                            <th scope="row">Originator</th>
                            <td class="mono">{field(e, e.originator)}</td>
                          </tr>
                          <tr>
                            <th scope="row">State</th>
                            <td>{eventState(e, today, nowMin)}</td>
                          </tr>
                          {e.note ? (
                            <tr>
                              <th scope="row">Note</th>
                              <td>{eventReleased(e, tier) ? e.note : <Redaction block len={e.note.length} auth={RX_AUTH} reference={RX_REF} onHover={hover} />}</td>
                            </tr>
                          ) : null}
                          <tr>
                            <th scope="row">Entry</th>
                            <td class="mono">{e.id}</td>
                          </tr>
                        </tbody>
                      </table>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p class="sys-dim">No events entered{site || cat ? ' that match the filter' : ''}.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
