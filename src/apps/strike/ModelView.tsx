/** Strike app: model data sheet, read entirely from canon.survivability. */
import { PropertyGrid } from '@design/index';
import { MarkerGlyph } from '@graphics/map';
import { egressFor } from './model';
import { Caveat } from './EstimateView';
import { S, canon, fmtInt, fmtKt, fmtMi } from './shared';

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const osDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d ? `${d} ` : ''}${months[Number(m) - 1] ?? m} ${y}`;
};

export function ModelView({ kt, depthNote }: { kt: number; depthNote: string }) {
  const m = S.model;
  const k = Math.cbrt(kt);
  const count = (h: string) => S.facilities.filter((f) => f.hardeningClass === h);
  const hubs = canon.facilities.filter((f) => f.class === 'ALPHA');
  return (
    <div class="stk-model">
      <Caveat />
      <PropertyGrid
        caption="Model identification"
        columns={2}
        rows={[
          { label: 'Model', value: `${m.id}, ${m.title}`, mono: false },
          { label: 'Revision', value: `${m.revision} of ${osDate(m.date)}`, mono: true },
          { label: 'Originator', value: m.originator, mono: true },
          { label: 'Marking', value: canon.markings.find((x) => x.id === m.marking)?.label ?? m.marking, mono: true },
          { label: 'Yield steps', value: S.yieldsKt.map(fmtKt).join(', '), mono: true },
          { label: 'GAMMA planning depth', value: `${fmtInt(S.gammaPlanningDepthFt)} ft`, mono: true },
        ]}
      />
      <section class="stk-sheet">
        <h3>Disclaimer</h3>
        <p>{m.disclaimer}</p>
        <h3>Method</h3>
        <ol>
          {m.method.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
        <p class="stk-foot">{depthNote}</p>

        <h3>Hardening classes</h3>
        <table class="stk-tbl">
          <thead>
            <tr>
              <th>Class</th>
              <th>Name</th>
              <th>Description</th>
              <th class="num">Rated psi</th>
              <th class="num">Depth coupling</th>
              <th class="num">Sites</th>
            </tr>
          </thead>
          <tbody>
            {S.classes.map((c) => (
              <tr key={c.id}>
                <td class="mono">{c.id}</td>
                <td>{c.name}</td>
                <td>{c.description}</td>
                <td class="num">{fmtInt(c.ratedPsi)}</td>
                <td class="num">{c.depthCoupling}</td>
                <td class="num">{count(c.id).length}</td>
              </tr>
            ))}
            <tr>
              <td class="mono">
                <MarkerGlyph cls="DELTA" size={12} /> DELTA
              </td>
              <td colSpan={5}>{S.notModelled.text}</td>
            </tr>
          </tbody>
        </table>

        <h3>Contours at {fmtKt(kt)}</h3>
        <table class="stk-tbl stk-tbl--narrow">
          <thead>
            <tr>
              <th class="num">psi</th>
              <th class="num">Range coefficient</th>
              <th class="num">Range mi</th>
            </tr>
          </thead>
          <tbody>
            {S.contours.map((c) => (
              <tr key={c.psi}>
                <td class="num">{c.psi.toLocaleString('en-US')}</td>
                <td class="num">{c.rangeCoeffMi}</td>
                <td class="num">{fmtMi(c.rangeCoeffMi * k)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Conditions</h3>
        <table class="stk-tbl">
          <thead>
            <tr>
              <th>Condition</th>
              <th class="num">Ratio up to</th>
              <th>Reading</th>
            </tr>
          </thead>
          <tbody>
            {S.conditions.map((c) => (
              <tr key={c.id}>
                <td class="mono">{c.id}</td>
                <td class="num">{c.maxRatio === null ? 'above' : c.maxRatio}</td>
                <td>{c.text}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Egress basis (ALPHA)</h3>
        <p>
          Where a hub is read ISOLATED or worse, the model lists the inter-hub rail segments on which egress is planned. The list is the segment table at model revision ({osDate(m.date.slice(0, 7))}).
          Route miles are engineering figures.
        </p>
        <table class="stk-tbl stk-tbl--narrow">
          <thead>
            <tr>
              <th>Hub</th>
              <th>Egress segments</th>
            </tr>
          </thead>
          <tbody>
            {hubs.map((h) => (
              <tr key={h.id}>
                <td class="mono">{h.id}</td>
                <td class="mono">
                  {egressFor(canon, h.id)
                    .map((e) => `SEG ${e.no} to ${e.to}, ${fmtInt(e.miles)} mi`)
                    .join('; ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
