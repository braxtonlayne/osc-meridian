/**
 * Audit review (pass two, docs/SPEC-2.md §1): an Office of Internal Assurance auditor reads any
 * issued account's workstation audit trail (read only, services.account.readAudit), filters it,
 * and opens findings that reach the audited account as a `finding` trace (delivered there as a
 * message and a `trace` audit line). Findings register lists every finding on the network.
 * Every other operator gets an in-world refusal.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AccountDef, AccountId, AuditEntry, Trace } from '@core/contracts';
import { useServices } from '@core/services';
import { WORKSTATION_ID } from '@core/audit';
import { Button, ButtonRow, DataTable, Dialog, GroupBox, PropertyGrid, Select, Tabs, TextArea, TextField, formatNumber, type Column } from '@design/index';
import { EmptyState, ErrorState, RefusalState } from '@graphics/states';
import { ACTION_LABELS, FINDING_CATEGORIES, REVIEW_KINDS, actionLabel, auditDate, auditRef, auditTime, filterTrail, findingRef, trailDates } from './logic';
import { divisionName, useGridCols } from './shared';

type Load = { status: 'loading' } | { status: 'ready'; entries: AuditEntry[] } | { status: 'failed'; message: string };

const TEXT_MAX = 1200;

/** Division label for an account (facility command posts carry 'CMD', which is not a division). */
function divisionLabel(a: AccountDef): string {
  if (a.divisionId === 'CMD') return 'Facility Command';
  return divisionName(a.divisionId) ?? a.divisionId;
}

export function AuditReview() {
  const services = useServices();
  const me = services.account.def.value;
  const logged = useRef(false);
  useEffect(() => {
    if (me.auditReader || logged.current) return;
    logged.current = true;
    services.audit.log('window.open', 'Audit review', `Operator ${services.session.operatorId.peek()} requested Assurance audit review. Request refused: open to Office of Internal Assurance auditors only (OSC-ASR-PSEC).`);
    services.sound.play('error');
  }, [me.auditReader]);
  if (!me.auditReader) {
    return (
      <div class="asr-refusal">
        <RefusalState
          heading="Audit review is controlled"
          authority="Office of Internal Assurance"
          reference="OSC-ASR-PSEC"
          requirement="Office of Internal Assurance auditor"
          reason={`Workstation audit trails are read by Office of Internal Assurance auditors only. Operator ${services.session.operatorId.value} may read their own record under Your session activity.`}
        />
      </div>
    );
  }
  return <Review />;
}

function Review() {
  const services = useServices();
  const [tab, setTab] = useState<'trail' | 'register'>('trail');
  const findings = services.traces.all.value.filter((t) => t.kind === 'finding');
  return (
    <div class="asr-view asr-review">
      <div class="asr-viewhead">
        <div>
          <div class="asr-h1">Audit review</div>
          <div class="asr-sub">Workstation audit trails of the issued operator accounts at {WORKSTATION_ID}, read only. Findings opened here are recorded against the operator and delivered to them.</div>
        </div>
      </div>
      <Tabs
        label="Audit review"
        active={tab}
        onChange={(t) => setTab(t as 'trail' | 'register')}
        tabs={[
          { id: 'trail', label: 'Audit &trail' },
          { id: 'register', label: `&Findings register (${findings.length})` },
        ]}
      >
        {tab === 'trail' ? <Trail findings={findings} /> : <Register findings={findings} />}
      </Tabs>
    </div>
  );
}

function Trail({ findings }: { findings: Trace[] }) {
  const services = useServices();
  const gridCols = useGridCols();
  const me = services.account.def.value;
  const accounts = services.account.all();
  const [who, setWho] = useState<AccountId>(accounts.find((a) => a.id !== me.id)?.id ?? me.id);
  const [nonce, setNonce] = useState(0);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [kind, setKind] = useState('all');
  const [date, setDate] = useState('all');
  const [text, setText] = useState('');
  const [basis, setBasis] = useState<string[]>([]);
  const [compose, setCompose] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [category, setCategory] = useState(FINDING_CATEGORIES[0]!.id);
  const [finding, setFinding] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const target = accounts.find((a) => a.id === who)!;

  useEffect(() => {
    let live = true;
    setLoad({ status: 'loading' });
    setBasis([]);
    services.account
      .readAudit(who)
      .then((entries) => {
        if (!live) return;
        setLoad({ status: 'ready', entries });
        services.audit.log(
          'control',
          'assurance:review',
          `Operator ${services.session.operatorId.peek()} read the workstation audit trail of operator ${target.operatorId} (${formatNumber(entries.length)} entries) under OSC-ASR-PSEC. Read only.`,
          { operator: who, entries: String(entries.length) },
        );
      })
      .catch((e: unknown) => live && setLoad({ status: 'failed', message: e instanceof Error ? e.message : 'The audit trail could not be read.' }));
    return () => {
      live = false;
    };
  }, [who, nonce]);

  const entries = load.status === 'ready' ? load.entries : [];
  const dates = useMemo(() => trailDates(entries), [entries]);
  const rows = useMemo(() => filterTrail(entries, { kind, date, text }), [entries, kind, date, text]);
  const first = entries[0]?.at;
  const last = entries[entries.length - 1]?.at;
  const against = findings.filter((f) => f.to === who);
  const basisRefs = entries.filter((e) => basis.includes(String(e.seq))).map(auditRef);

  const cols: Column<AuditEntry>[] = [
    { key: 'ref', header: 'Audit reference', width: 132, mono: true, sortValue: (e) => e.seq, render: (e) => auditRef(e) },
    { key: 'date', header: 'Date', width: 92, mono: true, render: (e) => auditDate(e.at) },
    { key: 'time', header: 'Time', width: 128, mono: true, sortValue: (e) => e.at, render: (e) => auditTime(e.at) },
    { key: 'act', header: 'Action', width: 160, sortValue: (e) => actionLabel(e), render: (e) => actionLabel(e) },
    { key: 'subj', header: 'Item', width: 130, mono: true, sortValue: (e) => e.subject, render: (e) => e.subject },
    { key: 'det', header: 'Record', wrap: true, render: (e) => e.detail },
  ];

  const startFinding = () => {
    setError(null);
    setDone(null);
    setCompose(true);
  };
  const checkFinding = () => {
    if (finding.trim().length < 20) return setError('State the finding in at least one sentence.');
    setError(null);
    setCompose(false);
    setConfirm(true);
  };
  const file = () => {
    setConfirm(false);
    const ref = findingRef(findings.length);
    const cat = FINDING_CATEGORIES.find((c) => c.id === category)!;
    const t = services.traces.post({
      kind: 'finding',
      to: who,
      subject: ref,
      data: {
        ref,
        text: finding.trim(),
        category: cat.label,
        basis: basisRefs.join(', '),
        _by: services.session.operatorId.peek(),
        _byRole: me.roleTitle,
      },
    });
    services.audit.log(
      'control',
      'assurance:finding',
      `Finding ${ref} (${cat.label}) opened by operator ${services.session.operatorId.peek()} against operator ${target.operatorId}${basisRefs.length ? ` on ${basisRefs.length} audit entr${basisRefs.length === 1 ? 'y' : 'ies'}` : ''}. Delivered as routed item ${t.id}.`,
      { ref, operator: who, category: cat.id, basis: basisRefs.join(','), trace: t.id },
    );
    services.sound.play('button');
    services.notify(`Finding ${ref} recorded against operator ${target.operatorId}.`, { from: 'Office of Internal Assurance' });
    setDone(`Finding ${ref} recorded against operator ${target.operatorId} and delivered as routed item ${t.id}.`);
    setFinding('');
    setBasis([]);
  };

  return (
    <div class="asr-reviewpane">
      <div class="asr-filterbar">
        <Select
          label="Operator"
          value={who}
          onChange={(v) => setWho(v as AccountId)}
          options={accounts.map((a) => ({ value: a.id, label: `${a.operatorId}  ${a.roleTitle}${a.id === me.id ? ' (this operator)' : ''}` }))}
        />
        <Button label="Re&fresh" onClick={() => setNonce((n) => n + 1)} />
      </div>
      <GroupBox title="Operator under review" on="surface">
        <PropertyGrid
          columns={gridCols}
          rows={[
            { label: 'Operator', value: target.operatorId, mono: true },
            { label: 'Post', value: target.roleTitle },
            { label: 'Division', value: divisionLabel(target) },
            { label: 'Site', value: target.site, mono: true },
            { label: 'Tier', value: String(target.tier), mono: true },
            { label: 'Compartments at issue', value: target.compartments.length ? target.compartments.join(', ') : 'None' },
            { label: 'Entries held', value: load.status === 'ready' ? formatNumber(entries.length) : load.status === 'loading' ? 'Reading' : 'Not read', mono: true },
            { label: 'Period', value: first && last ? `${auditDate(first)} ${auditTime(first)} to ${auditDate(last)} ${auditTime(last)}` : 'No entries', mono: true },
            { label: 'Findings recorded', value: against.length ? against.map((f) => f.subject).join(', ') : 'None', mono: true },
          ]}
        />
      </GroupBox>
      <div class="asr-filterbar">
        <Select
          label="Show"
          value={kind}
          onChange={setKind}
          options={[{ value: 'all', label: 'All recorded actions' }, { value: 'refusals', label: 'Requests refused' }, ...REVIEW_KINDS.map((k) => ({ value: k, label: ACTION_LABELS[k] }))]}
        />
        <Select label="Date" value={date} onChange={setDate} options={[{ value: 'all', label: 'All dates' }, ...dates.map((d) => ({ value: d, label: auditDate(`${d}T12:00:00Z`) }))]} />
        <TextField label="Contains" value={text} onInput={setText} width={18} type="search" />
      </div>
      {load.status === 'failed' ? (
        <ErrorState code="OIA-AUD-0403" title="The audit trail could not be read" body={load.message} />
      ) : (
        <DataTable
          label={`Audit trail of operator ${target.operatorId}, newest first`}
          columns={cols}
          rows={rows}
          rowKey={(e) => String(e.seq)}
          sortRows={false}
          selection="multi"
          selected={basis}
          onSelectionChange={setBasis}
          dense
          empty={
            load.status === 'loading' ? (
              <EmptyState title="Reading the trail" body={`Reading the workstation audit trail of operator ${target.operatorId}.`} icon="search" />
            ) : (
              <EmptyState title="No entries" body={entries.length ? 'No recorded actions match the selected filter.' : `No action has been recorded for operator ${target.operatorId} at this workstation.`} icon="search" />
            )
          }
        />
      )}
      <ButtonRow>
        <span class="asr-note">{basis.length ? `${basis.length} entr${basis.length === 1 ? 'y' : 'ies'} marked as basis.` : 'Mark entries (Ctrl+click) to cite them as the basis of a finding.'}</span>
        <Button variant="primary" label="&Open finding..." onClick={startFinding} />
      </ButtonRow>
      {done && <p class="asr-note" role="status">{done}</p>}
      <Dialog
        open={compose}
        title={`Open finding: operator ${target.operatorId}`}
        kind="question"
        reference={`Next reference ${findingRef(findings.length)}`}
        buttons={[
          { label: '&Continue', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => (v === 'ok' ? checkFinding() : setCompose(false))}
      >
        <div class="asr-findingform">
          <Select label="Category" value={category} onChange={setCategory} options={FINDING_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} layout="stacked" />
          <TextArea label="Finding" layout="stacked" value={finding} onInput={setFinding} rows={5} maxLength={TEXT_MAX} showCount error={error} />
          <p class="asr-note">Basis: {basisRefs.length ? basisRefs.join(', ') : 'no audit entry cited'}.</p>
        </div>
      </Dialog>
      <Dialog
        open={confirm}
        title="Record finding"
        kind="question"
        reference="OSC-ASR-PSEC"
        buttons={[
          { label: '&Record', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => (v === 'ok' ? file() : setConfirm(false))}
      >
        <p>
          Finding {findingRef(findings.length)} will be recorded against operator {target.operatorId} and delivered to their workstation profile. A recorded finding is not withdrawn from the workstation.
        </p>
      </Dialog>
    </div>
  );
}

function Register({ findings }: { findings: Trace[] }) {
  const services = useServices();
  const accounts = services.account.all();
  const rows = useMemo(() => findings.slice().reverse(), [findings]);
  const [sel, setSel] = useState<string | null>(rows[0]?.id ?? null);
  const cur = rows.find((f) => f.id === sel) ?? null;
  const opOf = (id: string) => accounts.find((a) => a.id === id)?.operatorId ?? id;
  const delivered = (f: Trace) => (f.to === 'all' ? 'ALL OPERATORS' : (f.seenBy ?? []).includes(f.to as AccountId) ? 'DELIVERED' : 'AWAITING SIGN-IN');
  const cols: Column<Trace>[] = [
    { key: 'ref', header: 'Reference', width: 120, mono: true, sortValue: (f) => f.subject, render: (f) => f.subject },
    { key: 'op', header: 'Operator', width: 120, mono: true, sortValue: (f) => opOf(f.to), render: (f) => (f.to === 'all' ? 'ALL' : opOf(f.to)) },
    { key: 'cat', header: 'Category', sortValue: (f) => f.data?.category ?? '', render: (f) => f.data?.category ?? '' },
    { key: 'at', header: 'Opened', width: 92, mono: true, sortValue: (f) => f.at, render: (f) => auditDate(f.at) },
    { key: 'by', header: 'Opened by', width: 120, mono: true, render: (f) => f.data?._by ?? opOf(f.from) },
    { key: 'st', header: 'Delivery', width: 130, render: delivered },
  ];
  return (
    <div class="asr-reviewpane">
      <DataTable
        label="Findings register"
        columns={cols}
        rows={rows}
        rowKey={(f) => f.id}
        selection="single"
        selected={sel ? [sel] : []}
        onSelectionChange={(k) => setSel(k[0] ?? null)}
        dense
        empty={<EmptyState title="No findings recorded" body="No audit finding has been recorded against an operator account at this workstation." icon="tray" />}
      />
      {cur && (
        <GroupBox title={`FINDING ${cur.subject}`} on="surface">
          <PropertyGrid
            rows={[
              { label: 'Operator', value: cur.to === 'all' ? 'All operators' : `${opOf(cur.to)}, ${accounts.find((a) => a.id === cur.to)?.roleTitle ?? ''}` },
              { label: 'Category', value: cur.data?.category ?? '' },
              { label: 'Opened', value: `${auditDate(cur.at)} ${auditTime(cur.at)}`, mono: true },
              { label: 'Opened by', value: `${cur.data?._by ?? opOf(cur.from)}${cur.data?._byRole ? `, ${cur.data._byRole}` : ''}` },
              { label: 'Basis', value: cur.data?.basis || 'No audit entry cited', mono: true },
              { label: 'Routed item', value: cur.id, mono: true },
              { label: 'Delivery', value: delivered(cur) },
            ]}
          />
          <p class="asr-findingtext">{cur.data?.text ?? ''}</p>
        </GroupBox>
      )}
      <p class="asr-note">Findings are retained with the audit trail of the operator concerned and are not withdrawn from the workstation.</p>
    </div>
  );
}
