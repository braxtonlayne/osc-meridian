/**
 * Forms Center (app id `forms`). Catalogue of forms on issue, a filler drawn from each form's
 * `form:` frontmatter, the instructions (document body) and in-world receipts.
 * Pure rules live in model.ts (unit-tested); local records in store.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { Canon, MarkingId } from '@core/canon-types';
import type { AppProps, DocJson, RouteEntry } from '@core/contracts';
import { useServices } from '@core/services';
import { formatInWorldDate, siteLocal, zulu } from '@core/session';
import { isRx } from '@core/rx';
import { WORKSTATION } from '@narrative/engine';
import {
  Button,
  ButtonRow,
  DataTable,
  Dialog,
  DocumentView,
  FieldMessage,
  GroupBox,
  MenuBar,
  PropertyGrid,
  StatusBar,
  Tabs,
  Toolbar,
  ToolbarButton,
  ToolbarLabel,
  ToolbarSeparator,
  ToolbarSpacer,
  formatNumber,
  formatOscDate,
  type Column,
  type MenuBarMenu,
  type RedactionHoverInfo,
} from '@design/index';
import { Barcode, FormFooter, FormHeader, FormSheet, ReceiptSlip } from '@graphics/forms';
import { Seal } from '@graphics/seal';
import { EmptyState, ErrorState, RefusalState } from '@graphics/states';
import {
  allFields,
  fieldRefs,
  flattenValues,
  formatSubmitDetail,
  holdersOf,
  initialValues,
  isEmpty,
  matchRefusal,
  matchResponses,
  normalizeEntry,
  parseFormSpec,
  pnRegex,
  precheckAccessRequest,
  receiptNumber,
  receiptSerial,
  spansDate,
  submitData,
  validateForm,
  type ConditionContext,
  type FieldOption,
  type FieldSpec,
  type FieldValue,
  type FormSpec,
  type Issue,
  type NamedResponses,
  type ValidationContext,
  type Values,
} from './model';
import { FieldGrid, fieldDomId, type DirectoryEntry } from './Fields';
import { addReceipt, countFor, drafts, dropDraft, loadStore, receipts, saveDraft, type StoredReceipt } from './store';
import './forms-app.css';

const canon = canonJson as unknown as Canon;
const op = canon.operator;
const PN_RE = pnRegex(canon.personnelNumberFormat.pattern);
const markingOf = (id: MarkingId) => canon.markings.find((m) => m.id === id);
const markingLabel = (id: MarkingId) => markingOf(id)?.label ?? id;
const highest = (ids: MarkingId[]): MarkingId =>
  ids.reduce<MarkingId>((a, b) => ((markingOf(b)?.rank ?? 0) > (markingOf(a)?.rank ?? 0) ? b : a), 'TSSCI-OSC');

/** Fields that ask for the operator's own name are filled from the issued identity, never typed. */
const OWN_NAME_FIELDS = new Set(['name', 'declarantName', 'applicantName', 'requesterName']);

/** Tab to open on arrival, set by the catalogue before it navigates its window. */
const pendingTab = new Map<string, Tab>();

type Tab = 'form' | 'instructions' | 'receipt';

const FACILITY_OPTIONS: FieldOption[] = canon.facilities.map((f) => ({
  value: f.id,
  label: f.codename && !isRx(f.codename) ? `${f.id}  ${f.codename}` : f.id,
}));

/** Memorial Day from the canon calendar (holiday manning response on leave requests). */
const HOLIDAY = canon.calendar.find((e) => /Memorial Day/i.test(e.title))?.date;
const DECLARATIONS_CLOSE = canon.calendar.find((e) => /Unposted status declarations/i.test(e.title));

function enteredAtNow(): string {
  const now = new Date();
  return `${formatInWorldDate(now)} ${zulu(now)} (${siteLocal(now)})`;
}

function particulars(tier: number, probationDay: number): Record<string, string> {
  const probation = probationDay <= 90 ? 'YES' : '';
  return {
    'operator.pn': op.pn,
    'operator.site': op.site,
    'operator.supervisorPn': op.supervisorPn,
    'operator.workstation': WORKSTATION,
    'operator.tier': String(tier),
    'operator.probationStart': op.probationStart,
    'operator.onProbation': probation,
    'operator.name': op.displayName,
    'operator.operatorId': op.operatorId,
    'operator.division': op.divisionId,
    'operator.email': op.email,
    'session.probationer': probation,
  };
}

/* ====================================================================== */

export default function App(props: AppProps) {
  const services = useServices();
  const { route, win } = props;
  useEffect(() => void loadStore(), []);

  if (route && route.access) {
    const key = route.access.compartment ? `${route.access.compartment}+T${route.access.tier}` : `T${route.access.tier}`;
    if (!services.clearance.satisfies(key)) return <Refused route={route} win={win} />;
  }
  if (route) return <FormWindow key={route.id} {...props} route={route} />;
  return <Catalogue {...props} />;
}

function Refused({ route, win }: { route: RouteEntry; win: AppProps['win'] }) {
  const services = useServices();
  useEffect(() => {
    win.setTitle(route.title, route.docNo);
    win.setMarking(route.marking);
    services.audit.log('window.open', route.docNo, `Operator ${services.session.operatorId.peek()} requested ${route.docNo}. Request refused: access determination not held.`);
  }, [route.id]);
  return (
    <div class="fx-root">
      <RefusalState
        authority="Classification Control, Office of Internal Assurance"
        reference="OSC-DIR-0412"
        docNo={route.docNo}
        requirement={`Tier ${route.access!.tier}${route.access!.compartment ? ` and ${route.access!.compartment} briefing` : ''}`}
        reason={`This form is issued only to operators holding the access shown. Reference DIR-0412.`}
      />
    </div>
  );
}

/* ============================================================ catalogue */

function Catalogue({ win }: AppProps) {
  const services = useServices();
  const all = useMemo(() => services.docs.all().filter((r) => r.app === 'forms'), []);
  const [filter, setFilter] = useState('');
  const [sel, setSel] = useState<string | null>(all[0]?.id ?? null);
  const [tab, setTab] = useState<'catalogue' | 'receipts'>('catalogue');
  const [selReceipt, setSelReceipt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = filter.trim().toLowerCase();
  const rows = all.filter((r) => !q || `${r.docNo} ${r.title} ${r.summary} ${r.originator}`.toLowerCase().includes(q));
  const selected = all.find((r) => r.id === sel) ?? null;
  const rcpts = receipts.value;
  const rcptKey = (r: StoredReceipt) => r.receiptNo ?? `${r.formNo} ${r.enteredAt}`;
  const curReceipt = rcpts.find((r) => rcptKey(r) === selReceipt) ?? null;

  useEffect(() => {
    win.setTitle('Forms Center');
    win.setMarking(highest(all.map((r) => r.marking)));
    win.setStatus(`${all.length} forms on issue`);
  }, [all.length]);

  const open = (r: RouteEntry | null, t: Tab = 'form') => {
    if (!r) {
      setNotice('Select a form in the catalogue first.');
      return;
    }
    if (t !== 'form') pendingTab.set(win.id, t);
    win.navigate(r.route);
  };
  const print = () => {
    if (!selected) return setNotice('Select a form in the catalogue first.');
    services.print(selected.id);
  };

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Complete form', shortcut: 'Enter', onSelect: () => open(selected) },
        { label: 'Read &instructions', onSelect: () => open(selected, 'instructions') },
        { label: '&Print blank form', shortcut: 'Ctrl+P', onSelect: print },
        { separator: true },
        { label: 'C&lose', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: 'Forms &catalogue', checked: tab === 'catalogue', radio: true, onSelect: () => setTab('catalogue') },
        { label: '&Receipts held', checked: tab === 'receipts', radio: true, onSelect: () => setTab('receipts') },
        { separator: true },
        { label: 'Clear &filter', onSelect: () => setFilter('') },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: '&About Forms Center', onSelect: () => setNotice(ABOUT) },
        { label: 'Records handling directive (DIR-0412)', onSelect: () => services.openRoute(services.docs.byDocNo('OSC-DIR-0412')?.route ?? '/directives/dir-0412') },
      ],
    },
  ];

  const cols: Column<RouteEntry>[] = [
    { key: 'docNo', header: 'Form No.', mono: true, width: 92, sortValue: (r) => r.docNo },
    { key: 'title', header: 'Title', sortValue: (r) => r.title, render: (r) => r.title },
    { key: 'originator', header: 'Issued by', width: 100, mono: true, sortValue: (r) => r.originator },
    { key: 'date', header: 'Edition', width: 76, sortValue: (r) => r.date, render: (r) => formatOscDate(r.date).slice(3) },
    { key: 'held', header: 'Receipts', width: 64, align: 'right', sortValue: (r) => rcpts.filter((x) => x.route === r.route).length, render: (r) => String(rcpts.filter((x) => x.route === r.route).length) },
  ];
  const rcols: Column<StoredReceipt>[] = [
    { key: 'no', header: 'Receipt No.', mono: true, width: 150, sortValue: (r) => r.receiptNo ?? '', render: (r) => r.receiptNo ?? 'NOT ISSUED' },
    { key: 'form', header: 'Form', mono: true, width: 90, sortValue: (r) => r.formNo },
    { key: 'title', header: 'Title', sortValue: (r) => r.title, render: (r) => r.title },
    { key: 'at', header: 'Entered', width: 170, mono: true, sortValue: (r) => r.enteredAt, render: (r) => r.enteredAt },
    { key: 'disp', header: 'Disposition', width: 110, sortValue: (r) => r.disposition, render: (r) => (r.disposition === 'ACCEPTED' ? 'ROUTED' : 'RETURNED') },
  ];

  return (
    <div class="fx-root" onKeyDown={(e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        print();
      }
    }}>
      <MenuBar menus={menus} label="Forms Center menu" />
      <Toolbar label="Forms">
        <ToolbarButton label="&Complete" title="Complete the selected form" onClick={() => open(selected)} />
        <ToolbarButton label="&Instructions" onClick={() => open(selected, 'instructions')} />
        <ToolbarButton label="&Print" title="Print blank form (Ctrl+P)" onClick={print} />
        <ToolbarSeparator />
        <ToolbarLabel>Find</ToolbarLabel>
        <input class="fx-find toolbar__focusable" aria-label="Find a form by number or title" value={filter} onInput={(e) => setFilter(e.currentTarget.value)} />
        <ToolbarSpacer />
      </Toolbar>
      <div class="fx-body">
        <Tabs
          label="Forms Center"
          panel="flush"
          active={tab}
          onChange={(t) => setTab(t as 'catalogue' | 'receipts')}
          tabs={[
            { id: 'catalogue', label: 'C&atalogue' },
            { id: 'receipts', label: `&Receipts (${rcpts.length})` },
          ]}
        >
          {tab === 'catalogue' ? (
            <div class="fx-split">
              <div class="fx-split__list">
                <DataTable
                  flexMin={160}
                  label="Forms on issue"
                  columns={cols}
                  rows={rows}
                  rowKey={(r) => r.id}
                  selection="single"
                  selected={sel ? [sel] : []}
                  onSelectionChange={(k) => setSel(k[0] ?? null)}
                  onActivate={(r) => open(r)}
                  defaultSort={{ key: 'docNo', dir: 'asc' }}
                  dense
                  empty={<EmptyState title="No form matches" body={`No form on issue matches "${filter}".`} icon="search" />}
                />
              </div>
              <div class="fx-split__detail">
                {selected ? (
                  <>
                    <PropertyGrid
                      caption="FORM PARTICULARS"
                      rows={[
                        { label: 'Form', value: selected.docNo, mono: true },
                        { label: 'Title', value: selected.title },
                        { label: 'Issued by', value: selected.originator, mono: true },
                        { label: 'Edition', value: formatOscDate(selected.date) },
                        { label: 'Revision', value: String(selected.revision) },
                        { label: 'Marking', value: markingLabel(selected.marking) },
                        { label: 'Use', value: selected.summary },
                        { label: 'Receipts held', value: String(rcpts.filter((x) => x.route === selected.route).length) },
                      ]}
                    />
                    <ButtonRow>
                      <Button variant="primary" label="&Complete form" onClick={() => open(selected)} />
                      <Button label="Read i&nstructions" onClick={() => open(selected, 'instructions')} />
                    </ButtonRow>
                  </>
                ) : (
                  <EmptyState title="No form selected" body="Select a form in the catalogue to see its particulars." icon="folder" />
                )}
              </div>
            </div>
          ) : (
            <div class="fx-split">
              <div class="fx-split__list">
                <DataTable
                  flexMin={160}
                  label="Receipts held"
                  columns={rcols}
                  rows={rcpts}
                  rowKey={rcptKey}
                  selection="single"
                  selected={selReceipt ? [selReceipt] : []}
                  onSelectionChange={(k) => setSelReceipt(k[0] ?? null)}
                  dense
                  empty={<EmptyState title="No receipts held" body="Receipts for forms submitted from this workstation are listed here." icon="tray" />}
                />
              </div>
              <div class="fx-split__detail fx-paper">
                {curReceipt ? <ReceiptView r={curReceipt} /> : <EmptyState title="No receipt selected" body="Select a receipt to show the slip." icon="tray" />}
              </div>
            </div>
          )}
        </Tabs>
      </div>
      <StatusBar
        panes={[
          { id: 'msg', fill: true, content: tab === 'catalogue' ? (selected ? `${selected.docNo} ${selected.title}` : 'Select a form.') : curReceipt ? `Receipt ${curReceipt.receiptNo ?? 'not issued'}` : 'Receipts held at this workstation.' },
          { id: 'count', width: 130, content: `${rows.length} of ${all.length} forms` },
          { id: 'rc', width: 100, content: `${rcpts.length} receipts` },
          { id: 'ws', width: 110, mono: true, content: `WS ${WORKSTATION}` },
        ]}
      />
      <Dialog open={notice !== null} title="Forms Center" kind="info" onClose={() => setNotice(null)}>
        <p class="fx-dlg">{notice}</p>
      </Dialog>
    </div>
  );
}

const ABOUT =
  'Forms Center, MERIDIAN release 4.1. Forms are completed and signed at the workstation and entered into routing on submission. A numbered receipt is issued for every form accepted. Entries are held in the routing record of the receiving office and in the workstation audit trail.';

/* ================================================================ form */

interface Outcome {
  receipt: StoredReceipt;
}

function FormWindow({ win, route }: AppProps & { route: RouteEntry }) {
  const services = useServices();
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    const t = pendingTab.get(win.id);
    pendingTab.delete(win.id);
    return t ?? 'form';
  });
  const [values, setValues] = useState<Values>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [checkedAll, setCheckedAll] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<{ title: string; text: string; kind: 'info' | 'warning' | 'error' } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Set when the operator confirms Submit: the receipt then takes focus once it is shown.
  const focusReceipt = useRef(false);
  const [status, setStatus] = useState('Loading form.');
  const summaryRef = useRef<HTMLDivElement>(null);
  const idPrefix = `fx-${win.id}`;

  const tier = services.session.tier.value;
  const probationDay = services.session.probationDay.value;
  const flags = services.session.flags.value;
  void services.session.compartments.value; // re-render on grants (option visibility)
  const parts = useMemo(() => particulars(tier, probationDay), [tier, probationDay]);
  const spec = useMemo<FormSpec | null>(() => (doc ? parseFormSpec(doc.frontmatter, { docNo: doc.docNo, title: doc.title }) : null), [doc]);

  const fresh = (s: FormSpec): Values => {
    const v = initialValues(s, parts);
    for (const f of allFields(s)) if (OWN_NAME_FIELDS.has(f.name) && !f.prefill && f.type === 'text' && isEmpty(v[f.name])) v[f.name] = op.displayName;
    return v;
  };

  useEffect(() => {
    win.setTitle(route.title, route.docNo);
    win.setMarking(route.marking);
    win.setBusy(true);
    let live = true;
    services.docs
      .load(route.id)
      .then((d) => {
        if (!live) return;
        setDoc(d);
        services.audit.log('doc.read', d.docNo);
        win.setMarking(d.marking);
      })
      .catch(() => live && setFailed(true))
      .finally(() => live && win.setBusy(false));
    return () => {
      live = false;
    };
  }, [route.id]);

  // Entries: a saved draft if one exists, else a fresh copy.
  useEffect(() => {
    if (!spec) return;
    void loadStore().then(() => {
      const d = drafts.peek()[route.id];
      if (d) {
        setValues({ ...fresh(spec), ...d.values });
        setStatus(`Draft saved ${d.savedAt} restored.`);
      } else {
        setValues(fresh(spec));
        setStatus('Ready. Complete the blocks marked * and submit.');
      }
    });
  }, [spec]);

  const vctx: ValidationContext = useMemo(
    () => ({
      satisfies: services.clearance.satisfies,
      pnPattern: PN_RE,
      knownPn: (pn) => pn === op.pn || canon.roster.some((p) => p.pn === pn),
      knownDocNo: (d) => !!services.docs.byDocNo(d),
      facilities: canon.facilities.map((f) => f.id),
    }),
    [tier, services.session.compartments.value],
  );
  const issues: Issue[] = useMemo(() => (spec ? validateForm(spec, values, vctx) : []), [spec, values, vctx]);
  const errors = issues.filter((i) => i.level === 'error');
  const shown = useMemo(() => {
    const m = new Map<string, Issue[]>();
    for (const i of issues) {
      if (!checkedAll && !touched.has(i.field)) continue;
      m.set(i.field, [...(m.get(i.field) ?? []), i]);
    }
    return m;
  }, [issues, touched, checkedAll]);

  const submitted = outcome !== null;
  useEffect(() => win.setStatus(status), [status]);
  useEffect(() => {
    if (!checkedAll || submitted) return;
    setStatus(errors.length ? `${errors.length} block${errors.length > 1 ? 's' : ''} rejected. The form cannot be submitted.` : 'Entries checked. The form may be submitted.');
  }, [errors.length, checkedAll]);
  const onRedactionHover = (i: RedactionHoverInfo) =>
    services.audit.log('redaction.hover', route.docNo, `Operator ${services.session.operatorId.peek()} examined withheld material in ${route.docNo} (${i.auth} ${i.ref}). No release was made.`);

  const setField = (name: string, v: FieldValue) => {
    if (submitted) return;
    setValues((cur) => ({ ...cur, [name]: v }));
    if (Array.isArray(v) || ['YES', ''].includes(v as string)) setTouched((t) => new Set(t).add(name));
  };
  const blurField = (f: FieldSpec) => {
    const v = values[f.name];
    if (typeof v === 'string') {
      const n = normalizeEntry(f, v);
      if (n !== v) setValues((cur) => ({ ...cur, [f.name]: n }));
    }
    setTouched((t) => new Set(t).add(f.name));
  };

  const focusField = (name: string) => {
    setTab('form');
    requestAnimationFrame(() => document.getElementById(fieldDomId(idPrefix, name))?.focus());
  };

  const refusedReceipt = () => setMessage({ title: 'Receipt', kind: 'info', text: 'No receipt has been issued for this form in this window. A receipt is issued when the form is submitted.' });

  const check = (): boolean => {
    setCheckedAll(true);
    if (!errors.length) {
      const notes = issues.filter((i) => i.level === 'notice').length;
      setStatus(notes ? `Entries checked. ${notes} note${notes > 1 ? 's' : ''}; the form may be submitted.` : 'Entries checked. The form may be submitted.');
      return true;
    }
    services.sound.play('error');
    setStatus(`${errors.length} block${errors.length > 1 ? 's' : ''} rejected. The form cannot be submitted.`);
    requestAnimationFrame(() => summaryRef.current?.focus());
    return false;
  };

  const startSubmit = () => {
    if (submitted) return setMessage({ title: 'Submit', kind: 'info', text: `This form has been submitted (receipt ${outcome!.receipt.receiptNo ?? 'not issued'}). Select New form to complete another copy.` });
    if (!spec) return;
    if (tab !== 'form') setTab('form');
    if (check()) setConfirm(true);
  };

  const doSubmit = () => {
    if (!spec || !doc) return;
    setConfirm(false);
    const flat = flattenValues(spec, values);
    const cctx: ConditionContext = { particulars: parts, docMarking: (d) => services.docs.byDocNo(d)?.marking };
    const refusal = matchRefusal(spec, flat, cctx);
    const notes: string[] = [];
    let reason: string | null = refusal?.message ?? null;
    let issueReceipt = refusal ? refusal.receipt : true;
    let watchGrant: string | null = null;

    if (!refusal && spec.formNo.toUpperCase() === 'OSC-F-126') {
      const comp = (flat.compartment ?? '').toUpperCase();
      const held = comp === 'ACTING-T2' ? services.session.actingTier2.peek() : services.clearance.satisfies(comp);
      const id = precheckAccessRequest({
        compartment: comp,
        sponsorPn: flat.sponsorPn ?? '',
        justification: Object.values(flat).join(' '),
        held,
        holders: holdersOf(canon.roster, comp),
        supervisorPn: op.supervisorPn,
        interimReview: !!services.session.flags.peek().interimReview,
      });
      if (id) {
        reason = spec.submit.responses.find((r) => r.id === id)?.text ?? 'Returned without action.';
        issueReceipt = true;
      } else {
        watchGrant = comp;
      }
    }

    const receiptNo = issueReceipt ? receiptNumber(spec.submit.receiptPrefix, receiptSerial(spec.formNo, countFor(spec.formNo)), spec.submit.receiptFormat) : null;
    const disposition = reason ? 'RETURNED' : 'ACCEPTED';
    if (!reason) {
      if (spec.submit.approvalNote) notes.push(spec.submit.approvalNote);
      const named: NamedResponses = HOLIDAY ? { memorialDay: (f: Record<string, string>, s: FormSpec) => spansDate(f, s, HOLIDAY) } : {};
      for (const r of matchResponses(spec, flat, cctx, named)) notes.push(r.text);
      notes.push(...spec.submit.notes);
    }

    // Watch for the decision before logging, so a synchronous grant by the narrative engine is seen.
    let granted = false;
    const unsub = watchGrant
      ? services.audit.subscribe((e) => {
          if (e.kind === 'clearance.grant' && e.subject.toUpperCase() === watchGrant) granted = true;
        })
      : null;

    const refs = fieldRefs(spec);
    const entries: [string, string, string][] = allFields(spec).map((f) => [refs[f.name] ?? '', f.label, flat[f.name] ?? '']);
    services.audit.log(
      'form.submit',
      spec.formNo,
      formatSubmitDetail({
        formNo: spec.formNo,
        title: spec.title,
        receiptNo,
        disposition,
        operatorId: services.session.operatorId.peek(),
        entries: entries.filter((e) => e[2] !== '').length,
        ...(reason ? { reason } : {}),
      }),
      submitData(spec.formNo, flat),
    );

    const receipt: StoredReceipt = {
      receiptNo,
      formNo: spec.formNo,
      title: spec.title,
      route: route.route,
      enteredAt: enteredAtNow(),
      disposition,
      message: reason ?? spec.submit.ack ?? 'Received for routing.',
      notes,
      routing: spec.routing,
      entries,
    };
    const finish = () => {
      unsub?.();
      if (watchGrant) {
        const id = watchGrant === 'ACTING-T2' ? 'actingApproved' : 'approved';
        const text = granted
          ? spec.submit.responses.find((r) => r.id === id)?.text
          : `Referred for review by the OIA compartment registry.${spec.processing ? ` ${spec.processing}` : ''}`;
        if (text) receipt.notes = [text, ...receipt.notes];
      }
      addReceipt(receipt);
      dropDraft(route.id);
      focusReceipt.current = true;
      setOutcome({ receipt });
      setTab('receipt');
      setStatus(disposition === 'ACCEPTED' ? `Submitted. Receipt ${receiptNo}.` : `Returned without action.${receiptNo ? ` Control ${receiptNo}.` : ''}`);
      services.notify(disposition === 'ACCEPTED' ? `${spec.formNo} entered into routing. Receipt ${receiptNo}.` : `${spec.formNo} returned without action.`, { from: 'Forms Center' });
      if (disposition === 'RETURNED') services.sound.play('error');
    };
    if (watchGrant) {
      win.setBusy(true);
      setStatus('Entering form into routing.');
      setTimeout(() => {
        win.setBusy(false);
        finish();
      }, 1200);
    } else finish();
  };

  const newForm = () => {
    if (!spec) return;
    setValues(fresh(spec));
    setTouched(new Set());
    setCheckedAll(false);
    setOutcome(null);
    setTab('form');
    dropDraft(route.id);
    setStatus('New copy of the form. Complete the blocks marked * and submit.');
  };

  const saveDraftNow = () => {
    if (!spec) return;
    if (submitted) return setMessage({ title: 'Save draft', kind: 'info', text: 'A submitted form is not saved as a draft. Its entries are on the receipt.' });
    saveDraft(route.id, { values, savedAt: enteredAtNow() });
    setStatus(`Draft saved ${enteredAtNow()}. It is held at this workstation only.`);
  };

  const resetParticulars = () => {
    if (!spec || submitted) return;
    const f = fresh(spec);
    setValues((cur) => {
      const next = { ...cur };
      for (const fs of allFields(spec)) if ((fs.prefill || OWN_NAME_FIELDS.has(fs.name)) && !isEmpty(f[fs.name])) next[fs.name] = f[fs.name]!;
      return next;
    });
    setStatus('Particulars re-entered from the session.');
  };

  const sigField = spec ? allFields(spec).find((f) => f.type === 'signature') : undefined;
  const toggleSignature = () => {
    if (!sigField || submitted) return setMessage({ title: 'Signature', kind: 'info', text: sigField ? 'The form has been submitted; the signature cannot be changed.' : 'This form has no signature block.' });
    setField(sigField.name, isEmpty(values[sigField.name]) ? op.displayName : '');
  };

  const xrefs = doc?.xrefs ?? [];
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&New form', onSelect: newForm },
        { label: '&Save draft', shortcut: 'Ctrl+S', onSelect: saveDraftNow },
        { label: 'S&ubmit for routing', shortcut: 'Ctrl+Enter', onSelect: startSubmit },
        { separator: true },
        { label: '&Print form and instructions', shortcut: 'Ctrl+P', onSelect: () => services.print(route.id) },
        { separator: true },
        { label: 'Forms &catalogue', onSelect: () => win.navigate('/forms') },
        { label: 'C&lose', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Check entries', shortcut: 'F7', onSelect: () => (submitted ? setMessage({ title: 'Check entries', kind: 'info', text: 'The form has been submitted. Its entries were checked on submission.' }) : void check()) },
        { label: 'Re-enter &particulars from session', onSelect: resetParticulars },
        { label: isEmpty(sigField ? values[sigField.name] : undefined) ? 'Apply &signature' : 'Withdraw &signature', onSelect: toggleSignature },
        { separator: true },
        { label: 'Clear &all entries', onSelect: newForm },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Form', radio: true, checked: tab === 'form', onSelect: () => setTab('form') },
        { label: '&Instructions', shortcut: 'F1', radio: true, checked: tab === 'instructions', onSelect: () => setTab('instructions') },
        { label: '&Receipt', radio: true, checked: tab === 'receipt', onSelect: () => (outcome ? setTab('receipt') : refusedReceipt()) },
      ],
    },
    {
      label: '&Go',
      items: xrefs.length
        ? xrefs.map((x) => ({ label: `${x.docNo}  ${x.title}`, onSelect: () => services.openRoute(x.route) }))
        : [{ label: 'References', onSelect: () => setMessage({ title: 'References', kind: 'info', text: `${route.docNo} cites no other record.` }) }],
    },
    {
      label: '&Help',
      items: [
        { label: 'Form &instructions', shortcut: 'F1', onSelect: () => setTab('instructions') },
        { label: '&About Forms Center', onSelect: () => setMessage({ title: 'About Forms Center', kind: 'info', text: ABOUT }) },
      ],
    },
  ];

  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k === 'enter') {
      e.preventDefault();
      startSubmit();
    } else if (e.ctrlKey && k === 's') {
      e.preventDefault();
      saveDraftNow();
    } else if (e.ctrlKey && k === 'p') {
      e.preventDefault();
      services.print(route.id);
    } else if (e.key === 'F1') {
      e.preventDefault();
      setTab('instructions');
    } else if (e.key === 'F7') {
      e.preventDefault();
      if (!submitted) check();
    }
  };

  if (failed) {
    return (
      <div class="fx-root">
        <ErrorState code="RD-DOC-0410" title="The form could not be retrieved" body={`${route.docNo} is listed on the index but its record was not returned by the document store. Try again later or report the fault to the MERIDIAN Service Desk.`} />
      </div>
    );
  }

  const required = spec ? allFields(spec).filter((f) => f.required) : [];
  const requiredDone = required.filter((f) => !isEmpty(values[f.name])).length;
  const showHistory = spec?.history ? historyAllowed(spec.history.requires, flags, services.clearance.satisfies) : false;
  const state = outcome ? (outcome.receipt.disposition === 'ACCEPTED' ? 'SUBMITTED' : 'RETURNED') : spec ? 'DRAFT' : 'LOADING';

  return (
    <div class="fx-root" onKeyDown={onKeyDown}>
      <MenuBar menus={menus} label={`${route.docNo} menu`} />
      <Toolbar label="Form">
        <ToolbarButton label="Catalo&gue" title="Forms catalogue" onClick={() => win.navigate('/forms')} />
        <ToolbarSeparator />
        <ToolbarButton label="Sub&mit" title="Submit for routing (Ctrl+Enter)" onClick={startSubmit} />
        <ToolbarButton label="Chec&k" title="Check entries (F7)" onClick={() => (submitted ? setMessage({ title: 'Check entries', kind: 'info', text: 'The form has been submitted. Its entries were checked on submission.' }) : void check())} />
        <ToolbarButton label="Sa&ve draft" title="Save draft (Ctrl+S)" onClick={saveDraftNow} />
        <ToolbarButton label="&New form" onClick={newForm} />
        <ToolbarSeparator />
        <ToolbarButton label="&Print" title="Print form and instructions (Ctrl+P)" onClick={() => services.print(route.id)} />
        <ToolbarSpacer />
      </Toolbar>
      <div class="fx-body">
        <Tabs
          label={`${route.docNo} views`}
          panel="flush"
          active={tab}
          onChange={(t) => (t === 'receipt' && !outcome ? refusedReceipt() : setTab(t as Tab))}
          tabs={[
            { id: 'form', label: '&Form' },
            { id: 'instructions', label: 'I&nstructions' },
            { id: 'receipt', label: '&Receipt' },
          ]}
        >
          <div class="fx-scroll fx-paper">
            {!doc || !spec ? (
              doc && !spec ? (
                <EmptyState title="No fill-in copy" body={`${route.docNo} is issued as a printed form only. Its instructions are on the Instructions tab.`} icon="folder" />
              ) : (
                <div class="fx-loading" role="status">Retrieving {route.docNo}.</div>
              )
            ) : tab === 'instructions' ? (
              <DocumentView
                doc={doc}
                markings={canon.markings}
                onNavigate={services.openRoute}
                onRedactionHover={(i) => services.audit.log('redaction.hover', doc.docNo, `Operator ${services.session.operatorId.peek()} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)}
                slots={{ Seal }}
              />
            ) : tab === 'receipt' && outcome ? (
              <ReceiptView r={outcome.receipt} focusHead={focusReceipt} />
            ) : (
              <>
                {showHistory && <History spec={spec} />}
                {checkedAll && errors.length > 0 && (
                  <div class="fx-summary" ref={summaryRef} tabIndex={-1} role="alert" aria-label="Rejected blocks">
                    <div class="fx-summary__head">FORM NOT ACCEPTED: {errors.length} BLOCK{errors.length > 1 ? 'S' : ''} REJECTED</div>
                    {errors.map((i, k) => (
                      <button key={k} type="button" class="fx-summary__item" onClick={() => focusField(i.field)}>
                        <FieldMessage live={false}>{i.message}</FieldMessage>
                      </button>
                    ))}
                  </div>
                )}
                <FormSheet class={submitted ? 'fx-sheet is-submitted' : 'fx-sheet'}>
                  <FormHeader
                    formNo={spec.formNo}
                    title={spec.title.toUpperCase()}
                    agencyLine={`${canon.meta.agency.toUpperCase()} · ${originatorLine(route.originator)}`}
                    subtitle={spec.edition ? `Edition ${spec.edition}. Blocks marked * must be completed.` : 'Blocks marked * must be completed.'}
                    seal={<Seal size={40} variant="mono" />}
                    privacyNote={typeof doc.frontmatter.authority === 'string' ? <><b>AUTHORITY AND USE:</b> {doc.frontmatter.authority}</> : undefined}
                  />
                  <FieldGrid
                    spec={spec}
                    values={values}
                    issues={shown}
                    readOnly={submitted}
                    idPrefix={idPrefix}
                    satisfies={services.clearance.satisfies}
                    facilityOptions={FACILITY_OPTIONS}
                    signer={{ name: op.displayName, date: formatInWorldDate(), seed: 7 }}
                    lookupPn={lookupPn}
                    lookupDoc={(d) => {
                      const r = services.docs.byDocNo(d);
                      return r ? { docNo: r.docNo, title: r.title } : undefined;
                    }}
                    onChange={setField}
                    onBlur={blurField}
                    onRedactionHover={onRedactionHover}
                  />
                  {spec.routing.length > 0 && (
                    <div class="fx-routing">
                      <div class="fx-routing__head">ROUTING ON SUBMISSION</div>
                      <ol>
                        {spec.routing.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ol>
                      {spec.processing ? <p>{spec.processing}</p> : null}
                    </div>
                  )}
                  <FormFooter formNo={spec.formNo} edition={spec.edition ?? formatOscDate(route.date).slice(3)} page="PAGE 1 OF 1" barcode={`${spec.formNo.replace(/^OSC-/, '')}-${(spec.edition ?? '').replace(/\D/g, '')}`} />
                </FormSheet>
                {!submitted && (
                  <ButtonRow>
                    <Button label="Chec&k entries" onClick={() => void check()} />
                    <Button variant="primary" label="S&ubmit for routing" onClick={startSubmit} />
                  </ButtonRow>
                )}
              </>
            )}
          </div>
        </Tabs>
      </div>
      <StatusBar
        panes={[
          { id: 'msg', fill: true, content: status },
          { id: 'req', width: 140, content: spec ? `Required ${requiredDone} of ${required.length}` : '' },
          { id: 'rej', width: 110, content: checkedAll || touched.size ? `Rejected ${errors.length}` : 'Not checked' },
          { id: 'state', width: 96, content: state },
          { id: 'mark', width: 170, content: markingLabel(doc?.marking ?? route.marking) },
        ]}
      />
      <Dialog
        open={confirm}
        title={`Submit ${spec?.formNo ?? ''}`}
        kind="question"
        reference={spec?.edition ? `${spec.formNo} (EDITION ${spec.edition})` : undefined}
        buttons={[
          { label: '&Submit', value: 'submit', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => (v === 'submit' ? doSubmit() : setConfirm(false))}
      >
        <p class="fx-dlg">
          The form will be signed from your token and entered into routing{spec?.routing.length ? ` to ${spec.routing[0]}` : ''}. Entries cannot be changed after submission.
        </p>
      </Dialog>
      <Dialog open={message !== null} title={message?.title ?? ''} kind={message?.kind ?? 'info'} onClose={() => setMessage(null)}>
        <p class="fx-dlg">{message?.text}</p>
      </Dialog>
    </div>
  );
}

function originatorLine(originator: string): string {
  const [div, site] = originator.split('/');
  const d = canon.divisions.find((x) => x.id === div);
  return d ? `${d.name.toUpperCase()}${site ? `, ${site}` : ''}` : originator;
}

function lookupPn(pn: string): DirectoryEntry | undefined {
  if (pn === op.pn) return { pn, name: op.displayName, role: 'Operator of this workstation', site: op.site };
  const p = canon.roster.find((r) => r.pn === pn);
  return p ? { pn, name: p.name, role: p.role, site: p.site } : undefined;
}

function historyAllowed(requires: string, flags: Record<string, boolean>, satisfies: (k: string) => boolean): boolean {
  const m = /^flag:(.+)$/.exec(requires);
  return m ? !!flags[m[1]!] : satisfies(requires);
}

/** Receipt history for forms gated on a narrative flag (OSC-F-131, "Declarations this period"). */
function History({ spec }: { spec: FormSpec }) {
  const own = receipts.value.filter((r) => r.formNo === spec.formNo);
  const rows = [
    ...(DECLARATIONS_CLOSE ? [{ label: 'Collection closes', value: `${DECLARATIONS_CLOSE.dateText} ${DECLARATIONS_CLOSE.timeText}`, mono: true }] : []),
    { label: 'Carried DETACHED / UNPOSTED at last return', value: formatNumber(canon.headline.staffUnposted), mono: true },
    { label: 'Declarations from this workstation', value: own.length ? own.map((r) => `${r.receiptNo ?? 'NOT ISSUED'} (${r.enteredAt.slice(0, 11)})`).join('; ') : 'None', mono: true },
  ];
  return (
    <div class="fx-history">
      <GroupBox title={spec.history!.label.toUpperCase()} on="paper">
        <PropertyGrid rows={rows} />
      </GroupBox>
    </div>
  );
}

/* ============================================================= receipt */

function ReceiptView({ r, focusHead }: { r: StoredReceipt; focusHead?: { current: boolean } }) {
  const services = useServices();
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!focusHead?.current) return;
    focusHead.current = false;
    // After the confirm dialog has handed focus back.
    requestAnimationFrame(() => headRef.current?.focus());
  }, [r]);
  return (
    <div class="fx-receipt">
      <div class={r.disposition === 'ACCEPTED' ? 'fx-disp' : 'fx-disp fx-disp--returned'}>
        <h2 class="fx-disp__head" ref={headRef} tabIndex={-1}>
          {r.disposition === 'ACCEPTED' ? 'ACCEPTED FOR ROUTING' : 'RETURNED WITHOUT ACTION'}
        </h2>
        <p>{r.message}</p>
        {r.notes.map((n, i) => (
          <p key={i} class="fx-disp__note">
            {n}
          </p>
        ))}
      </div>
      {r.disposition === 'ACCEPTED' && r.receiptNo ? (
        <ReceiptSlip receiptNo={r.receiptNo} formNo={r.formNo} title={r.title} submittedAt={r.enteredAt} routing={r.routing} submittedBy={services.session.operatorId.peek()} />
      ) : (
        <div class="fx-return">
          <PropertyGrid
            caption="RETURN NOTICE"
            rows={[
              { label: 'Form', value: `${r.formNo} ${r.title}` },
              { label: 'Entered', value: r.enteredAt, mono: true },
              { label: 'Control number', value: r.receiptNo ?? 'Not issued', mono: true },
              { label: 'Action', value: 'None. The form has not been forwarded.' },
            ]}
          />
          {r.receiptNo ? <Barcode value={r.receiptNo} height={26} /> : null}
        </div>
      )}
      <table class="fx-entries">
        <caption>ENTRIES AS SUBMITTED</caption>
        <thead>
          <tr>
            <th scope="col">Block</th>
            <th scope="col">Entry</th>
            <th scope="col">As entered</th>
          </tr>
        </thead>
        <tbody>
          {r.entries.map(([ref, label, value]) => (
            <tr key={ref + label}>
              <td class="fx-mono">{ref}</td>
              <td>{label}</td>
              <td class="fx-mono">{value || '(blank)'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

