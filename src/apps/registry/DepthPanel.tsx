/**
 * Facility Registry: depth cross-section. @graphics/depth3d is imported on first use; it in
 * turn fetches Three.js only when the interactive viewer mounts on a WebGL 2 machine, and
 * falls back to the SVG elevation otherwise.
 */
import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DepthSection2DProps } from '@graphics/depth3d';

type DepthModule = typeof import('@graphics/depth3d');
let modPromise: Promise<DepthModule> | null = null;
const loadDepth = (): Promise<DepthModule> => (modPromise ??= import('@graphics/depth3d'));

export interface DepthProps {
  facilityId: string;
  tier: number;
  reducedMotion: boolean;
  /** Level to select once the viewer is up (from the side-panel preview). */
  level?: number | null;
  onSelectLevel?: (n: number) => void;
  onState?: (s: 'loading' | 'ready' | 'failed') => void;
}

/** Interactive cross-section filling its parent. */
export function DepthViewerPane({ facilityId, tier, reducedMotion, level, onSelectLevel, onState }: DepthProps) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<ReturnType<DepthModule['mountDepthViewer']> | null>(null);
  const cb = useRef(onSelectLevel);
  cb.current = onSelectLevel;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    onState?.('loading');
    loadDepth().then(
      (m) => {
        const el = host.current;
        if (!live || !el) return;
        handle.current = m.mountDepthViewer(el, facilityId, { tier, reducedMotion, onSelectLevel: (n) => cb.current?.(n) });
        if (level != null) handle.current.selectLevel(level);
        onState?.('ready');
      },
      () => {
        if (!live) return;
        setFailed(true);
        onState?.('failed');
      },
    );
    return () => {
      live = false;
      handle.current?.dispose();
      handle.current = null;
    };
  }, [facilityId]);

  useEffect(() => handle.current?.setTier(tier), [tier]);
  useEffect(() => {
    if (level != null) handle.current?.selectLevel(level);
  }, [level]);

  if (failed) return <p class="reg-note">The section drawing module could not be loaded from the workstation image. Reopen the dossier.</p>;
  return <div class="reg-depth-host" ref={host} />;
}

/** Static elevation for the side panel; a level click hands over to the full viewer. */
export function DepthPreview({ facilityId, tier, onSelectLevel, width, height }: { facilityId: string; tier: number; onSelectLevel: (n: number) => void; width: number; height: number }) {
  const [Comp, setComp] = useState<ComponentType<DepthSection2DProps> | null>(null);
  useEffect(() => {
    let live = true;
    loadDepth().then((m) => live && setComp(() => m.DepthSection2D), () => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (!Comp) return <div class="reg-depth-preview" style={{ height: `${height}px` }} />;
  return (
    <div class="reg-depth-preview">
      <Comp facilityId={facilityId} tier={tier} width={width} height={height} onSelectLevel={onSelectLevel} />
    </div>
  );
}
