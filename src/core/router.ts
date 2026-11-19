/**
 * Hash-free router. Paths inside MERIDIAN never include the deploy base:
 * "/directives/dir-0412". The URL bar shows BASE + path.
 *
 * - On boot the shell reads `currentPath()` and, after sign-in, opens it.
 * - Focusing a window `replacePath`s to that window's route.
 * - Navigating (opening a route, window.navigate) `pushPath`s.
 * - `onPop` restores: the shell focuses or opens the window for the path.
 */
import { BASE } from '@shell/adapters';

/** "/a/b/" -> "/a/b"; "" -> "/"; strips query, hash, index.html. */
export function normalize(path: string): string {
  let p = path.split(/[?#]/)[0] ?? '/';
  p = p.replace(/\/index\.html?$/i, '/');
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  try {
    p = decodeURI(p);
  } catch {
    /* leave encoded */
  }
  return p || '/';
}

/** location.pathname minus BASE, normalised. */
export function currentPath(): string {
  const raw = location.pathname;
  const base = BASE.replace(/\/$/, '');
  const rest = base && raw.startsWith(base) ? raw.slice(base.length) : raw;
  return normalize(rest);
}

export function toUrl(path: string): string {
  const p = normalize(path);
  return BASE + (p === '/' ? '' : encodeURI(p.slice(1)));
}

export function pushPath(path: string): void {
  const url = toUrl(path);
  if (url !== location.pathname) history.pushState({ meridian: normalize(path) }, '', url);
}

export function replacePath(path: string): void {
  const url = toUrl(path);
  if (url !== location.pathname) history.replaceState({ meridian: normalize(path) }, '', url);
}

export function onPop(fn: (path: string) => void): () => void {
  const h = () => fn(currentPath());
  window.addEventListener('popstate', h);
  return () => window.removeEventListener('popstate', h);
}
