/** Organisation chart (@graphics/org) with a root selector and a detail pane for the selected box. */
import { useEffect, useState } from 'preact/hooks';
import { Button, DataTable, PropertyGrid, Select, type Column } from '@design/index';
import type { StaffLine } from '@core/canon-types';
import { OrgChart } from '@graphics/org';
import { canon, divisionName, facilityById, fmt, personByPn, SPONSORABLE, UNPOSTED } from '../model';
import { dirPreset, orgPreset } from '../state';
import { CellView, RxText, usePer } from '../ui';
import { buildRow } from '../directory';

type Sel = { kind: 'person'; pn: string } | { kind: 'unit'; id: string } | null;

function PersonDetail({ pn }: { pn: string }) {
  const per = usePer();
  const p = personByPn.get(pn);
  if (!p) return <p class="per-note">No directory entry is held for {pn}.</p>;
  const held = per.services.session.compartments.value;
  const r = buildRow(p, { holds: (c) => held.includes(c), sponsorable: SPONSORABLE, compartmentIds: canon.compartments.map((c) => c.id), divisionName });
  return (
    <>
      <PropertyGrid
        caption={`Directory record ${p.pn}`}
        rows={[
          { label: 'Name', value: <CellView c={r.name} /> },
          { label: 'Post', value: <CellView c={r.role} /> },
          { label: 'Tier', value: <CellView c={r.tier} />, mono: true },
          { label: 'Site', value: r.site, mono: true },
          { label: 'Division', value: <CellView c={r.division} /> },
          { label: 'Mail address', value: <CellView c={r.email} />, mono: true },
        ]}
      />
      <div class="per-actions">
        <Button
          size="small"
          label="Open in &directory"
          onClick={() => {
            dirPreset.value = { query: p.pn, tier: null, site: null, divisionId: null };
            per.go('/personnel/directory');
          }}
        />
      </div>
    </>
  );
}

function UnitDetail({ id }: { id: string }) {
  const h = canon.headline;
  const div = canon.divisions.find((d) => d.id === id);
  if (div) {
    const head = div.headId ? personByPn.get(div.headId) : undefined;
    const listed = canon.roster.filter((p) => p.divisionId === div.id).length;
    return (
      <PropertyGrid
        caption={`${div.id} ${div.name}`}
        rows={[
          { label: 'Seat', value: div.site ?? 'Not assigned', mono: true },
          { label: 'Head', value: head ? <><span class="per-mono">{head.pn}</span>, <RxText s={head.role} /></> : 'Not appointed' },
          { label: 'Directory entries', value: fmt(listed), mono: true },
          { label: 'Mandate', value: div.mandate },
        ]}
      />
    );
  }
  const fac = facilityById.get(id);
  if (fac) {
    const cols: Column<StaffLine>[] = [
      { key: 'role', header: 'Return line', render: (l) => l.role },
      { key: 'count', header: 'Posted', align: 'right', mono: true, render: (l) => fmt(l.count) },
    ];
    return (
      <>
        <PropertyGrid
          caption={`${fac.id}${fac.codename ? ` ${fac.codename}` : ''}`}
          rows={[
            { label: 'Class', value: fac.class },
            { label: 'Berthing', value: fmt(fac.capacity), mono: true },
            { label: 'Posted staff', value: fmt(fac.staff), mono: true },
            { label: 'Commander PN', value: fac.commanderId ?? 'Not appointed', mono: true },
          ]}
        />
        <DataTable
          label={`Posted strength return, ${fac.id}`}
          columns={cols}
          rows={fac.staffBreakdown}
          rowKey={(l) => l.role}
          selection="none"
          dense
          footer={
            <tr>
              <td>Total posted staff</td>
              <td class="is-right is-mono">{fmt(fac.staff)}</td>
            </tr>
          }
        />
      </>
    );
  }
  const cls = canon.classes.find((c) => c.id === id);
  if (cls) {
    return (
      <PropertyGrid
        caption={`Class ${cls.id}: ${cls.name}`}
        rows={[
          { label: 'Sites', value: fmt(cls.count), mono: true },
          { label: 'Berthing', value: fmt(cls.statedCapacity), mono: true },
          { label: 'Posted staff', value: fmt(cls.statedStaff), mono: true },
          { label: 'Depth', value: cls.depthText },
        ]}
      />
    );
  }
  if (id === 'ACCOUNTING' || id === 'POSTED') {
    return (
      <PropertyGrid
        caption="Personnel accounting"
        rows={[
          { label: 'Total personnel', value: fmt(h.staffTotal), mono: true },
          { label: 'Total posted staff', value: fmt(h.staffPosted), mono: true },
          { label: UNPOSTED, value: fmt(h.staffUnposted), mono: true },
          { label: 'Maintained by', value: divisionName('PV') },
        ]}
      />
    );
  }
  if (id === 'COUNCIL') {
    return (
      <PropertyGrid
        caption="Core Council"
        rows={[
          ...canon.council.composition.map((c) => ({ label: c.role, value: fmt(c.count), mono: true })),
          { label: 'Seats', value: fmt(canon.council.seats.length), mono: true },
        ]}
      />
    );
  }
  if (id === 'DIVISIONS') return <PropertyGrid caption="Divisions" rows={[{ label: 'Divisions', value: fmt(canon.divisions.length), mono: true }]} />;
  if (id === 'FACILITIES') return <PropertyGrid caption="Facility commands" rows={[{ label: 'Facilities', value: fmt(h.facilities), mono: true }, { label: 'Total posted staff', value: fmt(h.staffPosted), mono: true }]} />;
  return <p class="per-note">No detail is recorded for this box.</p>;
}

export function OrgView() {
  const per = usePer();
  const tier = per.services.session.tier.value;
  const [root, setRoot] = useState<string>(() => orgPreset.peek() ?? 'COUNCIL');
  const [sel, setSel] = useState<Sel>(null);
  useEffect(() => {
    orgPreset.value = null;
  }, []);
  useEffect(() => {
    per.setMessage(root === 'COUNCIL' ? 'Organisation chart: Council, divisions and facility commands.' : `Organisation chart rooted at ${root}.`);
  }, [root]);
  const options = [
    { value: 'COUNCIL', label: 'Council, divisions and facility commands' },
    ...canon.divisions.map((d) => ({ value: d.id, label: `Division: ${d.id} ${d.name}` })),
    ...canon.facilities.filter((f) => f.class !== 'DELTA').map((f) => ({ value: f.id, label: `Facility: ${f.id}` })),
  ];
  return (
    <div class="per-view per-org">
      <div class="per-filters">
        <Select label="Chart root" value={root} options={options} onChange={(v) => { setRoot(v); setSel(null); }} layout="inline" />
      </div>
      <div class="per-org__body">
        <div class="per-org__chart">
          <OrgChart
            root={root}
            sessionTier={tier}
            onSelectPerson={(pn) => setSel({ kind: 'person', pn })}
            onSelectUnit={(id) => setSel({ kind: 'unit', id })}
          />
        </div>
        <aside class="per-org__detail" aria-label="Selection">
          {sel === null ? (
            <p class="per-note">Activate a box to show its particulars. Arrow keys pan the chart; plus and minus zoom; F fits.</p>
          ) : sel.kind === 'person' ? (
            <PersonDetail pn={sel.pn} />
          ) : (
            <UnitDetail id={sel.id} />
          )}
        </aside>
      </div>
    </div>
  );
}
