/**
 * Issued credentials: the operator cards issued on this workstation (services.account.all()),
 * with the one in use marked. Signing in with another card logs off and returns to the lock
 * screen with that card selected. Never shows a Tier 2 personal name (the account carries
 * role strings only).
 */
import { useState } from 'preact/hooks';
import type { AccountDef } from '@core/contracts';
import canon from '@canon';
import { WORKSTATION_ID } from '@core/audit';
import { Button, ButtonRow, DataTable, Dialog, GroupBox, PropertyGrid, StatusLight, type Column } from '@design/index';
import { useSys } from '../ctx';
import { divisionLabel } from '../logic';

const DIVISIONS = (canon as unknown as { divisions: { id: string; name: string }[] }).divisions;

export function Credentials({ onReset }: { onReset: () => void }) {
  const { services, say, narrow } = useSys();
  const me = services.account.id.value;
  const all = services.account.all();
  const [sel, setSel] = useState<string>(me);
  const [confirm, setConfirm] = useState<AccountDef | null>(null);
  const cur = all.find((a) => a.id === sel) ?? all[0];

  const cols: Column<AccountDef>[] = [
    { key: 'use', header: 'In use', width: 70, render: (a) => (a.id === me ? <StatusLight status="NOMINAL" word="IN USE" /> : '') },
    { key: 'operatorId', header: 'Operator', width: 120, mono: true },
    { key: 'roleTitle', header: 'Post', wrap: true },
    ...(narrow
      ? []
      : [
          { key: 'tier', header: 'Tier', width: 44, align: 'right' as const, mono: true },
          { key: 'site', header: 'Site', width: 84, mono: true },
        ]),
  ];

  const signIn = (a: AccountDef) => {
    if (a.id === me) {
      say(`Credential ${a.operatorId} is the credential in use.`);
      return;
    }
    setConfirm(a);
  };

  return (
    <div class="sys-pad">
      <p class="sys-note">
        Operator credentials issued on workstation {WORKSTATION_ID}. Each credential has its own profile on this workstation: desktop, message traffic, receipts and audit
        trail. A credential is presented at the lock screen (OSC-DIR-0301).
      </p>
      <DataTable<AccountDef>
        label="Issued credentials"
        columns={cols}
        rows={all}
        rowKey={(a) => a.id}
        selection="single"
        selected={cur ? [cur.id] : []}
        onSelectionChange={(k) => k[0] && setSel(k[0])}
        onActivate={signIn}
        dense
        wrap
      />
      {cur && (
        <GroupBox title={`Credential ${cur.operatorId}`} on="surface">
          <PropertyGrid
            columns={narrow ? 1 : 2}
            rows={[
              { label: 'Operator ID', value: cur.operatorId, mono: true },
              { label: 'Card designation', value: cur.displayName },
              { label: 'Post', value: cur.roleTitle },
              { label: 'Tier', value: `Tier ${cur.tier}` },
              { label: 'Site', value: cur.site, mono: true },
              { label: 'Division', value: divisionLabel(cur.divisionId, DIVISIONS) },
              { label: 'Mailbox', value: cur.email, mono: true },
              { label: 'Approval authority', value: cur.approves.length ? cur.approves.join(', ') : 'None' },
              { label: 'Audit review', value: cur.auditReader ? 'Yes (Office of Internal Assurance, read-only)' : 'No' },
              { label: 'Compartments on issue', value: cur.compartments.length ? cur.compartments.join(', ') : 'None' },
            ]}
          />
          <ButtonRow align="left">
            <Button label="&Sign in with this card..." variant={cur.id === me ? undefined : 'primary'} onClick={() => signIn(cur)} />
            <Button label="&Reinitialise local profile..." onClick={onReset} />
          </ButtonRow>
        </GroupBox>
      )}
      <Dialog
        open={!!confirm}
        title="Sign in with another card"
        kind="question"
        reference="OSC-DIR-0301"
        onClose={(v) => {
          const a = confirm;
          setConfirm(null);
          if (v === 'yes' && a) {
            say(`Logging off. Present credential ${a.operatorId} at the lock screen.`);
            services.account.switchTo(a.id);
          }
        }}
        buttons={[
          { label: '&Log off', value: 'yes', isDefault: true },
          { label: 'Cancel', value: 'no', isCancel: true },
        ]}
      >
        <p>
          The session of {services.session.operatorId.peek()} will be logged off and the lock screen shown with the card of {confirm?.operatorId} selected. Open windows of this
          session are closed.
        </p>
      </Dialog>
    </div>
  );
}
