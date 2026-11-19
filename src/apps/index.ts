/**
 * MERIDIAN application registry. Each app is its own lazy chunk; the shell
 * never imports an app module except through `load`.
 * `icon` values are IconIds expected from @graphics/icons (one per app id).
 */
import type { AppDefinition, AppId } from '@core/contracts';

export const APPS: AppDefinition[] = [
  { id: 'registry', title: 'Facility Registry', icon: 'registry', homeRoute: '/registry', minSize: { w: 640, h: 420 }, defaultSize: { w: 1180, h: 640 }, load: () => import('./registry/App') },
  { id: 'transit', title: 'Transit Control', icon: 'transit', homeRoute: '/transit', minSize: { w: 720, h: 460 }, defaultSize: { w: 1060, h: 680 }, load: () => import('./transit/App') },
  { id: 'personnel', title: 'Personnel System', icon: 'personnel', homeRoute: '/personnel', minSize: { w: 600, h: 400 }, defaultSize: { w: 920, h: 620 }, load: () => import('./personnel/App') },
  { id: 'records', title: 'Records Library', icon: 'records', homeRoute: '/records', minSize: { w: 640, h: 420 }, defaultSize: { w: 1040, h: 660 }, load: () => import('./records/App') },
  { id: 'mail', title: 'Message Traffic', icon: 'mail', homeRoute: '/mail', minSize: { w: 600, h: 400 }, defaultSize: { w: 1180, h: 620 }, load: () => import('./mail/App') },
  { id: 'ledger', title: 'Ledger', icon: 'ledger', homeRoute: '/ledger', minSize: { w: 640, h: 420 }, defaultSize: { w: 1000, h: 660 }, load: () => import('./ledger/App') },
  { id: 'reserves', title: 'Reserves', icon: 'reserves', homeRoute: '/reserves', minSize: { w: 600, h: 400 }, defaultSize: { w: 1040, h: 620 }, load: () => import('./reserves/App') },
  { id: 'assurance', title: 'Assurance', icon: 'assurance', homeRoute: '/assurance', minSize: { w: 600, h: 400 }, defaultSize: { w: 1080, h: 620 }, load: () => import('./assurance/App') },
  { id: 'directives', title: 'Directives', icon: 'directives', homeRoute: '/directives', minSize: { w: 540, h: 400 }, defaultSize: { w: 800, h: 640 }, load: () => import('./directives/App') },
  { id: 'forms', title: 'Forms', icon: 'forms', homeRoute: '/forms', minSize: { w: 540, h: 420 }, defaultSize: { w: 900, h: 640 }, load: () => import('./forms/App') },
  { id: 'terminal', title: 'Terminal', icon: 'terminal', homeRoute: '/terminal', minSize: { w: 480, h: 300 }, defaultSize: { w: 740, h: 460 }, load: () => import('./terminal/App') },
  { id: 'system', title: 'System Tools', icon: 'system', homeRoute: '/system', minSize: { w: 480, h: 360 }, defaultSize: { w: 760, h: 540 }, load: () => import('./system/App') },
  // Pass two: plant and operations set pieces (docs/SPEC-2.md §3).
  { id: 'strike', title: 'Hardened Site Survivability Estimator', icon: 'strike', homeRoute: '/strike', minSize: { w: 720, h: 460 }, defaultSize: { w: 1120, h: 680 }, load: () => import('./strike/App') },
  { id: 'isolate', title: 'Network Isolation, Manual Initiate', icon: 'isolate', homeRoute: '/isolate', minSize: { w: 520, h: 420 }, defaultSize: { w: 760, h: 600 }, load: () => import('./isolate/App') },
  { id: 'drill', title: 'Seal Drill Coordinator', icon: 'drill', homeRoute: '/drill', minSize: { w: 720, h: 460 }, defaultSize: { w: 1120, h: 680 }, load: () => import('./drill/App') },
  { id: 'cctv', title: 'Facility Video', icon: 'cctv', homeRoute: '/cctv', minSize: { w: 640, h: 440 }, defaultSize: { w: 1040, h: 680 }, load: () => import('./cctv/App') },
  { id: 'plant', title: 'Reactor Plant Panel', icon: 'plant', homeRoute: '/plant', minSize: { w: 760, h: 500 }, defaultSize: { w: 1180, h: 700 }, load: () => import('./plant/App') },
  { id: 'doors', title: 'Door and Airlock Control', icon: 'doors', homeRoute: '/doors', minSize: { w: 680, h: 440 }, defaultSize: { w: 1040, h: 660 }, load: () => import('./doors/App') },
  { id: 'dispatch', title: 'Dispatcher Workstation', icon: 'dispatch', homeRoute: '/dispatch', minSize: { w: 720, h: 460 }, defaultSize: { w: 1100, h: 680 }, load: () => import('./dispatch/App') },
  { id: 'hoist', title: 'Shaft Hoist Control', icon: 'hoist', homeRoute: '/hoist', minSize: { w: 640, h: 440 }, defaultSize: { w: 960, h: 640 }, load: () => import('./hoist/App') },
  { id: 'environ', title: 'Environmental Control', icon: 'environ', homeRoute: '/environ', minSize: { w: 680, h: 440 }, defaultSize: { w: 1040, h: 660 }, load: () => import('./environ/App') },
  { id: 'pa', title: 'Emergency Broadcast and Public Address', icon: 'pa', homeRoute: '/pa', minSize: { w: 600, h: 420 }, defaultSize: { w: 940, h: 620 }, load: () => import('./pa/App') },
  { id: 'muster', title: 'Muster Board', icon: 'muster', homeRoute: '/muster', minSize: { w: 640, h: 420 }, defaultSize: { w: 1000, h: 640 }, load: () => import('./muster/App') },
  { id: 'patch', title: 'Hub Circuit Patch Panel', icon: 'patch', homeRoute: '/patch', minSize: { w: 680, h: 440 }, defaultSize: { w: 1040, h: 640 }, load: () => import('./patch/App') },
];

/** Pass-one applications (Directory: "Applications"). */
export const OFFICE_APP_IDS: readonly AppId[] = ['registry', 'transit', 'personnel', 'records', 'mail', 'ledger', 'reserves', 'assurance', 'directives', 'forms', 'terminal', 'system'];
/** Pass-two set pieces (Directory: "Plant and Operations"). */
export const PLANT_APP_IDS: readonly AppId[] = ['strike', 'isolate', 'drill', 'cctv', 'plant', 'doors', 'dispatch', 'hoist', 'environ', 'pa', 'muster', 'patch'];

const byId = new Map<AppId, AppDefinition>(APPS.map((a) => [a.id, a]));

export function appById(id: AppId): AppDefinition | undefined {
  return byId.get(id);
}

export function isAppId(id: string): id is AppId {
  return byId.has(id as AppId);
}

/** App whose homeRoute equals or prefixes the path ("/registry/alpha-03" -> registry). */
export function appForPath(path: string): AppDefinition | undefined {
  const seg = '/' + (path.split('/')[1] ?? '');
  return APPS.find((a) => a.homeRoute === seg);
}

export default APPS;
