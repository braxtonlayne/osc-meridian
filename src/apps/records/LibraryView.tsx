/** Records Library home: folder tree by division / series / marking / year, document list, details. */
import { useMemo, useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import { Button, DataTable, PropertyGrid, Select, Splitter, TextField, Tree, formatOscDate, type Column, type TreeNode } from '@design/index';
import { EmptyFolder } from '@graphics/states';
import { accessKeyOf, accessWords, buildFolderGroups, divisionOf, seriesOf } from './lib';
import { DIVISIONS, MARKINGS, MATCHERS, MarkingTag, divisionName, familyLabel, markingRank } from './shared';

export interface LibraryProps {
  routes: RouteEntry[];
  recent: RouteEntry[];
  folderId: string;
  onFolder: (id: string) => void;
  selected: string | null;
  onSelect: (route: string | null) => void;
  onOpen: (r: RouteEntry) => void;
  showFolders: boolean;
  narrow: boolean;
  satisfies: (key: string) => boolean;
}

export interface FolderResult {
  label: string;
  items: RouteEntry[];
}

/** Resolve a folder id to its label and the documents in it (shared with the App for marking/status). */
export function useFolders(routes: RouteEntry[], recent: RouteEntry[]) {
  const groups = useMemo(() => buildFolderGroups(routes, DIVISIONS, MARKINGS, MATCHERS), [routes]);
  const resolve = (id: string): FolderResult => {
    if (id === 'all') return { label: 'All holdings', items: routes };
    if (id === 'held')
      return {
        label: 'Records Library documents',
        items: routes.filter((r) => r.app === 'records'),
      };
    if (id === 'recent') return { label: 'Recently displayed', items: recent };
    for (const g of groups) {
      if (g.id === id) return { label: g.label, items: routes };
      const f = g.folders.find((x) => x.id === id);
      if (f)
        return {
          label: `${g.label}: ${f.label}`,
          items: routes.filter(f.test),
        };
    }
    return { label: 'All holdings', items: routes };
  };
  return { groups, resolve };
}

export function LibraryView(p: LibraryProps) {
  const { groups, resolve } = useFolders(p.routes, p.recent);
  const [filter, setFilter] = useState('');
  const folder = resolve(p.folderId);
  const f = filter.trim().toLowerCase();
  const items = f ? folder.items.filter((r) => `${r.docNo} ${r.title} ${r.originator}`.toLowerCase().includes(f)) : folder.items;
  const sel = p.selected ? (items.find((r) => r.route === p.selected) ?? null) : null;

  const nodes: TreeNode[] = useMemo(
    () => [
      {
        id: 'held',
        label: 'Records Library documents',
        meta: String(p.routes.filter((r) => r.app === 'records').length),
      },
      { id: 'all', label: 'All holdings', meta: String(p.routes.length) },
      {
        id: 'recent',
        label: 'Recently displayed',
        meta: String(p.recent.length),
      },
      ...groups.map((g) => ({
        id: g.id,
        label: g.label,
        children: g.folders.map((fd) => ({
          id: fd.id,
          label: fd.label,
          meta: String(p.routes.filter(fd.test).length),
        })),
      })),
    ],
    [groups, p.routes, p.recent],
  );

  const columns: Column<RouteEntry>[] = [
    { key: 'docNo', header: 'Doc No', mono: true, width: 124 },
    // Title takes the remaining width; DataTable keeps a floor under it (flexMin).
    { key: 'title', header: 'Title', wrap: true },
    {
      key: 'marking',
      header: 'Marking',
      width: 160,
      sortValue: (r) => markingRank(r.marking),
      render: (r) => <MarkingTag id={r.marking} />,
    },
    {
      key: 'revision',
      header: 'Rev',
      align: 'right',
      mono: true,
      width: 36,
    },
    { key: 'originator', header: 'Originator', mono: true, width: 100 },
    {
      key: 'date',
      header: 'Date',
      mono: true,
      width: 92,
      render: (r) => formatOscDate(r.date),
    },
    {
      key: 'access',
      header: 'Access',
      width: 96,
      wrap: true,
      sortValue: (r) => accessWords(r.access),
      render: (r) => {
        const k = accessKeyOf(r.access);
        return k && !p.satisfies(k) ? `Withheld (${accessWords(r.access)})` : accessWords(r.access);
      },
    },
  ];

  // Handheld: keep Title readable; Rev, Originator and Access are in the detail pane.
  const shown = p.narrow ? columns.filter((c) => ['docNo', 'title', 'marking'].includes(c.key)) : columns;

  const folderSelect = (
    <Select
      label="Folder"
      value={p.folderId}
      onChange={p.onFolder}
      options={[
        { value: 'held', label: 'Records Library documents' },
        { value: 'all', label: 'All holdings' },
        { value: 'recent', label: 'Recently displayed' },
        ...groups.flatMap((g) =>
          g.folders.map((fd) => ({
            value: fd.id,
            label: `${g.label}: ${fd.label}`,
          })),
        ),
      ]}
    />
  );

  const list = (
    <div class="rec__pane">
      <div class="rec__head">
        {p.narrow || !p.showFolders ? folderSelect : <span class="rec__head-title">{folder.label}</span>}
        <span class="rec__head-meta">
          {items.length} of {folder.items.length} document
          {folder.items.length === 1 ? '' : 's'}
        </span>
        <span class="rec__grow" />
        <TextField label="Filter" value={filter} onInput={setFilter} width="22ch" hint={undefined} />
      </div>
      <div class="rec__scroll rec__well">
        <DataTable
          flexMin={p.narrow ? 130 : 160}
          label={`Documents in ${folder.label}`}
          columns={shown}
          rows={items}
          rowKey={(r) => r.route}
          selection="single"
          selected={sel ? [sel.route] : []}
          onSelectionChange={(k) => p.onSelect(k[0] ?? null)}
          onActivate={p.onOpen}
          defaultSort={p.folderId === 'recent' ? null : { key: 'date', dir: 'desc' }}
          dense
          empty={<EmptyFolder name={folder.label} />}
        />
      </div>
      {sel ? <Detail r={sel} onOpen={p.onOpen} satisfies={p.satisfies} /> : null}
    </div>
  );

  if (p.narrow || !p.showFolders) return list;
  return (
    <Splitter initial={230} min={150} max={420} label="Folder pane width">
      <div class="rec-tree rec__well">
        <Tree nodes={nodes} label="Library folders" selectedId={p.folderId} onSelect={(n) => p.onFolder(n.id)} defaultExpanded={['g:div']} />
      </div>
      {list}
    </Splitter>
  );
}

function Detail({ r, onOpen, satisfies }: { r: RouteEntry; onOpen: (r: RouteEntry) => void; satisfies: (k: string) => boolean }) {
  const div = divisionOf(r.originator);
  const key = accessKeyOf(r.access);
  const withheld = !!key && !satisfies(key);
  return (
    <div class="rec-lib__detail" aria-label="Selected document">
      <PropertyGrid
        columns={2}
        rows={[
          { label: 'Document No', value: r.docNo, mono: true },
          {
            label: 'Series',
            value: seriesOf(r.docNo, MATCHERS) ?? 'Not in numbering scheme',
          },
          {
            label: 'Originator',
            value: `${r.originator}${divisionName(div) ? ` (${divisionName(div)})` : ''}`,
          },
          { label: 'Revision', value: String(r.revision), mono: true },
          { label: 'Date', value: formatOscDate(r.date), mono: true },
          { label: 'File', value: familyLabel(r.family) },
          { label: 'Marking', value: <MarkingTag id={r.marking} /> },
          {
            label: 'Access',
            value: withheld ? `${accessWords(r.access)}: not held by this operator` : accessWords(r.access),
          },
        ]}
      />
      <p class="rec-lib__summary">
        <span class="rec-hit__title">{r.title}.</span> {r.summary}
      </p>
      <div class="rec-lib__actions">
        <Button label="&Open" variant="primary" onClick={() => onOpen(r)} />
      </div>
    </div>
  );
}
