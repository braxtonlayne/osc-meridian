/**
 * Strength summary: strength by tier, by class and by facility, and the
 * personnel accounting lines. Every total is the canon figure; the unposted
 * line has no drill-down.
 */
import { DataTable, PropertyGrid, StatusLight, type Column } from '@design/index';
import { formatOscDate } from '@design/index';
import { canon, fmt, UNPOSTED } from '../model';
import { classLines, facilityLines, reconciliation, tierLines, type ClassLine, type FacilityLine, type TierLine } from '../strength';
import { Bar, Figure, RouteLink, RxText, Section, usePer } from '../ui';

const td = (n: number) => <td class="is-right is-mono">{fmt(n)}</td>;

export function StrengthByTier() {
  const rows = tierLines(canon);
  const r = reconciliation(canon);
  const cols: Column<TierLine>[] = [
    { key: 'tier', header: 'Tier', width: 48, mono: true, sortValue: (x) => x.tier },
    { key: 'name', header: 'Category', render: (x) => x.name },
    { key: 'clearance', header: 'Clearance', render: (x) => x.clearance, wrap: true },
    { key: 'count', header: 'Strength', align: 'right', mono: true, sortValue: (x) => x.count, render: (x) => fmt(x.count) },
  ];
  return (
    <DataTable
      label="Strength by tier"
      columns={cols}
      rows={rows}
      rowKey={(x) => String(x.tier)}
      selection="none"
      dense
      footer={
        <tr>
          <td colSpan={3}>Total personnel</td>
          {td(r.totalPersonnel)}
        </tr>
      }
    />
  );
}

export function StrengthByClass() {
  const rows = classLines(canon);
  const r = reconciliation(canon);
  const cols: Column<ClassLine>[] = [
    { key: 'id', header: 'Class', width: 64, mono: true },
    { key: 'name', header: 'Description', render: (x) => x.name },
    { key: 'sites', header: 'Sites', align: 'right', mono: true, sortValue: (x) => x.sites, render: (x) => fmt(x.sites) },
    { key: 'berthing', header: 'Berthing', align: 'right', mono: true, sortValue: (x) => x.berthing, render: (x) => fmt(x.berthing) },
    { key: 'posted', header: 'Posted', align: 'right', mono: true, sortValue: (x) => x.posted, render: (x) => fmt(x.posted) },
    { key: 'fill', header: 'Fill %', align: 'right', mono: true, sortValue: (x) => x.fillPct, render: (x) => fmt(x.fillPct, 1) },
  ];
  return (
    <DataTable
      label="Posted strength by facility class"
      columns={cols}
      rows={rows}
      rowKey={(x) => x.id}
      selection="none"
      dense
      footer={
        <tr>
          <td colSpan={2}>Total posted staff</td>
          {td(canon.headline.facilities)}
          {td(canon.headline.capacitySurge)}
          {td(r.totalPosted)}
          <td />
        </tr>
      }
    />
  );
}

/** The three accounting lines. The unposted line is plain text: there is nothing beneath it. */
export function Accounting() {
  const r = reconciliation(canon);
  return (
    <table class="per-acct" aria-label="Personnel accounting">
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">Site</th>
          <th scope="col" class="is-right">
            Strength
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total personnel</td>
          <td>All tiers</td>
          <td class="is-right per-mono">{fmt(r.totalPersonnel)}</td>
        </tr>
        <tr>
          <td>Total posted staff</td>
          <td>{fmt(canon.headline.facilities)} facilities</td>
          <td class="is-right per-mono">{fmt(r.totalPosted)}</td>
        </tr>
        <tr>
          <td>{UNPOSTED}</td>
          <td>Carried centrally</td>
          <td class="is-right per-mono">{fmt(r.unposted)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function openFacility(services: ReturnType<typeof usePer>['services'], id: string): boolean {
  const entry = services.docs.all().find((e) => e.app === 'registry' && e.facility === id);
  if (!entry) return false;
  services.openRoute(entry.route);
  return true;
}

export function StrengthByFacility() {
  const per = usePer();
  const rows = facilityLines(canon);
  const cols: Column<FacilityLine>[] = [
    { key: 'id', header: 'Facility', width: 84, mono: true, sortValue: (x) => x.id },
    { key: 'cls', header: 'Class', width: 56, sortValue: (x) => x.cls },
    { key: 'codename', header: 'Codename', render: (x) => <RxText s={x.codename} /> },
    { key: 'berthing', header: 'Berthing', align: 'right', mono: true, sortValue: (x) => x.berthing, render: (x) => <Figure n={x.berthing} /> },
    { key: 'posted', header: 'Posted', align: 'right', mono: true, sortValue: (x) => x.posted, render: (x) => <Figure n={x.posted} /> },
    { key: 'fill', header: 'Fill %', align: 'right', mono: true, sortValue: (x) => x.fillPct, render: (x) => <Figure n={x.fillPct} digits={1} /> },
    { key: 'cmd', header: 'Commander PN', mono: true, render: (x) => x.commanderPn ?? 'Not appointed' },
  ];
  return (
    <DataTable
      label="Posted strength by facility"
      columns={cols}
      rows={rows}
      rowKey={(x) => x.id}
      selection="single"
      dense
      maxHeight="320px"
      onActivate={(x) => {
        if (!openFacility(per.services, x.id))
          per.refuse({
            title: 'Facility Registry',
            message: `No registry dossier for ${x.id} is held on this workstation.`,
            reference: 'OSC-FAC-IDX',
            authority: 'Facility Registry',
          });
      }}
      footer={
        <tr>
          <td colSpan={3}>Total posted staff</td>
          {td(canon.headline.capacitySurge)}
          {td(canon.headline.staffPosted)}
          <td colSpan={2} />
        </tr>
      }
    />
  );
}

/** Personnel accounting events in the canon calendar, filtered by tier. */
export function PersonnelDiary() {
  const { services } = usePer();
  const tier = services.session.tier.value;
  const events = canon.calendar.filter((e) => e.category === 'PERSONNEL');
  return (
    <table class="per-acct" aria-label="Personnel accounting diary">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Time</th>
          <th scope="col">Site</th>
          <th scope="col">Event</th>
          <th scope="col">Originator</th>
        </tr>
      </thead>
      <tbody>
        {events.map((e) => {
          const shown = e.tier >= tier;
          return (
            <tr key={e.id}>
              <td class="per-mono per-nowrap">{formatOscDate(e.date)}</td>
              <td class="per-mono per-nowrap">{e.startZ ?? ''}</td>
              <td class="per-mono">{e.facility}</td>
              <td>
                {shown ? (
                  <>
                    <RxText s={e.title} />
                    {e.note ? <div class="per-sub">{e.note}</div> : null}
                  </>
                ) : (
                  <Bar k={`T${e.tier}`} len={e.title.length} />
                )}
              </td>
              <td class="per-mono">{e.originator}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Overview() {
  const h = canon.headline;
  return (
    <div class="per-view">
      <PropertyGrid
        caption="Strength summary"
        columns={2}
        rows={[
          { label: 'Total personnel', value: fmt(h.staffTotal), mono: true },
          { label: 'Total posted staff', value: fmt(h.staffPosted), mono: true },
          { label: 'Facilities', value: fmt(h.facilities), mono: true },
          { label: 'Utilization', value: `${fmt(h.utilizationPct, 1)}% of sustained capacity (${fmt(h.capacitySustained)})`, mono: true },
          { label: 'Accounting status', value: <StatusLight status="NOMINAL" word="RETURNS RECEIVED" /> },
          { label: 'Return basis', value: 'Facility strength returns and the pay run' },
        ]}
      />
      <Section id="per-r-tier" title="1. Strength by tier">
        <StrengthByTier />
      </Section>
      <Section id="per-r-class" title="2. Posted strength by facility class">
        <StrengthByClass />
      </Section>
      <Section id="per-r-acct" title="3. Personnel accounting">
        <Accounting />
        <p class="per-note">
          Categories other than POSTED: see personnel accounting (<RouteLink docNo="OSC-DIR-0233" />).
        </p>
      </Section>
      <Section id="per-r-fac" title="4. Posted strength by facility">
        <StrengthByFacility />
        <p class="per-note">Enter or double-click a facility to open its registry dossier.</p>
      </Section>
      <Section title="5. Personnel accounting diary">
        <PersonnelDiary />
      </Section>
    </div>
  );
}
