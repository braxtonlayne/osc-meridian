import type { ComponentChildren } from 'preact';
import { routeUrl } from '@core/base';

/**
 * Underlined link to a MERIDIAN route. Plain click runs `go`; Ctrl/Shift/middle-click keep the
 * browser's behaviour with a base-correct href.
 */
export function RouteLink({ path, go, children }: { path: string; go: (p: string) => void; children: ComponentChildren }) {
  return (
    <a
      href={routeUrl(path)}
      onClick={(ev) => {
        if (ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.button !== 0) return;
        ev.preventDefault();
        go(path);
      }}
    >
      {children}
    </a>
  );
}
