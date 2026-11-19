/**
 * Base-path helpers. GitHub Pages serves MERIDIAN under /osc-meridian/, local dev under /.
 * Every runtime URL goes through asset() or routeUrl() (docs/CONTRACTS.md).
 * Safe to import outside Vite (scripts, tests): falls back to "/".
 */

function normalize(b: string | undefined): string {
  let base = (b ?? '/').trim() || '/';
  if (!base.startsWith('/') && !/^[a-z]+:/i.test(base) && !base.startsWith('.')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

const viteEnv = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;

/** Public base path with a trailing slash: "/" or "/osc-meridian/". */
export const BASE: string = normalize(viteEnv?.BASE_URL);

/** URL of a file under public/ or dist/: asset('data/docs/x.json') -> "/osc-meridian/data/docs/x.json". */
export function asset(path: string): string {
  return BASE + path.replace(/^\/+/, '');
}

/** URL of an in-app route: routeUrl('/directives/dir-0412') -> "/osc-meridian/directives/dir-0412". */
export function routeUrl(route: string): string {
  return BASE + route.replace(/^\/+/, '');
}

/** Inverse of routeUrl for a location pathname; returns "/" for the base itself. */
export function routeFromPath(pathname: string): string {
  let p = pathname;
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  else if (`${p}/` === BASE) p = '';
  p = p.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return `/${p.replace(/^\/+/, '')}`;
}
