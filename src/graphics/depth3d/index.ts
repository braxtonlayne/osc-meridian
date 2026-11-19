/**
 * @graphics/depth3d: depth cross-section viewer for the ALPHA sites.
 *
 *   const { mountDepthViewer } = await import('@graphics/depth3d');
 *   const viewer = mountDepthViewer(el, 'ALPHA-03', { tier: 3, onSelectLevel });
 *   viewer.selectLevel(6); viewer.setTier(2); viewer.dispose();
 *
 * This file does not import three. The scene (and three with it) is fetched with a
 * dynamic import the first time a viewer is mounted on a machine that has WebGL 2;
 * otherwise the SVG elevation (DepthSection2D) is drawn in the same frame.
 */
import { h as jsx, render } from 'preact';
import { createChrome, type ViewImpl } from './chrome';
import { DepthSection2D } from './DepthSection2D';
import { buildSiteModel, type SiteModel } from './model';

export { DepthSection2D, type DepthSection2DProps } from './DepthSection2D';
export { DepthViewer, type DepthViewerProps } from './DepthViewer';
export { alphaSiteIds, buildSiteModel, isWithheld, type LevelModel, type SiteModel } from './model';

export interface DepthViewerOptions {
  /** Session tier, 1 (most restricted) to 4. Level names with a lower tier number are withheld. */
  tier: number;
  onSelectLevel?: (n: number) => void;
  /** No camera easing. */
  reducedMotion?: boolean;
  /** '2d' forces the SVG elevation even when WebGL is available. Default 'auto'. */
  renderer?: 'auto' | '2d';
}

export interface DepthViewerHandle {
  dispose(): void;
  selectLevel(n: number): void;
  setTier(t: number): void;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function mount2D(view: HTMLElement, model: SiteModel, state: { tier: number; selected: number | null }, onPick: (n: number) => void): ViewImpl {
  const holder = document.createElement('div');
  holder.className = 'd3v-2d';
  view.append(holder);
  const draw = (): void => {
    const width = Math.max(320, Math.floor(view.clientWidth) || 760);
    const height = Math.max(240, Math.floor(view.clientHeight) || 640);
    render(jsx(DepthSection2D, { facilityId: model.id, tier: state.tier, selected: state.selected, onSelectLevel: onPick, width, height }), holder);
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(draw) : null;
  ro?.observe(view);
  draw();
  return {
    dispose() {
      ro?.disconnect();
      render(null, holder);
      holder.remove();
    },
    setSelected: draw,
    setTier: draw,
  };
}

export function mountDepthViewer(el: HTMLElement, facilityId: string, opts: DepthViewerOptions): DepthViewerHandle {
  const model = buildSiteModel(facilityId);
  if (!model) {
    const p = document.createElement('p');
    p.className = 'd3v-none';
    p.textContent = `No depth section is held for ${facilityId}.`;
    el.append(p);
    return { dispose: () => p.remove(), selectLevel: () => undefined, setTier: () => undefined };
  }

  const chrome = createChrome(el, model, { tier: opts.tier, onSelectLevel: opts.onSelectLevel });
  const onPick = (n: number): void => chrome.select(n, true);
  let disposed = false;
  const fallback = (): void => {
    if (!disposed) chrome.attach(mount2D(chrome.view, model, chrome.state, onPick), '2d');
  };

  if (opts.renderer === '2d' || !webglAvailable()) {
    fallback();
  } else {
    import('./scene').then(
      (mod) => {
        if (disposed) return;
        try {
          const impl = mod.createScene(chrome.view, model, {
            tier: chrome.state.tier,
            selected: chrome.state.selected,
            reducedMotion: opts.reducedMotion === true,
            onPick,
          });
          chrome.attach(impl, '3d');
        } catch {
          chrome.view.textContent = '';
          fallback();
        }
      },
      () => fallback(),
    );
  }

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      chrome.dispose();
    },
    selectLevel(n) {
      if (!disposed) chrome.select(n, false);
    },
    setTier(t) {
      if (!disposed) chrome.setTier(t);
    },
  };
}
