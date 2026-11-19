/** Interactive panels for the classification guide, protocols, cover catalogue and contractor register. */
import { useMemo, useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import type { Contractor, CoverCatalogueEntry } from '@core/canon-types';
import { isRx, rxInfo } from '@core/rx';
import { useServices } from '@core/services';
import { WORKSTATION_ID } from '@core/audit';
import { DataTable, GroupBox, PropertyGrid, StatusLight, Tabs, formatNumber, formatOscDate, markingStyle, type Column } from '@design/index';
import { contractorStats, releasedSites } from './logic';
import { COUNCIL_RX, CVO_RX, OIA_RX, Withheld, canon, useGridCols } from './shared';

/* ------------------------------------------------- classification guide */

export function ClassificationPanel({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const held = services.session.compartments.value;
  const markings = [...canon.markings].sort((a, b) => a.rank - b.rank);
  return (
    <>
      <GroupBox title="Markings in use" on="surface">
        <table class="asr-table" aria-label="Markings, lowest to highest">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Banner text</th>
              <th scope="col">Marking</th>
              <th scope="col">Written in source documents as</th>
              <th scope="col">Used for</th>
            </tr>
          </thead>
          <tbody>
            {markings.map((m) => (
              <tr key={m.id}>
                <td class="asr-num">{m.rank}</td>
                <td>
                  <span class="asr-swatch" style={markingStyle(m)}>
                    {m.label}
                  </span>
                </td>
                <td class="asr-mono">{m.id}</td>
                <td>{m.sourceLabel}</td>
                <td class="asr-wrap">{m.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GroupBox>
      <GroupBox title="Tiers and clearance markings" on="surface">
        <table class="asr-table" aria-label="Tiers and clearance">
          <thead>
            <tr>
              <th scope="col">Tier</th>
              <th scope="col">Designation</th>
              <th scope="col">Clearance held</th>
              <th scope="col">Highest OSC marking</th>
            </tr>
          </thead>
          <tbody>
            {canon.tiers.map((t) => {
              const m = canon.markings.find((x) => x.sourceLabel === t.clearance);
              return (
                <tr key={t.tier}>
                  <td class="asr-num">{t.tier}</td>
                  <td>{t.name}</td>
                  <td>{t.clearance}</td>
                  <td>{m ? <span class="asr-swatch asr-swatch--sm" style={markingStyle(m)}>{m.label}</span> : <span class="asr-dim">No OSC banner</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GroupBox>
      <GroupBox title="Compartments" on="surface">
        <table class="asr-table" aria-label="Compartments">
          <thead>
            <tr>
              <th scope="col">Compartment</th>
              <th scope="col">Scope</th>
              <th scope="col">Briefing</th>
              <th scope="col">This operator</th>
            </tr>
          </thead>
          <tbody>
            {canon.compartments.map((c) => {
              const has = held.includes(c.id);
              return (
                <tr key={c.id}>
                  <td class="asr-mono">{c.name}</td>
                  <td class="asr-wrap">{c.scope}</td>
                  <td class="asr-mono">{c.briefingDocNo}</td>
                  <td>
                    <StatusLight status={has ? 'NOMINAL' : 'OFFLINE'} word={has ? 'HELD' : 'NOT HELD'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p class="asr-note">
          Effective access for {services.session.operatorId.value}: Tier {services.session.tier.value}
          {services.session.actingTier2.value ? ' (acting)' : ''}. Compartment read-in is recorded against the operator's access determination by Classification Control.
        </p>
      </GroupBox>
      <GroupBox title="Classification control: Facility Inventory" on="surface">
        <PropertyGrid rows={canon.classificationControl.map((c) => ({ label: c.label, value: c.text }))} caption={`Control lines as printed on the inventory, cited by ${entry.docNo}`} />
      </GroupBox>
    </>
  );
}

/* ------------------------------------------------------------ protocols */

export function PersonnelSecurityPanel({ onActivity }: { onActivity: () => void }) {
  const services = useServices();
  const gridCols = useGridCols();
  const p = canon.security.personnel;
  const n = services.audit.entries.value.length;
  return (
    <>
      <GroupBox title="Personnel security protocol (summary)" on="surface">
        <PropertyGrid
          rows={[
            { label: 'Investigation', value: p.investigation },
            {
              label: 'Supplement covers',
              value: (
                <ul class="asr-list">
                  {p.focusAreas.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ),
            },
            { label: 'Compartmentation', value: p.compartmentation },
          ]}
        />
      </GroupBox>
      <GroupBox title="This operator" on="surface">
        <PropertyGrid
          columns={gridCols}
          rows={[
            { label: 'Operator', value: services.session.operatorId.value, mono: true },
            { label: 'Personnel number', value: services.account.def.value.pn, mono: true },
            { label: 'Tier', value: `${services.session.tier.value}${services.session.actingTier2.value ? ' (acting)' : ''}` },
            { label: 'Compartments', value: services.session.compartments.value.join(', ') || 'None' },
            ...(services.account.def.value.probationStart
              ? [{ label: 'Probation', value: `Day ${services.session.probationDay.value} (transfer of ${formatOscDate(services.account.def.value.probationStart)})` }]
              : []),
            { label: 'Workstation', value: WORKSTATION_ID, mono: true },
            {
              label: 'Audit trail',
              value: (
                <a
                  href="#activity"
                  onClick={(e) => {
                    e.preventDefault();
                    onActivity();
                  }}
                >
                  {formatNumber(n)} entries recorded
                </a>
              ),
            },
          ]}
        />
      </GroupBox>
    </>
  );
}

export function CommunicationsPanel() {
  const services = useServices();
  const cms = canon.divisions.find((d) => d.id === 'CMS');
  return (
    <GroupBox title="Communications security (summary)" on="surface">
      <PropertyGrid
        columns={1}
        rows={[
          { label: 'Network', value: canon.security.personnel.communications },
          { label: 'Accrediting office', value: cms ? `${cms.name}, ${cms.site}` : '' },
          { label: 'This workstation', value: `${WORKSTATION_ID} (${services.account.def.value.site}), operator ${services.session.operatorId.value}`, mono: true },
          { label: 'Inventory handling', value: canon.classificationControl[0]?.text ?? '' },
        ].filter((r) => r.value)}
      />
    </GroupBox>
  );
}

/* ------------------------------------------------------ cover catalogue */


export function CoverPanel({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const sextant = services.clearance.satisfies('SEXTANT');
  const released = useMemo(() => releasedSites(services.account.def.value.site, canon.facilities), []);
  const [sel, setSel] = useState<string | null>(services.account.def.value.site);
  const open = (c: CoverCatalogueEntry) => sextant || released.has(c.facility);
  // Bars are sized to the withheld text; a client-canon sentinel carries that length itself.
  const bar = (text: string) => <Withheld len={rxInfo(text)?.len ?? text.length} docNo={entry.docNo} auth={CVO_RX.auth} reference={CVO_RX.ref} />;
  // A value the client canon withholds (sentinel or null) stays a bar even when SEXTANT is held.
  const txt = (c: CoverCatalogueEntry, v: string, show = (s: string): string => s) => (open(c) && !isRx(v) ? show(v) : bar(isRx(v) ? v : show(v)));
  const cols: Column<CoverCatalogueEntry>[] = [
    { key: 'f', header: 'Facility', width: 80, mono: true, sortValue: (c) => c.facility, render: (c) => c.facility },
    { key: 'a', header: 'Cover agency', wrap: true, render: (c) => txt(c, c.coverAgency) },
    { key: 't', header: 'Cover facility type', wrap: true, render: (c) => txt(c, c.coverFacilityType) },
    { key: 's', header: 'Surface staff', width: 84, align: 'right', mono: true, render: (c) => (c.visibleSurfaceStaff === null ? bar('0000') : open(c) ? formatNumber(c.visibleSurfaceStaff) : bar(String(c.visibleSurfaceStaff))) },
    { key: 'r', header: 'Last review', width: 96, mono: true, render: (c) => txt(c, c.lastCoverReview, formatOscDate) },
  ];
  const row = canon.coverCatalogue.find((c) => c.facility === sel);
  const shown = canon.coverCatalogue.filter((c) => open(c) && !isRx(c.coverAgency)).length;
  return (
    <GroupBox title={`Cover identities: ${shown} of ${canon.coverCatalogue.length} entries released to this operator`} on="surface">
      <DataTable
        label="Cover identity catalogue"
        columns={cols}
        rows={canon.coverCatalogue}
        rowKey={(c) => c.facility}
        selection="single"
        selected={sel ? [sel] : []}
        onSelectionChange={(k) => setSel(k[0] ?? null)}
        dense
        wrap
      />
      {row && (
        <PropertyGrid
          caption={`${row.facility}: public records posture`}
          rows={[{ label: 'Public records', value: txt(row, row.publicRecordsPosture) }]}
        />
      )}
    </GroupBox>
  );
}

/* ---------------------------------------------------- contractor register */

const CLASSES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'] as const;

export function ContractorPanel({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const gridCols = useGridCols();
  const [tab, setTab] = useState<'register' | 'matrix'>('register');
  const [sel, setSel] = useState<string | null>(canon.contractors.register[0]?.id ?? null);
  const sextant = services.clearance.satisfies('SEXTANT');
  const released = useMemo(() => releasedSites(services.account.def.value.site, canon.facilities), []);
  const st = contractorStats(canon.contractors.register, canon.contractors.maxSitesKnown);
  const colOpen = (site: string) => !site.startsWith('DELTA') && (sextant || released.has(site));
  const sites = canon.facilities.map((f) => f.id);
  const c = canon.contractors.register.find((x) => x.id === sel) ?? null;

  const cols: Column<Contractor>[] = [
    { key: 'id', header: 'Prime', width: 56, mono: true, sortValue: (x) => x.id, render: (x) => x.id },
    { key: 'name', header: 'Firm', wrap: true, sortValue: (x) => x.name, render: (x) => x.name },
    { key: 'trade', header: 'Trade', wrap: true, sortValue: (x) => x.trade, render: (x) => x.trade },
    { key: 'subs', header: 'Subs', width: 48, align: 'right', mono: true, sortValue: (x) => x.subcontractors, render: (x) => String(x.subcontractors) },
    { key: 'n', header: 'Sites known', width: 74, align: 'right', mono: true, sortValue: (x) => x.sites.length, render: (x) => String(x.sites.length) },
  ];

  return (
    <>
      <GroupBox title="Construction security protocols" on="surface">
        <PropertyGrid rows={canon.security.construction.map((s) => ({ label: s.label, value: s.text }))} />
      </GroupBox>
      <GroupBox title="Register control" on="surface">
        <PropertyGrid
          columns={gridCols}
          rows={[
            { label: 'Prime contractors', value: formatNumber(st.primes), mono: true },
            { label: 'Subcontractors', value: `${formatNumber(st.subs)} (mean ${canon.contractors.avgSubs})`, mono: true },
            { label: 'Site limit per prime', value: formatNumber(canon.contractors.maxSitesKnown), mono: true },
            { label: 'Most sites known', value: formatNumber(st.maxSites), mono: true },
            {
              label: 'Compartment check',
              value: st.overLimit.length ? <StatusLight status="FAULT" word="EXCEEDED" note={st.overLimit.join(', ')} /> : <StatusLight status="NOMINAL" word="WITHIN LIMIT" />,
            },
          ]}
        />
      </GroupBox>
      <Tabs
        label="Contractor register views"
        active={tab}
        onChange={(t) => setTab(t === 'matrix' ? 'matrix' : 'register')}
        panel="surface"
        tabs={[
          { id: 'register', label: '&Register' },
          { id: 'matrix', label: 'Compartment &matrix' },
        ]}
      >
        {tab === 'register' ? (
          <div class="asr-pad">
            <DataTable
              label="Prime contractor register"
              columns={cols}
              rows={canon.contractors.register}
              rowKey={(x) => x.id}
              selection="single"
              selected={sel ? [sel] : []}
              onSelectionChange={(k) => setSel(k[0] ?? null)}
              dense
              maxHeight="280px"
            />
            {c && (
              <PropertyGrid
                caption={`${c.id}: ${c.name}`}
                rows={[
                  { label: 'Trade', value: c.trade },
                  { label: 'Subcontractors', value: String(c.subcontractors), mono: true },
                  {
                    label: 'Sites',
                    value: (
                      <span class="asr-sites">
                        {c.sites.map((s) =>
                          colOpen(s) ? (
                            <span key={s} class="asr-mono">
                              {s}
                            </span>
                          ) : (
                            <Withheld key={s} len={s.length} docNo={entry.docNo} auth={s.startsWith('DELTA') ? COUNCIL_RX.auth : OIA_RX.auth} reference={s.startsWith('DELTA') ? COUNCIL_RX.ref : OIA_RX.ref} />
                          ),
                        )}
                      </span>
                    ),
                  },
                  { label: 'Compartment note', value: c.compartmentNote },
                ]}
              />
            )}
          </div>
        ) : (
          <div class="asr-pad">
            <p class="asr-note">
              Each row is a prime contractor; a mark shows a site the firm was told of. Columns for sites outside this operator's released geography are withheld:
              {sextant ? '' : ` other sites by ${OIA_RX.auth} (Ref ${OIA_RX.ref});`} DELTA sites by {COUNCIL_RX.auth} (Ref {COUNCIL_RX.ref}).
            </p>
            <div class="asr-matrix-wrap" tabIndex={0} role="region" aria-label="Contractor compartment matrix, scrollable">
              <table class="asr-matrix">
                <thead>
                  <tr>
                    <th scope="col" rowSpan={2} class="asr-matrix-corner">
                      Prime
                    </th>
                    {CLASSES.map((k) => (
                      <th key={k} scope="colgroup" colSpan={sites.filter((s) => s.startsWith(k)).length} class="asr-matrix-class">
                        {k}
                      </th>
                    ))}
                    <th scope="col" rowSpan={2}>
                      Sites
                    </th>
                  </tr>
                  <tr>
                    {sites.map((s) => (
                      <th key={s} scope="col" class={colOpen(s) ? 'asr-matrix-site' : 'asr-matrix-site asr-matrix-site--rx'} title={s}>
                        <span>{s.split('-')[1]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {canon.contractors.register.map((x) => (
                    <tr key={x.id} class={x.id === sel ? 'is-sel' : undefined} onClick={() => setSel(x.id)}>
                      <th scope="row" class="asr-mono" title={x.name}>
                        {x.id}
                      </th>
                      {sites.map((s) =>
                        colOpen(s) ? (
                          <td key={s} class="asr-matrix-cell" aria-label={x.sites.includes(s as never) ? `${s} known` : undefined}>
                            {x.sites.includes(s as never) ? <span class="asr-mark" /> : null}
                          </td>
                        ) : (
                          <td key={s} class="asr-matrix-cell asr-matrix-cell--rx" aria-hidden="true" />
                        ),
                      )}
                      <td class="asr-num">{x.sites.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div class="asr-legend">
              <span>
                <span class="asr-mark" /> site made known to the firm
              </span>
              <span>
                <span class="asr-legend-rx" /> withheld column
              </span>
              <span>
                Released columns: {sites.filter(colOpen).length} of {sites.length}
              </span>
            </div>
          </div>
        )}
      </Tabs>
    </>
  );
}
