/**
 * Facility Registry for the Tier 4 account (closed world, docs/SPEC-2.md §1). Only pages issued to
 * Tier 4 reach here (the site extract and the class extract). The operator sees the document and,
 * on the own-site dossier, a site panel with no depth, position, network, connections, command
 * chart or links to other classes or installations. No other facility is named or reachable.
 */
import { useEffect, useMemo } from 'preact/hooks';
import type { AppProps, RouteEntry } from '@core/contracts';
import { useServices } from '@core/services';
import { GroupBox, MenuBar, PropertyGrid, StatusBar, type MenuBarMenu } from '@design/index';
import type { EnvironState } from '@apps/environ/types';
import type { DoorsState } from '@apps/doors/types';
import { DocPane, useDoc } from './DocPane';
import { usePanels } from './DossierView';
import { figureCell, facilityFromRoute } from './model';
import { CellView, className, facilityById, fmt, useRxAudit, useViewer } from './shared';
import { seedFor, useTelemetry } from './telemetry';
import { overlayReading } from './plant-overlay';

export function T4Registry({ win, entry }: Pick<AppProps, 'win'> & { entry: RouteEntry }) {
  const services = useServices();
  const viewer = useViewer(services);
  const own = services.account.def.value.site;
  const facId = facilityFromRoute(entry.route);
  const fac = facId === own ? (facilityById.get(facId) ?? null) : null;
  const audit = useRxAudit(services, entry.docNo);
  const load = useDoc(services, entry);
  const panels = usePanels();
  const seed = useMemo(() => (fac ? seedFor(fac) : null), [fac?.id]);
  const simulated = useTelemetry(seed);
  const environ = services.shared.get<EnvironState | null>('environ', null).value;
  const doorsState = services.shared.get<DoorsState | null>('doors', null).value;
  const telemetry = useMemo(() => {
    if (!fac || !simulated.latest) return simulated;
    return { ...simulated, latest: overlayReading(simulated.latest, fac.id, environ, doorsState, Date.now()) };
  }, [simulated, fac?.id, environ, doorsState]);

  useEffect(() => {
    win.setTitle(entry.title, entry.docNo);
    win.setMarking(entry.marking);
    win.setStatus(`${entry.docNo} · issued to Tier 4 personnel at ${own}`);
  }, [entry.id]);

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print document...', shortcut: 'Ctrl+P', onSelect: () => services.print(entry.id) },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    { label: '&Help', items: [{ label: '&Directives issued to this operator', onSelect: () => services.openApp('directives') }] },
  ];

  return (
    <div class="reg-app reg-t4">
      <MenuBar menus={menus} label="Facility Registry menu" />
      <div class="reg-t4__body">
        <div class="reg-scroll">
          <DocPane services={services} load={load} entry={entry} />
        </div>
        {fac ? (
          <div class="reg-scroll reg-side reg-t4__side">
            <div class="reg-sidepanel">
              <GroupBox title="Site">
                <PropertyGrid
                  rows={[
                    { label: 'Designation', value: fac.id, mono: true },
                    { label: 'Class', value: `${fac.class}, ${className(fac.class)}` },
                    { label: 'Posted staff', value: <CellView c={figureCell(fac, 'staff', fac.staff, viewer)} id={`${fac.id}:staff`} audit={audit} fmt={fmt} />, mono: true },
                    { label: 'Berthing (surge)', value: <CellView c={figureCell(fac, 'capacity', fac.capacity, viewer)} id={`${fac.id}:capacity`} audit={audit} fmt={fmt} />, mono: true },
                  ]}
                />
              </GroupBox>
              <GroupBox title="Live telemetry">
                {panels ? <panels.TelemetrySummary f={fac} t={telemetry} reactorRx={null} audit={audit} /> : <p class="reg-note">Loading telemetry...</p>}
              </GroupBox>
            </div>
          </div>
        ) : null}
      </div>
      <StatusBar
        panes={[
          { id: 'msg', fill: true, content: `${entry.docNo}. Issued to Tier 4 personnel (DIR-0301).` },
          { id: 'site', width: 96, mono: true, content: own },
        ]}
      />
    </div>
  );
}
