import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { RedactionInfo, Template } from '@core/contracts';
import type { Marking } from '@core/canon-types';
import '../styles';
import './gallery.css';
import { Button, ButtonRow } from '../primitives/Button';
import { MenuBar, Menu } from '../primitives/Menu';
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, ToolbarLabel, StatusBar } from '../primitives/Bars';
import { DataTable, type Column } from '../primitives/DataTable';
import { Tree, type TreeNode } from '../primitives/Tree';
import { Tabs } from '../primitives/Tabs';
import { TextField, TextArea, Select, Checkbox, RadioGroup, DateField, FieldGroup, Fieldset, FieldMessage } from '../primitives/Fields';
import { StatusLight, ProgressBar, PropertyGrid, GroupBox, type OperStatus } from '../primitives/Indicators';
import { Tooltip, Dialog, type DialogKind } from '../primitives/Overlays';
import { Pager, Redaction, Splitter, type RedactionHoverInfo } from '../primitives/Records';
import { DocumentView, type DocumentSlots } from '../document/DocumentView';
import { formatOscDate } from '../util';
import { SAMPLE_DOCS } from './samples';

export interface GalleryProps {
  /** canon.markings, for real banner colours on the template specimens. */
  markings?: readonly Marking[];
  /** Cross-references inside specimens that point outside the gallery. */
  onNavigate?: (route: string) => void;
  onRedactionHover?: (info: RedactionInfo | RedactionHoverInfo) => void;
  /** Wire Dialog error opens to the error chord (sound.play('error')). */
  onDialogOpen?: (kind: DialogKind) => void;
  slots?: DocumentSlots;
  /** Which section opens first. */
  initial?: 'primitives' | 'templates';
  initialTemplate?: Template;
}

interface WorkOrder {
  wo: string;
  unit: string;
  task: string;
  site: string;
  due: string;
  hours: number;
  status: OperStatus;
}

const ORDERS: WorkOrder[] = [
  { wo: 'WO-08-04417', unit: 'AHU-4B', task: 'Replace primary filter bank', site: 'ALPHA-03', due: '2008-05-21', hours: 3.5, status: 'NOMINAL' },
  { wo: 'WO-08-04420', unit: 'ELEV-3', task: 'Fit replacement drive controller', site: 'ALPHA-03', due: '2008-05-28', hours: 12, status: 'OFFLINE' },
  { wo: 'WO-08-04431', unit: 'GEN-S2', task: 'Monthly load test', site: 'ALPHA-03', due: '2008-05-13', hours: 2, status: 'NOMINAL' },
  { wo: 'WO-08-04436', unit: 'PMP-2A', task: 'Investigate seal weep at gland', site: 'ALPHA-03', due: '2008-05-16', hours: 4, status: 'DEGRADED' },
  { wo: 'WO-08-04452', unit: 'CHL-1', task: 'Compressor trip on high head pressure', site: 'ALPHA-03', due: '2008-05-14', hours: 6, status: 'FAULT' },
  { wo: 'WO-08-04460', unit: 'LGT-L4', task: 'Re-lamp corridor 4-C', site: 'ALPHA-03', due: '2008-05-30', hours: 1.5, status: 'NOMINAL' },
];

const COLUMNS: Column<WorkOrder>[] = [
  { key: 'wo', header: 'Work order', width: 110, mono: true },
  { key: 'unit', header: 'Unit', width: 72, mono: true },
  { key: 'task', header: 'Task' },
  { key: 'due', header: 'Due', width: 96, render: (r) => formatOscDate(r.due), sortValue: (r) => r.due },
  { key: 'hours', header: 'Est. hrs', width: 72, align: 'right', mono: true, render: (r) => r.hours.toFixed(1) },
  { key: 'status', header: 'Status', width: 112, render: (r) => <StatusLight status={r.status} /> },
];

const FOLDERS: TreeNode[] = [
  {
    id: 'rd',
    label: 'Records Division',
    children: [
      { id: 'rd-mem', label: 'Memoranda', meta: '(214)', children: [{ id: 'rd-mem-08', label: '2008', meta: '(61)', children: [] }] },
      { id: 'rd-dir', label: 'Directives', meta: '(24)' , children: [] },
      { id: 'rd-scan', label: 'Scanned originals', meta: '(9)', children: [] },
    ],
  },
  {
    id: 'ss',
    label: 'Site Support Branch',
    children: [
      { id: 'ss-park', label: 'Parking and access', meta: '(12)', children: [] },
      { id: 'ss-food', label: 'Food service', meta: '(30)', children: [] },
    ],
  },
  { id: 'oia', label: 'Office of Internal Assurance', disabled: true, children: [{ id: 'oia-x', label: 'Restricted', disabled: true }] },
];

const TEMPLATE_ORDER: Template[] = ['memo', 'directive', 'cable', 'minutes', 'ledger', 'dossier', 'form', 'message', 'help', 'record', 'charter', 'scan', 'index'];

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <GroupBox title={title}>
      <div class="gal-sec">{children}</div>
    </GroupBox>
  );
}

/** Visual review page for every primitive and every document template. */
export function Gallery({ markings, onNavigate, onRedactionHover, onDialogOpen, slots, initial = 'primitives', initialTemplate = 'memo' }: GalleryProps) {
  const [tab, setTab] = useState<string>(initial);
  const [tpl, setTpl] = useState<Template>(initialTemplate);
  const [status, setStatus] = useState('Ready');
  const [sel, setSel] = useState<string[]>(['WO-08-04436']);
  const [folder, setFolder] = useState<string | null>('rd-mem');
  const [opTab, setOpTab] = useState('general');
  const [name, setName] = useState('');
  const [site, setSite] = useState('ALPHA-03');
  const [reason, setReason] = useState('');
  const [leave, setLeave] = useState('2008-05-27');
  const [ack, setAck] = useState(false);
  const [kind, setKind] = useState('annual');
  const [submitted, setSubmitted] = useState(false);
  const [dlg, setDlg] = useState<DialogKind | null>(null);
  const [page, setPage] = useState(12);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [wordWrap, setWordWrap] = useState(true);

  const nameErr = submitted && !name.trim() ? 'Block 1 is required. Enter your operator ID as issued (for example 3-1147).' : null;
  const reasonErr = submitted && reason.trim().length < 10 ? 'Block 5 must state the reason in at least ten characters.' : null;
  const ackErr = submitted && !ack ? 'The request cannot be routed until the certification is marked.' : null;

  const navigate = (route: string) => {
    const hit = TEMPLATE_ORDER.find((t) => SAMPLE_DOCS[t].route === route);
    if (hit) {
      setTpl(hit);
      setStatus(`Opened specimen ${SAMPLE_DOCS[hit].docNo}`);
    } else if (onNavigate) {
      onNavigate(route);
    } else {
      setStatus(`Reference ${route} is outside the specimen set.`);
    }
  };

  const onRx = (info: RedactionInfo | RedactionHoverInfo) => {
    setStatus(`Withheld element viewed: ${info.auth} ${info.ref}`);
    onRedactionHover?.(info);
  };

  return (
    <div class="gal">
      <Tabs
        label="Gallery sections"
        tabs={[
          { id: 'primitives', label: '&Controls' },
          { id: 'templates', label: '&Document formats' },
        ]}
        active={tab}
        onChange={setTab}
        panel="flush"
      >
        {tab === 'primitives' ? (
          <div class="gal-body">
            <Section title="Menu bar, toolbar and status bar">
              <div class="gal-frame">
                <MenuBar
                  menus={[
                    {
                      label: '&File',
                      items: [
                        { label: '&Open...', shortcut: 'Ctrl+O', onSelect: () => setStatus('File > Open') },
                        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: () => setStatus('File > Print') },
                        { separator: true },
                        { label: 'E&xport...', onSelect: () => setStatus('Export is not permitted from this workstation. Reference DIR-0412.') },
                        { separator: true },
                        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => setStatus('File > Close') },
                      ],
                    },
                    {
                      label: '&View',
                      items: [
                        { label: '&Word wrap', checked: wordWrap, onSelect: () => setWordWrap(!wordWrap) },
                        { label: '&Refresh', shortcut: 'F5', onSelect: () => setStatus('View refreshed') },
                      ],
                    },
                    { label: '&Help', items: [{ label: '&About Work Orders', onSelect: () => setStatus('Work Orders 2.3.1') }] },
                  ]}
                />
                <Toolbar label="Work orders">
                  <ToolbarButton label="&New" title="New work order (Ctrl+N)" onClick={() => setStatus('New work order form opened')} />
                  <ToolbarButton label="Open" onClick={() => setStatus(`Open ${sel.join(', ') || 'nothing selected'}`)} />
                  <ToolbarSeparator />
                  <ToolbarButton label="Wrap" pressed={wordWrap} onClick={() => setWordWrap(!wordWrap)} />
                  <ToolbarButton label="Delete" title="Requires supervisor role" onClick={() => setStatus('Delete refused: requires supervisor role. Reference FE-SOP-04.')} />
                  <ToolbarButton label="Archive" disabled title="No closed work orders selected" />
                  <ToolbarSpacer />
                  <ToolbarLabel>Site ALPHA-03</ToolbarLabel>
                </Toolbar>
                <div
                  class="gal-ctx"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtx({ x: e.clientX, y: e.clientY });
                  }}
                >
                  Right-click here for a context menu.
                </div>
                {ctx ? (
                  <Menu
                    label="Context"
                    position={ctx}
                    initialIndex={0}
                    onClose={() => setCtx(null)}
                    items={[
                      { label: '&Copy', shortcut: 'Ctrl+C', onSelect: () => setStatus('Copied') },
                      { label: '&Properties', onSelect: () => setStatus('Properties') },
                    ]}
                  />
                ) : null}
                <StatusBar
                  panes={[
                    { id: 'msg', content: status, fill: true },
                    { id: 'sel', content: `${sel.length} selected`, width: 96 },
                    { id: 'n', content: `${ORDERS.length} records`, width: 96, mono: true },
                    { id: 'link', content: <StatusLight status="NOMINAL" word="LINK" />, width: 80 },
                  ]}
                />
              </div>
            </Section>

            <Section title="Data table">
              <div style={{ height: '170px' }}>
                <DataTable
                  label={`Open work orders, ${ORDERS.length} records`}
                  columns={COLUMNS}
                  rows={ORDERS}
                  rowKey={(r) => r.wo}
                  selection="multi"
                  selected={sel}
                  onSelectionChange={setSel}
                  defaultSort={{ key: 'due', dir: 'asc' }}
                  wrap={wordWrap}
                  onActivate={(r) => setStatus(`Opened ${r.wo}`)}
                />
              </div>
              <div style={{ height: '64px', marginTop: '8px' }}>
                <DataTable label="Deferred work orders" columns={COLUMNS} rows={[]} rowKey={(r) => r.wo} empty="No deferred work orders for this site." dense />
              </div>
            </Section>

            <Section title="Folder tree and splitter">
              <div class="gal-split">
                <Splitter label="Folder pane width" initial={220} min={140} max={420}>
                  <div class="well" style={{ height: '100%' }}>
                    <Tree
                      label="Records folders"
                      nodes={FOLDERS}
                      selectedId={folder}
                      onSelect={(n) => setFolder(n.id)}
                      defaultExpanded={['rd', 'rd-mem']}
                      onActivate={(n) => setStatus(`Opened folder ${n.label}`)}
                    />
                  </div>
                  <div class="gal-pane">Folder: {folder ?? 'none'}</div>
                </Splitter>
              </div>
            </Section>

            <Section title="Notebook tabs and form controls">
              <Tabs
                label="Leave request"
                tabs={[
                  { id: 'general', label: '&General' },
                  { id: 'routing', label: '&Routing' },
                  { id: 'history', label: 'H&istory' },
                ]}
                active={opTab}
                onChange={setOpTab}
              >
                {opTab === 'general' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubmitted(true);
                      if (name.trim() && reason.trim().length >= 10 && ack) setStatus('Request routed. Receipt LV-08-03311.');
                    }}
                  >
                    <Fieldset legend="Request" no="I">
                      <FieldGroup labelWidth="150px">
                        <TextField block="1" label="Operator ID" value={name} onInput={setName} required mono width={10} error={nameErr} />
                        <Select
                          block="2"
                          label="Duty site"
                          value={site}
                          onChange={setSite}
                          options={[
                            { value: 'ALPHA-01', label: 'ALPHA-01' },
                            { value: 'ALPHA-03', label: 'ALPHA-03' },
                          ]}
                          width="16ch"
                        />
                        <RadioGroup
                          block="3"
                          legend="Type of leave"
                          name="kind"
                          value={kind}
                          onChange={setKind}
                          inline
                          options={[
                            { value: 'annual', label: 'Annual' },
                            { value: 'sick', label: 'Sick' },
                            { value: 'other', label: 'Other' },
                          ]}
                        />
                        <DateField block="4" label="First day of leave" value={leave} onChange={(iso) => setLeave(iso ?? '')} required hint="Dates after 31 MAY 2008 cannot be entered in this release." />
                        <TextArea block="5" label="Reason" value={reason} onInput={setReason} rows={3} maxLength={240} showCount error={reasonErr} />
                        <Checkbox aligned label="I certify that my duties for the period have been covered." checked={ack} onChange={setAck} error={ackErr} />
                      </FieldGroup>
                    </Fieldset>
                    <ButtonRow>
                      <Button type="submit" variant="primary" label="&Submit" />
                      <Button
                        label="C&lear"
                        onClick={() => {
                          setName('');
                          setReason('');
                          setAck(false);
                          setSubmitted(false);
                        }}
                      />
                    </ButtonRow>
                  </form>
                ) : opTab === 'history' ? (
                  <FieldMessage kind="notice">No previous requests are held for this operator in the current leave year.</FieldMessage>
                ) : (
                  <div class="u-stack">
                    <FieldMessage kind="notice">Requests route to the division chief, then to the site personnel office.</FieldMessage>
                    <PropertyGrid
                      rows={[
                        { label: 'Step 1', value: 'Division chief, Records Division' },
                        { label: 'Step 2', value: 'Personnel office, ALPHA-03' },
                        { label: 'Receipt', value: 'Issued on submission', mono: false },
                      ]}
                    />
                  </div>
                )}
              </Tabs>
            </Section>

            <Section title="Status, progress and identity blocks">
              <div class="gal-row">
                <StatusLight status="NOMINAL" />
                <StatusLight status="DEGRADED" note="since 0412Z" />
                <StatusLight status="FAULT" />
                <StatusLight status="OFFLINE" />
              </div>
              <div class="gal-cols">
                <ProgressBar label="Compiling distribution list" value={14} max={24} showValue="count" />
                <ProgressBar label="Contacting records server" />
              </div>
              <PropertyGrid
                caption="IDENTITY"
                columns={2}
                rows={[
                  { label: 'Operator', value: '3-1147', mono: true },
                  { label: 'Tier', value: '3' },
                  { label: 'Site', value: 'ALPHA-03', mono: true },
                  { label: 'Division', value: 'Records Division' },
                ]}
              />
            </Section>

            <Section title="Message boxes, tooltip, pager and redaction">
              <div class="gal-row">
                <Button label="&Information" onClick={() => setDlg('info')} />
                <Button label="&Warning" onClick={() => setDlg('warning')} />
                <Button label="&Error" onClick={() => setDlg('error')} />
                <Button label="&Question" onClick={() => setDlg('question')} />
                <Tooltip text="Prints the document with its cover sheet (Ctrl+P)">
                  <Button label="Print" onClick={() => setStatus('Print queued')} />
                </Tooltip>
              </div>
              <Pager page={page} pageCount={1204} onPage={setPage} noun="Accession" total={1204} totalNoun="accessions" />
              <p class="gal-p">
                Seed accession {page} was received from <Redaction len={14} auth="RD" reference="RD-08-2207" onHover={onRx} /> and catalogued
                under compartment <Redaction len={7} auth="CSO" reference="CSO-08-019" onHover={onRx} />.
              </p>
              <Dialog
                open={dlg !== null}
                kind={dlg ?? 'info'}
                title={dlg === 'error' ? 'Records Library' : dlg === 'question' ? 'Confirm' : 'MERIDIAN'}
                reference={dlg === 'error' ? 'Ref DIR-0412 · Code RD-104' : undefined}
                buttons={
                  dlg === 'question'
                    ? [
                        { label: '&Yes', value: 'yes', isDefault: true },
                        { label: '&No', value: 'no', isCancel: true },
                      ]
                    : undefined
                }
                onOpen={onDialogOpen}
                onClose={(v) => {
                  setDlg(null);
                  setStatus(`Dialog closed: ${v}`);
                }}
              >
                {dlg === 'error'
                  ? 'The document cannot be opened. Requires Tier 2 compartment briefing.'
                  : dlg === 'warning'
                    ? 'This document is marked UMBRA//OSC RESTRICTED. Printing is recorded.'
                    : dlg === 'question'
                      ? 'Close the leave request without routing it?'
                      : 'Your session will be locked after 15 minutes without input.'}
              </Dialog>
            </Section>
          </div>
        ) : (
          <div class="gal-docs">
            <div class="gal-docs__bar">
              <Toolbar label="Document format">
                {TEMPLATE_ORDER.map((t) => (
                  <ToolbarButton key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} pressed={tpl === t} onClick={() => setTpl(t)} />
                ))}
              </Toolbar>
            </div>
            <div class="gal-docs__view" key={tpl}>
              <DocumentView
                doc={SAMPLE_DOCS[tpl]}
                markings={markings}
                onNavigate={navigate}
                onRedactionHover={onRx}
                slots={slots}
                print={{ copyNo: '1 of 1', printedBy: '3-1147' }}
              />
            </div>
            <StatusBar
              panes={[
                { id: 'msg', content: status, fill: true },
                { id: 'doc', content: SAMPLE_DOCS[tpl].docNo, width: 180, mono: true },
              ]}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}

export default Gallery;
