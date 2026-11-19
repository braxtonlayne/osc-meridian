/**
 * Rendered check for @graphics/forms. Dev-only: not imported by the application.
 * Composes a complete sample form (absence request) from the exported parts,
 * a specimen strip for the small marks, and a submission receipt.
 * The entries are sample data for the check, not canon.
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import '@design/fonts';
import '@design/base.css';
import '@design/tokens.css';
import { Seal } from '../seal';
import {
  Barcode,
  CheckboxMark,
  CheckItem,
  FormBlock,
  FormFooter,
  FormGrid,
  FormHeader,
  FormSection,
  FormSheet,
  FormValue,
  ReceiptSlip,
  SignatureBlock,
} from './index';
import './check/preview.css';

function LeaveRequest() {
  const [recall, setRecall] = useState(true);
  return (
    <FormSheet>
      <FormHeader
        formNo="OSC FORM 114"
        agencyLine="Office of Strategic Continuity · Personnel Division"
        title="Request and Authorization for Absence"
        subtitle="Submit not later than five duty days before the first day of absence."
        seal={<Seal size={40} variant="mono" />}
      />
      <FormGrid cols={12}>
        <FormSection part="PART I" title="Requester" />
        <FormBlock n={1} label="Name" hint="(Last, First, Middle Initial)" span={5}>
          <FormValue>HALVERSEN, RUTH T.</FormValue>
        </FormBlock>
        <FormBlock n={2} label="Operator ID" span={3}>
          <FormValue>OP-4471-K</FormValue>
        </FormBlock>
        <FormBlock n={3} label="Grade / Step" span={2}>
          <FormValue>C-11 / 4</FormValue>
        </FormBlock>
        <FormBlock n={4} label="Access Tier" span={2}>
          <FormValue>2</FormValue>
        </FormBlock>
        <FormBlock n={5} label="Division and Section" span={5}>
          <FormValue>RD / RECORDS CONTROL</FormValue>
        </FormBlock>
        <FormBlock n={6} label="Duty Station" span={3}>
          <FormValue>ALPHA-03</FormValue>
        </FormBlock>
        <FormBlock n={7} label="Duty Telephone" hint="(internal)" span={4}>
          <FormValue>3-0417</FormValue>
        </FormBlock>

        <FormSection part="PART II" title="Absence Requested" />
        <FormBlock n={8} label="Type of Absence" hint="(mark one)" span={12}>
          <CheckItem checked label="Annual" />
          <CheckItem checked={false} label="Sick" />
          <CheckItem checked={false} label="Compensatory time" />
          <CheckItem checked={false} label="Absence without pay" />
          <CheckItem checked={false} label="Surface rotation" />
          <CheckItem checked={false} label="Other (explain in block 13)" />
        </FormBlock>
        <FormBlock n={9} label="From" hint="(date and time)" span={4}>
          <FormValue>19 MAY 2008 1200Z (0800 EDT)</FormValue>
        </FormBlock>
        <FormBlock n={10} label="To" hint="(date and time)" span={4}>
          <FormValue>23 MAY 2008 2100Z (1700 EDT)</FormValue>
        </FormBlock>
        <FormBlock n={11} label="Hours Charged" span={2}>
          <FormValue>40.0</FormValue>
        </FormBlock>
        <FormBlock n={12} label="Balance After" span={2} shade>
          <FormValue>112.5</FormValue>
        </FormBlock>
        <FormBlock n={13} label="Remarks" rows={2} span={8}>
          <FormValue>WORK IN PROGRESS HANDED TO SECTION ALTERNATE. NO OPEN SUSPENSE ITEMS.</FormValue>
        </FormBlock>
        <FormBlock n={14} label="During Absence" span={4}>
          <div class="pv-stack">
            <CheckItem checked={recall} onChange={setRecall} label="Subject to recall" style="check" />
            <CheckItem checked={false} label="Leaving the local area" style="check" />
            <CheckItem checked label="Token surrendered to custodian" style="check" />
          </div>
        </FormBlock>
        <FormBlock n={15} label="Certification of Requester" flush span={12}>
          <p class="pv-cert">
            I ask that the absence above be authorized. I have told my supervisor of any work that will fall due while
            I am away and I know that the authorization may be withdrawn if the needs of the section change.
          </p>
          <SignatureBlock label="Signature of Requester" name="Ruth T. Halversen" signed date="12 MAY 2008" seed={3} />
        </FormBlock>

        <FormSection part="PART III" title="Action" note="Completed by the supervisor and the leave clerk" />
        <FormBlock n={16} label="Supervisor Action" span={5}>
          <div class="pv-stack">
            <CheckItem checked label="Authorized as requested" style="filled" />
            <CheckItem checked={false} label="Authorized as changed (see block 17)" style="filled" />
            <CheckItem checked={false} label="Not authorized (reason in block 17)" style="filled" />
          </div>
        </FormBlock>
        <FormBlock n={17} label="Changes or Reason" rows={3} span={7} />
        <FormBlock n={18} label="Authorizing Supervisor" flush span={6}>
          <SignatureBlock label="Signature" name="Marcus K. Brandt" signed date="13 MAY 2008" seed={11} />
        </FormBlock>
        <FormBlock n={19} label="Leave Clerk" flush shade span={6}>
          <SignatureBlock label="Signature" name="D. Okafor" />
        </FormBlock>
      </FormGrid>
      <FormFooter formNo="OSC FORM 114" edition="03-2007" page="PAGE 1 OF 1" barcode="F114-0307-P1" />
    </FormSheet>
  );
}

function Specimens() {
  const names = ['Ruth T. Halversen', 'Marcus K. Brandt', 'D. Okafor', 'Evelyn Stroud', 'J. P. Whitlock', 'Gil Castellanos'];
  return (
    <div class="pv-specimens" id="specimens">
      <div class="pv-spec-row">
        <span class="pv-cap">CheckboxMark at 12px: x, check, filled; empty</span>
        <span class="pv-marks">
          <CheckboxMark checked style="x" />
          <CheckboxMark checked style="check" />
          <CheckboxMark checked style="filled" />
          <CheckboxMark checked={false} />
        </span>
        <span class="pv-cap">at 24px</span>
        <span class="pv-marks">
          <CheckboxMark checked style="x" size={24} />
          <CheckboxMark checked style="check" size={24} />
          <CheckboxMark checked style="filled" size={24} />
        </span>
        <span class="pv-cap">Barcode, module 2, check character</span>
        <Barcode value="OSC-114" module={2} height={30} checkDigit />
      </div>
      <div class="pv-spec-row">
        <span class="pv-cap">SignatureBlock: same generator, six names (two seeds for the first)</span>
      </div>
      <div class="pv-sigs">
        {names.map((n, i) => (
          <div class="pv-sigbox" key={n}>
            <SignatureBlock label="Signature" name={n} signed date="12 MAY 2008" seed={i === 1 ? 11 : 3} />
          </div>
        ))}
        <div class="pv-sigbox">
          <SignatureBlock label="Signature" name={names[0]} signed date="14 MAY 2008" seed={8} />
        </div>
        <div class="pv-sigbox">
          <SignatureBlock label="Signature (unsigned)" name="Lena Voss" />
        </div>
      </div>
    </div>
  );
}

function Preview() {
  return (
    <div class="pv-page">
      <div id="form">
        <LeaveRequest />
      </div>
      <div id="receipt">
        <ReceiptSlip
          receiptNo="FR-08-004417"
          formNo="OSC FORM 114"
          title="Request and Authorization for Absence"
          submittedAt="12 MAY 2008 1430Z (1030 EDT)"
          submittedBy="OP-4471-K"
          routing={['SECTION SUPERVISOR, RD/RECORDS CONTROL', 'PV/LEAVE CLERK', 'PV/TIME AND ATTENDANCE FILE']}
        />
      </div>
      <Specimens />
    </div>
  );
}

const mount = document.getElementById('app');
if (mount) render(<Preview />, mount);
