/** Incident queue and ticket detail (OIA-YY-NNN tickets). */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { AuditEntry, DocJson, RouteEntry } from '@core/contracts';
import { useServices } from '@core/services';
import { WORKSTATION_ID } from '@core/audit';
import { Button, DataTable, GroupBox, PropertyGrid, Select, Tabs, formatOscDate, type Column } from '@design/index';
import { EmptyState } from '@graphics/states';
import { accessLogRows, accessRecord, accessionsIn, appendRowsAfterHeading, actionLabel, auditDate, auditRef, auditTime, normalizeFields, ticketFields, ticketSubject, WORKLOG_HEADING, type TicketFields } from './logic';
import { DocBody, RouteRefusal, RxText, canRead, canon, markingOf, useDoc, useGridCols, type DocState } from './shared';

/* ---------------------------------------------------------------- queue */

interface QueueRow {
  entry: RouteEntry;
  readable: boolean;
  fields: TicketFields | null;
}

export type QueueFilter = 'open' | 'all';

export function IncidentQueue({
  tickets,
  selected,
  onSelect,
  onOpen,
  filter,
  onFilter,
}: {
  tickets: RouteEntry[];
  selected: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  filter: QueueFilter;
  onFilter: (f: QueueFilter) => void;
}) {
  const services = useServices();
  const [fields, setFields] = useState<Record<string, TicketFields>>({});
  useEffect(() => {
    let live = true;
    for (const t of tickets) {
      if (!canRead(services, t)) continue;
      services.docs
        .load(t.id)
        .then((d) => live && setFields((f) => ({ ...f, [t.id]: ticketFields(normalizeFields(d.frontmatter.fields)) })))
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [tickets.map((t) => t.id).join(',')]);

  const rows: QueueRow[] = tickets
    .map((entry) => ({ entry, readable: canRead(services, entry), fields: fields[entry.id] ?? null }))
    .filter((r) => filter === 'all' || !r.fields?.status || !/closed|resolved/i.test(r.fields.status));

  const cols: Column<QueueRow>[] = [
    { key: 'no', header: 'Ticket', width: 92, mono: true, sortValue: (r) => r.entry.docNo, render: (r) => r.entry.docNo },
    { key: 'status', header: 'Status', width: 70, sortValue: (r) => r.fields?.status ?? '', render: (r) => (r.readable ? <span class="asr-caps">{r.fields?.status ?? ''}</span> : 'Withheld') },
    { key: 'subject', header: 'Subject', wrap: true, sortValue: (r) => ticketSubject(r.entry), render: (r) => ticketSubject(r.entry) },
    { key: 'sev', header: 'Severity', width: 140, wrap: true, sortValue: (r) => r.fields?.severity ?? '', render: (r) => r.fields?.severity ?? '' },
    { key: 'opened', header: 'Opened', width: 140, mono: true, wrap: true, sortValue: (r) => r.fields?.opened ?? '', render: (r) => r.fields?.opened ?? '' },
    { key: 'officer', header: 'Action officer', width: 100, wrap: true, sortValue: (r) => r.fields?.officer ?? '', render: (r) => r.fields?.officer ?? '' },
    { key: 'susp', header: 'Suspense', width: 96, mono: true, sortValue: (r) => r.fields?.suspense ?? '', render: (r) => r.fields?.suspense ?? '' },
    { key: 'mk', header: 'Marking', width: 140, wrap: true, render: (r) => markingOf(r.entry.marking)?.label ?? r.entry.marking },
  ];

  return (
    <div class="asr-view">
      <div class="asr-viewhead">
        <div>
          <div class="asr-h1">Incident queue</div>
          <div class="asr-sub">Security incidents recorded by the Office of Internal Assurance and visible at this operator's access determination.</div>
        </div>
        <div class="asr-filter">
          <Select
            label="Show"
            value={filter}
            onChange={(v) => onFilter(v === 'all' ? 'all' : 'open')}
            options={[
              { value: 'open', label: 'Open tickets' },
              { value: 'all', label: 'All tickets' },
            ]}
          />
        </div>
      </div>
      <DataTable
        flexMin={180}
        label="Incident tickets"
        columns={cols}
        rows={rows}
        rowKey={(r) => r.entry.id}
        selection="single"
        selected={selected ? [selected] : []}
        onSelectionChange={(k) => k[0] && onSelect(k[0])}
        onActivate={(r) => onOpen(r.entry.id)}
        defaultSort={{ key: 'no', dir: 'desc' }}
        empty={<EmptyState title="No tickets in this queue" body="No incident tickets match the selected filter." icon="tray" />}
      />
      <div class="asr-hint">Select a ticket and press Enter, or double-click it, to open the ticket.</div>
    </div>
  );
}

/* --------------------------------------------------------------- ticket */

type TicketTab = 'ticket' | 'worklog' | 'access';

/** Sections of a document whose headings match WORKLOG_HEADING, as an HTML fragment. */
export function worklogHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const body = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body.firstElementChild;
  if (!body) return '';
  const out: string[] = [];
  let level = 0;
  for (const el of Array.from(body.children)) {
    const m = /^H([1-6])$/.exec(el.tagName);
    if (m) {
      const lv = Number(m[1]);
      if (level && lv <= level) level = 0;
      if (!level && WORKLOG_HEADING.test(el.textContent ?? '')) level = lv;
    }
    if (level) out.push(el.outerHTML);
  }
  return out.join('\n');
}

export function TicketView({ entry, onBack, onRefuseEdit }: { entry: RouteEntry; onBack: () => void; onRefuseEdit: () => void }) {
  const services = useServices();
  if (!canRead(services, entry)) return <RouteRefusal entry={entry} />;
  return <TicketBody entry={entry} onBack={onBack} onRefuseEdit={onRefuseEdit} />;
}

function TicketBody({ entry, onBack, onRefuseEdit }: { entry: RouteEntry; onBack: () => void; onRefuseEdit: () => void }) {
  const services = useServices();
  const gridCols = useGridCols();
  const state = useDoc(entry);
  const [tab, setTab] = useState<TicketTab>('ticket');
  const doc = state.status === 'ready' ? state.doc : null;
  const f = doc ? ticketFields(normalizeFields(doc.frontmatter.fields)) : {};
  const all = services.audit.entries.value;

  const terms = useMemo(() => termsFor(entry, doc, services.docs.byDocNo), [entry.id, doc]);
  const record = useMemo(() => accessRecord(all, terms).slice().reverse(), [all, terms]);
  const worklog = useMemo(() => (doc ? worklogHtml(doc.html) : ''), [doc]);
  const worklogDoc: DocState | null = doc && worklog ? { status: 'ready', doc: { ...doc, html: worklog, frontmatter: {}, xrefs: [], distribution: undefined } } : null;
  // The ticket's access log, with this operator's own recorded access appended in the log's columns.
  const ticketState: DocState = useMemo(() => {
    if (!doc) return state;
    const accessions = terms.filter((t) => t.startsWith('RD-ACC-'));
    const items = terms.filter((t) => t !== entry.docNo && !t.startsWith('RD-ACC-'));
    const own = accessLogRows(all, {
      ticket: entry.docNo,
      items,
      accessions,
      workstation: WORKSTATION_ID,
      operator: `${services.session.operatorId.value} (${canon.operator.pn})`,
    });
    return { status: 'ready', doc: { ...doc, html: appendRowsAfterHeading(doc.html, 'access-log', own) } };
  }, [doc, all, terms]);

  const lines: [string, string | undefined, boolean?][] = [
    ['Ticket', entry.docNo, true],
    ['Status', f.status],
    ['Severity', f.severity],
    ['Opened', f.opened, true],
    ['Action officer', f.officer],
    ['Suspense', f.suspense, true],
    ['Reported by', f.reportedBy],
    ['Originator', entry.originator, true],
    ['Revision', `${entry.revision} of ${formatOscDate(entry.date)}`],
    ['Marking', markingOf(entry.marking)?.label ?? entry.marking],
  ];
  const rows = lines.filter((l): l is [string, string, boolean?] => !!l[1]).map(([label, value, mono]) => ({ label, value: <RxText text={value} docNo={entry.docNo} />, mono }));

  return (
    <div class="asr-view">
      <div class="asr-viewhead">
        <div>
          <div class="asr-h1 asr-mono">{entry.docNo}</div>
          <div class="asr-sub">{ticketSubject(entry)}</div>
        </div>
        <div class="asr-btns">
          <Button label="&Queue" onClick={onBack} />
          <Button label="Records &Library" onClick={() => services.openRoute(entry.route)} />
          <Button label="&Print" onClick={() => services.print(entry.id)} />
          <Button label="Add &worklog entry..." onClick={onRefuseEdit} />
        </div>
      </div>
      <GroupBox title="Ticket record" on="surface">
        <PropertyGrid rows={rows} columns={gridCols} />
        {doc && doc.xrefs.length > 0 && (
          <div class="asr-related">
            <span class="asr-label">Related</span>
            {doc.xrefs.map((x) => (
              <a
                key={x.docNo}
                href={x.route}
                onClick={(e) => {
                  if (e.button !== 0 || e.ctrlKey || e.shiftKey || e.metaKey) return;
                  e.preventDefault();
                  services.openRoute(x.route);
                }}
                title={x.title}
              >
                {x.docNo}
              </a>
            ))}
          </div>
        )}
      </GroupBox>
      <Tabs
        label="Ticket sections"
        active={tab}
        onChange={(t) => setTab(t as TicketTab)}
        panel="surface"
        tabs={[
          { id: 'ticket', label: '&Ticket' },
          { id: 'worklog', label: 'Wor&klog' },
          { id: 'access', label: `&Access record (${record.length})` },
        ]}
      >
        {tab === 'ticket' && <DocBody state={ticketState} entry={entry} />}
        {tab === 'worklog' &&
          (worklogDoc ? (
            <DocBody state={worklogDoc} entry={entry} bare />
          ) : state.status === 'loading' ? (
            <div class="asr-loading">Retrieving {entry.docNo} from the records server...</div>
          ) : (
            <EmptyState title="No worklog entries released" body={`Worklog entries on ${entry.docNo} are not released to this operator's access determination.`} icon="folder" />
          ))}
        {tab === 'access' && <AccessRecord entries={record} ticket={entry.docNo} terms={terms} />}
      </Tabs>
    </div>
  );
}

/** Ticket number, the documents it references at EYES ONLY, and any accession numbers in its title. */
function termsFor(entry: RouteEntry, doc: DocJson | null, byDocNo: (d: string) => RouteEntry | undefined): string[] {
  const t = new Set<string>([entry.docNo, ...accessionsIn(entry.title)]);
  if (doc) {
    for (const a of accessionsIn(`${doc.title} ${doc.summary}`)) t.add(a);
    const top = [...canon.markings].sort((a, b) => b.rank - a.rank)[0]?.id;
    for (const x of doc.xrefs) if (byDocNo(x.docNo)?.marking === top) t.add(x.docNo);
  }
  return [...t];
}

function AccessRecord({ entries, ticket, terms }: { entries: AuditEntry[]; ticket: string; terms: string[] }) {
  const services = useServices();
  const cols: Column<AuditEntry>[] = [
    { key: 'ref', header: 'Audit reference', width: 136, mono: true, render: (e) => auditRef(e) },
    { key: 'date', header: 'Date', width: 90, mono: true, render: (e) => auditDate(e.at) },
    { key: 'time', header: 'Time', width: 120, mono: true, render: (e) => auditTime(e.at) },
    { key: 'ws', header: 'Workstation', width: 110, mono: true, render: () => WORKSTATION_ID },
    { key: 'op', header: 'Operator', width: 90, mono: true, render: () => services.session.operatorId.value },
    { key: 'act', header: 'Action', width: 150, render: (e) => actionLabel(e) },
    { key: 'subj', header: 'Item', width: 120, mono: true, render: (e) => e.subject },
  ];
  return (
    <div class="asr-pad">
      <p class="asr-note">
        Access to {ticket} and to the items it concerns ({terms.filter((t) => t !== ticket).join(', ') || 'none named'}) is recorded against the ticket from the workstation audit trail. Entries shown are those made from
        this workstation.
      </p>
      <DataTable
        label={`Access record for ${ticket}`}
        columns={cols}
        rows={entries}
        rowKey={(e) => String(e.seq)}
        sortRows={false}
        dense
        empty={<EmptyState title="No access recorded from this workstation" body={`No access to ${ticket} or the items it concerns has been recorded from ${WORKSTATION_ID}.`} icon="tray" />}
      />
    </div>
  );
}
