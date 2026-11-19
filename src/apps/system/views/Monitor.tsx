/**
 * System monitor: hub link states, workstation services, session and clearance, print queue.
 * Every status is derived from live shell state or canon; nothing is raised for effect.
 */
import { useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import type { CalendarEvent, Compartment } from '@core/canon-types';
import canon from '@canon';
import { WORKSTATION_ID } from '@core/audit';
import { handheldActive, printQueue } from '@core/services';
import * as session from '@core/session';
import { DataTable, GroupBox, PropertyGrid, StatusLight, Tabs, formatOscDate, type Column, type OperStatus } from '@design/index';
import { EmptyPrintQueue } from '@graphics/states';
import { hubLinks, sessionElapsed } from '@shell/Taskbar';
import { windows } from '@shell/wm';
import { RefusalState } from '@shell/adapters';
import { useSys } from '../ctx';
import { divisionLabel, PRINT_PURGE_MS, eventState, formatDuration, printJobs, sortEvents, zuluOf, type PrintJob } from '../logic';
import { RouteLink } from './RouteLink';
import { WithRecord } from './WithRecord';

const C = canon as unknown as {
  meta: { environment: string; release: string; agency: string };
  calendar: CalendarEvent[];
  compartments: Compartment[];
  operator: { compartments: string[] };
  divisions: { id: string; name: string }[];
};
const LINK_WORK = sortEvents(C.calendar.filter((e) => e.category === 'IT'));
/** Print queue for this workstation, named as the audit trail names it. */
const QUEUE = `PRN-${WORKSTATION_ID.slice(0, 6).replace(/-+$/, '')}`;
const loadedAt = typeof performance !== 'undefined' ? performance.timeOrigin : Date.now();

export function Monitor({ entry }: { entry: RouteEntry | null }) {
  return (
    <WithRecord entry={entry} label="Monitor">
      <MonitorPanel />
    </WithRecord>
  );
}

function MonitorPanel() {
  const [tab, setTab] = useState('links');
  return (
    <div class="sys-fill sys-monitor">
      <Tabs
        label="Monitor sections"
        panel="surface"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'links', label: 'Links' },
          { id: 'services', label: 'Services' },
          { id: 'session', label: 'Session and clearance' },
          { id: 'print', label: 'Print queue' },
        ]}
      >
        {tab === 'links' ? <Links /> : tab === 'services' ? <ServicesTab /> : tab === 'session' ? <SessionTab /> : <PrintTab />}
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ links */

interface LinkRow {
  id: string;
  state: string;
  note: string;
}

function Links() {
  const { services } = useSys();
  // Tier 4: hub link states name the other facilities; the operator sees its own site only.
  if (services.account.def.value.tier === 4) {
    return (
      <RefusalState
        authority="Communications Security, Office of Internal Assurance"
        reference="DIR-0301"
        requirement="Tier 3"
        reason="Requires Tier 3 access determination. Hub link states are not displayed to this operator."
      />
    );
  }
  const now = session.tick.value;
  const d = new Date(now);
  const today = session.inWorldDate(d).toISOString().slice(0, 10);
  const nowMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const rows: LinkRow[] = hubLinks(now);
  const st = (s: string): OperStatus => (s === 'DEGRADED' || s === 'BUSY' ? 'DEGRADED' : 'NOMINAL');
  const cols: Column<LinkRow>[] = [
    { key: 'id', header: 'Hub', width: 100, mono: true },
    { key: 'state', header: 'Link state', width: 130, render: (r) => <StatusLight status={st(r.state)} word={r.state} /> },
    { key: 'note', header: 'Detail' },
  ];
  type WorkRow = CalendarEvent & { state: string };
  const work: WorkRow[] = LINK_WORK.map((e) => ({ ...e, state: eventState(e, today, nowMin) }));
  const wcols: Column<WorkRow>[] = [
    { key: 'date', header: 'Date', width: 96, mono: true, render: (e) => formatOscDate(e.date) },
    { key: 'timeText', header: 'Time', width: 260, wrap: true },
    { key: 'facility', header: 'Site', width: 80, mono: true },
    { key: 'title', header: 'Work', wrap: true },
    { key: 'state', header: 'State', width: 120 },
  ];
  return (
    <div class="sys-pad">
      <p class="sys-note">
        Quantum-key links from {session.site.value} to each ALPHA hub. Each remote link re-keys for three minutes in every hour and reports DEGRADED while it does; controlled mail is
        queued, not lost.
      </p>
      <DataTable<LinkRow> label="Hub link state" columns={cols} rows={rows} rowKey={(r) => r.id} dense />
      <h3 class="sys-h">Scheduled network and print work, MAY 2008</h3>
      <DataTable<WorkRow> label="Scheduled link work" columns={wcols} rows={work} rowKey={(e) => e.id} dense wrap />
    </div>
  );
}

/* --------------------------------------------------------------- services */

interface SvcRow {
  name: string;
  status: OperStatus;
  word: string;
  detail: string;
}

function ServicesTab() {
  const { services, narrow } = useSys();
  const entries = services.audit.entries.value;
  const last = entries[entries.length - 1];
  const jobs = printQueue.value;
  const delivered = services.mail.delivered.value.length;
  const unread = services.mail.unread.value;
  const lockMin = Math.round(session.IDLE_TIMEOUT_MS / 60000);
  const routes = services.docs.all().length;
  const rows: SvcRow[] = [
    { name: 'Directory service', status: 'NOMINAL', word: 'RUNNING', detail: `${routes} routes registered in the workstation image` },
    { name: 'Document store', status: 'NOMINAL', word: 'RUNNING', detail: 'Record copies served from the workstation image; releases applied on display' },
    { name: 'Index service', status: 'NOMINAL', word: 'RUNNING', detail: 'Compiled index over baseline text; withheld text is not indexed' },
    { name: 'Message transfer', status: 'NOMINAL', word: 'RUNNING', detail: `${delivered} delivered to this mailbox, ${unread} unread` },
    { name: 'Print spooler', status: 'NOMINAL', word: jobs ? 'BUSY' : 'IDLE', detail: `${jobs} ${jobs === 1 ? 'job' : 'jobs'} spooling to ${QUEUE}` },
    {
      name: 'Audit recorder',
      status: 'NOMINAL',
      word: 'RECORDING',
      detail: `${entries.length} entries held at this workstation${last ? `; last ${zuluOf(last.at)} (${last.kind})` : ''}`,
    },
    { name: 'Session lock', status: 'NOMINAL', word: 'ARMED', detail: `Locks after ${lockMin} minutes without input` },
  ];
  const cols: Column<SvcRow>[] = [
    { key: 'name', header: 'Service', width: narrow ? 96 : 150, wrap: true },
    { key: 'word', header: 'State', width: narrow ? 104 : 120, render: (r) => <StatusLight status={r.status} word={r.word} /> },
    { key: 'detail', header: 'Detail', wrap: true },
  ];
  const d = new Date(session.tick.value);
  return (
    <div class="sys-pad">
      <GroupBox title="Workstation" on="surface">
        <PropertyGrid
          columns={narrow ? 1 : 2}
          rows={[
            { label: 'Workstation', value: WORKSTATION_ID, mono: true },
            { label: 'Environment', value: `${C.meta.environment}, release ${C.meta.release}` },
            { label: 'Site', value: session.site.value, mono: true },
            { label: 'Workstation up', value: formatDuration(session.tick.value - loadedAt), mono: true },
            { label: 'Layout', value: handheldActive.value ? 'Field handheld' : 'Desktop' },
            { label: 'Open windows', value: String(windows.value.length), mono: true },
            { label: 'Display', value: typeof screen !== 'undefined' ? `${screen.width} x ${screen.height}` : 'Not reported', mono: true },
            { label: 'Time', value: `${session.zulu(d)} (${session.siteLocal(d)}) ${session.formatInWorldDate(d)}`, mono: true },
          ]}
        />
      </GroupBox>
      <h3 class="sys-h">Services</h3>
      <DataTable<SvcRow> label="Workstation services" columns={cols} rows={rows} rowKey={(r) => r.name} dense wrap />
    </div>
  );
}

/* ---------------------------------------------------------------- session */

interface CompRow {
  id: string;
  scope: string;
  briefing: string;
  recorded: string;
}

function SessionTab() {
  const { services, entryFor, narrow } = useSys();
  const s = services.session;
  const now = session.tick.value;
  const tier = s.tier.value;
  const acting = s.actingTier2.value;
  const held = s.compartments.value;
  const entries = services.audit.entries.value;
  const at = session.loginAt.value;
  const def = services.account.def.value;
  const div = divisionLabel(def.divisionId, C.divisions);
  const onIssue = def.compartments as string[];
  const determination = acting ? `Tier ${tier} (acting)` : held.some((id) => !onIssue.includes(id)) ? `Tier ${tier} with compartments` : `Tier ${tier} baseline`;

  const rows: CompRow[] = held.map((id) => {
    const c = C.compartments.find((x) => x.id === id);
    const grant = [...entries].reverse().find((e) => e.kind === 'clearance.grant' && e.subject === id);
    return {
      id,
      scope: c?.scope ?? '',
      briefing: c?.briefingDocNo ?? '',
      recorded: onIssue.includes(id) ? 'On posting' : grant ? `${formatOscDate(grant.at)} ${zuluOf(grant.at)}` : 'Recorded',
    };
  });
  const cols: Column<CompRow>[] = [
    { key: 'id', header: 'Compartment', width: narrow ? 90 : 110, mono: true },
    { key: 'scope', header: 'Scope', wrap: true },
    {
      key: 'briefing',
      header: 'Briefing',
      width: 110,
      mono: true,
      render: (r) => {
        const e = r.briefing ? entryFor(services.docs.byDocNo(r.briefing)?.route ?? '') : undefined;
        return e ? <RouteLink path={e.route} go={(p) => services.openRoute(p)}>{r.briefing}</RouteLink> : r.briefing;
      },
    },
    ...(narrow ? [] : [{ key: 'recorded', header: 'Recorded', width: 140 }]),
  ];

  return (
    <div class="sys-pad">
      <GroupBox title="Session" on="surface">
        <PropertyGrid
          columns={narrow ? 1 : 2}
          rows={[
            { label: 'Operator ID', value: s.operatorId.value, mono: true },
            { label: 'Designation', value: def.displayName || session.displayName.value || 'Not recorded' },
            { label: 'Post', value: def.roleTitle || 'Not recorded' },
            { label: 'Site', value: `${def.site}, ${div}` },
            { label: 'Tier on issue', value: `Tier ${def.tier}` },
            // No probation row for a credential not on probation (probationStart null).
            ...(def.probationStart ? [{ label: 'Probation', value: `Day ${s.probationDay.value} of ${session.PROBATION_LENGTH_DAYS}` }] : []),
            { label: 'Mailbox', value: def.email, mono: true },
            { label: 'Signed on', value: at ? `${session.zulu(new Date(at))} (${session.siteLocal(new Date(at))})` : 'Not signed on', mono: true },
            { label: 'Session time', value: sessionElapsed(now), mono: true },
          ]}
        />
      </GroupBox>
      <GroupBox title="Clearance" on="surface">
        <PropertyGrid
          columns={narrow ? 1 : 2}
          rows={[
            { label: 'Effective tier', value: `Tier ${tier}` },
            { label: 'Access determination', value: determination },
            { label: 'Compartments held', value: String(held.length), mono: true },
            { label: 'Approval authority', value: def.approves.length ? def.approves.join(', ') : 'None' },
            { label: 'Audit review', value: def.auditReader ? 'Office of Internal Assurance (read-only)' : 'No' },
            { label: 'Tier 1 material', value: 'Not releasable to this workstation' },
          ]}
        />
      </GroupBox>
      <h3 class="sys-h">Compartments held</h3>
      <DataTable<CompRow> label="Compartments held" columns={cols} rows={rows} rowKey={(r) => r.id} dense wrap empty={<p class="sys-dim sys-pad">No compartments are held.</p>} />
    </div>
  );
}

/* ------------------------------------------------------------------ print */

function PrintTab() {
  const { services } = useSys();
  const tickNow = session.tick.value;
  const jobs = printJobs(services.audit.entries.value, session.inWorldIso(new Date(tickNow)), printQueue.value);
  const cols: Column<PrintJob>[] = [
    { key: 'job', header: 'Job', width: 80, mono: true },
    { key: 'docNo', header: 'Document', mono: true },
    { key: 'at', header: 'Submitted', width: 90, mono: true, render: (j) => zuluOf(j.at) },
    { key: 'state', header: 'State', width: 130, render: (j) => <StatusLight status="NOMINAL" word={j.state} /> },
  ];
  return (
    <div class="sys-pad sys-fill">
      <p class="sys-note">
        Queue {QUEUE}. Jobs are released at the device with your token. Jobs not collected are purged after {PRINT_PURGE_MS / 3600000} hours (OSC-DIR-0319).
      </p>
      {jobs.length ? (
        <DataTable<PrintJob> label="Print queue" columns={cols} rows={jobs} rowKey={(j) => j.job} dense />
      ) : (
        <EmptyPrintQueue device={QUEUE} />
      )}
    </div>
  );
}
