/**
 * Planning estimate sheet (print only). Same mechanism as the shell's document print:
 * a .print-root under <body>, body[data-print-doc], window.print().
 */
import { render } from 'preact';
import type { MarkingId } from '@core/canon-types';
import { MarkingStrip } from '@graphics/banners';
import { fmtCoord, type Evaluation } from './model';
import { S, canon, depthBand, facilityById, fmtInt, fmtKt, fmtMi, fmtPsi, fmtRatio, frag } from './shared';

export interface SheetSpec {
  sheetNo: string;
  registered: boolean;
  anchor: string;
  ev: Evaluation;
  rangeMi: number;
  printedBy: string;
  printedAt: string;
  enteredBy?: string;
  enteredAt?: string;
  status?: string;
  depthNote: string;
}

function Sheet({ spec }: { spec: SheetSpec }) {
  const marking = S.model.marking as MarkingId;
  const mlabel = canon.markings.find((m) => m.id === marking)?.label ?? marking;
  const ev = spec.ev;
  const listed = ev.rows.filter((r) => r.distanceMi <= spec.rangeMi);
  const h = canon.headline;
  return (
    <div class="stk-print">
      <MarkingStrip marking={marking} markings={canon.markings} />
      <p class="stk-print__caveat">{frag.caveat}</p>
      <h1 class="stk-print__title">Planning estimate sheet, {S.model.id}</h1>
      <p class="stk-print__sub">
        {S.model.title}, revision {S.model.revision}. {S.model.originator}.
      </p>
      <table class="stk-print__id">
        <tbody>
          <tr>
            <th>Sheet</th>
            <td>{spec.sheetNo}</td>
            <th>Register</th>
            <td>{spec.registered ? `Entered ${spec.enteredAt ?? ''} by ${spec.enteredBy ?? ''}${spec.status ? `, ${spec.status}` : ''}` : 'Not entered in the planning register'}</td>
          </tr>
          <tr>
            <th>Point</th>
            <td>{spec.anchor}</td>
            <th>Position</th>
            <td>{fmtCoord(ev.point)}</td>
          </tr>
          <tr>
            <th>Yield</th>
            <td>{fmtKt(ev.kt)}</td>
            <th>Listing</th>
            <td>
              Installations within {spec.rangeMi} mi ({listed.length} of {ev.rows.length} evaluated)
            </td>
          </tr>
          <tr>
            <th>Printed by</th>
            <td>{spec.printedBy}</td>
            <th>Printed</th>
            <td>{spec.printedAt}</td>
          </tr>
        </tbody>
      </table>
      <table class="stk-print__grid">
        <caption>Contours</caption>
        <thead>
          <tr>
            {ev.ranges.map((r) => (
              <th key={r.psi} class="num">
                {r.psi.toLocaleString('en-US')} psi
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {ev.ranges.map((r) => (
              <td key={r.psi} class="num">
                {fmtMi(r.rangeMi)} mi
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <table class="stk-print__grid">
        <caption>Estimated condition of installations</caption>
        <thead>
          <tr>
            <th>Installation</th>
            <th>Class</th>
            <th class="num">Dist mi</th>
            <th class="num">Depth ft</th>
            <th>Depth band</th>
            <th class="num">Rated psi</th>
            <th class="num">Eff. psi</th>
            <th class="num">Site psi</th>
            <th class="num">Ratio</th>
            <th>Condition</th>
            <th>Egress</th>
          </tr>
        </thead>
        <tbody>
          {listed.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.hClass}</td>
              <td class="num">{fmtMi(r.distanceMi)}</td>
              <td class="num">
                {fmtInt(r.depthFt)}
                {r.depthBasis === 'planning' ? ' P' : r.depthBasis === 'release' ? ' R' : ''}
              </td>
              <td>{depthBand(facilityById.get(r.id)!)}</td>
              <td class="num">{fmtInt(r.ratedPsi)}</td>
              <td class="num">{fmtInt(r.effectivePsi)}</td>
              <td class="num">{fmtPsi(r.op)}</td>
              <td class="num">{r.ratio === null ? 'n/a' : fmtRatio(r.ratio)}</td>
              <td>{r.condition}</td>
              <td>{r.egress.map((e) => `SEG ${e.no}`).join(', ')}</td>
            </tr>
          ))}
          {listed.length === 0 ? (
            <tr>
              <td colSpan={11}>No evaluated installation lies within the listing range.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p class="stk-print__note">
        Not evaluated (position not held at the printing workstation): {ev.notEvaluated.join(', ') || 'none'}. DELTA: {S.notModelled.text} Withheld: {frag.deltaWithholding.authority}, ref{' '}
        {frag.deltaWithholding.reference}.
      </p>
      <p class="stk-print__note">{spec.depthNote}</p>
      <p class="stk-print__note">
        Egress basis: inter-hub rail, segment table at model revision. Network route length on which the egress basis rests, certified mileage {fmtInt(h.tunnelCertifiedMi)} mi (quarterly return to the Council).
      </p>
      <p class="stk-print__disclaimer">{S.model.disclaimer}</p>
      <p class="stk-print__foot">
        {frag.caveat} UNCONTROLLED WHEN PRINTED. {mlabel}
      </p>
      <MarkingStrip marking={marking} markings={canon.markings} />
    </div>
  );
}

/** Render the sheet into a print root, print it, and clean up. */
export async function printSheet(spec: SheetSpec): Promise<void> {
  const root = document.createElement('div');
  root.className = 'print-root stk-print-root';
  document.body.appendChild(root);
  render(<Sheet spec={spec} />, root);
  document.body.dataset.printDoc = spec.sheetNo;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    removeEventListener('afterprint', cleanup);
    render(null, root);
    root.remove();
    delete document.body.dataset.printDoc;
  };
  addEventListener('afterprint', cleanup);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  try {
    window.print();
  } finally {
    setTimeout(cleanup, 1500);
  }
}
