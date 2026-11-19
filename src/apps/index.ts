/**
 * MERIDIAN application registry. Each app is its own lazy chunk; the shell
 * never imports an app module except through `load`.
 * `icon` values are IconIds expected from @graphics/icons (one per app id).
 */
import type { AppDefinition, AppId } from '@core/contracts';

export const APPS: AppDefinition[] = [
  { id: 'registry', title: 'Facility Registry', icon: 'registry', homeRoute: '/registry', minSize: { w: 640, h: 420 }, defaultSize: { w: 980, h: 640 }, load: () => import('./registry/App') },
  { id: 'transit', title: 'Transit Control', icon: 'transit', homeRoute: '/transit', minSize: { w: 720, h: 460 }, defaultSize: { w: 1060, h: 680 }, load: () => import('./transit/App') },
  { id: 'personnel', title: 'Personnel System', icon: 'personnel', homeRoute: '/personnel', minSize: { w: 600, h: 400 }, defaultSize: { w: 920, h: 620 }, load: () => import('./personnel/App') },
  { id: 'records', title: 'Records Library', icon: 'records', homeRoute: '/records', minSize: { w: 640, h: 420 }, defaultSize: { w: 1000, h: 660 }, load: () => import('./records/App') },
  { id: 'mail', title: 'Message Traffic', icon: 'mail', homeRoute: '/mail', minSize: { w: 600, h: 400 }, defaultSize: { w: 920, h: 620 }, load: () => import('./mail/App') },
  { id: 'ledger', title: 'Ledger', icon: 'ledger', homeRoute: '/ledger', minSize: { w: 640, h: 420 }, defaultSize: { w: 1000, h: 660 }, load: () => import('./ledger/App') },
  { id: 'reserves', title: 'Reserves', icon: 'reserves', homeRoute: '/reserves', minSize: { w: 600, h: 400 }, defaultSize: { w: 920, h: 620 }, load: () => import('./reserves/App') },
  { id: 'assurance', title: 'Assurance', icon: 'assurance', homeRoute: '/assurance', minSize: { w: 600, h: 400 }, defaultSize: { w: 900, h: 620 }, load: () => import('./assurance/App') },
  { id: 'directives', title: 'Directives', icon: 'directives', homeRoute: '/directives', minSize: { w: 540, h: 400 }, defaultSize: { w: 800, h: 640 }, load: () => import('./directives/App') },
  { id: 'forms', title: 'Forms', icon: 'forms', homeRoute: '/forms', minSize: { w: 540, h: 420 }, defaultSize: { w: 760, h: 640 }, load: () => import('./forms/App') },
  { id: 'terminal', title: 'Terminal', icon: 'terminal', homeRoute: '/terminal', minSize: { w: 480, h: 300 }, defaultSize: { w: 740, h: 460 }, load: () => import('./terminal/App') },
  { id: 'system', title: 'System Tools', icon: 'system', homeRoute: '/system', minSize: { w: 480, h: 360 }, defaultSize: { w: 760, h: 540 }, load: () => import('./system/App') },
];

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
