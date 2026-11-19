/** Facility Registry: facility dossier (document + side panel) and its tabs. */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Facility, FacilityId } from '@core/canon-types';
import type { RouteEntry, Services } from '@core/contracts';
import { Button, DataTable, GroupBox, PropertyGrid, Splitter, Tabs, type PropertyRow, type TabDef } from '@design/index';
import { OrgChart } from '@graphics/org';
import { appById, isAppId } from '@apps/index';
import { DepthPreview, DepthViewerPane } from './DepthPanel';
import { DocPane, type DocLoad } from './DocPane';
import { MapInset, useSize } from './MapView';
import { cell, connectionsLabel, dossierRoute, figureCell, facilityFromRoute, isOpen, locationLabel, networkName, staffingBars, sustainmentText, type Viewer, type Withheld } from './model';
import { Bar, CellView, RxText, canon, className, fmt, fmtMonth, type RxAudit } from './shared';
import type { TelemetryState } from './telemetry';

type PanelModule = typeof import('./TelemetryPanel');
let panelPromise: Promise<PanelModule> | null = null;

/** The telemetry/reactor instruments module (uPlot) arrives on first use. */
function usePanels(): PanelModule | null {
  const [m, setM] = useState<PanelModule | null>(null);
  useEffect(() => {
    let live = true;
    (panelPromise ??= import('./TelemetryPanel')).then((x) => live && setM(x), () => undefined);
    return () => {
      live = false;
    };
  }, []);
  return m;
}

export type DossierTab = 'dossier' | 'section' | 'telemetry' | 'reactor' | 'command' | 'documents';

export function dossierTabs(f: Facility, viewer: Viewer): TabDef[] {
  const tabs: TabDef[] = [{ id: 'dossier', label: 'Dossier' }];
  if (f.levels?.length) tabs.push({ id: 'section', label: 'Cross-section' });
  if (f.class !== 'DELTA') tabs.push({ id: 'telemetry', label: 'Telemetry' });
  const rx = canon.reactors.find((r) => r.site === f.id);
  if (rx && isOpen(cell(f, 'reactor', true, viewer))) tabs.push({ id: 'reactor', label: 'Reactor' });
  if (f.class !== 'DELTA') tabs.push({ id: 'command', label: 'Command' });
  tabs.push({ id: 'documents', label: 'Documents' });
  return tabs;
}

export interface DossierProps {
  services: Services;
  f: Facility;
  entry: RouteEntry;
  load: DocLoad;
  viewer: Viewer;
  audit: RxAudit;
  tab: DossierTab;
  onTab: (t: DossierTab) => void;
  telemetry: TelemetryState;
  onOpenFacility: (id: string) => void;
  narrow: boolean;
}

export function DossierView(p: DossierProps) {
  const tabs = dossierTabs(p.f, p.viewer);
  const [ref, size] = useSize<HTMLDivElement>();
  const narrow = p.narrow || (size.w > 0 && size.w < 760);
  const active = tabs.some((t) => t.id === p.tab) ? p.tab : 'dossier';
  const [level, setLevel] = useState<number | null>(null);
  const [sideW, setSideW] = useState(420);
  const panels = usePanels();
  const reactorCell = cell(p.f, 'reactor', true, p.viewer);
  const reactorRx: Withheld | null = isOpen(reactorCell) ? null : reactorCell.rx;
  const panelProps = { f: p.f, t: p.telemetry, reactorRx, audit: p.audit };

  let body: ComponentChildren;
  if (active === 'section') {
    body = <SectionTab {...p} level={level} onLevel={setLevel} />;
  } else if (active === 'telemetry') {
    body = <div class="reg-scroll reg-pad">{panels ? <panels.TelemetryFull {...panelProps} /> : <Loading what="telemetry instruments" />}</div>;
  } else if (active === 'reactor') {
    body = <div class="reg-scroll reg-pad">{panels ? <panels.ReactorView {...panelProps} /> : <Loading what="reactor instruments" />}</div>;
  } else if (active === 'command') {
    body = (
      <div class="reg-org">
        <OrgChart
          root={p.f.id}
          sessionTier={p.services.session.tier.value}
          onSelectUnit={(u) => {
            if (facilityFromRoute(dossierRoute(u)) && u !== p.f.id) p.onOpenFacility(u);
            else if (u !== p.f.id) p.services.openRoute('/personnel/org');
          }}
          onSelectPerson={() => p.services.openRoute('/personnel/directory')}
        />
      </div>
    );
  } else if (active === 'documents') {
    body = <DocumentsTab {...p} />;
  } else {
    const side = <SidePanel {...p} panels={panels} reactorRx={reactorRx} onLevel={(n) => (setLevel(n), p.onTab('section'))} />;
    body = narrow ? (
      <div class="reg-scroll">
        <DocPane services={p.services} load={p.load} entry={p.entry} />
        <div class="reg-side reg-side--stacked">{side}</div>
      </div>
    ) : (
      <Splitter direction="horizontal" initial={size.w - sideW} size={Math.max(320, size.w - sideW)} onResize={(px) => setSideW(Math.max(300, size.w - px))} min={300} label="Document and facility panel">
        <div class="reg-scroll">
          <DocPane services={p.services} load={p.load} entry={p.entry} />
        </div>
        <div class="reg-scroll reg-side">{side}</div>
      </Splitter>
    );
  }

  return (
    <Tabs tabs={tabs} active={active} onChange={(id) => p.onTab(id as DossierTab)} label={`Dossier ${p.f.id}`} panel="flush">
      <div class="reg-tabbody" ref={ref}>
        {size.w > 0 ? body : null}
      </div>
    </Tabs>
  );
}

function Loading({ what }: { what: string }) {
  return <p class="reg-note">Loading {what}...</p>;
}

function SidePanel(p: DossierProps & { panels: PanelModule | null; reactorRx: Withheld | null; onLevel: (n: number) => void }) {
  const { f, viewer, audit } = p;
  const [ref, size] = useSize<HTMLDivElement>();
  const w = Math.max(220, size.w - 18);
  const c = <T,>(field: Parameters<typeof cell>[1], v: T, display?: string) => cell(f, field, v, viewer, display);
  const position = c('position', locationLabel(f));
  const conn = connectionsLabel(f, canon);
  const rows: PropertyRow[] = [
    { label: 'Designation', value: f.id, mono: true },
    { label: 'Class', value: `${f.class}, ${className(f.class)}` },
    { label: 'Codename', value: <CellView c={c('codename', f.codename)} id={`${f.id}:codename`} audit={audit} /> },
    { label: 'Location', value: <CellView c={position} id={`${f.id}:location`} audit={audit} /> },
    { label: 'Cover identity', value: <CellView c={c('cover', f.coverIdentity)} id={`${f.id}:cover`} audit={audit} /> },
    { label: 'Depth', value: <CellView c={c('depth', f.depthFt)} id={`${f.id}:depth`} audit={audit} fmt={(v) => (v == null ? '' : `${fmt(v)} ft`)} />, mono: true },
    { label: 'Berthing (surge)', value: <CellView c={figureCell(f, 'capacity', f.capacity, viewer)} id={`${f.id}:capacity`} audit={audit} fmt={fmt} />, mono: true },
    { label: 'Posted staff', value: <CellView c={figureCell(f, 'staff', f.staff, viewer)} id={`${f.id}:staff`} audit={audit} fmt={fmt} />, mono: true },
    { label: 'Sustainment', value: sustainmentText(canon, f) },
    { label: 'Completed', value: <CellView c={c('completed', f.completed)} id={`${f.id}:completed`} audit={audit} fmt={(v) => (v ? fmtMonth(v) : '')} />, mono: true },
    { label: 'Network', value: <CellView c={c('network', networkName(canon, f.network))} id={`${f.id}:network`} audit={audit} /> },
    { label: 'Connections', value: <CellView c={c('connections', conn)} id={`${f.id}:connections`} audit={audit} /> },
  ];
  const staffCell = c('breakdown', f.staffBreakdown.length);
  return (
    <div class="reg-sidepanel" ref={ref}>
      <GroupBox title="Identity">
        <PropertyGrid rows={rows} />
      </GroupBox>
      <GroupBox title="Location">
        {isOpen(position) && typeof f.lat === 'number' ? (
          <MapInset f={f} width={w} height={Math.round(w * 0.62)} />
        ) : (
          <p class="reg-note">
            Position withheld. <CellView c={position} id={`${f.id}:position`} audit={audit} />
          </p>
        )}
      </GroupBox>
      <GroupBox title="Staffing by post">
        {isOpen(staffCell) ? (
          <table class="reg-bars">
            <tbody>
              {staffingBars(f).map((l) => (
                <tr key={l.role}>
                  <th scope="row">{l.role}</th>
                  <td class="reg-bars__bar">
                    <span class="reg-bars__fill" style={{ width: `${l.pct}%` }} />
                  </td>
                  <td class="reg-mono reg-num">{fmt(l.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p class="reg-note">
            Breakdown withheld. <Bar rx={staffCell.rx} id={`${f.id}:breakdown`} audit={audit} />
          </p>
        )}
      </GroupBox>
      {f.levels?.length ? (
        <GroupBox title="Depth section">
          <DepthPreview facilityId={f.id} tier={p.services.session.tier.value} width={w} height={Math.round(w * 0.84)} onSelectLevel={p.onLevel} />
          <div class="reg-actions">
            <Button size="small" label="Open &cross-section" onClick={() => p.onTab('section')} />
          </div>
        </GroupBox>
      ) : null}
      {canon.reactors.some((r) => r.site === f.id) ? (
        <GroupBox title="Reactor plant">
          {p.panels ? <p.panels.ReactorGauges f={f} t={p.telemetry} reactorRx={p.reactorRx} audit={audit} /> : <Loading what="reactor instruments" />}
          {p.reactorRx ? null : (
            <div class="reg-actions">
              <Button size="small" label="&Reactor tab" onClick={() => p.onTab('reactor')} />
            </div>
          )}
        </GroupBox>
      ) : null}
      {f.class !== 'DELTA' ? (
        <GroupBox title="Live telemetry">
          {p.panels ? <p.panels.TelemetrySummary f={f} t={p.telemetry} reactorRx={p.reactorRx} audit={audit} /> : <Loading what="telemetry" />}
          <div class="reg-actions">
            <Button size="small" label="&Telemetry tab" onClick={() => p.onTab('telemetry')} />
          </div>
        </GroupBox>
      ) : (
        <GroupBox title="Telemetry">
          <p class="reg-note">No site data concentrator is registered for this installation.</p>
        </GroupBox>
      )}
    </div>
  );
}

function SectionTab(p: DossierProps & { level: number | null; onLevel: (n: number) => void }) {
  const tier = p.services.session.tier.value;
  const reduced = p.services.settings.reducedMotion.value;
  const levels = p.f.levels ?? [];
  const lv = levels.find((l) => l.n === p.level) ?? null;
  return (
    <div class="reg-section">
      <div class="reg-section__view">
        <DepthViewerPane facilityId={p.f.id} tier={tier} reducedMotion={reduced} level={p.level} onSelectLevel={p.onLevel} />
      </div>
      <div class="reg-section__detail" aria-live="polite">
        <GroupBox title="Level record">
          {lv ? (
            <dl class="reg-dl">
              <dt>Level</dt>
              <dd class="reg-mono">{lv.n}</dd>
              <dt>Name</dt>
              <dd>{lv.tier < tier ? <WithheldText text={lv.name} id={`${p.f.id}:L${lv.n}:name`} audit={p.audit} tier={lv.tier} /> : <RxText text={lv.name} id={`${p.f.id}:L${lv.n}:name`} audit={p.audit} />}</dd>
              <dt>Depth</dt>
              <dd class="reg-mono">
                {fmt(lv.topFt)} to {fmt(lv.topFt + lv.heightFt)} ft
              </dd>
              <dt>Access</dt>
              <dd>Tier {lv.tier} and above</dd>
              <dt>Notes</dt>
              <dd>{lv.tier < tier ? <WithheldText text={lv.notes} id={`${p.f.id}:L${lv.n}:notes`} audit={p.audit} tier={lv.tier} /> : <RxText text={lv.notes} id={`${p.f.id}:L${lv.n}:notes`} audit={p.audit} />}</dd>
            </dl>
          ) : (
            <p class="reg-note">Select a level in the drawing or its index. Arrow keys step through the levels.</p>
          )}
        </GroupBox>
        <p class="reg-note">
          Depths from the facility record. Horizontal extents schematic. {levels.length} levels to the rail terminal floor at <span class="reg-mono">{fmt(p.f.depthFt ?? 0)} ft</span>.
        </p>
      </div>
    </div>
  );
}

/** A level field above the session's tier: always a bar, even if the text arrived in clear. */
function WithheldText({ text, id, audit, tier }: { text: string; id: string; audit: RxAudit; tier: number }) {
  const parts = /^\[\[RX:/.test(text) ? null : text.length;
  if (parts == null) return <RxText text={text} id={id} audit={audit} />;
  return <Bar rx={{ key: `T${tier}`, len: parts }} id={id} audit={audit} />;
}

function DocumentsTab(p: DossierProps) {
  const id = p.f.id as FacilityId;
  const xrefs = p.load.state === 'ready' ? new Set(p.load.doc.xrefs.map((x) => x.docNo)) : new Set<string>();
  const all = p.services.docs.all();
  const rows = all
    .filter((r) => r.id !== p.entry.id && (r.facility === id || xrefs.has(r.docNo) || r.title.includes(id)))
    .sort((a, b) => (a.docNo < b.docNo ? -1 : 1));
  return (
    <div class="reg-scroll reg-pad">
      <p class="reg-note">Documents filed against {id} or referred to by its dossier. Enter or double-click opens the document in its application.</p>
      <DataTable<RouteEntry>
        label={`Documents for ${id}`}
        rows={rows}
        rowKey={(r) => r.id}
        selection="single"
        onActivate={(r) => p.services.openRoute(r.route)}
        dense
        defaultSort={{ key: 'docNo', dir: 'asc' }}
        columns={[
          { key: 'docNo', header: 'Document No.', width: 150, mono: true, sortValue: (r) => r.docNo },
          {
            key: 'title',
            header: 'Title',
            sortValue: (r) => r.title,
            render: (r) => (
              <a
                href={r.route}
                onClick={(e) => {
                  if (e.ctrlKey || e.shiftKey || e.metaKey) return;
                  e.preventDefault();
                  p.services.openRoute(r.route);
                }}
              >
                {r.title}
              </a>
            ),
          },
          { key: 'marking', header: 'Marking', width: 190, sortValue: (r) => canon.markings.find((m) => m.id === r.marking)?.rank ?? 0, render: (r) => canon.markings.find((m) => m.id === r.marking)?.label ?? r.marking },
          { key: 'date', header: 'Date', width: 96, mono: true, sortValue: (r) => r.date },
          { key: 'app', header: 'Held in', width: 120, sortValue: (r) => r.app, render: (r) => appTitle(r.app) },
        ]}
        empty={<span class="reg-note">No other documents are filed against this installation.</span>}
      />
    </div>
  );
}

const appTitle = (id: string): string => (isAppId(id) ? appById(id)?.title : undefined) ?? id;
