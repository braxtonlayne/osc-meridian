import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, Services } from '@core/contracts';
import {
  DataTable,
  MenuBar,
  ProgressBar,
  PropertyGrid,
  StatusBar,
  Tabs,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  formatOscDate,
  type Column,
  type MenuBarMenu,
  type SortState,
} from '@design/index';
import { Icon } from '@graphics/icons';
import { EmptyState } from '@graphics/states';
import { Chain, aboutNotice, highestMarking, numberingNotice, oprName, useNotice } from './common';
import { ensureLibrary, graph, library, pendingAnchor, statusByDocNo } from './library';
import { ackStateFor, lineage, matches, parseAcks, serialOf, shortNo, statusRank, supersedesText, zuluLocal, type AckRecord, type DirRow, type Filter } from './model';

type View = 'index' | 'chains' | 'acks';

/** Columns kept when the window is narrower than 640px (handheld). */
const NARROW_COLS = new Set(['number', 'title', 'effective']);

const SORTS: { key: string; label: string }[] = [
  { key: 'number', label: 'Sort by &number' },
  { key: 'opr', label: 'Sort by &OPR' },
  { key: 'effective', label: 'Sort by &effective date' },
  { key: 'status', label: 'Sort by &status' },
];

export function Home({ win, services }: AppProps & { services: Services }) {
  const [view, setView] = useState<View>('index');
  const [filter, setFilter] = useState<Filter>({ text: '', opr: '', status: '' });
  const [sort, setSort] = useState<SortState | null>({ key: 'number', dir: 'asc' });
  const [selected, setSelected] = useState<string[]>([]);
  const findRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { show, node: noticeNode } = useNotice(services);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => ensureLibrary(services), [services]);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = library.rows.value;
  const statuses = statusByDocNo.value;
  const g = graph.value;
  const acks = parseAcks(services.audit.entries.value);
  const loaded = library.loadedCount.value;
  const total = library.entries.value.length;
  const failedN = library.failed.value.length;

  const visible = useMemo(() => rows.filter((r) => matches(r, statuses[r.docNo] ?? 'CURRENT', filter)), [rows, statuses, filter]);
  const sel = rows.find((r) => r.docNo === selected[0]);
  const oprs = useMemo(() => [...new Set(rows.map((r) => r.opr))].sort(), [rows]);
  const statusList = useMemo(() => [...new Set(Object.values(statuses))].sort((a, b) => statusRank(a) - statusRank(b)), [statuses]);

  const counts = {
    current: rows.filter((r) => statuses[r.docNo] === 'CURRENT').length,
    superseded: rows.filter((r) => statuses[r.docNo] === 'SUPERSEDED').length,
    acked: rows.filter((r) => ackStateFor(r.docNo, r.revision, acks).kind === 'current').length,
  };

  useEffect(() => {
    win.setTitle('Directives Library', '');
    win.setMarking(highestMarking(visible.map((r) => r.marking), 'TSSCI-OSC'));
  }, [win, visible]);
  useEffect(() => {
    win.setStatus(total ? `${visible.length} of ${total} directives listed` : 'No directives held');
  }, [win, visible.length, total]);

  const open = (r: DirRow | undefined, anchor?: string) => {
    if (!r) {
      show({ title: 'Open directive', kind: 'info', body: <p>Select a directive in the index first.</p> });
      return;
    }
    if (anchor) pendingAnchor.value = { route: r.route, anchor };
    win.navigate(r.route);
  };
  const openNo = (docNo: string) => open(rows.find((r) => r.docNo === docNo));
  const print = () => {
    if (!sel) {
      show({ title: 'Print', kind: 'info', body: <p>Select a directive in the index, then choose Print. Each directive prints with its own cover sheet.</p> });
      return;
    }
    services.print(sel.id);
  };
  const copyNo = () => {
    if (!sel) {
      show({ title: 'Copy', kind: 'info', body: <p>Select a directive in the index first.</p> });
      return;
    }
    void navigator.clipboard?.writeText(sel.docNo).then(
      () => services.notify(`${sel.docNo} copied.`, { from: 'Directives' }),
      () => show({ title: 'Copy', kind: 'warning', body: <p>The clipboard is not available to this session. Document number: {sel.docNo}</p> }),
    );
  };
  const find = () => {
    setView('index');
    setTimeout(() => findRef.current?.focus(), 0);
  };
  const refresh = () => {
    ensureLibrary(services, true);
    services.notify('Directive index re-read from MERIDIAN Records.', { from: 'Directives' });
  };

  const nextOutstanding = () => {
    const order = [...rows].sort((a, b) => serialOf(a.docNo) - serialOf(b.docNo));
    const start = sel ? order.findIndex((r) => r.docNo === sel.docNo) + 1 : 0;
    const pick = [...order.slice(start), ...order.slice(0, start)].find(
      (r) => statuses[r.docNo] !== 'SUPERSEDED' && ackStateFor(r.docNo, r.revision, acks).kind !== 'current',
    );
    if (!pick) {
      show({ title: 'Acknowledgements', kind: 'info', body: <p>Every current directive held has an acknowledgement recorded for its current revision.</p> });
      return;
    }
    setView('index');
    setFilter({ text: '', opr: '', status: '' });
    setSelected([pick.docNo]);
  };

  const sortItems = SORTS.map((s) => ({
    label: s.label,
    radio: true,
    checked: sort?.key === s.key,
    onSelect: () => setSort({ key: s.key, dir: sort?.key === s.key && sort.dir === 'asc' ? 'desc' : 'asc' }),
  }));

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Open directive', shortcut: 'Enter', onSelect: () => open(sel), disabled: !sel },
        { label: '&Print directive...', shortcut: 'Ctrl+P', onSelect: print },
        { separator: true },
        { label: '&Refresh index', shortcut: 'F5', onSelect: refresh },
        { separator: true },
        { label: '&Close', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: 'Copy document &number', onSelect: copyNo },
        { label: '&Find in index', shortcut: 'Ctrl+F', onSelect: find },
        { label: '&Clear filter', onSelect: () => setFilter({ text: '', opr: '', status: '' }), disabled: !filter.text && !filter.opr && !filter.status },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Index', radio: true, checked: view === 'index', onSelect: () => setView('index') },
        { label: 'S&upersession', radio: true, checked: view === 'chains', onSelect: () => setView('chains') },
        { label: '&Acknowledgements', radio: true, checked: view === 'acks', onSelect: () => setView('acks') },
        { separator: true },
        ...sortItems,
      ],
    },
    {
      label: '&Directive',
      items: [
        { label: '&Acknowledge reading...', onSelect: () => open(sel, 'ack'), disabled: !sel },
        { label: 'Show &supersession', onSelect: () => setView('chains') },
        { label: '&Next not acknowledged', onSelect: nextOutstanding },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: 'Directive &numbering', onSelect: () => show(numberingNotice()) },
        { label: '&About Directives', onSelect: () => show(aboutNotice()) },
      ],
    },
  ];

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && !e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      print();
    } else if (e.ctrlKey && !e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      find();
    } else if (e.key === 'F5') {
      e.preventDefault();
      refresh();
    }
  };

  const columns: Column<DirRow>[] = [
    { key: 'number', header: 'Number', width: '11ch', mono: true, sortValue: (r) => serialOf(r.docNo), render: (r) => shortNo(r.docNo) },
    { key: 'title', header: 'Title', wrap: true, sortValue: (r) => r.title },
    {
      key: 'opr',
      header: 'OPR',
      width: '13ch',
      sortValue: (r) => `${r.opr} ${r.oprFull}`,
      render: (r) => <span title={oprName(r.opr)}>{r.oprFull}</span>,
    },
    { key: 'effective', header: 'Effective', width: '12ch', mono: true, sortValue: (r) => r.effective, render: (r) => formatOscDate(r.effective) },
    { key: 'rev', header: 'Rev', width: '5ch', align: 'right', mono: true, sortValue: (r) => r.revision, render: (r) => String(r.revision) },
    {
      key: 'status',
      header: 'Status',
      width: '17ch',
      sortValue: (r) => `${statusRank(statuses[r.docNo] ?? 'CURRENT')} ${String(serialOf(r.docNo)).padStart(5, '0')}`,
      render: (r) => {
        const st = statuses[r.docNo] ?? 'CURRENT';
        const by = g.get(r.docNo)?.supersededBy[0];
        return st === 'SUPERSEDED' && by ? `SUPERSEDED by ${shortNo(by)}` : st;
      },
    },
    {
      key: 'ack',
      header: 'Read',
      width: '15ch',
      sortValue: (r) => ackStateFor(r.docNo, r.revision, acks).kind,
      render: (r) => {
        const a = ackStateFor(r.docNo, r.revision, acks);
        return a.kind === 'current' ? 'Acknowledged' : a.kind === 'earlier' ? `Rev ${a.rec.revision} only` : 'Not acknowledged';
      },
    },
  ];

  const filterStrip = (
    <div class="dv-filter" role="search" aria-label="Filter directives">
      <span class="dv-inline">
        <label for="dv-find">Find</label>
        <input
          id="dv-find"
          ref={findRef}
          class="dv-input dv-input--find"
          type="search"
          value={filter.text}
          onInput={(e) => setFilter({ ...filter, text: e.currentTarget.value })}
          aria-describedby="dv-count"
        />
      </span>
      <span class="dv-inline">
        <label for="dv-opr">OPR</label>
        <select id="dv-opr" class="dv-input" value={filter.opr} onChange={(e) => setFilter({ ...filter, opr: e.currentTarget.value })}>
          <option value="">All offices</option>
          {oprs.map((o) => (
            <option key={o} value={o}>
              {o === oprName(o) ? o : `${o} - ${oprName(o)}`}
            </option>
          ))}
        </select>
      </span>
      <span class="dv-inline">
        <label for="dv-status">Status</label>
        <select id="dv-status" class="dv-input" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.currentTarget.value })}>
          <option value="">All</option>
          {statusList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </span>
      <span id="dv-count" class="dv-filter__count" aria-live="polite">
        {visible.length} of {total} listed
      </span>
    </div>
  );

  const index = (
    <div class="dv-index">
      {filterStrip}
      <div class="dv-index__table">
        <DataTable<DirRow>
          label="Directives"
          columns={narrow ? columns.filter((c) => NARROW_COLS.has(c.key)) : columns}
          rows={visible}
          rowKey={(r) => r.docNo}
          selection="single"
          selected={selected}
          onSelectionChange={setSelected}
          sort={sort}
          onSortChange={setSort}
          onActivate={(r) => open(r)}
          rowClass={(r) => (statuses[r.docNo] === 'SUPERSEDED' ? 'dv-row--superseded' : undefined)}
          dense
          empty={
            total ? (
              <EmptyState icon="search" title="No directive matches the filter" body="Change the text, office or status, or choose Edit, Clear filter." />
            ) : (
              <EmptyState icon="folder" title="No directives are held" body={services.session.tier.value === 4 ? "No directive in the series is issued to Tier 4 personnel at this site (DIR-0301)." : "The directive series is not loaded on this workstation."} />
            )
          }
        />
      </div>
      {sel ? (
        <div class="dv-preview" aria-label="Selected directive">
          <p class="dv-preview__summary">{library.docs.value[sel.id]?.summary ?? library.entries.value.find((e) => e.id === sel.id)?.summary}</p>
          <PropertyGrid
            columns={2}
            rows={[
              { label: 'Number', value: sel.docNo, mono: true },
              { label: 'Effective', value: formatOscDate(sel.effective), mono: true },
              { label: 'OPR', value: oprName(sel.opr) === sel.opr ? sel.oprFull : `${sel.oprFull} (${oprName(sel.opr)})` },
              { label: 'Revision', value: String(sel.revision), mono: true },
              { label: 'Supersedes', value: sel.supersedes.length ? sel.supersedes.map((p) => shortNo(p.docNo)).join(', ') : 'None', mono: true },
              {
                label: 'Status',
                value: (() => {
                  const st = statuses[sel.docNo] ?? 'CURRENT';
                  const by = g.get(sel.docNo)?.supersededBy[0];
                  return st === 'SUPERSEDED' && by ? `SUPERSEDED by ${shortNo(by)}` : st;
                })(),
              },
              ...(sel.category ? [{ label: 'Category', value: sel.category }] : []),
              ...(sel.certifiedCurrent ? [{ label: 'Certified current', value: formatOscDate(sel.certifiedCurrent), mono: true }] : []),
            ]}
          />
        </div>
      ) : null}
    </div>
  );

  const regCols: Column<DirRow>[] = [
    columns[0]!,
    columns[1]!,
    { key: 'rev', header: 'Rev', width: '5ch', align: 'right', mono: true, sortValue: (r) => r.revision, render: (r) => String(r.revision) },
    { key: 'first', header: 'First issue', width: '14ch', mono: true, sortValue: (r) => r.revisions[r.revisions.length - 1]?.date ?? '', render: (r) => formatOscDate(r.revisions.find((x) => x.rev === 1)?.date) || 'Not recorded' },
    { key: 'supersedes', header: 'Supersedes', width: '22ch', sortValue: (r) => supersedesText(r), render: (r) => supersedesText(r) },
    {
      key: 'by',
      header: 'Superseded by',
      width: '13ch',
      mono: true,
      sortValue: (r) => g.get(r.docNo)?.supersededBy[0] ?? '',
      render: (r) => {
        const by = g.get(r.docNo)?.supersededBy[0];
        return by ? shortNo(by) : 'None';
      },
    },
  ];

  const chains = (
    <div class="dv-index">
      <div class="dv-filter">
        <span>
          Supersession register, compiled from the supersession line and revision history of each directive held. A revision keeps the number; a
          replacement takes a new number.
        </span>
        {loaded < total ? (
          <span class="dv-filter__count">
            <ProgressBar label="Reading supersession lines" value={loaded} max={total} showValue="count" segments={12} />
          </span>
        ) : null}
      </div>
      <div class="dv-index__table">
        <DataTable<DirRow>
          label="Supersession register"
          columns={narrow ? regCols.filter((c) => NARROW_COLS.has(c.key) || c.key === 'supersedes') : regCols}
          rows={visible}
          rowKey={(r) => r.docNo}
          selection="single"
          selected={selected}
          onSelectionChange={setSelected}
          sort={sort}
          onSortChange={setSort}
          onActivate={(r) => open(r)}
          dense
          empty={<EmptyState icon="search" title="No directive matches the filter" body="Choose Edit, Clear filter to list every directive." />}
        />
      </div>
      <div class="dv-preview dv-preview--chain" aria-label="Lineage of the selected directive">
        {sel ? (
          <>
            {sel.supersessionLine ? (
              <p class="dv-preview__summary">
                Supersession line as published: <span class="dv-mono">{sel.supersessionLine}</span>
              </p>
            ) : null}
            <Chain docNos={lineage(sel.docNo, g)} graph={g} onOpen={openNo} />
          </>
        ) : (
          <p class="dv-dim">Select a directive to show its lineage: its revisions and any directive it replaced.</p>
        )}
      </div>
    </div>
  );

  const ackCols: Column<AckRecord>[] = [
    { key: 'receipt', header: 'Receipt', width: '24ch', mono: true },
    { key: 'docNo', header: 'Directive', width: '11ch', mono: true, render: (a) => shortNo(a.docNo) },
    { key: 'title', header: 'Title', wrap: true, sortValue: (a) => rows.find((r) => r.docNo === a.docNo)?.title ?? '', render: (a) => rows.find((r) => r.docNo === a.docNo)?.title ?? a.docNo },
    { key: 'revision', header: 'Rev', width: '5ch', align: 'right', mono: true },
    { key: 'at', header: 'Recorded', width: '28ch', mono: true, render: (a) => `${formatOscDate(a.at)} ${zuluLocal(a.at)}` },
    {
      key: 'standing',
      header: 'Standing',
      width: '18ch',
      sortValue: (a) => (rows.find((r) => r.docNo === a.docNo)?.revision === a.revision ? 0 : 1),
      render: (a) => {
        const r = rows.find((x) => x.docNo === a.docNo);
        return !r ? 'Directive not held' : r.revision === a.revision ? 'Current revision' : `Revised to ${r.revision}`;
      },
    },
  ];
  const ackView = (
    <div class="dv-index">
      <div class="dv-filter">
        <span>
          Acknowledgements recorded by operator <span class="dv-mono">{services.session.operatorId.value}</span>: {acks.length}. Current revisions
          acknowledged: {counts.acked} of {total}.
        </span>
      </div>
      <div class="dv-index__table">
        <DataTable<AckRecord>
          label="Acknowledgements of reading"
          columns={narrow ? ackCols.filter((c) => c.key === 'docNo' || c.key === 'revision' || c.key === 'at') : ackCols}
          rows={[...acks].reverse()}
          rowKey={(a) => String(a.seq)}
          selection="single"
          onActivate={(a) => openNo(a.docNo)}
          defaultSort={{ key: 'at', dir: 'desc' }}
          dense
          empty={<EmptyState icon="tray" title="No acknowledgements recorded" body="Open a directive and record your acknowledgement at the end of its text." />}
        />
      </div>
    </div>
  );

  const views: Record<View, preact.JSX.Element> = { index, chains, acks: ackView };

  return (
    <div class="dv" ref={rootRef} tabIndex={-1} onKeyDown={onKey as unknown as (e: Event) => void}>
      <MenuBar menus={menus} label="Directives menu" />
      <Toolbar label="Directives toolbar">
        <ToolbarButton label="Open" icon={<Icon id="doc-directive" size={16} />} onClick={() => open(sel)} disabled={!sel} title="Open the selected directive (Enter)" />
        <ToolbarButton label="Print" icon={<Icon id="print" size={16} />} onClick={print} title="Print the selected directive (Ctrl+P)" />
        <ToolbarSeparator />
        <ToolbarButton label="Acknowledge" icon={<Icon id="check" size={16} />} onClick={() => open(sel, 'ack')} disabled={!sel} title="Open the selected directive at its acknowledgement" />
        <ToolbarSeparator />
        <ToolbarButton label="Find" icon={<Icon id="filter" size={16} />} onClick={find} title="Find in index (Ctrl+F)" />
      </Toolbar>
      <div class="dv-main">
        <Tabs
          label="Library views"
          panel="flush"
          active={view}
          onChange={(id) => setView(id as View)}
          tabs={[
            { id: 'index', label: 'Index' },
            { id: 'chains', label: 'Supersession' },
            { id: 'acks', label: 'Acknowledgements' },
          ]}
        >
          {views[view]}
        </Tabs>
      </div>
      <StatusBar
        live
        panes={[
          { id: 'n', fill: true, content: `${total} directives held · ${counts.current} current · ${counts.superseded} superseded` },
          { id: 'ack', content: `Acknowledged ${counts.acked} of ${total}` },
          {
            id: 'load',
            width: '18ch',
            content: failedN ? `${failedN} not retrieved` : loaded < total ? `Reading ${loaded} of ${total}` : 'Index complete',
          },
          { id: 'tier', width: '8ch', content: `Tier ${services.session.tier.value}` },
        ]}
      />
      {noticeNode}
    </div>
  );
}
