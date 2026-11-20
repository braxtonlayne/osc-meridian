/** Vetting supplement and transfer/probation panels, and the functional branch establishment. */
import { Button, DataTable, ProgressBar, PropertyGrid, type Column } from '@design/index';
import { formatOscDate } from '@design/index';
import { BRANCHES, canon, divisionName, fmt, personByPn, type BranchId } from '../model';
import { probationPeriodDays, probationStatus } from '../strength';
import { calcPreset } from '../state';
import { RouteLink, RxText, Section, usePer } from '../ui';

export function VettingPanel() {
  const sp = canon.security.personnel;
  return (
    <div class="per-view">
      <PropertyGrid
        caption="Personnel security: vetting"
        rows={[
          { label: 'Investigation', value: sp.investigation },
          { label: 'Compartmentation', value: sp.compartmentation },
        ]}
      />
      <Section title="OSC supplement: focus areas">
        <ol class="per-list">
          {sp.focusAreas.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ol>
        <p class="per-note">
          Protocols: <RouteLink docNo="OSC-ASR-PSEC" />. Approving authority for vetting outcomes: {divisionName('PV')}.
        </p>
      </Section>
    </div>
  );
}

export function TransferPanel() {
  const { services } = usePer();
  // The operator signed in (pass two: any issued account), not the pass-one visitor.
  const op = services.account.def.value;
  const rule = canon.security.personnel.compartmentation;
  const period = probationPeriodDays(rule);
  const day = services.session.probationDay.value;
  const st = period && op.probationStart ? probationStatus(op.probationStart, period, day) : null;
  const division = op.divisionId === 'CMD' ? 'Facility Command' : divisionName(op.divisionId);
  const sup = op.supervisorPn ? personByPn.get(op.supervisorPn) : undefined;
  const events = canon.calendar.filter((e) => /probation/i.test(e.title) && e.tier >= services.session.tier.value);
  return (
    <div class="per-view">
      <PropertyGrid caption="Transfer rule" rows={[{ label: 'Rule', value: rule }]} />
      <Section title="Probationary period: this operator">
        <PropertyGrid
          columns={2}
          rows={[
            { label: 'Operator', value: services.session.operatorId.value, mono: true },
            { label: 'Personnel number', value: op.pn, mono: true },
            { label: 'Posted to', value: `${op.site}, ${division}` },
            { label: 'Supervisor of record', value: sup ? <><span class="per-mono">{sup.pn}</span>, <RxText s={sup.role} /></> : (op.supervisorPn ?? 'None recorded') },
            op.probationStart
              ? { label: 'Probation began', value: formatOscDate(op.probationStart), mono: true }
              : { label: 'Probation', value: 'Not in a probationary period' },
            { label: 'Period', value: period ? `${fmt(period)} days` : 'Not stated', mono: true },
            ...(st
              ? [
                  { label: 'Probation day', value: `${fmt(st.day)} of ${fmt(st.periodDays)}`, mono: true },
                  { label: 'Period ends', value: formatOscDate(st.end), mono: true },
                ]
              : []),
          ]}
        />
        {st ? <ProgressBar value={st.day} max={st.periodDays} label="Probationary period served" showValue="percent" segments={18} /> : null}
      </Section>
      {events.length ? (
        <Section title="Scheduled reviews">
          <table class="per-acct" aria-label="Scheduled reviews">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Time</th>
                <th scope="col">Event</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td class="per-mono per-nowrap">{formatOscDate(e.date)}</td>
                  <td class="per-nowrap">{e.timeText}</td>
                  <td>
                    <RxText s={e.title} />
                    {e.note ? <div class="per-sub">{e.note}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}
      <p class="per-note">
        Procedure: <RouteLink docNo="OSC-DIR-0247" />. Acting credentials: <RouteLink docNo="OSC-DIR-0395" />. Request form: <RouteLink docNo="OSC-F-122" />.
      </p>
    </div>
  );
}

interface BranchRow {
  function: string;
  pct: number;
  count: number;
}

export function BranchPanel({ branch }: { branch: BranchId }) {
  const per = usePer();
  const br = BRANCHES.find((b) => b.id === branch)!;
  const rows: BranchRow[] = canon.ratioModel.rows.filter((r) => br.functions.includes(r.function));
  const pct = rows.reduce((a, r) => a + r.pct, 0);
  const count = rows.reduce((a, r) => a + r.count, 0);
  const cols: Column<BranchRow>[] = [
    { key: 'function', header: 'Function', render: (r) => r.function },
    { key: 'pct', header: 'Ratio %', align: 'right', mono: true, sortValue: (r) => r.pct, render: (r) => fmt(r.pct) },
    { key: 'count', header: `Model (${fmt(canon.ratioModel.capacity)})`, align: 'right', mono: true, sortValue: (r) => r.count, render: (r) => fmt(r.count) },
  ];
  return (
    <div class="per-view">
      <PropertyGrid
        caption={`Functional branch: ${br.title}`}
        columns={2}
        rows={[
          { label: 'Functions', value: fmt(rows.length), mono: true },
          { label: 'Share of establishment', value: `${fmt(pct)}%`, mono: true },
          { label: 'Model posts', value: fmt(count), mono: true },
          { label: 'Model basis', value: canon.ratioModel.basis },
        ]}
      />
      <Section title="Establishment by function">
        <DataTable
          label={`${br.title}: establishment`}
          columns={cols}
          rows={rows}
          rowKey={(r) => r.function}
          selection="none"
          dense
          footer={
            <tr>
              <td>Branch total</td>
              <td class="is-right is-mono">{fmt(pct)}</td>
              <td class="is-right is-mono">{fmt(count)}</td>
            </tr>
          }
        />
      </Section>
      <div class="per-actions">
        <Button
          label="Open in staffing &calculator"
          onClick={() => {
            calcPreset.value = { highlight: br.functions };
            per.go('/personnel/ratio');
          }}
        />
        {BRANCHES.filter((b) => b.id !== branch).map((b) => (
          <Button key={b.id} size="small" label={b.title} onClick={() => per.go(`/personnel/branch/${b.id}`)} />
        ))}
      </div>
    </div>
  );
}
