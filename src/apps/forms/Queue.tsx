/**
 * Forms Center, Action queue (pass two). Shown only to an account with approval authority
 * (`AccountDef.approves`). Lists `form.routed` traces addressed to this account, opens the
 * filed form read-only with the filer's entries, and returns a decision to the filer as a
 * `form.decided` trace. Audit: `control` subject `forms:decide`.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { AccountId, DocJson, Trace, WindowHandle } from '@core/contracts';
import { useServices } from '@core/services';
import { formatInWorldDate } from '@core/session';
import { Button, ButtonRow, DataTable, Dialog, GroupBox, PropertyGrid, TextArea, formatOscDate, type Column } from '@design/index';
import { FormFooter, FormHeader, FormSheet } from '@graphics/forms';
import { Seal } from '@graphics/seal';
import { EmptyState } from '@graphics/states';
import { allFields, parseFormSpec, type FormSpec, type Values } from './model';
import { FieldGrid } from './Fields';
import { META, actionQueue, decidedTrace, decisionLine, grantFor, routedEntries, routedFields, unflatten, type Decision, type QueueItem } from './routing';

const canon = canonJson as unknown as Canon;
const NOTE_MAX = 600;

/** Forms awaiting this account's decision. */
export function pendingCount(me: AccountId, all: readonly Trace[]): number {
  return actionQueue(me, all).filter((q) => q.state === 'pending').length;
}

const STATE_LABEL: Record<QueueItem['state'], string> = { pending: 'AWAITING DECISION', approved: 'APPROVED', denied: 'NOT APPROVED' };

export function ActionQueue({ win }: { win: WindowHandle }) {
  const services = useServices();
  const me = services.account.def.value;
  const items = useMemo(() => actionQueue(me.id, services.traces.all.value), [services.traces.all.value, me.id]);
  const [sel, setSel] = useState<string | null>(items.find((q) => q.state === 'pending')?.routed.id ?? items[0]?.routed.id ?? null);
  const cur = items.find((q) => q.routed.id === sel) ?? null;

  const cols: Column<QueueItem>[] = [
    { key: 'no', header: 'Receipt No.', mono: true, width: 150, sortValue: (q) => q.routed.subject, render: (q) => q.routed.subject },
    { key: 'form', header: 'Form', mono: true, width: 84, sortValue: (q) => q.routed.data?.form ?? '', render: (q) => q.routed.data?.form ?? '' },
    { key: 'title', header: 'Title', sortValue: (q) => q.routed.data?.[META.title] ?? '', render: (q) => q.routed.data?.[META.title] ?? '' },
    { key: 'by', header: 'Filed by', mono: true, width: 110, sortValue: (q) => q.routed.data?.[META.filer] ?? '', render: (q) => q.routed.data?.[META.filer] ?? q.routed.from },
    { key: 'state', header: 'State', width: 130, sortValue: (q) => q.state, render: (q) => STATE_LABEL[q.state] },
  ];

  return (
    <div class="fx-split fx-split--queue">
      <div class="fx-split__list">
        <DataTable
          flexMin={160}
          label="Action queue"
          columns={cols}
          rows={items}
          rowKey={(q) => q.routed.id}
          selection="single"
          selected={sel ? [sel] : []}
          onSelectionChange={(k) => setSel(k[0] ?? null)}
          dense
          empty={<EmptyState title="No forms routed" body={`No form has been routed to the ${me.roleTitle} for decision.`} icon="tray" />}
        />
      </div>
      <div class="fx-split__detail fx-paper fx-queue__detail">
        {cur ? <QueueDetail key={cur.routed.id} item={cur} win={win} /> : <EmptyState title="No form selected" body="Select a routed form to read it and record a decision." icon="tray" />}
      </div>
    </div>
  );
}

function QueueDetail({ item, win }: { item: QueueItem; win: WindowHandle }) {
  const services = useServices();
  const me = services.account.def.value;
  const { routed } = item;
  const d = routed.data ?? {};
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [doc, setDoc] = useState<DocJson | null>(null);
  const filer = services.account.all().find((a) => a.id === routed.from);

  useEffect(() => {
    if (!(routed.seenBy ?? []).includes(me.id)) services.traces.markSeen(routed.id);
    const entry = services.docs.byRoute(d[META.route] ?? '') ?? services.docs.byDocNo(d.form ?? '');
    let live = true;
    if (entry) {
      services.docs
        .load(entry.id)
        .then((x) => {
          if (!live) return;
          setDoc(x);
          services.audit.log('doc.read', d.form ?? x.docNo, `Operator ${services.session.operatorId.peek()} displayed ${d.form ?? x.docNo} receipt ${routed.subject} routed for decision (item ${routed.id}).`);
        })
        .catch(() => undefined);
    }
    win.setStatus(`Routed item ${routed.id}: ${d.form ?? ''} receipt ${routed.subject}.`);
    return () => {
      live = false;
    };
  }, [routed.id]);

  const spec = useMemo<FormSpec | null>(() => (doc ? parseFormSpec(doc.frontmatter, { docNo: doc.docNo, title: doc.title }) : null), [doc]);
  const values = useMemo<Values>(() => {
    if (!spec) return {};
    const multi = new Set(allFields(spec).filter((f) => f.multi).map((f) => f.name));
    return unflatten(routedFields(routed), multi);
  }, [spec, routed.id]);
  const grant = grantFor(routed, 'approved');

  const decide = (decision: Decision) => {
    setConfirm(null);
    const t = services.traces.post(decidedTrace({ routed, decision, note, approver: me }));
    services.traces.markSeen(routed.id);
    services.audit.log(
      'control',
      'forms:decide',
      `${d.form ?? 'Form'} receipt ${routed.subject} filed by operator ${d[META.filer] ?? routed.from} ${decision === 'approved' ? 'approved' : 'not approved'} by operator ${services.session.operatorId.peek()} (${me.roleTitle}). Decision returned to the filer as routed item ${t.id}.`,
      { form: d.form ?? '', receipt: routed.subject, decision, filer: routed.from, routed: routed.id, returned: t.id, note: note.trim(), ...(decision === 'approved' && grant ? { grant } : {}) },
    );
    services.sound.play(decision === 'approved' ? 'button' : 'switch');
    services.notify(`Decision on ${routed.subject} returned to operator ${d[META.filer] ?? routed.from}.`, { from: 'Forms Center' });
    win.setStatus(`Decision recorded on ${routed.subject}. Returned as routed item ${t.id}.`);
    setNote('');
  };

  const particulars = [
    { label: 'Routed item', value: routed.id, mono: true },
    { label: 'Receipt', value: routed.subject, mono: true },
    { label: 'Form', value: `${d.form ?? ''} ${d[META.title] ?? ''}` },
    { label: 'Filed by', value: `${d[META.filer] ?? routed.from}${filer ? `, ${filer.roleTitle}` : d[META.filerRole] ? `, ${d[META.filerRole]}` : ''}` },
    { label: 'Entered', value: d[META.entered] ?? routed.at, mono: true },
    { label: 'Received', value: formatOscDate(routed.at.slice(0, 10)), mono: true },
    { label: 'State', value: STATE_LABEL[item.state] },
  ];
  const entries = routedEntries(routed);

  return (
    <div class="fx-queue">
      <PropertyGrid caption="ROUTED FOR DECISION" rows={particulars} />
      {item.decided ? (
        <div class={item.state === 'approved' ? 'fx-disp' : 'fx-disp fx-disp--returned'}>
          <h3 class="fx-disp__head">{STATE_LABEL[item.state]}</h3>
          <p>{decisionLine(item.decided)}</p>
          <p class="fx-disp__note fx-mono">Returned to the filer as routed item {item.decided.id}.</p>
        </div>
      ) : (
        <GroupBox title="DECISION" on="paper">
          <p class="fx-queue__basis">
            {grant
              ? `Approval reads operator ${d[META.filer] ?? routed.from} into ${grant} under OSC-DIR-0412 para 4(b), effective at the applicant's next sign-in.`
              : (d.form ?? '').toUpperCase() === 'OSC-F-126'
                ? `${(d.compartment ?? '').toUpperCase() || 'The item requested'} is not read in on request (OSC-ASR-CG para 4.3). An approval is recorded and returned; it does not read the applicant in.`
                : 'The decision is returned to the filer and entered against the receipt.'}
          </p>
          <TextArea label="Remarks to the filer" layout="stacked" value={note} onInput={setNote} rows={3} maxLength={NOTE_MAX} showCount />
          <ButtonRow>
            <Button variant="primary" label="&Approve" onClick={() => setConfirm('approved')} />
            <Button label="&Not approved" onClick={() => setConfirm('denied')} />
          </ButtonRow>
        </GroupBox>
      )}
      {spec && doc ? (
        <FormSheet class="fx-sheet is-submitted">
          <FormHeader
            formNo={spec.formNo}
            title={spec.title.toUpperCase()}
            agencyLine={`${canon.meta.agency.toUpperCase()} · FILED COPY, RECEIPT ${routed.subject}`}
            subtitle={`Entries as filed by operator ${d[META.filer] ?? routed.from}. Read only.`}
            seal={<Seal size={40} variant="mono" />}
          />
          <FieldGrid
            spec={spec}
            values={values}
            issues={new Map()}
            readOnly
            idPrefix={`fxq-${routed.id}`}
            satisfies={services.clearance.satisfies}
            facilityOptions={canon.facilities.map((f) => ({ value: f.id, label: f.id }))}
            signer={{ name: filer?.displayName ?? d[META.filer] ?? routed.from, date: formatInWorldDate(new Date()), seed: 11 }}
            lookupPn={(pn) => {
              const p = canon.roster.find((r) => r.pn === pn);
              if (p) return { pn, name: p.name, role: p.role, site: p.site };
              const a = services.account.all().find((x) => x.pn === pn);
              return a ? { pn, name: a.displayName, role: a.roleTitle, site: a.site } : undefined;
            }}
            lookupDoc={(x) => {
              const r = services.docs.byDocNo(x);
              return r ? { docNo: r.docNo, title: r.title } : undefined;
            }}
            onChange={() => undefined}
            onBlur={() => undefined}
            onRedactionHover={(i) => services.audit.log('redaction.hover', spec.formNo, `Operator ${services.session.operatorId.peek()} examined withheld material in ${spec.formNo} (${i.auth} ${i.ref}). No release was made.`)}
          />
          <FormFooter formNo={spec.formNo} edition={spec.edition ?? ''} page="FILED COPY" barcode={routed.subject} />
        </FormSheet>
      ) : (
        <table class="fx-entries">
          <caption>ENTRIES AS FILED</caption>
          <thead>
            <tr>
              <th scope="col">Block</th>
              <th scope="col">Entry</th>
              <th scope="col">As entered</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([ref, label, value]) => (
              <tr key={ref + label}>
                <td class="fx-mono">{ref}</td>
                <td>{label}</td>
                <td class="fx-mono">{value || '(blank)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Dialog
        open={confirm !== null}
        title={confirm === 'approved' ? 'Approve' : 'Not approved'}
        kind="question"
        reference={`${d.form ?? ''} RECEIPT ${routed.subject}`}
        buttons={[
          { label: confirm === 'approved' ? '&Approve' : '&Record decision', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => (v === 'ok' && confirm ? decide(confirm) : setConfirm(null))}
      >
        <p class="fx-dlg">
          {confirm === 'approved' ? 'Approve' : 'Record as not approved'} {d.form} receipt {routed.subject} filed by operator {d[META.filer] ?? routed.from}. The decision is signed from your token, returned to the filer and cannot be withdrawn.
        </p>
      </Dialog>
    </div>
  );
}
